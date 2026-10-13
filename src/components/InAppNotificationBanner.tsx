import React, { useState, useEffect } from 'react';
import { InAppNotification, NotificationService } from '../services/notificationService';
import { X, Volume2 } from 'lucide-react';
import { AudioService } from '../services/audioService';
import { AtharBrandLogo } from './AtharBrandLogo';

interface InAppNotificationBannerProps {
  notification?: InAppNotification | null;
  onDismiss?: () => void;
}

export const InAppNotificationBanner: React.FC<InAppNotificationBannerProps> = ({
  notification: externalNotification,
  onDismiss
}) => {
  const [internalNotification, setInternalNotification] = useState<InAppNotification | null>(
    () => NotificationService.getActiveNotification()
  );

  useEffect(() => {
    const unsub = NotificationService.subscribe((item) => {
      setInternalNotification(item);
    });
    return () => unsub();
  }, []);

  const activeNotification = externalNotification !== undefined ? externalNotification : internalNotification;
  if (!activeNotification) return null;

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    } else {
      NotificationService.dismissInAppBanner(false);
    }
  };

  const handleStopAndDismiss = () => {
    AudioService.stopTemporaryAndResume(false);
    handleDismiss();
  };

  return (
    <div className="fixed top-4 left-4 right-4 z-50 flex justify-center pointer-events-none select-none">
      <div className="w-full max-w-md bg-gradient-to-r from-[#1A160E]/98 via-[#0E0D0A]/98 to-[#1A160E]/98 backdrop-blur-xl border border-[#C8A24A]/65 rounded-2xl p-4 shadow-[0_15px_35px_rgba(0,0,0,0.85)] pointer-events-auto transform transition-all duration-300 ease-out animate-slideDown text-right">
        <div className="flex items-start gap-3">
          <div className="shrink-0 flex items-center justify-center mt-0.5">
            <AtharBrandLogo size="sm" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-extrabold text-[#F3E5AB] truncate">
                {activeNotification.title}
              </h4>
              <span className="text-[10px] text-[#E6C66E] bg-[#C8A24A]/20 border border-[#C8A24A]/35 px-2 py-0.5 rounded-full font-bold shrink-0">
                الآن
              </span>
            </div>
            <p className="mt-1 text-xs text-[#C4B998] leading-relaxed font-quran">
              {activeNotification.body}
            </p>

            <div className="mt-2.5 flex items-center gap-2">
              {activeNotification.onAction && activeNotification.actionText && (
                <button
                  onClick={() => {
                    activeNotification.onAction?.();
                    handleDismiss();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1A160E] hover:bg-[#241E13] text-[#F3E5AB] border border-[#C8A24A]/50 text-xs font-extrabold transition-all"
                >
                  <span>{activeNotification.actionText}</span>
                </button>
              )}

              {(activeNotification.type === 'prayer' ||
                activeNotification.type === 'quran' ||
                activeNotification.type === 'dhikr' ||
                activeNotification.type === 'parents' ||
                activeNotification.type === 'wird' ||
                Boolean(activeNotification.audioUrl) ||
                Boolean(activeNotification.autoPlayAudio)) && (
                <button
                  onClick={handleStopAndDismiss}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-[#E6C66E] to-[#B88A2D] text-[#080705] text-xs font-extrabold transition-all hover:brightness-110 shadow"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>إيقاف الصوت</span>
                </button>
              )}
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1 text-[#C4B998] hover:text-white rounded-lg hover:bg-[#1E1B14] transition-colors"
            aria-label="إغلاق التنبيه"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
