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

  // Real-time Firestore subscription to active/scheduled notices
  useEffect(() => {
    const unsubscribe = GamaaAdminService.listenToActiveNotices((notices) => {
      setCandidateNotices(notices);
    });
    return () => unsubscribe();
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
      className="relative z-40 w-full px-3 pt-2 pb-1 transition-all duration-300 animate-slideDown pointer-events-auto"
    >
      <div
        className={`w-full max-w-lg mx-auto bg-gradient-to-r from-[#17130A]/95 via-[#100D07]/95 to-[#17130A]/95 backdrop-blur-md rounded-2xl ${style.border} ${style.glow} p-2.5 sm:p-3 text-white flex flex-col gap-1.5 transition-all`}
      >
        <div className="flex items-center justify-between gap-2">
          {/* Notice Header & Badges */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-lg bg-[#C8A24A]/15 text-[#E6C66E] shrink-0">
              {currentNotice.priority === 'urgent' ? (
                <AlertCircle className="w-4 h-4 text-amber-400 animate-pulse" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
            </span>

            {currentNotice.title && (
              <span className="text-xs font-bold text-[#F3E5AB] truncate">
                {currentNotice.title}
              </span>
            )}

            {style.badgeText && (
              <span className={`text-[10px] font-semibold ${style.badgeColor}`}>
                • {style.badgeText}
              </span>
            )}

            {currentNotice.isPinned && (
              <span className="flex items-center text-[10px] text-[#C8A24A] shrink-0">
                <Pin className="w-2.5 h-2.5 ml-0.5" />
                مثبت
              </span>
            )}
          </div>

          {/* Pagination (if multiple) & Dismiss Action */}
          <div className="flex items-center gap-1 shrink-0">
            {activeNotices.length > 1 && (
              <div className="flex items-center text-[11px] text-[#C8A24A]/90 ml-1">
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition-transform text-[#E6C66E]"
                  aria-label="التالي"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="px-0.5 select-none font-sans text-[10px]">
                  {currentIndex + 1}/{activeNotices.length}
                </span>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition-transform text-[#E6C66E]"
                  aria-label="السابق"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 text-[#C8A24A] active:scale-90 transition-all"
              aria-label="إغلاق التنبيه للجلسة الحالية"
              title="إغلاق التنبيه"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notice Message Content */}
        <p className="text-xs text-[#EAE2D0]/95 leading-relaxed break-words px-0.5">
          {currentNotice.message}
        </p>

        {/* Optional Action / Campaign Link */}
        {currentNotice.targetCampaignId && (
          <div className="flex items-center justify-end pt-1">
            <button
              type="button"
              onClick={handleActionClick}
              className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-[#C8A24A]/20 hover:bg-[#C8A24A]/30 border border-[#C8A24A]/40 text-xs font-semibold text-[#F3E5AB] transition-colors active:scale-98"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>عرض حملة التسبيح</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
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
