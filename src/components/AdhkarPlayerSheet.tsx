import React, { useState, useEffect, useRef } from 'react';
import { DhikrItem, AdhkarCategory } from '../types';
import { MORNING_FULL_AUDIO_URL, EVENING_FULL_AUDIO_URL } from '../data/adhkarData';
import { AudioService, ActiveAudioState } from '../services/audioService';
import { StorageService } from '../services/storageService';
import confetti from 'canvas-confetti';
import { 
  Play, Pause, SkipForward, SkipBack, RotateCcw, X, 
  CheckCircle2, Volume2, AlertCircle, RefreshCw, Radio
} from 'lucide-react';

interface AdhkarPlayerSheetProps {
  category: AdhkarCategory;
  adhkarList: DhikrItem[];
  startIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export const AdhkarPlayerSheet: React.FC<AdhkarPlayerSheetProps> = ({
  category,
  adhkarList,
  startIndex = 0,
  isOpen,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(startIndex);
  const [currentRepetition, setCurrentRepetition] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const [playMode, setPlayMode] = useState<'repeated' | 'continuous'>('repeated');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioState, setAudioState] = useState<ActiveAudioState | null>(null);

  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  const currentRepetitionRef = useRef(currentRepetition);
  currentRepetitionRef.current = currentRepetition;

  const playModeRef = useRef(playMode);
  playModeRef.current = playMode;

  const playbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAutoAdvancingRef = useRef<boolean>(false);

  const categoryTitle = category === 'morning' ? 'أذكار الصباح' : 'أذكار المساء';
  const currentDhikr = adhkarList[currentIndex] || adhkarList[0];

  useEffect(() => {
    const unsub = AudioService.subscribe((state) => {
      setAudioState(state);
      if (state?.category === 'adhkar') {
        setIsPlaying(state.isPlaying);
      } else if (state) {
        // Temporarily paused for a reminder/Adhan
        setIsPlaying(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(startIndex);
      setCurrentRepetition(1);
      setIsFinished(false);
      setErrorMessage(null);
      startPlayback(startIndex, 1, playMode);
    }
    // Do not call AudioService.stop() when closing/minimizing the sheet
    // so the user can freely navigate the app while GlobalMiniPlayer stays active!
  }, [isOpen, startIndex]);

  const clearScheduledAdvance = () => {
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
    isAutoAdvancingRef.current = false;
  };

  const handleModeSwitch = (mode: 'repeated' | 'continuous') => {
    setPlayMode(mode);
    clearScheduledAdvance();
    startPlayback(currentIndex, 1, mode);
  };

  const startPlayback = async (index: number, repCount: number, mode: 'repeated' | 'continuous') => {
    clearScheduledAdvance();
    setErrorMessage(null);

    // If continuous mode selected (Full uninterrupted recitation by Sheikh Mishary Alafasy)
    if (mode === 'continuous') {
      const fullUrl = category === 'morning' ? MORNING_FULL_AUDIO_URL : EVENING_FULL_AUDIO_URL;
      setIsPlaying(true);
      await AudioService.playUrl(
        fullUrl,
        'adhkar',
        {
          title: `${categoryTitle} كاملة`,
          subtitle: `تلاوة متواصلة مباركة · الشيخ مشاري راشد العفاسي`,
          dhikrId: 9999,
          totalAdhkar: adhkarList.length
        },
        {
          onEnded: () => handleCompleteSession(),
          onError: () => {
            setIsPlaying(false);
            setErrorMessage('تعذر تحميل التسجيل المتواصل، يمكنك تجربة التكرار لكل ذكر');
          }
        }
      );
      return;
    }

    // Repeated mode: individual Dhikr repeated by its Sunnah count
    if (index >= adhkarList.length) {
      handleCompleteSession();
      return;
    }

    const item = adhkarList[index];
    if (!item) return;

    if (!item.audioUrl) {
      setErrorMessage('لا يتوفر ملف صوتي لهذا الذكر حالياً.');
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);

    const onAudioEnd = () => {
      if (isAutoAdvancingRef.current) return;
      isAutoAdvancingRef.current = true;

      // Update external counter and achievement stats for listening!
      const currentItem = adhkarList[currentIndexRef.current];
      if (currentItem) {
        StorageService.setDhikrCount(category, currentItem.id, currentRepetitionRef.current);
        StorageService.recordDhikrStep(category, currentItem.id, currentItem.count);
      }

      // Islamic etiquette: calm dignified pause (1000ms) between repetitions to absorb the Dhikr
      playbackTimeoutRef.current = setTimeout(() => {
        isAutoAdvancingRef.current = false;
        const currentItem = adhkarList[currentIndexRef.current];
        if (!currentItem) return;

        const nextRep = currentRepetitionRef.current + 1;
        if (nextRep <= currentItem.count) {
          // Repeat current Dhikr
          setCurrentRepetition(nextRep);
          startPlayback(currentIndexRef.current, nextRep, 'repeated');
        } else {
          // Mark current Dhikr completed with full count
          StorageService.setDhikrCount(category, currentItem.id, currentItem.count);
          setCompletedIds(prev => Array.from(new Set([...prev, currentItem.id])));
          // Advance to next Dhikr in sequence
          const nextIdx = currentIndexRef.current + 1;
          if (nextIdx < adhkarList.length) {
            setCurrentIndex(nextIdx);
            setCurrentRepetition(1);
            startPlayback(nextIdx, 1, 'repeated');
          } else {
            handleCompleteSession();
          }
        }
      }, 1000);
    };

    const onAudioError = (e: any) => {
      console.warn('Adhkar audio loading error:', e);
      clearScheduledAdvance();
      setIsPlaying(false);
      setErrorMessage('تعذر تحميل صوت هذا الذكر. يمكنك إعادة المحاولة أو الانتقال للتالي.');
    };

    // Save progress to local storage
    StorageService.saveAdhkarProgress({
      category,
      currentIndex: index,
      currentCount: repCount,
      completedIds: [...completedIds, item.id],
      isSessionFinished: false
    });

    await AudioService.playUrl(
      item.audioUrl,
      'adhkar',
      {
        title: categoryTitle,
        subtitle: `الذكر ${index + 1} من ${adhkarList.length} (تكرار ${repCount}/${item.count})`,
        dhikrId: item.id,
        currentRepetition: repCount,
        targetRepetition: item.count,
        dhikrIndex: index + 1,
        totalAdhkar: adhkarList.length
      },
      {
        onEnded: onAudioEnd,
        onError: onAudioError,
        onPrevious: handlePrevious,
        onNext: handleNext
      },
      {
        startTime: item.startTime,
        endTime: item.endTime
      }
    );
  };

  const handleNext = () => {
    clearScheduledAdvance();
    if (currentIndex < adhkarList.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setCurrentRepetition(1);
      startPlayback(nextIdx, 1, playMode);
    } else {
      handleCompleteSession();
    }
  };

  const handlePrevious = () => {
    clearScheduledAdvance();
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      setCurrentRepetition(1);
      startPlayback(prevIdx, 1, playMode);
    }
  };

  const handleTogglePlay = () => {
    clearScheduledAdvance();
    if (isPlaying) {
      AudioService.pause();
      setIsPlaying(false);
    } else {
      if (errorMessage) {
        startPlayback(currentIndex, currentRepetition, playMode);
      } else {
        AudioService.resume();
        setIsPlaying(true);
      }
    }
  };

  const handleResetCurrent = () => {
    clearScheduledAdvance();
    setCurrentRepetition(1);
    startPlayback(currentIndex, 1, playMode);
  };

  const handleCompleteSession = () => {
    clearScheduledAdvance();
    setIsFinished(true);
    setIsPlaying(false);
    AudioService.stop();
    StorageService.recordSessionCompleted(category);
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // confetti fallback
    }
  };

  if (!isOpen) return null;

  const currentDhikrItem = adhkarList[currentIndex] || adhkarList[0];
  const clipStart = currentDhikrItem?.startTime || 0;
  const clipEnd = currentDhikrItem?.endTime;
  const totalSeconds = clipEnd 
    ? Math.round(clipEnd - clipStart) 
    : Math.round(currentDhikrItem?.durationSeconds || audioState?.duration || 0);
  const currentSeconds = Math.min(totalSeconds, Math.max(0, Math.round((audioState?.currentTime || 0) - clipStart)));

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };


  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-end p-0 select-none animate-fadeIn">
      <div className="w-full max-w-lg mx-auto bg-[#10151C] border-t border-[#D4AF37]/40 rounded-t-3xl p-4 sm:p-5 shadow-2xl flex flex-col max-h-[92vh] h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Volume2 size={20} className="text-[#D4AF37]" />
            <div>
              <h3 className="text-sm font-bold text-slate-100">{categoryTitle} المسموعة</h3>
              <div className="flex items-center gap-1.5 text-[11px] text-[#D4AF37] font-medium mt-0.5">
                {playMode === 'repeated' ? (
                  <>
                    <span>الذكر {currentIndex + 1} من {adhkarList.length}</span>
                    <span>·</span>
                    <span className="text-emerald-400">تلاوة متطابقة بدقة مع الذكر</span>
                  </>
                ) : (
                  <span className="text-emerald-400">تلاوة متواصلة للورد كاملاً</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onClose}
              className="px-2.5 py-1 text-xs text-[#D4AF37] hover:text-white rounded-xl bg-slate-800/80 border border-slate-700/80 transition-colors flex items-center gap-1 active:scale-95"
              title="تصغير المشغل ومتابعة تصفح التطبيق بحرية"
            >
              <span>تصغير</span>
            </button>
            <button
              onClick={() => {
                AudioService.stop();
                onClose();
              }}
              className="p-1.5 text-rose-400 hover:text-rose-300 rounded-full bg-rose-950/40 border border-rose-900/50 transition-colors active:scale-95"
              title="إيقاف الصوت وإغلاق المشغل"
              aria-label="إيقاف الصوت وإغلاق المشغل"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Playback Mode Selector Pills */}
        <div className="grid grid-cols-2 gap-2 mt-3 p-1 bg-[#141B24] rounded-xl border border-slate-800 shrink-0 text-xs">
          <button
            onClick={() => handleModeSwitch('repeated')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold transition-all ${
              playMode === 'repeated'
                ? 'bg-[#1C2633] text-[#D4AF37] shadow-sm border border-[#D4AF37]/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw size={13} className={playMode === 'repeated' ? 'text-[#D4AF37]' : ''} />
            <span>تكرار كل ذكر بعدده المأثور</span>
          </button>

          <button
            onClick={() => handleModeSwitch('continuous')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold transition-all ${
              playMode === 'continuous'
                ? 'bg-[#1C2633] text-[#D4AF37] shadow-sm border border-[#D4AF37]/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio size={13} className={playMode === 'continuous' ? 'text-[#D4AF37]' : ''} />
            <span>استماع متواصل للورد كاملاً</span>
          </button>
        </div>

        {/* Error notification banner if any */}
        {errorMessage && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-center justify-between text-xs text-rose-300 shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => startPlayback(currentIndex, currentRepetition, playMode)}
              className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-800 rounded-lg text-[11px] font-bold text-white shrink-0 mr-2"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Finished State or Player Body */}
        {isFinished ? (
          <div className="flex-1 overflow-y-auto py-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] mb-4">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-xl font-bold text-slate-100">
              تم إتمام {categoryTitle} بحمد الله
            </h2>
            <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
              تقبّل الله طاعتكم وحفظكم بحفظه. داوم على الأذكار لتكون في حفظ وأمان طوال يومك.
            </p>
            <button
              onClick={() => {
                setCurrentIndex(0);
                setCurrentRepetition(1);
                setIsFinished(false);
                startPlayback(0, 1, playMode);
              }}
              className="mt-6 px-6 py-2.5 bg-[#D4AF37] text-slate-950 font-bold text-sm rounded-xl hover:bg-[#E5C158] transition-colors"
            >
              إعادة الاستماع من البداية
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto py-3 space-y-3 text-right">
            {/* Dhikr Arabic Text Box with pristine typography */}
            <div className="bg-[#151D26] border border-[#D4AF37]/30 rounded-2xl p-4 sm:p-5 shadow-inner">
              <div className="text-[11px] text-[#D4AF37] font-semibold mb-2 flex items-center justify-between">
                <span>نص الذكر المبارك</span>
                {playMode === 'repeated' && (
                  <span className="text-slate-400 font-normal">
                    العدد المطلوب: {currentDhikr.count === 1 ? 'مرة واحدة' : `${currentDhikr.count} مرات`}
                  </span>
                )}
              </div>
              <p className="font-quran text-lg sm:text-xl text-slate-100 leading-loose text-center whitespace-pre-line font-medium select-text">
                {currentDhikr.arabicText}
              </p>
            </div>

            {/* Repetition Status Counter (in repeated mode) */}
            {playMode === 'repeated' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-ping" />
                    <span>تكرار الذكر الحالي:</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[#D4AF37] font-bold text-lg tabular-nums">
                      {currentRepetition}
                    </span>
                    <span className="text-slate-500 font-medium">/</span>
                    <span className="text-slate-300 font-semibold text-sm tabular-nums">
                      {currentDhikr.count}
                    </span>
                  </div>
                </div>

                {/* Repetition Progress Bar */}
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#D4AF37] to-[#E5C158] h-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (currentRepetition / currentDhikr.count) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Audio Track Timeline Bar */}
            <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400">
              <div className="flex items-center justify-between mb-1 tabular-nums">
                <span>{formatSeconds(currentSeconds)}</span>
                <span className="text-[#D4AF37] font-medium">
                  {isPlaying ? 'جاري التشغيل الآن...' : 'متوقف مؤقتاً'}
                </span>
                <span>{formatSeconds(totalSeconds)}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#D4AF37] h-full transition-all duration-200"
                  style={{ width: `${totalSeconds > 0 ? (currentSeconds / totalSeconds) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Virtue / Fadl */}
            <div className="p-3 bg-amber-950/20 border border-[#D4AF37]/20 rounded-xl text-[11px] text-[#D4AF37] leading-relaxed">
              <span className="font-semibold block mb-0.5">فضل الذكر وأثره:</span>
              {currentDhikr.fadl}
            </div>
          </div>
        )}

        {/* Bottom Playback Controls */}
        {!isFinished && (
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center gap-5 shrink-0">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0 || playMode === 'continuous'}
              className="text-slate-400 hover:text-white disabled:opacity-30 p-2.5 rounded-xl hover:bg-slate-800/50 transition-colors"
              title="الذكر السابق"
              aria-label="الذكر السابق"
            >
              <SkipForward size={22} />
            </button>

            <button
              onClick={handleTogglePlay}
              className="w-14 h-14 rounded-full bg-[#D4AF37] text-slate-950 flex items-center justify-center hover:bg-[#E5C158] transition-transform active:scale-95 shadow-xl"
              title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
              aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            >
              {isPlaying ? (
                <Pause size={24} fill="currentColor" />
              ) : (
                <Play size={24} fill="currentColor" className="mr-0.5" />
              )}
            </button>

            <button
              onClick={handleNext}
              disabled={playMode === 'continuous'}
              className="text-slate-400 hover:text-white disabled:opacity-30 p-2.5 rounded-xl hover:bg-slate-800/50 transition-colors"
              title="الذكر التالي"
              aria-label="الذكر التالي"
            >
              <SkipBack size={22} />
            </button>

            {playMode === 'repeated' && (
              <button
                onClick={handleResetCurrent}
                className="text-slate-500 hover:text-slate-300 p-2.5 rounded-xl hover:bg-slate-800/50 transition-colors"
                title="إعادة تكرار الذكر الحالي"
                aria-label="إعادة تكرار الذكر"
              >
                <RotateCcw size={18} />
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
