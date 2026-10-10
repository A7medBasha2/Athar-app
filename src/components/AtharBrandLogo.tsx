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
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-11 h-11 rounded-2xl',
    lg: 'w-16 h-16 rounded-3xl'
  }[size];

  const arabicSize = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl'
  }[size];

  const englishBadge = {
    sm: 'text-[9px] px-1.5 py-0.5',
    md: 'text-[10px] px-2 py-0.5',
    lg: 'text-xs px-2.5 py-1'
  }[size];

  return (
    <div className={`flex items-center gap-2.5 min-w-0 ${className}`}>
      {/* Modern Geometric Mihrab Emblem: Noble Gold + Emerald Accent + Deep Obsidian (Zero Stars) */}
      <div
        className={`${iconDimensions} bg-gradient-to-br from-[#131B24] via-[#0E151E] to-[#06090D] border border-[#D4AF37]/50 p-1.5 flex items-center justify-center shrink-0 shadow-lg relative overflow-hidden group`}
      >
        {/* Soft Emerald Glow Ambient */}
        <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none rounded-inherit" />

        <svg viewBox="0 0 40 40" className="w-full h-full text-[#D4AF37]" fill="none">
          <defs>
            <linearGradient id="logoGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF2D4" />
              <stop offset="40%" stopColor="#E5C158" />
              <stop offset="100%" stopColor="#9A7718" />
            </linearGradient>
            <linearGradient id="logoEmerald" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>

          {/* Outer Geometric Gold Arch */}
          <path
            d="M 9 32 L 9 19 C 9 12 14.5 7 20 4.5 C 25.5 7 31 12 31 19 L 31 32"
            stroke="url(#logoGold)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Inner Concentric Emerald Arch */}
          <path
            d="M 12.5 32 L 12.5 20 C 12.5 14.5 16 10.5 20 8.5 C 24 10.5 27.5 14.5 27.5 20 L 27.5 32"
            stroke="url(#logoEmerald)"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeOpacity="0.85"
          />

          {/* Apex Geometric Sacred Seed Teardrop (Pure Architectural finial - Zero stars) */}
          <path
            d="M 20 2 C 21 3.5 21.3 4.5 20 6 C 18.7 4.5 19 3.5 20 2 Z"
            fill="url(#logoGold)"
          />

          {/* Grounding Base Line with Emerald Core */}
          <line x1="9" y1="32" x2="17" y2="32" stroke="url(#logoGold)" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
          <circle cx="20" cy="32" r="1.8" fill="url(#logoEmerald)" />
          <line x1="23" y1="32" x2="31" y2="32" stroke="url(#logoGold)" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        </svg>
      </div>

      {/* Brand Typography: Authentic Arabic Calligraphy & Tracked Modern English */}
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={`${arabicSize} font-bold tracking-tight text-slate-100 font-quran gold-gradient-text select-none`}>
            أَثَـــــر
          </span>
          <span className={`${englishBadge} font-extrabold bg-[#D4AF37]/15 text-[#D4AF37] rounded-full border border-[#D4AF37]/35 tracking-[0.2em] font-sans select-none`}>
            ATHAR
          </span>
        </div>
        {showSubtitle && (
          <p className="text-[11px] text-slate-400 mt-0.5 truncate select-none">
            رفيقك اليومي للقرآن والصلاة والسكينة
          </p>
        )}
      </div>
    </div>
  );
};
