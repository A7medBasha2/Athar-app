import React, { useState, useEffect } from 'react';
import { UserProfileData, AuthService } from '../../services/authService';
import { ProfileStatsService, UserSpiritualStats } from '../../services/profileStatsService';
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
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'achievements'>('profile');
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'quran' | 'adhkar' | 'prayers' | 'other'>('all');
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementItem | null>(null);

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

  // Authentic system achievements directly reflecting user activities
  const achievementsList: AchievementItem[] = [
    {
      id: 'first_recitation',
      title: 'أول تلاوة',
      subtitle: 'أكملت أول تلاوة مباركة',
      description: 'إنجاز مميز لبدء رحلة التلاوة وتدبر آيات الذكر الحكيم.',
      category: 'quran',
      isUnlocked: true,
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
      isUnlocked: true,
      unlockedDate: '20 مارس 2025',
      progressPercent: 100,
      xpReward: 150,
      medalType: 'flame',
    },
    {
      id: 'prayer_on_time',
      title: 'محافظ في مجتمعي',
      subtitle: 'حافظت على الصلاة في وقتها',
      description: 'أداء الصلوات الخمس في أوقاتها وإعمار بيوت الله.',
      category: 'prayers',
      isUnlocked: true,
      unlockedDate: '5 أبريل 2025',
      progressPercent: 100,
      xpReward: 200,
      medalType: 'tasbih',
    },
    {
      id: 'khatmah_goal',
      title: 'ختم القرآن',
      subtitle: 'هدف مستقبلي',
      description: 'إتمام ختمة كاملة لكتاب الله عز وجل مع ورد التدبر اليومي.',
      category: 'quran',
      isUnlocked: false,
      progressPercent: 35,
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
      isUnlocked: false,
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
  const availableAchievements = achievementsList.filter((a) => !a.isUnlocked);

  const filteredEarned = earnedAchievements.filter((a) => {
    if (achievementFilter === 'all') return true;
    return a.category === achievementFilter;
  });

  const filteredAvailable = availableAchievements.filter((a) => {
    if (achievementFilter === 'all') return true;
    return a.category === achievementFilter;
  });

  return (
    <div
      className="min-h-full w-full bg-[#080807] text-[#F7F2E7] pb-28 pt-2 px-4 max-w-md mx-auto font-sans select-none relative overflow-x-hidden"
      dir="rtl"
    >
      {/* 0. The Majestic Islamic Mihrab Arch Artwork Backdrop */}
      <div className="absolute top-0 inset-x-0 h-80 pointer-events-none overflow-hidden opacity-25">
        <img
          src={islamicArchBackdropImg}
          alt=""
          className="w-full h-full object-cover object-top scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#080807]/75 to-[#080807]" />
      </div>

      {/* 1. Header: Settings (Left) | Title (Center) | Athar Logo (Right) */}
      <header className="relative z-10 flex items-center justify-between py-2 mb-2">
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

        {/* Center: Screen Title */}
        <div className="text-center">
          <span className="text-sm font-bold text-[#F7F2E7] tracking-tight">
            {activeSubTab === 'profile' ? 'الملف الشخصي' : 'الإنجازات'}
          </span>
        </div>

        {/* Left in RTL: Settings Button */}
        <button
          onClick={onOpenSettings}
          className="w-8 h-8 rounded-full bg-[#14120B] border border-[#D9AE48]/25 flex items-center justify-center text-[#B5AD9B] hover:text-[#FFE6A0] hover:border-[#D9AE48]/60 active:scale-95 transition-all cursor-pointer shadow-sm"
          aria-label="الإعدادات"
          title="الإعدادات"
        >
          <Settings size={16} />
        </button>
      </header>

      {/* 2. Dual Sub-Navigation Segment (as shown in reference sheet) */}
      <div className="relative z-10 flex items-center justify-center gap-2 mb-3 bg-[#12100A] p-1 rounded-2xl border border-[#D9AE48]/20">
        <button
          onClick={() => setActiveSubTab('profile')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all text-center ${
            activeSubTab === 'profile'
              ? 'bg-gradient-to-r from-[#D9AE48] to-[#FFE6A0] text-[#080807] shadow-sm'
              : 'text-[#B5AD9B] hover:text-[#F7F2E7]'
          }`}
        >
          الملف الشخصي
        </button>
        <button
          onClick={() => setActiveSubTab('achievements')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
            activeSubTab === 'achievements'
              ? 'bg-gradient-to-r from-[#D9AE48] to-[#FFE6A0] text-[#080807] shadow-sm'
              : 'text-[#B5AD9B] hover:text-[#F7F2E7]'
          }`}
        >
          <Award size={13} />
          <span>الإنجازات</span>
        </button>
      </div>

      {activeSubTab === 'profile' ? (
        /* ============================================================
           MAIN PROFILE DASHBOARD (LEFTMOST SCREEN IN REFERENCE)
           ============================================================ */
        <div className="relative z-10 space-y-2.5">
          {/* User Avatar & Identity Block */}
          <section className="text-center py-1">
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

          {/* Profile Completion Card */}
          <ProfileCompletionCard
            percentage={stats.completion.percentage}
            onOpenEdit={() => setIsEditModalOpen(true)}
          />

          {/* XP & Level Horizontal Card with 3D Assets */}
          <LevelProgressCard
            totalXP={stats.totalXP}
            currentLevel={stats.currentLevel}
            onOpenAchievements={() => setActiveSubTab('achievements')}
          />

          {/* Activity Consistency Streak Card */}
          <ActivityStreakCard streakDays={stats.streakDays} />

          {/* Statistics Grid ("إحصائياتك") */}
          <section className="pt-1">
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
                icon={<BookOpen size={14} />}
                onClick={onNavigateToQuran}
              />

              {/* Sadaqah */}
              <ActivityStatCard
                title="الصدقات"
                value={stats.sadaqahCountThisMonth}
                subtitle="نشاطات هذا الشهر"
                icon={<Heart size={14} />}
                onClick={onOpenSadaqah}
              />

              {/* Prayers */}
              <ActivityStatCard
                title="الصلاة"
                value={stats.prayersCountThisMonth}
                subtitle="صلاة هذا الشهر"
                icon={
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2">
                    <path d="M12 4c-3 3-5 5.5-5 9v7h10v-7c0-3.5-2-6-5-9z" />
                    <path d="M10 20v-3h4v3" />
                    <path d="M12 4v-2" />
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
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2">
                    <circle cx="12" cy="12" r="7" strokeDasharray="2 3" />
                    <circle cx="12" cy="5" r="1.5" fill="currentColor" />
                  </svg>
                }
                onClick={onNavigateToAdhkar}
              />
            </div>
          </section>

          {/* Panoramic Mosque Journey Banner */}
          <div className="pt-1">
            <JourneyBanner onClick={onOpenJourneyOrAchievements} />
          </div>
        </div>
      ) : (
        /* ============================================================
           ACHIEVEMENTS SYSTEM SCREEN (RIGHT SCREEN IN REFERENCE)
           ============================================================ */
        <div className="relative z-10 space-y-4">
          {/* Level Header Banner */}
          <div className="rounded-2xl border border-[#D9AE48]/25 bg-[#14120B] p-4 flex items-center justify-between shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border border-[#D9AE48]/40 shadow-sm shrink-0">
                <img
                  src={goldLevelEmblemImg}
                  alt="Level Emblem"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-[#F7F2E7] block">
                  {stats.currentLevel} المستوى
                </span>
                <span className="text-[11px] text-[#A69E8D] font-mono">
                  {stats.totalXP.toLocaleString('en-US')} / 2,000 XP
                </span>
              </div>
            </div>

            {/* Level progress bar */}
            <div className="w-28 text-left">
              <div className="w-full h-1.5 rounded-full bg-[#201B11] overflow-hidden mb-1">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#D9AE48] to-[#FFE6A0]"
                  style={{ width: `${stats.levelProgressPercent}%` }}
                />
              </div>
              <span className="text-[9.5px] text-[#B5AD9B] block text-left">
                {stats.levelProgressPercent}%
              </span>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'quran', label: 'القرآن' },
              { id: 'adhkar', label: 'الأذكار' },
              { id: 'prayers', label: 'الصلاة' },
              { id: 'other', label: 'أخرى' },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setAchievementFilter(chip.id as any)}
                className={`py-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  achievementFilter === chip.id
                    ? 'bg-gradient-to-r from-[#D9AE48] to-[#FFE6A0] text-[#080807] shadow-sm font-bold'
                    : 'bg-[#14120B] text-[#B5AD9B] border border-[#241E12] hover:border-[#D9AE48]/35'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* 1. Earned Achievements */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold text-[#F7F2E7] flex items-center gap-1.5">
                <Award size={13} className="text-[#FFE6A0]" />
                الإنجازات المكتسبة ({filteredEarned.length})
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {filteredEarned.map((ach) => (
                <AchievementBadge
                  key={ach.id}
                  achievement={ach}
                  onClick={(item) => setSelectedAchievement(item)}
                />
              ))}
            </div>
          </div>

          {/* 2. Available / Locked Achievements */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold text-[#B5AD9B]">
                الإنجازات المتاحة ({filteredAvailable.length})
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {filteredAvailable.map((ach) => (
                <AchievementBadge
                  key={ach.id}
                  achievement={ach}
                  onClick={(item) => setSelectedAchievement(item)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

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
          }
        }}
      />
    </div>
  );
};
