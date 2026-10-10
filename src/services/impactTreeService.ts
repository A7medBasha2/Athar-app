import { StorageService } from './storageService';
import { PrayerAchievementsState, AdhkarStats, DailyWirdConfig, QuranKhatmahState } from '../types';

export interface ImpactBreakdown {
  score: number; // 0 to 100
  stage: 0 | 1 | 2 | 3; // 0: <20%, 1: 20-49%, 2: 50-99%, 3: 100%
  stageLabel: string;
  inspirationalQuote: string;
  inspirationalSubtitle: string;
  
  // Specific pillars
  prayersCompletedCount: number;
  totalObligatoryPrayers: number;
  prayersScore: number;
  isFajrDone: boolean;
  isDhuhrDone: boolean;
  isAsrDone: boolean;
  isMaghribDone: boolean;
  isIshaDone: boolean;
  isSunanDone: boolean;
  isQiyamDone: boolean;
  
  // Adhkar
  isMorningAdhkarDone: boolean;
  isEveningAdhkarDone: boolean;
  adhkarScore: number;
  
  // Quran
  isWirdDone: boolean;
  completedWirdCount: number;
  targetWirdCount: number;
  quranScore: number;
  ayahsReadToday: number;
  minutesListenedToday: number;

  streakDays: number;
}

export const ImpactTreeService = {
  calculateImpact(): ImpactBreakdown {
    const prayersState: PrayerAchievementsState = StorageService.getPrayerAchievements();
    const adhkarStats: AdhkarStats = StorageService.getAdhkarStats();
    const wirdConfig: DailyWirdConfig = StorageService.getDailyWirdConfig();
    const khatmah: QuranKhatmahState = StorageService.getQuranKhatmah();

    // 1. Obligatory prayers: 12% each, total 60%
    const p = prayersState.todayPrayers || {
      fajr: false,
      dhuhr: false,
      asr: false,
      maghrib: false,
      isha: false,
      sunan: false,
      qiyam: false
    };

    let completedPrayersCount = 0;
    if (p.fajr) completedPrayersCount++;
    if (p.dhuhr) completedPrayersCount++;
    if (p.asr) completedPrayersCount++;
    if (p.maghrib) completedPrayersCount++;
    if (p.isha) completedPrayersCount++;

    const prayersScore = completedPrayersCount * 12; // max 60%

    // Optional Sunan & Qiyam bonus (+5% each)
    let prayerBonus = 0;
    if (p.sunan) prayerBonus += 5;
    if (p.qiyam) prayerBonus += 5;

    // 2. Adhkar: 10% morning + 10% evening = 20%
    let adhkarScore = 0;
    const morningDone = Boolean(adhkarStats.morningCompletedToday);
    const eveningDone = Boolean(adhkarStats.eveningCompletedToday);

    if (morningDone) adhkarScore += 10;
    if (eveningDone) adhkarScore += 10;
    // If not marked completed by session, but user did at least 5 dhikr steps today
    if (!morningDone && !eveningDone && (adhkarStats.todayDhikrCount || 0) > 0) {
      adhkarScore += Math.min(10, Math.floor((adhkarStats.todayDhikrCount || 0) / 3));
    }

    // 3. Quran & Daily Wird: 20%
    let quranScore = 0;
    const completedWirdCount = wirdConfig.completedTodayCount || 0;
    const targetWirdCount = wirdConfig.targetCount || 1;
    const ayahsReadToday = khatmah.totalAyahsReadToday || 0;
    const minutesListenedToday = khatmah.todayMinutesListened || 0;

    const isWirdDone = completedWirdCount >= targetWirdCount || ayahsReadToday >= 5 || minutesListenedToday >= 5;

    if (isWirdDone) {
      quranScore = 20;
    } else if (completedWirdCount > 0) {
      quranScore = Math.min(20, Math.round((completedWirdCount / targetWirdCount) * 20));
    } else if (ayahsReadToday > 0) {
      quranScore = Math.min(18, ayahsReadToday * 3);
    } else if (minutesListenedToday > 0) {
      quranScore = Math.min(15, minutesListenedToday * 2);
    }

    // Total score (0 to 100)
    let totalScore = prayersScore + adhkarScore + quranScore + prayerBonus;
    totalScore = Math.min(100, Math.max(0, totalScore));

    // Determine stage
    let stage: 0 | 1 | 2 | 3 = 0;
    let stageLabel = 'غراس البداية';
    let inspirationalQuote = '«أَحَبُّ الأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ»';
    let inspirationalSubtitle = 'ابدأ يومك بذكر الله وصلاة الفجر لتغرس بذرة أثرك وتستنير أوراقها الأولى';

    if (totalScore >= 100) {
      stage = 3;
      stageLabel = 'الإزهار الذهبي الكامل';
      inspirationalQuote = '«يَهْدِي اللَّهُ لِنُورِهِ مَن يَشَاءُ»';
      inspirationalSubtitle = 'تبارك الرحمن! أزهرت شجرة أثرك بالكامل واكتست توهجاً ذهبياً مباركاً بصلواتك ووردك وأذكارك. تقبل الله طاعتك!';
    } else if (totalScore >= 50) {
      stage = 2;
      stageLabel = 'نمو الأغصان والبراعم';
      inspirationalQuote = '«تُؤْتِي أُكُلَهَا كُلَّ حِينٍ بِإِذْنِ رَبِّهَا»';
      inspirationalSubtitle = 'نمت الأغصان وتفتحت البراعم بطاعتك وذكرك.. بورك هذا الأثر المتواصل، ما بقي إلا القليل لتزهر بالكامل.';
    } else if (totalScore >= 20) {
      stage = 1;
      stageLabel = 'إضاءة الأوراق الأولى';
      inspirationalQuote = '«مَثَلُ كَلِمَةٍ طَيِّبَةٍ كَشَجَرَةٍ طَيِّبَةٍ أَصْلُهَا ثَابِتٌ وَفَرْعُهَا فِي السَّمَاءِ»';
      inspirationalSubtitle = 'استنارت الأوراق الأولى لشجرة أثرك.. واصل صلواتك ووردك لتورق الأغصان وتتفتح البراعم.';
    }

    return {
      score: totalScore,
      stage,
      stageLabel,
      inspirationalQuote,
      inspirationalSubtitle,

      prayersCompletedCount: completedPrayersCount,
      totalObligatoryPrayers: 5,
      prayersScore,
      isFajrDone: p.fajr,
      isDhuhrDone: p.dhuhr,
      isAsrDone: p.asr,
      isMaghribDone: p.maghrib,
      isIshaDone: p.isha,
      isSunanDone: Boolean(p.sunan),
      isQiyamDone: Boolean(p.qiyam),

      isMorningAdhkarDone: morningDone,
      isEveningAdhkarDone: eveningDone,
      adhkarScore,

      isWirdDone,
      completedWirdCount,
      targetWirdCount,
      quranScore,
      ayahsReadToday,
      minutesListenedToday,

      streakDays: prayersState.streakDays || 1
    };
  }
};
