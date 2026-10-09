import React, { useState, useEffect } from 'react';
import { SurahMeta, Bookmark, LastRead, LastAudioPosition, QuranKhatmahState } from '../types';
import { QuranService } from '../services/quranService';
import { StorageService } from '../services/storageService';
import { AudioService, ActiveAudioState } from '../services/audioService';
import { VERIFIED_RECITERS, ALL_SURAHS } from '../data/surahsData';
import { 
  BookOpen, Search, Bookmark as BookmarkIcon, History, 
  ChevronLeft, ChevronRight, Play, Pause, Volume2, Headphones, UserCheck,
  RotateCcw, RotateCw, X, Award, CheckCircle2, Clock, Check
} from 'lucide-react';

interface QuranViewProps {
  onSelectSurah: (surahNumber: number, initialAyah?: number) => void;
}

export const QuranView: React.FC<QuranViewProps> = ({ onSelectSurah }) => {
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastRead, setLastRead] = useState<LastRead | null>(null);
  const [lastAudio, setLastAudio] = useState<LastAudioPosition | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [activeTab, setActiveTab] = useState<'surahs' | 'bookmarks' | 'khatmah'>('surahs');
  const [activeAudio, setActiveAudio] = useState<ActiveAudioState | null>(null);
  const [khatmah, setKhatmah] = useState<QuranKhatmahState>(StorageService.getQuranKhatmah());
  const [selectedReciterId, setSelectedReciterId] = useState<string>(
    StorageService.getSettings().selectedReciterId || 'alafasy'
  );

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
      if (state?.category === 'quran') {
        setLastAudio(StorageService.getLastAudioPosition());
        setKhatmah(StorageService.getQuranKhatmah());
      }
    });
    return () => unsub();
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    setSurahs(QuranService.searchSurahs(q));
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

    // Persist position
    StorageService.saveLastAudioPosition({
      surahNumber: sNum,
      surahName: sMeta.name,
      ayahNumber: aNum,
      reciterId: rId,
      reciterName: (VERIFIED_RECITERS.find(r => r.id === rId) || VERIFIED_RECITERS[0]).nameArabic,
      currentTime: 0,
      timestamp: Date.now()
    });
    setLastAudio(StorageService.getLastAudioPosition());

    AudioService.playQuranAyah(
      sNum,
      aNum,
      sMeta.name,
      rId,
      {
        onEnded: () => {
          StorageService.recordAyahRead(sNum, 1);
          setKhatmah(StorageService.getQuranKhatmah());
          if (aNum < sMeta.numberOfAyahs) {
            playContinuousAyah(sNum, aNum + 1, rId);
          } else if (sNum < 114) {
            playContinuousAyah(sNum + 1, 1, rId);
          }
        },
        onNext: () => {
          if (aNum < sMeta.numberOfAyahs) {
            playContinuousAyah(sNum, aNum + 1, rId);
          } else if (sNum < 114) {
            playContinuousAyah(sNum + 1, 1, rId);
          }
        },
        onPrevious: () => {
          if (aNum > 1) {
            playContinuousAyah(sNum, aNum - 1, rId);
          }
        }
      }
    );
  };

  const handleResumeListening = () => {
    if (!lastAudio) return;
    const reciterId = lastAudio.reciterId || selectedReciterId;
    playContinuousAyah(lastAudio.surahNumber, lastAudio.ayahNumber, reciterId);
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

        <button 
          onClick={() => setActiveTab('khatmah')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#141C25] hover:bg-[#1A2533] border border-[#D4AF37]/40 rounded-xl text-xs text-[#D4AF37] font-bold transition-all shadow"
        >
          <Award size={14} />
          <span>الختمة: {khatmahPercent}%</span>
        </button>
      </div>

      {/* Reciter Selector Bar */}
      <div className="bg-[#121922] border border-slate-800/90 rounded-2xl p-3 shadow-md flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37]">
            <UserCheck size={16} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">القارئ للتلاوة الصوتية:</span>
            <span className="text-xs font-bold text-slate-200">
              {currentReciter.nameArabic}
            </span>
          </div>
        </div>

        <select
          value={selectedReciterId}
          onChange={(e) => handleReciterChange(e.target.value)}
          className="bg-[#182330] border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-[#D4AF37] font-semibold focus:outline-none focus:border-[#D4AF37]"
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
        {lastRead && (
          <button
            onClick={() => onSelectSurah(lastRead.surahNumber, lastRead.ayahNumber)}
            className="w-full bg-gradient-to-r from-[#17212D] to-[#111720] border border-[#D4AF37]/35 rounded-2xl p-3 flex items-center justify-between text-right hover:border-[#D4AF37]/60 transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] shrink-0">
                <History size={16} />
              </div>
              <div className="truncate">
                <span className="text-[10px] text-[#D4AF37] font-semibold block">آخر موضع قراءة</span>
                <h3 className="text-xs font-bold text-slate-100 truncate">
                  سورة {lastRead.surahName} · الآية {lastRead.ayahNumber}
                </h3>
              </div>
            </div>
            <ChevronLeft size={16} className="text-slate-400 shrink-0" />
          </button>
        )}

        {/* Last Audio Quick Banner (Last Listened Position) */}
        {lastAudio && (
          <button
            onClick={handleResumeListening}
            className="w-full bg-gradient-to-r from-[#12211C] to-[#101915] border border-emerald-500/35 rounded-2xl p-3 flex items-center justify-between text-right hover:border-emerald-500/60 transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0">
                <Headphones size={16} />
              </div>
              <div className="truncate">
                <span className="text-[10px] text-emerald-400 font-semibold block">آخر موضع استماع</span>
                <h3 className="text-xs font-bold text-slate-100 truncate">
                  سورة {lastAudio.surahName} · آية {lastAudio.ayahNumber}
                </h3>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-lg shrink-0">
              <Play size={10} fill="currentColor" />
              <span>استئناف</span>
            </span>
          </button>
        )}
      </div>

      {/* Tabs: Surahs vs Bookmarks vs Khatmah Tracker */}
      <div className="flex bg-[#121820] p-1 rounded-2xl border border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('surahs')}
          className={`flex-1 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'surahs'
              ? 'bg-[#1D2836] text-[#D4AF37] shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          فهرس السور ({surahs.length})
        </button>
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`flex-1 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'bookmarks'
              ? 'bg-[#1D2836] text-[#D4AF37] shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          العلامات المرجعية ({bookmarks.length})
        </button>
        <button
          onClick={() => setActiveTab('khatmah')}
          className={`flex-1 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'khatmah'
              ? 'bg-[#1D2836] text-[#D4AF37] shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          متابعة الختمة ({khatmahPercent}%)
        </button>
      </div>

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

                {/* Left side: Listen / Stop buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
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
          <div className="bg-[#121820] border border-[#D4AF37]/40 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
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
            <div className="space-y-1.5">
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
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-[#182330] p-3 rounded-2xl border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block mb-0.5">تلاوة اليوم</span>
                <div className="text-[#D4AF37] font-bold text-base tabular-nums">
                  {khatmah.totalAyahsReadToday} آية
                </div>
                <span className="text-[9px] text-slate-500 block mt-0.5">
                  الهدف اليومي: {khatmah.dailyGoalAyahs} آية
                </span>
              </div>

              <div className="bg-[#182330] p-3 rounded-2xl border border-slate-700/60">
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
    </div>
  );
};
