import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react';
import { SupabaseCampaign, SupabaseGamaaService } from '../../services/supabaseGamaaService';
import {
  CommunityCampaign,
  DHIKR_PRESET_DETAILS,
} from '../../services/communityCampaignService';

interface GamaaCampaignsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectActiveCampaign: (campaign: CommunityCampaign) => void;
  onOpenRecovery?: () => void;
  canManageRecovery?: boolean;
}

export const GamaaCampaignsModal: React.FC<GamaaCampaignsModalProps> = ({
  isOpen,
  onClose,
  onSelectActiveCampaign,
  onOpenRecovery,
  canManageRecovery = false,
}) => {
  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const [campaigns, setCampaigns] = useState<SupabaseCampaign[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) return;
    loadAllCampaigns();
  }, [isOpen]);

  const loadAllCampaigns = async () => {
    setLoading(true);
    try {
      const list = await SupabaseGamaaService.getCampaigns('all');
      setCampaigns(list);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const activeList = campaigns.filter((c) => c.status === 'active');
  const completedList = campaigns.filter((c) => c.status === 'completed');
  const shownList = tab === 'active' ? activeList : completedList;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
      dir="rtl"
    >
      <div className="w-full sm:max-w-md max-h-[86dvh] bg-[#080B0C] border-t sm:border border-[#806039]/60 rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 flex flex-col gap-3.5 text-right shadow-2xl">
        {/* Top Handle on mobile */}
        <div className="w-10 h-1 rounded-full bg-[#3A3329] mx-auto sm:hidden -mt-1" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#3A3329]">
          <div>
            <h3 className="text-[17px] font-bold text-[#F5F1E9]">حملات التسبيح الجماعية</h3>
            <p className="text-xs text-[#B5ADA2] mt-0.5">
              شارك في الحملات النشطة أو استعرض الحملات المكتملة
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full bg-[#101416] border border-[#3A3329] text-[#B5ADA2] hover:text-[#F5F1E9] transition-colors cursor-pointer"
          >
            <X size={17} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#101416] border border-[#3A3329]">
          <button
            type="button"
            onClick={() => setTab('active')}
            className={`min-h-[40px] rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === 'active'
                ? 'bg-gradient-to-l from-[#E6B76B] to-[#D4AF37] text-[#080B0C] shadow-sm'
                : 'text-[#B5ADA2] hover:text-[#F5F1E9]'
            }`}
          >
            الحملات الجارية ({activeList.length.toLocaleString('ar-EG')})
          </button>
          <button
            type="button"
            onClick={() => setTab('completed')}
            className={`min-h-[40px] rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === 'completed'
                ? 'bg-gradient-to-l from-[#E6B76B] to-[#D4AF37] text-[#080B0C] shadow-sm'
                : 'text-[#B5ADA2] hover:text-[#F5F1E9]'
            }`}
          >
            المكتملة ({completedList.length.toLocaleString('ar-EG')})
          </button>
        </div>

        {/* Campaigns List */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 py-1">
          {loading ? (
            <div className="py-10 flex flex-col items-center justify-center gap-2 text-[#B5ADA2]">
              <RefreshCw size={22} className="animate-spin text-[#D4AF37]" />
              <span className="text-xs">جارٍ تحميل الحملات...</span>
            </div>
          ) : shownList.length === 0 ? (
            <div className="py-10 px-4 text-center rounded-2xl bg-[#101416] border border-[#3A3329]/70 space-y-2">
              <Sparkles size={26} className="mx-auto text-[#806039]" />
              <p className="text-sm font-semibold text-[#F5F1E9]">
                {tab === 'active'
                  ? 'لا توجد حملات تسبيح جارية حالياً'
                  : 'لا توجد حملات مكتملة مسجلة بعد'}
              </p>
              <p className="text-xs text-[#B5ADA2]">
                {tab === 'active'
                  ? 'ستظهر الحملات الجديدة هنا وفوق الخط الزمني فور إطلاقها.'
                  : 'تُحفظ هنا الحملات التي أتمّ مجتمع جماعة هدفها المبارك.'}
              </p>
            </div>
          ) : (
            shownList.map((camp) => {
              const target = Math.max(1, Number(camp.targetCount) || 1);
              const current = Math.max(0, Number(camp.currentCount) || 0);
              const pct = Math.min(100, Math.round((current / target) * 100));
              const isDone = camp.status === 'completed' || current >= target;
              const dhikrLabel =
                DHIKR_PRESET_DETAILS[camp.dhikrType]?.label || camp.description || 'ذكر وتسبيح';

              return (
                <div
                  key={camp.id}
                  className="p-3.5 rounded-2xl bg-[#1A1712] border border-[#806039]/60 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-[#F5F1E9] leading-snug">
                        {camp.title}
                      </h4>
                      <p className="text-xs text-[#E6B76B] mt-0.5 truncate">{dhikrLabel}</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#E6B76B] shrink-0">
                      {isDone ? '100%' : `${pct}%`}
                    </span>
                  </div>

                  {/* Horizontal Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-[#2A241B] overflow-hidden border border-[#806039]/30">
                    <div
                      className="h-full rounded-full bg-gradient-to-l from-[#D4AF37] via-[#E6B76B] to-[#F5E2A8] transition-all duration-500"
                      style={{ width: `${isDone ? 100 : pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11.5px] text-[#B5ADA2]">
                    <span className="font-mono tabular-nums text-[#F5F1E9] font-semibold">
                      {current.toLocaleString('ar-EG')}{' '}
                      <span className="font-sans font-normal text-[#B5ADA2]">
                        / {target.toLocaleString('ar-EG')} تسبيحة
                      </span>
                    </span>

                    {isDone ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#E6B76B]">
                        <CheckCircle2 size={14} className="text-[#D4AF37]" />
                        تم اكتمال الحملة
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectActiveCampaign({
                            id: camp.id,
                            title: camp.title,
                            description: camp.description || '',
                            targetDhikrPreset: camp.dhikrType || 'subhanallah_wabihamdih',
                            totalTarget: target,
                            currentCount: current,
                            status: 'active',
                            isOfficial: true,
                            creatorId: camp.creatorId,
                            createdAt: camp.createdAt,
                            expiresAt: null,
                          });
                          onClose();
                        }}
                        className="min-h-[36px] px-4 py-1 rounded-full bg-gradient-to-l from-[#E6B76B] to-[#D4AF37] text-[#080B0C] text-xs font-extrabold cursor-pointer hover:brightness-105 active:scale-95 transition-all"
                      >
                        شارك بالتسبيح
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Optional Pending Recovery Footer for Authorized Creators/Owners */}
        {canManageRecovery && onOpenRecovery && (
          <div className="pt-2 border-t border-[#3A3329]">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenRecovery();
              }}
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#101416] border border-[#3A3329] hover:border-[#806039] text-xs font-semibold text-[#B5ADA2] hover:text-[#E6B76B] flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ShieldCheck size={15} className="text-[#D4AF37]" />
              <span>فحص واستئناف الحملات قيد التهيئة</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
