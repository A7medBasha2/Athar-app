import React, { useState, useEffect, useMemo } from 'react';
import { AppSettings, Coordinates, PrayerCalculationMethod } from '../types';
import { StorageService, AndroidWidgetCustomization } from '../services/storageService';
import { VERIFIED_RECITERS } from '../data/surahsData';
import { LUXURY_IMAGES } from '../data/storiesAndExploreData';

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
  Bell,
  BellRing,
} from 'lucide-react';
import { PermissionsSetupWizard } from '../components/PermissionsSetupWizard';
import { VoiceAssistant, VoiceAssistantSettings } from '../services/voiceAssistantService';
import { LiveActivityService } from '../services/liveActivityService';
import { OfflineCenterCard } from '../components/OfflineCenterCard';
import { AtharBrandLogo } from '../components/AtharBrandLogo';

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

  // Sub-tab inside Alerts section: adhan vs reminders vs location
  const [alertsTab, setAlertsTab] = useState<'adhan' | 'reminders' | 'location'>('adhan');

  // Widget settings
  const [widgetCustomization, setWidgetCustomization] = useState<AndroidWidgetCustomization>(
    () => StorageService.getWidgetCustomization()
  );

  useEffect(() => {
    setSettings(StorageService.getSettings());

    const unsubVoice = VoiceAssistant.subscribe((vs) => {
      setVoiceSettings(vs);
    });

    const handleWidgetCustomizationChanged = (e: any) => {
      if (e.detail) setWidgetCustomization(e.detail);
    };

    window.addEventListener('athar_widget_customization_changed', handleWidgetCustomizationChanged);

    return () => {
      unsubVoice();
      window.removeEventListener('athar_widget_customization_changed', handleWidgetCustomizationChanged);
    };
  }, []);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleUpdateSettings = (newSettings: AppSettings, message?: string) => {
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
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
              className="w-full py-2.5 px-4 rounded-xl bg-[#14110A] border border-[#C8A24A]/30 text-[#E6C66E] hover:text-[#FFF2C2] hover:bg-[#1C170E] font-bold text-xs flex items-center justify-between transition-all active:scale-98 shadow-sm cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ArrowRight size={15} />
                <span>العودة إلى قائمة الإعدادات</span>
              </div>
              <span className="text-[11px] text-[#9E9478]">جميع الأقسام</span>
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

        {/* Segmented Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[#0E0C08] border border-[#C8A24A]/25">
          <button
            onClick={() => setAlertsTab('adhan')}
            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
              alertsTab === 'adhan'
                ? 'bg-gradient-to-l from-[#C8A24A] to-[#E6C66E] text-black shadow-md'
                : 'text-[#9E9478] hover:text-[#E6C66E] hover:bg-[#16120C]'
            }`}
          >
            أذان الصلوات
          </button>
          <button
            onClick={() => setAlertsTab('reminders')}
            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
              alertsTab === 'reminders'
                ? 'bg-gradient-to-l from-[#C8A24A] to-[#E6C66E] text-black shadow-md'
                : 'text-[#9E9478] hover:text-[#E6C66E] hover:bg-[#16120C]'
            }`}
          >
            الأذكار والسنن
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

        {/* TAB 1: PRAYER ADHAN CONTROLS */}
        {alertsTab === 'adhan' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Master Adhan Switch */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#20180C] via-[#141009] to-[#0D0B07] border border-[#E6C66E]/40 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    settings.adhanEnabled
                      ? 'bg-[#E6C66E] text-black shadow-[0_0_12px_rgba(230,198,110,0.5)]'
                      : 'bg-[#15110A] text-[#8C8370] border border-[#C8A24A]/25'
                  }`}
                >
                  <BellRing size={18} />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-[#F5EFE0]">
                    أذان الصلوات الخمس
                  </div>
                  <div className="text-[10px] text-[#A89E88]">
                    {settings.adhanEnabled ? 'التنبيه الصوتي مفعل عند دخول الوقت' : 'التنبيه معطل مؤقتاً'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  const updated = { ...settings, adhanEnabled: !settings.adhanEnabled };
                  handleUpdateSettings(updated, updated.adhanEnabled ? 'تم تفعيل أذان الصلوات بنجاح ✓' : 'تم تعطيل الأذان مؤقتاً');
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.adhanEnabled ? 'bg-[#E6C66E]' : 'bg-[#2A2315]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                    settings.adhanEnabled ? 'translate-x-0' : '-translate-x-5'
                  }`}
                />
              </button>
            </div>

            {/* Moazzen Selection */}
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
                        const updated = { ...settings, adhanVoice: voice.id };
                        handleUpdateSettings(updated, `تم اعتماد صوت: ${voice.name} ✓`);
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

            {/* Adhan Mode: Full vs Takbeers */}
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

            {/* Quick Preference Toggles */}
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

              {/* Dua after Adhan Toggle */}
              <div className="p-3 rounded-xl bg-[#110E09] border border-[#C8A24A]/20 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#F5EFE0]">دعاء ما بعد الأذان</div>
                  <div className="text-[10px] text-[#A89E88]">«اللهم رب هذه الدعوة التامة والصلاة القائمة...»</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.duaAfterAdhanEnabled}
                  onChange={(e) => {
                    const updated = { ...settings, duaAfterAdhanEnabled: e.target.checked };
                    handleUpdateSettings(updated, updated.duaAfterAdhanEnabled ? 'تم تفعيل دعاء ما بعد الأذان ✓' : 'تم التعطيل');
                  }}
                  className="accent-[#E6C66E] w-4 h-4 cursor-pointer"
                />
              </div>

              {/* Iqamah Alert Toggle */}
              <div className="p-3 rounded-xl bg-[#110E09] border border-[#C8A24A]/20 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#F5EFE0]">تذكير الإقامة بعد الأذان</div>
                  <div className="text-[10px] text-[#A89E88]">تنبيه قبل إقامة الصلاة بـ 15 دقيقة (المغرب 5 دقائق)</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.iqamahSettings?.enabled}
                  onChange={(e) => {
                    const updated = {
                      ...settings,
                      iqamahSettings: {
                        ...settings.iqamahSettings,
                        enabled: e.target.checked,
                      },
                    };
                    handleUpdateSettings(updated, updated.iqamahSettings.enabled ? 'تم تفعيل تذكير الإقامة ✓' : 'تم التعطيل');
                  }}
                  className="accent-[#E6C66E] w-4 h-4 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ADHKAR & SUNAN REMINDERS */}
        {alertsTab === 'reminders' && (
          <div className="space-y-2.5 animate-fadeIn">
            {/* Morning & Evening Adhkar */}
            <div className="p-3.5 rounded-2xl bg-[#100D09] border border-[#C8A24A]/20 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#F5EFE0]">أذكار الصباح والمساء</div>
                <div className="text-[10px] text-[#A89E88]">حصنك اليومي بعد صلاتي الفجر والعصر</div>
              </div>
              <input
                type="checkbox"
                checked={settings.dhikrReminder?.enabled ?? true}
                onChange={(e) => {
                  const updated = {
                    ...settings,
                    dhikrReminder: {
                      ...settings.dhikrReminder,
                      enabled: e.target.checked,
                    },
                  };
                  handleUpdateSettings(updated, e.target.checked ? 'تم تفعيل تنبيه أذكار الصباح والمساء ✓' : 'تم التعطيل');
                }}
                className="accent-[#E6C66E] w-4 h-4 cursor-pointer"
              />
            </div>

            {/* Daily Quran Wird */}
            <div className="p-3.5 rounded-2xl bg-[#100D09] border border-[#C8A24A]/20 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#F5EFE0]">تنبيه ورد القرآن الكريم</div>
                <div className="text-[10px] text-[#A89E88]">تذكير يومي مبارك لتلاوة جزء أو صفحة من كتاب الله</div>
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

            {/* Salawat on the Prophet */}
            <div className="p-3.5 rounded-2xl bg-[#100D09] border border-[#C8A24A]/20 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#F5EFE0]">الصلاة على النبي ﷺ</div>
                <div className="text-[10px] text-[#A89E88]">تذكير إيماني مبارك بفضائل الصلاة على الحبيب ﷺ</div>
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
                  handleUpdateSettings(updated, e.target.checked ? 'تم تفعيل تذكير الصلاة على النبي ﷺ ✓' : 'تم التعطيل');
                }}
                className="accent-[#E6C66E] w-4 h-4 cursor-pointer"
              />
            </div>

            {/* Quiet Hours */}
            <div className="p-3.5 rounded-2xl bg-[#100D09] border border-[#C8A24A]/20 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#F5EFE0]">وضع الهدوء وعدم الإزعاج</div>
                <div className="text-[10px] text-[#A89E88]">كتم التنبيهات تلقائياً أثناء ساعات الراحة والنوم</div>
              </div>
              <input
                type="checkbox"
                checked={settings.quietHours?.enabled ?? false}
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
