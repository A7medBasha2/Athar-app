import React, { useState, useEffect } from 'react';
import { AppSettings, Coordinates, PrayerCalculationMethod } from '../types';
import { StorageService, AndroidWidgetCustomization } from '../services/storageService';
import { NotificationService } from '../services/notificationService';
import { ReminderEngine } from '../services/reminderService';
import { VERIFIED_RECITERS } from '../data/surahsData';
import {
  Settings as SettingsIcon,
  Volume2,
  Trash2,
  Check,
  BookOpen,
  Bell,
  BellRing,
  BellOff,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Download,
  Upload,
  ChevronLeft,
  Mic,
  Sparkles,
  AlarmClock,
  Square,
  Heart,
  Compass,
  Crown,
  Clock,
  LayoutGrid,
  Sliders,
  Eye
} from 'lucide-react';
import { MobilePermissionsKit } from '../components/MobilePermissionsKit';
import { PermissionsSetupWizard } from '../components/PermissionsSetupWizard';
import { NativeNotificationService, PRAYER_CHANNEL_ID } from '../services/nativeNotificationService';
import { OngoingPrayerService } from '../services/ongoingPrayerService';

const CALCULATION_METHODS: { id: PrayerCalculationMethod; name: string }[] = [
  { id: '5', name: 'الهيئة المصرية العامة للمساحة (الافتراضي)' },
  { id: '4', name: 'جامعة أم القرى - مكة المكرمة' },
  { id: '3', name: 'رابطة العالم الإسلامي' },
  { id: '1', name: 'جامعة العلوم الإسلامية بكراتشي' },
  { id: '16', name: 'الهيئة العامة للشؤون الإسلامية والأوقاف (الإمارات)' },
  { id: '2', name: 'الجمعية الإسلامية لأمريكا الشمالية (ISNA)' },
];
import { VoiceAssistant, VoiceAssistantSettings } from '../services/voiceAssistantService';
import { LiveActivityService, LiveActivitySettings } from '../services/liveActivityService';
import {
  AlarmService,
  AlarmSystemSettings,
  AlarmSoundId,
  AlarmDismissMethod,
  ISLAMIC_ALARM_SOUNDS,
} from '../services/alarmService';
import { OfflineCenterCard } from '../components/OfflineCenterCard';
import { AtharBrandLogo } from '../components/AtharBrandLogo';

interface SettingsViewProps {
  onOpenCodeInspector?: () => void;
  onOpenRemindersCenter: () => void;
  onOpenVoiceAssistant?: () => void;
  onOpenAlarmModal?: () => void;
  onLocationChange: (coords: Coordinates) => void;
}

type SettingsTabId = 'all' | 'widget' | 'adhan_notifications' | 'voice_a11y' | 'quran' | 'system';

export const SettingsView: React.FC<SettingsViewProps> = ({
  onOpenRemindersCenter,
  onOpenVoiceAssistant,
  onOpenAlarmModal,
  onLocationChange,
}) => {
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());
  const [voiceSettings, setVoiceSettings] = useState<VoiceAssistantSettings>(VoiceAssistant.getSettings());
  const [liveActivitySettings, setLiveActivitySettings] = useState<LiveActivitySettings>(
    LiveActivityService.getSettings()
  );
  const [alarmSettings, setAlarmSettings] = useState<AlarmSystemSettings>(
    AlarmService.getSystemSettings()
  );
  const [previewingSoundId, setPreviewingSoundId] = useState<AlarmSoundId | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    NotificationService.getPermissionStatus()
  );
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [delayedTestCountdown, setDelayedTestCountdown] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<SettingsTabId>('all');
  const [micStatus, setMicStatus] = useState<'granted' | 'prompt' | 'denied'>('prompt');
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);

  // Native Android Live Home Screen Widget customization state
  const [widgetCustomization, setWidgetCustomization] = useState<AndroidWidgetCustomization>(
    () => StorageService.getWidgetCustomization()
  );
  const [isOngoingNotificationEnabled, setIsOngoingNotificationEnabled] = useState<boolean>(() =>
    OngoingPrayerService.isOngoingEnabled()
  );

  useEffect(() => {
    setSettings(StorageService.getSettings());
    setAlarmSettings(AlarmService.getSystemSettings());
    setNotificationPermission(NotificationService.getPermissionStatus());
    VoiceAssistant.checkMicrophonePermission().then((s) => {
      if (s === 'granted') setMicStatus('granted');
      else if (s === 'denied') setMicStatus('denied');
    });
    const unsubPerm = NotificationService.subscribePermission((perm) => {
      setNotificationPermission(perm);
    });
    const unsubVoice = VoiceAssistant.subscribe((vs) => {
      setVoiceSettings(vs);
    });
    const unsubAlarm = AlarmService.subscribeAlarmsChange(() => {
      setAlarmSettings(AlarmService.getSystemSettings());
    });
    const handleWidgetCustomizationChanged = (e: any) => {
      if (e?.detail) setWidgetCustomization(e.detail);
    };
    window.addEventListener('athar_widget_customization_changed', handleWidgetCustomizationChanged);

    return () => {
      unsubPerm();
      unsubVoice();
      unsubAlarm();
      window.removeEventListener('athar_widget_customization_changed', handleWidgetCustomizationChanged);
      AlarmService.stopPreviewSound();
    };
  }, []);

  const handleUpdateWidgetCustomization = (partial: Partial<AndroidWidgetCustomization>) => {
    const updated = { ...widgetCustomization, ...partial };
    setWidgetCustomization(updated);
    StorageService.saveWidgetCustomization(updated);
    OngoingPrayerService.syncWidgetCustomization().catch(() => {});
    setSaveBanner('تم تحديث إعدادات ودجت الشاشة الرئيسية بنجاح ✓');
    setTimeout(() => setSaveBanner(null), 3000);
  };

  const handleForceSyncWidget = async () => {
    try {
      await OngoingPrayerService.syncWidgetCustomization();
      setSaveBanner('تم إرسال أحدث مواقيت الصلاة والورد لودجت سطح المكتب بنجاح ✓');
      setTimeout(() => setSaveBanner(null), 3500);
    } catch {
      setSaveBanner('تم حفظ التعديلات محلياً وسيتم المزامنة تلقائياً');
      setTimeout(() => setSaveBanner(null), 3000);
    }
  };

  const handleToggleOngoingNotification = async () => {
    const next = !isOngoingNotificationEnabled;
    setIsOngoingNotificationEnabled(next);
    if (next && NotificationService.getPermissionStatus() !== 'granted') {
      const perm = await NotificationService.requestPermission();
      setNotificationPermission(perm);
    }
    await OngoingPrayerService.setOngoingEnabled(next);
    setSaveBanner(
      next
        ? 'تم تفعيل إشعار أوقات الصلاة الدائم في شريط النظام وشاشة القفل بنجاح ✓'
        : 'تم إيقاف إشعار أوقات الصلاة الدائم'
    );
    setTimeout(() => setSaveBanner(null), 3000);
  };

  const handleRefreshOngoingNotification = async () => {
    if (NotificationService.getPermissionStatus() !== 'granted') {
      const perm = await NotificationService.requestPermission();
      setNotificationPermission(perm);
    }
    setIsOngoingNotificationEnabled(true);
    const refreshed = await OngoingPrayerService.forceRefreshOngoingNotification();
    if (refreshed) {
      setSaveBanner('تم تحديث إشعار الصلاة الدائم بالبيانات والعد التنازلي الفوري ✓');
    } else {
      setSaveBanner('تم تفعيل وتحديث إشعار الصلاة الدائم بنجاح ✓');
    }
    setTimeout(() => setSaveBanner(null), 3000);
  };

  const saveSettings = (updated: AppSettings, msg?: string) => {
    setSettings(updated);
    StorageService.saveSettings(updated);
    ReminderEngine.restart();
    if (msg) {
      setSaveBanner(msg);
      setTimeout(() => setSaveBanner(null), 3000);
    }
  };

  const handleRequestNotifications = async () => {
    const perm = await NotificationService.requestPermission();
    setNotificationPermission(perm);
    setSaveBanner('تم تفعيل صلاحية إشعارات النظام وشاشة القفل بنجاح ✓');
    setTimeout(() => setSaveBanner(null), 4000);
    NotificationService.notify({
      title: 'تم تفعيل إشعارات أثر بنجاح ✓',
      body: 'ستصلك مواقيت الصلاة والأذان وتذكيرات القرآن وذكر الله داخل وخارج البرنامج وحتى لو الشاشة مقفلة.',
      type: 'info'
    });
  };

  const handleTestSystemNotification = async () => {
    await NativeNotificationService.dispatchImmediateNativeNotification({
      title: 'أثر | إشعار نظام حقيقي خارج التطبيق',
      body: 'تم اختبار ظهور الإشعار في شريط التنبيهات والبانر المنبثق بنجاح ✓',
      channelId: PRAYER_CHANNEL_ID,
    });
    ReminderEngine.testDhikrReminder();
  };

  const handleTestBackgroundOutsideApp = () => {
    if (delayedTestCountdown > 0) return;
    setDelayedTestCountdown(5);
    const interval = window.setInterval(() => {
      setDelayedTestCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    window.setTimeout(() => {
      ReminderEngine.testQuranVerseReminder();
    }, 5000);
  };

  const selectedReciter = VERIFIED_RECITERS.find((r) => r.id === settings.selectedReciterId) || VERIFIED_RECITERS[0];

  const showSection = (sectionTab: SettingsTabId) => activeTab === 'all' || activeTab === sectionTab;

  return (
    <div className="athar-page-container animate-fadeIn">
      {/* Royal Brand Header with New Prestige Logo (Emblem Only) */}
      <div className="flex items-center justify-center p-3.5 rounded-2xl bg-gradient-to-r from-[#17140E] via-[#100E0A] to-[#0A0907] border border-[#C8A24A]/40 shadow-lg">
        <AtharBrandLogo size="sm" showWordmark={false} showSubtitle={false} centered={true} />
      </div>

      {/* Luxury Gold Category Filter Tabs */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-1.5 bg-[#0E0D0A] border border-[#C8A24A]/35 rounded-2xl text-[11px]">
        {[
          { id: 'all', label: 'الكل' },
          { id: 'widget', label: 'ودجت الشاشة' },
          { id: 'adhan_notifications', label: 'التنبيهات' },
          { id: 'voice_a11y', label: 'الصوت' },
          { id: 'quran', label: 'المصحف' },
          { id: 'system', label: 'الأذونات' }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTabId)}
              className={`py-2 px-2 rounded-xl font-extrabold text-center transition-all border ${
                isActive
                  ? 'bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-[#070707] border-[#F3E5AB] shadow-[0_4px_14px_rgba(200,162,74,0.35)]'
                  : 'text-[#C4B998] border-transparent hover:bg-[#171510] hover:text-white hover:border-[#C8A24A]/30'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SECTION 0: Voice Assistant & Interactive Speech System */}
      {showSection('voice_a11y') && (
        <div className="space-y-3.5">
          <div className="athar-card relative overflow-hidden space-y-3.5">
            <div className="relative z-10 flex items-center justify-between gap-2 pb-3 border-b border-[#C8A24A]/25">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2.5 rounded-xl border ${
                    voiceSettings.enabled
                      ? 'bg-[#262012] border-[#E6C66E]/60 text-[#E6C66E]'
                      : 'bg-[#161410] border-[#C8A24A]/25 text-[#9E9478]'
                  }`}
                >
                  <Mic size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2 flex-wrap">
                    <span>المساعد الصوتي ونظام النطق التفاعلي</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold border ${
                        voiceSettings.enabled
                          ? 'bg-[#C8A24A]/20 text-[#E6C66E] border-[#E6C66E]/50'
                          : 'bg-[#15130F] text-[#9E9478] border-[#C8A24A]/20'
                      }`}
                    >
                      {voiceSettings.enabled ? 'مفعّل ونشط ✓' : 'متوقف'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#C4B998] mt-0.5 leading-relaxed">
                    لا يظهر زر الميكروفون ولا يعمل النظام الصوتي إلا عند تفعيله من هنا حسب رغبتك
                  </p>
                </div>
              </div>
              {voiceSettings.enabled && onOpenVoiceAssistant && (
                <button
                  onClick={onOpenVoiceAssistant}
                  className="athar-btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5 shrink-0"
                  aria-label="تجربة المساعد الصوتي الآن"
                >
                  <Mic size={14} />
                  <span>تحدث الآن</span>
                </button>
              )}
            </div>

            <div className="relative z-10 space-y-2.5 text-xs">
              {/* Master Toggle */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                  voiceSettings.enabled
                    ? 'bg-gradient-to-r from-[#211C11] to-[#13110B] border-[#E6C66E]/55'
                    : 'bg-[#0D0C09] border-[#C8A24A]/25'
                }`}
              >
                <div>
                  <span className="text-white font-extrabold block text-xs">
                    تفعيل نظام المساعد الصوتي وإظهار زر الميكروفون المتحرك
                  </span>
                  <span className="text-[11px] text-[#C4B998] block mt-0.5 leading-relaxed">
                    {voiceSettings.enabled
                      ? 'النظام الصوتي نشط الآن، ويمكنك تحريك علامة الميكروفون لأي مكان في الشاشة وسيتم حفظ مكانها تلقائياً.'
                      : 'النظام الصوتي متوقف حالياً وعلامة الميكروفون مخفية تماماً من الشاشة.'}
                  </span>
                </div>
                <button
                  onClick={async () => {
                    const nextEnabled = !voiceSettings.enabled;
                    if (nextEnabled) {
                      const ok = await VoiceAssistant.requestMicrophonePermission();
                      if (ok) setMicStatus('granted');
                    }
                    const updated = { ...voiceSettings, enabled: nextEnabled };
                    setVoiceSettings(updated);
                    VoiceAssistant.saveSettings(updated);
                    setSaveBanner(
                      nextEnabled
                        ? 'تم تفعيل المساعد الصوتي وإظهار زر الميكروفون المتحرك ✓'
                        : 'تم إيقاف المساعد الصوتي وإخفاء زر الميكروفون من الشاشة'
                    );
                    setTimeout(() => setSaveBanner(null), 3000);
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border ${
                    voiceSettings.enabled
                      ? 'bg-[#C8A24A] border-[#F3E5AB]'
                      : 'bg-[#1B1812] border-[#C8A24A]/35'
                  }`}
                  aria-label="تفعيل أو إيقاف نظام المساعد الصوتي وإظهار زر الميكروفون"
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                      voiceSettings.enabled ? '-translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {voiceSettings.enabled && (
                <div className="space-y-2.5 pt-1 animate-fadeIn">
                  {/* Option 1: Auto Speak Responses */}
                  <div className="p-3 bg-[#0D0C09] border border-[#C8A24A]/25 rounded-2xl flex items-center justify-between gap-2">
                    <div>
                      <span className="text-white font-bold block">نطق الردود صوتياً (Text-to-Speech)</span>
                      <span className="text-[10px] text-[#C4B998] block mt-0.5">
                        يقوم التطبيق بنطق نتائج الصلاة، الأذكار، والسور بصوت عربي واضح ومسموع
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const updated = { ...voiceSettings, autoSpeak: !voiceSettings.autoSpeak };
                        setVoiceSettings(updated);
                        VoiceAssistant.saveSettings(updated);
                      }}
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border ${
                        voiceSettings.autoSpeak
                          ? 'bg-[#C8A24A] border-[#F3E5AB]'
                          : 'bg-[#1B1812] border-[#C8A24A]/35'
                      }`}
                      aria-label="تبديل نطق الردود صوتياً"
                    >
                      <div
                        className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                          voiceSettings.autoSpeak ? '-translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Option 2: Auto-Listen on App Open */}
                  <div className="p-3 bg-[#0D0C09] border border-[#C8A24A]/25 rounded-2xl flex items-center justify-between gap-2">
                    <div>
                      <span className="text-white font-bold block">الاستماع التلقائي عند فتح التطبيق</span>
                      <span className="text-[10px] text-[#C4B998] block mt-0.5">
                        يفتح المساعد الصوتي تلقائياً بمجرد فتح التطبيق (مفيد لمكفوفي البصر وذوي الهمم)
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const updated = {
                          ...voiceSettings,
                          autoListenOnAppOpen: !voiceSettings.autoListenOnAppOpen
                        };
                        setVoiceSettings(updated);
                        VoiceAssistant.saveSettings(updated);
                      }}
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border ${
                        voiceSettings.autoListenOnAppOpen
                          ? 'bg-[#C8A24A] border-[#F3E5AB]'
                          : 'bg-[#1B1812] border-[#C8A24A]/35'
                      }`}
                      aria-label="تبديل الاستماع التلقائي عند فتح التطبيق"
                    >
                      <div
                        className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                          voiceSettings.autoListenOnAppOpen ? '-translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Option 3: Sound Chimes (Earcons) */}
                  <div className="p-3 bg-[#0D0C09] border border-[#C8A24A]/25 rounded-2xl flex items-center justify-between gap-2">
                    <div>
                      <span className="text-white font-bold block">الإشارات الصوتية النغمية (Earcons)</span>
                      <span className="text-[10px] text-[#C4B998] block mt-0.5">
                        نغمات مسموعة تؤكد لحظة بدء وانتهاء الاستماع وتنفيذ الأمر بنجاح
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const updated = { ...voiceSettings, soundChimes: !voiceSettings.soundChimes };
                        setVoiceSettings(updated);
                        VoiceAssistant.saveSettings(updated);
                      }}
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border ${
                        voiceSettings.soundChimes
                          ? 'bg-[#C8A24A] border-[#F3E5AB]'
                          : 'bg-[#1B1812] border-[#C8A24A]/35'
                      }`}
                      aria-label="تبديل الإشارات الصوتية النغمية"
                    >
                      <div
                        className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                          voiceSettings.soundChimes ? '-translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Option 4: Speech Rate Selector */}
                  <div className="p-3 bg-[#0D0C09] border border-[#C8A24A]/25 rounded-2xl flex items-center justify-between gap-2">
                    <div>
                      <span className="text-white font-bold block">سرعة النطق التفاعلي</span>
                      <span className="text-[10px] text-[#C4B998] block mt-0.5">
                        السرعة الحالية: {voiceSettings.speechRate}x
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {[0.85, 1.0, 1.15].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => {
                            const updated = { ...voiceSettings, speechRate: rate };
                            setVoiceSettings(updated);
                            VoiceAssistant.saveSettings(updated);
                          }}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold transition-all border ${
                            voiceSettings.speechRate === rate
                              ? 'bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-[#070707] border-[#F3E5AB] shadow'
                              : 'bg-[#171510] text-[#C4B998] border-[#C8A24A]/30 hover:text-white'
                          }`}
                        >
                          {rate === 0.85 ? 'هادئ' : rate === 1.0 ? 'طبيعي' : 'سريع'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Option 5: Floating Microphone Button Position & Reset */}
                  <div className="p-3 bg-[#0D0C09] border border-[#C8A24A]/25 rounded-2xl flex items-center justify-between gap-2">
                    <div>
                      <span className="text-white font-bold block">موضع علامة الميكروفون العائمة</span>
                      <span className="text-[10px] text-[#C4B998] block mt-0.5">
                        اسحب زر الميكروفون لأي مكان تريده على الشاشة وسيبقى محفوظاً تلقائياً
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const updated = { ...voiceSettings, floatingButtonPosition: null };
                        setVoiceSettings(updated);
                        VoiceAssistant.saveSettings(updated);
                        setSaveBanner('تمت استعادة الموضع الافتراضي لزر الميكروفون ✓');
                        setTimeout(() => setSaveBanner(null), 2500);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#18150E] hover:bg-[#241F14] text-[#E6C66E] border border-[#C8A24A]/45 text-[10px] font-extrabold shrink-0 transition-colors"
                    >
                      إعادة للموضع الافتراضي
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION: Native Android Home Screen Live Widget Settings */}
      {showSection('widget') && (
        <div className="space-y-4">
          <div className="athar-card relative overflow-hidden space-y-4">
            {/* Header */}
            <div className="relative z-10 flex items-center justify-between pb-3 border-b border-[#C8A24A]/25 gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#2D2312] to-[#16120A] border border-[#E6C66E]/60 text-[#E6C66E] shadow-md">
                  <LayoutGrid size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <span>ودجت الشاشة الرئيسية الحية (Home Screen Widget)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-[#2A2111] text-[#E6C66E] border border-[#C8A24A]/40">
                      أندرويد أصيل
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#A69977] mt-0.5">
                    تخصيص كامل لمظهر ومواقيت وبطاقات ودجت تطبيق أثر على سطح مكتب هاتفك
                  </p>
                </div>
              </div>

            </div>

            {/* Live Interactive Preview Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#E6C66E]">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={13} />
                  <span>معاينة حية لشكل الودجت على سطح المكتب:</span>
                </span>
                <span className="text-[10px] text-[#A69977]">يتحدث تلقائياً مع خياراتك</span>
              </div>

              <div
                className={`p-4 rounded-3xl border transition-all ${
                  widgetCustomization.bgOpacity === 'solid'
                    ? 'bg-[#070605] border-[#D4AF37]/50'
                    : widgetCustomization.bgOpacity === 'glass_85'
                    ? 'bg-[#0E0B07]/85 backdrop-blur-md border-[#D4AF37]/40 shadow-xl'
                    : 'bg-[#141009]/65 backdrop-blur-lg border-[#D4AF37]/35 shadow-2xl'
                }`}
                style={{
                  boxShadow:
                    widgetCustomization.themeAccent === 'gold_bright'
                      ? '0 0 25px rgba(230,198,110,0.18)'
                      : widgetCustomization.themeAccent === 'gold_amber'
                      ? '0 0 25px rgba(245,158,11,0.18)'
                      : '0 0 25px rgba(212,175,55,0.18)',
                }}
              >
                {widgetCustomization.style === 'compact' ? (
                  /* Compact Widget Preview */
                  <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#120F0A] border border-[#C8A24A]/30">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-[#2A2111] border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] font-black text-xs shrink-0">
                        أَثَرُ
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] text-[#A69977] truncate">
                          {settings.location.city || 'القاهرة'} · مواقيت الصلاة
                        </div>
                        <div
                          className="text-xs sm:text-sm font-black truncate"
                          style={{
                            color:
                              widgetCustomization.themeAccent === 'gold_bright'
                                ? '#FFF2C2'
                                : widgetCustomization.themeAccent === 'gold_amber'
                                ? '#FCD34D'
                                : '#E6C66E',
                          }}
                        >
                          صلاة الفجر
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {widgetCustomization.showCountdown && (
                        <div className="px-2.5 py-1 rounded-full bg-[#1C160C] border border-[#D4AF37]/40 text-[10px] font-bold text-[#E6C66E]">
                          متبقي: 01:25
                        </div>
                      )}
                      <div className="text-sm font-black text-white px-2 py-1 rounded-lg bg-[#18130B]">
                        05:15
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Full Royal Card Widget Preview */
                  <div className="space-y-3">
                    {/* Top Bar */}
                    <div className="flex items-center justify-between pb-2 border-b border-[#2A2315]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#2A2111] border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] text-[10px] font-black">
                          أَثَرُ
                        </div>
                        <span className="text-[11px] font-bold text-[#C4B998]">
                          أَثَرُ | مواقيت الصلاة
                        </span>
                      </div>
                      {widgetCustomization.showCountdown && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#20180D] border border-[#D4AF37]/40 text-[10px] font-bold text-[#FFF2C2]">
                          متبقي: 01:25
                        </span>
                      )}
                    </div>

                    {/* Next Prayer Highlight Card */}
                    <div
                      className="p-3 rounded-2xl flex items-center justify-between border"
                      style={{
                        background: 'linear-gradient(135deg, #1C160C 0%, #110E08 100%)',
                        borderColor:
                          widgetCustomization.themeAccent === 'gold_bright'
                            ? 'rgba(230,198,110,0.6)'
                            : widgetCustomization.themeAccent === 'gold_amber'
                            ? 'rgba(245,158,11,0.6)'
                            : 'rgba(212,175,55,0.6)',
                      }}
                    >
                      <div>
                        <div className="text-[10px] text-[#A69977]">الصلاة القادمة بإذن الله</div>
                        <div className="text-sm sm:text-base font-black text-white">
                          صلاة الفجر
                        </div>
                      </div>
                      <div
                        className="text-base sm:text-lg font-black font-mono"
                        style={{
                          color:
                            widgetCustomization.themeAccent === 'gold_bright'
                              ? '#FFF2C2'
                              : widgetCustomization.themeAccent === 'gold_amber'
                              ? '#FDE68A'
                              : '#E6C66E',
                        }}
                      >
                        05:15
                      </div>
                    </div>

                    {/* Daily Ayah / Dhikr Card */}
                    {widgetCustomization.showDhikr && (
                      <div className="p-2.5 rounded-xl bg-[#130F0A] border border-[#C8A24A]/30 flex items-center justify-between gap-2">
                        <div className="text-right min-w-0 flex-1">
                          <p className="text-[11px] text-[#FFF9E6] font-arabic truncate">
                            ﴿أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ﴾
                          </p>
                          <span className="text-[9px] text-[#A69977]">سورة الرعد · الآية ٢٨</span>
                        </div>
                        <div className="w-5 h-5 rounded-md bg-[#241B0E] border border-[#C8A24A]/40 flex items-center justify-center text-[#E6C66E] text-[10px] shrink-0">
                          ↻
                        </div>
                      </div>
                    )}

                    {/* 5 Prayer Times Grid */}
                    <div className="grid grid-cols-5 gap-1.5 pt-1 text-center">
                      {[
                        { key: 'showFajr', label: 'الفجر', time: '05:15' },
                        { key: 'showDhuhr', label: 'الظهر', time: '12:00' },
                        { key: 'showAsr', label: 'العصر', time: '15:15' },
                        { key: 'showMaghrib', label: 'المغرب', time: '17:50' },
                        { key: 'showIsha', label: 'العشاء', time: '19:20' },
                      ].map((p) => {
                        const isVisible = widgetCustomization[p.key as keyof AndroidWidgetCustomization];
                        if (!isVisible) return null;
                        return (
                          <div
                            key={p.key}
                            className="p-1.5 rounded-xl bg-[#14110B] border border-[#C8A24A]/25 space-y-0.5"
                          >
                            <div className="text-[10px] text-[#A69977]">{p.label}</div>
                            <div className="text-[11px] font-bold text-[#E6C66E]">{p.time}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 1. Choosing Widget Display Styles (Compact vs Full Royal Card) */}
            <div className="space-y-2.5 pt-2">
              <label className="text-xs font-extrabold text-[#F3E5AB] flex items-center gap-1.5">
                <Sliders size={14} className="text-[#E6C66E]" />
                <span>نمط وحجم الودجت المفضل (Display Style):</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    id: 'royal_card',
                    title: 'البطاقة الملكية الكاملة (Full Royal Card)',
                    desc: 'مقاس 4×2 أو 4×3 - تعرض الصلاة القادمة والمواقيت الخمسة مع الورد القرآني والعد التنازلي.',
                    badge: 'موصى به',
                  },
                  {
                    id: 'compact',
                    title: 'الشريط الملكي المدمج (Compact Bar)',
                    desc: 'مقاس 4×1 - شريط أفقي ناعم يبرز الصلاة القادمة والوقت والعد التنازلي دون أن يشغل مساحة.',
                    badge: 'مدمج وناعم',
                  },
                ].map((st) => {
                  const isSelected = widgetCustomization.style === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleUpdateWidgetCustomization({ style: st.id as any })}
                      className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#221A0E] border-[#E6C66E] shadow-[0_0_20px_rgba(200,162,74,0.22)]'
                          : 'bg-[#12100A] border-[#C8A24A]/30 hover:border-[#C8A24A]/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-white">{st.title}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            isSelected
                              ? 'bg-[#E6C66E] text-[#070605] border-[#FFF2C2]'
                              : 'bg-[#1B1710] text-[#A69977] border-[#C8A24A]/30'
                          }`}
                        >
                          {st.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#A69977] leading-relaxed">{st.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Theme Accent & Background Opacity Choices */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Theme Accent */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-[#F3E5AB]">
                  نمط درجات الذهب (Theme Accent):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'gold_royal', label: 'ذهب ملكي', color: '#D4AF37' },
                    { id: 'gold_bright', label: 'ذهب متألق', color: '#E6C66E' },
                    { id: 'gold_amber', label: 'عنبر دافئ', color: '#F59E0B' },
                  ].map((acc) => {
                    const isSelected = widgetCustomization.themeAccent === acc.id;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => handleUpdateWidgetCustomization({ themeAccent: acc.id as any })}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#241B0E] border-[#E6C66E] shadow-md'
                            : 'bg-[#12100B] border-[#C8A24A]/30 hover:border-[#C8A24A]/60'
                        }`}
                      >
                        <div
                          className="w-4 h-4 rounded-full mx-auto mb-1.5 shadow-sm"
                          style={{ backgroundColor: acc.color }}
                        />
                        <span className="text-[10px] font-bold text-[#F3E5AB] block truncate">
                          {acc.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Background Opacity */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-[#F3E5AB]">
                  شفافية خلفية الودجت (Background Opacity):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'solid', label: 'معتم 100%', sub: 'داكن ملكي' },
                    { id: 'glass_85', label: 'زجاجي 85%', sub: 'توازن مثالي' },
                    { id: 'glass_65', label: 'شفاف 65%', sub: 'Glassmorphic' },
                  ].map((op) => {
                    const isSelected = widgetCustomization.bgOpacity === op.id;
                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => handleUpdateWidgetCustomization({ bgOpacity: op.id as any })}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#241B0E] border-[#E6C66E] shadow-md'
                            : 'bg-[#12100B] border-[#C8A24A]/30 hover:border-[#C8A24A]/60'
                        }`}
                      >
                        <span className="text-[10px] font-bold text-[#F3E5AB] block truncate">
                          {op.label}
                        </span>
                        <span className="text-[9px] text-[#A69977] block mt-0.5 truncate">
                          {op.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. Toggling Specific Elements (Dhikr & Countdown) */}
            <div className="space-y-2.5 pt-2">
              <label className="text-xs font-extrabold text-[#F3E5AB]">
                تفعيل وإظهار عناصر الودجت:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-3 rounded-2xl bg-[#14110A] border border-[#C8A24A]/30 flex items-center justify-between">
                  <div className="text-right">
                    <h5 className="text-xs font-bold text-white">الورد القرآني والذكر اليومي</h5>
                    <p className="text-[10px] text-[#A69977]">
                      عرض آية أو ذكر يومي مع إمكانية التبديل بنقرة واحدة
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateWidgetCustomization({ showDhikr: !widgetCustomization.showDhikr })
                    }
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      widgetCustomization.showDhikr ? 'bg-[#E6C66E]' : 'bg-[#2E281E]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-[#070605] shadow-md transition-transform absolute top-0.5 ${
                        widgetCustomization.showDhikr ? 'right-0.5' : 'right-5.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-[#14110A] border border-[#C8A24A]/30 flex items-center justify-between">
                  <div className="text-right">
                    <h5 className="text-xs font-bold text-white">شارة العد التنازلي الحي</h5>
                    <p className="text-[10px] text-[#A69977]">
                      إظهار الوقت المتبقي بالألوان الملكية على الصلاة القادمة
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateWidgetCustomization({
                        showCountdown: !widgetCustomization.showCountdown,
                      })
                    }
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      widgetCustomization.showCountdown ? 'bg-[#E6C66E]' : 'bg-[#2E281E]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-[#070605] shadow-md transition-transform absolute top-0.5 ${
                        widgetCustomization.showCountdown ? 'right-0.5' : 'right-5.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Toggling Specific Prayer Rows */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-extrabold text-[#F3E5AB]">
                تخصيص ظهور صفوف الصلوات الخمس في الودجت:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { key: 'showFajr', label: 'الفجر', defaultTime: '05:15' },
                  { key: 'showDhuhr', label: 'الظهر', defaultTime: '12:00' },
                  { key: 'showAsr', label: 'العصر', defaultTime: '15:15' },
                  { key: 'showMaghrib', label: 'المغرب', defaultTime: '17:50' },
                  { key: 'showIsha', label: 'العشاء', defaultTime: '19:20' },
                ].map((pr) => {
                  const isChecked = widgetCustomization[pr.key as keyof AndroidWidgetCustomization];
                  return (
                    <button
                      key={pr.key}
                      type="button"
                      onClick={() =>
                        handleUpdateWidgetCustomization({ [pr.key]: !isChecked } as any)
                      }
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-[#241C10] border-[#E6C66E] shadow-sm'
                          : 'bg-[#100E0A] border-[#C8A24A]/20 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">{pr.label}</span>
                        <span
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px] ${
                            isChecked
                              ? 'bg-[#E6C66E] text-[#070605] border-[#FFF2C2]'
                              : 'bg-transparent border-[#A69977]'
                          }`}
                        >
                          {isChecked && '✓'}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#C4B998]">{pr.defaultTime}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions & How to Add Widget on Android */}
            <div className="pt-3 border-t border-[#C8A24A]/25 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleForceSyncWidget}
                className="w-full sm:w-auto min-h-[44px] py-2.5 px-5 rounded-2xl bg-gradient-to-r from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] text-[#070605] font-extrabold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles size={15} />
                <span>تحديث الودجت على الشاشة الآن</span>
              </button>

              <div className="text-[11px] text-[#A69977] text-center sm:text-right">
                💡 <span className="font-bold text-[#E6C66E]">كيفية الإضافة:</span> اضغط مطولاً على أي مساحة فارغة بشاشة هاتفك ← اختر «الأدوات Widgets» ← ابحث عن تطبيق «أَثَرُ» واسحبه لسطح المكتب.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: Persistent Prayer Notification & Daily Reminders Center */}
      {showSection('adhan_notifications') && (
        <div className="space-y-3.5">
          {/* Card: Persistent Ongoing Prayer Notification (إشعار أوقات الصلاة الدائم) */}
          <div className="athar-card relative overflow-hidden space-y-3.5 border border-[#C8A24A]/50 bg-gradient-to-b from-[#18130B] via-[#0E0C08] to-[#070605] shadow-[0_10px_30px_rgba(0,0,0,0.85)]">
            <div className="relative z-10 flex items-center justify-between pb-3 border-b border-[#C8A24A]/25 gap-2">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2.5 rounded-xl border transition-colors ${
                    isOngoingNotificationEnabled
                      ? 'bg-[#262012] border-[#E6C66E]/60 text-[#E6C66E]'
                      : 'bg-[#14120D] border-[#C8A24A]/25 text-[#8A8068]'
                  }`}
                >
                  <BellRing size={19} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-extrabold text-white">
                      إشعار أوقات الصلاة الدائم
                    </h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold border ${
                        isOngoingNotificationEnabled
                          ? 'bg-[#C8A24A]/20 text-[#FFF2C2] border-[#E6C66E]/50 shadow-[0_0_8px_rgba(230,198,110,0.3)]'
                          : 'bg-[#15130F] text-[#8A8068] border-[#C8A24A]/20'
                      }`}
                    >
                      {isOngoingNotificationEnabled ? 'مثبت ونشط بالخلفية ✓' : 'متوقف'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#C4B998] mt-0.5 leading-relaxed">
                    شريط مستمر في لوحة الإشعارات وشاشة القفل (Foreground Service) لا يُغلقه النظام تلقائياً
                  </p>
                </div>
              </div>

              {/* Clean Master Toggle Switch */}
              <button
                type="button"
                onClick={handleToggleOngoingNotification}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border cursor-pointer ${
                  isOngoingNotificationEnabled
                    ? 'bg-[#C8A24A] border-[#F3E5AB]'
                    : 'bg-[#1B1812] border-[#C8A24A]/35'
                }`}
                aria-label="تبديل إشعار أوقات الصلاة الدائم"
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                    isOngoingNotificationEnabled ? '-translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Interactive Luxury Notification Shade Preview Box */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-xs text-[#E6C66E] font-bold">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={13} />
                  <span>معاينة حية لشكل الإشعار المثبت في شاشة القفل ودرج التنبيهات:</span>
                </span>
                <span className="text-[10px] text-[#A69977]">
                  {isOngoingNotificationEnabled ? 'شغال في شريط الحالة' : 'عينة توضيحية'}
                </span>
              </div>

              {/* Notification Shade Card Mockup */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#1A140B] via-[#100D08] to-[#0A0805] border border-[#E6C66E]/40 shadow-xl space-y-3">
                {/* Collapsed Top Row: Quick Action Bell (Left), Info (Center), Logo (Right) */}
                <div className="flex items-center justify-between gap-3">
                  {/* Left Bell Toggle Button Mockup */}
                  <div
                    className="w-9 h-9 rounded-xl bg-[#261E10] border border-[#E6C66E]/50 flex items-center justify-center text-[#E6C66E] shrink-0 shadow-sm"
                    title="زر الجرس السريع لكتم أو تفعيل صوت الأذان للصلاة القادمة"
                  >
                    <Bell size={16} />
                  </div>

                  {/* Center Content */}
                  <div className="flex-1 text-right min-w-0">
                    <div className="flex items-center gap-2 justify-start">
                      <span className="text-xs font-black text-[#FFF2C2]">
                        الصلاة القادمة: صلاة الفجر
                      </span>
                      <span className="text-xs font-black text-[#E6C66E] font-mono">
                        05:15
                      </span>
                    </div>
                    <div className="text-[10px] text-[#C4B998] mt-0.5 flex items-center gap-2">
                      <span className="text-[#FFF2C2] font-bold">متبقي: 01:25</span>
                      <span>·</span>
                      <span>الأذان مفعل 🔔</span>
                    </div>
                  </div>

                  {/* Right Royal Logo in Frame */}
                  <div className="w-10 h-10 rounded-xl bg-[#241B0E] border border-[#D4AF37]/60 flex items-center justify-center shrink-0 p-1">
                    <AtharBrandLogo size="xs" showWordmark={false} showSubtitle={false} centered={true} />
                  </div>
                </div>

                {/* Expanded 5-Prayer Full Schedule Row */}
                <div className="pt-2.5 border-t border-[#C8A24A]/25 grid grid-cols-5 gap-1 text-center">
                  {[
                    { name: 'الفجر', time: '05:15', isNext: true },
                    { name: 'الظهر', time: '12:00', isNext: false },
                    { name: 'العصر', time: '15:15', isNext: false },
                    { name: 'المغرب', time: '17:50', isNext: false },
                    { name: 'العشاء', time: '19:20', isNext: false },
                  ].map((p, i) => (
                    <div
                      key={i}
                      className={`py-1.5 px-1 rounded-xl border ${
                        p.isNext
                          ? 'bg-[#2A2010] border-[#E6C66E] text-[#FFF2C2] shadow-sm'
                          : 'bg-[#120F0A] border-[#C8A24A]/20 text-[#A69977]'
                      }`}
                    >
                      <div className="text-[9.5px] font-bold">{p.name}</div>
                      <div
                        className={`text-[10px] font-extrabold mt-0.5 font-mono ${
                          p.isNext ? 'text-[#E6C66E]' : 'text-[#C4B998]'
                        }`}
                      >
                        {p.time}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Hijri & Features Pill Row */}
                <div className="flex items-center justify-between pt-1 text-[10px] text-[#A69977]">
                  <span>أَثَرُ · مواقيت الصلاة والعد التنازلي</span>
                  <div className="flex items-center gap-1.5 text-[9.5px] text-[#E6C66E]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    <span>تحديث دقيق بالدقيقة</span>
                  </div>
                </div>
              </div>

              {/* 4 Architectural Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[10px]">
                <div className="p-2 rounded-xl bg-[#120F0B] border border-[#C8A24A]/20 text-center space-y-0.5">
                  <div className="text-[#E6C66E] font-bold">أيقونة «أ» نقية</div>
                  <div className="text-[#A69977]">في شريط الحالة العلوي</div>
                </div>
                <div className="p-2 rounded-xl bg-[#120F0B] border border-[#C8A24A]/20 text-center space-y-0.5">
                  <div className="text-[#E6C66E] font-bold">شعار «أَثَرُ» الذهبي</div>
                  <div className="text-[#A69977]">على الجانب الأيمن</div>
                </div>
                <div className="p-2 rounded-xl bg-[#120F0B] border border-[#C8A24A]/20 text-center space-y-0.5">
                  <div className="text-[#E6C66E] font-bold">زر الجرس السريع</div>
                  <div className="text-[#A69977]">لكتم وتفعيل الأذان</div>
                </div>
                <div className="p-2 rounded-xl bg-[#120F0B] border border-[#C8A24A]/20 text-center space-y-0.5">
                  <div className="text-[#E6C66E] font-bold">توفير البطارية</div>
                  <div className="text-[#A69977]">بدون أي استهلاك طاقة</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleRefreshOngoingNotification}
                  disabled={!isOngoingNotificationEnabled}
                  className={`w-full sm:w-auto min-h-[40px] py-2 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isOngoingNotificationEnabled
                      ? 'bg-gradient-to-r from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] text-[#070605] shadow-md hover:brightness-110 active:scale-95'
                      : 'bg-[#18140D] text-[#7A6F54] border border-[#C8A24A]/20 cursor-not-allowed opacity-50'
                  }`}
                >
                  <Sparkles size={14} />
                  <span>تحديث الإشعار الدائم الآن</span>
                </button>

                <div className="text-[10px] text-[#A69977] text-center sm:text-right">
                  {isOngoingNotificationEnabled
                    ? '✓ الإشعار مثبت الآن في لوحة الإشعارات وشاشة القفل بهاتفك'
                    : 'قم بتفعيل المفتاح لتثبيت شريط الصلوات في هاتفك'}
                </div>
              </div>
            </div>
          </div>

          <div className="athar-card relative overflow-hidden space-y-3.5">
            <div className="relative z-10 flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#262012] border border-[#C8A24A]/50 text-[#E6C66E]">
                  <Bell size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">تنبيهات ونفحات اليوم المبارك</h3>
                  <p className="text-[11px] text-[#C4B998] mt-0.5">
                    جدولة مواعيد الأذكار وتلاوة الآيات والورد اليومي
                  </p>
                </div>
              </div>

              <button
                onClick={onOpenRemindersCenter}
                className="px-3 py-1.5 bg-[#241E11] hover:bg-[#302716] text-[#E6C66E] border border-[#C8A24A]/50 rounded-xl text-[11px] font-extrabold flex items-center gap-1 transition-all shrink-0"
                title="فتح مركز التذكيرات لتعديل الساعات والدقائق"
              >
                <span>ضبط المواعيد</span>
                <ChevronLeft size={13} />
              </button>
            </div>

            <div className="relative z-10 space-y-3.5 text-xs">
              {/* 1. Quran Verses Notifications (تنبيهات آيات القرآن الكريم) */}
              <div className="p-3.5 bg-gradient-to-br from-[#052116]/90 via-[#0A2E20]/90 to-[#04160E]/90 border border-[#10B981]/40 hover:border-[#10B981]/65 rounded-2xl space-y-3 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#093524] border border-[#10B981]/50 text-[#A7F3D0] flex items-center justify-center shrink-0 shadow-sm">
                      <BookOpen size={17} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-extrabold text-xs">تنبيهات آيات القرآن الكريم</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#062417] border border-[#10B981]/50 text-[#A7F3D0] text-[9.5px] font-bold">
                          المصحف المرتل
                        </span>
                      </div>
                      <span className="text-[10px] text-[#A7F3D0]/80 block mt-0.5 truncate">
                        {settings.quranVerseReminder.enabled
                          ? `مفعّل (${settings.quranVerseReminder.startTime} - ${settings.quranVerseReminder.endTime}) · بصوت ${selectedReciter.nameArabic}`
                          : 'متوقف حالياً'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      saveSettings(
                        {
                          ...settings,
                          quranVerseReminder: {
                            ...settings.quranVerseReminder,
                            enabled: !settings.quranVerseReminder.enabled,
                          },
                        },
                        !settings.quranVerseReminder.enabled
                          ? 'تم تفعيل تنبيهات آيات القرآن الكريم ✓'
                          : 'تم إيقاف تنبيهات آيات القرآن الكريم'
                      )
                    }
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border ${
                      settings.quranVerseReminder.enabled
                        ? 'bg-[#10B981] border-[#A7F3D0]'
                        : 'bg-[#1B1812] border-[#C8A24A]/35'
                    }`}
                    aria-label="تبديل تفعيل تنبيهات آيات القرآن الكريم"
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                        settings.quranVerseReminder.enabled ? '-translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Dual Test Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[#10B981]/25">
                  <button
                    onClick={() => ReminderEngine.testInAppReminder('quran')}
                    className="py-2 px-3 rounded-xl bg-[#092B1D]/80 hover:bg-[#0E3D29] border border-[#10B981]/50 text-[#A7F3D0] hover:text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                    title="معاينة ظهور التنبيه والتلاوة داخل التطبيق"
                  >
                    <Eye size={13} className="text-[#34D399]" />
                    <span>تجربة التذكير الداخلي</span>
                  </button>

                  <button
                    onClick={() => ReminderEngine.testRoyalAtharReminder('quran')}
                    className="py-2 px-3 rounded-xl bg-gradient-to-r from-[#E6C66E] via-[#F3E5AB] to-[#B88A2D] text-[#080705] font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow-[0_2px_12px_rgba(230,198,110,0.3)] hover:brightness-105 active:scale-95 transition-all"
                    title="تشغيل إشعار الأثر الملكي خارج التطبيق وعلى قفل الشاشة بكافة تفاصيله"
                  >
                    <Crown size={13} className="text-[#080705]" />
                    <span>تجربة تنبيه الأثر الملكي</span>
                  </button>
                </div>
              </div>

              {/* 2. Remembrance & Tasbih Notifications (تنبيهات ذكر الله والتسبيح) */}
              <div className="p-3.5 bg-gradient-to-br from-[#061B36]/90 via-[#0B2A52]/90 to-[#041224]/90 border border-[#38BDF8]/40 hover:border-[#38BDF8]/65 rounded-2xl space-y-3 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#0F3563] border border-[#38BDF8]/50 text-[#BAE6FD] flex items-center justify-center shrink-0 shadow-sm">
                      <Sparkles size={17} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-extrabold text-xs">تنبيهات ذكر الله والتسبيح</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#091D3E] border border-[#38BDF8]/50 text-[#BAE6FD] text-[9.5px] font-bold">
                          أذكار وطمأنينة
                        </span>
                      </div>
                      <span className="text-[10px] text-[#BAE6FD]/80 block mt-0.5 truncate">
                        {settings.dhikrReminder.enabled
                          ? `مفعّل (${settings.dhikrReminder.frequency === '1h' ? 'كل ساعة' : 'فترات دورية'}) · تذكير صوتي بالذكر`
                          : 'متوقف حالياً'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      saveSettings(
                        {
                          ...settings,
                          dhikrReminder: {
                            ...settings.dhikrReminder,
                            enabled: !settings.dhikrReminder.enabled,
                          },
                        },
                        !settings.dhikrReminder.enabled
                          ? 'تم تفعيل تنبيهات ذكر الله والتسبيح ✓'
                          : 'تم إيقاف تنبيهات ذكر الله والتسبيح'
                      )
                    }
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border ${
                      settings.dhikrReminder.enabled
                        ? 'bg-[#38BDF8] border-[#BAE6FD]'
                        : 'bg-[#1B1812] border-[#C8A24A]/35'
                    }`}
                    aria-label="تبديل تفعيل تنبيهات ذكر الله والتسبيح"
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                        settings.dhikrReminder.enabled ? '-translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Dual Test Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[#38BDF8]/25">
                  <button
                    onClick={() => ReminderEngine.testInAppReminder('dhikr')}
                    className="py-2 px-3 rounded-xl bg-[#0A2647]/80 hover:bg-[#0E3663] border border-[#38BDF8]/50 text-[#BAE6FD] hover:text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                    title="معاينة ظهور تنبيه الذكر داخل التطبيق"
                  >
                    <Eye size={13} className="text-[#38BDF8]" />
                    <span>تجربة التذكير الداخلي</span>
                  </button>

                  <button
                    onClick={() => ReminderEngine.testRoyalAtharReminder('dhikr')}
                    className="py-2 px-3 rounded-xl bg-gradient-to-r from-[#E6C66E] via-[#F3E5AB] to-[#B88A2D] text-[#080705] font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow-[0_2px_12px_rgba(230,198,110,0.3)] hover:brightness-105 active:scale-95 transition-all"
                    title="تشغيل إشعار ذكر الله الملكي خارج التطبيق وعلى قفل الشاشة بكافة تفاصيله"
                  >
                    <Crown size={13} className="text-[#080705]" />
                    <span>تجربة تنبيه الأثر الملكي</span>
                  </button>
                </div>
              </div>

              {/* 3. Daily Wird Notifications (تنبيهات الورد اليومي) */}
              <div className="p-3.5 bg-gradient-to-br from-[#261506]/90 via-[#3A1F08]/90 to-[#180D03]/90 border border-[#F59E0B]/40 hover:border-[#F59E0B]/65 rounded-2xl space-y-3 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#452408] border border-[#F59E0B]/50 text-[#FDE68A] flex items-center justify-center shrink-0 shadow-sm">
                      <Clock size={17} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-extrabold text-xs">تنبيهات الورد اليومي</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#2A1706] border border-[#F59E0B]/50 text-[#FDE68A] text-[9.5px] font-bold">
                          ورد التلاوة
                        </span>
                      </div>
                      <span className="text-[10px] text-[#FDE68A]/80 block mt-0.5 truncate">
                        {settings.dailyWirdReminder.enabled
                          ? `مفعّل (يبدأ ${settings.dailyWirdReminder.startTime}) · الهدف اليومي: ${settings.dailyWirdConfig?.targetCount || 1} سورة`
                          : 'متوقف حالياً'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      saveSettings(
                        {
                          ...settings,
                          dailyWirdReminder: {
                            ...settings.dailyWirdReminder,
                            enabled: !settings.dailyWirdReminder.enabled,
                          },
                        },
                        !settings.dailyWirdReminder.enabled
                          ? 'تم تفعيل تنبيهات الورد اليومي ✓'
                          : 'تم إيقاف تنبيهات الورد اليومي'
                      )
                    }
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border ${
                      settings.dailyWirdReminder.enabled
                        ? 'bg-[#F59E0B] border-[#FDE68A]'
                        : 'bg-[#1B1812] border-[#C8A24A]/35'
                    }`}
                    aria-label="تبديل تفعيل تنبيهات الورد اليومي"
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                        settings.dailyWirdReminder.enabled ? '-translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Dual Test Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[#F59E0B]/25">
                  <button
                    onClick={() => ReminderEngine.testInAppReminder('wird')}
                    className="py-2 px-3 rounded-xl bg-[#351C07]/80 hover:bg-[#4C280B] border border-[#F59E0B]/50 text-[#FDE68A] hover:text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                    title="معاينة ظهور تنبيه الورد القرآني داخل التطبيق"
                  >
                    <Eye size={13} className="text-[#F59E0B]" />
                    <span>تجربة التذكير الداخلي</span>
                  </button>

                  <button
                    onClick={() => ReminderEngine.testRoyalAtharReminder('wird')}
                    className="py-2 px-3 rounded-xl bg-gradient-to-r from-[#E6C66E] via-[#F3E5AB] to-[#B88A2D] text-[#080705] font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow-[0_2px_12px_rgba(230,198,110,0.3)] hover:brightness-105 active:scale-95 transition-all"
                    title="تشغيل إشعار الورد الملكي خارج التطبيق وعلى قفل الشاشة بكافة تفاصيله"
                  >
                    <Crown size={13} className="text-[#080705]" />
                    <span>تجربة تنبيه الأثر الملكي</span>
                  </button>
                </div>
              </div>

              {/* 4. Filial Piety & Parents Care Notifications (تنبيهات بر الوالدين) */}
              <div className="p-3.5 bg-gradient-to-br from-[#270914]/90 via-[#3C0F1F]/90 to-[#19060D]/90 border border-[#F43F5E]/40 hover:border-[#F43F5E]/65 rounded-2xl space-y-3 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#4D1226] border border-[#F43F5E]/50 text-[#FECDD3] flex items-center justify-center shrink-0 shadow-sm">
                      <Heart size={17} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-extrabold text-xs">تنبيهات بر الوالدين</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#2C0A15] border border-[#F43F5E]/50 text-[#FECDD3] text-[9.5px] font-bold">
                          إحسان ورضا
                        </span>
                      </div>
                      <span className="text-[10px] text-[#FECDD3]/80 block mt-0.5 truncate">
                        {settings.parentsReminder?.enabled
                          ? `مفعّل (${settings.parentsReminder.startTime} - ${settings.parentsReminder.endTime}) · تذكير بالدعاء والصلة`
                          : 'متوقف حالياً'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      saveSettings(
                        {
                          ...settings,
                          parentsReminder: {
                            ...settings.parentsReminder,
                            enabled: !settings.parentsReminder?.enabled,
                          },
                        },
                        !settings.parentsReminder?.enabled
                          ? 'تم تفعيل تنبيهات بر الوالدين ✓'
                          : 'تم إيقاف تنبيهات بر الوالدين'
                      )
                    }
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border ${
                      settings.parentsReminder?.enabled
                        ? 'bg-[#F43F5E] border-[#FECDD3]'
                        : 'bg-[#1B1812] border-[#C8A24A]/35'
                    }`}
                    aria-label="تبديل تفعيل تنبيهات بر الوالدين"
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                        settings.parentsReminder?.enabled ? '-translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Dual Test Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[#F43F5E]/25">
                  <button
                    onClick={() => ReminderEngine.testInAppReminder('parents')}
                    className="py-2 px-3 rounded-xl bg-[#380E1D]/80 hover:bg-[#501329] border border-[#F43F5E]/50 text-[#FECDD3] hover:text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                    title="معاينة ظهور تنبيه بر الوالدين داخل التطبيق"
                  >
                    <Eye size={13} className="text-[#F43F5E]" />
                    <span>تجربة التذكير الداخلي</span>
                  </button>

                  <button
                    onClick={() => ReminderEngine.testRoyalAtharReminder('parents')}
                    className="py-2 px-3 rounded-xl bg-gradient-to-r from-[#E6C66E] via-[#F3E5AB] to-[#B88A2D] text-[#080705] font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow-[0_2px_12px_rgba(230,198,110,0.3)] hover:brightness-105 active:scale-95 transition-all"
                    title="تشغيل إشعار بر الوالدين الملكي خارج التطبيق وعلى قفل الشاشة بكافة تفاصيله"
                  >
                    <Crown size={13} className="text-[#080705]" />
                    <span>تجربة تنبيه الأثر الملكي</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Dedicated Islamic Wake-Up & Fajr Alarm System Settings Card */}
          <div className="athar-card relative overflow-hidden space-y-3.5">
            <div className="relative z-10 flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#262012] border border-[#C8A24A]/50 text-[#E6C66E]">
                  <AlarmClock size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    إعدادات المنبه الإسلامي الذكي
                  </h3>
                  <p className="text-[11px] text-[#C4B998] mt-0.5">
                    تخصيص صوت «الصلاة خير من النوم» المتكرر، طريقة الإيقاف، والتدرج الصوتي
                  </p>
                </div>
              </div>

              {onOpenAlarmModal && (
                <button
                  onClick={onOpenAlarmModal}
                  className="px-3 py-1.5 bg-[#241E11] hover:bg-[#302716] text-[#E6C66E] border border-[#C8A24A]/50 rounded-xl text-[11px] font-extrabold flex items-center gap-1 transition-all shrink-0"
                >
                  <span>إدارة المنبهات</span>
                  <ChevronLeft size={13} />
                </button>
              )}
            </div>

            <div className="relative z-10 space-y-3 text-xs">
              {/* 1. Default Islamic Alarm Sound Selector with Preview */}
              <div className="p-3 bg-[#0D0C09] border border-[#C8A24A]/25 rounded-2xl space-y-2">
                <span className="text-[#F3E5AB] font-extrabold block">
                  الصوت الإسلامي المتكرر للمنبه:
                </span>
                <div className="space-y-1.5">
                  {ISLAMIC_ALARM_SOUNDS.map((snd) => {
                    const isSelected = alarmSettings.defaultSoundId === snd.id;
                    const isPrev = previewingSoundId === snd.id;
                    return (
                      <div
                        key={snd.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#241E11] to-[#14110A] border-[#E6C66E] text-white'
                            : 'bg-[#12100C] border-[#C8A24A]/20 text-[#C4B998]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            const updated = AlarmService.saveSystemSettings({
                              defaultSoundId: snd.id,
                            });
                            setAlarmSettings(updated);
                            setSaveBanner(`تم اعتماد صوت المنبه: ${snd.title} ✓`);
                            setTimeout(() => setSaveBanner(null), 3000);
                          }}
                          className="flex-1 text-right"
                        >
                          <div className="text-xs font-extrabold text-[#F3E5AB] flex items-center gap-1.5 flex-wrap">
                            <span>{snd.title}</span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#C8A24A]/20 border border-[#C8A24A]/40 text-[#E6C66E]">
                              {snd.badge}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#C4B998] mt-0.5">
                            {snd.subtitle}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (isPrev) {
                              AlarmService.stopPreviewSound();
                              setPreviewingSoundId(null);
                            } else {
                              setPreviewingSoundId(snd.id);
                              AlarmService.previewSoundOption(snd.id, () => {
                                setPreviewingSoundId(null);
                              });
                            }
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold flex items-center gap-1 shrink-0 border ${
                            isPrev
                              ? 'bg-[#E6C66E] text-[#070707] border-[#F3E5AB]'
                              : 'bg-[#1B170F] text-[#E6C66E] border-[#C8A24A]/40'
                          }`}
                        >
                          {isPrev ? <Square size={11} fill="currentColor" /> : <Volume2 size={12} />}
                          <span>{isPrev ? 'إيقاف' : 'استماع'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Default Wake-Up Dismiss Method */}
              <div className="p-3 bg-[#0D0C09] border border-[#C8A24A]/25 rounded-2xl space-y-2">
                <span className="text-[#F3E5AB] font-extrabold block">
                  طريقة إيقاف المنبه المفضلة لضمان الاستيقاظ:
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {(
                    [
                      {
                        id: 'direct' as AlarmDismissMethod,
                        title: '١. إيقاف مباشر + زر غفوة (Snooze)',
                        desc: 'زر واضح وكبير لإيقاف المنبه مباشرة فور الاستيقاظ',
                      },
                      {
                        id: 'dhikr_tap' as AlarmDismissMethod,
                        title: '٢. ترديد ذكر الاستيقاظ 3 مرات',
                        desc: 'الضغط 3 مرات على «الحمد لله الذي أحيانا بعدما أماتنا وإليه النشور»',
                      },
                      {
                        id: 'faith_question' as AlarmDismissMethod,
                        title: '٣. إكمال آية قصيرة أو سؤال إيماني',
                        desc: 'تحدٍّ إيماني خفيف ينشط الذهن ويمنع العودة للنوم',
                      },
                    ]
                  ).map((method) => {
                    const active = alarmSettings.defaultDismissMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => {
                          const updated = AlarmService.saveSystemSettings({
                            defaultDismissMethod: method.id,
                          });
                          setAlarmSettings(updated);
                          setSaveBanner('تم تحديث طريقة إيقاف المنبه المفضلة ✓');
                          setTimeout(() => setSaveBanner(null), 2500);
                        }}
                        className={`p-2.5 rounded-xl border text-right flex items-center justify-between gap-2 transition-all ${
                          active
                            ? 'bg-[#221C10] border-[#E6C66E] text-[#F3E5AB]'
                            : 'bg-[#12100C] border-[#C8A24A]/20 text-[#C4B998]'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-extrabold">{method.title}</div>
                          <div className="text-[10px] text-[#C4B998] mt-0.5">{method.desc}</div>
                        </div>
                        {active && (
                          <span className="w-5 h-5 rounded-full bg-[#C8A24A] text-[#070707] flex items-center justify-center shrink-0">
                            <Check size={12} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Continuous Ring Duration & Snooze Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 bg-[#0D0C09] border border-[#C8A24A]/25 rounded-2xl space-y-2">
                  <span className="text-white font-bold block">
                    مدة تكرار الرنين التلقائي:
                  </span>
                  <div className="grid grid-cols-4 gap-1">
                    {[1, 3, 5, 10].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => {
                          const updated = AlarmService.saveSystemSettings({
                            ringDurationMinutes: mins,
                          });
                          setAlarmSettings(updated);
                        }}
                        className={`py-1.5 rounded-xl text-[10px] font-extrabold border transition-all ${
                          alarmSettings.ringDurationMinutes === mins
                            ? 'bg-[#C8A24A] text-[#070707] border-[#F3E5AB]'
                            : 'bg-[#15130E] text-[#C4B998] border-[#C8A24A]/25'
                        }`}
                      >
                        {mins} د
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-[#0D0C09] border border-[#C8A24A]/25 rounded-2xl space-y-2">
                  <span className="text-white font-bold block">مدة الغفوة (Snooze):</span>
                  <div className="grid grid-cols-3 gap-1">
                    {[5, 10, 15].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => {
                          const updated = AlarmService.saveSystemSettings({
                            snoozeMinutes: mins,
                          });
                          setAlarmSettings(updated);
                        }}
                        className={`py-1.5 rounded-xl text-[10px] font-extrabold border transition-all ${
                          alarmSettings.snoozeMinutes === mins
                            ? 'bg-[#C8A24A] text-[#070707] border-[#F3E5AB]'
                            : 'bg-[#15130E] text-[#C4B998] border-[#C8A24A]/25'
                        }`}
                      >
                        {mins} دقائق
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Gradual Volume Escalation Toggle */}
              <div className="p-3 bg-[#0D0C09] border border-[#C8A24A]/25 rounded-2xl flex items-center justify-between gap-2">
                <div>
                  <span className="text-white font-bold block">
                    التدرج التصاعدي في مستوى صوت المنبه
                  </span>
                  <span className="text-[10px] text-[#C4B998] block mt-0.5">
                    يبدأ الصوت هادئاً ثم يرتفع تدريجياً مع كل تكرار حتى تستيقظ بلطف
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const updated = AlarmService.saveSystemSettings({
                      gradualVolume: !alarmSettings.gradualVolume,
                    });
                    setAlarmSettings(updated);
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border ${
                    alarmSettings.gradualVolume
                      ? 'bg-[#C8A24A] border-[#F3E5AB]'
                      : 'bg-[#1B1812] border-[#C8A24A]/35'
                  }`}
                  aria-label="تبديل التدرج التصاعدي لصوت المنبه"
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                      alarmSettings.gradualVolume ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* 5. Test Full-Screen Alarm Ringing Now */}
              <button
                type="button"
                onClick={() => AlarmService.triggerQuickTestAlarm()}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#282112] via-[#1C170D] to-[#282112] hover:from-[#362C18] hover:to-[#362C18] border border-[#E6C66E]/60 text-[#F3E5AB] text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow"
              >
                <AlarmClock size={15} className="text-[#E6C66E]" />
                <span>تجربة شاشة رنين المنبه والصوت المتكرر الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Quran Reciter */}
      {showSection('quran') && (
        <div className="space-y-3.5">
          <div className="athar-card space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#262012] border border-[#C8A24A]/50 text-[#E6C66E]">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">قارئ القرآن المعتمد</h3>
                  <p className="text-[11px] text-[#C4B998] mt-0.5">
                    يُعتمد صوته في المصحف الصوتي وتذكيرات الآيات
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {VERIFIED_RECITERS.map((r) => {
                const isSelected = settings.selectedReciterId === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() =>
                      saveSettings(
                        { ...settings, selectedReciterId: r.id },
                        `تم اختيار القارئ: ${r.nameArabic} ✓`
                      )
                    }
                    className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs text-right transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#2A2212] to-[#16130B] border-[#E6C66E] text-[#F3E5AB] font-extrabold shadow-[0_4px_18px_rgba(200,162,74,0.2)]'
                        : 'bg-[#0D0C09] border-[#C8A24A]/25 text-[#C4B998] hover:border-[#C8A24A]/55 hover:text-white'
                    }`}
                  >
                    <span className="leading-snug">{r.nameArabic}</span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-[#C8A24A] text-[#070707] flex items-center justify-center shrink-0">
                        <Check size={12} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prayer Calculation Method / طريقة الحساب الفلكي لمواقيت الصلاة */}
          <div className="athar-card space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#262012] border border-[#C8A24A]/50 text-[#E6C66E]">
                  <Compass size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">طريقة الحساب الفلكي للمواقيت</h3>
                  <p className="text-[11px] text-[#C4B998] mt-0.5">
                    المعيار الفلكي المعتمد لحساب زوايا الفجر والعشاء ومواقيت الصلاة
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CALCULATION_METHODS.map((m) => {
                const isSelected = (settings.calculationMethod || '5') === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      const updated = { ...settings, calculationMethod: m.id };
                      saveSettings(updated, `تم اعتماد طريقة الحساب: ${m.name} ✓`);
                      LiveActivityService.updateLocationAndMethod(updated.location, m.id);
                      window.dispatchEvent(new CustomEvent('athar_prayers_updated'));
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs text-right transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#2A2212] to-[#16130B] border-[#E6C66E] text-[#F3E5AB] font-extrabold shadow-[0_4px_18px_rgba(200,162,74,0.2)]'
                        : 'bg-[#0D0C09] border-[#C8A24A]/25 text-[#C4B998] hover:border-[#C8A24A]/55 hover:text-white'
                    }`}
                  >
                    <span className="leading-snug">{m.name}</span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-[#C8A24A] text-[#070707] flex items-center justify-center shrink-0">
                        <Check size={12} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Full Offline-First Local Database & Audio Packs Manager */}
          <OfflineCenterCard />
        </div>
      )}

      {/* SECTION 3: System Permissions & Backup / Data Management */}
      {showSection('system') && (
        <div className="space-y-3.5">
          {/* Backup & Data Management Card */}
          <div className="athar-card space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
              <div>
                <h3 className="text-sm font-extrabold text-white">النسخ الاحتياطي وإدارة البيانات</h3>
                <p className="text-[11px] text-[#C4B998] mt-0.5 leading-relaxed">
                  حفظ واستعادة سجل صلواتك، أذكارك، الصيام، الصدقات، ومواضع الاستماع والقراءة
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={() => {
                  const json = StorageService.exportFullBackup();
                  const blob = new Blob([json], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  const dateTag = new Date().toISOString().split('T')[0];
                  a.href = url;
                  a.download = `athar-backup-${dateTag}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  setSaveBanner('تم تصدير وتحميل ملف النسخة الاحتياطية بنجاح ✓');
                  setTimeout(() => setSaveBanner(null), 3500);
                }}
                className="athar-btn-primary flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs"
              >
                <Download size={14} />
                <span>تصدير نسخة احتياطية</span>
              </button>

              <label className="athar-btn-outline flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs cursor-pointer">
                <Upload size={14} className="text-[#E6C66E]" />
                <span>استعادة نسخة محفوظة</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const res = StorageService.importFullBackup(String(reader.result || ''));
                      setSaveBanner(res.message);
                      if (res.success) {
                        setSettings(StorageService.getSettings());
                      }
                      setTimeout(() => setSaveBanner(null), 4000);
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>

            <div className="pt-1">
              {showClearConfirm ? (
                <div className="w-full p-3.5 bg-[#1E1111] border border-red-500/45 rounded-2xl space-y-2.5 text-xs">
                  <span className="text-red-200 block font-bold">
                    هل أنت متأكد من مسح جميع البيانات والإعدادات المحلية؟
                  </span>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-3.5 py-1.5 bg-[#171510] text-[#C4B998] border border-[#C8A24A]/30 rounded-xl font-bold"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={() => {
                        StorageService.clearAllData();
                        window.location.reload();
                      }}
                      className="px-3.5 py-1.5 bg-red-600 text-white font-extrabold rounded-xl"
                    >
                      تأكيد المسح النهائي
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-[#0D0C09] hover:bg-[#1E1111] text-[#C4B998] hover:text-red-300 border border-[#C8A24A]/25 hover:border-red-500/40 rounded-2xl text-xs font-bold transition-colors"
                >
                  <Trash2 size={14} />
                  <span>مسح جميع البيانات المحلية وإعادة الضبط</span>
                </button>
              )}
            </div>
          </div>

          {/* Dedicated Permissions & System Status Section */}
          <div className="p-4 rounded-3xl bg-gradient-to-r from-[#201A10] via-[#14110A] to-[#0D0B08] border border-[#E6C66E]/55 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-right">
              <h3 className="text-xs sm:text-sm font-extrabold text-[#FFF2C2]">
                معالج تهيئة الأذونات الملكي (Permissions Setup Wizard)
              </h3>
              <p className="text-[11px] text-[#C4B998]">
                فحص وإعداد الأذونات خطوة بخطوة وتجربة التنبيهات وشاشة الأذان الحية
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsWizardOpen(true)}
              className="min-h-[44px] py-2.5 px-4 rounded-2xl bg-gradient-to-r from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] text-[#070605] font-extrabold text-xs shadow-md hover:brightness-110 active:scale-95 shrink-0 flex items-center gap-1.5"
            >
              <Sparkles size={14} fill="currentColor" />
              <span>تشغيل المعالج الملكي ↗</span>
            </button>
          </div>

          <MobilePermissionsKit />
        </div>
      )}

      {/* BOTTOM CARD: Spacious & Unclipped Save Settings & Summary Card (Moved from Top to Bottom) */}
      <div className="rounded-3xl bg-gradient-to-b from-[#1E1910] via-[#13100A] to-[#0B0A08] border border-[#C8A24A]/65 p-5 space-y-4 shadow-[0_14px_38px_rgba(0,0,0,0.92)]">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2B2313] to-[#14110A] border border-[#E6C66E]/60 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(200,162,74,0.28)]">
            <SettingsIcon size={22} className="text-[#E6C66E]" />
          </div>
          <div className="flex-1 text-right space-y-1">
            <div className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-[#E6C66E] shrink-0" />
              <span className="text-[11px] font-extrabold text-[#E6C66E] tracking-wide">
                ملخص وحفظ إعدادات أثر الملكية
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#F3E5AB] leading-snug">
              الإعدادات والتفضيلات المعتمدة
            </h2>
            <p className="text-xs text-[#C4B998] leading-relaxed">
              إدارة منظمة للأذان، التلاوة، التنبيهات اليومية، والصلاحيات مع الحفظ التلقائي والفوري.
            </p>
          </div>
        </div>

        {/* Full-Clarity Summary Status Cards (No Truncation) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[#C8A24A]/25 text-xs">
          <div className="bg-[#12100B] border border-[#C8A24A]/40 rounded-2xl p-3 text-right space-y-1">
            <span className="text-[#C4B998] block text-[11px] font-bold">القارئ المعتمد للتلاوة:</span>
            <span className="text-[#E6C66E] font-extrabold block leading-relaxed break-words">
              {selectedReciter?.nameArabic}
            </span>
          </div>
          <div className="bg-[#12100B] border border-[#C8A24A]/40 rounded-2xl p-3 text-right space-y-1">
            <span className="text-[#C4B998] block text-[11px] font-bold">حالة الإشعارات والتنبيهات:</span>
            <span
              className={`font-extrabold block leading-relaxed ${
                notificationPermission === 'granted' ? 'text-[#E6C66E]' : 'text-[#F3E5AB]'
              }`}
            >
              {notificationPermission === 'granted' ? 'مفعّلة ونشطة بالكامل ✓' : 'تحتاج تفعيل الصلاحية'}
            </span>
          </div>
        </div>

        {/* Prominent Full-Width Golden Save Button */}
        <button
          onClick={() => saveSettings(settings, 'تم حفظ جميع الإعدادات والتفضيلات بنجاح ✓')}
          className="w-full athar-btn-primary py-3 px-5 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-[0_6px_22px_rgba(200,162,74,0.4)]"
        >
          <Check size={17} />
          <span>حفظ جميع الإعدادات والتفضيلات</span>
        </button>
      </div>

      {/* Save Feedback Banner Directly Underneath the Save Card at the Bottom of the Page */}
      {saveBanner && (
        <div className="p-4 bg-gradient-to-r from-[#241E11] to-[#14110B] border border-[#E6C66E]/75 rounded-2xl flex items-center justify-center gap-2.5 text-xs sm:text-sm text-[#F3E5AB] animate-slideDown shadow-[0_10px_28px_rgba(0,0,0,0.9)]">
          <CheckCircle2 size={18} className="text-[#E6C66E] shrink-0" />
          <span className="font-extrabold">{saveBanner}</span>
        </div>
      )}

      {/* Permissions Setup Wizard Dialog */}
      <PermissionsSetupWizard
        isOpen={isWizardOpen}
        onFinish={(coords) => {
          setIsWizardOpen(false);
          if (coords) {
            onLocationChange(coords);
          }
        }}
        onSkip={() => setIsWizardOpen(false)}
      />
    </div>
  );
};
