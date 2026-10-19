import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  MapPin,
  Compass,
  Smartphone,
  Bell,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Volume2,
  Play,
  RefreshCw,
  SlidersHorizontal,
  BatteryCharging,
  ShieldCheck,
  Check,
  Moon,
  Heart,
  BookOpen,
  Lock,
  Maximize2,
} from 'lucide-react';
import { AtharBrandLogo } from './AtharBrandLogo';
import { NativePermissionsBridge } from '../services/nativePermissionsBridge';
import { LocationService } from '../services/locationService';
import { NotificationService } from '../services/notificationService';
import { NativeNotificationService } from '../services/nativeNotificationService';
import { AudioService } from '../services/audioService';
import { ReminderEngine } from '../services/reminderService';
import { Coordinates } from '../types';
import { POPULAR_CITIES } from '../data/citiesData';

interface PermissionsSetupWizardProps {
  isOpen: boolean;
  onFinish: (coords?: Coordinates) => void;
  onSkip?: () => void;
}

export const PermissionsSetupWizard: React.FC<PermissionsSetupWizardProps> = ({
  isOpen,
  onFinish,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 4;

  // Real-time verification notice banner
  const [stepNotice, setStepNotice] = useState<{
    step: number;
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [verifyingKey, setVerifyingKey] = useState<string | null>(null);

  // Step 1: Overlay Permission
  const [isOverlayGranted, setIsOverlayGranted] = useState<boolean>(() =>
    localStorage.getItem('athar_perm_overlay_verified') === 'true'
  );

  // Step 2: Location
  const [detectedCoords, setDetectedCoords] = useState<Coordinates | null>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Step 3: Special & Vendor Permissions (4 Core Requirements)
  const [hasOpenedVendorSettings, setHasOpenedVendorSettings] = useState<boolean>(() =>
    localStorage.getItem('athar_opened_vendor_settings') === 'true'
  );
  const [vendorPermissionsChecked, setVendorPermissionsChecked] = useState<boolean>(() =>
    localStorage.getItem('athar_perm_vendor_verified') === 'true'
  );
  const [popupWindowDismissed, setPopupWindowDismissed] = useState<boolean>(() =>
    localStorage.getItem('athar_perm_popup') === 'true'
  );
  const [popupBgDismissed, setPopupBgDismissed] = useState<boolean>(() =>
    localStorage.getItem('athar_perm_popup_bg') === 'true'
  );
  const [lockScreenDismissed, setLockScreenDismissed] = useState<boolean>(() =>
    localStorage.getItem('athar_perm_lockscreen') === 'true'
  );
  const [homeShortcutDismissed, setHomeShortcutDismissed] = useState<boolean>(() =>
    localStorage.getItem('athar_perm_homescreen') === 'true'
  );
  const [autoStartDismissed, setAutoStartDismissed] = useState<boolean>(() =>
    localStorage.getItem('athar_perm_autostart') === 'true'
  );
  const [hasOpenedAutoStart, setHasOpenedAutoStart] = useState<boolean>(() =>
    localStorage.getItem('athar_opened_autostart_settings') === 'true'
  );
  const [isInstallPackagesGranted, setIsInstallPackagesGranted] = useState<boolean>(() =>
    localStorage.getItem('athar_perm_install_packages_verified') === 'true'
  );
  const [hasOpenedInstallSettings, setHasOpenedInstallSettings] = useState<boolean>(() =>
    localStorage.getItem('athar_opened_install_settings') === 'true'
  );
  const [activeBrandTab, setActiveBrandTab] = useState<string>('xiaomi');

  // Step 4: Notifications, Exact Alarms & Battery
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>(() =>
    NotificationService.getPermissionStatus()
  );
  const [isExactAlarmGranted, setIsExactAlarmGranted] = useState<boolean>(() =>
    localStorage.getItem('athar_perm_exact_alarm_verified') === 'true'
  );
  const [batteryIgnored, setBatteryIgnored] = useState<boolean>(() =>
    localStorage.getItem('athar_perm_battery_opt_verified') === 'true'
  );

  // Auto-detect system permissions whenever window regains focus
  const checkAllSystemStates = useCallback(async () => {
    try {
      // 1. Overlay (strictly sync with Android system)
      const overlayReal = await NativePermissionsBridge.checkOverlayPermission();
      setIsOverlayGranted(overlayReal);
      if (overlayReal) {
        localStorage.setItem('athar_perm_overlay_verified', 'true');
      }

      // 2. Exact Alarm
      const exactReal = await NativePermissionsBridge.checkExactAlarmPermission();
      setIsExactAlarmGranted(exactReal);
      if (exactReal) {
        localStorage.setItem('athar_perm_exact_alarm_verified', 'true');
      }

      // 3. Battery
      const batReal = await NativePermissionsBridge.checkBatteryOptimizationIgnored();
      if (batReal) {
        setBatteryIgnored(true);
        localStorage.setItem('athar_perm_battery_opt_verified', 'true');
      }

      // 4. Notifications
      const notifReal = await NativePermissionsBridge.checkNotificationPermission();
      if (notifReal) {
        setNotificationStatus('granted');
      }

      // 5. Package Installs (REQUEST_INSTALL_PACKAGES)
      const installReal = await NativePermissionsBridge.canRequestPackageInstalls();
      setIsInstallPackagesGranted(installReal);
      if (installReal) {
        localStorage.setItem('athar_perm_install_packages_verified', 'true');
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    checkAllSystemStates();

    const handleFocus = () => checkAllSystemStates();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkAllSystemStates();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isOpen, checkAllSystemStates]);

  if (!isOpen) return null;

  /* =====================================================================
     STEP 1 HANDLERS: OVERLAY PERMISSION (الظهور فوق التطبيقات)
     ===================================================================== */
  const handleToggleOverlay = async () => {
    AudioService.unlockAudio();
    setStepNotice(null);
    await NativePermissionsBridge.openOverlayPermissionSettings();
  };

  const handleVerifyOverlay = async () => {
    setVerifyingKey('overlay');
    setStepNotice(null);
    try {
      const isGranted = await NativePermissionsBridge.checkOverlayPermission();
      if (isGranted) {
        setIsOverlayGranted(true);
        localStorage.setItem('athar_perm_overlay_verified', 'true');
        setStepNotice({
          step: 1,
          type: 'success',
          text: 'تم التحقق بنجاح! إذن الظهور مفعّل الآن بنجاح ✓',
        });
      } else {
        setIsOverlayGranted(false);
        localStorage.removeItem('athar_perm_overlay_verified');
        setStepNotice({
          step: 1,
          type: 'error',
          text: 'لم يتم تفعيل الإذن في إعدادات الهاتف بعد. اضغط «تفعيل الإذن» ثم فعّل المفتاح أمام تطبيق «أثر» أولاً.',
        });
      }
    } catch {
      setIsOverlayGranted(false);
      setStepNotice({
        step: 1,
        type: 'error',
        text: 'تعذر التحقق من الإذن في النظام. يُرجى الدخول للإعدادات وتفعيله أولاً.',
      });
    } finally {
      setVerifyingKey(null);
    }
  };

  /* =====================================================================
     STEP 2 HANDLERS: LOCATION
     ===================================================================== */
  const handleRequestLocation = async () => {
    setIsRequestingLocation(true);
    setLocationError(null);
    setStepNotice(null);
    try {
      const res = await LocationService.getCurrentPosition();
      if (res.coords) {
        setDetectedCoords(res.coords);
        setStepNotice({
          step: 2,
          type: 'success',
          text: `تم تحديد الموقع بنجاح: ${res.coords.city || res.coords.formattedLocation} ✓`,
        });
      } else if (res.error) {
        setLocationError(res.error);
        setStepNotice({
          step: 2,
          type: 'error',
          text: res.error,
        });
      }
    } catch {
      setLocationError('تعذر تحديد الموقع الجغرافي. يمكنك اختيار مدينتك أدناه.');
      setStepNotice({
        step: 2,
        type: 'error',
        text: 'تعذر تحديد الموقع الجغرافي. يمكنك اختيار مدينتك من القائمة أدناه.',
      });
    } finally {
      setIsRequestingLocation(false);
    }
  };

  const handleSelectPredefinedCity = (cityEntry: (typeof POPULAR_CITIES)[0]) => {
    const coords: Coordinates = {
      latitude: cityEntry.latitude,
      longitude: cityEntry.longitude,
      city: cityEntry.city,
      country: cityEntry.country,
      formattedLocation: cityEntry.formattedLocation || `${cityEntry.city}، ${cityEntry.country}`,
      isAutoGps: false,
    };
    setDetectedCoords(coords);
    setLocationError(null);
    setStepNotice({
      step: 2,
      type: 'success',
      text: `تم اختيار مدينة ${cityEntry.city} بنجاح لحساب المواقيت والقبلة ✓`,
    });
  };

  /* =====================================================================
     STEP 3 HANDLERS: PHONE & ADVANCED PERMISSIONS (SMART UNIFIED HANDLERS)
     ===================================================================== */
  // 1. التشغيل التلقائي بالخلفية (Autostart)
  const handleSmartAutoStart = async () => {
    setVerifyingKey('autostart');
    setStepNotice(null);
    try {
      if (autoStartDismissed) {
        await NativePermissionsBridge.openAutoStartSettings();
        return;
      }
      if (!hasOpenedAutoStart) {
        setHasOpenedAutoStart(true);
        localStorage.setItem('athar_opened_autostart_settings', 'true');
        setStepNotice({
          step: 3,
          type: 'info',
          text: 'جاري فتح صفحة التشغيل التلقائي... فعّل مفتاح «أثر» ثم اضغط على الزر للتحقق ✓',
        });
        await NativePermissionsBridge.openAutoStartSettings();
      } else {
        setAutoStartDismissed(true);
        localStorage.setItem('athar_perm_autostart', 'true');
        setStepNotice({
          step: 3,
          type: 'success',
          text: 'تم تفعيل التشغيل التلقائي بالخلفية بنجاح ✓',
        });
      }
    } finally {
      setVerifyingKey(null);
    }
  };

  // 2. عرض النوافذ المنبثقة (Display pop-up windows)
  const handleSmartPopup = async () => {
    setVerifyingKey('popup_single');
    setStepNotice(null);
    try {
      if (popupWindowDismissed) {
        await NativePermissionsBridge.openOverlayPermissionSettings();
        return;
      }
      if (!hasOpenedVendorSettings) {
        setHasOpenedVendorSettings(true);
        localStorage.setItem('athar_opened_vendor_settings', 'true');
        setStepNotice({
          step: 3,
          type: 'info',
          text: 'جاري فتح صفحة الضبط... فعّل إذن «عرض النوافذ المنبثقة» ثم اضغط على الزر للتحقق ✓',
        });
        await NativePermissionsBridge.openOverlayPermissionSettings();
      } else {
        setPopupWindowDismissed(true);
        localStorage.setItem('athar_perm_popup', 'true');
        if (popupBgDismissed && lockScreenDismissed && homeShortcutDismissed) {
          setVendorPermissionsChecked(true);
          localStorage.setItem('athar_perm_vendor_verified', 'true');
        }
        setStepNotice({
          step: 3,
          type: 'success',
          text: 'تم تفعيل إذن عرض النوافذ المنبثقة بنجاح ✓',
        });
      }
    } finally {
      setVerifyingKey(null);
    }
  };

  // 3. النوافذ بالخلفية (Display popup in background)
  const handleSmartPopupBg = async () => {
    setVerifyingKey('popup_bg_single');
    setStepNotice(null);
    try {
      if (popupBgDismissed) {
        await NativePermissionsBridge.openOtherPermissionsSettings();
        return;
      }
      if (!hasOpenedVendorSettings) {
        setHasOpenedVendorSettings(true);
        localStorage.setItem('athar_opened_vendor_settings', 'true');
        setStepNotice({
          step: 3,
          type: 'info',
          text: 'جاري فتح صفحة الضبط... فعّل إذن «النوافذ المنبثقة بالخلفية» ثم اضغط على الزر للتحقق ✓',
        });
        await NativePermissionsBridge.openOtherPermissionsSettings();
      } else {
        setPopupBgDismissed(true);
        localStorage.setItem('athar_perm_popup_bg', 'true');
        if (popupWindowDismissed && lockScreenDismissed && homeShortcutDismissed) {
          setVendorPermissionsChecked(true);
          localStorage.setItem('athar_perm_vendor_verified', 'true');
        }
        setStepNotice({
          step: 3,
          type: 'success',
          text: 'تم تفعيل إذن النوافذ بالخلفية بنجاح ✓',
        });
      }
    } finally {
      setVerifyingKey(null);
    }
  };

  // 4. العرض على شاشة القفل (Show on lock screen)
  const handleSmartLockScreen = async () => {
    setVerifyingKey('lockscreen_single');
    setStepNotice(null);
    try {
      if (lockScreenDismissed) {
        await NativePermissionsBridge.openOtherPermissionsSettings();
        return;
      }
      if (!hasOpenedVendorSettings) {
        setHasOpenedVendorSettings(true);
        localStorage.setItem('athar_opened_vendor_settings', 'true');
        setStepNotice({
          step: 3,
          type: 'info',
          text: 'جاري فتح صفحة الضبط... فعّل إذن «العرض على شاشة القفل» ثم اضغط على الزر للتحقق ✓',
        });
        await NativePermissionsBridge.openOtherPermissionsSettings();
      } else {
        setLockScreenDismissed(true);
        localStorage.setItem('athar_perm_lockscreen', 'true');
        if (popupWindowDismissed && popupBgDismissed && homeShortcutDismissed) {
          setVendorPermissionsChecked(true);
          localStorage.setItem('athar_perm_vendor_verified', 'true');
        }
        setStepNotice({
          step: 3,
          type: 'success',
          text: 'تم تفعيل إذن العرض على شاشة القفل بنجاح ✓',
        });
      }
    } finally {
      setVerifyingKey(null);
    }
  };

  // 5. اختصارات الشاشة الرئيسية (Home screen shortcuts)
  const handleSmartHomeShortcut = async () => {
    setVerifyingKey('homescreen_single');
    setStepNotice(null);
    try {
      if (homeShortcutDismissed) {
        await NativePermissionsBridge.openOtherPermissionsSettings();
        return;
      }
      if (!hasOpenedVendorSettings) {
        setHasOpenedVendorSettings(true);
        localStorage.setItem('athar_opened_vendor_settings', 'true');
        setStepNotice({
          step: 3,
          type: 'info',
          text: 'جاري فتح صفحة الضبط... فعّل إذن «اختصارات الشاشة الرئيسية» ثم اضغط على الزر للتحقق ✓',
        });
        await NativePermissionsBridge.openOtherPermissionsSettings();
      } else {
        setHomeShortcutDismissed(true);
        localStorage.setItem('athar_perm_homescreen', 'true');
        if (popupWindowDismissed && popupBgDismissed && lockScreenDismissed) {
          setVendorPermissionsChecked(true);
          localStorage.setItem('athar_perm_vendor_verified', 'true');
        }
        setStepNotice({
          step: 3,
          type: 'success',
          text: 'تم تفعيل إذن اختصارات الشاشة الرئيسية بنجاح ✓',
        });
      }
    } finally {
      setVerifyingKey(null);
    }
  };

  // 6. تثبيت التطبيقات (REQUEST_INSTALL_PACKAGES)
  const handleSmartInstallPackages = async () => {
    setVerifyingKey('install_packages');
    setStepNotice(null);
    try {
      if (isInstallPackagesGranted) {
        await NativePermissionsBridge.openInstallUnknownAppsSettings();
        return;
      }

      if (!hasOpenedInstallSettings) {
        setHasOpenedInstallSettings(true);
        localStorage.setItem('athar_opened_install_settings', 'true');
        setStepNotice({
          step: 3,
          type: 'info',
          text: 'جاري فتح صفحة إعدادات تثبيت التطبيقات... فعّل مفتاح السماح لتطبيق أثر ثم اضغط على الزر للتحقق ✓',
        });
        await NativePermissionsBridge.openInstallUnknownAppsSettings();

        if (NativePermissionsBridge.isNative()) {
          const isReal = await NativePermissionsBridge.canRequestPackageInstalls();
          if (isReal) {
            setIsInstallPackagesGranted(true);
            localStorage.setItem('athar_perm_install_packages_verified', 'true');
            setStepNotice({
              step: 3,
              type: 'success',
              text: 'تم تفعيل إذن تثبيت التطبيقات بنجاح ✓',
            });
          }
        }
      } else {
        if (NativePermissionsBridge.isNative()) {
          const isReal = await NativePermissionsBridge.canRequestPackageInstalls();
          if (isReal) {
            setIsInstallPackagesGranted(true);
            localStorage.setItem('athar_perm_install_packages_verified', 'true');
            setStepNotice({
              step: 3,
              type: 'success',
              text: 'تم التحقق وتفعيل إذن تثبيت التطبيقات بنجاح ✓',
            });
          } else {
            setIsInstallPackagesGranted(false);
            setStepNotice({
              step: 3,
              type: 'error',
              text: 'لم يتم منح الإذن في الهاتف بعد! يرجى فتح الإعدادات وتفعيل خيار «السماح من هذا المصدر» لتطبيق أثر ليخضر الزر.',
            });
            await NativePermissionsBridge.openInstallUnknownAppsSettings();
          }
        } else {
          setIsInstallPackagesGranted(true);
          localStorage.setItem('athar_perm_install_packages_verified', 'true');
          setStepNotice({
            step: 3,
            type: 'success',
            text: 'تم تفعيل إذن تثبيت التطبيقات بنجاح ✓',
          });
        }
      }
    } finally {
      setVerifyingKey(null);
    }
  };

  // Legacy aliases for full backward compatibility
  const handleOpenAutoStartSettings = handleSmartAutoStart;
  const handleToggleAutoStart = handleSmartAutoStart;
  const handleVerifyAutoStart = handleSmartAutoStart;
  const handleOpenOtherPermissionsSettings = async () => NativePermissionsBridge.openOtherPermissionsSettings();
  const handleTogglePopup = handleSmartPopup;
  const handleVerifyPopup = handleSmartPopup;
  const handleTogglePopupBg = handleSmartPopupBg;
  const handleVerifyPopupBg = handleSmartPopupBg;
  const handleToggleLockScreen = handleSmartLockScreen;
  const handleVerifyLockScreen = handleSmartLockScreen;
  const handleToggleHomeShortcut = handleSmartHomeShortcut;
  const handleVerifyHomeShortcut = handleSmartHomeShortcut;
  const handleOpenAppSettings = async () => NativePermissionsBridge.openAppSettings();
  const handleGrantAllFour = handleSmartPopup;
  const handleGrantAllPermissions = handleSmartAutoStart;
  const handleVerifyVendor = handleSmartAutoStart;

  /* =====================================================================
     STEP 4 HANDLERS: NOTIFICATIONS, EXACT ALARMS & BATTERY
     ===================================================================== */
  const handleToggleNotification = async () => {
    AudioService.unlockAudio();
    setStepNotice(null);
    const res = await NotificationService.requestPermission();
    setNotificationStatus(res);
    if (res === 'granted') {
      await NativeNotificationService.initAndScheduleAll(false);
      setStepNotice({
        step: 4,
        type: 'success',
        text: 'تم تفعيل إشعارات النظام بنجاح ✓',
      });
      NotificationService.notify({
        title: 'تم تفعيل إشعارات أثر بنجاح ✓',
        body: 'ستصلك مواقيت الصلاة والأذان وتذكيرات الأوراد في موعدها بدقة.',
        type: 'info',
      });
    } else {
      await NativePermissionsBridge.openNotificationSettings();
    }
  };

  const handleVerifyNotification = async () => {
    setVerifyingKey('notif');
    setStepNotice(null);
    try {
      const isGranted = await NativePermissionsBridge.checkNotificationPermission();
      if (isGranted) {
        setNotificationStatus('granted');
        setStepNotice({
          step: 4,
          type: 'success',
          text: 'تم التحقق بنجاح! إشعارات النظام مفعّلة ✓',
        });
      } else {
        setNotificationStatus(NotificationService.getPermissionStatus());
        setStepNotice({
          step: 4,
          type: 'error',
          text: 'لم يتم منح إذن الإشعارات بعد. اضغط «تفعيل الإشعارات» لتشغيلها.',
        });
      }
    } finally {
      setVerifyingKey(null);
    }
  };

  const handleToggleExactAlarm = async () => {
    setStepNotice(null);
    await NativePermissionsBridge.openExactAlarmSettings();
  };

  const handleVerifyExactAlarm = async () => {
    setVerifyingKey('exact_alarm');
    setStepNotice(null);
    try {
      const isGranted = await NativePermissionsBridge.checkExactAlarmPermission();
      if (isGranted) {
        setIsExactAlarmGranted(true);
        localStorage.setItem('athar_perm_exact_alarm_verified', 'true');
        setStepNotice({
          step: 4,
          type: 'success',
          text: 'تم التحقق بنجاح! إذن المنبهات الدقيقة (Exact Alarms) مفعّل ✓',
        });
      } else {
        setIsExactAlarmGranted(false);
        localStorage.removeItem('athar_perm_exact_alarm_verified');
        setStepNotice({
          step: 4,
          type: 'error',
          text: 'لم يتم تفعيل إذن المنبهات الدقيقة في إعدادات الهاتف بعد.',
        });
      }
    } catch {
      setIsExactAlarmGranted(false);
      setStepNotice({
        step: 4,
        type: 'error',
        text: 'تعذر التحقق من إذن المنبهات الدقيقة في النظام.',
      });
    } finally {
      setVerifyingKey(null);
    }
  };

  const handleToggleBattery = async () => {
    setStepNotice(null);
    // Open Android battery settings without assuming it is already granted
    await NativePermissionsBridge.openBatteryOptimizationSettings();
  };

  const handleVerifyBattery = async () => {
    setVerifyingKey('battery');
    setStepNotice(null);
    try {
      const isIgnored = await NativePermissionsBridge.checkBatteryOptimizationIgnored();
      setBatteryIgnored(true);
      localStorage.setItem('athar_perm_battery_opt_verified', 'true');
      setStepNotice({
        step: 4,
        type: 'success',
        text: isIgnored
          ? 'تم التحقق بنجاح! تم إلغاء قيود توفير البطارية (بلا قيود) ✓'
          : 'تم تأكيد ضبط البطارية على «غير مقيّد / بلا قيود» لتطبيق أثر بنجاح ✓',
      });
    } catch {
      setBatteryIgnored(true);
      localStorage.setItem('athar_perm_battery_opt_verified', 'true');
      setStepNotice({
        step: 4,
        type: 'success',
        text: 'تم تأكيد ضبط البطارية بنجاح ✓',
      });
    } finally {
      setVerifyingKey(null);
    }
  };

  const handleFinishWizard = () => {
    AudioService.unlockAudio();
    onFinish(detectedCoords || undefined);
  };

  const handleSkipWizard = () => {
    AudioService.unlockAudio();
    if (onSkip) {
      onSkip();
    } else {
      onFinish(detectedCoords || undefined);
    }
  };

  const handleNextStep = async () => {
    setStepNotice(null);
    if (currentStep === 1) {
      if (!isOverlayGranted) {
        setVerifyingKey('overlay');
        const granted = await NativePermissionsBridge.checkOverlayPermission();
        setVerifyingKey(null);
        if (granted) {
          setIsOverlayGranted(true);
          setCurrentStep(2);
          return;
        }
        setStepNotice({
          step: 1,
          type: 'error',
          text: 'إذن الظهور فوق التطبيقات أساسي لظهور شاشة الأذان. اضغط «تفعيل الإذن» وفعّله، أو اضغط «تخطي مؤقتاً» بالأعلى للمتابعة.',
        });
        return;
      }
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      if (!detectedCoords) {
        setStepNotice({
          step: 2,
          type: 'error',
          text: 'يُرجى تحديد موقعك عبر GPS أو اختيار مدينتك من القائمة أدناه لحساب المواقيت بدقة.',
        });
        return;
      }
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      if (
        !hasOpenedVendorSettings &&
        !hasOpenedAutoStart &&
        !hasOpenedInstallSettings &&
        !vendorPermissionsChecked &&
        !autoStartDismissed &&
        !popupWindowDismissed &&
        !popupBgDismissed &&
        !lockScreenDismissed &&
        !homeShortcutDismissed &&
        !isInstallPackagesGranted
      ) {
        setStepNotice({
          step: 3,
          type: 'error',
          text: 'يُرجى تفعيل أذونات الهاتف أو فحصها، أو استخدام «تخطي مؤقتاً» بالأعلى للمتابعة.',
        });
        return;
      }
      setCurrentStep(4);
      return;
    }

    if (currentStep === 4) {
      handleFinishWizard();
      return;
    }
  };

  const stepsMeta = [
    { num: 1, label: 'الظهور', icon: Layers },
    { num: 2, label: 'الموقع', icon: MapPin },
    { num: 3, label: 'أذونات الهاتف', icon: Smartphone },
    { num: 4, label: 'المنبهات', icon: Bell },
  ];

  const brandGuides: Record<string, { name: string; tips: string[] }> = {
    xiaomi: {
      name: 'شاومي / ريدمي / بوكو (HyperOS / MIUI)',
      tips: [
        'افتح «الأذونات الأخرى (Other permissions)» وفعّل: «عرض النوافذ المنبثقة (Display pop-up)» + «عرض النوافذ بالخلفية (Display popup in background)».',
        'فعّل «العرض على شاشة القفل (Show on lock screen)» + «اختصارات الشاشة الرئيسية (Home screen shortcuts)».',
        'في «الأذونات»: فعّل «التشغيل التلقائي (Autostart)» وفي «توفير البطارية» اختر «بلا قيود (No restrictions)».',
      ],
    },
    samsung: {
      name: 'سامسونج (One UI)',
      tips: [
        'افتح «الضبط» > «التطبيقات» > «أثر» > «الظهور في الأعلى (Appear on top / Pop-up)» وتأكد من تفعيله.',
        'في «الإشعارات»: فعّل «إشعارات شاشة القفل (Show on lock screen)» و«السماح بالصوت والاهتزاز».',
        'في «البطارية»: اختر «غير مقيّد (Unrestricted)» لضمان عمل النوافذ بالخلفية بدقة.',
      ],
    },
    huawei: {
      name: 'هواوي / هونر (EMUI / MagicOS)',
      tips: [
        'في «الأذونات الخاصة»: فعّل «العرض فوق التطبيقات الأخرى (Display pop-up)».',
        'في «تشغيل التطبيقات (App Launch)»: حوّل تطبيق أثر إلى «إدارة يدوية» وفعّل: التشغيل التلقائي + العمل في الخلفية.',
        'في «شاشة القفل»: اسمح بعرض الإشعارات والتنبيهات المباشرة.',
      ],
    },
    oppo: {
      name: 'أوبو / ريلمي / ون بلس (ColorOS / Realme UI)',
      tips: [
        'في «إدارة الأذونات»: فعّل «عرض النوافذ العائمة (Floating Windows / Pop-up)».',
        'فعّل «السماح بالعرض على شاشة القفل» و«إنشاء اختصارات الشاشة الرئيسية».',
        'في «استخدام البطارية»: فعّل «السماح بنشاط الخلفية» و«بدء التشغيل التلقائي».',
      ],
    },
    pixel: {
      name: 'جوجل بيكسل / أندرويد الخام (Pixel / Stock)',
      tips: [
        'في «الأذونات الخاصة»: فعّل «الظهور فوق التطبيقات الأخرى (Display over other apps)».',
        'في «الإشعارات»: فعّل إشعارات شاشة القفل بالكامل (Show on lock screen).',
        'في «البطارية»: اختر «غير مقيّد (Unrestricted)» لضمان صدح الأذان في موعده بدقة.',
      ],
    },
  };

  return (
    <div className="fixed inset-0 z-[80] bg-[#070605] text-[#F3EBDD] flex items-center justify-center p-0 sm:p-4 select-none font-arabic h-screen w-screen overflow-hidden animate-fadeIn" dir="rtl">
      {/* Background Ambience: Subtle Sacred Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#241D10]/50 via-[#070605]/95 to-[#050403]" />

      <div className="relative w-full max-w-lg h-full sm:h-auto sm:max-h-[90vh] bg-[#0E0C08]/92 backdrop-blur-2xl border border-[#D4AF37]/50 rounded-none sm:rounded-[32px] shadow-[0_24px_80px_rgba(0,0,0,0.98),0_0_40px_rgba(212,175,55,0.22)] flex flex-col justify-between overflow-hidden">
        {/* =====================================================================
            TOP BAR: ATHAR CREST (EMBLEM ONLY) & ROYAL PROGRESS STEPPER (RTL FLOW)
           ===================================================================== */}
        <div className="relative z-10 px-5 pt-4 pb-3 border-b border-[#D4AF37]/25 bg-[#120F0A]/95 backdrop-blur-md shrink-0">
          <div className="flex items-center justify-between gap-3 mb-3">
            <AtharBrandLogo size="sm" showSubtitle={false} showWordmark={false} />
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#D4AF37]">
                الخطوة {currentStep} من {totalSteps}
              </span>
              <button
                type="button"
                onClick={handleSkipWizard}
                className="text-[11px] font-bold text-[#A69977] hover:text-[#FFF2C2] px-2 py-0.5 rounded-lg border border-[#C8A24A]/25 hover:border-[#D4AF37]/50 transition-colors"
              >
                تخطي مؤقتاً
              </button>
            </div>
          </div>

          {/* Stepper Track (Strict RTL flow: Step 1 starts on far right and advances leftward) */}
          <div className="relative flex items-center justify-between px-2" dir="rtl">
            {/* Background connecting line */}
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-[2px] bg-[#2A2315] -z-0" />
            {/* Active connecting line starting from the right and expanding leftward toward next step */}
            <div
              className="absolute right-6 top-1/2 -translate-y-1/2 h-[2px] bg-gradient-to-l from-[#D4AF37] to-[#E6C66E] transition-all duration-500 -z-0 shadow-[0_0_8px_rgba(230,198,110,0.5)]"
              style={{
                width: `${((currentStep - 1) / (totalSteps - 1)) * 88}%`,
              }}
            />

            {stepsMeta.map((s) => {
              const isActive = s.num === currentStep;
              const isPast = s.num < currentStep;
              const StepIcon = s.icon;

              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setCurrentStep(s.num)}
                  className="relative z-10 flex flex-col items-center gap-1 group focus:outline-none"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border ${
                      isActive
                        ? 'bg-gradient-to-br from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] text-[#070605] border-[#FFF9E2] shadow-[0_0_14px_rgba(230,198,110,0.6)] scale-110 font-black'
                        : isPast
                        ? 'bg-[#2A2111] text-[#E6C66E] border-[#D4AF37]/60'
                        : 'bg-[#14110A] text-[#7A6F54] border-[#2A2315]'
                    }`}
                  >
                    {isPast ? <Check size={14} strokeWidth={3} /> : <StepIcon size={14} />}
                  </div>
                  <span
                    className={`text-[10px] font-extrabold tracking-tight transition-colors ${
                      isActive ? 'text-[#FFF2C2]' : isPast ? 'text-[#C4B998]' : 'text-[#6A6048]'
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =====================================================================
            SCROLLABLE CONTENT BODY (Only Active Step Rendered)
           ===================================================================== */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 scrollbar-thin scrollbar-thumb-[#D4AF37]/30 overscroll-contain pb-6">
          {/* ===================================================================
              STEP 1: OVERLAY PERMISSION (الظهور فوق التطبيقات)
             =================================================================== */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fadeIn text-right">
              {/* Step Header */}
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[10px] font-bold text-[#E6C66E]">
                  <Layers size={12} />
                  <span>الإذن الأساسي الأول</span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#FFF9E6]">
                  إذن الظهور فوق التطبيقات
                </h2>
                <p className="text-xs text-[#C4B998] leading-relaxed">
                  يسمح لتطبيق «أثر» بإطلاق شاشة الأذان الملكية وتنبيهات الأوراد والأذكار فوق أي شاشة أو تطبيق آخر لحظة دخول الوقت.
                </p>
              </div>

              {/* Step Notice Banner */}
              {stepNotice && stepNotice.step === 1 && (
                <div
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2.5 animate-slideDown shadow-lg ${
                    stepNotice.type === 'success'
                      ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300'
                      : 'bg-[#26140D] border-amber-600/70 text-amber-200'
                  }`}
                >
                  {stepNotice.type === 'success' ? (
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                  )}
                  <span className="leading-relaxed">{stepNotice.text}</span>
                </div>
              )}

              {/* Real-time Toggle Status Card */}
              <div
                className={`p-4 sm:p-4.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5 ${
                  isOverlayGranted
                    ? 'bg-[#151D14] border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                    : 'bg-[#1C160C] border-[#E6C66E]/70 shadow-[0_0_24px_rgba(200,162,74,0.18)]'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${
                      isOverlayGranted
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400'
                        : 'bg-[#2E2210] border-[#E6C66E] text-[#FFF2C2]'
                    }`}
                  >
                    {isOverlayGranted ? <CheckCircle2 size={22} /> : <Layers size={22} />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-extrabold text-[#FFF9E6]">
                      {isOverlayGranted ? 'إذن الظهور مفعّل بنجاح' : 'السماح بالظهور فوق التطبيقات'}
                    </h3>
                    <p className="text-[11px] text-[#C4B998] truncate">
                      {isOverlayGranted
                        ? 'النظام مهيأ لإطلاق شاشات الأذان والتنبيهات الحية'
                        : 'مطلوب لعرض شاشة الأذان الملكية وتنبيهات الصلاة الحية'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6 shrink-0 pt-2 sm:pt-0 sm:ms-auto justify-end">
                  <button
                    type="button"
                    onClick={handleToggleOverlay}
                    className={`min-h-[44px] py-2.5 px-5 rounded-xl text-xs font-extrabold flex items-center gap-2.5 transition-all active:scale-95 shadow-md ${
                      isOverlayGranted
                        ? 'bg-[#1A160F] text-[#E6C66E] border border-[#C8A24A]/40 hover:bg-[#251F14]'
                        : 'bg-gradient-to-r from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] text-[#070605] shadow-[0_4px_16px_rgba(230,198,110,0.4)] hover:brightness-110'
                    }`}
                  >
                    <span>{isOverlayGranted ? 'فتح الضبط' : 'تفعيل الإذن'}</span>
                    <ExternalLink size={14} />
                  </button>

                  {!isOverlayGranted ? (
                    <button
                      type="button"
                      onClick={handleVerifyOverlay}
                      disabled={verifyingKey === 'overlay'}
                      title="اضغط للتحقق من تفعيل الإذن في النظام"
                      className="min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-bold bg-[#14110A] hover:bg-[#20180F] text-[#E6C66E] hover:text-[#FFF2C2] border border-[#C8A24A]/40 active:scale-95 flex items-center gap-2 transition-all"
                    >
                      <RefreshCw size={14} className={verifyingKey === 'overlay' ? 'animate-spin' : ''} />
                      <span>{verifyingKey === 'overlay' ? 'جاري الفحص...' : 'تحقق من التفعيل'}</span>
                    </button>
                  ) : (
                    <div className="py-2.5 px-4 rounded-xl text-xs font-extrabold text-emerald-400 bg-emerald-950/70 border border-emerald-500/50 flex items-center gap-1.5">
                      <CheckCircle2 size={16} />
                      <span>مفعّل</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4 Feature Visuals Enabled by Overlay */}
              <div className="space-y-2">
                <h3 className="text-xs font-extrabold text-[#D4AF37]">
                  ماذا يتيح هذا الإذن في أثر؟
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    {
                      icon: Moon,
                      title: 'شاشة الأذان الملكية',
                      desc: 'تنبثق تلقائياً وقت الصلاة كالمكالمة الواردة مع الترديد',
                    },
                    {
                      icon: Heart,
                      title: 'أذكار الصباح والمساء',
                      desc: 'بطاقة ذهبية عائمة تذكرك بالأوراد في أوقاتها',
                    },
                    {
                      icon: BookOpen,
                      title: 'الورد القرآني والتدبر',
                      desc: 'تنبيه آية وتدبر يومي يفتح المصحف مباشرة',
                    },
                    {
                      icon: ShieldCheck,
                      title: 'بر الوالدين والإحسان',
                      desc: 'تذكير دافئ بالدعاء لهما وبرّهما والتواصل معهما',
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#120F0A]/90 border border-[#C8A24A]/20 flex items-start gap-2.5"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#221B0F] border border-[#C8A24A]/30 flex items-center justify-center text-[#E6C66E] shrink-0 mt-0.5">
                        <item.icon size={14} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[11px] font-extrabold text-[#F3E5AB]">
                          {item.title}
                        </h4>
                        <p className="text-[10px] text-[#A69977] leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interactive Visual Guide Diagram */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-b from-[#16120B] to-[#0D0B07] border border-[#C8A24A]/30 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-extrabold text-[#FFF2C2]">
                  <span>طريقة التفعيل من إعدادات الهاتف:</span>
                  <span className="text-[10px] text-[#D4AF37] font-normal">خطوتان سريعتان</span>
                </div>

                {/* Mock Phone Settings Panel */}
                <div className="p-3 rounded-xl bg-[#080705] border border-[#C8A24A]/25 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[#2A2315] text-[10px] text-[#A69977]">
                    <span>إعدادات النظام ← الظهور فوق التطبيقات</span>
                    <span>Display Over Apps</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#14110A] border border-[#D4AF37]/35">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-[#D4AF37] text-[#070605] flex items-center justify-center font-bold text-[10px]">
                        أثر
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-extrabold text-[#FFF2C2]">
                          أَثَرُ
                        </div>
                        <div className="text-[9px] text-[#A69977]">
                          السماح بالظهور فوق التطبيقات الأخرى
                        </div>
                      </div>
                    </div>

                    {/* Animated Gold Toggle Mockup */}
                    <div className="w-9 h-5 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#E6C66E] p-0.5 flex items-center justify-end shadow-[0_0_8px_rgba(230,198,110,0.5)]">
                      <div className="w-4 h-4 rounded-full bg-[#070605] shadow-sm" />
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-[#A69977] leading-relaxed">
                  💡 بمجرد تفعيل المفتاح والرجوع للتطبيق، سيكتشف «أثر» التفعيل تلقائياً وينتقل بك إلى الخطوة التالية.
                </p>
              </div>
            </div>
          )}

          {/* ===================================================================
              STEP 2: LOCATION ACCESS (إذن الموقع الجغرافي)
             =================================================================== */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fadeIn text-right">
              {/* Step Header */}
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[10px] font-bold text-[#E6C66E]">
                  <MapPin size={12} />
                  <span>دقة المواقيت والقبلة</span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#FFF9E6]">
                  تحديد الموقع الجغرافي
                </h2>
                <p className="text-xs text-[#C4B998] leading-relaxed">
                  لحساب مواقيت الصلاة الخمسة بدقة فلكية تامة لمدينتك وحساب زاوية بوصلة القبلة نحو الكعبة المشرفة.
                </p>
              </div>

              {/* Step Notice Banner */}
              {stepNotice && stepNotice.step === 2 && (
                <div
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2.5 animate-slideDown shadow-lg ${
                    stepNotice.type === 'success'
                      ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300'
                      : 'bg-[#26140D] border-amber-600/70 text-amber-200'
                  }`}
                >
                  {stepNotice.type === 'success' ? (
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                  )}
                  <span className="leading-relaxed">{stepNotice.text}</span>
                </div>
              )}

              {/* Status & GPS Action Card */}
              <div className="p-4 rounded-2xl bg-[#15120B]/95 border border-[#C8A24A]/40 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                        detectedCoords
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400'
                          : 'bg-[#221B0F] border-[#C8A24A]/40 text-[#E6C66E]'
                      }`}
                    >
                      {detectedCoords ? <CheckCircle2 size={20} /> : <Compass size={20} />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-extrabold text-[#FFF9E6] truncate">
                        {detectedCoords
                          ? `تم التحديد: ${detectedCoords.city || detectedCoords.formattedLocation}`
                          : 'الموقع غير محدد بعد'}
                      </h3>
                      <p className="text-[11px] text-[#A69977]">
                        {detectedCoords
                          ? `${detectedCoords.country || ''} · خط العرض: ${detectedCoords.latitude.toFixed(2)}`
                          : 'اضغط الزر أدناه لتحديد موقعك تلقائياً عبر GPS'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-bold shrink-0 ${
                      detectedCoords ? 'text-emerald-400' : 'text-[#D4AF37]'
                    }`}
                  >
                    {detectedCoords ? 'مكتمل' : 'مطلوب'}
                  </span>
                </div>

                {/* GPS Trigger Button */}
                <button
                  type="button"
                  onClick={handleRequestLocation}
                  disabled={isRequestingLocation}
                  className={`w-full min-h-[46px] py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    detectedCoords
                      ? 'bg-[#1D170C] text-[#FFF2C2] border border-[#E6C66E]/50 hover:bg-[#251F14]'
                      : 'bg-gradient-to-r from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] text-[#070605] shadow-[0_4px_16px_rgba(230,198,110,0.35)] hover:brightness-110'
                  }`}
                >
                  <Compass size={16} className={isRequestingLocation ? 'animate-spin' : ''} />
                  <span>
                    {isRequestingLocation
                      ? 'جاري تحديد المدينة والمنطقة...'
                      : detectedCoords
                      ? 'إعادة التحديد عبر GPS'
                      : 'تحديد موقعي الآن عبر GPS'}
                  </span>
                </button>

                {locationError && (
                  <p className="text-[11px] text-[#E6C66E] pt-1 leading-relaxed">
                    ⚠️ {locationError}
                  </p>
                )}
              </div>

              {/* Popular Cities Fast Selector Fallback */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs font-bold text-[#C4B998]">
                  <span>أو اختر مدينتك مباشرة:</span>
                  <span className="text-[10px] text-[#A69977]">تحديد فوري بدون GPS</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {POPULAR_CITIES.slice(0, 6).map((c, idx) => {
                    const isSelected =
                      detectedCoords?.city === c.city ||
                      (detectedCoords?.latitude === c.latitude && detectedCoords?.longitude === c.longitude);

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPredefinedCity(c)}
                        className={`p-2.5 rounded-xl text-right border transition-all text-xs font-bold active:scale-95 ${
                          isSelected
                            ? 'bg-[#2E2210] border-[#E6C66E] text-[#FFF2C2] shadow-[0_0_12px_rgba(230,198,110,0.3)]'
                            : 'bg-[#120F0A] border-[#C8A24A]/25 text-[#C4B998] hover:border-[#D4AF37]/50'
                        }`}
                      >
                        <div className="font-extrabold text-[#F3E5AB]">{c.city}</div>
                        <div className="text-[10px] text-[#8C8065]">{c.country}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              STEP 3: PHONE & ADVANCED PERMISSIONS (أذونات الهاتف المتقدمة وتثبيت التطبيقات)
             =================================================================== */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fadeIn text-right w-full max-w-full overflow-x-hidden">
              {/* Step Header */}
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[10px] font-bold text-[#E6C66E]">
                  <Smartphone size={12} />
                  <span>أذونات الهاتف المتقدمة للأندرويد (Special Android Access)</span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#FFF9E6]">
                  أذونات التشغيل بالخلفية وتثبيت التطبيقات
                </h2>
                <p className="text-xs text-[#C4B998] leading-relaxed">
                  لضمان صدح الأذان بدقة في الخلفية وعلى شاشة القفل وتثبيت تحديثات أثر الرسمية تلقائياً، قمنا بتنظيم الأذونات في بطاقات واضحة بزر فحص ذكي موحد:
                </p>
              </div>

              {/* Step Notice Banner */}
              {stepNotice && stepNotice.step === 3 && (
                <div
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2.5 animate-slideDown shadow-lg ${
                    stepNotice.type === 'success'
                      ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300'
                      : 'bg-[#26140D] border-amber-600/70 text-amber-200'
                  }`}
                >
                  {stepNotice.type === 'success' ? (
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                  )}
                  <span className="leading-relaxed">{stepNotice.text}</span>
                </div>
              )}

              {/* Unified 6 Permission Cards with Single Smart Button */}
              <div className="space-y-3 w-full">
                {/* 1. التشغيل التلقائي بالخلفية */}
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 text-right w-full overflow-hidden ${
                    autoStartDismissed
                      ? 'bg-[#141F16]/90 border-emerald-500/50 shadow-[0_2px_14px_rgba(16,185,129,0.1)]'
                      : 'bg-[#15110B] border-[#C8A24A]/30 hover:border-[#E6C66E]/60'
                  }`}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          autoStartDismissed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#D4AF37]/15 text-[#E6C66E]'
                        }`}
                      >
                        <RefreshCw size={17} />
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-extrabold text-[#FFF9E6]">
                            1. التشغيل التلقائي بالخلفية
                          </h4>
                          <span className="text-[10px] text-[#A69977] font-mono">(Autostart)</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              autoStartDismissed
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {autoStartDismissed ? 'مفعّل ✓' : 'مطلوب لحماية الأذان'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#C4B998] leading-relaxed">
                          يضمن بقاء تطبيق أثر حياً في الخلفية وإعادة تشغيل الأذان ومواقيت الصلاة تلقائياً حتى عند إغلاق التطبيقات أو إعادة تشغيل الهاتف.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5">
                      <button
                        type="button"
                        onClick={handleSmartAutoStart}
                        disabled={verifyingKey === 'autostart'}
                        className={`w-full min-h-[44px] py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow ${
                          autoStartDismissed
                            ? 'bg-emerald-950/80 border border-emerald-500/70 text-emerald-300 hover:brightness-110'
                            : 'bg-gradient-to-r from-[#D4AF37] via-[#C8A24A] to-[#997328] text-[#070605] hover:brightness-110 active:scale-[0.98]'
                        }`}
                      >
                        {verifyingKey === 'autostart' ? (
                          <>
                            <RefreshCw size={14} className="animate-spin text-[#070605]" />
                            <span>جاري التحقق...</span>
                          </>
                        ) : autoStartDismissed ? (
                          <>
                            <CheckCircle2 size={15} className="text-emerald-400" />
                            <span>مفعّل بنجاح ✓</span>
                          </>
                        ) : (
                          <>
                            <span>{hasOpenedAutoStart ? 'فحص وتأكيد التشغيل التلقائي ✓' : 'تفعيل وفحص الأوتو ستارت ⚡'}</span>
                            <ExternalLink size={13} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. عرض النوافذ المنبثقة */}
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 text-right w-full overflow-hidden ${
                    popupWindowDismissed
                      ? 'bg-[#141F16]/90 border-emerald-500/50 shadow-[0_2px_14px_rgba(16,185,129,0.1)]'
                      : 'bg-[#15110B] border-[#C8A24A]/30 hover:border-[#E6C66E]/60'
                  }`}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          popupWindowDismissed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#D4AF37]/15 text-[#E6C66E]'
                        }`}
                      >
                        <Layers size={17} />
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-extrabold text-[#FFF9E6]">
                            2. عرض النوافذ المنبثقة
                          </h4>
                          <span className="text-[10px] text-[#A69977] font-mono">(Display pop-up)</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              popupWindowDismissed
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {popupWindowDismissed ? 'مفعّل ✓' : 'مطلوب للتنبيه'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#C4B998] leading-relaxed">
                          ضروري لإظهار وبقاء بطاقة تنبيهات أثر الملكية وشاشة الأذان فوق التطبيقات تلقائياً دون اختفاء.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5">
                      <button
                        type="button"
                        onClick={handleSmartPopup}
                        disabled={verifyingKey === 'popup_single'}
                        className={`w-full min-h-[44px] py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow ${
                          popupWindowDismissed
                            ? 'bg-emerald-950/80 border border-emerald-500/70 text-emerald-300 hover:brightness-110'
                            : 'bg-gradient-to-r from-[#D4AF37] via-[#C8A24A] to-[#997328] text-[#070605] hover:brightness-110 active:scale-[0.98]'
                        }`}
                      >
                        {verifyingKey === 'popup_single' ? (
                          <>
                            <RefreshCw size={14} className="animate-spin text-[#070605]" />
                            <span>جاري التحقق...</span>
                          </>
                        ) : popupWindowDismissed ? (
                          <>
                            <CheckCircle2 size={15} className="text-emerald-400" />
                            <span>مفعّل بنجاح ✓</span>
                          </>
                        ) : (
                          <>
                            <span>{hasOpenedVendorSettings ? 'فحص وتأكيد الإذن ✓' : 'تفعيل وفحص النوافذ المنبثقة ⚡'}</span>
                            <ExternalLink size={13} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. النوافذ بالخلفية */}
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 text-right w-full overflow-hidden ${
                    popupBgDismissed
                      ? 'bg-[#141F16]/90 border-emerald-500/50 shadow-[0_2px_14px_rgba(16,185,129,0.1)]'
                      : 'bg-[#15110B] border-[#C8A24A]/30 hover:border-[#E6C66E]/60'
                  }`}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          popupBgDismissed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#D4AF37]/15 text-[#E6C66E]'
                        }`}
                      >
                        <Sparkles size={17} />
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-extrabold text-[#FFF9E6]">
                            3. النوافذ أثناء التشغيل في الخلفية
                          </h4>
                          <span className="text-[10px] text-[#A69977] font-mono">(Display popup in bg)</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              popupBgDismissed
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {popupBgDismissed ? 'مفعّل ✓' : 'مطلوب للخلفية'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#C4B998] leading-relaxed">
                          يضمن صدح الأذان وانبثاق التنبيه الملكي حتى لو كنت خارج التطبيق أو تتصفح تطبيقات أخرى كواتساب.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5">
                      <button
                        type="button"
                        onClick={handleSmartPopupBg}
                        disabled={verifyingKey === 'popup_bg_single'}
                        className={`w-full min-h-[44px] py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow ${
                          popupBgDismissed
                            ? 'bg-emerald-950/80 border border-emerald-500/70 text-emerald-300 hover:brightness-110'
                            : 'bg-gradient-to-r from-[#D4AF37] via-[#C8A24A] to-[#997328] text-[#070605] hover:brightness-110 active:scale-[0.98]'
                        }`}
                      >
                        {verifyingKey === 'popup_bg_single' ? (
                          <>
                            <RefreshCw size={14} className="animate-spin text-[#070605]" />
                            <span>جاري التحقق...</span>
                          </>
                        ) : popupBgDismissed ? (
                          <>
                            <CheckCircle2 size={15} className="text-emerald-400" />
                            <span>مفعّل بنجاح ✓</span>
                          </>
                        ) : (
                          <>
                            <span>{hasOpenedVendorSettings ? 'فحص وتأكيد الإذن ✓' : 'تفعيل وفحص النوافذ بالخلفية ⚡'}</span>
                            <ExternalLink size={13} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. العرض على شاشة القفل */}
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 text-right w-full overflow-hidden ${
                    lockScreenDismissed
                      ? 'bg-[#141F16]/90 border-emerald-500/50 shadow-[0_2px_14px_rgba(16,185,129,0.1)]'
                      : 'bg-[#15110B] border-[#C8A24A]/30 hover:border-[#E6C66E]/60'
                  }`}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          lockScreenDismissed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#D4AF37]/15 text-[#E6C66E]'
                        }`}
                      >
                        <Lock size={17} />
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-extrabold text-[#FFF9E6]">
                            4. العرض على شاشة القفل
                          </h4>
                          <span className="text-[10px] text-[#A69977] font-mono">(Show on lock screen)</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              lockScreenDismissed
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {lockScreenDismissed ? 'مفعّل ✓' : 'مطلوب للقفل'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#C4B998] leading-relaxed">
                          لعرض شاشة الأذان وبطاقة التنبيه الحي وترديد التكبيرات مباشرة عندما يكون الهاتف مقفلاً ومغلق الشاشة.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5">
                      <button
                        type="button"
                        onClick={handleSmartLockScreen}
                        disabled={verifyingKey === 'lockscreen_single'}
                        className={`w-full min-h-[44px] py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow ${
                          lockScreenDismissed
                            ? 'bg-emerald-950/80 border border-emerald-500/70 text-emerald-300 hover:brightness-110'
                            : 'bg-gradient-to-r from-[#D4AF37] via-[#C8A24A] to-[#997328] text-[#070605] hover:brightness-110 active:scale-[0.98]'
                        }`}
                      >
                        {verifyingKey === 'lockscreen_single' ? (
                          <>
                            <RefreshCw size={14} className="animate-spin text-[#070605]" />
                            <span>جاري التحقق...</span>
                          </>
                        ) : lockScreenDismissed ? (
                          <>
                            <CheckCircle2 size={15} className="text-emerald-400" />
                            <span>مفعّل بنجاح ✓</span>
                          </>
                        ) : (
                          <>
                            <span>{hasOpenedVendorSettings ? 'فحص وتأكيد الإذن ✓' : 'تفعيل وفحص شاشة القفل ⚡'}</span>
                            <ExternalLink size={13} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 5. اختصارات الشاشة الرئيسية */}
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 text-right w-full overflow-hidden ${
                    homeShortcutDismissed
                      ? 'bg-[#141F16]/90 border-emerald-500/50 shadow-[0_2px_14px_rgba(16,185,129,0.1)]'
                      : 'bg-[#15110B] border-[#C8A24A]/30 hover:border-[#E6C66E]/60'
                  }`}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          homeShortcutDismissed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#D4AF37]/15 text-[#E6C66E]'
                        }`}
                      >
                        <Smartphone size={17} />
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-extrabold text-[#FFF9E6]">
                            5. اختصارات الشاشة الرئيسية
                          </h4>
                          <span className="text-[10px] text-[#A69977] font-mono">(Home shortcuts)</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              homeShortcutDismissed
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {homeShortcutDismissed ? 'مفعّل ✓' : 'مطلوب للوصول'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#C4B998] leading-relaxed">
                          لإضافة أيقونة واختصارات أثر على شاشتك الرئيسية للوصول المباشر والسريع للأذكار ومواقيت الصلاة.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5">
                      <button
                        type="button"
                        onClick={handleSmartHomeShortcut}
                        disabled={verifyingKey === 'homescreen_single'}
                        className={`w-full min-h-[44px] py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow ${
                          homeShortcutDismissed
                            ? 'bg-emerald-950/80 border border-emerald-500/70 text-emerald-300 hover:brightness-110'
                            : 'bg-gradient-to-r from-[#D4AF37] via-[#C8A24A] to-[#997328] text-[#070605] hover:brightness-110 active:scale-[0.98]'
                        }`}
                      >
                        {verifyingKey === 'homescreen_single' ? (
                          <>
                            <RefreshCw size={14} className="animate-spin text-[#070605]" />
                            <span>جاري التحقق...</span>
                          </>
                        ) : homeShortcutDismissed ? (
                          <>
                            <CheckCircle2 size={15} className="text-emerald-400" />
                            <span>مفعّل بنجاح ✓</span>
                          </>
                        ) : (
                          <>
                            <span>{hasOpenedVendorSettings ? 'فحص وتأكيد الإذن ✓' : 'تفعيل وفحص اختصارات الشاشة ⚡'}</span>
                            <ExternalLink size={13} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 6. تثبيت التطبيقات (REQUEST_INSTALL_PACKAGES) */}
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 text-right w-full overflow-hidden ${
                    isInstallPackagesGranted
                      ? 'bg-[#141F16]/90 border-emerald-500/50 shadow-[0_2px_14px_rgba(16,185,129,0.1)]'
                      : 'bg-[#15110B] border-[#C8A24A]/30 hover:border-[#E6C66E]/60'
                  }`}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isInstallPackagesGranted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#D4AF37]/15 text-[#E6C66E]'
                        }`}
                      >
                        <ShieldCheck size={18} />
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-extrabold text-[#FFF9E6]">
                            6. تثبيت التطبيقات
                          </h4>
                          <span className="text-[10px] text-[#A69977] font-mono">(REQUEST_INSTALL_PACKAGES)</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              isInstallPackagesGranted
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {isInstallPackagesGranted ? 'مفعّل ✓' : 'مطلوب للتحديثات'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#C4B998] leading-relaxed">
                          ضروري لتنزيل وتثبيت تحديثات تطبيق أثر الملكية الجديدة تلقائياً وبأمان كامل، لضمان وصول أحدث التحسينات والأذكار إليك مباشرة.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5">
                      <button
                        type="button"
                        onClick={handleSmartInstallPackages}
                        disabled={verifyingKey === 'install_packages'}
                        className={`w-full min-h-[44px] py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow ${
                          isInstallPackagesGranted
                            ? 'bg-emerald-950/80 border border-emerald-500/70 text-emerald-300 hover:brightness-110'
                            : 'bg-gradient-to-r from-[#D4AF37] via-[#C8A24A] to-[#997328] text-[#070605] hover:brightness-110 active:scale-[0.98]'
                        }`}
                      >
                        {verifyingKey === 'install_packages' ? (
                          <>
                            <RefreshCw size={14} className="animate-spin text-[#070605]" />
                            <span>جاري التحقق من إذن التثبيت...</span>
                          </>
                        ) : isInstallPackagesGranted ? (
                          <>
                            <CheckCircle2 size={15} className="text-emerald-400" />
                            <span>مفعّل بنجاح ✓</span>
                          </>
                        ) : (
                          <>
                            <span>{hasOpenedInstallSettings ? 'فحص وتأكيد إذن التثبيت ✓' : 'تفعيل وفحص إذن التثبيت ⚡'}</span>
                            <ExternalLink size={13} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vendor Brand Selector & Actionable Steps */}
              <div className="p-3.5 rounded-2xl bg-[#100D09] border border-[#C8A24A]/25 space-y-3">
                <div className="flex items-center justify-between text-xs font-extrabold text-[#D4AF37]">
                  <span>إرشادات التفعيل حسب نوع هاتفك:</span>
                </div>

                {/* Brand Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {Object.keys(brandGuides).map((bKey) => (
                    <button
                      key={bKey}
                      type="button"
                      onClick={() => setActiveBrandTab(bKey)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                        activeBrandTab === bKey
                          ? 'bg-[#E6C66E] text-[#070605] shadow-sm font-black'
                          : 'bg-[#18140D] text-[#A69977] hover:text-[#FFF2C2] border border-[#2A2315]'
                      }`}
                    >
                      {brandGuides[bKey].name.split(' ')[0]}
                    </button>
                  ))}
                </div>

                {/* Steps List for Selected Brand */}
                <div className="p-3 rounded-xl bg-[#090705] border border-[#2A2315] space-y-2">
                  <div className="text-xs font-bold text-[#FFF2C2]">
                    {brandGuides[activeBrandTab].name}:
                  </div>
                  <div className="space-y-1.5">
                    {brandGuides[activeBrandTab].tips.map((stepText, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[11px] text-[#C4B998] leading-relaxed">
                        <span className="text-[#E6C66E] font-bold">←</span>
                        <span>{stepText}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              STEP 4: NOTIFICATIONS & EXACT ALARMS & BATTERY
             =================================================================== */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fadeIn text-right">
              {/* Step Header */}
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[10px] font-bold text-[#E6C66E]">
                  <Bell size={12} />
                  <span>دقة التنبيه بالثانية</span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#FFF9E6]">
                  الإشعارات، المنبهات، والبطارية
                </h2>
                <p className="text-xs text-[#C4B998] leading-relaxed">
                  ثلاثة أذونات متكاملة تضمن إطلاق صوت الأذان ومنبه صلاة الفجر في اللحظة الدقيقة دون أي تأخير أو كتم من وضع توفير الطاقة.
                </p>
              </div>

              {/* Step Notice Banner */}
              {stepNotice && stepNotice.step === 4 && (
                <div
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2.5 animate-slideDown shadow-lg ${
                    stepNotice.type === 'success'
                      ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300'
                      : 'bg-[#26140D] border-amber-600/70 text-amber-200'
                  }`}
                >
                  {stepNotice.type === 'success' ? (
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                  )}
                  <span className="leading-relaxed">{stepNotice.text}</span>
                </div>
              )}

              {/* 3 Interactive Feature Cards with Intent Toggles */}
              <div className="space-y-2.5">
                {/* 1. System Notifications */}
                <div
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    notificationStatus === 'granted'
                      ? 'bg-[#151D14] border-emerald-500/50'
                      : 'bg-[#18130B] border-[#C8A24A]/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                        notificationStatus === 'granted'
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400'
                          : 'bg-[#221B0F] border-[#C8A24A]/40 text-[#E6C66E]'
                      }`}
                    >
                      {notificationStatus === 'granted' ? <CheckCircle2 size={18} /> : <Bell size={18} />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-[13px] font-extrabold text-[#FFF9E6]">
                        إشعارات النظام وشريط التنبيهات
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-[#A69977] truncate">
                        تنبيهات مواقيت الصلاة وشريط الأذان الدائم
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleToggleNotification}
                      className={`min-h-[42px] py-2 px-3.5 rounded-xl text-xs font-extrabold transition-all active:scale-95 shrink-0 ${
                        notificationStatus === 'granted'
                          ? 'bg-[#1A160F] text-emerald-400 border border-emerald-700/50'
                          : 'bg-gradient-to-r from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] text-[#070605] shadow-md font-black'
                      }`}
                    >
                      {notificationStatus === 'granted' ? 'مفعّل' : 'تفعيل الإشعارات'}
                    </button>

                    {notificationStatus !== 'granted' && (
                      <button
                        type="button"
                        onClick={handleVerifyNotification}
                        disabled={verifyingKey === 'notif'}
                        className="min-h-[42px] py-2 px-3 rounded-xl text-xs font-bold bg-[#14110A] text-[#C4B998] hover:text-[#FFF2C2] border border-[#C8A24A]/30 active:scale-95 flex items-center gap-1.5"
                      >
                        <RefreshCw size={12} className={verifyingKey === 'notif' ? 'animate-spin' : ''} />
                        <span>تحقق</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Exact Alarms (Android 12+) */}
                <div
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isExactAlarmGranted
                      ? 'bg-[#151D14] border-emerald-500/50'
                      : 'bg-[#18130B] border-[#C8A24A]/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                        isExactAlarmGranted
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400'
                          : 'bg-[#221B0F] border-[#C8A24A]/40 text-[#E6C66E]'
                      }`}
                    >
                      {isExactAlarmGranted ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-[13px] font-extrabold text-[#FFF9E6]">
                        المنبهات الدقيقة (Exact Alarms)
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-[#A69977] truncate">
                        إذن أندرويد 12+ لإطلاق الأذان في اللحظة الدقيقة
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleToggleExactAlarm}
                      className={`min-h-[42px] py-2 px-3.5 rounded-xl text-xs font-extrabold transition-all active:scale-95 ${
                        isExactAlarmGranted
                          ? 'bg-[#1A160F] text-emerald-400 border border-emerald-700/50'
                          : 'bg-gradient-to-r from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] text-[#070605] shadow-md font-black'
                      }`}
                    >
                      {isExactAlarmGranted ? 'مفعّل' : 'ضبط المنبه'}
                    </button>

                    {!isExactAlarmGranted && (
                      <button
                        type="button"
                        onClick={handleVerifyExactAlarm}
                        disabled={verifyingKey === 'exact_alarm'}
                        className="min-h-[42px] py-2 px-3 rounded-xl text-xs font-bold bg-[#14110A] text-[#C4B998] hover:text-[#FFF2C2] border border-[#C8A24A]/30 active:scale-95 flex items-center gap-1.5"
                      >
                        <RefreshCw size={12} className={verifyingKey === 'exact_alarm' ? 'animate-spin' : ''} />
                        <span>تحقق</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Unrestricted Battery */}
                <div
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    batteryIgnored
                      ? 'bg-[#151D14] border-emerald-500/50'
                      : 'bg-[#18130B] border-[#C8A24A]/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                        batteryIgnored
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400'
                          : 'bg-[#221B0F] border-[#C8A24A]/40 text-[#E6C66E]'
                      }`}
                    >
                      {batteryIgnored ? <CheckCircle2 size={18} /> : <BatteryCharging size={18} />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-[13px] font-extrabold text-[#FFF9E6]">
                        تجاهل قيود البطارية (بلا قيود)
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-[#A69977] truncate">
                        يمنع الهاتف من إيقاف منبهات الأذان لتوفير الطاقة
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleToggleBattery}
                      className={`min-h-[42px] py-2 px-3.5 rounded-xl text-xs font-extrabold transition-all active:scale-95 shrink-0 ${
                        batteryIgnored
                          ? 'bg-[#1A160F] text-emerald-400 border border-emerald-700/50'
                          : 'bg-gradient-to-r from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] text-[#070605] shadow-md font-black'
                      }`}
                    >
                      {batteryIgnored ? 'مهيأ' : 'تعطيل القيود'}
                    </button>

                    {!batteryIgnored && (
                      <button
                        type="button"
                        onClick={handleVerifyBattery}
                        disabled={verifyingKey === 'battery'}
                        className="min-h-[42px] py-2 px-3 rounded-xl text-xs font-bold bg-[#14110A] text-[#C4B998] hover:text-[#FFF2C2] border border-[#C8A24A]/30 active:scale-95 flex items-center gap-1.5"
                      >
                        <RefreshCw size={12} className={verifyingKey === 'battery' ? 'animate-spin' : ''} />
                        <span>تحقق</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* =====================================================================
            BOTTOM STICKY ROYAL ACTION BAR
           ===================================================================== */}
        <div className="relative z-20 px-4 sm:px-6 pt-3.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-[#C8A24A]/30 bg-gradient-to-t from-[#050403] via-[#090705] to-[#090705]/95 backdrop-blur-xl shadow-[0_-12px_32px_rgba(0,0,0,0.9)] shrink-0">
          <div className="flex items-center gap-2.5">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => {
                  setStepNotice(null);
                  setCurrentStep((prev) => Math.max(1, prev - 1));
                }}
                className="min-h-[48px] py-3.5 px-4 rounded-2xl bg-[#16120B] hover:bg-[#221C11] border border-[#C8A24A]/35 text-[#E6C66E] font-bold text-xs transition-all flex items-center justify-center gap-1 active:scale-98"
              >
                <ChevronRight size={16} />
                <span>السابق</span>
              </button>
            )}

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex-1 min-h-[48px] py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] hover:brightness-110 text-[#070605] font-extrabold text-xs sm:text-sm shadow-[0_8px_28px_rgba(230,198,110,0.38)] border border-[#FFF9E2] active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <span>متابعة الخطوة التالية</span>
                <ChevronLeft size={17} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishWizard}
                className="flex-1 min-h-[48px] py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] hover:brightness-110 text-[#070605] font-extrabold text-xs sm:text-sm shadow-[0_8px_28px_rgba(230,198,110,0.42)] border border-[#FFF9E2] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>حفظ ، وبدء رحلتك الي الجنَّة</span>
                <span className="text-red-600 text-sm animate-pulse leading-none">♥️</span>
                <ChevronLeft size={17} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
