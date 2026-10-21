import React from 'react';

interface ProfileCompletionCardProps {
  percentage: number;
  onOpenEdit?: () => void;
  className?: string;
}

export const ProfileCompletionCard: React.FC<ProfileCompletionCardProps> = ({
  percentage,
  onOpenEdit,
  className = '',
}) => {
  return (
    <section
      onClick={onOpenEdit}
      className={`rounded-2xl border border-[#D9AE48]/25 bg-[#14120B] px-4 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.5)] cursor-pointer hover:border-[#D9AE48]/45 transition-all active:scale-[0.99] select-none ${className}`}
      dir="rtl"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-[#F7F2E7] tracking-tight">
          اكتمال الملف الشخصي
        </span>
        <span className="text-xs font-bold text-[#FFE6A0] font-mono">
          {percentage}%
        </span>
      </div>

      {/* Slim, Rounded Metallic Gold Progress Bar */}
      <div className="w-full h-1.5 rounded-full bg-[#201B11] overflow-hidden mb-1.5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#D9AE48] via-[#FFE6A0] to-[#D9AE48] shadow-[0_0_8px_rgba(217,174,72,0.5)] transition-all duration-700"
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>

      <p className="text-[10px] text-[#B5AD9B] text-center font-medium">
        أكمل ملفك الشخصي لتجربة أفضل
      </p>
    </section>
  );
};
