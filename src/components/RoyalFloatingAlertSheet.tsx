import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, VolumeX, Play, Pause, RotateCcw, ExternalLink, 
  BookOpen, Sparkles, Heart, BellRing, Clock
} from 'lucide-react';
import { ReminderPlaybackMode } from '../types';
import { NativePermissionsBridge } from '../services/nativePermissionsBridge';

export interface FloatingAlertPayload {
  id?: string | number;
  type?: 'ayah_daily' | 'dhikr_salawat' | 'daily_wird' | 'parents_birr' | 'diagnostic_test' | string;
  category?: string;
  title: string;
  body: string;
  badge?: string;
  audioUrl?: string;
  surahNumber?: number;
  ayahNumber?: number;
  surahName?: string;
  verseText?: string;
  reciterName?: string;
  adhkarCategory?: string;
  playSound?: boolean;
  playbackMode?: ReminderPlaybackMode;
  actionText?: string;
  targetTab?: string;
  durationMs?: number;
  elapsedMs?: number;
  isMuted?: boolean;
}

interface RoyalFloatingAlertSheetProps {
  onNavigateTab?: (tab: string) => void;
  onOpenAyah?: (surah: number, ayah: number) => void;
  onOpenTasbih?: () => void;
  onOpenWird?: () => void;
  onOpenParents?: () => void;
  onOpenAdhkar?: (cat: string) => void;
}

export const RoyalFloatingAlertSheet: React.FC<RoyalFloatingAlertSheetProps> = ({
  onNavigateTab,
  onOpenAyah,
  onOpenTasbih,
  onOpenWird,
  onOpenParents,
  onOpenAdhkar,
}) => {
  const [activeAlert, setActiveAlert] = useState<FloatingAlertPayload | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackProgress, setPlaybackProgress] = useState<number>(0);
  const [currentTimeFormatted, setCurrentTimeFormatted] = useState<string>('00:00');
  const [totalTimeFormatted, setTotalTimeFormatted] = useState<string>('00:00');
  const [remainingDismissSeconds, setRemainingDismissSeconds] = useState<number | null>(null);
  const [showOverlayPrompt, setShowOverlayPrompt] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoDismissTimerRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);
  const queueProcessTimerRef = useRef<any>(null);

  // FIFO Alert Queue
  const alertQueueRef = useRef<FloatingAlertPayload[]>([]);
  const isDisplayingAlertRef = useRef<boolean>(false);

  const clearAllTimers = () => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (queueProcessTimerRef.current) {
      clearTimeout(queueProcessTimerRef.current);
      queueProcessTimerRef.current = null;
    }
  };

  const stopCurrentAudio = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = '';
      } catch {}
      audioRef.current = null;
    }
    setIsPlaying(false);
  };

  const dismissAlert = () => {
    clearAllTimers();
    stopCurrentAudio();
    setActiveAlert(null);
    setRemainingDismissSeconds(null);
    setPlaybackProgress(0);
    isDisplayingAlertRef.current = false;

    // Check if there are more queued alerts waiting
    if (alertQueueRef.current.length > 0) {
      // 1-second serene pause between alerts as requested by user
      queueProcessTimerRef.current = setTimeout(() => {
        processNextInQueue();
      }, 1000);
    }
  };

  const startTenSecondCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    const duration = 10;
    setRemainingDismissSeconds(duration);

    const startTime = Date.now();
    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const left = Math.max(0, duration - elapsed);
      setRemainingDismissSeconds(left);
      if (left <= 0) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        dismissAlert();
      }
    }, 250);
  };

  const setupAudioElement = (url: string) => {
    stopCurrentAudio();
    try {
      let cleanUrl = url;
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        if (!cleanUrl.startsWith('/')) cleanUrl = '/' + cleanUrl;
        if (cleanUrl.startsWith('/public/')) cleanUrl = cleanUrl.replace('/public/', '/');
      }

      const audio = new Audio(cleanUrl);
      audio.preload = 'auto';
      audioRef.current = audio;

      audio.addEventListener('loadedmetadata', () => {
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          const totalM = Math.floor(audio.duration / 60);
          const totalS = Math.floor(audio.duration % 60);
          setTotalTimeFormatted(`${totalM.toString().padStart(2, '0')}:${totalS.toString().padStart(2, '0')}`);
        }
      });

      audio.addEventListener('timeupdate', () => {
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          const progress = (audio.currentTime / audio.duration) * 100;
          setPlaybackProgress(progress);
          const curM = Math.floor(audio.currentTime / 60);
          const curS = Math.floor(audio.currentTime % 60);
          setCurrentTimeFormatted(`${curM.toString().padStart(2, '0')}:${curS.toString().padStart(2, '0')}`);
        }
      });

      // When recitation finishes, dismiss immediately
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setPlaybackProgress(100);
        dismissAlert();
      });

      audio.addEventListener('error', (e) => {
        console.warn('[RoyalFloatingAlert] Audio load error:', e);
        setIsPlaying(false);
        startTenSecondCountdown();
      });

      return audio;
    } catch (e) {
      console.warn('[RoyalFloatingAlert] audio setup error:', e);
      setIsPlaying(false);
      return null;
    }
  };

  const playAlertAudio = (url?: string) => {
    if (!url) return;
    clearAllTimers();
    setRemainingDismissSeconds(null);

    const audio = setupAudioElement(url);
    if (!audio) {
      startTenSecondCountdown();
      return;
    }

    audio.play().then(() => {
      setIsPlaying(true);
    }).catch((err) => {
      console.warn('[RoyalFloatingAlert] Autoplay blocked, starting 10s countdown:', err);
      setIsPlaying(false);
      startTenSecondCountdown();
    });
  };

  const handleTogglePlayPause = () => {
    if (!audioRef.current) {
      if (activeAlert?.audioUrl) {
        playAlertAudio(activeAlert.audioUrl);
      }
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      clearAllTimers();
      setRemainingDismissSeconds(null);
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {});
    }
  };

  const handleToggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    } else {
      setIsMuted(!isMuted);
    }
  };

  const handleReplay = () => {
    clearAllTimers();
    setRemainingDismissSeconds(null);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {});
    } else if (activeAlert?.audioUrl) {
      playAlertAudio(activeAlert.audioUrl);
    }
  };

  const handlePrimaryAction = () => {
    if (!activeAlert) return;
    const { type, category, surahNumber, ayahNumber, targetTab, adhkarCategory } = activeAlert;

    if (type === 'ayah_daily' || category === 'quran_ayah' || (surahNumber && surahNumber > 0)) {
      if (onOpenAyah && surahNumber) {
        onOpenAyah(surahNumber, ayahNumber || 1);
      } else if (onNavigateTab) {
        onNavigateTab('quran');
      }
    } else if (type === 'dhikr_salawat' || category === 'dhikr_tasbeeh' || category === 'salawat') {
      if (onOpenTasbih) {
        onOpenTasbih();
      } else if (onNavigateTab) {
        onNavigateTab('home');
      }
    } else if (type === 'daily_wird' || category === 'quran_wird') {
      if (onOpenWird) {
        onOpenWird();
      } else if (onNavigateTab) {
        onNavigateTab('quran');
      }
    } else if (type === 'parents_birr' || category === 'parents_duty') {
      if (onOpenParents) {
        onOpenParents();
      } else if (onNavigateTab) {
        onNavigateTab('companion');
      }
    } else if (category === 'morning_evening' || category === 'adhkar') {
      if (onOpenAdhkar) {
        onOpenAdhkar(adhkarCategory || 'morning');
      } else if (onNavigateTab) {
        onNavigateTab('adhkar');
      }
    } else if (targetTab && onNavigateTab) {
      onNavigateTab(targetTab);
    }

    dismissAlert();
  };

  // Process next alert in FIFO queue
  const processNextInQueue = () => {
    if (isDisplayingAlertRef.current) return;
    if (alertQueueRef.current.length === 0) return;

    const payload = alertQueueRef.current.shift();
    if (!payload || !payload.title) return;

    isDisplayingAlertRef.current = true;
    clearAllTimers();
    stopCurrentAudio();

    setPlaybackProgress(0);
    setCurrentTimeFormatted('00:00');
    setTotalTimeFormatted('00:00');
    setActiveAlert(payload);

    // Determine strict mode:
    // 1. If payload explicitly specifies playbackMode, use it.
    // 2. Otherwise if playSound is false, mode is 'notification_only'.
    // 3. Otherwise mode is 'notification_and_sound'.
    const resolvedMode: ReminderPlaybackMode = 
      payload.playbackMode || 
      (payload.playSound === false ? 'notification_only' : 'notification_and_sound');

    // STRICT AUDIO POLICY ENFORCEMENT:
    // Mode 1: إشعار فقط (صامت) -> NEVER play audio, start 10s countdown
    if (resolvedMode === 'notification_only' || !payload.audioUrl) {
      startTenSecondCountdown();
    }
    // Mode 2: إشعار + زر تشغيل يدوي -> DO NOT auto-play audio! Keep ready for manual click & start 10s timer
    else if (resolvedMode === 'notification_with_play_action') {
      setupAudioElement(payload.audioUrl);
      startTenSecondCountdown();
    }
    // Mode 3: إشعار + صوت تلقائي -> Play audio immediately, dismiss when done
    else if (resolvedMode === 'notification_and_sound') {
      playAlertAudio(payload.audioUrl);
    } else {
      startTenSecondCountdown();
    }
  };

  useEffect(() => {
    const handleTriggerAlert = (e: any) => {
      const payload: FloatingAlertPayload = e?.detail;
      if (!payload || !payload.title) return;

      // Trigger Native System-Level Floating Window on Android
      if (NativePermissionsBridge.isNative()) {
        const resolvedMode = payload.playbackMode || (payload.playSound === false ? 'notification_only' : 'notification_and_sound');
        const autoDismissSecs = resolvedMode === 'notification_only' ? 10 : 0;
        NativePermissionsBridge.showSystemOverlayNotification({
          title: payload.title,
          body: payload.body,
          badge: payload.badge,
          category: payload.category || payload.type,
          audioUrl: payload.audioUrl,
          playSound: resolvedMode === 'notification_and_sound',
          surahNumber: payload.surahNumber,
          ayahNumber: payload.ayahNumber,
          actionText: payload.actionText,
          autoDismissSeconds: autoDismissSecs,
          playbackMode: resolvedMode,
        }).then((res) => {
          if (res?.requiresPermission) {
            setShowOverlayPrompt(true);
          }
        }).catch(() => {});
      }

      // Push into FIFO queue
      alertQueueRef.current.push(payload);

      // If screen is currently idle, process immediately
      if (!isDisplayingAlertRef.current) {
        processNextInQueue();
      }
    };

    try {
      const pending = (window as any).__athar_pending_royal_alert;
      if (pending && pending.title) {
        delete (window as any).__athar_pending_royal_alert;
        handleTriggerAlert({ detail: pending });
      }
    } catch {}

    window.addEventListener('athar_trigger_royal_alert', handleTriggerAlert);
    window.addEventListener('athar_show_floating_alert', handleTriggerAlert);

    return () => {
      window.removeEventListener('athar_trigger_royal_alert', handleTriggerAlert);
      window.removeEventListener('athar_show_floating_alert', handleTriggerAlert);
      clearAllTimers();
      stopCurrentAudio();
    };
  }, []);

  if (!activeAlert) return null;

  const isAyahAlert = activeAlert.type === 'ayah_daily' || activeAlert.category === 'quran_ayah' || (Boolean(activeAlert.surahNumber) && activeAlert.surahNumber! > 0);
  const resolvedMode = activeAlert.playbackMode || (activeAlert.playSound === false ? 'notification_only' : 'notification_and_sound');
  const isSilentMode = resolvedMode === 'notification_only';
  const hasAudioSupport = !isSilentMode && Boolean(activeAlert.audioUrl);

  const getAlertIcon = () => {
    const t = activeAlert.type || activeAlert.category || '';
    if (t.includes('ayah') || t.includes('quran')) {
      return <BookOpen size={19} className="text-[#E6C66E]" />;
    }
    if (t.includes('dhikr') || t.includes('salawat') || t.includes('tasbeeh')) {
      return <Sparkles size={19} className="text-[#E6C66E]" />;
    }
    if (t.includes('parent') || t.includes('birr')) {
      return <Heart size={19} className="text-[#E6C66E]" />;
    }
    return <BellRing size={19} className="text-[#E6C66E]" />;
  };

  const getActionLabel = () => {
    if (activeAlert.actionText) return activeAlert.actionText;
    const t = activeAlert.type || activeAlert.category || '';
    if (t.includes('ayah')) return 'فتح الآية في المصحف 📖';
    if (t.includes('wird')) return 'فتح الورد القرآني 📜';
    if (t.includes('parent')) return 'دعاء وبر الوالدين 🤍';
    if (t.includes('dhikr') || t.includes('salawat')) return 'المسبحة والاستغفار 📿';
    if (t.includes('adhkar')) return 'أذكار اليوم ☀️';
    return 'فتح في التطبيق ←';
  };

  const displayAyahText = activeAlert.verseText || activeAlert.body.replace(/^«|»$/g, '').trim();

  return (
    <aside 
      aria-label="تنبيه ملكي عائم"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[99999] w-[calc(100%-20px)] max-w-md animate-slideDown pointer-events-auto"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#18140D] via-[#100D08] to-[#0A0805] border border-[#E6C66E]/55 shadow-[0_20px_50px_rgba(0,0,0,0.92)] backdrop-blur-xl p-4 sm:p-5">
        
        {/* Shimmer Ambient Glow Accent */}
        <div 
          className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-20 rounded-full blur-2xl pointer-events-none opacity-30"
          style={{ background: 'radial-gradient(circle, #E6C66E 0%, transparent 70%)' }}
        />

        {/* Top Bar: Icon, Category Badge & Queue indicator */}
        <div className="flex items-center justify-between gap-2.5 pb-2.5 border-b border-[#C8A24A]/20 relative z-10">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2D2311] to-[#120E06] border border-[#E6C66E]/50 flex items-center justify-center shrink-0 shadow-sm">
              {getAlertIcon()}
            </div>
            <span className="text-[11px] font-extrabold text-[#E6C66E] truncate">
              {activeAlert.badge || '✨ تنبيه أثر الملكي العائم'}
            </span>
            {alertQueueRef.current.length > 0 && (
              <span className="text-[9px] py-0.5 px-1.5 rounded-md bg-[#251D0F] border border-[#E6C66E]/40 text-[#E6C66E] font-mono">
                +{alertQueueRef.current.length} في الانتظار
              </span>
            )}
          </div>

          {/* Quiet Countdown Indicator if waiting for auto-dismiss */}
          {remainingDismissSeconds !== null && !isPlaying && (
            <div className="flex items-center gap-1 py-0.5 px-2 rounded-full bg-[#1F180D] border border-[#C8A24A]/30 text-[#E6C66E] text-[10px] font-bold">
              <Clock size={11} className="text-[#E6C66E] animate-pulse" />
              <span>إغلاق بعد {remainingDismissSeconds}ث</span>
            </div>
          )}
        </div>

        {/* Content Body */}
        {isAyahAlert ? (
          <div className="py-3 relative z-10 space-y-2.5">
            {/* Surah & Ayah Info */}
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 py-0.5 px-2.5 rounded-full bg-[#20180B] border border-[#C8A24A]/40 text-[#E6C66E] text-[11px] font-black font-arabic">
                <span>📖 سورة {activeAlert.surahName || 'القرآن'}</span>
                <span>•</span>
                <span>الآية {activeAlert.ayahNumber || '١'}</span>
              </span>

              {activeAlert.reciterName && !isSilentMode && (
                <span className="text-[10px] text-[#A89E88] font-bold">
                  تلاوة: {activeAlert.reciterName}
                </span>
              )}
            </div>

            {/* Sacred Verse Text */}
            <div className="p-4 rounded-xl bg-gradient-to-b from-[#141009] to-[#0D0A06] border border-[#E6C66E]/35 text-center shadow-inner">
              <p className="font-quran text-base sm:text-lg text-[#F5EFE0] leading-loose select-text drop-shadow">
                ﴿ {displayAyahText} ﴾
              </p>
            </div>
          </div>
        ) : (
          <div className="py-3 relative z-10 space-y-1.5">
            <h4 className="text-sm sm:text-base font-extrabold text-[#FFFDF8] font-arabic leading-snug drop-shadow-sm">
              {activeAlert.title}
            </h4>
            <p className="text-xs text-[#E1D7C3] font-arabic leading-relaxed whitespace-pre-line line-clamp-4">
              {activeAlert.body}
            </p>
          </div>
        )}

        {/* Audio Player Strip (Rendered ONLY if NOT silent and audioUrl is available) */}
        {hasAudioSupport && (
          <div className="mt-1 p-2.5 rounded-xl bg-[#0F0C08]/85 border border-[#C8A24A]/25 relative z-10 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTogglePlayPause}
                  className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-[#0A0805] flex items-center justify-center font-bold shadow-sm active:scale-95 transition-transform cursor-pointer"
                  title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل الصوت'}
                >
                  {isPlaying ? <Pause size={15} /> : <Play size={15} className="mr-[-2px]" />}
                </button>

                <button
                  onClick={handleReplay}
                  className="w-7 h-7 rounded-lg bg-[#17130C] border border-[#C8A24A]/30 text-[#E6C66E] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="إعادة الاستماع"
                >
                  <RotateCcw size={13} />
                </button>

                <button
                  onClick={handleToggleMute}
                  className="w-7 h-7 rounded-lg bg-[#17130C] border border-[#C8A24A]/30 text-[#A89E88] hover:text-[#E6C66E] flex items-center justify-center transition-colors cursor-pointer"
                  title={isMuted ? 'إلغاء الكتم' : 'كتم الصوت'}
                >
                  {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                </button>
              </div>

              {/* Status / Duration */}
              <div className="flex items-center gap-2 text-[10px] text-[#A89E88]">
                {isPlaying && (
                  <div className="flex items-end gap-0.5 h-3">
                    <span className="w-0.5 h-full bg-[#E6C66E] animate-pulse rounded-full" />
                    <span className="w-0.5 h-2/3 bg-[#E6C66E] animate-pulse delay-75 rounded-full" />
                    <span className="w-0.5 h-4/5 bg-[#E6C66E] animate-pulse delay-150 rounded-full" />
                  </div>
                )}
                <span>{currentTimeFormatted} / {totalTimeFormatted !== '00:00' ? totalTimeFormatted : 'تلاوة نديّة'}</span>
              </div>
            </div>

            {/* Playback Progress Bar */}
            <div className="w-full bg-[#1F190E] h-1 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#C8A24A] to-[#E6C66E] h-full transition-all duration-200"
                style={{ width: `${playbackProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Thin Golden Auto-Dismiss Progress Bar for 10s Window */}
        {remainingDismissSeconds !== null && !isPlaying && (
          <div className="mt-2 w-full bg-[#1F190E] h-0.5 rounded-full overflow-hidden relative z-10">
            <div 
              className="bg-gradient-to-r from-[#C8A24A] to-[#E6C66E] h-full transition-all duration-300"
              style={{ width: `${(remainingDismissSeconds / 10) * 100}%` }}
            />
          </div>
        )}

        {/* Action Controls: Primary Quick Navigation & Close ("إغلاق") */}
        <div className="mt-3 pt-2.5 border-t border-[#C8A24A]/20 relative z-10 flex items-center gap-2">
          <button
            onClick={handlePrimaryAction}
            className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-gradient-to-r from-[#E6C66E] via-[#D4AF37] to-[#A6802B] text-[#0A0805] text-xs font-black flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(200,162,74,0.3)] hover:brightness-105 active:scale-98 transition-all cursor-pointer"
          >
            <span>{getActionLabel()}</span>
            <ExternalLink size={13} />
          </button>

          <button
            onClick={dismissAlert}
            className="min-h-[44px] py-2 px-4 rounded-xl bg-[#14110A] border border-[#C8A24A]/30 text-[#A89E88] hover:text-[#FFFDF8] text-xs font-bold active:scale-98 transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>

        {/* Overlay Permission Activation Guidance Banner */}
        {showOverlayPrompt && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-gradient-to-r from-[#20190D] to-[#141008] border border-[#E6C66E]/40 flex items-center justify-between gap-2.5 text-right relative z-10 shadow-sm animate-fadeIn">
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-[#E6C66E] flex items-center gap-1">
                <Sparkles size={13} />
                الظهور فوق التطبيقات الأخرى:
              </span>
              <p className="text-[10px] text-[#C4B998] leading-tight mt-0.5">
                فعّل إذن الظهور لتشاهد التنبيهات فوق واتساب وفيسبوك أثناء تصفح الهاتف.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                NativePermissionsBridge.openOverlayPermissionSettings();
              }}
              className="shrink-0 min-h-[34px] py-1.5 px-3 rounded-lg bg-gradient-to-r from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] text-[#070605] text-[11px] font-extrabold active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              تفعيل الإذن
            </button>
          </div>
        )}

      </div>
    </aside>
  );
};
