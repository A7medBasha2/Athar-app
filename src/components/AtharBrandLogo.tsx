import React from 'react';
import atharSereneMonogram from '../assets/images/athar_serene_royal_monogram_1791678236702.jpg';

interface AtharBrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  showWordmark?: boolean;
  centered?: boolean;
  className?: string;
}

/**
 * Quiet-Luxury Serene Royal Monogram Emblem for "أَثَر" (Athar)
 * Features a bespoke satin-brushed 24K champagne gold flowing calligraphic ribbon
 * of "أثر" with a single golden olive-leaf drop of impact inside a whisper-thin
 * royal gold ring on deep matte obsidian velvet. Calm, unique, and completely star-free.
 */
export const AtharBrandLogo: React.FC<AtharBrandLogoProps> = ({
  size = 'md',
  showSubtitle = false,
  showWordmark = true,
  centered = false,
  className = '',
}) => {
  const dimensions = {
    sm: {
      box: 'w-11 h-11 rounded-[14px]',
      title: 'text-xl',
      subtitle: 'text-[10px]',
      halo: 'w-14 h-14',
    },
    md: {
      box: 'w-14 h-14 rounded-[18px]',
      title: 'text-2xl',
      subtitle: 'text-[11px]',
      halo: 'w-18 h-18',
    },
    lg: {
      box: 'w-24 h-24 rounded-[28px]',
      title: 'text-3xl',
      subtitle: 'text-xs',
      halo: 'w-28 h-28',
    },
    xl: {
      box: 'w-[122px] h-[122px] rounded-[34px]',
      title: 'text-4xl sm:text-5xl',
      subtitle: 'text-xs sm:text-sm',
      halo: 'w-36 h-36',
    },
  }[size];

  return (
    <div
      className={`inline-flex ${
        centered ? 'flex-col items-center text-center gap-2.5' : 'items-center gap-3.5'
      } select-none ${className}`}
    >
      {/* Calm Royal Monogram Medallion */}
      <div className="relative flex items-center justify-center group">
        {/* Soft, calm champagne-gold ambient aura */}
        <div
          className={`absolute ${dimensions.halo} rounded-full bg- radial from-[#D8B768]/20 via-[#C8A24A]/5 to-transparent blur-xl pointer-events-none transition-opacity duration-700`}
        />

        {/* Whisper-thin satin gold frame housing the bespoke monogram */}
        <div
          className={`relative ${dimensions.box} overflow-hidden p-[1.5px] bg-gradient-to-b from-[#EED694]/70 via-[#C8A24A]/35 to-[#6E511A]/60 shadow-[0_14px_38px_rgba(0,0,0,0.85),0_0_24px_rgba(200,162,74,0.16)] transition-transform duration-500`}
        >
          <div className="w-full h-full rounded-[inherit] overflow-hidden bg-[#08080A] relative flex items-center justify-center">
            <img
              src={atharSereneMonogram}
              alt="شعار أثر الملكي"
              className="w-full h-full object-cover scale-[1.08] contrast-[1.04] brightness-[1.02]"
              loading="eager"
            />
            {/* Subtle museum-glass vignette for seamless edge blending */}
            <div className="absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-[#F3DF9E]/20 shadow-[inset_0_0_18px_rgba(8,8,10,0.55)] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Optional Wordmark & Calm Subtitle */}
      {showWordmark && (
        <div className={`flex flex-col ${centered ? 'items-center' : 'items-start'} leading-none`}>
          <div className="flex items-center gap-3">
            {centered && (
              <span className="w-8 h-[1px] bg-gradient-to-l from-[#D4AF37]/65 to-transparent rounded-full" />
            )}
            <span
              className={`font-amiri font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-b from-[#FAF0CA] via-[#DEC06F] to-[#B68D36] drop-shadow-[0_2px_10px_rgba(200,162,74,0.22)] ${dimensions.title}`}
            >
              أَثَـر
            </span>
            {centered && (
              <span className="w-8 h-[1px] bg-gradient-to-r from-[#D4AF37]/65 to-transparent rounded-full" />
            )}
          </div>

          {showSubtitle && (
            <span
              className={`font-cairo font-medium text-[#D6C7A9]/75 tracking-[0.16em] mt-1.5 ${dimensions.subtitle}`}
            >
              رفيقك الإسلامي الملكي
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default AtharBrandLogo;
