package com.athar.islamic

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * AtharFirebaseMessagingService
 *
 * Reliable Push Notification Engine for Athar Islamic App:
 * 1. Handles FCM Token generation & automatic topic subscription (announcements, daily_dhikr).
 * 2. Parses incoming data payloads and routes urgent alerts to Athar's Floating Window Overlay.
 * 3. Formats general announcements into high-priority notifications in the Android notification shade.
 */
class AtharFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)

        // Store token in local SharedPreferences for app synchronization
        val prefs = getSharedPreferences(PREFS_FCM, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_FCM_TOKEN, token).apply()

        // Auto-subscribe to standard general broadcast topics
        subscribeToGeneralTopics()
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        val data = remoteMessage.data
        val notification = remoteMessage.notification

        val title = data["title"] ?: notification?.title ?: "أَثَر | رفيقك اليومي"
        val body = data["body"] ?: notification?.body ?: ""
        val payloadType = data["type"] ?: data["alert_type"] ?: "announcement"

        // Urgent alerts (Prayer call, urgent dhikr, or explicit floating alert)
        if (payloadType == "urgent_alert" || payloadType == "adhan" || payloadType == "floating_alert") {
            handleUrgentFloatingAlert(title, body, data)
        } else {
            // General announcement or prayer reminder displayed in the Android system shade
            handleSystemNotification(title, body, data)
        }
    }

    /**
     * Dispatches urgent notifications to Athar's Floating Window Overlay.
     */
    private fun handleUrgentFloatingAlert(title: String, body: String, data: Map<String, String>) {
        val badge = data["badge"] ?: "تنبيه عاجل"
        val audioUrl = data["audioUrl"] ?: ""
        val playSound = data["playSound"]?.toBooleanStrictOrNull() ?: audioUrl.isNotEmpty()
        val actionType = data["actionType"] ?: "primary"
        val surahNumber = data["surahNumber"]?.toIntOrNull() ?: 1
        val ayahNumber = data["ayahNumber"]?.toIntOrNull() ?: 1
        val actionText = data["actionText"] ?: "فتح في التطبيق 📖"
        val autoDismiss = data["autoDismissSeconds"]?.toIntOrNull() ?: 15
        val playbackMode = data["playbackMode"] ?: "notification_and_sound"

        AtharFloatingWindowService.showOverlay(
            context = applicationContext,
            badge = badge,
            title = title,
            body = body,
            audioUrl = audioUrl,
            playSound = playSound,
            actionType = actionType,
            surahNumber = surahNumber,
            ayahNumber = ayahNumber,
            actionText = actionText,
            autoDismissSeconds = autoDismiss,
            playbackMode = playbackMode
        )
    }

    /**
     * Builds and displays an Android system notification for general announcements and reminders.
     */
    private fun handleSystemNotification(title: String, body: String, data: Map<String, String>) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = CHANNEL_FCM_ANNOUNCEMENTS

        // Ensure channel exists on Android 8.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val existingChannel = notificationManager.getNotificationChannel(channelId)
            if (existingChannel == null) {
                val channel = NotificationChannel(
                    channelId,
                    "إعلانات وتذكيرات أثر",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "قناة إشعارات أثر للأخبار والتذكيرات العامة"
                    enableLights(true)
                    lightColor = Color.parseColor("#D4AF37")
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 250, 150, 250)
                    val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                    val audioAttributes = AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                        .build()
                    setSound(soundUri, audioAttributes)
                }
                notificationManager.createNotificationChannel(channel)
            }
        }

        // Tap action: Launch MainActivity
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            data["route"]?.let { putExtra("route", it) }
            data["tab"]?.let { putExtra("tab", it) }
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            System.currentTimeMillis().toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        val notificationId = (System.currentTimeMillis() % 100000).toInt() + 2000

        val builder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_stat_athar)
            .setColor(Color.parseColor("#D4AF37"))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setDefaults(NotificationCompat.DEFAULT_ALL)

        notificationManager.notify(notificationId, builder.build())
    }

    companion object {
        const val PREFS_FCM = "AtharFCMPreferences"
        const val KEY_FCM_TOKEN = "fcm_token"
        const val CHANNEL_FCM_ANNOUNCEMENTS = "athar_fcm_announcements"

        /**
         * Subscribes the client to essential general topics without blocking startup.
         */
        fun subscribeToGeneralTopics() {
            try {
                FirebaseMessaging.getInstance().subscribeToTopic("announcements")
                FirebaseMessaging.getInstance().subscribeToTopic("daily_dhikr")
            } catch (ignored: Exception) {}
        }
    }
}
