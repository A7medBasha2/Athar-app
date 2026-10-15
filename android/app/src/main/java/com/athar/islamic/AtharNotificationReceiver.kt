package com.athar.islamic

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager

/**
 * AtharNotificationReceiver
 * BroadcastReceiver for handling interactive notification actions in the background:
 * - Instant Mute/Unmute Audio without resetting the continuous playback timeline
 * - Play/Pause and Resume
 * - Dismissing Notifications
 * - Handling Phone Call Audio Interruptions (Category 13: Call interruption audio resumption)
 *
 * NOTE: Strictly adheres to Kotlin stability rules (var instead of val).
 */
class AtharNotificationReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent == null) return

        when (intent.action) {
            AtharNotificationManager.ACTION_MUTE_NOTIFICATION_AUDIO -> {
                AtharNotificationManager.muteCurrentAudio(context)
            }

            AtharNotificationManager.ACTION_UNMUTE_NOTIFICATION_AUDIO -> {
                AtharNotificationManager.unmuteCurrentAudio(context)
            }

            AtharNotificationManager.ACTION_TOGGLE_AUDIO -> {
                AtharNotificationManager.toggleAudio(context)
            }

            AtharNotificationManager.ACTION_PAUSE_AUDIO -> {
                AtharNotificationManager.pauseAudio(context)
            }

            AtharNotificationManager.ACTION_RESUME_AUDIO -> {
                AtharNotificationManager.resumeAudio(context)
            }

            AtharNotificationManager.ACTION_DISMISS_NOTIFICATION -> {
                var notifId = intent.getIntExtra(AtharNotificationManager.EXTRA_NOTIFICATION_ID, -1)
                var category = intent.getStringExtra(AtharNotificationManager.EXTRA_CATEGORY)
                if (notifId > 0) {
                    AtharNotificationManager.dismissNotificationById(context, notifId)
                } else if (!category.isNullOrBlank()) {
                    AtharNotificationManager.dismissNotification(context, category)
                } else {
                    AtharNotificationManager.stopAndReleasePlayer()
                }
            }

            // Handling Telephony Call State to pause audio during phone calls (Category 13)
            TelephonyManager.ACTION_PHONE_STATE_CHANGED -> {
                var state = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
                if (state == TelephonyManager.EXTRA_STATE_RINGING || state == TelephonyManager.EXTRA_STATE_OFFHOOK) {
                    // Call arrived: pause audio and preserve timeline
                    AtharNotificationManager.muteCurrentAudio(context)
                }
            }
        }
    }
}
