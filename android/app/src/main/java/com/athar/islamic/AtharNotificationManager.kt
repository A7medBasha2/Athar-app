package com.athar.islamic

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.res.AssetFileDescriptor
import android.graphics.BitmapFactory
import android.graphics.Color
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import java.util.concurrent.atomic.AtomicBoolean

/**
 * AtharNotificationManager
 * Centralized, high-performance "Royal Islamic" Notification Engine for the Athar App.
 *
 * Implements:
 * 1. Continuous Background Audio Timeline: MediaPlayer advances continuously in real-time.
 * 2. Mute vs. Pause Logic:
 *    - "Mute" sets volume to 0f without pausing, resetting, or losing playback position.
 *    - "Unmute" immediately restores volume (1.0f) at the exact current timeline point.
 * 3. Dynamic RemoteViews Synchronization:
 *    - Action button uses stable ACTION_TOGGLE_AUDIO so FLAG_IMMUTABLE never desynchronizes intent.
 *    - RemoteViews dynamically display "كتم الصوت ✕" or "تشغيل الصوت 🔊".
 * 4. Strict Anti-Overlap Audio Guard across all 14 categories.
 * 5. Safe AssetFileDescriptor lifecycle: keeps FD open during playback without premature close.
 */
object AtharNotificationManager {

    // ==========================================
    // 14 DISTINCT CATEGORY IDENTIFIERS & STATIC IDS
    // ==========================================
    const val CAT_PRAYER_ATHAN = "prayer_athan"
    const val CAT_IQAMAH = "iqamah"
    const val CAT_POST_ADHAN_DUA = "post_adhan_dua"
    const val CAT_QURAN_AYAH = "quran_ayah"
    const val CAT_QURAN_WIRD = "quran_wird"
    const val CAT_SALAWAT = "salawat"
    const val CAT_DHIKR_TASBEEH = "dhikr_tasbeeh"
    const val CAT_MORNING_EVENING = "morning_evening"
    const val CAT_PARENTS_DUTY = "parents_duty"
    const val CAT_ONGOING_PRAYER = "ongoing_prayer"
    const val CAT_SYSTEM_OVERLAY_ATHAN = "system_overlay_athan"
    const val CAT_SMART_ALARM = "smart_alarm"
    const val CAT_CALL_INTERRUPTION = "call_interruption"
    const val CAT_SMART_SILENCE = "smart_silence"

    // Static Unique Notification IDs (guarantees NO duplicates or stacking per category)
    const val ID_PRAYER_ATHAN = 1001
    const val ID_IQAMAH = 1002
    const val ID_POST_ADHAN_DUA = 1003
    const val ID_QURAN_AYAH = 1004
    const val ID_QURAN_WIRD = 1005
    const val ID_SALAWAT = 1006
    const val ID_DHIKR_TASBEEH = 1007
    const val ID_MORNING_EVENING = 1008
    const val ID_PARENTS_DUTY = 1009
    const val ID_ONGOING_PRAYER = 1010
    const val ID_SYSTEM_OVERLAY_ATHAN = 1011
    const val ID_SMART_ALARM = 1012
    const val ID_CALL_INTERRUPTION = 1013
    const val ID_SMART_SILENCE = 1014

    // Android Notification Channels
    const val CHANNEL_ATHAN_ID = "athar_athan_channel"
    const val CHANNEL_IQAMAH_ID = "athar_iqamah_channel"
    const val CHANNEL_QURAN_ID = "athar_quran_channel"
    const val CHANNEL_DHIKR_ID = "athar_dhikr_channel"
    const val CHANNEL_PARENTS_ID = "athar_parents_channel"
    const val CHANNEL_ONGOING_ID = "athar_ongoing_channel"
    const val CHANNEL_ALARM_ID = "athar_alarm_channel"
    const val CHANNEL_SYSTEM_ID = "athar_system_channel"

    // Intent Actions
    const val ACTION_MUTE_NOTIFICATION_AUDIO = "com.athar.islamic.ACTION_MUTE_NOTIFICATION_AUDIO"
    const val ACTION_UNMUTE_NOTIFICATION_AUDIO = "com.athar.islamic.ACTION_UNMUTE_NOTIFICATION_AUDIO"
    const val ACTION_TOGGLE_AUDIO = "com.athar.islamic.ACTION_TOGGLE_AUDIO"
    const val ACTION_PAUSE_AUDIO = "com.athar.islamic.ACTION_PAUSE_AUDIO"
    const val ACTION_RESUME_AUDIO = "com.athar.islamic.ACTION_RESUME_AUDIO"
    const val ACTION_DISMISS_NOTIFICATION = "com.athar.islamic.ACTION_DISMISS_NOTIFICATION"
    const val ACTION_RESUME_AFTER_CALL = "com.athar.islamic.ACTION_RESUME_AFTER_CALL"
    const val EXTRA_NOTIFICATION_ID = "extra_notification_id"
    const val EXTRA_CATEGORY = "extra_category"

    // ==========================================
    // CONTINUOUS BACKGROUND AUDIO TIMELINE STATE
    // ==========================================
    private val audioLock = Any()
    @Volatile private var activeMediaPlayer: MediaPlayer? = null
    @Volatile private var currentAssetFd: AssetFileDescriptor? = null
    @Volatile private var currentPlayingCategory: String? = null
    @Volatile private var currentPlayingUrl: String? = null
    @Volatile private var playbackStartTimeMs: Long = 0L
    @Volatile private var activeDurationMs: Long = 180000L // Default fallback duration (3 min)
    @Volatile private var pausedPositionMs: Long = 0L

    private val isAudioMuted = AtomicBoolean(false)
    private val isAudioPaused = AtomicBoolean(false)
    private val mainHandler = Handler(Looper.getMainLooper())

    // Cached notification state for dynamic RemoteViews updates
    @Volatile private var lastActiveCategory: String? = null
    @Volatile private var lastActiveTitle: String? = null
    @Volatile private var lastActiveBody: String? = null
    @Volatile private var lastActiveBadge: String? = null
    @Volatile private var lastActiveAudioUrl: String? = null
    @Volatile private var lastActiveNotifId: Int = 0
    @Volatile private var lastActiveIsOngoing: Boolean = false

    /**
     * Initializes all notification channels with appropriate priorities and visual badges.
     */
    fun initChannels(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

            val channels = listOf(
                NotificationChannel(
                    CHANNEL_ATHAN_ID,
                    "أذان الصلوات والمنبه الملكي (أثر)",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "تنبيهات الأذان والصلوات الخمس ذات الأولوية الملكية مع الصوت الكامل"
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 500, 250, 500)
                    enableLights(true)
                    lightColor = Color.parseColor("#E6C66E")
                },
                NotificationChannel(
                    CHANNEL_IQAMAH_ID,
                    "تنبيهات إقامة الصلاة",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "تنبيهات اقتراب إقامة الصلاة والاستعداد للوقوف في المحراب"
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                    enableVibration(true)
                    enableLights(true)
                    lightColor = Color.parseColor("#D4AF37")
                },
                NotificationChannel(
                    CHANNEL_QURAN_ID,
                    "المصحف والورد القرآني (اقرأ لو آية)",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "آيات قرآنية مختارة وتدبر يومي للورد"
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                    enableLights(true)
                    lightColor = Color.parseColor("#E6C66E")
                },
                NotificationChannel(
                    CHANNEL_DHIKR_ID,
                    "الأذكار والتسبيح والصلوات على النبي ﷺ",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "أذكار الصباح والمساء والصلوات والتسبيحات الـ 13 المعتمدة"
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                    enableLights(true)
                    lightColor = Color.parseColor("#D4AF37")
                },
                NotificationChannel(
                    CHANNEL_PARENTS_ID,
                    "بر الوالدين وصلة الرحم",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "تنبيهات الوصية بالوالدين والإحسان إليهما"
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                },
                NotificationChannel(
                    CHANNEL_ONGOING_ID,
                    "شريط مواقيت الصلاة الدائم",
                    NotificationManager.IMPORTANCE_LOW
                ).apply {
                    description = "شريط الإشعارات المستمر لعرض مواقيت الصلوات والعد التنازلي"
                    setShowBadge(false)
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                    enableVibration(false)
                    setSound(null, null)
                },
                NotificationChannel(
                    CHANNEL_ALARM_ID,
                    "منبه أثر الإسلامي الذكي (الفجر وقيام الليل)",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "منبه الاستيقاظ لصلاة الفجر وقيام الليل"
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                    enableVibration(true)
                    enableLights(true)
                    lightColor = Color.parseColor("#FFF2C2")
                },
                NotificationChannel(
                    CHANNEL_SYSTEM_ID,
                    "تنبيهات أثر الذكية والسكينة",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "وضع السكون الذكي أثناء الصلاة وتنبيهات استئناف الاستماع"
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                }
            )

            channels.forEach { manager.createNotificationChannel(it) }
        }
    }

    /**
     * Maps each category to its unique static notification ID
     */
    fun getNotificationId(category: String): Int {
        return when (category) {
            CAT_PRAYER_ATHAN -> ID_PRAYER_ATHAN
            CAT_IQAMAH -> ID_IQAMAH
            CAT_POST_ADHAN_DUA -> ID_POST_ADHAN_DUA
            CAT_QURAN_AYAH -> ID_QURAN_AYAH
            CAT_QURAN_WIRD -> ID_QURAN_WIRD
            CAT_SALAWAT -> ID_SALAWAT
            CAT_DHIKR_TASBEEH -> ID_DHIKR_TASBEEH
            CAT_MORNING_EVENING -> ID_MORNING_EVENING
            CAT_PARENTS_DUTY -> ID_PARENTS_DUTY
            CAT_ONGOING_PRAYER -> ID_ONGOING_PRAYER
            CAT_SYSTEM_OVERLAY_ATHAN -> ID_SYSTEM_OVERLAY_ATHAN
            CAT_SMART_ALARM -> ID_SMART_ALARM
            CAT_CALL_INTERRUPTION -> ID_CALL_INTERRUPTION
            CAT_SMART_SILENCE -> ID_SMART_SILENCE
            else -> 1999
        }
    }

    /**
     * Maps each category to its dedicated Notification Channel
     */
    fun getChannelId(category: String): String {
        return when (category) {
            CAT_PRAYER_ATHAN, CAT_SYSTEM_OVERLAY_ATHAN -> CHANNEL_ATHAN_ID
            CAT_IQAMAH -> CHANNEL_IQAMAH_ID
            CAT_QURAN_AYAH, CAT_QURAN_WIRD -> CHANNEL_QURAN_ID
            CAT_SALAWAT, CAT_DHIKR_TASBEEH, CAT_MORNING_EVENING, CAT_POST_ADHAN_DUA -> CHANNEL_DHIKR_ID
            CAT_PARENTS_DUTY -> CHANNEL_PARENTS_ID
            CAT_ONGOING_PRAYER -> CHANNEL_ONGOING_ID
            CAT_SMART_ALARM -> CHANNEL_ALARM_ID
            CAT_CALL_INTERRUPTION, CAT_SMART_SILENCE -> CHANNEL_SYSTEM_ID
            else -> CHANNEL_SYSTEM_ID
        }
    }

    /**
     * Returns the context-aware luxury gold badge title for each category
     */
    fun getCategoryBadge(category: String): String {
        return when (category) {
            CAT_PRAYER_ATHAN -> "🕌 أذان الصلاة"
            CAT_IQAMAH -> "⏳ إقامة الصلاة"
            CAT_POST_ADHAN_DUA -> "🤲 دعاء ما بعد الأذان"
            CAT_QURAN_AYAH -> "📖 اقرأ لو آية"
            CAT_QURAN_WIRD -> "📜 ورد القرآن اليومي"
            CAT_SALAWAT -> "💚 الصلاة على النبي ﷺ"
            CAT_DHIKR_TASBEEH -> "📿 تسبيح وأذكار"
            CAT_MORNING_EVENING -> "🌅 أذكار اليوم"
            CAT_PARENTS_DUTY -> "🤍 بر الوالدين"
            CAT_ONGOING_PRAYER -> "🕋 مواقيت الصلاة"
            CAT_SYSTEM_OVERLAY_ATHAN -> "✨ تنبيه أثر الملكي"
            CAT_SMART_ALARM -> "⏰ منبه أثر الذكي"
            CAT_CALL_INTERRUPTION -> "📞 استئناف الاستماع"
            CAT_SMART_SILENCE -> "🔕 السكون أثناء الصلاة"
            else -> "🕌 تنبيه أثر الملكي"
        }
    }

    /**
     * Returns the target deep-link navigation tab in the app for each category
     */
    fun getTargetTab(category: String): String {
        return when (category) {
            CAT_PRAYER_ATHAN, CAT_IQAMAH, CAT_POST_ADHAN_DUA, CAT_ONGOING_PRAYER, CAT_SYSTEM_OVERLAY_ATHAN -> "prayers"
            CAT_QURAN_AYAH, CAT_QURAN_WIRD, CAT_CALL_INTERRUPTION -> "quran"
            CAT_SALAWAT, CAT_PARENTS_DUTY, CAT_SMART_ALARM -> "reminders"
            CAT_DHIKR_TASBEEH, CAT_MORNING_EVENING -> "adhkar"
            CAT_SMART_SILENCE -> "settings"
            else -> "home"
        }
    }

    // ==========================================
    // NOTIFICATION DISPATCH ENGINE
    // ==========================================

    /**
     * Builds a unified "Royal Glass" RemoteViews notification for ANY of the 14 sections.
     * Returns Pair(notificationId, Notification) for flexible posting or foreground services.
     */
    fun buildRoyalNotification(
        context: Context,
        category: String,
        title: String,
        body: String,
        badge: String? = null,
        audioUrl: String? = null,
        isOngoing: Boolean = false,
        customNotificationId: Int? = null,
        isMutedState: Boolean = isAudioMuted.get(),
        isEndedState: Boolean = false
    ): Pair<Int, Notification> {
        initChannels(context)

        val notifId = customNotificationId ?: getNotificationId(category)
        val categoryBadge = badge ?: getCategoryBadge(category)
        val channelId = getChannelId(category)
        val targetTab = getTargetTab(category)
        val safeAudioUrl = audioUrl ?: ""

        // 1. Deep-link Intent to Open App at Target Screen
        val openAppIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("target_tab", targetTab)
            putExtra("notification_category", category)
            putExtra("alert_title", title)
            putExtra("alert_body", body)
            putExtra("audio_url", safeAudioUrl)
            putExtra("elapsed_ms", getCurrentPositionMs())
            putExtra("duration_ms", getDurationMs())
            putExtra("is_muted", isMutedState)
        }
        val openAppPendingIntent = PendingIntent.getActivity(
            context,
            notifId * 10 + 1,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        // 2. Mute / Unmute Interactive Action Intent (Using stable ACTION_TOGGLE_AUDIO so FLAG_IMMUTABLE never desyncs)
        val audioActionIntent = Intent(context, AtharNotificationReceiver::class.java).apply {
            action = if (isEndedState) ACTION_RESUME_AUDIO else ACTION_TOGGLE_AUDIO
            putExtra(EXTRA_NOTIFICATION_ID, notifId)
            putExtra(EXTRA_CATEGORY, category)
        }
        val audioActionPendingIntent = PendingIntent.getBroadcast(
            context,
            notifId * 10 + 2,
            audioActionIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        // 3. Dismiss Notification PendingIntent
        val dismissIntent = Intent(context, AtharNotificationReceiver::class.java).apply {
            action = ACTION_DISMISS_NOTIFICATION
            putExtra(EXTRA_NOTIFICATION_ID, notifId)
            putExtra(EXTRA_CATEGORY, category)
        }
        val dismissPendingIntent = PendingIntent.getBroadcast(
            context,
            notifId * 10 + 3,
            dismissIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        // 4. Construct Collapsed RemoteViews
        val collapsedView = RemoteViews(context.packageName, R.layout.notification_royal_collapsed).apply {
            setTextViewText(R.id.tvNotifTitle, title)
            setTextViewText(R.id.tvNotifBody, body.replace("\n", " · "))
            setTextViewText(R.id.tvNotifBadge, categoryBadge)
        }

        // 5. Construct Expanded RemoteViews with 2 Synchronized Action Buttons
        val expandedView = RemoteViews(context.packageName, R.layout.notification_royal_expanded).apply {
            setTextViewText(R.id.tvNotifTitle, title)
            setTextViewText(R.id.tvNotifBody, body)
            setTextViewText(R.id.tvNotifBadge, categoryBadge)

            // Button 1: Dynamic Mute/Unmute Label and Action
            if (isEndedState) {
                setTextViewText(R.id.btnNotifAudio, "إعادة الاستماع ↻")
            } else if (isMutedState) {
                setTextViewText(R.id.btnNotifAudio, "تشغيل الصوت 🔊")
            } else {
                setTextViewText(R.id.btnNotifAudio, "كتم الصوت ✕")
            }
            setOnClickPendingIntent(R.id.btnNotifAudio, audioActionPendingIntent)

            // Button 2: Deep Link Action to open target screen
            setOnClickPendingIntent(R.id.btnNotifOpen, openAppPendingIntent)

            // Close / Dismiss Icon
            setOnClickPendingIntent(R.id.btnNotifClose, dismissPendingIntent)
        }

        val appLogoBitmap = try {
            BitmapFactory.decodeResource(context.resources, R.drawable.icon_logo)
        } catch (e: Exception) {
            null
        }

        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.ic_stat_athar)
            .apply {
                if (appLogoBitmap != null) setLargeIcon(appLogoBitmap)
            }
            .setStyle(NotificationCompat.DecoratedCustomViewStyle())
            .setCustomContentView(collapsedView)
            .setCustomBigContentView(expandedView)
            .setCustomHeadsUpContentView(expandedView)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(if (isOngoing) NotificationCompat.PRIORITY_LOW else NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(openAppPendingIntent)
            .setAutoCancel(!isOngoing)
            .setOngoing(isOngoing)
            .setColor(Color.parseColor("#E6C66E"))

        // Add FullScreenIntent for high priority Athan / Smart Alarm
        if (category == CAT_PRAYER_ATHAN || category == CAT_SMART_ALARM || category == CAT_SYSTEM_OVERLAY_ATHAN) {
            val fullScreenIntent = Intent(context, AthanFullScreenActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("alert_title", title)
                putExtra("alert_body", body)
                putExtra("category_badge", categoryBadge)
                putExtra("category", category)
                putExtra("audio_url", safeAudioUrl)
                putExtra("elapsed_ms", getCurrentPositionMs())
                putExtra("duration_ms", getDurationMs())
                putExtra("is_muted", isMutedState)
            }
            val fullScreenPendingIntent = PendingIntent.getActivity(
                context,
                notifId * 10 + 4,
                fullScreenIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            )
            builder.setFullScreenIntent(fullScreenPendingIntent, true)
        }

        return Pair(notifId, builder.build())
    }

    /**
     * Builds and displays a unified "Royal Glass" RemoteViews notification for ANY of the 14 sections.
     */
    fun showRoyalNotification(
        context: Context,
        category: String,
        title: String,
        body: String,
        badge: String? = null,
        audioUrl: String? = null,
        playSound: Boolean = false,
        isOngoing: Boolean = false,
        customNotificationId: Int? = null
    ) {
        val notifId = customNotificationId ?: getNotificationId(category)
        val categoryBadge = badge ?: getCategoryBadge(category)

        // Cache state for dynamic in-place RemoteViews updates
        lastActiveCategory = category
        lastActiveTitle = title
        lastActiveBody = body
        lastActiveBadge = categoryBadge
        lastActiveAudioUrl = audioUrl
        lastActiveNotifId = notifId
        lastActiveIsOngoing = isOngoing

        // Build and post notification
        var royalResult = buildRoyalNotification(
            context = context,
            category = category,
            title = title,
            body = body,
            badge = categoryBadge,
            audioUrl = audioUrl,
            isOngoing = isOngoing,
            customNotificationId = notifId,
            isMutedState = isAudioMuted.get(),
            isEndedState = false
        )
        var notification = royalResult.second

        var notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        notificationManager?.notify(notifId, notification)

        // Play Audio if requested with Strict Anti-Overlap Audio Guard
        if (playSound && !audioUrl.isNullOrBlank()) {
            playNotificationAudioWithGuard(context, audioUrl, category)
        }
    }

    /**
     * Updates notification view in-place to reflect updated mute/playback states without restarting audio
     */
    fun updateNotificationViews(context: Context, isMutedState: Boolean, isEndedState: Boolean = false) {
        if (lastActiveNotifId > 0 && lastActiveTitle != null) {
            var category = lastActiveCategory ?: CAT_PRAYER_ATHAN
            var title = lastActiveTitle ?: "أثر | تنبيه ملكي"
            var body = lastActiveBody ?: ""
            var categoryBadge = lastActiveBadge ?: getCategoryBadge(category)
            var audioUrl = lastActiveAudioUrl
            var isOngoing = lastActiveIsOngoing
            var notifId = lastActiveNotifId

            var royalResult = buildRoyalNotification(
                context = context,
                category = category,
                title = title,
                body = body,
                badge = categoryBadge,
                audioUrl = audioUrl,
                isOngoing = isOngoing,
                customNotificationId = notifId,
                isMutedState = isMutedState,
                isEndedState = isEndedState
            )
            var notification = royalResult.second

            var notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            notificationManager?.notify(notifId, notification)
        }
    }

    /**
     * Dismisses a notification by category or ID and releases the audio player
     */
    fun dismissNotification(context: Context, category: String) {
        val notifId = getNotificationId(category)
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        manager?.cancel(notifId)
        if (currentPlayingCategory == category) {
            stopAndReleasePlayer()
        }
    }

    fun dismissNotificationById(context: Context, notifId: Int) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        manager?.cancel(notifId)
        if (lastActiveNotifId == notifId) {
            stopAndReleasePlayer()
        }
    }

    // ==========================================
    // CONTINUOUS BACKGROUND AUDIO PLAYBACK & TIMELINE
    // ==========================================

    /**
     * Plays audio for a notification with a continuous timeline:
     * - Does NOT restart if the same stream is already active.
     * - Keeps playback continuously running in background even when muted.
     * - Retains AssetFileDescriptor safely so MediaPlayer never encounters file descriptor errors.
     * - Gracefully clears any conflicting stream if a new category arrives.
     */
    fun playNotificationAudioWithGuard(context: Context, audioPathOrUrl: String, category: String) {
        synchronized(audioLock) {
            try {
                // If same track is already playing or active, do NOT reset!
                if (currentPlayingCategory == category && currentPlayingUrl == audioPathOrUrl && activeMediaPlayer != null) {
                    if (isAudioPaused.get()) {
                        resumeAudio(context)
                    } else if (isAudioMuted.get()) {
                        unmuteCurrentAudio(context)
                    }
                    return
                }

                // If different track/category, gracefully stop previous
                stopAndReleasePlayer()

                isAudioMuted.set(false)
                isAudioPaused.set(false)
                currentPlayingCategory = category
                currentPlayingUrl = audioPathOrUrl
                pausedPositionMs = 0L

                val player = MediaPlayer()
                val attributes = AudioAttributes.Builder()
                    .setUsage(
                        if (category == CAT_SMART_ALARM || category == CAT_PRAYER_ATHAN)
                            AudioAttributes.USAGE_ALARM
                        else
                            AudioAttributes.USAGE_NOTIFICATION_EVENT
                    )
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()

                player.setAudioAttributes(attributes)

                var dataSourceSet = false
                if (audioPathOrUrl.startsWith("http://") || audioPathOrUrl.startsWith("https://")) {
                    player.setDataSource(context, Uri.parse(audioPathOrUrl))
                    dataSourceSet = true
                } else {
                    val cleanPath = audioPathOrUrl.removePrefix("public/").removePrefix("/")
                    val candidates = listOf(
                        "public/$cleanPath",
                        cleanPath,
                        "public/audio/$cleanPath",
                        "audio/$cleanPath"
                    )
                    for (candidate in candidates) {
                        try {
                            val afd = context.assets.openFd(candidate)
                            currentAssetFd = afd
                            player.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                            dataSourceSet = true
                            break
                        } catch (e: Exception) {
                            // Candidate not found, try next
                        }
                    }
                }

                if (!dataSourceSet) {
                    // Safe fallbacks to bundled authentic assets
                    val fallbacks = listOf(
                        "public/audio/adhan_alafasy.mp3",
                        "public/audio/salawat.mp3",
                        "public/audio/dhikr_sample.mp3"
                    )
                    for (fb in fallbacks) {
                        try {
                            val afd = context.assets.openFd(fb)
                            currentAssetFd = afd
                            player.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                            dataSourceSet = true
                            break
                        } catch (e: Exception) {}
                    }
                }

                if (!dataSourceSet) {
                    val alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                        ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                    if (alertUri != null) {
                        player.setDataSource(context, alertUri)
                        dataSourceSet = true
                    }
                }

                player.setOnCompletionListener {
                    synchronized(audioLock) {
                        stopAndReleasePlayer()
                        updateNotificationViews(context, isMutedState = false, isEndedState = true)
                    }
                }

                player.setOnErrorListener { _, what, extra ->
                    synchronized(audioLock) {
                        stopAndReleasePlayer()
                    }
                    true
                }

                player.setOnPreparedListener { mp ->
                    synchronized(audioLock) {
                        if (activeMediaPlayer !== mp) return@setOnPreparedListener
                        activeDurationMs = mp.duration.toLong()
                        playbackStartTimeMs = System.currentTimeMillis()
                        if (isAudioMuted.get()) {
                            mp.setVolume(0f, 0f)
                        } else {
                            mp.setVolume(1.0f, 1.0f)
                        }
                        mp.start()
                    }
                }

                player.prepareAsync()
                activeMediaPlayer = player
            } catch (e: Exception) {
                e.printStackTrace()
                stopAndReleasePlayer()
            }
        }
    }

    /**
     * MUTES the audio stream in-place without pausing or resetting playback position.
     * The track continues advancing in real-time in the background.
     */
    fun muteCurrentAudio(context: Context? = null) {
        synchronized(audioLock) {
            isAudioMuted.set(true)
            try {
                activeMediaPlayer?.setVolume(0f, 0f)
            } catch (e: Exception) {
                e.printStackTrace()
            }
            if (context != null) {
                updateNotificationViews(context, isMutedState = true, isEndedState = false)
            }
        }
    }

    /**
     * UNMUTES the audio stream in-place.
     * Restores volume to 1.0f immediately, continuing from the exact current timeline point.
     * Zero resetting or restarting from 0:00!
     */
    fun unmuteCurrentAudio(context: Context? = null) {
        synchronized(audioLock) {
            isAudioMuted.set(false)
            try {
                val mp = activeMediaPlayer
                if (mp != null) {
                    if (!mp.isPlaying && !isAudioPaused.get()) {
                        mp.start()
                    }
                    mp.setVolume(1.0f, 1.0f)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
            if (context != null) {
                updateNotificationViews(context, isMutedState = false, isEndedState = false)
            }
        }
    }

    /**
     * Toggles between Mute and Unmute without interrupting timeline progress
     */
    fun toggleAudio(context: Context? = null) {
        if (isAudioMuted.get()) {
            unmuteCurrentAudio(context)
        } else {
            muteCurrentAudio(context)
        }
    }

    /**
     * Pauses audio while preserving the exact playback position
     */
    fun pauseAudio(context: Context? = null) {
        synchronized(audioLock) {
            isAudioPaused.set(true)
            try {
                activeMediaPlayer?.let { mp ->
                    if (mp.isPlaying) {
                        pausedPositionMs = mp.currentPosition.toLong()
                        mp.pause()
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
            if (context != null) {
                updateNotificationViews(context, isMutedState = isAudioMuted.get(), isEndedState = false)
            }
        }
    }

    /**
     * Resumes audio from the preserved playback position
     */
    fun resumeAudio(context: Context? = null) {
        synchronized(audioLock) {
            isAudioPaused.set(false)
            try {
                activeMediaPlayer?.let { mp ->
                    if (!mp.isPlaying) {
                        if (isAudioMuted.get()) {
                            mp.setVolume(0f, 0f)
                        } else {
                            mp.setVolume(1.0f, 1.0f)
                        }
                        mp.start()
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
            if (context != null) {
                updateNotificationViews(context, isMutedState = isAudioMuted.get(), isEndedState = false)
            }
        }
    }

    /**
     * Returns the continuous real-time progress position in milliseconds
     */
    fun getCurrentPositionMs(): Long {
        synchronized(audioLock) {
            val mp = activeMediaPlayer
            return try {
                if (mp != null && (mp.isPlaying || isAudioMuted.get())) {
                    mp.currentPosition.toLong()
                } else if (isAudioPaused.get()) {
                    pausedPositionMs
                } else if (playbackStartTimeMs > 0L) {
                    System.currentTimeMillis() - playbackStartTimeMs
                } else {
                    0L
                }
            } catch (e: Exception) {
                pausedPositionMs
            }
        }
    }

    /**
     * Returns total track duration in milliseconds
     */
    fun getDurationMs(): Long {
        synchronized(audioLock) {
            val mp = activeMediaPlayer
            return try {
                val d = mp?.duration?.toLong() ?: activeDurationMs
                if (d > 0) d else activeDurationMs
            } catch (e: Exception) {
                activeDurationMs
            }
        }
    }

    fun isPlaying(): Boolean {
        synchronized(audioLock) {
            return activeMediaPlayer?.isPlaying == true || (activeMediaPlayer != null && isAudioMuted.get() && !isAudioPaused.get())
        }
    }

    fun isMuted(): Boolean {
        return isAudioMuted.get()
    }

    /**
     * Complete cleanup: stops, resets, and releases the MediaPlayer and open AssetFileDescriptor
     */
    fun stopAndReleasePlayer() {
        try {
            activeMediaPlayer?.let { mp ->
                if (mp.isPlaying) {
                    mp.stop()
                }
                mp.reset()
                mp.release()
            }
        } catch (e: Exception) {
            // Ignore release exceptions
        } finally {
            activeMediaPlayer = null
            currentPlayingCategory = null
            currentPlayingUrl = null
            pausedPositionMs = 0L
            playbackStartTimeMs = 0L
            isAudioMuted.set(false)
            isAudioPaused.set(false)
        }

        try {
            currentAssetFd?.close()
        } catch (e: Exception) {
            // Ignore FD close exceptions
        } finally {
            currentAssetFd = null
        }
    }
}
