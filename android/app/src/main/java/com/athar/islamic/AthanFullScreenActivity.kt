package com.athar.islamic

import android.animation.ObjectAnimator
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
import android.view.animation.LinearInterpolator
import android.widget.Button
import android.widget.TextView

/**
 * AthanFullScreenActivity
 * Royal Full-Screen Athan Activity ("شاشة الأذان الملكية")
 * Launches immediately over the lock screen or any active app during prayer times
 * via NotificationCompat.Builder.setFullScreenIntent.
 */
class AthanFullScreenActivity : Activity() {

    private var countdownAnimator: ObjectAnimator? = null
    private var activityWakeLock: PowerManager.WakeLock? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. Wake screen, turn screen on, show over lock screen, and dismiss keyguard
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            var keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
            keyguardManager?.requestDismissKeyguard(this, null)
        }

        @Suppress("DEPRECATION")
        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON
        )

        // 2. Acquire a temporary screen-on WakeLock to guarantee display illuminates
        try {
            var powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
            @Suppress("DEPRECATION")
            activityWakeLock = powerManager?.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
                "Athar:AthanActivityWakeLock"
            )?.apply {
                acquire(25000L)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // 3. Automatically dismiss active floating notification cards when full-screen Athan launches
        dismissActiveFloatingNotificationCards()

        // 4. Make window occupy full screen over lock screen
        window.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)

        setContentView(R.layout.activity_athan_fullscreen)

        setupViews(intent)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
        dismissActiveFloatingNotificationCards()
        if (intent != null) {
            setupViews(intent)
        }
    }

    private fun dismissActiveFloatingNotificationCards() {
        try {
            var notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            notificationManager?.cancel(AtharNotificationManager.ID_PRAYER_ATHAN)
            notificationManager?.cancel(AtharNotificationManager.ID_SYSTEM_OVERLAY_ATHAN)
            notificationManager?.cancel(AtharNotificationManager.ID_TEST_NOTIFICATION)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }


    private fun setupViews(activeIntent: Intent) {
        var prayerName = activeIntent.getStringExtra("prayer_name") ?: "صلاة الفجر"
        var prayerTime = activeIntent.getStringExtra("prayer_time") ?: "05:15"
        var alertTitle = activeIntent.getStringExtra("alert_title") ?: "حان الآن موعد $prayerName"
        var alertBody = activeIntent.getStringExtra("alert_body") ?: "الله أكبر · الله أكبر\nحي على الصلاة، حي على الفلاح ($prayerTime)"
        var badge = activeIntent.getStringExtra("category_badge") ?: "🕌 أذان الصلاة الفوري"
        var audioUrl = activeIntent.getStringExtra("audio_url") ?: ""

        findViewById<TextView>(R.id.tvCategoryBadge)?.text = badge
        findViewById<TextView>(R.id.tvPrayerTitle)?.text = alertTitle
        findViewById<TextView>(R.id.tvDhikrHint)?.text = alertBody

        // Close / Dismiss button (✕)
        findViewById<TextView>(R.id.btnCloseOverlay)?.setOnClickListener {
            AthanForegroundService.stopAthan(this)
            finish()
        }

        // Open App Button
        findViewById<Button>(R.id.btnOpenApp)?.setOnClickListener {
            var elapsed = AtharNotificationManager.getCurrentPositionMs()
            var duration = AtharNotificationManager.getDurationMs()
            var mainIntent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("action", "OPEN_ATHAN_FULLSCREEN")
                putExtra("prayer_name", prayerName)
                putExtra("alert_title", alertTitle)
                putExtra("alert_body", alertBody)
                putExtra("category_badge", badge)
                putExtra("notification_category", "prayer_athan")
                putExtra("category", "prayer_athan")
                putExtra("audio_url", audioUrl)
                putExtra("elapsed_ms", elapsed)
                putExtra("duration_ms", duration)
                putExtra("is_active_ringing", true)
            }
            startActivity(mainIntent)
            finish()
        }

        // Audio Button (Pause / Resume / Mute toggle with instant visual feedback)
        var btnMute = findViewById<Button>(R.id.btnMuteAthan)
        var updateAudioButton = {
            if (AtharNotificationManager.isPlaying()) {
                btnMute?.text = "إيقاف مؤقت ⏸"
            } else if (AtharNotificationManager.isPaused()) {
                btnMute?.text = "استئناف الأذان ▶"
            } else if (AtharNotificationManager.isMuted()) {
                btnMute?.text = "تشغيل الصوت 🔊"
            } else {
                btnMute?.text = "إيقاف مؤقت ⏸"
            }
        }
        updateAudioButton()
        btnMute?.setOnClickListener {
            AtharNotificationManager.toggleAudio(this)
            btnMute.postDelayed({ updateAudioButton() }, 150)
        }

        // Animate golden countdown progress bar matching true audio duration
        var progressBar = findViewById<View>(R.id.viewGoldProgressBar)
        if (progressBar != null) {
            countdownAnimator?.cancel()
            progressBar.pivotX = 0f
            var totalDuration = AtharNotificationManager.getDurationMs()
            var elapsed = AtharNotificationManager.getCurrentPositionMs()
            var remainingMs = Math.max(1000L, totalDuration - elapsed)
            var startScale = Math.min(1f, Math.max(0.05f, remainingMs.toFloat() / totalDuration.toFloat()))
            countdownAnimator = ObjectAnimator.ofFloat(progressBar, "scaleX", startScale, 0f).apply {
                this.duration = remainingMs
                interpolator = LinearInterpolator()
                addListener(object : android.animation.AnimatorListenerAdapter() {
                    override fun onAnimationEnd(animation: android.animation.Animator) {
                        if (!isFinishing && !isDestroyed) {
                            finish()
                        }
                    }
                })
                start()
            }
        }
    }

    override fun onDestroy() {
        countdownAnimator?.cancel()
        countdownAnimator = null
        try {
            if (activityWakeLock?.isHeld == true) {
                activityWakeLock?.release()
            }
        } catch (e: Exception) {}
        activityWakeLock = null
        super.onDestroy()
    }
}
