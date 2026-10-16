package com.athar.islamic

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView

/**
 * AthanFullScreenActivity
 * Dedicated Royal Full-Screen Athan Activity ("شاشة الأذان الملكية الكاملة")
 * 
 * Clean full-screen display over the lock screen with main royal layout and Stop Athan button.
 * Purged of all legacy top banners, floating overlays, and duplicate dialog cards.
 */
class AthanFullScreenActivity : Activity() {

    private var activityWakeLock: PowerManager.WakeLock? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. Turn screen on, show over lock screen, and dismiss keyguard across all Android versions
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
            keyguardManager?.requestDismissKeyguard(this, null)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
        }

        // 2. Acquire a temporary screen-on WakeLock to guarantee display illuminates on all devices
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
            @Suppress("DEPRECATION")
            activityWakeLock = powerManager?.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
                "Athar:RoyalAthanWakeLock"
            )?.apply {
                acquire(25000L)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // 3. Make window occupy full screen over lock screen
        window.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)

        // اربط الشاشة بملف التصميم النظيف الوحيد المعتمد
        setContentView(R.layout.activity_athan_full_screen)

        setupViews(intent)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
        if (intent != null) {
            setupViews(intent)
        }
    }

    private fun setupViews(activeIntent: Intent) {
        val prayerName = activeIntent.getStringExtra("prayer_name")
            ?: activeIntent.getStringExtra("alert_title")
            ?: "صلاة المغرب"

        val alertTitle = activeIntent.getStringExtra("alert_title")
            ?: "حان الآن موعد $prayerName"

        val alertBody = activeIntent.getStringExtra("alert_body")
            ?: "الله أكبر · الله أكبر\nحي على الصلاة · حي على الفلاح"

        // ربط النصوص بالعناصر الموجودة حصرياً داخل الشاشة الملكية الكامله
        findViewById<TextView>(R.id.tvMainPrayerTitle)?.text = alertTitle
        findViewById<TextView>(R.id.tvMainPrayerSubtitle)?.text = alertBody

        // زر إيقاف الأذان وإغلاق الشاشة بالكامل
        findViewById<Button>(R.id.btnStopAthan)?.setOnClickListener {
            stopAthanAndClose()
        }

        // زر تسجيل الصلاة في شجرة الأثر (لو موجود في الواجهة)
        findViewById<View>(R.id.btnLogPrayer)?.setOnClickListener {
            // تنفيذ تسجيل الصلاة أو فتح التطبيق
            openAppAndDismiss(activeIntent)
        }
    }

    private fun stopAthanAndClose() {
        try {
            AthanForegroundService.stopAthan(this)
            AtharNotificationManager.stopAndReleasePlayer()
            AtharNotificationManager.dismissNotificationById(this, AtharNotificationManager.ID_PRAYER_ATHAN)
        } catch (e: Exception) {
            e.printStackTrace()
        }
        finish()
    }

    private fun openAppAndDismiss(activeIntent: Intent) {
        val prayerName = activeIntent.getStringExtra("prayer_name") ?: "صلاة المغرب"
        val mainIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("action", "OPEN_ATHAN_FULLSCREEN")
            putExtra("prayer_name", prayerName)
            putExtra("is_active_ringing", true)
        }
        startActivity(mainIntent)
        finish()
    }

    override fun onResume() {
        super.onResume()
        try {
            AthanForegroundService.hideOverlayInsideApp()
        } catch (e: Exception) {}
    }

    override fun onDestroy() {
        try {
            if (activityWakeLock?.isHeld == true) {
                activityWakeLock?.release()
            }
        } catch (e: Exception) {}
        activityWakeLock = null
        super.onDestroy()
    }
}
