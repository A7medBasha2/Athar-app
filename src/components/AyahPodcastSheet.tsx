import React, { useState, useEffect, useRef } from 'react';
import { AyahPodcastEpisode } from '../data/ayahPodcastData';
import { AyahPodcastService } from '../services/ayahPodcastService';
import { AudioService } from '../services/audioService';
import { AtharBrandLogo } from './AtharBrandLogo';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Headphones,
  Sparkles,
  CheckCircle2,
  Share2,
  Repeat,
  Clock,
  BookOpen,
  Compass,
  Heart,
  Volume2,
} from 'lucide-react';

interface AyahPodcastSheetProps {
  isOpen: boolean;
  onClose: () => void;
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  ayahText: string;
  totalAyahsInSurah?: number;
  onSelectAyah?: (nextAyahNumber: number) => void;
  onShareEpisodeCard?: (payload: {
    title: string;
    mainText: string;
    sourceLabel: string;
    subtitleOrTafsir: string;
  }) => void;
}

export const AyahPodcastSheet: React.FC<AyahPodcastSheetProps> = ({
  isOpen,
  onClose,
  surahNumber,
  surahName,
  ayahNumber,
  ayahText,
  totalAyahsInSurah = 1,
  onSelectAyah,
  onShareEpisodeCard,
}) => {
  const [episode, setEpisode] = useState<AyahPodcastEpisode | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeSceneIndex, setActiveSceneIndex] = useState<0 | 1 | 2>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [totalDurationSeconds, setTotalDurationSeconds] = useState<number>(120);
  const [isContinuousDriveMode, setIsContinuousDriveMode] = useState<boolean>(false);
  const [isActionCompleted, setIsActionCompleted] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const continuousModeRef = useRef<boolean>(isContinuousDriveMode);
  continuousModeRef.current = isContinuousDriveMode;

  useEffect(() => {
    if (!isOpen) {
      stopAllPodcastPlayback();
      return;
    }

    loadAndStartEpisode();

    return () => {
      stopAllPodcastPlayback();
    };
  }, [isOpen, surahNumber, ayahNumber]);

  const stopAllPodcastPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (speechTimerRef.current) {
      clearInterval(speechTimerRef.current);
      speechTimerRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  const loadAndStartEpisode = async () => {
    stopAllPodcastPlayback();
    // Pause background Quran recitation if playing so podcast narration is clear
    AudioService.pause();

    setIsLoading(true);
    setIsActionCompleted(false);
    setActiveSceneIndex(0);
    setProgressPercent(0);
    setElapsedSeconds(0);

    try {
      const ep = await AyahPodcastService.getOrGenerateEpisode({
        surahNumber,
        surahName,
        ayahNumber,
        ayahText,
      });
      setEpisode(ep);
      setIsLoading(false);
      startEpisodePlayback(ep);
    } catch {
      setIsLoading(false);
    }
  };

  const updateSceneByProgress = (percent: number) => {
    if (percent < 34) {
      setActiveSceneIndex(0);
    } else if (percent < 68) {
      setActiveSceneIndex(1);
    } else {
      setActiveSceneIndex(2);
    }
  };

  const handleEpisodeEnded = () => {
    setIsPlaying(false);
    setProgressPercent(100);
    setActiveSceneIndex(2);

    // If Continuous Drive / Walk Mode is active, automatically advance to next Ayah
    if (
      continuousModeRef.current &&
      onSelectAyah &&
      ayahNumber < totalAyahsInSurah
    ) {
      setTimeout(() => {
        onSelectAyah(ayahNumber + 1);
      }, 1500);
    }
  };

  const estimateNarrationSeconds = (script: string): number => {
    const wordCount = script ? script.trim().split(/\s+/).length : 120;
    // Arabic reverent narration averages ~1.9 words per second
    return Math.max(75, Math.round(wordCount / 1.85));
  };

  const startEpisodePlayback = (ep: AyahPodcastEpisode) => {
    stopAllPodcastPlayback();

    // Update lock screen MediaSession metadata for driving / walking mode
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: `بودكاست الآية: ${ep.episodeTitle}`,
          artist: `سورة ${ep.surahName} · الآية ${ep.ayahNumber}`,
          album: 'أثر | بودكاست الآية والتدبر الصوتي',
        });
      } catch {}
    }

    // 1. If WAV/Audio Data URL from Gemini TTS is available, play via HTMLAudioElement without any time cutoff
    if (ep.audioDataUrl) {
      const audio = new Audio(ep.audioDataUrl);
      audioRef.current = audio;

      const fallbackEstimated = estimateNarrationSeconds(ep.fullNarrationScript);

      audio.onloadedmetadata = () => {
        if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
          setTotalDurationSeconds(Math.round(audio.duration));
        } else {
          setTotalDurationSeconds(fallbackEstimated);
        }
      };

      audio.ontimeupdate = () => {
        const cur = audio.currentTime || 0;
        const dur =
          audio.duration && isFinite(audio.duration) && audio.duration > 0
            ? audio.duration
            : Math.max(fallbackEstimated, cur + 5);
        const pct = Math.min(100, Math.max(0, (cur / dur) * 100));
        setElapsedSeconds(Math.floor(cur));
        setTotalDurationSeconds(Math.round(dur));
        setProgressPercent(pct);
        updateSceneByProgress(pct);
      };

      audio.onended = () => {
        handleEpisodeEnded();
      };

      audio.onerror = () => {
        // Fallback to local speech synthesis if audio element fails
        startSpeechSynthesisFallback(ep);
      };

      audio
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          startSpeechSynthesisFallback(ep);
        });
      return;
    }

    // 2. Fallback: Local Arabic SpeechSynthesis playing until the entire reflection completes naturally
    startSpeechSynthesisFallback(ep);
  };

  const startSpeechSynthesisFallback = (ep: AyahPodcastEpisode) => {
    let dynamicTotalSeconds = estimateNarrationSeconds(ep.fullNarrationScript);
    setTotalDurationSeconds(dynamicTotalSeconds);
    setElapsedSeconds(0);
    setProgressPercent(0);
    setIsPlaying(true);

    let hasSpeechApi = false;
    let utteranceFinished = false;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(ep.fullNarrationScript);
        utterance.lang = 'ar-SA';
        utterance.rate = 0.92;
        utterance.pitch = 0.95;

        const voices = window.speechSynthesis.getVoices();
        const arabicVoice = voices.find((v) => v.lang.toLowerCase().startsWith('ar'));
        if (arabicVoice) {
          utterance.voice = arabicVoice;
        }

        utterance.onend = () => {
          utteranceFinished = true;
          if (speechTimerRef.current) {
            clearInterval(speechTimerRef.current);
            speechTimerRef.current = null;
          }
          handleEpisodeEnded();
        };

        utterance.onerror = () => {
          utteranceFinished = true;
        };

        window.speechSynthesis.speak(utterance);
        hasSpeechApi = true;
      } catch {}
    }

    let currentSec = 0;
    if (speechTimerRef.current) clearInterval(speechTimerRef.current);
    speechTimerRef.current = setInterval(() => {
      currentSec += 1;
      const synthSpeaking =
        hasSpeechApi &&
        typeof window !== 'undefined' &&
        'speechSynthesis' in window &&
        window.speechSynthesis.speaking;

      // If speech synthesis is still speaking past the initial estimate, expand total duration smoothly so it never cuts off
      if (synthSpeaking && currentSec >= dynamicTotalSeconds - 3) {
        dynamicTotalSeconds = currentSec + 8;
        setTotalDurationSeconds(dynamicTotalSeconds);
      }

      const pct = Math.min(99, (currentSec / dynamicTotalSeconds) * 100);
      setElapsedSeconds(currentSec);
      setProgressPercent(pct);
      updateSceneByProgress(pct);

      // Only end by timer if speechSynthesis is not actively speaking or has finished
      if (!synthSpeaking && (utteranceFinished || currentSec >= dynamicTotalSeconds)) {
        if (speechTimerRef.current) {
          clearInterval(speechTimerRef.current);
          speechTimerRef.current = null;
        }
        handleEpisodeEnded();
      }
    }, 1000);
  };

  const handleTogglePlayPause = () => {
    if (!episode) return;

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
      return;
    }

    // SpeechSynthesis fallback toggle
    if (isPlaying) {
      if (speechTimerRef.current) clearInterval(speechTimerRef.current);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.pause();
      }
      setIsPlaying(false);
    } else {
      startEpisodePlayback(episode);
    }
  };

  const handleJumpToScene = (sceneIdx: 0 | 1 | 2) => {
    setActiveSceneIndex(sceneIdx);
    const targetPct = sceneIdx === 0 ? 5 : sceneIdx === 1 ? 36 : 70;
    setProgressPercent(targetPct);
    if (audioRef.current && audioRef.current.duration && isFinite(audioRef.current.duration)) {
      audioRef.current.currentTime = (targetPct / 100) * audioRef.current.duration;
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const sceneCards = episode
    ? [
        {
          index: 0 as const,
          badge: 'المشهد الأول · قصة الآية والشرح والبيان',
          icon: Compass,
          text: episode.scenes.revelationContext,
        },
        {
          index: 1 as const,
          badge: 'المشهد الثاني · كيف عاشها النبي ﷺ والصحابة',
          icon: BookOpen,
          text: episode.scenes.propheticLiving,
        },
        {
          index: 2 as const,
          badge: 'المشهد الثالث · التدبر العميق ورسالتها لقلبك اليوم',
          icon: Heart,
          text: episode.scenes.modernReflection,
        },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-fadeIn">
      <div className="w-full max-w-lg bg-gradient-to-b from-[#17130C] via-[#0D0B08] to-[#070707] border-t sm:border border-[#C8A24A]/65 rounded-t-[32px] sm:rounded-[32px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_30px_rgba(200,162,74,0.2)] flex flex-col max-h-[92vh] overflow-y-auto text-right space-y-4">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#C8A24A]/25 pb-3">
          <div className="flex items-center gap-2.5">
            <AtharBrandLogo size="xs" showWordmark={false} />
            <div>
              <div className="flex items-center gap-1.5">
                <Headphones size={14} className="text-[#E6C66E]" />
                <span className="text-xs font-extrabold text-[#E6C66E]">
                  بودكاست الآية · القصة والتدبر الصوتي
                </span>
              </div>
              <p className="text-[11px] text-[#C4B998] mt-0.5">
                سورة {surahName} · الآية {ayahNumber} · تدبر وشرح كامل لقصة الآية
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#18140D] hover:bg-[#241E13] text-[#C4B998] hover:text-white border border-[#C8A24A]/35 transition-colors"
            title="إغلاق"
            aria-label="إغلاق بودكاست الآية"
          >
            <X size={16} />
          </button>
        </div>

        {/* Ayah Showcase Frame */}
        <div className="rounded-2xl bg-gradient-to-b from-[#1F1A10] to-[#110E09] border border-[#C8A24A]/50 p-4 text-center shadow-inner space-y-2">
          <p className="font-quran text-xl sm:text-2xl text-[#F6E9BA] leading-loose">
            ﴿{ayahText}﴾
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#090806]/80 border border-[#C8A24A]/35 text-[10px] font-bold text-[#E6C66E]">
            <span>سورة {surahName}</span>
            <span>•</span>
            <span>الآية {ayahNumber}</span>
            <span>•</span>
            <span className="text-[#F3E5AB]">محفوظ محلياً بدون إنترنت ✓</span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-10 h-10 border-2 border-[#E6C66E] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-extrabold text-[#F3E5AB]">
              جاري إعداد التدبر والشرح الكامل لقصة الآية...
            </p>
            <p className="text-[11px] text-[#C4B998]">
              يتم حفظ القصة والصوت تلقائياً في قاعدة البيانات المحلية للاستماع بدون إنترنت
            </p>
          </div>
        ) : episode ? (
          <>
            {/* Episode Title & Audio Waveform Visualizer */}
            <div className="rounded-2xl bg-[#12100B] border border-[#C8A24A]/40 p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] text-[#E6C66E] font-bold flex items-center gap-1">
                    <Sparkles size={11} />
                    <span>عنوان القصة</span>
                  </span>
                  <h3 className="text-sm sm:text-base font-extrabold text-white mt-0.5 leading-snug">
                    {episode.episodeTitle}
                  </h3>
                </div>

                {/* Animated Golden Waveform Indicator */}
                <div className="flex items-end gap-0.5 h-6 px-2.5 py-1 rounded-xl bg-[#1C1810] border border-[#C8A24A]/35 shrink-0">
                  {[0.4, 0.85, 0.55, 1, 0.65, 0.9, 0.45].map((h, idx) => (
                    <span
                      key={idx}
                      className={`w-1 rounded-full bg-gradient-to-t from-[#B88A2D] to-[#F3E5AB] transition-all duration-300 ${
                        isPlaying ? 'animate-pulse' : 'opacity-40'
                      }`}
                      style={{
                        height: isPlaying ? `${Math.round(h * 16)}px` : '5px',
                        animationDelay: `${idx * 120}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Progress Bar & Timestamps */}
              <div className="space-y-1">
                <div className="w-full h-2 rounded-full bg-[#1C1810] border border-[#C8A24A]/35 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-[#FFF2C2] via-[#E6C66E] to-[#A67C22] shadow-[0_0_10px_rgba(230,198,110,0.8)] transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-[#C4B998] tabular-nums">
                  <span className="flex items-center gap-1">
                    <Clock size={10} className="text-[#E6C66E]" />
                    {formatTime(elapsedSeconds)}
                  </span>
                  <span className="text-[#E6C66E] font-sans font-bold">
                    {isPlaying ? 'جاري السرد الصوتي...' : 'متوقف مؤقتاً'}
                  </span>
                  <span>{formatTime(totalDurationSeconds)}</span>
                </div>
              </div>

              {/* Playback Controls + Continuous Drive/Walk Mode */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={() => setIsContinuousDriveMode(!isContinuousDriveMode)}
                  className={`px-3 py-1.5 rounded-xl border text-[11px] font-extrabold flex items-center gap-1.5 transition-all ${
                    isContinuousDriveMode
                      ? 'bg-[#262011] border-[#E6C66E] text-[#F3E5AB] shadow-[0_0_12px_rgba(230,198,110,0.25)]'
                      : 'bg-[#0C0B08] border-[#C8A24A]/30 text-[#C4B998] hover:text-white'
                  }`}
                  title="تشغيل متواصل لقصص السورة أثناء المشي أو القيادة"
                >
                  <Repeat size={12} className="text-[#E6C66E]" />
                  <span>وضع القيادة والمشي</span>
                </button>

                <div className="flex items-center gap-3">
                  {onSelectAyah && (
                    <button
                      onClick={() => {
                        if (ayahNumber > 1) onSelectAyah(ayahNumber - 1);
                      }}
                      disabled={ayahNumber <= 1}
                      className="p-2 rounded-xl bg-[#1A160E] border border-[#C8A24A]/30 text-[#C4B998] hover:text-white disabled:opacity-30"
                      title="قصة الآية السابقة"
                    >
                      <SkipForward size={15} />
                    </button>
                  )}

                  <button
                    onClick={handleTogglePlayPause}
                    className="w-11 h-11 rounded-full bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#070707] flex items-center justify-center shadow-[0_4px_20px_rgba(200,162,74,0.45)] hover:brightness-110 active:scale-95 transition-all"
                    title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل القصة'}
                  >
                    {isPlaying ? (
                      <Pause size={18} fill="currentColor" />
                    ) : (
                      <Play size={18} fill="currentColor" className="mr-0.5" />
                    )}
                  </button>

                  {onSelectAyah && (
                    <button
                      onClick={() => {
                        if (ayahNumber < totalAyahsInSurah) onSelectAyah(ayahNumber + 1);
                      }}
                      disabled={ayahNumber >= totalAyahsInSurah}
                      className="p-2 rounded-xl bg-[#1A160E] border border-[#C8A24A]/30 text-[#C4B998] hover:text-white disabled:opacity-30"
                      title="قصة الآية التالية"
                    >
                      <SkipBack size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 3 Synchronized Cinematic Storytelling Scenes */}
            <div className="space-y-2.5">
              {sceneCards.map((scene) => {
                const IconComp = scene.icon;
                const isSceneActive = activeSceneIndex === scene.index;
                return (
                  <div
                    key={scene.index}
                    onClick={() => handleJumpToScene(scene.index)}
                    className={`cursor-pointer rounded-2xl p-3.5 border transition-all duration-300 ${
                      isSceneActive
                        ? 'bg-gradient-to-l from-[#241E11] to-[#14110A] border-[#E6C66E] shadow-[0_6px_22px_rgba(200,162,74,0.2)]'
                        : 'bg-[#0F0D09]/90 border-[#C8A24A]/25 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-[11px] font-extrabold flex items-center gap-1.5 ${
                          isSceneActive ? 'text-[#E6C66E]' : 'text-[#C4B998]'
                        }`}
                      >
                        <IconComp size={13} />
                        <span>{scene.badge}</span>
                      </span>
                      {isSceneActive && isPlaying && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#C8A24A]/25 text-[#F3E5AB] font-bold flex items-center gap-1">
                          <Volume2 size={10} />
                          <span>يُروى الآن</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-[#F3E5AB] leading-relaxed">
                      {scene.text}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Practical Daily Action Step Card & Royal Share Button */}
            <div className="rounded-2xl bg-gradient-to-r from-[#221C10] via-[#17130B] to-[#221C10] border border-[#E6C66E]/60 p-4 space-y-3 shadow-lg">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold text-[#E6C66E] flex items-center gap-1.5">
                    <Sparkles size={13} />
                    <span>خطوتك العملية اليوم من الآية</span>
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                    {episode.practicalStep}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setIsActionCompleted(!isActionCompleted)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                    isActionCompleted
                      ? 'bg-[#C8A24A] text-[#070707] shadow-md'
                      : 'bg-[#12100B] hover:bg-[#1D1911] text-[#F3E5AB] border border-[#C8A24A]/45'
                  }`}
                >
                  <CheckCircle2 size={14} />
                  <span>{isActionCompleted ? 'تم التطبيق ونويت العمل بها ✓' : 'نويت تطبيقها اليوم'}</span>
                </button>

                {onShareEpisodeCard && (
                  <button
                    onClick={() => {
                      onShareEpisodeCard({
                        title: `بودكاست الآية: ${episode.episodeTitle}`,
                        mainText: `﴿${ayahText}﴾`,
                        sourceLabel: `سورة ${surahName} · الآية ${ayahNumber}`,
                        subtitleOrTafsir: `${episode.scenes.modernReflection}\n\n• الخطوة العملية: ${episode.practicalStep}`,
                      });
                    }}
                    className="py-2 px-3.5 rounded-xl bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#070707] text-xs font-extrabold flex items-center justify-center gap-1.5 shadow hover:brightness-110 transition-all"
                  >
                    <Share2 size={14} />
                    <span>مشاركة كبطاقة ذهبية</span>
                  </button>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
