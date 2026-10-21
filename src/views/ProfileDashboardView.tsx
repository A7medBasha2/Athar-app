import React, { useState, useEffect } from 'react';
import { UserProfileData, AuthService } from '../services/authService';
import { ProfileStatsService, UserSpiritualStats } from '../services/profileStatsService';
import { ProfileEditModal, ROYAL_AVATAR_PRESETS } from '../components/ProfileEditModal';
import { AtharBrandLogo } from '../components/AtharBrandLogo';
import {
  Settings,
  Camera,
  Calendar,
  Flame,
  BarChart3,
  BookOpen,
  Heart,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Trophy,
  CheckCircle2,
  Share2,
  Edit3,
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
  onShareProfile,
}) => {
  const [profile, setProfile] = useState<UserProfileData | null>(() => {
    try {
      const cached = localStorage.getItem('athar_cached_profile');
      if (cached) return JSON.parse(cached);
    } catch {}
    const user = AuthService.getCurrentUser();
    if (user) {
      return {
        uid: user.uid,
        displayName: user.displayName || 'أحمد محمد',
        email: user.email || 'ahmed@athar.app',
        username: user.email?.split('@')[0] || 'ahmed',
        photoURL: user.photoURL || 'preset:avatar_crescent',
        bio: 'اللهم اجعل أثري طيباً وعملي خالصاً لوجهك الكريم',
        createdAt: user.metadata.creationTime || new Date().toISOString(),
      };
    }
    return {
      uid: 'guest_user',
      displayName: 'أحمد محمد',
      email: 'ahmed@athar.app',
      username: 'ahmed',
      photoURL: 'preset:avatar_crescent',
      bio: 'اللهم اجعل أثري طيباً وعملي خالصاً لوجهك الكريم',
      createdAt: '2025-03-12T00:00:00.000Z',
    };
  });

  const [stats, setStats] = useState<UserSpiritualStats>(() =>
    ProfileStatsService.getSpiritualStats(profile)
  );

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showCompletionDetails, setShowCompletionDetails] = useState(false);

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

  // Find active preset if photo is a preset
  const activePreset = profile?.photoURL?.startsWith('preset:')
    ? ROYAL_AVATAR_PRESETS.find((p) => p.id === profile.photoURL?.replace('preset:', ''))
    : null;

  return (
    <div
      className="min-h-full w-full bg-[#080807] text-[#F7F2E7] pb-28 pt-2 px-4 max-w-lg mx-auto font-sans select-none"
      dir="rtl"
    >
      {/* 1. Header: Athar Logo + Title + Settings Gear */}
      <header className="flex items-center justify-between py-3 mb-2 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#916E25] via-[#FFE6A0] to-[#D9AE48] p-0.5 shadow-[0_0_15px_rgba(217,174,72,0.3)]">
            <div className="w-full h-full rounded-full bg-[#14120B] flex items-center justify-center">
              <AtharBrandLogo size="xs" />
            </div>
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-[#FFE6A0] via-[#D9AE48] to-[#F7F2E7] bg-clip-text text-transparent">
            أثر
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onShareProfile && (
            <button
              onClick={() => onShareProfile(stats, profile)}
              className="p-2.5 rounded-full bg-[#14120B] border border-[#2A2210] text-[#B5AD9B] hover:text-[#FFE6A0] hover:border-[#D9AE48]/40 transition-colors cursor-pointer"
              aria-label="مشاركة بطاقة الأثر"
              title="مشاركة إنجازاتك"
            >
              <Share2 size={18} />
            </button>
          )}
          <button
            onClick={onOpenSettings}
            className="p-2.5 rounded-full bg-[#14120B] border border-[#2A2210] text-[#B5AD9B] hover:text-[#FFE6A0] hover:border-[#D9AE48]/40 transition-colors cursor-pointer"
            aria-label="الإعدادات"
            title="الإعدادات"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* 2. Profile Identity Card with Royal Islamic Mihrab Silhouette */}
      <section className="relative overflow-hidden rounded-3xl border border-[#D9AE48]/25 bg-gradient-to-b from-[#18140B] via-[#120F08] to-[#0A0906] p-6 mb-4 shadow-[0_12px_36px_rgba(0,0,0,0.65)] text-center">
        {/* Subtle Decorative Islamic Arch Silhouette in background */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#FFE6A0]/30 via-transparent to-transparent" />
        <svg
          className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-44 pointer-events-none opacity-15 text-[#D9AE48]"
          viewBox="0 0 200 120"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M 20 120 C 20 50, 60 10, 100 10 C 140 10, 180 50, 180 120" />
          <path d="M 35 120 C 35 65, 68 25, 100 25 C 132 25, 165 65, 165 120" strokeDasharray="3 3" />
        </svg>

        {/* Circular Profile Avatar with Camera Button */}
        <div className="relative inline-block mx-auto mb-3">
          <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-[#916E25] via-[#FFE6A0] to-[#D9AE48] shadow-[0_0_25px_rgba(217,174,72,0.35)]">
            <div className="w-full h-full rounded-full overflow-hidden bg-[#14120B] flex items-center justify-center">
              {profile?.photoURL && !profile.photoURL.startsWith('preset:') ? (
                <img
                  src={profile.photoURL}
                  alt={profile.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className={`w-full h-full bg-gradient-to-br ${
                    activePreset?.bg || 'from-[#2A200B] to-[#14120B]'
                  } flex items-center justify-center text-4xl select-none`}
                >
                  {activePreset?.emoji || '🌙'}
                </div>
              )}
            </div>
          </div>
          {/* Camera Button Overlaid on Avatar */}
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="absolute bottom-0 left-0 w-8 h-8 rounded-full bg-gradient-to-tr from-[#D9AE48] to-[#FFE6A0] text-[#080807] flex items-center justify-center shadow-lg border-2 border-[#080807] active:scale-90 transition-transform cursor-pointer"
            aria-label="تغيير الصورة الشخصية"
            title="تعديل الصورة"
          >
            <Camera size={14} />
          </button>
        </div>

        {/* Display Name */}
        <h1 className="text-xl font-bold text-[#F7F2E7] tracking-wide mb-0.5">
          {profile?.displayName || 'أحمد محمد'}
        </h1>

        {/* Username Handle */}
        <div
          onClick={() => setIsEditModalOpen(true)}
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#D9AE48] hover:text-[#FFE6A0] transition-colors cursor-pointer mb-2 font-mono"
          dir="ltr"
        >
          <span>@{profile?.username || 'ahmed'}</span>
        </div>

        {/* Membership Date */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-[#B5AD9B] font-medium">
          <Calendar size={13} className="text-[#D9AE48]" />
          <span>عضو منذ {stats.joinDateFormatted}</span>
        </div>

        {/* Quick Edit Action Icon */}
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D9AE48]/10 border border-[#D9AE48]/25 text-[11px] text-[#FFE6A0] hover:bg-[#D9AE48]/20 transition-all cursor-pointer"
        >
          <Edit3 size={11} />
          <span>تعديل الملف</span>
        </button>
      </section>

      {/* 3. Profile Completion Card */}
      <section
        onClick={() => setShowCompletionDetails(!showCompletionDetails)}
        className="rounded-2xl border border-[#2A2210] bg-[#14120B] p-4 mb-4 shadow-[0_4px_16px_rgba(0,0,0,0.4)] cursor-pointer hover:border-[#D9AE48]/35 transition-all"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-[#F7F2E7]">اكتمال الملف الشخصي</h2>
          <span className="text-sm font-bold text-[#FFE6A0]">{stats.completion.percentage}%</span>
        </div>

        {/* Golden Gradient Progress Bar */}
        <div className="w-full h-2 rounded-full bg-[#201B11] overflow-hidden mb-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#FFE6A0] via-[#D9AE48] to-[#916E25] shadow-[0_0_10px_rgba(217,174,72,0.4)] transition-all duration-700 ease-out"
            style={{ width: `${stats.completion.percentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#B5AD9B]">
          <span>أكمل ملفك الشخصي لتجربة أفضل</span>
          <span className="text-[#D9AE48] hover:underline flex items-center gap-0.5">
            {stats.completion.percentage === 100 ? 'مكتمل بالكامل ✨' : 'عرض التفاصيل ›'}
          </span>
        </div>

        {/* Missing fields breakdown when tapped */}
        {showCompletionDetails && stats.completion.missingFields.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[#2A2210] space-y-2 animate-fadeIn">
            <span className="text-[11px] text-[#FFE6A0] font-semibold block">الحقول المتبقية:</span>
            {stats.completion.missingFields.map((field) => (
              <div
                key={field.key}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditModalOpen(true);
                }}
                className="flex items-center justify-between p-2 rounded-xl bg-[#0D0B08] border border-[#2A2210] text-[11px] hover:border-[#D9AE48]/40"
              >
                <span className="text-[#F7F2E7]">{field.action}</span>
                <span className="text-[#D9AE48] text-[10px] font-bold">إضافة +</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Level & XP Summary Card (Split Columns with Golden Medallions) */}
      <section className="rounded-2xl border border-[#2A2210] bg-[#14120B] p-4 mb-4 shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
        <div className="grid grid-cols-2 divide-x divide-x-reverse divide-[#2A2210]">
          {/* Right Column: Experience Points (XP) */}
          <div className="px-3 text-right">
            <span className="text-xs font-medium text-[#B5AD9B] block mb-1">نقاط الخيرة</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-[#F7F2E7] tracking-tight">
                {stats.totalXP.toLocaleString('en-US')}
              </span>
              {/* Gold Star Badge with XP */}
              <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-[#916E25] via-[#FFE6A0] to-[#D9AE48] flex items-center justify-center shadow-[0_0_12px_rgba(217,174,72,0.35)] shrink-0">
                <span className="text-[10px] font-black text-[#080807] tracking-tighter">XP</span>
              </div>
            </div>
          </div>

          {/* Left Column: Current Level */}
          <div className="px-3 text-right">
            <span className="text-xs font-medium text-[#B5AD9B] block mb-1">المستوي</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-[#F7F2E7] tracking-tight">
                {stats.currentLevel}
              </span>
              {/* Layered Medallion Emblem with 5-point star */}
              <div className="relative w-8 h-8 rounded-full bg-[#201B11] border border-[#D9AE48]/60 flex items-center justify-center shadow-[0_0_12px_rgba(217,174,72,0.25)] shrink-0">
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#916E25] to-[#FFE6A0] flex items-center justify-center">
                  <span className="text-[10px] text-[#080807]">★</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Level Progress Indicator */}
        <div className="mt-3 pt-3 border-t border-[#201B11] flex items-center justify-between text-[10px] text-[#B5AD9B]">
          <span>التقدم نحو المستوى {stats.currentLevel + 1}</span>
          <span className="text-[#FFE6A0] font-mono">{stats.levelProgressPercent}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-[#201B11] overflow-hidden mt-1">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#D9AE48] to-[#FFE6A0]"
            style={{ width: `${stats.levelProgressPercent}%` }}
          />
        </div>
      </section>

      {/* 5. Consistency / Streak Card */}
      <section className="rounded-2xl border border-[#2A2210] bg-[#14120B] p-4 mb-5 shadow-[0_4px_16px_rgba(0,0,0,0.4)] flex items-center justify-between">
        {/* Left Side: Flame in Golden Circular Badge + Days Count */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#201B11] border border-[#D9AE48]/40 flex items-center justify-center shadow-[0_0_15px_rgba(217,174,72,0.25)]">
            <Flame size={24} className="text-[#FFE6A0] fill-[#D9AE48]" />
          </div>
          <div>
            <span className="text-xs font-medium text-[#B5AD9B] block">أيام الاستمرار</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-[#F7F2E7]">{stats.streakDays}</span>
              <span className="text-xs text-[#B5AD9B]">يوماً متتالياً</span>
            </div>
          </div>
        </div>

        {/* Right Side: Inspirational Quote & Leaf Icon */}
        <div className="text-left flex items-center gap-1.5">
          <div>
            <span className="text-xs font-bold text-[#F7F2E7] block">الاستمرارية تصنع</span>
            <span className="text-xs font-bold text-[#D9AE48] block">الفرق ..</span>
          </div>
          <span className="text-lg">🌿</span>
        </div>
      </section>

      {/* 6. Statistics Section ("إحصائياتك") */}
      <section className="mb-5">
        <div className="flex items-center gap-2 mb-3 px-1">
          <BarChart3 size={18} className="text-[#D9AE48]" />
          <h2 className="text-base font-bold text-[#F7F2E7]">إحصائياتك</h2>
        </div>

        {/* 2x2 Grid matching reference design */}
        <div className="grid grid-cols-2 gap-3">
          {/* 1. Quran Card */}
          <div
            onClick={onNavigateToQuran}
            className="rounded-2xl border border-[#2A2210] bg-[#14120B] p-3.5 shadow-[0_4px_16px_rgba(0,0,0,0.35)] hover:border-[#D9AE48]/40 transition-all cursor-pointer flex flex-col justify-between min-h-[110px]"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-[#B5AD9B] block mb-1">القرآن</span>
                <span className="text-2xl font-black text-[#F7F2E7]">{stats.quranHoursThisMonth}</span>
                <span className="text-[10px] text-[#B5AD9B] block mt-0.5">ساعات هذا الشهر</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#201B11] border border-[#D9AE48]/30 flex items-center justify-center text-[#FFE6A0]">
                <BookOpen size={16} />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <ChevronLeft size={14} className="text-[#666]" />
            </div>
          </div>

          {/* 2. Sadaqat Card */}
          <div
            onClick={onOpenSadaqah}
            className="rounded-2xl border border-[#2A2210] bg-[#14120B] p-3.5 shadow-[0_4px_16px_rgba(0,0,0,0.35)] hover:border-[#D9AE48]/40 transition-all cursor-pointer flex flex-col justify-between min-h-[110px]"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-[#B5AD9B] block mb-1">الصدقات</span>
                <span className="text-2xl font-black text-[#F7F2E7]">{stats.sadaqahCountThisMonth}</span>
                <span className="text-[10px] text-[#B5AD9B] block mt-0.5">نشاطات هذا الشهر</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#201B11] border border-[#D9AE48]/30 flex items-center justify-center text-[#FFE6A0]">
                <Heart size={16} />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <ChevronLeft size={14} className="text-[#666]" />
            </div>
          </div>

          {/* 3. Adhkar Card */}
          <div
            onClick={onNavigateToAdhkar}
            className="rounded-2xl border border-[#2A2210] bg-[#14120B] p-3.5 shadow-[0_4px_16px_rgba(0,0,0,0.35)] hover:border-[#D9AE48]/40 transition-all cursor-pointer flex flex-col justify-between min-h-[110px]"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-[#B5AD9B] block mb-1">الأذكار</span>
                <span className="text-2xl font-black text-[#F7F2E7]">{stats.adhkarCountThisMonth}</span>
                <span className="text-[10px] text-[#B5AD9B] block mt-0.5">مرة هذا الشهر</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#201B11] border border-[#D9AE48]/30 flex items-center justify-center text-[#FFE6A0]">
                <Sparkles size={16} />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <ChevronLeft size={14} className="text-[#666]" />
            </div>
          </div>

          {/* 4. Prayers Card */}
          <div
            onClick={onNavigateToPrayers}
            className="rounded-2xl border border-[#2A2210] bg-[#14120B] p-3.5 shadow-[0_4px_16px_rgba(0,0,0,0.35)] hover:border-[#D9AE48]/40 transition-all cursor-pointer flex flex-col justify-between min-h-[110px]"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-[#B5AD9B] block mb-1">الصلاة</span>
                <span className="text-2xl font-black text-[#F7F2E7]">{stats.prayersCountThisMonth}</span>
                <span className="text-[10px] text-[#B5AD9B] block mt-0.5">صلاة هذا الشهر</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#201B11] border border-[#D9AE48]/30 flex items-center justify-center text-[#FFE6A0]">
                <Clock size={16} />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <ChevronLeft size={14} className="text-[#666]" />
            </div>
          </div>
        </div>
      </section>

      {/* 7. Journey Banner ("رحلتك مع أثر - خطوات صغيرة .. أثر كبير") */}
      <section
        onClick={onOpenJourneyOrAchievements}
        className="relative overflow-hidden rounded-2xl border border-[#D9AE48]/30 bg-gradient-to-r from-[#1E170A] via-[#120F08] to-[#0D0B07] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.5)] cursor-pointer hover:border-[#FFE6A0]/50 transition-all"
      >
        {/* Mosque Silhouette SVG in background */}
        <svg
          className="absolute left-0 bottom-0 h-full w-48 pointer-events-none opacity-25 text-[#D9AE48]"
          viewBox="0 0 160 80"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          <path d="M 10 80 L 10 35 L 20 20 L 30 35 L 30 80" />
          <path d="M 50 80 C 50 45, 80 40, 80 25 C 80 40, 110 45, 110 80" />
          <circle cx="80" cy="18" r="4" fill="currentColor" />
          <path d="M 130 80 L 130 35 L 140 20 L 150 35 L 150 80" />
        </svg>

        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-bold text-[#F7F2E7] mb-1">
              <span>رحلتك مع أثر</span>
              <ChevronLeft size={16} className="text-[#FFE6A0]" />
            </div>
            <p className="text-xs text-[#B5AD9B]">خطوات صغيرة .. أثر كبير</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#D9AE48]/20 border border-[#D9AE48]/40 flex items-center justify-center text-[#FFE6A0] shrink-0">
            <Trophy size={18} />
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
    </div>
  );
};
