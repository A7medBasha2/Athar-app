import { DEFAULT_COORDINATES } from "../data/citiesData";
import { VERIFIED_DHIKR_REMINDERS } from "../data/dhikrRemindersData";
import { NativePermissionsBridge } from "./nativePermissionsBridge";
import { STANDARD_WASIYYAH_PREAMBLE } from "../data/sakinaAndRightsData";
import { GamificationService } from "./gamificationService";
import { auth } from "../firebase";

export const DEFAULT_SUNAN_DETAILS = {
  fajr_before: false,
  dhuhr_before_1: false,
  dhuhr_before_2: false,
  dhuhr_after: false,
  maghrib_after: false,
  isha_after: false,
};

export const DEFAULT_PRAYERS_ADHAN_CONFIG = {
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

export const USER_ACTIVITY_KEYS = [
  BOOKMARKS_KEY,
  LAST_READ_KEY,
  LAST_AUDIO_KEY,
  SURAH_POSITIONS_KEY,
  ADHKAR_PROGRESS_KEY,
  ADHKAR_STATS_KEY,
  LAST_ADHKAR_READ_KEY,
  LAST_ADHKAR_AUDIO_KEY,
  QURAN_KHATMAH_KEY,
  PRAYER_ACHIEVEMENTS_KEY,
  DAILY_WIRD_KEY,
  TASBIH_KEY,
  SADAQAH_KEY,
  FASTING_KEY,
  TADABBUR_KEY,
  KINSHIP_KEY,
  INTENTIONS_KEY,
  RIGHTS_WASAYA_KEY,
  'athar_gamification_ledger_v1',
  'athar_unlocked_badges_v1',
];

export function getCurrentStorageUid(explicitUid?: string): string {
  if (explicitUid && explicitUid.trim()) return explicitUid.trim();
  try {
    const user = auth?.currentUser;
    if (user && !user.isAnonymous && user.uid) {
      return user.uid;
    }
  } catch {}
  return 'guest';
}

export function getScopedKey(baseKey: string, explicitUid?: string): string {
  const uid = getCurrentStorageUid(explicitUid);
  if (uid === 'guest') {
    return baseKey;
  }
  return `${baseKey}_${uid}`;
}

export function migrateGuestDataToUser(targetUid: string): void {
  if (!targetUid || targetUid === 'guest' || targetUid === 'guest_user') return;
  try {
    for (const baseKey of USER_ACTIVITY_KEYS) {
      const guestRaw = localStorage.getItem(baseKey);
      if (!guestRaw) continue;

      const userKey = `${baseKey}_${targetUid}`;
      const existingUserRaw = localStorage.getItem(userKey);

      if (!existingUserRaw) {
        localStorage.setItem(userKey, guestRaw);
      } else {
        try {
          const guestVal = JSON.parse(guestRaw);
          const userVal = JSON.parse(existingUserRaw);
          if (Array.isArray(guestVal) && Array.isArray(userVal)) {
            const seenIds = new Set(userVal.map((item: any) => item?.id || JSON.stringify(item)));
            const merged = [...userVal];
            for (const gItem of guestVal) {
              const id = gItem?.id || JSON.stringify(gItem);
              if (!seenIds.has(id)) {
                merged.push(gItem);
                seenIds.add(id);
              }
            }
            localStorage.setItem(userKey, JSON.stringify(merged));
          } else if (typeof guestVal === 'object' && typeof userVal === 'object' && guestVal && userVal) {
            const mergedObj = { ...userVal };
            for (const [k, v] of Object.entries(guestVal)) {
              if (typeof v === 'number' && typeof userVal[k] === 'number') {
                mergedObj[k] = Math.max(userVal[k], v);
              } else if (Array.isArray(v) && Array.isArray(userVal[k])) {
                mergedObj[k] = Array.from(new Set([...userVal[k], ...v]));
              }
            }
            localStorage.setItem(userKey, JSON.stringify(mergedObj));
          }
        } catch {}
      }
      localStorage.removeItem(baseKey);
    }
  } catch (err) {
    console.warn('Failed to migrate guest data to user:', err);
  }
}

export const DEFAULT_SETTINGS: any = {
  language: 'ar',
  calculationMethod: '5',
  location: DEFAULT_COORDINATES,
  adhanEnabled: true,
  adhanVoice: 'alafasy',
  adhanVibrate: true,
  adhanMode: 'full',
  duaAfterAdhanEnabled: true,
  prayersAdhanConfig: DEFAULT_PRAYERS_ADHAN_CONFIG,
  iqamahSettings: {
    enabled: true,
    defaultMinutes: 15,
    maghribMinutes: 10,
    soundEnabled: true,
    offsets: { fajr: 20, dhuhr: 15, asr: 15, maghrib: 10, isha: 15 },
  },
  dailyContentSettings: {
    autoRotate: true,
    rotationHour: 0,
    customHourTime: '00:00',
    rotationFrequency: 'daily',
    currentVerseIndex: 0,
    currentHadithIndex: 0,
    lastRotatedKey: '',
  },
  selectedReciterId: 'alafasy',
  quranVerseReminder: {
    enabled: true,
    frequency: '2h',
    startTime: '00:00',
    endTime: '23:59',
    mode: 'notification_and_sound',
    reciterId: 'alafasy',
  },
  salawatReminder: {
    enabled: true,
    frequency: '1h',
    startTime: '00:00',
    endTime: '23:59',
    mode: 'notification_and_sound',
    enabledDhikrIds: VERIFIED_DHIKR_REMINDERS.map((a) => a.id),
  },
  dhikrReminder: {
    enabled: true,
    frequency: '1h',
    startTime: '00:00',
    endTime: '23:59',
    mode: 'notification_and_sound',
    selectionMode: 'rotate',
    selectedDhikrIds: [],
    currentIndex: 0,
  },
  dailyWirdReminder: {
    enabled: true,
    frequency: '4h',
    startTime: '00:00',
    endTime: '23:59',
    mode: 'notification_and_sound',
  },
  parentsReminder: {
    enabled: true,
    frequency: 'daily',
    startTime: '00:00',
    endTime: '23:59',
    mode: 'notification_and_sound',
  },
  dailyWirdConfig: {
    enabled: true,
    type: 'surahs',
    targetCount: 1,
    completedTodayCount: 0,
    completedSurahsToday: [],
    lastActiveDate: '',
  },
  quietHours: { enabled: true, startTime: '23:00', endTime: '07:00' },
  artwork: {
    enabled: true,
    rotationInterval: 'daily',
    opacity: 0.08,
    currentArtworkId: 'girih_islamic_tessellation',
  },
  hasCompletedOnboarding: false,
  fontSizeMultiplier: 1.15,
  autoResumeOnInterruption: true,
};

function getLocalDateKey(a = new Date()) {
  return `${a.getFullYear()}-${String(a.getMonth() + 1).padStart(2, '0')}-${String(a.getDate()).padStart(2, '0')}`;
}

function getLocalYesterdayDateKey(a = new Date()) {
  return getLocalDateKey(new Date(a.getFullYear(), a.getMonth(), a.getDate() - 1));
}

let cachedSettings: any = null;

export const StorageService: any = {
  getCurrentStorageUid,
  getScopedKey,
  migrateGuestDataToUser,

  getSettings(explicitUid?: string) {
    if (cachedSettings && !explicitUid) return cachedSettings;
    try {
      const key = getScopedKey(SETTINGS_KEY, explicitUid);
      const raw = localStorage.getItem(key) || localStorage.getItem(SETTINGS_KEY);
      if (!raw) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(raw);
      const loc = parsed.location || DEFAULT_COORDINATES;
      const mergedLoc = {
        ...DEFAULT_COORDINATES,
        ...loc,
        district: loc.district || DEFAULT_COORDINATES.district || 'وسط البلد',
        formattedLocation:
          loc.formattedLocation ||
          (loc.district && loc.city && !loc.city.includes(loc.district)
            ? `${loc.city} - ${loc.district}`
            : loc.city || DEFAULT_COORDINATES.formattedLocation || 'القاهرة - وسط البلد'),
      };
      const merged = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        language: 'ar',
        location: mergedLoc,
        iqamahSettings: {
          ...DEFAULT_SETTINGS.iqamahSettings,
          ...parsed.iqamahSettings || {},
          offsets: { ...DEFAULT_SETTINGS.iqamahSettings.offsets, ...parsed.iqamahSettings?.offsets || {} },
        },
        dailyContentSettings: { ...DEFAULT_SETTINGS.dailyContentSettings, ...parsed.dailyContentSettings || {} },
        quranVerseReminder: { ...DEFAULT_SETTINGS.quranVerseReminder, ...parsed.quranVerseReminder || {} },
        salawatReminder: {
          ...DEFAULT_SETTINGS.salawatReminder,
          ...parsed.salawatReminder || {},
          enabledDhikrIds:
            parsed.salawatReminder?.enabledDhikrIds && parsed.salawatReminder.enabledDhikrIds.length > 0
              ? parsed.salawatReminder.enabledDhikrIds
              : DEFAULT_SETTINGS.salawatReminder.enabledDhikrIds,
        },
        dhikrReminder: { ...DEFAULT_SETTINGS.dhikrReminder, ...parsed.dhikrReminder || {} },
        dailyWirdReminder: { ...DEFAULT_SETTINGS.dailyWirdReminder, ...parsed.dailyWirdReminder || {} },
        parentsReminder: { ...DEFAULT_SETTINGS.parentsReminder, ...parsed.parentsReminder || {} },
        quietHours: { ...DEFAULT_SETTINGS.quietHours, ...parsed.quietHours || {} },
        prayersAdhanConfig: {
          ...DEFAULT_PRAYERS_ADHAN_CONFIG,
          ...parsed.prayersAdhanConfig || {},
          fajr: { ...DEFAULT_PRAYERS_ADHAN_CONFIG.fajr, ...parsed.prayersAdhanConfig?.fajr || {} },
          dhuhr: { ...DEFAULT_PRAYERS_ADHAN_CONFIG.dhuhr, ...parsed.prayersAdhanConfig?.dhuhr || {} },
          asr: { ...DEFAULT_PRAYERS_ADHAN_CONFIG.asr, ...parsed.prayersAdhanConfig?.asr || {} },
          maghrib: { ...DEFAULT_PRAYERS_ADHAN_CONFIG.maghrib, ...parsed.prayersAdhanConfig?.maghrib || {} },
          isha: { ...DEFAULT_PRAYERS_ADHAN_CONFIG.isha, ...parsed.prayersAdhanConfig?.isha || {} },
        },
      };
      if (!explicitUid) cachedSettings = merged;
      return merged;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  getPrayersAdhanConfig(explicitUid?: string) {
    return this.getSettings(explicitUid).prayersAdhanConfig || DEFAULT_PRAYERS_ADHAN_CONFIG;
  },

  savePrayersAdhanConfig(a: any, explicitUid?: string) {
    const d = { ...this.getSettings(explicitUid), prayersAdhanConfig: a };
    this.saveSettings(d, explicitUid);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('athar_adhan_config_changed', { detail: a }));
    }
  },

  resetPrayersAdhanConfig(explicitUid?: string) {
    this.savePrayersAdhanConfig(DEFAULT_PRAYERS_ADHAN_CONFIG, explicitUid);
  },

  togglePrayerAdhan(a: string, explicitUid?: string) {
    const d = this.getPrayersAdhanConfig(explicitUid);
    const f = d[a] || { enabled: true };
    const h = !f.enabled;
    const g = { ...d, [a]: { ...f, enabled: h } };
    this.savePrayersAdhanConfig(g, explicitUid);
    return h;
  },

  saveSettings(a: any, explicitUid?: string) {
    if (!explicitUid) cachedSettings = a;
    try {
      const key = getScopedKey(SETTINGS_KEY, explicitUid);
      localStorage.setItem(key, JSON.stringify(a));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  },

  getBookmarks(explicitUid?: string) {
    try {
      const key = getScopedKey(BOOKMARKS_KEY, explicitUid);
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  addBookmark(a: any, explicitUid?: string) {
    const list = this.getBookmarks(explicitUid).filter(
      (d: any) => d.surahNumber !== a.surahNumber || d.ayahNumber !== a.ayahNumber
    );
    list.unshift(a);
    try {
      const key = getScopedKey(BOOKMARKS_KEY, explicitUid);
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to save bookmark:', e);
    }
  },

  removeBookmark(a: number, d: number, explicitUid?: string) {
    const list = this.getBookmarks(explicitUid).filter(
      (f: any) => f.surahNumber !== a || f.ayahNumber !== d
    );
    try {
      const key = getScopedKey(BOOKMARKS_KEY, explicitUid);
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to remove bookmark:', e);
    }
  },

  getLastRead(explicitUid?: string) {
    try {
      const key = getScopedKey(LAST_READ_KEY, explicitUid);
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  saveLastRead(a: any, explicitUid?: string) {
    try {
      const key = getScopedKey(LAST_READ_KEY, explicitUid);
      localStorage.setItem(key, JSON.stringify(a));
      this.saveSurahReadingPosition(a.surahNumber, a.ayahNumber, explicitUid);
    } catch (e) {
      console.warn('Failed to save last read:', e);
    }
  },

  getSurahReadingPosition(a: number, explicitUid?: string) {
    try {
      const key = getScopedKey(SURAH_POSITIONS_KEY, explicitUid);
      const raw = localStorage.getItem(key);
      return (raw && JSON.parse(raw)[a]) || 1;
    } catch {
      return 1;
    }
  },

  saveSurahReadingPosition(a: number, d: number, explicitUid?: string) {
    try {
      const key = getScopedKey(SURAH_POSITIONS_KEY, explicitUid);
      const raw = localStorage.getItem(key);
      const obj = raw ? JSON.parse(raw) : {};
      obj[a] = d;
      localStorage.setItem(key, JSON.stringify(obj));
    } catch (e) {
      console.warn('Failed to save surah reading position:', e);
    }
  },

  getLastAudioPosition(explicitUid?: string) {
    try {
      const key = getScopedKey(LAST_AUDIO_KEY, explicitUid);
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  saveLastAudioPosition(a: any, explicitUid?: string) {
    try {
      const key = getScopedKey(LAST_AUDIO_KEY, explicitUid);
      localStorage.setItem(key, JSON.stringify(a));
    } catch (e) {
      console.warn('Failed to save last audio position:', e);
    }
  },

  getDhikrCounts(a: string, explicitUid?: string) {
    try {
      const key = getScopedKey(`${ADHKAR_COUNTS_KEY}_${a}`, explicitUid);
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  setDhikrCount(a: string, d: string, f: number, explicitUid?: string) {
    try {
      const obj = this.getDhikrCounts(a, explicitUid);
      obj[d] = f;
      const key = getScopedKey(`${ADHKAR_COUNTS_KEY}_${a}`, explicitUid);
      localStorage.setItem(key, JSON.stringify(obj));
    } catch (e) {
      console.warn('Failed to set dhikr count:', e);
    }
  },

  resetCategoryCounts(a: string, explicitUid?: string) {
    try {
      const key = getScopedKey(`${ADHKAR_COUNTS_KEY}_${a}`, explicitUid);
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('Failed to reset dhikr counts:', e);
    }
  },

  getAdhkarProgress(explicitUid?: string) {
    try {
      const key = getScopedKey(ADHKAR_PROGRESS_KEY, explicitUid);
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  saveAdhkarProgress(a: any, explicitUid?: string) {
    try {
      const key = getScopedKey(ADHKAR_PROGRESS_KEY, explicitUid);
      localStorage.setItem(key, JSON.stringify(a));
    } catch (e) {
      console.warn('Failed to save adhkar progress:', e);
    }
  },

  getLastAdhkarRead(explicitUid?: string) {
    try {
      const key = getScopedKey(LAST_ADHKAR_READ_KEY, explicitUid);
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  saveLastAdhkarRead(a: any, explicitUid?: string) {
    try {
      const key = getScopedKey(LAST_ADHKAR_READ_KEY, explicitUid);
      localStorage.setItem(key, JSON.stringify(a));
    } catch (e) {
      console.warn('Failed to save last adhkar read:', e);
    }
  },

  getLastAdhkarAudio(explicitUid?: string) {
    try {
      const key = getScopedKey(LAST_ADHKAR_AUDIO_KEY, explicitUid);
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  saveLastAdhkarAudio(a: any, explicitUid?: string) {
    try {
      const key = getScopedKey(LAST_ADHKAR_AUDIO_KEY, explicitUid);
      localStorage.setItem(key, JSON.stringify(a));
    } catch (e) {
      console.warn('Failed to save last adhkar audio:', e);
    }
  },

  getAdhkarStats(explicitUid?: string) {
    const today = getLocalDateKey();
    const honestDefault = {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: today,
      totalDhikrRecited: 0,
      todayDhikrCount: 0,
      morningCompletedToday: false,
      eveningCompletedToday: false,
      totalMorningSessions: 0,
      totalEveningSessions: 0,
      unlockedBadgeIds: [],
    };

    try {
      const key = getScopedKey(ADHKAR_STATS_KEY, explicitUid);
      const raw = localStorage.getItem(key);
      if (!raw) return honestDefault;

      const stats = JSON.parse(raw);
      if (stats.lastActiveDate !== today) {
        const yesterday = getLocalYesterdayDateKey();
        if (stats.lastActiveDate !== yesterday) {
          stats.currentStreak = 0;
        }
        stats.todayDhikrCount = 0;
        stats.morningCompletedToday = false;
        stats.eveningCompletedToday = false;
        stats.lastActiveDate = today;
        this.resetCategoryCounts('morning', explicitUid);
        this.resetCategoryCounts('evening', explicitUid);
        const progressKey = getScopedKey(ADHKAR_PROGRESS_KEY, explicitUid);
        localStorage.removeItem(progressKey);
        localStorage.setItem(key, JSON.stringify(stats));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('athar_adhkar_updated', { detail: stats }));
          window.dispatchEvent(new CustomEvent('athar_impact_updated'));
        }
      }
      return stats;
    } catch {
      return honestDefault;
    }
  },

  recordDhikrStep(a: string, d: number, f: number, explicitUid?: string) {
    const stats = this.getAdhkarStats(explicitUid);
    const today = getLocalDateKey();
    const yesterday = getLocalYesterdayDateKey();

    if (stats.lastActiveDate === yesterday) {
      stats.currentStreak = Math.max(1, stats.currentStreak + 1);
      if (stats.currentStreak > stats.longestStreak) stats.longestStreak = stats.currentStreak;
    } else if (stats.lastActiveDate !== today || stats.currentStreak === 0) {
      stats.currentStreak = 1;
      if (stats.longestStreak < 1) stats.longestStreak = 1;
    }
    stats.lastActiveDate = today;
    stats.totalDhikrRecited += 1;
    stats.todayDhikrCount += 1;

    const badges = new Set(stats.unlockedBadgeIds || []);
    badges.add('first_dhikr');
    if (stats.currentStreak >= 3) badges.add('streak_3');
    if (stats.currentStreak >= 7) badges.add('streak_7');
    if (stats.totalDhikrRecited >= 100) badges.add('hundred_club');
    if (stats.totalDhikrRecited >= 1000) badges.add('thousand_club');
    stats.unlockedBadgeIds = Array.from(badges);

    this.saveAdhkarStats(stats, explicitUid);
    return stats;
  },

  recordSessionCompleted(a: 'morning' | 'evening', explicitUid?: string) {
    const stats = this.getAdhkarStats(explicitUid);
    if (a === 'morning') {
      stats.morningCompletedToday = true;
      stats.totalMorningSessions = (stats.totalMorningSessions || 0) + 1;
    } else {
      stats.eveningCompletedToday = true;
      stats.totalEveningSessions = (stats.totalEveningSessions || 0) + 1;
    }
    if (stats.currentStreak === 0) {
      stats.currentStreak = 1;
      if (stats.longestStreak < 1) stats.longestStreak = 1;
    }

    const badges = new Set(stats.unlockedBadgeIds || []);
    if (a === 'morning') badges.add('morning_guard');
    if (a === 'evening') badges.add('evening_guard');
    if (stats.morningCompletedToday && stats.eveningCompletedToday) badges.add('both_wards');
    stats.unlockedBadgeIds = Array.from(badges);

    this.saveAdhkarStats(stats, explicitUid);
    try {
      GamificationService.recordActivity(
        a === 'morning' ? 'adhkar_morning' : 'adhkar_evening',
        undefined,
        explicitUid
      );
    } catch {}
    return stats;
  },

  resetSessionCompleted(a: 'morning' | 'evening', explicitUid?: string) {
    const stats = this.getAdhkarStats(explicitUid);
    if (a === 'morning') stats.morningCompletedToday = false;
    else stats.eveningCompletedToday = false;
    return this.saveAdhkarStats(stats, explicitUid);
  },

  saveAdhkarStats(a: any, explicitUid?: string) {
    try {
      const key = getScopedKey(ADHKAR_STATS_KEY, explicitUid);
      localStorage.setItem(key, JSON.stringify(a));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('athar_adhkar_updated', { detail: a }));
        window.dispatchEvent(new CustomEvent('athar_impact_updated'));
      }
    } catch (e) {
      console.warn('Failed to save adhkar stats:', e);
    }
    return a;
  },

  getQuranKhatmah(explicitUid?: string) {
    const today = getLocalDateKey();
    const honestDefault = {
      khatmahNumber: 1,
      completedSurahs: [],
      totalAyahsReadToday: 0,
      todayMinutesListened: 0,
      totalAyahsReadOverall: 0,
      totalMinutesListenedOverall: 0,
      lastActiveDate: today,
      dailyGoalAyahs: 25,
      readingStreakDays: 0,
      khatmahStartDate: today,
    };

    try {
      const key = getScopedKey(QURAN_KHATMAH_KEY, explicitUid);
      const raw = localStorage.getItem(key);
      if (!raw) return honestDefault;

      const state = JSON.parse(raw);
      if (state.lastActiveDate !== today) {
        const yesterday = getLocalYesterdayDateKey();
        if (state.lastActiveDate !== yesterday) {
          state.readingStreakDays = 0;
        }
        state.totalAyahsReadToday = 0;
        state.todayMinutesListened = 0;
        state.lastActiveDate = today;
        this.saveQuranKhatmah(state, explicitUid);
      }
      return state;
    } catch {
      return honestDefault;
    }
  },

  saveQuranKhatmah(a: any, explicitUid?: string) {
    try {
      const key = getScopedKey(QURAN_KHATMAH_KEY, explicitUid);
      localStorage.setItem(key, JSON.stringify(a));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('athar_khatmah_updated', { detail: a }));
        window.dispatchEvent(new CustomEvent('athar_impact_updated'));
      }
    } catch (e) {
      console.warn('Failed to save quran khatmah:', e);
    }
  },

  recordAyahRead(a: number, d = 1, explicitUid?: string) {
    const khatmah = this.getQuranKhatmah(explicitUid);
    khatmah.totalAyahsReadToday += d;
    khatmah.totalAyahsReadOverall += d;
    if (khatmah.readingStreakDays === 0) khatmah.readingStreakDays = 1;
    this.saveQuranKhatmah(khatmah, explicitUid);
    return khatmah;
  },

  recordMinutesListened(a: number, explicitUid?: string) {
    const khatmah = this.getQuranKhatmah(explicitUid);
    khatmah.todayMinutesListened += a;
    khatmah.totalMinutesListenedOverall += a;
    if (khatmah.readingStreakDays === 0) khatmah.readingStreakDays = 1;
    this.saveQuranKhatmah(khatmah, explicitUid);
    if (khatmah.todayMinutesListened >= 10) {
      try {
        GamificationService.recordActivity('quran_audio_session', undefined, explicitUid);
      } catch {}
    }
    return khatmah;
  },

  recordSecondsListened(a: number, explicitUid?: string) {
    const bufferKey = getScopedKey('athar_seconds_listened_buffer', explicitUid);
    let buffer = 0;
    try {
      buffer = Number(localStorage.getItem(bufferKey) || '0');
    } catch {}
    const total = buffer + a;
    if (total >= 60) {
      const minutes = Math.floor(total / 60);
      const remainder = total % 60;
      try {
        localStorage.setItem(bufferKey, String(remainder));
      } catch {}
      return this.recordMinutesListened(minutes, explicitUid);
    } else {
      try {
        localStorage.setItem(bufferKey, String(total));
      } catch {}
      const khatmah = this.getQuranKhatmah(explicitUid);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('athar_khatmah_updated', { detail: khatmah }));
      }
      return khatmah;
    }
  },

  getPrayerAchievements(explicitUid?: string) {
    const today = getLocalDateKey();
    const honestDefault = {
      streakDays: 0,
      longestStreak: 0,
      totalPrayersLogged: 0,
      todayPrayers: {
        fajr: false,
        dhuhr: false,
        asr: false,
        maghrib: false,
        isha: false,
        sunan: false,
        qiyam: false,
      },
      todaySunanDetails: { ...DEFAULT_SUNAN_DETAILS },
      lastActiveDate: today,
      unlockedBadgeIds: [],
    };

    try {
      const key = getScopedKey(PRAYER_ACHIEVEMENTS_KEY, explicitUid);
      const raw = localStorage.getItem(key);
      if (!raw) return honestDefault;

      const state = JSON.parse(raw);
      if (state.lastActiveDate !== today) {
        const yesterday = getLocalYesterdayDateKey();
        const didPrayYesterday = Object.values(state.todayPrayers || {}).some(Boolean);
        if (state.lastActiveDate === yesterday && didPrayYesterday) {
          state.streakDays += 1;
          if (state.streakDays > state.longestStreak) state.longestStreak = state.streakDays;
        } else if (state.lastActiveDate !== yesterday) {
          state.streakDays = 0;
        }
        state.todayPrayers = {
          fajr: false,
          dhuhr: false,
          asr: false,
          maghrib: false,
          isha: false,
          sunan: false,
          qiyam: false,
        };
        state.todaySunanDetails = { ...DEFAULT_SUNAN_DETAILS };
        state.lastActiveDate = today;
        this.savePrayerAchievements(state, explicitUid);
      } else {
        state.todaySunanDetails = { ...DEFAULT_SUNAN_DETAILS, ...state.todaySunanDetails || {} };
      }
      return state;
    } catch {
      return honestDefault;
    }
  },

  toggleSunanSlot(a: string, explicitUid?: string) {
    const state = this.getPrayerAchievements(explicitUid);
    state.todaySunanDetails = state.todaySunanDetails || { ...DEFAULT_SUNAN_DETAILS };
    const nextVal = !state.todaySunanDetails[a];
    state.todaySunanDetails[a] = nextVal;
    state.todayPrayers.sunan = Object.values(state.todaySunanDetails).some(Boolean);

    const badges = new Set(state.unlockedBadgeIds || []);
    if (state.todayPrayers.sunan) badges.add('sunan_reviver');
    state.unlockedBadgeIds = Array.from(badges);

    this.savePrayerAchievements(state, explicitUid);
    if (nextVal) {
      try {
        GamificationService.recordActivity('prayer_sunnah', undefined, explicitUid);
      } catch {}
    }
    return state;
  },

  savePrayerAchievements(a: any, explicitUid?: string) {
    try {
      const key = getScopedKey(PRAYER_ACHIEVEMENTS_KEY, explicitUid);
      localStorage.setItem(key, JSON.stringify(a));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('athar_prayers_updated', { detail: a }));
        window.dispatchEvent(new CustomEvent('athar_impact_updated'));
      }
    } catch (e) {
      console.warn('Failed to save prayer achievements:', e);
    }
  },

  isPrayerTimeArrived(a: string) {
    const names: Record<string, string> = {
      fajr: 'صلاة الفجر',
      dhuhr: 'صلاة الظهر',
      asr: 'صلاة العصر',
      maghrib: 'صلاة المغرب',
      isha: 'صلاة العشاء',
      sunan: 'السنن الرواتب',
      qiyam: 'قيام الليل والوتر',
    };
    const prayerNameArabic = names[a] || 'الصلاة';
    const cached = this.getCachedPrayers();
    if (!cached?.timings) return { arrived: true, prayerTimeStr: '', prayerNameArabic };

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const parseMins = (str?: string) => {
      if (!str) return null;
      const m = str.split(' ')[0].trim().match(/(\d{1,2}):(\d{1,2})/);
      if (!m) return null;
      let h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      if ((str.includes('م') || str.toUpperCase().includes('PM')) && h < 12) h += 12;
      return h * 60 + min;
    };

    const formatStr = (str?: string) => {
      if (!str) return '';
      const parts = str.split(' ')[0].trim().split(':');
      let h = parseInt(parts[0], 10);
      const min = parts[1];
      if (isNaN(h)) return str;
      const isPm = h >= 12;
      h = h % 12;
      if (h === 0) h = 12;
      return `${h}:${min} ${isPm ? 'م' : 'ص'}`;
    };

    if (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].includes(a)) {
      const timingStr = cached.timings[a];
      const mins = parseMins(timingStr);
      return mins === null
        ? { arrived: true, prayerTimeStr: '', prayerNameArabic }
        : { arrived: currentMins >= mins, prayerTimeStr: formatStr(timingStr), prayerNameArabic };
    }
    return { arrived: true, prayerTimeStr: '', prayerNameArabic };
  },

  toggleTodayPrayer(a: string, explicitUid?: string) {
    const state = this.getPrayerAchievements(explicitUid);
    if (state.todayPrayers[a] || !this.isPrayerTimeArrived(a).arrived) return state;

    state.todayPrayers[a] = true;
    state.totalPrayersLogged += 1;
    if (state.streakDays === 0) {
      state.streakDays = 1;
      if (state.longestStreak < 1) state.longestStreak = 1;
    }

    const badges = new Set(state.unlockedBadgeIds || []);
    if (state.todayPrayers.fajr) badges.add('fajr_guardian');
    if (
      state.todayPrayers.fajr &&
      state.todayPrayers.dhuhr &&
      state.todayPrayers.asr &&
      state.todayPrayers.maghrib &&
      state.todayPrayers.isha
    ) {
      badges.add('five_daily');
    }
    if (state.todayPrayers.sunan) badges.add('sunan_reviver');
    if (state.todayPrayers.qiyam) badges.add('qiyam_light');
    if (state.streakDays >= 3) badges.add('streak_3_prayers');
    if (state.streakDays >= 7) badges.add('streak_7_prayers');
    if (state.totalPrayersLogged >= 50) badges.add('prayers_50');
    state.unlockedBadgeIds = Array.from(badges);

    this.savePrayerAchievements(state, explicitUid);
    try {
      GamificationService.recordActivity(`prayer_${a}` as any, undefined, explicitUid);
      if (
        state.todayPrayers.fajr &&
        state.todayPrayers.dhuhr &&
        state.todayPrayers.asr &&
        state.todayPrayers.maghrib &&
        state.todayPrayers.isha
      ) {
        GamificationService.recordActivity('streak_bonus', undefined, explicitUid);
      }
    } catch {}
    return state;
  },

  togglePrayerCompleted(a: string, explicitUid?: string) {
    return this.toggleTodayPrayer(a, explicitUid);
  },

  toggleSurahCompletedInKhatmah(a: number, explicitUid?: string) {
    const khatmah = this.getQuranKhatmah(explicitUid);
    const surahs = new Set(khatmah.completedSurahs || []);
    if (surahs.has(a)) surahs.delete(a);
    else surahs.add(a);
    khatmah.completedSurahs = Array.from(surahs);
    this.saveQuranKhatmah(khatmah, explicitUid);
    return khatmah;
  },

  resetKhatmah(explicitUid?: string) {
    const khatmah = this.getQuranKhatmah(explicitUid);
    const dateStr = new Date().toISOString().split('T')[0];
    const nextState = {
      ...khatmah,
      khatmahNumber: khatmah.khatmahNumber + 1,
      completedSurahs: [],
      totalAyahsReadToday: 0,
      todayMinutesListened: 0,
      khatmahStartDate: dateStr,
      lastActiveDate: dateStr,
    };
    this.saveQuranKhatmah(nextState, explicitUid);
    return nextState;
  },

  getRecentVersesHistory(explicitUid?: string) {
    try {
      const key = getScopedKey(RECENT_VERSES_KEY, explicitUid);
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  pushRecentVerse(a: any, explicitUid?: string) {
    const list = this.getRecentVersesHistory(explicitUid).filter((d: any) => d !== a);
    list.push(a);
    if (list.length > 50) list.shift();
    try {
      const key = getScopedKey(RECENT_VERSES_KEY, explicitUid);
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to push recent verse:', e);
    }
  },

  getCachedPrayers() {
    try {
      const raw = localStorage.getItem(PRAYER_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setCachedPrayers(a: any) {
    try {
      localStorage.setItem(PRAYER_CACHE_KEY, JSON.stringify(a));
    } catch (e) {
      console.warn('Failed to cache prayers:', e);
    }
  },

  getCachedSurah(a: number) {
    try {
      const raw = localStorage.getItem(`${SURAH_CACHE_PREFIX}${a}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setCachedSurah(a: number, d: any) {
    try {
      localStorage.setItem(`${SURAH_CACHE_PREFIX}${a}`, JSON.stringify(d));
    } catch (e) {
      console.warn('Failed to cache surah:', e);
    }
  },

  getDailyWirdConfig(explicitUid?: string) {
    const today = getLocalDateKey();
    const honestDefault = {
      enabled: true,
      type: 'surahs',
      targetCount: 1,
      completedTodayCount: 0,
      completedSurahsToday: [],
      lastActiveDate: today,
    };

    try {
      const key = getScopedKey(DAILY_WIRD_KEY, explicitUid);
      const raw = localStorage.getItem(key);
      if (!raw) return honestDefault;

      const conf = JSON.parse(raw);
      if (conf.lastActiveDate !== today) {
        conf.completedTodayCount = 0;
        conf.completedSurahsToday = [];
        conf.lastActiveDate = today;
        this.saveDailyWirdConfig(conf, explicitUid);
      }
      return conf;
    } catch {
      return honestDefault;
    }
  },

  saveDailyWirdConfig(a: any, explicitUid?: string) {
    try {
      const key = getScopedKey(DAILY_WIRD_KEY, explicitUid);
      localStorage.setItem(key, JSON.stringify(a));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('athar_wird_updated', { detail: a }));
        window.dispatchEvent(new CustomEvent('athar_impact_updated'));
      }
    } catch (e) {
      console.warn('Failed to save daily wird config:', e);
    }
  },

  markSurahCompletedInWird(a: number, explicitUid?: string) {
    const conf = this.getDailyWirdConfig(explicitUid);
    if (!conf.completedSurahsToday.includes(a)) {
      conf.completedSurahsToday.push(a);
      conf.completedTodayCount = conf.completedSurahsToday.length;
      this.saveDailyWirdConfig(conf, explicitUid);
      this.toggleSurahCompletedInKhatmah(a, explicitUid);
      GamificationService.recordActivity('quran_daily_wird', undefined, explicitUid).catch(() => {});
    }
    return conf;
  },

  getDailyWird(explicitUid?: string) {
    return this.getDailyWirdConfig(explicitUid);
  },

  saveDailyWird(a: any, explicitUid?: string) {
    this.saveDailyWirdConfig(a, explicitUid);
  },

  getKhatmahState(explicitUid?: string) {
    return this.getQuranKhatmah(explicitUid);
  },

  getTasbihState(explicitUid?: string) {
    const today = getLocalDateKey();
    const lastDateKey = getScopedKey('athar_tasbih_last_date_v1', explicitUid);
    const honestDefault = {
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
        { id: 'open', name: 'تسبيح حر (مفتوح)', target: 0, currentCount: 0, totalCompleted: 0 },
      ],
      soundEnabled: true,
      vibrationEnabled: true,
      totalAllTime: 0,
    };

    try {
      const key = getScopedKey(TASBIH_KEY, explicitUid);
      const raw = localStorage.getItem(key);
      const lastDate = localStorage.getItem(lastDateKey);
      if (!raw) {
        localStorage.setItem(lastDateKey, today);
        return honestDefault;
      }
      const parsed = { ...honestDefault, ...JSON.parse(raw) };
      if (lastDate !== today) {
        parsed.items = (parsed.items || []).map((it: any) => ({ ...it, currentCount: 0 }));
        localStorage.setItem(lastDateKey, today);
        localStorage.setItem(key, JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return honestDefault;
    }
  },

  saveTasbihState(a: any, explicitUid?: string) {
    try {
      const key = getScopedKey(TASBIH_KEY, explicitUid);
      localStorage.setItem(key, JSON.stringify(a));
    } catch (e) {
      console.warn('Failed to save tasbih state:', e);
    }
  },

  incrementTasbih(a: string, explicitUid?: string) {
    const state = this.getTasbihState(explicitUid);
    const item = state.items.find((d: any) => d.id === a) || state.items[0];
    let completedLap = false;
    item.currentCount += 1;
    state.totalAllTime += 1;
    if (item.target > 0 && item.currentCount >= item.target) {
      completedLap = true;
      item.totalCompleted += 1;
      item.currentCount = 0;
    }
    this.saveTasbihState(state, explicitUid);
    this.recordDhikrStep('morning', 9999, 1, explicitUid);
    return { state, completedLap };
  },

  resetTasbih(a: string, explicitUid?: string) {
    const state = this.getTasbihState(explicitUid);
    const item = state.items.find((d: any) => d.id === a);
    if (item) {
      item.currentCount = 0;
      this.saveTasbihState(state, explicitUid);
    }
    return state;
  },

  addCustomTasbih(a: string, d: number, explicitUid?: string) {
    const state = this.getTasbihState(explicitUid);
    const id = `custom_${Date.now()}`;
    state.items.push({
      id,
      name: a,
      target: d,
      currentCount: 0,
      totalCompleted: 0,
      isCustom: true,
    });
    state.selectedDhikrId = id;
    this.saveTasbihState(state, explicitUid);
    return state;
  },

  deleteCustomTasbih(a: string, explicitUid?: string) {
    const state = this.getTasbihState(explicitUid);
    state.items = state.items.filter((d: any) => d.id !== a);
    if (state.selectedDhikrId === a) state.selectedDhikrId = 'subhanallah';
    this.saveTasbihState(state, explicitUid);
    return state;
  },

  getSadaqahRecords(explicitUid?: string) {
    try {
      const key = getScopedKey(SADAQAH_KEY, explicitUid);
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  addSadaqahRecord(a: number | string, d: string, f: string, explicitUid?: string) {
    const list = this.getSadaqahRecords(explicitUid);
    const nextList = [
      {
        id: `sadaqah_${Date.now()}`,
        amount: Math.max(0, Number(a) || 0),
        currency: d || 'ج.م',
        intention: f.trim() || 'صدقة في سبيل الله',
        date: new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }),
      },
      ...list,
    ];
    try {
      const key = getScopedKey(SADAQAH_KEY, explicitUid);
      localStorage.setItem(key, JSON.stringify(nextList));
    } catch (e) {
      console.warn('Failed to save sadaqah:', e);
    }
    try {
      GamificationService.recordActivity('sadaqah_deed', undefined, explicitUid);
    } catch {}
    return nextList;
  },

  deleteSadaqahRecord(a: string, explicitUid?: string) {
    const list = this.getSadaqahRecords(explicitUid).filter((d: any) => d.id !== a);
    try {
      const key = getScopedKey(SADAQAH_KEY, explicitUid);
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to delete sadaqah:', e);
    }
    return list;
  },

  getFastingTracker(explicitUid?: string) {
    try {
      const key = getScopedKey(FASTING_KEY, explicitUid);
      const raw = localStorage.getItem(key);
      if (!raw) return { fastedDates: [], totalFastedDays: 0 };
      const parsed = JSON.parse(raw);
      const dates = Array.isArray(parsed.fastedDates) ? parsed.fastedDates : [];
      return { fastedDates: dates, totalFastedDays: dates.length };
    } catch {
      return { fastedDates: [], totalFastedDays: 0 };
    }
  },

  toggleFastingDate(a?: string, explicitUid?: string) {
    const dateStr = a || new Date().toISOString().split('T')[0];
    const tracker = this.getFastingTracker(explicitUid);
    const nextDates = tracker.fastedDates.includes(dateStr)
      ? tracker.fastedDates.filter((d: string) => d !== dateStr)
      : [dateStr, ...tracker.fastedDates];
    const nextObj = { fastedDates: nextDates, totalFastedDays: nextDates.length };
    try {
      const key = getScopedKey(FASTING_KEY, explicitUid);
      localStorage.setItem(key, JSON.stringify(nextObj));
    } catch (e) {
      console.warn('Failed to save fasting tracker:', e);
    }
    return nextObj;
  },

  getTadabburProgress(explicitUid?: string) {
    const today = getLocalDateKey();
    try {
      const key = getScopedKey(TADABBUR_KEY, explicitUid);
      const raw = localStorage.getItem(key);
      if (!raw) return { completedSessionIds: [], lastCompletedDate: today, streakDays: 0 };

      const parsed = JSON.parse(raw);
      const lastDate = parsed.lastCompletedDate || '';
      if (lastDate && lastDate !== today) {
        const resetObj = {
          completedSessionIds: [],
          lastCompletedDate: today,
          streakDays: lastDate === getLocalYesterdayDateKey() ? Number(parsed.streakDays) || 0 : 0,
        };
        localStorage.setItem(key, JSON.stringify(resetObj));
        return resetObj;
      }
      return {
        completedSessionIds: Array.isArray(parsed.completedSessionIds) ? parsed.completedSessionIds : [],
        lastCompletedDate: lastDate || today,
        streakDays: Number(parsed.streakDays) || 0,
      };
    } catch {
      return { completedSessionIds: [], lastCompletedDate: today, streakDays: 0 };
    }
  },

  toggleTadabburSession(a: string, explicitUid?: string) {
    const prog = this.getTadabburProgress(explicitUid);
    const today = getLocalDateKey();
    const hasSession = prog.completedSessionIds.includes(a);
    let sessionIds: string[];
    let streak = prog.streakDays;

    if (hasSession) {
      sessionIds = prog.completedSessionIds.filter((d: string) => d !== a);
    } else {
      sessionIds = [...prog.completedSessionIds, a];
      if (prog.lastCompletedDate !== today || prog.streakDays === 0) {
        const yesterday = getLocalYesterdayDateKey();
        streak = prog.lastCompletedDate === yesterday ? prog.streakDays + 1 : Math.max(1, prog.streakDays);
      }
    }
    const nextObj = {
      completedSessionIds: sessionIds,
      lastCompletedDate: hasSession ? prog.lastCompletedDate : today,
      streakDays: streak,
    };
    try {
      const key = getScopedKey(TADABBUR_KEY, explicitUid);
      localStorage.setItem(key, JSON.stringify(nextObj));
    } catch (e) {
      console.warn('Failed to save tadabbur state:', e);
    }
    return nextObj;
  },

  getKinshipParentsState(explicitUid?: string) {
    try {
      const key = getScopedKey(KINSHIP_KEY, explicitUid);
      const raw = localStorage.getItem(key);
      return raw
        ? JSON.parse(raw)
        : {
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
                interactionCount: 0,
                notes: 'أحب الناس إليّ',
              },
            ],
          };
    } catch {
      return { fatherStatus: 'alive', motherStatus: 'alive', contacts: [] };
    }
  },

  saveKinshipParentsState(a: any, explicitUid?: string) {
    try {
      const key = getScopedKey(KINSHIP_KEY, explicitUid);
      localStorage.setItem(key, JSON.stringify(a));
    } catch (e) {
      console.warn('Failed to save kinship state:', e);
    }
  },

  addKinshipContact(a: any, explicitUid?: string) {
    const state = this.getKinshipParentsState(explicitUid);
    const nextContact = {
      ...a,
      id: 'kin_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      lastInteractionDate: new Date().toLocaleDateString('ar-EG'),
      interactionCount: 0,
    };
    state.contacts = [nextContact, ...state.contacts];
    this.saveKinshipParentsState(state, explicitUid);
    return nextContact;
  },

  deleteKinshipContact(a: string, explicitUid?: string) {
    const state = this.getKinshipParentsState(explicitUid);
    state.contacts = state.contacts.filter((d: any) => d.id !== a);
    this.saveKinshipParentsState(state, explicitUid);
  },

  recordKinshipInteraction(a: string, explicitUid?: string) {
    const state = this.getKinshipParentsState(explicitUid);
    const contact = state.contacts.find((d: any) => d.id === a);
    if (contact) {
      contact.interactionCount = (contact.interactionCount || 0) + 1;
      contact.lastInteractionDate = new Date().toLocaleDateString('ar-EG');
      this.saveKinshipParentsState(state, explicitUid);
    }
  },

  recordParentDua(a: 'father' | 'mother', explicitUid?: string) {
    const state = this.getKinshipParentsState(explicitUid);
    const dateStr = new Date().toLocaleDateString('ar-EG');
    if (a === 'father') state.fatherLastDuaDate = dateStr;
    if (a === 'mother') state.motherLastDuaDate = dateStr;
    this.saveKinshipParentsState(state, explicitUid);
    try {
      GamificationService.recordActivity('kinship_dua', undefined, explicitUid);
    } catch {}
  },

  getDailyIntentionsState(explicitUid?: string) {
    const today = getLocalDateKey();
    try {
      const key = getScopedKey(INTENTIONS_KEY, explicitUid);
      const raw = localStorage.getItem(key);
      if (!raw) return { selectedIds: [], lastPledgedDate: today, totalPledgesCount: 0 };
      const parsed = JSON.parse(raw);
      if (parsed.lastPledgedDate !== today) {
        const resetObj = { selectedIds: [], lastPledgedDate: today, totalPledgesCount: Number(parsed.totalPledgesCount) || 0 };
        localStorage.setItem(key, JSON.stringify(resetObj));
        return resetObj;
      }
      return {
        selectedIds: Array.isArray(parsed.selectedIds) ? parsed.selectedIds : [],
        lastPledgedDate: parsed.lastPledgedDate || today,
        totalPledgesCount: Number(parsed.totalPledgesCount) || 0,
      };
    } catch {
      return { selectedIds: [], lastPledgedDate: today, totalPledgesCount: 0 };
    }
  },

  saveDailyIntentionsState(a: any, explicitUid?: string) {
    try {
      const key = getScopedKey(INTENTIONS_KEY, explicitUid);
      localStorage.setItem(key, JSON.stringify(a));
    } catch (e) {
      console.warn('Failed to save intentions state:', e);
    }
  },

  toggleDailyIntention(a: string, explicitUid?: string) {
    const state = this.getDailyIntentionsState(explicitUid);
    const today = getLocalDateKey();
    const hasId = state.selectedIds.includes(a);
    const nextObj = {
      selectedIds: hasId ? state.selectedIds.filter((d: string) => d !== a) : [...state.selectedIds, a],
      lastPledgedDate: today,
      totalPledgesCount: hasId ? state.totalPledgesCount : state.totalPledgesCount + 1,
    };
    this.saveDailyIntentionsState(nextObj, explicitUid);
    return nextObj;
  },

  getRightsAndWasayaState(explicitUid?: string) {
    try {
      const key = getScopedKey(RIGHTS_WASAYA_KEY, explicitUid);
      const raw = localStorage.getItem(key);
      return raw
        ? JSON.parse(raw)
        : {
            records: [],
            wasiyyah: {
              authorName: '',
              preamble: STANDARD_WASIYYAH_PREAMBLE,
              customDirectives: 'أوصي بثلث تركتي صدقة جارية في كفالة الأيتام وسقيا الماء، وأوصي أبنائي بالصلاة والبر فيما بينهم.',
              bequestOneThirdNotes: 'ثلث التركة في أوجه البر',
              witnesses: '',
              lastUpdated: new Date().toLocaleDateString('ar-EG'),
            },
          };
    } catch {
      return {
        records: [],
        wasiyyah: {
          authorName: '',
          preamble: STANDARD_WASIYYAH_PREAMBLE,
          customDirectives: '',
          lastUpdated: new Date().toLocaleDateString('ar-EG'),
        },
      };
    }
  },

  saveRightsAndWasayaState(a: any, explicitUid?: string) {
    try {
      const key = getScopedKey(RIGHTS_WASAYA_KEY, explicitUid);
      localStorage.setItem(key, JSON.stringify(a));
    } catch (e) {
      console.warn('Failed to save rights & wasaya:', e);
    }
  },

  addRightsRecord(a: any, explicitUid?: string) {
    const state = this.getRightsAndWasayaState(explicitUid);
    const nextRec = {
      ...a,
      id: 'right_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      isFulfilled: false,
      createdAt: new Date().toLocaleDateString('ar-EG'),
    };
    state.records = [nextRec, ...state.records];
    this.saveRightsAndWasayaState(state, explicitUid);
    return nextRec;
  },

  toggleRightsRecordFulfilled(a: string, explicitUid?: string) {
    const state = this.getRightsAndWasayaState(explicitUid);
    const rec = state.records.find((d: any) => d.id === a);
    if (rec) {
      rec.isFulfilled = !rec.isFulfilled;
      rec.fulfilledDate = rec.isFulfilled ? new Date().toLocaleDateString('ar-EG') : undefined;
      this.saveRightsAndWasayaState(state, explicitUid);
    }
  },

  deleteRightsRecord(a: string, explicitUid?: string) {
    const state = this.getRightsAndWasayaState(explicitUid);
    state.records = state.records.filter((d: any) => d.id !== a);
    this.saveRightsAndWasayaState(state, explicitUid);
  },

  updateWasiyyahDocument(a: any, explicitUid?: string) {
    const state = this.getRightsAndWasayaState(explicitUid);
    state.wasiyyah = { ...state.wasiyyah, ...a, lastUpdated: new Date().toLocaleDateString('ar-EG') };
    this.saveRightsAndWasayaState(state, explicitUid);
    return state.wasiyyah;
  },

  checkAndPerformMidnightDailyReset(explicitUid?: string) {
    const resetKey = getScopedKey('athar_last_midnight_reset_date_v1', explicitUid);
    const today = getLocalDateKey();
    let lastReset = '';
    try {
      lastReset = localStorage.getItem(resetKey) || '';
    } catch {}

    if (lastReset !== today) {
      this.getPrayerAchievements(explicitUid);
      this.getAdhkarStats(explicitUid);
      this.getQuranKhatmah(explicitUid);
      this.getDailyWirdConfig(explicitUid);
      this.getTasbihState(explicitUid);
      this.getDailyIntentionsState(explicitUid);
      this.getTadabburProgress(explicitUid);

      try {
        localStorage.setItem(resetKey, today);
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

  exportFullBackup(explicitUid?: string) {
    const backup = {
      app: 'ATHAR_ISLAMIC_COMPANION',
      version: 4,
      uid: getCurrentStorageUid(explicitUid),
      exportedAt: new Date().toISOString(),
      data: {
        settings: this.getSettings(explicitUid),
        bookmarks: this.getBookmarks(explicitUid),
        lastRead: this.getLastRead(explicitUid),
        lastAudio: this.getLastAudioPosition(explicitUid),
        surahPositions: localStorage.getItem(getScopedKey(SURAH_POSITIONS_KEY, explicitUid))
          ? JSON.parse(localStorage.getItem(getScopedKey(SURAH_POSITIONS_KEY, explicitUid)) as string)
          : {},
        adhkarStats: this.getAdhkarStats(explicitUid),
        lastAdhkarRead: this.getLastAdhkarRead(explicitUid),
        lastAdhkarAudio: this.getLastAdhkarAudio(explicitUid),
        quranKhatmah: this.getQuranKhatmah(explicitUid),
        prayerAchievements: this.getPrayerAchievements(explicitUid),
        dailyWird: this.getDailyWirdConfig(explicitUid),
        tasbih: this.getTasbihState(explicitUid),
        sadaqahRecords: this.getSadaqahRecords(explicitUid),
        fastingTracker: this.getFastingTracker(explicitUid),
        tadabburProgress: this.getTadabburProgress(explicitUid),
        kinshipParents: this.getKinshipParentsState(explicitUid),
        dailyIntentions: this.getDailyIntentionsState(explicitUid),
        rightsAndWasaya: this.getRightsAndWasayaState(explicitUid),
      },
    };
    return JSON.stringify(backup, null, 2);
  },

  importFullBackup(a: string, explicitUid?: string) {
    try {
      const parsed = JSON.parse(a);
      const data = parsed?.data || parsed;
      if (!data || typeof data !== 'object') {
        return { success: false, message: 'ملف النسخة الاحتياطية غير صالح.' };
      }

      if (data.settings) this.saveSettings(data.settings, explicitUid);
      if (Array.isArray(data.bookmarks)) {
        localStorage.setItem(getScopedKey(BOOKMARKS_KEY, explicitUid), JSON.stringify(data.bookmarks));
      }
      if (data.lastRead) this.saveLastRead(data.lastRead, explicitUid);
      if (data.lastAudio) this.saveLastAudioPosition(data.lastAudio, explicitUid);
      if (data.surahPositions) {
        localStorage.setItem(getScopedKey(SURAH_POSITIONS_KEY, explicitUid), JSON.stringify(data.surahPositions));
      }
      if (data.adhkarStats) this.saveAdhkarStats(data.adhkarStats, explicitUid);
      if (data.lastAdhkarRead) this.saveLastAdhkarRead(data.lastAdhkarRead, explicitUid);
      if (data.lastAdhkarAudio) this.saveLastAdhkarAudio(data.lastAdhkarAudio, explicitUid);
      if (data.quranKhatmah) this.saveQuranKhatmah(data.quranKhatmah, explicitUid);
      if (data.prayerAchievements) this.savePrayerAchievements(data.prayerAchievements, explicitUid);
      if (data.dailyWird) this.saveDailyWirdConfig(data.dailyWird, explicitUid);
      if (data.tasbih) this.saveTasbihState(data.tasbih, explicitUid);
      if (Array.isArray(data.sadaqahRecords)) {
        localStorage.setItem(getScopedKey(SADAQAH_KEY, explicitUid), JSON.stringify(data.sadaqahRecords));
      }
      if (data.fastingTracker) {
        localStorage.setItem(getScopedKey(FASTING_KEY, explicitUid), JSON.stringify(data.fastingTracker));
      }
      if (data.tadabburProgress) {
        localStorage.setItem(getScopedKey(TADABBUR_KEY, explicitUid), JSON.stringify(data.tadabburProgress));
      }
      if (data.kinshipParents) this.saveKinshipParentsState(data.kinshipParents, explicitUid);
      if (data.dailyIntentions) this.saveDailyIntentionsState(data.dailyIntentions, explicitUid);
      if (data.rightsAndWasaya) this.saveRightsAndWasayaState(data.rightsAndWasaya, explicitUid);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('athar_khatmah_updated'));
        window.dispatchEvent(new CustomEvent('athar_prayers_updated'));
        window.dispatchEvent(new CustomEvent('athar_sakina_updated'));
      }
      return {
        success: true,
        message: 'تم استعادة النسخة الاحتياطية وكافة الإنجازات وسجلات السكينة والحقوق بنجاح ✓',
      };
    } catch {
      return {
        success: false,
        message: 'تعذر قراءة ملف النسخة الاحتياطية. تأكد من اختيار ملف JSON الصحيح.',
      };
    }
  },

  clearAllData(explicitUid?: string) {
    if (explicitUid && explicitUid !== 'all') {
      const suffix = `_${explicitUid}`;
      for (const k of USER_ACTIVITY_KEYS) {
        localStorage.removeItem(`${k}${suffix}`);
      }
    } else {
      localStorage.clear();
    }
  },

  getWidgetCustomization() {
    try {
      const raw = localStorage.getItem('athar_widget_customization_v1');
      if (raw) return { ...DEFAULT_WIDGET_CUSTOMIZATION, ...JSON.parse(raw) };
    } catch {}
    return { ...DEFAULT_WIDGET_CUSTOMIZATION };
  },

  saveWidgetCustomization(a: any) {
    try {
      localStorage.setItem('athar_widget_customization_v1', JSON.stringify(a));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('athar_widget_customization_changed', { detail: a }));
      }
    } catch {}
  },

  getNotificationPreferences() {
    try {
      const raw = localStorage.getItem('athar_notification_preferences_v2');
      if (raw) return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(raw) };
    } catch {}
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  },

  saveNotificationPreferences(a: any) {
    const nextVal = { ...this.getNotificationPreferences(), ...a };
    try {
      localStorage.setItem('athar_notification_preferences_v2', JSON.stringify(nextVal));
      NativePermissionsBridge.setNotificationConfig({
        notificationMode: nextVal.notificationMode,
        fullscreenAdhan: nextVal.fullscreenAdhanEnabled,
        systemOverlay: nextVal.systemOverlayEnabled,
        muazzinRegular: nextVal.regularMuazzin,
        muazzinFajr: nextVal.fajrMuazzin,
        catQuran: nextVal.quranRemindersEnabled,
        catAzkar: nextVal.azkarRemindersEnabled,
        catReminders: nextVal.generalRemindersEnabled,
        catParents: nextVal.parentsDutyEnabled,
        catWird: nextVal.wirdRemindersEnabled,
        toneQuran: nextVal.quranAudioTone,
        toneAzkar: nextVal.azkarAudioTone,
        toneSalawat: nextVal.salawatAudioTone,
        toneParents: nextVal.parentsAudioTone,
        toneWird: nextVal.wirdAudioTone,
        repeatIntervalMins: nextVal.remindersIntervalMinutes,
        intervalQuranMins: nextVal.intervalQuranMinutes,
        intervalAzkarMins: nextVal.intervalAzkarMinutes,
        intervalSalawatMins: nextVal.intervalSalawatMinutes,
        intervalParentsMins: nextVal.intervalParentsMinutes,
        intervalWirdMins: nextVal.intervalWirdMinutes,
        masterVolume: nextVal.masterVolume / 100,
        masterMuted: nextVal.masterMuted,
        dndBypass: nextVal.dndBypass,
        vibrationPattern: nextVal.vibrationPattern,
      }).catch(() => {});
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('athar_notification_preferences_changed', { detail: nextVal }));
      }
    } catch {}
    return nextVal;
  },

  getEnabledDhikrAlertIds() {
    const s = this.getSettings();
    return s.salawatReminder?.enabledDhikrIds && s.salawatReminder.enabledDhikrIds.length > 0
      ? s.salawatReminder.enabledDhikrIds
      : VERIFIED_DHIKR_REMINDERS.map((a: any) => a.id);
  },

  setEnabledDhikrAlertIds(a: string[]) {
    const s = this.getSettings();
    const nextVal = { ...s, salawatReminder: { ...s.salawatReminder, enabledDhikrIds: a } };
    this.saveSettings(nextVal);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('athar_dhikr_alerts_updated', { detail: a }));
    }
  },

  toggleDhikrAlertId(a: string, d?: boolean) {
    const current = this.getEnabledDhikrAlertIds();
    const shouldAdd = d === undefined ? !current.includes(a) : d;
    const nextList = shouldAdd ? (current.includes(a) ? current : [...current, a]) : current.filter((id: string) => id !== a);
    this.setEnabledDhikrAlertIds(nextList);
  },

  setAllDhikrAlertsEnabled(a: boolean) {
    this.setEnabledDhikrAlertIds(a ? VERIFIED_DHIKR_REMINDERS.map((item: any) => item.id) : []);
  },
};

export const DEFAULT_NOTIFICATION_PREFERENCES: any = {
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

export const DEFAULT_WIDGET_CUSTOMIZATION: any = {
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
