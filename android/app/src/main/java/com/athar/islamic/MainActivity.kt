package com.athar.islamic

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(NativePermissionsPlugin::class.java)

        // Support SHOW_WHEN_LOCKED, TURN_SCREEN_ON, KEYGUARD_DISMISS
        configureLockScreenFlags()

        super.onCreate(savedInstanceState)
        handleIncomingAthanIntent(intent)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
        configureLockScreenFlags()
        handleIncomingAthanIntent(intent)
    }

    private fun configureLockScreenFlags() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
            keyguardManager?.requestDismissKeyguard(this, null)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    private fun handleIncomingAthanIntent(intent: Intent?) {
        if (intent == null) return
        val action = intent.getStringExtra("action")
        val hasAlert = intent.hasExtra("alert_title") || intent.hasExtra("prayer_name")
        if (action == "OPEN_ATHAN_FULLSCREEN" || hasAlert) {
            val prayer = intent.getStringExtra("prayer_name") ?: intent.getStringExtra("alert_title") ?: "صلاة"
            val title = intent.getStringExtra("alert_title") ?: "تنبيه أثر الملكي"
            val body = intent.getStringExtra("alert_body") ?: ""
            val badge = intent.getStringExtra("category_badge") ?: "🕌 تنبيه أثر الملكي"
            val category = intent.getStringExtra("category") ?: "adhan"
            val audioUrl = intent.getStringExtra("audio_url") ?: ""

            val safeTitle = title.replace("'", "\\'").replace("\n", " ")
            val safeBody = body.replace("'", "\\'").replace("\n", "\\n")
            val safeBadge = badge.replace("'", "\\'")
            val safePrayer = prayer.replace("'", "\\'")

            val js = """
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('athar_open_unified_session', {
                        detail: {
                            prayer: '$safePrayer',
                            title: '$safeTitle',
                            body: '$safeBody',
                            badge: '$safeBadge',
                            category: '$category',
                            audioUrl: '$audioUrl'
                        }
                    }));
                    window.dispatchEvent(new CustomEvent('athar_incoming_athan', { detail: { prayer: '$safePrayer' } }));
                }
            """.trimIndent()
            bridge?.eval(js)
        }
    }
}
