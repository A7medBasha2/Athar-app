// Force rebuild cache fix - Timestamp 2026
package com.athar.islamic

import android.animation.ObjectAnimator
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.view.animation.LinearInterpolator
import android.widget.Button
import android.widget.TextView
import androidx.core.app.NotificationCompat

/**
 * AthanForegroundService
 * High-priority Foreground Service ensuring the Android process stays alive during Athan,
 * managing the WakeLock, FullScreen Activity intent, and Royal System Overlay Window.
 */
class AthanForegroundService : Service() {

    private var fullWakeLock: PowerManager.WakeLock? = null
    private var partialWakeLock: PowerManager.WakeLock? = null
    private var floatingOverlayView: View? = null
    private var overlayAnimator: ObjectAnimator? = null
    private var windowManager: WindowManager? = null
    private var mainHandler = Handler(Looper.getMainLooper())

    var isBackgroundServiceRunning: Boolean
        get() = Companion.isBackgroundServiceRunning
        set(value) {
            Companion.isBackgroundServiceRunning = value
        }

    companion object {
        const val FULLSCREEN_CHANNEL_ID = AtharNotificationManager.CHANNEL_ATHAN_ID
        const val BACKGROUND_CHANNEL_ID = "athar_background_service_channel"

        const val FULLSCREEN_NOTIFICATION_ID = AtharNotificationManager.ID_PRAYER_ATHAN // 1001: Fixed Static ID
        const val BACKGROUND_NOTIFICATION_ID = 99992

        const val ACTION_START_ATHAN = "com.athar.islamic.START_ATHAN"
        const val ACTION_STOP_ATHAN = "com.athar.islamic.STOP_ATHAN"
        const val ACTION_START_BACKGROUND_SERVICE = "com.athar.islamic.START_BACKGROUND_SERVICE"
        const val ACTION_STOP_BACKGROUND_SERVICE = "com.athar.islamic.STOP_BACKGROUND_SERVICE"
        const val ACTION_SHOW_ROYAL_OVERLAY = "com.athar.islamic.SHOW_ROYAL_OVERLAY"
        const val ACTION_HIDE_ROYAL_OVERLAY = "com.athar.islamic.HIDE_ROYAL_OVERLAY"

        @JvmField @Volatile var isRinging: Boolean = false
        @JvmField @Volatile var isBackgroundServiceRunning: Boolean = false
        @JvmField @Volatile var activePrayerName: String = ""
        @JvmField @Volatile var activeTitle: String = ""
        @JvmField @Volatile var activeBody: String = ""
        @JvmField @Volatile var activeBadge: String = ""
        @JvmField @Volatile var activeCategory: String = "quran"
        @JvmField @Volatile var activeAudioUrl: String = ""
        @JvmField @Volatile var activeSurahNumber: Int = 0
        @JvmField @Volatile var activeAyahNumber: Int = 0
        @JvmField @Volatile var activeInstance: AthanForegroundService? = null

        @JvmStatic
        fun getCurrentPositionMs(): Long {
            return AtharNotificationManager.getCurrentPositionMs()
        }

        @JvmStatic
        fun getDurationMs(): Long {
            return AtharNotificationManager.getDurationMs()
        }

        @JvmStatic
        fun startAthan(
            context: Context,
            prayerName: String,
            prayerTime: String,
            title: String? = null,
            body: String? = null,
            badge: String? = null,
            category: String? = null,
            audioUrl: String? = null,
            playSound: Boolean = true,
            triggerTimestamp: Long = System.currentTimeMillis()
        ) {
            var intent = Intent(context, AthanForegroundService::class.java).apply {
                action = ACTION_START_ATHAN
                putExtra("prayer_name", prayerName)
                putExtra("prayer_time", prayerTime)
                if (title != null) putExtra("title", title)
                if (body != null) putExtra("body", body)
                if (badge != null) putExtra("badge", badge)
                if (category != null) putExtra("category", category)
                if (audioUrl != null) putExtra("audio_url", audioUrl)
                putExtra("play_sound", playSound)
                putExtra("trigger_timestamp", triggerTimestamp)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
        @JvmStatic
        fun stopAthan(context: Context) {
            var intent = Intent(context, AthanForegroundService::class.java).apply {
                action = ACTION_STOP_ATHAN
            }
            context.startService(intent)
        }

        @JvmStatic
        fun showOverlayOutsideApp(context: Context) {
            if (!AtharNotificationManager.isSystemOverlayEnabled(context)) {
                return
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
                return
            }

            var pName = if (activePrayerName.isNotEmpty()) activePrayerName else (AtharNotificationManager.lastActiveTitle ?: "تنبيه أثر الملكي")
            var aTitle = if (activeTitle.isNotEmpty()) activeTitle else (AtharNotificationManager.lastActiveTitle ?: "تنبيه أثر الملكي")
            var aBody = if (activeBody.isNotEmpty()) activeBody else (AtharNotificationManager.lastActiveBody ?: "")
            var aBadge = if (activeBadge.isNotEmpty()) activeBadge else (AtharNotificationManager.lastActiveBadge ?: "🕌 تنبيه أثر الملكي")
            var audio = if (activeAudioUrl.isNotEmpty()) activeAudioUrl else (AtharNotificationManager.lastActiveAudioUrl ?: "")
            var cat = if (activeCategory.isNotEmpty()) activeCategory else (AtharNotificationManager.lastActiveCategory ?: AtharNotificationManager.CAT_PRAYER_ATHAN)
            var surah = if (activeSurahNumber > 0) activeSurahNumber else AtharNotificationManager.lastActiveSurahNumber
            var ayah = if (activeAyahNumber > 0) activeAyahNumber else AtharNotificationManager.lastActiveAyahNumber

            var service = activeInstance
            if (service != null) {
                service.showFloatingOverlayIfPermitted(
                    prayerName = pName,
                    prayerTime = "",
                    title = aTitle,
                    body = aBody,
                    badge = aBadge,
                    category = cat,
                    audioUrl = audio,
                    surahNumber = surah,
                    ayahNumber = ayah
                )
            } else {
                var intent = Intent(context, AthanForegroundService::class.java).apply {
                    action = ACTION_SHOW_ROYAL_OVERLAY
                    putExtra("prayer_name", pName)
                    putExtra("title", aTitle)
                    putExtra("body", aBody)
                    putExtra("badge", aBadge)
                    putExtra("category", cat)
                    putExtra("audio_url", audio)
                    putExtra("surah_number", surah)
                    putExtra("ayah_number", ayah)
                }
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(intent)
                    } else {
                        context.startService(intent)
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }

        @JvmStatic
        fun hideOverlayInsideApp() {
            activeInstance?.removeFloatingOverlayInternal()
        }

        @JvmStatic
        fun startBackgroundService(context: Context) {
            var intent = Intent(context, AthanForegroundService::class.java).apply {
                action = ACTION_START_BACKGROUND_SERVICE
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        @JvmStatic
        fun stopBackgroundService(context: Context) {
            var intent = Intent(context, AthanForegroundService::class.java).apply {
                action = ACTION_STOP_BACKGROUND_SERVICE
            }
            context.startService(intent)
        }
    }


    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as? WindowManager
        createNotificationChannels()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        var currentAction = intent?.action
        when (currentAction) {
            ACTION_STOP_ATHAN -> {
                stopAthanInternal()
                if (isBackgroundServiceRunning) {
                    startForeground(BACKGROUND_NOTIFICATION_ID, buildBackgroundNotification())
                    return START_STICKY
                }
                return START_NOT_STICKY
            }
            ACTION_STOP_BACKGROUND_SERVICE -> {
                isBackgroundServiceRunning = false
                stopBackgroundInternal()
                return START_NOT_STICKY
            }
            ACTION_START_BACKGROUND_SERVICE -> {
                isBackgroundServiceRunning = true
                acquirePartialWakeLock()
                var notification = buildBackgroundNotification()
                startForeground(BACKGROUND_NOTIFICATION_ID, notification)
                return START_STICKY
            }
            ACTION_SHOW_ROYAL_OVERLAY -> {
                var prayerName = intent?.getStringExtra("prayer_name") ?: (AtharNotificationManager.lastActiveTitle ?: "تنبيه أثر الملكي")
                var title = intent?.getStringExtra("title") ?: (AtharNotificationManager.lastActiveTitle ?: "تنبيه أثر الملكي")
                var body = intent?.getStringExtra("body") ?: (AtharNotificationManager.lastActiveBody ?: "")
                var badge = intent?.getStringExtra("badge") ?: (AtharNotificationManager.lastActiveBadge ?: "🕌 تنبيه أثر الملكي")
                var category = intent?.getStringExtra("category") ?: (AtharNotificationManager.lastActiveCategory ?: AtharNotificationManager.CAT_PRAYER_ATHAN)
                var audioUrl = intent?.getStringExtra("audio_url") ?: (AtharNotificationManager.lastActiveAudioUrl ?: "")
                var surahNumber = intent?.getIntExtra("surah_number", 0) ?: AtharNotificationManager.lastActiveSurahNumber
                var ayahNumber = intent?.getIntExtra("ayah_number", 0) ?: AtharNotificationManager.lastActiveAyahNumber

                activeInstance = this
                activePrayerName = prayerName
                activeTitle = title
                activeBody = body
                activeBadge = badge
                activeCategory = category
                activeAudioUrl = audioUrl
                activeSurahNumber = surahNumber
                activeAyahNumber = ayahNumber

                acquirePartialWakeLock()

                var royalResult = AtharNotificationManager.buildRoyalNotification(
                    context = this,
                    category = category,
                    title = title,
                    body = body,
                    badge = badge,
                    audioUrl = audioUrl,
                    isOngoing = true,
                    customNotificationId = FULLSCREEN_NOTIFICATION_ID,
                    surahNumber = surahNumber,
                    ayahNumber = ayahNumber
                )
                startForeground(FULLSCREEN_NOTIFICATION_ID, royalResult.second)

                if (AtharNotificationManager.isSystemOverlayEnabled(this)) {
                    showFloatingOverlayIfPermitted(
                        prayerName = prayerName,
                        prayerTime = "",
                        title = title,
                        body = body,
                        badge = badge,
                        category = category,
                        audioUrl = audioUrl,
                        surahNumber = surahNumber,
                        ayahNumber = ayahNumber
                    )
                }
                return START_NOT_STICKY
            }
            ACTION_HIDE_ROYAL_OVERLAY -> {
                removeFloatingOverlayInternal()
                return START_NOT_STICKY
            }
            ACTION_START_ATHAN, null -> {
                var prayerName = intent?.getStringExtra("prayer_name") ?: "صلاة الفجر"
                var prayerTime = intent?.getStringExtra("prayer_time") ?: "05:15"
                var title = intent?.getStringExtra("title") ?: "حان الآن موعد $prayerName"
                var body = intent?.getStringExtra("body") ?: "الله أكبر · الله أكبر\nحي على الصلاة، حي على الفلاح ($prayerTime)"
                var badge = intent?.getStringExtra("badge") ?: "🕌 أذان الصلاة الفوري"
                var rawAudioUrl = intent?.getStringExtra("audio_url")
                var playSound = intent?.getBooleanExtra("play_sound", true) ?: true
                var category = intent?.getStringExtra("category") ?: AtharNotificationManager.CAT_PRAYER_ATHAN
                var triggerTimestamp = intent?.getLongExtra("trigger_timestamp", 0L) ?: System.currentTimeMillis()
                if (triggerTimestamp > 0L) {
                    AtharNotificationManager.setAthanEventTriggerTime(triggerTimestamp)
                }

                if (isRinging && activePrayerName == prayerName && AtharNotificationManager.isPlaying()) {
                    return START_NOT_STICKY
                }

                acquireFullWakeLock()

                var audioUrl = if (!rawAudioUrl.isNullOrEmpty()) {
                    rawAudioUrl
                } else {
                    AtharNotificationManager.getMuazzinAudioForPrayer(this, prayerName)
                }

                isRinging = true
                activeInstance = this
                activePrayerName = prayerName
                activeTitle = title
                activeBody = body
                activeBadge = badge
                activeCategory = category
                activeAudioUrl = audioUrl

                if (playSound) {
                    AtharNotificationManager.playNotificationAudioWithGuard(this, audioUrl, category)
                }

                var royalResult = AtharNotificationManager.buildRoyalNotification(
                    context = this,
                    category = category,
                    title = title,
                    body = body,
                    badge = badge,
                    audioUrl = audioUrl,
                    isOngoing = true,
                    customNotificationId = FULLSCREEN_NOTIFICATION_ID
                )
                var notification = royalResult.second

                startForeground(FULLSCREEN_NOTIFICATION_ID, notification)

                try {
                    var notifManager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                    notifManager?.notify(FULLSCREEN_NOTIFICATION_ID, notification)
                } catch (e: Exception) {
                    e.printStackTrace()
                }

                AtharNotificationManager.purgeAllExtraneousNotifications(this, FULLSCREEN_NOTIFICATION_ID)

                // The forced intrusive full-screen activity has been removed completely!
                // Instead, display the Royal System Overlay if enabled and user is outside the app
                if (AtharNotificationManager.isSystemOverlayEnabled(this)) {
                    if (!MainActivity.isAppInForeground) {
                        showFloatingOverlayIfPermitted(
                            prayerName = prayerName,
                            prayerTime = prayerTime,
                            title = title,
                            body = body,
                            badge = badge,
                            category = category,
                            audioUrl = audioUrl
                        )
                    }
                }
                return START_NOT_STICKY
            }
            else -> {
                return START_NOT_STICKY
            }
        }
    }

    fun showFloatingOverlayIfPermitted(
        prayerName: String,
        prayerTime: String,
        title: String,
        body: String,
        badge: String,
        category: String = activeCategory,
        audioUrl: String = activeAudioUrl,
        surahNumber: Int = activeSurahNumber,
        ayahNumber: Int = activeAyahNumber
    ) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            return
        }

        mainHandler.post {
            try {
                removeFloatingOverlayInternal()

                var inflater = LayoutInflater.from(this)
                var view = inflater.inflate(R.layout.view_system_overlay_notification, null)

                var layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                } else {
                    @Suppress("DEPRECATION")
                    WindowManager.LayoutParams.TYPE_PHONE
                }

                var params = WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.WRAP_CONTENT,
                    layoutType,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                    PixelFormat.TRANSLUCENT
                ).apply {
                    gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
                    y = 30
                }

                view.findViewById<TextView>(R.id.tvOverlayTitle)?.text = title
                view.findViewById<TextView>(R.id.tvOverlayBody)?.text = body
                view.findViewById<TextView>(R.id.tvOverlayBadge)?.text = badge

                var btnMute = view.findViewById<Button>(R.id.btnOverlayMute)
                val updateMuteBtnText = {
                    if (AtharNotificationManager.isMuted()) {
                        btnMute?.text = "تشغيل الصوت 🔊"
                    } else {
                        btnMute?.text = "كتم الصوت ✕"
                    }
                }
                updateMuteBtnText()

                btnMute?.setOnClickListener {
                    AtharNotificationManager.toggleAudio(this@AthanForegroundService)
                    btnMute.postDelayed({ updateMuteBtnText() }, 50)
                }

                // Close button ('✕') is the clean way to dismiss the overlay and stop sound
                view.findViewById<TextView>(R.id.btnOverlayClose)?.setOnClickListener {
                    if (isRinging) {
                        stopAthan(this@AthanForegroundService)
                    }
                    AtharNotificationManager.stopAndReleasePlayer()
                    AtharNotificationManager.dismissNotificationById(this@AthanForegroundService, FULLSCREEN_NOTIFICATION_ID)
                    removeFloatingOverlayInternal()
                }

                var isAthanCat = (category == AtharNotificationManager.CAT_PRAYER_ATHAN ||
                        category == AtharNotificationManager.CAT_SYSTEM_OVERLAY_ATHAN ||
                        category.contains("prayer") || category.contains("athan"))

                var isAyah = (category == AtharNotificationManager.CAT_QURAN_AYAH || surahNumber > 0)
                var isWird = (category == AtharNotificationManager.CAT_QURAN_WIRD)
                var isParents = (category == AtharNotificationManager.CAT_PARENTS_DUTY)
                var isTasbih = (category == AtharNotificationManager.CAT_DHIKR_TASBEEH || category == AtharNotificationManager.CAT_SALAWAT)
                var isAdhkar = (category == AtharNotificationManager.CAT_MORNING_EVENING)

                var actionText = when {
                    isAthanCat -> "عرض الأذان والمواقيت 🕌"
                    isAyah -> "اذهب للآية 📖"
                    isWird -> "صفحة القرآن 📖"
                    isParents -> "صفحة بر الوالدين 🤍"
                    isTasbih -> "المسبحة والاستغفار 📿"
                    isAdhkar -> "أذكار اليوم 🌅"
                    else -> "فتح تطبيق أثر 🕌"
                }

                var btnOpen = view.findViewById<Button>(R.id.btnOverlayOpen)
                btnOpen?.text = actionText

                btnOpen?.setOnClickListener {
                    var targetTab = when {
                        isAyah || isWird -> "quran"
                        isParents -> "companion"
                        isTasbih -> "home"
                        isAdhkar -> "adhkar"
                        isAthanCat -> "prayers"
                        else -> "home"
                    }

                    var mainIntent = Intent(this@AthanForegroundService, MainActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                        putExtra("action", if (isAthanCat) "OPEN_ATHAN_FULLSCREEN" else "com.athar.islamic.ACTION_DEEP_LINK")
                        putExtra("prayer_name", title)
                        putExtra("alert_title", title)
                        putExtra("alert_body", body)
                        putExtra("category_badge", badge)
                        putExtra("category", category)
                        putExtra("notification_category", category)
                        putExtra("target_tab", targetTab)
                        putExtra("surah_number", surahNumber)
                        putExtra("ayah_number", ayahNumber)
                        putExtra("open_parents_modal", isParents)
                        putExtra("open_wird", isWird)
                        putExtra("open_tasbih", isTasbih)
                        putExtra("audio_url", audioUrl)
                    }
                    startActivity(mainIntent)
                    removeFloatingOverlayInternal()
                }

                // Animate golden progress line matching audio duration
                val progressBar = view.findViewById<View>(R.id.viewOverlayProgress)
                if (progressBar != null) {
                    progressBar.pivotX = 0f
                    val totalDuration = AtharNotificationManager.getDurationMs()
                    val elapsed = AtharNotificationManager.getCurrentPositionMs()
                    val remainingMs = if (totalDuration > 0 && totalDuration > elapsed) {
                        Math.max(2000L, totalDuration - elapsed)
                    } else {
                        if (isAthanCat) 180000L else 30000L
                    }
                    val startScale = if (totalDuration > 0) {
                        Math.min(1f, Math.max(0.05f, remainingMs.toFloat() / totalDuration.toFloat()))
                    } else {
                        1f
                    }
                    overlayAnimator?.cancel()
                    overlayAnimator = ObjectAnimator.ofFloat(progressBar, "scaleX", startScale, 0f).apply {
                        duration = remainingMs
                        interpolator = LinearInterpolator()
                        start()
                    }
                }

                windowManager?.addView(view, params)
                floatingOverlayView = view
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun removeFloatingOverlayInternal() {
        try {
            overlayAnimator?.cancel()
            overlayAnimator = null
            floatingOverlayView?.let { view ->
                windowManager?.removeView(view)
                floatingOverlayView = null
            }
        } catch (e: Exception) {
            floatingOverlayView = null
        }
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            var manager = getSystemService(NotificationManager::class.java)

            var fullScreenChannel = NotificationChannel(
                FULLSCREEN_CHANNEL_ID,
                "أذان ومواقيت الصلاة الفورية (شاشة كاملة وإشعار عائم)",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "قناة إطلاق إشعار الأذان العائم والشاشة الكاملة (USE_FULL_SCREEN_INTENT)"
                enableLights(true)
                lightColor = Color.parseColor("#E6C66E")
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 1000, 500, 1000, 500, 1500)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                setBypassDnd(true)
            }
            manager?.createNotificationChannel(fullScreenChannel)

            var backgroundChannel = NotificationChannel(
                BACKGROUND_CHANNEL_ID,
                "خدمة أثر في الخلفية وحماية الأذان",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "حماية مواقيت الصلاة والأذكار والتنبيهات الدقيقة من توقف النظام وتوفير البطارية"
                setShowBadge(false)
            }
            manager?.createNotificationChannel(backgroundChannel)
        }
    }

    private fun buildBackgroundNotification(): Notification {
        var contentIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        var contentPendingIntent = PendingIntent.getActivity(
            this,
            1005,
            contentIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        var appLogoBitmap = try {
            OngoingPrayerNotificationService.getScaledAppLogo(this, 96)
        } catch (e: Exception) {
            null
        }

        return NotificationCompat.Builder(this, BACKGROUND_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_athar)
            .apply {
                if (appLogoBitmap != null) setLargeIcon(appLogoBitmap)
            }
            .setContentTitle("🕌 أثر يعمل في الخلفية")
            .setContentText("حماية مواقيت الصلوات الخمس والمنبهات من قيود توفير الطاقة")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setSilent(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(contentPendingIntent)
            .setColor(Color.parseColor("#E6C66E"))
            .build()
    }

    private fun acquireFullWakeLock() {
        var powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
        fullWakeLock = powerManager?.newWakeLock(
            PowerManager.FULL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
            "Athar:AthanFullWakeLock"
        )?.apply {
            acquire(10 * 60 * 1000L) // 10 minutes max
        }
    }

    private fun acquirePartialWakeLock() {
        if (partialWakeLock == null) {
            var powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
            partialWakeLock = powerManager?.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "Athar:BackgroundPartialWakeLock"
            )?.apply {
                acquire(24 * 60 * 60 * 1000L) // Safe partial lock
            }
        }
    }

    private fun stopAthanInternal() {
        mainHandler.post {
            removeFloatingOverlayInternal()
        }

        AtharNotificationManager.stopAndReleasePlayer()

        isRinging = false
        activeInstance = null

        try {
            if (fullWakeLock?.isHeld == true) {
                fullWakeLock?.release()
            }
        } catch (e: Exception) {}

        try {
            var notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(FULLSCREEN_NOTIFICATION_ID)
            notificationManager.cancel(99991)
            notificationManager.cancel(AtharNotificationManager.ID_PRAYER_ATHAN)
        } catch (e: Exception) {}

        stopForeground(true)
    }

    private fun stopBackgroundInternal() {
        stopAthanInternal()

        try {
            if (partialWakeLock?.isHeld == true) {
                partialWakeLock?.release()
                partialWakeLock = null
            }
        } catch (e: Exception) {}

        isBackgroundServiceRunning = false
        stopForeground(true)
        stopSelf()
    }

    override fun onDestroy() {
        stopBackgroundInternal()
        super.onDestroy()
    }
}
