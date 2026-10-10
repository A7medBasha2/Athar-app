import React, { useState, useEffect } from 'react';
import { ActiveAudioState, AudioService } from '../services/audioService';
import { 
  Play, Pause, ChevronLeft, ChevronRight, RotateCcw, RotateCw, 
  X, BookOpen, Volume2, Heart, Maximize2, Moon, Repeat
} from 'lucide-react';

interface GlobalMiniPlayerProps {
  onOpenSurahReader?: (surahNumber: number, ayahNumber?: number) => void;
  onNavigateToTab?: (tab: 'home' | 'prayers' | 'quran' | 'adhkar' | 'qibla' | 'reminders' | 'settings') => void;
}

export const GlobalMiniPlayer: React.FC<GlobalMiniPlayerProps> = ({
  onOpenSurahReader,
  onNavigateToTab
}) => {
  const [activeAudio, setActiveAudio] = useState<ActiveAudioState | null>(null);

  useEffect(() => {
    const unsub = AudioService.subscribe(setActiveAudio);
    return () => unsub();
  }, []);

  const isPrimaryState = activeAudio && (activeAudio.category === 'quran' || activeAudio.category === 'adhkar');
  const interruptedPrimary = !isPrimaryState ? AudioService.getInterruptedTrackState() : null;
  const displayAudio = isPrimaryState ? activeAudio : interruptedPrimary;
  const isWaitingForTemporaryAudio = Boolean(!isPrimaryState && interruptedPrimary && activeAudio?.isPlaying);

  if (!displayAudio) {
    return null;
  }

  const formatSeconds = (sec: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const isQuran = displayAudio.category === 'quran';
  const isAdhkar = displayAudio.category === 'adhkar';

  const handleExpandToPage = () => {
    if (isQuran) {
      if (displayAudio.surahNumber && onOpenSurahReader) {
        onOpenSurahReader(displayAudio.surahNumber, displayAudio.ayahNumber || 1);
      } else if (onNavigateToTab) {
        onNavigateToTab('quran');
      }
    } else if (isAdhkar && onNavigateToTab) {
      onNavigateToTab('adhkar');
    }
  };

  return (
    <div className="w-full px-3 py-1.5 z-30 select-none animate-slideUp">
      <div className="bg-[#111923]/98 backdrop-blur-md border border-[#D4AF37]/50 rounded-2xl p-3 shadow-2xl flex flex-col gap-2">
        {/* Upper Row: Title, Subtitle, Playback buttons, and Actions */}
        <div className="flex items-center justify-between gap-2">
          {/* Metadata info - Clicking expands to corresponding page */}
          <div 
            onClick={handleExpandToPage}
            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer hover:opacity-90 transition-opacity"
            title="انقر لتكبير المشغل أو الانتقال لصفحته"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow shrink-0 ${
              isQuran
                ? 'bg-gradient-to-tr from-[#997A15] to-[#E5C158] text-slate-950'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {isQuran ? (
                displayAudio.surahNumber || <BookOpen size={16} />
              ) : (
                <Heart size={16} />
              )}
            </div>

            <div className="text-right truncate">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-slate-100 truncate">
                  {displayAudio.title}
                </h4>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-md shrink-0 flex items-center gap-0.5 ${
                  isWaitingForTemporaryAudio
                    ? 'text-amber-300 bg-amber-500/15 border border-amber-500/30'
                    : 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30'
                }`}>
                  <Volume2 size={10} className={displayAudio.isPlaying || isWaitingForTemporaryAudio ? 'animate-pulse' : ''} />
                  <span>
                    {isWaitingForTemporaryAudio
                      ? 'سيُستأنف تلقائياً'
                      : displayAudio.isPlaying
                      ? 'مشغّل جاري'
                      : 'متوقف'}
                  </span>
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                {isWaitingForTemporaryAudio
                  ? `محفوظ مؤقتاً حتى انتهاء (${activeAudio?.title || 'التنبيه'})...`
                  : displayAudio.subtitle}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Smart Sleep Timer Quick Cycle Button */}
            <button
              onClick={() => {
                const cur = displayAudio.sleepTimerRemainingSeconds;
                const isEndSurah = displayAudio.stopAtEndOfSurah;
                if (!cur && !isEndSurah) {
                  AudioService.setSleepTimer(15);
                } else if (cur && cur <= 15 * 60) {
                  AudioService.setSleepTimer(30);
                } else if (cur && cur <= 30 * 60) {
                  AudioService.setSleepTimer(60);
                } else if (cur && isQuran) {
                  AudioService.setSleepTimer(-1);
                } else {
                  AudioService.setSleepTimer(null);
                }
              }}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
                displayAudio.sleepTimerRemainingSeconds || displayAudio.stopAtEndOfSurah
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/50'
                  : 'bg-slate-800/70 text-slate-400 border-slate-700/60 hover:text-slate-200'
              }`}
              title="مؤقت النوم الذكي (١٥ د / ٣٠ د / ٦٠ د / نهاية السورة) مع خفض تدريجي للصوت"
            >
              <Moon size={11} />
              <span className="tabular-nums">
                {displayAudio.stopAtEndOfSurah
                  ? 'نهاية السورة'
                  : displayAudio.sleepTimerRemainingSeconds
                  ? `${Math.ceil(displayAudio.sleepTimerRemainingSeconds / 60)} د`
                  : 'مؤقت'}
              </span>
            </button>

            {/* Ayah Repeat Quick Cycle Button (when playing Quran) */}
            {isQuran && (
              <button
                onClick={() => AudioService.cycleAyahRepeatTarget()}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-0.5 ${
                  (displayAudio.ayahRepeatTarget ?? 1) !== 1
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                    : 'bg-slate-800/70 text-slate-400 border-slate-700/60 hover:text-slate-200'
                }`}
                title="تكرار الآية لتثبيت الحفظ (1× / 3× / 5× / 10× / ∞)"
              >
                <Repeat size={11} />
                <span className="tabular-nums">
                  {displayAudio.ayahRepeatTarget === 0
                    ? '∞'
                    : `${displayAudio.ayahRepeatTarget || 1}×`}
                </span>
              </button>
            )}

            {/* Play / Pause Toggle */}
            <button
              onClick={() => {
                if (isWaitingForTemporaryAudio) {
                  AudioService.stopTemporaryAndResume();
                } else {
                  AudioService.togglePlayPause();
                }
              }}
              className="w-8 h-8 rounded-full bg-[#D4AF37] text-slate-950 flex items-center justify-center hover:bg-[#E5C158] transition-transform active:scale-95 shadow"
              title={displayAudio.isPlaying ? 'إيقاف مؤقت' : 'متابعة الآن'}
              aria-label={displayAudio.isPlaying ? 'إيقاف مؤقت' : 'متابعة الآن'}
            >
              {displayAudio.isPlaying ? (
                <Pause size={14} fill="currentColor" />
              ) : (
                <Play size={14} fill="currentColor" className="mr-0.5" />
              )}
            </button>

            {/* Jump to section */}
            {isQuran && displayAudio.surahNumber && onOpenSurahReader && (
              <button
                onClick={() => onOpenSurahReader(displayAudio.surahNumber!, displayAudio.ayahNumber || 1)}
                className="px-2 py-1 bg-[#1B2633] hover:bg-[#233244] text-[#D4AF37] border border-[#D4AF37]/30 text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1"
                title="فتح في قارئ المصحف"
              >
                <BookOpen size={12} />
                <span>المصحف</span>
              </button>
            )}

            {isAdhkar && onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('adhkar')}
                className="px-2 py-1 bg-[#1B2633] hover:bg-[#233244] text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1"
                title="الانتقال لشاشة الأذكار"
              >
                <Heart size={12} />
                <span>الأذكار</span>
              </button>
            )}

            {/* Stop / Close button */}
            <button
              onClick={() => AudioService.stop()}
              className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[11px] font-bold transition-all active:scale-95"
              title="إغلاق المشغل وإيقاف الصوت"
              aria-label="إغلاق المشغل"
            >
              <X size={13} />
              <span>إغلاق</span>
            </button>
          </div>
        </div>

        {/* Bottom row: Time controller & Seek bar */}
        <div className="w-full bg-[#0D141C] border border-slate-800/80 rounded-xl px-2.5 py-1.5 space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            {/* Rewind 10 Seconds */}
            <button
              onClick={() => AudioService.skipBackward(10)}
              className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-[#D4AF37] rounded transition-all active:scale-95 text-[10px]"
              title="تأخير 10 ثوانٍ"
            >
              <RotateCcw size={11} />
              <span>10- ثوانٍ</span>
            </button>

            {/* Time display */}
            <div className="font-mono tabular-nums text-slate-300">
              <span className="text-[#D4AF37] font-bold">{formatSeconds(displayAudio.currentTime || 0)}</span>
              {displayAudio.duration > 0 && (
                <>
                  <span className="text-slate-500 mx-1">/</span>
                  <span className="text-slate-400">{formatSeconds(displayAudio.duration)}</span>
                </>
              )}
            </div>

            {/* Forward 10 Seconds */}
            <button
              onClick={() => AudioService.skipForward(10)}
              className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-[#D4AF37] rounded transition-all active:scale-95 text-[10px]"
              title="تقديم 10 ثوانٍ"
            >
              <span>10+ ثوانٍ</span>
              <RotateCw size={11} />
            </button>
          </div>

          {/* Interactive Range Scrubber */}
          {displayAudio.duration > 0 && (
            <div className="flex items-center pt-0.5">
              <input
                type="range"
                min="0"
                max={Math.max(displayAudio.duration, 1)}
                step="1"
                value={Math.floor(displayAudio.currentTime || 0)}
                onChange={(e) => AudioService.seekTo(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
                aria-label="شريط تقديم وتأخير الصوت"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
