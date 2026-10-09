export type NavigationTab = 'home' | 'prayers' | 'quran' | 'adhkar' | 'qibla' | 'reminders' | 'settings';

export interface Coordinates {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  isAutoGps: boolean;
}

export type PrayerCalculationMethod = 
  | '5'  // Egyptian General Authority of Survey (default)
  | '3'  // Muslim World League
  | '4'  // Umm Al-Qura University, Makkah
  | '1'  // University of Islamic Sciences, Karachi
  | '16' // Dubai General Authority of Islamic Affairs & Endowments
  | '2'; // Islamic Society of North America (ISNA)

export interface PrayerTimeItem {
  id: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  nameArabic: string;
  time: string; // "04:52"
  time12?: string; // "04:52 ص"
  time24?: string; // "04:52"
  timestamp: number;
  isPassed: boolean;
  isCurrent: boolean;
  isNext: boolean;
}

export interface PrayerTimesData {
  dateGregorian: string;
  dateHijri: string;
  hijriDay: string;
  hijriMonth: string;
  hijriYear: string;
  locationName: string;
  timings: {
    fajr: string;
    sunrise: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
  };
  timings12?: {
    fajr: string;
    sunrise: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
  };
  currentPrayer: PrayerTimeItem | null;
  nextPrayer: PrayerTimeItem | null;
  timeRemainingSeconds: number;
}

export interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: 'Meccan' | 'Medinan';
}

export interface AyahItem {
  number: number; // overall in Quran
  numberInSurah: number;
  text: string;
  audioUrl?: string;
  juz?: number;
  page?: number;
}

export interface QuranReciter {
  id: string;
  nameArabic: string;
  nameEnglish: string;
  subfolder: string;
  audioServer: string; // baseUrl for ayah audio
  surahAudioServer?: string; // baseUrl for full surah audio
}

export interface DhikrItem {
  id: number;
  arabicText: string;
  transliteration?: string;
  translation?: string;
  count: number; // Target repetitions (e.g., 3, 100)
  currentCount?: number;
  fadl: string; // Virtue / Hadith source
  audioUrl?: string;
  durationSeconds?: number;
  startTime?: number; // trim beginning (seconds) to start recitation immediately
  endTime?: number;   // trim ending (seconds) to stop exactly when dhikr text finishes
}

export type AdhkarCategory = 'morning' | 'evening';

export interface AdhkarProgressState {
  category: AdhkarCategory;
  currentIndex: number;
  currentCount: number;
  completedIds: number[];
  isSessionFinished: boolean;
}

export interface QiblaData {
  bearing: number; // compass bearing to Qibla (0-360)
  distanceKm: number;
  compassHeading: number; // current device heading (0-360)
  offset: number; // heading - bearing (-180 to 180)
  isAligned: boolean; // within 3 degrees
}

export type ReminderFrequency = '1m' | '30m' | '1h' | '2h' | '3h' | '4h' | '6h' | 'daily' | 'custom';
export type ReminderPlaybackMode = 'notification_only' | 'notification_and_sound' | 'notification_with_play_action';

export interface ReminderSetting {
  enabled: boolean;
  frequency: ReminderFrequency;
  customMinutes?: number;
  startTime: string; // "08:00"
  endTime: string;   // "22:00"
  mode: ReminderPlaybackMode;
}

export interface QuietHoursSetting {
  enabled: boolean;
  startTime: string; // "23:00"
  endTime: string;   // "07:00"
}

export interface ArtworkSetting {
  enabled: boolean;
  rotationInterval: '6h' | '12h' | 'daily' | '3d' | 'off';
  opacity: number; // 0.05 to 0.15
  currentArtworkId: string;
}

export type DailyWirdType = 'surahs' | 'ayahs' | 'juz';

export interface DailyWirdConfig {
  enabled: boolean;
  type: DailyWirdType;
  targetCount: number; // e.g. 1 surah, 2 surahs, 50 ayahs
  completedTodayCount: number;
  completedSurahsToday: number[];
  lastActiveDate: string;
}

export interface TasbihDhikr {
  id: string;
  name: string;
  target: number; // 33, 100, 0 for infinite
  currentCount: number;
  totalCompleted: number;
  isCustom?: boolean;
}

export interface TasbihState {
  selectedDhikrId: string;
  items: TasbihDhikr[];
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  totalAllTime: number;
}

export interface AppSettings {
  language: 'ar';
  calculationMethod: PrayerCalculationMethod;
  location: Coordinates;
  adhanEnabled: boolean;
  adhanVoice: 'makkah' | 'madinah' | 'alaqsa' | 'alafasy';
  adhanVibrate: boolean;
  selectedReciterId: string;
  quranVerseReminder: ReminderSetting;
  salawatReminder: ReminderSetting;
  dailyWirdReminder: ReminderSetting;
  dailyWirdConfig: DailyWirdConfig;
  quietHours: QuietHoursSetting;
  artwork: ArtworkSetting;
  hasCompletedOnboarding: boolean;
  fontSizeMultiplier: number;
}

export interface Bookmark {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  ayahText: string;
  timestamp: number;
}

export interface LastRead {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  timestamp: number;
}

export interface LastAudioPosition {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  reciterId?: string;
  reciterName: string;
  currentTime: number;
  duration?: number;
  timestamp: number;
}

export interface AdhkarBadge {
  id: string;
  title: string;
  description: string;
  isUnlocked: boolean;
  progressPercent: number;
  iconName: string;
}

export interface AdhkarStats {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  totalDhikrRecited: number;
  todayDhikrCount: number;
  morningCompletedToday: boolean;
  eveningCompletedToday: boolean;
  totalMorningSessions: number;
  totalEveningSessions: number;
  unlockedBadgeIds: string[];
}

export interface QuranKhatmahState {
  khatmahNumber: number;
  completedSurahs: number[];
  totalAyahsReadToday: number;
  todayMinutesListened: number;
  totalAyahsReadOverall: number;
  totalMinutesListenedOverall: number;
  lastActiveDate: string;
  dailyGoalAyahs: number;
  readingStreakDays: number;
  khatmahStartDate: string;
}

export interface IslamicArtwork {
  id: string;
  titleArabic: string;
  descriptionArabic: string;
  type: 'geometric' | 'mosque' | 'nocturnal' | 'arabesque';
  svgPattern: string;
}

