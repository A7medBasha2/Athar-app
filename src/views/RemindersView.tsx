import React from 'react';

interface RemindersViewProps {
  onClose?: () => void;
}

export const RemindersView: React.FC<RemindersViewProps> = () => {
  return (
    <div className="athar-page-container">
      <div className="athar-card flex flex-col items-center justify-center p-8 text-center min-h-[360px]">
        <div className="w-16 h-16 rounded-2xl bg-[#D6B36A]/10 border border-[#D6B36A]/30 flex items-center justify-center mb-4 text-2xl text-[#E6C66E]">
          ✨
        </div>
        <h2 className="text-xl font-bold text-[#F2EBDD] mb-2 font-arabic">
          تم حذف نظام التنبيهات والأذان بالكامل
        </h2>
        <p className="text-sm text-[#B6B0A3] max-w-sm leading-relaxed mb-6">
          تم تنظيف كافة واجهات ومحركات التنبيهات السابقة وحذف الأذان ومشتملاته، لتكون الصفحة والمنظومة جاهزة لإعادة البناء من الصفر بحرية تامة.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#151515] border border-[#D6B36A]/20 text-[#D6B36A] text-xs font-semibold">
          <span>نظام نقي وجاهز للتطوير من الصفر</span>
        </div>
      </div>
    </div>
  );
};

export default RemindersView;
