import { StorageService } from './storageService';
import { PrayerAchievementsState, AdhkarStats, DailyWirdConfig, QuranKhatmahState } from '../types';
import { MORNING_ADHKAR, EVENING_ADHKAR } from '../data/adhkarData';

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
  
  // Adhkar (strictly tied to actual recitation in Adhkar section)
  isMorningAdhkarDone: boolean;
  isEveningAdhkarDone: boolean;
  morningPercent: number;
  eveningPercent: number;
  morningCompletedCount: number;
  eveningCompletedCount: number;
  totalMorningCount: number;
  totalEveningCount: number;
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

    // 2. Adhkar: Strictly derived from authentic recitation in the Adhkar section
    const morningCounts = StorageService.getDhikrCounts('morning');
    const eveningCounts = StorageService.getDhikrCounts('evening');

    const morningCompletedCount = MORNING_ADHKAR.filter(d => (morningCounts[d.id] || 0) >= d.count).length;
    const morningPercent = Math.round((morningCompletedCount / MORNING_ADHKAR.length) * 100);

    const eveningCompletedCount = EVENING_ADHKAR.filter(d => (eveningCounts[d.id] || 0) >= d.count).length;
    const eveningPercent = Math.round((eveningCompletedCount / EVENING_ADHKAR.length) * 100);

    const morningDone = morningPercent >= 100 || Boolean(adhkarStats.morningCompletedToday);
    const eveningDone = eveningPercent >= 100 || Boolean(adhkarStats.eveningCompletedToday);

    let adhkarScore = 0;
    if (morningDone) {
      adhkarScore += 10;
    } else if (morningPercent > 0) {
      adhkarScore += Math.floor((morningPercent / 100) * 10);
    }

    if (eveningDone) {
      adhkarScore += 10;
    } else if (eveningPercent > 0) {
      adhkarScore += Math.floor((eveningPercent / 100) * 10);
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

    // Total score (0 to 100%) strictly derived from authentic worship actions
    let totalScore = prayersScore + adhkarScore + quranScore;
    totalScore = Math.min(100, Math.max(0, totalScore));

    // Determine stage
    let stage: 0 | 1 | 2 | 3 = 0;
    let stageLabel = '';
    let inspirationalQuote = '«أَحَبُّ الأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ»';
    let inspirationalSubtitle = 'ابدأ يومك بذكر الله وصلاة الفجر لتغرس بذرة أثرك وتستنير أوراقها الأولى';

    if (totalScore >= 100) {
      stage = 3;
      stageLabel = '';
      inspirationalQuote = '«يَهْدِي اللَّهُ لِنُورِهِ مَن يَشَاءُ»';
      inspirationalSubtitle = 'تبارك الرحمن! أزهرت شجرة أثرك بالكامل واكتست توهجاً ذهبياً مباركاً بصلواتك ووردك وأذكارك. تقبل الله طاعتك!';
    } else if (totalScore >= 50) {
      stage = 2;
      stageLabel = '';
      inspirationalQuote = '«تُؤْتِي أُكُلَهَا كُلَّ حِينٍ بِإِذْنِ رَبِّهَا»';
      inspirationalSubtitle = 'نمت الأغصان وتفتحت البراعم بطاعتك وذكرك.. بورك هذا الأثر المتواصل، ما بقي إلا القليل لتزهر بالكامل.';
    } else if (totalScore >= 20) {
      stage = 1;
      stageLabel = '';
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
      morningPercent,
      eveningPercent,
      morningCompletedCount,
      eveningCompletedCount,
      totalMorningCount: MORNING_ADHKAR.length,
      totalEveningCount: EVENING_ADHKAR.length,
      adhkarScore,

      isWirdDone,
      completedWirdCount,
      targetWirdCount,
      quranScore,
      ayahsReadToday,
      minutesListenedToday,

      streakDays: prayersState.streakDays || 1
    };
  },

  getSimulatedImpact(targetScore: number): ImpactBreakdown {
    const clampedScore = Math.min(100, Math.max(0, targetScore));
    let stage: 0 | 1 | 2 | 3 = 0;
    let stageLabel = '';
    let inspirationalQuote = '«أَحَبُّ الأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ»';
    let inspirationalSubtitle = 'ابدأ يومك بذكر الله وصلاة الفجر لتغرس بذرة أثرك وتستنير أوراقها الأولى';

    if (clampedScore >= 100) {
      stage = 3;
      stageLabel = 'المرحلة الذهبية الملكية';
      inspirationalQuote = '«يَهْدِي اللَّهُ لِنُورِهِ مَن يَشَاءُ»';
      inspirationalSubtitle = 'تبارك الرحمن! أزهرت شجرة أثرك بالكامل (١٠٠٪) واكتست توهجاً ذهبياً مباركاً بصلواتك ووردك وأذكارك. تقبل الله طاعتك!';
    } else if (clampedScore >= 50) {
      stage = 2;
      stageLabel = 'حيوية الأغصان';
      inspirationalQuote = '«تُؤْتِي أُكُلَهَا كُلَّ حِينٍ بِإِذْنِ رَبِّهَا»';
      inspirationalSubtitle = 'نمت الأغصان وتفتحت البراعم بطاعتك وذكرك (٥٠٪).. بورك هذا الأثر المتواصل، ما بقي إلا القليل لتزهر بالكامل.';
    } else if (clampedScore >= 20) {
      stage = 1;
      stageLabel = 'إشراقة الأوراق';
      inspirationalQuote = '«مَثَلُ كَلِمَةٍ طَيِّبَةٍ كَشَجَرَةٍ طَيِّبَةٍ أَصْلُهَا ثَابِتٌ وَفَرْعُهَا فِي السَّمَاءِ»';
      inspirationalSubtitle = 'استنارت الأوراق الأولى لشجرة أثرك (٢٠٪).. واصل صلواتك ووردك لتورق الأغصان وتتفتح البراعم.';
    }

    const isFull = clampedScore >= 100;
    const isHalf = clampedScore >= 50;
    const isTwenty = clampedScore >= 20;

    return {
      score: clampedScore,
      stage,
      stageLabel,
      inspirationalQuote,
      inspirationalSubtitle,

      prayersCompletedCount: isFull ? 5 : isHalf ? 3 : isTwenty ? 1 : 0,
      totalObligatoryPrayers: 5,
      prayersScore: isFull ? 60 : isHalf ? 36 : isTwenty ? 12 : 0,
      isFajrDone: isTwenty || isHalf || isFull,
      isDhuhrDone: isHalf || isFull,
      isAsrDone: isHalf || isFull,
      isMaghribDone: isFull,
      isIshaDone: isFull,
      isSunanDone: isFull,
      isQiyamDone: isFull,

      isMorningAdhkarDone: isHalf || isFull,
      isEveningAdhkarDone: isFull,
      morningPercent: isFull ? 100 : isHalf ? 100 : isTwenty ? 40 : 0,
      eveningPercent: isFull ? 100 : isHalf ? 40 : 0,
      morningCompletedCount: isFull ? MORNING_ADHKAR.length : isHalf ? MORNING_ADHKAR.length : Math.round(MORNING_ADHKAR.length * 0.4),
      eveningCompletedCount: isFull ? EVENING_ADHKAR.length : 0,
      totalMorningCount: MORNING_ADHKAR.length,
      totalEveningCount: EVENING_ADHKAR.length,
      adhkarScore: isFull ? 20 : isHalf ? 14 : isTwenty ? 8 : 0,

      isWirdDone: isFull,
      completedWirdCount: isFull ? 1 : 0,
      targetWirdCount: 1,
      quranScore: isFull ? 20 : isHalf ? 0 : 0,
      ayahsReadToday: isFull ? 20 : isHalf ? 5 : 0,
      minutesListenedToday: isFull ? 15 : 0,

      streakDays: 7
    };
  }
};
