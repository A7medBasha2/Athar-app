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
            val bgOpacity = call.getString("bgOpacity")
            val themeAccent = call.getString("themeAccent")

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
                showCountdown = showCountdown,
                bgOpacity = bgOpacity,
                themeAccent = themeAccent
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
     * Powered by dedicated OngoingPrayerNotificationService Foreground Service
     */
    @PluginMethod
    fun setOngoingPrayerNotification(call: PluginCall) {
        try {
            val title = call.getString("title") ?: "🕌 الصلاة القادمة: صلاة الفجر"
            val nextPrayer = call.getString("nextPrayer")
            val nextTime = call.getString("nextTime")
            val remaining = call.getString("remaining")
            val fajr = call.getString("fajr")
            val dhuhr = call.getString("dhuhr")
            val asr = call.getString("asr")
            val maghrib = call.getString("maghrib")
            val isha = call.getString("isha")
            val hijri = call.getString("hijriDate")

            OngoingPrayerNotificationService.startService(
                context = context,
                title = title,
                nextPrayer = nextPrayer,
                nextTime = nextTime,
                remaining = remaining,
                fajr = fajr,
                dhuhr = dhuhr,
                asr = asr,
                maghrib = maghrib,
                isha = isha,
                hijri = hijri
            )

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
            OngoingPrayerNotificationService.stopService(context)
            val ret = JSObject()
            ret.put("success", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to remove ongoing notification: ${e.localizedMessage}")
        }
    }

    /**
     * Displays a unified Royal Glass Notification using AtharNotificationManager across all 14 categories
     */
    @PluginMethod
    fun showRoyalNotification(call: PluginCall) {
        val title = call.getString("title") ?: "أثر | تنبيه ملكي"
        val body = call.getString("body") ?: ""
        val category = call.getString("category") ?: AtharNotificationManager.CAT_QURAN_AYAH
        val badge = call.getString("badge")
        val audioUrl = call.getString("audioUrl")
        val playSound = call.getBoolean("playSound") ?: (!audioUrl.isNullOrBlank())
        val isOngoing = call.getBoolean("isOngoing") ?: false
        val customId = call.getInt("id")

        try {
            AtharNotificationManager.showRoyalNotification(
                context = context,
                category = category,
                title = title,
                body = body,
                badge = badge,
                audioUrl = audioUrl,
                playSound = playSound,
                isOngoing = isOngoing,
                customNotificationId = customId
            )
            val ret = JSObject()
            ret.put("success", true)
            ret.put("category", category)
            ret.put("notificationId", customId ?: AtharNotificationManager.getNotificationId(category))
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to show royal notification: ${e.localizedMessage}")
        }
    }

    /**
     * Mutes any currently playing notification audio in the background without resetting position
     */
    @PluginMethod
    fun muteNotificationAudio(call: PluginCall) {
        try {
            AtharNotificationManager.muteCurrentAudio(context)
            val ret = JSObject()
            ret.put("muted", true)
            ret.put("positionMs", AtharNotificationManager.getCurrentPositionMs())
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to mute audio: ${e.localizedMessage}")
        }
    }

    /**
     * Unmutes notification audio in the background, continuing from the exact current timeline point
     */
    @PluginMethod
    fun unmuteNotificationAudio(call: PluginCall) {
        try {
            AtharNotificationManager.unmuteCurrentAudio(context)
            val ret = JSObject()
            ret.put("unmuted", true)
            ret.put("positionMs", AtharNotificationManager.getCurrentPositionMs())
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to unmute audio: ${e.localizedMessage}")
        }
    }

    /**
     * Toggles audio mute state
     */
    @PluginMethod
    fun toggleNotificationAudio(call: PluginCall) {
        try {
            AtharNotificationManager.toggleAudio(context)
            val ret = JSObject()
            ret.put("toggled", true)
            ret.put("isMuted", AtharNotificationManager.isMuted())
            ret.put("positionMs", AtharNotificationManager.getCurrentPositionMs())
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to toggle audio: ${e.localizedMessage}")
        }
    }

    /**
     * Pauses notification audio
     */
    @PluginMethod
    fun pauseNotificationAudio(call: PluginCall) {
        try {
            AtharNotificationManager.pauseAudio(context)
            val ret = JSObject()
            ret.put("paused", true)
            ret.put("positionMs", AtharNotificationManager.getCurrentPositionMs())
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to pause audio: ${e.localizedMessage}")
        }
    }

    /**
     * Resumes notification audio
     */
    @PluginMethod
    fun resumeNotificationAudio(call: PluginCall) {
        try {
            AtharNotificationManager.resumeAudio(context)
            val ret = JSObject()
            ret.put("resumed", true)
            ret.put("positionMs", AtharNotificationManager.getCurrentPositionMs())
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to resume audio: ${e.localizedMessage}")
        }
    }

    /**
     * Retrieves current real-time timeline position and duration
     */
    @PluginMethod
    fun getNotificationAudioTimeline(call: PluginCall) {
        try {
            val ret = JSObject()
            ret.put("isPlaying", AtharNotificationManager.isPlaying())
            ret.put("isMuted", AtharNotificationManager.isMuted())
            ret.put("positionMs", AtharNotificationManager.getCurrentPositionMs())
            ret.put("durationMs", AtharNotificationManager.getDurationMs())
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to get audio timeline: ${e.localizedMessage}")
        }
    }

    /**
     * Dismisses a notification by category
     */
    @PluginMethod
    fun dismissNotification(call: PluginCall) {
        val category = call.getString("category") ?: AtharNotificationManager.CAT_QURAN_AYAH
        val customId = call.getInt("id")
        try {
            if (customId != null && customId > 0) {
                AtharNotificationManager.dismissNotificationById(context, customId)
            } else {
                AtharNotificationManager.dismissNotification(context, category)
            }
            val ret = JSObject()
            ret.put("dismissed", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to dismiss notification: ${e.localizedMessage}")
        }
    }
}
