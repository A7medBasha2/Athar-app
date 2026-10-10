export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  type: 'prayer' | 'quran' | 'salawat' | 'wird' | 'info';
  timestamp: number;
  actionText?: string;
  onAction?: () => void;
  audioUrl?: string;
}

type NotificationSubscriber = (notification: InAppNotification) => void;

class NotificationManager {
  private subscribers: Set<NotificationSubscriber> = new Set();
  private history: InAppNotification[] = [];

  constructor() {
    this.initBrowserNotifications();
  }

  private async initBrowserNotifications() {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch (e) {
        console.warn('Service worker registration failed:', e);
      }
    }
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted' && 'serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/sw.js');
        } catch {}
      }
      return perm;
    } catch {
      return 'default';
    }
  }

  public subscribe(cb: NotificationSubscriber): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  public getHistory(): InAppNotification[] {
    return [...this.history];
  }

  public clearHistory(): void {
    this.history = [];
  }

  /**
   * Dispatches a notification both to real browser Notification API (via ServiceWorker on mobile/Android
   * for lock screen and background notifications) and to in-app banners.
   */
  public notify(payload: {
    title: string;
    body: string;
    type: 'prayer' | 'quran' | 'salawat' | 'wird' | 'info';
    actionText?: string;
    onAction?: () => void;
    audioUrl?: string;
  }): void {
    const item: InAppNotification = {
      id: Math.random().toString(36).substring(2, 9),
      title: payload.title,
      body: payload.body,
      type: payload.type,
      timestamp: Date.now(),
      actionText: payload.actionText,
      onAction: payload.onAction,
      audioUrl: payload.audioUrl
    };

    this.history.unshift(item);
    if (this.history.length > 20) this.history.pop();

    // Trigger single in-app floating banner UI listener
    this.subscribers.forEach(cb => {
      try { cb(item); } catch (e) { console.warn(e); }
    });

    // Mobile / Android / Desktop system notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const notifOptions: NotificationOptions = {
        body: payload.body,
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: `athar-${payload.type}-${Date.now()}`,
        dir: 'rtl',
        lang: 'ar',
        renotify: true,
        data: { url: '/', type: payload.type }
      };

      // Try ServiceWorker first (required on Android and supports lock screen / background!)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(payload.title, notifOptions).catch(() => {
            // Fallback to desktop window Notification
            try {
              const n = new Notification(payload.title, notifOptions);
              if (payload.onAction) {
                n.onclick = () => { window.focus(); payload.onAction?.(); };
              }
            } catch {}
          });
        }).catch(() => {
          try {
            const n = new Notification(payload.title, notifOptions);
            if (payload.onAction) {
              n.onclick = () => { window.focus(); payload.onAction?.(); };
            }
          } catch {}
        });
      } else {
        try {
          const n = new Notification(payload.title, notifOptions);
          if (payload.onAction) {
            n.onclick = () => { window.focus(); payload.onAction?.(); };
          }
        } catch (e) {
          console.warn('System notification error:', e);
        }
      }

      // Haptic feedback if supported on mobile device
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([150, 80, 150]);
        } catch {}
      }
    }
  }
}

export const NotificationService = new NotificationManager();
