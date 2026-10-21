import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface ActivityStatCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const ActivityStatCard: React.FC<ActivityStatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-[#D9AE48]/20 bg-[#14120B] p-3 shadow-[0_4px_16px_rgba(0,0,0,0.5)] hover:border-[#D9AE48]/45 transition-all cursor-pointer flex flex-col justify-between min-h-[96px] active:scale-[0.98] select-none ${className}`}
      dir="rtl"
    >
      <div className="flex items-start justify-between">
        {/* Right side: Title, Number, Subtitle */}
        <div className="text-right">
          <span className="text-[11px] font-semibold text-[#B5AD9B] block mb-0.5">
            {title}
          </span>
          <span className="text-xl font-bold text-[#F7F2E7] font-mono block tracking-tight">
            {value}
          </span>
          <span className="text-[9.5px] text-[#B5AD9B] block mt-0.5">
            {subtitle}
          </span>
        </div>

        {/* Left side: Circular Gold Medallion Icon Badge */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1E190F] to-[#2E2514] border border-[#D9AE48]/35 flex items-center justify-center text-[#FFE6A0] shrink-0 shadow-[0_0_10px_rgba(217,174,72,0.18)]">
          {icon}
        </div>
      </div>

      {/* Discreet Navigation Indicator */}
      <div className="flex justify-end pt-1">
        <ChevronLeft size={13} className="text-[#6D6450]" />
      </div>
    </div>
  );
};
