package com.athar.islamic

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews

/**
 * Athar Native Android Home Screen Live Widget Provider
 * Supports Full Royal Card & Compact layouts, deep-linking intents,
 * live prayer countdowns, and rotating Quranic verses.
 */
class AtharPrayerWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
        // Ensure background periodic sync is active
        AtharBackgroundSyncWorker.enqueuePeriodicSync(context)
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle?
    ) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
        updateAppWidget(context, appWidgetManager, appWidgetId)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        when (intent.action) {
            ACTION_ROTATE_WIDGET_AYAH -> {
                rotateNextAyah(context)
            }
            ACTION_FORCE_UPDATE_WIDGET, Intent.ACTION_TIME_TICK -> {
                refreshAllWidgets(context)
            }
        }
    }

    companion object {
        const val PREFS_NAME = "AtharWidgetPrefs"
        const val KEY_NEXT_PRAYER = "next_prayer_name"
        const val KEY_NEXT_TIME = "next_prayer_time"
        const val KEY_REMAINING = "remaining_time"
        const val KEY_FAJR = "fajr_time"
        const val KEY_DHUHR = "dhuhr_time"
        const val KEY_ASR = "asr_time"
        const val KEY_MAGHRIB = "maghrib_time"
        const val KEY_ISHA = "isha_time"
        const val KEY_HIJRI_DATE = "hijri_date"
        const val KEY_AYAH_TEXT = "widget_ayah_text"
        const val KEY_AYAH_SURAH = "widget_ayah_surah"
        const val KEY_AYAH_INDEX = "widget_ayah_index"

        // Customization keys from App Settings
        const val KEY_WIDGET_STYLE = "widget_style" // "royal_card" or "compact"
        const val KEY_SHOW_DHIKR = "widget_show_dhikr"
        const val KEY_SHOW_FAJR = "widget_show_fajr"
        const val KEY_SHOW_DHUHR = "widget_show_dhuhr"
        const val KEY_SHOW_ASR = "widget_show_asr"
        const val KEY_SHOW_MAGHRIB = "widget_show_maghrib"
        const val KEY_SHOW_ISHA = "widget_show_isha"
        const val KEY_SHOW_COUNTDOWN = "widget_show_countdown"
        const val KEY_BG_OPACITY = "widget_bg_opacity" // "solid", "glass_85", "glass_65"
        const val KEY_THEME_ACCENT = "widget_theme_accent" // "gold_royal", "gold_bright", "gold_amber"

        const val ACTION_ROTATE_WIDGET_AYAH = "com.athar.islamic.ACTION_ROTATE_WIDGET_AYAH"
        const val ACTION_FORCE_UPDATE_WIDGET = "com.athar.islamic.ACTION_FORCE_UPDATE_WIDGET"

        private val PRESET_VERSES = listOf(
            Pair("﴿أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ﴾", "سورة الرعد · الآية ٢٨"),
            Pair("﴿فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ﴾", "سورة البقرة · الآية ١٥٢"),
            Pair("﴿فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا﴾", "سورة الشرح · الآية ٥-٦"),
            Pair("﴿وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ﴾", "سورة الطلاق · الآية ٢-٣"),
            Pair("﴿وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ الدَّاعِ﴾", "سورة البقرة · الآية ١٨٦"),
            Pair("﴿إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا﴾", "سورة النساء · الآية ١٠٣"),
            Pair("﴿سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ﴾", "ذكر نبوي مبارك · ثقيل في الميزان")
        )

        private fun createPendingIntent(
            context: Context,
            requestCode: Int,
            targetTab: String
        ): PendingIntent {
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("target_tab", targetTab)
                putExtra("action", "NAVIGATE_TO_$targetTab".uppercase())
            }
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or (
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
            )
            return PendingIntent.getActivity(context, requestCode, intent, flags)
        }

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val nextPrayer = prefs.getString(KEY_NEXT_PRAYER, "صلاة الفجر") ?: "صلاة الفجر"
            val nextTime = prefs.getString(KEY_NEXT_TIME, "05:15") ?: "05:15"
            val remaining = prefs.getString(KEY_REMAINING, "متبقي: 01:25") ?: "متبقي: 01:25"
            val fajr = prefs.getString(KEY_FAJR, "05:15") ?: "05:15"
            val dhuhr = prefs.getString(KEY_DHUHR, "12:00") ?: "12:00"
            val asr = prefs.getString(KEY_ASR, "15:15") ?: "15:15"
            val maghrib = prefs.getString(KEY_MAGHRIB, "17:50") ?: "17:50"
            val isha = prefs.getString(KEY_ISHA, "19:20") ?: "19:20"
            val hijriDate = prefs.getString(KEY_HIJRI_DATE, "أَثَرُ | مواقيت الصلاة") ?: "أَثَرُ | مواقيت الصلاة"

            val ayahIndex = prefs.getInt(KEY_AYAH_INDEX, 0)
            val defaultAyah = PRESET_VERSES[ayahIndex % PRESET_VERSES.size]
            val ayahText = prefs.getString(KEY_AYAH_TEXT, defaultAyah.first) ?: defaultAyah.first
            val ayahSurah = prefs.getString(KEY_AYAH_SURAH, defaultAyah.second) ?: defaultAyah.second

            // Customization Options
            val styleSetting = prefs.getString(KEY_WIDGET_STYLE, "royal_card") ?: "royal_card"
            val showDhikr = prefs.getBoolean(KEY_SHOW_DHIKR, true)
            val showFajr = prefs.getBoolean(KEY_SHOW_FAJR, true)
            val showDhuhr = prefs.getBoolean(KEY_SHOW_DHUHR, true)
            val showAsr = prefs.getBoolean(KEY_SHOW_ASR, true)
            val showMaghrib = prefs.getBoolean(KEY_SHOW_MAGHRIB, true)
            val showIsha = prefs.getBoolean(KEY_SHOW_ISHA, true)
            val showCountdown = prefs.getBoolean(KEY_SHOW_COUNTDOWN, true)

            val bgOpacity = prefs.getString(KEY_BG_OPACITY, "solid") ?: "solid"
            val themeAccent = prefs.getString(KEY_THEME_ACCENT, "gold_royal") ?: "gold_royal"

            val bgColor = when (bgOpacity) {
                "glass_65" -> android.graphics.Color.argb(165, 14, 11, 7)
                "glass_85" -> android.graphics.Color.argb(216, 14, 11, 7)
                else -> android.graphics.Color.argb(250, 7, 6, 5)
            }

            // Determine dimensions from widget options if available
            val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
            val minHeight = options?.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT) ?: 110
            val isCompact = styleSetting == "compact" || minHeight < 100

            val views = if (isCompact) {
                // 1. Sleek Compact Widget View
                RemoteViews(context.packageName, R.layout.widget_prayer_times_compact).apply {
                    setInt(R.id.widgetCompactRootLayout, "setBackgroundColor", bgColor)
                    setTextViewText(R.id.tvWidgetNextPrayerCompact, nextPrayer)
                    setTextViewText(R.id.tvWidgetDateCompact, hijriDate)
                    setTextViewText(R.id.tvWidgetNextTimeCompact, nextTime)
                    setTextViewText(R.id.tvWidgetRemainingCompact, remaining)
                    setViewVisibility(R.id.tvWidgetRemainingCompact, if (showCountdown) View.VISIBLE else View.GONE)

                    // Deep links
                    setOnClickPendingIntent(R.id.widgetCompactRootLayout, createPendingIntent(context, 201, "prayers"))
                    setOnClickPendingIntent(R.id.ivWidgetLogoCompact, createPendingIntent(context, 202, "home"))
                }
            } else {
                // 2. Full Luxury Royal Card Widget View
                RemoteViews(context.packageName, R.layout.widget_prayer_times).apply {
                    setInt(R.id.widgetRootLayout, "setBackgroundColor", bgColor)
                    setTextViewText(R.id.tvWidgetDate, hijriDate)
                    setTextViewText(R.id.tvWidgetRemaining, remaining)
                    setViewVisibility(R.id.tvWidgetRemaining, if (showCountdown) View.VISIBLE else View.GONE)

                    setTextViewText(R.id.tvWidgetNextPrayer, nextPrayer)
                    setTextViewText(R.id.tvWidgetNextTime, nextTime)
                    setTextViewText(R.id.tvWidgetNextStatus, "الصلاة القادمة بإذن الله")

                    // Daily Verse / Dhikr
                    setViewVisibility(R.id.layoutWidgetAyah, if (showDhikr) View.VISIBLE else View.GONE)
                    setTextViewText(R.id.tvWidgetAyahText, ayahText)
                    setTextViewText(R.id.tvWidgetAyahSurah, ayahSurah)

                    // 5 Prayers Times
                    setTextViewText(R.id.tvWidgetFajr, fajr)
                    setTextViewText(R.id.tvWidgetDhuhr, dhuhr)
                    setTextViewText(R.id.tvWidgetAsr, asr)
                    setTextViewText(R.id.tvWidgetMaghrib, maghrib)
                    setTextViewText(R.id.tvWidgetIsha, isha)

                    // Visibility toggles for prayer cells
                    setViewVisibility(R.id.cellWidgetFajr, if (showFajr) View.VISIBLE else View.GONE)
                    setViewVisibility(R.id.cellWidgetDhuhr, if (showDhuhr) View.VISIBLE else View.GONE)
                    setViewVisibility(R.id.cellWidgetAsr, if (showAsr) View.VISIBLE else View.GONE)
                    setViewVisibility(R.id.cellWidgetMaghrib, if (showMaghrib) View.VISIBLE else View.GONE)
                    setViewVisibility(R.id.cellWidgetIsha, if (showIsha) View.VISIBLE else View.GONE)

                    // Deep-linking click intents:
                    // A. Header Logo -> Home
                    setOnClickPendingIntent(R.id.ivWidgetLogo, createPendingIntent(context, 101, "home"))
                    setOnClickPendingIntent(R.id.tvWidgetDate, createPendingIntent(context, 102, "home"))

                    // B. Next Prayer Card -> Prayers View
                    setOnClickPendingIntent(R.id.layoutNextPrayerCard, createPendingIntent(context, 103, "prayers"))
                    setOnClickPendingIntent(R.id.tvWidgetRemaining, createPendingIntent(context, 104, "prayers"))

                    // C. Daily Verse / Dhikr -> Quran View
                    setOnClickPendingIntent(R.id.layoutWidgetAyah, createPendingIntent(context, 105, "quran"))

                    // D. Each Prayer Cell -> Prayers View
                    setOnClickPendingIntent(R.id.cellWidgetFajr, createPendingIntent(context, 106, "prayers"))
                    setOnClickPendingIntent(R.id.cellWidgetDhuhr, createPendingIntent(context, 107, "prayers"))
                    setOnClickPendingIntent(R.id.cellWidgetAsr, createPendingIntent(context, 108, "prayers"))
                    setOnClickPendingIntent(R.id.cellWidgetMaghrib, createPendingIntent(context, 109, "prayers"))
                    setOnClickPendingIntent(R.id.cellWidgetIsha, createPendingIntent(context, 110, "prayers"))

                    // E. Interactive Refresh / Next Verse Button
                    val rotateIntent = Intent(context, AtharPrayerWidgetProvider::class.java).apply {
                        action = ACTION_ROTATE_WIDGET_AYAH
                    }
                    val rotatePendingIntent = PendingIntent.getBroadcast(
                        context,
                        111,
                        rotateIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or (
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
                        )
                    )
                    setOnClickPendingIntent(R.id.btnWidgetRefresh, rotatePendingIntent)
                }
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        fun rotateNextAyah(context: Context) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val currentIndex = prefs.getInt(KEY_AYAH_INDEX, 0)
            val nextIndex = (currentIndex + 1) % PRESET_VERSES.size
            val verse = PRESET_VERSES[nextIndex]

            prefs.edit().apply {
                putInt(KEY_AYAH_INDEX, nextIndex)
                putString(KEY_AYAH_TEXT, verse.first)
                putString(KEY_AYAH_SURAH, verse.second)
                apply()
            }

            refreshAllWidgets(context)
        }

        fun pushPrayerData(
            context: Context,
            nextPrayer: String,
            nextTime: String,
            remaining: String,
            fajr: String,
            dhuhr: String,
            asr: String,
            maghrib: String,
            isha: String,
            hijriDate: String,
            ayahText: String? = null,
            ayahSurah: String? = null,
            widgetStyle: String? = null,
            showDhikr: Boolean? = null,
            showFajr: Boolean? = null,
            showDhuhr: Boolean? = null,
            showAsr: Boolean? = null,
            showMaghrib: Boolean? = null,
            showIsha: Boolean? = null,
            showCountdown: Boolean? = null,
            bgOpacity: String? = null,
            themeAccent: String? = null
        ) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().apply {
                putString(KEY_NEXT_PRAYER, nextPrayer)
                putString(KEY_NEXT_TIME, nextTime)
                putString(KEY_REMAINING, remaining)
                putString(KEY_FAJR, fajr)
                putString(KEY_DHUHR, dhuhr)
                putString(KEY_ASR, asr)
                putString(KEY_MAGHRIB, maghrib)
                putString(KEY_ISHA, isha)
                putString(KEY_HIJRI_DATE, hijriDate)

                if (ayahText != null) putString(KEY_AYAH_TEXT, ayahText)
                if (ayahSurah != null) putString(KEY_AYAH_SURAH, ayahSurah)
                if (widgetStyle != null) putString(KEY_WIDGET_STYLE, widgetStyle)
                if (showDhikr != null) putBoolean(KEY_SHOW_DHIKR, showDhikr)
                if (showFajr != null) putBoolean(KEY_SHOW_FAJR, showFajr)
                if (showDhuhr != null) putBoolean(KEY_SHOW_DHUHR, showDhuhr)
                if (showAsr != null) putBoolean(KEY_SHOW_ASR, showAsr)
                if (showMaghrib != null) putBoolean(KEY_SHOW_MAGHRIB, showMaghrib)
                if (showIsha != null) putBoolean(KEY_SHOW_ISHA, showIsha)
                if (showCountdown != null) putBoolean(KEY_SHOW_COUNTDOWN, showCountdown)
                if (bgOpacity != null) putString(KEY_BG_OPACITY, bgOpacity)
                if (themeAccent != null) putString(KEY_THEME_ACCENT, themeAccent)
                apply()
            }

            refreshAllWidgets(context)
        }

        fun refreshAllWidgets(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, AtharPrayerWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
            if (appWidgetIds.isNotEmpty()) {
                val intent = Intent(context, AtharPrayerWidgetProvider::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds)
                }
                context.sendBroadcast(intent)
            }
        }
    }
}
