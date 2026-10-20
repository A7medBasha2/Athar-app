package com.athar.islamic

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.WindowManager
import androidx.core.app.NotificationCompat

class FullScreenAzanService : Service() {

    companion object {
        private const val TAG = "FullScreenAzanService"
        const val CHANNEL_ID = "athar_azan_fullscreen_channel_v1"
        const val NOTIFICATION_ID = 99995

        const val ACTION_START_AZAN = "com.athar.islamic.ACTION_START_AZAN"
        const val ACTION_DISMISS_AZAN = "com.athar.islamic.ACTION_DISMISS_AZAN"
        const val ACTION_TOGGLE_MUTE = "com.athar.islamic.ACTION_TOGGLE_MUTE"
        const val ACTION_IQAMAH_ALARM = "com.athar.islamic.ACTION_IQAMAH_ALARM"

        const val EXTRA_PRAYER_ID = "extra_prayer_id"
        const val EXTRA_PRAYER_NAME = "extra_prayer_name"
        const val EXTRA_PRAYER_TIME = "extra_prayer_time"
        const val EXTRA_MUADHIN_NAME = "extra_muadhin_name"
        const val EXTRA_AUDIO_URL = "extra_audio_url"
        const val EXTRA_IQAMAH_MINUTES = "extra_iqamah_minutes"
        const val EXTRA_AUTO_DUA = "extra_auto_dua"
        const val EXTRA_AUTO_ECHO = "extra_auto_echo"
        const val EXTRA_SCHEDULED_EPOCH_MS = "extra_scheduled_epoch_ms"

        @Volatile
        var isAzanRunning: Boolean = false
            private set

        @Volatile
        private var activeServiceInstance: FullScreenAzanService? = null

        fun startAzanOverlay(
            context: Context,
            prayerId: String,
            prayerName: String,
            prayerTime: String,
            muadhinName: String,
            audioUrl: String,
            iqamahMinutes: Int = 15,
            autoDua: Boolean = true,
            autoEcho: Boolean = true,
            scheduledEpochMs: Long = 0L
        ) {
            val intent = Intent(context, FullScreenAzanService::class.java).apply {
                action = ACTION_START_AZAN
                putExtra(EXTRA_PRAYER_ID, prayerId)
                putExtra(EXTRA_PRAYER_NAME, prayerName)
                putExtra(EXTRA_PRAYER_TIME, prayerTime)
                putExtra(EXTRA_MUADHIN_NAME, muadhinName)
                putExtra(EXTRA_AUDIO_URL, audioUrl)
                putExtra(EXTRA_IQAMAH_MINUTES, iqamahMinutes)
                putExtra(EXTRA_AUTO_DUA, autoDua)
                putExtra(EXTRA_AUTO_ECHO, autoEcho)
                putExtra(EXTRA_SCHEDULED_EPOCH_MS, scheduledEpochMs)
            }

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start FullScreenAzanService: ${e.message}", e)
            }
        }

        fun dismissAzan(context: Context) {
            val instance = activeServiceInstance
            if (instance != null) {
                instance.dismissAndStop()
            } else {
                val intent = Intent(context, FullScreenAzanService::class.java).apply {
                    action = ACTION_DISMISS_AZAN
                }
                try {
                    context.startService(intent)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to send dismiss intent: ${e.message}", e)
                }
            }
        }
    }

    private var windowManager: WindowManager? = null
    private var azanOverlayView: AzanOverlayView? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    private var currentPrayerId = "asr"
    private var currentPrayerName = "صلاة العصر"
    private var currentPrayerTime = "03:45 م"
    private var currentMuadhinName = "الشيخ مشاري راشد العفاسي"
    private var currentAudioUrl = "/audio/adhan_alafasy.mp3"
    private var currentIqamahMinutes = 15
    private var autoDuaEnabled = true
    private var autoEchoEnabled = true
    private var scheduledPrayerEpochMs = 0L

    private var isPlayingDua = false
    private var totalAzanDurationMs = 0L
    private var lastEchoPhaseIndex = -1

    data class TimedPhase(val status: String, val text: String, val seconds: Int)

    private val standardEchoPhases = listOf(
        TimedPhase("✨ رَدِّدْ مَعَ المُؤَذِّنِ الآنَ لِتَنَالَ الشَّفَاعَة ✨", "« اللهُ أَكْبَرُ ، اللهُ أَكْبَرُ »", 32),
        TimedPhase("✨ رَدِّدْ مَعَ المُؤَذِّنِ الآنَ لِتَنَالَ الشَّفَاعَة ✨", "« أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ »", 32),
        TimedPhase("✨ رَدِّدْ مَعَ المُؤَذِّنِ الآنَ لِتَنَالَ الشَّفَاعَة ✨", "« أَشْهَدُ أَنَّ مُحَمَّداً رَسُولُ اللهِ »", 32),
        TimedPhase("🕌 حَيَّ عَلَى الصَّلَاةِ", "« لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ العَلِيِّ العَظِيمِ »", 38),
        TimedPhase("🕌 حَيَّ عَلَى الفَلَاحِ", "« لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ العَلِيِّ العَظِيمِ »", 38),
        TimedPhase("✨ رَدِّدْ مَعَ المُؤَذِّنِ الآنَ لِتَنَالَ الشَّفَاعَة ✨", "« اللهُ أَكْبَرُ ، اللهُ أَكْبَرُ »", 22),
        TimedPhase("🌟 خِتَامُ الأَذَانِ المُبَارَك", "« لَا إِلَهَ إِلَّا اللهُ »", 25)
    )

    private val fajrEchoPhases = listOf(
        TimedPhase("✨ رَدِّدْ مَعَ المُؤَذِّنِ الآنَ لِتَنَالَ الشَّفَاعَة ✨", "« اللهُ أَكْبَرُ ، اللهُ أَكْبَرُ »", 14),
        TimedPhase("✨ رَدِّدْ مَعَ المُؤَذِّنِ الآنَ لِتَنَالَ الشَّفَاعَة ✨", "« أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ »", 13),
        TimedPhase("✨ رَدِّدْ مَعَ المُؤَذِّنِ الآنَ لِتَنَالَ الشَّفَاعَة ✨", "« أَشْهَدُ أَنَّ مُحَمَّداً رَسُولُ اللهِ »", 13),
        TimedPhase("🕌 حَيَّ عَلَى الصَّلَاةِ", "« لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ العَلِيِّ العَظِيمِ »", 13),
        TimedPhase("🕌 حَيَّ عَلَى الفَلَاحِ", "« لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ العَلِيِّ العَظِيمِ »", 13),
        TimedPhase("🌙 الصَّلَاةُ خَيْرٌ مِنَ النَّوْمِ", "« صَدَقْتَ وَبَرِرْتَ وَبِالحَقِّ نَطَقْتَ »", 12),
        TimedPhase("✨ رَدِّدْ مَعَ المُؤَذِّنِ الآنَ لِتَنَالَ الشَّفَاعَة ✨", "« اللهُ أَكْبَرُ ، اللهُ أَكْبَرُ »", 7),
        TimedPhase("🌟 خِتَامُ الأَذَانِ المُبَارَك", "« لَا إِلَهَ إِلَّا اللهُ »", 7)
    )

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        activeServiceInstance = this
        isAzanRunning = true
        windowManager = getSystemService(Context.WINDOW_SERVICE) as? WindowManager
        acquireFullWakeLock()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent == null) {
            stopSelf()
            return START_NOT_STICKY
        }

        when (intent.action) {
            ACTION_DISMISS_AZAN -> {
                dismissAndStop()
                return START_NOT_STICKY
            }
            ACTION_TOGGLE_MUTE -> {
                val muted = FastAudioPlayer.toggleMute()
                azanOverlayView?.updateMuteState(muted)
                return START_NOT_STICKY
            }
            ACTION_START_AZAN -> {
                currentPrayerId = intent.getStringExtra(EXTRA_PRAYER_ID) ?: "asr"
                currentPrayerName = intent.getStringExtra(EXTRA_PRAYER_NAME) ?: "صلاة العصر"
                currentPrayerTime = intent.getStringExtra(EXTRA_PRAYER_TIME) ?: "03:45 م"
                currentMuadhinName = intent.getStringExtra(EXTRA_MUADHIN_NAME) ?: "الشيخ مشاري راشد العفاسي"
                currentAudioUrl = intent.getStringExtra(EXTRA_AUDIO_URL) ?: "/audio/adhan_alafasy.mp3"
                currentIqamahMinutes = intent.getIntExtra(EXTRA_IQAMAH_MINUTES, 15)
                autoDuaEnabled = intent.getBooleanExtra(EXTRA_AUTO_DUA, true)
                autoEchoEnabled = intent.getBooleanExtra(EXTRA_AUTO_ECHO, true)
                scheduledPrayerEpochMs = intent.getLongExtra(EXTRA_SCHEDULED_EPOCH_MS, 0L)
                lastEchoPhaseIndex = -1
                isPlayingDua = false

                AtharFloatingWindowService.freezeQueueAndDismiss(this)
                startForegroundProperly(currentPrayerName, currentMuadhinName)
                showNativeOverlay()
                startAdhanAudioPlayback()

                return START_NOT_STICKY
            }
            else -> return START_NOT_STICKY
        }
    }

    private fun acquireFullWakeLock() {
        try {
            val pm = getSystemService(Context.POWER_SERVICE) as? PowerManager
            if (pm != null && wakeLock == null) {
                @Suppress("DEPRECATION")
                val flags = PowerManager.SCREEN_BRIGHT_WAKE_LOCK or
                        PowerManager.ACQUIRE_CAUSES_WAKEUP or
                        PowerManager.ON_AFTER_RELEASE
                wakeLock = pm.newWakeLock(flags, "Athar:FullScreenAzanWakeLock")
                wakeLock?.acquire(4 * 60 * 1000L)
            }
        } catch (e: Exception) {
            try {
                val pm = getSystemService(Context.POWER_SERVICE) as? PowerManager
                wakeLock = pm?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Athar:FullScreenAzanFallbackWakeLock")
                wakeLock?.acquire(4 * 60 * 1000L)
            } catch (err: Exception) {
                Log.e(TAG, "Failed to acquire wake lock: ${err.message}")
            }
        }
    }

    private fun startForegroundProperly(title: String, subtitle: String) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm != null) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "أذان الصلاة الملكي - شاشة كاملة",
                NotificationManager.IMPORTANCE_HIGH // IMPORTANCE_HIGH is required by Android OS to allow fullScreenIntent over lockscreen
            ).apply {
                description = "إشعار شاشة الأذان الملكية الهادئ"
                enableLights(false)
                enableVibration(false)
                vibrationPattern = longArrayOf(0)
                setSound(null, null) // Silent channel: no chime so audio plays undisturbed
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            nm.createNotificationChannel(channel)
        }

        val fullScreenIntent = Intent(this, MainActivity::class.java).apply {
            action = "com.athar.islamic.ACTION_FULLSCREEN_AZAN"
            putExtra("action", "OPEN_ATHAN_FULLSCREEN")
            putExtra("launch_royal_adhan", currentPrayerId)
            putExtra("prayer", currentPrayerId)
            putExtra("prayer_name", currentPrayerName)
            putExtra("prayer_time", currentPrayerTime)
            putExtra("muadhin_name", currentMuadhinName)
            putExtra("audio_url", currentAudioUrl)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
            this,
            10099,
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        // Silent background status-bar notification without banner or interactive buttons per user preference
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_athar)
            .setContentTitle("حان الآن موعد $title")
            .setContentText("أذان مبارك • حي على الصلاة")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(fullScreenPendingIntent, true) // High priority full screen takeover on lockscreen
            .setSound(null)
            .setSilent(true)
            .setOngoing(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(fullScreenPendingIntent)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val fgsType = ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
            startForeground(NOTIFICATION_ID, notification, fgsType)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun showNativeOverlay() {
        // 1. If SYSTEM_ALERT_WINDOW permission is granted, display floating full-screen overlay view
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this)) {
            try {
                azanOverlayView?.let { oldView ->
                    try {
                        oldView.cleanup()
                        if (oldView.isAttachedToWindow) {
                            windowManager?.removeViewImmediate(oldView)
                        } else {
                            windowManager?.removeView(oldView)
                        }
                    } catch (ignored: Exception) {}
                    azanOverlayView = null
                }

                azanOverlayView = AzanOverlayView(
                    context = this,
                    prayerId = currentPrayerId,
                    prayerName = currentPrayerName,
                    prayerTime = currentPrayerTime,
                    muadhinName = currentMuadhinName,
                    scheduledPrayerEpochMs = scheduledPrayerEpochMs,
                    onToggleMute = {
                        FastAudioPlayer.toggleMute()
                    },
                    onDismiss = {
                        dismissAndStop()
                    }
                )

                val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                } else {
                    @Suppress("DEPRECATION")
                    WindowManager.LayoutParams.TYPE_PHONE
                }

                val flags = WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                        WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS

                val params = WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT,
                    layoutType,
                    flags,
                    PixelFormat.TRANSLUCENT
                ).apply {
                    gravity = Gravity.FILL
                }

                windowManager?.addView(azanOverlayView, params)
                Log.i(TAG, "Native AzanOverlayView added to WindowManager successfully.")
            } catch (e: Exception) {
                Log.e(TAG, "Error adding AzanOverlayView to WindowManager: ${e.message}", e)
            }
        }

        // 2. ALWAYS launch MainActivity with SHOW_WHEN_LOCKED & TURN_SCREEN_ON to guarantee full-screen takeover over lockscreen
        try {
            val wakeIntent = Intent(this, MainActivity::class.java).apply {
                action = "com.athar.islamic.ACTION_FULLSCREEN_AZAN"
                putExtra("action", "OPEN_ATHAN_FULLSCREEN")
                putExtra("launch_royal_adhan", currentPrayerId)
                putExtra("prayer", currentPrayerId)
                putExtra("prayer_name", currentPrayerName)
                putExtra("prayer_time", currentPrayerTime)
                putExtra("muadhin_name", currentMuadhinName)
                putExtra("audio_url", currentAudioUrl)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            }
            startActivity(wakeIntent)
            Log.i(TAG, "Launched MainActivity with FullScreen Azan takeover intent.")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch MainActivity for Azan: ${e.message}", e)
        }
    }

    private fun startAdhanAudioPlayback() {
        isPlayingDua = false
        val resolvedAudioUrl = resolveAdhanAudioUrl(currentPrayerId, currentAudioUrl)

        FastAudioPlayer.play(
            context = this,
            audioUrl = resolvedAudioUrl,
            isAlarm = true,
            listener = object : FastAudioPlayer.AudioListener {
                override fun onReady(durationMs: Long) {
                    totalAzanDurationMs = durationMs
                    Log.i(TAG, "Adhan audio ready, duration: ${durationMs}ms")
                }

                override fun onProgress(currentMs: Long, durationMs: Long) {
                    if (!isPlayingDua && autoEchoEnabled) {
                        updateLiveEchoPhrase(currentMs, durationMs)
                    }
                }

                override fun onEnded() {
                    Log.i(TAG, "Adhan audio finished.")
                    onAdhanAudioFinished()
                }

                override fun onError(error: String) {
                    Log.e(TAG, "Adhan playback error: $error")
                    onAdhanAudioFinished()
                }
            }
        )
    }

    private fun resolveAdhanAudioUrl(prayerId: String, requestedUrl: String): String {
        val cleanPrayer = prayerId.lowercase().trim()
        val defaultAdhan = if (cleanPrayer.contains("fajr")) "/audio/adhan_fajr_alafasy.mp3" else "/audio/adhan_alafasy.mp3"

        if (requestedUrl.isNotBlank()) {
            val fileName = requestedUrl.trim().substringAfterLast("/")
            val verified = FastAudioPlayer.resolveAssetPath(this, fileName)
            if (verified != null) {
                return "/$verified"
            }
        }
        return defaultAdhan
    }

    private fun updateLiveEchoPhrase(currentMs: Long, durationMs: Long) {
        val phases = if (currentPrayerId.lowercase().contains("fajr")) fajrEchoPhases else standardEchoPhases
        val currentSec = (currentMs / 1000L).toInt()
        var cumulativeSec = 0
        var phaseIndex = phases.size - 1
        for (i in phases.indices) {
            cumulativeSec += phases[i].seconds
            if (currentSec < cumulativeSec) {
                phaseIndex = i
                break
            }
        }
        if (phaseIndex == lastEchoPhaseIndex) {
            return
        }
        lastEchoPhaseIndex = phaseIndex
        val selected = phases[phaseIndex]

        mainHandler.post {
            azanOverlayView?.updateEchoText(selected.status, selected.text)
        }
    }

    private fun onAdhanAudioFinished() {
        if (autoDuaEnabled && !isPlayingDua) {
            isPlayingDua = true
            mainHandler.post {
                azanOverlayView?.updateEchoText(
                    "• دُعَاءُ مَا بَعْدَ الأَذَانِ •",
                    "« اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ القَائِمَةِ، آتِ مُحَمَّداً الوَسِيلَةَ وَالفَضِيلَةَ، وَابْعَثْهُ مَقَاماً مَحْمُوداً الَّذِي وَعَدْتَهُ »"
                )
            }

            FastAudioPlayer.play(
                context = this,
                audioUrl = "/audio/dua_after_adhan.mp3",
                isAlarm = true,
                listener = object : FastAudioPlayer.AudioListener {
                    override fun onReady(durationMs: Long) {}
                    override fun onProgress(currentMs: Long, durationMs: Long) {}
                    override fun onEnded() {
                        onDuaFinished()
                    }
                    override fun onError(error: String) {
                        onDuaFinished()
                    }
                }
            )
        } else {
            onDuaFinished()
        }
    }

    private fun onDuaFinished() {
        Log.i(TAG, "Adhan and Dua completed. Scheduling Iqamah for $currentPrayerName in $currentIqamahMinutes minutes.")
        scheduleIqamahAlarm(this, currentPrayerId, currentPrayerName, currentIqamahMinutes)

        mainHandler.postDelayed({
            dismissAndStop()
        }, 5000L)
    }

    private fun scheduleIqamahAlarm(context: Context, pId: String, pName: String, minutes: Int) {
        if (minutes <= 0) return
        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val triggerTimeMs = System.currentTimeMillis() + (minutes * 60 * 1000L)

            val intent = Intent(context, AtharPrayerAlarmReceiver::class.java).apply {
                action = ACTION_IQAMAH_ALARM
                putExtra(EXTRA_PRAYER_ID, pId)
                putExtra(EXTRA_PRAYER_NAME, pName)
                putExtra(EXTRA_IQAMAH_MINUTES, minutes)
            }

            val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            val pendingIntent = PendingIntent.getBroadcast(context, 77881, intent, flags)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTimeMs, pendingIntent)
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTimeMs, pendingIntent)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule Iqamah alarm: ${e.message}", e)
        }
    }

    private fun dismissAndStop() {
        mainHandler.removeCallbacksAndMessages(null)
        FastAudioPlayer.stop()

        try {
            val view = azanOverlayView
            azanOverlayView = null
            if (view != null) {
                view.cleanup()
                if (view.isAttachedToWindow) {
                    windowManager?.removeViewImmediate(view)
                } else {
                    windowManager?.removeView(view)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error removing view on dismiss: ${e.message}")
        }

        try {
            if (wakeLock != null && wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (ignored: Exception) {} finally {
            wakeLock = null
        }

        AtharFloatingWindowService.unfreezeQueue()

        isAzanRunning = false
        activeServiceInstance = null

        try {
            val dismissWebIntent = Intent(this, MainActivity::class.java).apply {
                action = "dismiss_web_azan"
                putExtra("dismiss_web_azan", true)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            startActivity(dismissWebIntent)
        } catch (ignored: Exception) {}

        stopForeground(true)
        stopSelf()
    }

    override fun onDestroy() {
        dismissAndStop()
        super.onDestroy()
    }
}
