import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, Coordinates, PrayerCalculationMethod } from '../types';
import {
  StorageService,
  AndroidWidgetCustomization,
  AtharNotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '../services/storageService';
import { NotificationService } from '../services/notificationService';
import { ReminderEngine } from '../services/reminderService';
import { VERIFIED_RECITERS } from '../data/surahsData';
import { VERIFIED_DHIKR_REMINDERS } from '../data/dhikrRemindersData';
import {
  Settings as SettingsIcon,
  Volume2,
  VolumeX,
  Trash2,
  Check,
  BookOpen,
  Bell,
  BellRing,
  BellOff,
  ShieldCheck,
  CheckCircle2,
  Download,
  Upload,
  ChevronLeft,
  Mic,
  Sparkles,
  AlarmClock,
  Compass,
  Clock,
  LayoutGrid,
  Play,
  Square as StopSquare,
  Smartphone,
  Vibrate,
  Sliders,
  Layers,
  Database,
  RefreshCw,
} from 'lucide-react';
import { MobilePermissionsKit } from '../components/MobilePermissionsKit';
import { PermissionsSetupWizard } from '../components/PermissionsSetupWizard';
import { OngoingPrayerService } from '../services/ongoingPrayerService';
import { VoiceAssistant, VoiceAssistantSettings } from '../services/voiceAssistantService';
import { LiveActivityService, LiveActivitySettings } from '../services/liveActivityService';
import {
  AlarmService,
  AlarmSystemSettings,
  AlarmSoundId,
  ISLAMIC_ALARM_SOUNDS,
} from '../services/alarmService';
import { OfflineCenterCard } from '../components/OfflineCenterCard';
import { AtharBrandLogo } from '../components/AtharBrandLogo';
import { AudioService } from '../services/audioService';

const CALCULATION_METHODS: { id: PrayerCalculationMethod; name: string }[] = [
  { id: '5', name: 'الهيئة المصرية العامة للمساحة (الافتراضي)' },
  { id: '4', name: 'جامعة أم القرى - مكة المكرمة' },
  { id: '3', name: 'رابطة العالم الإسلامي' },
  { id: '1', name: 'جامعة العلوم الإسلامية بكراتشي' },
  { id: '16', name: 'الهيئة العامة للشؤون الإسلامية والأوقاف (الإمارات)' },
  { id: '2', name: 'الجمعية الإسلامية لأمريكا الشمالية (ISNA)' },
];

const FAJR_MUAZZIN_OPTIONS = [
  { id: 'public/audio/adhan_fajr_alafasy.mp3', name: 'مشاري راشد العفاسي (أذان الفجر كامل)', badge: 'معتمد' },
  { id: 'public/audio/salat_khayr_alafasy_2.mp3', name: 'مشاري العفاسي (الصلاة خير من النوم - ترتيل)', badge: 'خاشع' },
  { id: 'public/audio/salat_khayr_min_nawm.mp3', name: 'نداء الفجر النبوي الشريف', badge: 'تراثي' },
];

const REGULAR_MUAZZIN_OPTIONS = [
  { id: 'public/audio/adhan_alafasy.mp3', name: 'مشاري راشد العفاسي (الأذان الحجازي)', badge: 'الافتراضي' },
  { id: 'public/audio/adhan_makkah.mp3', name: 'أذان الحرم المكي الشريف', badge: 'مكة المكرمة' },
  { id: 'public/audio/adhan_madinah.mp3', name: 'أذان المسجد النبوي الشريف', badge: 'المدينة المنورة' },
  { id: 'public/audio/adhan_alaqsa.mp3', name: 'أذان المسجد الأقصى المبارك', badge: 'القدس الشريف' },
];

const REMINDER_AUDIO_TONES = [
  { id: 'public/audio/wird.mp3', name: 'نغمة الورد والتدبر القرآني', category: 'quran' },
  { id: 'public/audio/dhikr_sample.mp3', name: 'تسبيح وذكر الله (سبحان الله وبحمده)', category: 'dhikr' },
  { id: 'public/audio/salawat.mp3', name: 'الصلاة والسلام على النبي ﷺ', category: 'salawat' },
  { id: 'public/audio/parents.mp3', name: 'دعاء بر الوالدين والإحسان إليهما', category: 'parents' },
  { id: 'public/audio/quran_sample.mp3', name: 'تلاوة قرآنية خاشعة', category: 'quran' },
];

const REPEAT_INTERVAL_OPTIONS = [
  { value: 15, label: 'كل 15 دقيقة', desc: 'تذكير مكثف بربع ساعة' },
  { value: 30, label: 'كل 30 دقيقة', desc: 'التوازن المثالي (موصى به)' },
  { value: 60, label: 'كل ساعة', desc: 'تذكير رأس كل ساعة' },
  { value: 120, label: 'كل ساعتين', desc: 'تذكير هادئ متباعد' },
  { value: 180, label: 'كل 3 ساعات', desc: 'تذكيرات خفيفة متفرقة' },
];

const VIBRATION_PATTERNS = [
  { id: 'standard', name: 'قياسي', desc: 'اهتزاز متوازن (نصف ثانية)' },
  { id: 'pulse', name: 'نبضات متتالية', desc: 'ثلاث نبضات سريعة ملحوظة' },
  { id: 'long', name: 'اهتزاز طويل', desc: 'تنبيه مستمر ومؤكد' },
  { id: 'silent', name: 'صامت', desc: 'صوت فقط بدون أي اهتزاز' },
];

interface SettingsViewProps {
  onOpenCodeInspector?: () => void;
  onOpenRemindersCenter: () => void;
  onOpenVoiceAssistant?: () => void;
  onOpenAlarmModal?: () => void;
  onLocationChange: (coords: Coordinates) => void;
}

type SettingsTabId =
  | 'all'
  | 'notifications_manager'
  | 'audio_system'
  | 'widget'
  | 'quran_prayer'
  | 'backup_data';

export const SettingsView: React.FC<SettingsViewProps> = ({
  onOpenRemindersCenter,
  onOpenVoiceAssistant,
  onOpenAlarmModal,
  onLocationChange,
}) => {
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());
  const [notifPrefs, setNotifPrefs] = useState<AtharNotificationPreferences>(() =>
    StorageService.getNotificationPreferences()
  );
  const [voiceSettings, setVoiceSettings] = useState<VoiceAssistantSettings>(VoiceAssistant.getSettings());
  const [liveActivitySettings, setLiveActivitySettings] = useState<LiveActivitySettings>(
    LiveActivityService.getSettings()
  );
  const [alarmSettings, setAlarmSettings] = useState<AlarmSystemSettings>(
    AlarmService.getSystemSettings()
  );
  const [previewingSoundId, setPreviewingSoundId] = useState<AlarmSoundId | null>(null);
  const [previewingAudioUrl, setPreviewingAudioUrl] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    NotificationService.getPermissionStatus()
  );
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
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
    setNotifPrefs(StorageService.getNotificationPreferences());
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
      if (e.detail) setWidgetCustomization(e.detail);
    };
    const handleNotifPrefsChanged = (e: any) => {
      if (e.detail) setNotifPrefs(e.detail);
    };

    window.addEventListener('athar_widget_customization_changed', handleWidgetCustomizationChanged);
    window.addEventListener('athar_notification_preferences_changed', handleNotifPrefsChanged);

    return () => {
      unsubPerm();
      unsubVoice();
      unsubAlarm();
      window.removeEventListener('athar_widget_customization_changed', handleWidgetCustomizationChanged);
      window.removeEventListener('athar_notification_preferences_changed', handleNotifPrefsChanged);
      AlarmService.stopPreviewSound();
      AudioService.stop();
    };
  }, []);

  const updateNotifPreferences = (partial: Partial<AtharNotificationPreferences>, msg?: string) => {
    const updated = StorageService.saveNotificationPreferences(partial);
    setNotifPrefs(updated);
    if (msg) {
      setSaveBanner(msg);
      setTimeout(() => setSaveBanner(null), 3200);
    }
  };

  const handleToggleAudioPreview = async (audioUrl: string) => {
    if (previewingAudioUrl === audioUrl) {
      AudioService.stop();
      setPreviewingAudioUrl(null);
    } else {
      setPreviewingAudioUrl(audioUrl);
      AudioService.unlockAudio();
      await AudioService.playUrl(audioUrl, 'reminder_verse', {
        title: 'معاينة صوت أثر',
        subtitle: 'فحص جودة ونقاء الصوت',
      });
      AudioService.addTemporaryAudioFinishedListener(() => {
        setPreviewingAudioUrl(null);
      });
    }
  };


  const [delayedAdhanCountdown, setDelayedAdhanCountdown] = useState<number | null>(null);

  const handleTestAdhan = async (prayerKey: 'fajr' | 'dhuhr' = 'dhuhr') => {
    AudioService.unlockAudio();
    const pName = prayerKey === 'fajr' ? 'الفجر' : 'الظهر';
    setSaveBanner(`تم إطلاق تجربة الأذان الملكي (${pName}) عبر AtharNotificationManager بنجاح ✓`);
    if (prayerKey === 'fajr') {
      await ReminderEngine.testFajrAdhan();
    } else {
      await ReminderEngine.testAdhan(settings.adhanVoice, settings.adhanMode, prayerKey);
    }
    setTimeout(() => setSaveBanner(null), 3500);
  };

  const handleTestAdhanDelayed = async (seconds: number = 5) => {
    AudioService.unlockAudio();
    setDelayedAdhanCountdown(seconds);
    setSaveBanner(`⏳ تم بدء العد التنازلي: سيبدأ الأذان الملكي بعد ${seconds} ثوانٍ... يمكنك قفل الشاشة أو تصغير التطبيق لتجربة الاستيقاظ.`);

    await ReminderEngine.testAdhanDelayed(seconds, 'fajr');

    let current = seconds;
    const interval = setInterval(() => {
      current -= 1;
      if (current <= 0) {
        clearInterval(interval);
        setDelayedAdhanCountdown(null);
        setSaveBanner('🕌 انطلق الأذان الملكي الآن بنجاح ✓');
        setTimeout(() => setSaveBanner(null), 3500);
      } else {
        setDelayedAdhanCountdown(current);
      }
    }, 1000);
  };

  const handleTestIqamah = async () => {
    AudioService.unlockAudio();
    setSaveBanner('تم إطلاق تجربة تنبيه إقامة الصلاة عبر AtharNotificationManager ✓');
    await ReminderEngine.testIqamah();
    setTimeout(() => setSaveBanner(null), 3500);
  };

  const handleTestPostAdhanDua = async () => {
    AudioService.unlockAudio();
    setSaveBanner('تم إطلاق تجربة دعاء ما بعد الأذان والوسيلة عبر AtharNotificationManager ✓');
    await ReminderEngine.testDuaAfterAdhan();
    setTimeout(() => setSaveBanner(null), 3500);
  };

  const handleTestQuranAyah = async () => {
    AudioService.unlockAudio();
    setSaveBanner('تم إطلاق تجربة تنبيه الآية (اقرأ لو آية) مع الصوت وزر الذهاب للآية ✓');
    await ReminderEngine.testQuranVerseReminder();
    setTimeout(() => setSaveBanner(null), 3500);
  };

  const handleTestWird = async () => {
    AudioService.unlockAudio();
    setSaveBanner('تم إطلاق تجربة تنبيه الورد القرآني مع زر صفحة المصحف والختمة ✓');
    await ReminderEngine.testDailyWirdReminder();
    setTimeout(() => setSaveBanner(null), 3500);
  };

  const handleTestDhikr = async (specificId?: string) => {
    AudioService.unlockAudio();
    setSaveBanner('تم إطلاق تجربة تنبيه الأذكار والتسبيح مع زر فتح المسبحة ✓');
    await ReminderEngine.testDhikrReminder(specificId);
    setTimeout(() => setSaveBanner(null), 3500);
  };

  const handleTestMorningAdhkar = async () => {
    AudioService.unlockAudio();
    setSaveBanner('تم إطلاق تجربة أذكار الصباح مع زر الانتقال للأذكار ✓');
    await ReminderEngine.testMorningAdhkar();
    setTimeout(() => setSaveBanner(null), 3500);
  };

  const handleTestEveningAdhkar = async () => {
    AudioService.unlockAudio();
    setSaveBanner('تم إطلاق تجربة أذكار المساء مع زر الانتقال للأذكار ✓');
    await ReminderEngine.testEveningAdhkar();
    setTimeout(() => setSaveBanner(null), 3500);
  };

  const handleTestSalawat = async () => {
    AudioService.unlockAudio();
    setSaveBanner('تم إطلاق تجربة الصلاة على النبي ﷺ مع زر المسبحة ✓');
    await ReminderEngine.testSalawatReminder();
    setTimeout(() => setSaveBanner(null), 3500);
  };

  const handleTestParents = async () => {
    AudioService.unlockAudio();
    setSaveBanner('تم إطلاق تجربة تذكير ودعاء بر الوالدين مع زر صفحة البر ✓');
    await ReminderEngine.testParentsReminder();
    setTimeout(() => setSaveBanner(null), 3500);
  };

  const handleTestSmartAlarm = async () => {
    AudioService.unlockAudio();
    setSaveBanner('تم إطلاق تجربة منبه الفجر الإسلامي الذكي عبر AtharNotificationManager ✓');
    await ReminderEngine.testSmartAlarm();
    setTimeout(() => setSaveBanner(null), 3500);
  };

  const handleTestSmartSilence = async () => {
    AudioService.unlockAudio();
    setSaveBanner('تم إطلاق تجربة تنبيه وضع السكون أثناء الصلاة عبر AtharNotificationManager ✓');
    await ReminderEngine.testSmartSilence();
    setTimeout(() => setSaveBanner(null), 3500);
  };

  const handleTestOngoingBar = async () => {
    setSaveBanner('تم إطلاق تجربة شريط مواقيت الصلاة الدائم في لوحة الإشعارات ✓');
    await ReminderEngine.testOngoingPrayerNotification();
    setTimeout(() => setSaveBanner(null), 3500);
  };


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

  const saveSettings = (updated: AppSettings, msg?: string) => {
    setSettings(updated);
    StorageService.saveSettings(updated);
    ReminderEngine.restart();
    if (msg) {
      setSaveBanner(msg);
      setTimeout(() => setSaveBanner(null), 3000);
    }
  };

  const selectedReciter = VERIFIED_RECITERS.find((r) => r.id === settings.selectedReciterId) || VERIFIED_RECITERS[0];
  const showSection = (sectionTab: SettingsTabId) => activeTab === 'all' || activeTab === sectionTab;

  return (
    <div className="athar-page-container animate-fadeIn">
      {/* Royal Brand Header */}
      <div className="flex items-center justify-center p-3.5 rounded-2xl bg-gradient-to-r from-[#17140E] via-[#100E0A] to-[#0A0907] border border-[#C8A24A]/40 shadow-lg">
        <AtharBrandLogo size="sm" showWordmark={false} showSubtitle={false} centered={true} />
      </div>

      {/* Luxury Gold Category Filter Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5 p-1.5 bg-[#0E0D0A] border border-[#C8A24A]/35 rounded-2xl text-[11px]">
        {[
          { id: 'all', label: 'الكل' },
          { id: 'notifications_manager', label: 'لوحة الإشعارات' },
          { id: 'audio_system', label: 'الصوت والنظام' },
          { id: 'widget', label: 'ودجت الشاشة' },
          { id: 'quran_prayer', label: 'المصحف والمواقيت' },
          { id: 'backup_data', label: 'النسخ والأذونات' },
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

      {/* ========================================================================= */}
      {/* 1. ATHAR NOTIFICATION MANAGER CONTROL PANEL (SECTION 1: PRAYER & ROYAL ATHAN) */}
      {/* ========================================================================= */}
      {(showSection('notifications_manager') || showSection('all')) && (
        <div className="space-y-4">
          {/* Main Control Panel Header Banner */}
          <div className="p-4 rounded-3xl bg-gradient-to-r from-[#211A0E] via-[#141009] to-[#0B0906] border border-[#E6C66E]/55 shadow-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#2D2312] to-[#14110A] border border-[#E6C66E]/60 flex items-center justify-center text-[#E6C66E] shadow-sm shrink-0">
                <BellRing size={22} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#FFF2C2] flex items-center gap-2 flex-wrap">
                  <span>لوحة تحكم إشعارات أثر الموحدة</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#C8A24A]/20 text-[#E6C66E] border border-[#E6C66E]/40 font-bold">
                    AtharNotificationManager
                  </span>
                </h3>
                <p className="text-[11px] text-[#C4B998] mt-0.5 leading-relaxed">
                  المرجع المركزي الموحد لجميع إشعارات الأذان، الشاشة الكاملة، التنبيهات الدورية، ومنع التكرار
                </p>
              </div>
            </div>
          </div>


          {/* CARD 0: THREE NOTIFICATION DELIVERY MODES */}
          <div className="athar-card-gold space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#262012] border border-[#C8A24A]/60 text-[#E6C66E]">
                  <Sliders size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-[#F3E5AB]">أنماط تسليم الإشعارات وسلوك الصوت</h4>
                  <p className="text-[11px] text-[#C4B998] mt-0.5">
                    اختر الطريقة المفضلة لوصول إشعارات التطبيق (صامت، تلقائي، أو تشغيل يدوي)
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
              {[
                {
                  id: 'notification_only' as const,
                  icon: <VolumeX size={16} className="text-[#C4B998]" />,
                  title: 'إشعار فقط (صامت)',
                  badge: 'هادئ',
                  desc: 'وصول الإشعار في شريط الإشعارات بدون تشغيل أي مقطع صوتي.',
                },
                {
                  id: 'notification_audio' as const,
                  icon: <Volume2 size={16} className="text-[#E6C66E]" />,
                  title: 'إشعار + صوت تلقائي',
                  badge: 'الافتراضي والمفضل',
                  desc: 'تشغيل الصوت والتلاوة المخصصة تلقائياً فور وصول التنبيه حتى لو كانت الشاشة مقفلة.',
                },
                {
                  id: 'notification_play_button' as const,
                  icon: <Play size={16} className="text-[#38BDF8]" />,
                  title: 'إشعار + زر تشغيل يدوي',
                  badge: 'تحكم يدوي',
                  desc: 'ظهور الإشعار بصمت مع زر «تشغيل الصوت» التفاعلي داخل الإشعار لتشغيله عند الرغبة.',
                },
              ].map((mode) => {
                const isSelected = notifPrefs.notificationMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() =>
                      updateNotifPreferences(
                        { notificationMode: mode.id },
                        `تم اعتماد نمط الإشعار: ${mode.title} ✓`
                      )
                    }
                    className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-gradient-to-b from-[#2B2313] to-[#15120B] border-[#E6C66E] shadow-md ring-1 ring-[#E6C66E]/50'
                        : 'bg-[#0E0D0A] border-[#C8A24A]/25 hover:border-[#C8A24A]/45 hover:bg-[#14120D]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg border ${isSelected ? 'bg-[#C8A24A]/30 border-[#E6C66E]' : 'bg-[#181510] border-[#C8A24A]/20'}`}>
                          {mode.icon}
                        </div>
                        <span className={`font-extrabold text-xs ${isSelected ? 'text-[#FFF2C2]' : 'text-white'}`}>
                          {mode.title}
                        </span>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                        isSelected
                          ? 'bg-[#C8A24A]/30 text-[#E6C66E] border-[#E6C66E]/50'
                          : 'bg-[#181510] text-[#A69977] border-stone-800'
                      }`}>
                        {mode.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#C4B998] leading-relaxed">
                      {mode.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CARD 1: Prayer & Royal Athan Section */}
          <div className="athar-card space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#262012] border border-[#C8A24A]/50 text-[#E6C66E]">
                  <Smartphone size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white">الأذان الملكي وشاشة الصلاة الحية</h4>
                  <p className="text-[11px] text-[#C4B998] mt-0.5">
                    التحكم في الشاشة الكاملة على شاشة القفل، النافذة العائمة، وأصوات المؤذنين
                  </p>
                </div>
              </div>
            </div>

            {/* In-Card Instant Test Bar for Adhan & Prayers */}
            <div className="p-3 rounded-2xl bg-[#141009] border border-[#C8A24A]/30 flex flex-wrap gap-2 items-center justify-between">
              <span className="text-[11px] font-extrabold text-[#F3E5AB] flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#E6C66E]" />
                <span>تجربة تنبيهات الأذان والصلوات:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleTestAdhan('dhuhr')}
                  className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-black font-extrabold text-[10.5px] flex items-center gap-1 shadow hover:brightness-105 active:scale-95"
                >
                  <Play size={11} fill="currentColor" />
                  <span>تجربة فورية</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestAdhanDelayed(5)}
                  disabled={delayedAdhanCountdown !== null}
                  className={`px-2.5 py-1.5 rounded-xl font-extrabold text-[10.5px] flex items-center gap-1 shadow hover:brightness-105 active:scale-95 transition-all ${
                    delayedAdhanCountdown !== null
                      ? 'bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FF8C00] text-black animate-pulse border border-[#FFF2C2]'
                      : 'bg-gradient-to-r from-[#FFF2C2] via-[#E6C66E] to-[#C8A24A] text-black border border-[#FFF2C2]/80'
                  }`}
                  title="سيبدأ بعد 5 ثوانٍ لتتمكن من قفل شاشة الهاتف أو الخروج للتأكد من استيقاظ الجهاز وظهور شاشة الأذان"
                >
                  <Clock size={11} className="text-black" />
                  <span>
                    {delayedAdhanCountdown !== null
                      ? `سيبدأ خلال (${delayedAdhanCountdown} ث) ⏳`
                      : 'تجربة بعد 5 ثوانٍ ⏱️'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestAdhan('fajr')}
                  className="px-2.5 py-1.5 rounded-xl bg-[#241D10] border border-[#C8A24A]/40 text-[#FFF2C2] font-bold text-[10.5px] flex items-center gap-1 hover:border-[#E6C66E] active:scale-95"
                >
                  <Play size={11} />
                  <span>أذان الفجر</span>
                </button>
                <button
                  type="button"
                  onClick={handleTestIqamah}
                  className="px-2.5 py-1.5 rounded-xl bg-[#241D10] border border-[#C8A24A]/40 text-[#FFF2C2] font-bold text-[10.5px] flex items-center gap-1 hover:border-[#E6C66E] active:scale-95"
                >
                  <Play size={11} />
                  <span>إقامة الصلاة</span>
                </button>
                <button
                  type="button"
                  onClick={handleTestPostAdhanDua}
                  className="px-2.5 py-1.5 rounded-xl bg-[#241D10] border border-[#C8A24A]/40 text-[#FFF2C2] font-bold text-[10.5px] flex items-center gap-1 hover:border-[#E6C66E] active:scale-95"
                >
                  <Play size={11} />
                  <span>دعاء ما بعد الأذان</span>
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* Royal System Overlay Floating Window for all Royal Notifications & Athan */}
              <div className="p-3.5 rounded-2xl bg-[#0F0D09] border border-[#C8A24A]/30 flex items-center justify-between gap-3 shadow-sm">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[#FFF2C2] font-extrabold text-xs">النافذة الملكية العائمة المنبثقة (Royal System Overlay)</span>
                    <span className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold border ${
                      notifPrefs.systemOverlayEnabled
                        ? 'bg-[#C8A24A]/25 text-[#E6C66E] border-[#E6C66E]/50'
                        : 'bg-stone-900 text-stone-400 border-stone-700'
                    }`}>
                      {notifPrefs.systemOverlayEnabled ? 'مفعّلة ✓' : 'معطلة'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#C4B998] leading-relaxed">
                    إظهار بطاقة التنبيهات الملكية التفاعلية العائمة (للأذان، آيات القرآن، الأذكار، والورد) أعلى شاشة هاتفك عند الخروج من التطبيق، مع إمكانية كتم الصوت والإغلاق وفتح التطبيق دون مقاطعة استخدامك.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateNotifPreferences(
                      { systemOverlayEnabled: !notifPrefs.systemOverlayEnabled },
                      !notifPrefs.systemOverlayEnabled
                        ? 'تم تفعيل النافذة الملكية العائمة المنبثقة بنجاح ✓'
                        : 'تم إيقاف النافذة الملكية العائمة المنبثقة'
                    )
                  }
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border cursor-pointer ${
                    notifPrefs.systemOverlayEnabled
                      ? 'bg-[#C8A24A] border-[#F3E5AB]'
                      : 'bg-[#1B1812] border-[#C8A24A]/35'
                  }`}
                  aria-label="تبديل تفعيل النافذة الملكية العائمة المنبثقة"
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                      notifPrefs.systemOverlayEnabled ? '-translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Fajr Muazzin Selector */}
              <div className="p-3.5 rounded-2xl bg-[#120F0A] border border-[#C8A24A]/30 space-y-2">
                <span className="text-[#F3E5AB] font-extrabold block text-xs">
                  صوت مؤذن صلاة الفجر المعتمد:
                </span>
                <div className="space-y-1.5">
                  {FAJR_MUAZZIN_OPTIONS.map((opt) => {
                    const isSelected = notifPrefs.fajrMuazzin === opt.id;
                    const isPlaying = previewingAudioUrl === opt.id;
                    return (
                      <div
                        key={opt.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#241E11] to-[#14110A] border-[#E6C66E] text-white shadow-sm'
                            : 'bg-[#0B0A08] border-[#C8A24A]/20 text-[#C4B998]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => updateNotifPreferences({ fajrMuazzin: opt.id }, `تم اختيار مؤذن الفجر: ${opt.name} ✓`)}
                          className="flex-1 text-right flex items-center gap-2"
                        >
                          <span className="font-bold text-xs">{opt.name}</span>
                          <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-[#C8A24A]/20 text-[#E6C66E] border border-[#C8A24A]/35">
                            {opt.badge}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleAudioPreview(opt.id)}
                          className={`p-2 rounded-lg border text-xs flex items-center gap-1 font-bold ${
                            isPlaying
                              ? 'bg-[#E6C66E] text-black border-white'
                              : 'bg-[#18140D] border-[#C8A24A]/40 text-[#E6C66E] hover:text-white'
                          }`}
                          title="استماع فوري ومعاينة"
                        >
                          {isPlaying ? <StopSquare size={13} /> : <Play size={13} />}
                          <span>{isPlaying ? 'إيقاف' : 'استماع'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Regular Prayers Muazzin Selector */}
              <div className="p-3.5 rounded-2xl bg-[#120F0A] border border-[#C8A24A]/30 space-y-2">
                <span className="text-[#F3E5AB] font-extrabold block text-xs">
                  صوت مؤذن الصلوات المفروضة (الظهر، العصر، المغرب، العشاء):
                </span>
                <div className="space-y-1.5">
                  {REGULAR_MUAZZIN_OPTIONS.map((opt) => {
                    const isSelected = notifPrefs.regularMuazzin === opt.id;
                    const isPlaying = previewingAudioUrl === opt.id;
                    return (
                      <div
                        key={opt.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#241E11] to-[#14110A] border-[#E6C66E] text-white shadow-sm'
                            : 'bg-[#0B0A08] border-[#C8A24A]/20 text-[#C4B998]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => updateNotifPreferences({ regularMuazzin: opt.id }, `تم اعتماد المؤذن: ${opt.name} ✓`)}
                          className="flex-1 text-right flex items-center gap-2"
                        >
                          <span className="font-bold text-xs">{opt.name}</span>
                          <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-[#C8A24A]/20 text-[#E6C66E] border border-[#C8A24A]/35">
                            {opt.badge}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleAudioPreview(opt.id)}
                          className={`p-2 rounded-lg border text-xs flex items-center gap-1 font-bold ${
                            isPlaying
                              ? 'bg-[#E6C66E] text-black border-white'
                              : 'bg-[#18140D] border-[#C8A24A]/40 text-[#E6C66E] hover:text-white'
                          }`}
                          title="استماع فوري ومعاينة"
                        >
                          {isPlaying ? <StopSquare size={13} /> : <Play size={13} />}
                          <span>{isPlaying ? 'إيقاف' : 'استماع'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: Periodic Azkar & Reminders Section (GRANULAR FREQUENCY & DYNAMIC AUDIO MAPPING) */}
          <div className="athar-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#262012] border border-[#C8A24A]/50 text-[#E6C66E]">
                  <Layers size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white">الأذكار والتذكيرات الإيمانية الدورية</h4>
                  <p className="text-[11px] text-[#C4B998] mt-0.5">
                    تحكم مستقل في تكرار كل فئة، كتم أو تفعيل صوتها، وربطها المباشر بالصفحات والتلاوات
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Category 1: Quran Reminders */}
              <div className="p-3.5 rounded-2xl bg-[#0F0D09] border border-[#C8A24A]/30 space-y-3">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#C8A24A]/20">
                  <div>
                    <span className="text-white font-extrabold block text-xs">📖 آيات القرآن الكريم والتدبر («اقرأ لو آية»)</span>
                    <span className="text-[10px] text-[#E6C66E] block mt-0.5">
                      توجيه فوري لصفحة السورة والآية المحددة مع تلاوة خاشعة عشوائية منتقاة تلقائياً
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateNotifPreferences(
                          { quranRemindersEnabled: !notifPrefs.quranRemindersEnabled },
                          !notifPrefs.quranRemindersEnabled ? 'تم تفعيل تذكيرات القرآن ✓' : 'تم إيقاف تذكيرات القرآن'
                        )
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border cursor-pointer ${
                        notifPrefs.quranRemindersEnabled ? 'bg-[#C8A24A] border-[#F3E5AB]' : 'bg-[#1B1812] border-[#C8A24A]/35'
                      }`}
                      aria-label="تفعيل تذكيرات القرآن"
                    >
                      <div
                        className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                          notifPrefs.quranRemindersEnabled ? '-translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Direct Test Buttons for Quran */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10.5px] text-[#A69977] font-bold">تجربة التنبيه:</span>
                  <button
                    type="button"
                    onClick={handleTestQuranAyah}
                    className="px-2.5 py-1 rounded-lg bg-[#241D10] hover:bg-[#302615] border border-[#C8A24A]/40 text-[#FFF2C2] text-[10.5px] font-bold flex items-center gap-1 active:scale-95 transition-all"
                  >
                    <Play size={10} className="text-[#E6C66E]" />
                    <span>آية وتلاوة (اقرأ لو آية)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTestWird}
                    className="px-2.5 py-1 rounded-lg bg-[#241D10] hover:bg-[#302615] border border-[#C8A24A]/40 text-[#FFF2C2] text-[10.5px] font-bold flex items-center gap-1 active:scale-95 transition-all"
                  >
                    <Play size={10} className="text-[#E6C66E]" />
                    <span>الورد القرآني اليومي</span>
                  </button>
                </div>

                {notifPrefs.quranRemindersEnabled && (
                  <div className="space-y-2.5">
                    {/* Audio Enablement for Quran */}
                    <div className="p-2.5 rounded-xl bg-[#14120D] border border-[#C8A24A]/20 flex items-center justify-between">
                      <span className="text-[#F3E5AB] font-bold text-xs">تشغيل صوت التلاوة للقرآن:</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateNotifPreferences(
                            { quranAudioEnabled: !notifPrefs.quranAudioEnabled },
                            notifPrefs.quranAudioEnabled ? 'تم كتم صوت تذكيرات القرآن' : 'تم تفعيل صوت تذكيرات القرآن ✓'
                          )
                        }
                        className={`px-3 py-1 rounded-lg text-[11px] font-extrabold border ${
                          notifPrefs.quranAudioEnabled
                            ? 'bg-[#C8A24A]/30 text-[#E6C66E] border-[#E6C66E]/50'
                            : 'bg-stone-900 text-stone-400 border-stone-700'
                        }`}
                      >
                        {notifPrefs.quranAudioEnabled ? 'صوت مفعّل 🔊' : 'صامت 🔕'}
                      </button>
                    </div>

                    {/* Independent Interval Frequency for Quran */}
                    <div>
                      <span className="text-[#C4B998] block mb-1 font-bold text-[11px]">معدل تكرار آيات القرآن:</span>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                        {[
                          { val: 15, lbl: '15 د' },
                          { val: 30, lbl: '30 د' },
                          { val: 60, lbl: 'ساعة' },
                          { val: 120, lbl: 'ساعتان' },
                          { val: 180, lbl: '3 ساعات' },
                        ].map((item) => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() =>
                              updateNotifPreferences(
                                { intervalQuranMinutes: item.val },
                                `تم تعيين تكرار القرآن: كل ${item.lbl} ✓`
                              )
                            }
                            className={`py-1.5 rounded-xl border text-center font-bold text-[11px] transition-all ${
                              (notifPrefs.intervalQuranMinutes || 60) === item.val
                                ? 'bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-black border-[#FFF2C2]'
                                : 'bg-[#18140D] border-[#C8A24A]/25 text-[#C4B998] hover:text-white'
                            }`}
                          >
                            {item.lbl}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Category 2: Azkar & Tasbeeh Reminders */}
              <div className="p-3.5 rounded-2xl bg-[#0F0D09] border border-[#C8A24A]/30 space-y-3">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#C8A24A]/20">
                  <div>
                    <span className="text-white font-extrabold block text-xs">📿 الأذكار والتسبيح النبوي المضاعف</span>
                    <span className="text-[10px] text-[#E6C66E] block mt-0.5">
                      مقترن بـ 14 مقطع صوتي نقي موثق بصوت الشيخ مشاري العفاسي وحصن المسلم
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateNotifPreferences(
                        { azkarRemindersEnabled: !notifPrefs.azkarRemindersEnabled },
                        !notifPrefs.azkarRemindersEnabled ? 'تم تفعيل تذكيرات الأذكار ✓' : 'تم إيقاف تذكيرات الأذكار'
                      )
                    }
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border cursor-pointer ${
                      notifPrefs.azkarRemindersEnabled ? 'bg-[#C8A24A] border-[#F3E5AB]' : 'bg-[#1B1812] border-[#C8A24A]/35'
                    }`}
                    aria-label="تفعيل تذكيرات الأذكار"
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                        notifPrefs.azkarRemindersEnabled ? '-translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Direct Test Buttons for Azkar */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10.5px] text-[#A69977] font-bold">تجربة التنبيه:</span>
                  <button
                    type="button"
                    onClick={() => handleTestDhikr()}
                    className="px-2.5 py-1 rounded-lg bg-[#241D10] hover:bg-[#302615] border border-[#C8A24A]/40 text-[#FFF2C2] text-[10.5px] font-bold flex items-center gap-1 active:scale-95 transition-all"
                  >
                    <Play size={10} className="text-[#E6C66E]" />
                    <span>الذكر والتسبيح</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTestMorningAdhkar}
                    className="px-2.5 py-1 rounded-lg bg-[#241D10] hover:bg-[#302615] border border-[#C8A24A]/40 text-[#FFF2C2] text-[10.5px] font-bold flex items-center gap-1 active:scale-95 transition-all"
                  >
                    <Play size={10} className="text-[#E6C66E]" />
                    <span>أذكار الصباح 🌅</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTestEveningAdhkar}
                    className="px-2.5 py-1 rounded-lg bg-[#241D10] hover:bg-[#302615] border border-[#C8A24A]/40 text-[#FFF2C2] text-[10.5px] font-bold flex items-center gap-1 active:scale-95 transition-all"
                  >
                    <Play size={10} className="text-[#E6C66E]" />
                    <span>أذكار المساء 🌙</span>
                  </button>
                </div>

                {notifPrefs.azkarRemindersEnabled && (
                  <div className="space-y-2.5">
                    {/* Audio Enablement for Azkar */}
                    <div className="p-2.5 rounded-xl bg-[#14120D] border border-[#C8A24A]/20 flex items-center justify-between">
                      <span className="text-[#F3E5AB] font-bold text-xs">تشغيل صوت الأذكار:</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateNotifPreferences(
                            { azkarAudioEnabled: !notifPrefs.azkarAudioEnabled },
                            notifPrefs.azkarAudioEnabled ? 'تم كتم صوت الأذكار' : 'تم تفعيل صوت الأذكار ✓'
                          )
                        }
                        className={`px-3 py-1 rounded-lg text-[11px] font-extrabold border ${
                          notifPrefs.azkarAudioEnabled
                            ? 'bg-[#C8A24A]/30 text-[#E6C66E] border-[#E6C66E]/50'
                            : 'bg-stone-900 text-stone-400 border-stone-700'
                        }`}
                      >
                        {notifPrefs.azkarAudioEnabled ? 'صوت مفعّل 🔊' : 'صامت 🔕'}
                      </button>
                    </div>

                    {/* Independent Interval Frequency for Azkar */}
                    <div>
                      <span className="text-[#C4B998] block mb-1 font-bold text-[11px]">معدل تكرار الأذكار:</span>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                        {[
                          { val: 15, lbl: '15 د' },
                          { val: 30, lbl: '30 د' },
                          { val: 45, lbl: '45 د' },
                          { val: 60, lbl: 'ساعة' },
                          { val: 120, lbl: 'ساعتان' },
                        ].map((item) => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() =>
                              updateNotifPreferences(
                                { intervalAzkarMinutes: item.val },
                                `تم تعيين تكرار الأذكار: كل ${item.lbl} ✓`
                              )
                            }
                            className={`py-1.5 rounded-xl border text-center font-bold text-[11px] transition-all ${
                              (notifPrefs.intervalAzkarMinutes || 30) === item.val
                                ? 'bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-black border-[#FFF2C2]'
                                : 'bg-[#18140D] border-[#C8A24A]/25 text-[#C4B998] hover:text-white'
                            }`}
                          >
                            {item.lbl}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Fast audio track selector from verified dhikrs */}
                    <div className="pt-1">
                      <span className="text-[#C4B998] block mb-1.5 font-bold text-[11px]">
                        نموذج من أصوات الأذكار المعتمدة للتنبيه ({VERIFIED_DHIKR_REMINDERS.length} ذكر مسجل):
                      </span>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {VERIFIED_DHIKR_REMINDERS.slice(0, 5).map((item) => {
                          const isPlaying = previewingAudioUrl === item.audioUrl;
                          return (
                            <div
                              key={item.id}
                              className="p-2 rounded-xl bg-[#14120D] border border-[#C8A24A]/20 flex items-center justify-between gap-2"
                            >
                              <div className="flex-1 min-w-0">
                                <span className="text-white font-bold text-[11px] block truncate">{item.title}</span>
                                <span className="text-[#A69977] text-[10px] block truncate">{item.arabicText}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleAudioPreview(item.audioUrl)}
                                className={`px-2 py-1 rounded-lg border text-[10px] flex items-center gap-1 font-bold shrink-0 ${
                                  isPlaying
                                    ? 'bg-[#E6C66E] text-black border-white'
                                    : 'bg-[#1F1A12] border-[#C8A24A]/30 text-[#E6C66E]'
                                }`}
                              >
                                {isPlaying ? <StopSquare size={11} /> : <Play size={11} />}
                                <span>{isPlaying ? 'إيقاف' : 'استماع'}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Category 3: Salawat Reminders */}
              <div className="p-3.5 rounded-2xl bg-[#0F0D09] border border-[#C8A24A]/30 space-y-3">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#C8A24A]/20">
                  <div>
                    <span className="text-white font-extrabold block text-xs">💚 الصلاة والسلام على النبي ﷺ</span>
                    <span className="text-[10px] text-[#E6C66E] block mt-0.5">
                      نغمة الصلاة الإبراهيمية المباركة العذبة
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateNotifPreferences(
                        { generalRemindersEnabled: !notifPrefs.generalRemindersEnabled },
                        !notifPrefs.generalRemindersEnabled ? 'تم تفعيل الصلاة على النبي ﷺ ✓' : 'تم إيقاف الصلاة على النبي ﷺ'
                      )
                    }
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border cursor-pointer ${
                      notifPrefs.generalRemindersEnabled ? 'bg-[#C8A24A] border-[#F3E5AB]' : 'bg-[#1B1812] border-[#C8A24A]/35'
                    }`}
                    aria-label="تفعيل الصلاة على النبي"
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                        notifPrefs.generalRemindersEnabled ? '-translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Direct Test Button for Salawat */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10.5px] text-[#A69977] font-bold">تجربة التنبيه:</span>
                  <button
                    type="button"
                    onClick={handleTestSalawat}
                    className="px-2.5 py-1 rounded-lg bg-[#241D10] hover:bg-[#302615] border border-[#C8A24A]/40 text-[#FFF2C2] text-[10.5px] font-bold flex items-center gap-1 active:scale-95 transition-all"
                  >
                    <Play size={10} className="text-[#E6C66E]" />
                    <span>الصلاة على النبي ﷺ</span>
                  </button>
                </div>

                {notifPrefs.generalRemindersEnabled && (
                  <div className="space-y-2.5">
                    <div className="p-2.5 rounded-xl bg-[#14120D] border border-[#C8A24A]/20 flex items-center justify-between">
                      <span className="text-[#F3E5AB] font-bold text-xs">تشغيل صوت الصلاة على النبي:</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateNotifPreferences(
                            { salawatAudioEnabled: !notifPrefs.salawatAudioEnabled },
                            notifPrefs.salawatAudioEnabled ? 'تم كتم صوت الصلاة على النبي' : 'تم تفعيل صوت الصلاة على النبي ✓'
                          )
                        }
                        className={`px-3 py-1 rounded-lg text-[11px] font-extrabold border ${
                          notifPrefs.salawatAudioEnabled
                            ? 'bg-[#C8A24A]/30 text-[#E6C66E] border-[#E6C66E]/50'
                            : 'bg-stone-900 text-stone-400 border-stone-700'
                        }`}
                      >
                        {notifPrefs.salawatAudioEnabled ? 'صوت مفعّل 🔊' : 'صامت 🔕'}
                      </button>
                    </div>

                    <div>
                      <span className="text-[#C4B998] block mb-1 font-bold text-[11px]">معدل التكرار:</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { val: 15, lbl: '15 د' },
                          { val: 30, lbl: '30 د' },
                          { val: 45, lbl: '45 د' },
                          { val: 60, lbl: 'ساعة' },
                        ].map((item) => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() =>
                              updateNotifPreferences(
                                { intervalSalawatMinutes: item.val },
                                `تم تعيين تكرار الصلاة على النبي: كل ${item.lbl} ✓`
                              )
                            }
                            className={`py-1.5 rounded-xl border text-center font-bold text-[11px] transition-all ${
                              (notifPrefs.intervalSalawatMinutes || 45) === item.val
                                ? 'bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-black border-[#FFF2C2]'
                                : 'bg-[#18140D] border-[#C8A24A]/25 text-[#C4B998] hover:text-white'
                            }`}
                          >
                            {item.lbl}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Category 4: Parents Supplication & Duty */}
              <div className="p-3.5 rounded-2xl bg-[#0F0D09] border border-[#C8A24A]/30 space-y-3">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#C8A24A]/20">
                  <div>
                    <span className="text-white font-extrabold block text-xs">🤍 بر الوالدين وصلة الرحم</span>
                    <span className="text-[10px] text-[#E6C66E] block mt-0.5">
                      توجيه مباشر لصفحة بر الوالدين بالسكينة وتشغيل دعاء «رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا»
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateNotifPreferences(
                        { parentsDutyEnabled: !notifPrefs.parentsDutyEnabled },
                        !notifPrefs.parentsDutyEnabled ? 'تم تفعيل تذكيرات بر الوالدين ✓' : 'تم إيقاف تذكيرات بر الوالدين'
                      )
                    }
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border cursor-pointer ${
                      notifPrefs.parentsDutyEnabled ? 'bg-[#C8A24A] border-[#F3E5AB]' : 'bg-[#1B1812] border-[#C8A24A]/35'
                    }`}
                    aria-label="تفعيل تذكير بر الوالدين"
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                        notifPrefs.parentsDutyEnabled ? '-translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Direct Test Button for Parents */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10.5px] text-[#A69977] font-bold">تجربة التنبيه:</span>
                  <button
                    type="button"
                    onClick={handleTestParents}
                    className="px-2.5 py-1 rounded-lg bg-[#241D10] hover:bg-[#302615] border border-[#C8A24A]/40 text-[#FFF2C2] text-[10.5px] font-bold flex items-center gap-1 active:scale-95 transition-all"
                  >
                    <Play size={10} className="text-[#E6C66E]" />
                    <span>تنبيه ودعاء بر الوالدين</span>
                  </button>
                </div>

                {notifPrefs.parentsDutyEnabled && (
                  <div className="space-y-2.5">
                    <div className="p-2.5 rounded-xl bg-[#14120D] border border-[#C8A24A]/20 flex items-center justify-between">
                      <span className="text-[#F3E5AB] font-bold text-xs">تشغيل صوت دعاء الوالدين:</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateNotifPreferences(
                            { parentsAudioEnabled: !notifPrefs.parentsAudioEnabled },
                            notifPrefs.parentsAudioEnabled ? 'تم كتم صوت دعاء الوالدين' : 'تم تفعيل صوت دعاء الوالدين ✓'
                          )
                        }
                        className={`px-3 py-1 rounded-lg text-[11px] font-extrabold border ${
                          notifPrefs.parentsAudioEnabled
                            ? 'bg-[#C8A24A]/30 text-[#E6C66E] border-[#E6C66E]/50'
                            : 'bg-stone-900 text-stone-400 border-stone-700'
                        }`}
                      >
                        {notifPrefs.parentsAudioEnabled ? 'صوت مفعّل 🔊' : 'صامت 🔕'}
                      </button>
                    </div>

                    <div>
                      <span className="text-[#C4B998] block mb-1 font-bold text-[11px]">معدل التكرار:</span>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                        {[
                          { val: 120, lbl: 'ساعتان' },
                          { val: 240, lbl: '4 ساعات' },
                          { val: 360, lbl: '6 ساعات' },
                          { val: 1440, lbl: 'يومياً (موصى)' },
                        ].map((item) => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() =>
                              updateNotifPreferences(
                                { intervalParentsMinutes: item.val },
                                `تم تعيين تكرار بر الوالدين: ${item.lbl} ✓`
                              )
                            }
                            className={`py-1.5 rounded-xl border text-center font-bold text-[11px] transition-all ${
                              (notifPrefs.intervalParentsMinutes || 240) === item.val
                                ? 'bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-black border-[#FFF2C2]'
                                : 'bg-[#18140D] border-[#C8A24A]/25 text-[#C4B998] hover:text-white'
                            }`}
                          >
                            {item.lbl}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Category 5: Daily Quran Wird Reminders */}
              <div className="p-3.5 rounded-2xl bg-[#0F0D09] border border-[#C8A24A]/30 space-y-3">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#C8A24A]/20">
                  <div>
                    <span className="text-white font-extrabold block text-xs">📜 الورد اليومي لقراءة القرآن الكريم</span>
                    <span className="text-[10px] text-[#E6C66E] block mt-0.5">
                      تنبيه مبارك للالتزام بوردك اليومي من كتاب الله، بصوت تلاوة «وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا»
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateNotifPreferences(
                        { wirdRemindersEnabled: !notifPrefs.wirdRemindersEnabled },
                        !notifPrefs.wirdRemindersEnabled ? 'تم تفعيل تذكير الورد اليومي ✓' : 'تم إيقاف تذكير الورد اليومي'
                      )
                    }
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border cursor-pointer ${
                      notifPrefs.wirdRemindersEnabled ? 'bg-[#C8A24A] border-[#F3E5AB]' : 'bg-[#1B1812] border-[#C8A24A]/35'
                    }`}
                    aria-label="تفعيل تذكير الورد القرآني"
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                        notifPrefs.wirdRemindersEnabled ? '-translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Direct Test & Preview Audio Buttons for Wird */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10.5px] text-[#A69977] font-bold">تجربة التنبيه:</span>
                  <button
                    type="button"
                    onClick={handleTestWird}
                    className="px-2.5 py-1 rounded-lg bg-[#241D10] hover:bg-[#302615] border border-[#C8A24A]/40 text-[#FFF2C2] text-[10.5px] font-bold flex items-center gap-1 active:scale-95 transition-all"
                  >
                    <Play size={10} className="text-[#E6C66E]" />
                    <span>تجربة الورد القرآني</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleAudioPreview('/audio/wird.mp3')}
                    className={`px-2.5 py-1 rounded-lg border text-[10.5px] font-bold flex items-center gap-1 transition-all ${
                      previewingAudioUrl === '/audio/wird.mp3'
                        ? 'bg-[#E6C66E] text-black border-white'
                        : 'bg-[#18140D] border-[#C8A24A]/40 text-[#E6C66E] hover:text-white'
                    }`}
                  >
                    {previewingAudioUrl === '/audio/wird.mp3' ? <StopSquare size={10} /> : <Play size={10} />}
                    <span>{previewingAudioUrl === '/audio/wird.mp3' ? 'إيقاف الصوت' : 'استماع لصوت «وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا»'}</span>
                  </button>
                </div>

                {notifPrefs.wirdRemindersEnabled && (
                  <div className="space-y-2.5">
                    {/* Audio Enablement for Wird */}
                    <div className="p-2.5 rounded-xl bg-[#14120D] border border-[#C8A24A]/20 flex items-center justify-between">
                      <div>
                        <span className="text-[#F3E5AB] font-bold text-xs block">تشغيل صوت التلاوة للورد:</span>
                        <span className="text-[10px] text-[#C4B998] block mt-0.5">
                          تلاوة خاشعة: ﴿وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا﴾ بصوت الشيخ مشاري العفاسي
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateNotifPreferences(
                            { wirdAudioEnabled: !notifPrefs.wirdAudioEnabled },
                            notifPrefs.wirdAudioEnabled ? 'تم كتم صوت تذكير الورد' : 'تم تفعيل صوت تذكير الورد ✓'
                          )
                        }
                        className={`px-3 py-1 rounded-lg text-[11px] font-extrabold border ${
                          notifPrefs.wirdAudioEnabled
                            ? 'bg-[#C8A24A]/30 text-[#E6C66E] border-[#E6C66E]/50'
                            : 'bg-stone-900 text-stone-400 border-stone-700'
                        }`}
                      >
                        {notifPrefs.wirdAudioEnabled ? 'صوت مفعّل 🔊' : 'صامت 🔕'}
                      </button>
                    </div>

                    {/* Independent Interval Frequency for Wird */}
                    <div>
                      <span className="text-[#C4B998] block mb-1 font-bold text-[11px]">معدل تكرار تذكير الورد:</span>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                        {[
                          { val: 60, lbl: 'ساعة' },
                          { val: 120, lbl: 'ساعتان' },
                          { val: 240, lbl: '4 ساعات' },
                          { val: 360, lbl: '6 ساعات' },
                          { val: 1440, lbl: 'يومياً (موصى)' },
                        ].map((item) => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() =>
                              updateNotifPreferences(
                                { intervalWirdMinutes: item.val },
                                `تم تعيين تكرار الورد: كل ${item.lbl} ✓`
                              )
                            }
                            className={`py-1.5 rounded-xl border text-center font-bold text-[11px] transition-all ${
                              (notifPrefs.intervalWirdMinutes || 1440) === item.val
                                ? 'bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-black border-[#FFF2C2]'
                                : 'bg-[#18140D] border-[#C8A24A]/25 text-[#C4B998] hover:text-white'
                            }`}
                          >
                            {item.lbl}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CARD 3: Audio & System Control Section */}
          <div className="athar-card space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#262012] border border-[#C8A24A]/50 text-[#E6C66E]">
                  <Sliders size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white">التحكم الصوتي العام ونظام الاهتزاز</h4>
                  <p className="text-[11px] text-[#C4B998] mt-0.5">
                    التحكم في شدة الصوت، كتم التنبيهات، تجاوز وضع عدم الإزعاج (DND)، ونمط الاهتزاز
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* Master Mute Toggle */}
              <div className="p-3.5 rounded-2xl bg-[#0F0D09] border border-[#C8A24A]/25 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-extrabold text-xs">كتم الصوت العام للتنبيهات (Master Mute)</span>
                    <span className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold border ${
                      notifPrefs.masterMuted
                        ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                        : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                    }`}>
                      {notifPrefs.masterMuted ? 'الصوت مكتوم ✕' : 'الصوت مفعّل 🔊'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#C4B998] leading-relaxed">
                    كتم أصوات الإشعارات والأذان فوراً مع الحفاظ على ظهور الإشعارات وشاشة الأذان على الشاشة.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateNotifPreferences(
                      { masterMuted: !notifPrefs.masterMuted },
                      !notifPrefs.masterMuted ? 'تم كتم أصوات التنبيهات العامة' : 'تم تشغيل أصوات التنبيهات العامة ✓'
                    )
                  }
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border cursor-pointer ${
                    notifPrefs.masterMuted ? 'bg-rose-600 border-rose-300' : 'bg-[#1B1812] border-[#C8A24A]/35'
                  }`}
                  aria-label="تبديل كتم الصوت العام"
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                      notifPrefs.masterMuted ? '-translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Master Volume Slider */}
              <div className="p-3.5 rounded-2xl bg-[#120F0A] border border-[#C8A24A]/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#F3E5AB] font-extrabold text-xs flex items-center gap-1.5">
                    <Volume2 size={15} className="text-[#E6C66E]" />
                    <span>مستوى الصوت العام للإشعارات:</span>
                  </span>
                  <span className="text-[#E6C66E] font-mono font-bold text-xs">{notifPrefs.masterVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={notifPrefs.masterVolume}
                  onChange={(e) => updateNotifPreferences({ masterVolume: Number(e.target.value) })}
                  className="w-full accent-[#E6C66E] cursor-pointer"
                />
              </div>

              {/* DND Bypass Toggle */}
              <div className="p-3.5 rounded-2xl bg-[#0F0D09] border border-[#C8A24A]/25 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-extrabold text-xs">تجاوز وضع عدم الإزعاج (DND Bypass)</span>
                    <span className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold border ${
                      notifPrefs.dndBypass
                        ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                        : 'bg-stone-900 text-stone-400 border-stone-700'
                    }`}>
                      {notifPrefs.dndBypass ? 'نشط للأذان والمنبه' : 'معطل'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#C4B998] leading-relaxed">
                    السماح بتنبيهات الأذان والمنبه الإسلامي حتى لو كان هاتفك مضبوطاً على وضع الصامت أو عدم الإزعاج.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateNotifPreferences(
                      { dndBypass: !notifPrefs.dndBypass },
                      !notifPrefs.dndBypass ? 'تم تفعيل تجاوز عدم الإزعاج للأذان ✓' : 'تم إيقاف تجاوز عدم الإزعاج'
                    )
                  }
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border cursor-pointer ${
                    notifPrefs.dndBypass ? 'bg-[#C8A24A] border-[#F3E5AB]' : 'bg-[#1B1812] border-[#C8A24A]/35'
                  }`}
                  aria-label="تبديل تجاوز وضع عدم الإزعاج"
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                      notifPrefs.dndBypass ? '-translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Vibration Pattern Selector */}
              <div className="p-3.5 rounded-2xl bg-[#120F0A] border border-[#C8A24A]/30 space-y-2">
                <span className="text-[#F3E5AB] font-extrabold block text-xs flex items-center gap-1.5">
                  <Vibrate size={15} className="text-[#E6C66E]" />
                  <span>نمط الاهتزاز عند وصول التنبيه:</span>
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {VIBRATION_PATTERNS.map((p) => {
                    const isSelected = notifPrefs.vibrationPattern === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          updateNotifPreferences({ vibrationPattern: p.id as any }, `تم اختيار نمط الاهتزاز: ${p.name} ✓`)
                        }
                        className={`p-2.5 rounded-xl border text-right transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#2A2212] to-[#16130B] border-[#E6C66E] text-white font-extrabold shadow-sm'
                            : 'bg-[#0B0A08] border-[#C8A24A]/20 text-[#C4B998]'
                        }`}
                      >
                        <span className="block text-xs font-bold text-[#F3E5AB]">{p.name}</span>
                        <span className="block text-[9.5px] text-[#A69977] mt-0.5">{p.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Direct Test Button for Smart Silence */}
              <div className="pt-2 border-t border-[#C8A24A]/20 flex items-center justify-between">
                <span className="text-[#C4B998] font-bold text-xs">فحص وتجربة وضع السكون أثناء الصلاة:</span>
                <button
                  type="button"
                  onClick={handleTestSmartSilence}
                  className="px-3 py-1.5 rounded-xl bg-[#241D10] hover:bg-[#332714] border border-[#C8A24A]/40 text-[#FFF2C2] font-bold text-xs flex items-center gap-1.5 hover:border-[#E6C66E] active:scale-95 transition-all"
                >
                  <Play size={11} className="text-[#E6C66E]" />
                  <span>تجربة السكون الذكي 🔕</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ONGOING PRAYER NOTIFICATION & HOME SCREEN WIDGETS SECTION */}
      {/* ========================================================================= */}
      {(showSection('widget') || showSection('all')) && (
        <div className="space-y-4">
          {/* Ongoing Notification Bar Card */}
          <div className="athar-card relative overflow-hidden space-y-3.5 border border-[#C8A24A]/50 bg-gradient-to-b from-[#18130B] via-[#0E0C08] to-[#070605] shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/25 gap-2 flex-wrap">
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
                    <h3 className="text-sm font-extrabold text-white">إشعار أوقات الصلاة الدائم في شريط الحالة</h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold border ${
                        isOngoingNotificationEnabled
                          ? 'bg-[#C8A24A]/20 text-[#FFF2C2] border-[#E6C66E]/50'
                          : 'bg-[#15130F] text-[#8A8068] border-[#C8A24A]/20'
                      }`}
                    >
                      {isOngoingNotificationEnabled ? 'مثبت ونشط بالخلفية ✓' : 'متوقف'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#C4B998] mt-0.5 leading-relaxed">
                    شريط مستمر في لوحة الإشعارات وشاشة القفل لعرض مواقيت الصلوات الخمس والعد التنازلي الحي
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestOngoingBar}
                  className="px-2.5 py-1.5 rounded-xl bg-[#241D10] hover:bg-[#332714] border border-[#C8A24A]/40 text-[#FFF2C2] font-bold text-xs flex items-center gap-1 active:scale-95 transition-all shadow"
                  title="تجربة فورية لشريط المواقيت"
                >
                  <Play size={11} className="text-[#E6C66E]" />
                  <span>تجربة الشريط</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleOngoingNotification}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border cursor-pointer ${
                    isOngoingNotificationEnabled ? 'bg-[#C8A24A] border-[#F3E5AB]' : 'bg-[#1B1812] border-[#C8A24A]/35'
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
            </div>
          </div>

          {/* Android Home Screen Widget Customizer */}
          <div className="athar-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/25 gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#2D2312] to-[#16120A] border border-[#E6C66E]/60 text-[#E6C66E] shadow-md">
                  <LayoutGrid size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <span>ودجت الشاشة الرئيسية (Home Screen Widget)</span>
                  </h3>
                  <p className="text-[11px] text-[#A69977] mt-0.5">
                    تخصيص كامل لمظهر ومواقيت وبطاقات ودجت تطبيق أثر على سطح مكتب هاتفك
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleForceSyncWidget}
                className="athar-btn-outline px-3 py-1.5 text-xs flex items-center gap-1.5 font-bold"
              >
                <RefreshCw size={13} />
                <span>مزامنة الودجت الآن</span>
              </button>
            </div>

            {/* Widget Style Selection */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleUpdateWidgetCustomization({ style: 'royal_card' })}
                className={`p-3 rounded-2xl border text-right transition-all ${
                  widgetCustomization.style === 'royal_card'
                    ? 'bg-gradient-to-r from-[#241E11] to-[#14110A] border-[#E6C66E] text-white font-extrabold'
                    : 'bg-[#0B0A08] border-[#C8A24A]/20 text-[#C4B998]'
                }`}
              >
                <span className="text-xs font-bold block text-[#F3E5AB]">البطاقة الملكية الكلاسيكية</span>
                <span className="text-[10px] text-[#A69977] block mt-0.5">عرض الصلوات الخمس والعد التنازلي</span>
              </button>
              <button
                type="button"
                onClick={() => handleUpdateWidgetCustomization({ style: 'compact' })}
                className={`p-3 rounded-2xl border text-right transition-all ${
                  widgetCustomization.style === 'compact'
                    ? 'bg-gradient-to-r from-[#241E11] to-[#14110A] border-[#E6C66E] text-white font-extrabold'
                    : 'bg-[#0B0A08] border-[#C8A24A]/20 text-[#C4B998]'
                }`}
              >
                <span className="text-xs font-bold block text-[#F3E5AB]">الودجت المضغوط الصغير</span>
                <span className="text-[10px] text-[#A69977] block mt-0.5">مساحة صغيرة للصلاة القادمة فقط</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VOICE ASSISTANT & SMART ALARM SECTION */}
      {/* ========================================================================= */}
      {(showSection('audio_system') || showSection('all')) && (
        <div className="space-y-4">
          {/* Smart Islamic Wake-Up Alarm */}
          <div className="athar-card space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#262012] border border-[#C8A24A]/50 text-[#E6C66E]">
                  <AlarmClock size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">إعدادات المنبه الإسلامي الذكي</h3>
                  <p className="text-[11px] text-[#C4B998] mt-0.5">
                    تخصيص صوت «الصلاة خير من النوم»، التدرج الصوتي، واستيقاظ الفجر
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

            {/* In-Card Instant Test Bar for Islamic Alarm */}
            <div className="p-3 rounded-2xl bg-[#141009] border border-[#C8A24A]/30 flex items-center justify-between gap-3">
              <div>
                <span className="text-white font-bold block text-xs flex items-center gap-1.5">
                  <Sparkles size={13} className="text-[#E6C66E]" />
                  <span>فحص وتجربة المنبه الإسلامي الذكي فوراً:</span>
                </span>
                <span className="text-[10px] text-[#C4B998] block mt-0.5">
                  إطلاق نداء الفجر والتهجد واختبار صوت «الصلاة خير من النوم» عبر AtharNotificationManager
                </span>
              </div>
              <button
                type="button"
                onClick={handleTestSmartAlarm}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-black font-extrabold text-xs flex items-center gap-1.5 shadow active:scale-95 shrink-0 hover:brightness-105 transition-all"
              >
                <Play size={11} fill="currentColor" />
                <span>تجربة المنبه</span>
              </button>
            </div>

            <div className="space-y-2 text-xs">
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
                          const updated = AlarmService.saveSystemSettings({ defaultSoundId: snd.id });
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
                        <div className="text-[10px] text-[#C4B998] mt-0.5">{snd.subtitle}</div>
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
                        className={`p-1.5 rounded-lg border text-xs font-bold ${
                          isPrev ? 'bg-[#E6C66E] text-black border-white' : 'bg-[#17140D] border-[#C8A24A]/40 text-[#E6C66E]'
                        }`}
                      >
                        {isPrev ? <StopSquare size={13} /> : <Play size={13} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Voice Assistant Card */}
          <div className="athar-card space-y-3.5">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#C8A24A]/25">
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

            <div className="space-y-2.5 text-xs">
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
                      ? 'النظام الصوتي نشط الآن ويمكنك التحدث للاستفسار عن مواقيت الصلاة والأذكار.'
                      : 'النظام الصوتي متوقف وعلامة الميكروفون مخفية تماماً.'}
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
                    voiceSettings.enabled ? 'bg-[#C8A24A] border-[#F3E5AB]' : 'bg-[#1B1812] border-[#C8A24A]/35'
                  }`}
                  aria-label="تفعيل أو إيقاف نظام المساعد الصوتي"
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                      voiceSettings.enabled ? '-translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. QURAN RECITER & PRAYER CALCULATION METHODS */}
      {/* ========================================================================= */}
      {(showSection('quran_prayer') || showSection('all')) && (
        <div className="space-y-4">
          {/* Quran Reciter Card */}
          <div className="athar-card space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#262012] border border-[#C8A24A]/50 text-[#E6C66E]">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">قارئ القرآن المعتمد</h3>
                  <p className="text-[11px] text-[#C4B998] mt-0.5">
                    يُعتمد صوته في المصحف الصوتي وتذكيرات الآيات والورد
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
                      saveSettings({ ...settings, selectedReciterId: r.id }, `تم اختيار القارئ: ${r.nameArabic} ✓`)
                    }
                    className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs text-right transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#2A2212] to-[#16130B] border-[#E6C66E] text-[#F3E5AB] font-extrabold shadow-sm'
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

          {/* Astronomical Prayer Calculation Method */}
          <div className="athar-card space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#262012] border border-[#C8A24A]/50 text-[#E6C66E]">
                  <Compass size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">طريقة الحساب الفلكي للمواقيت</h3>
                  <p className="text-[11px] text-[#C4B998] mt-0.5">
                    المعيار الفلكي المعتمد لحساب زوايا الفجر والعشاء ومواقيت الصلاة بدقة
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
                        ? 'bg-gradient-to-r from-[#2A2212] to-[#16130B] border-[#E6C66E] text-[#F3E5AB] font-extrabold shadow-sm'
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

          {/* Offline-First Audio & Quran Packs */}
          <OfflineCenterCard />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. BACKUP & SYSTEM DATA MANAGEMENT */}
      {/* ========================================================================= */}
      {(showSection('backup_data') || showSection('all')) && (
        <div className="space-y-4">
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

          {/* Permissions Setup Wizard Dialog Trigger */}
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

      {/* Save Settings Confirmation Card at Bottom */}
      <div className="rounded-3xl bg-gradient-to-b from-[#1E1910] via-[#13100A] to-[#0B0A08] border border-[#C8A24A]/65 p-5 space-y-4 shadow-[0_14px_38px_rgba(0,0,0,0.92)]">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2B2313] to-[#14110A] border border-[#E6C66E]/60 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(200,162,74,0.28)]">
            <SettingsIcon size={22} className="text-[#E6C66E]" />
          </div>
          <div className="flex-1 text-right space-y-1">
            <div className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-[#E6C66E] shrink-0" />
              <span className="text-[11px] font-extrabold text-[#E6C66E] tracking-wide">
                ملخص تفضيلات أثر الملكية
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#F3E5AB] leading-snug">
              حفظ جميع الإعدادات والتفضيلات
            </h2>
            <p className="text-xs text-[#C4B998] leading-relaxed">
              يتم حفظ التعديلات تلقائياً في الذاكرة المحلية ومزامنتها فوراً مع محرك إشعارات أندرويد.
            </p>
          </div>
        </div>

        <button
          onClick={() => saveSettings(settings, 'تم حفظ جميع الإعدادات والتفضيلات بنجاح ✓')}
          className="w-full athar-btn-primary py-3 px-5 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-[0_6px_22px_rgba(200,162,74,0.4)]"
        >
          <Check size={17} />
          <span>تأكيد وحفظ الإعدادات المعتمدة</span>
        </button>
      </div>

      {/* Save Feedback Banner */}
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
