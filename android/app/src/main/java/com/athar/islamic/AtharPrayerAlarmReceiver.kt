package com.athar.islamic

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.PowerManager
import android.util.Log

class AtharPrayerAlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        Log.i("AtharPrayerAlarmReceiver", "Received alarm intent action: $action")

        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        val wakeLock = powerManager?.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "Athar:RoyalAlarmWakeLock"
        )
        wakeLock?.acquire(10000L) // 10 seconds wake lock

        try {
            if (action == AtharPrayerAlarmScheduler.ACTION_ROYAL_ALARM || action == "com.athar.islamic.ACTION_ROYAL_ALARM") {
                AtharPrayerAlarmScheduler.checkAndTriggerDueReminders(context)
            }
        } catch (e: Exception) {
            Log.e("AtharPrayerAlarmReceiver", "Error processing royal alarm: ${e.message}", e)
        } finally {
            try {
                if (wakeLock?.isHeld == true) {
                    wakeLock.release()
                }
            } catch (ignored: Exception) {}
        }
    }
}
