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
  private subscribers: Set<NotificationSubscriber> = new Set();
  private permissionSubscribers: Set<PermissionSubscriber> = new Set();
  private history: InAppNotification[] = [];
  private lastNotificationTitle = '';
  private lastNotificationTimestamp = 0;
  private lastActiveOnAction: (() => void) | null = null;
  private swRegistration: ServiceWorkerRegistration | null = null;

  // Queue ("دور التنبيهات المنظم")
  private queue: InAppNotification[] = [];
  private activeItem: InAppNotification | null = null;
  private bannerTimer: any = null;
  private isAudioPlayingForActive = false;
  private isAdvancingQueue = false;

  constructor() {
    this.initBrowserNotifications();

    // Hook to AudioService: when a temporary sound finishes, smoothly step to the next queued alert!
    AudioService.addTemporaryAudioFinishedListener(() => {
      this.onActiveAudioFinished();
    });

    AudioService.addTemporaryAudioStartedListener(() => {
      this.onActiveAudioStarted();
    });
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
    cb(this.activeItem ? { ...this.activeItem } : null);
    return () => this.subscribers.delete(cb);
  }

  private notifySubscribers(item: InAppNotification | null) {
    this.subscribers.forEach((cb) => {
      try {
        cb(item ? { ...item } : null);
      } catch (e) {
        console.warn('Notification subscriber error:', e);
      }
    });
  }

  public getActiveNotification(): InAppNotification | null {
    return this.activeItem;
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

  /**
   * Called when audio starts playing for the active notification:
   * pauses banner countdown so the banner stays visible during playback!
   */
  public onActiveAudioStarted(): void {
    this.isAudioPlayingForActive = true;
    if (this.bannerTimer) {
      clearTimeout(this.bannerTimer);
      this.bannerTimer = null;
    }
  }

  /**
   * Called when temporary audio finishes playing:
   * leaves the banner visible for a short pleasant moment (1.2s), then advances to the next queued alert!
   */
  public onActiveAudioFinished(): void {
    if (!this.activeItem) return;
    this.isAudioPlayingForActive = false;
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      this.bannerTimer = null;
      this.finishActiveAndAdvance();
    }, 1200);
  }

  private updateQueuePositions() {
    const totalQueued = this.queue.length;
    if (this.activeItem) {
      this.activeItem.queuePosition = 1;
      this.activeItem.totalInQueue = totalQueued;
    }
    this.queue.forEach((item, index) => {
      item.queuePosition = index + 2;
      item.totalInQueue = totalQueued;
    });
  }

  /**
   * Advances the FIFO queue: finishes current active notification and activates the next one waiting in turn ("دور").
   * If skipAll is true, completely empties the waiting queue.
   */
  public async finishActiveAndAdvance(skipAll: boolean = false): Promise<void> {
    if (this.bannerTimer) {
      clearTimeout(this.bannerTimer);
      this.bannerTimer = null;
    }

    if (skipAll) {
      this.queue = [];
      this.activeItem = null;
      this.isAudioPlayingForActive = false;
      this.notifySubscribers(null);
      AudioService.stopTemporaryAndResume(true);
      return;
    }

    if (this.isAdvancingQueue) return;
    this.isAdvancingQueue = true;

    // If audio is currently playing for this item, stop it cleanly
    if (this.isAudioPlayingForActive) {
      this.isAudioPlayingForActive = false;
      AudioService.stopTemporaryAndResume(false);
    }

    if (this.queue.length > 0) {
      const nextItem = this.queue.shift()!;
      this.activeItem = nextItem;
      this.updateQueuePositions();
      this.notifySubscribers(this.activeItem);

      // Respectful brief pause (500ms) between sequential notifications
      await new Promise((res) => setTimeout(res, 500));
      this.isAdvancingQueue = false;

      // Start next alert's audio if configured
      if (nextItem.autoPlayAudio) {
        this.isAudioPlayingForActive = true;
        try {
          await nextItem.autoPlayAudio();
        } catch (e) {
          console.warn('Queue autoPlayAudio error:', e);
          this.isAudioPlayingForActive = false;
          this.bannerTimer = setTimeout(() => {
            this.finishActiveAndAdvance();
          }, 6500);
        }
      } else {
        // Silent notification: displays for 7.5s then advances
        this.bannerTimer = setTimeout(() => {
          this.finishActiveAndAdvance();
        }, 7500);
      }
    } else {
      this.activeItem = null;
      this.notifySubscribers(null);
      this.isAdvancingQueue = false;
    }
  }

  /**
   * User dismissed current banner: moves to next queued reminder or clears all.
   */
  public dismissInAppBanner(skipAll: boolean = false): void {
    this.finishActiveAndAdvance(skipAll);
  }

  /**
   * Enqueues or immediately plays a notification.
   * If a notification or temporary audio is already active, this one is queued in turn ("في دور")
   * without clobbering or cutting off the active reminder!
   */
  public notify(payload: NotifyPayload): void {
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
      audioUrl: payload.audioUrl,
      autoPlayAudio: payload.autoPlayAudio,
      priority: payload.priority ?? (payload.type === 'prayer' ? 10 : payload.type === 'parents' ? 5 : 3)
    };

    this.history.unshift(item);
    if (this.history.length > 25) this.history.pop();

    // 1. Dispatch to OS Notification Center & Outside-App Banner immediately
    this.dispatchOsNotification(item);

    // 2. Gentle haptic vibration
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([150, 80, 150]);
      } catch {}
    }

    // 3. Update OS MediaSession metadata
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: item.title,
          artist: item.body,
          album: 'أثر | ATHAR',
          artwork: [
            { src: '/athar-royal-icon.jpg', sizes: '512x512', type: 'image/jpeg' },
            { src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' }
          ]
        });
      } catch {}
    }

    // 4. Notification Queue Check ("دور التنبيهات المنظم"):
    // If another notification is currently active or a temporary sound is playing:
    const isBusy = this.activeItem !== null || AudioService.isTemporaryAudioCurrentlyActive();
    if (isBusy) {
      // Insert sorted by priority (e.g., Adhan priority 10 near the front) or FIFO
      const insertIdx = this.queue.findIndex((q) => (q.priority || 3) < (item.priority || 3));
      if (insertIdx === -1) {
        this.queue.push(item);
      } else {
        this.queue.splice(insertIdx, 0, item);
      }

      this.updateQueuePositions();
      // Re-notify subscribers so active card can reflect total queued count
      if (this.activeItem) {
        this.notifySubscribers(this.activeItem);
      }
      return;
    }

    // Otherwise, immediately activate!
    this.activeItem = item;
    this.updateQueuePositions();
    this.notifySubscribers(this.activeItem);

    if (item.autoPlayAudio) {
      this.isAudioPlayingForActive = true;
      item.autoPlayAudio().catch((err) => {
        console.warn('Notification autoPlayAudio error:', err);
        this.isAudioPlayingForActive = false;
        this.bannerTimer = setTimeout(() => {
          this.finishActiveAndAdvance();
        }, 7000);
      });
    } else {
      this.bannerTimer = setTimeout(() => {
        this.finishActiveAndAdvance();
      }, 7500);
    }
  }

  private dispatchOsNotification(item: InAppNotification): void {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission !== 'granted') return;

    const safeSwOptions: any = {
      body: item.body,
      icon: '/athar-royal-icon.jpg',
      badge: '/icon.svg',
      tag: 'athar-unified-alert',
      dir: 'rtl',
      lang: 'ar',
      renotify: true,
      requireInteraction: false,
      vibrate: [250, 100, 250],
      data: {
        url: '/',
        type: item.type,
        audioUrl: item.audioUrl
      }
    };

    const fallbackDirect = () => {
      try {
        const n = new Notification(item.title, {
          body: item.body,
          icon: '/athar-royal-icon.jpg',
          tag: 'athar-unified-alert',
          dir: 'rtl',
          lang: 'ar'
        });
        n.onclick = () => {
          window.focus();
          item.onAction?.();
          n.close();
        };
      } catch (err) {
        console.warn('Direct Notification error:', err);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        const effectiveReg = reg || this.swRegistration;
        if (effectiveReg && typeof effectiveReg.showNotification === 'function') {
          effectiveReg.showNotification(item.title, safeSwOptions).catch(() => {
            fallbackDirect();
          });
        } else {
          fallbackDirect();
        }
      }).catch(() => {
        fallbackDirect();
      });
    } else {
      fallbackDirect();
    }
  }
}

export const NotificationService = new NotificationManager();
