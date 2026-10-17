package com.athar.islamic

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
        const val ACTION_ROYAL_ALARM = "com.athar.islamic.ACTION_ROYAL_ALARM"

        @Volatile private var lastAlarmTriggerTimeMs: Long = 0L
        @Volatile private var lastAlarmPrayerId: String? = null
        @Volatile private var lastRoyalAlarmTriggerTimeMs: Long = 0L
        @Volatile private var lastRoyalAlarmId: String? = null
    }

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent == null) return

        var action = intent.action ?: ACTION_PRAYER_ALARM

        if (action == ACTION_ROYAL_ALARM) {
            handleRoyalAlarm(context, intent)
            return
        }

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

        var triggerNow = System.currentTimeMillis()
        AtharNotificationManager.setAthanEventTriggerTime(triggerNow)

        // Purge any older notifications from previous prayers or reminders immediately
        AtharNotificationManager.purgeAllExtraneousNotifications(context, AtharNotificationManager.ID_PRAYER_ATHAN)

        // Delegate directly to AthanForegroundService to ring Adhan, manage audio timeline,
        // and launch the Full-Screen Activity without duplicate heads-up notification banners.

        // 4. Start AthanForegroundService to ring Adhan & manage audio timeline
        try {
            AthanForegroundService.startAthan(
                context,
                prayerName,
                prayerTime,
                title,
                body,
                badge,
                category,
                audioUrl,
                true,
                triggerNow
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

    private fun handleRoyalAlarm(context: Context, intent: Intent) {
        var alarmId = intent.getStringExtra("alarm_id") ?: "royal_${System.currentTimeMillis()}"
        var type = intent.getStringExtra("type") ?: "dhikr_salawat"
        var title = intent.getStringExtra("title") ?: "تنبيه أثر الملكي"
        var body = intent.getStringExtra("body") ?: ""
        var badge = intent.getStringExtra("badge") ?: "🕌 تنبيه أثر الملكي"
        var category = intent.getStringExtra("category") ?: AtharNotificationManager.CAT_DHIKR_TASBEEH
        var audioUrl = intent.getStringExtra("audio_url")
        var surahNumber = intent.getIntExtra("surah_number", 0)
        var ayahNumber = intent.getIntExtra("ayah_number", 0)
        var adhkarCategory = intent.getStringExtra("adhkar_category") ?: ""
        var playSound = intent.getBooleanExtra("play_sound", true)

        // 1. Strict Debounce: Ignore duplicate broadcasts within 5 seconds for the same royal alarm
        var now = System.currentTimeMillis()
        if (now - lastRoyalAlarmTriggerTimeMs < 5000L && lastRoyalAlarmId == alarmId) {
            return
        }
        lastRoyalAlarmTriggerTimeMs = now
        lastRoyalAlarmId = alarmId

        // 2. Acquire CPU & Screen WakeLock to ensure notification fires reliably during deep sleep / Doze Mode
        var powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        @Suppress("DEPRECATION")
        var wakeLock = powerManager?.newWakeLock(
            PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
            "Athar:RoyalAlarmWakeLock"
        )
        try {
            wakeLock?.acquire(30000L) // 30 seconds
        } catch (e: Exception) {
            try {
                powerManager?.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
                    "Athar:RoyalAlarmPartialWakeLock"
                )?.acquire(30000L)
            } catch (ex: Exception) {
                ex.printStackTrace()
            }
        }

        // 3. Adhan Priority Check: Do not interrupt if Adhan triggered within the last 180 seconds
        var isAthanActive = (now - AtharNotificationManager.athanEventTriggerTimeMs < 180000L)
        var effectivePlaySound = if (isAthanActive) false else playSound

        // 4. Dispatch Royal Notification with sound and direct Intent
        try {
            AtharNotificationManager.showRoyalNotification(
                context = context,
                category = category,
                title = title,
                body = body,
                badge = badge,
                audioUrl = audioUrl,
                playSound = effectivePlaySound,
                isOngoing = false,
                surahNumber = surahNumber,
                ayahNumber = ayahNumber
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // 5. Reschedule upcoming royal alarms
        try {
            AtharPrayerAlarmScheduler.rescheduleNextRoyalAlarms(context)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
