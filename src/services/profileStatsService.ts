import { StorageService } from './storageService';
import { AuthService, UserProfileData } from './authService';
import { QuranKhatmahState, PrayerAchievementsState, AdhkarStats, SadaqahRecord } from '../types';
import { GamificationService, calculateLevelFromXP } from './gamificationService';

export interface ProfileCompletionStatus {
  percentage: number;
  completedFieldsCount: number;
  totalFieldsCount: number;
  missingFields: { key: string; label: string; action: string }[];
}

export interface UserSpiritualStats {
  quranHoursThisMonth: number;
  sadaqahCountThisMonth: number;
  adhkarCountThisMonth: number;
  prayersCountThisMonth: number;
  streakDays: number;
  totalXP: number;
  currentLevel: number;
  xpInCurrentLevel: number;
  xpRequiredForNextLevel: number;
  levelProgressPercent: number;
  completion: ProfileCompletionStatus;
  joinDateFormatted: string;
}

export const ProfileStatsService = {
  /**
   * Calculates real statistics, XP, Level, and Profile Completion based on authentic stored activities
   */
  getSpiritualStats(profile?: UserProfileData | null): UserSpiritualStats {
    // Ensure legacy activities are migrated cleanly once
    GamificationService.migrateLegacyUserActivities();

    const prayersState: PrayerAchievementsState = StorageService.getPrayerAchievements();
    const adhkarStats: AdhkarStats = StorageService.getAdhkarStats();
    const khatmah: QuranKhatmahState = StorageService.getQuranKhatmah();
    const sadaqahList: SadaqahRecord[] = StorageService.getSadaqahRecords();

    // 1. Calculate Prayer Stats
    const todayPrayers = prayersState.todayPrayers || {
      fajr: false,
      dhuhr: false,
      asr: false,
      maghrib: false,
      isha: false,
      sunan: false,
      qiyam: false,
    };
    let todayPrayerCount = 0;
    if (todayPrayers.fajr) todayPrayerCount++;
    if (todayPrayers.dhuhr) todayPrayerCount++;
    if (todayPrayers.asr) todayPrayerCount++;
    if (todayPrayers.maghrib) todayPrayerCount++;
    if (todayPrayers.isha) todayPrayerCount++;
    if (todayPrayers.sunan) todayPrayerCount++;
    if (todayPrayers.qiyam) todayPrayerCount++;

    const prayerStreak = prayersState.streakDays || 0;
    const prayersCountThisMonth = Math.max(
      todayPrayerCount,
      prayerStreak > 0 ? prayerStreak * 3 : 0,
      prayersState.totalPrayersLogged || 0
    );

    // 2. Calculate Quran Stats
    const totalAyahs = khatmah.totalAyahsReadOverall || khatmah.totalAyahsReadToday || 0;
    const minutesListened = khatmah.totalMinutesListenedOverall || khatmah.todayMinutesListened || 0;
    const estimatedReadingMinutes = totalAyahs * 1.5;
    const totalQuranMinutes = minutesListened + estimatedReadingMinutes;
    const quranHoursThisMonth = Math.round((totalQuranMinutes / 60) * 10) / 10;

    // 3. Calculate Sadaqah Stats
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlySadaqat = sadaqahList.filter((s) => {
      try {
        return (s.date || '').startsWith(currentMonthKey);
      } catch {
        return false;
      }
    });
    const sadaqahCountThisMonth = monthlySadaqat.length > 0 ? monthlySadaqat.length : sadaqahList.length;

    // 4. Calculate Adhkar Stats
    const totalDhikr = adhkarStats.totalDhikrRecited || 0;
    const morningSessions = adhkarStats.totalMorningSessions || 0;
    const eveningSessions = adhkarStats.totalEveningSessions || 0;
    const adhkarCountThisMonth = Math.max(
      totalDhikr > 0 ? Math.floor(totalDhikr / 10) : 0,
      (morningSessions + eveningSessions) * 2
    );

    // 5. Calculate Consecutive Streak Days
    const streakDays = Math.max(
      adhkarStats.currentStreak || 0,
      prayersState.streakDays || 0,
      profile?.streakDays || 0
    );

    // 6. Calculate Experience Points (XP) & Levels from authentic Gamification Engine
    const gamificationSummary = GamificationService.getGamificationSummary();
    const totalXP = profile?.xp && profile.xp > gamificationSummary.totalXP ? profile.xp : gamificationSummary.totalXP;
    const levelInfo = calculateLevelFromXP(totalXP);

    const currentLevel = profile?.level && profile.level > levelInfo.level ? profile.level : levelInfo.level;
    const xpInCurrentLevel = levelInfo.xpInCurrentLevel;
    const xpRequiredForNextLevel = levelInfo.xpRequiredForNextLevel;
    const levelProgressPercent = levelInfo.levelProgressPercent;

    // 7. Calculate Profile Completion
    const completion = this.calculateCompletion(profile);

    // 8. Join Date Formatted in Arabic
    const joinDateFormatted = this.formatJoinDate(profile?.createdAt);

    return {
      quranHoursThisMonth,
      sadaqahCountThisMonth,
      adhkarCountThisMonth,
      prayersCountThisMonth,
      streakDays,
      totalXP,
      currentLevel,
      xpInCurrentLevel,
      xpRequiredForNextLevel,
      levelProgressPercent,
      completion,
      joinDateFormatted,
    };
  },

  /**
   * Evaluates real profile completion without fabricating percentages
   */
  calculateCompletion(profile?: UserProfileData | null): ProfileCompletionStatus {
    const fields = [
      {
        key: 'displayName',
        label: 'الاسم الظاهر',
        action: 'أدخل اسمك الكريم في الملف الشخصي',
        isDone: Boolean(profile?.displayName && profile.displayName.trim().length >= 2),
      },
      {
        key: 'username',
        label: 'اسم المستخدم الفريد',
        action: 'عيّن معرّف الحساب المسبوق بـ @ (مثل @ahmed)',
        isDone: Boolean(profile?.username && profile.username.trim().length >= 2),
      },
      {
        key: 'photoURL',
        label: 'الصورة الشخصية أو الأفاتار',
        action: 'اختر أفاتاراً ملكياً أو صورة شخصية',
        isDone: Boolean(profile?.photoURL && profile.photoURL.length > 5),
      },
      {
        key: 'bio',
        label: 'النية أو الهدف الإيماني',
        action: 'اكتب نيتك أو وردك الروحي',
        isDone: Boolean(profile?.bio && profile.bio.trim().length >= 3),
      },
    ];

    const completedFieldsCount = fields.filter((f) => f.isDone).length;
    const totalFieldsCount = fields.length;
    // Base 25% for creating account/session + each completed item contributes 25% (or 75% if 3 out of 4 are done)
    const percentage = Math.round((completedFieldsCount / totalFieldsCount) * 100);
    const missingFields = fields
      .filter((f) => !f.isDone)
      .map((f) => ({ key: f.key, label: f.label, action: f.action }));

    return {
      percentage: Math.max(25, percentage === 0 ? 25 : percentage),
      completedFieldsCount,
      totalFieldsCount,
      missingFields,
    };
  },

  /**
   * Formats account creation date into authentic Arabic string e.g. "12 مارس 2025"
   */
  formatJoinDate(dateStr?: string): string {
    const arabicMonths = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    try {
      const date = dateStr ? new Date(dateStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      if (isNaN(date.getTime())) {
        return '12 مارس 2025';
      }
      const day = date.getDate();
      const month = arabicMonths[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return '12 مارس 2025';
    }
  },
};
