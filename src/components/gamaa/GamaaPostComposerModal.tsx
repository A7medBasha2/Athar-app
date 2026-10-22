import React, { useState, useEffect } from 'react';
import { GamaaCommunityService } from '../../services/gamaaCommunityService';
import { X, Send, Sparkles, AlertCircle, Clock } from 'lucide-react';
import { auth } from '../../firebase';

interface GamaaPostComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: (postId: string) => void;
  userProfile?: {
    displayName?: string;
    photoURL?: string;
    level?: number;
  };
}

export const GamaaPostComposerModal: React.FC<GamaaPostComposerModalProps> = ({
  isOpen,
  onClose,
  onPostCreated,
  userProfile,
}) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [remainingCooldown, setRemainingCooldown] = useState<number>(0);

  const currentUser = auth.currentUser;
  const MAX_LENGTH = 600;
  const MIN_LENGTH = 3;

  useEffect(() => {
    if (!isOpen) {
      setContent('');
      setErrorMsg(null);
      return;
    }

    if (!currentUser) {
      setErrorMsg('يجب تسجيل الدخول أولاً لتتمكن من مشاركة التدوينات في جماعة.');
      return;
    }

    // Check rate limit on open
    GamaaCommunityService.checkRateLimitRemaining(currentUser.uid).then((sec) => {
      setRemainingCooldown(sec);
    });
  }, [isOpen, currentUser]);

  // Interval countdown if on cooldown
  useEffect(() => {
    if (remainingCooldown <= 0) return;
    const interval = setInterval(() => {
      setRemainingCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingCooldown]);

  if (!isOpen) return null;

  const charCount = content.trim().length;
  const isValidLength = charCount >= MIN_LENGTH && charCount <= MAX_LENGTH;
  const canSubmit = currentUser && isValidLength && !isSubmitting && remainingCooldown === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !currentUser) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const postId = await GamaaCommunityService.createPost(content, {
        uid: currentUser.uid,
        displayName: userProfile?.displayName || currentUser.displayName || 'فاعل خير',
        photoURL: userProfile?.photoURL || currentUser.photoURL || '',
        level: userProfile?.level || 1,
      });

      setContent('');
      if (onPostCreated) onPostCreated(postId);
      onClose();
    } catch (err: any) {
      console.error('Post creation error:', err);
      setErrorMsg(err?.message || 'تعذر إرسال المشاركة حالياً، تحقق من الاتصال.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-stretch sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
      dir="rtl"
    >
      <div className="w-full h-[100dvh] sm:h-auto sm:max-h-[88vh] sm:max-w-lg bg-[#0E0C09] border-0 sm:border sm:border-[#C8A24A]/40 rounded-none sm:rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1F1A10] border border-[#C8A24A]/40 flex items-center justify-center text-[#E6C66E] shadow-inner">
              <Sparkles size={17} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">مشاركة جديدة في جماعة</h2>
              <p className="text-[11px] text-[#A69E89]">شارك تدبراً، فائدة، أو دعاءً طيباً</p>
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

        {/* User Identity Preview */}
        {currentUser && (
          <div className="my-2.5 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#16130D] border border-[#C8A24A]/15 shrink-0">
            <div className="w-8 h-8 rounded-full border border-[#D4AF37]/50 bg-[#1D1912] flex items-center justify-center overflow-hidden shrink-0">
              {userProfile?.photoURL || currentUser.photoURL ? (
                <img
                  src={userProfile?.photoURL || currentUser.photoURL || ''}
                  alt="الصورة"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-[#E6C66E] font-bold">
                  {(userProfile?.displayName || currentUser.displayName || 'أ').charAt(0)}
                </span>
              )}
            </div>
            <div className="text-right text-xs">
              <span className="font-bold text-white block">
                {userProfile?.displayName || currentUser.displayName || 'فاعل خير'}
              </span>
              <span className="text-[10px] text-[#D6B36A]">
                المستوى {userProfile?.level || 1}
              </span>
            </div>
          </div>
        )}

        {/* Cooldown Warning if Rate-Limited */}
        {remainingCooldown > 0 && (
          <div className="my-2 flex items-center gap-2 p-3 rounded-xl bg-[#2A1E0E] border border-[#E6C66E]/40 text-[#FFE082] text-xs shrink-0">
            <Clock size={16} className="shrink-0 text-[#E6C66E] animate-pulse" />
            <span>
              نظام الهدوء الإيماني: يرجى الانتظار <strong className="font-mono text-sm">{remainingCooldown}</strong> ثانية قبل نشر مشاركة جديدة.
            </span>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="my-2 flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs shrink-0">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Composer Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between space-y-3 min-h-0 pt-1">
          <div className="flex-1 relative flex flex-col min-h-0">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="اكتب هنا ما يسرّك أن تلقى الله به... (فائدة علمية، آية وتدبرها، موعظة حسنة)"
              disabled={isSubmitting || !currentUser}
              className="w-full flex-1 p-3.5 rounded-2xl bg-[#14120D] border border-[#C8A24A]/30 text-white placeholder-[#787163] text-sm leading-relaxed focus:border-[#E6C66E] focus:outline-none transition-colors resize-none overflow-y-auto"
            />
          </div>

          {/* Character counter & Spiritual motto */}
          <div className="flex items-center justify-between text-[11px] text-[#8E8672] px-1 shrink-0 pt-1">
            <span className="italic font-quran text-[#C4B998]">
              «وَقُولُوا لِلنَّاسِ حُسْنًا»
            </span>
            <span
              className={`font-mono tabular-nums ${
                charCount > MAX_LENGTH ? 'text-red-400 font-bold' : charCount >= MIN_LENGTH ? 'text-[#E6C66E]' : ''
              }`}
            >
              {charCount} / {MAX_LENGTH}
            </span>
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center justify-end gap-2.5 shrink-0 border-t border-[#C8A24A]/15">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="athar-btn-outline min-h-[44px] px-5 py-2.5 text-xs cursor-pointer flex items-center justify-center font-medium"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={!canSubmit}
              className={`athar-btn-primary min-h-[44px] px-6 py-2.5 flex items-center justify-center gap-2 text-xs cursor-pointer font-bold transition-all shadow-md ${
                !canSubmit ? 'opacity-40 cursor-not-allowed' : 'hover:scale-[1.02]'
              }`}
            >
              {isSubmitting ? (
                <span>جارٍ النشر...</span>
              ) : (
                <>
                  <span>نشر في جماعة</span>
                  <Send size={15} className="rotate-180" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
