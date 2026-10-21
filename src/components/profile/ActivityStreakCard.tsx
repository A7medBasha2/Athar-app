import React from 'react';
import hdStatFlameCircleImg from '../../assets/images/hd_stat_flame_circle.png';
import cropSprigImg from '../../assets/images/crop_sprig.png';

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
      className={`rounded-[22px] border border-[#D9AE48]/24 bg-[#0c0a07] p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.6)] flex items-center justify-between select-none ${className}`}
      dir="rtl"
    >
      {/* Right in RTL: Text & Botanical Sprig */}
      <div className="flex items-center justify-between flex-1 pe-3">
        <div className="text-right">
          <span className="text-[13.5px] font-bold text-[#FAF4E8] block leading-snug">
            الاستمرارية تصنع
          </span>
          <span className="text-[13.5px] font-bold text-[#D9AE48] block leading-snug">
            الفرق ..
          </span>
        </div>
        <div className="w-6 h-8 shrink-0 flex items-center justify-center">
          <img
            src={cropSprigImg}
            alt="غصن أثر"
            className="w-full h-full object-contain filter drop-shadow-[0_1px_6px_rgba(217,174,72,0.25)]"
          />
        </div>
      </div>

      {/* Center Divider Line */}
      <div className="h-10 w-px bg-[#2a2318] shrink-0" />

      {/* Left in RTL: Consecutive Days & Flame Badge */}
      <div className="flex items-center gap-2.5 flex-1 ps-3">
        {/* Flame Circle Badge */}
        <div className="w-[44px] h-[44px] shrink-0">
          <img
            src={hdStatFlameCircleImg}
            alt="شعلة الاستمرار"
            className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(217,174,72,0.35)]"
          />
        </div>

        <div className="text-right">
          <span className="text-[11.5px] font-medium text-[#B8AF9E] block leading-tight">
            أيام الاستمرار
          </span>
          <span className="text-[22px] font-bold text-[#FAF4E8] font-mono block leading-none my-0.5">
            {streakDays}
          </span>
          <span className="text-[10px] text-[#8E8675] block leading-tight">
            يوماً متتالياً
          </span>
        </div>
      </div>
    </section>
  );
};
