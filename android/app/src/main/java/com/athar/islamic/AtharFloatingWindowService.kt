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

/**
 * AtharFloatingWindowService
 *
 * Strict Singleton Floating Overlay Window & Non-Interrupting Sequential Queue System.
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
        var isQueueFrozen: Boolean = false
            private set

        @Volatile
        private var activeServiceInstance: AtharFloatingWindowService? = null

        fun freezeQueueAndDismiss(context: Context) {
            isQueueFrozen = true
            try {
                val instance = activeServiceInstance
                if (instance != null) {
                    instance.dismissViewsWithoutAudioStop()
                } else {
                    dismissOverlay(context)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error dismissing overlay for freeze: ${e.message}")
            }
        }

        fun unfreezeQueue() {
            isQueueFrozen = false
            Log.i(TAG, "AtharFloatingWindowService queue unfrozen.")
        }

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
            if (isQueueFrozen) {
                Log.i(TAG, "Queue is frozen during full-screen Azan; dropping or postponing alert: $title")
                return
            }

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

    private val alertQueue = ArrayDeque<FloatingAlertData>()

    private var badgeView: TextView? = null
    private var queueIndicatorView: TextView? = null
    private var muteToggleButton: TextView? = null
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
                alertQueue.clear()
                dismissAllAndStop()
                return START_NOT_STICKY
            }
            ACTION_SHOW -> {
                if (isQueueFrozen) {
                    return START_NOT_STICKY
                }
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
                    acquire(30 * 1000L)
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
            .addAction(R.drawable.ic_stat_athar, "إغلاق الكل", dismissPendingIntent)
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

    private fun handleSoundOnlyPlayback(alert: FloatingAlertData) {
        if (alert.audioUrl.isEmpty()) {
            stopSelf()
            return
        }
        acquireWakeLock()
        FastAudioPlayer.play(this, alert.audioUrl, object : FastAudioPlayer.AudioListener {
            override fun onReady(durationMs: Long) {}
            override fun onProgress(currentMs: Long, durationMs: Long) {}
            override fun onEnded() {
                mainHandler.post {
                    advanceToNextAlertOrDismiss()
                }
            }
            override fun onError(error: String) {
                mainHandler.post {
                    advanceToNextAlertOrDismiss()
                }
            }
        })
    }

    private fun handleIncomingAlert(alert: FloatingAlertData) {
        mainHandler.post {
            if (alert.playbackMode == "sound_only") {
                handleSoundOnlyPlayback(alert)
                return@post
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
                stopSelf()
                return@post
            }

            val existingView = floatingRootView
            val isCurrentlyDisplaying = (existingView != null && existingView.isAttachedToWindow && currentAlert != null)

            if (isCurrentlyDisplaying) {
                val isDuplicate = (currentAlert?.title == alert.title && currentAlert?.body == alert.body) ||
                        alertQueue.any { it.title == alert.title && it.body == alert.body }

                if (!isDuplicate && alertQueue.size < 30) {
                    alertQueue.offer(alert)
                    updateQueueIndicator()
                }
            } else {
                cleanDanglingViews()
                currentAlert = alert
                createNewCardUI(alert)
                updateQueueIndicator()
                handleAudioAndAutoDismiss(alert)
            }
        }
    }

    private fun updateQueueIndicator() {
        val count = alertQueue.size
        if (count > 0) {
            queueIndicatorView?.text = "⌛ +$count بالانتظار"
            queueIndicatorView?.visibility = View.VISIBLE
        } else {
            queueIndicatorView?.visibility = View.GONE
        }
    }

    private fun advanceToNextAlertOrDismiss() {
        mainHandler.post {
            if (alertQueue.isNotEmpty()) {
                val nextAlert = alertQueue.poll()
                if (nextAlert != null) {
                    currentAlert = nextAlert
                    updateCardViewsInPlace(nextAlert)
                    updateQueueIndicator()
                    handleAudioAndAutoDismiss(nextAlert)
                    return@post
                }
            }
            dismissAllAndStop()
        }
    }

    private fun onUserDismissCurrentAlert() {
        mainHandler.post {
            FastAudioPlayer.stop()
            countDownTimer?.cancel()
            countDownTimer = null
            advanceToNextAlertOrDismiss()
        }
    }

    private fun updateCardViewsInPlace(alert: FloatingAlertData) {
        try {
            countDownTimer?.cancel()
            countDownTimer = null

            badgeView?.text = alert.badge
            titleView?.text = alert.title

            if (alert.body.isNotEmpty()) {
                bodyView?.text = alert.body
                bodyBox?.visibility = View.VISIBLE
            } else {
                bodyBox?.visibility = View.GONE
            }

            val hasAudio = alert.audioUrl.isNotEmpty() && alert.playbackMode != "notification_only" && alert.playSound
            audioBar?.visibility = if (hasAudio) View.VISIBLE else View.GONE
            muteToggleButton?.visibility = if (hasAudio) View.VISIBLE else View.GONE
            muteToggleButton?.text = if (FastAudioPlayer.isMuted()) "🔇 كتم" else "🔊 صوت"

            if (alert.playbackMode == "notification_with_play_action") {
                audioToggleButton?.text = "▶️ استماع للتلاوة"
                audioTimeView?.text = "اضغط للاستماع"
                audioToggleButton?.setOnClickListener {
                    audioToggleButton?.text = "⏸️"
                    playAudioWithExo(alert)
                }
            } else {
                audioToggleButton?.text = "▶️"
                audioTimeView?.text = "00:00 / --:--"
                audioToggleButton?.setOnClickListener {
                    FastAudioPlayer.togglePlayPause()
                    audioToggleButton?.text = if (FastAudioPlayer.isPlaying()) "⏸️" else "▶️"
                }
            }

            val actionTitle = computeActionTitle(alert)
            singleActionButton?.text = actionTitle
            singleActionButton?.setOnClickListener {
                launchContextualAction("primary", alert)
            }

            val autoSecs = if (alert.autoDismissSeconds > 0) alert.autoDismissSeconds else 5
            progressBar?.max = autoSecs * 10
            progressBar?.progress = autoSecs * 10
        } catch (e: Exception) {
            Log.e(TAG, "Error updating card views in-place: ${e.message}", e)
        }
    }

    private fun createNewCardUI(alert: FloatingAlertData) {
        val wm = windowManager ?: return

        try {
            val rootLayout = FrameLayout(this).apply {
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT
                )
                setPadding(dp(12), dp(4), dp(12), dp(6))
                layoutDirection = View.LAYOUT_DIRECTION_RTL
            }

            val cardLayout = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                layoutDirection = View.LAYOUT_DIRECTION_RTL
                setPadding(dp(16), dp(16), dp(16), dp(16))

                val bgDrawable = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    colors = intArrayOf(
                        Color.parseColor("#15110A"),
                        Color.parseColor("#0D0A06"),
                        Color.parseColor("#060503")
                    )
                    orientation = GradientDrawable.Orientation.TOP_BOTTOM
                    cornerRadius = dp(24).toFloat()
                    setStroke(dp(2f), Color.parseColor("#D4AF37"))
                }
                background = bgDrawable
                elevation = dp(36).toFloat()
            }

            val headerRow = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                layoutDirection = View.LAYOUT_DIRECTION_RTL
                gravity = Gravity.CENTER_VERTICAL
            }

            val badgeTxt = TextView(this).apply {
                text = alert.badge
                setTextColor(Color.parseColor("#FFF4D0"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
                typeface = Typeface.DEFAULT_BOLD
                setPadding(dp(12), dp(5), dp(12), dp(5))

                val badgeBg = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    colors = intArrayOf(
                        Color.parseColor("#322512"),
                        Color.parseColor("#20180B")
                    )
                    orientation = GradientDrawable.Orientation.RIGHT_LEFT
                    cornerRadius = dp(11).toFloat()
                    setStroke(dp(1.2f), Color.parseColor("#D4AF37"))
                }
                background = badgeBg
            }
            badgeView = badgeTxt
            headerRow.addView(badgeTxt)

            val queuePill = TextView(this).apply {
                text = ""
                setTextColor(Color.parseColor("#E6C66E"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
                typeface = Typeface.DEFAULT_BOLD
                setPadding(dp(8), dp(4), dp(8), dp(4))

                val qBg = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    setColor(Color.parseColor("#2D2211"))
                    cornerRadius = dp(8).toFloat()
                    setStroke(dp(1), Color.parseColor("#E6C66E"))
                }
                background = qBg

                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    marginEnd = dp(6)
                }
                layoutParams = lp
                visibility = View.GONE
            }
            queueIndicatorView = queuePill
            headerRow.addView(queuePill)

            val spacer = View(this).apply {
                layoutParams = LinearLayout.LayoutParams(0, 1, 1.0f)
            }
            headerRow.addView(spacer)

            val muteBtn = TextView(this).apply {
                text = if (FastAudioPlayer.isMuted()) "🔇 كتم" else "🔊 صوت"
                setTextColor(Color.parseColor("#E6C66E"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 11.5f)
                typeface = Typeface.DEFAULT_BOLD
                setPadding(dp(10), dp(5), dp(10), dp(5))

                val mBg = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    setColor(Color.parseColor("#1C150B"))
                    cornerRadius = dp(10).toFloat()
                    setStroke(dp(1), Color.parseColor("#8E7233"))
                }
                background = mBg
                isClickable = true
                isFocusable = true
                setOnClickListener {
                    val isMuted = FastAudioPlayer.toggleMute()
                    text = if (isMuted) "🔇 كتم" else "🔊 صوت"
                }

                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    marginEnd = dp(6)
                }
                layoutParams = lp
                visibility = if (alert.playSound && alert.audioUrl.isNotEmpty() && alert.playbackMode != "notification_only") View.VISIBLE else View.GONE
            }
            muteToggleButton = muteBtn
            headerRow.addView(muteBtn)

            val closeButton = TextView(this).apply {
                text = "✕ إغلاق"
                setTextColor(Color.parseColor("#E6C66E"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
                typeface = Typeface.DEFAULT_BOLD
                setPadding(dp(12), dp(5), dp(12), dp(5))

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
                    onUserDismissCurrentAlert()
                }
            }
            headerRow.addView(closeButton)
            cardLayout.addView(headerRow)

            val titleTxt = TextView(this).apply {
                text = alert.title
                setTextColor(Color.parseColor("#FFFBF0"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 15.5f)
                typeface = Typeface.DEFAULT_BOLD
                maxLines = 1
                ellipsize = TextUtils.TruncateAt.END
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = dp(12)
                }
                layoutParams = lp
            }
            titleView = titleTxt
            cardLayout.addView(titleTxt)

            val bodyContainer = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                layoutDirection = View.LAYOUT_DIRECTION_RTL
                setPadding(dp(14), dp(12), dp(14), dp(12))

                val bodyBg = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    colors = intArrayOf(
                        Color.parseColor("#17120A"),
                        Color.parseColor("#0F0C07")
                    )
                    orientation = GradientDrawable.Orientation.TOP_BOTTOM
                    cornerRadius = dp(15).toFloat()
                    setStroke(dp(1.2f), Color.parseColor("#5A441F"))
                }
                background = bodyBg

                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = dp(10)
                }
                layoutParams = lp
                visibility = if (alert.body.isNotEmpty()) View.VISIBLE else View.GONE
            }
            bodyBox = bodyContainer

            val bodyTxt = TextView(this).apply {
                text = alert.body
                setTextColor(Color.parseColor("#F9F1DF"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
                setLineSpacing(dp(4f).toFloat(), 1.0f)
                maxLines = 5
                ellipsize = TextUtils.TruncateAt.END
            }
            bodyView = bodyTxt
            bodyContainer.addView(bodyTxt)
            cardLayout.addView(bodyContainer)

            val audioLayout = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                layoutDirection = View.LAYOUT_DIRECTION_RTL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(dp(12), dp(8), dp(12), dp(8))

                val audioBg = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    colors = intArrayOf(
                        Color.parseColor("#221A0F"),
                        Color.parseColor("#140F08")
                    )
                    orientation = GradientDrawable.Orientation.RIGHT_LEFT
                    cornerRadius = dp(13).toFloat()
                    setStroke(dp(1.2f), Color.parseColor("#C8A24A"))
                }
                background = audioBg

                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = dp(10)
                }
                layoutParams = lp
            }
            audioBar = audioLayout

            val toggleBtn = TextView(this).apply {
                text = if (alert.playbackMode == "notification_with_play_action") "▶️ استماع للتلاوة" else "▶️"
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
                setTextColor(Color.parseColor("#FFF2C2"))
                typeface = Typeface.DEFAULT_BOLD
                setPadding(dp(6), dp(2), dp(8), dp(2))
                isClickable = true
                isFocusable = true
            }
            audioToggleButton = toggleBtn
            audioLayout.addView(toggleBtn)

            val audioLabel = TextView(this).apply {
                text = "تلاوة مباركة خاشعة"
                setTextColor(Color.parseColor("#FFF2C2"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
                typeface = Typeface.DEFAULT_BOLD
            }
            audioLayout.addView(audioLabel)

            val audioSpacer = View(this).apply {
                layoutParams = LinearLayout.LayoutParams(0, 1, 1.0f)
            }
            audioLayout.addView(audioSpacer)

            val timeTxt = TextView(this).apply {
                text = if (alert.playbackMode == "notification_with_play_action") "اضغط للاستماع" else "00:00 / --:--"
                setTextColor(Color.parseColor("#E6C66E"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
                typeface = Typeface.MONOSPACE
            }
            audioTimeView = timeTxt
            audioLayout.addView(timeTxt)
            cardLayout.addView(audioLayout)

            val progBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
                val autoSecs = if (alert.autoDismissSeconds > 0) alert.autoDismissSeconds else 15
                max = autoSecs * 10
                progress = autoSecs * 10
                isIndeterminate = false

                val bgGrad = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    setColor(Color.parseColor("#171209"))
                    cornerRadius = dp(6).toFloat()
                }
                val fgGrad = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    colors = intArrayOf(
                        Color.parseColor("#F5DE9C"),
                        Color.parseColor("#E6C66E"),
                        Color.parseColor("#C8A24A")
                    )
                    orientation = GradientDrawable.Orientation.RIGHT_LEFT
                    cornerRadius = dp(6).toFloat()
                }
                progressDrawable(bgGrad, fgGrad)

                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    dp(4)
                ).apply {
                    topMargin = dp(11)
                }
                layoutParams = lp
            }
            progressBar = progBar
            cardLayout.addView(progBar)

            val actionTitle = computeActionTitle(alert)
            val actionBtn = TextView(this).apply {
                text = actionTitle
                setTextColor(Color.parseColor("#080603"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
                typeface = Typeface.DEFAULT_BOLD
                gravity = Gravity.CENTER
                setPadding(dp(14), dp(12), dp(14), dp(12))

                val actionBg = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    colors = intArrayOf(
                        Color.parseColor("#F5DE9C"),
                        Color.parseColor("#E6C66E"),
                        Color.parseColor("#C8A24A"),
                        Color.parseColor("#9F7824")
                    )
                    orientation = GradientDrawable.Orientation.RIGHT_LEFT
                    cornerRadius = dp(15).toFloat()
                }
                background = actionBg
                isClickable = true
                isFocusable = true
                setOnClickListener {
                    launchContextualAction("primary", alert)
                }

                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = dp(12)
                }
                layoutParams = lp
            }
            singleActionButton = actionBtn
            cardLayout.addView(actionBtn)

            rootLayout.addView(cardLayout)

            val layoutFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE
            }

            val params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                layoutFlag,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
                y = dp(24)
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
            isAyah -> "📖 فتح الآية في المصحف"
            isSalawat -> "📿 فتح المسبحة والأذكار"
            isWird -> "📜 صفحة الورد القرآني والختمة"
            isParents -> "🤍 صفحة بر الوالدين وصلة الرحم"
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

    private fun handleAudioAndAutoDismiss(alert: FloatingAlertData) {
        val hasAudioUrl = alert.audioUrl.isNotEmpty()
        val isSoundMode = alert.playbackMode == "notification_and_sound" && alert.playSound && hasAudioUrl
        val isPlayActionMode = alert.playbackMode == "notification_with_play_action" && hasAudioUrl

        if (isSoundMode) {
            audioBar?.visibility = View.VISIBLE
            muteToggleButton?.visibility = View.VISIBLE
            audioToggleButton?.text = "⏸️"
            audioToggleButton?.setOnClickListener {
                FastAudioPlayer.togglePlayPause()
                audioToggleButton?.text = if (FastAudioPlayer.isPlaying()) "⏸️" else "▶️"
            }
            playAudioWithExo(alert)
        } else if (isPlayActionMode) {
            audioBar?.visibility = View.VISIBLE
            muteToggleButton?.visibility = View.VISIBLE
            audioToggleButton?.text = "▶️ تشغيل الصوت"
            audioTimeView?.text = "اضغط للاستماع"
            audioToggleButton?.setOnClickListener {
                audioToggleButton?.text = "⏸️"
                audioToggleButton?.setOnClickListener {
                    FastAudioPlayer.togglePlayPause()
                    audioToggleButton?.text = if (FastAudioPlayer.isPlaying()) "⏸️" else "▶️"
                }
                playAudioWithExo(alert)
            }
            startFallbackCountdown(5)
        } else {
            FastAudioPlayer.stop()
            audioBar?.visibility = View.GONE
            muteToggleButton?.visibility = View.GONE
            startFallbackCountdown(5)
        }
    }

    private fun playAudioWithExo(alert: FloatingAlertData) {
        countDownTimer?.cancel()
        countDownTimer = null

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
                    progressBar?.progress = 0
                    advanceToNextAlertOrDismiss()
                }
            }

            override fun onError(error: String) {
                mainHandler.post {
                    audioToggleButton?.text = "▶️"
                    startFallbackCountdown(5)
                }
            }
        })
    }

    private fun startFallbackCountdown(totalSeconds: Int) {
        countDownTimer?.cancel()
        val secs = if (totalSeconds > 0) totalSeconds else 5
        val totalMs = (secs * 1000).toLong()

        progressBar?.max = secs * 10
        progressBar?.progress = secs * 10

        countDownTimer = object : CountDownTimer(totalMs, 100) {
            override fun onTick(millisUntilFinished: Long) {
                val remainingTenths = (millisUntilFinished / 100).toInt()
                progressBar?.progress = remainingTenths
            }

            override fun onFinish() {
                progressBar?.progress = 0
                advanceToNextAlertOrDismiss()
            }
        }.start()
    }

    private fun formatMs(ms: Long): String {
        val totalSec = ms / 1000
        val m = totalSec / 60
        val s = totalSec % 60
        return String.format("%02d:%02d", m, s)
    }

    private fun launchContextualAction(actionType: String, alert: FloatingAlertData) {
        try {
            val intent = packageManager.getLaunchIntentForPackage(packageName) ?: Intent(Intent.ACTION_MAIN).apply {
                setPackage(packageName)
                addCategory(Intent.CATEGORY_LAUNCHER)
            }

            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)

            val effectiveType = when (actionType) {
                "parents" -> "parents"
                "wird" -> "wird"
                else -> {
                    when {
                        alert.surahNumber > 0 || alert.category.contains("ayah") -> "ayah"
                        alert.category.contains("parents") -> "parents"
                        alert.category.contains("wird") -> "wird"
                        alert.category.contains("salawat") || alert.category.contains("tasbeeh") || alert.category.contains("dhikr") -> "tasbih"
                        else -> "default"
                    }
                }
            }

            when (effectiveType) {
                "ayah" -> {
                    val sNum = if (alert.surahNumber > 0) alert.surahNumber else 1
                    val aNum = if (alert.ayahNumber > 0) alert.ayahNumber else 1
                    intent.putExtra("surah_number", sNum)
                    intent.putExtra("open_surah", sNum)
                    intent.putExtra("ayah_number", aNum)
                    intent.putExtra("open_ayah", aNum)
                    intent.putExtra("target_tab", "quran")
                    intent.putExtra("notification_category", "quran_ayah")
                }
                "wird" -> {
                    intent.putExtra("open_wird", true)
                    intent.putExtra("open_khatmah", true)
                    intent.putExtra("notification_category", "quran_wird")
                    intent.putExtra("target_tab", "quran")
                }
                "parents" -> {
                    intent.putExtra("open_parents_modal", true)
                    intent.putExtra("open_parents_duty", true)
                    intent.putExtra("notification_category", "parents_duty")
                    intent.putExtra("target_tab", "explore")
                }
                "tasbih" -> {
                    intent.putExtra("open_tasbih", true)
                    intent.putExtra("notification_category", "salawat")
                    intent.putExtra("target_tab", "explore")
                }
                else -> {
                    intent.putExtra("target_tab", "home")
                }
            }

            val isAudioPlaying = FastAudioPlayer.isPlaying()
            intent.putExtra("category", alert.category)
            intent.putExtra("alert_title", alert.title)
            intent.putExtra("alert_body", alert.body)
            intent.putExtra("audio_url", alert.audioUrl)
            intent.putExtra("keep_playing", isAudioPlaying)
            intent.putExtra("from_floating_overlay", true)
            intent.putExtra("action", "com.athar.islamic.ACTION_ATHAR_ALERT_OVERLAY")

            startActivity(intent)

            cleanDanglingViews()
            countDownTimer?.cancel()
            countDownTimer = null
            isOverlayVisible = false
            alertQueue.clear()

            if (!isAudioPlaying) {
                dismissAllAndStop()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error launching contextual action: ${e.message}", e)
            dismissAllAndStop()
        }
    }

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

    fun dismissAllAndStop() {
        mainHandler.post {
            try {
                alertQueue.clear()
                countDownTimer?.cancel()
                countDownTimer = null
                mainHandler.removeCallbacksAndMessages(null)

                if (!FullScreenAzanService.isAzanRunning) {
                    FastAudioPlayer.stop()
                }

                val view = floatingRootView
                floatingRootView = null

                badgeView = null
                queueIndicatorView = null
                muteToggleButton = null
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
                releaseWakeLock()
                stopForeground(true)
                stopSelf()
            } catch (e: Exception) {
                Log.e(TAG, "Error during dismissAllAndStop: ${e.message}", e)
            }
        }
    }

    fun dismissViewsWithoutAudioStop() {
        mainHandler.post {
            try {
                alertQueue.clear()
                countDownTimer?.cancel()
                countDownTimer = null
                mainHandler.removeCallbacksAndMessages(null)

                val view = floatingRootView
                floatingRootView = null

                badgeView = null
                queueIndicatorView = null
                muteToggleButton = null
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
                releaseWakeLock()
                stopForeground(true)
                stopSelf()
            } catch (e: Exception) {
                Log.e(TAG, "Error during dismissViewsWithoutAudioStop: ${e.message}", e)
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        dismissAllAndStop()
        if (!FullScreenAzanService.isAzanRunning) {
            FastAudioPlayer.release()
        }
        releaseWakeLock()
        activeServiceInstance = null
    }
}
