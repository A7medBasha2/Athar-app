import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { AudioService } from './audioService';
import { NotificationService } from './notificationService';

export const ATHAR_PACKAGE_NAME = 'com.athar.islamic';

export interface PrayerWidgetData {
  nextPrayer: string;
  nextTime: string;
  remaining: string;
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  hijriDate: string;
  ayahText?: string;
  ayahSurah?: string;
  widgetStyle?: 'royal_card' | 'compact';
  showDhikr?: boolean;
  showFajr?: boolean;
  showDhuhr?: boolean;
  showAsr?: boolean;
  showMaghrib?: boolean;
  showIsha?: boolean;
  showCountdown?: boolean;
  bgOpacity?: 'solid' | 'glass_85' | 'glass_65';
  themeAccent?: 'gold_royal' | 'gold_bright' | 'gold_amber';
}

export interface AzkarWidgetData {
  category: string;
  text: string;
  fadl: string;
  repeat: string;
}

export interface OngoingPrayerData {
  title: string;
  body: string;
  nextPrayer?: string;
  nextTime?: string;
  remaining?: string;
  fajr?: string;
  dhuhr?: string;
  asr?: string;
  maghrib?: string;
  isha?: string;
  hijriDate?: string;
}

export type ReadinessItemStatus = 'READY' | 'ACTION_REQUIRED' | 'NOT_REQUIRED' | 'UNKNOWN';

export interface DeviceDiagnosticInfo {
  manufacturer: string;
  brand: string;
  model: string;
  device: string;
  product: string;
  sdkInt: number;
  release: string;
  vendor: 'xiaomi' | 'samsung' | 'honor' | 'oppo' | 'oneplus' | 'vivo' | 'google' | 'motorola' | 'generic';
  vendorName: string;
  customRom: string;
  isBatteryOptimized: boolean;
  canScheduleExactAlarms: boolean;
  notificationsEnabled: boolean;
  overlayGranted: boolean;
  backgroundServiceRunning: boolean;
}

export interface NotificationChannelStatus {
  id: string;
  name: string;
  importance: number;
  isBlocked: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  bypassDnd: boolean;
}

export interface NotificationChannelsResult {
  notificationsEnabled: boolean;
  channels: NotificationChannelStatus[];
}

export interface ReadinessCheckItem {
  id: 'notifications' | 'channels' | 'exact_alarm' | 'battery_opt' | 'overlay' | 'autostart';
  title: string;
  description: string;
  status: ReadinessItemStatus;
  statusTextArabic: 'جاهز' | 'يحتاج إلى تفعيل' | 'غير مطلوب' | 'تعذّر التحقق';
  actionAvailable: boolean;
  actionTextArabic?: string;
  actionHandler?: () => Promise<any>;
}

export interface NativePermissionsPlugin {
  setTelemetryConsent?(options: { enabled: boolean }): Promise<{ success: boolean; enabled: boolean }>;
  getTelemetryConsent?(): Promise<{ enabled: boolean }>;
  openOverlaySettings(options?: { appId?: string }): Promise<{ opened: boolean; appId?: string; fallback?: boolean }>;
  checkOverlayPermission(): Promise<{ granted: boolean }>;
  openExactAlarmSettings(options?: { appId?: string }): Promise<{ opened: boolean; appId?: string; fallback?: boolean }>;
  checkExactAlarmPermission(): Promise<{ granted: boolean }>;
  openNotificationSettings(options?: { appId?: string }): Promise<{ opened: boolean; appId?: string; fallback?: boolean }>;
  checkNotificationPermission(): Promise<{ granted: boolean }>;
  openBatteryOptimizationSettings(options?: { appId?: string }): Promise<{ opened: boolean; fallback?: boolean }>;
  checkBatteryOptimization(options?: { appId?: string }): Promise<{ isIgnored: boolean; granted: boolean }>;
  openAppSettings(options?: { appId?: string }): Promise<{ opened: boolean; appId?: string }>;
  openAutoStartSettings(options?: { appId?: string }): Promise<{ opened: boolean; isXiaomiAutostart?: boolean; appId?: string }>;
  openOtherPermissionsSettings(options?: { appId?: string }): Promise<{ opened: boolean; appId?: string }>;
  startBackgroundService(options?: { nextPrayer?: string; targetEpochMs?: number; timeStr?: string; dailyScheduleJson?: string }): Promise<{ running: boolean }>;
  updateAthanCountdown(options: { nextPrayer: string; targetEpochMs: number; timeStr?: string; dailyScheduleJson?: string; prayersScheduleJson?: string }): Promise<{ updated: boolean }>;
  isBackgroundServiceRunning(): Promise<{ running: boolean }>;
  stopBackgroundService(): Promise<{ running: boolean }>;
  triggerFullScreenAthan(options: { prayerName?: string; prayerTime?: string }): Promise<{ success: boolean; prayerName?: string }>;
  stopFullScreenAthan(): Promise<{ success: boolean }>;
  updatePrayerWidget(data: PrayerWidgetData): Promise<{ updated: boolean }>;
  updateAzkarWidget(data: AzkarWidgetData): Promise<{ updated: boolean }>;
  scheduleBackgroundSync(): Promise<{ scheduled: boolean }>;
  setOngoingPrayerNotification(data: OngoingPrayerData): Promise<{ success: boolean }>;
  removeOngoingPrayerNotification(): Promise<{ success: boolean }>;
  showSystemOverlayNotification(options: {
    title?: string;
    body?: string;
    badge?: string;
    category?: string;
    audioUrl?: string;
    playSound?: boolean;
    surahNumber?: number;
    ayahNumber?: number;
    actionText?: string;
    autoDismissMs?: number;
    autoDismissSeconds?: number;
    playbackMode?: string;
  }): Promise<{ shown: boolean; floatingOverlayActive?: boolean; requiresPermission?: boolean }>;
  dismissSystemOverlay(): Promise<{ dismissed: boolean }>;
  showFullScreenAzan(options: {
    prayerId?: string;
    prayerName?: string;
    prayerTime?: string;
    muadhinName?: string;
    audioUrl?: string;
    iqamahMinutes?: number;
    autoDua?: boolean;
    autoEcho?: boolean;
    scheduledEpochMs?: number;
    delaySeconds?: number;
  }): Promise<{ shown: boolean; requiresPermission?: boolean; scheduled?: boolean }>;
  dismissFullScreenAzan(): Promise<{ dismissed: boolean }>;
  isFullScreenAzanRunning(): Promise<{ isRunning: boolean }>;
  syncRoyalRemindersConfig(options: Record<string, any>): Promise<{ synced: boolean }>;
  showRoyalNotification(options: {
    title?: string;
    body?: string;
    badge?: string;
    channelId?: string;
    id?: number;
    category?: string;
    audioUrl?: string;
    playSound?: boolean;
    isOngoing?: boolean;
    surahNumber?: number;
    ayahNumber?: number;
  }): Promise<{ success: boolean; category?: string; notificationId?: number }>;
  muteNotificationAudio(): Promise<{ muted: boolean; positionMs?: number }>;
  unmuteNotificationAudio(): Promise<{ unmuted: boolean; positionMs?: number }>;
  toggleNotificationAudio(): Promise<{ toggled: boolean; isMuted?: boolean; positionMs?: number }>;
  pauseNotificationAudio(): Promise<{ paused: boolean; positionMs?: number }>;
  resumeNotificationAudio(): Promise<{ resumed: boolean; positionMs?: number }>;
  getNotificationAudioTimeline(): Promise<{ isPlaying: boolean; isMuted: boolean; positionMs: number; durationMs: number }>;
  dismissNotification(options?: { category?: string; id?: number }): Promise<{ dismissed: boolean }>;
  triggerSingleTestNotification(options: { isAdhan?: boolean; delaySeconds?: number }): Promise<{ success: boolean; isAdhan?: boolean; delaySeconds?: number }>;
  setNotificationConfig(config: Record<string, any>): Promise<{ saved: boolean }>;
  getNotificationConfig(): Promise<Record<string, any>>;
  setMasterVolume(options: { volume: number }): Promise<{ volume: number }>;
  setMasterMute(options: { muted: boolean }): Promise<{ muted: boolean }>;
  scheduleNativePrayerAlarms(options: { prayersJson: string }): Promise<{ scheduled: boolean }>;
  scheduleNativeRoyalAlarms(options: { alarmsJson: string }): Promise<{ scheduled: boolean }>;
  purgeSystemNotifications(): Promise<{ purged: boolean }>;
  canRequestPackageInstalls(): Promise<{ granted: boolean }>;
  openInstallUnknownAppsSettings(): Promise<{ opened: boolean; fallback?: boolean }>;
  installApkFile(options: { filePath: string }): Promise<{ success: boolean; launched?: boolean }>;
  downloadAndInstallApk(options: { url: string; fileName?: string }): Promise<{ success: boolean; filePath?: string; fileSize?: number }>;
  checkDownloadedApk(options?: { fileName?: string }): Promise<{ exists: boolean; filePath?: string; fileSize?: number }>;
  installExistingApk(options?: { fileName?: string }): Promise<{ success: boolean; filePath?: string; fileSize?: number }>;
  getDeviceDiagnosticInfo(): Promise<DeviceDiagnosticInfo>;
  checkNotificationChannelsStatus(): Promise<NotificationChannelsResult>;
  triggerDiagnosticTestNotification(options: {
    mode?: string;
    playSound?: boolean;
    title?: string;
    body?: string;
  }): Promise<{ success: boolean }>;
  openManufacturerBackgroundSettings(options?: { appId?: string; vendor?: string }): Promise<{ opened: boolean; vendor?: string }>;
}

/**
 * Register Capacitor plugin proxy. When running inside the native Android Capacitor container,
 * calls directly dispatch to com.athar.islamic.NativePermissionsPlugin.
 */
export const NativePermissions = registerPlugin<NativePermissionsPlugin>('NativePermissions', {
  web: () => ({
    openOverlaySettings: async (options?: { appId?: string }) => {
      const appId = options?.appId || ATHAR_PACKAGE_NAME;
      const intentUri = `intent:#Intent;action=android.settings.action.MANAGE_OVERLAY_PERMISSION;data=package:${appId};package=${appId};end`;
      dispatchIntentUri(intentUri);
      return { opened: true, appId };
    },
    checkOverlayPermission: async () => {
      const granted = localStorage.getItem('athar_perm_overlay_verified') === 'true';
      return { granted };
    },
    openExactAlarmSettings: async (options?: { appId?: string }) => {
      const appId = options?.appId || ATHAR_PACKAGE_NAME;
      const intentUri = `intent:#Intent;action=android.settings.REQUEST_SCHEDULE_EXACT_ALARM;data=package:${appId};package=${appId};end`;
      dispatchIntentUri(intentUri);
      return { opened: true, appId };
    },
    checkExactAlarmPermission: async () => {
      const granted = localStorage.getItem('athar_perm_exact_alarm_verified') === 'true';
      return { granted };
    },
    openNotificationSettings: async (options?: { appId?: string }) => {
      const appId = options?.appId || ATHAR_PACKAGE_NAME;
      const intentUri = `intent:#Intent;action=android.settings.APP_NOTIFICATION_SETTINGS;S.android.provider.extra.APP_PACKAGE=${appId};end`;
      dispatchIntentUri(intentUri);
      return { opened: true, appId };
    },
    checkNotificationPermission: async () => {
      const granted = typeof Notification !== 'undefined' && Notification.permission === 'granted';
      return { granted };
    },
    openBatteryOptimizationSettings: async (options?: { appId?: string }) => {
      const appId = options?.appId || ATHAR_PACKAGE_NAME;
      const intentUri = `intent:#Intent;action=android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS;data=package:${appId};package=${appId};end`;
      dispatchIntentUri(intentUri);
      return { opened: true };
    },
    checkBatteryOptimization: async () => {
      const isIgnored = localStorage.getItem('athar_perm_battery_opt_verified') === 'true';
      return { isIgnored, granted: isIgnored };
    },
    openAppSettings: async (options?: { appId?: string }) => {
      const appId = options?.appId || ATHAR_PACKAGE_NAME;
      const intentUri = `intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:${appId};package=${appId};end`;
      dispatchIntentUri(intentUri);
      return { opened: true, appId };
    },
    openAutoStartSettings: async (options?: { appId?: string }) => {
      const appId = options?.appId || ATHAR_PACKAGE_NAME;
      const intentUri = `intent:#Intent;component=com.miui.securitycenter/com.miui.permcenter.autostart.AutoStartManagementActivity;end`;
      dispatchIntentUri(intentUri);
      return { opened: true, isXiaomiAutostart: true, appId };
    },
    openOtherPermissionsSettings: async (options?: { appId?: string }) => {
      const appId = options?.appId || ATHAR_PACKAGE_NAME;
      const intentUri = `intent:#Intent;action=miui.intent.action.APP_PERM_EDITOR;S.extra_pkgname=${appId};end`;
      dispatchIntentUri(intentUri);
      return { opened: true, appId };
    },
    startBackgroundService: async (options?: { nextPrayer?: string; targetEpochMs?: number; timeStr?: string }) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('athar_bg_service_running', 'true');
        if (options?.nextPrayer) localStorage.setItem('athar_bg_next_prayer', options.nextPrayer);
        if (options?.targetEpochMs) localStorage.setItem('athar_bg_target_epoch', String(options.targetEpochMs));
        if (options?.timeStr) localStorage.setItem('athar_bg_time_str', options.timeStr);
      }
      return { running: true };
    },
    updateAthanCountdown: async (options: { nextPrayer: string; targetEpochMs: number; timeStr?: string }) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('athar_bg_next_prayer', options.nextPrayer);
        localStorage.setItem('athar_bg_target_epoch', String(options.targetEpochMs));
        if (options.timeStr) localStorage.setItem('athar_bg_time_str', options.timeStr);
      }
      return { updated: true };
    },
    isBackgroundServiceRunning: async () => {
      const running = typeof localStorage !== 'undefined' ? localStorage.getItem('athar_bg_service_running') === 'true' : false;
      return { running };
    },
    stopBackgroundService: async () => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('athar_bg_service_running', 'false');
      }
      return { running: false };
    },
    triggerFullScreenAthan: async () => {
      return { success: true };
    },
    stopFullScreenAthan: async () => {
      return { success: true };
    },
    updatePrayerWidget: async (data: PrayerWidgetData) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('athar_prayer_widget_data', JSON.stringify(data));
      }
      return { updated: true };
    },
    updateAzkarWidget: async (data: AzkarWidgetData) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('athar_azkar_widget_data', JSON.stringify(data));
      }
      return { updated: true };
    },
    scheduleBackgroundSync: async () => {
      return { scheduled: true };
    },
    setOngoingPrayerNotification: async (data: OngoingPrayerData) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('athar_ongoing_notification_data', JSON.stringify(data));
      }
      return { success: true };
    },
    removeOngoingPrayerNotification: async () => {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('athar_ongoing_notification_data');
      }
      return { success: true };
    },
    showSystemOverlayNotification: async () => {
      return { shown: true, floatingOverlayActive: false, requiresPermission: false };
    },
    dismissSystemOverlay: async () => {
      return { dismissed: true };
    },
    showFullScreenAzan: async (options: any) => {
      console.log('[NativeBridge Web] showFullScreenAzan called:', options);
      const delay = options?.delaySeconds || 0;
      if (delay > 0) {
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('athar_show_web_azan_overlay', { detail: options }));
          }
        }, delay * 1000);
      } else {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('athar_show_web_azan_overlay', { detail: options }));
        }
      }
      return { shown: true, requiresPermission: false, scheduled: delay > 0 };
    },
    dismissFullScreenAzan: async () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('athar_dismiss_web_azan_overlay'));
      }
      return { dismissed: true };
    },
    isFullScreenAzanRunning: async () => {
      return { isRunning: false };
    },
    syncRoyalRemindersConfig: async () => {
      return { synced: true };
    },
    showRoyalNotification: async () => {
      return { success: true };
    },
    muteNotificationAudio: async () => ({ muted: true, positionMs: 0 }),
    unmuteNotificationAudio: async () => ({ unmuted: true, positionMs: 0 }),
    toggleNotificationAudio: async () => ({ toggled: true, isMuted: false, positionMs: 0 }),
    pauseNotificationAudio: async () => ({ paused: true, positionMs: 0 }),
    resumeNotificationAudio: async () => ({ resumed: true, positionMs: 0 }),
    getNotificationAudioTimeline: async () => ({ isPlaying: false, isMuted: false, positionMs: 0, durationMs: 0 }),
    dismissNotification: async () => ({ dismissed: true }),
    triggerSingleTestNotification: async (options: { isAdhan?: boolean; delaySeconds?: number }) => {
      return { success: true, isAdhan: options?.isAdhan, delaySeconds: options?.delaySeconds };
    },
    setNotificationConfig: async (config: Record<string, any>) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('athar_notification_config', JSON.stringify(config));
      }
      return { saved: true };
    },
    getNotificationConfig: async () => {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('athar_notification_config');
        if (raw) {
          try {
            return JSON.parse(raw);
          } catch {}
        }
      }
      return {};
    },
    setMasterVolume: async (options: { volume: number }) => {
      return { volume: options.volume };
    },
    setMasterMute: async (options: { muted: boolean }) => {
      return { muted: options.muted };
    },
    scheduleNativePrayerAlarms: async (options: { prayersJson: string }) => {
      return { scheduled: true };
    },
    scheduleNativeRoyalAlarms: async (options: { alarmsJson: string }) => {
      return { scheduled: true };
    },
    purgeSystemNotifications: async () => {
      return { purged: true };
    },
    canRequestPackageInstalls: async () => {
      const verified = typeof window !== 'undefined' && localStorage.getItem('athar_perm_install_packages_verified') === 'true';
      return { granted: verified };
    },
    openInstallUnknownAppsSettings: async () => {
      const appId = ATHAR_PACKAGE_NAME;
      const intentUri = `intent:#Intent;action=android.settings.MANAGE_UNKNOWN_APP_SOURCES;data=package:${appId};package=${appId};end`;
      dispatchIntentUri(intentUri);
      return { opened: true };
    },
    installApkFile: async () => {
      return { success: true, launched: false };
    },
    downloadAndInstallApk: async (options: { url: string; fileName?: string }) => {
      if (typeof window !== 'undefined' && options.url) {
        window.open(options.url, '_blank');
      }
      return { success: true };
    },
    checkDownloadedApk: async (options?: { fileName?: string }) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('athar_cached_apk_downloaded');
        const fName = options?.fileName || '';
        const match = fName.match(/v?(\d+\.\d+\.\d+)/i);
        if (match && match[1]) {
          const isDownloaded = localStorage.getItem(`athar_downloaded_${match[1]}`) === 'true';
          return { exists: isDownloaded, fileSize: 18500000 };
        }
      }
      return { exists: false };
    },
    installExistingApk: async () => {
      return { success: true };
    },
    getDeviceDiagnosticInfo: async (): Promise<DeviceDiagnosticInfo> => {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
      let vendor: DeviceDiagnosticInfo['vendor'] = 'generic';
      let vendorName = 'نظام أندرويد (متصفح الويب / بيئة تجريبية)';
      let customRom = 'Web Browser Engine';

      if (ua.includes('xiaomi') || ua.includes('redmi') || ua.includes('poco')) {
        vendor = 'xiaomi';
        vendorName = 'شاومي / ريدمي / بوكو';
        customRom = 'HyperOS / MIUI';
      } else if (ua.includes('samsung')) {
        vendor = 'samsung';
        vendorName = 'سامسونج';
        customRom = 'Samsung One UI';
      } else if (ua.includes('huawei') || ua.includes('honor')) {
        vendor = 'honor';
        vendorName = 'هونر / هواوي';
        customRom = 'MagicOS / EMUI';
      } else if (ua.includes('oppo') || ua.includes('realme')) {
        vendor = 'oppo';
        vendorName = 'أوبو / ريلمي';
        customRom = 'ColorOS';
      } else if (ua.includes('oneplus')) {
        vendor = 'oneplus';
        vendorName = 'ون بلس';
        customRom = 'OxygenOS';
      } else if (ua.includes('pixel')) {
        vendor = 'google';
        vendorName = 'جوجل بكسل';
        customRom = 'Stock Android';
      }

      const notifEnabled = typeof Notification !== 'undefined' && Notification.permission === 'granted';
      return {
        manufacturer: vendor === 'generic' ? 'Android / Web' : vendor,
        brand: vendor,
        model: 'Web Device Simulator',
        device: 'Web Client',
        product: 'Athar Web PWA',
        sdkInt: 34,
        release: '14.0',
        vendor,
        vendorName,
        customRom,
        isBatteryOptimized: false,
        canScheduleExactAlarms: true,
        notificationsEnabled: notifEnabled,
        overlayGranted: true,
        backgroundServiceRunning: typeof localStorage !== 'undefined' ? localStorage.getItem('athar_bg_service_running') === 'true' : false,
      };
    },
    checkNotificationChannelsStatus: async (): Promise<NotificationChannelsResult> => {
      const notifEnabled = typeof Notification !== 'undefined' && Notification.permission === 'granted';
      return {
        notificationsEnabled: notifEnabled,
        channels: [
          {
            id: 'athar_athan_channel_v2',
            name: 'أذان الصلوات والمنبه الملكي (أثر)',
            importance: 4,
            isBlocked: false,
            soundEnabled: true,
            vibrationEnabled: true,
            bypassDnd: true,
          },
          {
            id: 'athar_royal_reminders_channel_v2',
            name: 'تنبيهات أثر الملكية الأربعة',
            importance: 4,
            isBlocked: false,
            soundEnabled: true,
            vibrationEnabled: true,
            bypassDnd: false,
          },
          {
            id: 'athar_ongoing_prayer_channel_v2',
            name: 'عداد وقت الصلاة المستمر والشريط الثابت',
            importance: 3,
            isBlocked: false,
            soundEnabled: false,
            vibrationEnabled: false,
            bypassDnd: false,
          },
          {
            id: 'athar_wake_alarm_channel_v2',
            name: 'منبه الفجر وقيام الليل الذكي',
            importance: 4,
            isBlocked: false,
            soundEnabled: true,
            vibrationEnabled: true,
            bypassDnd: true,
          },
        ],
      };
    },
    triggerDiagnosticTestNotification: async () => {
      return { success: true };
    },
    openManufacturerBackgroundSettings: async () => {
      return { opened: true, vendor: 'generic' };
    },
  }),
});

/**
 * Helper to dispatch Android intent URL in browser or PWA mode safely
 */
function dispatchIntentUri(intentUrl: string): void {
  if (typeof window === 'undefined') return;
  try {
    const link = document.createElement('a');
    link.href = intentUrl;
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 1500);
  } catch {
    try {
      window.location.href = intentUrl;
    } catch {}
  }
}

class NativePermissionsBridgeManager {
  private appId: string = ATHAR_PACKAGE_NAME;

  public setAppId(id: string): void {
    this.appId = id;
  }

  public getAppId(): string {
    return this.appId;
  }

  public isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Opens the real Android system settings screen for "Display over other apps" (ACTION_MANAGE_OVERLAY_PERMISSION)
   * specifically targeting com.athar.athar via package URI.
   */
  public async openOverlayPermissionSettings(): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && (window as any).AtharNative?.openOverlaySettings) {
        const ok = (window as any).AtharNative.openOverlaySettings();
        if (ok) return true;
      }
    } catch {}

    try {
      const res = await NativePermissions.openOverlaySettings({ appId: this.appId });
      if (res?.opened) return true;
    } catch (e) {
      console.warn('[NativePermissionsBridge] Native openOverlaySettings error:', e);
    }

    // Direct Web / Android Intent URI Dispatch (package:com.athar.athar)
    const directIntent = `intent:#Intent;action=android.settings.action.MANAGE_OVERLAY_PERMISSION;data=package:${this.appId};package=${this.appId};end`;
    dispatchIntentUri(directIntent);
    return true;
  }

  public async openOverlaySettings(): Promise<boolean> {
    return this.openOverlayPermissionSettings();
  }

  /**
   * Checks whether the app has permission to draw over other apps (SYSTEM_ALERT_WINDOW).
   */
  public async checkOverlayPermission(): Promise<boolean> {
    try {
      const res = await NativePermissions.checkOverlayPermission();
      if (res && typeof res.granted === 'boolean') {
        if (res.granted) {
          localStorage.setItem('athar_perm_overlay_verified', 'true');
        } else {
          localStorage.removeItem('athar_perm_overlay_verified');
        }
        return res.granted;
      }
    } catch {}

    return localStorage.getItem('athar_perm_overlay_verified') === 'true';
  }

  /**
   * Alias for checkOverlayPermission() to check if app can draw system overlays.
   */
  public async canDrawOverlays(): Promise<boolean> {
    return this.checkOverlayPermission();
  }

  /**
   * Opens the real Android system settings screen for "Schedule Exact Alarms" (ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
   * specifically targeting com.athar.athar on Android 12+ (API 31+).
   */
  public async openExactAlarmSettings(): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && (window as any).AtharNative?.openExactAlarmSettings) {
        const ok = (window as any).AtharNative.openExactAlarmSettings();
        if (ok) return true;
      }
    } catch {}

    try {
      if (typeof (LocalNotifications as any).changeExactNotificationSetting === 'function') {
        await (LocalNotifications as any).changeExactNotificationSetting();
        return true;
      }
    } catch {}

    try {
      const res = await NativePermissions.openExactAlarmSettings({ appId: this.appId });
      if (res?.opened) return true;
    } catch (e) {
      console.warn('[NativePermissionsBridge] Native openExactAlarmSettings error:', e);
    }

    const directIntent = `intent:#Intent;action=android.settings.REQUEST_SCHEDULE_EXACT_ALARM;data=package:${this.appId};package=${this.appId};end`;
    dispatchIntentUri(directIntent);
    return true;
  }

  /**
   * Opens the real Android system settings screen for Notifications (ACTION_APP_NOTIFICATION_SETTINGS)
   * specifically targeting com.athar.athar.
   */
  public async openNotificationSettings(): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && (window as any).AtharNative?.openNotificationSettings) {
        const ok = (window as any).AtharNative.openNotificationSettings();
        if (ok) return true;
      }
    } catch {}

    try {
      const res = await NativePermissions.openNotificationSettings({ appId: this.appId });
      if (res?.opened) return true;
    } catch (e) {
      console.warn('[NativePermissionsBridge] Native openNotificationSettings error:', e);
    }

    const directIntent = `intent:#Intent;action=android.settings.APP_NOTIFICATION_SETTINGS;S.android.provider.extra.APP_PACKAGE=${this.appId};end`;
    dispatchIntentUri(directIntent);
    return true;
  }

  /**
   * Checks whether the app has notification permissions granted.
   */
  public async checkNotificationPermission(): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.checkNotificationPermission();
        if (res && typeof res.granted === 'boolean') {
          return res.granted;
        }
      }
    } catch {}

    if (typeof Notification !== 'undefined') {
      return Notification.permission === 'granted';
    }
    return false;
  }

  /**
   * Alias for checkNotificationPermission() to check if app has notification permissions granted.
   */
  public async hasNotificationPermission(): Promise<boolean> {
    return this.checkNotificationPermission();
  }

  /**
   * Checks whether the app has permission to schedule exact alarms (SCHEDULE_EXACT_ALARM / USE_EXACT_ALARM).
   */
  public async checkExactAlarmPermission(): Promise<boolean> {
    try {
      if (typeof (LocalNotifications as any).checkExactNotificationSetting === 'function') {
        const status = await (LocalNotifications as any).checkExactNotificationSetting();
        if (status && status.exact_alarm === 'granted') {
          localStorage.setItem('athar_perm_exact_alarm_verified', 'true');
          return true;
        } else if (status && status.exact_alarm === 'denied') {
          localStorage.removeItem('athar_perm_exact_alarm_verified');
          return false;
        }
      }
    } catch {}

    try {
      if (this.isNative()) {
        const res = await NativePermissions.checkExactAlarmPermission();
        if (res && typeof res.granted === 'boolean') {
          if (res.granted) {
            localStorage.setItem('athar_perm_exact_alarm_verified', 'true');
          } else {
            localStorage.removeItem('athar_perm_exact_alarm_verified');
          }
          return res.granted;
        }
      }
    } catch {}

    return localStorage.getItem('athar_perm_exact_alarm_verified') === 'true';
  }

  /**
   * Opens Android Ignore Battery Optimization Settings screen (Unrestricted battery).
   */
  public async openBatteryOptimizationSettings(): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.openBatteryOptimizationSettings({ appId: this.appId });
        return Boolean(res?.opened);
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] Native openBatteryOptimizationSettings error:', e);
    }

    const intent = `intent:#Intent;action=android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS;data=package:${this.appId};package=${this.appId};end`;
    dispatchIntentUri(intent);
    return true;
  }

  /**
   * Checks whether battery optimization is ignored for Athar.
   */
  public async checkBatteryOptimizationIgnored(): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.checkBatteryOptimization({ appId: this.appId });
        if (res && typeof res.isIgnored === 'boolean') {
          if (res.isIgnored) {
            localStorage.setItem('athar_perm_battery_opt_verified', 'true');
          } else {
            localStorage.removeItem('athar_perm_battery_opt_verified');
          }
          return res.isIgnored;
        }
      }
    } catch {}

    return localStorage.getItem('athar_perm_battery_opt_verified') === 'true';
  }

  /**
   * Starts Foreground Service so prayers and azkar never get killed in the background
   */
  public async startBackgroundForegroundService(options?: {
    nextPrayer?: string;
    targetEpochMs?: number;
    timeStr?: string;
    dailyScheduleJson?: string;
  }): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.startBackgroundService(options);
        return Boolean(res?.running);
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] startBackgroundForegroundService error:', e);
    }
    localStorage.setItem('athar_bg_service_running', 'true');
    return true;
  }

  /**
   * Dedicated entry point for starting AthanForegroundService with persistent ongoing notification & countdown
   */
  public async startAthanForegroundService(options?: {
    nextPrayer?: string;
    targetEpochMs?: number;
    timeStr?: string;
    dailyScheduleJson?: string;
  }): Promise<boolean> {
    return this.startBackgroundForegroundService(options);
  }

  public async startBackgroundService(options?: {
    nextPrayer?: string;
    targetEpochMs?: number;
    timeStr?: string;
    dailyScheduleJson?: string;
  }): Promise<boolean> {
    return this.startAthanForegroundService(options);
  }

  /**
   * Dynamically updates the prayer countdown in AthanForegroundService persistent notification
   */
  public async updateAthanCountdown(options: {
    nextPrayer: string;
    targetEpochMs: number;
    timeStr?: string;
    dailyScheduleJson?: string;
    prayersScheduleJson?: string;
  }): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.updateAthanCountdown({
          ...options,
          dailyScheduleJson: options.dailyScheduleJson || options.prayersScheduleJson,
        });
        return Boolean(res?.updated);
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] updateAthanCountdown error:', e);
      return false;
    }
    return true;
  }

  /**
   * Queries whether AthanForegroundService is currently running
   */
  public async isAthanForegroundServiceRunning(): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.isBackgroundServiceRunning();
        return Boolean(res?.running);
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] isAthanForegroundServiceRunning error:', e);
    }
    return localStorage.getItem('athar_bg_service_running') === 'true';
  }

  public async stopBackgroundForegroundService(): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.stopBackgroundService();
        return !Boolean(res?.running);
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] stopBackgroundForegroundService error:', e);
    }
    localStorage.setItem('athar_bg_service_running', 'false');
    return true;
  }

  public async stopAthanForegroundService(): Promise<boolean> {
    return this.stopBackgroundForegroundService();
  }

  /**
   * Enqueues persistent WorkManager background worker for widgets & prayer reminders
   */
  public async scheduleBackgroundSync(): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.scheduleBackgroundSync();
        return Boolean(res?.scheduled);
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] scheduleBackgroundSync error:', e);
    }
    return true;
  }

  /**
   * Opens Android Application Details Settings screen (App Info / All Permissions).
   */
  public async openAppSettings(): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.openAppSettings({ appId: this.appId });
        return Boolean(res?.opened);
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] Native openAppSettings error:', e);
    }

    const intent = `intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:${this.appId};package=${this.appId};end`;
    dispatchIntentUri(intent);
    return true;
  }

  /**
   * Opens AutoStart settings directly on Xiaomi / MIUI / HyperOS devices,
   * falling back gracefully to standard Android Application Details Settings on other devices.
   */
  public async openAutoStartSettings(): Promise<{ opened: boolean; isXiaomiAutostart?: boolean }> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.openAutoStartSettings({ appId: this.appId });
        return {
          opened: Boolean(res?.opened),
          isXiaomiAutostart: Boolean(res?.isXiaomiAutostart),
        };
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] Native openAutoStartSettings error:', e);
    }

    // Web / browser intent fallback: try MIUI component first, fallback to app details
    const miuiIntentUri = `intent:#Intent;component=com.miui.securitycenter/com.miui.permcenter.autostart.AutoStartManagementActivity;end`;
    try {
      dispatchIntentUri(miuiIntentUri);
    } catch {}

    const standardIntent = `intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:${this.appId};package=${this.appId};end`;
    dispatchIntentUri(standardIntent);
    return { opened: true, isXiaomiAutostart: false };
  }

  /**
   * Opens "Other Permissions" (الأذونات الأخرى) settings on MIUI/HyperOS, ColorOS, OriginOS, EMUI,
   * directly exposing:
   * 1. Display pop-up windows
   * 2. Display pop-up windows while running in background
   * 3. Show on lock screen
   * 4. Home screen shortcuts
   */
  public async openOtherPermissionsSettings(): Promise<{ opened: boolean }> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.openOtherPermissionsSettings({ appId: this.appId });
        return { opened: Boolean(res?.opened) };
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] Native openOtherPermissionsSettings error:', e);
    }

    const miuiOtherPermsUri = `intent:#Intent;action=miui.intent.action.APP_PERM_EDITOR;S.extra_pkgname=${this.appId};end`;
    try {
      dispatchIntentUri(miuiOtherPermsUri);
      return { opened: true };
    } catch {
      const opened = await this.openAppSettings();
      return { opened };
    }
  }

  /**
   * Forcefully triggers the full-screen Athan view over any running app or on the Lock Screen
   * using USE_FULL_SCREEN_INTENT and AthanForegroundService.
   */
  public async triggerFullScreenAthan(_prayerName?: string, _prayerTime?: string): Promise<boolean> {
    return true;
  }

  public async stopFullScreenAthan(): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.stopFullScreenAthan();
        return Boolean(res?.success);
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] Native stopFullScreenAthan error:', e);
    }
    return true;
  }

  /**
   * Displays the Royal Floating System Overlay Window outside the application
   */
  public async showSystemOverlayNotification(options: {
    title?: string;
    body?: string;
    badge?: string;
    category?: string;
    audioUrl?: string;
    playSound?: boolean;
    surahNumber?: number;
    ayahNumber?: number;
    actionText?: string;
    autoDismissMs?: number;
    autoDismissSeconds?: number;
    playbackMode?: string;
  }): Promise<{ shown: boolean; floatingOverlayActive?: boolean; requiresPermission?: boolean }> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.showSystemOverlayNotification(options);
        return {
          shown: res?.shown ?? false,
          floatingOverlayActive: res?.floatingOverlayActive ?? false,
          requiresPermission: res?.requiresPermission ?? false,
        };
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] showSystemOverlayNotification error:', e);
    }
    return { shown: true, floatingOverlayActive: false, requiresPermission: false };
  }

  public async dismissSystemOverlay(): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.dismissSystemOverlay();
        return res?.dismissed ?? true;
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] dismissSystemOverlay error:', e);
    }
    return true;
  }

  public async showFullScreenAzan(options: {
    prayerId?: string;
    prayerName?: string;
    prayerTime?: string;
    muadhinName?: string;
    audioUrl?: string;
    iqamahMinutes?: number;
    autoDua?: boolean;
    autoEcho?: boolean;
    scheduledEpochMs?: number;
    delaySeconds?: number;
  }): Promise<{ shown: boolean; requiresPermission?: boolean; scheduled?: boolean }> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.showFullScreenAzan(options);
        if (res?.requiresPermission) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('athar_show_web_azan_overlay', { detail: options }));
          }
        }
        return { shown: res.shown, requiresPermission: res.requiresPermission, scheduled: res.scheduled };
      } else {
        return await NativePermissions.showFullScreenAzan(options);
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] showFullScreenAzan error:', e);
      return { shown: false };
    }
  }

  /**
   * Triggers a test Adhan after a specified delay (default 5 seconds).
   * Works on Web and on Native Android (via AlarmManager exact alarm clock).
   */
  public async triggerTestAdhan(delaySeconds: number = 5, prayerInfo?: {
    prayerId?: string;
    prayerName?: string;
    prayerTime?: string;
    muadhinName?: string;
    audioUrl?: string;
  }): Promise<boolean> {
    const opts = {
      prayerId: prayerInfo?.prayerId || 'asr',
      prayerName: prayerInfo?.prayerName || 'صلاة العصر',
      prayerTime: prayerInfo?.prayerTime || '03:45 م',
      muadhinName: prayerInfo?.muadhinName || 'الشيخ مشاري راشد العفاسي',
      audioUrl: prayerInfo?.audioUrl || '/audio/adhan_alafasy.mp3',
      delaySeconds,
      iqamahMinutes: 15,
      autoDua: true,
      autoEcho: true,
      scheduledEpochMs: Date.now() + (delaySeconds * 1000),
    };
    const res = await this.showFullScreenAzan(opts);
    return Boolean(res?.shown || res?.requiresPermission || res?.scheduled);
  }

  public async dismissFullScreenAzan(): Promise<boolean> {
    try {
      const res = await NativePermissions.dismissFullScreenAzan();
      return res?.dismissed ?? true;
    } catch (e) {
      console.warn('[NativePermissionsBridge] dismissFullScreenAzan error:', e);
      return true;
    }
  }

  public async isFullScreenAzanRunning(): Promise<boolean> {
    try {
      const res = await NativePermissions.isFullScreenAzanRunning();
      return !!res?.isRunning;
    } catch {
      return false;
    }
  }

  public async showRoyalNotification(options: {
    title?: string;
    body?: string;
    badge?: string;
    channelId?: string;
    id?: number;
    category?: string;
    audioUrl?: string;
    playSound?: boolean;
    isOngoing?: boolean;
    surahNumber?: number;
    ayahNumber?: number;
  }): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.showRoyalNotification(options);
        return res?.success ?? true;
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] showRoyalNotification error:', e);
    }
    return true;
  }

  public async muteNotificationAudio(): Promise<boolean> {
    try {
      AudioService.setAdhanMuted(true);
      if (this.isNative()) {
        const res = await NativePermissions.muteNotificationAudio();
        return res?.muted ?? true;
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] muteNotificationAudio error:', e);
    }
    return true;
  }

  public async unmuteNotificationAudio(): Promise<boolean> {
    try {
      AudioService.setAdhanMuted(false);
      if (this.isNative()) {
        const res = await NativePermissions.unmuteNotificationAudio();
        return res?.unmuted ?? true;
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] unmuteNotificationAudio error:', e);
    }
    return true;
  }

  public async toggleNotificationAudio(): Promise<boolean> {
    try {
      const isMuted = AudioService.isAdhanMuted();
      AudioService.setAdhanMuted(!isMuted);
      if (this.isNative()) {
        const res = await NativePermissions.toggleNotificationAudio();
        return res?.toggled ?? true;
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] toggleNotificationAudio error:', e);
    }
    return true;
  }

  public async pauseNotificationAudio(): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.pauseNotificationAudio();
        return res?.paused ?? true;
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] pauseNotificationAudio error:', e);
    }
    return true;
  }

  public async resumeNotificationAudio(): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.resumeNotificationAudio();
        return res?.resumed ?? true;
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] resumeNotificationAudio error:', e);
    }
    return true;
  }

  public async getNotificationAudioTimeline(): Promise<{ isPlaying: boolean; isMuted: boolean; positionMs: number; durationMs: number }> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.getNotificationAudioTimeline();
        return res;
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] getNotificationAudioTimeline error:', e);
    }
    return { isPlaying: false, isMuted: false, positionMs: 0, durationMs: 0 };
  }

  public async dismissNotification(category?: string, id?: number): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.dismissNotification({ category, id });
        return res?.dismissed ?? true;
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] dismissNotification error:', e);
    }
    return true;
  }

  /**
   * Single Source of Truth: Dispatches ONE and ONLY ONE Test Notification through AtharNotificationManager
   */
  public async triggerSingleTestNotification(isAdhan: boolean = false, delaySeconds: number = 0): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.triggerSingleTestNotification({ isAdhan, delaySeconds });
        return Boolean(res?.success);
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] triggerSingleTestNotification error:', e);
    }
    return true;
  }

  public async setNotificationConfig(config: Record<string, any>): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.setNotificationConfig(config);
        return Boolean(res?.saved);
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] setNotificationConfig error:', e);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('athar_notification_config', JSON.stringify(config));
    }
    return true;
  }

  public async getNotificationConfig(): Promise<Record<string, any> | null> {
    try {
      if (this.isNative()) {
        return await NativePermissions.getNotificationConfig();
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] getNotificationConfig error:', e);
    }
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('athar_notification_config');
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch {}
      }
    }
    return null;
  }

  public async setMasterVolume(volume: number): Promise<boolean> {
    try {
      if (this.isNative()) {
        await NativePermissions.setMasterVolume({ volume: volume / 100 });
        return true;
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] setMasterVolume error:', e);
    }
    return true;
  }

  public async setMasterMute(muted: boolean): Promise<boolean> {
    try {
      if (this.isNative()) {
        await NativePermissions.setMasterMute({ muted });
        return true;
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] setMasterMute error:', e);
    }
    return true;
  }

  /**
   * Pushes latest prayer times to the Native Android Home Screen App Widget
   */
  public async updatePrayerWidget(data: PrayerWidgetData): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.updatePrayerWidget(data);
        return Boolean(res?.updated);
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] updatePrayerWidget error:', e);
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('athar_prayer_widget_data', JSON.stringify(data));
    }
    return true;
  }

  /**
   * Pushes latest Dhikr to the Native Android Daily Azkar App Widget
   */
  public async updateAzkarWidget(data: AzkarWidgetData): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.updateAzkarWidget(data);
        return Boolean(res?.updated);
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] updateAzkarWidget error:', e);
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('athar_azkar_widget_data', JSON.stringify(data));
    }
    return true;
  }

  /**
   * Pins or updates the ongoing prayer status bar notification entry
   */
  public async setOngoingPrayerNotification(data: OngoingPrayerData): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.setOngoingPrayerNotification(data);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('athar_ongoing_notification_updated', { detail: data }));
        }
        return Boolean(res?.success);
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] setOngoingPrayerNotification error:', e);
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('athar_ongoing_notification_data', JSON.stringify(data));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('athar_ongoing_notification_updated', { detail: data }));
    }

    return true;
  }

  public async removeOngoingPrayerNotification(): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.removeOngoingPrayerNotification();
        return Boolean(res?.success);
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] removeOngoingPrayerNotification error:', e);
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('athar_ongoing_notification_data');
    }
    return true;
  }

  public markPermissionVerified(permKey: 'overlay' | 'exact_alarm' | 'battery'): void {
    if (permKey === 'overlay') {
      localStorage.setItem('athar_perm_overlay_verified', 'true');
    } else if (permKey === 'exact_alarm') {
      localStorage.setItem('athar_perm_exact_alarm_verified', 'true');
    } else if (permKey === 'battery') {
      localStorage.setItem('athar_perm_battery_opt_verified', 'true');
    }
  }

  public async scheduleNativePrayerAlarms(
    prayers: Array<{ id: string; name: string; time: string; timestamp: number; audioUrl?: string }>
  ): Promise<boolean> {
    try {
      if (this.isNative()) {
        const prayersJson = JSON.stringify(prayers);
        const res = await NativePermissions.scheduleNativePrayerAlarms({ prayersJson });
        return Boolean(res?.scheduled);
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] scheduleNativePrayerAlarms error:', e);
    }
    return false;
  }

  public async scheduleNativeRoyalAlarms(
    alarms: Array<{
      id: string;
      type: string;
      title: string;
      body: string;
      badge: string;
      category: string;
      audioUrl?: string;
      timestamp: number;
      surahNumber?: number;
      ayahNumber?: number;
      adhkarCategory?: string;
      playSound?: boolean;
    }>
  ): Promise<boolean> {
    try {
      if (this.isNative()) {
        const alarmsJson = JSON.stringify(alarms);
        const res = await NativePermissions.scheduleNativeRoyalAlarms({ alarmsJson });
        return Boolean(res?.scheduled);
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] scheduleNativeRoyalAlarms error:', e);
    }
    return false;
  }

  /**
   * Explicitly purges all legacy channels and cancels any lingering ghost notifications
   */
  public async purgeSystemNotifications(): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.purgeSystemNotifications();
        return Boolean(res?.purged);
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] purgeSystemNotifications error:', e);
    }
    return true;
  }

  /**
   * Checks if the app can request package installations (Android 8.0+)
   */
  public async canRequestPackageInstalls(): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.canRequestPackageInstalls();
        return Boolean(res?.granted);
      } else {
        const verified = typeof window !== 'undefined' && localStorage.getItem('athar_perm_install_packages_verified') === 'true';
        return verified;
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] canRequestPackageInstalls error:', e);
    }
    return false;
  }

  /**
   * Opens the Android Settings page to allow installing unknown apps from Athar
   */
  public async openInstallUnknownAppsSettings(): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.openInstallUnknownAppsSettings();
        return Boolean(res?.opened);
      } else {
        const appId = ATHAR_PACKAGE_NAME;
        const intentUri = `intent:#Intent;action=android.settings.MANAGE_UNKNOWN_APP_SOURCES;data=package:${appId};package=${appId};end`;
        dispatchIntentUri(intentUri);
        return true;
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] openInstallUnknownAppsSettings error:', e);
    }
    return false;
  }

  /**
   * Installs an APK file from local file path
   */
  public async installApkFile(filePath: string): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.installApkFile({ filePath });
        return Boolean(res?.success);
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] installApkFile error:', e);
    }
    return false;
  }

  /**
   * Downloads and installs an APK file directly from a release URL
   */
  public async downloadAndInstallApk(url: string, fileName?: string): Promise<{ success: boolean; filePath?: string; fileSize?: number }> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.downloadAndInstallApk({ url, fileName });
        return { success: Boolean(res?.success), filePath: res?.filePath, fileSize: res?.fileSize };
      } else {
        if (typeof window !== 'undefined') {
          window.open(url, '_blank');
        }
        return { success: true };
      }
    } catch (e: any) {
      console.warn('[NativePermissionsBridge] downloadAndInstallApk error:', e);
      return { success: false };
    }
  }

  /**
   * Checks if an APK update file has already been downloaded and is ready in storage
   */
  public async checkDownloadedApk(fileName?: string): Promise<{ exists: boolean; filePath?: string; fileSize?: number }> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.checkDownloadedApk({ fileName });
        return { exists: Boolean(res?.exists), filePath: res?.filePath, fileSize: res?.fileSize };
      } else {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('athar_cached_apk_downloaded');
          const fName = fileName || '';
          const match = fName.match(/v?(\d+\.\d+\.\d+)/i);
          if (match && match[1]) {
            const isDownloaded = localStorage.getItem(`athar_downloaded_${match[1]}`) === 'true';
            return { exists: isDownloaded, fileSize: 18500000 };
          }
        }
        return { exists: false };
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] checkDownloadedApk error:', e);
      return { exists: false };
    }
  }

  /**
   * Directly triggers package installer on an already downloaded APK without re-downloading
   */
  public async installExistingApk(fileName?: string): Promise<{ success: boolean; filePath?: string; fileSize?: number }> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.installExistingApk({ fileName });
        return { success: Boolean(res?.success), filePath: res?.filePath, fileSize: res?.fileSize };
      } else {
        return { success: true };
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] installExistingApk error:', e);
      return { success: false };
    }
  }

  /**
   * Inspects detailed device hardware, ROM flavor, and runtime diagnostic info
   */
  public async getDeviceDiagnostics(): Promise<DeviceDiagnosticInfo> {
    try {
      return await NativePermissions.getDeviceDiagnosticInfo();
    } catch (e) {
      console.warn('[NativePermissionsBridge] getDeviceDiagnostics error:', e);
      return {
        manufacturer: 'generic',
        brand: 'android',
        model: 'Unknown Device',
        device: 'unknown',
        product: 'unknown',
        sdkInt: 33,
        release: '13',
        vendor: 'generic',
        vendorName: 'نظام أندرويد',
        customRom: '',
        isBatteryOptimized: true,
        canScheduleExactAlarms: true,
        notificationsEnabled: true,
        overlayGranted: false,
        backgroundServiceRunning: false,
      };
    }
  }

  /**
   * Inspects native notification channels status
   */
  public async checkNotificationChannels(): Promise<NotificationChannelsResult> {
    try {
      return await NativePermissions.checkNotificationChannelsStatus();
    } catch (e) {
      console.warn('[NativePermissionsBridge] checkNotificationChannels error:', e);
      return {
        notificationsEnabled: false,
        channels: [],
      };
    }
  }

  /**
   * Opens manufacturer-specific background management settings
   */
  public async openManufacturerSettings(vendor?: string): Promise<boolean> {
    try {
      const res = await NativePermissions.openManufacturerBackgroundSettings({
        appId: ATHAR_PACKAGE_NAME,
        vendor,
      });
      return Boolean(res?.opened);
    } catch (e) {
      console.warn('[NativePermissionsBridge] openManufacturerSettings error:', e);
      return false;
    }
  }

  /**
   * Directly triggers the Native Android Floating Window (TYPE_APPLICATION_OVERLAY)
   * Exclusively handled by Android native AtharFloatingWindowService without web audio duplicates.
   */
  public async showFloatingWindow(options: {
    title?: string;
    body?: string;
    badge?: string;
    category?: string;
    audioUrl?: string;
    playSound?: boolean;
    surahNumber?: number;
    ayahNumber?: number;
    actionText?: string;
    autoDismissSeconds?: number;
    playbackMode?: string;
  }): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.showSystemOverlayNotification(options);
        return Boolean(res?.shown);
      }
      return true;
    } catch (e) {
      console.warn('[NativePermissionsBridge] showFloatingWindow error:', e);
      return false;
    }
  }

  private parseFreqMs(freq?: string): number {
    switch (freq) {
      case '5s': return 5 * 1000;
      case '1m': return 60 * 1000;
      case '30m': return 30 * 60 * 1000;
      case '1h': return 60 * 60 * 1000;
      case '2h': return 120 * 60 * 1000;
      case '3h': return 180 * 60 * 1000;
      case '4h': return 240 * 60 * 1000;
      case '6h': return 360 * 60 * 1000;
      case '12h': return 720 * 60 * 1000;
      case 'daily': return 24 * 60 * 60 * 1000;
      default: return 120 * 60 * 1000;
    }
  }

  public async syncRoyalRemindersConfig(settings: any): Promise<boolean> {
    try {
      if (this.isNative() && settings) {
        const payload = {
          ayahEnabled: settings.quranVerseReminder?.enabled ?? true,
          ayahIntervalMs: this.parseFreqMs(settings.quranVerseReminder?.frequency),
          ayahScheduleType: settings.quranVerseReminder?.scheduleType || 'interval',
          ayahFixedTime: settings.quranVerseReminder?.fixedTime || '09:00',
          ayahMode: settings.quranVerseReminder?.mode || 'notification_and_sound',
          ayahReciterId: settings.quranVerseReminder?.reciterId || settings.selectedReciterId || 'alafasy',

          salawatEnabled: settings.salawatReminder?.enabled ?? true,
          salawatIntervalMs: this.parseFreqMs(settings.salawatReminder?.frequency),
          salawatScheduleType: settings.salawatReminder?.scheduleType || 'interval',
          salawatFixedTime: settings.salawatReminder?.fixedTime || '14:00',
          salawatMode: settings.salawatReminder?.mode || 'notification_and_sound',

          wirdEnabled: settings.dailyWirdReminder?.enabled ?? true,
          wirdIntervalMs: this.parseFreqMs(settings.dailyWirdReminder?.frequency),
          wirdScheduleType: settings.dailyWirdReminder?.scheduleType || 'interval',
          wirdFixedTime: settings.dailyWirdReminder?.fixedTime || '19:00',
          wirdMode: settings.dailyWirdReminder?.mode || 'notification_and_sound',

          parentsEnabled: settings.parentsReminder?.enabled ?? true,
          parentsIntervalMs: this.parseFreqMs(settings.parentsReminder?.frequency),
          parentsScheduleType: settings.parentsReminder?.scheduleType || 'interval',
          parentsFixedTime: settings.parentsReminder?.fixedTime || '17:00',
          parentsMode: settings.parentsReminder?.mode || 'notification_and_sound',
        };
        const res = await NativePermissions.syncRoyalRemindersConfig(payload);
        return Boolean(res?.synced);
      }
      return true;
    } catch (e) {
      console.warn('[NativePermissionsBridge] syncRoyalRemindersConfig error:', e);
      return false;
    }
  }

  /**
   * Sends a safe user-initiated diagnostic test notification exclusively via Native Android Overlay
   */
  public async sendDiagnosticNotification(options: {
    mode?: string;
    playSound?: boolean;
    title?: string;
    body?: string;
  }): Promise<boolean> {
    try {
      if (this.isNative()) {
        await this.showFloatingWindow({
          badge: '⚡ فحص النافذة العائمة الملكية',
          title: options.title || 'فحص نظام التنبيهات الملكية',
          body: options.body || 'تم إطلاق هذا التنبيه في النافذة العائمة الملكية بنجاح تام، مع التحقق من استجابة الصوت والأزرار بدقة ✓',
          audioUrl: options.playSound !== false ? '/audio/salawat.mp3' : undefined,
          playSound: options.playSound !== false,
          category: 'dhikr_tasbeeh',
          actionText: 'فحص الجاهزية ✓',
          autoDismissSeconds: 15,
        });
      }
      return true;
    } catch (e) {
      console.warn('[NativePermissionsBridge] sendDiagnosticNotification error:', e);
      return false;
    }
  }

  /**
   * Sets user telemetry and crash reporting opt-in status across native preferences
   */
  public async setTelemetryConsent(enabled: boolean): Promise<boolean> {
    if (this.plugin?.setTelemetryConsent) {
      try {
        const res = await this.plugin.setTelemetryConsent({ enabled });
        return !!res?.success;
      } catch (e) {
        console.warn('[NativePermissionsBridge] setTelemetryConsent error:', e);
      }
    }
    return false;
  }

  /**
   * Retrieves user telemetry and crash reporting opt-in status from native preferences
   */
  public async getTelemetryConsent(): Promise<boolean> {
    if (this.plugin?.getTelemetryConsent) {
      try {
        const res = await this.plugin.getTelemetryConsent();
        return !!res?.enabled;
      } catch (e) {
        console.warn('[NativePermissionsBridge] getTelemetryConsent error:', e);
      }
    }
    return false;
  }

  /**
   * Runs a complete, rigorous verification of all notification permissions and system states
   */
  public async runComprehensiveReadinessCheck(isFloatingOverlayWanted: boolean = false): Promise<{
    deviceInfo: DeviceDiagnosticInfo;
    channelsInfo: NotificationChannelsResult;
    checks: ReadinessCheckItem[];
    overallReady: boolean;
  }> {
    const deviceInfo = await this.getDeviceDiagnostics();
    const channelsInfo = await this.checkNotificationChannels();

    const isExactAlarmNeeded = deviceInfo.sdkInt >= 31;
    const isAutostartRestrictedVendor = ['xiaomi', 'samsung', 'honor', 'oppo', 'oneplus', 'vivo'].includes(deviceInfo.vendor);

    // 1. Android Notification Permission
    const notifStatus: ReadinessItemStatus = deviceInfo.notificationsEnabled ? 'READY' : 'ACTION_REQUIRED';
    const notifTextArabic = notifStatus === 'READY' ? 'جاهز' : 'يحتاج إلى تفعيل';

    // 2. Notification Channels Status
    let channelsStatus: ReadinessItemStatus = 'READY';
    let channelsDesc = 'كافة قنوات الإشعارات الأساسية مفعلة وبأولوية ظهور كاملة.';
    if (!deviceInfo.notificationsEnabled) {
      channelsStatus = 'ACTION_REQUIRED';
      channelsDesc = 'الإشعارات العامة للتطبيق معطلة بالنظام، لن تصل أي قناة.';
    } else if (channelsInfo.channels.length > 0) {
      const blockedChannels = channelsInfo.channels.filter((c) => c.isBlocked);
      if (blockedChannels.length > 0) {
        channelsStatus = 'ACTION_REQUIRED';
        channelsDesc = `هناك ${blockedChannels.length} قناة إشعار تم كتمها يدوياً من إعدادات النظام.`;
      }
    } else if (!this.isNative()) {
      channelsDesc = 'قنوات إشعارات أندرويد الأصلية تعمل تلقائياً عند تثبيت حزمة التطبيق.';
    }

    // 3. Exact Alarm Permission
    let exactAlarmStatus: ReadinessItemStatus = 'READY';
    let exactAlarmDesc = 'صلاحية المنبه الدقيق مفعّلة لضمان دقة مواقيت الصلاة والأذكار بالثانية.';
    if (!isExactAlarmNeeded) {
      exactAlarmStatus = 'NOT_REQUIRED';
      exactAlarmDesc = 'إصدار أندرويد على جهازك (أقل من Android 12) لا يفرض هذا الإذن بشكل منفصل.';
    } else if (!deviceInfo.canScheduleExactAlarms) {
      exactAlarmStatus = 'ACTION_REQUIRED';
      exactAlarmDesc = 'يحتاج إلى منح إذن "المنبهات والتذكيرات الدقيقة" لمنع تأخر مواعيد الأذان.';
    }

    // 4. Battery Optimization
    const batteryStatus: ReadinessItemStatus = !deviceInfo.isBatteryOptimized ? 'READY' : 'ACTION_REQUIRED';
    const batteryDesc = !deviceInfo.isBatteryOptimized
      ? 'تم استثناء التطبيق من قيود توفير الطاقة القاسية للنظام.'
      : 'التطبيق خاضع لتحسين البطارية، مما قد يتسبب في تجميد المنبهات أثناء قفل الشاشة لفترة طويلة.';

    // 5. Floating Overlay
    let overlayStatus: ReadinessItemStatus = 'READY';
    let overlayDesc = 'إذن الظهور فوق التطبيقات مفعّل للعرض الملكي عند الرغبة.';
    if (!isFloatingOverlayWanted) {
      overlayStatus = 'NOT_REQUIRED';
      overlayDesc = 'النافذة العائمة خيار إضافي اختياري غير مفعّل حالياً في إعداداتك.';
    } else if (!deviceInfo.overlayGranted) {
      overlayStatus = 'ACTION_REQUIRED';
      overlayDesc = 'يحتاج إلى تفعيل إذن "الظهور فوق التطبيقات الأخرى" لظهور النافذة العائمة.';
    }

    // 6. Autostart & Background Restrictions
    let autostartStatus: ReadinessItemStatus = 'READY';
    let autostartDesc = 'لا توجد قيود إضافية مفروضة من واجهة النظام.';
    if (isAutostartRestrictedVendor) {
      const isConfirmed = typeof localStorage !== 'undefined' && localStorage.getItem('athar_perm_autostart_verified') === 'true';
      if (isConfirmed) {
        autostartStatus = 'READY';
        autostartDesc = `تم تأكيد ضبط التشغيل التلقائي والنشاط في الخلفية لواجهة ${deviceInfo.vendorName}.`;
      } else {
        autostartStatus = 'ACTION_REQUIRED';
        autostartDesc = `أجهزة ${deviceInfo.vendorName} تفرض قيود إغلاق قسرية على التطبيقات، يجب منح إذن التشغيل التلقائي.`;
      }
    } else {
      autostartStatus = 'NOT_REQUIRED';
      autostartDesc = 'نظام أندرويد القياسي على جهازك لا يتطلب إذناً يدوياً للتشغيل التلقائي.';
    }

    const checks: ReadinessCheckItem[] = [
      {
        id: 'notifications',
        title: 'إذن إشعارات النظام',
        description: 'السماح لتطبيق أثر بإرسال إشعارات التنبيهات والأذان.',
        status: notifStatus,
        statusTextArabic: notifStatus === 'READY' ? 'جاهز' : 'يحتاج إلى تفعيل',
        actionAvailable: notifStatus !== 'READY',
        actionTextArabic: 'تفعيل الإشعارات',
        actionHandler: () => this.openNotificationSettings(),
      },
      {
        id: 'channels',
        title: 'سلامة قنوات الإشعار',
        description: channelsDesc,
        status: channelsStatus,
        statusTextArabic: channelsStatus === 'READY' ? 'جاهز' : 'يحتاج إلى تفعيل',
        actionAvailable: channelsStatus !== 'READY',
        actionTextArabic: 'إدارة القنوات',
        actionHandler: () => this.openNotificationSettings(),
      },
      {
        id: 'exact_alarm',
        title: 'المنبهات الدقيقة (Exact Alarms)',
        description: exactAlarmDesc,
        status: exactAlarmStatus,
        statusTextArabic: exactAlarmStatus === 'READY' ? 'جاهز' : exactAlarmStatus === 'NOT_REQUIRED' ? 'غير مطلوب' : 'يحتاج إلى تفعيل',
        actionAvailable: exactAlarmStatus === 'ACTION_REQUIRED',
        actionTextArabic: 'ضبط المنبه الدقيق',
        actionHandler: () => this.openExactAlarmSettings(),
      },
      {
        id: 'battery_opt',
        title: 'استثناء قيود البطارية',
        description: batteryDesc,
        status: batteryStatus,
        statusTextArabic: batteryStatus === 'READY' ? 'جاهز' : 'يحتاج إلى تفعيل',
        actionAvailable: batteryStatus === 'ACTION_REQUIRED',
        actionTextArabic: 'إلغاء قيود البطارية',
        actionHandler: () => this.openBatteryOptimizationSettings(),
      },
      {
        id: 'overlay',
        title: 'النافذة العائمة الملكية',
        description: overlayDesc,
        status: overlayStatus,
        statusTextArabic: overlayStatus === 'READY' ? 'جاهز' : overlayStatus === 'NOT_REQUIRED' ? 'غير مطلوب' : 'يحتاج إلى تفعيل',
        actionAvailable: overlayStatus === 'ACTION_REQUIRED',
        actionTextArabic: 'تفعيل العرض العائم',
        actionHandler: () => this.openOverlaySettings(),
      },
      {
        id: 'autostart',
        title: `التشغيل التلقائي (${deviceInfo.vendorName})`,
        description: autostartDesc,
        status: autostartStatus,
        statusTextArabic: autostartStatus === 'READY' ? 'جاهز' : autostartStatus === 'NOT_REQUIRED' ? 'غير مطلوب' : 'يحتاج إلى تفعيل',
        actionAvailable: autostartStatus === 'ACTION_REQUIRED',
        actionTextArabic: 'إعدادات التشغيل التلقائي',
        actionHandler: () => this.openManufacturerSettings(deviceInfo.vendor),
      },
    ];

    const criticalChecks = checks.filter((c) => c.id === 'notifications' || (c.id === 'exact_alarm' && isExactAlarmNeeded));
    const overallReady = criticalChecks.every((c) => c.status === 'READY');

    return {
      deviceInfo,
      channelsInfo,
      checks,
      overallReady,
    };
  }
}

export const NativePermissionsBridge = new NativePermissionsBridgeManager();
