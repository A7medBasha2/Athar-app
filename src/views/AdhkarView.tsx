import React, { useState, useEffect } from 'react';
import { MORNING_ADHKAR, EVENING_ADHKAR, ASMA_ALLAH_AL_HUSNA } from '../data/adhkarData';
import { AdhkarCategory, DhikrItem, NavigationTab, AdhkarStats, LastAdhkarRead, LastAdhkarAudio } from '../types';
import { StorageService } from '../services/storageService';
import { AudioService, ActiveAudioState } from '../services/audioService';
import { AdhkarPlayerSheet } from '../components/AdhkarPlayerSheet';
import { SpiritualToolkitModal } from '../components/SpiritualToolkitModal';
import { ShareCardModal, ShareCardPayload } from '../components/ShareCardModal';
import { ZakatAndCharityModal } from '../components/ZakatAndCharityModal';
import { 
  Sun, Moon, Play, Pause, CheckCircle2, RotateCcw, 
  Heart, Award, Flame, Trophy, ShieldCheck, X, Sparkles, Image as ImageIcon,
  History, Headphones, ChevronLeft
} from 'lucide-react';

interface AdhkarViewProps {
  onNavigate?: (tab: NavigationTab) => void;
  onSelectSurah?: (surahNumber: number, ayahNumber?: number) => void;
  initialCategory?: AdhkarCategory;
  autoOpenPlayer?: boolean;
}

type AdhkarSubTab = 'morning' | 'evening' | 'asma_allah';

export const AdhkarView: React.FC<AdhkarViewProps> = ({ 
  onNavigate, 
  onSelectSurah,
  initialCategory = 'morning',
  autoOpenPlayer = false
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AdhkarSubTab>(initialCategory);
  const [activeCategory, setActiveCategory] = useState<AdhkarCategory>(initialCategory);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [completedDhikrs, setCompletedDhikrs] = useState<Set<number>>(new Set());
  const [isPlayerOpen, setIsPlayerOpen] = useState<boolean>(autoOpenPlayer);
  const [playerStartIndex, setPlayerStartIndex] = useState<number>(0);
  const [activeAudio, setActiveAudio] = useState<ActiveAudioState | null>(null);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState<boolean>(false);
  const [isToolkitOpen, setIsToolkitOpen] = useState<boolean>(false);
  const [isZakatOpen, setIsZakatOpen] = useState<boolean>(false);
  const [shareCardPayload, setShareCardPayload] = useState<ShareCardPayload | null>(null);
  const [adhkarStats, setAdhkarStats] = useState<AdhkarStats>(StorageService.getAdhkarStats());
  const [lastAdhkarRead, setLastAdhkarRead] = useState<LastAdhkarRead | null>(StorageService.getLastAdhkarRead());
  const [lastAdhkarAudio, setLastAdhkarAudio] = useState<LastAdhkarAudio | null>(StorageService.getLastAdhkarAudio());
  const [highlightedDhikrId, setHighlightedDhikrId] = useState<number | null>(null);

  const currentList: DhikrItem[] =
    activeSubTab === 'morning'
      ? MORNING_ADHKAR
      : EVENING_ADHKAR;

  const reloadData = () => {
    const savedCounts = StorageService.getDhikrCounts(activeCategory);
    setCounts(prev => ({ ...prev, ...savedCounts }));

    const saved = StorageService.getAdhkarProgress();
    if (saved && saved.category === activeCategory) {
      setCompletedDhikrs(new Set(saved.completedIds));
    } else {
      const doneIds = currentList.filter(d => (savedCounts[d.id] || 0) >= d.count).map(d => d.id);
      setCompletedDhikrs(new Set(doneIds));
    }
    setAdhkarStats(StorageService.getAdhkarStats());
    setLastAdhkarRead(StorageService.getLastAdhkarRead());
    setLastAdhkarAudio(StorageService.getLastAdhkarAudio());
  };

  useEffect(() => {
    reloadData();

    const unsub = AudioService.subscribe((state) => {
      setActiveAudio(state);
      if (state?.category === 'adhkar') {
        const updatedCounts = StorageService.getDhikrCounts(activeCategory);
        setCounts(prev => ({ ...prev, ...updatedCounts }));
        setAdhkarStats(StorageService.getAdhkarStats());
        setLastAdhkarRead(StorageService.getLastAdhkarRead());
        setLastAdhkarAudio(StorageService.getLastAdhkarAudio());
      }
    });
    return () => unsub();
  }, [activeCategory]);

  const handleIncrementCount = (dhikr: DhikrItem) => {
    const current = counts[dhikr.id] || 0;
    const next = Math.min(current + 1, dhikr.count);
    const dhikrIndex = currentList.findIndex(d => d.id === dhikr.id);

    if (activeSubTab === 'morning' || activeSubTab === 'evening') {
      StorageService.setDhikrCount(activeSubTab, dhikr.id, next);
      const newStats = StorageService.recordDhikrStep(activeSubTab, dhikr.id, dhikr.count);
      setAdhkarStats(newStats);

      const updatedLastRead: LastAdhkarRead = {
        category: activeSubTab,
        dhikrId: dhikr.id,
        dhikrIndex: dhikrIndex >= 0 ? dhikrIndex : 0,
        currentCount: next,
        targetCount: dhikr.count,
        timestamp: Date.now()
      };
      StorageService.saveLastAdhkarRead(updatedLastRead);
      setLastAdhkarRead(updatedLastRead);
    }

    if (next >= dhikr.count) {
      setCounts(prev => ({ ...prev, [dhikr.id]: dhikr.count }));
      setCompletedDhikrs(prev => new Set([...prev, dhikr.id]));
      if ('vibrate' in navigator) {
        try { navigator.vibrate(40); } catch {}
      }
    } else {
      setCounts(prev => ({ ...prev, [dhikr.id]: next }));
      if ('vibrate' in navigator) {
        try { navigator.vibrate(15); } catch {}
      }
    }
  };

  const handleResetDhikr = (id: number) => {
    if (activeSubTab === 'morning' || activeSubTab === 'evening') {
      StorageService.setDhikrCount(activeSubTab, id, 0);
    }
    setCounts(prev => ({ ...prev, [id]: 0 }));
    setCompletedDhikrs(prev => {
      const copy = new Set(prev);
      copy.delete(id);
      return copy;
    });
  };

  const handleOpenContinuousPlayer = (index: number = 0) => {
    setPlayerStartIndex(index);
    setIsPlayerOpen(true);
  };

  const handleResumeLastAdhkarRead = () => {
    const targetCategory = lastAdhkarRead ? lastAdhkarRead.category : activeCategory;
    const list = targetCategory === 'morning' ? MORNING_ADHKAR : EVENING_ADHKAR;
    const targetDhikrId = lastAdhkarRead ? lastAdhkarRead.dhikrId : (list[0]?.id || 1);

    setActiveCategory(targetCategory);
    setActiveSubTab(targetCategory);
    setHighlightedDhikrId(targetDhikrId);
    setTimeout(() => {
      const el = document.getElementById(`dhikr-card-${targetDhikrId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
    setTimeout(() => {
      setHighlightedDhikrId(null);
    }, 3500);
  };

  const handleResumeLastAdhkarAudio = () => {
    const targetCategory = lastAdhkarAudio ? lastAdhkarAudio.category : activeCategory;
    const targetIndex = lastAdhkarAudio ? lastAdhkarAudio.dhikrIndex : 0;
    setActiveCategory(targetCategory);
    setActiveSubTab(targetCategory);
    setPlayerStartIndex(targetIndex);
    setIsPlayerOpen(true);
  };

  const handlePlayIndividualDhikr = (e: React.MouseEvent, dhikr: DhikrItem, index: number) => {
    e.stopPropagation();
    if (activeSubTab === 'morning' || activeSubTab === 'evening') {
      if (activeAudio?.category === 'adhkar' && activeAudio.dhikrId === dhikr.id && activeAudio.isPlaying) {
        AudioService.pause();
      } else {
        handleOpenContinuousPlayer(index);
      }
    }
  };

  const completedCount = currentList.filter(d => completedDhikrs.has(d.id) || (counts[d.id] || 0) >= d.count).length;
  const progressPercent = Math.round((completedCount / currentList.length) * 100);

  const badgesList = [
    { id: 'first_dhikr', title: 'بداية الخير', desc: 'إتمام أول ذكر بالعد أو الاستماع', target: 1, current: adhkarStats.totalDhikrRecited, icon: Heart },
    { id: 'streak_3', title: 'مواظبة 3 أيام', desc: 'الحفاظ على الأذكار 3 أيام متتالية', target: 3, current: adhkarStats.currentStreak, icon: Flame },
    { id: 'streak_7', title: 'أسبوع النور', desc: 'الحفاظ على الأذكار 7 أيام متتالية', target: 7, current: adhkarStats.currentStreak, icon: Trophy },
    { id: 'hundred_club', title: 'مئوية الذكر', desc: 'إتمام 100 تسبيحة وذكر', target: 100, current: adhkarStats.totalDhikrRecited, icon: Award },
    { id: 'thousand_club', title: 'ألفية التسبيح', desc: 'الوصول إلى 1000 ذكر واستغفار', target: 1000, current: adhkarStats.totalDhikrRecited, icon: ShieldCheck },
    { id: 'morning_guard', title: 'حارس الصباح', desc: 'إتمام أذكار الصباح كاملة', target: 1, current: adhkarStats.totalMorningSessions, icon: Sun },
    { id: 'evening_guard', title: 'حارس المساء', desc: 'إتمام أذكار المساء كاملة', target: 1, current: adhkarStats.totalEveningSessions, icon: Moon },
    { id: 'both_wards', title: 'جامع الوردين', desc: 'إتمام الصباح والمساء في نفس اليوم', target: 1, current: (adhkarStats.morningCompletedToday && adhkarStats.eveningCompletedToday) ? 1 : 0, icon: CheckCircle2 },
  ];

  return (
    <div className="athar-page-container text-right">
      {/* 1. Top Luxury Header (Matches Reference Showcase) */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#C8A24A]/25">
        <div className="flex items-center gap-2">
          <Heart size={20} className="text-[#E6C66E]" />
          <h1 className="text-lg font-extrabold text-white tracking-wide">
            الأذكار
          </h1>
        </div>
        <button
          onClick={() => setIsAchievementsOpen(true)}
          className="px-3 py-1 rounded-full bg-[#161410] border border-[#C8A24A]/40 text-[11px] font-extrabold text-[#E6C66E] flex items-center gap-1.5"
        >
          <Flame size={13} className="fill-[#E6C66E]" />
          <span>{adhkarStats.todayDhikrCount} ذكر اليوم</span>
        </button>
      </div>

      {/* 2. Golden Capsule Filter Tabs (الصباح · المساء · أسماء الله الحسنى) */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { id: 'morning' as const, label: 'أذكار الصباح' },
          { id: 'evening' as const, label: 'أذكار المساء' },
          { id: 'asma_allah' as const, label: 'أسماء الله الحسنى' },
        ].map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id);
                if (tab.id === 'morning' || tab.id === 'evening') {
                  setActiveCategory(tab.id);
                }
              }}
              className={`px-3 py-2.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all border text-center ${
                isActive
                  ? 'bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-[#070707] border-[#F3E5AB] shadow-[0_4px_15px_rgba(200,162,74,0.38)]'
                  : 'bg-[#12110E] text-[#C4B998] border-[#C8A24A]/25 hover:border-[#C8A24A]/60 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3. Quick Resume Strip for Morning & Evening Adhkar (Stacked Vertically: Last Read on Top, Last Audio Underneath) */}
      {(activeSubTab === 'morning' || activeSubTab === 'evening') && (
        <div className="flex flex-col gap-2">
          <button
            onClick={handleResumeLastAdhkarRead}
            className="w-full athar-card p-3 flex items-center justify-between text-right hover:border-[#E6C66E] transition-all"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-[#1F1B12] border border-[#C8A24A]/40 text-[#E6C66E] shrink-0">
                <History size={16} />
              </div>
              <div className="truncate">
                <span className="text-[10px] text-[#E6C66E] font-bold block">آخر موضع قراءة</span>
                <span className="text-xs font-extrabold text-white truncate block mt-0.5">
                  {lastAdhkarRead
                    ? `${lastAdhkarRead.category === 'morning' ? 'أذكار الصباح' : 'أذكار المساء'} · الذكر ${lastAdhkarRead.dhikrIndex + 1} (${lastAdhkarRead.currentCount}/${lastAdhkarRead.targetCount})`
                    : `${activeCategory === 'morning' ? 'أذكار الصباح' : 'أذكار المساء'} · الذكر ١`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-[#E6C66E] shrink-0">
              <span>متابعة القراءة</span>
              <ChevronLeft size={14} className="text-[#C8A24A]" />
            </div>
          </button>

          <button
            onClick={handleResumeLastAdhkarAudio}
            className="w-full athar-card p-3 flex items-center justify-between text-right hover:border-[#E6C66E] transition-all"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-[#1F1B12] border border-[#C8A24A]/40 text-[#E6C66E] shrink-0">
                <Headphones size={16} />
              </div>
              <div className="truncate">
                <span className="text-[10px] text-[#E6C66E] font-bold block">آخر موضع استماع للذكر</span>
                <span className="text-xs font-extrabold text-white truncate block mt-0.5">
                  {lastAdhkarAudio
                    ? `${lastAdhkarAudio.category === 'morning' ? 'أذكار الصباح' : 'أذكار المساء'} · الذكر ${lastAdhkarAudio.dhikrIndex + 1} (${lastAdhkarAudio.playMode === 'continuous' ? 'تلاوة متواصلة' : `تكرار ${lastAdhkarAudio.currentRepetition}/${lastAdhkarAudio.targetRepetition}`})`
                    : `${activeCategory === 'morning' ? 'أذكار الصباح' : 'أذكار المساء'} · الذكر ١`}
                </span>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-[#C8A24A] text-[#070707] text-[11px] font-extrabold flex items-center gap-1 shrink-0 shadow">
              <Play size={11} fill="currentColor" />
              <span>{lastAdhkarAudio ? 'استئناف' : 'تشغيل'}</span>
            </span>
          </button>
        </div>
      )}

      {activeSubTab === 'asma_allah' ? (
        /* Asma Allah Al-Husna View in Luxury Black & Gold */
        <div className="space-y-3 animate-fadeIn">
          <div className="athar-card-gold space-y-1 text-center">
            <span className="font-quran text-lg text-[#E6C66E] font-bold block">
              ﴿وَلِلَّهِ الْأَسْمَاءُ الْحُسْنَىٰ فَادْعُوهُ بِهَا﴾
            </span>
            <p className="text-xs text-[#C4B998]">
              تدبر معاني أسماء الله الحسنى وشاركها كبطاقة مصورة فاخرة
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {ASMA_ALLAH_AL_HUSNA.map((item) => (
              <div
                key={item.id}
                className="athar-card space-y-2 hover:border-[#E6C66E]/60 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-[#1C1810] border border-[#C8A24A]/50 text-[#E6C66E] font-extrabold text-xs flex items-center justify-center font-mono">
                      {item.id}
                    </span>
                    <h4 className="font-quran text-2xl font-bold text-[#E6C66E]">
                      {item.name}
                    </h4>
                  </div>

                  <button
                    onClick={() =>
                      setShareCardPayload({
                        category: 'dhikr',
                        title: `من أسماء الله الحسنى: ${item.name}`,
                        mainText: `${item.name} — ${item.meaning}`,
                        sourceLabel: '﴿وَلِلَّهِ الْأَسْمَاءُ الْحُسْنَىٰ فَادْعُوهُ بِهَا﴾',
                        subtitleOrTafsir: item.reflection
                      })
                    }
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#1C1810] hover:bg-[#C8A24A] text-[#E6C66E] hover:text-[#070707] border border-[#C8A24A]/40 text-[11px] font-extrabold transition-all"
                  >
                    <ImageIcon size={12} />
                    <span>بطاقة مصورة</span>
                  </button>
                </div>

                <p className="text-xs text-white leading-relaxed">
                  {item.meaning}
                </p>

                <div className="p-2.5 rounded-xl bg-[#0B0A08] border border-[#C8A24A]/25 text-[11px] text-[#C4B998]">
                  <strong className="text-[#E6C66E]">حظ المؤمن وثمرة الاسم: </strong>
                  {item.reflection}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Progress & Continuous Play Bar */}
          {(activeSubTab === 'morning' || activeSubTab === 'evening') && (
            <div className="athar-card-gold flex items-center justify-between gap-3">
              <div>
                <span className="text-[11px] text-[#E6C66E] font-extrabold block">
                  إنجاز الورد: {completedCount} من {currentList.length} ({progressPercent}%)
                </span>
                <h3 className="text-sm font-extrabold text-white mt-0.5">
                  {activeCategory === 'morning' ? 'تشغيل أذكار الصباح كاملة بالصوت' : 'تشغيل أذكار المساء كاملة بالصوت'}
                </h3>
              </div>

              <button
                onClick={() => handleOpenContinuousPlayer(0)}
                className="athar-btn-primary text-xs flex items-center gap-1.5 shrink-0"
              >
                <Play size={14} fill="currentColor" />
                <span>تشغيل الكل</span>
              </button>
            </div>
          )}

          {/* 4. Luxury Black & Gold Dhikr Cards (Matches Reference Showcase: Circular Gold Ring Counter on Right, Text in Center, Gold Play Button on Left) */}
          <div className="space-y-3">
            {currentList.map((dhikr, idx) => {
              const currentCount = counts[dhikr.id] || 0;
              const isDone = completedDhikrs.has(dhikr.id) || currentCount >= dhikr.count;
              const isPlayingThisDhikr =
                activeAudio?.category === 'adhkar' &&
                activeAudio.dhikrId === dhikr.id &&
                activeAudio.isPlaying;
              const isHighlighted = highlightedDhikrId === dhikr.id;
              const pct = Math.min(100, Math.round((currentCount / dhikr.count) * 100));
              const ringCirc = 2 * Math.PI * 24;
              const ringOffset = ringCirc * (1 - pct / 100);

              return (
                <div
                  key={dhikr.id}
                  id={`dhikr-card-${dhikr.id}`}
                  onClick={() => handleIncrementCount(dhikr)}
                  className={`relative overflow-hidden rounded-3xl p-4 border transition-all duration-300 cursor-pointer select-none ${
                    isPlayingThisDhikr || isHighlighted
                      ? 'bg-gradient-to-b from-[#211C11] to-[#12100B] border-[#E6C66E] ring-1 ring-[#E6C66E]/50 shadow-[0_10px_30px_rgba(200,162,74,0.25)]'
                      : isDone
                      ? 'bg-[#0F0E0B] border-[#C8A24A]/60 opacity-90'
                      : 'bg-gradient-to-b from-[#161410] to-[#0E0D0A] border-[#C8A24A]/32 hover:border-[#E6C66E]/65 shadow-lg'
                  }`}
                >
                  {/* Main Showcase Row: Circular Ring Counter (Right in RTL) + Dhikr Text (Center) + Golden Play Button (Left in RTL) */}
                  <div className="flex items-center justify-between gap-3.5">
                    {/* Right Circular Golden Counter Ring (Matches Reference Showcase "100 مرة") */}
                    <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 60 60">
                        <circle
                          cx="30"
                          cy="30"
                          r="24"
                          fill="rgba(20, 18, 14, 0.9)"
                          stroke="rgba(200, 162, 74, 0.22)"
                          strokeWidth="4"
                        />
                        <circle
                          cx="30"
                          cy="30"
                          r="24"
                          fill="transparent"
                          stroke="#E6C66E"
                          strokeWidth="4"
                          strokeDasharray={ringCirc}
                          strokeDashoffset={ringOffset}
                          strokeLinecap="round"
                          className="transition-all duration-300"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        {isDone ? (
                          <CheckCircle2 size={20} className="text-[#E6C66E]" />
                        ) : (
                          <>
                            <span className="text-xs font-black text-[#E6C66E] font-mono tabular-nums leading-none">
                              {dhikr.count - currentCount}
                            </span>
                            <span className="text-[9px] text-[#C4B998] font-bold mt-0.5">
                              {dhikr.count === 1 ? 'مرة' : 'مرات'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Center Dhikr Sacred Text */}
                    <div className="flex-1 min-w-0 text-right">
                      <p className="font-quran text-base sm:text-lg text-white leading-relaxed">
                        {dhikr.arabicText}
                      </p>
                      <p className="text-[11px] text-[#C4B998] mt-1.5 line-clamp-2 leading-relaxed">
                        {dhikr.fadl}
                      </p>
                    </div>

                    {/* Left Golden Play Button (Matches Reference Showcase) */}
                    <div className="shrink-0 flex flex-col items-center gap-2">
                      <button
                        onClick={(e) => handlePlayIndividualDhikr(e, dhikr, idx)}
                        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-md ${
                          isPlayingThisDhikr
                            ? 'bg-[#E6C66E] text-[#070707] ring-2 ring-[#F3E5AB]'
                            : 'bg-gradient-to-br from-[#E6C66E] to-[#B68D2E] text-[#070707] hover:brightness-110'
                        }`}
                        title="تشغيل الذكر صوتياً"
                        aria-label="تشغيل الذكر صوتياً"
                      >
                        {isPlayingThisDhikr ? (
                          <Pause size={17} fill="currentColor" />
                        ) : (
                          <Play size={17} fill="currentColor" className="mr-0.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Subtle Bottom Bar for Reset, Share & Exact Count */}
                  <div className="mt-3 pt-2.5 border-t border-[#C8A24A]/20 flex items-center justify-between text-[11px] text-[#C4B998]">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResetDhikr(dhikr.id);
                        }}
                        className="p-1 rounded-lg hover:bg-[#1E1B14] text-[#C4B998] hover:text-[#E6C66E] transition-colors flex items-center gap-1"
                        title="إعادة ضبط العداد"
                      >
                        <RotateCcw size={12} />
                        <span>إعادة</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShareCardPayload({
                            category: 'dhikr',
                            title: 'من الأذكار النبوية',
                            mainText: dhikr.arabicText,
                            sourceLabel: dhikr.count === 1 ? 'يُقال مرة واحدة' : `يُقال ${dhikr.count} مرات`,
                            subtitleOrTafsir: dhikr.fadl
                          });
                        }}
                        className="p-1 rounded-lg hover:bg-[#1E1B14] text-[#C4B998] hover:text-[#E6C66E] transition-colors flex items-center gap-1"
                      >
                        <ImageIcon size={12} />
                        <span>بطاقة</span>
                      </button>
                    </div>

                    <span className="font-bold text-[#E6C66E] tabular-nums">
                      {isDone
                        ? `تم الإتمام (${dhikr.count}/${dhikr.count}) ✓`
                        : `اضغط على البطاقة للعد (${currentCount}/${dhikr.count})`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Adhkar Achievements Modal */}
      {isAchievementsOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-3 animate-fadeIn">
          <div className="bg-[#0D0C09] border border-[#C8A24A]/50 rounded-3xl p-5 max-w-md w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl text-right">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
              <div className="flex items-center gap-2 text-white">
                <Award size={20} className="text-[#E6C66E]" />
                <h3 className="font-extrabold text-base">سجل الإنجاز والمواظبة على الذكر</h3>
              </div>
              <button
                onClick={() => setIsAchievementsOpen(false)}
                className="p-1.5 text-[#C4B998] hover:text-white rounded-full bg-[#181612]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#14120E] p-3 rounded-2xl border border-[#C8A24A]/30">
                <span className="text-[10px] text-[#C4B998] block mb-1">المواظبة الحالية</span>
                <div className="flex items-center gap-1.5 text-[#E6C66E] font-extrabold text-lg">
                  <Flame size={18} />
                  <span>{adhkarStats.currentStreak} أيام</span>
                </div>
                <span className="text-[9px] text-[#C4B998] mt-1 block">أطول سلسلة: {adhkarStats.longestStreak} يوم</span>
              </div>

              <div className="bg-[#14120E] p-3 rounded-2xl border border-[#C8A24A]/30">
                <span className="text-[10px] text-[#C4B998] block mb-1">تسبيحات اليوم</span>
                <div className="text-[#E6C66E] font-extrabold text-lg">
                  {adhkarStats.todayDhikrCount} ذكر
                </div>
                <span className="text-[9px] text-[#C4B998] mt-1 block">الإجمالي: {adhkarStats.totalDhikrRecited} ذكر</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <h4 className="text-xs font-extrabold text-[#E6C66E]">أوسمة الإنجاز والهمة</h4>
              <div className="grid grid-cols-1 gap-2">
                {badgesList.map((badge) => {
                  const unlocked = adhkarStats.unlockedBadgeIds.includes(badge.id) || badge.current >= badge.target;
                  const Icon = badge.icon;
                  const pct = Math.min(100, Math.round((badge.current / badge.target) * 100));

                  return (
                    <div
                      key={badge.id}
                      className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                        unlocked
                          ? 'bg-[#1D1910] border-[#E6C66E]/60 text-white'
                          : 'bg-[#12110E] border-[#C8A24A]/20 text-[#C4B998]'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        unlocked
                          ? 'bg-[#C8A24A] text-[#070707]'
                          : 'bg-[#1A1814] text-[#C4B998]'
                      }`}>
                        <Icon size={18} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-extrabold text-white">{badge.title}</h5>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            unlocked
                              ? 'bg-[#C8A24A]/25 text-[#E6C66E]'
                              : 'bg-[#1A1814] text-[#C4B998]'
                          }`}>
                            {unlocked ? 'منجز ✓' : `${pct}%`}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#C4B998] mt-0.5 truncate">{badge.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Continuous Adhkar Player Fullscreen Sheet */}
      <AdhkarPlayerSheet
        category={activeCategory}
        adhkarList={activeCategory === 'morning' ? MORNING_ADHKAR : EVENING_ADHKAR}
        startIndex={playerStartIndex}
        isOpen={isPlayerOpen}
        onClose={() => {
          setIsPlayerOpen(false);
          reloadData();
        }}
      />

      <SpiritualToolkitModal
        isOpen={isToolkitOpen}
        onClose={() => setIsToolkitOpen(false)}
        initialTab="share_studio"
        onSelectSurah={(surahNum, ayahNum) => {
          if (onSelectSurah) {
            onSelectSurah(surahNum, ayahNum || 1);
          } else if (onNavigate) {
            onNavigate('quran');
          }
        }}
      />

      <ShareCardModal
        isOpen={Boolean(shareCardPayload)}
        onClose={() => setShareCardPayload(null)}
        initialPayload={shareCardPayload}
      />

      <ZakatAndCharityModal
        isOpen={isZakatOpen}
        onClose={() => setIsZakatOpen(false)}
      />
    </div>
  );
};
