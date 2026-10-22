import { CapacitorUpdater } from '@capgo/capacitor-updater';
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { NavigationTab, Coordinates, AdhkarCategory, ObligatoryPrayerId } from './types';
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
import { ShareCardModal, ShareCardPayload } from './components/ShareCardModal';
import { AppUpdateModal } from './components/AppUpdateModal';
import { FullScreenAzanOverlayModal } from './components/FullScreenAzanOverlayModal';
import { AppUpdateService, UpdateInfo } from './services/appUpdateService';
import { VoiceAssistant } from './services/voiceAssistantService';
import { AudioService } from './services/audioService';
import { MORNING_FULL_AUDIO_URL, EVENING_FULL_AUDIO_URL } from './data/adhkarData';
import { BackNavigationService } from './services/backNavigationService';
import { AndroidExitToast } from './components/AndroidExitToast';
import { BackgroundKeepAliveService } from './services/backgroundKeepAliveService';

import { HomeView } from './views/HomeView';
import { PrayersView } from './views/PrayersView';
import { QuranView } from './views/QuranView';
import { QuranReaderView } from './views/QuranReaderView';
import { AdhkarView } from './views/AdhkarView';
import { StoriesView } from './views/StoriesView';
import { ExploreView, ExploreSubView } from './views/ExploreView';
import { QiblaView } from './views/QiblaView';
import { AtharCompanionView } from './views/AtharCompanionView';
import { AdaptiveJourneyView } from './views/AdaptiveJourneyView';
import { SettingsView } from './views/SettingsView';
import { ProfileDashboardView } from './views/ProfileDashboardView';
import { GamaaCommunityView } from './views/GamaaCommunityView';
import { PermissionsSetupWizard } from './components/PermissionsSetupWizard';
import { CompanionMoodId } from './data/companionData';
import { LocationService } from './services/locationService';
import { OfflineDatabase } from './services/offlineDatabase';
import { LiveActivityService } from './services/liveActivityService';
import { SmartSilenceService } from './services/smartSilenceService';
import { ReminderEngine } from './services/reminderService';
import { NativeNotificationService } from './services/nativeNotificationService';
import { LocalNotifications } from '@capacitor/local-notifications';
import { User } from 'firebase/auth';
import { AuthService } from './services/authService';
import { AuthView } from './views/AuthView';
import { AtharBrandLogo } from './components/AtharBrandLogo';
import { Sparkles, X } from 'lucide-react';

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
          'gamaa',
          'journey',
          'companion',
          'prayers',
          'quran',
          'adhkar',
          'stories',
          'explore',
          'qibla',
          'settings',
          'profile',
          'achievements',
        ];
        if (tabParam && validTabs.includes(tabParam)) {
          return tabParam;
        }
      }
    } catch {}
    return 'home';
  };

  const [activeTab, setActiveTab] = useState<NavigationTab>(getInitialTab);
  const [tabHistory, setTabHistory] = useState<NavigationTab[]>(() => [getInitialTab()]);
  const [visitedTabs, setVisitedTabs] = useState<Set<NavigationTab>>(() => new Set([getInitialTab()]));
  const mainScrollRef = useRef<HTMLElement>(null);
  const tabScrollPositionsRef = useRef<Partial<Record<NavigationTab, number>>>({});

  const navigateToTab = (tab: NavigationTab, isBack = false) => {
    if (tab === 'achievements') {
      navigateToTab('profile', isBack);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('athar_open_achievements_tab'));
      }, 50);
      return;
    }

    if (tab === 'stories') {
      setExploreSubView('stories');
      tab = 'explore';
    }

    ImagePreloadService.preloadTabImages(tab);

    if (tab === activeTab) {
      mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (mainScrollRef.current) {
      tabScrollPositionsRef.current[activeTab] = mainScrollRef.current.scrollTop;
    }

    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });

    if (!isBack) {
      setTabHistory((prev) => {
        if (prev[prev.length - 1] === tab) return prev;
        return [...prev, tab];
      });
    }

    setActiveTab(tab);

    requestAnimationFrame(() => {
      if (mainScrollRef.current) {
        const savedPos = tabScrollPositionsRef.current[tab] ?? 0;
        mainScrollRef.current.scrollTop = savedPos;
      }
    });
  };

  useEffect(() => {
    const handleNavigateTab = (e: any) => {
      const tab = e?.detail?.tab as NavigationTab;
      const validTabs: NavigationTab[] = [
        'home',
        'gamaa',
        'journey',
        'companion',
        'prayers',
        'quran',
        'adhkar',
        'stories',
        'explore',
        'qibla',
        'settings',
        'profile',
        'achievements',
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
  const [exploreSubView, setExploreSubView] = useState<ExploreSubView>('main');
  const [readingSurahNumber, setReadingSurahNumber] = useState<number | null>(null);
  const [readingInitialAyah, setReadingInitialAyah] = useState<number>(1);
  const [coordinates, setCoordinates] = useState<Coordinates>(StorageService.getSettings().location);
  const [companionMood, setCompanionMood] = useState<CompanionMoodId>('grateful');
  
  const [adhkarCategory, setAdhkarCategory] = useState<AdhkarCategory>('morning');
  const [autoOpenAdhkarPlayer, setAutoOpenAdhkarPlayer] = useState<boolean>(false);

  const [isLuxurySplashOpen, setIsLuxurySplashOpen] = useState<boolean>(() => {
    try {
      const hasSeen = localStorage.getItem('athar_luxury_splash_seen');
      if (hasSeen === '1') return false;
      if (StorageService.getSettings().hasCompletedOnboarding) {
        localStorage.setItem('athar_luxury_splash_seen', '1');
        return false;
      }
      return false;
    } catch {
      return false;
    }
  });

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
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);

  // Firebase Auth State & Observer
  const [currentUser, setCurrentUser] = useState<User | null>(() => AuthService.getCurrentUser());
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isAuthViewOpen, setIsAuthViewOpen] = useState<boolean>(false);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('athar_guest_mode') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const unsub = AuthService.subscribeToAuthState((user) => {
      setCurrentUser(user);
      setIsAuthChecking(false);
      if (user) {
        try {
          localStorage.removeItem('athar_guest_mode');
        } catch {}
        setIsGuestMode(false);
        setIsAuthViewOpen(false);
      } else {
        // On initial check or session state update, reflect current guest preference from storage
        try {
          const guestSaved = localStorage.getItem('athar_guest_mode') === 'true';
          setIsGuestMode(guestSaved);
        } catch {}
      }
    });

    const handleOpenAuth = () => {
      setIsAuthViewOpen(true);
    };
    window.addEventListener('athar_open_auth', handleOpenAuth);

    return () => {
      unsub();
      window.removeEventListener('athar_open_auth', handleOpenAuth);
    };
  }, []);

  // Global Android Hardware / Gesture Back Button Handling with Stable State Ref
  const backNavStateRef = useRef({
    isAuthViewOpen,
    globalShareCardPayload,
    isUpdateModalOpen,
    isAlarmModalOpen,
    isAchievementsOpen,
    isSakinaOpen,
    isZakatOpen,
    isTasbihOpen,
    isVoiceAssistantOpen,
    isCodeInspectorOpen,
    isLockScreenOpen,
    journeyOpenOnboarding,
    readingSurahNumber,
    exploreSubView,
    activeTab,
    tabHistory,
  });

  backNavStateRef.current = {
    isAuthViewOpen,
    globalShareCardPayload,
    isUpdateModalOpen,
    isAlarmModalOpen,
    isAchievementsOpen,
    isSakinaOpen,
    isZakatOpen,
    isTasbihOpen,
    isVoiceAssistantOpen,
    isCodeInspectorOpen,
    isLockScreenOpen,
    journeyOpenOnboarding,
    readingSurahNumber,
    exploreSubView,
    activeTab,
    tabHistory,
  };

  useEffect(() => {
    BackNavigationService.init();

    const unregister = BackNavigationService.registerHandler('global_app_back_navigation', 100, () => {
      const state = backNavStateRef.current;

      // 1. Modals & Overlays (Highest Priority - close active overlay first)
      if (state.isAuthViewOpen) {
        setIsAuthViewOpen(false);
        return true;
      }
      if (state.globalShareCardPayload !== null) {
        setGlobalShareCardPayload(null);
        return true;
      }
      if (state.isUpdateModalOpen) {
        setIsUpdateModalOpen(false);
        return true;
      }
      if (state.isAlarmModalOpen) {
        setIsAlarmModalOpen(false);
        return true;
      }
      if (state.isAchievementsOpen) {
        setIsAchievementsOpen(false);
        return true;
      }
      if (state.isSakinaOpen) {
        setIsSakinaOpen(false);
        return true;
      }
      if (state.isZakatOpen) {
        setIsZakatOpen(false);
        return true;
      }
      if (state.isTasbihOpen) {
        setIsTasbihOpen(false);
        return true;
      }
      if (state.isVoiceAssistantOpen) {
        setIsVoiceAssistantOpen(false);
        return true;
      }
      if (state.isCodeInspectorOpen) {
        setIsCodeInspectorOpen(false);
        return true;
      }
      if (state.isLockScreenOpen) {
        setIsLockScreenOpen(false);
        return true;
      }
      if (state.journeyOpenOnboarding) {
        setJourneyOpenOnboarding(false);
        return true;
      }

      // 2. Subviews (Quran Reader or Explore Sub-Sections)
      if (state.readingSurahNumber !== null) {
        setReadingSurahNumber(null);
        return true;
      }
      if (state.activeTab === 'explore' && state.exploreSubView !== 'main') {
        setExploreSubView('main');
        return true;
      }

      // 3. Tab History Stack (Return through previous tabs step by step)
      if (state.tabHistory.length > 1) {
        const nextHistory = [...state.tabHistory];
        nextHistory.pop(); // Remove current active tab
        const prevTab = nextHistory[nextHistory.length - 1];
        setTabHistory(nextHistory);
        navigateToTab(prevTab, true);
        return true;
      }

      // 4. If current tab is not 'home' but history stack is empty
      if (state.activeTab !== 'home') {
        setTabHistory(['home']);
        navigateToTab('home', true);
        return true;
      }

      // 5. Root Screen ('home' with no overlays and no history):
      // Return false so BackNavigationService triggers double-tap exit logic!
      return false;
    });

    return () => {
      unregister();
    };
  }, []);

  useEffect(() => {
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
    ImagePreloadService.warmupCoreImages();

    OfflineDatabase.initializeAndSeedCoreData().catch(() => {});

    StorageService.checkAndPerformMidnightDailyReset();
    let midnightTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleNextMidnight = () => {
      StorageService.checkAndPerformMidnightDailyReset();
      const now = new Date();
      const tomorrowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2).getTime();
      const delay = Math.max(tomorrowMidnight - now.getTime(), 10000);
      midnightTimer = setTimeout(() => {
        scheduleNextMidnight();
      }, delay);
    };
    scheduleNextMidnight();

    const onAppVisibleOrFocused = () => {
      StorageService.checkAndPerformMidnightDailyReset();
    };
    document.addEventListener('visibilitychange', onAppVisibleOrFocused);
    window.addEventListener('focus', onAppVisibleOrFocused);

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

    const voiceSettings = VoiceAssistant.getSettings();
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (voiceSettings.enabled && voiceSettings.autoListenOnAppOpen) {
      timer = setTimeout(() => {
        setIsVoiceAssistantOpen(true);
      }, 1200);
    }

    const handleOpenParentsDuty = (_e?: any) => {
      setSakinaInitialTab('kinship');
      setIsSakinaOpen(true);
    };

    const handleOpenAyah = (e: any) => {
      const surahNum = Number(e?.detail?.surahNumber) || 1;
      const ayahNum = Number(e?.detail?.ayahNumber) || 1;
      navigateToTab('quran');
      handleSelectSurah(surahNum, ayahNum);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('athar_scroll_to_ayah', { detail: { surahNumber: surahNum, ayahNumber: ayahNum } }));
      }, 350);
    };

    const handleOpenWird = () => {
      setReadingSurahNumber(null);
      if (typeof window !== 'undefined') {
        (window as any).__athar_pending_quran_tab = 'khatmah';
      }
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

    const handleOpenPermissionsWizard = () => {
      setIsOnboardingOpen(true);
    };

    window.addEventListener('athar_open_parents_duty', handleOpenParentsDuty);
    window.addEventListener('athar_open_ayah', handleOpenAyah);
    window.addEventListener('athar_open_surah', handleOpenAyah);
    window.addEventListener('athar_open_wird', handleOpenWird);
    window.addEventListener('athar_open_tasbih', handleOpenTasbih);
    window.addEventListener('athar_open_adhkar', handleOpenAdhkar);
    window.addEventListener('athar_open_permissions_wizard', handleOpenPermissionsWizard);

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

    // In-App Update: Automatic silent check on startup (2.5s delay to ensure smooth initial render)
    const updateCheckTimer = setTimeout(() => {
      AppUpdateService.checkForUpdates().then((info) => {
        if (info.hasUpdate && !AppUpdateService.isDismissedForSession()) {
          setUpdateInfo(info);
          setIsUpdateModalOpen(true);
        }
      }).catch((err) => {
        console.warn('[App] Automatic update check error:', err);
      });
    }, 2500);

    // Event listener for manual update check requests (e.g. from Settings)
    const handleTriggerUpdateModal = (e: any) => {
      const explicitInfo = e?.detail?.updateInfo;
      if (explicitInfo) {
        setUpdateInfo(explicitInfo);
        setIsUpdateModalOpen(true);
      } else {
        AppUpdateService.checkForUpdates(true).then((info) => {
          setUpdateInfo(info);
          if (info.hasUpdate) {
            setIsUpdateModalOpen(true);
          }
        });
      }
    };
    window.addEventListener('athar_trigger_update_modal', handleTriggerUpdateModal);

    return () => {
      window.removeEventListener('athar_open_parents_duty', handleOpenParentsDuty);
      window.removeEventListener('athar_open_ayah', handleOpenAyah);
      window.removeEventListener('athar_open_surah', handleOpenAyah);
      window.removeEventListener('athar_open_wird', handleOpenWird);
      window.removeEventListener('athar_open_tasbih', handleOpenTasbih);
      window.removeEventListener('athar_open_adhkar', handleOpenAdhkar);
      window.removeEventListener('athar_open_permissions_wizard', handleOpenPermissionsWizard);
      window.removeEventListener('athar_trigger_update_modal', handleTriggerUpdateModal);
      clearTimeout(deepLinkTimer);
      clearTimeout(updateCheckTimer);
      window.removeEventListener('athar_smart_silence_triggered', onSmartSilence);
      window.removeEventListener('athar_call_state', onCallState);
      document.removeEventListener('visibilitychange', onAppVisibleOrFocused);
      window.removeEventListener('focus', onAppVisibleOrFocused);
      if (timer) clearTimeout(timer);
      if (midnightTimer) clearTimeout(midnightTimer);
      stopAutoLocation();
      unsubVoice();
    };
  }, []);

  useEffect(() => {
    ReminderEngine.start();

    NativeNotificationService.initAndScheduleAll().catch((err) => {
      console.warn('[App] Native notification scheduling error:', err);
    });

    BackgroundKeepAliveService.start().catch((err) => {
      console.warn('[App] Background keep-alive start error:', err);
    });

    // تشغيل ومزامنة بيانات الصلاة القادمة والعد التنازلي الحقيقي للخدمة الخلفية (AthanForegroundService) فور فتح التطبيق
    try {
      LiveActivityService.syncWithNativeForegroundService();
    } catch (err) {
      console.warn('[App] Native prayer countdown init error:', err);
    }

    const checkNativePendingEvents = () => {
      try {
        if (typeof window === 'undefined') return;

        const atharNative = (window as any).AtharNative;
        if (atharNative?.getPendingDeepLink) {
          const rawLink = atharNative.getPendingDeepLink();
          if (rawLink && rawLink.trim().length > 2) {
            const linkObj = JSON.parse(rawLink);
            if (linkObj.surahNumber && Number(linkObj.surahNumber) > 0) {
              const sNum = Number(linkObj.surahNumber);
              const aNum = Number(linkObj.ayahNumber || 1);
              handleSelectSurah(sNum, aNum);
              navigateToTab('quran');
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('athar_scroll_to_ayah', { detail: { surahNumber: sNum, ayahNumber: aNum } }));
              }, 350);
            } else if (linkObj.openWird) {
              setReadingSurahNumber(null);
              navigateToTab('quran');
            } else if (linkObj.openTasbih) {
              setIsTasbihOpen(true);
            } else if (linkObj.openParentsModal) {
              setSakinaInitialTab('kinship');
              setIsSakinaOpen(true);
            } else if (linkObj.adhkarCategory) {
              setAdhkarCategory(linkObj.adhkarCategory);
              navigateToTab('adhkar');
            } else if (linkObj.targetTab) {
              navigateToTab(linkObj.targetTab);
            }
          }
        }
      } catch (e) {
        console.warn('Native pending events check error:', e);
      }
    };

    checkNativePendingEvents();
    const pendingTimer1 = setTimeout(checkNativePendingEvents, 100);
    const pendingTimer2 = setTimeout(checkNativePendingEvents, 350);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkNativePendingEvents();
      }
    };
    const onWindowFocus = () => {
      checkNativePendingEvents();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onWindowFocus);

    let notifActionListener: any = null;
    try {
      LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        const extra = action?.notification?.extra;
        if (extra?.surahNumber || extra?.surah_number) {
          const sNum = Number(extra?.surahNumber || extra?.surah_number);
          const aNum = Number(extra?.ayahNumber || extra?.ayah_number || 1);
          handleSelectSurah(sNum, aNum);
          navigateToTab('quran');
        } else if (extra?.adhkarCategory) {
          setAdhkarCategory(extra.adhkarCategory);
          navigateToTab('adhkar');
        } else if (extra?.targetTab) {
          navigateToTab(extra.targetTab);
        }
      }).then((handle) => {
        notifActionListener = handle;
      }).catch(() => {});
    } catch {}

    return () => {
      ReminderEngine.stop();
      BackgroundKeepAliveService.stop();
      clearTimeout(pendingTimer1);
      clearTimeout(pendingTimer2);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onWindowFocus);
      if (notifActionListener?.remove) {
        notifActionListener.remove();
      }
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
      <DynamicArtworkBackground />

      <div 
        id="athar-a11y-live-region" 
        className="sr-only" 
        aria-live="assertive" 
        aria-atomic="true" 
        role="alert"
      />

      <div className="relative z-10 flex-1 flex flex-col w-full max-w-lg mx-auto bg-[#070707]/96 sm:border-x sm:border-[#C8A24A]/30 shadow-2xl h-full max-h-full overflow-hidden">
        {smartSilenceNotice && (
          <div className="fixed top-20 left-4 right-4 z-50 flex justify-center pointer-events-none select-none">
            <div className="bg-[#17140E]/95 border border-[#E6C66E]/70 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs font-bold text-[#F3E5AB] flex items-center gap-2 animate-slideDown pointer-events-auto">
              <span className="text-base">🔕</span>
              <span>{smartSilenceNotice}</span>
            </div>
          </div>
        )}

        {callNotice && (
          <div className="fixed top-20 left-4 right-4 z-50 flex justify-center pointer-events-none select-none">
            <div className="bg-gradient-to-r from-[#211B0F] via-[#15120B] to-[#211B0F] border border-[#E6C66E]/80 px-4 py-2.5 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.9)] backdrop-blur-md text-xs font-bold text-[#F3E5AB] flex items-center gap-2 animate-slideDown pointer-events-auto">
              <span>{callNotice}</span>
            </div>
          </div>
        )}

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

                {visitedTabs.has('gamaa') && (
                  <div className={activeTab === 'gamaa' ? 'block' : 'hidden'}>
                    <GamaaCommunityView onOpenAuth={() => setIsAuthViewOpen(true)} />
                  </div>
                )}

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

                {visitedTabs.has('settings') && (
                  <div className={activeTab === 'settings' ? 'block' : 'hidden'}>
                    <SettingsView
                      onOpenCodeInspector={() => setIsCodeInspectorOpen(true)}
                      onOpenVoiceAssistant={() => setIsVoiceAssistantOpen(true)}
                      onOpenAlarmModal={() => setIsAlarmModalOpen(true)}
                      onLocationChange={handleLocationChange}
                      onNavigateTab={(tab) => navigateToTab(tab as NavigationTab)}
                      onBackToAccount={() => navigateToTab('profile')}
                      onOpenTasbih={() => setIsTasbihOpen(true)}
                      onOpenWird={() => {
                        setReadingSurahNumber(null);
                        navigateToTab('quran');
                        window.dispatchEvent(new CustomEvent('athar_switch_quran_tab', { detail: { tab: 'khatmah' } }));
                      }}
                      onOpenParents={() => {
                        setSakinaInitialTab('kinship');
                        setIsSakinaOpen(true);
                      }}
                      onOpenAuth={() => setIsAuthViewOpen(true)}
                    />
                  </div>
                )}

                {visitedTabs.has('profile') && (
                  <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
                    <ProfileDashboardView
                      onOpenSettings={() => navigateToTab('settings')}
                      onNavigateToQuran={() => navigateToTab('quran')}
                      onNavigateToPrayers={() => navigateToTab('prayers')}
                      onNavigateToAdhkar={() => navigateToTab('adhkar')}
                      onOpenSadaqah={() => setIsZakatOpen(true)}
                      onOpenJourneyOrAchievements={() => setIsAchievementsOpen(true)}
                      onOpenAuth={() => setIsAuthViewOpen(true)}
                      onShareProfile={(stats, prof) => {
                        setGlobalShareCardPayload({
                          category: 'dhikr',
                          title: `إنجازات أثر • ${prof?.displayName || 'مستخدم أثر'}`,
                          mainText: `المستوى ${stats.currentLevel} (${stats.totalXP.toLocaleString('en-US')} XP) • استمرارية ${stats.streakDays} يوماً متتالياً في الطاعات بفضل الله`,
                          sourceLabel: 'تطبيق أثر الإسلامي الملكي',
                          subtitleOrTafsir: `صلوات هذا الشهر: ${stats.prayersCountThisMonth} • أذكار: ${stats.adhkarCountThisMonth} • تلاوة واستماع: ${stats.quranHoursThisMonth} ساعة`,
                        });
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </Suspense>
        </main>

        <GlobalMiniPlayer
          onOpenSurahReader={(surahNum, ayahNum) => handleSelectSurah(surahNum, ayahNum || 1)}
          onNavigateToTab={(tab) => {
            if (readingSurahNumber !== null) setReadingSurahNumber(null);
            navigateToTab(tab);
          }}
        />

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

      <ShareCardModal
        isOpen={Boolean(globalShareCardPayload)}
        onClose={() => setGlobalShareCardPayload(null)}
        initialPayload={globalShareCardPayload}
      />

      <LuxuryWelcomeSplashModal
        isOpen={isLuxurySplashOpen && !isOnboardingOpen}
        onEnter={handleCloseLuxurySplash}
      />

      {isVoiceSystemEnabled && readingSurahNumber === null && (
        <VoiceFloatingButton
          onClick={() => setIsVoiceAssistantOpen(true)}
        />
      )}

      {isVoiceSystemEnabled && (
        <VoiceAssistantModal
          isOpen={isVoiceAssistantOpen}
          onClose={() => setIsVoiceAssistantOpen(false)}
          coordinates={coordinates}
          onNavigate={(tab) => {
            if (readingSurahNumber !== null) setReadingSurahNumber(null);
            navigateToTab(tab);
          }}
          onOpenSurah={(surahNum) => {
            handleSelectSurah(surahNum, 1);
          }}
          onPlaySurah={handlePlaySurahAudio}
          onPlayAdhkar={handlePlayAdhkarAudio}
          onOpenTasbih={() => setIsTasbihOpen(true)}
        />
      )}

      <DigitalTasbihModal
        isOpen={isTasbihOpen}
        onClose={() => setIsTasbihOpen(false)}
        onNavigateToAdhkar={() => {
          setIsTasbihOpen(false);
          navigateToTab('adhkar');
        }}
      />

      <ZakatAndCharityModal
        isOpen={isZakatOpen}
        onClose={() => setIsZakatOpen(false)}
      />

      <SakinaAndRightsModal
        isOpen={isSakinaOpen}
        onClose={() => setIsSakinaOpen(false)}
        initialTab={sakinaInitialTab}
      />

      <AchievementsOverviewModal
        isOpen={isAchievementsOpen}
        onClose={() => setIsAchievementsOpen(false)}
        onNavigateToQuran={() => {
          setIsAchievementsOpen(false);
          navigateToTab('quran');
        }}
        onNavigateToAdhkar={() => {
          setIsAchievementsOpen(false);
          navigateToTab('adhkar');
        }}
        onNavigateToPrayers={() => {
          setIsAchievementsOpen(false);
          navigateToTab('prayers');
        }}
      />

      <LockScreenOverlay
        isOpen={isLockScreenOpen}
        onUnlock={() => setIsLockScreenOpen(false)}
        hijriDate="٢٧ ربيع الأول ١٤٤٨ هـ"
      />

      <PermissionsSetupWizard
        isOpen={isOnboardingOpen}
        onFinish={(coords) => {
          setIsOnboardingOpen(false);
          setIsLuxurySplashOpen(false);
          localStorage.setItem('athar_luxury_splash_seen', '1');
          const s = StorageService.getSettings();
          s.hasCompletedOnboarding = true;
          if (coords) s.location = coords;
          StorageService.saveSettings(s);

          if (coords) handleLocationChange(coords);
          navigateToTab('home');
        }}
        onSkip={() => {
          setIsOnboardingOpen(false);
          setIsLuxurySplashOpen(false);
          localStorage.setItem('athar_luxury_splash_seen', '1');
          const s = StorageService.getSettings();
          s.hasCompletedOnboarding = true;
          StorageService.saveSettings(s);
          navigateToTab('home');
        }}
      />

      <CodeInspectorModal
        isOpen={isCodeInspectorOpen}
        onClose={() => setIsCodeInspectorOpen(false)}
      />

      {updateInfo && (
        <AppUpdateModal
          isOpen={isUpdateModalOpen}
          updateInfo={updateInfo}
          onClose={() => setIsUpdateModalOpen(false)}
          onPostpone={() => {
            AppUpdateService.dismissForSession();
            setIsUpdateModalOpen(false);
          }}
        />
      )}

      {/* Authentication Verification Splash */}
      {isAuthChecking && (
        <div className="fixed inset-0 z-[100] bg-[#060503] flex flex-col items-center justify-center p-6 text-center select-none">
          <AtharBrandLogo size="lg" centered />
          <div className="mt-6 w-8 h-8 rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37] animate-spin" />
          <p className="mt-4 text-xs font-semibold text-[#D4AF37]/80 tracking-wide font-arabic">
            جاري استحضار رحلتك الإيمانية...
          </p>
        </div>
      )}

      {/* Cloud Authentication Screen (Login / Register / Guest Mode) */}
      {!isAuthChecking && ((!currentUser && !isGuestMode) || isAuthViewOpen) && (
        <div className="fixed inset-0 z-[90] bg-[#060503] overflow-y-auto overscroll-contain scroll-smooth [-webkit-overflow-scrolling:touch]">
          <AuthView
            onSuccess={() => {
              setIsAuthViewOpen(false);
              setIsGuestMode(false);
            }}
            onContinueAsGuest={() => {
              setIsGuestMode(true);
              setIsAuthViewOpen(false);
              try {
                localStorage.setItem('athar_guest_mode', 'true');
              } catch {}
            }}
            onClose={isGuestMode || currentUser ? () => setIsAuthViewOpen(false) : undefined}
          />
        </div>
      )}

      <FullScreenAzanOverlayModal />
      <AndroidExitToast />
    </div>
  );
};

export default App;
