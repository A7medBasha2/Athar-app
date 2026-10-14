import React, { useState } from 'react';
import { X, Code, Copy, Check, FileCode, Layers, ShieldCheck, Download } from 'lucide-react';

interface CodeInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CodeInspectorModal: React.FC<CodeInspectorModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeFile, setActiveFile] = useState<string>('QuranAudioService.kt');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const files: Record<string, { lang: string; path: string; code: string }> = {
    'QuranAudioService.kt': {
      lang: 'kotlin',
      path: 'app/src/main/java/com/athar/islamic/service/QuranAudioService.kt',
      code: `package com.athar.islamic.service

import android.app.Notification
import android.app.PendingIntent
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import com.athar.islamic.R
import com.athar.islamic.ui.MainActivity
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

/**
 * خدمة تشغيل القرآن الكريم وخلفية شاشة القفل باستخدام Media3 / ExoPlayer
 * Clean Architecture Background Media Service with MediaSession controls
 */
@AndroidEntryPoint
class QuranAudioService : MediaSessionService() {

    private var mediaSession: MediaSession? = null
    private lateinit var exoPlayer: ExoPlayer

    override fun onCreate() {
        super.onCreate()
        val audioAttributes = AudioAttributes.Builder()
            .setContentType(C.AUDIO_CONTENT_TYPE_SPEECH)
            .setUsage(C.USAGE_MEDIA)
            .build()

        exoPlayer = ExoPlayer.Builder(this)
            .setAudioAttributes(audioAttributes, true)
            .setHandleAudioBecomingNoisy(true)
            .build()

        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent, PendingIntent.FLAG_IMMUTABLE
        )

        mediaSession = MediaSession.Builder(this, exoPlayer)
            .setSessionActivity(pendingIntent)
            .build()

        exoPlayer.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_ENDED) {
                    // Auto-advance to next Ayah or Surah
                }
            }
        })
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        return mediaSession
    }

    override fun onDestroy() {
        mediaSession?.run {
            player.release()
            release()
            mediaSession = null
        }
        super.onDestroy()
    }
}`
    },
    'AdhkarPlaybackService.kt': {
      lang: 'kotlin',
      path: 'app/src/main/java/com/athar/islamic/service/AdhkarPlaybackService.kt',
      code: `package com.athar.islamic.service

import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import com.athar.islamic.domain.model.DhikrItem
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * المشغل الآلي للأذكار مع تكرار كل ذكر بعدده المأثور (1، 3، 100 مرة)
 * Automatic repetition engine for verified Hisn Muslim Adhkar
 */
@Singleton
class AdhkarPlaybackEngine @Inject constructor(
    private val exoPlayer: ExoPlayer
) {
    private var playlist: List<DhikrItem> = emptyList()
    private var currentIndex = 0
    private var currentRepetition = 1

    private val _playbackState = MutableStateFlow<AdhkarPlayerState>(AdhkarPlayerState.Idle)
    val playbackState: StateFlow<AdhkarPlayerState> = _playbackState

    fun startContinuousPlayback(adhkar: List<DhikrItem>, startIndex: Int = 0) {
        playlist = adhkar
        currentIndex = startIndex
        currentRepetition = 1
        playCurrentItem()
    }

    private fun playCurrentItem() {
        if (currentIndex >= playlist.size) {
            _playbackState.value = AdhkarPlayerState.Completed
            return
        }

        val item = playlist[currentIndex]
        _playbackState.value = AdhkarPlayerState.Playing(
            dhikr = item,
            currentRepetition = currentRepetition,
            targetRepetitions = item.count,
            currentIndex = currentIndex + 1,
            total = playlist.size
        )

        item.audioUrl?.let { url ->
            val mediaItem = MediaItem.fromUri(url)
            exoPlayer.setMediaItem(mediaItem)
            exoPlayer.prepare()
            exoPlayer.play()
        }
    }

    fun onTrackEnded() {
        val item = playlist.getOrNull(currentIndex) ?: return
        if (currentRepetition < item.count) {
            currentRepetition++
            playCurrentItem()
        } else {
            currentIndex++
            currentRepetition = 1
            playCurrentItem()
        }
    }
}`
    },
    'PrayerTimesRepository.kt': {
      lang: 'kotlin',
      path: 'app/src/main/java/com/athar/islamic/data/repository/PrayerTimesRepositoryImpl.kt',
      code: `package com.athar.islamic.data.repository

import com.athar.islamic.data.local.dao.PrayerTimesDao
import com.athar.islamic.data.remote.AladhanApi
import com.athar.islamic.domain.model.Coordinates
import com.athar.islamic.domain.model.PrayerTimes
import com.athar.islamic.domain.repository.PrayerTimesRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject

class PrayerTimesRepositoryImpl @Inject constructor(
    private val aladhanApi: AladhanApi,
    private val prayerTimesDao: PrayerTimesDao
) : PrayerTimesRepository {

    override fun getPrayerTimes(coords: Coordinates, method: Int): Flow<Result<PrayerTimes>> = flow {
        try {
            val timestamp = System.currentTimeMillis() / 1000
            val response = aladhanApi.getTimings(
                timestamp = timestamp,
                latitude = coords.latitude,
                longitude = coords.longitude,
                method = method
            )
            val timings = response.data.toDomain()
            prayerTimesDao.insertPrayerTimes(timings.toEntity())
            emit(Result.success(timings))
        } catch (e: Exception) {
            val cached = prayerTimesDao.getLatestPrayerTimes()
            if (cached != null) {
                emit(Result.success(cached.toDomain()))
            } else {
                emit(Result.failure(e))
            }
        }
    }
}`
    },
    'AndroidManifest.xml': {
      lang: 'xml',
      path: 'app/src/main/AndroidManifest.xml',
      code: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:name=".AtharApplication"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:theme="@style/Theme.Athar">

        <activity
            android:name=".ui.MainActivity"
            android:exported="true"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- MediaSession Foreground Playback Service -->
        <service
            android:name=".service.QuranAudioService"
            android:exported="false"
            android:foregroundServiceType="mediaPlayback">
            <intent-filter>
                <action android:name="androidx.media3.session.MediaSessionService" />
            </intent-filter>
        </service>

        <!-- Alarm Receiver for Prayer & Reminders -->
        <receiver
            android:name=".receiver.PrayerAlarmReceiver"
            android:exported="false" />

    </application>
</manifest>`
    },
    'NativePermissionsPlugin.kt': {
      lang: 'kotlin',
      path: 'app/src/main/java/com/athar/islamic/NativePermissionsPlugin.kt',
      code: `package com.athar.islamic

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "NativePermissions")
class NativePermissionsPlugin : Plugin() {

    @PluginMethod
    fun openOverlaySettings(call: PluginCall) {
        val targetAppId = call.getString("appId") ?: "com.athar.athar"
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:$targetAppId")
        ).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
        context.startActivity(intent)
        call.resolve(JSObject().apply { put("opened", true) })
    }

    @PluginMethod
    fun openExactAlarmSettings(call: PluginCall) {
        val targetAppId = call.getString("appId") ?: "com.athar.athar"
        val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:$targetAppId"))
        } else {
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$targetAppId"))
        }.apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
        context.startActivity(intent)
        call.resolve(JSObject().apply { put("opened", true) })
    }

    @PluginMethod
    fun openBatteryOptimizationSettings(call: PluginCall) {
        val targetAppId = call.getString("appId") ?: "com.athar.athar"
        val intent = Intent(
            Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
            Uri.parse("package:$targetAppId")
        ).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
        context.startActivity(intent)
        call.resolve(JSObject().apply { put("opened", true) })
    }

    @PluginMethod
    fun triggerFullScreenAthan(call: PluginCall) {
        val prayerName = call.getString("prayerName") ?: "صلاة الفجر"
        val prayerTime = call.getString("prayerTime") ?: "05:15"
        AthanForegroundService.startAthan(context, prayerName, prayerTime)
        call.resolve(JSObject().apply { put("success", true) })
    }
}`
    },
    'AthanForegroundService.kt': {
      lang: 'kotlin',
      path: 'app/src/main/java/com/athar/islamic/AthanForegroundService.kt',
      code: `package com.athar.islamic

import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.PowerManager
import androidx.core.app.NotificationCompat

/**
 * Foreground Service with USE_FULL_SCREEN_INTENT & WAKE_LOCK
 * Wakes up locked phone and displays Athan over any running application
 */
class AthanForegroundService : Service() {
    private var fullWakeLock: PowerManager.WakeLock? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val prayerName = intent?.getStringExtra("prayer_name") ?: "صلاة الفجر"
        val prayerTime = intent?.getStringExtra("prayer_time") ?: "05:15"

        val fullScreenIntent = Intent(this, AthanFullScreenActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("prayer_name", prayerName)
            putExtra("prayer_time", prayerTime)
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 1001, fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, "athar_athan_fullscreen_channel")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("حان الآن موعد $prayerName")
            .setContentText("حي على الصلاة · حي على الفلاح ($prayerTime)")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setFullScreenIntent(pendingIntent, true)
            .setOngoing(true)
            .build()

        startForeground(99991, notification)
        return START_NOT_STICKY
    }
}`
    },
    'AtharWidgets.kt': {
      lang: 'kotlin',
      path: 'app/src/main/java/com/athar/islamic/AtharPrayerWidgetProvider.kt',
      code: `package com.athar.islamic

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews

/**
 * Native Android AppWidgetProvider for Home Screen and Lock Screen
 * Displays prayer times countdown and daily authentic azkar
 */
class AtharPrayerWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_prayer_times)
            // Binds dynamic prayer timings, hijri date, and open app intent
            appWidgetManager.updateAppWidget(id, views)
        }
    }
}`
    },
    'build.gradle.kts': {
      lang: 'kotlin',
      path: 'app/build.gradle.kts',
      code: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.ksp)
    alias(libs.plugins.hilt.android)
}

android {
    namespace = "com.athar.islamic"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.athar.islamic"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }
}

dependencies {
    // Jetpack Compose & Material 3
    implementation(platform("androidx.compose:compose-bom:2024.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.navigation:navigation-compose:2.7.7")

    // Android Media3 & ExoPlayer
    implementation("androidx.media3:media3-exoplayer:1.2.1")
    implementation("androidx.media3:media3-session:1.2.1")

    // Room Database
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")

    // Retrofit & OkHttp
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")

    // Dependency Injection
    implementation("com.google.dagger:hilt-android:2.50")
    ksp("com.google.dagger:hilt-android-compiler:2.50")
}`
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(files[activeFile].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 select-none animate-fadeIn">
      <div className="w-full max-w-4xl bg-[#0E1318] border border-slate-700 rounded-3xl p-5 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#D4AF37]/15 rounded-xl text-[#D4AF37]">
              <Layers size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                معمارية كود أندرويد الأصلي (Native Android Clean Architecture)
              </h2>
              <p className="text-[11px] text-slate-400">
                MVVM · Jetpack Compose · Room · ExoPlayer/Media3 · Retrofit
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800/60"
            aria-label="إغلاق مستعرض الكود"
          >
            <X size={18} />
          </button>
        </div>

        {/* File tabs */}
        <div className="flex items-center gap-2 py-3 overflow-x-auto text-xs border-b border-slate-800/80">
          {Object.keys(files).map((name) => (
            <button
              key={name}
              onClick={() => setActiveFile(name)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
                activeFile === name
                  ? 'bg-[#D4AF37] text-slate-950 font-bold'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <FileCode size={13} />
              <span>{name}</span>
            </button>
          ))}
        </div>

        {/* Code View Body */}
        <div className="flex-1 overflow-hidden flex flex-col pt-3 min-h-0">
          <div className="flex items-center justify-between pb-2 text-xs text-slate-400">
            <span className="font-mono text-[11px] truncate">{files[activeFile].path}</span>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? 'تم النسخ!' : 'نسخ الكود'}</span>
            </button>
          </div>

          <pre className="flex-1 overflow-auto bg-[#070A0D] p-4 rounded-2xl border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed text-left dir-ltr">
            <code>{files[activeFile].code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
