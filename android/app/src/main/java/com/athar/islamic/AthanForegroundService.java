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

            try {
                AtharPrayerAlarmScheduler.INSTANCE.checkAndTriggerDueReminders(AthanForegroundService.this);
            } catch (Exception ignored) {}

            long now = System.currentTimeMillis();
            advanceToNextPrayerIfExpired(now);

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

        if (nextPrayerEpochMs <= 0) {
            try {
                android.content.SharedPreferences prefs = getSharedPreferences("AtharNotificationSettings", Context.MODE_PRIVATE);
                long savedEpoch = prefs.getLong("last_ongoing_prayer_epoch", 0L);
                if (savedEpoch > 0) {
                    nextPrayerEpochMs = savedEpoch;
                    nextPrayerName = prefs.getString("last_ongoing_prayer_name", nextPrayerName);
                    nextPrayerTimeFormatted = prefs.getString("last_ongoing_prayer_time_str", nextPrayerTimeFormatted);
                }
            } catch (Exception ignored) {}
        }
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
                String scheduleJson = intent.getStringExtra("daily_prayer_schedule");
                if (scheduleJson != null && !scheduleJson.trim().isEmpty()) {
                    try {
                        getSharedPreferences("AtharNotificationSettings", Context.MODE_PRIVATE)
                            .edit().putString("daily_prayer_schedule", scheduleJson).apply();
                    } catch (Exception ignored) {}
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

        if (action == null) {
            // Android OS restarted the sticky service after memory reclamation.
            // Only restore the quiet ongoing background countdown notification without interrupting the user.
            if (isBackgroundServiceRunning) {
                startForegroundProperly(
                    BACKGROUND_NOTIFICATION_ID,
                    buildBackgroundCountdownNotification(),
                    getForegroundServiceTypeCompat(false)
                );
                scheduleNextCountdownTick();
                return START_STICKY;
            }
            return START_NOT_STICKY;
        }

        if (ACTION_START_ATHAN.equals(action)) {
            // Intrusive adhan popup and forced screen takeover deleted per user request.
            // Only ensure the quiet ongoing countdown notification continues in the status bar.
            if (isBackgroundServiceRunning) {
                startForegroundProperly(
                    BACKGROUND_NOTIFICATION_ID,
                    buildBackgroundCountdownNotification(),
                    getForegroundServiceTypeCompat(false)
                );
                scheduleNextCountdownTick();
                return START_STICKY;
            }
            return START_NOT_STICKY;
        }

        return START_NOT_STICKY;
    }

    private void advanceToNextPrayerIfExpired(long now) {
        if (nextPrayerEpochMs <= 0) return;
        long elapsedMs = now - nextPrayerEpochMs;
        // If 15 minutes passed since the prayer time arrived, automatically advance to next prayer
        if (elapsedMs >= 15 * 60 * 1000L) {
            try {
                android.content.SharedPreferences prefs = getSharedPreferences("AtharNotificationSettings", Context.MODE_PRIVATE);
                String scheduleJson = prefs.getString("daily_prayer_schedule", null);
                if (scheduleJson != null && !scheduleJson.trim().isEmpty()) {
                    org.json.JSONArray arr = new org.json.JSONArray(scheduleJson);
                    boolean found = false;
                    for (int i = 0; i < arr.length(); i++) {
                        org.json.JSONObject obj = arr.getJSONObject(i);
                        long epoch = obj.optLong("epochMs", 0L);
                        if (epoch > now) {
                            String pName = obj.optString("name", "الصلاة القادمة");
                            nextPrayerName = pName;
                            nextPrayerEpochMs = epoch;
                            nextPrayerTimeFormatted = obj.optString("timeFormatted", "");
                            found = true;
                            android.util.Log.i("AthanForegroundService", "Auto-advanced ongoing notification to next prayer: " + pName + " at " + nextPrayerTimeFormatted);
                            break;
                        }
                    }
                    if (!found && arr.length() > 0) {
                        // After Isha: next prayer is tomorrow's first prayer (Fajr)
                        org.json.JSONObject firstPrayer = arr.getJSONObject(0);
                        long tomorrowEpoch = firstPrayer.optLong("epochMs", 0L) + (24L * 60 * 60 * 1000L);
                        nextPrayerName = firstPrayer.optString("name", "صلاة الفجر");
                        nextPrayerEpochMs = tomorrowEpoch;
                        nextPrayerTimeFormatted = firstPrayer.optString("timeFormatted", "");
                        android.util.Log.i("AthanForegroundService", "Auto-advanced ongoing notification to tomorrow's Fajr at " + nextPrayerTimeFormatted);
                    }

                    // Persist the auto-advanced prayer in preferences
                    prefs.edit()
                        .putString("last_ongoing_prayer_name", nextPrayerName)
                        .putLong("last_ongoing_prayer_epoch", nextPrayerEpochMs)
                        .putString("last_ongoing_prayer_time_str", nextPrayerTimeFormatted)
                        .apply();
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    private void scheduleNextCountdownTick() {
        if (!isBackgroundServiceRunning) {
            return;
        }

        long now = System.currentTimeMillis();
        long remainingMs = nextPrayerEpochMs > 0 ? (nextPrayerEpochMs - now) : 0L;

        mainHandler.removeCallbacks(countdownTickerRunnable);
        if (remainingMs > 0) {
            // Wake up when prayer time arrives (+500ms)
            mainHandler.postDelayed(countdownTickerRunnable, remainingMs + 500L);
        } else if (nextPrayerEpochMs > 0 && (now - nextPrayerEpochMs) < 15 * 60 * 1000L) {
            // Inside the 15-minute window of current prayer: wake up right after 15 minutes to advance to next prayer
            long timeUntil15Min = (15 * 60 * 1000L) - (now - nextPrayerEpochMs);
            mainHandler.postDelayed(countdownTickerRunnable, Math.max(timeUntil15Min + 1000L, 5000L));
        } else {
            // Periodic sanity check every 10 minutes when idle
            mainHandler.postDelayed(countdownTickerRunnable, 10 * 60 * 1000L);
        }
    }

    public Notification buildBackgroundCountdownNotification() {
        Intent contentIntent = new Intent(this, MainActivity.class);
        contentIntent.setAction("com.athar.islamic.ACTION_VIEW_HOME");
        contentIntent.putExtra("target_tab", "home");
        contentIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent contentPendingIntent = PendingIntent.getActivity(
            this,
            1005,
            contentIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        Bitmap appLogoBitmap = loadScaledAppLogo(96);

        long now = System.currentTimeMillis();
        advanceToNextPrayerIfExpired(now);

        String titlePrayer = (nextPrayerName != null && !nextPrayerName.trim().isEmpty()) ? nextPrayerName : "صلاة الفجر";
        String cleanPrayerName = titlePrayer.replace("صلاة ", "").trim();

        String countdownTitle;
        String countdownBody;
        long remainingMs = nextPrayerEpochMs > 0 ? (nextPrayerEpochMs - now) : -1L;

        if (remainingMs > 0) {
            countdownTitle = "الصلاة القادمة: " + cleanPrayerName;
            countdownBody = (nextPrayerTimeFormatted != null && !nextPrayerTimeFormatted.isEmpty())
                ? "موعد الأذان: " + nextPrayerTimeFormatted
                : "تطبيق أَثَرُ يتابع المواقيت بدقة";
        } else if (remainingMs <= 0 && nextPrayerEpochMs > 0 && (now - nextPrayerEpochMs) < 15 * 60 * 1000L) {
            countdownTitle = "حان الآن موعد " + titlePrayer;
            countdownBody = "حي على الصلاة • حي على الفلاح";
        } else {
            countdownTitle = "أَثَرُ | رفيقك اليومي";
            countdownBody = "متابعة مواقيت الصلاة والأذكار بدقة";
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, BACKGROUND_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_athar)
            .setContentTitle(countdownTitle)
            .setContentText(countdownBody)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(contentPendingIntent)
            .setColor(Color.parseColor("#E6C66E"));

        // Native Android OS Chronometer: Renders smooth live countdown without waking CPU
        if (nextPrayerEpochMs > now) {
            builder.setWhen(nextPrayerEpochMs)
                   .setShowWhen(true)
                   .setUsesChronometer(true)
                   .setChronometerCountDown(true);
        }

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
                PowerManager.PARTIAL_WAKE_LOCK,
                "Athar:AthanFullWakeLock"
            );
            fullWakeLock.acquire(4 * 60 * 1000L);
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
                partialWakeLock.acquire(10 * 60 * 1000L);
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
        // Intrusive adhan popup deleted per user request. Keep background countdown running quietly.
        if (context == null) return;
        startBackgroundService(context);
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
        if (context == null) return;
        startBackgroundService(context);
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
        startBackgroundService(context);
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
        startBackgroundService(context, prayer, targetEpochMs, timeStr, null);
    }

    public static void startBackgroundService(Context context, String prayer, long targetEpochMs, String timeStr, String scheduleJson) {
        if (context == null) return;
        if (prayer != null && !prayer.trim().isEmpty()) nextPrayerName = prayer;
        if (targetEpochMs > 0) nextPrayerEpochMs = targetEpochMs;
        if (timeStr != null && !timeStr.trim().isEmpty()) nextPrayerTimeFormatted = timeStr;
        if (scheduleJson != null && !scheduleJson.trim().isEmpty()) {
            try {
                context.getSharedPreferences("AtharNotificationSettings", Context.MODE_PRIVATE)
                    .edit().putString("daily_prayer_schedule", scheduleJson).apply();
            } catch (Exception ignored) {}
        }

        Intent intent = new Intent(context, AthanForegroundService.class);
        intent.setAction(ACTION_START_BACKGROUND_SERVICE);
        intent.putExtra("next_prayer", nextPrayerName);
        intent.putExtra("target_epoch_ms", nextPrayerEpochMs);
        intent.putExtra("time_str", nextPrayerTimeFormatted);
        if (scheduleJson != null && !scheduleJson.trim().isEmpty()) {
            intent.putExtra("daily_prayer_schedule", scheduleJson);
        }

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
        updateCountdown(context, prayer, targetEpochMs, timeStr, null);
    }

    public static void updateCountdown(Context context, String prayer, long targetEpochMs, String timeStr, String scheduleJson) {
        if (prayer != null && !prayer.trim().isEmpty()) nextPrayerName = prayer;
        if (targetEpochMs > 0) nextPrayerEpochMs = targetEpochMs;
        if (timeStr != null && !timeStr.trim().isEmpty()) nextPrayerTimeFormatted = timeStr;

        if (context == null) return;
        if (scheduleJson != null && !scheduleJson.trim().isEmpty()) {
            try {
                android.content.SharedPreferences prefs = context.getSharedPreferences("AtharNotificationSettings", Context.MODE_PRIVATE);
                prefs.edit().putString("daily_prayer_schedule", scheduleJson).apply();
            } catch (Exception ignored) {}
        }

        Intent intent = new Intent(context, AthanForegroundService.class);
        intent.setAction(ACTION_UPDATE_COUNTDOWN);
        intent.putExtra("next_prayer", nextPrayerName);
        intent.putExtra("target_epoch_ms", nextPrayerEpochMs);
        intent.putExtra("time_str", nextPrayerTimeFormatted);
        if (scheduleJson != null && !scheduleJson.trim().isEmpty()) {
            intent.putExtra("daily_prayer_schedule", scheduleJson);
        }

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
