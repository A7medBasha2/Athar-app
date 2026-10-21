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
      className={`rounded-2xl border border-[#D9AE48]/25 bg-[#14120B] p-3 shadow-[0_4px_16px_rgba(0,0,0,0.5)] hover:border-[#D9AE48]/50 transition-all cursor-pointer flex flex-col justify-between min-h-[96px] active:scale-[0.98] select-none group ${className}`}
      dir="rtl"
    >
      <div className="flex items-start justify-between">
        {/* Right side: Title, Number, Subtitle */}
        <div className="text-right">
          <span className="text-[11px] font-semibold text-[#B5AD9B] block mb-0.5">
            {title}
          </span>
          <span className="text-xl font-bold text-[#F7F2E7] font-mono block tracking-tight group-hover:text-[#FFE6A0] transition-colors">
            {value}
          </span>
          <span className="text-[9.5px] text-[#B5AD9B] block mt-0.5">
            {subtitle}
          </span>
        </div>

        {/* Left side: Dimensional Metallic 24K Gold Coin Medallion */}
        <div className="relative w-9 h-9 rounded-full p-[1.5px] bg-gradient-to-tr from-[#916E25] via-[#FFE6A0] to-[#D9AE48] shadow-[0_2px_10px_rgba(217,174,72,0.3)] shrink-0 group-hover:scale-105 transition-transform">
          <div className="w-full h-full rounded-full bg-gradient-to-b from-[#1C170E] to-[#120F09] flex items-center justify-center text-[#FFE6A0] shadow-inner">
            {icon}
          </div>
        </div>
      </div>

      {/* Discreet Navigation Indicator */}
      <div className="flex justify-end pt-1">
        <ChevronLeft size={13} className="text-[#6D6450] group-hover:text-[#D9AE48] transition-colors" />
      </div>
    </div>
  );
};
