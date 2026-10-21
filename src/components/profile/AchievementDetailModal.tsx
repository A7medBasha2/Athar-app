import React from 'react';
import { X, Lock, CheckCircle2, Sparkles } from 'lucide-react';
import goldMedalQuranImg from '../../assets/images/medal_quran_milestone_1792610611861.jpg';
import goldMedalFlameImg from '../../assets/images/medal_streak_milestone_1792610613781.jpg';
import goldMedalTasbihImg from '../../assets/images/medal_adhkar_milestone_1792610613103.jpg';
import goldMedalCharityImg from '../../assets/images/medal_charity_milestone_1792610614248.jpg';
import goldMedalMosqueImg from '../../assets/images/gold_medal_mosque_1792553061681.jpg';
import lockedMedalImg from '../../assets/images/medal_locked_silhouette_1792610614413.jpg';

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
  medalType: 'quran' | 'flame' | 'tasbih' | 'charity' | 'mosque' | 'general' | 'star';
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
    if (achievement.medalType === 'charity') return goldMedalCharityImg;
    if (achievement.medalType === 'mosque') return goldMedalMosqueImg;
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
            className="p-1 rounded-full text-[#B5AD9B] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-center">
          {/* Large Dimensional 3D Rosette Medal */}
          <div className="relative w-36 h-36 mx-auto my-1 flex items-center justify-center">
            {/* Ambient Radial Golden Aura */}
            <div
              className={`absolute inset-0 rounded-full blur-xl scale-125 pointer-events-none ${
                achievement.isUnlocked
                  ? 'bg-[radial-gradient(circle,_rgba(217,174,72,0.45)_0%,_transparent_70%)]'
                  : 'bg-[radial-gradient(circle,_rgba(100,100,100,0.2)_0%,_transparent_70%)]'
              }`}
            />
            <div className="relative z-10 w-28 h-28 rounded-full overflow-hidden shadow-[0_6px_25px_rgba(0,0,0,0.8)] border border-[#D9AE48]/60 flex items-center justify-center">
              <img
                src={getMedalImage()}
                alt={achievement.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Title & Subtitle */}
          <div>
            <h3 className="text-lg font-bold text-[#FFFFFF] tracking-tight mb-1">
              {achievement.title}
            </h3>
            <p className="text-xs text-[#FFE6A0] font-medium">
              {achievement.subtitle}
            </p>
          </div>

          {/* Details Card */}
          <div className="rounded-2xl border border-[#2B2414] bg-[#14120B] p-4 text-right space-y-3 shadow-inner">
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
              <div className="w-full h-2 rounded-full bg-[#1A160F] overflow-hidden">
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
                  <span className="text-[#FFE6A0] flex items-center gap-1 font-medium">
                    <CheckCircle2 size={13} className="text-[#D9AE48]" />
                    تم الحصول عليه ({achievement.unlockedDate || 'مكتمل'})
                  </span>
                ) : (
                  <span className="text-[#8E8A82] flex items-center gap-1 font-medium">
                    <Lock size={12} />
                    وسام مغلق
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Button */}
          {onAction && (
            <button
              onClick={() => {
                onClose();
                onAction();
              }}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-[#D9AE48] via-[#FFE6A0] to-[#D9AE48] text-[#080807] shadow-[0_4px_16px_rgba(217,174,72,0.35)] hover:brightness-105 active:scale-98 transition-all cursor-pointer"
            >
              الانتقال إلى الطاعة المرتبطة
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
