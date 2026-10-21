export type GamificationBadgeCategory = 
  | 'all'
  | 'prayers'
  | 'quran'
  | 'adhkar'
  | 'charity'
  | 'consistency';

export type MedalGraphicType = 'quran' | 'flame' | 'tasbih' | 'charity' | 'mosque' | 'star';

export type XPActivityType =
  | 'prayer_fajr'
  | 'prayer_dhuhr'
  | 'prayer_asr'
  | 'prayer_maghrib'
  | 'prayer_isha'
  | 'prayer_sunnah'
  | 'adhkar_morning'
  | 'adhkar_evening'
  | 'quran_daily_wird'
  | 'quran_audio_session'
  | 'sadaqah_deed'
  | 'kinship_dua'
  | 'streak_bonus';

export interface XPLedgerEntry {
  id: string; // Deterministic event ID: e.g. xp_prayer_fajr_2026-10-21
  userId: string;
  activityType: XPActivityType;
  titleArabic: string;
  category: 'prayers' | 'quran' | 'adhkar' | 'charity' | 'consistency';
  points: number;
  timestamp: string; // ISO 8601
  dateKey: string;   // YYYY-MM-DD
}

export interface UserGamificationSummary {
  totalXP: number;
  currentLevel: number;
  levelTitle: string;
  xpInCurrentLevel: number;
  xpRequiredForNextLevel: number;
  levelProgressPercent: number;
  dailyXPEarnedToday: number;
  dailyXPCap: number;
  earnedBadgesCount: number;
  totalBadgesCount: number;
  lastUpdated: string;
}

export interface AchievementBadgeItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: GamificationBadgeCategory;
  medalType: MedalGraphicType;
  isUnlocked: boolean;
  unlockedDate?: string;
  currentProgress: number;
  targetProgress: number;
  progressPercent: number;
  progressText: string;
  xpReward: number;
  visualState: 'locked' | 'in_progress' | 'earned';
  actionLabel?: string;
  actionDestination?: 'quran' | 'adhkar' | 'prayers' | 'sadaqah' | 'tasbih';
}
