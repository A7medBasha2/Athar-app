package com.athar.islamic

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView

class AthanFullScreenActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Forcefully wake screen, turn screen on, show over lock screen, and dismiss keyguard
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

        setContentView(R.layout.activity_athan_fullscreen)

        val prayerName = intent.getStringExtra("prayer_name") ?: "صلاة الفجر"
        val prayerTime = intent.getStringExtra("prayer_time") ?: "05:15"

        findViewById<TextView>(R.id.tvPrayerTitle)?.text = prayerName
        findViewById<TextView>(R.id.tvPrayerTime)?.text = prayerTime

        findViewById<Button>(R.id.btnOpenApp)?.setOnClickListener {
            val mainIntent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("action", "OPEN_ATHAN_FULLSCREEN")
                putExtra("prayer_name", prayerName)
            }
            startActivity(mainIntent)
            finish()
        }

        findViewById<Button>(R.id.btnMuteAthan)?.setOnClickListener {
            val stopIntent = Intent(this, AthanForegroundService::class.java).apply {
                action = AthanForegroundService.ACTION_STOP_ATHAN
            }
            startService(stopIntent)
            finish()
        }
    }
}
