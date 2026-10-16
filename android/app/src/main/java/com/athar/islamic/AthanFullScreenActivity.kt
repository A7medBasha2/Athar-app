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
import android.widget.FrameLayout
import android.widget.TextView

/**
 * AthanFullScreenActivity / AtharAlertOverlayActivity
 * Royal Notification Banner Activity ("شاشة وبانر تنبيهات أثر الملكية")
 * 
 * Works inside and outside the app, and displays over the Android lock screen 
 * (even when device is sleeping or locked) with full screen wake and turn-on.
 * Perfectly styled to match the In-App Notification Banner UI.
 */
class AthanFullScreenActivity : Activity() {

    private var countdownAnimator: ObjectAnimator? = null
    private var activityWakeLock: PowerManager.WakeLock? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. Turn screen on, show over lock screen, and dismiss keyguard across all Android versions
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
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

        // 2. Acquire a temporary screen-on WakeLock to guarantee display illuminates on all devices
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
            @Suppress("DEPRECATION")
            activityWakeLock = powerManager?.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
                "Athar:RoyalOverlayWakeLock"
            )?.apply {
                acquire(25000L)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // 3. Make window occupy full screen over lock screen
        window.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)

        setContentView(R.layout.activity_athan_fullscreen)

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
        val category = activeIntent.getStringExtra("category") ?: AtharNotificationManager.CAT_PRAYER_ATHAN
        val isAthanCat = (category == AtharNotificationManager.CAT_PRAYER_ATHAN ||
                category == AtharNotificationManager.CAT_SYSTEM_OVERLAY_ATHAN ||
                category == "prayer" || category == "athan")

        val alertTitle = activeIntent.getStringExtra("alert_title")
            ?: activeIntent.getStringExtra("prayer_name")
            ?: "تنبيه أثر الملكي"

        val alertBody = activeIntent.getStringExtra("alert_body") ?: ""
        val categoryBadge = activeIntent.getStringExtra("category_badge")
            ?: AtharNotificationManager.getCategoryBadge(category)

        val audioUrl = activeIntent.getStringExtra("audio_url") ?: ""
        val surahNumber = activeIntent.getIntExtra("surah_number", 0)
        val ayahNumber = activeIntent.getIntExtra("ayah_number", 0)
        val targetTab = activeIntent.getStringExtra("target_tab")
            ?: AtharNotificationManager.getTargetTab(category)
        val openTasbih = activeIntent.getBooleanExtra("open_tasbih", false)
        val adhkarCategory = activeIntent.getStringExtra("adhkar_category")

        // Dynamic action button text based on dhikr / ayah / prayer
        val defaultActionText = when {
            isAthanCat -> "عرض الأذان 🕌"
            category == AtharNotificationManager.CAT_QURAN_AYAH || surahNumber > 0 -> "اذهب للآية 📖"
            category == AtharNotificationManager.CAT_QURAN_WIRD -> "صفحة القرآن 📖"
            category == AtharNotificationManager.CAT_PARENTS_DUTY -> "صفحة بر الوالدين 🤍"
            category == AtharNotificationManager.CAT_SALAWAT -> "الصلاة على النبي 💚"
            category == AtharNotificationManager.CAT_DHIKR_TASBEEH || openTasbih -> "المسبحة والاستغفار 📿"
            category == AtharNotificationManager.CAT_MORNING_EVENING -> "أذكار اليوم 🌅"
            else -> "فتح التطبيق 🕌"
        }
        val actionButtonText = activeIntent.getStringExtra("action_button_text") ?: defaultActionText

        // 1. Set text elements
        findViewById<TextView>(R.id.tvCategoryBadge)?.text = categoryBadge
        findViewById<TextView>(R.id.tvPrayerTitle)?.text = alertTitle
        findViewById<TextView>(R.id.tvDhikrHint)?.text = alertBody

        // 2. Dismiss Button (✕) — ONLY way to dismiss as requested
        findViewById<TextView>(R.id.btnCloseOverlay)?.setOnClickListener {
            if (isAthanCat) {
                AthanForegroundService.stopAthan(this)
            }
            AtharNotificationManager.stopAndReleasePlayer()
            AtharNotificationManager.dismissNotificationById(this, AtharNotificationManager.ID_PRAYER_ATHAN)
            finish()
        }

        // Tap outside MUST NOT dismiss the card — only the '✕' button closes it
        findViewById<FrameLayout>(android.R.id.content)?.setOnClickListener(null)
        findViewById<View>(R.id.cardRoyalOverlay)?.setOnClickListener(null)

        // 3. Secondary Action Button (Deep link into specific view)
        val btnOpenApp = findViewById<Button>(R.id.btnOpenApp)
        btnOpenApp?.text = actionButtonText
        btnOpenApp?.setOnClickListener {
            val elapsed = AtharNotificationManager.getCurrentPositionMs()
            val duration = AtharNotificationManager.getDurationMs()

            val mainIntent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP

                if (isAthanCat) {
                    putExtra("action", "OPEN_ATHAN_FULLSCREEN")
                    putExtra("prayer_name", alertTitle)
                    putExtra("is_active_ringing", true)
                } else if (category == AtharNotificationManager.CAT_QURAN_AYAH || surahNumber > 0) {
                    putExtra("action", "OPEN_AYAH")
                    putExtra("surah_number", surahNumber)
                    putExtra("ayah_number", ayahNumber)
                } else if (category == AtharNotificationManager.CAT_QURAN_WIRD) {
                    putExtra("action", "OPEN_WIRD")
                } else if (category == AtharNotificationManager.CAT_PARENTS_DUTY) {
                    putExtra("action", "OPEN_PARENTS_DUTY")
                }

                putExtra("alert_title", alertTitle)
                putExtra("alert_body", alertBody)
                putExtra("category_badge", categoryBadge)
                putExtra("category", category)
                putExtra("notification_category", category)
                putExtra("target_tab", targetTab)
                putExtra("open_tasbih", openTasbih || category == AtharNotificationManager.CAT_SALAWAT || category == AtharNotificationManager.CAT_DHIKR_TASBEEH)
                if (adhkarCategory != null) {
                    putExtra("adhkar_category", adhkarCategory)
                }
                putExtra("audio_url", audioUrl)
                putExtra("elapsed_ms", elapsed)
                putExtra("duration_ms", duration)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
                keyguardManager?.requestDismissKeyguard(this, null)
            }

            startActivity(mainIntent)
            finish()
        }

        // 4. Primary Audio Button (Mute / Unmute toggle without stopping or restarting dhikr)
        val btnMute = findViewById<Button>(R.id.btnMuteAthan)
        val updateAudioButton = {
            if (AtharNotificationManager.isMuted()) {
                btnMute?.text = "تشغيل الصوت 🔊"
            } else {
                btnMute?.text = "إيقاف الصوت ✕"
            }
        }
        updateAudioButton()
        btnMute?.setOnClickListener {
            AtharNotificationManager.toggleAudio(this)
            btnMute.postDelayed({ updateAudioButton() }, 80)
        }

        // 5. Animate golden progress bar matching audio duration (WITHOUT auto-dismissing activity)
        val progressBar = findViewById<View>(R.id.viewGoldProgressBar)
        if (progressBar != null) {
            countdownAnimator?.cancel()
            progressBar.pivotX = 0f
            val totalDuration = AtharNotificationManager.getDurationMs()
            val elapsed = AtharNotificationManager.getCurrentPositionMs()
            val remainingMs = if (totalDuration > 0 && totalDuration > elapsed) {
                Math.max(2000L, totalDuration - elapsed)
            } else {
                180000L // Keep alive while audio/adhan is in progress
            }

            val startScale = if (totalDuration > 0) {
                Math.min(1f, Math.max(0.05f, remainingMs.toFloat() / totalDuration.toFloat()))
            } else {
                1f
            }

            // Animate progress smoothly without auto-finishing on end
            countdownAnimator = ObjectAnimator.ofFloat(progressBar, "scaleX", startScale, 0f).apply {
                this.duration = remainingMs
                interpolator = LinearInterpolator()
                start()
            }
        }
    }

    override fun onResume() {
        super.onResume()
        // While viewing this activity, hide any background floating overlay to prevent dual stacking
        AthanForegroundService.hideOverlayInsideApp()
    }

    override fun onPause() {
        super.onPause()
        // If user exits the app or goes to home while ringing, show floating overlay outside the app
        if (!isFinishing && AthanForegroundService.isRinging) {
            AthanForegroundService.showOverlayOutsideApp(this)
        }
    }

    override fun onStop() {
        super.onStop()
        if (!isFinishing && AthanForegroundService.isRinging) {
            AthanForegroundService.showOverlayOutsideApp(this)
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

