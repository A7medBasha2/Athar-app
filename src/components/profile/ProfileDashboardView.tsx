import React, { useState, useEffect } from 'react';
import { UserProfileData, AuthService } from '../../services/authService';
import { ProfileStatsService, UserSpiritualStats } from '../../services/profileStatsService';
import { ProfileEditModal } from '../ProfileEditModal';
import { AchievementDetailModal, AchievementItem } from './AchievementDetailModal';
import { AchievementBadge } from './AchievementBadge';
import atharInnerMihrabLogoTransparent from '../../assets/images/athar_inner_mihrab_logo_transparent.webp';
import islamicArchBackdropImg from '../../assets/images/islamic_arch_backdrop_1792548157455.jpg';
import islamicGeometricPatternImg from '../../assets/images/islamic_geometric_pattern_1792549638180.jpg';
import goldLevelEmblemImg from '../../assets/images/gold_level_emblem_1792548139937.jpg';
import goldXpBadgeImg from '../../assets/images/gold_xp_badge_1792548157202.jpg';
import journeyBannerMosqueImg from '../../assets/images/journey_banner_mosque_1792548139678.jpg';
import {
  Settings,
  Camera,
  Calendar,
  Flame,
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

/**
 * Validates whether a photo URL is a genuine user photo and NOT an app screenshot,
 * test preview, or dummy canvas capture.
 */
function isValidUserPhoto(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length < 10) return false;
  if (trimmed.startsWith('preset:')) return false;

  const lower = trimmed.toLowerCase();
  if (
    lower.includes('screenshot') ||
    lower.includes('preview') ||
    lower.includes('com.athar') ||
    lower.includes('screen_') ||
    lower.includes('applet')
  ) {
    return false;
  }

  return (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:')
  );
}

const SHOWCASE_ACHIEVEMENTS: AchievementItem[] = [
  {
    id: 'khatmah_master',
    title: 'خاتم القرآن',
    subtitle: 'تلاوة جزء يومياً وختم المصحف',
    description: 'وسام الشرف القرآني لمن أتم تلاوة آيات الذكر الحكيم وختم القرآن الكريم بتدبر وخشوع.',
    category: 'quran',
    isUnlocked: true,
    unlockedDate: 'مكتمل',
    progressPercent: 100,
    progressText: '١٠٠٪',
    xpReward: 500,
    medalType: 'quran',
  },
  {
    id: 'fajr_guardian',
    title: 'حارس الفجر',
    subtitle: 'صلاة الفجر في وقتها جماعة',
    description: 'وسام النور والبركة للمحافظين على فريضة الفجر في وقتها، ركعتا الفجر خير من الدنيا وما فيها.',
    category: 'prayers',
    isUnlocked: true,
    unlockedDate: 'مكتمل',
    progressPercent: 100,
    progressText: '١٠٠٪',
    xpReward: 350,
    medalType: 'mosque',
  },
  {
    id: 'streak_flame',
    title: 'شعلة الاستمرار',
    subtitle: 'المواظبة على العبادة دون انقطاع',
    description: 'وسام الثبات لمن حافظ على ورده الإيماني وصلواته وأذكاره لأكثر من 12 يوماً متتالياً.',
    category: 'consistency',
    isUnlocked: true,
    unlockedDate: 'مكتمل',
    progressPercent: 100,
    progressText: '١٠٠٪',
    xpReward: 300,
    medalType: 'flame',
  },
  {
    id: 'morning_dhikr',
    title: 'الذاكر بالأسحار',
    subtitle: 'تحصين النفس بأذكار الصباح والمساء',
    description: 'وسام الذاكرين الله كثيراً والذاكرات، لمن واظب على التسبيح والاستغفار وحصن المسلم.',
    category: 'adhkar',
    isUnlocked: true,
    unlockedDate: 'مكتمل',
    progressPercent: 100,
    progressText: '١٠٠٪',
    xpReward: 250,
    medalType: 'tasbih',
  },
  {
    id: 'hand_of_charity',
    title: 'يد العطاء',
    subtitle: 'بذل الصدقات ومساعدة المحتاجين',
    description: 'وسام الإحسان والجود في سبيل الله، وما أنفقتم من شيء فهو يخلفه وهو خير الرازقين.',
    category: 'charity',
    isUnlocked: true,
    unlockedDate: 'مكتمل',
    progressPercent: 100,
    progressText: '١٠٠٪',
    xpReward: 400,
    medalType: 'charity',
  },
  {
    id: 'itikaf_honor',
    title: 'معتكف العشر',
    subtitle: 'قيام ليالي العشر الأواخر والاعتكاف',
    description: 'وسام قيام ليالي القدر والعشر الأواخر من رمضان، تحرياً للأجر العظيم ومغفرة الذنوب.',
    category: 'prayers',
    isUnlocked: false,
    progressPercent: 45,
    progressText: '٤٥٪',
    xpReward: 600,
    medalType: 'general',
  },
];

export const ProfileDashboardView: React.FC<ProfileDashboardViewProps> = ({
  onOpenSettings,
  onNavigateToQuran,
  onNavigateToPrayers,
  onNavigateToAdhkar,
  onOpenSadaqah,
  onOpenJourneyOrAchievements,
}) => {
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Load and bind user profile dynamically from cache and Firestore
  const [profile, setProfile] = useState<UserProfileData | null>(() => {
    try {
      const cached = localStorage.getItem('athar_cached_profile');
      if (cached) {
        const parsed: UserProfileData = JSON.parse(cached);
        if (parsed.photoURL && !isValidUserPhoto(parsed.photoURL)) {
          parsed.photoURL = '';
        }
        return parsed;
      }
    } catch {}

    const user = AuthService.getCurrentUser();
    if (user) {
      return {
        uid: user.uid,
        displayName: user.displayName || 'أحمد محمد',
        email: user.email || 'ahmed@athar.app',
        username: user.email?.split('@')[0] || 'ahmed',
        photoURL: isValidUserPhoto(user.photoURL) ? (user.photoURL as string) : '',
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

  // Sync dynamically with Firestore user data
  useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (user) {
      AuthService.getUserProfile(user.uid).then((p) => {
        if (p) {
          if (p.photoURL && !isValidUserPhoto(p.photoURL)) {
            p.photoURL = '';
          }
          setProfile(p);
          setStats(ProfileStatsService.getSpiritualStats(p));
        }
      });
    }
  }, []);

  const handleProfileUpdated = (updatedProfile: UserProfileData) => {
    if (updatedProfile.photoURL && !isValidUserPhoto(updatedProfile.photoURL)) {
      updatedProfile.photoURL = '';
    }
    setProfile(updatedProfile);
    setStats(ProfileStatsService.getSpiritualStats(updatedProfile));
  };

  const hasValidPhoto = isValidUserPhoto(profile?.photoURL);

  return (
    <div
      className="min-h-full w-full bg-[#080807] text-[#F7F2E7] pb-28 pt-1 px-4 max-w-md mx-auto font-sans select-none relative overflow-x-hidden"
      dir="rtl"
    >
      {/* Subtle Islamic Geometric Pattern Wallpaper */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04] bg-repeat"
        style={{
          backgroundImage: `url(${islamicGeometricPatternImg})`,
          backgroundSize: '200px 200px',
        }}
      />

      {/* Deep Arched Islamic Silhouette Background with soft golden apex glow */}
      <div className="absolute top-0 inset-x-0 h-84 pointer-events-none overflow-hidden opacity-35">
        <img
          src={islamicArchBackdropImg}
          alt=""
          className="w-full h-full object-cover object-top scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#080807]/70 to-[#080807]" />
      </div>

      {/* ============================================================
         A. TOP HEADER & HERO IDENTITY CARD
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

      {/* Hero Avatar Component & Identity */}
      <section className="relative z-10 text-center py-1 mb-2.5">
        {/* Centered circular profile frame with 2px solid gold stroke (#D9AE48) */}
        <div className="relative inline-block mx-auto mb-1.5">
          {/* Soft Golden Outer Gradient Glow */}
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,_rgba(217,174,72,0.4)_0%,_transparent_72%)] blur-xl scale-125 pointer-events-none" />

          <div className="relative w-[100px] h-[100px] rounded-full p-[2px] border-2 border-[#D9AE48] shadow-[0_0_20px_rgba(217,174,72,0.35)] bg-[#14120B] flex items-center justify-center select-none">
            {/* Avatar Photo or Default Silhouette */}
            <div className="w-full h-full rounded-full overflow-hidden bg-[#12100C] flex items-center justify-center relative">
              {hasValidPhoto ? (
                <img
                  src={profile?.photoURL || ''}
                  alt={profile?.displayName || 'المستخدم'}
                  className="w-full h-full object-cover object-center aspect-square"
                />
              ) : (
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full"
                  aria-hidden="true"
                >
                  <rect width="100" height="100" fill="#14110B" />
                  <defs>
                    <radialGradient id="avatarSilhouetteGlow" cx="50%" cy="35%" r="60%">
                      <stop offset="0%" stopColor="#2E2618" />
                      <stop offset="100%" stopColor="#12100C" />
                    </radialGradient>
                  </defs>
                  {/* Head */}
                  <circle
                    cx="50"
                    cy="36"
                    r="15"
                    fill="url(#avatarSilhouetteGlow)"
                    stroke="#D9AE48"
                    strokeWidth="0.8"
                    strokeOpacity="0.45"
                  />
                  {/* Shoulders & Torso */}
                  <path
                    d="M 23 88 C 23 63, 34 54, 50 54 C 66 54, 77 63, 77 88 Z"
                    fill="url(#avatarSilhouetteGlow)"
                    stroke="#D9AE48"
                    strokeWidth="0.8"
                    strokeOpacity="0.45"
                  />
                </svg>
              )}
            </div>

            {/* Small floating circular camera action button (#D9AE48) at bottom-right */}
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="absolute bottom-0.5 right-0.5 w-6 h-6 rounded-full bg-[#D9AE48] text-[#080807] flex items-center justify-center border-2 border-[#080807] shadow-md hover:bg-[#FFE6A0] active:scale-95 transition-all cursor-pointer z-10"
              aria-label="تغيير الصورة الشخصية"
              title="تعديل الصورة"
            >
              <Camera size={12} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Name: 18sp bold warm off-white (#F7F2E7) */}
        <h1 className="text-[18px] font-bold text-[#F7F2E7] tracking-tight mb-0.5">
          {profile?.displayName || 'أحمد محمد'}
        </h1>

        {/* Handle: 14sp warm gray (#B5AD9B) */}
        <div
          onClick={() => setIsEditModalOpen(true)}
          className="text-[14px] font-semibold text-[#D9AE48] font-mono tracking-wide cursor-pointer hover:underline mb-1"
          dir="ltr"
        >
          @{profile?.username || 'ahmed'}
        </div>

        {/* Membership Info: Small calendar icon + "عضو منذ 12 مارس 2025" */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-[#B5AD9B] font-medium">
          <Calendar size={12} className="text-[#D9AE48]" />
          <span>عضو منذ {stats.joinDateFormatted || '12 مارس 2025'}</span>
        </div>
      </section>

      {/* ============================================================
         B. PROFILE COMPLETION CARD
         ============================================================ */}
      <section
        onClick={() => setIsEditModalOpen(true)}
        className="rounded-2xl border border-[#2B2414] bg-[#14120B] px-4 py-3 mb-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.5)] cursor-pointer hover:border-[#D9AE48]/40 transition-all select-none"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#F7F2E7]">
            اكتمال الملف الشخصي
          </span>
          <span className="text-xs font-bold text-[#FFE6A0] font-mono">
            {stats.completion.percentage}%
          </span>
        </div>

        {/* Filled with a smooth linear gradient from #FFE6A0 to #D9AE48 */}
        <div className="w-full h-1.5 rounded-full bg-[#1A160F] overflow-hidden mb-1.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#FFE6A0] to-[#D9AE48] transition-all duration-700"
            style={{ width: `${stats.completion.percentage}%` }}
          />
        </div>

        <p className="text-[11px] text-[#B5AD9B] text-center font-medium">
          أكمل ملفك الشخصي لتجربة أفضل
        </p>
      </section>

      {/* ============================================================
         C. LEVEL & XP SUMMARY CARD
         ============================================================ */}
      <section
        onClick={() => {
          if (onOpenJourneyOrAchievements) onOpenJourneyOrAchievements();
        }}
        className="rounded-2xl border border-[#2B2414] bg-[#14120B] p-3.5 mb-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.5)] cursor-pointer hover:border-[#D9AE48]/40 transition-all select-none"
      >
        <div className="grid grid-cols-2 divide-x divide-x-reverse divide-[#262013]">
          {/* Right Column (XP in RTL) */}
          <div className="pe-3 text-right">
            <span className="text-[11px] font-medium text-[#B5AD9B] block mb-0.5">
              نقاط الخبرة
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-[#F7F2E7] font-mono tracking-tight">
                {stats.totalXP.toLocaleString('en-US')}
              </span>
              {/* Metallic 3D XP Badge */}
              <div className="relative w-8 h-8 rounded-full overflow-hidden shadow-[0_2px_10px_rgba(217,174,72,0.35)] shrink-0 border border-[#D9AE48]/40">
                <img
                  src={goldXpBadgeImg}
                  alt="XP"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Left Column (Level in RTL) */}
          <div className="ps-3 text-right">
            <span className="text-[11px] font-medium text-[#B5AD9B] block mb-0.5">
              المستوى
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-[#F7F2E7] font-mono tracking-tight">
                {stats.currentLevel}
              </span>
              {/* Metallic 3D Gold Level Rosette Emblem */}
              <div className="relative w-8 h-8 rounded-full overflow-hidden shadow-[0_2px_10px_rgba(217,174,72,0.35)] shrink-0 border border-[#D9AE48]/40">
                <img
                  src={goldLevelEmblemImg}
                  alt={`المستوى ${stats.currentLevel}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
         D. STREAK & CONSISTENCY CARD (أيام الاستمرار)
         ============================================================ */}
      <section className="rounded-2xl border border-[#2B2414] bg-[#14120B] px-4 py-2.5 mb-3 shadow-[0_4px_16px_rgba(0,0,0,0.5)] flex items-center justify-between select-none">
        {/* Right in RTL: Motivational subtext & vector sprig */}
        <div className="flex items-center gap-2 text-right">
          <div>
            <span className="text-xs font-bold text-[#F7F2E7] block leading-tight">
              الاستمرارية تصنع
            </span>
            <span className="text-xs font-bold text-[#D9AE48] block leading-tight">
              الفرق ..
            </span>
          </div>
          {/* Subtle Golden Olive Branch */}
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 text-[#D9AE48] fill-current"
            opacity="0.85"
            aria-hidden="true"
          >
            <path d="M12 2C12 2 13 8 18 10C13 12 12 18 12 18C12 18 11 12 6 10C11 8 12 2 12 2Z" />
            <path d="M7 14C9 14 11 16 11 18C9 18 7 16 7 14Z" opacity="0.6" />
            <path d="M17 14C15 14 13 16 13 18C15 18 17 16 17 14Z" opacity="0.6" />
          </svg>
        </div>

        {/* Left in RTL: Glowing flame in circular #1B170B container & metric */}
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <span className="text-[10px] font-medium text-[#B5AD9B] block">
              أيام الاستمرار
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-[#F7F2E7] font-mono">
                {stats.streakDays}
              </span>
              <span className="text-[10px] text-[#B5AD9B]">يوماً متتالياً</span>
            </div>
          </div>

          {/* Glowing flame icon inside circular dark-gold highlighted container (#1B170B) */}
          <div className="w-8 h-8 rounded-full bg-[#1B170B] border border-[#D9AE48]/45 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(217,174,72,0.25)]">
            <Flame size={16} className="text-[#FFE6A0] fill-[#D9AE48]" />
          </div>
        </div>
      </section>

      {/* ============================================================
         E. ACTIVITY STATISTICS GRID (إحصائياتك)
         ============================================================ */}
      <section className="mb-3 select-none">
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <BarChart3 size={14} className="text-[#D9AE48]" />
          <h2 className="text-xs font-bold text-[#F7F2E7]">إحصائياتك</h2>
        </div>

        {/* 2x2 Uniform Cards Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Card 1: القرآن */}
          <div
            onClick={onNavigateToQuran}
            className="rounded-2xl border border-[#2B2414] bg-[#14120B] p-3 shadow-[0_4px_16px_rgba(0,0,0,0.5)] hover:border-[#D9AE48]/45 transition-all cursor-pointer flex flex-col justify-between min-h-[96px] active:scale-[0.98] group"
          >
            <div className="flex items-start justify-between">
              <div className="text-right">
                <span className="text-[11px] font-semibold text-[#B5AD9B] block mb-0.5">
                  القرآن
                </span>
                <span className="text-xl font-bold text-[#F7F2E7] font-mono block tracking-tight group-hover:text-[#FFE6A0] transition-colors">
                  {stats.quranHoursThisMonth}
                </span>
                <span className="text-[9.5px] text-[#B5AD9B] block mt-0.5">
                  ساعات هذا الشهر
                </span>
              </div>
              {/* Book icon inside a gold-ringed circle */}
              <div className="relative w-8 h-8 rounded-full p-[1px] bg-gradient-to-tr from-[#916E25] via-[#FFE6A0] to-[#D9AE48] shrink-0 shadow-[0_2px_8px_rgba(217,174,72,0.25)]">
                <div className="w-full h-full rounded-full bg-[#1C170E] flex items-center justify-center text-[#FFE6A0]">
                  <BookOpen size={14} strokeWidth={2.2} />
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <ChevronLeft size={13} className="text-[#6D6450] group-hover:text-[#D9AE48] transition-colors" />
            </div>
          </div>

          {/* Card 2: الصدقات */}
          <div
            onClick={onOpenSadaqah}
            className="rounded-2xl border border-[#2B2414] bg-[#14120B] p-3 shadow-[0_4px_16px_rgba(0,0,0,0.5)] hover:border-[#D9AE48]/45 transition-all cursor-pointer flex flex-col justify-between min-h-[96px] active:scale-[0.98] group"
          >
            <div className="flex items-start justify-between">
              <div className="text-right">
                <span className="text-[11px] font-semibold text-[#B5AD9B] block mb-0.5">
                  الصدقات
                </span>
                <span className="text-xl font-bold text-[#F7F2E7] font-mono block tracking-tight group-hover:text-[#FFE6A0] transition-colors">
                  {stats.sadaqahCountThisMonth}
                </span>
                <span className="text-[9.5px] text-[#B5AD9B] block mt-0.5">
                  نشاطات هذا الشهر
                </span>
              </div>
              {/* Heart icon inside a gold-ringed circle */}
              <div className="relative w-8 h-8 rounded-full p-[1px] bg-gradient-to-tr from-[#916E25] via-[#FFE6A0] to-[#D9AE48] shrink-0 shadow-[0_2px_8px_rgba(217,174,72,0.25)]">
                <div className="w-full h-full rounded-full bg-[#1C170E] flex items-center justify-center text-[#FFE6A0]">
                  <Heart size={14} strokeWidth={2.2} className="fill-[#D9AE48]/35" />
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <ChevronLeft size={13} className="text-[#6D6450] group-hover:text-[#D9AE48] transition-colors" />
            </div>
          </div>

          {/* Card 3: الصلاة */}
          <div
            onClick={onNavigateToPrayers}
            className="rounded-2xl border border-[#2B2414] bg-[#14120B] p-3 shadow-[0_4px_16px_rgba(0,0,0,0.5)] hover:border-[#D9AE48]/45 transition-all cursor-pointer flex flex-col justify-between min-h-[96px] active:scale-[0.98] group"
          >
            <div className="flex items-start justify-between">
              <div className="text-right">
                <span className="text-[11px] font-semibold text-[#B5AD9B] block mb-0.5">
                  الصلاة
                </span>
                <span className="text-xl font-bold text-[#F7F2E7] font-mono block tracking-tight group-hover:text-[#FFE6A0] transition-colors">
                  {stats.prayersCountThisMonth}
                </span>
                <span className="text-[9.5px] text-[#B5AD9B] block mt-0.5">
                  صلاة هذا الشهر
                </span>
              </div>
              {/* Mosque icon inside a gold-ringed circle */}
              <div className="relative w-8 h-8 rounded-full p-[1px] bg-gradient-to-tr from-[#916E25] via-[#FFE6A0] to-[#D9AE48] shrink-0 shadow-[0_2px_8px_rgba(217,174,72,0.25)]">
                <div className="w-full h-full rounded-full bg-[#1C170E] flex items-center justify-center text-[#FFE6A0]">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#D9AE48]/30 stroke-[#FFE6A0] stroke-[1.8]">
                    <path d="M12 3c-2.5 2.5-4 5-4 8v8h8v-8c0-3-1.5-5.5-4-8z" />
                    <path d="M10 19v-4h4v4" />
                    <path d="M12 3V1" />
                    <path d="M4 11h2v8H4z" />
                    <path d="M18 11h2v8h-2z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <ChevronLeft size={13} className="text-[#6D6450] group-hover:text-[#D9AE48] transition-colors" />
            </div>
          </div>

          {/* Card 4: الأذكار */}
          <div
            onClick={onNavigateToAdhkar}
            className="rounded-2xl border border-[#2B2414] bg-[#14120B] p-3 shadow-[0_4px_16px_rgba(0,0,0,0.5)] hover:border-[#D9AE48]/45 transition-all cursor-pointer flex flex-col justify-between min-h-[96px] active:scale-[0.98] group"
          >
            <div className="flex items-start justify-between">
              <div className="text-right">
                <span className="text-[11px] font-semibold text-[#B5AD9B] block mb-0.5">
                  الأذكار
                </span>
                <span className="text-xl font-bold text-[#F7F2E7] font-mono block tracking-tight group-hover:text-[#FFE6A0] transition-colors">
                  {stats.adhkarCountThisMonth}
                </span>
                <span className="text-[9.5px] text-[#B5AD9B] block mt-0.5">
                  مرة هذا الشهر
                </span>
              </div>
              {/* Rosary/Tasbih icon inside a gold-ringed circle */}
              <div className="relative w-8 h-8 rounded-full p-[1px] bg-gradient-to-tr from-[#916E25] via-[#FFE6A0] to-[#D9AE48] shrink-0 shadow-[0_2px_8px_rgba(217,174,72,0.25)]">
                <div className="w-full h-full rounded-full bg-[#1C170E] flex items-center justify-center text-[#FFE6A0]">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-[#FFE6A0] stroke-[1.8]">
                    <circle cx="12" cy="12" r="7" strokeDasharray="3 3" />
                    <circle cx="12" cy="5" r="1.5" fill="#D9AE48" />
                    <circle cx="12" cy="19" r="1.2" fill="#D9AE48" />
                    <path d="M12 19v3" />
                    <path d="M10 22h4" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <ChevronLeft size={13} className="text-[#6D6450] group-hover:text-[#D9AE48] transition-colors" />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
         F. ACHIEVEMENTS & ROYAL MEDALS SHOWCASE (الأوسمة الملكية)
         Directly prominent on the user profile dashboard!
         ============================================================ */}
      <section className="mb-3 select-none">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1.5">
            <Award size={15} className="text-[#D9AE48]" />
            <h2 className="text-xs font-bold text-[#F7F2E7]">الأوسمة الملكية</h2>
            <span className="text-[10px] text-[#D9AE48] font-mono bg-[#1C170E] px-1.5 py-0.5 rounded-full border border-[#D9AE48]/30">
              5/6
            </span>
          </div>
          {onOpenJourneyOrAchievements && (
            <button
              onClick={onOpenJourneyOrAchievements}
              className="text-[11px] font-bold text-[#D9AE48] hover:text-[#FFE6A0] flex items-center gap-0.5 transition-colors cursor-pointer"
            >
              <span>عرض الكل</span>
              <ChevronLeft size={13} />
            </button>
          )}
        </div>

        {/* Real Medals Row with Horizontal Scroll */}
        <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 px-0.5 scrollbar-none snap-x">
          {SHOWCASE_ACHIEVEMENTS.map((achievement) => (
            <AchievementBadge
              key={achievement.id}
              achievement={achievement}
              onClick={(item) => setSelectedAchievement(item)}
              size="md"
              className="snap-start min-w-[80px] sm:min-w-[88px] bg-[#14120B] border border-[#2B2414] hover:border-[#D9AE48]/50"
            />
          ))}
        </div>
      </section>

      {/* ============================================================
         G. JOURNEY BANNER (رحلتك مع أثر)
         ============================================================ */}
      <section
        onClick={onOpenJourneyOrAchievements}
        className="relative overflow-hidden rounded-2xl border border-[#2B2414] bg-[#120F09] min-h-[76px] shadow-[0_6px_20px_rgba(0,0,0,0.6)] cursor-pointer hover:border-[#D9AE48]/50 active:scale-[0.99] transition-all select-none group"
      >
        {/* Atmospheric golden silhouette illustration of minarets, domes, and crescent moon */}
        <div className="absolute inset-y-0 left-0 w-3/4 pointer-events-none overflow-hidden">
          <img
            src={journeyBannerMosqueImg}
            alt="رحلتك مع أثر"
            className="w-full h-full object-cover object-left opacity-75 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#120F09]/45 to-[#120F09]" />
        </div>

        {/* Text and Leading Navigation Arrow Chevron */}
        <div className="relative z-10 flex items-center justify-between px-4 py-3 h-full">
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-sm font-bold text-[#F7F2E7] mb-0.5 tracking-tight group-hover:text-[#FFE6A0] transition-colors">
              <span>رحلتك مع أثر</span>
              <ChevronLeft size={15} className="text-[#FFE6A0] transition-transform group-hover:-translate-x-0.5" />
            </div>
            <p className="text-[10.5px] text-[#B5AD9B] font-medium">
              خطوات صغيرة .. أثر كبير
            </p>
          </div>
        </div>
      </section>

      {/* Edit Profile Modal */}
      <ProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentProfile={profile}
        onProfileUpdated={handleProfileUpdated}
      />

      {/* Achievement Detail Modal when tapped */}
      <AchievementDetailModal
        isOpen={Boolean(selectedAchievement)}
        onClose={() => setSelectedAchievement(null)}
        achievement={selectedAchievement}
      />
    </div>
  );
};
