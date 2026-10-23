import React, { useState, useEffect, useCallback } from 'react';
import {
  CommunityCampaign,
  CommunityCampaignService,
  ContributionResult,
  DHIKR_PRESET_DETAILS,
  MAX_SESSION_AMOUNT,
  MAX_24H_CAMPAIGN_CAP,
} from '../../services/communityCampaignService';
import { AuthService } from '../../services/authService';
import {
  X,
  Flame,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Plus,
  Sparkles,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

interface GamaaCampaignParticipateModalProps {
  isOpen: boolean;
  campaign: CommunityCampaign | null;
  onClose: () => void;
  onContributed?: (result: ContributionResult, amount: number) => void;
}

export const GamaaCampaignParticipateModal: React.FC<GamaaCampaignParticipateModalProps> = ({
  isOpen,
  campaign,
  onClose,
  onContributed,
}) => {
  const [count, setCount] = useState<number>(33);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    amount: number;
    alreadyRecorded: boolean;
  } | null>(null);

  const currentUser = AuthService.getCurrentUser();
  const presetKey = campaign?.targetDhikrPreset || 'subhanallah_wabihamdih';
  const presetInfo = DHIKR_PRESET_DETAILS[presetKey] || {
    label: 'الذكر المشروع',
    text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    virtue: 'حُطَّتْ خَطَايَاهُ وَإِنْ كَانَتْ مِثْلَ زَبَدِ الْبَحْرِ',
    defaultIncrement: 33,
  };

  // Reset or initialize count whenever modal opens
  useEffect(() => {
    if (isOpen && campaign) {
      setCount(presetInfo.defaultIncrement || 33);
      setErrorMsg(null);
      setSuccessInfo(null);
      setIsSubmitting(false);
    }
  }, [isOpen, campaign, presetKey]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  const triggerHaptic = useCallback((ms: number = 15) => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(ms);
      }
    } catch {
      // Ignore vibration errors on unsupported platforms
    }
  }, []);

  const handleIncrement = (amount: number = 1) => {
    setCount((prev) => {
      const next = Math.min(MAX_SESSION_AMOUNT, prev + amount);
      triggerHaptic(12);
      return next;
    });
    setErrorMsg(null);
  };

  const handleSetPreset = (target: number) => {
    setCount(Math.min(MAX_SESSION_AMOUNT, Math.max(1, target)));
    triggerHaptic(20);
    setErrorMsg(null);
  };

  const handleReset = () => {
    setCount(0);
    triggerHaptic(25);
    setErrorMsg(null);
  };

  const handleSubmit = async () => {
    if (!campaign) return;

    if (!currentUser) {
      setErrorMsg('يجب تسجيل الدخول أولاً لتسجيل المشاركة في الحملة المباركة.');
      return;
    }

    if (count <= 0) {
      setErrorMsg('يرجى تحديد عدد التسبيحات أولاً (تسبيحة واحدة على الأقل).');
      return;
    }

    if (count > MAX_SESSION_AMOUNT) {
      setErrorMsg(`الحد الأقصى للتسجيل في الجلسة الواحدة هو ${MAX_SESSION_AMOUNT} تسبيحة.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    // Build format-compliant session ID (alphanumeric + hyphen, length 8..64)
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 10);
    const sessionId = `ses-${timestamp}-${randomPart}`;

    try {
      const result = await CommunityCampaignService.contributeToCampaign(
        campaign.id,
        count,
        campaign.targetDhikrPreset,
        sessionId,
        currentUser.uid
      );

      triggerHaptic(50);
      setSuccessInfo({
        amount: count,
        alreadyRecorded: result.alreadyRecorded,
      });

      if (onContributed) {
        onContributed(result, count);
      }
    } catch (err: any) {
      console.error('Campaign contribution error:', err);
      const code = err?.message || '';

      if (code.includes('DAILY_CAP_EXCEEDED')) {
        setErrorMsg(
          `تقبل الله منك! لقد بلغت الحد الأقصى للمشاركة خلال 24 ساعة (${MAX_24H_CAMPAIGN_CAP.toLocaleString(
            'ar-EG'
          )} ذكر). يُرجى المحاولة غداً.`
        );
      } else if (code.includes('AUTH_REQUIRED')) {
        setErrorMsg('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً.');
      } else if (code.includes('CAMPAIGN_INACTIVE')) {
        setErrorMsg('هذه الحملة غير نشطة حالياً أو انتهى وقتها المحدد.');
      } else if (code.includes('PRESET_MISMATCH')) {
        setErrorMsg('نوع الذكر لا يتطابق مع الهدف المحدد للحملة.');
      } else if (err?.code === 'permission-denied') {
        setErrorMsg('تم رفض العملية من نظام الأمان السحابي. تأكد من صحة بيانات الحساب.');
      } else {
        setErrorMsg(err.message || 'تعذر إرسال المساهمة حالياً. يرجى التحقق من اتصال الإنترنت.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !campaign) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="campaign-modal-title"
    >
      <div
        className="w-full sm:max-w-lg bg-[#0E0C09] border-t sm:border border-[#D4AF37]/40 rounded-t-[32px] sm:rounded-3xl max-h-[92dvh] overflow-y-auto text-right text-white shadow-[0_-10px_40px_rgba(0,0,0,0.8)] sm:shadow-[0_0_50px_rgba(212,175,55,0.25)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-[#0E0C09]/95 backdrop-blur-sm z-10 px-5 pt-4 pb-3 border-b border-[#C8A24A]/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E6C66E] to-[#A6802B] p-0.5 shadow-md shadow-[#D4AF37]/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#14110A] rounded-[10px] flex items-center justify-center text-[#E6C66E]">
                <Flame size={20} />
              </div>
            </div>
            <div>
              <h2
                id="campaign-modal-title"
                className="text-sm sm:text-base font-extrabold text-[#F3E5AB] leading-tight"
              >
                شارك في الحملة
              </h2>
              <span className="text-[11px] text-[#A69E89] block mt-0.5 font-medium">
                «{campaign.title}»
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="إغلاق النافذة"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#16130C] border border-[#C8A24A]/30 text-[#A69E89] hover:text-[#F3E5AB] hover:border-[#E6C66E] transition-colors cursor-pointer touch-manipulation active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 flex-1">
          {successInfo ? (
            /* Success State */
            <div className="py-6 text-center space-y-4 animate-fadeIn">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <CheckCircle2 size={36} />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-[#F3E5AB]">
                  {successInfo.alreadyRecorded
                    ? 'الجلسة مسجلة مسبقاً'
                    : 'تقبل الله طاعتكم وجزاكم خيراً'}
                </h3>
                <p className="text-xs text-[#C4B998] max-w-sm mx-auto leading-relaxed">
                  {successInfo.alreadyRecorded
                    ? 'تم احتساب هذه الجلسة مسبقاً في شظايا الحملة بفضل الله.'
                    : `أُضيفت ${successInfo.amount.toLocaleString(
                        'ar-EG'
                      )} تسبيحة إلى الرصيد المليوني للحملة المباركة.`}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#17140E] border border-[#D4AF37]/30 text-xs text-[#E6C66E] font-medium font-quran leading-relaxed">
                «مَنْ دَلَّ عَلَى خَيْرٍ فَلَهُ مِثْلُ أَجْرِ فَاعِلِهِ»
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => {
                    setSuccessInfo(null);
                    setCount(presetInfo.defaultIncrement || 33);
                  }}
                  className="flex-1 min-h-[44px] rounded-xl bg-[#1C1810] border border-[#C8A24A]/40 text-xs font-bold text-[#F3E5AB] hover:bg-[#251F14] transition-all cursor-pointer active:scale-95 touch-manipulation"
                >
                  تسبيح إضافي
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 min-h-[44px] rounded-xl bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-black font-extrabold text-xs shadow-lg shadow-[#D4AF37]/25 hover:brightness-110 transition-all cursor-pointer active:scale-95 touch-manipulation"
                >
                  تم والحمد لله
                </button>
              </div>
            </div>
          ) : (
            /* Participation & Counter UI */
            <>
              {/* Spiritual Dhikr Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1C170F] to-[#110F0A] border border-[#D4AF37]/35 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#E6C66E] font-bold">
                  <span>صيغة الذكر المستهدفة:</span>
                  <span className="text-[11px] text-[#A69E89]">{presetInfo.label}</span>
                </div>
                <div className="font-quran text-base sm:text-lg text-[#FFF3D1] font-bold text-center py-1 leading-relaxed">
                  {presetInfo.text}
                </div>
                {presetInfo.virtue && (
                  <p className="text-[11px] text-[#C4B998] text-center italic border-t border-[#C8A24A]/20 pt-1.5">
                    فضله: {presetInfo.virtue}
                  </p>
                )}
              </div>

              {/* Central Interactive Tasbih Ring */}
              <div className="flex flex-col items-center justify-center py-2 space-y-3">
                <button
                  type="button"
                  onClick={() => handleIncrement(1)}
                  disabled={isSubmitting || count >= MAX_SESSION_AMOUNT}
                  aria-label="تسبيحة إضافية"
                  className="group relative w-36 h-36 sm:w-40 sm:h-40 rounded-full bg-gradient-to-b from-[#241D12] via-[#16130D] to-[#0A0906] border-2 border-[#D4AF37]/60 shadow-[0_0_40px_rgba(212,175,55,0.22)] flex flex-col items-center justify-center transition-all duration-150 cursor-pointer touch-manipulation active:scale-90 hover:border-[#E6C66E] select-none"
                >
                  <div className="absolute inset-1.5 rounded-full border border-[#C8A24A]/25 pointer-events-none group-active:border-[#FFE294]/60 transition-colors" />

                  <span className="text-3xl sm:text-4xl font-extrabold text-[#FFE294] font-mono tracking-wider drop-shadow-md">
                    {count.toLocaleString('ar-EG')}
                  </span>
                  <span className="text-[11px] text-[#A69E89] font-medium mt-0.5 group-hover:text-[#E6C66E] transition-colors">
                    تسبيحة
                  </span>
                  <span className="text-[10px] text-[#C8A24A]/70 mt-1">اضغط للتسبيح</span>
                </button>

                {/* Quick Presets Row */}
                <div className="flex items-center gap-2 pt-1 flex-wrap justify-center">
                  <button
                    type="button"
                    onClick={() => handleSetPreset(33)}
                    disabled={isSubmitting}
                    className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-[#17140E] border border-[#C8A24A]/30 text-xs font-bold text-[#EAE2C8] hover:border-[#E6C66E] hover:text-[#FFE294] transition-all cursor-pointer active:scale-95 touch-manipulation"
                  >
                    33 (سنة)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPreset(100)}
                    disabled={isSubmitting}
                    className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-[#17140E] border border-[#C8A24A]/30 text-xs font-bold text-[#EAE2C8] hover:border-[#E6C66E] hover:text-[#FFE294] transition-all cursor-pointer active:scale-95 touch-manipulation"
                  >
                    100 (المائة)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleIncrement(10)}
                    disabled={isSubmitting || count + 10 > MAX_SESSION_AMOUNT}
                    className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-[#17140E] border border-[#C8A24A]/30 text-xs font-bold text-[#EAE2C8] hover:border-[#E6C66E] hover:text-[#FFE294] transition-all cursor-pointer active:scale-95 touch-manipulation"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => handleIncrement(33)}
                    disabled={isSubmitting || count + 33 > MAX_SESSION_AMOUNT}
                    className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-[#17140E] border border-[#C8A24A]/30 text-xs font-bold text-[#EAE2C8] hover:border-[#E6C66E] hover:text-[#FFE294] transition-all cursor-pointer active:scale-95 touch-manipulation"
                  >
                    +33
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={isSubmitting || count === 0}
                    aria-label="إعادة ضبط العداد"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#15120D] border border-red-500/30 text-red-400 hover:border-red-400 hover:text-red-300 transition-all cursor-pointer active:scale-95 touch-manipulation"
                    title="تصفير العداد"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>
              </div>

              {/* Informative Security & Guidelines Note */}
              <div className="p-3 rounded-xl bg-[#14120B] border border-[#C8A24A]/20 text-[11px] text-[#A69E89] space-y-1">
                <div className="flex items-center gap-1.5 text-[#E6C66E] font-bold">
                  <ShieldCheck size={14} />
                  <span>تأكيد الأمان والمصداقية:</span>
                </div>
                <p className="leading-relaxed">
                  يتم إيداع مساهمتك في إحدى الشظايا العشر عبر معاملة سحابية مؤمّنة فورية. الحد الأقصى للجلسة {MAX_SESSION_AMOUNT} تسبيحة والحد اليومي {MAX_24H_CAMPAIGN_CAP} تسبيحة منعاً للتلاعب وحفظاً لبركة العمل.
                </p>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-red-950/70 border border-red-500/40 text-xs text-red-200 flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{errorMsg}</span>
                </div>
              )}

              {/* Submission Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || count <= 0}
                  className="w-full min-h-[48px] rounded-2xl bg-gradient-to-r from-[#E6C66E] via-[#D4AF37] to-[#A6802B] text-black font-extrabold text-sm shadow-[0_4px_25px_rgba(212,175,55,0.35)] hover:brightness-110 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 touch-manipulation"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                      <span>جارٍ تسجيل المساهمة في الشظايا...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      <span>
                        تأكيد وإرسال {count > 0 ? `(${count.toLocaleString('ar-EG')} تسبيحة)` : ''}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
