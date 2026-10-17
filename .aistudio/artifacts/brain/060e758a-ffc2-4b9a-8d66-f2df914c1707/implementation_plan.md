# خطة تعزيز الإشعارات الملكية واستمرارية الخلفية (Background Persistence & Deep Links)

خطة تنفيذية متكاملة لضمان بقاء محرك أثر يعمل بدقة مطلقة في الخلفية حتى بعد إغلاق التطبيق قسرياً، وتفعيل الربط الشامل عبر Android Intents والروابط العميقة لفتح شاشة الأذان الملكية بشكل فوري ومؤكد 100% عند لمس الإشعار.

---

## 1. ملخص المشكلة والمتطلبات الهندسية

1. **الربط المؤكد 100% عند لمس الإشعار (Android Intents & Deep Links):**
   - عندما ينقر المستخدم على إشعار الأذان أثناء قفل الشاشة أو في شريط الإشعارات، يجب أن تستيقظ واجهة التطبيق فوراً وتُفتح شاشة الأذان الملكية (`AdhanRingingModal`) دون أي تأخير أو فقدان للحدث.
   - معالجة حالات التشغيل على البارد (Cold Launch): قراءة المتغيرات المعلقة (`getPendingIncomingAthan` و `getPendingDeepLink` و `__athar_pending_athan`) فور اكتمال تحميل واجهة React.
   - الاستماع التلقائي لأحداث `@capacitor/local-notifications` عبر `localNotificationActionPerformed`.

2. **استمرارية الخلفية والجدولة الدقيقة (Background Persistence via AlarmManager):**
   - جدولة دقيقة لكافة مواقيت الصلوات الخمس لـ 48 ساعة قادمة بالاعتماد على `AlarmManager.setAlarmClock` و `setExactAndAllowWhileIdle` مع `RTC_WAKEUP`.
   - استمرار خدمة `AthanForegroundService` و `OngoingPrayerNotificationService` مع `MediaPlayback` / `DataSync` لحماية التطبيق من الإيقاف بواسطة مدخرات الطاقة.
   - إعادة الجدولة التلقائية فور إعادة تشغيل الجهاز (`BOOT_COMPLETED`) أو تحديث التطبيق عبر `AtharBootReceiver`.

---

## 2. المعمارية وتدفق البيانات (System Flow Diagram)

```
┌─────────────────────────────────────────────────────────────┐
│                 AlarmManager (Android OS)                   │
│   (setAlarmClock / setExactAndAllowWhileIdle with WAKEUP)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ حان وقت الصلاة
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 AtharPrayerAlarmReceiver                    │
│   - إيقاظ الجهاز عبر WakeLock (Screen & CPU)               │
│   - تشغيل AthanForegroundService بنوع MediaPlayback          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
┌──────────────────────────────┐ ┌───────────────────────────┐
│     AthanForegroundService   │ │    FullScreen Intent      │
│ - تشغيل الأذان في الخلفية    │ │ - إظهار الشاشة فوق القفل  │
│ - إشعار Priority: MAX        │ │ - MainActivity (Intent)   │
└──────────────┬───────────────┘ └─────────────┬─────────────┘
               │                               │
               └───────────────┬───────────────┘
                               │ عند اللمس أو التشغيل
                               ▼
┌─────────────────────────────────────────────────────────────┐
│       MainActivity (Java) ➔ React Bridge / Events           │
│   - window.__athar_pending_athan                            │
│   - AtharNative.getPendingIncomingAthan()                   │
│   - LocalNotifications.localNotificationActionPerformed     │
│   - CustomEvent('athar_incoming_athan')                     │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 AdhanRingingModal.tsx                       │
│  (فتح الشاشة الملكية فوراً بنسبة 100% مع تشغيل الأذان)      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. خطة العمل المباشرة

### المرحلة 1: معالجة الإشعارات والروابط العميقة في React (`App.tsx` & `NativeNotificationService`)
- إضافة فحص استباقي في `App.tsx` عند بدء التطبيق (`useEffect`) للتحقق من:
  - `(window as any).AtharNative?.getPendingIncomingAthan()`
  - `(window as any).AtharNative?.getPendingDeepLink()`
  - `(window as any).__athar_pending_athan`
  - معاملات الرابط `window.location.search` (`launch_royal_adhan` أو `prayer`).
- تسجيل مستمع `LocalNotifications.addListener('localNotificationActionPerformed')` لتوجيه المستخدم فورياً إلى الشاشة الملكية.
- ربط `NativeNotificationService` بمحرك التنبيهات الفعلي لضمان تماسك الجدولة.

### المرحلة 2: ضبط الروابط في Android Native (`MainActivity.java` & `AthanForegroundService.kt`)
- تعزيز `PendingIntent` ليكون `FLAG_UPDATE_CURRENT` مع `FLAG_IMMUTABLE` واستخدام `FLAG_ACTIVITY_NEW_TASK or FLAG_ACTIVITY_CLEAR_TOP or FLAG_ACTIVITY_SINGLE_TOP`.
- إضافة معرف Intent فريد ومحدد `com.athar.islamic.ACTION_ATHAN_FULLSCREEN` مع تمرير اسم الصلاة وبيانات الأذان كاملة.
- التأكد من إيقاظ الشاشة (`FLAG_SHOW_WHEN_LOCKED` و `FLAG_TURN_SCREEN_ON`).

### المرحلة 3: الجدولة المنيعة عبر AlarmManager (`AtharPrayerAlarmScheduler.kt` & `reminderService.ts`)
- استدعاء `NativePermissionsBridge.scheduleNativePrayerAlarms` بعد كل حساب أو تحديث لمواقيت الصلاة، وجدولة الأذان القادم لليوم والغد بأكواد طلب فريدة ومحمية.
- إبقاء `AtharBootReceiver` جاهزاً لإعادة الجدولة فور تشغيل الجهاز دون الحاجة لفتح التطبيق يدوياً.

### المرحلة 4: التحقق والاختبار
- فحص البناء التراكمي `compile_applet`.
- فحص الأخطاء البرمجية والأنواع عبر `lint_applet`.
