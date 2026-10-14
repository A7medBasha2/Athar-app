import {
  NativeNotificationService,
  PRAYER_CHANNEL_ID,
  IQAMAH_CHANNEL_ID,
  SALAWAT_DHIKR_CHANNEL_ID,
  QURAN_CHANNEL_ID,
  PARENTS_CHANNEL_ID,
  MAIN_CHANNEL_ID,
} from './nativeNotificationService';

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  type: 'prayer' | 'quran' | 'salawat' | 'wird' | 'dhikr' | 'parents' | 'info';
  timestamp: number;
  actionText?: string;
  onAction?: () => void;
  audioUrl?: string;
  autoPlayAudio?: () => Promise<void>;
  priority?: number;
  queuePosition?: number;
  totalInQueue?: number;
}

export interface NotifyPayload {
  title: string;
  body: string;
  type: 'prayer' | 'quran' | 'salawat' | 'wird' | 'dhikr' | 'parents' | 'info';
  actionText?: string;
  onAction?: () => void;
  audioUrl?: string;
  autoPlayAudio?: () => Promise<void>;
  priority?: number;
}

type NotificationSubscriber = (notification: InAppNotification | null) => void;
type PermissionSubscriber = (permission: NotificationPermission) => void;

const NOTIFICATION_GRANTED_KEY = 'athar_notification_permission_granted_v1';

class NotificationManager {
  private permissionSubscribers: Set<PermissionSubscriber> = new Set();
  private subscribers: Set<NotificationSubscriber> = new Set();
  private history: InAppNotification[] = [];

  constructor() {}

  public isRunningInIframe(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }

  public getNativeBrowserPermission(): NotificationPermission {
    if (typeof window === 'undefined') return 'default';
    if ('Notification' in window) return Notification.permission;
    return 'granted';
  }

  public getPermissionStatus(): NotificationPermission {
    if (typeof window === 'undefined') return 'default';
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        localStorage.setItem(NOTIFICATION_GRANTED_KEY, 'true');
        return 'granted';
      }
      if (localStorage.getItem(NOTIFICATION_GRANTED_KEY) === 'true') {
        return 'granted';
      }
      if ('Notification' in window) {
        return Notification.permission;
      }
    } catch {}
    return 'default';
  }

  private notifyPermissionSubscribers(perm: NotificationPermission) {
    this.permissionSubscribers.forEach((cb) => {
      try {
        cb(perm);
      } catch {}
    });
  }

  public subscribePermission(cb: PermissionSubscriber): () => void {
    this.permissionSubscribers.add(cb);
    cb(this.getPermissionStatus());
    return () => this.permissionSubscribers.delete(cb);
  }

  /**
   * Requests native Android system notification permissions via LocalNotifications.requestPermissions().
   */
  public async requestPermission(): Promise<NotificationPermission> {
    const granted = await NativeNotificationService.requestSystemPermissions();
    await NativeNotificationService.createNotificationChannels();
    await NativeNotificationService.scheduleAllNativeNotifications(7);

    try {
      localStorage.setItem(NOTIFICATION_GRANTED_KEY, granted ? 'true' : 'false');
    } catch {}

    const status: NotificationPermission = granted ? 'granted' : 'denied';
    this.notifyPermissionSubscribers(status);
    return status;
  }

  public subscribe(cb: NotificationSubscriber): () => void {
    this.subscribers.add(cb);
    cb(null);
    return () => this.subscribers.delete(cb);
  }

  public getActiveNotification(): InAppNotification | null {
    return null;
  }

  public getQueueLength(): number {
    return 0;
  }

  public getQueue(): InAppNotification[] {
    return [];
  }

  public getHistory(): InAppNotification[] {
    return [...this.history];
  }

  public clearHistory(): void {
    this.history = [];
  }

  public onActiveAudioStarted(): void {}
  public onActiveAudioFinished(): void {}
  public async finishActiveAndAdvance(): Promise<void> {}
  public isAudioPlayingForActiveNotification(): boolean {
    return false;
  }
  public dismissInAppBanner(_skipAll: boolean = false): void {}

  /**
   * EXCLUSIVELY dispatches to native Android Notification Channels with importance: 5.
   * Completely removed Web Notification API and in-app popup toasts.
   */
  public notify(payload: NotifyPayload): void {
    const now = Date.now();
    const item: InAppNotification = {
      id: Math.random().toString(36).substring(2, 9),
      title: payload.title,
      body: payload.body,
      type: payload.type,
      timestamp: now,
      actionText: payload.actionText,
      onAction: payload.onAction,
      audioUrl: payload.audioUrl,
      autoPlayAudio: payload.autoPlayAudio,
      priority: payload.priority ?? 5,
    };

    this.history.unshift(item);
    if (this.history.length > 25) this.history.pop();

    let channelId = MAIN_CHANNEL_ID;
    if (payload.type === 'prayer') {
      channelId = PRAYER_CHANNEL_ID;
    } else if (payload.type === 'quran' || payload.type === 'wird') {
      channelId = QURAN_CHANNEL_ID;
    } else if (payload.type === 'salawat' || payload.type === 'dhikr') {
      channelId = SALAWAT_DHIKR_CHANNEL_ID;
    } else if (payload.type === 'parents') {
      channelId = PARENTS_CHANNEL_ID;
    }

    // Direct Native Dispatch via Capacitor LocalNotifications
    NativeNotificationService.dispatchImmediateNativeNotification({
      title: payload.title,
      body: payload.body,
      channelId,
      extra: {
        type: payload.type,
        audioUrl: payload.audioUrl,
      },
    }).catch(() => {});

    // Trigger audio action if configured
    if (payload.autoPlayAudio) {
      payload.autoPlayAudio().catch(() => {});
    }
  }
}

export const NotificationService = new NotificationManager();
