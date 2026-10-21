import React from 'react';
import { Flame } from 'lucide-react';

interface ActivityStreakCardProps {
  streakDays: number;
  className?: string;
}

export const ActivityStreakCard: React.FC<ActivityStreakCardProps> = ({
  streakDays,
  className = '',
}) => {
  return (
    <section
      className={`rounded-2xl border border-[#D9AE48]/25 bg-[#14120B] px-4 py-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.5)] flex items-center justify-between select-none ${className}`}
      dir="rtl"
    >
      {/* Right in RTL: Text & Vector Olive Sprig */}
      <div className="flex items-center gap-2 text-right">
        <div>
          <span className="text-xs font-bold text-[#F7F2E7] block leading-tight">
            الاستمرارية تصنع
          </span>
          <span className="text-xs font-bold text-[#D9AE48] block leading-tight">
            الفرق ..
          </span>
        </div>
        {/* Elegant Vector Olive Branch in Burnished Gold */}
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4 text-[#D9AE48] fill-current"
          opacity="0.85"
          aria-hidden="true"
        >
          <path d="M12 2C12 2 13 8 18 10C13 12 12 18 12 18C12 18 11 12 6 10C11 8 12 2 12 2Z" />
          <path d="M7 14C9 14 11 16 11 18C9 18 7 16 7 14Z" opacity="0.6" />
          <path d="M17 14C15 14 13 16 13 18C15 18 17 16 17 14Z" opacity="0.6" />
        </svg>
      </div>

      {/* Left in RTL: Consecutive Days & Flame Badge */}
      <div className="flex items-center gap-2.5">
        <div className="text-right">
          <span className="text-[10px] font-medium text-[#B5AD9B] block">
            أيام الاستمرار
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-[#F7F2E7] font-mono">
              {streakDays}
            </span>
            <span className="text-[10px] text-[#B5AD9B]">يوماً متتالياً</span>
          </div>
        </div>

        {/* Circular Gold Badge with Flame */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1E190F] to-[#2E2514] border border-[#D9AE48]/45 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(217,174,72,0.2)]">
          <Flame size={16} className="text-[#FFE6A0] fill-[#D9AE48]" />
        </div>
      </div>
    </section>
  );
};
