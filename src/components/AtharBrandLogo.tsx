import React from 'react';

interface AtharBrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
}

export const AtharBrandLogo: React.FC<AtharBrandLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  className = ''
}) => {
  const iconDimensions = {
    sm: 'w-9 h-9 rounded-xl',
    md: 'w-11 h-11 rounded-2xl',
    lg: 'w-16 h-16 rounded-3xl'
  }[size];

  const arabicSize = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl'
  }[size];

  return (
    <div className={`flex items-center gap-3 min-w-0 ${className}`}>
      {/* Modern Geometric Mihrab Emblem: High-Contrast Gold + Deep Obsidian */}
      <div
        className={`${iconDimensions} bg-[#0E0D0A] border border-[#C8A24A]/65 p-1.5 flex items-center justify-center shrink-0 shadow-[0_0_18px_rgba(200,162,74,0.28)] relative overflow-hidden`}
      >
        <svg viewBox="0 0 40 40" className="w-full h-full text-[#E6C66E]" fill="none">
          <defs>
            <linearGradient id="logoGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF6D6" />
              <stop offset="50%" stopColor="#E6C66E" />
              <stop offset="100%" stopColor="#C8A24A" />
            </linearGradient>
          </defs>

          {/* Outer Geometric Gold Arch */}
          <path
            d="M 9 32 L 9 19 C 9 12 14.5 7 20 4.5 C 25.5 7 31 12 31 19 L 31 32"
            stroke="url(#logoGold)"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Inner Concentric Gold Arch */}
          <path
            d="M 12.5 32 L 12.5 20 C 12.5 14.5 16 10.5 20 8.5 C 24 10.5 27.5 14.5 27.5 20 L 27.5 32"
            stroke="url(#logoGold)"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeOpacity="0.85"
          />

          {/* Apex Geometric Finial */}
          <path
            d="M 20 2 C 21 3.5 21.3 4.5 20 6 C 18.7 4.5 19 3.5 20 2 Z"
            fill="url(#logoGold)"
          />

          {/* Grounding Base Line */}
          <line x1="9" y1="32" x2="17" y2="32" stroke="url(#logoGold)" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="20" cy="32" r="1.8" fill="url(#logoGold)" />
          <line x1="23" y1="32" x2="31" y2="32" stroke="url(#logoGold)" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>

      {/* Brand Typography: Pure Arabic Calligraphy */}
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={`${arabicSize} font-bold tracking-tight text-white font-quran gold-gradient-text select-none`}>
            أَثَـــــر
          </span>
        </div>
        {showSubtitle && (
          <p className="text-[11px] text-[#C4B998] font-medium mt-0.5 truncate select-none">
            رفيقك اليومي للقرآن والصلاة والسكينة
          </p>
        )}
      </div>
    </div>
  );
};
