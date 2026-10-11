import React from 'react';
import { LiveActivityState } from '../services/liveActivityService';
import { AtharBrandLogo } from './AtharBrandLogo';
import {
  Clock,
  MapPin,
  CheckCircle2,
  Sparkles,
  WifiOff,
  Flame,
} from 'lucide-react';

interface WidgetProps {
  state: LiveActivityState;
  todayCompletedPrayersCount?: number;
  streakDays?: number;
  onClick?: () => void;
  className?: string;
}

/**
 * 1. Small Prayer Time Widget (ودجت مواقيت الصلاة الصغيرة - SystemSmall / Rectangular Compact)
 * Displays the next prayer name, live countdown timer, circular gold progress ring,
 * and a sleek burnished gold linear progress bar. Operates 100% offline.
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
      className={`relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#19150D] via-[#0F0D09] to-[#070604] border border-[#C8A24A]/65 p-3.5 shadow-[0_14px_34px_rgba(0,0,0,0.92),0_0_20px_rgba(200,162,74,0.16)] text-right select-none flex flex-col justify-between min-h-[152px] transition-all ${
        onClick ? 'cursor-pointer hover:border-[#E6C66E]' : ''
      } ${className}`}
    >
      {/* Subtle radial gold glow */}
      <div className="pointer-events-none absolute -top-10 -left-10 w-28 h-28 rounded-full bg-[#C8A24A]/12 blur-2xl" />

      {/* Top Row: Brand & Circular Progress Ring */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <AtharBrandLogo size="xs" showWordmark={false} />
          <div className="min-w-0">
            <span className="text-[10px] font-extrabold text-[#E6C66E] block truncate">
              ودجت الصلاة الصغيرة
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
          <span className="text-[10px] font-mono font-bold text-[#E6C66E] bg-[#211B10] border border-[#C8A24A]/40 px-1.5 py-0.5 rounded-lg tabular-nums">
            {state.nextPrayerTime12}
          </span>
        </div>

        <div className="mt-1 flex items-center justify-between">
          <span className="text-[10px] text-[#C4B998] font-bold">متبقي للأذان:</span>
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
          <span className="text-[#E6C66E]">أوفلاين 100%</span>
          <span>إلى {state.nextPrayerName}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * 2. Circular & Daily Athar Gauge Lock Screen Accessory Widget (ودجت شاشة القفل الدائرية وإنجاز اليوم)
 * Pairs alongside the Small Prayer Widget in a 2-column Lock Screen grid.
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
      className={`relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#19150D] via-[#0F0D09] to-[#070604] border border-[#C8A24A]/55 p-3.5 shadow-[0_14px_34px_rgba(0,0,0,0.92)] text-right select-none flex flex-col justify-between min-h-[152px] transition-all ${
        onClick ? 'cursor-pointer hover:border-[#E6C66E]' : ''
      } ${className}`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] font-extrabold text-[#E6C66E] flex items-center gap-1">
            <Sparkles size={10} />
            <span>ودجت أثر اليومي</span>
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
          <span className="text-[#F3E5AB] font-extrabold">فرائض اليوم</span>
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
 * 3. Medium Prayer Time Widget (ودجت مواقيت الصلاة المتوسطة - SystemMedium / Full Lock Screen Banner)
 * Displays the next prayer, large digital countdown, annotated gold progress bar,
 * and the complete 6-stage daily prayer timeline (Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha).
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
              <span className="w-2 h-2 rounded-full bg-[#E6C66E] animate-pulse" />
              <span className="text-xs font-extrabold text-[#F3E5AB]">
                ودجت مواقيت الصلاة المتوسطة
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[#C4B998] mt-0.5">
              <span className="flex items-center gap-0.5">
                <MapPin size={10} className="text-[#C8A24A]" />
                {state.locationName}
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5 text-[#E6C66E]">
                <WifiOff size={9} />
                <span>فلكي محلي بدون إنترنت</span>
              </span>
            </div>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full bg-[#241E11] border border-[#E6C66E]/50 text-[10px] font-extrabold text-[#E6C66E] flex items-center gap-1">
          <Clock size={11} />
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

      {/* Daily 6-Stage Prayer Timeline */}
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
