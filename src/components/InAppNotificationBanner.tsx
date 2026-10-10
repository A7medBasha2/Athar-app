import React, { useState, useEffect } from 'react';
import { InAppNotification, NotificationService } from '../services/notificationService';
import { AudioService } from '../services/audioService';
import { BookOpen, Heart, Clock, Award, Info, X, Play, Square, Sparkles } from 'lucide-react';

export const InAppNotificationBanner: React.FC = () => {
  const [currentNotification, setCurrentNotification] = useState<InAppNotification | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = NotificationService.subscribe((item) => {
      setCurrentNotification(item);
    });
    const unsubAudio = AudioService.subscribe((state) => {
      setIsPlayingAudio(Boolean(state?.isPlaying));
    });
    return () => {
      unsubscribe();
      unsubAudio();
    };
  }, []);

  useEffect(() => {
    if (!currentNotification) return;
    const timer = setTimeout(() => {
      setCurrentNotification(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [currentNotification]);

  if (!currentNotification) return null;

  const getIcon = () => {
    switch (currentNotification.type) {
      case 'quran':
        return <BookOpen size={18} className="text-[#D4AF37]" />;
      case 'salawat':
        return <Heart size={18} className="text-[#D4AF37]" />;
      case 'dhikr':
        return <Sparkles size={18} className="text-[#D4AF37]" />;
      case 'prayer':
        return <Clock size={18} className="text-[#D4AF37]" />;
      case 'wird':
        return <Award size={18} className="text-[#D4AF37]" />;
      default:
        return <Info size={18} className="text-[#D4AF37]" />;
    }
  };

  return (
    <aside
      aria-label="إشعار التطبيق"
      className="fixed top-3 inset-x-3 z-[100] max-w-md mx-auto pointer-events-auto transition-all transform duration-300 animate-slideDown"
    >
      <div
        className="bg-[#111821]/98 backdrop-blur-md border border-[#D4AF37]/60 shadow-[#D4AF37]/15 text-slate-100 rounded-2xl p-3.5 shadow-2xl flex items-start gap-3 select-none"
      >
        <div className="p-2 bg-[#D4AF37]/15 border border-[#D4AF37]/30 rounded-xl shrink-0 mt-0.5">
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-xs font-bold text-[#D4AF37] truncate">
              {currentNotification.title}
            </h4>
            <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
              الآن
            </span>
          </div>

          <p className="text-[11px] text-slate-200 mt-1 line-clamp-2 leading-relaxed font-quran">
            {currentNotification.body}
          </p>

          {/* Action Buttons */}
          <div className="mt-2.5 flex items-center justify-end gap-2">
            {isPlayingAudio && (
              <button
                onClick={() => {
                  AudioService.stopTemporaryAndResume();
                  setCurrentNotification(null);
                }}
                className="flex items-center gap-1 px-2.5 py-1 bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-700/50 rounded-lg text-[11px] font-bold transition-transform active:scale-95"
              >
                <Square size={10} fill="currentColor" />
                <span>إيقاف التنبيه</span>
              </button>
            )}

            {currentNotification.onAction && currentNotification.actionText && (
              <button
                onClick={() => {
                  currentNotification.onAction?.();
                  setCurrentNotification(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-[#D4AF37] to-[#B38F24] hover:brightness-110 text-slate-950 rounded-lg text-[11px] font-bold transition-transform active:scale-95 shadow"
              >
                <Play size={11} fill="currentColor" />
                <span>{currentNotification.actionText}</span>
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => setCurrentNotification(null)}
          className="text-slate-400 hover:text-slate-200 p-1 -mr-1 rounded-lg transition-colors"
          title="إغلاق التنبيه"
          aria-label="إغلاق التنبيه"
        >
          <X size={15} />
        </button>
      </div>
    </aside>
  );
};
