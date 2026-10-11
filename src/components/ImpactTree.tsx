import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Lottie, type LottieHandle } from 'lottie-react';
import confetti from 'canvas-confetti';
import { 
  Sparkles, Trophy, CheckCircle2, ChevronDown, ChevronUp, 
  RotateCcw, Info, Heart, BookOpen, Sun, Moon, Volume2, 
  Check, ArrowUpRight, Flame, ShieldCheck, Pause, Play
} from 'lucide-react';
import { ImpactTreeService, ImpactBreakdown } from '../services/impactTreeService';
import { StorageService } from '../services/storageService';
import { getAmbientGoldLottie, getCelebrationBurstLottie } from './impactTreeLottieData';
import { NavigationTab } from '../types';
import isolatedGoldenTree from '../assets/images/isolated_golden_tree_1791717752617.jpg';

interface ImpactTreeProps {
  onNavigate?: (tab: NavigationTab) => void;
  onOpenQuickAdhkar?: (category: 'morning' | 'evening') => void;
  onOpenWirdModal?: () => void;
}

export const ImpactTree: React.FC<ImpactTreeProps> = ({
  onNavigate,
  onOpenQuickAdhkar,
  onOpenWirdModal
}) => {
  const [data, setData] = useState<ImpactBreakdown>(() => ImpactTreeService.calculateImpact());
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [isAnimationPlaying, setIsAnimationPlaying] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return false;
    }
    return true;
  });
  const prevScoreRef = useRef<number>(data.score);
  const ambientLottieRef = useRef<LottieHandle>(null);
  const burstLottieRef = useRef<LottieHandle>(null);

  // Sync animation play/pause state
  useEffect(() => {
    if (isAnimationPlaying) {
      ambientLottieRef.current?.play();
    } else {
      ambientLottieRef.current?.pause();
      burstLottieRef.current?.pause();
    }
  }, [isAnimationPlaying]);

  const toggleAnimation = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsAnimationPlaying(prev => {
      const next = !prev;
      if (next) {
        ambientLottieRef.current?.play();
      } else {
        ambientLottieRef.current?.pause();
        burstLottieRef.current?.pause();
      }
      return next;
    });
  };

  // Refresh data whenever any relevant event fires across the app
  const refreshTree = () => {
    const updated = ImpactTreeService.calculateImpact();
    setData(updated);

    // Check if user just achieved 100%
    if (updated.score >= 100 && prevScoreRef.current < 100) {
      triggerMilestoneCelebration();
    }
    prevScoreRef.current = updated.score;
  };

  const triggerMilestoneCelebration = () => {
    if (!isAnimationPlaying) return;
    setShowCelebration(true);
    try {
      confetti({
        particleCount: 55,
        spread: 70,
        origin: { y: 0.3 },
        colors: ['#D4AF37', '#F3E5AB', '#FFE082', '#FFF8E1']
      });
    } catch {}
    setTimeout(() => setShowCelebration(false), 5000);
  };

  useEffect(() => {
    refreshTree();

    const handleUpdate = () => refreshTree();

    window.addEventListener('athar_impact_updated', handleUpdate);
    window.addEventListener('athar_prayers_updated', handleUpdate);
    window.addEventListener('athar_adhkar_updated', handleUpdate);
    window.addEventListener('athar_khatmah_updated', handleUpdate);
    window.addEventListener('athar_wird_updated', handleUpdate);
    window.addEventListener('athar_audio_updated', handleUpdate);

    return () => {
      window.removeEventListener('athar_impact_updated', handleUpdate);
      window.removeEventListener('athar_prayers_updated', handleUpdate);
      window.removeEventListener('athar_adhkar_updated', handleUpdate);
      window.removeEventListener('athar_khatmah_updated', handleUpdate);
      window.removeEventListener('athar_wird_updated', handleUpdate);
      window.removeEventListener('athar_audio_updated', handleUpdate);
    };
  }, []);

  // Lottie datasets
  const ambientLottieData = useMemo(() => getAmbientGoldLottie(data.stage), [data.stage]);
  const burstLottieData = useMemo(() => getCelebrationBurstLottie(), []);

  // Quick toggle prayer right from tree details
  const handleTogglePrayer = (prayerKey: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'sunan' | 'qiyam', e?: React.MouseEvent) => {
    e?.stopPropagation();
    StorageService.toggleTodayPrayer(prayerKey);
    refreshTree();
  };

  // Quick toggle adhkar
  const handleToggleAdhkar = (category: 'morning' | 'evening', e?: React.MouseEvent) => {
    e?.stopPropagation();
    const isDone = category === 'morning' ? data.isMorningAdhkarDone : data.isEveningAdhkarDone;
    if (!isDone) {
      StorageService.recordSessionCompleted(category);
    }
    refreshTree();
  };

  // Stage checks
  const isLeavesStage = data.score >= 20; // 20%: إضاءة الأوراق الأولى
  const isBranchesStage = data.score >= 50; // 50%: نمو أغصان جديدة وبراعم
  const isFullBloomStage = data.score >= 100; // 100%: إزهار الشجرة بالكامل وتوهج ذهبي دافئ

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-[#17140D] via-[#0E0D0A] to-[#080705] border border-[#C8A24A]/45 rounded-3xl p-4 sm:p-5 shadow-[0_12px_35px_rgba(0,0,0,0.85)] transition-all select-none">

      {/* Header: Title, Stage Badge, Animation Pause/Play Affordance (WCAG 2.2.2) & Progress Percentage */}
      <div className="relative z-10 flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl border transition-all ${
            isFullBloomStage 
              ? 'bg-[#C8A24A]/25 text-[#E6C66E] border-[#E6C66E]/70 shadow-[0_0_12px_rgba(200,162,74,0.4)]' 
              : 'bg-[#1A160E] text-[#E6C66E] border-[#C8A24A]/40'
          }`}>
            <Sparkles size={16} className={isFullBloomStage && isAnimationPlaying ? 'animate-spin-slow' : ''} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold text-[#F3E5AB] font-quran tracking-wide">
                شجرة الأثر
              </h2>
              {data.stageLabel && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                  isFullBloomStage 
                    ? 'bg-[#C8A24A]/25 text-[#F3E5AB] border-[#E6C66E]/60' 
                    : 'bg-[#C8A24A]/15 text-[#E6C66E] border-[#C8A24A]/40'
                }`}>
                  {data.stageLabel}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#C4B998] font-medium">
              تنمو وتزهر بصلواتك ووردك وأذكارك اليومية
            </p>
          </div>
        </div>

        {/* Controls: Pause Affordance (WCAG 2.2.2 Level A) & Score Pill */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleAnimation}
            className={`px-2 py-1 rounded-xl border text-[10px] font-bold transition-all flex items-center gap-1.5 active:scale-95 ${
              isAnimationPlaying
                ? 'bg-[#14120D] hover:bg-[#1E1A12] text-[#C4B998] border-[#C8A24A]/35'
                : 'bg-[#C8A24A]/25 text-[#E6C66E] border-[#E6C66E]/60 shadow-[0_0_10px_rgba(200,162,74,0.25)]'
            }`}
            title={isAnimationPlaying ? "إيقاف حركة وأنيميشن الشجرة مؤقتاً (معيار الوصول WCAG 2.2.2)" : "استئناف حركة وأنيميشن الشجرة"}
            aria-label={isAnimationPlaying ? "إيقاف الحركة والأنيميشن مؤقتاً" : "استئناف حركة وأنيميشن الشجرة"}
          >
            {isAnimationPlaying ? (
              <>
                <Pause size={12} className="text-[#E6C66E]" />
                <span className="hidden sm:inline text-[#F3E5AB]">إيقاف الحركة</span>
              </>
            ) : (
              <>
                <Play size={12} className="text-[#E6C66E] fill-[#E6C66E]" />
                <span className="text-[#E6C66E] font-bold">تشغيل الحركة</span>
              </>
            )}
          </button>

          {/* Score & Streak Pill */}
          <div className="text-left px-2.5 py-1 rounded-2xl bg-[#14120D] border border-[#C8A24A]/40 flex items-baseline gap-1">
            <span className={`text-base font-black font-mono tabular-nums ${
              isFullBloomStage ? 'text-[#E6C66E] drop-shadow-[0_0_6px_rgba(200,162,74,0.6)]' : 'text-[#F3E5AB]'
            }`}>
              {data.score}٪
            </span>
            <span className="text-[9px] text-[#C4B998]">اليوم</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Tree Showcase Area — Pure Standalone Tree with Subtle 20% Glow */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className="relative z-10 my-2 py-2 flex flex-col items-center justify-center cursor-pointer group"
        title="اضغط لعرض تفاصيل رعاية الشجرة وسجل الطاعات"
      >
        {/* 100% Celebration Burst Animation */}
        {showCelebration && isAnimationPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="w-64 h-64">
              <Lottie 
                lottieRef={burstLottieRef}
                src={burstLottieData} 
                loop={false} 
                autoplay={false}
                subscriptions={{
                  ready: () => {
                    burstLottieRef.current?.play();
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Subtle 20% Ambient Golden Glow Behind the Standalone Tree */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 rounded-full bg-[#D6B36A]/20 blur-2xl pointer-events-none transition-opacity duration-700"
        />

        {/* Standalone Golden Tree Only (No Mihrab, No Frame, No Background Box) */}
        <img
          src={isolatedGoldenTree}
          alt="شجرة الأثر"
          referrerPolicy="no-referrer"
          className={`relative z-10 w-64 sm:w-72 h-64 sm:h-72 object-contain object-center mix-blend-screen select-none pointer-events-none drop-shadow-[0_0_18px_rgba(214,179,106,0.2)] transition-all duration-700 group-hover:scale-[1.02] active:scale-[0.98] ${
            isFullBloomStage
              ? 'opacity-100 brightness-105 contrast-115 saturate-110'
              : isBranchesStage
              ? 'opacity-80 brightness-90 contrast-110 saturate-95'
              : isLeavesStage
              ? 'opacity-50 brightness-75 contrast-110 saturate-75'
              : 'opacity-35 brightness-65 contrast-105 saturate-60'
          }`}
        />

        {/* Milestone Indicator Badges (0% -> 20% -> 50% -> 100%) */}
        <div className="relative z-10 flex items-center justify-center gap-1.5 mt-1">
          <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 border transition-all ${
            data.score >= 20 
              ? 'bg-[#C8A24A]/20 border-[#C8A24A]/55 text-[#E6C66E] font-bold' 
              : 'bg-[#14120D] border-[#C8A24A]/20 text-[#8E8268]'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            ٢٠٪ إضاءة الأوراق
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 border transition-all ${
            data.score >= 50 
              ? 'bg-[#C8A24A]/20 border-[#C8A24A]/55 text-[#E6C66E] font-bold' 
              : 'bg-[#14120D] border-[#C8A24A]/20 text-[#8E8268]'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            ٥٠٪ الأغصان والبراعم
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 border transition-all ${
            data.score >= 100 
              ? 'bg-[#C8A24A]/30 border-[#E6C66E] text-[#F3E5AB] font-bold shadow-[0_0_8px_rgba(200,162,74,0.4)]' 
              : 'bg-[#14120D] border-[#C8A24A]/20 text-[#8E8268]'
          }`}>
            <Sparkles size={10} />
            ١٠٠٪ الإزهار التام
          </span>
        </div>
      </div>

      {/* Dynamic Inspirational Islamic Text Under the Tree */}
      <div className="relative z-10 mt-3 p-3.5 bg-[#14120D] border border-[#C8A24A]/35 rounded-2xl text-center space-y-1.5 shadow-md">
        <p className="text-xs sm:text-[13px] font-bold text-[#F3E5AB] font-quran leading-relaxed">
          {data.inspirationalQuote}
        </p>
        <p className="text-[11px] text-[#C4B998] leading-normal">
          {data.inspirationalSubtitle}
        </p>

        {/* Expand / Collapse Action button */}
        <button
          onClick={() => setIsExpanded(prev => !prev)}
          className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[#E6C66E] hover:underline pt-0.5"
        >
          <span>{isExpanded ? 'إخفاء تفاصيل رعاية الشجرة' : 'عرض سجل الإنجاز وسقي الشجرة'}</span>
          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Expandable Interactive Deed Checklist & Nurturing Center */}
      {isExpanded && (
        <div className="relative z-10 mt-3.5 pt-3.5 border-t border-[#C8A24A]/25 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between text-xs text-[#F3E5AB] px-1">
            <span className="font-bold flex items-center gap-1.5">
              <Trophy size={14} className="text-[#E6C66E]" />
              <span>أركان غراس شجرة أثرك اليوم:</span>
            </span>
            <span className="text-[10px] text-[#E6C66E] font-mono font-bold">
              {data.score} / ١٠٠ نقطة بركة
            </span>
          </div>

          {/* 1. Obligatory Prayers Strip (الصلوات الخمس) */}
          <div className="p-3 bg-[#14120D] border border-[#C8A24A]/35 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-[#F3E5AB] flex items-center gap-1">
                <Sun size={12} className="text-[#E6C66E]" />
                الصلوات الخمس المفروضة (١٢٪ لكل صلاة):
              </span>
              <span className="text-[#E6C66E] font-bold font-mono">
                {data.prayersCompletedCount}/٥ مكتملة ({data.prayersScore}٪)
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {[
                { id: 'fajr', label: 'الفجر', done: data.isFajrDone },
                { id: 'dhuhr', label: 'الظهر', done: data.isDhuhrDone },
                { id: 'asr', label: 'العصر', done: data.isAsrDone },
                { id: 'maghrib', label: 'المغرب', done: data.isMaghribDone },
                { id: 'isha', label: 'العشاء', done: data.isIshaDone }
              ].map(prayer => (
                <button
                  key={prayer.id}
                  onClick={(e) => handleTogglePrayer(prayer.id as any, e)}
                  className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] transition-all border active:scale-95 ${
                    prayer.done 
                      ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#F3E5AB] font-extrabold shadow-sm' 
                      : 'bg-[#0A0907] border-[#C8A24A]/25 text-[#C4B998] hover:border-[#C8A24A]/60'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    prayer.done ? 'bg-[#E6C66E] text-[#080705] font-bold' : 'border border-[#C8A24A]/40 text-transparent'
                  }`}>
                    ✓
                  </div>
                  <span>{prayer.label}</span>
                </button>
              ))}
            </div>

            {/* Sunan & Qiyam Bonus Pills */}
            <div className="flex items-center justify-between pt-1 text-[10px] text-[#C4B998] border-t border-[#C8A24A]/20">
              <span className="text-[10px]">بركة السنن والقيام (+٥٪ إضافية):</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => handleTogglePrayer('sunan', e)}
                  className={`px-2 py-0.5 rounded-lg border text-[10px] transition-all ${
                    data.isSunanDone 
                      ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#F3E5AB] font-bold' 
                      : 'bg-[#0A0907] border-[#C8A24A]/25 text-[#8E8268]'
                  }`}
                >
                  {data.isSunanDone ? 'السنن ✓' : '+ السنن'}
                </button>
                <button
                  onClick={(e) => handleTogglePrayer('qiyam', e)}
                  className={`px-2 py-0.5 rounded-lg border text-[10px] transition-all ${
                    data.isQiyamDone 
                      ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#F3E5AB] font-bold' 
                      : 'bg-[#0A0907] border-[#C8A24A]/25 text-[#8E8268]'
                  }`}
                >
                  {data.isQiyamDone ? 'القيام ✓' : '+ القيام'}
                </button>
              </div>
            </div>
          </div>

          {/* 2. Adhkar & Wird Rows (الأذكار والورد القرآني) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* Morning & Evening Adhkar Card */}
            <div className="p-3 bg-[#14120D] border border-[#C8A24A]/35 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#F3E5AB] flex items-center gap-1.5 text-[11px]">
                  <Moon size={12} className="text-[#E6C66E]" />
                  أذكار الصباح والمساء (٢٠٪)
                </span>
                <span className="text-[#E6C66E] font-bold font-mono text-[11px]">
                  {data.adhkarScore}٪
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => handleToggleAdhkar('morning', e)}
                  className={`flex-1 p-2 rounded-xl border flex items-center justify-between text-[11px] transition-all active:scale-95 ${
                    data.isMorningAdhkarDone
                      ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#F3E5AB] font-bold'
                      : 'bg-[#0A0907] border-[#C8A24A]/25 text-[#C4B998]'
                  }`}
                >
                  <span>أذكار الصباح</span>
                  <span>{data.isMorningAdhkarDone ? '✓ تمت' : 'تسجيل'}</span>
                </button>

                <button
                  onClick={(e) => handleToggleAdhkar('evening', e)}
                  className={`flex-1 p-2 rounded-xl border flex items-center justify-between text-[11px] transition-all active:scale-95 ${
                    data.isEveningAdhkarDone
                      ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#F3E5AB] font-bold'
                      : 'bg-[#0A0907] border-[#C8A24A]/25 text-[#C4B998]'
                  }`}
                >
                  <span>أذكار المساء</span>
                  <span>{data.isEveningAdhkarDone ? '✓ تمت' : 'تسجيل'}</span>
                </button>
              </div>
            </div>

            {/* Quran Wird & Recitation Card */}
            <div className="p-3 bg-[#14120D] border border-[#C8A24A]/35 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#F3E5AB] flex items-center gap-1.5 text-[11px]">
                  <BookOpen size={12} className="text-[#E6C66E]" />
                  الورد القرآني والتلاوة (٢٠٪)
                </span>
                <span className="text-[#E6C66E] font-bold font-mono text-[11px]">
                  {data.quranScore}٪
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenWirdModal ? onOpenWirdModal() : onNavigate?.('quran')}
                  className={`flex-1 p-2 rounded-xl border flex items-center justify-between text-[11px] transition-all active:scale-95 ${
                    data.isWirdDone
                      ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#F3E5AB] font-bold'
                      : 'bg-[#0A0907] border-[#C8A24A]/25 text-[#C4B998] hover:border-[#E6C66E]'
                  }`}
                >
                  <span className="truncate">
                    {data.isWirdDone ? 'الورد مكتمل ✓' : 'فتح الورد اليومي'}
                  </span>
                  <ArrowUpRight size={12} />
                </button>

                <button
                  onClick={() => onNavigate?.('quran')}
                  className="px-2.5 py-2 rounded-xl bg-[#0A0907] hover:bg-[#1E1A12] border border-[#C8A24A]/30 text-[#E6C66E] font-bold text-[11px] shrink-0"
                  title="تلاوة واستماع المصحف"
                >
                  المصحف
                </button>
              </div>
            </div>
          </div>

          {/* Milestone Congratulation Banner at 100% */}
          {isFullBloomStage && (
            <div className="p-3 bg-gradient-to-r from-[#231D11] via-[#17130C] to-[#231D11] border border-[#E6C66E]/60 rounded-2xl flex items-center justify-between gap-2 shadow-inner">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-[#E6C66E] text-[#080705] font-bold shrink-0">
                  <Trophy size={14} />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-[#F3E5AB]">
                    مبارك! أزهرت شجرة أثرك بالكامل اليوم
                  </p>
                  <p className="text-[10px] text-[#C4B998]">
                    حافظ على هذا الغراس المبارك بمواظبة صلواتك وأذكارك غداً
                  </p>
                </div>
              </div>
              <button
                onClick={triggerMilestoneCelebration}
                className="athar-btn-primary px-2.5 py-1.5 rounded-xl text-[10px] shrink-0"
              >
                احتفال ✨
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
