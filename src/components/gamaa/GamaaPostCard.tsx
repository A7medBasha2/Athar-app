import React, { useState, useEffect, useRef } from 'react';
import { GamaaPost, GamaaReactionType } from '../../types';
import { GamaaCommunityService } from '../../services/gamaaCommunityService';
import {
  MessageSquare,
  Trash2,
  Share2,
  Sparkles,
  HeartHandshake,
  Check,
  ShieldCheck,
  Flag,
  MoreHorizontal,
  ThumbsUp,
  Copy,
  Pin,
} from 'lucide-react';
import { AuthService } from '../../services/authService';

interface GamaaPostCardProps {
  post: GamaaPost;
  onOpenComments: (post: GamaaPost) => void;
  onPostDeleted?: (postId: string) => void;
  onReportPost?: (post: GamaaPost) => void;
  canModerate?: boolean;
}

export function formatArabicTimeAgo(timestamp: any): string {
  if (!timestamp) return 'الآن';
  let date: Date;
  if (typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else {
    return 'الآن';
  }

  const now = new Date();
  const diffSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffSec < 60) return 'الآن';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin === 1) return 'منذ دقيقة';
  if (diffMin === 2) return 'منذ دقيقتين';
  if (diffMin <= 10) return `منذ ${diffMin} دقائق`;
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour === 1) return 'منذ ساعة';
  if (diffHour === 2) return 'منذ ساعتين';
  if (diffHour <= 10) return `منذ ${diffHour} ساعات`;
  if (diffHour < 24) return `منذ ${diffHour} ساعة`;

  const diffDays = Math.floor(diffHour / 24);
  if (diffDays === 1) return 'أمس';
  if (diffDays === 2) return 'منذ يومين';
  if (diffDays <= 10) return `منذ ${diffDays} أيام`;
  return `منذ ${diffDays} يوم`;
}

const MAX_COLLAPSED_CHARS = 280;

export const GamaaPostCard: React.FC<GamaaPostCardProps> = ({
  post,
  onOpenComments,
  onPostDeleted,
  onReportPost,
  canModerate = false,
}) => {
  const currentUid = AuthService.getCurrentUser()?.uid;
  const isAuthor = Boolean(currentUid && post.authorId === currentUid);
  const canDelete = isAuthor || canModerate;

  const [activeReaction, setActiveReaction] = useState<GamaaReactionType | null>(null);
  const [reactionCounts, setReactionCounts] = useState(post.reactionsCount);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [textCopied, setTextCopied] = useState(false);
  const [isPinnedLocal, setIsPinnedLocal] = useState<boolean>(Boolean((post as any).isPinned));
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef<boolean>(false);

  useEffect(() => {
    setReactionCounts(post.reactionsCount);
  }, [post.reactionsCount]);

  useEffect(() => {
    setIsPinnedLocal(Boolean((post as any).isPinned));
  }, [(post as any).isPinned]);

  useEffect(() => {
    if (!currentUid) {
      setActiveReaction(null);
      return;
    }
    const unsub = GamaaCommunityService.listenToUserReaction(post.id, currentUid, (type) => {
      setActiveReaction(type);
    });
    return () => unsub();
  }, [post.id, currentUid]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (isMenuOpen && menuRef.current && !menuRef.current.contains(target)) {
        setIsMenuOpen(false);
        setConfirmingDelete(false);
      }
      if (isReactionPickerOpen && pickerRef.current && !pickerRef.current.contains(target)) {
        setIsReactionPickerOpen(false);
      }
    };
    if (isMenuOpen || isReactionPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMenuOpen, isReactionPickerOpen]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleReactionPointerDown = () => {
    longPressTriggeredRef.current = false;
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setIsReactionPickerOpen(true);
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(15);
        }
      } catch {}
    }, 380);
  };

  const handleReactionPointerUpOrCancel = () => {
    clearLongPressTimer();
  };

  const handleToggleReaction = async (type: GamaaReactionType) => {
    setIsReactionPickerOpen(false);
    if (!currentUid) {
      window.dispatchEvent(new CustomEvent('athar_open_auth'));
      return;
    }

    const previousReaction = activeReaction;
    const prevCounts = { ...reactionCounts };

    if (previousReaction === type) {
      setActiveReaction(null);
      setReactionCounts((prev) => ({
        ...prev,
        [type]: Math.max(0, (prev[type] || 0) - 1),
      }));
    } else {
      setActiveReaction(type);
      setReactionCounts((prev) => {
        const updated = { ...prev };
        if (previousReaction) {
          updated[previousReaction] = Math.max(0, (updated[previousReaction] || 0) - 1);
        }
        updated[type] = (updated[type] || 0) + 1;
        return updated;
      });
    }

    try {
      await GamaaCommunityService.toggleReaction(post.id, currentUid, type);
    } catch {
      setActiveReaction(previousReaction);
      setReactionCounts(prevCounts);
    }
  };

  const handleQuickReactionClick = () => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    if (isReactionPickerOpen) {
      setIsReactionPickerOpen(false);
      return;
    }
    if (activeReaction) {
      handleToggleReaction(activeReaction);
    } else {
      handleToggleReaction('jazakallah');
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!canDelete || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await GamaaCommunityService.deletePost(post.id);
      setIsMenuOpen(false);
      setConfirmingDelete(false);
      if (onPostDeleted) onPostDeleted(post.id);
    } catch (err: any) {
      console.error('Delete error:', err);
      setDeleteError('تعذر حذف المشاركة حالياً');
      setIsDeleting(false);
    }
  };

  const handleTogglePin = async () => {
    if (!canModerate) return;
    const nextPinned = !isPinnedLocal;
    setIsPinnedLocal(nextPinned);
    setIsMenuOpen(false);
    try {
      await GamaaCommunityService.pinPost(post.id, nextPinned);
    } catch {
      setIsPinnedLocal(!nextPinned);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(post.content);
      setTextCopied(true);
      setIsMenuOpen(false);
      setTimeout(() => setTextCopied(false), 2000);
    } catch {}
  };

  const handleShare = async () => {
    try {
      const shareText = `«${post.content}»\n— ${post.authorName} عبر مجتمع جماعة (تطبيق أثر)`;
      if (navigator.share) {
        await navigator.share({
          title: 'مشاركة من مجتمع جماعة — أثر',
          text: shareText,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // User cancelled share sheet
    }
  };

  const totalReactions =
    (reactionCounts.jazakallah || 0) +
    (reactionCounts.barakallah || 0) +
    (reactionCounts.ameen || 0);

  const getReactionLabel = () => {
    if (!activeReaction) return 'أعجبني';
    if (activeReaction === 'jazakallah') return 'جزاك الله خيراً';
    if (activeReaction === 'barakallah') return 'بارك الله فيك';
    return 'آمين';
  };

  const isLongPost = (post.content || '').length > MAX_COLLAPSED_CHARS;
  const displayedContent =
    isLongPost && !isExpanded
      ? `${post.content.slice(0, MAX_COLLAPSED_CHARS).trimEnd()}...`
      : post.content;

  return (
    <article
      className="bg-[#101416] px-4 pt-3.5 pb-2 text-right relative border-b border-[#3A3329]/75 transition-colors"
      dir="rtl"
    >
      {/* Top Header: RTL Leading Avatar + Author/Level/Time + Trailing Menu */}
      <div className="flex items-start justify-between gap-2.5 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Circular Avatar (40px) */}
          <div className="w-10 h-10 rounded-full border border-[#806039]/80 bg-[#1A1712] flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
            {post.authorPhoto ? (
              <img
                src={post.authorPhoto}
                alt={post.authorName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[#E6B76B] font-bold text-sm">
                {(post.authorName || 'أ').charAt(0)}
              </span>
            )}
          </div>

          {/* Author Name, Level Badge & Relative Timestamp */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-[#F5F1E9] text-[14.5px] leading-snug truncate max-w-[175px]">
                {post.authorName}
              </span>
              <span className="bg-[#1A1712] text-[#E6B76B] border border-[#806039]/60 text-[11px] px-2 py-0.5 rounded-md font-medium shrink-0 leading-none">
                مستوى {post.authorLevel || 1}
              </span>
              {isPinnedLocal && (
                <span className="inline-flex items-center gap-0.5 text-[10.5px] text-[#D4AF37] font-medium shrink-0">
                  <Pin size={10} />
                  مثبت
                </span>
              )}
            </div>

            <div className="text-[11.5px] text-[#B5ADA2] flex items-center gap-1.5 mt-0.5">
              <span>{formatArabicTimeAgo(post.createdAt)}</span>
              {canModerate && !isAuthor && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#D4AF37] inline-flex items-center gap-0.5 text-[10.5px]">
                    <ShieldCheck size={11} /> إشراف
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Trailing Options Button (...) */}
        <div className="relative shrink-0 -mt-1 -ml-1.5" ref={menuRef}>
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen((prev) => !prev);
              setConfirmingDelete(false);
              setDeleteError(null);
            }}
            aria-label="خيارات المنشور"
            className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-[#B5ADA2] hover:text-[#F5F1E9] hover:bg-white/5 transition-colors cursor-pointer active:scale-95"
          >
            <MoreHorizontal size={18} />
          </button>

          {isMenuOpen && (
            <div className="absolute left-1 top-11 z-30 w-48 rounded-2xl bg-[#1A1712] border border-[#806039]/70 shadow-[0_10px_30px_rgba(0,0,0,0.85)] py-1.5 text-xs text-[#F5F1E9] animate-fadeIn">
              <button
                type="button"
                onClick={handleCopyText}
                className="w-full text-right px-3.5 py-2.5 hover:bg-white/5 text-[#F5F1E9] flex items-center gap-2.5 cursor-pointer transition-colors"
              >
                <Copy size={14} className="text-[#E6B76B]" />
                <span>{textCopied ? 'تم نسخ النص' : 'نسخ النص'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  handleShare();
                }}
                className="w-full text-right px-3.5 py-2.5 hover:bg-white/5 text-[#B5ADA2] hover:text-[#F5F1E9] flex items-center gap-2.5 cursor-pointer transition-colors"
              >
                <Share2 size={14} className="text-[#E6B76B]" />
                <span>مشاركة المنشور</span>
              </button>

              {canModerate && (
                <button
                  type="button"
                  onClick={handleTogglePin}
                  className="w-full text-right px-3.5 py-2.5 hover:bg-white/5 text-[#E6B76B] flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <Pin size={14} />
                  <span>{isPinnedLocal ? 'إلغاء تثبيت المنشور' : 'تثبيت المنشور'}</span>
                </button>
              )}

              {!isAuthor && onReportPost && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onReportPost(post);
                  }}
                  className="w-full text-right px-3.5 py-2.5 hover:bg-amber-950/30 text-amber-300 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <Flag size={14} className="text-amber-400" />
                  <span>إبلاغ عن محتوى</span>
                </button>
              )}

              {canDelete && (
                <div className="border-t border-[#3A3329] mt-1 pt-1">
                  {!confirmingDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(true)}
                      className="w-full text-right px-3.5 py-2.5 hover:bg-red-950/40 text-red-300 flex items-center gap-2.5 cursor-pointer transition-colors"
                    >
                      <Trash2 size={14} className="text-red-400" />
                      <span>حذف المشاركة</span>
                    </button>
                  ) : (
                    <div className="px-3 py-2 space-y-2">
                      <p className="text-[11px] text-red-200 font-semibold">
                        تأكيد حذف هذا المنشور؟
                      </p>
                      {deleteError && (
                        <p className="text-[10.5px] text-red-400">{deleteError}</p>
                      )}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleDeleteConfirmed}
                          disabled={isDeleting}
                          className="flex-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] cursor-pointer"
                        >
                          {isDeleting ? 'جارٍ الحذف...' : 'حذف'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDelete(false)}
                          disabled={isDeleting}
                          className="flex-1 py-1.5 rounded-lg bg-[#101416] border border-[#3A3329] text-[#B5ADA2] text-[11px] cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post Body Text (RTL, 14.5px) */}
      <div className="text-[#F5F1E9] text-[14.5px] leading-[1.75] whitespace-pre-line break-words py-1 select-text">
        {displayedContent}
        {isLongPost && (
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="mr-1.5 text-xs font-semibold text-[#E6B76B] hover:underline cursor-pointer"
          >
            {isExpanded ? 'عرض أقل' : 'عرض المزيد'}
          </button>
        )}
      </div>

      {/* Optional Post Media */}
      {post.mediaUrl && (
        <div className="rounded-xl overflow-hidden border border-[#3A3329]/70 my-2.5 max-h-80 w-full bg-[#080B0C]">
          <img
            src={post.mediaUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full max-h-80 object-cover"
          />
        </div>
      )}

      {/* Reaction & Comment Summary Row */}
      {(totalReactions > 0 || (post.commentsCount || 0) > 0) && (
        <div className="flex items-center justify-between text-[12px] text-[#B5ADA2] pt-2 pb-1.5 select-none">
          <div className="flex items-center gap-1.5">
            {totalReactions > 0 && (
              <>
                <div className="flex items-center -space-x-1 rtl:space-x-reverse">
                  <span className="w-[18px] h-[18px] rounded-full bg-[#2563EB] ring-1 ring-[#101416] text-white flex items-center justify-center text-[9.5px]">
                    👍
                  </span>
                  <span className="w-[18px] h-[18px] rounded-full bg-[#E11D48] ring-1 ring-[#101416] text-white flex items-center justify-center text-[9.5px]">
                    ❤️
                  </span>
                  <span className="w-[18px] h-[18px] rounded-full bg-[#D97706] ring-1 ring-[#101416] text-white flex items-center justify-center text-[9.5px]">
                    🤲
                  </span>
                </div>
                <span className="font-mono tabular-nums text-[#B5ADA2] font-medium text-xs">
                  {totalReactions.toLocaleString('ar-EG')}
                </span>
              </>
            )}
          </div>

          {(post.commentsCount || 0) > 0 && (
            <button
              type="button"
              onClick={() => onOpenComments(post)}
              className="text-xs text-[#B5ADA2] hover:text-[#E6B76B] transition-colors cursor-pointer"
            >
              <span className="font-mono tabular-nums">
                {(post.commentsCount || 0).toLocaleString('ar-EG')}
              </span>{' '}
              تعليق
            </button>
          )}
        </div>
      )}

      {/* 3-Action Row: أعجبني (Quick tap = default, Long press = spiritual picker) | تعليق | مشاركة */}
      <div
        ref={pickerRef}
        className="relative border-t border-[#3A3329]/60 pt-1 mt-1 flex items-center justify-between gap-1 select-none"
      >
        {/* Long-Press Spiritual Reaction Picker */}
        {isReactionPickerOpen && (
          <div className="absolute bottom-12 right-0 z-30 p-1.5 rounded-full bg-[#1A1712] border border-[#D4AF37]/60 shadow-[0_8px_28px_rgba(0,0,0,0.85)] flex items-center gap-1 animate-fadeIn">
            <button
              type="button"
              onClick={() => handleToggleReaction('jazakallah')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeReaction === 'jazakallah'
                  ? 'bg-[#D4AF37]/25 text-[#F5F1E9] border border-[#D4AF37]/50'
                  : 'hover:bg-[#D4AF37]/15 text-[#E6B76B]'
              }`}
            >
              <HeartHandshake size={14} className="text-[#D4AF37]" />
              <span>جزاك الله خيراً</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleReaction('barakallah')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeReaction === 'barakallah'
                  ? 'bg-[#D4AF37]/25 text-[#F5F1E9] border border-[#D4AF37]/50'
                  : 'hover:bg-[#D4AF37]/15 text-[#E6B76B]'
              }`}
            >
              <Sparkles size={14} className="text-[#D4AF37]" />
              <span>بارك الله فيك</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleReaction('ameen')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeReaction === 'ameen'
                  ? 'bg-[#D4AF37]/25 text-[#F5F1E9] border border-[#D4AF37]/50'
                  : 'hover:bg-[#D4AF37]/15 text-[#E6B76B]'
              }`}
            >
              <span className="text-xs leading-none">🤲</span>
              <span>آمين</span>
            </button>
          </div>
        )}

        {/* 1. Reaction Button */}
        <button
          type="button"
          onPointerDown={handleReactionPointerDown}
          onPointerUp={handleReactionPointerUpOrCancel}
          onPointerCancel={handleReactionPointerUpOrCancel}
          onPointerLeave={handleReactionPointerUpOrCancel}
          onClick={handleQuickReactionClick}
          onContextMenu={(e) => {
            e.preventDefault();
            clearLongPressTimer();
            setIsReactionPickerOpen((prev) => !prev);
          }}
          className={`flex-1 min-h-[44px] py-1.5 px-2 flex items-center justify-center gap-1.5 text-[13px] transition-all cursor-pointer rounded-xl hover:bg-white/[0.04] active:scale-95 touch-manipulation ${
            activeReaction
              ? 'text-[#E6B76B] font-bold'
              : 'text-[#B5ADA2] font-medium hover:text-[#F5F1E9]'
          }`}
          aria-label={getReactionLabel()}
          title="اضغط للتفاعل، أو اضغط مطولاً لاختيار الدعاء"
        >
          {activeReaction === 'ameen' ? (
            <span className="text-sm leading-none">🤲</span>
          ) : activeReaction === 'barakallah' ? (
            <Sparkles size={16} className="text-[#E6B76B]" />
          ) : (
            <ThumbsUp
              size={16}
              className={activeReaction ? 'fill-[#E6B76B] text-[#E6B76B]' : ''}
            />
          )}
          <span className="truncate">{getReactionLabel()}</span>
        </button>

        {/* 2. Comment Button */}
        <button
          type="button"
          onClick={() => onOpenComments(post)}
          className="flex-1 min-h-[44px] py-1.5 px-2 flex items-center justify-center gap-1.5 text-[13px] font-medium text-[#B5ADA2] hover:text-[#F5F1E9] transition-all cursor-pointer rounded-xl hover:bg-white/[0.04] active:scale-95 touch-manipulation"
          aria-label="التعليقات"
        >
          <MessageSquare size={16} />
          <span>تعليق</span>
        </button>

        {/* 3. Share Button */}
        <button
          type="button"
          onClick={handleShare}
          className="flex-1 min-h-[44px] py-1.5 px-2 flex items-center justify-center gap-1.5 text-[13px] font-medium text-[#B5ADA2] hover:text-[#F5F1E9] transition-all cursor-pointer rounded-xl hover:bg-white/[0.04] active:scale-95 touch-manipulation"
          aria-label="مشاركة"
        >
          {copied ? (
            <Check size={16} className="text-emerald-400" />
          ) : (
            <Share2 size={16} />
          )}
          <span>{copied ? 'تم النسخ' : 'مشاركة'}</span>
        </button>
      </div>
    </article>
  );
};
