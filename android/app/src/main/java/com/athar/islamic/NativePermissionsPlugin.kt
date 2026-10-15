package com.athar.islamic

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "NativePermissions")
class NativePermissionsPlugin : Plugin() {

    companion object {
        const val ONGOING_CHANNEL_ID = "athar_ongoing_prayer_channel"
        const val ONGOING_NOTIFICATION_ID = 88881
    }

    @PluginMethod
    fun openOverlaySettings(call: PluginCall) {
        val targetAppId = call.getString("appId") ?: context.packageName ?: "com.athar.athar"
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:$targetAppId")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            } else {
                val intent = Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:$targetAppId")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            }

            val ret = JSObject()
            ret.put("opened", true)
            ret.put("appId", targetAppId)
            call.resolve(ret)
        } catch (e: Exception) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    val fallbackIntent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(fallbackIntent)
                }
                val ret = JSObject()
                ret.put("opened", true)
                ret.put("fallback", true)
                call.resolve(ret)
            } catch (fallbackError: Exception) {
                call.reject("Failed to open overlay settings: ${fallbackError.localizedMessage}")
            }
        }
    }

    @PluginMethod
    fun checkOverlayPermission(call: PluginCall) {
        val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else {
            true
        }
        val ret = JSObject()
        ret.put("granted", granted)
        call.resolve(ret)
    }

    @PluginMethod
    fun openExactAlarmSettings(call: PluginCall) {
        val targetAppId = call.getString("appId") ?: context.packageName ?: "com.athar.athar"
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val intent = Intent(
                    Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                    Uri.parse("package:$targetAppId")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            } else {
                val intent = Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:$targetAppId")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            }

            val ret = JSObject()
            ret.put("opened", true)
            ret.put("appId", targetAppId)
            call.resolve(ret)
        } catch (e: Exception) {
            try {
                val fallbackIntent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
                } else {
                    Intent(Settings.ACTION_SETTINGS)
                }.apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(fallbackIntent)
                val ret = JSObject()
                ret.put("opened", true)
                ret.put("fallback", true)
                call.resolve(ret)
            } catch (err: Exception) {
                call.reject("Failed to open exact alarm settings: ${err.localizedMessage}")
            }
        }
    }

    @PluginMethod
    fun checkExactAlarmPermission(call: PluginCall) {
        val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            alarmManager?.canScheduleExactAlarms() ?: true
        } else {
            true
        }
        val ret = JSObject()
        ret.put("granted", granted)
        call.resolve(ret)
    }

    @PluginMethod
    fun openNotificationSettings(call: PluginCall) {
        val targetAppId = call.getString("appId") ?: context.packageName ?: "com.athar.athar"
        try {
            val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                    putExtra(Settings.EXTRA_APP_PACKAGE, targetAppId)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            } else {
                Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:$targetAppId")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            }
            val ctx = activity ?: context
            ctx.startActivity(intent)

            val ret = JSObject()
            ret.put("opened", true)
            ret.put("appId", targetAppId)
            call.resolve(ret)
        } catch (e: Exception) {
            try {
                val fallbackIntent = Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:$targetAppId")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                val ctx = activity ?: context
                ctx.startActivity(fallbackIntent)
                val ret = JSObject()
                ret.put("opened", true)
                ret.put("fallback", true)
                call.resolve(ret)
            } catch (err: Exception) {
                call.reject("Failed to open notification settings: ${err.localizedMessage}")
            }
        }
    }

    @PluginMethod
    fun checkNotificationPermission(call: PluginCall) {
        val granted = androidx.core.app.NotificationManagerCompat.from(context).areNotificationsEnabled()
        val ret = JSObject()
        ret.put("granted", granted)
        call.resolve(ret)
    }

    @PluginMethod
    fun openBatteryOptimizationSettings(call: PluginCall) {
        val targetAppId = call.getString("appId") ?: context.packageName ?: "com.athar.athar"
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(
                    Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                    Uri.parse("package:$targetAppId")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            } else {
                val intent = Intent(Settings.ACTION_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            }

            val ret = JSObject()
            ret.put("opened", true)
            call.resolve(ret)
        } catch (e: Exception) {
            try {
                val fallbackIntent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(fallbackIntent)
                val ret = JSObject()
                ret.put("opened", true)
                ret.put("fallback", true)
                call.resolve(ret)
            } catch (err: Exception) {
                call.reject("Failed to open battery settings: ${err.localizedMessage}")
            }
        }
    }

    @PluginMethod
    fun checkBatteryOptimization(call: PluginCall) {
        val targetAppId = call.getString("appId") ?: context.packageName ?: "com.athar.athar"
        val isIgnored = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            powerManager?.isIgnoringBatteryOptimizations(targetAppId) ?: false
        } else {
            true
        }
        val ret = JSObject()
        ret.put("isIgnored", isIgnored)
        ret.put("granted", isIgnored)
        call.resolve(ret)
    }

    @PluginMethod
    fun openAppSettings(call: PluginCall) {
        val targetAppId = call.getString("appId") ?: context.packageName ?: "com.athar.athar"
        try {
            val intent = Intent(
                Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:$targetAppId")
            ).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)

            val ret = JSObject()
            ret.put("opened", true)
            ret.put("appId", targetAppId)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to open app settings: ${e.localizedMessage}")
        }
    }

    /**
     * Start Background Foreground Service to prevent OS killing prayer times & azkar
     */
    @PluginMethod
    fun startBackgroundService(call: PluginCall) {
        try {
            AthanForegroundService.startBackgroundService(context)
            val ret = JSObject()
            ret.put("running", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to start background foreground service: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun stopBackgroundService(call: PluginCall) {
        try {
            AthanForegroundService.stopBackgroundService(context)
            val ret = JSObject()
            ret.put("running", false)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to stop background foreground service: ${e.localizedMessage}")
        }
    }

    /**
     * Triggers the full-screen Athan view forcefully over any running app or on the Lock Screen
     * using USE_FULL_SCREEN_INTENT and AthanForegroundService.
     */
    @PluginMethod
    fun triggerFullScreenAthan(call: PluginCall) {
        val prayerName = call.getString("prayerName") ?: "صلاة الفجر"
        val prayerTime = call.getString("prayerTime") ?: "05:15"

        try {
            AthanForegroundService.startAthan(context, prayerName, prayerTime)
            val ret = JSObject()
            ret.put("success", true)
            ret.put("prayerName", prayerName)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to trigger full screen athan: ${e.localizedMessage}")
        }
    }

    /**
     * Creates and displays a Royal Floating System Overlay Window using SYSTEM_ALERT_WINDOW
     */
    @PluginMethod
    fun showSystemOverlayNotification(call: PluginCall) {
        val title = call.getString("title") ?: "تنبيه أثر الملكي"
        val body = call.getString("body") ?: ""
        val prayerName = call.getString("prayerName") ?: title
        val prayerTime = call.getString("prayerTime") ?: ""
        val badge = call.getString("badge") ?: "🕌 تنبيه أثر الملكي"
        val category = call.getString("category") ?: "quran"
        val audioUrl = call.getString("audioUrl") ?: ""
        val playSound = call.getBoolean("playSound") ?: true

        try {
            AthanForegroundService.startAthan(context, prayerName, prayerTime, title, body, badge, category, audioUrl, playSound)
            val ret = JSObject()
            ret.put("shown", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to show system overlay: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun stopFullScreenAthan(call: PluginCall) {
        try {
            AthanForegroundService.stopAthan(context)
            val ret = JSObject()
            ret.put("success", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to stop full screen athan: ${e.localizedMessage}")
        }
    }

    /**
     * Updates the Android Home Screen & Lock Screen App Widget with live prayer times
     */
    @PluginMethod
    fun updatePrayerWidget(call: PluginCall) {
        try {
            val nextPrayer = call.getString("nextPrayer") ?: "صلاة الفجر"
            val nextTime = call.getString("nextTime") ?: "05:15"
            val remaining = call.getString("remaining") ?: "متبقي ساعتان"
            val fajr = call.getString("fajr") ?: "05:15"
            val dhuhr = call.getString("dhuhr") ?: "12:00"
            val asr = call.getString("asr") ?: "15:15"
            val maghrib = call.getString("maghrib") ?: "17:50"
            val isha = call.getString("isha") ?: "19:20"
            val hijriDate = call.getString("hijriDate") ?: "أثر | مواقيت الصلاة"

            val ayahText = call.getString("ayahText")
            val ayahSurah = call.getString("ayahSurah")
            val widgetStyle = call.getString("widgetStyle")
            val showDhikr = call.getBoolean("showDhikr")
            val showFajr = call.getBoolean("showFajr")
            val showDhuhr = call.getBoolean("showDhuhr")
            val showAsr = call.getBoolean("showAsr")
            val showMaghrib = call.getBoolean("showMaghrib")
            val showIsha = call.getBoolean("showIsha")
            val showCountdown = call.getBoolean("showCountdown")

            AtharPrayerWidgetProvider.pushPrayerData(
                context = context,
                nextPrayer = nextPrayer,
                nextTime = nextTime,
                remaining = remaining,
                fajr = fajr,
                dhuhr = dhuhr,
                asr = asr,
                maghrib = maghrib,
                isha = isha,
                hijriDate = hijriDate,
                ayahText = ayahText,
                ayahSurah = ayahSurah,
                widgetStyle = widgetStyle,
                showDhikr = showDhikr,
                showFajr = showFajr,
                showDhuhr = showDhuhr,
                showAsr = showAsr,
                showMaghrib = showMaghrib,
                showIsha = showIsha,
                showCountdown = showCountdown
            )

            val ret = JSObject()
            ret.put("updated", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to update prayer widget: ${e.localizedMessage}")
        }
    }

    /**
     * Updates the Android Daily Azkar App Widget
     */
    @PluginMethod
    fun updateAzkarWidget(call: PluginCall) {
        try {
            val category = call.getString("category") ?: "أثر | أذكار اليوم والاستغفار"
            val text = call.getString("text") ?: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ"
            val fadl = call.getString("fadl") ?: "كلمتان خفيفتان على اللسان ثقيلتان في الميزان"
            val repeat = call.getString("repeat") ?: "33 مرة"

            AtharAzkarWidgetProvider.pushAzkarData(context, category, text, fadl, repeat)

            val ret = JSObject()
            ret.put("updated", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to update azkar widget: ${e.localizedMessage}")
        }
    }

    /**
     * Enqueues periodic WorkManager sync for persistent widget updates and prayer timers
     */
    @PluginMethod
    fun scheduleBackgroundSync(call: PluginCall) {
        try {
            AtharBackgroundSyncWorker.enqueuePeriodicSync(context)
            val ret = JSObject()
            ret.put("scheduled", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to schedule background sync: ${e.localizedMessage}")
        }
    }

    /**
     * Pinned Ongoing Notification Bar Entry in the Android status bar/notification drawer
     */
    @PluginMethod
    fun setOngoingPrayerNotification(call: PluginCall) {
        try {
            val title = call.getString("title") ?: "🕌 الصلاة القادمة: صلاة الفجر"
            val body = call.getString("body") ?: "الفجر 05:15 · الظهر 12:00 · العصر 15:15 · المغرب 17:50 · العشاء 19:20"

            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    ONGOING_CHANNEL_ID,
                    "شريط مواقيت الصلاة الدائم (أثر)",
                    NotificationManager.IMPORTANCE_LOW
                ).apply {
                    description = "شريط الإشعارات المستمر لعرض مواقيت الصلوات الخمس والوقت المتبقي"
                    setShowBadge(false)
                }
                notificationManager.createNotificationChannel(channel)
            }

            val openAppIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            val openAppPendingIntent = PendingIntent.getActivity(
                context,
                3001,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            )

            val appLogoBitmap = try {
                BitmapFactory.decodeResource(context.resources, R.drawable.icon_logo)
            } catch (e: Exception) {
                null
            }

            val notification = NotificationCompat.Builder(context, ONGOING_CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_athar)
                .apply {
                    if (appLogoBitmap != null) setLargeIcon(appLogoBitmap)
                }
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true)
                .setAutoCancel(false)
                .setContentIntent(openAppPendingIntent)
                .setColor(Color.parseColor("#E6C66E"))
                .build()

            notificationManager.notify(ONGOING_NOTIFICATION_ID, notification)

            val ret = JSObject()
            ret.put("success", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to set ongoing prayer notification: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun removeOngoingPrayerNotification(call: PluginCall) {
        try {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(ONGOING_NOTIFICATION_ID)
            val ret = JSObject()
            ret.put("success", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to remove ongoing notification: ${e.localizedMessage}")
        }
    }

    /**
     * Directly displays a custom Royal System Notification in the Android notification shade and heads-up banner
     * utilizing custom RemoteViews layouts (collapsed + expanded) with dark glass card, golden borders, and royal logo.
     */
    @PluginMethod
    fun showRoyalNotification(call: PluginCall) {
        val title = call.getString("title") ?: "أثر | تنبيه ملكي"
        val body = call.getString("body") ?: ""
        val badge = call.getString("badge") ?: "🕌 تنبيه أثر الملكي"
        val channelId = call.getString("channelId") ?: AthanForegroundService.FULLSCREEN_CHANNEL_ID
        val category = call.getString("category") ?: "quran"
        val audioUrl = call.getString("audioUrl") ?: ""
        val notifId = call.getInt("id") ?: ((System.currentTimeMillis() % 100000).toInt() + 1000)

        try {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val openAppIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("action", "OPEN_ATHAN_FULLSCREEN")
                putExtra("alert_title", title)
                putExtra("alert_body", body)
                putExtra("category_badge", badge)
                putExtra("category", category)
                putExtra("audio_url", audioUrl)
            }
            val openAppPendingIntent = PendingIntent.getActivity(
                context,
                notifId + 10,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            )

            val fullScreenIntent = Intent(context, AthanFullScreenActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("alert_title", title)
                putExtra("alert_body", body)
                putExtra("category_badge", badge)
                putExtra("category", category)
                putExtra("audio_url", audioUrl)
            }
            val fullScreenPendingIntent = PendingIntent.getActivity(
                context,
                notifId + 20,
                fullScreenIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            )

            // 1. Royal RemoteViews for Collapsed System Notification Tray
            val collapsedView = RemoteViews(context.packageName, R.layout.notification_royal_collapsed).apply {
                setTextViewText(R.id.tvNotifTitle, title)
                setTextViewText(R.id.tvNotifBody, body.replace("\n", " · "))
                setTextViewText(R.id.tvNotifBadge, badge)
            }

            // 2. Royal RemoteViews for Expanded & Heads-Up Notification Tray
            val expandedView = RemoteViews(context.packageName, R.layout.notification_royal_expanded).apply {
                setTextViewText(R.id.tvNotifTitle, title)
                setTextViewText(R.id.tvNotifBody, body)
                setTextViewText(R.id.tvNotifBadge, badge)
                setOnClickPendingIntent(R.id.btnNotifAudio, openAppPendingIntent)
                setOnClickPendingIntent(R.id.btnNotifClose, openAppPendingIntent)
                setOnClickPendingIntent(R.id.btnNotifOpen, openAppPendingIntent)
            }

            val appLogoBitmap = try {
                BitmapFactory.decodeResource(context.resources, R.drawable.icon_logo)
            } catch (e: Exception) {
                null
            }

            val notification = NotificationCompat.Builder(context, channelId)
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
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .setContentIntent(openAppPendingIntent)
                .setAutoCancel(true)
                .setColor(Color.parseColor("#E6C66E"))
                .build()

            notificationManager.notify(notifId, notification)

            val ret = JSObject()
            ret.put("success", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to show royal notification: ${e.localizedMessage}")
        }
    }
}
