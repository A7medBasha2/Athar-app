import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GamificationService, SYSTEM_BADGE_DEFINITIONS } from '../services/gamificationService';
import { AchievementBadgeItem, GamificationBadgeCategory, UserGamificationSummary, XPLedgerEntry } from '../types/gamification';
import { AchievementDetailModal, AchievementItem } from './profile/AchievementDetailModal';
import {
  X,
  Trophy,
  Award,
  Sparkles,
  Flame,
  Clock,
  BookOpen,
  Heart,
  ChevronLeft,
  Calendar,
  CheckCircle2,
  Lock,
  ArrowRight,
  TrendingUp,
  History,
} from 'lucide-react';
import exactXpStarCleanImg from '../assets/images/exact_xp_star_clean.png';
import exactLevelRosetteCleanImg from '../assets/images/exact_level_rosette_clean.png';
import goldMedalQuranImg from '../assets/images/medal_quran_milestone_1792610611861.jpg';
import goldMedalFlameImg from '../assets/images/medal_streak_milestone_1792610613781.jpg';
import goldMedalTasbihImg from '../assets/images/medal_adhkar_milestone_1792610613103.jpg';
import goldMedalCharityImg from '../assets/images/medal_charity_milestone_1792610614248.jpg';
import goldMedalMosqueImg from '../assets/images/gold_medal_mosque_1792553061681.jpg';
import lockedMedalImg from '../assets/images/medal_locked_silhouette_1792610614413.jpg';

/**
 * Triggers an elegant Athar golden particle burst respecting solemnity and reduced-motion
 */
const triggerGoldSparkles = (originX = 0.5, originY = 0.5) => {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }
  try {
    confetti({
      particleCount: 45,
      spread: 60,
      startVelocity: 24,
      gravity: 0.8,
      ticks: 160,
      origin: { x: originX, y: originY },
      colors: ['#FFE6A0', '#D9AE48', '#B8860B', '#F3E5AB', '#ECC86C'],
      shapes: ['circle', 'square'],
      scalar: 0.75,
      disableForReducedMotion: true,
      zIndex: 9999,
    });
  } catch (err) {
    console.warn('Confetti error:', err);
  }
};

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
  onNavigateToPrayers,
}) => {
  const [activeMainTab, setActiveMainTab] = useState<'badges' | 'ledger' | 'policy'>('badges');
  const [categoryFilter, setCategoryFilter] = useState<GamificationBadgeCategory>('all');
  const [summary, setSummary] = useState<UserGamificationSummary>(() => GamificationService.getGamificationSummary());
  const [badges, setBadges] = useState<AchievementBadgeItem[]>(() => GamificationService.evaluateBadges());
  const [ledger, setLedger] = useState<XPLedgerEntry[]>(() => GamificationService.getLocalLedger());
  const [selectedBadge, setSelectedBadge] = useState<AchievementItem | null>(null);

  const reloadData = () => {
    setSummary(GamificationService.getGamificationSummary());
    setBadges(GamificationService.evaluateBadges());
    setLedger(GamificationService.getLocalLedger());
  };

  useEffect(() => {
    if (isOpen) {
      reloadData();
      // Gentle gold celebration if user has unlocked achievements
      try {
        const hasUnlocked = GamificationService.evaluateBadges().some((b) => b.isUnlocked);
        if (hasUnlocked) {
          setTimeout(() => triggerGoldSparkles(0.5, 0.25), 300);
        }
      } catch {}
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => reloadData();
    window.addEventListener('athar_xp_updated', handleUpdate);
    window.addEventListener('athar_badges_updated', handleUpdate);
    return () => {
      window.removeEventListener('athar_xp_updated', handleUpdate);
      window.removeEventListener('athar_badges_updated', handleUpdate);
    };
  }, []);

  if (!isOpen) return null;

  const filteredBadges = badges.filter((b) => {
    if (categoryFilter === 'all') return true;
    return b.category === categoryFilter;
  });

  const getMedalImage = (badge: AchievementBadgeItem) => {
    if (!badge.isUnlocked) return lockedMedalImg;
    if (badge.medalType === 'quran') return goldMedalQuranImg;
    if (badge.medalType === 'flame') return goldMedalFlameImg;
    if (badge.medalType === 'tasbih') return goldMedalTasbihImg;
    if (badge.medalType === 'charity') return goldMedalCharityImg;
    if (badge.medalType === 'mosque') return goldMedalMosqueImg;
    return goldMedalQuranImg;
  };

  const handleBadgeClick = (badge: AchievementBadgeItem, e?: React.MouseEvent) => {
    if (badge.isUnlocked) {
      if (e) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const originX = (rect.left + rect.width / 2) / window.innerWidth;
        const originY = (rect.top + rect.height / 2) / window.innerHeight;
        triggerGoldSparkles(originX, originY);
      } else {
        triggerGoldSparkles(0.5, 0.5);
      }
    }

    const detailItem: AchievementItem = {
      id: badge.id,
      title: badge.title,
      subtitle: badge.subtitle,
      description: badge.description,
      category: badge.category === 'all' ? 'other' : badge.category,
      isUnlocked: badge.isUnlocked,
      unlockedDate: badge.unlockedDate,
      progressPercent: badge.progressPercent,
      progressText: badge.progressText,
      xpReward: badge.xpReward,
      medalType: badge.medalType === 'star' ? 'star' : badge.medalType,
    };
    setSelectedBadge(detailItem);
  };

  const handleBadgeAction = () => {
    if (!selectedBadge) return;
    const badgeDef = SYSTEM_BADGE_DEFINITIONS.find((b) => b.id === selectedBadge.id);
    setSelectedBadge(null);
    onClose();

    if (badgeDef?.actionDestination === 'quran' && onNavigateToQuran) {
      onNavigateToQuran();
    } else if (badgeDef?.actionDestination === 'adhkar' && onNavigateToAdhkar) {
      onNavigateToAdhkar();
    } else if (badgeDef?.actionDestination === 'prayers' && onNavigateToPrayers) {
      onNavigateToPrayers();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
      dir="rtl"
    >
      <div className="w-full max-w-lg bg-[#0C0B09] border border-[#C8A24A]/40 rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[92vh] text-right shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* ============================================================
           1. TOP HEADER WITH LEVEL MEDALLION & TOTAL XP
           ============================================================ */}
        <div className="p-4 border-b border-[#241E12] bg-gradient-to-b from-[#18150D] to-[#0E0C08]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FFE6A0]/20 to-[#D9AE48]/10 border border-[#D9AE48]/30 flex items-center justify-center text-[#D9AE48]">
                <Trophy size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#F7F2E7] tracking-tight">
                  سجل الأثر والإنجازات المباركة
                </h2>
                <span className="text-[11px] text-[#A69E8D] block">
                  مقياس شخصي للاستقامة دون مقارنة أو تنافس
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-[#A69E8D] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>
          </div>

          {/* Level & XP Progression Card */}
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              triggerGoldSparkles((rect.left + rect.width / 2) / window.innerWidth, (rect.top + rect.height / 2) / window.innerHeight);
            }}
            className="rounded-2xl border border-[#D9AE48]/25 bg-[#14120B] p-3 shadow-inner cursor-pointer hover:border-[#D9AE48]/45 transition-colors select-none group"
            title="انقر للاحتفال بإنجازك المبارك"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              {/* Level Medallion */}
              <div className="flex items-center gap-2.5">
                <div className="w-12 h-12 shrink-0 relative flex items-center justify-center">
                  <img
                    src={exactLevelRosetteCleanImg}
                    alt=""
                    className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(217,174,72,0.35)] group-hover:scale-105 transition-transform"
                  />
                  <span className="absolute inset-0 flex items-center justify-center font-mono font-bold text-sm text-[#FFE6A0] pt-0.5">
                    {summary.currentLevel}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#A69E8D] block">المستوى الحالي</span>
                  <span className="text-xs font-bold text-[#FFE6A0] tracking-wide">
                    {summary.levelTitle}
                  </span>
                </div>
              </div>

              {/* Total XP Counter */}
              <div className="flex items-center gap-2 bg-[#0C0A07] px-3 py-1.5 rounded-xl border border-[#2A2418]">
                <div className="text-left">
                  <span className="text-[10px] text-[#B8AF9E] block">نقاط الأثر</span>
                  <span className="text-base font-bold text-[#F7F2E7] font-mono leading-none">
                    {summary.totalXP.toLocaleString('en-US')}
                  </span>
                </div>
                <img
                  src={exactXpStarCleanImg}
                  alt="XP"
                  className="w-7 h-7 object-contain filter drop-shadow-[0_0_8px_rgba(217,174,72,0.4)]"
                />
              </div>
            </div>

            {/* Level Progress Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#A69E8D]">
                  التقدم نحو المستوى {summary.currentLevel + 1}
                </span>
                <span className="text-[#FFE6A0] font-mono font-bold">
                  {summary.xpInCurrentLevel} / {summary.xpRequiredForNextLevel} XP ({summary.levelProgressPercent}%)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#201B11] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#D9AE48] to-[#FFE6A0] transition-all duration-700"
                  style={{ width: `${summary.levelProgressPercent}%` }}
                />
              </div>
            </div>

            {/* Daily Activity Cap Banner */}
            <div className="mt-2.5 pt-2 border-t border-[#231E14] flex items-center justify-between text-[10.5px]">
              <span className="text-[#B5AD9B] flex items-center gap-1.5">
                <TrendingUp size={11} className="text-[#D9AE48]" />
                النشاط اليومي (سقف الحماية):
              </span>
              <span className="font-mono text-[#E8DFC9] font-medium">
                {summary.dailyXPEarnedToday} / {summary.dailyXPCap} XP
              </span>
            </div>
          </div>

          {/* Primary View Switcher */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#12100C] rounded-xl mt-3 border border-[#221D13]">
            <button
              onClick={() => setActiveMainTab('badges')}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeMainTab === 'badges'
                  ? 'bg-gradient-to-r from-[#D9AE48] to-[#FFE6A0] text-[#080807] shadow-sm font-bold'
                  : 'text-[#A69E8D] hover:text-[#F7F2E7]'
              }`}
            >
              <Award size={13} />
              الأوسمة ({summary.earnedBadgesCount}/{summary.totalBadgesCount})
            </button>
            <button
              onClick={() => setActiveMainTab('ledger')}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeMainTab === 'ledger'
                  ? 'bg-gradient-to-r from-[#D9AE48] to-[#FFE6A0] text-[#080807] shadow-sm font-bold'
                  : 'text-[#A69E8D] hover:text-[#F7F2E7]'
              }`}
            >
              <History size={13} />
              سجل النقاط
            </button>
            <button
              onClick={() => setActiveMainTab('policy')}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeMainTab === 'policy'
                  ? 'bg-gradient-to-r from-[#D9AE48] to-[#FFE6A0] text-[#080807] shadow-sm font-bold'
                  : 'text-[#A69E8D] hover:text-[#F7F2E7]'
              }`}
            >
              <Sparkles size={13} />
              ميثاق الأثر
            </button>
          </div>
        </div>

        {/* ============================================================
           2. TAB CONTENT
           ============================================================ */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: BADGES GRID */}
          {activeMainTab === 'badges' && (
            <div>
              {/* Category Filter Horizontal Strip */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 text-xs scrollbar-none select-none">
                {[
                  { id: 'all', label: 'الكل' },
                  { id: 'prayers', label: 'الصلوات' },
                  { id: 'quran', label: 'القرآن' },
                  { id: 'adhkar', label: 'الأذكار' },
                  { id: 'charity', label: 'الصدقة والبر' },
                  { id: 'consistency', label: 'الاستمرارية' },
                ].map((cat) => {
                  const isSelected = categoryFilter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryFilter(cat.id as GamificationBadgeCategory)}
                      className={`px-3 py-1.5 rounded-full border whitespace-nowrap transition-all cursor-pointer text-xs font-medium ${
                        isSelected
                          ? 'border-[#D9AE48] bg-[#D9AE48]/15 text-[#FFE6A0] shadow-sm font-semibold'
                          : 'border-[#262015] bg-[#14120B] text-[#9E9584] hover:border-[#D9AE48]/40'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* 3-Column Badges Grid */}
              <div className="grid grid-cols-3 gap-3">
                {filteredBadges.map((badge) => {
                  return (
                    <div
                      key={badge.id}
                      onClick={(e) => handleBadgeClick(badge, e)}
                      className={`relative flex flex-col items-center text-center p-2.5 rounded-2xl border transition-all cursor-pointer select-none active:scale-95 group ${
                        badge.isUnlocked
                          ? 'bg-[#15120B] border-[#D9AE48]/40 shadow-[0_4px_16px_rgba(0,0,0,0.5)] hover:border-[#FFE6A0]'
                          : badge.visualState === 'in_progress'
                          ? 'bg-[#100E0A] border-[#3B3222] hover:border-[#D9AE48]/40'
                          : 'bg-[#0B0A08] border-[#1F1B12] opacity-70 hover:opacity-90'
                      }`}
                    >
                      {/* Unlocked Gold Glow or Status Pill */}
                      {badge.isUnlocked && (
                        <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle,_rgba(217,174,72,0.15)_0%,_transparent_70%)] pointer-events-none" />
                      )}

                      {/* Medal Image Container */}
                      <div className="relative w-14 h-14 sm:w-16 sm:h-16 mb-1.5">
                        <img
                          src={getMedalImage(badge)}
                          alt={badge.title}
                          referrerPolicy="no-referrer"
                          className={`w-full h-full object-contain filter transition-transform group-hover:scale-105 ${
                            badge.isUnlocked
                              ? 'drop-shadow-[0_2px_8px_rgba(217,174,72,0.4)]'
                              : 'grayscale brightness-75 opacity-80'
                          }`}
                        />
                        {badge.isUnlocked ? (
                          <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-[#080807] border border-[#FFE6A0] flex items-center justify-center text-[#FFE6A0]">
                            <CheckCircle2 size={12} strokeWidth={2.6} />
                          </div>
                        ) : (
                          <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-[#080807] border border-[#333] flex items-center justify-center text-[#777]">
                            <Lock size={10} strokeWidth={2.4} />
                          </div>
                        )}
                      </div>

                      {/* Title & Subtitle */}
                      <span className="text-[11px] font-bold text-[#F7F2E7] line-clamp-1 block mb-0.5">
                        {badge.title}
                      </span>
                      <span className="text-[9.5px] text-[#A69E8D] line-clamp-1 mb-1.5">
                        {badge.subtitle}
                      </span>

                      {/* Progress Indicator */}
                      <div className="w-full mt-auto">
                        {badge.isUnlocked ? (
                          <span className="text-[9px] font-bold text-[#FFE6A0] bg-[#2A2210] px-2 py-0.5 rounded-full inline-block border border-[#D9AE48]/30">
                            مكتمل ✓
                          </span>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-[9px] text-[#B8AF9E] font-mono block">
                              {badge.progressText}
                            </span>
                            <div className="w-full h-1 rounded-full bg-[#1F1B12] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#D9AE48]"
                                style={{ width: `${badge.progressPercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: XP POINTS LEDGER */}
          {activeMainTab === 'ledger' && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-[#2A2315] bg-[#12100C] p-3 text-xs text-[#C2B7A3]">
                <p className="leading-relaxed">
                  يتم تسجيل كل نقطة أثر تلقائياً وبشكل غير متكرر بناءً على دخول وقت الصلاة وإتمام الأذكار والورد القرآني الحقيقي.
                </p>
              </div>

              {ledger.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-[#2A2315] bg-[#0E0C09]">
                  <Trophy size={36} className="mx-auto text-[#665B45] mb-2" />
                  <h4 className="text-sm font-bold text-[#F7F2E7] mb-1">لا توجد نقاط مسجلة بعد</h4>
                  <p className="text-xs text-[#9E9584] max-w-xs mx-auto">
                    ابدأ يومك بتسجيل صلاة الفجر في وقتها أو أذكار الصباح لتدوين أول نقطة أثر في ميزان حسناتك.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {ledger.map((entry) => {
                    const dateFormatted = new Date(entry.timestamp).toLocaleDateString('ar-EG', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={entry.id}
                        className="rounded-xl border border-[#241E12] bg-[#14120B] p-2.5 flex items-center justify-between gap-2.5 hover:border-[#D9AE48]/30 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#201A10] border border-[#D9AE48]/20 flex items-center justify-center text-[#D9AE48]">
                            <Sparkles size={14} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#F7F2E7] block">
                              {entry.titleArabic}
                            </span>
                            <span className="text-[10px] text-[#8C8373] flex items-center gap-1 font-mono">
                              <Calendar size={10} />
                              {dateFormatted}
                            </span>
                          </div>
                        </div>

                        <div className="bg-[#1C170E] px-2.5 py-1 rounded-lg border border-[#D9AE48]/25 text-[#FFE6A0] font-mono font-bold text-xs shrink-0">
                          +{entry.points} XP
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ETHICAL POLICY & CHARTER */}
          {activeMainTab === 'policy' && (
            <div className="space-y-3.5 text-right text-xs text-[#C7BEAA]">
              <div className="rounded-2xl border border-[#D9AE48]/30 bg-[#14120B] p-4 space-y-2.5">
                <h3 className="text-sm font-bold text-[#FFE6A0] flex items-center gap-1.5">
                  <Heart size={14} className="text-[#D9AE48]" />
                  ميثاق السكينة ونقاط الأثر
                </h3>
                <p className="leading-relaxed">
                  صُمم نظام الإنجازات في تطبيق «أثر» ليكون عوناً للمسلم على الاستقامة وبناء عادات إيمانية مستدامة دون رياء أو منافسة:
                </p>
                <ul className="space-y-2 list-disc list-inside text-[#B5AD9B] pr-1">
                  <li><strong className="text-white">لا تنافس ولا ترتيب:</strong> لا توجد قوائم متصدرين عامة ولا مفاضلة بين العباد؛ عبادتك خالصة لوجه الله.</li>
                  <li><strong className="text-white">منع التكرار الآلي:</strong> لا تُمنح أي نقاط لمجرد فتح التطبيق أو الضغط المتكرر، بل للثبات الفعلي.</li>
                  <li><strong className="text-white">سقف يومي للحماية (١٥٠ XP):</strong> يمنع استعجال القراءة أو تحويل الطاعة إلى سباق أرقام.</li>
                  <li><strong className="text-white">الاستقامة أحب إلى الله:</strong> قال رسول الله ﷺ: «أَحَبُّ الأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ».</li>
                </ul>
              </div>

              {/* XP Breakdown Matrix Table */}
              <div className="rounded-2xl border border-[#241E12] bg-[#100E0A] p-3 space-y-2">
                <h4 className="text-xs font-bold text-[#F7F2E7]">جدول النقاط المعتمد</h4>
                <div className="divide-y divide-[#1F1A12] text-[11px]">
                  <div className="py-1.5 flex justify-between">
                    <span>صلاة مفروضة في وقتها</span>
                    <span className="font-mono text-[#FFE6A0] font-bold">+١٥ XP</span>
                  </div>
                  <div className="py-1.5 flex justify-between">
                    <span>السنن الرواتب وصلاة الضحى</span>
                    <span className="font-mono text-[#FFE6A0] font-bold">+١٠ XP</span>
                  </div>
                  <div className="py-1.5 flex justify-between">
                    <span>جلسة أذكار الصباح أو المساء</span>
                    <span className="font-mono text-[#FFE6A0] font-bold">+١٥ XP</span>
                  </div>
                  <div className="py-1.5 flex justify-between">
                    <span>إتمام الورد القرآني اليومي</span>
                    <span className="font-mono text-[#FFE6A0] font-bold">+٢٠ XP</span>
                  </div>
                  <div className="py-1.5 flex justify-between">
                    <span>سجل صدقة أو إحسان بالوالدين</span>
                    <span className="font-mono text-[#FFE6A0] font-bold">+١٥ XP</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Badge Detail Modal Child */}
        <AchievementDetailModal
          isOpen={Boolean(selectedBadge)}
          onClose={() => setSelectedBadge(null)}
          achievement={selectedBadge}
          onAction={handleBadgeAction}
        />
      </div>
    </div>
  );
};
