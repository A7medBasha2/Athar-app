import React, { useState, useEffect, useMemo } from 'react';
import { AppSettings, Coordinates, PrayerCalculationMethod, ObligatoryPrayerId, PrayersAdhanConfig } from '../types';
import { StorageService, AndroidWidgetCustomization, DEFAULT_PRAYERS_ADHAN_CONFIG } from '../services/storageService';
import { VERIFIED_RECITERS } from '../data/surahsData';
import { VERIFIED_DHIKR_REMINDERS, DhikrAudioReminderItem } from '../data/dhikrRemindersData';
import { LUXURY_IMAGES } from '../data/storiesAndExploreData';
import { ReminderEngine } from '../services/reminderService';
import { RoyalReminderEngine, RoyalNotificationType } from '../services/royalReminderEngine';
import { NativePermissions } from '../services/nativePermissionsBridge';
import { NativeNotificationService } from '../services/nativeNotificationService';

// Dedicated high-res Islamic thematic images tailored to each section's exact semantic meaning
import alertsImg from '../assets/images/adhan_golden_minaret_sky_1791721041473.jpg';
import prayersImg from '../assets/images/adhan_fajr_dawn_kaaba_1791728275991.jpg';
import quranImg from '../assets/images/open_quran_royal_highres_1791675898187.jpg';
import widgetsImg from '../assets/images/settings_widgets_preview_1792175823215.jpg';
import voiceImg from '../assets/images/settings_voice_aura_1792175837131.jpg';
import backupImg from '../assets/images/settings_data_vault_1792175851190.jpg';
import aboutImg from '../assets/images/golden_tree_mihrab_clean_1791731494979.jpg';
import {
  Compass,
  Clock,
  BookOpen,
  Mic,
  LayoutGrid,
  Database,
  Trash2,
  Check,
  CheckCircle2,
  Download,
  Upload,
  Info,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Layers,
  Radio,
  SlidersHorizontal,
  Flame,
  Volume2,
  VolumeX,
  Bell,
  BellRing,
  Smartphone,
  RefreshCw,
  Play,
  Pause,
  CheckSquare,
  Timer,
  Square,
  ExternalLink,
  Heart,
} from 'lucide-react';
import { PermissionsSetupWizard } from '../components/PermissionsSetupWizard';
import { VoiceAssistant, VoiceAssistantSettings } from '../services/voiceAssistantService';
import { LiveActivityService } from '../services/liveActivityService';
import { OfflineCenterCard } from '../components/OfflineCenterCard';
import { AtharBrandLogo } from '../components/AtharBrandLogo';
import { AudioService } from '../services/audioService';

const ADHAN_VOICES: { id: 'makkah' | 'madinah' | 'alaqsa' | 'alafasy'; name: string; subtitle: string }[] = [
  { id: 'alafasy', name: 'الشيخ مشاري راشد العفاسي', subtitle: 'أذان ندي خاشع برواية حفص' },
  { id: 'makkah', name: 'الحرم المكي الشريف', subtitle: 'أذان المسجد الحرام بمكة المكرمة' },
  { id: 'madinah', name: 'المسجد النبوي الشريف', subtitle: 'أذان مهيب من طيبة الطيبة' },
  { id: 'alaqsa', name: 'المسجد الأقصى المبارك', subtitle: 'أذان القدس الشريف المبارك' },
];

const CALCULATION_METHODS: { id: PrayerCalculationMethod; name: string; region: string; angle: string }[] = [
  { id: '5', name: 'الهيئة المصرية العامة للمساحة', region: 'مصر، بلاد الشام، وشمال إفريقيا', angle: 'فجر 19.5° · عشاء 17.5°' },
  { id: '4', name: 'جامعة أم القرى - مكة المكرمة', region: 'المملكة العربية السعودية والخليج', angle: 'فجر 18.5° · عشاء +90 دقيقة' },
  { id: '3', name: 'رابطة العالم الإسلامي', region: 'أوروبا والأمريكتين ومعظم دول العالم', angle: 'فجر 18° · عشاء 17°' },
  { id: '1', name: 'جامعة العلوم الإسلامية بكراتشي', region: 'باكستان، الهند، وأفغانستان وبنغلاديش', angle: 'فجر 18° · عشاء 18°' },
  { id: '16', name: 'الهيئة العامة للشؤون الإسلامية والأوقاف', region: 'دولة الإمارات العربية المتحدة', angle: 'فجر 18.2° · عشاء 18.2°' },
  { id: '2', name: 'الجمعية الإسلامية لأمريكا الشمالية (ISNA)', region: 'الولايات المتحدة الأمريكية وكندا', angle: 'فجر 15° · عشاء 15°' },
];

export interface SettingsViewProps {
  onOpenCodeInspector?: () => void;
  onOpenRemindersCenter?: () => void;
  onOpenVoiceAssistant?: () => void;
  onOpenAlarmModal?: () => void;
  onLocationChange: (coords: Coordinates) => void;
}

type SectionKey = 'alerts' | 'prayers' | 'quran' | 'widgets' | 'voice' | 'backup' | 'about';

export const SettingsView: React.FC<SettingsViewProps> = ({
  onOpenCodeInspector,
  onOpenVoiceAssistant,
  onLocationChange,
}) => {
  const [settings, setSettings] = useState<AppSettings>(() => StorageService.getSettings());
  const [voiceSettings, setVoiceSettings] = useState<VoiceAssistantSettings>(() => VoiceAssistant.getSettings());
  const [isLocationWizardOpen, setIsLocationWizardOpen] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active section view (null = directory of sections, or specific SectionKey)
  const [activeGate, setActiveGate] = useState<SectionKey | null>(null);

  // Sub-tabs: "prayer_alerts" (تنبيهات الصلاة والأذان) | "notifications" (الإشعارات الملكية والأذكار) | "location" (الموقع الفلكي)
  const [alertsTab, setAlertsTab] = useState<'prayer_alerts' | 'notifications' | 'location'>('prayer_alerts');

  // Prayers Adhan Config per prayer (Fajr, Dhuhr, Asr, Maghrib, Isha)
  const [prayersAdhanConfig, setPrayersAdhanConfig] = useState<PrayersAdhanConfig>(() =>
    StorageService.getPrayersAdhanConfig()
  );
  const [countdown5s, setCountdown5s] = useState<number | null>(null);
  const [selectedTestPrayer, setSelectedTestPrayer] = useState<ObligatoryPrayerId>('maghrib');

  // Independent 5-second countdowns for the 4 Royal alerts
  const [royalCountdowns, setRoyalCountdowns] = useState<Record<RoyalNotificationType, number | null>>({
    ayah_daily: null,
    dhikr_salawat: null,
    daily_wird: null,
    parents_birr: null,
  });

  const handleTestRoyalAlert = (type: RoyalNotificationType) => {
    if (royalCountdowns[type] !== null) {
      RoyalReminderEngine.cancelTest(type);
      setRoyalCountdowns((prev) => ({ ...prev, [type]: null }));
      return;
    }

    RoyalReminderEngine.trigger5SecondTest(type, (sec) => {
      setRoyalCountdowns((prev) => ({ ...prev, [type]: sec > 0 ? sec : null }));
    });
  };

  // Audio preview for individual Dhikr in settings
  const [previewAudioDhikrId, setPreviewAudioDhikrId] = useState<string | null>(null);
  const [previewAudioObj, setPreviewAudioObj] = useState<HTMLAudioElement | null>(null);
  const [isDhikrListExpanded, setIsDhikrListExpanded] = useState<boolean>(true);

  const handleTogglePreviewAudio = (dhikr: DhikrAudioReminderItem) => {
    if (previewAudioDhikrId === dhikr.id) {
      if (previewAudioObj) {
        previewAudioObj.pause();
        previewAudioObj.currentTime = 0;
      }
      setPreviewAudioObj(null);
      setPreviewAudioDhikrId(null);
      return;
    }
    if (previewAudioObj) {
      previewAudioObj.pause();
      previewAudioObj.currentTime = 0;
    }
    const audio = new Audio(dhikr.audioUrl);
    audio.onended = () => {
      setPreviewAudioDhikrId(null);
      setPreviewAudioObj(null);
    };
    audio.onerror = () => {
      if (dhikr.fallbackAudioUrl) {
        try {
          const fb = new Audio(dhikr.fallbackAudioUrl);
          fb.onended = () => {
            setPreviewAudioDhikrId(null);
            setPreviewAudioObj(null);
          };
          fb.play().catch(() => {});
          setPreviewAudioObj(fb);
          return;
        } catch {}
      }
      setPreviewAudioDhikrId(null);
      setPreviewAudioObj(null);
    };
    audio.play().catch(() => {});
    setPreviewAudioObj(audio);
    setPreviewAudioDhikrId(dhikr.id);
  };

  const enabledDhikrIds = useMemo(() => {
    if (settings.salawatReminder?.enabledDhikrIds && settings.salawatReminder.enabledDhikrIds.length > 0) {
      return settings.salawatReminder.enabledDhikrIds;
    }
    return VERIFIED_DHIKR_REMINDERS.map((d) => d.id);
  }, [settings.salawatReminder?.enabledDhikrIds]);

  const handleToggleDhikrItem = (id: string) => {
    let next: string[];
    if (enabledDhikrIds.includes(id)) {
      next = enabledDhikrIds.filter((x) => x !== id);
    } else {
      next = [...enabledDhikrIds, id];
    }
    const updated = {
      ...settings,
      salawatReminder: {
        ...settings.salawatReminder,
        enabledDhikrIds: next,
      },
    };
    handleUpdateSettings(updated, enabledDhikrIds.includes(id) ? 'تم تعطيل الذكر من التنبيهات' : 'تم تفعيل الذكر للتنبيهات ✓');
  };

  const handleSetAllDhikrs = (enableAll: boolean) => {
    const next = enableAll ? VERIFIED_DHIKR_REMINDERS.map((d) => d.id) : [];
    const updated = {
      ...settings,
      salawatReminder: {
        ...settings.salawatReminder,
        enabledDhikrIds: next,
      },
    };
    handleUpdateSettings(updated, enableAll ? 'تم تفعيل كافة الأذكار الـ 14 للتنبيهات ✓' : 'تم تعطيل جميع الأذكار');
  };

  // Widget settings
  const [widgetCustomization, setWidgetCustomization] = useState<AndroidWidgetCustomization>(
    () => StorageService.getWidgetCustomization()
  );

  useEffect(() => {
    setSettings(StorageService.getSettings());
    setPrayersAdhanConfig(StorageService.getPrayersAdhanConfig());

    const unsubVoice = VoiceAssistant.subscribe((vs) => {
      setVoiceSettings(vs);
    });

    const handleWidgetCustomizationChanged = (e: any) => {
      if (e.detail) setWidgetCustomization(e.detail);
    };

    const handleAdhanConfigChanged = () => {
      setPrayersAdhanConfig(StorageService.getPrayersAdhanConfig());
    };

    window.addEventListener('athar_widget_customization_changed', handleWidgetCustomizationChanged);
    window.addEventListener('athar_adhan_config_changed', handleAdhanConfigChanged);

    return () => {
      unsubVoice();
      window.removeEventListener('athar_widget_customization_changed', handleWidgetCustomizationChanged);
      window.removeEventListener('athar_adhan_config_changed', handleAdhanConfigChanged);
    };
  }, []);

  const handleTogglePrayerAdhan = (prayerId: ObligatoryPrayerId) => {
    const updatedVal = StorageService.togglePrayerAdhan(prayerId);
    setPrayersAdhanConfig(StorageService.getPrayersAdhanConfig());
    const names: Record<ObligatoryPrayerId, string> = {
      fajr: 'الفجر',
      dhuhr: 'الظهر',
      asr: 'العصر',
      maghrib: 'المغرب',
      isha: 'العشاء',
    };
    showToast(`${updatedVal ? 'تم تفعيل' : 'تم تعطيل/كتم'} أذان صلاة ${names[prayerId]}`);
  };

  const handleResetPrayersAdhan = () => {
    StorageService.resetPrayersAdhanConfig();
    setPrayersAdhanConfig(StorageService.getPrayersAdhanConfig());
    showToast('تم حذف كافة التخصيصات وإعادة ضبط تنبيهات الصلوات الخمس بنجاح ✓');
  };

  const handleTrigger5SecondAdhan = () => {
    showToast('بدأ العد التنازلي: اقفل الشاشة أو اخرج من التطبيق لتجربة التنبيه الإجباري');
    setCountdown5s(5);
    ReminderEngine.trigger5SecondDelayedTest(selectedTestPrayer, (sec) => {
      if (sec > 0) {
        setCountdown5s(sec);
      } else {
        setCountdown5s(null);
      }
    });
  };

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleUpdateSettings = (newSettings: AppSettings, message?: string) => {
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
    NativeNotificationService.initAndScheduleAll().catch(() => {});
    if (message) showToast(message);
  };

  const handleMethodSelect = (methodId: PrayerCalculationMethod) => {
    const updated: AppSettings = { ...settings, calculationMethod: methodId };
    handleUpdateSettings(updated, 'تم حفظ طريقة حساب مواقيت الصلاة بنجاح ✓');
    LiveActivityService.updateLocationAndMethod(settings.location, methodId);
  };

  const handleReciterSelect = (reciterId: string) => {
    const updated: AppSettings = { ...settings, selectedReciterId: reciterId };
    handleUpdateSettings(updated, 'تم اعتماد قارئ المصحف الشريف المفضل ✓');
  };

  const handleWidgetStyleChange = (style: 'royal_card' | 'compact') => {
    const updated: AndroidWidgetCustomization = { ...widgetCustomization, style };
    StorageService.saveWidgetCustomization(updated);
    setWidgetCustomization(updated);
    showToast(`تم تعيين مظهر الودجت: ${style === 'royal_card' ? 'البطاقة الملكية الكبيرة' : 'الشريط المدمج'}`);
  };

  const handleExportBackup = () => {
    try {
      const dump: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('athar_')) {
          dump[k] = localStorage.getItem(k);
        }
      }
      const data = JSON.stringify(dump, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `athar-royal-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('تم تصدير النسخة الاحتياطية بنجاح ✓');
    } catch {
      showToast('حدث خطأ أثناء تصدير البيانات');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (typeof parsed === 'object' && parsed !== null) {
          Object.entries(parsed).forEach(([k, v]) => {
            if (typeof v === 'string') localStorage.setItem(k, v);
          });
          setSettings(StorageService.getSettings());
          showToast('تمت استعادة كافة البيانات والختمات بنجاح ✓');
        }
      } catch {
        showToast('ملف النسخة الاحتياطية غير صالح');
      }
    };
    reader.readAsText(file);
  };

  const handleFullReset = () => {
    StorageService.clearAllData();
    setShowClearConfirm(false);
    window.location.reload();
  };

  // Active labels
  const activeMethod = useMemo(() => {
    return CALCULATION_METHODS.find((m) => m.id === settings.calculationMethod) || CALCULATION_METHODS[0];
  }, [settings.calculationMethod]);

  const activeReciter = useMemo(() => {
    return VERIFIED_RECITERS.find((r) => r.id === settings.selectedReciterId) || VERIFIED_RECITERS[0];
  }, [settings.selectedReciterId]);

  // Section items with high-res scenic Islamic imagery tailored to each section's meaning
  const sections = [
    {
      id: 'alerts' as SectionKey,
      title: 'إعدادات التنبيهات',
      subtitle: 'أذان الصلوات، أذكار اليوم، والسنن النبوية',
      icon: Bell,
      image: alertsImg,
      currentValue: settings.adhanEnabled ? 'الأذان مفعل · تكبير وتنبيه' : 'التنبيهات معطلة مؤقتاً',
      tag: 'نداء الصلاة والذكر',
    },
    {
      id: 'quran' as SectionKey,
      title: 'المصحف والقراء',
      subtitle: 'تلاوات كبار الأئمة والتخزين المحلي',
      icon: BookOpen,
      image: quranImg,
      currentValue: activeReciter.nameArabic,
      tag: 'تلاوات استوديو نقية',
    },
    {
      id: 'widgets' as SectionKey,
      title: 'الودجات والشاشة',
      subtitle: 'ودجت الشاشة الرئيسية وشريط الصلاة الحي',
      icon: LayoutGrid,
      image: widgetsImg,
      currentValue: widgetCustomization.style === 'royal_card' ? 'البطاقة الملكية الكبيرة' : 'الشريط المصغر المدمج',
      tag: 'أندرويد والأنشطة المباشرة',
    },
    {
      id: 'voice' as SectionKey,
      title: 'المساعد الصوتي',
      subtitle: 'تحكم ذكي وأوامر صوتية عربية فصيحة',
      icon: Mic,
      image: voiceImg,
      currentValue: voiceSettings.enabled ? 'مفعل ويعمل' : 'معطل مؤقتاً',
      tag: 'تفاعل فوري بدون لمس',
    },
    {
      id: 'backup' as SectionKey,
      title: 'البيانات والذاكرة',
      subtitle: 'النسخ الاحتياطي والختمات ومسح السجلات',
      icon: Database,
      image: backupImg,
      currentValue: 'تخزين مشفر محلي (Offline-First)',
      tag: 'حفظ آمن واستعادة فورية',
    },
    {
      id: 'about' as SectionKey,
      title: 'عن المنظومة',
      subtitle: 'الرؤية، الخصوصية، والوقف الإيماني',
      icon: ShieldCheck,
      image: aboutImg,
      currentValue: 'منظومة وقفية ملكية مباركة',
      tag: 'خالٍ تماماً من الإعلانات',
    },
  ];

  return (
    <div className="athar-page-container space-y-4">
      {/* 1. Grand Mihrab Sanctuary Header (Refined: Zero hard lines, Pure Logo Emblem, 'إعدادات أثر' title) */}
      <header className="relative overflow-hidden rounded-3xl border border-[#C8A24A]/30 bg-gradient-to-b from-[#18140D] via-[#0E0C08] to-[#070605] shadow-[0_15px_45px_rgba(0,0,0,0.95)] pt-6 pb-5 px-5 text-center">
        {/* Sacred Arch Photography Background */}
        <img
          src={LUXURY_IMAGES.mihrabArches}
          alt="محراب أثر"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-top opacity-15 pointer-events-none filter contrast-125"
        />
        
        {/* Smooth Vignette Gradient (No hard inner borders or cut lines) */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070605] via-[#070605]/80 to-transparent pointer-events-none" />

        {/* Diffused Ambient Golden Radiance (Smooth circular glow with zero edge clipping) */}
        <div
          className="absolute -top-10 left-1/2 -translate-x-1/2 w-72 h-36 rounded-full blur-3xl pointer-events-none opacity-40"
          style={{
            background: 'radial-gradient(circle, rgba(230, 198, 110, 0.45) 0%, rgba(200, 162, 74, 0.15) 45%, transparent 70%)',
          }}
        />

        <div className="relative z-10 flex flex-col items-center">
          {/* Pure Royal Logo Emblem Only (No Arabic or English wordmark) */}
          <div className="mb-2">
            <AtharBrandLogo size="md" showWordmark={false} showSubtitle={false} centered={true} />
          </div>

          {/* Clean Regal Title: إعدادات أثر */}
          <h1 className="text-xl sm:text-2xl font-black text-[#F5EFE0] font-arabic tracking-wide mt-1">
            إعدادات أثر
          </h1>
        </div>
      </header>

      {/* Floating Save / Toast Feedback */}
      {toastMessage && (
        <div className="sticky top-2 z-50 p-3 rounded-xl bg-gradient-to-r from-[#211B0E] via-[#2F2613] to-[#211B0E] border border-[#E6C66E]/70 text-[#F5EFE0] text-xs font-bold flex items-center gap-2.5 shadow-[0_12px_30px_rgba(0,0,0,0.9)] animate-slideDown">
          <CheckCircle2 size={16} className="text-[#E6C66E] shrink-0" />
          <span className="leading-snug">{toastMessage}</span>
        </div>
      )}

      {/* 2. Main Content: Sections Grid with Scenic External Imagery or Specific Opened Section */}
      <div className="space-y-4">
        {activeGate !== null ? (
          /* Chamber Detail View (Inside a specific section) */
          <div className="space-y-4 animate-fadeIn">
            {/* Back Button to Settings Overview */}
            <button
              onClick={() => setActiveGate(null)}
              className="w-full py-2.5 px-4 rounded-xl bg-[#14110A] border border-[#C8A24A]/30 text-[#E6C66E] hover:text-[#FFF2C2] hover:bg-[#1C170E] font-bold text-xs flex items-center gap-2 transition-all active:scale-98 shadow-sm cursor-pointer"
            >
              <ArrowRight size={15} />
              <span>العودة إلى قائمة الإعدادات</span>
            </button>

            {/* Render the selected chamber */}
            {(activeGate === 'alerts' || activeGate === 'prayers') && renderAlertsChamber()}
            {activeGate === 'quran' && renderQuranChamber()}
            {activeGate === 'widgets' && renderWidgetsChamber()}
            {activeGate === 'voice' && renderVoiceChamber()}
            {activeGate === 'backup' && renderBackupChamber()}
            {activeGate === 'about' && renderAboutChamber()}
          </div>
        ) : (
          /* Exterior Sections Grid: Each Section Card Image Fits 100% of the Entire Card Space */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fadeIn">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <div
                  key={section.id}
                  onClick={() => setActiveGate(section.id)}
                  className="group relative rounded-2xl overflow-hidden border border-[#C8A24A]/30 hover:border-[#E6C66E]/80 transition-all duration-300 cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.7)] hover:shadow-[0_14px_36px_rgba(200,162,74,0.22)] active:scale-98 flex flex-col justify-between min-h-[175px] sm:min-h-[190px] p-4.5"
                >
                  {/* Full-Bleed Thematic Background Image Fitting the Entire Section Space */}
                  <img
                    src={section.image}
                    alt={section.title}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.55] contrast-110 group-hover:scale-106 group-hover:brightness-[0.68] transition-all duration-700 pointer-events-none"
                  />

                  {/* Smooth Multi-stop Dark Vignette Overlay for Crisp Typography & Comfort */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(8,6,4,0.45) 0%, rgba(12,9,6,0.68) 40%, rgba(8,6,4,0.92) 80%, #080604 100%)',
                    }}
                  />

                  {/* Top Row: Floating Luxury Icon Chamber & Left Navigation Arrow */}
                  <div className="relative z-10 flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-[#141009]/90 border border-[#E6C66E]/50 flex items-center justify-center text-[#E6C66E] shadow-[0_4px_16px_rgba(0,0,0,0.85)] backdrop-blur-md group-hover:scale-105 transition-transform">
                      <Icon size={19} />
                    </div>

                    <div className="w-7 h-7 rounded-lg bg-[#0E0C08]/85 border border-[#C8A24A]/40 flex items-center justify-center text-[#C8A24A] group-hover:text-[#E6C66E] group-hover:border-[#E6C66E]/80 transition-colors shadow-sm">
                      <ChevronLeft size={16} />
                    </div>
                  </div>

                  {/* Bottom Content Area: Title, Subtitle & Live Status Ribbon */}
                  <div className="relative z-10 flex flex-col gap-2.5 mt-4">
                    <div>
                      <h2 className="text-base font-extrabold text-[#FFFDF8] font-arabic leading-tight group-hover:text-[#FFF2C2] transition-colors drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                        {section.title}
                      </h2>
                      <p className="text-xs text-[#E1D7C3] mt-0.5 leading-snug line-clamp-1 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                        {section.subtitle}
                      </p>
                    </div>

                    {/* Bottom Status / Current Value */}
                    <div className="px-3 py-1.5 rounded-xl bg-[#0F0C08]/90 border border-[#C8A24A]/30 backdrop-blur-md flex items-center justify-between text-xs shadow-sm">
                      <span className="text-[#E6C66E] font-medium truncate max-w-[170px] drop-shadow-sm text-[11px]">
                        {section.currentValue}
                      </span>
                      <span className="text-[10px] text-[#F5EFE0] group-hover:text-[#FFF2C2] font-bold transition-colors">
                        فتح القسم ←
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Permissions & City Setup Wizard Modal */}
      <PermissionsSetupWizard
        isOpen={isLocationWizardOpen}
        onFinish={(newCoords) => {
          setIsLocationWizardOpen(false);
          if (newCoords) {
            onLocationChange(newCoords);
            setSettings(StorageService.getSettings());
            showToast('تم تحديث الموقع الجغرافي بنجاح ✓');
          }
        }}
        onSkip={() => setIsLocationWizardOpen(false)}
      />
    </div>
  );

  /* =========================================================================
     CHAMBER 1: ALERTS & ADHAN (إعدادات التنبيهات والأذان)
     ========================================================================= */
  function renderAlertsChamber() {
    return (
      <div className="athar-card space-y-4 border-[#C8A24A]/35">
        {/* Header Title & Description */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D2413] to-[#120E07] border border-[#E6C66E]/50 flex items-center justify-center text-[#E6C66E] shadow-md shrink-0">
              <Bell size={20} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#F5EFE0] font-arabic">
                إعدادات التنبيهات والأذان
              </h3>
              <p className="text-[11px] text-[#A89E88]">
                نداء الصلوات الخمس المفروضة وتنبيهات الأذكار والسنن ومواقيت الصلاة
              </p>
            </div>
          </div>
          {alertsTab === 'location' && (
            <button
              onClick={() => setIsLocationWizardOpen(true)}
              className="athar-btn-primary text-xs !py-1.5 !px-3 shrink-0"
            >
              تغيير المدينة
            </button>
          )}
        </div>

        {/* Segmented Navigation Tabs: تنبيهات الصلاة | الإشعارات | الموقع الفلكي */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#0E0C08] border border-[#C8A24A]/25">
          <button
            onClick={() => setAlertsTab('prayer_alerts')}
            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
              alertsTab === 'prayer_alerts'
                ? 'bg-gradient-to-l from-[#C8A24A] to-[#E6C66E] text-black shadow-md'
                : 'text-[#9E9478] hover:text-[#E6C66E] hover:bg-[#16120C]'
            }`}
          >
            تنبيهات الصلاة
          </button>
          <button
            onClick={() => setAlertsTab('notifications')}
            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
              alertsTab === 'notifications'
                ? 'bg-gradient-to-l from-[#C8A24A] to-[#E6C66E] text-black shadow-md'
                : 'text-[#9E9478] hover:text-[#E6C66E] hover:bg-[#16120C]'
            }`}
          >
            الإشعارات
          </button>
          <button
            onClick={() => setAlertsTab('location')}
            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
              alertsTab === 'location'
                ? 'bg-gradient-to-l from-[#C8A24A] to-[#E6C66E] text-black shadow-md'
                : 'text-[#9E9478] hover:text-[#E6C66E] hover:bg-[#16120C]'
            }`}
          >
            الموقع الفلكي
          </button>
        </div>

        {/* TAB 1: PRAYER ALERTS (تنبيهات الصلاة والأذان الملكي) */}
        {alertsTab === 'prayer_alerts' && (
          <div className="space-y-4 animate-fadeIn">
            {/* 1. HERO CARD: Luxury Full-Screen Priority Adhan Screen */}
            <div className="relative overflow-hidden p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-[#211A0E] via-[#141009] to-[#0A0805] border-2 border-[#E6C66E]/60 shadow-[0_12px_36px_rgba(0,0,0,0.9)]">
              <div
                className="absolute top-0 right-0 w-44 h-44 rounded-full blur-3xl pointer-events-none opacity-25"
                style={{
                  background: 'radial-gradient(circle, #E6C66E 0%, #C8A24A 50%, transparent 70%)',
                }}
              />

              <div className="relative z-10 space-y-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#E6C66E] text-black flex items-center justify-center shadow-[0_0_20px_rgba(230,198,110,0.55)] shrink-0">
                      <BellRing size={22} className="animate-pulse" />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E6C66E]/20 text-[#E6C66E] border border-[#E6C66E]/40 text-[10px] font-black mb-1">
                        <Sparkles size={11} />
                        <span>أولوية قصوى • Overlay وشاشة القفل</span>
                      </div>
                      <h4 className="text-base font-black text-[#FFFDF8] font-arabic">
                        شاشة الأذان الملكية الكاملة
                      </h4>
                      <p className="text-xs text-[#C4B998] leading-relaxed">
                        تنبيه إجباري فاخر يظهر تلقائياً فوق التطبيقات وشاشة القفل عند دخول وقت الصلاة
                      </p>
                    </div>
                  </div>

                  {/* Master Switch */}
                  <button
                    onClick={() => {
                      const updated = { ...settings, adhanEnabled: !settings.adhanEnabled };
                      handleUpdateSettings(
                        updated,
                        updated.adhanEnabled ? 'تم تفعيل شاشة الأذان الملكية بنجاح ✓' : 'تم تعطيل شاشة الأذان مؤقتاً'
                      );
                    }}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.adhanEnabled ? 'bg-[#E6C66E]' : 'bg-[#2A2315]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                        settings.adhanEnabled ? 'translate-x-0' : '-translate-x-5'
                      }`}
                    />
                  </button>
                </div>

                {/* TWO TEST BUTTONS AS REQUESTED */}
                <div className="pt-2 border-t border-[#C8A24A]/25 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#E6C66E] flex items-center gap-1.5">
                      <Timer size={14} />
                      <span>اختبار ومعاينة شاشة الأذان:</span>
                    </span>

                    {/* Prayer selector for testing */}
                    <div className="flex items-center gap-1 bg-[#0D0B08] p-1 rounded-xl border border-[#C8A24A]/30 text-[11px] font-bold">
                      <button
                        onClick={() => setSelectedTestPrayer('fajr')}
                        className={`px-2 py-0.5 rounded-lg transition-all ${
                          selectedTestPrayer === 'fajr' ? 'bg-[#E6C66E] text-black font-black' : 'text-[#A89E88]'
                        }`}
                      >
                        الفجر
                      </button>
                      <button
                        onClick={() => setSelectedTestPrayer('maghrib')}
                        className={`px-2 py-0.5 rounded-lg transition-all ${
                          selectedTestPrayer === 'maghrib' ? 'bg-[#E6C66E] text-black font-black' : 'text-[#A89E88]'
                        }`}
                      >
                        المغرب
                      </button>
                    </div>
                  </div>

                  {/* 5-Second Countdown Banner if active */}
                  {countdown5s !== null && (
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-[#3D2C0C] via-[#2D2109] to-[#1F1706] border-2 border-[#E6C66E] text-center shadow-[0_0_25px_rgba(230,198,110,0.5)] animate-pulse">
                      <div className="text-2xl font-black text-[#FFFDF8] font-mono">
                        {countdown5s} ثوانٍ
                      </div>
                      <p className="text-xs font-bold text-[#F3E5AB] mt-0.5">
                        اقفل شاشة الموبايل أو اخرج من التطبيق الآن لاختبار التنبيه الإجباري!
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {/* Delayed Test Button (allows locking screen / exiting app) */}
                    <button
                      onClick={handleTrigger5SecondAdhan}
                      disabled={countdown5s !== null}
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-l from-[#E6C66E] via-[#C8A24A] to-[#A6802B] text-black font-black text-xs flex items-center justify-center gap-2 border border-[#FFF2C2] hover:brightness-105 active:scale-98 shadow-md cursor-pointer disabled:opacity-60"
                    >
                      <Timer size={16} className="text-black" />
                      <span>
                        {countdown5s !== null ? `جارٍ العد: ${countdown5s} ثوانٍ (اقفل الشاشة الآن)...` : 'إرسال تنبيه تجريبي بعد ٥ ثوانٍ (لقفل الشاشة أو الخروج)'}
                      </span>
                    </button>
                  </div>

                  <p className="text-[11px] text-[#A89E88] text-center">
                    💡 يتيح زر الـ ٥ ثوانٍ قفل شاشة الهاتف أو الخروج لاختبار عمل التنبيه كـ Overlay حقيقي
                  </p>
                </div>
              </div>
            </div>

            {/* 2. THE 5 OBLIGATORY PRAYERS ALERT CONTROLS (الصلوات الخمس المخصصة) */}
            <div className="p-4 rounded-2xl bg-[#0E0C08] border border-[#C8A24A]/30 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#C8A24A]/20">
                <div>
                  <h4 className="text-xs font-extrabold text-[#F5EFE0]">
                    تنبيهات الصلوات الخمس المخصصة
                  </h4>
                  <p className="text-[10px] text-[#A89E88]">
                    تفعيل أو كتم الأذان لكل صلاة بشكل مستقل حسب اختيارك
                  </p>
                </div>

                <button
                  onClick={handleResetPrayersAdhan}
                  className="px-2.5 py-1 rounded-xl bg-[#17130C] border border-[#C8A24A]/40 text-[#E6C66E] hover:text-[#FFF2C2] text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="حذف التخصيصات الحالية وإعادة الضبط"
                >
                  <RefreshCw size={12} />
                  <span>حذف التخصيصات وإعادة الضبط</span>
                </button>
              </div>

              {/* 5 Prayers Grid List */}
              <div className="space-y-2">
                {[
                  { id: 'fajr' as ObligatoryPrayerId, name: 'صلاة الفجر', desc: 'نداء الفجر وبداية اليوم المبارك', hasTatweeb: true },
                  { id: 'dhuhr' as ObligatoryPrayerId, name: 'صلاة الظهر', desc: 'نداء الهاجرة ومنتصف النهار', hasTatweeb: false },
                  { id: 'asr' as ObligatoryPrayerId, name: 'صلاة العصر', desc: 'الصلاة الوسطى ومطلع الإشراق', hasTatweeb: false },
                  { id: 'maghrib' as ObligatoryPrayerId, name: 'صلاة المغرب', desc: 'نداء الغروب والإفطار', hasTatweeb: false },
                  { id: 'isha' as ObligatoryPrayerId, name: 'صلاة العشاء', desc: 'نداء السكينة وخاتمة اليوم', hasTatweeb: false },
                ].map((prayer) => {
                  const isEnabled = prayersAdhanConfig[prayer.id]?.enabled ?? true;
                  return (
                    <div
                      key={prayer.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isEnabled
                          ? 'bg-gradient-to-r from-[#1A150D] to-[#100D09] border-[#C8A24A]/40'
                          : 'bg-[#0B0907] border-[#C8A24A]/15 opacity-65'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isEnabled
                              ? 'bg-[#E6C66E] text-black shadow-sm'
                              : 'bg-[#18140D] text-[#8C8370] border border-[#C8A24A]/25'
                          }`}
                        >
                          {isEnabled ? <Bell size={15} /> : <VolumeX size={15} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#F5EFE0]">{prayer.name}</span>
                            <span
                              className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold ${
                                isEnabled
                                  ? 'bg-[#E6C66E]/20 text-[#E6C66E] border border-[#E6C66E]/30'
                                  : 'bg-[#1C160B] text-[#8C8370]'
                              }`}
                            >
                              {isEnabled ? 'أذان كامل مفعل' : 'تنبيه مكتوم'}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#A89E88] block mt-0.5">
                            {prayer.desc}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleTogglePrayerAdhan(prayer.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          isEnabled
                            ? 'bg-[#2A2111] border border-[#E6C66E]/60 text-[#E6C66E] hover:bg-[#342914]'
                            : 'bg-[#141009] border border-[#C8A24A]/30 text-[#A89E88] hover:text-[#F5EFE0]'
                        }`}
                      >
                        {isEnabled ? 'مفعل ✓' : 'تعطيل'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. SMART SILENCE & FLIP-TO-MUTE FEATURE */}
            <div className="p-3.5 rounded-2xl bg-[#0E0C08] border border-[#C8A24A]/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#261E10] border border-[#E6C66E]/50 flex items-center justify-center text-[#E6C66E]">
                    <Smartphone size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-[#F5EFE0]">
                      خاصية الميوت الذكية (قلب شاشة الهاتف)
                    </h4>
                    <p className="text-[10px] text-[#A89E88]">
                      اقلب الهاتف على وجهه أثناء الأذان لكتم الصوت مع استمرار المتابعة الحية
                    </p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={prayersAdhanConfig.smartFlipToMute ?? true}
                  onChange={(e) => {
                    const updated = {
                      ...prayersAdhanConfig,
                      smartFlipToMute: e.target.checked,
                    };
                    StorageService.savePrayersAdhanConfig(updated);
                    setPrayersAdhanConfig(updated);
                    showToast(e.target.checked ? 'تم تفعيل خاصية قلب الهاتف لكتم الصوت ✓' : 'تم تعطيل الخاصية');
                  }}
                  className="accent-[#E6C66E] w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-[#141009] border border-[#C8A24A]/20 flex items-center gap-2 text-[11px] text-[#C4B998]">
                <Sparkles size={14} className="text-[#E6C66E] shrink-0" />
                <span>
                  ميزة حصرية: زر كتم/تشغيل الصوت في شاشة الأذان يحتفظ بالموضع اللحظي للصوت دون إعادة الأذان من البداية.
                </span>
              </div>
            </div>

            {/* 4. MOAZZEN SELECTION */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#E6C66E] flex items-center gap-1.5">
                <Volume2 size={14} />
                <span>اختر صوت المؤذن المعتمد:</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ADHAN_VOICES.map((voice) => {
                  const isSelected = settings.adhanVoice === voice.id;
                  return (
                    <div
                      key={voice.id}
                      onClick={() => {
                        const currentConfig = settings.prayersAdhanConfig || DEFAULT_PRAYERS_ADHAN_CONFIG;
                        const updatedPrayersConfig = {
                          ...currentConfig,
                          fajr: { ...currentConfig.fajr, voice: voice.id },
                          dhuhr: { ...currentConfig.dhuhr, voice: voice.id },
                          asr: { ...currentConfig.asr, voice: voice.id },
                          maghrib: { ...currentConfig.maghrib, voice: voice.id },
                          isha: { ...currentConfig.isha, voice: voice.id },
                        };
                        const updated = {
                          ...settings,
                          adhanVoice: voice.id,
                          prayersAdhanConfig: updatedPrayersConfig,
                        };
                        handleUpdateSettings(updated, `تم اعتماد صوت: ${voice.name} ✓`);
                        StorageService.savePrayersAdhanConfig(updatedPrayersConfig);
                        ReminderEngine.updateActiveAdhanVoice(voice.id);
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(
                            new CustomEvent('athar_adhan_voice_changed', { detail: { voice: voice.id } })
                          );
                        }
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                        isSelected
                          ? 'bg-gradient-to-l from-[#292112] to-[#141009] border-[#E6C66E] shadow-[0_4px_16px_rgba(214,179,106,0.18)]'
                          : 'bg-[#100D09] border-[#C8A24A]/20 hover:border-[#C8A24A]/50 hover:bg-[#16120C]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#F5EFE0] truncate">
                          {voice.name}
                        </div>
                        <div className="text-[10px] text-[#A89E88] mt-0.5 truncate">
                          {voice.subtitle}
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-[#E6C66E] border-[#FFF2C2] text-black shadow-sm'
                            : 'border-[#C8A24A]/40 bg-transparent'
                        }`}
                      >
                        {isSelected && <Check size={10} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 6. ADHAN MODE: FULL VS TWO TAKBEERS */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-[#E6C66E] block">
                نمط الأذان الصوتي:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div
                  onClick={() => {
                    const updated = { ...settings, adhanMode: 'full' as const };
                    handleUpdateSettings(updated, 'تم اعتماد الأذان كاملاً ✓');
                  }}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    settings.adhanMode === 'full'
                      ? 'bg-gradient-to-b from-[#2B2110] to-[#120F09] border-[#E6C66E] text-[#FFFDF8]'
                      : 'bg-[#100D09] border-[#C8A24A]/20 text-[#A89E88] hover:text-[#F5EFE0]'
                  }`}
                >
                  <div className="text-xs font-bold">أذان كامل</div>
                  <div className="text-[10px] text-[#A89E88] mt-0.5">رفع الأذان حتى نهايته</div>
                </div>
                <div
                  onClick={() => {
                    const updated = { ...settings, adhanMode: 'first_two_takbeers' as const };
                    handleUpdateSettings(updated, 'تم اعتماد التكبيرتين الأوليين فقط ✓');
                  }}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    settings.adhanMode === 'first_two_takbeers'
                      ? 'bg-gradient-to-b from-[#2B2110] to-[#120F09] border-[#E6C66E] text-[#FFFDF8]'
                      : 'bg-[#100D09] border-[#C8A24A]/20 text-[#A89E88] hover:text-[#F5EFE0]'
                  }`}
                >
                  <div className="text-xs font-bold">التكبيرتان فقط</div>
                  <div className="text-[10px] text-[#A89E88] mt-0.5">تنبيه مقتضب مهيب</div>
                </div>
              </div>
            </div>

            {/* 7. QUICK PREFERENCE TOGGLES */}
            <div className="space-y-2 pt-1">
              {/* Vibration Toggle */}
              <div className="p-3 rounded-xl bg-[#110E09] border border-[#C8A24A]/20 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#F5EFE0]">الاهتزاز عند وقت الأذان</div>
                  <div className="text-[10px] text-[#A89E88]">نبضات هادئة عند النداء للصلاة</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.adhanVibrate}
                  onChange={(e) => {
                    const updated = { ...settings, adhanVibrate: e.target.checked };
                    handleUpdateSettings(updated, updated.adhanVibrate ? 'تم تفعيل الاهتزاز ✓' : 'تم تعطيل الاهتزاز');
                  }}
                  className="accent-[#E6C66E] w-4 h-4 cursor-pointer"
                />
              </div>

              {/* Dua after Adhan Card */}
              <div className="p-3.5 rounded-2xl bg-[#110E09] border border-[#C8A24A]/25 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-[#E6C66E]" />
                    <div>
                      <div className="text-xs font-bold text-[#F5EFE0]">دعاء ما بعد الأذان التلقائي</div>
                      <div className="text-[10px] text-[#A89E88]">تشغيل دعاء الوسيلة والفضيلة تلقائياً فور انتهاء أذان كل صلاة</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.duaAfterAdhanEnabled !== false}
                    onChange={(e) => {
                      const updated = { ...settings, duaAfterAdhanEnabled: e.target.checked };
                      handleUpdateSettings(updated, updated.duaAfterAdhanEnabled ? 'تم تفعيل تشغيل الدعاء تلقائياً بعد الأذان' : 'تم تعطيل الدعاء التلقائي');
                    }}
                    className="accent-[#E6C66E] w-4 h-4 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#C8A24A]/15">
                  <p className="text-[10px] text-[#C4B998] font-quran truncate">
                    «اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ...»
                  </p>
                  <button
                    type="button"
                    onClick={() => AudioService.playDuaAfterAdhan().catch(() => {})}
                    className="px-2.5 py-1 rounded-lg bg-[#1F170B] border border-[#E6C66E]/40 text-[10px] font-bold text-[#E6C66E] hover:border-[#E6C66E] flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Volume2 size={12} />
                    <span>تجربة الدعاء</span>
                  </button>
                </div>
              </div>

              {/* Comprehensive Per-Prayer Iqamah Configuration Card */}
              <div className="p-4 rounded-2xl bg-[#110E09] border border-[#C8A24A]/25 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#C8A24A]/20">
                  <div className="flex items-center gap-2">
                    <Timer size={16} className="text-[#E6C66E]" />
                    <div>
                      <div className="text-xs font-bold text-[#F5EFE0]">إعدادات وقت الإقامة لكل صلاة</div>
                      <div className="text-[10px] text-[#A89E88]">تحديد دقائق الإقامة بعد كل أذان وتفعيل التنبيه الصوتي</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.iqamahSettings?.enabled ?? true}
                    onChange={(e) => {
                      const updated = {
                        ...settings,
                        iqamahSettings: {
                          ...settings.iqamahSettings,
                          enabled: e.target.checked,
                        },
                      };
                      handleUpdateSettings(updated, updated.iqamahSettings.enabled ? 'تم تفعيل تنبيه الإقامة' : 'تم تعطيل تنبيه الإقامة');
                    }}
                    className="accent-[#E6C66E] w-4 h-4 cursor-pointer"
                  />
                </div>

                {/* Iqamah Audio Toggle & Test */}
                <div className="p-2.5 rounded-xl bg-[#0B0906] border border-[#C8A24A]/20 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#F5EFE0]">صوت إقامة الصلاة</div>
                    <div className="text-[10px] text-[#A89E88]">نداء «قد قامت الصلاة، قد قامت الصلاة»</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => AudioService.playIqamah().catch(() => {})}
                      className="px-2 py-1 rounded-lg bg-[#1F170B] border border-[#E6C66E]/40 text-[10px] font-bold text-[#E6C66E] flex items-center gap-1 cursor-pointer"
                    >
                      <Volume2 size={12} />
                      <span>استماع</span>
                    </button>
                    <input
                      type="checkbox"
                      checked={settings.iqamahSettings?.soundEnabled !== false}
                      onChange={(e) => {
                        const updated = {
                          ...settings,
                          iqamahSettings: {
                            ...settings.iqamahSettings,
                            soundEnabled: e.target.checked,
                          },
                        };
                        handleUpdateSettings(updated, e.target.checked ? 'تم تفعيل صوت الإقامة' : 'تم كتم صوت الإقامة');
                      }}
                      className="accent-[#E6C66E] w-4 h-4 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Per-Prayer Timing Steppers */}
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-extrabold text-[#E6C66E] block">
                    موعد الإقامة بعد الأذان لكل صلاة مفروضة:
                  </span>
                  {[
                    { id: 'fajr' as const, label: 'صلاة الفجر', defaultVal: 20 },
                    { id: 'dhuhr' as const, label: 'صلاة الظهر', defaultVal: 15 },
                    { id: 'asr' as const, label: 'صلاة العصر', defaultVal: 15 },
                    { id: 'maghrib' as const, label: 'صلاة المغرب', defaultVal: 10 },
                    { id: 'isha' as const, label: 'صلاة العشاء', defaultVal: 15 },
                  ].map((p) => {
                    const currentOffsets = settings.iqamahSettings?.offsets || {
                      fajr: 20,
                      dhuhr: 15,
                      asr: 15,
                      maghrib: 10,
                      isha: 15,
                    };
                    const currentVal = currentOffsets[p.id] ?? p.defaultVal;

                    const updateOffset = (newVal: number) => {
                      const clamped = Math.max(5, Math.min(60, newVal));
                      const updatedOffsets = {
                        ...currentOffsets,
                        [p.id]: clamped,
                      };
                      const updated = {
                        ...settings,
                        iqamahSettings: {
                          ...settings.iqamahSettings,
                          offsets: updatedOffsets,
                        },
                      };
                      handleUpdateSettings(updated, `تم ضبط إقامة ${p.label} بعد ${clamped} دقيقة`);
                      LiveActivityService.saveSettings({ iqamahOffsets: updatedOffsets });
                      ReminderEngine.restart();
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(
                          new CustomEvent('athar_iqamah_settings_changed', { detail: updated.iqamahSettings })
                        );
                      }
                    };

                    return (
                      <div
                        key={p.id}
                        className="p-2.5 rounded-xl bg-[#0D0B08] border border-[#C8A24A]/20 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-[#F5EFE0]">{p.label}</div>
                          <div className="text-[10px] text-[#A89E88]">
                            الإقامة بعد <strong className="text-[#E6C66E]">{currentVal}</strong> دقيقة من الأذان
                          </div>
                        </div>

                        {/* Quick controls: -5, value, +5 */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateOffset(currentVal - 5)}
                            className="w-7 h-7 rounded-lg bg-[#18130B] border border-[#C8A24A]/30 text-sm font-black text-[#E6C66E] hover:border-[#E6C66E] flex items-center justify-center cursor-pointer active:scale-95"
                          >
                            -
                          </button>
                          <span className="w-10 text-center text-xs font-black font-mono text-[#FFFDF8]">
                            {currentVal} د
                          </span>
                          <button
                            type="button"
                            onClick={() => updateOffset(currentVal + 5)}
                            className="w-7 h-7 rounded-lg bg-[#18130B] border border-[#C8A24A]/30 text-sm font-black text-[#E6C66E] hover:border-[#E6C66E] flex items-center justify-center cursor-pointer active:scale-95"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: NOTIFICATIONS & ROYAL DHIKR REMINDERS (الإشعارات ونظام التنبيهات الملكي) */}
        {alertsTab === 'notifications' && (
          <div className="space-y-4 animate-fadeIn">
            {/* ROYAL NOTIFICATION ENGINE SYSTEM CARD */}
            <div className="relative overflow-hidden p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-[#1C160E] via-[#120E09] to-[#0A0805] border-2 border-[#E6C66E]/60 shadow-[0_12px_36px_rgba(0,0,0,0.9)] space-y-4">
              <div
                className="absolute top-0 right-0 w-44 h-44 rounded-full blur-3xl pointer-events-none opacity-20"
                style={{
                  background: 'radial-gradient(circle, #E6C66E 0%, #C8A24A 50%, transparent 70%)',
                }}
              />

              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#E6C66E]/20 text-[#E6C66E] border border-[#E6C66E]/40 flex items-center justify-center shadow-[0_0_15px_rgba(230,198,110,0.3)] shrink-0">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-[#FFFDF8] font-arabic">
                        نظام التنبيهات والأذكار الملكي
                      </h4>
                      <div className="text-[10px] text-[#A89E88] mt-0.5">
                        أولوية مطلقة للأذان • عرض عائم ذكي • إغلاق تلقائي فوري
                      </div>
                    </div>
                  </div>

                  {/* System Overlay & Notification Permission Request Button */}
                  <button
                    type="button"
                    onClick={async () => {
                      const granted = await RoyalReminderEngine.requestNotificationPermission();
                      showToast(
                        granted
                          ? 'تم منح صلاحية إشعارات النظام بنجاح ✓ التنبيهات ستعمل فوق التطبيقات وشاشة القفل'
                          : 'صلاحية الإشعارات مفعلة بالفعل أو تتطلب إذناً من إعدادات المتصفح'
                      );
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#231A0F] border border-[#E6C66E]/50 text-[#E6C66E] hover:text-[#FFFDF8] text-[11px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
                  >
                    <Bell size={13} />
                    <span>تفعيل إشعارات النظام</span>
                  </button>
                </div>

                {/* Features & Priority Directives */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-[#0E0B07] border border-[#C8A24A]/20">
                    <div className="font-bold text-[#E6C66E] mb-0.5 flex items-center gap-1">
                      <Sparkles size={12} />
                      <span>العرض الذكي داخل أثر</span>
                    </div>
                    <p className="text-[10px] text-[#C4B998] leading-relaxed">
                      بطاقة عائمة أنيقة بأعلى الشاشة لا تقطع التصفح ولا تعطل قراءة القرآن
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#0E0B07] border border-[#C8A24A]/20">
                    <div className="font-bold text-[#E6C66E] mb-0.5 flex items-center gap-1">
                      <Clock size={12} />
                      <span>الإغلاق التلقائي الذكي</span>
                    </div>
                    <p className="text-[10px] text-[#C4B998] leading-relaxed">
                      يختفي التنبيه تلقائياً فور انتهاء الصوت، أو بعد 5 ثوانٍ فقط للوضع الصامت
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#0E0B07] border border-[#C8A24A]/20">
                    <div className="font-bold text-[#E6C66E] mb-0.5 flex items-center gap-1">
                      <BellRing size={12} />
                      <span>الأولوية المطلقة للأذان</span>
                    </div>
                    <p className="text-[10px] text-[#C4B998] leading-relaxed">
                      تأجيل تلقائي للتنبيهات عند قرب الأذان (15 ث) مع طابور متتابع منظم
                    </p>
                  </div>
                </div>
              </div>

              {/* 1. ALERT: اقرأ ولو آية في اليوم */}
              <div className="relative z-10 p-4 rounded-2xl bg-[#140F09] border border-[#C8A24A]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#E6C66E]/15 border border-[#E6C66E]/30 text-[#E6C66E] flex items-center justify-center">
                      <BookOpen size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#FFFDF8]">التنبيه الأول: اقرأ ولو آية في اليوم</div>
                      <div className="text-[10px] text-[#A89E88]">تلاوة صوتية تتطابق 100% مع الآية العشوائية المختارة يومياً (صوت متغير غير ثابت)</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.quranVerseReminder?.enabled ?? true}
                    onChange={(e) => {
                      const updated = {
                        ...settings,
                        quranVerseReminder: {
                          ...settings.quranVerseReminder,
                          enabled: e.target.checked,
                        },
                      };
                      handleUpdateSettings(updated, e.target.checked ? 'تم تفعيل تنبيه اقرأ ولو آية ✓' : 'تم التعطيل');
                    }}
                    className="accent-[#E6C66E] w-4 h-4 cursor-pointer"
                  />
                </div>

                {/* Mode, Timing & Reciter Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-[#A89E88] block mb-1">نمط التنبيه:</label>
                    <select
                      value={settings.quranVerseReminder?.mode || 'notification_and_sound'}
                      onChange={(e) => {
                        const updated = {
                          ...settings,
                          quranVerseReminder: {
                            ...settings.quranVerseReminder,
                            mode: e.target.value as any,
                          },
                        };
                        handleUpdateSettings(updated, 'تم تحديث نمط التنبيه ✓');
                      }}
                      className="w-full py-1.5 px-2 rounded-xl bg-[#0E0B07] border border-[#C8A24A]/30 text-xs text-[#FFFDF8]"
                    >
                      <option value="notification_only">إشعار مرئي فقط (صامت)</option>
                      <option value="notification_with_play_action">إشعار مع زر تشغيل الصوت</option>
                      <option value="notification_and_sound">إشعار بصوت تلقائي فوري</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#A89E88] block mb-1">موعد التنبيه اليومي:</label>
                    <input
                      type="time"
                      value={settings.quranVerseReminder?.startTime || '08:00'}
                      onChange={(e) => {
                        const updated = {
                          ...settings,
                          quranVerseReminder: {
                            ...settings.quranVerseReminder,
                            startTime: e.target.value,
                          },
                        };
                        handleUpdateSettings(updated, `تم ضبط موعد التنبيه على ${e.target.value} ✓`);
                      }}
                      className="w-full py-1.5 px-2 rounded-xl bg-[#0E0B07] border border-[#C8A24A]/30 text-xs text-[#FFFDF8] font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-[#A89E88] block mb-1">القارئ المعتمد للتلاوة:</label>
                    <select
                      value={settings.quranVerseReminder?.reciterId || settings.selectedReciterId || 'alafasy'}
                      onChange={(e) => {
                        const updated = {
                          ...settings,
                          quranVerseReminder: {
                            ...settings.quranVerseReminder,
                            reciterId: e.target.value,
                          },
                        };
                        handleUpdateSettings(updated, 'تم اختيار قارئ تنبيه الآية ✓');
                      }}
                      className="w-full py-1.5 px-2 rounded-xl bg-[#0E0B07] border border-[#C8A24A]/30 text-xs text-[#FFFDF8]"
                    >
                      {VERIFIED_RECITERS.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nameArabic}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#0E0B07]/80 border border-[#C8A24A]/20 flex items-center gap-2 text-[10px] text-[#C4B998]">
                  <Sparkles size={13} className="text-[#E6C66E] shrink-0" />
                  <span>تلاوة الآية تتطابق صوتياً مع الآية الكريمة المختارة عشوائياً في كل مرة ويُغلق التنبيه تلقائياً بانتهاء تلاوتها.</span>
                </div>

                {/* Independent 5-Second Test Button */}
                <button
                  type="button"
                  onClick={() => handleTestRoyalAlert('ayah_daily')}
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 ${
                    royalCountdowns.ayah_daily !== null
                      ? 'bg-[#E6C66E] text-black border-[#E6C66E] shadow-md animate-pulse'
                      : 'bg-[#1A140C] text-[#E6C66E] border-[#E6C66E]/40 hover:bg-[#E6C66E]/15'
                  }`}
                >
                  <Timer size={14} />
                  <span>
                    {royalCountdowns.ayah_daily !== null
                      ? `⏳ اختبار التنبيه بعد ${royalCountdowns.ayah_daily} ثوانٍ (انقر للإلغاء)`
                      : 'تجربة تنبيه «اقرأ ولو آية» بعد 5 ثوانٍ'}
                  </span>
                </button>
              </div>

              {/* 2. ALERT: ذكر الله والصلاة على النبي ﷺ */}
              <div className="relative z-10 p-4 rounded-2xl bg-[#140F09] border border-[#C8A24A]/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#E6C66E]/15 border border-[#E6C66E]/30 text-[#E6C66E] flex items-center justify-center">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#FFFDF8]">التنبيه الثاني: ذكر الله والصلاة على النبي ﷺ</div>
                      <div className="text-[10px] text-[#A89E88]">14 ذكراً بأصواتها المسجلة • صوت متغير متوافق تماماً مع الذكر المعروض</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.salawatReminder?.enabled ?? true}
                    onChange={(e) => {
                      const updated = {
                        ...settings,
                        salawatReminder: {
                          ...settings.salawatReminder,
                          enabled: e.target.checked,
                        },
                      };
                      handleUpdateSettings(updated, e.target.checked ? 'تم تفعيل تنبيه الصلاة على النبي ﷺ ✓' : 'تم التعطيل');
                    }}
                    className="accent-[#E6C66E] w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-[#A89E88] block mb-1">نمط التنبيه:</label>
                    <select
                      value={settings.salawatReminder?.mode || 'notification_and_sound'}
                      onChange={(e) => {
                        const updated = {
                          ...settings,
                          salawatReminder: {
                            ...settings.salawatReminder,
                            mode: e.target.value as any,
                          },
                        };
                        handleUpdateSettings(updated, 'تم تحديث نمط التنبيه ✓');
                      }}
                      className="w-full py-1.5 px-2 rounded-xl bg-[#0E0B07] border border-[#C8A24A]/30 text-xs text-[#FFFDF8]"
                    >
                      <option value="notification_only">إشعار مرئي فقط (صامت)</option>
                      <option value="notification_with_play_action">إشعار مع زر تشغيل الصوت</option>
                      <option value="notification_and_sound">إشعار بصوت تلقائي فوري</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#A89E88] block mb-1">موعد التنبيه اليومي:</label>
                    <input
                      type="time"
                      value={settings.salawatReminder?.startTime || '10:00'}
                      onChange={(e) => {
                        const updated = {
                          ...settings,
                          salawatReminder: {
                            ...settings.salawatReminder,
                            startTime: e.target.value,
                          },
                        };
                        handleUpdateSettings(updated, `تم ضبط موعد التنبيه على ${e.target.value} ✓`);
                      }}
                      className="w-full py-1.5 px-2 rounded-xl bg-[#0E0B07] border border-[#C8A24A]/30 text-xs text-[#FFFDF8] font-mono"
                    />
                  </div>
                </div>

                {/* 5-Second Test Button */}
                <button
                  type="button"
                  onClick={() => handleTestRoyalAlert('dhikr_salawat')}
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 ${
                    royalCountdowns.dhikr_salawat !== null
                      ? 'bg-[#E6C66E] text-black border-[#E6C66E] shadow-md animate-pulse'
                      : 'bg-[#1A140C] text-[#E6C66E] border-[#E6C66E]/40 hover:bg-[#E6C66E]/15'
                  }`}
                >
                  <Timer size={14} />
                  <span>
                    {royalCountdowns.dhikr_salawat !== null
                      ? `⏳ اختبار التنبيه بعد ${royalCountdowns.dhikr_salawat} ثوانٍ (انقر للإلغاء)`
                      : 'تجربة تنبيه «ذكر الله والصلاة على النبي ﷺ» بعد 5 ثوانٍ'}
                  </span>
                </button>

                {/* 14 ADHKAR SELECTION & AUDIO PREVIEW MODULE */}
                <div className="pt-2 border-t border-[#C8A24A]/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#E6C66E]">أذكار وصيغ الصلاة المتاحة (14 ذكراً بصوتها)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#E6C66E]/15 border border-[#E6C66E]/30 text-[#E6C66E]">
                        {enabledDhikrIds.length} من {VERIFIED_DHIKR_REMINDERS.length} مفعّلاً
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDhikrListExpanded((prev) => !prev)}
                      className="text-[11px] text-[#A89E88] hover:text-[#E6C66E] transition-colors cursor-pointer"
                    >
                      {isDhikrListExpanded ? 'طي القائمة ▲' : 'عرض وتخصيص الأذكار ▼'}
                    </button>
                  </div>

                  <p className="text-[10px] text-[#A89E88] leading-relaxed">
                    الصوت متوافق 100% مع نص الذكر ويتم اختياره عشوائياً من بين الأذكار المفعّلة أدناه. يمكنك تفعيل أو تعطيل أي ذكر والاستماع لملفه الصوتي:
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSetAllDhikrs(true)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#E6C66E]/10 border border-[#E6C66E]/30 text-[#E6C66E] hover:bg-[#E6C66E]/20 transition-all cursor-pointer"
                    >
                      ✓ تفعيل الكل ({VERIFIED_DHIKR_REMINDERS.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAllDhikrs(false)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/5 border border-white/10 text-[#A89E88] hover:text-[#FFFDF8] hover:bg-white/10 transition-all cursor-pointer"
                    >
                      ✕ تعطيل الكل
                    </button>
                  </div>

                  {isDhikrListExpanded && (
                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                      {VERIFIED_DHIKR_REMINDERS.map((dhikr, index) => {
                        const isEnabled = enabledDhikrIds.includes(dhikr.id);
                        const isPlaying = previewAudioDhikrId === dhikr.id;

                        return (
                          <div
                            key={dhikr.id}
                            className={`p-3 rounded-xl border transition-all ${
                              isEnabled
                                ? 'bg-[#0E0B07] border-[#C8A24A]/40'
                                : 'bg-[#0A0805]/60 border-white/5 opacity-65'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-md bg-[#E6C66E]/10 text-[#E6C66E] font-mono text-[10px] flex items-center justify-center font-bold">
                                  {index + 1}
                                </span>
                                <span className="text-xs font-bold text-[#FFFDF8]">{dhikr.title}</span>
                                <span className="px-2 py-0.5 rounded-md bg-[#C8A24A]/10 text-[#C4B998] text-[9px] border border-[#C8A24A]/20">
                                  {dhikr.categoryLabel}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {/* Audio Preview Play Button */}
                                <button
                                  type="button"
                                  onClick={() => handleTogglePreviewAudio(dhikr)}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] transition-all cursor-pointer ${
                                    isPlaying
                                      ? 'bg-[#E6C66E] text-black border-[#E6C66E] font-bold shadow-sm animate-pulse'
                                      : 'bg-[#1A140C] text-[#C4B998] border-[#C8A24A]/30 hover:border-[#E6C66E] hover:text-[#FFFDF8]'
                                  }`}
                                  title="استماع إلى التسجيل الصوتي للذكر"
                                >
                                  {isPlaying ? (
                                    <>
                                      <Pause size={11} />
                                      <span>إيقاف</span>
                                    </>
                                  ) : (
                                    <>
                                      <Play size={11} />
                                      <span>سماع ({dhikr.durationSeconds}ث)</span>
                                    </>
                                  )}
                                </button>

                                {/* Toggle Enabled Checkbox */}
                                <input
                                  type="checkbox"
                                  checked={isEnabled}
                                  onChange={() => handleToggleDhikrItem(dhikr.id)}
                                  className="accent-[#E6C66E] w-4 h-4 cursor-pointer"
                                  title={isEnabled ? 'تعطيل هذا الذكر' : 'تفعيل هذا الذكر'}
                                />
                              </div>
                            </div>

                            <p className="text-xs text-[#FFFDF8] font-arabic leading-relaxed mb-1 pr-7">
                              «{dhikr.arabicText}»
                            </p>
                            <p className="text-[10px] text-[#A89E88] pr-7 leading-normal">
                              {dhikr.fadl}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. ALERT: الورد اليومي */}
              <div className="relative z-10 p-4 rounded-2xl bg-[#140F09] border border-[#C8A24A]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#E6C66E]/15 border border-[#E6C66E]/30 text-[#E6C66E] flex items-center justify-center">
                      <Clock size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#FFFDF8]">التنبيه الثالث: الورد اليومي</div>
                      <div className="text-[10px] text-[#A89E88]">صوت «وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا» وزر فتح الورد القرآني</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.dailyWirdReminder?.enabled ?? true}
                    onChange={(e) => {
                      const updated = {
                        ...settings,
                        dailyWirdReminder: {
                          ...settings.dailyWirdReminder,
                          enabled: e.target.checked,
                        },
                      };
                      handleUpdateSettings(updated, e.target.checked ? 'تم تفعيل تذكير الورد القرآني ✓' : 'تم التعطيل');
                    }}
                    className="accent-[#E6C66E] w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-[#A89E88] block mb-1">نمط التنبيه:</label>
                    <select
                      value={settings.dailyWirdReminder?.mode || 'notification_and_sound'}
                      onChange={(e) => {
                        const updated = {
                          ...settings,
                          dailyWirdReminder: {
                            ...settings.dailyWirdReminder,
                            mode: e.target.value as any,
                          },
                        };
                        handleUpdateSettings(updated, 'تم تحديث نمط التنبيه ✓');
                      }}
                      className="w-full py-1.5 px-2 rounded-xl bg-[#0E0B07] border border-[#C8A24A]/30 text-xs text-[#FFFDF8]"
                    >
                      <option value="notification_only">إشعار مرئي فقط (صامت)</option>
                      <option value="notification_with_play_action">إشعار مع زر تشغيل الصوت</option>
                      <option value="notification_and_sound">إشعار بصوت تلقائي فوري</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#A89E88] block mb-1">موعد التنبيه اليومي:</label>
                    <input
                      type="time"
                      value={settings.dailyWirdReminder?.startTime || '17:00'}
                      onChange={(e) => {
                        const updated = {
                          ...settings,
                          dailyWirdReminder: {
                            ...settings.dailyWirdReminder,
                            startTime: e.target.value,
                          },
                        };
                        handleUpdateSettings(updated, `تم ضبط موعد التنبيه على ${e.target.value} ✓`);
                      }}
                      className="w-full py-1.5 px-2 rounded-xl bg-[#0E0B07] border border-[#C8A24A]/30 text-xs text-[#FFFDF8] font-mono"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleTestRoyalAlert('daily_wird')}
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 ${
                    royalCountdowns.daily_wird !== null
                      ? 'bg-[#E6C66E] text-black border-[#E6C66E] shadow-md animate-pulse'
                      : 'bg-[#1A140C] text-[#E6C66E] border-[#E6C66E]/40 hover:bg-[#E6C66E]/15'
                  }`}
                >
                  <Timer size={14} />
                  <span>
                    {royalCountdowns.daily_wird !== null
                      ? `⏳ اختبار التنبيه بعد ${royalCountdowns.daily_wird} ثوانٍ (انقر للإلغاء)`
                      : 'تجربة تنبيه «الورد اليومي» بعد 5 ثوانٍ'}
                  </span>
                </button>
              </div>

              {/* 4. ALERT: بر الوالدين */}
              <div className="relative z-10 p-4 rounded-2xl bg-[#140F09] border border-[#C8A24A]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#E6C66E]/15 border border-[#E6C66E]/30 text-[#E6C66E] flex items-center justify-center">
                      <Heart size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#FFFDF8]">التنبيه الرابع: بِرّ الوالدين والإحسان إليهما</div>
                      <div className="text-[10px] text-[#A89E88]">صوت «وَقُل رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا» وزر فتح بر الوالدين</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.parentsReminder?.enabled ?? true}
                    onChange={(e) => {
                      const updated = {
                        ...settings,
                        parentsReminder: {
                          ...settings.parentsReminder,
                          enabled: e.target.checked,
                        },
                      };
                      handleUpdateSettings(updated, e.target.checked ? 'تم تفعيل تذكير بر الوالدين ✓' : 'تم التعطيل');
                    }}
                    className="accent-[#E6C66E] w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-[#A89E88] block mb-1">نمط التنبيه:</label>
                    <select
                      value={settings.parentsReminder?.mode || 'notification_and_sound'}
                      onChange={(e) => {
                        const updated = {
                          ...settings,
                          parentsReminder: {
                            ...settings.parentsReminder,
                            mode: e.target.value as any,
                          },
                        };
                        handleUpdateSettings(updated, 'تم تحديث نمط التنبيه ✓');
                      }}
                      className="w-full py-1.5 px-2 rounded-xl bg-[#0E0B07] border border-[#C8A24A]/30 text-xs text-[#FFFDF8]"
                    >
                      <option value="notification_only">إشعار مرئي فقط (صامت)</option>
                      <option value="notification_with_play_action">إشعار مع زر تشغيل الصوت</option>
                      <option value="notification_and_sound">إشعار بصوت تلقائي فوري</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#A89E88] block mb-1">تكرار التنبيه:</label>
                    <select
                      value={settings.parentsReminder?.frequency || 'daily'}
                      onChange={(e) => {
                        const updated = {
                          ...settings,
                          parentsReminder: {
                            ...settings.parentsReminder,
                            frequency: e.target.value as any,
                          },
                        };
                        handleUpdateSettings(updated, `تم ضبط التكرار على: ${e.target.value} ✓`);
                      }}
                      className="w-full py-1.5 px-2 rounded-xl bg-[#0E0B07] border border-[#C8A24A]/30 text-xs text-[#FFFDF8]"
                    >
                      <option value="30m">كل 30 دقيقة</option>
                      <option value="1h">كل 1 ساعة</option>
                      <option value="2h">كل 2 ساعة</option>
                      <option value="3h">كل 3 ساعات</option>
                      <option value="6h">كل 6 ساعات</option>
                      <option value="12h">كل 12 ساعة</option>
                      <option value="daily">مرة واحدة في اليوم</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#A89E88] block mb-1">موعد البدء:</label>
                    <input
                      type="time"
                      value={settings.parentsReminder?.startTime || '09:00'}
                      onChange={(e) => {
                        const updated = {
                          ...settings,
                          parentsReminder: {
                            ...settings.parentsReminder,
                            startTime: e.target.value,
                          },
                        };
                        handleUpdateSettings(updated, `تم ضبط موعد البدء على ${e.target.value} ✓`);
                      }}
                      className="w-full py-1.5 px-2 rounded-xl bg-[#0E0B07] border border-[#C8A24A]/30 text-xs text-[#FFFDF8] font-mono"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleTestRoyalAlert('parents_birr')}
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 ${
                    royalCountdowns.parents_birr !== null
                      ? 'bg-[#E6C66E] text-black border-[#E6C66E] shadow-md animate-pulse'
                      : 'bg-[#1A140C] text-[#E6C66E] border-[#E6C66E]/40 hover:bg-[#E6C66E]/15'
                  }`}
                >
                  <Timer size={14} />
                  <span>
                    {royalCountdowns.parents_birr !== null
                      ? `⏳ اختبار التنبيه بعد ${royalCountdowns.parents_birr} ثوانٍ (انقر للإلغاء)`
                      : 'تجربة تنبيه «بر الوالدين» بعد 5 ثوانٍ'}
                  </span>
                </button>
              </div>

              {/* 5. QUIET HOURS (وضع الهدوء وعدم الإزعاج) */}
              <div className="relative z-10 p-4 rounded-2xl bg-[#140F09] border border-[#C8A24A]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#FFFDF8]">وضع الهدوء وعدم الإزعاج (ساعات الراحة والنوم)</div>
                    <div className="text-[10px] text-[#A89E88]">كتم وتعليق التنبيهات الصوتية المزعجة تلقائياً لحفظ السكينة</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.quietHours?.enabled ?? true}
                    onChange={(e) => {
                      const updated = {
                        ...settings,
                        quietHours: {
                          ...settings.quietHours,
                          enabled: e.target.checked,
                        },
                      };
                      handleUpdateSettings(updated, e.target.checked ? 'تم تفعيل ساعات الهدوء ✓' : 'تم التعطيل');
                    }}
                    className="accent-[#E6C66E] w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-[#A89E88] block mb-1">بداية الهدوء (النوم):</label>
                    <input
                      type="time"
                      value={settings.quietHours?.startTime || '23:00'}
                      onChange={(e) => {
                        const updated = {
                          ...settings,
                          quietHours: {
                            ...settings.quietHours,
                            startTime: e.target.value,
                          },
                        };
                        handleUpdateSettings(updated, `تم ضبط بداية ساعات الهدوء على ${e.target.value} ✓`);
                      }}
                      className="w-full py-1.5 px-2 rounded-xl bg-[#0E0B07] border border-[#C8A24A]/30 text-xs text-[#FFFDF8] font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-[#A89E88] block mb-1">نهاية الهدوء (الاستيقاظ):</label>
                    <input
                      type="time"
                      value={settings.quietHours?.endTime || '07:00'}
                      onChange={(e) => {
                        const updated = {
                          ...settings,
                          quietHours: {
                            ...settings.quietHours,
                            endTime: e.target.value,
                          },
                        };
                        handleUpdateSettings(updated, `تم ضبط نهاية ساعات الهدوء على ${e.target.value} ✓`);
                      }}
                      className="w-full py-1.5 px-2 rounded-xl bg-[#0E0B07] border border-[#C8A24A]/30 text-xs text-[#FFFDF8] font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LOCATION & CALCULATION METHOD */}
        {alertsTab === 'location' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Current Coordinates Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#17130B] to-[#0E0C08] border border-[#C8A24A]/25 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-[#A89E88] block">الموقع المعتمد لمواقيت الأذان:</span>
                <span className="font-extrabold text-[#F5EFE0] text-sm">
                  {settings.location?.city || 'القاهرة'} ({settings.location?.country || 'مصر'})
                </span>
              </div>
              <div className="text-left font-mono text-[#E6C66E] text-xs">
                <div>{settings.location?.latitude?.toFixed(4)}° N</div>
                <div>{settings.location?.longitude?.toFixed(4)}° E</div>
              </div>
            </div>

            {/* Calculation Methods Astrolabe Cards */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#E6C66E] block">
                طريقة الحساب الفلكي المعتمدة لأوقات الأذان:
              </label>
              <div className="space-y-2">
                {CALCULATION_METHODS.map((method) => {
                  const isSelected = settings.calculationMethod === method.id;
                  return (
                    <div
                      key={method.id}
                      onClick={() => handleMethodSelect(method.id)}
                      className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-gradient-to-l from-[#292112] via-[#1B160C] to-[#120F08] border-[#E6C66E] shadow-[0_4px_16px_rgba(214,179,106,0.18)]'
                          : 'bg-[#100D09] border-[#C8A24A]/20 hover:border-[#C8A24A]/50 hover:bg-[#16120C]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-[#F5EFE0] leading-tight">
                          {method.name}
                        </div>
                        <div className="text-[11px] text-[#A89E88] mt-1 leading-normal">
                          {method.region}
                        </div>
                        <div className="text-[10px] font-mono text-[#C8A24A] mt-1">
                          {method.angle}
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-[#E6C66E] border-[#FFF2C2] text-black shadow-sm'
                            : 'border-[#C8A24A]/40 bg-transparent'
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* =========================================================================
     CHAMBER 2: QURAN & RECITERS
     ========================================================================= */
  function renderQuranChamber() {
    return (
      <div className="athar-card space-y-4 border-[#C8A24A]/35">
        <div className="flex items-center gap-3 pb-3 border-b border-[#C8A24A]/25">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D2413] to-[#120E07] border border-[#E6C66E]/50 flex items-center justify-center text-[#E6C66E] shadow-md shrink-0">
            <BookOpen size={19} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#F5EFE0] font-arabic">
              قارئ المصحف الشريف المعتمد
            </h3>
            <p className="text-[11px] text-[#A89E88]">
              تسجيلات نقية معتمدة لكبار قراء العالم الإسلامي مع إمكانية التشغيل في الخلفية
            </p>
          </div>
        </div>

        {/* Reciters Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {VERIFIED_RECITERS.map((reciter) => {
            const isSelected = settings.selectedReciterId === reciter.id;
            return (
              <div
                key={reciter.id}
                onClick={() => handleReciterSelect(reciter.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-gradient-to-l from-[#292112] to-[#120F08] border-[#E6C66E] shadow-[0_4px_16px_rgba(214,179,106,0.18)]'
                    : 'bg-[#100D09] border-[#C8A24A]/20 hover:border-[#C8A24A]/50 hover:bg-[#16120C]'
                }`}
              >
                <div className="min-w-0">
                  <div className={`text-xs font-extrabold ${isSelected ? 'text-[#E6C66E]' : 'text-[#F5EFE0]'}`}>
                    {reciter.nameArabic}
                  </div>
                  <div className="text-[10px] text-[#A89E88] font-mono mt-0.5 truncate">
                    {reciter.nameEnglish}
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'bg-[#E6C66E] border-[#FFF2C2] text-black shadow-sm'
                      : 'border-[#C8A24A]/40 bg-transparent'
                  }`}
                >
                  {isSelected && <Check size={12} strokeWidth={3} />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Offline Center Monitor */}
        <div className="pt-2">
          <OfflineCenterCard />
        </div>
      </div>
    );
  }

  /* =========================================================================
     CHAMBER 3: WIDGETS & LIVE HOME SCREEN
     ========================================================================= */
  function renderWidgetsChamber() {
    return (
      <div className="athar-card space-y-4 border-[#C8A24A]/35">
        <div className="flex items-center gap-3 pb-3 border-b border-[#C8A24A]/25">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D2413] to-[#120E07] border border-[#E6C66E]/50 flex items-center justify-center text-[#E6C66E] shadow-md shrink-0">
            <LayoutGrid size={19} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#F5EFE0] font-arabic">
              ودجات الشاشة والأنشطة المباشرة
            </h3>
            <p className="text-[11px] text-[#A89E88]">
              تخصيص ويدجت مواقيت الصلاة التفاعلي المعروض على شاشة هاتفك الرئيسية
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Card 1: Royal Card */}
          <div
            onClick={() => handleWidgetStyleChange('royal_card')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
              widgetCustomization.style === 'royal_card'
                ? 'bg-gradient-to-b from-[#2A2213] to-[#120F08] border-[#E6C66E] shadow-[0_4px_20px_rgba(214,179,106,0.22)]'
                : 'bg-[#100D09] border-[#C8A24A]/20 hover:border-[#C8A24A]/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-[#F5EFE0]">البطاقة الملكية الكبيرة</span>
              {widgetCustomization.style === 'royal_card' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E6C66E] text-black font-extrabold">
                  نشط
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#A89E88] leading-relaxed">
              عرض مواقيت الصلوات الخمس بالكامل في نافذة واحدة مع شريط تقدم زمني ذهبي منساب حتى موعد الصلاة القادمة.
            </p>
          </div>

          {/* Card 2: Compact */}
          <div
            onClick={() => handleWidgetStyleChange('compact')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
              widgetCustomization.style === 'compact'
                ? 'bg-gradient-to-b from-[#2A2213] to-[#120F08] border-[#E6C66E] shadow-[0_4px_20px_rgba(214,179,106,0.22)]'
                : 'bg-[#100D09] border-[#C8A24A]/20 hover:border-[#C8A24A]/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-[#F5EFE0]">الشريط المصغر المدمج</span>
              {widgetCustomization.style === 'compact' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E6C66E] text-black font-extrabold">
                  نشط
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#A89E88] leading-relaxed">
              شريط أفقي مقتضب يركز على الصلاة الحالية والوقت المتبقي حتى لا يشغل مساحة من تطبيقات شاشتك.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================================
     CHAMBER 4: VOICE ASSISTANT
     ========================================================================= */
  function renderVoiceChamber() {
    return (
      <div className="athar-card space-y-4 border-[#C8A24A]/35">
        <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D2413] to-[#120E07] border border-[#E6C66E]/50 flex items-center justify-center text-[#E6C66E] shadow-md shrink-0">
              <Mic size={19} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#F5EFE0] font-arabic">
                المساعد الصوتي الذكي
              </h3>
              <p className="text-[11px] text-[#A89E88]">
                رفيق إسلامي صوتي باللغة العربية الفصيحة لتشغيل التلاوات والأذكار
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const up = !voiceSettings.enabled;
              VoiceAssistant.saveSettings({ enabled: up });
              setVoiceSettings(VoiceAssistant.getSettings());
              showToast(up ? 'تم تفعيل المساعد الصوتي بنجاح ✓' : 'تم تعطيل المساعد الصوتي');
            }}
            className={`w-12 h-6 rounded-full transition-all relative p-0.5 border shrink-0 cursor-pointer ${
              voiceSettings.enabled
                ? 'bg-gradient-to-r from-[#E6C66E] to-[#B88A2D] border-[#F3E5AB]'
                : 'bg-[#1D1912] border-[#C8A24A]/30'
            }`}
            aria-label="تفعيل أو تعطيل المساعد الصوتي"
          >
            <div
              className={`w-4.5 h-4.5 rounded-full transition-transform ${
                voiceSettings.enabled ? '-translate-x-6 bg-[#070707]' : 'translate-x-0 bg-[#C4B998]'
              }`}
            />
          </button>
        </div>

        <p className="text-xs text-[#B6B0A3] leading-relaxed">
          يمكّنك المساعد الصوتي من التحدث مباشرة باللغة العربية الفصحى؛ اطلب منه: «شغّل سورة الكهف بصوت العفاسي»، «كم باقي على صلاة العصر؟»، أو «افتح المسبحة».
        </p>

        {voiceSettings.enabled && (
          <button
            onClick={onOpenVoiceAssistant}
            className="athar-btn-primary w-full text-xs flex items-center justify-center gap-2"
          >
            <Sparkles size={14} />
            <span>فتح نافذة التحدث مع المساعد الصوتي</span>
          </button>
        )}
      </div>
    );
  }

  /* =========================================================================
     CHAMBER 5: DATA VAULT & BACKUP
     ========================================================================= */
  function renderBackupChamber() {
    return (
      <div className="athar-card space-y-4 border-[#C8A24A]/35">
        <div className="flex items-center gap-3 pb-3 border-b border-[#C8A24A]/25">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D2413] to-[#120E07] border border-[#E6C66E]/50 flex items-center justify-center text-[#E6C66E] shadow-md shrink-0">
            <Database size={19} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#F5EFE0] font-arabic">
              الخزينة الرقمية والنسخ الاحتياطي
            </h3>
            <p className="text-[11px] text-[#A89E88]">
              حفظ ختماتك القرآنية، أورادك، وشجرة الأثر محلياً دون أي خوادم خارجية
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleExportBackup}
            className="athar-btn-outline flex items-center justify-center gap-2 text-xs !py-2.5"
          >
            <Download size={14} className="text-[#E6C66E]" />
            <span>تصدير نسخة JSON</span>
          </button>

          <label className="athar-btn-outline flex items-center justify-center gap-2 text-xs !py-2.5 cursor-pointer">
            <Upload size={14} className="text-[#E6C66E]" />
            <span>استيراد نسخة سابقة</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>
        </div>

        {/* Danger Zone: Factory Reset */}
        <div className="p-3.5 rounded-2xl border border-red-900/40 bg-gradient-to-b from-[#1C1010] to-[#120A0A] space-y-2.5">
          <div className="flex items-center gap-2 text-red-300 text-xs font-bold">
            <Trash2 size={15} />
            <span>مسح شامل وإعادة ضبط المصنع</span>
          </div>
          <p className="text-[11px] text-red-300/70 leading-relaxed">
            سيؤدي هذا الإجراء إلى حذف كافة السجلات والختمات المحلية والعودة للحالة الأولى للتطبيق.
          </p>

          {showClearConfirm ? (
            <div className="space-y-2 pt-1">
              <span className="text-xs text-red-200 font-bold block">هل أنت متأكد تماماً من المسح؟</span>
              <div className="flex gap-2">
                <button
                  onClick={handleFullReset}
                  className="flex-1 py-2 px-3 rounded-xl bg-red-600 text-white font-extrabold text-xs active:scale-95"
                >
                  نعم، امسح الآن
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#26211A] text-[#B6B0A3] text-xs font-bold"
                >
                  إلغاء التراجع
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-xs text-red-400 hover:text-red-300 underline font-bold cursor-pointer"
            >
              تأكيد مسح البيانات المحلية...
            </button>
          )}
        </div>
      </div>
    );
  }

  /* =========================================================================
     CHAMBER 6: ABOUT ATHAR
     ========================================================================= */
  function renderAboutChamber() {
    return (
      <div className="athar-card space-y-4 text-center py-6 px-4 border-[#C8A24A]/35">
        <div className="flex justify-center">
          <AtharBrandLogo size="md" showWordmark={false} showSubtitle={false} centered={true} />
        </div>

        <div className="max-w-md mx-auto space-y-2.5 pt-2">
          <p className="text-xs text-[#B6B0A3] leading-relaxed">
            منظومة وقفية إسلامية مباركة تهدف لتقديم تجربة روحانية ملكية متكاملة للقرآن الكريم، ومواقيت الصلاة الفلكية، والأذكار والسنن النبوية، بعيداً عن أي إعلانات أو تشتيت.
          </p>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#16120B] border border-[#C8A24A]/30 text-xs font-bold text-[#E6C66E]">
            <ShieldCheck size={14} />
            <span>بياناتك محفوظة 100% على جهازك · صفر تعقب</span>
          </div>
        </div>
      </div>
    );
  }
};

export default SettingsView;
