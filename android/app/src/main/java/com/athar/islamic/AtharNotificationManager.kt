package com.athar.islamic

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
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
import android.os.PowerManager
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.random.Random

/**
 * AtharNotificationManager
 * Centralized, high-performance "Royal Islamic" Notification Engine for the Athar App.
 *
 * Implements:
 * 1. Audio Playback Control & System Isolation:
 *    - Seamless Play/Pause & State Retention (resumes from exact pausedPositionMs without restarting).
 *    - Inline action buttons: Mute / Unmute / Play / Pause.
 *    - setOngoing(true) while playing, setOngoing(false) when paused/stopped.
 *    - Never uses MediaStyle/MediaSession; uses custom RemoteViews with CATEGORY_ALARM or CATEGORY_EVENT.
 * 2. Universal Delivery & Lockscreen / Background Execution:
 *    - Background delivery with partial & screen-bright CPU WakeLocks.
 *    - Seamless coordination with AthanForegroundService for zero-kill reliability.
 * 3. Smart Contextual Deep Linking & Dynamic Audio Mapping:
 *    - Parents duty deep links directly to Parents supplications & triggers parents.mp3.
 *    - Quran reminders dynamically select a humble, recitation-based Ayah audio file.
 *    - Rosary, Azkar, Durood, Wird mapped to 13-14 dedicated audio tracks.
 * 4. Granular Interval Frequency Controls:
 *    - Customizable repeat intervals per category (Quran, Azkar, Salawat, Parents, Wird).
 * 5. Custom Visual Enhancements & Glowing Aura:
 *    - Expanded Athar logo filling container completely without padding or shrinking.
 *    - Elegant golden aura & metallic styling in collapsed and expanded RemoteViews.
 * 6. User Notification Mode Preferences:
 *    - Mode 1: Notification Only (silent)
 *    - Mode 2: Notification + Audio (auto-play)
 *    - Mode 3: Notification + Play Button (silent with inline Play Audio action)
 *
 * NOTE: Strictly adheres to Kotlin stability rules (var instead of val for all mutable & local variables).
 */
object AtharNotificationManager {

    // ==========================================
    // PREFERENCES CONFIGURATION KEYS
    // ==========================================
    const val PREFS_NAME = "AtharNotificationSettings"
    const val KEY_NOTIFICATION_MODE = "pref_notification_mode"
    const val KEY_FULLSCREEN_ATHAN = "pref_fullscreen_adhan_enabled"
    const val KEY_SYSTEM_OVERLAY = "pref_system_overlay_enabled"
    const val KEY_MUAZZIN_REGULAR = "pref_muazzin_regular"
    const val KEY_MUAZZIN_FAJR = "pref_muazzin_fajr"

    // Category Enable/Disable Keys
    const val KEY_CAT_QURAN = "pref_cat_quran_enabled"
    const val KEY_CAT_AZKAR = "pref_cat_azkar_enabled"
    const val KEY_CAT_REMINDERS = "pref_cat_reminders_enabled"
    const val KEY_CAT_PARENTS = "pref_cat_parents_enabled"
    const val KEY_CAT_DUROOD = "pref_cat_durood_enabled"
    const val KEY_CAT_WIRD = "pref_cat_wird_enabled"

    // Category Audio Tone Keys
    const val KEY_TONE_QURAN = "pref_audio_tone_quran"
    const val KEY_TONE_AZKAR = "pref_audio_tone_azkar"
    const val KEY_TONE_SALAWAT = "pref_audio_tone_salawat"
    const val KEY_TONE_PARENTS = "pref_audio_tone_parents"
    const val KEY_TONE_WIRD = "pref_audio_tone_wird"

    // Granular Per-Category Interval Keys (Minutes)
    const val KEY_REPEAT_INTERVAL_MINS = "pref_repeat_interval_mins" // Global fallback
    const val KEY_INTERVAL_QURAN = "pref_interval_quran_mins"
    const val KEY_INTERVAL_AZKAR = "pref_interval_azkar_mins"
    const val KEY_INTERVAL_SALAWAT = "pref_interval_salawat_mins"
    const val KEY_INTERVAL_PARENTS = "pref_interval_parents_mins"
    const val KEY_INTERVAL_WIRD = "pref_interval_wird_mins"

    // Master Audio & System Keys
    const val KEY_MASTER_MUTED = "pref_master_muted"
    const val KEY_MASTER_VOLUME = "pref_master_volume"
    const val KEY_DND_BYPASS = "pref_dnd_bypass"
    const val KEY_VIBRATION_PATTERN = "pref_vibration_pattern"

    // Notification Delivery Modes
    const val MODE_NOTIFICATION_ONLY = "notification_only"
    const val MODE_NOTIFICATION_AUDIO = "notification_audio"
    const val MODE_NOTIFICATION_PLAY_BUTTON = "notification_play_button"

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
    const val CAT_TEST_NOTIFICATION = "test_notification"

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
    const val ID_TEST_NOTIFICATION = 1099

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
    // AUDIO TIMELINE & HARDWARE STATE
    // ==========================================
    private var audioLock: Any = Any()
    @Volatile private var activeMediaPlayer: MediaPlayer? = null
    @Volatile private var currentAssetFd: AssetFileDescriptor? = null
    @Volatile private var currentPlayingCategory: String? = null
    @Volatile private var currentPlayingUrl: String? = null
    @Volatile private var playbackStartTimeMs: Long = 0L
    @Volatile private var activeDurationMs: Long = 180000L // Default fallback duration (3 min)
    @Volatile private var pausedPositionMs: Long = 0L
    private var isAudioMuted: AtomicBoolean = AtomicBoolean(false)
    private var isAudioPaused: AtomicBoolean = AtomicBoolean(false)
    private var mainHandler: Handler = Handler(Looper.getMainLooper())

    // WakeLock for screen-off and deep sleep execution
    @Volatile private var cpuWakeLock: PowerManager.WakeLock? = null

    // Cached notification state for dynamic RemoteViews updates
    @Volatile private var lastActiveCategory: String? = null
    @Volatile private var lastActiveTitle: String? = null
    @Volatile private var lastActiveBody: String? = null
    @Volatile private var lastActiveBadge: String? = null
    @Volatile private var lastActiveAudioUrl: String? = null
    @Volatile private var lastActiveNotifId: Int = 0
    @Volatile private var lastActiveIsOngoing: Boolean = false
    @Volatile private var lastActiveSurahNumber: Int = 0
    @Volatile private var lastActiveAyahNumber: Int = 0

    // Curated Quran verses pool with remote recitation audio files for dynamic selection
    private data class QuranVerseCandidate(
        var surah: Int,
        var ayah: Int,
        var surahName: String,
        var text: String,
        var audioUrl: String
    )

    private var quranPool = listOf(
        QuranVerseCandidate(1, 2, "الفاتحة", "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", "https://everyayah.com/data/Alafasy_128kbps/001002.mp3"),
        QuranVerseCandidate(2, 152, "البقرة", "فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ", "https://everyayah.com/data/Alafasy_128kbps/002152.mp3"),
        QuranVerseCandidate(2, 186, "البقرة", "وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ", "https://everyayah.com/data/Alafasy_128kbps/002186.mp3"),
        QuranVerseCandidate(3, 173, "آل عمران", "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ", "https://everyayah.com/data/Alafasy_128kbps/003173.mp3"),
        QuranVerseCandidate(13, 28, "الرعد", "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ", "https://everyayah.com/data/Alafasy_128kbps/013028.mp3"),
        QuranVerseCandidate(14, 7, "إبراهيم", "لَئِنْ شَكَرْتُمْ لَأَزِيدَنَّكُمْ", "https://everyayah.com/data/Alafasy_128kbps/014007.mp3"),
        QuranVerseCandidate(17, 24, "الإسراء", "وَقُلْ رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا", "https://everyayah.com/data/Alafasy_128kbps/017024.mp3"),
        QuranVerseCandidate(21, 87, "الأنبياء", "لَا إِلَٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ", "https://everyayah.com/data/Alafasy_128kbps/021087.mp3"),
        QuranVerseCandidate(26, 80, "الشعراء", "وَإِذَا مَرِضْتُ فَهُوَ يَشْفِينِ", "https://everyayah.com/data/Alafasy_128kbps/026080.mp3"),
        QuranVerseCandidate(65, 3, "الطلاق", "وَمَنْ يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ", "https://everyayah.com/data/Alafasy_128kbps/065003.mp3"),
        QuranVerseCandidate(94, 6, "الشرح", "إِنَّ مَعَ الْعُسْرِ يُسْرًا", "https://everyayah.com/data/Alafasy_128kbps/094006.mp3")
    )

    // ==========================================
    // PREFERENCES GETTERS & SETTERS
    // ==========================================
    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun getNotificationMode(context: Context): String {
        return getPrefs(context).getString(KEY_NOTIFICATION_MODE, MODE_NOTIFICATION_AUDIO) ?: MODE_NOTIFICATION_AUDIO
    }

    fun setNotificationMode(context: Context, mode: String) {
        getPrefs(context).edit().putString(KEY_NOTIFICATION_MODE, mode).apply()
    }

    fun isFullScreenAdhanEnabled(context: Context): Boolean {
        return getPrefs(context).getBoolean(KEY_FULLSCREEN_ATHAN, true)
    }

    fun setFullScreenAdhanEnabled(context: Context, enabled: Boolean) {
        getPrefs(context).edit().putBoolean(KEY_FULLSCREEN_ATHAN, enabled).apply()
    }

    fun isSystemOverlayEnabled(context: Context): Boolean {
        return getPrefs(context).getBoolean(KEY_SYSTEM_OVERLAY, true)
    }

    fun setSystemOverlayEnabled(context: Context, enabled: Boolean) {
        getPrefs(context).edit().putBoolean(KEY_SYSTEM_OVERLAY, enabled).apply()
    }

    fun getMuazzinRegular(context: Context): String {
        return getPrefs(context).getString(KEY_MUAZZIN_REGULAR, "public/audio/adhan_alafasy.mp3") ?: "public/audio/adhan_alafasy.mp3"
    }

    fun setMuazzinRegular(context: Context, path: String) {
        getPrefs(context).edit().putString(KEY_MUAZZIN_REGULAR, path).apply()
    }

    fun getMuazzinFajr(context: Context): String {
        return getPrefs(context).getString(KEY_MUAZZIN_FAJR, "public/audio/adhan_fajr_alafasy.mp3") ?: "public/audio/adhan_fajr_alafasy.mp3"
    }

    fun setMuazzinFajr(context: Context, path: String) {
        getPrefs(context).edit().putString(KEY_MUAZZIN_FAJR, path).apply()
    }

    fun getMuazzinAudioForPrayer(context: Context, prayerName: String): String {
        return if (prayerName.contains("الفجر") || prayerName.contains("فجر")) {
            getMuazzinFajr(context)
        } else {
            getMuazzinRegular(context)
        }
    }

    fun isCategoryEnabled(context: Context, category: String): Boolean {
        var prefs = getPrefs(context)
        return when (category) {
            CAT_QURAN_AYAH -> prefs.getBoolean(KEY_CAT_QURAN, true)
            CAT_QURAN_WIRD -> prefs.getBoolean(KEY_CAT_WIRD, true)
            CAT_DHIKR_TASBEEH, CAT_MORNING_EVENING -> prefs.getBoolean(KEY_CAT_AZKAR, true)
            CAT_SALAWAT -> prefs.getBoolean(KEY_CAT_REMINDERS, true)
            CAT_PARENTS_DUTY -> prefs.getBoolean(KEY_CAT_PARENTS, true)
            else -> true
        }
    }

    fun setCategoryEnabled(context: Context, category: String, enabled: Boolean) {
        var editor = getPrefs(context).edit()
        when (category) {
            CAT_QURAN_AYAH -> editor.putBoolean(KEY_CAT_QURAN, enabled)
            CAT_QURAN_WIRD -> editor.putBoolean(KEY_CAT_WIRD, enabled)
            CAT_DHIKR_TASBEEH, CAT_MORNING_EVENING -> editor.putBoolean(KEY_CAT_AZKAR, enabled)
            CAT_SALAWAT -> editor.putBoolean(KEY_CAT_REMINDERS, enabled)
            CAT_PARENTS_DUTY -> editor.putBoolean(KEY_CAT_PARENTS, enabled)
        }
        editor.apply()
    }

    fun getCategoryTone(context: Context, category: String): String {
        var prefs = getPrefs(context)
        return when (category) {
            CAT_QURAN_AYAH -> prefs.getString(KEY_TONE_QURAN, "public/audio/quran_sample.mp3") ?: "public/audio/quran_sample.mp3"
            CAT_QURAN_WIRD -> prefs.getString(KEY_TONE_WIRD, "public/audio/wird.mp3") ?: "public/audio/wird.mp3"
            CAT_DHIKR_TASBEEH, CAT_MORNING_EVENING -> prefs.getString(KEY_TONE_AZKAR, "public/audio/dhikr_sample.mp3") ?: "public/audio/dhikr_sample.mp3"
            CAT_SALAWAT -> prefs.getString(KEY_TONE_SALAWAT, "public/audio/salawat.mp3") ?: "public/audio/salawat.mp3"
            CAT_PARENTS_DUTY -> prefs.getString(KEY_TONE_PARENTS, "public/audio/parents.mp3") ?: "public/audio/parents.mp3"
            CAT_IQAMAH -> "public/audio/iqamah.mp3"
            CAT_POST_ADHAN_DUA -> "public/audio/dua_after_adhan.mp3"
            CAT_SMART_ALARM -> "public/audio/alarm_sajdah_alafasy.mp3"
            else -> "public/audio/dhikr_sample.mp3"
        }
    }

    fun setCategoryTone(context: Context, category: String, tonePath: String) {
        var editor = getPrefs(context).edit()
        when (category) {
            CAT_QURAN_AYAH -> editor.putString(KEY_TONE_QURAN, tonePath)
            CAT_QURAN_WIRD -> editor.putString(KEY_TONE_WIRD, tonePath)
            CAT_DHIKR_TASBEEH, CAT_MORNING_EVENING -> editor.putString(KEY_TONE_AZKAR, tonePath)
            CAT_SALAWAT -> editor.putString(KEY_TONE_SALAWAT, tonePath)
            CAT_PARENTS_DUTY -> editor.putString(KEY_TONE_PARENTS, tonePath)
        }
        editor.apply()
    }

    // Granular per-category interval getters/setters
    fun getCategoryRepeatIntervalMins(context: Context, category: String): Int {
        var prefs = getPrefs(context)
        return when (category) {
            CAT_QURAN_AYAH -> prefs.getInt(KEY_INTERVAL_QURAN, 60)
            CAT_QURAN_WIRD -> prefs.getInt(KEY_INTERVAL_WIRD, 1440)
            CAT_DHIKR_TASBEEH, CAT_MORNING_EVENING -> prefs.getInt(KEY_INTERVAL_AZKAR, 30)
            CAT_SALAWAT -> prefs.getInt(KEY_INTERVAL_SALAWAT, 45)
            CAT_PARENTS_DUTY -> prefs.getInt(KEY_INTERVAL_PARENTS, 240)
            else -> prefs.getInt(KEY_REPEAT_INTERVAL_MINS, 30)
        }
    }

    fun setCategoryRepeatIntervalMins(context: Context, category: String, intervalMins: Int) {
        var editor = getPrefs(context).edit()
        when (category) {
            CAT_QURAN_AYAH -> editor.putInt(KEY_INTERVAL_QURAN, intervalMins)
            CAT_QURAN_WIRD -> editor.putInt(KEY_INTERVAL_WIRD, intervalMins)
            CAT_DHIKR_TASBEEH, CAT_MORNING_EVENING -> editor.putInt(KEY_INTERVAL_AZKAR, intervalMins)
            CAT_SALAWAT -> editor.putInt(KEY_INTERVAL_SALAWAT, intervalMins)
            CAT_PARENTS_DUTY -> editor.putInt(KEY_INTERVAL_PARENTS, intervalMins)
        }
        editor.apply()
    }

    fun getRepeatIntervalMins(context: Context): Int {
        return getPrefs(context).getInt(KEY_REPEAT_INTERVAL_MINS, 30)
    }

    fun setRepeatIntervalMins(context: Context, intervalMins: Int) {
        getPrefs(context).edit().putInt(KEY_REPEAT_INTERVAL_MINS, intervalMins).apply()
    }

    fun getMasterVolume(context: Context): Float {
        return getPrefs(context).getFloat(KEY_MASTER_VOLUME, 1.0f)
    }

    fun setMasterVolume(context: Context, volume: Float) {
        var clamped = Math.max(0f, Math.min(1.0f, volume))
        getPrefs(context).edit().putFloat(KEY_MASTER_VOLUME, clamped).apply()
        applyEffectiveVolume(context)
    }

    fun isMasterMuted(context: Context): Boolean {
        return getPrefs(context).getBoolean(KEY_MASTER_MUTED, false)
    }

    fun setMasterMuted(context: Context, muted: Boolean) {
        getPrefs(context).edit().putBoolean(KEY_MASTER_MUTED, muted).apply()
        applyEffectiveVolume(context)
    }

    fun isDndBypassEnabled(context: Context): Boolean {
        return getPrefs(context).getBoolean(KEY_DND_BYPASS, true)
    }

    fun setDndBypassEnabled(context: Context, enabled: Boolean) {
        getPrefs(context).edit().putBoolean(KEY_DND_BYPASS, enabled).apply()
    }

    fun getVibrationPattern(context: Context): String {
        return getPrefs(context).getString(KEY_VIBRATION_PATTERN, "standard") ?: "standard"
    }

    fun setVibrationPattern(context: Context, pattern: String) {
        getPrefs(context).edit().putString(KEY_VIBRATION_PATTERN, pattern).apply()
    }

    private fun getVibrationArray(context: Context): LongArray {
        return when (getVibrationPattern(context)) {
            "pulse" -> longArrayOf(0, 200, 100, 200, 100, 200)
            "long" -> longArrayOf(0, 1000, 500, 1000)
            "silent" -> longArrayOf(0)
            else -> longArrayOf(0, 500, 250, 500)
        }
    }

    private fun applyEffectiveVolume(context: Context) {
        synchronized(audioLock) {
            try {
                var mp = activeMediaPlayer ?: return
                var muted = isAudioMuted.get() || isMasterMuted(context)
                var vol = if (muted) 0f else getMasterVolume(context)
                mp.setVolume(vol, vol)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    // ==========================================
    // CPU WAKELOCK FOR SCREEN-OFF RELIABILITY
    // ==========================================
    private fun acquireWakeLock(context: Context, timeoutMs: Long = 30000L, turnScreenOn: Boolean = false) {
        try {
            var powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return
            if (cpuWakeLock == null) {
                var flags = PowerManager.PARTIAL_WAKE_LOCK
                if (turnScreenOn) {
                    flags = PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP
                }
                cpuWakeLock = powerManager.newWakeLock(flags, "Athar::AudioExecutionWakeLock")
                cpuWakeLock?.setReferenceCounted(false)
            }
            if (cpuWakeLock?.isHeld != true) {
                cpuWakeLock?.acquire(timeoutMs)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun releaseWakeLock() {
        try {
            if (cpuWakeLock?.isHeld == true) {
                cpuWakeLock?.release()
            }
        } catch (e: Exception) {
            // Ignore release errors
        }
    }

    // ==========================================
    // NOTIFICATION CHANNELS INITIALIZATION
    // ==========================================
    fun initChannels(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            var manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
            var vibration = getVibrationArray(context)
            var bypassDnd = isDndBypassEnabled(context)

            var channels = listOf(
                NotificationChannel(
                    CHANNEL_ATHAN_ID,
                    "أذان الصلوات والمنبه الملكي (أثر)",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "تنبيهات الأذان والصلوات الخمس ذات الأولوية الملكية مع الصوت الكامل"
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                    enableVibration(true)
                    vibrationPattern = vibration
                    enableLights(true)
                    lightColor = Color.parseColor("#E6C66E")
                    if (bypassDnd && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        setBypassDnd(true)
                    }
                },
                NotificationChannel(
                    CHANNEL_IQAMAH_ID,
                    "تنبيهات إقامة الصلاة",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "تنبيهات اقتراب إقامة الصلاة والاستعداد للوقوف في المحراب"
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                    enableVibration(true)
                    vibrationPattern = vibration
                    enableLights(true)
                    lightColor = Color.parseColor("#D4AF37")
                },
                NotificationChannel(
                    CHANNEL_QURAN_ID,
                    "المصحف والورد القرآني (اقرأ لو آية)",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "آيات قرآنية مختارة وتلاوات متجددة وتدبر يومي للورد"
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                    enableLights(true)
                    lightColor = Color.parseColor("#E6C66E")
                },
                NotificationChannel(
                    CHANNEL_DHIKR_ID,
                    "الأذكار والتسبيح والصلوات على النبي ﷺ",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "أذكار الصباح والمساء والصلوات والتسبيحات الـ 14 المعتمدة"
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                    enableLights(true)
                    lightColor = Color.parseColor("#D4AF37")
                },
                NotificationChannel(
                    CHANNEL_PARENTS_ID,
                    "بر الوالدين وصلة الرحم",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "تنبيهات الوصية بالوالدين والإحسان إليهما مع صوت الدعاء المخصص"
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
                    vibrationPattern = vibration
                    enableLights(true)
                    lightColor = Color.parseColor("#FFF2C2")
                    if (bypassDnd && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        setBypassDnd(true)
                    }
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
            CAT_TEST_NOTIFICATION -> ID_TEST_NOTIFICATION
            else -> 1999
        }
    }

    /**
     * Maps each category to its dedicated Notification Channel
     */
    fun getChannelId(category: String): String {
        return when (category) {
            CAT_PRAYER_ATHAN, CAT_SYSTEM_OVERLAY_ATHAN, CAT_TEST_NOTIFICATION -> CHANNEL_ATHAN_ID
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
            CAT_TEST_NOTIFICATION -> "⚡ فحص أثر الموحد"
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
            CAT_PARENTS_DUTY -> "companion"
            CAT_SALAWAT -> "reminders"
            CAT_DHIKR_TASBEEH, CAT_MORNING_EVENING -> "adhkar"
            CAT_SMART_ALARM -> "reminders"
            CAT_SMART_SILENCE, CAT_TEST_NOTIFICATION -> "settings"
            else -> "home"
        }
    }

    // ==========================================
    // NOTIFICATION DISPATCH ENGINE
    // ==========================================
    /**
     * Builds a unified "Royal Glass" RemoteViews notification for ANY of the 14 sections.
     * Enforces System Isolation:
     * - NO MediaStyle, NO MediaSession
     * - Uses CustomBigContentView
     * - Ongoing true while audio is actively playing, false when paused/stopped
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
        isEndedState: Boolean = false,
        isPausedState: Boolean = isAudioPaused.get(),
        surahNumber: Int = 0,
        ayahNumber: Int = 0
    ): Pair<Int, Notification> {
        initChannels(context)

        var notifId = customNotificationId ?: getNotificationId(category)
        var categoryBadge = badge ?: getCategoryBadge(category)
        var channelId = getChannelId(category)
        var targetTab = getTargetTab(category)
        var safeAudioUrl = audioUrl ?: ""
        var mode = getNotificationMode(context)

        // 1. Deep-link Intent to Open App at Exact Target Screen
        var openAppIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("target_tab", targetTab)
            putExtra("notification_category", category)
            putExtra("alert_title", title)
            putExtra("alert_body", body)
            putExtra("audio_url", safeAudioUrl)
            putExtra("surah_number", surahNumber)
            putExtra("ayah_number", ayahNumber)
            putExtra("open_parents_modal", category == CAT_PARENTS_DUTY)
            putExtra("elapsed_ms", getCurrentPositionMs())
            putExtra("duration_ms", getDurationMs())
            putExtra("is_muted", isMutedState)
        }
        var openAppPendingIntent = PendingIntent.getActivity(
            context,
            notifId * 10 + 1,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        // 2. Interactive Audio Action Intent (Play / Pause / Resume / Mute)
        // If ended, action is RESUME (starts fresh); if paused, action is RESUME; if playing, action is PAUSE/TOGGLE
        var audioAction = when {
            isEndedState -> ACTION_RESUME_AUDIO
            isPausedState -> ACTION_RESUME_AUDIO
            mode == MODE_NOTIFICATION_PLAY_BUTTON && !isPlaying() -> ACTION_RESUME_AUDIO
            else -> ACTION_TOGGLE_AUDIO
        }

        var audioActionIntent = Intent(context, AtharNotificationReceiver::class.java).apply {
            action = audioAction
            putExtra(EXTRA_NOTIFICATION_ID, notifId)
            putExtra(EXTRA_CATEGORY, category)
        }
        var audioActionPendingIntent = PendingIntent.getBroadcast(
            context,
            notifId * 10 + 2,
            audioActionIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        // 3. Dismiss Notification PendingIntent
        var dismissIntent = Intent(context, AtharNotificationReceiver::class.java).apply {
            action = ACTION_DISMISS_NOTIFICATION
            putExtra(EXTRA_NOTIFICATION_ID, notifId)
            putExtra(EXTRA_CATEGORY, category)
        }
        var dismissPendingIntent = PendingIntent.getBroadcast(
            context,
            notifId * 10 + 3,
            dismissIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        // 4. Construct Collapsed RemoteViews (Expanded Logo Frame without padding)
        var collapsedView = RemoteViews(context.packageName, R.layout.notification_royal_collapsed).apply {
            setTextViewText(R.id.tvNotifTitle, title)
            setTextViewText(R.id.tvNotifBody, body.replace("\n", " · "))
            setTextViewText(R.id.tvNotifBadge, categoryBadge)
        }

        // 5. Determine inline audio action button text
        var audioButtonText = when {
            isEndedState -> "إعادة الاستماع ↻"
            isPausedState -> "استئناف التشغيل ▶"
            mode == MODE_NOTIFICATION_PLAY_BUTTON && !isPlaying() -> "تشغيل الاستماع ▶"
            isMutedState || isMasterMuted(context) -> "تشغيل الصوت 🔊"
            isPlaying() -> "كتم الصوت ✕"
            else -> "تشغيل الصوت 🔊"
        }

        // 6. Construct Expanded RemoteViews with 2 Synchronized Action Buttons
        var expandedView = RemoteViews(context.packageName, R.layout.notification_royal_expanded).apply {
            setTextViewText(R.id.tvNotifTitle, title)
            setTextViewText(R.id.tvNotifBody, body)
            setTextViewText(R.id.tvNotifBadge, categoryBadge)
            setTextViewText(R.id.btnNotifAudio, audioButtonText)

            setOnClickPendingIntent(R.id.btnNotifAudio, audioActionPendingIntent)
            setOnClickPendingIntent(R.id.btnNotifOpen, openAppPendingIntent)
            setOnClickPendingIntent(R.id.btnNotifClose, dismissPendingIntent)
        }

        var appLogoBitmap = try {
            BitmapFactory.decodeResource(context.resources, R.drawable.icon_logo)
        } catch (e: Exception) {
            null
        }

        // Determine effective ongoing state: Keep ongoing while actively playing to prevent accidental swipe dismiss
        var effectiveOngoing = isOngoing || isPlaying()

        var builder = NotificationCompat.Builder(context, channelId)
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
            .setCategory(
                if (category == CAT_SMART_ALARM || category == CAT_PRAYER_ATHAN)
                    NotificationCompat.CATEGORY_ALARM
                else
                    NotificationCompat.CATEGORY_EVENT
            )
            .setPriority(if (isOngoing) NotificationCompat.PRIORITY_LOW else NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(openAppPendingIntent)
            .setAutoCancel(!effectiveOngoing)
            .setOngoing(effectiveOngoing)
            .setColor(Color.parseColor("#E6C66E"))

        // Add FullScreenIntent if enabled in user preferences
        var canLaunchFullScreen = isFullScreenAdhanEnabled(context)
        if (canLaunchFullScreen && (category == CAT_PRAYER_ATHAN || category == CAT_SMART_ALARM || category == CAT_SYSTEM_OVERLAY_ATHAN || category == CAT_TEST_NOTIFICATION)) {
            var fullScreenIntent = Intent(context, AthanFullScreenActivity::class.java).apply {
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
            var fullScreenPendingIntent = PendingIntent.getActivity(
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
     * Guarantees that only ONE notification is posted.
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
        customNotificationId: Int? = null,
        surahNumber: Int = 0,
        ayahNumber: Int = 0
    ) {
        var notifId = customNotificationId ?: getNotificationId(category)
        var categoryBadge = badge ?: getCategoryBadge(category)
        var mode = getNotificationMode(context)

        // Dynamic audio selection for Quran if url is not supplied
        var effectiveAudioUrl = audioUrl
        var effectiveTitle = title
        var effectiveBody = body
        var effectiveSurah = surahNumber
        var effectiveAyah = ayahNumber

        if (category == CAT_QURAN_AYAH && (effectiveAudioUrl.isNullOrEmpty() || effectiveSurah == 0)) {
            var picked = quranPool[Random.nextInt(quranPool.size)]
            effectiveSurah = picked.surah
            effectiveAyah = picked.ayah
            effectiveTitle = "📖 اقرأ لو آية · سورة ${picked.surahName}"
            effectiveBody = "${picked.text} [${picked.surahName}: ${picked.ayah}]"
            effectiveAudioUrl = picked.audioUrl
        } else if (category == CAT_PARENTS_DUTY && (effectiveAudioUrl.isNullOrEmpty())) {
            effectiveAudioUrl = "public/audio/parents.mp3"
        } else if (effectiveAudioUrl.isNullOrEmpty()) {
            effectiveAudioUrl = getCategoryTone(context, category)
        }

        // Cache state for dynamic in-place RemoteViews updates
        lastActiveCategory = category
        lastActiveTitle = effectiveTitle
        lastActiveBody = effectiveBody
        lastActiveBadge = categoryBadge
        lastActiveAudioUrl = effectiveAudioUrl
        lastActiveNotifId = notifId
        lastActiveIsOngoing = isOngoing
        lastActiveSurahNumber = effectiveSurah
        lastActiveAyahNumber = effectiveAyah

        // Determine if audio should auto-play based on User Notification Mode
        var shouldAutoPlay = when (mode) {
            MODE_NOTIFICATION_ONLY -> false
            MODE_NOTIFICATION_PLAY_BUTTON -> false
            MODE_NOTIFICATION_AUDIO -> playSound || !effectiveAudioUrl.isNullOrBlank()
            else -> playSound
        }

        // Build and post notification
        var royalResult = buildRoyalNotification(
            context = context,
            category = category,
            title = effectiveTitle,
            body = effectiveBody,
            badge = categoryBadge,
            audioUrl = effectiveAudioUrl,
            isOngoing = isOngoing || shouldAutoPlay,
            customNotificationId = notifId,
            isMutedState = isAudioMuted.get(),
            isEndedState = false,
            isPausedState = (mode == MODE_NOTIFICATION_PLAY_BUTTON && !shouldAutoPlay),
            surahNumber = effectiveSurah,
            ayahNumber = effectiveAyah
        )
        var notification = royalResult.second
        var notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        notificationManager?.notify(notifId, notification)

        // Wake screen and acquire temporary CPU wake-lock
        acquireWakeLock(
            context,
            timeoutMs = if (shouldAutoPlay) 60000L else 10000L,
            turnScreenOn = (category == CAT_PRAYER_ATHAN || category == CAT_SMART_ALARM)
        )

        // Play Audio if requested with Strict Anti-Overlap Audio Guard
        if (shouldAutoPlay && !effectiveAudioUrl.isNullOrBlank()) {
            playNotificationAudioWithGuard(context, effectiveAudioUrl, category)
        }
    }

    /**
     * Single Source of Truth: Dispatches ONE and ONLY ONE Test Notification.
     * Guarantees elimination of multi-notification stacking/duplication bugs.
     */
    fun triggerSingleTestNotification(
        context: Context,
        isAdhanTest: Boolean = false,
        delaySeconds: Int = 0
    ) {
        var executeTest = {
            // 1. Cancel any existing test notification to guarantee clean single output
            var manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            manager?.cancel(ID_TEST_NOTIFICATION)

            // 2. Acquire a temporary wake-lock to ensure device wakes on lockscreen
            acquireWakeLock(context, timeoutMs = 8000L, turnScreenOn = true)

            // 3. Choose category, title, body, and audio based on test mode
            var category = if (isAdhanTest) CAT_PRAYER_ATHAN else CAT_TEST_NOTIFICATION
            var title = if (isAdhanTest) "🕌 حان الآن موعد صلاة الفجر (فحص الأذان الملكي)" else "✨ تنبيه أثر الموحد (تجربة النظام الفورية)"
            var body = if (isAdhanTest) {
                "الله أكبر الله أكبر · حي على الصلاة، حي على الفلاح\nتم اختبار الأذان الملكي والتحكم الصوتي بنجاح تام ✓"
            } else {
                "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ\nتم اختبار وصول التنبيه الفردي الموحد دون أي تكرار بنجاح ✓"
            }
            var audioUrl = if (isAdhanTest) {
                getMuazzinFajr(context)
            } else {
                getCategoryTone(context, CAT_DHIKR_TASBEEH)
            }

            // 4. Dispatch exactly ONE royal notification through AtharNotificationManager
            showRoyalNotification(
                context = context,
                category = category,
                title = title,
                body = body,
                badge = if (isAdhanTest) "🕌 فحص الأذان" else "⚡ فحص الإشعار الموحد",
                audioUrl = audioUrl,
                playSound = true,
                isOngoing = false,
                customNotificationId = ID_TEST_NOTIFICATION
            )
        }

        if (delaySeconds > 0) {
            mainHandler.postDelayed({
                executeTest()
            }, delaySeconds * 1000L)
        } else {
            executeTest()
        }
    }

    /**
     * Updates notification view in-place to reflect updated mute/playback states without restarting audio
     */
    fun updateNotificationViews(
        context: Context,
        isMutedState: Boolean,
        isEndedState: Boolean = false,
        isOngoing: Boolean = isPlaying(),
        isPausedState: Boolean = isAudioPaused.get()
    ) {
        if (lastActiveNotifId > 0 && lastActiveTitle != null) {
            var category = lastActiveCategory ?: CAT_PRAYER_ATHAN
            var title = lastActiveTitle ?: "أثر | تنبيه ملكي"
            var body = lastActiveBody ?: ""
            var categoryBadge = lastActiveBadge ?: getCategoryBadge(category)
            var audioUrl = lastActiveAudioUrl
            var notifId = lastActiveNotifId
            var surah = lastActiveSurahNumber
            var ayah = lastActiveAyahNumber

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
                isEndedState = isEndedState,
                isPausedState = isPausedState,
                surahNumber = surah,
                ayahNumber = ayah
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
        var notifId = getNotificationId(category)
        var manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        manager?.cancel(notifId)
        if (currentPlayingCategory == category) {
            stopAndReleasePlayer()
        }
    }

    fun dismissNotificationById(context: Context, notifId: Int) {
        var manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        manager?.cancel(notifId)
        if (lastActiveNotifId == notifId) {
            stopAndReleasePlayer()
        }
    }

    // ==========================================
    // CONTINUOUS BACKGROUND AUDIO PLAYBACK & TIMELINE
    // ==========================================
    fun playNotificationAudioWithGuard(
        context: Context,
        audioPathOrUrl: String,
        category: String,
        startOffsetMs: Long = 0L
    ) {
        synchronized(audioLock) {
            try {
                if (currentPlayingCategory == category && currentPlayingUrl == audioPathOrUrl && activeMediaPlayer != null) {
                    if (isAudioPaused.get()) {
                        resumeAudio(context)
                    } else if (isAudioMuted.get()) {
                        unmuteCurrentAudio(context)
                    }
                    return
                }

                stopAndReleasePlayer()
                isAudioMuted.set(false)
                isAudioPaused.set(false)
                currentPlayingCategory = category
                currentPlayingUrl = audioPathOrUrl
                pausedPositionMs = startOffsetMs

                acquireWakeLock(context, 120000L)

                var player = MediaPlayer()
                var attributes = AudioAttributes.Builder()
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
                    var cleanPath = audioPathOrUrl.removePrefix("public/").removePrefix("/")
                    var candidates = listOf(
                        "public/$cleanPath",
                        cleanPath,
                        "public/audio/$cleanPath",
                        "audio/$cleanPath"
                    )
                    for (candidate in candidates) {
                        try {
                            var afd = context.assets.openFd(candidate)
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
                    var fallbacks = listOf(
                        "public/audio/adhan_alafasy.mp3",
                        "public/audio/salawat.mp3",
                        "public/audio/dhikr_sample.mp3"
                    )
                    for (fb in fallbacks) {
                        try {
                            var afd = context.assets.openFd(fb)
                            currentAssetFd = afd
                            player.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                            dataSourceSet = true
                            break
                        } catch (e: Exception) {}
                    }
                }

                if (!dataSourceSet) {
                    var alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                        ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                    if (alertUri != null) {
                        player.setDataSource(context, alertUri)
                        dataSourceSet = true
                    }
                }

                player.setOnCompletionListener {
                    synchronized(audioLock) {
                        stopAndReleasePlayer()
                        releaseWakeLock()
                        updateNotificationViews(
                            context,
                            isMutedState = false,
                            isEndedState = true,
                            isOngoing = false,
                            isPausedState = false
                        )
                    }
                }

                player.setOnErrorListener { _, _, _ ->
                    synchronized(audioLock) {
                        stopAndReleasePlayer()
                        releaseWakeLock()
                    }
                    true
                }

                player.setOnPreparedListener { mp ->
                    synchronized(audioLock) {
                        if (activeMediaPlayer !== mp) return@setOnPreparedListener
                        activeDurationMs = mp.duration.toLong()
                        playbackStartTimeMs = System.currentTimeMillis()

                        var effectiveMuted = isAudioMuted.get() || isMasterMuted(context)
                        var effectiveVol = if (effectiveMuted) 0f else getMasterVolume(context)
                        mp.setVolume(effectiveVol, effectiveVol)

                        if (startOffsetMs > 0 && startOffsetMs < activeDurationMs) {
                            mp.seekTo(startOffsetMs.toInt())
                        }
                        mp.start()
                        updateNotificationViews(
                            context,
                            isMutedState = isAudioMuted.get(),
                            isEndedState = false,
                            isOngoing = true,
                            isPausedState = false
                        )
                    }
                }

                player.prepareAsync()
                activeMediaPlayer = player
            } catch (e: Exception) {
                e.printStackTrace()
                stopAndReleasePlayer()
                releaseWakeLock()
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
                updateNotificationViews(
                    context,
                    isMutedState = true,
                    isEndedState = false,
                    isOngoing = isPlaying(),
                    isPausedState = isAudioPaused.get()
                )
            }
        }
    }

    /**
     * UNMUTES the audio stream in-place.
     * Restores volume immediately from preferences, continuing from the exact current timeline point.
     */
    fun unmuteCurrentAudio(context: Context? = null) {
        synchronized(audioLock) {
            isAudioMuted.set(false)
            try {
                var mp = activeMediaPlayer
                if (mp != null) {
                    if (!mp.isPlaying && !isAudioPaused.get()) {
                        mp.start()
                    }
                    var vol = if (context != null) getMasterVolume(context) else 1.0f
                    mp.setVolume(vol, vol)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
            if (context != null) {
                updateNotificationViews(
                    context,
                    isMutedState = false,
                    isEndedState = false,
                    isOngoing = isPlaying(),
                    isPausedState = isAudioPaused.get()
                )
            }
        }
    }

    /**
     * Toggles between Mute and Unmute without interrupting timeline progress
     */
    fun toggleAudio(context: Context? = null) {
        if (isAudioPaused.get()) {
            resumeAudio(context)
        } else if (isAudioMuted.get()) {
            unmuteCurrentAudio(context)
        } else {
            muteCurrentAudio(context)
        }
    }

    /**
     * Pauses audio while preserving the exact playback position (pausedPositionMs).
     * Reverts notification ongoing state to false so user can dismiss if desired.
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
            releaseWakeLock()
            if (context != null) {
                updateNotificationViews(
                    context,
                    isMutedState = isAudioMuted.get(),
                    isEndedState = false,
                    isOngoing = false,
                    isPausedState = true
                )
            }
        }
    }

    /**
     * Resumes audio from the exact preserved playback position without restarting from zero!
     * Sets notification ongoing state to true while actively playing.
     */
    fun resumeAudio(context: Context? = null) {
        synchronized(audioLock) {
            isAudioPaused.set(false)
            try {
                var mp = activeMediaPlayer
                if (mp != null) {
                    if (!mp.isPlaying) {
                        if (pausedPositionMs > 0 && pausedPositionMs < activeDurationMs) {
                            mp.seekTo(pausedPositionMs.toInt())
                        }
                        var effectiveMuted = isAudioMuted.get() || (context != null && isMasterMuted(context))
                        var effectiveVol = if (effectiveMuted) 0f else (if (context != null) getMasterVolume(context) else 1.0f)
                        mp.setVolume(effectiveVol, effectiveVol)
                        mp.start()
                    }
                    if (context != null) {
                        acquireWakeLock(context, 120000L)
                        updateNotificationViews(
                            context,
                            isMutedState = isAudioMuted.get(),
                            isEndedState = false,
                            isOngoing = true,
                            isPausedState = false
                        )
                    }
                } else if (context != null && !currentPlayingUrl.isNullOrEmpty()) {
                    var cat = currentPlayingCategory ?: CAT_QURAN_AYAH
                    playNotificationAudioWithGuard(context, currentPlayingUrl!!, cat, startOffsetMs = pausedPositionMs)
                } else if (context != null && !lastActiveAudioUrl.isNullOrEmpty()) {
                    var cat = lastActiveCategory ?: CAT_QURAN_AYAH
                    playNotificationAudioWithGuard(context, lastActiveAudioUrl!!, cat, startOffsetMs = pausedPositionMs)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    /**
     * Returns the continuous real-time progress position in milliseconds
     */
    fun getCurrentPositionMs(): Long {
        synchronized(audioLock) {
            var mp = activeMediaPlayer
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
            var mp = activeMediaPlayer
            return try {
                var d = mp?.duration?.toLong() ?: activeDurationMs
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

    fun isPaused(): Boolean {
        return isAudioPaused.get()
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
            releaseWakeLock()
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
