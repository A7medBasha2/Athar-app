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
    <nav className="w-full bg-[#0E1318]/95 backdrop-blur-md px-1 py-1 select-none">
      <div className="grid grid-cols-7 items-center max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1 transition-all duration-200 min-h-[48px] rounded-xl ${
                isActive ? 'text-[#D4AF37]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1.5 rounded-full transition-all duration-200 ${
                  isActive ? 'bg-[#D4AF37]/15 scale-105' : 'bg-transparent'
                }`}
              >
                <IconComponent
                  size={20}
                  className={`transition-colors ${
                    isActive ? 'text-[#D4AF37]' : 'text-slate-400'
                  }`}
                />
              </div>
              <span
                className={`text-[10px] font-medium mt-0.5 tracking-tight transition-colors whitespace-nowrap ${
                  isActive ? 'font-semibold text-[#D4AF37]' : 'text-slate-400'
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
