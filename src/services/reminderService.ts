import { ObligatoryPrayerId, ReminderPlaybackMode } from '../types';
import { StorageService } from './storageService';
import { QuranService } from './quranService';
import { VERIFIED_RECITERS, getAyahAudioUrl } from '../data/surahsData';
import { VERIFIED_DHIKR_REMINDERS } from '../data/dhikrRemindersData';
import { NativePermissionsBridge } from './nativePermissionsBridge';

export interface ActiveAdhanState {
  prayerId: ObligatoryPrayerId;
  prayerName: string;
  prayerTime12: string;
  voice: 'alafasy' | 'makkah' | 'madinah' | 'alaqsa';
  mode: 'full' | 'first_two_takbeers';
  startTimeMs: number;
  durationSeconds: number;
  isMuted: boolean;
  isPlaying: boolean;
  isFajr: boolean;
  sceneImage: string;
}

type AdhanListener = (state: ActiveAdhanState | null) => void;

class ReminderEngineClass {
  private adhanListeners: Set<AdhanListener> = new Set();
  private intervalTimer: any = null;
  private appStartTime: number = Date.now();
  private lastAnyReminderTriggeredTime: number = 0;

  public start(): void {
    if (this.intervalTimer) return;
    this.appStartTime = Date.now();
    const now = Date.now();
    this.lastAnyReminderTriggeredTime = 0;

    // Initialize timestamps if not already present
    if (!localStorage.getItem('athar_last_ayah_reminder_ts')) {
      localStorage.setItem('athar_last_ayah_reminder_ts', String(now));
    }
    if (!localStorage.getItem('athar_last_salawat_reminder_ts')) {
      localStorage.setItem('athar_last_salawat_reminder_ts', String(now));
    }
    if (!localStorage.getItem('athar_last_wird_reminder_ts')) {
      localStorage.setItem('athar_last_wird_reminder_ts', String(now));
    }
    if (!localStorage.getItem('athar_last_parents_reminder_ts')) {
      localStorage.setItem('athar_last_parents_reminder_ts', String(now));
    }

    // Sync configuration to native Android background engine
    try {
      const settings = StorageService.getSettings();
      NativePermissionsBridge.syncRoyalRemindersConfig(settings);
    } catch {}

    // Evaluate every 1 second so that 5s or 1m intervals trigger accurately
    this.intervalTimer = setInterval(() => {
      this.evaluatePeriodicReminders();
    }, 1000);
  }

  public stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  public restart(): void {
    this.stop();
    this.start();
  }

  private isWithinTimeWindow(startTime?: string, endTime?: string): boolean {
    if (!startTime || !endTime) return true;
    try {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const [startH, startM] = startTime.split(':').map((v) => parseInt(v, 10) || 0);
      const [endH, endM] = endTime.split(':').map((v) => parseInt(v, 10) || 0);
      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;

      if (startTotal <= endTotal) {
        return currentMinutes >= startTotal && currentMinutes <= endTotal;
      } else {
        // Crosses midnight
        return currentMinutes >= startTotal || currentMinutes <= endTotal;
      }
    } catch {
      return true;
    }
  }

  private isQuietHoursActive(): boolean {
    try {
      const settings = StorageService.getSettings();
      if (!settings.quietHours?.enabled) return false;
      return this.isWithinTimeWindow(settings.quietHours.startTime, settings.quietHours.endTime);
    } catch {
      return false;
    }
  }

  private parseFrequencyMs(freq?: string): number {
    switch (freq) {
      case '5s': return 5 * 1000;
      case '1m': return 60 * 1000;
      case '30m': return 30 * 60 * 1000;
      case '1h': return 60 * 60 * 1000;
      case '2h': return 120 * 60 * 1000;
      case '3h': return 180 * 60 * 1000;
      case '4h': return 240 * 60 * 1000;
      case '6h': return 360 * 60 * 1000;
      case '12h': return 720 * 60 * 1000;
      case 'daily': return 24 * 60 * 60 * 1000;
      default: return 120 * 60 * 1000;
    }
  }

  private isFixedTimeTriggerDue(fixedTime?: string, storageKeyPrefix: string = 'athar_fixed_time'): boolean {
    if (!fixedTime) return false;
    const parts = fixedTime.split(':');
    if (parts.length < 2) return false;
    const targetH = Number(parts[0]);
    const targetM = Number(parts[1]);
    if (isNaN(targetH) || isNaN(targetM)) return false;

    const now = new Date();
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    if (currentH === targetH && currentM === targetM) {
      const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_${targetH}:${targetM}`;
      const lastKey = localStorage.getItem(`${storageKeyPrefix}_last_fired_key`);
      if (lastKey !== todayKey) {
        localStorage.setItem(`${storageKeyPrefix}_last_fired_key`, todayKey);
        return true;
      }
    }
    return false;
  }

  private evaluatePeriodicReminders(): void {
    try {
      // In Native Android, AtharPrayerAlarmScheduler & AlarmManager are the authoritative background engine.
      // Do not duplicate periodic reminder evaluations in the Web/JS layer to prevent double alarms/sounds.
      if (NativePermissionsBridge.isNative()) {
        return;
      }

      // 1. Check quiet hours
      if (this.isQuietHoursActive()) {
        return;
      }

      const now = Date.now();

      // Launch Grace Buffer: Do not trigger any periodic reminders within the first 1.5 seconds of app open
      if (now - this.appStartTime < 1500) {
        return;
      }

      // Small pacing buffer between successive reminders (1.5 seconds) so that the queue receives them sequentially
      if (now - this.lastAnyReminderTriggeredTime < 1500) {
        return;
      }

      const settings = StorageService.getSettings();

      // 1. اقرأ ولو آية (آية واحدة عشوائية)
      if (settings.quranVerseReminder?.enabled) {
        if (settings.quranVerseReminder.scheduleType === 'fixed_time') {
          if (this.isFixedTimeTriggerDue(settings.quranVerseReminder.fixedTime, 'athar_ayah')) {
            this.lastAnyReminderTriggeredTime = now;
            const mode = settings.quranVerseReminder.mode || 'notification_and_sound';
            this.triggerQuranVerseReminder(true, mode !== 'notification_only', mode);
            return;
          }
        } else {
          const intervalMs = this.parseFrequencyMs(settings.quranVerseReminder.frequency);
          const lastAyah = Number(localStorage.getItem('athar_last_ayah_reminder_ts') || '0');
          if (lastAyah > 0 && now - lastAyah >= intervalMs) {
            localStorage.setItem('athar_last_ayah_reminder_ts', String(now));
            this.lastAnyReminderTriggeredTime = now;
            const mode = settings.quranVerseReminder.mode || 'notification_and_sound';
            this.triggerQuranVerseReminder(true, mode !== 'notification_only', mode);
            return;
          } else if (lastAyah === 0) {
            localStorage.setItem('athar_last_ayah_reminder_ts', String(now));
          }
        }
      }

      // 2. ذكر الله والصلاة على النبي ﷺ
      if (settings.salawatReminder?.enabled) {
        if (settings.salawatReminder.scheduleType === 'fixed_time') {
          if (this.isFixedTimeTriggerDue(settings.salawatReminder.fixedTime, 'athar_salawat')) {
            this.lastAnyReminderTriggeredTime = now;
            const mode = settings.salawatReminder.mode || 'notification_and_sound';
            this.testSalawatReminder(mode);
            return;
          }
        } else {
          const intervalMs = this.parseFrequencyMs(settings.salawatReminder.frequency);
          const lastSalawat = Number(localStorage.getItem('athar_last_salawat_reminder_ts') || '0');
          if (lastSalawat > 0 && now - lastSalawat >= intervalMs) {
            localStorage.setItem('athar_last_salawat_reminder_ts', String(now));
            this.lastAnyReminderTriggeredTime = now;
            const mode = settings.salawatReminder.mode || 'notification_and_sound';
            this.testSalawatReminder(mode);
            return;
          } else if (lastSalawat === 0) {
            localStorage.setItem('athar_last_salawat_reminder_ts', String(now));
          }
        }
      }

      // 3. الورد اليومي
      if (settings.dailyWirdReminder?.enabled) {
        if (settings.dailyWirdReminder.scheduleType === 'fixed_time') {
          if (this.isFixedTimeTriggerDue(settings.dailyWirdReminder.fixedTime, 'athar_wird')) {
            this.lastAnyReminderTriggeredTime = now;
            const mode = settings.dailyWirdReminder.mode || 'notification_and_sound';
            this.testDailyWirdReminder(mode);
            return;
          }
        } else {
          const intervalMs = this.parseFrequencyMs(settings.dailyWirdReminder.frequency);
          const lastWird = Number(localStorage.getItem('athar_last_wird_reminder_ts') || '0');
          if (lastWird > 0 && now - lastWird >= intervalMs) {
            localStorage.setItem('athar_last_wird_reminder_ts', String(now));
            this.lastAnyReminderTriggeredTime = now;
            const mode = settings.dailyWirdReminder.mode || 'notification_and_sound';
            this.testDailyWirdReminder(mode);
            return;
          } else if (lastWird === 0) {
            localStorage.setItem('athar_last_wird_reminder_ts', String(now));
          }
        }
      }

      // 4. بر الوالدين
      if (settings.parentsReminder?.enabled) {
        if (settings.parentsReminder.scheduleType === 'fixed_time') {
          if (this.isFixedTimeTriggerDue(settings.parentsReminder.fixedTime, 'athar_parents')) {
            this.lastAnyReminderTriggeredTime = now;
            const mode = settings.parentsReminder.mode || 'notification_and_sound';
            this.testParentsReminder(mode);
            return;
          }
        } else {
          const intervalMs = this.parseFrequencyMs(settings.parentsReminder.frequency);
          const lastParents = Number(localStorage.getItem('athar_last_parents_reminder_ts') || '0');
          if (lastParents > 0 && now - lastParents >= intervalMs) {
            localStorage.setItem('athar_last_parents_reminder_ts', String(now));
            this.lastAnyReminderTriggeredTime = now;
            const mode = settings.parentsReminder.mode || 'notification_and_sound';
            this.testParentsReminder(mode);
            return;
          } else if (lastParents === 0) {
            localStorage.setItem('athar_last_parents_reminder_ts', String(now));
          }
        }
      }
    } catch (e) {
      console.warn('[ReminderEngine] Error evaluating periodic reminders:', e);
    }
  }

  public hasActiveAdhanScreen(): boolean {
    return false;
  }

  public getActiveAdhanState(): ActiveAdhanState | null {
    return null;
  }

  public subscribeAdhanScreen(callback: (state: ActiveAdhanState | null) => void): () => void {
    this.adhanListeners.add(callback);
    try {
      callback(null);
    } catch {}
    return () => {
      this.adhanListeners.delete(callback);
    };
  }

  public subscribe(callback: (state: ActiveAdhanState | null) => void): () => void {
    return this.subscribeAdhanScreen(callback);
  }

  public subscribeAdhan(callback: (state: ActiveAdhanState | null) => void): () => void {
    return this.subscribeAdhanScreen(callback);
  }

  public launchFullScreenAdhan(options?: any): void {
    const prayerKey = options?.prayerKey || options?.prayerId || 'asr';
    const prayerName = options?.prayerName || this.getPrayerArabicName(prayerKey as any);
    NativePermissionsBridge.showFullScreenAzan({
      prayerId: prayerKey,
      prayerName,
      prayerTime: options?.prayerTime || 'الآن',
      muadhinName: options?.muadhinName || 'الشيخ مشاري راشد العفاسي',
      audioUrl: options?.audioUrl || (prayerKey.includes('fajr') ? '/audio/adhan_fajr_alafasy.mp3' : '/audio/adhan_alafasy.mp3'),
      iqamahMinutes: options?.iqamahMinutes || 15,
      autoDua: true,
      autoEcho: true,
      scheduledEpochMs: options?.scheduledEpochMs || 0
    }).catch((err) => console.warn('launchFullScreenAdhan failed:', err));
  }

  public dismissFullScreenAdhan(): void {
    NativePermissionsBridge.dismissFullScreenAzan().catch(() => {});
  }

  public updateActiveAdhanVoice(_voice: string): void {
    // No-op
  }

  public muteAdhanAndKeepScreenOpen(): void {
    NativePermissionsBridge.muteNotificationAudio().catch(() => {});
  }

  public toggleAdhanAudioLive(): boolean {
    NativePermissionsBridge.toggleNotificationAudio().catch(() => {});
    return false;
  }

  public toggleAdhanPlayPause(): void {
    NativePermissionsBridge.toggleNotificationAudio().catch(() => {});
  }

  public getPrayerArabicName(pId: ObligatoryPrayerId): string {
    switch (pId) {
      case 'fajr': return 'صلاة الفجر';
      case 'dhuhr': return 'صلاة الظهر';
      case 'asr': return 'صلاة العصر';
      case 'maghrib': return 'صلاة المغرب';
      case 'isha': return 'صلاة العشاء';
      default: return 'الصلاة';
    }
  }

  /**
   * Triggers the Royal Floating Alert for "اقرأ ولو آية"
   * Brings genuinely ONE random Ayah from the Holy Quran with its recitation
   */
  public async triggerQuranVerseReminder(
    showFloating = true, 
    playSound = true, 
    mode?: ReminderPlaybackMode
  ): Promise<void> {
    try {
      const verse = await QuranService.getRandomVerseForReminder();
      if (!verse) return;
      const settings = StorageService.getSettings();
      const currentMode: ReminderPlaybackMode = mode || settings.quranVerseReminder?.mode || 'notification_and_sound';
      const shouldPlaySound = currentMode === 'notification_and_sound' || currentMode === 'sound_only' ? true : currentMode === 'notification_only' ? false : playSound;
      const reciterId = settings.quranVerseReminder?.reciterId || settings.selectedReciterId || 'alafasy';
      const reciter = VERIFIED_RECITERS.find((r) => r.id === reciterId) || VERIFIED_RECITERS[0];
      const audioUrl = getAyahAudioUrl(reciter.audioServer, verse.surahNumber, verse.ayahNumber);

      if (showFloating) {
        NativePermissionsBridge.showFloatingWindow({
          category: 'quran_ayah',
          badge: '📖 اقرأ ولو آية (آية واحدة مباركة)',
          title: `سورة ${verse.surahName} • الآية ${verse.ayahNumber}`,
          body: `«${verse.text}»`,
          audioUrl,
          surahNumber: verse.surahNumber,
          ayahNumber: verse.ayahNumber,
          playSound: shouldPlaySound,
          playbackMode: currentMode,
          autoDismissSeconds: 15,
          actionText: '📖 فتح الآية في المصحف',
        });
      }
    } catch (e) {
      console.warn('[ReminderEngine] Error triggering quran verse reminder:', e);
    }
  }

  public async testQuranVerseReminder(mode?: ReminderPlaybackMode): Promise<void> {
    const settings = StorageService.getSettings();
    const currentMode = mode || settings.quranVerseReminder?.mode || 'notification_and_sound';
    await this.triggerQuranVerseReminder(true, currentMode === 'notification_and_sound' || currentMode === 'sound_only', currentMode);
  }

  public testSalawatReminder(mode?: ReminderPlaybackMode): void {
    try {
      const settings = StorageService.getSettings();
      const currentMode: ReminderPlaybackMode = mode || settings.salawatReminder?.mode || 'notification_and_sound';
      const shouldPlaySound = currentMode === 'notification_and_sound' || currentMode === 'sound_only';
      const enabledIds = settings.salawatReminder?.enabledDhikrIds || StorageService.getEnabledDhikrAlertIds();
      let pool = VERIFIED_DHIKR_REMINDERS.filter((d) => enabledIds.includes(d.id));
      if (pool.length === 0) pool = VERIFIED_DHIKR_REMINDERS;
      const pick = pool[Math.floor(Math.random() * pool.length)];

      NativePermissionsBridge.showFloatingWindow({
        category: 'salawat',
        badge: '📿 ذكر الله والصلاة على النبي ﷺ',
        title: pick.title,
        body: `${pick.arabicText}\n\n${pick.fadl || pick.categoryLabel}`,
        audioUrl: pick.audioUrl || '/audio/salawat.mp3',
        playSound: shouldPlaySound,
        playbackMode: currentMode,
        autoDismissSeconds: 15,
        actionText: '📿 فتح المسبحة والأذكار',
      });
    } catch (e) {
      console.warn('[ReminderEngine] Error testing salawat reminder:', e);
    }
  }

  public testParentsReminder(mode?: ReminderPlaybackMode): void {
    const settings = StorageService.getSettings();
    const currentMode: ReminderPlaybackMode = mode || settings.parentsReminder?.mode || 'notification_and_sound';
    const shouldPlaySound = currentMode === 'notification_and_sound' || currentMode === 'sound_only';

    NativePermissionsBridge.showFloatingWindow({
      category: 'parents_duty',
      badge: '🤍 بر الوالدين والإحسان',
      title: 'وقل رب ارحمهما كما ربياني صغيرا',
      body: 'تذكير نبوي ببر الوالدين والدعاء لهما وصلة رحمهما، أحب الأعمال إلى الله تعالى بعد الصلاة على وقتها.',
      audioUrl: '/audio/parents.mp3',
      playSound: shouldPlaySound,
      playbackMode: currentMode,
      autoDismissSeconds: 15,
      actionText: '🤍 صفحة بر الوالدين وصلة الرحم',
    });
  }

  public testDhikrReminder(_id?: string): void {
    this.testSalawatReminder();
  }

  public testDailyWirdReminder(mode?: ReminderPlaybackMode): void {
    const settings = StorageService.getSettings();
    const currentMode: ReminderPlaybackMode = mode || settings.dailyWirdReminder?.mode || 'notification_and_sound';
    const shouldPlaySound = currentMode === 'notification_and_sound' || currentMode === 'sound_only';

    NativePermissionsBridge.showFloatingWindow({
      category: 'quran_wird',
      badge: '📜 الورد القرآني اليومي',
      title: 'حان موعد وردك القرآني المبارك',
      body: '«إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ»\nجدد عهدك مع كتاب الله واقرأ حزبك اليومي لتنال السكينة والبركة.',
      audioUrl: '/audio/wird.mp3',
      playSound: shouldPlaySound,
      playbackMode: currentMode,
      autoDismissSeconds: 15,
      actionText: '📜 صفحة الورد القرآني والختمة',
    });
  }

  public getState() {
    return {
      activeAdhan: null,
      activeOverlay: null,
    };
  }
}

export const ReminderEngine = new ReminderEngineClass();
