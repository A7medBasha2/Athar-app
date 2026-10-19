package com.athar.islamic

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class AtharBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        val ctx = context ?: return
        try {
            AtharPrayerAlarmScheduler.scheduleNextRoyalAlarm(ctx)
        } catch (ignored: Exception) {}
    }
}
