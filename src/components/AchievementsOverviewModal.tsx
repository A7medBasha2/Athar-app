import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { ImpactTreeService, ImpactBreakdown } from '../services/impactTreeService';
import { 
  QuranKhatmahState, PrayerAchievementsState, AdhkarStats, 
  FastingTrackerState, SadaqahRecord 
} from '../types';
import { 
  X, Trophy, BookOpen, Clock, Award, CheckCircle2, 
  Flame, Download, Upload, ChevronLeft, Sparkles, Heart,
  Compass, Check, Calendar, AlertCircle
} from 'lucide-react';

interface AchievementsOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToQuran?: () => void;
  onNavigateToAdhkar?: () => void;
  onNavigateToPrayers?: () => void;
}

interface BadgeItem {
  id: string;
  title: string;
  description: string;
  category: 'adhkar' | 'prayers';
  icon: string;
}

const ALL_SYSTEM_BADGES: BadgeItem[] = [
  {
    id: 'fajr_guardian',
    title: 'حارس الفجر',
    description: 'أداء صلاة الفجر في وقتها ومحافظة عليها',
    category: 'prayers',
    icon: '🌅',
  },
  {
    id: 'five_daily',
    title: 'الصلوات الخمس',
    description: 'إتمام الصلوات الخمس المفروضة في اليوم كاملاً',
    category: 'prayers',
    icon: '🕌',
  },
  {
    id: 'sunan_reviver',
    title: 'محيي السنن',
    description: 'المحافظة على السنن الرواتب وصلاة الضحى',
    category: 'prayers',
    icon: '✨',
  },
  {
    id: 'qiyam_light',
    title: 'نور قيام الليل',
    description: 'القيام في الثلث الأخير من الليل وصلاة الوتر',
    category: 'prayers',
    icon: '🌙',
  },
  {
    id: 'streak_7_prayers',
    title: 'سلسلة الأسبوع المبارك',
    description: 'المواظبة على الصلوات ٧ أيام متتالية دون انقطاع',
    category: 'prayers',
    icon: '🔥',
  },
  {
    id: 'prayers_50',
    title: '٥٠ صلاة مباركة',
    description: 'تسجيل ٥٠ صلاة مفروضة في التطبيق',
    category: 'prayers',
    icon: '🎖️',
  },
  {
    id: 'first_dhikr',
    title: 'بداية الأثر الطيب',
    description: 'أول تسبيح وذكر تم تسجيله في التطبيق',
    category: 'adhkar',
    icon: '🌱',
  },
  {
    id: 'morning_guard',
    title: 'حارس الصباح',
    description: 'إتمام أذكار الصباح كاملة من حصن المسلم',
    category: 'adhkar',
    icon: '☀️',
  },
  {
    id: 'evening_guard',
    title: 'حارس المساء',
    description: 'إتمام أذكار المساء كاملة تحصيناً للروح',
    category: 'adhkar',
    icon: '🌟',
  },
  {
    id: 'both_wards',
    title: 'درعا اليوم والليل',
    description: 'إتمام أذكار الصباح وأذكار المساء معاً في يوم واحد',
    category: 'adhkar',
    icon: '🛡️',
  },
  {
    id: 'streak_7',
    title: 'أسبوع النور والذكر',
    description: 'مواظبة ٧ أيام متتالية على الذكر والتسبيح',
    category: 'adhkar',
    icon: '📿',
  },
  {
    id: 'thousand_club',
    title: 'نادي الألفية',
    description: 'بلوغ ١٠٠٠ تسبيحة وذكرة لله تعالى',
    category: 'adhkar',
    icon: '👑',
  },
];

export const AchievementsOverviewModal: React.FC<AchievementsOverviewModalProps> = ({
  isOpen,
  onClose,
  onNavigateToQuran,
  onNavigateToAdhkar,
  onNavigateToPrayers,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'badges' | 'khatmah' | 'backup'>('overview');
  const [khatmah, setKhatmah] = useState<QuranKhatmahState>(StorageService.getQuranKhatmah());
  const [prayersState, setPrayersState] = useState<PrayerAchievementsState>(StorageService.getPrayerAchievements());
  const [adhkarStats, setAdhkarStats] = useState<AdhkarStats>(StorageService.getAdhkarStats());
  const [fasting, setFasting] = useState<FastingTrackerState>(StorageService.getFastingTracker());
  const [sadaqahList, setSadaqahList] = useState<SadaqahRecord[]>(StorageService.getSadaqahRecords());
  const [impact, setImpact] = useState<ImpactBreakdown>(ImpactTreeService.calculateImpact());
  
  const [backupFeedback, setBackupFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshData = () => {
    setKhatmah(StorageService.getQuranKhatmah());
    setPrayersState(StorageService.getPrayerAchievements());
    setAdhkarStats(StorageService.getAdhkarStats());
    setFasting(StorageService.getFastingTracker());
    setSadaqahList(StorageService.getSadaqahRecords());
    setImpact(ImpactTreeService.calculateImpact());
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
      setBackupFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const unlockedAdhkarBadges = new Set(adhkarStats.unlockedBadgeIds || []);
  const unlockedPrayerBadges = new Set(prayersState.unlockedBadgeIds || []);

  const totalUnlockedBadgesCount = ALL_SYSTEM_BADGES.filter(b => 
    b.category === 'adhkar' ? unlockedAdhkarBadges.has(b.id) : unlockedPrayerBadges.has(b.id)
  ).length;

  const handleExportBackup = () => {
    try {
      const json = StorageService.exportFullBackup();
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `athar-backup-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setBackupFeedback({ type: 'success', message: 'تم تنزيل ملف النسخة الاحتياطية بنجاح ✓' });
    } catch {
      setBackupFeedback({ type: 'error', message: 'تعذر تصدير النسخة الاحتياطية.' });
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const res = StorageService.importFullBackup(text);
        if (res.success) {
          refreshData();
          setBackupFeedback({ type: 'success', message: res.message });
        } else {
          setBackupFeedback({ type: 'error', message: res.message });
        }
      }
    };
    reader.onerror = () => {
      setBackupFeedback({ type: 'error', message: 'فشلت قراءة الملف.' });
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-[#0C0B09] border border-[#C8A24A]/40 rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[92vh] text-right shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#C8A24A]/25 flex items-center justify-between bg-gradient-to-r from-[#171510] to-[#0E0C09]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E6C66E]/20 to-[#C8A24A]/10 border border-[#E6C66E]/40 flex items-center justify-center text-[#E6C66E] shadow-inner">
              <Trophy size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">سجل الإنجازات والأثر</h2>
              <p className="text-[11px] text-[#C4B998]">متابعة الختمة والصلوات والأوسمة والنسخ الاحتياطي</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#171510] text-[#A69C80] hover:text-white border border-[#C8A24A]/20 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-2 bg-[#12100C] border-b border-[#C8A24A]/15 gap-1.5 shrink-0 overflow-x-auto">
          {[
            { id: 'overview', label: 'الأثر اليومي' },
            { id: 'badges', label: `الأوسمة (${totalUnlockedBadgesCount})` },
            { id: 'khatmah', label: 'ختمة المصحف' },
            { id: 'backup', label: 'النسخ الاحتياطي' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-center whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-l from-[#E6C66E] to-[#C8A24A] text-black shadow-md'
                  : 'bg-[#171510] text-[#B8AE96] hover:text-white border border-[#C8A24A]/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Daily Impact Card */}
              <div className="athar-card-gold space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#E6C66E] font-bold text-xs">
                    <Sparkles size={16} />
                    <span>نقاط الأثر اليومي</span>
                  </div>
                  <span className="text-xl font-extrabold text-[#F3E5AB]">
                    {impact.score}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/60 overflow-hidden border border-[#C8A24A]/20">
                  <div
                    className="h-full bg-gradient-to-l from-[#E6C66E] to-[#C8A24A] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, impact.score)}%` }}
                  />
                </div>
                <p className="text-xs text-[#C4B998] leading-relaxed">
                  {impact.inspirationalQuote}
                </p>
              </div>

              {/* Quick Stat Tiles Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="athar-card space-y-1">
                  <div className="flex items-center justify-between text-[#C4B998] text-[11px]">
                    <span>تتابع الصلاة</span>
                    <Flame size={14} className="text-[#E6C66E]" />
                  </div>
                  <p className="text-lg font-extrabold text-white">
                    {prayersState.streakDays || 0} <span className="text-xs text-[#A69C80]">أيام</span>
                  </p>
                  <span className="text-[10px] text-[#A69C80] block">إجمالي المسجل: {prayersState.totalPrayersLogged || 0} صلاة</span>
                </div>

                <div className="athar-card space-y-1">
                  <div className="flex items-center justify-between text-[#C4B998] text-[11px]">
                    <span>مواظبة الأذكار</span>
                    <Flame size={14} className="text-[#E6C66E]" />
                  </div>
                  <p className="text-lg font-extrabold text-white">
                    {adhkarStats.currentStreak || 0} <span className="text-xs text-[#A69C80]">أيام</span>
                  </p>
                  <span className="text-[10px] text-[#A69C80] block">إجمالي الذكر: {adhkarStats.totalDhikrRecited || 0}</span>
                </div>

                <div className="athar-card space-y-1">
                  <div className="flex items-center justify-between text-[#C4B998] text-[11px]">
                    <span>آيات مقروءة</span>
                    <BookOpen size={14} className="text-[#E6C66E]" />
                  </div>
                  <p className="text-lg font-extrabold text-white">
                    {khatmah.totalAyahsReadOverall || 0} <span className="text-xs text-[#A69C80]">آية</span>
                  </p>
                  <span className="text-[10px] text-[#A69C80] block">سلسلة القراءة: {khatmah.readingStreakDays || 0} يوم</span>
                </div>

                <div className="athar-card space-y-1">
                  <div className="flex items-center justify-between text-[#C4B998] text-[11px]">
                    <span>استماع القرآن</span>
                    <Clock size={14} className="text-[#E6C66E]" />
                  </div>
                  <p className="text-lg font-extrabold text-white">
                    {khatmah.totalMinutesListenedOverall || 0} <span className="text-xs text-[#A69C80]">دقيقة</span>
                  </p>
                  <span className="text-[10px] text-[#A69C80] block">اليوم: {khatmah.todayMinutesListened || 0} دقيقة</span>
                </div>
              </div>

              {/* Fasting & Charity Highlights */}
              <div className="athar-card space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#C8A24A]/20 pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Calendar size={14} className="text-[#E6C66E]" />
                    صيام التطوع والصدقات
                  </span>
                  <span className="text-[11px] text-[#E6C66E] font-bold">
                    {fasting.totalFastedDays || 0} أيام صيام
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#C4B998]">
                  <span>إجمالي عمليات الصدقة المسجلة:</span>
                  <span className="font-extrabold text-white">{sadaqahList.length} مرات</span>
                </div>
              </div>

              {/* Quick Navigation Action Buttons */}
              <div className="flex gap-2">
                {onNavigateToPrayers && (
                  <button
                    onClick={onNavigateToPrayers}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#171510] border border-[#C8A24A]/30 text-xs font-bold text-white hover:text-[#E6C66E] hover:border-[#E6C66E] transition-all text-center"
                  >
                    مواقيت الصلوات
                  </button>
                )}
                {onNavigateToQuran && (
                  <button
                    onClick={onNavigateToQuran}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#171510] border border-[#C8A24A]/30 text-xs font-bold text-white hover:text-[#E6C66E] hover:border-[#E6C66E] transition-all text-center"
                  >
                    المصحف الشريف
                  </button>
                )}
                {onNavigateToAdhkar && (
                  <button
                    onClick={onNavigateToAdhkar}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#171510] border border-[#C8A24A]/30 text-xs font-bold text-white hover:text-[#E6C66E] hover:border-[#E6C66E] transition-all text-center"
                  >
                    الأذكار اليومية
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: BADGES & HONORS */}
          {activeTab === 'badges' && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="p-3 rounded-2xl bg-[#171510] border border-[#C8A24A]/30 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-white">الأوسمة المكتسبة</h4>
                  <p className="text-[11px] text-[#C4B998]">أوسمة الصلاة، السنن، والأذكار وحصن المسلم</p>
                </div>
                <span className="text-sm font-extrabold text-[#E6C66E] bg-[#0A0A0A] px-3 py-1 rounded-xl border border-[#C8A24A]/40">
                  {totalUnlockedBadgesCount} / {ALL_SYSTEM_BADGES.length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ALL_SYSTEM_BADGES.map((badge) => {
                  const isUnlocked = badge.category === 'adhkar' 
                    ? unlockedAdhkarBadges.has(badge.id)
                    : unlockedPrayerBadges.has(badge.id);

                  return (
                    <div
                      key={badge.id}
                      className={`p-3 rounded-2xl border transition-all flex items-start gap-3 ${
                        isUnlocked
                          ? 'bg-gradient-to-l from-[#1C1810] to-[#12100C] border-[#E6C66E]/50 shadow-md'
                          : 'bg-[#12110E]/60 border-[#C8A24A]/15 opacity-60'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                        isUnlocked ? 'bg-[#0E0C09] border border-[#E6C66E]/40' : 'bg-black/40 grayscale'
                      }`}>
                        {badge.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h5 className={`text-xs font-bold truncate ${isUnlocked ? 'text-[#F3E5AB]' : 'text-slate-400'}`}>
                            {badge.title}
                          </h5>
                          {isUnlocked && (
                            <span className="text-[10px] text-[#E6C66E] font-extrabold flex items-center gap-0.5 shrink-0">
                              <CheckCircle2 size={12} />
                              مكتمل
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#A69C80] mt-0.5 leading-relaxed">
                          {badge.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: QURAN KHATMAH */}
          {activeTab === 'khatmah' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Khatmah Progress Card */}
              <div className="athar-card-gold space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen size={18} className="text-[#E6C66E]" />
                    <span className="text-sm font-extrabold text-white">الختمة رقم {khatmah.khatmahNumber || 1}</span>
                  </div>
                  <span className="text-xs font-extrabold text-[#E6C66E] bg-black/50 px-2.5 py-1 rounded-lg border border-[#C8A24A]/30">
                    {(khatmah.completedSurahs || []).length} / 114 سورة
                  </span>
                </div>

                <div className="w-full h-2.5 rounded-full bg-black/60 overflow-hidden border border-[#C8A24A]/25">
                  <div
                    className="h-full bg-gradient-to-l from-[#E6C66E] to-[#C8A24A] rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round(((khatmah.completedSurahs || []).length / 114) * 100))}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-[#C4B998]">
                  <span>نسبة إنجاز الختمة:</span>
                  <span className="font-extrabold text-[#F3E5AB]">
                    {Math.round(((khatmah.completedSurahs || []).length / 114) * 100)}%
                  </span>
                </div>
              </div>

              {/* Today's Reading Goal */}
              <div className="athar-card space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">هدف التلاوة اليومي</span>
                  <span className="text-xs font-bold text-[#E6C66E]">
                    {khatmah.totalAyahsReadToday || 0} / {khatmah.dailyGoalAyahs || 20} آية
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/50 overflow-hidden">
                  <div
                    className="h-full bg-[#E6C66E] rounded-full"
                    style={{
                      width: `${Math.min(100, Math.round(((khatmah.totalAyahsReadToday || 0) / (khatmah.dailyGoalAyahs || 20)) * 100))}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-[#A69C80]">
                  تاريخ بدء الختمة الحالية: {khatmah.khatmahStartDate || 'اليوم'}
                </p>
              </div>

              {onNavigateToQuran && (
                <button
                  onClick={onNavigateToQuran}
                  className="w-full athar-btn-primary flex items-center justify-center gap-2"
                >
                  <BookOpen size={16} />
                  <span>متابعة القراءة في المصحف</span>
                </button>
              )}
            </div>
          )}

          {/* TAB 4: BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="athar-card space-y-3">
                <div className="flex items-center gap-2.5 text-[#E6C66E]">
                  <Download size={18} />
                  <h4 className="text-sm font-extrabold text-white">تصدير نسخة احتياطية (JSON)</h4>
                </div>
                <p className="text-xs text-[#C4B998] leading-relaxed">
                  احفظ تقدمك في الختمة القرآنية، سجل الصلوات والسنن، أوسمة الأذكار، وسجل الصيام والصدقات في ملف آمن يمكنك استعادته في أي وقت على هذا الجهاز أو أي جهاز آخر.
                </p>
                <button
                  onClick={handleExportBackup}
                  className="w-full athar-btn-primary flex items-center justify-center gap-2 text-xs"
                >
                  <Download size={16} />
                  <span>تصدير وحفظ النسخة الاحتياطية</span>
                </button>
              </div>

              <div className="athar-card space-y-3">
                <div className="flex items-center gap-2.5 text-[#E6C66E]">
                  <Upload size={18} />
                  <h4 className="text-sm font-extrabold text-white">استعادة نسخة سابقة</h4>
                </div>
                <p className="text-xs text-[#C4B998] leading-relaxed">
                  اختر ملف النسخة الاحتياطية بصيغة <span className="text-[#E6C66E] font-mono">.json</span> لاسترجاع كافة بياناتك وإنجازاتك المسجلة فوراً.
                </p>
                <input
                  type="file"
                  accept=".json,application/json"
                  ref={fileInputRef}
                  onChange={handleImportFile}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full athar-btn-outline flex items-center justify-center gap-2 text-xs"
                >
                  <Upload size={16} />
                  <span>اختيار ملف واستعادة البيانات</span>
                </button>
              </div>

              {backupFeedback && (
                <div
                  className={`p-3 rounded-2xl text-xs flex items-center gap-2 animate-slideDown ${
                    backupFeedback.type === 'success'
                      ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-200'
                      : 'bg-rose-950/70 border border-rose-500/50 text-rose-200'
                  }`}
                >
                  {backupFeedback.type === 'success' ? (
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle size={16} className="shrink-0 text-rose-400" />
                  )}
                  <span>{backupFeedback.message}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
