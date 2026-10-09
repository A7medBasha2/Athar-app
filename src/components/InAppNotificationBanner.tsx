import React, { useState, useEffect } from 'react';
import { InAppNotification, NotificationService } from '../services/notificationService';
import { BookOpen, Heart, Clock, Award, Info, X, Volume2, Play } from 'lucide-react';

export const InAppNotificationBanner: React.FC = () => {
  const [currentNotification, setCurrentNotification] = useState<InAppNotification | null>(null);

  useEffect(() => {
    const unsubscribe = NotificationService.subscribe((item) => {
      setCurrentNotification(item);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentNotification) return;
    const timer = setTimeout(() => {
      setCurrentNotification(null);
    }, 7500);
    return () => clearTimeout(timer);
  }, [currentNotification]);

  if (!currentNotification) return null;

  const getIcon = () => {
    switch (currentNotification.type) {
      case 'quran':
        return <BookOpen size={18} className="text-[#D4AF37]" />;
      case 'salawat':
        return <Heart size={18} className="text-emerald-400" />;
      case 'prayer':
        return <Clock size={18} className="text-amber-400" />;
      case 'wird':
        return <Award size={18} className="text-cyan-400" />;
      default:
        return <Info size={18} className="text-blue-400" />;
    }
  };

  const getAccentBorder = () => {
    switch (currentNotification.type) {
      case 'quran':
        return 'border-[#D4AF37]/50 shadow-[#D4AF37]/10';
      case 'salawat':
        return 'border-emerald-500/50 shadow-emerald-500/10';
      case 'prayer':
        return 'border-amber-500/50 shadow-amber-500/10';
      case 'wird':
        return 'border-cyan-500/50 shadow-cyan-500/10';
      default:
        return 'border-slate-700 shadow-slate-900/50';
    }
  };

  return (
    <aside
      aria-label="إشعار التطبيق"
      className="fixed top-3 inset-x-3 z-50 max-w-md mx-auto pointer-events-auto transition-all transform duration-300 animate-slideDown"
    >
      <div
        className={`bg-[#121922]/98 backdrop-blur-md border ${getAccentBorder()} text-slate-100 rounded-2xl p-3.5 shadow-2xl flex items-start gap-3 select-none`}
      >
        <div className="p-2 bg-slate-800/80 rounded-xl shrink-0 mt-0.5">
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-xs font-bold text-slate-100 truncate">
              {currentNotification.title}
            </h4>
            <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
              الآن
            </span>
          </div>

          <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed">
            {currentNotification.body}
          </p>

          {/* Action Button */}
          {currentNotification.onAction && currentNotification.actionText && (
            <div className="mt-2.5 flex items-center justify-end gap-2">
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
            </div>
          )}
        </div>

        <button
          onClick={() => setCurrentNotification(null)}
          className="text-slate-500 hover:text-slate-300 p-1 -mr-1 rounded-lg transition-colors"
          title="إغلاق التنبيه"
          aria-label="إغلاق التنبيه"
        >
          <X size={15} />
        </button>
      </div>
    </aside>
  );
};
