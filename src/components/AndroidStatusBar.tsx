import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, Bell, Lock } from 'lucide-react';

interface AndroidStatusBarProps {
  onToggleLockScreen?: () => void;
  onOpenNotifications?: () => void;
  hasNotifications?: boolean;
}

export const AndroidStatusBar: React.FC<AndroidStatusBarProps> = ({
  onToggleLockScreen,
  onOpenNotifications,
  hasNotifications
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-8 px-4 flex items-center justify-between text-xs text-slate-400 select-none z-30 bg-transparent backdrop-blur-[2px]">
      {/* Right side in Arabic RTL: Time */}
      <div className="font-semibold text-slate-200 tabular-nums tracking-wide text-xs">
        {currentTime || '12:00'}
      </div>

      {/* Center brand subtlety */}
      <div className="flex items-center gap-1.5 opacity-60 text-[11px] font-medium text-[#D4AF37]">
        <span>أَثَر</span>
        <span className="text-[9px] tracking-widest text-slate-400">ATHAR</span>
      </div>

      {/* Left side in Arabic RTL: System status icons + quick actions */}
      <div className="flex items-center gap-2.5 text-slate-400">
        {hasNotifications && (
          <button 
            onClick={onOpenNotifications}
            className="text-[#D4AF37] hover:text-white transition-colors relative"
            title="الإشعارات والتنبيهات"
            aria-label="الإشعارات والتنبيهات"
          >
            <Bell size={13} />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#D4AF37] rounded-full" />
          </button>
        )}
        
        {onToggleLockScreen && (
          <button
            onClick={onToggleLockScreen}
            className="hover:text-slate-200 transition-colors p-0.5"
            title="قفل الشاشة وتجربة شاشة القفل"
            aria-label="قفل الشاشة"
          >
            <Lock size={12} />
          </button>
        )}

        <Wifi size={13} className="text-slate-300" />
        <BatteryMedium size={14} className="text-slate-300" />
      </div>
    </div>
  );
};
