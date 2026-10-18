package com.athar.islamic

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ComponentName
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
        const val ONGOING_CHANNEL_ID = "athar_ongoing_prayer_channel_v2"
        const val ONGOING_NOTIFICATION_ID = 88881
    }

    @PluginMethod
    fun openOverlaySettings(call: PluginCall) {
        var targetAppId = call.getString("appId") ?: context.packageName ?: "com.athar.athar"
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                var intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:$targetAppId")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            } else {
                var intent = Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:$targetAppId")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            }
            var ret = JSObject()
            ret.put("opened", true)
            ret.put("appId", targetAppId)
            call.resolve(ret)
        } catch (e: Exception) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    var fallbackIntent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(fallbackIntent)
                    var ret = JSObject()
                    ret.put("opened", true)
                    ret.put("fallback", true)
                    call.resolve(ret)
                } else {
                    call.reject("Overlay permission not supported on this device version")
                }
            } catch (err: Exception) {
                call.reject("Failed to open overlay settings: ${err.localizedMessage}")
            }
        }
    }

    @PluginMethod
    fun checkOverlayPermission(call: PluginCall) {
        var granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else {
            true
        }
        var ret = JSObject()
        ret.put("granted", granted)
        call.resolve(ret)
    }

    @PluginMethod
    fun openExactAlarmSettings(call: PluginCall) {
        var targetAppId = call.getString("appId") ?: context.packageName ?: "com.athar.athar"
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                var intent = Intent(
                    Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                    Uri.parse("package:$targetAppId")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            } else {
                var intent = Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:$targetAppId")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            }
            var ret = JSObject()
            ret.put("opened", true)
            ret.put("appId", targetAppId)
            call.resolve(ret)
        } catch (e: Exception) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    var fallbackIntent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(fallbackIntent)
                    var ret = JSObject()
                    ret.put("opened", true)
                    ret.put("fallback", true)
                    call.resolve(ret)
                } else {
                    call.reject("Exact alarms permission not supported")
                }
            } catch (err: Exception) {
                call.reject("Failed to open alarm settings: ${err.localizedMessage}")
            }
        }
    }

    @PluginMethod
    fun checkExactAlarmPermission(call: PluginCall) {
        var granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            var alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            alarmManager?.canScheduleExactAlarms() ?: true
        } else {
            true
        }
        var ret = JSObject()
        ret.put("granted", granted)
        call.resolve(ret)
    }

    @PluginMethod
    fun openNotificationSettings(call: PluginCall) {
        var targetAppId = call.getString("appId") ?: context.packageName ?: "com.athar.athar"
        try {
            var intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
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
            var ctx = activity ?: context
            ctx.startActivity(intent)
            var ret = JSObject()
            ret.put("opened", true)
            ret.put("appId", targetAppId)
            call.resolve(ret)
        } catch (e: Exception) {
            try {
                var fallbackIntent = Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:$targetAppId")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                var ctx = activity ?: context
                ctx.startActivity(fallbackIntent)
                var ret = JSObject()
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
        var granted = androidx.core.app.NotificationManagerCompat.from(context).areNotificationsEnabled()
        var ret = JSObject()
        ret.put("granted", granted)
        call.resolve(ret)
    }

    @PluginMethod
    fun openBatteryOptimizationSettings(call: PluginCall) {
        var targetAppId = call.getString("appId") ?: context.packageName ?: "com.athar.athar"
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                var intent = Intent(
                    Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                    Uri.parse("package:$targetAppId")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            } else {
                var intent = Intent(Settings.ACTION_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            }
            var ret = JSObject()
            ret.put("opened", true)
            call.resolve(ret)
        } catch (e: Exception) {
            try {
                var fallbackIntent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(fallbackIntent)
                var ret = JSObject()
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
        var targetAppId = call.getString("appId") ?: context.packageName ?: "com.athar.athar"
        var isIgnored = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            var powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            powerManager?.isIgnoringBatteryOptimizations(targetAppId) ?: false
        } else {
            true
        }
        var ret = JSObject()
        ret.put("isIgnored", isIgnored)
        ret.put("granted", isIgnored)
        call.resolve(ret)
    }

    @PluginMethod
    fun openAppSettings(call: PluginCall) {
        var targetAppId = call.getString("appId") ?: context.packageName ?: "com.athar.islamic"
        try {
            var intent = Intent(
                Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:$targetAppId")
            ).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            var ret = JSObject()
            ret.put("opened", true)
            ret.put("appId", targetAppId)
            call.resolve(ret)
        } catch (e: Exception) {
            try {
                var generalSettings = Intent(Settings.ACTION_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(generalSettings)
                var ret = JSObject()
                ret.put("opened", true)
                ret.put("appId", targetAppId)
                call.resolve(ret)
            } catch (err: Exception) {
                call.reject("Failed to open app settings: ${e.localizedMessage}")
            }
        }
    }

    @PluginMethod
    fun openAutoStartSettings(call: PluginCall) {
        val targetAppId = call.getString("appId") ?: context.packageName ?: "com.athar.islamic"
        var opened = false
        var isXiaomiAutostart = false

        val xiaomiIntents = listOf(
            Intent().apply {
                component = ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            },
            Intent("miui.intent.action.OP_AUTO_START").apply {
                addCategory(Intent.CATEGORY_DEFAULT)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            },
            Intent().apply {
                component = ComponentName("com.miui.securitycenter", "com.miui.powercenter.PowerSettings")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
        )

        for (intent in xiaomiIntents) {
            try {
                context.startActivity(intent)
                opened = true
                isXiaomiAutostart = true
                break
            } catch (e: Exception) {
            }
        }

        if (!opened) {
            try {
                val appDetailsIntent = Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:$targetAppId")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(appDetailsIntent)
                opened = true
            } catch (e: Exception) {
                try {
                    val settingsIntent = Intent(Settings.ACTION_SETTINGS).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(settingsIntent)
                    opened = true
                } catch (e2: Exception) {
                    call.reject("Failed to open autostart or app settings: ${e2.localizedMessage}")
                    return
                }
            }
        }

        val ret = JSObject()
        ret.put("opened", opened)
        ret.put("isXiaomiAutostart", isXiaomiAutostart)
        ret.put("appId", targetAppId)
        call.resolve(ret)
    }

    @PluginMethod
    fun openOtherPermissionsSettings(call: PluginCall) {
        val targetAppId = call.getString("appId") ?: context.packageName ?: "com.athar.athar"
        var opened = false

        val candidateIntents = listOf(
            Intent("miui.intent.action.APP_PERM_EDITOR").apply {
                putExtra("extra_pkgname", targetAppId)
                putExtra("package_name", targetAppId)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            },
            Intent().apply {
                setClassName("com.miui.securitycenter", "com.miui.permcenter.permissions.PermissionsEditorActivity")
                putExtra("extra_pkgname", targetAppId)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            },
            Intent().apply {
                setClassName("com.miui.securitycenter", "com.miui.permcenter.permissions.AppPermissionsEditorActivity")
                putExtra("extra_pkgname", targetAppId)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            },
            Intent().apply {
                component = ComponentName("com.iqoo.secure", "com.iqoo.secure.safeguard.PurviewTabActivity")
                putExtra("packagename", targetAppId)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            },
            Intent().apply {
                component = ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.PermissionManagerActivity")
                putExtra("package_name", targetAppId)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            },
            Intent().apply {
                component = ComponentName("com.huawei.systemmanager", "com.huawei.permissionmanager.ui.MainActivity")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
        )

        for (intent in candidateIntents) {
            try {
                context.startActivity(intent)
                opened = true
                break
            } catch (e: Exception) {}
        }

        if (!opened) {
            try {
                val appDetailsIntent = Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:$targetAppId")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(appDetailsIntent)
                opened = true
            } catch (e: Exception) {
                try {
                    val settingsIntent = Intent(Settings.ACTION_SETTINGS).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(settingsIntent)
                    opened = true
                } catch (e2: Exception) {
                    call.reject("Failed to open permissions settings: ${e2.localizedMessage}")
                    return
                }
            }
        }

        val ret = JSObject()
        ret.put("opened", opened)
        ret.put("appId", targetAppId)
        call.resolve(ret)
    }

    @PluginMethod
    fun startBackgroundService(call: PluginCall) {
        try {
            val prayer = call.getString("nextPrayer") ?: "صلاة الفجر"
            val targetEpoch = (call.getDouble("targetEpochMs") ?: call.getLong("targetEpochMs")?.toDouble() ?: 0.0).toLong()
            val timeStr = call.getString("timeStr") ?: ""
            AthanForegroundService.startBackgroundService(context, prayer, targetEpoch, timeStr)
            var ret = JSObject()
            ret.put("running", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to start background foreground service: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun updateAthanCountdown(call: PluginCall) {
        try {
            val prayer = call.getString("nextPrayer") ?: "صلاة الفجر"
            val targetEpoch = (call.getDouble("targetEpochMs") ?: call.getLong("targetEpochMs")?.toDouble() ?: 0.0).toLong()
            val timeStr = call.getString("timeStr") ?: ""
            AthanForegroundService.updateCountdown(context, prayer, targetEpoch, timeStr)
            var ret = JSObject()
            ret.put("updated", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to update athan countdown: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun isBackgroundServiceRunning(call: PluginCall) {
        try {
            var ret = JSObject()
            ret.put("running", AthanForegroundService.isBackgroundServiceRunning)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to get background service state: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun stopBackgroundService(call: PluginCall) {
        try {
            AthanForegroundService.stopBackgroundService(context)
            var ret = JSObject()
            ret.put("running", false)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to stop background foreground service: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun triggerFullScreenAthan(call: PluginCall) {
        var prayerName = call.getString("prayerName") ?: "صلاة الفجر"
        var prayerTime = call.getString("prayerTime") ?: "05:15"
        try {
            AthanForegroundService.startAthan(context, prayerName, prayerTime)
            var ret = JSObject()
            ret.put("success", true)
            ret.put("prayerName", prayerName)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to trigger full screen athan: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun triggerSingleTestNotification(call: PluginCall) {
        var isAdhan = call.getBoolean("isAdhan") ?: false
        var delaySeconds = call.getInt("delaySeconds") ?: 0
        try {
            AtharNotificationManager.triggerSingleTestNotification(context, isAdhan, delaySeconds)
            var ret = JSObject()
            ret.put("success", true)
            ret.put("isAdhan", isAdhan)
            ret.put("delaySeconds", delaySeconds)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to trigger test notification: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun setNotificationConfig(call: PluginCall) {
        try {
            call.getString("notificationMode")?.let {
                AtharNotificationManager.setNotificationMode(context, it)
            }
            call.getBoolean("fullscreenAdhan")?.let {
                AtharNotificationManager.setFullScreenAdhanEnabled(context, it)
            }
            call.getBoolean("systemOverlay")?.let {
                AtharNotificationManager.setSystemOverlayEnabled(context, it)
            }
            call.getString("muazzinRegular")?.let {
                AtharNotificationManager.setMuazzinRegular(context, it)
            }
            call.getString("muazzinFajr")?.let {
                AtharNotificationManager.setMuazzinFajr(context, it)
            }
            call.getBoolean("catQuran")?.let {
                AtharNotificationManager.setCategoryEnabled(context, AtharNotificationManager.CAT_QURAN_AYAH, it)
            }
            call.getBoolean("catAzkar")?.let {
                AtharNotificationManager.setCategoryEnabled(context, AtharNotificationManager.CAT_DHIKR_TASBEEH, it)
            }
            call.getBoolean("catReminders")?.let {
                AtharNotificationManager.setCategoryEnabled(context, AtharNotificationManager.CAT_SALAWAT, it)
            }
            call.getBoolean("catParents")?.let {
                AtharNotificationManager.setCategoryEnabled(context, AtharNotificationManager.CAT_PARENTS_DUTY, it)
            }
            call.getBoolean("catWird")?.let {
                AtharNotificationManager.setCategoryEnabled(context, AtharNotificationManager.CAT_QURAN_WIRD, it)
            }
            call.getString("toneQuran")?.let {
                AtharNotificationManager.setCategoryTone(context, AtharNotificationManager.CAT_QURAN_AYAH, it)
            }
            call.getString("toneAzkar")?.let {
                AtharNotificationManager.setCategoryTone(context, AtharNotificationManager.CAT_DHIKR_TASBEEH, it)
            }
            call.getString("toneSalawat")?.let {
                AtharNotificationManager.setCategoryTone(context, AtharNotificationManager.CAT_SALAWAT, it)
            }
            call.getString("toneParents")?.let {
                AtharNotificationManager.setCategoryTone(context, AtharNotificationManager.CAT_PARENTS_DUTY, it)
            }
            call.getString("toneWird")?.let {
                AtharNotificationManager.setCategoryTone(context, AtharNotificationManager.CAT_QURAN_WIRD, it)
            }
            call.getInt("repeatIntervalMins")?.let {
                AtharNotificationManager.setRepeatIntervalMins(context, it)
            }
            call.getInt("intervalQuranMins")?.let {
                AtharNotificationManager.setCategoryRepeatIntervalMins(context, AtharNotificationManager.CAT_QURAN_AYAH, it)
            }
            call.getInt("intervalAzkarMins")?.let {
                AtharNotificationManager.setCategoryRepeatIntervalMins(context, AtharNotificationManager.CAT_DHIKR_TASBEEH, it)
            }
            call.getInt("intervalSalawatMins")?.let {
                AtharNotificationManager.setCategoryRepeatIntervalMins(context, AtharNotificationManager.CAT_SALAWAT, it)
            }
            call.getInt("intervalParentsMins")?.let {
                AtharNotificationManager.setCategoryRepeatIntervalMins(context, AtharNotificationManager.CAT_PARENTS_DUTY, it)
            }
            call.getInt("intervalWirdMins")?.let {
                AtharNotificationManager.setCategoryRepeatIntervalMins(context, AtharNotificationManager.CAT_QURAN_WIRD, it)
            }
            call.getFloat("masterVolume")?.let {
                AtharNotificationManager.setMasterVolume(context, it)
            }
            call.getBoolean("masterMuted")?.let {
                AtharNotificationManager.setMasterMuted(context, it)
            }
            call.getBoolean("dndBypass")?.let {
                AtharNotificationManager.setDndBypassEnabled(context, it)
            }
            call.getString("vibrationPattern")?.let {
                AtharNotificationManager.setVibrationPattern(context, it)
            }

            var ret = JSObject()
            ret.put("saved", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to save notification config: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun getNotificationConfig(call: PluginCall) {
        try {
            var ret = JSObject()
            ret.put("notificationMode", AtharNotificationManager.getNotificationMode(context))
            ret.put("fullscreenAdhan", AtharNotificationManager.isFullScreenAdhanEnabled(context))
            ret.put("systemOverlay", AtharNotificationManager.isSystemOverlayEnabled(context))
            ret.put("muazzinRegular", AtharNotificationManager.getMuazzinRegular(context))
            ret.put("muazzinFajr", AtharNotificationManager.getMuazzinFajr(context))
            ret.put("catQuran", AtharNotificationManager.isCategoryEnabled(context, AtharNotificationManager.CAT_QURAN_AYAH))
            ret.put("catAzkar", AtharNotificationManager.isCategoryEnabled(context, AtharNotificationManager.CAT_DHIKR_TASBEEH))
            ret.put("catReminders", AtharNotificationManager.isCategoryEnabled(context, AtharNotificationManager.CAT_SALAWAT))
            ret.put("catParents", AtharNotificationManager.isCategoryEnabled(context, AtharNotificationManager.CAT_PARENTS_DUTY))
            ret.put("catWird", AtharNotificationManager.isCategoryEnabled(context, AtharNotificationManager.CAT_QURAN_WIRD))
            ret.put("toneQuran", AtharNotificationManager.getCategoryTone(context, AtharNotificationManager.CAT_QURAN_AYAH))
            ret.put("toneAzkar", AtharNotificationManager.getCategoryTone(context, AtharNotificationManager.CAT_DHIKR_TASBEEH))
            ret.put("toneSalawat", AtharNotificationManager.getCategoryTone(context, AtharNotificationManager.CAT_SALAWAT))
            ret.put("toneParents", AtharNotificationManager.getCategoryTone(context, AtharNotificationManager.CAT_PARENTS_DUTY))
            ret.put("toneWird", AtharNotificationManager.getCategoryTone(context, AtharNotificationManager.CAT_QURAN_WIRD))
            ret.put("repeatIntervalMins", AtharNotificationManager.getRepeatIntervalMins(context))
            ret.put("intervalQuranMins", AtharNotificationManager.getCategoryRepeatIntervalMins(context, AtharNotificationManager.CAT_QURAN_AYAH))
            ret.put("intervalAzkarMins", AtharNotificationManager.getCategoryRepeatIntervalMins(context, AtharNotificationManager.CAT_DHIKR_TASBEEH))
            ret.put("intervalSalawatMins", AtharNotificationManager.getCategoryRepeatIntervalMins(context, AtharNotificationManager.CAT_SALAWAT))
            ret.put("intervalParentsMins", AtharNotificationManager.getCategoryRepeatIntervalMins(context, AtharNotificationManager.CAT_PARENTS_DUTY))
            ret.put("intervalWirdMins", AtharNotificationManager.getCategoryRepeatIntervalMins(context, AtharNotificationManager.CAT_QURAN_WIRD))
            ret.put("masterVolume", AtharNotificationManager.getMasterVolume(context))
            ret.put("masterMuted", AtharNotificationManager.isMasterMuted(context))
            ret.put("dndBypass", AtharNotificationManager.isDndBypassEnabled(context))
            ret.put("vibrationPattern", AtharNotificationManager.getVibrationPattern(context))
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to get notification config: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun setMasterVolume(call: PluginCall) {
        var volume = call.getFloat("volume") ?: 1.0f
        try {
            AtharNotificationManager.setMasterVolume(context, volume)
            var ret = JSObject()
            ret.put("volume", volume)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to set master volume: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun setMasterMute(call: PluginCall) {
        var muted = call.getBoolean("muted") ?: false
        try {
            AtharNotificationManager.setMasterMuted(context, muted)
            var ret = JSObject()
            ret.put("muted", muted)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to set master mute: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun showSystemOverlayNotification(call: PluginCall) {
        var title = call.getString("title") ?: "تنبيه أثر الملكي"
        var body = call.getString("body") ?: ""
        var badge = call.getString("badge") ?: "🕌 تنبيه أثر الملكي"
        var category = call.getString("category") ?: "quran_ayah"
        var audioUrl = call.getString("audioUrl") ?: ""
        var playSound = call.getBoolean("playSound") ?: (!audioUrl.isNullOrBlank())
        var surahNumber = call.getInt("surahNumber") ?: 0
        var ayahNumber = call.getInt("ayahNumber") ?: 0
        var actionText = call.getString("actionText")
        var autoDismissMs = call.getInt("autoDismissMs")?.toLong() ?: 0L

        try {
            var ret = JSObject()
            ret.put("shown", false)
            ret.put("floatingOverlayActive", false)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to show system overlay: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun dismissSystemOverlay(call: PluginCall) {
        try {
            var ret = JSObject()
            ret.put("dismissed", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to dismiss system overlay: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun stopFullScreenAthan(call: PluginCall) {
        try {
            AthanForegroundService.stopAthan(context)
            var ret = JSObject()
            ret.put("success", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to stop full screen athan: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun updatePrayerWidget(call: PluginCall) {
        try {
            var nextPrayer = call.getString("nextPrayer") ?: "صلاة الفجر"
            var nextTime = call.getString("nextTime") ?: "05:15"
            var remaining = call.getString("remaining") ?: "متبقي ساعتان"
            var fajr = call.getString("fajr") ?: "05:15"
            var dhuhr = call.getString("dhuhr") ?: "12:00"
            var asr = call.getString("asr") ?: "15:15"
            var maghrib = call.getString("maghrib") ?: "17:50"
            var isha = call.getString("isha") ?: "19:20"
            var hijriDate = call.getString("hijriDate") ?: "أثر | مواقيت الصلاة"
            var ayahText = call.getString("ayahText")
            var ayahSurah = call.getString("ayahSurah")
            var widgetStyle = call.getString("widgetStyle")
            var showDhikr = call.getBoolean("showDhikr")
            var showFajr = call.getBoolean("showFajr")
            var showDhuhr = call.getBoolean("showDhuhr")
            var showAsr = call.getBoolean("showAsr")
            var showMaghrib = call.getBoolean("showMaghrib")
            var showIsha = call.getBoolean("showIsha")
            var showCountdown = call.getBoolean("showCountdown")
            var bgOpacity = call.getString("bgOpacity")
            var themeAccent = call.getString("themeAccent")

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
            var ret = JSObject()
            ret.put("updated", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to update prayer widget: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun updateAzkarWidget(call: PluginCall) {
        try {
            var category = call.getString("category") ?: "أثر | أذكار اليوم والاستغفار"
            var text = call.getString("text") ?: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ"
            var fadl = call.getString("fadl") ?: "كلمتان خفيفتان على اللسان ثقيلتان في الميزان"
            var repeat = call.getString("repeat") ?: "33 مرة"
            AtharAzkarWidgetProvider.pushAzkarData(context, category, text, fadl, repeat)
            var ret = JSObject()
            ret.put("updated", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to update azkar widget: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun scheduleBackgroundSync(call: PluginCall) {
        try {
            AtharBackgroundSyncWorker.enqueuePeriodicSync(context)
            var ret = JSObject()
            ret.put("scheduled", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to schedule background sync: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun setOngoingPrayerNotification(call: PluginCall) {
        try {
            var title = call.getString("title") ?: "🕌 الصلاة القادمة: صلاة الفجر"
            var nextPrayer = call.getString("nextPrayer") ?: "صلاة الفجر"
            var nextTime = call.getString("nextTime") ?: "05:15"
            var remaining = call.getString("remaining") ?: "الصلاة القادمة"
            var fajr = call.getString("fajr") ?: "05:15"
            var dhuhr = call.getString("dhuhr") ?: "12:00"
            var asr = call.getString("asr") ?: "15:15"
            var maghrib = call.getString("maghrib") ?: "17:50"
            var isha = call.getString("isha") ?: "19:20"
            var hijri = call.getString("hijriDate") ?: "أَثَرُ | مواقيت الصلاة"

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
            var ret = JSObject()
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
            var ret = JSObject()
            ret.put("success", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to remove ongoing notification: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun showRoyalNotification(call: PluginCall) {
        var title = call.getString("title") ?: "أثر | تنبيه ملكي"
        var body = call.getString("body") ?: ""
        var category = call.getString("category") ?: AtharNotificationManager.CAT_QURAN_AYAH
        var badge = call.getString("badge")
        var audioUrl = call.getString("audioUrl")
        var playSound = call.getBoolean("playSound") ?: (!audioUrl.isNullOrBlank())
        var isOngoing = call.getBoolean("isOngoing") ?: false
        var customId = call.getInt("id")
        var surahNumber = call.getInt("surahNumber") ?: 0
        var ayahNumber = call.getInt("ayahNumber") ?: 0

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
                customNotificationId = customId,
                surahNumber = surahNumber,
                ayahNumber = ayahNumber
            )
            var ret = JSObject()
            ret.put("success", true)
            ret.put("category", category)
            ret.put("notificationId", customId ?: AtharNotificationManager.getNotificationId(category))
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to show royal notification: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun muteNotificationAudio(call: PluginCall) {
        try {
            AtharNotificationManager.muteCurrentAudio(context)
            var ret = JSObject()
            ret.put("muted", true)
            ret.put("positionMs", AtharNotificationManager.getCurrentPositionMs())
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to mute audio: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun unmuteNotificationAudio(call: PluginCall) {
        try {
            AtharNotificationManager.unmuteCurrentAudio(context)
            var ret = JSObject()
            ret.put("unmuted", true)
            ret.put("positionMs", AtharNotificationManager.getCurrentPositionMs())
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to unmute audio: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun toggleNotificationAudio(call: PluginCall) {
        try {
            AtharNotificationManager.toggleAudio(context)
            var ret = JSObject()
            ret.put("isMuted", AtharNotificationManager.isMuted())
            ret.put("positionMs", AtharNotificationManager.getCurrentPositionMs())
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to toggle audio: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun pauseNotificationAudio(call: PluginCall) {
        try {
            AtharNotificationManager.pauseAudio(context)
            var ret = JSObject()
            ret.put("paused", true)
            ret.put("positionMs", AtharNotificationManager.getCurrentPositionMs())
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to pause audio: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun resumeNotificationAudio(call: PluginCall) {
        try {
            AtharNotificationManager.resumeAudio(context)
            var ret = JSObject()
            ret.put("resumed", true)
            ret.put("positionMs", AtharNotificationManager.getCurrentPositionMs())
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to resume audio: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun getNotificationAudioTimeline(call: PluginCall) {
        try {
            var ret = JSObject()
            ret.put("isPlaying", AtharNotificationManager.isPlaying())
            ret.put("isMuted", AtharNotificationManager.isMuted())
            ret.put("positionMs", AtharNotificationManager.getCurrentPositionMs())
            ret.put("durationMs", AtharNotificationManager.getDurationMs())
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to get audio timeline: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun dismissNotification(call: PluginCall) {
        var category = call.getString("category") ?: AtharNotificationManager.CAT_QURAN_AYAH
        var customId = call.getInt("id")
        try {
            if (customId != null && customId > 0) {
                AtharNotificationManager.dismissNotificationById(context, customId)
            } else {
                AtharNotificationManager.dismissNotification(context, category)
            }
            var ret = JSObject()
            ret.put("dismissed", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to dismiss notification: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun scheduleNativePrayerAlarms(call: PluginCall) {
        var prayersJson = call.getString("prayersJson") ?: ""
        try {
            AtharPrayerAlarmScheduler.schedulePrayers(context, prayersJson)
            var ret = JSObject()
            ret.put("scheduled", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to schedule native prayer alarms: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun scheduleNativeRoyalAlarms(call: PluginCall) {
        var alarmsJson = call.getString("alarmsJson") ?: ""
        try {
            AtharPrayerAlarmScheduler.scheduleRoyalAlarms(context, alarmsJson)
            var ret = JSObject()
            ret.put("scheduled", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to schedule native royal alarms: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun purgeSystemNotifications(call: PluginCall) {
        try {
            AtharNotificationManager.purgeOnStartup(context)
            var ret = JSObject()
            ret.put("purged", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to purge system notifications: ${e.localizedMessage}")
        }
    }
}
