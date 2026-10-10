import React from 'react';
import { NavigationTab } from '../types';
import { Home, Sparkles, Clock, BookOpen, Heart, Compass, Settings } from 'lucide-react';

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
    { id: 'companion', label: 'رفيق أثر', icon: Sparkles },
    { id: 'qibla', label: 'القبلة', icon: Compass },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  return (
    <nav className="w-full bg-[#040609]/98 backdrop-blur-md px-1.5 py-1.5 select-none">
      <div className="grid grid-cols-7 items-center max-w-lg mx-auto gap-0.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 transition-all duration-150 min-h-[48px] rounded-xl border ${
                isActive
                  ? 'bg-[#D4AF37]/15 border-[#D4AF37]/50 text-[#F5D76E] shadow-[0_0_12px_rgba(212,175,55,0.2)]'
                  : 'border-transparent text-white/80 hover:text-white hover:bg-white/5'
              }`}
            >
              <IconComponent
                size={19}
                className={`transition-colors ${
                  isActive ? 'text-[#F5D76E]' : 'text-white/80'
                }`}
              />
              <span
                className={`text-[10px] mt-1 tracking-tight transition-colors whitespace-nowrap ${
                  isActive ? 'font-extrabold text-[#F5D76E]' : 'font-semibold text-white/85'
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
