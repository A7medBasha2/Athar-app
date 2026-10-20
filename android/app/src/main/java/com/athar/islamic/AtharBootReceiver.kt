package com.athar.islamic

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class AtharBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        val ctx = context ?: return
        val action = intent?.action ?: return
        
        // OWASP MASVS-PLATFORM-2: Reject spoofed or unverified external broadcast actions
        val isWhitelistedAction = when (action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            "android.intent.action.QUICKBOOT_POWERON",
            Intent.ACTION_TIMEZONE_CHANGED,
            Intent.ACTION_TIME_CHANGED -> true
            else -> false
        }

        if (!isWhitelistedAction) {
            Log.w("AtharBootReceiver", "Ignoring unwhitelisted broadcast action: $action")
            return
        }

        Log.i("AtharBootReceiver", "Processing verified system broadcast: $action")

        try {
            // 1. Reschedule 5 daily prayer alarms based on stored schedule
            AtharPrayerAlarmScheduler.rescheduleSavedPrayers(ctx)

            // 2. Reschedule next exact royal reminder
            AtharPrayerAlarmScheduler.scheduleNextRoyalAlarm(ctx)

            // 3. If persistent countdown notification was active, restore/advance it seamlessly
            val prefs = ctx.getSharedPreferences("AtharNotificationSettings", Context.MODE_PRIVATE)
            val savedEpoch = prefs.getLong("last_ongoing_prayer_epoch", 0L)
            if (savedEpoch > 0) {
                val prayerName = prefs.getString("last_ongoing_prayer_name", "الصلاة القادمة") ?: "الصلاة القادمة"
                val timeStr = prefs.getString("last_ongoing_prayer_time_str", "") ?: ""
                val scheduleJson = prefs.getString("daily_prayer_schedule", null)
                AthanForegroundService.startBackgroundService(ctx, prayerName, savedEpoch, timeStr, scheduleJson)
            }
        } catch (e: Exception) {
            Log.e("AtharBootReceiver", "Error restoring notifications on broadcast $action: ${e.message}", e)
        }
    }
}
