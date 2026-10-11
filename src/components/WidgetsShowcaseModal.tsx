import React, { useState, useEffect } from 'react';
import {
  LiveActivityService,
  LiveActivityState,
  LockScreenWidgetStyle,
} from '../services/liveActivityService';
import { StorageService } from '../services/storageService';
import {
  SmallPrayerWidgetCard,
  LockScreenAccessoryWidgetCard,
  MediumPrayerWidgetCard,
} from './PrayerWidgetsKit';
import {
  X,
  Lock,
  Sparkles,
  Check,
  LayoutGrid,
  Smartphone,
  WifiOff,
} from 'lucide-react';

interface WidgetsShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullLockScreen?: () => void;
}

export const WidgetsShowcaseModal: React.FC<WidgetsShowcaseModalProps> = ({
  isOpen,
  onClose,
  onOpenFullLockScreen,
}) => {
  const [liveState, setLiveState] = useState<LiveActivityState>(() =>
    LiveActivityService.getState()
  );
  const [todayPrayersCount, setTodayPrayersCount] = useState<number>(0);
  const [prayerStreak, setPrayerStreak] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) return;
    const ach = StorageService.getPrayerAchievements();
    const p = ach.todayPrayers;
    setTodayPrayersCount(
      [p.fajr, p.dhuhr, p.asr, p.maghrib, p.isha].filter(Boolean).length
    );
    setPrayerStreak(ach.streakDays || 0);

    const unsub = LiveActivityService.subscribe(setLiveState);
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference -
    (Math.min(100, Math.max(0, liveState.progressPercent)) / 100) * circumference;

  const activeStyle: LockScreenWidgetStyle =
    liveState.settings.lockScreenWidgetStyle || 'both';

  const handleSelectStyle = (style: LockScreenWidgetStyle) => {
    LiveActivityService.saveSettings({
      enabled: true,
      showLockScreenWidget: true,
      lockScreenWidgetStyle: style,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-fadeIn">
      <div className="w-full max-w-lg bg-gradient-to-b from-[#17130C] via-[#0D0B08] to-[#070707] border-t sm:border border-[#C8A24A]/65 rounded-t-[32px] sm:rounded-[32px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_30px_rgba(200,162,74,0.2)] flex flex-col max-h-[92vh] overflow-y-auto text-right space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#C8A24A]/25 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-[#221C10] border border-[#C8A24A]/50 text-[#E6C66E]">
              <LayoutGrid size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-[#F3E5AB]">
                حزمة ودجات «أثر» لشاشة القفل والـ Dynamic Island
              </h2>
              <p className="text-[11px] text-[#C4B998] flex items-center gap-1.5 mt-0.5">
                <WifiOff size={11} className="text-[#E6C66E]" />
                <span>تعمل 100% محلياً بدون إنترنت بالهوية الملكية الذهبية</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#18140D] hover:bg-[#241E13] text-[#C4B998] hover:text-white border border-[#C8A24A]/35 transition-colors"
            title="إغلاق"
          >
            <X size={16} />
          </button>
        </div>

        {/* Section 1: Dynamic Island Widgets (Compact & Minimal Capsules) */}
        <div className="rounded-2xl bg-[#120F0A] border border-[#C8A24A]/35 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#E6C66E] flex items-center gap-1.5">
              <Smartphone size={14} />
              <span>١. ودجات الجزيرة التفاعلية (Dynamic Island)</span>
            </span>
            <button
              onClick={() =>
                LiveActivityService.saveSettings({
                  showDynamicIsland: !liveState.settings.showDynamicIsland,
                })
              }
              className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold border transition-all ${
                liveState.settings.showDynamicIsland
                  ? 'bg-[#262011] border-[#E6C66E] text-[#F3E5AB]'
                  : 'bg-[#16130D] border-[#C8A24A]/25 text-[#C4B998]'
              }`}
            >
              {liveState.settings.showDynamicIsland ? 'مفعّلة أعلى الشاشة ✓' : 'تفعيل الآن'}
            </button>
          </div>

          {/* Live Dynamic Island Capsule Preview */}
          <div className="mx-auto max-w-[335px] px-3.5 py-2 rounded-full bg-[#090806] border border-[#C8A24A]/65 shadow-[0_8px_25px_rgba(0,0,0,0.95),0_0_16px_rgba(200,162,74,0.2)] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="relative w-6 h-6 flex items-center justify-center">
                <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
                  <circle
                    cx="12"
                    cy="12"
                    r={radius}
                    fill="none"
                    stroke="rgba(200, 162, 74, 0.2)"
                    strokeWidth="2.4"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r={radius}
                    fill="none"
                    stroke="#E6C66E"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                <span className="w-1.5 h-1.5 rounded-full bg-[#E6C66E] animate-ping" />
              </div>
              <div className="text-right">
                <span className="text-[11px] font-extrabold text-[#F3E5AB] block leading-none">
                  صلاة {liveState.nextPrayerName}
                </span>
                <span className="text-[9px] text-[#C4B998] font-mono tabular-nums">
                  {liveState.nextPrayerTime12}
                </span>
              </div>
            </div>

            {/* Center Gold Bar */}
            <div className="w-14 h-1.5 rounded-full bg-[#1C1810] border border-[#C8A24A]/35 overflow-hidden">
              <div
                className="h-full bg-gradient-to-l from-[#FFF2C2] via-[#E6C66E] to-[#A67C22] rounded-full transition-all duration-700"
                style={{ width: `${liveState.progressPercent}%` }}
              />
            </div>

            <span className="px-2 py-0.5 rounded-full bg-[#19150D] border border-[#C8A24A]/45 text-[11px] font-mono font-black text-[#E6C66E] tabular-nums">
              -{liveState.countdownFormatted}
            </span>
          </div>
        </div>

        {/* Section 2: Small Prayer Widgets (ودجت مواقيت الصلاة الصغيرة + ودجت الإنجاز الدائرية) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold text-[#E6C66E] flex items-center gap-1.5">
              <Sparkles size={13} />
              <span>٢. ودجت مواقيت الصلاة الصغيرة (Small Widget)</span>
            </span>
            <span className="text-[10px] text-[#C4B998]">
              العد التنازلي + الحلقة الذهبية + شريط التقدم
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <SmallPrayerWidgetCard state={liveState} />
            <LockScreenAccessoryWidgetCard
              state={liveState}
              todayCompletedPrayersCount={todayPrayersCount}
              streakDays={prayerStreak}
            />
          </div>
        </div>

        {/* Section 3: Medium Prayer Widget (ودجت مواقيت الصلاة المتوسطة) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold text-[#E6C66E] flex items-center gap-1.5">
              <Sparkles size={13} />
              <span>٣. ودجت مواقيت الصلاة المتوسطة (Medium Widget)</span>
            </span>
            <span className="text-[10px] text-[#C4B998]">
              شريط التقدم الكامل + مواقيت اليوم الستة
            </span>
          </div>

          <MediumPrayerWidgetCard state={liveState} />
        </div>

        {/* Section 4: Lock Screen Layout Preference Selector */}
        <div className="rounded-2xl bg-[#120F0A] border border-[#C8A24A]/40 p-3.5 space-y-2.5">
          <span className="text-xs font-extrabold text-[#F3E5AB] block">
            تخصيص عرض الودجات على شاشة القفل:
          </span>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'both', label: 'الصغيرة + المتوسطة' },
                { id: 'small', label: 'الودجت الصغيرة فقط' },
                { id: 'medium', label: 'الودجت المتوسطة فقط' },
              ] as const
            ).map((item) => {
              const isSelected = activeStyle === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectStyle(item.id)}
                  className={`py-2 px-2 rounded-xl border text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all ${
                    isSelected
                      ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] border-[#F3E5AB] shadow'
                      : 'bg-[#18140D] text-[#C4B998] border-[#C8A24A]/30 hover:text-white'
                  }`}
                >
                  {isSelected && <Check size={12} />}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Action to Launch Live Lock Screen */}
        <div className="flex items-center gap-2 pt-1">
          {onOpenFullLockScreen && (
            <button
              onClick={() => {
                onClose();
                onOpenFullLockScreen();
              }}
              className="flex-1 py-2.5 px-4 rounded-2xl bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#070707] text-xs font-extrabold flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(200,162,74,0.35)] hover:brightness-110 transition-all"
            >
              <Lock size={14} />
              <span>معاينة حية على شاشة القفل الآن</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="py-2.5 px-5 rounded-2xl bg-[#1A160E] hover:bg-[#251F14] text-[#F3E5AB] border border-[#C8A24A]/40 text-xs font-bold transition-colors"
          >
            تم
          </button>
        </div>
      </div>
    </div>
  );
};
