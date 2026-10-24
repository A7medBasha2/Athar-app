import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GamaaPost } from '../types';
import { GamaaCommunityService } from '../services/gamaaCommunityService';
import { GamaaPostCard } from '../components/gamaa/GamaaPostCard';
import { GamaaPostComposerModal } from '../components/gamaa/GamaaPostComposerModal';
import { GamaaCommentsModal } from '../components/gamaa/GamaaCommentsModal';
import { GamaaCampaignRecoveryModal } from '../components/GamaaCampaignRecoveryModal';
import { GamaaCampaignParticipateModal } from '../components/gamaa/GamaaCampaignParticipateModal';
import { GamaaCampaignsModal } from '../components/gamaa/GamaaCampaignsModal';
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
import mosqueArtBg from '../assets/images/exact_journey_mosque_art.png';
import kaabaSanctuaryBg from '../assets/images/kaaba_dawn_sanctuary_1791598394662.webp';
import {
  Users,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Search,
  Bell,
  Image as ImageIcon,
  MoreHorizontal,
  X,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

interface GamaaCommunityViewProps {
  onOpenAuth?: () => void;
}

const USER_CAMPAIGN_CONTRIB_PREFIX = 'athar_gamaa_camp_contrib_';

function readUserCampaignContribution(uid: string | undefined, campaignId: string | undefined): number {
  if (!uid || !campaignId) return 0;
  try {
    const raw = localStorage.getItem(`${USER_CAMPAIGN_CONTRIB_PREFIX}${uid}_${campaignId}`);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function addUserCampaignContribution(uid: string | undefined, campaignId: string | undefined, amount: number): number {
  if (!uid || !campaignId || amount <= 0) return 0;
  try {
    const prev = readUserCampaignContribution(uid, campaignId);
    const next = prev + amount;
    localStorage.setItem(`${USER_CAMPAIGN_CONTRIB_PREFIX}${uid}_${campaignId}`, String(next));
    return next;
  } catch {
    return amount;
  }
}

/** Subtle Islamic geometric corner ornament SVG */
const HeaderCornerOrnament: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 80 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M0 0H48C32 8 18 22 10 38C6 26 2 14 0 0Z"
      fill="url(#goldCornerGrad)"
      fillOpacity="0.16"
    />
    <path
      d="M4 4H36L20 20L32 32L16 28L4 40V4Z"
      stroke="#D4AF37"
      strokeOpacity="0.32"
      strokeWidth="1"
    />
    <circle cx="14" cy="14" r="3" stroke="#E6B76B" strokeOpacity="0.4" strokeWidth="1" />
    <defs>
      <linearGradient id="goldCornerGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#E6B76B" />
        <stop offset="1" stopColor="#806039" stopOpacity="0" />
      </linearGradient>
    </defs>
  </svg>
);

/** Tasbeeh prayer beads icon SVG */
const TasbeehBeadsIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="5" r="2" fill="currentColor" />
    <circle cx="17" cy="7.5" r="1.8" fill="currentColor" />
    <circle cx="19" cy="12.5" r="1.8" fill="currentColor" />
    <circle cx="16.5" cy="17.2" r="1.8" fill="currentColor" />
    <circle cx="12" cy="19" r="2" fill="currentColor" />
    <circle cx="7.5" cy="17.2" r="1.8" fill="currentColor" />
    <circle cx="5" cy="12.5" r="1.8" fill="currentColor" />
    <circle cx="7" cy="7.5" r="1.8" fill="currentColor" />
    <path d="M12 19V22.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/** Empty Timeline Mosque Dome Line-Art SVG (matching visual source of truth) */
const EmptyMosqueIllustration: React.FC = () => (
  <svg
    viewBox="0 0 120 96"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-24 h-20 mx-auto text-[#806039]"
    aria-hidden="true"
  >
    {/* Crescent at dome spire */}
    <path
      d="M60 11V19"
      stroke="#D4AF37"
      strokeOpacity="0.65"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M63.5 9.5C61.8 10.6 59.5 10.2 58.3 8.5C57.2 6.8 57.6 4.5 59.3 3.4C57.1 3.7 55.4 5.6 55.4 7.9C55.4 10.4 57.5 12.5 60 12.5C61.6 12.5 63 11.7 63.8 10.4"
      stroke="#E6B76B"
      strokeOpacity="0.8"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
    {/* Main Central Dome */}
    <path
      d="M34 52C34 34 46 23 60 19C74 23 86 34 86 52H34Z"
      stroke="#806039"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    {/* Side Minarets */}
    <path
      d="M20 30L23 23L26 30V78H20V30Z"
      stroke="#806039"
      strokeOpacity="0.8"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M94 30L97 23L100 30V78H94V30Z"
      stroke="#806039"
      strokeOpacity="0.8"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {/* Sanctuary Base & Mihrab Arch */}
    <rect
      x="26"
      y="52"
      width="68"
      height="26"
      rx="2"
      stroke="#806039"
      strokeWidth="1.7"
    />
    <path
      d="M52 78V64C52 59.5 55.6 56 60 56C64.4 56 68 59.5 68 64V78"
      stroke="#D4AF37"
      strokeOpacity="0.6"
      strokeWidth="1.6"
    />
    <line
      x1="12"
      y1="78"
      x2="108"
      y2="78"
      stroke="#806039"
      strokeOpacity="0.7"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

export const GamaaCommunityView: React.FC<GamaaCommunityViewProps> = ({ onOpenAuth }) => {
  const [posts, setPosts] = useState<GamaaPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<'timeline' | 'groups'>('timeline');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);

  // Active / Eligible Notice counts for Header Bell indicator
  const [visibleNoticeCount, setVisibleNoticeCount] = useState<number>(0);
  const [eligibleNoticeCount, setEligibleNoticeCount] = useState<number>(0);

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
  const [openComposerWithMedia, setOpenComposerWithMedia] = useState<boolean>(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<GamaaPost | null>(null);
  const [isCampaignsModalOpen, setIsCampaignsModalOpen] = useState<boolean>(false);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState<boolean>(false);
  const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportTarget, setReportTarget] = useState<{
    targetType: 'post' | 'comment';
    targetId: string;
    postId: string;
    snippet?: string;
  } | null>(null);

  // Dynamic Tasbeeh Campaigns state
  const [activeCampaigns, setActiveCampaigns] = useState<CommunityCampaign[]>([]);
  const [selectedCampaignIndex, setSelectedCampaignIndex] = useState<number>(0);
  const [campaignLiveTotal, setCampaignLiveTotal] = useState<number>(0);
  // Session-only completed campaign holder (per user UX preference: show completed in current session, then archive to Campaigns section)
  const [sessionCompletedCampaign, setSessionCompletedCampaign] = useState<CommunityCampaign | null>(null);
  const lastActiveCampaignRef = useRef<CommunityCampaign | null>(null);

  const [isParticipateModalOpen, setIsParticipateModalOpen] = useState<boolean>(false);
  const [userCampaignContribution, setUserCampaignContribution] = useState<number>(0);
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

  const triggerAuthFlow = useCallback(() => {
    if (onOpenAuth) {
      onOpenAuth();
    } else {
      window.dispatchEvent(new CustomEvent('athar_open_auth'));
    }
  }, [onOpenAuth]);

  // Listen to auth state & global open-auth events from child cards
  useEffect(() => {
    const authUnsub = AuthService.subscribeToAuthState((user) => {
      setCurrentUser(user);
    });

    const handleChildAuthRequest = () => {
      if (onOpenAuth) onOpenAuth();
    };
    window.addEventListener('athar_open_auth', handleChildAuthRequest);

    return () => {
      authUnsub();
      window.removeEventListener('athar_open_auth', handleChildAuthRequest);
    };
  }, [onOpenAuth]);

  // Load user profile & admin/moderator role
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
    });
  }, [currentUser]);

  // Subscribe to real-time posts feed
  useEffect(() => {
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
        setErrorMsg('تعذر تحميل منشورات جماعة حالياً. تحقق من الاتصال بالإنترنت.');
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsub();
  }, [currentUser?.uid]);

  // Subscribe to real-time active campaigns (strictly dynamic — empty array when none active)
  useEffect(() => {
    const unsub = CommunityCampaignService.subscribeToActiveCampaigns((campaigns) => {
      setActiveCampaigns((prevActive) => {
        // If an active campaign we were tracking in this session just transitioned out because it reached target:
        if (
          campaigns.length === 0 &&
          prevActive.length > 0 &&
          lastActiveCampaignRef.current
        ) {
          const prevCamp = lastActiveCampaignRef.current;
          if ((prevCamp.currentCount || 0) >= prevCamp.totalTarget) {
            setSessionCompletedCampaign({
              ...prevCamp,
              currentCount: Math.max(prevCamp.currentCount || 0, prevCamp.totalTarget),
              status: 'completed',
            });
          }
        }
        return campaigns;
      });
    });
    return () => unsub();
  }, [currentUser?.uid]);

  // Listen for direct campaign navigation requests (e.g., from GlobalNoticeBanner "عرض التفاصيل")
  useEffect(() => {
    const handleOpenCampaignEvent = (e: any) => {
      const campaignId = e.detail?.campaignId;
      if (!campaignId) return;

      const idx = activeCampaigns.findIndex((c) => c.id === campaignId);
      if (idx !== -1) {
        setSelectedCampaignIndex(idx);
        if (!currentUser) {
          triggerAuthFlow();
        } else {
          setIsParticipateModalOpen(true);
        }
      } else {
        setIsCampaignsModalOpen(true);
      }
    };

    window.addEventListener('athar_open_campaign_detail', handleOpenCampaignEvent);
    return () => {
      window.removeEventListener('athar_open_campaign_detail', handleOpenCampaignEvent);
    };
  }, [activeCampaigns, currentUser, triggerAuthFlow]);

  const currentActiveCampaign =
    activeCampaigns.length > 0 && selectedCampaignIndex < activeCampaigns.length
      ? activeCampaigns[selectedCampaignIndex]
      : activeCampaigns[0] || null;

  // Displayed campaign on the timeline: active campaign takes priority; otherwise session-completed campaign
  const displayedCampaign = currentActiveCampaign || sessionCompletedCampaign;

  // Subscribe to real-time counter for the active campaign
  useEffect(() => {
    if (!currentActiveCampaign) {
      if (!sessionCompletedCampaign) {
        setCampaignLiveTotal(0);
      }
      return;
    }

    const initialCount = Number(currentActiveCampaign.currentCount) || 0;
    setCampaignLiveTotal(initialCount);
    lastActiveCampaignRef.current = {
      ...currentActiveCampaign,
      currentCount: initialCount,
    };

    const unsub = CommunityCampaignService.subscribeToCampaignLiveCounter(
      currentActiveCampaign.id,
      (liveTotal) => {
        setCampaignLiveTotal(liveTotal);
        lastActiveCampaignRef.current = {
          ...currentActiveCampaign,
          currentCount: liveTotal,
        };
        if (currentActiveCampaign.totalTarget > 0 && liveTotal >= currentActiveCampaign.totalTarget) {
          setSessionCompletedCampaign({
            ...currentActiveCampaign,
            currentCount: liveTotal,
            status: 'completed',
          });
        }
      }
    );

    return () => unsub();
  }, [currentActiveCampaign?.id]);

  // Load current user's isolated contribution for the displayed campaign
  useEffect(() => {
    setUserCampaignContribution(
      readUserCampaignContribution(currentUser?.uid, displayedCampaign?.id)
    );
  }, [currentUser?.uid, displayedCampaign?.id]);

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
        } catch {}
      }
    } catch (err: any) {
      console.warn('[Gamaa] Feed reload error:', err);
      setErrorMsg('تعذر تحديث المنشورات. تحقق من الاتصال بالإنترنت.');
    } finally {
      const elapsed = Date.now() - startTime;
      const minDisplayDelay = Math.max(0, 550 - elapsed);
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
      isRecoveryModalOpen ||
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

    if (Math.abs(diffX) > Math.abs(diffY)) {
      return;
    }

    if (diffY > 0) {
      const dampened = Math.round(Math.min(Math.pow(diffY, 0.82) * 1.8, MAX_PULL_DISTANCE));
      if (dampened >= PULL_THRESHOLD && pullDistance < PULL_THRESHOLD) {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(10);
          } catch {}
        }
      }
      if (Math.abs(dampened - pullDistance) >= 3) {
        setPullDistance(dampened);
      }
    } else if (pullDistance > 0) {
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

  const handleOpenComposer = (withMediaPicker = false) => {
    if (!currentUser) {
      triggerAuthFlow();
      return;
    }
    setOpenComposerWithMedia(withMediaPicker);
    setIsComposerOpen(true);
  };

  const handleNoticeCountChange = useCallback((visible: number, eligible: number) => {
    setVisibleNoticeCount(visible);
    setEligibleNoticeCount(eligible);
  }, []);

  const handleHeaderBellClick = () => {
    if (visibleNoticeCount > 0) {
      const noticeEl = document.querySelector('[data-notice-banner]');
      if (noticeEl) {
        noticeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    }
    if (eligibleNoticeCount > 0) {
      window.dispatchEvent(new CustomEvent('athar_restore_dismissed_notices'));
      return;
    }
    setParticipationToast('لا توجد تنبيهات مجتمع نشطة في الوقت الحالي');
    setTimeout(() => setParticipationToast(null), 3000);
  };

  const isTriggered = pullDistance >= PULL_THRESHOLD;
  const pullHeight = refreshing ? 50 : pullDistance > 0 ? Math.min(pullDistance, 56) : 0;
  const pullOpacity = refreshing ? 1 : pullDistance > 8 ? Math.min(1, pullDistance / 40) : 0;

  // Real dynamic campaign metrics (only used when displayedCampaign !== null)
  const effectiveCampaignTotal = displayedCampaign
    ? Math.max(campaignLiveTotal, Number(displayedCampaign.currentCount) || 0)
    : 0;
  const campaignTarget =
    displayedCampaign && displayedCampaign.totalTarget > 0
      ? displayedCampaign.totalTarget
      : 1;
  const isDisplayedCampaignCompleted = Boolean(
    displayedCampaign &&
      (displayedCampaign.status === 'completed' || effectiveCampaignTotal >= campaignTarget)
  );
  const campaignProgressPercent = displayedCampaign
    ? isDisplayedCampaignCompleted
      ? 100
      : Math.min(100, Math.max(0, Math.round((effectiveCampaignTotal / campaignTarget) * 100)))
    : 0;

  const isAdminOrMod =
    permissions.state === 'success' && Boolean(permissions.isOwner || permissions.isModerator);

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts;
    const q = searchQuery.toLowerCase().trim();
    return posts.filter((p) => {
      return (
        p.content?.toLowerCase().includes(q) ||
        p.authorName?.toLowerCase().includes(q)
      );
    });
  }, [posts, searchQuery]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="w-full max-w-lg mx-auto min-h-full bg-[#080B0C] text-[#F5F1E9] flex flex-col pb-24 animate-fadeIn relative"
      dir="rtl"
    >
      {/* 0. Pull-To-Refresh Indicator */}
      {(pullHeight > 0 || refreshing) && (
        <div
          className="overflow-hidden transition-all duration-200 ease-out flex items-center justify-center pointer-events-none bg-[#080B0C]"
          style={{
            height: `${pullHeight}px`,
            opacity: pullOpacity,
          }}
        >
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1A1712] border border-[#806039]/70 shadow-lg">
            <RefreshCw
              size={13}
              className={`text-[#E6B76B] ${refreshing ? 'animate-spin' : ''}`}
              style={!refreshing ? { transform: `rotate(${pullDistance * 4}deg)` } : undefined}
            />
            <span className="text-xs font-semibold text-[#F5F1E9]">
              {refreshing
                ? 'جارٍ تحديث جماعة...'
                : isTriggered
                ? 'أفلت لتحديث المنشورات'
                : 'اسحب للتحديث'}
            </span>
          </div>
        </div>
      )}

      {/* 1. GAMAA PREMIUM ISLAMIC HEADER (~108–120dp) */}
      <header className="relative overflow-hidden bg-[#080B0C] border-b border-[#3A3329]/80 px-3.5 pt-3.5 pb-3.5 min-h-[108px] flex flex-col justify-center select-none">
        {/* Subtle Mosque Architectural Silhouette Backdrop */}
        <img
          src={mosqueArtBg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-[0.17] pointer-events-none"
        />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#080B0C]/55 via-[#080B0C]/35 to-[#080B0C]/90" />

        {/* Subtle Islamic Geometric Gold Corner Ornaments */}
        <HeaderCornerOrnament className="absolute top-0 right-0 w-16 h-16 pointer-events-none -scale-x-100" />
        <HeaderCornerOrnament className="absolute top-0 left-0 w-16 h-16 pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between gap-2">
          {/* Leading Right Slot: Subtle Refresh Action */}
          <div className="w-[88px] flex items-center justify-start">
            <button
              type="button"
              onClick={reloadFeed}
              disabled={refreshing}
              aria-label="تحديث الخط الزمني"
              className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-[#B5ADA2] hover:text-[#E6B76B] hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin text-[#E6B76B]' : ''} />
            </button>
          </div>

          {/* Center Brand Lockup: "جماعة" + "معًا .. نحو أثر أعمق" */}
          <div className="flex-1 text-center">
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight bg-gradient-to-b from-[#F5E6B8] via-[#E6B76B] to-[#D4AF37] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(212,175,55,0.22)]">
              جماعة
            </h1>
            <p className="text-[12.5px] font-medium text-[#B5ADA2] mt-0.5 leading-snug">
              معًا .. نحو أثر أعمق
            </p>
          </div>

          {/* Trailing Left Slot: Search & Notifications */}
          <div className="w-[88px] flex items-center justify-end gap-0.5">
            <button
              type="button"
              onClick={() => setIsSearchOpen((prev) => !prev)}
              aria-label="البحث في جماعة"
              className={`min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                isSearchOpen
                  ? 'text-[#E6B76B] bg-[#1A1712]'
                  : 'text-[#B5ADA2] hover:text-[#F5F1E9] hover:bg-white/5'
              }`}
            >
              <Search size={19} />
            </button>

            <button
              type="button"
              onClick={handleHeaderBellClick}
              aria-label="تنبيهات المجتمع"
              className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-[#B5ADA2] hover:text-[#F5F1E9] hover:bg-white/5 active:scale-95 transition-all cursor-pointer relative"
            >
              <Bell size={19} />
              {eligibleNoticeCount > 0 && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#D4AF37] ring-2 ring-[#080B0C]" />
              )}
            </button>
          </div>
        </div>

        {/* Expandable Search Input */}
        {isSearchOpen && (
          <div className="relative z-10 mt-3 pt-2.5 border-t border-[#3A3329]/70 animate-fadeIn flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث في منشورات جماعة أو باسم الكاتب..."
                className="w-full bg-[#101416] border border-[#806039]/50 rounded-full py-2 pr-9 pl-8 text-xs text-[#F5F1E9] placeholder-[#B5ADA2]/70 focus:outline-none focus:border-[#D4AF37]"
                autoFocus
              />
              <Search size={14} className="absolute right-3.5 top-2.5 text-[#B5ADA2]" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="مسح البحث"
                  className="absolute left-2.5 top-2 text-[#B5ADA2] hover:text-[#F5F1E9] cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery('');
              }}
              className="text-xs font-medium text-[#B5ADA2] hover:text-[#E6B76B] px-1.5 min-h-[36px] cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        )}
      </header>

      {/* 2. DYNAMIC GLOBAL NOTICE — Strictly returns null (zero blank space) when none active */}
      <GlobalNoticeBanner
        currentSection="gamaa"
        onActiveCountChange={handleNoticeCountChange}
        onNavigateToCampaign={(campId) => {
          const idx = activeCampaigns.findIndex((c) => c.id === campId);
          if (idx !== -1) {
            setSelectedCampaignIndex(idx);
            if (!currentUser) {
              triggerAuthFlow();
            } else {
              setIsParticipateModalOpen(true);
            }
          } else {
            setIsCampaignsModalOpen(true);
          }
        }}
      />

      {/* 3. DYNAMIC TASBEEH CAMPAIGN CARD — Strictly rendered ONLY when an eligible active or session-completed campaign exists */}
      {displayedCampaign && (
        <section
          aria-label="حملة التسبيح الجماعية"
          className="px-3 pt-2.5 pb-0.5 animate-fadeIn"
        >
          <div className="relative overflow-hidden rounded-2xl bg-[#1A1712] border border-[#806039]/70 p-3.5 sm:p-4 shadow-[0_8px_24px_rgba(0,0,0,0.6)] text-right">
            {/* Atmospheric Sanctuary / Kaaba Golden Header Artwork on Trailing Left */}
            <img
              src={kaabaSanctuaryBg}
              alt=""
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-3/5 h-full object-cover object-center opacity-35 pointer-events-none"
            />
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-l from-[#1A1712] via-[#1A1712]/90 to-[#1A1712]/35" />

            <div className="relative z-10 space-y-2.5">
              {/* Campaign Title & Optional Multi-Campaign Switcher */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-[17px] font-semibold text-[#F5F1E9] leading-snug">
                    {displayedCampaign.title}
                  </h2>
                  <p className="text-[12px] text-[#E6B76B] font-medium mt-0.5 truncate">
                    {DHIKR_PRESET_DETAILS[displayedCampaign.targetDhikrPreset]?.label ||
                      displayedCampaign.description}
                  </p>
                </div>

                {activeCampaigns.length > 1 && currentActiveCampaign && (
                  <div className="flex items-center gap-0.5 bg-[#080B0C]/70 border border-[#806039]/50 rounded-full px-1.5 py-0.5 text-[11px] text-[#B5ADA2] shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedCampaignIndex((prev) =>
                          prev < activeCampaigns.length - 1 ? prev + 1 : 0
                        )
                      }
                      aria-label="الحملة التالية"
                      className="w-5 h-5 flex items-center justify-center hover:text-[#E6B76B] cursor-pointer"
                    >
                      <ChevronRight size={13} />
                    </button>
                    <span className="font-mono text-[10.5px]">
                      {selectedCampaignIndex + 1}/{activeCampaigns.length}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedCampaignIndex((prev) =>
                          prev > 0 ? prev - 1 : activeCampaigns.length - 1
                        )
                      }
                      aria-label="الحملة السابقة"
                      className="w-5 h-5 flex items-center justify-center hover:text-[#E6B76B] cursor-pointer"
                    >
                      <ChevronLeft size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* Horizontal Gold Progress Bar + Percentage */}
              <div className="flex items-center gap-2.5">
                <div className="flex-1 h-2.5 rounded-full bg-[#2A2319] border border-[#806039]/35 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-[#D4AF37] via-[#E6B76B] to-[#F5E6B8] transition-all duration-500 ease-out"
                    style={{ width: `${campaignProgressPercent}%` }}
                  />
                </div>
                <span className="font-mono tabular-nums text-xs font-bold text-[#E6B76B] shrink-0 min-w-[36px] text-left">
                  {campaignProgressPercent}%
                </span>
              </div>

              {/* Real Contributions & Participants / User Contribution Stats Row */}
              <div className="flex items-center justify-between gap-2 text-[12px] text-[#B5ADA2]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <TasbeehBeadsIcon className="w-4 h-4 text-[#D4AF37] shrink-0" />
                  <span className="font-mono tabular-nums font-bold text-[#F5F1E9]">
                    {effectiveCampaignTotal.toLocaleString('ar-EG')}
                  </span>
                  <span className="truncate">
                    / {campaignTarget.toLocaleString('ar-EG')} تسبيحة
                  </span>
                </div>

                {displayedCampaign.participantsCount && displayedCampaign.participantsCount > 0 ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <Users size={13} className="text-[#D4AF37]" />
                    <span className="font-mono tabular-nums font-semibold text-[#F5F1E9]">
                      {displayedCampaign.participantsCount.toLocaleString('ar-EG')}
                    </span>
                    <span>مشارك</span>
                  </div>
                ) : userCampaignContribution > 0 ? (
                  <div className="flex items-center gap-1 shrink-0 text-[#E6B76B]">
                    <Sparkles size={12} className="text-[#D4AF37]" />
                    <span>مساهمتك:</span>
                    <span className="font-mono tabular-nums font-bold">
                      {userCampaignContribution.toLocaleString('ar-EG')}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Primary Action CTA or Completed Presentation */}
              {isDisplayedCampaignCompleted ? (
                <div className="w-full min-h-[44px] px-5 py-2 rounded-full bg-gradient-to-l from-[#D4AF37]/25 to-[#806039]/25 border border-[#D4AF37]/70 text-[#E6B76B] font-bold text-[13.5px] flex items-center justify-center gap-2 select-none">
                  <CheckCircle2 size={16} className="text-[#D4AF37]" />
                  <span>تم اكتمال الحملة</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser) {
                      triggerAuthFlow();
                      return;
                    }
                    setIsParticipateModalOpen(true);
                  }}
                  className="w-full min-h-[44px] px-5 py-2 rounded-full bg-gradient-to-l from-[#E6B76B] via-[#D4AF37] to-[#C69C2E] text-[#080B0C] font-extrabold text-[13.5px] shadow-[0_4px_16px_rgba(212,175,55,0.3)] hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <TasbeehBeadsIcon className="w-4 h-4 text-[#080B0C]" />
                  <span>شارك بالتسبيح</span>
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 4. COMPACT 3-BUTTON COMMUNITY SHORTCUTS (~48dp height) */}
      <nav
        aria-label="اختصارات جماعة"
        className="px-3 pt-2.5 pb-2 grid grid-cols-3 gap-2 select-none"
      >
        {/* 1. المجموعات */}
        <button
          type="button"
          onClick={() => setActiveMainTab(activeMainTab === 'groups' ? 'timeline' : 'groups')}
          className={`min-h-[48px] px-2.5 py-2 rounded-xl flex items-center justify-center gap-1.5 text-[13px] font-semibold transition-all cursor-pointer active:scale-95 ${
            activeMainTab === 'groups'
              ? 'bg-[#1A1712] border border-[#D4AF37] text-[#E6B76B] shadow-[0_0_12px_rgba(212,175,55,0.16)]'
              : 'bg-[#101416] border border-[#3A3329] hover:border-[#806039] text-[#F5F1E9]'
          }`}
        >
          <Users size={16} className="text-[#D4AF37] shrink-0" />
          <span className="truncate">المجموعات</span>
        </button>

        {/* 2. الحملات */}
        <button
          type="button"
          onClick={() => setIsCampaignsModalOpen(true)}
          className="min-h-[48px] px-2.5 py-2 rounded-xl bg-[#101416] border border-[#3A3329] hover:border-[#806039] text-[#F5F1E9] flex items-center justify-center gap-1.5 text-[13px] font-semibold transition-all cursor-pointer active:scale-95"
        >
          <Megaphone size={16} className="text-[#D4AF37] -scale-x-100 shrink-0" />
          <span className="truncate">الحملات</span>
        </button>

        {/* 3. المزيد (Includes Admin Console inside sheet for owners/moderators) */}
        <button
          type="button"
          onClick={() => setIsMoreMenuOpen(true)}
          className="relative min-h-[48px] px-2.5 py-2 rounded-xl bg-[#101416] border border-[#3A3329] hover:border-[#806039] text-[#F5F1E9] flex items-center justify-center gap-1.5 text-[13px] font-semibold transition-all cursor-pointer active:scale-95"
        >
          <MoreHorizontal size={16} className="text-[#D4AF37] shrink-0" />
          <span className="truncate">المزيد</span>
          {isAdminOrMod && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shrink-0"
              aria-hidden="true"
            />
          )}
        </button>
      </nav>

      {/* "المزيد" Options Bottom Sheet */}
      {isMoreMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn"
          dir="rtl"
        >
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-[#080B0C] border-t sm:border border-[#806039]/60 p-5 space-y-3.5 text-right shadow-2xl">
            <div className="w-10 h-1 rounded-full bg-[#3A3329] mx-auto sm:hidden -mt-1" />

            <div className="flex items-center justify-between border-b border-[#3A3329] pb-3">
              <div>
                <h3 className="text-[15px] font-bold text-[#F5F1E9]">المزيد في جماعة</h3>
                <p className="text-[11.5px] text-[#B5ADA2]">خيارات المجتمع والإشراف</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(false)}
                aria-label="إغلاق"
                className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-full bg-[#101416] border border-[#3A3329] text-[#B5ADA2] hover:text-[#F5F1E9] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {/* Role-Gated Admin Console Entry (Per User Preference) */}
              {isAdminOrMod && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setIsAdminConsoleOpen(true);
                  }}
                  className="w-full min-h-[48px] text-right px-3.5 py-2.5 rounded-2xl bg-[#1A1712] border border-[#D4AF37]/60 hover:border-[#E6B76B] flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#251E12] border border-[#D4AF37]/40 flex items-center justify-center text-[#E6B76B]">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <span className="font-bold text-[#F5F1E9] block text-[13px]">
                        لوحة الإدارة والإشراف
                      </span>
                      <span className="text-[11px] text-[#E6B76B]">
                        إدارة المنشورات والحملات والتنبيهات
                      </span>
                    </div>
                  </div>
                  <ChevronLeft size={16} className="text-[#E6B76B]" />
                </button>
              )}

              {activeMainTab === 'groups' && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveMainTab('timeline');
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full min-h-[46px] text-right px-3.5 py-2.5 rounded-xl bg-[#101416] border border-[#3A3329] hover:border-[#806039] text-[#F5F1E9] flex items-center justify-between cursor-pointer"
                >
                  <span className="font-semibold">العودة إلى الخط الزمني العام</span>
                  <ChevronLeft size={15} className="text-[#D4AF37]" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  setIsCampaignsModalOpen(true);
                }}
                className="w-full min-h-[46px] text-right px-3.5 py-2.5 rounded-xl bg-[#101416] border border-[#3A3329] hover:border-[#806039] text-[#F5F1E9] flex items-center justify-between cursor-pointer"
              >
                <span className="font-semibold">سجل الحملات الجارية والمكتملة</span>
                <Megaphone size={15} className="text-[#D4AF37] -scale-x-100" />
              </button>

              <div className="p-3.5 rounded-2xl bg-[#101416] border border-[#3A3329] text-right space-y-1">
                <div className="flex items-center gap-1.5 text-[#E6B76B] font-bold">
                  <BookOpen size={14} />
                  <span>ميثاق مجتمع جماعة</span>
                </div>
                <p className="text-[11.5px] leading-relaxed text-[#B5ADA2]">
                  مساحة إيمانية مباركة للتواصي بالخير والذكر الطيب؛ نرجو الالتزام بالكلمة الطيبة وآداب الأخوة الإسلامية.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5 & 6. MAIN BODY: GROUPS TAB OR FACEBOOK-STYLE COMPOSER + SOCIAL TIMELINE */}
      {activeMainTab === 'groups' ? (
        <div className="px-3 pt-2">
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
        </div>
      ) : (
        <>
          {/* 5. FACEBOOK-STYLE POST COMPOSER (~56dp height, RTL leading avatar) */}
          <div className="bg-[#101416] border-y border-[#3A3329]/80 px-3.5 py-2.5 flex items-center gap-2.5">
            {/* Leading RTL User Avatar */}
            <button
              type="button"
              onClick={() => handleOpenComposer(false)}
              aria-label="حسابك في جماعة"
              className="w-10 h-10 rounded-full border border-[#806039]/80 bg-[#1A1712] flex items-center justify-center shrink-0 overflow-hidden shadow-inner cursor-pointer"
            >
              {userProfile.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-[#E6B76B] font-bold">
                  {(userProfile.displayName || 'أ').charAt(0)}
                </span>
              )}
            </button>

            {/* Input-like Rounded Pill + Trailing Gallery Trigger */}
            <div className="flex-1 min-h-[44px] rounded-full bg-[#171B1E] border border-[#3A3329] hover:border-[#806039] pl-1.5 pr-4 flex items-center justify-between transition-colors">
              <button
                type="button"
                onClick={() => handleOpenComposer(false)}
                className="flex-1 text-right py-2 text-[13.5px] text-[#B5ADA2] hover:text-[#F5F1E9] truncate cursor-pointer"
              >
                شارك الخير مع جماعة...
              </button>

              <button
                type="button"
                onClick={() => handleOpenComposer(true)}
                aria-label="إرفاق صورة"
                title="إرفاق صورة"
                className="min-w-[38px] min-h-[38px] rounded-full flex items-center justify-center text-[#B5ADA2] hover:text-[#E6B76B] hover:bg-white/5 transition-colors cursor-pointer shrink-0"
              >
                <ImageIcon size={18} />
              </button>
            </div>
          </div>

          {/* 6. SOCIAL TIMELINE STREAM */}
          <section aria-label="الخط الزمني لجماعة" className="flex-1 flex flex-col mt-1.5">
            {/* Concise Error State with Retry */}
            {errorMsg && (
              <div className="mx-3 my-2 p-3.5 rounded-2xl bg-[#1A1212] border border-red-500/35 text-red-200 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle size={16} className="shrink-0 text-red-400" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={reloadFeed}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-full bg-[#2A1818] border border-red-400/40 text-[#F5F1E9] font-semibold text-xs cursor-pointer hover:bg-red-900/50 shrink-0"
                >
                  إعادة المحاولة
                </button>
              </div>
            )}

            {/* Subtle Dark Skeleton Loading State */}
            {loading && (
              <div className="border-t border-[#3A3329]/70 divide-y divide-[#3A3329]/70 bg-[#101416]">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 space-y-3 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-full bg-[#1C2124]" />
                        <div className="space-y-1.5">
                          <div className="w-28 h-3.5 bg-[#1C2124] rounded-md" />
                          <div className="w-16 h-2.5 bg-[#181C1F] rounded-md" />
                        </div>
                      </div>
                      <div className="w-6 h-2 bg-[#181C1F] rounded-full" />
                    </div>
                    <div className="space-y-2 pt-1">
                      <div className="w-full h-3.5 bg-[#1C2124] rounded-md" />
                      <div className="w-4/5 h-3.5 bg-[#181C1F] rounded-md" />
                    </div>
                    <div className="pt-2 border-t border-[#3A3329]/40 grid grid-cols-3 gap-3">
                      <div className="h-5 bg-[#181C1F] rounded-lg" />
                      <div className="h-5 bg-[#181C1F] rounded-lg" />
                      <div className="h-5 bg-[#181C1F] rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty Timeline State (Matching Screenshot Visual Reference) */}
            {!loading && filteredPosts.length === 0 && !errorMsg && (
              <div className="bg-[#101416] border-y border-[#3A3329]/70 py-12 px-6 text-center space-y-3.5">
                <EmptyMosqueIllustration />
                <div className="space-y-1 max-w-xs mx-auto">
                  <h2 className="text-[16.5px] font-bold text-[#F5F1E9]">
                    {searchQuery ? 'لا توجد منشورات مطابقة للبحث' : 'لا توجد منشورات بعد'}
                  </h2>
                  <p className="text-[13px] text-[#B5ADA2] leading-relaxed">
                    {searchQuery
                      ? 'جرّب البحث بكلمات أخرى أو مسح نص البحث الحالي.'
                      : 'كن أول من يشارك الخير مع جماعة'}
                  </p>
                </div>

                {!searchQuery && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenComposer(false)}
                      className="min-h-[44px] px-7 py-2.5 rounded-full bg-gradient-to-l from-[#E6B76B] via-[#D4AF37] to-[#C69C2E] text-[#080B0C] font-extrabold text-[13px] shadow-[0_4px_14px_rgba(212,175,55,0.28)] hover:brightness-105 active:scale-95 transition-all inline-flex items-center justify-center cursor-pointer"
                    >
                      ابدأ النشر
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Continuous Social Timeline Posts */}
            {!loading && filteredPosts.length > 0 && (
              <div className="border-t border-[#3A3329]/75 bg-[#101416]">
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
        </>
      )}

      {/* 7. MODALS */}
      <GamaaPostComposerModal
        isOpen={isComposerOpen}
        initialOpenMediaPicker={openComposerWithMedia}
        onClose={() => {
          setIsComposerOpen(false);
          setOpenComposerWithMedia(false);
        }}
        onPostCreated={(postId, newPost) => {
          if (newPost) {
            setPosts((prev) => [newPost, ...prev.filter((p) => p.id !== postId)]);
          } else {
            GamaaCommunityService.fetchLatestPosts(30).then((fresh) => {
              if (fresh && fresh.length > 0) setPosts(fresh);
            });
          }
          setParticipationToast('تم نشر مشاركتك المباركة في جماعة وظهرت في الخط الزمني!');
          setTimeout(() => setParticipationToast(null), 3500);
        }}
        userProfile={userProfile}
      />

      <GamaaCommentsModal
        post={selectedPostForComments}
        isOpen={Boolean(selectedPostForComments)}
        onClose={() => setSelectedPostForComments(null)}
        canModerate={permissions.canDeletePosts}
        onCommentAdded={(postId) => {
          setPosts((prev) =>
            prev.map((p) =>
              p.id === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p
            )
          );
          setSelectedPostForComments((prev) =>
            prev && prev.id === postId
              ? { ...prev, commentsCount: (prev.commentsCount || 0) + 1 }
              : prev
          );
        }}
        onCommentDeleted={(postId) => {
          setPosts((prev) =>
            prev.map((p) =>
              p.id === postId
                ? { ...p, commentsCount: Math.max(0, (p.commentsCount || 1) - 1) }
                : p
            )
          );
          setSelectedPostForComments((prev) =>
            prev && prev.id === postId
              ? { ...prev, commentsCount: Math.max(0, (prev.commentsCount || 1) - 1) }
              : prev
          );
        }}
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

      <GamaaCampaignsModal
        isOpen={isCampaignsModalOpen}
        onClose={() => setIsCampaignsModalOpen(false)}
        canManageRecovery={Boolean(currentUser)}
        onOpenRecovery={() => setIsRecoveryModalOpen(true)}
        onSelectActiveCampaign={(selected) => {
          const idx = activeCampaigns.findIndex((c) => c.id === selected.id);
          if (idx !== -1) {
            setSelectedCampaignIndex(idx);
          }
          if (!currentUser) {
            triggerAuthFlow();
          } else {
            setIsParticipateModalOpen(true);
          }
        }}
      />

      <GamaaCampaignRecoveryModal
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
      />

      <GamaaCampaignParticipateModal
        isOpen={isParticipateModalOpen}
        campaign={currentActiveCampaign || displayedCampaign}
        onClose={() => setIsParticipateModalOpen(false)}
        onContributed={(_res, amt) => {
          const targetCamp = currentActiveCampaign || displayedCampaign;
          if (targetCamp && currentUser) {
            const updatedUserTotal = addUserCampaignContribution(
              currentUser.uid,
              targetCamp.id,
              amt
            );
            setUserCampaignContribution(updatedUserTotal);
          }
          if (targetCamp) {
            setCampaignLiveTotal((prev) => {
              const nextTotal = Math.max(prev, Number(targetCamp.currentCount) || 0) + amt;
              if (targetCamp.totalTarget > 0 && nextTotal >= targetCamp.totalTarget) {
                setSessionCompletedCampaign({
                  ...targetCamp,
                  currentCount: nextTotal,
                  status: 'completed',
                });
              }
              return nextTotal;
            });
          }
          setParticipationToast(
            `تقبل الله منك! تم تسجيل ${amt.toLocaleString('ar-EG')} تسبيحة في الحملة.`
          );
          setTimeout(() => {
            setParticipationToast(null);
          }, 4200);
        }}
      />

      {/* Ephemeral Toast */}
      {participationToast && (
        <div className="fixed bottom-20 left-4 right-4 z-40 max-w-sm mx-auto p-3.5 rounded-2xl bg-[#1A1712]/95 border border-[#D4AF37]/60 shadow-[0_10px_30px_rgba(0,0,0,0.85)] text-right flex items-center gap-3 text-xs text-[#F5F1E9] animate-fadeIn backdrop-blur-md">
          <div className="w-7 h-7 rounded-full bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 size={15} />
          </div>
          <span className="font-semibold flex-1 leading-relaxed">{participationToast}</span>
        </div>
      )}

      <GamaaAdminConsoleModal
        isOpen={isAdminConsoleOpen}
        onClose={() => setIsAdminConsoleOpen(false)}
        currentUserUid={currentUser?.uid || ''}
      />

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
            }, 4200);
          }}
        />
      )}
    </div>
  );
};
