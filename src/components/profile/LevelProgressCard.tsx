import React from 'react';
import cropXpStarImg from '../../assets/images/crop_xp_star.png';
import cropLevelRosetteImg from '../../assets/images/crop_level_rosette.png';

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
      className={`rounded-[22px] border border-[#D9AE48]/24 bg-[#0c0a07] p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.6)] cursor-pointer hover:border-[#D9AE48]/45 transition-all select-none ${className}`}
      dir="rtl"
    >
      <div className="grid grid-cols-2 divide-x divide-x-reverse divide-[#2a2318] items-center">
        {/* Right Column in RTL: Experience Points */}
        <div className="pe-2 ps-1 flex items-center justify-between">
          <div className="text-center flex-1">
            <span className="text-[13px] font-medium text-[#B8AF9E] block mb-0.5">
              نقاط الخبرة
            </span>
            <span className="text-[26px] font-bold text-[#FAF4E8] font-mono leading-none tracking-tight">
              {totalXP.toLocaleString('en-US')}
            </span>
          </div>
          {/* Real Dimensional 3D 24K Gold XP Star Badge */}
          <div className="w-[42px] h-[42px] shrink-0 flex items-center justify-center">
            <img
              src={cropXpStarImg}
              alt="XP"
              className="w-full h-full object-contain filter drop-shadow-[0_2px_10px_rgba(217,174,72,0.35)]"
            />
          </div>
        </div>

        {/* Left Column in RTL: Level */}
        <div className="ps-2 pe-1 flex items-center justify-between">
          {/* Real Dimensional 3D 24K Gold Level Rosette Emblem */}
          <div className="w-[52px] h-[52px] shrink-0 flex items-center justify-center">
            <img
              src={cropLevelRosetteImg}
              alt={`المستوى ${currentLevel}`}
              className="w-full h-full object-contain filter drop-shadow-[0_2px_10px_rgba(217,174,72,0.35)]"
            />
          </div>
          <div className="text-center flex-1">
            <span className="text-[13px] font-medium text-[#B8AF9E] block mb-0.5">
              المستوي
            </span>
            <span className="text-[26px] font-bold text-[#FAF4E8] font-mono leading-none tracking-tight">
              {currentLevel}
            </span>
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
