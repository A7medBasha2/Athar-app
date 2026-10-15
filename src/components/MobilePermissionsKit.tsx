import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldCheck,
  Bell,
  BatteryCharging,
  Maximize2,
  Lock,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  Volume2,
  Layers,
  Sparkles,
  Play,
  Clock,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { NotificationService } from '../services/notificationService';
import { AudioService } from '../services/audioService';
import { ReminderEngine } from '../services/reminderService';
import {
  NativePermissionsBridge,
  ATHAR_PACKAGE_NAME,
} from '../services/nativePermissionsBridge';

interface MobilePermissionsKitProps {
  onAllConfigured?: () => void;
  compact?: boolean;
  hideHeader?: boolean;
  hideTesters?: boolean;
}

export const MobilePermissionsKit: React.FC<MobilePermissionsKitProps> = ({
  onAllConfigured,
  compact = false,
  hideHeader,
  hideTesters,
}) => {
  const shouldHideHeader = hideHeader ?? compact;
  const shouldHideTesters = hideTesters ?? compact;
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>(() =>
    NotificationService.getPermissionStatus()
  );
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(() =>
    AudioService.isAudioUnlocked()
  );

  // Real native verified permissions
  const [isOverlayGranted, setIsOverlayGranted] = useState<boolean>(() =>
    localStorage.getItem('athar_perm_overlay_verified') === 'true'
  );
  const [isExactAlarmGranted, setIsExactAlarmGranted] = useState<boolean>(() =>
    localStorage.getItem('athar_perm_exact_alarm_verified') === 'true'
  );
  const [batteryOptimizationDismissed, setBatteryOptimizationDismissed] = useState<boolean>(() =>
    localStorage.getItem('athar_perm_battery_opt') === 'true'
  );
  const [lockScreenPermissionDismissed, setLockScreenPermissionDismissed] = useState<boolean>(() =>
    localStorage.getItem('athar_perm_lockscreen') === 'true'
  );
  const [popupWindowDismissed, setPopupWindowDismissed] = useState<boolean>(() =>
    localStorage.getItem('athar_perm_popup') === 'true'
  );
  const [backgroundAutostartDismissed, setBackgroundAutostartDismissed] = useState<boolean>(() =>
    localStorage.getItem('athar_perm_autostart') === 'true'
  );
  const [homeShortcutInstalled, setHomeShortcutInstalled] = useState<boolean>(() =>
    localStorage.getItem('athar_perm_homescreen') === 'true'
  );

  const [activeBrandGuide, setActiveBrandGuide] = useState<string | null>(null);
  const [testCountdown, setTestCountdown] = useState<number>(0);
  const [pwaPrompt, setPwaPrompt] = useState<any>(null);
  const [isCheckingRealStatus, setIsCheckingRealStatus] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showOverlayExplanationModal, setShowOverlayExplanationModal] = useState<boolean>(false);

  // Real system permission query callback
  const checkRealSystemPermissions = useCallback(async () => {
    setIsCheckingRealStatus(true);
    try {
      // 1. Overlay (Display Over Other Apps)
      const overlayReal = await NativePermissionsBridge.checkOverlayPermission();
      setIsOverlayGranted(overlayReal);

      // 2. Exact Alarms (Android 12+ / API 31+)
      const exactReal = await NativePermissionsBridge.checkExactAlarmPermission();
      setIsExactAlarmGranted(exactReal);

      // 3. Notifications
      const notifStatus = NotificationService.getPermissionStatus();
      setNotificationStatus(notifStatus);

      // 4. Audio
      setIsAudioUnlocked(AudioService.isAudioUnlocked());
    } finally {
      setIsCheckingRealStatus(false);
    }
  }, []);

  useEffect(() => {
    checkRealSystemPermissions();

    const unsub = NotificationService.subscribePermission((perm) => {
      setNotificationStatus(perm);
    });

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setPwaPrompt(e);
    };

    // Re-check whenever user returns from Android Settings back to Athar!
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkRealSystemPermissions();
      }
    };
    const handleFocus = () => {
      checkRealSystemPermissions();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      unsub();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkRealSystemPermissions]);

  const handleGrantNotification = async () => {
    const res = await NotificationService.requestPermission();
    setNotificationStatus(res);
    if (res === 'granted') {
      NotificationService.notify({
        title: 'تم تفعيل إشعارات أثر بنجاح ✓',
        body: 'ستصلك مواقيت الصلاة والأذان وتذكيرات القرآن والأذكار في موعدها بدقة.',
        type: 'info',
      });
    } else {
      await NativePermissionsBridge.openNotificationSettings();
    }
  };

  const handleUnlockAudio = () => {
    AudioService.unlockAudio();
    setIsAudioUnlocked(true);
    ReminderEngine.testSalawatReminder();
  };

  const handleInstallHomeShortcut = async () => {
    if (pwaPrompt && typeof pwaPrompt.prompt === 'function') {
      pwaPrompt.prompt();
      const choice = await pwaPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        localStorage.setItem('athar_perm_homescreen', 'true');
        setHomeShortcutInstalled(true);
      }
    } else {
      localStorage.setItem('athar_perm_homescreen', 'true');
      setHomeShortcutInstalled(true);
      NotificationService.notify({
        title: 'إضافة أثر إلى الشاشة الرئيسية',
        body: 'لإضافة أثر: اضغط على خيارات المتصفح (⋮) أو زر المشاركة (⎋) ثم اختر "إضافة إلى الشاشة الرئيسية" (Add to Home screen).',
        type: 'info',
      });
    }
  };

  /**
   * Real Native Overlay Intent Trigger (package:com.athar.athar)
   */
  const handleOpenOverlaySettings = () => {
    setShowOverlayExplanationModal(true);
  };

  const handleConfirmOpenOverlaySettings = async () => {
    setShowOverlayExplanationModal(false);
    setStatusMessage('جارٍ فتح شاشة ضبط «الظهور فوق التطبيقات» لتطبيق أثر...');
    await NativePermissionsBridge.openOverlayPermissionSettings();
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  /**
   * Real Native Exact Alarms Intent Trigger (package:com.athar.athar)
   */
  const handleOpenExactAlarmSettings = async () => {
    setStatusMessage('جارٍ فتح شاشة ضبط «المنبهات الدقيقة» لتطبيق أثر...');
    await NativePermissionsBridge.openExactAlarmSettings();
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  /**
   * Real Native Battery Optimizations Settings Trigger
   */
  const handleOpenBatterySettings = async () => {
    setStatusMessage('جارٍ فتح شاشة «تجاهل تحسين البطارية» لتطبيق أثر...');
    await NativePermissionsBridge.openBatteryOptimizationSettings();
    localStorage.setItem('athar_perm_battery_opt', 'true');
    setBatteryOptimizationDismissed(true);
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  /**
   * Real Native App Info Settings Trigger
   */
  const handleOpenAppSettings = async () => {
    setStatusMessage('جارٍ فتح صفحة معلومات تطبيق أثر في إعدادات النظام...');
    await NativePermissionsBridge.openAppSettings();
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  const handleTestOutsideApp = () => {
    if (testCountdown > 0) return;
    setTestCountdown(5);
    const interval = window.setInterval(() => {
      setTestCountdown((prev) => {
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

  const handleGrantAllMaster = async () => {
    // 1. Audio unlock
    AudioService.unlockAudio();
    setIsAudioUnlocked(true);

    // 2. Notification request
    await handleGrantNotification();

    // 3. Trigger Real Native Settings sequentially
    await NativePermissionsBridge.openOverlayPermissionSettings();

    // 4. Mark non-intrusive local preferences
    localStorage.setItem('athar_perm_lockscreen', 'true');
    setLockScreenPermissionDismissed(true);
    localStorage.setItem('athar_perm_popup', 'true');
    setPopupWindowDismissed(true);
    localStorage.setItem('athar_perm_autostart', 'true');
    setBackgroundAutostartDismissed(true);

    onAllConfigured?.();
  };

  const permissionsList = [
    {
      id: 'notification',
      title: 'إشعارات النظام وشريط التنبيهات',
      desc: 'لإظهار تنبيهات الأذان والآيات كإشعار منبثق من أعلى الشاشة وداخل شريط إشعارات الهاتف.',
      isGranted: notificationStatus === 'granted',
      actionLabel: notificationStatus === 'granted' ? 'مفعّل بنجاح ✓' : 'منح إذن الإشعارات',
      onAction: handleGrantNotification,
      isRealNative: true,
    },
    {
      id: 'overlay',
      title: 'الظهور فوق التطبيقات الأخرى',
      desc: `ضروري لانبثاق شاشة الأذان الملكية فور دخول وقت الصلاة مهما كان التطبيق المفتوح. (${ATHAR_PACKAGE_NAME})`,
      isGranted: isOverlayGranted,
      actionLabel: isOverlayGranted ? 'مفعّل بنجاح ✓' : 'فتح إعدادات الظهور ↗',
      onAction: handleOpenOverlaySettings,
      isRealNative: true,
      onManualVerify: () => {
        NativePermissionsBridge.markPermissionVerified('overlay');
        setIsOverlayGranted(true);
      },
    },
    {
      id: 'exact_alarm',
      title: 'المنبهات الدقيقة وتوقيت الأذان',
      desc: 'إذن أساسي بنظام أندرويد 12 فأحدث لتمكين إطلاق صوت الأذان ومنبه صلاة الفجر في اللحظة الدقيقة.',
      isGranted: isExactAlarmGranted,
      actionLabel: isExactAlarmGranted ? 'مفعّل بنجاح ✓' : 'فتح إعدادات المنبه ↗',
      onAction: handleOpenExactAlarmSettings,
      isRealNative: true,
      onManualVerify: () => {
        NativePermissionsBridge.markPermissionVerified('exact_alarm');
        setIsExactAlarmGranted(true);
      },
    },
    {
      id: 'battery',
      title: 'تجاهل تحسين البطارية',
      desc: 'لمنع نظام أندرويد من كتم أو إيقاف مواقيت الأذان والورد القرآني في الخلفية لتوفير الطاقة.',
      isGranted: batteryOptimizationDismissed,
      actionLabel: batteryOptimizationDismissed ? 'مهيأ ✓' : 'تعطيل قيود البطارية ↗',
      onAction: handleOpenBatterySettings,
      isRealNative: true,
    },
    {
      id: 'lockscreen',
      title: 'العرض والتنبيه على شاشة القفل',
      desc: 'لعرض كلمات الأذان والترديد وبطاقة التنبيه الحي ومواقيت الصلاة عندما يكون الهاتف مقفلاً.',
      isGranted: lockScreenPermissionDismissed,
      actionLabel: lockScreenPermissionDismissed ? 'مهيأ ✓' : 'فتح ضبط شاشة القفل ↗',
      onAction: async () => {
        await handleOpenAppSettings();
        localStorage.setItem('athar_perm_lockscreen', 'true');
        setLockScreenPermissionDismissed(true);
      },
      isRealNative: true,
    },
    {
      id: 'popup',
      title: 'النوافذ المنبثقة بالخلفية',
      desc: 'في هواتف شاومي وهواوي وأوبو لعرض شاشات الأذان والتنبيهات المباشرة كنافذة منبثقة عائمة.',
      isGranted: popupWindowDismissed,
      actionLabel: popupWindowDismissed ? 'مهيأ ✓' : 'فتح ضبط النوافذ ↗',
      onAction: async () => {
        await handleOpenAppSettings();
        localStorage.setItem('athar_perm_popup', 'true');
        setPopupWindowDismissed(true);
      },
      isRealNative: true,
    },
    {
      id: 'autostart',
      title: 'التشغيل التلقائي والعمل في الخلفية',
      desc: 'لضمان استمرار عمل المحرك الفلكي للمواقيت ودور التنبيهات دون الحاجة لفتح التطبيق يومياً.',
      isGranted: backgroundAutostartDismissed,
      actionLabel: backgroundAutostartDismissed ? 'مهيأ ✓' : 'فتح ضبط التشغيل ↗',
      onAction: async () => {
        await handleOpenAppSettings();
        localStorage.setItem('athar_perm_autostart', 'true');
        setBackgroundAutostartDismissed(true);
      },
      isRealNative: true,
    },
    {
      id: 'homescreen',
      title: 'اختصار الشاشة الرئيسية',
      desc: 'لتثبيت تطبيق «أثر» كأيقونة مستقلة سريعة والوصول الفوري لكل أورادك وصلواتك بدون متصفح.',
      isGranted: homeShortcutInstalled,
      actionLabel: homeShortcutInstalled ? 'مثبّت ✓' : 'إضافة للشاشة الرئيسية',
      onAction: handleInstallHomeShortcut,
      isRealNative: false,
    },
    {
      id: 'audio',
      title: 'تهيئة الصوت التلقائي للأذان',
      desc: 'لإطلاق صوت الأذان وتلاوة الآيات والأذكار فوراً دون حظر أو كتم من المتصفح أو النظام.',
      isGranted: isAudioUnlocked,
      actionLabel: isAudioUnlocked ? 'مهيأ ✓' : 'تفعيل وتجربة الصوت',
      onAction: handleUnlockAudio,
      isRealNative: false,
    },
  ];

  const brandGuides = [
    {
      id: 'xiaomi',
      name: 'شاومي / ريدمي / بوكو (MIUI / HyperOS)',
      steps: [
        'افتح تطبيق «الحماية / الأمان (Security)» > «الأذونات (Permissions)».',
        'اضغط على «التشغيل التلقائي (Autostart)» وفَعّل تطبيق «أثر».',
        'في «الأذونات الأخرى»: فَعّل «الظهور على شاشة القفل» و«عرض النوافذ المنبثقة أثناء التشغيل في الخلفية».',
        'في «توفير شحن البطارية»: اختر «بلا قيود (No restrictions)».',
      ],
    },
    {
      id: 'samsung',
      name: 'سامسونج (Samsung One UI)',
      steps: [
        'افتح «الضبط (Settings)» > «التطبيقات (Apps)» > ابحث عن «أثر».',
        'اضغط على «البطارية (Battery)» > اختر «غير مقيّد (Unrestricted)».',
        'اضغط على «الظهور في الأعلى (Appear on top)» > فَعّله.',
        'في «الإشعارات»: تأكد من تفعيل «السماح بالصوت والاهتزاز» و«إشعارات شاشة القفل».',
      ],
    },
    {
      id: 'huawei',
      name: 'هواوي / هونر (Huawei EMUI / MagicOS)',
      steps: [
        'افتح «الإعدادات» > «البطارية» > «تشغيل التطبيقات (App Launch)».',
        'ابحث عن تطبيق «أثر» وحوّله من تلقائي إلى «إدارة يدوية».',
        'فَعّل خيارات: «التشغيل التلقائي» + «التشغيل الثانوي» + «الاستمرار في الخلفية».',
      ],
    },
    {
      id: 'oppo_realme',
      name: 'أوبو / ريلمي / ون بلس (ColorOS / Realme UI / OxygenOS)',
      steps: [
        'افتح «الإعدادات» > «إدارة التطبيقات» > «أثر».',
        'اضغط على «استخدام البطارية» > فَعّل «السماح بنشاط الخلفية» و«السماح ببدء التشغيل التلقائي».',
        'في «الأذونات الخاصة»: فَعّل «العرض فوق التطبيقات الأخرى».',
      ],
    },
    {
      id: 'pixel',
      name: 'جوجل بيكسل / أندرويد الخام (Google Pixel / Stock Android)',
      steps: [
        'افتح «الإعدادات» > «التطبيقات» > «أثر» > «البطارية».',
        'اختر «غير مقيّد (Unrestricted)».',
        'فَعّل «الظهور فوق التطبيقات الأخرى (Display over other apps)».',
      ],
    },
  ];

  const grantedCount = permissionsList.filter((p) => p.isGranted).length;

  return (
    <div className="space-y-3 text-right select-none font-arabic">
      {/* Header Banner: Full version in Settings, or compact status strip in Onboarding */}
      {!shouldHideHeader ? (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-[#201A10] via-[#14110A] to-[#0D0B08] border border-[#C8A24A]/55 shadow-xl space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E6C66E] to-[#B88A2D] text-[#070707] flex items-center justify-center font-extrabold shadow-md shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-[#F3E5AB]">
                  مركز أذونات وصلاحيات الهاتف الحقيقية
                </h3>
                <p className="text-[11px] text-[#C4B998]">
                  ربط مباشر عبر نظام أندرويد لفتح إعدادات النظام الحقيقية وإطلاق الأذان فوق التطبيقات
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={checkRealSystemPermissions}
                disabled={isCheckingRealStatus}
                title="إعادة فحص الصلاحيات من نظام الهاتف"
                className="p-2 rounded-xl bg-[#1A160F] border border-[#C8A24A]/40 text-[#E6C66E] hover:border-[#E6C66E] active:scale-95 transition-all"
              >
                <RefreshCw size={14} className={isCheckingRealStatus ? 'animate-spin' : ''} />
              </button>
              <span className="text-[11px] font-bold text-[#E6C66E] shrink-0">
                {grantedCount} من {permissionsList.length} مهيأة
              </span>
            </div>
          </div>

          {/* Master Action Buttons for Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleGrantAllMaster}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-2xl bg-gradient-to-r from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] hover:brightness-110 text-[#070707] font-extrabold text-xs shadow-[0_8px_25px_rgba(230,198,110,0.35)] border border-[#FFF9E2] flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <Sparkles size={16} fill="currentColor" />
              <span>بدء تهيئة الصلاحيات بنظام الهاتف</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAppSettings}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-2xl bg-[#1A160F] hover:bg-[#251F14] text-[#F3E5AB] border border-[#C8A24A]/60 font-extrabold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <SlidersHorizontal size={15} className="text-[#E6C66E]" />
              <span>فتح ضبط تطبيق أثر في إعدادات النظام ↗</span>
            </button>
          </div>
        </div>
      ) : (
        /* Compact Header Strip for Initial Setup */
        <div className="p-3 rounded-2xl bg-[#15120B]/90 border border-[#C8A24A]/30 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck size={16} className="text-[#E6C66E] shrink-0" />
            <span className="text-xs font-extrabold text-[#F3E5AB] truncate">
              أذونات نظام الهاتف لإطلاق الأذان
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-[#E6C66E]">
              {grantedCount} من {permissionsList.length} مهيأة
            </span>
            <button
              type="button"
              onClick={checkRealSystemPermissions}
              disabled={isCheckingRealStatus}
              title="تحديث حالة الأذونات"
              className="p-1.5 rounded-lg bg-[#1E190F] border border-[#C8A24A]/35 text-[#E6C66E] hover:border-[#E6C66E] active:scale-95 transition-all"
            >
              <RefreshCw size={13} className={isCheckingRealStatus ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      )}

      {/* Live Feedback Toast if an intent was just launched */}
      {statusMessage && (
        <div className="p-3 rounded-xl bg-[#241C0F] border border-[#E6C66E]/70 text-[#FFF2C2] text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-md">
          <ExternalLink size={14} className="text-[#E6C66E] shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Permissions Grid */}
      <div className="space-y-2.5">
        {permissionsList.map((perm) => (
          <div
            key={perm.id}
            className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              perm.isGranted
                ? 'bg-[#12100B]/95 border-[#C8A24A]/35'
                : 'bg-[#18130B]/95 border-[#E6C66E]/60 shadow-[0_4px_16px_rgba(200,162,74,0.12)]'
            }`}
          >
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${
                  perm.isGranted
                    ? 'bg-[#1A160F] border-[#E6C66E]/50 text-[#E6C66E]'
                    : 'bg-[#261D10] border-[#E6C66E] text-[#FFF2C2]'
                }`}
              >
                {perm.isGranted ? <CheckCircle2 size={16} /> : <AlertTriangle size={15} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-[13px] font-extrabold text-[#F3E5AB]">
                    {perm.title}
                  </h4>
                  <span
                    className={`text-[10px] font-bold ${
                      perm.isGranted ? 'text-emerald-400' : 'text-[#E6C66E]'
                    }`}
                  >
                    {perm.isGranted ? 'مفعّل ✓' : 'مطلوب للأذان'}
                  </span>
                </div>
                <p className="text-[11px] text-[#C4B998] mt-0.5 leading-relaxed">
                  {perm.desc}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-0.5 sm:pt-0">
              <button
                type="button"
                onClick={perm.onAction}
                className={`min-h-[42px] py-2 px-3.5 rounded-xl text-xs font-extrabold transition-all flex-1 sm:flex-initial active:scale-95 flex items-center justify-center gap-1.5 ${
                  perm.isGranted
                    ? 'bg-[#16130C] hover:bg-[#201B11] text-[#E6C66E] border border-[#C8A24A]/35'
                    : 'bg-gradient-to-r from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] text-[#070707] font-extrabold shadow-md hover:brightness-110'
                }`}
              >
                <span>{perm.actionLabel}</span>
                {!perm.isGranted && <ExternalLink size={12} />}
              </button>

              {!perm.isGranted && (perm as any).onManualVerify && (
                <button
                  type="button"
                  onClick={(perm as any).onManualVerify}
                  title="اضغط هنا بعد تفعيل المفتاح في إعدادات النظام لحفظ التأكيد"
                  className="min-h-[42px] py-2 px-3 rounded-xl text-xs font-bold bg-[#14110A] hover:bg-[#1E190F] text-[#C4B998] hover:text-[#FFF2C2] border border-[#C8A24A]/30 active:scale-95 transition-all shrink-0"
                >
                  تحقق ✓
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Diagnostics / Testing Tools (Hidden in Onboarding, Visible in Settings) */}
      {!shouldHideTesters && (
        <div className="space-y-2.5 pt-1">
          {/* Full-Screen Athan Real Tester */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#20180F] via-[#14110A] to-[#0A0907] border border-[#E6C66E]/70 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="text-right">
              <div className="flex items-center gap-2">
                <Volume2 size={16} className="text-[#E6C66E]" />
                <h4 className="text-xs font-extrabold text-[#FFF2C2]">
                  تجربة شاشة الأذان الكاملة فوق التطبيقات وشاشة القفل
                </h4>
              </div>
              <p className="text-[11px] text-[#C4B998] mt-0.5">
                تنبثق كالمكالمة الواردة (SHOW_WHEN_LOCKED و TURN_SCREEN_ON) عبر خدمة Foreground Service حتى وشاشتك مقفلة.
              </p>
            </div>

            <button
              type="button"
              onClick={() => NativePermissionsBridge.triggerFullScreenAthan('صلاة الفجر', '05:15')}
              className="min-h-[42px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] text-[#070707] text-xs font-extrabold transition-all active:scale-95 shrink-0 flex items-center gap-2 shadow-md hover:brightness-110 whitespace-nowrap"
            >
              <ExternalLink size={13} />
              <span>إطلاق شاشة الأذان الآن ↗</span>
            </button>
          </div>

          {/* Outside App Notification Tester */}
          <div className="p-4 rounded-2xl bg-[#14110A] border border-[#C8A24A]/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-right">
              <h4 className="text-xs font-extrabold text-[#F3E5AB]">
                تجربة الإشعار المنبثق خارج التطبيق (مع قفل الشاشة)
              </h4>
              <p className="text-[11px] text-[#C4B998] mt-0.5">
                اضغط هنا ثم اقفل شاشة هاتفك أو اخرج من المتصفح لتشاهد التنبيه المنبثق في درج إشعارات الهاتف.
              </p>
            </div>

            <button
              type="button"
              onClick={handleTestOutsideApp}
              disabled={testCountdown > 0}
              className="min-h-[42px] py-2.5 px-4 rounded-xl bg-[#1E190F] hover:bg-[#2B2314] text-[#E6C66E] border border-[#E6C66E]/55 text-xs font-extrabold transition-all active:scale-95 shrink-0 flex items-center gap-2 disabled:opacity-50"
            >
              <Play size={12} fill="currentColor" />
              <span>
                {testCountdown > 0 ? `سيصل بعد ${testCountdown}ث (اقفل الشاشة الآن)` : 'إرسال إشعار تجريبي (بعد ٥ ثوانٍ)'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Manufacturer Guides Accordion (Visible in Settings only) */}
      {!compact && (
        <div className="p-4 rounded-3xl bg-[#0F0D09] border border-[#C8A24A]/30 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Smartphone size={16} className="text-[#E6C66E]" />
              <h4 className="text-xs font-extrabold text-[#F3E5AB]">
                إرشادات تثبيت الأذونات حسب نوع هاتفك (خطوة بخطوة):
              </h4>
            </div>

            <button
              type="button"
              onClick={handleOpenAppSettings}
              className="text-[11px] font-extrabold text-[#E6C66E] hover:underline flex items-center gap-1"
            >
              <span>فتح ضبط التطبيق</span>
              <ExternalLink size={11} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {brandGuides.map((guide) => {
              const isOpen = activeBrandGuide === guide.id;
              return (
                <div
                  key={guide.id}
                  className="rounded-2xl border border-[#C8A24A]/30 bg-[#14110A] overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setActiveBrandGuide(isOpen ? null : guide.id)}
                    className="w-full p-3 flex items-center justify-between text-right text-xs font-extrabold text-[#F3E5AB] hover:text-[#FFF2C2] hover:bg-[#1A160F] transition-colors"
                  >
                    <span>{guide.name}</span>
                    <ChevronDown
                      size={14}
                      className={`text-[#E6C66E] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isOpen && (
                    <div className="p-3.5 pt-0 space-y-2 text-[11px] text-[#C4B998] border-t border-[#C8A24A]/20 bg-[#0B0906]">
                      <div className="space-y-1.5 pt-2">
                        {guide.steps.map((st, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 leading-relaxed">
                            <span className="text-[#E6C66E] font-bold">←</span>
                            <span>{st}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleOpenAppSettings}
                        className="w-full mt-2 min-h-[40px] py-2 px-3 rounded-xl bg-[#1A160F] hover:bg-[#251F14] text-[#E6C66E] border border-[#C8A24A]/40 text-[10px] font-extrabold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                      >
                        <ExternalLink size={11} />
                        <span>فتح صفحة التطبيق في إعدادات الهاتف لهواتف {guide.name.split(' ')[0]}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Overlay Permission Explanation Modal Rendered via Portal to avoid stacking context clipping */}
      {showOverlayExplanationModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn select-none font-arabic"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowOverlayExplanationModal(false);
              }
            }}
          >
            <div
              className="bg-gradient-to-b from-[#18140D] via-[#120F0A] to-[#0A0805] border border-[#E6C66E]/50 rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_30px_rgba(200,162,74,0.18)] space-y-4 text-right"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#2D2312] to-[#16120A] border border-[#E6C66E]/50 flex items-center justify-center text-[#E6C66E] shadow-md shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-[#FFF2C2]">
                    إذن الظهور فوق التطبيقات
                  </h4>
                  <p className="text-[11px] text-[#A69977] font-mono">
                    System Alert Window
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-[13px] text-[#D8CCA8] leading-relaxed">
                ضروري لانبثاق شاشة الأذان الملكية فور دخول وقت الصلاة حتى وشاشتك مقفلة أو أثناء استخدام تطبيقات أخرى.
              </p>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmOpenOverlaySettings}
                  className="flex-1 min-h-[44px] py-3 px-4 rounded-xl bg-gradient-to-r from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] text-[#070707] font-extrabold text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all text-center cursor-pointer"
                >
                  فتح الإعدادات ↗
                </button>
                <button
                  type="button"
                  onClick={() => setShowOverlayExplanationModal(false)}
                  className="min-h-[44px] py-3 px-4 rounded-xl bg-[#1A160F] border border-[#C8A24A]/40 text-[#C4B998] hover:text-[#FFF2C2] font-bold text-xs hover:bg-[#251F14] active:scale-95 transition-all cursor-pointer"
                >
                  لاحقاً
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
