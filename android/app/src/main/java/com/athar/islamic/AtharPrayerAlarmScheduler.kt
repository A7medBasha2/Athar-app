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

    private fun triggerAyahOverlay(context: Context) {
        val prefs = getPrefs(context)
        val ayahMode = prefs.getString("royal_ayah_mode", "notification_and_sound") ?: "notification_and_sound"
        val isSoundMode = (ayahMode == "notification_and_sound")
        val isPlayActionMode = (ayahMode == "notification_with_play_action")

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
        val isSoundMode = (salawatMode == "notification_and_sound")

        AtharFloatingWindowService.showOverlay(
            context = context,
            title = "الصلاة على النبي ﷺ والذكر",
            body = "«اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ»",
            badge = "📿 ذكر الله والصلاة على النبي ﷺ",
            category = "salawat",
            audioUrl = if (salawatMode == "notification_only") "" else "/audio/salawat.mp3",
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
        val isSoundMode = (wirdMode == "notification_and_sound")

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
        val isSoundMode = (parentsMode == "notification_and_sound")

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
