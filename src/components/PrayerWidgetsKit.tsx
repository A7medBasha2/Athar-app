import React, { useMemo } from 'react';
import { LiveActivityState } from '../services/liveActivityService';
import { ImpactTreeService, ImpactBreakdown } from '../services/impactTreeService';
import { StorageService } from '../services/storageService';
import { AtharBrandLogo } from './AtharBrandLogo';
import enhancedImpactTree from '../assets/images/enhanced_impact_tree_luminous.png';
import {
  Clock,
  MapPin,
  CheckCircle2,
  Sparkles,
  WifiOff,
  Flame,
  BookOpen,
  Moon,
  BellRing,
} from 'lucide-react';

export interface DailyVerseWidgetItem {
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  text: string;
}

export const WIDGET_DAILY_VERSES: DailyVerseWidgetItem[] = [
  {
    surahNumber: 13,
    ayahNumber: 28,
    surahName: 'الرعد',
    text: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
  },
  {
    surahNumber: 2,
    ayahNumber: 152,
    surahName: 'البقرة',
    text: 'فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ',
  },
  {
    surahNumber: 94,
    ayahNumber: 5,
    surahName: 'الشرح',
    text: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا',
  },
  {
    surahNumber: 39,
    ayahNumber: 53,
    surahName: 'الزمر',
    text: 'لَا تَقْنَطُوا مِنْ رَحْمَةِ اللَّهِ ۚ إِنَّ اللَّهَ يَغْفِرُ الذُّنُوبَ جَمِيعًا',
  },
  {
    surahNumber: 65,
    ayahNumber: 3,
    surahName: 'الطلاق',
    text: 'وَمَنْ يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ ۚ إِنَّ اللَّهَ بَالِغُ أَمْرِهِ',
  },
  {
    surahNumber: 2,
    ayahNumber: 186,
    surahName: 'البقرة',
    text: 'وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ',
  },
  {
    surahNumber: 14,
    ayahNumber: 7,
    surahName: 'إبراهيم',
    text: 'وَإِذْ تَأَذَّنَ رَبُّكُمْ لَئِنْ شَكَرْتُمْ لَأَزِيدَنَّكُمْ',
  },
];

interface WidgetProps {
  state: LiveActivityState;
  todayCompletedPrayersCount?: number;
  streakDays?: number;
  impactBreakdown?: ImpactBreakdown;
  dailyVerse?: DailyVerseWidgetItem;
  onClick?: () => void;
  className?: string;
}

/**
 * 1. Small Prayer Time Widget (ودجت مواقيت الصلاة الصغير - Small)
 * Displays the next prayer name, live countdown remaining, and a luminous 24k golden emblem/ring.
 */
export const SmallPrayerWidgetCard: React.FC<WidgetProps> = ({
  state,
  onClick,
  className = '',
}) => {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference -
    (Math.min(100, Math.max(0, state.progressPercent)) / 100) * circumference;

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#19150D] via-[#0F0D09] to-[#070604] border border-[#C8A24A]/65 p-3.5 shadow-[0_14px_34px_rgba(0,0,0,0.92),0_0_20px_rgba(200,162,74,0.16)] text-right select-none flex flex-col justify-between min-h-[158px] transition-all ${
        onClick ? 'cursor-pointer hover:border-[#E6C66E]' : ''
      } ${className}`}
    >
      {/* Subtle radial gold glow */}
      <div className="pointer-events-none absolute -top-10 -left-10 w-28 h-28 rounded-full bg-[#C8A24A]/14 blur-2xl" />

      {/* Top Row: Brand & Golden Prayer Icon inside Progress Ring */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-b from-[#2A2212] to-[#141009] border border-[#E6C66E]/60 flex items-center justify-center text-[#E6C66E] shadow-[0_0_12px_rgba(230,198,110,0.3)] shrink-0">
            <Moon size={14} className="fill-[#E6C66E]" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-extrabold text-[#E6C66E] block truncate">
              الصلاة القادمة
            </span>
            <span className="text-[9px] text-[#C4B998] flex items-center gap-0.5 truncate">
              <MapPin size={9} className="text-[#C8A24A] shrink-0" />
              {state.locationName}
            </span>
          </div>
        </div>

        {/* Circular Gold Gauge */}
        <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
          <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
            <circle
              cx="22"
              cy="22"
              r={radius}
              fill="none"
              stroke="rgba(200, 162, 74, 0.18)"
              strokeWidth="3.2"
            />
            <circle
              cx="22"
              cy="22"
              r={radius}
              fill="none"
              stroke="#E6C66E"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-700"
            />
          </svg>
          <span className="text-[9px] font-mono font-black text-[#F3E5AB] tabular-nums">
            {Math.round(state.progressPercent)}%
          </span>
        </div>
      </div>

      {/* Center: Next Prayer & Countdown */}
      <div className="my-1.5">
        <div className="flex items-baseline justify-between gap-1">
          <h3 className="text-lg font-extrabold text-white font-quran leading-tight">
            صلاة {state.nextPrayerName}
          </h3>
          <span className="text-[10px] font-mono font-bold text-[#E6C66E] tabular-nums">
            {state.nextPrayerTime12}
          </span>
        </div>

        <div className="mt-1 flex items-center justify-between">
          <span className="text-[10px] text-[#C4B998] font-bold">العد التنازلي:</span>
          <span className="text-sm font-mono font-black text-[#E6C66E] tabular-nums tracking-wider">
            -{state.countdownFormatted}
          </span>
        </div>
      </div>

      {/* Bottom: Burnished Gold Linear Progress Bar */}
      <div className="space-y-1">
        <div className="w-full h-2 rounded-full bg-[#1C1810] border border-[#C8A24A]/45 overflow-hidden p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-l from-[#FFF3C4] via-[#E6C66E] to-[#A67C22] shadow-[0_0_10px_rgba(230,198,110,0.85)] transition-all duration-700"
            style={{ width: `${state.progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[8px] text-[#9E9478] font-bold">
          <span>من {state.currentPrayerName}</span>
          <span className="text-[#E6C66E]">إلى {state.nextPrayerName}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * 2. Impact Tree & Daily Wird/Verse Widget (ودجت شجرة الأثر والورد اليومي)
 * Displays the daily spiritual completion percentage with the interactive miniature
 * Golden Tree of Athar (whose leaves & branches illuminate by stage) alongside the Daily Quranic Verse.
 */
export const ImpactTreeWirdWidgetCard: React.FC<WidgetProps> = ({
  state,
  impactBreakdown,
  dailyVerse,
  onClick,
  className = '',
}) => {
  const impact = useMemo(
    () => impactBreakdown || ImpactTreeService.calculateImpact(),
    [impactBreakdown, state.remainingSeconds]
  );

  const chosenVerse = useMemo(() => {
    if (dailyVerse) return dailyVerse;
    const s = StorageService.getSettings();
    const idx = (s.dailyContentSettings?.currentVerseIndex ?? 0) % WIDGET_DAILY_VERSES.length;
    return WIDGET_DAILY_VERSES[idx] || WIDGET_DAILY_VERSES[0];
  }, [dailyVerse]);

  const isLeavesLit = impact.score >= 20;
  const isBranchesLit = impact.score >= 50;
  const isFullBloom = impact.score >= 100;

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#19150D] via-[#0F0D09] to-[#070604] border border-[#C8A24A]/65 p-3.5 shadow-[0_14px_34px_rgba(0,0,0,0.92),0_0_20px_rgba(200,162,74,0.16)] text-right select-none flex flex-col justify-between min-h-[158px] transition-all ${
        onClick ? 'cursor-pointer hover:border-[#E6C66E]' : ''
      } ${className}`}
    >
      {/* Top Row: Miniature Interactive Golden Tree + Score */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-extrabold text-[#E6C66E] flex items-center gap-1">
            <Sparkles size={10} />
            <span>شجرة الأثر والورد اليومي</span>
          </span>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[#C4B998] font-bold">
            <span>إنجاز اليوم:</span>
            <span className="text-[#F3E5AB] font-mono font-black tabular-nums">
              {impact.score}%
            </span>
            <span>·</span>
            <span>{impact.prayersCompletedCount}/5 صلوات</span>
          </div>
        </div>

        {/* Miniature Frameless Golden Tree reacting to daily worship completion */}
        <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
          <div
            className={`absolute inset-0 rounded-full pointer-events-none transition-all duration-700 ${
              isFullBloom
                ? 'bg-[radial-gradient(circle,rgba(255,228,132,0.45)_0%,transparent_72%)] blur-md'
                : isBranchesLit
                ? 'bg-[radial-gradient(circle,rgba(230,198,110,0.28)_0%,transparent_72%)] blur-sm'
                : 'bg-[radial-gradient(circle,rgba(200,162,74,0.12)_0%,transparent_70%)]'
            }`}
          />
          <img
            src={enhancedImpactTree}
            alt="شجرة الأثر والمحراب"
            referrerPolicy="no-referrer"
            className={`w-12 h-12 athar-mihrab-arch object-cover transition-all duration-700 ${
              isFullBloom
                ? 'brightness-125 contrast-125 saturate-125 drop-shadow-[0_0_10px_rgba(255,223,128,0.65)]'
                : isBranchesLit
                ? 'brightness-100 contrast-115 saturate-105 drop-shadow-[0_0_6px_rgba(230,198,110,0.35)]'
                : isLeavesLit
                ? 'brightness-[0.7] contrast-110 saturate-[0.75] opacity-85'
                : 'brightness-[0.45] contrast-105 saturate-[0.4] opacity-60'
            }`}
            style={{
              WebkitMaskImage:
                'radial-gradient(ellipse 68% 68% at 50% 50%, #000 58%, rgba(0,0,0,0.4) 80%, transparent 100%)',
              maskImage:
                'radial-gradient(ellipse 68% 68% at 50% 50%, #000 58%, rgba(0,0,0,0.4) 80%, transparent 100%)',
            }}
          />
        </div>
      </div>

      {/* Middle: Daily Quranic Verse */}
      <div className="my-1.5 py-1.5 px-2.5 rounded-2xl bg-[#120F0A]/90 border border-[#C8A24A]/30">
        <p className="font-quran text-xs sm:text-[13px] text-[#F3E5AB] leading-relaxed">
          ﴿ {chosenVerse.text} ﴾
        </p>
        <div className="flex items-center justify-between text-[9px] text-[#C4B998] mt-1 font-bold">
          <span className="flex items-center gap-1 text-[#E6C66E]">
            <BookOpen size={9} />
            <span>سورة {chosenVerse.surahName} · آية {chosenVerse.ayahNumber}</span>
          </span>
          <span>{impact.isWirdDone ? 'تم الورد ✓' : 'الورد اليومي'}</span>
        </div>
      </div>

      {/* Bottom: Leaf Illumination Progress Bar */}
      <div className="space-y-1">
        <div className="w-full h-1.5 rounded-full bg-[#1C1810] border border-[#C8A24A]/40 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-l from-[#FFF3C4] via-[#E6C66E] to-[#A67C22] shadow-[0_0_8px_rgba(230,198,110,0.8)] transition-all duration-700"
            style={{ width: `${Math.max(8, impact.score)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[8px] text-[#9E9478] font-bold">
          <span>
            {isFullBloom
              ? 'إزهار تام ١٠٠٪'
              : isBranchesLit
              ? 'تفتح الأغصان والبراعم'
              : isLeavesLit
              ? 'إضاءة الأوراق الأولى'
              : 'بذرة الأثر اليومي'}
          </span>
          <span className="text-[#E6C66E] font-mono tabular-nums">{impact.score}%</span>
        </div>
      </div>
    </div>
  );
};

/**
 * 3. Wide Impact Tree & Daily Verse Widget (ودجت شجرة الأثر والورد اليومي الموسّع)
 * Full-width rich version combining the miniature interactive Golden Tree, 3 worship pillars, and Daily Verse.
 */
export const WideImpactTreeWirdWidgetCard: React.FC<WidgetProps> = ({
  state,
  impactBreakdown,
  dailyVerse,
  onClick,
  className = '',
}) => {
  const impact = useMemo(
    () => impactBreakdown || ImpactTreeService.calculateImpact(),
    [impactBreakdown, state.remainingSeconds]
  );

  const chosenVerse = useMemo(() => {
    if (dailyVerse) return dailyVerse;
    const s = StorageService.getSettings();
    const idx = (s.dailyContentSettings?.currentVerseIndex ?? 0) % WIDGET_DAILY_VERSES.length;
    return WIDGET_DAILY_VERSES[idx] || WIDGET_DAILY_VERSES[0];
  }, [dailyVerse]);

  const isLeavesLit = impact.score >= 20;
  const isBranchesLit = impact.score >= 50;
  const isFullBloom = impact.score >= 100;

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden mx-auto w-full rounded-[28px] bg-gradient-to-b from-[#18140C]/98 via-[#0E0C08]/98 to-[#080705]/98 border border-[#C8A24A]/65 p-4 shadow-[0_16px_42px_rgba(0,0,0,0.95),0_0_24px_rgba(200,162,74,0.16)] text-right backdrop-blur-xl space-y-3 select-none transition-all ${
        onClick ? 'cursor-pointer hover:border-[#E6C66E]' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Right side: Info & Pillars */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#F3E5AB] flex items-center gap-1.5">
              <Sparkles size={13} className="text-[#E6C66E]" />
              <span>ودجت شجرة الأثر والورد اليومي</span>
            </span>
            <span className="text-xs font-mono font-black text-[#E6C66E] tabular-nums">
              {impact.score}%
            </span>
          </div>

          {/* 3 Worship Pillars Summary */}
          <div className="flex items-center gap-2 text-[10px] text-[#C4B998] font-bold flex-wrap">
            <span className={impact.prayersCompletedCount === 5 ? 'text-[#E6C66E]' : ''}>
              الفرائض ({impact.prayersCompletedCount}/5)
            </span>
            <span>·</span>
            <span className={impact.isMorningAdhkarDone || impact.isEveningAdhkarDone ? 'text-[#E6C66E]' : ''}>
              الأذكار ({impact.adhkarScore}/20%)
            </span>
            <span>·</span>
            <span className={impact.isWirdDone ? 'text-[#E6C66E]' : ''}>
              الورد ({impact.quranScore}/20%)
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-[#1C1810] border border-[#C8A24A]/45 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-l from-[#FFF3C4] via-[#E6C66E] to-[#A67C22] shadow-[0_0_12px_rgba(230,198,110,0.85)] transition-all duration-700"
              style={{ width: `${Math.max(6, impact.score)}%` }}
            />
          </div>
        </div>

        {/* Left side: Interactive Miniature Golden Tree */}
        <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
          <div
            className={`absolute inset-0 rounded-full pointer-events-none transition-all duration-700 ${
              isFullBloom
                ? 'bg-[radial-gradient(circle,rgba(255,228,132,0.5)_0%,transparent_72%)] blur-md'
                : isBranchesLit
                ? 'bg-[radial-gradient(circle,rgba(230,198,110,0.3)_0%,transparent_72%)] blur-sm'
                : 'bg-[radial-gradient(circle,rgba(200,162,74,0.14)_0%,transparent_70%)]'
            }`}
          />
          <img
            src={enhancedImpactTree}
            alt="شجرة الأثر والمحراب"
            referrerPolicy="no-referrer"
            className={`w-16 h-16 athar-mihrab-arch object-cover transition-all duration-700 ${
              isFullBloom
                ? 'brightness-125 contrast-125 saturate-125 drop-shadow-[0_0_12px_rgba(255,223,128,0.7)]'
                : isBranchesLit
                ? 'brightness-100 contrast-115 saturate-105 drop-shadow-[0_0_8px_rgba(230,198,110,0.4)]'
                : isLeavesLit
                ? 'brightness-[0.7] contrast-110 saturate-[0.75] opacity-85'
                : 'brightness-[0.45] contrast-105 saturate-[0.4] opacity-60'
            }`}
            style={{
              WebkitMaskImage:
                'radial-gradient(ellipse 68% 68% at 50% 50%, #000 58%, rgba(0,0,0,0.4) 80%, transparent 100%)',
              maskImage:
                'radial-gradient(ellipse 68% 68% at 50% 50%, #000 58%, rgba(0,0,0,0.4) 80%, transparent 100%)',
            }}
          />
        </div>
      </div>

      {/* Daily Verse Banner inside the Widget */}
      <div className="p-3 rounded-2xl bg-[#120F0A]/95 border border-[#C8A24A]/35 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] text-[#E6C66E] font-extrabold mb-1">
            <BookOpen size={11} />
            <span>الآية اليومية · سورة {chosenVerse.surahName} ({chosenVerse.ayahNumber})</span>
          </div>
          <p className="font-quran text-sm sm:text-base text-[#F3E5AB] leading-relaxed">
            ﴿ {chosenVerse.text} ﴾
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * 4. Circular & Daily Athar Gauge Lock Screen Accessory Widget (ودجت شاشة القفل الدائرية وإنجاز اليوم)
 */
export const LockScreenAccessoryWidgetCard: React.FC<WidgetProps> = ({
  state,
  todayCompletedPrayersCount = 0,
  streakDays = 0,
  onClick,
  className = '',
}) => {
  const prayerPct = Math.min(100, Math.round((todayCompletedPrayersCount / 5) * 100));
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (prayerPct / 100) * circumference;

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#19150D] via-[#0F0D09] to-[#070604] border border-[#C8A24A]/55 p-3.5 shadow-[0_14px_34px_rgba(0,0,0,0.92)] text-right select-none flex flex-col justify-between min-h-[158px] transition-all ${
        onClick ? 'cursor-pointer hover:border-[#E6C66E]' : ''
      } ${className}`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] font-extrabold text-[#E6C66E] flex items-center gap-1">
            <Sparkles size={10} />
            <span>عداد فرائض اليوم</span>
          </span>
          <span className="text-[9px] text-[#C4B998] block mt-0.5 truncate">
            {state.dateHijri}
          </span>
        </div>

        {/* Circular Completion Ring */}
        <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
          <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
            <circle
              cx="22"
              cy="22"
              r={radius}
              fill="none"
              stroke="rgba(200, 162, 74, 0.18)"
              strokeWidth="3.2"
            />
            <circle
              cx="22"
              cy="22"
              r={radius}
              fill="none"
              stroke="#E6C66E"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-700"
            />
          </svg>
          <span className="text-[10px] font-mono font-black text-[#F3E5AB] tabular-nums">
            {todayCompletedPrayersCount}/5
          </span>
        </div>
      </div>

      {/* Middle Status */}
      <div className="my-1.5 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#F3E5AB] font-extrabold">الصلوات الخمس</span>
          <span className="text-[10px] font-bold text-[#E6C66E] flex items-center gap-1">
            <Flame size={11} className="text-[#E6C66E]" />
            <span>{streakDays} يوم التزام</span>
          </span>
        </div>
        <p className="text-[10px] text-[#C4B998] leading-snug">
          {todayCompletedPrayersCount >= 5
            ? 'ما شاء الله! أتممت الصلوات الخمس اليوم بنور وخشوع ✓'
            : `الصلاة القادمة: ${state.nextPrayerName} (${state.nextPrayerTime12})`}
        </p>
      </div>

      {/* Bottom Progress Bar */}
      <div className="space-y-1">
        <div className="w-full h-2 rounded-full bg-[#1C1810] border border-[#C8A24A]/40 overflow-hidden p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-l from-[#FFF3C4] via-[#E6C66E] to-[#A67C22] transition-all duration-700"
            style={{ width: `${Math.max(8, prayerPct)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[8px] text-[#9E9478] font-bold">
          <span>يتجدد تلقائياً 12:00 ص</span>
          <span className="text-[#E6C66E] font-mono">{prayerPct}%</span>
        </div>
      </div>
    </div>
  );
};

/**
 * 5. Medium Prayer Time Widget (ودجت مواقيت الصلاة المتوسط - Medium)
 * Displays the next prayer, live digital countdown, annotated gold progress bar,
 * and the complete daily prayer table.
 */
export const MediumPrayerWidgetCard: React.FC<WidgetProps> = ({
  state,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden mx-auto w-full rounded-[28px] bg-gradient-to-b from-[#18140C]/98 via-[#0E0C08]/98 to-[#080705]/98 border border-[#C8A24A]/65 p-4 shadow-[0_16px_42px_rgba(0,0,0,0.95),0_0_24px_rgba(200,162,74,0.16)] text-right backdrop-blur-xl space-y-3 select-none transition-all ${
        onClick ? 'cursor-pointer hover:border-[#E6C66E]' : ''
      } ${className}`}
    >
      {/* Ambient Top Gold Shimmer */}
      <div className="pointer-events-none absolute -top-12 right-10 w-44 h-24 rounded-full bg-[#C8A24A]/10 blur-2xl" />

      {/* Widget Top Header */}
      <div className="flex items-center justify-between border-b border-[#C8A24A]/25 pb-2.5">
        <div className="flex items-center gap-2">
          <AtharBrandLogo size="xs" showWordmark={false} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold text-[#F3E5AB]">
                ودجت مواقيت الصلاة المتوسط
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[#C4B998] mt-0.5">
              <span className="flex items-center gap-0.5">
                <MapPin size={10} className="text-[#C8A24A]" />
                {state.locationName}
              </span>
              <span>·</span>
              <span className="flex items-center gap-0.5 text-[#E6C66E]">
                <WifiOff size={9} />
                <span>فلكي محلي بدون إنترنت</span>
              </span>
            </div>
          </div>
        </div>

        <span className="text-xs font-mono font-extrabold text-[#E6C66E] flex items-center gap-1 tabular-nums">
          <Clock size={12} />
          <span>{state.nextPrayerTime12}</span>
        </span>
      </div>

      {/* Next Prayer & Live Countdown Display */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold text-[#C4B998] block">
            الصلاة القادمة ({state.dateHijri})
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-quran mt-0.5">
            صلاة {state.nextPrayerName}
          </h2>
        </div>

        <div className="text-left bg-[#14110A] border border-[#C8A24A]/50 px-4 py-2 rounded-2xl shadow-inner">
          <span className="text-[10px] font-bold text-[#C4B998] block text-center">
            متبقي للأذان
          </span>
          <span className="text-xl sm:text-2xl font-mono font-black text-[#E6C66E] tabular-nums tracking-wider block">
            -{state.countdownFormatted}
          </span>
        </div>
      </div>

      {/* Golden Progress Bar between Current Prayer and Next Prayer */}
      <div className="space-y-1.5 pt-0.5">
        <div className="flex items-center justify-between text-[10px] font-bold">
          <span className="text-[#C4B998]">
            من: <strong className="text-[#F3E5AB]">{state.currentPrayerName}</strong> ({state.currentPrayerTime12})
          </span>
          <span className="text-[#E6C66E] font-mono font-extrabold tabular-nums">
            {Math.round(state.progressPercent)}% انقضى
          </span>
          <span className="text-[#C4B998]">
            إلى: <strong className="text-[#E6C66E]">{state.nextPrayerName}</strong> ({state.nextPrayerTime12})
          </span>
        </div>

        <div className="relative w-full h-2.5 rounded-full bg-[#1C1810] border border-[#C8A24A]/45 overflow-hidden p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-l from-[#FFF3C4] via-[#E6C66E] to-[#A67C22] shadow-[0_0_15px_rgba(230,198,110,0.85)] transition-all duration-700"
            style={{ width: `${state.progressPercent}%` }}
          />
        </div>
      </div>

      {/* Daily 6-Stage Prayer Table */}
      <div className="grid grid-cols-6 gap-1.5 pt-1">
        {state.segments.map((seg) => (
          <div
            key={seg.id}
            className={`rounded-xl py-1.5 px-1 text-center border transition-all ${
              seg.isNext
                ? 'bg-gradient-to-b from-[#2E2513] to-[#171209] border-[#E6C66E] text-[#F3E5AB] shadow-[0_0_12px_rgba(230,198,110,0.3)] scale-[1.03]'
                : seg.isPassed
                ? 'bg-[#0D0B08]/90 border-[#C8A24A]/20 text-[#8A8068]'
                : 'bg-[#12100B] border-[#C8A24A]/30 text-[#C4B998]'
            }`}
          >
            <div className="flex items-center justify-center gap-0.5">
              {seg.isPassed && <CheckCircle2 size={9} className="text-[#C8A24A]" />}
              <span className="text-[10px] font-extrabold block truncate">
                {seg.nameArabic}
              </span>
            </div>
            <span className="text-[9px] font-mono tabular-nums block mt-0.5">
              {seg.time24}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * 6. Pre-Adhan (15-20m) to Iqamah Live Activity Card (بطاقة النشاط الحي لشاشة القفل والـ Dynamic Island)
 * Appears when approaching prayer time (15-20 minutes before Adhan) and tracks the countdown in minutes
 * with a burnished golden progress bar all the way until Iqamah time.
 */
export const PreAdhanIqamahLiveCard: React.FC<{
  state: LiveActivityState;
  forcePreview?: boolean;
  onTriggerAdhanPreview?: () => void;
  className?: string;
}> = ({ state, forcePreview = false, onTriggerAdhanPreview, className = '' }) => {
  const isLive = state.liveCardPhase !== 'idle' || forcePreview;
  if (!isLive) return null;

  const isAwaitingIqamah = state.liveCardPhase === 'awaiting_iqamah';
  const effectiveProgress =
    state.liveCardPhase === 'idle'
      ? Math.max(38, state.progressPercent)
      : state.liveCardGoldenProgressPercent;

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] bg-gradient-to-b from-[#1E180D]/98 via-[#110E08]/98 to-[#070604]/98 border-2 border-[#E6C66E]/75 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.95),0_0_28px_rgba(230,198,110,0.25)] text-right select-none space-y-3 ${className}`}
    >
      {/* Top Live Activity Status Row */}
      <div className="flex items-center justify-between border-b border-[#C8A24A]/30 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-b from-[#2E2513] to-[#171209] border border-[#E6C66E]/65 flex items-center justify-center text-[#E6C66E] shadow-[0_0_15px_rgba(230,198,110,0.35)]">
            <BellRing size={15} />
          </div>
          <div>
            <span className="text-xs font-extrabold text-[#F3E5AB] block">
              {isAwaitingIqamah
                ? `حان وقت الأذان · انتظار إقامة صلاة ${state.liveCardActivePrayerName}`
                : `اقترب موعد صلاة ${state.liveCardActivePrayerName} · تنبيه حي`}
            </span>
            <span className="text-[10px] text-[#C4B998] block mt-0.5">
              الأذان: {state.liveCardAdhanTime12} · الإقامة: {state.liveCardIqamahTime12} (بعد {state.liveCardIqamahOffsetMinutes} د)
            </span>
          </div>
        </div>

        {onTriggerAdhanPreview && (
          <button
            onClick={onTriggerAdhanPreview}
            className="px-2.5 py-1.5 rounded-xl bg-[#261F11] hover:bg-[#332A17] border border-[#E6C66E]/60 text-[10px] font-extrabold text-[#F3E5AB] whitespace-nowrap shrink-0 transition-colors"
          >
            معاينة شاشة الأذان
          </button>
        )}
      </div>

      {/* Main Countdown in Minutes & Seconds */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold text-[#E6C66E] block">
            {isAwaitingIqamah ? 'العد التنازلي لإقامة الصلاة' : 'العد التنازلي لرفع الأذان'}
          </span>
          <h3 className="text-xl sm:text-2xl font-extrabold text-white font-quran mt-0.5">
            صلاة {state.liveCardActivePrayerName}
          </h3>
          <p className="text-[11px] text-[#C4B998] mt-0.5">
            {isAwaitingIqamah
              ? 'ردد خلف المؤذن وسل الله الوسيلة للنبي ﷺ'
              : `تبقى ${state.liveCardMinutesRemaining} دقيقة على رفع الأذان`}
          </p>
        </div>

        <div className="text-left bg-[#16120B] border border-[#E6C66E]/60 px-4 py-2.5 rounded-2xl shadow-inner">
          <span className="text-[10px] font-bold text-[#C4B998] block text-center">
            {isAwaitingIqamah ? 'متبقي للإقامة' : 'متبقي للأذان'}
          </span>
          <span className="text-2xl font-mono font-black text-[#E6C66E] tabular-nums tracking-wider block">
            -{state.liveCardCountdownMMSS}
          </span>
        </div>
      </div>

      {/* Golden Progress Track from Pre-Adhan (-20m) -> Adhan -> Iqamah */}
      <div className="space-y-1.5 pt-0.5">
        <div className="flex items-center justify-between text-[10px] font-bold">
          <span className="text-[#C4B998]">قبل الأذان بـ {state.settings.preAdhanLeadMinutes} د</span>
          <span className={isAwaitingIqamah ? 'text-[#F3E5AB] font-extrabold' : 'text-[#E6C66E]'}>
            الأذان ({state.liveCardAdhanTime12})
          </span>
          <span className="text-[#E6C66E] font-extrabold">
            الإقامة ({state.liveCardIqamahTime12})
          </span>
        </div>

        {/* Continuous Golden Progress Bar with Adhan Milestone Marker */}
        <div className="relative w-full h-3 rounded-full bg-[#1C1810] border border-[#C8A24A]/55 overflow-hidden p-0.5">
          {/* Adhan Midpoint Marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#F3E5AB]/70 z-10"
            style={{
              right: `${Math.round(
                (state.settings.preAdhanLeadMinutes /
                  Math.max(1, state.settings.preAdhanLeadMinutes + state.liveCardIqamahOffsetMinutes)) *
                  100
              )}%`,
            }}
          />
          <div
            className="h-full rounded-full bg-gradient-to-l from-[#FFF5C8] via-[#E6C66E] to-[#B88A2D] shadow-[0_0_16px_rgba(230,198,110,0.9)] transition-all duration-700"
            style={{ width: `${effectiveProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

