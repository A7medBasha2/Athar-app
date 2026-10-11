import React, { useState, useEffect } from 'react';
import { NavigationTab, Coordinates, AdhkarCategory } from './types';
import { StorageService } from './services/storageService';
import { ReminderEngine } from './services/reminderService';
import { DynamicArtworkBackground } from './components/DynamicArtworkBackground';
import { AndroidNavigationBar } from './components/AndroidNavigationBar';
import { BottomNav } from './components/BottomNav';
import { AndroidNotificationDrawer } from './components/AndroidNotificationDrawer';
import { LockScreenOverlay } from './components/LockScreenOverlay';
import { DynamicIslandBar } from './components/DynamicIslandBar';
import { CodeInspectorModal } from './components/CodeInspectorModal';
import { GlobalMiniPlayer } from './components/GlobalMiniPlayer';
import { InAppNotificationBanner } from './components/InAppNotificationBanner';
import { VoiceAssistantModal } from './components/VoiceAssistantModal';
import { VoiceFloatingButton } from './components/VoiceFloatingButton';
import { DigitalTasbihModal } from './components/DigitalTasbihModal';
import { ZakatAndCharityModal } from './components/ZakatAndCharityModal';
import { SakinaAndRightsModal } from './components/SakinaAndRightsModal';
import { AchievementsOverviewModal } from './components/AchievementsOverviewModal';
import { LuxuryWelcomeSplashModal } from './components/LuxuryWelcomeSplashModal';
import { IslamicAlarmModal } from './components/IslamicAlarmModal';
import { AlarmRingingModal } from './components/AlarmRingingModal';
import { AlarmService } from './services/alarmService';
import { VoiceAssistant } from './services/voiceAssistantService';
import { AudioService } from './services/audioService';
import { MORNING_FULL_AUDIO_URL, EVENING_FULL_AUDIO_URL } from './data/adhkarData';

import { HomeView } from './views/HomeView';
import { AtharCompanionView } from './views/AtharCompanionView';
import { PrayersView } from './views/PrayersView';
import { QuranView } from './views/QuranView';
import { QuranReaderView } from './views/QuranReaderView';
import { AdhkarView } from './views/AdhkarView';
import { StoriesView } from './views/StoriesView';
import { ExploreView } from './views/ExploreView';
import { QiblaView } from './views/QiblaView';
import { RemindersView } from './views/RemindersView';
import { SettingsView } from './views/SettingsView';
import { OnboardingModal } from './views/OnboardingModal';
import { CompanionMoodId } from './data/companionData';
import { LocationService } from './services/locationService';
import { OfflineDatabase } from './services/offlineDatabase';
import { LiveActivityService } from './services/liveActivityService';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [companionReturnTab, setCompanionReturnTab] = useState<NavigationTab>('explore');
  const [exploreSubView, setExploreSubView] = useState<'main' | 'quran_library' | 'fatwas' | 'articles' | 'tools'>('main');
  const [readingSurahNumber, setReadingSurahNumber] = useState<number | null>(null);
  const [readingInitialAyah, setReadingInitialAyah] = useState<number>(1);
  const [coordinates, setCoordinates] = useState<Coordinates>(StorageService.getSettings().location);
  const [companionMood, setCompanionMood] = useState<CompanionMoodId>('anxious');
  
  // Adhkar playback state
  const [adhkarCategory, setAdhkarCategory] = useState<AdhkarCategory>('morning');
  const [autoOpenAdhkarPlayer, setAutoOpenAdhkarPlayer] = useState<boolean>(false);

  // Luxury Splash Screen (Mosque & Golden Crescent)
  const [isLuxurySplashOpen, setIsLuxurySplashOpen] = useState<boolean>(() => {
    try {
      return !sessionStorage.getItem('athar_luxury_splash_seen');
    } catch {
      return false;
    }
  });

  // Overlays & Modals
  const [isLockScreenOpen, setIsLockScreenOpen] = useState<boolean>(false);
  const [isNotificationsDrawerOpen, setIsNotificationsDrawerOpen] = useState<boolean>(false);
  const [isCodeInspectorOpen, setIsCodeInspectorOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(!StorageService.getSettings().hasCompletedOnboarding);
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState<boolean>(false);
  const [isVoiceSystemEnabled, setIsVoiceSystemEnabled] = useState<boolean>(
    () => VoiceAssistant.getSettings().enabled
  );
  const [isTasbihOpen, setIsTasbihOpen] = useState<boolean>(false);
  const [isZakatOpen, setIsZakatOpen] = useState<boolean>(false);
  const [isSakinaOpen, setIsSakinaOpen] = useState<boolean>(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState<boolean>(false);
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState<boolean>(false);

  useEffect(() => {
    // Initialize & seed local offline IndexedDB database (Cities, Astronomical Prayer Params, Quran, Tafsir, Adhkar, Hadiths, Sunan)
    OfflineDatabase.initializeAndSeedCoreData().catch(() => {});

    // Automatically check and reset all daily trackers at 12:00 AM local midnight
    StorageService.checkAndPerformMidnightDailyReset();
    const midnightResetWatcher = setInterval(() => {
      StorageService.checkAndPerformMidnightDailyReset();
    }, 10000);

    // Start background scheduled reminders engine & Islamic alarm system
    ReminderEngine.start();
    AlarmService.start();

    // Start automatic GPS tracking so traveling or changing area updates Qibla & prayer times automatically
    const stopAutoLocation = LocationService.startAutoTracking((newCoords) => {
      setCoordinates(newCoords);
      const s = StorageService.getSettings();
      s.location = newCoords;
      StorageService.saveSettings(s);
      LiveActivityService.updateLocationAndMethod(newCoords, s.calculationMethod);
      AlarmService.syncFajrLinkedAlarmsTimes();
    });

    const unsubVoice = VoiceAssistant.subscribe((settings) => {
      setIsVoiceSystemEnabled(settings.enabled);
      if (!settings.enabled) {
        setIsVoiceAssistantOpen(false);
      }
    });

    // Check if user enabled voice system AND auto-listen on app open
    const voiceSettings = VoiceAssistant.getSettings();
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (voiceSettings.enabled && voiceSettings.autoListenOnAppOpen) {
      timer = setTimeout(() => {
        setIsVoiceAssistantOpen(true);
      }, 1200);
    }

    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(midnightResetWatcher);
      stopAutoLocation();
      unsubVoice();
      ReminderEngine.stop();
      AlarmService.stop();
    };
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
    LiveActivityService.updateLocationAndMethod(coords, s.calculationMethod);
    AlarmService.syncFajrLinkedAlarmsTimes();
  };

  const handlePlayAdhkarAudio = async (category: 'morning' | 'evening') => {
    setAdhkarCategory(category);
    setAutoOpenAdhkarPlayer(true);
    setActiveTab('adhkar');
  };

  const handleCloseLuxurySplash = () => {
    try {
      sessionStorage.setItem('athar_luxury_splash_seen', '1');
    } catch {}
    setIsLuxurySplashOpen(false);
  };

  return (
    <div className="relative h-screen h-[100dvh] max-h-screen max-h-[100dvh] overflow-hidden bg-[#070707] text-white flex flex-col selection:bg-[#C8A24A]/30 selection:text-white font-arabic">
      {/* Dynamic Islamic Background Artwork */}
      <DynamicArtworkBackground />

      {/* Screen Reader ARIA Live Region for TalkBack / VoiceOver announcements */}
      <div 
        id="athar-a11y-live-region" 
        className="sr-only" 
        aria-live="assertive" 
        aria-atomic="true" 
        role="alert"
      />

      {/* Main Mobile App Container (Royal Obsidian & Burnished Gold Shell) */}
      <div className="relative z-10 flex-1 flex flex-col w-full max-w-lg mx-auto bg-[#070707]/96 sm:border-x sm:border-[#C8A24A]/30 shadow-2xl h-full max-h-full overflow-hidden">
        {/* Dynamic Island Live Activity Bar (Prayer Countdown & Progress Bar) */}
        <DynamicIslandBar
          onOpenLockScreen={() => setIsLockScreenOpen(true)}
          onNavigateToPrayers={() => {
            if (readingSurahNumber !== null) setReadingSurahNumber(null);
            setActiveTab('prayers');
          }}
        />

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
                    setCompanionReturnTab('home');
                    setActiveTab('companion');
                  }}
                  onOpenVoiceAssistant={() => setIsVoiceAssistantOpen(true)}
                  coordinates={coordinates}
                  onLocationChange={handleLocationChange}
                  onSelectSurah={(surahNum, ayahNum) => handleSelectSurah(surahNum, ayahNum || 1)}
                  onOpenZakat={() => setIsZakatOpen(true)}
                  onOpenSakina={() => setIsSakinaOpen(true)}
                  onOpenSplashPreview={() => setIsLuxurySplashOpen(true)}
                />
              )}
              {activeTab === 'companion' && (
                <AtharCompanionView
                  initialMood={companionMood}
                  onNavigate={setActiveTab}
                  onSelectSurah={(surahNum, ayahNum) => handleSelectSurah(surahNum, ayahNum || 1)}
                  onBack={() => setActiveTab(companionReturnTab)}
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
              {activeTab === 'stories' && (
                <StoriesView
                  onBack={() => setActiveTab('home')}
                />
              )}
              {activeTab === 'explore' && (
                <ExploreView
                  initialSubView={exploreSubView}
                  onSubViewChange={setExploreSubView}
                  onNavigate={(tab) => {
                    if (tab === 'companion') {
                      setCompanionReturnTab('explore');
                    }
                    setActiveTab(tab);
                  }}
                  onSelectSurah={(surahNum, ayahNum) => handleSelectSurah(surahNum, ayahNum || 1)}
                  onOpenTasbih={() => setIsTasbihOpen(true)}
                  onOpenZakat={() => setIsZakatOpen(true)}
                  onOpenSakina={() => setIsSakinaOpen(true)}
                  onOpenAchievements={() => setIsAchievementsOpen(true)}
                  onOpenSplashPreview={() => setIsLuxurySplashOpen(true)}
                  onOpenAlarm={() => setIsAlarmModalOpen(true)}
                />
              )}
              {activeTab === 'qibla' && (
                <QiblaView
                  coordinates={coordinates}
                  onLocationChange={handleLocationChange}
                />
              )}
              {activeTab === 'reminders' && <RemindersView onClose={() => setActiveTab('settings')} />}
              {activeTab === 'settings' && (
                <SettingsView
                  onOpenCodeInspector={() => setIsCodeInspectorOpen(true)}
                  onOpenRemindersCenter={() => setActiveTab('reminders')}
                  onOpenVoiceAssistant={() => setIsVoiceAssistantOpen(true)}
                  onOpenAlarmModal={() => setIsAlarmModalOpen(true)}
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
          <div className="shrink-0 z-40 bg-[#070707]/98 border-t border-[#C8A24A]/30">
            <BottomNav
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab);
              }}
            />
          </div>
        )}

        {/* Android Navigation Gesture Bar */}
        <div className="shrink-0 bg-[#070707]/98">
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

      {/* Luxury Mosque & Golden Crescent Welcome Overlay */}
      <LuxuryWelcomeSplashModal
        isOpen={isLuxurySplashOpen && !isOnboardingOpen}
        onEnter={handleCloseLuxurySplash}
      />

      {/* Floating Draggable Voice Assistant Button (Only visible when user enables Voice Assistant in Settings) */}
      {isVoiceSystemEnabled && readingSurahNumber === null && (
        <VoiceFloatingButton
          onClick={() => setIsVoiceAssistantOpen(true)}
        />
      )}

      {/* Interactive Voice Assistant Modal / HUD (Only active when Voice Assistant is enabled) */}
      {isVoiceSystemEnabled && (
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
      )}

      {/* Digital Tasbih Modal */}
      <DigitalTasbihModal
        isOpen={isTasbihOpen}
        onClose={() => setIsTasbihOpen(false)}
        onNavigateToAdhkar={() => {
          setIsTasbihOpen(false);
          setActiveTab('adhkar');
        }}
      />

      {/* Zakat & Charity Calculator Modal */}
      <ZakatAndCharityModal
        isOpen={isZakatOpen}
        onClose={() => setIsZakatOpen(false)}
      />

      {/* Sakina & Rights Oasis Modal */}
      <SakinaAndRightsModal
        isOpen={isSakinaOpen}
        onClose={() => setIsSakinaOpen(false)}
      />

      {/* Achievements Overview Modal */}
      <AchievementsOverviewModal
        isOpen={isAchievementsOpen}
        onClose={() => setIsAchievementsOpen(false)}
        onNavigateToQuran={() => {
          setIsAchievementsOpen(false);
          setActiveTab('quran');
        }}
        onNavigateToAdhkar={() => {
          setIsAchievementsOpen(false);
          setActiveTab('adhkar');
        }}
        onNavigateToPrayers={() => {
          setIsAchievementsOpen(false);
          setActiveTab('prayers');
        }}
      />

      {/* Islamic Wake-Up & Fajr Alarm Manager Modal */}
      <IslamicAlarmModal
        isOpen={isAlarmModalOpen}
        onClose={() => setIsAlarmModalOpen(false)}
      />

      {/* Full-Screen Islamic Alarm Ringing Overlay */}
      <AlarmRingingModal />

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
