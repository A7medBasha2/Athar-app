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
        } catch (Exception e) {
            e.printStackTrace();
        }

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
    private static volatile long lastAthanDispatchTimeMs = 0L;
    private static volatile String lastAthanDispatchedPrayer = "";

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

    private void handleDeepLink(Intent intent) {
        if (intent == null) return;
        Uri dataUri = intent.getData();
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
        final int surahNumber = intent.getIntExtra("surah_number", 0);
        final int ayahNumber = intent.getIntExtra("ayah_number", 1);
        final boolean openParentsModal = intent.getBooleanExtra("open_parents_modal", false);
        final boolean openWird = intent.getBooleanExtra("open_wird", false);
        final boolean openTasbih = intent.getBooleanExtra("open_tasbih", false);
        final String adhkarCategoryExtra = intent.getStringExtra("adhkar_category");
        final long elapsedMs = intent.getLongExtra("elapsed_ms", 0L);
        final long durationMs = intent.getLongExtra("duration_ms", 0L);
        final boolean isMuted = intent.getBooleanExtra("is_muted", false);

        final boolean openRoyalAlert = intent.getBooleanExtra("open_royal_alert", false)
            || (dataUri != null && dataUri.toString().contains("royal-alert"));
        final String alertTypeExtra = (intent.getStringExtra("alert_type") != null)
            ? intent.getStringExtra("alert_type")
            : (dataUri != null && dataUri.getPath() != null && dataUri.getPath().length() > 1 ? dataUri.getPath().replace("/", "") : "dhikr_salawat");

        final boolean isAthanIntent = "OPEN_ATHAN_FULLSCREEN".equals(action)
            || "com.athar.islamic.ACTION_ATHAN_FULLSCREEN".equals(action)
            || "prayer_athan".equals(notificationCategory)
            || "adhan".equals(notificationCategory)
            || "prayer".equals(notificationCategory)
            || (extraRoyal != null && !extraRoyal.trim().isEmpty())
            || (uriPrayer != null && !uriPrayer.trim().isEmpty());

        final boolean isTasbihCat = openTasbih || "salawat".equals(notificationCategory) || "dhikr_tasbeeh".equals(notificationCategory) || "tasbeeh".equals(notificationCategory);
        final boolean isAdhkarCat = "morning_evening".equals(notificationCategory) || "adhkar".equals(notificationCategory) || (adhkarCategoryExtra != null && !adhkarCategoryExtra.isEmpty());
        final String resolvedAdhkarCategory = (adhkarCategoryExtra != null && !adhkarCategoryExtra.isEmpty()) 
            ? adhkarCategoryExtra 
            : ((alertTitle != null && alertTitle.contains("صباح")) ? "morning" : "evening");

        // Cache structured deep link JSON payload for bridge retrieval
        try {
            org.json.JSONObject obj = new org.json.JSONObject();
            obj.put("targetTab", targetTab != null ? targetTab : "");
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

        // Cache structured royal alert payload if opened from royal alert notification
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
                pendingRoyalAlertPayload = royalObj.toString();
            } catch (Exception ignored) {}
        }

        // Set pending incoming athan immediately in static variables so bridge can read it
        if (isAthanIntent) {
            final String safePrayer = (prayerName != null && !prayerName.isEmpty()) 
                ? prayerName 
                : (alertTitle != null && !alertTitle.isEmpty() ? alertTitle : "صلاة الفجر");
            pendingIncomingAthanPrayer = safePrayer;
            pendingIncomingAthanElapsedMs = elapsedMs;
        }
            pendingIncomingAthanElapsedMs = elapsedMs;
        }

        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        final StringBuilder jsScript = new StringBuilder();

                        // Priority 1: Full-Screen Royal Athan Dispatch
                        if (isAthanIntent) {
                            final String safePrayer = (prayerName != null && !prayerName.isEmpty()) ? prayerName : (alertTitle != null && !alertTitle.isEmpty() ? alertTitle : "صلاة الفجر");
                            lastAthanDispatchedPrayer = safePrayer;
                            lastAthanDispatchTimeMs = System.currentTimeMillis();
                            pendingIncomingAthanPrayer = safePrayer;
                            pendingIncomingAthanElapsedMs = elapsedMs;
                            final String jsPendingVar = "window.__athar_pending_athan = { prayer: '" + safePrayer.replace("'", "\\'") + "', elapsedMs: " + elapsedMs + " };";
                            jsScript.append(jsPendingVar);
                            jsScript.append(" window.dispatchEvent(new CustomEvent('athar_incoming_athan', { detail: { prayer: '" + safePrayer.replace("'", "\\'") + "', elapsedMs: " + elapsedMs + " } })); ");
                            
                            try {
                                intent.setAction(null);
                                intent.removeExtra("action");
                                intent.removeExtra("prayer_name");
                                intent.removeExtra("notification_category");
                                intent.removeExtra("category");
                                intent.removeExtra("launch_royal_adhan");
                            } catch (Exception ignored) {}
                        }

                        // Priority 2: Full Royal Alert Card & Instant Audio Dispatch
                        if (openRoyalAlert || isRoyalCategory(notificationCategory)) {
                            final String royalJson = (pendingRoyalAlertPayload != null) ? pendingRoyalAlertPayload : "{}";
                            jsScript.append(" window.__athar_pending_royal_alert = " + royalJson + "; ");
                            jsScript.append(" window.dispatchEvent(new CustomEvent('athar_trigger_royal_alert', { detail: " + royalJson + " })); ");
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
        public String getPendingRoyalAlert() {
            if (pendingRoyalAlertPayload != null) {
                String payload = pendingRoyalAlertPayload;
                pendingRoyalAlertPayload = null;
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
