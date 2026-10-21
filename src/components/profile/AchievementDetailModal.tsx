import React from 'react';
import { X, Lock, CheckCircle2, Sparkles, ChevronLeft } from 'lucide-react';
import goldMedalQuranImg from '../../assets/images/gold_medal_quran_1792548173614.jpg';
import goldMedalFlameImg from '../../assets/images/gold_medal_flame_1792548188608.jpg';
import goldMedalTasbihImg from '../../assets/images/gold_medal_tasbih_1792548190135.jpg';
import lockedMedalImg from '../../assets/images/locked_achievement_medal_1792548173609.jpg';

export interface AchievementItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: 'quran' | 'adhkar' | 'prayers' | 'charity' | 'consistency' | 'other';
  isUnlocked: boolean;
  unlockedDate?: string;
  progressPercent: number;
  progressText?: string;
  xpReward: number;
  medalType: 'quran' | 'flame' | 'tasbih' | 'general';
}

interface AchievementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievement: AchievementItem | null;
  onAction?: () => void;
}

export const AchievementDetailModal: React.FC<AchievementDetailModalProps> = ({
  isOpen,
  onClose,
  achievement,
  onAction,
}) => {
  if (!isOpen || !achievement) return null;

  const getMedalImage = () => {
    if (!achievement.isUnlocked) return lockedMedalImg;
    if (achievement.medalType === 'quran') return goldMedalQuranImg;
    if (achievement.medalType === 'flame') return goldMedalFlameImg;
    if (achievement.medalType === 'tasbih') return goldMedalTasbihImg;
    return goldMedalQuranImg;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
      dir="rtl"
    >
      <div className="relative w-full max-w-sm bg-[#0E0C08] border border-[#D9AE48]/35 rounded-3xl shadow-[0_12px_45px_rgba(0,0,0,0.9)] max-h-[92vh] flex flex-col overflow-hidden text-[#F7F2E7] select-none">
        {/* Top Bar with Close Button */}
        <div className="flex items-center justify-between p-4 border-b border-[#241E12]">
          <span className="text-xs font-semibold text-[#B5AD9B] flex items-center gap-1.5">
            <Sparkles size={13} className="text-[#D9AE48]" />
            تفاصيل الوسام الملكي
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#B5AD9B] hover:text-white hover:bg-white/10 transition-colors"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-center">
          {/* Large Dimensional 3D Rosette Medal */}
          <div className="relative w-36 h-36 mx-auto my-1">
            {/* Ambient Radial Golden Aura */}
            <div
              className={`absolute inset-0 rounded-full blur-xl scale-110 pointer-events-none ${
                achievement.isUnlocked
                  ? 'bg-[radial-gradient(circle,_rgba(217,174,72,0.45)_0%,_transparent_70%)]'
                  : 'bg-[radial-gradient(circle,_rgba(100,100,100,0.2)_0%,_transparent_70%)]'
              }`}
            />
            <div className="relative w-full h-full rounded-full overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.8)] border border-[#D9AE48]/40">
              <img
                src={getMedalImage()}
                alt={achievement.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Title & Subtitle */}
          <div>
            <h3 className="text-lg font-bold text-[#F7F2E7] tracking-tight mb-1">
              {achievement.title}
            </h3>
            <p className="text-xs text-[#FFE6A0] font-medium">
              {achievement.subtitle}
            </p>
          </div>

          {/* Details Card */}
          <div className="rounded-2xl border border-[#D9AE48]/20 bg-[#14120B] p-4 text-right space-y-3 shadow-inner">
            <div>
              <span className="text-[11px] font-bold text-[#D9AE48] block mb-1">
                تفاصيل الإنجاز
              </span>
              <p className="text-xs text-[#B5AD9B] leading-relaxed">
                {achievement.description}
              </p>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <span className="text-[#B5AD9B] font-medium">التقدم الحالي</span>
                <span className="text-[#FFE6A0] font-bold font-mono">
                  {achievement.progressPercent}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#201B11] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#D9AE48] to-[#FFE6A0] shadow-[0_0_8px_rgba(217,174,72,0.5)] transition-all duration-700"
                  style={{ width: `${achievement.progressPercent}%` }}
                />
              </div>
            </div>

            {/* Reward & Status */}
            <div className="pt-2 border-t border-[#231E14] flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[#B5AD9B]">المكافأة:</span>
                <span className="text-[#FFE6A0] font-bold font-mono">
                  +{achievement.xpReward} XP
                </span>
              </div>

              <div className="flex items-center gap-1 text-[11px]">
                {achievement.isUnlocked ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    <span>حصلت عليه في {achievement.unlockedDate || 'مؤخراً'}</span>
                  </span>
                ) : (
                  <span className="text-[#888] font-medium flex items-center gap-1">
                    <Lock size={12} />
                    <span>لم يتم الحصول عليه بعد</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => {
              if (onAction) onAction();
              onClose();
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D9AE48] via-[#FFE6A0] to-[#D9AE48] text-[#080807] font-bold text-xs shadow-[0_4px_16px_rgba(217,174,72,0.35)] hover:brightness-110 active:scale-95 transition-all"
          >
            {achievement.isUnlocked ? 'مشاركة الإنجاز' : 'ابدأ الآن'}
          </button>
        </div>
      </div>
    </div>
  );
};
