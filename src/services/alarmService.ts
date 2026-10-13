import { StorageService } from './storageService';
import { PrayerTimesService } from './prayerTimesService';
import { NotificationService } from './notificationService';

export type AlarmSoundId =
  | 'salat_khayr_min_nawm'
  | 'verses_qiyam_alafasy'
  | 'verses_fajr_alafasy'
  | 'verses_fajr_abdulbasit'
  | 'verses_sajdah_alafasy'
  | 'adhan_fajr_full_alafasy'
  | 'calm_islamic_dawn';

export type AlarmDismissMethod = 'direct' | 'dhikr_tap' | 'faith_question';

export interface IslamicAlarmSoundOption {
  id: AlarmSoundId;
  title: string;
  subtitle: string;
  badge: string;
  audioUrls: string[];
  useHarmonicChimeOnly?: boolean;
}

export interface IslamicAlarmItem {
  id: string;
  title: string;
  time: string; // HH:mm in 24h format
  enabled: boolean;
  isFajrLinked: boolean;
  fajrOffsetMinutes: number; // 0 = at Fajr, -15 = 15m before, -30 = 30m before, -45 = 45m before
  daysOfWeek: number[]; // 0 = Sunday .. 6 = Saturday
  soundId: AlarmSoundId;
  dismissMethod: AlarmDismissMethod;
}

export interface AlarmSystemSettings {
  defaultSoundId: AlarmSoundId;
  defaultDismissMethod: AlarmDismissMethod;
  ringDurationMinutes: number; // 1, 3, 5, 10
  snoozeMinutes: number; // 5, 10, 15
  gradualVolume: boolean;
  vibrate: boolean;
}

export interface ActiveRingingAlarmState {
  alarm: IslamicAlarmItem;
  startedAt: number;
  currentVolumePercent: number;
  loopCount: number;
  isPreview?: boolean;
}

export interface FaithWakeUpChallenge {
  id: string;
  question: string;
  verseOrPrompt: string;
  options: string[];
  correctAnswer: string;
}

export const FAITH_WAKEUP_CHALLENGES: FaithWakeUpChallenge[] = [
  {
    id: 'q1',
    question: 'أكمل الآية الكريمة من سورة الإسراء:',
    verseOrPrompt: '﴿ أَقِمِ الصَّلَاةَ لِدُلُوكِ الشَّمْسِ إِلَىٰ غَسَقِ اللَّيْلِ وَقُرْآنَ الْفَجْرِ ۖ إِنَّ قُرْآنَ الْفَجْرِ كَانَ ... ﴾',
    options: ['مَشْهُودًا', 'مَحْفُوظًا', 'مَبْرُورًا'],
    correctAnswer: 'مَشْهُودًا',
  },
  {
    id: 'q2',
    question: 'أكمل الآية الكريمة من سورة المزمل:',
    verseOrPrompt: '﴿ يَا أَيُّهَا الْمُزَّمِّلُ * قُمِ اللَّيْلَ إِلَّا ... ﴾',
    options: ['قَلِيلًا', 'كَثِيرًا', 'يَسِيرًا'],
    correctAnswer: 'قَلِيلًا',
  },
  {
    id: 'q3',
    question: 'أكمل دعاء الاستيقاظ المأثور عن النبي ﷺ:',
    verseOrPrompt: '«الحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَمَا أَمَاتَنَا وَإِلَيْهِ ...»',
    options: ['النُّشُورُ', 'المَصِيرُ', 'السَّبِيلُ'],
    correctAnswer: 'النُّشُورُ',
  },
  {
    id: 'q4',
    question: 'أكمل الآية الكريمة من سورة السجدة:',
    verseOrPrompt: '﴿ تَتَجَافَىٰ جُنُوبُهُمْ عَنِ الْمَضَاجِعِ يَدْعُونَ رَبَّهُمْ ... ﴾',
    options: ['خَوْفًا وَطَمَعًا', 'سِرًّا وَجَهْرًا', 'لَيْلًا وَنَهَارًا'],
    correctAnswer: 'خَوْفًا وَطَمَعًا',
  },
];

export const ISLAMIC_ALARM_SOUNDS: IslamicAlarmSoundOption[] = [
  {
    id: 'salat_khayr_min_nawm',
    title: 'نداء «الصلاة خير من النوم» المتكرر - مشاري العفاسي',
    subtitle: 'يبدأ مباشرة من نداء «الصلاة خير من النوم» بصوت عذب وخاشع بتكرار متصل',
    badge: 'نداء الفجر الخاشع',
    audioUrls: [
      '/audio/salat_khayr_min_nawm.mp3?v=2',
      '/audio/salat_khayr_alafasy_2.mp3?v=2',
    ],
    useHarmonicChimeOnly: false,
  },
  {
    id: 'verses_qiyam_alafasy',
    title: 'تلاوة ﴿ يَا أَيُّهَا الْمُزَّمِّلُ * قُمِ اللَّيْلَ إِلَّا قَلِيلًا ﴾ - مشاري العفاسي',
    subtitle: 'آيات قيام الليل والاستيقاظ من سورة المزمل بتلاوة عذبة ونقية عالية الجودة بدون أي نغمات',
    badge: 'تلاوة قرآنية صافية',
    audioUrls: ['/audio/alarm_muzzammil_alafasy.mp3'],
    useHarmonicChimeOnly: false,
  },
  {
    id: 'verses_fajr_alafasy',
    title: 'تلاوة ﴿ وَقُرْآنَ الْفَجْرِ إِنَّ قُرْآنَ الْفَجْرِ كَانَ مَشْهُودًا ﴾ - مشاري العفاسي',
    subtitle: 'آيات قرآن الفجر والتهجد من سورة الإسراء بصوت الشيخ مشاري راشد العفاسي بجودة استوديو صافية',
    badge: 'قرآن الفجر المشهود',
    audioUrls: ['/audio/alarm_quran_fajr_alafasy.mp3'],
    useHarmonicChimeOnly: false,
  },
  {
    id: 'verses_fajr_abdulbasit',
    title: 'تلاوة ﴿ وَقُرْآنَ الْفَجْرِ إِنَّ قُرْآنَ الْفَجْرِ كَانَ مَشْهُودًا ﴾ - عبد الباسط عبد الصمد',
    subtitle: 'تلاوة ندية خالدة لآية قرآن الفجر المشهود بصوت الشيخ عبد الباسط عبد الصمد بدون أي مؤثرات',
    badge: 'تلاوة ندية خالدة',
    audioUrls: ['/audio/alarm_quran_fajr_abdulbasit.mp3'],
    useHarmonicChimeOnly: false,
  },
  {
    id: 'verses_sajdah_alafasy',
    title: 'تلاوة ﴿ تَتَجَافَىٰ جُنُوبُهُمْ عَنِ الْمَضَاجِعِ ﴾ - مشاري العفاسي',
    subtitle: 'آيات البشارة لأهل القيام والفجر من سورة السجدة بتلاوة خاشعة صافية',
    badge: 'بشارة القائمين',
    audioUrls: ['/audio/alarm_sajdah_alafasy.mp3'],
    useHarmonicChimeOnly: false,
  },
  {
    id: 'adhan_fajr_full_alafasy',
    title: 'أذان الفجر الكامل (مع الصلاة خير من النوم) - مشاري العفاسي',
    subtitle: 'أذان فجر الكويت المسجل بصوت الشيخ مشاري راشد العفاسي بمقام الحجاز الخاشع',
    badge: 'أذان الفجر الكامل',
    audioUrls: [
      '/audio/adhan_fajr_alafasy.mp3',
      '/audio/salat_khayr_min_nawm.mp3',
    ],
    useHarmonicChimeOnly: false,
  },
  {
    id: 'calm_islamic_dawn',
    title: 'نغمة إشراق الفجر الهادئة (مخصصة لوحدها بدون تلاوة)',
    subtitle: 'نغمة تنبيه هادئة مستقلة تماماً لمن يفضل رنيناً نغمياً فقط بدون آيات قرآنية',
    badge: 'نغمة مستقلة فقط',
    audioUrls: [],
    useHarmonicChimeOnly: true,
  },
];

const ALARMS_STORAGE_KEY = 'athar_islamic_alarms_v3';
const ALARM_SETTINGS_STORAGE_KEY = 'athar_alarm_system_settings_v2';

const DEFAULT_ALARM_SETTINGS: AlarmSystemSettings = {
  defaultSoundId: 'salat_khayr_min_nawm',
  defaultDismissMethod: 'dhikr_tap',
  ringDurationMinutes: 5,
  snoozeMinutes: 5,
  gradualVolume: true,
  vibrate: true,
};

const DEFAULT_ALARMS: IslamicAlarmItem[] = [
  {
    id: 'fajr_smart_alarm',
    title: 'منبه صلاة الفجر والاستيقاظ',
    time: '05:15',
    enabled: true,
    isFajrLinked: false,
    fajrOffsetMinutes: 0,
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    soundId: 'salat_khayr_min_nawm',
    dismissMethod: 'dhikr_tap',
  },
  {
    id: 'quran_fajr_alarm',
    title: 'منبه قرآن الفجر المشهود',
    time: '05:00',
    enabled: false,
    isFajrLinked: false,
    fajrOffsetMinutes: 0,
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    soundId: 'verses_fajr_alafasy',
    dismissMethod: 'direct',
  },
  {
    id: 'qiyam_smart_alarm',
    title: 'منبه قيام الليل (يا أيها المزمل)',
    time: '04:30',
    enabled: false,
    isFajrLinked: false,
    fajrOffsetMinutes: 0,
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    soundId: 'verses_qiyam_alafasy',
    dismissMethod: 'direct',
  },
];

type RingingListener = (state: ActiveRingingAlarmState | null) => void;
type AlarmsChangeListener = () => void;

class IslamicAlarmEngine {
  private worker: Worker | null = null;
  private fallbackIntervalId: number | null = null;
  private lastTriggeredMinuteKey: string = '';

  // Audio playback state for continuous alarm loop
  private alarmAudio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private loopTimerId: number | null = null;
  private volumeEscalationTimerId: number | null = null;
  private autoStopTimerId: number | null = null;
  private previewAudio: HTMLAudioElement | null = null;
  private previewStopTimerId: number | null = null;
  private currentPlaylistIndex: number = 0;

  // Snooze tracking: key = alarmId, value = target HH:mm
  private snoozedAlarms: Map<string, { time: string; alarm: IslamicAlarmItem }> = new Map();

  private activeRingingState: ActiveRingingAlarmState | null = null;
  private ringingListeners: Set<RingingListener> = new Set();
  private dataListeners: Set<AlarmsChangeListener> = new Set();

  public start(): void {
    this.stop();
    this.syncFajrLinkedAlarmsTimes();

    try {
      const workerCode = `
        let timer = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (timer) clearInterval(timer);
            timer = setInterval(() => {
              self.postMessage('tick');
            }, 1500);
          } else if (e.data === 'stop') {
            if (timer) clearInterval(timer);
            timer = null;
          }
        };
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      this.worker = new Worker(url);
      this.worker.onmessage = () => {
        this.checkAlarmsTick();
      };
      this.worker.postMessage('start');
    } catch {
      this.fallbackIntervalId = window.setInterval(() => {
        this.checkAlarmsTick();
      }, 1500);
    }
  }

  public stop(): void {
    if (this.worker) {
      this.worker.postMessage('stop');
      this.worker.terminate();
      this.worker = null;
    }
    if (this.fallbackIntervalId) {
      clearInterval(this.fallbackIntervalId);
      this.fallbackIntervalId = null;
    }
  }

  public subscribeRinging(cb: RingingListener): () => void {
    this.ringingListeners.add(cb);
    cb(this.activeRingingState);
    return () => {
      this.ringingListeners.delete(cb);
    };
  }

  public subscribeAlarmsChange(cb: AlarmsChangeListener): () => void {
    this.dataListeners.add(cb);
    return () => {
      this.dataListeners.delete(cb);
    };
  }

  private notifyRingingListeners(): void {
    this.ringingListeners.forEach((cb) => {
      try {
        cb(this.activeRingingState ? { ...this.activeRingingState } : null);
      } catch {}
    });
  }

  private notifyDataListeners(): void {
    this.dataListeners.forEach((cb) => {
      try {
        cb();
      } catch {}
    });
  }

  public getSystemSettings(): AlarmSystemSettings {
    try {
      const raw = localStorage.getItem(ALARM_SETTINGS_STORAGE_KEY);
      if (!raw) return DEFAULT_ALARM_SETTINGS;
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_ALARM_SETTINGS, ...parsed };
    } catch {
      return DEFAULT_ALARM_SETTINGS;
    }
  }

  public saveSystemSettings(settings: Partial<AlarmSystemSettings>): AlarmSystemSettings {
    const updated = { ...this.getSystemSettings(), ...settings };
    try {
      localStorage.setItem(ALARM_SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    this.notifyDataListeners();
    return updated;
  }

  public getAlarms(): IslamicAlarmItem[] {
    try {
      const raw = localStorage.getItem(ALARMS_STORAGE_KEY);
      if (raw) {
        const parsed: IslamicAlarmItem[] = JSON.parse(raw);
        let changed = false;
        const updated = parsed.map((alarm) => {
          if (alarm.id === 'fajr_smart_alarm') {
            if (alarm.time === '05:30') {
              changed = true;
              return { ...alarm, time: '05:15', isFajrLinked: false };
            }
          }
          if (alarm.id === 'quran_fajr_alarm') {
            if (!alarm.time || alarm.time === '05:15' || alarm.time === '05:30') {
              changed = true;
              return { ...alarm, time: '05:00', isFajrLinked: false };
            }
          }
          if (alarm.id === 'qiyam_smart_alarm') {
            if (!alarm.time || alarm.time === '04:00') {
              changed = true;
              return { ...alarm, time: '04:30', isFajrLinked: false };
            }
          }
          return alarm;
        });

        if (changed) {
          try {
            localStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(updated));
          } catch {}
        }
        return this.computeUpdatedFajrAlarms(updated);
      }

      // Check legacy v2 data to preserve existing user preferences (especially if user turned an alarm off)
      const legacyRaw = localStorage.getItem('athar_islamic_alarms_v2');
      if (legacyRaw) {
        try {
          const oldList: IslamicAlarmItem[] = JSON.parse(legacyRaw);
          const migratedList: IslamicAlarmItem[] = DEFAULT_ALARMS.map((def) => {
            const found = oldList.find((a) => a.id === def.id);
            if (found) {
              return {
                ...def,
                // Crucial: preserve user's explicit toggle preference (if user turned it off, it stays off!)
                enabled: typeof found.enabled === 'boolean' ? found.enabled : def.enabled,
                soundId: found.soundId || def.soundId,
                dismissMethod: found.dismissMethod || def.dismissMethod,
                time: def.time, // Guaranteed 05:15 for Fajr, 05:00 for Quran, 04:30 for Qiyam
                isFajrLinked: false,
              };
            }
            return def;
          });

          // Retain any user-added custom alarms
          oldList.forEach((oldItem) => {
            if (!DEFAULT_ALARMS.some((d) => d.id === oldItem.id)) {
              migratedList.push(oldItem);
            }
          });

          localStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(migratedList));
          return migratedList;
        } catch {}
      }

      const seeded = [...DEFAULT_ALARMS];
      localStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    } catch {
      return DEFAULT_ALARMS;
    }
  }

  public saveAlarms(alarms: IslamicAlarmItem[]): IslamicAlarmItem[] {
    const synced = this.computeUpdatedFajrAlarms(alarms);
    try {
      localStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(synced));
    } catch {}
    this.notifyDataListeners();
    return synced;
  }

  public addAlarm(newAlarm: Omit<IslamicAlarmItem, 'id'>): IslamicAlarmItem {
    const list = this.getAlarms();
    const item: IslamicAlarmItem = {
      ...newAlarm,
      id: `alarm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    list.unshift(item);
    this.saveAlarms(list);
    return item;
  }

  public updateAlarm(id: string, patch: Partial<IslamicAlarmItem>): void {
    const list = this.getAlarms().map((a) => (a.id === id ? { ...a, ...patch } : a));
    this.saveAlarms(list);
  }

  public deleteAlarm(id: string): void {
    const list = this.getAlarms().filter((a) => a.id !== id);
    this.snoozedAlarms.delete(id);
    this.saveAlarms(list);
  }

  public getCurrentFajrTime24(): string {
    try {
      const appSettings = StorageService.getSettings();
      const prayers = PrayerTimesService.getInitialPrayerTimes(appSettings.location);
      const rawFajr = prayers?.timings?.fajr || '04:45';
      return rawFajr.split(' ')[0].trim();
    } catch {
      return '04:45';
    }
  }

  public calculateTimeWithOffset(baseTime24: string, offsetMinutes: number): string {
    const [h, m] = baseTime24.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '04:45';
    let totalMinutes = h * 60 + m + offsetMinutes;
    while (totalMinutes < 0) totalMinutes += 24 * 60;
    totalMinutes = totalMinutes % (24 * 60);
    const nh = Math.floor(totalMinutes / 60);
    const nm = totalMinutes % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
  }

  private computeUpdatedFajrAlarms(alarms: IslamicAlarmItem[]): IslamicAlarmItem[] {
    const fajr24 = this.getCurrentFajrTime24();
    return alarms.map((alarm) => {
      if (!alarm.isFajrLinked) return alarm;
      return {
        ...alarm,
        time: this.calculateTimeWithOffset(fajr24, alarm.fajrOffsetMinutes || 0),
      };
    });
  }

  public syncFajrLinkedAlarmsTimes(): void {
    try {
      const raw = localStorage.getItem(ALARMS_STORAGE_KEY);
      if (!raw) return;
      const parsed: IslamicAlarmItem[] = JSON.parse(raw);
      const synced = this.computeUpdatedFajrAlarms(parsed);
      localStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(synced));
    } catch {}
  }

  /**
   * Computes the next upcoming enabled alarm and remaining hours/minutes
   */
  public getNextUpcomingAlarmInfo(): {
    alarm: IslamicAlarmItem;
    remainingHours: number;
    remainingMinutes: number;
    formattedTime12: string;
  } | null {
    const alarms = this.getAlarms().filter((a) => a.enabled);
    if (alarms.length === 0) return null;

    const now = new Date();
    let bestAlarm: IslamicAlarmItem | null = null;
    let minDiffMs = Number.MAX_SAFE_INTEGER;

    for (const alarm of alarms) {
      const [h, m] = alarm.time.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) continue;

      for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
        const candidate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + dayOffset,
          h,
          m,
          0
        );
        if (candidate.getTime() <= now.getTime()) continue;
        const dayOfWeek = candidate.getDay();
        const allowedDays =
          alarm.daysOfWeek && alarm.daysOfWeek.length > 0
            ? alarm.daysOfWeek
            : [0, 1, 2, 3, 4, 5, 6];

        if (allowedDays.includes(dayOfWeek)) {
          const diff = candidate.getTime() - now.getTime();
          if (diff < minDiffMs) {
            minDiffMs = diff;
            bestAlarm = alarm;
          }
          break;
        }
      }
    }

    if (!bestAlarm) return null;

    const totalMinutes = Math.max(1, Math.ceil(minDiffMs / 60000));
    const remainingHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    return {
      alarm: bestAlarm,
      remainingHours,
      remainingMinutes,
      formattedTime12: this.formatTime12Arabic(bestAlarm.time),
    };
  }

  public formatTime12Arabic(time24: string): string {
    const [hStr, mStr] = (time24 || '04:45').split(':');
    let h = parseInt(hStr, 10);
    if (isNaN(h)) return time24;
    const suffix = h >= 12 ? 'م' : 'ص';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${mStr} ${suffix}`;
  }

  private checkAlarmsTick(): void {
    // Do not trigger a new alarm if one is already actively ringing
    if (this.activeRingingState) return;

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const currentHHMM = `${hh}:${mm}`;
    const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_${currentHHMM}`;

    if (this.lastTriggeredMinuteKey === todayKey) return;

    // 1. Check any snoozed alarm first
    for (const [alarmId, snoozed] of this.snoozedAlarms.entries()) {
      if (snoozed.time === currentHHMM) {
        this.snoozedAlarms.delete(alarmId);
        this.lastTriggeredMinuteKey = todayKey;
        this.triggerAlarmRinging(snoozed.alarm, false);
        return;
      }
    }

    // 2. Check scheduled alarms
    const alarms = this.getAlarms();
    const currentDay = now.getDay();

    for (const alarm of alarms) {
      if (!alarm.enabled) continue;
      const days =
        alarm.daysOfWeek && alarm.daysOfWeek.length > 0
          ? alarm.daysOfWeek
          : [0, 1, 2, 3, 4, 5, 6];
      if (!days.includes(currentDay)) continue;

      if (alarm.time === currentHHMM) {
        this.lastTriggeredMinuteKey = todayKey;
        this.triggerAlarmRinging(alarm, false);
        return;
      }
    }
  }

  /**
   * Triggers the Full-Screen Wake-Up Overlay & starts continuous looping of pure recorded Quran/Adhan audio
   * (The synthesized chime ONLY plays if the user explicitly selected 'calm_islamic_dawn')
   */
  public triggerAlarmRinging(alarm: IslamicAlarmItem, isPreview: boolean = false): void {
    this.stopPreviewSound();
    this.clearRingingAudioTimers();

    const sys = this.getSystemSettings();
    const initialVol = sys.gradualVolume ? 35 : 100;

    this.activeRingingState = {
      alarm,
      startedAt: Date.now(),
      currentVolumePercent: initialVol,
      loopCount: 1,
      isPreview,
    };
    this.currentPlaylistIndex = 0;
    this.notifyRingingListeners();

    // Send system & lock-screen notification (only for real scheduled alarms, no chime interference)
    const soundObj = this.getSoundById(alarm.soundId);
    if (!isPreview) {
      NotificationService.notify({
        title: `حان موعد المنبه: ${alarm.title}`,
        body: soundObj.title,
        type: 'prayer',
      });
    }

    if (sys.vibrate && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([500, 300, 500, 300, 700]);
      } catch {}
    }

    // Start continuous looping sound
    this.playNextLoopCycle();

    // Gradual Volume Escalation (every 5 seconds +15% up to 100%)
    if (sys.gradualVolume) {
      this.volumeEscalationTimerId = window.setInterval(() => {
        if (!this.activeRingingState) return;
        const nextVol = Math.min(100, this.activeRingingState.currentVolumePercent + 15);
        this.activeRingingState.currentVolumePercent = nextVol;
        if (this.alarmAudio) {
          this.alarmAudio.volume = nextVol / 100;
        }
        this.notifyRingingListeners();
      }, 5000);
    }

    // Auto stop after ringDurationMinutes
    const durationMs = Math.max(1, sys.ringDurationMinutes || 5) * 60 * 1000;
    this.autoStopTimerId = window.setTimeout(() => {
      if (this.activeRingingState) {
        this.dismissActiveAlarm();
      }
    }, durationMs);
  }

  public triggerQuickTestAlarm(customSoundId?: AlarmSoundId): void {
    const sys = this.getSystemSettings();
    const chosenSoundId = customSoundId || sys.defaultSoundId;
    const soundObj = this.getSoundById(chosenSoundId);
    const testAlarm: IslamicAlarmItem = {
      id: 'preview_test_alarm',
      title: `معاينة: ${soundObj.title}`,
      time: this.getCurrentFajrTime24(),
      enabled: true,
      isFajrLinked: true,
      fajrOffsetMinutes: 0,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      soundId: chosenSoundId,
      dismissMethod: sys.defaultDismissMethod,
    };
    this.triggerAlarmRinging(testAlarm, true);
  }

  public getSoundById(soundId: AlarmSoundId): IslamicAlarmSoundOption {
    return (
      ISLAMIC_ALARM_SOUNDS.find((s) => s.id === soundId) || ISLAMIC_ALARM_SOUNDS[0]
    );
  }

  private playNextLoopCycle(): void {
    if (!this.activeRingingState) return;

    const sound = this.getSoundById(this.activeRingingState.alarm.soundId);
    const volFraction = Math.max(0.25, Math.min(1, this.activeRingingState.currentVolumePercent / 100));

    // Strictly isolate the harmonic chime so it ONLY runs when 'calm_islamic_dawn' is explicitly chosen
    if (sound.id === 'calm_islamic_dawn' && sound.useHarmonicChimeOnly) {
      this.playSpiritualDawnChime(volFraction);
      this.loopTimerId = window.setTimeout(() => {
        if (!this.activeRingingState) return;
        this.activeRingingState.loopCount += 1;
        this.notifyRingingListeners();
        this.playNextLoopCycle();
      }, 4500);
      return;
    }

    const targetUrl = sound.audioUrls[this.currentPlaylistIndex % sound.audioUrls.length];
    this.currentPlaylistIndex += 1;

    try {
      if (!this.alarmAudio) {
        this.alarmAudio = new Audio();
      }
      this.alarmAudio.pause();
      this.alarmAudio.src = targetUrl;
      this.alarmAudio.volume = volFraction;

      this.alarmAudio.onended = () => {
        if (!this.activeRingingState) return;
        this.loopTimerId = window.setTimeout(() => {
          if (!this.activeRingingState) return;
          this.activeRingingState.loopCount += 1;
          this.notifyRingingListeners();
          this.playNextLoopCycle();
        }, 700);
      };

      this.alarmAudio.onerror = () => {
        if (!this.activeRingingState) return;
        this.loopTimerId = window.setTimeout(() => {
          if (!this.activeRingingState) return;
          this.activeRingingState.loopCount += 1;
          this.notifyRingingListeners();
          this.playNextLoopCycle();
        }, 2000);
      };

      this.alarmAudio.play().catch(() => {
        this.loopTimerId = window.setTimeout(() => {
          if (!this.activeRingingState) return;
          this.activeRingingState.loopCount += 1;
          this.notifyRingingListeners();
          this.playNextLoopCycle();
        }, 2500);
      });
    } catch {
      this.loopTimerId = window.setTimeout(() => {
        if (!this.activeRingingState) return;
        this.activeRingingState.loopCount += 1;
        this.notifyRingingListeners();
        this.playNextLoopCycle();
      }, 2500);
    }
  }

  private playSpiritualDawnChime(volume: number = 0.7): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      const ctx = this.audioContext;
      const now = ctx.currentTime;
      // Warm Hijaz-inspired spiritual notes (D4, F#4, G4, A4, D5) — strictly for the standalone chime option
      const freqs = [293.66, 369.99, 392.0, 440.0, 587.33];

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.35);

        const noteStart = now + idx * 0.35;
        const peakGain = Math.min(0.28, 0.25 * volume);
        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.exponentialRampToValueAtTime(peakGain, noteStart + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 1.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(noteStart);
        osc.stop(noteStart + 1.45);
      });
    } catch {}
  }

  /**
   * Preview a sound option in the UI using the local studio MP3 recording
   * (The synthesized chime ONLY plays if soundId === 'calm_islamic_dawn')
   */
  public previewSoundOption(soundId: AlarmSoundId, onPreviewEnd?: () => void): void {
    this.stopPreviewSound();
    const sound = this.getSoundById(soundId);

    if (sound.id === 'calm_islamic_dawn' && sound.useHarmonicChimeOnly) {
      this.playSpiritualDawnChime(0.85);
      this.previewStopTimerId = window.setTimeout(() => {
        this.stopPreviewSound();
        onPreviewEnd?.();
      }, 4000);
      return;
    }

    try {
      this.previewAudio = new Audio(sound.audioUrls[0]);
      this.previewAudio.volume = 0.95;
      this.previewAudio.onended = () => {
        this.stopPreviewSound();
        onPreviewEnd?.();
      };
      this.previewAudio.onerror = () => {
        this.stopPreviewSound();
        onPreviewEnd?.();
      };
      this.previewAudio.play().catch(() => {
        this.stopPreviewSound();
        onPreviewEnd?.();
      });
    } catch {
      onPreviewEnd?.();
    }

    this.previewStopTimerId = window.setTimeout(() => {
      this.stopPreviewSound();
      onPreviewEnd?.();
    }, 34000);
  }

  public stopPreviewSound(): void {
    if (this.previewStopTimerId) {
      clearTimeout(this.previewStopTimerId);
      this.previewStopTimerId = null;
    }
    if (this.previewAudio) {
      try {
        this.previewAudio.onended = null;
        this.previewAudio.onerror = null;
        this.previewAudio.pause();
        this.previewAudio.src = '';
      } catch {}
      this.previewAudio = null;
    }
  }

  private clearRingingAudioTimers(): void {
    if (this.loopTimerId) {
      clearTimeout(this.loopTimerId);
      this.loopTimerId = null;
    }
    if (this.volumeEscalationTimerId) {
      clearInterval(this.volumeEscalationTimerId);
      this.volumeEscalationTimerId = null;
    }
    if (this.autoStopTimerId) {
      clearTimeout(this.autoStopTimerId);
      this.autoStopTimerId = null;
    }
    if (this.alarmAudio) {
      try {
        this.alarmAudio.onended = null;
        this.alarmAudio.onerror = null;
        this.alarmAudio.pause();
        this.alarmAudio.src = '';
      } catch {}
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(0);
      } catch {}
    }
  }

  public dismissActiveAlarm(): void {
    this.clearRingingAudioTimers();
    this.activeRingingState = null;
    this.notifyRingingListeners();
  }

  public snoozeActiveAlarm(): number {
    if (!this.activeRingingState) return 5;
    const alarm = this.activeRingingState.alarm;
    const sys = this.getSystemSettings();
    const snoozeMins = sys.snoozeMinutes || 5;

    const now = new Date();
    const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const targetTime = this.calculateTimeWithOffset(nowTime, snoozeMins);

    this.snoozedAlarms.set(alarm.id, {
      time: targetTime,
      alarm,
    });

    this.dismissActiveAlarm();
    return snoozeMins;
  }
}

export const AlarmService = new IslamicAlarmEngine();
