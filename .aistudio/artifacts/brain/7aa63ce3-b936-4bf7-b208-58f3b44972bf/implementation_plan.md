# خطة التنفيذ: تطوير نظام النوافذ العائمة التفاعلية على مستوى النظام (System-Level Floating Window) في تطبيق أَثَرُ

تهدف هذه الخطة الهندسية إلى تحويل نظام التنبيهات الملكية العائمة (Royal Alert) في تطبيق أثر (Capacitor / Android) من مجرد نافذة داخلية (In-app React Modal) إلى **نافذة نظام عائمة أصلية حقيقية (Android Native System Floating Overlay)** تظهر فوق جميع التطبيقات الخارجية (مثل فيسبوك، واتساب، متصفح الإنترنت وغيرها) دون أن تختفي عند تصغير التطبيق أو الخروج منه.

---

## 1. البنية المعمارية للنافذة العائمة (Android Native WindowManager)

### أ. نوع النافذة والخصائص (Window Layout Params):
- استخدام نوع النافذة المناسب للأجهزة الحديثة:
  - `Build.VERSION.SDK_INT >= Build.VERSION_CODES.O`: `WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY`
  - للأجهزة القديمة (Fallback): `WindowManager.LayoutParams.TYPE_PHONE`
- إعداد الـ Flags المناسبة لضمان تفاعل المستخدم وسلاسة النظام:
  - `WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE`: لتمكين المستخدم من متابعة استخدام التطبيقات الأخرى بالخلفية دون حجب لوحة المفاتيح أو التركيز.
  - `WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN`: لضمان تموضع دقيق في شاشات الحواف والـ Notch.
  - `WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED`: لإتاحة ظهور التنبيه الملكي فوق شاشة القفل عند ورود التنبيه.
- الموضع والأبعاد:
  - `gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL` (ثابتة في أعلى الشاشة كشريط ملكي أنيق، وفقاً لتفضيل المستخدم).
  - `width = WindowManager.LayoutParams.MATCH_PARENT` مع هوامش جانبية أنيقة (Padding/Margin) وتأثير طفو (Floating Card).
  - `height = WindowManager.LayoutParams.WRAP_CONTENT`.
  - `format = PixelFormat.TRANSLUCENT`.

### ب. التصميم الملكي والواجهة الأصلية (Royal Android Native View):
- بناء واجهة برمجية أصلية بالكامل تتطابق مع الهوية البصرية الملكية لتطبيق أَثَرُ:
  - خلفية داكنة فخمة من حجر الأوبسيديان الملكي (`#120F0A` مع لمسات ذهبية `#E6C66E`).
  - حدود ذهبية منحنية متوهجة (`Corner Radius = 20dp` مع حد ذهبي رفيع).
  - أيقونة التنبيه الملكية وشارة نوع التنبيه (آية، ذكر وصلوات، بر الوالدين، ورد قرآني).
  - نص الآية أو الذكر بخط عربي قرآني واضح ومريح للعينين.
  - زر تشغيل / إيقاف الصوت التفاعلي (Play / Pause).
  - شريط تقدم ذهبي نحيف للإغلاق التلقائي مع مؤقت تنازلي هادئ.
  - زر الإجراء المباشر ("فتح في التطبيق"): ينقل المستخدم فوراً إلى الآية أو المسبحة المحددة.
  - زر "إغلاق" لإنهاء التنبيه وحذف النافذة بسلاسة.

---

## 2. خدمة الاستمرارية في الخلفية (Foreground Service)

- إنشاء خدمة أندرويد مخصصة ومستمرة: `AtharFloatingWindowService` ترتبط بنظام `ForegroundService`.
- تسجيل الخدمة في `AndroidManifest.xml` بنوع الخدمة المناسب في Android 14+ (`mediaPlayback` أو `specialUse` / `dataSync`).
- ضمان عدم قيام نظام التشغيل بقتل الخدمة أثناء تصفح المستخدم لتطبيقات أخرى عبر إشعار هادئ مخصص وحيازة `WakeLock` مؤقت.
- دعم إيقاف النافذة وإزالتها تلقائياً عند:
  1. ضغط زر "إغلاق".
  2. انتهاء الصوت أو انتهاء عداد الإغلاق التلقائي (10 ثوانٍ في النمط الصامت).
  3. الضغط على زر فتح التطبيق لمتابعة القراءة.

---

## 3. التعامل مع إذن الظهور فوق التطبيقات (SYSTEM_ALERT_WINDOW) والتوجيه للويزارد

- فحص حالة الإذن برمجياً عبر `Settings.canDrawOverlays(context)`.
- في حال كان الإذن **غير مفعّل**:
  - توجيه المستخدم مباشرة إلى صفحة ويزارد التثبيت المخصصة (`PermissionsSetupWizard`) مع التركيز على خطوة "الظهور فوق التطبيقات".
  - فتح نافذة إعدادات النظام المباشرة للإذن عبر Intent: `Settings.ACTION_MANAGE_OVERLAY_PERMISSION` مع تمرير اسم الحزمة (`package:com.athar.islamic` / `com.athar.athar`).
- في حال كان الإذن **مفعلاً**:
  - يتم إطلاق النافذة العائمة الأصلية فوراً في أعلى الشاشة فوق أي تطبيق خارجي.

---

## 4. تكامل Capacitor Plugin & Deep Linking

### أ. تحديث `NativePermissionsPlugin.kt`:
- تفعيل دالة `showSystemOverlayNotification`:
  - استقبال كائن التنبيه (`title`, `body`, `badge`, `category`, `audioUrl`, `surahNumber`, `ayahNumber`, `playSound`, `playbackMode`).
  - التحقق من `Settings.canDrawOverlays`.
  - إطلاق `AtharFloatingWindowService` مع تمرير البيانات.
- تفعيل دالة `dismissSystemOverlay`:
  - إرسال أمر لإزالة النافذة وإيقاف الصوت والخدمة فوراً.

### ب. تكامل فتح التطبيق والتوجيه الذكي (Deep Linking في `MainActivity.java`):
- عند ضغط زر "فتح الآية" أو "فتح المسبحة" من النافذة العائمة أثناء وجود المستخدم في تطبيق آخر:
  - إطلاق `Intent` ينشئ أو يفتح `MainActivity` مع `FLAG_ACTIVITY_NEW_TASK | FLAG_ACTIVITY_SINGLE_TOP`.
  - تمرير المعاملات المحددة (`open_ayah`, `surah_number`, `ayah_number` أو `open_tasbih`).
  - التقاط الحدث في JavaScript عبر `handleDeepLink` وتوجيه واجهة React فوراً للقسم المطلوب.

### ج. تكامل واجهة الويب (`NativePermissionsBridge.ts` & `RoyalFloatingAlertSheet.tsx`):
- عند إطلاق أي تنبيه ملكي:
  - إذا كان التطبيق يعمل على بيئة أندرويد الأصلية (`isNative()`): استدعاء `showSystemOverlayNotification`.
  - إذا كان المستخدم داخل متصفح الويب أو بيئة المعاينة: الاستمرار في عرض واجهة الـ React المدمجة بسلاسة.
  - فحص الإذن وعرض تنبيه توجيهي إلى ويزارد الأذونات في حال عدم منحه.

---

## 5. خطة التحقق والاختبار

1. **التحقق من صحة الكود البرمجي (Lint & Compile):**
   - فحص كود Kotlin و Java والتأكد من خلوه من أية أخطاء في الـ imports أو الـ lifecycle.
   - التحقق من خلو ملفات TypeScript من أية أخطاء عبر `npm run lint` و `compile_applet`.
2. **اختبار سلوك النافذة خارج التطبيق:**
   - تجربة إطلاق التنبيهات واختبار استمرارها عند الخروج إلى الشاشة الرئيسية أو فتح تطبيقات أخرى.
   - التحقق من استجابة أزرار الصوت، الإغلاق، والفتح في التطبيق.
3. **اختبار التوجيه لإذن الظهور:**
   - فحص سلوك التطبيق في حالة عدم توفر الإذن وتأكيد فتح ويزارد الأذونات وشاشة الضبط بسلاسة.
