import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  X,
  ChevronLeft,
  ChevronRight,
  Flame,
  AlertCircle,
  Pin,
  ExternalLink,
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

export const GlobalNoticeBanner: React.FC<GlobalNoticeBannerProps> = ({
  currentSection,
  onNavigateToCampaign,
}) => {
  const [candidateNotices, setCandidateNotices] = useState<GlobalNotice[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(getSessionDismissedIds);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Real-time Firestore subscription to active/scheduled notices when authenticated
  useEffect(() => {
    let activeUnsub: (() => void) | null = null;
    const authUnsub = AuthService.subscribeToAuthState((user) => {
      if (activeUnsub) {
        activeUnsub();
        activeUnsub = null;
      }
      if (user) {
        activeUnsub = GamaaAdminService.listenToActiveNotices((notices) => {
          setCandidateNotices(notices);
        });
      } else {
        setCandidateNotices([]);
      }
    });

    return () => {
      if (activeUnsub) activeUnsub();
      authUnsub();
    };
  }, []);

  // Filter & prioritize notices for current section and current time
  const activeNotices = useMemo(() => {
    const now = Date.now();
    const live = candidateNotices.filter((notice) => {
      // 1. Check schedule
      if (!GamaaAdminService.isNoticeActiveNow(notice, now)) return false;
      // 2. Check session dismissal
      if (dismissedIds.has(notice.id)) return false;
      return true;
    });

    // 3. Filter by scope
    const scoped = GamaaAdminService.filterNoticesForScope(live, currentSection);

    // 4. Sort deterministically
    return GamaaAdminService.sortNoticesByPriority(scoped);
  }, [candidateNotices, currentSection, dismissedIds]);

  // Ensure currentIndex stays within bounds
  useEffect(() => {
    if (currentIndex >= activeNotices.length) {
      setCurrentIndex(Math.max(0, activeNotices.length - 1));
    }
  }, [activeNotices.length, currentIndex]);

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

  const handleActionClick = () => {
    if (!currentNotice.targetCampaignId) return;
    if (onNavigateToCampaign) {
      onNavigateToCampaign(currentNotice.targetCampaignId);
    }
  };

  const getPriorityStyle = (priority: NoticePriority) => {
    switch (priority) {
      case 'urgent':
        return {
          border: 'border-amber-500/80',
          glow: 'shadow-[0_4px_25px_rgba(217,119,6,0.35)]',
          badgeText: 'هام وعاجل',
          badgeColor: 'text-amber-400',
        };
      case 'high':
        return {
          border: 'border-[#D4AF37]/70',
          glow: 'shadow-[0_4px_20px_rgba(212,175,55,0.25)]',
          badgeText: 'تنويه مميز',
          badgeColor: 'text-[#E6C66E]',
        };
      default:
        return {
          border: 'border-[#C8A24A]/40',
          glow: 'shadow-[0_4px_16px_rgba(0,0,0,0.8)]',
          badgeText: '',
          badgeColor: 'text-[#D4AF37]',
        };
    }
  };

  const style = getPriorityStyle(currentNotice.priority);

  return (
    <div
      dir="rtl"
      className="relative z-40 w-full pt-1 pb-2 transition-all duration-300 animate-slideDown pointer-events-auto"
    >
      <div
        className="w-full bg-[#121312] border border-[#9E7B48]/35 rounded-2xl p-3 sm:p-3.5 text-white flex flex-col gap-2 relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
      >
        {/* Subtle geometric lineart watermark on side */}
        <div className="absolute top-0 left-0 w-24 h-full pointer-events-none opacity-5 bg-gradient-to-r from-[#D8AF68] to-transparent" />

        <div className="flex items-start justify-between gap-3 relative z-10">
          {/* Notice Header & Content */}
          <div className="flex-1 min-w-0 space-y-1 text-right">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-[#E8CA8D]">
                {currentNotice.title
                  ? `تنبيه المجتمع — ${currentNotice.title}`
                  : 'تنبيه المجتمع'}
              </span>
              {style.badgeText && (
                <span className="text-[10px] text-amber-400/90 font-medium">
                  · {style.badgeText}
                </span>
              )}
              {currentNotice.isPinned && (
                <span className="flex items-center text-[10px] text-[#A69E89] shrink-0">
                  <Pin className="w-2.5 h-2.5 ml-0.5 text-[#D8AF68]" />
                  مثبت
                </span>
              )}
            </div>

            <p className="text-xs text-[#B6ADA0] leading-relaxed break-words line-clamp-2">
              {currentNotice.message}
            </p>
          </div>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="w-7 h-7 flex items-center justify-center rounded-full text-[#8A8275] hover:text-[#E8CA8D] hover:bg-white/5 active:scale-90 transition-all shrink-0 -mt-0.5 -mr-0.5"
            aria-label="إغلاق التنبيه للجلسة الحالية"
            title="إغلاق التنبيه"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Footer Actions: Pagination & Details Link */}
        <div className="flex items-center justify-between pt-2 border-t border-[#262420]/80 relative z-10">
          {activeNotices.length > 1 ? (
            <div className="flex items-center text-[11px] text-[#8A8275]">
              <button
                type="button"
                onClick={handleNext}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:text-[#E8CA8D] transition-colors"
                aria-label="التالي"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <span className="px-1 select-none font-mono text-[10px]">
                {currentIndex + 1}/{activeNotices.length}
              </span>
              <button
                type="button"
                onClick={handlePrev}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:text-[#E8CA8D] transition-colors"
                aria-label="السابق"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div />
          )}

          {currentNotice.targetCampaignId ? (
            <button
              type="button"
              onClick={handleActionClick}
              className="inline-flex items-center gap-1.5 py-1 px-3.5 rounded-full border border-[#D8AF68] bg-[#171612] hover:bg-[#D8AF68]/15 text-xs font-semibold text-[#E8CA8D] transition-all active:scale-95 cursor-pointer"
            >
              <span>عرض التفاصيل</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDismiss}
              className="py-1 px-3 rounded-full border border-[#9E7B48]/40 hover:border-[#D8AF68] text-[11px] text-[#8A8275] hover:text-[#E8CA8D] transition-colors cursor-pointer"
            >
              حسناً
            </button>
          )}
        </div>
      </div>

      {/* Ephemeral Feedback Toast */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#17130A] border border-[#C8A24A] px-4 py-2 rounded-xl text-xs font-bold text-[#F3E5AB] shadow-2xl">
          {toastMessage}
        </div>
      )}
    </div>
  );
};
