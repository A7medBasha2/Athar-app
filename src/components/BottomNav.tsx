import React from 'react';
import { NavigationTab } from '../types';
import { Home, Clock, BookOpen, Heart, ScrollText, Compass, LayoutGrid, Settings } from 'lucide-react';
import { ImagePreloadService } from '../services/imagePreloadService';

interface BottomNavProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: NavigationTab; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
    { id: 'home', label: 'الرئيسية', icon: Home },
    { id: 'prayers', label: 'الصلاة', icon: Clock },
    { id: 'quran', label: 'القرآن', icon: BookOpen },
    { id: 'adhkar', label: 'الأذكار', icon: Heart },
    { id: 'stories', label: 'القصص', icon: ScrollText },
    { id: 'qibla', label: 'القبلة', icon: Compass },
    { id: 'explore', label: 'استكشف', icon: LayoutGrid },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  return (
    <nav className="w-full bg-[#0A0A0A]/98 backdrop-blur-md px-1 py-1.5 select-none">
      <div className="grid grid-cols-8 items-center max-w-lg mx-auto gap-0.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              onMouseEnter={() => ImagePreloadService.preloadTabImages(tab.id)}
              onTouchStart={() => ImagePreloadService.preloadTabImages(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-0 transition-all duration-150 min-h-[46px] min-w-0 w-full rounded-xl border active:scale-95 touch-manipulation cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-b from-[#C8A24A]/25 to-[#C8A24A]/10 border-[#E6C66E]/65 text-[#E6C66E] shadow-[0_0_15px_rgba(200,162,74,0.28)]'
                  : 'border-transparent text-[#C4B998] hover:text-white hover:bg-[#161410]'
              }`}
            >
              <IconComponent
                size={14}
                className={`transition-colors shrink-0 ${
                  isActive ? 'text-[#E6C66E]' : 'text-[#C4B998]'
                }`}
              />
              <span
                className={`block w-full text-center text-[8.5px] sm:text-[9.5px] leading-tight mt-1 tracking-normal transition-colors whitespace-nowrap ${
                  isActive ? 'font-bold text-[#E6C66E]' : 'font-semibold text-[#C4B998]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
