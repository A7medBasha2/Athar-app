import { Coordinates, PrayerCalculationMethod, PrayerTimesData } from '../types';
import { AstronomicalPrayerEngine } from './astronomicalPrayerEngine';
import { StorageService } from './storageService';
import { formatPrayerTime12 } from './prayerTimesService';

export interface LiveActivitySettings {
  enabled: boolean;
  showDynamicIsland: boolean;
  showLockScreenWidget: boolean;
  autoExpandOnFinal15Min: boolean;
  syncSystemNotification: boolean;
}

export interface PrayerWindowSegment {
  id: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  nameArabic: string;
  time24: string;
  time12: string;
  timestamp: number;
  isPassed: boolean;
  isCurrent: boolean;
  isNext: boolean;
}

export interface LiveActivityState {
  isActive: boolean;
  settings: LiveActivitySettings;
  locationName: string;
  dateHijri: string;
  currentPrayerName: string;
  currentPrayerTime12: string;
  currentPrayerTimestamp: number;
  nextPrayerId: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  nextPrayerName: string;
  nextPrayerTime12: string;
  nextPrayerTime24: string;
  nextPrayerTimestamp: number;
  remainingSeconds: number;
  elapsedSeconds: number;
  totalWindowSeconds: number;
  progressPercent: number; // 0 to 100
  countdownFormatted: string; // HH:MM:SS
  countdownCompact: string; // MM:SS or Xس Yد
  isImminent: boolean; // <= 15 minutes remaining
  segments: PrayerWindowSegment[];
}

const LIVE_ACTIVITY_SETTINGS_KEY = 'athar_live_activity_settings_v1';

const DEFAULT_LIVE_ACTIVITY_SETTINGS: LiveActivitySettings = {
  enabled: true,
  showDynamicIsland: true,
  showLockScreenWidget: true,
  autoExpandOnFinal15Min: true,
  syncSystemNotification: false,
};

type LiveActivityListener = (state: LiveActivityState) => void;

class LiveActivityManager {
  private listeners: Set<LiveActivityListener> = new Set();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private currentCoords: Coordinates = StorageService.getSettings().location;
  private currentMethod: PrayerCalculationMethod = StorageService.getSettings().calculationMethod || '5';
  private cachedDayKey: string = '';
  private cachedPrayerData: PrayerTimesData | null = null;
  private lastSyncedMinute: number = -1;
  private currentState: LiveActivityState;

  constructor() {
    this.currentState = this.computeCurrentState();
    this.startEngine();
  }

  public getSettings(): LiveActivitySettings {
    try {
      const raw = localStorage.getItem(LIVE_ACTIVITY_SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_LIVE_ACTIVITY_SETTINGS };
      return { ...DEFAULT_LIVE_ACTIVITY_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_LIVE_ACTIVITY_SETTINGS };
    }
  }

  public saveSettings(settings: Partial<LiveActivitySettings>): LiveActivitySettings {
    const updated: LiveActivitySettings = {
      ...this.getSettings(),
      ...settings,
    };
    try {
      localStorage.setItem(LIVE_ACTIVITY_SETTINGS_KEY, JSON.stringify(updated));
    } catch {}
    this.tick();
    return updated;
  }

  public updateLocationAndMethod(coords?: Coordinates, method?: PrayerCalculationMethod) {
    const appSettings = StorageService.getSettings();
    this.currentCoords = coords || appSettings.location;
    this.currentMethod = method || appSettings.calculationMethod || '5';
    this.cachedDayKey = '';
    this.cachedPrayerData = null;
    this.tick();
  }

  public startEngine() {
    if (this.intervalId) return;
    this.tick();
    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000);
  }

  public stopEngine() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public subscribe(listener: LiveActivityListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): LiveActivityState {
    return this.currentState;
  }

  private getOrComputeDailyPrayers(now: Date): PrayerTimesData {
    const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}_${this.currentCoords.latitude.toFixed(3)}_${this.currentCoords.longitude.toFixed(3)}_${this.currentMethod}`;
    if (!this.cachedPrayerData || this.cachedDayKey !== dayKey) {
      this.cachedPrayerData = AstronomicalPrayerEngine.calculateFullPrayerTimesData(
        this.currentCoords,
        this.currentMethod,
        now
      );
      this.cachedDayKey = dayKey;
    }
    return this.cachedPrayerData;
  }

  private parseTimeToday(now: Date, time24: string, dayOffset: number = 0): number {
    const clean = time24.split(' ')[0].trim();
    const [h, m] = clean.split(':').map(Number);
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + dayOffset,
      h || 0,
      m || 0,
      0,
      0
    ).getTime();
  }

  private formatHMS(totalSeconds: number): string {
    const sec = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  private formatCompact(totalSeconds: number): string {
    const sec = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  private computeCurrentState(): LiveActivityState {
    const now = new Date();
    const nowMs = now.getTime();
    const settings = this.getSettings();
    const data = this.getOrComputeDailyPrayers(now);

    const rawOrdered: {
      id: PrayerWindowSegment['id'];
      nameArabic: string;
      time24: string;
    }[] = [
      { id: 'fajr', nameArabic: 'الفجر', time24: data.timings.fajr },
      { id: 'sunrise', nameArabic: 'الشروق', time24: data.timings.sunrise },
      { id: 'dhuhr', nameArabic: 'الظهر', time24: data.timings.dhuhr },
      { id: 'asr', nameArabic: 'العصر', time24: data.timings.asr },
      { id: 'maghrib', nameArabic: 'المغرب', time24: data.timings.maghrib },
      { id: 'isha', nameArabic: 'العشاء', time24: data.timings.isha },
    ];

    const segments: PrayerWindowSegment[] = rawOrdered.map((item) => {
      const ts = this.parseTimeToday(now, item.time24, 0);
      return {
        id: item.id,
        nameArabic: item.nameArabic,
        time24: item.time24,
        time12: formatPrayerTime12(item.time24),
        timestamp: ts,
        isPassed: ts <= nowMs,
        isCurrent: false,
        isNext: false,
      };
    });

    let nextIdx = segments.findIndex((seg) => seg.timestamp > nowMs);
    let currentPrayerName = 'العشاء';
    let currentPrayerTime12 = formatPrayerTime12(data.timings.isha);
    let currentPrayerTimestamp = this.parseTimeToday(now, data.timings.isha, -1);

    let nextPrayerId: PrayerWindowSegment['id'] = 'fajr';
    let nextPrayerName = 'الفجر';
    let nextPrayerTime24 = data.timings.fajr;
    let nextPrayerTime12 = formatPrayerTime12(data.timings.fajr);
    let nextPrayerTimestamp = this.parseTimeToday(now, data.timings.fajr, 1);

    if (nextIdx !== -1) {
      segments[nextIdx].isNext = true;
      nextPrayerId = segments[nextIdx].id;
      nextPrayerName = segments[nextIdx].nameArabic;
      nextPrayerTime24 = segments[nextIdx].time24;
      nextPrayerTime12 = segments[nextIdx].time12;
      nextPrayerTimestamp = segments[nextIdx].timestamp;

      if (nextIdx > 0) {
        const prevSeg = segments[nextIdx - 1];
        prevSeg.isCurrent = true;
        currentPrayerName = prevSeg.nameArabic;
        currentPrayerTime12 = prevSeg.time12;
        currentPrayerTimestamp = prevSeg.timestamp;
      } else {
        // Before today's Fajr -> previous window started at yesterday's Isha
        currentPrayerName = 'العشاء';
        currentPrayerTime12 = formatPrayerTime12(data.timings.isha);
        currentPrayerTimestamp = this.parseTimeToday(now, data.timings.isha, -1);
      }
    } else {
      // After today's Isha -> current is today's Isha, next is tomorrow's Fajr
      segments[segments.length - 1].isCurrent = true;
      currentPrayerName = segments[segments.length - 1].nameArabic;
      currentPrayerTime12 = segments[segments.length - 1].time12;
      currentPrayerTimestamp = segments[segments.length - 1].timestamp;

      nextPrayerId = 'fajr';
      nextPrayerName = 'الفجر';
      nextPrayerTime24 = data.timings.fajr;
      nextPrayerTime12 = formatPrayerTime12(data.timings.fajr);
      nextPrayerTimestamp = this.parseTimeToday(now, data.timings.fajr, 1);
    }

    const totalWindowSeconds = Math.max(
      60,
      Math.floor((nextPrayerTimestamp - currentPrayerTimestamp) / 1000)
    );
    const remainingSeconds = Math.max(0, Math.floor((nextPrayerTimestamp - nowMs) / 1000));
    const elapsedSeconds = Math.max(0, totalWindowSeconds - remainingSeconds);
    const rawProgress = (elapsedSeconds / totalWindowSeconds) * 100;
    const progressPercent = Math.min(100, Math.max(0, Number(rawProgress.toFixed(1))));

    return {
      isActive: settings.enabled,
      settings,
      locationName: data.locationName || this.currentCoords.city || 'القاهرة',
      dateHijri: data.dateHijri,
      currentPrayerName,
      currentPrayerTime12,
      currentPrayerTimestamp,
      nextPrayerId,
      nextPrayerName,
      nextPrayerTime12,
      nextPrayerTime24,
      nextPrayerTimestamp,
      remainingSeconds,
      elapsedSeconds,
      totalWindowSeconds,
      progressPercent,
      countdownFormatted: this.formatHMS(remainingSeconds),
      countdownCompact: this.formatCompact(remainingSeconds),
      isImminent: remainingSeconds > 0 && remainingSeconds <= 15 * 60,
      segments,
    };
  }

  private tick() {
    const appSettings = StorageService.getSettings();
    if (
      appSettings.location.latitude !== this.currentCoords.latitude ||
      appSettings.location.longitude !== this.currentCoords.longitude ||
      appSettings.calculationMethod !== this.currentMethod
    ) {
      this.currentCoords = appSettings.location;
      this.currentMethod = appSettings.calculationMethod || '5';
      this.cachedDayKey = '';
    }

    this.currentState = this.computeCurrentState();

    // Update persistent OS Lock Screen notification once per minute if enabled
    const currentMinute = Math.floor(this.currentState.remainingSeconds / 60);
    if (
      this.currentState.settings.enabled &&
      this.currentState.settings.syncSystemNotification &&
      currentMinute !== this.lastSyncedMinute
    ) {
      this.lastSyncedMinute = currentMinute;
      this.syncOngoingLockScreenNotification(this.currentState);
    }

    this.listeners.forEach((cb) => {
      try {
        cb(this.currentState);
      } catch {}
    });
  }

  public async syncOngoingLockScreenNotification(state: LiveActivityState = this.currentState) {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
      return;
    }
    if (Notification.permission !== 'granted') return;

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return;

      const filledBlocks = Math.round((state.progressPercent / 100) * 10);
      const barStr = '▰'.repeat(filledBlocks) + '▱'.repeat(Math.max(0, 10 - filledBlocks));

      await reg.showNotification(
        `الصلاة القادمة: ${state.nextPrayerName} (${state.nextPrayerTime12})`,
        {
          body: `متبقي ${state.countdownFormatted}  •  ${barStr} ${Math.round(state.progressPercent)}%`,
          icon: '/athar-logo.svg',
          badge: '/athar-logo.svg',
          tag: 'athar-live-activity-prayer',
          silent: true,
          requireInteraction: false,
          dir: 'rtl',
          lang: 'ar',
        }
      );
    } catch {
      // Ignore if browser restricts background silent updates
    }
  }
}

export const LiveActivityService = new LiveActivityManager();
