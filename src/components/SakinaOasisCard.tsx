import React from 'react';
import { 
  Heart, BookOpen, Users, Compass, ShieldCheck, 
  Sparkles, ChevronLeft, ShieldAlert, HeartHandshake
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
  pendingDebtsCount = 0,
  intentionsCount = 0,
  tadabburStreak = 0
}) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#15232A] via-[#111A22] to-[#0E151D] border border-emerald-500/40 hover:border-[#D4AF37]/70 rounded-3xl p-4 sm:p-5 shadow-2xl transition-all duration-300">
      {/* Dynamic Background subtle Islamic Arches */}
      <RotatingCardBackground slot="kaaba" cardOffset={3} intervalMs={24000} opacity={0.25} />

      {/* Main Header / Banner */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div 
          onClick={() => onOpenOasis('heart_healing')}
          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37]/25 via-emerald-500/20 to-teal-500/20 border border-[#D4AF37]/45 text-[#D4AF37] flex items-center justify-center shrink-0 shadow-lg">
            <HeartHandshake size={24} className="text-[#D4AF37]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                جديد وحصري · رفيق الحياة الإيمانية
              </span>
              {tadabburStreak > 0 && (
                <span className="text-[10px] font-bold text-[#D4AF37] bg-[#D4AF37]/15 px-1.5 py-0.5 rounded-full border border-[#D4AF37]/30">
                  خلوة {tadabburStreak}ي
                </span>
              )}
            </div>

            <h3 className="text-sm sm:text-base font-bold text-slate-100 mt-1 truncate">
              واحة السكينة والحقوق
            </h3>
            <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
              علاج القلوب بالقرآن · خلوة التدبر · بر الوالدين · مفكرة النوايا · دفتر الوصية
            </p>
          </div>
        </div>

        <button
          onClick={() => onOpenOasis('heart_healing')}
          className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E5C158] hover:brightness-110 text-slate-950 font-bold text-xs shrink-0 shadow-md active:scale-95 transition-all flex items-center gap-1"
        >
          <span>دخول الواحة</span>
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* 5 Quick Access Interactive Buttons Grid */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3.5 pt-3 border-t border-slate-800/80">
        {/* 1. علاج القلوب */}
        <button
          onClick={() => onOpenOasis('heart_healing')}
          className="min-h-[44px] flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-[#131D27]/90 hover:bg-[#1A2836] text-amber-300 border border-amber-500/30 text-xs font-bold transition-all active:scale-95"
        >
          <Heart size={14} className="text-amber-400 shrink-0" />
          <span className="truncate">علاج القلوب</span>
        </button>

        {/* 2. خلوة التدبر */}
        <button
          onClick={() => onOpenOasis('tadabbur')}
          className="min-h-[44px] flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-[#131D27]/90 hover:bg-[#1A2836] text-[#D4AF37] border border-[#D4AF37]/30 text-xs font-bold transition-all active:scale-95"
        >
          <BookOpen size={14} className="text-[#D4AF37] shrink-0" />
          <span className="truncate">خلوة التدبر</span>
        </button>

        {/* 3. بر الوالدين */}
        <button
          onClick={() => onOpenOasis('kinship')}
          className="min-h-[44px] flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-[#131D27]/90 hover:bg-[#1A2836] text-rose-300 border border-rose-500/30 text-xs font-bold transition-all active:scale-95"
        >
          <Users size={14} className="text-rose-400 shrink-0" />
          <span className="truncate">بر وأرحام</span>
        </button>

        {/* 4. مفكرة النوايا */}
        <button
          onClick={() => onOpenOasis('intentions')}
          className="min-h-[44px] flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-[#131D27]/90 hover:bg-[#1A2836] text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all active:scale-95"
        >
          <Compass size={14} className="text-emerald-400 shrink-0" />
          <span className="truncate">مفكرة النوايا</span>
        </button>

        {/* 5. دفتر الحقوق والوصية */}
        <button
          onClick={() => onOpenOasis('rights_wasiyyah')}
          className="min-h-[44px] flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-[#131D27]/90 hover:bg-[#1A2836] text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all active:scale-95 col-span-2 sm:col-span-1"
        >
          <ShieldCheck size={14} className="text-indigo-400 shrink-0" />
          <span className="truncate">الديون والوصية</span>
        </button>
      </div>
    </div>
  );
};
