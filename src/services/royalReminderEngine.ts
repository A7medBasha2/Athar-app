import { StorageService } from './storageService';
import { QuranService } from './quranService';
import { PrayerTimesService } from './prayerTimesService';
import { ReminderEngine } from './reminderService';
import { NavigationTab } from '../types';
import { VERIFIED_RECITERS, getAyahAudioUrl } from '../data/surahsData';
import { VERIFIED_DHIKR_REMINDERS } from '../data/dhikrRemindersData';
import { LocalNotifications } from '@capacitor/local-notifications';

export type RoyalNotificationType = 'ayah_daily' | 'dhikr_salawat' | 'daily_wird' | 'parents_birr';
export type RoyalNotificationMode = 'banner_only' | 'banner_with_play' | 'auto_sound';

export interface RoyalNotificationItem {
  id: string;
  type: RoyalNotificationType;
  badgeTitle: string;
  title: string;
  subtitle?: string;
  mainText: string;
  referenceText?: string;
  audioUrl: string;
  audioDurationSeconds: number;
  mode: RoyalNotificationMode;
  targetPayload?: {
    surahNumber?: number;
    ayahNumber?: number;
    surahName?: string;
    adhkarCategory?: 'morning' | 'evening';
    dhikrId?: string;
    sakinaTab?: 'kinship' | 'heart_healing' | 'tadabbur' | 'intentions' | 'rights_wasiyyah';
  };
  actionButtonText: string;
  timestamp: number;
}

export interface RoyalNotificationState {
  item: RoyalNotificationItem | null;
  isPlayingAudio: boolean;
  isMuted: boolean;
  queueLength: number;
}

type RoyalListener = (state: RoyalNotificationState) => void;

class RoyalReminderEngineClass {
  private queue: RoyalNotificationItem[] = [];
  private activeItem: RoyalNotificationItem | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private isPlayingAudio: boolean = false;
  private isMuted: boolean = false;
  private listeners: Set<RoyalListener> = new Set();
  private checkIntervalId: number | null = null;
  private lastTriggeredMinuteKey: string = '';
  private lastTriggeredTimestamps: Record<string, number> = {};
  private activeCountdownTimers: Record<string, number> = {};
  private autoDismissTimeoutId: number | null = null;

  constructor() {
    this.initAdhanListener();
  }

  private initAdhanListener(): void {
    if (typeof window === 'undefined') return;

    ReminderEngine.subscribeAdhanScreen((adhanState) => {
      if (!adhanState && this.queue.length > 0 && !this.activeItem) {
        setTimeout(() => {
          this.processQueue();
        }, 1200);
      }
    });
  }

  public start(): void {
    if (this.checkIntervalId !== null || typeof window === 'undefined') return;
    this.checkSchedule();
    this.checkIntervalId = window.setInterval(() => {
      this.checkSchedule();
    }, 25000);
  }

  public stop(): void {
    if (this.checkIntervalId !== null && typeof window !== 'undefined') {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
    this.clearAllCountdowns();
  }

  public clearAllCountdowns(): void {
    if (typeof window === 'undefined') return;
    Object.values(this.activeCountdownTimers).forEach((id) => {
      clearInterval(id);
    });
    this.activeCountdownTimers = {};
  }

  public subscribe(listener: RoyalListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): RoyalNotificationState {
    return {
      item: this.activeItem,
      isPlayingAudio: this.isPlayingAudio,
      isMuted: this.isMuted,
      queueLength: this.queue.length,
    };
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((cb) => {
      try {
        cb(state);
      } catch (e) {
        console.warn('Royal listener error:', e);
      }
    });
  }

  public isQuietHoursActive(): boolean {
    try {
      const settings = StorageService.getSettings();
      const quiet = settings.quietHours;
      if (!quiet || !quiet.enabled) return false;

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const [startH, startM] = (quiet.startTime || '23:00').split(':').map(Number);
      const [endH, endM] = (quiet.endTime || '07:00').split(':').map(Number);
      const startMinutes = startH * 60 + (startM || 0);
      const endMinutes = endH * 60 + (endM || 0);

      if (startMinutes <= endMinutes) {
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
      } else {
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      }
    } catch {
      return false;
    }
  }

  public isAdhanActiveOrImminent(windowSeconds: number = 15): boolean {
    if (ReminderEngine.hasActiveAdhanScreen()) return true;

    try {
      const settings = StorageService.getSettings();
      if (!settings.adhanEnabled) return false;

      const prayerTimes = PrayerTimesService.getInitialPrayerTimes(
        settings.location,
        settings.calculationMethod || '5'
      );
      if (!prayerTimes?.timings) return false;

      const now = new Date();
      const nowMs = now.getTime();
      const prayers: Array<'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'> = [
        'fajr',
        'dhuhr',
        'asr',
        'maghrib',
        'isha',
      ];

      for (const p of prayers) {
        const timeStr = prayerTimes.timings[p];
        if (!timeStr) continue;

        const [h, m] = timeStr.trim().split(':').map(Number);
        const pDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
        const diffMs = pDate.getTime() - nowMs;
        const diffSec = diffMs / 1000;

        if (diffSec >= 0 && diffSec <= windowSeconds) {
          return true;
        }
      }
    } catch {}

    return false;
  }

  public async buildAlertItem(
    type: RoyalNotificationType,
    forcedMode?: RoyalNotificationMode
  ): Promise<RoyalNotificationItem> {
    const settings = StorageService.getSettings();

    switch (type) {
      case 'ayah_daily': {
        const verse = await QuranService.getRandomVerseForReminder();
        const mode = forcedMode || this.mapReminderMode(settings.quranVerseReminder?.mode);
        const surahNum = verse?.surahNumber || 1;
        const ayahNum = verse?.ayahNumber || 2;
        const surahName = verse?.surahName || 'الفاتحة';
        const verseText = verse?.text || 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ';

        const reciterId = settings.quranVerseReminder?.reciterId || settings.selectedReciterId || 'alafasy';
        const activeReciter =
          VERIFIED_RECITERS.find((r) => r.id === reciterId) || VERIFIED_RECITERS[0];
        
        const audioUrl = getAyahAudioUrl(activeReciter.audioServer, surahNum, ayahNum);

        return {
          id: `ayah_${Date.now()}`,
          type: 'ayah_daily',
          badgeTitle: 'اقرأ ولو آية في اليوم',
          title: `تلاوة ${activeReciter.nameArabic}`,
          subtitle: `سورة ${surahName} • الآية ${ayahNum}`,
          mainText: verseText,
          referenceText: `سورة ${surahName} • آية [${ayahNum}] • تلاوة ${activeReciter.nameArabic}`,
          audioUrl,
          audioDurationSeconds: 15,
          mode,
          targetPayload: {
            surahNumber: surahNum,
            ayahNumber: ayahNum,
            surahName,
          },
          actionButtonText: 'فتح الآية بالمصحف',
          timestamp: Date.now(),
        };
      }

      case 'dhikr_salawat': {
        const mode = forcedMode || this.mapReminderMode(settings.salawatReminder?.mode);
        const enabledIds =
          settings.salawatReminder?.enabledDhikrIds || StorageService.getEnabledDhikrAlertIds();
        
        let pool = VERIFIED_DHIKR_REMINDERS.filter((d) => enabledIds.includes(d.id));
        if (pool.length === 0) {
          pool = VERIFIED_DHIKR_REMINDERS;
        }

        const pick = pool[Math.floor(Math.random() * pool.length)];

        return {
          id: `dhikr_${pick.id}_${Date.now()}`,
          type: 'dhikr_salawat',
          badgeTitle: 'ذكر الله والصلاة على النبي ﷺ',
          title: pick.title,
          subtitle: pick.categoryLabel,
          mainText: pick.arabicText,
          referenceText: pick.fadl,
          audioUrl: pick.audioUrl,
          audioDurationSeconds: pick.durationSeconds || 10,
          mode,
          targetPayload: {
            adhkarCategory: 'morning',
            dhikrId: pick.id as any,
          },
          actionButtonText: 'فتح حصن الأذكار',
          timestamp: Date.now(),
        };
      }

      case 'daily_wird': {
        const mode = forcedMode || this.mapReminderMode(settings.dailyWirdReminder?.mode);
        return {
          id: `wird_${Date.now()}`,
          type: 'daily_wird',
          badgeTitle: 'الورد القرآني اليومي',
          title: 'حزبك ووردك اليومي من النور',
          subtitle: '«خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ»',
          mainText: 'حَانَ مَوْعِدُ وِرْدِكَ الْقُرْآنِيِّ الْمُبَارَكِ.. لَا تَهْجُرِ الْمُصْحَفَ وَاجْعَلْ لِقَلْبِكَ نَصِيبًا مِنَ النُّورِ',
          referenceText: 'من حافظ على ورده القرآني كتبه الله من الذاكرين المحفوظين بحفظه.',
          audioUrl: '/audio/wird.mp3',
          audioDurationSeconds: 5.7,
          mode,
          targetPayload: {
            surahNumber: 1,
            ayahNumber: 1,
          },
          actionButtonText: 'فتح الورد القرآني',
          timestamp: Date.now(),
        };
      }

      case 'parents_birr': {
        const mode = forcedMode || this.mapReminderMode(settings.parentsReminder?.mode);
        return {
          id: `parents_${Date.now()}`,
          type: 'parents_birr',
          badgeTitle: 'بِرّ الوالدين والإحسان إليهما',
          title: 'باب الجنة الأوسط وأعظم القربات',
          subtitle: '«وَقَضَىٰ رَبُّكَ أَلَّا تَعْبُدُوا إِلَّا إِيَّاهُ وَبِالْوَالِدَيْنِ إِحْسَانًا»',
          mainText: '«رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا»',
          referenceText: 'تذكير بالدعاء الصادق للوالدين، مكالمتهما، أو التصدق عنهما بنيّة البرّ والمغفرة.',
          audioUrl: '/audio/parents.mp3',
          audioDurationSeconds: 11.4,
          mode,
          targetPayload: {
            sakinaTab: 'kinship',
          },
          actionButtonText: 'فتح ميثاق بر الوالدين',
          timestamp: Date.now(),
        };
      }
    }
  }

  private mapReminderMode(rawMode?: string): RoyalNotificationMode {
    if (rawMode === 'notification_only') return 'banner_only';
    if (rawMode === 'notification_with_play_action') return 'banner_with_play';
    return 'auto_sound';
  }

  public enqueue(item: RoyalNotificationItem): void {
    if (this.isQuietHoursActive() && item.mode === 'auto_sound') {
      item = { ...item, mode: 'banner_with_play' };
    }

    this.queue.push(item);
    this.processQueue();
  }

  public processQueue(): void {
    if (this.activeItem !== null) {
      this.notify();
      return;
    }

    if (this.queue.length === 0) {
      this.notify();
      return;
    }

    const nextItem = this.queue[0];

    const adhanImminent = this.isAdhanActiveOrImminent(15);
    const isAdhanRinging = ReminderEngine.hasActiveAdhanScreen();

    if (isAdhanRinging) {
      console.log('Adhan is active; holding royal notification in queue');
      return;
    }

    if (adhanImminent && nextItem.audioDurationSeconds > 15) {
      console.log('Adhan imminent within 15s; postponing long notification in queue');
      return;
    }

    this.queue.shift();
    this.presentItem(nextItem);
  }

  public clearAutoDismissTimer(): void {
    if (this.autoDismissTimeoutId !== null && typeof window !== 'undefined') {
      clearTimeout(this.autoDismissTimeoutId);
      this.autoDismissTimeoutId = null;
    }
  }

  public scheduleAutoDismiss(ms: number): void {
    this.clearAutoDismissTimer();
    if (typeof window === 'undefined') return;
    this.autoDismissTimeoutId = window.setTimeout(() => {
      this.dismissCurrent();
    }, ms);
  }

  public async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      const res = await LocalNotifications.requestPermissions();
      return res.display === 'granted';
    } catch {
      if ('Notification' in window) {
        const res = await Notification.requestPermission();
        return res === 'granted';
      }
      return false;
    }
  }

  private async dispatchSystemNotification(item: RoyalNotificationItem): Promise<void> {
    if (typeof window === 'undefined') return;

    const title = `أَثَـر • ${item.badgeTitle}`;
    const body = `${item.title}\n${item.mainText.slice(0, 110)}...`;

    // 1. Android / iOS System Notification using Capacitor LocalNotifications
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: title,
            body: body,
            id: Math.floor(Math.random() * 100000) + 1,
            schedule: { at: new Date(Date.now() + 100) },
            extra: {
              type: 'royal_alert',
              alert_type: item.type,
              alert_title: item.title,
              alert_body: item.mainText,
              audio_url: item.audioUrl,
              open_royal_alert: true,
            },
            channelId: 'athar_athan_fullscreen_channel',
          },
        ],
      });
    } catch (e) {
      console.warn('Capacitor LocalNotification error:', e);
    }

    // 2. Web Browser Standard Notification Fallback
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const options: any = {
          body: body,
          icon: '/icon-logo.png',
          badge: '/icon-logo.png',
          tag: `royal_alert_${item.type}`,
          requireInteraction: true,
          vibrate: [250, 100, 250, 100, 500],
          renotify: true,
        };

        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const registration = await navigator.serviceWorker.ready;
          registration.showNotification(title, options);
        } else {
          const notif = new Notification(title, options);
          notif.onclick = () => {
            window.focus();
            notif.close();
          };
        }
      } catch (e) {
        console.warn('Web System notification error:', e);
      }
    }
  }

  private presentItem(item: RoyalNotificationItem): void {
    this.clearAutoDismissTimer();
    this.activeItem = item;
    this.isMuted = item.mode === 'banner_only';
    this.isPlayingAudio = false;

    // Dispatch System Notification for lock screen and background overlay coverage
    this.dispatchSystemNotification(item);

    if (item.mode === 'banner_only') {
      this.scheduleAutoDismiss(5000);
      this.notify();
    } else if (item.mode === 'auto_sound' && !this.isQuietHoursActive()) {
      this.playAudioForCurrent();
    } else {
      this.scheduleAutoDismiss(15000);
      this.notify();
    }
  }

  public playAudioForCurrent(): void {
    if (!this.activeItem || !this.activeItem.audioUrl) return;

    this.clearAutoDismissTimer();
    this.stopAudio();
    try {
      const audio = new Audio(this.activeItem.audioUrl);
      this.currentAudio = audio;
      audio.volume = 1.0;

      audio.onplay = () => {
        this.isPlayingAudio = true;
        this.isMuted = false;
        this.notify();
      };

      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
          this.clearAutoDismissTimer();
          const safetyMs = Math.round((audio.duration + 2) * 1000);
          this.autoDismissTimeoutId = window.setTimeout(() => {
            if (this.activeItem) {
              this.dismissCurrent();
            }
          }, safetyMs);
        }
      };

      audio.onended = () => {
        this.isPlayingAudio = false;
        this.notify();
        this.dismissCurrent();
      };

      audio.onerror = (e) => {
        console.warn('Royal alert audio playback failed:', e);
        if (this.activeItem?.type === 'ayah_daily' && this.activeItem.targetPayload?.surahNumber && this.activeItem.targetPayload?.ayahNumber) {
          const sNum = this.activeItem.targetPayload.surahNumber;
          const aNum = this.activeItem.targetPayload.ayahNumber;
          const alafasyAyahUrl = getAyahAudioUrl('https://everyayah.com/data/Alafasy_128kbps', sNum, aNum);
          if (alafasyAyahUrl !== this.activeItem.audioUrl) {
            try {
              const fallbackAudio = new Audio(alafasyAyahUrl);
              this.currentAudio = fallbackAudio;
              fallbackAudio.onended = () => {
                this.isPlayingAudio = false;
                this.notify();
                this.dismissCurrent();
              };
              fallbackAudio.play().then(() => {
                this.isPlayingAudio = true;
                this.notify();
              }).catch(() => {
                this.isPlayingAudio = false;
                this.notify();
                this.scheduleAutoDismiss(5000);
              });
              return;
            } catch {}
          }
        }

        if (this.activeItem?.type === 'dhikr_salawat' && this.activeItem.id.includes('salawat')) {
          try {
            const fallbackAudio = new Audio('/audio/salawat.mp3');
            this.currentAudio = fallbackAudio;
            fallbackAudio.onended = () => {
              this.isPlayingAudio = false;
              this.notify();
              this.dismissCurrent();
            };
            fallbackAudio.play().then(() => {
              this.isPlayingAudio = true;
              this.notify();
            }).catch(() => {
              this.isPlayingAudio = false;
              this.notify();
              this.scheduleAutoDismiss(5000);
            });
            return;
          } catch {}
        }

        this.isPlayingAudio = false;
        this.notify();
        this.scheduleAutoDismiss(5000);
      };

      audio.play().catch((err) => {
        console.warn('Audio play prevented by browser autoplay policy:', err);
        this.isPlayingAudio = false;
        this.isMuted = true;
        this.notify();
        this.scheduleAutoDismiss(5000);
      });

      const safetyMs = Math.max(7000, Math.round((this.activeItem.audioDurationSeconds + 2) * 1000));
      this.autoDismissTimeoutId = window.setTimeout(() => {
        if (this.activeItem) {
          this.dismissCurrent();
        }
      }, safetyMs);
    } catch (err) {
      console.warn('Audio setup error:', err);
      this.isPlayingAudio = false;
      this.scheduleAutoDismiss(5000);
      this.notify();
    }
  }

  public stopAudio(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {}
      this.currentAudio = null;
    }
    this.isPlayingAudio = false;
  }

  public toggleAudio(): void {
    if (this.isPlayingAudio) {
      this.stopAudio();
      this.isMuted = true;
      this.scheduleAutoDismiss(5000);
      this.notify();
    } else {
      this.playAudioForCurrent();
    }
  }

  public dismissCurrent(): void {
    this.clearAutoDismissTimer();
    this.stopAudio();
    this.activeItem = null;
    this.notify();

    setTimeout(() => {
      this.processQueue();
    }, 400);
  }

  public executeAction(onNavigate: (tab: NavigationTab, payload?: any) => void): void {
    const item = this.activeItem;
    if (!item) return;

    const payload = item.targetPayload;
    const type = item.type;

    this.dismissCurrent();

    if (type === 'ayah_daily') {
      onNavigate('quran', payload);
    } else if (type === 'dhikr_salawat') {
      onNavigate('adhkar', payload);
    } else if (type === 'daily_wird') {
      onNavigate('quran', payload);
    } else if (type === 'parents_birr') {
      onNavigate('journey', { openSakina: true, sakinaTab: 'kinship' });
    }
  }

  public trigger5SecondTest(
    type: RoyalNotificationType,
    onTick?: (secondsRemaining: number) => void
  ): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();

    if (this.activeCountdownTimers[type]) {
      clearInterval(this.activeCountdownTimers[type]);
      delete this.activeCountdownTimers[type];
    }

    return new Promise((resolve) => {
      let seconds = 5;
      onTick?.(seconds);

      const timerId = window.setInterval(async () => {
        seconds -= 1;
        if (seconds > 0) {
          onTick?.(seconds);
        } else {
          clearInterval(timerId);
          delete this.activeCountdownTimers[type];
          onTick?.(0);

          const item = await this.buildAlertItem(type, 'auto_sound');
          this.enqueue(item);
          resolve();
        }
      }, 1000);

      this.activeCountdownTimers[type] = timerId;
    });
  }

  public cancelTest(type: RoyalNotificationType): void {
    if (this.activeCountdownTimers[type]) {
      clearInterval(this.activeCountdownTimers[type]);
      delete this.activeCountdownTimers[type];
    }
  }

  public isTestRunning(type: RoyalNotificationType): boolean {
    return Boolean(this.activeCountdownTimers[type]);
  }

  public async triggerAlertImmediately(type: RoyalNotificationType): Promise<void> {
    try {
      const item = await this.buildAlertItem(type, 'auto_sound');
      this.enqueue(item);
    } catch (e) {
      console.warn('Error triggering royal alert immediately:', e);
    }
  }

  public async triggerAlertFromNative(payload: {
    type?: string;
    title?: string;
    body?: string;
    badge?: string;
    audioUrl?: string;
    surahNumber?: number;
    ayahNumber?: number;
    adhkarCategory?: 'morning' | 'evening';
    playSound?: boolean;
  }): Promise<void> {
    try {
      const type: RoyalNotificationType =
        payload.type === 'ayah_daily'
          ? 'ayah_daily'
          : payload.type === 'daily_wird'
          ? 'daily_wird'
          : payload.type === 'parents_birr'
          ? 'parents_birr'
          : 'dhikr_salawat';

      const baseItem = await this.buildAlertItem(type, payload.playSound === false ? 'banner_only' : 'auto_sound');
      const finalItem: RoyalNotificationItem = {
        ...baseItem,
        title: payload.title || baseItem.title,
        badgeTitle: payload.badge || baseItem.badgeTitle,
        mainText: payload.body || baseItem.mainText,
        audioUrl: payload.audioUrl || baseItem.audioUrl,
        mode: payload.playSound === false ? 'banner_only' : 'auto_sound',
        targetPayload: {
          ...baseItem.targetPayload,
          surahNumber: payload.surahNumber || baseItem.targetPayload?.surahNumber,
          ayahNumber: payload.ayahNumber || baseItem.targetPayload?.ayahNumber,
          adhkarCategory: payload.adhkarCategory || baseItem.targetPayload?.adhkarCategory,
        },
      };

      this.dismissCurrent();
      this.presentItem(finalItem);
    } catch (e) {
      console.warn('Error triggering royal alert from native:', e);
    }
  }

  private async checkSchedule(): Promise<void> {
    try {
      const settings = StorageService.getSettings();
      const now = new Date();
      const currentHh = String(now.getHours()).padStart(2, '0');
      const currentMm = String(now.getMinutes()).padStart(2, '0');
      const currentHhMm = `${currentHh}:${currentMm}`;
      const nowMs = now.getTime();

      const minuteKey = `${now.toDateString()}_${currentHhMm}`;
      if (this.lastTriggeredMinuteKey === minuteKey) return;
      this.lastTriggeredMinuteKey = minuteKey;

      if (settings.quranVerseReminder?.enabled) {
        const schedTime = settings.quranVerseReminder.startTime || '08:00';
        if (schedTime === currentHhMm) {
          const item = await this.buildAlertItem('ayah_daily');
          this.enqueue(item);
        }
      }

      if (settings.salawatReminder?.enabled) {
        const schedTime = settings.salawatReminder.startTime || '10:00';
        if (schedTime === currentHhMm) {
          const item = await this.buildAlertItem('dhikr_salawat');
          this.enqueue(item);
        }
      }

      if (settings.dailyWirdReminder?.enabled) {
        const schedTime = settings.dailyWirdReminder.startTime || '17:00';
        if (schedTime === currentHhMm) {
          const item = await this.buildAlertItem('daily_wird');
          this.enqueue(item);
        }
      }

      if (settings.parentsReminder?.enabled) {
        const freq = settings.parentsReminder.frequency || 'daily';
        const lastTriggered = this.lastTriggeredTimestamps['parents_birr'] || 0;
        const intervalMs = this.getFrequencyIntervalMs(freq);

        if (freq === 'daily') {
          const schedTime = settings.parentsReminder.startTime || '09:00';
          if (schedTime === currentHhMm && nowMs - lastTriggered > 60 * 60 * 1000) {
            this.lastTriggeredTimestamps['parents_birr'] = nowMs;
            const item = await this.buildAlertItem('parents_birr');
            this.enqueue(item);
          }
        } else {
          if (nowMs - lastTriggered >= intervalMs) {
            this.lastTriggeredTimestamps['parents_birr'] = nowMs;
            const item = await this.buildAlertItem('parents_birr');
            this.enqueue(item);
          }
        }
      }
    } catch (e) {
      console.warn('Error checking royal schedule:', e);
    }
  }

  private getFrequencyIntervalMs(freq: string): number {
    switch (freq) {
      case '30m':
        return 30 * 60 * 1000;
      case '1h':
        return 60 * 60 * 1000;
      case '2h':
        return 2 * 60 * 60 * 1000;
      case '3h':
        return 3 * 60 * 60 * 1000;
      case '6h':
        return 6 * 60 * 60 * 1000;
      case '12h':
        return 12 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  }
}

export const RoyalReminderEngine = new RoyalReminderEngineClass();
