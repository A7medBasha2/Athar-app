package com.athar.islamic

import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder

class OngoingPrayerNotificationService : Service() {

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_NOT_STICKY
    }

    companion object {
        fun startService(
            context: Context,
            title: String,
            nextPrayer: String,
            nextTime: String,
            remaining: String,
            fajr: String,
            dhuhr: String,
            asr: String,
            maghrib: String,
            isha: String,
            hijri: String
        ) {
            // Placeholder for new notification service
        }

        fun stopService(context: Context) {
            // Placeholder
        }
    }
}
