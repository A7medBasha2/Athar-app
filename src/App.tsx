import { CapacitorUpdater } from '@capgo/capacitor-updater';
import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { NavigationTab, Coordinates, AdhkarCategory } from './types';
import { StorageService } from './services/storageService';
import { NativePermissionsBridge } from './services/nativePermissionsBridge';
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
import { SakinaAndRightsModal } from './components/SakinaAndRightsModal';
import { AyahPodcastSheet } from './components/AyahPodcastSheet';
import { ShareCardModal, ShareCardPayload } from './components/ShareCardModal';
import { VoiceAssistant } from './services/voiceAssistantService';
import { AudioService } from './services/audioService';
import { MORNING_FULL_AUDIO_URL, EVENING_FULL_AUDIO_URL } from './data/adhkarData';
import { AdhanRingingModal } from './components/AdhanRingingModal';

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
import { PermissionsSetupWizard } from './components/PermissionsSetupWizard';
import { CompanionMoodId } from './data/companionData';
import { LocationService } from './services/locationService';
import { OfflineDatabase } from './services/offlineDatabase';
import { LiveActivityService } from './services/liveActivityService';
import { SmartSilenceService } from './services/smartSilenceService';
import { ReminderEngine } from './services/reminderService';
import { RoyalReminderEngine } from './services/royalReminderEngine';
import { RoyalNotificationSheet } from './components/RoyalNotificationSheet';
import { BackgroundKeepAliveService } from './services/backgroundKeepAliveService';

export const App: React.FC = () => {
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

  // Deep-link navigation listener from Native Android Home Screen Live Widget
  useEffect(() => {
    const handleNavigateTab = (e: any) => {
      const tab = e?.detail?.tab as NavigationTab;
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
      if (tab && validTabs.includes(tab)) {
        navigateToTab(tab);
      }
    };
    window.addEventListener('athar_navigate_tab', handleNavigateTab);
    return () => {
      window.removeEventListener('athar_navigate_tab', handleNavigateTab);
    };
  }, [activeTab]);

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
  const [sakinaInitialTab, setSakinaInitialTab] = useState<'heart_healing' | 'tadabbur' | 'kinship' | 'intentions' | 'rights_wasiyyah'>('kinship');
  const [isAchievementsOpen, setIsAchievementsOpen] = useState<boolean>(false);
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState<boolean>(false);
  const [globalShareCardPayload, setGlobalShareCardPayload] = useState<ShareCardPayload | null>(null);
  const [smartSilenceNotice, setSmartSilenceNotice] = useState<string | null>(null);
  const [callNotice, setCallNotice] = useState<string | null>(null);

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

    const onCallState = (e: any) => {
      const state = e?.detail?.state;
      if (state === 'incoming') {
        setCallNotice('مكالمة هاتفية 📞 — تم إيقاف الصوت مؤقتاً لحين انتهاء المكالمة');
      } else if (state === 'ended') {
        setCallNotice('انتهت المكالمة 📞 — تم استئناف التشغيل تلقائياً من موضع التوقف ✓');
        setTimeout(() => setCallNotice(null), 3000);
      }
    };

    window.addEventListener('athar_smart_silence_triggered', onSmartSilence);
    window.addEventListener('athar_call_state', onCallState);
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

    // Start automatic GPS tracking so traveling or changing area updates Qibla & prayer times automatically
    const stopAutoLocation = LocationService.startAutoTracking((newCoords) => {
      setCoordinates(newCoords);
      const s = StorageService.getSettings();
      s.location = newCoords;
      StorageService.saveSettings(s);
      LiveActivityService.updateLocationAndMethod(newCoords, s.calculationMethod);
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

    const handleOpenParentsDuty = (e: any) => {
      const audioUrl = e?.detail?.audioUrl || 'public/audio/parents.mp3';
      setSakinaInitialTab('kinship');
      setIsSakinaOpen(true);
      AudioService.playUrl(audioUrl, 'reminder_parents', {
        title: 'دعاء بر الوالدين والإحسان إليهما',
        subtitle: '﴿وَقَضَىٰ رَبُّكَ أَلَّا تَعْبُدُوا إِلَّا إِيَّاهُ وَبِالْوَالِدَيْنِ إِحْسَانًا﴾',
      }).catch(() => {});
    };

    const handleOpenAyah = (e: any) => {
      const surahNum = Number(e?.detail?.surahNumber) || 1;
      const ayahNum = Number(e?.detail?.ayahNumber) || 1;
      const audioUrl = e?.detail?.audioUrl;
      navigateToTab('quran');
      handleSelectSurah(surahNum, ayahNum);
      if (audioUrl) {
        AudioService.playUrl(audioUrl, 'reminder_verse', {
          title: `سورة ${surahNum} - آية ${ayahNum}`,
          subtitle: 'تلاوة الآية المباركة',
        }).catch(() => {});
      }
    };

    const handleOpenWird = () => {
      setReadingSurahNumber(null);
      navigateToTab('quran');
      window.dispatchEvent(new CustomEvent('athar_switch_quran_tab', { detail: { tab: 'khatmah' } }));
    };

    const handleOpenTasbih = () => {
      setIsTasbihOpen(true);
    };

    const handleOpenAdhkar = (e: any) => {
      const cat = (e?.detail?.category || 'morning') as AdhkarCategory;
      setAdhkarCategory(cat);
      navigateToTab('adhkar');
    };

    window.addEventListener('athar_open_parents_duty', handleOpenParentsDuty);
    window.addEventListener('athar_open_ayah', handleOpenAyah);
    window.addEventListener('athar_open_wird', handleOpenWird);
    window.addEventListener('athar_open_tasbih', handleOpenTasbih);
    window.addEventListener('athar_open_adhkar', handleOpenAdhkar);



    // Check if a direct deep-link was queued during cold launch
    const checkPendingDeepLink = () => {
      try {
        if (typeof (window as any).AtharNative?.getPendingDeepLink === 'function') {
          const raw = (window as any).AtharNative.getPendingDeepLink();
          if (raw && typeof raw === 'string' && raw.trim().startsWith('{')) {
            const parsed = JSON.parse(raw);
            if (parsed.openWird) {
              handleOpenWird();
            } else if (parsed.surahNumber > 0) {
              handleOpenAyah({ detail: parsed });
            } else if (parsed.openParentsModal) {
              handleOpenParentsDuty({ detail: parsed });
            } else if (parsed.openTasbih) {
              handleOpenTasbih();
            } else if (parsed.adhkarCategory) {
              handleOpenAdhkar({ detail: { category: parsed.adhkarCategory } });
            } else if (parsed.targetTab) {
              navigateToTab(parsed.targetTab);
            }
          }
        }
      } catch (err) {
        console.warn('Check pending deep link error:', err);
      }
    };
    checkPendingDeepLink();
    const deepLinkTimer = setTimeout(checkPendingDeepLink, 800);

    return () => {
      window.removeEventListener('athar_open_parents_duty', handleOpenParentsDuty);
      window.removeEventListener('athar_open_ayah', handleOpenAyah);
      window.removeEventListener('athar_open_wird', handleOpenWird);
      window.removeEventListener('athar_open_tasbih', handleOpenTasbih);
      window.removeEventListener('athar_open_adhkar', handleOpenAdhkar);
      clearTimeout(deepLinkTimer);
      window.removeEventListener('athar_smart_silence_triggered', onSmartSilence);
      window.removeEventListener('athar_call_state', onCallState);
      document.removeEventListener('visibilitychange', onAppVisibleOrFocused);
      window.removeEventListener('focus', onAppVisibleOrFocused);
      if (timer) clearTimeout(timer);
      clearInterval(midnightResetWatcher);
      stopAutoLocation();
      unsubVoice();
      RoyalReminderEngine.stop();
    };
  }, []);

  useEffect(() => {
    // 1. Start Royal Reminder Engine
    RoyalReminderEngine.start();

    // 2. Start inaudible audio keep-alive and WakeLock for continuous background timer precision
    BackgroundKeepAliveService.start().catch((err) => {
      console.warn('[App] Background keep-alive start error:', err);
    });

    // 3. Service Worker message listener for Royal Adhan & Royal Alerts when waking up from closed state
    let handleSwMessage: ((event: MessageEvent) => void) | null = null;
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      handleSwMessage = (event: MessageEvent) => {
        if (event.data?.type === 'LAUNCH_ROYAL_SCREEN') {
          const payload = event.data.data;
          if (payload?.type === 'royal_adhan') {
            const pId = payload.prayerId || 'maghrib';
            ReminderEngine.launchFullScreenAdhan({
              prayerId: pId,
              prayerName: ReminderEngine.getPrayerArabicName(pId),
              prayerTime12: payload.prayerTime12 || '',
            });
          } else if (payload?.type === 'royal_alert') {
            RoyalReminderEngine.triggerAlertImmediately(payload.alertType || 'dhikr_salawat');
          }
        }
      };
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    // 4. Cold launch via URL deep link query parameters: ?launch_royal_adhan=xxx or ?launch_royal_alert=xxx
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const launchAdhan = urlParams.get('launch_royal_adhan');
        const launchAlert = urlParams.get('launch_royal_alert');

        if (launchAdhan) {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);

          setTimeout(() => {
            ReminderEngine.launchFullScreenAdhan({
              prayerId: launchAdhan as any,
              prayerName: ReminderEngine.getPrayerArabicName(launchAdhan as any),
              prayerTime12: '',
            });
          }, 350);
        } else if (launchAlert) {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);

          setTimeout(() => {
            RoyalReminderEngine.triggerAlertImmediately(launchAlert as any);
          }, 350);
        }
      }
    } catch (e) {
      console.warn('Cold launch query check error:', e);
    }

    return () => {
      RoyalReminderEngine.stop();
      BackgroundKeepAliveService.stop();
      if (handleSwMessage && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, []);

  const handleSelectSurah = (surahNum: number, ayahNum: number = 1) => {
    setReadingSurahNumber(surahNum);
    setReadingInitialAyah(ayahNum);
  };

  const handleRoyalNavigate = (tab: NavigationTab, payload?: any) => {
    if (tab === 'quran') {
      if (payload?.surahNumber && payload?.ayahNumber) {
        handleSelectSurah(payload.surahNumber, payload.ayahNumber);
      } else {
        setReadingSurahNumber(null);
        window.dispatchEvent(new CustomEvent('athar_switch_quran_tab', { detail: { tab: 'khatmah' } }));
      }
      navigateToTab('quran');
    } else if (tab === 'adhkar') {
      if (payload?.adhkarCategory) {
        setAdhkarCategory(payload.adhkarCategory);
      }
      navigateToTab('adhkar');
    } else if (payload?.openSakina) {
      if (payload?.sakinaTab) {
        setSakinaInitialTab(payload.sakinaTab);
      }
      setIsSakinaOpen(true);
    } else {
      navigateToTab(tab);
    }
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

        {/* Incoming/Ending Phone Call Auto-Pause & Resume Notice */}
        {callNotice && (
          <div className="fixed top-20 left-4 right-4 z-50 flex justify-center pointer-events-none select-none">
            <div className="bg-gradient-to-r from-[#211B0F] via-[#15120B] to-[#211B0F] border border-[#E6C66E]/80 px-4 py-2.5 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.9)] backdrop-blur-md text-xs font-bold text-[#F3E5AB] flex items-center gap-2 animate-slideDown pointer-events-auto">
              <span>{callNotice}</span>
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

      {/* Sakina, Rights, Kinship & Parents Supplications Modal */}
      <SakinaAndRightsModal
        isOpen={isSakinaOpen}
        onClose={() => setIsSakinaOpen(false)}
        initialTab={sakinaInitialTab}
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


      {/* Luxury Full-Screen Priority Adhan Screen Overlay */}
      <AdhanRingingModal />

      {/* Luxury Floating Gold Glass Card for Royal Reminders & Dhikr */}
      <RoyalNotificationSheet onNavigate={handleRoyalNavigate} />

      {/* Interactive Android Overlays */}
      <LockScreenOverlay
        isOpen={isLockScreenOpen}
        onUnlock={() => setIsLockScreenOpen(false)}
        hijriDate="٢٧ ربيع الأول ١٤٤٨ هـ"
      />

      <PermissionsSetupWizard
        isOpen={isOnboardingOpen}
        onFinish={(coords) => {
          setIsOnboardingOpen(false);
          const s = StorageService.getSettings();
          s.hasCompletedOnboarding = true;
          if (coords) s.location = coords;
          StorageService.saveSettings(s);

          if (coords) handleLocationChange(coords);
          // Transition seamlessly to LuxuryWelcome screen
          setIsLuxurySplashOpen(true);
        }}
        onSkip={() => {
          setIsOnboardingOpen(false);
          const s = StorageService.getSettings();
          s.hasCompletedOnboarding = true;
          StorageService.saveSettings(s);
          setIsLuxurySplashOpen(true);
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
