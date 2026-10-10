import React from 'react';
import { 
  Heart, BookOpen, Users, Compass, ShieldCheck, 
  ChevronLeft, HeartHandshake
} from 'lucide-react';
import { RotatingCardBackground } from './RotatingCardBackground';
import { SakinaTab } from './SakinaAndRightsModal';

interface SakinaOasisCardProps {
  onOpenOasis: (tab?: SakinaTab) => void;
  pendingDebtsCount?: number;
  intentionsCount?: number;
  tadabburStreak?: number;
}

export const SakinaOasisCard: React.FC<SakinaOasisCardProps> = ({
  onOpenOasis,
  tadabburStreak = 0
}) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#1A160E] via-[#0F0D09] to-[#080705] border border-[#C8A24A]/50 hover:border-[#E6C66E]/80 rounded-3xl p-4 sm:p-5 shadow-[0_12px_35px_rgba(0,0,0,0.8)] transition-all duration-300">
      {/* Dynamic Background subtle Islamic Arches */}
      <RotatingCardBackground slot="kaaba" cardOffset={3} intervalMs={24000} opacity={0.18} />

      {/* Main Header / Banner */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div 
          onClick={() => onOpenOasis('heart_healing')}
          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C8A24A]/25 to-[#8C6E2D]/15 border border-[#C8A24A]/55 text-[#E6C66E] flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(200,162,74,0.2)]">
            <HeartHandshake size={24} className="text-[#E6C66E]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-[#E6C66E] bg-[#C8A24A]/15 px-2.5 py-0.5 rounded-full border border-[#C8A24A]/40">
                رفيق الحياة الإيمانية
              </span>
              {tadabburStreak > 0 && (
                <span className="text-[10px] font-bold text-[#F3E5AB] bg-[#C8A24A]/20 px-2 py-0.5 rounded-full border border-[#C8A24A]/45">
                  خلوة {tadabburStreak}ي
                </span>
              )}
            </div>

            <h3 className="text-sm sm:text-base font-extrabold text-[#F3E5AB] mt-1 truncate">
              واحة السكينة والحقوق
            </h3>
            <p className="text-[11px] text-[#C4B998] mt-0.5 line-clamp-1">
              علاج القلوب بالقرآن · خلوة التدبر · بر الوالدين · مفكرة النوايا · دفتر الوصية
            </p>
          </div>
        </div>

        <button
          onClick={() => onOpenOasis('heart_healing')}
          className="athar-btn-primary text-xs px-3.5 py-2 shrink-0 flex items-center gap-1"
        >
          <span>دخول الواحة</span>
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* 5 Quick Access Interactive Buttons Grid */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3.5 pt-3 border-t border-[#C8A24A]/25">
        {/* 1. علاج القلوب */}
        <button
          onClick={() => onOpenOasis('heart_healing')}
          className="min-h-[42px] flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-[#16130D] hover:bg-[#221D14] text-[#F3E5AB] border border-[#C8A24A]/35 hover:border-[#E6C66E] text-xs font-bold transition-all active:scale-95"
        >
          <Heart size={14} className="text-[#E6C66E] shrink-0" />
          <span className="truncate">علاج القلوب</span>
        </button>

        {/* 2. خلوة التدبر */}
        <button
          onClick={() => onOpenOasis('tadabbur')}
          className="min-h-[42px] flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-[#16130D] hover:bg-[#221D14] text-[#F3E5AB] border border-[#C8A24A]/35 hover:border-[#E6C66E] text-xs font-bold transition-all active:scale-95"
        >
          <BookOpen size={14} className="text-[#E6C66E] shrink-0" />
          <span className="truncate">خلوة التدبر</span>
        </button>

        {/* 3. بر الوالدين */}
        <button
          onClick={() => onOpenOasis('kinship')}
          className="min-h-[42px] flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-[#16130D] hover:bg-[#221D14] text-[#F3E5AB] border border-[#C8A24A]/35 hover:border-[#E6C66E] text-xs font-bold transition-all active:scale-95"
        >
          <Users size={14} className="text-[#E6C66E] shrink-0" />
          <span className="truncate">بر وأرحام</span>
        </button>

        {/* 4. مفكرة النوايا */}
        <button
          onClick={() => onOpenOasis('intentions')}
          className="min-h-[42px] flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-[#16130D] hover:bg-[#221D14] text-[#F3E5AB] border border-[#C8A24A]/35 hover:border-[#E6C66E] text-xs font-bold transition-all active:scale-95"
        >
          <Compass size={14} className="text-[#E6C66E] shrink-0" />
          <span className="truncate">مفكرة النوايا</span>
        </button>

        {/* 5. دفتر الحقوق والوصية */}
        <button
          onClick={() => onOpenOasis('rights_wasiyyah')}
          className="min-h-[42px] flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-[#16130D] hover:bg-[#221D14] text-[#F3E5AB] border border-[#C8A24A]/35 hover:border-[#E6C66E] text-xs font-bold transition-all active:scale-95 col-span-2 sm:col-span-1"
        >
          <ShieldCheck size={14} className="text-[#E6C66E] shrink-0" />
          <span className="truncate">الديون والوصية</span>
        </button>
      </div>
    </div>
  );
};
