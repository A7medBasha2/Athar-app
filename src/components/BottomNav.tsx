import React from 'react';
import { NavigationTab } from '../types';
import { Home, Clock, BookOpen, Heart, Compass, LayoutGrid, User, Settings } from 'lucide-react';
import { ImagePreloadService } from '../services/imagePreloadService';

interface BottomNavProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  // Classic 8 Royal Navigation Tabs matching the original Athar UI
  // With Stories cleanly integrated into Explore, and the new Profile tab added next to Settings
  const tabs: {
    id: NavigationTab;
    label: string;
    icon: React.FC<{ size?: number; className?: string }>;
    matches?: NavigationTab[];
  }[] = [
    { id: 'home', label: 'الرئيسية', icon: Home, matches: ['home'] },
    { id: 'prayers', label: 'الصلاة', icon: Clock, matches: ['prayers'] },
    { id: 'quran', label: 'القرآن', icon: BookOpen, matches: ['quran'] },
    { id: 'adhkar', label: 'الأذكار', icon: Heart, matches: ['adhkar'] },
    { id: 'qibla', label: 'القبلة', icon: Compass, matches: ['qibla'] },
    { id: 'explore', label: 'استكشف', icon: LayoutGrid, matches: ['explore', 'stories', 'companion'] },
    { id: 'profile', label: 'حسابي', icon: User, matches: ['profile', 'achievements'] },
    { id: 'settings', label: 'الإعدادات', icon: Settings, matches: ['settings'] },
  ];

  return (
    <nav
      className="w-full bg-[#080807]/98 backdrop-blur-md px-1 py-1.5 select-none border-t border-[#C8A24A]/25"
      dir="rtl"
      aria-label="شريط التنقل الرئيسي"
    >
      <div className="flex items-center justify-between max-w-xl mx-auto gap-0.5 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive =
            activeTab === tab.id || (tab.matches && tab.matches.includes(activeTab));
          const IconComponent = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              onMouseEnter={() => ImagePreloadService.preloadTabImages(tab.id)}
              onTouchStart={() => ImagePreloadService.preloadTabImages(tab.id)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 min-w-[42px] max-w-[58px] flex flex-col items-center justify-center py-1 px-0.5 min-h-[48px] rounded-2xl transition-all duration-150 active:scale-95 touch-manipulation cursor-pointer ${
                isActive
                  ? 'border border-[#D4AF37]/85 bg-gradient-to-b from-[#C8A24A]/20 to-[#C8A24A]/5 text-[#FFE6A0] shadow-[0_0_12px_rgba(212,175,55,0.22)]'
                  : 'border border-transparent text-[#9E9478] hover:text-[#E6C66E] hover:bg-[#14120B]/60'
              }`}
            >
              <IconComponent
                size={18}
                className={`transition-colors shrink-0 mb-0.5 ${
                  isActive ? 'text-[#FFE6A0]' : 'text-[#9E9478]'
                }`}
              />
              <span
                className={`block w-full text-center text-[9.5px] leading-tight tracking-tight transition-colors whitespace-nowrap truncate px-0.5 ${
                  isActive ? 'font-bold text-[#FFE6A0]' : 'font-normal text-[#9E9478]'
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
