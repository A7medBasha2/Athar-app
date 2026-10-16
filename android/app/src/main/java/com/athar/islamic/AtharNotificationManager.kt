package com.athar.islamic

import android.app.AlarmManager
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
import android.media.AudioFocusRequest
import android.media.AudioManager
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

object AtharNotificationManager {

    const val PREFS_NAME = "AtharNotificationSettings"
    const val KEY_NOTIFICATION_MODE = "pref_notification_mode"
    const val KEY_FULLSCREEN_ATHAN = "pref_fullscreen_adhan_enabled"
    const val KEY_SYSTEM_OVERLAY = "pref_system_overlay_enabled"
    const val KEY_MUAZZIN_REGULAR = "pref_muazzin_regular"
    const val KEY_MUAZZIN_FAJR = "pref_muazzin_fajr"

    const val KEY_CAT_QURAN = "pref_cat_quran_enabled"
    const val KEY_CAT_AZKAR = "pref_cat_azkar_enabled"
    const val KEY_CAT_REMINDERS = "pref_cat_reminders_enabled"
    const val KEY_CAT_PARENTS = "pref_cat_parents_enabled"
    const val KEY_CAT_DUROOD = "pref_cat_durood_enabled"
    const val KEY_CAT_WIRD = "pref_cat_wird_enabled"

    const val KEY_TONE_QURAN = "pref_audio_tone_quran"
    const val KEY_TONE_AZKAR = "pref_audio_tone_azkar"
    const val KEY_TONE_SALAWAT = "pref_audio_tone_salawat"
    const val KEY_TONE_PARENTS = "pref_audio_tone_parents"
    const val KEY_TONE_WIRD = "pref_audio_tone_wird"

    const val KEY_REPEAT_INTERVAL_MINS = "pref_repeat_interval_mins"
    const val KEY_INTERVAL_QURAN = "pref_interval_quran_mins"
    const val KEY_INTERVAL_AZKAR = "pref_interval_azkar_mins"
    const val KEY_INTERVAL_SALAWAT = "pref_interval_salawat_mins"
    const val KEY_INTERVAL_PARENTS = "pref_interval_parents_mins"
    const val KEY_INTERVAL_WIRD = "pref_interval_wird_mins"

    const val KEY_MASTER_MUTED = "pref_master_muted"
    const val KEY_MASTER_VOLUME = "pref_master_volume"
    const val KEY_DND_BYPASS = "pref_dnd_bypass"
    const val KEY_VIBRATION_PATTERN = "pref_vibration_pattern"

    const val MODE_NOTIFICATION_ONLY = "notification_only"
    const val MODE_NOTIFICATION_AUDIO = "notification_audio"
    const val MODE_NOTIFICATION_PLAY_BUTTON = "notification_play_button"

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

    const val CHANNEL_ATHAN_ID = "athar_athan_channel"
    const val CHANNEL_IQAMAH_ID = "athar_iqamah_channel"
    const val CHANNEL_QURAN_ID = "athar_quran_channel"
    const val CHANNEL_DHIKR_ID = "athar_dhikr_channel"
    const val CHANNEL_PARENTS_ID = "athar_parents_channel"
    const val CHANNEL_ONGOING_ID = "athar_ongoing_prayer_channel_v2"
    const val CHANNEL_ALARM_ID = "athar_alarm_channel"
    const val CHANNEL_SYSTEM_ID = "athar_system_channel"

    const val ACTION_MUTE_NOTIFICATION_AUDIO = "com.athar.islamic.ACTION_MUTE_NOTIFICATION_AUDIO"
    const val ACTION_UNMUTE_NOTIFICATION_AUDIO = "com.athar.islamic.ACTION_UNMUTE_NOTIFICATION_AUDIO"
    const val ACTION_TOGGLE_AUDIO = "com.athar.islamic.ACTION_TOGGLE_AUDIO"
    const val ACTION_PAUSE_AUDIO = "com.athar.islamic.ACTION_PAUSE_AUDIO"
    const val ACTION_RESUME_AUDIO = "com.athar.islamic.ACTION_RESUME_AUDIO"
    const val ACTION_DISMISS_NOTIFICATION = "com.athar.islamic.ACTION_DISMISS_NOTIFICATION"
    const val ACTION_RESUME_AFTER_CALL = "com.athar.islamic.ACTION_RESUME_AFTER_CALL"

    const val EXTRA_NOTIFICATION_ID = "extra_notification_id"
    const val EXTRA_CATEGORY = "extra_category"

    private var audioLock: Any = Any()
    @Volatile var athanEventTriggerTimeMs: Long = 0L
    @Volatile private var activeMediaPlayer: MediaPlayer? = null
    @Volatile private var currentAssetFd: AssetFileDescriptor? = null
    @Volatile private var currentPlayingCategory: String? = null
    @Volatile private var currentPlayingUrl: String? = null
    @Volatile private var playbackStartTimeMs: Long = 0L
    @Volatile private var activeDurationMs: Long = 180000L
    @Volatile private var pausedPositionMs: Long = 0L
    private var isAudioMuted: AtomicBoolean = AtomicBoolean(false)
    private var isAudioPaused: AtomicBoolean = AtomicBoolean(false)
    private var isPausedDueToCall: AtomicBoolean = AtomicBoolean(false)
    @Volatile private var lastAudioTriggerTimeMs: Long = 0L
    private var mainHandler: Handler = Handler(Looper.getMainLooper())

    @Volatile private var audioManager: AudioManager? = null
    @Volatile private var audioFocusRequest: AudioFocusRequest? = null
    @Volatile private var appContextRef: Context? = null

    fun setAthanEventTriggerTime(triggerTimeMs: Long) {
        athanEventTriggerTimeMs = triggerTimeMs
    }

    fun getAthanRealWorldElapsedMs(): Long {
        if (athanEventTriggerTimeMs <= 0L) return 0L
        return Math.max(0L, System.currentTimeMillis() - athanEventTriggerTimeMs)
    }

    private var audioFocusChangeListener = AudioManager.OnAudioFocusChangeListener { focusChange ->
        when (focusChange) {
            AudioManager.AUDIOFOCUS_LOSS,
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT,
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
                isPausedDueToCall.set(true)
                appContextRef?.let { ctx -> pauseAudio(ctx) } ?: run { pauseAudio(null) }
            }
            AudioManager.AUDIOFOCUS_GAIN -> {}
        }
    }

    private fun requestAudioFocusInternal(context: Context, attributes: AudioAttributes, isHighPriority: Boolean = false): Boolean {
        appContextRef = context.applicationContext
        var am = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return false
        audioManager = am
        var focusGain = if (isHighPriority) {
            AudioManager.AUDIOFOCUS_GAIN_TRANSIENT
        } else {
            AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
        }
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                var request = AudioFocusRequest.Builder(focusGain)
                    .setAudioAttributes(attributes)
                    .setAcceptsDelayedFocusGain(false)
                    .setWillPauseWhenDucked(true)
                    .setOnAudioFocusChangeListener(audioFocusChangeListener, mainHandler)
                    .build()
                audioFocusRequest = request
                am.requestAudioFocus(request) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
            } else {
                @Suppress("DEPRECATION")
                am.requestAudioFocus(
                    audioFocusChangeListener,
                    if (isHighPriority) AudioManager.STREAM_ALARM else AudioManager.STREAM_NOTIFICATION,
                    focusGain
                ) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    private fun abandonAudioFocusInternal() {
        try {
            var am = audioManager
            if (am != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    audioFocusRequest?.let { req -> am.abandonAudioFocusRequest(req) }
                    audioFocusRequest = null
                } else {
                    @Suppress("DEPRECATION")
                    am.abandonAudioFocus(audioFocusChangeListener)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @Volatile private var cpuWakeLock: PowerManager.WakeLock? = null

    @Volatile private var lastActiveCategory: String? = null
    @Volatile private var lastActiveTitle: String? = null
    @Volatile private var lastActiveBody: String? = null
    @Volatile private var lastActiveBadge: String? = null
    @Volatile private var lastActiveAudioUrl: String? = null
    @Volatile private var lastActiveNotifId: Int = 0
    @Volatile private var lastActiveIsOngoing: Boolean = false
    @Volatile private var lastActiveSurahNumber: Int = 0
    @Volatile private var lastActiveAyahNumber: Int = 0

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
        QuranVerseCandidate(2, 255, "البقرة", "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ", "https://everyayah.com/data/Alafasy_128kbps/002255.mp3"),
        QuranVerseCandidate(2, 286, "البقرة", "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا", "https://everyayah.com/data/Alafasy_128kbps/002286.mp3"),
        QuranVerseCandidate(3, 173, "آل عمران", "الَّذِينَ قَالَ لَهُمُ النَّاسُ إِنَّ النَّاسَ قَدْ جَمَعُوا لَكُمْ فَاخْشَوْهُمْ فَزَادَهُمْ إِيمَانًا وَقَالُوا حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ", "https://everyayah.com/data/Alafasy_128kbps/003173.mp3"),
        QuranVerseCandidate(3, 200, "آل عمران", "يَا أَيُّهَا الَّذِينَ آمَنُوا اصْبِرُوا وَصَابِرُوا وَرَابِطُوا وَاتَّقُوا اللَّهَ لَعَلَّكُمْ تُفْلِحُونَ", "https://everyayah.com/data/Alafasy_128kbps/003200.mp3"),
        QuranVerseCandidate(10, 62, "يونس", "أَلَا إِنَّ أَوْلِيَاءَ اللَّهِ لَا خَوْفٌ عَلَيْهِمْ وَلَا هُمْ يَحْزَنُونَ", "https://everyayah.com/data/Alafasy_128kbps/010062.mp3"),
        QuranVerseCandidate(11, 115, "هود", "وَاصْبِرْ فَإِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ", "https://everyayah.com/data/Alafasy_128kbps/011115.mp3"),
        QuranVerseCandidate(12, 86, "يوسف", "قَالَ إِنَّمَا أَشْكُو بَثِّي وَحُزْنِي إِلَى اللَّهِ", "https://everyayah.com/data/Alafasy_128kbps/012086.mp3"),
        QuranVerseCandidate(13, 28, "الرعد", "الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُمْ بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ", "https://everyayah.com/data/Alafasy_128kbps/013028.mp3"),
        QuranVerseCandidate(14, 7, "إبراهيم", "وَإِذْ تَأَذَّنَ رَبُّكُمْ لَئِنْ شَكَرْتُمْ لَأَزِيدَنَّكُمْ", "https://everyayah.com/data/Alafasy_128kbps/014007.mp3"),
        QuranVerseCandidate(15, 98, "الحجر", "فَسَبِّحْ بِحَمْدِ رَبِّكَ وَكُنْ مِنَ السَّاجِدِينَ", "https://everyayah.com/data/Alafasy_128kbps/015098.mp3"),
        QuranVerseCandidate(17, 24, "الإسراء", "وَاخْفِضْ لَهُمَا جَنَاحَ الذُّلِّ مِنَ الرَّحْمَةِ وَقُلْ رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا", "https://everyayah.com/data/Alafasy_128kbps/017024.mp3"),
        QuranVerseCandidate(18, 46, "الكهف", "الْمَالُ وَالْبَنُونَ زِينَةُ الْحَيَاةِ الدُّنْيَا ۖ وَالْبَاقِيَاتُ الصَّالِحَاتُ خَيْرٌ عِنْدَ رَبِّكَ ثَوَابًا وَخَيْرٌ أَمَلًا", "https://everyayah.com/data/Alafasy_128kbps/018046.mp3"),
        QuranVerseCandidate(19, 96, "مريم", "إِنَّ الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ سَيَجْعَلُ لَهُمُ الرَّحْمَٰنُ وُدًّا", "https://everyayah.com/data/Alafasy_128kbps/019096.mp3"),
        QuranVerseCandidate(20, 130, "طه", "فَاصْبِرْ عَلَىٰ مَا يَقُولُونَ وَسَبِّحْ بِحَمْدِ رَبِّكَ قَبْلَ طُلُوعِ الشَّمْسِ وَقَبْلَ غُرُوبِهَا", "https://everyayah.com/data/Alafasy_128kbps/020130.mp3"),
        QuranVerseCandidate(21, 87, "الأنبياء", "وَذَا النُّونِ إِذْ ذَهَبَ مُغَاضِبًا فَظَنَّ أَنْ لَنْ نَقْدِرَ عَلَيْهِ فَنَادَىٰ فِي الظُّلُمَاتِ أَنْ لَا إِلَٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ", "https://everyayah.com/data/Alafasy_128kbps/021087.mp3"),
        QuranVerseCandidate(24, 35, "النور", "اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ", "https://everyayah.com/data/Alafasy_128kbps/024035.mp3"),
        QuranVerseCandidate(26, 80, "الشعراء", "وَإِذَا مَرِضْتُ فَهُوَ يَشْفِينِ", "https://everyayah.com/data/Alafasy_128kbps/026080.mp3"),
        QuranVerseCandidate(28, 24, "القصص", "رَبِّ إِنِّي لِمَا أَنْزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ", "https://everyayah.com/data/Alafasy_128kbps/028024.mp3"),
        QuranVerseCandidate(39, 53, "الزمر", "قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنْفُسِهِمْ لَا تَقْنَطُوا مِنْ رَحْمَةِ اللَّهِ ۚ إِنَّ اللَّهَ يَغْفِرُ الذُّنُوبَ جَمِيعًا", "https://everyayah.com/data/Alafasy_128kbps/039053.mp3"),
        QuranVerseCandidate(40, 60, "غافر", "وَقَالَ رَبُّكُمُ ادْعُونِي أَسْتَجِبْ لَكُمْ", "https://everyayah.com/data/Alafasy_128kbps/040060.mp3"),
        QuranVerseCandidate(57, 4, "الحديد", "وَهُوَ مَعَكُمْ أَيْنَ مَا كُنْتُمْ ۚ وَاللَّهُ بِمَا تَعْمَلُونَ بَصِيرٌ", "https://everyayah.com/data/Alafasy_128kbps/057004.mp3"),
        QuranVerseCandidate(65, 3, "الطلاق", "وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ ۚ وَمَنْ يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ", "https://everyayah.com/data/Alafasy_128kbps/065003.mp3"),
        QuranVerseCandidate(94, 6, "الشرح", "إِنَّ مَعَ الْعُسْرِ يُسْرًا", "https://everyayah.com/data/Alafasy_128kbps/094006.mp3"),
        QuranVerseCandidate(112, 1, "الإخلاص", "قُلْ هُوَ اللَّهُ أَحَدٌ", "https://everyayah.com/data/Alafasy_128kbps/112001.mp3")
    )

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

    private fun acquireWakeLock(context: Context, timeoutMs: Long = 30000L, turnScreenOn: Boolean = false) {
        try {
            var powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return
            if (turnScreenOn || powerManager.isInteractive == false) {
                try {
                    @Suppress("DEPRECATION")
                    var screenLock = powerManager.newWakeLock(
                        PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
                        "Athar::ScreenWakeTurnOn"
                    )
                    screenLock.acquire(Math.min(timeoutMs, 15000L))
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }

            if (cpuWakeLock == null) {
                cpuWakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Athar::AudioExecutionWakeLock")
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
        } catch (e: Exception) {}
    }

    fun purgeAllExtraneousNotifications(context: Context, keepId: Int? = null) {
        try {
            var manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
            var allAlertIds = listOf(
                ID_PRAYER_ATHAN,
                ID_IQAMAH,
                ID_POST_ADHAN_DUA,
                ID_QURAN_AYAH,
                ID_QURAN_WIRD,
                ID_SALAWAT,
                ID_DHIKR_TASBEEH,
                ID_MORNING_EVENING,
                ID_PARENTS_DUTY,
                ID_SYSTEM_OVERLAY_ATHAN,
                ID_SMART_ALARM,
                ID_CALL_INTERRUPTION,
                ID_SMART_SILENCE,
                ID_TEST_NOTIFICATION,
                99991,
                99992,
                99998,
                99999
            )
            for (alertId in allAlertIds) {
                if (keepId == null || alertId != keepId) {
                    try {
                        manager.cancel(alertId)
                    } catch (e: Exception) {}
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun purgeOnStartup(context: Context) {
        try {
            var manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

            // 1. Clear any lingering ghost notification cards at app launch
            manager.cancelAll()
            purgeAllExtraneousNotifications(context, null)

            // 2. Explicitly delete all legacy and conflicting channels and recreate canonical channels
            initChannels(context)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }


    fun initChannels(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            var manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
            var vibration = getVibrationArray(context)
            var bypassDnd = isDndBypassEnabled(context)

            // Explicitly delete all legacy and conflicting notification channels from previous iterations
            var legacyChannels = listOf(
                "athar_ongoing_channel",
                "athar_ongoing_prayer_channel",
                "athar_prayer_channel",
                "athar_adhkar_channel",
                "athar_salawat_dhikr_channel",
                "athar_reminders_channel",
                "athar_media_channel",
                "athar_legacy_channel",
                "athar_default_channel",
                "athar_audio_channel",
                "athar_test_channel",
                "athar_background_channel"
            )
            for (legacyId in legacyChannels) {
                try {
                    manager.deleteNotificationChannel(legacyId)
                } catch (e: Exception) {}
            }

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
                    setSound(null, null)
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
                    setSound(null, null)
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
                    setSound(null, null)
                },
                NotificationChannel(
                    CHANNEL_DHIKR_ID,
                    "الأذكار والتسبيح والصلوات على النبي ﷺ",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "أذكار الصباح والمساء والصلوات والتسبيحات الـ 14 المعتمدة"
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                    enableVibration(true)
                    vibrationPattern = vibration
                    enableLights(true)
                    lightColor = Color.parseColor("#E6C66E")
                    setSound(null, null)
                },
                NotificationChannel(
                    CHANNEL_PARENTS_ID,
                    "بر الوالدين وصلة الرحم",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "تنبيهات الوصية بالوالدين والإحسان إليهما مع صوت الدعاء المخصص"
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                    enableVibration(true)
                    vibrationPattern = vibration
                    enableLights(true)
                    lightColor = Color.parseColor("#E6C66E")
                    setSound(null, null)
                },
                NotificationChannel(
                    CHANNEL_ONGOING_ID,
                    "شريط مواقيت الصلاة الدائم (أثر)",
                    NotificationManager.IMPORTANCE_DEFAULT
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
                    setSound(null, null)
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
                    setSound(null, null)
                }
            )
            channels.forEach { manager.createNotificationChannel(it) }
        }
    }

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
        var isAthanCat = (category == CAT_PRAYER_ATHAN || category == CAT_SYSTEM_OVERLAY_ATHAN || category == "prayer" || category == "adhan" || category == "athan")
        var effectiveCategory = if (isAthanCat) CAT_PRAYER_ATHAN else category
        var notifId = if (isAthanCat) {
            ID_PRAYER_ATHAN
        } else {
            customNotificationId ?: getNotificationId(category)
        }
        var categoryBadge = badge ?: getCategoryBadge(effectiveCategory)
        var channelId = getChannelId(effectiveCategory)
        var isParents = (effectiveCategory == CAT_PARENTS_DUTY || category == "parents" || category == "parents_duty")
        var isWird = (effectiveCategory == CAT_QURAN_WIRD || category == "wird" || category == "quran_wird")
        var isAyah = (effectiveCategory == CAT_QURAN_AYAH || category == "ayah" || category == "quran_ayah")
        var isTasbih = (effectiveCategory == CAT_DHIKR_TASBEEH || effectiveCategory == CAT_SALAWAT || category == "salawat" || category == "tasbeeh")
        var isAdhkar = (effectiveCategory == CAT_MORNING_EVENING || category == "adhkar")
        var adhkarSubCat = if (title.contains("صباح") || body.contains("صباح")) "morning" else "evening"

        var targetTab = when {
            isAyah || isWird -> "quran"
            isParents -> "companion"
            isTasbih -> "home"
            isAdhkar -> "adhkar"
            else -> getTargetTab(effectiveCategory)
        }
        var safeAudioUrl = audioUrl ?: ""
        var mode = getNotificationMode(context)

        var resolvedSurahNumber = surahNumber
        var resolvedAyahNumber = ayahNumber
        if (effectiveCategory == CAT_QURAN_AYAH && (resolvedSurahNumber <= 0 || resolvedAyahNumber <= 0)) {
            var picked = quranPool[Random.nextInt(quranPool.size)]
            resolvedSurahNumber = picked.surah
            resolvedAyahNumber = picked.ayah
        }

        var openAppIntent = Intent(context, MainActivity::class.java).apply {
            action = if (effectiveCategory == CAT_PRAYER_ATHAN) "OPEN_ATHAN_FULLSCREEN" else "com.athar.islamic.ACTION_DEEP_LINK"
            data = Uri.parse("athar://deeplink/$effectiveCategory/$notifId?s=$resolvedSurahNumber&a=$resolvedAyahNumber&ts=${System.currentTimeMillis()}")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("action", if (effectiveCategory == CAT_PRAYER_ATHAN) "OPEN_ATHAN_FULLSCREEN" else "OPEN_APP")
            putExtra("prayer_name", title)
            putExtra("target_tab", targetTab)
            putExtra("notification_category", effectiveCategory)
            putExtra("category", effectiveCategory)
            putExtra("alert_title", title)
            putExtra("alert_body", body)
            putExtra("audio_url", safeAudioUrl)
            putExtra("surah_number", resolvedSurahNumber)
            putExtra("ayah_number", resolvedAyahNumber)
            putExtra("open_parents_modal", isParents)
            putExtra("open_wird", isWird)
            putExtra("open_tasbih", isTasbih)
            putExtra("adhkar_category", if (isAdhkar) adhkarSubCat else "")
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

        var audioAction = when {
            isMutedState || isMasterMuted(context) -> ACTION_UNMUTE_NOTIFICATION_AUDIO
            isEndedState -> ACTION_RESUME_AUDIO
            isPlaying() -> ACTION_MUTE_NOTIFICATION_AUDIO
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

        var primaryIntent = audioActionPendingIntent
        var secondaryIntent = openAppPendingIntent

        var audioButtonText = when {
            isMutedState || isMasterMuted(context) -> "تشغيل الصوت 🔊"
            isEndedState -> "إعادة الاستماع ↻"
            isPausedState -> "استئناف التشغيل ▶"
            mode == MODE_NOTIFICATION_PLAY_BUTTON && !isPlaying() -> "تشغيل الاستماع ▶"
            isPlaying() -> "إيقاف الصوت ✕"
            else -> "إيقاف الصوت ✕"
        }

        var collapsedAudioText = when {
            isMutedState || isMasterMuted(context) -> "صوت 🔊"
            isEndedState -> "استماع ↻"
            isPausedState -> "تشغيل ▶"
            mode == MODE_NOTIFICATION_PLAY_BUTTON && !isPlaying() -> "تشغيل ▶"
            isPlaying() -> "إيقاف ✕"
            else -> "إيقاف ✕"
        }

        var secondaryButtonText = when (effectiveCategory) {
            CAT_QURAN_AYAH -> "اذهب للآية 📖"
            CAT_QURAN_WIRD -> "صفحة القرآن 📖"
            CAT_PARENTS_DUTY -> "صفحة بر الوالدين 🤍"
            CAT_PRAYER_ATHAN, CAT_SYSTEM_OVERLAY_ATHAN -> "عرض الأذان 🕌"
            CAT_SALAWAT -> "الصلاة على النبي 💚"
            CAT_DHIKR_TASBEEH -> "المسبحة والاستغفار 📿"
            CAT_MORNING_EVENING -> if (title.contains("صباح") || body.contains("صباح")) "أذكار الصباح ☀️" else "أذكار المساء 🌙"
            CAT_ONGOING_PRAYER, CAT_IQAMAH -> "مواقيت الصلاة 🕋"
            CAT_POST_ADHAN_DUA -> "دعاء الأذان 🤲"
            else -> "عرض المحتوى ←"
        }

        var collapsedSecondaryText = when (effectiveCategory) {
            CAT_QURAN_AYAH -> "اذهب للآية 📖"
            CAT_QURAN_WIRD -> "القرآن 📖"
            CAT_PARENTS_DUTY -> "بر الوالدين 🤍"
            CAT_PRAYER_ATHAN, CAT_SYSTEM_OVERLAY_ATHAN -> "الأذان 🕌"
            CAT_SALAWAT -> "المسبحة 💚"
            CAT_DHIKR_TASBEEH -> "المسبحة 📿"
            CAT_MORNING_EVENING -> if (title.contains("صباح") || body.contains("صباح")) "الصباح ☀️" else "المساء 🌙"
            CAT_ONGOING_PRAYER, CAT_IQAMAH -> "الصلاة 🕋"
            CAT_POST_ADHAN_DUA -> "الدعاء 🤲"
            else -> "فتح ←"
        }

        var collapsedView = RemoteViews(context.packageName, R.layout.notification_royal_collapsed).apply {
            setTextViewText(R.id.tvNotifTitle, title)
            setTextViewText(R.id.tvNotifBody, body.replace("\n", " · "))
            setTextViewText(R.id.tvNotifBadge, categoryBadge)

            // Button 1: Audio Control ("إيقاف الصوت")
            setTextViewText(R.id.btn_action_primary, collapsedAudioText)
            setOnClickPendingIntent(R.id.btn_action_primary, primaryIntent)

            // Button 2: Secondary Action (Deep-Link e.g. "فتح الآية")
            setTextViewText(R.id.btn_action_secondary, collapsedSecondaryText)
            setOnClickPendingIntent(R.id.btn_action_secondary, secondaryIntent)

            // Entire collapsed layout and logo also open deep link
            setOnClickPendingIntent(R.id.layoutRoyalNotifCollapsed, secondaryIntent)
            setOnClickPendingIntent(R.id.ivNotifLogo, secondaryIntent)
        }

        var expandedView = RemoteViews(context.packageName, R.layout.notification_royal_expanded).apply {
            setTextViewText(R.id.tvNotifTitle, title)
            setTextViewText(R.id.tvNotifBody, body)
            setTextViewText(R.id.tvNotifBadge, categoryBadge)

            // Button 1: Audio Control ("إيقاف الصوت")
            setTextViewText(R.id.btn_action_primary, audioButtonText)
            setOnClickPendingIntent(R.id.btn_action_primary, primaryIntent)

            // Button 2: Secondary Action (Deep-Link e.g. "فتح الآية")
            setTextViewText(R.id.btn_action_secondary, secondaryButtonText)
            setOnClickPendingIntent(R.id.btn_action_secondary, secondaryIntent)

            // Dismiss Button
            setOnClickPendingIntent(R.id.btnNotifClose, dismissPendingIntent)

            // Entire expanded layout and logo also open deep link
            setOnClickPendingIntent(R.id.layoutRoyalNotifExpanded, secondaryIntent)
            setOnClickPendingIntent(R.id.ivNotifLogo, secondaryIntent)
        }

        var appLogoBitmap = try {
            OngoingPrayerNotificationService.getScaledAppLogo(context, 96)
        } catch (e: Exception) {
            null
        }

        var effectiveOngoing = isOngoing || isPlaying()

        var builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.ic_stat_athar)
            .apply {
                if (appLogoBitmap != null) setLargeIcon(appLogoBitmap)
            }
            .setStyle(NotificationCompat.DecoratedCustomViewStyle())
            .setCustomContentView(collapsedView)
            .setCustomBigContentView(expandedView)
            .setContentTitle(title)
            .setContentText(body)

        var isAlarmOrAthan = (category == CAT_PRAYER_ATHAN ||
                category == CAT_SMART_ALARM ||
                category == CAT_SYSTEM_OVERLAY_ATHAN ||
                category == CAT_TEST_NOTIFICATION)

        // Only attach heads-up banner for regular non-adhan notifications
        // Adhan uses FullScreenIntent / AthanFullScreenActivity so adding heads-up creates a duplicate floating card
        if (!isAlarmOrAthan) {
            builder.setCustomHeadsUpContentView(expandedView)
        }

        var notifPriority = when {
            isAlarmOrAthan -> NotificationCompat.PRIORITY_MAX
            isOngoing -> NotificationCompat.PRIORITY_LOW
            else -> NotificationCompat.PRIORITY_HIGH
        }

        builder.setCategory(
            if (isAlarmOrAthan)
                NotificationCompat.CATEGORY_ALARM
            else
                NotificationCompat.CATEGORY_EVENT
        )
        .setPriority(notifPriority)
        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
        .setContentIntent(openAppPendingIntent)
        .setAutoCancel(!effectiveOngoing)
        .setOngoing(effectiveOngoing)
        .setOnlyAlertOnce(true)
        .setColor(Color.parseColor("#E6C66E"))
        .addAction(R.drawable.ic_stat_athar, audioButtonText, primaryIntent)
        .addAction(R.drawable.ic_stat_athar, secondaryButtonText, secondaryIntent)

        if (!isAlarmOrAthan) {
            builder.setSilent(true)
        }

        var isOpenTasbih = isTasbih
        var adhkarCat = if (isAdhkar) adhkarSubCat else ""

        var fullScreenIntent = Intent(context, AthanFullScreenActivity::class.java).apply {
            action = if (isAlarmOrAthan) "com.athar.islamic.ACTION_ATHAN_FULLSCREEN" else "com.athar.islamic.ACTION_ATHAR_ALERT_OVERLAY"
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            putExtra("prayer_name", title)
            putExtra("alert_title", title)
            putExtra("alert_body", body)
            putExtra("category_badge", categoryBadge)
            putExtra("category", effectiveCategory)
            putExtra("target_tab", targetTab)
            putExtra("open_tasbih", isOpenTasbih)
            putExtra("adhkar_category", adhkarCat)
            putExtra("surah_number", resolvedSurahNumber)
            putExtra("ayah_number", resolvedAyahNumber)
            putExtra("action_button_text", secondaryButtonText)
            putExtra("audio_button_text", audioButtonText)
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
        // Set full-screen intent so Android wakes the screen and shows the royal banner overlay on the lock screen
        builder.setFullScreenIntent(fullScreenPendingIntent, true)

        return Pair(notifId, builder.build())
    }

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
        var isAthanCat = (category == CAT_PRAYER_ATHAN || category == CAT_SYSTEM_OVERLAY_ATHAN || category == "prayer" || category == "adhan" || category == "athan")
        var effectiveCategory = if (isAthanCat) CAT_PRAYER_ATHAN else category
        var notifId = if (isAthanCat) {
            ID_PRAYER_ATHAN
        } else {
            customNotificationId ?: getNotificationId(category)
        }

        // Purge any lingering or duplicate notification cards immediately to prevent stacking/lag
        purgeAllExtraneousNotifications(context, notifId)

        var categoryBadge = badge ?: getCategoryBadge(effectiveCategory)
        var mode = getNotificationMode(context)

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
        } else if (category == CAT_QURAN_WIRD && (effectiveAudioUrl.isNullOrEmpty())) {
            effectiveAudioUrl = "public/audio/wird.mp3"
        } else if (effectiveAudioUrl.isNullOrEmpty()) {
            effectiveAudioUrl = getCategoryTone(context, category)
        }

        lastActiveCategory = category
        lastActiveTitle = effectiveTitle
        lastActiveBody = effectiveBody
        lastActiveBadge = categoryBadge
        lastActiveAudioUrl = effectiveAudioUrl
        lastActiveNotifId = notifId
        lastActiveIsOngoing = isOngoing
        lastActiveSurahNumber = effectiveSurah
        lastActiveAyahNumber = effectiveAyah

        var shouldAutoPlay = when (mode) {
            MODE_NOTIFICATION_ONLY -> false
            MODE_NOTIFICATION_PLAY_BUTTON -> false
            MODE_NOTIFICATION_AUDIO -> playSound || !effectiveAudioUrl.isNullOrBlank()
            else -> playSound
        }

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

        acquireWakeLock(
            context,
            timeoutMs = if (shouldAutoPlay) 60000L else 12000L,
            turnScreenOn = true
        )

        if (shouldAutoPlay && !effectiveAudioUrl.isNullOrBlank()) {
            playNotificationAudioWithGuard(context, effectiveAudioUrl, category)
        }

        if (isSystemOverlayEnabled(context)) {
            if (!MainActivity.isAppInForeground) {
                // If user is currently outside the app, display the system overlay card on phone screen
                AthanForegroundService.showOverlayOutsideApp(context)
            }
        }
    }

    fun triggerSingleTestNotification(
        context: Context,
        isAdhanTest: Boolean = false,
        delaySeconds: Int = 0
    ) {
        var executeTest = {
            var manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            manager?.cancel(ID_TEST_NOTIFICATION)
            if (isAdhanTest) {
                manager?.cancel(ID_PRAYER_ATHAN)
            }

            acquireWakeLock(context, timeoutMs = 8000L, turnScreenOn = true)

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

            showRoyalNotification(
                context = context,
                category = category,
                title = title,
                body = body,
                badge = if (isAdhanTest) "🕌 فحص الأذان" else "⚡ فحص الإشعار الموحد",
                audioUrl = audioUrl,
                playSound = true,
                isOngoing = false,
                customNotificationId = if (isAdhanTest) ID_PRAYER_ATHAN else ID_TEST_NOTIFICATION
            )
        }

        if (delaySeconds > 0) {
            if (isAdhanTest) {
                try {
                    var alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
                    if (alarmManager != null) {
                        var triggerTimeMs = System.currentTimeMillis() + (delaySeconds * 1000L)
                        var intent = Intent(context, AtharPrayerAlarmReceiver::class.java).apply {
                            action = AtharPrayerAlarmReceiver.ACTION_PRAYER_ALARM
                            putExtra("prayer_id", "fajr")
                            putExtra("prayer_name", "صلاة الفجر (فحص الأذان الملكي)")
                            putExtra("prayer_time", "05:15")
                            putExtra("audio_url", getMuazzinFajr(context))
                        }
                        var pendingIntent = PendingIntent.getBroadcast(
                            context,
                            99998,
                            intent,
                            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
                        )
                        var showIntent = Intent(context, MainActivity::class.java).apply {
                            action = "OPEN_ATHAN_FULLSCREEN"
                            putExtra("prayer_name", "صلاة الفجر (فحص الأذان الملكي)")
                        }
                        var showPendingIntent = PendingIntent.getActivity(
                            context,
                            99999,
                            showIntent,
                            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
                        )
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                            var clockInfo = AlarmManager.AlarmClockInfo(triggerTimeMs, showPendingIntent)
                            alarmManager.setAlarmClock(clockInfo, pendingIntent)
                        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTimeMs, pendingIntent)
                        } else {
                            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTimeMs, pendingIntent)
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
            mainHandler.postDelayed({
                executeTest()
            }, delaySeconds * 1000L)
        } else {
            executeTest()
        }
    }

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

    fun playNotificationAudioWithGuard(
        context: Context,
        audioPathOrUrl: String,
        category: String,
        startOffsetMs: Long = 0L
    ) {
        synchronized(audioLock) {
            try {
                var isAthanCat = (category == CAT_PRAYER_ATHAN || category == CAT_SYSTEM_OVERLAY_ATHAN || category == "prayer" || category == "adhan" || category == "athan")

                if (currentPlayingCategory == category && currentPlayingUrl == audioPathOrUrl && activeMediaPlayer != null) {
                    if (isAudioPaused.get()) {
                        resumeAudio(context)
                    } else if (isAudioMuted.get()) {
                        unmuteCurrentAudio(context)
                    }
                    return
                }

                if (isPlaying() && (currentPlayingCategory == CAT_PRAYER_ATHAN || currentPlayingCategory == CAT_SYSTEM_OVERLAY_ATHAN || currentPlayingCategory == CAT_SMART_ALARM)) {
                    if (isAthanCat) {
                        updateNotificationViews(
                            context,
                            isMutedState = isAudioMuted.get(),
                            isEndedState = false,
                            isOngoing = true,
                            isPausedState = false
                        )
                        return
                    }
                    return
                }

                var nowMs = System.currentTimeMillis()
                if (nowMs - lastAudioTriggerTimeMs < 1000L && currentPlayingCategory == category && isPlaying()) {
                    return
                }
                lastAudioTriggerTimeMs = nowMs

                stopAndReleasePlayer(resetPosition = (startOffsetMs <= 0L))
                isAudioMuted.set(false)
                isAudioPaused.set(false)
                isPausedDueToCall.set(false)
                currentPlayingCategory = category
                currentPlayingUrl = audioPathOrUrl
                pausedPositionMs = startOffsetMs

                // 1. Acquire CPU WakeLock immediately to ensure audio starts with zero delay even from Doze mode
                acquireWakeLock(context, 180000L, turnScreenOn = isAthanCat)

                // 2. Live time synchronization: record the true event trigger timestamp
                if (isAthanCat) {
                    if (athanEventTriggerTimeMs <= 0L || startOffsetMs == 0L) {
                        athanEventTriggerTimeMs = System.currentTimeMillis() - startOffsetMs
                    }
                    playbackStartTimeMs = athanEventTriggerTimeMs
                } else {
                    playbackStartTimeMs = System.currentTimeMillis() - startOffsetMs
                }

                var isHighPriority = (category == CAT_SMART_ALARM || isAthanCat)
                var attributes = AudioAttributes.Builder()
                    .setUsage(
                        if (isHighPriority)
                            AudioAttributes.USAGE_ALARM
                        else
                            AudioAttributes.USAGE_NOTIFICATION_EVENT
                    )
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()

                // 3. Immediate exclusive Audio Focus acquisition
                requestAudioFocusInternal(context, attributes, isHighPriority = isHighPriority)

                var player = MediaPlayer()
                player.setAudioAttributes(attributes)
                player.setWakeMode(context.applicationContext, PowerManager.PARTIAL_WAKE_LOCK)
                player.isLooping = false

                var isAssetSource = false
                var dataSourceSet = false

                // 1. FAST-PATH: Detect known pre-bundled studio assets (even if passed as an HTTP URL or relative path)
                // This eliminates 5-10s network buffering delays and begins playback in < 15ms directly from APK assets!
                var knownAssetMatch: String? = when {
                    audioPathOrUrl.contains("adhan_fajr") -> "public/audio/adhan_fajr_alafasy.mp3"
                    audioPathOrUrl.contains("adhan_alafasy") -> "public/audio/adhan_alafasy.mp3"
                    audioPathOrUrl.contains("adhan_makkah") -> "public/audio/adhan_makkah.mp3"
                    audioPathOrUrl.contains("adhan_madinah") -> "public/audio/adhan_madinah.mp3"
                    audioPathOrUrl.contains("adhan_alaqsa") -> "public/audio/adhan_alaqsa.mp3"
                    audioPathOrUrl.contains("dua_after_adhan") -> "public/audio/dua_after_adhan.mp3"
                    audioPathOrUrl.contains("iqamah") -> "public/audio/iqamah.mp3"
                    audioPathOrUrl.contains("parents") -> "public/audio/parents.mp3"
                    audioPathOrUrl.contains("salawat") -> "public/audio/salawat.mp3"
                    audioPathOrUrl.contains("wird") -> "public/audio/wird.mp3"
                    audioPathOrUrl.contains("dhikr_sample") -> "public/audio/dhikr_sample.mp3"
                    else -> null
                }

                if (knownAssetMatch != null) {
                    try {
                        var afd = context.assets.openFd(knownAssetMatch)
                        currentAssetFd = afd
                        player.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                        dataSourceSet = true
                        isAssetSource = true
                    } catch (e: Exception) {}
                }

                if (!dataSourceSet) {
                    if (audioPathOrUrl.startsWith("http://") || audioPathOrUrl.startsWith("https://")) {
                        player.setDataSource(context, Uri.parse(audioPathOrUrl))
                        dataSourceSet = true
                    } else {
                        var cleanPath = audioPathOrUrl.removePrefix("public/").removePrefix("/")
                        var candidates = listOf(
                            "public/audio/$cleanPath",
                            "public/$cleanPath",
                            "audio/$cleanPath",
                            cleanPath
                        )
                        for (candidate in candidates) {
                            try {
                                var afd = context.assets.openFd(candidate)
                                currentAssetFd = afd
                                player.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                                dataSourceSet = true
                                isAssetSource = true
                                break
                            } catch (e: Exception) {}
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
                            isAssetSource = true
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
                        pausedPositionMs = 0L
                        isAudioPaused.set(false)
                        isPausedDueToCall.set(false)
                        abandonAudioFocusInternal()
                        stopAndReleasePlayer(resetPosition = true)
                        releaseWakeLock()
                        updateNotificationViews(
                            context,
                            isMutedState = false,
                            isEndedState = true,
                            isOngoing = false,
                            isPausedState = false
                        )
                        // When alert finishes, cleanly stop foreground service and overlay
                        try {
                            AthanForegroundService.stopAthan(context)
                        } catch (e: Exception) {}
                    }
                }

                player.setOnErrorListener { _, _, _ ->
                    synchronized(audioLock) {
                        abandonAudioFocusInternal()
                        stopAndReleasePlayer(resetPosition = true)
                        releaseWakeLock()
                    }
                    true
                }

                var onPreparedAction = { mp: MediaPlayer ->
                    synchronized(audioLock) {
                        if (activeMediaPlayer === mp) {
                            activeDurationMs = mp.duration.toLong()

                            var effectiveMuted = isAudioMuted.get() || isMasterMuted(context)
                            var effectiveVol = if (effectiveMuted) 0f else getMasterVolume(context)
                            mp.setVolume(effectiveVol, effectiveVol)

                            var seekTarget = startOffsetMs
                            if (isAthanCat && athanEventTriggerTimeMs > 0L) {
                                var realWorldElapsed = System.currentTimeMillis() - athanEventTriggerTimeMs
                                if (realWorldElapsed > 0L && realWorldElapsed < activeDurationMs) {
                                    seekTarget = realWorldElapsed
                                }
                            }

                            if (seekTarget > 0 && seekTarget < activeDurationMs) {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                    mp.seekTo(seekTarget, MediaPlayer.SEEK_CLOSEST)
                                } else {
                                    mp.seekTo(seekTarget.toInt())
                                }
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
                }

                player.setOnPreparedListener { mp ->
                    onPreparedAction(mp)
                }

                activeMediaPlayer = player

                // 4. ZERO LATENCY EXECUTION:
                // For local uncompressed assets, prepare synchronously!
                // Eliminates async looper thread latency so audio begins in < 15ms.
                if (isAssetSource) {
                    try {
                        player.prepare()
                        onPreparedAction(player)
                    } catch (e: Exception) {
                        player.prepareAsync()
                    }
                } else {
                    player.prepareAsync()
                }
            } catch (e: Exception) {
                e.printStackTrace()
                stopAndReleasePlayer()
                releaseWakeLock()
            }
        }
    }

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
                    isOngoing = true,
                    isPausedState = false
                )
            }
        }
    }

    fun unmuteCurrentAudio(context: Context? = null) {
        synchronized(audioLock) {
            isAudioMuted.set(false)
            try {
                var mp = activeMediaPlayer
                var isAthanCat = (currentPlayingCategory == CAT_PRAYER_ATHAN || currentPlayingCategory == CAT_SYSTEM_OVERLAY_ATHAN)
                var vol = if (context != null) getMasterVolume(context) else 1.0f
                if (vol <= 0.05f) vol = 1.0f

                // LIVE TIME SYNCHRONIZATION:
                // Jump directly to current real-world elapsed time since Athan event began!
                if (isAthanCat && athanEventTriggerTimeMs > 0L) {
                    var realWorldElapsedMs = System.currentTimeMillis() - athanEventTriggerTimeMs
                    if (realWorldElapsedMs >= activeDurationMs) {
                        stopAndReleasePlayer(resetPosition = true)
                        if (context != null) {
                            updateNotificationViews(
                                context,
                                isMutedState = false,
                                isEndedState = true,
                                isOngoing = false,
                                isPausedState = false
                            )
                        }
                        return
                    }

                    if (mp != null) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            mp.seekTo(realWorldElapsedMs, MediaPlayer.SEEK_CLOSEST)
                        } else {
                            mp.seekTo(realWorldElapsedMs.toInt())
                        }
                        mp.setVolume(vol, vol)
                        if (!mp.isPlaying) {
                            mp.start()
                        }
                    } else if (context != null && !currentPlayingUrl.isNullOrEmpty()) {
                        playNotificationAudioWithGuard(
                            context,
                            currentPlayingUrl!!,
                            currentPlayingCategory!!,
                            startOffsetMs = realWorldElapsedMs
                        )
                    }
                } else if (mp != null) {
                    // For General Dhikr / Ayah / Dua:
                    // Simply restore audible volume - keep playing continuously from current moment!
                    mp.setVolume(vol, vol)
                    if (!mp.isPlaying && !isAudioPaused.get()) {
                        mp.start()
                    }
                } else if (context != null && !currentPlayingUrl.isNullOrEmpty()) {
                    playNotificationAudioWithGuard(
                        context,
                        currentPlayingUrl!!,
                        currentPlayingCategory ?: CAT_QURAN_AYAH,
                        startOffsetMs = pausedPositionMs
                    )
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

    fun toggleAudio(context: Context? = null) {
        synchronized(audioLock) {
            if (isAudioMuted.get()) {
                unmuteCurrentAudio(context)
            } else if (isPlaying()) {
                muteCurrentAudio(context)
            } else if (isAudioPaused.get()) {
                resumeAudio(context)
            } else {
                unmuteCurrentAudio(context)
            }
        }
    }

    fun pauseAudio(context: Context? = null) {
        synchronized(audioLock) {
            isAudioPaused.set(true)
            try {
                activeMediaPlayer?.let { mp ->
                    try {
                        var currentPos = mp.currentPosition.toLong()
                        if (currentPos > 0) {
                            pausedPositionMs = currentPos
                        }
                    } catch (e: Exception) {}
                    if (mp.isPlaying) {
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

    fun resumeAudio(context: Context? = null) {
        synchronized(audioLock) {
            isAudioPaused.set(false)
            isPausedDueToCall.set(false)
            try {
                var mp = activeMediaPlayer
                var isAthanCat = (currentPlayingCategory == CAT_PRAYER_ATHAN || currentPlayingCategory == CAT_SYSTEM_OVERLAY_ATHAN)

                // LIVE TIME SYNCHRONIZATION:
                // Calculate elapsed real-world time rather than resuming stale paused timestamp
                var targetPos = if (isAthanCat && athanEventTriggerTimeMs > 0L) {
                    System.currentTimeMillis() - athanEventTriggerTimeMs
                } else {
                    pausedPositionMs
                }

                if (isAthanCat && athanEventTriggerTimeMs > 0L && targetPos >= activeDurationMs) {
                    stopAndReleasePlayer(resetPosition = true)
                    if (context != null) {
                        updateNotificationViews(
                            context,
                            isMutedState = false,
                            isEndedState = true,
                            isOngoing = false,
                            isPausedState = false
                        )
                    }
                    return
                }

                if (mp != null) {
                    if (targetPos > 0 && targetPos < activeDurationMs) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            mp.seekTo(targetPos, MediaPlayer.SEEK_CLOSEST)
                        } else {
                            mp.seekTo(targetPos.toInt())
                        }
                    }
                    var effectiveMuted = isAudioMuted.get() || (context != null && isMasterMuted(context))
                    var effectiveVol = if (effectiveMuted) 0f else (if (context != null) getMasterVolume(context) else 1.0f)
                    mp.setVolume(effectiveVol, effectiveVol)
                    if (!mp.isPlaying) {
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
                    var cat = currentPlayingCategory ?: (if (isAthanCat) CAT_PRAYER_ATHAN else CAT_QURAN_AYAH)
                    playNotificationAudioWithGuard(context, currentPlayingUrl!!, cat, startOffsetMs = targetPos)
                } else if (context != null && !lastActiveAudioUrl.isNullOrEmpty()) {
                    var cat = lastActiveCategory ?: (if (isAthanCat) CAT_PRAYER_ATHAN else CAT_QURAN_AYAH)
                    playNotificationAudioWithGuard(context, lastActiveAudioUrl!!, cat, startOffsetMs = targetPos)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun getCurrentPositionMs(): Long {
        synchronized(audioLock) {
            var mp = activeMediaPlayer
            var isAthanCat = (currentPlayingCategory == CAT_PRAYER_ATHAN || currentPlayingCategory == CAT_SYSTEM_OVERLAY_ATHAN)
            return try {
                if (isAthanCat && athanEventTriggerTimeMs > 0L && !isAudioPaused.get()) {
                    var liveElapsed = System.currentTimeMillis() - athanEventTriggerTimeMs
                    if (liveElapsed > activeDurationMs) activeDurationMs else liveElapsed
                } else if (mp != null && (mp.isPlaying || isAudioMuted.get())) {
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

    fun stopAndReleasePlayer(resetPosition: Boolean = true) {
        try {
            activeMediaPlayer?.let { mp ->
                if (mp.isPlaying) {
                    mp.stop()
                }
                mp.reset()
                mp.release()
            }
        } catch (e: Exception) {} 
        finally {
            activeMediaPlayer = null
            currentPlayingCategory = null
            currentPlayingUrl = null
            if (resetPosition) {
                pausedPositionMs = 0L
                playbackStartTimeMs = 0L
                athanEventTriggerTimeMs = 0L
                isAudioPaused.set(false)
            }
            isAudioMuted.set(false)
            abandonAudioFocusInternal()
            releaseWakeLock()
        }

        try {
            currentAssetFd?.close()
        } catch (e: Exception) {} 
        finally {
            currentAssetFd = null
        }
    }
}
