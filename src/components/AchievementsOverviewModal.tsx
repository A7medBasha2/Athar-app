import React, { useState, useEffect } from 'react';
import { 
  QuranKhatmahState, AdhkarStats, DailyWirdConfig, 
  PrayerAchievementsState, FastingTrackerState, SadaqahRecord 
} from '../types';
import { StorageService } from '../services/storageService';
import { 
  X, Trophy, Award, Sparkles, BookOpen, Heart, 
  Sun, Moon, Coins, Calendar, CheckCircle2, Flame 
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
  onClose
}) => {
  const [khatmah, setKhatmah] = useState<QuranKhatmahState>(() => StorageService.getQuranKhatmah());
  const [adhkarStats, setAdhkarStats] = useState<AdhkarStats>(() => StorageService.getAdhkarStats());
  const [wird, setWird] = useState<DailyWirdConfig>(() => StorageService.getDailyWirdConfig());
  const [prayerAch, setPrayerAch] = useState<PrayerAchievementsState>(() => StorageService.getPrayerAchievements());
  const [fasting, setFasting] = useState<FastingTrackerState>(() => StorageService.getFastingTracker());
  const [sadaqah, setSadaqah] = useState<SadaqahRecord[]>(() => StorageService.getSadaqahRecords());

  useEffect(() => {
    if (isOpen) {
      setKhatmah(StorageService.getQuranKhatmah());
      setAdhkarStats(StorageService.getAdhkarStats());
      setWird(StorageService.getDailyWirdConfig());
      setPrayerAch(StorageService.getPrayerAchievements());
      setFasting(StorageService.getFastingTracker());
      setSadaqah(StorageService.getSadaqahRecords());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const khatmahPercent = Math.round(((khatmah.completedSurahs?.length || 0) / 114) * 100);
  const totalSadaqahAmount = sadaqah.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalAdhkarSessions = (adhkarStats.totalMorningSessions || 0) + (adhkarStats.totalEveningSessions || 0);

  // Spiritual Badges / Medals Calculation
  const badges = [
    {
      id: 'prayer_guardian',
      title: 'حارس الصلوات الخمس',
      desc: 'إتمام الصلوات الخمس المفروضة في يومك',
      unlocked: prayerAch.totalPrayersLogged >= 5,
      progressLabel: `${prayerAch.totalPrayersLogged} صلاة مسجلة`,
      icon: Sun
    },
    {
      id: 'quran_companion',
      title: 'صاحب القرآن المرتل',
      desc: 'قراءة أو استماع آيات من المصحف الشريف بانتظام',
      unlocked: khatmah.totalAyahsReadOverall >= 20 || khatmah.totalMinutesListenedOverall >= 10,
      progressLabel: `${khatmah.totalAyahsReadOverall} آية · ${khatmah.totalMinutesListenedOverall} د استماع`,
      icon: BookOpen
    },
    {
      id: 'dhikr_fortress',
      title: 'الحصن الحصين بالذكر',
      desc: 'المواظبة على أذكار الصباح والمساء والتسبيح',
      unlocked: totalAdhkarSessions >= 1 || adhkarStats.totalDhikrRecited >= 100,
      progressLabel: `${adhkarStats.totalDhikrRecited} تسبيحة · ${totalAdhkarSessions} ورد`,
      icon: Heart
    },
    {
      id: 'fasting_rayyan',
      title: 'أهل باب الريان',
      desc: 'صيام النوافل والاثنين والخميس والأيام البيض',
      unlocked: fasting.totalFastedDays >= 1,
      progressLabel: `${fasting.totalFastedDays} يوم صيام`,
      icon: Moon
    },
    {
      id: 'charity_blessing',
      title: 'بركة الإنفاق والصدقة',
      desc: 'تدوين الصدقات الخفية والزكاة في سجل الأثر',
      unlocked: sadaqah.length >= 1,
      progressLabel: `${sadaqah.length} صدقة مدونة`,
      icon: Coins
    },
    {
      id: 'wird_steadfast',
      title: 'أحب الأعمال أدومها',
      desc: 'المواظبة المستمرة على الورد القرآني اليومي',
      unlocked: wird.completedTodayCount >= 1 || (khatmah.completedSurahs?.length || 0) >= 1,
      progressLabel: `${wird.completedTodayCount} ورد اليوم`,
      icon: Award
    }
  ];

  const unlockedCount = badges.filter(b => b.unlocked).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-fadeIn">
      <div className="w-full max-w-lg bg-gradient-to-b from-[#17140D] via-[#0E0D0A] to-[#080705] border-t sm:border border-[#C8A24A]/55 rounded-t-3xl sm:rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex flex-col max-h-[92vh] overflow-y-auto text-right">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#1F1A10] border border-[#C8A24A]/50 text-[#E6C66E] flex items-center justify-center shadow-[0_0_15px_rgba(200,162,74,0.2)]">
              <Trophy size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#F3E5AB]">لوحة الأثر والأوسمة الإيمانية</h2>
              <p className="text-[11px] text-[#C4B998]">حصاد طاعاتك من الصلاة والقرآن والذكر والصدقات</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#18150E] hover:bg-[#241F14] text-[#C4B998] hover:text-white border border-[#C8A24A]/35 transition-colors"
            title="إغلاق"
            aria-label="إغلاق لوحة الأوسمة"
          >
            <X size={16} />
          </button>
        </div>

        {/* Hero Summary Banner */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-[#231D11] via-[#15120B] to-[#231D11] border border-[#E6C66E]/50 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] font-bold text-[#E6C66E] flex items-center gap-1">
              <Sparkles size={12} />
              <span>رصيد الأوسمة المكتسبة</span>
            </span>
            <h3 className="text-xl font-black text-[#F3E5AB] mt-0.5">
              {unlockedCount} من {badges.length} أوسمة مباركة
            </h3>
            <p className="text-[11px] text-[#C4B998] mt-0.5">
              ﴿وَفِي ذَٰلِكَ فَلْيَتَنَافَسِ الْمُتَنَافِسُونَ﴾
            </p>
          </div>

          <div className="flex flex-col items-center justify-center bg-[#14120D] border border-[#C8A24A]/45 rounded-2xl px-3.5 py-2">
            <Flame size={20} className="text-[#E6C66E]" />
            <span className="text-sm font-black text-white font-mono mt-0.5">
              {Math.max(prayerAch.streakDays, adhkarStats.currentStreak, khatmah.readingStreakDays)}ي
            </span>
            <span className="text-[9px] text-[#C4B998]">أطول مواظبة</span>
          </div>
        </div>

        {/* 4 Key Metrics Grid */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-[#14120D] border border-[#C8A24A]/30 rounded-2xl p-3 text-center">
            <span className="text-[10px] text-[#C4B998] block">الصلوات والسنن</span>
            <span className="text-base font-black text-[#F3E5AB] font-mono block mt-0.5">
              {prayerAch.totalPrayersLogged}
            </span>
            <span className="text-[9px] text-[#E6C66E] block">{prayerAch.todayPrayers.sunan ? 'مع السنن الرواتب ✓' : 'مواظبة يومية'}</span>
          </div>

          <div className="bg-[#14120D] border border-[#C8A24A]/30 rounded-2xl p-3 text-center">
            <span className="text-[10px] text-[#C4B998] block">الختمة القرآنية</span>
            <span className="text-base font-black text-[#E6C66E] font-mono block mt-0.5">
              {khatmahPercent}%
            </span>
            <span className="text-[9px] text-[#C4B998] block">{khatmah.completedSurahs?.length || 0}/114 سورة</span>
          </div>

          <div className="bg-[#14120D] border border-[#C8A24A]/30 rounded-2xl p-3 text-center">
            <span className="text-[10px] text-[#C4B998] block">مجموع التسبيحات</span>
            <span className="text-base font-black text-[#F3E5AB] font-mono block mt-0.5">
              {adhkarStats.totalDhikrRecited}
            </span>
            <span className="text-[9px] text-[#E6C66E] block">اليوم: {adhkarStats.todayDhikrCount}</span>
          </div>

          <div className="bg-[#14120D] border border-[#C8A24A]/30 rounded-2xl p-3 text-center">
            <span className="text-[10px] text-[#C4B998] block">أيام الصيام</span>
            <span className="text-base font-black text-[#E6C66E] font-mono block mt-0.5">
              {fasting.totalFastedDays}
            </span>
            <span className="text-[9px] text-[#C4B998] block">تقبل الله طاعتك</span>
          </div>
        </div>

        {/* Spiritual Badges List */}
        <div className="mt-4 space-y-2.5">
          <h4 className="text-xs font-extrabold text-[#F3E5AB] flex items-center gap-1.5">
            <Award size={14} className="text-[#E6C66E]" />
            <span>الأوسمة الإيمانية ومقامات السير إلى الله:</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {badges.map((badge) => {
              const Icon = badge.icon;
              return (
                <div
                  key={badge.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                    badge.unlocked
                      ? 'bg-gradient-to-br from-[#1E1910] to-[#12100B] border-[#C8A24A]/55 shadow-md'
                      : 'bg-[#12100C]/70 border-[#C8A24A]/20 opacity-75'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl border shrink-0 ${
                    badge.unlocked
                      ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#E6C66E]'
                      : 'bg-[#18150E] border-[#C8A24A]/25 text-[#8E8268]'
                  }`}>
                    <Icon size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h5 className="text-xs font-extrabold text-[#F3E5AB] truncate">
                        {badge.title}
                      </h5>
                      {badge.unlocked && (
                        <CheckCircle2 size={13} className="text-[#E6C66E] shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-[#C4B998] mt-0.5 leading-relaxed">
                      {badge.desc}
                    </p>
                    <span className="inline-block mt-1.5 text-[10px] font-bold text-[#E6C66E] bg-[#C8A24A]/15 px-2 py-0.5 rounded-md border border-[#C8A24A]/30">
                      {badge.progressLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-[#C8A24A]/25 flex items-center justify-between text-[11px] text-[#C4B998]">
          <span className="flex items-center gap-1">
            <Calendar size={12} className="text-[#E6C66E]" />
            <span>يُحفظ سجلك الإيماني محلياً على جهازك</span>
          </span>
          {totalSadaqahAmount > 0 && (
            <span className="text-[#E6C66E] font-bold">
              الصدقات المدونة: {totalSadaqahAmount.toLocaleString('ar-EG')}
            </span>
          )}
        </div>

      </div>
    </div>
  );
};
