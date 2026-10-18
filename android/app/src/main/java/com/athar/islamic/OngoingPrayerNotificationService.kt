package com.athar.islamic

import android.app.Service
import android.content.Intent
import android.os.IBinder

class OngoingPrayerNotificationService : Service() {

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_NOT_STICKY
    }
}
