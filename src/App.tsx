import React, { useState, useEffect } from 'react';
import { NavigationTab, Coordinates } from './types';
import { StorageService } from './services/storageService';
import { ReminderEngine } from './services/reminderService';
import { DynamicArtworkBackground } from './components/DynamicArtworkBackground';
import { AndroidNavigationBar } from './components/AndroidNavigationBar';
import { BottomNav } from './components/BottomNav';
import { AndroidNotificationDrawer } from './components/AndroidNotificationDrawer';
import { LockScreenOverlay } from './components/LockScreenOverlay';
import { CodeInspectorModal } from './components/CodeInspectorModal';
import { GlobalMiniPlayer } from './components/GlobalMiniPlayer';
import { InAppNotificationBanner } from './components/InAppNotificationBanner';

import { HomeView } from './views/HomeView';
import { PrayersView } from './views/PrayersView';
import { QuranView } from './views/QuranView';
import { QuranReaderView } from './views/QuranReaderView';
import { AdhkarView } from './views/AdhkarView';
import { QiblaView } from './views/QiblaView';
import { RemindersView } from './views/RemindersView';
import { SettingsView } from './views/SettingsView';
import { OnboardingModal } from './views/OnboardingModal';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [readingSurahNumber, setReadingSurahNumber] = useState<number | null>(null);
  const [readingInitialAyah, setReadingInitialAyah] = useState<number>(1);
  const [coordinates, setCoordinates] = useState<Coordinates>(StorageService.getSettings().location);
  
  // Overlays
  const [isLockScreenOpen, setIsLockScreenOpen] = useState<boolean>(false);
  const [isNotificationsDrawerOpen, setIsNotificationsDrawerOpen] = useState<boolean>(false);
  const [isCodeInspectorOpen, setIsCodeInspectorOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(!StorageService.getSettings().hasCompletedOnboarding);

  useEffect(() => {
    // Start background scheduled reminders engine
    ReminderEngine.start();
    return () => ReminderEngine.stop();
  }, []);

  const handleSelectSurah = (surahNum: number, ayahNum: number = 1) => {
    setReadingSurahNumber(surahNum);
    setReadingInitialAyah(ayahNum);
  };

  const handleCloseReader = () => {
    setReadingSurahNumber(null);
  };

  const handleLocationChange = (coords: Coordinates) => {
    setCoordinates(coords);
    const s = StorageService.getSettings();
    s.location = coords;
    StorageService.saveSettings(s);
  };

  return (
    <div className="relative h-screen h-[100dvh] max-h-screen max-h-[100dvh] overflow-hidden bg-[#080B0E] text-slate-100 flex flex-col selection:bg-[#D4AF37]/30 selection:text-white font-arabic">
      {/* Dynamic Islamic Background Artwork (Rule #5, #6, #47) */}
      <DynamicArtworkBackground />

      {/* Main Mobile App Container */}
      <div className="relative z-10 flex-1 flex flex-col w-full max-w-lg mx-auto bg-[#0B0F12]/95 sm:border-x sm:border-slate-800/80 shadow-2xl h-full max-h-full overflow-hidden">
        {/* Floating In-App Notification Banner */}
        <InAppNotificationBanner />

        {/* Active Screen Body (Scrollable internal viewport) */}
        <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {readingSurahNumber !== null ? (
            <QuranReaderView
              surahNumber={readingSurahNumber}
              initialAyah={readingInitialAyah}
              onBack={handleCloseReader}
              onSelectAnotherSurah={(num) => handleSelectSurah(num, 1)}
            />
          ) : (
            <>
              {activeTab === 'home' && (
                <HomeView
                  onNavigate={setActiveTab}
                  coordinates={coordinates}
                  onLocationChange={handleLocationChange}
                  onSelectSurah={(surahNum, ayahNum) => handleSelectSurah(surahNum, ayahNum || 1)}
                />
              )}
              {activeTab === 'prayers' && (
                <PrayersView
                  coordinates={coordinates}
                  onLocationChange={handleLocationChange}
                  onSelectSurah={(surahNum, ayahNum) => handleSelectSurah(surahNum, ayahNum || 1)}
                />
              )}
              {activeTab === 'quran' && (
                <QuranView onSelectSurah={handleSelectSurah} />
              )}
              {activeTab === 'adhkar' && (
                <AdhkarView
                  onNavigate={setActiveTab}
                  onSelectSurah={(surahNum, ayahNum) => handleSelectSurah(surahNum, ayahNum || 1)}
                />
              )}
              {activeTab === 'qibla' && <QiblaView coordinates={coordinates} />}
              {activeTab === 'reminders' && <RemindersView onClose={() => setActiveTab('settings')} />}
              {activeTab === 'settings' && (
                <SettingsView
                  onOpenCodeInspector={() => setIsCodeInspectorOpen(true)}
                  onOpenRemindersCenter={() => setActiveTab('reminders')}
                  onLocationChange={handleLocationChange}
                />
              )}
            </>
          )}
        </main>

        {/* Global Floating Mini Player (Quran & Adhkar persistent audio across all tabs) */}
        {readingSurahNumber === null && (
          <GlobalMiniPlayer
            onOpenSurahReader={(surahNum, ayahNum) => handleSelectSurah(surahNum, ayahNum || 1)}
            onNavigateToTab={setActiveTab}
          />
        )}

        {/* Bottom Navigation (Permanently pinned at bottom - never requires scrolling!) */}
        {readingSurahNumber === null && (
          <div className="shrink-0 z-40 bg-[#0E1318]/98 border-t border-slate-800/80">
            <BottomNav
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab);
              }}
            />
          </div>
        )}

        {/* Android Navigation Gesture Bar */}
        <div className="shrink-0 bg-[#0E1318]/98">
          <AndroidNavigationBar
            onHome={() => {
              if (readingSurahNumber !== null) {
                setReadingSurahNumber(null);
              } else {
                setActiveTab('home');
              }
            }}
          />
        </div>
      </div>

      {/* Interactive Android Overlays */}
      <LockScreenOverlay
        isOpen={isLockScreenOpen}
        onUnlock={() => setIsLockScreenOpen(false)}
        hijriDate="٢٧ ربيع الأول ١٤٤٨ هـ"
      />

      <AndroidNotificationDrawer
        isOpen={isNotificationsDrawerOpen}
        onClose={() => setIsNotificationsDrawerOpen(false)}
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onFinish={(coords) => {
          setIsOnboardingOpen(false);
          if (coords) handleLocationChange(coords);
        }}
      />

      <CodeInspectorModal
        isOpen={isCodeInspectorOpen}
        onClose={() => setIsCodeInspectorOpen(false)}
      />
    </div>
  );
};

export default App;
