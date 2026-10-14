package com.athar.islamic;

import android.app.AlertDialog;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

/**
 * Main Activity for Athar (com.athar.athar / com.athar.islamic).
 * Configured with Lock Screen flags, SYSTEM_ALERT_WINDOW permission verification dialog,
 * and seamless bridging of native Athar events to the web runtime.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativePermissionsPlugin.class);

        // Support SHOW_WHEN_LOCKED, TURN_SCREEN_ON, KEYGUARD_DISMISS
        configureLockScreenFlags();

        super.onCreate(savedInstanceState);
        handleIncomingAthanIntent(getIntent());

        // Check SYSTEM_ALERT_WINDOW permission and display professional explanation dialog if not granted
        checkAndPromptOverlayPermission();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        configureLockScreenFlags();
        handleIncomingAthanIntent(intent);
    }

    /**
     * Checks if SYSTEM_ALERT_WINDOW (Display over other apps) is granted.
     * If not, shows a clear explanation dialog before directing the user to system settings.
     */
    private void checkAndPromptOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                showOverlayExplanationDialog();
            }
        }
    }

    /**
     * Professional, friendly explanation dialog clarifying why overlay permission is required.
     */
    private void showOverlayExplanationDialog() {
        if (isFinishing() || (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1 && isDestroyed())) {
            return;
        }

        AlertDialog.Builder builder = new AlertDialog.Builder(this, android.R.style.Theme_DeviceDefault_Dialog_Alert);
        builder.setTitle("إذن الظهور فوق التطبيقات");
        builder.setMessage("لضمان عمل الأذان والتنبيهات بملء الشاشة حتى لو كان الهاتف مغلقاً، يرجى تفعيل السماح بالظهور فوق التطبيقات الأخرى.");
        builder.setCancelable(false);

        builder.setPositiveButton("فتح الإعدادات", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                dialog.dismiss();
                openOverlaySettings();
            }
        });

        builder.setNegativeButton("لاحقاً", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                dialog.dismiss();
            }
        });

        try {
            AlertDialog dialog = builder.create();
            dialog.show();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Launches the system settings page specifically for this app to grant overlay permission.
     */
    private void openOverlaySettings() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Intent intent = new Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getPackageName())
                );
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
            }
        } catch (Exception e) {
            try {
                Intent fallbackIntent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
                fallbackIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(fallbackIntent);
            } catch (Exception ex) {
                ex.printStackTrace();
            }
        }
    }

    private void configureLockScreenFlags() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (keyguardManager != null) {
                keyguardManager.requestDismissKeyguard(this, null);
            }
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            );
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    private void handleIncomingAthanIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getStringExtra("action");
        boolean hasAlert = intent.hasExtra("alert_title") || intent.hasExtra("prayer_name");
        if ("OPEN_ATHAN_FULLSCREEN".equals(action) || hasAlert) {
            String prayer = intent.getStringExtra("prayer_name");
            if (prayer == null) prayer = intent.getStringExtra("alert_title");
            if (prayer == null) prayer = "صلاة";

            String title = intent.getStringExtra("alert_title");
            if (title == null) title = "تنبيه أثر الملكي";

            String body = intent.getStringExtra("alert_body");
            if (body == null) body = "";

            String badge = intent.getStringExtra("category_badge");
            if (badge == null) badge = "🕌 تنبيه أثر الملكي";

            String category = intent.getStringExtra("category");
            if (category == null) category = "quran";

            String audioUrl = intent.getStringExtra("audio_url");
            if (audioUrl == null) audioUrl = "";

            long elapsedMs = intent.getLongExtra("elapsed_ms", 0L);
            long durationMs = intent.getLongExtra("duration_ms", 0L);
            boolean isRinging = intent.getBooleanExtra("is_active_ringing", false);

            // Stop external background audio so WebView takes over cleanly without duplicate audio
            AthanForegroundService.Companion.stopAthan(this);

            String safeTitle = title.replace("'", "\\'").replace("\n", " ");
            String safeBody = body.replace("'", "\\'").replace("\n", "\\n");
            String safeBadge = badge.replace("'", "\\'");
            String safePrayer = prayer.replace("'", "\\'");

            String js = "if (typeof window !== 'undefined') {" +
                "window.dispatchEvent(new CustomEvent('athar_open_unified_session', {" +
                "detail: {" +
                "prayer: '" + safePrayer + "'," +
                "title: '" + safeTitle + "'," +
                "body: '" + safeBody + "'," +
                "badge: '" + safeBadge + "'," +
                "category: '" + category + "'," +
                "audioUrl: '" + audioUrl + "'," +
                "elapsedMs: " + elapsedMs + "," +
                "durationMs: " + durationMs + "," +
                "isRinging: " + isRinging +
                "}}));" +
                "if ('" + category + "' === 'adhan' || '" + category + "' === 'prayer') {" +
                "window.dispatchEvent(new CustomEvent('athar_incoming_athan', { detail: { prayer: '" + safePrayer + "', elapsedMs: " + elapsedMs + " } }));" +
                "}" +
                "}";

            if (getBridge() != null) {
                getBridge().eval(js);
            }
        }
    }
}
