import { StorageService } from './storageService';
import { QuranService } from './quranService';
import { AudioService } from './audioService';
import { NotificationService } from './notificationService';
import { VERIFIED_RECITERS, getAyahAudioUrl } from '../data/surahsData';
import { VERIFIED_DHIKR_REMINDERS, DhikrAudioReminderItem } from '../data/dhikrRemindersData';
import { PrayerTimesService, formatPrayerTime12 } from './prayerTimesService';

const REMINDER_STATE_KEY = 'athar_reminder_timestamps_v2';

interface PersistedReminderTimestamps {
  lastSalawatTime: number;
  lastQuranTime: number;
  lastWirdTime: number;
  lastDhikrTime: number;
  lastSpokenReminderTimestamp: number;
  lastDispatchedType: 'quran' | 'salawat' | 'wird' | 'dhikr' | null;
  lastCheckedPrayerTime: string | null;
  scheduledIqamah: { prayerKey: string; nameArabic: string; triggerTime: number } | null;
}

class ScheduledReminderEngine {
  private timerId: number | null = null;
  private workerTimer: Worker | null = null;
  private lastSalawatTime = Date.now();
  private lastQuranTime = Date.now();
  private lastWirdTime = Date.now();
  private lastDhikrTime = Date.now();
  private lastSpokenReminderTimestamp = 0;
  private lastDispatchedType: 'quran' | 'salawat' | 'wird' | 'dhikr' | null = null;
  private lastCheckedPrayerTime: string | null = null;
  private scheduledIqamah: { prayerKey: string; nameArabic: string; triggerTime: number } | null = null;
  private visibilityListenerBound = false;

  constructor() {
    this.loadPersistedState();
  }

  private loadPersistedState() {
    try {
      const raw = localStorage.getItem(REMINDER_STATE_KEY);
      if (raw) {
        const parsed: PersistedReminderTimestamps = JSON.parse(raw);
        const now = Date.now();
        this.lastSalawatTime = parsed.lastSalawatTime && now - parsed.lastSalawatTime < 43200000 ? parsed.lastSalawatTime : now;
        this.lastQuranTime = parsed.lastQuranTime && now - parsed.lastQuranTime < 43200000 ? parsed.lastQuranTime : now;
        this.lastWirdTime = parsed.lastWirdTime && now - parsed.lastWirdTime < 43200000 ? parsed.lastWirdTime : now;
        this.lastDhikrTime = parsed.lastDhikrTime && now - parsed.lastDhikrTime < 43200000 ? parsed.lastDhikrTime : now;
        this.lastSpokenReminderTimestamp = parsed.lastSpokenReminderTimestamp || 0;
        this.lastDispatchedType = parsed.lastDispatchedType || null;
        this.lastCheckedPrayerTime = parsed.lastCheckedPrayerTime || null;
        this.scheduledIqamah =
          parsed.scheduledIqamah && parsed.scheduledIqamah.triggerTime > now - 60000
            ? parsed.scheduledIqamah
            : null;
      }
    } catch {}
  }

  private savePersistedState() {
    try {
      const state: PersistedReminderTimestamps = {
        lastSalawatTime: this.lastSalawatTime,
        lastQuranTime: this.lastQuranTime,
        lastWirdTime: this.lastWirdTime,
        lastDhikrTime: this.lastDhikrTime,
        lastSpokenReminderTimestamp: this.lastSpokenReminderTimestamp,
        lastDispatchedType: this.lastDispatchedType,
        lastCheckedPrayerTime: this.lastCheckedPrayerTime,
        scheduledIqamah: this.scheduledIqamah
      };
      localStorage.setItem(REMINDER_STATE_KEY, JSON.stringify(state));
    } catch {}
  }

  /**
   * Starts both a standard interval AND an unthrottled Web Worker timer so reminders
   * continue ticking accurately even when the user switches tabs, minimizes the browser,
   * or is outside the app!
   */
  public start() {
    if (this.timerId || this.workerTimer) return;

    const cached = StorageService.getCachedPrayers();
    const today = new Date().toISOString().split('T')[0];
    const s = StorageService.getSettings();
    if (!cached || cached.dateGregorian !== today || cached.locationName !== s.location.city) {
      PrayerTimesService.getPrayerTimes(s.location, s.calculationMethod).catch(() => {});
    }

    if (typeof document !== 'undefined' && !this.visibilityListenerBound) {
      this.visibilityListenerBound = true;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.checkAndTriggerReminders();
        }
      });
    }

    // Create a lightweight inline Web Worker timer so background tabs are not throttled
    if (typeof window !== 'undefined' && 'Worker' in window && 'Blob' in window) {
      try {
        const workerCode = `
          let id = setInterval(() => {
            postMessage('tick');
          }, 3000);
          onmessage = (e) => {
            if (e.data === 'stop') clearInterval(id);
          };
        `;
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        this.workerTimer = new Worker(workerUrl);
        this.workerTimer.onmessage = () => {
          this.checkAndTriggerReminders();
        };
      } catch {
        // Fallback to standard setInterval below
      }
    }

    // Standard fallback 3-second check loop
    this.timerId = window.setInterval(() => {
      this.checkAndTriggerReminders();
    }, 3000);
  }

  public stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.workerTimer) {
      try {
        this.workerTimer.postMessage('stop');
        this.workerTimer.terminate();
      } catch {}
      this.workerTimer = null;
    }
  }

  public resetAllTimersToNow() {
    const now = Date.now();
    this.lastQuranTime = now;
    this.lastSalawatTime = now;
    this.lastWirdTime = now;
    this.lastDhikrTime = now;
    this.lastSpokenReminderTimestamp = now;
    this.savePersistedState();
  }

  /**
   * Restarts the reminder engine when settings change.
   * Staggers initial timestamps cleanly by 15s so when all 4 reminders (Quran, Salawat, Dhikr, Daily Wird)
   * are set to 1 minute ("1m"), they fire in a fair rotation every 15 seconds without starving any reminder!
   */
  public restart() {
    this.stop();
    const now = Date.now();
    this.lastSpokenReminderTimestamp = now - 5000;
    this.lastDhikrTime = now - 45000;
    this.lastWirdTime = now - 30000;
    this.lastSalawatTime = now - 15000;
    this.lastQuranTime = now;
    this.savePersistedState();
    this.start();
  }

  private isWithinQuietHours(now: Date): boolean {
    const settings = StorageService.getSettings();
    if (!settings.quietHours?.enabled) return false;

    const [startH, startM] = (settings.quietHours.startTime || '23:00').split(':').map(Number);
    const [endH, endM] = (settings.quietHours.endTime || '07:00').split(':').map(Number);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    } else {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
  }

  private isWithinTimeWindow(now: Date, startTime?: string, endTime?: string): boolean {
    const [startH, startM] = (startTime || '08:00').split(':').map(Number);
    const [endH, endM] = (endTime || '23:00').split(':').map(Number);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  private getIntervalMs(frequency?: string, customMinutes?: number): number {
    switch (frequency) {
      case '1m': return 60 * 1000;
      case '30m': return 30 * 60 * 1000;
      case '1h': return 60 * 60 * 1000;
      case '2h': return 2 * 60 * 60 * 1000;
      case '3h': return 3 * 60 * 60 * 1000;
      case '4h': return 4 * 60 * 60 * 1000;
      case '6h': return 6 * 60 * 60 * 1000;
      case 'daily': return 24 * 60 * 60 * 1000;
      case 'custom': return (customMinutes || 60) * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }

  private async checkAndTriggerReminders() {
    const now = new Date();
    const nowMs = Date.now();
    const settings = StorageService.getSettings();
    const isQuiet = this.isWithinQuietHours(now);

    // 1. Check Prayer Times (Adhan & Notification) - highest priority, independent of quiet hours
    const cachedPrayers = StorageService.getCachedPrayers();
    if (cachedPrayers && settings.adhanEnabled) {
      const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const prayerEntries = Object.entries(cachedPrayers.timings);

      for (const [key, time] of prayerEntries) {
        if (key === 'sunrise') continue;
        const cleanTime = (time || '').split(' ')[0].trim();
        if (cleanTime === currentTimeStr && this.lastCheckedPrayerTime !== `${key}_${currentTimeStr}`) {
          this.lastCheckedPrayerTime = `${key}_${currentTimeStr}`;
          this.resetAllTimersToNow();

          const prayerNames: Record<string, string> = {
            fajr: 'الفجر',
            dhuhr: 'الظهر',
            asr: 'العصر',
            maghrib: 'المغرب',
            isha: 'العشاء'
          };
          const name = prayerNames[key] || key;
          const adhanMode = settings.adhanMode || 'full';

          const onAdhanFinished = () => {
            if (settings.duaAfterAdhanEnabled) {
              NotificationService.notify({
                title: 'دعاء ما بعد الأذان',
                body: 'اللهم رب هذه الدعوة التامة والصلاة القائمة آت محمداً الوسيلة والفضيلة وابعثه مقاماً محموداً الذي وعدته.',
                type: 'prayer',
                actionText: 'استماع للدعاء',
                onAction: () => AudioService.playDuaAfterAdhan()
              });
              AudioService.playDuaAfterAdhan();
            }
          };

          NotificationService.notify({
            title: `حان الآن موعد أذان ${name} (${settings.location.city || 'موقعك'})`,
            body: `حي على الصلاة، حي على الفلاح · التوقيت: ${formatPrayerTime12(cleanTime)}`,
            type: 'prayer',
            actionText: 'استماع للأذان',
            onAction: () => AudioService.playAdhan(settings.adhanVoice, { mode: adhanMode, onFinished: onAdhanFinished })
          });

          if (settings.adhanEnabled) {
            AudioService.playAdhan(settings.adhanVoice, {
              mode: adhanMode,
              willChainDuaAfterAdhan: Boolean(settings.duaAfterAdhanEnabled),
              onFinished: onAdhanFinished
            });
          }

          if (settings.iqamahSettings?.enabled) {
            const iqamahMinutes =
              key === 'maghrib'
                ? settings.iqamahSettings.maghribMinutes || 5
                : settings.iqamahSettings.defaultMinutes || 15;
            this.scheduledIqamah = {
              prayerKey: key,
              nameArabic: name,
              triggerTime: Date.now() + iqamahMinutes * 60 * 1000
            };
            this.savePersistedState();
          }

          return;
        }
      }
    }

    // 1.5 Check Scheduled Iqamah
    if (this.scheduledIqamah && nowMs >= this.scheduledIqamah.triggerTime) {
      const iq = this.scheduledIqamah;
      this.scheduledIqamah = null;
      this.resetAllTimersToNow();
      NotificationService.notify({
        title: `حان الآن موعد إقامة صلاة ${iq.nameArabic}`,
        body: 'قد قامت الصلاة، قد قامت الصلاة · استووا واعتدلوا يرحمكم الله.',
        type: 'prayer',
        actionText: 'استماع للإقامة',
        onAction: () => AudioService.playIqamah()
      });
      if (settings.iqamahSettings?.soundEnabled) {
        AudioService.playIqamah();
      }
      return;
    }

    // CRITICAL FAIR COOLDOWN GUARD:
    // Use a 14-second cooldown between reminders so that when all 4 reminders (Quran, Salawat, Dhikr, Daily Wird)
    // are set to 1 minute ("1m"), all 4 reminders can fire cleanly within a 60-second minute
    if (AudioService.isTemporaryAudioCurrentlyActive() || nowMs - this.lastSpokenReminderTimestamp < 14000) {
      return;
    }

    const dueReminders: Array<{
      type: 'quran' | 'salawat' | 'wird' | 'dhikr';
      overdueMs: number;
      trigger: () => Promise<void>;
    }> = [];

    // Check Quran Verse Reminder
    const quranSetting = settings.quranVerseReminder;
    if (quranSetting?.enabled) {
      const isTest1m = quranSetting.frequency === '1m';
      const allowedTime = isTest1m || (!isQuiet && this.isWithinTimeWindow(now, quranSetting.startTime, quranSetting.endTime));
      if (allowedTime) {
        const intervalMs = this.getIntervalMs(quranSetting.frequency, quranSetting.customMinutes);
        const elapsed = nowMs - this.lastQuranTime;
        if (elapsed >= intervalMs) {
          dueReminders.push({
            type: 'quran',
            overdueMs: elapsed - intervalMs,
            trigger: async () => {
              this.lastQuranTime = nowMs;
              this.lastSpokenReminderTimestamp = nowMs;
              this.lastDispatchedType = 'quran';
              this.savePersistedState();
              await this.triggerQuranVerseReminder(quranSetting.mode || 'notification_and_sound');
            }
          });
        }
      }
    }

    // Check Salawat Reminder
    const salawatSetting = settings.salawatReminder;
    if (salawatSetting?.enabled) {
      const isTest1m = salawatSetting.frequency === '1m';
      const allowedTime = isTest1m || (!isQuiet && this.isWithinTimeWindow(now, salawatSetting.startTime, salawatSetting.endTime));
      if (allowedTime) {
        const intervalMs = this.getIntervalMs(salawatSetting.frequency, salawatSetting.customMinutes);
        const elapsed = nowMs - this.lastSalawatTime;
        if (elapsed >= intervalMs) {
          dueReminders.push({
            type: 'salawat',
            overdueMs: elapsed - intervalMs,
            trigger: async () => {
              this.lastSalawatTime = nowMs;
              this.lastSpokenReminderTimestamp = nowMs;
              this.lastDispatchedType = 'salawat';
              this.savePersistedState();
              await this.triggerSalawatReminder(salawatSetting.mode || 'notification_and_sound');
            }
          });
        }
      }
    }

    // Check Dhikr Allah & Multiplying Praise Reminder (تنبيهات ذكر الله والتسبيح المضاعف)
    const dhikrSetting = settings.dhikrReminder;
    if (dhikrSetting?.enabled) {
      const isTest1m = dhikrSetting.frequency === '1m';
      const allowedTime = isTest1m || (!isQuiet && this.isWithinTimeWindow(now, dhikrSetting.startTime, dhikrSetting.endTime));
      if (allowedTime) {
        const intervalMs = this.getIntervalMs(dhikrSetting.frequency, dhikrSetting.customMinutes);
        const elapsed = nowMs - this.lastDhikrTime;
        if (elapsed >= intervalMs) {
          dueReminders.push({
            type: 'dhikr',
            overdueMs: elapsed - intervalMs,
            trigger: async () => {
              this.lastDhikrTime = nowMs;
              this.lastSpokenReminderTimestamp = nowMs;
              this.lastDispatchedType = 'dhikr';
              this.savePersistedState();
              await this.triggerDhikrReminder(dhikrSetting.mode || 'notification_and_sound');
            }
          });
        }
      }
    }

    // Check Daily Wird Reminder
    const wirdSetting = settings.dailyWirdReminder;
    if (wirdSetting?.enabled) {
      const isTest1m = wirdSetting.frequency === '1m';
      const allowedTime = isTest1m || (!isQuiet && this.isWithinTimeWindow(now, wirdSetting.startTime, wirdSetting.endTime));
      if (allowedTime) {
        const intervalMs = this.getIntervalMs(wirdSetting.frequency, wirdSetting.customMinutes);
        const elapsed = nowMs - this.lastWirdTime;
        if (elapsed >= intervalMs) {
          dueReminders.push({
            type: 'wird',
            overdueMs: elapsed - intervalMs,
            trigger: async () => {
              this.lastWirdTime = nowMs;
              this.lastSpokenReminderTimestamp = nowMs;
              this.lastDispatchedType = 'wird';
              this.savePersistedState();
              await this.triggerDailyWirdReminder(wirdSetting.mode || 'notification_and_sound');
            }
          });
        }
      }
    }

    if (dueReminders.length > 0) {
      // Sort by highest overdue time first, and break ties by preferring a type different from lastDispatchedType
      dueReminders.sort((a, b) => {
        if (a.type === this.lastDispatchedType && b.type !== this.lastDispatchedType) return 1;
        if (b.type === this.lastDispatchedType && a.type !== this.lastDispatchedType) return -1;
        return b.overdueMs - a.overdueMs;
      });

      await dueReminders[0].trigger();
    }
  }

  public async triggerQuranVerseReminder(
    mode: 'notification_only' | 'notification_and_sound' | 'notification_with_play_action' = 'notification_and_sound'
  ) {
    const verse = await QuranService.getRandomVerseForReminder();
    if (!verse) return;

    const settings = StorageService.getSettings();
    const reciterId = settings.selectedReciterId || 'alafasy';
    const reciter = VERIFIED_RECITERS.find((r) => r.id === reciterId) || VERIFIED_RECITERS[0];
    const audioUrl = getAyahAudioUrl(reciter.audioServer, verse.surahNumber, verse.ayahNumber);

    const playAction = async () => {
      this.lastSpokenReminderTimestamp = Date.now();
      this.savePersistedState();
      await AudioService.playUrl(audioUrl, 'reminder_verse', {
        title: `سورة ${verse.surahName} - آية ${verse.ayahNumber}`,
        subtitle: `تلاوة ${reciter.nameArabic}`,
        surahNumber: verse.surahNumber,
        ayahNumber: verse.ayahNumber,
        reciterName: reciter.nameArabic
      });
    };

    NotificationService.notify({
      title: `آية من القرآن الكريم: سورة ${verse.surahName} (${verse.ayahNumber})`,
      body: verse.text,
      type: 'quran',
      actionText: 'استماع للآية',
      onAction: () => playAction(),
      audioUrl
    });

    if (mode === 'notification_and_sound') {
      await playAction();
    }
  }

  public async triggerSalawatReminder(
    mode: 'notification_only' | 'notification_and_sound' | 'notification_with_play_action' = 'notification_and_sound'
  ) {
    const playAction = async () => {
      this.lastSpokenReminderTimestamp = Date.now();
      this.savePersistedState();
      await AudioService.playSalawatReminder();
    };

    NotificationService.notify({
      title: 'الصلاة على النبي ﷺ',
      body: 'إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ ۚ يَا أَيُّهَا الَّذِينَ آمَنُوا صَلُّوا عَلَيْهِ وَسَلِّمُوا تَسْلِيمًا',
      type: 'salawat',
      actionText: 'استماع للصوت',
      onAction: () => playAction(),
      audioUrl: '/audio/salawat.mp3'
    });

    if (mode === 'notification_and_sound') {
      await playAction();
    }
  }

  private getNextVerifiedDhikrItem(specificId?: string): DhikrAudioReminderItem | null {
    // Enforce strict rule: NEVER dispatch a Dhikr reminder if it doesn't have a pure verified audioUrl
    const validAll = VERIFIED_DHIKR_REMINDERS.filter((item) => Boolean(item.audioUrl && item.audioUrl.trim().length > 0));
    if (validAll.length === 0) return null;

    if (specificId) {
      const found = validAll.find((item) => item.id === specificId);
      if (found) return found;
    }

    const settings = StorageService.getSettings();
    const dhikrSetting = settings.dhikrReminder;
    const selectedIds = dhikrSetting?.selectedDhikrIds || [];

    const pool =
      selectedIds.length > 0
        ? validAll.filter((item) => selectedIds.includes(item.id))
        : validAll;

    const effectivePool = pool.length > 0 ? pool : validAll;
    const currentIndex = dhikrSetting?.currentIndex || 0;
    const chosen = effectivePool[currentIndex % effectivePool.length];

    // Advance rotation index for next reminder
    if (dhikrSetting) {
      settings.dhikrReminder = {
        ...dhikrSetting,
        currentIndex: (currentIndex + 1) % effectivePool.length
      };
      StorageService.saveSettings(settings);
    }

    return chosen;
  }

  public async triggerDhikrReminder(
    mode: 'notification_only' | 'notification_and_sound' | 'notification_with_play_action' = 'notification_and_sound',
    specificId?: string
  ) {
    const item = this.getNextVerifiedDhikrItem(specificId);
    // Strict guard: If no verified pure audio exists, do not create the notification
    if (!item || !item.audioUrl) return;

    const playAction = async () => {
      this.lastSpokenReminderTimestamp = Date.now();
      this.savePersistedState();
      await AudioService.playDhikrReminder(item);
    };

    NotificationService.notify({
      title: `ذكر الله: ${item.title}`,
      body: item.arabicText,
      type: 'dhikr',
      actionText: 'استماع للذكر',
      onAction: () => playAction(),
      audioUrl: item.audioUrl
    });

    if (mode === 'notification_and_sound') {
      await playAction();
    }
  }

  public async triggerDailyWirdReminder(
    mode: 'notification_only' | 'notification_and_sound' | 'notification_with_play_action' = 'notification_and_sound'
  ) {
    const playAction = async () => {
      this.lastSpokenReminderTimestamp = Date.now();
      this.savePersistedState();
      await AudioService.playWirdReminder();
    };

    NotificationService.notify({
      title: 'تذكير الورد القرآني اليومي',
      body: '﴿وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا﴾ حان موعد وردك المبارك من القرآن الكريم - رتّل آيات الله ونوّر قلبك ويومك.',
      type: 'wird',
      actionText: 'استماع للتنبيه',
      onAction: () => playAction(),
      audioUrl: '/audio/wird.mp3'
    });

    if (mode === 'notification_and_sound') {
      await playAction();
    }
  }

  // --- Direct Test Methods ---

  public async testDhikrReminder(specificId?: string): Promise<void> {
    const item = this.getNextVerifiedDhikrItem(specificId);
    if (!item || !item.audioUrl) return;

    this.resetAllTimersToNow();
    AudioService.saveCurrentPrimaryTrackForInterruption();

    NotificationService.notify({
      title: `ذكر الله: ${item.title}`,
      body: item.arabicText,
      type: 'dhikr',
      actionText: 'إعادة الاستماع',
      onAction: () => {
        this.resetAllTimersToNow();
        AudioService.playDhikrReminder(item);
      },
      audioUrl: item.audioUrl
    });

    await AudioService.playDhikrReminder(item);
  }

  public async testQuranVerseReminder(): Promise<void> {
    this.resetAllTimersToNow();
    AudioService.saveCurrentPrimaryTrackForInterruption();

    const verse = await QuranService.getRandomVerseForReminder();
    if (!verse) return;
    const settings = StorageService.getSettings();
    const reciterId = settings.selectedReciterId || 'alafasy';
    const reciter = VERIFIED_RECITERS.find((r) => r.id === reciterId) || VERIFIED_RECITERS[0];
    const audioUrl = getAyahAudioUrl(reciter.audioServer, verse.surahNumber, verse.ayahNumber);

    NotificationService.notify({
      title: `آية من القرآن الكريم: سورة ${verse.surahName} (${verse.ayahNumber})`,
      body: verse.text,
      type: 'quran',
      actionText: 'إعادة الاستماع',
      onAction: () => {
        this.resetAllTimersToNow();
        AudioService.playUrl(audioUrl, 'reminder_verse', {
          title: `سورة ${verse.surahName} (${verse.ayahNumber})`,
          subtitle: `تلاوة ${reciter.nameArabic}`
        });
      },
      audioUrl
    });

    await AudioService.playUrl(audioUrl, 'reminder_verse', {
      title: `سورة ${verse.surahName} (${verse.ayahNumber})`,
      subtitle: `تلاوة ${reciter.nameArabic}`,
      surahNumber: verse.surahNumber,
      ayahNumber: verse.ayahNumber,
      reciterName: reciter.nameArabic
    });
  }

  public async testSalawatReminder(): Promise<void> {
    this.resetAllTimersToNow();
    AudioService.saveCurrentPrimaryTrackForInterruption();

    NotificationService.notify({
      title: 'الصلاة على النبي ﷺ',
      body: 'إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ ۚ يَا أَيُّهَا الَّذِينَ آمَنُوا صَلُّوا عَلَيْهِ وَسَلِّمُوا تَسْلِيمًا',
      type: 'salawat',
      actionText: 'إعادة الاستماع',
      onAction: () => {
        this.resetAllTimersToNow();
        AudioService.playSalawatReminder();
      },
      audioUrl: '/audio/salawat.mp3'
    });
    await AudioService.playSalawatReminder();
  }

  public async testDailyWirdReminder(): Promise<void> {
    this.resetAllTimersToNow();
    AudioService.saveCurrentPrimaryTrackForInterruption();

    NotificationService.notify({
      title: 'تذكير الورد القرآني اليومي',
      body: '﴿وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا﴾ حان موعد وردك المبارك من القرآن الكريم.',
      type: 'wird',
      actionText: 'إعادة الاستماع',
      onAction: () => {
        this.resetAllTimersToNow();
        AudioService.playWirdReminder();
      },
      audioUrl: '/audio/wird.mp3'
    });
    await AudioService.playWirdReminder();
  }

  public async testAdhan(
    voiceId?: 'makkah' | 'madinah' | 'alaqsa' | 'alafasy',
    mode?: 'full' | 'first_two_takbeers'
  ): Promise<void> {
    this.resetAllTimersToNow();
    AudioService.saveCurrentPrimaryTrackForInterruption();

    const settings = StorageService.getSettings();
    const v = voiceId || settings.adhanVoice || 'alafasy';
    const m = mode || settings.adhanMode || 'full';

    NotificationService.notify({
      title: 'تجربة أذان الصلاة',
      body: `الله أكبر الله أكبر · حي على الصلاة حي على الفلاح (${m === 'first_two_takbeers' ? 'أول تكبيرتين فقط' : 'الأذان كاملاً'}).`,
      type: 'prayer',
      actionText: 'استماع للأذان',
      onAction: () => {
        this.resetAllTimersToNow();
        AudioService.playAdhan(v, { mode: m });
      }
    });

    await AudioService.playAdhan(v, {
      mode: m,
      willChainDuaAfterAdhan: Boolean(settings.duaAfterAdhanEnabled),
      onFinished: () => {
        if (settings.duaAfterAdhanEnabled) {
          this.resetAllTimersToNow();
          NotificationService.notify({
            title: 'دعاء ما بعد الأذان',
            body: 'اللهم رب هذه الدعوة التامة والصلاة القائمة آت محمداً الوسيلة والفضيلة وابعثه مقاماً محموداً الذي وعدته.',
            type: 'prayer',
            actionText: 'استماع للدعاء',
            onAction: () => AudioService.playDuaAfterAdhan()
          });
          AudioService.playDuaAfterAdhan();
        }
      }
    });
  }

  public async testIqamah(): Promise<void> {
    this.resetAllTimersToNow();
    AudioService.saveCurrentPrimaryTrackForInterruption();

    NotificationService.notify({
      title: 'تجربة إقامة الصلاة',
      body: 'قد قامت الصلاة، قد قامت الصلاة · استووا واعتدلوا يرحمكم الله.',
      type: 'prayer',
      actionText: 'استماع للإقامة',
      onAction: () => {
        this.resetAllTimersToNow();
        AudioService.playIqamah();
      }
    });
    await AudioService.playIqamah();
  }

  public async testDuaAfterAdhan(): Promise<void> {
    this.resetAllTimersToNow();
    AudioService.saveCurrentPrimaryTrackForInterruption();

    NotificationService.notify({
      title: 'دعاء ما بعد الأذان',
      body: 'اللهم رب هذه الدعوة التامة والصلاة القائمة آت محمداً الوسيلة والفضيلة وابعثه مقاماً محموداً الذي وعدته.',
      type: 'prayer',
      actionText: 'استماع للدعاء',
      onAction: () => {
        this.resetAllTimersToNow();
        AudioService.playDuaAfterAdhan();
      }
    });
    await AudioService.playDuaAfterAdhan();
  }
}

export const ReminderEngine = new ScheduledReminderEngine();
