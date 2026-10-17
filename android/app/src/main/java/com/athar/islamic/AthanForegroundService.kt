// Force rebuild cache fix - Timestamp 2026
package com.athar.islamic

import android.animation.ObjectAnimator
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
import android.view.animation.LinearInterpolator
import android.widget.Button
import android.widget.TextView
import androidx.core.app.NotificationCompat

/**
 * AthanForegroundService
 * High-priority Foreground Service ensuring the Android process stays alive during Athan,
 * managing the WakeLock, FullScreen Activity intent, and Royal System Overlay Window.
 */
class AthanForegroundService : Service() {

    private var fullWakeLock: PowerManager.WakeLock? = null
    private var partialWakeLock: PowerManager.WakeLock? = null
    private var floatingOverlayView: View? = null
    private var overlayAnimator: ObjectAnimator? = null
    private var windowManager: WindowManager? = null
    private var mainHandler = Handler(Looper.getMainLooper())

    var isBackgroundServiceRunning: Boolean
        get() = Companion.isBackgroundServiceRunning
        set(value) {
            Companion.isBackgroundServiceRunning = value
        }

    companion object {
        const val FULLSCREEN_CHANNEL_ID = AtharNotificationManager.CHANNEL_ATHAN_ID
        const val BACKGROUND_CHANNEL_ID = "athar_background_service_channel"

        const val FULLSCREEN_NOTIFICATION_ID = AtharNotificationManager.ID_PRAYER_ATHAN // 1001: Fixed Static ID
        const val BACKGROUND_NOTIFICATION_ID = 99992

        const val ACTION_START_ATHAN = "com.athar.islamic.START_ATHAN"
        const val ACTION_STOP_ATHAN = "com.athar.islamic.STOP_ATHAN"
        const val ACTION_START_BACKGROUND_SERVICE = "com.athar.islamic.START_BACKGROUND_SERVICE"
        const val ACTION_STOP_BACKGROUND_SERVICE = "com.athar.islamic.STOP_BACKGROUND_SERVICE"

        @JvmField @Volatile var isRinging: Boolean = false
        @JvmField @Volatile var isBackgroundServiceRunning: Boolean = false
        @JvmField @Volatile var activePrayerName: String = ""
        @JvmField @Volatile var activeTitle: String = ""
        @JvmField @Volatile var activeBody: String = ""
        @JvmField @Volatile var activeBadge: String = ""
        @JvmField @Volatile var activeCategory: String = "quran"
        @JvmField @Volatile var activeAudioUrl: String = ""
        @JvmField @Volatile var activeInstance: AthanForegroundService? = null

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
            playSound: Boolean = true,
            triggerTimestamp: Long = System.currentTimeMillis()
        ) {
            var intent = Intent(context, AthanForegroundService::class.java).apply {
                action = ACTION_START_ATHAN
                putExtra("prayer_name", prayerName)
                putExtra("prayer_time", prayerTime)
                if (title != null) putExtra("title", title)
                if (body != null) putExtra("body", body)
                if (badge != null) putExtra("badge", badge)
                if (category != null) putExtra("category", category)
                if (audioUrl != null) putExtra("audio_url", audioUrl)
                putExtra("play_sound", playSound)
                putExtra("trigger_timestamp", triggerTimestamp)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
        @JvmStatic
        fun stopAthan(context: Context) {
            var intent = Intent(context, AthanForegroundService::class.java).apply {
                action = ACTION_STOP_ATHAN
            }
            context.startService(intent)
        }

        @JvmStatic
        fun showOverlayOutsideApp(context: Context) {
            val service = activeInstance
            if (service != null) {
                if (AtharNotificationManager.isSystemOverlayEnabled(context)) {
                    val pName = if (activePrayerName.isNotEmpty()) activePrayerName else (AtharNotificationManager.lastActiveTitle ?: "鬲賳亘賷賴 兀孬乇 丕賱賲賱賰賷")
                    val aTitle = if (activeTitle.isNotEmpty()) activeTitle else (AtharNotificationManager.lastActiveTitle ?: "鬲賳亘賷賴 兀孬乇 丕賱賲賱賰賷")
                    val aBody = if (activeBody.isNotEmpty()) activeBody else (AtharNotificationManager.lastActiveBody ?: "")
                    val aBadge = if (activeBadge.isNotEmpty()) activeBadge else (AtharNotificationManager.lastActiveBadge ?: "馃晫 鬲賳亘賷賴 兀孬乇 丕賱賲賱賰賷")

                    service.showFloatingOverlayIfPermitted(
                        pName,
                        "",
                        aTitle,
                        aBody,
                        aBadge
                    )
                }
            } else if (isRinging || AtharNotificationManager.isPlaying()) {
                val prayer = if (activePrayerName.isNotEmpty()) activePrayerName else (AtharNotificationManager.lastActiveTitle ?: "鬲賳亘賷賴 兀孬乇 丕賱賲賱賰賷")
                val title = if (activeTitle.isNotEmpty()) activeTitle else (AtharNotificationManager.lastActiveTitle ?: "鬲賳亘賷賴 兀孬乇 丕賱賲賱賰賷")
                val body = if (activeBody.isNotEmpty()) activeBody else (AtharNotificationManager.lastActiveBody ?: "")
                val badge = if (activeBadge.isNotEmpty()) activeBadge else (AtharNotificationManager.lastActiveBadge ?: "馃晫 鬲賳亘賷賴 兀孬乇 丕賱賲賱賰賷")
                val audio = if (activeAudioUrl.isNotEmpty()) activeAudioUrl else (AtharNotificationManager.lastActiveAudioUrl ?: "")
                val cat = if (activeCategory.isNotEmpty()) activeCategory else (AtharNotificationManager.lastActiveCategory ?: AtharNotificationManager.CAT_PRAYER_ATHAN)

                startAthan(
                    context = context,
                    prayerName = prayer,
                    prayerTime = "",
                    title = title,
                    body = body,
                    badge = badge,
                    category = cat,
                    audioUrl = audio,
                    playSound = false
                )
            }
        }

        @JvmStatic
        fun hideOverlayInsideApp() {
            activeInstance?.removeFloatingOverlayInternal()
        }

        @JvmStatic
        fun startBackgroundService(context: Context) {
            var intent = Intent(context, AthanForegroundService::class.java).apply {
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
            var intent = Intent(context, AthanForegroundService::class.java).apply {
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
        var currentAction = intent?.action
        when (currentAction) {
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
                var notification = buildBackgroundNotification()
                startForeground(BACKGROUND_NOTIFICATION_ID, notification)
                return START_STICKY
            }
            ACTION_START_ATHAN, null -> {
                var prayerName = intent?.getStringExtra("prayer_name") ?: "氐賱丕丞 丕賱賮噩乇"
                var prayerTime = intent?.getStringExtra("prayer_time") ?: "05:15"
                var title = intent?.getStringExtra("title") ?: "丨丕賳 丕賱丌賳 賲賵毓丿 $prayerName"
                var body = intent?.getStringExtra("body") ?: "丕賱賱賴 兀賰亘乇 路 丕賱賱賴 兀賰亘乇\n丨賷 毓賱賶 丕賱氐賱丕丞貙 丨賷 毓賱賶 丕賱賮賱丕丨 ($prayerTime)"
                var badge = intent?.getStringExtra("badge") ?: "馃晫 兀匕丕賳 丕賱氐賱丕丞 丕賱賮賵乇賷"
                var rawAudioUrl = intent?.getStringExtra("audio_url")
                var playSound = intent?.getBooleanExtra("play_sound", true) ?: true
                var category = intent?.getStringExtra("category") ?: AtharNotificationManager.CAT_PRAYER_ATHAN
                var triggerTimestamp = intent?.getLongExtra("trigger_timestamp", 0L) ?: System.currentTimeMillis()
                if (triggerTimestamp > 0L) {
                    AtharNotificationManager.setAthanEventTriggerTime(triggerTimestamp)
                }

                if (isRinging && activePrayerName == prayerName && AtharNotificationManager.isPlaying()) {
                    return START_NOT_STICKY
                }

                acquireFullWakeLock()

                var audioUrl = if (!rawAudioUrl.isNullOrEmpty()) {
                    rawAudioUrl
                } else {
                    AtharNotificationManager.getMuazzinAudioForPrayer(this, prayerName)
                }

                isRinging = true
                activeInstance = this
                activePrayerName = prayerName
                activeTitle = title
                activeBody = body
                activeBadge = badge
                activeCategory = category
                activeAudioUrl = audioUrl

                if (playSound) {
                    AtharNotificationManager.playNotificationAudioWithGuard(this, audioUrl, category)
                }

                // 鬲賲 廿賱睾丕亍 鬲孬亘賷鬲 廿卮毓丕乇 丕賱兀匕丕賳 丕賱毓丕卅賲 賳賴丕卅賷丕賸 亘賳丕亍賸 毓賱賶 胤賱亘賰
                // startForeground(FULLSCREEN_NOTIFICATION_ID, notification)

                AtharNotificationManager.purgeAllExtraneousNotifications(this, FULLSCREEN_NOTIFICATION_ID)

                // 鬲賵噩賷賴 廿卮毓丕乇 賵賯鬲 丕賱兀匕丕賳 賲亘丕卮乇丞 廿賱賶 卮丕卮丞 丕賱鬲胤亘賷賯 丕賱乇卅賷爻賷丞 (MainActivity) 賱鬲毓賲賱 賮賵賯 賯賮賱 丕賱卮丕卮丞
                try {
                    var mainActivityIntent = Intent(this, MainActivity::class.java).apply {
                        action = "com.athar.islamic.ACTION_ATHAN_FULLSCREEN"
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                        addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                        addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)

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

                    startActivity(mainActivityIntent)
                } catch (e: Exception) {
                    e.printStackTrace()
                    if (AtharNotificationManager.isSystemOverlayEnabled(this)) {
                        showFloatingOverlayIfPermitted(prayerName, prayerTime, title, body, badge)
                    }
                }

                return START_NOT_STICKY
            }
            else -> {
                return START_NOT_STICKY
            }
        }
    }

    /**
     * Floating Athan overlay disabled intentionally.
     * Keep this method so existing callers remain compatible, but remove any
     * overlay that may already be visible instead of creating a new one.
     */
    fun showFloatingOverlayIfPermitted(
        prayerName: String,
        prayerTime: String,
        title: String,
        body: String,
        badge: String
    ) {
        mainHandler.post {
            removeFloatingOverlayInternal()
        }
    }

    fun removeFloatingOverlayInternal() {
        try {
            overlayAnimator?.cancel()
            overlayAnimator = null
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
            var manager = getSystemService(NotificationManager::class.java)

            var fullScreenChannel = NotificationChannel(
                FULLSCREEN_CHANNEL_ID,
                "兀匕丕賳 賵賲賵丕賯賷鬲 丕賱氐賱丕丞 丕賱賮賵乇賷丞 (卮丕卮丞 賰丕賲賱丞 賵廿卮毓丕乇 毓丕卅賲)",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "賯賳丕丞 廿胤賱丕賯 廿卮毓丕乇 丕賱兀匕丕賳 丕賱毓丕卅賲 賵丕賱卮丕卮丞 丕賱賰丕賲賱丞 (USE_FULL_SCREEN_INTENT)"
                enableLights(true)
                lightColor = Color.parseColor("#E6C66E")
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 1000, 500, 1000, 500, 1500)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                setBypassDnd(true)
            }
            manager?.createNotificationChannel(fullScreenChannel)

            var backgroundChannel = NotificationChannel(
                BACKGROUND_CHANNEL_ID,
                "禺丿賲丞 兀孬乇 賮賷 丕賱禺賱賮賷丞 賵丨賲丕賷丞 丕賱兀匕丕賳",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "丨賲丕賷丞 賲賵丕賯賷鬲 丕賱氐賱丕丞 賵丕賱兀匕賰丕乇 賵丕賱鬲賳亘賷賴丕鬲 丕賱丿賯賷賯丞 賲賳 鬲賵賯賮 丕賱賳馗丕賲 賵鬲賵賮賷乇 丕賱亘胤丕乇賷丞"
                setShowBadge(false)
            }
            manager?.createNotificationChannel(backgroundChannel)
        }
    }

    private fun buildBackgroundNotification(): Notification {
        var contentIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        var contentPendingIntent = PendingIntent.getActivity(
            this,
            1005,
            contentIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        var appLogoBitmap = try {
            OngoingPrayerNotificationService.getScaledAppLogo(this, 96)
        } catch (e: Exception) {
            null
        }

        return NotificationCompat.Builder(this, BACKGROUND_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_athar)
            .apply {
                if (appLogoBitmap != null) setLargeIcon(appLogoBitmap)
            }
            .setContentTitle("馃晫 兀孬乇 賷毓賲賱 賮賷 丕賱禺賱賮賷丞")
            .setContentText("丨賲丕賷丞 賲賵丕賯賷鬲 丕賱氐賱賵丕鬲 丕賱禺賲爻 賵丕賱賲賳亘賴丕鬲 賲賳 賯賷賵丿 鬲賵賮賷乇 丕賱胤丕賯丞")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setSilent(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(contentPendingIntent)
            .setColor(Color.parseColor("#E6C66E"))
            .build()
    }

    private fun acquireFullWakeLock() {
        var powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
        fullWakeLock = powerManager?.newWakeLock(
            PowerManager.FULL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
            "Athar:AthanFullWakeLock"
        )?.apply {
            acquire(10 * 60 * 1000L) // 10 minutes max
        }
    }

    private fun acquirePartialWakeLock() {
        if (partialWakeLock == null) {
            var powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
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

        AtharNotificationManager.stopAndReleasePlayer()

        isRinging = false
        activeInstance = null

        try {
            if (fullWakeLock?.isHeld == true) {
                fullWakeLock?.release()
            }
        } catch (e: Exception) {}

        try {
            var notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(FULLSCREEN_NOTIFICATION_ID)
            notificationManager.cancel(99991)
            notificationManager.cancel(AtharNotificationManager.ID_PRAYER_ATHAN)
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

        isBackgroundServiceRunning = false
        stopForeground(true)
        stopSelf()
    }

    override fun onDestroy() {
        stopBackgroundInternal()
        super.onDestroy()
    }
}
