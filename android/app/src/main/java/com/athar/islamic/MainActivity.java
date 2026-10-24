package com.athar.islamic;

import android.os.Bundle;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import android.os.Build;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativePermissionsPlugin.class);
        
        // تسجيل إضافة جوجل بشكل آمن يمنع أي كراش أو خطأ بناء
        try {
            Class<?> googleAuthClass = Class.forName("com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth");
            registerPlugin((Class<? extends com.getcapacitor.Plugin>) googleAuthClass);
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "GoogleAuth plugin not found or failed to register", e);
        }

        super.onCreate(savedInstanceState);

        // Explicitly purge legacy channels and cancel ghost notification cards on startup
        try {
            AtharNotificationManager.INSTANCE.purgeOnStartup(this);
        } catch (Exception ignored) {}

        // Optional secondary direct bridge on WebView
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().addJavascriptInterface(new AtharNativeBridgeInterface(this), "AtharNative");
            }
        } catch (Exception ignored) {}

        // Awaken screen & show above lockscreen if launched for Athan or notifications
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                setShowWhenLocked(true);
                setTurnScreenOn(true);
            } else {
                getWindow().addFlags(
                    android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                    android.view.WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                    android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                    android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                );
            }
        } catch (Exception ignored) {}

        // Handle initial deep link if app opened from Home Screen Live Widget or Notification
        handleDeepLink(getIntent());
    }

    public static volatile boolean isAppInForeground = false;

    @Override
    public void onResume() {
        super.onResume();
        isAppInForeground = true;
        try {
            AthanForegroundService.hideOverlayInsideApp();
        } catch (Exception ignored) {}
    }

    @Override
    public void onPause() {
        super.onPause();
        isAppInForeground = false;
    }

    @Override
    public void onStop() {
        super.onStop();
        isAppInForeground = false;
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                setShowWhenLocked(true);
                setTurnScreenOn(true);
            } else {
                getWindow().addFlags(
                    android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                    android.view.WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                    android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                    android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                );
            }
        } catch (Exception ignored) {}
        handleDeepLink(intent);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        isAppInForeground = false;
        try {
            AthanForegroundService.stopAthan(this);
            AtharNotificationManager.INSTANCE.stopAndReleasePlayer(true);
        } catch (Exception ignored) {}
    }

    public static volatile String pendingIncomingAthanPrayer = null;
    public static volatile long pendingIncomingAthanElapsedMs = 0L;
    public static volatile String pendingDeepLinkPayload = null;
    public static volatile String pendingRoyalAlertPayload = null;
    public static volatile String pendingOAuthCallbackUrl = null;
    private static volatile ServerSocket oauthLoopbackServer = null;
    private static final Object oauthServerLock = new Object();
    private static volatile long lastAthanDispatchTimeMs = 0L;
    private static volatile String lastAthanDispatchedPrayer = "";

    public static void stopOAuthLoopbackServer() {
        synchronized (oauthServerLock) {
            if (oauthLoopbackServer != null) {
                try {
                    oauthLoopbackServer.close();
                } catch (Exception ignored) {}
                oauthLoopbackServer = null;
            }
        }
    }

    public void dispatchOAuthCallbackToWebView(final String callbackUrl) {
        if (callbackUrl == null || callbackUrl.trim().isEmpty()) return;
        pendingOAuthCallbackUrl = callbackUrl;
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        final String quotedUrl = safeJsString(callbackUrl);
                        final String js = " window.__athar_pending_oauth_url = " + quotedUrl + "; window.dispatchEvent(new CustomEvent('athar_oauth_callback', { detail: { url: " + quotedUrl + " } })); ";
                        getBridge().getWebView().evaluateJavascript(js, null);
                        getBridge().getWebView().postDelayed(new Runnable() {
                            @Override
                            public void run() {
                                try {
                                    if (getBridge() != null && getBridge().getWebView() != null) {
                                        getBridge().getWebView().evaluateJavascript(js, null);
                                    }
                                } catch (Exception ignored) {}
                            }
                        }, 350);
                    }
                } catch (Exception ignored) {}
            }
        });
    }

    private boolean isRoyalCategory(String category) {
        if (category == null) return false;
        return category.equals("dhikr_tasbeeh")
            || category.equals("salawat")
            || category.equals("quran_ayah")
            || category.equals("quran_wird")
            || category.equals("morning_evening")
            || category.equals("parents_duty")
            || category.equals("ayah")
            || category.equals("wird")
            || category.equals("adhkar");
    }

    private static String safeJsString(String input) {
        if (input == null) return "\"\"";
        return org.json.JSONObject.quote(input);
    }

    private void handleDeepLink(Intent intent) {
        if (intent == null) return;
        Uri dataUri = intent.getData();
        if (dataUri != null) {
            final String rawUriStr = dataUri.toString();
            if (rawUriStr.startsWith("athar://auth-callback")
                || rawUriStr.startsWith("athar://auth/callback")
                || rawUriStr.contains("access_token=")
                || rawUriStr.contains("refresh_token=")
                || (rawUriStr.startsWith("athar://") && (rawUriStr.contains("code=") || rawUriStr.contains("error=")))) {
                stopOAuthLoopbackServer();
                dispatchOAuthCallbackToWebView(rawUriStr);
                try {
                    intent.setData(null);
                } catch (Exception ignored) {}
                return;
            }
        }
        String uriPrayer = null;
        String uriTab = null;
        if (dataUri != null) {
            try {
                uriPrayer = dataUri.getQueryParameter("launch_royal_adhan");
                if (uriPrayer == null || uriPrayer.isEmpty()) {
                    uriPrayer = dataUri.getQueryParameter("prayer");
                }
                uriTab = dataUri.getQueryParameter("tab");
            } catch (Exception ignored) {}
        }

        String extraAction = intent.getStringExtra("action");
        final String action = (extraAction != null && !extraAction.trim().isEmpty())
            ? extraAction
            : intent.getAction();
        final String extraRoyal = intent.getStringExtra("launch_royal_adhan");
        final String prayerName = (intent.getStringExtra("prayer_name") != null)
            ? intent.getStringExtra("prayer_name")
            : (extraRoyal != null ? extraRoyal : uriPrayer);
        final String targetTab = (intent.getStringExtra("target_tab") != null)
            ? intent.getStringExtra("target_tab")
            : uriTab;
        String cat = intent.getStringExtra("notification_category");
        if (cat == null || cat.trim().isEmpty()) {
            cat = intent.getStringExtra("category");
        }
        final String notificationCategory = cat;
        final String alertTitle = intent.getStringExtra("alert_title");
        final String alertBody = intent.getStringExtra("alert_body");
        final String audioUrl = intent.getStringExtra("audio_url");
        final int surahNumber = intent.getIntExtra("surah_number", 0) > 0 
            ? intent.getIntExtra("surah_number", 0) 
            : intent.getIntExtra("open_surah", 0);
        final int ayahNumber = intent.getIntExtra("ayah_number", 1) > 1 
            ? intent.getIntExtra("ayah_number", 1) 
            : intent.getIntExtra("open_ayah", 1);
        final boolean openParentsModal = intent.getBooleanExtra("open_parents_modal", false) 
            || intent.getBooleanExtra("open_parents_duty", false);
        final boolean openWird = intent.getBooleanExtra("open_wird", false);
        final boolean openTasbih = intent.getBooleanExtra("open_tasbih", false);
        final String adhkarCategoryExtra = intent.getStringExtra("adhkar_category");
        final long elapsedMs = intent.getLongExtra("elapsed_ms", 0L);
        final long durationMs = intent.getLongExtra("duration_ms", 0L);
        final boolean isMuted = intent.getBooleanExtra("is_muted", false);

        final boolean openRoyalAlert = intent.getBooleanExtra("open_royal_alert", false)
            || (dataUri != null && dataUri.toString().contains("royal-alert"))
            || "com.athar.islamic.ACTION_ATHAR_ALERT_OVERLAY".equals(action);
        final String alertTypeExtra = (intent.getStringExtra("alert_type") != null)
            ? intent.getStringExtra("alert_type")
            : (dataUri != null && dataUri.getPath() != null && dataUri.getPath().length() > 1 ? dataUri.getPath().replace("/", "") : "dhikr_salawat");

        final boolean isAthanIntent = !openRoyalAlert && !isRoyalCategory(notificationCategory) && (
                 "OPEN_ATHAN_FULLSCREEN".equals(action)
            || "com.athar.islamic.ACTION_ATHAN_FULLSCREEN".equals(action)
            || "com.athar.islamic.ACTION_FULLSCREEN_AZAN".equals(action)
            || "ACTION_FULLSCREEN_AZAN".equals(action)
            || "prayer_athan".equals(notificationCategory)
            || "adhan".equals(notificationCategory)
            || "prayer".equals(notificationCategory)
            || (extraRoyal != null && !extraRoyal.trim().isEmpty())
            || (uriPrayer != null && !uriPrayer.trim().isEmpty())
        );

        final boolean isTasbihCat = openTasbih || "salawat".equals(notificationCategory) || "dhikr_tasbeeh".equals(notificationCategory) || "tasbeeh".equals(notificationCategory);
        final boolean isAdhkarCat = "morning_evening".equals(notificationCategory) || "adhkar".equals(notificationCategory) || (adhkarCategoryExtra != null && !adhkarCategoryExtra.isEmpty());
        final String resolvedAdhkarCategory = (adhkarCategoryExtra != null && !adhkarCategoryExtra.isEmpty()) 
            ? adhkarCategoryExtra 
            : ((alertTitle != null && alertTitle.contains("صباح")) ? "morning" : "evening");

        try {
            org.json.JSONObject obj = new org.json.JSONObject();
            String effectiveTab = (targetTab != null && !targetTab.trim().isEmpty())
                ? targetTab
                : (surahNumber > 0 || openWird ? "quran" : (isTasbihCat || isAdhkarCat ? "adhkar" : ""));
            obj.put("targetTab", effectiveTab);
            obj.put("notificationCategory", notificationCategory != null ? notificationCategory : (isAthanIntent ? "prayer_athan" : ""));
            obj.put("surahNumber", surahNumber);
            obj.put("ayahNumber", ayahNumber);
            obj.put("openParentsModal", openParentsModal || "parents_duty".equals(notificationCategory) || "parents".equals(notificationCategory));
            obj.put("openWird", openWird || "quran_wird".equals(notificationCategory) || "wird".equals(notificationCategory));
            obj.put("openTasbih", isTasbihCat);
            obj.put("adhkarCategory", isAdhkarCat ? resolvedAdhkarCategory : "");
            obj.put("audioUrl", audioUrl != null ? audioUrl : "");
            obj.put("alertTitle", alertTitle != null ? alertTitle : "");
            obj.put("alertBody", alertBody != null ? alertBody : "");
            obj.put("elapsedMs", elapsedMs);
            obj.put("durationMs", durationMs);
            obj.put("isMuted", isMuted);
            pendingDeepLinkPayload = obj.toString();
        } catch (Exception ignored) {}

        if (openRoyalAlert || isRoyalCategory(notificationCategory)) {
            try {
                org.json.JSONObject royalObj = new org.json.JSONObject();
                royalObj.put("type", alertTypeExtra != null ? alertTypeExtra : "dhikr_salawat");
                royalObj.put("title", alertTitle != null ? alertTitle : "تنبيه أثر الملكي");
                royalObj.put("body", alertBody != null ? alertBody : "");
                royalObj.put("badge", intent.getStringExtra("badge") != null ? intent.getStringExtra("badge") : "🕌 تنبيه أثر الملكي");
                royalObj.put("category", notificationCategory != null ? notificationCategory : "dhikr_tasbeeh");
                royalObj.put("audioUrl", audioUrl != null ? audioUrl : "");
                royalObj.put("surahNumber", surahNumber);
                royalObj.put("ayahNumber", ayahNumber);
                royalObj.put("adhkarCategory", adhkarCategoryExtra != null ? adhkarCategoryExtra : resolvedAdhkarCategory);
                royalObj.put("playSound", intent.getBooleanExtra("play_sound", true));
                royalObj.put("elapsedMs", elapsedMs);
                royalObj.put("durationMs", durationMs);
                royalObj.put("isMuted", isMuted);
                royalObj.put("fromOverlay", intent.getBooleanExtra("from_overlay", false));
                royalObj.put("nativeAudioPlaying", intent.getBooleanExtra("native_audio_playing", false));
                pendingRoyalAlertPayload = royalObj.toString();
            } catch (Exception ignored) {}
        }

        if (isAthanIntent) {
            final String safePrayer = (prayerName != null && !prayerName.isEmpty()) 
                ? prayerName 
                : (alertTitle != null && !alertTitle.isEmpty() ? alertTitle : "صلاة الفجر");
            pendingIncomingAthanPrayer = safePrayer;
            pendingIncomingAthanElapsedMs = elapsedMs;
        }

        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        final StringBuilder jsScript = new StringBuilder();

                        if ("dismiss_web_azan".equals(action) || intent.getBooleanExtra("dismiss_web_azan", false)) {
                            jsScript.append(" window.__athar_pending_athan = null; window.dispatchEvent(new CustomEvent('athar_dismiss_web_azan_overlay')); ");
                            try {
                                intent.setAction(null);
                                intent.removeExtra("action");
                                intent.removeExtra("dismiss_web_azan");
                            } catch (Exception ignored) {}
                        } else if (isAthanIntent) {
                            if (!FullScreenAzanService.Companion.isAzanRunning()) {
                                final String safePrayer = (prayerName != null && !prayerName.isEmpty()) ? prayerName : (alertTitle != null && !alertTitle.isEmpty() ? alertTitle : "صلاة الفجر");
                                lastAthanDispatchedPrayer = safePrayer;
                                lastAthanDispatchTimeMs = System.currentTimeMillis();
                                pendingIncomingAthanPrayer = safePrayer;
                                pendingIncomingAthanElapsedMs = elapsedMs;
                                final String quotedPrayer = safeJsString(safePrayer);
                                jsScript.append(" window.__athar_pending_athan = { prayer: ").append(quotedPrayer).append(", elapsedMs: ").append(elapsedMs).append(" }; ");
                                jsScript.append(" window.dispatchEvent(new CustomEvent('athar_incoming_athan', { detail: { prayer: ").append(quotedPrayer).append(", elapsedMs: ").append(elapsedMs).append(" } })); ");
                            } else {
                                android.util.Log.d("MainActivity", "Native FullScreenAzan is active, skipping duplicate WebView modal overlay");
                            }
                            
                            try {
                                intent.setAction(null);
                                intent.removeExtra("action");
                                intent.removeExtra("prayer_name");
                                intent.removeExtra("notification_category");
                                intent.removeExtra("category");
                                intent.removeExtra("launch_royal_adhan");
                            } catch (Exception ignored) {}
                        }

                        if (openParentsModal || "parents_duty".equals(notificationCategory) || "parents".equals(notificationCategory)) {
                            final String quotedParentsAudio = safeJsString(audioUrl != null && !audioUrl.isEmpty() ? audioUrl : "public/audio/parents.mp3");
                            jsScript.append(" window.dispatchEvent(new CustomEvent('athar_open_parents_duty', { detail: { audioUrl: ").append(quotedParentsAudio).append(", keepPlaying: true } })); ");
                        } else if (openWird || "quran_wird".equals(notificationCategory) || "wird".equals(notificationCategory)) {
                            jsScript.append(" window.__athar_pending_quran_tab = 'khatmah'; ");
                            jsScript.append(" window.dispatchEvent(new CustomEvent('athar_open_wird', { detail: {} })); ");
                            jsScript.append(" window.dispatchEvent(new CustomEvent('athar_switch_quran_tab', { detail: { tab: 'khatmah' } })); ");
                            jsScript.append(" window.dispatchEvent(new CustomEvent('athar_navigate_tab', { detail: { tab: 'quran' } })); ");
                        } else if (surahNumber > 0) {
                            final String quotedAyahAudio = safeJsString(audioUrl != null ? audioUrl : "");
                            jsScript.append(" window.dispatchEvent(new CustomEvent('athar_open_ayah', { detail: { surahNumber: ").append(surahNumber).append(", ayahNumber: ").append(ayahNumber).append(", audioUrl: ").append(quotedAyahAudio).append(", keepPlaying: true } })); ");
                            jsScript.append(" window.dispatchEvent(new CustomEvent('athar_navigate_tab', { detail: { tab: 'quran' } })); ");
                        } else if (isTasbihCat) {
                            jsScript.append(" window.dispatchEvent(new CustomEvent('athar_open_tasbih', { detail: {} })); ");
                        } else if (isAdhkarCat) {
                            final String quotedCategory = safeJsString(resolvedAdhkarCategory);
                            jsScript.append(" window.dispatchEvent(new CustomEvent('athar_open_adhkar', { detail: { category: ").append(quotedCategory).append(" } })); ");
                            jsScript.append(" window.dispatchEvent(new CustomEvent('athar_navigate_tab', { detail: { tab: 'adhkar' } })); ");
                        } else if (targetTab != null && !targetTab.trim().isEmpty()) {
                            final String quotedTargetTab = safeJsString(targetTab.trim());
                            jsScript.append(" window.dispatchEvent(new CustomEvent('athar_navigate_tab', { detail: { tab: ").append(quotedTargetTab).append(" } })); ");
                        }

                        final String finalJs = jsScript.toString();
                        if (!finalJs.isEmpty()) {
                            getBridge().getWebView().evaluateJavascript(finalJs, null);
                            getBridge().getWebView().postDelayed(new Runnable() {
                                @Override
                                public void run() {
                                    try {
                                        if (getBridge() != null && getBridge().getWebView() != null) {
                                            getBridge().getWebView().evaluateJavascript(finalJs, null);
                                        }
                                    } catch (Exception ignored) {}
                                }
                            }, 280);
                        }
                    }
                } catch (Exception ignored) {}
            }
        });
    }

    private void checkOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Context context = this;
            if (!Settings.canDrawOverlays(context)) {
                Intent intent = new Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getPackageName())
                );
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
            }
        }
    }

    public static class AtharNativeBridgeInterface {
        private final Context context;

        public AtharNativeBridgeInterface(Context context) {
            this.context = context;
        }

        @JavascriptInterface
        public String getPendingIncomingAthan() {
            if (pendingIncomingAthanPrayer != null) {
                String prayer = pendingIncomingAthanPrayer;
                long elapsed = pendingIncomingAthanElapsedMs;
                pendingIncomingAthanPrayer = null;
                pendingIncomingAthanElapsedMs = 0L;
                return "{\"prayer\":\"" + prayer.replace("\"", "\\\"") + "\",\"elapsedMs\":" + elapsed + "}";
            }
            return "";
        }

        @JavascriptInterface
        public String getPendingDeepLink() {
            if (pendingDeepLinkPayload != null) {
                String payload = pendingDeepLinkPayload;
                pendingDeepLinkPayload = null;
                return payload;
            }
            return "";
        }

        @JavascriptInterface
        public String getPendingRoyalAlert() {
            if (pendingRoyalAlertPayload != null) {
                String payload = pendingRoyalAlertPayload;
                pendingRoyalAlertPayload = null;
                return payload;
            }
            return "";
        }

        @JavascriptInterface
        public String consumePendingOAuthUrl() {
            if (pendingOAuthCallbackUrl != null) {
                String url = pendingOAuthCallbackUrl;
                pendingOAuthCallbackUrl = null;
                return url;
            }
            return "";
        }

        @JavascriptInterface
        public void stopGoogleOAuthLoopback() {
            stopOAuthLoopbackServer();
        }

        @JavascriptInterface
        public boolean startGoogleOAuthLoopback(final String authorizeUrl) {
            if (authorizeUrl == null || !authorizeUrl.startsWith("http")) {
                return false;
            }
            stopOAuthLoopbackServer();
            pendingOAuthCallbackUrl = null;

            final CountDownLatch readyLatch = new CountDownLatch(1);
            Thread serverThread = new Thread(new Runnable() {
                @Override
                public void run() {
                    ServerSocket server = null;
                    try {
                        server = new ServerSocket();
                        server.setReuseAddress(true);
                        server.bind(new InetSocketAddress(3000));
                        server.setSoTimeout(180000);
                        synchronized (oauthServerLock) {
                            oauthLoopbackServer = server;
                        }
                        readyLatch.countDown();

                        while (!server.isClosed()) {
                            Socket client = null;
                            try {
                                client = server.accept();
                                if (client.getInetAddress() == null || !client.getInetAddress().isLoopbackAddress()) {
                                    client.close();
                                    continue;
                                }
                                client.setSoTimeout(5000);
                                BufferedReader reader = new BufferedReader(
                                    new InputStreamReader(client.getInputStream(), StandardCharsets.UTF_8)
                                );
                                String requestLine = reader.readLine();
                                if (requestLine == null || requestLine.isEmpty()) {
                                    client.close();
                                    continue;
                                }
                                String hdr;
                                while ((hdr = reader.readLine()) != null && !hdr.isEmpty()) {
                                    // drain HTTP headers
                                }
                                String[] parts = requestLine.split(" ");
                                String reqTarget = parts.length > 1 ? parts[1] : "/";
                                OutputStream out = client.getOutputStream();

                                if (reqTarget.startsWith("/favicon.ico")) {
                                    byte[] emptyResp = "HTTP/1.1 204 No Content\r\nConnection: close\r\n\r\n".getBytes(StandardCharsets.UTF_8);
                                    out.write(emptyResp);
                                    out.flush();
                                    client.close();
                                    continue;
                                }

                                if (reqTarget.startsWith("/auth-done")) {
                                    String q = reqTarget.contains("?") ? reqTarget.substring(reqTarget.indexOf('?') + 1) : "";
                                    byte[] okResp = "HTTP/1.1 200 OK\r\nContent-Type: text/plain; charset=utf-8\r\nCache-Control: no-store\r\nConnection: close\r\nContent-Length: 2\r\n\r\nOK".getBytes(StandardCharsets.UTF_8);
                                    out.write(okResp);
                                    out.flush();
                                    client.close();

                                    if (!q.isEmpty()) {
                                        final String finalCallback = "athar://auth-callback?" + q;
                                        if (context instanceof MainActivity) {
                                            ((MainActivity) context).dispatchOAuthCallbackToWebView(finalCallback);
                                        } else {
                                            pendingOAuthCallbackUrl = finalCallback;
                                        }
                                        try {
                                            Intent bringFront = new Intent(context, MainActivity.class);
                                            bringFront.setData(Uri.parse(finalCallback));
                                            bringFront.addFlags(
                                                Intent.FLAG_ACTIVITY_NEW_TASK |
                                                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                                                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                                                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                                            );
                                            context.startActivity(bringFront);
                                        } catch (Exception ignored) {}
                                    }
                                    stopOAuthLoopbackServer();
                                    break;
                                }

                                if (reqTarget.contains("code=") || reqTarget.contains("access_token=")) {
                                    String directQuery = reqTarget.contains("?") ? reqTarget.substring(reqTarget.indexOf('?') + 1) : "";
                                    if (!directQuery.isEmpty()) {
                                        final String preCallback = "athar://auth-callback?" + directQuery;
                                        if (context instanceof MainActivity) {
                                            ((MainActivity) context).dispatchOAuthCallbackToWebView(preCallback);
                                        } else {
                                            pendingOAuthCallbackUrl = preCallback;
                                        }
                                    }
                                }

                                String html = "<!DOCTYPE html><html dir=\"rtl\" lang=\"ar\"><head><meta charset=\"utf-8\">"
                                    + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
                                    + "<title>أَثَرُ — تسجيل الدخول</title>"
                                    + "<style>"
                                    + "body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#080B0C;color:#F5F1E9;font-family:system-ui,-apple-system,sans-serif;text-align:center;padding:24px;box-sizing:border-box}"
                                    + ".card{max-width:360px;width:100%;background:#14120E;border:1px solid rgba(212,175,55,0.35);border-radius:20px;padding:28px 22px;box-shadow:0 16px 48px rgba(0,0,0,0.65)}"
                                    + ".title{color:#D4AF37;font-size:22px;font-weight:700;margin:0 0 10px}"
                                    + ".sub{color:#B5ADA2;font-size:14px;line-height:1.6;margin:0 0 22px}"
                                    + ".btn{display:inline-block;width:100%;box-sizing:border-box;padding:13px 18px;border-radius:12px;background:linear-gradient(135deg,#E6B76B,#D4AF37);color:#080B0C;font-weight:700;font-size:15px;text-decoration:none}"
                                    + "</style></head><body>"
                                    + "<div class=\"card\">"
                                    + "<div class=\"title\">تم التحقق بنجاح</div>"
                                    + "<p class=\"sub\">جاري إعادتك تلقائياً إلى تطبيق أثر...</p>"
                                    + "<a id=\"retBtn\" class=\"btn\" href=\"intent://auth-callback#Intent;scheme=athar;package=com.athar.islamic;end\">العودة إلى تطبيق أثر</a>"
                                    + "</div>"
                                    + "<script>"
                                    + "(function(){"
                                    + "var h=window.location.hash?window.location.hash.substring(1):'';"
                                    + "var s=window.location.search?window.location.search.substring(1):'';"
                                    + "var p=h&&s?(s+'&'+h):(h||s);"
                                    + "var u='intent://auth-callback'+(p?'?'+p:'')+'#Intent;scheme=athar;package=com.athar.islamic;end';"
                                    + "var b=document.getElementById('retBtn');if(b)b.href=u;"
                                    + "if(p){"
                                    + "fetch('/auth-done?'+p,{method:'GET',cache:'no-store',keepalive:true})"
                                    + ".catch(function(){})"
                                    + ".finally(function(){setTimeout(function(){window.location.replace(u);},80);});"
                                    + "}else{setTimeout(function(){window.location.replace(u);},150);}"
                                    + "})();"
                                    + "</script></body></html>";

                                byte[] bodyBytes = html.getBytes(StandardCharsets.UTF_8);
                                String header = "HTTP/1.1 200 OK\r\n"
                                    + "Content-Type: text/html; charset=utf-8\r\n"
                                    + "Cache-Control: no-store\r\n"
                                    + "Connection: close\r\n"
                                    + "Content-Length: " + bodyBytes.length + "\r\n\r\n";
                                out.write(header.getBytes(StandardCharsets.UTF_8));
                                out.write(bodyBytes);
                                out.flush();
                                client.close();
                            } catch (java.net.SocketTimeoutException timeoutEx) {
                                stopOAuthLoopbackServer();
                                break;
                            } catch (Exception connEx) {
                                if (client != null) {
                                    try { client.close(); } catch (Exception ignored) {}
                                }
                                if (server.isClosed()) break;
                            }
                        }
                    } catch (Exception bindEx) {
                        readyLatch.countDown();
                        android.util.Log.w("MainActivity", "OAuth loopback server notice: " + bindEx.getMessage());
                    } finally {
                        if (server != null && !server.isClosed()) {
                            try { server.close(); } catch (Exception ignored) {}
                        }
                    }
                }
            }, "AtharOAuthLoopback");
            serverThread.setDaemon(true);
            serverThread.start();

            try {
                readyLatch.await(450, TimeUnit.MILLISECONDS);
            } catch (Exception ignored) {}

            try {
                Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(authorizeUrl));
                browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(browserIntent);
                return true;
            } catch (Exception e) {
                stopOAuthLoopbackServer();
                android.util.Log.e("MainActivity", "Failed to launch OAuth browser intent", e);
                return false;
            }
        }

        @JavascriptInterface
        public void stopAthan() {
            try {
                AthanForegroundService.stopAthan(context);
                AtharNotificationManager.INSTANCE.stopAndReleasePlayer(true);
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public boolean openOverlaySettings() {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    Intent intent = new Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + context.getPackageName())
                    );
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                    return true;
                }
            } catch (Exception e) {
                try {
                    Intent fallback = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
                    fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(fallback);
                    return true;
                } catch (Exception ex) {}
            }
            return false;
        }

        @JavascriptInterface
        public boolean openExactAlarmSettings() {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    Intent intent = new Intent(
                        Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                        Uri.parse("package:" + context.getPackageName())
                    );
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                    return true;
                }
            } catch (Exception e) {
                try {
                    Intent fallback = new Intent(Settings.ACTION_SETTINGS);
                    fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(fallback);
                    return true;
                } catch (Exception ex) {}
            }
            return false;
        }

        @JavascriptInterface
        public boolean openNotificationSettings() {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                    intent.putExtra(Settings.EXTRA_APP_PACKAGE, context.getPackageName());
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                    return true;
                } else {
                    Intent intent = new Intent(
                        Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                        Uri.parse("package:" + context.getPackageName())
                    );
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                    return true;
                }
            } catch (Exception e) {
                try {
                    Intent fallback = new Intent(
                        Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                        Uri.parse("package:" + context.getPackageName())
                    );
                    fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(fallback);
                    return true;
                } catch (Exception ex) {}
            }
            return false;
        }

        @JavascriptInterface
        public void exitApp() {
            try {
                if (context instanceof android.app.Activity) {
                    ((android.app.Activity) context).runOnUiThread(() -> {
                        ((android.app.Activity) context).finishAffinity();
                    });
                }
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void minimizeApp() {
            try {
                if (context instanceof android.app.Activity) {
                    ((android.app.Activity) context).runOnUiThread(() -> {
                        ((android.app.Activity) context).moveTaskToBack(true);
                    });
                }
            } catch (Exception ignored) {}
        }
    }
}
