import React, { useState, useEffect } from 'react';
import { NavigationTab, Coordinates, AdhkarCategory } from './types';
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
import { VoiceAssistantModal } from './components/VoiceAssistantModal';
import { VoiceFloatingButton } from './components/VoiceFloatingButton';
import { DigitalTasbihModal } from './components/DigitalTasbihModal';
import { VoiceAssistant } from './services/voiceAssistantService';
import { AudioService } from './services/audioService';
import { MORNING_FULL_AUDIO_URL, EVENING_FULL_AUDIO_URL } from './data/adhkarData';

import { HomeView } from './views/HomeView';
import { AtharCompanionView } from './views/AtharCompanionView';
import { PrayersView } from './views/PrayersView';
import { QuranView } from './views/QuranView';
import { QuranReaderView } from './views/QuranReaderView';
import { AdhkarView } from './views/AdhkarView';
import { QiblaView } from './views/QiblaView';
import { RemindersView } from './views/RemindersView';
import { SettingsView } from './views/SettingsView';
import { OnboardingModal } from './views/OnboardingModal';
import { CompanionMoodId } from './data/companionData';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [readingSurahNumber, setReadingSurahNumber] = useState<number | null>(null);
  const [readingInitialAyah, setReadingInitialAyah] = useState<number>(1);
  const [coordinates, setCoordinates] = useState<Coordinates>(StorageService.getSettings().location);
  const [companionMood, setCompanionMood] = useState<CompanionMoodId>('anxious');
  
  // Adhkar playback state
  const [adhkarCategory, setAdhkarCategory] = useState<AdhkarCategory>('morning');
  const [autoOpenAdhkarPlayer, setAutoOpenAdhkarPlayer] = useState<boolean>(false);

  // Overlays
  const [isLockScreenOpen, setIsLockScreenOpen] = useState<boolean>(false);
  const [isNotificationsDrawerOpen, setIsNotificationsDrawerOpen] = useState<boolean>(false);
  const [isCodeInspectorOpen, setIsCodeInspectorOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(!StorageService.getSettings().hasCompletedOnboarding);
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState<boolean>(false);
  const [isTasbihOpen, setIsTasbihOpen] = useState<boolean>(false);

  useEffect(() => {
    // Start background scheduled reminders engine
    ReminderEngine.start();

    // Check if user enabled auto-listen on app open (Accessibility for blind users)
    const voiceSettings = VoiceAssistant.getSettings();
    if (voiceSettings.autoListenOnAppOpen) {
      const timer = setTimeout(() => {
        setIsVoiceAssistantOpen(true);
      }, 1200);
      return () => {
        clearTimeout(timer);
        ReminderEngine.stop();
      };
    }

    return () => ReminderEngine.stop();
  }, []);

  const handleSelectSurah = (surahNum: number, ayahNum: number = 1) => {
    setReadingSurahNumber(surahNum);
    setReadingInitialAyah(ayahNum);
  };

  const handlePlaySurahAudio = async (surahNum: number) => {
    handleSelectSurah(surahNum, 1);
    const s = StorageService.getSettings();
    const reciterId = s.selectedReciterId || 'alafasy';
    await AudioService.playQuranContinuous(surahNum, 1, reciterId);
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

  const handlePlayAdhkarAudio = async (category: 'morning' | 'evening') => {
    setAdhkarCategory(category);
    setAutoOpenAdhkarPlayer(true);
    setActiveTab('adhkar');

    const fullUrl = category === 'morning' ? MORNING_FULL_AUDIO_URL : EVENING_FULL_AUDIO_URL;
    const title = category === 'morning' ? 'أذكار الصباح كاملة' : 'أذكار المساء كاملة';

    await AudioService.playUrl(
      fullUrl,
      'adhkar',
      {
        title,
        subtitle: 'تلاوة متواصلة مباركة · الشيخ مشاري راشد العفاسي',
        dhikrId: 9999,
        totalAdhkar: 30
      }
    );
  };

  return (
    <div className="relative h-screen h-[100dvh] max-h-screen max-h-[100dvh] overflow-hidden bg-[#080B0E] text-slate-100 flex flex-col selection:bg-[#D4AF37]/30 selection:text-white font-arabic">
      {/* Dynamic Islamic Background Artwork (Rule #5, #6, #47) */}
      <DynamicArtworkBackground />

      {/* Screen Reader ARIA Live Region for TalkBack / VoiceOver announcements */}
      <div 
        id="athar-a11y-live-region" 
        className="sr-only" 
        aria-live="assertive" 
        aria-atomic="true" 
        role="alert"
      />

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
                  onOpenCompanion={(mood) => {
                    if (mood) setCompanionMood(mood);
                    setActiveTab('companion');
                  }}
                  onOpenVoiceAssistant={() => setIsVoiceAssistantOpen(true)}
                  coordinates={coordinates}
                  onLocationChange={handleLocationChange}
                  onSelectSurah={(surahNum, ayahNum) => handleSelectSurah(surahNum, ayahNum || 1)}
                />
              )}
              {activeTab === 'companion' && (
                <AtharCompanionView
                  initialMood={companionMood}
                  onNavigate={setActiveTab}
                  onSelectSurah={(surahNum, ayahNum) => handleSelectSurah(surahNum, ayahNum || 1)}
                  onBack={() => setActiveTab('home')}
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
                  initialCategory={adhkarCategory}
                  autoOpenPlayer={autoOpenAdhkarPlayer}
                />
              )}
              {activeTab === 'qibla' && <QiblaView coordinates={coordinates} />}
              {activeTab === 'reminders' && <RemindersView onClose={() => setActiveTab('settings')} />}
              {activeTab === 'settings' && (
                <SettingsView
                  onOpenCodeInspector={() => setIsCodeInspectorOpen(true)}
                  onOpenRemindersCenter={() => setActiveTab('reminders')}
                  onOpenVoiceAssistant={() => setIsVoiceAssistantOpen(true)}
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

      {/* Floating Accessible Voice Assistant Button (Permanent floating button with TalkBack / VoiceOver support) */}
      {readingSurahNumber === null && (
        <VoiceFloatingButton
          onClick={() => setIsVoiceAssistantOpen(true)}
        />
      )}

      {/* Interactive Voice Assistant Modal / HUD */}
      <VoiceAssistantModal
        isOpen={isVoiceAssistantOpen}
        onClose={() => setIsVoiceAssistantOpen(false)}
        coordinates={coordinates}
        onNavigate={(tab) => {
          setActiveTab(tab);
          if (readingSurahNumber !== null) setReadingSurahNumber(null);
        }}
        onOpenSurah={(surahNum) => {
          handleSelectSurah(surahNum, 1);
        }}
        onPlaySurah={handlePlaySurahAudio}
        onPlayAdhkar={handlePlayAdhkarAudio}
        onOpenTasbih={() => setIsTasbihOpen(true)}
      />

      {/* Digital Tasbih Modal */}
      <DigitalTasbihModal
        isOpen={isTasbihOpen}
        onClose={() => setIsTasbihOpen(false)}
        onNavigateToAdhkar={() => {
          setIsTasbihOpen(false);
          setActiveTab('adhkar');
        }}
      />

      {/* Interactive Android Overlays */}
      <LockScreenOverlay
        isOpen={isLockScreenOpen}
        onUnlock={() => setIsLockScreenOpen(false)}
        hijriDate="٢٧ ربيع الأول ١٤٨ هـ"
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
