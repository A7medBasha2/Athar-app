import { 
  AppSettings, Bookmark, LastRead, LastAudioPosition, 
  AdhkarProgressState, AdhkarStats, AdhkarBadge,
  QuranKhatmahState, PrayerTimesData, AyahItem, AdhkarCategory,
  DailyWirdConfig, TasbihState, TasbihDhikr, PrayerAchievementsState,
  SadaqahRecord, FastingTrackerState, LastAdhkarRead, LastAdhkarAudio,
  TadabburProgressState, KinshipParentsState, KinshipContact,
  DailyIntentionsState, RightsAndWasayaState, RightsRecord, IslamicWillDocument
} from '../types';
import { DEFAULT_COORDINATES } from '../data/citiesData';
import { STANDARD_WASIYYAH_PREAMBLE } from '../data/sakinaAndRightsData';

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
  iqamahSettings: {
    enabled: true,
    defaultMinutes: 15,
    maghribMinutes: 5,
    soundEnabled: true
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
    startTime: '08:00',
    endTime: '22:00',
    mode: 'notification_and_sound'
  },
  salawatReminder: {
    enabled: false,
    frequency: '1h',
    startTime: '08:00',
    endTime: '22:00',
    mode: 'notification_and_sound'
  },
  dhikrReminder: {
    enabled: true,
    frequency: '1h', // Default every 1 hour
    startTime: '08:00',
    endTime: '23:00',
    mode: 'notification_and_sound',
    selectionMode: 'rotate',
    selectedDhikrIds: [],
    currentIndex: 0
  },
  dailyWirdReminder: {
    enabled: true,
    frequency: '4h',
    startTime: '08:00',
    endTime: '23:00',
    mode: 'notification_and_sound'
  },
  parentsReminder: {
    enabled: true,
    frequency: 'daily',
    startTime: '09:00',
    endTime: '21:00',
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
  fontSizeMultiplier: 1.15
};


export const StorageService = {
  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (!data) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(data);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        iqamahSettings: {
          ...DEFAULT_SETTINGS.iqamahSettings,
          ...(parsed.iqamahSettings || {})
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
          enabled: false
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
        }
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: AppSettings): void {
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
    const defaultStats: AdhkarStats = {
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
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
      const today = new Date().toISOString().split('T')[0];

      if (parsed.lastActiveDate !== today) {
        // Check if streak was yesterday
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (parsed.lastActiveDate !== yesterday) {
          // Missed more than 1 day
          parsed.currentStreak = 1;
        }
        // Reset daily counters
        parsed.todayDhikrCount = 0;
        parsed.morningCompletedToday = false;
        parsed.eveningCompletedToday = false;
        parsed.lastActiveDate = today;
      }
      return parsed;
    } catch {
      return defaultStats;
    }
  },

  recordDhikrStep(category: AdhkarCategory, dhikrId: number, targetCount: number): AdhkarStats {
    const stats = this.getAdhkarStats();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

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
    } catch (e) {
      console.warn('Failed to save adhkar stats:', e);
    }
    return stats;
  },

  getQuranKhatmah(): QuranKhatmahState {
    const today = new Date().toISOString().split('T')[0];
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
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (parsed.lastActiveDate !== yesterday) {
          parsed.readingStreakDays = 1;
        }
        parsed.totalAyahsReadToday = 0;
        parsed.todayMinutesListened = 0;
        parsed.lastActiveDate = today;
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
    const today = new Date().toISOString().split('T')[0];
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
      lastActiveDate: today,
      unlockedBadgeIds: []
    };

    try {
      const data = localStorage.getItem(PRAYER_ACHIEVEMENTS_KEY);
      if (!data) return defaultState;
      const parsed: PrayerAchievementsState = JSON.parse(data);

      if (parsed.lastActiveDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        // Check if any obligatory prayer was logged yesterday to maintain streak
        const loggedAnyYesterday = Object.values(parsed.todayPrayers).some(v => v);
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
        parsed.lastActiveDate = today;
        this.savePrayerAchievements(parsed);
      }
      return parsed;
    } catch {
      return defaultState;
    }
  },

  savePrayerAchievements(state: PrayerAchievementsState): void {
    try {
      localStorage.setItem(PRAYER_ACHIEVEMENTS_KEY, JSON.stringify(state));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('athar_prayers_updated', { detail: state }));
      }
    } catch (e) {
      console.warn('Failed to save prayer achievements:', e);
    }
  },

  toggleTodayPrayer(prayerKey: keyof PrayerAchievementsState['todayPrayers']): PrayerAchievementsState {
    const state = this.getPrayerAchievements();
    const isNowDone = !state.todayPrayers[prayerKey];
    state.todayPrayers[prayerKey] = isNowDone;

    if (isNowDone) {
      state.totalPrayersLogged += 1;
    } else {
      state.totalPrayersLogged = Math.max(0, state.totalPrayersLogged - 1);
    }

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
    const today = new Date().toISOString().split('T')[0];
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
      // Check date rollover
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

  getTasbihState(): TasbihState {
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
      if (!data) return defaultState;
      const parsed = JSON.parse(data);
      return { ...defaultState, ...parsed };
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
    try {
      const data = localStorage.getItem(TADABBUR_KEY);
      if (!data) return { completedSessionIds: [], lastCompletedDate: '', streakDays: 0 };
      const parsed = JSON.parse(data);
      return {
        completedSessionIds: Array.isArray(parsed.completedSessionIds) ? parsed.completedSessionIds : [],
        lastCompletedDate: parsed.lastCompletedDate || '',
        streakDays: Number(parsed.streakDays) || 0
      };
    } catch {
      return { completedSessionIds: [], lastCompletedDate: '', streakDays: 0 };
    }
  },

  toggleTadabburSession(sessionId: string): TadabburProgressState {
    const current = this.getTadabburProgress();
    const todayStr = new Date().toISOString().split('T')[0];
    const isCompleted = current.completedSessionIds.includes(sessionId);
    
    let updatedIds: string[];
    let nextStreak = current.streakDays;
    
    if (isCompleted) {
      updatedIds = current.completedSessionIds.filter(id => id !== sessionId);
    } else {
      updatedIds = [...current.completedSessionIds, sessionId];
      if (current.lastCompletedDate !== todayStr) {
        // Calculate consecutive streak
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        nextStreak = (current.lastCompletedDate === yesterdayStr) ? current.streakDays + 1 : 1;
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
    const todayStr = new Date().toISOString().split('T')[0];
    try {
      const data = localStorage.getItem(INTENTIONS_KEY);
      if (!data) {
        return {
          selectedIds: ['work_affaf', 'family_spending', 'sleep_worship', 'smile_sadaqah'],
          lastPledgedDate: todayStr,
          totalPledgesCount: 4
        };
      }
      const parsed = JSON.parse(data);
      return {
        selectedIds: Array.isArray(parsed.selectedIds) ? parsed.selectedIds : [],
        lastPledgedDate: parsed.lastPledgedDate || todayStr,
        totalPledgesCount: Number(parsed.totalPledgesCount) || 0
      };
    } catch {
      return {
        selectedIds: ['work_affaf', 'family_spending'],
        lastPledgedDate: todayStr,
        totalPledgesCount: 2
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
    const todayStr = new Date().toISOString().split('T')[0];
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
  }
};

