import React, { useState, useEffect } from 'react';
import { SurahMeta, Bookmark, LastRead, LastAudioPosition, QuranKhatmahState } from '../types';
import { QuranService } from '../services/quranService';
import { StorageService } from '../services/storageService';
import { AudioService, ActiveAudioState } from '../services/audioService';
import { VERIFIED_RECITERS, ALL_SURAHS } from '../data/surahsData';
import { RotatingCardBackground } from '../components/RotatingCardBackground';
import { 
  BookOpen, Search, Bookmark as BookmarkIcon, History, 
  ChevronLeft, ChevronRight, Play, Pause, Volume2, Headphones, UserCheck,
  RotateCcw, RotateCw, X, Award, CheckCircle2, Clock, Check, Moon, Repeat, Sparkles
} from 'lucide-react';

interface QuranViewProps {
  onSelectSurah: (surahNumber: number, initialAyah?: number) => void;
}

export const QuranView: React.FC<QuranViewProps> = ({ onSelectSurah }) => {
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [ayahSearchResults, setAyahSearchResults] = useState<{ surahNumber: number; ayahNumber: number; text: string; surahName: string }[]>([]);
  const [isSearchingAyahs, setIsSearchingAyahs] = useState<boolean>(false);
  const [lastRead, setLastRead] = useState<LastRead | null>(null);
  const [lastAudio, setLastAudio] = useState<LastAudioPosition | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [activeTab, setActiveTab] = useState<'surahs' | 'ayah_search' | 'bookmarks' | 'khatmah'>('surahs');
  const [activeAudio, setActiveAudio] = useState<ActiveAudioState | null>(null);
  const [sleepTimerState, setSleepTimerState] = useState(AudioService.getSleepTimerState());
  const [repeatState, setRepeatState] = useState(AudioService.getAyahRepeatState());
  const [khatmah, setKhatmah] = useState<QuranKhatmahState>(StorageService.getQuranKhatmah());
  const [selectedReciterId, setSelectedReciterId] = useState<string>(
    StorageService.getSettings().selectedReciterId || 'alafasy'
  );
  const [selectedSurahForTafsir, setSelectedSurahForTafsir] = useState<SurahMeta | null>(null);

  const reloadData = () => {
    setSurahs(QuranService.getSurahs());
    setLastRead(StorageService.getLastRead());
    setLastAudio(StorageService.getLastAudioPosition());
    setBookmarks(StorageService.getBookmarks());
    setKhatmah(StorageService.getQuranKhatmah());
  };

  useEffect(() => {
    reloadData();

    const unsub = AudioService.subscribe((state) => {
      setActiveAudio(state);
      setSleepTimerState(AudioService.getSleepTimerState());
      setRepeatState(AudioService.getAyahRepeatState());
      if (state?.category === 'quran') {
        setLastAudio(StorageService.getLastAudioPosition());
        setKhatmah(StorageService.getQuranKhatmah());
      }
    });

    const onKhatmahUpdate = (e: any) => {
      setKhatmah(e.detail || StorageService.getQuranKhatmah());
    };
    window.addEventListener('athar_khatmah_updated', onKhatmahUpdate);

    return () => {
      unsub();
      window.removeEventListener('athar_khatmah_updated', onKhatmahUpdate);
    };
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    setSurahs(QuranService.searchSurahs(q));
  };

  const handleRunAyahSearch = async (customQuery?: string) => {
    const q = (customQuery !== undefined ? customQuery : searchQuery).trim();
    if (!q) {
      setAyahSearchResults([]);
      return;
    }
    setIsSearchingAyahs(true);
    const res = await QuranService.searchQuranText(q);
    setAyahSearchResults(res.results || []);
    setIsSearchingAyahs(false);
  };

  /**
   * Plays a surah with automatic seamless transition to the next surah upon completion
   */
  const playSurahWithAutoNext = (surahNumber: number, reciterId?: string) => {
    const meta = surahs.find(s => s.number === surahNumber);
    const name = meta ? meta.name : `السورة ${surahNumber}`;
    const effectiveReciterId = reciterId || selectedReciterId;

    AudioService.playFullSurah(
      surahNumber,
      name,
      effectiveReciterId,
      {
        onEnded: () => {
          if (surahNumber < 114) {
            playSurahWithAutoNext(surahNumber + 1, effectiveReciterId);
          } else {
            AudioService.stop();
          }
        },
        onNext: () => {
          if (surahNumber < 114) {
            playSurahWithAutoNext(surahNumber + 1, effectiveReciterId);
          }
        },
        onPrevious: () => {
          if (surahNumber > 1) {
            playSurahWithAutoNext(surahNumber - 1, effectiveReciterId);
          }
        }
      }
    );
  };

  const playContinuousAyah = (sNum: number, aNum: number, rId: string) => {
    const sMeta = ALL_SURAHS.find(s => s.number === sNum);
    if (!sMeta) return;

    AudioService.playQuranContinuous(sNum, aNum, rId);
    setLastAudio(StorageService.getLastAudioPosition());
  };

  const handleResumeListening = () => {
    if (lastAudio) {
      const reciterId = lastAudio.reciterId || selectedReciterId;
      AudioService.playQuranContinuous(lastAudio.surahNumber, lastAudio.ayahNumber, reciterId);
    } else {
      AudioService.playQuranContinuous(1, 1, selectedReciterId);
    }
    setLastAudio(StorageService.getLastAudioPosition());
  };

  const handleReciterChange = (newReciterId: string) => {
    setSelectedReciterId(newReciterId);
    const s = StorageService.getSettings();
    s.selectedReciterId = newReciterId;
    StorageService.saveSettings(s);

    if (activeAudio?.category === 'quran' && activeAudio.surahNumber) {
      playSurahWithAutoNext(activeAudio.surahNumber, newReciterId);
    }
  };

  const handlePlaySurahDirectly = (e: React.MouseEvent, surah: SurahMeta) => {
    e.stopPropagation();
    if (activeAudio?.category === 'quran' && activeAudio.surahNumber === surah.number) {
      AudioService.togglePlayPause();
    } else {
      playSurahWithAutoNext(surah.number, selectedReciterId);
    }
  };

  const handleStopSurahDirectly = (e: React.MouseEvent) => {
    e.stopPropagation();
    AudioService.stop();
  };

  const handleToggleSurahKhatmah = (surahNum: number) => {
    const updated = StorageService.toggleSurahCompletedInKhatmah(surahNum);
    setKhatmah(updated);
  };

  const handleResetKhatmah = () => {
    if (window.confirm('هل تريد بالتأكيد بدء ختمة قرآنية جديدة؟ سيتم أرشفة الختمة الحالية والبدء من جديد.')) {
      const fresh = StorageService.resetKhatmah();
      setKhatmah(fresh);
    }
  };

  const currentReciter = VERIFIED_RECITERS.find(r => r.id === selectedReciterId) || VERIFIED_RECITERS[0];
  const khatmahPercent = Math.round(((khatmah.completedSurahs?.length || 0) / 114) * 100);

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-24 space-y-4 max-w-lg mx-auto w-full select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2 font-quran">
            <BookOpen size={20} className="text-[#D4AF37]" />
            القرآن الكريم
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5">
            قراءة برسم المصحف العثماني واستماع مباشر لجميع السور مع حفظ موضع التلاوة
          </p>
        </div>
      </div>

      {/* Reciter Selector Bar */}
      <div className="relative overflow-hidden bg-[#121922] border border-slate-800/90 rounded-2xl p-3 shadow-md flex items-center justify-between gap-2">
        <RotatingCardBackground slot="quran" cardOffset={0} intervalMs={26000} opacity={0.28} />
        <div className="relative z-10 flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37]">
            <UserCheck size={16} />
          </div>
          <div>
            <span className="text-[10px] text-slate-300 block font-medium">القارئ للتلاوة الصوتية:</span>
            <span className="text-xs font-bold text-slate-100">
              {currentReciter.nameArabic}
            </span>
          </div>
        </div>

        <select
          value={selectedReciterId}
          onChange={(e) => handleReciterChange(e.target.value)}
          className="relative z-10 bg-[#182330]/95 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-[#D4AF37] font-semibold focus:outline-none focus:border-[#D4AF37]"
        >
          {VERIFIED_RECITERS.map((r) => (
            <option key={r.id} value={r.id} className="bg-[#121820] text-slate-100">
              {r.nameArabic}
            </option>
          ))}
        </select>
      </div>

      {/* Reading & Listening Spot Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Last Read Quick Banner */}
        <button
          onClick={() => onSelectSurah(lastRead ? lastRead.surahNumber : 1, lastRead ? lastRead.ayahNumber : 1)}
          className="relative overflow-hidden w-full bg-gradient-to-r from-[#17212D] to-[#111720] border border-[#D4AF37]/35 rounded-2xl p-3 flex items-center justify-between text-right hover:border-[#D4AF37]/60 transition-all active:scale-[0.99]"
        >
          <RotatingCardBackground slot="quran" cardOffset={1} intervalMs={28000} opacity={0.28} />
          <div className="relative z-10 flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] shrink-0">
              <History size={16} />
            </div>
            <div className="truncate">
              <span className="text-[10px] text-[#D4AF37] font-semibold block">آخر موضع قراءة</span>
              <h3 className="text-xs font-bold text-slate-100 truncate">
                {lastRead
                  ? `سورة ${lastRead.surahName} · الآية ${lastRead.ayahNumber}`
                  : 'سورة الفاتحة · الآية ١ (جاهز للحفظ)'}
              </h3>
            </div>
          </div>
          <ChevronLeft size={16} className="relative z-10 text-slate-300 shrink-0" />
        </button>

        {/* Last Audio Quick Banner (Always visible & ready to record/play) */}
        <button
          onClick={handleResumeListening}
          className="relative overflow-hidden w-full bg-gradient-to-r from-[#12211C] to-[#101915] border border-emerald-500/35 rounded-2xl p-3 flex items-center justify-between text-right hover:border-emerald-500/60 transition-all active:scale-[0.99]"
        >
          <RotatingCardBackground slot="kaaba" cardOffset={1} intervalMs={25000} opacity={0.28} />
          <div className="relative z-10 flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0">
              <Headphones size={16} />
            </div>
            <div className="truncate">
              <span className="text-[10px] text-emerald-400 font-semibold block">آخر موضع استماع للقرآن</span>
              <h3 className="text-xs font-bold text-slate-100 truncate">
                {lastAudio
                  ? `سورة ${lastAudio.surahName} · آية ${lastAudio.ayahNumber}`
                  : 'سورة الفاتحة · آية ١ (جاهز للتسجيل)'}
              </h3>
            </div>
          </div>
          <span className="relative z-10 flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-lg shrink-0">
            <Play size={10} fill="currentColor" />
            <span>{lastAudio ? 'استئناف' : 'ابدأ الآن'}</span>
          </span>
        </button>
      </div>

      {/* Smart Sleep Timer & Ayah Repeat for Memorization Card */}
      <div className="bg-[#121922] border border-slate-800/90 rounded-2xl p-3 shadow-md space-y-3">
        {/* Header with status */}
        <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-indigo-500/15 text-indigo-400">
              <Moon size={15} />
            </div>
            <div>
              <span className="font-bold text-slate-100 text-xs block">مؤقت النوم وتكرار الحفظ</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {sleepTimerState.stopAtEndOfSurah
                  ? 'المؤقت مفعّل: يتوقف عند نهاية السورة الحالية'
                  : sleepTimerState.remainingSeconds
                  ? `المؤقت مفعّل: متبقي ${Math.ceil(sleepTimerState.remainingSeconds / 60)} دقيقة`
                  : repeatState.target !== 1
                  ? `التكرار مفعّل: ${repeatState.target === 0 ? 'تكرار مستمر' : `${repeatState.target} مرات`} للآية`
                  : 'جاهز لضبط وقت الاستماع وتكرار الحفظ'}
              </span>
            </div>
          </div>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          {/* 1. Sleep Timer Controls */}
          <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/60 space-y-1.5">
            <span className="text-[10px] font-bold text-indigo-300 flex items-center gap-1">
              <Moon size={11} />
              <span>مؤقت إيقاف التلاوة:</span>
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {[
                { label: '15د', val: 15 },
                { label: '30د', val: 30 },
                { label: '45د', val: 45 },
                { label: '60د', val: 60 },
                { label: 'نهاية السورة', val: -1 }
              ].map((item) => {
                const isSel =
                  item.val === -1
                    ? sleepTimerState.stopAtEndOfSurah
                    : Boolean(
                        sleepTimerState.remainingSeconds &&
                          Math.abs(sleepTimerState.remainingSeconds - item.val * 60) < 90
                      );
                return (
                  <button
                    key={item.label}
                    onClick={() => AudioService.setSleepTimer(isSel ? null : item.val)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all active:scale-95 ${
                      isSel
                        ? 'bg-indigo-500 text-slate-950 border-indigo-400 shadow-sm'
                        : 'bg-[#182330] text-slate-300 border-slate-700 hover:border-indigo-400/50'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
              {(sleepTimerState.remainingSeconds || sleepTimerState.stopAtEndOfSurah) && (
                <button
                  onClick={() => AudioService.setSleepTimer(null)}
                  className="px-2 py-1 rounded-lg text-[10px] font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  إلغاء
                </button>
              )}
            </div>
          </div>

          {/* 2. Ayah Repeat / Memorization Controls */}
          <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/60 space-y-1.5">
            <span className="text-[10px] font-bold text-emerald-300 flex items-center gap-1">
              <Repeat size={11} />
              <span>تكرار الآية للحفظ (المصحف المعلم):</span>
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {[
                { label: '1× (عادي)', target: 1 },
                { label: '3×', target: 3 },
                { label: '5×', target: 5 },
                { label: '10×', target: 10 },
                { label: '∞ مستمر', target: 0 }
              ].map((item) => {
                const isSel = repeatState.target === item.target;
                return (
                  <button
                    key={item.label}
                    onClick={() => AudioService.setAyahRepeatTarget(item.target)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all active:scale-95 ${
                      isSel
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                        : 'bg-[#182330] text-slate-300 border-slate-700 hover:border-emerald-400/50'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Surahs vs Ayah Search vs Bookmarks vs Khatmah Tracker */}
      <div className="grid grid-cols-4 gap-1 bg-[#121820] p-1 rounded-2xl border border-slate-800 text-[11px]">
        <button
          onClick={() => setActiveTab('surahs')}
          className={`py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'surahs'
              ? 'bg-[#1D2836] text-[#D4AF37] shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          السور ({surahs.length})
        </button>
        <button
          onClick={() => setActiveTab('ayah_search')}
          className={`py-2 rounded-xl font-semibold transition-all flex items-center justify-center gap-1 ${
            activeTab === 'ayah_search'
              ? 'bg-[#1D2836] text-[#D4AF37] shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search size={12} />
          <span>بحث بالآيات</span>
        </button>
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'bookmarks'
              ? 'bg-[#1D2836] text-[#D4AF37] shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          العلامات ({bookmarks.length})
        </button>
        <button
          onClick={() => setActiveTab('khatmah')}
          className={`py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'khatmah'
              ? 'bg-[#1D2836] text-[#D4AF37] shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          الختمة ({khatmahPercent}%)
        </button>
      </div>

      {/* Tab: Full-Text Ayah Search */}
      {activeTab === 'ayah_search' && (
        <div className="space-y-3">
          <div className="bg-[#121820] border border-slate-800 rounded-2xl p-3 space-y-2.5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRunAyahSearch()}
                  placeholder="ابحث بأي كلمة في القرآن (بدون تشكيل)..."
                  className="w-full bg-[#161F2A] border border-slate-700/80 rounded-xl py-2.5 pr-9 pl-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                />
                <Search size={15} className="absolute right-3 top-3 text-slate-400" />
              </div>
              <button
                onClick={() => handleRunAyahSearch()}
                disabled={isSearchingAyahs}
                className="px-4 py-2.5 bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-bold rounded-xl text-xs transition-all active:scale-95 shrink-0"
              >
                {isSearchingAyahs ? 'بحث...' : 'ابحث'}
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
              <span className="text-slate-400">كلمات سريعة:</span>
              {['الرحمن', 'الصبر', 'القلوب', 'الجنة', 'التقوى', 'اليسر', 'الدعاء'].map((kw) => (
                <button
                  key={kw}
                  onClick={() => {
                    setSearchQuery(kw);
                    handleRunAyahSearch(kw);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-[#18222F] hover:bg-[#D4AF37]/20 text-slate-300 hover:text-[#D4AF37] border border-slate-700/70 transition-colors"
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>

          {ayahSearchResults.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs bg-[#121820]/60 rounded-2xl border border-slate-800/60 p-4">
              <Search size={22} className="mx-auto mb-2 text-[#D4AF37]/60" />
              اكتب أي كلمة قرآنية للبحث الفوري في آيات المصحف الشريف مع الاستماع المباشر أو فتح موضعها في السورة.
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>نتائج البحث المطابقة ({ayahSearchResults.length} آية):</span>
              </div>
              {ayahSearchResults.map((item, idx) => (
                <div
                  key={`${item.surahNumber}-${item.ayahNumber}-${idx}`}
                  className="bg-[#121923] border border-slate-800 hover:border-[#D4AF37]/40 rounded-2xl p-3.5 space-y-2.5 transition-all"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37] font-bold">
                      سورة {item.surahName} · الآية {item.ayahNumber}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => playContinuousAyah(item.surahNumber, item.ayahNumber, selectedReciterId)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold text-[11px] flex items-center gap-1"
                      >
                        <Play size={11} fill="currentColor" />
                        <span>استماع</span>
                      </button>
                      <button
                        onClick={() => onSelectSurah(item.surahNumber, item.ayahNumber)}
                        className="px-2.5 py-1 rounded-lg bg-[#1A2533] hover:bg-[#D4AF37] text-slate-200 hover:text-slate-950 font-bold text-[11px] flex items-center gap-1 transition-colors"
                      >
                        <BookOpen size={11} />
                        <span>فتح بالمصحف</span>
                      </button>
                    </div>
                  </div>
                  <p className="font-quran text-base text-slate-100 leading-loose text-right">
                    ﴿{item.text}﴾
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 1: Surahs List */}
      {activeTab === 'surahs' && (
        <div className="space-y-2.5">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="ابحث عن اسم السورة أو رقمها..."
              className="w-full bg-[#121820] border border-slate-800 rounded-2xl py-3 pr-10 pl-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]/60"
            />
            <Search size={16} className="absolute right-3.5 top-3.5 text-slate-500" />
          </div>

          {surahs.map((surah) => {
            const isPlayingThis = activeAudio?.category === 'quran' && activeAudio.surahNumber === surah.number;
            const isCurrentAudioActive = isPlayingThis && activeAudio?.isPlaying;
            const savedPos = StorageService.getSurahReadingPosition(surah.number);
            const isCompletedInKhatmah = khatmah.completedSurahs?.includes(surah.number);

            return (
              <div
                key={surah.number}
                className={`w-full bg-[#121820] border rounded-2xl p-3 flex items-center justify-between text-right transition-all ${
                  isPlayingThis
                    ? 'border-[#D4AF37] bg-gradient-to-r from-[#172330] to-[#121820] shadow-md'
                    : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Right side: Click to open Surah text reader */}
                <div
                  onClick={() => onSelectSurah(surah.number, savedPos > 1 ? savedPos : 1)}
                  className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs tabular-nums border shrink-0 ${
                      isPlayingThis
                        ? 'bg-[#D4AF37] text-slate-950 border-[#D4AF37] shadow-sm'
                        : isCompletedInKhatmah
                        ? 'bg-emerald-950/60 border-emerald-600/60 text-emerald-400'
                        : 'bg-slate-800/50 border-slate-700/50 text-[#D4AF37]'
                    }`}
                  >
                    {isCompletedInKhatmah ? <Check size={14} /> : surah.number}
                  </div>

                  <div className="text-right truncate">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-100 font-quran truncate">
                        سُورَةُ {surah.name}
                      </h3>
                      {savedPos > 1 && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#D4AF37] bg-[#D4AF37]/15 border border-[#D4AF37]/35 px-2 py-0.5 rounded-full font-medium">
                          <BookmarkIcon size={9} fill="currentColor" />
                          <span>آية {savedPos}</span>
                        </span>
                      )}
                      {isPlayingThis && (
                        <span className="flex items-center gap-1 text-[10px] text-[#D4AF37] font-semibold bg-[#D4AF37]/15 px-2 py-0.5 rounded-full">
                          <Volume2 size={12} className={isCurrentAudioActive ? 'animate-pulse' : ''} />
                          <span>{isCurrentAudioActive ? 'تلاوة جارية' : 'متوقف'}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span>{surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}</span>
                      <span>·</span>
                      <span className="tabular-nums">{surah.numberOfAyahs} آيات</span>
                      <span>·</span>
                      <span className="text-slate-500 font-quran">{surah.englishName}</span>
                    </div>
                  </div>
                </div>

                {/* Left side: Listen / Tafsir / Open buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setSelectedSurahForTafsir(surah)}
                    className="flex items-center gap-1 px-2.5 py-2 bg-slate-800/70 hover:bg-cyan-500/15 text-slate-300 hover:text-cyan-300 border border-slate-700/60 hover:border-cyan-500/40 rounded-xl text-xs font-medium transition-all active:scale-95"
                    title="تفسير السورة وبيان مقاصدها"
                    aria-label="تفسير السورة وبيان مقاصدها"
                  >
                    <BookOpen size={12} className="text-cyan-400" />
                    <span>تفسير</span>
                  </button>

                  <button
                    onClick={(e) => handlePlaySurahDirectly(e, surah)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
                      isCurrentAudioActive
                        ? 'bg-[#D4AF37] text-slate-950 shadow-md ring-2 ring-[#D4AF37]/50'
                        : isPlayingThis
                        ? 'bg-[#D4AF37]/25 border border-[#D4AF37] text-[#D4AF37]'
                        : 'bg-[#16212D] hover:bg-[#D4AF37] hover:text-slate-950 text-[#D4AF37] border border-[#D4AF37]/40'
                    }`}
                    title={isCurrentAudioActive ? 'إيقاف مؤقت' : 'استماع مباشر للسورة'}
                    aria-label="استماع مباشر للسورة"
                  >
                    {isCurrentAudioActive ? (
                      <>
                        <Pause size={14} fill="currentColor" />
                        <span>إيقاف</span>
                      </>
                    ) : (
                      <>
                        <Play size={14} fill="currentColor" />
                        <span>استماع</span>
                      </>
                    )}
                  </button>

                  {isPlayingThis && (
                    <button
                      onClick={handleStopSurahDirectly}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors"
                      title="إغلاق التلاوة"
                      aria-label="إغلاق التلاوة"
                    >
                      <X size={14} />
                    </button>
                  )}

                  <button
                    onClick={() => onSelectSurah(surah.number)}
                    className="p-2 text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 rounded-xl transition-colors"
                    title="فتح وقراءة السورة"
                    aria-label="فتح وقراءة السورة"
                  >
                    <ChevronLeft size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Bookmarks */}
      {activeTab === 'bookmarks' && (
        <div className="space-y-2.5">
          {bookmarks.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              <BookmarkIcon size={24} className="mx-auto mb-2 text-slate-600" />
              لم تقم بإضافة أي علامات مرجعية بعد. يمكنك حفظ أي آية أثناء القراءة في المصحف.
            </div>
          ) : (
            bookmarks.map((bm, idx) => (
              <div
                key={idx}
                onClick={() => onSelectSurah(bm.surahNumber, bm.ayahNumber)}
                className="p-3.5 bg-[#121820] border border-slate-800 rounded-2xl cursor-pointer hover:border-[#D4AF37]/40 transition-colors"
              >
                <div className="flex items-center justify-between text-xs text-[#D4AF37] font-semibold mb-1">
                  <span>سورة {bm.surahName} (آية {bm.ayahNumber})</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      StorageService.removeBookmark(bm.surahNumber, bm.ayahNumber);
                      setBookmarks(StorageService.getBookmarks());
                    }}
                    className="text-slate-500 hover:text-rose-400 text-[11px]"
                  >
                    حذف
                  </button>
                </div>
                <p className="font-quran text-sm text-slate-200 line-clamp-2 leading-relaxed">
                  {bm.ayahText}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Khatmah & Progress System */}
      {activeTab === 'khatmah' && (
        <div className="space-y-4 text-xs">
          {/* Main Khatmah Overview Card */}
          <div className="relative overflow-hidden bg-[#121820] border border-[#D4AF37]/40 rounded-3xl p-5 space-y-4 shadow-xl">
            <RotatingCardBackground slot="quran" cardOffset={2} intervalMs={26000} opacity={0.3} />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#D4AF37] font-semibold block">متابعة الختمة القرآنية</span>
                <h3 className="text-base font-bold text-slate-100">
                  الختمة رقم {khatmah.khatmahNumber}
                </h3>
              </div>
              <button
                onClick={handleResetKhatmah}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[11px] font-semibold border border-slate-700 transition-colors"
              >
                بدء ختمة جديدة
              </button>
            </div>

            {/* Large Progress Bar */}
            <div className="relative z-10 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300">السور المنجزة: {khatmah.completedSurahs?.length || 0} من 114</span>
                <span className="text-[#D4AF37] font-bold text-sm tabular-nums">{khatmahPercent}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#D4AF37] to-[#E5C158] h-full transition-all duration-300"
                  style={{ width: `${khatmahPercent}%` }}
                />
              </div>
            </div>

            {/* Daily Reading & Listening Stats */}
            <div className="relative z-10 grid grid-cols-2 gap-2 pt-1">
              <div className="bg-[#182330]/90 p-3 rounded-2xl border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block mb-0.5">تلاوة اليوم</span>
                <div className="text-[#D4AF37] font-bold text-base tabular-nums">
                  {khatmah.totalAyahsReadToday} آية
                </div>
                <span className="text-[9px] text-slate-500 block mt-0.5">
                  الهدف اليومي: {khatmah.dailyGoalAyahs} آية
                </span>
              </div>

              <div className="bg-[#182330]/90 p-3 rounded-2xl border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block mb-0.5">استماع اليوم</span>
                <div className="text-emerald-400 font-bold text-base tabular-nums">
                  {khatmah.todayMinutesListened} دقيقة
                </div>
                <span className="text-[9px] text-slate-500 block mt-0.5">
                  تلاوة خاشعة مستمرة
                </span>
              </div>
            </div>
          </div>

          {/* Checklist of all 114 Surahs for the Khatmah */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-200">قائمة السور لإتمام الختمة (اضغط لتحديد السورة كمنجزة):</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {surahs.map((surah) => {
                const isDone = khatmah.completedSurahs?.includes(surah.number);
                return (
                  <button
                    key={surah.number}
                    onClick={() => handleToggleSurahKhatmah(surah.number)}
                    className={`p-3 rounded-2xl border flex items-center justify-between text-right transition-all ${
                      isDone
                        ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-[#121820] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isDone ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isDone ? <Check size={14} /> : surah.number}
                      </div>
                      <span className="font-quran font-bold text-xs">سورة {surah.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{surah.numberOfAyahs} آيات</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Surah Tafsir & Thematic Overview Modal */}
      {selectedSurahForTafsir && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
          <div className="bg-[#0E141B] border border-slate-800 w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col text-slate-100">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 font-quran">
                    تفسير وبيان سُورَةِ {selectedSurahForTafsir.name}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {selectedSurahForTafsir.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} · {selectedSurahForTafsir.numberOfAyahs} آية · التفسير الميسر المعتمد
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedSurahForTafsir(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4 text-xs">
              {/* Surah Intro & Theme Card */}
              <div className="bg-[#131B24] border border-cyan-500/30 rounded-2xl p-4 space-y-2">
                <span className="text-cyan-400 font-bold block text-xs">
                  مقصود السورة ومحاورها الكبرى:
                </span>
                <p className="text-slate-200 leading-relaxed text-justify text-[11px]">
                  سورة {selectedSurahForTafsir.name} سورة {selectedSurahForTafsir.revelationType === 'Meccan' ? 'مكية شريفة، تركز على ترسيخ العقيدة والتوحيد والإيمان باليوم الآخر وتدبر آيات الله في الكون.' : 'مدنية جليلة، تعنى بالأحكام الشرعية وتنظيم شؤون الأمة وتزكية النفوس والأخلاق الفاضلة.'}
                </p>
              </div>

              {/* Sample Tafsir Note */}
              <div className="bg-[#17212D] border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-[#D4AF37] font-bold">
                  <span>من التفسير الميسر المعتمد:</span>
                  <span className="text-[10px] text-slate-400 font-mono">الآية ١</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px] text-justify">
                  ﴿بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ﴾ أبتدئ قراءتي مستعيناً باسم الله الأعظم، المتصف بصفات الجلال والكمال، الرحمن الذي وسعت رحمته كل شيء، الرحيم بعباده المؤمنين.
                </p>
              </div>

              {/* Reader Action */}
              <button
                onClick={() => {
                  const sNum = selectedSurahForTafsir.number;
                  setSelectedSurahForTafsir(null);
                  onSelectSurah(sNum, 1);
                }}
                className="w-full py-3 bg-gradient-to-r from-[#D4AF37] to-[#B38F24] text-slate-950 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all text-xs"
              >
                <BookOpen size={16} />
                <span>قراءة وتفسير جميع آيات سورة {selectedSurahForTafsir.name} بالمصحف</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
