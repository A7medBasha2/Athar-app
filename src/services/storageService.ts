import { 
  AppSettings, Bookmark, LastRead, LastAudioPosition, 
  AdhkarProgressState, AdhkarStats, AdhkarBadge,
  QuranKhatmahState, PrayerTimesData, AyahItem, AdhkarCategory,
  DailyWirdConfig, TasbihState, TasbihDhikr
} from '../types';
import { DEFAULT_COORDINATES } from '../data/citiesData';

const SETTINGS_KEY = 'athar_settings_v1';
const BOOKMARKS_KEY = 'athar_bookmarks_v1';
const LAST_READ_KEY = 'athar_last_read_v1';
const LAST_AUDIO_KEY = 'athar_last_audio_v1';
const SURAH_POSITIONS_KEY = 'athar_surah_positions_v1';
const ADHKAR_PROGRESS_KEY = 'athar_adhkar_progress_v1';
const ADHKAR_COUNTS_KEY = 'athar_adhkar_counts_v1';
const ADHKAR_STATS_KEY = 'athar_adhkar_stats_v1';
const QURAN_KHATMAH_KEY = 'athar_quran_khatmah_v1';
const DAILY_WIRD_KEY = 'athar_daily_wird_v1';
const TASBIH_KEY = 'athar_tasbih_state_v1';
const RECENT_VERSES_KEY = 'athar_recent_verses_v1';
const PRAYER_CACHE_KEY = 'athar_cached_prayers_v1';
const SURAH_CACHE_PREFIX = 'athar_cached_surah_';

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'ar',
  calculationMethod: '5', // Egyptian General Authority of Survey (default as requested)
  location: DEFAULT_COORDINATES,
  adhanEnabled: true,
  adhanVoice: 'alafasy',
  adhanVibrate: true,
  selectedReciterId: 'alafasy', // Sheikh Mishari Rashid Al-Afasy
  quranVerseReminder: {
    enabled: true,
    frequency: '2h', // Default every 2 hours
    startTime: '08:00',
    endTime: '22:00',
    mode: 'notification_and_sound'
  },
  salawatReminder: {
    enabled: true,
    frequency: '1h', // Default every 1 hour
    startTime: '08:00',
    endTime: '22:00',
    mode: 'notification_and_sound'
  },
  dailyWirdReminder: {
    enabled: true,
    frequency: 'daily',
    startTime: '19:00',
    endTime: '22:00',
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
      return { ...DEFAULT_SETTINGS, ...parsed };
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

  clearAllData(): void {
    localStorage.clear();
  }
};

