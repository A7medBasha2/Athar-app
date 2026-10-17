import { StorageService } from './storageService';
import { QuranService } from './quranService';
import { PrayerTimesService } from './prayerTimesService';
import { ReminderEngine } from './reminderService';
import { NavigationTab } from '../types';
import { VERIFIED_RECITERS, getAyahAudioUrl } from '../data/surahsData';
import { VERIFIED_DHIKR_REMINDERS } from '../data/dhikrRemindersData';

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

    // Listen to Adhan completion so queued royal notifications resume seamlessly
    ReminderEngine.subscribeAdhanScreen((adhanState) => {
      if (!adhanState && this.queue.length > 0 && !this.activeItem) {
        // Delay slightly for spiritual reverence after prayer/duaa
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
    }, 25000); // Check every 25 seconds
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

  /**
   * Checks whether the current time is inside user-configured Quiet Hours
   */
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
        // Crosses midnight (e.g. 23:00 to 07:00)
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      }
    } catch {
      return false;
    }
  }

  /**
   * Adhan Preemption Rule:
   * Returns true if Adhan is actively playing OR remaining time until next prayer is <= 15 seconds.
   */
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

  /**
   * Builds an alert item for any of the 4 types
   */
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

        // Select the active reciter configured by user or default to Sheikh Alafasy
        const reciterId = settings.quranVerseReminder?.reciterId || settings.selectedReciterId || 'alafasy';
        const activeReciter =
          VERIFIED_RECITERS.find((r) => r.id === reciterId) || VERIFIED_RECITERS[0];
        
        // Exact audio recitation URL for the specific random ayah
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

        // Pick one randomly among the enabled adhkar so sound & text are always in sync and variable
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

  /**
   * Enqueues a notification into the Royal Queue system
   */
  public enqueue(item: RoyalNotificationItem): void {
    // If quiet hours are active and mode is auto_sound, convert to banner_with_play so we don't disturb sleep
    if (this.isQuietHoursActive() && item.mode === 'auto_sound') {
      item = { ...item, mode: 'banner_with_play' };
    }

    this.queue.push(item);
    this.processQueue();
  }

  /**
   * Serial queue processor: prevents UI overlapping or double-audio
   */
  public processQueue(): void {
    if (this.activeItem !== null) {
      // An alert is currently presented to the user
      this.notify();
      return;
    }

    if (this.queue.length === 0) {
      this.notify();
      return;
    }

    const nextItem = this.queue[0];

    // Priority Check: Is Adhan currently ringing or imminent within 15 seconds?
    // Exception: If notification is very short (<= 15 seconds) AND Adhan is NOT actively ringing yet, we may allow it
    const adhanImminent = this.isAdhanActiveOrImminent(15);
    const isAdhanRinging = ReminderEngine.hasActiveAdhanScreen();

    if (isAdhanRinging) {
      // Must wait in queue until Adhan ends
      console.log('Adhan is active; holding royal notification in queue');
      return;
    }

    if (adhanImminent && nextItem.audioDurationSeconds > 15) {
      // Next prayer is within 15 seconds; wait until prayer and duaa complete
      console.log('Adhan imminent within 15s; postponing long notification in queue');
      return;
    }

    // Pop item from queue and activate
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
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    try {
      const res = await Notification.requestPermission();
      return res === 'granted';
    } catch {
      return false;
    }
  }

  private dispatchSystemNotification(item: RoyalNotificationItem): void {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      const title = `أَثَـر • ${item.badgeTitle}`;
      const options: any = {
        body: `${item.title}\n${item.mainText.slice(0, 110)}...`,
        icon: '/icon-logo.png',
        badge: '/icon-logo.png',
        tag: `royal_alert_${item.type}`,
        requireInteraction: true,
        vibrate: [250, 100, 250, 100, 500],
        renotify: true,
      };

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready
          .then((registration) => {
            registration.showNotification(title, options);
          })
          .catch(() => {
            new Notification(title, options);
          });
      } else {
        const notif = new Notification(title, options);
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      }
    } catch (e) {
      console.warn('System notification error:', e);
    }
  }

  private presentItem(item: RoyalNotificationItem): void {
    this.clearAutoDismissTimer();
    this.activeItem = item;
    this.isMuted = item.mode === 'banner_only';
    this.isPlayingAudio = false;

    // 1. Dispatch System Notification for lock screen and background overlay coverage
    this.dispatchSystemNotification(item);

    // 2. Timing logic according to user specification:
    // - Silent mode ("إشعار فقط"): disappears automatically after exactly 5 seconds
    // - Audio mode ("إشعار بصوت تلقائي"): disappears automatically when audio finishes
    if (item.mode === 'banner_only') {
      this.scheduleAutoDismiss(5000);
      this.notify();
    } else if (item.mode === 'auto_sound' && !this.isQuietHoursActive()) {
      this.playAudioForCurrent();
    } else {
      // "إشعار وزر لتشغيل الصوت": if user doesn't interact within 15s, dismiss gracefully
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
          // Adjust safety timeout based on actual audio duration + 2s
          this.clearAutoDismissTimer();
          const safetyMs = Math.round((audio.duration + 2) * 1000);
          this.autoDismissTimeoutId = window.setTimeout(() => {
            if (this.activeItem) {
              this.dismissCurrent();
            }
          }, safetyMs);
        }
      };

      // Critical requirement:
      // "يجب أن ينتهي التنبيه وإغلاق الشاشة العائمة تلقائياً بمجرد انتهاء الصوت المخصص له."
      audio.onended = () => {
        this.isPlayingAudio = false;
        this.notify();
        this.dismissCurrent();
      };

      audio.onerror = (e) => {
        console.warn('Royal alert audio playback failed:', e);
        // For ayah_daily: retry with Alafasy CDN on EveryAyah for that EXACT same surah and ayah
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

        // For dhikr_salawat: if network fails on a salawat item, try local salawat audio
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
        // Fallback to 5-second auto-dismiss if audio can't load
        this.scheduleAutoDismiss(5000);
      };

      audio.play().catch((err) => {
        console.warn('Audio play prevented by browser autoplay policy:', err);
        this.isPlayingAudio = false;
        this.isMuted = true;
        this.notify();
        // Fallback to 5-second auto-dismiss if autoplay is blocked
        this.scheduleAutoDismiss(5000);
      });

      // Initial safety ceiling: in case audio is interrupted or browser fails onended
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
      // When muted by user, allow 5 seconds before closing
      this.scheduleAutoDismiss(5000);
      this.notify();
    } else {
      this.playAudioForCurrent();
    }
  }

  /**
   * User dismissed current royal notification card or automatically timed out
   */
  public dismissCurrent(): void {
    this.clearAutoDismissTimer();
    this.stopAudio();
    this.activeItem = null;
    this.notify();

    // Process next item in queue after brief delay
    setTimeout(() => {
      this.processQueue();
    }, 400);
  }

  /**
   * User clicked direct action button (e.g. Open Ayah, Open Dhikr, etc.)
   */
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

  /**
   * 5-second countdown test trigger for a specific alert
   */
  public trigger5SecondTest(
    type: RoyalNotificationType,
    onTick?: (secondsRemaining: number) => void
  ): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();

    // Clear any existing countdown for this type
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

          // Force instant alert presentation
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

  /**
   * Triggers a royal alert immediately with auto_sound (e.g. from notification click or deep link)
   */
  public async triggerAlertImmediately(type: RoyalNotificationType): Promise<void> {
    try {
      const item = await this.buildAlertItem(type, 'auto_sound');
      this.enqueue(item);
    } catch (e) {
      console.warn('Error triggering royal alert immediately:', e);
    }
  }

  /**
   * Periodically checks scheduled hours and repetition intervals
   */
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

      // 1. Ayah Daily
      if (settings.quranVerseReminder?.enabled) {
        const schedTime = settings.quranVerseReminder.startTime || '08:00';
        if (schedTime === currentHhMm) {
          const item = await this.buildAlertItem('ayah_daily');
          this.enqueue(item);
        }
      }

      // 2. Dhikr & Salawat
      if (settings.salawatReminder?.enabled) {
        const schedTime = settings.salawatReminder.startTime || '10:00';
        if (schedTime === currentHhMm) {
          const item = await this.buildAlertItem('dhikr_salawat');
          this.enqueue(item);
        }
      }

      // 3. Daily Wird
      if (settings.dailyWirdReminder?.enabled) {
        const schedTime = settings.dailyWirdReminder.startTime || '17:00';
        if (schedTime === currentHhMm) {
          const item = await this.buildAlertItem('daily_wird');
          this.enqueue(item);
        }
      }

      // 4. Parents Birr (Repetition check)
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
          // Recurring interval (e.g. 30m, 1h, 2h, etc.)
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
