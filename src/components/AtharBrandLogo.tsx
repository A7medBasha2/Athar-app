import React from 'react';
import atharImperialTreeCrest from '../assets/images/athar_imperial_tree_crest_trimmed.png';

interface AtharBrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  showWordmark?: boolean;
  centered?: boolean;
  className?: string;
}

/**
 * Unified Pure Royal Crest Logo for "أَثَر" (Athar)
 * Renders ONLY the royal golden Tree of Athar & Mihrab emblem with all outer black edges removed,
 * preserving 100% of the sacred Mihrab arch and golden Tree with smooth royal radiance.
 */
export const AtharBrandLogo: React.FC<AtharBrandLogoProps> = ({
  size = 'md',
  centered = false,
  className = '',
}) => {
  const dimensions = {
    xs: {
      img: 'h-8 w-auto max-w-[28px]',
      halo: 'w-10 h-10',
    },
    sm: {
      img: 'h-10 w-auto max-w-[34px]',
      halo: 'w-12 h-12',
    },
    md: {
      img: 'h-14 sm:h-16 w-auto max-w-[52px]',
      halo: 'w-20 h-20',
    },
    lg: {
      img: 'h-24 sm:h-28 w-auto max-w-[96px]',
      halo: 'w-36 h-36',
    },
    xl: {
      img: 'h-36 sm:h-40 w-auto max-w-[130px]',
      halo: 'w-48 h-48',
    },
  }[size];

  return (
    <div
      className={`inline-flex ${
        centered ? 'flex-col items-center justify-center' : 'items-center'
      } select-none ${className}`}
    >
      {/* Royal Tree of Athar & Mihrab Crest - Pure Frameless Arched Silhouette */}
      <div className="relative flex items-center justify-center group">
        {/* Soft Royal Gold Ambient Aura */}
        <div
          className={`absolute ${dimensions.halo} rounded-full bg-radial from-[#E5C158]/25 via-[#C8A24A]/8 to-transparent blur-xl pointer-events-none transition-opacity duration-700`}
        />

        {/* Pure Mihrab Arch & Athar Tree Emblem (No square box, no black outer borders) */}
        <div className="relative flex items-center justify-center transition-transform duration-500 group-hover:scale-105 active:scale-95">
          <img
            src={atharImperialTreeCrest}
            alt="شعار أثر الملكي - المحراب والشجرة"
            className={`${dimensions.img} object-contain select-none pointer-events-none filter drop-shadow-[0_4px_18px_rgba(200,162,74,0.32)] drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]`}
            loading="eager"
          />
        </div>
      </div>
    </div>
  );
};

export default AtharBrandLogo;
