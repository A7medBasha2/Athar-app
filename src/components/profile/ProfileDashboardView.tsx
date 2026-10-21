import React, { useState, useEffect } from 'react';
import { UserProfileData, AuthService } from '../../services/authService';
import { ProfileStatsService, UserSpiritualStats } from '../../services/profileStatsService';
import { ProfileEditModal } from '../ProfileEditModal';
import { AchievementDetailModal, AchievementItem } from './AchievementDetailModal';

// Extracted pixel-perfect assets with zero ghosting
import atharArchPureBackdropImg from '../../assets/images/athar_arch_pure_backdrop.png';
import exactLevelRosetteImg from '../../assets/images/exact_level_rosette.png';
import exactXpStarImg from '../../assets/images/exact_xp_star.png';
import exactStreakFlameCircleImg from '../../assets/images/exact_streak_flame_circle.png';
import exactStatIconQuranImg from '../../assets/images/exact_stat_icon_quran.png';
import exactStatIconSadaqahImg from '../../assets/images/exact_stat_icon_sadaqah.png';
import exactStatIconPrayerImg from '../../assets/images/exact_stat_icon_prayer.png';
import exactStatIconAdhkarImg from '../../assets/images/exact_stat_icon_adhkar.png';
import exactJourneyMosqueArtImg from '../../assets/images/exact_journey_mosque_art.png';
import atharInnerMihrabLogoTransparent from '../../assets/images/athar_inner_mihrab_logo_transparent.webp';
import islamicGeometricPatternImg from '../../assets/images/islamic_geometric_pattern_1792549638180.jpg';

import {
  Settings,
  Camera,
  Calendar,
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
      className="min-h-full w-full bg-[#080807] text-[#F7F2E7] pb-24 pt-0 px-4 max-w-md mx-auto font-sans select-none relative overflow-x-hidden"
      dir="rtl"
    >
      {/* 1. Subtle Islamic Geometric Pattern Wallpaper for fine luxury texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] bg-repeat z-0"
        style={{
          backgroundImage: `url(${islamicGeometricPatternImg})`,
          backgroundSize: '220px 220px',
        }}
      />

      {/* ============================================================
         2. TOP ISLAMIC ARCHED HEADER BACKGROUND CONTAINER
         Sits flush against the very top edge of the screen (top-0)
         without any black gaps, awkward overlapping, or disjointed cropping.
         Provides pure arch framing and golden aura backlight.
         ============================================================ */}
      <div className="absolute top-0 inset-x-0 h-[380px] pointer-events-none overflow-hidden z-0">
        <img
          src={atharArchPureBackdropImg}
          alt=""
          className="w-full h-full object-cover object-top"
        />
        {/* Soft gradient dissolve to blend seamlessly into #080807 */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent via-[#080807]/75 to-[#080807]" />
      </div>

      {/* ============================================================
         3. TOP NAVIGATION HEADER
         Right (RTL): "أثر" Wordmark + Calligraphic Crest
         Left (RTL): Settings Gear Icon
         ============================================================ */}
      <header className="relative z-10 flex items-center justify-between pt-3 pb-1 px-1">
        {/* Right in RTL: Athar Brand Calligraphy & Medallion */}
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-8 rounded-full bg-[#18150E] border border-[#D9AE48]/50 p-1 flex items-center justify-center shadow-[0_2px_8px_rgba(217,174,72,0.25)]">
            <img
              src={atharInnerMihrabLogoTransparent}
              alt="أثر"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-2xl font-bold tracking-tight text-[#FFE6A0] font-arabic">
            أثر
          </span>
        </div>

        {/* Left in RTL: Pure Line Art Settings Gear */}
        <button
          onClick={onOpenSettings}
          className="p-2 text-[#D9AE48] hover:text-[#FFE6A0] active:scale-95 transition-all cursor-pointer rounded-full hover:bg-[#D9AE48]/10"
          aria-label="الإعدادات"
          title="الإعدادات"
        >
          <Settings size={22} strokeWidth={1.8} />
        </button>
      </header>

      {/* ============================================================
         4. HERO AVATAR & IDENTITY SECTION
         Framed inside the golden arched gradient background
         without overlapping text or duplicate/ghost elements
         ============================================================ */}
      <section className="relative z-10 text-center pt-2 pb-2 mb-2">
        {/* Centered circular profile frame */}
        <div className="relative inline-block mx-auto mb-2">
          {/* Soft Golden Outer Radial Glow */}
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,_rgba(217,174,72,0.3)_0%,_transparent_72%)] blur-lg scale-110 pointer-events-none" />

          {/* Opaque Circular Avatar Container */}
          <div className="relative w-[104px] h-[104px] rounded-full p-[2px] border-2 border-[#D9AE48] shadow-[0_0_20px_rgba(217,174,72,0.35)] bg-[#14120B] flex items-center justify-center select-none">
            {hasValidPhoto ? (
              /* Genuine user photo */
              <div className="w-full h-full rounded-full overflow-hidden bg-[#12100C] flex items-center justify-center">
                <img
                  src={profile?.photoURL || ''}
                  alt={profile?.displayName || 'المستخدم'}
                  className="w-full h-full object-cover object-center aspect-square"
                />
              </div>
            ) : (
              /* Vector silhouette matching reference with 100% precision */
              <div
                onClick={() => setIsEditModalOpen(true)}
                className="w-full h-full rounded-full overflow-hidden bg-[#14120B] flex items-center justify-center cursor-pointer"
                title="تعديل الصورة الشخصية"
              >
                <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
                  <defs>
                    <radialGradient id="avatarGlowGradient" cx="50%" cy="30%" r="65%">
                      <stop offset="0%" stopColor="#2E2618" />
                      <stop offset="70%" stopColor="#1C1810" />
                      <stop offset="100%" stopColor="#14120B" />
                    </radialGradient>
                  </defs>
                  {/* Silhouette Head */}
                  <circle
                    cx="50"
                    cy="35"
                    r="15"
                    fill="url(#avatarGlowGradient)"
                    stroke="#D9AE48"
                    strokeWidth="0.8"
                    strokeOpacity="0.4"
                  />
                  {/* Silhouette Torso & Shoulders */}
                  <path
                    d="M 21 86 C 21 61, 33 52, 50 52 C 67 52, 79 61, 79 86 Z"
                    fill="url(#avatarGlowGradient)"
                    stroke="#D9AE48"
                    strokeWidth="0.8"
                    strokeOpacity="0.4"
                  />
                </svg>
              </div>
            )}

            {/* Small floating circular camera action button (#D9AE48) */}
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="absolute bottom-0.5 right-0.5 w-6 h-6 rounded-full bg-[#D9AE48] text-[#080807] flex items-center justify-center border-2 border-[#080807] shadow-md hover:bg-[#FFE6A0] active:scale-95 transition-all cursor-pointer z-10"
              aria-label="تغيير الصورة الشخصية"
              title="تعديل الصورة"
            >
              <Camera size={12} strokeWidth={2.4} />
            </button>
          </div>
        </div>

        {/* Name: 18sp bold warm off-white (#F7F2E7) */}
        <h1 className="text-[18px] font-bold text-[#F7F2E7] tracking-tight mb-0.5">
          {profile?.displayName || 'أحمد محمد'}
        </h1>

        {/* Handle: 14sp gold (#D9AE48) */}
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
         5. STANDARDIZED CARDS SYSTEM ("ستمبة واحدة")
         Surface: #14120B
         Border: 1px solid #D9AE48 with 20% opacity (hover 40%)
         Radius: rounded-2xl
         Spacing: mb-3
         ============================================================ */}

      {/* CARD 1: PROFILE COMPLETION (اكتمال الملف الشخصي) */}
      <section
        onClick={() => setIsEditModalOpen(true)}
        className="relative z-10 rounded-2xl border border-[#D9AE48]/20 bg-[#14120B] p-3.5 mb-3 shadow-[0_4px_16px_rgba(0,0,0,0.6)] cursor-pointer hover:border-[#D9AE48]/40 transition-all select-none"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#F7F2E7]">
            اكتمال الملف الشخصي
          </span>
          <span className="text-xs font-bold text-[#FFE6A0] font-mono">
            {stats.completion.percentage}%
          </span>
        </div>

        {/* Progress Track & Gradient Fill */}
        <div className="w-full h-2 rounded-full bg-[#1A160F] overflow-hidden mb-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#D9AE48] via-[#E8C56E] to-[#FFE6A0] transition-all duration-700 shadow-[0_0_8px_rgba(217,174,72,0.35)]"
            style={{ width: `${stats.completion.percentage}%` }}
          />
        </div>

        <p className="text-[11px] text-[#B5AD9B] text-center font-medium">
          أكمل ملفك الشخصي لتجربة أفضل
        </p>
      </section>

      {/* CARD 2: LEVEL & XP SUMMARY (نقاط الخبرة والمستوى) */}
      <section
        onClick={() => {
          if (onOpenJourneyOrAchievements) onOpenJourneyOrAchievements();
        }}
        className="relative z-10 rounded-2xl border border-[#D9AE48]/20 bg-[#14120B] p-3.5 mb-3 shadow-[0_4px_16px_rgba(0,0,0,0.6)] cursor-pointer hover:border-[#D9AE48]/40 transition-all select-none"
      >
        <div className="grid grid-cols-2 divide-x divide-x-reverse divide-[#262013]">
          {/* Right Column (XP in RTL) */}
          <div className="pe-3 text-right">
            <span className="text-[11px] font-medium text-[#B5AD9B] block mb-1">
              نقاط الخبرة
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-[#F7F2E7] font-mono tracking-tight">
                {stats.totalXP.toLocaleString('en-US')}
              </span>
              {/* Gold Star XP Badge */}
              <div className="relative w-8 h-8 shrink-0">
                <img
                  src={exactXpStarImg}
                  alt="XP"
                  className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(217,174,72,0.3)]"
                />
              </div>
            </div>
          </div>

          {/* Left Column (Level in RTL) */}
          <div className="ps-3 text-right">
            <span className="text-[11px] font-medium text-[#B5AD9B] block mb-1">
              المستوى
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-[#F7F2E7] font-mono tracking-tight">
                {stats.currentLevel}
              </span>
              {/* Rosette Gold Medal */}
              <div className="relative w-8 h-8 shrink-0">
                <img
                  src={exactLevelRosetteImg}
                  alt={`المستوى ${stats.currentLevel}`}
                  className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(217,174,72,0.3)]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CARD 3: STREAK & CONSISTENCY (أيام الاستمرار) */}
      <section className="relative z-10 rounded-2xl border border-[#D9AE48]/20 bg-[#14120B] p-3.5 mb-3 shadow-[0_4px_16px_rgba(0,0,0,0.6)] flex items-center justify-between select-none">
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
            opacity="0.9"
            aria-hidden="true"
          >
            <path d="M12 2C12 2 13 8 18 10C13 12 12 18 12 18C12 18 11 12 6 10C11 8 12 2 12 2Z" />
            <path d="M7 14C9 14 11 16 11 18C9 18 7 16 7 14Z" opacity="0.65" />
            <path d="M17 14C15 14 13 16 13 18C15 18 17 16 17 14Z" opacity="0.65" />
          </svg>
        </div>

        {/* Center Divider Line */}
        <div className="h-7 w-px bg-[#262013]" />

        {/* Left in RTL: Streak metric & glowing flame icon */}
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

          {/* Sliced exact streak flame circle */}
          <div className="w-8 h-8 shrink-0">
            <img
              src={exactStreakFlameCircleImg}
              alt="شعلة الاستمرار"
              className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(217,174,72,0.35)]"
            />
          </div>
        </div>
      </section>

      {/* CARD 4: ACTIVITY STATISTICS GRID (إحصائياتك) */}
      <section className="relative z-10 mb-3 select-none">
        <div className="flex items-center gap-1.5 mb-2 px-1">
          {/* Subtle bar chart icon matching reference */}
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#D9AE48]" aria-hidden="true">
            <rect x="3" y="12" width="4" height="8" rx="1" />
            <rect x="10" y="7" width="4" height="13" rx="1" />
            <rect x="17" y="3" width="4" height="17" rx="1" />
          </svg>
          <h2 className="text-xs font-bold text-[#F7F2E7]">إحصائياتك</h2>
        </div>

        {/* 2x2 Uniform Cards Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Card 1: القرآن (Top Right in RTL) */}
          <div
            onClick={onNavigateToQuran}
            className="rounded-2xl border border-[#D9AE48]/20 bg-[#14120B] p-3 shadow-[0_4px_16px_rgba(0,0,0,0.6)] hover:border-[#D9AE48]/40 transition-all cursor-pointer flex flex-col justify-between min-h-[98px] active:scale-[0.98] group"
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
              {/* Exact Sliced Quran Gold Icon Medallion */}
              <div className="w-8 h-8 shrink-0">
                <img
                  src={exactStatIconQuranImg}
                  alt="القرآن"
                  className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(217,174,72,0.3)]"
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <ChevronLeft size={13} className="text-[#6D6450] group-hover:text-[#D9AE48] transition-colors" />
            </div>
          </div>

          {/* Card 2: الصدقات (Top Left in RTL) */}
          <div
            onClick={onOpenSadaqah}
            className="rounded-2xl border border-[#D9AE48]/20 bg-[#14120B] p-3 shadow-[0_4px_16px_rgba(0,0,0,0.6)] hover:border-[#D9AE48]/40 transition-all cursor-pointer flex flex-col justify-between min-h-[98px] active:scale-[0.98] group"
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
              {/* Exact Sliced Sadaqah Gold Icon Medallion */}
              <div className="w-8 h-8 shrink-0">
                <img
                  src={exactStatIconSadaqahImg}
                  alt="الصدقات"
                  className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(217,174,72,0.3)]"
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <ChevronLeft size={13} className="text-[#6D6450] group-hover:text-[#D9AE48] transition-colors" />
            </div>
          </div>

          {/* Card 3: الأذكار (Bottom Right in RTL) */}
          <div
            onClick={onNavigateToAdhkar}
            className="rounded-2xl border border-[#D9AE48]/20 bg-[#14120B] p-3 shadow-[0_4px_16px_rgba(0,0,0,0.6)] hover:border-[#D9AE48]/40 transition-all cursor-pointer flex flex-col justify-between min-h-[98px] active:scale-[0.98] group"
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
              {/* Exact Sliced Adhkar Gold Icon Medallion */}
              <div className="w-8 h-8 shrink-0">
                <img
                  src={exactStatIconAdhkarImg}
                  alt="الأذكار"
                  className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(217,174,72,0.3)]"
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <ChevronLeft size={13} className="text-[#6D6450] group-hover:text-[#D9AE48] transition-colors" />
            </div>
          </div>

          {/* Card 4: الصلاة (Bottom Left in RTL) */}
          <div
            onClick={onNavigateToPrayers}
            className="rounded-2xl border border-[#D9AE48]/20 bg-[#14120B] p-3 shadow-[0_4px_16px_rgba(0,0,0,0.6)] hover:border-[#D9AE48]/40 transition-all cursor-pointer flex flex-col justify-between min-h-[98px] active:scale-[0.98] group"
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
              {/* Exact Sliced Prayer Mosque Gold Icon Medallion */}
              <div className="w-8 h-8 shrink-0">
                <img
                  src={exactStatIconPrayerImg}
                  alt="الصلاة"
                  className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(217,174,72,0.3)]"
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <ChevronLeft size={13} className="text-[#6D6450] group-hover:text-[#D9AE48] transition-colors" />
            </div>
          </div>
        </div>
      </section>

      {/* CARD 5: JOURNEY BANNER (رحلتك مع أثر) */}
      <section
        onClick={onOpenJourneyOrAchievements}
        className="relative z-10 overflow-hidden rounded-2xl border border-[#D9AE48]/20 bg-[#14120B] min-h-[80px] shadow-[0_6px_20px_rgba(0,0,0,0.6)] cursor-pointer hover:border-[#D9AE48]/40 active:scale-[0.99] transition-all select-none group"
      >
        {/* Left half: Illuminated golden mosque skyline art */}
        <div className="absolute inset-y-0 left-0 w-1/2 pointer-events-none overflow-hidden">
          <img
            src={exactJourneyMosqueArtImg}
            alt="رحلتك مع أثر"
            className="w-full h-full object-cover object-left opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#14120B]/40 to-[#14120B]" />
        </div>

        {/* Text and Leading Navigation Arrow Chevron */}
        <div className="relative z-10 flex items-center justify-between px-4 py-3.5 h-full">
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-sm font-bold text-[#F7F2E7] mb-0.5 tracking-tight group-hover:text-[#FFE6A0] transition-colors">
              <span>رحلتك مع أثر</span>
              <ChevronLeft size={15} className="text-[#FFE6A0] transition-transform group-hover:-translate-x-0.5" />
            </div>
            <p className="text-[11px] text-[#B5AD9B] font-medium">
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
