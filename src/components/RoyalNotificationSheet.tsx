import React, { useEffect, useState } from 'react';
import {
  Volume2,
  VolumeX,
  X,
  ExternalLink,
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

  useEffect(() => {
    const unsubscribe = RoyalReminderEngine.subscribe((next) => {
      setEngineState(next);
    });
    return () => {
      unsubscribe();
    };
  }, []);

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

  const getIconForType = () => {
    switch (activeItem.type) {
      case 'ayah_daily':
        return <BookOpen size={16} className="text-[#E6C66E]" />;
      case 'dhikr_salawat':
        return <Sparkles size={16} className="text-[#E6C66E]" />;
      case 'daily_wird':
        return <Clock size={16} className="text-[#E6C66E]" />;
      case 'parents_birr':
        return <Heart size={16} className="text-[#E6C66E]" />;
      default:
        return <Sparkles size={16} className="text-[#E6C66E]" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={activeItem.badgeTitle}
      className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-10 sm:pt-16 pointer-events-auto bg-black/60 backdrop-blur-md animate-fadeIn"
    >
      {/* Luxury Floating Gold Glass Card */}
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-gradient-to-b from-[#1C160E] via-[#120E09] to-[#0A0805] border-2 border-[#E6C66E]/70 shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(230,198,110,0.25)] transition-all animate-scaleUp text-right"
        dir="rtl"
      >
        {/* Luminous Gold Halo Top Highlight */}
        <div
          className="absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-44 rounded-full blur-3xl pointer-events-none opacity-30"
          style={{
            background: 'radial-gradient(circle, #E6C66E 0%, #C8A24A 45%, transparent 70%)',
          }}
        />

        {/* Ambient Top Bar */}
        <div className="relative z-10 px-5 pt-4 pb-2 border-b border-[#C8A24A]/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E6C66E]/15 border border-[#E6C66E]/40 flex items-center justify-center shadow-[0_0_12px_rgba(230,198,110,0.25)]">
              {getIconForType()}
            </div>
            <div>
              <div className="text-[11px] font-black tracking-wide text-[#E6C66E] flex items-center gap-1.5">
                <span>{activeItem.badgeTitle}</span>
                {engineState.queueLength > 0 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#E6C66E]/20 text-[#FFFDF8] text-[9px] border border-[#E6C66E]/30">
                    <Layers size={10} />
                    <span>+{engineState.queueLength} تالٍ</span>
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[#A89E88]">{activeItem.title}</div>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="إغلاق التنبيه"
            className="w-8 h-8 rounded-full bg-[#18130B]/90 border border-[#C8A24A]/30 text-[#A89E88] hover:text-[#FFFDF8] hover:border-[#E6C66E] flex items-center justify-center transition-all cursor-pointer active:scale-95"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="relative z-10 p-5 sm:p-6 space-y-4">
          {activeItem.subtitle && (
            <div className="text-center text-xs font-bold text-[#E6C66E]/90 tracking-wide">
              {activeItem.subtitle}
            </div>
          )}

          {/* Sacred Quranic / Dhikr Text Card */}
          <div className="relative p-5 rounded-2xl bg-gradient-to-b from-[#18120B]/90 to-[#0F0B06]/95 border border-[#E6C66E]/30 shadow-inner text-center">
            <p className="font-arabic text-lg sm:text-xl font-bold text-[#FFFDF8] leading-loose tracking-wide drop-shadow-sm select-text">
              {activeItem.mainText}
            </p>
          </div>

          {/* Reference / Fadl banner */}
          {activeItem.referenceText && (
            <div className="p-3 rounded-xl bg-[#140F08] border border-[#C8A24A]/25 flex items-center gap-2.5 text-xs text-[#D8CFBC] leading-relaxed">
              <Sparkles size={14} className="text-[#E6C66E] shrink-0" />
              <span>{activeItem.referenceText}</span>
            </div>
          )}

          {/* Live Audio & Quick Action Row */}
          <div className="pt-2 flex items-center justify-between gap-2">
            {/* Audio Toggle */}
            {activeItem.mode !== 'banner_only' ? (
              <button
                type="button"
                onClick={handleToggleAudio}
                className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 ${
                  engineState.isPlayingAudio
                    ? 'bg-[#E6C66E]/20 text-[#E6C66E] border-[#E6C66E]/60 shadow-[0_0_15px_rgba(230,198,110,0.25)]'
                    : 'bg-[#18130B] text-[#D8CFBC] border-[#C8A24A]/30 hover:border-[#E6C66E]/50'
                }`}
              >
                {engineState.isPlayingAudio ? (
                  <>
                    <Volume2 size={16} className="text-[#E6C66E] animate-pulse" />
                    <span>الصوت يعمل (كتم)</span>
                  </>
                ) : (
                  <>
                    <VolumeX size={16} className="text-[#A89E88]" />
                    <span>تشغيل الصوت المبارك</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex-1 py-2 px-3 rounded-xl bg-[#140F08] border border-[#C8A24A]/20 text-[11px] text-[#A89E88] text-center">
                إشعار مرئي صامت
              </div>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              className="py-2.5 px-4 rounded-xl bg-[#18130B] border border-[#C8A24A]/30 text-xs font-bold text-[#A89E88] hover:text-[#FFFDF8] hover:border-[#E6C66E]/50 transition-all cursor-pointer active:scale-98"
            >
              إيقاف
            </button>
          </div>

          {/* Big Royal Primary Action Button */}
          <button
            type="button"
            onClick={handleAction}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-l from-[#C8A24A] via-[#E6C66E] to-[#C8A24A] text-black font-black text-sm flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(230,198,110,0.45)] hover:shadow-[0_6px_25px_rgba(230,198,110,0.6)] transition-all cursor-pointer active:scale-98"
          >
            <span>{activeItem.actionButtonText}</span>
            <ChevronLeft size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
