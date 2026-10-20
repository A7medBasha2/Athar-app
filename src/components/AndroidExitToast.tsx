import React, { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';

export const AndroidExitToast: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('اضغط مرة أخرى للخروج من أثر');

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const handleShowToast = (e: any) => {
      if (e?.detail?.message) {
        setMessage(e.detail.message);
      }
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => {
        setVisible(false);
      }, 2000);
    };

    window.addEventListener('athar_show_exit_toast', handleShowToast);
    return () => {
      window.removeEventListener('athar_show_exit_toast', handleShowToast);
      clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 max-w-[90vw] pointer-events-none select-none transition-all duration-200"
    >
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#15120C]/95 border border-[#C8A24A]/60 shadow-[0_10px_35px_rgba(0,0,0,0.9)] backdrop-blur-md text-[#F3E5AB] text-xs sm:text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="w-6 h-6 rounded-full bg-[#C8A24A]/20 flex items-center justify-center shrink-0 border border-[#C8A24A]/40 text-[#E6C66E]">
          <LogOut size={13} className="rotate-180" />
        </div>
        <span className="font-quran tracking-wide">{message}</span>
      </div>
    </div>
  );
};
