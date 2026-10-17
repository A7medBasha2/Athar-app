package com.athar.islamic;

import android.os.Bundle;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import android.os.Build;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativePermissionsPlugin.class);
        super.onCreate(savedInstanceState);

        // Explicitly purge legacy channels and cancel ghost notification cards on startup
        try {
            AtharNotificationManager.INSTANCE.purgeOnStartup(this);
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Optional secondary direct bridge on WebView
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().addJavascriptInterface(new AtharNativeBridgeInterface(this), "AtharNative");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Handle initial deep link if app opened from Home Screen Live Widget
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
        // Do not create a floating overlay when the app moves to the background.
    }

    @Override
    public void onStop() {
        super.onStop();
        isAppInForeground = false;
        // Deliberately no overlay/service restart here; onPause and onStop can both fire.
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
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
    private static volatile long lastAthanDispatchTimeMs = 0L;
    private static volatile String lastAthanDispatchedPrayer = "";

    private void handleDeepLink(Intent intent) {
        if (intent == null) return;
        String extraAction = intent.getStringExtra("action");
        final String action = (extraAction != null && !extraAction.trim().isEmpty())
            ? extraAction
            : intent.getAction();
        final String prayerName = intent.getStringExtra("prayer_name");
        final String targetTab = intent.getStringExtra("target_tab");
        String cat = intent.getStringExtra("notification_category");
        if (cat == null || cat.trim().isEmpty()) {
            cat = intent.getStringExtra("category");
        }
        final String notificationCategory = cat;
        final String alertTitle = intent.getStringExtra("alert_title");
        final String alertBody = intent.getStringExtra("alert_body");
        final String audioUrl = intent.getStringExtra("audio_url");
        final int surahNumber = intent.getIntExtra("surah_number", 0);
        final int ayahNumber = intent.getIntExtra("ayah_number", 1);
        final boolean openParentsModal = intent.getBooleanExtra("open_parents_modal", false);
        final boolean openWird = intent.getBooleanExtra("open_wird", false);
        final boolean openTasbih = intent.getBooleanExtra("open_tasbih", false);
        final String adhkarCategoryExtra = intent.getStringExtra("adhkar_category");
        final long elapsedMs = intent.getLongExtra("elapsed_ms", 0L);
        final long durationMs = intent.getLongExtra("duration_ms", 0L);
        final boolean isMuted = intent.getBooleanExtra("is_muted", false);

        final boolean isTasbihCat = openTasbih || "salawat".equals(notificationCategory) || "dhikr_tasbeeh".equals(notificationCategory) || "tasbeeh".equals(notificationCategory);
        final boolean isAdhkarCat = "morning_evening".equals(notificationCategory) || "adhkar".equals(notificationCategory) || (adhkarCategoryExtra != null && !adhkarCategoryExtra.isEmpty());
        final String resolvedAdhkarCategory = (adhkarCategoryExtra != null && !adhkarCategoryExtra.isEmpty()) 
            ? adhkarCategoryExtra 
            : ((alertTitle != null && alertTitle.contains("ØµØ¨Ø§Ø­")) ? "morning" : "evening");

        // Cache structured deep link JSON payload for bridge retrieval
        try {
            org.json.JSONObject obj = new org.json.JSONObject();
            obj.put("targetTab", targetTab != null ? targetTab : "");
            obj.put("notificationCategory", notificationCategory != null ? notificationCategory : "");
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

        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        final StringBuilder jsScript = new StringBuilder();

                        // Priority 1: Full-Screen Royal Athan Dispatch
                        if ("OPEN_ATHAN_FULLSCREEN".equals(action)
                            || "com.athar.islamic.ACTION_ATHAN_FULLSCREEN".equals(action)
                            || "prayer_athan".equals(notificationCategory)
                            || "adhan".equals(notificationCategory)
                            || "prayer".equals(notificationCategory)) {
                            final String safePrayer = (prayerName != null && !prayerName.isEmpty()) ? prayerName : (alertTitle != null && !alertTitle.isEmpty() ? alertTitle : "صلاة الفجر");
                            long now = System.currentTimeMillis();
                            if (!safePrayer.equals(lastAthanDispatchedPrayer) || (now - lastAthanDispatchTimeMs >= 60000L)) {
                                lastAthanDispatchTimeMs = now;
                                lastAthanDispatchedPrayer = safePrayer;
                                pendingIncomingAthanPrayer = safePrayer;
                                pendingIncomingAthanElapsedMs = elapsedMs;
                                final String jsPendingVar = "window.__athar_pending_athan = { prayer: '" + safePrayer.replace("'", "\\'") + "', elapsedMs: " + elapsedMs + " };";
                                jsScript.append(jsPendingVar);
                                jsScript.append(" window.dispatchEvent(new CustomEvent('athar_incoming_athan', { detail: { prayer: '" + safePrayer.replace("'", "\\'") + "', elapsedMs: " + elapsedMs + " } })); ");
                            }
                            try {
                                intent.setAction(null);
                                intent.removeExtra("action");
                                intent.removeExtra("prayer_name");
                                intent.removeExtra("notification_category");
                                intent.removeExtra("category");
                            } catch (Exception ignored) {}
                        }

                        // Direct Navigation Tab
                        if (targetTab != null && !targetTab.trim().isEmpty()) {
                            jsScript.append(" window.dispatchEvent(new CustomEvent('athar_navigate_tab', { detail: { tab: '" + targetTab.trim() + "' } })); ");
                        }

                        // Filial Piety (Ø¨Ø± Ø§Ù„ÙˆØ§Ù„Ø¯ÙŠÙ†)
                        if (openParentsModal || "parents_duty".equals(notificationCategory) || "parents".equals(notificationCategory)) {
                            jsScript.append(" window.dispatchEvent(new CustomEvent('athar_open_parents_duty', { detail: { audioUrl: '" + (audioUrl != null ? audioUrl : "public/audio/parents.mp3") + "' } })); ");
                        }

                        // Daily Quran Wird (Ø§Ù„ÙˆØ±Ø¯ Ø§Ù„ÙŠÙˆÙ…ÙŠ)
                        if (openWird || "quran_wird".equals(notificationCategory) || "wird".equals(notificationCategory)) {
                            jsScript.append(" window.dispatchEvent(new CustomEvent('athar_open_wird', { detail: {} })); ");
                        }

                        // Quranic Verse (Ø§Ù‚Ø±Ø£ Ù„Ùˆ Ø¢ÙŠØ©)
                        if (surahNumber > 0) {
                            jsScript.append(" window.dispatchEvent(new CustomEvent('athar_open_ayah', { detail: { surahNumber: " + surahNumber + ", ayahNumber: " + ayahNumber + ", audioUrl: '" + (audioUrl != null ? audioUrl : "") + "' } })); ");
                        }

                        // Digital Tasbih (Ø§Ù„Ù…Ø³Ø¨Ø­Ø© Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠØ© ÙˆØ§Ù„ØµÙ„ÙˆØ§Øª Ø¹Ù„Ù‰ Ø§Ù„Ù†Ø¨ÙŠ)
                        if (isTasbihCat) {
                            jsScript.append(" window.dispatchEvent(new CustomEvent('athar_open_tasbih', { detail: {} })); ");
                        }

                        // Adhkar Category (Ø£Ø°ÙƒØ§Ø± Ø§Ù„ØµØ¨Ø§Ø­ ÙˆØ§Ù„Ù…Ø³Ø§Ø¡)
                        if (isAdhkarCat) {
                            jsScript.append(" window.dispatchEvent(new CustomEvent('athar_open_adhkar', { detail: { category: '" + resolvedAdhkarCategory + "' } })); ");
                        }

                        // Unified Session Broadcast
                        if (notificationCategory != null && !notificationCategory.trim().isEmpty()) {
                            String cleanTitle = alertTitle != null ? alertTitle.replace("'", "\\'") : "";
                            String cleanBody = alertBody != null ? alertBody.replace("'", "\\'").replace("\n", "\\n") : "";
                            String cleanAudio = audioUrl != null ? audioUrl : "";
                            jsScript.append(" window.dispatchEvent(new CustomEvent('athar_open_unified_session', { detail: { " +
                                "category: '" + notificationCategory + "', " +
                                "title: '" + cleanTitle + "', " +
                                "body: '" + cleanBody + "', " +
                                "audioUrl: '" + cleanAudio + "', " +
                                "elapsedMs: " + elapsedMs + ", " +
                                "durationMs: " + durationMs + ", " +
                                "isMuted: " + isMuted + " } })); ");
                        }

                        final String finalJs = jsScript.toString();
                        if (!finalJs.isEmpty()) {
                            getBridge().getWebView().evaluateJavascript(finalJs, null);
                        }
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
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
    }
}
