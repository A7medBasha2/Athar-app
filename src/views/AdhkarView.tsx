import React, { useState, useEffect } from 'react';
import { MORNING_ADHKAR, EVENING_ADHKAR } from '../data/adhkarData';
import { AdhkarCategory, DhikrItem, NavigationTab, AdhkarStats } from '../types';
import { StorageService } from '../services/storageService';
import { AudioService, ActiveAudioState } from '../services/audioService';
import { AdhkarPlayerSheet } from '../components/AdhkarPlayerSheet';
import { RotatingCardBackground } from '../components/RotatingCardBackground';
import { 
  Sun, Moon, Play, Pause, CheckCircle2, RotateCcw, 
  Volume2, Heart, Award, Flame, Trophy, ShieldCheck, X
} from 'lucide-react';

interface AdhkarViewProps {
  onNavigate?: (tab: NavigationTab) => void;
}

export const AdhkarView: React.FC<AdhkarViewProps> = ({ onNavigate }) => {
  const [activeCategory, setActiveCategory] = useState<AdhkarCategory>('morning');
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [completedDhikrs, setCompletedDhikrs] = useState<Set<number>>(new Set());
  const [isPlayerOpen, setIsPlayerOpen] = useState<boolean>(false);
  const [playerStartIndex, setPlayerStartIndex] = useState<number>(0);
  const [activeAudio, setActiveAudio] = useState<ActiveAudioState | null>(null);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState<boolean>(false);
  const [adhkarStats, setAdhkarStats] = useState<AdhkarStats>(StorageService.getAdhkarStats());

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
      }
    });
    return () => unsub();
  }, [activeCategory]);

  const handleIncrementCount = (dhikr: DhikrItem) => {
    const current = counts[dhikr.id] || 0;
    const next = current + 1;
    StorageService.setDhikrCount(activeCategory, dhikr.id, Math.min(next, dhikr.count));
    const newStats = StorageService.recordDhikrStep(activeCategory, dhikr.id, dhikr.count);
    setAdhkarStats(newStats);

    if (next >= dhikr.count) {
      setCounts(prev => ({ ...prev, [dhikr.id]: dhikr.count }));
      setCompletedDhikrs(prev => {
        const nextSet = new Set([...prev, dhikr.id]);
        StorageService.saveAdhkarProgress({
          category: activeCategory,
          currentIndex: adhkarList.findIndex(d => d.id === dhikr.id),
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

        <button
          onClick={() => setIsAchievementsOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#17222F] hover:bg-[#1E2C3D] border border-[#D4AF37]/40 rounded-xl text-xs text-[#D4AF37] font-bold transition-all shadow active:scale-95"
          title="عرض سجل الإنجاز والمواظبة"
        >
          <Flame size={14} className="text-amber-400" />
          <span>{adhkarStats.currentStreak} أيام</span>
        </button>
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

      {/* Category Toggle: Morning and Evening Adhkar */}
      <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#121820] rounded-2xl border border-slate-800 text-xs">
        <button
          onClick={() => setActiveCategory('morning')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold transition-all ${
            activeCategory === 'morning'
              ? 'bg-[#182330] text-[#D4AF37] shadow-sm border border-[#D4AF37]/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sun size={16} className={activeCategory === 'morning' ? 'text-[#D4AF37]' : ''} />
          <span>أذكار الصباح ({completedCount}/{adhkarList.length})</span>
        </button>

        <button
          onClick={() => setActiveCategory('evening')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold transition-all ${
            activeCategory === 'evening'
              ? 'bg-[#182330] text-[#D4AF37] shadow-sm border border-[#D4AF37]/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Moon size={16} className={activeCategory === 'evening' ? 'text-[#D4AF37]' : ''} />
          <span>أذكار المساء</span>
        </button>
      </div>

      {/* Continuous Play All CTA Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#17222F] to-[#101620] border border-[#D4AF37]/40 rounded-2xl p-4 shadow-xl flex items-center justify-between">
        <RotatingCardBackground slot="kaaba" cardOffset={1} intervalMs={24000} opacity={0.34} />
        <div className="relative z-10">
          <span className="text-[10px] text-[#D4AF37] font-semibold block">استماع بصوت مشايخ معتمدين</span>
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

          return (
            <div
              key={dhikr.id}
              className={`relative overflow-hidden p-4 rounded-2xl border transition-all duration-200 ${
                isPlayingThisDhikr
                  ? 'bg-[#172433] border-[#D4AF37] ring-1 ring-[#D4AF37]/40 shadow-lg'
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

                <div className="flex items-center gap-2">
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
    </div>
  );
};
