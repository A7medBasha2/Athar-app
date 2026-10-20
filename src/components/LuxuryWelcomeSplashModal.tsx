import React from 'react';
import mosqueCrescentSplashImg from '../assets/images/mosque_crescent_splash_1791658894446.webp';
import { AtharBrandLogo } from './AtharBrandLogo';
import { ChevronLeft } from 'lucide-react';

interface LuxuryWelcomeSplashModalProps {
  isOpen: boolean;
  onEnter: () => void;
}

export const LuxuryWelcomeSplashModal: React.FC<LuxuryWelcomeSplashModalProps> = ({
  isOpen,
  onEnter,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#050403] flex items-center justify-center select-none font-arabic animate-fadeIn">
      <div className="relative w-full max-w-lg h-full max-h-[100dvh] overflow-hidden flex flex-col justify-between bg-[#070605] sm:border-x sm:border-[#C8A24A]/35 shadow-2xl">
        {/* Full-Screen Luxury Mosque, Golden Crescent & Lantern Artwork with Atmospheric Darkening */}
        <img
          src={mosqueCrescentSplashImg}
          alt="مسجد وهلال ذهبي وفانوس مضيء"
          referrerPolicy="no-referrer"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-60 animate-adhan-kenburns"
        />

        {/* Deep Black Obsidian Overlay to make the Gold Mihrab Logo & Sacred Calligraphy Pop */}
        <div className="absolute inset-0 bg-[#070605]/50 pointer-events-none" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(5,4,3,0.75) 0%, rgba(5,4,3,0.40) 35%, rgba(5,4,3,0.85) 70%, rgba(5,4,3,0.98) 100%)',
          }}
        />

        {/* Top spacer to preserve visual hierarchy */}
        <div className="relative z-10 pt-6 px-6" />

        {/* Bottom Centered Luxury Calligraphy & Enter CTA */}
        <div className="relative z-10 px-6 pb-10 pt-4 text-center space-y-4 flex flex-col items-center">
          {/* Centered Athar Royal Logo directly above the golden dot */}
          <div className="flex items-center justify-center transform hover:scale-105 transition-transform duration-300 drop-shadow-[0_8px_25px_rgba(0,0,0,0.9)]">
            <AtharBrandLogo size="md" showWordmark={false} showSubtitle={false} centered={true} />
          </div>

          {/* Decorative Golden Ornament Line with Center Diamond Dot */}
          <div className="flex items-center justify-center gap-3">
            <span className="h-[1px] w-14 bg-gradient-to-r from-transparent to-[#E6C66E]" />
            <span className="w-2.5 h-2.5 rotate-45 bg-[#E6C66E] shadow-[0_0_12px_#E6C66E]" />
            <span className="h-[1px] w-14 bg-gradient-to-l from-transparent to-[#E6C66E]" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#FFF9E6] font-quran leading-snug drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)]">
              قربك من الله
              <span className="block text-[#E6C66E] mt-1">بداية لحياة أجمل</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#D8CCA8] font-medium max-w-xs mx-auto leading-relaxed">
              تطبيقك اليومي للعبادة والقرآن والطمأنينة
            </p>
          </div>

          <div className="pt-2 max-w-xs mx-auto">
            <button
              type="button"
              onClick={onEnter}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] text-[#070707] font-extrabold text-sm flex items-center justify-center gap-2 shadow-[0_8px_30px_rgba(230,198,110,0.4)] hover:brightness-110 active:scale-98 transition-all border border-[#FFF9E2]"
            >
              <span>ابدأ رحلتك الإيمانية</span>
              <ChevronLeft size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

