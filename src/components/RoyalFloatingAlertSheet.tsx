import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Volume2, VolumeX, Play, Pause, RotateCcw, ExternalLink, 
  BookOpen, Sparkles, Heart, BellRing, ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import { QuranService } from '../services/quranService';
import { StorageService } from '../services/storageService';
import { VERIFIED_RECITERS, getAyahAudioUrl } from '../data/surahsData';

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
  tafsir?: string;
  reciterName?: string;
  adhkarCategory?: string;
  playSound?: boolean;
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
  const [isTafsirOpen, setIsTafsirOpen] = useState<boolean>(false);
  const [isLoadingNextVerse, setIsLoadingNextVerse] = useState<boolean>(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoDismissTimerRef = useRef<any>(null);

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
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
    stopCurrentAudio();
    setIsTafsirOpen(false);
    setActiveAlert(null);
  };

  // Play audio safely via Web Audio element
  const playAlertAudio = (url?: string) => {
    if (!url) return;
    stopCurrentAudio();

    try {
      // Normalize URL
      let cleanUrl = url;
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        if (!cleanUrl.startsWith('/')) {
          cleanUrl = '/' + cleanUrl;
        }
        if (cleanUrl.startsWith('/public/')) {
          cleanUrl = cleanUrl.replace('/public/', '/');
        }
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

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setPlaybackProgress(100);
        // Start auto-dismiss countdown after audio completes (12 seconds)
        autoDismissTimerRef.current = setTimeout(() => {
          dismissAlert();
        }, 12000);
      });

      audio.addEventListener('error', (e) => {
        console.warn('[RoyalFloatingAlert] Audio playback fallback:', e);
        setIsPlaying(false);
      });

      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('[RoyalFloatingAlert] play error (autoplay policy):', err);
        setIsPlaying(false);
      });
    } catch (e) {
      console.warn('[RoyalFloatingAlert] audio setup error:', e);
      setIsPlaying(false);
    }
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
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {});
    } else if (activeAlert?.audioUrl) {
      playAlertAudio(activeAlert.audioUrl);
    }
  };

  // Allow users to instantly rotate to another single random Ayah from the Quran
  const handleFetchNextRandomAyah = async () => {
    if (isLoadingNextVerse) return;
    setIsLoadingNextVerse(true);
    try {
      const verse = await QuranService.getRandomVerseForReminder();
      if (verse) {
        const settings = StorageService.getSettings();
        const reciterId = settings.quranVerseReminder?.reciterId || settings.selectedReciterId || 'alafasy';
        const reciter = VERIFIED_RECITERS.find((r) => r.id === reciterId) || VERIFIED_RECITERS[0];
        const audioUrl = getAyahAudioUrl(reciter.audioServer, verse.surahNumber, verse.ayahNumber);

        setActiveAlert({
          ...activeAlert,
          type: 'ayah_daily',
          category: 'quran_ayah',
          badge: '📖 اقرأ ولو آية (آية واحدة عشوائية)',
          title: `سورة ${verse.surahName} • الآية ${verse.ayahNumber}`,
          body: `«${verse.text}»`,
          verseText: verse.text,
          surahNumber: verse.surahNumber,
          ayahNumber: verse.ayahNumber,
          surahName: verse.surahName,
          tafsir: verse.tafsir,
          reciterName: reciter.nameArabic,
          audioUrl,
          playSound: true,
          actionText: 'فتح الآية في المصحف 📖',
        });
        setPlaybackProgress(0);
        setCurrentTimeFormatted('00:00');
        setTotalTimeFormatted('00:00');
        playAlertAudio(audioUrl);
      }
    } catch (e) {
      console.warn('[RoyalFloatingAlert] Next random ayah error:', e);
    } finally {
      setIsLoadingNextVerse(false);
    }
  };

  const handlePrimaryAction = () => {
    if (!activeAlert) return;

    const { type, category, surahNumber, ayahNumber, targetTab, adhkarCategory } = activeAlert;

    // Navigate to respective feature
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

  useEffect(() => {
    // 1. Listen for native or global custom event
    const handleTriggerAlert = (e: any) => {
      const payload: FloatingAlertPayload = e?.detail;
      if (!payload || !payload.title) return;

      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
      }

      setPlaybackProgress(0);
      setCurrentTimeFormatted('00:00');
      setTotalTimeFormatted('00:00');
      setIsTafsirOpen(false);
      setActiveAlert(payload);

      // Play sound if requested
      if (payload.playSound !== false && payload.audioUrl) {
        playAlertAudio(payload.audioUrl);
      } else {
        // Auto dismiss quiet alerts after 20 seconds
        autoDismissTimerRef.current = setTimeout(() => {
          dismissAlert();
        }, 20000);
      }
    };

    // Check for pending royal alert queued by Android MainActivity during deep link
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
      stopCurrentAudio();
    };
  }, []);

  if (!activeAlert) return null;

  const isAyahAlert = activeAlert.type === 'ayah_daily' || activeAlert.category === 'quran_ayah' || (Boolean(activeAlert.surahNumber) && activeAlert.surahNumber! > 0);

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

  // Clean body or verse for display
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

        {/* Top Bar: Icon Badge, Category Badge & Dismiss Button */}
        <div className="flex items-center justify-between gap-2.5 pb-2.5 border-b border-[#C8A24A]/20 relative z-10">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2D2311] to-[#120E06] border border-[#E6C66E]/50 flex items-center justify-center shrink-0 shadow-sm">
              {getAlertIcon()}
            </div>
            <span className="text-[11px] font-extrabold text-[#E6C66E] truncate">
              {activeAlert.badge || '✨ تنبيه أثر الملكي العائم'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* If it's an Ayah alert: give instant button to pick another single random Ayah */}
            {isAyahAlert && (
              <button
                onClick={handleFetchNextRandomAyah}
                disabled={isLoadingNextVerse}
                className="py-1 px-2 rounded-lg bg-[#1F180D] border border-[#C8A24A]/40 hover:border-[#E6C66E] text-[#E6C66E] text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                title="جلب آية عشوائية أخرى"
              >
                <RefreshCw size={11} className={isLoadingNextVerse ? 'animate-spin' : ''} />
                <span>آية أخرى ↻</span>
              </button>
            )}

            <button
              onClick={dismissAlert}
              aria-label="إغلاق التنبيه"
              className="w-7 h-7 rounded-lg bg-[#14110A] border border-[#C8A24A]/30 hover:border-[#E6C66E] text-[#A89E88] hover:text-[#FFFDF8] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content Body: Specialized Single Ayah View vs Standard Alert */}
        {isAyahAlert ? (
          <div className="py-3 relative z-10 space-y-2.5">
            {/* Surah & Ayah Pill */}
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 py-0.5 px-2.5 rounded-full bg-[#20180B] border border-[#C8A24A]/40 text-[#E6C66E] text-[11px] font-black font-arabic">
                <span>📖 سورة {activeAlert.surahName || 'القرآن'}</span>
                <span>•</span>
                <span>الآية {activeAlert.ayahNumber || '١'}</span>
              </span>

              {activeAlert.reciterName && (
                <span className="text-[10px] text-[#A89E88] font-bold">
                  تلاوة: {activeAlert.reciterName}
                </span>
              )}
            </div>

            {/* The Holy Quranic Verse Display (Just ONE Single Ayah) */}
            <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#141009] to-[#0D0A06] border border-[#E6C66E]/35 text-center shadow-inner">
              <p className="font-quran text-base sm:text-lg text-[#F5EFE0] leading-loose select-text drop-shadow">
                ﴿ {displayAyahText} ﴾
              </p>
            </div>

            {/* Tafsir Collapsible Section */}
            {activeAlert.tafsir && (
              <div>
                <button
                  onClick={() => setIsTafsirOpen(!isTafsirOpen)}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-[#120F0A] border border-[#C8A24A]/25 hover:border-[#C8A24A]/50 text-[#C4B998] hover:text-[#E6C66E] text-[11px] font-bold flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1">
                    <BookOpen size={12} className="text-[#E6C66E]" />
                    <span>تفسير الآية الميسر</span>
                  </span>
                  {isTafsirOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                {isTafsirOpen && (
                  <div className="mt-1.5 p-2.5 rounded-lg bg-[#0A0805] border border-[#C8A24A]/20 text-[11px] text-[#D8CEB8] leading-relaxed font-arabic animate-slideDown">
                    {activeAlert.tafsir}
                  </div>
                )}
              </div>
            )}
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

        {/* Audio Player Strip (Rendered if audioUrl is present) */}
        {activeAlert.audioUrl && (
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

              {/* Soundwaves / Status */}
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

            {/* Progress Bar */}
            <div className="w-full bg-[#1F190E] h-1 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#C8A24A] to-[#E6C66E] h-full transition-all duration-200"
                style={{ width: `${playbackProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Controls: Primary Quick Navigation & Close */}
        <div className="mt-3 pt-2.5 border-t border-[#C8A24A]/20 relative z-10 flex items-center gap-2">
          <button
            onClick={handlePrimaryAction}
            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#E6C66E] via-[#D4AF37] to-[#A6802B] text-[#0A0805] text-xs font-black flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(200,162,74,0.3)] hover:brightness-105 active:scale-98 transition-all cursor-pointer"
          >
            <span>{getActionLabel()}</span>
            <ExternalLink size={13} />
          </button>

          <button
            onClick={dismissAlert}
            className="py-2 px-3.5 rounded-xl bg-[#14110A] border border-[#C8A24A]/30 text-[#A89E88] hover:text-[#FFFDF8] text-xs font-bold active:scale-98 transition-all cursor-pointer"
          >
            تم
          </button>
        </div>

      </div>
    </aside>
  );
};
