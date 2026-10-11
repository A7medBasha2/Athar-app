import React, { useState, useEffect } from 'react';
import { ActiveAudioState, AudioService } from '../services/audioService';
import { LiveActivityService, LiveActivityState } from '../services/liveActivityService';
import { AtharBrandLogo } from './AtharBrandLogo';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Lock,
  Unlock,
  Moon,
  Clock,
  MapPin,
  Sparkles,
  CheckCircle2,
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
    const unsubAudio = AudioService.subscribe(setAudioState);
    const unsubLive = LiveActivityService.subscribe(setLiveState);
    return () => {
      unsubAudio();
      unsubLive();
    };
  }, []);

  if (!isOpen) return null;

  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference -
    (Math.min(100, Math.max(0, liveState.progressPercent)) / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 bg-[#060504]/96 backdrop-blur-2xl flex flex-col justify-between p-5 sm:p-6 select-none animate-fadeIn overflow-y-auto">
      {/* Top Lock Screen Dynamic Island Pill & Security Header */}
      <div className="w-full max-w-md mx-auto space-y-3">
        {/* Top Dynamic Island Capsule on Lock Screen */}
        <div className="mx-auto max-w-[310px] px-3.5 py-1.5 rounded-full bg-[#0D0B08] border border-[#C8A24A]/55 shadow-[0_6px_25px_rgba(0,0,0,0.95),0_0_15px_rgba(200,162,74,0.2)] flex items-center justify-between gap-2">
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
              صلاة {liveState.nextPrayerName}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-black text-[#E6C66E] tabular-nums">
              -{liveState.countdownFormatted}
            </span>
          </div>
        </div>

        {/* Secondary Status Strip */}
        <div className="flex items-center justify-between text-[11px] text-[#C4B998] px-1">
          <div className="flex items-center gap-1.5 text-[#E6C66E] font-bold">
            <Lock size={13} />
            <span>شاشة القفل · النشاط المباشر</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#F3E5AB] font-bold">
            <MapPin size={12} className="text-[#C8A24A]" />
            <span>{liveState.locationName}</span>
          </div>
        </div>
      </div>

      {/* Center Clock & Live Activity Widgets */}
      <div className="w-full max-w-md mx-auto my-auto py-4 space-y-5 text-center">
        {/* Royal Lock Screen Clock & Dual Date */}
        <div>
          <h1 className="text-6xl sm:text-7xl font-extralight text-[#F3E5AB] tabular-nums tracking-tight drop-shadow-[0_4px_20px_rgba(200,162,74,0.25)]">
            {currentTime}
          </h1>
          <p className="text-sm font-bold text-white mt-2">{currentDate}</p>
          <p className="text-xs text-[#E6C66E] mt-1 font-extrabold">
            {liveState.dateHijri || hijriDate || '٢٧ ربيع الأول ١٤٤٨ هـ'}
          </p>
        </div>

        {/* LIVE ACTIVITY WIDGET: Prayer Countdown & Progress Bar Card */}
        {liveState.settings.showLockScreenWidget && (
          <div className="mx-auto w-full rounded-[28px] bg-gradient-to-b from-[#17130C]/95 via-[#0E0C08]/95 to-[#090806]/95 border border-[#C8A24A]/65 p-4 sm:p-5 shadow-[0_16px_42px_rgba(0,0,0,0.95),0_0_24px_rgba(200,162,74,0.16)] text-right backdrop-blur-xl space-y-3.5">
            {/* Widget Top Header */}
            <div className="flex items-center justify-between border-b border-[#C8A24A]/25 pb-2.5">
              <div className="flex items-center gap-2">
                <AtharBrandLogo size="xs" showWordmark={false} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#E6C66E] animate-pulse" />
                    <span className="text-xs font-extrabold text-[#F3E5AB]">
                      النشاط المباشر لمواقيت الصلاة
                    </span>
                  </div>
                  <span className="text-[10px] text-[#C4B998] block">
                    حساب فلكي محلي 100% بدون إنترنت
                  </span>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-[#241E11] border border-[#E6C66E]/50 text-[10px] font-extrabold text-[#E6C66E] flex items-center gap-1">
                <Clock size={11} />
                <span>{liveState.nextPrayerTime12}</span>
              </span>
            </div>

            {/* Next Prayer & Live Countdown Display */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold text-[#C4B998] block">
                  الصلاة القادمة
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-quran mt-0.5">
                  صلاة {liveState.nextPrayerName}
                </h2>
              </div>

              <div className="text-left bg-[#14110A] border border-[#C8A24A]/50 px-4 py-2.5 rounded-2xl shadow-inner">
                <span className="text-[10px] font-bold text-[#C4B998] block text-center">
                  متبقي للأذان
                </span>
                <span className="text-xl sm:text-2xl font-mono font-black text-[#E6C66E] tabular-nums tracking-wider block">
                  -{liveState.countdownFormatted}
                </span>
              </div>
            </div>

            {/* Golden Progress Bar between Current Prayer and Next Prayer */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-[#C4B998]">
                  من: <strong className="text-[#F3E5AB]">{liveState.currentPrayerName}</strong> ({liveState.currentPrayerTime12})
                </span>
                <span className="text-[#E6C66E] font-mono font-extrabold tabular-nums">
                  {Math.round(liveState.progressPercent)}%
                </span>
                <span className="text-[#C4B998]">
                  إلى: <strong className="text-[#E6C66E]">{liveState.nextPrayerName}</strong> ({liveState.nextPrayerTime12})
                </span>
              </div>

              <div className="relative w-full h-3 rounded-full bg-[#1C1810] border border-[#C8A24A]/45 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-[#FFF3C4] via-[#E6C66E] to-[#A67C22] shadow-[0_0_15px_rgba(230,198,110,0.85)] transition-all duration-700"
                  style={{ width: `${liveState.progressPercent}%` }}
                />
              </div>
            </div>

            {/* Daily 6-Stage Prayer Timeline */}
            <div className="grid grid-cols-6 gap-1.5 pt-1">
              {liveState.segments.map((seg) => (
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
                <h3 className="text-sm font-extrabold text-[#F3E5AB] truncate">
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
