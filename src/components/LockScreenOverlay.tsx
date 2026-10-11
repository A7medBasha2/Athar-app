import React, { useState, useEffect } from 'react';
import { ActiveAudioState, AudioService } from '../services/audioService';
import {
  LiveActivityService,
  LiveActivityState,
  LockScreenWidgetStyle,
} from '../services/liveActivityService';
import { StorageService } from '../services/storageService';
import { ImpactTreeService, ImpactBreakdown } from '../services/impactTreeService';
import { ReminderEngine } from '../services/reminderService';
import { AtharBrandLogo } from './AtharBrandLogo';
import {
  SmallPrayerWidgetCard,
  ImpactTreeWirdWidgetCard,
  WideImpactTreeWirdWidgetCard,
  MediumPrayerWidgetCard,
  PreAdhanIqamahLiveCard,
} from './PrayerWidgetsKit';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Lock,
  Unlock,
  MapPin,
  Sparkles,
  LayoutGrid,
  BellRing,
} from 'lucide-react';

interface LockScreenOverlayProps {
  isOpen: boolean;
  onUnlock: () => void;
  hijriDate?: string;
}

export const LockScreenOverlay: React.FC<LockScreenOverlayProps> = ({
  isOpen,
  onUnlock,
  hijriDate,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [audioState, setAudioState] = useState<ActiveAudioState | null>(null);
  const [liveState, setLiveState] = useState<LiveActivityState>(() =>
    LiveActivityService.getState()
  );
  const [impactBreakdown, setImpactBreakdown] = useState<ImpactBreakdown>(() =>
    ImpactTreeService.calculateImpact()
  );

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString('ar-EG', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const refreshAch = () => {
      setImpactBreakdown(ImpactTreeService.calculateImpact());
    };
    refreshAch();

    const unsubAudio = AudioService.subscribe(setAudioState);
    const unsubLive = LiveActivityService.subscribe(setLiveState);
    window.addEventListener('athar_prayers_updated', refreshAch);
    window.addEventListener('athar_khatmah_updated', refreshAch);
    window.addEventListener('athar_midnight_reset', refreshAch);

    return () => {
      unsubAudio();
      unsubLive();
      window.removeEventListener('athar_prayers_updated', refreshAch);
      window.removeEventListener('athar_khatmah_updated', refreshAch);
      window.removeEventListener('athar_midnight_reset', refreshAch);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isPreAdhanOrIqamah = liveState.liveCardPhase !== 'idle';
  const effectiveRingProgress = isPreAdhanOrIqamah
    ? liveState.liveCardGoldenProgressPercent
    : liveState.progressPercent;

  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference -
    (Math.min(100, Math.max(0, effectiveRingProgress)) / 100) * circumference;

  const currentStyle: LockScreenWidgetStyle =
    liveState.settings.lockScreenWidgetStyle || 'all';

  const handleSetWidgetStyle = (style: LockScreenWidgetStyle) => {
    LiveActivityService.saveSettings({ lockScreenWidgetStyle: style });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#060504]/96 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-6 select-none animate-fadeIn overflow-y-auto">
      {/* Top Lock Screen Dynamic Island Pill & Security Header */}
      <div className="w-full max-w-md mx-auto space-y-2.5">
        {/* Top Dynamic Island Capsule on Lock Screen */}
        <div className="mx-auto max-w-[335px] px-3.5 py-1.5 rounded-full bg-[#0D0B08] border border-[#C8A24A]/65 shadow-[0_6px_25px_rgba(0,0,0,0.95),0_0_15px_rgba(200,162,74,0.22)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="relative w-5 h-5 flex items-center justify-center">
              <svg className="w-5 h-5 -rotate-90" viewBox="0 0 24 24">
                <circle
                  cx="12"
                  cy="12"
                  r={radius}
                  fill="none"
                  stroke="rgba(200, 162, 74, 0.22)"
                  strokeWidth="2.5"
                />
                <circle
                  cx="12"
                  cy="12"
                  r={radius}
                  fill="none"
                  stroke="#E6C66E"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <Lock size={9} className="text-[#E6C66E] absolute" />
            </div>
            <span className="text-[11px] font-extrabold text-[#F3E5AB]">
              {liveState.liveCardPhase === 'awaiting_iqamah'
                ? `إقامة ${liveState.liveCardActivePrayerName}`
                : `صلاة ${liveState.nextPrayerName}`}
            </span>
          </div>

          {/* Center Mini Gold Progress Bar inside Dynamic Island */}
          <div className="w-12 h-1.5 rounded-full bg-[#1C1810] border border-[#C8A24A]/35 overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-[#FFF2C2] via-[#E6C66E] to-[#A67C22] rounded-full transition-all duration-700"
              style={{ width: `${effectiveRingProgress}%` }}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-black text-[#E6C66E] tabular-nums">
              -
              {isPreAdhanOrIqamah
                ? liveState.liveCardCountdownMMSS
                : liveState.countdownFormatted}
            </span>
          </div>
        </div>

        {/* Secondary Status Strip */}
        <div className="flex items-center justify-between text-[11px] text-[#C4B998] px-1">
          <div className="flex items-center gap-1.5 text-[#E6C66E] font-bold">
            <Lock size={12} />
            <span>ودجات شاشة القفل والـ Live Activities</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => ReminderEngine.launchFullScreenAdhan({ isPreview: true })}
              className="px-2.5 py-1 rounded-xl bg-[#221C10] hover:bg-[#2F2716] border border-[#E6C66E]/55 text-[10px] font-extrabold text-[#F3E5AB] flex items-center gap-1 transition-colors whitespace-nowrap"
            >
              <BellRing size={11} className="text-[#E6C66E]" />
              <span>تجربة شاشة الأذان</span>
            </button>
            <div className="flex items-center gap-1 text-[#F3E5AB] font-bold">
              <MapPin size={11} className="text-[#C8A24A]" />
              <span>{liveState.locationName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Center Clock & Lock Screen Widgets Suite */}
      <div className="w-full max-w-md mx-auto my-auto py-3 space-y-3.5 text-center">
        {/* Royal Lock Screen Clock & Dual Date */}
        <div>
          <h1 className="text-5xl sm:text-6xl font-extralight text-[#F3E5AB] tabular-nums tracking-tight drop-shadow-[0_4px_20px_rgba(200,162,74,0.25)]">
            {currentTime}
          </h1>
          <p className="text-xs sm:text-sm font-bold text-white mt-1.5">{currentDate}</p>
          <p className="text-xs text-[#E6C66E] mt-0.5 font-extrabold">
            {liveState.dateHijri || hijriDate || '٢٧ ربيع الأول ١٤٤٨ هـ'}
          </p>
        </div>

        {/* Lock Screen Widget Mode Selector */}
        {liveState.settings.showLockScreenWidget && (
          <div className="flex items-center justify-between bg-[#12100B]/90 border border-[#C8A24A]/35 rounded-2xl px-3 py-1.5 gap-2 flex-wrap">
            <span className="text-[10px] font-extrabold text-[#E6C66E] flex items-center gap-1">
              <LayoutGrid size={12} />
              <span>عرض الودجات:</span>
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {(
                [
                  { id: 'all', label: 'المجموعة المتكاملة' },
                  { id: 'small', label: 'الصغيرة + الشجرة' },
                  { id: 'medium', label: 'المتوسطة' },
                  { id: 'tree_wird', label: 'شجرة الأثر والآية' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleSetWidgetStyle(opt.id)}
                  className={`px-2 py-1 rounded-xl text-[10px] font-extrabold transition-all whitespace-nowrap ${
                    currentStyle === opt.id
                      ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] shadow'
                      : 'bg-[#19150E] text-[#C4B998] hover:text-white border border-[#C8A24A]/20'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* LIVE ACTIVITY CARD: Pre-Adhan (15-20m) to Iqamah with Golden Progress Bar */}
        {liveState.settings.showLockScreenWidget && (
          <PreAdhanIqamahLiveCard
            state={liveState}
            forcePreview={currentStyle === 'all'}
            onTriggerAdhanPreview={() =>
              ReminderEngine.launchFullScreenAdhan({ isPreview: true })
            }
          />
        )}

        {/* 1. SMALL WIDGETS ROW (Small Prayer Countdown Widget + Impact Tree & Daily Verse Widget) */}
        {liveState.settings.showLockScreenWidget &&
          (currentStyle === 'all' ||
            currentStyle === 'both' ||
            currentStyle === 'small') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-right">
              <SmallPrayerWidgetCard state={liveState} />
              <ImpactTreeWirdWidgetCard
                state={liveState}
                impactBreakdown={impactBreakdown}
              />
            </div>
          )}

        {/* 2. WIDE IMPACT TREE & DAILY WIRD WIDGET */}
        {liveState.settings.showLockScreenWidget && currentStyle === 'tree_wird' && (
          <WideImpactTreeWirdWidgetCard
            state={liveState}
            impactBreakdown={impactBreakdown}
          />
        )}

        {/* 3. MEDIUM WIDGET CARD (Full Countdown, Gold Progress Bar & 6-Prayer Table) */}
        {liveState.settings.showLockScreenWidget &&
          (currentStyle === 'all' ||
            currentStyle === 'both' ||
            currentStyle === 'medium') && (
            <MediumPrayerWidgetCard state={liveState} />
          )}

        {/* MediaSession / Quran & Adhkar Lock Screen Player Widget */}
        {audioState && (
          <div className="mx-auto w-full bg-gradient-to-b from-[#17130C]/95 to-[#0B0907]/95 border border-[#C8A24A]/55 rounded-[28px] p-4 shadow-2xl text-right backdrop-blur-xl">
            <div className="flex items-center justify-between text-[11px] text-[#E6C66E] mb-2 font-extrabold">
              <span className="flex items-center gap-1.5">
                <Sparkles size={12} />
                {audioState.category === 'adhkar' ? 'مشغّل الأذكار' : 'مشغّل القرآن الكريم'}
              </span>
              <span className="text-[#C4B998] font-mono text-[10px]">Live MediaSession</span>
            </div>

            <div className="flex items-center gap-3">
              <AtharBrandLogo size="sm" showWordmark={false} />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-extrabold text-white truncate">
                  {audioState.title}
                </h3>
                <p className="text-xs text-[#C4B998] truncate mt-0.5">
                  {audioState.subtitle}
                </p>
              </div>
            </div>

            {/* Audio Progress Bar */}
            <div className="mt-3">
              <div className="w-full bg-[#1C1810] border border-[#C8A24A]/30 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-l from-[#F3E5AB] to-[#C8A24A] h-full transition-all duration-300"
                  style={{
                    width:
                      audioState.duration > 0
                        ? `${(audioState.currentTime / audioState.duration) * 100}%`
                        : '0%',
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#C4B998] mt-1 font-mono tabular-nums">
                <span>{Math.floor(audioState.currentTime)}s</span>
                <span>{Math.floor(audioState.duration)}s</span>
              </div>
            </div>

            {/* Media Controls */}
            <div className="mt-3 flex items-center justify-center gap-6">
              <button
                onClick={() => AudioService.seekTo(Math.max(0, audioState.currentTime - 10))}
                className="text-[#C4B998] hover:text-[#F3E5AB] p-2 transition-colors"
                title="السابق"
                aria-label="السابق"
              >
                <SkipForward size={20} />
              </button>

              <button
                onClick={() => AudioService.togglePlayPause()}
                className="w-12 h-12 rounded-full bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#070707] flex items-center justify-center hover:brightness-110 transition-transform active:scale-95 shadow-[0_4px_20px_rgba(200,162,74,0.45)]"
                title={audioState.isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                aria-label={audioState.isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
              >
                {audioState.isPlaying ? (
                  <Pause size={20} fill="currentColor" />
                ) : (
                  <Play size={20} fill="currentColor" className="mr-0.5" />
                )}
              </button>

              <button
                onClick={() => AudioService.seekTo(audioState.currentTime + 10)}
                className="text-[#C4B998] hover:text-[#F3E5AB] p-2 transition-colors"
                title="التالي"
                aria-label="التالي"
              >
                <SkipBack size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Unlock Pill */}
      <div className="flex flex-col items-center gap-2 pt-2">
        <button
          onClick={onUnlock}
          className="flex items-center gap-2 px-7 py-2.5 rounded-full bg-gradient-to-r from-[#1F1A10] to-[#14110A] hover:from-[#2B2416] hover:to-[#1C170E] text-[#F3E5AB] text-xs font-extrabold border border-[#C8A24A]/55 shadow-[0_6px_20px_rgba(0,0,0,0.85)] transition-all active:scale-95"
        >
          <Unlock size={14} className="text-[#E6C66E]" />
          <span>انقر للعودة إلى التطبيق وإلغاء قفل الشاشة</span>
        </button>
      </div>
    </div>
  );
};

