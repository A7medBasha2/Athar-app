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
} from 'lucide-react';
import { auth } from '../../firebase';

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

export const GamaaPostCard: React.FC<GamaaPostCardProps> = ({
  post,
  onOpenComments,
  onPostDeleted,
  onReportPost,
  canModerate = false,
}) => {
  const currentUid = auth.currentUser?.uid;
  const isAuthor = currentUid && post.authorId === currentUid;
  const canDelete = isAuthor || canModerate;

  const [activeReaction, setActiveReaction] = useState<GamaaReactionType | null>(null);
  const [reactionCounts, setReactionCounts] = useState(post.reactionsCount);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReactionCounts(post.reactionsCount);
  }, [post.reactionsCount]);

  useEffect(() => {
    if (!currentUid) return;
    const unsub = GamaaCommunityService.listenToUserReaction(post.id, currentUid, (type) => {
      setActiveReaction(type);
    });
    return () => unsub();
  }, [post.id, currentUid]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
        setIsReactionPickerOpen(false);
      }
    };
    if (isMenuOpen || isReactionPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen, isReactionPickerOpen]);

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
        [type]: Math.max(0, prev[type] - 1),
      }));
    } else {
      setActiveReaction(type);
      setReactionCounts((prev) => {
        const updated = { ...prev };
        if (previousReaction) {
          updated[previousReaction] = Math.max(0, updated[previousReaction] - 1);
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

  const handleDelete = async () => {
    if (!canDelete || isDeleting) return;
    setIsMenuOpen(false);
    if (!window.confirm('هل أنت متأكد من حذف هذه المشاركة؟')) return;

    setIsDeleting(true);
    try {
      await GamaaCommunityService.deletePost(post.id);
      if (onPostDeleted) onPostDeleted(post.id);
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('تعذر حذف المشاركة حالياً');
      setIsDeleting(false);
    }
  };

  const handleShare = async () => {
    try {
      const shareText = `«${post.content}»\n— ${post.authorName} عبر مجتمع جماعة (تطبيق أثر)`;
      if (navigator.share) {
        await navigator.share({
          title: 'مشاركة من مجتمع أثر',
          text: shareText,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Ignore
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

  return (
    <article
      className="p-4 sm:p-5 transition-all duration-200 hover:bg-[#121312]/60 text-right relative border-b border-[#22201C] last:border-b-0"
      dir="rtl"
    >
      {/* Top Header: Author + Level Badge + Options Menu */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar with gold ring */}
          <div className="w-11 h-11 rounded-full border border-[#D8AF68]/60 bg-[#1A1813] flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
            {post.authorPhoto ? (
              <img
                src={post.authorPhoto}
                alt={post.authorName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[#E8CA8D] font-bold text-sm">
                {post.authorName.charAt(0) || 'أ'}
              </span>
            )}
          </div>

          {/* Author Name and Level Badge */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[#F2EEE6] text-[14.5px] truncate max-w-[170px]">
                {post.authorName}
              </span>
              <span className="bg-[#241F16] text-[#D8AF68] border border-[#D8AF68]/30 text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0">
                مستوى {post.authorLevel || 1}
              </span>
            </div>

            {/* Time meta */}
            <div className="text-[11.5px] text-[#8A8275] flex items-center gap-1.5 mt-0.5">
              <span>{formatArabicTimeAgo(post.createdAt)}</span>
              {canModerate && !isAuthor && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#D8AF68] flex items-center gap-0.5 text-[10.5px]">
                    <ShieldCheck size={11} /> إشراف
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Top-Left Options Menu Button (...) */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label="خيارات المشاركة"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#8A8275] hover:text-[#E8CA8D] hover:bg-white/5 transition-colors cursor-pointer active:scale-95"
          >
            <MoreHorizontal size={18} />
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute left-0 top-10 z-30 w-44 rounded-xl bg-[#181713] border border-[#D8AF68]/30 shadow-2xl py-1 text-xs text-[#EAE2D0] backdrop-blur-md animate-fadeIn">
              {canDelete && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full text-right px-3.5 py-2 hover:bg-red-950/40 text-red-300 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Trash2 size={14} className="text-red-400" />
                  <span>حذف المشاركة</span>
                </button>
              )}

              {!isAuthor && onReportPost && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onReportPost(post);
                  }}
                  className="w-full text-right px-3.5 py-2 hover:bg-amber-950/40 text-amber-300 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Flag size={14} className="text-amber-400" />
                  <span>إبلاغ عن محتوى</span>
                </button>
              )}

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  handleShare();
                }}
                className="w-full text-right px-3.5 py-2 hover:bg-white/5 text-[#B6ADA0] flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Share2 size={14} />
                <span>مشاركة الرابط</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Post Text Content */}
      <div className="text-[#EDE7DB] text-[14.5px] leading-[1.7] whitespace-pre-line break-words py-1.5 select-text tracking-wide">
        {post.content}
      </div>

      {/* Optional Post Media / Image */}
      {post.mediaUrl && (
        <div className="rounded-xl overflow-hidden border border-[#2A261F] my-2 max-h-72 w-full bg-[#141513]">
          <img
            src={post.mediaUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Reactions & Comments Counter Summary Row */}
      {(totalReactions > 0 || (post.commentsCount || 0) > 0) && (
        <div className="flex items-center justify-between text-xs text-[#8A8275] pt-2 pb-1 px-0.5 select-none">
          {/* Reaction icons stack & count */}
          <div className="flex items-center gap-1.5">
            {totalReactions > 0 && (
              <div className="flex items-center -space-x-1 rtl:space-x-reverse">
                <span className="w-5 h-5 rounded-full bg-blue-600/90 text-white flex items-center justify-center text-[10px] shadow-sm">
                  👍
                </span>
                <span className="w-5 h-5 rounded-full bg-rose-600/90 text-white flex items-center justify-center text-[10px] shadow-sm">
                  ❤️
                </span>
                <span className="w-5 h-5 rounded-full bg-amber-600/90 text-white flex items-center justify-center text-[10px] shadow-sm">
                  🤲
                </span>
              </div>
            )}
            <span className="font-mono tabular-nums text-[#B6ADA0] font-semibold text-xs">
              {totalReactions > 0 ? totalReactions.toLocaleString('ar-EG') : ''}
            </span>
          </div>

          {/* Comments count */}
          <div
            onClick={() => onOpenComments(post)}
            className="cursor-pointer hover:text-[#E8CA8D] transition-colors"
          >
            <span className="font-mono tabular-nums">
              {(post.commentsCount || 0).toLocaleString('ar-EG')}
            </span>{' '}
            تعليق
          </div>
        </div>
      )}

      {/* Concept D 3-Action Buttons Row: أعجبني | تعليق | مشاركة */}
      <div className="relative border-t border-[#1E1C18] pt-2 mt-1.5 flex items-center justify-around select-none">
        {/* Reaction Picker Popover */}
        {isReactionPickerOpen && (
          <div className="absolute bottom-12 right-2 z-30 p-1.5 rounded-full bg-[#181713] border border-[#D8AF68]/40 shadow-2xl flex items-center gap-2 backdrop-blur-md animate-fadeIn">
            <button
              onClick={() => handleToggleReaction('jazakallah')}
              className="px-2.5 py-1 rounded-full text-xs font-semibold hover:bg-[#D8AF68]/20 text-[#FFE89E] flex items-center gap-1 transition-all"
              title="جزاك الله خيراً"
            >
              <HeartHandshake size={14} className="text-[#D8AF68]" />
              <span>جزاك الله خيراً</span>
            </button>
            <button
              onClick={() => handleToggleReaction('barakallah')}
              className="px-2.5 py-1 rounded-full text-xs font-semibold hover:bg-[#D8AF68]/20 text-[#FFE89E] flex items-center gap-1 transition-all"
              title="بارك الله فيك"
            >
              <Sparkles size={14} className="text-[#D8AF68]" />
              <span>بارك الله فيك</span>
            </button>
            <button
              onClick={() => handleToggleReaction('ameen')}
              className="px-2.5 py-1 rounded-full text-xs font-semibold hover:bg-[#D8AF68]/20 text-[#FFE89E] flex items-center gap-1 transition-all"
              title="آمين"
            >
              <span className="text-xs">🤲</span>
              <span>آمين</span>
            </button>
          </div>
        )}

        {/* 1. Like / Spiritual Reaction Button */}
        <button
          onClick={() => {
            if (activeReaction) {
              handleToggleReaction(activeReaction);
            } else {
              handleToggleReaction('jazakallah');
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setIsReactionPickerOpen((prev) => !prev);
          }}
          className={`flex-1 py-2 flex items-center justify-center gap-2 text-xs font-medium transition-all cursor-pointer min-h-[44px] rounded-xl hover:bg-white/5 active:scale-95 ${
            activeReaction
              ? 'text-[#E8CA8D] font-bold'
              : 'text-[#A0988A] hover:text-[#E8CA8D]'
          }`}
          aria-label={getReactionLabel()}
        >
          {activeReaction === 'ameen' ? (
            <span className="text-sm">🤲</span>
          ) : activeReaction === 'barakallah' ? (
            <Sparkles size={16} className="text-[#E8CA8D]" />
          ) : (
            <ThumbsUp
              size={16}
              className={activeReaction ? 'fill-[#E8CA8D] text-[#E8CA8D]' : ''}
            />
          )}
          <span>{getReactionLabel()}</span>
        </button>

        {/* 2. Comment Button */}
        <button
          onClick={() => onOpenComments(post)}
          className="flex-1 py-2 flex items-center justify-center gap-2 text-xs font-medium text-[#A0988A] hover:text-[#E8CA8D] transition-all cursor-pointer min-h-[44px] rounded-xl hover:bg-white/5 active:scale-95"
          aria-label="التعليقات"
        >
          <MessageSquare size={16} />
          <span>تعليق</span>
        </button>

        {/* 3. Share Button */}
        <button
          onClick={handleShare}
          className="flex-1 py-2 flex items-center justify-center gap-2 text-xs font-medium text-[#A0988A] hover:text-[#E8CA8D] transition-all cursor-pointer min-h-[44px] rounded-xl hover:bg-white/5 active:scale-95"
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
