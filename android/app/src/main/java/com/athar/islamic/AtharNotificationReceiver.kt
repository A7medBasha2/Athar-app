package com.athar.islamic

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager

/**
 * AtharNotificationReceiver
 * Centralized receiver handling interactive notification actions:
 * - Instant Mute/Unmute/Toggle
 * - Seamless Pause and Resume from exact timestamp
 * - Dismissing Notifications
 * - Handling Phone Call Audio Interruptions with position preservation
 *
 * NOTE: Strictly adheres to Kotlin stability rules (var instead of val).
 */
class AtharNotificationReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent == null) return

        var action = intent.action ?: return

        when (action) {
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

            OngoingPrayerNotificationService.ACTION_TOGGLE_ONGOING_MUTE -> {
                OngoingPrayerNotificationService.toggleUpcomingMute(context)
            }

            // Handling Telephony Call State to pause audio and preserve timeline
            // CRITICAL: When phone call is active (RINGING or OFFHOOK), pause playback immediately.
            // When call ends (IDLE), STRICTLY do NOT resume automatically! Playback remains paused.
            TelephonyManager.ACTION_PHONE_STATE_CHANGED -> {
                var state = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
                if (state == TelephonyManager.EXTRA_STATE_RINGING || state == TelephonyManager.EXTRA_STATE_OFFHOOK) {
                    AtharNotificationManager.pauseAudio(context)
                } else if (state == TelephonyManager.EXTRA_STATE_IDLE) {
                    // Call ended: Keep audio strictly paused as required.
                }
            }

            AtharNotificationManager.ACTION_RESUME_AFTER_CALL -> {
                // Prevent automatic call resume
            }
        }
    }
}
