import React, { useState, useEffect, useMemo } from 'react';
import {
  NavigationTab,
  JourneyPathType,
  JourneyTopicCategory,
  JourneyDepthLevel,
  JourneySessionDuration,
  JourneyActivityNode,
  JourneyPreferences,
  UserActivityProgress,
  PrivateReflectionEntry,
  JourneyRecommendationResult,
  ConsentSuccessMetrics,
} from '../types';
import {
  ADAPTIVE_JOURNEY_NODES,
  JOURNEY_PATHS_META,
  JOURNEY_GOALS_META,
  JOURNEY_DURATIONS_META,
  JOURNEY_DEPTH_META,
} from '../data/adaptiveJourneyData';
import {
  AdaptiveJourneyService,
  WeeklyJourneyRecap,
  JourneyIntegrityTestReport,
} from '../services/adaptiveJourneyService';
import { AudioService } from '../services/audioService';
import { StorageService } from '../services/storageService';
import { getAyahAudioUrl, VERIFIED_RECITERS } from '../data/surahsData';
import {
  ChevronRight,
  ChevronLeft,
  Compass,
  BookOpen,
  Heart,
  Clock,
  Bookmark,
  Check,
  CheckCircle2,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  ShieldCheck,
  Lock,
  Download,
  Upload,
  Trash2,
  WifiOff,
  AlertCircle,
  Volume2,
  Eye,
  X,
  ArrowUpRight,
  FileCheck2,
  Calendar,
} from 'lucide-react';

interface AdaptiveJourneyViewProps {
  initialNodeId?: string;
  initialOpenOnboarding?: boolean;
  onNavigate: (tab: NavigationTab) => void;
  onSelectSurah: (surahNumber: number, ayahNumber?: number) => void;
  onBack: () => void;
}

type JourneyHubTab =
  | 'dashboard_map'
  | 'activity_detail'
  | 'activity_completion'
  | 'weekly_recap'
  | 'history_saved'
  | 'privacy_settings';

export const AdaptiveJourneyView: React.FC<AdaptiveJourneyViewProps> = ({
  initialNodeId,
  initialOpenOnboarding = false,
  onNavigate,
  onSelectSurah,
  onBack,
}) => {
  // Core state
  const [prefs, setPrefs] = useState<JourneyPreferences>(() =>
    AdaptiveJourneyService.getPreferences()
  );
  const [progressMap, setProgressMap] = useState<
    Record<string, UserActivityProgress>
  >(() => AdaptiveJourneyService.getProgressMap());
  const [recommendation, setRecommendation] =
    useState<JourneyRecommendationResult | null>(() =>
      AdaptiveJourneyService.getAdaptiveRecommendation()
    );
  const [recap, setRecap] = useState<WeeklyJourneyRecap>(() =>
    AdaptiveJourneyService.getWeeklyPersonalRecap()
  );
  const [reflections, setReflections] = useState<PrivateReflectionEntry[]>(() =>
    AdaptiveJourneyService.getPrivateReflections()
  );
  const [consentMetrics, setConsentMetrics] = useState<ConsentSuccessMetrics>(
    () => AdaptiveJourneyService.getConsentMetrics()
  );
  const [integrityReport, setIntegrityReport] =
    useState<JourneyIntegrityTestReport>(() =>
      AdaptiveJourneyService.verifyAdaptiveJourneyIntegrity()
    );

  // Sub-navigation & Modals
  const [activeSubTab, setActiveSubTab] = useState<JourneyHubTab>(() =>
    initialNodeId ? 'activity_detail' : 'dashboard_map'
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string>(() =>
    initialNodeId || ADAPTIVE_JOURNEY_NODES[0].id
  );
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    if (initialOpenOnboarding) return true;
    const p = AdaptiveJourneyService.getPreferences();
    return !p.hasCompletedJourneyOnboarding && !p.hasSkippedJourneyOnboarding;
  });
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3>(1);

  // Filters on 3-Path Map
  const [selectedPathFilter, setSelectedPathFilter] = useState<
    'all' | JourneyPathType
  >('all');
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<
    'all' | JourneyTopicCategory
  >('all');

  // Distraction-Free Serenity Reader Overlay
  const [isDistractionFreeOpen, setIsDistractionFreeOpen] =
    useState<boolean>(false);
  const [serenityRepCount, setSerenityRepCount] = useState<number>(0);
  const [isPlayingNodeAudio, setIsPlayingNodeAudio] = useState<boolean>(false);

  // Content Review & Scholarly Attribution Sheet
  const [isAttributionModalOpen, setIsAttributionModalOpen] =
    useState<boolean>(false);

  // Reflection input on completion screen
  const [reflectionDraft, setReflectionDraft] = useState<string>('');
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Backup Import/Export state
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [showImportBox, setShowImportBox] = useState<boolean>(false);
  const [confirmDeleteMode, setConfirmDeleteMode] = useState<
    null | 'reflections' | 'all'
  >(null);

  // Network / Loading / Error simulation states for edge-case verification
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [simulatedViewState, setSimulatedViewState] = useState<
    'normal' | 'loading' | 'offline' | 'error' | 'returning'
  >('normal');

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const syncAll = () => {
    setPrefs(AdaptiveJourneyService.getPreferences());
    setProgressMap(AdaptiveJourneyService.getProgressMap());
    setRecommendation(AdaptiveJourneyService.getAdaptiveRecommendation());
    setRecap(AdaptiveJourneyService.getWeeklyPersonalRecap());
    setReflections(AdaptiveJourneyService.getPrivateReflections());
    setConsentMetrics(AdaptiveJourneyService.getConsentMetrics());
    setIntegrityReport(AdaptiveJourneyService.verifyAdaptiveJourneyIntegrity());
  };

  useEffect(() => {
    AdaptiveJourneyService.recordVisitHeartbeat();
    syncAll();

    const onUpdate = () => syncAll();
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener('athar_journey_updated', onUpdate);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('athar_journey_updated', onUpdate);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (initialNodeId) {
      setSelectedNodeId(initialNodeId);
      AdaptiveJourneyService.startOrResumeActivity(initialNodeId);
      setActiveSubTab('activity_detail');
      syncAll();
    }
  }, [initialNodeId]);

  const activeNode: JourneyActivityNode = useMemo(
    () =>
      ADAPTIVE_JOURNEY_NODES.find((n) => n.id === selectedNodeId) ||
      ADAPTIVE_JOURNEY_NODES[0],
    [selectedNodeId]
  );

  const activeProgress: UserActivityProgress = useMemo(
    () =>
      progressMap[activeNode.id] || {
        nodeId: activeNode.id,
        status: 'not_started',
        completedStepIds: [],
        isBookmarked: false,
        completionCount: 0,
      },
    [progressMap, activeNode.id]
  );

  // Pre-fill reflection draft if user previously wrote one for this node
  useEffect(() => {
    const existingRefl = reflections.find((r) => r.nodeId === activeNode.id);
    setReflectionDraft(existingRefl ? existingRefl.content : '');
    setSerenityRepCount(0);
  }, [activeNode.id, reflections]);

  // Open an activity station
  const handleOpenActivity = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    AdaptiveJourneyService.startOrResumeActivity(nodeId);
    setActiveSubTab('activity_detail');
    syncAll();
  };

  // Pause & Save progress to resume later
  const handlePauseForLater = () => {
    AdaptiveJourneyService.pauseActivityForLater(activeNode.id);
    syncAll();
    showToast('تم حفظ تقدمك في المحطة — يمكنك استئنافها في أي وقت بهدوء');
    setActiveSubTab('dashboard_map');
  };

  // Complete activity & go to Optional Reflection screen
  const handleCompleteActivity = () => {
    AdaptiveJourneyService.completeActivity(activeNode.id);
    syncAll();
    setActiveSubTab('activity_completion');
  };

  // Save optional private reflection
  const handleSavePrivateReflection = () => {
    if (reflectionDraft.trim()) {
      AdaptiveJourneyService.savePrivateReflection(activeNode, reflectionDraft);
      syncAll();
      showToast('تم حفظ تأملك الشخصي محلياً في جهازك بخصوصية تامة');
    } else {
      showToast('تم حفظ إتمام المحطة بنجاح');
    }
  };

  // Play Quran verse audio for the active station
  const handleToggleNodeAudio = () => {
    if (isPlayingNodeAudio) {
      AudioService.stopTemporaryAndResume();
      setIsPlayingNodeAudio(false);
      return;
    }

    const surahNum =
      activeNode.serenityConfig?.audioSurahNumber ||
      activeNode.sacredContent.surahNumber ||
      94;
    const ayahNum =
      activeNode.serenityConfig?.audioAyahNumber ||
      activeNode.sacredContent.ayahNumber ||
      1;

    const settings = StorageService.getSettings();
    const reciterId = settings.selectedReciterId || 'alafasy';
    const reciter =
      VERIFIED_RECITERS.find((r) => r.id === reciterId) || VERIFIED_RECITERS[0];
    const url = getAyahAudioUrl(reciter.audioServer, surahNum, ayahNum);

    setIsPlayingNodeAudio(true);
    AudioService.playUrl(
      url,
      'reminder_verse',
      {
        title: activeNode.title,
        subtitle: `تلاوة ${reciter.nameArabic}`,
        surahNumber: surahNum,
        ayahNumber: ayahNum,
        reciterName: reciter.nameArabic,
      },
      {
        onEnded: () => setIsPlayingNodeAudio(false),
        onError: () => setIsPlayingNodeAudio(false),
      }
    );
  };

  // Toggle Goal in Preferences
  const handleToggleGoal = (goalId: JourneyTopicCategory) => {
    const exists = prefs.selectedGoals.includes(goalId);
    if (exists && prefs.selectedGoals.length === 1) {
      showToast('يرجى الإبقاء على هدف واحد على الأقل لتخصيص رحلتك');
      return;
    }
    const nextGoals = exists
      ? prefs.selectedGoals.filter((g) => g !== goalId)
      : [...prefs.selectedGoals, goalId];

    const updated: JourneyPreferences = {
      ...prefs,
      selectedGoals: nextGoals,
    };
    AdaptiveJourneyService.savePreferences(updated);
    syncAll();
  };

  // Export JSON backup
  const handleExportBackup = () => {
    const json = AdaptiveJourneyService.exportJourneyBackupJson(true);
    try {
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `athar-spiritual-journey-backup-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('تم تصدير النسخة الاحتياطية لرحلتك بنجاح');
    } catch {
      navigator.clipboard?.writeText(json);
      showToast('تم نسخ بيانات النسخة الاحتياطية إلى الحافظة');
    }
  };

  // Import JSON backup
  const handleImportBackup = () => {
    const res = AdaptiveJourneyService.importJourneyBackupJson(importJsonText);
    showToast(res.message);
    if (res.success) {
      setImportJsonText('');
      setShowImportBox(false);
      syncAll();
    }
  };

  // Filtered nodes for the 3-Path Map
  const filteredNodes = useMemo(() => {
    return ADAPTIVE_JOURNEY_NODES.filter((node) => {
      if (selectedPathFilter !== 'all' && node.path !== selectedPathFilter) {
        return false;
      }
      if (
        selectedTopicFilter !== 'all' &&
        node.topicCategory !== selectedTopicFilter
      ) {
        return false;
      }
      return true;
    });
  }, [selectedPathFilter, selectedTopicFilter]);

  // Connected nodes for active station
  const connectedNodesList = useMemo(() => {
    const ids = Object.values(activeNode.connectedNodeIds).filter(
      Boolean
    ) as string[];
    return ids
      .map((id) => ADAPTIVE_JOURNEY_NODES.find((n) => n.id === id))
      .filter(Boolean) as JourneyActivityNode[];
  }, [activeNode]);

  return (
    <div
      dir="rtl"
      className="min-h-full bg-[#0A0A0A] text-[#F2EBDD] px-4 pt-3 pb-28 space-y-4 select-none"
    >
      {/* Top Navigation & Context Bar */}
      <header className="flex items-center justify-between gap-2 pb-3 border-b border-[#D6B36A]/25">
        <button
          type="button"
          onClick={() => {
            if (
              activeSubTab === 'activity_detail' ||
              activeSubTab === 'activity_completion'
            ) {
              setActiveSubTab('dashboard_map');
            } else {
              onBack();
            }
          }}
          className="w-11 h-11 rounded-2xl bg-[#151515] border border-[#D6B36A]/35 flex items-center justify-center text-[#D6B36A] hover:bg-[#1C1A16] transition-colors"
          aria-label="رجوع"
        >
          <ChevronRight size={20} />
        </button>

        <div className="text-center">
          <h1 className="text-base font-extrabold text-[#F2EBDD] tracking-wide">
            أثر | الرحلة الإيمانية التكيفية
          </h1>
          <p className="text-[11px] text-[#B6B0A3]">
            المعرفة · العمل · السكينة — استمرارية هادئة بلا تقييم رقمي
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setOnboardingStep(1);
            setIsOnboardingOpen(true);
          }}
          className="min-h-[44px] px-3 rounded-2xl bg-[#151515] border border-[#D6B36A]/35 text-[#D6B36A] text-xs font-bold flex items-center gap-1.5 hover:bg-[#1C1A16] transition-colors"
          title="تعديل الأهداف والوقت المتاح"
        >
          <SlidersHorizontal size={15} />
          <span className="hidden sm:inline">التفضيلات</span>
        </button>
      </header>

      {/* Toast Feedback Banner */}
      {statusToast && (
        <div
          role="status"
          className="rounded-2xl bg-[#1C1A16] border border-[#D6B36A]/60 p-3 flex items-center justify-between gap-2 text-xs text-[#F2EBDD] shadow-lg animate-fadeIn"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#D6B36A] shrink-0" />
            <span>{statusToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusToast(null)}
            className="text-[#B6B0A3] hover:text-[#F2EBDD]"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Offline Banner (Real or Simulated) */}
      {(!isOnline || simulatedViewState === 'offline') && (
        <div className="rounded-2xl bg-[#1C1A16] border border-[#D6B36A]/45 p-3.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <WifiOff size={18} className="text-[#D6B36A] shrink-0" />
            <div>
              <h3 className="font-extrabold text-[#F2EBDD]">
                وضع العمل دون اتصال بالإنترنت (Offline Mode)
              </h3>
              <p className="text-[11px] text-[#B6B0A3] mt-0.5">
                جميع النصوص الشرعية، التفسير الميسر، خريطة المسارات، وتأملاتك الخاصة محفوظة محلياً وتعمل بكفاءة.
              </p>
            </div>
          </div>
          {simulatedViewState === 'offline' && (
            <button
              type="button"
              onClick={() => setSimulatedViewState('normal')}
              className="px-2.5 py-1.5 rounded-xl bg-[#151515] border border-[#D6B36A]/35 text-[#D6B36A] text-[11px] font-bold shrink-0"
            >
              إنهاء المعاينة
            </button>
          )}
        </div>
      )}

      {/* Gentle Returning-User State Banner (No Streak Penalty, Zero Guilt) */}
      {(recap.isReturningAfterBreak || simulatedViewState === 'returning') && (
        <div className="rounded-2xl bg-[#1C1A16] border border-[#D6B36A]/50 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#D6B36A]">
              عودة مباركة وهادئة إلى رحلتك
            </span>
            {simulatedViewState === 'returning' && (
              <button
                type="button"
                onClick={() => setSimulatedViewState('normal')}
                className="text-[11px] text-[#B6B0A3] hover:text-[#F2EBDD]"
              >
                إغلاق المعاينة ✕
              </button>
            )}
          </div>
          <p className="text-xs text-[#F2EBDD] leading-relaxed">
            أهلاً بعودتك في أي وقت. في «أثر» لا يُصفّر تقدمك أبداً بسبب الانشغال؛ محطاتك المحفوظة وتأملاتك تنتظرك من حيث توقفت تماماً.
          </p>
        </div>
      )}

      {/* Primary Section Tabs (Dashboard & Map | Activity | Weekly Recap | History & Saved | Privacy) */}
      <nav
        aria-label="أقسام الرحلة التكيفية"
        className="grid grid-cols-4 gap-1.5 p-1.5 rounded-2xl bg-[#151515] border border-[#D6B36A]/25"
      >
        {[
          { id: 'dashboard_map', label: 'خريطة المسارات' },
          { id: 'weekly_recap', label: 'الملخص الأسبوعي' },
          { id: 'history_saved', label: 'السجل والمحفوظات' },
          { id: 'privacy_settings', label: 'الخصوصية والبيانات' },
        ].map((tab) => {
          const isCurrent =
            activeSubTab === tab.id ||
            (tab.id === 'dashboard_map' &&
              (activeSubTab === 'activity_detail' ||
                activeSubTab === 'activity_completion'));
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as JourneyHubTab)}
              className={`min-h-[42px] px-2 py-1.5 rounded-xl text-[11px] font-extrabold transition-all ${
                isCurrent
                  ? 'bg-[#D6B36A] text-[#0A0A0A] shadow-sm'
                  : 'text-[#B6B0A3] hover:text-[#F2EBDD] hover:bg-[#1C1A16]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Simulated Loading or Error Recovery States (For Verification & Resilience) */}
      {simulatedViewState === 'loading' ? (
        <div className="rounded-3xl bg-[#151515] border border-[#D6B36A]/30 p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#1C1A16] border border-[#D6B36A]/50 mx-auto flex items-center justify-center text-[#D6B36A] animate-pulse">
            <Compass size={24} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-extrabold text-[#F2EBDD]">
              جارٍ تهيئة محطات رحلتك وفق وقتك المتاح...
            </h3>
            <p className="text-xs text-[#B6B0A3]">
              يتم تحميل النصوص الشرعية الموثقة وربط مسارات المعرفة والعمل والسكينة
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSimulatedViewState('normal')}
            className="px-4 py-2 rounded-xl bg-[#1C1A16] border border-[#D6B36A]/40 text-xs font-bold text-[#D6B36A]"
          >
            إظهار المحتوى فوراً
          </button>
        </div>
      ) : simulatedViewState === 'error' ? (
        <div className="rounded-3xl bg-[#151515] border border-[#D6B36A]/45 p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#1C1A16] border border-[#D6B36A]/50 mx-auto flex items-center justify-center text-[#D6B36A]">
            <AlertCircle size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-[#F2EBDD]">
              تعذر تحميل إحدى المحطات مؤقتاً
            </h3>
            <p className="text-xs text-[#B6B0A3] leading-relaxed">
              لا تقلق، جميع تفضيلاتك ومحطاتك المحفوظة آمنة تماماً في الذاكرة المحلية. يمكنك استعادة الجلسة بضغطة واحدة.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                syncAll();
                setSimulatedViewState('normal');
                showToast('تمت استعادة الجلسة والتحقق من سلامة البيانات بنجاح');
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#D6B36A] text-[#0A0A0A] text-xs font-extrabold"
            >
              إعادة المحاولة واسترجاع الجلسة
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* =====================================================================
              SCREEN 1: ADAPTIVE DASHBOARD & INTERACTIVE 3-PATH MAP
             ===================================================================== */}
          {activeSubTab === 'dashboard_map' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Explicit User Preferences Summary Bar */}
              <div className="rounded-2xl bg-[#151515] border border-[#D6B36A]/30 p-3.5 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-[#B6B0A3]">تفضيلاتك الحالية:</span>
                  <span className="px-2.5 py-1 rounded-xl bg-[#1C1A16] border border-[#D6B36A]/35 text-[#D6B36A] font-bold">
                    الوقت المتاح: {prefs.preferredDurationMinutes} دقائق
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-[#1C1A16] border border-[#D6B36A]/35 text-[#F2EBDD] font-bold">
                    العمق:{' '}
                    {
                      JOURNEY_DEPTH_META.find(
                        (d) => d.id === prefs.preferredDepth
                      )?.labelArabic
                    }
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-[#1C1A16] border border-[#D6B36A]/35 text-[#B6B0A3] font-semibold">
                    {prefs.selectedGoals.length} مجالات مختارة
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setOnboardingStep(1);
                    setIsOnboardingOpen(true);
                  }}
                  className="text-xs font-extrabold text-[#D6B36A] hover:underline"
                >
                  تعديل التفضيلات
                </button>
              </div>

              {/* Transparent Adaptive Recommendation Card */}
              <div className="rounded-3xl bg-[#151515] border border-[#D6B36A]/45 p-4 sm:p-5 space-y-3.5 shadow-xl">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-[#D6B36A]" />
                    <h2 className="text-sm font-extrabold text-[#F2EBDD]">
                      المحطة المقترحة لك الآن بشفافية
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    {prefs.recommendationsEnabled && recommendation && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            AdaptiveJourneyService.dismissRecommendation(
                              recommendation.node.id,
                              true
                            );
                            syncAll();
                            showToast('تم استبدال المحطة المقترحة بمحطة أخرى تناسب تفضيلاتك');
                          }}
                          className="min-h-[36px] px-2.5 py-1 rounded-xl bg-[#1C1A16] hover:bg-[#25221B] border border-[#D6B36A]/30 text-[11px] font-bold text-[#D6B36A] flex items-center gap-1"
                        >
                          <RotateCcw size={12} />
                          <span>استبدال</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            AdaptiveJourneyService.dismissRecommendation(
                              recommendation.node.id,
                              false
                            );
                            syncAll();
                            showToast('تم تجاهل هذا الاقتراح');
                          }}
                          className="min-h-[36px] px-2.5 py-1 rounded-xl bg-[#0A0A0A] hover:bg-[#1C1A16] border border-[#D6B36A]/20 text-[11px] font-semibold text-[#B6B0A3]"
                        >
                          تجاهل
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const next = {
                          ...prefs,
                          recommendationsEnabled: !prefs.recommendationsEnabled,
                        };
                        AdaptiveJourneyService.savePreferences(next);
                        syncAll();
                      }}
                      className="min-h-[36px] px-2.5 py-1 rounded-xl bg-[#0A0A0A] border border-[#D6B36A]/25 text-[11px] text-[#B6B0A3] hover:text-[#F2EBDD]"
                    >
                      {prefs.recommendationsEnabled
                        ? 'إيقاف التوصيات'
                        : 'تفعيل التوصيات'}
                    </button>
                  </div>
                </div>

                {prefs.recommendationsEnabled && recommendation ? (
                  <div className="rounded-2xl bg-[#1C1A16] border border-[#D6B36A]/40 p-4 space-y-3">
                    {/* Explicit Why Recommended Box */}
                    <div className="p-2.5 rounded-xl bg-[#0A0A0A] border border-[#D6B36A]/25 space-y-1">
                      <span className="text-[10px] font-extrabold text-[#D6B36A] block">
                        لماذا اقترحنا هذه المحطة؟ (بدون أي تقييم للإيمان أو الالتزام):
                      </span>
                      <ul className="text-[11px] text-[#B6B0A3] space-y-0.5 list-disc list-inside">
                        {recommendation.reasonsArabic.map((reason, idx) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-lg bg-[#0A0A0A] border border-[#D6B36A]/40 text-[11px] font-extrabold text-[#D6B36A]">
                            مسار{' '}
                            {
                              JOURNEY_PATHS_META[recommendation.node.path]
                                .titleArabic
                            }
                          </span>
                          <span className="text-xs text-[#B6B0A3] flex items-center gap-1">
                            <Clock size={12} className="text-[#D6B36A]" />
                            {recommendation.node.durationMinutes} دقائق
                          </span>
                          <span className="text-[11px] text-[#B6B0A3]">
                            • المصدر: {recommendation.node.sacredContent.reference}
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold text-[#F2EBDD] pt-1">
                          {recommendation.node.title}
                        </h3>
                        <p className="text-xs text-[#B6B0A3] leading-relaxed">
                          {recommendation.node.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenActivity(recommendation.node.id)
                        }
                        className="flex-1 min-h-[46px] rounded-xl bg-[#D6B36A] hover:bg-[#e2c27e] text-[#0A0A0A] font-extrabold text-xs px-4 py-2.5 flex items-center justify-center gap-2 transition-all"
                      >
                        <BookOpen size={16} />
                        <span>
                          {recommendation.matchType === 'resume_paused'
                            ? 'استئناف المحطة من حيث توقفت'
                            : 'بدء هذه المحطة'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          AdaptiveJourneyService.toggleBookmark(
                            recommendation.node.id
                          );
                          syncAll();
                        }}
                        className={`min-h-[46px] px-3.5 rounded-xl border flex items-center justify-center transition-colors ${
                          progressMap[recommendation.node.id]?.isBookmarked
                            ? 'bg-[#D6B36A]/20 border-[#D6B36A] text-[#D6B36A]'
                            : 'bg-[#0A0A0A] border-[#D6B36A]/30 text-[#B6B0A3] hover:text-[#F2EBDD]'
                        }`}
                        title="حفظ المحطة لوقت لاحق"
                      >
                        <Bookmark size={17} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-[#1C1A16] border border-[#D6B36A]/25 p-4 text-xs text-[#B6B0A3] flex items-center justify-between">
                    <span>
                      التوصيات الذكية متوقفة حالياً. يمكنك اختيار أي محطة مباشرة من خريطة المسارات الثلاثة أدناه.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        AdaptiveJourneyService.resetDismissedRecommendations();
                        AdaptiveJourneyService.savePreferences({
                          ...prefs,
                          recommendationsEnabled: true,
                        });
                        syncAll();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#D6B36A] text-[#0A0A0A] font-extrabold shrink-0"
                    >
                      تفعيل
                    </button>
                  </div>
                )}
              </div>

              {/* Interactive Three-Path Map Header & Filters */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-base font-extrabold text-[#F2EBDD]">
                      خريطة المسارات الثلاثة المترابطة
                    </h2>
                    <p className="text-xs text-[#B6B0A3]">
                      اختر أي مسار أو تنقل بحرية بين المعرفة والعمل والسكينة دون ترتيب إجباري
                    </p>
                  </div>
                </div>

                {/* Path Selector Cards (المعرفة | العمل | السكينة) */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPathFilter('all')}
                    className={`min-h-[54px] p-2.5 rounded-2xl border text-right transition-all ${
                      selectedPathFilter === 'all'
                        ? 'bg-[#1C1A16] border-[#D6B36A] text-[#F2EBDD]'
                        : 'bg-[#151515] border-[#D6B36A]/20 text-[#B6B0A3]'
                    }`}
                  >
                    <span className="text-xs font-extrabold block text-[#D6B36A]">
                      كل المسارات
                    </span>
                    <span className="text-[10px] text-[#B6B0A3]">
                      {ADAPTIVE_JOURNEY_NODES.length} محطة مترابطة
                    </span>
                  </button>

                  {(['knowledge', 'practice', 'serenity'] as const).map(
                    (pathId) => {
                      const meta = JOURNEY_PATHS_META[pathId];
                      const isSelected = selectedPathFilter === pathId;
                      return (
                        <button
                          key={pathId}
                          type="button"
                          onClick={() => setSelectedPathFilter(pathId)}
                          className={`min-h-[54px] p-2.5 rounded-2xl border text-right transition-all ${
                            isSelected
                              ? 'bg-[#1C1A16] border-[#D6B36A] text-[#F2EBDD]'
                              : 'bg-[#151515] border-[#D6B36A]/20 text-[#B6B0A3]'
                          }`}
                        >
                          <span className="text-xs font-extrabold block text-[#D6B36A]">
                            {meta.titleArabic}
                          </span>
                          <span className="text-[10px] text-[#B6B0A3] leading-normal">
                            {meta.englishLabel}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>

                {/* Topic Filter Row */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setSelectedTopicFilter('all')}
                    className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                      selectedTopicFilter === 'all'
                        ? 'bg-[#D6B36A] text-[#0A0A0A] border-[#D6B36A]'
                        : 'bg-[#151515] text-[#B6B0A3] border-[#D6B36A]/25'
                    }`}
                  >
                    جميع الموضوعات
                  </button>
                  {JOURNEY_GOALS_META.map((goal) => (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => setSelectedTopicFilter(goal.id)}
                      className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                        selectedTopicFilter === goal.id
                          ? 'bg-[#D6B36A] text-[#0A0A0A] border-[#D6B36A]'
                          : 'bg-[#151515] text-[#B6B0A3] border-[#D6B36A]/25'
                      }`}
                    >
                      {goal.titleArabic}
                    </button>
                  ))}
                </div>

                {/* Visual Non-Linear Connected Path Stations List */}
                <div className="space-y-3">
                  {filteredNodes.map((node) => {
                    const nodeProg = progressMap[node.id];
                    const status = nodeProg?.status || 'not_started';
                    const pathMeta = JOURNEY_PATHS_META[node.path];
                    const linkedIds = Object.entries(
                      node.connectedNodeIds
                    ).filter(([, id]) => Boolean(id));

                    return (
                      <div
                        key={node.id}
                        className={`rounded-2xl p-4 border transition-all space-y-3 ${
                          status === 'in_progress'
                            ? 'bg-[#1C1A16] border-[#D6B36A]/70'
                            : status === 'completed'
                            ? 'bg-[#151515] border-[#D6B36A]/45'
                            : 'bg-[#151515] border-[#D6B36A]/25 hover:border-[#D6B36A]/55'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2.5 py-0.5 rounded-lg bg-[#0A0A0A] border border-[#D6B36A]/35 text-[11px] font-extrabold text-[#D6B36A]">
                                مسار {pathMeta.titleArabic}
                              </span>
                              <span className="text-[11px] text-[#B6B0A3] flex items-center gap-1">
                                <Clock size={11} className="text-[#D6B36A]" />
                                {node.durationMinutes} دقائق
                              </span>
                              {status === 'in_progress' && (
                                <span className="px-2 py-0.5 rounded-lg bg-[#D6B36A]/20 border border-[#D6B36A] text-[10px] font-extrabold text-[#F2EBDD]">
                                  قيد الاستئناف
                                </span>
                              )}
                              {status === 'completed' && (
                                <span className="px-2 py-0.5 rounded-lg bg-[#0A0A0A] border border-[#D6B36A]/50 text-[10px] font-extrabold text-[#D6B36A] flex items-center gap-1">
                                  <Check size={11} />
                                  مكتملة
                                </span>
                              )}
                            </div>

                            <h3 className="text-sm font-extrabold text-[#F2EBDD] pt-0.5">
                              {node.title}
                            </h3>
                            <p className="text-xs text-[#B6B0A3] leading-relaxed">
                              {node.subtitle}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              AdaptiveJourneyService.toggleBookmark(node.id);
                              syncAll();
                            }}
                            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                              nodeProg?.isBookmarked
                                ? 'bg-[#D6B36A]/20 border-[#D6B36A] text-[#D6B36A]'
                                : 'bg-[#0A0A0A] border-[#D6B36A]/25 text-[#B6B0A3]'
                            }`}
                            aria-label="حفظ في المفضلة"
                          >
                            <Bookmark size={16} />
                          </button>
                        </div>

                        {/* Cross-Path Non-Linear Connection Pills */}
                        <div className="pt-2 border-t border-[#D6B36A]/15 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-[#B6B0A3]">
                              متصلة بـ:
                            </span>
                            {linkedIds.map(([targetPath, targetId]) => {
                              const targetNode = ADAPTIVE_JOURNEY_NODES.find(
                                (n) => n.id === targetId
                              );
                              if (!targetNode) return null;
                              return (
                                <button
                                  key={targetId}
                                  type="button"
                                  onClick={() => handleOpenActivity(targetId!)}
                                  className="px-2.5 py-1 rounded-lg bg-[#0A0A0A] hover:bg-[#1C1A16] border border-[#D6B36A]/25 text-[10px] text-[#D6B36A] font-bold flex items-center gap-1 transition-colors"
                                >
                                  <span>
                                    {
                                      JOURNEY_PATHS_META[
                                        targetPath as JourneyPathType
                                      ].titleArabic
                                    }
                                    : {targetNode.title.slice(0, 22)}...
                                  </span>
                                  <ArrowUpRight size={10} />
                                </button>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenActivity(node.id)}
                            className="min-h-[40px] px-4 py-1.5 rounded-xl bg-[#D6B36A] hover:bg-[#e2c27e] text-[#0A0A0A] text-xs font-extrabold flex items-center gap-1.5 shrink-0"
                          >
                            <span>
                              {status === 'in_progress'
                                ? 'استئناف المحطة'
                                : status === 'completed'
                                ? 'مراجعة المحطة'
                                : 'فتح المحطة'}
                            </span>
                            <ChevronLeft size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              SCREEN 2: ACTIVITY DETAIL & TRUSTED-SOURCE LEARNING / SERENITY
             ===================================================================== */}
          {activeSubTab === 'activity_detail' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Top Station Meta Header */}
              <div className="rounded-3xl bg-[#151515] border border-[#D6B36A]/45 p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-xl bg-[#1C1A16] border border-[#D6B36A]/50 text-xs font-extrabold text-[#D6B36A]">
                      مسار {JOURNEY_PATHS_META[activeNode.path].titleArabic}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-[#0A0A0A] border border-[#D6B36A]/25 text-xs text-[#B6B0A3] flex items-center gap-1">
                      <Clock size={12} className="text-[#D6B36A]" />
                      {activeNode.durationMinutes} دقائق
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAttributionModalOpen(true)}
                      className="min-h-[38px] px-3 py-1 rounded-xl bg-[#1C1A16] border border-[#D6B36A]/40 text-[11px] font-bold text-[#D6B36A] flex items-center gap-1.5"
                    >
                      <FileCheck2 size={13} />
                      <span>توثيق المصدر ومراجعة المحتوى</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        AdaptiveJourneyService.toggleBookmark(activeNode.id);
                        syncAll();
                      }}
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                        activeProgress.isBookmarked
                          ? 'bg-[#D6B36A]/20 border-[#D6B36A] text-[#D6B36A]'
                          : 'bg-[#0A0A0A] border-[#D6B36A]/25 text-[#B6B0A3]'
                      }`}
                      title="حفظ المحطة"
                    >
                      <Bookmark size={16} />
                    </button>
                  </div>
                </div>

                <h2 className="text-lg font-extrabold text-[#F2EBDD] leading-snug">
                  {activeNode.title}
                </h2>
                <p className="text-xs text-[#B6B0A3] leading-relaxed">
                  {activeNode.subtitle}
                </p>
              </div>

              {/* SECTION A: VERIFIED SACRED TEXT (Strictly separated from generated/practical suggestions) */}
              <div className="rounded-3xl bg-[#1C1A16] border border-[#D6B36A]/55 p-5 space-y-4 shadow-lg">
                <div className="flex items-center justify-between border-b border-[#D6B36A]/25 pb-2.5">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-[#D6B36A]">
                    <ShieldCheck size={16} />
                    <span>
                      {activeNode.sacredContent.type === 'quran'
                        ? 'النص القرآني الموثق (برسم المصحف الشريف)'
                        : 'النص النبوي الشريف الموثق'}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#B6B0A3] font-bold">
                    {activeNode.sacredContent.reference}
                  </span>
                </div>

                <p className="font-quran text-xl sm:text-2xl text-[#F2EBDD] leading-loose text-center py-2 px-1">
                  {activeNode.sacredContent.type === 'quran'
                    ? `﴿ ${activeNode.sacredContent.arabicText} ﴾`
                    : activeNode.sacredContent.arabicText}
                </p>

                {activeNode.sacredContent.narrator && (
                  <div className="flex items-center justify-between text-xs text-[#B6B0A3] pt-1 border-t border-[#D6B36A]/15">
                    <span>
                      الراوي:{' '}
                      <strong className="text-[#F2EBDD]">
                        {activeNode.sacredContent.narrator}
                      </strong>
                    </span>
                    {activeNode.sacredContent.authenticityGrade && (
                      <span className="text-[#D6B36A] font-bold">
                        درجة الحديث: {activeNode.sacredContent.authenticityGrade}
                      </span>
                    )}
                  </div>
                )}

                {/* Audio & Distraction-Free Reader Controls */}
                <div className="pt-2 border-t border-[#D6B36A]/25 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(activeNode.sacredContent.surahNumber ||
                      activeNode.serenityConfig?.audioSurahNumber) && (
                      <>
                        <button
                          type="button"
                          onClick={handleToggleNodeAudio}
                          className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                            isPlayingNodeAudio
                              ? 'bg-[#D6B36A] text-[#0A0A0A]'
                              : 'bg-[#0A0A0A] hover:bg-[#151515] text-[#D6B36A] border border-[#D6B36A]/40'
                          }`}
                        >
                          {isPlayingNodeAudio ? (
                            <Pause size={14} fill="currentColor" />
                          ) : (
                            <Volume2 size={14} />
                          )}
                          <span>
                            {isPlayingNodeAudio
                              ? 'إيقاف التلاوة الصوتية'
                              : 'الاستماع للتلاوة'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onSelectSurah(
                              activeNode.sacredContent.surahNumber ||
                                activeNode.serenityConfig?.audioSurahNumber ||
                                1,
                              activeNode.sacredContent.ayahNumber || 1
                            )
                          }
                          className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#0A0A0A] hover:bg-[#151515] text-[#F2EBDD] border border-[#D6B36A]/30 text-xs font-bold flex items-center gap-1.5"
                        >
                          <BookOpen size={14} className="text-[#D6B36A]" />
                          <span>فتح في المصحف الكامل</span>
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsDistractionFreeOpen(true)}
                    className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#151515] hover:bg-[#231F18] text-[#D6B36A] border border-[#D6B36A]/45 text-xs font-extrabold flex items-center gap-1.5"
                  >
                    <Eye size={14} />
                    <span>وضع السكينة بلا تشتيت</span>
                  </button>
                </div>
              </div>

              {/* SECTION B: TRUSTED SCHOLARLY TAFSIR / FIQH / SEERAH EXPLANATION */}
              <div className="rounded-3xl bg-[#151515] border border-[#D6B36A]/35 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-[#D6B36A]">
                    {activeNode.scholarlyExplanation.title}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-lg bg-[#1C1A16] border border-[#D6B36A]/30 text-[10px] font-bold text-[#B6B0A3]">
                    محتوى علمي مراجع ✓
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-[#F2EBDD] leading-relaxed text-justify">
                  {activeNode.scholarlyExplanation.text}
                </p>

                {activeNode.scholarlyExplanation.asbabAlNuzulOrContext && (
                  <div className="p-3.5 rounded-2xl bg-[#0A0A0A] border border-[#D6B36A]/25 space-y-1">
                    <span className="text-[11px] font-extrabold text-[#D6B36A] block">
                      سياق الآيات / سبب الورود:
                    </span>
                    <p className="text-xs text-[#B6B0A3] leading-relaxed">
                      {activeNode.scholarlyExplanation.asbabAlNuzulOrContext}
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t border-[#D6B36A]/20 flex items-center justify-between text-[11px] text-[#B6B0A3] flex-wrap gap-2">
                  <span>
                    المصدر المعتمد:{' '}
                    <strong className="text-[#F2EBDD]">
                      {activeNode.scholarlyExplanation.sourceBook}
                    </strong>
                  </span>
                  <span>المؤلف/الجهة: {activeNode.scholarlyExplanation.author}</span>
                </div>
              </div>

              {/* SECTION C: SEPARATED PRACTICAL STEPS (User-Selected Optional Activities) */}
              <div className="rounded-3xl bg-[#151515] border border-[#D6B36A]/35 p-5 space-y-3.5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-[#F2EBDD]">
                      خطوات التطبيق العملي والذكر (اختيارية مرنة)
                    </h3>
                    <span className="text-[10px] text-[#D6B36A] font-bold">
                      مفصولة عن النص الشرعي
                    </span>
                  </div>
                  <p className="text-[11px] text-[#B6B0A3]">
                    اختر ما يناسب وقتك واستطاعتك اليوم — يمكنك التوقف والاستئناف لاحقاً في أي لحظة.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {activeNode.practicalSteps.map((step) => {
                    const isChecked = activeProgress.completedStepIds.includes(
                      step.id
                    );
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => {
                          AdaptiveJourneyService.togglePracticalStep(
                            activeNode.id,
                            step.id
                          );
                          syncAll();
                        }}
                        className={`w-full p-3.5 rounded-2xl border text-right flex items-start gap-3 transition-all ${
                          isChecked
                            ? 'bg-[#1C1A16] border-[#D6B36A] text-[#F2EBDD]'
                            : 'bg-[#0A0A0A] border-[#D6B36A]/25 text-[#B6B0A3] hover:border-[#D6B36A]/50'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${
                            isChecked
                              ? 'bg-[#D6B36A] border-[#D6B36A] text-[#0A0A0A]'
                              : 'border-[#D6B36A]/45 text-transparent'
                          }`}
                        >
                          <Check size={14} strokeWidth={3} />
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-extrabold text-[#F2EBDD]">
                              {step.title}
                            </span>
                            {step.isOptional && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#151515] border border-[#D6B36A]/25 text-[#B6B0A3]">
                                اختياري
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#B6B0A3] leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Primary Session Control Actions: Complete OR Pause for Later */}
                <div className="pt-3 border-t border-[#D6B36A]/20 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleCompleteActivity}
                    className="flex-1 min-h-[48px] rounded-2xl bg-[#D6B36A] hover:bg-[#e2c27e] text-[#0A0A0A] font-extrabold text-xs px-4 py-3 flex items-center justify-center gap-2 transition-all"
                  >
                    <CheckCircle2 size={17} />
                    <span>إتمام المحطة والانتقال للتأمل الاختياري</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePauseForLater}
                    className="min-h-[48px] rounded-2xl bg-[#1C1A16] hover:bg-[#25221B] text-[#F2EBDD] border border-[#D6B36A]/40 font-bold text-xs px-4 py-3 flex items-center justify-center gap-2 transition-all"
                  >
                    <Pause size={15} className="text-[#D6B36A]" />
                    <span>إيقاف مؤقت والاستئناف لاحقاً</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              SCREEN 3: ACTIVITY COMPLETION, OPTIONAL PRIVATE REFLECTION & NEXT STEP
             ===================================================================== */}
          {activeSubTab === 'activity_completion' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="rounded-3xl bg-[#151515] border border-[#D6B36A]/50 p-5 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#1C1A16] border border-[#D6B36A] mx-auto flex items-center justify-center text-[#D6B36A]">
                  <CheckCircle2 size={28} />
                </div>
                <h2 className="text-lg font-extrabold text-[#F2EBDD]">
                  تقبّل الله منك ونفعك بما تعلمت وعملت
                </h2>
                <p className="text-xs text-[#B6B0A3] max-w-md mx-auto leading-relaxed">
                  أتممت محطة «{activeNode.title}» ضمن مسار{' '}
                  {JOURNEY_PATHS_META[activeNode.path].titleArabic}. يمكنك تدوين تأملك الخاص أو الانتقال للمحطة المترابطة التالية.
                </p>
              </div>

              {/* Optional Private Reflection Box (Strictly Local-First, Never Shared or Analyzed) */}
              <div className="rounded-3xl bg-[#151515] border border-[#D6B36A]/35 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock size={15} className="text-[#D6B36A]" />
                    <h3 className="text-sm font-extrabold text-[#F2EBDD]">
                      تأمل شخصي اختياري (خاص ١٠٠٪ على جهازك)
                    </h3>
                  </div>
                  <span className="text-[10px] text-[#B6B0A3]">اختياري</span>
                </div>

                <p className="text-xs text-[#D6B36A] font-semibold">
                  سؤال للتأمل: {activeNode.reflectionPrompt}
                </p>

                <textarea
                  rows={3}
                  value={reflectionDraft}
                  onChange={(e) => setReflectionDraft(e.target.value)}
                  placeholder="اكتب خاطرتك أو الدعاء الذي لامس قلبك... (يُحفظ في ذاكرة جهازك المعزولة فقط ولا يدخل في أي تحليلات)"
                  className="w-full rounded-2xl bg-[#0A0A0A] border border-[#D6B36A]/30 focus:border-[#D6B36A] p-3.5 text-xs text-[#F2EBDD] placeholder-[#B6B0A3]/60 outline-none leading-relaxed"
                />

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[10px] text-[#B6B0A3]">
                    لا يتم إرسال أو مشاركة أي حرف من تأملاتك مع أي طرف.
                  </span>
                  <button
                    type="button"
                    onClick={handleSavePrivateReflection}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-[#D6B36A] text-[#0A0A0A] text-xs font-extrabold"
                  >
                    حفظ التأمل الخاص
                  </button>
                </div>
              </div>

              {/* Connected Next Activity Suggestions across the 3 Paths */}
              <div className="rounded-3xl bg-[#151515] border border-[#D6B36A]/35 p-5 space-y-3">
                <h3 className="text-sm font-extrabold text-[#F2EBDD]">
                  المحطات التالية المترابطة في رحلتك:
                </h3>
                <div className="space-y-2.5">
                  {connectedNodesList.map((conn) => (
                    <div
                      key={conn.id}
                      className="p-3.5 rounded-2xl bg-[#1C1A16] border border-[#D6B36A]/35 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold text-[#D6B36A]">
                          انتقل إلى مسار {JOURNEY_PATHS_META[conn.path].titleArabic} ({conn.durationMinutes} دقائق)
                        </span>
                        <h4 className="text-xs font-extrabold text-[#F2EBDD]">
                          {conn.title}
                        </h4>
                        <p className="text-[11px] text-[#B6B0A3]">
                          {conn.subtitle}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenActivity(conn.id)}
                        className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#D6B36A] text-[#0A0A0A] text-xs font-extrabold shrink-0"
                      >
                        بدء الآن
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSubTab('dashboard_map')}
                  className="w-full min-h-[44px] rounded-xl bg-[#0A0A0A] border border-[#D6B36A]/30 text-xs font-bold text-[#F2EBDD] hover:bg-[#1C1A16]"
                >
                  العودة إلى خريطة المسارات الثلاثة
                </button>
              </div>
            </div>
          )}

          {/* =====================================================================
              SCREEN 4: WEEKLY PERSONAL RECAP (Non-Competitive, Zero Spiritual Score)
             ===================================================================== */}
          {activeSubTab === 'weekly_recap' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="rounded-3xl bg-[#151515] border border-[#D6B36A]/40 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-[#D6B36A]" />
                    <h2 className="text-base font-extrabold text-[#F2EBDD]">
                      ملخصك الشخصي الهادئ
                    </h2>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-[#1C1A16] border border-[#D6B36A]/30 text-[10px] font-bold text-[#D6B36A]">
                    بلا تقييم رقمي أو مقارنات
                  </span>
                </div>
                <p className="text-xs text-[#B6B0A3] leading-relaxed">
                  يعرض هذا الملخص المحطات التي زرتها والموضوعات التي تأملتها؛ للاستئناس وتنظيم وقتك دون أي درجات إيمانية أو عدادات عقابية.
                </p>

                {/* Three Paths Balance Grid */}
                <div className="grid grid-cols-3 gap-2.5 pt-2">
                  {(['knowledge', 'practice', 'serenity'] as const).map(
                    (pathId) => (
                      <div
                        key={pathId}
                        className="p-3.5 rounded-2xl bg-[#1C1A16] border border-[#D6B36A]/30 text-center space-y-1"
                      >
                        <span className="text-xs font-extrabold text-[#D6B36A] block">
                          مسار {JOURNEY_PATHS_META[pathId].titleArabic}
                        </span>
                        <span className="text-xl font-black text-[#F2EBDD] font-mono block">
                          {recap.visitedPathsCount[pathId]}
                        </span>
                        <span className="text-[10px] text-[#B6B0A3] block">
                          محطات تمت زيارتها
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Completed & In-Progress Summary */}
              <div className="rounded-3xl bg-[#151515] border border-[#D6B36A]/30 p-5 space-y-3">
                <h3 className="text-sm font-extrabold text-[#F2EBDD]">
                  أحدث المحطات التي أتممتها ({recap.completedNodesThisWeek.length})
                </h3>
                {recap.completedNodesThisWeek.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-[#0A0A0A] border border-[#D6B36A]/20 text-center space-y-2">
                    <p className="text-xs text-[#B6B0A3]">
                      لم تتم أي محطة بعد. ابدأ بأول محطة تناسب وقتك المتاح (٥ أو ١٠ دقائق).
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('dashboard_map')}
                      className="px-4 py-2 rounded-xl bg-[#D6B36A] text-[#0A0A0A] text-xs font-extrabold"
                    >
                      استكشاف خريطة المسارات
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recap.completedNodesThisWeek.map((node) => (
                      <div
                        key={node.id}
                        className="p-3 rounded-2xl bg-[#1C1A16] border border-[#D6B36A]/30 flex items-center justify-between gap-2"
                      >
                        <div>
                          <span className="text-[10px] font-bold text-[#D6B36A]">
                            مسار {JOURNEY_PATHS_META[node.path].titleArabic}
                          </span>
                          <h4 className="text-xs font-extrabold text-[#F2EBDD]">
                            {node.title}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenActivity(node.id)}
                          className="px-3 py-1.5 rounded-xl bg-[#0A0A0A] border border-[#D6B36A]/30 text-[11px] font-bold text-[#D6B36A]"
                        >
                          مراجعة
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =====================================================================
              SCREEN 5: JOURNEY HISTORY, SAVED BOOKMARKS & PRIVATE REFLECTIONS
             ===================================================================== */}
          {activeSubTab === 'history_saved' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Resumable / In-Progress Stations */}
              <div className="rounded-3xl bg-[#151515] border border-[#D6B36A]/35 p-5 space-y-3">
                <h2 className="text-sm font-extrabold text-[#D6B36A]">
                  محطات قيد الاستئناف ({recap.inProgressNodes.length})
                </h2>
                {recap.inProgressNodes.length === 0 ? (
                  <p className="text-xs text-[#B6B0A3]">
                    لا توجد محطات متوقفة حالياً. أي محطة تبدأها وتتوقف خلالها ستظهر هنا لاستئنافها بسهولة.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recap.inProgressNodes.map((node) => (
                      <div
                        key={node.id}
                        className="p-3.5 rounded-2xl bg-[#1C1A16] border border-[#D6B36A]/50 flex items-center justify-between gap-3"
                      >
                        <div>
                          <span className="text-[10px] text-[#D6B36A] font-bold">
                            مسار {JOURNEY_PATHS_META[node.path].titleArabic}
                          </span>
                          <h3 className="text-xs font-extrabold text-[#F2EBDD]">
                            {node.title}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenActivity(node.id)}
                          className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#D6B36A] text-[#0A0A0A] text-xs font-extrabold"
                        >
                          استئناف الآن
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Saved / Bookmarked Stations */}
              <div className="rounded-3xl bg-[#151515] border border-[#D6B36A]/35 p-5 space-y-3">
                <h2 className="text-sm font-extrabold text-[#F2EBDD] flex items-center gap-2">
                  <Bookmark size={15} className="text-[#D6B36A]" />
                  <span>المحطات المحفوظة ({recap.savedNodes.length})</span>
                </h2>
                {recap.savedNodes.length === 0 ? (
                  <p className="text-xs text-[#B6B0A3]">
                    لم تحفظ أي محطة في المفضلة بعد. اضغط على أيقونة الحفظ بجانب أي محطة للرجوع إليها لاحقاً.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recap.savedNodes.map((node) => (
                      <div
                        key={node.id}
                        className="p-3.5 rounded-2xl bg-[#1C1A16] border border-[#D6B36A]/30 flex items-center justify-between gap-3"
                      >
                        <div>
                          <span className="text-[10px] text-[#D6B36A] font-bold">
                            مسار {JOURNEY_PATHS_META[node.path].titleArabic} ·{' '}
                            {node.durationMinutes} دقائق
                          </span>
                          <h3 className="text-xs font-extrabold text-[#F2EBDD]">
                            {node.title}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenActivity(node.id)}
                          className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#0A0A0A] border border-[#D6B36A]/40 text-xs font-bold text-[#D6B36A]"
                        >
                          فتح
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Isolated Private Reflections Journal */}
              <div className="rounded-3xl bg-[#151515] border border-[#D6B36A]/35 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-extrabold text-[#F2EBDD] flex items-center gap-2">
                    <Lock size={15} className="text-[#D6B36A]" />
                    <span>دفتر التأملات الخاصة ({reflections.length})</span>
                  </h2>
                  <span className="text-[10px] text-[#D6B36A] font-bold">
                    تخزين محلي معزول ١٠٠٪
                  </span>
                </div>

                {reflections.length === 0 ? (
                  <p className="text-xs text-[#B6B0A3]">
                    لا توجد تأملات مدونة بعد. يمكنك كتابة تأملاتك الخاصة بعد إتمام أي محطة.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {reflections.map((refl) => (
                      <div
                        key={refl.id}
                        className="p-3.5 rounded-2xl bg-[#0A0A0A] border border-[#D6B36A]/25 space-y-2"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-extrabold text-[#D6B36A]">
                            {refl.nodeTitle}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              AdaptiveJourneyService.deletePrivateReflection(
                                refl.id
                              );
                              syncAll();
                              showToast('تم مسح التأمل من جهازك');
                            }}
                            className="text-[#B6B0A3] hover:text-red-400"
                            title="حذف التأمل"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <p className="text-xs text-[#F2EBDD] leading-relaxed">
                          {refl.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =====================================================================
              SCREEN 6: NOTIFICATION, PRIVACY, BACKUP & CONSENT METRICS SETTINGS
             ===================================================================== */}
          {activeSubTab === 'privacy_settings' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Gentle Reminders & Engagement Controls */}
              <div className="rounded-3xl bg-[#151515] border border-[#D6B36A]/35 p-5 space-y-3.5">
                <h2 className="text-sm font-extrabold text-[#F2EBDD]">
                  إعدادات التذكيرات الهادئة والتحكم في التفاعل
                </h2>
                <p className="text-xs text-[#B6B0A3]">
                  نلتزم بعدم إرسال أي إشعارات قائمة على الشعور بالذنب أو الإلحاح. لك التحكم الكامل في تفعيل أو تعطيل أي ميزة.
                </p>

                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-2xl bg-[#1C1A16] border border-[#D6B36A]/25 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-extrabold text-[#F2EBDD]">
                        تفعيل التوصيات التكيفية التلقائية
                      </h3>
                      <p className="text-[11px] text-[#B6B0A3]">
                        اقتراح المحطة التالية بناءً على أهدافك ووقتك المتاح فقط
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        AdaptiveJourneyService.savePreferences({
                          ...prefs,
                          recommendationsEnabled: !prefs.recommendationsEnabled,
                        });
                        syncAll();
                      }}
                      className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-extrabold border ${
                        prefs.recommendationsEnabled
                          ? 'bg-[#D6B36A] text-[#0A0A0A] border-[#D6B36A]'
                          : 'bg-[#0A0A0A] text-[#B6B0A3] border-[#D6B36A]/30'
                      }`}
                    >
                      {prefs.recommendationsEnabled ? 'مفعّل' : 'متوقف'}
                    </button>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#1C1A16] border border-[#D6B36A]/25 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-extrabold text-[#F2EBDD]">
                        تذكيرات لطيفة بدون إلحاح
                      </h3>
                      <p className="text-[11px] text-[#B6B0A3]">
                        دعوة هادئة في الوقت الذي تختاره دون أي رسائل عتاب عند الانشغال
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        AdaptiveJourneyService.savePreferences({
                          ...prefs,
                          gentleRemindersEnabled: !prefs.gentleRemindersEnabled,
                        });
                        syncAll();
                      }}
                      className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-extrabold border ${
                        prefs.gentleRemindersEnabled
                          ? 'bg-[#D6B36A] text-[#0A0A0A] border-[#D6B36A]'
                          : 'bg-[#0A0A0A] text-[#B6B0A3] border-[#D6B36A]/30'
                      }`}
                    >
                      {prefs.gentleRemindersEnabled ? 'مفعّل' : 'متوقف'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Local-First Backup, Export & Complete Deletion */}
              <div className="rounded-3xl bg-[#151515] border border-[#D6B36A]/35 p-5 space-y-3.5">
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-[#D6B36A]" />
                  <h2 className="text-sm font-extrabold text-[#F2EBDD]">
                    الخصوصية المحلية والنسخ الاحتياطي والحذف
                  </h2>
                </div>
                <p className="text-xs text-[#B6B0A3] leading-relaxed">
                  تُحفظ جميع بيانات رحلتك وتأملاتك محلياً على جهازك (Local-First). يمكنك تصدير نسخة احتياطية كاملة بصيغة JSON أو استعادتها أو حذف بياناتك نهائياً.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#1C1A16] hover:bg-[#25221B] border border-[#D6B36A]/45 text-xs font-extrabold text-[#D6B36A] flex items-center justify-center gap-2"
                  >
                    <Download size={15} />
                    <span>تصدير نسخة احتياطية (JSON)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowImportBox(!showImportBox)}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#1C1A16] hover:bg-[#25221B] border border-[#D6B36A]/35 text-xs font-bold text-[#F2EBDD] flex items-center justify-center gap-2"
                  >
                    <Upload size={15} className="text-[#D6B36A]" />
                    <span>استيراد نسخة احتياطية</span>
                  </button>
                </div>

                {showImportBox && (
                  <div className="p-3.5 rounded-2xl bg-[#0A0A0A] border border-[#D6B36A]/35 space-y-2.5">
                    <textarea
                      rows={4}
                      value={importJsonText}
                      onChange={(e) => setImportJsonText(e.target.value)}
                      placeholder="الصق محتوى ملف النسخة الاحتياطية (JSON) هنا..."
                      className="w-full rounded-xl bg-[#151515] border border-[#D6B36A]/30 p-3 text-xs text-[#F2EBDD] font-mono outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowImportBox(false)}
                        className="px-3 py-1.5 rounded-xl bg-[#151515] text-xs text-[#B6B0A3]"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={handleImportBackup}
                        className="px-4 py-1.5 rounded-xl bg-[#D6B36A] text-[#0A0A0A] text-xs font-extrabold"
                      >
                        تأكيد الاستعادة
                      </button>
                    </div>
                  </div>
                )}

                {/* Explicit Deletion Controls */}
                <div className="pt-2 border-t border-[#D6B36A]/20 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteMode('reflections')}
                    className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#0A0A0A] border border-[#D6B36A]/25 text-xs font-bold text-[#B6B0A3] hover:text-red-400 flex items-center gap-1.5"
                  >
                    <Trash2 size={14} />
                    <span>مسح التأملات الخاصة فقط</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmDeleteMode('all')}
                    className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#0A0A0A] border border-red-500/30 text-xs font-bold text-red-300 hover:bg-red-950/30 flex items-center gap-1.5"
                  >
                    <Trash2 size={14} />
                    <span>حذف جميع بيانات الرحلة والتفضيلات</span>
                  </button>
                </div>

                {confirmDeleteMode && (
                  <div className="p-3.5 rounded-2xl bg-[#1C1A16] border border-red-400/50 space-y-2.5">
                    <p className="text-xs font-bold text-[#F2EBDD]">
                      {confirmDeleteMode === 'reflections'
                        ? 'هل أنت متأكد من حذف جميع تأملاتك الخاصة نهائياً من هذا الجهاز؟'
                        : 'هل أنت متأكد من حذف سجل الرحلة والمحفوظات والتأملات والتفضيلات بالكامل؟'}
                    </p>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteMode(null)}
                        className="px-3 py-1.5 rounded-xl bg-[#0A0A0A] text-xs text-[#B6B0A3]"
                      >
                        تراجع
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          AdaptiveJourneyService.deleteAllJourneyData({
                            onlyReflections:
                              confirmDeleteMode === 'reflections',
                          });
                          setConfirmDeleteMode(null);
                          syncAll();
                          showToast('تم حذف البيانات المحددة بنجاح');
                        }}
                        className="px-4 py-1.5 rounded-xl bg-red-500 text-white text-xs font-extrabold"
                      >
                        تأكيد الحذف النهائي
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Consent-Based Success Metrics & Architecture Integrity Verification */}
              <div className="rounded-3xl bg-[#151515] border border-[#D6B36A]/35 p-5 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-extrabold text-[#F2EBDD]">
                      مؤشرات جودة التجربة (Consent-Based Metrics)
                    </h2>
                    <p className="text-[11px] text-[#B6B0A3]">
                      تُقاس محلياً بموافقتك لتقييم مدى ملاءمة الرحلة لوقتك — دون جمع أي تأملات شخصية.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      AdaptiveJourneyService.savePreferences({
                        ...prefs,
                        consentAnalyticsEnabled: !prefs.consentAnalyticsEnabled,
                      });
                      syncAll();
                    }}
                    className={`min-h-[36px] px-3 py-1 rounded-xl text-[11px] font-extrabold border ${
                      prefs.consentAnalyticsEnabled
                        ? 'bg-[#D6B36A] text-[#0A0A0A] border-[#D6B36A]'
                        : 'bg-[#0A0A0A] text-[#B6B0A3] border-[#D6B36A]/30'
                    }`}
                  >
                    {prefs.consentAnalyticsEnabled ? 'موافقة مفعّلة' : 'متوقف'}
                  </button>
                </div>

                {prefs.consentAnalyticsEnabled && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                    <div className="p-3 rounded-2xl bg-[#1C1A16] border border-[#D6B36A]/25">
                      <span className="text-[10px] text-[#B6B0A3] block">
                        إتمام الجلسة الأولى
                      </span>
                      <span className="text-xs font-extrabold text-[#D6B36A]">
                        {consentMetrics.firstSessionCompleted
                          ? 'مكتملة ✓'
                          : 'قيد البدء'}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#1C1A16] border border-[#D6B36A]/25">
                      <span className="text-[10px] text-[#B6B0A3] block">
                        إجمالي المحطات المكتملة
                      </span>
                      <span className="text-sm font-black font-mono text-[#F2EBDD]">
                        {consentMetrics.totalActivitiesCompleted}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#1C1A16] border border-[#D6B36A]/25">
                      <span className="text-[10px] text-[#B6B0A3] block">
                        الاستئناف الناجح بعد توقف
                      </span>
                      <span className="text-sm font-black font-mono text-[#F2EBDD]">
                        {consentMetrics.successfulResumesCount} /{' '}
                        {consentMetrics.pausedSessionsCount}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#1C1A16] border border-[#D6B36A]/25">
                      <span className="text-[10px] text-[#B6B0A3] block">
                        أيام العودة الطوعية
                      </span>
                      <span className="text-sm font-black font-mono text-[#F2EBDD]">
                        {consentMetrics.voluntaryReturnDays.length} يوم
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#1C1A16] border border-[#D6B36A]/25">
                      <span className="text-[10px] text-[#B6B0A3] block">
                        استبدال/تجاهل المقترحات
                      </span>
                      <span className="text-sm font-black font-mono text-[#F2EBDD]">
                        {consentMetrics.recommendationReplacements +
                          consentMetrics.recommendationDismissals}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#1C1A16] border border-[#D6B36A]/25">
                      <span className="text-[10px] text-[#B6B0A3] block">
                        إيقاف التذكيرات طوعاً
                      </span>
                      <span className="text-sm font-black font-mono text-[#F2EBDD]">
                        {consentMetrics.notificationOptOutCount}
                      </span>
                    </div>
                  </div>
                )}

                {/* Automated Self-Test & UI State Verification Switcher */}
                <div className="pt-3 border-t border-[#D6B36A]/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#D6B36A]">
                      فحص سلامة المعمارية وتوثيق المحتوى الذاتي:
                    </span>
                    <span className="text-xs font-bold text-[#F2EBDD]">
                      {integrityReport.passedChecks}/{integrityReport.totalChecks}{' '}
                      معايير محققة ✓
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {integrityReport.details.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-[#0A0A0A] border border-[#D6B36A]/20 flex items-center justify-between text-[11px]"
                      >
                        <span className="font-bold text-[#F2EBDD]">
                          {item.checkName}
                        </span>
                        <span className="text-[#D6B36A]">{item.note}</span>
                      </div>
                    ))}
                  </div>

                  {/* Interactive State Previewer for Empty / Offline / Loading / Error / Returning */}
                  <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-[#B6B0A3]">
                      معاينة حالات النظام:
                    </span>
                    {[
                      { id: 'normal', label: 'الوضع الطبيعي' },
                      { id: 'returning', label: 'حالة العودة بعد انقطاع' },
                      { id: 'offline', label: 'حالة عدم الاتصال' },
                      { id: 'loading', label: 'حالة التحميل' },
                      { id: 'error', label: 'استعادة الأخطاء' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setSimulatedViewState(st.id as any)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                          simulatedViewState === st.id
                            ? 'bg-[#D6B36A] text-[#0A0A0A] border-[#D6B36A]'
                            : 'bg-[#0A0A0A] text-[#B6B0A3] border-[#D6B36A]/25'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* =======================================================================
          MODAL 1: WELCOME & OPTIONAL ONBOARDING (Goals & Available Time)
         ======================================================================= */}
      {isOnboardingOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="إعداد تفضيلات الرحلة الإيمانية التكيفية"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            dir="rtl"
            className="w-full max-w-md rounded-3xl bg-[#151515] border border-[#D6B36A]/55 p-5 space-y-4 text-right shadow-2xl max-h-[90dvh] overflow-y-auto"
          >
            {/* Header & Always-Visible Skip Button */}
            <div className="flex items-center justify-between border-b border-[#D6B36A]/25 pb-3">
              <div className="flex items-center gap-2">
                <Compass size={18} className="text-[#D6B36A]" />
                <span className="text-xs font-extrabold text-[#D6B36A]">
                  خطوة {onboardingStep} من ٣ · إعداد اختياري
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  AdaptiveJourneyService.skipOnboarding();
                  setIsOnboardingOpen(false);
                  syncAll();
                }}
                className="px-3 py-1 rounded-xl bg-[#1C1A16] border border-[#D6B36A]/30 text-xs font-bold text-[#B6B0A3] hover:text-[#F2EBDD]"
              >
                تخطي الآن
              </button>
            </div>

            {onboardingStep === 1 && (
              <div className="space-y-3.5">
                <h2 className="text-base font-extrabold text-[#F2EBDD]">
                  مرحباً بك في رحلة «أثر» التكيفية
                </h2>
                <p className="text-xs text-[#B6B0A3] leading-relaxed">
                  اختر الموضوعات التي تود التركيز عليها في مسارات المعرفة والعمل والسكينة (يمكنك اختيار أكثر من هدف وتعديلها في أي وقت):
                </p>

                <div className="space-y-2">
                  {JOURNEY_GOALS_META.map((goal) => {
                    const selected = prefs.selectedGoals.includes(goal.id);
                    return (
                      <button
                        key={goal.id}
                        type="button"
                        onClick={() => handleToggleGoal(goal.id)}
                        className={`w-full p-3.5 rounded-2xl border text-right flex items-start justify-between gap-3 transition-all ${
                          selected
                            ? 'bg-[#1C1A16] border-[#D6B36A] text-[#F2EBDD]'
                            : 'bg-[#0A0A0A] border-[#D6B36A]/25 text-[#B6B0A3]'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <h3 className="text-xs font-extrabold text-[#F2EBDD]">
                            {goal.titleArabic}
                          </h3>
                          <p className="text-[11px] text-[#B6B0A3]">
                            {goal.subtitleArabic}
                          </p>
                          <span className="text-[10px] text-[#D6B36A] block pt-0.5">
                            المصادر: {goal.sourceSummary}
                          </span>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${
                            selected
                              ? 'bg-[#D6B36A] border-[#D6B36A] text-[#0A0A0A]'
                              : 'border-[#D6B36A]/40 text-transparent'
                          }`}
                        >
                          <Check size={14} strokeWidth={3} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {onboardingStep === 2 && (
              <div className="space-y-3.5">
                <h2 className="text-base font-extrabold text-[#F2EBDD]">
                  ما الوقت المتاح لديك عادةً للجلسة الواحدة؟
                </h2>
                <p className="text-xs text-[#B6B0A3]">
                  لا يشترط فتح التطبيق يومياً؛ نكيّف طول المحطة المقترحة وفق وقتك المتاح الفعلي:
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  {JOURNEY_DURATIONS_META.map((item) => {
                    const isSelected =
                      prefs.preferredDurationMinutes === item.minutes;
                    return (
                      <button
                        key={item.minutes}
                        type="button"
                        onClick={() => {
                          AdaptiveJourneyService.savePreferences({
                            ...prefs,
                            preferredDurationMinutes: item.minutes,
                          });
                          syncAll();
                        }}
                        className={`p-3.5 rounded-2xl border text-right space-y-1 transition-all ${
                          isSelected
                            ? 'bg-[#1C1A16] border-[#D6B36A] text-[#F2EBDD]'
                            : 'bg-[#0A0A0A] border-[#D6B36A]/25 text-[#B6B0A3]'
                        }`}
                      >
                        <span className="text-sm font-extrabold text-[#D6B36A] block">
                          {item.labelArabic}
                        </span>
                        <p className="text-[11px] text-[#B6B0A3] leading-snug">
                          {item.descriptionArabic}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {onboardingStep === 3 && (
              <div className="space-y-3.5">
                <h2 className="text-base font-extrabold text-[#F2EBDD]">
                  اختر مستوى العمق المفضل للمحتوى
                </h2>
                <p className="text-xs text-[#B6B0A3]">
                  جميع النصوص الشرعية موثقة ومفصولة عن مقترحات التطبيق العملية:
                </p>

                <div className="space-y-2">
                  {JOURNEY_DEPTH_META.map((d) => {
                    const isSelected = prefs.preferredDepth === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          AdaptiveJourneyService.savePreferences({
                            ...prefs,
                            preferredDepth: d.id,
                          });
                          syncAll();
                        }}
                        className={`w-full p-3.5 rounded-2xl border text-right flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-[#1C1A16] border-[#D6B36A] text-[#F2EBDD]'
                            : 'bg-[#0A0A0A] border-[#D6B36A]/25 text-[#B6B0A3]'
                        }`}
                      >
                        <div>
                          <span className="text-xs font-extrabold text-[#D6B36A] block">
                            {d.labelArabic}
                          </span>
                          <p className="text-[11px] text-[#B6B0A3] mt-0.5">
                            {d.descriptionArabic}
                          </p>
                        </div>
                        {isSelected && (
                          <Check size={16} className="text-[#D6B36A] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal Footer Navigation */}
            <div className="pt-3 border-t border-[#D6B36A]/25 flex items-center justify-between gap-2">
              {onboardingStep > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setOnboardingStep((prev) =>
                      prev === 3 ? 2 : 1
                    )
                  }
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0A0A0A] border border-[#D6B36A]/30 text-xs font-bold text-[#F2EBDD]"
                >
                  السابق
                </button>
              ) : (
                <div />
              )}

              {onboardingStep < 3 ? (
                <button
                  type="button"
                  onClick={() =>
                    setOnboardingStep((prev) =>
                      prev === 1 ? 2 : 3
                    )
                  }
                  className="min-h-[44px] px-6 py-2 rounded-xl bg-[#D6B36A] text-[#0A0A0A] text-xs font-extrabold"
                >
                  التالي
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    AdaptiveJourneyService.completeOnboarding(prefs);
                    setIsOnboardingOpen(false);
                    syncAll();
                    showToast('تم حفظ تفضيلات رحلتك التكيفية بنجاح');
                  }}
                  className="min-h-[44px] px-6 py-2 rounded-xl bg-[#D6B36A] text-[#0A0A0A] text-xs font-extrabold"
                >
                  حفظ وبدء الرحلة
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          MODAL 2: DISTRACTION-FREE SERENITY READER OVERLAY
         ======================================================================= */}
      {isDistractionFreeOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="وضع السكينة للقراءة والذكر بدون تشتيت"
          className="fixed inset-0 z-50 bg-[#0A0A0A] flex flex-col justify-between p-6 text-right animate-fadeIn"
        >
          <div className="flex items-center justify-between max-w-lg mx-auto w-full border-b border-[#D6B36A]/20 pb-4">
            <span className="text-xs font-extrabold text-[#D6B36A]">
              وضع السكينة الخالص (بدون مشتتات)
            </span>
            <button
              type="button"
              onClick={() => setIsDistractionFreeOpen(false)}
              className="min-h-[42px] px-3.5 py-1.5 rounded-xl bg-[#151515] border border-[#D6B36A]/35 text-xs font-bold text-[#F2EBDD] flex items-center gap-1.5"
            >
              <span>إغلاق وضع السكينة</span>
              <X size={14} />
            </button>
          </div>

          <div className="max-w-lg mx-auto w-full my-auto py-8 space-y-6 text-center">
            <span className="px-3 py-1 rounded-full bg-[#151515] border border-[#D6B36A]/35 text-xs font-bold text-[#D6B36A]">
              {activeNode.sacredContent.reference}
            </span>

            <p className="font-quran text-2xl sm:text-3xl text-[#F2EBDD] leading-[2.3] px-2">
              {activeNode.sacredContent.type === 'quran'
                ? `﴿ ${activeNode.sacredContent.arabicText} ﴾`
                : activeNode.sacredContent.arabicText}
            </p>

            {/* Gentle Repetition Counter for Serenity Dhikr/Recitation */}
            <div className="pt-4 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => setSerenityRepCount((c) => c + 1)}
                className="min-h-[54px] px-8 py-3 rounded-2xl bg-[#1C1A16] hover:bg-[#25221B] border border-[#D6B36A]/60 text-sm font-extrabold text-[#D6B36A] shadow-lg active:scale-95 transition-all"
              >
                تسجيل قراءة / تكرار بتأنٍّ ({serenityRepCount}
                {activeNode.serenityConfig?.suggestedRepetitions
                  ? ` / ${activeNode.serenityConfig.suggestedRepetitions}`
                  : ''}
                )
              </button>
            </div>
          </div>

          <div className="max-w-lg mx-auto w-full border-t border-[#D6B36A]/20 pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={handleToggleNodeAudio}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#151515] border border-[#D6B36A]/40 text-xs font-bold text-[#D6B36A] flex items-center gap-2"
            >
              {isPlayingNodeAudio ? <Pause size={14} /> : <Play size={14} />}
              <span>
                {isPlayingNodeAudio ? 'إيقاف التلاوة' : 'تشغيل التلاوة الهادئة'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsDistractionFreeOpen(false);
                handleCompleteActivity();
              }}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[#D6B36A] text-[#0A0A0A] text-xs font-extrabold"
            >
              إتمام الجلسة
            </button>
          </div>
        </div>
      )}

      {/* =======================================================================
          MODAL 3: CONTENT INTEGRITY & SCHOLARLY ATTRIBUTION WORKFLOW SHEET
         ======================================================================= */}
      {isAttributionModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="توثيق المصادر ومنهجية مراجعة المحتوى الشرعي"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            dir="rtl"
            className="w-full max-w-md rounded-3xl bg-[#151515] border border-[#D6B36A]/55 p-5 space-y-4 text-right shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#D6B36A]/25 pb-3">
              <div className="flex items-center gap-2 text-[#D6B36A]">
                <FileCheck2 size={18} />
                <h3 className="text-sm font-extrabold">
                  بطاقة توثيق المصدر ونزاهة المحتوى الشرعي
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAttributionModalOpen(false)}
                className="text-[#B6B0A3] hover:text-[#F2EBDD]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#1C1A16] border border-[#D6B36A]/35 space-y-1">
                <span className="text-[11px] font-extrabold text-[#D6B36A] block">
                  ١. مصدر النص الشرعي:
                </span>
                <p className="text-[#F2EBDD] font-bold">
                  {activeNode.sacredContent.reference}
                </p>
                {activeNode.sacredContent.narrator && (
                  <p className="text-[#B6B0A3]">
                    الراوي: {activeNode.sacredContent.narrator} (
                    {activeNode.sacredContent.authenticityGrade})
                  </p>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-[#1C1A16] border border-[#D6B36A]/35 space-y-1">
                <span className="text-[11px] font-extrabold text-[#D6B36A] block">
                  ٢. مرجع التفسير والفقه المعتمد:
                </span>
                <p className="text-[#F2EBDD] font-bold">
                  {activeNode.scholarlyExplanation.sourceBook}
                </p>
                <p className="text-[#B6B0A3]">
                  تأليف / إشراف: {activeNode.scholarlyExplanation.author}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0A0A0A] border border-[#D6B36A]/25 space-y-1">
                <span className="text-[11px] font-extrabold text-[#D6B36A] block">
                  ٣. معيار الفصل الصارم والمراجعة:
                </span>
                <p className="text-[#B6B0A3] leading-relaxed">
                  {activeNode.scholarlyExplanation.reviewerNote} لا يتم توليد أو اختلاق أي آية أو حديث أو حكم فقهي، وتُفصل مقترحات التطبيق العملي في قسم مستقل تماماً.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAttributionModalOpen(false)}
              className="w-full min-h-[44px] rounded-xl bg-[#D6B36A] text-[#0A0A0A] text-xs font-extrabold"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
