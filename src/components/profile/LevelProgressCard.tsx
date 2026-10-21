import React from 'react';
import goldXpBadgeImg from '../../assets/images/gold_xp_badge_1792548157202.jpg';
import goldLevelEmblemImg from '../../assets/images/gold_level_emblem_1792548139937.jpg';

interface LevelProgressCardProps {
  totalXP: number;
  currentLevel: number;
  levelProgressPercent?: number;
  xpRequiredForNextLevel?: number;
  onOpenAchievements?: () => void;
  className?: string;
}

export const LevelProgressCard: React.FC<LevelProgressCardProps> = ({
  totalXP,
  currentLevel,
  levelProgressPercent = 65,
  onOpenAchievements,
  className = '',
}) => {
  return (
    <section
      onClick={onOpenAchievements}
      className={`rounded-2xl border border-[#D9AE48]/25 bg-[#14120B] p-3 shadow-[0_4px_16px_rgba(0,0,0,0.5)] cursor-pointer hover:border-[#D9AE48]/45 transition-all select-none ${className}`}
      dir="rtl"
    >
      <div className="grid grid-cols-2 divide-x divide-x-reverse divide-[#262013]">
        {/* Right Column in RTL: Experience Points */}
        <div className="pe-3 text-right">
          <span className="text-[10.5px] font-medium text-[#B5AD9B] block mb-0.5">
            نقاط الخبرة
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-[#F7F2E7] font-mono tracking-tight">
              {totalXP.toLocaleString('en-US')}
            </span>
            {/* Real Dimensional 3D 24K Gold XP Star Badge */}
            <div className="relative w-8 h-8 rounded-full overflow-hidden shadow-[0_2px_10px_rgba(217,174,72,0.35)] shrink-0 border border-[#D9AE48]/30">
              <img
                src={goldXpBadgeImg}
                alt="XP"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Left Column in RTL: Level */}
        <div className="ps-3 text-right">
          <span className="text-[10.5px] font-medium text-[#B5AD9B] block mb-0.5">
            المستوى
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-[#F7F2E7] font-mono tracking-tight">
              {currentLevel}
            </span>
            {/* Real Dimensional 3D 24K Gold Level Rosette Emblem */}
            <div className="relative w-8 h-8 rounded-full overflow-hidden shadow-[0_2px_10px_rgba(217,174,72,0.35)] shrink-0 border border-[#D9AE48]/30">
              <img
                src={goldLevelEmblemImg}
                alt={`المستوى ${currentLevel}`}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar Toward Next Level */}
      <div className="mt-2.5 pt-2 border-t border-[#231E14]">
        <div className="flex items-center justify-between mb-1 text-[10px]">
          <span className="text-[#A69E8D]">التقدم نحو المستوى {currentLevel + 1}</span>
          <span className="text-[#FFE6A0] font-mono font-bold">{levelProgressPercent}%</span>
        </div>
        <div className="w-full h-1 rounded-full bg-[#201B11] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#D9AE48] to-[#FFE6A0] transition-all duration-700"
            style={{ width: `${levelProgressPercent}%` }}
          />
        </div>
      </div>
    </section>
  );
};
