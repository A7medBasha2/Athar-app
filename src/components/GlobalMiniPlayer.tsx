import React, { useState, useEffect, useRef } from 'react';
import { AudioService, ActiveAudioState } from '../services/audioService';
import {
  AyahPodcastService,
  ActivePodcastPlaybackState,
} from '../services/ayahPodcastService';
import { NotificationService } from '../services/notificationService';
import { ReminderEngine } from '../services/reminderService';
import { NavigationTab } from '../types';
import {
  Play,
  Pause,
  X,
  Volume2,
  Radio,
  BookOpen,
  Bell,
  Moon,
  Repeat,
  SkipForward,
  SkipBack,
  Headphones,
  Maximize2,
  RotateCcw,
  RotateCw,
} from 'lucide-react';

interface GlobalMiniPlayerProps {
  onOpenQuranReader?: (surahNumber: number, ayahNumber?: number) => void;
  onOpenSurahReader?: (surahNumber: number, ayahNumber?: number) => void;
  onOpenAdhkarSheet?: () => void;
  onNavigateToTab?: (tab: NavigationTab) => void;
}

const formatTime = (sec: number) => {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

interface ScrubberBarProps {
  currentSeconds: number;
  totalSeconds: number;
  isPlaying?: boolean;
  onSeek: (seconds: number) => void;
  accentGradient?: string;
  onLiveTimeChange?: (liveSec: number, liveDur: number) => void;
}

const ScrubberBar: React.FC<ScrubberBarProps> = ({
  currentSeconds,
  totalSeconds,
  isPlaying = false,
  onSeek,
  accentGradient,
  onLiveTimeChange,
}) => {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPercent, setScrubPercent] = useState<number | null>(null);
  const [liveSeconds, setLiveSeconds] = useState<number>(currentSeconds);
  const [liveTotalSeconds, setLiveTotalSeconds] = useState<number>(() => {
    const d = AudioService.getLiveDuration();
    return d > 0 && isFinite(d) ? d : totalSeconds > 0 ? totalSeconds : 0;
  });
  const barRef = useRef<HTMLDivElement>(null);
  const lastSeekThrottleRef = useRef<number>(0);

  // Keep liveSeconds aligned when external currentSeconds jumps (e.g., track change or seeking)
  useEffect(() => {
    setLiveSeconds(currentSeconds);
  }, [currentSeconds]);

  useEffect(() => {
    if (totalSeconds > 0 && isFinite(totalSeconds)) {
      setLiveTotalSeconds(totalSeconds);
    }
  }, [totalSeconds]);

  // Butter-smooth 60fps progress update loop via requestAnimationFrame when audio is actively playing
  useEffect(() => {
    if (!isPlaying || isScrubbing) return;
    let animId: number;

    const tick = () => {
      const actualTime = AudioService.getLiveCurrentTime();
      if (actualTime >= 0 && isFinite(actualTime)) {
        setLiveSeconds(actualTime);
      }
      const actualDur = AudioService.getLiveDuration();
      if (actualDur > 0 && isFinite(actualDur)) {
        setLiveTotalSeconds((prev) => (prev <= 0 || Math.abs(prev - actualDur) > 0.5 ? actualDur : prev));
      }
      if (onLiveTimeChange && actualTime >= 0) {
        onLiveTimeChange(actualTime, actualDur > 0 ? actualDur : totalSeconds);
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isScrubbing, onLiveTimeChange, totalSeconds]);

  const effectiveTotal = Math.max(
    totalSeconds > 0 && isFinite(totalSeconds) ? totalSeconds : 0,
    liveTotalSeconds > 0 && isFinite(liveTotalSeconds) ? liveTotalSeconds : 0,
    AudioService.getLiveDuration() || 0
  );

  const activePercent =
    isScrubbing && scrubPercent !== null
      ? scrubPercent
      : effectiveTotal > 0
      ? Math.min(100, Math.max(0, (liveSeconds / effectiveTotal) * 100))
      : 0;

  const scrubTime =
    isScrubbing && scrubPercent !== null
      ? (scrubPercent / 100) * (effectiveTotal || 1)
      : liveSeconds;

  const updateFromPointer = (clientX: number): number => {
    const dur = effectiveTotal > 0 ? effectiveTotal : totalSeconds;
    if (!barRef.current || dur <= 0) return 0;
    const rect = barRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (relativeX / rect.width) * 100));
    setScrubPercent(pct);
    return pct;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsScrubbing(true);
    const pct = updateFromPointer(e.clientX);
    const dur = effectiveTotal > 0 ? effectiveTotal : totalSeconds;
    const targetSec = (pct / 100) * dur;
    onSeek(targetSec);
    lastSeekThrottleRef.current = Date.now();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    const pct = updateFromPointer(e.clientX);
    const now = Date.now();
    // Throttle live seeking to 120ms for instant responsive scrubbing
    if (now - lastSeekThrottleRef.current > 120) {
      lastSeekThrottleRef.current = now;
      const dur = effectiveTotal > 0 ? effectiveTotal : totalSeconds;
      onSeek((pct / 100) * dur);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    const finalPct = updateFromPointer(e.clientX);
    setIsScrubbing(false);
    setScrubPercent(null);
    const dur = effectiveTotal > 0 ? effectiveTotal : totalSeconds;
    onSeek((finalPct / 100) * dur);
  };

  return (
    <div
      ref={barRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        setIsScrubbing(false);
        setScrubPercent(null);
      }}
      className="group relative w-full py-2.5 cursor-pointer touch-none select-none"
      dir="ltr"
      title="اسحب أو اضغط للتقديم والتأخير"
    >
      {/* Background Track with Glow on Hover/Touch */}
      <div className="w-full h-2.5 group-hover:h-3 bg-[#1C170F] rounded-full overflow-hidden border border-[#C8A24A]/40 group-hover:border-[#E6C66E]/70 shadow-inner relative">
        {/* Buffering gold shimmer when active but duration is still calibrating */}
        {isPlaying && effectiveTotal <= 0 && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#E6C66E]/30 to-transparent animate-pulse" />
        )}
        <div
          className={`h-full ${
            accentGradient || 'bg-gradient-to-r from-[#A67C1E] via-[#C8A24A] to-[#E6C66E]'
          } rounded-full shadow-[0_0_10px_rgba(230,198,110,0.6)] transition-[width] duration-75 ease-linear`}
          style={{ width: `${activePercent}%` }}
        />
      </div>

      {/* Draggable Glowing Gold Thumb Handle (Hardware-accelerated 60fps tracking) */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-gradient-to-br from-[#FFF9E2] via-[#E6C66E] to-[#B88A2D] border-2 border-[#0A0907] shadow-[0_0_16px_rgba(230,198,110,1)] transition-transform group-hover:scale-125 flex items-center justify-center pointer-events-none active:scale-130 will-change-transform"
        style={{ left: `${activePercent}%` }}
      >
        <div className="w-2 h-2 rounded-full bg-[#0A0907]" />
      </div>

      {/* Floating Scrub Time Tooltip while dragging */}
      {isScrubbing && (
        <div
          className="absolute -top-8 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[#0A0907] border border-[#E6C66E] text-[11px] font-mono font-black text-[#E6C66E] shadow-2xl pointer-events-none tabular-nums animate-fadeIn z-30"
          style={{ left: `${activePercent}%` }}
        >
          {formatTime(scrubTime)}
        </div>
      )}
    </div>
  );
};

export const GlobalMiniPlayer: React.FC<GlobalMiniPlayerProps> = ({
  onOpenQuranReader,
  onOpenSurahReader,
  onOpenAdhkarSheet,
  onNavigateToTab,
}) => {
  const [audioState, setAudioState] = useState<ActiveAudioState | null>(null);
  const [podcastState, setPodcastState] = useState<ActivePodcastPlaybackState | null>(() =>
    AyahPodcastService.getPlaybackState()
  );
  const [sleepTimerState, setSleepTimerState] = useState(AudioService.getSleepTimerState());
  const [repeatState, setRepeatState] = useState(AudioService.getAyahRepeatState());
  const [optimisticIsPlaying, setOptimisticIsPlaying] = useState<boolean | null>(null);
  const [hasActiveNotification, setHasActiveNotification] = useState<boolean>(() =>
    Boolean(NotificationService.getActiveNotification())
  );
  const [hasActiveAdhan, setHasActiveAdhan] = useState<boolean>(() =>
    ReminderEngine.hasActiveAdhanScreen()
  );
  const [liveTime, setLiveTime] = useState<{ sec: number; dur: number }>({ sec: 0, dur: 0 });

  const effectiveIsPlaying =
    optimisticIsPlaying !== null ? optimisticIsPlaying : (audioState?.isPlaying ?? false);

  useEffect(() => {
    setOptimisticIsPlaying(null);
  }, [audioState?.isPlaying]);

  useEffect(() => {
    setLiveTime({ sec: 0, dur: 0 });
  }, [audioState?.title, audioState?.surahNumber, audioState?.ayahNumber]);

  useEffect(() => {
    const unsubscribeAudio = AudioService.subscribe((state) => {
      setAudioState(state);
      setSleepTimerState(AudioService.getSleepTimerState());
      setRepeatState(AudioService.getAyahRepeatState());
    });
    const unsubscribePodcast = AyahPodcastService.subscribe((state) => {
      setPodcastState(state);
    });
    const unsubscribeNotification = NotificationService.subscribe((item) => {
      setHasActiveNotification(Boolean(item));
    });
    const unsubscribeAdhan = ReminderEngine.subscribeAdhanScreen((state) => {
      setHasActiveAdhan(Boolean(state));
    });
    const timer = setInterval(() => {
      setSleepTimerState(AudioService.getSleepTimerState());
      setRepeatState(AudioService.getAyahRepeatState());
    }, 1000);
    return () => {
      unsubscribeAudio();
      unsubscribePodcast();
      unsubscribeNotification();
      unsubscribeAdhan();
      clearInterval(timer);
    };
  }, []);

  // 1. Yield and hide when an in-app notification banner or full-screen adhan is active so controls never conflict
  if (hasActiveNotification || hasActiveAdhan || AudioService.isTemporaryAudioCurrentlyActive()) return null;

  const isMinimizedPodcastActive = Boolean(
    podcastState?.isActive && !podcastState?.isSheetOpen
  );

  // 2. GlobalMiniPlayer only shows for persistent background tracks (Quran recitation or Adhkar loop),
  // or Ayah Podcast. It must NOT show for temporary notification sounds (which have their own banner)
  if (audioState && audioState.category !== 'quran' && audioState.category !== 'adhkar') {
    if (!isMinimizedPodcastActive) return null;
  }

  if (!audioState && !isMinimizedPodcastActive) return null;

  // If Ayah Podcast is active and minimized, render it in the Global Mini Player
  if (isMinimizedPodcastActive && podcastState) {
    const sceneLabel =
      podcastState.activeSceneIndex === 0
        ? 'المشهد ١: قصة الآية والبيان'
        : podcastState.activeSceneIndex === 1
        ? 'المشهد ٢: هدي النبي ﷺ والصحابة'
        : 'المشهد ٣: التدبر ورسالتها لقلبك';

    return (
      <div className="shrink-0 z-40 w-full px-3 pt-1.5 pb-2 bg-[#070707]/95 backdrop-blur-xl select-none">
        <div className="w-full bg-gradient-to-b from-[#1F1910] via-[#13100A] to-[#0B0A07] border border-[#E6C66E]/65 rounded-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.85),0_0_20px_rgba(200,162,74,0.18)] overflow-hidden">
          {/* Row 1: Podcast Info & Actions */}
          <div className="px-3.5 pt-3 pb-2 flex items-center justify-between gap-2.5">
            <div
              onClick={() => AyahPodcastService.expandSheet()}
              className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
              title="اضغط لتكبير مشغل بودكاست الآية"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#2B2313] to-[#141009] border border-[#E6C66E]/60 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(200,162,74,0.28)] group-hover:border-[#FFF2C2] transition-colors">
                <Headphones size={18} className="text-[#E6C66E]" />
              </div>
              <div className="min-w-0 flex-1 text-right">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 text-[9px] font-extrabold bg-[#C8A24A]/25 text-[#E6C66E] border border-[#E6C66E]/45 rounded-full shrink-0">
                    بودكاست الآية
                  </span>
                  <h4 className="text-xs sm:text-sm font-extrabold text-[#F3E5AB] truncate group-hover:text-white transition-colors">
                    {podcastState.episode?.episodeTitle ||
                      `سورة ${podcastState.surahName} · الآية ${podcastState.ayahNumber}`}
                  </h4>
                </div>
                <p className="text-[11px] text-[#C4B998] truncate mt-0.5 font-medium">
                  سورة {podcastState.surahName} ({podcastState.ayahNumber}) • {sceneLabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  AyahPodcastService.expandSheet();
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1D1810] text-[#E6C66E] hover:text-white hover:bg-[#2A2316] border border-[#E6C66E]/45 flex items-center justify-center active:scale-95 transition-all"
                title="تكبير نافذة البودكاست"
                aria-label="تكبير نافذة البودكاست"
              >
                <Maximize2 size={13} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  AyahPodcastService.playPreviousAyahEpisode();
                }}
                disabled={podcastState.ayahNumber <= 1}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#171510] text-[#E6C66E] hover:text-white hover:bg-[#242016] border border-[#C8A24A]/40 flex items-center justify-center active:scale-95 transition-all disabled:opacity-30"
                title="قصة الآية السابقة"
                aria-label="قصة الآية السابقة"
              >
                <SkipForward size={14} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  AyahPodcastService.togglePlayPause();
                }}
                className="w-10 h-10 rounded-full bg-gradient-to-b from-[#E6C66E] via-[#C8A24A] to-[#A67C1E] text-[#070707] flex items-center justify-center hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_14px_rgba(200,162,74,0.4)] border border-[#F3E5AB]/60"
                title={podcastState.isPlaying ? 'إيقاف مؤقت' : 'استئناف السرد'}
                aria-label={podcastState.isPlaying ? 'إيقاف مؤقت' : 'استئناف السرد'}
              >
                {podcastState.isPlaying ? (
                  <Pause size={17} fill="currentColor" />
                ) : (
                  <Play size={17} fill="currentColor" className="mr-0.5" />
                )}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  AyahPodcastService.playNextAyahEpisode();
                }}
                disabled={podcastState.ayahNumber >= podcastState.totalAyahsInSurah}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#171510] text-[#E6C66E] hover:text-white hover:bg-[#242016] border border-[#C8A24A]/40 flex items-center justify-center active:scale-95 transition-all disabled:opacity-30"
                title="قصة الآية التالية"
                aria-label="قصة الآية التالية"
              >
                <SkipBack size={14} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  AyahPodcastService.stopPlayback();
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#171510] text-[#C4B998] hover:text-white hover:bg-[#242016] border border-[#C8A24A]/30 flex items-center justify-center active:scale-95 transition-all"
                title="إغلاق وإيقاف البودكاست"
                aria-label="إغلاق وإيقاف البودكاست"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Row 2: Interactive Scrubber + Seek Controls + Timestamps */}
          <div className="px-3.5 pb-2.5 pt-1 space-y-2 border-t border-[#C8A24A]/15 bg-[#0C0B08]/60">
            <ScrubberBar
              currentSeconds={podcastState.elapsedSeconds}
              totalSeconds={podcastState.totalDurationSeconds}
              isPlaying={podcastState.isPlaying}
              onSeek={(targetSec) => AyahPodcastService.seekToSeconds(targetSec)}
            />

            <div className="flex items-center justify-between gap-2 text-[10px]">
              <div className="flex items-center gap-1.5 font-mono text-[#C4B998] tabular-nums">
                <span className="text-[#E6C66E] font-bold">
                  {formatTime(podcastState.elapsedSeconds)}
                </span>
                <span>/</span>
                <span>{formatTime(podcastState.totalDurationSeconds)}</span>

                {/* Quick Skip Buttons */}
                <div className="flex items-center gap-1 mr-2" dir="ltr">
                  <button
                    onClick={() =>
                      AyahPodcastService.seekToSeconds(
                        Math.max(0, podcastState.elapsedSeconds - 10)
                      )
                    }
                    className="p-1 rounded bg-[#17140E] hover:bg-[#241E14] text-[#E6C66E] border border-[#C8A24A]/30 flex items-center gap-0.5 active:scale-95 transition-all"
                    title="تأخير ١٠ ثوانٍ"
                  >
                    <RotateCcw size={10} />
                    <span className="text-[9px]">10s-</span>
                  </button>
                  <button
                    onClick={() =>
                      AyahPodcastService.seekToSeconds(
                        Math.min(
                          podcastState.totalDurationSeconds,
                          podcastState.elapsedSeconds + 10
                        )
                      )
                    }
                    className="p-1 rounded bg-[#17140E] hover:bg-[#241E14] text-[#E6C66E] border border-[#C8A24A]/30 flex items-center gap-0.5 active:scale-95 transition-all"
                    title="تقديم ١٠ ثوانٍ"
                  >
                    <span className="text-[9px]">+10s</span>
                    <RotateCw size={10} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    AyahPodcastService.setContinuousDriveMode(
                      !podcastState.isContinuousDriveMode
                    )
                  }
                  className={`px-2.5 py-1 rounded-lg font-bold border flex items-center gap-1.5 transition-all active:scale-95 ${
                    podcastState.isContinuousDriveMode
                      ? 'bg-[#C8A24A]/25 text-[#E6C66E] border-[#E6C66E]/60'
                      : 'bg-[#15130E] text-[#C4B998] border-[#C8A24A]/25 hover:text-white'
                  }`}
                >
                  <Repeat size={11} />
                  <span>وضع القيادة والمشي</span>
                </button>

                <button
                  onClick={() => AyahPodcastService.expandSheet()}
                  className="px-2.5 py-1 rounded-lg font-bold bg-[#1C170E] text-[#E6C66E] border border-[#C8A24A]/40 hover:border-[#E6C66E] flex items-center gap-1 transition-all active:scale-95"
                >
                  <Maximize2 size={10} />
                  <span>فتح التدبر</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!audioState) return null;

  const getIcon = () => {
    if (audioState.category === 'adhan')
      return <Bell size={18} className="text-[#E6C66E] animate-bounce" />;
    if (audioState.category === 'quran')
      return <BookOpen size={18} className="text-[#E6C66E]" />;
    if (audioState.category === 'adhkar')
      return <Radio size={18} className="text-[#E6C66E]" />;
    return <Volume2 size={18} className="text-[#E6C66E]" />;
  };

  const handleBannerClick = () => {
    const openReader = onOpenSurahReader || onOpenQuranReader;
    if (audioState.category === 'quran' && audioState.surahNumber && openReader) {
      openReader(audioState.surahNumber, audioState.ayahNumber);
    } else if (audioState.category === 'adhkar') {
      if (onOpenAdhkarSheet) {
        onOpenAdhkarSheet();
      } else if (onNavigateToTab) {
        onNavigateToTab('adhkar');
      }
    }
  };

  const canNavigateTracks =
    audioState.category === 'quran' ||
    audioState.category === 'adhkar' ||
    AudioService.hasNavigationControls();

  const prevLabel = audioState.category === 'adhkar' ? 'الذكر السابق' : 'الآية السابقة';
  const nextLabel = audioState.category === 'adhkar' ? 'الذكر التالي' : 'الآية التالية';

  return (
    <div className="shrink-0 z-40 w-full px-3 pt-1.5 pb-2 bg-[#070707]/95 backdrop-blur-xl select-none">
      <div className="w-full bg-gradient-to-b from-[#1A1710] via-[#110F0B] to-[#0B0A07] border border-[#C8A24A]/55 rounded-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.85)] overflow-hidden">
        {/* Row 1: Track Info & Actions */}
        <div className="px-3.5 pt-3 pb-2 flex items-center justify-between gap-2.5">
          <div
            onClick={handleBannerClick}
            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#262013] to-[#13100A] border border-[#C8A24A]/50 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(200,162,74,0.22)] group-hover:border-[#E6C66E] transition-colors">
              {getIcon()}
            </div>
            <div className="min-w-0 flex-1 text-right">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs sm:text-sm font-extrabold text-[#F3E5AB] truncate group-hover:text-white transition-colors">
                  {audioState.title}
                </h4>
                {audioState.category === 'adhkar' &&
                  audioState.targetRepetition &&
                  audioState.targetRepetition > 1 && (
                    <span className="px-2 py-0.5 text-[10px] font-extrabold bg-[#C8A24A]/20 text-[#E6C66E] border border-[#C8A24A]/45 rounded-full shrink-0 tabular-nums">
                      تكرار {audioState.currentRepetition}/{audioState.targetRepetition}
                    </span>
                  )}
              </div>
              <p className="text-[11px] text-[#C4B998] truncate mt-0.5 font-medium">
                {audioState.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {canNavigateTracks && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  AudioService.playPreviousTrack();
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#171510] text-[#E6C66E] hover:text-white hover:bg-[#242016] border border-[#C8A24A]/40 flex items-center justify-center active:scale-95 transition-all"
                title={prevLabel}
                aria-label={prevLabel}
              >
                <SkipForward size={14} />
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                setOptimisticIsPlaying(!effectiveIsPlaying);
                AudioService.togglePlayPause();
              }}
              className="w-10 h-10 rounded-full bg-gradient-to-b from-[#E6C66E] via-[#C8A24A] to-[#A67C1E] text-[#070707] flex items-center justify-center hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_14px_rgba(200,162,74,0.4)] border border-[#F3E5AB]/60"
              title={effectiveIsPlaying ? 'إيقاف مؤقت' : 'استئناف التشغيل'}
              aria-label={effectiveIsPlaying ? 'إيقاف مؤقت' : 'استئناف التشغيل'}
            >
              {effectiveIsPlaying ? (
                <Pause size={17} fill="currentColor" />
              ) : (
                <Play size={17} fill="currentColor" className="mr-0.5" />
              )}
            </button>

            {canNavigateTracks && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  AudioService.playNextTrack();
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#171510] text-[#E6C66E] hover:text-white hover:bg-[#242016] border border-[#C8A24A]/40 flex items-center justify-center active:scale-95 transition-all"
                title={nextLabel}
                aria-label={nextLabel}
              >
                <SkipBack size={14} />
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                AudioService.stop();
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#171510] text-[#C4B998] hover:text-white hover:bg-[#242016] border border-[#C8A24A]/30 flex items-center justify-center active:scale-95 transition-all"
              title="إغلاق وإيقاف الصوت"
              aria-label="إغلاق وإيقاف الصوت"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Row 2: Interactive Scrubber + Quick Skips + Controls */}
        <div className="px-3.5 pb-2.5 pt-1 space-y-2 border-t border-[#C8A24A]/15 bg-[#0C0B08]/60">
          <ScrubberBar
            currentSeconds={audioState.currentTime}
            totalSeconds={audioState.duration}
            isPlaying={effectiveIsPlaying}
            onSeek={(targetSec) => AudioService.seekTo(targetSec)}
            onLiveTimeChange={(liveSec, liveDur) => {
              setLiveTime({ sec: liveSec, dur: liveDur });
            }}
          />

          <div className="flex items-center justify-between gap-2 text-[10px]">
            <div className="flex items-center gap-1.5 font-mono text-[#C4B998] tabular-nums">
              <span className="text-[#E6C66E] font-bold">
                {formatTime(liveTime.sec > 0 ? liveTime.sec : audioState.currentTime)}
              </span>
              <span>/</span>
              <span>
                {audioState.duration > 0
                  ? formatTime(audioState.duration)
                  : liveTime.dur > 0
                  ? formatTime(liveTime.dur)
                  : AudioService.getLiveDuration() > 0
                  ? formatTime(AudioService.getLiveDuration())
                  : '--:--'}
              </span>

              {/* Quick Jump Buttons: +/- 10s */}
              {audioState.duration > 0 && (
                <div className="flex items-center gap-1 mr-2" dir="ltr">
                  <button
                    onClick={() => AudioService.skipBackward(10)}
                    className="p-1 rounded bg-[#17140E] hover:bg-[#241E14] text-[#E6C66E] border border-[#C8A24A]/30 flex items-center gap-0.5 active:scale-95 transition-all"
                    title="تأخير ١٠ ثوانٍ"
                  >
                    <RotateCcw size={10} />
                    <span className="text-[9px]">10s-</span>
                  </button>
                  <button
                    onClick={() => AudioService.skipForward(10)}
                    className="p-1 rounded bg-[#17140E] hover:bg-[#241E14] text-[#E6C66E] border border-[#C8A24A]/30 flex items-center gap-0.5 active:scale-95 transition-all"
                    title="تقديم ١٠ ثوانٍ"
                  >
                    <span className="text-[9px]">+10s</span>
                    <RotateCw size={10} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Sleep Timer Pill */}
              <button
                onClick={() => {
                  const cur = sleepTimerState.remainingSeconds;
                  const isEnd = sleepTimerState.stopAtEndOfSurah;
                  if (!cur && !isEnd) AudioService.setSleepTimer(15);
                  else if (cur && cur <= 15 * 60) AudioService.setSleepTimer(30);
                  else if (cur && cur <= 30 * 60) AudioService.setSleepTimer(60);
                  else if (cur) AudioService.setSleepTimer(-1);
                  else AudioService.setSleepTimer(null);
                }}
                className={`px-2.5 py-1 rounded-lg font-bold border flex items-center gap-1.5 transition-all active:scale-95 ${
                  sleepTimerState.remainingSeconds || sleepTimerState.stopAtEndOfSurah
                    ? 'bg-[#C8A24A]/25 text-[#E6C66E] border-[#E6C66E]/60'
                    : 'bg-[#15130E] text-[#C4B998] border-[#C8A24A]/25 hover:text-white'
                }`}
                title="مؤقت النوم الذكي"
              >
                <Moon size={11} />
                <span>
                  {sleepTimerState.stopAtEndOfSurah
                    ? 'مؤقت: نهاية السورة'
                    : sleepTimerState.remainingSeconds
                    ? `مؤقت: ${Math.ceil((sleepTimerState.remainingSeconds || 0) / 60)}د`
                    : 'مؤقت النوم'}
                </span>
              </button>

              {/* Repeat Pill (when Quran is active) */}
              {audioState.category === 'quran' && (
                <button
                  onClick={() => AudioService.cycleAyahRepeatTarget()}
                  className={`px-2.5 py-1 rounded-lg font-bold border flex items-center gap-1.5 transition-all active:scale-95 ${
                    repeatState.target !== 1
                      ? 'bg-[#C8A24A]/25 text-[#E6C66E] border-[#E6C66E]/60'
                      : 'bg-[#15130E] text-[#C4B998] border-[#C8A24A]/25 hover:text-white'
                  }`}
                  title="تكرار الآية للحفظ"
                >
                  <Repeat size={11} />
                  <span className="tabular-nums">
                    تكرار: {repeatState.target === 0 ? '∞' : `${repeatState.target}×`}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
