import React from 'react';
import { ChevronLeft } from 'lucide-react';
import journeyBannerMosqueImg from '../../assets/images/journey_banner_mosque_1792548139678.jpg';

interface JourneyBannerProps {
  onClick?: () => void;
  className?: string;
}

export const JourneyBanner: React.FC<JourneyBannerProps> = ({
  onClick,
  className = '',
}) => {
  return (
    <section
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border border-[#D9AE48]/30 bg-[#120F09] min-h-[76px] shadow-[0_6px_20px_rgba(0,0,0,0.6)] cursor-pointer hover:border-[#FFE6A0]/50 active:scale-[0.99] transition-all select-none group ${className}`}
      dir="rtl"
    >
      {/* Real Golden Mosque & Minarets Architectural Artwork */}
      <div className="absolute inset-y-0 left-0 w-3/4 pointer-events-none overflow-hidden">
        <img
          src={journeyBannerMosqueImg}
          alt="رحلتك مع أثر"
          className="w-full h-full object-cover object-left opacity-75 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700"
        />
        {/* Smooth horizontal gradient to blend seamlessly into card */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#120F09]/40 to-[#120F09]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 h-full">
        <div className="text-right">
          <div className="flex items-center gap-1.5 text-sm font-bold text-[#F7F2E7] mb-0.5 tracking-tight group-hover:text-[#FFE6A0] transition-colors">
            <span>رحلتك مع أثر</span>
            <ChevronLeft size={15} className="text-[#FFE6A0] transition-transform group-hover:-translate-x-0.5" />
          </div>
          <p className="text-[10.5px] text-[#B5AD9B] font-medium">
            خطوات صغيرة .. أثر كبير
          </p>
        </div>
      </div>
    </section>
  );
};
