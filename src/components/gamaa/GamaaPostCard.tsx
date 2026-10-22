import React, { useState, useEffect } from 'react';
import { GamaaPost, GamaaReactionType } from '../../types';
import { GamaaCommunityService } from '../../services/gamaaCommunityService';
import { MessageSquare, Trash2, Share2, Sparkles, HeartHandshake, Check, ShieldCheck, Flag } from 'lucide-react';
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

  const handleToggleReaction = async (type: GamaaReactionType) => {
    if (!currentUid) {
      window.dispatchEvent(new CustomEvent('athar_open_auth'));
      return;
    }

    // Optimistic update
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
    } catch (err) {
      // Rollback on error
      setActiveReaction(previousReaction);
      setReactionCounts(prevCounts);
    }
  };

  const handleDelete = async () => {
    if (!canDelete || isDeleting) return;
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
      const shareText = `«${post.content}»\n— ${post.authorName} عبر تطبيق أثر`;
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

  return (
    <article
      className="p-4 sm:p-5 transition-all duration-200 hover:bg-[#16130E]/60 text-right relative group"
      dir="rtl"
    >
      {/* Top Header: Author + Meta + Delete */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar with gold ring */}
          <div className="w-10 h-10 rounded-full border border-[#D4AF37]/60 bg-[#1A160F] flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
            {post.authorPhoto ? (
              <img
                src={post.authorPhoto}
                alt={post.authorName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[#E6C66E] font-bold text-sm">
                {post.authorName.charAt(0) || 'أ'}
              </span>
            )}
          </div>

          {/* Author Name and Unboxed Metadata */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-[14.5px] truncate max-w-[170px]">
                {post.authorName}
              </span>
              {post.authorLevel && post.authorLevel > 1 && (
                <span className="text-[11px] text-[#D6B36A] font-medium flex items-center gap-0.5">
                  <Sparkles size={11} className="inline text-[#E6C66E]" />
                  المستوى {post.authorLevel}
                </span>
              )}
            </div>

            {/* Time meta */}
            <div className="text-[11.5px] text-[#9E9478] flex items-center gap-1.5 mt-0.5">
              <span>{formatArabicTimeAgo(post.createdAt)}</span>
              {canModerate && !isAuthor && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#E6C66E] flex items-center gap-0.5 text-[10.5px]">
                    <ShieldCheck size={11} /> إشراف
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Delete button (if owner or moderator) */}
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label="حذف المشاركة"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#8C826F] hover:text-red-400 hover:bg-red-950/20 active:scale-95 transition-all cursor-pointer touch-manipulation"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Post Text Content */}
      <div className="text-[#F2EBDD] text-[15px] leading-[1.7] whitespace-pre-line break-words py-1.5 select-text tracking-wide">
        {post.content}
      </div>

      {/* Action / Reaction Row */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-3 mt-2 border-t border-[#C8A24A]/10 select-none">
        {/* Islamic Spiritual Reactions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Reaction 1: Jazakallah Khayran */}
          <button
            onClick={() => handleToggleReaction('jazakallah')}
            className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation active:scale-95 ${
              activeReaction === 'jazakallah'
                ? 'bg-[#E6C66E]/20 border border-[#E6C66E] text-[#FFE89E] shadow-[0_0_12px_rgba(230,198,110,0.25)]'
                : 'bg-[#15130E] border border-[#C8A24A]/25 text-[#B6B0A3] hover:border-[#C8A24A]/60 hover:text-white'
            }`}
            title="جزاك الله خيراً"
          >
            <HeartHandshake size={15} className={activeReaction === 'jazakallah' ? 'text-[#E6C66E]' : ''} />
            <span className="text-[11.5px]">جزاك الله خيراً</span>
            {(reactionCounts.jazakallah || 0) > 0 && (
              <span className="text-[10.5px] font-mono tabular-nums text-[#D6B36A]">
                {reactionCounts.jazakallah}
              </span>
            )}
          </button>

          {/* Reaction 2: Barakallah Feek */}
          <button
            onClick={() => handleToggleReaction('barakallah')}
            className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation active:scale-95 ${
              activeReaction === 'barakallah'
                ? 'bg-[#E6C66E]/20 border border-[#E6C66E] text-[#FFE89E] shadow-[0_0_12px_rgba(230,198,110,0.25)]'
                : 'bg-[#15130E] border border-[#C8A24A]/25 text-[#B6B0A3] hover:border-[#C8A24A]/60 hover:text-white'
            }`}
            title="بارك الله فيك"
          >
            <Sparkles size={15} className={activeReaction === 'barakallah' ? 'text-[#E6C66E]' : ''} />
            <span className="text-[11.5px]">بارك الله فيك</span>
            {(reactionCounts.barakallah || 0) > 0 && (
              <span className="text-[10.5px] font-mono tabular-nums text-[#D6B36A]">
                {reactionCounts.barakallah}
              </span>
            )}
          </button>

          {/* Reaction 3: Ameen */}
          <button
            onClick={() => handleToggleReaction('ameen')}
            className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation active:scale-95 ${
              activeReaction === 'ameen'
                ? 'bg-[#E6C66E]/20 border border-[#E6C66E] text-[#FFE89E] shadow-[0_0_12px_rgba(230,198,110,0.25)]'
                : 'bg-[#15130E] border border-[#C8A24A]/25 text-[#B6B0A3] hover:border-[#C8A24A]/60 hover:text-white'
            }`}
            title="آمين"
          >
            <span className="text-xs">🤲</span>
            <span className="text-[11.5px]">آمين</span>
            {(reactionCounts.ameen || 0) > 0 && (
              <span className="text-[10.5px] font-mono tabular-nums text-[#D6B36A]">
                {reactionCounts.ameen}
              </span>
            )}
          </button>
        </div>

        {/* Right side: Comments trigger + Share */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onOpenComments(post)}
            className="min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-xl bg-[#15130E] border border-[#C8A24A]/25 text-[#B6B0A3] hover:text-[#E6C66E] hover:border-[#E6C66E]/50 flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation active:scale-95"
            aria-label="التعليقات"
          >
            <MessageSquare size={15} />
            <span className="text-[11.5px] font-mono tabular-nums">
              {post.commentsCount || 0}
            </span>
          </button>

          <button
            onClick={handleShare}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#15130E] border border-[#C8A24A]/25 text-[#B6B0A3] hover:text-[#E6C66E] hover:border-[#E6C66E]/50 transition-all cursor-pointer touch-manipulation active:scale-95"
            aria-label="مشاركة"
            title="مشاركة الفائدة"
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Share2 size={15} />}
          </button>

          {!isAuthor && onReportPost && (
            <button
              onClick={() => onReportPost(post)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#15130E] border border-[#C8A24A]/25 text-[#8C826F] hover:text-amber-400 hover:border-amber-400/50 transition-all cursor-pointer touch-manipulation active:scale-95"
              aria-label="إبلاغ عن محتوى مخالف"
              title="إبلاغ عن محتوى مخالف"
            >
              <Flag size={15} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
