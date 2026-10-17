import { ObligatoryPrayerId } from '../types';
import { StorageService, DEFAULT_PRAYERS_ADHAN_CONFIG } from './storageService';
import { AudioService } from './audioService';
import { NativePermissions } from './nativePermissionsBridge';
import { PrayerTimesService, formatPrayerTime12 } from './prayerTimesService';

// High-resolution sacred sanctuary photography tailored for each prayer's time
import fajrScene from '../assets/images/adhan_fajr_dawn_kaaba_1791728275991.jpg';
import dhuhrScene from '../assets/images/adhan_dhuhr_madinah_sunlight_1791728285777.jpg';
import asrScene from '../assets/images/adhan_asr_aqsa_golden_hour_1791728295736.jpg';
import maghribScene from '../assets/images/adhan_maghrib_sunset_minarets_1791728305890.jpg';
import ishaScene from '../assets/images/adhan_isha_night_sanctuary_1791728317277.jpg';

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
  private activeAdhan: ActiveAdhanState | null = null;
  private adhanListeners: Set<AdhanListener> = new Set();
  private checkIntervalId: number | null = null;
  private delayedTestTimeoutId: number | null = null;
  private lastTriggeredMinuteKey: string = '';
  private lastTriggeredPrayerTimes: Record<string, number> = {};
  private lastTriggeredIqamahKeys: Set<string> = new Set();
  private screenWakeLock: any = null;

  constructor() {
    this.setupIncomingAthanListener();
  }

  private setupIncomingAthanListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('athar_incoming_athan', (e: any) => {
        if (this.isLaunching) return;
        const prayerName = e?.detail?.prayer || 'صلاة الفجر';
        const prayerTime = e?.detail?.time || '';
        let prayerId: ObligatoryPrayerId = 'fajr';
        if (prayerName.includes('ظهر') || prayerName.includes('Dhuhr')) prayerId = 'dhuhr';
        else if (prayerName.includes('عصر') || prayerName.includes('Asr')) prayerId = 'asr';
        else if (prayerName.includes('مغرب') || prayerName.includes('Maghrib')) prayerId = 'maghrib';
        else if (prayerName.includes('عشاء') || prayerName.includes('Isha')) prayerId = 'isha';

        // If an adhan for this prayer is ALREADY actively ringing, do not restart
        if (this.activeAdhan && this.activeAdhan.prayerId === prayerId && this.activeAdhan.isPlaying) {
          return;
        }

        this.launchFullScreenAdhan({
          prayerId,
          prayerName,
          prayerTime12: prayerTime,
          fromNative: true,
        });
      });

      window.addEventListener('athar_stop_athan', () => {
        if (!this.isDismissing && this.activeAdhan) {
          this.dismissFullScreenAdhan();
        }
      });
    }
  }

  public start(): void {
    if (this.checkIntervalId !== null || typeof window === 'undefined') return;
    // Check prayer times every 20 seconds
    this.checkPrayerTimes();
    this.checkIntervalId = window.setInterval(() => {
      this.checkPrayerTimes();
    }, 20000);
  }

  public stop(): void {
    if (this.checkIntervalId !== null && typeof window !== 'undefined') {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
    if (this.delayedTestTimeoutId !== null && typeof window !== 'undefined') {
      clearTimeout(this.delayedTestTimeoutId);
      this.delayedTestTimeoutId = null;
    }
  }

  public restart(): void {
    this.stop();
    this.start();
  }

  private getSceneForPrayer(prayerId: ObligatoryPrayerId): string {
    switch (prayerId) {
      case 'fajr':
        return fajrScene;
      case 'dhuhr':
        return dhuhrScene;
      case 'asr':
        return asrScene;
      case 'maghrib':
        return maghribScene;
      case 'isha':
        return ishaScene;
      default:
        return maghribScene;
    }
  }

  private getPrayerArabicName(prayerId: ObligatoryPrayerId): string {
    switch (prayerId) {
      case 'fajr':
        return 'صلاة الفجر';
      case 'dhuhr':
        return 'صلاة الظهر';
      case 'asr':
        return 'صلاة العصر';
      case 'maghrib':
        return 'صلاة المغرب';
      case 'isha':
        return 'صلاة العشاء';
    }
  }

  private isLaunching: boolean = false;
  private isDismissing: boolean = false;

  /**
   * Periodically checks if the current time matches any enabled obligatory prayer time
   */
  public checkPrayerTimes(): void {
    try {
      const settings = StorageService.getSettings();
      if (!settings.adhanEnabled) return;

      const adhanConfig = settings.prayersAdhanConfig || DEFAULT_PRAYERS_ADHAN_CONFIG;
      const prayerTimes = PrayerTimesService.getInitialPrayerTimes(
        settings.location,
        settings.calculationMethod || '5'
      );

      if (!prayerTimes?.timings) return;

      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentHhMm = `${currentHours}:${currentMinutes}`;
      const minuteKey = `${now.toDateString()}_${currentHhMm}`;

      if (this.lastTriggeredMinuteKey === minuteKey) return;

      const prayers: ObligatoryPrayerId[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

      for (const pId of prayers) {
        const prayerSetting = adhanConfig[pId];
        if (!prayerSetting || !prayerSetting.enabled) continue;

        const prayerRawTime = prayerTimes.timings[pId]; // e.g. "04:52"
        if (!prayerRawTime) continue;

        const cleanPrayerTime = prayerRawTime.trim().slice(0, 5);
        if (cleanPrayerTime === currentHhMm) {
          const nowMs = now.getTime();
          const lastTriggered = this.lastTriggeredPrayerTimes[pId] || 0;
          if (nowMs - lastTriggered < 15 * 60 * 1000) {
            continue;
          }
          this.lastTriggeredMinuteKey = minuteKey;
          this.lastTriggeredPrayerTimes[pId] = nowMs;
          this.launchFullScreenAdhan({
            prayerId: pId,
            prayerName: this.getPrayerArabicName(pId),
            prayerTime12: formatPrayerTime12(prayerRawTime),
            voice: prayerSetting.voice || settings.adhanVoice || 'alafasy',
            mode: prayerSetting.mode || settings.adhanMode || 'full',
          });
          break;
        }
      }

      // Check Iqamah alert for obligatory prayers
      if (settings.iqamahSettings?.enabled) {
        const iqamahOffsets = settings.iqamahSettings.offsets || {
          fajr: 20,
          dhuhr: 15,
          asr: 15,
          maghrib: 10,
          isha: 15,
        };
        for (const pId of prayers) {
          const prayerRawTime = prayerTimes.timings[pId];
          if (!prayerRawTime) continue;
          const cleanPrayerTime = prayerRawTime.trim().slice(0, 5);
          const [pH, pM] = cleanPrayerTime.split(':').map(Number);
          if (isNaN(pH) || isNaN(pM)) continue;

          const offsetMin = iqamahOffsets[pId] ?? (pId === 'maghrib' ? settings.iqamahSettings.maghribMinutes || 10 : settings.iqamahSettings.defaultMinutes || 15);
          const iqamahTotalMin = pH * 60 + pM + offsetMin;
          const iqamahH = Math.floor((iqamahTotalMin / 60) % 24);
          const iqamahM = iqamahTotalMin % 60;
          const iqamahHhMm = `${String(iqamahH).padStart(2, '0')}:${String(iqamahM).padStart(2, '0')}`;

          if (iqamahHhMm === currentHhMm) {
            const iqamahKey = `${now.toDateString()}_iqamah_${pId}`;
            if (!this.lastTriggeredIqamahKeys.has(iqamahKey)) {
              this.lastTriggeredIqamahKeys.add(iqamahKey);

              // Play Iqamah Audio if sound enabled
              if (settings.iqamahSettings.soundEnabled !== false) {
                AudioService.playIqamah().catch((e) => console.warn('Iqamah play error:', e));
              }

              // Dispatch in-app notification banner
              if (typeof window !== 'undefined') {
                window.dispatchEvent(
                  new CustomEvent('athar_in_app_notification', {
                    detail: {
                      title: `إقامة ${this.getPrayerArabicName(pId)}`,
                      message: `حان الآن موعد إقامة ${this.getPrayerArabicName(pId)} - استووا واعتدلوا يرحمكم الله 🕌`,
                      category: 'iqamah',
                    },
                  })
                );
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('Prayer check failed:', e);
    }
  }

  /**
   * Launches the Luxury Priority Full-Screen Adhan Screen forcefully
   */
  public launchFullScreenAdhan(options?: {
    prayerId?: ObligatoryPrayerId;
    prayerKey?: ObligatoryPrayerId;
    prayerName?: string;
    prayerNameArabic?: string;
    prayerTime?: string;
    prayerTime12?: string;
    voice?: 'alafasy' | 'makkah' | 'madinah' | 'alaqsa';
    mode?: 'full' | 'first_two_takbeers';
    isPreview?: boolean;
    [key: string]: any;
  }): void {
    if (this.isLaunching) return;
    this.isLaunching = true;
    try {
      const settings = StorageService.getSettings();
      const adhanConfig = settings.prayersAdhanConfig || DEFAULT_PRAYERS_ADHAN_CONFIG;
      const prayerId = options?.prayerId || options?.prayerKey || 'maghrib';
      const prayerSetting = adhanConfig[prayerId];

      const voice = options?.voice || prayerSetting?.voice || settings.adhanVoice || 'alafasy';
      const mode = options?.mode || prayerSetting?.mode || settings.adhanMode || 'full';
      const prayerName = options?.prayerName || options?.prayerNameArabic || this.getPrayerArabicName(prayerId);
      const prayerTime12 = options?.prayerTime12 || options?.prayerTime || formatPrayerTime12(new Date().toTimeString().slice(0, 5));
      const sceneImage = this.getSceneForPrayer(prayerId);

      const isNative = typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.());
      const nowMs = Date.now();
      const lastTriggered = this.lastTriggeredPrayerTimes[prayerId] || 0;
      const isPreview = Boolean(options?.isPreview);

      // 1. Strict debounce: If an adhan is actively playing, ignore duplicate real prayer alarms, but allow explicit user test previews
      if (!isPreview && this.activeAdhan && this.activeAdhan.isPlaying) {
        return;
      }

      // If an existing preview/adhan was open and user triggered a new preview, stop old audio cleanly first
      if (isPreview && this.activeAdhan) {
        AudioService.stopAdhan();
      }

      // 2. Strict per-prayer debounce: do not re-trigger the same prayer within 15 minutes unless user is testing/previewing
      if (!isPreview && !options?.fromNative && (nowMs - lastTriggered < 15 * 60 * 1000)) {
        return;
      }

      if (!isPreview) {
        this.lastTriggeredPrayerTimes[prayerId] = nowMs;
      }

      this.activeAdhan = {
        prayerId,
        prayerName,
        prayerTime12,
        voice,
        mode,
        startTimeMs: Date.now(),
        durationSeconds: mode === 'first_two_takbeers' ? 20 : 180,
        isMuted: false,
        isPlaying: true,
        isFajr: prayerId === 'fajr',
        sceneImage,
      };

      // Request Screen Wake Lock so display does not sleep while Adhan is ringing
      this.acquireScreenWakeLock();

      // Trigger Native Android Priority Fullscreen Intent & Foreground Service ONLY if not already dispatched from native
      if (isNative) {
        if (!options?.fromNative) {
          try {
            NativePermissions.triggerFullScreenAthan({
              prayerName,
              prayerTime: prayerTime12,
            }).catch(() => {});
          } catch {}
        }
      } else {
        // Play Adhan Audio with seamless fallback in Web / PWA mode
        AudioService.playAdhan(voice, {
          mode,
          onFinished: () => {
            // Automatically play post-adhan Dua if enabled
            try {
              const currentSettings = StorageService.getSettings();
              if (currentSettings.duaAfterAdhanEnabled !== false) {
                AudioService.playDuaAfterAdhan().catch((e) =>
                  console.warn('Dua after adhan auto-play error:', e)
                );
              }
            } catch {}

            // Keep screen open for post-adhan dua and logging
            if (this.activeAdhan) {
              this.activeAdhan = {
                ...this.activeAdhan,
                isPlaying: false,
              };
              this.notifyAdhanListeners();
            }
          },
        }).catch((err) => {
          console.warn('Audio playAdhan error:', err);
          // If browser autoplay policy blocked sound, gracefully keep visual mode open
          if (this.activeAdhan) {
            this.activeAdhan = {
              ...this.activeAdhan,
              isMuted: true,
            };
            this.notifyAdhanListeners();
          }
        });
      }

      this.notifyAdhanListeners();
    } finally {
      this.isLaunching = false;
    }
  }

  /**
   * Stops Adhan permanently and closes the full screen overlay
   */
  public dismissFullScreenAdhan(): void {
    if (this.isDismissing) return;
    this.isDismissing = true;
    try {
      this.activeAdhan = null;
      AudioService.stopAdhan();
      this.releaseScreenWakeLock();

      try {
        const isNative = typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.());
        if (isNative) {
          NativePermissions.stopFullScreenAthan().catch(() => {});
        }
        if (typeof window !== 'undefined' && (window as any).AtharNative?.stopAthan) {
          (window as any).AtharNative.stopAthan();
        }
      } catch {}

      this.notifyAdhanListeners();
    } finally {
      this.isDismissing = false;
    }
  }

  /**
   * Mutes Adhan audio in place without closing the visual screen
   * (Allows user to watch prayer calligraphy and recite quietly)
   */
  public muteAdhanAndKeepScreenOpen(): void {
    if (!this.activeAdhan) return;
    this.activeAdhan = {
      ...this.activeAdhan,
      isMuted: true,
    };
    AudioService.setAdhanMuted(true);
    try {
      NativePermissions.muteNotificationAudio().catch(() => {});
    } catch {}
    this.notifyAdhanListeners();
  }

  /**
   * Toggles Adhan audio mute/live playback without resetting audio position!
   */
  public toggleAdhanAudioLive(): boolean {
    if (!this.activeAdhan) return false;
    const nextMuted = !this.activeAdhan.isMuted;
    this.activeAdhan = {
      ...this.activeAdhan,
      isMuted: nextMuted,
    };
    AudioService.setAdhanMuted(nextMuted);
    try {
      if (nextMuted) {
        NativePermissions.muteNotificationAudio().catch(() => {});
      } else {
        NativePermissions.unmuteNotificationAudio().catch(() => {});
      }
    } catch {}
    this.notifyAdhanListeners();
    return !nextMuted;
  }

  /**
   * Toggles play / pause live without restarting from beginning
   */
  public toggleAdhanPlayPause(): void {
    if (!this.activeAdhan) return;
    if (this.activeAdhan.isPlaying) {
      AudioService.pause();
      this.activeAdhan = { ...this.activeAdhan, isPlaying: false };
    } else {
      AudioService.resume();
      this.activeAdhan = { ...this.activeAdhan, isPlaying: true, isMuted: false };
    }
    this.notifyAdhanListeners();
  }

  public hasActiveAdhanScreen(): boolean {
    return this.activeAdhan !== null;
  }

  public getActiveAdhanState(): ActiveAdhanState | null {
    return this.activeAdhan;
  }

  public subscribeAdhanScreen(callback: (state: ActiveAdhanState | null) => void): () => void {
    this.adhanListeners.add(callback);
    callback(this.activeAdhan);
    return () => {
      this.adhanListeners.delete(callback);
    };
  }

  private notifyAdhanListeners(): void {
    this.adhanListeners.forEach((cb) => {
      try {
        cb(this.activeAdhan ? { ...this.activeAdhan } : null);
      } catch (e) {
        console.warn('Adhan listener error:', e);
      }
    });
  }

  /**
   * Internal launcher triggered only after countdown expiry for delayed test
   */
  private launchTestAdhan(prayerId: ObligatoryPrayerId = 'maghrib'): void {
    this.launchFullScreenAdhan({
      prayerId,
      prayerName: this.getPrayerArabicName(prayerId),
      prayerTime12: formatPrayerTime12(new Date().toTimeString().slice(0, 5)),
      isPreview: true,
    });
  }

  /**
   * 5-Second Delayed Test: Triggers after 5 seconds so the user can lock their phone
   * or switch to another app to test the priority overlay!
   */
  public trigger5SecondDelayedTest(
    prayerId: ObligatoryPrayerId = 'maghrib',
    onCountdownTick?: (remainingSeconds: number) => void
  ): Promise<void> {
    if (this.delayedTestTimeoutId !== null && typeof window !== 'undefined') {
      clearTimeout(this.delayedTestTimeoutId);
      this.delayedTestTimeoutId = null;
    }

    return new Promise((resolve) => {
      let secondsLeft = 5;
      onCountdownTick?.(secondsLeft);

      const interval = setInterval(() => {
        secondsLeft -= 1;
        if (secondsLeft > 0) {
          onCountdownTick?.(secondsLeft);
        } else {
          clearInterval(interval);
          onCountdownTick?.(0);
          this.launchTestAdhan(prayerId);
          resolve();
        }
      }, 1000);

      this.delayedTestTimeoutId = interval as any;
    });
  }

  private async acquireScreenWakeLock(): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
        this.screenWakeLock = await (navigator as any).wakeLock.request('screen');
      }
    } catch {}
  }

  private releaseScreenWakeLock(): void {
    try {
      if (this.screenWakeLock) {
        this.screenWakeLock.release().catch(() => {});
        this.screenWakeLock = null;
      }
    } catch {}
  }

  public testQuranVerseReminder(): void {
    AudioService.playUrl('/audio/quran_sample.mp3', 'reminder_verse', {
      title: 'آية وتدبر',
      subtitle: 'تلاوة قرآنية مباركة',
    }).catch(() => {});
  }

  public testSalawatReminder(): void {
    AudioService.playUrl('/audio/salawat.mp3', 'reminder_salawat', {
      title: 'الصلاة على النبي ﷺ',
      subtitle: 'اللهم صل وسلم على نبينا محمد',
    }).catch(() => {});
  }

  public testParentsReminder(): void {
    AudioService.playUrl('/audio/parents.mp3', 'reminder_parents', {
      title: 'بر الوالدين',
      subtitle: 'وقل رب ارحمهما كما ربياني صغيرا',
    }).catch(() => {});
  }

  public testDhikrReminder(_id?: string): void {
    AudioService.playUrl('/audio/dhikr_sample.mp3', 'reminder_dhikr', {
      title: 'تذكير بالذكر',
      subtitle: 'سبحان الله وبحمده',
    }).catch(() => {});
  }

  public testMorningAdhkar(): void {
    AudioService.playUrl('/audio/dhikr_sample.mp3', 'adhkar', {
      title: 'أذكار الصباح',
      subtitle: 'حصن المسلم اليومي',
    }).catch(() => {});
  }

  public testEveningAdhkar(): void {
    AudioService.playUrl('/audio/dhikr_sample.mp3', 'adhkar', {
      title: 'أذكار المساء',
      subtitle: 'حصن المسلم اليومي',
    }).catch(() => {});
  }

  public testDailyWirdReminder(): void {
    AudioService.playUrl('/audio/wird.mp3', 'reminder_wird', {
      title: 'ورد اليوم',
      subtitle: 'تذكير الورد اليومي',
    }).catch(() => {});
  }

  public testIqamah(): void {
    AudioService.playUrl('/audio/iqamah.mp3', 'iqamah', {
      title: 'إقامة الصلاة',
      subtitle: 'قد قامت الصلاة',
    }).catch(() => {});
  }

  public testDuaAfterAdhan(): void {
    AudioService.playUrl('/audio/dua_after_adhan.mp3', 'dua_adhan', {
      title: 'دعاء ما بعد الأذان',
      subtitle: 'اللهم رب هذه الدعوة التامة',
    }).catch(() => {});
  }

  public testAdhan(voice?: string, mode?: string, prayer?: string): void {
    this.launchFullScreenAdhan({
      prayerId: (prayer as any) || 'maghrib',
      voice: (voice as any) || 'alafasy',
      mode: (mode as any) || 'full',
      isPreview: true,
    });
  }

  public testFajrAdhan(): void {
    this.launchFullScreenAdhan({ prayerId: 'fajr', isPreview: true });
  }

  public testAdhanDelayed(seconds: number = 5, prayer: string = 'maghrib'): void {
    this.trigger5SecondDelayedTest((prayer as any) || 'maghrib');
  }

  public launchRoyalAtharOverlay(options?: any): void {
    this.launchFullScreenAdhan({ ...options, isPreview: true });
  }

  public dismissRoyalAtharOverlay(): void {
    this.dismissFullScreenAdhan();
  }

  public triggerTestReminder(category?: string): void {
    if (category === 'salawat') this.testSalawatReminder();
    else if (category === 'parents') this.testParentsReminder();
    else this.testQuranVerseReminder();
  }

  public subscribe(callback: any): () => void {
    return this.subscribeAdhanScreen(callback);
  }

  public subscribeAdhan(callback: any): () => void {
    return this.subscribeAdhanScreen(callback);
  }

  public getState() {
    return {
      activeAdhan: this.activeAdhan,
      activeOverlay: null,
    };
  }
}

export const ReminderEngine = new ReminderEngineClass();
ReminderEngine.start();
