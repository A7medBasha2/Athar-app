package com.athar.islamic

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.PowerManager
import android.util.Log

class AtharPrayerAlarmReceiver : BroadcastReceiver() {

    companion object {
        private var lastPrayerTriggerEpoch: Long = 0L
        private var lastPrayerId: String = ""
        private const val MIN_TRIGGER_INTERVAL_MS = 15_000L // 15 seconds debounce
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        Log.i("AtharPrayerAlarmReceiver", "Received alarm intent action: $action")

        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        val wakeLock = powerManager?.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "Athar:RoyalAlarmWakeLock"
        )
        wakeLock?.acquire(10000L) // 10 seconds wake lock

        try {
            if (action == AtharPrayerAlarmScheduler.ACTION_ROYAL_ALARM || action == "com.athar.islamic.ACTION_ROYAL_ALARM") {
                AtharPrayerAlarmScheduler.checkAndTriggerDueReminders(context)
            } else if (action == FullScreenAzanService.ACTION_IQAMAH_ALARM || action == "com.athar.islamic.ACTION_IQAMAH_ALARM") {
                val pName = intent.getStringExtra(FullScreenAzanService.EXTRA_PRAYER_NAME) ?: "الصلاة"
                AtharFloatingWindowService.showOverlay(
                    context = context,
                    title = "حان الآن موعد إقامة $pName",
                    body = "«قَدْ قَامَتِ الصَّلَاةُ ، قَدْ قَامَتِ الصَّلَاةُ»\nأقبل على ربك بقلب خاشع وجسد طاهر وسكينة تامة.",
                    badge = "🕌 تنبيه إقامة الصلاة",
                    category = "prayer_iqamah",
                    audioUrl = "/audio/iqamah.mp3",
                    playSound = true,
                    surahNumber = 0,
                    ayahNumber = 0,
                    actionText = "🕌 أداء الصلاة والسنن",
                    autoDismissSeconds = 15,
                    playbackMode = "notification_and_sound"
                )
            } else if (action == "com.athar.islamic.ACTION_TEST_AZAN_ALARM" ||
                action == "com.athar.ACTION_PRAYER_ALARM" ||
                action == "com.athar.islamic.ACTION_PRAYER_ALARM" ||
                action == FullScreenAzanService.ACTION_START_AZAN
            ) {
                val pId = intent.getStringExtra("prayer_id") ?: intent.getStringExtra(FullScreenAzanService.EXTRA_PRAYER_ID) ?: "asr"
                val pName = intent.getStringExtra("prayer_name") ?: intent.getStringExtra(FullScreenAzanService.EXTRA_PRAYER_NAME) ?: "صلاة العصر"
                val pTime = intent.getStringExtra("prayer_time") ?: intent.getStringExtra(FullScreenAzanService.EXTRA_PRAYER_TIME) ?: "الآن"
                val mName = intent.getStringExtra("muadhin_name") ?: intent.getStringExtra(FullScreenAzanService.EXTRA_MUADHIN_NAME) ?: "الشيخ مشاري راشد العفاسي"
                val aUrl = intent.getStringExtra("audio_url") ?: intent.getStringExtra(FullScreenAzanService.EXTRA_AUDIO_URL) ?: "/audio/adhan_alafasy.mp3"
                val iqMins = intent.getIntExtra(FullScreenAzanService.EXTRA_IQAMAH_MINUTES, 15)
                val autoDua = intent.getBooleanExtra(FullScreenAzanService.EXTRA_AUTO_DUA, true)
                val autoEcho = intent.getBooleanExtra(FullScreenAzanService.EXTRA_AUTO_ECHO, true)

                val now = System.currentTimeMillis()
                if (pId == lastPrayerId && (now - lastPrayerTriggerEpoch < MIN_TRIGGER_INTERVAL_MS)) {
                    Log.w("AtharPrayerAlarmReceiver", "Duplicate alarm ignored for prayer: $pId within ${now - lastPrayerTriggerEpoch}ms")
                    return
                }
                lastPrayerId = pId
                lastPrayerTriggerEpoch = now

                Log.i("AtharPrayerAlarmReceiver", "Triggering FullScreenAzanService via alarm for prayer: $pName")
                FullScreenAzanService.startAzanOverlay(
                    context = context,
                    prayerId = pId,
                    prayerName = pName,
                    prayerTime = pTime,
                    muadhinName = mName,
                    audioUrl = aUrl,
                    iqamahMinutes = iqMins,
                    autoDua = autoDua,
                    autoEcho = autoEcho,
                    scheduledEpochMs = now
                )
            }
        } catch (e: Exception) {
            Log.e("AtharPrayerAlarmReceiver", "Error processing royal alarm: ${e.message}", e)
        } finally {
            try {
                if (wakeLock?.isHeld == true) {
                    wakeLock.release()
                }
            } catch (ignored: Exception) {}
        }
    }
}
