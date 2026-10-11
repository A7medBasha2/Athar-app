import React, { useState, useEffect } from 'react';
import { LiveActivityService, LiveActivityState } from '../services/liveActivityService';
import { AudioService, ActiveAudioState } from '../services/audioService';
import { ReminderEngine } from '../services/reminderService';
import { AtharBrandLogo } from './AtharBrandLogo';
import { PreAdhanIqamahLiveCard } from './PrayerWidgetsKit';
import {
  Lock,
  ChevronDown,
  ChevronUp,
  MapPin,
  Sparkles,
  Play,
  Pause,
  Calendar,
  BellRing,
} from 'lucide-react';

interface DynamicIslandBarProps {
  onOpenLockScreen: () => void;
  onNavigateToPrayers: () => void;
}

export const DynamicIslandBar: React.FC<DynamicIslandBarProps> = ({
  onOpenLockScreen,
  onNavigateToPrayers,
}) => {
  const [liveState, setLiveState] = useState<LiveActivityState>(() =>
    LiveActivityService.getState()
  );
  const [audioState, setAudioState] = useState<ActiveAudioState | null>(() =>
    AudioService.getCurrentState()
  );
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    const unsubLive = LiveActivityService.subscribe((newState) => {
      setLiveState(newState);
    });
    const unsubAudio = AudioService.subscribe((aState) => {
      setAudioState(aState);
    });
    return () => {
      unsubLive();
      unsubAudio();
    };
  }, []);

  if (!liveState.isActive || !liveState.settings.showDynamicIsland) {
    return null;
  }

  const isPreAdhanOrIqamah = liveState.liveCardPhase !== 'idle';
  const effectiveRingProgress = isPreAdhanOrIqamah
    ? liveState.liveCardGoldenProgressPercent
    : liveState.progressPercent;

  // Ring progress SVG calculation for compact Dynamic Island
  const radius = 9.5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference -
    (Math.min(100, Math.max(0, effectiveRingProgress)) / 100) * circumference;

  return (
    <div className="relative z-40 w-full px-3 pt-1.5 pb-1 select-none">
      {/* Compact Dynamic Island Pill */}
      {!isExpanded ? (
        <div
          className={`mx-auto max-w-[365px] flex items-center justify-between gap-2 px-3 py-1.5 rounded-full bg-[#090806]/95 border backdrop-blur-xl transition-all duration-300 ${
            isPreAdhanOrIqamah
              ? 'border-[#E6C66E]/80 shadow-[0_8px_28px_rgba(0,0,0,0.95),0_0_22px_rgba(230,198,110,0.28)]'
              : 'border-[#C8A24A]/55 shadow-[0_8px_28px_rgba(0,0,0,0.9),0_0_16px_rgba(200,162,74,0.18)]'
          }`}
        >
          {/* Right Side (RTL): Brand & Next Prayer / Iqamah Status */}
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-2 min-w-0 text-right group flex-1"
            title="توسيع الجزيرة التفاعلية (Dynamic Island)"
          >
            {/* Circular Gold Progress Ring */}
            <div className="relative w-6 h-6 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
                <circle
                  cx="12"
                  cy="12"
                  r={radius}
                  fill="none"
                  stroke="rgba(200, 162, 74, 0.2)"
                  strokeWidth="2.3"
                />
                <circle
                  cx="12"
                  cy="12"
                  r={radius}
                  fill="none"
                  stroke="#E6C66E"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-700"
                />
              </svg>
              <BellRing size={10} className="text-[#E6C66E]" />
            </div>

            <div className="min-w-0 flex items-center gap-1.5">
              <span className="text-[11px] font-extrabold text-[#F3E5AB] truncate">
                {liveState.liveCardPhase === 'awaiting_iqamah'
                  ? `إقامة ${liveState.liveCardActivePrayerName}`
                  : liveState.nextPrayerName}
              </span>
              <span className="text-[10px] text-[#C4B998] font-mono tabular-nums">
                ({liveState.liveCardPhase === 'awaiting_iqamah'
                  ? liveState.liveCardIqamahTime12
                  : liveState.nextPrayerTime12})
              </span>
            </div>
          </button>

          {/* Center Mini Golden Progress Bar */}
          <div
            onClick={() => setIsExpanded(true)}
            className="hidden xs:flex flex-col w-14 cursor-pointer"
          >
            <div className="w-full h-1.5 rounded-full bg-[#1C1810] border border-[#C8A24A]/35 overflow-hidden">
              <div
                className="h-full bg-gradient-to-l from-[#FFF3C4] via-[#E6C66E] to-[#B88A2D] rounded-full transition-all duration-700"
                style={{ width: `${effectiveRingProgress}%` }}
              />
            </div>
          </div>

          {/* Left Side (RTL): Live Countdown + Lock Screen Quick Trigger */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsExpanded(true)}
              className="px-2 py-0.5 rounded-full bg-[#19150D] border border-[#C8A24A]/45 flex items-center gap-1 text-[11px] font-mono font-black text-[#E6C66E] tabular-nums"
            >
              <span>
                -
                {isPreAdhanOrIqamah
                  ? liveState.liveCardCountdownMMSS
                  : liveState.countdownFormatted}
              </span>
              <ChevronDown size={11} className="text-[#C4B998]" />
            </button>

            <button
              onClick={onOpenLockScreen}
              className="w-6 h-6 rounded-full bg-[#1B170F] hover:bg-[#2A2315] border border-[#C8A24A]/45 text-[#E6C66E] flex items-center justify-center transition-colors"
              title="معاينة النشاط المباشر على شاشة القفل (Lock Screen Live Activity)"
              aria-label="شاشة القفل"
            >
              <Lock size={11} />
            </button>
          </div>
        </div>
      ) : (
        /* Expanded Dynamic Island Card (Full Live Activity HUD) */
        <div className="mx-auto w-full rounded-[28px] bg-gradient-to-b from-[#14110B]/98 via-[#0C0A07]/98 to-[#070707]/98 border border-[#E6C66E]/65 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.95),0_0_25px_rgba(200,162,74,0.22)] backdrop-blur-2xl animate-fadeIn space-y-3">
          {/* Header Row */}
          <div className="flex items-center justify-between border-b border-[#C8A24A]/25 pb-2.5">
            <div className="flex items-center gap-2">
              <AtharBrandLogo size="xs" showWordmark={false} />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-extrabold text-[#E6C66E]">
                    النشاط المباشر · Live Activity
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[#C4B998] mt-0.5">
                  <span className="flex items-center gap-0.5">
                    <MapPin size={10} className="text-[#C8A24A]" />
                    {liveState.locationName}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-0.5">
                    <Calendar size={10} className="text-[#C8A24A]" />
                    {liveState.dateHijri}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setIsExpanded(false);
                  ReminderEngine.launchFullScreenAdhan({ isPreview: true });
                }}
                className="px-2.5 py-1 rounded-full bg-[#241E11] hover:bg-[#312917] border border-[#E6C66E]/55 text-[#F3E5AB] text-[10px] font-extrabold flex items-center gap-1 transition-colors whitespace-nowrap"
              >
                <BellRing size={10} className="text-[#E6C66E]" />
                <span>شاشة الأذان</span>
              </button>
              <button
                onClick={() => {
                  setIsExpanded(false);
                  onOpenLockScreen();
                }}
                className="px-2.5 py-1 rounded-full bg-[#1E1910] hover:bg-[#2B2416] border border-[#C8A24A]/50 text-[#F3E5AB] text-[10px] font-extrabold flex items-center gap-1 transition-colors whitespace-nowrap"
              >
                <Lock size={10} className="text-[#E6C66E]" />
                <span>شاشة القفل</span>
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 rounded-full bg-[#17140D] hover:bg-[#252015] border border-[#C8A24A]/35 text-[#C4B998] hover:text-white transition-colors"
                aria-label="طي الجزيرة التفاعلية"
              >
                <ChevronUp size={14} />
              </button>
            </div>
          </div>

          {/* If in Pre-Adhan (15-20m) or Awaiting Iqamah phase, render the Live Activity Iqamah Progress Card */}
          {isPreAdhanOrIqamah ? (
            <PreAdhanIqamahLiveCard
              state={liveState}
              onTriggerAdhanPreview={() => {
                setIsExpanded(false);
                ReminderEngine.launchFullScreenAdhan({ isPreview: true });
              }}
            />
          ) : (
            <>
              {/* Main Prayer Countdown & Window Info */}
              <div className="flex items-center justify-between gap-3">
                <div className="text-right">
                  <span className="text-[10px] font-bold text-[#C4B998] block">
                    الصلاة القادمة ({liveState.nextPrayerTime12}) · الإقامة بعد{' '}
                    {liveState.liveCardIqamahOffsetMinutes} د
                  </span>
                  <h3 className="text-xl font-extrabold text-white font-quran flex items-center gap-1.5 mt-0.5">
                    <span>صلاة {liveState.nextPrayerName}</span>
                  </h3>
                </div>

                <div className="text-left bg-[#15120B] border border-[#C8A24A]/45 px-3.5 py-2 rounded-2xl shadow-inner">
                  <span className="text-[9px] text-[#C4B998] font-bold block text-center">
                    الوقت المتبقي
                  </span>
                  <span className="text-lg font-mono font-black text-[#E6C66E] tabular-nums tracking-wider block">
                    -{liveState.countdownFormatted}
                  </span>
                </div>
              </div>

              {/* Annotated Prayer Window Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-[#C4B998]">
                    من: <strong className="text-[#F3E5AB]">{liveState.currentPrayerName}</strong> ({liveState.currentPrayerTime12})
                  </span>
                  <span className="text-[#E6C66E] font-mono tabular-nums">
                    {Math.round(liveState.progressPercent)}% انقضى
                  </span>
                  <span className="text-[#C4B998]">
                    الأذان: <strong className="text-[#E6C66E]">{liveState.nextPrayerName}</strong> ({liveState.nextPrayerTime12})
                  </span>
                </div>

                {/* Golden Progress Track with Glowing Indicator */}
                <div className="relative w-full h-2.5 rounded-full bg-[#1A160E] border border-[#C8A24A]/40 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-[#FFF2C2] via-[#E6C66E] to-[#9E7620] shadow-[0_0_12px_rgba(230,198,110,0.75)] transition-all duration-700"
                    style={{ width: `${liveState.progressPercent}%` }}
                  />
                </div>
              </div>
            </>
          )}

          {/* All 6 Daily Prayer Checkpoints Strip */}
          <div className="grid grid-cols-6 gap-1 pt-1">
            {liveState.segments.map((seg) => (
              <div
                key={seg.id}
                onClick={() => {
                  setIsExpanded(false);
                  onNavigateToPrayers();
                }}
                className={`cursor-pointer rounded-xl p-1.5 text-center border transition-all ${
                  seg.isNext
                    ? 'bg-gradient-to-b from-[#2C2413] to-[#17130A] border-[#E6C66E] text-[#F3E5AB] shadow-[0_0_12px_rgba(230,198,110,0.28)]'
                    : seg.isPassed
                    ? 'bg-[#0E0C09]/80 border-[#C8A24A]/20 text-[#8E846B]'
                    : 'bg-[#12100B] border-[#C8A24A]/25 text-[#C4B998]'
                }`}
              >
                <span className="text-[10px] font-extrabold block truncate">
                  {seg.nameArabic}
                </span>
                <span className="text-[9px] font-mono tabular-nums block mt-0.5">
                  {seg.time24}
                </span>
              </div>
            ))}
          </div>

          {/* Optional Active Audio Mini Row inside Dynamic Island if Quran/Adhkar is playing */}
          {audioState && (
            <div className="pt-2 border-t border-[#C8A24A]/20 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles size={13} className="text-[#E6C66E] shrink-0" />
                <span className="text-[11px] font-bold text-[#F3E5AB] truncate">
                  {audioState.title}
                </span>
              </div>
              <button
                onClick={() => AudioService.togglePlayPause()}
                className="px-2.5 py-1 rounded-xl bg-[#C8A24A] text-[#070707] font-extrabold text-[10px] flex items-center gap-1 shrink-0"
              >
                {audioState.isPlaying ? <Pause size={11} /> : <Play size={11} />}
                <span>{audioState.isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

