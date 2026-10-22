import React, { useState, useEffect, useRef } from 'react';
import { GamaaPost } from '../types';
import { GamaaCommunityService } from '../services/gamaaCommunityService';
import { GamaaPostCard } from '../components/gamaa/GamaaPostCard';
import { GamaaPostComposerModal } from '../components/gamaa/GamaaPostComposerModal';
import { GamaaCommentsModal } from '../components/gamaa/GamaaCommentsModal';
import { GamaaCampaignRecoveryModal } from '../components/GamaaCampaignRecoveryModal';
import { GamaaCampaignParticipateModal } from '../components/gamaa/GamaaCampaignParticipateModal';
import {
  CommunityCampaign,
  CommunityCampaignService,
  DHIKR_PRESET_DETAILS,
} from '../services/communityCampaignService';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  Users,
  Sparkles,
  Plus,
  RefreshCw,
  Flame,
  ShieldCheck,
  AlertCircle,
  HeartHandshake,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';

interface GamaaCommunityViewProps {
  onOpenAuth?: () => void;
}

export const GamaaCommunityView: React.FC<GamaaCommunityViewProps> = ({ onOpenAuth }) => {
  const [posts, setPosts] = useState<GamaaPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState<boolean>(false);

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
  const [permissions, setPermissions] = useState<{
    isOwner: boolean;
    isModerator: boolean;
    canDeletePosts: boolean;
  }>({ isOwner: false, isModerator: false, canDeletePosts: false });

  const currentUser = auth.currentUser;

  // Load user profile & permissions
  useEffect(() => {
    if (!currentUser) {
      setUserProfile({});
      setPermissions({ isOwner: false, isModerator: false, canDeletePosts: false });
      return;
    }

    // Fetch user profile from /users/{uid}
    const loadProfile = async () => {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserProfile({
            displayName: data.displayName || currentUser.displayName || 'فاعل خير',
            photoURL: data.photoURL || currentUser.photoURL || '',
            level: data.level || 1,
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
    GamaaCommunityService.checkUserPermissions(currentUser.uid).then(setPermissions);
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
        console.error('[Gamaa] Feed error:', err);
        setErrorMsg('تعذر تحميل خلاصات جماعة، تحقق من الاتصال بالإنترنت.');
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsub();
  }, []);

  // Subscribe to real-time active campaigns
  useEffect(() => {
    const unsub = CommunityCampaignService.subscribeToActiveCampaigns((campaigns) => {
      setActiveCampaigns(campaigns);
    });
    return () => unsub();
  }, []);

  // Current active campaign (safely clamped to valid bounds)
  const currentCampaign =
    activeCampaigns.length > 0 && selectedCampaignIndex < activeCampaigns.length
      ? activeCampaigns[selectedCampaignIndex]
      : activeCampaigns[0] || null;

  // Subscribe to real-time 10-shard counter for the selected active campaign
  useEffect(() => {
    if (!currentCampaign) {
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
  }, [currentCampaign?.id]);

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

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="athar-page-container animate-fadeIn relative"
      dir="rtl"
    >
      {/* 0. Luxury Gold Pull-To-Refresh Indicator */}
      <div
        className="overflow-hidden transition-all duration-200 ease-out flex items-center justify-center pointer-events-none -mt-1 mb-2"
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

      {/* 1. Royal Mihrab Community Header */}
      <header className="athar-card-gold text-right relative overflow-hidden space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E6C66E] via-[#C8A24A] to-[#A6802B] p-0.5 shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#0E0D09] rounded-[14px] flex items-center justify-center text-[#E6C66E]">
                <Users size={24} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-white">مجتمع جَمَاعَة</h1>
                <span className="text-[10px] text-[#E6C66E] bg-[#1F1B12] px-2 py-0.5 rounded-full border border-[#D4AF37]/40 font-bold">
                  أثر الموحّد
                </span>
              </div>
              <p className="text-[11px] text-[#C4B998] mt-0.5">
                فضاء إسلامي خالص للتواصي بالحق والخير والتدبر النقي
              </p>
            </div>
          </div>

          {/* Refresh button */}
          <button
            onClick={reloadFeed}
            disabled={refreshing}
            aria-label="تحديث المنشورات"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#16130D] border border-[#C8A24A]/30 text-[#C4B998] hover:text-[#E6C66E] hover:border-[#E6C66E] transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw size={17} className={refreshing ? 'animate-spin text-[#E6C66E]' : ''} />
          </button>
        </div>

        {/* 2. Fast Navigation Gates & Reserved Campaign Banner */}
        <div className="flex items-center gap-2 pt-1 border-t border-[#C8A24A]/20 flex-wrap">
          {/* Campaigns Shortcut */}
          <button
            onClick={() => setIsCampaignsModalOpen(true)}
            className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-[#17140E] border border-[#D4AF37]/40 hover:border-[#E6C66E] text-xs font-bold text-[#FFE294] flex items-center gap-2 transition-all cursor-pointer active:scale-95 touch-manipulation"
          >
            <Flame size={15} className="text-[#E6C66E]" />
            <span>حملات جَمْع والتسبيح</span>
          </button>

          {/* Circles / Groups Indicator */}
          <div className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-[#13110C] border border-[#C8A24A]/25 text-xs text-[#A69E89] flex items-center gap-2">
            <BookOpen size={15} className="text-[#C8A24A]" />
            <span>المجموعات الحلقية</span>
          </div>

          {/* Admin Panel Button (ONLY if owner or moderator) */}
          {(permissions.isOwner || permissions.isModerator) && (
            <button
              onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
              className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-[#2A180E] border border-amber-500/40 text-xs font-bold text-amber-300 flex items-center gap-2 transition-all cursor-pointer mr-auto touch-manipulation active:scale-95"
            >
              <ShieldCheck size={15} />
              <span>لوحة الإشراف</span>
            </button>
          )}
        </div>

        {/* Conditional Moderator Panel Details */}
        {isAdminPanelOpen && (permissions.isOwner || permissions.isModerator) && (
          <div className="p-3 rounded-2xl bg-[#1F140D] border border-amber-500/40 text-xs text-amber-200 space-y-1.5 animate-fadeIn">
            <div className="flex items-center justify-between font-bold">
              <span>صلاحيات الإشراف المعتمدة:</span>
              <span className="text-[10px] text-amber-400 font-mono">
                {permissions.isOwner ? 'مالك النظام (Owner)' : 'مشرف معتمد (Moderator)'}
              </span>
            </div>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              صلاحيات الإشراف نشطة: يمكنك حذف المشاركات المخالفة عبر زر الحذف المتاح في كل منشور.
            </p>
          </div>
        )}
      </header>

      {/* 2. Real Campaign Area or Sleek Spiritual Fallback */}
      {currentCampaign ? (
        /* Real Active Campaign Card with Live 10-Shard Aggregation */
        <section
          className="athar-card text-right relative overflow-hidden bg-gradient-to-br from-[#1C170E] via-[#13100B] to-[#0D0B08] border border-[#D4AF37]/45 p-4 sm:p-5 space-y-3.5 shadow-[0_8px_30px_rgba(212,175,55,0.12)]"
          aria-label="حملة التسبيح المجتمعية النشطة"
        >
          {/* Top Status & Target Preset Bar */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2 h-2 rounded-full bg-[#E6C66E] shadow-[0_0_8px_#E6C66E] animate-pulse" />
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#241D12] border border-[#D4AF37]/40 text-[#FFE294]">
                  {currentCampaign.isOfficial ? 'حملة رسمية معتمدة' : 'حملة مجتمعية نشطة'}
                </span>
                <span className="text-[10px] text-[#A69E89] font-medium">
                  {DHIKR_PRESET_DETAILS[currentCampaign.targetDhikrPreset]?.label || 'ذكر مشترك'}
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-extrabold text-white leading-tight">
                {currentCampaign.title}
              </h2>

              <p className="text-xs text-[#C4B998] leading-relaxed line-clamp-2">
                {currentCampaign.description}
              </p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#271E10] to-[#151109] border border-[#D4AF37]/50 flex items-center justify-center text-[#E6C66E] shrink-0 shadow-inner">
              <Flame size={24} className="text-[#FFE294]" />
            </div>
          </div>

          {/* Live Progress Bar & Counter from Shards */}
          <div className="p-3 rounded-2xl bg-[#110E09]/90 border border-[#C8A24A]/25 space-y-2">
            <div className="flex items-baseline justify-between text-xs">
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm sm:text-base font-extrabold text-[#FFE294] font-mono">
                  {campaignLiveTotal.toLocaleString('ar-EG')}
                </span>
                <span className="text-[11px] text-[#8E8672]">
                  / {currentCampaign.totalTarget.toLocaleString('ar-EG')} تسبيحة
                </span>
              </div>
              <span className="text-xs font-bold text-[#E6C66E] font-mono">
                {Math.min(
                  100,
                  Math.max(
                    0,
                    Math.round(
                      (campaignLiveTotal /
                        (currentCampaign.totalTarget && currentCampaign.totalTarget > 0
                          ? currentCampaign.totalTarget
                          : 1)) *
                        100
                    )
                  )
                )}
                %
              </span>
            </div>

            {/* Progress track */}
            <div className="w-full h-2 rounded-full bg-[#1F1A12] overflow-hidden border border-[#C8A24A]/20">
              <div
                className="h-full bg-gradient-to-r from-[#D4AF37] to-[#FFE294] transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(230,198,110,0.4)]"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      Math.round(
                        (campaignLiveTotal /
                          (currentCampaign.totalTarget && currentCampaign.totalTarget > 0
                            ? currentCampaign.totalTarget
                            : 1)) *
                          100
                      )
                    )
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Action Row: Participate Button & Multi-campaign Switch Dots */}
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-[#C8A24A]/15 flex-wrap">
            {/* Multi-campaign Switch Dots */}
            {activeCampaigns.length > 1 ? (
              <div className="flex items-center gap-1.5" aria-label="التنقل بين الحملات النشطة">
                {activeCampaigns.map((camp, idx) => (
                  <button
                    key={camp.id}
                    onClick={() => setSelectedCampaignIndex(idx)}
                    aria-label={`الانتقال إلى حملة ${idx + 1}`}
                    className="min-h-[44px] min-w-[32px] flex items-center justify-center transition-all cursor-pointer touch-manipulation"
                  >
                    <span
                      className={`h-2 rounded-full transition-all duration-300 ${
                        idx === selectedCampaignIndex
                          ? 'w-6 bg-[#FFE294] shadow-[0_0_8px_#E6C66E]'
                          : 'w-2 bg-[#423722] hover:bg-[#C8A24A]/60'
                      }`}
                    />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-[#8E8672]">
                عدّاد حي موحد عبر شظايا السحاب
              </div>
            )}

            <div className="flex items-center gap-2 mr-auto">
              <button
                onClick={() => setIsCampaignsModalOpen(true)}
                className="min-h-[44px] px-3 py-1.5 rounded-xl bg-[#15120D] border border-[#C8A24A]/30 text-xs text-[#A69E89] hover:text-[#E6C66E] transition-all cursor-pointer touch-manipulation active:scale-95"
              >
                إدارة الحملات
              </button>

              <button
                onClick={() => setIsParticipateModalOpen(true)}
                className="min-h-[44px] px-5 py-1.5 rounded-xl bg-gradient-to-r from-[#E6C66E] via-[#D4AF37] to-[#A6802B] text-black font-extrabold text-xs shadow-md shadow-[#D4AF37]/30 hover:brightness-110 transition-all cursor-pointer active:scale-95 touch-manipulation flex items-center gap-1.5"
              >
                <Sparkles size={14} className="text-black" />
                <span>شارك الآن</span>
              </button>
            </div>
          </div>
        </section>
      ) : (
        /* Zero Active Campaigns: Elegant Spiritual Fallback Banner */
        <section
          className="athar-card text-right relative overflow-hidden bg-gradient-to-br from-[#1A160E] via-[#12100C] to-[#0D0B08] border border-[#D4AF37]/35 p-4 sm:p-5 space-y-3"
          aria-label="بانر حملات التسبيح المجتمعية"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E6C66E] shadow-[0_0_8px_#E6C66E]" />
                <h2 className="text-xs font-bold text-[#E6C66E] tracking-wide">
                  حملات الذكر والتسبيح المليونية المشتركة
                </h2>
              </div>
              <p className="font-quran text-lg text-white font-bold leading-relaxed pt-0.5">
                «يَدُ اللَّهِ مَعَ الْجَمَاعَةِ»
              </p>
              <p className="text-xs text-[#C4B998] leading-relaxed max-w-md">
                فضاء مخصص لجمع تسبيح واستغفار أمة الإسلام في أهداف إيمانية موحدة. لا توجد حملات نشطة حالياً، يمكنك استعراض الأرشيف أو استئناف الحملات المعلقة.
              </p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-[#221C11] border border-[#C8A24A]/40 flex items-center justify-center text-[#E6C66E] shrink-0 shadow-inner">
              <Flame size={24} />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-[#C8A24A]/15 text-[11px] text-[#8E8672]">
            <span>جاهزية الربط السحابي: محصّنة عبر شظايا Firestore</span>
            <button
              onClick={() => setIsCampaignsModalOpen(true)}
              className="min-h-[44px] px-2 text-[#E6C66E] hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer touch-manipulation active:scale-95"
            >
              <span>استعراض واستئناف الحملات</span>
              <span aria-hidden="true">←</span>
            </button>
          </div>
        </section>
      )}

      {/* 3. Post Composer Trigger Bar */}
      <div className="athar-card text-right flex items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full border border-[#D4AF37]/50 bg-[#1D1912] flex items-center justify-center overflow-hidden shrink-0">
            {userProfile.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs text-[#E6C66E] font-bold">
                {(userProfile.displayName || 'أ').charAt(0)}
              </span>
            )}
          </div>

          <button
            onClick={handleOpenComposer}
            className="flex-1 text-right py-2.5 px-3.5 rounded-xl bg-[#14120D] border border-[#C8A24A]/25 text-[#8E8672] hover:text-[#C4B998] hover:border-[#C8A24A]/50 text-xs transition-colors cursor-pointer truncate touch-manipulation min-h-[44px] flex items-center"
          >
            {currentUser ? 'شارك تدبراً، فائدة، أو دعاءً في جماعة...' : 'سجل الدخول للمشاركة في جماعة...'}
          </button>
        </div>

        <button
          onClick={handleOpenComposer}
          aria-label="مشاركة جديدة"
          className="athar-btn-primary min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center shrink-0 cursor-pointer touch-manipulation"
        >
          <Plus size={19} />
        </button>
      </div>

      {/* 4. Continuous Community Feed Container */}
      <section className="space-y-3" aria-label="الخط الزمني لجماعة">
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

        {/* Loading State Skeleton */}
        {loading && (
          <div className="athar-card p-0 overflow-hidden divide-y divide-[#C8A24A]/15 border border-[#C8A24A]/25 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1F1C15]" />
                  <div className="space-y-1.5 flex-1">
                    <div className="w-28 h-3.5 bg-[#1F1C15] rounded" />
                    <div className="w-16 h-2.5 bg-[#1F1C15] rounded" />
                  </div>
                </div>
                <div className="w-full h-10 bg-[#1F1C15] rounded-xl" />
                <div className="w-1/3 h-4 bg-[#1F1C15] rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && posts.length === 0 && !errorMsg && (
          <div className="athar-card py-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#1A160F] border border-[#C8A24A]/40 flex items-center justify-center text-[#E6C66E] mx-auto shadow-inner">
              <HeartHandshake size={32} />
            </div>
            <div className="space-y-1.5 max-w-xs mx-auto">
              <h2 className="text-base font-extrabold text-white">لا توجد مشاركات بعد</h2>
              <p className="text-xs text-[#8C826F] leading-relaxed">
                كن المبادر بنشر أول فائدة أو تدبر قرآني، واكسب أجر الدلالة على الخير.
              </p>
            </div>
            <button
              onClick={handleOpenComposer}
              className="athar-btn-primary text-xs px-5 py-2.5 inline-flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px]"
            >
              <Plus size={16} />
              <span>اكتب أول مشاركة</span>
            </button>
          </div>
        )}

        {/* Unified Continuous Stream Container */}
        {!loading && posts.length > 0 && (
          <div className="athar-card p-0 overflow-hidden divide-y divide-[#C8A24A]/15 border border-[#C8A24A]/25 bg-[#100E0A]/95 shadow-2xl">
            {posts.map((post) => (
              <GamaaPostCard
                key={post.id}
                post={post}
                onOpenComments={(p) => setSelectedPostForComments(p)}
                onPostDeleted={(deletedId) => {
                  setPosts((prev) => prev.filter((p) => p.id !== deletedId));
                }}
                canModerate={permissions.canDeletePosts}
              />
            ))}
          </div>
        )}
      </section>

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
    </div>
  );
};
