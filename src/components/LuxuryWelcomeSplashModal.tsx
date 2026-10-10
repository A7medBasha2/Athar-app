import React from 'react';
import { LUXURY_IMAGES } from '../data/storiesAndExploreData';
import { Sparkles, ChevronLeft } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-[#050505] flex items-center justify-center select-none animate-fadeIn">
      <div className="relative w-full max-w-lg h-full max-h-[100dvh] overflow-hidden flex flex-col justify-between bg-[#070707] sm:border-x sm:border-[#C8A24A]/30 shadow-2xl">
        {/* Full-Screen Luxury Mosque, Golden Crescent & Lantern Artwork */}
        <img
          src={LUXURY_IMAGES.mosqueSplash}
          alt="مسجد وهلال ذهبي وفانوس مضيء"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-90"
        />

        {/* Deep Vignette & Golden Gradient Overlay for Crystal-Clear Typography */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/45 to-transparent" />
        <div className="absolute inset-0 bg-radial from-transparent via-transparent to-[#050505]/70" />

        {/* Top Brand Badge */}
        <div className="relative z-10 pt-8 px-6 flex items-center justify-between">
          <div className="px-3.5 py-1.5 rounded-full bg-[#0D0C0A]/80 backdrop-blur-md border border-[#C8A24A]/45 flex items-center gap-2">
            <Sparkles size={14} className="text-[#E6C66E]" />
            <span className="text-xs font-extrabold text-[#E6C66E]">أَثَر · رفيقك للعبادة والطمأنينة</span>
          </div>

          <button
            onClick={onEnter}
            className="px-3 py-1.5 rounded-full bg-[#0D0C0A]/75 hover:bg-[#181612] border border-[#C8A24A]/35 text-xs font-bold text-[#C4B998] hover:text-white transition-colors"
          >
            تخطي
          </button>
        </div>

        {/* Bottom Centered Luxury Calligraphy & Enter CTA (Matches Reference Splash Screen) */}
        <div className="relative z-10 px-6 pb-10 pt-16 text-center space-y-5">
          {/* Decorative Golden Ornament Line */}
          <div className="flex items-center justify-center gap-3">
            <span className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#C8A24A]" />
            <span className="w-2 h-2 rotate-45 bg-[#E6C66E] shadow-[0_0_10px_#E6C66E]" />
            <span className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#C8A24A]" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-snug drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)]">
              قربك من الله
              <span className="block text-[#E6C66E] mt-1">بداية لحياة أجمل</span>
            </h1>
            <p className="text-sm text-[#C4B998] font-medium max-w-xs mx-auto leading-relaxed">
              تطبيقك اليومي للعبادة والطمأنينة
            </p>
          </div>

          <div className="pt-2 max-w-xs mx-auto">
            <button
              onClick={onEnter}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#E6C66E] via-[#C8A24A] to-[#A6802B] text-[#070707] font-extrabold text-sm flex items-center justify-center gap-2 shadow-[0_8px_30px_rgba(200,162,74,0.4)] hover:brightness-110 active:scale-98 transition-all border border-[#F3E5AB]"
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
