import React from 'react';
import { NavigationTab } from '../types';
import { Home, Clock, BookOpen, Heart, ScrollText, Compass, LayoutGrid, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: NavigationTab; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
    { id: 'home', label: 'الرئيسية', icon: Home },
    { id: 'prayers', label: 'المواقيت', icon: Clock },
    { id: 'quran', label: 'القرآن', icon: BookOpen },
    { id: 'adhkar', label: 'الأذكار', icon: Heart },
    { id: 'stories', label: 'القصص', icon: ScrollText },
    { id: 'qibla', label: 'القبلة', icon: Compass },
    { id: 'explore', label: 'الاستكشاف', icon: LayoutGrid },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  return (
    <nav className="w-full bg-[#070707]/98 backdrop-blur-md px-1 py-1.5 select-none">
      <div className="grid grid-cols-8 items-center max-w-lg mx-auto gap-0.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 transition-all duration-150 min-h-[48px] rounded-xl border ${
                isActive
                  ? 'bg-gradient-to-b from-[#C8A24A]/25 to-[#C8A24A]/10 border-[#E6C66E]/65 text-[#E6C66E] shadow-[0_0_15px_rgba(200,162,74,0.28)]'
                  : 'border-transparent text-[#C4B998] hover:text-white hover:bg-[#161410]'
              }`}
            >
              <IconComponent
                size={17}
                className={`transition-colors ${
                  isActive ? 'text-[#E6C66E]' : 'text-[#C4B998]'
                }`}
              />
              <span
                className={`text-[9.5px] mt-1 tracking-tight transition-colors whitespace-nowrap ${
                  isActive ? 'font-extrabold text-[#E6C66E]' : 'font-bold text-[#C4B998]'
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
