import { 
  AppSettings, Bookmark, LastRead, LastAudioPosition, 
  AdhkarProgressState, AdhkarStats, AdhkarBadge,
  QuranKhatmahState, PrayerTimesData, AyahItem, AdhkarCategory,
  DailyWirdConfig, TasbihState, TasbihDhikr, PrayerAchievementsState, DetailedSunanState,
  SadaqahRecord, FastingTrackerState, LastAdhkarRead, LastAdhkarAudio,
  TadabburProgressState, KinshipParentsState, KinshipContact,
  DailyIntentionsState, RightsAndWasayaState, RightsRecord, IslamicWillDocument,
  PrayersAdhanConfig, ObligatoryPrayerId
} from '../types';
import { DEFAULT_COORDINATES } from '../data/citiesData';
import { STANDARD_WASIYYAH_PREAMBLE } from '../data/sakinaAndRightsData';
import { NativePermissionsBridge } from './nativePermissionsBridge';
import { VERIFIED_DHIKR_REMINDERS } from '../data/dhikrRemindersData';

export const DEFAULT_SUNAN_DETAILS: DetailedSunanState = {
  fajr_before: false,
  dhuhr_before_1: false,
  dhuhr_before_2: false,
  dhuhr_after: false,
  maghrib_after: false,
  isha_after: false,
};

export const DEFAULT_PRAYERS_ADHAN_CONFIG: PrayersAdhanConfig = {
  fajr: { enabled: true, voice: 'alafasy', mode: 'full', vibrate: true },
  dhuhr: { enabled: true, voice: 'alafasy', mode: 'full', vibrate: true },
  asr: { enabled: true, voice: 'alafasy', mode: 'full', vibrate: true },
  maghrib: { enabled: true, voice: 'alafasy', mode: 'full', vibrate: true },
  isha: { enabled: true, voice: 'alafasy', mode: 'full', vibrate: true },
  smartFlipToMute: true,
  priorityOverlayEnabled: true,
  fullScreenOverlayEnabled: true,
  autoEchoEnabled: true,
  autoPostAdhanDua: true,
};

const SETTINGS_KEY = 'athar_settings_v1';
const BOOKMARKS_KEY = 'athar_bookmarks_v1';
const LAST_READ_KEY = 'athar_last_read_v1';
const LAST_AUDIO_KEY = 'athar_last_audio_v1';
const SURAH_POSITIONS_KEY = 'athar_surah_positions_v1';
const ADHKAR_PROGRESS_KEY = 'athar_adhkar_progress_v1';
const ADHKAR_COUNTS_KEY = 'athar_adhkar_counts_v1';
const ADHKAR_STATS_KEY = 'athar_adhkar_stats_v1';
const LAST_ADHKAR_READ_KEY = 'athar_last_adhkar_read_v1';
const LAST_ADHKAR_AUDIO_KEY = 'athar_last_adhkar_audio_v1';
const QURAN_KHATMAH_KEY = 'athar_quran_khatmah_v1';
const PRAYER_ACHIEVEMENTS_KEY = 'athar_prayer_achievements_v1';
const DAILY_WIRD_KEY = 'athar_daily_wird_v1';
const TASBIH_KEY = 'athar_tasbih_state_v1';
const RECENT_VERSES_KEY = 'athar_recent_verses_v1';
const PRAYER_CACHE_KEY = 'athar_cached_prayers_v1';
const SURAH_CACHE_PREFIX = 'athar_cached_surah_';
const SADAQAH_KEY = 'athar_sadaqah_records_v1';
const FASTING_KEY = 'athar_fasting_tracker_v1';
const TADABBUR_KEY = 'athar_tadabbur_progress_v1';
const KINSHIP_KEY = 'athar_kinship_parents_v1';
const INTENTIONS_KEY = 'athar_daily_intentions_v1';
const RIGHTS_WASAYA_KEY = 'athar_rights_wasaya_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'ar',
  calculationMethod: '5', // Egyptian General Authority of Survey (default as requested)
  location: DEFAULT_COORDINATES,
  adhanEnabled: true,
  adhanVoice: 'alafasy',
  adhanVibrate: true,
  adhanMode: 'full', // 'full' or 'first_two_takbeers'
  duaAfterAdhanEnabled: true, // "اللهم رب هذه الدعوة التامة"
  prayersAdhanConfig: DEFAULT_PRAYERS_ADHAN_CONFIG,
  iqamahSettings: {
    enabled: true,
    defaultMinutes: 15,
    maghribMinutes: 10,
    soundEnabled: true,
    offsets: {
      fajr: 20,
      dhuhr: 15,
      asr: 15,
      maghrib: 10,
      isha: 15,
    },
  },
  dailyContentSettings: {
    autoRotate: true,
    rotationHour: 0,
    customHourTime: '00:00',
    rotationFrequency: 'daily',
    currentVerseIndex: 0,
    currentHadithIndex: 0,
    lastRotatedKey: ''
  },
  selectedReciterId: 'alafasy', // Sheikh Mishari Rashid Al-Afasy
  quranVerseReminder: {
    enabled: true,
    frequency: '2h', // Default every 2 hours
    startTime: '00:00',
    endTime: '23:59',
    mode: 'notification_and_sound',
    reciterId: 'alafasy'
  },
  salawatReminder: {
    enabled: true,
    frequency: '1h',
    startTime: '00:00',
    endTime: '23:59',
    mode: 'notification_and_sound',
    enabledDhikrIds: VERIFIED_DHIKR_REMINDERS.map((d) => d.id)
  },
  dhikrReminder: {
    enabled: true,
    frequency: '1h', // Default every 1 hour
    startTime: '00:00',
    endTime: '23:59',
    mode: 'notification_and_sound',
    selectionMode: 'rotate',
    selectedDhikrIds: [],
    currentIndex: 0
  },
  dailyWirdReminder: {
    enabled: true,
    frequency: '4h',
    startTime: '00:00',
    endTime: '23:59',
    mode: 'notification_and_sound'
  },
  parentsReminder: {
    enabled: true,
    frequency: 'daily',
    startTime: '00:00',
    endTime: '23:59',
    mode: 'notification_and_sound'
  },
  dailyWirdConfig: {
    enabled: true,
    type: 'surahs',
    targetCount: 1, // 1 surah daily by default
    completedTodayCount: 0,
    completedSurahsToday: [],
    lastActiveDate: ''
  },
  quietHours: {
    enabled: true,
    startTime: '23:00',
    endTime: '07:00'
  },
  artwork: {
    enabled: true,
    rotationInterval: 'daily', // Daily rotation default
    opacity: 0.08, // Tasteful 8% opacity (between 5% and 15%)
    currentArtworkId: 'girih_islamic_tessellation'
  },
  hasCompletedOnboarding: false,
  fontSizeMultiplier: 1.15,
  autoResumeOnInterruption: true
};


export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getLocalYesterdayDateKey(now: Date = new Date()): string {
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return getLocalDateKey(yesterday);
}

let cachedSettings: AppSettings | null = null;

export const StorageService = {
  getSettings(): AppSettings {
    if (cachedSettings) return cachedSettings;
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (!data) {
        cachedSettings = DEFAULT_SETTINGS;
        return DEFAULT_SETTINGS;
      }
      const parsed = JSON.parse(data);
      const rawLoc = parsed.location || DEFAULT_COORDINATES;
      const hydratedLocation = {
        ...DEFAULT_COORDINATES,
        ...rawLoc,
        district: rawLoc.district || DEFAULT_COORDINATES.district || 'وسط البلد',
        formattedLocation:
          rawLoc.formattedLocation ||
          (rawLoc.district && rawLoc.city && !rawLoc.city.includes(rawLoc.district)
            ? `${rawLoc.city} - ${rawLoc.district}`
            : rawLoc.city || DEFAULT_COORDINATES.formattedLocation || 'القاهرة - وسط البلد'),
      };
      const result: AppSettings = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        language: 'ar',
        location: hydratedLocation,
        iqamahSettings: {
          ...DEFAULT_SETTINGS.iqamahSettings,
          ...(parsed.iqamahSettings || {}),
          offsets: {
            ...DEFAULT_SETTINGS.iqamahSettings.offsets,
            ...(parsed.iqamahSettings?.offsets || {}),
          },
        },
        dailyContentSettings: {
          ...DEFAULT_SETTINGS.dailyContentSettings,
          ...(parsed.dailyContentSettings || {})
        },
        quranVerseReminder: {
          ...DEFAULT_SETTINGS.quranVerseReminder,
          ...(parsed.quranVerseReminder || {})
        },
        salawatReminder: {
          ...DEFAULT_SETTINGS.salawatReminder,
          ...(parsed.salawatReminder || {}),
          enabledDhikrIds:
            parsed.salawatReminder?.enabledDhikrIds && parsed.salawatReminder.enabledDhikrIds.length > 0
              ? parsed.salawatReminder.enabledDhikrIds
              : DEFAULT_SETTINGS.salawatReminder.enabledDhikrIds
        },
        dhikrReminder: {
          ...DEFAULT_SETTINGS.dhikrReminder,
          ...(parsed.dhikrReminder || {})
        },
        dailyWirdReminder: {
          ...DEFAULT_SETTINGS.dailyWirdReminder,
          ...(parsed.dailyWirdReminder || {})
        },
        parentsReminder: {
          ...DEFAULT_SETTINGS.parentsReminder,
          ...(parsed.parentsReminder || {})
        },
        quietHours: {
          ...DEFAULT_SETTINGS.quietHours,
          ...(parsed.quietHours || {})
        },
        prayersAdhanConfig: {
          ...DEFAULT_PRAYERS_ADHAN_CONFIG,
          ...(parsed.prayersAdhanConfig || {}),
          fajr: { ...DEFAULT_PRAYERS_ADHAN_CONFIG.fajr, ...(parsed.prayersAdhanConfig?.fajr || {}) },
          dhuhr: { ...DEFAULT_PRAYERS_ADHAN_CONFIG.dhuhr, ...(parsed.prayersAdhanConfig?.dhuhr || {}) },
          asr: { ...DEFAULT_PRAYERS_ADHAN_CONFIG.asr, ...(parsed.prayersAdhanConfig?.asr || {}) },
          maghrib: { ...DEFAULT_PRAYERS_ADHAN_CONFIG.maghrib, ...(parsed.prayersAdhanConfig?.maghrib || {}) },
          isha: { ...DEFAULT_PRAYERS_ADHAN_CONFIG.isha, ...(parsed.prayersAdhanConfig?.isha || {}) },
        }
      };
      cachedSettings = result;
      return result;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  getPrayersAdhanConfig(): PrayersAdhanConfig {
    const s = this.getSettings();
    return s.prayersAdhanConfig || DEFAULT_PRAYERS_ADHAN_CONFIG;
  },

  savePrayersAdhanConfig(config: PrayersAdhanConfig): void {
    const s = this.getSettings();
    const updated = { ...s, prayersAdhanConfig: config };
    this.saveSettings(updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('athar_adhan_config_changed', { detail: config }));
    }
  },

  resetPrayersAdhanConfig(): void {
    this.savePrayersAdhanConfig(DEFAULT_PRAYERS_ADHAN_CONFIG);
  },

  togglePrayerAdhan(prayerId: ObligatoryPrayerId): boolean {
    const config = this.getPrayersAdhanConfig();
    const cur = config[prayerId] || { enabled: true };
    const nextVal = !cur.enabled;
    const updated: PrayersAdhanConfig = {
      ...config,
      [prayerId]: { ...cur, enabled: nextVal },
    };
    this.savePrayersAdhanConfig(updated);
    return nextVal;
  },

  saveSettings(settings: AppSettings): void {
    cachedSettings = settings;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  },

  getBookmarks(): Bookmark[] {
    try {
      const data = localStorage.getItem(BOOKMARKS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addBookmark(bookmark: Bookmark): void {
    const list = this.getBookmarks().filter(
      b => !(b.surahNumber === bookmark.surahNumber && b.ayahNumber === bookmark.ayahNumber)
    );
    list.unshift(bookmark);
    try {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to save bookmark:', e);
    }
  },

  removeBookmark(surahNumber: number, ayahNumber: number): void {
    const list = this.getBookmarks().filter(
      b => !(b.surahNumber === surahNumber && b.ayahNumber === ayahNumber)
    );
    try {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to remove bookmark:', e);
    }
  },

  getLastRead(): LastRead | null {
    try {
      const data = localStorage.getItem(LAST_READ_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveLastRead(lastRead: LastRead): void {
    try {
      localStorage.setItem(LAST_READ_KEY, JSON.stringify(lastRead));
      this.saveSurahReadingPosition(lastRead.surahNumber, lastRead.ayahNumber);
    } catch (e) {
      console.warn('Failed to save last read:', e);
    }
  },

  getSurahReadingPosition(surahNumber: number): number {
    try {
      const data = localStorage.getItem(SURAH_POSITIONS_KEY);
      if (!data) return 1;
      const parsed = JSON.parse(data);
      return parsed[surahNumber] || 1;
    } catch {
      return 1;
    }
  },

  saveSurahReadingPosition(surahNumber: number, ayahNumber: number): void {
    try {
      const data = localStorage.getItem(SURAH_POSITIONS_KEY);
      const map: Record<number, number> = data ? JSON.parse(data) : {};
      map[surahNumber] = ayahNumber;
      localStorage.setItem(SURAH_POSITIONS_KEY, JSON.stringify(map));
    } catch (e) {
      console.warn('Failed to save surah reading position:', e);
    }
  },

  getLastAudioPosition(): LastAudioPosition | null {
    try {
      const data = localStorage.getItem(LAST_AUDIO_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveLastAudioPosition(pos: LastAudioPosition): void {
    try {
      localStorage.setItem(LAST_AUDIO_KEY, JSON.stringify(pos));
    } catch (e) {
      console.warn('Failed to save last audio position:', e);
    }
  },

  getDhikrCounts(category: AdhkarCategory): Record<number, number> {
    try {
      const data = localStorage.getItem(`${ADHKAR_COUNTS_KEY}_${category}`);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  setDhikrCount(category: AdhkarCategory, dhikrId: number, count: number): void {
    try {
      const map = this.getDhikrCounts(category);
      map[dhikrId] = count;
      localStorage.setItem(`${ADHKAR_COUNTS_KEY}_${category}`, JSON.stringify(map));
    } catch (e) {
      console.warn('Failed to set dhikr count:', e);
    }
  },

  resetCategoryCounts(category: AdhkarCategory): void {
    try {
      localStorage.removeItem(`${ADHKAR_COUNTS_KEY}_${category}`);
    } catch (e) {
      console.warn('Failed to reset dhikr counts:', e);
    }
  },

  getAdhkarProgress(): AdhkarProgressState | null {
    try {
      const data = localStorage.getItem(ADHKAR_PROGRESS_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveAdhkarProgress(state: AdhkarProgressState): void {
    try {
      localStorage.setItem(ADHKAR_PROGRESS_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save adhkar progress:', e);
    }
  },

  getLastAdhkarRead(): LastAdhkarRead | null {
    try {
      const data = localStorage.getItem(LAST_ADHKAR_READ_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveLastAdhkarRead(lastRead: LastAdhkarRead): void {
    try {
      localStorage.setItem(LAST_ADHKAR_READ_KEY, JSON.stringify(lastRead));
    } catch (e) {
      console.warn('Failed to save last adhkar read:', e);
    }
  },

  getLastAdhkarAudio(): LastAdhkarAudio | null {
    try {
      const data = localStorage.getItem(LAST_ADHKAR_AUDIO_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveLastAdhkarAudio(lastAudio: LastAdhkarAudio): void {
    try {
      localStorage.setItem(LAST_ADHKAR_AUDIO_KEY, JSON.stringify(lastAudio));
    } catch (e) {
      console.warn('Failed to save last adhkar audio:', e);
    }
  },

  getAdhkarStats(): AdhkarStats {
    const today = getLocalDateKey();
    const defaultStats: AdhkarStats = {
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: today,
      totalDhikrRecited: 0,
      todayDhikrCount: 0,
      morningCompletedToday: false,
      eveningCompletedToday: false,
      totalMorningSessions: 0,
      totalEveningSessions: 0,
      unlockedBadgeIds: []
    };

    try {
      const data = localStorage.getItem(ADHKAR_STATS_KEY);
      if (!data) return defaultStats;
      const parsed: AdhkarStats = JSON.parse(data);

      if (parsed.lastActiveDate !== today) {
        // Check if streak was yesterday
        const yesterday = getLocalYesterdayDateKey();
        if (parsed.lastActiveDate !== yesterday) {
          // Missed more than 1 day
          parsed.currentStreak = 1;
        }
        // Reset daily counters at local 12:00 AM midnight
        parsed.todayDhikrCount = 0;
        parsed.morningCompletedToday = false;
        parsed.eveningCompletedToday = false;
        parsed.lastActiveDate = today;
        this.resetCategoryCounts('morning');
        this.resetCategoryCounts('evening');
        localStorage.removeItem(ADHKAR_PROGRESS_KEY);
        localStorage.setItem(ADHKAR_STATS_KEY, JSON.stringify(parsed));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('athar_adhkar_updated', { detail: parsed }));
          window.dispatchEvent(new CustomEvent('athar_impact_updated'));
        }
      }
      return parsed;
    } catch {
      return defaultStats;
    }
  },

  recordDhikrStep(category: AdhkarCategory, dhikrId: number, targetCount: number): AdhkarStats {
    const stats = this.getAdhkarStats();
    const today = getLocalDateKey();
    const yesterday = getLocalYesterdayDateKey();

    if (stats.lastActiveDate === yesterday) {
      stats.currentStreak += 1;
      if (stats.currentStreak > stats.longestStreak) {
        stats.longestStreak = stats.currentStreak;
      }
    } else if (stats.lastActiveDate !== today) {
      stats.currentStreak = 1;
    }
    stats.lastActiveDate = today;
    stats.totalDhikrRecited += 1;
    stats.todayDhikrCount += 1;

    // Check badges
    const badges = new Set(stats.unlockedBadgeIds || []);
    badges.add('first_dhikr');
    if (stats.currentStreak >= 3) badges.add('streak_3');
    if (stats.currentStreak >= 7) badges.add('streak_7');
    if (stats.totalDhikrRecited >= 100) badges.add('hundred_club');
    if (stats.totalDhikrRecited >= 1000) badges.add('thousand_club');
    stats.unlockedBadgeIds = Array.from(badges);

    try {
      localStorage.setItem(ADHKAR_STATS_KEY, JSON.stringify(stats));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('athar_adhkar_updated', { detail: stats }));
        window.dispatchEvent(new CustomEvent('athar_impact_updated'));
      }
    } catch (e) {
      console.warn('Failed to save adhkar stats:', e);
    }
    return stats;
  },

  recordSessionCompleted(category: AdhkarCategory): AdhkarStats {
    const stats = this.getAdhkarStats();
    if (category === 'morning') {
      stats.morningCompletedToday = true;
      stats.totalMorningSessions = (stats.totalMorningSessions || 0) + 1;
    } else {
      stats.eveningCompletedToday = true;
      stats.totalEveningSessions = (stats.totalEveningSessions || 0) + 1;
    }

    const badges = new Set(stats.unlockedBadgeIds || []);
    if (category === 'morning') badges.add('morning_guard');
    if (category === 'evening') badges.add('evening_guard');
    if (stats.morningCompletedToday && stats.eveningCompletedToday) badges.add('both_wards');
    stats.unlockedBadgeIds = Array.from(badges);

    try {
      localStorage.setItem(ADHKAR_STATS_KEY, JSON.stringify(stats));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('athar_adhkar_updated', { detail: stats }));
        window.dispatchEvent(new CustomEvent('athar_impact_updated'));
      }
    } catch (e) {
      console.warn('Failed to save adhkar stats:', e);
    }
    return stats;
  },

  resetSessionCompleted(category: AdhkarCategory): AdhkarStats {
    const stats = this.getAdhkarStats();
    if (category === 'morning') {
      stats.morningCompletedToday = false;
    } else {
      stats.eveningCompletedToday = false;
    }
    return this.saveAdhkarStats(stats);
  },

  saveAdhkarStats(stats: AdhkarStats): AdhkarStats {
    try {
      localStorage.setItem(ADHKAR_STATS_KEY, JSON.stringify(stats));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('athar_adhkar_updated', { detail: stats }));
        window.dispatchEvent(new CustomEvent('athar_impact_updated'));
      }
    } catch (e) {
      console.warn('Failed to save adhkar stats:', e);
    }
    return stats;
  },

  getQuranKhatmah(): QuranKhatmahState {
    const today = getLocalDateKey();
    const defaultKhatmah: QuranKhatmahState = {
      khatmahNumber: 1,
      completedSurahs: [],
      totalAyahsReadToday: 0,
      todayMinutesListened: 0,
      totalAyahsReadOverall: 0,
      totalMinutesListenedOverall: 0,
      lastActiveDate: today,
      dailyGoalAyahs: 25,
      readingStreakDays: 1,
      khatmahStartDate: today
    };

    try {
      const data = localStorage.getItem(QURAN_KHATMAH_KEY);
      if (!data) return defaultKhatmah;
      const parsed: QuranKhatmahState = JSON.parse(data);

      if (parsed.lastActiveDate !== today) {
        const yesterday = getLocalYesterdayDateKey();
        if (parsed.lastActiveDate !== yesterday) {
          parsed.readingStreakDays = 1;
        }
        parsed.totalAyahsReadToday = 0;
        parsed.todayMinutesListened = 0;
        parsed.lastActiveDate = today;
        this.saveQuranKhatmah(parsed);
      }
      return parsed;
    } catch {
      return defaultKhatmah;
    }
  },

  saveQuranKhatmah(state: QuranKhatmahState): void {
    try {
      localStorage.setItem(QURAN_KHATMAH_KEY, JSON.stringify(state));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('athar_khatmah_updated', { detail: state }));
        window.dispatchEvent(new CustomEvent('athar_impact_updated'));
      }
    } catch (e) {
      console.warn('Failed to save quran khatmah:', e);
    }
  },

  recordAyahRead(surahNumber: number, count: number = 1): QuranKhatmahState {
    const k = this.getQuranKhatmah();
    k.totalAyahsReadToday += count;
    k.totalAyahsReadOverall += count;
    this.saveQuranKhatmah(k);
    return k;
  },

  recordMinutesListened(minutes: number): QuranKhatmahState {
    const k = this.getQuranKhatmah();
    k.todayMinutesListened += minutes;
    k.totalMinutesListenedOverall += minutes;
    this.saveQuranKhatmah(k);
    return k;
  },

  recordSecondsListened(seconds: number): QuranKhatmahState {
    const SECONDS_BUFFER_KEY = 'athar_seconds_listened_buffer';
    let prev = 0;
    try {
      prev = Number(localStorage.getItem(SECONDS_BUFFER_KEY) || '0');
    } catch {}
    const total = prev + seconds;
    if (total >= 60) {
      const minutes = Math.floor(total / 60);
      const remainder = total % 60;
      try {
        localStorage.setItem(SECONDS_BUFFER_KEY, String(remainder));
      } catch {}
      return this.recordMinutesListened(minutes);
    } else {
      try {
        localStorage.setItem(SECONDS_BUFFER_KEY, String(total));
      } catch {}
      const k = this.getQuranKhatmah();
      // Dispatch live update so UI components can re-render if needed
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('athar_khatmah_updated', { detail: k }));
      }
      return k;
    }
  },

  getPrayerAchievements(): PrayerAchievementsState {
    const today = getLocalDateKey();
    const defaultState: PrayerAchievementsState = {
      streakDays: 1,
      longestStreak: 1,
      totalPrayersLogged: 0,
      todayPrayers: {
        fajr: false,
        dhuhr: false,
        asr: false,
        maghrib: false,
        isha: false,
        sunan: false,
        qiyam: false
      },
      todaySunanDetails: { ...DEFAULT_SUNAN_DETAILS },
      lastActiveDate: today,
      unlockedBadgeIds: []
    };

    try {
      const data = localStorage.getItem(PRAYER_ACHIEVEMENTS_KEY);
      if (!data) return defaultState;
      const parsed: PrayerAchievementsState = JSON.parse(data);

      if (parsed.lastActiveDate !== today) {
        const yesterday = getLocalYesterdayDateKey();
        // Check if any obligatory prayer was logged yesterday to maintain streak
        const loggedAnyYesterday = Object.values(parsed.todayPrayers || {}).some(v => v);
        if (parsed.lastActiveDate === yesterday && loggedAnyYesterday) {
          parsed.streakDays += 1;
          if (parsed.streakDays > parsed.longestStreak) {
            parsed.longestStreak = parsed.streakDays;
          }
        } else if (parsed.lastActiveDate !== yesterday) {
          parsed.streakDays = 1;
        }

        parsed.todayPrayers = {
          fajr: false,
          dhuhr: false,
          asr: false,
          maghrib: false,
          isha: false,
          sunan: false,
          qiyam: false
        };
        parsed.todaySunanDetails = { ...DEFAULT_SUNAN_DETAILS };
        parsed.lastActiveDate = today;
        this.savePrayerAchievements(parsed);
      } else {
        // Ensure todaySunanDetails is always populated
        parsed.todaySunanDetails = {
          ...DEFAULT_SUNAN_DETAILS,
          ...(parsed.todaySunanDetails || {})
        };

        // Auto-sanitize: remove any premature test prayer records whose time has not arrived yet today
        const cached = this.getCachedPrayers();
        if (cached?.timings) {
          const nowMs = Date.now();
          const pKeys: ('fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha')[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
          let sanitized = false;
          for (const pk of pKeys) {
            if (parsed.todayPrayers[pk] && cached.timings[pk]) {
              const rawTime = String(cached.timings[pk]).trim();
              const match = rawTime.match(/(\d{1,2}):(\d{1,2})/);
              if (match) {
                let h = parseInt(match[1], 10);
                const m = parseInt(match[2], 10);
                if (rawTime.includes('م') || rawTime.toUpperCase().includes('PM')) {
                  if (h < 12) h += 12;
                } else if ((pk === 'asr' || pk === 'maghrib' || pk === 'isha') && h < 12) {
                  h += 12;
                } else if (pk === 'dhuhr' && h < 11) {
                  h += 12;
                }
                const now = new Date();
                const pDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
                if (nowMs < pDate.getTime()) {
                  // Prayer time hasn't entered! Clean up premature record!
                  parsed.todayPrayers[pk] = false;
                  parsed.totalPrayersLogged = Math.max(0, parsed.totalPrayersLogged - 1);
                  sanitized = true;
                }
              }
            }
          }
          if (sanitized) {
            this.savePrayerAchievements(parsed);
          }
        }
      }
      return parsed;
    } catch {
      return defaultState;
    }
  },

  toggleSunanSlot(slotKey: keyof DetailedSunanState): PrayerAchievementsState {
    const state = this.getPrayerAchievements();
    if (!state.todaySunanDetails) {
      state.todaySunanDetails = { ...DEFAULT_SUNAN_DETAILS };
    }
    const isNowDone = !state.todaySunanDetails[slotKey];
    state.todaySunanDetails[slotKey] = isNowDone;
    // Update general sunan boolean flag
    state.todayPrayers.sunan = Object.values(state.todaySunanDetails).some(Boolean);

    // Badges calculation
    const badges = new Set(state.unlockedBadgeIds || []);
    if (state.todayPrayers.sunan) badges.add('sunan_reviver');
    state.unlockedBadgeIds = Array.from(badges);

    this.savePrayerAchievements(state);
    return state;
  },

  /**
   * Automatically checks if the local clock has crossed 12:00 AM midnight (00:00)
   * and resets ALL daily trackers (Prayers, Sunan, Qiyam, Adhkar, Tasbih, Daily Wird, Khatmah daily counters, Intentions, Tadabbur).
   */
  checkAndPerformMidnightDailyReset(): void {
    const LAST_MIDNIGHT_KEY = 'athar_last_midnight_reset_date_v1';
    const today = getLocalDateKey();
    let lastReset = '';
    try {
      lastReset = localStorage.getItem(LAST_MIDNIGHT_KEY) || '';
    } catch {}

    this.getPrayerAchievements();
    this.getAdhkarStats();
    this.getQuranKhatmah();
    this.getDailyWirdConfig();
    this.getTasbihState();
    this.getDailyIntentionsState();
    this.getTadabburProgress();

    if (lastReset !== today) {
      try {
        localStorage.setItem(LAST_MIDNIGHT_KEY, today);
      } catch {}
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('athar_midnight_reset', { detail: { date: today } }));
        window.dispatchEvent(new CustomEvent('athar_prayers_updated'));
        window.dispatchEvent(new CustomEvent('athar_adhkar_updated'));
        window.dispatchEvent(new CustomEvent('athar_khatmah_updated'));
        window.dispatchEvent(new CustomEvent('athar_wird_updated'));
        window.dispatchEvent(new CustomEvent('athar_sakina_updated'));
        window.dispatchEvent(new CustomEvent('athar_impact_updated'));
      }
    }
  },

  savePrayerAchievements(state: PrayerAchievementsState): void {
    try {
      localStorage.setItem(PRAYER_ACHIEVEMENTS_KEY, JSON.stringify(state));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('athar_prayers_updated', { detail: state }));
        window.dispatchEvent(new CustomEvent('athar_impact_updated'));
      }
    } catch (e) {
      console.warn('Failed to save prayer achievements:', e);
    }
  },

  /**
   * Helper to check whether a specific prayer time has arrived today
   */
  isPrayerTimeArrived(prayerKey: keyof PrayerAchievementsState['todayPrayers']): { arrived: boolean; prayerTimeStr: string; prayerNameArabic: string } {
    const PRAYER_NAMES: Record<string, string> = {
      fajr: 'صلاة الفجر',
      dhuhr: 'صلاة الظهر',
      asr: 'صلاة العصر',
      maghrib: 'صلاة المغرب',
      isha: 'صلاة العشاء',
      sunan: 'السنن الرواتب',
      qiyam: 'قيام الليل والوتر',
    };
    const name = PRAYER_NAMES[prayerKey] || 'الصلاة';
    const cached = this.getCachedPrayers();
    if (!cached?.timings) {
      return { arrived: true, prayerTimeStr: '', prayerNameArabic: name };
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const parseMin = (raw?: string): number | null => {
      if (!raw) return null;
      const clean = raw.split(' ')[0].trim();
      const match = clean.match(/(\d{1,2}):(\d{1,2})/);
      if (!match) return null;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      if (raw.includes('م') || raw.toUpperCase().includes('PM')) {
        if (h < 12) h += 12;
      }
      return h * 60 + m;
    };

    const format12 = (raw?: string): string => {
      if (!raw) return '';
      const clean = raw.split(' ')[0].trim();
      const [hStr, mStr] = clean.split(':');
      let h = parseInt(hStr, 10);
      if (isNaN(h)) return raw;
      const isPM = h >= 12;
      h = h % 12;
      if (h === 0) h = 12;
      return `${h}:${mStr} ${isPM ? 'م' : 'ص'}`;
    };

    if (prayerKey === 'fajr' || prayerKey === 'dhuhr' || prayerKey === 'asr' || prayerKey === 'maghrib' || prayerKey === 'isha') {
      const raw = cached.timings[prayerKey];
      const targetMin = parseMin(raw);
      if (targetMin === null) return { arrived: true, prayerTimeStr: '', prayerNameArabic: name };
      return {
        arrived: currentMinutes >= targetMin,
        prayerTimeStr: format12(raw),
        prayerNameArabic: name,
      };
    }

    if (prayerKey === 'sunan') {
      const fajrMin = parseMin(cached.timings.fajr);
      return {
        arrived: fajrMin !== null ? currentMinutes >= fajrMin : true,
        prayerTimeStr: format12(cached.timings.fajr),
        prayerNameArabic: name,
      };
    }

    if (prayerKey === 'qiyam') {
      const ishaMin = parseMin(cached.timings.isha) ?? 1170;
      const fajrMin = parseMin(cached.timings.fajr) ?? 300;
      const isNight = currentMinutes >= ishaMin || currentMinutes < fajrMin;
      return {
        arrived: isNight,
        prayerTimeStr: format12(cached.timings.isha),
        prayerNameArabic: name,
      };
    }

    return { arrived: true, prayerTimeStr: '', prayerNameArabic: name };
  },

  toggleTodayPrayer(prayerKey: keyof PrayerAchievementsState['todayPrayers']): PrayerAchievementsState {
    const state = this.getPrayerAchievements();

    // Critical constraint: once a prayer is recorded, it CANNOT be reversed/undone
    if (state.todayPrayers[prayerKey]) {
      return state;
    }

    // Ensure prayer time has entered before allowing recording
    const check = this.isPrayerTimeArrived(prayerKey);
    if (!check.arrived) {
      return state; // Block premature recording!
    }

    state.todayPrayers[prayerKey] = true;
    state.totalPrayersLogged += 1;

    // Badges calculation
    const badges = new Set(state.unlockedBadgeIds || []);
    if (state.todayPrayers.fajr) badges.add('fajr_guardian');
    if (state.todayPrayers.fajr && state.todayPrayers.dhuhr && state.todayPrayers.asr && state.todayPrayers.maghrib && state.todayPrayers.isha) {
      badges.add('five_daily');
    }
    if (state.todayPrayers.sunan) badges.add('sunan_reviver');
    if (state.todayPrayers.qiyam) badges.add('qiyam_light');
    if (state.streakDays >= 3) badges.add('streak_3_prayers');
    if (state.streakDays >= 7) badges.add('streak_7_prayers');
    if (state.totalPrayersLogged >= 50) badges.add('prayers_50');

    state.unlockedBadgeIds = Array.from(badges);
    this.savePrayerAchievements(state);
    return state;
  },

  togglePrayerCompleted(prayerKey: keyof PrayerAchievementsState['todayPrayers']): PrayerAchievementsState {
    return this.toggleTodayPrayer(prayerKey);
  },

  toggleSurahCompletedInKhatmah(surahNumber: number): QuranKhatmahState {
    const k = this.getQuranKhatmah();
    const set = new Set(k.completedSurahs || []);
    if (set.has(surahNumber)) {
      set.delete(surahNumber);
    } else {
      set.add(surahNumber);
    }
    k.completedSurahs = Array.from(set);
    this.saveQuranKhatmah(k);
    return k;
  },

  resetKhatmah(): QuranKhatmahState {
    const current = this.getQuranKhatmah();
    const today = new Date().toISOString().split('T')[0];
    const newK: QuranKhatmahState = {
      ...current,
      khatmahNumber: current.khatmahNumber + 1,
      completedSurahs: [],
      totalAyahsReadToday: 0,
      todayMinutesListened: 0,
      khatmahStartDate: today,
      lastActiveDate: today
    };
    this.saveQuranKhatmah(newK);
    return newK;
  },

  getRecentVersesHistory(): string[] {
    try {
      const data = localStorage.getItem(RECENT_VERSES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  pushRecentVerse(surahAyahKey: string): void {
    const history = this.getRecentVersesHistory().filter(k => k !== surahAyahKey);
    history.push(surahAyahKey);
    // Keep max 50 recent items to prevent repetition without filling memory
    if (history.length > 50) history.shift();
    try {
      localStorage.setItem(RECENT_VERSES_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to push recent verse:', e);
    }
  },

  getCachedPrayers(): PrayerTimesData | null {
    try {
      const data = localStorage.getItem(PRAYER_CACHE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setCachedPrayers(data: PrayerTimesData): void {
    try {
      localStorage.setItem(PRAYER_CACHE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to cache prayers:', e);
    }
  },

  getCachedSurah(surahNumber: number): AyahItem[] | null {
    try {
      const data = localStorage.getItem(`${SURAH_CACHE_PREFIX}${surahNumber}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setCachedSurah(surahNumber: number, ayahs: AyahItem[]): void {
    try {
      localStorage.setItem(`${SURAH_CACHE_PREFIX}${surahNumber}`, JSON.stringify(ayahs));
    } catch (e) {
      console.warn('Failed to cache surah:', e);
    }
  },

  getDailyWirdConfig(): DailyWirdConfig {
    const today = getLocalDateKey();
    const defaultWird: DailyWirdConfig = {
      enabled: true,
      type: 'surahs',
      targetCount: 1,
      completedTodayCount: 0,
      completedSurahsToday: [],
      lastActiveDate: today
    };

    try {
      const data = localStorage.getItem(DAILY_WIRD_KEY);
      if (!data) return defaultWird;
      const parsed: DailyWirdConfig = JSON.parse(data);
      // Check local midnight date rollover
      if (parsed.lastActiveDate !== today) {
        parsed.completedTodayCount = 0;
        parsed.completedSurahsToday = [];
        parsed.lastActiveDate = today;
        this.saveDailyWirdConfig(parsed);
      }
      return parsed;
    } catch {
      return defaultWird;
    }
  },

  saveDailyWirdConfig(config: DailyWirdConfig): void {
    try {
      localStorage.setItem(DAILY_WIRD_KEY, JSON.stringify(config));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('athar_wird_updated', { detail: config }));
        window.dispatchEvent(new CustomEvent('athar_impact_updated'));
      }
    } catch (e) {
      console.warn('Failed to save daily wird config:', e);
    }
  },

  markSurahCompletedInWird(surahNumber: number): DailyWirdConfig {
    const config = this.getDailyWirdConfig();
    if (!config.completedSurahsToday.includes(surahNumber)) {
      config.completedSurahsToday.push(surahNumber);
      config.completedTodayCount = config.completedSurahsToday.length;
      this.saveDailyWirdConfig(config);
      // Also mark in Khatmah for synergy
      this.toggleSurahCompletedInKhatmah(surahNumber);
    }
    return config;
  },

  getDailyWird(): DailyWirdConfig {
    return this.getDailyWirdConfig();
  },

  saveDailyWird(config: DailyWirdConfig): void {
    this.saveDailyWirdConfig(config);
  },

  getKhatmahState(): QuranKhatmahState {
    return this.getQuranKhatmah();
  },

  getTasbihState(): TasbihState {
    const today = getLocalDateKey();
    const TASBIH_DATE_KEY = 'athar_tasbih_last_date_v1';
    const defaultState: TasbihState = {
      selectedDhikrId: 'subhanallah',
      items: [
        { id: 'subhanallah', name: 'سُبْحَانَ اللَّهِ', target: 33, currentCount: 0, totalCompleted: 0 },
        { id: 'alhamdulillah', name: 'الْحَمْدُ لِلَّهِ', target: 33, currentCount: 0, totalCompleted: 0 },
        { id: 'allahuakbar', name: 'اللَّهُ أَكْبَرُ', target: 33, currentCount: 0, totalCompleted: 0 },
        { id: 'la_ilaha_illallah', name: 'لَا إِلَهَ إِلَّا اللَّهُ', target: 100, currentCount: 0, totalCompleted: 0 },
        { id: 'astaghfirullah', name: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ', target: 100, currentCount: 0, totalCompleted: 0 },
        { id: 'salawat', name: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَآلِهِ', target: 100, currentCount: 0, totalCompleted: 0 },
        { id: 'lahawla', name: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', target: 100, currentCount: 0, totalCompleted: 0 },
        { id: 'subhanallahi_wabihamdihi', name: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ سُبْحَانَ اللَّهِ الْعَظِيمِ', target: 100, currentCount: 0, totalCompleted: 0 },
        { id: 'open', name: 'تسبيح حر (مفتوح)', target: 0, currentCount: 0, totalCompleted: 0 }
      ],
      soundEnabled: true,
      vibrationEnabled: true,
      totalAllTime: 0
    };

    try {
      const data = localStorage.getItem(TASBIH_KEY);
      const lastDate = localStorage.getItem(TASBIH_DATE_KEY);
      if (!data) {
        localStorage.setItem(TASBIH_DATE_KEY, today);
        return defaultState;
      }
      const parsed: TasbihState = { ...defaultState, ...JSON.parse(data) };
      if (lastDate !== today) {
        parsed.items = (parsed.items || []).map(item => ({
          ...item,
          currentCount: 0
        }));
        localStorage.setItem(TASBIH_DATE_KEY, today);
        localStorage.setItem(TASBIH_KEY, JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return defaultState;
    }
  },

  saveTasbihState(state: TasbihState): void {
    try {
      localStorage.setItem(TASBIH_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save tasbih state:', e);
    }
  },

  incrementTasbih(dhikrId: string): { state: TasbihState; completedLap: boolean } {
    const state = this.getTasbihState();
    const item = state.items.find(i => i.id === dhikrId) || state.items[0];
    let completedLap = false;

    item.currentCount += 1;
    state.totalAllTime += 1;

    if (item.target > 0 && item.currentCount >= item.target) {
      completedLap = true;
      item.totalCompleted += 1;
      item.currentCount = 0;
    }

    this.saveTasbihState(state);

    // Also record into Adhkar stats for streaks and overall count!
    this.recordDhikrStep('morning', 9999, 1);

    return { state, completedLap };
  },

  resetTasbih(dhikrId: string): TasbihState {
    const state = this.getTasbihState();
    const item = state.items.find(i => i.id === dhikrId);
    if (item) {
      item.currentCount = 0;
      this.saveTasbihState(state);
    }
    return state;
  },

  addCustomTasbih(name: string, target: number): TasbihState {
    const state = this.getTasbihState();
    const newId = `custom_${Date.now()}`;
    state.items.push({
      id: newId,
      name,
      target,
      currentCount: 0,
      totalCompleted: 0,
      isCustom: true
    });
    state.selectedDhikrId = newId;
    this.saveTasbihState(state);
    return state;
  },

  deleteCustomTasbih(id: string): TasbihState {
    const state = this.getTasbihState();
    state.items = state.items.filter(i => i.id !== id);
    if (state.selectedDhikrId === id) {
      state.selectedDhikrId = 'subhanallah';
    }
    this.saveTasbihState(state);
    return state;
  },

  // --- Sadaqah & Zakat Charity Log ---
  getSadaqahRecords(): SadaqahRecord[] {
    try {
      const data = localStorage.getItem(SADAQAH_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addSadaqahRecord(amount: number, currency: string, intention: string): SadaqahRecord[] {
    const list = this.getSadaqahRecords();
    const record: SadaqahRecord = {
      id: `sadaqah_${Date.now()}`,
      amount: Math.max(0, Number(amount) || 0),
      currency: currency || 'ج.م',
      intention: intention.trim() || 'صدقة في سبيل الله',
      date: new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
    };
    const updated = [record, ...list];
    try {
      localStorage.setItem(SADAQAH_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save sadaqah:', e);
    }
    return updated;
  },

  deleteSadaqahRecord(id: string): SadaqahRecord[] {
    const updated = this.getSadaqahRecords().filter(r => r.id !== id);
    try {
      localStorage.setItem(SADAQAH_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to delete sadaqah:', e);
    }
    return updated;
  },

  // --- Voluntary Fasting Tracker (Mondays, Thursdays, White Days) ---
  getFastingTracker(): FastingTrackerState {
    try {
      const data = localStorage.getItem(FASTING_KEY);
      if (!data) return { fastedDates: [], totalFastedDays: 0 };
      const parsed = JSON.parse(data);
      const dates = Array.isArray(parsed.fastedDates) ? parsed.fastedDates : [];
      return {
        fastedDates: dates,
        totalFastedDays: dates.length
      };
    } catch {
      return { fastedDates: [], totalFastedDays: 0 };
    }
  },

  toggleFastingDate(dateStr?: string): FastingTrackerState {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const current = this.getFastingTracker();
    const exists = current.fastedDates.includes(targetDate);
    const updatedDates = exists
      ? current.fastedDates.filter(d => d !== targetDate)
      : [targetDate, ...current.fastedDates];
    const nextState: FastingTrackerState = {
      fastedDates: updatedDates,
      totalFastedDays: updatedDates.length
    };
    try {
      localStorage.setItem(FASTING_KEY, JSON.stringify(nextState));
    } catch (e) {
      console.warn('Failed to save fasting tracker:', e);
    }
    return nextState;
  },

  // --- Tadabbur Sessions & Practical Deeds Progress ---
  getTadabburProgress(): TadabburProgressState {
    const todayStr = getLocalDateKey();
    try {
      const data = localStorage.getItem(TADABBUR_KEY);
      if (!data) return { completedSessionIds: [], lastCompletedDate: todayStr, streakDays: 0 };
      const parsed = JSON.parse(data);
      const lastDate = parsed.lastCompletedDate || '';
      if (lastDate && lastDate !== todayStr) {
        const yesterdayStr = getLocalYesterdayDateKey();
        const nextStreak = lastDate === yesterdayStr ? Number(parsed.streakDays) || 0 : 0;
        const resetState: TadabburProgressState = {
          completedSessionIds: [],
          lastCompletedDate: todayStr,
          streakDays: nextStreak
        };
        localStorage.setItem(TADABBUR_KEY, JSON.stringify(resetState));
        return resetState;
      }
      return {
        completedSessionIds: Array.isArray(parsed.completedSessionIds) ? parsed.completedSessionIds : [],
        lastCompletedDate: lastDate || todayStr,
        streakDays: Number(parsed.streakDays) || 0
      };
    } catch {
      return { completedSessionIds: [], lastCompletedDate: todayStr, streakDays: 0 };
    }
  },

  toggleTadabburSession(sessionId: string): TadabburProgressState {
    const current = this.getTadabburProgress();
    const todayStr = getLocalDateKey();
    const isCompleted = current.completedSessionIds.includes(sessionId);
    
    let updatedIds: string[];
    let nextStreak = current.streakDays;
    
    if (isCompleted) {
      updatedIds = current.completedSessionIds.filter(id => id !== sessionId);
    } else {
      updatedIds = [...current.completedSessionIds, sessionId];
      if (current.lastCompletedDate !== todayStr || current.streakDays === 0) {
        const yesterdayStr = getLocalYesterdayDateKey();
        nextStreak = (current.lastCompletedDate === yesterdayStr) ? current.streakDays + 1 : Math.max(1, current.streakDays);
      }
    }

    const nextState: TadabburProgressState = {
      completedSessionIds: updatedIds,
      lastCompletedDate: isCompleted ? current.lastCompletedDate : todayStr,
      streakDays: nextStreak
    };

    try {
      localStorage.setItem(TADABBUR_KEY, JSON.stringify(nextState));
    } catch (e) {
      console.warn('Failed to save tadabbur state:', e);
    }
    return nextState;
  },

  // --- Kinship & Parents (بر الوالدين وصلة الرحم) ---
  getKinshipParentsState(): KinshipParentsState {
    try {
      const data = localStorage.getItem(KINSHIP_KEY);
      if (!data) {
        return {
          fatherStatus: 'alive',
          motherStatus: 'alive',
          contacts: [
            {
              id: 'sample_1',
              name: 'الوالدان الكريمان',
              relationship: 'والد/والدة',
              status: 'alive',
              preferredType: 'dua',
              lastInteractionDate: new Date().toLocaleDateString('ar-EG'),
              interactionCount: 3,
              notes: 'أحب الناس إليّ'
            },
            {
              id: 'sample_2',
              name: 'الإخوة والأخوات',
              relationship: 'إخوة',
              status: 'alive',
              preferredType: 'call',
              lastInteractionDate: new Date().toLocaleDateString('ar-EG'),
              interactionCount: 2,
              notes: 'صلة الرحم بركة في الرزق والعمر'
            }
          ]
        };
      }
      return JSON.parse(data);
    } catch {
      return {
        fatherStatus: 'alive',
        motherStatus: 'alive',
        contacts: []
      };
    }
  },

  saveKinshipParentsState(state: KinshipParentsState): void {
    try {
      localStorage.setItem(KINSHIP_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save kinship state:', e);
    }
  },

  addKinshipContact(contact: Omit<KinshipContact, 'id' | 'lastInteractionDate' | 'interactionCount'>): KinshipContact {
    const current = this.getKinshipParentsState();
    const newContact: KinshipContact = {
      ...contact,
      id: 'kin_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      lastInteractionDate: new Date().toLocaleDateString('ar-EG'),
      interactionCount: 0
    };
    current.contacts = [newContact, ...current.contacts];
    this.saveKinshipParentsState(current);
    return newContact;
  },

  deleteKinshipContact(id: string): void {
    const current = this.getKinshipParentsState();
    current.contacts = current.contacts.filter(c => c.id !== id);
    this.saveKinshipParentsState(current);
  },

  recordKinshipInteraction(id: string): void {
    const current = this.getKinshipParentsState();
    const contact = current.contacts.find(c => c.id === id);
    if (contact) {
      contact.interactionCount = (contact.interactionCount || 0) + 1;
      contact.lastInteractionDate = new Date().toLocaleDateString('ar-EG');
      this.saveKinshipParentsState(current);
    }
  },

  recordParentDua(parent: 'father' | 'mother'): void {
    const current = this.getKinshipParentsState();
    const nowStr = new Date().toLocaleDateString('ar-EG');
    if (parent === 'father') current.fatherLastDuaDate = nowStr;
    if (parent === 'mother') current.motherLastDuaDate = nowStr;
    this.saveKinshipParentsState(current);
  },

  // --- Daily Intentions (مفكرة النوايا اليومية) ---
  getDailyIntentionsState(): DailyIntentionsState {
    const todayStr = getLocalDateKey();
    try {
      const data = localStorage.getItem(INTENTIONS_KEY);
      if (!data) {
        return {
          selectedIds: [],
          lastPledgedDate: todayStr,
          totalPledgesCount: 0
        };
      }
      const parsed = JSON.parse(data);
      if (parsed.lastPledgedDate !== todayStr) {
        const resetIntentions: DailyIntentionsState = {
          selectedIds: [],
          lastPledgedDate: todayStr,
          totalPledgesCount: Number(parsed.totalPledgesCount) || 0
        };
        localStorage.setItem(INTENTIONS_KEY, JSON.stringify(resetIntentions));
        return resetIntentions;
      }
      return {
        selectedIds: Array.isArray(parsed.selectedIds) ? parsed.selectedIds : [],
        lastPledgedDate: parsed.lastPledgedDate || todayStr,
        totalPledgesCount: Number(parsed.totalPledgesCount) || 0
      };
    } catch {
      return {
        selectedIds: [],
        lastPledgedDate: todayStr,
        totalPledgesCount: 0
      };
    }
  },

  saveDailyIntentionsState(state: DailyIntentionsState): void {
    try {
      localStorage.setItem(INTENTIONS_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save intentions state:', e);
    }
  },

  toggleDailyIntention(intentionId: string): DailyIntentionsState {
    const current = this.getDailyIntentionsState();
    const todayStr = getLocalDateKey();
    const exists = current.selectedIds.includes(intentionId);
    const updatedIds = exists
      ? current.selectedIds.filter(id => id !== intentionId)
      : [...current.selectedIds, intentionId];

    const nextState: DailyIntentionsState = {
      selectedIds: updatedIds,
      lastPledgedDate: todayStr,
      totalPledgesCount: exists ? current.totalPledgesCount : current.totalPledgesCount + 1
    };
    this.saveDailyIntentionsState(nextState);
    return nextState;
  },

  // --- Rights, Debts & Islamic Will (دفتر الحقوق والوصية الشرعية) ---
  getRightsAndWasayaState(): RightsAndWasayaState {
    try {
      const data = localStorage.getItem(RIGHTS_WASAYA_KEY);
      if (!data) {
        return {
          records: [
            {
              id: 'sample_debt_1',
              type: 'debt_on_me',
              title: 'سداد مبلغ متبقٍ لمحل تجاري',
              amountOrDescription: '٥٠٠ ج.م',
              personName: 'متجر الأنوار',
              contactOrLocation: 'شارع التحرير',
              dueDate: 'نهاية الشهر',
              isFulfilled: false,
              createdAt: new Date().toLocaleDateString('ar-EG'),
              notes: 'حق واجب الأداء'
            },
            {
              id: 'sample_trust_1',
              type: 'trust',
              title: 'أوراق ومستندات في عهدتي',
              amountOrDescription: 'مغلف رسمي',
              personName: 'صديقي أحمد',
              isFulfilled: false,
              createdAt: new Date().toLocaleDateString('ar-EG'),
              notes: 'أمانة في الخزانة'
            }
          ],
          wasiyyah: {
            authorName: '',
            preamble: STANDARD_WASIYYAH_PREAMBLE,
            customDirectives: 'أوصي بثلث تركتي صدقة جارية في كفالة الأيتام وسقيا الماء، وأوصي أبنائي بالصلاة والبر فيما بينهم.',
            bequestOneThirdNotes: 'ثلث التركة في أوجه البر',
            witnesses: '',
            lastUpdated: new Date().toLocaleDateString('ar-EG')
          }
        };
      }
      return JSON.parse(data);
    } catch {
      return {
        records: [],
        wasiyyah: {
          authorName: '',
          preamble: STANDARD_WASIYYAH_PREAMBLE,
          customDirectives: '',
          lastUpdated: new Date().toLocaleDateString('ar-EG')
        }
      };
    }
  },

  saveRightsAndWasayaState(state: RightsAndWasayaState): void {
    try {
      localStorage.setItem(RIGHTS_WASAYA_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save rights & wasaya:', e);
    }
  },

  addRightsRecord(record: Omit<RightsRecord, 'id' | 'createdAt' | 'isFulfilled'>): RightsRecord {
    const current = this.getRightsAndWasayaState();
    const newRecord: RightsRecord = {
      ...record,
      id: 'right_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      isFulfilled: false,
      createdAt: new Date().toLocaleDateString('ar-EG')
    };
    current.records = [newRecord, ...current.records];
    this.saveRightsAndWasayaState(current);
    return newRecord;
  },

  toggleRightsRecordFulfilled(id: string): void {
    const current = this.getRightsAndWasayaState();
    const record = current.records.find(r => r.id === id);
    if (record) {
      record.isFulfilled = !record.isFulfilled;
      record.fulfilledDate = record.isFulfilled ? new Date().toLocaleDateString('ar-EG') : undefined;
      this.saveRightsAndWasayaState(current);
    }
  },

  deleteRightsRecord(id: string): void {
    const current = this.getRightsAndWasayaState();
    current.records = current.records.filter(r => r.id !== id);
    this.saveRightsAndWasayaState(current);
  },

  updateWasiyyahDocument(wasiyyah: Partial<IslamicWillDocument>): IslamicWillDocument {
    const current = this.getRightsAndWasayaState();
    current.wasiyyah = {
      ...current.wasiyyah,
      ...wasiyyah,
      lastUpdated: new Date().toLocaleDateString('ar-EG')
    };
    this.saveRightsAndWasayaState(current);
    return current.wasiyyah;
  },

  // --- Full Backup & Restore for User Achievements & Settings ---
  exportFullBackup(): string {
    const backupPayload = {
      app: 'ATHAR_ISLAMIC_COMPANION',
      version: 3,
      exportedAt: new Date().toISOString(),
      data: {
        settings: this.getSettings(),
        bookmarks: this.getBookmarks(),
        lastRead: this.getLastRead(),
        lastAudio: this.getLastAudioPosition(),
        surahPositions: localStorage.getItem(SURAH_POSITIONS_KEY) ? JSON.parse(localStorage.getItem(SURAH_POSITIONS_KEY)!) : {},
        adhkarStats: this.getAdhkarStats(),
        lastAdhkarRead: this.getLastAdhkarRead(),
        lastAdhkarAudio: this.getLastAdhkarAudio(),
        quranKhatmah: this.getQuranKhatmah(),
        prayerAchievements: this.getPrayerAchievements(),
        dailyWird: this.getDailyWirdConfig(),
        tasbih: this.getTasbihState(),
        sadaqahRecords: this.getSadaqahRecords(),
        fastingTracker: this.getFastingTracker(),
        tadabburProgress: this.getTadabburProgress(),
        kinshipParents: this.getKinshipParentsState(),
        dailyIntentions: this.getDailyIntentionsState(),
        rightsAndWasaya: this.getRightsAndWasayaState()
      }
    };
    return JSON.stringify(backupPayload, null, 2);
  },

  importFullBackup(jsonString: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonString);
      const d = parsed?.data || parsed;
      if (!d || typeof d !== 'object') {
        return { success: false, message: 'ملف النسخة الاحتياطية غير صالح.' };
      }
      if (d.settings) localStorage.setItem(SETTINGS_KEY, JSON.stringify(d.settings));
      if (Array.isArray(d.bookmarks)) localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(d.bookmarks));
      if (d.lastRead) localStorage.setItem(LAST_READ_KEY, JSON.stringify(d.lastRead));
      if (d.lastAudio) localStorage.setItem(LAST_AUDIO_KEY, JSON.stringify(d.lastAudio));
      if (d.surahPositions) localStorage.setItem(SURAH_POSITIONS_KEY, JSON.stringify(d.surahPositions));
      if (d.adhkarStats) localStorage.setItem(ADHKAR_STATS_KEY, JSON.stringify(d.adhkarStats));
      if (d.lastAdhkarRead) localStorage.setItem(LAST_ADHKAR_READ_KEY, JSON.stringify(d.lastAdhkarRead));
      if (d.lastAdhkarAudio) localStorage.setItem(LAST_ADHKAR_AUDIO_KEY, JSON.stringify(d.lastAdhkarAudio));
      if (d.quranKhatmah) localStorage.setItem(QURAN_KHATMAH_KEY, JSON.stringify(d.quranKhatmah));
      if (d.prayerAchievements) localStorage.setItem(PRAYER_ACHIEVEMENTS_KEY, JSON.stringify(d.prayerAchievements));
      if (d.dailyWird) localStorage.setItem(DAILY_WIRD_KEY, JSON.stringify(d.dailyWird));
      if (d.tasbih) localStorage.setItem(TASBIH_KEY, JSON.stringify(d.tasbih));
      if (Array.isArray(d.sadaqahRecords)) localStorage.setItem(SADAQAH_KEY, JSON.stringify(d.sadaqahRecords));
      if (d.fastingTracker) localStorage.setItem(FASTING_KEY, JSON.stringify(d.fastingTracker));
      if (d.tadabburProgress) localStorage.setItem(TADABBUR_KEY, JSON.stringify(d.tadabburProgress));
      if (d.kinshipParents) localStorage.setItem(KINSHIP_KEY, JSON.stringify(d.kinshipParents));
      if (d.dailyIntentions) localStorage.setItem(INTENTIONS_KEY, JSON.stringify(d.dailyIntentions));
      if (d.rightsAndWasaya) localStorage.setItem(RIGHTS_WASAYA_KEY, JSON.stringify(d.rightsAndWasaya));

      window.dispatchEvent(new CustomEvent('athar_khatmah_updated'));
      window.dispatchEvent(new CustomEvent('athar_prayers_updated'));
      window.dispatchEvent(new CustomEvent('athar_sakina_updated'));
      return { success: true, message: 'تم استعادة النسخة الاحتياطية وكافة الإنجازات وسجلات السكينة والحقوق بنجاح ✓' };
    } catch {
      return { success: false, message: 'تعذر قراءة ملف النسخة الاحتياطية. تأكد من اختيار ملف JSON الصحيح.' };
    }
  },

  clearAllData(): void {
    localStorage.clear();
  },

  getWidgetCustomization(): AndroidWidgetCustomization {
    try {
      const raw = localStorage.getItem('athar_widget_customization_v1');
      if (raw) {
        return { ...DEFAULT_WIDGET_CUSTOMIZATION, ...JSON.parse(raw) };
      }
    } catch {}
    return { ...DEFAULT_WIDGET_CUSTOMIZATION };
  },

  saveWidgetCustomization(customization: AndroidWidgetCustomization): void {
    try {
      localStorage.setItem('athar_widget_customization_v1', JSON.stringify(customization));
      window.dispatchEvent(new CustomEvent('athar_widget_customization_changed', { detail: customization }));
    } catch {}
  },

  getNotificationPreferences(): AtharNotificationPreferences {
    try {
      const raw = localStorage.getItem('athar_notification_preferences_v2');
      if (raw) {
        return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(raw) };
      }
    } catch {}
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  },

  saveNotificationPreferences(prefs: Partial<AtharNotificationPreferences>): AtharNotificationPreferences {
    const current = this.getNotificationPreferences();
    const updated: AtharNotificationPreferences = { ...current, ...prefs };
    try {
      localStorage.setItem('athar_notification_preferences_v2', JSON.stringify(updated));
      NativePermissionsBridge.setNotificationConfig({
        notificationMode: updated.notificationMode,
        fullscreenAdhan: updated.fullscreenAdhanEnabled,
        systemOverlay: updated.systemOverlayEnabled,
        muazzinRegular: updated.regularMuazzin,
        muazzinFajr: updated.fajrMuazzin,
        catQuran: updated.quranRemindersEnabled,
        catAzkar: updated.azkarRemindersEnabled,
        catReminders: updated.generalRemindersEnabled,
        catParents: updated.parentsDutyEnabled,
        catWird: updated.wirdRemindersEnabled,
        toneQuran: updated.quranAudioTone,
        toneAzkar: updated.azkarAudioTone,
        toneSalawat: updated.salawatAudioTone,
        toneParents: updated.parentsAudioTone,
        toneWird: updated.wirdAudioTone,
        repeatIntervalMins: updated.remindersIntervalMinutes,
        intervalQuranMins: updated.intervalQuranMinutes,
        intervalAzkarMins: updated.intervalAzkarMinutes,
        intervalSalawatMins: updated.intervalSalawatMinutes,
        intervalParentsMins: updated.intervalParentsMinutes,
        intervalWirdMins: updated.intervalWirdMinutes,
        masterVolume: updated.masterVolume / 100,
        masterMuted: updated.masterMuted,
        dndBypass: updated.dndBypass,
        vibrationPattern: updated.vibrationPattern,
      }).catch(() => {});
      window.dispatchEvent(new CustomEvent('athar_notification_preferences_changed', { detail: updated }));
    } catch {}
    return updated;
  },

  getEnabledDhikrAlertIds(): string[] {
    const s = this.getSettings();
    if (s.salawatReminder?.enabledDhikrIds && s.salawatReminder.enabledDhikrIds.length > 0) {
      return s.salawatReminder.enabledDhikrIds;
    }
    return VERIFIED_DHIKR_REMINDERS.map((d) => d.id);
  },

  setEnabledDhikrAlertIds(ids: string[]): void {
    const s = this.getSettings();
    const updated = {
      ...s,
      salawatReminder: {
        ...s.salawatReminder,
        enabledDhikrIds: ids,
      },
    };
    this.saveSettings(updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('athar_dhikr_alerts_updated', { detail: ids }));
    }
  },

  toggleDhikrAlertId(id: string, enabled?: boolean): void {
    const current = this.getEnabledDhikrAlertIds();
    const shouldEnable = enabled !== undefined ? enabled : !current.includes(id);
    let next: string[];
    if (shouldEnable) {
      next = current.includes(id) ? current : [...current, id];
    } else {
      next = current.filter((x) => x !== id);
    }
    this.setEnabledDhikrAlertIds(next);
  },

  setAllDhikrAlertsEnabled(enableAll: boolean): void {
    this.setEnabledDhikrAlertIds(enableAll ? VERIFIED_DHIKR_REMINDERS.map((d) => d.id) : []);
  }
};

export interface AtharNotificationPreferences {
  // 0. Three Notification Delivery Modes
  notificationMode: 'notification_only' | 'notification_audio' | 'notification_play_button';

  // 1. Prayer & Royal Athan Section
  fullscreenAdhanEnabled: boolean;
  systemOverlayEnabled: boolean;
  fajrMuazzin: string;
  regularMuazzin: string;

  // 2. Periodic Azkar & Reminders Section
  quranRemindersEnabled: boolean;
  azkarRemindersEnabled: boolean;
  generalRemindersEnabled: boolean;
  parentsDutyEnabled: boolean;
  wirdRemindersEnabled: boolean;

  // Per-category Audio Enablement Toggles
  quranAudioEnabled: boolean;
  azkarAudioEnabled: boolean;
  salawatAudioEnabled: boolean;
  parentsAudioEnabled: boolean;
  wirdAudioEnabled: boolean;

  // Custom Audio Tones
  quranAudioTone: string;
  azkarAudioTone: string;
  salawatAudioTone: string;
  parentsAudioTone: string;
  wirdAudioTone: string;

  // Granular Per-Category Interval Frequencies (Minutes)
  remindersIntervalMinutes: number; // Fallback
  intervalQuranMinutes: number;
  intervalAzkarMinutes: number;
  intervalSalawatMinutes: number;
  intervalParentsMinutes: number;
  intervalWirdMinutes: number;

  // 3. Audio & System Control Section
  masterVolume: number;
  masterMuted: boolean;
  dndBypass: boolean;
  vibrationPattern: 'standard' | 'pulse' | 'long' | 'silent';
}

export const DEFAULT_NOTIFICATION_PREFERENCES: AtharNotificationPreferences = {
  notificationMode: 'notification_audio',
  fullscreenAdhanEnabled: true,
  systemOverlayEnabled: true,
  fajrMuazzin: 'public/audio/adhan_fajr_alafasy.mp3',
  regularMuazzin: 'public/audio/adhan_alafasy.mp3',
  quranRemindersEnabled: true,
  azkarRemindersEnabled: true,
  generalRemindersEnabled: true,
  parentsDutyEnabled: true,
  wirdRemindersEnabled: true,
  quranAudioEnabled: true,
  azkarAudioEnabled: true,
  salawatAudioEnabled: true,
  parentsAudioEnabled: true,
  wirdAudioEnabled: true,
  quranAudioTone: 'public/audio/wird.mp3',
  azkarAudioTone: 'public/audio/dhikr_sample.mp3',
  salawatAudioTone: 'public/audio/salawat.mp3',
  parentsAudioTone: 'public/audio/parents.mp3',
  wirdAudioTone: 'public/audio/wird.mp3',
  remindersIntervalMinutes: 30,
  intervalQuranMinutes: 60,
  intervalAzkarMinutes: 30,
  intervalSalawatMinutes: 45,
  intervalParentsMinutes: 240,
  intervalWirdMinutes: 1440,
  masterVolume: 100,
  masterMuted: false,
  dndBypass: true,
  vibrationPattern: 'standard',
};

export interface AndroidWidgetCustomization {
  style: 'royal_card' | 'compact';
  showDhikr: boolean;
  showCountdown: boolean;
  showFajr: boolean;
  showDhuhr: boolean;
  showAsr: boolean;
  showMaghrib: boolean;
  showIsha: boolean;
  bgOpacity: 'solid' | 'glass_85' | 'glass_65';
  themeAccent: 'gold_royal' | 'gold_bright' | 'gold_amber';
}

export const DEFAULT_WIDGET_CUSTOMIZATION: AndroidWidgetCustomization = {
  style: 'royal_card',
  showDhikr: true,
  showCountdown: true,
  showFajr: true,
  showDhuhr: true,
  showAsr: true,
  showMaghrib: true,
  showIsha: true,
  bgOpacity: 'solid',
  themeAccent: 'gold_royal',
};


