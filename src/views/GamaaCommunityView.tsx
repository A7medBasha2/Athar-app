import React, { useState, useEffect, useRef } from 'react';
import { GamaaPost } from '../types';
import { GamaaCommunityService } from '../services/gamaaCommunityService';
import { GamaaPostCard } from '../components/gamaa/GamaaPostCard';
import { GamaaPostComposerModal } from '../components/gamaa/GamaaPostComposerModal';
import { GamaaCommentsModal } from '../components/gamaa/GamaaCommentsModal';
import { GamaaCampaignRecoveryModal } from '../components/GamaaCampaignRecoveryModal';
import { GamaaCampaignParticipateModal } from '../components/gamaa/GamaaCampaignParticipateModal';
import { GamaaAdminConsoleModal } from '../components/gamaa/GamaaAdminConsoleModal';
import { GamaaAdminService, AdminRoleStatus } from '../services/gamaaAdminService';
import { GamaaReportModal } from '../components/gamaa/GamaaReportModal';
import { GamaaGroupsList } from '../components/gamaa/GamaaGroupsList';
import { GlobalNoticeBanner } from '../components/GlobalNoticeBanner';
import {
  CommunityCampaign,
  CommunityCampaignService,
  DHIKR_PRESET_DETAILS,
} from '../services/communityCampaignService';
import { AuthService, User } from '../services/authService';
import {
  Users,
  Sparkles,
  Plus,
  RefreshCw,
  Flame,
  ShieldCheck,
  AlertCircle,
  HeartHandshake,
  CheckCircle2,
  Search,
  Bell,
  Camera,
  MoreHorizontal,
  X,
} from 'lucide-react';

interface GamaaCommunityViewProps {
  onOpenAuth?: () => void;
}

export const GamaaCommunityView: React.FC<GamaaCommunityViewProps> = ({ onOpenAuth }) => {
  const [posts, setPosts] = useState<GamaaPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<'timeline' | 'groups'>('timeline');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);

  // Pull-to-refresh touch & scroll state
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);
  const touchStartX = useRef<number>(0);
  const isTouchActive = useRef<boolean>(false);
  const isEligibleForPull = useRef<boolean>(false);
  const [pullDistance, setPullDistance] = useState<number>(0);

  const PULL_THRESHOLD = 68;
  const MAX_PULL_DISTANCE = 96;

  // Modals state
  const [isComposerOpen, setIsComposerOpen] = useState<boolean>(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<GamaaPost | null>(null);
  const [isCampaignsModalOpen, setIsCampaignsModalOpen] = useState<boolean>(false);
  const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportTarget, setReportTarget] = useState<{
    targetType: 'post' | 'comment';
    targetId: string;
    postId: string;
    snippet?: string;
  } | null>(null);

  // Active Dhikr Campaigns & Shard Live Counter state
  const [activeCampaigns, setActiveCampaigns] = useState<CommunityCampaign[]>([]);
  const [selectedCampaignIndex, setSelectedCampaignIndex] = useState<number>(0);
  const [campaignLiveTotal, setCampaignLiveTotal] = useState<number>(0);
  const [isParticipateModalOpen, setIsParticipateModalOpen] = useState<boolean>(false);
  const [participationToast, setParticipationToast] = useState<string | null>(null);

  // User permissions & profile
  const [userProfile, setUserProfile] = useState<{
    displayName?: string;
    photoURL?: string;
    level?: number;
  }>({});
  const [permissions, setPermissions] = useState<AdminRoleStatus>({
    state: 'idle',
    isOwner: false,
    isModerator: false,
    canDeletePosts: false,
    permissions: [],
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => AuthService.getCurrentUser());

  // Subscribe to auth state changes reactively
  useEffect(() => {
    return AuthService.subscribeToAuthState((user) => {
      setCurrentUser(user);
    });
  }, []);

  // Load user profile & permissions
  useEffect(() => {
    if (!currentUser) {
      setUserProfile({});
      setPermissions({
        state: 'denied',
        isOwner: false,
        isModerator: false,
        canDeletePosts: false,
        permissions: [],
      });
      return;
    }

    setPermissions((prev) => ({
      ...prev,
      state: 'loading',
      isOwner: false,
      isModerator: false,
      canDeletePosts: false,
    }));

    // Fetch user profile from Supabase
    const loadProfile = async () => {
      try {
        const prof = await AuthService.getUserProfile(currentUser.uid);
        if (prof) {
          setUserProfile({
            displayName: prof.displayName || currentUser.displayName || 'فاعل خير',
            photoURL: prof.photoURL || currentUser.photoURL || '',
            level: prof.level || 1,
          });
        } else {
          setUserProfile({
            displayName: currentUser.displayName || 'فاعل خير',
            photoURL: currentUser.photoURL || '',
            level: 1,
          });
        }
      } catch {
        setUserProfile({
          displayName: currentUser.displayName || 'فاعل خير',
          photoURL: currentUser.photoURL || '',
          level: 1,
        });
      }
    };

    loadProfile();
    GamaaAdminService.getAdminStatus(currentUser.uid).then((status) => {
      setPermissions(status);
      if (status.state === 'error') {
        console.warn('[Gamaa] Admin status lookup encountered error:', status.error);
      }
    });
  }, [currentUser]);

  // Subscribe to real-time posts feed only when user is authenticated
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const unsub = GamaaCommunityService.listenToPosts(
      (fetchedPosts) => {
        setPosts(fetchedPosts);
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        console.warn('[Gamaa] Feed notice:', err);
        setErrorMsg('تعذر تحميل خلاصات جماعة، تحقق من الاتصال بالإنترنت.');
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsub();
  }, [currentUser]);

  // Subscribe to real-time active campaigns only when user is authenticated
  useEffect(() => {
    if (!currentUser) {
      setActiveCampaigns([]);
      return;
    }

    const unsub = CommunityCampaignService.subscribeToActiveCampaigns((campaigns) => {
      setActiveCampaigns(campaigns);
    });
    return () => unsub();
  }, [currentUser]);

  // Listen for direct campaign navigation requests (e.g. from global notice banner)
  useEffect(() => {
    const handleOpenCampaignEvent = (e: any) => {
      const campaignId = e.detail?.campaignId;
      if (!campaignId) return;

      const idx = activeCampaigns.findIndex((c) => c.id === campaignId);
      if (idx !== -1) {
        setSelectedCampaignIndex(idx);
        setIsParticipateModalOpen(true);
      } else {
        setParticipationToast('هذه الحملة غير متاحة حالياً أو تم إكمالها');
        setTimeout(() => setParticipationToast(null), 3500);
      }
    };

    window.addEventListener('athar_open_campaign_detail', handleOpenCampaignEvent);
    return () => {
      window.removeEventListener('athar_open_campaign_detail', handleOpenCampaignEvent);
    };
  }, [activeCampaigns]);

  // Current active campaign (safely clamped to valid bounds)
  const currentCampaign =
    activeCampaigns.length > 0 && selectedCampaignIndex < activeCampaigns.length
      ? activeCampaigns[selectedCampaignIndex]
      : activeCampaigns[0] || null;

  // Subscribe to real-time 10-shard counter for the selected active campaign
  useEffect(() => {
    if (!currentUser || !currentCampaign) {
      setCampaignLiveTotal(0);
      return;
    }

    setCampaignLiveTotal(0);
    const unsub = CommunityCampaignService.subscribeToCampaignLiveCounter(
      currentCampaign.id,
      (liveTotal) => {
        setCampaignLiveTotal(liveTotal);
      }
    );

    return () => unsub();
  }, [currentUser, currentCampaign?.id]);

  const getScrollContainerTop = (): number => {
    if (containerRef.current) {
      const scrollParent =
        containerRef.current.closest('main') || containerRef.current.parentElement;
      if (scrollParent && typeof scrollParent.scrollTop === 'number' && scrollParent.scrollTop > 0) {
        return scrollParent.scrollTop;
      }
    }
    return window.scrollY || document.documentElement.scrollTop || 0;
  };

  // Core reload function used by both pull-to-refresh gesture and manual refresh triggers
  const reloadFeed = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setErrorMsg(null);
    const startTime = Date.now();

    try {
      const latestPosts = await GamaaCommunityService.fetchLatestPosts(30);
      setPosts(latestPosts);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(15);
        } catch {
          // Ignore vibration permissions error if restricted
        }
      }
    } catch (err: any) {
      console.warn('[Gamaa] Feed reload notice:', err);
    } finally {
      // Keep gold spinner visible for at least 650ms for calm reassurance
      const elapsed = Date.now() - startTime;
      const minDisplayDelay = Math.max(0, 650 - elapsed);
      setTimeout(() => {
        setRefreshing(false);
        setPullDistance(0);
      }, minDisplayDelay);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (
      refreshing ||
      isComposerOpen ||
      Boolean(selectedPostForComments) ||
      isCampaignsModalOpen ||
      e.touches.length !== 1
    ) {
      isEligibleForPull.current = false;
      return;
    }

    const scrollTop = getScrollContainerTop();
    if (scrollTop <= 1) {
      touchStartY.current = e.touches[0].clientY;
      touchStartX.current = e.touches[0].clientX;
      isTouchActive.current = true;
      isEligibleForPull.current = true;
    } else {
      isEligibleForPull.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isTouchActive.current || !isEligibleForPull.current || refreshing) return;

    const scrollTop = getScrollContainerTop();
    if (scrollTop > 1) {
      isEligibleForPull.current = false;
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const diffY = currentY - touchStartY.current;
    const diffX = currentX - touchStartX.current;

    // Discard horizontal gesture
    if (Math.abs(diffX) > Math.abs(diffY)) {
      return;
    }

    if (diffY > 0) {
      const dampened = Math.min(Math.pow(diffY, 0.82) * 1.8, MAX_PULL_DISTANCE);

      // Light haptic trigger once crossing threshold on Android
      if (dampened >= PULL_THRESHOLD && pullDistance < PULL_THRESHOLD) {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(10);
          } catch {
            // Ignore if vibration not permitted
          }
        }
      }
      setPullDistance(dampened);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = () => {
    if (!isTouchActive.current) return;
    isTouchActive.current = false;
    isEligibleForPull.current = false;

    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      setPullDistance(PULL_THRESHOLD);
      reloadFeed();
    } else {
      setPullDistance(0);
    }
  };

  const handleOpenComposer = () => {
    if (!currentUser) {
      if (onOpenAuth) {
        onOpenAuth();
      } else {
        window.dispatchEvent(new CustomEvent('athar_open_auth'));
      }
      return;
    }
    setIsComposerOpen(true);
  };

  const isTriggered = pullDistance >= PULL_THRESHOLD;
  const pullHeight = refreshing ? 54 : pullDistance > 0 ? Math.min(pullDistance, 60) : 0;
  const pullOpacity = refreshing ? 1 : pullDistance > 8 ? Math.min(1, pullDistance / 40) : 0;

  // Circular gauge calculations matching Concept D
  const totalTarget =
    currentCampaign?.totalTarget && currentCampaign.totalTarget > 0
      ? currentCampaign.totalTarget
      : 1000000;
  const progressFraction = currentCampaign
    ? Math.min(1, Math.max(0, campaignLiveTotal / totalTarget))
    : 0.68;
  const progressPercent = Math.round(progressFraction * 100);
  const participantsCount =
    campaignLiveTotal > 0 ? Math.max(1, Math.round(campaignLiveTotal / 120)) : 372640;

  const filteredPosts = posts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.content.toLowerCase().includes(q) ||
      p.authorName.toLowerCase().includes(q)
    );
  });

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="athar-page-container animate-fadeIn relative space-y-3.5 pb-24"
      dir="rtl"
    >
      {/* 0. Luxury Gold Pull-To-Refresh Indicator */}
      <div
        className="overflow-hidden transition-all duration-200 ease-out flex items-center justify-center pointer-events-none -mt-1 mb-1"
        style={{
          height: `${pullHeight}px`,
          opacity: pullOpacity,
        }}
        aria-hidden={!refreshing && pullDistance === 0}
      >
        <div
          className={`flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#120F0A] border border-[#D4AF37]/50 shadow-[0_4px_25px_rgba(212,175,55,0.35)] transition-all duration-200 ${
            isTriggered || refreshing
              ? 'scale-100 ring-1 ring-[#E6C66E]/40 bg-[#16120B]'
              : 'scale-95'
          }`}
        >
          {refreshing ? (
            <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
              <div className="w-5 h-5 rounded-full border-2 border-[#382B14] border-t-[#E6C66E] border-r-[#D4AF37] animate-spin" />
              <div className="absolute w-1.5 h-1.5 rounded-full bg-[#FFE294] shadow-[0_0_6px_#FFE294]" />
            </div>
          ) : (
            <div
              className="w-5 h-5 rounded-full border border-[#C8A24A]/40 flex items-center justify-center text-[#E6C66E] transition-transform duration-75 shrink-0"
              style={{ transform: `rotate(${pullDistance * 4}deg)` }}
            >
              <RefreshCw
                size={12}
                className={isTriggered ? 'text-[#FFE294]' : 'text-[#C8A24A]'}
              />
            </div>
          )}

          <span className="text-xs font-bold text-[#EAE2C8] select-none font-sans">
            {refreshing
              ? 'جارٍ تحديث جماعة...'
              : isTriggered
              ? 'أفلت لتحديث المنشورات'
              : 'اسحب لتحديث المنشورات'}
          </span>
        </div>
      </div>

      {/* 1. Concept D Editorial Islamic Luxury Header */}
      <header className="relative overflow-hidden rounded-3xl bg-[#080B0C] border border-[#9E7B48]/30 pt-4 pb-3 px-4 shadow-[0_8px_30px_rgba(0,0,0,0.8)] text-right">
        {/* Background Mosque Silhouette Watermark in warm gold */}
        <div
          className="absolute inset-0 pointer-events-none opacity-25 bg-center bg-no-repeat bg-contain"
          style={{ backgroundImage: `url('/src/assets/images/exact_journey_mosque_art.png')` }}
        />

        {/* Faint Islamic geometric corner watermarks */}
        <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none opacity-10 bg-gradient-to-bl from-[#D8AF68] to-transparent rounded-bl-full" />
        <div className="absolute top-0 left-0 w-24 h-24 pointer-events-none opacity-10 bg-gradient-to-br from-[#D8AF68] to-transparent rounded-br-full" />

        <div className="relative z-10 flex items-center justify-between">
          {/* Top-Left Action Icons: Search & Notifications */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsSearchOpen((prev) => !prev)}
              aria-label="البحث في المنشورات"
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#B6ADA0] hover:text-[#E8CA8D] hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
            >
              <Search size={19} />
            </button>

            <button
              onClick={() => {
                const noticeEl = document.querySelector('[data-notice-banner]');
                if (noticeEl) {
                  noticeEl.scrollIntoView({ behavior: 'smooth' });
                } else {
                  setParticipationToast('لا توجد تنبيهات جديدة في الوقت الحالي');
                  setTimeout(() => setParticipationToast(null), 3000);
                }
              }}
              aria-label="التنبيهات"
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#B6ADA0] hover:text-[#E8CA8D] hover:bg-white/5 active:scale-95 transition-all cursor-pointer relative"
            >
              <Bell size={19} />
            </button>
          </div>

          {/* Center: Golden Athar Calligraphy & Brand Lockup */}
          <div className="flex flex-col items-center justify-center">
            <img
              src="/src/assets/images/clean_top_right_athar_logo.png"
              alt="أثر"
              className="h-10 w-auto object-contain filter drop-shadow-[0_2px_8px_rgba(216,175,104,0.3)]"
            />
          </div>

          {/* Top-Right: Refresh trigger */}
          <div className="flex items-center">
            <button
              onClick={reloadFeed}
              disabled={refreshing}
              aria-label="تحديث الخلاصات"
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#8A8275] hover:text-[#E8CA8D] hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCw size={17} className={refreshing ? 'animate-spin text-[#E8CA8D]' : ''} />
            </button>
          </div>
        </div>

        {/* Expandable Search Bar */}
        {isSearchOpen && (
          <div className="relative z-10 mt-3 pt-2 border-t border-[#262420]/60 animate-fadeIn flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن فائدة، كاتب، أو تدبر..."
                className="w-full bg-[#141513] border border-[#9E7B48]/40 rounded-full py-1.5 pr-9 pl-8 text-xs text-[#F2EEE6] placeholder-[#8A8275] focus:outline-none focus:border-[#D8AF68]"
                autoFocus
              />
              <Search size={14} className="absolute right-3 top-2.5 text-[#8A8275]" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-2 text-[#8A8275] hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery('');
              }}
              className="text-xs text-[#8A8275] hover:text-[#E8CA8D] px-1"
            >
              إلغاء
            </button>
          </div>
        )}
      </header>

      {/* 2. Global Notice Banner (Concept D Placement) */}
      <div data-notice-banner>
        <GlobalNoticeBanner
          currentSection="gamaa"
          onNavigateToCampaign={(campId) => {
            const idx = activeCampaigns.findIndex((c) => c.id === campId);
            if (idx !== -1) {
              setSelectedCampaignIndex(idx);
              setIsParticipateModalOpen(true);
            } else {
              setParticipationToast('هذه الحملة غير متاحة حالياً أو تم إكمالها');
              setTimeout(() => setParticipationToast(null), 3500);
            }
          }}
        />
      </div>

      {/* 3. Concept D Tasbeeh Campaign Card with Circular Donut Progress Meter */}
      <section
        className="relative overflow-hidden rounded-3xl bg-[#121312] border border-[#9E7B48]/35 p-4 sm:p-5 shadow-[0_8px_30px_rgba(0,0,0,0.6)] text-right"
        aria-label="حملة التسبيح الجماعية"
      >
        {/* Faint Mosque Watermark on bottom-right */}
        <div
          className="absolute -bottom-2 right-0 w-44 h-28 opacity-10 pointer-events-none bg-contain bg-no-repeat bg-right-bottom"
          style={{ backgroundImage: `url('/src/assets/images/exact_journey_mosque_art.png')` }}
        />

        <div className="relative z-10 flex items-center justify-between gap-3 sm:gap-4">
          {/* Right Section (Leading in RTL): Title, Subtitle, Stats, and Action Button */}
          <div className="flex-1 min-w-0 space-y-2.5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#F2EEE6] tracking-wide leading-snug">
                {currentCampaign ? currentCampaign.title : 'حملة التسبيح الجماعية'}
              </h2>
              <p className="text-xs text-[#D8AF68] font-medium leading-relaxed mt-0.5 truncate">
                {currentCampaign
                  ? DHIKR_PRESET_DETAILS[currentCampaign.targetDhikrPreset]?.label ||
                    currentCampaign.description ||
                    'سبحان الله وبحمده سبحان الله العظيم'
                  : 'سبحان الله وبحمده سبحان الله العظيم'}
              </p>
            </div>

            {/* Stats row with user icon and count */}
            <div className="flex items-center gap-2 text-xs text-[#B6ADA0] flex-wrap">
              <div className="flex items-center gap-1">
                <Users size={14} className="text-[#D8AF68] shrink-0" />
                <span className="font-mono tabular-nums font-bold text-[#F2EEE6]">
                  {participantsCount.toLocaleString('ar-EG')}
                </span>
                <span className="text-[11px] text-[#8A8275]">مشترك</span>
              </div>
              <span className="text-[#3A352C]">•</span>
              <div className="text-[11px] text-[#A69E89] font-mono tabular-nums">
                {campaignLiveTotal.toLocaleString('ar-EG')} / {totalTarget.toLocaleString('ar-EG')} تسبيحة
              </div>
            </div>

            {/* Action Button: شارك بالتسبيح */}
            <div className="pt-0.5">
              <button
                onClick={() => {
                  if (currentCampaign) {
                    setIsParticipateModalOpen(true);
                  } else {
                    setIsCampaignsModalOpen(true);
                  }
                }}
                className="min-h-[44px] px-6 py-2 rounded-full border border-[#D8AF68] bg-[#1A1813]/90 hover:bg-[#D8AF68]/20 text-[#E8CA8D] font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Sparkles size={14} className="text-[#E8CA8D]" />
                <span>شارك بالتسبيح</span>
              </button>
            </div>
          </div>

          {/* Left Section (Trailing in RTL): Circular Donut Progress Meter (68%) */}
          <div className="relative shrink-0 flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
              {/* Background ring track */}
              <circle
                cx="50"
                cy="50"
                r="38"
                className="stroke-[#221F18]"
                strokeWidth="7"
                fill="transparent"
              />
              {/* Golden progress stroke */}
              <circle
                cx="50"
                cy="50"
                r="38"
                className="stroke-[#D8AF68] transition-all duration-700 ease-out"
                strokeWidth="7"
                strokeDasharray={238.761}
                strokeDashoffset={238.761 * (1 - progressFraction)}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            {/* Center percentage readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
              <span className="text-base sm:text-lg font-bold font-mono text-[#F2EEE6] tabular-nums tracking-tight">
                {progressPercent}%
              </span>
              <span className="text-[10px] text-[#8A8275] font-medium -mt-0.5">
                مكتمل
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Concept D Community Shortcuts: المجموعات | الحملات | المزيد/الإدارة */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Tile 1: المجموعات */}
        <button
          onClick={() => setActiveMainTab(activeMainTab === 'groups' ? 'timeline' : 'groups')}
          className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 min-h-[72px] transition-all cursor-pointer active:scale-95 ${
            activeMainTab === 'groups'
              ? 'bg-[#1C1A14] border border-[#D8AF68] shadow-[0_0_15px_rgba(216,175,104,0.15)]'
              : 'bg-[#121312] border border-[#262420] hover:border-[#9E7B48]/50'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-[#1A1813] border border-[#D8AF68]/30 flex items-center justify-center text-[#D8AF68]">
            <Users size={16} />
          </div>
          <span className="text-xs font-bold text-[#EAE2D0]">المجموعات</span>
        </button>

        {/* Tile 2: الحملات */}
        <button
          onClick={() => setIsCampaignsModalOpen(true)}
          className="p-3 rounded-2xl bg-[#121312] border border-[#262420] hover:border-[#9E7B48]/50 flex flex-col items-center justify-center gap-1.5 min-h-[72px] transition-all cursor-pointer active:scale-95"
        >
          <div className="w-8 h-8 rounded-full bg-[#1A1813] border border-[#D8AF68]/30 flex items-center justify-center text-[#D8AF68]">
            <Flame size={16} />
          </div>
          <span className="text-xs font-bold text-[#EAE2D0]">الحملات</span>
        </button>

        {/* Tile 3: المزيد / لوحة الإدارة */}
        <button
          onClick={() => {
            if (permissions.state === 'success' && (permissions.isOwner || permissions.isModerator)) {
              setIsAdminConsoleOpen(true);
            } else {
              setIsMoreMenuOpen(true);
            }
          }}
          className="p-3 rounded-2xl bg-[#121312] border border-[#262420] hover:border-[#9E7B48]/50 flex flex-col items-center justify-center gap-1.5 min-h-[72px] transition-all cursor-pointer active:scale-95"
        >
          <div className="w-8 h-8 rounded-full bg-[#1A1813] border border-[#D8AF68]/30 flex items-center justify-center text-[#D8AF68]">
            {permissions.state === 'success' && (permissions.isOwner || permissions.isModerator) ? (
              <ShieldCheck size={16} className="text-amber-400" />
            ) : (
              <MoreHorizontal size={16} />
            )}
          </div>
          <span className="text-xs font-bold text-[#EAE2D0]">
            {permissions.state === 'success' && (permissions.isOwner || permissions.isModerator)
              ? 'الإدارة'
              : 'المزيد'}
          </span>
        </button>
      </div>

      {/* More Options Sheet for non-admin users */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-[#141513] border border-[#9E7B48]/40 p-5 space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-[#262420] pb-3">
              <h3 className="text-sm font-bold text-[#F2EEE6]">مجتمع جَمَاعَة</h3>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-[#8A8275] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2 text-xs text-[#B6ADA0]">
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  setIsCampaignsModalOpen(true);
                }}
                className="w-full text-right p-3 rounded-xl bg-[#1A1813] border border-[#262420] hover:border-[#D8AF68]/40 flex items-center justify-between"
              >
                <span>أرشيف الحملات السابقة</span>
                <Flame size={15} className="text-[#D8AF68]" />
              </button>
              <div className="p-3 rounded-xl bg-[#1A1813] border border-[#262420] text-right space-y-1">
                <span className="font-bold text-[#E8CA8D] block">ميثاق المجتمع:</span>
                <p className="text-[11px] leading-relaxed text-[#8A8275]">
                  فضاء مبارك للتواصي بالحق والذكر النقي، نرجو الالتزام بآداب الحوار الإسلامي والتعاون على البر والتقوى.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Concept D Post Composer Pill Bar */}
      <div className="flex items-center gap-3">
        {/* User avatar on right */}
        <div className="w-10 h-10 rounded-full border border-[#D8AF68]/60 bg-[#1A1813] flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
          {userProfile.photoURL ? (
            <img
              src={userProfile.photoURL}
              alt=""
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs text-[#E8CA8D] font-bold">
              {(userProfile.displayName || 'أ').charAt(0)}
            </span>
          )}
        </div>

        {/* Pill input field */}
        <button
          onClick={handleOpenComposer}
          className="flex-1 rounded-full bg-[#131414] border border-[#262420] hover:border-[#D8AF68]/40 px-4 py-2.5 flex items-center justify-between text-[#8A8275] text-xs sm:text-sm min-h-[44px] cursor-pointer transition-colors active:scale-[0.99]"
        >
          <span>
            {currentUser
              ? 'شارك الخير مع جماعة...'
              : 'سجل الدخول للمشاركة في جماعة...'}
          </span>
          <Camera size={17} className="text-[#8A8275] hover:text-[#E8CA8D]" />
        </button>
      </div>

      {/* 6. Continuous Community Feed / Groups List */}
      {activeMainTab === 'groups' ? (
        <GamaaGroupsList
          currentUserUid={currentUser?.uid || ''}
          userProfile={userProfile}
          isSystemOwner={permissions.isOwner}
          onOpenAuth={onOpenAuth}
          onReportPost={(postId, snippet) => {
            setReportTarget({
              targetType: 'post',
              targetId: postId,
              postId: postId,
              snippet: snippet,
            });
            setIsReportModalOpen(true);
          }}
        />
      ) : (
        <section className="space-y-3" aria-label="الخط الزمني لجماعة">
          {/* Guest Onboarding Banner */}
          {!currentUser && (
            <div className="p-4 rounded-2xl bg-[#141513] border border-[#D8AF68]/30 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 text-right">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1F1C15] border border-[#D8AF68]/30 flex items-center justify-center text-[#E8CA8D] shrink-0">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">انضم إلى مجتمع جَمَاعَة</h3>
                  <p className="text-xs text-[#B6ADA0] mt-0.5">
                    سجّل دخولك للمشاركة في التسبيح الموحد ونشر الفوائد والتفاعل مع رواد أثر
                  </p>
                </div>
              </div>
              {onOpenAuth && (
                <button
                  onClick={onOpenAuth}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-[#D8AF68] bg-[#1A1813] text-[#E8CA8D] font-bold text-xs shadow-sm hover:bg-[#D8AF68]/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap min-h-[44px]"
                >
                  تسجيل الدخول / إنشاء حساب
                </button>
              )}
            </div>
          )}

          {/* Error State */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
              <button
                onClick={reloadFeed}
                className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-red-900/60 border border-red-400/40 text-white text-xs cursor-pointer hover:bg-red-800 touch-manipulation"
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && (
            <div className="rounded-2xl border border-[#22201C] bg-[#101111] divide-y divide-[#22201C] overflow-hidden animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1A1916]" />
                    <div className="space-y-1.5 flex-1">
                      <div className="w-28 h-3.5 bg-[#1A1916] rounded" />
                      <div className="w-16 h-2.5 bg-[#1A1916] rounded" />
                    </div>
                  </div>
                  <div className="w-full h-8 bg-[#1A1916] rounded-xl" />
                  <div className="w-1/3 h-4 bg-[#1A1916] rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredPosts.length === 0 && !errorMsg && (
            <div className="rounded-2xl border border-[#22201C] bg-[#101111] py-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#181713] border border-[#D8AF68]/30 flex items-center justify-center text-[#E8CA8D] mx-auto shadow-inner">
                <HeartHandshake size={28} />
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h2 className="text-base font-bold text-white">
                  {searchQuery
                    ? 'لم يتم العثور على نتائج للبحث'
                    : currentUser
                    ? 'لا توجد مشاركات بعد'
                    : 'أهلاً بك في مجتمع جَمَاعَة'}
                </h2>
                <p className="text-xs text-[#8A8275] leading-relaxed">
                  {searchQuery
                    ? 'جرّب البحث بكلمات أخرى أو مسح نص البحث.'
                    : currentUser
                    ? 'كن المبادر بنشر أول فائدة أو تدبر قرآني، واكسب أجر الدلالة على الخير.'
                    : 'سجل دخولك لتتصل بمجتمع الذاكرين، وتشهد حملات التسبيح الموحدة والمشاركات النيرة.'}
                </p>
              </div>
              {currentUser && !searchQuery ? (
                <button
                  onClick={handleOpenComposer}
                  className="text-xs px-5 py-2.5 rounded-full border border-[#D8AF68] bg-[#1A1813] text-[#E8CA8D] font-bold inline-flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] hover:bg-[#D8AF68]/20"
                >
                  <Plus size={16} />
                  <span>اكتب أول مشاركة</span>
                </button>
              ) : null}
            </div>
          )}

          {/* Unified Continuous Stream Container */}
          {!loading && filteredPosts.length > 0 && (
            <div className="rounded-3xl border border-[#22201C] bg-[#0E1012] shadow-2xl overflow-hidden divide-y divide-[#1E1C18]">
              {filteredPosts.map((post) => (
                <GamaaPostCard
                  key={post.id}
                  post={post}
                  onOpenComments={(p) => setSelectedPostForComments(p)}
                  onPostDeleted={(deletedId) => {
                    setPosts((prev) => prev.filter((p) => p.id !== deletedId));
                  }}
                  onReportPost={(p) => {
                    setReportTarget({
                      targetType: 'post',
                      targetId: p.id,
                      postId: p.id,
                      snippet: p.content,
                    });
                    setIsReportModalOpen(true);
                  }}
                  canModerate={permissions.canDeletePosts}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 5. Modals */}
      {/* Post Composer Modal */}
      <GamaaPostComposerModal
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        userProfile={userProfile}
      />

      {/* Post Comments Modal */}
      <GamaaCommentsModal
        post={selectedPostForComments}
        isOpen={!!selectedPostForComments}
        onClose={() => setSelectedPostForComments(null)}
        canModerate={permissions.canDeletePosts}
        onReportComment={(comment) => {
          if (selectedPostForComments) {
            setReportTarget({
              targetType: 'comment',
              targetId: comment.id,
              postId: selectedPostForComments.id,
              snippet: comment.content,
            });
            setIsReportModalOpen(true);
          }
        }}
        userProfile={userProfile}
      />

      {/* Dhikr Campaigns Recovery/Management Modal */}
      <GamaaCampaignRecoveryModal
        isOpen={isCampaignsModalOpen}
        onClose={() => setIsCampaignsModalOpen(false)}
      />

      {/* Real Dhikr Campaign Participation Modal */}
      <GamaaCampaignParticipateModal
        isOpen={isParticipateModalOpen}
        campaign={currentCampaign}
        onClose={() => setIsParticipateModalOpen(false)}
        onContributed={(_res, amt) => {
          setParticipationToast(`تقبل الله منك! تم تسجيل ${amt.toLocaleString('ar-EG')} تسبيحة بنجاح.`);
          setTimeout(() => {
            setParticipationToast(null);
          }, 4500);
        }}
      />

      {/* Floating Success Toast */}
      {participationToast && (
        <div className="fixed bottom-20 left-4 right-4 z-40 max-w-sm mx-auto p-3.5 rounded-2xl bg-[#14120C]/95 border border-[#E6C66E]/50 shadow-[0_10px_30px_rgba(212,175,55,0.3)] text-right flex items-center gap-3 text-xs text-[#FFF3D1] animate-fadeIn backdrop-blur-md">
          <div className="w-7 h-7 rounded-full bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 size={16} />
          </div>
          <span className="font-bold flex-1 leading-relaxed">{participationToast}</span>
        </div>
      )}

      {/* Admin Console Modal (Role-gated) */}
      <GamaaAdminConsoleModal
        isOpen={isAdminConsoleOpen}
        onClose={() => setIsAdminConsoleOpen(false)}
        currentUserUid={currentUser?.uid || ''}
      />

      {/* User Content Reporting Modal */}
      {reportTarget && (
        <GamaaReportModal
          isOpen={isReportModalOpen}
          targetType={reportTarget.targetType}
          targetId={reportTarget.targetId}
          postId={reportTarget.postId}
          snippet={reportTarget.snippet}
          onClose={() => {
            setIsReportModalOpen(false);
            setReportTarget(null);
          }}
          onReportSubmitted={() => {
            setParticipationToast('تم إرسال بلاغك لفريق الإشراف. شكراً لحرصك.');
            setTimeout(() => {
              setParticipationToast(null);
            }, 4500);
          }}
        />
      )}
    </div>
  );
};
