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
import androidx.core.content.FileProvider
import android.app.DownloadManager
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
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

    private fun getSystemProperty(key: String): String {
        return try {
            val c = Class.forName("android.os.SystemProperties")
            val get = c.getMethod("get", String::class.java)
            (get.invoke(c, key) as? String) ?: ""
        } catch (e: Exception) {
            ""
        }
    }

    @PluginMethod
    fun getDeviceDiagnosticInfo(call: PluginCall) {
        try {
            val manufacturer = (Build.MANUFACTURER ?: "").lowercase().trim()
            val brand = (Build.BRAND ?: "").lowercase().trim()
            val model = Build.MODEL ?: ""
            val device = Build.DEVICE ?: ""
            val product = Build.PRODUCT ?: ""
            val sdkInt = Build.VERSION.SDK_INT
            val release = Build.VERSION.RELEASE ?: ""

            var vendor = "generic"
            var vendorName = "نظام أندرويد القياسي"
            var customRom = ""

            if (manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || manufacturer.contains("poco") ||
                brand.contains("xiaomi") || brand.contains("redmi") || brand.contains("poco")) {
                vendor = "xiaomi"
                vendorName = "شاومي / ريدمي / بوكو"
                try {
                    val miuiVer = getSystemProperty("ro.miui.ui.version.name")
                    val isHyperOs = getSystemProperty("ro.miui.ui.version.code").isNotEmpty() || miuiVer.contains("OS", ignoreCase = true)
                    customRom = if (isHyperOs) "HyperOS ($miuiVer)" else if (miuiVer.isNotEmpty()) "MIUI $miuiVer" else "MIUI / HyperOS"
                } catch (e: Exception) {
                    customRom = "MIUI / HyperOS"
                }
            } else if (manufacturer.contains("samsung") || brand.contains("samsung")) {
                vendor = "samsung"
                vendorName = "سامسونج"
                try {
                    val oneUi = getSystemProperty("ro.build.version.oneui")
                    customRom = if (oneUi.isNotEmpty()) "One UI $oneUi" else "Samsung One UI"
                } catch (e: Exception) {
                    customRom = "Samsung One UI"
                }
            } else if (manufacturer.contains("huawei") || brand.contains("huawei") ||
                       manufacturer.contains("honor") || brand.contains("honor")) {
                vendor = "honor"
                vendorName = "هونر / هواوي"
                try {
                    val emui = getSystemProperty("ro.build.version.emui")
                    val magic = getSystemProperty("ro.build.version.magic")
                    customRom = if (magic.isNotEmpty()) "MagicOS $magic" else if (emui.isNotEmpty()) "EMUI $emui" else "EMUI / MagicOS"
                } catch (e: Exception) {
                    customRom = "EMUI / MagicOS"
                }
            } else if (manufacturer.contains("oppo") || brand.contains("oppo") ||
                       manufacturer.contains("realme") || brand.contains("realme")) {
                vendor = "oppo"
                vendorName = "أوبو / ريلمي"
                try {
                    val colorOs = getSystemProperty("ro.build.version.opporom")
                    customRom = if (colorOs.isNotEmpty()) "ColorOS $colorOs" else "ColorOS / Realme UI"
                } catch (e: Exception) {
                    customRom = "ColorOS / Realme UI"
                }
            } else if (manufacturer.contains("oneplus") || brand.contains("oneplus")) {
                vendor = "oneplus"
                vendorName = "ون بلس"
                try {
                    val ota = getSystemProperty("ro.oxygen.version")
                    customRom = if (ota.isNotEmpty()) "OxygenOS $ota" else "OxygenOS"
                } catch (e: Exception) {
                    customRom = "OxygenOS"
                }
            } else if (manufacturer.contains("vivo") || brand.contains("vivo") ||
                       manufacturer.contains("iqoo") || brand.contains("iqoo")) {
                vendor = "vivo"
                vendorName = "فيفو / iQOO"
                try {
                    val funtouch = getSystemProperty("ro.vivo.os.version")
                    customRom = if (funtouch.isNotEmpty()) "Funtouch / OriginOS $funtouch" else "Funtouch OS"
                } catch (e: Exception) {
                    customRom = "Funtouch OS"
                }
            } else if (manufacturer.contains("google") || brand.contains("google")) {
                vendor = "google"
                vendorName = "جوجل بكسل"
                customRom = "Stock Android"
            } else if (manufacturer.contains("motorola") || brand.contains("motorola")) {
                vendor = "motorola"
                vendorName = "موتورولا"
                customRom = "My UX / Stock Android"
            }

            val targetAppId = context.packageName ?: "com.athar.athar"
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            val isBatteryOptimized = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                !(powerManager?.isIgnoringBatteryOptimizations(targetAppId) ?: false)
            } else {
                false
            }

            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            val canScheduleExactAlarms = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                alarmManager?.canScheduleExactAlarms() ?: true
            } else {
                true
            }

            val notifManager = androidx.core.app.NotificationManagerCompat.from(context)
            val notificationsEnabled = notifManager.areNotificationsEnabled()

            val overlayGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Settings.canDrawOverlays(context)
            } else {
                true
            }

            val ret = JSObject()
            ret.put("manufacturer", manufacturer)
            ret.put("brand", brand)
            ret.put("model", model)
            ret.put("device", device)
            ret.put("product", product)
            ret.put("sdkInt", sdkInt)
            ret.put("release", release)
            ret.put("vendor", vendor)
            ret.put("vendorName", vendorName)
            ret.put("customRom", customRom)
            ret.put("isBatteryOptimized", isBatteryOptimized)
            ret.put("canScheduleExactAlarms", canScheduleExactAlarms)
            ret.put("notificationsEnabled", notificationsEnabled)
            ret.put("overlayGranted", overlayGranted)
            ret.put("backgroundServiceRunning", AthanForegroundService.isBackgroundServiceRunning)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to retrieve device diagnostics: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun checkNotificationChannelsStatus(call: PluginCall) {
        try {
            val notifManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            val areNotificationsEnabled = androidx.core.app.NotificationManagerCompat.from(context).areNotificationsEnabled()
            val channelsArray = com.getcapacitor.JSArray()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && notifManager != null) {
                val registeredChannels = notifManager.notificationChannels ?: emptyList()
                for (channel in registeredChannels) {
                    val chObj = JSObject()
                    chObj.put("id", channel.id)
                    chObj.put("name", channel.name?.toString() ?: channel.id)
                    chObj.put("importance", channel.importance)
                    chObj.put("isBlocked", channel.importance == NotificationManager.IMPORTANCE_NONE)
                    chObj.put("soundEnabled", channel.sound != null)
                    chObj.put("vibrationEnabled", channel.shouldVibrate())
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        chObj.put("bypassDnd", channel.canBypassDnd())
                    } else {
                        chObj.put("bypassDnd", false)
                    }
                    channelsArray.put(chObj)
                }
            }

            val res = JSObject()
            res.put("notificationsEnabled", areNotificationsEnabled)
            res.put("channels", channelsArray)
            call.resolve(res)
        } catch (e: Exception) {
            call.reject("Failed to check channels: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun triggerDiagnosticTestNotification(call: PluginCall) {
        try {
            val mode = call.getString("mode")
            val playSound = call.getBoolean("playSound") ?: true
            val title = call.getString("title")
            val body = call.getString("body")

            val ret = JSObject()
            ret.put("success", true)
            call.resolve(ret)

            Thread {
                try {
                    AtharNotificationManager.triggerDiagnosticCustomNotification(
                        context = context,
                        mode = mode,
                        playSound = playSound,
                        title = title,
                        body = body
                    )
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }.start()
        } catch (e: Exception) {
            call.reject("Failed to trigger diagnostic test: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun openManufacturerBackgroundSettings(call: PluginCall) {
        val targetAppId = call.getString("appId") ?: context.packageName ?: "com.athar.athar"
        val vendorParam = call.getString("vendor")?.lowercase()?.trim()

        val manufacturer = (Build.MANUFACTURER ?: "").lowercase().trim()
        val brand = (Build.BRAND ?: "").lowercase().trim()
        val detectedVendor = when {
            vendorParam != null && vendorParam.isNotEmpty() -> vendorParam
            manufacturer.contains("xiaomi") || brand.contains("xiaomi") || manufacturer.contains("redmi") || brand.contains("redmi") || manufacturer.contains("poco") || brand.contains("poco") -> "xiaomi"
            manufacturer.contains("samsung") || brand.contains("samsung") -> "samsung"
            manufacturer.contains("huawei") || brand.contains("huawei") || manufacturer.contains("honor") || brand.contains("honor") -> "honor"
            manufacturer.contains("oppo") || brand.contains("oppo") || manufacturer.contains("realme") || brand.contains("realme") -> "oppo"
            manufacturer.contains("oneplus") || brand.contains("oneplus") -> "oneplus"
            manufacturer.contains("vivo") || brand.contains("vivo") || manufacturer.contains("iqoo") || brand.contains("iqoo") -> "vivo"
            else -> "generic"
        }

        var opened = false

        if (detectedVendor == "xiaomi") {
            val xiaomiIntents = listOf(
                Intent().apply {
                    component = ComponentName("com.miui.powerkeeper", "com.miui.powerkeeper.ui.HiddenAppsConfigActivity")
                    putExtra("package_name", targetAppId)
                    putExtra("package_label", "أثر")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                },
                Intent().apply {
                    component = ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                },
                Intent("miui.intent.action.POWER_HIDE_MODE_APP_LIST").apply {
                    addCategory(Intent.CATEGORY_DEFAULT)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            )
            for (intent in xiaomiIntents) {
                try {
                    context.startActivity(intent)
                    opened = true
                    break
                } catch (e: Exception) {}
            }
        } else if (detectedVendor == "samsung") {
            val samsungIntents = listOf(
                Intent().apply {
                    component = ComponentName("com.samsung.android.sm", "com.samsung.android.sm.battery.ui.BatteryActivity")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                },
                Intent().apply {
                    component = ComponentName("com.samsung.android.sm", "com.samsung.android.sm.ui.battery.AppSleepListActivity")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                },
                Intent().apply {
                    component = ComponentName("com.samsung.android.lool", "com.samsung.android.sm.battery.ui.BatteryActivity")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            )
            for (intent in samsungIntents) {
                try {
                    context.startActivity(intent)
                    opened = true
                    break
                } catch (e: Exception) {}
            }
        } else if (detectedVendor == "oppo" || detectedVendor == "oneplus" || detectedVendor == "realme") {
            val oppoIntents = listOf(
                Intent().apply {
                    component = ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                },
                Intent().apply {
                    component = ComponentName("com.coloros.oppoguardelf", "com.coloros.oppoguardelf.startup.StartupAppListActivity")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                },
                Intent().apply {
                    component = ComponentName("com.oplus.battery", "com.oplus.battery.AppBackgroundListActivity")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            )
            for (intent in oppoIntents) {
                try {
                    context.startActivity(intent)
                    opened = true
                    break
                } catch (e: Exception) {}
            }
        } else if (detectedVendor == "honor" || detectedVendor == "huawei") {
            val huaweiIntents = listOf(
                Intent().apply {
                    component = ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                },
                Intent().apply {
                    component = ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.optimize.bootstart.BootStartActivity")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            )
            for (intent in huaweiIntents) {
                try {
                    context.startActivity(intent)
                    opened = true
                    break
                } catch (e: Exception) {}
            }
        } else if (detectedVendor == "vivo") {
            val vivoIntents = listOf(
                Intent().apply {
                    component = ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                },
                Intent().apply {
                    component = ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            )
            for (intent in vivoIntents) {
                try {
                    context.startActivity(intent)
                    opened = true
                    break
                } catch (e: Exception) {}
            }
        }

        if (!opened) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    val batteryIntent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(batteryIntent)
                    opened = true
                }
            } catch (e: Exception) {
                try {
                    val appDetailsIntent = Intent(
                        Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                        Uri.parse("package:$targetAppId")
                    ).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(appDetailsIntent)
                    opened = true
                } catch (e2: Exception) {}
            }
        }

        val ret = JSObject()
        ret.put("opened", opened)
        ret.put("vendor", detectedVendor)
        call.resolve(ret)
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
            val hasOverlayPermission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Settings.canDrawOverlays(context)
            } else {
                true
            }

            if (!hasOverlayPermission) {
                val ret = JSObject()
                ret.put("shown", false)
                ret.put("floatingOverlayActive", false)
                ret.put("requiresPermission", true)
                call.resolve(ret)
                return
            }

            val title = call.getString("title") ?: "تنبيه أثر الملكي"
            val body = call.getString("body") ?: ""
            val badge = call.getString("badge") ?: "🕌 تنبيه أثر"
            val category = call.getString("category") ?: "dhikr_tasbeeh"
            val audioUrl = call.getString("audioUrl") ?: ""
            val playSound = call.getBoolean("playSound") ?: true
            val surahNumber = call.getInt("surahNumber") ?: 0
            val ayahNumber = call.getInt("ayahNumber") ?: 1
            val actionText = call.getString("actionText") ?: "فتح في التطبيق 📖"
            val autoDismissSeconds = call.getInt("autoDismissSeconds") ?: (if (playSound) 0 else 10)
            val playbackMode = call.getString("playbackMode") ?: "notification_and_sound"

            AtharFloatingWindowService.showOverlay(
                context = context,
                title = title,
                body = body,
                badge = badge,
                category = category,
                audioUrl = audioUrl,
                playSound = playSound,
                surahNumber = surahNumber,
                ayahNumber = ayahNumber,
                actionText = actionText,
                autoDismissSeconds = autoDismissSeconds,
                playbackMode = playbackMode
            )

            val ret = JSObject()
            ret.put("shown", true)
            ret.put("floatingOverlayActive", true)
            ret.put("requiresPermission", false)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to show system overlay: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun dismissSystemOverlay(call: PluginCall) {
        try {
            AtharFloatingWindowService.dismissOverlay(context)
            val ret = JSObject()
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

    @PluginMethod
    fun canRequestPackageInstalls(call: PluginCall) {
        val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.packageManager.canRequestPackageInstalls()
        } else {
            true
        }
        val ret = JSObject()
        ret.put("granted", granted)
        call.resolve(ret)
    }

    @PluginMethod
    fun openInstallUnknownAppsSettings(call: PluginCall) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:${context.packageName}")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            } else {
                val intent = Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:${context.packageName}")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            }
            val ret = JSObject()
            ret.put("opened", true)
            call.resolve(ret)
        } catch (e: Exception) {
            try {
                val fallbackIntent = Intent(Settings.ACTION_SECURITY_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(fallbackIntent)
                val ret = JSObject()
                ret.put("opened", true)
                ret.put("fallback", true)
                call.resolve(ret)
            } catch (err: Exception) {
                call.reject("Failed to open unknown app settings: ${err.localizedMessage}")
            }
        }
    }

    @PluginMethod
    fun installApkFile(call: PluginCall) {
        val filePath = call.getString("filePath")
        if (filePath.isNullOrEmpty()) {
            call.reject("filePath is required")
            return
        }

        try {
            val file = File(filePath)
            if (!file.exists() || file.length() == 0L) {
                call.reject("File does not exist or is empty: $filePath")
                return
            }

            val apkUri: Uri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.fileprovider",
                    file
                )
            } else {
                Uri.fromFile(file)
            }

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            context.startActivity(intent)
            val ret = JSObject()
            ret.put("success", true)
            ret.put("launched", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to trigger APK installer: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun downloadAndInstallApk(call: PluginCall) {
        val downloadUrl = call.getString("url")
        val fileName = call.getString("fileName") ?: "athar-latest-update.apk"

        if (downloadUrl.isNullOrEmpty()) {
            call.reject("URL is required")
            return
        }

        Thread {
            try {
                // Download directly into context cache directory
                val updatesDir = File(context.cacheDir, "updates")
                if (!updatesDir.exists()) {
                    updatesDir.mkdirs()
                }

                val apkFile = File(updatesDir, fileName)
                if (apkFile.exists()) {
                    apkFile.delete()
                }

                val url = URL(downloadUrl)
                val connection = (url.openConnection() as HttpURLConnection).apply {
                    instanceFollowRedirects = true
                    connectTimeout = 30000
                    readTimeout = 60000
                    setRequestProperty("User-Agent", "Athar-Islamic-App/Android")
                }

                // Follow redirects if any (e.g. GitHub Releases 302 to AWS S3)
                var currentConnection = connection
                var redirectCount = 0
                while (redirectCount < 5) {
                    val status = currentConnection.responseCode
                    if (status == HttpURLConnection.HTTP_MOVED_TEMP ||
                        status == HttpURLConnection.HTTP_MOVED_PERM ||
                        status == 307 || status == 308
                    ) {
                        val newUrl = currentConnection.getHeaderField("Location")
                        currentConnection.disconnect()
                        currentConnection = (URL(newUrl).openConnection() as HttpURLConnection).apply {
                            instanceFollowRedirects = true
                            connectTimeout = 30000
                            readTimeout = 60000
                            setRequestProperty("User-Agent", "Athar-Islamic-App/Android")
                        }
                        redirectCount++
                    } else {
                        break
                    }
                }

                currentConnection.connect()
                val totalLength = currentConnection.contentLengthLong

                currentConnection.inputStream.use { input ->
                    FileOutputStream(apkFile).use { output ->
                        val buffer = ByteArray(8 * 1024)
                        var bytesRead: Int
                        var totalBytesRead = 0L

                        while (input.read(buffer).also { bytesRead = it } != -1) {
                            output.write(buffer, 0, bytesRead)
                            totalBytesRead += bytesRead
                        }
                        output.flush()
                    }
                }
                currentConnection.disconnect()

                if (!apkFile.exists() || apkFile.length() == 0L) {
                    activity?.runOnUiThread {
                        call.reject("Downloaded APK is empty or invalid")
                    }
                    return@Thread
                }

                // Trigger package installer on UI Thread
                activity?.runOnUiThread {
                    try {
                        val apkUri: Uri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                            FileProvider.getUriForFile(
                                context,
                                "${context.packageName}.fileprovider",
                                apkFile
                            )
                        } else {
                            Uri.fromFile(apkFile)
                        }

                        val installIntent = Intent(Intent.ACTION_VIEW).apply {
                            setDataAndType(apkUri, "application/vnd.android.package-archive")
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }

                        context.startActivity(installIntent)

                        val res = JSObject()
                        res.put("success", true)
                        res.put("filePath", apkFile.absolutePath)
                        res.put("fileSize", apkFile.length())
                        call.resolve(res)
                    } catch (installEx: Exception) {
                        call.reject("Download finished but installer launch failed: ${installEx.localizedMessage}")
                    }
                }
            } catch (e: Exception) {
                activity?.runOnUiThread {
                    call.reject("Download failed: ${e.localizedMessage}")
                }
            }
        }.start()
    }
}
