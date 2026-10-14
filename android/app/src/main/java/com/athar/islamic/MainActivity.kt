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
        if (intent?.getStringExtra("action") == "OPEN_ATHAN_FULLSCREEN") {
            val prayer = intent.getStringExtra("prayer_name") ?: "صلاة"
            bridge?.eval("window.dispatchEvent(new CustomEvent('athar_incoming_athan', { detail: { prayer: '$prayer' } }));")
        }
    }
}
