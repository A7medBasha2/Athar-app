import React from 'react';
import atharImperialTreeCrest from '../assets/images/athar_imperial_tree_crest_1791678632524.jpg';

interface AtharBrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  showWordmark?: boolean;
  centered?: boolean;
  className?: string;
}

/**
 * Unified Pure Royal Crest Logo for "أَثَر" (Athar)
 * Renders ONLY the royal golden Tree of Athar & Mihrab emblem without any external
 * "أثر" text wordmark or side lines, since the calligraphy "أثر" is already sculpted
 * inside the golden emblem itself.
 */
export const AtharBrandLogo: React.FC<AtharBrandLogoProps> = ({
  size = 'md',
  centered = false,
  className = '',
}) => {
  const dimensions = {
    xs: {
      box: 'w-8 h-8 rounded-[10px]',
      halo: 'w-11 h-11',
    },
    sm: {
      box: 'w-10 h-10 rounded-[13px]',
      halo: 'w-14 h-14',
    },
    md: {
      box: 'w-14 h-14 rounded-[18px]',
      halo: 'w-20 h-20',
    },
    lg: {
      box: 'w-24 h-24 rounded-[26px]',
      halo: 'w-32 h-32',
    },
    xl: {
      box: 'w-[124px] h-[124px] rounded-[30px]',
      halo: 'w-40 h-40',
    },
  }[size];

  return (
    <div
      className={`inline-flex ${
        centered ? 'flex-col items-center justify-center' : 'items-center'
      } select-none ${className}`}
    >
      {/* Royal Tree of Athar & Mihrab Crest Medallion */}
      <div className="relative flex items-center justify-center group">
        {/* Soft Royal Gold Ambient Aura */}
        <div
          className={`absolute ${dimensions.halo} rounded-full bg-radial from-[#E5C158]/25 via-[#C8A24A]/8 to-transparent blur-xl pointer-events-none transition-opacity duration-700`}
        />

        {/* Double-Beveled 24K Gold Sanctuary Frame */}
        <div
          className={`relative ${dimensions.box} overflow-hidden p-[1.5px] bg-gradient-to-b from-[#F5E1A4] via-[#C8A24A] to-[#6E5015] shadow-[0_12px_34px_rgba(0,0,0,0.9),0_0_24px_rgba(200,162,74,0.24)] transition-transform duration-500`}
        >
          <div className="w-full h-full rounded-[inherit] overflow-hidden bg-[#0A0A0C] relative flex items-center justify-center">
            <img
              src={atharImperialTreeCrest}
              alt="شعار أثر الملكي"
              className="w-full h-full object-cover scale-[1.06] contrast-[1.05] brightness-[1.02]"
              loading="eager"
            />
            {/* Subtle Inner Gold Rim & Depth Vignette */}
            <div className="absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-[#F9E8B2]/30 shadow-[inset_0_0_14px_rgba(0,0,0,0.45)] pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AtharBrandLogo;
