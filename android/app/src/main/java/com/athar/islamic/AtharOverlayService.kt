package com.athar.islamic

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ObjectAnimator
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.animation.DecelerateInterpolator
import android.widget.Button
import android.widget.TextView

/**
 * AtharOverlayService
 * 
 * Genuine Android System Floating Window (WindowManager Overlay) Service.
 * Displays royal alerts ("اقرأ ولو آية في اليوم", "ذكر الله والصلاة على النبي",
 * "بر الوالدين", "الورد القرآني") over any running app (WhatsApp, YouTube, etc.)
 * and on the lock screen with screen wake.
 */
class AtharOverlayService : Service() {

    companion object {
        const val ACTION_SHOW_OVERLAY = "com.athar.islamic.ACTION_SHOW_OVERLAY"
        const val ACTION_DISMISS_OVERLAY = "com.athar.islamic.ACTION_DISMISS_OVERLAY"
        const val ACTION_AUDIO_COMPLETED = "com.athar.islamic.ACTION_AUDIO_COMPLETED"

        const val EXTRA_TITLE = "extra_title"
        const val EXTRA_BODY = "extra_body"
        const val EXTRA_BADGE = "extra_badge"
        const val EXTRA_CATEGORY = "extra_category"
        const val EXTRA_AUDIO_URL = "extra_audio_url"
        const val EXTRA_PLAY_SOUND = "extra_play_sound"
        const val EXTRA_SURAH_NUMBER = "extra_surah_number"
        const val EXTRA_AYAH_NUMBER = "extra_ayah_number"
        const val EXTRA_ACTION_TEXT = "extra_action_text"
        const val EXTRA_AUTO_DISMISS_MS = "extra_auto_dismiss_ms"

        @Volatile
        private var instance: AtharOverlayService? = null

        fun isShowing(): Boolean = instance != null

        @JvmStatic
        fun showOverlay(
            context: Context,
            title: String,
            body: String,
            badge: String = "🕌 تنبيه أثر الملكي",
            category: String = "quran_ayah",
            audioUrl: String? = null,
            playSound: Boolean = true,
            surahNumber: Int = 0,
            ayahNumber: Int = 0,
            actionText: String? = null,
            autoDismissMs: Long = 0L
        ) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
                    // Fallback to high priority system notification when overlay permission is missing
                    AtharNotificationManager.showRoyalNotification(
                        context = context,
                        category = category,
                        title = title,
                        body = body,
                        badge = badge,
                        audioUrl = audioUrl,
                        playSound = playSound,
                        surahNumber = surahNumber,
                        ayahNumber = ayahNumber
                    )
                    return
                }

                val intent = Intent(context, AtharOverlayService::class.java).apply {
                    action = ACTION_SHOW_OVERLAY
                    putExtra(EXTRA_TITLE, title)
                    putExtra(EXTRA_BODY, body)
                    putExtra(EXTRA_BADGE, badge)
                    putExtra(EXTRA_CATEGORY, category)
                    putExtra(EXTRA_AUDIO_URL, audioUrl)
                    putExtra(EXTRA_PLAY_SOUND, playSound)
                    putExtra(EXTRA_SURAH_NUMBER, surahNumber)
                    putExtra(EXTRA_AYAH_NUMBER, ayahNumber)
                    putExtra(EXTRA_ACTION_TEXT, actionText)
                    putExtra(EXTRA_AUTO_DISMISS_MS, autoDismissMs)
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                e.printStackTrace();
            }
        }

        @JvmStatic
        fun dismissOverlay(context: Context) {
            try {
                val intent = Intent(context, AtharOverlayService::class.java).apply {
                    action = ACTION_DISMISS_OVERLAY
                }
                context.startService(intent)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        @JvmStatic
        fun onAudioCompleted(context: Context) {
            try {
                val intent = Intent(context, AtharOverlayService::class.java).apply {
                    action = ACTION_AUDIO_COMPLETED
                }
                context.startService(intent)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private var windowManager: WindowManager? = null
    private var overlayRootView: View? = null
    private var screenWakeLock: PowerManager.WakeLock? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    private var currentSurahNumber: Int = 0
    private var currentAyahNumber: Int = 0
    private var currentCategory: String = "quran_ayah"
    private var currentAudioUrl: String? = null
    private var isPlayingAudio: Boolean = false
    private var isMuted: Boolean = false

    private val autoDismissRunnable = Runnable {
        dismissAndStop()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        instance = this
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action

        when (action) {
            ACTION_DISMISS_OVERLAY -> {
                dismissAndStop()
                return START_NOT_STICKY
            }
            ACTION_AUDIO_COMPLETED -> {
                // As per user answer: auto-dismiss when recitation completes
                dismissAndStop()
                return START_NOT_STICKY
            }
            ACTION_SHOW_OVERLAY -> {
                val title = intent.getStringExtra(EXTRA_TITLE) ?: "أثر | تنبيه ملكي"
                val body = intent.getStringExtra(EXTRA_BODY) ?: ""
                val badge = intent.getStringExtra(EXTRA_BADGE) ?: "🕌 تنبيه أثر الملكي"
                val category = intent.getStringExtra(EXTRA_CATEGORY) ?: "quran_ayah"
                val audioUrl = intent.getStringExtra(EXTRA_AUDIO_URL)
                val playSound = intent.getBooleanExtra(EXTRA_PLAY_SOUND, true)
                val surahNumber = intent.getIntExtra(EXTRA_SURAH_NUMBER, 0)
                val ayahNumber = intent.getIntExtra(EXTRA_AYAH_NUMBER, 0)
                val actionText = intent.getStringExtra(EXTRA_ACTION_TEXT)
                val autoDismissMs = intent.getLongExtra(EXTRA_AUTO_DISMISS_MS, 0L)

                currentSurahNumber = surahNumber
                currentAyahNumber = ayahNumber
                currentCategory = category
                currentAudioUrl = audioUrl
                isPlayingAudio = playSound && !audioUrl.isNullOrBlank()

                renderOverlayCard(
                    title = title,
                    body = body,
                    badge = badge,
                    category = category,
                    audioUrl = audioUrl,
                    playSound = playSound,
                    surahNumber = surahNumber,
                    ayahNumber = ayahNumber,
                    actionText = actionText,
                    autoDismissMs = autoDismissMs
                )
                return START_STICKY
            }
            else -> {
                return START_NOT_STICKY
            }
        }
    }

    private fun acquireScreenWake() {
        try {
            val pm = getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return
            if (screenWakeLock == null) {
                @Suppress("DEPRECATION")
                val flags = PowerManager.FULL_WAKE_LOCK or
                        PowerManager.ACQUIRE_CAUSES_WAKEUP or
                        PowerManager.ON_AFTER_RELEASE
                screenWakeLock = pm.newWakeLock(flags, "Athar:FloatingRoyalAlertWakeLock").apply {
                    setReferenceCounted(false)
                }
            }
            if (screenWakeLock?.isHeld == false) {
                screenWakeLock?.acquire(15000L)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun releaseScreenWake() {
        try {
            if (screenWakeLock?.isHeld == true) {
                screenWakeLock?.release()
            }
        } catch (ignored: Exception) {}
    }

    private fun renderOverlayCard(
        title: String,
        body: String,
        badge: String,
        category: String,
        audioUrl: String?,
        playSound: Boolean,
        surahNumber: Int,
        ayahNumber: Int,
        actionText: String?,
        autoDismissMs: Long
    ) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            stopSelf()
            return
        }

        // Awaken screen
        acquireScreenWake()

        // Remove any previous view cleanly
        removeExistingOverlayView()

        try {
            val inflater = LayoutInflater.from(this)
            val view = inflater.inflate(R.layout.view_system_overlay_notification, null)
            overlayRootView = view

            // Find views inside royal layout
            val tvBadge = view.findViewById<TextView>(R.id.tvOverlayBadge)
            val btnClose = view.findViewById<TextView>(R.id.btnOverlayClose)
            val tvTitle = view.findViewById<TextView>(R.id.tvOverlayTitle)
            val tvBody = view.findViewById<TextView>(R.id.tvOverlayBody)
            val btnMute = view.findViewById<Button>(R.id.btnOverlayMute)
            val btnOpen = view.findViewById<Button>(R.id.btnOverlayOpen)
            val progressView = view.findViewById<View>(R.id.viewOverlayProgress)

            tvBadge?.text = badge
            tvTitle?.text = title
            tvBody?.text = body

            // Dynamic Action Button customized per royal alert category
            val effectiveActionText = when {
                !actionText.isNullOrBlank() -> actionText
                category.contains("ayah") -> "فتح الآية بالمصحف 📖"
                category.contains("tasbeeh") || category.contains("salawat") -> "المسبحة الذكية 📿"
                category.contains("parents") -> "واحة البر والصلة 🤍"
                category.contains("wird") -> "متابعة الورد بالمصحف 📖"
                else -> "فتح تطبيق أثر ←"
            }
            btnOpen?.text = effectiveActionText

            // Setup Primary Open Action (Deep link into Athar with exact payload)
            btnOpen?.setOnClickListener {
                openAppTarget(category, surahNumber, ayahNumber)
                dismissAndStop()
            }

            // Setup Close Action
            btnClose?.setOnClickListener {
                AtharNotificationManager.stopAndReleasePlayer(true)
                dismissAndStop()
            }

            // Setup Mute/Audio Action
            if (audioUrl.isNullOrBlank() || !playSound) {
                btnMute?.visibility = View.GONE
            } else {
                btnMute?.visibility = View.VISIBLE
                btnMute?.text = "كتم الصوت ✕"
                btnMute?.setOnClickListener {
                    isMuted = !isMuted
                    if (isMuted) {
                        AtharNotificationManager.muteCurrentAudio(this)
                        btnMute.text = "تشغيل الصوت 🔊"
                    } else {
                        AtharNotificationManager.unmuteCurrentAudio(this)
                        btnMute.text = "كتم الصوت ✕"
                    }
                }
            }

            // Drag/touch interaction: swipe up to dismiss
            view.setOnTouchListener(object : View.OnTouchListener {
                private var initialY = 0f
                private var touchStartY = 0f
                override fun onTouch(v: View?, event: MotionEvent?): Boolean {
                    when (event?.action) {
                        MotionEvent.ACTION_DOWN -> {
                            touchStartY = event.rawY
                            initialY = v?.translationY ?: 0f
                            return true
                        }
                        MotionEvent.ACTION_MOVE -> {
                            val dy = event.rawY - touchStartY
                            if (dy < 0) { // dragging upwards
                                v?.translationY = initialY + dy
                            }
                            return true
                        }
                        MotionEvent.ACTION_UP -> {
                            val dy = event.rawY - touchStartY
                            if (dy < -120f) { // dismiss on quick upward swipe
                                dismissAndStop()
                            } else {
                                v?.animate()?.translationY(0f)?.setDuration(180)?.start()
                            }
                            return true
                        }
                    }
                    return false
                }
            })

            // WindowManager layout params
            val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE
            }

            val flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON

            val params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                layoutType,
                flags,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
                y = dpToPx(38)
            }

            windowManager?.addView(view, params)

            // Smooth entrance animation
            view.alpha = 0f
            view.translationY = -dpToPx(60).toFloat()
            view.animate()
                .alpha(1f)
                .translationY(0f)
                .setDuration(260)
                .setInterpolator(DecelerateInterpolator())
                .start()

            // Progress Bar Animation & Auto-dismiss scheduling
            val dismissDelayMs: Long = when {
                autoDismissMs > 0L -> autoDismissMs
                !playSound || audioUrl.isNullOrBlank() -> 5000L // 5 seconds for silent/banner
                else -> 28000L // Max fallback for recitation audio
            }

            mainHandler.removeCallbacks(autoDismissRunnable)
            mainHandler.postDelayed(autoDismissRunnable, dismissDelayMs)

            // Progress bar depletion animation
            progressView?.let { pb ->
                val progressAnim = ObjectAnimator.ofFloat(pb, "scaleX", 1f, 0f).apply {
                    duration = dismissDelayMs
                    interpolator = DecelerateInterpolator()
                }
                pb.pivotX = 0f
                progressAnim.start()
            }

            // Play audio through AtharNotificationManager
            if (playSound && !audioUrl.isNullOrBlank()) {
                AtharNotificationManager.playNotificationAudioWithGuard(
                    context = this,
                    audioPathOrUrl = audioUrl,
                    category = category,
                    startOffsetMs = 0L
                )
            }

        } catch (e: Exception) {
            e.printStackTrace()
            stopSelf()
        }
    }

    private fun openAppTarget(category: String, surahNumber: Int, ayahNumber: Int) {
        try {
            val appIntent = Intent(this, MainActivity::class.java).apply {
                action = "com.athar.islamic.ACTION_ATHAR_ALERT_OVERLAY"
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                putExtra("action", "com.athar.islamic.ACTION_ATHAR_ALERT_OVERLAY")
                putExtra("open_royal_alert", true)
                putExtra("category", category)
                putExtra("notification_category", category)
                putExtra("surah_number", surahNumber)
                putExtra("ayah_number", ayahNumber)
                putExtra("alert_type", category)

                when {
                    category.contains("ayah") || category.contains("wird") -> {
                        putExtra("target_tab", "quran")
                    }
                    category.contains("tasbeeh") || category.contains("salawat") -> {
                        putExtra("target_tab", "adhkar")
                        putExtra("open_tasbih", true)
                    }
                    category.contains("parents") -> {
                        putExtra("target_tab", "explore")
                        putExtra("open_parents_modal", true)
                    }
                }
            }
            startActivity(appIntent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun dismissAndStop() {
        mainHandler.removeCallbacks(autoDismissRunnable)
        val v = overlayRootView
        if (v != null && v.isAttachedToWindow) {
            v.animate()
                .alpha(0f)
                .translationY(-dpToPx(50).toFloat())
                .setDuration(220)
                .setListener(object : AnimatorListenerAdapter() {
                    override fun onAnimationEnd(animation: Animator) {
                        removeExistingOverlayView()
                        releaseScreenWake()
                        stopSelf()
                    }
                })
                .start()
        } else {
            removeExistingOverlayView()
            releaseScreenWake()
            stopSelf()
        }
    }

    private fun removeExistingOverlayView() {
        try {
            overlayRootView?.let {
                if (it.isAttachedToWindow) {
                    windowManager?.removeViewImmediate(it)
                }
            }
            overlayRootView = null
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun dpToPx(dp: Int): Int {
        val density = resources.displayMetrics.density
        return (dp * density).toInt()
    }

    override fun onDestroy() {
        instance = null
        mainHandler.removeCallbacks(autoDismissRunnable)
        removeExistingOverlayView()
        releaseScreenWake()
        super.onDestroy()
    }
}
