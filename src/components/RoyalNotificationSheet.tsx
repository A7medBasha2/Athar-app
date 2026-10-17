import React, { useEffect, useState } from 'react';
import {
  Volume2,
  VolumeX,
  X,
  Sparkles,
  BookOpen,
  Heart,
  Clock,
  Layers,
  ChevronLeft
} from 'lucide-react';
import {
  RoyalReminderEngine,
  RoyalNotificationState,
  RoyalNotificationItem,
} from '../services/royalReminderEngine';
import { NavigationTab } from '../types';

interface RoyalNotificationSheetProps {
  onNavigate: (tab: NavigationTab, payload?: any) => void;
}

export const RoyalNotificationSheet: React.FC<RoyalNotificationSheetProps> = ({ onNavigate }) => {
  const [engineState, setEngineState] = useState<RoyalNotificationState>(() =>
    RoyalReminderEngine.getState()
  );
  const [silentProgress, setSilentProgress] = useState<number>(100);

  useEffect(() => {
    const unsubscribe = RoyalReminderEngine.subscribe((next) => {
      setEngineState(next);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Visual 5-second countdown progress bar when in silent notification mode (banner_only)
  useEffect(() => {
    const active = engineState.item;
    if (!active || active.mode !== 'banner_only') {
      setSilentProgress(100);
      return;
    }

    setSilentProgress(100);
    const startTime = Date.now();
    const duration = 5000;

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPct = Math.max(0, 100 - (elapsed / duration) * 100);
      setSilentProgress(remainingPct);
      if (remainingPct <= 0) {
        clearInterval(interval);
      }
    }, 50);

    return () => {
      clearInterval(interval);
    };
  }, [engineState.item?.id, engineState.item?.mode]);

  const activeItem: RoyalNotificationItem | null = engineState.item;
  if (!activeItem) return null;

  const handleDismiss = () => {
    RoyalReminderEngine.dismissCurrent();
  };

  const handleToggleAudio = () => {
    RoyalReminderEngine.toggleAudio();
  };

  const handleAction = () => {
    RoyalReminderEngine.executeAction(onNavigate);
  };

  const getCategoryIcon = () => {
    switch (activeItem.type) {
      case 'ayah_daily':
        return <BookOpen size={14} className="text-[#E6C66E]" />;
      case 'dhikr_salawat':
        return <Sparkles size={14} className="text-[#E6C66E]" />;
      case 'daily_wird':
        return <Clock size={14} className="text-[#E6C66E]" />;
      case 'parents_birr':
        return <Heart size={14} className="text-[#E6C66E]" />;
      default:
        return <Sparkles size={14} className="text-[#E6C66E]" />;
    }
  };

  return (
    /* Non-blocking wrapper: pointer-events-none so user can freely navigate and browse Athar underneath */
    <aside
      aria-live="assertive"
      aria-label={activeItem.badgeTitle}
      className="fixed top-2 sm:top-4 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-[99999] max-w-xl w-[calc(100%-1.5rem)] pointer-events-none transition-all duration-300"
    >
      {/* Luxury Floating Overlay Card: pointer-events-auto for card interactions */}
      <div
        className="pointer-events-auto relative w-full overflow-hidden rounded-3xl bg-gradient-to-b from-[#1E170F]/98 via-[#130E08]/98 to-[#0B0906]/98 border border-[#E6C66E]/55 shadow-[0_20px_60px_rgba(0,0,0,0.92),0_0_35px_rgba(230,198,110,0.22)] backdrop-blur-2xl text-right animate-slideDown select-none"
        dir="rtl"
      >
        {/* Subtle Ambient Gold Aura */}
        <div
          className="absolute -top-12 left-1/2 -translate-x-1/2 w-80 h-28 rounded-full blur-3xl pointer-events-none opacity-25"
          style={{
            background: 'radial-gradient(circle, #E6C66E 0%, #C8A24A 45%, transparent 70%)',
          }}
        />

        {/* 5-Second Silent Auto-Dismiss Linear Progress Line */}
        {activeItem.mode === 'banner_only' && (
          <div className="absolute top-0 inset-x-0 h-1 bg-[#1A140B] overflow-hidden z-20">
            <div
              className="h-full bg-gradient-to-l from-[#C8A24A] via-[#E6C66E] to-[#FFF2C2] transition-all ease-linear"
              style={{ width: `${silentProgress}%` }}
            />
          </div>
        )}

        {/* Header Bar with Official Athar Icon */}
        <div className="relative z-10 px-4 pt-3.5 pb-2.5 border-b border-[#C8A24A]/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Official Logo Emblem */}
            <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-[#18130B] border border-[#E6C66E]/50 flex items-center justify-center p-0.5 shadow-[0_0_12px_rgba(230,198,110,0.3)] shrink-0">
              <img
                src="/icon-logo.png"
                alt="أثر"
                className="w-full h-full object-contain filter drop-shadow-sm"
              />
            </div>

            {/* Title & Badge */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-[#E6C66E] truncate flex items-center gap-1">
                  <span>أَثَـر</span>
                  <span className="text-[#A89E88] font-normal">•</span>
                  <span>{activeItem.badgeTitle}</span>
                </span>

                {engineState.queueLength > 0 && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-[#E6C66E]/20 text-[#FFFDF8] text-[9px] border border-[#E6C66E]/30 shrink-0">
                    <Layers size={9} />
                    <span>+{engineState.queueLength}</span>
                  </span>
                )}
              </div>

              <div className="text-[10px] text-[#A89E88] truncate mt-0.5 flex items-center gap-1">
                {getCategoryIcon()}
                <span>{activeItem.title}</span>
              </div>
            </div>
          </div>

          {/* Left Controls: Audio Equalizer Pulse + Dismiss Button */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Live Audio Visualizer Pulse */}
            {engineState.isPlayingAudio && (
              <div
                className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-[#E6C66E]/15 border border-[#E6C66E]/35 text-[#E6C66E] text-[10px] font-bold"
                title="الصوت المبارك يعمل حالياً"
              >
                <span className="w-1 h-3 bg-[#E6C66E] rounded-full animate-bounce" />
                <span className="w-1 h-4 bg-[#E6C66E] rounded-full animate-bounce [animation-delay:0.15s]" />
                <span className="w-1 h-2 bg-[#E6C66E] rounded-full animate-bounce [animation-delay:0.3s]" />
              </div>
            )}

            {/* Silent Mode 5s Chip */}
            {activeItem.mode === 'banner_only' && (
              <span className="text-[9px] font-bold text-[#A89E88] bg-[#140F09] px-2 py-0.5 rounded-full border border-[#C8A24A]/20">
                إشعار صامت (5 ث)
              </span>
            )}

            {/* Quick Dismiss Button */}
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="إغلاق التنبيه"
              className="w-7 h-7 rounded-full bg-[#18130B] border border-[#C8A24A]/30 text-[#A89E88] hover:text-[#FFFDF8] hover:border-[#E6C66E] flex items-center justify-center transition-all cursor-pointer active:scale-95"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="relative z-10 px-4 py-3 sm:px-5 sm:py-3.5 space-y-3">
          {/* Subtitle / Surah / Time info */}
          {activeItem.subtitle && (
            <div className="text-center text-[11px] font-bold text-[#E6C66E]/90 tracking-wide">
              {activeItem.subtitle}
            </div>
          )}

          {/* Sacred Quranic / Dhikr Card */}
          <div className="relative p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-[#18120B]/90 to-[#0F0B06]/95 border border-[#E6C66E]/30 shadow-inner text-center">
            <p className="font-arabic text-base sm:text-lg font-bold text-[#FFFDF8] leading-loose tracking-wide drop-shadow-sm select-text">
              {activeItem.type === 'ayah_daily' ? (
                <span>
                  <span className="text-[#E6C66E]/80 font-normal ml-1">﴿</span>
                  {activeItem.mainText}
                  <span className="text-[#E6C66E]/80 font-normal mr-1">﴾</span>
                </span>
              ) : (
                activeItem.mainText
              )}
            </p>
          </div>

          {/* Reference / Fadl banner */}
          {activeItem.referenceText && (
            <div className="p-2 sm:p-2.5 rounded-xl bg-[#140F08] border border-[#C8A24A]/25 flex items-center gap-2 text-[11px] text-[#D8CFBC] leading-relaxed">
              <Sparkles size={13} className="text-[#E6C66E] shrink-0" />
              <span className="truncate sm:whitespace-normal">{activeItem.referenceText}</span>
            </div>
          )}

          {/* Action Row */}
          <div className="pt-1 flex items-center gap-2">
            {/* Audio Toggle (If not silent mode) */}
            {activeItem.mode !== 'banner_only' ? (
              <button
                type="button"
                onClick={handleToggleAudio}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 shrink-0 ${
                  engineState.isPlayingAudio
                    ? 'bg-[#E6C66E]/20 text-[#E6C66E] border-[#E6C66E]/60 shadow-[0_0_12px_rgba(230,198,110,0.25)]'
                    : 'bg-[#18130B] text-[#D8CFBC] border-[#C8A24A]/30 hover:border-[#E6C66E]/50'
                }`}
              >
                {engineState.isPlayingAudio ? (
                  <>
                    <Volume2 size={15} className="text-[#E6C66E] animate-pulse" />
                    <span>كتم</span>
                  </>
                ) : (
                  <>
                    <VolumeX size={15} className="text-[#A89E88]" />
                    <span>تشغيل الصوت</span>
                  </>
                )}
              </button>
            ) : null}

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={handleAction}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-l from-[#C8A24A] via-[#E6C66E] to-[#C8A24A] text-black font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(230,198,110,0.4)] hover:shadow-[0_6px_22px_rgba(230,198,110,0.55)] transition-all cursor-pointer active:scale-98"
            >
              <span>{activeItem.actionButtonText}</span>
              <ChevronLeft size={16} />
            </button>

            {/* Quick Stop/Dismiss */}
            <button
              type="button"
              onClick={handleDismiss}
              className="py-2.5 px-3 rounded-xl bg-[#18130B] border border-[#C8A24A]/30 text-xs font-bold text-[#A89E88] hover:text-[#FFFDF8] hover:border-[#E6C66E]/50 transition-all cursor-pointer active:scale-98 shrink-0"
            >
              إيقاف
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
