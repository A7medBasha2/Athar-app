import React, { useState, useEffect, useRef } from 'react';
import { GamaaCommunityService } from '../../services/gamaaCommunityService';
import { SupabaseGamaaService } from '../../services/supabaseGamaaService';
import { AuthService } from '../../services/authService';
import { GamaaPost } from '../../types';
import { X, Send, Sparkles, AlertCircle, Clock, Image as ImageIcon, Loader2 } from 'lucide-react';

interface GamaaPostComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: (postId: string, newPost?: GamaaPost) => void;
  initialOpenMediaPicker?: boolean;
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
  initialOpenMediaPicker = false,
  userProfile,
}) => {
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [remainingCooldown, setRemainingCooldown] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const didAutoOpenPickerRef = useRef<boolean>(false);

  const currentUser = AuthService.getCurrentUser();
  const MAX_LENGTH = 600;
  const MIN_LENGTH = 3;

  useEffect(() => {
    if (!isOpen) {
      setContent('');
      setMediaFile(null);
      setMediaPreview(null);
      setErrorMsg(null);
      didAutoOpenPickerRef.current = false;
      return;
    }

    if (!currentUser) {
      setErrorMsg('يجب تسجيل الدخول أولاً لتتمكن من مشاركة التدوينات في جماعة.');
      return;
    }

    GamaaCommunityService.checkRateLimitRemaining(currentUser.uid).then((sec) => {
      setRemainingCooldown(sec);
    });

    if (initialOpenMediaPicker && !didAutoOpenPickerRef.current) {
      didAutoOpenPickerRef.current = true;
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 120);
    }
  }, [isOpen, currentUser, initialOpenMediaPicker]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('يرجى اختيار ملف صورة صالح فقط.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت).');
      return;
    }

    setErrorMsg(null);
    setMediaFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !currentUser) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      let uploadedMediaUrl: string | undefined;
      if (mediaFile) {
        uploadedMediaUrl = await SupabaseGamaaService.uploadAvatar(mediaFile, currentUser.uid);
      }

      const postId = await GamaaCommunityService.createPost(
        {
          content,
          mediaUrl: uploadedMediaUrl,
          authorProfile: {
            displayName: userProfile?.displayName || currentUser.displayName || 'فاعل خير',
            photoURL: userProfile?.photoURL || currentUser.photoURL || '',
            level: userProfile?.level || 1,
          },
        },
        {
          uid: currentUser.uid,
          displayName: userProfile?.displayName || currentUser.displayName || 'فاعل خير',
          photoURL: userProfile?.photoURL || currentUser.photoURL || '',
          level: userProfile?.level || 1,
        }
      );

      const authorName = userProfile?.displayName || currentUser.displayName || 'فاعل خير';
      const authorPhoto = userProfile?.photoURL || currentUser.photoURL || '';
      const authorLevel = userProfile?.level || 1;

      const createdPostObj: GamaaPost = {
        id: postId,
        authorId: currentUser.uid,
        authorName,
        authorPhoto,
        authorLevel,
        content: content.trim(),
        mediaUrl: uploadedMediaUrl,
        commentsCount: 0,
        reactionsCount: {
          jazakallah: 0,
          barakallah: 0,
          ameen: 0,
        },
        createdAt: new Date().toISOString(),
      };

      setContent('');
      setMediaFile(null);
      setMediaPreview(null);
      if (onPostCreated) onPostCreated(postId, createdPostObj);
      onClose();
    } catch (err: any) {
      console.error('Post creation error:', err);
      let friendlyMsg = 'تعذر إرسال المشاركة حالياً، تحقق من الاتصال.';
      try {
        if (typeof err?.message === 'string') {
          if (
            err.message.includes('Missing or insufficient permissions') ||
            err.message.includes('permission-denied')
          ) {
            friendlyMsg =
              'تعذر نشر المشاركة لعدم توفر الصلاحية المطلوبة أو الحاجة لتأكيد البريد الإلكتروني.';
          } else if (err.message.startsWith('{') && err.message.endsWith('}')) {
            const parsed = JSON.parse(err.message);
            if (
              parsed.error &&
              (parsed.error.includes('Missing or insufficient permissions') ||
                parsed.error.includes('permission-denied'))
            ) {
              friendlyMsg =
                'تعذر نشر المشاركة لعدم توفر الصلاحية المطلوبة أو الحاجة لتأكيد البريد الإلكتروني.';
            } else if (parsed.error) {
              friendlyMsg = parsed.error;
            }
          } else {
            friendlyMsg = err.message;
          }
        }
      } catch {
        friendlyMsg = err?.message || 'تعذر إرسال المشاركة حالياً، تحقق من الاتصال.';
      }
      setErrorMsg(friendlyMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-stretch sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
      dir="rtl"
    >
      <div className="w-full h-[100dvh] sm:h-auto sm:max-h-[88vh] sm:max-w-lg bg-[#080B0C] border-0 sm:border sm:border-[#806039]/60 rounded-none sm:rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#3A3329] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1A1712] border border-[#806039]/60 flex items-center justify-center text-[#E6B76B] shadow-inner">
              <Sparkles size={17} />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-[#F5F1E9]">إنشاء منشور في جماعة</h2>
              <p className="text-[11.5px] text-[#B5ADA2]">شارك تدبراً، فائدة، أو دعاءً طيباً</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-[#101416] border border-[#3A3329] text-[#B5ADA2] hover:text-[#F5F1E9] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Identity Row */}
        {currentUser && (
          <div className="my-3 flex items-center justify-between gap-2.5 px-3 py-2 rounded-2xl bg-[#101416] border border-[#3A3329]/70 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-full border border-[#806039] bg-[#1A1712] flex items-center justify-center overflow-hidden shrink-0">
                {userProfile?.photoURL || currentUser.photoURL ? (
                  <img
                    src={userProfile?.photoURL || currentUser.photoURL || ''}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-[#E6B76B] font-bold">
                    {(userProfile?.displayName || currentUser.displayName || 'أ').charAt(0)}
                  </span>
                )}
              </div>
              <div className="text-right min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[#F5F1E9] text-[14px] truncate">
                    {userProfile?.displayName || currentUser.displayName || 'فاعل خير'}
                  </span>
                  <span className="bg-[#1A1712] text-[#E6B76B] border border-[#806039]/60 text-[10.5px] px-2 py-0.5 rounded-full font-medium shrink-0">
                    مستوى {userProfile?.level || 1}
                  </span>
                </div>
                <span className="text-[11px] text-[#B5ADA2] block">عام · مجتمع جماعة</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#1A1712] border border-[#806039]/60 hover:border-[#D4AF37] text-xs font-semibold text-[#E6B76B] flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <ImageIcon size={15} />
              <span>صورة</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}

        {/* Cooldown Warning */}
        {remainingCooldown > 0 && (
          <div className="mb-2 flex items-center gap-2 p-3 rounded-xl bg-[#1A1712] border border-[#D4AF37]/40 text-[#E6B76B] text-xs shrink-0">
            <Clock size={16} className="shrink-0 text-[#D4AF37] animate-pulse" />
            <span>
              يرجى الانتظار <strong className="font-mono text-sm">{remainingCooldown}</strong> ثانية قبل نشر مشاركة جديدة.
            </span>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mb-2 flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs shrink-0">
            <AlertCircle size={15} className="shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Composer Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between space-y-3 min-h-0">
          <div className="flex-1 relative flex flex-col min-h-0 gap-2.5 overflow-y-auto">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="شارك الخير مع جماعة... (آية وتدبرها، دعاء طيب، أو فائدة نافعة)"
              disabled={isSubmitting || !currentUser}
              className="w-full flex-1 min-h-[130px] p-3.5 rounded-2xl bg-[#101416] border border-[#3A3329] text-[#F5F1E9] placeholder-[#B5ADA2]/60 text-[14.5px] leading-[1.75] focus:border-[#D4AF37] focus:outline-none transition-colors resize-none"
            />

            {mediaPreview && (
              <div className="relative rounded-2xl overflow-hidden border border-[#806039]/60 bg-[#101416] max-h-52 shrink-0">
                <img
                  src={mediaPreview}
                  alt="معاينة المرفق"
                  className="w-full h-48 object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveMedia}
                  aria-label="إزالة الصورة"
                  className="absolute top-2 left-2 w-8 h-8 rounded-full bg-black/75 border border-white/20 text-white flex items-center justify-center hover:bg-black cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
            )}
          </div>

          {/* Character counter & Quranic verse */}
          <div className="flex items-center justify-between text-[11px] text-[#B5ADA2] px-1 shrink-0 pt-1">
            <span className="font-quran text-[#E6B76B]/90 text-xs">
              «وَقُولُوا لِلنَّاسِ حُسْنًا»
            </span>
            <span
              className={`font-mono tabular-nums ${
                charCount > MAX_LENGTH
                  ? 'text-red-400 font-bold'
                  : charCount >= MIN_LENGTH
                  ? 'text-[#E6B76B]'
                  : ''
              }`}
            >
              {charCount} / {MAX_LENGTH}
            </span>
          </div>

          {/* Submit Action */}
          <div className="pt-2.5 flex items-center justify-end gap-2.5 shrink-0 border-t border-[#3A3329]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[44px] px-5 py-2 rounded-full bg-[#101416] border border-[#3A3329] hover:border-[#806039] text-[#F5F1E9] text-xs font-semibold cursor-pointer transition-colors"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={!canSubmit}
              className={`min-h-[44px] px-6 py-2 rounded-full bg-gradient-to-l from-[#E6B76B] to-[#D4AF37] text-[#080B0C] flex items-center justify-center gap-2 text-xs font-extrabold shadow-[0_4px_14px_rgba(212,175,55,0.3)] transition-all ${
                !canSubmit
                  ? 'opacity-40 cursor-not-allowed'
                  : 'cursor-pointer hover:brightness-105 active:scale-95'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>جارٍ النشر...</span>
                </>
              ) : (
                <>
                  <span>نشر في جماعة</span>
                  <Send size={14} className="rotate-180" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
