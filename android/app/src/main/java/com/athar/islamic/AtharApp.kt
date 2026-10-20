package com.athar.islamic

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.graphics.Color
import android.os.Build
import com.google.firebase.crashlytics.FirebaseCrashlytics
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class AtharApp : Application() {

    override fun onCreate() {
        super.onCreate()
        // Enforce AtharNotificationManager as Single Source of Truth
        // Delete all legacy conflicting channels and cancel ghost notification cards on startup
        AtharNotificationManager.purgeOnStartup(this)

        // Firebase Crashlytics: Strictly Opt-In with anonymized reporting in Release builds only
        try {
            val privacyPrefs = getSharedPreferences("AtharPrivacyPreferences", Context.MODE_PRIVATE)
            val isCrashlyticsOptedIn = privacyPrefs.getBoolean("crashlytics_opt_in", false)
            val isRelease = !BuildConfig.DEBUG
            FirebaseCrashlytics.getInstance().setCrashlyticsCollectionEnabled(isRelease && isCrashlyticsOptedIn)
        } catch (ignored: Exception) {}

        // Non-blocking asynchronous topic subscription for zero-latency cold boot
        Thread {
            try {
                AtharFirebaseMessagingService.subscribeToGeneralTopics()
            } catch (ignored: Exception) {}
        }.start()
    }

    companion object {
        const val CHANNEL_PRAYER = AtharNotificationManager.CHANNEL_ATHAN_ID
        const val CHANNEL_IQAMAH = AtharNotificationManager.CHANNEL_IQAMAH_ID
        const val CHANNEL_ADHKAR = AtharNotificationManager.CHANNEL_DHIKR_ID
        const val CHANNEL_SALAWAT_DHIKR = AtharNotificationManager.CHANNEL_DHIKR_ID
        const val CHANNEL_QURAN = AtharNotificationManager.CHANNEL_QURAN_ID
        const val CHANNEL_PARENTS = AtharNotificationManager.CHANNEL_PARENTS_ID
        const val CHANNEL_REMINDERS = AtharNotificationManager.CHANNEL_DHIKR_ID
        const val CHANNEL_MEDIA = AtharNotificationManager.CHANNEL_SYSTEM_ID
        const val CHANNEL_ONGOING = AtharNotificationManager.CHANNEL_ONGOING_ID
    }
}

