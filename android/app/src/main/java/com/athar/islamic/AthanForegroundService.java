package com.athar.islamic;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;

import java.util.Locale;

public class AthanForegroundService extends Service {

    public static final String FULLSCREEN_CHANNEL_ID = "athar_athan_fullscreen_channel";
    public static final String BACKGROUND_CHANNEL_ID = "athar_background_service_channel";

    public static final int FULLSCREEN_NOTIFICATION_ID = 1001;
    public static final int BACKGROUND_NOTIFICATION_ID = 99992;

    public static final String ACTION_START_ATHAN = "com.athar.islamic.START_ATHAN";
    public static final String ACTION_STOP_ATHAN = "com.athar.islamic.STOP_ATHAN";
    public static final String ACTION_START_BACKGROUND_SERVICE = "com.athar.islamic.START_BACKGROUND_SERVICE";
    public static final String ACTION_STOP_BACKGROUND_SERVICE = "com.athar.islamic.STOP_BACKGROUND_SERVICE";
    public static final String ACTION_UPDATE_COUNTDOWN = "com.athar.islamic.ACTION_UPDATE_COUNTDOWN";

    public static volatile boolean isRinging = false;
    public static volatile boolean isBackgroundServiceRunning = false;
    public static volatile String activePrayerName = "";
    public static volatile String activeTitle = "";
    public static volatile String activeBody = "";
    public static volatile String activeBadge = "";
    public static volatile String activeCategory = "quran";
    public static volatile String activeAudioUrl = "";
    public static volatile AthanForegroundService activeInstance = null;

    public static volatile String nextPrayerName = "صلاة الفجر";
    public static volatile long nextPrayerEpochMs = 0L;
    public static volatile String nextPrayerTimeFormatted = "";

    private PowerManager.WakeLock fullWakeLock = null;
    private PowerManager.WakeLock partialWakeLock = null;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private long lastStartTimeMs = 0L;

    private final Runnable maxAthanTimeoutRunnable = new Runnable() {
        @Override
        public void run() {
            try {
                stopAthanInternal();
                if (!isBackgroundServiceRunning) {
                    stopSelf();
                }
            } catch (Exception ignored) {}
        }
    };

    private final Runnable countdownTickerRunnable = new Runnable() {
        @Override
        public void run() {
            if (!isBackgroundServiceRunning) {
                return;
            }

            if (!isRinging) {
                NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    try {
                        Notification notification = buildBackgroundCountdownNotification();
                        nm.notify(BACKGROUND_NOTIFICATION_ID, notification);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            }

            scheduleNextCountdownTick();
        }
    };

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        activeInstance = this;
        createNotificationChannels();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;

        if (ACTION_STOP_ATHAN.equals(action)) {
            stopAthanInternal();
            if (isBackgroundServiceRunning) {
                startForegroundProperly(
                    BACKGROUND_NOTIFICATION_ID,
                    buildBackgroundCountdownNotification(),
                    getForegroundServiceTypeCompat(false)
                );
                scheduleNextCountdownTick();
                return START_STICKY;
            }
            stopSelf();
            return START_NOT_STICKY;
        }

        if (ACTION_STOP_BACKGROUND_SERVICE.equals(action)) {
            isBackgroundServiceRunning = false;
            stopBackgroundInternal();
            return START_NOT_STICKY;
        }

        if (ACTION_UPDATE_COUNTDOWN.equals(action) || ACTION_START_BACKGROUND_SERVICE.equals(action)) {
            if (intent != null) {
                String prayer = intent.getStringExtra("next_prayer");
                if (prayer != null && !prayer.trim().isEmpty()) {
                    nextPrayerName = prayer;
                }
                long epoch = intent.getLongExtra("target_epoch_ms", 0L);
                if (epoch > 0) {
                    nextPrayerEpochMs = epoch;
                }
                String timeStr = intent.getStringExtra("time_str");
                if (timeStr != null && !timeStr.trim().isEmpty()) {
                    nextPrayerTimeFormatted = timeStr;
                }
            }

            isBackgroundServiceRunning = true;
            acquirePartialWakeLock();

            if (!isRinging) {
                startForegroundProperly(
                    BACKGROUND_NOTIFICATION_ID,
                    buildBackgroundCountdownNotification(),
                    getForegroundServiceTypeCompat(false)
                );
            }
            scheduleNextCountdownTick();
            return START_STICKY;
        }

        if (ACTION_START_ATHAN.equals(action) || action == null) {
            String prayerName = intent != null && intent.getStringExtra("prayer_name") != null ? intent.getStringExtra("prayer_name") : "صلاة الفجر";
            String prayerTime = intent != null && intent.getStringExtra("prayer_time") != null ? intent.getStringExtra("prayer_time") : "05:15";
            String title = intent != null && intent.getStringExtra("title") != null ? intent.getStringExtra("title") : ("حان الآن موعد " + prayerName);
            String body = intent != null && intent.getStringExtra("body") != null ? intent.getStringExtra("body") : ("الله أكبر · الله أكبر\nحي على الصلاة، حي على الفلاح (" + prayerTime + ")");
            String badge = intent != null && intent.getStringExtra("badge") != null ? intent.getStringExtra("badge") : "🕌 أذان الصلاة الفوري";
            String rawAudioUrl = intent != null ? intent.getStringExtra("audio_url") : null;
            boolean playSound = intent == null || intent.getBooleanExtra("play_sound", true);
            String category = intent != null && intent.getStringExtra("category") != null ? intent.getStringExtra("category") : "prayer_athan";
            long triggerTimestamp = intent != null ? intent.getLongExtra("trigger_timestamp", 0L) : System.currentTimeMillis();

            long now = System.currentTimeMillis();
            if (isRinging && activePrayerName.equals(prayerName) && (now - lastStartTimeMs < 180000L)) {
                return START_NOT_STICKY;
            }
            lastStartTimeMs = now;

            mainHandler.removeCallbacks(maxAthanTimeoutRunnable);
            mainHandler.postDelayed(maxAthanTimeoutRunnable, 240000L);

            acquireFullWakeLock();

            String audioUrl = (rawAudioUrl != null && !rawAudioUrl.isEmpty())
                ? rawAudioUrl
                : "public/audio/adhan.mp3";

            isRinging = true;
            activeInstance = this;
            activePrayerName = prayerName;
            activeTitle = title;
            activeBody = body;
            activeBadge = badge;
            activeCategory = category;
            activeAudioUrl = audioUrl;

            if (playSound) {
                try {
                    AtharNotificationManager.INSTANCE.playNotificationAudioWithGuard(this, audioUrl, category, 0L);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

            try {
                Notification athanNotification = buildAthanNotification(prayerName, prayerTime, title, body);
                startForegroundProperly(FULLSCREEN_NOTIFICATION_ID, athanNotification, getForegroundServiceTypeCompat(true));
            } catch (Exception e) {
                try {
                    startForegroundProperly(FULLSCREEN_NOTIFICATION_ID, buildBackgroundCountdownNotification(), getForegroundServiceTypeCompat(false));
                } catch (Exception ex) {
                    ex.printStackTrace();
                }
            }

            try {
                AtharNotificationManager.INSTANCE.purgeAllExtraneousNotifications(this, FULLSCREEN_NOTIFICATION_ID);
            } catch (Exception ignored) {}

            try {
                Intent mainActivityIntent = new Intent(this, MainActivity.class);
                mainActivityIntent.setAction("com.athar.islamic.ACTION_ATHAN_FULLSCREEN");
                mainActivityIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);

                mainActivityIntent.putExtra("action", "com.athar.islamic.ACTION_ATHAN_FULLSCREEN");
                mainActivityIntent.putExtra("prayer_name", prayerName);
                mainActivityIntent.putExtra("prayer_time", prayerTime);
                mainActivityIntent.putExtra("alert_title", title);
                mainActivityIntent.putExtra("alert_body", body);
                mainActivityIntent.putExtra("category_badge", badge);
                mainActivityIntent.putExtra("category", category);
                mainActivityIntent.putExtra("notification_category", "prayer_athan");
                mainActivityIntent.putExtra("launch_royal_adhan", prayerName);
                mainActivityIntent.putExtra("audio_url", audioUrl);
                mainActivityIntent.putExtra("elapsed_ms", 0L);

                startActivity(mainActivityIntent);
            } catch (Exception e) {
                e.printStackTrace();
            }

            return START_NOT_STICKY;
        }

        return START_NOT_STICKY;
    }

    private void scheduleNextCountdownTick() {
        if (!isBackgroundServiceRunning) {
            return;
        }

        long now = System.currentTimeMillis();
        long remainingMs = nextPrayerEpochMs > 0 ? (nextPrayerEpochMs - now) : 3600000L;

        long delayMs = (remainingMs > 0 && remainingMs <= 3600000L) ? 1000L : 60000L;

        mainHandler.removeCallbacks(countdownTickerRunnable);
        mainHandler.postDelayed(countdownTickerRunnable, delayMs);
    }

    public Notification buildBackgroundCountdownNotification() {
        Intent contentIntent = new Intent(this, MainActivity.class);
        contentIntent.setAction("com.athar.islamic.ACTION_VIEW_PRAYER_TIMES");
        contentIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent contentPendingIntent = PendingIntent.getActivity(
            this,
            1005,
            contentIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        Bitmap appLogoBitmap = loadScaledAppLogo(96);

        String titlePrayer = (nextPrayerName != null && !nextPrayerName.trim().isEmpty()) ? nextPrayerName : "صلاة الفجر";
        String notificationTitle = "🕌 الصلاة القادمة: " + titlePrayer;
        if (nextPrayerTimeFormatted != null && !nextPrayerTimeFormatted.trim().isEmpty()) {
            notificationTitle += " (" + nextPrayerTimeFormatted + ")";
        }

        String countdownBody;
        long now = System.currentTimeMillis();
        long remainingMs = nextPrayerEpochMs > 0 ? (nextPrayerEpochMs - now) : -1L;

        if (remainingMs > 0) {
            long totalSeconds = remainingMs / 1000;
            long hours = totalSeconds / 3600;
            long minutes = (totalSeconds % 3600) / 60;
            long seconds = totalSeconds % 60;

            if (hours > 0) {
                countdownBody = String.format(Locale.getDefault(), "العد التنازلي: %02d:%02d:%02d متبقي", hours, minutes, seconds);
            } else {
                countdownBody = String.format(Locale.getDefault(), "العد التنازلي: %02d:%02d متبقي", minutes, seconds);
            }
        } else if (remainingMs <= 0 && nextPrayerEpochMs > 0) {
            countdownBody = "حان الآن موعد " + titlePrayer;
        } else {
            countdownBody = "تطبيق أَثَرُ يعمل في الخلفية لمتابعة مواقيت الصلاة بدقة";
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, BACKGROUND_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_athar)
            .setContentTitle(notificationTitle)
            .setContentText(countdownBody)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(contentPendingIntent)
            .setColor(Color.parseColor("#E6C66E"));

        if (appLogoBitmap != null) {
            builder.setLargeIcon(appLogoBitmap);
        }

        return builder.build();
    }

    private Notification buildAthanNotification(
        String prayerName,
        String prayerTime,
        String title,
        String body
    ) {
        Intent contentIntent = new Intent(this, MainActivity.class);
        contentIntent.setAction("com.athar.islamic.ACTION_ATHAN_FULLSCREEN");
        contentIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        contentIntent.putExtra("action", "com.athar.islamic.ACTION_ATHAN_FULLSCREEN");
        contentIntent.putExtra("prayer_name", prayerName);
        contentIntent.putExtra("prayer_time", prayerTime);
        contentIntent.putExtra("alert_title", title);
        contentIntent.putExtra("alert_body", body);
        contentIntent.putExtra("category", "prayer_athan");
        contentIntent.putExtra("notification_category", "prayer_athan");
        contentIntent.putExtra("launch_royal_adhan", prayerName);

        PendingIntent contentPendingIntent = PendingIntent.getActivity(
            this,
            1001,
            contentIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        Bitmap appLogoBitmap = loadScaledAppLogo(96);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, FULLSCREEN_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_athar)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setFullScreenIntent(contentPendingIntent, true)
            .setContentIntent(contentPendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .setColor(Color.parseColor("#E6C66E"));

        if (appLogoBitmap != null) {
            builder.setLargeIcon(appLogoBitmap);
        }

        return builder.build();
    }

    private Bitmap loadScaledAppLogo(int maxDim) {
        try {
            BitmapFactory.Options options = new BitmapFactory.Options();
            options.inPreferredConfig = Bitmap.Config.ARGB_8888;
            Bitmap raw = BitmapFactory.decodeResource(getResources(), R.drawable.icon_logo, options);
            if (raw == null) {
                raw = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher, options);
            }
            if (raw != null) {
                if (raw.getWidth() > maxDim || raw.getHeight() > maxDim) {
                    return Bitmap.createScaledBitmap(raw, maxDim, (maxDim * raw.getHeight()) / raw.getWidth(), true);
                }
                return raw;
            }
        } catch (Exception ignored) {}
        return null;
    }

    private void startForegroundProperly(int id, Notification notification, int foregroundServiceType) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && foregroundServiceType != 0) {
                startForeground(id, notification, foregroundServiceType);
            } else {
                startForeground(id, notification);
            }
        } catch (Exception e) {
            try {
                startForeground(id, notification);
            } catch (Exception ex) {
                ex.printStackTrace();
            }
        }
    }

    private int getForegroundServiceTypeCompat(boolean isAthan) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (isAthan) {
                return ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK;
            } else {
                return ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC;
            }
        }
        return 0;
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) return;

            NotificationChannel fullScreenChannel = new NotificationChannel(
                FULLSCREEN_CHANNEL_ID,
                "أذان ومواقيت الصلاة الفورية",
                NotificationManager.IMPORTANCE_HIGH
            );
            fullScreenChannel.enableLights(true);
            fullScreenChannel.setLightColor(Color.parseColor("#E6C66E"));
            fullScreenChannel.enableVibration(true);
            fullScreenChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            manager.createNotificationChannel(fullScreenChannel);

            NotificationChannel backgroundChannel = new NotificationChannel(
                BACKGROUND_CHANNEL_ID,
                "شريط أَثَرُ الدائم والعد التنازلي لمواقيت الصلاة",
                NotificationManager.IMPORTANCE_LOW
            );
            backgroundChannel.setShowBadge(false);
            backgroundChannel.enableVibration(false);
            backgroundChannel.setSound(null, null);
            backgroundChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            manager.createNotificationChannel(backgroundChannel);
        }
    }

    private void acquireFullWakeLock() {
        try {
            if (fullWakeLock != null && fullWakeLock.isHeld()) {
                fullWakeLock.release();
            }
        } catch (Exception ignored) {}

        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            fullWakeLock = powerManager.newWakeLock(
                PowerManager.FULL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE,
                "Athar:AthanFullWakeLock"
            );
            fullWakeLock.acquire(5 * 60 * 1000L);
        }
    }

    private void acquirePartialWakeLock() {
        if (partialWakeLock == null) {
            PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                partialWakeLock = powerManager.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "Athar:BackgroundPartialWakeLock"
                );
                partialWakeLock.acquire(24 * 60 * 60 * 1000L);
            }
        }
    }

    private void stopAthanInternal() {
        mainHandler.removeCallbacks(maxAthanTimeoutRunnable);

        try {
            AtharNotificationManager.INSTANCE.stopAndReleasePlayer(true);
        } catch (Exception ignored) {}

        isRinging = false;
        activePrayerName = "";
        activeTitle = "";
        activeBody = "";
        activeBadge = "";
        activeAudioUrl = "";

        try {
            if (fullWakeLock != null && fullWakeLock.isHeld()) {
                fullWakeLock.release();
                fullWakeLock = null;
            }
        } catch (Exception ignored) {}

        try {
            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                notificationManager.cancel(FULLSCREEN_NOTIFICATION_ID);
            }
        } catch (Exception ignored) {}

        if (!isBackgroundServiceRunning) {
            stopForeground(true);
        }
    }

    private void stopBackgroundInternal() {
        mainHandler.removeCallbacks(countdownTickerRunnable);
        stopAthanInternal();

        try {
            if (partialWakeLock != null && partialWakeLock.isHeld()) {
                partialWakeLock.release();
                partialWakeLock = null;
            }
        } catch (Exception ignored) {}

        isBackgroundServiceRunning = false;
        stopForeground(true);
        stopSelf();
    }

    public void removeFloatingOverlayInternal() {}

    @Override
    public void onDestroy() {
        activeInstance = null;
        stopBackgroundInternal();
        super.onDestroy();
    }

    public static void startAthan(Context context, String prayerName, String prayerTime) {
        startAthan(context, prayerName, prayerTime, null, null, null, null, null, true, System.currentTimeMillis());
    }

    public static void startAthan(
        Context context,
        String prayerName,
        String prayerTime,
        String title,
        String body,
        String badge,
        String category,
        String audioUrl,
        boolean playSound
    ) {
        startAthan(context, prayerName, prayerTime, title, body, badge, category, audioUrl, playSound, System.currentTimeMillis());
    }

    public static void startAthan(
        Context context,
        String prayerName,
        String prayerTime,
        String title,
        String body,
        String badge,
        String category,
        String audioUrl,
        boolean playSound,
        long triggerTimestamp
    ) {
        if (context == null) return;
        Intent intent = new Intent(context, AthanForegroundService.class);
        intent.setAction(ACTION_START_ATHAN);
        intent.putExtra("prayer_name", prayerName);
        intent.putExtra("prayer_time", prayerTime);
        if (title != null) intent.putExtra("title", title);
        if (body != null) intent.putExtra("body", body);
        if (badge != null) intent.putExtra("badge", badge);
        if (category != null) intent.putExtra("category", category);
        if (audioUrl != null) intent.putExtra("audio_url", audioUrl);
        intent.putExtra("play_sound", playSound);
        intent.putExtra("trigger_timestamp", triggerTimestamp);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void stopAthan(Context context) {
        if (context == null) return;
        Intent intent = new Intent(context, AthanForegroundService.class);
        intent.setAction(ACTION_STOP_ATHAN);
        try {
            context.startService(intent);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void startBackgroundService(Context context) {
        startBackgroundService(context, nextPrayerName, nextPrayerEpochMs, nextPrayerTimeFormatted);
    }

    public static void startBackgroundService(Context context, String prayer, long targetEpochMs, String timeStr) {
        if (context == null) return;
        if (prayer != null && !prayer.trim().isEmpty()) nextPrayerName = prayer;
        if (targetEpochMs > 0) nextPrayerEpochMs = targetEpochMs;
        if (timeStr != null && !timeStr.trim().isEmpty()) nextPrayerTimeFormatted = timeStr;

        Intent intent = new Intent(context, AthanForegroundService.class);
        intent.setAction(ACTION_START_BACKGROUND_SERVICE);
        intent.putExtra("next_prayer", nextPrayerName);
        intent.putExtra("target_epoch_ms", nextPrayerEpochMs);
        intent.putExtra("time_str", nextPrayerTimeFormatted);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void stopBackgroundService(Context context) {
        if (context == null) return;
        Intent intent = new Intent(context, AthanForegroundService.class);
        intent.setAction(ACTION_STOP_BACKGROUND_SERVICE);
        try {
            context.startService(intent);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void updateCountdown(Context context, String prayer, long targetEpochMs, String timeStr) {
        if (prayer != null && !prayer.trim().isEmpty()) nextPrayerName = prayer;
        if (targetEpochMs > 0) nextPrayerEpochMs = targetEpochMs;
        if (timeStr != null && !timeStr.trim().isEmpty()) nextPrayerTimeFormatted = timeStr;

        if (context == null) return;
        Intent intent = new Intent(context, AthanForegroundService.class);
        intent.setAction(ACTION_UPDATE_COUNTDOWN);
        intent.putExtra("next_prayer", nextPrayerName);
        intent.putExtra("target_epoch_ms", nextPrayerEpochMs);
        intent.putExtra("time_str", nextPrayerTimeFormatted);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void hideOverlayInsideApp() {
        AthanForegroundService instance = activeInstance;
        if (instance != null) {
            instance.removeFloatingOverlayInternal();
        }
    }

    public static void showOverlayOutsideApp(Context context) {
        // Stub for AtharNotificationManager compatibility
    }
}
