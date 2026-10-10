import React, { useState, useEffect } from 'react';
import { AudioService, ActiveAudioState } from '../services/audioService';
import { NavigationTab } from '../types';
import { Play, Pause, X, Volume2, Radio, BookOpen, Bell, Moon, Repeat } from 'lucide-react';

interface GlobalMiniPlayerProps {
  onOpenQuranReader?: (surahNumber: number, ayahNumber?: number) => void;
  onOpenSurahReader?: (surahNumber: number, ayahNumber?: number) => void;
  onOpenAdhkarSheet?: () => void;
  onNavigateToTab?: (tab: NavigationTab) => void;
}

export const GlobalMiniPlayer: React.FC<GlobalMiniPlayerProps> = ({
  onOpenQuranReader,
  onOpenSurahReader,
  onOpenAdhkarSheet,
  onNavigateToTab
}) => {
  const [audioState, setAudioState] = useState<ActiveAudioState | null>(null);
  const [sleepTimerState, setSleepTimerState] = useState(AudioService.getSleepTimerState());
  const [repeatState, setRepeatState] = useState(AudioService.getAyahRepeatState());

  useEffect(() => {
    const unsubscribe = AudioService.subscribe((state) => {
      setAudioState(state);
      setSleepTimerState(AudioService.getSleepTimerState());
      setRepeatState(AudioService.getAyahRepeatState());
    });
    const timer = setInterval(() => {
      setSleepTimerState(AudioService.getSleepTimerState());
      setRepeatState(AudioService.getAyahRepeatState());
    }, 1000);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  if (!audioState) return null;

  const progressPercentage = audioState.duration > 0
    ? Math.min(100, (audioState.currentTime / audioState.duration) * 100)
    : 0;

  const formatTime = (sec: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const getIcon = () => {
    if (audioState.category === 'adhan') return <Bell size={16} className="text-[#E6C66E] animate-bounce" />;
    if (audioState.category === 'quran') return <BookOpen size={16} className="text-[#E6C66E]" />;
    if (audioState.category === 'adhkar') return <Radio size={16} className="text-[#E6C66E]" />;
    return <Volume2 size={16} className="text-[#E6C66E]" />;
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

  return (
    <div className="fixed bottom-[64px] left-0 right-0 z-30 px-3 pointer-events-none select-none">
      <div className="max-w-lg mx-auto bg-gradient-to-r from-[#17140D]/95 via-[#0E0D0A]/98 to-[#17140D]/95 backdrop-blur-xl border border-[#C8A24A]/50 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.85)] overflow-hidden pointer-events-auto transition-all">
        {/* Progress bar at top */}
        <div className="w-full h-1 bg-[#1D1912]">
          <div
            className="h-full bg-gradient-to-r from-[#C8A24A] via-[#E6C66E] to-[#A67C1E] transition-all duration-200"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div className="p-2.5 flex items-center justify-between gap-3">
          {/* Left: Info */}
          <div
            onClick={handleBannerClick}
            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-[#1A160E] border border-[#C8A24A]/45 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(200,162,74,0.2)]">
              {getIcon()}
            </div>
            <div className="min-w-0 flex-1 text-right">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-extrabold text-[#F3E5AB] truncate">
                  {audioState.title}
                </h4>
                {audioState.category === 'adhkar' && audioState.targetRepetition && audioState.targetRepetition > 1 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#C8A24A]/20 text-[#E6C66E] border border-[#C8A24A]/40 rounded-md shrink-0 tabular-nums">
                    تكرار {audioState.currentRepetition}/{audioState.targetRepetition}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#C4B998] truncate mt-0.5">
                <span className="truncate">{audioState.subtitle}</span>
                {audioState.duration > 0 && (
                  <span className="text-[#8E8268] font-mono shrink-0">
                    ({formatTime(audioState.currentTime)} / {formatTime(audioState.duration)})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick Sleep Timer Indicator / Cycle */}
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
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 transition-all ${
                sleepTimerState.remainingSeconds || sleepTimerState.stopAtEndOfSurah
                  ? 'bg-[#C8A24A]/25 text-[#E6C66E] border-[#C8A24A]/60'
                  : 'bg-[#171510] text-[#C4B998] border-[#C8A24A]/25 hover:text-white'
              }`}
              title="مؤقت النوم الذكي (15د / 30د / 60د / نهاية السورة)"
            >
              <Moon size={11} />
              {(sleepTimerState.remainingSeconds || sleepTimerState.stopAtEndOfSurah) && (
                <span className="tabular-nums">
                  {sleepTimerState.stopAtEndOfSurah
                    ? 'السورة'
                    : `${Math.ceil((sleepTimerState.remainingSeconds || 0) / 60)}د`}
                </span>
              )}
            </button>

            {/* Quick Ayah Repeat Cycle (when Quran is active) */}
            {audioState.category === 'quran' && (
              <button
                onClick={() => AudioService.cycleAyahRepeatTarget()}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-0.5 transition-all ${
                  repeatState.target !== 1
                    ? 'bg-[#C8A24A]/25 text-[#E6C66E] border-[#C8A24A]/60'
                    : 'bg-[#171510] text-[#C4B998] border-[#C8A24A]/25 hover:text-white'
                }`}
                title="تكرار الآية للحفظ (1× / 3× / 5× / 10× / ∞)"
              >
                <Repeat size={11} />
                <span className="tabular-nums">
                  {repeatState.target === 0 ? '∞' : `${repeatState.target}×`}
                </span>
              </button>
            )}

            <button
              onClick={() => AudioService.togglePlayPause()}
              className="w-8 h-8 rounded-full bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] flex items-center justify-center hover:brightness-110 active:scale-95 transition-all shadow-[0_0_12px_rgba(200,162,74,0.4)]"
              title={audioState.isPlaying ? 'إيقاف مؤقت' : 'استئناف التشغيل'}
              aria-label={audioState.isPlaying ? 'إيقاف مؤقت' : 'استئناف التشغيل'}
            >
              {audioState.isPlaying ? (
                <Pause size={14} fill="currentColor" />
              ) : (
                <Play size={14} fill="currentColor" className="mr-0.5" />
              )}
            </button>

            <button
              onClick={() => AudioService.stop()}
              className="w-8 h-8 rounded-full bg-[#171510] text-[#C4B998] hover:text-white hover:bg-[#231F16] border border-[#C8A24A]/30 flex items-center justify-center transition-colors"
              title="إغلاق وإيقاف الصوت"
              aria-label="إغلاق وإيقاف الصوت"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
