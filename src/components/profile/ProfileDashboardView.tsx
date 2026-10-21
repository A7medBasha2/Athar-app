import React, { useState, useEffect } from 'react';
import { UserProfileData, AuthService } from '../../services/authService';
import { ProfileStatsService, UserSpiritualStats } from '../../services/profileStatsService';
import { ProfileEditModal } from '../ProfileEditModal';
import { AchievementDetailModal, AchievementItem } from './AchievementDetailModal';

// Extracted pixel-perfect assets directly from reference design
import atharArchUnifiedSeamlessImg from '../../assets/images/athar_arch_unified_seamless.png';
import innerAvatarSilhouetteImg from '../../assets/images/inner_avatar_silhouette.png';
import cropLevelRosetteImg from '../../assets/images/crop_level_rosette.png';
import cropXpStarImg from '../../assets/images/crop_xp_star.png';
import hdStatFlameCircleImg from '../../assets/images/hd_stat_flame_circle.png';
import cropSprigImg from '../../assets/images/crop_sprig.png';
import cropChartIconImg from '../../assets/images/crop_chart_icon.png';
import hdStatQuranImg from '../../assets/images/hd_stat_quran.png';
import hdStatSadaqahImg from '../../assets/images/hd_stat_sadaqah.png';
import hdStatPrayerImg from '../../assets/images/hd_stat_prayer.png';
import hdStatAdhkarImg from '../../assets/images/hd_stat_adhkar.png';
import exactJourneyMosqueArtImg from '../../assets/images/exact_journey_mosque_art.png';
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
         2. TOP ISLAMIC ARCHED HEADER BACKGROUND CONTAINER (.arch-bg)
         Seamless multi-directional dissolve into #080807,
         unifying the left and right flanks completely with the main background
         ============================================================ */}
      <div className="arch-bg absolute -top-[7px] inset-x-0 h-[390px] pointer-events-none overflow-hidden z-0">
        <img
          src={atharArchUnifiedSeamlessImg}
          alt=""
          className="w-full h-full object-cover object-top"
        />
        {/* Seamless lateral dissolves on left and right to unify completely with #080807 */}
        <div className="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-[#080807] via-[#080807]/70 to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-[#080807] via-[#080807]/70 to-transparent pointer-events-none" />
        {/* Soft top gradient to dissolve upper header into #080807 */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#080807] via-[#080807]/50 to-transparent pointer-events-none" />
        {/* Soft bottom gradient dissolve to blend seamlessly into #080807 */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent via-[#080807]/80 to-[#080807] pointer-events-none" />
      </div>

      {/* ============================================================
         3. TOP NAVIGATION HEADER
         Athar logo & wordmark removed as requested
         Left (RTL): Settings Gear Icon
         ============================================================ */}
      <header className="relative z-10 flex items-center justify-between pt-1 pb-1 px-1">
        {/* Right side is intentionally empty (logo and text removed per user request) */}
        <div className="w-8 h-8" />

        {/* Left in RTL: Pure Line Art Settings Gear */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 text-[#D9AE48] hover:text-[#FFE6A0] active:scale-95 transition-all cursor-pointer rounded-full hover:bg-[#D9AE48]/10"
          aria-label="الإعدادات"
          title="الإعدادات"
        >
          <Settings size={22} strokeWidth={1.8} />
        </button>
      </header>

      {/* ============================================================
         4. HERO AVATAR & IDENTITY SECTION
         Preserved inner silhouette, complete unbroken golden frame,
         and soft subtle golden aura radiating gently from behind
         ============================================================ */}
      <section className="relative z-10 text-center pt-0 pb-1 mb-2">
        {/* Centered circular profile frame */}
        <div className="relative inline-block mx-auto mb-2">
          {/* Subtle soft golden aura radiating gently from directly behind the completed frame */}
          <div className="absolute -inset-2.5 rounded-full bg-[radial-gradient(circle,_rgba(217,174,72,0.32)_0%,_rgba(217,174,72,0.12)_55%,_transparent_72%)] blur-md pointer-events-none" />

          {/* Complete 360-degree unbroken metallic gold circular ring */}
          <div
            onClick={() => setIsEditModalOpen(true)}
            className="relative w-[110px] h-[110px] rounded-full p-[2.5px] bg-gradient-to-tr from-[#9D7620] via-[#FFE6A0] to-[#D9AE48] shadow-[0_0_20px_rgba(217,174,72,0.3)] flex items-center justify-center cursor-pointer group select-none transition-transform active:scale-95"
            title="تعديل الصورة الشخصية"
          >
            {/* Inner image container */}
            <div className="w-full h-full rounded-full overflow-hidden bg-[#14120B] flex items-center justify-center">
              {hasValidPhoto ? (
                /* Genuine user photo */
                <img
                  src={profile?.photoURL || ''}
                  alt={profile?.displayName || 'المستخدم'}
                  className="w-full h-full object-cover object-center aspect-square"
                />
              ) : (
                /* Preserved original inner silhouette with authentic soft lighting */
                <img
                  src={innerAvatarSilhouetteImg}
                  alt={profile?.displayName || 'المستخدم'}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform"
                />
              )}
            </div>

            {/* Floating circular camera action button at bottom-right */}
            <div
              className="absolute bottom-0.5 right-0.5 w-6 h-6 rounded-full bg-gradient-to-br from-[#FFE6A0] to-[#D9AE48] text-[#080807] flex items-center justify-center border-2 border-[#080807] shadow-md hover:brightness-110 active:scale-95 transition-all z-10"
              aria-label="تغيير الصورة الشخصية"
              title="تعديل الصورة"
            >
              <Camera size={12} strokeWidth={2.4} />
            </div>
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

      {/* CARD 2: LEVEL & XP SUMMARY (المستوي & نقاط الخبرة) */}
      <section
        onClick={() => {
          if (onOpenJourneyOrAchievements) onOpenJourneyOrAchievements();
        }}
        className="relative z-10 rounded-[22px] border border-[#D9AE48]/24 bg-[#0c0a07] p-3.5 mb-3 shadow-[0_4px_20px_rgba(0,0,0,0.6)] cursor-pointer hover:border-[#D9AE48]/45 transition-all select-none"
      >
        <div className="grid grid-cols-2 divide-x divide-x-reverse divide-[#2a2318] items-center">
          {/* Right Column in RTL: نقاط الخبرة */}
          <div className="pe-2 ps-1 flex items-center justify-between">
            <div className="text-center flex-1">
              <span className="text-[13px] font-medium text-[#B8AF9E] block mb-0.5">
                نقاط الخبرة
              </span>
              <span className="text-[26px] font-bold text-[#FAF4E8] font-mono leading-none tracking-tight">
                {stats.totalXP.toLocaleString('en-US')}
              </span>
            </div>
            {/* Real 3D Gold XP Star */}
            <div className="w-[42px] h-[42px] shrink-0 flex items-center justify-center">
              <img
                src={cropXpStarImg}
                alt="XP"
                className="w-full h-full object-contain filter drop-shadow-[0_2px_10px_rgba(217,174,72,0.35)]"
              />
            </div>
          </div>

          {/* Left Column in RTL: المستوي */}
          <div className="ps-2 pe-1 flex items-center justify-between">
            {/* Rosette Gold Medal on far left */}
            <div className="w-[52px] h-[52px] shrink-0 flex items-center justify-center">
              <img
                src={cropLevelRosetteImg}
                alt={`المستوى ${stats.currentLevel}`}
                className="w-full h-full object-contain filter drop-shadow-[0_2px_10px_rgba(217,174,72,0.35)]"
              />
            </div>
            <div className="text-center flex-1">
              <span className="text-[13px] font-medium text-[#B8AF9E] block mb-0.5">
                المستوي
              </span>
              <span className="text-[26px] font-bold text-[#FAF4E8] font-mono leading-none tracking-tight">
                {stats.currentLevel}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* CARD 3: STREAK & CONSISTENCY (أيام الاستمرار & الاستمرارية تصنع الفرق) */}
      <section className="relative z-10 rounded-[22px] border border-[#D9AE48]/24 bg-[#0c0a07] p-3.5 mb-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.6)] flex items-center justify-between select-none">
        {/* Right in RTL: Motivational subtext & vector sprig */}
        <div className="flex items-center justify-between flex-1 pe-3">
          <div className="text-right">
            <span className="text-[13.5px] font-bold text-[#FAF4E8] block leading-snug">
              الاستمرارية تصنع
            </span>
            <span className="text-[13.5px] font-bold text-[#D9AE48] block leading-snug">
              الفرق ..
            </span>
          </div>
          {/* Golden Sprig */}
          <div className="w-6 h-8 shrink-0 flex items-center justify-center">
            <img
              src={cropSprigImg}
              alt="غصن أثر"
              className="w-full h-full object-contain filter drop-shadow-[0_1px_6px_rgba(217,174,72,0.25)]"
            />
          </div>
        </div>

        {/* Center Divider Line */}
        <div className="h-10 w-px bg-[#2a2318] shrink-0" />

        {/* Left in RTL: Streak metric & glowing flame icon */}
        <div className="flex items-center gap-2.5 flex-1 ps-3">
          {/* Flame Circle Badge */}
          <div className="w-[44px] h-[44px] shrink-0">
            <img
              src={hdStatFlameCircleImg}
              alt="شعلة الاستمرار"
              className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(217,174,72,0.35)]"
            />
          </div>

          <div className="text-right">
            <span className="text-[11.5px] font-medium text-[#B8AF9E] block leading-tight">
              أيام الاستمرار
            </span>
            <span className="text-[22px] font-bold text-[#FAF4E8] font-mono block leading-none my-0.5">
              {stats.streakDays}
            </span>
            <span className="text-[10px] text-[#8E8675] block leading-tight">
              يوماً متتالياً
            </span>
          </div>
        </div>
      </section>

      {/* SECTION HEADER: إحصائياتك */}
      <section className="relative z-10 mb-3 select-none">
        <div className="flex items-center gap-2 mb-2.5 px-1">
          {/* 3-bar chart icon on the right in RTL */}
          <div className="w-[18px] h-[18px] shrink-0">
            <img
              src={cropChartIconImg}
              alt="إحصائياتك"
              className="w-full h-full object-contain filter drop-shadow-[0_1px_4px_rgba(217,174,72,0.3)]"
            />
          </div>
          <h2 className="text-[17px] font-bold text-[#FAF4E8] tracking-tight">إحصائياتك</h2>
        </div>

        {/* 2x2 Uniform Cards Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Card 1: القرآن (Top Right in RTL) */}
          <div
            onClick={onNavigateToQuran}
            className="rounded-[20px] border border-[#D9AE48]/24 bg-[#0c0a07] p-3.5 shadow-[0_4px_18px_rgba(0,0,0,0.6)] hover:border-[#D9AE48]/45 transition-all cursor-pointer flex flex-col justify-between min-h-[114px] active:scale-[0.98] group"
          >
            <div className="flex items-start justify-between">
              <div className="text-right flex-1">
                <span className="text-[14.5px] font-bold text-[#FAF4E8] block mb-1">
                  القرآن
                </span>
                <span className="text-[26px] font-bold text-[#FAF4E8] font-mono block leading-none tracking-tight group-hover:text-[#FFE6A0] transition-colors">
                  {stats.quranHoursThisMonth}
                </span>
              </div>
              {/* High Definition 24K Gold Quran Medallion */}
              <div className="w-[46px] h-[46px] shrink-0">
                <img
                  src={hdStatQuranImg}
                  alt="القرآن"
                  className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(217,174,72,0.3)] group-hover:scale-105 transition-transform"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] font-medium text-[#8E8675] block">
                ساعات هذا الشهر
              </span>
              <span className="text-[15px] text-[#8E8675] font-bold group-hover:text-[#D9AE48] transition-colors">
                ›
              </span>
            </div>
          </div>

          {/* Card 2: الصدقات (Top Left in RTL) */}
          <div
            onClick={onOpenSadaqah}
            className="rounded-[20px] border border-[#D9AE48]/24 bg-[#0c0a07] p-3.5 shadow-[0_4px_18px_rgba(0,0,0,0.6)] hover:border-[#D9AE48]/45 transition-all cursor-pointer flex flex-col justify-between min-h-[114px] active:scale-[0.98] group"
          >
            <div className="flex items-start justify-between">
              <div className="text-right flex-1">
                <span className="text-[14.5px] font-bold text-[#FAF4E8] block mb-1">
                  الصدقات
                </span>
                <span className="text-[26px] font-bold text-[#FAF4E8] font-mono block leading-none tracking-tight group-hover:text-[#FFE6A0] transition-colors">
                  {stats.sadaqahCountThisMonth}
                </span>
              </div>
              {/* High Definition 24K Gold Sadaqah Heart Medallion */}
              <div className="w-[46px] h-[46px] shrink-0">
                <img
                  src={hdStatSadaqahImg}
                  alt="الصدقات"
                  className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(217,174,72,0.3)] group-hover:scale-105 transition-transform"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] font-medium text-[#8E8675] block">
                نشاطات هذا الشهر
              </span>
              <span className="text-[15px] text-[#8E8675] font-bold group-hover:text-[#D9AE48] transition-colors">
                ›
              </span>
            </div>
          </div>

          {/* Card 3: الأذكار (Bottom Right in RTL) */}
          <div
            onClick={onNavigateToAdhkar}
            className="rounded-[20px] border border-[#D9AE48]/24 bg-[#0c0a07] p-3.5 shadow-[0_4px_18px_rgba(0,0,0,0.6)] hover:border-[#D9AE48]/45 transition-all cursor-pointer flex flex-col justify-between min-h-[114px] active:scale-[0.98] group"
          >
            <div className="flex items-start justify-between">
              <div className="text-right flex-1">
                <span className="text-[14.5px] font-bold text-[#FAF4E8] block mb-1">
                  الأذكار
                </span>
                <span className="text-[26px] font-bold text-[#FAF4E8] font-mono block leading-none tracking-tight group-hover:text-[#FFE6A0] transition-colors">
                  {stats.adhkarCountThisMonth}
                </span>
              </div>
              {/* High Definition 24K Gold Adhkar Tasbih Medallion */}
              <div className="w-[46px] h-[46px] shrink-0">
                <img
                  src={hdStatAdhkarImg}
                  alt="الأذكار"
                  className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(217,174,72,0.3)] group-hover:scale-105 transition-transform"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] font-medium text-[#8E8675] block">
                مرة هذا الشهر
              </span>
              <span className="text-[15px] text-[#8E8675] font-bold group-hover:text-[#D9AE48] transition-colors">
                ›
              </span>
            </div>
          </div>

          {/* Card 4: الصلاة (Bottom Left in RTL) */}
          <div
            onClick={onNavigateToPrayers}
            className="rounded-[20px] border border-[#D9AE48]/24 bg-[#0c0a07] p-3.5 shadow-[0_4px_18px_rgba(0,0,0,0.6)] hover:border-[#D9AE48]/45 transition-all cursor-pointer flex flex-col justify-between min-h-[114px] active:scale-[0.98] group"
          >
            <div className="flex items-start justify-between">
              <div className="text-right flex-1">
                <span className="text-[14.5px] font-bold text-[#FAF4E8] block mb-1">
                  الصلاة
                </span>
                <span className="text-[26px] font-bold text-[#FAF4E8] font-mono block leading-none tracking-tight group-hover:text-[#FFE6A0] transition-colors">
                  {stats.prayersCountThisMonth}
                </span>
              </div>
              {/* High Definition 24K Gold Prayer Mosque Medallion */}
              <div className="w-[46px] h-[46px] shrink-0">
                <img
                  src={hdStatPrayerImg}
                  alt="الصلاة"
                  className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(217,174,72,0.3)] group-hover:scale-105 transition-transform"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] font-medium text-[#8E8675] block">
                صلاة هذا الشهر
              </span>
              <span className="text-[15px] text-[#8E8675] font-bold group-hover:text-[#D9AE48] transition-colors">
                ›
              </span>
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
