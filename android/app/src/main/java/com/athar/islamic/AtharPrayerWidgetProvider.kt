package com.athar.islamic

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.widget.RemoteViews

class AtharPrayerWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        const val PREFS_NAME = "AtharWidgetPrefs"
        const val KEY_NEXT_PRAYER = "next_prayer_name"
        const val KEY_NEXT_TIME = "next_prayer_time"
        const val KEY_REMAINING = "remaining_time"
        const val KEY_FAJR = "fajr_time"
        const val KEY_DHUHR = "dhuhr_time"
        const val KEY_ASR = "asr_time"
        const val KEY_MAGHRIB = "maghrib_time"
        const val KEY_ISHA = "isha_time"
        const val KEY_HIJRI_DATE = "hijri_date"

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val nextPrayer = prefs.getString(KEY_NEXT_PRAYER, "صلاة الفجر") ?: "صلاة الفجر"
            val nextTime = prefs.getString(KEY_NEXT_TIME, "05:15") ?: "05:15"
            val remaining = prefs.getString(KEY_REMAINING, "متبقي على الصلاة") ?: "متبقي على الصلاة"
            val fajr = prefs.getString(KEY_FAJR, "05:15") ?: "05:15"
            val dhuhr = prefs.getString(KEY_DHUHR, "12:00") ?: "12:00"
            val asr = prefs.getString(KEY_ASR, "15:15") ?: "15:15"
            val maghrib = prefs.getString(KEY_MAGHRIB, "17:50") ?: "17:50"
            val isha = prefs.getString(KEY_ISHA, "19:20") ?: "19:20"
            val hijriDate = prefs.getString(KEY_HIJRI_DATE, "أثر | مواقيت الصلاة") ?: "أثر | مواقيت الصلاة"

            val views = RemoteViews(context.packageName, R.layout.widget_prayer_times).apply {
                setTextViewText(R.id.tvWidgetNextPrayer, nextPrayer)
                setTextViewText(R.id.tvWidgetNextTime, nextTime)
                setTextViewText(R.id.tvWidgetRemaining, remaining)
                setTextViewText(R.id.tvWidgetFajr, fajr)
                setTextViewText(R.id.tvWidgetDhuhr, dhuhr)
                setTextViewText(R.id.tvWidgetAsr, asr)
                setTextViewText(R.id.tvWidgetMaghrib, maghrib)
                setTextViewText(R.id.tvWidgetIsha, isha)
                setTextViewText(R.id.tvWidgetDate, hijriDate)

                // Click widget opens Athar App
                val intent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
                val pendingIntent = PendingIntent.getActivity(
                    context,
                    2001,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
                )
                setOnClickPendingIntent(R.id.widgetRootLayout, pendingIntent)
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        fun pushPrayerData(
            context: Context,
            nextPrayer: String,
            nextTime: String,
            remaining: String,
            fajr: String,
            dhuhr: String,
            asr: String,
            maghrib: String,
            isha: String,
            hijriDate: String
        ) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().apply {
                putString(KEY_NEXT_PRAYER, nextPrayer)
                putString(KEY_NEXT_TIME, nextTime)
                putString(KEY_REMAINING, remaining)
                putString(KEY_FAJR, fajr)
                putString(KEY_DHUHR, dhuhr)
                putString(KEY_ASR, asr)
                putString(KEY_MAGHRIB, maghrib)
                putString(KEY_ISHA, isha)
                putString(KEY_HIJRI_DATE, hijriDate)
                apply()
            }

            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, AtharPrayerWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
            if (appWidgetIds.isNotEmpty()) {
                val intent = Intent(context, AtharPrayerWidgetProvider::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds)
                }
                context.sendBroadcast(intent)
            }
        }
    }
}
