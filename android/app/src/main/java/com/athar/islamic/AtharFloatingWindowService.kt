package com.athar.islamic

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.LayerDrawable
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.CountDownTimer
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.core.app.NotificationCompat

/**
 * AtharFloatingWindowService
 * 
 * System-Level Floating Window (نافذة نظام عائمة) using Android WindowManager.
 * Renders on top of any active application (e.g. WhatsApp, Facebook, Browser)
 * using TYPE_APPLICATION_OVERLAY and SYSTEM_ALERT_WINDOW.
 * 
 * Features:
 * 1. Fixed at the top of the screen as an elegant royal banner (Gravity.TOP).
 * 2. WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE ensures touches outside
 *    do not dismiss the window, allowing user to interact or close via buttons.
 * 3. Foreground Service guarantees persistence across background app switches.
 * 4. Deep linking directly opens the specific Quran Ayah or Tasbeeh in Athar.
 * 5. Full audio playback and auto-dismiss countdown with slim gold progress bar.
 */
class AtharFloatingWindowService : Service() {

    companion object {
        const val CHANNEL_ID = "athar_floating_overlay_channel_v1"
        const val NOTIFICATION_ID = 99994

        const val ACTION_SHOW = "com.athar.islamic.ACTION_SHOW_FLOATING_OVERLAY"
        const val ACTION_DISMISS = "com.athar.islamic.ACTION_DISMISS_FLOATING_OVERLAY"

        const val EXTRA_TITLE = "extra_title"
        const val EXTRA_BODY = "extra_body"
        const val EXTRA_BADGE = "extra_badge"
        const val EXTRA_CATEGORY = "extra_category"
        const val EXTRA_AUDIO_URL = "extra_audio_url"
        const val EXTRA_PLAY_SOUND = "extra_play_sound"
        const val EXTRA_SURAH_NUMBER = "extra_surah_number"
        const val EXTRA_AYAH_NUMBER = "extra_ayah_number"
        const val EXTRA_ACTION_TEXT = "extra_action_text"
        const val EXTRA_AUTO_DISMISS_SECS = "extra_auto_dismiss_secs"
        const val EXTRA_PLAYBACK_MODE = "extra_playback_mode"

        @Volatile
        var isOverlayVisible: Boolean = false
            private set

        @Volatile
        private var activeServiceInstance: AtharFloatingWindowService? = null

        fun showOverlay(
            context: Context,
            title: String,
            body: String,
            badge: String,
            category: String,
            audioUrl: String,
            playSound: Boolean,
            surahNumber: Int,
            ayahNumber: Int,
            actionText: String,
            autoDismissSeconds: Int,
            playbackMode: String
        ) {
            val intent = Intent(context, AtharFloatingWindowService::class.java).apply {
                action = ACTION_SHOW
                putExtra(EXTRA_TITLE, title)
                putExtra(EXTRA_BODY, body)
                putExtra(EXTRA_BADGE, badge)
                putExtra(EXTRA_CATEGORY, category)
                putExtra(EXTRA_AUDIO_URL, audioUrl)
                putExtra(EXTRA_PLAY_SOUND, playSound)
                putExtra(EXTRA_SURAH_NUMBER, surahNumber)
                putExtra(EXTRA_AYAH_NUMBER, ayahNumber)
                putExtra(EXTRA_ACTION_TEXT, actionText)
                putExtra(EXTRA_AUTO_DISMISS_SECS, autoDismissSeconds)
                putExtra(EXTRA_PLAYBACK_MODE, playbackMode)
            }

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        fun dismissOverlay(context: Context) {
            val instance = activeServiceInstance
            if (instance != null) {
                instance.removeFloatingWindow()
                instance.stopSelf()
            } else {
                val intent = Intent(context, AtharFloatingWindowService::class.java).apply {
                    action = ACTION_DISMISS
                }
                try {
                    context.startService(intent)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }

    private var windowManager: WindowManager? = null
    private var floatingRootView: View? = null
    private var countDownTimer: CountDownTimer? = null
    private var mediaPlayer: MediaPlayer? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    private var currentTitle = ""
    private var currentBody = ""
    private var currentBadge = ""
    private var currentCategory = ""
    private var currentAudioUrl = ""
    private var currentSurahNumber = 0
    private var currentAyahNumber = 1
    private var currentActionText = ""
    private var currentAutoDismissSecs = 0
    private var currentPlaySound = false
    private var currentPlaybackMode = "notification_and_sound"

    private var audioToggleButton: TextView? = null
    private var isAudioPlaying = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        activeServiceInstance = this
        windowManager = getSystemService(Context.WINDOW_SERVICE) as? WindowManager
        createNotificationChannel()
        acquireWakeLock()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent == null) {
            stopSelf()
            return START_NOT_STICKY
        }

        when (intent.action) {
            ACTION_DISMISS -> {
                removeFloatingWindow()
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_SHOW -> {
                currentTitle = intent.getStringExtra(EXTRA_TITLE) ?: "تنبيه أثر الملكي"
                currentBody = intent.getStringExtra(EXTRA_BODY) ?: ""
                currentBadge = intent.getStringExtra(EXTRA_BADGE) ?: "🕌 تنبيه أثر"
                currentCategory = intent.getStringExtra(EXTRA_CATEGORY) ?: "dhikr_tasbeeh"
                currentAudioUrl = intent.getStringExtra(EXTRA_AUDIO_URL) ?: ""
                currentPlaySound = intent.getBooleanExtra(EXTRA_PLAY_SOUND, false)
                currentSurahNumber = intent.getIntExtra(EXTRA_SURAH_NUMBER, 0)
                currentAyahNumber = intent.getIntExtra(EXTRA_AYAH_NUMBER, 1)
                currentActionText = intent.getStringExtra(EXTRA_ACTION_TEXT) ?: "فتح في التطبيق 📖"
                currentAutoDismissSecs = intent.getIntExtra(EXTRA_AUTO_DISMISS_SECS, 0)
                currentPlaybackMode = intent.getStringExtra(EXTRA_PLAYBACK_MODE) ?: "notification_and_sound"

                startForegroundServiceNotification()
                renderSystemFloatingWindow()

                if (currentPlaySound && currentAudioUrl.isNotEmpty()) {
                    startAudioPlayback(currentAudioUrl)
                }
                return START_NOT_STICKY
            }
            else -> {
                return START_NOT_STICKY
            }
        }
    }

    private fun dp(value: Int): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value.toFloat(),
            resources.displayMetrics
        ).toInt()
    }

    private fun acquireWakeLock() {
        try {
            val pm = getSystemService(Context.POWER_SERVICE) as? PowerManager
            if (pm != null && wakeLock == null) {
                wakeLock = pm.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
                    "Athar:FloatingWindowWakeLock"
                ).apply {
                    acquire(60 * 1000L) // 1 minute max
                }
            }
        } catch (ignored: Exception) {}
    }

    private fun releaseWakeLock() {
        try {
            if (wakeLock != null && wakeLock?.isHeld == true) {
                wakeLock?.release()
                wakeLock = null
            }
        } catch (ignored: Exception) {}
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            if (nm != null) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "نافذة أثر العائمة التفاعلية",
                    NotificationManager.IMPORTANCE_LOW
                ).apply {
                    description = "تنبيهات أثر الملكية العائمة فوق التطبيقات"
                    setShowBadge(false)
                    enableVibration(false)
                    setSound(null, null)
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                }
                nm.createNotificationChannel(channel)
            }
        }
    }

    private fun startForegroundServiceNotification() {
        val dismissIntent = Intent(this, AtharFloatingWindowService::class.java).apply {
            action = ACTION_DISMISS
        }
        val dismissPendingIntent = PendingIntent.getService(
            this,
            9994,
            dismissIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_athar)
            .setContentTitle(currentBadge)
            .setContentText(currentTitle)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setSilent(true)
            .setColor(Color.parseColor("#E6C66E"))
            .addAction(R.drawable.ic_stat_athar, "إغلاق التنبيه", dismissPendingIntent)
            .build()

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (e: Exception) {
            try {
                startForeground(NOTIFICATION_ID, notification)
            } catch (ignored: Exception) {}
        }
    }

    /**
     * Constructs and attaches the native floating view to WindowManager.
     */
    private fun renderSystemFloatingWindow() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            stopSelf()
            return
        }

        mainHandler.post {
            try {
                removeFloatingWindowInternal()

                val wm = windowManager ?: return@post

                // Outer touch wrapper
                val rootLayout = FrameLayout(this).apply {
                    layoutParams = FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.WRAP_CONTENT
                    )
                    setPadding(dp(12), dp(4), dp(12), dp(8))
                    layoutDirection = View.LAYOUT_DIRECTION_RTL
                }

                // Card Container with Obsidian Black Background and Royal Gold Border
                val cardLayout = LinearLayout(this).apply {
                    orientation = LinearLayout.VERTICAL
                    layoutDirection = View.LAYOUT_DIRECTION_RTL
                    setPadding(dp(16), dp(14), dp(16), dp(14))

                    val bgDrawable = GradientDrawable().apply {
                        shape = GradientDrawable.RECTANGLE
                        setColor(Color.parseColor("#120F0A")) // Deep obsidian
                        cornerRadius = dp(20).toFloat()
                        setStroke(dp(2), Color.parseColor("#E6C66E")) // Rich gold border
                    }
                    background = bgDrawable
                    elevation = dp(16).toFloat()
                }

                // --- 1. Top Header Row (Badge + Close Button) ---
                val headerRow = LinearLayout(this).apply {
                    orientation = LinearLayout.HORIZONTAL
                    layoutDirection = View.LAYOUT_DIRECTION_RTL
                    gravity = Gravity.CENTER_VERTICAL
                }

                // Badge Container
                val badgeView = TextView(this).apply {
                    text = currentBadge
                    setTextColor(Color.parseColor("#FFF2C2"))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 11.5f)
                    typeface = Typeface.DEFAULT_BOLD
                    setPadding(dp(10), dp(4), dp(10), dp(4))

                    val badgeBg = GradientDrawable().apply {
                        shape = GradientDrawable.RECTANGLE
                        setColor(Color.parseColor("#261E13"))
                        cornerRadius = dp(10).toFloat()
                        setStroke(dp(1), Color.parseColor("#C8A24A"))
                    }
                    background = badgeBg
                }
                headerRow.addView(badgeView)

                // Spacer
                val spacer = View(this).apply {
                    layoutParams = LinearLayout.LayoutParams(0, 1, 1.0f)
                }
                headerRow.addView(spacer)

                // Close Button ("✕ إغلاق")
                val closeButton = TextView(this).apply {
                    text = "✕ إغلاق"
                    setTextColor(Color.parseColor("#E6C66E"))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
                    typeface = Typeface.DEFAULT_BOLD
                    setPadding(dp(10), dp(4), dp(10), dp(4))

                    val closeBg = GradientDrawable().apply {
                        shape = GradientDrawable.RECTANGLE
                        setColor(Color.parseColor("#1C160E"))
                        cornerRadius = dp(10).toFloat()
                        setStroke(dp(1), Color.parseColor("#7A622A"))
                    }
                    background = closeBg
                    isClickable = true
                    isFocusable = true
                    setOnClickListener {
                        dismissOverlay(this@AtharFloatingWindowService)
                    }
                }
                headerRow.addView(closeButton)
                cardLayout.addView(headerRow)

                // --- 2. Title Section ---
                val titleView = TextView(this).apply {
                    text = currentTitle
                    setTextColor(Color.parseColor("#FFF9E6"))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
                    typeface = Typeface.DEFAULT_BOLD
                    val lp = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        topMargin = dp(8)
                    }
                    layoutParams = lp
                }
                cardLayout.addView(titleView)

                // --- 3. Body Section (Quran Ayah or Dhikr Text) ---
                if (currentBody.isNotEmpty()) {
                    val bodyView = TextView(this).apply {
                        text = currentBody
                        setTextColor(Color.parseColor("#E8DEC8"))
                        setTextSize(TypedValue.COMPLEX_UNIT_SP, 12.5f)
                        maxLines = 4
                        setLineSpacing(dp(2).toFloat(), 1.25f)
                        val lp = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            LinearLayout.LayoutParams.WRAP_CONTENT
                        ).apply {
                            topMargin = dp(6)
                        }
                        layoutParams = lp
                    }
                    cardLayout.addView(bodyView)
                }

                // --- 4. Slim Gold Progress Bar (Auto-Dismiss) ---
                var progressBar: ProgressBar? = null
                if (currentAutoDismissSecs > 0) {
                    progressBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
                        isIndeterminate = false
                        max = currentAutoDismissSecs * 10
                        progress = currentAutoDismissSecs * 10
                        val lp = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            dp(3)
                        ).apply {
                            topMargin = dp(10)
                        }
                        layoutParams = lp

                        val progressDrawable = GradientDrawable().apply {
                            shape = GradientDrawable.RECTANGLE
                            setColor(Color.parseColor("#E6C66E"))
                            cornerRadius = dp(2).toFloat()
                        }
                        val bgDrawable = GradientDrawable().apply {
                            shape = GradientDrawable.RECTANGLE
                            setColor(Color.parseColor("#261E13"))
                            cornerRadius = dp(2).toFloat()
                        }
                        progressDrawable(bgDrawable, progressDrawable)
                    }
                    cardLayout.addView(progressBar)

                    startAutoDismissCountdown(progressBar, currentAutoDismissSecs)
                }

                // --- 5. Action Controls Row ---
                val actionsRow = LinearLayout(this).apply {
                    orientation = LinearLayout.HORIZONTAL
                    layoutDirection = View.LAYOUT_DIRECTION_RTL
                    gravity = Gravity.CENTER_VERTICAL
                    val lp = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        topMargin = dp(12)
                    }
                    layoutParams = lp
                }

                // Primary Action Button ("فتح في التطبيق" / "فتح الآية" / "المسبحة")
                val openButton = TextView(this).apply {
                    text = if (currentActionText.isNotEmpty()) currentActionText else "فتح في التطبيق 📖"
                    setTextColor(Color.parseColor("#080705"))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
                    typeface = Typeface.DEFAULT_BOLD
                    gravity = Gravity.CENTER
                    setPadding(dp(14), dp(8), dp(14), dp(8))

                    val openBg = GradientDrawable().apply {
                        shape = GradientDrawable.RECTANGLE
                        colors = intArrayOf(
                            Color.parseColor("#FFF2C2"),
                            Color.parseColor("#E6C66E"),
                            Color.parseColor("#B88A2D")
                        )
                        orientation = GradientDrawable.Orientation.TL_BR
                        cornerRadius = dp(12).toFloat()
                    }
                    background = openBg
                    isClickable = true
                    isFocusable = true
                    setOnClickListener {
                        launchAppDeepLink()
                    }
                }
                actionsRow.addView(openButton)

                // Audio Play/Pause Button (if audio URL is present)
                if (currentAudioUrl.isNotEmpty()) {
                    val audioBtn = TextView(this).apply {
                        text = if (isAudioPlaying) "إيقاف مؤقت ⏸️" else "تشغيل الصوت 🔊"
                        setTextColor(Color.parseColor("#FFF2C2"))
                        setTextSize(TypedValue.COMPLEX_UNIT_SP, 11.5f)
                        typeface = Typeface.DEFAULT_BOLD
                        gravity = Gravity.CENTER
                        setPadding(dp(12), dp(8), dp(12), dp(8))

                        val audioBg = GradientDrawable().apply {
                            shape = GradientDrawable.RECTANGLE
                            setColor(Color.parseColor("#261E13"))
                            cornerRadius = dp(12).toFloat()
                            setStroke(dp(1), Color.parseColor("#E6C66E"))
                        }
                        background = audioBg
                        isClickable = true
                        isFocusable = true
                        val lp = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.WRAP_CONTENT,
                            LinearLayout.LayoutParams.WRAP_CONTENT
                        ).apply {
                            setMargins(dp(8), 0, 0, 0)
                        }
                        layoutParams = lp
                        setOnClickListener {
                            toggleAudioPlayback()
                        }
                    }
                    audioToggleButton = audioBtn
                    actionsRow.addView(audioBtn)
                }

                cardLayout.addView(actionsRow)
                rootLayout.addView(cardLayout)

                // --- 6. WindowManager LayoutParams Configuration ---
                val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                } else {
                    @Suppress("DEPRECATION")
                    WindowManager.LayoutParams.TYPE_PHONE
                }

                // WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE:
                // Allows user to touch background apps without closing this floating window.
                val params = WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.WRAP_CONTENT,
                    layoutType,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
                    PixelFormat.TRANSLUCENT
                ).apply {
                    gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
                    y = dp(32) // Positioned nicely below the system status bar
                }

                wm.addView(rootLayout, params)
                floatingRootView = rootLayout
                isOverlayVisible = true
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun ProgressBar.progressDrawable(bg: GradientDrawable, fg: GradientDrawable) {
        val layers = arrayOf(bg, fg)
        val layerDrawable = LayerDrawable(layers)
        layerDrawable.setId(0, android.R.id.background)
        layerDrawable.setId(1, android.R.id.progress)
        this.progressDrawable = layerDrawable
    }

    private fun startAutoDismissCountdown(progressBar: ProgressBar, totalSeconds: Int) {
        countDownTimer?.cancel()
        val totalMs = (totalSeconds * 1000).toLong()
        countDownTimer = object : CountDownTimer(totalMs, 100) {
            override fun onTick(millisUntilFinished: Long) {
                val progressVal = (millisUntilFinished / 100).toInt()
                progressBar.progress = progressVal
            }

            override fun onFinish() {
                progressBar.progress = 0
                dismissOverlay(this@AtharFloatingWindowService)
            }
        }.start()
    }

    private fun startAudioPlayback(url: String) {
        try {
            stopAudioInternal()

            var cleanUrl = url.trim()
            if (cleanUrl.startsWith("/")) {
                cleanUrl = cleanUrl.substring(1)
            }

            val player = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                        .build()
                )

                if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
                    setDataSource(cleanUrl)
                } else if (cleanUrl.startsWith("file://")) {
                    setDataSource(this@AtharFloatingWindowService, Uri.parse(cleanUrl))
                } else {
                    // Try to open from android assets if local asset path
                    try {
                        val afd = assets.openFd(cleanUrl)
                        setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                        afd.close()
                    } catch (e: Exception) {
                        try {
                            val afd = assets.openFd("public/$cleanUrl")
                            setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                            afd.close()
                        } catch (e2: Exception) {
                            setDataSource(cleanUrl)
                        }
                    }
                }

                setOnPreparedListener { mp ->
                    try {
                        mp.start()
                        isAudioPlaying = true
                        audioToggleButton?.text = "إيقاف مؤقت ⏸️"
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }

                setOnCompletionListener {
                    isAudioPlaying = false
                    audioToggleButton?.text = "إعادة الاستماع 🔁"
                    // If mode was notification_and_sound, dismiss gently after completion
                    if (currentPlaybackMode == "notification_and_sound") {
                        mainHandler.postDelayed({
                            dismissOverlay(this@AtharFloatingWindowService)
                        }, 1200L)
                    }
                }

                setOnErrorListener { _, _, _ ->
                    isAudioPlaying = false
                    audioToggleButton?.text = "تشغيل الصوت 🔊"
                    false
                }

                prepareAsync()
            }
            mediaPlayer = player
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun toggleAudioPlayback() {
        val player = mediaPlayer
        if (player != null) {
            try {
                if (player.isPlaying) {
                    player.pause()
                    isAudioPlaying = false
                    audioToggleButton?.text = "تشغيل الصوت 🔊"
                } else {
                    player.start()
                    isAudioPlaying = true
                    audioToggleButton?.text = "إيقاف مؤقت ⏸️"
                }
            } catch (e: Exception) {
                if (currentAudioUrl.isNotEmpty()) {
                    startAudioPlayback(currentAudioUrl)
                }
            }
        } else if (currentAudioUrl.isNotEmpty()) {
            startAudioPlayback(currentAudioUrl)
        }
    }

    private fun stopAudioInternal() {
        try {
            mediaPlayer?.let {
                if (it.isPlaying) {
                    it.stop()
                }
                it.release()
            }
        } catch (ignored: Exception) {}
        mediaPlayer = null
        isAudioPlaying = false
    }

    /**
     * Launches MainActivity with Deep Link extras and closes the floating window.
     */
    private fun launchAppDeepLink() {
        val isTasbih = currentCategory.contains("tasbeeh") || currentCategory.contains("salawat")
        val isWird = currentCategory.contains("wird")
        val isParents = currentCategory.contains("parents")

        val intent = Intent(this, MainActivity::class.java).apply {
            action = "com.athar.islamic.ACTION_ATHAR_ALERT_OVERLAY"
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("open_royal_alert", true)
            putExtra("alert_title", currentTitle)
            putExtra("alert_body", currentBody)
            putExtra("badge", currentBadge)
            putExtra("category", currentCategory)
            putExtra("notification_category", currentCategory)
            putExtra("audio_url", currentAudioUrl)
            putExtra("surah_number", currentSurahNumber)
            putExtra("ayah_number", currentAyahNumber)
            putExtra("open_tasbih", isTasbih)
            putExtra("open_wird", isWird)
            putExtra("open_parents_modal", isParents)
            putExtra("from_overlay", true)
        }

        try {
            startActivity(intent)
        } catch (e: Exception) {
            e.printStackTrace()
        }

        dismissOverlay(this)
    }

    private fun removeFloatingWindowInternal() {
        countDownTimer?.cancel()
        countDownTimer = null

        val view = floatingRootView
        val wm = windowManager
        if (view != null && wm != null) {
            try {
                wm.removeView(view)
            } catch (ignored: Exception) {}
        }
        floatingRootView = null
        isOverlayVisible = false
    }

    private fun removeFloatingWindow() {
        mainHandler.post {
            removeFloatingWindowInternal()
            stopAudioInternal()
            releaseWakeLock()
        }
    }

    override fun onDestroy() {
        activeServiceInstance = null
        removeFloatingWindowInternal()
        stopAudioInternal()
        releaseWakeLock()
        super.onDestroy()
    }
}
