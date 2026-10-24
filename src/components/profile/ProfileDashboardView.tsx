import React, { useState, useEffect } from 'react';
import { UserProfileData, AuthService, ProfilePrivacySettings } from '../../services/authService';
import { ProfileStatsService, UserSpiritualStats } from '../../services/profileStatsService';
import { ProfileEditModal } from '../ProfileEditModal';
import { AchievementDetailModal, AchievementItem } from './AchievementDetailModal';

// Extracted pixel-perfect assets directly from reference design
import atharArchUnifiedSeamlessImg from '../../assets/images/athar_arch_unified_seamless.png';
import innerAvatarSilhouetteImg from '../../assets/images/inner_avatar_silhouette.png';
import exactLevelRosetteCleanImg from '../../assets/images/exact_level_rosette_clean.png';
import exactXpStarCleanImg from '../../assets/images/exact_xp_star_clean.png';
import exactStatFlameCircleImg from '../../assets/images/exact_stat_flame_circle.png';
import exactSprigCleanImg from '../../assets/images/exact_sprig_clean.png';
import exactChartCleanImg from '../../assets/images/exact_chart_clean.png';
import exactStatQuranCircleImg from '../../assets/images/exact_stat_quran_circle.png';
import exactStatSadaqahCircleImg from '../../assets/images/exact_stat_sadaqah_circle.png';
import exactStatPrayerCircleImg from '../../assets/images/exact_stat_prayer_circle.png';
import exactStatAdhkarCircleImg from '../../assets/images/exact_stat_adhkar_circle.png';
import exactJourneyMosqueArtImg from '../../assets/images/exact_journey_mosque_art.png';
import islamicGeometricPatternImg from '../../assets/images/islamic_geometric_pattern_1792549638180.jpg';

import {
  Camera,
  Calendar,
  ChevronLeft,
  User as UserIcon,
  LogOut,
  LogIn,
  Cloud,
  SlidersHorizontal,
  CheckCircle2,
  EyeOff,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { ROYAL_AVATAR_PRESETS } from '../ProfileEditModal';
import { GamaaAdminService, AdminRoleStatus } from '../../services/gamaaAdminService';
import { GamaaAdminConsoleModal } from '../gamaa/GamaaAdminConsoleModal';

interface ProfileDashboardViewProps {
  onOpenSettings: () => void;
  onNavigateToQuran?: () => void;
  onNavigateToPrayers?: () => void;
  onNavigateToAdhkar?: () => void;
  onOpenSadaqah?: () => void;
  onOpenJourneyOrAchievements?: () => void;
  onShareProfile?: (stats: UserSpiritualStats, profile: UserProfileData | null) => void;
  onOpenAuth?: () => void;
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
  onOpenAuth,
}) => {
  const [currentUser, setCurrentUser] = useState(() => AuthService.getCurrentUser());
  const [logoutToast, setLogoutToast] = useState<string | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [adminStatus, setAdminStatus] = useState<AdminRoleStatus | null>(null);
  const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState(false);

  // Load and bind user profile dynamically from cache and Firestore
  const [profile, setProfile] = useState<UserProfileData | null>(() => {
    const user = AuthService.getCurrentUser();
    if (user) {
      try {
        const cached = localStorage.getItem(`athar_cached_profile_${user.uid}`);
        if (cached) {
          const parsed: UserProfileData = JSON.parse(cached);
          if (parsed.photoURL && !isValidUserPhoto(parsed.photoURL) && !parsed.photoURL.startsWith('preset:')) {
            parsed.photoURL = '';
          }
          return parsed;
        }
      } catch {}

      return {
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'مستخدم أثر',
        email: user.email || `${user.uid}@athar.app`,
        username: user.email?.split('@')[0] || 'athar_user',
        photoURL: (isValidUserPhoto(user.photoURL) || user.photoURL?.startsWith('preset:')) ? (user.photoURL as string) : '',
        bio: '',
        createdAt: user.metadata?.creationTime || new Date().toISOString(),
      };
    }

    try {
      const cachedGuest = localStorage.getItem('athar_cached_profile_guest');
      if (cachedGuest) {
        return JSON.parse(cachedGuest);
      }
    } catch {}

    return {
      uid: 'guest_user',
      displayName: 'زائر كريم',
      email: '',
      username: 'guest',
      photoURL: '',
      bio: '',
      createdAt: '',
    };
  });

  const [stats, setStats] = useState<UserSpiritualStats>(() =>
    ProfileStatsService.getSpiritualStats(profile, currentUser?.uid)
  );

  const [privacy, setPrivacy] = useState<ProfilePrivacySettings>(() =>
    AuthService.getPrivacySettings(currentUser?.uid)
  );

  // Sync dynamically with Firestore user data & Auth state
  useEffect(() => {
    const reloadUserData = (user: any) => {
      setCurrentUser(user);
      setPrivacy(AuthService.getPrivacySettings(user?.uid));
      if (user) {
        AuthService.getUserProfile(user.uid).then((p) => {
          const resolvedProfile: UserProfileData = p || {
            uid: user.uid,
            displayName: user.displayName || user.email?.split('@')[0] || 'مستخدم أثر',
            email: user.email || '',
            username: user.email?.split('@')[0] || 'user',
            photoURL: (isValidUserPhoto(user.photoURL) || user.photoURL?.startsWith('preset:')) ? (user.photoURL as string) : '',
            bio: '',
            createdAt: user.metadata?.creationTime || new Date().toISOString(),
          };
          if (resolvedProfile.photoURL && !isValidUserPhoto(resolvedProfile.photoURL) && !resolvedProfile.photoURL.startsWith('preset:')) {
            resolvedProfile.photoURL = '';
          }
          setProfile(resolvedProfile);
          setStats(ProfileStatsService.getSpiritualStats(resolvedProfile, user.uid));
        });

        // Query admin status directly from Firestore
        GamaaAdminService.getAdminStatus(user.uid)
          .then((status) => {
            setAdminStatus(status);
          })
          .catch(() => {
            setAdminStatus(null);
          });
      } else {
        setAdminStatus(null);
        const guestProfile: UserProfileData = {
          uid: 'guest_user',
          displayName: 'زائر كريم',
          email: '',
          username: 'guest',
          photoURL: '',
          bio: '',
          createdAt: '',
        };
        setProfile(guestProfile);
        setStats(ProfileStatsService.getSpiritualStats(guestProfile, 'guest'));
      }
    };

    const unsubAuth = AuthService.subscribeToAuthState((user) => {
      reloadUserData(user);
    });

    const handleAuthSwitched = () => {
      const u = AuthService.getCurrentUser();
      reloadUserData(u);
    };

    const handleDataUpdated = () => {
      const u = AuthService.getCurrentUser();
      setStats(ProfileStatsService.getSpiritualStats(profile, u?.uid || 'guest'));
    };

    const handleAdminUpdated = () => {
      const u = AuthService.getCurrentUser();
      if (u) {
        GamaaAdminService.getAdminStatus(u.uid).then(setAdminStatus).catch(() => {});
      }
    };

    window.addEventListener('athar_auth_switched', handleAuthSwitched);
    window.addEventListener('athar_admin_status_updated', handleAdminUpdated);
    window.addEventListener('athar_xp_updated', handleDataUpdated);
    window.addEventListener('athar_badges_updated', handleDataUpdated);
    window.addEventListener('athar_prayers_updated', handleDataUpdated);
    window.addEventListener('athar_adhkar_updated', handleDataUpdated);
    window.addEventListener('athar_khatmah_updated', handleDataUpdated);
    window.addEventListener('athar_impact_updated', handleDataUpdated);

    return () => {
      unsubAuth();
      window.removeEventListener('athar_auth_switched', handleAuthSwitched);
      window.removeEventListener('athar_admin_status_updated', handleAdminUpdated);
      window.removeEventListener('athar_xp_updated', handleDataUpdated);
      window.removeEventListener('athar_badges_updated', handleDataUpdated);
      window.removeEventListener('athar_prayers_updated', handleDataUpdated);
      window.removeEventListener('athar_adhkar_updated', handleDataUpdated);
      window.removeEventListener('athar_khatmah_updated', handleDataUpdated);
      window.removeEventListener('athar_impact_updated', handleDataUpdated);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await AuthService.logout();
      setLogoutToast('تم تسجيل الخروج بنجاح من الحساب السحابي');
      setTimeout(() => setLogoutToast(null), 3200);
    } catch {
      setLogoutToast('تعذر تسجيل الخروج، يرجى المحاولة لاحقاً');
      setTimeout(() => setLogoutToast(null), 3200);
    }
  };

  const handleProfileUpdated = (updatedProfile: UserProfileData) => {
    if (updatedProfile.photoURL && !isValidUserPhoto(updatedProfile.photoURL) && !updatedProfile.photoURL.startsWith('preset:')) {
      updatedProfile.photoURL = '';
    }
    const currentUid = currentUser?.uid;
    const cacheKey = currentUid ? `athar_cached_profile_${currentUid}` : 'athar_cached_profile_guest';
    try {
      localStorage.setItem(cacheKey, JSON.stringify(updatedProfile));
    } catch {}
    setProfile(updatedProfile);
    if (updatedProfile.privacy) {
      setPrivacy(updatedProfile.privacy);
    } else {
      setPrivacy(AuthService.getPrivacySettings(currentUid));
    }
    setStats(ProfileStatsService.getSpiritualStats(updatedProfile, currentUid || 'guest'));
  };

  const hasValidPhoto = isValidUserPhoto(profile?.photoURL);
  const isPresetPhoto = profile?.photoURL?.startsWith('preset:');
  const activePresetObj = isPresetPhoto
    ? ROYAL_AVATAR_PRESETS.find((p) => p.id === profile?.photoURL?.replace('preset:', ''))
    : null;

  const isKnownAdminEmail = Boolean(
    currentUser?.email &&
    (currentUser.email.toLowerCase().trim() === 'mostafa2827738@gmail.com' ||
     currentUser.email.toLowerCase().trim() === 'ahmedathar20264@gmail.com')
  );

  const isAdminUser = Boolean(
    adminStatus?.isOwner ||
    adminStatus?.isModerator ||
    profile?.isAdmin === true ||
    profile?.role === 'admin' ||
    profile?.role === 'owner' ||
    profile?.role === 'moderator' ||
    isKnownAdminEmail
  );

  const isFullAdmin = Boolean(
    adminStatus?.isOwner ||
    profile?.role === 'admin' ||
    profile?.role === 'owner' ||
    profile?.isAdmin === true ||
    isKnownAdminEmail
  );

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

      {/* Top spacing allowing the luxury arch background to breathe gracefully */}
      <div className="relative z-10 pt-4" />

      {/* ============================================================
         4. HERO AVATAR & IDENTITY SECTION
         Preserved inner silhouette, complete unbroken golden frame,
         and soft subtle golden aura radiating gently from behind
         ============================================================ */}
      <section className="relative z-10 text-center pt-0 pb-1 mb-2">
        {/* Centered circular profile frame */}
        <div className="relative inline-block mx-auto mb-2">
          {/* Subtle soft golden aura radiating gently from directly behind the completed frame */}
          <div className="absolute -inset-2 rounded-full bg-[radial-gradient(circle,_rgba(217,174,72,0.30)_0%,_rgba(217,174,72,0.10)_55%,_transparent_72%)] blur-md pointer-events-none" />

          {/* Complete 360-degree unbroken metallic gold circular ring - Sleek & Refined */}
          <div
            onClick={() => setIsEditModalOpen(true)}
            className="relative w-[78px] h-[78px] rounded-full p-[2px] bg-gradient-to-tr from-[#9D7620] via-[#FFE6A0] to-[#D9AE48] shadow-[0_0_16px_rgba(217,174,72,0.28)] flex items-center justify-center cursor-pointer group select-none transition-transform active:scale-95"
            title="تعديل الصورة الشخصية"
          >
            {/* Inner image container */}
            <div className="w-full h-full rounded-full overflow-hidden bg-[#14120B] flex items-center justify-center">
              {hasValidPhoto ? (
                /* Genuine user photo */
                <img
                  src={profile?.photoURL || ''}
                  alt={profile?.displayName || 'المستخدم'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center aspect-square"
                />
              ) : activePresetObj ? (
                /* Selected Royal Islamic preset */
                <div
                  className={`w-full h-full bg-gradient-to-br ${activePresetObj.bg} flex items-center justify-center text-3xl select-none`}
                >
                  {activePresetObj.emoji}
                </div>
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
              className="absolute -bottom-0.5 -right-0.5 w-[22px] h-[22px] rounded-full bg-gradient-to-br from-[#FFE6A0] to-[#D9AE48] text-[#080807] flex items-center justify-center border-2 border-[#080807] shadow-md hover:brightness-110 active:scale-95 transition-all z-10"
              aria-label="تغيير الصورة الشخصية"
              title="تعديل الصورة"
            >
              <Camera size={11} strokeWidth={2.4} />
            </div>
          </div>
        </div>

        {/* Name: 18sp bold warm off-white (#F7F2E7) */}
        <h1 className="text-[18px] font-bold text-[#F7F2E7] tracking-tight mb-0.5">
          {profile?.displayName || (currentUser ? 'مستخدم أثر' : 'زائر كريم')}
        </h1>

        {/* Handle: 14sp gold (#D9AE48) */}
        <div
          onClick={() => setIsEditModalOpen(true)}
          className="text-[14px] font-semibold text-[#D9AE48] font-mono tracking-wide cursor-pointer hover:underline mb-1"
          dir="ltr"
        >
          @{profile?.username || (currentUser ? 'user' : 'guest')}
        </div>

        {/* Official Admin / Supervisor Verification Badge */}
        {isAdminUser && (
          <div className="flex items-center justify-center my-1.5 animate-fadeIn">
            <button
              type="button"
              onClick={() => setIsAdminConsoleOpen(true)}
              className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#1E170B] via-[#2E200C] to-[#1E170B] border border-[#D9AE48]/80 hover:border-[#FFE6A0] shadow-[0_0_16px_rgba(217,174,72,0.35)] hover:shadow-[0_0_24px_rgba(217,174,72,0.55)] transition-all cursor-pointer active:scale-95"
              title="فتح لوحة تحكم وإدارة التطبيق"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFE6A0] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D9AE48]"></span>
              </span>
              <ShieldCheck size={14} className="text-[#FFE6A0] group-hover:scale-110 transition-transform" />
              <span className="text-[12.5px] font-bold text-[#FFE6A0] tracking-wide">
                {isFullAdmin ? 'مسؤول التطبيق' : 'مشرف معتمد'}
              </span>
              <span className="text-[9.5px] font-mono font-bold bg-[#D9AE48]/30 text-[#FFE6A0] px-2 py-0.5 rounded-full border border-[#D9AE48]/50 shadow-inner">
                ADMIN
              </span>
            </button>
          </div>
        )}

        {/* Membership Info: Small calendar icon + "عضو منذ ..." */}
        {!privacy.hideJoinDate && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-[#B5AD9B] font-medium">
            <Calendar size={12} className="text-[#D9AE48]" />
            <span>{currentUser ? `عضو منذ ${stats.joinDateFormatted}` : 'وضع الزائر (محلي)'}</span>
          </div>
        )}
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
            {stats.completion?.percentage ?? 25}%
          </span>
        </div>

        {/* Progress Track & Gradient Fill */}
        <div className="w-full h-2 rounded-full bg-[#1A160F] overflow-hidden mb-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#D9AE48] via-[#E8C56E] to-[#FFE6A0] transition-all duration-700 shadow-[0_0_8px_rgba(217,174,72,0.35)]"
            style={{ width: `${stats.completion?.percentage ?? 25}%` }}
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
                {(stats.totalXP || 0).toLocaleString('en-US')}
              </span>
            </div>
            {/* Real 3D Gold XP Star - Exact from Reference */}
            <div className="w-[42px] h-[42px] shrink-0 flex items-center justify-center">
              <img
                src={exactXpStarCleanImg}
                alt="XP"
                className="w-full h-full object-contain filter drop-shadow-[0_2px_10px_rgba(217,174,72,0.35)]"
              />
            </div>
          </div>

          {/* Left Column in RTL: المستوي */}
          <div className="ps-2 pe-1 flex items-center justify-between">
            {/* Rosette Gold Medal on far left - Exact from Reference */}
            <div className="w-[52px] h-[52px] shrink-0 flex items-center justify-center">
              <img
                src={exactLevelRosetteCleanImg}
                alt={`المستوى ${stats.currentLevel || 1}`}
                className="w-full h-full object-contain filter drop-shadow-[0_2px_10px_rgba(217,174,72,0.35)]"
              />
            </div>
            <div className="text-center flex-1">
              <span className="text-[13px] font-medium text-[#B8AF9E] block mb-0.5">
                المستوي
              </span>
              <span className="text-[26px] font-bold text-[#FAF4E8] font-mono leading-none tracking-tight">
                {stats.currentLevel || 1}
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
          {/* Golden Sprig - Exact from Reference */}
          <div className="w-6 h-8 shrink-0 flex items-center justify-center">
            <img
              src={exactSprigCleanImg}
              alt="غصن أثر"
              className="w-full h-full object-contain filter drop-shadow-[0_1px_6px_rgba(217,174,72,0.25)]"
            />
          </div>
        </div>

        {/* Center Divider Line */}
        <div className="h-10 w-px bg-[#2a2318] shrink-0" />

        {/* Left in RTL: Streak metric & glowing flame in exact medallion with transparent corners */}
        <div className="flex items-center gap-2.5 flex-1 ps-3">
          {/* Flame Medallion - Full Size, Exact from Reference */}
          <div className="w-[48px] h-[48px] shrink-0 flex items-center justify-center">
            <img
              src={exactStatFlameCircleImg}
              alt="شعلة الاستمرار"
              className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(217,174,72,0.35)]"
            />
          </div>

          <div className="text-right">
            <span className="text-[11.5px] font-medium text-[#B8AF9E] block leading-tight">
              أيام الاستمرار
            </span>
            {privacy.hideStreak ? (
              <span className="text-[13px] font-bold text-[#D9AE48] block leading-none my-1.5 flex items-center gap-1">
                <Lock size={12} />
                <span>خاصة</span>
              </span>
            ) : (
              <span className="text-[22px] font-bold text-[#FAF4E8] font-mono block leading-none my-0.5">
                {stats.streakDays ?? 0}
              </span>
            )}
            <span className="text-[10px] text-[#8E8675] block leading-tight">
              {privacy.hideStreak ? 'مستمر في الطاعة' : 'يوماً متتالياً'}
            </span>
          </div>
        </div>
      </section>

      {/* SECTION HEADER: إحصائياتك */}
      <section className="relative z-10 mb-3 select-none">
        <div className="flex items-center gap-2 mb-2.5 px-1">
          {/* 3-bar chart icon on the right in RTL - Exact from Reference */}
          <div className="w-[18px] h-[18px] shrink-0 flex items-center justify-center">
            <img
              src={exactChartCleanImg}
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
                  {privacy.hideStats ? '—' : (stats.quranHoursThisMonth ?? 0)}
                </span>
              </div>
              {/* Exact High Definition 24K Gold Quran Medallion - Full Size from Reference */}
              <div className="w-[46px] h-[46px] shrink-0 flex items-center justify-center">
                <img
                  src={exactStatQuranCircleImg}
                  alt="القرآن"
                  className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(217,174,72,0.3)] group-hover:scale-105 transition-transform"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] font-medium text-[#8E8675] block">
                {privacy.hideStats ? 'محفوظة بخصوصية' : 'ساعات هذا الشهر'}
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
                  {privacy.hideStats ? '—' : (stats.sadaqahCountThisMonth ?? 0)}
                </span>
              </div>
              {/* Exact High Definition 24K Gold Sadaqah Medallion - Full Size from Reference */}
              <div className="w-[46px] h-[46px] shrink-0 flex items-center justify-center">
                <img
                  src={exactStatSadaqahCircleImg}
                  alt="الصدقات"
                  className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(217,174,72,0.3)] group-hover:scale-105 transition-transform"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] font-medium text-[#8E8675] block">
                {privacy.hideStats ? 'محفوظة بخصوصية' : 'نشاطات هذا الشهر'}
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
                  {privacy.hideStats ? '—' : (stats.adhkarCountThisMonth ?? 0)}
                </span>
              </div>
              {/* Exact High Definition 24K Gold Adhkar Medallion - Full Size from Reference */}
              <div className="w-[46px] h-[46px] shrink-0 flex items-center justify-center">
                <img
                  src={exactStatAdhkarCircleImg}
                  alt="الأذكار"
                  className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(217,174,72,0.3)] group-hover:scale-105 transition-transform"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] font-medium text-[#8E8675] block">
                {privacy.hideStats ? 'محفوظة بخصوصية' : 'مرة هذا الشهر'}
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
                  {privacy.hideStats ? '—' : (stats.prayersCountThisMonth ?? 0)}
                </span>
              </div>
              {/* Exact High Definition 24K Gold Prayer Medallion - Full Size from Reference */}
              <div className="w-[46px] h-[46px] shrink-0 flex items-center justify-center">
                <img
                  src={exactStatPrayerCircleImg}
                  alt="الصلاة"
                  className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(217,174,72,0.3)] group-hover:scale-105 transition-transform"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] font-medium text-[#8E8675] block">
                {privacy.hideStats ? 'محفوظة بخصوصية' : 'صلاة هذا الشهر'}
              </span>
              <span className="text-[15px] text-[#8E8675] font-bold group-hover:text-[#D9AE48] transition-colors">
                ›
              </span>
            </div>
          </div>
        </div>

        {/* Honest Empty State Guidance when all monthly metrics are zero */}
        {stats.quranHoursThisMonth === 0 &&
          stats.sadaqahCountThisMonth === 0 &&
          stats.adhkarCountThisMonth === 0 &&
          stats.prayersCountThisMonth === 0 && (
            <div className="mt-2.5 p-3 rounded-2xl border border-[#D9AE48]/15 bg-[#14120B]/70 text-center">
              <p className="text-[11.5px] text-[#C2B8A3] leading-relaxed">
                لم تسجل أي نشاطات بعد لهذا الشهر. ابدأ الآن بتسجيل صلواتك أو تلاوة وردك ليظهر أثرك المبارك هنا.
              </p>
            </div>
          )}
      </section>

      {/* ============================================================
         5. JOURNEY, ACCOUNT & SETTINGS SECTIONS
         Properly spaced, unified card hierarchy with luxurious gold trims
         ============================================================ */}
      <div className="relative z-10 space-y-3.5 mt-4">
        {/* CARD 5: JOURNEY BANNER (رحلتك مع أثر) */}
        <section
          onClick={onOpenJourneyOrAchievements}
          className="overflow-hidden rounded-2xl border border-[#D9AE48]/25 bg-[#14120B] min-h-[82px] shadow-[0_6px_20px_rgba(0,0,0,0.6)] cursor-pointer hover:border-[#D9AE48]/45 active:scale-[0.99] transition-all select-none group relative"
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

        {/* CARD: DEDICATED ADMIN MANAGEMENT SHORTCUT */}
        {isAdminUser && (
          <section
            onClick={() => setIsAdminConsoleOpen(true)}
            className="relative overflow-hidden rounded-2xl border border-[#D9AE48]/80 bg-gradient-to-r from-[#1C160B] via-[#2A1E0A] to-[#1C160B] p-4 shadow-[0_6px_24px_rgba(217,174,72,0.25)] cursor-pointer hover:border-[#FFE6A0] active:scale-[0.99] transition-all select-none group"
          >
            {/* Subtle luxury glow effect in corner */}
            <div className="absolute -top-6 -right-6 w-28 h-28 bg-[#D9AE48]/15 rounded-full blur-2xl pointer-events-none" />
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#D9AE48]/30 to-[#9D7620]/20 border border-[#D9AE48]/60 flex items-center justify-center text-[#FFE6A0] group-hover:scale-105 transition-transform shadow-[0_0_14px_rgba(217,174,72,0.25)] shrink-0">
                  <ShieldCheck size={22} className="text-[#FFE6A0]" />
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#FFE6A0] group-hover:text-white transition-colors">
                      لوحة تحكم وإدارة أثر
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D9AE48]/30 border border-[#FFE6A0]/50 text-[#FFE6A0]">
                      {isFullAdmin ? 'مسؤول النظام' : 'مشرف معتمد'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#D8CFBC] mt-0.5">
                    إدارة الحملات المجتمعية، بلاغات المحتوى، والتعميمات العامة
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-[#2E200C] border border-[#D9AE48]/40 flex items-center justify-center text-[#FFE6A0] group-hover:border-[#FFE6A0] group-hover:text-white transition-colors shrink-0">
                <ChevronLeft size={18} />
              </div>
            </div>
          </section>
        )}

        {/* CARD 6: CLOUD ACCOUNT & SESSION CARD */}
        <section className="rounded-2xl overflow-hidden border border-[#D9AE48]/25 bg-gradient-to-r from-[#14110A] via-[#1B160C] to-[#14110A] p-4 shadow-[0_6px_20px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#D9AE48]/25 to-[#B8860B]/10 border border-[#D9AE48]/40 flex items-center justify-center text-[#D9AE48] shrink-0 shadow-inner overflow-hidden">
                {hasValidPhoto ? (
                  <img
                    src={profile?.photoURL || ''}
                    alt={profile?.displayName || 'المستخدم'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : activePresetObj ? (
                  <div className={`w-full h-full bg-gradient-to-br ${activePresetObj.bg} flex items-center justify-center text-xl`}>
                    {activePresetObj.emoji}
                  </div>
                ) : (
                  <img
                    src={innerAvatarSilhouetteImg}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#FAF4E8] truncate">
                    {currentUser ? (currentUser.displayName || profile?.displayName || 'مستخدم أثر الكريم') : 'وضع الزائر (استخدام محلي)'}
                  </span>
                  {currentUser && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                      <Cloud className="w-3 h-3" />
                      <span>سحابي</span>
                    </span>
                  )}
                  {isAdminUser && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D9AE48]/25 border border-[#FFE6A0]/50 text-[#FFE6A0]">
                      <ShieldCheck className="w-3 h-3" />
                      <span>{isFullAdmin ? 'مسؤول' : 'مشرف'}</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#D9AE48]/75 truncate mt-0.5">
                  {currentUser ? (currentUser.email || profile?.email) : 'سجّل دخولك لمزامنة الختمات والإنجازات سحابياً'}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              {currentUser ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="py-2 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/35 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>تسجيل الخروج</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenAuth) {
                      onOpenAuth();
                    } else {
                      window.dispatchEvent(new CustomEvent('athar_open_auth'));
                    }
                  }}
                  className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-[#D9AE48] to-[#B8860B] text-[#060503] text-xs font-bold flex items-center gap-1.5 transition hover:brightness-110 shadow-md shadow-[#D9AE48]/20 active:scale-95 cursor-pointer"
                  title="تسجيل الدخول"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>تسجيل الدخول</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* CARD 7: QUICK SETTINGS & NOTIFICATIONS SHORTCUT (Main Settings Access) */}
        <section
          onClick={onOpenSettings}
          className="overflow-hidden rounded-2xl border border-[#D9AE48]/25 bg-[#12100B] p-3.5 shadow-[0_4px_16px_rgba(0,0,0,0.5)] cursor-pointer hover:border-[#D9AE48]/50 active:scale-[0.99] transition-all select-none group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1C170E] border border-[#D9AE48]/35 flex items-center justify-center text-[#FFE6A0] group-hover:scale-105 transition-transform shadow-inner">
              <SlidersHorizontal size={18} />
            </div>
            <div className="text-right">
              <h3 className="text-xs font-bold text-[#F7F2E7] group-hover:text-[#FFE6A0] transition-colors">
                الإعدادات والتنبيهات
              </h3>
              <p className="text-[11px] text-[#A69E8D] mt-0.5">
                مواقيت الصلاة، الأذان الملكي، أصوات التنبيه، والقراء
              </p>
            </div>
          </div>
          <div className="w-7 h-7 rounded-lg bg-[#18140E] border border-[#D9AE48]/25 flex items-center justify-center text-[#D9AE48] group-hover:text-[#FFE6A0] transition-colors">
            <ChevronLeft size={16} />
          </div>
        </section>
      </div>

      {/* Floating Logout Feedback Toast */}
      {logoutToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#211B0E] via-[#2F2613] to-[#211B0E] border border-[#E6C66E]/70 text-[#F5EFE0] text-xs font-bold flex items-center gap-2 shadow-[0_12px_30px_rgba(0,0,0,0.9)] animate-slideUp">
          <CheckCircle2 size={16} className="text-[#E6C66E] shrink-0" />
          <span>{logoutToast}</span>
        </div>
      )}

      {/* Edit Profile Modal */}
      <ProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentProfile={profile}
        onProfileUpdated={handleProfileUpdated}
        onLogoutRequested={handleLogout}
      />

      {/* Achievement Detail Modal when tapped */}
      <AchievementDetailModal
        isOpen={Boolean(selectedAchievement)}
        onClose={() => setSelectedAchievement(null)}
        achievement={selectedAchievement}
      />

      {/* Gamaa Admin Console Modal */}
      {currentUser && (
        <GamaaAdminConsoleModal
          isOpen={isAdminConsoleOpen}
          onClose={() => setIsAdminConsoleOpen(false)}
          currentUserUid={currentUser.uid}
        />
      )}
    </div>
  );
};
