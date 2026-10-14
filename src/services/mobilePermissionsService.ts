import { LocalNotifications } from '@capacitor/local-notifications';
import { StorageService } from './storageService';
import { NativePermissionsBridge, ATHAR_PACKAGE_NAME } from './nativePermissionsBridge';

export interface MobilePermissionItem {
  id:
    | 'notifications'
    | 'location'
    | 'audio_autoplay'
    | 'battery_optimization'
    | 'display_over_apps'
    | 'exact_alarms'
    | 'lock_screen'
    | 'background_autostart'
    | 'home_screen_shortcut';
  titleArabic: string;
  subtitleArabic: string;
  isCritical: boolean;
  isGranted: boolean;
  canRequestDirectly: boolean;
}

export type PhoneManufacturer =
  | 'samsung'
  | 'xiaomi'
  | 'huawei'
  | 'oppo_realme'
  | 'pixel_stock'
  | 'other';

export interface ManufacturerGuide {
  id: PhoneManufacturer;
  nameArabic: string;
  iconName: string;
  steps: string[];
  tipsArabic: string;
}

export const PHONE_MANUFACTURERS_GUIDES: ManufacturerGuide[] = [
  {
    id: 'xiaomi',
    nameArabic: 'شاومي / ريدمي / بوكو (Xiaomi & HyperOS)',
    iconName: 'Smartphone',
    steps: [
      'الذهاب إلى «الضبط / الإعدادات» > «التطبيقات» > «إدارة التطبيقات» > ابحث عن تطبيق «أثر».',
      'تفعيل «التشغيل التلقائي (Autostart)» للسماح للتطبيق بالعمل في الخلفية.',
      'الدخول إلى «أذونات أخرى (Other Permissions)» وتفعيل: «عرض نوافذ منبثقة أثناء التشغيل في الخلفية»، «عرض على شاشة القفل»، و«نوافذ منبثقة».',
      'الدخول إلى «موفر البطارية» واختيار «بلا قيود (No restrictions)».',
    ],
    tipsArabic: 'هذه الخطوات تضمن انطلاق الأذان التلقائي فوراً حتى لو الهاتف مقفل لساعات.',
  },
  {
    id: 'samsung',
    nameArabic: 'سامسونج (Samsung One UI)',
    iconName: 'Smartphone',
    steps: [
      'افتح «الضبط» > «التطبيقات» > «أثر» > «البطارية».',
      'اختر «غير مقيّد (Unrestricted)» بدلاً من محسّن.',
      'ارجع لصفحة التطبيق > «الظهور في الأعلى (Appear on top)» > تفعيل «مسموح».',
      'في قسم «الإشعارات»، تأكد من تفعيل «السماح بالإشعارات» و«السماح على شاشة القفل» و«إظهار كنافذة منبثقة».',
    ],
    tipsArabic: 'تضمن عدم وضع تطبيق أثر في وضع السكون العميق (Deep Sleeping Apps).',
  },
  {
    id: 'huawei',
    nameArabic: 'هواوي / هونر (Huawei & Honor)',
    iconName: 'Smartphone',
    steps: [
      'الضبط > «البطارية» > «تشغيل التطبيقات (App Launch)».',
      'ابحث عن تطبيق «أثر» وقم بإلغاء التبديل التلقائي إلى «إدارة يدوية».',
      'فعّل كل من: «التشغيل التلقائي»، «التشغيل الثانوي»، و«التشغيل في الخلفية».',
      'الضبط > «التطبيقات» > «الوصول الخاص» > «تجاهل تحسين البطارية» > السماح لتطبيق أثر.',
    ],
    tipsArabic: 'ضروري لمنع واجهة EMUI من إنهاء تنبيهات الصلاة عند قفل الشاشة.',
  },
  {
    id: 'oppo_realme',
    nameArabic: 'أوبو / ريلمي / ون بلس (Oppo & Realme & OnePlus)',
    iconName: 'Smartphone',
    steps: [
      'الضبط > «إدارة التطبيقات» > «أثر» > «استخدام البطارية».',
      'تفعيل «السماح بالنشاط في الخلفية» و«السماح بالتشغيل التلقائي».',
      'الدخول إلى «النوافذ العائمة (Floating Windows)» وتفعيل الإذن لتطبيق أثر.',
      'في الإشعارات: تفعيل «عرض الشعار المنبثق» و«العرض على شاشة القفل».',
    ],
    tipsArabic: 'يمنع نظام ColorOS من كتم التنبيهات المنبثقة.',
  },
  {
    id: 'pixel_stock',
    nameArabic: 'جوجل بكسل وهواتف أندرويد الخام (Stock Android)',
    iconName: 'Smartphone',
    steps: [
      'الإعدادات > «التطبيقات» > «أثر» > «البطارية» > اختيار «غير مقيّد (Unrestricted)».',
      'الإعدادات > «التطبيقات» > «الوصول الخاص للتطبيقات» > «الظهور فوق التطبيقات الأخرى» > تفعيل أثر.',
      'الإشعارات > تفعيل «جميع إشعارات أثر» والسماح بالتجاوز في وضع عدم الإزعاج إن رغبت.',
    ],
    tipsArabic: 'إعداد قياسي يضمن دقة مواقيت الأذان دقيقة بدقيقة دون أي تأخير.',
  },
  {
    id: 'other',
    nameArabic: 'أجهزة أندرويد وهواتف أخرى (Vivo, Motorola, etc.)',
    iconName: 'Smartphone',
    steps: [
      'افتح إعدادات الهاتف > التطبيقات > تطبيق «أثر».',
      'تحسين البطارية > ضبط على «غير مقيد / بدون قيود».',
      'الأذونات الخاصة > تفعيل «الظهور فوق التطبيقات» و«العرض على شاشة القفل».',
      'تفعيل «التشغيل التلقائي في الخلفية» والتأكد من تثبيت اختصار التطبيق.',
    ],
    tipsArabic: 'يمنع نظام أندرويد من تقييد الموقتات والتنبيهات المجدولة.',
  },
];

class MobilePermissionsManager {
  private deferredInstallPrompt: any = null;
  private wakeLockSentinel: any = null;

  constructor() {
    this.initPwaInstallListener();
  }

  private initPwaInstallListener(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      window.dispatchEvent(new CustomEvent('athar_pwa_installable'));
    });
  }

  public isPwaInstallable(): boolean {
    return Boolean(this.deferredInstallPrompt);
  }

  public isRunningAsInstalledApp(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  public async promptInstallToHomeScreen(): Promise<boolean> {
    if (!this.deferredInstallPrompt) {
      return false;
    }
    try {
      this.deferredInstallPrompt.prompt();
      const choice = await this.deferredInstallPrompt.userChoice;
      this.deferredInstallPrompt = null;
      return choice.outcome === 'accepted';
    } catch {
      return false;
    }
  }

  public detectManufacturer(): PhoneManufacturer {
    if (typeof navigator === 'undefined') return 'pixel_stock';
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('samsung') || ua.includes('sm-')) return 'samsung';
    if (ua.includes('xiaomi') || ua.includes('redmi') || ua.includes('poco') || ua.includes('miui'))
      return 'xiaomi';
    if (ua.includes('huawei') || ua.includes('honor')) return 'huawei';
    if (ua.includes('oppo') || ua.includes('realme') || ua.includes('oneplus')) return 'oppo_realme';
    return 'pixel_stock';
  }

  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined') return 'default';

    // 1. Check and request via Capacitor LocalNotifications if in Native container
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display === 'granted') {
          await LocalNotifications.createChannel({
            id: 'athar_main_channel',
            name: 'تنبيهات أثر الملكية (أذان وقرآن)',
            description: 'قناة التنبيهات ذات الأولوية القصوى للأذان والمواقيت',
            importance: 5,
            visibility: 1,
            sound: 'default',
            vibration: true,
          });
        }
      }
    } catch {}

    // 2. Request standard browser/PWA notification permission
    if ('Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        return result;
      } catch {
        return 'default';
      }
    }
    return 'default';
  }

  public async acquireScreenWakeLock(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return false;
    try {
      this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      return true;
    } catch {
      return false;
    }
  }

  public releaseScreenWakeLock(): void {
    if (this.wakeLockSentinel) {
      try {
        this.wakeLockSentinel.release();
      } catch {}
      this.wakeLockSentinel = null;
    }
  }

  /**
   * Dispatches an authentic outside-app pop-up notification with a 3-second delay,
   * allowing the user to minimize the app, switch to another app, or lock the phone
   * to immediately verify that notifications and pop-ups appear outside the app on their device!
   */
  public async testOutsideAppNotification(delaySeconds: number = 3): Promise<void> {
    const notifyTime = new Date(Date.now() + delaySeconds * 1000);

    // 1. Native Capacitor Channel
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 1000000),
            title: '🕌 حان الآن موعد أذان العصر (تجربة خارج التطبيق)',
            body: 'الله أكبر الله أكبر · حي على الصلاة، حي على الفلاح',
            schedule: { at: notifyTime },
            channelId: 'athar_main_channel',
            actionTypeId: '',
            sound: 'default',
            extra: {
              type: 'prayer',
            },
          },
        ],
      });
    } catch {}

    // 2. Service Worker showNotification outside app
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      setTimeout(() => {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg && typeof reg.showNotification === 'function') {
            reg.showNotification('🕌 أثر | تنبيه الأذان المنبثق خارج التطبيق', {
              body: 'هكذا يظهر الأذان والتنبيه فوق الشاشة وخارج التطبيق وعلى شاشة القفل بنجاح ✓',
              icon: '/athar-royal-icon.jpg',
              badge: '/icon.svg',
              dir: 'rtl',
              lang: 'ar',
              tag: `athar-outside-test-${Date.now()}`,
              renotify: true,
              requireInteraction: true,
              vibrate: [300, 100, 300, 100, 400],
              data: { url: '/' },
            } as any);
          }
        });
      }, delaySeconds * 1000);
    }
  }

  /**
   * Opens the real Android system setting for 'Display over other apps' (ACTION_MANAGE_OVERLAY_PERMISSION)
   * targeting com.athar.app directly.
   */
  public async openOverlayPermissionSettings(): Promise<boolean> {
    return NativePermissionsBridge.openOverlayPermissionSettings();
  }

  public async checkOverlayPermission(): Promise<boolean> {
    return NativePermissionsBridge.checkOverlayPermission();
  }

  /**
   * Opens the real Android system setting for 'Schedule Exact Alarms' (ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
   * targeting com.athar.app directly.
   */
  public async openExactAlarmSettings(): Promise<boolean> {
    return NativePermissionsBridge.openExactAlarmSettings();
  }

  public async checkExactAlarmPermission(): Promise<boolean> {
    return NativePermissionsBridge.checkExactAlarmPermission();
  }

  /**
   * Opens the real Android system setting for Unrestricted Battery / Ignore Battery Optimizations
   */
  public async openBatteryOptimizationSettings(): Promise<boolean> {
    return NativePermissionsBridge.openBatteryOptimizationSettings();
  }

  public async checkBatteryOptimizationIgnored(): Promise<boolean> {
    return NativePermissionsBridge.checkBatteryOptimizationIgnored();
  }

  public async startBackgroundForegroundService(): Promise<boolean> {
    return NativePermissionsBridge.startBackgroundForegroundService();
  }

  public async stopBackgroundForegroundService(): Promise<boolean> {
    return NativePermissionsBridge.stopBackgroundForegroundService();
  }

  /**
   * Opens the real Android system App Details settings screen for com.athar.app
   */
  public async openAppSettings(): Promise<boolean> {
    return NativePermissionsBridge.openAppSettings();
  }
}

export const MobilePermissionsService = new MobilePermissionsManager();
