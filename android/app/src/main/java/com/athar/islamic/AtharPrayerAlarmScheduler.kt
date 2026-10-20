package com.athar.islamic

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.util.Log
import java.util.Calendar

import org.json.JSONArray
import org.json.JSONObject

object AtharPrayerAlarmScheduler {

    private const val TAG = "AtharRoyalScheduler"
    const val PREFS_NAME = "AtharNotificationSettings"
    const val ACTION_ROYAL_ALARM = "com.athar.islamic.ACTION_ROYAL_ALARM"
    const val ACTION_PRAYER_ALARM = "com.athar.islamic.ACTION_PRAYER_ALARM"
    const val KEY_SAVED_PRAYER_SCHEDULE = "saved_prayer_alarms_json"
    private const val ROYAL_ALARM_REQ_CODE = 88991

    const val REQ_CODE_FAJR = 91001
    const val REQ_CODE_DHUHR = 91002
    const val REQ_CODE_ASR = 91003
    const val REQ_CODE_MAGHRIB = 91004
    const val REQ_CODE_ISHA = 91005

    fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun getPrayerRequestCode(prayerId: String): Int {
        val clean = prayerId.lowercase()
        return when {
            clean.contains("fajr") -> REQ_CODE_FAJR
            clean.contains("dhuhr") -> REQ_CODE_DHUHR
            clean.contains("asr") -> REQ_CODE_ASR
            clean.contains("maghrib") -> REQ_CODE_MAGHRIB
            clean.contains("isha") -> REQ_CODE_ISHA
            else -> 91000 + (prayerId.hashCode() and 0x7FFF)
        }
    }

    /**
     * Schedules the 5 daily prayer alarms accurately using AlarmManager.
     * Prevents duplicate alarms with stable request codes and FLAG_UPDATE_CURRENT.
     */
    fun schedulePrayerAlarms(context: Context, prayersJson: String): Boolean {
        if (prayersJson.isNullOrBlank()) return false
        val prefs = getPrefs(context)
        prefs.edit().putString(KEY_SAVED_PRAYER_SCHEDULE, prayersJson).apply()

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return false
        val now = System.currentTimeMillis()
        var scheduledCount = 0

        try {
            val arr = JSONArray(prayersJson)
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                val id = obj.optString("id", "")
                val name = obj.optString("name", "الصلاة")
                val time = obj.optString("time", "")
                val timestamp = obj.optLong("timestamp", 0L)
                val audioUrl = obj.optString("audioUrl", "")

                // Only schedule alarms in the future (> 1 second ahead)
                if (timestamp > now + 1000L) {
                    val reqCode = getPrayerRequestCode(id)
                    val intent = Intent(context, AtharPrayerAlarmReceiver::class.java).apply {
                        action = ACTION_PRAYER_ALARM
                        putExtra("prayer_id", id)
                        putExtra("prayer_name", name)
                        putExtra("prayer_time", time)
                        putExtra("audio_url", audioUrl)
                        putExtra("scheduled_epoch_ms", timestamp)
                    }

                    val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
                    val pendingIntent = PendingIntent.getBroadcast(context, reqCode, intent, flags)

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        val showIntent = Intent(context, MainActivity::class.java).apply {
                            action = "OPEN_ATHAN_FULLSCREEN"
                            putExtra("prayer_name", name)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                        }
                        val showPendingIntent = PendingIntent.getActivity(context, reqCode + 500, showIntent, flags)
                        val clockInfo = AlarmManager.AlarmClockInfo(timestamp, showPendingIntent)
                        alarmManager.setAlarmClock(clockInfo, pendingIntent)
                    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pendingIntent)
                    } else {
                        alarmManager.setExact(AlarmManager.RTC_WAKEUP, timestamp, pendingIntent)
                    }
                    scheduledCount++
                }
            }
            Log.i(TAG, "Successfully scheduled $scheduledCount prayer alarms via AlarmManager")
            return true
        } catch (e: Exception) {
            Log.e(TAG, "Error scheduling prayer alarms: ${e.message}", e)
            return false
        }
    }

    /**
     * Reschedules prayer alarms from the persisted schedule (e.g. after reboot, time change)
     */
    fun rescheduleSavedPrayers(context: Context) {
        val prefs = getPrefs(context)
        val json = prefs.getString(KEY_SAVED_PRAYER_SCHEDULE, null)
        if (!json.isNullOrBlank()) {
            schedulePrayerAlarms(context, json)
        }
    }

    /**
     * Cancels all scheduled prayer alarms
     */
    fun cancelPrayerAlarms(context: Context) {
        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            val prayerIds = listOf("fajr", "dhuhr", "asr", "maghrib", "isha")
            for (pId in prayerIds) {
                val reqCode = getPrayerRequestCode(pId)
                val intent = Intent(context, AtharPrayerAlarmReceiver::class.java).apply {
                    action = ACTION_PRAYER_ALARM
                }
                val pendingIntent = PendingIntent.getBroadcast(context, reqCode, intent, flags)
                alarmManager.cancel(pendingIntent)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error cancelling prayer alarms: ${e.message}", e)
        }
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
            cancelPrayerAlarms(context)
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
        parentsMode: String,
        ayahReciterId: String = "alafasy"
    ) {
        val prefs = getPrefs(context)
        val now = System.currentTimeMillis()

        prefs.edit().apply {
            putBoolean("royal_ayah_enabled", ayahEnabled)
            putLong("royal_ayah_interval_ms", ayahIntervalMs)
            putString("royal_ayah_schedule_type", ayahScheduleType)
            putString("royal_ayah_fixed_time", ayahFixedTime)
            putString("royal_ayah_mode", ayahMode)
            putString("royal_ayah_reciter_id", ayahReciterId)
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

    private val isCheckingReminders = java.util.concurrent.atomic.AtomicBoolean(false)
    private var lastGlobalTriggerTs = 0L

    /**
     * Checks if any royal reminder is due and triggers it.
     * Protected by an atomic lock and debounce interval to prevent race conditions or duplicate overlays.
     */
    fun checkAndTriggerDueReminders(context: Context) {
        if (!isCheckingReminders.compareAndSet(false, true)) {
            Log.w(TAG, "checkAndTriggerDueReminders already running; skipping concurrent execution.")
            return
        }

        try {
            val now = System.currentTimeMillis()
            if (now - lastGlobalTriggerTs < 10_000L) {
                Log.d(TAG, "Debounce active: reminder triggered less than 10 seconds ago. Skipping.")
                return
            }

            val prefs = getPrefs(context)
            var anyTriggered = false

            // 1. Ayah
            val ayahEnabled = prefs.getBoolean("royal_ayah_enabled", true)
            val ayahInterval = prefs.getLong("royal_ayah_interval_ms", 7200_000L)
            val ayahSchedule = prefs.getString("royal_ayah_schedule_type", "interval") ?: "interval"
            val ayahFixed = prefs.getString("royal_ayah_fixed_time", "09:00") ?: "09:00"
            val ayahLast = prefs.getLong("royal_ayah_last_ts", 0L)
            val ayahNext = getNextTriggerTimeMs(now, ayahEnabled, ayahSchedule, ayahFixed, ayahInterval, ayahLast)

            if (ayahEnabled && now >= ayahNext && ayahLast > 0 && (now - ayahLast >= 30_000L)) {
                prefs.edit().putLong("royal_ayah_last_ts", now).apply()
                anyTriggered = true
                triggerAyahOverlay(context)
            }

            // 2. Salawat
            val salawatEnabled = prefs.getBoolean("royal_salawat_enabled", true)
            val salawatInterval = prefs.getLong("royal_salawat_interval_ms", 3600_000L)
            val salawatSchedule = prefs.getString("royal_salawat_schedule_type", "interval") ?: "interval"
            val salawatFixed = prefs.getString("royal_salawat_fixed_time", "14:00") ?: "14:00"
            val salawatLast = prefs.getLong("royal_salawat_last_ts", 0L)
            val salawatNext = getNextTriggerTimeMs(now, salawatEnabled, salawatSchedule, salawatFixed, salawatInterval, salawatLast)

            if (salawatEnabled && now >= salawatNext && salawatLast > 0 && (now - salawatLast >= 30_000L)) {
                prefs.edit().putLong("royal_salawat_last_ts", now).apply()
                anyTriggered = true
                triggerSalawatOverlay(context)
            }

            // 3. Daily Wird
            val wirdEnabled = prefs.getBoolean("royal_wird_enabled", true)
            val wirdInterval = prefs.getLong("royal_wird_interval_ms", 14400_000L)
            val wirdSchedule = prefs.getString("royal_wird_schedule_type", "interval") ?: "interval"
            val wirdFixed = prefs.getString("royal_wird_fixed_time", "19:00") ?: "19:00"
            val wirdLast = prefs.getLong("royal_wird_last_ts", 0L)
            val wirdNext = getNextTriggerTimeMs(now, wirdEnabled, wirdSchedule, wirdFixed, wirdInterval, wirdLast)

            if (wirdEnabled && now >= wirdNext && wirdLast > 0 && (now - wirdLast >= 30_000L)) {
                prefs.edit().putLong("royal_wird_last_ts", now).apply()
                anyTriggered = true
                triggerWirdOverlay(context)
            }

            // 4. Parents
            val parentsEnabled = prefs.getBoolean("royal_parents_enabled", true)
            val parentsInterval = prefs.getLong("royal_parents_interval_ms", 86400_000L)
            val parentsSchedule = prefs.getString("royal_parents_schedule_type", "interval") ?: "interval"
            val parentsFixed = prefs.getString("royal_parents_fixed_time", "17:00") ?: "17:00"
            val parentsLast = prefs.getLong("royal_parents_last_ts", 0L)
            val parentsNext = getNextTriggerTimeMs(now, parentsEnabled, parentsSchedule, parentsFixed, parentsInterval, parentsLast)

            if (parentsEnabled && now >= parentsNext && parentsLast > 0 && (now - parentsLast >= 30_000L)) {
                prefs.edit().putLong("royal_parents_last_ts", now).apply()
                anyTriggered = true
                triggerParentsOverlay(context)
            }

            if (anyTriggered) {
                lastGlobalTriggerTs = now
            }

            // Re-schedule next exact alarm
            scheduleNextRoyalAlarm(context)
        } finally {
            isCheckingReminders.set(false)
        }
    }

    data class RoyalVerseItem(
        val surahNumber: Int,
        val ayahNumber: Int,
        val surahName: String,
        val text: String,
        val audioUrl: String
    )

    // Curated collection of impactful verses with 100% verified text and authentic audio
    private val ROYAL_VERSES_POOL = listOf(
        RoyalVerseItem(
            17, 9, "الإسراء",
            "«إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ وَيُبَشِّرُ الْمُؤْمِنِينَ الَّذِينَ يَعْمَلُونَ الصَّالِحَاتِ أَنَّ لَهُمْ أَجْرًا كَبِيرًا»",
            "https://everyayah.com/data/Alafasy_128kbps/017009.mp3"
        ),
        RoyalVerseItem(
            2, 255, "البقرة",
            "«اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ»",
            "https://everyayah.com/data/Alafasy_128kbps/002255.mp3"
        ),
        RoyalVerseItem(
            2, 186, "البقرة",
            "«وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ ۖ فَلْيَسْتَجِيبُوا لِي وَلْيُؤْمِنُوا بِي لَعَلَّهُمْ يَرْشُدُونَ»",
            "https://everyayah.com/data/Alafasy_128kbps/002186.mp3"
        ),
        RoyalVerseItem(
            2, 286, "البقرة",
            "«لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ ۗ رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا»",
            "https://everyayah.com/data/Alafasy_128kbps/002286.mp3"
        ),
        RoyalVerseItem(
            3, 173, "آل عمران",
            "«الَّذِينَ قَالَ لَهُمُ النَّاسُ إِنَّ النَّاسَ قَدْ جَمَعُوا لَكُمْ فَاخْشَوْهُمْ فَزَادَهُمْ إِيمَانًا وَقَالُوا حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ»",
            "https://everyayah.com/data/Alafasy_128kbps/003173.mp3"
        ),
        RoyalVerseItem(
            13, 28, "الرعد",
            "«الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ»",
            "https://everyayah.com/data/Alafasy_128kbps/013028.mp3"
        ),
        RoyalVerseItem(
            14, 7, "إبراهيم",
            "«وَإِذْ تَأَذَّنَ رَبُّكُمْ لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ ۖ وَلَئِن كَفَرْتُمْ إِنَّ عَذَابِي لَشَدِيدٌ»",
            "https://everyayah.com/data/Alafasy_128kbps/014007.mp3"
        ),
        RoyalVerseItem(
            21, 87, "الأنبياء",
            "«وَذَا النُّونِ إِذ ذَّهَبَ مُغَاضِبًا فَظَنَّ أَن لَّن نَّقْدِرَ عَلَيْهِ فَنَادَىٰ فِي الظُّلُمَاتِ أَن لَّا إِلَٰهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ»",
            "https://everyayah.com/data/Alafasy_128kbps/021087.mp3"
        ),
        RoyalVerseItem(
            24, 35, "النور",
            "«اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ ۚ مَثَلُ نُورِهِ كَمِشْكَاةٍ فِيهَا مِصْبَاحٌ ۖ الْمِصْبَاحُ فِي زُجَاجَةٍ ۖ الزُّجَاجَةُ كَأَنَّهَا كَوْكَبٌ دُرِّيٌّ»",
            "https://everyayah.com/data/Alafasy_128kbps/024035.mp3"
        ),
        RoyalVerseItem(
            26, 80, "الشعراء",
            "«وَإِذَا مَرِضْتُ فَهُوَ يَشْفِينِ»",
            "https://everyayah.com/data/Alafasy_128kbps/026080.mp3"
        ),
        RoyalVerseItem(
            28, 24, "القصص",
            "«فَسَقَىٰ لَهُمَا ثُمَّ تَوَلَّىٰ إِلَى الظِّلِّ فَقَالَ رَبِّ إِنِّي لِمَا أَنزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ»",
            "https://everyayah.com/data/Alafasy_128kbps/028024.mp3"
        ),
        RoyalVerseItem(
            39, 53, "الزمر",
            "«قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ ۚ إِنَّ اللَّهَ يَغْفِرُ الذُّنُوبَ جَمِيعًا ۚ إِنَّهُ هُوَ الْغَفُورُ الرَّحِيمُ»",
            "https://everyayah.com/data/Alafasy_128kbps/039053.mp3"
        ),
        RoyalVerseItem(
            40, 60, "غافر",
            "«وَقَالَ رَبُّكُمُ ادْعُونِي أَسْتَجِبْ لَكُمْ ۚ إِنَّ الَّذِينَ يَسْتَكْبِرُونَ عَنْ عِبَادَتِي سَيَدْخُلُونَ جَهَنَّمَ دَاخِرِينَ»",
            "https://everyayah.com/data/Alafasy_128kbps/040060.mp3"
        ),
        RoyalVerseItem(
            50, 16, "ق",
            "«وَلَقَدْ خَلَقْنَا الْإِنسَانَ وَنَعْلَمُ مَا تُوَسْوِسُ بِهِ نَفْسُهُ ۖ وَنَحْنُ أَقْرَبُ إِلَيْهِ مِنْ حَبْلِ الْوَرِيدِ»",
            "https://everyayah.com/data/Alafasy_128kbps/050016.mp3"
        ),
        RoyalVerseItem(
            57, 4, "الحديد",
            "«هُوَ الَّذِي خَلَقَ السَّمَاوَاتِ وَالْأَرْضَ فِي سِتَّةِ أَيَّامٍ ثُمَّ اسْتَوَىٰ عَلَى الْعَرْشِ ۚ يَعْلَمُ مَا يَلِجُ فِي الْأَرْضِ وَمَا يَخْرُجُ مِنْهَا ۚ وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ»",
            "https://everyayah.com/data/Alafasy_128kbps/057004.mp3"
        ),
        RoyalVerseItem(
            59, 23, "الحشر",
            "«هُوَ اللَّهُ الَّذِي لَا إِلَٰهَ إِلَّا هُوَ الْمَلِكُ الْقُدُّوسُ السَّلَامُ الْمُؤْمِنُ الْمُهَيْمِنُ الْعَزِيزُ الْجَبَّارُ الْمُتَكَبِّرُ ۚ سُبْحَانَ اللَّهِ عَمَّا يُشْرِكُونَ»",
            "https://everyayah.com/data/Alafasy_128kbps/059023.mp3"
        ),
        RoyalVerseItem(
            65, 3, "الطلاق",
            "«وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ ۚ وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ ۚ إِنَّ اللَّهَ بَالِغُ أَمْرِهِ ۚ قَدْ جَعَلَ اللَّهُ لِكُلِّ شَيْءٍ قَدْرًا»",
            "https://everyayah.com/data/Alafasy_128kbps/065003.mp3"
        ),
        RoyalVerseItem(
            94, 5, "الشرح",
            "«فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۞ إِنَّ مَعَ الْعُسْرِ يُسْرًا ۞ فَإِذَا فَرَغْتَ فَانصَبْ ۞ وَإِلَىٰ رَبِّكَ فَارْغَب»",
            "https://everyayah.com/data/Alafasy_128kbps/094005.mp3"
        ),
        RoyalVerseItem(
            93, 3, "الضحى",
            "«مَا وَدَّعَكَ رَبُّكَ وَمَا قَلَىٰ ۞ وَلَلْآخِرَةُ خَيْرٌ لَّكَ مِنَ الْأُولَىٰ ۞ وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ»",
            "https://everyayah.com/data/Alafasy_128kbps/093003.mp3"
        ),
        RoyalVerseItem(
            112, 1, "الإخلاص",
            "«قُلْ هُوَ اللَّهُ أَحَدٌ ۞ اللَّهُ الصَّمَدُ ۞ لَمْ يَلِدْ وَلَمْ يُولَدْ ۞ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ»",
            "https://everyayah.com/data/Alafasy_128kbps/112001.mp3"
        )
    )

    data class RoyalDhikrItem(
        val id: String,
        val title: String,
        val arabicText: String,
        val audioUrl: String,
        val categoryLabel: String
    )

    // Complete verified pool of 14 prophetic adhkar and salawat
    private val ROYAL_DHIKR_POOL = listOf(
        RoyalDhikrItem(
            "subhanallah_adad_khalqih",
            "تذكير بالتسبيح المضاعف بعظمة السماوات والأرض",
            "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ: عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ.",
            "https://raw.githubusercontent.com/rn0x/Adhkar-json/main/audio/94.mp3",
            "تسبيح مضاعف"
        ),
        RoyalDhikrItem(
            "salawat_short_alafasy",
            "صلّوا على النبي ﷺ",
            "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ.",
            "https://raw.githubusercontent.com/rn0x/Adhkar-json/main/audio/98.mp3",
            "الصلاة على النبي ﷺ"
        ),
        RoyalDhikrItem(
            "salawat_ibrahimiyyah",
            "الصلاة الإبراهيمية الكاملة على النبي ﷺ",
            "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ، وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ، وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ.",
            "https://raw.githubusercontent.com/rn0x/Adhkar-json/main/audio/53.mp3",
            "الصلاة على النبي ﷺ"
        ),
        RoyalDhikrItem(
            "kalimatan_habibatan",
            "كلمتان حبيبتان إلى الرحمن ثقيلتان في الميزان",
            "كَلِمَتَانِ خَفِيفَتَانِ عَلَى اللِّسَانِ، ثَقِيلَتَانِ فِي الْمِيزَانِ، حَبِيبَتَانِ إِلَى الرَّحْمَنِ: سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ",
            "https://raw.githubusercontent.com/rn0x/Adhkar-json/main/audio/256.mp3",
            "تسبيح وتعظيم"
        ),
        RoyalDhikrItem(
            "mil_assamawati_wal_ard",
            "حمد الله ملء السماوات وملء الأرض",
            "رَبَّنَا وَلَكَ الْحَمْدُ، مِلْءَ السَّمَاوَاتِ وَمِلْءَ الْأَرْضِ، وَمَا بَيْنَهُمَا، وَمِلْءَ مَا شِئْتَ مِنْ شَيْءٍ بَعْدُ.",
            "https://raw.githubusercontent.com/rn0x/Adhkar-json/main/audio/40.mp3",
            "حمد وثناء"
        ),
        RoyalDhikrItem(
            "baqiyat_salihat",
            "الباقيات الصالحات (أحب الكلام إلى الله)",
            "سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ.",
            "https://raw.githubusercontent.com/rn0x/Adhkar-json/main/audio/265.mp3",
            "الباقيات الصالحات"
        ),
        RoyalDhikrItem(
            "subhanallah_100_sea_foam",
            "سبحان الله وبحمده",
            "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ.",
            "https://raw.githubusercontent.com/rn0x/Adhkar-json/main/audio/91.mp3",
            "تسبيح ومغفرة"
        ),
        RoyalDhikrItem(
            "subhan_dhi_almalakut",
            "تعظيم ذي الجبروت والملكوت والكبرياء",
            "سُبْحَانَ ذِي الْجَبَرُوتِ، وَالْمَلَكُوتِ، وَالْكِبْرِيَاءِ، وَالْعَظَمَةِ.",
            "https://raw.githubusercontent.com/rn0x/Adhkar-json/main/audio/45.mp3",
            "تسبيح وتعظيم"
        ),
        RoyalDhikrItem(
            "la_ilaha_illallah_wahdahu",
            "تهليل وتوحيد رب العالمين",
            "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ.",
            "https://raw.githubusercontent.com/rn0x/Adhkar-json/main/audio/93.mp3",
            "توحيد وتهليل"
        ),
        RoyalDhikrItem(
            "bismillah_alladhi_la_yadurr",
            "ذكر الحفظ في الأرض وفي السماء",
            "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ.",
            "https://raw.githubusercontent.com/rn0x/Adhkar-json/main/audio/86.mp3",
            "تحصين وحفظ"
        ),
        RoyalDhikrItem(
            "astaghfirullah_wa_atubu",
            "الاستغفار والتوبة إلى الله",
            "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ.",
            "https://raw.githubusercontent.com/rn0x/Adhkar-json/main/audio/96.mp3",
            "استغفار وتوبة"
        ),
        RoyalDhikrItem(
            "hasbiyallahu_rabb_alarsh",
            "تفويض الأمر لرب العرش العظيم",
            "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ.",
            "https://raw.githubusercontent.com/rn0x/Adhkar-json/main/audio/83.mp3",
            "توكل وكفاية"
        ),
        RoyalDhikrItem(
            "sayyid_alistighfar",
            "سيد الاستغفار",
            "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ.",
            "https://raw.githubusercontent.com/rn0x/Adhkar-json/main/audio/79.mp3",
            "استغفار وتوبة"
        ),
        RoyalDhikrItem(
            "ya_hayyu_ya_qayyum",
            "الاستغاثة بالحي القيوم",
            "يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ.",
            "https://raw.githubusercontent.com/rn0x/Adhkar-json/main/audio/88.mp3",
            "توكل وكفاية"
        )
    )

    private fun triggerAyahOverlay(context: Context) {
        val prefs = getPrefs(context)
        val ayahMode = prefs.getString("royal_ayah_mode", "notification_and_sound") ?: "notification_and_sound"
        val isSoundMode = (ayahMode == "notification_and_sound" || ayahMode == "sound_only")

        // Non-repeating random selection across the Holy Quran pool
        val lastIndex = prefs.getInt("royal_ayah_pool_index", -1)
        val availableIndices = (0 until ROYAL_VERSES_POOL.size).filter { it != lastIndex }
        val nextIndex = if (availableIndices.isNotEmpty()) {
            availableIndices[(Math.random() * availableIndices.size).toInt()]
        } else {
            (lastIndex + 1) % ROYAL_VERSES_POOL.size
        }
        prefs.edit().putInt("royal_ayah_pool_index", nextIndex).apply()

        val verse = ROYAL_VERSES_POOL[nextIndex]

        val reciterId = prefs.getString("royal_ayah_reciter_id", "alafasy") ?: "alafasy"
        val reciterServer = when (reciterId) {
            "abdulbasit" -> "https://everyayah.com/data/Abdul_Basit_Murattal_192kbps"
            "husary" -> "https://everyayah.com/data/Husary_128kbps"
            "ghamadi" -> "https://everyayah.com/data/Ghamadi_40kbps"
            "shatri" -> "https://everyayah.com/data/Abu_Bakr_Ash-Shaatree_128kbps"
            else -> "https://everyayah.com/data/Alafasy_128kbps"
        }
        val sNum = String.format("%03d", verse.surahNumber)
        val aNum = String.format("%03d", verse.ayahNumber)
        val matchedAudioUrl = "$reciterServer/$sNum$aNum.mp3"

        AtharFloatingWindowService.showOverlay(
            context = context,
            title = "سورة ${verse.surahName} • الآية ${verse.ayahNumber}",
            body = verse.text,
            badge = "📖 اقرأ ولو آية (آية واحدة مباركة)",
            category = "quran_ayah",
            audioUrl = if (ayahMode == "notification_only") "" else matchedAudioUrl,
            playSound = isSoundMode,
            surahNumber = verse.surahNumber,
            ayahNumber = verse.ayahNumber,
            actionText = "📖 فتح الآية وتظليلها في المصحف",
            autoDismissSeconds = 15,
            playbackMode = ayahMode
        )
    }

    private fun triggerSalawatOverlay(context: Context) {
        val prefs = getPrefs(context)
        val salawatMode = prefs.getString("royal_salawat_mode", "notification_and_sound") ?: "notification_and_sound"
        val isSoundMode = (salawatMode == "notification_and_sound" || salawatMode == "sound_only")

        // Non-repeating random selection across the 14 verified Adhkar & Salawat pool
        val lastIndex = prefs.getInt("royal_dhikr_pool_index", -1)
        val availableIndices = (0 until ROYAL_DHIKR_POOL.size).filter { it != lastIndex }
        val nextIndex = if (availableIndices.isNotEmpty()) {
            availableIndices[(Math.random() * availableIndices.size).toInt()]
        } else {
            (lastIndex + 1) % ROYAL_DHIKR_POOL.size
        }
        prefs.edit().putInt("royal_dhikr_pool_index", nextIndex).apply()
        val dhikr = ROYAL_DHIKR_POOL[nextIndex]

        AtharFloatingWindowService.showOverlay(
            context = context,
            title = dhikr.title,
            body = dhikr.arabicText,
            badge = "📿 ذكر الله والصلاة على النبي ﷺ",
            category = "salawat",
            audioUrl = if (salawatMode == "notification_only") "" else dhikr.audioUrl,
            playSound = isSoundMode,
            surahNumber = 0,
            ayahNumber = 0,
            actionText = "📿 فتح المسبحة والأذكار",
            autoDismissSeconds = 15,
            playbackMode = salawatMode
        )
    }

    private fun triggerWirdOverlay(context: Context) {
        val prefs = getPrefs(context)
        val wirdMode = prefs.getString("royal_wird_mode", "notification_and_sound") ?: "notification_and_sound"
        val isSoundMode = (wirdMode == "notification_and_sound" || wirdMode == "sound_only")

        AtharFloatingWindowService.showOverlay(
            context = context,
            title = "حان موعد وردك القرآني المبارك",
            body = "«إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ»\nجدد عهدك مع كتاب الله واقرأ حزبك اليومي لتنال السكينة والبركة.",
            badge = "📜 الورد القرآني اليومي",
            category = "quran_wird",
            audioUrl = if (wirdMode == "notification_only") "" else "/audio/wird.mp3",
            playSound = isSoundMode,
            surahNumber = 0,
            ayahNumber = 0,
            actionText = "📜 صفحة الورد القرآني والختمة",
            autoDismissSeconds = 15,
            playbackMode = wirdMode
        )
    }

    private fun triggerParentsOverlay(context: Context) {
        val prefs = getPrefs(context)
        val parentsMode = prefs.getString("royal_parents_mode", "notification_and_sound") ?: "notification_and_sound"
        val isSoundMode = (parentsMode == "notification_and_sound" || parentsMode == "sound_only")

        AtharFloatingWindowService.showOverlay(
            context = context,
            title = "وقل رب ارحمهما كما ربياني صغيرا",
            body = "تذكير نبوي ببر الوالدين والدعاء لهما وصلة رحمهما، أحب الأعمال إلى الله تعالى بعد الصلاة على وقتها.",
            badge = "🤍 بر الوالدين والإحسان",
            category = "parents_duty",
            audioUrl = if (parentsMode == "notification_only") "" else "/audio/parents.mp3",
            playSound = isSoundMode,
            surahNumber = 0,
            ayahNumber = 0,
            actionText = "🤍 صفحة بر الوالدين وصلة الرحم",
            autoDismissSeconds = 15,
            playbackMode = parentsMode
        )
    }
}
