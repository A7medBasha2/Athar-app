import React from 'react';
import mosqueCrescentSplashImg from '../assets/images/mosque_crescent_splash_1791658894446.jpg';
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
        {/* Full-Screen Luxury Mosque, Golden Crescent & Lantern Artwork */}
        <img
          src={mosqueCrescentSplashImg}
          alt="مسجد وهلال ذهبي وفانوس مضيء"
          referrerPolicy="no-referrer"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-95 animate-adhan-kenburns"
        />

        {/* Deep Vignette & Golden Gradient Overlay for Crystal-Clear Typography */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(5,4,3,0.45) 0%, rgba(5,4,3,0.08) 38%, rgba(5,4,3,0.72) 74%, rgba(5,4,3,0.96) 100%)',
          }}
        />

        {/* Top Brand Badge with Unified Royal Emblem */}
        <div className="relative z-10 pt-8 px-6 flex items-center justify-between">
          <AtharBrandLogo size="md" showWordmark={true} />

          <button
            type="button"
            onClick={onEnter}
            className="px-4 py-1.5 rounded-xl bg-[#120F09]/80 hover:bg-[#1E180E] border border-[#C8A24A]/45 text-xs font-bold text-[#E6C66E] hover:text-[#FFF2C2] transition-all backdrop-blur-md"
          >
            تخطي
          </button>
        </div>

        {/* Bottom Centered Luxury Calligraphy & Enter CTA */}
        <div className="relative z-10 px-6 pb-10 pt-16 text-center space-y-5">
          {/* Decorative Golden Ornament Line */}
          <div className="flex items-center justify-center gap-3">
            <span className="h-[1px] w-14 bg-gradient-to-r from-transparent to-[#E6C66E]" />
            <span className="w-2 h-2 rotate-45 bg-[#E6C66E] shadow-[0_0_12px_#E6C66E]" />
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

