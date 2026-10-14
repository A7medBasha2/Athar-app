import React, { useState, useEffect } from 'react';
import { ReminderEngine, RoyalAtharOverlayPayload } from '../services/reminderService';
import { AudioService } from '../services/audioService';
import {
  Volume2,
  VolumeX,
  X,
  BookOpen,
  Sparkles,
  Heart,
  Clock,
  ChevronLeft,
  Crown,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

interface RoyalAtharFullScreenModalProps {
  onNavigateToQuran?: () => void;
  onNavigateToTasbih?: () => void;
  onNavigateToAdhkar?: () => void;
}

export const RoyalAtharFullScreenModal: React.FC<RoyalAtharFullScreenModalProps> = ({
  onNavigateToQuran,
  onNavigateToTasbih,
  onNavigateToAdhkar,
}) => {
  const [activePayload, setActivePayload] = useState<RoyalAtharOverlayPayload | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(true);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15);
  const [progressPercent, setProgressPercent] = useState<number>(100);

  useEffect(() => {
    const unsub = ReminderEngine.subscribeRoyalOverlay((payload) => {
      setActivePayload(payload);
      if (payload) {
        const initialElapsed = Math.max(0, payload.initialElapsedSeconds || 0);
        const initialDur = payload.initialDurationSeconds && payload.initialDurationSeconds > 0
          ? payload.initialDurationSeconds
          : 15;
        const initialRemaining = Math.max(0, Math.ceil(initialDur - initialElapsed));
        const initialPct = Math.max(0, Math.min(100, 100 - (initialElapsed / initialDur) * 100));

        setSecondsRemaining(initialRemaining);
        setProgressPercent(initialPct);
        setIsPlayingAudio(true);

        // Seamless transition: If opened while audio was ringing outside,
        // resume internal audio smoothly from exact elapsed seconds!
        if (initialElapsed > 0 && payload.audioUrl) {
          AudioService.playUrl(
            payload.audioUrl,
            'reminder_verse',
            {
              title: payload.title,
              subtitle: payload.primaryText,
            },
            undefined,
            { startTime: initialElapsed }
          ).catch(() => {});
        }
      }
    });

    const unsubAudio = AudioService.subscribe((state) => {
      if (!activePayload) return;
      if (state) {
        setIsPlayingAudio(state.isPlaying);
        if (state.isPlaying) {
          const cur = state.currentTime;
          const dur = (state.duration && state.duration > 0)
            ? state.duration
            : (activePayload.initialDurationSeconds || 15);
          if (dur > 0) {
            const remaining = Math.max(0, Math.ceil(dur - cur));
            const pct = Math.max(0, Math.min(100, 100 - (cur / dur) * 100));
            setSecondsRemaining(remaining);
            setProgressPercent(pct);
          }
        }
      }
    });

    // Instant automatic dismiss as soon as audio finishes (zero freeze)
    const unsubAudioFinished = AudioService.addTemporaryAudioFinishedListener(() => {
      handleDismiss();
    });

    return () => {
      unsub();
      unsubAudio();
      unsubAudioFinished();
    };
  }, [activePayload?.category, activePayload?.title]);

  // High-frequency live progress tracking while audio is playing
  useEffect(() => {
    if (!activePayload) return;

    if (isPlayingAudio) {
      const timer = setInterval(() => {
        const cur = AudioService.getLiveCurrentTime();
        const dur = AudioService.getLiveDuration() || activePayload.initialDurationSeconds || 15;
        if (dur > 0) {
          const remaining = Math.max(0, Math.ceil(dur - cur));
          const pct = Math.max(0, Math.min(100, 100 - (cur / dur) * 100));
          setSecondsRemaining(remaining);
          setProgressPercent(pct);
        }
      }, 50);

      return () => clearInterval(timer);
    } else {
      // If audio is muted / silent mode: graceful linear countdown and auto-dismiss
      const intervalMs = 100;
      const durationMs = 12000;
      const step = (intervalMs / durationMs) * 100;

      const timer = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleDismiss();
            return 0;
          }
          return prev - 1;
        });
        setProgressPercent((prev) => Math.max(0, prev - step));
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [activePayload?.title, isPlayingAudio]);

  if (!activePayload) return null;

  const handleDismiss = () => {
    if (isPlayingAudio) {
      AudioService.stopTemporaryAndResume(true);
    }
    ReminderEngine.dismissRoyalOverlay();
  };

  const handleToggleAudio = () => {
    if (isPlayingAudio) {
      AudioService.pause();
      setIsPlayingAudio(false);
    } else {
      if (activePayload.playAudio) {
        activePayload.playAudio().catch(() => {});
        setIsPlayingAudio(true);
      } else if (activePayload.audioUrl) {
        const curElapsed = Math.max(0, (activePayload.initialDurationSeconds || 15) - secondsRemaining);
        AudioService.playUrl(
          activePayload.audioUrl,
          'reminder_verse',
          {
            title: activePayload.title,
            subtitle: activePayload.primaryText,
          },
          undefined,
          { startTime: curElapsed }
        ).catch(() => {});
        setIsPlayingAudio(true);
      }
    }
  };

  const handleExecuteAction = () => {
    const cat = activePayload.category;
    handleDismiss();

    if (cat === 'quran') {
      onNavigateToQuran?.();
    } else if (cat === 'dhikr') {
      onNavigateToTasbih?.() || onNavigateToAdhkar?.();
    } else if (cat === 'wird') {
      onNavigateToQuran?.();
    } else if (cat === 'parents') {
      onNavigateToAdhkar?.();
    }
  };

  const getThemedStyles = (cat: RoyalAtharOverlayPayload['category']) => {
    switch (cat) {
      case 'quran':
        return {
          icon: BookOpen,
          badgeBg: 'bg-[#062417] border-[#10B981]/60 text-[#A7F3D0]',
          ambientGlow: 'bg-[#10B981]/20',
          cardBorder: 'border-[#10B981]/40',
          gradientBg: 'from-[#052318]/95 via-[#0A3022]/95 to-[#041910]/95',
          categoryTitle: 'آيات القرآن الكريم وتدبر محكم التنزيل',
          highlightText: 'text-[#E6C66E]',
          iconBorder: 'border-[#10B981]/50',
        };
      case 'dhikr':
        return {
          icon: Sparkles,
          badgeBg: 'bg-[#091D3E] border-[#38BDF8]/60 text-[#BAE6FD]',
          ambientGlow: 'bg-[#38BDF8]/20',
          cardBorder: 'border-[#38BDF8]/40',
          gradientBg: 'from-[#081833]/95 via-[#0C2248]/95 to-[#061226]/95',
          categoryTitle: 'ذكر الله والاستغفار وطمأنينة القلوب',
          highlightText: 'text-[#E6C66E]',
          iconBorder: 'border-[#38BDF8]/50',
        };
      case 'wird':
        return {
          icon: Clock,
          badgeBg: 'bg-[#2A1706] border-[#F59E0B]/60 text-[#FDE68A]',
          ambientGlow: 'bg-[#F59E0B]/20',
          cardBorder: 'border-[#F59E0B]/40',
          gradientBg: 'from-[#231304]/95 via-[#351C07]/95 to-[#190E03]/95',
          categoryTitle: 'موعد الورد القرآني اليومي المبارك',
          highlightText: 'text-[#E6C66E]',
          iconBorder: 'border-[#F59E0B]/50',
        };
      case 'parents':
        return {
          icon: Heart,
          badgeBg: 'bg-[#2C0A15] border-[#F43F5E]/60 text-[#FECDD3]',
          ambientGlow: 'bg-[#F43F5E]/20',
          cardBorder: 'border-[#F43F5E]/40',
          gradientBg: 'from-[#240811]/95 via-[#360D1A]/95 to-[#1A060C]/95',
          categoryTitle: 'بر الوالدين وباب الإحسان والرضا',
          highlightText: 'text-[#E6C66E]',
          iconBorder: 'border-[#F43F5E]/50',
        };
    }
  };

  const theme = getThemedStyles(activePayload.category);
  const CategoryIcon = theme.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="تنبيه الأثر الملكي"
      className="fixed inset-0 z-[99998] bg-[#000000]/88 backdrop-blur-xl flex flex-col justify-start sm:justify-center items-center p-3 sm:p-6 overflow-y-auto select-none font-arabic animate-fadeIn"
    >
      {/* Top Background Atmospheric Glows */}
      <div className={`pointer-events-none fixed top-10 w-80 h-80 rounded-full blur-[100px] ${theme.ambientGlow} transition-all duration-700`} />
      <div className="pointer-events-none fixed bottom-10 w-96 h-96 rounded-full blur-[120px] bg-[#C8A24A]/10" />

      {/* Outer Floating Overlay Container */}
      <div className="w-full max-w-lg mt-3 sm:mt-0 relative z-10 space-y-3.5">
        
        {/* Top Royal Status Pill (Indicates Full-Screen Intent / System Overlay) */}
        <div className="mx-auto max-w-fit px-3.5 py-1.5 rounded-full bg-[#14100A]/95 border border-[#E6C66E]/50 shadow-[0_4px_20px_rgba(0,0,0,0.8),0_0_12px_rgba(230,198,110,0.2)] flex items-center justify-center gap-2 text-center">
          <Crown size={13} className="text-[#E6C66E] animate-pulse" />
          <span className="text-[11px] font-extrabold text-[#FFF2C2] tracking-wide">
            نمط الأثر الملكي · إشعار ملء الشاشة وقفل الهاتف
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
        </div>

        {/* Main Royal Card (Mirroring activity_athan_fullscreen.xml) */}
        <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-b ${theme.gradientBg} border ${theme.cardBorder} shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_30px_rgba(230,198,110,0.22)] backdrop-blur-2xl transition-all`}>
          
          {/* Subtle Ambient Inner Vignette */}
          <div className="pointer-events-none absolute inset-0 bg-radial-gradient from-transparent via-transparent to-black/40" />

          <div className="relative p-4 sm:p-6 space-y-4">
            
            {/* 1. Header Bar: Royal Emblem + Category Badge + Close */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#C8A24A]/25">
              <div className="flex items-center gap-2.5">
                {/* Royal Mihrab Arch Logo Frame */}
                <div className={`w-11 h-11 rounded-2xl p-1 bg-gradient-to-br from-[#2D2313] to-[#120F08] border ${theme.iconBorder} shadow-[0_0_15px_rgba(230,198,110,0.35)] flex items-center justify-center shrink-0`}>
                  <img
                    src="/icon-logo.png"
                    alt="شعار أثر"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain filter drop-shadow-[0_0_6px_rgba(255,242,194,0.6)]"
                    onError={(e) => {
                      e.currentTarget.src = '/athar-royal-icon.png';
                    }}
                  />
                </div>

                <div>
                  <span className={`px-2.5 py-0.5 rounded-full border text-[10.5px] font-extrabold inline-flex items-center gap-1.5 shadow-sm ${theme.badgeBg}`}>
                    <CategoryIcon size={12} />
                    <span>{activePayload.badge}</span>
                  </span>
                  <h3 className="text-xs text-[#C4B998] font-bold mt-1">
                    {theme.categoryTitle}
                  </h3>
                </div>
              </div>

              {/* Close Button (✕) */}
              <button
                type="button"
                onClick={handleDismiss}
                className="w-9 h-9 rounded-xl bg-[#1A160F] hover:bg-[#2A2214] border border-[#C8A24A]/40 text-[#C4B998] hover:text-[#FFF2C2] flex items-center justify-center transition-all active:scale-95 shrink-0"
                title="إغلاق التنبيه"
              >
                <X size={17} />
              </button>
            </div>

            {/* 2. Main Title */}
            <div className="text-right">
              <h2 className="text-base sm:text-lg font-extrabold text-[#FFF2C2] drop-shadow-sm flex items-center gap-2">
                <span>{activePayload.title}</span>
                {isPlayingAudio && (
                  <span className="flex items-center gap-0.5 text-[#E6C66E] shrink-0">
                    <span className="w-1 h-3.5 bg-[#E6C66E] rounded-full animate-bounce" />
                    <span className="w-1 h-5 bg-[#FFF2C2] rounded-full animate-bounce [animation-delay:0.15s]" />
                    <span className="w-1 h-3 bg-[#E6C66E] rounded-full animate-bounce [animation-delay:0.3s]" />
                  </span>
                )}
              </h2>
            </div>

            {/* 3. Sacred Text / Scripture Card */}
            <div className="relative p-4 rounded-2xl bg-[#080705]/80 border border-[#C8A24A]/30 text-right space-y-2 shadow-inner">
              <p className="text-sm sm:text-base font-extrabold text-[#F3E5AB] leading-relaxed tracking-wide select-text">
                {activePayload.primaryText}
              </p>

              {activePayload.subtitle && (
                <p className="text-xs text-[#E8E0CE] leading-relaxed border-t border-[#C8A24A]/20 pt-2 font-medium">
                  {activePayload.subtitle}
                </p>
              )}
            </div>

            {/* 4. Action Buttons (Golden Audio + Quick Action + Close) */}
            <div className="flex items-center gap-2.5 pt-1 flex-wrap sm:flex-nowrap">
              {/* Golden Audio Toggle Button */}
              <button
                type="button"
                onClick={handleToggleAudio}
                className="flex-1 py-2.5 px-3.5 rounded-2xl bg-gradient-to-r from-[#E6C66E] via-[#F3E5AB] to-[#B88A2D] text-[#080705] font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(230,198,110,0.35)] hover:brightness-105 active:scale-95 transition-all"
              >
                {isPlayingAudio ? (
                  <>
                    <VolumeX size={15} />
                    <span>كتم الصوت</span>
                  </>
                ) : (
                  <>
                    <Volume2 size={15} />
                    <span>تشغيل الصوت</span>
                  </>
                )}
              </button>

              {/* Primary App Action Button */}
              <button
                type="button"
                onClick={handleExecuteAction}
                className="flex-1 py-2.5 px-3.5 rounded-2xl bg-[#1C160F] hover:bg-[#261E14] border border-[#E6C66E]/60 text-[#FFF2C2] font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <span>{activePayload.actionText}</span>
                <ChevronLeft size={14} className="text-[#E6C66E]" />
              </button>

              {/* Dismiss / Close Button */}
              <button
                type="button"
                onClick={handleDismiss}
                className="py-2.5 px-4 rounded-2xl bg-[#120F0A] hover:bg-[#1A160F] border border-[#C8A24A]/30 text-[#C4B998] hover:text-white font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 shrink-0"
              >
                <span>إغلاق</span>
              </button>
            </div>

            {/* 5. Countdown Indicator Bar */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-[10px] text-[#C4B998] mb-1.5">
                <span className="flex items-center gap-1 text-[#E6C66E] font-bold">
                  <ShieldCheck size={11} />
                  <span>تنبيه أثر الملكي نشط</span>
                </span>
                <span className="font-mono font-bold text-[#FFF2C2]">
                  الإغلاق التلقائي خلال {secondsRemaining} ثانية
                </span>
              </div>

              {/* Golden Progress Line (matches Android viewGoldProgressBar) */}
              <div className="w-full h-1.5 rounded-full bg-[#1A140B] border border-[#C8A24A]/30 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-l from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] rounded-full transition-all duration-100 ease-linear shadow-[0_0_10px_#E6C66E]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
