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
        const val ONGOING_CHANNEL_ID = "athar_ongoing_prayer_channel_v2"
        const val ONGOING_NOTIFICATION_ID = 88881

        const val ACTION_START_SERVICE = "com.athar.islamic.ACTION_START_ONGOING_PRAYER"
        const val ACTION_UPDATE_DATA = "com.athar.islamic.ACTION_UPDATE_ONGOING_PRAYER"
        const val ACTION_STOP_SERVICE = "com.athar.islamic.ACTION_STOP_ONGOING_PRAYER"
        const val ACTION_TOGGLE_ONGOING_MUTE = "com.athar.islamic.ACTION_TOGGLE_ONGOING_MUTE"

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
        fun getScaledAppLogo(context: Context, maxDim: Int = 128): android.graphics.Bitmap? {
            return try {
                val options = BitmapFactory.Options().apply {
                    inJustDecodeBounds = true
                }
                BitmapFactory.decodeResource(context.resources, R.drawable.icon_logo, options)
                var sampleSize = 1
                while (options.outWidth / (sampleSize * 2) >= maxDim && options.outHeight / (sampleSize * 2) >= maxDim) {
                    sampleSize *= 2
                }
                val decodeOptions = BitmapFactory.Options().apply {
                    inSampleSize = sampleSize
                    inPreferredConfig = android.graphics.Bitmap.Config.ARGB_8888
                }
                val raw = BitmapFactory.decodeResource(context.resources, R.drawable.icon_logo, decodeOptions) ?: return null
                if (raw.width > maxDim || raw.height > maxDim) {
                    android.graphics.Bitmap.createScaledBitmap(raw, maxDim, (maxDim * raw.height) / raw.width, true)
                } else {
                    raw
                }
            } catch (e: Exception) {
                null
            }
        }

        @JvmStatic
        fun createChannel(context: Context) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

                // Purge any legacy low-importance channel to ensure clean upgrade on real devices
                try {
                    manager.deleteNotificationChannel("athar_ongoing_prayer_channel")
                    manager.deleteNotificationChannel("athar_ongoing_channel")
                } catch (e: Exception) {}

                // IMPORTANCE_DEFAULT guarantees status bar icon and lockscreen presence across all OEM Android devices
                val channel = NotificationChannel(
                    ONGOING_CHANNEL_ID,
                    "شريط مواقيت الصلاة الدائم (أثر)",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "شريط الإشعارات المستمر لعرض مواقيت الصلوات الخمس والعد التنازلي الحي"
                    setShowBadge(false)
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                    enableVibration(false)
                    setSound(null, null)
                }
                manager.createNotificationChannel(channel)
            }
        }

        @JvmStatic
        fun showNotificationDirectly(context: Context) {
            try {
                createChannel(context)
                val notification = buildNotification(context)
                val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                manager?.notify(ONGOING_NOTIFICATION_ID, notification)
            } catch (e: Exception) {
                e.printStackTrace()
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
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
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

            // Step 1: Immediately render the pinned notification without waiting for service start
            showNotificationDirectly(context)

            // Step 2: Launch Foreground Service to sustain the 1-minute live countdown updates
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
                // If background start is restricted by Android 12+ OS limits,
                // the notification is ALREADY visible via showNotificationDirectly!
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
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
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

            // Immediately update the notification display
            showNotificationDirectly(context)
        }

        @JvmStatic
        fun updateService(
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
            updateData(context, title, nextPrayer, nextTime, remaining, fajr, dhuhr, asr, maghrib, isha, hijri)
        }

        @JvmStatic
        fun stopService(context: Context) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putBoolean(KEY_ENABLED, false).apply()

            try {
                val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                manager?.cancel(ONGOING_NOTIFICATION_ID)
            } catch (e: Exception) {
                e.printStackTrace()
            }

            val intent = Intent(context, OngoingPrayerNotificationService::class.java).apply {
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
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getBoolean(KEY_MUTED, false)
        }

        @JvmStatic
        fun toggleUpcomingMute(context: Context) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val currentMuted = prefs.getBoolean(KEY_MUTED, false)
            prefs.edit().putBoolean(KEY_MUTED, !currentMuted).apply()
            showNotificationDirectly(context)
        }

        @JvmStatic
        fun buildNotification(context: Context): Notification {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val nextPrayer = prefs.getString(KEY_NEXT_PRAYER, "صلاة الفجر") ?: "صلاة الفجر"
            val nextTime = prefs.getString(KEY_NEXT_TIME, "05:15") ?: "05:15"
            val remaining = calculateLiveRemaining(nextTime) ?: prefs.getString(KEY_REMAINING, "متبقي على الصلاة") ?: "متبقي على الصلاة"
            val isMuted = prefs.getBoolean(KEY_MUTED, false)

            val fajr = prefs.getString(KEY_FAJR, "05:15") ?: "05:15"
            val dhuhr = prefs.getString(KEY_DHUHR, "12:00") ?: "12:00"
            val asr = prefs.getString(KEY_ASR, "15:15") ?: "15:15"
            val maghrib = prefs.getString(KEY_MAGHRIB, "17:50") ?: "17:50"
            val isha = prefs.getString(KEY_ISHA, "19:20") ?: "19:20"

            val openAppIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("target_tab", "prayers")
            }
            val openAppPendingIntent = PendingIntent.getActivity(
                context,
                101,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            )

            // Use BroadcastReceiver to toggle mute so it works seamlessly from background
            val muteIntent = Intent(context, AtharNotificationReceiver::class.java).apply {
                action = ACTION_TOGGLE_ONGOING_MUTE
            }
            val mutePendingIntent = PendingIntent.getBroadcast(
                context,
                102,
                muteIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            )

            val collapsedView = RemoteViews(context.packageName, R.layout.notification_ongoing_collapsed).apply {
                setTextViewText(R.id.tvOngoingPrayerTitle, "🕌 القادمة: $nextPrayer")
                setTextViewText(R.id.tvOngoingPrayerTime, nextTime)
                setTextViewText(R.id.tvOngoingSubtitle, remaining)

                if (isMuted) {
                    setImageViewResource(R.id.btnOngoingBell, R.drawable.ic_bell_muted)
                } else {
                    setImageViewResource(R.id.btnOngoingBell, R.drawable.ic_bell_active)
                }
                setOnClickPendingIntent(R.id.btnOngoingBell, mutePendingIntent)
            }

            val expandedView = RemoteViews(context.packageName, R.layout.notification_ongoing_expanded).apply {
                setTextViewText(R.id.tvOngoingPrayerTitle, "🕌 القادمة: $nextPrayer")
                setTextViewText(R.id.tvOngoingPrayerTime, nextTime)
                setTextViewText(R.id.tvOngoingSubtitle, remaining)

                setTextViewText(R.id.tvOngoingFajrTime, fajr)
                setTextViewText(R.id.tvOngoingDhuhrTime, dhuhr)
                setTextViewText(R.id.tvOngoingAsrTime, asr)
                setTextViewText(R.id.tvOngoingMaghribTime, maghrib)
                setTextViewText(R.id.tvOngoingIshaTime, isha)

                highlightCurrentPrayer(this, nextPrayer)

                if (isMuted) {
                    setImageViewResource(R.id.btnOngoingBell, R.drawable.ic_bell_muted)
                } else {
                    setImageViewResource(R.id.btnOngoingBell, R.drawable.ic_bell_active)
                }
                setOnClickPendingIntent(R.id.btnOngoingBell, mutePendingIntent)
            }

            val appLogoBitmap = getScaledAppLogo(context, 128)

            val fallbackTitle = "🕌 القادمة: $nextPrayer ($nextTime)"
            val fallbackBody = "$remaining · الفجر $fajr · الظهر $dhuhr · العصر $asr · المغرب $maghrib · العشاء $isha"

            val publicNotification = NotificationCompat.Builder(context, ONGOING_CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_athar)
                .setContentTitle(fallbackTitle)
                .setContentText(fallbackBody)
                .setStyle(NotificationCompat.BigTextStyle().bigText(fallbackBody))
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setOngoing(true)
                .setSilent(true)
                .setOnlyAlertOnce(true)
                .setShowWhen(false)
                .setContentIntent(openAppPendingIntent)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setColor(Color.parseColor("#E6C66E"))
                .build()

            return NotificationCompat.Builder(context, ONGOING_CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_athar)
                .apply {
                    if (appLogoBitmap != null) setLargeIcon(appLogoBitmap)
                }
                .setStyle(NotificationCompat.DecoratedCustomViewStyle())
                .setCustomContentView(collapsedView)
                .setCustomBigContentView(expandedView)
                .setContentTitle(fallbackTitle)
                .setContentText(fallbackBody)
                .setPublicVersion(publicNotification)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setOngoing(true)
                .setSilent(true)
                .setOnlyAlertOnce(true)
                .setShowWhen(false)
                .setContentIntent(openAppPendingIntent)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setColor(Color.parseColor("#E6C66E"))
                .build()
        }

        @JvmStatic
        fun highlightCurrentPrayer(views: RemoteViews, nextPrayer: String) {
            views.setInt(R.id.boxOngoingFajr, "setBackgroundResource", R.drawable.widget_prayer_box_bg)
            views.setInt(R.id.boxOngoingDhuhr, "setBackgroundResource", R.drawable.widget_prayer_box_bg)
            views.setInt(R.id.boxOngoingAsr, "setBackgroundResource", R.drawable.widget_prayer_box_bg)
            views.setInt(R.id.boxOngoingMaghrib, "setBackgroundResource", R.drawable.widget_prayer_box_bg)
            views.setInt(R.id.boxOngoingIsha, "setBackgroundResource", R.drawable.widget_prayer_box_bg)

            when {
                nextPrayer.contains("الفجر") -> views.setInt(R.id.boxOngoingFajr, "setBackgroundResource", R.drawable.widget_royal_card_bg)
                nextPrayer.contains("الظهر") -> views.setInt(R.id.boxOngoingDhuhr, "setBackgroundResource", R.drawable.widget_royal_card_bg)
                nextPrayer.contains("العصر") -> views.setInt(R.id.boxOngoingAsr, "setBackgroundResource", R.drawable.widget_royal_card_bg)
                nextPrayer.contains("المغرب") -> views.setInt(R.id.boxOngoingMaghrib, "setBackgroundResource", R.drawable.widget_royal_card_bg)
                nextPrayer.contains("العشاء") -> views.setInt(R.id.boxOngoingIsha, "setBackgroundResource", R.drawable.widget_royal_card_bg)
            }
        }

        @JvmStatic
        fun calculateLiveRemaining(timeStr: String): String? {
            return try {
                var cleanStr = normalizeDigits(timeStr.trim())
                if (cleanStr.contains("ص") || cleanStr.contains("م") || cleanStr.contains("AM") || cleanStr.contains("PM")) {
                    val sdf12 = SimpleDateFormat("hh:mm a", Locale.ENGLISH)
                    val date = try {
                        sdf12.parse(cleanStr.replace("ص", "AM").replace("م", "PM"))
                    } catch (e: Exception) {
                        null
                    }
                    if (date != null) {
                        val sdf24 = SimpleDateFormat("HH:mm", Locale.ENGLISH)
                        cleanStr = sdf24.format(date)
                    }
                }

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

        @JvmStatic
        fun normalizeDigits(input: String): String {
            val arabic = "٠١٢٣٤٥٦٧٨٩"
            val english = "0123456789"
            var result = input
            for (i in 0 until 10) {
                result = result.replace(arabic[i], english[i])
            }
            return result
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createChannel(this)
        registerTimeTickReceiver()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: ACTION_START_SERVICE

        when (action) {
            ACTION_STOP_SERVICE -> {
                isServiceRunning = false
                stopForeground(true)
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_TOGGLE_ONGOING_MUTE -> {
                toggleUpcomingMute(this)
                return START_STICKY
            }
            ACTION_START_SERVICE, ACTION_UPDATE_DATA -> {
                isServiceRunning = true
                val notification = buildNotification(this)

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    try {
                        startForeground(
                            ONGOING_NOTIFICATION_ID,
                            notification,
                            ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                        )
                    } catch (e: Exception) {
                        try {
                            startForeground(ONGOING_NOTIFICATION_ID, notification)
                        } catch (err: Exception) {
                            err.printStackTrace()
                        }
                    }
                } else {
                    try {
                        startForeground(ONGOING_NOTIFICATION_ID, notification)
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
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
            val filter = IntentFilter(Intent.ACTION_TIME_TICK)
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

    private fun updateNotificationInPlace() {
        if (!isServiceRunning) return
        try {
            val notification = buildNotification(this)
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.notify(ONGOING_NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onDestroy() {
        unregisterTimeTickReceiver()
        isServiceRunning = false
        super.onDestroy()
    }
}
