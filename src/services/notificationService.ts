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
    // Only request if supported and user already interacted
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }
    try {
      return await Notification.requestPermission();
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
   * Dispatches a notification both to real browser Notification API and in-app banner
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

    // Trigger in-app UI listeners
    this.subscribers.forEach(cb => cb(item));

    // Try real system Notification API if permission is granted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification(payload.title, {
          body: payload.body,
          icon: '/icon.svg',
          badge: '/icon.svg',
          dir: 'rtl',
          lang: 'ar'
        });
        if (payload.onAction) {
          n.onclick = () => {
            window.focus();
            payload.onAction!();
          };
        }
      } catch (e) {
        console.warn('Browser system notification failed:', e);
      }
    }
  }
}

export const NotificationService = new NotificationManager();
