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
  const totalSteps = 5;

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

  // Step 5: Testing
  const [testCountdownNotif, setTestCountdownNotif] = useState<number>(0);
  const [testCountdownAthan, setTestCountdownAthan] = useState<number>(0);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);

  // Auto-detect system permissions whenever window regains focus
  const checkAllSystemStates = useCallback(async () => {
    try {
      // 1. Overlay (strictly sync with Android system)
      const overlayReal = await NativePermissionsBridge.checkOverlayPermission();
      setIsOverlayGranted(overlayReal);

      // 2. Exact Alarm
      const exactReal = await NativePermissionsBridge.checkExactAlarmPermission();
      setIsExactAlarmGranted(exactReal);

      // 3. Battery
      const batReal = await NativePermissionsBridge.checkBatteryOptimizationIgnored();
      setBatteryIgnored(batReal);

      // 4. Notifications
      const notifReal = await NativePermissionsBridge.checkNotificationPermission();
      setNotificationStatus(notifReal ? 'granted' : NotificationService.getPermissionStatus());
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
     STEP 3 HANDLERS: VENDOR & SPECIAL (4 CORE PERMISSIONS)
     ===================================================================== */
  const handleOpenSmartSettings = async () => {
    setHasOpenedVendorSettings(true);
    localStorage.setItem('athar_opened_vendor_settings', 'true');
    setStepNotice(null);
    try {
      const res = await NativePermissionsBridge.openOtherPermissionsSettings();
      if (res?.opened) {
        setStepNotice({
          step: 3,
          type: 'success',
          text: 'تم فتح صفحة ضبط الأذونات المتقدمة (الأذونات الأخرى) بنجاح! فعّل الخيارات الأربعة ثم ارجع للتأكيد ✓',
        });
        return;
      }
    } catch {}

    try {
      const res = await NativePermissionsBridge.openAutoStartSettings();
      if (res?.isXiaomiAutostart) {
        setStepNotice({
          step: 3,
          type: 'success',
          text: 'تم فتح صفحة التشغيل التلقائي والأذونات لشاومي مباشرة! قم بتفعيل تطبيق أثر ثم الرجوع للتأكيد ✓',
        });
      } else {
        setStepNotice({
          step: 3,
          type: 'success',
          text: 'تم فتح صفحة معلومات تطبيق أثر في إعدادات الهاتف! فعّل النوافذ المنبثقة وشاشة القفل ✓',
        });
      }
    } catch {
      await NativePermissionsBridge.openAppSettings();
      setStepNotice({
        step: 3,
        type: 'success',
        text: 'تم فتح صفحة ضبط التطبيق! فعّل خيارات التشغيل التلقائي وشاشة القفل لضمان صدح الأذان ✓',
      });
    }
  };

  const handleTogglePopup = async () => {
    setHasOpenedVendorSettings(true);
    localStorage.setItem('athar_opened_vendor_settings', 'true');
    await NativePermissionsBridge.openOverlayPermissionSettings();
    const nextVal = !popupWindowDismissed;
    setPopupWindowDismissed(nextVal);
    localStorage.setItem('athar_perm_popup', nextVal ? 'true' : 'false');
    setStepNotice({
      step: 3,
      type: 'success',
      text: nextVal
        ? 'تم تحديد إذن «عرض النوافذ المنبثقة (Display pop-up)» كمفعّل ✓'
        : 'تم إلغاء تحديد إذن النوافذ المنبثقة.',
    });
  };

  const handleTogglePopupBg = async () => {
    setHasOpenedVendorSettings(true);
    localStorage.setItem('athar_opened_vendor_settings', 'true');
    await NativePermissionsBridge.openOtherPermissionsSettings();
    const nextVal = !popupBgDismissed;
    setPopupBgDismissed(nextVal);
    localStorage.setItem('athar_perm_popup_bg', nextVal ? 'true' : 'false');
    setStepNotice({
      step: 3,
      type: 'success',
      text: nextVal
        ? 'تم تحديد إذن «النوافذ المنبثقة بالخلفية (Display pop-up in background)» كمفعّل ✓'
        : 'تم إلغاء تحديد إذن النوافذ بالخلفية.',
    });
  };

  const handleToggleLockScreen = async () => {
    setHasOpenedVendorSettings(true);
    localStorage.setItem('athar_opened_vendor_settings', 'true');
    await NativePermissionsBridge.openOtherPermissionsSettings();
    const nextVal = !lockScreenDismissed;
    setLockScreenDismissed(nextVal);
    localStorage.setItem('athar_perm_lockscreen', nextVal ? 'true' : 'false');
    setStepNotice({
      step: 3,
      type: 'success',
      text: nextVal
        ? 'تم تحديد إذن «العرض على شاشة القفل (Show on lock screen)» كمفعّل ✓'
        : 'تم إلغاء تحديد إذن شاشة القفل.',
    });
  };

  const handleToggleHomeShortcut = async () => {
    setHasOpenedVendorSettings(true);
    localStorage.setItem('athar_opened_vendor_settings', 'true');
    await NativePermissionsBridge.openOtherPermissionsSettings();
    const nextVal = !homeShortcutDismissed;
    setHomeShortcutDismissed(nextVal);
    localStorage.setItem('athar_perm_homescreen', nextVal ? 'true' : 'false');
    setStepNotice({
      step: 3,
      type: 'success',
      text: nextVal
        ? 'تم تحديد إذن «اختصار الشاشة الرئيسية (Home screen shortcuts)» كمفعّل ✓'
        : 'تم إلغاء تحديد إذن الاختصار.',
    });
  };

  const handleGrantAllFour = async () => {
    setPopupWindowDismissed(true);
    setPopupBgDismissed(true);
    setLockScreenDismissed(true);
    setHomeShortcutDismissed(true);
    setVendorPermissionsChecked(true);
    setHasOpenedVendorSettings(true);
    localStorage.setItem('athar_perm_popup', 'true');
    localStorage.setItem('athar_perm_popup_bg', 'true');
    localStorage.setItem('athar_perm_lockscreen', 'true');
    localStorage.setItem('athar_perm_homescreen', 'true');
    localStorage.setItem('athar_perm_vendor_verified', 'true');
    localStorage.setItem('athar_opened_vendor_settings', 'true');

    setStepNotice({
      step: 3,
      type: 'success',
      text: 'تم تأكيد تفعيل جميع الأذونات الأربعة بنجاح ✓ جاري فتح صفحة الضبط للتأكيد في هاتفك.',
    });
    await NativePermissionsBridge.openOtherPermissionsSettings();
  };

  const handleOpenAppSettings = async () => {
    await handleOpenSmartSettings();
  };

  const handleVerifyVendor = () => {
    if (!hasOpenedVendorSettings) {
      setStepNotice({
        step: 3,
        type: 'error',
        text: 'يُرجى الضغط أولاً على «الزر الذكي» لفتح صفحة الضبط وتفعيل الأذونات، ثم العودة للتأكيد.',
      });
      return;
    }
    setVendorPermissionsChecked(true);
    setPopupWindowDismissed(true);
    setPopupBgDismissed(true);
    setLockScreenDismissed(true);
    setHomeShortcutDismissed(true);
    localStorage.setItem('athar_perm_vendor_verified', 'true');
    localStorage.setItem('athar_perm_popup', 'true');
    localStorage.setItem('athar_perm_popup_bg', 'true');
    localStorage.setItem('athar_perm_lockscreen', 'true');
    localStorage.setItem('athar_perm_homescreen', 'true');
    setStepNotice({
      step: 3,
      type: 'success',
      text: 'تم تأكيد تفعيل الأذونات الأربعة بنجاح ✓ يمكنك المتابعة للخطوة التالية.',
    });
  };

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
      if (isIgnored) {
        setBatteryIgnored(true);
        localStorage.setItem('athar_perm_battery_opt_verified', 'true');
        setStepNotice({
          step: 4,
          type: 'success',
          text: 'تم التحقق بنجاح! تم إلغاء قيود توفير البطارية (بلا قيود) ✓',
        });
      } else {
        setBatteryIgnored(false);
        localStorage.removeItem('athar_perm_battery_opt_verified');
        setStepNotice({
          step: 4,
          type: 'error',
          text: 'تطبيق أثر ما زال مقيداً بتوفير البطارية. اختر «غير مقيّد / Unrestricted» في إعدادات البطارية.',
        });
      }
    } catch {
      setBatteryIgnored(false);
      setStepNotice({
        step: 4,
        type: 'error',
        text: 'تعذر التحقق من قيود البطارية.',
      });
    } finally {
      setVerifyingKey(null);
    }
  };

  /* =====================================================================
     STEP 5 HANDLERS: TESTING SUITE
     ===================================================================== */
  const handleTestNotificationNow = () => {
    AudioService.unlockAudio();
    NotificationService.notify({
      title: '🕌 أثر | تجربة الإشعار الفوري',
      body: 'هكذا سيصلك إشعار مواقيت الصلاة والأوراد اليومية في درج إشعارات هاتفك.',
      type: 'info',
    });
    setTestFeedback('تم إرسال الإشعار الفوري بنجاح! تفقّد أعلى الشاشة ودرج الإشعارات.');
    setTimeout(() => setTestFeedback(null), 5000);
  };

  const handleTestNotificationIn5s = () => {
    if (testCountdownNotif > 0) return;
    AudioService.unlockAudio();
    setTestCountdownNotif(5);
    setTestFeedback('اقفل شاشة هاتفك أو اخرج من التطبيق الآن؛ سيصلك التنبيه بعد ٥ ثوانٍ...');

    const timer = setInterval(() => {
      setTestCountdownNotif((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          ReminderEngine.testQuranVerseReminder();
          setTimeout(() => setTestFeedback(null), 6000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTestAthanNow = () => {
    AudioService.unlockAudio();
    ReminderEngine.launchFullScreenAdhan({
      prayerNameArabic: 'صلاة الفجر',
      isPreview: true,
    });
  };

  const handleTestAthanIn5s = () => {
    if (testCountdownAthan > 0) return;
    AudioService.unlockAudio();
    setTestCountdownAthan(5);
    setTestFeedback('اقفل شاشتك أو استخدم أي تطبيق آخر؛ ستنبثق شاشة الأذان الملكية بعد ٥ ثوانٍ...');

    const timer = setInterval(() => {
      setTestCountdownAthan((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (NativePermissionsBridge.isNative()) {
            NativePermissionsBridge.triggerSingleTestNotification(true, 0);
          } else {
            ReminderEngine.launchFullScreenAdhan({
              prayerNameArabic: 'صلاة الفجر',
              isPreview: true,
            });
          }
          setTimeout(() => setTestFeedback(null), 6000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
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
        !vendorPermissionsChecked &&
        !popupWindowDismissed &&
        !popupBgDismissed &&
        !lockScreenDismissed &&
        !homeShortcutDismissed
      ) {
        setStepNotice({
          step: 3,
          type: 'error',
          text: 'يُرجى الضغط على «الزر الذكي» أو تفعيل الأذونات أولاً، أو استخدام «تخطي مؤقتاً» بالأعلى.',
        });
        return;
      }
      setCurrentStep(4);
      return;
    }

    if (currentStep === 4) {
      setCurrentStep(5);
      return;
    }
  };

  const stepsMeta = [
    { num: 1, label: 'الظهور', icon: Layers },
    { num: 2, label: 'الموقع', icon: MapPin },
    { num: 3, label: 'أذونات الهواتف', icon: Smartphone },
    { num: 4, label: 'المنبهات', icon: Bell },
    { num: 5, label: 'التجربة', icon: Sparkles },
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
              STEP 3: 4 CORE ANDROID OEM PERMISSIONS (أذونات النوافذ المنبثقة وشاشة القفل)
             =================================================================== */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fadeIn text-right">
              {/* Step Header */}
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[10px] font-bold text-[#E6C66E]">
                  <Smartphone size={12} />
                  <span>الأذونات المتقدمة للأندرويد (Special Android Access)</span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#FFF9E6]">
                  تفعيل الأذونات الأربعة الأساسية لظهور التنبيهات والأذان
                </h2>
                <p className="text-xs text-[#C4B998] leading-relaxed">
                  لضمان بقاء التنبيهات الملكية وشاشة الأذان ثابتة وتعمل داخل وخارج التطبيق وعلى شاشة القفل، يتطلب نظام أندرويد تفعيل هذه الأذونات الأربعة:
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

              {/* Smart Settings Button (الزر الذكي لفتح صفحة الأذونات المباشرة) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1C160B] via-[#161007] to-[#0A0704] border border-[#E6C66E]/50 shadow-[0_4px_24px_rgba(200,162,74,0.22)] space-y-3 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#D4AF37]/25 border border-[#D4AF37]/40 text-[10px] font-black text-[#FFF2C2]">
                      <Sparkles size={11} className="text-[#E6C66E]" />
                      <span>الزر الذكي (Smart Permissions Trigger) ⚡</span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-extrabold text-[#FFF9E6]">
                      فتح صفحة ضبط الأذونات المتقدمة مباشرة
                    </h3>
                    <p className="text-[11px] text-[#C4B998] leading-relaxed">
                      ضغطة واحدة توجه هاتفك مباشرة لصفحة «الأذونات الأخرى» (Other permissions) أو صفحة ضبط تطبيق أثر
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenSmartSettings}
                    className="min-h-[46px] py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] text-[#070605] font-black text-xs shadow-xl hover:brightness-110 active:scale-95 shrink-0 flex items-center justify-center gap-2 border border-[#FFF9E6]/40 cursor-pointer"
                  >
                    <span>الزر الذكي / فتح الضبط ⚡</span>
                    <ExternalLink size={14} className="stroke-[2.5]" />
                  </button>
                </div>

                <div className="pt-2 border-t border-[#2A2315] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-[#A69977]">إجراء سريع:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleGrantAllFour}
                      className="px-3 py-1.5 rounded-lg text-xs font-black bg-gradient-to-r from-[#D4AF37]/30 to-[#E6C66E]/20 hover:from-[#D4AF37]/45 hover:to-[#E6C66E]/30 border border-[#E6C66E]/50 text-[#FFF2C2] flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                    >
                      <CheckCircle2 size={13} className="text-[#E6C66E]" />
                      <span>تأكيد الأذونات الأربعة وتفعيل الكل ✓</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleVerifyVendor}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                        vendorPermissionsChecked
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400'
                          : 'bg-[#221B0F] hover:bg-[#2D2111] border-[#C8A24A]/40 text-[#E6C66E]'
                      }`}
                    >
                      {vendorPermissionsChecked ? <CheckCircle2 size={13} /> : <RefreshCw size={12} />}
                      <span>{vendorPermissionsChecked ? 'تم التحقق' : 'تحقق بعد الضبط'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 Specialized Permission Cards requested by user */}
              <div className="space-y-2.5">
                {/* 1. Display pop-up windows */}
                <div
                  className={`p-3.5 rounded-2xl border transition-all duration-300 text-right ${
                    popupWindowDismissed
                      ? 'bg-[#141F16]/90 border-emerald-500/50 shadow-[0_2px_14px_rgba(16,185,129,0.1)]'
                      : 'bg-[#15110B] border-[#C8A24A]/30 hover:border-[#E6C66E]/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          popupWindowDismissed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#D4AF37]/15 text-[#E6C66E]'
                        }`}
                      >
                        <Layers size={16} />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-extrabold text-[#FFF9E6]">
                            1. عرض النوافذ المنبثقة (Display pop-up windows)
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleTogglePopup}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 active:scale-95 cursor-pointer ${
                          popupWindowDismissed
                            ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/80'
                            : 'bg-gradient-to-r from-[#D4AF37] to-[#B88A2D] text-[#070605] font-black hover:brightness-110 shadow'
                        }`}
                      >
                        {popupWindowDismissed ? (
                          <>
                            <CheckCircle2 size={12} />
                            <span>مفعّل</span>
                          </>
                        ) : (
                          <>
                            <span>فتح الضبط</span>
                            <ExternalLink size={12} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Display pop-up while windows running on background */}
                <div
                  className={`p-3.5 rounded-2xl border transition-all duration-300 text-right ${
                    popupBgDismissed
                      ? 'bg-[#141F16]/90 border-emerald-500/50 shadow-[0_2px_14px_rgba(16,185,129,0.1)]'
                      : 'bg-[#15110B] border-[#C8A24A]/30 hover:border-[#E6C66E]/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          popupBgDismissed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#D4AF37]/15 text-[#E6C66E]'
                        }`}
                      >
                        <Sparkles size={16} />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-extrabold text-[#FFF9E6]">
                            2. النوافذ أثناء التشغيل في الخلفية (Display popup in background)
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              popupBgDismissed
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {popupBgDismissed ? 'مفعّل ✓' : 'مطلوب للخلفية'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#C4B998] leading-relaxed">
                          يضمن انبثاق التنبيه الملكي وصدح الأذان حتى لو كنت خارج التطبيق أو تتصفح تطبيقات أخرى كواتساب.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleTogglePopupBg}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 active:scale-95 cursor-pointer ${
                          popupBgDismissed
                            ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/80'
                            : 'bg-gradient-to-r from-[#D4AF37] to-[#B88A2D] text-[#070605] font-black hover:brightness-110 shadow'
                        }`}
                      >
                        {popupBgDismissed ? (
                          <>
                            <CheckCircle2 size={12} />
                            <span>مفعّل</span>
                          </>
                        ) : (
                          <>
                            <span>فتح الضبط</span>
                            <ExternalLink size={12} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Show on lock screen */}
                <div
                  className={`p-3.5 rounded-2xl border transition-all duration-300 text-right ${
                    lockScreenDismissed
                      ? 'bg-[#141F16]/90 border-emerald-500/50 shadow-[0_2px_14px_rgba(16,185,129,0.1)]'
                      : 'bg-[#15110B] border-[#C8A24A]/30 hover:border-[#E6C66E]/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          lockScreenDismissed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#D4AF37]/15 text-[#E6C66E]'
                        }`}
                      >
                        <Lock size={16} />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-extrabold text-[#FFF9E6]">
                            3. العرض على شاشة القفل (Show on lock screen)
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleToggleLockScreen}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 active:scale-95 cursor-pointer ${
                          lockScreenDismissed
                            ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/80'
                            : 'bg-gradient-to-r from-[#D4AF37] to-[#B88A2D] text-[#070605] font-black hover:brightness-110 shadow'
                        }`}
                      >
                        {lockScreenDismissed ? (
                          <>
                            <CheckCircle2 size={12} />
                            <span>مفعّل</span>
                          </>
                        ) : (
                          <>
                            <span>فتح الضبط</span>
                            <ExternalLink size={12} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. Home screen shortcuts */}
                <div
                  className={`p-3.5 rounded-2xl border transition-all duration-300 text-right ${
                    homeShortcutDismissed
                      ? 'bg-[#141F16]/90 border-emerald-500/50 shadow-[0_2px_14px_rgba(16,185,129,0.1)]'
                      : 'bg-[#15110B] border-[#C8A24A]/30 hover:border-[#E6C66E]/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          homeShortcutDismissed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#D4AF37]/15 text-[#E6C66E]'
                        }`}
                      >
                        <Smartphone size={16} />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-extrabold text-[#FFF9E6]">
                            4. اختصارات الشاشة الرئيسية (Home screen shortcuts)
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              homeShortcutDismissed
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {homeShortcutDismissed ? 'مفعّل ✓' : 'مطلوب للوصول'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#C4B998] leading-relaxed">
                          لإضافة أيقونة أثر المستقلة وعناصر واجهة المستخدم المصغرة (Widgets) للمواقيت والأذكار.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleToggleHomeShortcut}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 active:scale-95 cursor-pointer ${
                          homeShortcutDismissed
                            ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/80'
                            : 'bg-gradient-to-r from-[#D4AF37] to-[#B88A2D] text-[#070605] font-black hover:brightness-110 shadow'
                        }`}
                      >
                        {homeShortcutDismissed ? (
                          <>
                            <CheckCircle2 size={12} />
                            <span>مفعّل</span>
                          </>
                        ) : (
                          <>
                            <span>تفعيل</span>
                            <ExternalLink size={12} />
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

              {/* Audio Autoplay Pre-warming Card */}
              <div className="p-3 rounded-xl bg-[#14110A] border border-[#C8A24A]/25 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-[#C4B998]">
                  <Volume2 size={16} className="text-[#E6C66E] shrink-0" />
                  <span>تهيئة محرك الصوت النبوي للأذان وتكبيرات الصلاة</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    AudioService.unlockAudio();
                    ReminderEngine.testSalawatReminder();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#221B0F] hover:bg-[#2D2314] text-[#E6C66E] border border-[#C8A24A]/40 text-[11px] font-bold active:scale-95"
                >
                  تجربة الصوت ♫
                </button>
              </div>
            </div>
          )}

          {/* ===================================================================
              STEP 5: INSTANT EXPERIENCE & LIVE TESTING (شاشة التجربة الفورية)
             =================================================================== */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-fadeIn text-right">
              {/* Step Header */}
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[10px] font-bold text-[#E6C66E]">
                  <Sparkles size={12} />
                  <span>التأكد والجاهزية التامة</span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#FFF9E6]">
                  التجربة الفورية لتنبيهات وأذان أثر
                </h2>
                <p className="text-xs text-[#C4B998] leading-relaxed">
                  جرّب التنبيهات وشاشة الأذان الآن للتأكد من وصولها إلى هاتفك وشاشتك المقفلة قبل بدء رحلتك اليومية.
                </p>
              </div>

              {/* Live Toast Feedback */}
              {testFeedback && (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-[#2B2110] to-[#1A140B] border border-[#E6C66E] text-[#FFF2C2] text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-lg">
                  <Sparkles size={16} className="text-[#E6C66E] shrink-0" />
                  <span>{testFeedback}</span>
                </div>
              )}

              {/* 4 Interactive Live Test Suite Buttons */}
              <div className="space-y-2.5">
                {/* 1. Test Notification Now */}
                <div className="p-3.5 rounded-2xl bg-[#14110A] border border-[#C8A24A]/30 flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-xs sm:text-[13px] font-extrabold text-[#FFF9E6]">
                      ١. تجربة إشعار فوري في درج الإشعارات
                    </h4>
                    <p className="text-[11px] text-[#A69977]">
                      يرسل إشعاراً فورياً برأس الشاشة لتجربة الصوت والاهتزاز
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestNotificationNow}
                    className="min-h-[42px] py-2 px-3.5 rounded-xl bg-[#221B0F] hover:bg-[#2D2314] text-[#E6C66E] border border-[#C8A24A]/50 text-xs font-extrabold flex items-center gap-1.5 active:scale-95 shrink-0"
                  >
                    <Bell size={14} />
                    <span>تجربة فورية</span>
                  </button>
                </div>

                {/* 2. Test Notification in 5s */}
                <div className="p-3.5 rounded-2xl bg-[#14110A] border border-[#C8A24A]/30 flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-xs sm:text-[13px] font-extrabold text-[#FFF9E6]">
                      ٢. تجربة إشعار بعد ٥ ثوانٍ (مع قفل الشاشة)
                    </h4>
                    <p className="text-[11px] text-[#A69977]">
                      اضغط ثم اقفل شاشة هاتفك لتشاهد التنبيه على شاشة القفل
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestNotificationIn5s}
                    disabled={testCountdownNotif > 0}
                    className="min-h-[42px] py-2 px-3.5 rounded-xl bg-[#221B0F] hover:bg-[#2D2314] text-[#E6C66E] border border-[#C8A24A]/50 text-xs font-extrabold flex items-center gap-1.5 active:scale-95 shrink-0 disabled:opacity-50"
                  >
                    <Clock size={14} />
                    <span>
                      {testCountdownNotif > 0 ? `${testCountdownNotif}ث (اقفل الشاشة)` : 'بعد ٥ ثوانٍ'}
                    </span>
                  </button>
                </div>

                {/* 3. Test Athan Overlay Now */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#20180F] via-[#14110A] to-[#0D0B08] border border-[#E6C66E]/70 flex items-center justify-between gap-3 shadow-md">
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-xs sm:text-[13px] font-extrabold text-[#FFF9E6]">
                      ٣. تجربة شاشة الأذان الملكية الفورية
                    </h4>
                    <p className="text-[11px] text-[#C4B998]">
                      تطلق شاشة الأذان السينمائية بملء الشاشة مع الترديد والصوت
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestAthanNow}
                    className="min-h-[42px] py-2 px-3.5 rounded-xl bg-gradient-to-r from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] text-[#070605] text-xs font-extrabold flex items-center gap-2 shadow-md hover:brightness-110 active:scale-95 shrink-0"
                  >
                    <Volume2 size={14} />
                    <span>إطلاق الأذان الآن</span>
                  </button>
                </div>

                {/* 4. Test Athan Overlay in 5s */}
                <div className="p-3.5 rounded-2xl bg-[#14110A] border border-[#C8A24A]/30 flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-xs sm:text-[13px] font-extrabold text-[#FFF9E6]">
                      ٤. تجربة الأذان بعد ٥ ثوانٍ (فوق أي تطبيق)
                    </h4>
                    <p className="text-[11px] text-[#A69977]">
                      اضغط ثم اخرج لأي تطبيق آخر لمشاهدة انبثاق الأذان فوقه
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestAthanIn5s}
                    disabled={testCountdownAthan > 0}
                    className="min-h-[42px] py-2 px-3.5 rounded-xl bg-[#221B0F] hover:bg-[#2D2314] text-[#E6C66E] border border-[#C8A24A]/50 text-xs font-extrabold flex items-center gap-1.5 active:scale-95 shrink-0 disabled:opacity-50"
                  >
                    <Play size={14} />
                    <span>
                      {testCountdownAthan > 0 ? `${testCountdownAthan}ث (اخرج للتجربة)` : 'بعد ٥ ثوانٍ'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Ready Assurance Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-l from-[#1D170C] via-[#141008] to-[#0A0805] border border-[#D4AF37]/40 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2D2210] border border-[#E6C66E] flex items-center justify-center text-[#E6C66E] shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div className="text-right">
                  <h4 className="text-xs font-extrabold text-[#FFF2C2]">
                    أنت الآن جاهز بالكامل لرحاب «أَثَرُ»
                  </h4>
                  <p className="text-[11px] text-[#A69977] leading-relaxed">
                    جميع بياناتك وأورادك محفوظة على هاتفك بخصوصية تامة وبدون أي إعلانات.
                  </p>
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
                className="flex-1 min-h-[48px] py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] hover:brightness-110 text-[#070605] font-extrabold text-xs sm:text-sm shadow-[0_8px_28px_rgba(230,198,110,0.42)] border border-[#FFF9E2] active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles size={17} fill="currentColor" />
                <span>بدء رحلة أثر المباركة</span>
                <ChevronLeft size={17} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
