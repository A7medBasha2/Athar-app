import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Lottie, type LottieHandle } from 'lottie-react';
import confetti from 'canvas-confetti';
import { 
  Sparkles, Trophy, CheckCircle2, ChevronDown, ChevronUp, 
  RotateCcw, Info, Heart, BookOpen, Sun, Moon, Volume2, 
  Check, ArrowUpRight, Flame, ShieldCheck, Pause, Play, Clock
} from 'lucide-react';
import { ImpactTreeService, ImpactBreakdown } from '../services/impactTreeService';
import { StorageService } from '../services/storageService';
import { getAmbientGoldLottie, getCelebrationBurstLottie } from './impactTreeLottieData';
import { NavigationTab } from '../types';
import enhancedImpactTree from '../assets/images/enhanced_impact_tree_luminous.png';

// Dynamic Time of Day Palette Types & Configurations
export type TimeOfDayPeriod = 'fajr' | 'day' | 'maghrib' | 'night';

export interface BlossomPoint {
  id: number;
  x: number; // percentage from left inside the niche
  y: number; // percentage from top inside the niche
  size: number; // base size in px
  milestone: 25 | 50 | 75 | 100; // required score %
  rotation: number; // angle in degrees
  delayMs: number;
}

export const GOLDEN_BLOSSOMS: BlossomPoint[] = [
  // 25% milestone (2 early delicate buds on main outer branches)
  { id: 1, x: 41, y: 45, size: 12, milestone: 25, rotation: -12, delayMs: 120 },
  { id: 2, x: 59, y: 44, size: 12, milestone: 25, rotation: 16, delayMs: 240 },

  // 50% milestone (2 more buds opening on mid branches)
  { id: 3, x: 35, y: 38, size: 13, milestone: 50, rotation: -24, delayMs: 180 },
  { id: 4, x: 65, y: 37, size: 13, milestone: 50, rotation: 22, delayMs: 320 },

  // 75% milestone (3 blossoms expanding across mid and upper canopy)
  { id: 5, x: 50, y: 31, size: 14, milestone: 75, rotation: 5, delayMs: 150 },
  { id: 6, x: 30, y: 49, size: 12, milestone: 75, rotation: -30, delayMs: 280 },
  { id: 7, x: 70, y: 48, size: 12, milestone: 75, rotation: 28, delayMs: 360 },

  // 100% milestone (5 crowning blossoms completing full radiant bloom)
  { id: 8, x: 43, y: 24, size: 15, milestone: 100, rotation: -8, delayMs: 100 },
  { id: 9, x: 57, y: 25, size: 15, milestone: 100, rotation: 14, delayMs: 220 },
  { id: 10, x: 50, y: 41, size: 14, milestone: 100, rotation: 0, delayMs: 340 },
  { id: 11, x: 25, y: 42, size: 12, milestone: 100, rotation: -35, delayMs: 400 },
  { id: 12, x: 75, y: 41, size: 12, milestone: 100, rotation: 35, delayMs: 460 },
];

export const TIME_OF_DAY_THEMES: Record<TimeOfDayPeriod, {
  label: string;
  sublabel: string;
  icon: string;
  ambientGrad: (isFull: boolean, isBranches: boolean, isLeaves: boolean, score: number) => string;
  treeFilterClass: string;
  blossomPetalDark: string;
  badgeBorder: string;
  badgeBg: string;
}> = {
  fajr: {
    label: 'فجر ناصع',
    sublabel: 'نور بلوري هادئ',
    icon: '✨',
    ambientGrad: (isFull, isBranches, isLeaves, score) => {
      const alpha = isFull ? 0.95 : isBranches ? 0.75 : isLeaves ? 0.50 : score > 0 ? 0.30 : 0.15;
      return `radial-gradient(circle at 50% 55%, rgba(255, 248, 225, ${alpha * 0.70}) 0%, rgba(195, 225, 255, ${alpha * 0.35}) 40%, rgba(200, 165, 80, ${alpha * 0.18}) 70%, transparent 85%)`;
    },
    treeFilterClass: 'hue-rotate-[-4deg]',
    blossomPetalDark: '#D97706',
    badgeBorder: 'border-cyan-400/40',
    badgeBg: 'bg-cyan-950/40 text-cyan-200'
  },
  day: {
    label: 'نهار مشرق',
    sublabel: 'إشراقة ذهبية حيوية',
    icon: '☀️',
    ambientGrad: (isFull, isBranches, isLeaves, score) => {
      const alpha = isFull ? 1 : isBranches ? 0.85 : isLeaves ? 0.60 : score > 0 ? 0.35 : 0.20;
      return `radial-gradient(circle at 50% 55%, rgba(255, 235, 150, ${alpha * 0.75}) 0%, rgba(230, 190, 80, ${alpha * 0.42}) 45%, rgba(180, 130, 40, ${alpha * 0.20}) 70%, transparent 85%)`;
    },
    treeFilterClass: '',
    blossomPetalDark: '#D97706',
    badgeBorder: 'border-amber-400/40',
    badgeBg: 'bg-amber-950/40 text-amber-200'
  },
  maghrib: {
    label: 'غروب دافئ',
    sublabel: 'شفق عنبري ووردي',
    icon: '🌅',
    ambientGrad: (isFull, isBranches, isLeaves, score) => {
      const alpha = isFull ? 1 : isBranches ? 0.85 : isLeaves ? 0.60 : score > 0 ? 0.35 : 0.20;
      return `radial-gradient(circle at 50% 55%, rgba(255, 195, 110, ${alpha * 0.78}) 0%, rgba(235, 130, 60, ${alpha * 0.45}) 45%, rgba(170, 65, 30, ${alpha * 0.22}) 70%, transparent 85%)`;
    },
    treeFilterClass: 'sepia-[0.14] hue-rotate-[-8deg]',
    blossomPetalDark: '#EA580C',
    badgeBorder: 'border-orange-400/40',
    badgeBg: 'bg-orange-950/40 text-orange-200'
  },
  night: {
    label: 'ليل بارد',
    sublabel: 'سكينة قمرية وذهبية هادئة',
    icon: '🌙',
    ambientGrad: (isFull, isBranches, isLeaves, score) => {
      const alpha = isFull ? 0.90 : isBranches ? 0.70 : isLeaves ? 0.48 : score > 0 ? 0.28 : 0.15;
      return `radial-gradient(circle at 50% 55%, rgba(245, 235, 205, ${alpha * 0.65}) 0%, rgba(130, 175, 235, ${alpha * 0.32}) 45%, rgba(65, 90, 150, ${alpha * 0.18}) 70%, transparent 85%)`;
    },
    treeFilterClass: 'hue-rotate-[6deg] saturate-[1.12]',
    blossomPetalDark: '#B45309',
    badgeBorder: 'border-indigo-400/40',
    badgeBg: 'bg-indigo-950/40 text-indigo-200'
  }
};

const getAutoTimeOfDay = (): TimeOfDayPeriod => {
  const d = new Date();
  const time = d.getHours() + d.getMinutes() / 60;
  if (time >= 4 && time < 6.5) return 'fajr';
  if (time >= 6.5 && time < 17.5) return 'day';
  if (time >= 17.5 && time < 19.5) return 'maghrib';
  return 'night';
};

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
  const [prayerNotice, setPrayerNotice] = useState<string | null>(null);
  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isAnimationPlaying, setIsAnimationPlaying] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return false;
    }
    return true;
  });
  const prevScoreRef = useRef<number>(data.score);
  const ambientLottieRef = useRef<LottieHandle>(null);
  const burstLottieRef = useRef<LottieHandle>(null);

  // Time-of-day dynamic palette state
  const [overridePeriod, setOverridePeriod] = useState<TimeOfDayPeriod | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<TimeOfDayPeriod>(getAutoTimeOfDay);

  useEffect(() => {
    if (overridePeriod) {
      setCurrentPeriod(overridePeriod);
      return;
    }
    const timer = setInterval(() => {
      setCurrentPeriod(getAutoTimeOfDay());
    }, 60000);
    return () => clearInterval(timer);
  }, [overridePeriod]);

  const cycleTimeOfDay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const periods: (TimeOfDayPeriod | null)[] = ['fajr', 'day', 'maghrib', 'night', null];
    const currentIndex = periods.indexOf(overridePeriod);
    const nextPeriod = periods[(currentIndex + 1) % periods.length];
    setOverridePeriod(nextPeriod);
  };

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


  // Stage checks
  const isLeavesStage = data.score >= 20; // 20%: إضاءة الأوراق الأولى
  const isBranchesStage = data.score >= 50; // 50%: نمو أغصان جديدة وبراعم
  const isFullBloomStage = data.score >= 100; // 100%: إزهار الشجرة بالكامل وتوهج ذهبي دافئ

  // Current dynamic time theme & bloomed blossom count
  const currentTheme = TIME_OF_DAY_THEMES[currentPeriod];
  const bloomedCount = useMemo(() => GOLDEN_BLOSSOMS.filter(b => data.score >= b.milestone).length, [data.score]);

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-[#17140D] via-[#0E0D0A] to-[#080705] border border-[#C8A24A]/45 rounded-3xl p-4 sm:p-5 shadow-[0_12px_35px_rgba(0,0,0,0.85)] transition-all select-none">

      {/* Header: Title, Stage Badge & Progress Percentage */}
      <div className="relative z-10 flex items-center justify-between gap-2 mb-2">
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

        {/* Hidden SVG Definition for Inner Mihrab Niche Clip Path */}
        <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
          <defs>
            <clipPath id="atharInnerNicheClip" clipPathUnits="objectBoundingBox">
              <path d="M 0.1846 1.0 L 0.1846 0.6216 C 0.1846 0.3892 0.3516 0.1676 0.5000 0.1362 C 0.6484 0.1676 0.8154 0.3892 0.8154 0.6216 L 0.8154 1.0 Z" />
            </clipPath>
          </defs>
        </svg>

        {/* Sacred Golden Mihrab Arch — Stays in 100% natural royal lighting & craftsmanship at all times */}
        <div className="relative z-10 w-60 sm:w-68 h-60 sm:h-68 athar-mihrab-arch p-[1.5px] bg-gradient-to-b from-[#FDE8A9] via-[#C8A24A] to-[#6E5015] shadow-[0_12px_35px_rgba(0,0,0,0.9)] transition-all duration-700">
          <div className="w-full h-full athar-mihrab-arch overflow-hidden bg-[#070604] relative flex items-center justify-center">
            {/* 1. Base Mihrab Architecture — Stays 100% in its natural, crisp, rich golden lighting at all times without any dimming or external bloom */}
            <img
              src={enhancedImpactTree}
              alt="محراب أثر المبارك"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover filter brightness-100 contrast-100 saturate-100 pointer-events-none"
            />

            {/* 2. Inner Niche & Tree Progression Chamber — Dedicated exclusively to the tree; shows natural tree with subtle vintage antique patina at 0%, and blossoms with radiant golden luminescence as deeds progress */}
            <div 
              className="absolute inset-0 pointer-events-none overflow-hidden transition-all duration-1000"
              style={{ clipPath: 'url(#atharInnerNicheClip)' }}
            >
              {/* Dynamic Celestial Ambient Aura Inside the Niche based on Time of Day */}
              <div 
                className={`absolute inset-0 transition-all duration-1000 pointer-events-none ${
                  isFullBloomStage
                    ? 'opacity-100'
                    : isBranchesStage
                    ? 'opacity-85'
                    : isLeavesStage
                    ? 'opacity-65'
                    : data.score > 0
                    ? 'opacity-40'
                    : 'opacity-18'
                }`}
                style={{
                  background: currentTheme.ambientGrad(isFullBloomStage, isBranchesStage, isLeavesStage, data.score)
                }}
              />

              {/* Streaming Golden Ray Cones Inside the Niche at Full Bloom and High Deeds */}
              {data.score >= 50 && (
                <div 
                  className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 mix-blend-screen ${
                    isFullBloomStage ? 'opacity-75 animate-pulse' : 'opacity-35'
                  }`}
                  style={{
                    background: currentPeriod === 'maghrib'
                      ? 'conic-gradient(from 180deg at 50% 55%, transparent 0deg, rgba(255, 195, 110, 0.28) 20deg, transparent 40deg, rgba(240, 140, 60, 0.34) 75deg, transparent 95deg, rgba(255, 195, 110, 0.28) 130deg, transparent 150deg, rgba(255, 170, 80, 0.25) 220deg, transparent 240deg, rgba(255, 195, 110, 0.28) 300deg, transparent 320deg)'
                      : currentPeriod === 'fajr'
                      ? 'conic-gradient(from 180deg at 50% 55%, transparent 0deg, rgba(255, 245, 210, 0.25) 20deg, transparent 40deg, rgba(195, 230, 255, 0.28) 75deg, transparent 95deg, rgba(255, 245, 210, 0.25) 130deg, transparent 150deg, rgba(210, 235, 255, 0.22) 220deg, transparent 240deg, rgba(255, 245, 210, 0.25) 300deg, transparent 320deg)'
                      : currentPeriod === 'night'
                      ? 'conic-gradient(from 180deg at 50% 55%, transparent 0deg, rgba(245, 230, 180, 0.20) 20deg, transparent 40deg, rgba(150, 190, 245, 0.25) 75deg, transparent 95deg, rgba(245, 230, 180, 0.20) 130deg, transparent 150deg, rgba(165, 200, 255, 0.22) 220deg, transparent 240deg, rgba(245, 230, 180, 0.20) 300deg, transparent 320deg)'
                      : 'conic-gradient(from 180deg at 50% 55%, transparent 0deg, rgba(255, 230, 140, 0.22) 20deg, transparent 40deg, rgba(255, 220, 110, 0.28) 75deg, transparent 95deg, rgba(255, 230, 140, 0.22) 130deg, transparent 150deg, rgba(255, 215, 100, 0.25) 220deg, transparent 240deg, rgba(255, 230, 140, 0.28) 300deg, transparent 320deg)'
                  }}
                />
              )}

              {/* The Tree Image Itself — Living breathing animation at 100% and dynamic time filter */}
              <div className={`w-full h-full transition-all duration-1000 ${
                isFullBloomStage && isAnimationPlaying ? 'animate-tree-breathing' : ''
              }`}>
                <img
                  src={enhancedImpactTree}
                  alt="شجرة الأثر التفاعلية"
                  referrerPolicy="no-referrer"
                  className={`w-full h-full object-cover transition-all duration-1000 pointer-events-none ${
                    currentTheme.treeFilterClass
                  } ${
                    isFullBloomStage
                      ? 'brightness-[1.28] contrast-[1.22] saturate-[1.42] drop-shadow-[0_0_28px_rgba(255,230,140,0.95)] drop-shadow-[0_0_52px_rgba(230,198,110,0.75)] drop-shadow-[0_0_82px_rgba(200,162,74,0.50)]'
                      : isBranchesStage
                      ? 'brightness-[1.18] contrast-[1.15] saturate-[1.32] drop-shadow-[0_0_20px_rgba(245,210,115,0.70)] drop-shadow-[0_0_36px_rgba(200,162,74,0.40)]'
                      : isLeavesStage
                      ? 'brightness-[1.06] contrast-[1.08] saturate-[1.16] drop-shadow-[0_0_12px_rgba(230,198,110,0.50)]'
                      : data.score > 0
                      ? 'brightness-[0.95] contrast-[1.02] saturate-[0.92] grayscale-[0.10]'
                      : 'brightness-[0.84] contrast-[0.98] saturate-[0.62] grayscale-[0.28] sepia-[0.10]'
                  }`}
                />
              </div>

              {/* 20% Requirement: Keep gray tone on trunk/core structure, but completely lifted/hidden from leaves */}
              {data.score >= 20 && data.score < 50 && (
                <div 
                  className="absolute inset-0 transition-opacity duration-700 pointer-events-none opacity-80"
                  style={{
                    background: 'radial-gradient(ellipse 46% 40% at 50% 75%, rgba(135, 120, 100, 0.44) 0%, rgba(100, 90, 75, 0.28) 55%, transparent 75%)',
                    mixBlendMode: 'color'
                  }}
                  title="مرحلة ٢٠٪: إشراقة الأوراق مع احتفاظ الجذع بطابعه الأصيل"
                />
              )}

              {/* Subtle Antique Patina Wash at 0% across full tree */}
              <div 
                className={`absolute inset-0 transition-opacity duration-1000 pointer-events-none ${
                  data.score === 0 
                    ? 'opacity-25' 
                    : data.score < 20 
                    ? 'opacity-10' 
                    : 'opacity-0'
                }`}
                style={{
                  background: 'radial-gradient(ellipse at 50% 50%, rgba(180, 165, 140, 0.20) 0%, rgba(120, 110, 95, 0.25) 100%)',
                  mixBlendMode: 'soft-light'
                }}
              />

              {/* Golden Blossoms Blooming Layer (كلما زاد الإنجاز بنسبة 25%) */}
              <div className="absolute inset-0 pointer-events-none z-20">
                {GOLDEN_BLOSSOMS.map(blossom => {
                  const isBloomed = data.score >= blossom.milestone;
                  return (
                    <div
                      key={blossom.id}
                      className={`absolute transition-all duration-700 ${
                        isBloomed && isAnimationPlaying ? 'animate-blossom-gleam' : ''
                      }`}
                      style={{
                        left: `${blossom.x}%`,
                        top: `${blossom.y}%`,
                        width: `${blossom.size}px`,
                        height: `${blossom.size}px`,
                        transform: isBloomed 
                          ? `translate(-50%, -50%) rotate(${blossom.rotation}deg) scale(1)` 
                          : 'translate(-50%, -50%) scale(0)',
                        opacity: isBloomed ? 1 : 0,
                        transitionDelay: `${blossom.delayMs}ms`,
                        transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
                      }}
                    >
                      <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-[0_0_6px_rgba(255,235,140,0.95)]">
                        <defs>
                          <radialGradient id={`blossomGrad-${blossom.id}`} cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#FFFDF2" />
                            <stop offset="40%" stopColor="#FDE68A" />
                            <stop offset="85%" stopColor={currentTheme.blossomPetalDark} />
                            <stop offset="100%" stopColor="#78350F" />
                          </radialGradient>
                        </defs>
                        <g transform="translate(12, 12)">
                          {[0, 72, 144, 216, 288].map((angle, i) => (
                            <ellipse
                              key={i}
                              cx="0"
                              cy="-5.2"
                              rx="2.6"
                              ry="4.2"
                              transform={`rotate(${angle})`}
                              fill={`url(#blossomGrad-${blossom.id})`}
                              opacity="0.95"
                            />
                          ))}
                          <circle cx="0" cy="0" r="2.2" fill="#FFFBEB" stroke="#D97706" strokeWidth="0.5" />
                          <circle cx="0" cy="0" r="1.1" fill="#FEF08A" />
                        </g>
                      </svg>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Subtle Inner Gold Bevel Rim (Constant 100% royal craftsmanship) */}
            <div className="absolute inset-0 athar-mihrab-arch ring-1 ring-inset ring-[#FDE8A9]/35 pointer-events-none" />
          </div>
        </div>

        {/* Milestone Indicator Badges (0% -> 20% -> 50% -> 100%) & Time-of-Day Dynamic Pill */}
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-1.5 mt-2">
          {/* Time of Day Dynamic Atmosphere Pill with Click-to-Test */}
          <button
            type="button"
            onClick={cycleTimeOfDay}
            className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 border transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 ${currentTheme.badgeBorder} ${currentTheme.badgeBg}`}
            title="إضاءة الشجرة تتغير ديناميكياً مع أوقات اليوم الأربعة - اضغط للتبديل السريع والتجربة"
          >
            <span>{currentTheme.icon}</span>
            <span className="font-bold">{currentTheme.label}</span>
            <span className="text-[8px] opacity-75 font-normal">({overridePeriod ? 'يدوي' : 'مباشر'})</span>
          </button>

          <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 border transition-all ${
            data.score >= 20 
              ? 'bg-[#C8A24A]/20 border-[#C8A24A]/55 text-[#E6C66E] font-bold' 
              : 'bg-[#14120D] border-[#C8A24A]/20 text-[#8E8268]'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            ٢٠٪ إشراقة الأوراق
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 border transition-all ${
            data.score >= 50 
              ? 'bg-[#C8A24A]/20 border-[#C8A24A]/55 text-[#E6C66E] font-bold' 
              : 'bg-[#14120D] border-[#C8A24A]/20 text-[#8E8268]'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            ٥٠٪ حيوية الأغصان
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 border transition-all ${
            data.score >= 100 
              ? 'bg-[#C8A24A]/30 border-[#E6C66E] text-[#F3E5AB] font-bold shadow-[0_0_8px_rgba(200,162,74,0.4)]' 
              : 'bg-[#14120D] border-[#C8A24A]/20 text-[#8E8268]'
          }`}>
            <Sparkles size={10} />
            ١٠٠٪ الإزهار التام
          </span>

          {/* Golden Blossom Counter Badge */}
          {data.score >= 25 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-500/35 bg-amber-950/30 text-amber-300 font-bold animate-in fade-in">
              <span>🌸</span>
              <span>{bloomedCount}/١٢ زهرة ذهبية</span>
            </span>
          )}
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

          {/* Automated Sacred Sync Banner */}
          <div className="p-2.5 rounded-xl bg-[#0F0D0A] border border-[#C8A24A]/25 text-[10.5px] text-[#C4B998] leading-relaxed flex items-center gap-2">
            <ShieldCheck size={14} className="text-[#E6C66E] shrink-0" />
            <span>
              <strong>رعاية شجرة الأثر تلقائية:</strong> تُحتسب نقاط الشجرة آلياً بناءً على صلواتك المؤداة في وقتها الشرعي، ونسبة قراءتك الفعلية لأذكار الصباح والمساء، ووردك القرآني بالمصحف.
            </span>
          </div>

          {/* 1. Obligatory Prayers Strip (الصلوات الخمس) — مربوطة تلقائياً بصفحة الصلاة */}
          <div className="p-3 bg-[#14120D] border border-[#C8A24A]/35 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-[#F3E5AB] flex items-center gap-1">
                <Sun size={12} className="text-[#E6C66E]" />
                الصلوات الخمس المفروضة (١٢٪ لكل صلاة):
              </span>
              <span className="text-[#E6C66E] font-bold font-mono">
                {data.prayersCompletedCount}/٥ مكتملة ({data.prayersScore}٪)
              </span>
            </div>

            {/* Inline Warning Notice When Tapping a Prayer Before Time */}
            {prayerNotice && (
              <div className="p-2.5 rounded-xl bg-gradient-to-l from-[#2D1F0E] via-[#1C140A] to-[#120F08] border border-[#E6C66E] text-right animate-fadeIn flex items-center justify-between gap-2 shadow-md">
                <div className="flex items-center gap-2 min-w-0 text-[11px] text-[#FFF2C2]">
                  <Clock size={13} className="text-[#E6C66E] shrink-0 animate-pulse" />
                  <span className="truncate">{prayerNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPrayerNotice(null)}
                  className="text-[10px] text-[#A89E88] hover:text-white px-1.5 py-0.5 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Interactive Obligatory Prayers Action Buttons */}
            <div className="grid grid-cols-5 gap-1.5 pt-0.5">
              {[
                { id: 'fajr' as const, label: 'الفجر', done: data.isFajrDone },
                { id: 'dhuhr' as const, label: 'الظهر', done: data.isDhuhrDone },
                { id: 'asr' as const, label: 'العصر', done: data.isAsrDone },
                { id: 'maghrib' as const, label: 'المغرب', done: data.isMaghribDone },
                { id: 'isha' as const, label: 'العشاء', done: data.isIshaDone }
              ].map(prayer => {
                const arrival = StorageService.isPrayerTimeArrived(prayer.id);
                const isActionDisabled = prayer.done || !arrival.arrived;
                return (
                  <button
                    key={prayer.id}
                    type="button"
                    disabled={isActionDisabled}
                    onClick={() => {
                      if (prayer.done || !arrival.arrived) return;
                      const updated = StorageService.toggleTodayPrayer(prayer.id);
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('athar_prayers_updated', { detail: updated }));
                      }
                      try {
                        confetti({
                          particleCount: 45,
                          spread: 60,
                          origin: { y: 0.6 },
                          colors: ['#D4AF37', '#E6C66E', '#10B981'],
                        });
                      } catch {}
                    }}
                    className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] border transition-all ${
                      prayer.done 
                        ? 'bg-gradient-to-b from-[#1C170E] to-[#110E09] border-[#C8A24A]/60 text-[#F5EFE0] cursor-not-allowed opacity-90 shadow-sm' 
                        : arrival.arrived
                        ? 'bg-gradient-to-b from-[#241C0F] to-[#120F09] border border-[#E6C66E] text-[#FFFDF8] hover:border-[#FFF2C2] active:scale-95 cursor-pointer shadow-[0_0_12px_rgba(230,198,110,0.25)]'
                        : 'bg-[#0A0907] border-[#C8A24A]/15 text-[#6E6450] cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      prayer.done 
                        ? 'bg-[#E6C66E] text-[#080705]' 
                        : arrival.arrived
                        ? 'bg-[#2A200E] border border-[#E6C66E] text-[#E6C66E]'
                        : 'border border-[#C8A24A]/20 text-[#6E6450]'
                    }`}>
                      {prayer.done ? (
                        <Check size={12} strokeWidth={2.5} />
                      ) : arrival.arrived ? (
                        <Sparkles size={11} className="text-[#E6C66E]" />
                      ) : (
                        <Clock size={11} className="text-[#6E6450]" />
                      )}
                    </div>
                    <span className="font-bold text-[11px]">{prayer.label}</span>
                    <span className="text-[9px] text-[#A69C80]">
                      {prayer.done ? 'تمت' : arrival.arrived ? 'سجّل' : (arrival.prayerTimeStr || 'قادمة')}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Direct navigation to Prayers Page */}
            <div className="flex items-center justify-between pt-1 border-t border-[#C8A24A]/20">
              <span className="text-[10px] text-[#C4B998]">
                {data.prayersCompletedCount === 5 ? 'تم إتمام جميع الصلوات المفروضة اليوم' : 'تسجل الصلوات فور حلول وقتها الشرعي ولا يمكن التراجع عنها'}
              </span>
              <button
                type="button"
                onClick={() => onNavigate?.('prayers')}
                className="text-[10px] font-bold text-[#E6C66E] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>صفحة الصلاة</span>
                <ArrowUpRight size={11} />
              </button>
            </div>
          </div>

          {/* 2. Adhkar & Wird Rows (الأذكار والورد القرآني) — مربوطة تلقائياً بالقراءة الحقيقية */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* Morning & Evening Adhkar Card */}
            <div className="p-3 bg-[#14120D] border border-[#C8A24A]/35 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#F3E5AB] flex items-center gap-1.5 text-[11px]">
                  <Moon size={12} className="text-[#E6C66E]" />
                  أذكار الصباح والمساء (قراءة / استماع ٢٠٪)
                </span>
                <span className="text-[#E6C66E] font-bold font-mono text-[11px]">
                  {data.adhkarScore}٪
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onOpenQuickAdhkar ? onOpenQuickAdhkar('morning') : onNavigate?.('adhkar')}
                  className={`flex-1 p-2 rounded-xl border flex items-center justify-between text-[11px] transition-all active:scale-95 ${
                    data.isMorningAdhkarDone
                      ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#F3E5AB] font-bold'
                      : 'bg-[#0A0907] border-[#C8A24A]/25 text-[#C4B998] hover:border-[#E6C66E]'
                  }`}
                >
                  <span className="truncate">
                    الصباح {data.morningPercent > 0 ? `(${data.morningPercent}٪)` : ''}
                  </span>
                  <span className="text-[10px] font-bold shrink-0">
                    {data.isMorningAdhkarDone ? 'مكتملة ✓' : data.morningPercent > 0 ? 'متابعة ↗' : 'قراءة / استماع ↗'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenQuickAdhkar ? onOpenQuickAdhkar('evening') : onNavigate?.('adhkar')}
                  className={`flex-1 p-2 rounded-xl border flex items-center justify-between text-[11px] transition-all active:scale-95 ${
                    data.isEveningAdhkarDone
                      ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#F3E5AB] font-bold'
                      : 'bg-[#0A0907] border-[#C8A24A]/25 text-[#C4B998] hover:border-[#E6C66E]'
                  }`}
                >
                  <span className="truncate">
                    المساء {data.eveningPercent > 0 ? `(${data.eveningPercent}٪)` : ''}
                  </span>
                  <span className="text-[10px] font-bold shrink-0">
                    {data.isEveningAdhkarDone ? 'مكتملة ✓' : data.eveningPercent > 0 ? 'متابعة ↗' : 'قراءة / استماع ↗'}
                  </span>
                </button>
              </div>
            </div>

            {/* Quran Wird & Recitation Card */}
            <div className="p-3 bg-[#14120D] border border-[#C8A24A]/35 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#F3E5AB] flex items-center gap-1.5 text-[11px]">
                  <BookOpen size={12} className="text-[#E6C66E]" />
                  الورد القرآني (تلاوة / استماع ٢٠٪)
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
