import React, { useState, useEffect } from 'react';
import { QuranKhatmahState, AdhkarStats, PrayerAchievementsState } from '../types';
import { StorageService } from '../services/storageService';
import { 
  X, Trophy, Award, Flame, BookOpen, Heart, 
  CheckCircle2, Clock, ShieldCheck, Sun, Moon, ChevronLeft,
  Share2, Copy, Sparkles, Check
} from 'lucide-react';

interface AchievementsOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToQuran?: () => void;
  onNavigateToAdhkar?: () => void;
  onNavigateToPrayers?: () => void;
}

export const AchievementsOverviewModal: React.FC<AchievementsOverviewModalProps> = ({
  isOpen,
  onClose,
  onNavigateToQuran,
  onNavigateToAdhkar,
  onNavigateToPrayers
}) => {
  const [khatmah, setKhatmah] = useState<QuranKhatmahState>(StorageService.getQuranKhatmah());
  const [adhkarStats, setAdhkarStats] = useState<AdhkarStats>(StorageService.getAdhkarStats());
  const [prayerAchievements, setPrayerAchievements] = useState<PrayerAchievementsState>(StorageService.getPrayerAchievements());
  const [activeTab, setActiveTab] = useState<'all' | 'quran' | 'prayers' | 'adhkar'>('all');
  const [shareSuccessToast, setShareSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setKhatmah(StorageService.getQuranKhatmah());
      setAdhkarStats(StorageService.getAdhkarStats());
      setPrayerAchievements(StorageService.getPrayerAchievements());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const khatmahPercent = Math.round(((khatmah.completedSurahs?.length || 0) / 114) * 100);

  const badges = [
    // Prayer badges
    {
      id: 'fajr_guardian',
      category: 'prayers',
      title: 'فجر الأبرار',
      desc: 'أداء صلاة الفجر في وقتها المبارك',
      target: 1,
      current: prayerAchievements.todayPrayers.fajr ? 1 : 0,
      isUnlocked: !!prayerAchievements.todayPrayers.fajr,
      icon: Sun
    },
    {
      id: 'five_daily',
      category: 'prayers',
      title: 'المحافظ على الصلوات',
      desc: 'أداء الصلوات الخمس المكتوبة كاملة اليوم',
      target: 5,
      current: [
        prayerAchievements.todayPrayers.fajr,
        prayerAchievements.todayPrayers.dhuhr,
        prayerAchievements.todayPrayers.asr,
        prayerAchievements.todayPrayers.maghrib,
        prayerAchievements.todayPrayers.isha,
      ].filter(Boolean).length,
      isUnlocked: !!(prayerAchievements.todayPrayers.fajr && prayerAchievements.todayPrayers.dhuhr && prayerAchievements.todayPrayers.asr && prayerAchievements.todayPrayers.maghrib && prayerAchievements.todayPrayers.isha),
      icon: Clock
    },
    {
      id: 'sunan_reviver',
      category: 'prayers',
      title: 'محيي السنن',
      desc: 'المواظبة على السنن الرواتب',
      target: 1,
      current: prayerAchievements.todayPrayers.sunan ? 1 : 0,
      isUnlocked: !!prayerAchievements.todayPrayers.sunan,
      icon: Award
    },
    {
      id: 'qiyam_light',
      category: 'prayers',
      title: 'نور الليل',
      desc: 'أداء قيام الليل والوتر المبارك',
      target: 1,
      current: prayerAchievements.todayPrayers.qiyam ? 1 : 0,
      isUnlocked: !!prayerAchievements.todayPrayers.qiyam,
      icon: Moon
    },
    {
      id: 'streak_3_prayers',
      category: 'prayers',
      title: 'ثبات الصلاة 3 أيام',
      desc: 'المحافظة على الصلوات 3 أيام متتالية',
      target: 3,
      current: prayerAchievements.streakDays,
      isUnlocked: prayerAchievements.streakDays >= 3,
      icon: Flame
    },
    // Adhkar badges
    {
      id: 'first_dhikr',
      category: 'adhkar',
      title: 'بداية الخير',
      desc: 'إتمام أول ذكر بالعد أو الاستماع',
      target: 1,
      current: adhkarStats.totalDhikrRecited,
      isUnlocked: adhkarStats.totalDhikrRecited >= 1,
      icon: Heart
    },
    {
      id: 'streak_3',
      category: 'adhkar',
      title: 'مواظبة 3 أيام',
      desc: 'الحفاظ على الأذكار 3 أيام متتالية',
      target: 3,
      current: adhkarStats.currentStreak,
      isUnlocked: adhkarStats.currentStreak >= 3,
      icon: Flame
    },
    {
      id: 'streak_7',
      category: 'adhkar',
      title: 'أسبوع النور',
      desc: 'الحفاظ على الأذكار 7 أيام متتالية',
      target: 7,
      current: adhkarStats.currentStreak,
      isUnlocked: adhkarStats.currentStreak >= 7,
      icon: Trophy
    },
    {
      id: 'hundred_club',
      category: 'adhkar',
      title: 'مئوية الذكر',
      desc: 'إتمام 100 تسبيحة وذكر',
      target: 100,
      current: adhkarStats.totalDhikrRecited,
      isUnlocked: adhkarStats.totalDhikrRecited >= 100,
      icon: Award
    },
    {
      id: 'morning_guard',
      category: 'adhkar',
      title: 'حارس الصباح',
      desc: 'إتمام أذكار الصباح كاملة',
      target: 1,
      current: adhkarStats.totalMorningSessions,
      isUnlocked: adhkarStats.totalMorningSessions >= 1,
      icon: Sun
    },
    {
      id: 'evening_guard',
      category: 'adhkar',
      title: 'حارس المساء',
      desc: 'إتمام أذكار المساء كاملة',
      target: 1,
      current: adhkarStats.totalEveningSessions,
      isUnlocked: adhkarStats.totalEveningSessions >= 1,
      icon: Moon
    },
    // Quran badges
    {
      id: 'first_surah',
      category: 'quran',
      title: 'فاتحة الختمة',
      desc: 'إتمام قراءة أول سورة في الختمة',
      target: 1,
      current: khatmah.completedSurahs?.length || 0,
      isUnlocked: (khatmah.completedSurahs?.length || 0) >= 1,
      icon: BookOpen
    },
    {
      id: 'quarter_khatmah',
      category: 'quran',
      title: 'ربع الختمة',
      desc: 'إتمام 28 سورة من القرآن الكريم',
      target: 28,
      current: khatmah.completedSurahs?.length || 0,
      isUnlocked: (khatmah.completedSurahs?.length || 0) >= 28,
      icon: Award
    },
    {
      id: 'half_khatmah',
      category: 'quran',
      title: 'نصف الختمة المباركة',
      desc: 'إتمام 57 سورة من القرآن الكريم',
      target: 57,
      current: khatmah.completedSurahs?.length || 0,
      isUnlocked: (khatmah.completedSurahs?.length || 0) >= 57,
      icon: Trophy
    },
    {
      id: 'full_khatmah',
      category: 'quran',
      title: 'ختمة القرآن الكاملة',
      desc: 'إتمام جميع سور القرآن الكريم (114 سورة)',
      target: 114,
      current: khatmah.completedSurahs?.length || 0,
      isUnlocked: (khatmah.completedSurahs?.length || 0) >= 114,
      icon: ShieldCheck
    }
  ];

  const filteredBadges = activeTab === 'all' 
    ? badges 
    : badges.filter(b => b.category === activeTab);

  const unlockedCount = badges.filter(b => b.isUnlocked).length;

  const handleShareAchievements = async () => {
    const textToShare = `✨ إنجازاتي الإيمانية في تطبيق "أثر" المبارك ✨\n` +
      `﴿وَفِي ذَٰلِكَ فَلْيَتَنَافَسِ الْمُتَنَافِسُونَ﴾\n\n` +
      `📖 الختمة القرآنية: ${khatmahPercent}% (سورة ${khatmah.completedSurahs?.length || 0}/114)\n` +
      `🎧 استماع القرآن اليوم: ${khatmah.todayMinutesListened} دقيقة (إجمالي: ${khatmah.totalMinutesListenedOverall} دقيقة)\n` +
      `🕌 مواظبة الصلوات: ${prayerAchievements.streakDays} أيام متتالية\n` +
      `🤍 الأذكار والتسبيح: ${adhkarStats.totalDhikrRecited} ذكر (مواظبة ${adhkarStats.currentStreak} أيام)\n` +
      `🏆 إجمالي الأوسمة المحققة: ${unlockedCount} وسام\n\n` +
      `اللهم تقبل وثبّتنا على طاعتك 🤲`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'إنجازاتي في تطبيق أثر',
          text: textToShare
        });
        setShareSuccessToast('تمت مشاركة الإنجاز بنجاح ✓');
        setTimeout(() => setShareSuccessToast(null), 3000);
        return;
      } catch {}
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(textToShare);
      setShareSuccessToast('تم نسخ ملخص إنجازاتك بنجاح لمشاركتها مع أحبابك ✓');
      setTimeout(() => setShareSuccessToast(null), 3500);
    } catch {
      setShareSuccessToast('تعذر النسخ، يرجى المحاولة لاحقاً');
      setTimeout(() => setShareSuccessToast(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-[#0E141B] border border-slate-800 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col text-slate-100">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
              <Trophy size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">مركز الإنجازات الشامل</h2>
              <p className="text-[10px] text-slate-400">القرآن الكريم، الصلوات المكتوبة، والأذكار المعتمدة</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Share button */}
            <button
              onClick={handleShareAchievements}
              className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-[#D4AF37] to-[#B69324] text-slate-950 font-bold rounded-xl text-xs shadow active:scale-95 transition-all"
              title="مشاركة إنجازاتك"
            >
              <Share2 size={13} />
              <span>مشاركة</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Share Toast */}
        {shareSuccessToast && (
          <div className="mx-4 mt-3 p-3 bg-emerald-950/70 border border-emerald-500/50 rounded-2xl flex items-center gap-2 text-xs text-emerald-300 animate-slideDown shadow-lg">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{shareSuccessToast}</span>
          </div>
        )}

        {/* Tab Controls (4 tabs) */}
        <div className="px-4 pt-3 grid grid-cols-4 gap-1.5 text-xs">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'quran', label: 'القرآن' },
            { id: 'prayers', label: 'الصلاة' },
            { id: 'adhkar', label: 'الأذكار' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`py-1.5 rounded-xl font-bold border transition-all text-center ${
                activeTab === t.id
                  ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]'
                  : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4">
          {/* Top High-Level Metrics Summary */}
          {(activeTab === 'all' || activeTab === 'quran') && (
            <div className="bg-gradient-to-br from-[#182330] to-[#101720] border border-[#D4AF37]/35 rounded-2xl p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#D4AF37]/15 rounded-xl text-[#D4AF37]">
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-100">الختمة القرآنية رقم {khatmah.khatmahNumber}</h3>
                    <span className="text-[10px] text-slate-400">السور المنجزة: {khatmah.completedSurahs?.length || 0} من 114</span>
                  </div>
                </div>

                <span className="text-base font-bold text-[#D4AF37] font-mono tabular-nums">
                  {khatmahPercent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#D4AF37] to-[#F3DB7B] h-full transition-all duration-300"
                  style={{ width: `${khatmahPercent}%` }}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                <div className="bg-[#131C26] p-2.5 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block mb-0.5">تلاوة اليوم</span>
                  <div className="font-bold text-[#D4AF37] text-sm tabular-nums">
                    {khatmah.totalAyahsReadToday} آية
                  </div>
                </div>
                <div className="bg-[#131C26] p-2.5 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block mb-0.5">استماع اليوم</span>
                  <div className="font-bold text-emerald-400 text-sm tabular-nums">
                    {khatmah.todayMinutesListened} دقيقة
                  </div>
                </div>
                <div className="bg-[#131C26] p-2.5 rounded-xl border border-slate-700/60 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 block mb-0.5">إجمالي الاستماع</span>
                  <div className="font-bold text-cyan-400 text-sm tabular-nums">
                    {khatmah.totalMinutesListenedOverall} دقيقة
                  </div>
                </div>
              </div>

              {onNavigateToQuran && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToQuran();
                  }}
                  className="w-full pt-1 text-[11px] font-bold text-[#D4AF37] hover:underline flex items-center justify-center gap-1"
                >
                  <span>عرض تفاصيل السور والختمة في المصحف</span>
                  <ChevronLeft size={13} />
                </button>
              )}
            </div>
          )}

          {/* Prayer Achievements Summary Card */}
          {(activeTab === 'all' || activeTab === 'prayers') && (
            <div className="bg-gradient-to-br from-[#17202B] to-[#0E151E] border border-cyan-500/35 rounded-2xl p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-cyan-500/15 rounded-xl text-cyan-400">
                    <Clock size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-100">إنجاز الصلوات المكتوبة</h3>
                    <span className="text-[10px] text-slate-400">المحافظة في أوقاتها</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-cyan-400 font-bold text-xs bg-cyan-500/10 px-2.5 py-1 rounded-xl border border-cyan-500/20">
                  <Flame size={14} className="fill-cyan-400 text-cyan-400" />
                  <span>{prayerAchievements.streakDays} أيام متتالية</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#101924] p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">صلوات اليوم المسجلة</span>
                  <div className="font-bold text-cyan-300 text-sm tabular-nums">
                    {[
                      prayerAchievements.todayPrayers.fajr,
                      prayerAchievements.todayPrayers.dhuhr,
                      prayerAchievements.todayPrayers.asr,
                      prayerAchievements.todayPrayers.maghrib,
                      prayerAchievements.todayPrayers.isha,
                    ].filter(Boolean).length} من 5 صلوات
                  </div>
                </div>
                <div className="bg-[#101924] p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">إجمالي الصلوات المسجلة</span>
                  <div className="font-bold text-slate-200 text-sm tabular-nums">
                    {prayerAchievements.totalPrayersLogged} صلاة
                  </div>
                </div>
              </div>

              {onNavigateToPrayers && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToPrayers();
                  }}
                  className="w-full pt-1 text-[11px] font-bold text-cyan-400 hover:underline flex items-center justify-center gap-1"
                >
                  <span>فتح شاشة مواقيت الصلاة لتسجيل الصلوات</span>
                  <ChevronLeft size={13} />
                </button>
              )}
            </div>
          )}

          {/* Adhkar & Streak Summary Card */}
          {(activeTab === 'all' || activeTab === 'adhkar') && (
            <div className="bg-gradient-to-br from-[#1C1622] to-[#120F16] border border-rose-500/35 rounded-2xl p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-500/15 rounded-xl text-rose-400">
                    <Heart size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-100">إنجاز الأذكار والتسبيح</h3>
                    <span className="text-[10px] text-slate-400">سلسلة المواظبة اليومية</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-amber-400 font-bold text-xs bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
                  <Flame size={14} className="fill-amber-400 text-amber-400" />
                  <span>{adhkarStats.currentStreak} أيام متتالية</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#18121E] p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">تسبيحات اليوم</span>
                  <div className="font-bold text-rose-300 text-sm tabular-nums">
                    {adhkarStats.todayDhikrCount} ذكر
                  </div>
                </div>
                <div className="bg-[#18121E] p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">إجمالي الأذكار</span>
                  <div className="font-bold text-slate-200 text-sm tabular-nums">
                    {adhkarStats.totalDhikrRecited} ذكر
                  </div>
                </div>
              </div>

              {onNavigateToAdhkar && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToAdhkar();
                  }}
                  className="w-full pt-1 text-[11px] font-bold text-rose-400 hover:underline flex items-center justify-center gap-1"
                >
                  <span>فتح أذكار الصباح والمساء</span>
                  <ChevronLeft size={13} />
                </button>
              )}
            </div>
          )}

          {/* Badges Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200">الأوسمة والشارات المكتسبة:</span>
              <span className="text-amber-400 font-bold text-[11px]">
                {unlockedCount} من {badges.length} وسام
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredBadges.map((b) => {
                const Icon = b.icon;
                const percent = b.target > 0 
                  ? Math.min(100, Math.max(0, Math.round(((b.current || 0) / b.target) * 100))) 
                  : 100;
                return (
                  <div
                    key={b.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                      b.isUnlocked
                        ? 'bg-amber-950/20 border-amber-500/40 text-slate-200 shadow-sm'
                        : 'bg-[#121820]/70 border-slate-800 text-slate-400 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          b.isUnlocked
                            ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-bold shadow'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1">
                          <h4 className="text-xs font-bold text-slate-100 truncate">{b.title}</h4>
                          {b.isUnlocked && <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">{b.desc}</p>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <span className="text-[10px] font-bold tabular-nums block text-slate-300">
                        {b.current}/{b.target}
                      </span>
                      <span className={`text-[9px] font-semibold ${b.isUnlocked ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {b.isUnlocked ? 'مكتمل ✓' : `${percent}%`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

