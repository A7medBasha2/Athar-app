import React, { useState, useEffect } from 'react';
import { SurahMeta, Bookmark, LastRead, LastAudioPosition, QuranKhatmahState } from '../types';
import { QuranService } from '../services/quranService';
import { StorageService } from '../services/storageService';
import { AudioService, ActiveAudioState } from '../services/audioService';
import { VERIFIED_RECITERS, ALL_SURAHS } from '../data/surahsData';
import { LUXURY_IMAGES } from '../data/storiesAndExploreData';
import { RotatingCardBackground } from '../components/RotatingCardBackground';
import { 
  BookOpen, Search, Bookmark as BookmarkIcon, History, 
  ChevronLeft, Play, Pause, Volume2, Headphones, UserCheck,
  X, Check, Moon, Repeat
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
    const fresh = StorageService.resetKhatmah();
    setKhatmah(fresh);
  };

  const currentReciter = VERIFIED_RECITERS.find(r => r.id === selectedReciterId) || VERIFIED_RECITERS[0];
  const khatmahPercent = Math.round(((khatmah.completedSurahs?.length || 0) / 114) * 100);

  return (
    <div className="athar-page-container">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#C8A24A]/25">
        <div className="flex items-center gap-2">
          <BookOpen size={20} className="text-[#E6C66E]" />
          <h1 className="text-lg font-extrabold text-white tracking-wide">
            القرآن الكريم
          </h1>
        </div>
        <span className="text-xs font-bold text-[#E6C66E]">
          المصحف الشريف المذهب
        </span>
      </div>

      {/* Luxury Golden Mushaf Cover Showcase Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-[#C8A24A]/50 bg-gradient-to-b from-[#17140D] to-[#0A0907] p-4 flex items-center justify-between gap-4 shadow-[0_12px_35px_rgba(0,0,0,0.92)]">
        <div className="flex-1 text-right space-y-1.5">
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#C8A24A]/20 border border-[#C8A24A]/45 text-[10px] font-extrabold text-[#E6C66E]">
            المصحف العثماني الكامل
          </span>
          <h2 className="font-quran text-2xl font-bold text-[#F3E5AB]">
            ﴿إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ﴾
          </h2>
          <p className="text-xs text-[#C4B998] leading-relaxed">
            تلاوة متواصلة وتفسير ميسر لجميع سور القرآن الكريم (114 سورة)
          </p>
          <div className="pt-1 flex items-center gap-2">
            <button
              onClick={() => onSelectSurah(lastRead ? lastRead.surahNumber : 1, lastRead ? lastRead.ayahNumber : 1)}
              className="athar-btn-primary text-xs py-1.5 px-3.5"
            >
              فتح المصحف المذهب
            </button>
          </div>
        </div>

        <div className="relative w-24 h-32 rounded-2xl overflow-hidden border-2 border-[#E6C66E]/60 shadow-[0_0_25px_rgba(200,162,74,0.3)] shrink-0">
          <img
            src={LUXURY_IMAGES.goldenMushafCover}
            alt="غلاف المصحف الذهبي"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Reciter Selector Bar */}
      <div className="athar-card flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#1F1B12] border border-[#C8A24A]/40 text-[#E6C66E]">
            <UserCheck size={16} />
          </div>
          <div>
            <span className="text-[10px] text-[#C4B998] block font-bold">القارئ للتلاوة الصوتية:</span>
            <span className="text-xs font-extrabold text-white">
              {currentReciter.nameArabic}
            </span>
          </div>
        </div>

        <select
          value={selectedReciterId}
          onChange={(e) => handleReciterChange(e.target.value)}
          className="bg-[#161410] border border-[#C8A24A]/45 rounded-xl px-2.5 py-1.5 text-xs text-[#E6C66E] font-bold focus:outline-none focus:border-[#E6C66E]"
        >
          {VERIFIED_RECITERS.map((r) => (
            <option key={r.id} value={r.id} className="bg-[#0E0D0A] text-white">
              {r.nameArabic}
            </option>
          ))}
        </select>
      </div>

      {/* Reading & Listening Spot Banners */}
      <div className="flex flex-col gap-2">
        {/* Last Read Quick Banner */}
        <button
          onClick={() => onSelectSurah(lastRead ? lastRead.surahNumber : 1, lastRead ? lastRead.ayahNumber : 1)}
          className="relative overflow-hidden w-full bg-gradient-to-r from-[#1A160E] to-[#0E0D0A] border border-[#C8A24A]/45 rounded-2xl p-3 flex items-center justify-between text-right hover:border-[#E6C66E]/75 transition-all active:scale-[0.99]"
        >
          <RotatingCardBackground slot="quran" cardOffset={1} intervalMs={28000} opacity={0.2} />
          <div className="relative z-10 flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-[#C8A24A]/20 border border-[#C8A24A]/40 text-[#E6C66E] shrink-0">
              <History size={16} />
            </div>
            <div className="truncate">
              <span className="text-[10px] text-[#E6C66E] font-bold block">آخر موضع قراءة</span>
              <h3 className="text-xs font-extrabold text-[#F3E5AB] truncate">
                {lastRead
                  ? `سورة ${lastRead.surahName} · الآية ${lastRead.ayahNumber}`
                  : 'سورة الفاتحة · الآية ١ (جاهز للحفظ)'}
              </h3>
            </div>
          </div>
          <ChevronLeft size={16} className="relative z-10 text-[#E6C66E] shrink-0" />
        </button>

        {/* Last Audio Quick Banner */}
        <button
          onClick={handleResumeListening}
          className="relative overflow-hidden w-full bg-gradient-to-r from-[#1A160E] to-[#0E0D0A] border border-[#C8A24A]/45 rounded-2xl p-3 flex items-center justify-between text-right hover:border-[#E6C66E]/75 transition-all active:scale-[0.99]"
        >
          <RotatingCardBackground slot="kaaba" cardOffset={1} intervalMs={25000} opacity={0.2} />
          <div className="relative z-10 flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-[#C8A24A]/20 border border-[#C8A24A]/40 text-[#E6C66E] shrink-0">
              <Headphones size={16} />
            </div>
            <div className="truncate">
              <span className="text-[10px] text-[#E6C66E] font-bold block">آخر موضع استماع للقرآن</span>
              <h3 className="text-xs font-extrabold text-[#F3E5AB] truncate">
                {lastAudio
                  ? `سورة ${lastAudio.surahName} · آية ${lastAudio.ayahNumber}`
                  : 'سورة الفاتحة · آية ١ (جاهز للتسجيل)'}
              </h3>
            </div>
          </div>
          <span className="relative z-10 flex items-center gap-1 text-[11px] font-extrabold text-[#080705] bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] px-2.5 py-1 rounded-lg shrink-0 shadow">
            <Play size={10} fill="currentColor" />
            <span>{lastAudio ? 'استئناف' : 'ابدأ الآن'}</span>
          </span>
        </button>
      </div>

      {/* Smart Sleep Timer & Ayah Repeat for Memorization Card */}
      <div className="athar-card space-y-3">
        {/* Header with status */}
        <div className="flex items-center justify-between text-xs pb-2 border-b border-[#C8A24A]/25">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-[#C8A24A]/20 border border-[#C8A24A]/40 text-[#E6C66E]">
              <Moon size={15} />
            </div>
            <div>
              <span className="font-extrabold text-[#F3E5AB] text-xs block">مؤقت النوم وتكرار الحفظ</span>
              <span className="text-[10px] text-[#C4B998] block mt-0.5">
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
          <div className="bg-[#14120D] p-2.5 rounded-xl border border-[#C8A24A]/30 space-y-1.5">
            <span className="text-[10px] font-bold text-[#E6C66E] flex items-center gap-1">
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
                    className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border transition-all active:scale-95 ${
                      isSel
                        ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] border-[#F3E5AB] shadow-sm'
                        : 'bg-[#0A0907] text-[#C4B998] border-[#C8A24A]/30 hover:border-[#E6C66E]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
              {(sleepTimerState.remainingSeconds || sleepTimerState.stopAtEndOfSurah) && (
                <button
                  onClick={() => AudioService.setSleepTimer(null)}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  إلغاء
                </button>
              )}
            </div>
          </div>

          {/* 2. Ayah Repeat / Memorization Controls */}
          <div className="bg-[#14120D] p-2.5 rounded-xl border border-[#C8A24A]/30 space-y-1.5">
            <span className="text-[10px] font-bold text-[#E6C66E] flex items-center gap-1">
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
                    className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border transition-all active:scale-95 ${
                      isSel
                        ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] border-[#F3E5AB] shadow-sm'
                        : 'bg-[#0A0907] text-[#C4B998] border-[#C8A24A]/30 hover:border-[#E6C66E]'
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
      <div className="grid grid-cols-4 gap-1 bg-[#14120D] p-1 rounded-2xl border border-[#C8A24A]/35 text-[11px]">
        <button
          onClick={() => setActiveTab('surahs')}
          className={`py-2 rounded-xl font-extrabold transition-all ${
            activeTab === 'surahs'
              ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] shadow-sm'
              : 'text-[#C4B998] hover:text-white'
          }`}
        >
          السور ({surahs.length})
        </button>
        <button
          onClick={() => setActiveTab('ayah_search')}
          className={`py-2 rounded-xl font-extrabold transition-all flex items-center justify-center gap-1 ${
            activeTab === 'ayah_search'
              ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] shadow-sm'
              : 'text-[#C4B998] hover:text-white'
          }`}
        >
          <Search size={12} />
          <span>بحث بالآيات</span>
        </button>
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`py-2 rounded-xl font-extrabold transition-all ${
            activeTab === 'bookmarks'
              ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] shadow-sm'
              : 'text-[#C4B998] hover:text-white'
          }`}
        >
          العلامات ({bookmarks.length})
        </button>
        <button
          onClick={() => setActiveTab('khatmah')}
          className={`py-2 rounded-xl font-extrabold transition-all ${
            activeTab === 'khatmah'
              ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] shadow-sm'
              : 'text-[#C4B998] hover:text-white'
          }`}
        >
          الختمة ({khatmahPercent}%)
        </button>
      </div>

      {/* Tab: Full-Text Ayah Search */}
      {activeTab === 'ayah_search' && (
        <div className="space-y-3">
          <div className="athar-card space-y-2.5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRunAyahSearch()}
                  placeholder="ابحث بأي كلمة في القرآن (بدون تشكيل)..."
                  className="w-full bg-[#161410] border border-[#C8A24A]/40 rounded-xl py-2.5 pr-9 pl-3 text-xs text-white placeholder-[#8E8268] focus:outline-none focus:border-[#E6C66E]"
                />
                <Search size={15} className="absolute right-3 top-3 text-[#E6C66E]" />
              </div>
              <button
                onClick={() => handleRunAyahSearch()}
                disabled={isSearchingAyahs}
                className="athar-btn-primary px-4 py-2.5 rounded-xl text-xs shrink-0"
              >
                {isSearchingAyahs ? 'بحث...' : 'ابحث'}
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
              <span className="text-[#C4B998]">كلمات سريعة:</span>
              {['الرحمن', 'الصبر', 'القلوب', 'الجنة', 'التقوى', 'اليسر', 'الدعاء'].map((kw) => (
                <button
                  key={kw}
                  onClick={() => {
                    setSearchQuery(kw);
                    handleRunAyahSearch(kw);
                  }}
                  className="px-2.5 py-0.5 rounded-lg bg-[#18150E] hover:bg-[#C8A24A]/25 text-[#F3E5AB] border border-[#C8A24A]/35 transition-colors font-bold"
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>

          {ayahSearchResults.length === 0 ? (
            <div className="text-center py-10 text-[#C4B998] text-xs bg-[#14120D] rounded-2xl border border-[#C8A24A]/30 p-4">
              <Search size={22} className="mx-auto mb-2 text-[#E6C66E]/70" />
              اكتب أي كلمة قرآنية للبحث الفوري في آيات المصحف الشريف مع الاستماع المباشر أو فتح موضعها في السورة.
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-[#C4B998] px-1">
                <span>نتائج البحث المطابقة ({ayahSearchResults.length} آية):</span>
              </div>
              {ayahSearchResults.map((item, idx) => (
                <div
                  key={`${item.surahNumber}-${item.ayahNumber}-${idx}`}
                  className="bg-[#14120D] border border-[#C8A24A]/35 hover:border-[#E6C66E]/70 rounded-2xl p-3.5 space-y-2.5 transition-all"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#C8A24A]/20 text-[#E6C66E] border border-[#C8A24A]/40 font-bold">
                      سورة {item.surahName} · الآية {item.ayahNumber}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => playContinuousAyah(item.surahNumber, item.ayahNumber, selectedReciterId)}
                        className="px-2.5 py-1 rounded-lg bg-[#1F1A10] hover:bg-[#292215] text-[#E6C66E] border border-[#C8A24A]/45 font-bold text-[11px] flex items-center gap-1"
                      >
                        <Play size={11} fill="currentColor" />
                        <span>استماع</span>
                      </button>
                      <button
                        onClick={() => onSelectSurah(item.surahNumber, item.ayahNumber)}
                        className="athar-btn-primary px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1"
                      >
                        <BookOpen size={11} />
                        <span>فتح بالمصحف</span>
                      </button>
                    </div>
                  </div>
                  <p className="font-quran text-base text-[#F3E5AB] leading-loose text-right">
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
              className="w-full bg-[#14120D] border border-[#C8A24A]/40 rounded-2xl py-3 pr-10 pl-4 text-xs text-white placeholder-[#8E8268] focus:outline-none focus:border-[#E6C66E]"
            />
            <Search size={16} className="absolute right-3.5 top-3.5 text-[#E6C66E]" />
          </div>

          {surahs.map((surah) => {
            const isPlayingThis = activeAudio?.category === 'quran' && activeAudio.surahNumber === surah.number;
            const isCurrentAudioActive = isPlayingThis && activeAudio?.isPlaying;
            const savedPos = StorageService.getSurahReadingPosition(surah.number);
            const isCompletedInKhatmah = khatmah.completedSurahs?.includes(surah.number);

            return (
              <div
                key={surah.number}
                className={`w-full border rounded-2xl p-3 flex items-center justify-between text-right transition-all ${
                  isPlayingThis
                    ? 'border-[#E6C66E] bg-gradient-to-r from-[#231D11] to-[#12100B] shadow-[0_0_20px_rgba(200,162,74,0.2)]'
                    : 'bg-[#12100B] border-[#C8A24A]/30 hover:border-[#C8A24A]/65'
                }`}
              >
                {/* Right side: Click to open Surah text reader */}
                <div
                  onClick={() => onSelectSurah(surah.number, savedPos > 1 ? savedPos : 1)}
                  className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs tabular-nums border shrink-0 ${
                      isPlayingThis
                        ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] border-[#F3E5AB] shadow-sm'
                        : isCompletedInKhatmah
                        ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#F3E5AB]'
                        : 'bg-[#1A160E] border-[#C8A24A]/40 text-[#E6C66E]'
                    }`}
                  >
                    {isCompletedInKhatmah ? <Check size={14} /> : surah.number}
                  </div>

                  <div className="text-right truncate">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-[#F3E5AB] font-quran truncate">
                        سُورَةُ {surah.name}
                      </h3>
                      {savedPos > 1 && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#E6C66E] bg-[#C8A24A]/15 border border-[#C8A24A]/40 px-2 py-0.5 rounded-full font-bold">
                          <BookmarkIcon size={9} fill="currentColor" />
                          <span>آية {savedPos}</span>
                        </span>
                      )}
                      {isPlayingThis && (
                        <span className="flex items-center gap-1 text-[10px] text-[#E6C66E] font-bold bg-[#C8A24A]/20 px-2 py-0.5 rounded-full border border-[#C8A24A]/40">
                          <Volume2 size={12} className={isCurrentAudioActive ? 'animate-pulse' : ''} />
                          <span>{isCurrentAudioActive ? 'تلاوة جارية' : 'متوقف'}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[#C4B998] mt-0.5">
                      <span>{surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}</span>
                      <span>·</span>
                      <span className="tabular-nums">{surah.numberOfAyahs} آيات</span>
                      <span>·</span>
                      <span className="text-[#8E8268] font-quran">{surah.englishName}</span>
                    </div>
                  </div>
                </div>

                {/* Left side: Listen / Tafsir / Open buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setSelectedSurahForTafsir(surah)}
                    className="flex items-center gap-1 px-2.5 py-2 bg-[#1B170F] hover:bg-[#262015] text-[#F3E5AB] border border-[#C8A24A]/35 hover:border-[#E6C66E]/60 rounded-xl text-xs font-bold transition-all active:scale-95"
                    title="تفسير السورة وبيان مقاصدها"
                    aria-label="تفسير السورة وبيان مقاصدها"
                  >
                    <BookOpen size={12} className="text-[#E6C66E]" />
                    <span>تفسير</span>
                  </button>

                  <button
                    onClick={(e) => handlePlaySurahDirectly(e, surah)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all shadow-sm active:scale-95 ${
                      isCurrentAudioActive
                        ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] shadow-md ring-2 ring-[#E6C66E]/50'
                        : isPlayingThis
                        ? 'bg-[#C8A24A]/25 border border-[#E6C66E] text-[#E6C66E]'
                        : 'bg-[#1A160E] hover:bg-[#E6C66E] hover:text-[#080705] text-[#E6C66E] border border-[#C8A24A]/45'
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
                    className="p-2 text-[#C4B998] hover:text-white hover:bg-[#1E1A12] rounded-xl transition-colors"
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
            <div className="text-center py-12 text-[#C4B998] text-xs bg-[#12100B] border border-[#C8A24A]/25 rounded-2xl">
              <BookmarkIcon size={24} className="mx-auto mb-2 text-[#E6C66E]/60" />
              لم تقم بإضافة أي علامات مرجعية بعد. يمكنك حفظ أي آية أثناء القراءة في المصحف.
            </div>
          ) : (
            bookmarks.map((bm, idx) => (
              <div
                key={idx}
                onClick={() => onSelectSurah(bm.surahNumber, bm.ayahNumber)}
                className="p-3.5 bg-[#12100B] border border-[#C8A24A]/35 rounded-2xl cursor-pointer hover:border-[#E6C66E]/70 transition-colors"
              >
                <div className="flex items-center justify-between text-xs text-[#E6C66E] font-bold mb-1">
                  <span>سورة {bm.surahName} (آية {bm.ayahNumber})</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      StorageService.removeBookmark(bm.surahNumber, bm.ayahNumber);
                      setBookmarks(StorageService.getBookmarks());
                    }}
                    className="text-[#8E8268] hover:text-rose-400 text-[11px]"
                  >
                    حذف
                  </button>
                </div>
                <p className="font-quran text-sm text-[#F3E5AB] line-clamp-2 leading-relaxed">
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
          <div className="relative overflow-hidden bg-gradient-to-b from-[#1A160E] to-[#0E0D0A] border border-[#C8A24A]/50 rounded-3xl p-5 space-y-4 shadow-xl">
            <RotatingCardBackground slot="quran" cardOffset={2} intervalMs={26000} opacity={0.22} />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#E6C66E] font-bold block">متابعة الختمة القرآنية</span>
                <h3 className="text-base font-extrabold text-[#F3E5AB]">
                  الختمة رقم {khatmah.khatmahNumber}
                </h3>
              </div>
              <button
                onClick={handleResetKhatmah}
                className="px-3 py-1.5 bg-[#1B170F] hover:bg-[#262015] text-[#E6C66E] rounded-xl text-[11px] font-bold border border-[#C8A24A]/40 transition-colors"
              >
                بدء ختمة جديدة
              </button>
            </div>

            {/* Large Progress Bar */}
            <div className="relative z-10 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#C4B998]">السور المنجزة: {khatmah.completedSurahs?.length || 0} من 114</span>
                <span className="text-[#E6C66E] font-extrabold text-sm tabular-nums">{khatmahPercent}%</span>
              </div>
              <div className="w-full bg-[#221D14] rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#C8A24A] to-[#E6C66E] h-full transition-all duration-300"
                  style={{ width: `${khatmahPercent}%` }}
                />
              </div>
            </div>

            {/* Daily Reading & Listening Stats */}
            <div className="relative z-10 grid grid-cols-2 gap-2 pt-1">
              <div className="bg-[#14120D] p-3 rounded-2xl border border-[#C8A24A]/35">
                <span className="text-[10px] text-[#C4B998] block mb-0.5">تلاوة اليوم</span>
                <div className="text-[#E6C66E] font-extrabold text-base tabular-nums">
                  {khatmah.totalAyahsReadToday} آية
                </div>
                <span className="text-[9px] text-[#8E8268] block mt-0.5">
                  الهدف اليومي: {khatmah.dailyGoalAyahs} آية
                </span>
              </div>

              <div className="bg-[#14120D] p-3 rounded-2xl border border-[#C8A24A]/35">
                <span className="text-[10px] text-[#C4B998] block mb-0.5">استماع اليوم</span>
                <div className="text-[#F3E5AB] font-extrabold text-base tabular-nums">
                  {khatmah.todayMinutesListened} دقيقة
                </div>
                <span className="text-[9px] text-[#8E8268] block mt-0.5">
                  تلاوة خاشعة مستمرة
                </span>
              </div>
            </div>
          </div>

          {/* Checklist of all 114 Surahs for the Khatmah */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-[#F3E5AB]">قائمة السور لإتمام الختمة (اضغط لتحديد السورة كمنجزة):</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {surahs.map((surah) => {
                const isDone = khatmah.completedSurahs?.includes(surah.number);
                return (
                  <button
                    key={surah.number}
                    onClick={() => handleToggleSurahKhatmah(surah.number)}
                    className={`p-3 rounded-2xl border flex items-center justify-between text-right transition-all ${
                      isDone
                        ? 'bg-[#231D11] border-[#E6C66E]/60 text-[#F3E5AB]'
                        : 'bg-[#12100B] border-[#C8A24A]/25 text-[#C4B998] hover:border-[#C8A24A]/55'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-extrabold ${
                        isDone ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705]' : 'bg-[#1B170F] text-[#E6C66E]'
                      }`}>
                        {isDone ? <Check size={14} /> : surah.number}
                      </div>
                      <span className="font-quran font-bold text-xs">سورة {surah.name}</span>
                    </div>
                    <span className="text-[10px] text-[#8E8268]">{surah.numberOfAyahs} آيات</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Surah Tafsir & Thematic Overview Modal */}
      {selectedSurahForTafsir && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-xl animate-fadeIn select-none">
          <div className="bg-gradient-to-b from-[#17140D] via-[#0E0D0A] to-[#080705] border border-[#C8A24A]/55 w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col text-right">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#C8A24A]/25 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#1F1A10] border border-[#C8A24A]/50 text-[#E6C66E] flex items-center justify-center font-bold text-sm">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#F3E5AB] font-quran">
                    تفسير وبيان سُورَةِ {selectedSurahForTafsir.name}
                  </h3>
                  <p className="text-[10px] text-[#C4B998]">
                    {selectedSurahForTafsir.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} · {selectedSurahForTafsir.numberOfAyahs} آية · التفسير الميسر المعتمد
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedSurahForTafsir(null)}
                className="p-1.5 rounded-xl bg-[#18150E] hover:bg-[#241F14] text-[#C4B998] hover:text-white border border-[#C8A24A]/35"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4 text-xs">
              {/* Surah Intro & Theme Card */}
              <div className="bg-[#14120D] border border-[#C8A24A]/40 rounded-2xl p-4 space-y-2">
                <span className="text-[#E6C66E] font-extrabold block text-xs">
                  مقصود السورة ومحاورها الكبرى:
                </span>
                <p className="text-[#F3E5AB] leading-relaxed text-justify text-[11px]">
                  سورة {selectedSurahForTafsir.name} سورة {selectedSurahForTafsir.revelationType === 'Meccan' ? 'مكية شريفة، تركز على ترسيخ العقيدة والتوحيد والإيمان باليوم الآخر وتدبر آيات الله في الكون.' : 'مدنية جليلة، تعنى بالأحكام الشرعية وتنظيم شؤون الأمة وتزكية النفوس والأخلاق الفاضلة.'}
                </p>
              </div>

              {/* Sample Tafsir Note */}
              <div className="bg-[#14120D] border border-[#C8A24A]/30 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-[#E6C66E] font-extrabold">
                  <span>من التفسير الميسر المعتمد:</span>
                  <span className="text-[10px] text-[#C4B998] font-mono">الآية ١</span>
                </div>
                <p className="text-[#C4B998] leading-relaxed text-[11px] text-justify">
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
                className="athar-btn-primary w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-xs"
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
