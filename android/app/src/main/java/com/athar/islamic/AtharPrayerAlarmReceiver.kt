package com.athar.islamic

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager

/**
 * AtharPrayerAlarmReceiver
 * Receives exact AlarmManager broadcasts for prayer times and awakens the device,
 * initiating FullScreenIntent notification and AthanForegroundService to ring Adhan.
 */
class AtharPrayerAlarmReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_PRAYER_ALARM = "com.athar.islamic.ACTION_PRAYER_ALARM"

        @Volatile private var lastAlarmTriggerTimeMs: Long = 0L
        @Volatile private var lastAlarmPrayerId: String? = null
    }

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent == null) return

        var prayerId = intent.getStringExtra("prayer_id") ?: "fajr"
        var prayerName = intent.getStringExtra("prayer_name") ?: "صلاة الفجر"
        var prayerTime = intent.getStringExtra("prayer_time") ?: "05:15"
        var audioUrl = intent.getStringExtra("audio_url")

        // 1. Strict Debounce: Ignore duplicate broadcasts within 15 seconds for the same prayer
        var now = System.currentTimeMillis()
        if (now - lastAlarmTriggerTimeMs < 15000L && lastAlarmPrayerId == prayerId) {
            return
        }
        lastAlarmTriggerTimeMs = now
        lastAlarmPrayerId = prayerId

        // 2. Acquire Screen & CPU WakeLock immediately to awaken device and turn screen on
        var powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        @Suppress("DEPRECATION")
        var wakeLock = powerManager?.newWakeLock(
            PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
            "Athar:PrayerAlarmWakeLock"
        )
        try {
            wakeLock?.acquire(60000L) // 1 minute
        } catch (e: Exception) {
            try {
                powerManager?.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
                    "Athar:PrayerAlarmPartialWakeLock"
                )?.acquire(60000L)
            } catch (ex: Exception) {
                ex.printStackTrace()
            }
        }

        var title = "حان الآن موعد $prayerName"
        var body = "الله أكبر · الله أكبر\nحي على الصلاة، حي على الفلاح ($prayerTime)"
        var badge = "🕌 أذان الصلاة الفوري"
        var category = AtharNotificationManager.CAT_PRAYER_ATHAN

        // 3. Post Royal Notification with FullScreenIntent immediately (uses static ID 1001)
        // This ensures the lock-screen wakeup and FullScreenIntent launch even from deep Doze mode
        try {
            var royalResult = AtharNotificationManager.buildRoyalNotification(
                context = context,
                category = category,
                title = title,
                body = body,
                badge = badge,
                audioUrl = audioUrl,
                isOngoing = true,
                customNotificationId = AtharNotificationManager.ID_PRAYER_ATHAN
            )
            var notifManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            notifManager?.notify(royalResult.first, royalResult.second)
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // 4. Start AthanForegroundService to ring Adhan & manage audio timeline
        try {
            AthanForegroundService.startAthan(
                context = context,
                prayerName = prayerName,
                prayerTime = prayerTime,
                title = title,
                body = body,
                badge = badge,
                category = category,
                audioUrl = audioUrl,
                playSound = true
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // 5. Reschedule upcoming prayers in case device was asleep
        try {
            AtharPrayerAlarmScheduler.rescheduleNextAlarms(context)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
