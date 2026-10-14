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
  private activeNotification: InAppNotification | null = null;
  private queue: InAppNotification[] = [];
  private autoDismissTimer: any = null;
  private isAudioPlaying: boolean = false;

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
    cb(this.activeNotification);
    return () => this.subscribers.delete(cb);
  }

  private emitActiveNotification() {
    this.subscribers.forEach((cb) => {
      try {
        cb(this.activeNotification);
      } catch {}
    });
  }

  public getActiveNotification(): InAppNotification | null {
    return this.activeNotification;
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public getQueue(): InAppNotification[] {
    return [...this.queue];
  }

  public getHistory(): InAppNotification[] {
    return [...this.history];
  }

  public clearHistory(): void {
    this.history = [];
  }

  public onActiveAudioStarted(): void {
    this.isAudioPlaying = true;
    if (this.autoDismissTimer) {
      clearTimeout(this.autoDismissTimer);
      this.autoDismissTimer = null;
    }
  }

  public onActiveAudioFinished(): void {
    this.isAudioPlaying = false;
    if (this.activeNotification) {
      if (this.autoDismissTimer) clearTimeout(this.autoDismissTimer);
      this.autoDismissTimer = setTimeout(() => {
        this.finishActiveAndAdvance();
      }, 4000);
    }
  }

  public async finishActiveAndAdvance(): Promise<void> {
    if (this.autoDismissTimer) {
      clearTimeout(this.autoDismissTimer);
      this.autoDismissTimer = null;
    }
    this.isAudioPlaying = false;
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      this.activeNotification = next;
      this.emitActiveNotification();
      this.scheduleAutoDismiss(next);
      if (next.autoPlayAudio) {
        next.autoPlayAudio().catch(() => {});
      }
    } else {
      this.activeNotification = null;
      this.emitActiveNotification();
    }
  }

  public isAudioPlayingForActiveNotification(): boolean {
    return this.isAudioPlaying;
  }

  public dismissInAppBanner(skipAll: boolean = false): void {
    if (skipAll) {
      this.queue = [];
    }
    this.finishActiveAndAdvance();
  }

  private scheduleAutoDismiss(item: InAppNotification) {
    if (this.autoDismissTimer) {
      clearTimeout(this.autoDismissTimer);
      this.autoDismissTimer = null;
    }
    this.autoDismissTimer = setTimeout(() => {
      if (!this.isAudioPlaying) {
        this.finishActiveAndAdvance();
      }
    }, 9500);
  }

  /**
   * Dispatches notifications synchronously to the In-App Royal Banner AND triggers
   * the audio at the EXACT same instant with 0 delay, while concurrently firing
   * native system notifications for outside-the-app delivery.
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
    if (this.history.length > 30) this.history.pop();

    // 1. In-App Royal Notification state update (instant)
    if (!this.activeNotification) {
      this.activeNotification = item;
      this.emitActiveNotification();
      this.scheduleAutoDismiss(item);
    } else {
      item.queuePosition = this.queue.length + 1;
      this.queue.push(item);
      this.emitActiveNotification();
    }

    // 2. Synchronize Audio with UI Paint (exact same instant as UI appears, zero perceived offset)
    if (payload.autoPlayAudio) {
      this.isAudioPlaying = true;
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => {
          payload.autoPlayAudio?.().catch(() => {
            this.isAudioPlaying = false;
          });
        });
      } else {
        payload.autoPlayAudio().catch(() => {
          this.isAudioPlaying = false;
        });
      }
    }

    // 3. Native Android / PWA System Notification dispatch (async, non-blocking)
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

    NativeNotificationService.dispatchImmediateNativeNotification({
      title: payload.title,
      body: payload.body,
      channelId,
      extra: {
        type: payload.type,
        audioUrl: payload.audioUrl,
      },
    }).catch(() => {});
  }
}

export const NotificationService = new NotificationManager();
