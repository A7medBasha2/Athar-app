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

export interface DhikrReminderSetting extends ReminderSetting {
  selectionMode?: 'rotate' | 'specific';
  selectedDhikrIds?: string[]; // empty or undefined = all verified dhikr items
  currentIndex?: number;
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
  type: 'surahs' | 'ayahs' | 'juz' | 'listening' | 'adhkar';
  targetCount: number; // User can set any number without limit
  completedTodayCount: number;
  completedSurahsToday: number[];
  lastActiveDate: string;
  notes?: string;
}

export interface PrayerAchievementsState {
  streakDays: number;
  longestStreak: number;
  totalPrayersLogged: number;
  todayPrayers: {
    fajr: boolean;
    dhuhr: boolean;
    asr: boolean;
    maghrib: boolean;
    isha: boolean;
    sunan: boolean;
    qiyam: boolean;
  };
  lastActiveDate: string;
  unlockedBadgeIds: string[];
}

export interface DailyHadithItem {
  id: number;
  hadithText: string;
  narrator: string;
  source: string;
  explanation: string;
  theme: string;
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

export type AdhanPlaybackMode = 'full' | 'first_two_takbeers';

export interface IqamahSettings {
  enabled: boolean;
  defaultMinutes: number; // 15 mins for Fajr, Dhuhr, Asr, Isha
  maghribMinutes: number; // 5 mins for Maghrib
  soundEnabled: boolean;
}

export interface DailyContentSettings {
  autoRotate: boolean;
  rotationHour: number; // 0-23
  customHourTime: string; // "00:00"
  rotationFrequency?: 'daily' | '12h' | '6h';
  currentVerseIndex?: number;
  currentHadithIndex?: number;
  lastRotatedKey?: string;
}

export interface AppSettings {
  language: 'ar';
  calculationMethod: PrayerCalculationMethod;
  location: Coordinates;
  adhanEnabled: boolean;
  adhanVoice: 'makkah' | 'madinah' | 'alaqsa' | 'alafasy';
  adhanVibrate: boolean;
  adhanMode: AdhanPlaybackMode;
  duaAfterAdhanEnabled: boolean;
  iqamahSettings: IqamahSettings;
  dailyContentSettings: DailyContentSettings;
  selectedReciterId: string;
  quranVerseReminder: ReminderSetting;
  salawatReminder: ReminderSetting;
  dhikrReminder: DhikrReminderSetting;
  dailyWirdReminder: ReminderSetting;
  dailyWirdConfig: DailyWirdConfig;
  quietHours: QuietHoursSetting;
  artwork: ArtworkSetting;
  hasCompletedOnboarding: boolean;
  fontSizeMultiplier: number;
  readerTheme?: 'night' | 'sepia' | 'oled';
}

export interface AsmaAllahItem {
  id: number;
  name: string;
  meaning: string;
  reflection: string;
}

export interface SadaqahRecord {
  id: string;
  amount: number;
  currency: string;
  intention: string;
  date: string;
}

export interface FastingTrackerState {
  fastedDates: string[]; // YYYY-MM-DD
  totalFastedDays: number;
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

export interface LastAdhkarRead {
  category: AdhkarCategory;
  dhikrId: number;
  dhikrIndex: number;
  currentCount: number;
  targetCount: number;
  timestamp: number;
}

export interface LastAdhkarAudio {
  category: AdhkarCategory;
  dhikrId: number;
  dhikrIndex: number;
  currentRepetition: number;
  targetRepetition: number;
  playMode?: 'repeated' | 'continuous';
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

// --- واحة السكينة والحقوق (Sakina & Rights Oasis) ---

export interface TadabburProgressState {
  completedSessionIds: string[];
  lastCompletedDate: string;
  streakDays: number;
}

export type KinshipStatus = 'alive' | 'deceased';
export type KinshipContactType = 'dua' | 'call' | 'visit' | 'sadaqah' | 'gift';

export interface KinshipContact {
  id: string;
  name: string;
  relationship: string;
  status: KinshipStatus;
  preferredType: KinshipContactType;
  lastInteractionDate: string; // ISO or YYYY-MM-DD
  interactionCount: number;
  notes?: string;
}

export interface KinshipParentsState {
  fatherStatus: KinshipStatus;
  motherStatus: KinshipStatus;
  fatherLastDuaDate?: string;
  motherLastDuaDate?: string;
  contacts: KinshipContact[];
}

export interface DailyIntentionsState {
  selectedIds: string[];
  lastPledgedDate: string;
  totalPledgesCount: number;
}

export type RightsRecordType = 'debt_on_me' | 'debt_for_me' | 'trust' | 'moral_right';

export interface RightsRecord {
  id: string;
  type: RightsRecordType;
  title: string;
  amountOrDescription: string;
  personName: string;
  contactOrLocation?: string;
  dueDate?: string;
  isFulfilled: boolean;
  fulfilledDate?: string;
  createdAt: string;
  notes?: string;
}

export interface IslamicWillDocument {
  authorName: string;
  preamble: string;
  customDirectives: string;
  bequestOneThirdNotes?: string; // وصية بالثلث
  witnesses?: string;
  lastUpdated: string;
}

export interface RightsAndWasayaState {
  records: RightsRecord[];
  wasiyyah: IslamicWillDocument;
}

