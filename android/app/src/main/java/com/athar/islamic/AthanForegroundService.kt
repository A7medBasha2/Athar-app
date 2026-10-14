package com.athar.islamic

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat

class AthanForegroundService : Service() {

    private var fullWakeLock: PowerManager.WakeLock? = null
    private var partialWakeLock: PowerManager.WakeLock? = null
    private var mediaPlayer: MediaPlayer? = null
    private var isBackgroundServiceRunning: Boolean = false

    companion object {
        const val FULLSCREEN_CHANNEL_ID = "athar_athan_fullscreen_channel"
        const val BACKGROUND_CHANNEL_ID = "athar_background_service_channel"

        const val FULLSCREEN_NOTIFICATION_ID = 99991
        const val BACKGROUND_NOTIFICATION_ID = 99992

        const val ACTION_START_ATHAN = "com.athar.islamic.START_ATHAN"
        const val ACTION_STOP_ATHAN = "com.athar.islamic.STOP_ATHAN"
        const val ACTION_START_BACKGROUND_SERVICE = "com.athar.islamic.START_BACKGROUND_SERVICE"
        const val ACTION_STOP_BACKGROUND_SERVICE = "com.athar.islamic.STOP_BACKGROUND_SERVICE"

        fun startAthan(context: Context, prayerName: String, prayerTime: String) {
            val intent = Intent(context, AthanForegroundService::class.java).apply {
                action = ACTION_START_ATHAN
                putExtra("prayer_name", prayerName)
                putExtra("prayer_time", prayerTime)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopAthan(context: Context) {
            val intent = Intent(context, AthanForegroundService::class.java).apply {
                action = ACTION_STOP_ATHAN
            }
            context.startService(intent)
        }

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
        createNotificationChannels()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP_ATHAN -> {
                stopAthanInternal()
                // If background service was running, return to quiet background state
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
            ACTION_START_ATHAN -> {
                acquireFullWakeLock()
                val prayerName = intent.getStringExtra("prayer_name") ?: "صلاة الفجر"
                val prayerTime = intent.getStringExtra("prayer_time") ?: "05:15"
                val notification = buildFullScreenNotification(prayerName, prayerTime)
                startForeground(FULLSCREEN_NOTIFICATION_ID, notification)
                playAthanAudio()
                return START_NOT_STICKY
            }
            else -> {
                val prayerName = intent?.getStringExtra("prayer_name") ?: "صلاة الفجر"
                val prayerTime = intent?.getStringExtra("prayer_time") ?: "05:15"
                val notification = buildFullScreenNotification(prayerName, prayerTime)
                startForeground(FULLSCREEN_NOTIFICATION_ID, notification)
                playAthanAudio()
                return START_NOT_STICKY
            }
        }
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(NotificationManager::class.java)

            // High Priority Full Screen Channel
            val fullScreenChannel = NotificationChannel(
                FULLSCREEN_CHANNEL_ID,
                "أذان ومواقيت الصلاة الفورية (شاشة كاملة)",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "قناة إطلاق شاشة الأذان بملء الشاشة مع قفل الهاتف والشاشة (USE_FULL_SCREEN_INTENT)"
                enableLights(true)
                lightColor = Color.parseColor("#D4AF37")
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 1000, 500, 1000, 500, 1500)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                setBypassDnd(true)
            }
            manager.createNotificationChannel(fullScreenChannel)

            // Low Priority Background Guard Channel
            val backgroundChannel = NotificationChannel(
                BACKGROUND_CHANNEL_ID,
                "خدمة أثر في الخلفية وحماية الأذان",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "حماية مواقيت الصلاة والأذكار والتنبيهات الدقيقة من توقف النظام وتوفير البطارية"
                setShowBadge(false)
            }
            manager.createNotificationChannel(backgroundChannel)
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

        return NotificationCompat.Builder(this, BACKGROUND_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("🕌 أثر يعمل في الخلفية")
            .setContentText("حماية مواقيت الصلوات الخمس والمنبهات من قيود توفير الطاقة")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setContentIntent(contentPendingIntent)
            .setColor(Color.parseColor("#D4AF37"))
            .build()
    }

    private fun buildFullScreenNotification(prayerName: String, prayerTime: String): Notification {
        val fullScreenIntent = Intent(this, AthanFullScreenActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("prayer_name", prayerName)
            putExtra("prayer_time", prayerTime)
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
            this,
            1001,
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        val contentIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("action", "OPEN_ATHAN_FULLSCREEN")
            putExtra("prayer_name", prayerName)
        }
        val contentPendingIntent = PendingIntent.getActivity(
            this,
            1002,
            contentIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        val muteIntent = Intent(this, AthanForegroundService::class.java).apply {
            action = ACTION_STOP_ATHAN
        }
        val mutePendingIntent = PendingIntent.getService(
            this,
            1003,
            muteIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        return NotificationCompat.Builder(this, FULLSCREEN_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("حان الآن موعد $prayerName")
            .setContentText("الله أكبر الله أكبر · حي على الصلاة، حي على الفلاح ($prayerTime)")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setContentIntent(contentPendingIntent)
            .addAction(android.R.drawable.ic_media_pause, "كتم الأذان", mutePendingIntent)
            .addAction(android.R.drawable.ic_menu_view, "فتح تطبيق أثر", contentPendingIntent)
            .setOngoing(true)
            .setAutoCancel(false)
            .setColor(Color.parseColor("#D4AF37"))
            .build()
    }

    private fun playAthanAudio() {
        try {
            val alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            mediaPlayer = MediaPlayer().apply {
                setDataSource(applicationContext, alertUri)
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                isLooping = false
                prepare()
                start()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
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
        try {
            mediaPlayer?.stop()
            mediaPlayer?.release()
            mediaPlayer = null
        } catch (e: Exception) {}

        try {
            if (fullWakeLock?.isHeld == true) {
                fullWakeLock?.release()
            }
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
