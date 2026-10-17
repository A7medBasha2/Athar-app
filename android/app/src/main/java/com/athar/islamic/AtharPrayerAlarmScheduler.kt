package com.athar.islamic

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject

/**
 * AtharPrayerAlarmScheduler
 * Schedules exact alarms using Android AlarmManager.setAlarmClock (or setExactAndAllowWhileIdle)
 * to guarantee that prayer Adhans trigger precisely on time across all Android versions and OEM ROMs.
 */
object AtharPrayerAlarmScheduler {

    const val PREFS_NAME = "AtharPrayerAlarms"
    const val KEY_SCHEDULED_PRAYERS = "scheduled_prayers_json"

    const val KEY_SCHEDULED_ROYAL_ALARMS = "scheduled_royal_alarms_json"

    fun schedulePrayers(context: Context, prayersJsonArrayString: String) {
        var prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_SCHEDULED_PRAYERS, prayersJsonArrayString).apply()

        rescheduleNextAlarms(context)
    }

    fun scheduleRoyalAlarms(context: Context, royalAlarmsJsonArrayString: String) {
        var prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_SCHEDULED_ROYAL_ALARMS, royalAlarmsJsonArrayString).apply()

        rescheduleNextRoyalAlarms(context)
    }

    fun rescheduleNextAlarms(context: Context) {
        var prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        var rawJson = prefs.getString(KEY_SCHEDULED_PRAYERS, null) ?: return

        var alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        var nowMs = System.currentTimeMillis()

        try {
            var jsonArray = JSONArray(rawJson)
            for (i in 0 until jsonArray.length()) {
                var obj = jsonArray.getJSONObject(i)
                var prayerId = obj.optString("id", "fajr")
                var prayerName = obj.optString("name", "صلاة الفجر")
                var prayerTime = obj.optString("time", "05:15")
                var triggerTimeMs = obj.optLong("timestamp", 0L)
                var audioUrl = obj.optString("audioUrl", "")

                // Only schedule upcoming alarms with a 1-second margin
                if (triggerTimeMs > nowMs + 1000L) {
                    var requestCode = ((triggerTimeMs / 1000) % 1000000).toInt() + i

                    var intent = Intent(context, AtharPrayerAlarmReceiver::class.java).apply {
                        action = AtharPrayerAlarmReceiver.ACTION_PRAYER_ALARM
                        putExtra("prayer_id", prayerId)
                        putExtra("prayer_name", prayerName)
                        putExtra("prayer_time", prayerTime)
                        if (audioUrl.isNotBlank()) putExtra("audio_url", audioUrl)
                    }

                    var pendingIntent = PendingIntent.getBroadcast(
                        context,
                        requestCode,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
                    )

                    var showIntent = Intent(context, MainActivity::class.java).apply {
                        action = "com.athar.islamic.ACTION_ATHAN_FULLSCREEN"
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                        putExtra("action", "com.athar.islamic.ACTION_ATHAN_FULLSCREEN")
                        putExtra("prayer_id", prayerId)
                        putExtra("prayer_name", prayerName)
                        putExtra("prayer_time", prayerTime)
                        putExtra("notification_category", "prayer_athan")
                        putExtra("launch_royal_adhan", prayerName)
                    }
                    var showPendingIntent = PendingIntent.getActivity(
                        context,
                        requestCode + 50000,
                        showIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
                    )

                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                            var clockInfo = AlarmManager.AlarmClockInfo(triggerTimeMs, showPendingIntent)
                            alarmManager.setAlarmClock(clockInfo, pendingIntent)
                        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTimeMs, pendingIntent)
                        } else {
                            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTimeMs, pendingIntent)
                        }
                    } catch (ex: Exception) {
                        try {
                            alarmManager.set(AlarmManager.RTC_WAKEUP, triggerTimeMs, pendingIntent)
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun rescheduleNextRoyalAlarms(context: Context) {
        var prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        var rawJson = prefs.getString(KEY_SCHEDULED_ROYAL_ALARMS, null) ?: return

        var alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        var nowMs = System.currentTimeMillis()

        try {
            var jsonArray = JSONArray(rawJson)
            for (i in 0 until jsonArray.length()) {
                var obj = jsonArray.getJSONObject(i)
                var alarmId = obj.optString("id", "royal_$i")
                var type = obj.optString("type", "dhikr_salawat")
                var title = obj.optString("title", "تنبيه أثر الملكي")
                var body = obj.optString("body", "")
                var badge = obj.optString("badge", "🕌 تنبيه أثر الملكي")
                var category = obj.optString("category", AtharNotificationManager.CAT_DHIKR_TASBEEH)
                var audioUrl = obj.optString("audioUrl", "")
                var triggerTimeMs = obj.optLong("timestamp", 0L)
                var surahNumber = obj.optInt("surahNumber", 0)
                var ayahNumber = obj.optInt("ayahNumber", 0)
                var adhkarCategory = obj.optString("adhkarCategory", "")
                var playSound = obj.optBoolean("playSound", true)

                // Only schedule upcoming alarms with a 1-second margin
                if (triggerTimeMs > nowMs + 1000L) {
                    var requestCode = ((triggerTimeMs / 1000) % 1000000).toInt() + 100000 + i

                    var intent = Intent(context, AtharPrayerAlarmReceiver::class.java).apply {
                        action = AtharPrayerAlarmReceiver.ACTION_ROYAL_ALARM
                        putExtra("alarm_id", alarmId)
                        putExtra("type", type)
                        putExtra("title", title)
                        putExtra("body", body)
                        putExtra("badge", badge)
                        putExtra("category", category)
                        putExtra("audio_url", audioUrl)
                        putExtra("surah_number", surahNumber)
                        putExtra("ayah_number", ayahNumber)
                        putExtra("adhkar_category", adhkarCategory)
                        putExtra("play_sound", playSound)
                    }

                    var pendingIntent = PendingIntent.getBroadcast(
                        context,
                        requestCode,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
                    )

                    var showIntent = Intent(context, MainActivity::class.java).apply {
                        action = "com.athar.islamic.ACTION_DEEP_LINK"
                        data = android.net.Uri.parse("athar://royal-alert/$type?id=$alarmId&cat=$category&s=$surahNumber&a=$ayahNumber&adhkar_cat=$adhkarCategory&ts=$triggerTimeMs")
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                        putExtra("action", "com.athar.islamic.ACTION_DEEP_LINK")
                        putExtra("open_royal_alert", true)
                        putExtra("alert_type", type)
                        putExtra("alert_title", title)
                        putExtra("alert_body", body)
                        putExtra("badge", badge)
                        putExtra("notification_category", category)
                        putExtra("category", category)
                        putExtra("audio_url", audioUrl)
                        putExtra("surah_number", surahNumber)
                        putExtra("ayah_number", ayahNumber)
                        putExtra("adhkar_category", adhkarCategory)
                        putExtra("play_sound", playSound)
                    }
                    var showPendingIntent = PendingIntent.getActivity(
                        context,
                        requestCode + 50000,
                        showIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
                    )

                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                            var clockInfo = AlarmManager.AlarmClockInfo(triggerTimeMs, showPendingIntent)
                            alarmManager.setAlarmClock(clockInfo, pendingIntent)
                        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTimeMs, pendingIntent)
                        } else {
                            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTimeMs, pendingIntent)
                        }
                    } catch (ex: Exception) {
                        try {
                            alarmManager.set(AlarmManager.RTC_WAKEUP, triggerTimeMs, pendingIntent)
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
