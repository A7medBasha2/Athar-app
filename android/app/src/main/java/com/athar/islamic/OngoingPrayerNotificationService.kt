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
                var channel = NotificationChannel(
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
                var manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                manager?.createNotificationChannel(channel)
            }
        }

        @JvmStatic
        fun startService(
            context: Context,
            title: String,
            nextPrayer: String,
            nextTime: String,
            remaining: String,
            fajr: String,
            dhuhr: String,
            asr: String,
            maghrib: String,
            isha: String,
            hijri: String
        ) {
            var prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().apply {
                putBoolean(KEY_ENABLED, true)
                putString(KEY_TITLE, title)
                putString(KEY_NEXT_PRAYER, nextPrayer)
                putString(KEY_NEXT_TIME, nextTime)
                putString(KEY_REMAINING, remaining)
                putString(KEY_FAJR, fajr)
                putString(KEY_DHUHR, dhuhr)
                putString(KEY_ASR, asr)
                putString(KEY_MAGHRIB, maghrib)
                putString(KEY_ISHA, isha)
                putString(KEY_HIJRI, hijri)
                apply()
            }

            var intent = Intent(context, OngoingPrayerNotificationService::class.java).apply {
                action = ACTION_START_SERVICE
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

        @JvmStatic
        fun updateData(
            context: Context,
            title: String,
            nextPrayer: String,
            nextTime: String,
            remaining: String,
            fajr: String,
            dhuhr: String,
            asr: String,
            maghrib: String,
            isha: String,
            hijri: String
        ) {
            var prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().apply {
                putString(KEY_TITLE, title)
                putString(KEY_NEXT_PRAYER, nextPrayer)
                putString(KEY_NEXT_TIME, nextTime)
                putString(KEY_REMAINING, remaining)
                putString(KEY_FAJR, fajr)
                putString(KEY_DHUHR, dhuhr)
                putString(KEY_ASR, asr)
                putString(KEY_MAGHRIB, maghrib)
                putString(KEY_ISHA, isha)
                putString(KEY_HIJRI, hijri)
                apply()
            }

            var intent = Intent(context, OngoingPrayerNotificationService::class.java).apply {
                action = ACTION_UPDATE_DATA
            }
            try {
                context.startService(intent)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        @JvmStatic
        fun stopService(context: Context) {
            var prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putBoolean(KEY_ENABLED, false).apply()

            var intent = Intent(context, OngoingPrayerNotificationService::class.java).apply {
                action = ACTION_STOP_SERVICE
            }
            try {
                context.startService(intent)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        @JvmStatic
        fun isUpcomingMuted(context: Context): Boolean {
            var prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
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
        var action = intent?.action ?: ACTION_START_SERVICE

        when (action) {
            ACTION_STOP_SERVICE -> {
                isServiceRunning = false
                stopForeground(true)
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_TOGGLE_MUTE -> {
                toggleUpcomingMute()
                return START_STICKY
            }
            ACTION_START_SERVICE, ACTION_UPDATE_DATA -> {
                isServiceRunning = true
                var notification = buildNotification()

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    try {
                        startForeground(
                            ONGOING_NOTIFICATION_ID,
                            notification,
                            ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                        )
                    } catch (e: Exception) {
                        startForeground(ONGOING_NOTIFICATION_ID, notification)
                    }
                } else {
                    startForeground(ONGOING_NOTIFICATION_ID, notification)
                }

                return START_STICKY
            }
        }

        return START_STICKY
    }

    private fun registerTimeTickReceiver() {
        if (timeTickReceiver == null) {
            timeTickReceiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    if (Intent.ACTION_TIME_TICK == intent?.action && isServiceRunning) {
                        updateNotificationInPlace()
                    }
                }
            }
            var filter = IntentFilter(Intent.ACTION_TIME_TICK)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(timeTickReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                registerReceiver(timeTickReceiver, filter)
            }
        }
    }

    private fun unregisterTimeTickReceiver() {
        timeTickReceiver?.let {
            try {
                unregisterReceiver(it)
            } catch (e: Exception) {
                e.printStackTrace()
            }
            timeTickReceiver = null
        }
    }

    private fun toggleUpcomingMute() {
        var prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        var currentMuted = prefs.getBoolean(KEY_MUTED, false)
        prefs.edit().putBoolean(KEY_MUTED, !currentMuted).apply()
        updateNotificationInPlace()
    }

    private fun updateNotificationInPlace() {
        if (!isServiceRunning) return
        try {
            var notification = buildNotification()
            var notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.notify(ONGOING_NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            var channel = NotificationChannel(
                ONGOING_CHANNEL_ID,
                "شريط مواقيت الصلاة الدائم (أثر)",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "عرض دائم لمواقيت الصلوات الخمس والعد التنازلي للصلاة القادمة"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                enableVibration(false)
                setSound(null, null)
            }
            var manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        var prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        var nextPrayer = prefs.getString(KEY_NEXT_PRAYER, "صلاة الفجر") ?: "صلاة الفجر"
        var nextTime = prefs.getString(KEY_NEXT_TIME, "05:15") ?: "05:15"
        var remaining = calculateLiveRemaining(nextTime) ?: prefs.getString(KEY_REMAINING, "متبقي على الصلاة") ?: "متبقي على الصلاة"
        var isMuted = prefs.getBoolean(KEY_MUTED, false)

        var fajr = prefs.getString(KEY_FAJR, "05:15") ?: "05:15"
        var dhuhr = prefs.getString(KEY_DHUHR, "12:00") ?: "12:00"
        var asr = prefs.getString(KEY_ASR, "15:15") ?: "15:15"
        var maghrib = prefs.getString(KEY_MAGHRIB, "17:50") ?: "17:50"
        var isha = prefs.getString(KEY_ISHA, "19:20") ?: "19:20"
        var hijri = prefs.getString(KEY_HIJRI, "أَثَرُ · ربيع الأول ١٤٤٨ هـ") ?: "أَثَرُ · ربيع الأول ١٤٤٨ هـ"

        // PendingIntent to launch Athar App on Prayers Tab
        var openAppIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("target_tab", "prayers")
        }
        var openAppPendingIntent = PendingIntent.getActivity(
            this,
            101,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        // PendingIntent for Mute/Unmute upcoming Athan toggle
        var muteIntent = Intent(this, OngoingPrayerNotificationService::class.java).apply {
            action = ACTION_TOGGLE_MUTE
        }
        var mutePendingIntent = PendingIntent.getService(
            this,
            102,
            muteIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        // Collapsed Custom RemoteView
        var collapsedView = RemoteViews(packageName, R.layout.notification_ongoing_collapsed).apply {
            setTextViewText(R.id.tvCollapsedNextPrayer, "🕌 القادمة: $nextPrayer")
            setTextViewText(R.id.tvCollapsedNextTime, nextTime)
            setTextViewText(R.id.tvCollapsedRemaining, remaining)

            if (isMuted) {
                setImageViewResource(R.id.btnCollapsedMute, R.drawable.ic_bell_muted)
            } else {
                setImageViewResource(R.id.btnCollapsedMute, R.drawable.ic_bell_active)
            }
            setOnClickPendingIntent(R.id.btnCollapsedMute, mutePendingIntent)
        }

        // Expanded Custom RemoteView
        var expandedView = RemoteViews(packageName, R.layout.notification_ongoing_expanded).apply {
            setTextViewText(R.id.tvExpandedHijriDate, hijri)
            setTextViewText(R.id.tvExpandedNextPrayer, nextPrayer)
            setTextViewText(R.id.tvExpandedNextTime, nextTime)
            setTextViewText(R.id.tvExpandedRemaining, remaining)

            // Five prayer times grid
            setTextViewText(R.id.tvFajrTime, fajr)
            setTextViewText(R.id.tvDhuhrTime, dhuhr)
            setTextViewText(R.id.tvAsrTime, asr)
            setTextViewText(R.id.tvMaghribTime, maghrib)
            setTextViewText(R.id.tvIshaTime, isha)

            // Highlight the next upcoming prayer container
            highlightCurrentPrayer(this, nextPrayer)

            // Mute / Bell Button state
            if (isMuted) {
                setImageViewResource(R.id.btnExpandedMute, R.drawable.ic_bell_muted)
                setTextViewText(R.id.tvMuteStatus, "الأذان صامت")
            } else {
                setImageViewResource(R.id.btnExpandedMute, R.drawable.ic_bell_active)
                setTextViewText(R.id.tvMuteStatus, "الأذان مفعل")
            }
            setOnClickPendingIntent(R.id.btnExpandedMute, mutePendingIntent)

            // Open App Button
            setOnClickPendingIntent(R.id.btnOpenApp, openAppPendingIntent)
        }

        var appLogoBitmap = try {
            BitmapFactory.decodeResource(resources, R.drawable.icon_logo)
        } catch (e: Exception) {
            null
        }

        var fallbackTitle = "🕌 القادمة: $nextPrayer ($nextTime)"
        var fallbackBody = "$remaining · الفجر $fajr · الظهر $dhuhr · العصر $asr · المغرب $maghrib · العشاء $isha"

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
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setContentIntent(openAppPendingIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setColor(Color.parseColor("#E6C66E"))
            .build()
    }

    private fun highlightCurrentPrayer(views: RemoteViews, nextPrayer: String) {
        try {
            views.setInt(R.id.boxFajr, "setBackgroundResource", R.drawable.widget_prayer_box_bg)
            views.setInt(R.id.boxDhuhr, "setBackgroundResource", R.drawable.widget_prayer_box_bg)
            views.setInt(R.id.boxAsr, "setBackgroundResource", R.drawable.widget_prayer_box_bg)
            views.setInt(R.id.boxMaghrib, "setBackgroundResource", R.drawable.widget_prayer_box_bg)
            views.setInt(R.id.boxIsha, "setBackgroundResource", R.drawable.widget_prayer_box_bg)

            when {
                nextPrayer.contains("الفجر") -> views.setInt(R.id.boxFajr, "setBackgroundResource", R.drawable.widget_royal_card_bg)
                nextPrayer.contains("الظهر") -> views.setInt(R.id.boxDhuhr, "setBackgroundResource", R.drawable.widget_royal_card_bg)
                nextPrayer.contains("العصر") -> views.setInt(R.id.boxAsr, "setBackgroundResource", R.drawable.widget_royal_card_bg)
                nextPrayer.contains("المغرب") -> views.setInt(R.id.boxMaghrib, "setBackgroundResource", R.drawable.widget_royal_card_bg)
                nextPrayer.contains("العشاء") -> views.setInt(R.id.boxIsha, "setBackgroundResource", R.drawable.widget_royal_card_bg)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun calculateLiveRemaining(timeStr: String): String? {
        return try {
            var cleanStr = timeStr.trim()
            if (cleanStr.contains("ص") || cleanStr.contains("م") || cleanStr.contains("AM") || cleanStr.contains("PM")) {
                var sdf12 = SimpleDateFormat("hh:mm a", Locale.ENGLISH)
                var date = try {
                    sdf12.parse(cleanStr.replace("ص", "AM").replace("م", "PM"))
                } catch (e: Exception) {
                    null
                }
                if (date != null) {
                    var sdf24 = SimpleDateFormat("HH:mm", Locale.ENGLISH)
                    cleanStr = sdf24.format(date)
                }
            }

            var parts = cleanStr.split(":")
            if (parts.size < 2) return null
            var targetHour = parts[0].trim().toInt()
            var targetMinute = parts[1].trim().take(2).toInt()

            var now = Calendar.getInstance()
            var target = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, targetHour)
                set(Calendar.MINUTE, targetMinute)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }

            if (target.before(now)) {
                target.add(Calendar.DAY_OF_YEAR, 1)
            }

            var diffMillis = target.timeInMillis - now.timeInMillis
            var diffMinutes = (diffMillis / (1000 * 60)).toInt()
            var hours = diffMinutes / 60
            var minutes = diffMinutes % 60

            when {
                diffMinutes <= 0 -> "حان وقت الصلاة الآن"
                hours == 0 -> "متبقي $minutes دقيقة"
                minutes == 0 -> "متبقي $hours ساعة"
                else -> "متبقي $hours س و $minutes د"
            }
        } catch (e: Exception) {
            null
        }
    }

    override fun onDestroy() {
        unregisterTimeTickReceiver()
        isServiceRunning = false
        super.onDestroy()
    }
}
