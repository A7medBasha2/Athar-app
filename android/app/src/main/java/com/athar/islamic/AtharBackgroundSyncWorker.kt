package com.athar.islamic

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

class AtharBackgroundSyncWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        return try {
            // 1. Refresh Prayer Widget from cached preferences
            val prayerPrefs = context.getSharedPreferences(AtharPrayerWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
            val nextPrayer = prayerPrefs.getString(AtharPrayerWidgetProvider.KEY_NEXT_PRAYER, "صلاة الفجر") ?: "صلاة الفجر"
            val nextTime = prayerPrefs.getString(AtharPrayerWidgetProvider.KEY_NEXT_TIME, "05:15") ?: "05:15"
            val remaining = prayerPrefs.getString(AtharPrayerWidgetProvider.KEY_REMAINING, "متبقي على الصلاة") ?: "متبقي على الصلاة"
            val fajr = prayerPrefs.getString(AtharPrayerWidgetProvider.KEY_FAJR, "05:15") ?: "05:15"
            val dhuhr = prayerPrefs.getString(AtharPrayerWidgetProvider.KEY_DHUHR, "12:00") ?: "12:00"
            val asr = prayerPrefs.getString(AtharPrayerWidgetProvider.KEY_ASR, "15:15") ?: "15:15"
            val maghrib = prayerPrefs.getString(AtharPrayerWidgetProvider.KEY_MAGHRIB, "17:50") ?: "17:50"
            val isha = prayerPrefs.getString(AtharPrayerWidgetProvider.KEY_ISHA, "19:20") ?: "19:20"
            val hijriDate = prayerPrefs.getString(AtharPrayerWidgetProvider.KEY_HIJRI_DATE, "أثر | مواقيت الصلاة") ?: "أثر | مواقيت الصلاة"

            AtharPrayerWidgetProvider.pushPrayerData(
                context,
                nextPrayer,
                nextTime,
                remaining,
                fajr,
                dhuhr,
                asr,
                maghrib,
                isha,
                hijriDate
            )

            // 2. Refresh Azkar Widget
            AtharAzkarWidgetProvider.refreshAllWidgets(context)

            // 3. Refresh Ongoing Prayer Notification Foreground Service if enabled
            val ongoingPrefs = context.getSharedPreferences(OngoingPrayerNotificationService.PREFS_NAME, Context.MODE_PRIVATE)
            if (ongoingPrefs.getBoolean(OngoingPrayerNotificationService.KEY_ENABLED, false)) {
                OngoingPrayerNotificationService.updateService(
                    context = context,
                    nextPrayer = nextPrayer,
                    nextTime = nextTime,
                    remaining = remaining,
                    fajr = fajr,
                    dhuhr = dhuhr,
                    asr = asr,
                    maghrib = maghrib,
                    isha = isha,
                    hijri = hijriDate
                )
            }

            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }

    companion object {
        private const val UNIQUE_WORK_NAME = "athar_background_widget_sync"

        fun enqueuePeriodicSync(context: Context) {
            try {
                val syncRequest = PeriodicWorkRequestBuilder<AtharBackgroundSyncWorker>(
                    15, TimeUnit.MINUTES
                ).build()

                WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                    UNIQUE_WORK_NAME,
                    ExistingPeriodicWorkPolicy.KEEP,
                    syncRequest
                )
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
