package com.athar.islamic

import android.animation.ObjectAnimator
import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.view.animation.LinearInterpolator
import android.widget.Button
import android.widget.TextView

class AthanFullScreenActivity : Activity() {

    private var countdownAnimator: ObjectAnimator? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Wake screen, turn screen on, show over lock screen, and dismiss keyguard
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            var keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
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

        // Position as top floating royal overlay window
        window.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        window.setGravity(Gravity.TOP)

        setContentView(R.layout.activity_athan_fullscreen)

        var prayerName = intent.getStringExtra("prayer_name") ?: "صلاة الفجر"
        var prayerTime = intent.getStringExtra("prayer_time") ?: "05:15"
        var alertTitle = intent.getStringExtra("alert_title") ?: "حان الآن موعد $prayerName"
        var alertBody = intent.getStringExtra("alert_body") ?: "الله أكبر · الله أكبر\nحي على الصلاة، حي على الفلاح ($prayerTime)"
        var badge = intent.getStringExtra("category_badge") ?: "🕌 أذان الصلاة الفوري"

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
                putExtra("category", intent.getStringExtra("category") ?: "quran")
                putExtra("audio_url", intent.getStringExtra("audio_url") ?: "")
                putExtra("elapsed_ms", elapsed)
                putExtra("duration_ms", duration)
                putExtra("is_active_ringing", true)
            }
            startActivity(mainIntent)
            finish()
        }

        // Mute / Unmute Adhan Audio Button (Toggles volume in-place while keeping continuous timeline)
        var btnMute = findViewById<Button>(R.id.btnMuteAthan)
        var updateMuteButton = {
            if (AtharNotificationManager.isMuted()) {
                btnMute?.text = "تشغيل الصوت 🔊"
            } else {
                btnMute?.text = "كتم الصوت ✕"
            }
        }
        updateMuteButton()
        btnMute?.setOnClickListener {
            AtharNotificationManager.toggleAudio(this)
            updateMuteButton()
        }

        // Animate golden countdown progress bar matching true audio duration, and gracefully dismiss when finished
        var progressBar = findViewById<View>(R.id.viewGoldProgressBar)
        if (progressBar != null) {
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
        super.onDestroy()
    }
}
