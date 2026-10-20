import { Coordinates, PrayerCalculationMethod, PrayerTimesData } from '../types';
import { AstronomicalPrayerEngine, formatPrayerTime12 } from './astronomicalPrayerEngine';
import { DEFAULT_COORDINATES } from '../data/citiesData';
import { StorageService } from './storageService';
import { NativePermissionsBridge } from './nativePermissionsBridge';

export type LockScreenWidgetStyle = 'all' | 'both' | 'small' | 'medium' | 'tree_wird';

export interface PerPrayerIqamahOffsets {
  fajr: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

export interface LiveActivitySettings {
  enabled: boolean;
  showDynamicIsland: boolean;
  showLockScreenWidget: boolean;
  lockScreenWidgetStyle: LockScreenWidgetStyle;
  showCircularGaugeWidget: boolean;
  autoExpandOnFinal15Min: boolean;
  preAdhanLeadMinutes: number; // default 20 (triggers 15-20 min before Adhan)
  iqamahOffsets: PerPrayerIqamahOffsets;
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

export type PreAdhanIqamahPhase = 'idle' | 'pre_adhan' | 'awaiting_iqamah';

export interface LiveActivityState {
  isActive: boolean;
  settings: LiveActivitySettings;
  locationName: string;
  dateHijri: string;
  currentPrayerId: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
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
  countdownCompact: string; // MM:SS or X:MM:SS
  isImminent: boolean; // <= 20 minutes remaining before Adhan
  // Live Activity (Pre-Adhan 15-20m -> Adhan -> Iqamah)
  liveCardPhase: PreAdhanIqamahPhase;
  liveCardActivePrayerId: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  liveCardActivePrayerName: string;
  liveCardAdhanTime12: string;
  liveCardIqamahTime12: string;
  liveCardIqamahOffsetMinutes: number;
  liveCardMinutesRemaining: number;
  liveCardSecondsRemaining: number;
  liveCardCountdownMMSS: string;
  liveCardTotalSecondsToIqamah: number;
  liveCardRemainingToIqamahSeconds: number;
  liveCardGoldenProgressPercent: number; // 0% at -20m before Adhan -> 100% at Iqamah
  liveCardPhaseProgressPercent: number; // 0% -> 100% within current sub-phase
  segments: PrayerWindowSegment[];
}

const LIVE_ACTIVITY_SETTINGS_KEY = 'athar_live_activity_settings_v2';

const DEFAULT_IQAMAH_OFFSETS: PerPrayerIqamahOffsets = {
  fajr: 20,
  dhuhr: 15,
  asr: 15,
  maghrib: 10,
  isha: 15,
};

const DEFAULT_LIVE_ACTIVITY_SETTINGS: LiveActivitySettings = {
  enabled: true,
  showDynamicIsland: true,
  showLockScreenWidget: false,
  lockScreenWidgetStyle: 'all',
  showCircularGaugeWidget: false,
  autoExpandOnFinal15Min: true,
  preAdhanLeadMinutes: 20,
  iqamahOffsets: { ...DEFAULT_IQAMAH_OFFSETS },
  syncSystemNotification: false,
};

type LiveActivityListener = (state: LiveActivityState) => void;

class LiveActivityManager {
  private listeners: Set<LiveActivityListener> = new Set();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private currentCoords: Coordinates = DEFAULT_COORDINATES;
  private currentMethod: PrayerCalculationMethod = '5';
  private cachedDayKey: string = '';
  private cachedPrayerData: PrayerTimesData | null = null;
  private lastSyncedMinute: number = -1;
  private simulatedLivePhase: PreAdhanIqamahPhase | null = null;
  private cachedLiveActivitySettings: LiveActivitySettings | null = null;
  private lastSyncedPrayerTimestamp: number = -1;
  private currentState: LiveActivityState;

  constructor() {
    try {
      if (typeof StorageService !== 'undefined' && StorageService?.getSettings) {
        const s = StorageService.getSettings();
        if (s?.location) this.currentCoords = s.location;
        if (s?.calculationMethod) this.currentMethod = s.calculationMethod;
      }
    } catch {}
    this.currentState = this.computeCurrentState();
    this.startEngine();
  }

  public getSettings(): LiveActivitySettings {
    if (this.cachedLiveActivitySettings) return this.cachedLiveActivitySettings;
    let settings: LiveActivitySettings = { ...DEFAULT_LIVE_ACTIVITY_SETTINGS, iqamahOffsets: { ...DEFAULT_IQAMAH_OFFSETS } };
    try {
      const raw = localStorage.getItem(LIVE_ACTIVITY_SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        settings = {
          ...DEFAULT_LIVE_ACTIVITY_SETTINGS,
          ...parsed,
          iqamahOffsets: {
            ...DEFAULT_IQAMAH_OFFSETS,
            ...(parsed.iqamahOffsets || {}),
          },
        };
      }
    } catch {}
    this.cachedLiveActivitySettings = settings;
    return settings;
  }

  public saveSettings(settings: Partial<LiveActivitySettings>): LiveActivitySettings {
    const current = this.getSettings();
    const updated: LiveActivitySettings = {
      ...current,
      ...settings,
      iqamahOffsets: {
        ...current.iqamahOffsets,
        ...(settings.iqamahOffsets || {}),
      },
    };
    this.cachedLiveActivitySettings = updated;
    try {
      localStorage.setItem(LIVE_ACTIVITY_SETTINGS_KEY, JSON.stringify(updated));
    } catch {}
    this.tick();
    return updated;
  }

  public setPrayerIqamahOffset(
    prayerId: keyof PerPrayerIqamahOffsets,
    minutes: number
  ): LiveActivitySettings {
    const current = this.getSettings();
    const clamped = Math.min(45, Math.max(5, Math.round(minutes)));
    return this.saveSettings({
      iqamahOffsets: {
        ...current.iqamahOffsets,
        [prayerId]: clamped,
      },
    });
  }

  public setSimulatedLivePhase(phase: PreAdhanIqamahPhase | null) {
    this.simulatedLivePhase = phase;
    this.tick();
  }

  public getSimulatedLivePhase(): PreAdhanIqamahPhase | null {
    return this.simulatedLivePhase;
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

  private formatTimestamp12(ts: number): string {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return formatPrayerTime12(`${hh}:${mm}`);
  }

  private formatHMS(totalSeconds: number): string {
    const sec = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  private formatMMSS(totalSeconds: number): string {
    const sec = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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

  private resolveIqamahOffset(
    id: PrayerWindowSegment['id'],
    offsets: PerPrayerIqamahOffsets
  ): number {
    if (id === 'sunrise') return 15;
    return offsets[id] ?? 15;
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
    let currentPrayerId: PrayerWindowSegment['id'] = 'isha';
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
        currentPrayerId = prevSeg.id;
        currentPrayerName = prevSeg.nameArabic;
        currentPrayerTime12 = prevSeg.time12;
        currentPrayerTimestamp = prevSeg.timestamp;
      } else {
        currentPrayerId = 'isha';
        currentPrayerName = 'العشاء';
        currentPrayerTime12 = formatPrayerTime12(data.timings.isha);
        currentPrayerTimestamp = this.parseTimeToday(now, data.timings.isha, -1);
      }
    } else {
      segments[segments.length - 1].isCurrent = true;
      currentPrayerId = segments[segments.length - 1].id;
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

    // Determine Pre-Adhan (15-20m) & Awaiting-Iqamah Live Activity Window
    const leadMinutes = settings.preAdhanLeadMinutes || 20;
    const leadSeconds = leadMinutes * 60;

    const currentIqamahOffsetMin = this.resolveIqamahOffset(currentPrayerId, settings.iqamahOffsets);
    const currentIqamahTimestamp = currentPrayerTimestamp + currentIqamahOffsetMin * 60 * 1000;
    const secondsSinceCurrentAdhan = Math.floor((nowMs - currentPrayerTimestamp) / 1000);

    const nextEffectiveId: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' =
      nextPrayerId === 'sunrise' ? 'dhuhr' : nextPrayerId;
    const nextIqamahOffsetMin = this.resolveIqamahOffset(nextEffectiveId, settings.iqamahOffsets);
    const nextIqamahTimestamp = nextPrayerTimestamp + nextIqamahOffsetMin * 60 * 1000;

    let liveCardPhase: PreAdhanIqamahPhase = 'idle';
    let liveCardActivePrayerId: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' = nextEffectiveId;
    let liveCardActivePrayerName = nextPrayerId === 'sunrise' ? 'الظهر' : nextPrayerName;
    let liveCardAdhanTime12 = nextPrayerTime12;
    let liveCardIqamahTime12 = this.formatTimestamp12(nextIqamahTimestamp);
    let liveCardIqamahOffsetMinutes = nextIqamahOffsetMin;
    let liveCardSecondsRemaining = remainingSeconds;
    let liveCardTotalSecondsToIqamah = leadSeconds + nextIqamahOffsetMin * 60;
    let liveCardRemainingToIqamahSeconds = remainingSeconds + nextIqamahOffsetMin * 60;
    let liveCardGoldenProgressPercent = progressPercent;
    let liveCardPhaseProgressPercent = progressPercent;

    if (
      currentPrayerId !== 'sunrise' &&
      secondsSinceCurrentAdhan >= 0 &&
      nowMs < currentIqamahTimestamp
    ) {
      // Currently between Adhan and Iqamah!
      liveCardPhase = 'awaiting_iqamah';
      liveCardActivePrayerId = currentPrayerId;
      liveCardActivePrayerName = currentPrayerName;
      liveCardAdhanTime12 = currentPrayerTime12;
      liveCardIqamahTime12 = this.formatTimestamp12(currentIqamahTimestamp);
      liveCardIqamahOffsetMinutes = currentIqamahOffsetMin;
      const iqamahRemainingSec = Math.max(0, Math.floor((currentIqamahTimestamp - nowMs) / 1000));
      liveCardSecondsRemaining = iqamahRemainingSec;
      const iqamahTotalSec = currentIqamahOffsetMin * 60;
      liveCardTotalSecondsToIqamah = leadSeconds + iqamahTotalSec;
      liveCardRemainingToIqamahSeconds = iqamahRemainingSec;

      const totalElapsedFromPreWindow = leadSeconds + (iqamahTotalSec - iqamahRemainingSec);
      liveCardGoldenProgressPercent = Math.min(
        100,
        Math.max(0, Number(((totalElapsedFromPreWindow / liveCardTotalSecondsToIqamah) * 100).toFixed(1)))
      );
      liveCardPhaseProgressPercent = Math.min(
        100,
        Math.max(0, Number((((iqamahTotalSec - iqamahRemainingSec) / Math.max(1, iqamahTotalSec)) * 100).toFixed(1)))
      );
    } else if (nextPrayerId !== 'sunrise' && remainingSeconds > 0 && remainingSeconds <= leadSeconds) {
      // Currently in the 15-20 minute pre-Adhan Live Activity window!
      liveCardPhase = 'pre_adhan';
      liveCardActivePrayerId = nextEffectiveId;
      liveCardActivePrayerName = nextPrayerName;
      liveCardAdhanTime12 = nextPrayerTime12;
      liveCardIqamahTime12 = this.formatTimestamp12(nextIqamahTimestamp);
      liveCardIqamahOffsetMinutes = nextIqamahOffsetMin;
      liveCardSecondsRemaining = remainingSeconds;
      const iqamahTotalSec = nextIqamahOffsetMin * 60;
      liveCardTotalSecondsToIqamah = leadSeconds + iqamahTotalSec;
      liveCardRemainingToIqamahSeconds = remainingSeconds + iqamahTotalSec;

      const preElapsed = Math.max(0, leadSeconds - remainingSeconds);
      liveCardGoldenProgressPercent = Math.min(
        100,
        Math.max(0, Number(((preElapsed / liveCardTotalSecondsToIqamah) * 100).toFixed(1)))
      );
      liveCardPhaseProgressPercent = Math.min(
        100,
        Math.max(0, Number(((preElapsed / Math.max(1, leadSeconds)) * 100).toFixed(1)))
      );
    }

    // Support interactive preview mode if user toggles simulation in Widgets/Lock Screen
    if (this.simulatedLivePhase === 'pre_adhan' && liveCardPhase === 'idle') {
      liveCardPhase = 'pre_adhan';
      const simRemaining = Math.min(remainingSeconds, 14 * 60 + (now.getSeconds() || 25));
      liveCardSecondsRemaining = simRemaining;
      const iqamahTotalSec = nextIqamahOffsetMin * 60;
      liveCardTotalSecondsToIqamah = leadSeconds + iqamahTotalSec;
      liveCardRemainingToIqamahSeconds = simRemaining + iqamahTotalSec;
      const preElapsed = Math.max(0, leadSeconds - simRemaining);
      liveCardGoldenProgressPercent = Math.min(
        100,
        Math.max(12, Number(((preElapsed / liveCardTotalSecondsToIqamah) * 100).toFixed(1)))
      );
      liveCardPhaseProgressPercent = Math.min(
        100,
        Math.max(18, Number(((preElapsed / Math.max(1, leadSeconds)) * 100).toFixed(1)))
      );
    } else if (this.simulatedLivePhase === 'awaiting_iqamah' && liveCardPhase !== 'awaiting_iqamah') {
      liveCardPhase = 'awaiting_iqamah';
      const iqamahTotalSec = nextIqamahOffsetMin * 60;
      const simIqamahRem = Math.max(60, Math.floor(iqamahTotalSec * 0.6) - (now.getSeconds() || 0));
      liveCardSecondsRemaining = simIqamahRem;
      liveCardTotalSecondsToIqamah = leadSeconds + iqamahTotalSec;
      liveCardRemainingToIqamahSeconds = simIqamahRem;
      const totalElapsedFromPreWindow = leadSeconds + (iqamahTotalSec - simIqamahRem);
      liveCardGoldenProgressPercent = Math.min(
        100,
        Math.max(55, Number(((totalElapsedFromPreWindow / liveCardTotalSecondsToIqamah) * 100).toFixed(1)))
      );
      liveCardPhaseProgressPercent = Math.min(
        100,
        Math.max(40, Number((((iqamahTotalSec - simIqamahRem) / Math.max(1, iqamahTotalSec)) * 100).toFixed(1)))
      );
    }

    return {
      isActive: settings.enabled,
      settings,
      locationName: data.locationName || this.currentCoords.city || 'القاهرة',
      dateHijri: data.dateHijri,
      currentPrayerId,
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
      isImminent:
        (remainingSeconds > 0 && remainingSeconds <= leadSeconds) ||
        liveCardPhase === 'pre_adhan' ||
        liveCardPhase === 'awaiting_iqamah',
      liveCardPhase,
      liveCardActivePrayerId,
      liveCardActivePrayerName,
      liveCardAdhanTime12,
      liveCardIqamahTime12,
      liveCardIqamahOffsetMinutes,
      liveCardMinutesRemaining: Math.ceil(liveCardSecondsRemaining / 60),
      liveCardSecondsRemaining,
      liveCardCountdownMMSS: this.formatMMSS(liveCardSecondsRemaining),
      liveCardTotalSecondsToIqamah,
      liveCardRemainingToIqamahSeconds,
      liveCardGoldenProgressPercent,
      liveCardPhaseProgressPercent,
      segments,
    };
  }

  private tick() {
    try {
      if (typeof StorageService !== 'undefined' && StorageService?.getSettings) {
        const appSettings = StorageService.getSettings();
        if (
          appSettings?.location &&
          (appSettings.location.latitude !== this.currentCoords.latitude ||
           appSettings.location.longitude !== this.currentCoords.longitude ||
           appSettings.calculationMethod !== this.currentMethod)
        ) {
          this.currentCoords = appSettings.location;
          this.currentMethod = appSettings.calculationMethod || '5';
          this.cachedDayKey = '';
        }
      }
    } catch {}

    this.currentState = this.computeCurrentState();

    // Keep Android native AthanForegroundService continuously synchronized with real next prayer target timestamp
    if (this.lastSyncedPrayerTimestamp !== this.currentState.nextPrayerTimestamp) {
      this.lastSyncedPrayerTimestamp = this.currentState.nextPrayerTimestamp;
      try {
        const now = new Date();
        const data = this.getOrComputeDailyPrayers(now);
        const dailySchedule = [
          { name: 'صلاة الفجر', epochMs: this.parseTimeToday(now, data.timings.fajr, 0), timeFormatted: formatPrayerTime12(data.timings.fajr) },
          { name: 'صلاة الظهر', epochMs: this.parseTimeToday(now, data.timings.dhuhr, 0), timeFormatted: formatPrayerTime12(data.timings.dhuhr) },
          { name: 'صلاة العصر', epochMs: this.parseTimeToday(now, data.timings.asr, 0), timeFormatted: formatPrayerTime12(data.timings.asr) },
          { name: 'صلاة المغرب', epochMs: this.parseTimeToday(now, data.timings.maghrib, 0), timeFormatted: formatPrayerTime12(data.timings.maghrib) },
          { name: 'صلاة العشاء', epochMs: this.parseTimeToday(now, data.timings.isha, 0), timeFormatted: formatPrayerTime12(data.timings.isha) },
        ];
        NativePermissionsBridge.updateAthanCountdown({
          nextPrayer: this.currentState.nextPrayerName.startsWith('صلاة')
            ? this.currentState.nextPrayerName
            : `صلاة ${this.currentState.nextPrayerName}`,
          targetEpochMs: this.currentState.nextPrayerTimestamp,
          timeStr: this.currentState.nextPrayerTime12,
          dailyScheduleJson: JSON.stringify(dailySchedule),
        }).catch(() => {});
      } catch {}
    }

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

  public syncWithNativeForegroundService() {
    try {
      this.lastSyncedPrayerTimestamp = this.currentState.nextPrayerTimestamp;
      const now = new Date();
      const data = this.getOrComputeDailyPrayers(now);
      const dailySchedule = [
        { name: 'صلاة الفجر', epochMs: this.parseTimeToday(now, data.timings.fajr, 0), timeFormatted: formatPrayerTime12(data.timings.fajr) },
        { name: 'صلاة الظهر', epochMs: this.parseTimeToday(now, data.timings.dhuhr, 0), timeFormatted: formatPrayerTime12(data.timings.dhuhr) },
        { name: 'صلاة العصر', epochMs: this.parseTimeToday(now, data.timings.asr, 0), timeFormatted: formatPrayerTime12(data.timings.asr) },
        { name: 'صلاة المغرب', epochMs: this.parseTimeToday(now, data.timings.maghrib, 0), timeFormatted: formatPrayerTime12(data.timings.maghrib) },
        { name: 'صلاة العشاء', epochMs: this.parseTimeToday(now, data.timings.isha, 0), timeFormatted: formatPrayerTime12(data.timings.isha) },
      ];
      NativePermissionsBridge.startAthanForegroundService({
        nextPrayer: this.currentState.nextPrayerName.startsWith('صلاة')
          ? this.currentState.nextPrayerName
          : `صلاة ${this.currentState.nextPrayerName}`,
        targetEpochMs: this.currentState.nextPrayerTimestamp,
        timeStr: this.currentState.nextPrayerTime12,
        dailyScheduleJson: JSON.stringify(dailySchedule),
      }).catch(() => {});
    } catch (e) {
      console.warn('[LiveActivityService] syncWithNativeForegroundService error:', e);
    }
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

      const cleanPrayerName = state.nextPrayerName.replace('صلاة ', '').trim();
      await reg.showNotification(
        `${cleanPrayerName} ، متبقي : ${state.countdownFormatted}`,
        {
          body: `${barStr} ${Math.round(state.progressPercent)}%`,
          icon: '/royal-athar-icon.png',
          badge: '/icon.svg',
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
