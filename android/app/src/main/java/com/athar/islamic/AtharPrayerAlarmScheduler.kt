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

    fun schedulePrayers(context: Context, prayersJsonArrayString: String) {
        var prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_SCHEDULED_PRAYERS, prayersJsonArrayString).apply()

        rescheduleNextAlarms(context)
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
                        action = "OPEN_ATHAN_FULLSCREEN"
                        putExtra("prayer_name", prayerName)
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
