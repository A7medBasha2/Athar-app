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

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleDeepLink(intent);
    }

    private void handleDeepLink(Intent intent) {
        if (intent == null) return;
        final String targetTab = intent.getStringExtra("target_tab");
        final String notificationCategory = intent.getStringExtra("notification_category");
        final String alertTitle = intent.getStringExtra("alert_title");
        final String alertBody = intent.getStringExtra("alert_body");
        final String audioUrl = intent.getStringExtra("audio_url");
        final int surahNumber = intent.getIntExtra("surah_number", 0);
        final int ayahNumber = intent.getIntExtra("ayah_number", 1);
        final boolean openParentsModal = intent.getBooleanExtra("open_parents_modal", false);
        final long elapsedMs = intent.getLongExtra("elapsed_ms", 0L);
        final long durationMs = intent.getLongExtra("duration_ms", 0L);
        final boolean isMuted = intent.getBooleanExtra("is_muted", false);

        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        if (targetTab != null && !targetTab.trim().isEmpty()) {
                            String jsTab = "window.dispatchEvent(new CustomEvent('athar_navigate_tab', { detail: { tab: '" + targetTab.trim() + "' } }));";
                            getBridge().getWebView().evaluateJavascript(jsTab, null);
                        }

                        if (openParentsModal || "parents_duty".equals(notificationCategory) || "parents".equals(notificationCategory)) {
                            String jsParents = "window.dispatchEvent(new CustomEvent('athar_open_parents_duty', { detail: { audioUrl: '" + (audioUrl != null ? audioUrl : "public/audio/parents.mp3") + "' } }));";
                            getBridge().getWebView().evaluateJavascript(jsParents, null);
                        }

                        if (surahNumber > 0) {
                            String jsAyah = "window.dispatchEvent(new CustomEvent('athar_open_ayah', { detail: { surahNumber: " + surahNumber + ", ayahNumber: " + ayahNumber + ", audioUrl: '" + (audioUrl != null ? audioUrl : "") + "' } }));";
                            getBridge().getWebView().evaluateJavascript(jsAyah, null);
                        }

                        if (notificationCategory != null && !notificationCategory.trim().isEmpty()) {
                            String cleanTitle = alertTitle != null ? alertTitle.replace("'", "\\'") : "";
                            String cleanBody = alertBody != null ? alertBody.replace("'", "\\'").replace("\n", "\\n") : "";
                            String cleanAudio = audioUrl != null ? audioUrl : "";
                            String jsUnified = "window.dispatchEvent(new CustomEvent('athar_open_unified_session', { detail: { " +
                                "category: '" + notificationCategory + "', " +
                                "title: '" + cleanTitle + "', " +
                                "body: '" + cleanBody + "', " +
                                "audioUrl: '" + cleanAudio + "', " +
                                "elapsedMs: " + elapsedMs + ", " +
                                "durationMs: " + durationMs + ", " +
                                "isMuted: " + isMuted + " } }));";
                            getBridge().getWebView().evaluateJavascript(jsUnified, null);
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
