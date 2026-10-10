import React, { useState, useEffect, useRef } from 'react';
import { ALL_SURAHS, VERIFIED_RECITERS } from '../data/surahsData';
import { AyahItem, QuranReciter } from '../types';
import { QuranService } from '../services/quranService';
import { StorageService } from '../services/storageService';
import { AudioService } from '../services/audioService';
import { ShareCardModal, ShareCardPayload } from '../components/ShareCardModal';
import { LUXURY_IMAGES } from '../data/storiesAndExploreData';
import { 
  ArrowRight, Play, Pause, Bookmark, Copy, 
  Volume2, ChevronLeft, ChevronRight, Check, ChevronsDown, BookOpen,
  Moon, Repeat, Image as ImageIcon, Sun
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
      className={`flex-1 flex flex-col px-4 pt-3 pb-8 space-y-4 max-w-2xl mx-auto w-full select-none transition-colors duration-300 ${
        isSepia
          ? 'bg-[#F6EFE2] text-[#2A1C12]'
          : isOled
          ? 'bg-black text-[#F3E5AB]'
          : ''
      }`}
    >
      {/* Top Navigation & Controls */}
      <div className={`flex items-center justify-between pb-2.5 border-b ${isSepia ? 'border-[#DFD2BC]' : 'border-[#C8A24A]/30'}`}>
        <button
          onClick={onBack}
          className={`flex items-center gap-1 text-xs p-1.5 rounded-xl border ${
            isSepia
              ? 'text-[#5A4230] border-[#D5C4A8] bg-[#EBE0CE] font-bold'
              : 'text-[#E6C66E] border-[#C8A24A]/35 bg-[#14120D] hover:text-white font-bold'
          }`}
          aria-label="الرجوع لقائمة السور"
        >
          <ArrowRight size={16} />
          <span>السور</span>
        </button>

        <div className="text-center">
          <h2 className={`text-base font-bold font-quran ${isSepia ? 'text-[#2A1C12]' : 'text-[#F3E5AB]'}`}>
            سُورَةُ {currentSurah.name}
          </h2>
          <span className={`text-[10px] ${isSepia ? 'text-[#73563F]' : 'text-[#C4B998]'}`}>
            {currentSurah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} · {currentSurah.numberOfAyahs} آيات
          </span>
        </div>

        {/* Reading Theme Switcher + Font size toggle */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCycleTheme}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
              isSepia
                ? 'bg-[#E8D9BF] text-[#4E3522] border-[#C8B28E] shadow-sm'
                : isOled
                ? 'bg-zinc-900 text-[#E6C66E] border-[#C8A24A]/45'
                : 'bg-[#14120D] text-[#E6C66E] border-[#C8A24A]/40 hover:border-[#E6C66E]'
            }`}
            title="تبديل وضع القراءة المريح للعين (ورقي دافئ / ليلي / OLED)"
          >
            {isSepia ? <Sun size={13} /> : <Moon size={13} />}
            <span>{isSepia ? 'ورقي دافئ' : isOled ? 'OLED' : 'ليلي ملكي'}</span>
          </button>

          <div className={`flex items-center gap-1 p-1 rounded-lg border ${
            isSepia ? 'bg-[#EBE0CE] border-[#D5C4A8]' : 'bg-[#14120D] border-[#C8A24A]/35'
          }`}>
            <button
              onClick={() => setFontSize(s => Math.max(18, s - 2))}
              className={`px-2 py-0.5 text-xs ${isSepia ? 'text-[#5A4230] hover:text-black' : 'text-[#C4B998] hover:text-white'}`}
              title="تصغير الخط"
              aria-label="تصغير الخط"
            >
              A-
            </button>
            <button
              onClick={() => setFontSize(s => Math.min(34, s + 2))}
              className={`px-2 py-0.5 text-xs font-bold ${isSepia ? 'text-[#2A1C12]' : 'text-[#E6C66E] hover:text-white'}`}
              title="تكبير الخط"
              aria-label="تكبير الخط"
            >
              A+
            </button>
          </div>
        </div>
      </div>

      {/* Reciter Selector Bar + Auto-Scroll Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <button
            onClick={() => setIsReciterSelectorOpen(!isReciterSelectorOpen)}
            className="w-full flex items-center justify-between px-3 py-2 bg-[#14120D] border border-[#C8A24A]/40 hover:border-[#E6C66E] rounded-xl text-xs text-[#C4B998]"
          >
            <div className="flex items-center gap-2 truncate">
              <Volume2 size={14} className="text-[#E6C66E] shrink-0" />
              <span className="truncate">القارئ: <strong className="text-[#F3E5AB] font-extrabold">{reciter.nameArabic}</strong></span>
            </div>
            <span className="text-[10px] text-[#E6C66E] font-bold shrink-0 mr-1">تغيير</span>
          </button>

          {isReciterSelectorOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 z-40 bg-[#17140D] border border-[#C8A24A]/55 rounded-xl shadow-2xl p-1 text-xs">
              {VERIFIED_RECITERS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleReciterChange(r)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-right ${
                    reciter.id === r.id ? 'bg-[#C8A24A]/25 text-[#E6C66E] font-extrabold' : 'text-[#C4B998] hover:bg-[#221D14]'
                  }`}
                >
                  <span>{r.nameArabic}</span>
                  {reciter.id === r.id && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Auto Scroll Toggle Button */}
        <button
          onClick={() => setIsReadingAutoScroll(!isReadingAutoScroll)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold border transition-all shrink-0 ${
            isReadingAutoScroll
              ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] border-[#F3E5AB] shadow-md'
              : 'bg-[#14120D] text-[#E6C66E] border-[#C8A24A]/40 hover:border-[#E6C66E]'
          }`}
          title="تمرير تلقائي متناسق أثناء القراءة"
        >
          <ChevronsDown size={14} className={isReadingAutoScroll ? 'animate-bounce' : ''} />
          <span>{isReadingAutoScroll ? 'إيقاف التمرير' : 'تمرير تلقائي'}</span>
        </button>
      </div>

      {/* Auto-Scroll Speed Selector Row */}
      {isReadingAutoScroll && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#1B170F] border border-[#C8A24A]/45 rounded-xl text-[11px] text-[#E6C66E] animate-slideDown shadow">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#E6C66E] animate-ping" />
            <span>التمرير التلقائي نشط (يتوقف مؤقتاً عند اللمس)</span>
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
        <div className="bg-[#C8A24A]/15 border border-[#C8A24A]/45 rounded-2xl p-3 flex items-center justify-between text-xs text-[#E6C66E] animate-slideDown shadow-lg">
          <div className="flex items-center gap-2">
            <Bookmark size={15} fill="currentColor" />
            <span className="font-bold">{resumeNotice}</span>
          </div>
          <button
            onClick={() => setResumeNotice(null)}
            className="text-[#E6C66E]/80 hover:text-white text-xs font-bold px-1"
          >
            حسناً
          </button>
        </div>
      )}

      {/* Luxury Surah Header Card with Golden Mushaf Emblem & Surah Switcher */}
      <div className={`border rounded-3xl p-5 text-center shadow-2xl relative overflow-hidden ${
        isSepia
          ? 'bg-gradient-to-b from-[#EFE4CF] to-[#E6D7BC] border-[#C9B38E]'
          : isOled
          ? 'bg-zinc-950 border-[#C8A24A]/50'
          : 'bg-gradient-to-b from-[#17140D] via-[#100E0A] to-[#080705] border-[#C8A24A]/55'
      }`}>
        {/* Top Golden Mushaf Cover Miniature */}
        <div className="mx-auto w-24 h-28 rounded-2xl overflow-hidden border-2 border-[#E6C66E]/65 shadow-[0_0_25px_rgba(200,162,74,0.3)] mb-3">
          <img
            src={LUXURY_IMAGES.goldenMushafCover}
            alt="القرآن الكريم"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Quick Surah Selector Pill (< سورة الفاتحة >) */}
        <div className="inline-flex items-center justify-between gap-4 px-4 py-1.5 rounded-full bg-[#1C1810] border border-[#C8A24A]/55 text-[#E6C66E] shadow-inner">
          <button
            onClick={() => {
              if (surahNumber > 1) onSelectAnotherSurah(surahNumber - 1);
            }}
            disabled={surahNumber <= 1}
            className="p-1 hover:text-white disabled:opacity-30 transition-colors"
            title="السورة السابقة"
          >
            <ChevronRight size={16} />
          </button>

          <h1 className="text-xl font-bold font-quran text-[#F3E5AB] px-2">
            سُورَةُ {currentSurah.name}
          </h1>

          <button
            onClick={() => {
              if (surahNumber < 114) onSelectAnotherSurah(surahNumber + 1);
            }}
            disabled={surahNumber >= 114}
            className="p-1 hover:text-white disabled:opacity-30 transition-colors"
            title="السورة التالية"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {savedReadingPosition > 1 && (
          <div className="mt-2.5 flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#C8A24A]/15 border border-[#C8A24A]/40 rounded-full text-xs text-[#E6C66E] font-bold">
              <Bookmark size={12} fill="currentColor" />
              <span>موضع القراءة المحفوظ: الآية {savedReadingPosition}</span>
            </span>
          </div>
        )}
        {surahNumber !== 9 && (
          <p className={`font-quran text-xl mt-3.5 tracking-wide ${isSepia ? 'text-[#2A1C12]' : 'text-[#F3E5AB]'}`}>
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
        )}
      </div>

      {/* Reader Body */}
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
                className={`p-4 rounded-2xl border transition-all duration-200 ${
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
                    ? 'bg-gradient-to-b from-[#231D11] to-[#13100A] border-[#E6C66E]/80 shadow-[0_0_25px_rgba(200,162,74,0.25)] ring-1 ring-[#E6C66E]/30'
                    : isSavedSpot
                    ? 'bg-[#19150E] border-[#C8A24A]/55 ring-1 ring-[#C8A24A]/20'
                    : 'bg-[#12100B]/95 border-[#C8A24A]/30 hover:border-[#C8A24A]/60'
                }`}
              >
                {/* Saved Spot Badge if applicable */}
                {isSavedSpot && (
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#E6C66E] bg-[#C8A24A]/20 border border-[#C8A24A]/45 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                      <Bookmark size={10} fill="currentColor" />
                      <span>موضع القراءة المحفوظ</span>
                    </span>
                    <span className={`text-[10px] ${isSepia ? 'text-[#6E523B]' : 'text-[#C4B998]'}`}>يتم الاستئناف منه تلقائياً</span>
                  </div>
                )}

                {/* Ayah Text */}
                <p
                  className={`font-quran leading-loose text-justify ${isSepia ? 'text-[#23170E]' : 'text-[#F3E5AB]'}`}
                  style={{ fontSize: `${fontSize}px`, lineHeight: `${fontSize * 1.85}px` }}
                >
                  {ayah.text}{' '}
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full border text-xs font-bold font-mono mx-1 align-middle ${
                    isSepia
                      ? 'border-[#8C621E] text-[#7A5214] bg-[#EFE3CE]'
                      : 'border-[#E6C66E]/70 text-[#E6C66E] bg-[#1C1810]'
                  }`}>
                    {ayah.numberInSurah}
                  </span>
                </p>

                {/* Ayah Action Toolbar */}
                <div className="mt-3 pt-2.5 border-t border-[#C8A24A]/25 flex items-center justify-between text-xs text-[#C4B998]">
                  <div className="flex items-center gap-1.5">
                    {/* Play Button */}
                    <button
                      onClick={() => handlePlayAyah(ayah.numberInSurah)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold transition-colors ${
                        isActive && isPlaying
                          ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705]'
                          : 'bg-[#1C1810] hover:bg-[#282216] text-[#E6C66E] border border-[#C8A24A]/35'
                      }`}
                    >
                      {isActive && isPlaying ? (
                        <>
                          <Pause size={12} fill="currentColor" />
                          <span>إيقاف</span>
                        </>
                      ) : (
                        <>
                          <Play size={12} fill="currentColor" />
                          <span>استماع</span>
                        </>
                      )}
                    </button>

                    {/* Bookmark Reading Spot Button */}
                    <button
                      onClick={() => handleSaveReadingSpot(ayah.numberInSurah)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        isSavedSpot
                          ? 'bg-[#C8A24A]/25 text-[#E6C66E] border border-[#E6C66E]/60'
                          : 'bg-[#1C1810] hover:bg-[#C8A24A]/20 text-[#C4B998] hover:text-[#E6C66E] border border-[#C8A24A]/25'
                      }`}
                      title="حفظ موضع القراءة عند هذه الآية"
                      aria-label="حفظ موضع القراءة"
                    >
                      <Bookmark size={12} fill={isSavedSpot ? 'currentColor' : 'none'} />
                      <span>{isSavedSpot ? 'موضعك المحفوظ' : 'حفظ الموضع'}</span>
                    </button>

                    {/* Tafsir Button */}
                    <button
                      onClick={() => handleToggleTafsir(ayah.numberInSurah)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        expandedTafsirAyah === ayah.numberInSurah
                          ? 'bg-[#C8A24A]/25 text-[#F3E5AB] border border-[#E6C66E]/60'
                          : 'bg-[#1C1810] hover:bg-[#C8A24A]/20 text-[#C4B998] hover:text-[#F3E5AB] border border-[#C8A24A]/25'
                      }`}
                      title="عرض التفسير الميسر المعتمد لهذه الآية"
                      aria-label="عرض التفسير الميسر"
                    >
                      <BookOpen size={12} />
                      <span>{expandedTafsirAyah === ayah.numberInSurah ? 'إخفاء التفسير' : 'التفسير'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
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
                      className="hover:text-[#E6C66E] transition-colors p-1 flex items-center gap-1 text-[11px]"
                      title="تصميم ومشاركة الآية كبطاقة مصورة"
                      aria-label="مشاركة كبطاقة مصورة"
                    >
                      <ImageIcon size={15} />
                    </button>
                    <button
                      onClick={() => handleBookmark(ayah)}
                      className="hover:text-[#E6C66E] transition-colors p-1"
                      title="إضافة للعلامات المرجعية"
                      aria-label="حفظ في العلامات"
                    >
                      <Bookmark size={15} />
                    </button>
                    <button
                      onClick={() => handleCopy(ayah)}
                      className="hover:text-[#E6C66E] transition-colors p-1"
                      title="نسخ نص الآية"
                      aria-label="نسخ الآية"
                    >
                      {copiedAyah === ayah.numberInSurah ? (
                        <Check size={15} className="text-[#E6C66E]" />
                      ) : (
                        <Copy size={15} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expandable Tafsir Panel */}
                {expandedTafsirAyah === ayah.numberInSurah && (
                  <div className="mt-3 p-3.5 bg-[#1B170F] border border-[#C8A24A]/45 rounded-xl text-xs space-y-1.5 animate-slideDown shadow-inner text-right">
                    <div className="flex items-center justify-between text-[#E6C66E] font-extrabold text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <BookOpen size={12} />
                        <span>التفسير الميسر (آية {ayah.numberInSurah}):</span>
                      </span>
                      <span className="text-[10px] text-[#C4B998] font-normal">معتمد</span>
                    </div>
                    <p className="text-[#F3E5AB] text-xs leading-relaxed font-sans pt-1">
                      {tafsirMap[ayah.numberInSurah] || 'جاري تحميل التفسير الميسر...'}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Audio Player Bar with Ayah Repeat & Smart Sleep Timer */}
      <div className="sticky bottom-2 z-40 bg-[#17140D]/95 border border-[#C8A24A]/55 rounded-2xl p-3 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[10px] text-[#E6C66E] font-bold block">مشغل التلاوة والحفظ</span>
          <h4 className="text-xs font-extrabold text-[#F3E5AB] truncate">
            الآية {activeAyah} · {reciter.nameArabic}
          </h4>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Sleep Timer Quick Cycle */}
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
                : 'bg-[#12100B] text-[#C4B998] border-[#C8A24A]/30 hover:text-white'
            }`}
            title="مؤقت النوم الذكي مع خفض تدريجي للصوت"
          >
            <Moon size={12} />
            <span className="tabular-nums">
              {sleepTimerState.stopAtEndOfSurah
                ? 'نهاية السورة'
                : sleepTimerState.remainingSeconds
                ? `${Math.ceil(sleepTimerState.remainingSeconds / 60)}د`
                : 'مؤقت'}
            </span>
          </button>

          {/* Ayah Repeat Quick Cycle */}
          <button
            onClick={() => AudioService.cycleAyahRepeatTarget()}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-0.5 transition-all ${
              repeatState.target !== 1
                ? 'bg-[#C8A24A]/25 text-[#E6C66E] border-[#E6C66E]/60'
                : 'bg-[#12100B] text-[#C4B998] border-[#C8A24A]/30 hover:text-white'
            }`}
            title="تكرار الآية للحفظ (1× / 3× / 5× / 10× / ∞)"
          >
            <Repeat size={12} />
            <span className="tabular-nums">
              {repeatState.target === 0 ? '∞' : `${repeatState.target}×`}
            </span>
          </button>

          <button
            onClick={() => {
              if (activeAyah > 1) handlePlayAyah(activeAyah - 1);
            }}
            disabled={activeAyah <= 1}
            className="p-1.5 text-[#C4B998] hover:text-white disabled:opacity-30"
            title="الآية السابقة"
            aria-label="الآية السابقة"
          >
            <ChevronRight size={18} />
          </button>

          <button
            onClick={handleTogglePlay}
            className="w-9 h-9 rounded-full bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] flex items-center justify-center hover:brightness-110 transition-all active:scale-95 shadow-md"
            title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="mr-0.5" />}
          </button>

          <button
            onClick={() => {
              if (activeAyah < currentSurah.numberOfAyahs) handlePlayAyah(activeAyah + 1);
            }}
            disabled={activeAyah >= currentSurah.numberOfAyahs}
            className="p-1.5 text-[#C4B998] hover:text-white disabled:opacity-30"
            title="الآية التالية"
            aria-label="الآية التالية"
          >
            <ChevronLeft size={18} />
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
