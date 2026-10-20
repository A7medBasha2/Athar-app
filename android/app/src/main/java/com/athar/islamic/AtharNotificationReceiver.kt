package com.athar.islamic

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class AtharNotificationReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return
        val action = intent.action ?: return
        val notifId = intent.getIntExtra(AtharNotificationManager.EXTRA_NOTIFICATION_ID, -1)

        try {
            when (action) {
                AtharNotificationManager.ACTION_TOGGLE_AUDIO -> {
                    AtharNotificationManager.toggleAudio(context)
                }
                AtharNotificationManager.ACTION_PAUSE_AUDIO -> {
                    AtharNotificationManager.pauseAudio(context)
                }
                AtharNotificationManager.ACTION_RESUME_AUDIO -> {
                    AtharNotificationManager.resumeAudio(context)
                }
                AtharNotificationManager.ACTION_MUTE_NOTIFICATION_AUDIO,
                AtharNotificationManager.ACTION_UNMUTE_NOTIFICATION_AUDIO -> {
                    AtharNotificationManager.toggleAudio(context)
                }
                AtharNotificationManager.ACTION_DISMISS_NOTIFICATION -> {
                    AtharNotificationManager.stopAndReleasePlayer(true)
                    if (notifId > 0) {
                        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                        nm?.cancel(notifId)
                    }
                }
                else -> {}
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

