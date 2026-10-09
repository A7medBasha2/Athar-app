import React from 'react';

interface AndroidNavigationBarProps {
  onBack?: () => void;
  onHome?: () => void;
}

export const AndroidNavigationBar: React.FC<AndroidNavigationBarProps> = ({
  onHome
}) => {
  return (
    <div className="w-full h-5 flex items-center justify-center select-none z-30 bg-transparent pb-1">
      {/* Android Material 3 Gesture Navigation Pill */}
      <button
        onClick={onHome}
        className="w-32 h-1 bg-slate-600/70 hover:bg-[#D4AF37]/80 rounded-full transition-colors active:scale-95"
        title="شريط الإيماءات - الرئيسية"
        aria-label="الرئيسية"
      />
    </div>
  );
};
