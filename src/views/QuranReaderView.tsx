import React, { useState, useEffect, useRef } from 'react';
import { ALL_SURAHS, VERIFIED_RECITERS } from '../data/surahsData';
import { AyahItem, QuranReciter } from '../types';
import { QuranService } from '../services/quranService';
import { StorageService } from '../services/storageService';
import { AudioService } from '../services/audioService';
import { 
  ArrowRight, Play, Pause, Bookmark, Share2, Copy, 
  Volume2, Type, ChevronLeft, ChevronRight, Check, ChevronsDown
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
  const userInteractionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeAyahRef = useRef(activeAyah);
  activeAyahRef.current = activeAyah;

  const currentSurah = ALL_SURAHS.find(s => s.number === surahNumber) || ALL_SURAHS[0];

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

  // Sync with AudioService so current recited ayah is always synchronized
  useEffect(() => {
    const unsub = AudioService.subscribe((state) => {
      if (state?.category === 'quran' && state.surahNumber === surahNumber) {
        setIsPlaying(state.isPlaying);
        if (state.ayahNumber && state.ayahNumber !== activeAyahRef.current) {
          setActiveAyah(state.ayahNumber);
          // Smooth auto-scroll to the currently reciting verse
          const timer = setTimeout(() => {
            const el = document.getElementById(`ayah-${state.ayahNumber}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 150);
          return () => clearTimeout(timer);
        }
      }
    });
    return () => unsub();
  }, [surahNumber]);

  // Smooth auto-scroll for reading mode without audio
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

  // Scroll to active or saved ayah after ayahs load or activeAyah updates
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

    StorageService.saveLastAudioPosition({
      surahNumber,
      surahName: currentSurah.name,
      ayahNumber: ayahNum,
      reciterId: reciter.id,
      reciterName: reciter.nameArabic,
      currentTime: 0,
      timestamp: Date.now()
    });

    AudioService.playQuranAyah(
      surahNumber,
      ayahNum,
      currentSurah.name,
      reciter.id,
      {
        onEnded: () => {
          // Continuous recitation: advance to next verse
          const nextAyah = activeAyahRef.current + 1;
          if (nextAyah <= currentSurah.numberOfAyahs) {
            handlePlayAyah(nextAyah);
          } else {
            // Surah finished: if not last surah, move to next
            if (surahNumber < 114) {
              onSelectAnotherSurah(surahNumber + 1);
            } else {
              setIsPlaying(false);
            }
          }
        },
        onPrevious: () => {
          if (activeAyahRef.current > 1) {
            handlePlayAyah(activeAyahRef.current - 1);
          }
        },
        onNext: () => {
          if (activeAyahRef.current < currentSurah.numberOfAyahs) {
            handlePlayAyah(activeAyahRef.current + 1);
          }
        }
      }
    );
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

  return (
    <div 
      onTouchStart={handleUserActivity}
      onWheel={handleUserActivity}
      className="flex-1 flex flex-col px-4 pt-3 pb-8 space-y-4 max-w-2xl mx-auto w-full select-none"
    >
      {/* Top Navigation & Controls */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-slate-300 hover:text-white text-xs p-1"
          aria-label="الرجوع لقائمة السور"
        >
          <ArrowRight size={18} />
          <span>السور</span>
        </button>

        <div className="text-center">
          <h2 className="text-base font-bold text-slate-100 font-quran">
            سُورَةُ {currentSurah.name}
          </h2>
          <span className="text-[10px] text-slate-400">
            {currentSurah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} · {currentSurah.numberOfAyahs} آيات
          </span>
        </div>

        {/* Font size toggle */}
        <div className="flex items-center gap-1 bg-[#141B24] p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setFontSize(s => Math.max(18, s - 2))}
            className="px-2 py-0.5 text-xs text-slate-400 hover:text-white"
            title="تصغير الخط"
            aria-label="تصغير الخط"
          >
            A-
          </button>
          <button
            onClick={() => setFontSize(s => Math.min(34, s + 2))}
            className="px-2 py-0.5 text-xs text-slate-200 hover:text-white font-bold"
            title="تكبير الخط"
            aria-label="تكبير الخط"
          >
            A+
          </button>
        </div>
      </div>

      {/* Reciter Selector Bar + Auto-Scroll Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <button
            onClick={() => setIsReciterSelectorOpen(!isReciterSelectorOpen)}
            className="w-full flex items-center justify-between px-3 py-2 bg-[#121820] border border-slate-800 hover:border-[#D4AF37]/40 rounded-xl text-xs text-slate-300"
          >
            <div className="flex items-center gap-2 truncate">
              <Volume2 size={14} className="text-[#D4AF37] shrink-0" />
              <span className="truncate">القارئ: <strong className="text-slate-100 font-medium">{reciter.nameArabic}</strong></span>
            </div>
            <span className="text-[10px] text-[#D4AF37] shrink-0 mr-1">تغيير</span>
          </button>

          {isReciterSelectorOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 z-40 bg-[#161F2B] border border-slate-700 rounded-xl shadow-2xl p-1 text-xs">
              {VERIFIED_RECITERS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleReciterChange(r)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-right ${
                    reciter.id === r.id ? 'bg-[#D4AF37]/20 text-[#D4AF37] font-bold' : 'text-slate-300 hover:bg-slate-800'
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
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all shrink-0 ${
            isReadingAutoScroll
              ? 'bg-[#D4AF37] text-slate-950 border-[#D4AF37] shadow-md ring-1 ring-[#D4AF37]/40'
              : 'bg-[#121820] text-slate-300 border-slate-800 hover:border-slate-700'
          }`}
          title="تمرير تلقائي متناسق أثناء القراءة"
        >
          <ChevronsDown size={14} className={isReadingAutoScroll ? 'animate-bounce' : ''} />
          <span>{isReadingAutoScroll ? 'إيقاف التمرير' : 'تمرير تلقائي'}</span>
        </button>
      </div>

      {/* Auto-Scroll Speed Selector Row */}
      {isReadingAutoScroll && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#17212D] border border-[#D4AF37]/30 rounded-xl text-[11px] text-[#D4AF37] animate-slideDown shadow">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>التمرير التلقائي نشط (يتوقف مؤقتاً عند اللمس)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[10px] ml-1">السرعة:</span>
            {(['slow', 'medium', 'fast'] as const).map((spd) => (
              <button
                key={spd}
                onClick={() => setAutoScrollSpeed(spd)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                  autoScrollSpeed === spd
                    ? 'bg-[#D4AF37] text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
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
        <div className="bg-[#D4AF37]/15 border border-[#D4AF37]/40 rounded-2xl p-3 flex items-center justify-between text-xs text-[#D4AF37] animate-slideDown shadow-lg">
          <div className="flex items-center gap-2">
            <Bookmark size={15} fill="currentColor" />
            <span className="font-semibold">{resumeNotice}</span>
          </div>
          <button
            onClick={() => setResumeNotice(null)}
            className="text-[#D4AF37]/70 hover:text-[#D4AF37] text-xs font-bold px-1"
          >
            حسناً
          </button>
        </div>
      )}

      {/* Surah Header Card with Bismillah */}
      <div className="bg-gradient-to-b from-[#141B24] to-[#0E1318] border border-slate-800 rounded-3xl p-6 text-center shadow-lg">
        <h1 className="text-2xl font-bold text-[#D4AF37] font-quran">
          سُورَةُ {currentSurah.name}
        </h1>
        {savedReadingPosition > 1 && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-[#D4AF37]/15 border border-[#D4AF37]/30 rounded-full text-xs text-[#D4AF37] font-medium">
            <Bookmark size={12} fill="currentColor" />
            <span>موضع القراءة المحفوظ: الآية {savedReadingPosition}</span>
          </div>
        )}
        {surahNumber !== 9 && (
          <p className="font-quran text-lg text-slate-200 mt-4 tracking-wide">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
        )}
      </div>

      {/* Reader Body */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          <span>جاري تحميل آيات سورة {currentSurah.name}...</span>
        </div>
      ) : errorMsg ? (
        <div className="py-12 text-center text-rose-400 text-xs bg-rose-950/20 p-4 rounded-2xl border border-rose-900">
          <p>{errorMsg}</p>
          <button
            onClick={loadSurahContent}
            className="mt-4 px-4 py-1.5 bg-[#D4AF37] text-slate-950 rounded-xl text-xs font-bold"
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
                  isActive
                    ? 'bg-[#16212D] border-[#D4AF37]/60 shadow-lg ring-1 ring-[#D4AF37]/20'
                    : isSavedSpot
                    ? 'bg-[#131C27] border-[#D4AF37]/40 ring-1 ring-[#D4AF37]/15'
                    : 'bg-[#10151C]/80 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Saved Spot Badge if applicable */}
                {isSavedSpot && (
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#D4AF37] bg-[#D4AF37]/20 border border-[#D4AF37]/40 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                      <Bookmark size={10} fill="currentColor" />
                      <span>موضع القراءة المحفوظ</span>
                    </span>
                    <span className="text-[10px] text-slate-400">يتم الاستئناف منه تلقائياً</span>
                  </div>
                )}

                {/* Ayah Text */}
                <p
                  className="font-quran text-slate-100 leading-loose text-justify"
                  style={{ fontSize: `${fontSize}px`, lineHeight: `${fontSize * 1.8}px` }}
                >
                  {ayah.text}{' '}
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-[#D4AF37]/60 text-[#D4AF37] text-xs font-bold font-mono mx-1 align-middle">
                    {ayah.numberInSurah}
                  </span>
                </p>

                {/* Ayah Action Toolbar */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    {/* Play Button */}
                    <button
                      onClick={() => handlePlayAyah(ayah.numberInSurah)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        isActive && isPlaying
                          ? 'bg-[#D4AF37] text-slate-950 font-bold'
                          : 'bg-slate-800 hover:text-white text-slate-300'
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
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        isSavedSpot
                          ? 'bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/50 font-bold'
                          : 'bg-slate-800/80 hover:bg-[#D4AF37]/15 text-slate-300 hover:text-[#D4AF37]'
                      }`}
                      title="حفظ موضع القراءة عند هذه الآية"
                      aria-label="حفظ موضع القراءة"
                    >
                      <Bookmark size={12} fill={isSavedSpot ? 'currentColor' : 'none'} />
                      <span>{isSavedSpot ? 'موضعك المحفوظ' : 'حفظ الموضع'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleBookmark(ayah)}
                      className="hover:text-[#D4AF37] transition-colors p-1"
                      title="إضافة للعلامات المرجعية"
                      aria-label="حفظ في العلامات"
                    >
                      <Bookmark size={15} />
                    </button>
                    <button
                      onClick={() => handleCopy(ayah)}
                      className="hover:text-[#D4AF37] transition-colors p-1"
                      title="نسخ نص الآية"
                      aria-label="نسخ الآية"
                    >
                      {copiedAyah === ayah.numberInSurah ? (
                        <Check size={15} className="text-emerald-400" />
                      ) : (
                        <Copy size={15} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Audio Player Bar */}
      <div className="sticky bottom-2 z-40 bg-[#141B24]/95 border border-[#D4AF37]/40 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex items-center justify-between">
        <div>
          <span className="text-[10px] text-[#D4AF37] font-semibold block">مشغل التلاوة المستمرة</span>
          <h4 className="text-xs font-bold text-slate-100 truncate">
            الآية {activeAyah} · {reciter.nameArabic}
          </h4>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (activeAyah > 1) handlePlayAyah(activeAyah - 1);
            }}
            disabled={activeAyah <= 1}
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30"
            title="الآية السابقة"
            aria-label="الآية السابقة"
          >
            <ChevronRight size={18} />
          </button>

          <button
            onClick={handleTogglePlay}
            className="w-9 h-9 rounded-full bg-[#D4AF37] text-slate-950 flex items-center justify-center hover:bg-[#E5C158] transition-all active:scale-95 shadow-md"
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
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30"
            title="الآية التالية"
            aria-label="الآية التالية"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
