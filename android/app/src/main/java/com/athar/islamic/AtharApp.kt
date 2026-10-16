package com.athar.islamic

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.graphics.Color
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
                "مواقيت الصلاة والأذان (أثر)",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "إشعارات دخول أوقات الصلوات الخمس وتشغيل الأذان بأولوية قصوى وشاشة القفل"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 200, 500, 200, 500)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                enableLights(true)
                lightColor = Color.parseColor("#D4AF37")
                setSound(null, null)
            }

            val iqamahChannel = NotificationChannel(
                CHANNEL_IQAMAH,
                "إقامة الصلاة",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "تنبيهات إقامة الصلاة والاستعداد للوقوف بين يدي الله"
                enableVibration(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                enableLights(true)
                lightColor = Color.parseColor("#D4AF37")
                setSound(null, null)
            }

            val adhkarChannel = NotificationChannel(
                CHANNEL_ADHKAR,
                "أذكار الصباح والمساء واليوم والليلة",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "أذكار الصباح والمساء وحفظ المسلم"
                enableVibration(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                enableLights(true)
                lightColor = Color.parseColor("#D4AF37")
                setSound(null, null)
            }

            val salawatDhikrChannel = NotificationChannel(
                CHANNEL_SALAWAT_DHIKR,
                "الصلاة على النبي ﷺ وذكر الله والتسبيح",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "تنبيهات الصلاة على النبي ﷺ، التسبيح المضاعف، والباقيات الصالحات"
                enableVibration(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                enableLights(true)
                lightColor = Color.parseColor("#D4AF37")
                setSound(null, null)
            }

            val quranChannel = NotificationChannel(
                CHANNEL_QURAN,
                "اقرأ لو آية والورد القرآني",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "تنبيهات اقرأ لو آية وورد القرآن الكريم اليومي"
                enableVibration(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                enableLights(true)
                lightColor = Color.parseColor("#D4AF37")
                setSound(null, null)
            }

            val parentsChannel = NotificationChannel(
                CHANNEL_PARENTS,
                "بر الوالدين والإحسان",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "تنبيهات الوصية بالوالدين والإحسان إليهما"
                enableVibration(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                enableLights(true)
                lightColor = Color.parseColor("#D4AF37")
                setSound(null, null)
            }

            val legacyRemindersChannel = NotificationChannel(
                CHANNEL_REMINDERS,
                "التذكيرات الروحية والآيات (أثر)",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "إشعارات تذكير آية من القرآن الكريم والصلاة على النبي ﷺ"
                enableVibration(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                setSound(null, null)
            }

            val mediaChannel = NotificationChannel(
                CHANNEL_MEDIA,
                "التلاوة الصوتية وخلفية الشاشة",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "مشغل القرآن الكريم والأذكار المتواصلة"
                setSound(null, null)
                enableVibration(false)
            }

            val ongoingChannel = NotificationChannel(
                CHANNEL_ONGOING,
                "شريط مواقيت الصلاة الدائم (أثر)",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "عرض دائم لمواقيت الصلوات الخمس والعد التنازلي الحي في شريط الإشعارات"
                setShowBadge(false)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                enableVibration(false)
                setSound(null, null)
            }

            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannels(
                listOf(
                    prayerChannel,
                    iqamahChannel,
                    adhkarChannel,
                    salawatDhikrChannel,
                    quranChannel,
                    parentsChannel,
                    legacyRemindersChannel,
                    mediaChannel,
                    ongoingChannel
                )
            )
        }
    }

    companion object {
        const val CHANNEL_PRAYER = "athar_prayer_channel"
        const val CHANNEL_IQAMAH = "athar_iqamah_channel"
        const val CHANNEL_ADHKAR = "athar_adhkar_channel"
        const val CHANNEL_SALAWAT_DHIKR = "athar_salawat_dhikr_channel"
        const val CHANNEL_QURAN = "athar_quran_channel"
        const val CHANNEL_PARENTS = "athar_parents_channel"
        const val CHANNEL_REMINDERS = "athar_reminders_channel"
        const val CHANNEL_MEDIA = "athar_media_channel"
        const val CHANNEL_ONGOING = "athar_ongoing_prayer_channel_v2"
    }
}
