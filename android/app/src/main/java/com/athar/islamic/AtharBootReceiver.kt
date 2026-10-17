package com.athar.islamic

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * AtharBootReceiver
 * Automatically restores the Ongoing Prayer Notification and schedules
 * background sync work when the Android device reboots or the app is updated.
 */
class AtharBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent == null) return
        val action = intent.action ?: return

        if (action == Intent.ACTION_BOOT_COMPLETED ||
            action == Intent.ACTION_MY_PACKAGE_REPLACED ||
            action == "android.intent.action.QUICKBOOT_POWERON"
        ) {
            try {
                // 1. Initialize all notification channels with silent audio & high visibility
                AtharNotificationManager.initChannels(context)

                // 2. Restore ongoing prayer notification if enabled in preferences
                val prefs = context.getSharedPreferences(OngoingPrayerNotificationService.PREFS_NAME, Context.MODE_PRIVATE)
                val isEnabled = prefs.getBoolean(OngoingPrayerNotificationService.KEY_ENABLED, true)
                if (isEnabled) {
                    // Render the notification directly to status bar immediately
                    OngoingPrayerNotificationService.showNotificationDirectly(context)

                    // Also start foreground service to resume live time-tick countdown
                    val serviceIntent = Intent(context, OngoingPrayerNotificationService::class.java).apply {
                        this.action = OngoingPrayerNotificationService.ACTION_START_SERVICE
                    }
                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            context.startForegroundService(serviceIntent)
                        } else {
                            context.startService(serviceIntent)
                        }
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }

                // 3. Reschedule periodic background work
                AtharBackgroundSyncWorker.enqueuePeriodicSync(context)

                // 4. Reschedule all exact prayer alarms and royal alarms with AlarmManager
                AtharPrayerAlarmScheduler.rescheduleNextAlarms(context)
                AtharPrayerAlarmScheduler.rescheduleNextRoyalAlarms(context)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
