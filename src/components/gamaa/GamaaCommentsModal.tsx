import React, { useState, useEffect, useRef } from 'react';
import { GamaaPost, GamaaComment } from '../../types';
import { GamaaCommunityService } from '../../services/gamaaCommunityService';
import { formatArabicTimeAgo } from './GamaaPostCard';
import { X, Send, Trash2, MessageSquare, AlertCircle, Sparkles } from 'lucide-react';
import { auth } from '../../firebase';

interface GamaaCommentsModalProps {
  post: GamaaPost | null;
  isOpen: boolean;
  onClose: () => void;
  canModerate?: boolean;
  userProfile?: {
    displayName?: string;
    photoURL?: string;
    level?: number;
  };
}

export const GamaaCommentsModal: React.FC<GamaaCommentsModalProps> = ({
  post,
  isOpen,
  onClose,
  canModerate = false,
  userProfile,
}) => {
  const [comments, setComments] = useState<GamaaComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const commentsEndRef = useRef<HTMLDivElement>(null);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!isOpen || !post) {
      setComments([]);
      setNewComment('');
      setErrorMsg(null);
      return;
    }

    setLoading(true);
    const unsub = GamaaCommunityService.listenToComments(
      post.id,
      (fetchedComments) => {
        setComments(fetchedComments);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to comments:', err);
        setErrorMsg('تعذر جلب التعليقات حالياً');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [isOpen, post?.id]);

  if (!isOpen || !post) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newComment.trim();
    if (!trimmed || isSubmitting) return;

    if (!currentUser) {
      window.dispatchEvent(new CustomEvent('athar_open_auth'));
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await GamaaCommunityService.addComment(post.id, trimmed, {
        uid: currentUser.uid,
        displayName: userProfile?.displayName || currentUser.displayName || 'فاعل خير',
        photoURL: userProfile?.photoURL || currentUser.photoURL || '',
        level: userProfile?.level || 1,
      });

      setNewComment('');
      // Scroll to bottom
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error('Add comment error:', err);
      setErrorMsg(err?.message || 'تعذر إضافة التعليق حالياً');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('هل تود حذف هذا التعليق؟')) return;
    try {
      await GamaaCommunityService.deleteComment(post.id, commentId);
    } catch (err) {
      console.error('Delete comment error:', err);
      alert('تعذر حذف التعليق');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-stretch sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
      dir="rtl"
    >
      <div className="w-full h-[100dvh] sm:h-[650px] sm:max-h-[88vh] sm:max-w-lg bg-[#0E0C09] border-0 sm:border sm:border-[#C8A24A]/40 rounded-none sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#C8A24A]/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1F1A10] border border-[#C8A24A]/40 flex items-center justify-center text-[#E6C66E] shadow-inner">
              <MessageSquare size={17} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white">التعليقات المباركة</h2>
              <p className="text-[10px] text-[#A69E89]">
                {comments.length} تعليق
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#171510] text-[#A69E89] hover:text-white transition-colors cursor-pointer"
          >
            <X size={19} />
          </button>
        </div>

        {/* Original Post Preview Snippet */}
        <div className="p-3 bg-[#13110C] border-b border-[#C8A24A]/15 shrink-0 text-right">
          <div className="text-[11px] text-[#D6B36A] font-bold mb-1">
            {post.authorName} · {formatArabicTimeAgo(post.createdAt)}
          </div>
          <p className="text-xs text-[#E6DEC9] line-clamp-2 leading-relaxed">
            {post.content}
          </p>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mx-4 mt-2 flex items-center gap-2 p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs shrink-0">
            <AlertCircle size={14} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Comments Scrollable Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {loading ? (
            <div className="py-12 text-center text-xs text-[#A69E89] animate-pulse">
              جارٍ تحميل التعليقات...
            </div>
          ) : comments.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#18150F] border border-[#C8A24A]/30 flex items-center justify-center text-[#E6C66E] mx-auto">
                <Sparkles size={20} />
              </div>
              <p className="text-xs font-bold text-white">لا توجد تعليقات بعد</p>
              <p className="text-[11px] text-[#8C826F]">كن أول من يترك أثراً طيباً وكلمة حسنة</p>
            </div>
          ) : (
            comments.map((comment) => {
              const isCommentAuthor = currentUser && comment.authorId === currentUser.uid;
              const canDeleteThisComment = isCommentAuthor || canModerate;

              return (
                <div
                  key={comment.id}
                  className="p-3 rounded-2xl bg-[#15130E] border border-[#C8A24A]/15 text-right space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full border border-[#D4AF37]/40 bg-[#1D1912] flex items-center justify-center overflow-hidden shrink-0">
                        {comment.authorPhoto ? (
                          <img
                            src={comment.authorPhoto}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-[#E6C66E] font-bold">
                            {comment.authorName.charAt(0)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-white">
                        {comment.authorName}
                      </span>
                      {comment.authorLevel && comment.authorLevel > 1 && (
                        <span className="text-[9.5px] text-[#D6B36A] font-semibold">
                          م {comment.authorLevel}
                        </span>
                      )}
                      <span className="text-[10px] text-[#8C826F]">
                        · {formatArabicTimeAgo(comment.createdAt)}
                      </span>
                    </div>

                    {canDeleteThisComment && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-[#8C826F] hover:text-red-400 p-1 transition-colors cursor-pointer"
                        title="حذف التعليق"
                        aria-label="حذف التعليق"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-[#EAE4D3] leading-relaxed pr-8 whitespace-pre-line break-words select-text">
                    {comment.content}
                  </p>
                </div>
              );
            })
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="p-3 bg-[#110F0A] border-t border-[#C8A24A]/20 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={
              currentUser ? 'اكتب تعليقاً طيباً...' : 'سجل الدخول للمشاركة بالتعليق...'
            }
            maxLength={300}
            disabled={isSubmitting}
            className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-[#191610] border border-[#C8A24A]/30 text-white placeholder-[#787163] text-sm focus:border-[#E6C66E] focus:outline-none transition-colors"
          />

          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            aria-label="إرسال التعليق"
            className={`min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center athar-btn-primary cursor-pointer ${
              !newComment.trim() || isSubmitting ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            <Send size={16} className="rotate-180" />
          </button>
        </form>
      </div>
    </div>
  );
};
