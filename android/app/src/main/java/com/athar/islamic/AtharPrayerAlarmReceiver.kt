package com.athar.islamic

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager

/**
 * AtharPrayerAlarmReceiver
 * Receives exact AlarmManager broadcasts for prayer times and awakens the device,
 * initiating AthanForegroundService to ring Adhan and launch Full-Screen Athan.
 */
class AtharPrayerAlarmReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_PRAYER_ALARM = "com.athar.islamic.ACTION_PRAYER_ALARM"
    }

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent == null) return

        var prayerId = intent.getStringExtra("prayer_id") ?: "fajr"
        var prayerName = intent.getStringExtra("prayer_name") ?: "صلاة الفجر"
        var prayerTime = intent.getStringExtra("prayer_time") ?: "05:15"
        var audioUrl = intent.getStringExtra("audio_url")

        // 1. Acquire WakeLock immediately
        var powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        var wakeLock = powerManager?.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
            "Athar:PrayerAlarmWakeLock"
        )
        try {
            wakeLock?.acquire(45000L)
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // 2. Start AthanForegroundService to ring Adhan & show full-screen overlay
        try {
            AthanForegroundService.startAthan(
                context = context,
                prayerName = prayerName,
                prayerTime = prayerTime,
                title = "حان الآن موعد $prayerName",
                body = "الله أكبر · الله أكبر\nحي على الصلاة، حي على الفلاح ($prayerTime)",
                badge = "🕌 أذان الصلاة الفوري",
                category = AtharNotificationManager.CAT_PRAYER_ATHAN,
                audioUrl = audioUrl,
                playSound = true
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // 3. Reschedule upcoming prayers in case device was asleep
        try {
            AtharPrayerAlarmScheduler.rescheduleNextAlarms(context)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
