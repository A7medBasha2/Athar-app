import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Pin,
  Megaphone,
} from 'lucide-react';
import {
  GamaaAdminService,
  GlobalNotice,
  NoticePriority,
} from '../services/gamaaAdminService';
import { AuthService } from '../services/authService';

interface GlobalNoticeBannerProps {
  currentSection: string;
  onNavigateToCampaign?: (campaignId: string) => void;
  onActiveCountChange?: (visibleCount: number, totalEligibleCount: number) => void;
}

const SESSION_DISMISSED_KEY = 'athar_session_dismissed_notices';

function getSessionDismissedIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_DISMISSED_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
}

function saveSessionDismissedId(id: string) {
  try {
    const set = getSessionDismissedIds();
    set.add(id);
    sessionStorage.setItem(SESSION_DISMISSED_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

function clearSessionDismissedIds() {
  try {
    sessionStorage.removeItem(SESSION_DISMISSED_KEY);
  } catch {}
}

export const GlobalNoticeBanner: React.FC<GlobalNoticeBannerProps> = ({
  currentSection,
  onNavigateToCampaign,
  onActiveCountChange,
}) => {
  const [candidateNotices, setCandidateNotices] = useState<GlobalNotice[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(getSessionDismissedIds);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Real-time subscription to active/scheduled notices
  useEffect(() => {
    let activeUnsub: (() => void) | null = null;

    const attachNoticesListener = () => {
      if (activeUnsub) {
        activeUnsub();
        activeUnsub = null;
      }
      activeUnsub = GamaaAdminService.listenToActiveNotices((notices) => {
        setCandidateNotices(notices || []);
      });
    };

    attachNoticesListener();

    const authUnsub = AuthService.subscribeToAuthState(() => {
      attachNoticesListener();
    });

    const handleRestoreDismissed = () => {
      clearSessionDismissedIds();
      setDismissedIds(new Set());
    };

    window.addEventListener('athar_restore_dismissed_notices', handleRestoreDismissed);

    return () => {
      if (activeUnsub) activeUnsub();
      authUnsub();
      window.removeEventListener('athar_restore_dismissed_notices', handleRestoreDismissed);
    };
  }, []);

  // Eligible notices before dismissal check (for header bell indicator)
  const eligibleNotices = useMemo(() => {
    const now = Date.now();
    const live = candidateNotices.filter((notice) =>
      GamaaAdminService.isNoticeActiveNow(notice, now)
    );
    const scoped = GamaaAdminService.filterNoticesForScope(live, currentSection);
    return GamaaAdminService.sortNoticesByPriority(scoped);
  }, [candidateNotices, currentSection]);

  // Visible notices after session dismissal filter
  const activeNotices = useMemo(() => {
    return eligibleNotices.filter((notice) => !dismissedIds.has(notice.id));
  }, [eligibleNotices, dismissedIds]);

  useEffect(() => {
    if (onActiveCountChange) {
      onActiveCountChange(activeNotices.length, eligibleNotices.length);
    }
  }, [activeNotices.length, eligibleNotices.length, onActiveCountChange]);

  useEffect(() => {
    if (currentIndex >= activeNotices.length) {
      setCurrentIndex(Math.max(0, activeNotices.length - 1));
    }
    setIsExpanded(false);
  }, [activeNotices.length, currentIndex]);

  // Strictly hide completely with zero vertical space when no active notice exists
  if (activeNotices.length === 0) {
    return null;
  }

  const currentNotice = activeNotices[currentIndex] || activeNotices[0];

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    saveSessionDismissedId(currentNotice.id);
    setDismissedIds((prev) => new Set([...prev, currentNotice.id]));
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : activeNotices.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < activeNotices.length - 1 ? prev + 1 : 0));
  };

  const handleDetailsClick = () => {
    if (currentNotice.targetCampaignId && onNavigateToCampaign) {
      onNavigateToCampaign(currentNotice.targetCampaignId);
      return;
    }
    setIsExpanded((prev) => !prev);
  };

  const getPriorityAccent = (priority: NoticePriority) => {
    switch (priority) {
      case 'urgent':
        return {
          border: 'border-[#D4AF37]/80',
          badgeText: 'هام وعاجل',
        };
      case 'high':
        return {
          border: 'border-[#D4AF37]/60',
          badgeText: 'تنويه مميز',
        };
      default:
        return {
          border: 'border-[#806039]/65',
          badgeText: '',
        };
    }
  };

  const accent = getPriorityAccent(currentNotice.priority);
  const isGamaaSection = currentSection === 'gamaa';
  const hasLongMessage = (currentNotice.message || '').length > 85;
  const showDetailsCta = Boolean(currentNotice.targetCampaignId) || hasLongMessage;

  return (
    <div
      dir="rtl"
      data-notice-banner
      className={`relative z-30 w-full transition-all duration-200 animate-fadeIn pointer-events-auto ${
        isGamaaSection ? 'px-3 pt-2.5 pb-0.5' : 'px-3 pt-2 pb-1'
      }`}
    >
      <div
        className={`w-full bg-[#1A1712] border ${accent.border} rounded-2xl p-3 sm:p-3.5 text-[#F5F1E9] relative overflow-hidden shadow-[0_6px_22px_rgba(0,0,0,0.6)]`}
      >
        {/* Subtle warm gold corner sheen */}
        <div className="absolute inset-y-0 right-0 w-24 pointer-events-none opacity-[0.07] bg-gradient-to-l from-[#D4AF37] to-transparent" />

        <div className="relative z-10 flex items-start gap-3">
          {/* Leading RTL Announcement / Megaphone Icon */}
          <div className="w-10 h-10 rounded-xl bg-[#241E14] border border-[#806039]/60 flex items-center justify-center text-[#E6B76B] shrink-0 mt-0.5 shadow-inner">
            <Megaphone className="w-5 h-5 -scale-x-100" />
          </div>

          {/* Notice Title, Message & Action */}
          <div className="flex-1 min-w-0 text-right">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0 pt-0.5">
                <span className="text-[13.5px] font-bold text-[#F5F1E9] leading-snug">
                  {currentNotice.title
                    ? `تنبيه المجتمع — ${currentNotice.title}`
                    : 'تنبيه المجتمع'}
                </span>
                {accent.badgeText && (
                  <span className="text-[10.5px] text-[#E6B76B] font-semibold">
                    · {accent.badgeText}
                  </span>
                )}
                {currentNotice.isPinned && (
                  <span className="inline-flex items-center text-[10.5px] text-[#B5ADA2] shrink-0">
                    <Pin className="w-2.5 h-2.5 ml-0.5 text-[#D4AF37]" />
                    مثبت
                  </span>
                )}
              </div>

              {/* Dismiss button */}
              <button
                type="button"
                onClick={handleDismiss}
                className="min-w-[36px] min-h-[36px] -mt-1.5 -ml-1.5 flex items-center justify-center rounded-full text-[#B5ADA2] hover:text-[#F5F1E9] hover:bg-white/5 active:scale-90 transition-all shrink-0 cursor-pointer"
                aria-label="إغلاق التنبيه"
                title="إغلاق التنبيه"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p
              className={`text-[12.5px] text-[#B5ADA2] leading-relaxed break-words mt-0.5 ${
                isExpanded ? '' : 'line-clamp-2'
              }`}
            >
              {currentNotice.message}
            </p>

            {/* Bottom Action Bar */}
            {(showDetailsCta || activeNotices.length > 1) && (
              <div className="flex items-center justify-between gap-2 mt-2.5">
                {showDetailsCta ? (
                  <button
                    type="button"
                    onClick={handleDetailsClick}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[34px] px-4 py-1 rounded-full bg-gradient-to-l from-[#E6B76B] to-[#D4AF37] text-[#080B0C] text-xs font-extrabold shadow-[0_2px_10px_rgba(212,175,55,0.28)] hover:brightness-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>
                      {currentNotice.targetCampaignId
                        ? 'عرض التفاصيل'
                        : isExpanded
                        ? 'إخفاء التفاصيل'
                        : 'عرض التفاصيل'}
                    </span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-1.5">
                  {activeNotices.length > 1 && (
                    <div className="flex items-center text-[11px] text-[#B5ADA2]">
                      <button
                        type="button"
                        onClick={handleNext}
                        className="w-7 h-7 flex items-center justify-center rounded-full hover:text-[#E6B76B] transition-colors cursor-pointer"
                        aria-label="التالي"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-1 select-none font-mono text-[10.5px]">
                        {currentIndex + 1}/{activeNotices.length}
                      </span>
                      <button
                        type="button"
                        onClick={handlePrev}
                        className="w-7 h-7 flex items-center justify-center rounded-full hover:text-[#E6B76B] transition-colors cursor-pointer"
                        aria-label="السابق"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {currentNotice.targetCampaignId && (
                    <button
                      type="button"
                      onClick={handleDetailsClick}
                      aria-label="انتقال للتفاصيل"
                      className="w-7 h-7 flex items-center justify-center rounded-full text-[#E6B76B] hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
