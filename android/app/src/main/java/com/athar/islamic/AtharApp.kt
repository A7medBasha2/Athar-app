package com.athar.islamic

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class AtharApp : Application() {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val prayerChannel = NotificationChannel(
                CHANNEL_PRAYER,
                "مواقيت الصلاة والأذان",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "إشعارات دخول أوقات الصلوات الخمس وتشغيل الأذان"
            }

            val remindersChannel = NotificationChannel(
                CHANNEL_REMINDERS,
                "التذكيرات الروحية والآيات",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "إشعارات تذكير آية من القرآن الكريم والصلاة على النبي ﷺ"
            }

            val mediaChannel = NotificationChannel(
                CHANNEL_MEDIA,
                "التلاوة الصوتية وخلفية الشاشة",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "مشغل القرآن الكريم والأذكار المتواصلة"
            }

            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannels(listOf(prayerChannel, remindersChannel, mediaChannel))
        }
    }

    companion object {
        const val CHANNEL_PRAYER = "athar_prayer_channel"
        const val CHANNEL_REMINDERS = "athar_reminders_channel"
        const val CHANNEL_MEDIA = "athar_media_channel"
    }
}
