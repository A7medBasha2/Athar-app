import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { AudioService } from './audioService';
import { NotificationService } from './notificationService';

export const ATHAR_PACKAGE_NAME = 'com.athar.athar';

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

export interface NativePermissionsPlugin {
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
  startBackgroundService(): Promise<{ running: boolean }>;
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
    prayerName?: string;
    prayerTime?: string;
    badge?: string;
  }): Promise<{ shown: boolean }>;
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
    startBackgroundService: async () => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('athar_bg_service_running', 'true');
      }
      return { running: true };
    },
    stopBackgroundService: async () => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('athar_bg_service_running', 'false');
      }
      return { running: false };
    },
    triggerFullScreenAthan: async (options: { prayerName?: string; prayerTime?: string }) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('athar_incoming_athan', {
            detail: { prayer: options?.prayerName || 'صلاة الفجر', time: options?.prayerTime || '05:15' },
          })
        );
      }
      return { success: true, prayerName: options?.prayerName };
    },
    stopFullScreenAthan: async () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('athar_stop_athan'));
      }
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
      return { shown: true };
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
  public async startBackgroundForegroundService(): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.startBackgroundService();
        return Boolean(res?.running);
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] startBackgroundForegroundService error:', e);
    }
    localStorage.setItem('athar_bg_service_running', 'true');
    return true;
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
   * Forcefully triggers the full-screen Athan view over any running app or on the Lock Screen
   * using USE_FULL_SCREEN_INTENT and AthanForegroundService.
   */
  public async triggerFullScreenAthan(prayerName: string = 'صلاة الفجر', prayerTime: string = '05:15'): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.triggerFullScreenAthan({ prayerName, prayerTime });
        return Boolean(res?.success);
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] Native triggerFullScreenAthan error:', e);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('athar_incoming_athan', {
          detail: { prayer: prayerName, time: prayerTime },
        })
      );
    }
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

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('athar_stop_athan'));
    }
    return true;
  }

  /**
   * Displays the Royal Floating System Overlay Window outside the application
   */
  public async showSystemOverlayNotification(options: {
    title?: string;
    body?: string;
    prayerName?: string;
    prayerTime?: string;
    badge?: string;
    category?: string;
    audioUrl?: string;
    playSound?: boolean;
  }): Promise<boolean> {
    try {
      if (this.isNative()) {
        const res = await NativePermissions.showSystemOverlayNotification(options);
        return res?.shown ?? true;
      }
    } catch (e) {
      console.warn('[NativePermissionsBridge] showSystemOverlayNotification error:', e);
    }
    return true;
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

    // In web / PWA mode, show in-app notification banner and browser notification
    NotificationService.notify({
      title: data.title || `🕌 مواقيت الصلاة: ${data.nextPrayer || 'صلاة الفجر'}`,
      body: data.body || `الفجر ${data.fajr || '05:15'} · الظهر ${data.dhuhr || '12:00'} · العصر ${data.asr || '15:15'} · المغرب ${data.maghrib || '17:50'} · العشاء ${data.isha || '19:20'}`,
      type: 'prayer',
      skipNativeNotification: true,
    });
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(data.title || '🕌 شريط مواقيت الصلاة (أثر)', {
          body: data.body || 'مواقيت الصلوات الخمس والعد التنازلي الحي',
          icon: '/icon-logo.png',
          tag: 'athar_ongoing_prayer',
        });
      }
    } catch {}

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
}

export const NativePermissionsBridge = new NativePermissionsBridgeManager();
