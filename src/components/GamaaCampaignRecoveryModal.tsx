import React, { useState, useEffect } from 'react';
import { CommunityCampaignService } from '../services/communityCampaignService';
import { auth, db } from '../firebase';
import { X, RefreshCw, AlertCircle, CheckCircle, ShieldCheck, Users } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';

interface GamaaCampaignRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GamaaCampaignRecoveryModal: React.FC<GamaaCampaignRecoveryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    loadPendingCampaigns();
  }, [isOpen]);

  const loadPendingCampaigns = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const user = auth.currentUser;
      if (!user) {
        setCampaigns([]);
        setLoading(false);
        return;
      }

      // Check if user is owner via /system_config/roles
      let userIsOwner = false;
      try {
        const rolesSnap = await getDoc(doc(db, 'system_config', 'roles'));
        if (rolesSnap.exists() && rolesSnap.data().ownerUids?.includes(user.uid)) {
          userIsOwner = true;
        }
      } catch {
        userIsOwner = false;
      }
      setIsOwner(userIsOwner);

      const pending = await CommunityCampaignService.getUnactivatedCampaigns(user.uid, userIsOwner);
      setCampaigns(pending);
    } catch (err: any) {
      console.error('Error fetching unactivated campaigns:', err);
      setFeedback({
        message: 'تعذر جلب الحملات المعلقة حالياً',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetryActivation = async (campaignId: string) => {
    setRetryingId(campaignId);
    setFeedback(null);
    try {
      await CommunityCampaignService.retryActivation(campaignId);
      setFeedback({
        message: 'تم تفعيل الحملة بنجاح وتأكيد صحة الشظايا العشر',
        type: 'success',
      });
      await loadPendingCampaigns();
    } catch (err: any) {
      console.error('Retry activation failed:', err);
      const isDenied = err?.message?.includes('PERMISSION_DENIED') || err?.code === 'permission-denied';
      setFeedback({
        message: isDenied
          ? 'تم رفض التفعيل: لا تملك الصلاحية المطلوبة أو أن الشظايا غير مكتملة'
          : `فشل تفعيل الحملة: ${err.message || 'خطأ غير متوقع'}`,
        type: 'error',
      });
    } finally {
      setRetryingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-[#0D0C09] border border-[#C8A24A]/40 rounded-3xl p-5 space-y-4 text-right shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
          <div className="flex items-center gap-2">
            <Users className="text-[#E6C66E]" size={20} />
            <h3 className="text-sm font-extrabold text-[#F3E5AB]">
              إدارة واستئناف حملات جَمْع المعلقة
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#171510] text-[#C4B998] hover:text-[#E6C66E] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Info */}
        <p className="text-xs text-[#C4B998] leading-relaxed">
          في حال تعثر اتصال الشبكة أثناء إطلاق الحملة، يتيح هذا السجل لصحاب الحملة المعتمد أو المشرف إعادة التحقق وتفعيل الحملة بأمان.
        </p>

        {/* Feedback message */}
        {feedback && (
          <div
            className={`p-3 rounded-xl border flex items-center gap-2 text-xs leading-normal ${
              feedback.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Content list */}
        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-[#C4B998]">
            <RefreshCw className="animate-spin text-[#E6C66E]" size={24} />
            <span className="text-xs">جاري فحص الحملات المعلقة...</span>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <ShieldCheck className="mx-auto text-emerald-400" size={32} />
            <p className="text-xs font-bold text-[#E6C66E]">لا توجد حملات معلقة قيد التهيئة</p>
            <p className="text-[11px] text-[#C4B998]">جميع حملاتك مفعلة وتستقبل المساهمات بشكل نظامي</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {campaigns.map((camp) => (
              <div
                key={camp.id}
                className="p-3 rounded-2xl bg-[#14120D] border border-[#C8A24A]/30 space-y-2 text-right"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      camp.isOfficial
                        ? 'bg-[#C8A24A]/20 text-[#E6C66E] border border-[#C8A24A]/40'
                        : 'bg-white/10 text-white/80'
                    }`}
                  >
                    {camp.isOfficial ? 'حملة رسمية' : 'حملة شخصية'}
                  </span>
                  <span className="text-[10px] text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-500/30">
                    {camp.status === 'shards_verified' ? 'تم فحص الشظايا' : 'قيد التهيئة'}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[#F3E5AB]">{camp.title}</h4>
                  <p className="text-[11px] text-[#C4B998] line-clamp-1">{camp.description}</p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-[#C8A24A]/15 text-[10px] text-[#C4B998]">
                  <span>الهدف: {Number(camp.totalTarget || 0).toLocaleString()} ذكر</span>
                  <button
                    disabled={retryingId === camp.id}
                    onClick={() => handleRetryActivation(camp.id)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#C8A24A] text-[#14120D] font-extrabold hover:bg-[#E6C66E] transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={retryingId === camp.id ? 'animate-spin' : ''} />
                    <span>{retryingId === camp.id ? 'جاري التفعيل...' : 'استئناف التفعيل'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#1C1810] border border-[#C8A24A]/30 text-xs font-bold text-[#F3E5AB] hover:border-[#E6C66E]"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
