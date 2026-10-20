# خطة تنقية وتحسين أداء تطبيق "أثر" (Athar Code Audit & Performance Optimization)

خطة متكاملة لتنقية الكود المصدري، استئصال الأكواد والمكونات المهجورة (Dead Code)، وتأمين دورة حياة المكونات ومراقبي الأحداث والخدمات الخلفية لمنع أي تسريب للذاكرة (Memory Leaks) في طبقتي الويب وأندرويد.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> تم استعراض المتطلبات واعتماد القرارات المحورية التالية بناءً على إجابات المستخدم في المرحلة الأولى:

- **نطاق التنظيف المعتمد**: تنظيف وتدقيق شامل لكافة الطبقات (TypeScript/React + Kotlin/Java Android) مع الحفاظ التام 100% على كافة الميزات والوظائف دون أي مساس بسلوك التطبيق الأصلي.
- **سياسة الملفات والخدمات القديمة غير النشطة**: إزالة وحذف الملفات والمكونات والخدمات المعزولة التي لا يتم استدعاؤها نهائياً لتقليص حجم الحزمة وتسريع وقت البناء والتشغيل.
- **مستوى الحماية من تسريب الذاكرة**: تدقيق شامل لكافة مستمعي الأحداث (`addEventListener` و Custom Events)، ومؤقتات المراقبة (`setInterval` / `setTimeout`)، واشتراكات الخدمات (`AudioService` / `AuthService`) في واجهة React، بالإضافة إلى تفريغ الموارد والمستشعرات و `WakeLock` و `ExoPlayer` في خدمات أندرويد الخلفية والعائمة فور انتهاء الحاجة إليها.

---

### 1. Overview & Core Concept

- **What It Does**: تدقيق برمجي عميق (Deep Code Hygiene & Memory Hardening) ينقي مشروع تطبيق "أثر" من الدوال والمكونات والخدمات والواردات غير المستخدمة، ويضمن تحرير كافة موارد النظام عند مغادرة الشاشات أو إغلاق النوافذ المنبثقة، مما يجعل التطبيق أسرع وأخف استهلاكاً للبطارية والذاكرة العشوائية (RAM).
- **Target Audience / Persona**: مستخدمو تطبيق "أثر" على مختلف الأجهزة وهواتف أندرويد بمختلف فئاتها وإصداراتها، لضمان استقرار دائم حتى في جلسات التشغيل الطويلة والخلفية.
- **Key Value**: تقليص استهلاك الذاكرة، منع حدوث تجميد أو تهنيج (ANR / Lag)، التخلص من العبء الميت في حزم الكود، وضمان موثوقية تشغيل الأذان والأذكار والخدمات العائمة.

---

### 2. User Experience & Visual Design

- **Key User Flows**: 
  - سلاسة فائقة عند التنقل بين أقسام التطبيق (القبلة، القرآن، الأذكار، الصلوات، شجرة الأثر) دون تراكم لمستمعي الأحداث في الذاكرة.
  - إغلاق سلس للخدمات العائمة والنوافذ المنبثقة (مثل أذان الشاشة الكاملة والنوافذ المساعدة) مع تحرير فوري للصوت والواجهة.
  - تجربة خلفية هادئة وخفيفة على نظام أندرويد تحافظ على عمر البطارية وتمنع التحذيرات النظامية من الاستهلاك الزائد.
- **Visual Identity & Theme**:
  - الحفاظ التام على الهوية البصرية الإسلامية الراقية لتطبيق "أثر" (Emerald / Gold / Dark Slate) دون تغيير أي عنصر تصميمي أو نمط لوني.
  - بقاء جميع الواجهات والعناصر الرسومية وحركات الميكرو-أنيميشن سليمة وتعمل بأعلى كفاءة.
- **Interactive Feedback & Motion**:
  - الحفاظ على استجابة اللمس والانتقالات الناعمة بدون أي تأخير ناتج عن استهلاك الذاكرة أو تسريب المؤقتات (Timers).

---

### 3. Key Product Decisions & Trade-Offs

- **القرار الأول: معالجة المكونات والخدمات غير المستخدمة (Dead Code Elimination)**
  - *Chosen Approach*: إزالة الملفات المهجورة المحددة بدقة والتي تأكد عدم استدعائها أو ربطها بالمسارات الفعلية للتطبيق:
    - مكونات غير مستخدمة: `AlarmRingingModal.tsx`، `IslamicAlarmModal.tsx`، `InAppNotificationBanner.tsx`، `MobilePermissionsKit.tsx`، `NotificationReadinessModal.tsx`، `PwaInstallBanner.tsx`، `RoyalFloatingAlertSheet.tsx`، `SakinaOasisCard.tsx`.
    - خدمات قديمة معوضة: `artworkService.ts`، `athanForegroundBridge.ts`، `mobilePermissionsService.ts`.
    - شاشات مكررة: `OnboardingModal.tsx` (مجرد غلاف فارغ لـ `PermissionsSetupWizard` المستدعى مباشرة في `App.tsx` و `SettingsView.tsx`).
  - *Why*: إزالة هذه الملفات يقلل حجم حزمة الجافاسكريبت، ويزيل اللبس للمطورين، ويقلل احتمالات الأخطاء غير المقصودة دون التأثير على أي ميزة ظاهرة للمستخدم.
  - *Alternatives Considered*: إبقاء الملفات مع تعليقها - تم استبعاده لاتباع إجابة المستخدم الصريحة بحذف الأكواد المهجورة نهائياً لضمان النظافة البرمجية.

- **القرار الثاني: الحماية الصارمة من تسريب الذاكرة في طبقة React (Clean Lifecycle Guarantees)**
  - *Chosen Approach*: فحص وتعديل كل دالة `useEffect` تستخدم `addEventListener` أو `setInterval` أو `setTimeout` أو اشتراكات الخدمات (مثل `AudioService.subscribe`) لضمان إرجاع دالة تنظيف (Cleanup Function) تزيل المستمع بدقة، خصوصاً في مكونات:
    - `ImpactTree.tsx`: تنظيف كافة مستمعي الأحداث الستة ومؤقتات الحركة عند الـ Unmount.
    - `SakinaAndRightsModal.tsx`: تنظيف مستمعي `athar_sakina_updated` و `athar_midnight_reset`.
    - `FullScreenAzanOverlayModal.tsx`: تنظيف مستمعي الأذان وإلغاء مؤقتات تتبع أطوار الأذان عند الإغلاق.
    - `DigitalTasbihModal.tsx` و `DailyWirdModal.tsx`: تحرير مستمعي إعادة ضبط منتصف الليل.
  - *Why*: منع تراكم مستمعي الأحداث المكررة عند فتح وإغلاق النوافذ، مما كان يسبب تكرار استدعاءات المعالجة وتضخم الذاكرة العشوائية بمرور الوقت.

- **القرار الثالث: إدارة الموارد الآمنة في خدمات أندرويد الخلفية والعائمة (Android Lifecycle & WakeLock Hygiene)**
  - *Chosen Approach*:
    - تدقيق `FullScreenAzanService.kt` و `AtharFloatingWindowService.kt`: التأكد من تحرير `ExoPlayer` / `FastAudioPlayer`، وإزالة عروض النوافذ من `WindowManager` بأمان تام داخل كتل `try-catch` لتفادي كراش `View not attached`.
    - إدارة قفل الاستيقاظ (`WakeLock`): التأكد دائماً من التحقق من `wakeLock?.isHeld == true` قبل استدعاء `release()` لتفادي استثناءات `RuntimeException: WakeLock under-locked`.
    - إيقاف المهام غير المتزامنة ومؤقتات `Handler` عبر `removeCallbacksAndMessages(null)` عند تدمير الخدمة (`onDestroy`).
  - *Why*: تجنب استنزاف بطارية الهاتف وضمان استيفاء معايير متجر Google Play للأداء والخلفية (Vitals & Battery Guidelines).

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ATHAR APPLICATION LAYERS                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   [ React UI Layer ]                                                   │
│   ┌────────────────────┐   ┌───────────────────┐   ┌─────────────────┐ │
│   │ Main Screens       │   │ Interactive Modals│   │ State Services  │ │
│   │ (Home, Quran, etc.)│   │ (Azan, Tasbih, ..)│   │ (Audio, Prayers)│ │
│   └─────────┬──────────┘   └─────────┬─────────┘   └────────┬────────┘ │
│             │                        │                      │          │
│             ▼                        ▼                      ▼          │
│      Strict Cleanup:          Safe Unmount:           Single-Instance  │
│      removeEventListener      Clear Intervals         Subscriptions &  │
│      Unsubscribe Observers    Cancel Audio Timers     State Caching    │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   [ Native Permissions Bridge & Capacitor Interface ]                  │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   [ Android Native Services Layer ]                                    │
│   ┌───────────────────────────┐     ┌────────────────────────────────┐ │
│   │ FullScreenAzanService.kt  │     │ AtharFloatingWindowService.kt  │ │
│   │ - Safe ExoPlayer Release  │     │ - Safe WindowManager Removal   │ │
│   │ - Controlled WakeLock     │     │ - Coroutine Job Cancellation   │ │
│   │ - Handler Clear on Destroy│     │ - Battery Optimization Guards  │ │
│   └───────────────────────────┘     └────────────────────────────────┘ │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

#### خطة التنفيذ المنهجية (Action Steps upon Approval):
1. **تنقية الواردات والمتغيرات غير المستخدمة في TypeScript**:
   - إزالة الاستيرادات والمصفوفات المهجورة في كافة ملفات `src/`.
2. **حذف الملفات والمكونات غير النشطة**:
   - إزالة المكونات والخدمات الميتة المعزولة المذكورة في القرار الأول.
3. **تطبيق كبسولات التنظيف (Cleanup Wrappers) لمنع تسريب الذاكرة**:
   - مراجعة وتأمين كل `useEffect` في المكونات والنوافذ المنبثقة لضمان إلغاء الاشتراكات وتحرير الموارد.
4. **تدقيق وتأمين موارد خدمات أندرويد (Kotlin/Java)**:
   - تأمين تفريغ `WakeLock` و `ExoPlayer` و `WindowManager` داخل كتل آمنة في `FullScreenAzanService` و `AtharFloatingWindowService`.
5. **التحقق الشامل من البناء والاستقرار**:
   - فحص سلامة بناء المشروع والـ Linting بنجاح (`compile_applet` و `lint_applet`) للتأكد من خلو المشروع تماماً من أي أخطاء أو كسر للوظائف.
