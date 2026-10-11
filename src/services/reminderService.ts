import { StorageService } from './storageService';
import { QuranService } from './quranService';
import { AudioService } from './audioService';
import { NotificationService } from './notificationService';
import { VERIFIED_RECITERS, getAyahAudioUrl } from '../data/surahsData';
import { VERIFIED_DHIKR_REMINDERS, DhikrAudioReminderItem } from '../data/dhikrRemindersData';
import { PrayerTimesService, formatPrayerTime12 } from './prayerTimesService';
import { LiveActivityService } from './liveActivityService';

export type ObligatoryPrayerId = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface ActiveAdhanScreenState {
  id: string;
  prayerKey: ObligatoryPrayerId;
  prayerNameArabic: string;
  prayerTime12: string;
  locationName: string;
  voiceId: 'makkah' | 'madinah' | 'alaqsa' | 'alafasy';
  adhanMode: 'full' | 'first_two_takbeers';
  startedAt: number;
  iqamahOffsetMinutes: number;
  isMutedKeepScreen: boolean;
  isAudioFinished: boolean;
  isDuaPlaying: boolean;
  isPreview?: boolean;
  sceneCounter: number;
}

type AdhanScreenSubscriber = (state: ActiveAdhanScreenState | null) => void;

const REMINDER_STATE_KEY = 'athar_reminder_timestamps_v2';

interface PersistedReminderTimestamps {
  lastSalawatTime: number;
  lastQuranTime: number;
  lastWirdTime: number;
  lastDhikrTime: number;
  lastParentsTime?: number;
  lastSpokenReminderTimestamp: number;
  lastDispatchedType: 'quran' | 'salawat' | 'wird' | 'dhikr' | 'parents' | null;
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
  private lastParentsTime = Date.now();
  private lastSpokenReminderTimestamp = 0;
  private lastDispatchedType: 'quran' | 'salawat' | 'wird' | 'dhikr' | 'parents' | null = null;
  private lastCheckedPrayerTime: string | null = null;
  private scheduledIqamah: { prayerKey: string; nameArabic: string; triggerTime: number } | null = null;
  private visibilityListenerBound = false;
  private activeAdhanScreen: ActiveAdhanScreenState | null = null;
  private adhanScreenSubscribers: Set<AdhanScreenSubscriber> = new Set();
  private adhanSceneCounter: number = 0;

  constructor() {
    this.loadPersistedState();
  }

  public subscribeAdhanScreen(cb: AdhanScreenSubscriber): () => void {
    this.adhanScreenSubscribers.add(cb);
    cb(this.activeAdhanScreen ? { ...this.activeAdhanScreen } : null);
    return () => this.adhanScreenSubscribers.delete(cb);
  }

  private notifyAdhanScreenSubscribers() {
    const snap = this.activeAdhanScreen ? { ...this.activeAdhanScreen } : null;
    this.adhanScreenSubscribers.forEach((cb) => {
      try {
        cb(snap);
      } catch {}
    });
  }

  public getActiveAdhanScreen(): ActiveAdhanScreenState | null {
    return this.activeAdhanScreen;
  }

  /**
   * Immediately stops Adhan audio AND closes the Full-Screen Adhan overlay.
   */
  public stopAndDismissAdhanScreen(): void {
    AudioService.setAdhanMuted(false);
    AudioService.stopTemporaryAndResume(false);
    this.activeAdhanScreen = null;
    this.notifyAdhanScreenSubscribers();
  }

  /**
   * Mutes the Adhan audio in-place (without stopping or resetting currentTime) while keeping the Full-Screen Royal Adhan overlay open
   * so the user can repeat after the Muezzin and unmute to continue from the current live moment.
   */
  public muteAdhanAndKeepScreenOpen(): void {
    if (!this.activeAdhanScreen || this.activeAdhanScreen.isAudioFinished) return;
    AudioService.setAdhanMuted(true);
    this.activeAdhanScreen = {
      ...this.activeAdhanScreen,
      isMutedKeepScreen: true,
    };
    this.notifyAdhanScreenSubscribers();
  }

  /**
   * Unmutes the Adhan audio in-place so it continues from its current live position without restarting from the beginning.
   * Does nothing if the Adhan audio has already finished.
   */
  public unmuteAdhanOnScreen(): void {
    if (!this.activeAdhanScreen || this.activeAdhanScreen.isAudioFinished) return;
    AudioService.setAdhanMuted(false);
    this.activeAdhanScreen = {
      ...this.activeAdhanScreen,
      isMutedKeepScreen: false,
    };
    this.notifyAdhanScreenSubscribers();
  }

  /**
   * Toggles mute/unmute on the active Adhan audio without restarting it. Disabled once the Adhan audio has finished.
   */
  public toggleAdhanMuteOnScreen(): void {
    if (!this.activeAdhanScreen || this.activeAdhanScreen.isAudioFinished) return;
    if (this.activeAdhanScreen.isMutedKeepScreen) {
      this.unmuteAdhanOnScreen();
    } else {
      this.muteAdhanAndKeepScreenOpen();
    }
  }

  /**
   * Plays or replays the Post-Adhan Dua inside the Full-Screen Adhan overlay.
   */
  public async playPostAdhanDuaFromScreen(): Promise<void> {
    if (this.activeAdhanScreen) {
      this.activeAdhanScreen = {
        ...this.activeAdhanScreen,
        isDuaPlaying: true,
      };
      this.notifyAdhanScreenSubscribers();
    }
    await AudioService.playDuaAfterAdhan();
  }

  /**
   * Rotates to the next high-resolution sacred mosque scene inside the Full-Screen Adhan overlay.
   */
  public cycleAdhanScreenScene(): void {
    this.adhanSceneCounter += 1;
    if (this.activeAdhanScreen) {
      this.activeAdhanScreen = {
        ...this.activeAdhanScreen,
        sceneCounter: this.adhanSceneCounter,
      };
      this.notifyAdhanScreenSubscribers();
    }
  }

  /**
   * Launches the Full-Screen Priority Royal Adhan Screen and starts the Adhan audio.
   */
  public async launchFullScreenAdhan(options?: {
    prayerKey?: ObligatoryPrayerId;
    prayerNameArabic?: string;
    prayerTime12?: string;
    voiceId?: 'makkah' | 'madinah' | 'alaqsa' | 'alafasy';
    mode?: 'full' | 'first_two_takbeers';
    isPreview?: boolean;
  }): Promise<void> {
    const settings = StorageService.getSettings();
    const liveState = LiveActivityService.getState();

    const effectiveKey: ObligatoryPrayerId =
      options?.prayerKey ||
      (liveState.nextPrayerId === 'sunrise' ? 'fajr' : liveState.nextPrayerId) ||
      'maghrib';

    const prayerNames: Record<ObligatoryPrayerId, string> = {
      fajr: 'الفجر',
      dhuhr: 'الظهر',
      asr: 'العصر',
      maghrib: 'المغرب',
      isha: 'العشاء',
    };

    const nameArabic = options?.prayerNameArabic || prayerNames[effectiveKey] || 'المغرب';
    const time12 = options?.prayerTime12 || liveState.nextPrayerTime12 || '٠٥:٤٥ م';
    const voiceId = options?.voiceId || settings.adhanVoice || 'alafasy';
    const adhanMode = options?.mode || settings.adhanMode || 'full';
    const iqamahOffsetMinutes =
      liveState.settings.iqamahOffsets?.[effectiveKey] ??
      (effectiveKey === 'maghrib' ? 10 : 15);

    this.adhanSceneCounter += 1;

    this.activeAdhanScreen = {
      id: `adhan_${Date.now()}`,
      prayerKey: effectiveKey,
      prayerNameArabic: nameArabic,
      prayerTime12: time12,
      locationName: liveState.locationName || settings.location.city || 'القاهرة',
      voiceId,
      adhanMode,
      startedAt: Date.now(),
      iqamahOffsetMinutes,
      isMutedKeepScreen: false,
      isAudioFinished: false,
      isDuaPlaying: false,
      isPreview: options?.isPreview ?? false,
      sceneCounter: this.adhanSceneCounter,
    };
    this.notifyAdhanScreenSubscribers();

    const onAdhanFinished = () => {
      AudioService.setAdhanMuted(false);
      if (this.activeAdhanScreen) {
        this.activeAdhanScreen = {
          ...this.activeAdhanScreen,
          isAudioFinished: true,
        };
        this.notifyAdhanScreenSubscribers();
      }
      if (settings.duaAfterAdhanEnabled && !this.activeAdhanScreen?.isMutedKeepScreen) {
        this.playPostAdhanDuaFromScreen();
      }
    };

    AudioService.setAdhanMuted(false);
    await AudioService.playAdhan(voiceId, {
      mode: adhanMode,
      willChainDuaAfterAdhan: Boolean(settings.duaAfterAdhanEnabled),
      onFinished: onAdhanFinished,
    });
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
        this.lastParentsTime = parsed.lastParentsTime && now - parsed.lastParentsTime < 43200000 ? parsed.lastParentsTime : now;
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
        lastParentsTime: this.lastParentsTime,
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

    // Fallback standard 3-second check loop only if Web Worker is not available
    if (!this.workerTimer) {
      this.timerId = window.setInterval(() => {
        this.checkAndTriggerReminders();
      }, 3000);
    }
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
    this.lastParentsTime = now;
    this.lastSpokenReminderTimestamp = now;
    this.savePersistedState();
  }

  /**
   * Restarts the reminder engine when settings change.
   * Staggers initial timestamps cleanly so when reminders
   * are set to 1 minute ("1m"), they fire in a fair rotation without starving any reminder!
   */
  public restart() {
    this.stop();
    const now = Date.now();
    this.lastSpokenReminderTimestamp = now - 5000;
    this.lastDhikrTime = now - 45000;
    this.lastWirdTime = now - 30000;
    this.lastParentsTime = now - 15000;
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

          // Launch the Topmost Full-Screen Priority Royal Adhan Screen!
          this.launchFullScreenAdhan({
            prayerKey: (key as ObligatoryPrayerId) || 'maghrib',
            prayerNameArabic: name,
            prayerTime12: formatPrayerTime12(cleanTime),
            voiceId: settings.adhanVoice,
            mode: adhanMode,
            isPreview: false,
          });

          NotificationService.notify({
            title: `حان الآن موعد أذان ${name} (${settings.location.city || 'موقعك'})`,
            body: `حي على الصلاة، حي على الفلاح · التوقيت: ${formatPrayerTime12(cleanTime)}`,
            type: 'prayer',
            actionText: 'فتح شاشة الأذان',
            onAction: () => {
              if (!this.activeAdhanScreen) {
                this.launchFullScreenAdhan({
                  prayerKey: (key as ObligatoryPrayerId) || 'maghrib',
                  prayerNameArabic: name,
                  prayerTime12: formatPrayerTime12(cleanTime),
                  voiceId: settings.adhanVoice,
                  mode: adhanMode,
                  isPreview: false,
                });
              }
            },
            priority: 10
          });

          if (settings.iqamahSettings?.enabled) {
            const liveOffsets = LiveActivityService.getSettings().iqamahOffsets;
            const iqamahMinutes =
              liveOffsets?.[key as ObligatoryPrayerId] ??
              (key === 'maghrib'
                ? settings.iqamahSettings.maghribMinutes || 10
                : settings.iqamahSettings.defaultMinutes || 15);
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

      const playIqamahAction = async () => {
        await AudioService.playIqamah();
      };

      NotificationService.notify({
        title: `حان الآن موعد إقامة صلاة ${iq.nameArabic}`,
        body: 'قد قامت الصلاة، قد قامت الصلاة · استووا واعتدلوا يرحمكم الله.',
        type: 'prayer',
        actionText: 'استماع للإقامة',
        onAction: () => playIqamahAction(),
        autoPlayAudio: settings.iqamahSettings?.soundEnabled ? () => playIqamahAction() : undefined,
        priority: 9
      });
      return;
    }

    const dueReminders: Array<{
      type: 'quran' | 'salawat' | 'wird' | 'dhikr' | 'parents';
      name: string;
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
            name: 'آية من القرآن الكريم',
            overdueMs: elapsed - intervalMs,
            trigger: async () => {
              this.lastQuranTime = Date.now();
              this.lastSpokenReminderTimestamp = Date.now();
              this.lastDispatchedType = 'quran';
              this.savePersistedState();
              await this.triggerQuranVerseReminder(quranSetting.mode || 'notification_and_sound');
            }
          });
        }
      }
    }

    // Check Dhikr Allah & Multiplying Praise Reminder (تنبيهات ذكر الله والصلاة على النبي ﷺ والتسبيح المضاعف)
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
            name: 'تنبيه ذكر الله والتسبيح',
            overdueMs: elapsed - intervalMs,
            trigger: async () => {
              this.lastDhikrTime = Date.now();
              this.lastSpokenReminderTimestamp = Date.now();
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
            name: 'تذكير الورد القرآني',
            overdueMs: elapsed - intervalMs,
            trigger: async () => {
              this.lastWirdTime = Date.now();
              this.lastSpokenReminderTimestamp = Date.now();
              this.lastDispatchedType = 'wird';
              this.savePersistedState();
              await this.triggerDailyWirdReminder(wirdSetting.mode || 'notification_and_sound');
            }
          });
        }
      }
    }

    // Check Parents Reminder (تذكير بر الوالدين والإحسان إليهما)
    const parentsSetting = settings.parentsReminder;
    if (parentsSetting?.enabled) {
      const isTest1m = parentsSetting.frequency === '1m';
      const allowedTime = isTest1m || (!isQuiet && this.isWithinTimeWindow(now, parentsSetting.startTime, parentsSetting.endTime));
      if (allowedTime) {
        const intervalMs = this.getIntervalMs(parentsSetting.frequency, parentsSetting.customMinutes);
        const elapsed = nowMs - this.lastParentsTime;
        if (elapsed >= intervalMs) {
          dueReminders.push({
            type: 'parents',
            name: 'تذكير بر الوالدين والإحسان',
            overdueMs: elapsed - intervalMs,
            trigger: async () => {
              this.lastParentsTime = Date.now();
              this.lastSpokenReminderTimestamp = Date.now();
              this.lastDispatchedType = 'parents';
              this.savePersistedState();
              await this.triggerParentsReminder(parentsSetting.mode || 'notification_and_sound');
            }
          });
        }
      }
    }

    if (dueReminders.length === 0) return;

    // Sort by highest overdue time first, and break ties by preferring a type different from lastDispatchedType
    dueReminders.sort((a, b) => {
      if (a.type === this.lastDispatchedType && b.type !== this.lastDispatchedType) return 1;
      if (b.type === this.lastDispatchedType && a.type !== this.lastDispatchedType) return -1;
      return b.overdueMs - a.overdueMs;
    });

    // Dispatch all due reminders: NotificationService handles the turn-based queue ("دور التنبيهات"),
    // activating the first one immediately and putting subsequent ones in order so each plays smoothly after the previous finishes!
    for (const due of dueReminders) {
      await due.trigger();
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
      audioUrl,
      autoPlayAudio: mode === 'notification_and_sound' ? () => playAction() : undefined,
      priority: 3
    });
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
      audioUrl: '/audio/salawat.mp3',
      autoPlayAudio: mode === 'notification_and_sound' ? () => playAction() : undefined,
      priority: 3
    });
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
      audioUrl: item.audioUrl,
      autoPlayAudio: mode === 'notification_and_sound' ? () => playAction() : undefined,
      priority: 3
    });
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
      audioUrl: '/audio/wird.mp3',
      autoPlayAudio: mode === 'notification_and_sound' ? () => playAction() : undefined,
      priority: 3
    });
  }

  // --- Direct Test Methods ---

  public async testDhikrReminder(specificId?: string): Promise<void> {
    this.resetAllTimersToNow();
    await this.triggerDhikrReminder('notification_and_sound', specificId);
  }

  public async testQuranVerseReminder(): Promise<void> {
    this.resetAllTimersToNow();
    await this.triggerQuranVerseReminder('notification_and_sound');
  }

  public async testSalawatReminder(): Promise<void> {
    this.resetAllTimersToNow();
    await this.triggerSalawatReminder('notification_and_sound');
  }

  public async testDailyWirdReminder(): Promise<void> {
    this.resetAllTimersToNow();
    await this.triggerDailyWirdReminder('notification_and_sound');
  }

  public async testAdhan(
    voiceId?: 'makkah' | 'madinah' | 'alaqsa' | 'alafasy',
    mode?: 'full' | 'first_two_takbeers',
    prayerKey?: ObligatoryPrayerId
  ): Promise<void> {
    this.resetAllTimersToNow();
    const settings = StorageService.getSettings();
    const v = voiceId || settings.adhanVoice || 'alafasy';
    const m = mode || settings.adhanMode || 'full';

    await this.launchFullScreenAdhan({
      prayerKey,
      voiceId: v,
      mode: m,
      isPreview: true,
    });
  }

  public async testIqamah(): Promise<void> {
    this.resetAllTimersToNow();

    const playIqamahAction = async () => {
      await AudioService.playIqamah();
    };

    NotificationService.notify({
      title: 'تجربة إقامة الصلاة',
      body: 'قد قامت الصلاة، قد قامت الصلاة · استووا واعتدلوا يرحمكم الله.',
      type: 'prayer',
      actionText: 'استماع للإقامة',
      onAction: () => playIqamahAction(),
      autoPlayAudio: () => playIqamahAction(),
      priority: 9
    });
  }

  public async testDuaAfterAdhan(): Promise<void> {
    this.resetAllTimersToNow();

    const playDuaAction = async () => {
      await AudioService.playDuaAfterAdhan();
    };

    NotificationService.notify({
      title: 'دعاء ما بعد الأذان',
      body: 'اللهم رب هذه الدعوة التامة والصلاة القائمة آت محمداً الوسيلة والفضيلة وابعثه مقاماً محموداً الذي وعدته.',
      type: 'prayer',
      actionText: 'استماع للدعاء',
      onAction: () => playDuaAction(),
      autoPlayAudio: () => playDuaAction(),
      priority: 8
    });
  }

  public async triggerParentsReminder(
    mode: 'notification_only' | 'notification_and_sound' | 'notification_with_play_action' = 'notification_and_sound'
  ): Promise<void> {
    const quotes = [
      {
        verse: '﴿وَقَضَىٰ رَبُّكَ أَلَّا تَعْبُدُوا إِلَّا إِيَّاهُ وَبِالْوَالِدَيْنِ إِحْسَانًا﴾',
        action: 'اتصل بهما الآن، قبّل أيديهما، أو ادعُ لهما بالرحمة والمغفرة.'
      },
      {
        verse: '﴿رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا﴾',
        action: 'رضا الله تعالى في رضا الوالدين.. بادر بالسؤال عنهما وإدخال السرور على قلوبهما.'
      },
      {
        verse: '﴿رَّبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِمَن دَخَلَ بَيْتِيَ مُؤْمِنًا﴾',
        action: 'بركة يومك ورزقك تبدأ بدعوة صادقة لوالديك والاطمئنان عليهما.'
      },
      {
        verse: '﴿وَوَصَّيْنَا الْإِنسَانَ بِوَالِدَيْهِ حُسْنًا﴾',
        action: 'طاعة الوالدين وبرهما باب من أبواب الجنة المفتوحة لك اليوم.. لا تفوته.'
      }
    ];

    const chosen = quotes[Math.floor(Math.random() * quotes.length)];
    const audioUrl = getAyahAudioUrl('https://everyayah.com/data/Alafasy_128kbps', 17, 24);

    const playAction = async () => {
      this.lastSpokenReminderTimestamp = Date.now();
      this.savePersistedState();
      await AudioService.playParentsReminder();
    };

    NotificationService.notify({
      title: 'تذكير بر الوالدين والإحسان إليهما',
      body: `${chosen.verse} · ${chosen.action}`,
      type: 'parents',
      actionText: 'استماع للتذكير',
      onAction: () => playAction(),
      audioUrl,
      autoPlayAudio: mode === 'notification_and_sound' ? () => playAction() : undefined,
      priority: 4
    });
  }

  public async testParentsReminder(): Promise<void> {
    this.resetAllTimersToNow();
    await this.triggerParentsReminder('notification_and_sound');
  }
}

export const ReminderEngine = new ScheduledReminderEngine();
