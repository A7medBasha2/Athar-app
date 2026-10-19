package com.athar.islamic

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.util.Log
import java.util.Calendar

object AtharPrayerAlarmScheduler {

    private const val TAG = "AtharRoyalScheduler"
    const val PREFS_NAME = "AtharNotificationSettings"
    const val ACTION_ROYAL_ALARM = "com.athar.islamic.ACTION_ROYAL_ALARM"
    private const val ROYAL_ALARM_REQ_CODE = 88991

    fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    /**
     * Legacy stubs for compatibility
     */
    fun scheduleAlarms(context: Context) {
        scheduleNextRoyalAlarm(context)
    }

    fun cancelAllAlarms(context: Context) {
        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val intent = Intent(context, AtharPrayerAlarmReceiver::class.java).apply {
                action = ACTION_ROYAL_ALARM
            }
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            val pendingIntent = PendingIntent.getBroadcast(context, ROYAL_ALARM_REQ_CODE, intent, flags)
            alarmManager.cancel(pendingIntent)
        } catch (e: Exception) {
            Log.e(TAG, "Error cancelling royal alarms: ${e.message}", e)
        }
    }

    /**
     * Saves royal reminder configurations synced from the React web app into SharedPreferences
     */
    fun saveRemindersConfig(
        context: Context,
        ayahEnabled: Boolean,
        ayahIntervalMs: Long,
        ayahScheduleType: String,
        ayahFixedTime: String,
        ayahMode: String,

        salawatEnabled: Boolean,
        salawatIntervalMs: Long,
        salawatScheduleType: String,
        salawatFixedTime: String,
        salawatMode: String,

        wirdEnabled: Boolean,
        wirdIntervalMs: Long,
        wirdScheduleType: String,
        wirdFixedTime: String,
        wirdMode: String,

        parentsEnabled: Boolean,
        parentsIntervalMs: Long,
        parentsScheduleType: String,
        parentsFixedTime: String,
        parentsMode: String
    ) {
        val prefs = getPrefs(context)
        val now = System.currentTimeMillis()

        prefs.edit().apply {
            putBoolean("royal_ayah_enabled", ayahEnabled)
            putLong("royal_ayah_interval_ms", ayahIntervalMs)
            putString("royal_ayah_schedule_type", ayahScheduleType)
            putString("royal_ayah_fixed_time", ayahFixedTime)
            putString("royal_ayah_mode", ayahMode)
            if (!prefs.contains("royal_ayah_last_ts")) {
                putLong("royal_ayah_last_ts", now)
            }

            putBoolean("royal_salawat_enabled", salawatEnabled)
            putLong("royal_salawat_interval_ms", salawatIntervalMs)
            putString("royal_salawat_schedule_type", salawatScheduleType)
            putString("royal_salawat_fixed_time", salawatFixedTime)
            putString("royal_salawat_mode", salawatMode)
            if (!prefs.contains("royal_salawat_last_ts")) {
                putLong("royal_salawat_last_ts", now)
            }

            putBoolean("royal_wird_enabled", wirdEnabled)
            putLong("royal_wird_interval_ms", wirdIntervalMs)
            putString("royal_wird_schedule_type", wirdScheduleType)
            putString("royal_wird_fixed_time", wirdFixedTime)
            putString("royal_wird_mode", wirdMode)
            if (!prefs.contains("royal_wird_last_ts")) {
                putLong("royal_wird_last_ts", now)
            }

            putBoolean("royal_parents_enabled", parentsEnabled)
            putLong("royal_parents_interval_ms", parentsIntervalMs)
            putString("royal_parents_schedule_type", parentsScheduleType)
            putString("royal_parents_fixed_time", parentsFixedTime)
            putString("royal_parents_mode", parentsMode)
            if (!prefs.contains("royal_parents_last_ts")) {
                putLong("royal_parents_last_ts", now)
            }
            apply()
        }

        // Schedule next exact alarm
        scheduleNextRoyalAlarm(context)
    }

    /**
     * Calculates the next trigger timestamp (ms) for a given reminder
     */
    private fun getNextTriggerTimeMs(
        now: Long,
        enabled: Boolean,
        scheduleType: String,
        fixedTime: String,
        intervalMs: Long,
        lastTriggeredMs: Long
    ): Long {
        if (!enabled) return Long.MAX_VALUE

        if (scheduleType == "fixed_time") {
            try {
                val parts = fixedTime.split(":")
                val h = parts.getOrNull(0)?.toIntOrNull() ?: 9
                val m = parts.getOrNull(1)?.toIntOrNull() ?: 0

                val cal = Calendar.getInstance().apply {
                    timeInMillis = now
                    set(Calendar.HOUR_OF_DAY, h)
                    set(Calendar.MINUTE, m)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }

                if (cal.timeInMillis <= now) {
                    cal.add(Calendar.DAY_OF_YEAR, 1)
                }
                return cal.timeInMillis
            } catch (e: Exception) {
                return Long.MAX_VALUE
            }
        } else {
            // Interval mode
            val validInterval = if (intervalMs > 0) intervalMs else 3600_000L
            val last = if (lastTriggeredMs > 0) lastTriggeredMs else now
            val next = last + validInterval
            return if (next <= now) now else next
        }
    }

    /**
     * Schedules the next exact AlarmManager event for the earliest due royal reminder.
     */
    fun scheduleNextRoyalAlarm(context: Context) {
        val prefs = getPrefs(context)
        val now = System.currentTimeMillis()

        val ayahEnabled = prefs.getBoolean("royal_ayah_enabled", true)
        val ayahInterval = prefs.getLong("royal_ayah_interval_ms", 7200_000L)
        val ayahSchedule = prefs.getString("royal_ayah_schedule_type", "interval") ?: "interval"
        val ayahFixed = prefs.getString("royal_ayah_fixed_time", "09:00") ?: "09:00"
        val ayahLast = prefs.getLong("royal_ayah_last_ts", now)

        val salawatEnabled = prefs.getBoolean("royal_salawat_enabled", true)
        val salawatInterval = prefs.getLong("royal_salawat_interval_ms", 3600_000L)
        val salawatSchedule = prefs.getString("royal_salawat_schedule_type", "interval") ?: "interval"
        val salawatFixed = prefs.getString("royal_salawat_fixed_time", "14:00") ?: "14:00"
        val salawatLast = prefs.getLong("royal_salawat_last_ts", now)

        val wirdEnabled = prefs.getBoolean("royal_wird_enabled", true)
        val wirdInterval = prefs.getLong("royal_wird_interval_ms", 14400_000L)
        val wirdSchedule = prefs.getString("royal_wird_schedule_type", "interval") ?: "interval"
        val wirdFixed = prefs.getString("royal_wird_fixed_time", "19:00") ?: "19:00"
        val wirdLast = prefs.getLong("royal_wird_last_ts", now)

        val parentsEnabled = prefs.getBoolean("royal_parents_enabled", true)
        val parentsInterval = prefs.getLong("royal_parents_interval_ms", 86400_000L)
        val parentsSchedule = prefs.getString("royal_parents_schedule_type", "interval") ?: "interval"
        val parentsFixed = prefs.getString("royal_parents_fixed_time", "17:00") ?: "17:00"
        val parentsLast = prefs.getLong("royal_parents_last_ts", now)

        val times = listOf(
            getNextTriggerTimeMs(now, ayahEnabled, ayahSchedule, ayahFixed, ayahInterval, ayahLast),
            getNextTriggerTimeMs(now, salawatEnabled, salawatSchedule, salawatFixed, salawatInterval, salawatLast),
            getNextTriggerTimeMs(now, wirdEnabled, wirdSchedule, wirdFixed, wirdInterval, wirdLast),
            getNextTriggerTimeMs(now, parentsEnabled, parentsSchedule, parentsFixed, parentsInterval, parentsLast)
        )

        val earliest = times.minOrNull() ?: Long.MAX_VALUE
        if (earliest == Long.MAX_VALUE) {
            Log.d(TAG, "No royal reminders are scheduled.")
            return
        }

        val targetMs = earliest.coerceAtLeast(now + 1000L)

        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val intent = Intent(context, AtharPrayerAlarmReceiver::class.java).apply {
                action = ACTION_ROYAL_ALARM
            }
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            val pendingIntent = PendingIntent.getBroadcast(context, ROYAL_ALARM_REQ_CODE, intent, flags)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, targetMs, pendingIntent)
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, targetMs, pendingIntent)
            }
            Log.i(TAG, "Scheduled next royal alarm in ${(targetMs - now) / 1000} seconds")
        } catch (e: Exception) {
            Log.e(TAG, "Error scheduling royal alarm: ${e.message}", e)
        }
    }

    /**
     * Checks if any royal reminder is due and triggers it.
     * Called by AtharPrayerAlarmReceiver and AthanForegroundService countdown ticker.
     */
    fun checkAndTriggerDueReminders(context: Context) {
        val prefs = getPrefs(context)
        val now = System.currentTimeMillis()

        // 1. Ayah
        val ayahEnabled = prefs.getBoolean("royal_ayah_enabled", true)
        val ayahInterval = prefs.getLong("royal_ayah_interval_ms", 7200_000L)
        val ayahSchedule = prefs.getString("royal_ayah_schedule_type", "interval") ?: "interval"
        val ayahFixed = prefs.getString("royal_ayah_fixed_time", "09:00") ?: "09:00"
        val ayahLast = prefs.getLong("royal_ayah_last_ts", 0L)
        val ayahNext = getNextTriggerTimeMs(now, ayahEnabled, ayahSchedule, ayahFixed, ayahInterval, ayahLast)

        if (ayahEnabled && now >= ayahNext && ayahLast > 0 && (now - ayahLast >= 4000L)) {
            prefs.edit().putLong("royal_ayah_last_ts", now).apply()
            triggerAyahOverlay(context)
        }

        // 2. Salawat
        val salawatEnabled = prefs.getBoolean("royal_salawat_enabled", true)
        val salawatInterval = prefs.getLong("royal_salawat_interval_ms", 3600_000L)
        val salawatSchedule = prefs.getString("royal_salawat_schedule_type", "interval") ?: "interval"
        val salawatFixed = prefs.getString("royal_salawat_fixed_time", "14:00") ?: "14:00"
        val salawatLast = prefs.getLong("royal_salawat_last_ts", 0L)
        val salawatNext = getNextTriggerTimeMs(now, salawatEnabled, salawatSchedule, salawatFixed, salawatInterval, salawatLast)

        if (salawatEnabled && now >= salawatNext && salawatLast > 0 && (now - salawatLast >= 4000L)) {
            prefs.edit().putLong("royal_salawat_last_ts", now).apply()
            triggerSalawatOverlay(context)
        }

        // 3. Daily Wird
        val wirdEnabled = prefs.getBoolean("royal_wird_enabled", true)
        val wirdInterval = prefs.getLong("royal_wird_interval_ms", 14400_000L)
        val wirdSchedule = prefs.getString("royal_wird_schedule_type", "interval") ?: "interval"
        val wirdFixed = prefs.getString("royal_wird_fixed_time", "19:00") ?: "19:00"
        val wirdLast = prefs.getLong("royal_wird_last_ts", 0L)
        val wirdNext = getNextTriggerTimeMs(now, wirdEnabled, wirdSchedule, wirdFixed, wirdInterval, wirdLast)

        if (wirdEnabled && now >= wirdNext && wirdLast > 0 && (now - wirdLast >= 4000L)) {
            prefs.edit().putLong("royal_wird_last_ts", now).apply()
            triggerWirdOverlay(context)
        }

        // 4. Parents
        val parentsEnabled = prefs.getBoolean("royal_parents_enabled", true)
        val parentsInterval = prefs.getLong("royal_parents_interval_ms", 86400_000L)
        val parentsSchedule = prefs.getString("royal_parents_schedule_type", "interval") ?: "interval"
        val parentsFixed = prefs.getString("royal_parents_fixed_time", "17:00") ?: "17:00"
        val parentsLast = prefs.getLong("royal_parents_last_ts", 0L)
        val parentsNext = getNextTriggerTimeMs(now, parentsEnabled, parentsSchedule, parentsFixed, parentsInterval, parentsLast)

        if (parentsEnabled && now >= parentsNext && parentsLast > 0 && (now - parentsLast >= 4000L)) {
            prefs.edit().putLong("royal_parents_last_ts", now).apply()
            triggerParentsOverlay(context)
        }

        // Re-schedule next exact alarm
        scheduleNextRoyalAlarm(context)
    }

    private fun triggerAyahOverlay(context: Context) {
        AtharFloatingWindowService.showOverlay(
            context = context,
            title = "سورة البقرة • الآية ٢٥٥",
            body = "«اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ»",
            badge = "📖 اقرأ ولو آية (آية واحدة مباركة)",
            category = "quran_ayah",
            audioUrl = "/audio/quran_sample.mp3",
            playSound = true,
            surahNumber = 2,
            ayahNumber = 255,
            actionText = "فتح الآية في المصحف 📖",
            autoDismissSeconds = 15,
            playbackMode = "notification_and_sound"
        )
    }

    private fun triggerSalawatOverlay(context: Context) {
        AtharFloatingWindowService.showOverlay(
            context = context,
            title = "الصلاة على النبي ﷺ والذكر",
            body = "«اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ»",
            badge = "📿 ذكر الله والصلاة على النبي ﷺ",
            category = "salawat",
            audioUrl = "/audio/salawat.mp3",
            playSound = true,
            surahNumber = 0,
            ayahNumber = 0,
            actionText = "فتح المسبحة والأذكار 📿",
            autoDismissSeconds = 15,
            playbackMode = "notification_and_sound"
        )
    }

    private fun triggerWirdOverlay(context: Context) {
        AtharFloatingWindowService.showOverlay(
            context = context,
            title = "حان موعد وردك القرآني المبارك",
            body = "«إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ»\nجدد عهدك مع كتاب الله واقرأ حزبك اليومي لتنال السكينة والبركة.",
            badge = "📜 الورد القرآني اليومي",
            category = "quran_wird",
            audioUrl = "/audio/wird.mp3",
            playSound = true,
            surahNumber = 0,
            ayahNumber = 0,
            actionText = "متابعة الورد في المصحف 📖",
            autoDismissSeconds = 15,
            playbackMode = "notification_and_sound"
        )
    }

    private fun triggerParentsOverlay(context: Context) {
        AtharFloatingWindowService.showOverlay(
            context = context,
            title = "وقل رب ارحمهما كما ربياني صغيرا",
            body = "تذكير نبوي ببر الوالدين والدعاء لهما وصلة رحمهما، أحب الأعمال إلى الله تعالى بعد الصلاة على وقتها.",
            badge = "🤍 بر الوالدين والإحسان",
            category = "parents_duty",
            audioUrl = "/audio/parents.mp3",
            playSound = true,
            surahNumber = 0,
            ayahNumber = 0,
            actionText = "دعاء وبر الوالدين 🤲",
            autoDismissSeconds = 15,
            playbackMode = "notification_and_sound"
        )
    }
}
