import { LocalNotifications } from '@capacitor/local-notifications';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { NativeNotificationService } from './services/nativeNotificationService';
import { NavigationTab, Coordinates, AdhkarCategory } from './types';
import { StorageService } from './services/storageService';
import { ReminderEngine } from './services/reminderService';
import { ImagePreloadService } from './services/imagePreloadService';
import { DynamicArtworkBackground } from './components/DynamicArtworkBackground';
import { AndroidNavigationBar } from './components/AndroidNavigationBar';
import { BottomNav } from './components/BottomNav';
import { LockScreenOverlay } from './components/LockScreenOverlay';
import { CodeInspectorModal } from './components/CodeInspectorModal';
import { GlobalMiniPlayer } from './components/GlobalMiniPlayer';
import { VoiceAssistantModal } from './components/VoiceAssistantModal';
import { VoiceFloatingButton } from './components/VoiceFloatingButton';
import { DigitalTasbihModal } from './components/DigitalTasbihModal';
import { ZakatAndCharityModal } from './components/ZakatAndCharityModal';
import { AchievementsOverviewModal } from './components/AchievementsOverviewModal';
import { LuxuryWelcomeSplashModal } from './components/LuxuryWelcomeSplashModal';
import { IslamicAlarmModal } from './components/IslamicAlarmModal';
import { AlarmRingingModal } from './components/AlarmRingingModal';
import { AdhanRingingModal } from './components/AdhanRingingModal';
import { InAppNotificationBanner } from './components/InAppNotificationBanner';
import { AyahPodcastSheet } from './components/AyahPodcastSheet';
import { ShareCardModal, ShareCardPayload } from './components/ShareCardModal';
import { AlarmService } from './services/alarmService';
import { VoiceAssistant } from './services/voiceAssistantService';
import { AudioService } from './services/audioService';
import { MORNING_FULL_AUDIO_URL, EVENING_FULL_AUDIO_URL } from './data/adhkarData';
import { OngoingPrayerService } from './services/ongoingPrayerService';

import { HomeView } from './views/HomeView';
import { PrayersView } from './views/PrayersView';
import { QuranView } from './views/QuranView';
import { QuranReaderView } from './views/QuranReaderView';
import { AdhkarView } from './views/AdhkarView';
import { StoriesView } from './views/StoriesView';
import { ExploreView } from './views/ExploreView';
import { QiblaView } from './views/QiblaView';
import { RemindersView } from './views/RemindersView';
import { SettingsView } from './views/SettingsView';
import { AtharCompanionView } from './views/AtharCompanionView';
import { AdaptiveJourneyView } from './views/AdaptiveJourneyView';
import { OnboardingModal } from './views/OnboardingModal';
import { CompanionMoodId } from './data/companionData';
import { LocationService } from './services/locationService';
import { OfflineDatabase } from './services/offlineDatabase';
import { LiveActivityService } from './services/liveActivityService';
import { SmartSilenceService } from './services/smartSilenceService';

export const App: React.FC = () => {
  useEffect(() => {
    // 1. Request permissions, create high-priority channels (importance: 5), and schedule exact prayer times for 7 days
    NativeNotificationService.initAndScheduleAll().catch((err) => {
      console.warn('[App] Native notification setup error:', err);
    });

    // 2. Initialize Ongoing Prayer Notification & Android Widget service
    OngoingPrayerService.init();

    // 3. Listen to Native Full-Screen Athan / incoming intent from MainActivity
    const handleIncomingAthan = (e: any) => {
      const prayer = e?.detail?.prayer || 'صلاة الفجر';
      ReminderEngine.launchFullScreenAdhan({
        prayerNameArabic: prayer,
      });
    };
    window.addEventListener('athar_incoming_athan', handleIncomingAthan);

    // 4. Lightweight check when app is resumed from background
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        OngoingPrayerService.init();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('athar_incoming_athan', handleIncomingAthan);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);
  useEffect(() => {
    try {
      CapacitorUpdater.notifyAppReady().catch(() => {});

      const listenerPromise = CapacitorUpdater.addListener('downloadComplete', async () => {
        try {
          await CapacitorUpdater.reload();
        } catch (e) {
          console.warn('CapacitorUpdater reload:', e);
        }
      });

      return () => {
        listenerPromise.then((handle) => handle?.remove?.()).catch(() => {});
      };
    } catch (e) {
      console.warn('CapacitorUpdater init:', e);
    }
  }, []);
  const getInitialTab = (): NavigationTab => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab') as NavigationTab;
        const validTabs: NavigationTab[] = [
          'home',
          'journey',
          'companion',
          'prayers',
          'quran',
          'adhkar',
          'stories',
          'explore',
          'qibla',
          'reminders',
          'settings',
        ];
        if (tabParam && validTabs.includes(tabParam)) {
          return tabParam;
        }
      }
    } catch {}
    return 'home';
  };

  const [activeTab, setActiveTab] = useState<NavigationTab>(getInitialTab);
  const [visitedTabs, setVisitedTabs] = useState<Set<NavigationTab>>(() => new Set([getInitialTab()]));
  const mainScrollRef = useRef<HTMLElement>(null);
  const tabScrollPositionsRef = useRef<Partial<Record<NavigationTab, number>>>({});

  const navigateToTab = (tab: NavigationTab) => {
    ImagePreloadService.preloadTabImages(tab);

    if (tab === activeTab) {
      // Tapping already active tab smoothly scrolls to top
      mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Save previous tab's scroll position
    if (mainScrollRef.current) {
      tabScrollPositionsRef.current[activeTab] = mainScrollRef.current.scrollTop;
    }

    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
    setActiveTab(tab);

    // Restore destination tab's scroll position
    requestAnimationFrame(() => {
      if (mainScrollRef.current) {
        const savedPos = tabScrollPositionsRef.current[tab] ?? 0;
        mainScrollRef.current.scrollTop = savedPos;
      }
    });
  };

  const [journeyInitialNodeId, setJourneyInitialNodeId] = useState<string | undefined>(undefined);
  const [journeyOpenOnboarding, setJourneyOpenOnboarding] = useState<boolean>(false);
  const [companionReturnTab, setCompanionReturnTab] = useState<NavigationTab>('explore');
  const [exploreSubView, setExploreSubView] = useState<'main' | 'quran_library' | 'fatwas' | 'articles' | 'tools' | 'area_radar'>('main');
  const [readingSurahNumber, setReadingSurahNumber] = useState<number | null>(null);
  const [readingInitialAyah, setReadingInitialAyah] = useState<number>(1);
  const [coordinates, setCoordinates] = useState<Coordinates>(StorageService.getSettings().location);
  const [companionMood, setCompanionMood] = useState<CompanionMoodId>('anxious');
  
  // Adhkar playback state
  const [adhkarCategory, setAdhkarCategory] = useState<AdhkarCategory>('morning');
  const [autoOpenAdhkarPlayer, setAutoOpenAdhkarPlayer] = useState<boolean>(false);

  // Luxury Splash Screen (Mosque & Golden Crescent)
  // Only shows once for a first-time user right after onboarding, never on normal app reopen
  const [isLuxurySplashOpen, setIsLuxurySplashOpen] = useState<boolean>(() => {
    try {
      const hasSeen = localStorage.getItem('athar_luxury_splash_seen');
      if (hasSeen === '1') return false;
      // If user has already completed onboarding before, mark as seen and do not show on reopen
      if (StorageService.getSettings().hasCompletedOnboarding) {
        localStorage.setItem('athar_luxury_splash_seen', '1');
        return false;
      }
      return false; // Will open right after onboarding permissions finish
    } catch {
      return false;
    }
  });

  // Overlays & Modals
  const [isLockScreenOpen, setIsLockScreenOpen] = useState<boolean>(false);
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
  const [globalShareCardPayload, setGlobalShareCardPayload] = useState<ShareCardPayload | null>(null);
  const [smartSilenceNotice, setSmartSilenceNotice] = useState<string | null>(null);

  useEffect(() => {
    // Initialize Smart Silence System (Device Flip to Mute, Volume/Power Keys & Screen Lock)
    SmartSilenceService.init();

    const onSmartSilence = (e: any) => {
      const type = e?.detail?.triggerType;
      const typeArabic =
        type === 'flip_face_down'
          ? 'بقلب الهاتف على وجهه'
          : type === 'volume_key'
          ? 'بأزرار الصوت'
          : type === 'lock_screen'
          ? 'بقفل الشاشة'
          : 'بإيماءة السكون';
      setSmartSilenceNotice(`تم كتم الصوت ذكياً ${typeArabic} 🔕`);
      setTimeout(() => setSmartSilenceNotice(null), 3500);
    };

    window.addEventListener('athar_smart_silence_triggered', onSmartSilence);
    // Warm up and decode sacred mosque scenes and core luxury images asynchronously
    ImagePreloadService.warmupCoreImages();

    // Initialize & seed local offline IndexedDB database (Cities, Astronomical Prayer Params, Quran, Tafsir, Adhkar, Hadiths, Sunan)
    OfflineDatabase.initializeAndSeedCoreData().catch(() => {});

    // Automatically check and reset all daily trackers at 12:00 AM local midnight (00:00)
    StorageService.checkAndPerformMidnightDailyReset();
    const midnightResetWatcher = setInterval(() => {
      StorageService.checkAndPerformMidnightDailyReset();
    }, 15000);

    const onAppVisibleOrFocused = () => {
      StorageService.checkAndPerformMidnightDailyReset();
    };
    document.addEventListener('visibilitychange', onAppVisibleOrFocused);
    window.addEventListener('focus', onAppVisibleOrFocused);

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
      window.removeEventListener('athar_smart_silence_triggered', onSmartSilence);
      document.removeEventListener('visibilitychange', onAppVisibleOrFocused);
      window.removeEventListener('focus', onAppVisibleOrFocused);
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
      localStorage.setItem('athar_luxury_splash_seen', '1');
      sessionStorage.setItem('athar_luxury_splash_seen', '1');
    } catch {}
    setIsLuxurySplashOpen(false);
  };

  return (
    <div
      dir="rtl"
      lang="ar"
      className="relative h-screen h-[100dvh] max-h-screen max-h-[100dvh] overflow-hidden bg-[#070707] text-white flex flex-col selection:bg-[#C8A24A]/30 selection:text-white font-arabic"
    >
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
        {/* Smart Silence Gesture Confirmation Toast */}
        {smartSilenceNotice && (
          <div className="fixed top-20 left-4 right-4 z-50 flex justify-center pointer-events-none select-none">
            <div className="bg-[#17140E]/95 border border-[#E6C66E]/70 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs font-bold text-[#F3E5AB] flex items-center gap-2 animate-slideDown pointer-events-auto">
              <span className="text-base">🔕</span>
              <span>{smartSilenceNotice}</span>
            </div>
          </div>
        )}

        {/* Active Screen Body (Scrollable internal viewport) */}
        <main ref={mainScrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <Suspense
            fallback={
              <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-3">
                <div className="w-10 h-10 rounded-full border-2 border-[#D6B36A]/30 border-t-[#D6B36A] animate-spin" />
                <p className="text-xs font-bold text-[#D6B36A]">
                  جاري تحميل الصفحة
                </p>
              </div>
            }
          >
            {readingSurahNumber !== null ? (
              <QuranReaderView
                surahNumber={readingSurahNumber}
                initialAyah={readingInitialAyah}
                onBack={handleCloseReader}
                onSelectAnotherSurah={(num) => handleSelectSurah(num, 1)}
              />
            ) : (
              <>
                <div className={activeTab === 'home' ? 'block' : 'hidden'}>
                  <HomeView
                    isActive={activeTab === 'home'}
                    onNavigate={navigateToTab}
                    onOpenCompanion={(mood) => {
                      if (mood) setCompanionMood(mood);
                      setCompanionReturnTab('home');
                      navigateToTab('companion');
                    }}
                    onOpenVoiceAssistant={() => setIsVoiceAssistantOpen(true)}
                    coordinates={coordinates}
                    onLocationChange={handleLocationChange}
                    onSelectSurah={(surahNum, ayahNum) => handleSelectSurah(surahNum, ayahNum || 1)}
                    onOpenZakat={() => setIsZakatOpen(true)}
                    onOpenSakina={() => navigateToTab('companion')}
                    onOpenSplashPreview={() => setIsLuxurySplashOpen(true)}
                  />
                </div>

                {visitedTabs.has('journey') && (
                  <div className={activeTab === 'journey' ? 'block' : 'hidden'}>
                    <AdaptiveJourneyView
                      initialNodeId={journeyInitialNodeId}
                      initialOpenOnboarding={journeyOpenOnboarding}
                      onNavigate={navigateToTab}
                      onSelectSurah={(surahNum, ayahNum) => handleSelectSurah(surahNum, ayahNum || 1)}
                      onBack={() => {
                        setJourneyInitialNodeId(undefined);
                        setJourneyOpenOnboarding(false);
                        navigateToTab('explore');
                      }}
                    />
                  </div>
                )}

                {visitedTabs.has('companion') && (
                  <div className={activeTab === 'companion' ? 'block' : 'hidden'}>
                    <AtharCompanionView
                      initialMood={companionMood}
                      onNavigate={navigateToTab}
                      onSelectSurah={(surahNum, ayahNum) => handleSelectSurah(surahNum, ayahNum || 1)}
                      onBack={() => navigateToTab(companionReturnTab)}
                    />
                  </div>
                )}

                {visitedTabs.has('prayers') && (
                  <div className={activeTab === 'prayers' ? 'block' : 'hidden'}>
                    <PrayersView
                      isActive={activeTab === 'prayers'}
                      coordinates={coordinates}
                      onLocationChange={handleLocationChange}
                      onSelectSurah={(surahNum, ayahNum) => handleSelectSurah(surahNum, ayahNum || 1)}
                    />
                  </div>
                )}

                {visitedTabs.has('quran') && (
                  <div className={activeTab === 'quran' ? 'block' : 'hidden'}>
                    <QuranView onSelectSurah={handleSelectSurah} />
                  </div>
                )}

                {visitedTabs.has('adhkar') && (
                  <div className={activeTab === 'adhkar' ? 'block' : 'hidden'}>
                    <AdhkarView
                      onNavigate={navigateToTab}
                      onSelectSurah={(surahNum, ayahNum) => handleSelectSurah(surahNum, ayahNum || 1)}
                      initialCategory={adhkarCategory}
                      autoOpenPlayer={autoOpenAdhkarPlayer}
                    />
                  </div>
                )}

                {visitedTabs.has('stories') && (
                  <div className={activeTab === 'stories' ? 'block' : 'hidden'}>
                    <StoriesView
                      onBack={() => navigateToTab('home')}
                    />
                  </div>
                )}

                {visitedTabs.has('explore') && (
                  <div className={activeTab === 'explore' ? 'block' : 'hidden'}>
                    <ExploreView
                      initialSubView={exploreSubView}
                      onSubViewChange={setExploreSubView}
                      onNavigate={(tab) => {
                        if (tab === 'companion') {
                          setCompanionReturnTab('explore');
                        }
                        navigateToTab(tab);
                      }}
                      onOpenJourney={(nodeId, openOnboarding) => {
                        setJourneyInitialNodeId(nodeId);
                        setJourneyOpenOnboarding(Boolean(openOnboarding));
                        navigateToTab('journey');
                      }}
                      onSelectSurah={(surahNum, ayahNum) => handleSelectSurah(surahNum, ayahNum || 1)}
                      onOpenTasbih={() => setIsTasbihOpen(true)}
                      onOpenZakat={() => setIsZakatOpen(true)}
                      onOpenSakina={() => navigateToTab('companion')}
                      onOpenAchievements={() => setIsAchievementsOpen(true)}
                      onOpenAlarm={() => setIsAlarmModalOpen(true)}
                    />
                  </div>
                )}

                {activeTab === 'qibla' && (
                  <div className="block">
                    <QiblaView
                      coordinates={coordinates}
                      onLocationChange={handleLocationChange}
                    />
                  </div>
                )}

                {activeTab === 'reminders' && (
                  <div className="block">
                    <RemindersView onClose={() => navigateToTab('settings')} />
                  </div>
                )}

                {visitedTabs.has('settings') && (
                  <div className={activeTab === 'settings' ? 'block' : 'hidden'}>
                    <SettingsView
                      onOpenCodeInspector={() => setIsCodeInspectorOpen(true)}
                      onOpenRemindersCenter={() => navigateToTab('reminders')}
                      onOpenVoiceAssistant={() => setIsVoiceAssistantOpen(true)}
                      onOpenAlarmModal={() => setIsAlarmModalOpen(true)}
                      onLocationChange={handleLocationChange}
                    />
                  </div>
                )}
              </>
            )}
          </Suspense>
        </main>

        {/* Global Floating Mini Player (Quran, Adhkar & Minimized Ayah Podcast persistent audio across all tabs) */}
        <GlobalMiniPlayer
          onOpenSurahReader={(surahNum, ayahNum) => handleSelectSurah(surahNum, ayahNum || 1)}
          onNavigateToTab={(tab) => {
            if (readingSurahNumber !== null) setReadingSurahNumber(null);
            navigateToTab(tab);
          }}
        />

        {/* Bottom Navigation (Permanently pinned at bottom - never requires scrolling!) */}
        {readingSurahNumber === null && (
          <div className="shrink-0 z-40 bg-[#070707]/98 border-t border-[#C8A24A]/30">
            <BottomNav
              activeTab={activeTab === 'journey' ? 'explore' : activeTab}
              onTabChange={(tab) => {
                navigateToTab(tab);
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
                navigateToTab('home');
              }
            }}
          />
        </div>
      </div>

      {/* Global Ayah Podcast Sheet (Supports Minimize to GlobalMiniPlayer & Expand from any tab) */}
      <AyahPodcastSheet
        onShareEpisodeCard={(payload) => {
          setGlobalShareCardPayload({
            category: 'ayah',
            title: payload.title,
            mainText: payload.mainText,
            sourceLabel: payload.sourceLabel,
            subtitleOrTafsir: payload.subtitleOrTafsir,
          });
        }}
      />

      {/* Global Share Card Modal for Podcast Episode Sharing */}
      <ShareCardModal
        isOpen={Boolean(globalShareCardPayload)}
        onClose={() => setGlobalShareCardPayload(null)}
        initialPayload={globalShareCardPayload}
      />

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

      {/* Full-Screen Priority Royal Adhan Screen Overlay (z-[99999]) */}
      <AdhanRingingModal />

      {/* Royal Luxury In-App Notification Banner (z-[99990]) */}
      <InAppNotificationBanner />

      {/* Interactive Android Overlays */}
      <LockScreenOverlay
        isOpen={isLockScreenOpen}
        onUnlock={() => setIsLockScreenOpen(false)}
        hijriDate="٢٧ ربيع الأول ١٤٤٨ هـ"
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onFinish={(coords) => {
          setIsOnboardingOpen(false);
          if (coords) handleLocationChange(coords);
          try {
            if (localStorage.getItem('athar_luxury_splash_seen') !== '1') {
              setIsLuxurySplashOpen(true);
            }
          } catch {}
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
