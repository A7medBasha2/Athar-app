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
      className={`rounded-[20px] border border-[#D9AE48]/24 bg-[#0c0a07] p-3.5 shadow-[0_4px_18px_rgba(0,0,0,0.6)] hover:border-[#D9AE48]/45 transition-all cursor-pointer flex flex-col justify-between min-h-[114px] active:scale-[0.98] select-none group ${className}`}
      dir="rtl"
    >
      <div className="flex items-start justify-between">
        {/* Right side: Title, Number */}
        <div className="text-right flex-1">
          <span className="text-[14.5px] font-bold text-[#FAF4E8] block mb-1">
            {title}
          </span>
          <span className="text-[26px] font-bold text-[#FAF4E8] font-mono block leading-none tracking-tight group-hover:text-[#FFE6A0] transition-colors">
            {value}
          </span>
        </div>

        {/* Left side: Medallion */}
        <div className="w-[46px] h-[46px] shrink-0">
          {icon}
        </div>
      </div>

      {/* Discreet Navigation Indicator */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-[11px] font-medium text-[#8E8675] block">
          {subtitle}
        </span>
        <span className="text-[15px] text-[#8E8675] font-bold group-hover:text-[#D9AE48] transition-colors">
          ›
        </span>
      </div>
    </div>
  );
};
