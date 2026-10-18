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
            var ret = JSObject()
            ret.put("updated", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to update azkar widget: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun pushAzkarData(call: PluginCall) {
        try {
            var ret = JSObject()
            ret.put("success", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to push azkar data: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun enqueuePeriodicSync(call: PluginCall) {
        try {
            var ret = JSObject()
            ret.put("success", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to enqueue sync: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun startService(call: PluginCall) {
        try {
            var ret = JSObject()
            ret.put("success", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to start service: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun stopService(call: PluginCall) {
        try {
            var ret = JSObject()
            ret.put("success", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to stop service: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun schedulePrayers(call: PluginCall) {
        try {
            var ret = JSObject()
            ret.put("success", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to schedule prayers: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun scheduleRoyalAlarms(call: PluginCall) {
        try {
            var ret = JSObject()
            ret.put("success", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to schedule alarms: ${e.localizedMessage}")
        }
    }
}
