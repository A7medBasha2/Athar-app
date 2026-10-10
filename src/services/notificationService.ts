import { AudioService } from './audioService';

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  type: 'prayer' | 'quran' | 'salawat' | 'wird' | 'dhikr' | 'parents' | 'info';
  timestamp: number;
  actionText?: string;
  onAction?: () => void;
  audioUrl?: string;
}

type NotificationSubscriber = (notification: InAppNotification | null) => void;
type PermissionSubscriber = (permission: NotificationPermission) => void;

const NOTIFICATION_GRANTED_KEY = 'athar_notification_permission_granted_v1';

class NotificationManager {
  private subscribers: Set<NotificationSubscriber> = new Set();
  private permissionSubscribers: Set<PermissionSubscriber> = new Set();
  private history: InAppNotification[] = [];
  private lastNotificationTitle = '';
  private lastNotificationTimestamp = 0;
  private lastActiveOnAction: (() => void) | null = null;
  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.initBrowserNotifications();
  }

  private async initBrowserNotifications() {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        this.swRegistration = reg;
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'NOTIFICATION_ACTION_CLICKED') {
            if (this.lastActiveOnAction) {
              try {
                this.lastActiveOnAction();
              } catch (e) {
                console.warn('Action callback error:', e);
              }
            } else if (event.data.audioUrl) {
              AudioService.playUrl(event.data.audioUrl, 'reminder_verse', {
                title: 'تذكير أثر الصوتي',
                subtitle: 'أثر | ATHAR'
              });
            }
          }
        });
      } catch (e) {
        console.warn('Service worker registration failed:', e);
      }
    }
  }

  /**
   * Checks if the app is currently running inside an embedded preview iframe (where OS notifications
   * are restricted by browser security until opened in a standalone browser tab or installed as PWA).
   */
  public isRunningInIframe(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }

  public getNativeBrowserPermission(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'default';
    return Notification.permission;
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
    if (typeof window === 'undefined') return 'default';

    AudioService.unlockAudio();

    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js');
      } catch {}
    }

    if ('Notification' in window) {
      try {
        const maybePromise = Notification.requestPermission();
        if (maybePromise && typeof maybePromise.then === 'function') {
          await maybePromise;
        }
      } catch {}
    }

    try {
      localStorage.setItem(NOTIFICATION_GRANTED_KEY, 'true');
    } catch {}

    const finalPerm: NotificationPermission = 'granted';
    this.notifyPermissionSubscribers(finalPerm);
    return finalPerm;
  }

  public subscribe(cb: NotificationSubscriber): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  public dismissInAppBanner(): void {
    this.subscribers.forEach((cb) => {
      try {
        cb(null);
      } catch {}
    });
  }

  public getHistory(): InAppNotification[] {
    return [...this.history];
  }

  public clearHistory(): void {
    this.history = [];
  }

  /**
   * Dispatches a notification both inside the app AND to the OS Notification Center / Lock Screen / Outside the app!
   * Note: NotificationOptions passed to ServiceWorkerRegistration.showNotification are kept strictly standard-compliant
   * so Chrome/Android/Desktop OS notifications never reject with TypeError!
   */
  public notify(payload: {
    title: string;
    body: string;
    type: 'prayer' | 'quran' | 'salawat' | 'wird' | 'dhikr' | 'parents' | 'info';
    actionText?: string;
    onAction?: () => void;
    audioUrl?: string;
  }): void {
    const now = Date.now();
    if (this.lastNotificationTitle === payload.title && now - this.lastNotificationTimestamp < 1500) {
      return;
    }
    this.lastNotificationTitle = payload.title;
    this.lastNotificationTimestamp = now;
    this.lastActiveOnAction = payload.onAction || null;

    const item: InAppNotification = {
      id: Math.random().toString(36).substring(2, 9),
      title: payload.title,
      body: payload.body,
      type: payload.type,
      timestamp: now,
      actionText: payload.actionText,
      onAction: payload.onAction,
      audioUrl: payload.audioUrl
    };

    this.history.unshift(item);
    if (this.history.length > 20) this.history.pop();

    // 1. Update single unified golden in-app banner
    this.subscribers.forEach((cb) => {
      try {
        cb(item);
      } catch (e) {
        console.warn(e);
      }
    });

    // 2. Update OS MediaSession metadata (appears on lock screen & OS media center when audio plays)
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: payload.title,
          artist: payload.body,
          album: 'أثر | ATHAR',
          artwork: [{ src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' }]
        });
      } catch {}
    }

    // 3. Dispatch to OS Notification Center & Outside-App Banner
    const dispatchOsNotification = async () => {
      if (typeof window === 'undefined' || !('Notification' in window)) return;

      // If native permission is 'default', try requesting it
      if (Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch {}
      }

      if (Notification.permission !== 'granted') return;

      const safeSwOptions: any = {
        body: payload.body,
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: 'athar-unified-alert',
        dir: 'rtl',
        lang: 'ar',
        renotify: true,
        requireInteraction: false,
        vibrate: [250, 100, 250],
        data: {
          url: '/',
          type: payload.type,
          audioUrl: payload.audioUrl
        }
      };

      const fallbackDirect = () => {
        try {
          const n = new Notification(payload.title, {
            body: payload.body,
            icon: '/icon.svg',
            tag: 'athar-unified-alert',
            dir: 'rtl',
            lang: 'ar'
          });
          n.onclick = () => {
            window.focus();
            payload.onAction?.();
            n.close();
          };
        } catch (err) {
          console.warn('Direct Notification error:', err);
        }
      };

      if ('serviceWorker' in navigator) {
        try {
          const reg = (await navigator.serviceWorker.getRegistration()) || this.swRegistration;
          if (reg && typeof reg.showNotification === 'function') {
            await reg.showNotification(payload.title, safeSwOptions);
            return;
          }
        } catch {
          // Fallback to direct Notification constructor
        }
      }

      fallbackDirect();
    };

    dispatchOsNotification();

    // 4. Gentle haptic vibration
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([150, 80, 150]);
      } catch {}
    }
  }
}

export const NotificationService = new NotificationManager();
