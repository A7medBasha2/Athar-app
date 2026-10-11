import React, { useState, useEffect, useRef } from 'react';
import { ALL_SURAHS, VERIFIED_RECITERS } from '../data/surahsData';
import { AyahItem, QuranReciter } from '../types';
import { QuranService } from '../services/quranService';
import { StorageService } from '../services/storageService';
import { AudioService } from '../services/audioService';
import { ShareCardModal, ShareCardPayload } from '../components/ShareCardModal';
import { AyahPodcastService } from '../services/ayahPodcastService';
import { LUXURY_IMAGES } from '../data/storiesAndExploreData';
import { 
  ArrowRight, Play, Pause, Bookmark, Copy, 
  Volume2, ChevronLeft, ChevronRight, Check, ChevronsDown, BookOpen,
  Moon, Repeat, Image as ImageIcon, Sun, Headphones
} from 'lucide-react';

interface QuranReaderViewProps {
  surahNumber: number;
  initialAyah?: number;
  onBack: () => void;
  onSelectAnotherSurah: (num: number) => void;
}

export const QuranReaderView: React.FC<QuranReaderViewProps> = ({
  surahNumber,
  initialAyah = 1,
  onBack,
  onSelectAnotherSurah
}) => {
  const savedPosFromStorage = StorageService.getSurahReadingPosition(surahNumber);
  const effectiveInitialAyah = (initialAyah && initialAyah > 1) ? initialAyah : (savedPosFromStorage > 1 ? savedPosFromStorage : 1);

  const [ayahs, setAyahs] = useState<AyahItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<number>(24);
  const [readerTheme, setReaderTheme] = useState<'night' | 'sepia' | 'oled'>(
    StorageService.getSettings().readerTheme || 'night'
  );
  const [activeAyah, setActiveAyah] = useState<number>(effectiveInitialAyah);
  const [savedReadingPosition, setSavedReadingPosition] = useState<number>(savedPosFromStorage);
  const [resumeNotice, setResumeNotice] = useState<string | null>(
    savedPosFromStorage > 1 ? `تم استئناف القراءة تلقائياً من الآية ${savedPosFromStorage} (موضعك المحفوظ)` : null
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [reciter, setReciter] = useState<QuranReciter>(VERIFIED_RECITERS[0]);
  const [isReciterSelectorOpen, setIsReciterSelectorOpen] = useState<boolean>(false);
  const [copiedAyah, setCopiedAyah] = useState<number | null>(null);
  const [isReadingAutoScroll, setIsReadingAutoScroll] = useState<boolean>(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [isUserInteracting, setIsUserInteracting] = useState<boolean>(false);
  const [expandedTafsirAyah, setExpandedTafsirAyah] = useState<number | null>(null);
  const [tafsirMap, setTafsirMap] = useState<Record<number, string>>({});
  const [sleepTimerState, setSleepTimerState] = useState(AudioService.getSleepTimerState());
  const [repeatState, setRepeatState] = useState(AudioService.getAyahRepeatState());
  const [shareCardPayload, setShareCardPayload] = useState<ShareCardPayload | null>(null);
  const [podcastAyah, setPodcastAyah] = useState<AyahItem | null>(null);
  const userInteractionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeAyahRef = useRef(activeAyah);
  activeAyahRef.current = activeAyah;

  const currentSurah = ALL_SURAHS.find(s => s.number === surahNumber) || ALL_SURAHS[0];

  const handleToggleTafsir = async (ayahNum: number) => {
    if (expandedTafsirAyah === ayahNum) {
      setExpandedTafsirAyah(null);
      return;
    }
    setExpandedTafsirAyah(ayahNum);
    if (!tafsirMap[ayahNum]) {
      const tafsir = await QuranService.getAyahTafsir(surahNumber, ayahNum);
      setTafsirMap(prev => ({ ...prev, [ayahNum]: tafsir }));
    }
  };

  useEffect(() => {
    loadSurahContent();
    const settings = StorageService.getSettings();
    const r = VERIFIED_RECITERS.find(x => x.id === settings.selectedReciterId) || VERIFIED_RECITERS[0];
    setReciter(r);

    const saved = StorageService.getSurahReadingPosition(surahNumber);
    setSavedReadingPosition(saved);
    if (saved > 1 && (!initialAyah || initialAyah === 1)) {
      setActiveAyah(saved);
      setResumeNotice(`تم استئناف القراءة تلقائياً من الآية ${saved} (موضعك المحفوظ)`);
    }
  }, [surahNumber]);

  useEffect(() => {
    const unsub = AudioService.subscribe((state) => {
      setSleepTimerState(AudioService.getSleepTimerState());
      setRepeatState(AudioService.getAyahRepeatState());
      if (state?.category === 'quran') {
        if (state.surahNumber === surahNumber) {
          setIsPlaying(state.isPlaying);
          if (state.ayahNumber && state.ayahNumber !== activeAyahRef.current) {
            setActiveAyah(state.ayahNumber);
            const timer = setTimeout(() => {
              const el = document.getElementById(`ayah-${state.ayahNumber}`);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 100);
            return () => clearTimeout(timer);
          }
        } else if (state.surahNumber && state.surahNumber !== surahNumber && state.isPlaying) {
          onSelectAnotherSurah(state.surahNumber);
        }
      }
    });
    return () => unsub();
  }, [surahNumber]);

  useEffect(() => {
    if (!isReadingAutoScroll || isUserInteracting) return;

    const speedMap = { slow: 0.6, medium: 1.2, fast: 2.2 };
    const step = speedMap[autoScrollSpeed];
    let animationFrameId: number;

    const scrollContainer = document.querySelector('main');
    if (!scrollContainer) return;

    const doScroll = () => {
      if (scrollContainer) {
        scrollContainer.scrollTop += step;
        if (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 15) {
          setIsReadingAutoScroll(false);
          return;
        }
      }
      animationFrameId = requestAnimationFrame(doScroll);
    };

    animationFrameId = requestAnimationFrame(doScroll);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isReadingAutoScroll, autoScrollSpeed, isUserInteracting]);

  useEffect(() => {
    if (ayahs.length > 0) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`ayah-${activeAyah}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [ayahs, activeAyah]);

  const handleUserActivity = () => {
    if (!isReadingAutoScroll) return;
    setIsUserInteracting(true);
    if (userInteractionTimeoutRef.current) clearTimeout(userInteractionTimeoutRef.current);
    userInteractionTimeoutRef.current = setTimeout(() => {
      setIsUserInteracting(false);
    }, 2500);
  };

  const loadSurahContent = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    const result = await QuranService.getSurahAyahs(surahNumber);
    if (result.error) {
      setErrorMsg(result.error);
    } else {
      setAyahs(result.ayahs);
    }
    setIsLoading(false);
  };

  const handleSaveReadingSpot = (ayahNum: number) => {
    setActiveAyah(ayahNum);
    setSavedReadingPosition(ayahNum);
    StorageService.saveSurahReadingPosition(surahNumber, ayahNum);
    StorageService.saveLastRead({
      surahNumber,
      surahName: currentSurah.name,
      ayahNumber: ayahNum,
      timestamp: Date.now()
    });
    StorageService.recordAyahRead(surahNumber, 1);
    setResumeNotice(`تم حفظ الآية ${ayahNum} كموضع قراءة دائم لسورة ${currentSurah.name}`);
    setTimeout(() => {
      setResumeNotice(null);
    }, 4000);
  };

  const handlePlayAyah = (ayahNum: number) => {
    setActiveAyah(ayahNum);
    setIsPlaying(true);
    handleSaveReadingSpot(ayahNum);

    AudioService.playQuranContinuous(surahNumber, ayahNum, reciter.id);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      AudioService.pause();
      setIsPlaying(false);
    } else {
      handlePlayAyah(activeAyah);
    }
  };

  const handleBookmark = (ayah: AyahItem) => {
    StorageService.addBookmark({
      surahNumber,
      surahName: currentSurah.name,
      ayahNumber: ayah.numberInSurah,
      ayahText: ayah.text,
      timestamp: Date.now()
    });
    setCopiedAyah(ayah.numberInSurah);
    setTimeout(() => setCopiedAyah(null), 2000);
  };

  const handleCopy = (ayah: AyahItem) => {
    const textToCopy = `﴿${ayah.text}﴾ [سورة ${currentSurah.name}: ${ayah.numberInSurah}]`;
    navigator.clipboard?.writeText(textToCopy);
    setCopiedAyah(ayah.numberInSurah);
    setTimeout(() => setCopiedAyah(null), 2000);
  };

  const handleReciterChange = (newReciter: QuranReciter) => {
    setReciter(newReciter);
    setIsReciterSelectorOpen(false);
    const settings = StorageService.getSettings();
    settings.selectedReciterId = newReciter.id;
    StorageService.saveSettings(settings);

    if (isPlaying) {
      handlePlayAyah(activeAyah);
    }
  };

  const handleCycleTheme = () => {
    const nextTheme = readerTheme === 'night' ? 'sepia' : readerTheme === 'sepia' ? 'oled' : 'night';
    setReaderTheme(nextTheme);
    const s = StorageService.getSettings();
    s.readerTheme = nextTheme;
    StorageService.saveSettings(s);
  };

  const isSepia = readerTheme === 'sepia';
  const isOled = readerTheme === 'oled';

  return (
    <div 
      onTouchStart={handleUserActivity}
      onWheel={handleUserActivity}
      className={`flex-1 flex flex-col px-3.5 pt-3 pb-8 space-y-3.5 max-w-2xl mx-auto w-full max-w-full overflow-x-hidden select-none transition-colors duration-300 ${
        isSepia
          ? 'bg-[#F6EFE2] text-[#2A1C12]'
          : isOled
          ? 'bg-black text-[#F3E5AB]'
          : ''
      }`}
    >
      {/* Top Navigation & Controls */}
      <div className={`flex items-center justify-between gap-2 pb-2.5 border-b ${isSepia ? 'border-[#DFD2BC]' : 'border-[#C8A24A]/25'}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            onClick={onBack}
            className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-medium border shrink-0 transition-all ${
              isSepia
                ? 'text-[#5A4230] border-[#D5C4A8] bg-[#EBE0CE]'
                : 'text-[#E6C66E] border-[#C8A24A]/30 bg-[#14120D] hover:text-white'
            }`}
            aria-label="الرجوع لقائمة السور"
          >
            <ArrowRight size={13} />
            <span>السور</span>
          </button>

          {/* Compact Surah Switcher in Top Bar */}
          <div className={`inline-flex items-center gap-1 h-7 px-2 rounded-lg border min-w-0 ${
            isSepia
              ? 'bg-[#EBE0CE] border-[#D5C4A8] text-[#3B2718]'
              : 'bg-[#14120D] border-[#C8A24A]/30 text-[#F3E5AB]'
          }`}>
            <button
              onClick={() => {
                if (surahNumber > 1) onSelectAnotherSurah(surahNumber - 1);
              }}
              disabled={surahNumber <= 1}
              className="p-0.5 hover:opacity-80 disabled:opacity-30 transition-opacity text-[#E6C66E] shrink-0"
              title="السورة السابقة"
            >
              <ChevronRight size={13} />
            </button>
            <span className="font-quran text-xs sm:text-sm font-bold whitespace-nowrap truncate px-0.5">
              سُورَةُ {currentSurah.name}
            </span>
            <button
              onClick={() => {
                if (surahNumber < 114) onSelectAnotherSurah(surahNumber + 1);
              }}
              disabled={surahNumber >= 114}
              className="p-0.5 hover:opacity-80 disabled:opacity-30 transition-opacity text-[#E6C66E] shrink-0"
              title="السورة التالية"
            >
              <ChevronLeft size={13} />
            </button>
          </div>
        </div>

        {/* Reading Theme Switcher + Font size + Auto-Scroll */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setIsReadingAutoScroll(!isReadingAutoScroll)}
            className={`inline-flex items-center gap-1 h-7 px-2 rounded-lg text-[10px] font-medium border transition-all shrink-0 ${
              isReadingAutoScroll
                ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] border-[#F3E5AB] font-bold shadow-sm'
                : isSepia
                ? 'bg-[#EBE0CE] text-[#5A4230] border-[#D5C4A8]'
                : 'bg-[#14120D] text-[#C4B998] border-[#C8A24A]/25 hover:text-[#E6C66E]'
            }`}
            title="تمرير تلقائي متناسق أثناء القراءة"
          >
            <ChevronsDown size={11} className={isReadingAutoScroll ? 'animate-bounce' : ''} />
            <span>{isReadingAutoScroll ? 'إيقاف' : 'تمرير'}</span>
          </button>

          <button
            onClick={handleCycleTheme}
            className={`inline-flex items-center gap-1 h-7 px-2 rounded-lg text-[10px] font-medium border transition-all shrink-0 ${
              isSepia
                ? 'bg-[#E8D9BF] text-[#4E3522] border-[#C8B28E]'
                : isOled
                ? 'bg-zinc-900 text-[#E6C66E] border-[#C8A24A]/35'
                : 'bg-[#14120D] text-[#C4B998] border-[#C8A24A]/25 hover:text-[#E6C66E]'
            }`}
            title="تبديل وضع القراءة المريح للعين"
          >
            {isSepia ? <Sun size={11} /> : <Moon size={11} />}
            <span>{isSepia ? 'ورقي' : isOled ? 'OLED' : 'ليلي'}</span>
          </button>

          <div className={`inline-flex items-center h-7 px-1 rounded-lg border shrink-0 ${
            isSepia ? 'bg-[#EBE0CE] border-[#D5C4A8]' : 'bg-[#14120D] border-[#C8A24A]/25'
          }`}>
            <button
              onClick={() => setFontSize(s => Math.max(20, s - 2))}
              className={`px-1.5 text-[10px] font-semibold ${isSepia ? 'text-[#5A4230] hover:text-black' : 'text-[#C4B998] hover:text-white'}`}
              title="تصغير الخط"
              aria-label="تصغير الخط"
            >
              A-
            </button>
            <span className="w-[1px] h-3 bg-[#C8A24A]/25" />
            <button
              onClick={() => setFontSize(s => Math.min(38, s + 2))}
              className={`px-1.5 text-[10px] font-bold ${isSepia ? 'text-[#2A1C12]' : 'text-[#E6C66E] hover:text-white'}`}
              title="تكبير الخط"
              aria-label="تكبير الخط"
            >
              A+
            </button>
          </div>
        </div>
      </div>

      {/* Auto-Scroll Speed Selector Row */}
      {isReadingAutoScroll && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#1B170F] border border-[#C8A24A]/45 rounded-xl text-[11px] text-[#E6C66E] animate-slideDown shadow">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#E6C66E] animate-ping" />
            <span>التمرير التلقائي نشط</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#C4B998] text-[10px] ml-1">السرعة:</span>
            {(['slow', 'medium', 'fast'] as const).map((spd) => (
              <button
                key={spd}
                onClick={() => setAutoScrollSpeed(spd)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                  autoScrollSpeed === spd
                    ? 'bg-[#E6C66E] text-[#080705]'
                    : 'bg-[#12100B] text-[#C4B998] hover:text-white'
                }`}
              >
                {spd === 'slow' ? 'بطيء' : spd === 'medium' ? 'عادي' : 'سريع'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resume Reading Notice Banner */}
      {resumeNotice && (
        <div className="bg-[#C8A24A]/15 border border-[#C8A24A]/45 rounded-2xl p-2.5 flex items-center justify-between text-xs text-[#E6C66E] animate-slideDown shadow-lg">
          <div className="flex items-center gap-2 min-w-0">
            <Bookmark size={14} fill="currentColor" className="shrink-0" />
            <span className="font-bold truncate">{resumeNotice}</span>
          </div>
          <button
            onClick={() => setResumeNotice(null)}
            className="text-[#E6C66E]/80 hover:text-white text-xs font-bold px-1.5 shrink-0"
          >
            حسناً
          </button>
        </div>
      )}

      {/* Reader Body - Focused on Comfortable Reading */}
      {isLoading ? (
        <div className="py-20 text-center text-[#C4B998] text-xs flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#E6C66E] border-t-transparent rounded-full animate-spin" />
          <span>جاري تحميل آيات سورة {currentSurah.name}...</span>
        </div>
      ) : errorMsg ? (
        <div className="py-12 text-center text-rose-400 text-xs bg-rose-950/20 p-4 rounded-2xl border border-rose-900">
          <p>{errorMsg}</p>
          <button
            onClick={loadSurahContent}
            className="mt-4 athar-btn-primary px-4 py-1.5 rounded-xl text-xs"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {ayahs.map((ayah) => {
            const isActive = activeAyah === ayah.numberInSurah;
            const isSavedSpot = savedReadingPosition === ayah.numberInSurah;
            return (
              <div
                key={ayah.number}
                id={`ayah-${ayah.numberInSurah}`}
                className={`px-4 pt-4 pb-3 rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isSepia
                    ? isActive
                      ? 'bg-[#E9DAC0] border-[#9E7329] shadow-md ring-1 ring-[#9E7329]/30'
                      : isSavedSpot
                      ? 'bg-[#EDE1CB] border-[#B48A3E]'
                      : 'bg-[#FAF5EB] border-[#DFD2BC] hover:border-[#C5B190]'
                    : isOled
                    ? isActive
                      ? 'bg-zinc-900 border-[#E6C66E]/70 shadow-lg'
                      : 'bg-black border-zinc-800/90'
                    : isActive
                    ? 'bg-gradient-to-b from-[#231D11] to-[#13100A] border-[#E6C66E]/75 shadow-[0_0_22px_rgba(200,162,74,0.18)]'
                    : isSavedSpot
                    ? 'bg-[#19150E] border-[#C8A24A]/50'
                    : 'bg-[#110F0B]/95 border-[#C8A24A]/20 hover:border-[#C8A24A]/45'
                }`}
              >
                {/* Prominent, Comfortable Ayah Text */}
                <p
                  className={`font-quran text-right break-words ${isSepia ? 'text-[#23170E]' : 'text-[#F6E9BA]'}`}
                  style={{ fontSize: `${Math.max(22, fontSize)}px`, lineHeight: `${Math.max(22, fontSize) * 2.0}px` }}
                >
                  {ayah.text}{' '}
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full border text-[11px] font-medium font-mono mx-1.5 align-middle ${
                    isSepia
                      ? 'border-[#8C621E]/60 text-[#7A5214] bg-[#EFE3CE]'
                      : 'border-[#E6C66E]/50 text-[#E6C66E] bg-[#1C1810]'
                  }`}>
                    {ayah.numberInSurah}
                  </span>
                </p>

                {/* Calm, Airy, Well-Spaced Ayah Action Strip */}
                <div className={`mt-3.5 pt-2.5 border-t flex items-center justify-between gap-2 ${
                  isSepia ? 'border-[#DFD2BC]/75 text-[#6E523B]' : 'border-[#C8A24A]/15 text-[#9E9478]'
                }`}>
                  {/* Primary Actions with Harmonious Spacing & Delicate Text */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* 1. Listen Button */}
                    <button
                      onClick={() => handlePlayAyah(ayah.numberInSurah)}
                      className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-lg text-[10px] font-medium tracking-wide whitespace-nowrap transition-all shrink-0 ${
                        isActive && isPlaying
                          ? 'bg-[#E6C66E] text-[#080705] font-semibold shadow-xs'
                          : isSepia
                          ? 'bg-[#EFE5D4] text-[#4E3522] border border-[#D8C6AA] hover:bg-[#E4D6BE]'
                          : 'bg-[#16130D] hover:bg-[#1F1A11] text-[#D8CCA8] hover:text-[#F3E5AB] border border-[#C8A24A]/20'
                      }`}
                    >
                      {isActive && isPlaying ? <Pause size={9} fill="currentColor" /> : <Play size={9} fill="currentColor" />}
                      <span>{isActive && isPlaying ? 'إيقاف' : 'استماع'}</span>
                    </button>

                    {/* 2. Tafsir Button */}
                    <button
                      onClick={() => handleToggleTafsir(ayah.numberInSurah)}
                      className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-lg text-[10px] font-medium tracking-wide whitespace-nowrap transition-all shrink-0 ${
                        expandedTafsirAyah === ayah.numberInSurah
                          ? 'bg-[#C8A24A]/20 text-[#E6C66E] border border-[#E6C66E]/45 font-semibold'
                          : isSepia
                          ? 'bg-[#EFE5D4] text-[#5A4230] border border-[#D8C6AA] hover:bg-[#E4D6BE]'
                          : 'bg-[#16130D] hover:bg-[#1F1A11] text-[#B8AD8E] hover:text-[#F3E5AB] border border-[#C8A24A]/15'
                      }`}
                    >
                      <BookOpen size={9.5} />
                      <span>تفسير</span>
                    </button>

                    {/* 3. Ayah Story Podcast Button */}
                    <button
                      onClick={() => {
                        setActiveAyah(ayah.numberInSurah);
                        AyahPodcastService.openAndPlayEpisode({
                          surahNumber,
                          surahName: currentSurah.name,
                          ayahNumber: ayah.numberInSurah,
                          ayahText: ayah.text,
                          totalAyahsInSurah: currentSurah.numberOfAyahs,
                          openSheet: true,
                        });
                      }}
                      className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-lg text-[10px] font-medium tracking-wide whitespace-nowrap transition-all shrink-0 ${
                        isSepia
                          ? 'bg-[#E5D2AE] text-[#3B2611] border border-[#B89246]/60 hover:bg-[#DEC69A]'
                          : 'bg-[#1C170E] hover:bg-[#261F12] text-[#E6C66E] border border-[#C8A24A]/35'
                      }`}
                      title="استمع لقصة الآية وتدبرها وشرحها الكامل (بودكاست الآية)"
                    >
                      <Headphones size={9.5} className={isSepia ? 'text-[#5A3A18]' : 'text-[#E6C66E]'} />
                      <span>قصة الآية</span>
                    </button>

                    {/* 4. Save Reading Spot Button */}
                    <button
                      onClick={() => handleSaveReadingSpot(ayah.numberInSurah)}
                      className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-lg text-[10px] font-medium tracking-wide whitespace-nowrap transition-all shrink-0 ${
                        isSavedSpot
                          ? 'bg-[#C8A24A]/20 text-[#E6C66E] border border-[#E6C66E]/45 font-semibold'
                          : isSepia
                          ? 'bg-[#EFE5D4] text-[#5A4230] border border-[#D8C6AA] hover:bg-[#E4D6BE]'
                          : 'bg-[#16130D] hover:bg-[#1F1A11] text-[#B8AD8E] hover:text-[#E6C66E] border border-[#C8A24A]/15'
                      }`}
                      title="حفظ موضع القراءة"
                    >
                      <Bookmark size={9.5} fill={isSavedSpot ? 'currentColor' : 'none'} />
                      <span>{isSavedSpot ? 'محفوظ' : 'حفظ'}</span>
                    </button>
                  </div>

                  {/* Secondary Icon Actions with Comfortable Spacing */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setShareCardPayload({
                          category: 'ayah',
                          title: `من سورة ${currentSurah.name}`,
                          mainText: `﴿${ayah.text}﴾`,
                          sourceLabel: `سورة ${currentSurah.name} · الآية ${ayah.numberInSurah}`,
                          subtitleOrTafsir: tafsirMap[ayah.numberInSurah]
                        });
                      }}
                      className={`w-6 h-6 inline-flex items-center justify-center rounded-lg border transition-colors ${
                        isSepia
                          ? 'border-[#D8C6AA]/70 bg-[#EFE5D4]/60 text-[#6E523B] hover:text-[#2A1C12]'
                          : 'border-[#C8A24A]/15 bg-[#16130D]/70 text-[#9E9478] hover:text-[#E6C66E] hover:border-[#C8A24A]/35'
                      }`}
                      title="مشاركة كبطاقة"
                    >
                      <ImageIcon size={11} />
                    </button>
                    <button
                      onClick={() => handleBookmark(ayah)}
                      className={`w-6 h-6 inline-flex items-center justify-center rounded-lg border transition-colors ${
                        isSepia
                          ? 'border-[#D8C6AA]/70 bg-[#EFE5D4]/60 text-[#6E523B] hover:text-[#2A1C12]'
                          : 'border-[#C8A24A]/15 bg-[#16130D]/70 text-[#9E9478] hover:text-[#E6C66E] hover:border-[#C8A24A]/35'
                      }`}
                      title="إضافة للعلامات"
                    >
                      <Bookmark size={11} />
                    </button>
                    <button
                      onClick={() => handleCopy(ayah)}
                      className={`w-6 h-6 inline-flex items-center justify-center rounded-lg border transition-colors ${
                        isSepia
                          ? 'border-[#D8C6AA]/70 bg-[#EFE5D4]/60 text-[#6E523B] hover:text-[#2A1C12]'
                          : 'border-[#C8A24A]/15 bg-[#16130D]/70 text-[#9E9478] hover:text-[#E6C66E] hover:border-[#C8A24A]/35'
                      }`}
                      title="نسخ الآية"
                    >
                      {copiedAyah === ayah.numberInSurah ? (
                        <Check size={11} className="text-[#E6C66E]" />
                      ) : (
                        <Copy size={11} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expandable Tafsir Panel */}
                {expandedTafsirAyah === ayah.numberInSurah && (
                  <div className="mt-3 p-3 bg-[#18150E] border border-[#C8A24A]/35 rounded-xl text-xs space-y-1.5 animate-slideDown text-right">
                    <div className="flex items-center justify-between text-[#E6C66E] font-bold text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <BookOpen size={11} />
                        <span>التفسير الميسر (آية {ayah.numberInSurah}):</span>
                      </span>
                      <span className="text-[10px] text-[#C4B998] font-normal">معتمد</span>
                    </div>
                    <p className="text-[#F3E5AB] text-xs leading-relaxed font-sans pt-0.5">
                      {tafsirMap[ayah.numberInSurah] || 'جاري تحميل التفسير الميسر...'}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Compact Floating Bottom Audio Player Bar */}
      <div className="sticky bottom-2 z-40 bg-[#14120D]/95 border border-[#C8A24A]/50 rounded-2xl px-3 py-2.5 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[10px] text-[#E6C66E] font-bold block">مشغل التلاوة والحفظ</span>
          <h4 className="text-xs font-extrabold text-[#F3E5AB] truncate">
            الآية {activeAyah} · {reciter.nameArabic}
          </h4>
        </div>

        <div className="flex items-center gap-1 shrink-0">
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
                ? 'bg-[#C8A24A]/25 text-[#E6C66E] border-[#E6C66E]/60'
                : 'bg-[#0E0D0A] text-[#C4B998] border-[#C8A24A]/30 hover:text-white'
            }`}
            title="مؤقت النوم"
          >
            <Moon size={11} />
            <span className="tabular-nums">
              {sleepTimerState.stopAtEndOfSurah
                ? 'نهاية السورة'
                : sleepTimerState.remainingSeconds
                ? `${Math.ceil(sleepTimerState.remainingSeconds / 60)}د`
                : 'مؤقت'}
            </span>
          </button>

          <button
            onClick={() => AudioService.cycleAyahRepeatTarget()}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-0.5 transition-all ${
              repeatState.target !== 1
                ? 'bg-[#C8A24A]/25 text-[#E6C66E] border-[#E6C66E]/60'
                : 'bg-[#0E0D0A] text-[#C4B998] border-[#C8A24A]/30 hover:text-white'
            }`}
            title="تكرار الآية للحفظ"
          >
            <Repeat size={11} />
            <span className="tabular-nums">
              {repeatState.target === 0 ? '∞' : `${repeatState.target}×`}
            </span>
          </button>

          <button
            onClick={() => {
              if (activeAyah > 1) handlePlayAyah(activeAyah - 1);
            }}
            disabled={activeAyah <= 1}
            className="p-1 text-[#C4B998] hover:text-white disabled:opacity-30"
            title="الآية السابقة"
          >
            <ChevronRight size={16} />
          </button>

          <button
            onClick={handleTogglePlay}
            className="w-8 h-8 rounded-full bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] flex items-center justify-center hover:brightness-110 transition-all active:scale-95 shadow-md"
            title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
          >
            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="mr-0.5" />}
          </button>

          <button
            onClick={() => {
              if (activeAyah < currentSurah.numberOfAyahs) handlePlayAyah(activeAyah + 1);
            }}
            disabled={activeAyah >= currentSurah.numberOfAyahs}
            className="p-1 text-[#C4B998] hover:text-white disabled:opacity-30"
            title="الآية التالية"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      <ShareCardModal
        isOpen={Boolean(shareCardPayload)}
        onClose={() => setShareCardPayload(null)}
        initialPayload={shareCardPayload}
      />
    </div>
  );
};
