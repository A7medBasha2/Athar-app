import React, { useState } from 'react';
import { Flag, X, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';
import { GamaaAdminService, ReportReason, ReportTargetType } from '../../services/gamaaAdminService';

interface GamaaReportModalProps {
  isOpen: boolean;
  targetType: ReportTargetType;
  targetId: string;
  postId: string;
  snippet?: string;
  onClose: () => void;
  onReportSubmitted?: () => void;
}

const REASON_OPTIONS: { id: ReportReason; label: string; desc: string }[] = [
  {
    id: 'inappropriate',
    label: 'محتوى غير لائق أو مخالف للشريعة',
    desc: 'مشاركات لا تليق بقدسية وأدب الفضاء الإسلامي',
  },
  {
    id: 'offensive',
    label: 'إساءة أو تنمر أو خصومة',
    desc: 'تعدٍّ لفظي أو تجريح موجه ضد أحد الأعضاء',
  },
  {
    id: 'spam',
    label: 'إعلانات تجارية أو تكرار مزعج',
    desc: 'روابط أو ترويج تجاري أو رسائل متكررة لا فائدة منها',
  },
  {
    id: 'other',
    label: 'سبب آخر يستوجب مراجعة الإشراف',
    desc: 'ملاحظة أخرى تخالف ضوابط مجتمع أثر',
  },
];

export const GamaaReportModal: React.FC<GamaaReportModalProps> = ({
  isOpen,
  targetType,
  targetId,
  postId,
  snippet,
  onClose,
  onReportSubmitted,
}) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason>('inappropriate');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      await GamaaAdminService.submitReport({
        targetType,
        targetId,
        postId,
        reason: selectedReason,
        details: details.trim(),
        snippet: snippet ? snippet.substring(0, 180) : undefined,
      });

      setFeedback({
        message: 'شكراً لحرصك. تم إرسال البلاغ لفريق الإشراف للمراجعة الشرعية والنظامية.',
        type: 'success',
      });

      setTimeout(() => {
        setIsSubmitting(false);
        setDetails('');
        if (onReportSubmitted) onReportSubmitted();
        onClose();
      }, 1600);
    } catch (err: any) {
      console.error('Report submission error:', err);
      setIsSubmitting(false);
      setFeedback({
        message: err.message || 'تعذر إرسال البلاغ حالياً، يرجى المحاولة لاحقاً',
        type: 'error',
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
      dir="rtl"
    >
      <div className="w-full sm:max-w-md bg-[#0D0C09] border border-[#C8A24A]/40 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 text-right shadow-2xl text-white max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Flag size={16} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#F3E5AB]">
                {targetType === 'post' ? 'إبلاغ عن مشاركة' : 'إبلاغ عن تعليق'}
              </h3>
              <p className="text-[11px] text-[#A69E89]">صوناً لهدوء وبركة مجتمع جَمَاعَة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center bg-[#171510] text-[#C4B998] hover:text-[#E6C66E] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Snippet Preview */}
        {snippet && (
          <div className="p-3 rounded-2xl bg-[#14120D] border border-[#C8A24A]/20 text-xs text-[#C4B998] italic line-clamp-2 leading-relaxed">
            «{snippet}»
          </div>
        )}

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-xl border flex items-center gap-2 text-xs leading-normal ${
              feedback.type === 'success'
                ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/50 border-rose-500/50 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#E6C66E] block">
              سبب الإبلاغ:
            </label>
            <div className="space-y-2">
              {REASON_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  onClick={() => setSelectedReason(opt.id)}
                  className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                    selectedReason === opt.id
                      ? 'bg-[#221B10] border-[#E6C66E] shadow-[0_0_12px_rgba(230,198,110,0.15)]'
                      : 'bg-[#14120D] border-[#C8A24A]/25 hover:border-[#C8A24A]/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="report_reason"
                    value={opt.id}
                    checked={selectedReason === opt.id}
                    onChange={() => setSelectedReason(opt.id)}
                    className="mt-0.5 accent-[#E6C66E]"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white block">
                      {opt.label}
                    </span>
                    <span className="text-[11px] text-[#A69E89] block">
                      {opt.desc}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#C4B998] block">
              تفاصيل إضافية (اختياري):
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={300}
              placeholder="اكتب توضيحاً مختصراً لمساعدة المشرفين..."
              rows={3}
              className="w-full rounded-2xl bg-[#14120D] border border-[#C8A24A]/30 p-3 text-xs text-white placeholder-[#68604F] focus:outline-none focus:border-[#E6C66E] transition-colors resize-none"
            />
            <div className="text-[10px] text-[#7A725F] text-left">
              {details.length}/300
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-[#C8A24A]/20">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 min-h-[44px] py-2 rounded-xl bg-[#171510] border border-[#C8A24A]/30 text-xs font-bold text-[#C4B998] hover:text-white transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 min-h-[44px] py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white text-xs font-extrabold hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-900/30 disabled:opacity-50"
            >
              <ShieldAlert size={14} />
              <span>{isSubmitting ? 'جارٍ الإرسال...' : 'تأكيد البلاغ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
