package com.athar.islamic

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.widget.RemoteViews

class AtharAzkarWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_NEXT_ZIKR) {
            rotateNextZikr(context)
        }
    }

    companion object {
        const val PREFS_NAME = "AtharAzkarWidgetPrefs"
        const val KEY_CATEGORY = "azkar_category"
        const val KEY_TEXT = "azkar_text"
        const val KEY_FADL = "azkar_fadl"
        const val KEY_REPEAT = "azkar_repeat"
        const val KEY_INDEX = "azkar_index"

        const val ACTION_NEXT_ZIKR = "com.athar.islamic.ACTION_NEXT_ZIKR"

        private val DEFAULT_AZKAR = listOf(
            Triple(
                "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ",
                "كلمتان خفيفتان على اللسان ثقيلتان في الميزان حبيبتان إلى الرحمن",
                "33 مرة"
            ),
            Triple(
                "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لا إِلَهَ إِلا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ",
                "من قالها غُفرت ذنوبه وإن كان فر من الزحف",
                "100 مرة"
            ),
            Triple(
                "لا إِلَهَ إِلا اللَّهُ وَحْدَهُ لا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
                "كانت له عدل عشر رقاب وكُتبت له مائة حسنة ومُحيت عنه مائة سيئة",
                "10 مرات"
            ),
            Triple(
                "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ",
                "من صلى عليّ صلاة صلى الله عليه بها عشراً",
                "10 مرات"
            ),
            Triple(
                "لا حَوْلَ وَلا قُوَّةَ إِلا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ",
                "كنز من كنوز الجنة وباب من أبوابها",
                "دائماً"
            ),
            Triple(
                "سُبْحَانَ اللَّهِ ، وَالْحَمْدُ لِلَّهِ ، وَلا إِلَهَ إِلا اللَّهُ ، وَاللَّهُ أَكْبَرُ",
                "أحب الكلام إلى الله وأحب مما طلعت عليه الشمس",
                "33 مرة"
            )
        )

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val category = prefs.getString(KEY_CATEGORY, "أثر | أذكار اليوم والاستغفار") ?: "أثر | أذكار اليوم والاستغفار"
            val text = prefs.getString(KEY_TEXT, DEFAULT_AZKAR[0].first) ?: DEFAULT_AZKAR[0].first
            val fadl = prefs.getString(KEY_FADL, DEFAULT_AZKAR[0].second) ?: DEFAULT_AZKAR[0].second
            val repeat = prefs.getString(KEY_REPEAT, DEFAULT_AZKAR[0].third) ?: DEFAULT_AZKAR[0].third

            val views = RemoteViews(context.packageName, R.layout.widget_daily_azkar).apply {
                setTextViewText(R.id.tvWidgetAzkarCategory, category)
                setTextViewText(R.id.tvWidgetAzkarText, text)
                setTextViewText(R.id.tvWidgetAzkarFadl, fadl)
                setTextViewText(R.id.tvWidgetAzkarRepeat, "التكرار: $repeat")

                // Open App on Click
                val appIntent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    putExtra("action", "OPEN_AZKAR")
                }
                val appPendingIntent = PendingIntent.getActivity(
                    context,
                    2002,
                    appIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
                )
                setOnClickPendingIntent(R.id.widgetAzkarRootLayout, appPendingIntent)

                // Next Zikr Button Click
                val nextIntent = Intent(context, AtharAzkarWidgetProvider::class.java).apply {
                    action = ACTION_NEXT_ZIKR
                }
                val nextPendingIntent = PendingIntent.getBroadcast(
                    context,
                    2003,
                    nextIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
                )
                setOnClickPendingIntent(R.id.btnWidgetNextAzkar, nextPendingIntent)
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        fun rotateNextZikr(context: Context) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val currentIndex = prefs.getInt(KEY_INDEX, 0)
            val nextIndex = (currentIndex + 1) % DEFAULT_AZKAR.size
            val zikr = DEFAULT_AZKAR[nextIndex]

            prefs.edit().apply {
                putInt(KEY_INDEX, nextIndex)
                putString(KEY_TEXT, zikr.first)
                putString(KEY_FADL, zikr.second)
                putString(KEY_REPEAT, zikr.third)
                apply()
            }

            refreshAllWidgets(context)
        }

        fun pushAzkarData(
            context: Context,
            category: String,
            text: String,
            fadl: String,
            repeat: String
        ) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().apply {
                putString(KEY_CATEGORY, category)
                putString(KEY_TEXT, text)
                putString(KEY_FADL, fadl)
                putString(KEY_REPEAT, repeat)
                apply()
            }

            refreshAllWidgets(context)
        }

        fun refreshAllWidgets(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, AtharAzkarWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
            if (appWidgetIds.isNotEmpty()) {
                val intent = Intent(context, AtharAzkarWidgetProvider::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds)
                }
                context.sendBroadcast(intent)
            }
        }
    }
}
