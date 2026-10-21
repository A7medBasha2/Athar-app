import React from 'react';
import { AchievementItem } from './AchievementDetailModal';
import goldMedalQuranImg from '../../assets/images/gold_medal_quran_1792548173614.jpg';
import goldMedalFlameImg from '../../assets/images/gold_medal_flame_1792548188608.jpg';
import goldMedalTasbihImg from '../../assets/images/gold_medal_tasbih_1792548190135.jpg';
import lockedMedalImg from '../../assets/images/locked_achievement_medal_1792548173609.jpg';

interface AchievementBadgeProps {
  achievement: AchievementItem;
  onClick: (item: AchievementItem) => void;
  className?: string;
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  onClick,
  className = '',
}) => {
  const getMedalImage = () => {
    if (!achievement.isUnlocked) return lockedMedalImg;
    if (achievement.medalType === 'quran') return goldMedalQuranImg;
    if (achievement.medalType === 'flame') return goldMedalFlameImg;
    if (achievement.medalType === 'tasbih') return goldMedalTasbihImg;
    return goldMedalQuranImg;
  };

  return (
    <div
      onClick={() => onClick(achievement)}
      className={`flex flex-col items-center text-center p-2 rounded-2xl transition-all cursor-pointer select-none active:scale-95 group ${
        achievement.isUnlocked
          ? 'hover:bg-[#18140B]'
          : 'opacity-70 hover:opacity-90 hover:bg-[#111]'
      } ${className}`}
      dir="rtl"
    >
      {/* Dimensional Medal Icon with Soft Ambient Glow */}
      <div className="relative w-16 h-16 mb-2">
        {achievement.isUnlocked && (
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,_rgba(217,174,72,0.35)_0%,_transparent_70%)] blur-md scale-110 pointer-events-none group-hover:scale-125 transition-transform" />
        )}
        <div
          className={`relative w-full h-full rounded-full overflow-hidden shadow-[0_4px_14px_rgba(0,0,0,0.6)] ${
            achievement.isUnlocked
              ? 'border border-[#D9AE48]/40 group-hover:border-[#FFE6A0]'
              : 'border border-[#333]'
          }`}
        >
          <img
            src={getMedalImage()}
            alt={achievement.title}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Title */}
      <span
        className={`text-xs font-bold tracking-tight line-clamp-1 mb-0.5 ${
          achievement.isUnlocked ? 'text-[#F7F2E7]' : 'text-[#888]'
        }`}
      >
        {achievement.title}
      </span>

      {/* Subtitle / Date */}
      <span className="text-[10px] text-[#A69E8D] line-clamp-1">
        {achievement.isUnlocked
          ? achievement.unlockedDate || 'مكتمل'
          : achievement.progressText || `${achievement.progressPercent}%`}
      </span>
    </div>
  );
};
