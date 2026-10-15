package com.athar.islamic

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import androidx.core.app.NotificationCompat

/**
 * AthanForegroundService
 * High-priority Foreground Service ensuring the Android process stays alive during Athan,
 * managing the WakeLock, FullScreen Activity intent, and Royal System Overlay Window.
 *
 * All audio playback, mute/unmute state, and timeline progress are strictly coordinated
 * by the centralized AtharNotificationManager to prevent audio conflicts or desynchronization.
 */
class AthanForegroundService : Service() {

    private var fullWakeLock: PowerManager.WakeLock? = null
    private var partialWakeLock: PowerManager.WakeLock? = null
    private var isBackgroundServiceRunning: Boolean = false
    private var floatingOverlayView: View? = null
    private var windowManager: WindowManager? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    companion object {
        const val FULLSCREEN_CHANNEL_ID = "athar_athan_fullscreen_channel"
        const val BACKGROUND_CHANNEL_ID = "athar_background_service_channel"

        const val FULLSCREEN_NOTIFICATION_ID = 99991
        const val BACKGROUND_NOTIFICATION_ID = 99992

        const val ACTION_START_ATHAN = "com.athar.islamic.START_ATHAN"
        const val ACTION_STOP_ATHAN = "com.athar.islamic.STOP_ATHAN"
        const val ACTION_START_BACKGROUND_SERVICE = "com.athar.islamic.START_BACKGROUND_SERVICE"
        const val ACTION_STOP_BACKGROUND_SERVICE = "com.athar.islamic.STOP_BACKGROUND_SERVICE"

        @Volatile var isRinging: Boolean = false
        @Volatile var activePrayerName: String = ""
        @Volatile var activeTitle: String = ""
        @Volatile var activeBody: String = ""
        @Volatile var activeBadge: String = ""
        @Volatile var activeCategory: String = "quran"
        @Volatile var activeAudioUrl: String = ""
        @Volatile var activeInstance: AthanForegroundService? = null

        @JvmStatic
        fun getCurrentPositionMs(): Long {
            return AtharNotificationManager.getCurrentPositionMs()
        }

        @JvmStatic
        fun getDurationMs(): Long {
            return AtharNotificationManager.getDurationMs()
        }

        @JvmStatic
        fun startAthan(
            context: Context,
            prayerName: String,
            prayerTime: String,
            title: String? = null,
            body: String? = null,
            badge: String? = null,
            category: String? = null,
            audioUrl: String? = null,
            playSound: Boolean = true
        ) {
            val intent = Intent(context, AthanForegroundService::class.java).apply {
                action = ACTION_START_ATHAN
                putExtra("prayer_name", prayerName)
                putExtra("prayer_time", prayerTime)
                if (title != null) putExtra("title", title)
                if (body != null) putExtra("body", body)
                if (badge != null) putExtra("badge", badge)
                if (category != null) putExtra("category", category)
                if (audioUrl != null) putExtra("audio_url", audioUrl)
                putExtra("play_sound", playSound)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        @JvmStatic
        fun stopAthan(context: Context) {
            val intent = Intent(context, AthanForegroundService::class.java).apply {
                action = ACTION_STOP_ATHAN
            }
            context.startService(intent)
        }

        @JvmStatic
        fun startBackgroundService(context: Context) {
            val intent = Intent(context, AthanForegroundService::class.java).apply {
                action = ACTION_START_BACKGROUND_SERVICE
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        @JvmStatic
        fun stopBackgroundService(context: Context) {
            val intent = Intent(context, AthanForegroundService::class.java).apply {
                action = ACTION_STOP_BACKGROUND_SERVICE
            }
            context.startService(intent)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as? WindowManager
        createNotificationChannels()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP_ATHAN -> {
                stopAthanInternal()
                if (isBackgroundServiceRunning) {
                    startForeground(BACKGROUND_NOTIFICATION_ID, buildBackgroundNotification())
                    return START_STICKY
                }
                return START_NOT_STICKY
            }
            ACTION_STOP_BACKGROUND_SERVICE -> {
                isBackgroundServiceRunning = false
                stopBackgroundInternal()
                return START_NOT_STICKY
            }
            ACTION_START_BACKGROUND_SERVICE -> {
                isBackgroundServiceRunning = true
                acquirePartialWakeLock()
                val notification = buildBackgroundNotification()
                startForeground(BACKGROUND_NOTIFICATION_ID, notification)
                return START_STICKY
            }
            ACTION_START_ATHAN, null -> {
                acquireFullWakeLock()
                val prayerName = intent?.getStringExtra("prayer_name") ?: "صلاة الفجر"
                val prayerTime = intent?.getStringExtra("prayer_time") ?: "05:15"
                val title = intent?.getStringExtra("title") ?: "حان الآن موعد $prayerName"
                val body = intent?.getStringExtra("body") ?: "الله أكبر · الله أكبر\nحي على الصلاة، حي على الفلاح ($prayerTime)"
                val badge = intent?.getStringExtra("badge") ?: "🕌 أذان الصلاة الفوري"
                val rawAudioUrl = intent?.getStringExtra("audio_url")
                val playSound = intent?.getBooleanExtra("play_sound", true) ?: true
                val category = intent?.getStringExtra("category") ?: AtharNotificationManager.CAT_PRAYER_ATHAN

                // Ensure authentic audio path
                val audioUrl = if (!rawAudioUrl.isNullOrEmpty()) {
                    rawAudioUrl
                } else if (prayerName.contains("الفجر") || prayerName.contains("فجر")) {
                    "public/audio/adhan_fajr_alafasy.mp3"
                } else {
                    "public/audio/adhan_alafasy.mp3"
                }

                isRinging = true
                activeInstance = this
                activePrayerName = prayerName
                activeTitle = title
                activeBody = body
                activeBadge = badge
                activeCategory = category
                activeAudioUrl = audioUrl

                // Start audio using centralized AtharNotificationManager engine
                if (playSound) {
                    AtharNotificationManager.playNotificationAudioWithGuard(this, audioUrl, category)
                }

                // Build Royal notification via AtharNotificationManager
                val (_, notification) = AtharNotificationManager.buildRoyalNotification(
                    context = this,
                    category = category,
                    title = title,
                    body = body,
                    badge = badge,
                    audioUrl = audioUrl,
                    isOngoing = true,
                    customNotificationId = FULLSCREEN_NOTIFICATION_ID
                )

                startForeground(FULLSCREEN_NOTIFICATION_ID, notification)

                // Force display of AthanFullScreenActivity with LockScreen flags & priority
                try {
                    val fullScreenIntent = Intent(this, AthanFullScreenActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                                Intent.FLAG_ACTIVITY_SINGLE_TOP or
                                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                        putExtra("prayer_name", prayerName)
                        putExtra("prayer_time", prayerTime)
                        putExtra("alert_title", title)
                        putExtra("alert_body", body)
                        putExtra("category_badge", badge)
                        putExtra("category", category)
                        putExtra("audio_url", audioUrl)
                        putExtra("elapsed_ms", 0L)
                        putExtra("duration_ms", AtharNotificationManager.getDurationMs())
                    }
                    startActivity(fullScreenIntent)
                } catch (e: Exception) {
                    e.printStackTrace()
                }

                showFloatingOverlayIfPermitted(prayerName, prayerTime, title, body, badge)
                return START_NOT_STICKY
            }
            else -> {
                return START_NOT_STICKY
            }
        }
    }

    private fun showFloatingOverlayIfPermitted(
        prayerName: String,
        prayerTime: String,
        title: String,
        body: String,
        badge: String
    ) {
        val elapsed = getCurrentPositionMs()
        val duration = getDurationMs()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            return
        }

        mainHandler.post {
            try {
                removeFloatingOverlayInternal()

                val inflater = LayoutInflater.from(this)
                val view = inflater.inflate(R.layout.view_system_overlay_notification, null)

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
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                    PixelFormat.TRANSLUCENT
                ).apply {
                    gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
                    y = 30
                }

                view.findViewById<TextView>(R.id.tvOverlayTitle)?.text = title
                view.findViewById<TextView>(R.id.tvOverlayBody)?.text = body
                view.findViewById<TextView>(R.id.tvOverlayBadge)?.text = badge

                val btnMute = view.findViewById<Button>(R.id.btnOverlayMute)
                if (AtharNotificationManager.isMuted()) {
                    btnMute?.text = "تشغيل الصوت 🔊"
                } else {
                    btnMute?.text = "كتم الصوت ✕"
                }

                btnMute?.setOnClickListener {
                    AtharNotificationManager.toggleAudio(this@AthanForegroundService)
                    if (AtharNotificationManager.isMuted()) {
                        btnMute.text = "تشغيل الصوت 🔊"
                    } else {
                        btnMute.text = "كتم الصوت ✕"
                    }
                }

                view.findViewById<TextView>(R.id.btnOverlayClose)?.setOnClickListener {
                    stopAthan(this@AthanForegroundService)
                }

                view.findViewById<Button>(R.id.btnOverlayOpen)?.setOnClickListener {
                    val mainIntent = Intent(this@AthanForegroundService, MainActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                        putExtra("action", "OPEN_ATHAN_FULLSCREEN")
                        putExtra("prayer_name", prayerName)
                        putExtra("alert_title", title)
                        putExtra("alert_body", body)
                        putExtra("category_badge", badge)
                        putExtra("category", activeCategory)
                        putExtra("audio_url", activeAudioUrl)
                    }
                    startActivity(mainIntent)
                    removeFloatingOverlayInternal()
                }

                windowManager?.addView(view, params)
                floatingOverlayView = view
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun removeFloatingOverlayInternal() {
        try {
            floatingOverlayView?.let { view ->
                windowManager?.removeView(view)
                floatingOverlayView = null
            }
        } catch (e: Exception) {
            floatingOverlayView = null
        }
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(NotificationManager::class.java)

            val fullScreenChannel = NotificationChannel(
                FULLSCREEN_CHANNEL_ID,
                "أذان ومواقيت الصلاة الفورية (شاشة كاملة وإشعار عائم)",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "قناة إطلاق إشعار الأذان العائم والشاشة الكاملة (USE_FULL_SCREEN_INTENT)"
                enableLights(true)
                lightColor = Color.parseColor("#E6C66E")
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 1000, 500, 1000, 500, 1500)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                setBypassDnd(true)
            }
            manager?.createNotificationChannel(fullScreenChannel)

            val backgroundChannel = NotificationChannel(
                BACKGROUND_CHANNEL_ID,
                "خدمة أثر في الخلفية وحماية الأذان",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "حماية مواقيت الصلاة والأذكار والتنبيهات الدقيقة من توقف النظام وتوفير البطارية"
                setShowBadge(false)
            }
            manager?.createNotificationChannel(backgroundChannel)
        }
    }

    private fun buildBackgroundNotification(): Notification {
        val contentIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val contentPendingIntent = PendingIntent.getActivity(
            this,
            1005,
            contentIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        val appLogoBitmap = try {
            BitmapFactory.decodeResource(resources, R.drawable.icon_logo)
        } catch (e: Exception) {
            null
        }

        return NotificationCompat.Builder(this, BACKGROUND_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_athar)
            .apply {
                if (appLogoBitmap != null) setLargeIcon(appLogoBitmap)
            }
            .setContentTitle("🕌 أثر يعمل في الخلفية")
            .setContentText("حماية مواقيت الصلوات الخمس والمنبهات من قيود توفير الطاقة")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setContentIntent(contentPendingIntent)
            .setColor(Color.parseColor("#E6C66E"))
            .build()
    }

    private fun acquireFullWakeLock() {
        val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
        fullWakeLock = powerManager?.newWakeLock(
            PowerManager.FULL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
            "Athar:AthanFullWakeLock"
        )?.apply {
            acquire(10 * 60 * 1000L) // 10 minutes max
        }
    }

    private fun acquirePartialWakeLock() {
        if (partialWakeLock == null) {
            val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
            partialWakeLock = powerManager?.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "Athar:BackgroundPartialWakeLock"
            )?.apply {
                acquire(24 * 60 * 60 * 1000L) // Safe partial lock
            }
        }
    }

    private fun stopAthanInternal() {
        mainHandler.post {
            removeFloatingOverlayInternal()
        }

        // Delegate audio cleanup to centralized AtharNotificationManager
        AtharNotificationManager.stopAndReleasePlayer()

        isRinging = false
        activeInstance = null

        try {
            if (fullWakeLock?.isHeld == true) {
                fullWakeLock?.release()
            }
        } catch (e: Exception) {}

        try {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(FULLSCREEN_NOTIFICATION_ID)
        } catch (e: Exception) {}

        stopForeground(true)
    }

    private fun stopBackgroundInternal() {
        stopAthanInternal()

        try {
            if (partialWakeLock?.isHeld == true) {
                partialWakeLock?.release()
                partialWakeLock = null
            }
        } catch (e: Exception) {}

        stopForeground(true)
        stopSelf()
    }

    override fun onDestroy() {
        stopBackgroundInternal()
        super.onDestroy()
    }
}
