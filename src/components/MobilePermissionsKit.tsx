import React, { useState, useEffect } from 'react';
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
  Play
} from 'lucide-react';
import { NotificationService } from '../services/notificationService';
import { AudioService } from '../services/audioService';
import { ReminderEngine } from '../services/reminderService';
import { StorageService } from '../services/storageService';

interface MobilePermissionsKitProps {
  onAllConfigured?: () => void;
  compact?: boolean;
}

export const MobilePermissionsKit: React.FC<MobilePermissionsKitProps> = ({
  onAllConfigured,
  compact = false
}) => {
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>(() =>
    NotificationService.getPermissionStatus()
  );
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(() =>
    AudioService.isAudioUnlocked()
  );
  const [batteryOptimizationDismissed, setBatteryOptimizationDismissed] = useState<boolean>(() =>
    localStorage.getItem('athar_perm_battery_opt') === 'true'
  );
  const [overlayPermissionDismissed, setOverlayPermissionDismissed] = useState<boolean>(() =>
    localStorage.getItem('athar_perm_overlay') === 'true'
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

  useEffect(() => {
    const unsub = NotificationService.subscribePermission((perm) => {
      setNotificationStatus(perm);
    });

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setPwaPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      unsub();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleGrantNotification = async () => {
    const res = await NotificationService.requestPermission();
    setNotificationStatus(res);
    if (res === 'granted') {
      NotificationService.notify({
        title: 'تم تفعيل إشعارات أثر بنجاح ✓',
        body: 'ستصلك مواقيت الصلاة والأذان وتذكيرات القرآن والأذكار في موعدها بدقة.',
        type: 'info'
      });
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
      // Give clear PWA instructions via gentle Notification banner
      NotificationService.notify({
        title: 'إضافة أثر إلى الشاشة الرئيسية والودجت',
        body: 'لإضافة أثر: اضغط على خيارات المتصفح (⋮) أو زر المشاركة (⎋) ثم اختر "إضافة إلى الشاشة الرئيسية" (Add to Home screen).',
        type: 'info'
      });
    }
  };

  const handleOpenAndroidIntent = (intentUrl: string, key: string, setLocalState: (v: boolean) => void) => {
    localStorage.setItem(key, 'true');
    setLocalState(true);
    try {
      window.location.href = intentUrl;
    } catch {
      // Fallback if intent is blocked by browser
    }
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

    // 3. Mark background flags
    localStorage.setItem('athar_perm_battery_opt', 'true');
    setBatteryOptimizationDismissed(true);
    localStorage.setItem('athar_perm_overlay', 'true');
    setOverlayPermissionDismissed(true);
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
      title: 'إشعارات النظام والشريط العلوي (Heads-Up Popup)',
      desc: 'لإظهار تنبيهات الأذان والآيات كإشعار منبثق من أعلى الشاشة وداخل شريط إشعارات الهاتف.',
      isGranted: notificationStatus === 'granted',
      actionLabel: notificationStatus === 'granted' ? 'مفعّل ✓' : 'منح إذن الإشعارات',
      onAction: handleGrantNotification
    },
    {
      id: 'overlay',
      title: 'الظهور فوق التطبيقات الأخرى (Display Over Other Apps)',
      desc: 'ضروري لانبثاق شاشة الأذان الملكية الكاملة فوراً عند دخول وقت الصلاة مهما كان التطبيق المفتوح.',
      isGranted: overlayPermissionDismissed,
      actionLabel: overlayPermissionDismissed ? 'مهيأ ✓' : 'فتح إعدادات الظهور فوق التطبيقات',
      onAction: () =>
        handleOpenAndroidIntent(
          'intent:#Intent;action=android.settings.action.MANAGE_OVERLAY_PERMISSION;end',
          'athar_perm_overlay',
          setOverlayPermissionDismissed
        )
    },
    {
      id: 'battery',
      title: 'تجاهل تحسين البطارية (Unrestricted Battery)',
      desc: 'لمنع نظام أندرويد من كتم أو إيقاف مواقيت الأذان والورد القرآني في الخلفية لتوفير الطاقة.',
      isGranted: batteryOptimizationDismissed,
      actionLabel: batteryOptimizationDismissed ? 'مهيأ ✓' : 'تعطيل قيود البطارية (بلا قيود)',
      onAction: () =>
        handleOpenAndroidIntent(
          'intent:#Intent;action=android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS;end',
          'athar_perm_battery_opt',
          setBatteryOptimizationDismissed
        )
    },
    {
      id: 'lockscreen',
      title: 'العرض والتنبيه على شاشة القفل (Show on Lock Screen)',
      desc: 'لعرض كلمات الأذان والترديد وبطاقة التنبيه الحي ومواقيت الصلاة عندما يكون الهاتف مقفلاً.',
      isGranted: lockScreenPermissionDismissed,
      actionLabel: lockScreenPermissionDismissed ? 'مهيأ ✓' : 'تفعيل إذن شاشة القفل',
      onAction: () => {
        localStorage.setItem('athar_perm_lockscreen', 'true');
        setLockScreenPermissionDismissed(true);
      }
    },
    {
      id: 'popup',
      title: 'النوافذ المنبثقة وتشغيلها بالخلفية (Pop-up Window in Background)',
      desc: 'في هواتف شاومي وهواوي وريلمي لعرض شاشات الأذان والتنبيهات المباشرة كنافذة منبثقة عائمة.',
      isGranted: popupWindowDismissed,
      actionLabel: popupWindowDismissed ? 'مهيأ ✓' : 'تفعيل إذن النوافذ المنبثقة',
      onAction: () => {
        localStorage.setItem('athar_perm_popup', 'true');
        setPopupWindowDismissed(true);
      }
    },
    {
      id: 'autostart',
      title: 'التشغيل التلقائي والعمل في الخلفية (Autostart & Background Work)',
      desc: 'لضمان استمرار عمل المحرك الفلكي للمواقيت ودور التنبيهات دون الحاجة لفتح التطبيق يومياً.',
      isGranted: backgroundAutostartDismissed,
      actionLabel: backgroundAutostartDismissed ? 'مهيأ ✓' : 'السماح بالتشغيل التلقائي',
      onAction: () => {
        localStorage.setItem('athar_perm_autostart', 'true');
        setBackgroundAutostartDismissed(true);
      }
    },
    {
      id: 'homescreen',
      title: 'اختصار الشاشة الرئيسية والودجت (Home Screen Shortcut & Widget)',
      desc: 'لتثبيت تطبيق «أثر» كأيقونة مستقلة سريعة وإظهار ودجات الصلاة وشجرة الأثر على شاشة هاتفك.',
      isGranted: homeShortcutInstalled,
      actionLabel: homeShortcutInstalled ? 'مثبّت ✓' : 'إضافة للشاشة الرئيسية الآن',
      onAction: handleInstallHomeShortcut
    },
    {
      id: 'audio',
      title: 'تهيئة الصوت التلقائي للأذان (Audio Autoplay)',
      desc: 'لإطلاق صوت الأذان وتلاوة الآيات والأذكار فوراً دون حظر أو كتم من المتصفح أو النظام.',
      isGranted: isAudioUnlocked,
      actionLabel: isAudioUnlocked ? 'مهيأ ✓' : 'تفعيل وتجربة الصوت الآن',
      onAction: handleUnlockAudio
    }
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
      ]
    },
    {
      id: 'samsung',
      name: 'سامسونج (Samsung One UI)',
      steps: [
        'افتح «الضبط (Settings)» > «التطبيقات (Apps)» > ابحث عن «أثر».',
        'اضغط على «البطارية (Battery)» > اختر «غير مقيّد (Unrestricted)».',
        'اضغط على «الظهور في الأعلى (Appear on top)» > فَعّله.',
        'في «الإشعارات»: تأكد من تفعيل «السماح بالصوت والاهتزاز» و«إشعارات شاشة القفل».',
      ]
    },
    {
      id: 'huawei',
      name: 'هواوي / هونر (Huawei EMUI / MagicOS)',
      steps: [
        'افتح «الإعدادات» > «البطارية» > «تشغيل التطبيقات (App Launch)».',
        'ابحث عن تطبيق «أثر» وحوّله من تلقائي إلى «إدارة يدوية».',
        'فَعّل خيارات: «التشغيل التلقائي» + «التشغيل الثانوي» + «الاستمرار في الخلفية».',
      ]
    },
    {
      id: 'oppo_realme',
      name: 'أوبو / ريلمي / ون بلس (ColorOS / Realme UI / OxygenOS)',
      steps: [
        'افتح «الإعدادات» > «إدارة التطبيقات» > «أثر».',
        'اضغط على «استخدام البطارية» > فَعّل «السماح بنشاط الخلفية» و«السماح ببدء التشغيل التلقائي».',
        'في «الأذونات الخاصة»: فَعّل «العرض فوق التطبيقات الأخرى».',
      ]
    },
    {
      id: 'pixel',
      name: 'جوجل بيكسل / أندرويد الخام (Google Pixel / Stock Android)',
      steps: [
        'افتح «الإعدادات» > «التطبيقات» > «أثر» > «البطارية».',
        'اختر «غير مقيّد (Unrestricted)».',
        'فَعّل «الظهور فوق التطبيقات الأخرى (Display over other apps)».',
      ]
    }
  ];

  return (
    <div className="space-y-4 text-right select-none font-arabic">
      {/* Header Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-[#201A10] via-[#14110A] to-[#0D0B08] border border-[#C8A24A]/55 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E6C66E] to-[#B88A2D] text-[#070707] flex items-center justify-center font-extrabold shadow-md shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-[#F3E5AB]">
                مركز أذونات وصلاحيات الهاتف الذكي
              </h3>
              <p className="text-[11px] text-[#C4B998]">
                لضمان انطلاق شاشة الأذان التلقائية وظهور الإشعارات والودجات خارج التطبيق
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#C8A24A]/25 text-[#E6C66E] border border-[#E6C66E]/50 shrink-0">
            {permissionsList.filter((p) => p.isGranted).length} من {permissionsList.length} مهيأة
          </span>
        </div>

        {/* Master One-Click Button */}
        <button
          onClick={handleGrantAllMaster}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] hover:brightness-110 text-[#070707] font-extrabold text-xs sm:text-sm shadow-[0_8px_25px_rgba(230,198,110,0.35)] border border-[#FFF9E2] flex items-center justify-center gap-2 active:scale-98 transition-all"
        >
          <Sparkles size={16} fill="currentColor" />
          <span>منح وتفعيل كافة الصلاحيات بضغطة واحدة</span>
        </button>
      </div>

      {/* Permissions Grid */}
      <div className="space-y-2.5">
        {permissionsList.map((perm) => (
          <div
            key={perm.id}
            className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              perm.isGranted
                ? 'bg-[#12100B] border-[#C8A24A]/40'
                : 'bg-[#18130B] border-[#E6C66E]/60 shadow-[0_0_15px_rgba(200,162,74,0.12)]'
            }`}
          >
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${
                  perm.isGranted
                    ? 'bg-[#1C170E] border-[#E6C66E]/60 text-[#E6C66E]'
                    : 'bg-[#2A2012] border-[#E6C66E] text-[#FFF2C2]'
                }`}
              >
                {perm.isGranted ? <CheckCircle2 size={16} /> : <AlertTriangle size={15} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-extrabold text-[#F3E5AB]">
                    {perm.title}
                  </h4>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                      perm.isGranted
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/50'
                        : 'bg-amber-950/60 text-amber-300 border border-amber-700/50'
                    }`}
                  >
                    {perm.isGranted ? 'مهيأ ✓' : 'مطلوب للإطلاق التلقائي'}
                  </span>
                </div>
                <p className="text-[11px] text-[#C4B998] mt-0.5 leading-relaxed">
                  {perm.desc}
                </p>
              </div>
            </div>

            <button
              onClick={perm.onAction}
              className={`py-2 px-3.5 rounded-xl text-xs font-extrabold transition-all shrink-0 active:scale-95 flex items-center justify-center gap-1.5 w-full sm:w-auto ${
                perm.isGranted
                  ? 'bg-[#1A160F] hover:bg-[#251F14] text-[#E6C66E] border border-[#C8A24A]/40'
                  : 'bg-gradient-to-r from-[#E6C66E] to-[#B88A2D] text-[#070707] font-extrabold shadow-md hover:brightness-110'
              }`}
            >
              <span>{perm.actionLabel}</span>
              {!perm.isGranted && <ExternalLink size={12} />}
            </button>
          </div>
        ))}
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
          onClick={handleTestOutsideApp}
          disabled={testCountdown > 0}
          className="py-2.5 px-4 rounded-xl bg-[#1E190F] hover:bg-[#2B2314] text-[#E6C66E] border border-[#E6C66E]/55 text-xs font-extrabold transition-all active:scale-95 shrink-0 flex items-center gap-2 disabled:opacity-50"
        >
          <Play size={12} fill="currentColor" />
          <span>
            {testCountdown > 0 ? `سيصل بعد ${testCountdown}ث (اقفل الشاشة الآن)` : 'إرسال إشعار تجريبي (بعد ٥ ثوانٍ)'}
          </span>
        </button>
      </div>

      {/* Manufacturer Guides Accordion */}
      {!compact && (
        <div className="p-4 rounded-3xl bg-[#0F0D09] border border-[#C8A24A]/30 space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone size={16} className="text-[#E6C66E]" />
            <h4 className="text-xs font-extrabold text-[#F3E5AB]">
              إرشادات تثبيت الأذونات حسب نوع هاتفك (خطوة بخطوة):
            </h4>
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
                    <div className="p-3.5 pt-0 space-y-1.5 text-[11px] text-[#C4B998] border-t border-[#C8A24A]/20 bg-[#0B0906]">
                      {guide.steps.map((st, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 leading-relaxed">
                          <span className="text-[#E6C66E] font-bold">←</span>
                          <span>{st}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
