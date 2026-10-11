import React from 'react';
import atharInnerMihrabLogoTransparent from '../assets/images/athar_inner_mihrab_logo_transparent.png';

interface AtharBrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  showWordmark?: boolean;
  centered?: boolean;
  className?: string;
}

/**
 * Athar Royal Prestige Brand Logo
 * Features ONLY the inner 24K Burnished Gold Mihrab Arch frame, Sacred Crescent, and Living Athar Sprout
 * on a 100% transparent background with zero black image/box.
 */
export const AtharBrandLogo: React.FC<AtharBrandLogoProps> = ({
  size = 'md',
  showWordmark = false,
  showSubtitle = false,
  centered = false,
  className = '',
}) => {
  const dimensions = {
    xs: {
      img: 'h-8 w-auto max-w-[32px]',
      halo: 'w-12 h-12',
      title: 'text-xs',
      sub: 'text-[9px]',
    },
    sm: {
      img: 'h-11 w-auto max-w-[44px]',
      halo: 'w-16 h-16',
      title: 'text-sm',
      sub: 'text-[10px]',
    },
    md: {
      img: 'h-16 sm:h-20 w-auto max-w-[70px]',
      halo: 'w-24 h-24',
      title: 'text-base sm:text-lg',
      sub: 'text-xs',
    },
    lg: {
      img: 'h-28 sm:h-36 w-auto max-w-[130px]',
      halo: 'w-44 h-44',
      title: 'text-xl sm:text-2xl',
      sub: 'text-xs sm:text-sm',
    },
    xl: {
      img: 'h-40 sm:h-52 w-auto max-w-[190px]',
      halo: 'w-60 h-60',
      title: 'text-2xl sm:text-3xl',
      sub: 'text-sm sm:text-base',
    },
  }[size];

  return (
    <div
      className={`inline-flex ${
        centered ? 'flex-col items-center justify-center' : 'items-center'
      } gap-3 select-none ${className}`}
    >
      {/* Royal 24K Gold Inner Mihrab Emblem (100% Transparent, No Black Background) */}
      <div className="relative flex items-center justify-center group">
        {/* Soft Royal Gold Ambient Aura */}
        <div
          className={`absolute ${dimensions.halo} rounded-full bg-radial from-[#E5C158]/35 via-[#C8A24A]/12 to-transparent blur-2xl pointer-events-none transition-all duration-700 group-hover:scale-115 group-hover:opacity-100`}
        />

        {/* Pure Transparent Inner Mihrab Arch Emblem */}
        <div className="relative flex items-center justify-center transition-transform duration-500 group-hover:scale-105 active:scale-95">
          <img
            src={atharInnerMihrabLogoTransparent}
            alt="شعار أثر الملكي - ATHAR"
            referrerPolicy="no-referrer"
            className={`${dimensions.img} object-contain select-none pointer-events-none filter drop-shadow-[0_8px_24px_rgba(200,162,74,0.38)]`}
            loading="eager"
          />
        </div>
      </div>

      {/* Optional Wordmark & Subtitle */}
      {(showWordmark || showSubtitle) && (
        <div className={`flex flex-col ${centered ? 'items-center text-center' : 'text-right'}`}>
          {showWordmark && (
            <div className="flex items-center gap-2">
              <span className={`font-quran font-extrabold text-[#F3E5AB] ${dimensions.title} drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]`}>
                أَثَــر
              </span>
              <span className="text-[10px] uppercase tracking-widest font-mono text-[#D4AF37]/90 font-bold">
                ATHAR
              </span>
            </div>
          )}
          {showSubtitle && (
            <span className={`text-[#B6B0A3] font-arabic font-medium ${dimensions.sub} mt-0.5`}>
              رفيقك اليومي للقرآن والصلاة والذكر
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default AtharBrandLogo;

