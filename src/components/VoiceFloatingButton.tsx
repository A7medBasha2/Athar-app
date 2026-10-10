import React, { useState, useEffect } from 'react';
import { Mic, Sparkles, Volume2 } from 'lucide-react';
import { VoiceAssistant } from '../services/voiceAssistantService';

interface VoiceFloatingButtonProps {
  onClick: () => void;
  className?: string;
}

export const VoiceFloatingButton: React.FC<VoiceFloatingButtonProps> = ({
  onClick,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Global keyboard shortcut: Pressing 'v' or 'V' toggles voice assistant
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === 'v' || e.key === 'V' || e.key === 'ر') {
        e.preventDefault();
        onClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClick]);

  return (
    <div className={`fixed bottom-24 left-4 z-40 select-none ${className}`}>
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#B38728] via-[#FBF5B7] to-[#DAA520] p-[2px] shadow-lg shadow-[#D4AF37]/30 hover:shadow-xl hover:shadow-[#D4AF37]/50 active:scale-95 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#D4AF37]/50"
        aria-label="المساعد الصوتي لأثر وخدمات ذوي الهمم - اضغط للتحدث أو اضغط حرف V"
        title="المساعد الصوتي لأثر (اضغط للتحدث أو اضغط حرف V)"
      >
        {/* Pulsing golden aura ring */}
        <span className="absolute inset-0 rounded-full bg-[#D4AF37]/25 animate-ping opacity-60 pointer-events-none" />

        {/* Inner Dark Surface with Gold Icon */}
        <div className="w-full h-full rounded-full bg-[#0E1318] flex items-center justify-center transition-colors group-hover:bg-[#151D24]">
          <Mic size={22} className="text-[#D4AF37] group-hover:scale-110 transition-transform duration-200" />
        </div>

        {/* Floating audio badge */}
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D4AF37] border-2 border-[#080B0E] flex items-center justify-center shadow">
          <Sparkles size={9} className="text-slate-950 font-bold" />
        </span>
      </button>

      {/* Screen Reader Label / Tooltip */}
      <span className="sr-only">
        المساعد الصوتي الذكي لأثر - مخصص لمكفوفي البصر وذوي الهمم والأوامر الصوتية السريعة
      </span>
    </div>
  );
};
