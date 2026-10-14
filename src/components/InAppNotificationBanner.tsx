import React, { useState, useEffect } from 'react';
import { NotificationService, InAppNotification } from '../services/notificationService';
import { AudioService } from '../services/audioService';
import {
  Volume2,
  VolumeX,
  X,
  ChevronLeft,
  Sparkles,
  Heart,
  BookOpen,
  Clock,
  Layers,
} from 'lucide-react';

export const InAppNotificationBanner: React.FC = () => {
  const [notification, setNotification] = useState<InAppNotification | null>(() =>
    NotificationService.getActiveNotification()
  );
  const [queueLength, setQueueLength] = useState<number>(() =>
    NotificationService.getQueueLength()
  );
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(100);

  useEffect(() => {
    const unsubNotif = NotificationService.subscribe((item) => {
      setNotification(item);
      setQueueLength(NotificationService.getQueueLength());
      setProgressPercent(100);
      setIsPlayingAudio(
        Boolean(item?.audioUrl || item?.autoPlayAudio) &&
          AudioService.isTemporaryAudioCurrentlyActive()
      );
    });

    const unsubAudio = AudioService.subscribe((state) => {
      if (AudioService.isTemporaryAudioCurrentlyActive() && state?.isPlaying) {
        setIsPlayingAudio(true);
        NotificationService.onActiveAudioStarted();
      } else {
        setIsPlayingAudio(false);
      }
    });

    return () => {
      unsubNotif();
      unsubAudio();
    };
  }, []);

  // Visual countdown progress bar
  useEffect(() => {
    if (!notification) return;
    const durationMs = 9500;
    const intervalMs = 100;
    const step = (intervalMs / durationMs) * 100;

    const timer = setInterval(() => {
      if (!isPlayingAudio) {
        setProgressPercent((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return Math.max(0, prev - step);
        });
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [notification?.id, isPlayingAudio]);

  if (!notification) return null;

  const handleDismiss = () => {
    if (isPlayingAudio) {
      AudioService.stopTemporaryAndResume(true);
    }
    NotificationService.dismissInAppBanner(false);
  };

  const handleToggleSound = () => {
    if (isPlayingAudio) {
      AudioService.pause();
      setIsPlayingAudio(false);
    } else {
      if (notification.autoPlayAudio) {
        notification.autoPlayAudio().catch(() => {});
        setIsPlayingAudio(true);
      } else if (notification.audioUrl) {
        AudioService.playUrl(notification.audioUrl, 'reminder_verse', {
          title: notification.title,
          subtitle: notification.body,
        }).catch(() => {});
        setIsPlayingAudio(true);
      }
    }
  };

  const getCategoryMeta = (type: InAppNotification['type']) => {
    switch (type) {
      case 'prayer':
        return {
          label: 'أذان الصلاة',
          icon: Clock,
          badgeBg: 'bg-[#C8A24A]/25 border-[#E6C66E]/50 text-[#FFF2C2]',
          bannerGradient: 'from-[#1C160D]/98 via-[#130F08]/98 to-[#0B0905]/98',
          borderColor: 'border-[#E6C66E]/75',
          auraColor: 'bg-[#E6C66E]/15',
        };
      case 'quran':
        return {
          label: 'آيات القرآن الكريم',
          icon: BookOpen,
          badgeBg: 'bg-[#062417] border-[#10B981]/60 text-[#A7F3D0]',
          bannerGradient: 'from-[#042016]/98 via-[#0A2F22]/98 to-[#03150F]/98',
          borderColor: 'border-[#10B981]/70',
          auraColor: 'bg-[#10B981]/20',
        };
      case 'wird':
        return {
          label: 'الورد القرآني اليومي',
          icon: Clock,
          badgeBg: 'bg-[#281504] border-[#F59E0B]/60 text-[#FDE68A]',
          bannerGradient: 'from-[#241304]/98 via-[#351C07]/98 to-[#160B02]/98',
          borderColor: 'border-[#F59E0B]/70',
          auraColor: 'bg-[#F59E0B]/20',
        };
      case 'dhikr':
        return {
          label: 'ذكر الله والتسبيح',
          icon: Sparkles,
          badgeBg: 'bg-[#081B38] border-[#38BDF8]/60 text-[#BAE6FD]',
          bannerGradient: 'from-[#06152B]/98 via-[#0C2248]/98 to-[#040D1C]/98',
          borderColor: 'border-[#38BDF8]/70',
          auraColor: 'bg-[#38BDF8]/20',
        };
      case 'parents':
        return {
          label: 'بر الوالدين والإحسان',
          icon: Heart,
          badgeBg: 'bg-[#290812] border-[#F43F5E]/60 text-[#FECDD3]',
          bannerGradient: 'from-[#230811]/98 via-[#360D1A]/98 to-[#17050B]/98',
          borderColor: 'border-[#F43F5E]/70',
          auraColor: 'bg-[#F43F5E]/20',
        };
      case 'salawat':
        return {
          label: 'الصلاة على النبي ﷺ',
          icon: Sparkles,
          badgeBg: 'bg-[#2A1F0D]/90 border-[#E6C66E]/60 text-[#FFE082]',
          bannerGradient: 'from-[#1C160D]/98 via-[#130F08]/98 to-[#0B0905]/98',
          borderColor: 'border-[#E6C66E]/75',
          auraColor: 'bg-[#E6C66E]/15',
        };
      default:
        return {
          label: 'تنبيه أثر',
          icon: Sparkles,
          badgeBg: 'bg-[#1D1912]/90 border-[#C8A24A]/50 text-[#F3E5AB]',
          bannerGradient: 'from-[#1C160D]/98 via-[#130F08]/98 to-[#0B0905]/98',
          borderColor: 'border-[#E6C66E]/75',
          auraColor: 'bg-[#E6C66E]/15',
        };
    }
  };

  const catMeta = getCategoryMeta(notification.type);
  const CatIcon = catMeta.icon;

  return (
    <aside
      aria-label="إشعار التطبيق"
      className="fixed top-3 inset-x-2.5 sm:inset-x-auto sm:right-5 sm:max-w-md z-[99990] animate-slideDown select-none font-arabic"
    >
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${catMeta.bannerGradient} border ${catMeta.borderColor} shadow-[0_18px_45px_rgba(0,0,0,0.92),0_0_25px_rgba(230,198,110,0.25)] backdrop-blur-2xl transition-all`}>
        {/* Subtle Ambient Themed Aura */}
        <div className={`pointer-events-none absolute -top-10 -right-10 w-36 h-36 ${catMeta.auraColor} rounded-full blur-3xl`} />
        <div className="pointer-events-none absolute -bottom-10 -left-10 w-36 h-36 bg-[#B88A2D]/10 rounded-full blur-3xl" />

        <div className="relative p-3.5 sm:p-4">
          <div className="flex items-start gap-3">
            {/* 1. App Royal Logo with Glow */}
            <div className="relative shrink-0 mt-0.5">
              <div className="w-12 h-12 rounded-2xl p-1 bg-gradient-to-br from-[#2D2313] to-[#120F08] border border-[#E6C66E]/70 shadow-[0_0_16px_rgba(230,198,110,0.4)] flex items-center justify-center overflow-hidden">
                <img
                  src="/icon-logo.png"
                  alt="أثر"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(255,242,194,0.6)]"
                  onError={(e) => {
                    e.currentTarget.src = '/athar-royal-icon.png';
                  }}
                />
              </div>

              {/* Pulsating live sound rings when audio is active */}
              {isPlayingAudio && (
                <span className="absolute -inset-1 rounded-2xl border border-[#FFF2C2]/60 animate-ping opacity-60 pointer-events-none" />
              )}
            </div>

            {/* 2. Title, Badges, and Body Content */}
            <div className="flex-1 min-w-0 text-right">
              {/* Category Badge & Sound Indicator */}
              <div className="flex items-center justify-between gap-1.5 mb-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded-full border text-[9.5px] font-extrabold flex items-center gap-1 shadow-sm ${catMeta.badgeBg}`}
                  >
                    <CatIcon size={10} />
                    <span>{catMeta.label}</span>
                  </span>

                  {queueLength > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-[#1A160F] border border-[#C8A24A]/40 text-[#E6C66E] text-[9px] font-bold flex items-center gap-0.5">
                      <Layers size={9} />
                      <span>+{queueLength} في الانتظار</span>
                    </span>
                  )}
                </div>

                {/* Dismiss button */}
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="p-1 rounded-lg text-[#C4B998] hover:text-[#FFF2C2] hover:bg-[#2A2214]/60 transition-colors"
                  title="إغلاق التنبيه"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Title */}
              <h4 className="text-xs sm:text-sm font-extrabold text-[#FFF2C2] leading-snug drop-shadow-sm flex items-center gap-1.5">
                {notification.title}
                {isPlayingAudio && (
                  <span className="flex items-center gap-0.5 text-[#E6C66E]">
                    <span className="w-1 h-3 bg-[#E6C66E] rounded-full animate-bounce" />
                    <span className="w-1 h-4 bg-[#FFF2C2] rounded-full animate-bounce [animation-delay:0.15s]" />
                    <span className="w-1 h-2.5 bg-[#E6C66E] rounded-full animate-bounce [animation-delay:0.3s]" />
                  </span>
                )}
              </h4>

              {/* Body */}
              <p className="mt-1 text-[11px] sm:text-xs text-[#E8E0CE] leading-relaxed line-clamp-3">
                {notification.body}
              </p>

              {/* Interactive Actions Row */}
              <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                {/* Audio Play/Pause Button */}
                {(notification.audioUrl || notification.autoPlayAudio) && (
                  <button
                    type="button"
                    onClick={handleToggleSound}
                    className="px-2.5 py-1 rounded-xl bg-[#241C10] hover:bg-[#322716] border border-[#E6C66E]/60 text-[#FFF2C2] text-[11px] font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    {isPlayingAudio ? (
                      <>
                        <VolumeX size={12} className="text-[#E6C66E]" />
                        <span>إيقاف الصوت</span>
                      </>
                    ) : (
                      <>
                        <Volume2 size={12} className="text-[#E6C66E]" />
                        <span>تشغيل الصوت</span>
                      </>
                    )}
                  </button>
                )}

                {/* Custom Action Button */}
                {notification.onAction && notification.actionText && (
                  <button
                    type="button"
                    onClick={() => {
                      notification.onAction?.();
                      handleDismiss();
                    }}
                    className="px-3 py-1 rounded-xl bg-gradient-to-r from-[#E6C66E] to-[#B88A2D] text-[#070707] font-extrabold text-[11px] flex items-center gap-1 shadow-[0_2px_10px_rgba(230,198,110,0.35)] hover:brightness-110 active:scale-95 transition-all"
                  >
                    <span>{notification.actionText}</span>
                    <ChevronLeft size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Golden Countdown Bar */}
        <div className="w-full h-1 bg-[#1A140B] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] transition-all duration-100 ease-linear shadow-[0_0_8px_#E6C66E]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </aside>
  );
};
