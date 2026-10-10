import React, { useState, useEffect } from 'react';
import { MORNING_ADHKAR, EVENING_ADHKAR, ASMA_ALLAH_AL_HUSNA } from '../data/adhkarData';
import { AdhkarCategory, DhikrItem, NavigationTab, AdhkarStats, LastAdhkarRead, LastAdhkarAudio } from '../types';
import { StorageService } from '../services/storageService';
import { AudioService, ActiveAudioState } from '../services/audioService';
import { AdhkarPlayerSheet } from '../components/AdhkarPlayerSheet';
import { RotatingCardBackground } from '../components/RotatingCardBackground';
import { SpiritualToolkitModal } from '../components/SpiritualToolkitModal';
import { ShareCardModal, ShareCardPayload } from '../components/ShareCardModal';
import { ZakatAndCharityModal } from '../components/ZakatAndCharityModal';
import { 
  Sun, Moon, Play, Pause, CheckCircle2, RotateCcw, 
  Volume2, Heart, Award, Flame, Trophy, ShieldCheck, X, Sparkles, Image as ImageIcon,
  Coins, History, Headphones, ChevronLeft
} from 'lucide-react';

interface AdhkarViewProps {
  onNavigate?: (tab: NavigationTab) => void;
  onSelectSurah?: (surahNumber: number, ayahNumber?: number) => void;
}

export const AdhkarView: React.FC<AdhkarViewProps> = ({ onNavigate, onSelectSurah }) => {
  const [activeCategory, setActiveCategory] = useState<AdhkarCategory>('morning');
  const [viewMode, setViewMode] = useState<'adhkar' | 'asma_allah'>('adhkar');
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [completedDhikrs, setCompletedDhikrs] = useState<Set<number>>(new Set());
  const [isPlayerOpen, setIsPlayerOpen] = useState<boolean>(false);
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

  const adhkarList = activeCategory === 'morning' ? MORNING_ADHKAR : EVENING_ADHKAR;

  const reloadData = () => {
    const savedCounts = StorageService.getDhikrCounts(activeCategory);
    setCounts(savedCounts);

    const saved = StorageService.getAdhkarProgress();
    if (saved && saved.category === activeCategory) {
      setCompletedDhikrs(new Set(saved.completedIds));
    } else {
      // Re-derive completed from saved counts
      const doneIds = adhkarList.filter(d => (savedCounts[d.id] || 0) >= d.count).map(d => d.id);
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
      // Whenever audio reports state or repetition ends, sync counts from storage!
      if (state?.category === 'adhkar') {
        const updatedCounts = StorageService.getDhikrCounts(activeCategory);
        setCounts(updatedCounts);
        const doneIds = adhkarList.filter(d => (updatedCounts[d.id] || 0) >= d.count).map(d => d.id);
        setCompletedDhikrs(new Set(doneIds));
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
    const dhikrIndex = adhkarList.findIndex(d => d.id === dhikr.id);

    StorageService.setDhikrCount(activeCategory, dhikr.id, next);
    const newStats = StorageService.recordDhikrStep(activeCategory, dhikr.id, dhikr.count);
    setAdhkarStats(newStats);

    const updatedLastRead: LastAdhkarRead = {
      category: activeCategory,
      dhikrId: dhikr.id,
      dhikrIndex: dhikrIndex >= 0 ? dhikrIndex : 0,
      currentCount: next,
      targetCount: dhikr.count,
      timestamp: Date.now()
    };
    StorageService.saveLastAdhkarRead(updatedLastRead);
    setLastAdhkarRead(updatedLastRead);

    if (next >= dhikr.count) {
      setCounts(prev => ({ ...prev, [dhikr.id]: dhikr.count }));
      setCompletedDhikrs(prev => {
        const nextSet = new Set([...prev, dhikr.id]);
        StorageService.saveAdhkarProgress({
          category: activeCategory,
          currentIndex: dhikrIndex,
          currentCount: dhikr.count,
          completedIds: Array.from(nextSet),
          isSessionFinished: nextSet.size >= adhkarList.length
        });
        if (nextSet.size >= adhkarList.length) {
          const finishedStats = StorageService.recordSessionCompleted(activeCategory);
          setAdhkarStats(finishedStats);
        }
        return nextSet;
      });
      if ('vibrate' in navigator) {
        navigator.vibrate(40);
      }
    } else {
      setCounts(prev => ({ ...prev, [dhikr.id]: next }));
      if ('vibrate' in navigator) {
        navigator.vibrate(15);
      }
    }
  };

  const handleResetDhikr = (id: number) => {
    StorageService.setDhikrCount(activeCategory, id, 0);
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
    setViewMode('adhkar');
    const targetCategory = lastAdhkarRead ? lastAdhkarRead.category : activeCategory;
    const list = targetCategory === 'morning' ? MORNING_ADHKAR : EVENING_ADHKAR;
    const targetDhikrId = lastAdhkarRead ? lastAdhkarRead.dhikrId : (list[0]?.id || 1);

    setActiveCategory(targetCategory);
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
    setViewMode('adhkar');
    const targetCategory = lastAdhkarAudio ? lastAdhkarAudio.category : activeCategory;
    const targetIndex = lastAdhkarAudio ? lastAdhkarAudio.dhikrIndex : 0;
    setActiveCategory(targetCategory);
    setPlayerStartIndex(targetIndex);
    setIsPlayerOpen(true);
  };

  const handlePlayIndividualDhikr = (e: React.MouseEvent, dhikr: DhikrItem, index: number) => {
    e.stopPropagation();
    if (activeAudio?.category === 'adhkar' && activeAudio.dhikrId === dhikr.id && activeAudio.isPlaying) {
      AudioService.pause();
    } else {
      handleOpenContinuousPlayer(index);
    }
  };

  const completedCount = adhkarList.filter(d => completedDhikrs.has(d.id) || (counts[d.id] || 0) >= d.count).length;
  const progressPercent = Math.round((completedCount / adhkarList.length) * 100);

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
    <div className="flex-1 flex flex-col px-4 pt-3 pb-24 space-y-4 max-w-lg mx-auto w-full select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Heart size={20} className="text-[#D4AF37]" />
            الأذكار المعتمدة المسموعة
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5">
            حِصن المسلم الجامع للأدعية الصحيحة مع تلاوة صوتية متطابقة بدقة
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsZakatOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-bold transition-all shadow active:scale-95"
            title="حاسبة الزكاة وسجل الصدقات"
          >
            <Coins size={13} />
            <span>الزكاة</span>
          </button>

          <button
            onClick={() => setIsToolkitOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#16202C] hover:bg-[#1E2B3B] border border-[#D4AF37]/40 rounded-xl text-xs text-[#D4AF37] font-bold transition-all shadow active:scale-95"
            title="فتح واحة الخشوع ومؤقت النوم والبطاقات المصورة"
          >
            <Sparkles size={13} />
            <span>الواحة</span>
          </button>

          <button
            onClick={() => setIsAchievementsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#17222F] hover:bg-[#1E2C3D] border border-[#D4AF37]/40 rounded-xl text-xs text-[#D4AF37] font-bold transition-all shadow active:scale-95"
            title="عرض سجل الإنجاز والمواظبة"
          >
            <Flame size={14} className="text-amber-400" />
            <span>{adhkarStats.currentStreak}ي</span>
          </button>
        </div>
      </div>

      {/* Streak & Daily Quick Strip */}
      <div className="relative overflow-hidden bg-[#121922] border border-slate-800 rounded-2xl p-3 flex items-center justify-between text-xs">
        <RotatingCardBackground slot="adhkar" cardOffset={0} intervalMs={26000} opacity={0.28} />
        <div className="relative z-10 flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
            <Flame size={16} />
          </div>
          <div>
            <span className="text-[10px] text-slate-300 block font-medium">سلسلة المواظبة اليومية:</span>
            <span className="font-bold text-slate-100">
              {adhkarStats.currentStreak} {adhkarStats.currentStreak === 1 ? 'يوم مستمر' : 'أيام متتالية'} (الأطول: {adhkarStats.longestStreak} يوم)
            </span>
          </div>
        </div>

        <div className="relative z-10 text-left bg-[#182330]/95 px-2.5 py-1.5 rounded-xl border border-slate-700/60">
          <span className="text-[10px] text-slate-300 block">تسبيحات اليوم</span>
          <span className="font-bold text-[#D4AF37] tabular-nums">
            {adhkarStats.todayDhikrCount} ذكر
          </span>
        </div>
      </div>

      {/* Last Adhkar Reading & Listening Spot Banners (Always visible & ready to record/play) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          onClick={handleResumeLastAdhkarRead}
          className="relative overflow-hidden w-full bg-gradient-to-r from-[#17212D] to-[#111720] border border-[#D4AF37]/35 rounded-2xl p-3 flex items-center justify-between text-right hover:border-[#D4AF37]/60 transition-all active:scale-[0.99] shadow-sm"
        >
          <RotatingCardBackground slot="adhkar" cardOffset={1} intervalMs={28000} opacity={0.28} />
          <div className="relative z-10 flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] shrink-0">
              <History size={16} />
            </div>
            <div className="truncate">
              <span className="text-[10px] text-[#D4AF37] font-semibold block">آخر موضع قراءة وعدّ بالأذكار</span>
              <h3 className="text-xs font-bold text-slate-100 truncate">
                {lastAdhkarRead
                  ? `${lastAdhkarRead.category === 'morning' ? 'أذكار الصباح' : 'أذكار المساء'} · الذكر ${lastAdhkarRead.dhikrIndex + 1} (${lastAdhkarRead.currentCount}/${lastAdhkarRead.targetCount})`
                  : `${activeCategory === 'morning' ? 'أذكار الصباح' : 'أذكار المساء'} · الذكر ١ (جاهز للحفظ)`}
              </h3>
            </div>
          </div>
          <ChevronLeft size={16} className="relative z-10 text-slate-300 shrink-0" />
        </button>

        <button
          onClick={handleResumeLastAdhkarAudio}
          className="relative overflow-hidden w-full bg-gradient-to-r from-[#12211C] to-[#101915] border border-emerald-500/35 rounded-2xl p-3 flex items-center justify-between text-right hover:border-emerald-500/60 transition-all active:scale-[0.99] shadow-sm"
        >
          <RotatingCardBackground slot="kaaba" cardOffset={2} intervalMs={25000} opacity={0.28} />
          <div className="relative z-10 flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0">
              <Headphones size={16} />
            </div>
            <div className="truncate">
              <span className="text-[10px] text-emerald-400 font-semibold block">آخر موضع استماع للأذكار</span>
              <h3 className="text-xs font-bold text-slate-100 truncate">
                {lastAdhkarAudio
                  ? `${lastAdhkarAudio.category === 'morning' ? 'أذكار الصباح' : 'أذكار المساء'} · الذكر ${lastAdhkarAudio.dhikrIndex + 1}`
                  : `${activeCategory === 'morning' ? 'أذكار الصباح' : 'أذكار المساء'} · الذكر ١ (جاهز للتسجيل)`}
              </h3>
            </div>
          </div>
          <span className="relative z-10 flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-lg shrink-0">
            <Play size={10} fill="currentColor" />
            <span>{lastAdhkarAudio ? 'استئناف' : 'ابدأ الآن'}</span>
          </span>
        </button>
      </div>

      {/* Elegant Category Tabs inside AdhkarView */}
      <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-[#121820] rounded-2xl border border-slate-800 text-xs">
        <button
          onClick={() => {
            setViewMode('adhkar');
            setActiveCategory('morning');
          }}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl font-bold transition-all ${
            viewMode === 'adhkar' && activeCategory === 'morning'
              ? 'bg-[#182330] text-[#D4AF37] shadow-sm border border-[#D4AF37]/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sun size={15} />
          <span>أذكار الصباح</span>
        </button>

        <button
          onClick={() => {
            setViewMode('adhkar');
            setActiveCategory('evening');
          }}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl font-bold transition-all ${
            viewMode === 'adhkar' && activeCategory === 'evening'
              ? 'bg-[#182330] text-[#D4AF37] shadow-sm border border-[#D4AF37]/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Moon size={15} />
          <span>أذكار المساء</span>
        </button>

        <button
          onClick={() => setViewMode('asma_allah')}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl font-bold transition-all ${
            viewMode === 'asma_allah'
              ? 'bg-[#182330] text-[#D4AF37] shadow-sm border border-[#D4AF37]/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles size={15} />
          <span>أسماء الله الحسنى</span>
        </button>
      </div>

      {viewMode === 'asma_allah' ? (
        /* Asma Allah Al-Husna View */
        <div className="space-y-3">
          <div className="relative overflow-hidden bg-gradient-to-r from-[#17222F] to-[#101620] border border-[#D4AF37]/40 rounded-2xl p-4 shadow-xl">
            <RotatingCardBackground slot="kaaba" cardOffset={2} intervalMs={25000} opacity={0.32} />
            <div className="relative z-10">
              <span className="text-[10px] text-[#D4AF37] font-bold block">﴿وَلِلَّهِ الْأَسْمَاءُ الْحُسْنَىٰ فَادْعُوهُ بِهَا﴾</span>
              <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                موسوعة أسماء الله الحسنى ومعانيها الإيمانية
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                تدبر معاني أسماء ربك الجليلة وادعُ الله بها وشاركها كبطاقة مصورة
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {ASMA_ALLAH_AL_HUSNA.map((item) => (
              <div
                key={item.id}
                className="relative overflow-hidden p-4 rounded-2xl bg-[#121922] border border-slate-800 hover:border-[#D4AF37]/40 space-y-2 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[#D4AF37] font-bold text-xs flex items-center justify-center font-mono">
                      {item.id}
                    </span>
                    <h4 className="font-quran text-xl font-bold text-[#D4AF37]">
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
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/30 text-[11px] font-bold transition-all"
                  >
                    <ImageIcon size={12} />
                    <span>بطاقة مصورة</span>
                  </button>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed">
                  {item.meaning}
                </p>

                <div className="p-2.5 rounded-xl bg-[#0E141C] border border-slate-800/80 text-[11px] text-emerald-300">
                  <strong className="text-[#D4AF37]">حظ المؤمن وثمرة الاسم: </strong>
                  {item.reflection}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Continuous Play All CTA Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-[#17222F] to-[#101620] border border-[#D4AF37]/40 rounded-2xl p-4 shadow-xl flex items-center justify-between">
            <RotatingCardBackground slot="kaaba" cardOffset={1} intervalMs={24000} opacity={0.34} />
            <div className="relative z-10">
              <span className="text-[10px] text-[#D4AF37] font-semibold block">
                إنجاز الورد: {completedCount} من {adhkarList.length} ({progressPercent}%)
              </span>
              <h3 className="text-sm font-bold text-slate-100">
                {activeCategory === 'morning' ? 'تشغيل أذكار الصباح كاملة' : 'تشغيل أذكار المساء كاملة'}
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                تكرار تلقائي لكل ذكر بعدده المأثور ومزامنة صوتية مع العداد تلقائياً
              </p>
            </div>

            <button
              onClick={() => handleOpenContinuousPlayer(0)}
              className="relative z-10 flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95 shrink-0"
            >
              <Play size={14} fill="currentColor" />
              <span>تشغيل الكل</span>
            </button>
          </div>

      {/* Adhkar Items List */}
      <div className="space-y-3">
        {adhkarList.map((dhikr, idx) => {
          const currentCount = counts[dhikr.id] || 0;
          const isDone = completedDhikrs.has(dhikr.id) || currentCount >= dhikr.count;
          const isPlayingThisDhikr = activeAudio?.category === 'adhkar' && activeAudio.dhikrId === dhikr.id && activeAudio.isPlaying;
          const isHighlighted = highlightedDhikrId === dhikr.id;

          return (
            <div
              key={dhikr.id}
              id={`dhikr-card-${dhikr.id}`}
              className={`relative overflow-hidden p-4 rounded-2xl border transition-all duration-300 ${
                isPlayingThisDhikr || isHighlighted
                  ? 'bg-[#172433] border-[#D4AF37] ring-2 ring-[#D4AF37]/50 shadow-lg'
                  : isDone
                  ? 'bg-[#111720]/70 border-emerald-800/40 opacity-95'
                  : 'bg-[#121922] border-slate-800 hover:border-slate-700'
              }`}
            >
              <RotatingCardBackground slot="adhkar" cardOffset={idx} intervalMs={27000 + (idx % 3) * 2000} opacity={0.22} />
              {/* Dhikr Card Top Bar */}
              <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-semibold text-slate-300">
                  الذكر {idx + 1} من {adhkarList.length}
                </span>

                <div className="flex items-center gap-1.5">
                  {/* Share Dhikr as Visual Card */}
                  <button
                    onClick={() =>
                      setShareCardPayload({
                        category: 'dhikr',
                        title: activeCategory === 'morning' ? 'من أذكار الصباح' : 'من أذكار المساء',
                        mainText: dhikr.arabicText,
                        sourceLabel: dhikr.count === 1 ? 'يُقال مرة واحدة' : `يُقال ${dhikr.count} مرات`,
                        subtitleOrTafsir: dhikr.fadl
                      })
                    }
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-emerald-500/20 text-emerald-400 border border-slate-700/70 transition-all"
                    title="مشاركة الذكر كبطاقة مصورة أنيقة"
                  >
                    <ImageIcon size={12} />
                  </button>

                  {/* Direct Listen Button on EACH Dhikr card */}
                  <button
                    onClick={(e) => handlePlayIndividualDhikr(e, dhikr, idx)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      isPlayingThisDhikr
                        ? 'bg-[#D4AF37] text-slate-950 shadow-sm'
                        : 'bg-slate-800/80 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30'
                    }`}
                    title="تشغيل هذا الذكر صوتياً بصوت الشيخ"
                    aria-label="تشغيل هذا الذكر صوتياً"
                  >
                    {isPlayingThisDhikr ? (
                      <>
                        <Pause size={12} fill="currentColor" />
                        <span>إيقاف</span>
                      </>
                    ) : (
                      <>
                        <Volume2 size={12} />
                        <span>استماع</span>
                      </>
                    )}
                  </button>

                  <span className="text-slate-500">·</span>
                  <span className="text-[#D4AF37] font-semibold">
                    {dhikr.count === 1 ? 'مرة واحدة' : `${dhikr.count} مرات`}
                  </span>
                </div>
              </div>

              {/* Dhikr Arabic Text */}
              <p className="relative z-10 font-quran text-base md:text-lg text-slate-100 leading-loose text-justify whitespace-pre-line py-1">
                {dhikr.arabicText}
              </p>

              {/* Fadl / Virtue Box */}
              <div className="relative z-10 mt-2.5 p-2.5 rounded-xl bg-slate-900/75 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                <span className="text-[#D4AF37] font-medium block mb-0.5">الفضل والأثر:</span>
                {dhikr.fadl}
              </div>

              {/* Bottom Interactive Repetition Counter */}
              <div className="relative z-10 mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <button
                  onClick={() => handleResetDhikr(dhikr.id)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800/50 text-xs transition-colors"
                  title="إعادة ضبط العداد"
                  aria-label="إعادة ضبط العداد"
                >
                  <RotateCcw size={14} />
                </button>

                {/* Main Tap Counter Button */}
                <button
                  onClick={() => handleIncrementCount(dhikr)}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                    isDone
                      ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/50'
                      : 'bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-slate-700'
                  }`}
                >
                  {isDone ? (
                    <>
                      <CheckCircle2 size={16} />
                      <span>تم الإتمام ({dhikr.count}/{dhikr.count})</span>
                    </>
                  ) : (
                    <>
                      <span>اضغط للعد:</span>
                      <span className="text-[#D4AF37] text-sm tabular-nums">
                        {currentCount} / {dhikr.count}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
        </>
      )}

      {/* Adhkar Achievements Modal */}
      {isAchievementsOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-3 animate-fadeIn">
          <div className="bg-[#101620] border border-[#D4AF37]/40 rounded-3xl p-5 max-w-md w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-slate-100">
                <Award size={20} className="text-[#D4AF37]" />
                <h3 className="font-bold text-base">سجل الإنجاز والمواظبة على الذكر</h3>
              </div>
              <button
                onClick={() => setIsAchievementsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800/60"
              >
                <X size={16} />
              </button>
            </div>

            {/* Stats Dashboard Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#141C26] p-3 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">المواظبة الحالية</span>
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-lg">
                  <Flame size={18} />
                  <span>{adhkarStats.currentStreak} أيام</span>
                </div>
                <span className="text-[9px] text-slate-500 mt-1 block">أطول سلسلة: {adhkarStats.longestStreak} يوم</span>
              </div>

              <div className="bg-[#141C26] p-3 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">تسبيحات اليوم</span>
                <div className="text-[#D4AF37] font-bold text-lg">
                  {adhkarStats.todayDhikrCount} ذكر
                </div>
                <span className="text-[9px] text-slate-500 mt-1 block">الإجمالي: {adhkarStats.totalDhikrRecited} ذكر</span>
              </div>
            </div>

            {/* Badges List */}
            <div className="space-y-2 pt-1">
              <h4 className="text-xs font-bold text-slate-200">أوسمة الإنجاز والهمة</h4>
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
                          ? 'bg-emerald-950/20 border-emerald-600/40 text-slate-200'
                          : 'bg-[#141B24]/60 border-slate-800/80 text-slate-400'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        unlocked
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-500'
                      }`}>
                        <Icon size={18} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-slate-100">{badge.title}</h5>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                            unlocked
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {unlocked ? 'منجز ✓' : `${pct}%`}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{badge.desc}</p>
                        
                        {!unlocked && (
                          <div className="w-full bg-slate-800 rounded-full h-1 mt-1.5 overflow-hidden">
                            <div
                              className="bg-[#D4AF37] h-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
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
        adhkarList={adhkarList}
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
