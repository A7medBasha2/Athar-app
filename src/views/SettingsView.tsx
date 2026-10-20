import React, { useState, useEffect, useMemo } from 'react';
import { AppSettings, Coordinates, PrayerCalculationMethod } from '../types';
import { StorageService } from '../services/storageService';
import { VERIFIED_RECITERS } from '../data/surahsData';
import { VERIFIED_DHIKR_REMINDERS, DhikrAudioReminderItem } from '../data/dhikrRemindersData';
import { LUXURY_IMAGES } from '../data/storiesAndExploreData';
import { ReminderEngine } from '../services/reminderService';
import { NativePermissions, NativePermissionsBridge } from '../services/nativePermissionsBridge';
import { NativeNotificationService } from '../services/nativeNotificationService';

// Dedicated high-res Islamic thematic images tailored to each section's exact semantic meaning
import alertsImg from '../assets/images/adhan_golden_minaret_sky_1791721041473.webp';
import prayersImg from '../assets/images/adhan_fajr_dawn_kaaba_1791728275991.webp';
import quranImg from '../assets/images/open_quran_royal_highres_1791675898187.webp';
import voiceImg from '../assets/images/settings_voice_aura_1792175837131.webp';
import backupImg from '../assets/images/settings_data_vault_1792175851190.webp';
import aboutImg from '../assets/images/golden_tree_mihrab_clean_1791731494979.webp';
import {
  Compass,
  Clock,
  BookOpen,
  Mic,
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
  ArrowUpCircle,
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
  Calendar,
  User as UserIcon,
  LogIn,
  LogOut,
  Cloud,
} from 'lucide-react';
import { AuthService } from '../services/authService';
import { PermissionsSetupWizard } from '../components/PermissionsSetupWizard';
import { VoiceAssistant, VoiceAssistantSettings } from '../services/voiceAssistantService';
import { LiveActivityService } from '../services/liveActivityService';
import { OfflineCenterCard } from '../components/OfflineCenterCard';
import { AtharBrandLogo } from '../components/AtharBrandLogo';
import { AudioService } from '../services/audioService';
import { AppUpdateService, CURRENT_APP_VERSION } from '../services/appUpdateService';
import { RoyalRemindersMasterCard } from '../components/RoyalRemindersMasterCard';
import { AdhanIqamahSettingsView } from './AdhanIqamahSettingsView';

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
  onNavigateTab?: (tab: string) => void;
  onOpenTasbih?: () => void;
  onOpenWird?: () => void;
  onOpenParents?: () => void;
  onOpenAuth?: () => void;
}

type SectionKey = 'unified_prayers_alerts' | 'alerts' | 'adhan_iqamah' | 'prayers' | 'quran' | 'voice' | 'backup' | 'about';

export const SettingsView: React.FC<SettingsViewProps> = ({
  onOpenCodeInspector,
  onOpenVoiceAssistant,
  onLocationChange,
  onNavigateTab,
  onOpenTasbih,
  onOpenWird,
  onOpenParents,
  onOpenAuth,
}) => {
  const [currentUser, setCurrentUser] = useState(() => AuthService.getCurrentUser());
  const [settings, setSettings] = useState<AppSettings>(() => StorageService.getSettings());
  const [voiceSettings, setVoiceSettings] = useState<VoiceAssistantSettings>(() => VoiceAssistant.getSettings());
  const [isLocationWizardOpen, setIsLocationWizardOpen] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active section view (null = directory of sections, or specific SectionKey)
  const [activeGate, setActiveGate] = useState<SectionKey | null>(null);
  const [unifiedSubTab, setUnifiedSubTab] = useState<'adhan' | 'reminders' | 'location'>('adhan');

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

  // In-App Update state
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [updateStatusText, setUpdateStatusText] = useState<string | null>(null);
  const [currentRepo, setCurrentRepo] = useState<string>(() => AppUpdateService.getRepository());
  const [isEditingRepo, setIsEditingRepo] = useState<boolean>(false);
  const [repoInput, setRepoInput] = useState<string>(() => AppUpdateService.getRepository());

  const handleManualCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatusText('جاري البحث عن تحديثات جديدة...');
    try {
      const info = await AppUpdateService.checkForUpdates(true);
      if (info.hasUpdate) {
        setUpdateStatusText(`يتوفر تحديث جديد: v${info.latestVersion}`);
        setToastMessage(`تم العثور على تحديث جديد (v${info.latestVersion}) ✨`);
        window.dispatchEvent(
          new CustomEvent('athar_trigger_update_modal', { detail: { updateInfo: info } })
        );
      } else {
        setUpdateStatusText(`أنت على أحدث إصدار متوفر (v${CURRENT_APP_VERSION}) ✓`);
        setToastMessage(`أنت على أحدث إصدار من تطبيق أثر (v${CURRENT_APP_VERSION}) ✓`);
      }
    } catch (e: any) {
      setUpdateStatusText('تعذر التحقق من التحديثات. تحقق من اتصال الإنترنت.');
      setToastMessage('تعذر التحقق من التحديثات');
    } finally {
      setIsCheckingUpdate(false);
      setTimeout(() => {
        setToastMessage(null);
      }, 4000);
    }
  };

  const handleSaveRepo = (repoName: string) => {
    const trimmed = repoName.trim();
    if (trimmed && trimmed.includes('/')) {
      AppUpdateService.setRepository(trimmed);
      setCurrentRepo(trimmed);
      setIsEditingRepo(false);
      setToastMessage('تم حفظ مستودع GitHub المعتمد بنجاح ✓');
    }
  };

  useEffect(() => {
    setSettings(StorageService.getSettings());

    const unsubVoice = VoiceAssistant.subscribe((vs) => {
      setVoiceSettings(vs);
    });

    const unsubAuth = AuthService.subscribeToAuthState((u) => {
      setCurrentUser(u);
    });

    return () => {
      unsubVoice();
      unsubAuth();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await AuthService.logout();
      showToast('تم تسجيل الخروج بنجاح من الحساب السحابي');
    } catch {
      showToast('تعذر تسجيل الخروج، يرجى المحاولة لاحقاً');
    }
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
      id: 'unified_prayers_alerts' as SectionKey,
      title: 'إعدادات التنبيهات والأذان والموقع الفلكي',
      subtitle: 'مواقيت الصلاة، شاشة الأذان، التنبيهات الملكية، وتحديد الموقع',
      icon: BellRing,
      image: prayersImg,
      currentValue: `${settings.location?.city || 'القاهرة'} · ${settings.adhanEnabled ? 'الأذان مفعل' : 'الأذان صامت'} · التنبيهات نشطة`,
      tag: 'منظومة المواقيت والتنبيهات الموحدة',
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

  const renderSectionCard = (section: (typeof sections)[0], isFullWidth: boolean = false) => {
    const Icon = section.icon;
    return (
      <div
        key={section.id}
        onClick={() => setActiveGate(section.id)}
        className={`group relative rounded-2xl overflow-hidden border border-[#C8A24A]/30 hover:border-[#E6C66E]/80 transition-all duration-300 cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.7)] hover:shadow-[0_14px_36px_rgba(200,162,74,0.22)] active:scale-98 flex flex-col justify-between min-h-[175px] sm:min-h-[190px] p-4.5 ${
          isFullWidth ? 'sm:col-span-2' : ''
        }`}
      >
        <img
          src={section.image}
          alt={section.title}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.55] contrast-110 group-hover:scale-106 group-hover:brightness-[0.68] transition-all duration-700 pointer-events-none"
        />

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(8,6,4,0.45) 0%, rgba(12,9,6,0.68) 40%, rgba(8,6,4,0.92) 80%, #080604 100%)',
          }}
        />

        <div className="relative z-10 flex items-start justify-between gap-2">
          <div className="w-10 h-10 rounded-xl bg-[#141009]/90 border border-[#E6C66E]/50 flex items-center justify-center text-[#E6C66E] shadow-[0_4px_16px_rgba(0,0,0,0.85)] backdrop-blur-md group-hover:scale-105 transition-transform">
            <Icon size={19} />
          </div>

          <div className="w-7 h-7 rounded-lg bg-[#0E0C08]/85 border border-[#C8A24A]/40 flex items-center justify-center text-[#C8A24A] group-hover:text-[#E6C66E] group-hover:border-[#E6C66E]/80 transition-colors shadow-sm">
            <ChevronLeft size={16} />
          </div>
        </div>

        <div className="relative z-10 flex flex-col gap-2.5 mt-4 min-w-0 w-full">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-[#FFFDF8] font-arabic leading-tight group-hover:text-[#FFF2C2] transition-colors drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] line-clamp-1">
              {section.title}
            </h2>
            <p className="text-xs text-[#E1D7C3] mt-0.5 leading-snug line-clamp-1 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] truncate">
              {section.subtitle}
            </p>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-[#0F0C08]/90 border border-[#C8A24A]/30 backdrop-blur-md flex items-center text-xs shadow-sm overflow-hidden min-w-0 max-w-full">
            <span className="text-[#E6C66E] font-medium truncate drop-shadow-sm text-[11px] block w-full">
              {section.currentValue}
            </span>
          </div>
        </div>
      </div>
    );
  };

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

      {/* Cloud Account & Identity Card */}
      <div className="relative rounded-2xl overflow-hidden border border-[#D4AF37]/35 bg-gradient-to-r from-[#14110A] via-[#1B160C] to-[#14110A] p-4 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#D4AF37]/25 to-[#B8860B]/10 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shrink-0 shadow-inner overflow-hidden">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'صورة المستخدم'}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <UserIcon className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white truncate">
                  {currentUser ? (currentUser.displayName || 'مستخدم أثر الكريم') : 'وضع الزائر (استخدام محلي)'}
                </span>
                {currentUser && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                    <Cloud className="w-3 h-3" />
                    <span>سحابي</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[#D4AF37]/70 truncate mt-0.5">
                {currentUser ? currentUser.email : 'تسجيل الدخول يتيح لك مزامنة الختمات والأذكار عبر السحابة'}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {currentUser ? (
              <button
                type="button"
                onClick={handleLogout}
                className="py-2 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>خروج</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (onOpenAuth) {
                    onOpenAuth();
                  } else {
                    window.dispatchEvent(new CustomEvent('athar_open_auth'));
                  }
                }}
                className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-[#060503] text-xs font-bold flex items-center gap-1.5 transition hover:brightness-110 shadow-md shadow-[#D4AF37]/20 active:scale-95 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>دخول / تسجيل</span>
              </button>
            )}
          </div>
        </div>
      </div>

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
            {(activeGate === 'unified_prayers_alerts' || activeGate === 'adhan_iqamah' || activeGate === 'alerts' || activeGate === 'prayers') && (
              <div className="space-y-4">
                {/* Unified Segmented Tabs */}
                <div className="p-1.5 rounded-2xl bg-[#12100B] border border-[#C8A24A]/35 shadow-lg flex items-center gap-1.5">
                  <button
                    onClick={() => setUnifiedSubTab('adhan')}
                    className={`flex-1 min-h-[44px] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      unifiedSubTab === 'adhan'
                        ? 'bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-black shadow-md'
                        : 'text-[#B6B0A3] hover:text-[#F2EBDD] hover:bg-white/5'
                    }`}
                  >
                    <BellRing size={16} />
                    <span className="whitespace-nowrap">الأذان والإقامة</span>
                  </button>

                  <button
                    onClick={() => setUnifiedSubTab('reminders')}
                    className={`flex-1 min-h-[44px] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      unifiedSubTab === 'reminders'
                        ? 'bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-black shadow-md'
                        : 'text-[#B6B0A3] hover:text-[#F2EBDD] hover:bg-white/5'
                    }`}
                  >
                    <Sparkles size={16} />
                    <span className="whitespace-nowrap">التنبيهات الملكية</span>
                  </button>

                  <button
                    onClick={() => setUnifiedSubTab('location')}
                    className={`flex-1 min-h-[44px] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      unifiedSubTab === 'location'
                        ? 'bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-black shadow-md'
                        : 'text-[#B6B0A3] hover:text-[#F2EBDD] hover:bg-white/5'
                    }`}
                  >
                    <Compass size={16} />
                    <span className="whitespace-nowrap">الموقع الفلكي</span>
                  </button>
                </div>

                {/* Tab 1: Adhan & Iqamah */}
                {unifiedSubTab === 'adhan' && (
                  <AdhanIqamahSettingsView onBack={() => setActiveGate(null)} hideHeader={true} />
                )}

                {/* Tab 2: Royal Reminders */}
                {unifiedSubTab === 'reminders' && (
                  <RoyalRemindersMasterCard
                    settings={settings}
                    onUpdateSettings={handleUpdateSettings}
                    onNavigateTab={onNavigateTab}
                    onOpenTasbih={onOpenTasbih}
                    onOpenWird={onOpenWird}
                    onOpenParents={onOpenParents}
                    onOpenWizard={() => setIsLocationWizardOpen(true)}
                  />
                )}

                {/* Tab 3: Astronomical Location & Calculation */}
                {unifiedSubTab === 'location' && renderAlertsChamber()}
              </div>
            )}
            {activeGate === 'quran' && renderQuranChamber()}
            {activeGate === 'voice' && renderVoiceChamber()}
            {activeGate === 'backup' && renderBackupChamber()}
            {activeGate === 'about' && renderAboutChamber()}
          </div>
        ) : (
          <>
            {/* Master Unified Card (Full Width) + Remaining Gate Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fadeIn">
              {renderSectionCard(sections[0], true)}
              {sections.slice(1).map((section) => renderSectionCard(section))}
            </div>
          </>
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
     CHAMBER 1: LOCATION & CALCULATION (الموقع الجغرافي والحساب الفلكي)
     ========================================================================= */
  function renderAlertsChamber() {
    return (
      <div className="athar-card space-y-4 border-[#C8A24A]/35">
        {/* Header Title & Description */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D2413] to-[#120E07] border border-[#E6C66E]/50 flex items-center justify-center text-[#E6C66E] shadow-md shrink-0">
              <Compass size={20} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#F5EFE0] font-arabic">
                الموقع الجغرافي والحساب الفلكي
              </h3>
              <p className="text-[11px] text-[#A89E88]">
                تحديد المدينة بدقة واختيار المنهج الفلكي المعتمد لحساب المواقيت والقبلة
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsLocationWizardOpen(true)}
            className="athar-btn-primary text-xs !py-1.5 !px-3 shrink-0 cursor-pointer"
          >
            تغيير المدينة
          </button>
        </div>

        {/* Current Coordinates Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#17130B] to-[#0E0C08] border border-[#C8A24A]/25 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-[#A89E88] block">الموقع المعتمد لمواقيت الصلاة والقبلة:</span>
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
            طريقة الحساب الفلكي المعتمدة لأوقات الأذان والمواقيت:
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

        {/* إعدادات التنبيهات الملكية تلي قسم الموقع والحساب الفلكي */}
        <div className="pt-2">
          <RoyalRemindersMasterCard
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onNavigateTab={onNavigateTab}
            onOpenTasbih={onOpenTasbih}
            onOpenWird={onOpenWird}
            onOpenParents={onOpenParents}
            onOpenWizard={() => setIsLocationWizardOpen(true)}
          />
        </div>
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
     CHAMBER 3: VOICE ASSISTANT
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
  /* =========================================================================
     CHAMBER 6: ABOUT ATHAR & IN-APP UPDATES
     ========================================================================= */
  function renderAboutChamber() {
    return (
      <div className="space-y-4">
        {/* About App Brand Card */}
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

        {/* Dedicated In-App Update Card */}
        <div className="athar-card space-y-3.5 p-4 border-[#C8A24A]/40 bg-gradient-to-b from-[#18130B] via-[#120E08] to-[#0A0805]">
          <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/20">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#C8A24A]/15 border border-[#C8A24A]/40 flex items-center justify-center text-[#E6C66E]">
                <ArrowUpCircle size={19} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#F5EFE0]">
                  نظام تحديثات التطبيق
                </h4>
                <p className="text-[11px] text-[#A89E88]">
                  فحص دوري وتثبيت مباشر لأحدث التحسينات مع حفظ البيانات
                </p>
              </div>
            </div>
            <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-black/50 border border-[#C8A24A]/30 text-emerald-400 font-bold">
              v{CURRENT_APP_VERSION}
            </span>
          </div>

          {/* Security & System Status */}
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs">
            <span className="text-stone-400 text-[11px]">حالة الأمان والبيانات:</span>
            <span className="text-emerald-400 text-[11px] font-bold flex items-center gap-1">
              <span>حفظ البيانات 100%</span>
              <Check size={12} />
            </span>
          </div>

          {/* Feedback Status Notice */}
          {updateStatusText && (
            <div className="p-2.5 rounded-xl bg-[#231A0F] border border-[#C8A24A]/40 text-xs text-[#F5EFE0] flex items-center gap-2 animate-fadeIn">
              <RefreshCw size={14} className={`text-[#E6C66E] shrink-0 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
              <span className="text-[11px] font-medium leading-relaxed">{updateStatusText}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-1">
            <button
              onClick={handleManualCheckUpdate}
              disabled={isCheckingUpdate}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#C8A24A] via-[#E2C374] to-[#B38D33] text-[#141009] font-bold text-xs shadow-md hover:shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              <span>{isCheckingUpdate ? 'جاري الفحص...' : 'البحث عن تحديثات الآن'}</span>
              <RefreshCw size={14} className={isCheckingUpdate ? 'animate-spin' : ''} />
            </button>
          </div>

          <p className="text-[10px] text-stone-500 text-center pt-1">
            يتم فحص التحديثات آلياً عند بدء تشغيل التطبيق في الخلفية دون أي تأثير على سرعة الاستجابة.
          </p>
        </div>
      </div>
    );
  }
};

export default SettingsView;
