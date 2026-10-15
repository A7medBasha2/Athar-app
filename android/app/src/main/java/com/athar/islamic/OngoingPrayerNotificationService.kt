package com.athar.islamic

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.SharedPreferences
import android.content.pm.ServiceInfo
import android.graphics.BitmapFactory
import android.graphics.Color
import android.os.Build
import android.os.IBinder
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

class OngoingPrayerNotificationService : Service() {

    private var timeTickReceiver: BroadcastReceiver? = null
    private var isServiceRunning: Boolean = false

    companion object {
        const val ONGOING_CHANNEL_ID = "athar_ongoing_prayer_channel"
        const val ONGOING_NOTIFICATION_ID = 88881

        const val ACTION_START_SERVICE = "com.athar.islamic.ACTION_START_ONGOING_PRAYER"
        const val ACTION_UPDATE_DATA = "com.athar.islamic.ACTION_UPDATE_ONGOING_PRAYER"
        const val ACTION_STOP_SERVICE = "com.athar.islamic.ACTION_STOP_ONGOING_PRAYER"
        const val ACTION_TOGGLE_MUTE = "com.athar.islamic.ACTION_TOGGLE_ONGOING_MUTE"

        const val PREFS_NAME = "AtharOngoingPrayerPrefs"
        const val KEY_ENABLED = "ongoing_enabled"
        const val KEY_MUTED = "upcoming_athan_muted"
        const val KEY_TITLE = "ongoing_title"
        const val KEY_NEXT_PRAYER = "ongoing_next_prayer"
        const val KEY_NEXT_TIME = "ongoing_next_time"
        const val KEY_REMAINING = "ongoing_remaining"
        const val KEY_FAJR = "ongoing_fajr"
        const val KEY_DHUHR = "ongoing_dhuhr"
        const val KEY_ASR = "ongoing_asr"
        const val KEY_MAGHRIB = "ongoing_maghrib"
        const val KEY_ISHA = "ongoing_isha"
        const val KEY_HIJRI = "ongoing_hijri"

        @JvmStatic
        fun createChannel(context: Context) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    ONGOING_CHANNEL_ID,
                    "شريط مواقيت الصلاة الدائم (أثر)",
                    NotificationManager.IMPORTANCE_LOW
                ).apply {
                    description = "شريط الإشعارات المستمر لعرض مواقيت الصلوات الخمس والوقت المتبقي"
                    setShowBadge(false)
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                    enableVibration(false)
                    setSound(null, null)
                }
                val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                manager?.createNotificationChannel(channel)
            }
        }

        @JvmStatic
        fun startService(
            context: Context,
            title: String? = null,
            nextPrayer: String? = null,
            nextTime: String? = null,
            remaining: String? = null,
            fajr: String? = null,
            dhuhr: String? = null,
            asr: String? = null,
            maghrib: String? = null,
            isha: String? = null,
            hijri: String? = null
        ) {
            createChannel(context)
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().apply {
                putBoolean(KEY_ENABLED, true)
                if (title != null) putString(KEY_TITLE, title)
                if (nextPrayer != null) putString(KEY_NEXT_PRAYER, nextPrayer)
                if (nextTime != null) putString(KEY_NEXT_TIME, nextTime)
                if (remaining != null) putString(KEY_REMAINING, remaining)
                if (fajr != null) putString(KEY_FAJR, fajr)
                if (dhuhr != null) putString(KEY_DHUHR, dhuhr)
                if (asr != null) putString(KEY_ASR, asr)
                if (maghrib != null) putString(KEY_MAGHRIB, maghrib)
                if (isha != null) putString(KEY_ISHA, isha)
                if (hijri != null) putString(KEY_HIJRI, hijri)
                apply()
            }

            val intent = Intent(context, OngoingPrayerNotificationService::class.java).apply {
                action = ACTION_START_SERVICE
            }
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                // Fallback to updateService or standard startService
                try {
                    context.startService(intent)
                } catch (err: Exception) {
                    err.printStackTrace()
                }
            }
        }

        @JvmStatic
        fun updateService(
            context: Context,
            title: String? = null,
            nextPrayer: String? = null,
            nextTime: String? = null,
            remaining: String? = null,
            fajr: String? = null,
            dhuhr: String? = null,
            asr: String? = null,
            maghrib: String? = null,
            isha: String? = null,
            hijri: String? = null
        ) {
            createChannel(context)
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().apply {
                if (title != null) putString(KEY_TITLE, title)
                if (nextPrayer != null) putString(KEY_NEXT_PRAYER, nextPrayer)
                if (nextTime != null) putString(KEY_NEXT_TIME, nextTime)
                if (remaining != null) putString(KEY_REMAINING, remaining)
                if (fajr != null) putString(KEY_FAJR, fajr)
                if (dhuhr != null) putString(KEY_DHUHR, dhuhr)
                if (asr != null) putString(KEY_ASR, asr)
                if (maghrib != null) putString(KEY_MAGHRIB, maghrib)
                if (isha != null) putString(KEY_ISHA, isha)
                if (hijri != null) putString(KEY_HIJRI, hijri)
                apply()
            }

            val intent = Intent(context, OngoingPrayerNotificationService::class.java).apply {
                action = ACTION_UPDATE_DATA
            }
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                try {
                    context.startService(intent)
                } catch (err: Exception) {
                    err.printStackTrace()
                }
            }
        }

        @JvmStatic
        fun stopService(context: Context) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putBoolean(KEY_ENABLED, false).apply()

            val intent = Intent(context, OngoingPrayerNotificationService::class.java).apply {
                action = ACTION_STOP_SERVICE
            }
            context.startService(intent)
        }

        @JvmStatic
        fun isMuted(context: Context): Boolean {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getBoolean(KEY_MUTED, false)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        registerTimeTickReceiver()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP_SERVICE) {
            isServiceRunning = false
            stopForeground(true)
            stopSelf()
            return START_NOT_STICKY
        }

        // Instantly establish Foreground Service status for Android 8/12/13/14+ compliance
        createNotificationChannel()
        val notification = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                ONGOING_NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
            )
        } else {
            startForeground(ONGOING_NOTIFICATION_ID, notification)
        }
        isServiceRunning = true

        if (intent?.action == ACTION_TOGGLE_MUTE) {
            toggleMute()
            refreshNotification()
            return START_STICKY
        }

        refreshNotification()
        return START_STICKY
    }

    override fun onDestroy() {
        unregisterTimeTickReceiver()
        super.onDestroy()
    }

    private fun registerTimeTickReceiver() {
        if (timeTickReceiver == null) {
            timeTickReceiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    if (intent?.action == Intent.ACTION_TIME_TICK && isServiceRunning) {
                        refreshNotification()
                    }
                }
            }
            val filter = IntentFilter(Intent.ACTION_TIME_TICK)
            registerReceiver(timeTickReceiver, filter)
        }
    }

    private fun unregisterTimeTickReceiver() {
        try {
            timeTickReceiver?.let {
                unregisterReceiver(it)
                timeTickReceiver = null
            }
        } catch (e: Exception) {
            timeTickReceiver = null
        }
    }

    private fun toggleMute() {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val currentMuted = prefs.getBoolean(KEY_MUTED, false)
        prefs.edit().putBoolean(KEY_MUTED, !currentMuted).apply()
    }

    private fun refreshNotification() {
        try {
            val notification = buildNotification()
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.notify(ONGOING_NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                ONGOING_CHANNEL_ID,
                "شريط مواقيت الصلاة الدائم (أثر)",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "شريط الإشعارات المستمر لعرض مواقيت الصلوات الخمس والوقت المتبقي"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val nextPrayer = prefs.getString(KEY_NEXT_PRAYER, "صلاة الفجر") ?: "صلاة الفجر"
        val nextTime = prefs.getString(KEY_NEXT_TIME, "05:15") ?: "05:15"
        val remaining = calculateLiveRemaining(nextTime) ?: prefs.getString(KEY_REMAINING, "متبقي على الصلاة") ?: "متبقي على الصلاة"
        val isMuted = prefs.getBoolean(KEY_MUTED, false)

        val fajr = prefs.getString(KEY_FAJR, "05:15") ?: "05:15"
        val dhuhr = prefs.getString(KEY_DHUHR, "12:00") ?: "12:00"
        val asr = prefs.getString(KEY_ASR, "15:15") ?: "15:15"
        val maghrib = prefs.getString(KEY_MAGHRIB, "17:50") ?: "17:50"
        val isha = prefs.getString(KEY_ISHA, "19:20") ?: "19:20"
        val hijri = prefs.getString(KEY_HIJRI, "أَثَرُ · ربيع الأول ١٤٤٨ هـ") ?: "أَثَرُ · ربيع الأول ١٤٤٨ هـ"

        // 1. PendingIntent for opening app (Main navigation)
        val openAppIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("target_tab", "prayers")
        }
        val openAppPendingIntent = PendingIntent.getActivity(
            this,
            8881,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        // 2. PendingIntent for Quick Action Bell Toggle
        val muteIntent = Intent(this, OngoingPrayerNotificationService::class.java).apply {
            action = ACTION_TOGGLE_MUTE
        }
        val mutePendingIntent = PendingIntent.getService(
            this,
            8882,
            muteIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        // 3. Collapsed View
        val collapsedView = RemoteViews(packageName, R.layout.notification_ongoing_collapsed).apply {
            setTextViewText(R.id.tvOngoingPrayerTitle, "الصلاة القادمة: $nextPrayer")
            setTextViewText(R.id.tvOngoingPrayerTime, nextTime)
            setTextViewText(R.id.tvOngoingSubtitle, "$remaining · ${if (isMuted) "الأذان صامت" else "الأذان مفعل"}")
            setImageViewResource(
                R.id.btnOngoingBell,
                if (isMuted) R.drawable.ic_bell_muted else R.drawable.ic_bell_active
            )
            setOnClickPendingIntent(R.id.btnOngoingBell, mutePendingIntent)
        }

        // 4. Expanded View (Full schedule + quick action bell)
        val expandedView = RemoteViews(packageName, R.layout.notification_ongoing_expanded).apply {
            setTextViewText(R.id.tvOngoingPrayerTitle, "الصلاة القادمة: $nextPrayer")
            setTextViewText(R.id.tvOngoingPrayerTime, nextTime)
            setTextViewText(R.id.tvOngoingSubtitle, "$remaining · ${if (isMuted) "الأذان صامت" else "الأذان مفعل"}")
            setImageViewResource(
                R.id.btnOngoingBell,
                if (isMuted) R.drawable.ic_bell_muted else R.drawable.ic_bell_active
            )
            setOnClickPendingIntent(R.id.btnOngoingBell, mutePendingIntent)

            // Fill 5 prayers
            setTextViewText(R.id.tvOngoingFajrTime, fajr)
            setTextViewText(R.id.tvOngoingDhuhrTime, dhuhr)
            setTextViewText(R.id.tvOngoingAsrTime, asr)
            setTextViewText(R.id.tvOngoingMaghribTime, maghrib)
            setTextViewText(R.id.tvOngoingIshaTime, isha)

            // Highlight next prayer
            when {
                nextPrayer.contains("فجر") -> setTextColor(R.id.tvOngoingFajrTime, Color.parseColor("#E6C66E"))
                nextPrayer.contains("ظهر") -> setTextColor(R.id.tvOngoingDhuhrTime, Color.parseColor("#E6C66E"))
                nextPrayer.contains("عصر") -> setTextColor(R.id.tvOngoingAsrTime, Color.parseColor("#E6C66E"))
                nextPrayer.contains("مغرب") -> setTextColor(R.id.tvOngoingMaghribTime, Color.parseColor("#E6C66E"))
                nextPrayer.contains("عشاء") -> setTextColor(R.id.tvOngoingIshaTime, Color.parseColor("#E6C66E"))
            }

            setTextViewText(R.id.tvOngoingExpandedFooter, hijri)
        }

        val appLogoBitmap = try {
            BitmapFactory.decodeResource(resources, R.drawable.icon_logo)
        } catch (e: Exception) {
            null
        }

        val fallbackTitle = "🕌 القادمة: $nextPrayer ($nextTime)"
        val fallbackBody = "$remaining · الفجر $fajr · الظهر $dhuhr · العصر $asr · المغرب $maghrib · العشاء $isha"

        return NotificationCompat.Builder(this, ONGOING_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_athar)
            .apply {
                if (appLogoBitmap != null) setLargeIcon(appLogoBitmap)
            }
            .setStyle(NotificationCompat.DecoratedCustomViewStyle())
            .setCustomContentView(collapsedView)
            .setCustomBigContentView(expandedView)
            .setContentTitle(fallbackTitle)
            .setContentText(fallbackBody)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setAutoCancel(false)
            .setContentIntent(openAppPendingIntent)
            .setColor(Color.parseColor("#E6C66E"))
            .build()
    }

    private fun calculateLiveRemaining(timeStr: String): String? {
        return try {
            val cleanStr = timeStr.trim()
                .replace('٠', '0')
                .replace('١', '1')
                .replace('٢', '2')
                .replace('٣', '3')
                .replace('٤', '4')
                .replace('٥', '5')
                .replace('٦', '6')
                .replace('٧', '7')
                .replace('٨', '8')
                .replace('٩', '9')
                .replace("ص", "")
                .replace("م", "")
                .replace("AM", "", ignoreCase = true)
                .replace("PM", "", ignoreCase = true)
                .trim()

            val parts = cleanStr.split(":")
            if (parts.size < 2) return null
            val targetHour = parts[0].trim().toInt()
            val targetMinute = parts[1].trim().take(2).toInt()

            val now = Calendar.getInstance()
            val target = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, targetHour)
                set(Calendar.MINUTE, targetMinute)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }

            if (target.before(now)) {
                target.add(Calendar.DAY_OF_YEAR, 1)
            }

            val diffMillis = target.timeInMillis - now.timeInMillis
            val diffMinutes = (diffMillis / (1000 * 60)).toInt()
            val hours = diffMinutes / 60
            val minutes = diffMinutes % 60

            if (hours > 0) {
                String.format(Locale.getDefault(), "متبقي: %02d:%02d", hours, minutes)
            } else {
                String.format(Locale.getDefault(), "متبقي: %d دقيقة", minutes)
            }
        } catch (e: Exception) {
            null
        }
    }
}
