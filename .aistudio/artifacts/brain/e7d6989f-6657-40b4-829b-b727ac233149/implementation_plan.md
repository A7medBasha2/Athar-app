# تقرير التدقيق الشامل للخصوصية والأذونات وسياسات متجر Google Play (Privacy & Permissions Audit Report)
## تطبيق أثر الإسلامي (`com.athar.islamic`)

تقرير تدقيق هندسي وقانوني-تقني شامل للخصوصية والأذونات والمكتبات البرمجية لتطبيق «أثر»، مُعدّ خصيصاً لتجهيز التطبيق للنشر والاعتماد الرسمي على **Google Play Console** دون أي رفض (Policy Rejection) أو تعليق، مع الحفاظ الكامل على كافة الميزات الإسلامية الفاخرة (الأذان الملكي، التنبيهات العائمة، القبلة، والورد القرآني).

---

## مراجعة المستخدم والقرارات الحاسمة (User Review & Critical Decisions)

> [!IMPORTANT]
> تم استطلاع خياراتكم وتأكيد المحددات الاستراتيجية التالية:
> 1. **إذن تثبيت التحديثات `REQUEST_INSTALL_PACKAGES`**: اعتماد معمارية النكهات (Product Flavors) بحيث تخلو حزمة متجر Google Play من هذا الإذن نهائياً لتفادي الرفض الفوري (بموجب سياسة حظر التحديثات الخارجية)، مع الإبقاء عليه حصرياً في نسخة التوزيع المباشر عبر GitHub Releases.
> 2. **حذف الحساب والبيانات (Account & Data Deletion)**: توفير مسارين لحذف الحساب: مسار فوري داخل التطبيق (موجود ويعمل في شاشة الإعدادات) + رابط ويب رسمي مخصص لطلب الحذف السحابي دون الحاجة لتثبيت التطبيق.
> 3. **الإفصاح البارز لإذن الموقع (Prominent Location Disclosure)**: عرض نافذة إفصاح مسبقة وواضحة قبل طلب إذن الـ GPS توضح أن الموقع يُستخدم فلكياً فقط لحساب مواقيت الصلاة واتجاه القبلة ولا يُشارك مع أي طرف ثالث.

---

## 1. تقرير الأذونات إذناً بإذن (Permission-by-Permission Audit)

| الإذن المصرح به | الغرض الوظيفي الفعلي في الكود | الاستخدام البرمجي في المشروع | التصنيف المعتمد | موقف سياسات Google Play |
|---|---|---|---|---|
| `android.permission.INTERNET` | جلب التلاوات ومواقيت الصلاة، وتحديثات Firebase، والتحقق من التحديثات | مكاتب الشبكة، ExoPlayer، Firebase SDK | **Required** (مطلوب) | إذن قياسي عادي؛ مقبول تلقائياً. |
| `android.permission.ACCESS_NETWORK_STATE` | التحقق من وجود اتصال بالإنترنت قبل تشغيل الصوت أو فحص السيرفر | `audioService.ts`, `imagePreloadService.ts` | **Required** (مطلوب) | إذن قياسي عادي؛ مقبول تلقائياً. |
| `android.permission.POST_NOTIFICATIONS` | إرسال تنبيهات الأذان، أذكار الصباح والمساء، والعداد التنازلي التنافسي (Android 13+) | `AtharNotificationManager.kt` | **Required** (مطلوب) | إذن تشغيلي خطير في وقت التشغيل (Runtime Permission). يطلب بسياق واضح. |
| `android.permission.SCHEDULE_EXACT_ALARM` | جدولة مواقيت الصلاة والمنبهات الملكية بدقة الثانية عبر `AlarmManager` (Android 12) | `AtharPrayerAlarmScheduler.kt` | **Required** (مطلوب) | إذن عادي في API 31-32؛ قابل للإلغاء من قبل المستخدم في إعدادات النظام. |
| `android.permission.USE_EXACT_ALARM` | تشغيل منبه الأذان الفلكي بدقة الثانية في وضع السكون (Doze Mode) دون طلب يدوي (Android 13+) | `AtharPrayerAlarmScheduler.kt` | **Required** (مطلوب شرعياً ووظيفياً) | **يتطلب إقراراً في Play Console**: مسموح لتطبيقات المنبه والساعة والتقويم (Alarms & Clocks). التطبيق يطابق الفئة تماماً كمنبه صلاة. |
| `android.permission.USE_FULL_SCREEN_INTENT` | إيقاظ الشاشة وعرض واجهة الأذان الملكية فوق قفل الشاشة عند انطلاق الأذان | `NotificationCompat.Builder.setFullScreenIntent` | **Required** (مطلوب) | **يتطلب إقراراً في Play Console**: مسموح لتطبيقات المنبهات والمكالمات في أندرويد 14+. |
| `android.permission.SYSTEM_ALERT_WINDOW` | عرض النافذة العائمة الملكية للتنبيهات والأذكار فوق التطبيقات الأخرى | `AtharFloatingWindowService.kt` | **Conditionally Required** (مشروط) | إذن وصول خاص (Special App Access)؛ اختياري ويُفعله المستخدم يدوياً من الإعدادات. |
| `android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | حماية محرك المنبه من الإيقاف بواسطة ميزات توفير الطاقة العنيفة في أجهزة شاومي وهواوي | `NativePermissionsPlugin.kt` | **Conditionally Required / Policy Risk** | **حساس في Play Store**: توصي السياسة بعدم طلبه تلقائياً وجعله فقط زراً اختيارياً استشارياً داخل شاشة الإعدادات. |
| `android.permission.RECEIVE_BOOT_COMPLETED` | إعادة جدولة الصلوات الخمس والمنبهات فور إعادة تشغيل الهاتف | `AtharBootReceiver.kt` | **Required** (مطلوب) | مسموح به طبيعياً مع حماية المستقبل بفحص الأكشن. |
| `android.permission.VIBRATE` | توليد أنماط الاهتزاز عند التنبيه والترديد والأذان | `Vibrator` / `HapticFeedback` | **Required** (مطلوب) | إذن قياسي عادي. |
| `android.permission.WAKE_LOCK` | الحفاظ على معالج الهاتف نشطاً لمدة أقصاها 4 دقائق أثناء تلاوة الأذان | `PowerManager.WakeLock` | **Required** (مطلوب) | مسموح به مع ضبط مهلة الإفراج التلقائي (Timeout). |
| `android.permission.FOREGROUND_SERVICE` | تشغيل الخدمات الدائمة في الخلفية للأذان والعداد التنازلي | `AthanForegroundService`, `FullScreenAzanService` | **Required** (مطلوب) | إذن أساسي لتشغيل خدمات الخلفية. |
| `android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK` | تشغيل صوت الأذان وتلاوة القرآن والأذكار عبر Media3 ExoPlayer | `AndroidManifest.xml` | **Required** (مطلوب) | يتطابق 100% مع غرض الخدمة كخدمة وسائط صوتية. |
| `android.permission.FOREGROUND_SERVICE_DATA_SYNC` | مصرح عنه في البيان للخدمات الثلاث دون وجود مزامنة بيانات فعلية مع خادم خارجي | خدمات الأذان لا تقوم بمزامنة سحابية دورية | **Unnecessary / Policy Blocker** (عائق سياسات) | **خطر رفض في Google Play**: تفرض سياسة أندرويد 14+ إثبات وجود مزامنة بيانات حقيقية. يجب حذفه والاكتفاء بـ `mediaPlayback`. |
| `android.permission.ACCESS_COARSE_LOCATION` & `ACCESS_FINE_LOCATION` | حساب أوقات الصلوات فلكياً وتحديد زاوية بوصلة القبلة بدقة الدرجة | `LocationService.ts` و Geolocation | **Conditionally Required** (مشروط) | يتطلب نافذة إفصاح مسبق بارزة (Prominent Disclosure). اختياري (يمكن اختيار المدينة يدوياً). |
| `android.permission.REQUEST_INSTALL_PACKAGES` | تنزيل وتثبيت تحديثات حزم APK مباشرة من GitHub Releases | `NativePermissionsPlugin.kt` | **Policy Blocker on Play** (محظور في المتجر) | **انتهاك لسياسة Device and Network Abuse**: تمنع Google أي تطبيق على متجرها من تحديث نفسه أو تثبيت APKs خارج المتجر. |

---

## 2. عوائق سياسات Google Play والحلول المعمارية (Policy Blockers & Solutions)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GOOGLE PLAY COMPLIANCE BLOCKERS                          │
├────┬───────────────────────────────────────┬────────────┬──────────────────┤
│ #  │ Blocker Description                   │ Severity   │ Solution Path    │
├────┼───────────────────────────────────────┼────────────┼──────────────────┤
│ 1  │ REQUEST_INSTALL_PACKAGES in Play APK  │ CRITICAL   │ Product Flavors  │
│ 2  │ FOREGROUND_SERVICE_DATA_SYNC in FGS   │ HIGH       │ Drop DATA_SYNC   │
│ 3  │ Missing Prominent Location Disclosure │ HIGH       │ Pre-prompt Modal │
│ 4  │ Web URL for Account Deletion          │ MEDIUM     │ Privacy Page URL │
│ 5  │ Exact Alarm Declaration on Console    │ MEDIUM     │ Alarm Category   │
└────┴───────────────────────────────────────┴────────────┴──────────────────┘
```

### 1. عائق إذن التثبيت `REQUEST_INSTALL_PACKAGES`
* **المشكلة**: متجر Google Play يرفض الحزم التي تطلب تثبيت APKs خارجية إلا إذا كان التطبيق متجر تطبيقات رسمي أو أداة إدارة أجهزة مؤسسية (EMM).
* **الحل المعماري الموصى به**:
  إعداد نكهتين (Product Flavors) في Gradle:
  - نكهة **`play`**: تستبعد إذن `REQUEST_INSTALL_PACKAGES` وتلغي زر التحديث الداخلي أو توجه المستخدم لصفحة المتجر.
  - نكهة **`github`**: تحتفظ بكامل منظومة التحديث الذاتي التلقائي.

### 2. عائق نوع الخدمة `FOREGROUND_SERVICE_DATA_SYNC`
* **المشكلة**: منذ أندرويد 14 (API 34)، أوقفت Google قبول `dataSync` في خدمات Foreground إلا إذا كان التطبيق يقوم برفع أو تحميل ملفات للمستخدم مع خادم خارجي. خدمات الأذان في أثر (`AthanForegroundService` و `FullScreenAzanService`) هي خدمات تشغيل صوتي للآذان وليست خدمات مزامنة بيانات.
* **الحل المعماري الموصى به**:
  حذف `android.permission.FOREGROUND_SERVICE_DATA_SYNC` من `AndroidManifest.xml` وتعديل نوع الخدمات ليقتصر على:
  `android:foregroundServiceType="mediaPlayback"` فقط.

### 3. إفصاح استخدام الموقع الجغرافي (Prominent Location Disclosure)
* **المشكلة**: تتطلب سياسة Google Play للموقع إظهار شاشة توضيحية صريحة **قبل** ظهور مربع حوار أندرويد النظامي، توضح نصاً:
  - ما هي البيانات المجمعة (إحداثيات خط الطول والعرض).
  - الغرض الدقيق (حساب مواقيت الفجر والشروق والظهر والعصر والمغرب والعشاء بدقة مدينتك، وتحديد اتجاه الكعبة المشرفة للقبلة).
  - عدم مشاركة البيانات أو بيعها أو تتبع المستخدم في الخلفية.

---

## 3. إقرار أمان البيانات في Google Play (Data Safety Declaration Matrix)

جدول البيانات الدقيق الذي يجب إدخاله في استبيان "أمان البيانات" (Data Safety) على Google Play Console:

| نوع البيانات (Data Type) | هل تُجمع؟ (Collected) | هل تُشارك؟ (Shared) | مشفرة أثناء النقل؟ | إمكانية الحذف (Deletable) | الغرض من الجمع (Purpose) |
|---|---|---|---|---|---|
| **الموقع التقريبي والدقيق**<br>(Approximate & Precise Location) | نعم (اختياري) | **كلا (No)** | نعم (HTTPS) | نعم (مخزنة محلياً فقط) | **وظائف التطبيق (App Functionality)**:<br>حساب مواقيت الصلاة الفلكية وتوجيه بوصلة القبلة. |
| **الاسم والبريد الإلكتروني**<br>(Name & Email Address) | نعم (اختياري عند إنشاء حساب) | **كلا (No)** | نعم (HTTPS) | نعم (مسار فوري + رابط ويب) | **إدارة الحسابات والتخصيص**:<br>مزامنة الختمات القرآنية وإنجازات شجرة الأثر عبر السحابة. |
| **معرّف الجهاز / FCM Token**<br>(Device or other identifiers) | نعم (إشعارات السحابة) | **كلا (No)** | نعم (HTTPS) | نعم (تُحذف بإلغاء التثبيت) | **إرسال التنبيهات المهمة**:<br>إشعارات دخول المواسم الدينية عبر Firebase FCM. |
| **بيانات الأعطال والتشخيص**<br>(Crash Logs & Diagnostics) | نعم (مشروطة بموافقة صريحة) | **كلا (No)** | نعم (HTTPS) | نعم | **تحسين استقرار التطبيق**:<br>تقارير Crashlytics غير المحددة للهوية (مغلقة افتراضياً). |
| **المعلومات المالية والبطاقات** | **كلا (No)** | **كلا (No)** | غير منطبق | غير منطبق | التطبيق مجاني 100% ولا يحتوي على مدفوعات. |
| **الصور والفيديوهات والملفات** | **كلا (No)** | **كلا (No)** | غير منطبق | غير منطبق | لا يتم الوصول إلى استوديو الصور أو الملفات الشخصية. |

---

## 4. فحص متطلبات حذف الحساب (Account Deletion Verification)

* **التحقق من الكود البرمجي**:
  - تم فحص دالة `AuthService.deleteUserAccountAndData()` في `src/services/authService.ts`.
  - الدالة تحذف:
    1. مستند الملف الشخصي من Firestore (`deleteDoc(doc(db, 'users', uid))`).
    2. الحساب الرسمي من Firebase Authentication (`deleteUser(user)`).
    3. مسح الجلسة والبيانات المحلية المخزنة.
* **متطلب Google Play المتبقي للمطور**:
  - تفرض Google Play توفير رابط ويب خارجي (Web Deletion URL) في استبيان المتجر، يتيح للمستخدم إدخال بريده وطلب حذف بياناته دون الحاجة لفتح أو إعادة تثبيت التطبيق.
  - نقترح تخصيص رابط مثل: `https://atharapp.com/privacy#delete-account` أو استمارة Google Form مخصصة لحذف الحسابات.

---

## 5. قائمة التحقق اليدوي للمطور (Developer Manual Checklist)

قائمة بالإجراءات التي يجب على المطور تأكيدها يدوياً على Google Play Console:

- [ ] **سياسة الخصوصية (Privacy Policy)**: نشر رابط سياسة الخصوصية على موقع خارجي وربطه في Google Play Console.
- [ ] **استبيان أمان البيانات (Data Safety Form)**: تعبئة الاستبيان وفقاً للجدول الموضح في القسم (3) أعلاه.
- [ ] **إقرار إذن المنبه الدقيق (USE_EXACT_ALARM Declaration)**: اختيار فئة "منبهات وساعات" (Alarm & Clock App) وتقديم لقطة شاشة لإعدادات أوقات الصلاة والمنبه.
- [ ] **إقرار إذن الشاشة الكاملة (USE_FULL_SCREEN_INTENT Declaration)**: تأكيد أن الأذان يحتاج لإيقاظ الشاشة أثناء وضع الإغلاق لتنبيه المستخدم بدخول وقت الصلاة.
- [ ] **حذف الحساب (Account Deletion URL)**: إدخال الرابط الخارجي المخصص لاستقبال طلبات حذف الحسابات في قسم "محتوى التطبيق".
- [ ] **إقرار الجمهور المستهدف (Target Audience)**: تحديد الفئة العمرية (مثلاً 13 عاماً فأكثر) وتأكيد خلو التطبيق من أي إعلانات موجهة للأطفال.
