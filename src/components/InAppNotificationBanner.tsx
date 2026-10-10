import React, { useState, useEffect } from 'react';
import { InAppNotification, NotificationService } from '../services/notificationService';
import { AudioService } from '../services/audioService';
import { BookOpen, Heart, Clock, Award, Info, X, Play, Square, Sparkles, FastForward, ListOrdered } from 'lucide-react';

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

  if (!currentNotification) return null;

  const totalWaiting = currentNotification.totalInQueue || 0;

  const getIcon = () => {
    switch (currentNotification.type) {
      case 'parents':
        return <Heart size={18} className="text-rose-400" />;
      case 'quran':
        return <BookOpen size={18} className="text-[#D4AF37]" />;
      case 'salawat':
        return <Heart size={18} className="text-amber-400" />;
      case 'dhikr':
        return <Sparkles size={18} className="text-[#D4AF37]" />;
      case 'prayer':
        return <Clock size={18} className="text-amber-400" />;
      case 'wird':
        return <Award size={18} className="text-cyan-400" />;
      default:
        return <Info size={18} className="text-[#D4AF37]" />;
    }
  };

  const isParentsType = currentNotification.type === 'parents';

  return (
    <aside
      aria-label="إشعار التطبيق"
      className="fixed top-3 inset-x-3 z-[100] max-w-md mx-auto pointer-events-auto transition-all transform duration-300 animate-slideDown"
    >
      <div
        className={`bg-[#111821]/98 backdrop-blur-md ${
          isParentsType ? 'border-rose-500/60 shadow-rose-500/15' : 'border-[#D4AF37]/60 shadow-[#D4AF37]/15'
        } text-slate-100 rounded-2xl p-3.5 shadow-2xl flex items-start gap-3 select-none border`}
      >
        <div
          className={`p-2 rounded-xl shrink-0 mt-0.5 border ${
            isParentsType
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
              : 'bg-[#D4AF37]/15 border-[#D4AF37]/30 text-[#D4AF37]'
          }`}
        >
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <h4
              className={`text-xs font-bold truncate ${
                isParentsType ? 'text-rose-300' : 'text-[#D4AF37]'
              }`}
            >
              {currentNotification.title}
            </h4>

            <div className="flex items-center gap-1.5 shrink-0">
              {totalWaiting > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
                  <ListOrdered size={10} />
                  <span>في الدور: +{totalWaiting}</span>
                </span>
              )}
              <span className="text-[10px] text-slate-400 tabular-nums">الآن</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-200 mt-1 line-clamp-2 leading-relaxed font-quran">
            {currentNotification.body}
          </p>

          {/* Action & Queue Buttons */}
          <div className="mt-2.5 flex items-center justify-end gap-1.5 flex-wrap">
            {/* If there are more queued items waiting their turn, provide button to advance */}
            {totalWaiting > 0 && (
              <button
                onClick={() => NotificationService.finishActiveAndAdvance(false)}
                className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 rounded-lg text-[10px] font-bold transition-transform active:scale-95"
                title="تخطي للتنبيه التالي في الدور"
              >
                <FastForward size={10} />
                <span>التالي في الدور</span>
              </button>
            )}

            {isPlayingAudio && (
              <button
                onClick={() => {
                  AudioService.stopTemporaryAndResume();
                  NotificationService.finishActiveAndAdvance(false);
                }}
                className="flex items-center gap-1 px-2.5 py-1 bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-700/50 rounded-lg text-[11px] font-bold transition-transform active:scale-95"
                title="إيقاف التنبيه الصوتي الحالي والانتقال لما بعده"
              >
                <Square size={10} fill="currentColor" />
                <span>إيقاف التنبيه</span>
              </button>
            )}

            {currentNotification.onAction && currentNotification.actionText && (
              <button
                onClick={() => {
                  currentNotification.onAction?.();
                }}
                className={`flex items-center gap-1.5 px-3 py-1 ${
                  isParentsType
                    ? 'bg-gradient-to-r from-rose-500 to-rose-600 hover:brightness-110 text-white'
                    : 'bg-gradient-to-r from-[#D4AF37] to-[#B38F24] hover:brightness-110 text-slate-950'
                } rounded-lg text-[11px] font-bold transition-transform active:scale-95 shadow`}
              >
                <Play size={11} fill="currentColor" />
                <span>{currentNotification.actionText}</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 -mr-1">
          <button
            onClick={() => NotificationService.dismissInAppBanner(false)}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg transition-colors"
            title="إغلاق التنبيه والانتقال للدور التالي"
            aria-label="إغلاق التنبيه"
          >
            <X size={15} />
          </button>
          {totalWaiting > 1 && (
            <button
              onClick={() => NotificationService.dismissInAppBanner(true)}
              className="text-[9px] text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors"
              title="إغلاق جميع التنبيهات المنتظرة"
            >
              تخطي الكل
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
