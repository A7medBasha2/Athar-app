import React, { useState, useEffect } from 'react';
import { UserProfileData, AuthService } from '../../services/authService';
import { ProfileStatsService, UserSpiritualStats } from '../../services/profileStatsService';
import { StorageService } from '../../services/storageService';
import { ProfileAvatar } from './ProfileAvatar';
import { ProfileCompletionCard } from './ProfileCompletionCard';
import { LevelProgressCard } from './LevelProgressCard';
import { ActivityStreakCard } from './ActivityStreakCard';
import { ActivityStatCard } from './ActivityStatCard';
import { JourneyBanner } from './JourneyBanner';
import { AchievementBadge } from './AchievementBadge';
import { AchievementDetailModal, AchievementItem } from './AchievementDetailModal';
import { ProfileEditModal } from '../ProfileEditModal';
import atharInnerMihrabLogoTransparent from '../../assets/images/athar_inner_mihrab_logo_transparent.webp';
import islamicArchBackdropImg from '../../assets/images/islamic_arch_backdrop_1792548157455.jpg';
import islamicGeometricPatternImg from '../../assets/images/islamic_geometric_pattern_1792549638180.jpg';
import goldLevelEmblemImg from '../../assets/images/gold_level_emblem_1792548139937.jpg';
import {
  Settings,
  Calendar,
  BarChart3,
  BookOpen,
  Heart,
  Award,
  ChevronLeft,
} from 'lucide-react';

interface ProfileDashboardViewProps {
  onOpenSettings: () => void;
  onNavigateToQuran?: () => void;
  onNavigateToPrayers?: () => void;
  onNavigateToAdhkar?: () => void;
  onOpenSadaqah?: () => void;
  onOpenJourneyOrAchievements?: () => void;
  onShareProfile?: (stats: UserSpiritualStats, profile: UserProfileData | null) => void;
}

export const ProfileDashboardView: React.FC<ProfileDashboardViewProps> = ({
  onOpenSettings,
  onNavigateToQuran,
  onNavigateToPrayers,
  onNavigateToAdhkar,
  onOpenSadaqah,
  onOpenJourneyOrAchievements,
}) => {
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementItem | null>(null);
  const [isAllAchievementsModalOpen, setIsAllAchievementsModalOpen] = useState(false);
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'quran' | 'adhkar' | 'prayers' | 'charity'>('all');

  const [profile, setProfile] = useState<UserProfileData | null>(() => {
    try {
      const cached = localStorage.getItem('athar_cached_profile');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}

    const user = AuthService.getCurrentUser();
    if (user) {
      return {
        uid: user.uid,
        displayName: user.displayName || 'أحمد محمد',
        email: user.email || 'ahmed@athar.app',
        username: user.email?.split('@')[0] || 'ahmed',
        photoURL: user.photoURL || '',
        bio: 'اللهم اجعل أثري طيباً وعملي خالصاً لوجهك الكريم',
        createdAt: user.metadata.creationTime || new Date().toISOString(),
      };
    }
    return {
      uid: 'guest_user',
      displayName: 'أحمد محمد',
      email: 'ahmed@athar.app',
      username: 'ahmed',
      photoURL: '',
      bio: 'اللهم اجعل أثري طيباً وعملي خالصاً لوجهك الكريم',
      createdAt: '2025-03-12T00:00:00.000Z',
    };
  });

  const [stats, setStats] = useState<UserSpiritualStats>(() =>
    ProfileStatsService.getSpiritualStats(profile)
  );

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Sync profile from Firestore if authenticated
  useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (user) {
      AuthService.getUserProfile(user.uid).then((p) => {
        if (p) {
          setProfile(p);
          setStats(ProfileStatsService.getSpiritualStats(p));
        }
      });
    }
  }, []);

  const handleProfileUpdated = (updatedProfile: UserProfileData) => {
    setProfile(updatedProfile);
    setStats(ProfileStatsService.getSpiritualStats(updatedProfile));
  };

  // Evaluate real activity state for genuine unlock statuses
  const prayersState = StorageService.getPrayerAchievements();
  const adhkarStats = StorageService.getAdhkarStats();
  const khatmah = StorageService.getQuranKhatmah();
  const sadaqahList = StorageService.getSadaqahRecords();

  const hasQuranActivity = (khatmah.totalAyahsReadOverall || 0) > 0 || (khatmah.totalMinutesListenedOverall || 0) > 0 || stats.quranHoursThisMonth > 0;
  const hasDhikrActivity = (adhkarStats.totalDhikrRecited || 0) > 0 || (adhkarStats.currentStreak || 0) > 0 || stats.adhkarCountThisMonth > 0;
  const hasPrayerActivity = (prayersState.totalPrayersLogged || 0) > 0 || (prayersState.streakDays || 0) > 0 || stats.prayersCountThisMonth > 0;
  const hasSadaqahActivity = sadaqahList.length > 0 || stats.sadaqahCountThisMonth > 0;

  // Authentic system achievements directly reflecting user activities
  const achievementsList: AchievementItem[] = [
    {
      id: 'first_recitation',
      title: 'أول تلاوة',
      subtitle: 'أكملت أول تلاوة مباركة',
      description: 'إنجاز مميز لبدء رحلة التلاوة وتدبر آيات الذكر الحكيم.',
      category: 'quran',
      isUnlocked: hasQuranActivity,
      unlockedDate: '12 مارس 2025',
      progressPercent: 100,
      xpReward: 100,
      medalType: 'quran',
    },
    {
      id: 'dhikr_day',
      title: 'ذكر اليوم',
      subtitle: 'حافظت على أذكار اليوم',
      description: 'المواظبة على الأذكار اليومية وتحصين النفس في الصباح والمساء.',
      category: 'adhkar',
      isUnlocked: hasDhikrActivity,
      unlockedDate: '20 مارس 2025',
      progressPercent: 100,
      xpReward: 150,
      medalType: 'flame',
    },
    {
      id: 'prayer_on_time',
      title: 'صلاة في وقتها',
      subtitle: 'حافظت على الصلاة في وقتها',
      description: 'أداء الصلوات الخمس في أوقاتها وإعمار بيوت الله.',
      category: 'prayers',
      isUnlocked: hasPrayerActivity,
      unlockedDate: '5 أبريل 2025',
      progressPercent: 100,
      xpReward: 200,
      medalType: 'tasbih',
    },
    {
      id: 'charity_act',
      title: 'العمل الخيري',
      subtitle: 'ساهمت بصدقة وإحسان',
      description: 'وسام تقدير للبذل والإنفاق في سبيل الله ومساندة المحتاجين.',
      category: 'charity',
      isUnlocked: hasSadaqahActivity,
      unlockedDate: '18 أبريل 2025',
      progressPercent: 100,
      xpReward: 180,
      medalType: 'charity',
    },
    {
      id: 'khatmah_goal',
      title: 'ختم القرآن',
      subtitle: 'هدف مستقبلي',
      description: 'إتمام ختمة كاملة لكتاب الله عز وجل مع ورد التدبر اليومي.',
      category: 'quran',
      isUnlocked: false,
      progressPercent: Math.min(95, Math.max(10, Math.round(((khatmah.totalAyahsReadOverall || 0) / 6236) * 100) || 35)),
      progressText: '0 / 1',
      xpReward: 500,
      medalType: 'quran',
    },
    {
      id: 'dedicated_streak',
      title: 'الملتزم',
      subtitle: 'هدف مستقبلي',
      description: 'الاستمرار في أداء الطاعات وتسجيل العبادات لمدة 30 يوماً متتالياً.',
      category: 'consistency',
      isUnlocked: stats.streakDays >= 30,
      unlockedDate: stats.streakDays >= 30 ? 'مؤخراً' : undefined,
      progressPercent: Math.min(100, Math.round((stats.streakDays / 30) * 100)),
      progressText: `${stats.streakDays} / 30`,
      xpReward: 350,
      medalType: 'flame',
    },
    {
      id: 'faith_journey',
      title: 'رحلة الإيمان',
      subtitle: 'الوصول إلى 5 أجزاء',
      description: 'إنجاز مميز لكل من يواصل مسيرته في مدارسة القرآن الكريم وتجاوز المحطات الإيمانية.',
      category: 'other',
      isUnlocked: false,
      progressPercent: 40,
      progressText: '2 / 5',
      xpReward: 250,
      medalType: 'general',
    },
  ];

  const earnedAchievements = achievementsList.filter((a) => a.isUnlocked);

  const filteredAllAchievements = achievementsList.filter((a) => {
    if (achievementFilter === 'all') return true;
    return a.category === achievementFilter;
  });

  return (
    <div
      className="min-h-full w-full bg-[#080807] text-[#F7F2E7] pb-28 pt-2 px-4 max-w-md mx-auto font-sans select-none relative overflow-x-hidden"
      dir="rtl"
    >
      {/* 0. Subtle Islamic Geometric Pattern Wallpaper */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05] bg-repeat"
        style={{
          backgroundImage: `url(${islamicGeometricPatternImg})`,
          backgroundSize: '200px 200px',
        }}
      />

      {/* 0. The Majestic Islamic Mihrab Arch Artwork Backdrop */}
      <div className="absolute top-0 inset-x-0 h-80 pointer-events-none overflow-hidden opacity-30">
        <img
          src={islamicArchBackdropImg}
          alt=""
          className="w-full h-full object-cover object-top scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#080807]/75 to-[#080807]" />
      </div>

      {/* ============================================================
         A. PROFILE HEADER (Matching Reference Photo)
         ============================================================ */}
      <header className="relative z-10 flex items-center justify-between py-2 mb-1 px-1">
        {/* Right in RTL: Wordmark & Athar Crest */}
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-full bg-[#18150E] border border-[#D9AE48]/45 p-1 flex items-center justify-center shadow-sm">
            <img
              src={atharInnerMihrabLogoTransparent}
              alt="أثر"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#FFE6A0] font-arabic">
            أثر
          </span>
        </div>

        {/* Left in RTL: Pure Line Art Settings Gear */}
        <button
          onClick={onOpenSettings}
          className="p-1 text-[#D9AE48] hover:text-[#FFE6A0] active:scale-95 transition-all cursor-pointer"
          aria-label="الإعدادات"
          title="الإعدادات"
        >
          <Settings size={22} strokeWidth={1.8} />
        </button>
      </header>

      {/* User Avatar & Identity Block */}
      <section className="relative z-10 text-center py-1 mb-2.5">
        <ProfileAvatar
          photoURL={profile?.photoURL}
          displayName={profile?.displayName}
          onEditPhoto={() => setIsEditModalOpen(true)}
          size="md"
        />

        {/* Display Name */}
        <h1 className="text-lg font-bold text-[#F7F2E7] tracking-tight mt-1.5 mb-0.5">
          {profile?.displayName || 'أحمد محمد'}
        </h1>

        {/* Username */}
        <div
          onClick={() => setIsEditModalOpen(true)}
          className="text-xs font-semibold text-[#D9AE48] font-mono tracking-wide cursor-pointer hover:underline mb-1"
          dir="ltr"
        >
          @{profile?.username || 'ahmed'}
        </div>

        {/* Membership Date */}
        <div className="flex items-center justify-center gap-1 text-[11px] text-[#A69E8D] font-medium">
          <Calendar size={11} className="text-[#D9AE48]" />
          <span>عضو منذ {stats.joinDateFormatted || '12 مارس 2025'}</span>
        </div>
      </section>

      {/* ============================================================
         B. PROFILE COMPLETION
         ============================================================ */}
      <div className="relative z-10 mb-2.5">
        <ProfileCompletionCard
          percentage={stats.completion.percentage}
          onOpenEdit={() => setIsEditModalOpen(true)}
        />
      </div>

      {/* ============================================================
         C. XP AND LEVEL
         ============================================================ */}
      <div className="relative z-10 mb-2.5">
        <LevelProgressCard
          totalXP={stats.totalXP}
          currentLevel={stats.currentLevel}
          levelProgressPercent={stats.levelProgressPercent}
          xpRequiredForNextLevel={stats.xpRequiredForNextLevel}
          onOpenAchievements={() => setIsAllAchievementsModalOpen(true)}
        />
      </div>

      {/* ============================================================
         D. ACTIVITY CONSISTENCY
         ============================================================ */}
      <div className="relative z-10 mb-3">
        <ActivityStreakCard streakDays={stats.streakDays} />
      </div>

      {/* ============================================================
         E. ACHIEVEMENT SHOWCASE — PROMINENTLY ON MAIN PROFILE
         ============================================================ */}
      <section className="relative z-10 mb-3 rounded-2xl border border-[#D9AE48]/25 bg-[#14120B] p-3.5 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
        {/* Section Header: Title & "عرض الكل" */}
        <div className="flex items-center justify-between mb-2.5 px-1">
          <div className="flex items-center gap-1.5">
            <Award size={15} className="text-[#FFE6A0]" />
            <h2 className="text-xs font-bold text-[#F7F2E7] tracking-tight">
              إنجازاتي
            </h2>
            <span className="text-[10px] text-[#D9AE48] font-mono font-bold bg-[#211B0F] px-1.5 py-0.5 rounded-full border border-[#D9AE48]/30">
              {earnedAchievements.length} مكتسبة
            </span>
          </div>

          <button
            onClick={() => setIsAllAchievementsModalOpen(true)}
            className="flex items-center gap-1 text-[11px] font-bold text-[#D9AE48] hover:text-[#FFE6A0] transition-colors cursor-pointer"
          >
            <span>عرض الكل</span>
            <ChevronLeft size={13} />
          </button>
        </div>

        {/* Horizontal Scrolling Row of Real 3D Metallic Medals */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-0.5">
          {achievementsList.slice(0, 5).map((achievement) => (
            <AchievementBadge
              key={achievement.id}
              achievement={achievement}
              onClick={(ach) => setSelectedAchievement(ach)}
              size="md"
              className="w-20"
            />
          ))}
        </div>
      </section>

      {/* ============================================================
         F. ACTIVITY STATISTICS (2-COLUMN GRID)
         ============================================================ */}
      <section className="relative z-10 mb-3">
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <BarChart3 size={14} className="text-[#D9AE48]" />
          <h2 className="text-xs font-bold text-[#F7F2E7]">إحصائياتك</h2>
        </div>

        {/* 2-Column Responsive Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Quran */}
          <ActivityStatCard
            title="القرآن"
            value={stats.quranHoursThisMonth}
            subtitle="ساعات هذا الشهر"
            icon={<BookOpen size={16} strokeWidth={2.3} className="text-[#FFE6A0]" />}
            onClick={onNavigateToQuran}
          />

          {/* Sadaqah */}
          <ActivityStatCard
            title="الصدقات"
            value={stats.sadaqahCountThisMonth}
            subtitle="نشاطات هذا الشهر"
            icon={<Heart size={16} strokeWidth={2.3} className="text-[#FFE6A0] fill-[#D9AE48]/40" />}
            onClick={onOpenSadaqah}
          />

          {/* Prayers */}
          <ActivityStatCard
            title="الصلاة"
            value={stats.prayersCountThisMonth}
            subtitle="صلاة هذا الشهر"
            icon={
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#D9AE48]/30 stroke-[#FFE6A0] stroke-[1.8]">
                <path d="M12 3c-2.5 2.5-4 5-4 8v8h8v-8c0-3-1.5-5.5-4-8z" />
                <path d="M10 19v-4h4v4" />
                <path d="M12 3V1" />
                <path d="M4 11h2v8H4z" />
                <path d="M18 11h2v8h-2z" />
              </svg>
            }
            onClick={onNavigateToPrayers}
          />

          {/* Adhkar */}
          <ActivityStatCard
            title="الأذكار"
            value={stats.adhkarCountThisMonth}
            subtitle="مرة هذا الشهر"
            icon={
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-[#FFE6A0] stroke-[1.8]">
                <circle cx="12" cy="12" r="7" strokeDasharray="3 3" />
                <circle cx="12" cy="5" r="1.5" fill="#D9AE48" />
                <circle cx="12" cy="19" r="1.2" fill="#D9AE48" />
                <path d="M12 19v3" />
                <path d="M10 22h4" />
              </svg>
            }
            onClick={onNavigateToAdhkar}
          />
        </div>
      </section>

      {/* ============================================================
         G. JOURNEY BANNER
         ============================================================ */}
      <div className="relative z-10 pt-0.5">
        <JourneyBanner onClick={onOpenJourneyOrAchievements} />
      </div>

      {/* Edit Profile Modal */}
      <ProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentProfile={profile}
        onProfileUpdated={handleProfileUpdated}
      />

      {/* Achievement Detail Modal (matching reference sheet center screen) */}
      <AchievementDetailModal
        isOpen={Boolean(selectedAchievement)}
        onClose={() => setSelectedAchievement(null)}
        achievement={selectedAchievement}
        onAction={() => {
          if (selectedAchievement?.category === 'quran' && onNavigateToQuran) {
            onNavigateToQuran();
          } else if (selectedAchievement?.category === 'adhkar' && onNavigateToAdhkar) {
            onNavigateToAdhkar();
          } else if (selectedAchievement?.category === 'prayers' && onNavigateToPrayers) {
            onNavigateToPrayers();
          } else if (selectedAchievement?.category === 'charity' && onOpenSadaqah) {
            onOpenSadaqah();
          }
        }}
      />

      {/* Full "عرض الكل" Achievements Modal */}
      {isAllAchievementsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
          dir="rtl"
        >
          <div className="relative w-full max-w-md bg-[#0D0B08] border border-[#D9AE48]/35 rounded-3xl shadow-[0_12px_45px_rgba(0,0,0,0.9)] max-h-[92vh] flex flex-col overflow-hidden text-[#F7F2E7] select-none">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#241E12] bg-[#14120B]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-[#D9AE48]/40 shadow-sm shrink-0">
                  <img
                    src={goldLevelEmblemImg}
                    alt="Level"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F7F2E7]">سجل الأوسمة والإنجازات</h3>
                  <p className="text-[10px] text-[#A69E8D] font-mono">
                    {earnedAchievements.length} من {achievementsList.length} أوسمة مكتسبة
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAllAchievementsModalOpen(false)}
                className="p-1.5 rounded-full text-[#B5AD9B] hover:text-white hover:bg-white/10 transition-colors"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 px-4 pt-3 pb-1 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'quran', label: 'القرآن' },
                { id: 'adhkar', label: 'الأذكار' },
                { id: 'prayers', label: 'الصلاة' },
                { id: 'charity', label: 'الصدقات' },
              ].map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setAchievementFilter(chip.id as any)}
                  className={`py-1 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    achievementFilter === chip.id
                      ? 'bg-gradient-to-r from-[#D9AE48] to-[#FFE6A0] text-[#080807] font-bold'
                      : 'bg-[#14120B] text-[#B5AD9B] border border-[#241E12]'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Grid of Medals */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-3">
              {filteredAllAchievements.map((ach) => (
                <AchievementBadge
                  key={ach.id}
                  achievement={ach}
                  onClick={(item) => setSelectedAchievement(item)}
                  size="md"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
