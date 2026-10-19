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
    private var audioTimeView: TextView? = null
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

                val shouldAutoPlay = (currentPlaybackMode == "notification_and_sound") && currentPlaySound && currentAudioUrl.isNotEmpty()
                if (shouldAutoPlay) {
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

    private fun renderSystemFloatingWindow() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            stopSelf()
            return
        }

        mainHandler.post {
            try {
                removeFloatingWindowInternal()

                val wm = windowManager ?: return@post

                val rootLayout = FrameLayout(this).apply {
                    layoutParams = FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.WRAP_CONTENT
                    )
                    setPadding(dp(12), dp(4), dp(12), dp(8))
                    layoutDirection = View.LAYOUT_DIRECTION_RTL
                }

                val cardLayout = LinearLayout(this).apply {
                    orientation = LinearLayout.VERTICAL
                    layoutDirection = View.LAYOUT_DIRECTION_RTL
                    setPadding(dp(16), dp(16), dp(16), dp(16))

                    val bgDrawable = GradientDrawable().apply {
                        shape = GradientDrawable.RECTANGLE
                        colors = intArrayOf(
                            Color.parseColor("#1C160E"),
                            Color.parseColor("#120E08"),
                            Color.parseColor("#0A0805")
                        )
                        orientation = GradientDrawable.Orientation.TOP_BOTTOM
                        cornerRadius = dp(22).toFloat()
                        setStroke(dp(1.8f), Color.parseColor("#E6C66E"))
                    }
                    background = bgDrawable
                    elevation = dp(32).toFloat()
                }

                val headerRow = LinearLayout(this).apply {
                    orientation = LinearLayout.HORIZONTAL
                    layoutDirection = View.LAYOUT_DIRECTION_RTL
                    gravity = Gravity.CENTER_VERTICAL
                }

                val badgeView = TextView(this).apply {
                    text = currentBadge
                    setTextColor(Color.parseColor("#FFF2C2"))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
                    typeface = Typeface.DEFAULT_BOLD
                    setPadding(dp(12), dp(5), dp(12), dp(5))

                    val badgeBg = GradientDrawable().apply {
                        shape = GradientDrawable.RECTANGLE
                        setColor(Color.parseColor("#2B2113"))
                        cornerRadius = dp(12).toFloat()
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
                    setPadding(dp(12), dp(5), dp(12), dp(5))

                    val closeBg = GradientDrawable().apply {
                        shape = GradientDrawable.RECTANGLE
                        setColor(Color.parseColor("#1A140D"))
                        cornerRadius = dp(12).toFloat()
                        setStroke(dp(1), Color.parseColor("#8E7233"))
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

                val titleView = TextView(this).apply {
                    text = currentTitle
                    setTextColor(Color.parseColor("#FFF9E6"))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
                    typeface = Typeface.DEFAULT_BOLD
                    val lp = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        topMargin = dp(10)
                    }
                    layoutParams = lp
                }
                cardLayout.addView(titleView)

                if (currentBody.isNotEmpty()) {
                    val bodyBox = LinearLayout(this).apply {
                        orientation = LinearLayout.VERTICAL
                        layoutDirection = View.LAYOUT_DIRECTION_RTL
                        setPadding(dp(14), dp(12), dp(14), dp(12))
                        val lp = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            LinearLayout.LayoutParams.WRAP_CONTENT
                        ).apply {
                            topMargin = dp(8)
                        }
                        layoutParams = lp

                        val boxBg = GradientDrawable().apply {
                            shape = GradientDrawable.RECTANGLE
                            setColor(Color.parseColor("#16120B"))
                            cornerRadius = dp(14).toFloat()
                            setStroke(dp(1), Color.parseColor("#3D3018"))
                        }
                        background = boxBg
                    }

                    val bodyView = TextView(this).apply {
                        text = currentBody
                        setTextColor(Color.parseColor("#F5EEDB"))
                        setTextSize(TypedValue.COMPLEX_UNIT_SP, 13.5f)
                        maxLines = 5
                        setLineSpacing(dp(3).toFloat(), 1.35f)
                    }
                    bodyBox.addView(bodyView)
                    cardLayout.addView(bodyBox)
                }

                val shouldShowAudioBar = currentPlaybackMode != "notification_only" && currentAudioUrl.isNotEmpty()
                if (shouldShowAudioBar) {
                    val audioBar = LinearLayout(this).apply {
                        orientation = LinearLayout.HORIZONTAL
                        layoutDirection = View.LAYOUT_DIRECTION_RTL
                        gravity = Gravity.CENTER_VERTICAL
                        setPadding(dp(12), dp(8), dp(12), dp(8))
                        val lp = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            LinearLayout.LayoutParams.WRAP_CONTENT
                        ).apply {
                            topMargin = dp(10)
                        }
                        layoutParams = lp

                        val audioBg = GradientDrawable().apply {
                            shape = GradientDrawable.RECTANGLE
                            setColor(Color.parseColor("#21180D"))
                            cornerRadius = dp(14).toFloat()
                            setStroke(dp(1), Color.parseColor("#D4AF37"))
                        }
                        background = audioBg
                    }

                    val audioBtn = TextView(this).apply {
                        text = if (isAudioPlaying) "⏸️" else "▶️"
                        setTextColor(Color.parseColor("#0A0805"))
                        setTextSize(TypedValue.COMPLEX_UNIT_SP, 13.5f)
                        typeface = Typeface.DEFAULT_BOLD
                        gravity = Gravity.CENTER
                        val btnLp = LinearLayout.LayoutParams(dp(36), dp(36))
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
                            setMargins(dp(10), 0, dp(10), 0)
                        }
                        layoutParams = colLp
                    }

                    val audioLabelText = when {
                        currentCategory.contains("ayah") || currentSurahNumber > 0 -> "تلاوة صوتية مباركة 🎧"
                        currentCategory.contains("salawat") || currentCategory.contains("tasbeeh") -> "استماع للذكر والصلاة على النبي ﷺ 🎧"
                        currentCategory.contains("wird") -> "تلاوة الورد القرآني 🎧"
                        currentCategory.contains("parents") -> "دعاء بر الوالدين والإحسان 🎧"
                        else -> "تلاوة صوتية مباركة 🎧"
                    }

                    val audioLabel = TextView(this).apply {
                        text = audioLabelText
                        setTextColor(Color.parseColor("#FFF2C2"))
                        setTextSize(TypedValue.COMPLEX_UNIT_SP, 11.5f)
                        typeface = Typeface.DEFAULT_BOLD
                    }
                    textColumn.addView(audioLabel)

                    val audioTimer = TextView(this).apply {
                        text = "00:00 / --:--"
                        setTextColor(Color.parseColor("#D4AF37"))
                        setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
                    }
                    audioTimeView = audioTimer
                    textColumn.addView(audioTimer)
                    audioBar.addView(textColumn)

                    cardLayout.addView(audioBar)
                }

                if (currentAutoDismissSecs > 0) {
                    val progressBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
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

                val isAyahType = currentSurahNumber > 0 || currentCategory.contains("ayah") || currentCategory.contains("quran")

                if (isAyahType) {
                    val actionsRow = LinearLayout(this).apply {
                        orientation = LinearLayout.HORIZONTAL
                        layoutDirection = View.LAYOUT_DIRECTION_RTL
                        val rowLp = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            LinearLayout.LayoutParams.WRAP_CONTENT
                        ).apply {
                            topMargin = dp(12)
                        }
                        layoutParams = rowLp
                    }

                    val primaryAyahBtn = TextView(this).apply {
                        text = if (currentActionText.isNotEmpty()) currentActionText else "فتح الآية في المصحف 📖"
                        setTextColor(Color.parseColor("#080705"))
                        setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
                        typeface = Typeface.DEFAULT_BOLD
                        gravity = Gravity.CENTER
                        setPadding(dp(12), dp(10), dp(12), dp(10))

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
                        val btnLp = LinearLayout.LayoutParams(
                            0,
                            dp(46),
                            1.4f
                        )
                        layoutParams = btnLp
                        setOnClickListener {
                            launchAppDeepLink(false)
                        }
                    }
                    actionsRow.addView(primaryAyahBtn)

                    val secondaryTasbihBtn = TextView(this).apply {
                        text = "المسبحة 📿"
                        setTextColor(Color.parseColor("#E6C66E"))
                        setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
                        typeface = Typeface.DEFAULT_BOLD
                        gravity = Gravity.CENTER
                        setPadding(dp(8), dp(10), dp(8), dp(10))

                        val tasbihBg = GradientDrawable().apply {
                            shape = GradientDrawable.RECTANGLE
                            setColor(Color.parseColor("#1D160C"))
                            cornerRadius = dp(14).toFloat()
                            setStroke(dp(1), Color.parseColor("#8E7233"))
                        }
                        background = tasbihBg
                        isClickable = true
                        isFocusable = true
                        val btnLp = LinearLayout.LayoutParams(
                            0,
                            dp(46),
                            0.8f
                        ).apply {
                            setMargins(dp(8), 0, 0, 0)
                        }
                        layoutParams = btnLp
                        setOnClickListener {
                            launchAppDeepLink(true)
                        }
                    }
                    actionsRow.addView(secondaryTasbihBtn)
                    cardLayout.addView(actionsRow)
                } else {
                    val openButton = TextView(this).apply {
                        text = if (currentActionText.isNotEmpty()) currentActionText else "فتح في التطبيق 📖"
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
                            topMargin = dp(12)
                        }
                        layoutParams = lp
                        setOnClickListener {
                            launchAppDeepLink(false)
                        }
                    }
                    cardLayout.addView(openButton)
                }

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
                    y = dp(32)
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
                val progressVal = ((millisUntilFinished.toFloat() / totalMs) * (totalSeconds * 10)).toInt()
                progressBar.progress = progressVal
            }

            override fun onFinish() {
                dismissOverlay(this@AtharFloatingWindowService)
            }
        }.start()
    }

    private fun startAudioPlayback(url: String) {
        try {
            mediaPlayer?.release()
            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .build()
                )
                setDataSource(url)
                prepareAsync()
                setOnPreparedListener { mp ->
                    mp.start()
                    isAudioPlaying = true
                    audioToggleButton?.text = "⏸️"
                    startAudioProgressTracker()
                }
                setOnCompletionListener {
                    isAudioPlaying = false
                    audioToggleButton?.text = "▶️"
                }
                setOnErrorListener { _, _, _ ->
                    isAudioPlaying = false
                    audioToggleButton?.text = "▶️"
                    true
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
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
            } else if (currentAudioUrl.isNotEmpty()) {
                startAudioPlayback(currentAudioUrl)
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

    private fun launchAppDeepLink(openTasbih: Boolean) {
        try {
            val alertType = when {
                currentSurahNumber > 0 -> "ayah_daily"
                currentCategory.contains("wird") -> "daily_wird"
                currentCategory.contains("parents") -> "parents_birr"
                else -> "dhikr_salawat"
            }

            val deepLinkUri = Uri.parse("athar://royal-alert/$alertType?cat=$currentCategory&s=$currentSurahNumber&a=$currentAyahNumber&ts=${System.currentTimeMillis()}")
            val intent = Intent(this, MainActivity::class.java).apply {
                action = Intent.ACTION_VIEW
                data = deepLinkUri
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("open_royal_alert", true)
                putExtra("alert_type", alertType)
                putExtra("category", currentCategory)
                putExtra("surah_number", currentSurahNumber)
                putExtra("ayah_number", currentAyahNumber)
                putExtra("open_tasbih", openTasbih)
            }
            startActivity(intent)
            dismissOverlay(this)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun removeFloatingWindow() {
        mainHandler.post {
            removeFloatingWindowInternal()
        }
    }

    private fun removeFloatingWindowInternal() {
        try {
            countDownTimer?.cancel()
            countDownTimer = null

            mediaPlayer?.stop()
            mediaPlayer?.release()
            mediaPlayer = null

            audioProgressRunnable?.let { mainHandler.removeCallbacks(it) }
            audioProgressRunnable = null

            if (floatingRootView != null) {
                windowManager?.removeView(floatingRootView)
                floatingRootView = null
            }
            isOverlayVisible = false
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        removeFloatingWindowInternal()
        releaseWakeLock()
        activeServiceInstance = null
    }
}
