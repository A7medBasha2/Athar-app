package com.athar.islamic

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.content.res.AssetFileDescriptor
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
import android.text.TextUtils
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.core.app.NotificationCompat
import java.util.ArrayDeque

data class FloatingAlertData(
    val title: String,
    val body: String,
    val badge: String,
    val category: String,
    val audioUrl: String,
    val playSound: Boolean,
    val surahNumber: Int,
    val ayahNumber: Int,
    val actionText: String,
    val autoDismissSeconds: Int = 15,
    val playbackMode: String = "notification_and_sound"
)

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
                putExtra(EXTRA_AUTO_DISMISS_SECS, if (autoDismissSeconds > 0) autoDismissSeconds else 15)
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
                instance.dismissAllAndStop()
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

    // Sequential Queue for Incoming Alerts (FIFO) to prevent stacking/overlaying
    private val alertQueue = ArrayDeque<FloatingAlertData>()
    @Volatile
    private var isCurrentlyDisplaying = false

    private var currentAlert: FloatingAlertData? = null
    private var audioToggleButton: TextView? = null
    private var audioTimeView: TextView? = null
    private var isAudioPlaying = false
    private var audioProgressRunnable: Runnable? = null
    private var audioWatchdogRunnable: Runnable? = null

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
                dismissAllAndStop()
                return START_NOT_STICKY
            }
            ACTION_SHOW -> {
                val autoSecs = intent.getIntExtra(EXTRA_AUTO_DISMISS_SECS, 15)
                val alertItem = FloatingAlertData(
                    title = intent.getStringExtra(EXTRA_TITLE) ?: "تنبيه أثر الملكي",
                    body = intent.getStringExtra(EXTRA_BODY) ?: "",
                    badge = intent.getStringExtra(EXTRA_BADGE) ?: "🕌 تنبيه أثر",
                    category = intent.getStringExtra(EXTRA_CATEGORY) ?: "dhikr_tasbeeh",
                    audioUrl = intent.getStringExtra(EXTRA_AUDIO_URL) ?: "",
                    playSound = intent.getBooleanExtra(EXTRA_PLAY_SOUND, false),
                    surahNumber = intent.getIntExtra(EXTRA_SURAH_NUMBER, 0),
                    ayahNumber = intent.getIntExtra(EXTRA_AYAH_NUMBER, 1),
                    actionText = intent.getStringExtra(EXTRA_ACTION_TEXT) ?: "فتح في التطبيق 📖",
                    autoDismissSeconds = if (autoSecs > 0) autoSecs else 15,
                    playbackMode = intent.getStringExtra(EXTRA_PLAYBACK_MODE) ?: "notification_and_sound"
                )

                // Enqueue the incoming alert
                alertQueue.offer(alertItem)
                startForegroundServiceNotification(alertItem.badge, alertItem.title)

                // If not currently rendering an active alert, pop and display
                if (!isCurrentlyDisplaying) {
                    displayNextInQueue()
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

    private fun dp(value: Float): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value,
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
                    acquire(60 * 1000L)
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

    private fun startForegroundServiceNotification(badge: String, title: String) {
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
            .setContentTitle(badge)
            .setContentText(title)
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
     * Pops and displays the next alert in the sequential queue.
     * Guarantees only ONE floating window is active at any point.
     */
    private fun displayNextInQueue() {
        mainHandler.post {
            if (alertQueue.isEmpty()) {
                isCurrentlyDisplaying = false
                dismissAllAndStop()
                return@post
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
                alertQueue.clear()
                stopSelf()
                return@post
            }

            // Remove existing window cleanly first
            removeCurrentWindowInternal()

            val alert = alertQueue.poll() ?: return@post
            currentAlert = alert
            isCurrentlyDisplaying = true

            renderCardUI(alert)

            val shouldAutoPlay = (alert.playbackMode == "notification_and_sound") && alert.playSound && alert.audioUrl.isNotEmpty()
            if (shouldAutoPlay) {
                startAudioPlayback(alert.audioUrl)
            }
        }
    }

    /**
     * Builds the unified luxury Black & Gold card layout matching Athar design system.
     */
    private fun renderCardUI(alert: FloatingAlertData) {
        val wm = windowManager ?: return

        try {
            val rootLayout = FrameLayout(this).apply {
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT
                )
                setPadding(dp(14), dp(4), dp(14), dp(8))
                layoutDirection = View.LAYOUT_DIRECTION_RTL
            }

            val cardLayout = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                layoutDirection = View.LAYOUT_DIRECTION_RTL
                setPadding(dp(16), dp(16), dp(16), dp(16))

                val bgDrawable = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    colors = intArrayOf(
                        Color.parseColor("#18130B"),
                        Color.parseColor("#100D08"),
                        Color.parseColor("#0A0805")
                    )
                    orientation = GradientDrawable.Orientation.TOP_BOTTOM
                    cornerRadius = dp(20).toFloat()
                    setStroke(dp(1.6f), Color.parseColor("#D4AF37"))
                }
                background = bgDrawable
                elevation = dp(28).toFloat()
            }

            // Top Header Row (Right: Badge, Left: Close Button)
            val headerRow = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                layoutDirection = View.LAYOUT_DIRECTION_RTL
                gravity = Gravity.CENTER_VERTICAL
            }

            val badgeView = TextView(this).apply {
                text = alert.badge
                setTextColor(Color.parseColor("#FFF2C2"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
                typeface = Typeface.DEFAULT_BOLD
                setPadding(dp(12), dp(4), dp(12), dp(4))

                val badgeBg = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    setColor(Color.parseColor("#261D10"))
                    cornerRadius = dp(10).toFloat()
                    setStroke(dp(1), Color.parseColor("#D4AF37"))
                }
                background = badgeBg
            }
            headerRow.addView(badgeView)

            val spacer = View(this).apply {
                layoutParams = LinearLayout.LayoutParams(0, 1, 1.0f)
            }
            headerRow.addView(spacer)

            val closeButton = TextView(this).apply {
                text = "✕ إغلاق"
                setTextColor(Color.parseColor("#E6C66E"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
                typeface = Typeface.DEFAULT_BOLD
                setPadding(dp(12), dp(4), dp(12), dp(4))

                val closeBg = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    setColor(Color.parseColor("#1A140B"))
                    cornerRadius = dp(10).toFloat()
                    setStroke(dp(1), Color.parseColor("#8E7233"))
                }
                background = closeBg
                isClickable = true
                isFocusable = true
                setOnClickListener {
                    advanceQueue()
                }
            }
            headerRow.addView(closeButton)
            cardLayout.addView(headerRow)

            // Title
            val titleView = TextView(this).apply {
                text = alert.title
                setTextColor(Color.parseColor("#FFF9E6"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 14.5f)
                typeface = Typeface.DEFAULT_BOLD
                maxLines = 1
                ellipsize = TextUtils.TruncateAt.END
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = dp(9)
                }
                layoutParams = lp
            }
            cardLayout.addView(titleView)

            // Content Body Box
            if (alert.body.isNotEmpty()) {
                val bodyBox = LinearLayout(this).apply {
                    orientation = LinearLayout.VERTICAL
                    layoutDirection = View.LAYOUT_DIRECTION_RTL
                    setPadding(dp(12), dp(10), dp(12), dp(10))
                    val lp = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        topMargin = dp(8)
                    }
                    layoutParams = lp

                    val boxBg = GradientDrawable().apply {
                        shape = GradientDrawable.RECTANGLE
                        setColor(Color.parseColor("#110D08"))
                        cornerRadius = dp(12).toFloat()
                        setStroke(dp(1), Color.parseColor("#2E2310"))
                    }
                    background = boxBg
                }

                val bodyView = TextView(this).apply {
                    text = alert.body
                    setTextColor(Color.parseColor("#F5EEDB"))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
                    maxLines = 4
                    ellipsize = TextUtils.TruncateAt.END
                    setLineSpacing(dp(2.5f).toFloat(), 1.3f)
                }
                bodyBox.addView(bodyView)
                cardLayout.addView(bodyBox)
            }

            // Audio Player Bar
            val shouldShowAudioBar = alert.playbackMode != "notification_only" && alert.audioUrl.isNotEmpty()
            if (shouldShowAudioBar) {
                val audioBar = LinearLayout(this).apply {
                    orientation = LinearLayout.HORIZONTAL
                    layoutDirection = View.LAYOUT_DIRECTION_RTL
                    gravity = Gravity.CENTER_VERTICAL
                    setPadding(dp(10), dp(6), dp(10), dp(6))
                    val lp = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        topMargin = dp(9)
                    }
                    layoutParams = lp

                    val audioBg = GradientDrawable().apply {
                        shape = GradientDrawable.RECTANGLE
                        setColor(Color.parseColor("#1E170C"))
                        cornerRadius = dp(12).toFloat()
                        setStroke(dp(1), Color.parseColor("#D4AF37"))
                    }
                    background = audioBg
                }

                val audioBtn = TextView(this).apply {
                    text = if (isAudioPlaying) "⏸️" else "▶️"
                    setTextColor(Color.parseColor("#0A0805"))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
                    typeface = Typeface.DEFAULT_BOLD
                    gravity = Gravity.CENTER
                    val btnLp = LinearLayout.LayoutParams(dp(34), dp(34))
                    layoutParams = btnLp

                    val btnBg = GradientDrawable().apply {
                        shape = GradientDrawable.OVAL
                        setColor(Color.parseColor("#E6C66E"))
                    }
                    background = btnBg
                    isClickable = true
                    isFocusable = true
                    setOnClickListener {
                        toggleAudioPlayback()
                    }
                }
                audioToggleButton = audioBtn
                audioBar.addView(audioBtn)

                val textColumn = LinearLayout(this).apply {
                    orientation = LinearLayout.VERTICAL
                    layoutDirection = View.LAYOUT_DIRECTION_RTL
                    val colLp = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f).apply {
                        setMargins(dp(9), 0, dp(9), 0)
                    }
                    layoutParams = colLp
                }

                val audioLabelText = when {
                    alert.category.contains("ayah") || alert.surahNumber > 0 -> "تلاوة صوتية مباركة 🎧"
                    alert.category.contains("salawat") || alert.category.contains("tasbeeh") -> "استماع للذكر والصلاة على النبي ﷺ 🎧"
                    alert.category.contains("wird") -> "تلاوة الورد القرآني 🎧"
                    alert.category.contains("parents") -> "دعاء بر الوالدين والإحسان 🎧"
                    else -> "استماع صوتي مبارك 🎧"
                }

                val audioLabel = TextView(this).apply {
                    text = audioLabelText
                    setTextColor(Color.parseColor("#FFF2C2"))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
                    typeface = Typeface.DEFAULT_BOLD
                }
                textColumn.addView(audioLabel)

                val audioTimer = TextView(this).apply {
                    text = "00:00 / --:--"
                    setTextColor(Color.parseColor("#D4AF37"))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 10.5f)
                }
                audioTimeView = audioTimer
                textColumn.addView(audioTimer)
                audioBar.addView(textColumn)

                cardLayout.addView(audioBar)
            }

            // 15-Second Auto Dismiss Progress Bar (Always active to prevent hanging)
            val autoSecs = if (alert.autoDismissSeconds > 0) alert.autoDismissSeconds else 15
            val progressBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
                isIndeterminate = false
                max = autoSecs * 10
                progress = autoSecs * 10
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    dp(2.5f)
                ).apply {
                    topMargin = dp(9)
                }
                layoutParams = lp

                val fgDrawable = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    setColor(Color.parseColor("#E6C66E"))
                    cornerRadius = dp(2).toFloat()
                }
                val bgDrawable = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    setColor(Color.parseColor("#221A0F"))
                    cornerRadius = dp(2).toFloat()
                }
                progressDrawable(bgDrawable, fgDrawable)
            }
            cardLayout.addView(progressBar)

            startAutoDismissCountdown(progressBar, autoSecs)

            // Contextual Single Primary Action Button (Matching each category with zero duplicate/wrong buttons)
            val actionTitle: String
            val isAyah = alert.surahNumber > 0 || alert.category.contains("ayah") || alert.category.contains("quran_ayah")
            val isSalawat = alert.category.contains("salawat") || alert.category.contains("tasbeeh") || alert.category.contains("dhikr")
            val isWird = alert.category.contains("wird")
            val isParents = alert.category.contains("parents")

            actionTitle = when {
                isAyah -> if (alert.actionText.isNotEmpty() && !alert.actionText.contains("المسبحة")) alert.actionText else "فتح الآية في المصحف 📖"
                isSalawat -> "فتح المسبحة والأذكار 📿"
                isWird -> "متابعة الورد في المصحف 📖"
                isParents -> "دعاء وبر الوالدين 🤲"
                else -> if (alert.actionText.isNotEmpty()) alert.actionText else "فتح في التطبيق 📖"
            }

            val singleActionButton = TextView(this).apply {
                text = actionTitle
                setTextColor(Color.parseColor("#080705"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 13.5f)
                typeface = Typeface.DEFAULT_BOLD
                gravity = Gravity.CENTER
                setPadding(dp(16), dp(10), dp(16), dp(10))

                val openBg = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    colors = intArrayOf(
                        Color.parseColor("#FFF2C2"),
                        Color.parseColor("#E6C66E"),
                        Color.parseColor("#B88A2D")
                    )
                    orientation = GradientDrawable.Orientation.TL_BR
                    cornerRadius = dp(14).toFloat()
                }
                background = openBg
                elevation = dp(4).toFloat()
                isClickable = true
                isFocusable = true
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    dp(46)
                ).apply {
                    topMargin = dp(11)
                }
                layoutParams = lp
                setOnClickListener {
                    launchContextualDeepLink(alert)
                }
            }
            cardLayout.addView(singleActionButton)

            rootLayout.addView(cardLayout)

            val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE
            }

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
                y = dp(34)
            }

            wm.addView(rootLayout, params)
            floatingRootView = rootLayout
            isOverlayVisible = true
        } catch (e: Exception) {
            e.printStackTrace()
            // If failed to add view, attempt queue advancement
            advanceQueue()
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
                val progressVal = ((millisUntilFinished.toFloat() / totalMs) * (totalSeconds * 10)).toInt()
                progressBar.progress = progressVal
            }

            override fun onFinish() {
                advanceQueue()
            }
        }.start()
    }

    /**
     * Advances the queue: Dismisses the active card, stops audio, and displays the next queued alert (if any).
     */
    private fun advanceQueue() {
        mainHandler.post {
            removeCurrentWindowInternal()
            if (alertQueue.isNotEmpty()) {
                mainHandler.postDelayed({
                    displayNextInQueue()
                }, 200)
            } else {
                isCurrentlyDisplaying = false
                dismissAllAndStop()
            }
        }
    }

    /**
     * High-performance Audio Engine:
     * 1. Resolves local APK assets immediately (0ms latency, zero network dependency)
     * 2. Adds 3-second watchdog timer for remote streaming so UI never hangs or waits forever.
     */
    private fun startAudioPlayback(rawUrl: String) {
        if (rawUrl.isEmpty()) return

        try {
            audioWatchdogRunnable?.let { mainHandler.removeCallbacks(it) }
            mediaPlayer?.release()

            val mp = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .build()
                )
            }

            var assetOpened = false
            // Check if audio file is packaged inside APK assets
            if (rawUrl.contains("/audio/") || rawUrl.startsWith("audio/")) {
                try {
                    val cleanPath = when {
                        rawUrl.startsWith("/audio/") -> "public" + rawUrl
                        rawUrl.startsWith("audio/") -> "public/" + rawUrl
                        rawUrl.contains("/audio/") -> "public/audio/" + rawUrl.substringAfterLast("/audio/")
                        else -> "public/" + rawUrl
                    }
                    val afd: AssetFileDescriptor = assets.openFd(cleanPath)
                    mp.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                    afd.close()
                    assetOpened = true
                } catch (e: Exception) {
                    assetOpened = false
                }
            }

            if (!assetOpened) {
                mp.setDataSource(rawUrl)
            }

            mediaPlayer = mp

            // Watchdog: If prepareAsync takes more than 3.5s, don't stall the UI
            audioWatchdogRunnable = Runnable {
                try {
                    if (!isAudioPlaying && mediaPlayer != null) {
                        isAudioPlaying = false
                        audioToggleButton?.text = "▶️"
                    }
                } catch (ignored: Exception) {}
            }
            audioWatchdogRunnable?.let { mainHandler.postDelayed(it, 3500) }

            mp.setOnPreparedListener { player ->
                audioWatchdogRunnable?.let { mainHandler.removeCallbacks(it) }
                try {
                    player.start()
                    isAudioPlaying = true
                    audioToggleButton?.text = "⏸️"
                    startAudioProgressTracker()
                } catch (e: Exception) {
                    isAudioPlaying = false
                    audioToggleButton?.text = "▶️"
                }
            }

            mp.setOnCompletionListener {
                isAudioPlaying = false
                audioToggleButton?.text = "▶️"
            }

            mp.setOnErrorListener { _, _, _ ->
                audioWatchdogRunnable?.let { mainHandler.removeCallbacks(it) }
                isAudioPlaying = false
                audioToggleButton?.text = "▶️"
                true
            }

            mp.prepareAsync()
        } catch (e: Exception) {
            e.printStackTrace()
            isAudioPlaying = false
            audioToggleButton?.text = "▶️"
        }
    }

    private fun toggleAudioPlayback() {
        try {
            if (mediaPlayer != null) {
                if (mediaPlayer?.isPlaying == true) {
                    mediaPlayer?.pause()
                    isAudioPlaying = false
                    audioToggleButton?.text = "▶️"
                } else {
                    mediaPlayer?.start()
                    isAudioPlaying = true
                    audioToggleButton?.text = "⏸️"
                }
            } else {
                currentAlert?.audioUrl?.let { url ->
                    if (url.isNotEmpty()) startAudioPlayback(url)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun startAudioProgressTracker() {
        audioProgressRunnable = object : Runnable {
            override fun run() {
                try {
                    val mp = mediaPlayer
                    val timeView = audioTimeView
                    if (mp != null && timeView != null && isAudioPlaying) {
                        val currentMs = mp.currentPosition
                        val durationMs = mp.duration
                        timeView.text = "${formatMs(currentMs)} / ${formatMs(durationMs)}"
                        mainHandler.postDelayed(this, 1000)
                    }
                } catch (ignored: Exception) {}
            }
        }
        audioProgressRunnable?.let { mainHandler.post(it) }
    }

    private fun formatMs(ms: Int): String {
        if (ms <= 0) return "00:00"
        val totalSecs = ms / 1000
        val mins = totalSecs / 60
        val secs = totalSecs % 60
        return String.format("%02d:%02d", mins, secs)
    }

    private fun launchContextualDeepLink(alert: FloatingAlertData) {
        try {
            val isAyah = alert.surahNumber > 0 || alert.category.contains("ayah") || alert.category.contains("quran_ayah")
            val isSalawat = alert.category.contains("salawat") || alert.category.contains("tasbeeh") || alert.category.contains("dhikr")
            val isWird = alert.category.contains("wird")
            val isParents = alert.category.contains("parents")

            val alertType = when {
                isAyah -> "ayah_daily"
                isWird -> "daily_wird"
                isParents -> "parents_birr"
                else -> "dhikr_salawat"
            }

            val deepLinkUri = Uri.parse("athar://royal-alert/$alertType?cat=${alert.category}&s=${alert.surahNumber}&a=${alert.ayahNumber}&ts=${System.currentTimeMillis()}")
            val intent = Intent(this, MainActivity::class.java).apply {
                action = Intent.ACTION_VIEW
                data = deepLinkUri
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("open_royal_alert", true)
                putExtra("alert_type", alertType)
                putExtra("category", alert.category)
                putExtra("surah_number", alert.surahNumber)
                putExtra("ayah_number", alert.ayahNumber)
                putExtra("open_tasbih", isSalawat)
                putExtra("open_wird", isWird)
                putExtra("open_parents_modal", isParents)
            }
            startActivity(intent)
            advanceQueue()
        } catch (e: Exception) {
            e.printStackTrace()
            advanceQueue()
        }
    }

    private fun removeCurrentWindowInternal() {
        try {
            countDownTimer?.cancel()
            countDownTimer = null

            audioWatchdogRunnable?.let { mainHandler.removeCallbacks(it) }
            audioWatchdogRunnable = null

            audioProgressRunnable?.let { mainHandler.removeCallbacks(it) }
            audioProgressRunnable = null

            try {
                mediaPlayer?.stop()
                mediaPlayer?.release()
            } catch (ignored: Exception) {}
            mediaPlayer = null
            isAudioPlaying = false

            val viewToRemove = floatingRootView
            floatingRootView = null

            if (viewToRemove != null) {
                try {
                    if (viewToRemove.isAttachedToWindow) {
                        windowManager?.removeViewImmediate(viewToRemove)
                    }
                } catch (e: Exception) {
                    try { windowManager?.removeView(viewToRemove) } catch (ignored: Exception) {}
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun dismissAllAndStop() {
        mainHandler.post {
            alertQueue.clear()
            removeCurrentWindowInternal()
            isOverlayVisible = false
            isCurrentlyDisplaying = false
            stopSelf()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        dismissAllAndStop()
        releaseWakeLock()
        activeServiceInstance = null
    }
}
