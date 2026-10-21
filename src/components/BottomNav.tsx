import React from 'react';
import { NavigationTab } from '../types';
import { Home, BookOpen, Compass, Award, User, Settings } from 'lucide-react';
import { ImagePreloadService } from '../services/imagePreloadService';

interface BottomNavProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  // 5 Royal Primary Tabs exactly matching the Athar Profile Mockup
  const tabs: {
    id: NavigationTab;
    label: string;
    icon: React.FC<{ size?: number; className?: string }>;
    matches?: NavigationTab[];
  }[] = [
    { id: 'home', label: 'الرئيسية', icon: Home, matches: ['home'] },
    { id: 'stories', label: 'المحفوظات', icon: BookOpen, matches: ['stories'] },
    { id: 'explore', label: 'الاستكشاف', icon: Compass, matches: ['explore', 'qibla', 'companion'] },
    { id: 'achievements', label: 'الإنجازات', icon: Award, matches: ['achievements', 'journey'] },
    { id: 'profile', label: 'الملف الشخصي', icon: User, matches: ['profile', 'settings'] },
  ];

  return (
    <nav
      className="w-full bg-[#080807]/98 backdrop-blur-lg px-2 py-2 select-none border-t border-[#2A2210]/60"
      dir="rtl"
    >
      <div className="grid grid-cols-5 items-center max-w-lg mx-auto gap-1">
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
              className={`flex flex-col items-center justify-center py-1.5 px-1 transition-all duration-200 min-h-[52px] rounded-2xl border active:scale-95 touch-manipulation cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-b from-[#C8A24A]/25 via-[#C8A24A]/10 to-transparent border-[#D9AE48]/70 text-[#FFE6A0] shadow-[0_0_18px_rgba(217,174,72,0.25)]'
                  : 'border-transparent text-[#B5AD9B] hover:text-[#F7F2E7] hover:bg-[#14120B]'
              }`}
            >
              <IconComponent
                size={20}
                className={`transition-colors shrink-0 mb-1 ${
                  isActive ? 'text-[#FFE6A0]' : 'text-[#B5AD9B]'
                }`}
              />
              <span
                className={`block w-full text-center text-[10.5px] leading-tight tracking-normal transition-colors whitespace-nowrap truncate px-0.5 ${
                  isActive ? 'font-bold text-[#FFE6A0]' : 'font-medium text-[#B5AD9B]'
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
