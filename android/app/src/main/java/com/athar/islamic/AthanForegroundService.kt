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

    // ⚠️ STRICT ARCHITECTURAL RULE FOR FUTURE EDITS:
    // DO NOT use 'val' for any state flags, status monitors, or reassigned variables in this file.
    // All mutable state flags MUST strictly be declared with 'var' (and @Volatile if accessed cross-thread)
    // to prevent "Val cannot be reassigned" compilation failures during build pipelines.

    private var fullWakeLock: PowerManager.WakeLock? = null
    private var partialWakeLock: PowerManager.WakeLock? = null
    private var floatingOverlayView: View? = null
    private var windowManager: WindowManager? = null
    private var mainHandler = Handler(Looper.getMainLooper())

    var isBackgroundServiceRunning: Boolean
        get() = Companion.isBackgroundServiceRunning
        set(value) {
            Companion.isBackgroundServiceRunning = value
        }

    companion object {
        const val FULLSCREEN_CHANNEL_ID = "athar_athan_fullscreen_channel"
        const val BACKGROUND_CHANNEL_ID = "athar_background_service_channel"

        const val FULLSCREEN_NOTIFICATION_ID = 99991
        const val BACKGROUND_NOTIFICATION_ID = 99992

        const val ACTION_START_ATHAN = "com.athar.islamic.START_ATHAN"
        const val ACTION_STOP_ATHAN = "com.athar.islamic.STOP_ATHAN"
        const val ACTION_START_BACKGROUND_SERVICE = "com.athar.islamic.START_BACKGROUND_SERVICE"
        const val ACTION_STOP_BACKGROUND_SERVICE = "com.athar.islamic.STOP_BACKGROUND_SERVICE"

        // ⚠️ STRICT ARCHITECTURAL RULE FOR FUTURE EDITS:
        // DO NOT use 'val' for any state flags, status monitors, or reassigned variables in this file.
        // All mutable state flags MUST strictly be declared with 'var' (and @Volatile if accessed cross-thread)
        // to prevent "Val cannot be reassigned" compilation failures during build pipelines.
        @Volatile var isRinging: Boolean = false
        @Volatile var isBackgroundServiceRunning: Boolean = false
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
                acquireFullWakeLock()
                var prayerName = intent?.getStringExtra("prayer_name") ?: "صلاة الفجر"
                var prayerTime = intent?.getStringExtra("prayer_time") ?: "05:15"
                var title = intent?.getStringExtra("title") ?: "حان الآن موعد $prayerName"
                var body = intent?.getStringExtra("body") ?: "الله أكبر · الله أكبر\nحي على الصلاة، حي على الفلاح ($prayerTime)"
                var badge = intent?.getStringExtra("badge") ?: "🕌 أذان الصلاة الفوري"
                var rawAudioUrl = intent?.getStringExtra("audio_url")
                var playSound = intent?.getBooleanExtra("play_sound", true) ?: true
                var category = intent?.getStringExtra("category") ?: AtharNotificationManager.CAT_PRAYER_ATHAN

                // Ensure authentic audio path
                var audioUrl = if (!rawAudioUrl.isNullOrEmpty()) {
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

                // Build Royal notification via AtharNotificationManager without tuple destructuring
                var royalResult = AtharNotificationManager.buildRoyalNotification(
                    context = this,
                    category = category,
                    title = title,
                    body = body,
                    badge = badge,
                    audioUrl = audioUrl,
                    isOngoing = true,
                    customNotificationId = FULLSCREEN_NOTIFICATION_ID
                )
                var notification = royalResult.second

                startForeground(FULLSCREEN_NOTIFICATION_ID, notification)

                // Force display of AthanFullScreenActivity with LockScreen flags & priority
                try {
                    var fullScreenIntent = Intent(this, AthanFullScreenActivity::class.java).apply {
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
