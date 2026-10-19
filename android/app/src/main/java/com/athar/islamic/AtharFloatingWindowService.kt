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
import android.net.Uri
import android.os.Build
import android.os.CountDownTimer
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.text.TextUtils
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.core.app.NotificationCompat

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

/**
 * AtharFloatingWindowService
 *
 * Strict Singleton Floating Overlay Window for Athar notifications and reminders.
 *
 * Architecture & Guarantees:
 * 1. Strict Singleton Overlay: Only ONE floating overlay can exist on screen at any time.
 * 2. In-Place View Updates: If a window is already visible, incoming alerts update the existing
 *    attached view in-place without calling windowManager.addView, preventing stacking completely.
 * 3. Media3 ExoPlayer Engine: 100% powered by FastAudioPlayer; no MediaPlayer leaks or collisions.
 * 4. Zero-Hanging Progress Sync: Progress bar is tied directly to ExoPlayer STATE_ENDED for instant
 *    auto-dismissal the moment audio completes.
 * 5. Full lifecycle cleanup: All handlers, timers, and wake locks are safely cancelled on dismissal.
 */
class AtharFloatingWindowService : Service() {

    companion object {
        private const val TAG = "AtharFloatingWindow"
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
                Log.e(TAG, "Failed to start AtharFloatingWindowService: ${e.message}", e)
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
                    Log.e(TAG, "Failed to send dismiss intent: ${e.message}", e)
                }
            }
        }
    }

    private var windowManager: WindowManager? = null
    private var floatingRootView: View? = null
    private var countDownTimer: CountDownTimer? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    // Active Card View References for direct In-Place Updates
    private var badgeView: TextView? = null
    private var titleView: TextView? = null
    private var bodyView: TextView? = null
    private var bodyBox: LinearLayout? = null
    private var audioBar: LinearLayout? = null
    private var audioToggleButton: TextView? = null
    private var audioTimeView: TextView? = null
    private var progressBar: ProgressBar? = null
    private var singleActionButton: TextView? = null

    private var currentAlert: FloatingAlertData? = null

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
                    playSound = intent.getBooleanExtra(EXTRA_PLAY_SOUND, true),
                    surahNumber = intent.getIntExtra(EXTRA_SURAH_NUMBER, 0),
                    ayahNumber = intent.getIntExtra(EXTRA_AYAH_NUMBER, 1),
                    actionText = intent.getStringExtra(EXTRA_ACTION_TEXT) ?: "فتح في التطبيق 📖",
                    autoDismissSeconds = if (autoSecs > 0) autoSecs else 15,
                    playbackMode = intent.getStringExtra(EXTRA_PLAYBACK_MODE) ?: "notification_and_sound"
                )

                startForegroundServiceNotification(alertItem.badge, alertItem.title)
                handleIncomingAlert(alertItem)

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
     * Core Strict Singleton Dispatcher:
     * - If window is already attached, update existing views in-place (0ms latency, zero stacking).
     * - If window is not attached, safely build and attach ONE instance.
     */
    private fun handleIncomingAlert(alert: FloatingAlertData) {
        mainHandler.post {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
                Log.w(TAG, "Cannot draw overlays - permission not granted")
                stopSelf()
                return@post
            }

            currentAlert = alert

            val existingView = floatingRootView
            if (existingView != null && existingView.isAttachedToWindow) {
                // UPDATE IN-PLACE: Zero WindowManager calls, zero flicker, 100% single instance!
                updateCardViewsInPlace(alert)
                handleAudioAndAutoDismiss(alert)
            } else {
                // Clean any dangling view reference before creating a new one
                cleanDanglingViews()
                createNewCardUI(alert)
                handleAudioAndAutoDismiss(alert)
            }
        }
    }

    /**
     * Updates all child views of the currently displayed floating window with new alert data.
     */
    private fun updateCardViewsInPlace(alert: FloatingAlertData) {
        try {
            // Cancel previous countdown timer
            countDownTimer?.cancel()
            countDownTimer = null

            // 1. Badge & Title
            badgeView?.text = alert.badge
            titleView?.text = alert.title

            // 2. Body Text
            if (alert.body.isNotEmpty()) {
                bodyView?.text = alert.body
                bodyBox?.visibility = View.VISIBLE
            } else {
                bodyBox?.visibility = View.GONE
            }

            // 3. Audio Bar Visibility
            val hasAudio = alert.audioUrl.isNotEmpty() && alert.playSound && (alert.playbackMode == "notification_and_sound")
            audioBar?.visibility = if (hasAudio) View.VISIBLE else View.GONE
            audioToggleButton?.text = "▶️"
            audioTimeView?.text = "00:00 / --:--"

            // 4. Single Action Button
            val actionTitle = computeActionTitle(alert)
            singleActionButton?.text = actionTitle
            singleActionButton?.setOnClickListener {
                launchContextualDeepLink(alert)
            }

            // 5. Reset Progress Bar
            val autoSecs = if (alert.autoDismissSeconds > 0) alert.autoDismissSeconds else 15
            progressBar?.max = autoSecs * 10
            progressBar?.progress = autoSecs * 10
        } catch (e: Exception) {
            Log.e(TAG, "Error updating card views in-place: ${e.message}", e)
        }
    }

    /**
     * Builds the unified luxury Black & Gold card layout matching Athar design system.
     */
    private fun createNewCardUI(alert: FloatingAlertData) {
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

            val badgeTxt = TextView(this).apply {
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
            badgeView = badgeTxt
            headerRow.addView(badgeTxt)

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
                    dismissAllAndStop()
                }
            }
            headerRow.addView(closeButton)
            cardLayout.addView(headerRow)

            // Title View
            val titleTxt = TextView(this).apply {
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
            titleView = titleTxt
            cardLayout.addView(titleTxt)

            // Content Body Box
            val bodyContainer = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                layoutDirection = View.LAYOUT_DIRECTION_RTL
                setPadding(dp(12), dp(10), dp(12), dp(10))

                val bodyBg = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    setColor(Color.parseColor("#141009"))
                    cornerRadius = dp(14).toFloat()
                    setStroke(dp(1), Color.parseColor("#5A451E"))
                }
                background = bodyBg
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = dp(9)
                }
                layoutParams = lp
                visibility = if (alert.body.isNotEmpty()) View.VISIBLE else View.GONE
            }
            bodyBox = bodyContainer

            val bodyTxt = TextView(this).apply {
                text = alert.body
                setTextColor(Color.parseColor("#F5ECD7"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 13.5f)
                setLineSpacing(dp(3).toFloat(), 1.0f)
                maxLines = 4
                ellipsize = TextUtils.TruncateAt.END
            }
            bodyView = bodyTxt
            bodyContainer.addView(bodyTxt)
            cardLayout.addView(bodyContainer)

            // Audio Player Bar
            val hasAudio = alert.audioUrl.isNotEmpty() && alert.playSound && (alert.playbackMode == "notification_and_sound")
            val audioContainer = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                layoutDirection = View.LAYOUT_DIRECTION_RTL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(dp(12), dp(8), dp(12), dp(8))

                val audioBg = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    setColor(Color.parseColor("#16120B"))
                    cornerRadius = dp(12).toFloat()
                    setStroke(dp(1), Color.parseColor("#8E7233"))
                }
                background = audioBg
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = dp(9)
                }
                layoutParams = lp
                visibility = if (hasAudio) View.VISIBLE else View.GONE
            }
            audioBar = audioContainer

            val audioBtn = TextView(this).apply {
                text = "▶️"
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
                setPadding(dp(8), dp(4), dp(8), dp(4))
                isClickable = true
                isFocusable = true
                setOnClickListener {
                    val isPlaying = FastAudioPlayer.togglePlayPause()
                    text = if (isPlaying) "⏸️" else "▶️"
                }
            }
            audioToggleButton = audioBtn
            audioContainer.addView(audioBtn)

            val textColumn = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                layoutDirection = View.LAYOUT_DIRECTION_RTL
                val lp = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f).apply {
                    marginEnd = dp(8)
                }
                layoutParams = lp
            }

            val audioLabel = TextView(this).apply {
                text = "تلاوة / تنبيه صوتي"
                setTextColor(Color.parseColor("#FFF2C2"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 11.5f)
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
            audioContainer.addView(textColumn)

            cardLayout.addView(audioContainer)

            // Progress Bar (Synchronized with Audio or Auto-Dismiss Countdown)
            val autoSecs = if (alert.autoDismissSeconds > 0) alert.autoDismissSeconds else 15
            val progBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
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
            progressBar = progBar
            cardLayout.addView(progBar)

            // Primary Action Button
            val actionButton = TextView(this).apply {
                text = computeActionTitle(alert)
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
            singleActionButton = actionButton
            cardLayout.addView(actionButton)

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
            Log.e(TAG, "Failed to create card UI: ${e.message}", e)
            dismissAllAndStop()
        }
    }

    private fun computeActionTitle(alert: FloatingAlertData): String {
        val isAyah = alert.surahNumber > 0 || alert.category.contains("ayah") || alert.category.contains("quran_ayah")
        val isSalawat = alert.category.contains("salawat") || alert.category.contains("tasbeeh") || alert.category.contains("dhikr")
        val isWird = alert.category.contains("wird")
        val isParents = alert.category.contains("parents")

        return when {
            isAyah -> if (alert.actionText.isNotEmpty() && !alert.actionText.contains("المسبحة")) alert.actionText else "فتح الآية في المصحف 📖"
            isSalawat -> "فتح المسبحة والأذكار 📿"
            isWird -> "متابعة الورد في المصحف 📖"
            isParents -> "دعاء وبر الوالدين 🤲"
            else -> if (alert.actionText.isNotEmpty()) alert.actionText else "فتح في التطبيق 📖"
        }
    }

    private fun ProgressBar.progressDrawable(bg: GradientDrawable, fg: GradientDrawable) {
        val layers = arrayOf(bg, fg)
        val layerDrawable = LayerDrawable(layers)
        layerDrawable.setId(0, android.R.id.background)
        layerDrawable.setId(1, android.R.id.progress)
        this.progressDrawable = layerDrawable
    }

    /**
     * Handles FastAudioPlayer playback and ties progress bar to STATE_ENDED for instant auto-dismiss.
     */
    private fun handleAudioAndAutoDismiss(alert: FloatingAlertData) {
        val shouldPlayAudio = alert.playSound &&
                alert.audioUrl.isNotEmpty() &&
                (alert.playbackMode == "notification_and_sound")

        if (shouldPlayAudio) {
            audioToggleButton?.text = "⏸️"
            audioBar?.visibility = View.VISIBLE

            FastAudioPlayer.play(this, alert.audioUrl, object : FastAudioPlayer.AudioListener {
                override fun onReady(durationMs: Long) {
                    mainHandler.post {
                        if (durationMs > 0) {
                            progressBar?.max = durationMs.toInt()
                            progressBar?.progress = durationMs.toInt()
                            audioTimeView?.text = "00:00 / ${formatMs(durationMs)}"
                        }
                    }
                }

                override fun onProgress(currentMs: Long, durationMs: Long) {
                    mainHandler.post {
                        audioTimeView?.text = "${formatMs(currentMs)} / ${formatMs(durationMs)}"
                        if (durationMs > 0) {
                            val remaining = (durationMs - currentMs).coerceAtLeast(0L)
                            progressBar?.max = durationMs.toInt()
                            progressBar?.progress = remaining.toInt()
                        }
                    }
                }

                override fun onEnded() {
                    mainHandler.post {
                        // Instant auto-dismiss on STATE_ENDED as confirmed by user!
                        Log.i(TAG, "Audio completed (STATE_ENDED) -> Auto dismissing floating overlay")
                        progressBar?.progress = 0
                        dismissAllAndStop()
                    }
                }

                override fun onError(error: String) {
                    mainHandler.post {
                        Log.w(TAG, "Audio error ($error) -> Falling back to auto-dismiss countdown")
                        audioToggleButton?.text = "▶️"
                        startFallbackCountdown(alert.autoDismissSeconds)
                    }
                }
            })
        } else {
            // Sound disabled or silent mode: Run fallback countdown timer
            FastAudioPlayer.stop()
            audioBar?.visibility = View.GONE
            startFallbackCountdown(alert.autoDismissSeconds)
        }
    }

    private fun startFallbackCountdown(totalSeconds: Int) {
        countDownTimer?.cancel()
        val secs = if (totalSeconds > 0) totalSeconds else 15
        val totalMs = (secs * 1000).toLong()

        progressBar?.max = secs * 10
        progressBar?.progress = secs * 10

        countDownTimer = object : CountDownTimer(totalMs, 100) {
            override fun onTick(millisUntilFinished: Long) {
                val progressVal = ((millisUntilFinished.toFloat() / totalMs) * (secs * 10)).toInt()
                progressBar?.progress = progressVal
            }

            override fun onFinish() {
                dismissAllAndStop()
            }
        }.start()
    }

    private fun formatMs(ms: Long): String {
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
            dismissAllAndStop()
        } catch (e: Exception) {
            Log.e(TAG, "Error launching deep link: ${e.message}", e)
            dismissAllAndStop()
        }
    }

    /**
     * Safely cleans any dangling view from the WindowManager before new attachment.
     */
    private fun cleanDanglingViews() {
        val view = floatingRootView ?: return
        floatingRootView = null
        try {
            if (view.isAttachedToWindow) {
                windowManager?.removeViewImmediate(view)
            } else {
                windowManager?.removeView(view)
            }
        } catch (ignored: Exception) {}
    }

    /**
     * Complete and safe dismissal: Releases FastAudioPlayer, cancels timers, removes overlay view, and stops service.
     */
    fun dismissAllAndStop() {
        mainHandler.post {
            try {
                countDownTimer?.cancel()
                countDownTimer = null

                FastAudioPlayer.stop()

                val view = floatingRootView
                floatingRootView = null

                badgeView = null
                titleView = null
                bodyView = null
                bodyBox = null
                audioBar = null
                audioToggleButton = null
                audioTimeView = null
                progressBar = null
                singleActionButton = null

                if (view != null) {
                    try {
                        if (view.isAttachedToWindow) {
                            windowManager?.removeViewImmediate(view)
                        } else {
                            windowManager?.removeView(view)
                        }
                    } catch (ignored: Exception) {}
                }

                isOverlayVisible = false
                currentAlert = null
                stopForeground(true)
                stopSelf()
            } catch (e: Exception) {
                Log.e(TAG, "Error during dismissAllAndStop: ${e.message}", e)
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        dismissAllAndStop()
        FastAudioPlayer.release()
        releaseWakeLock()
        activeServiceInstance = null
    }
}
