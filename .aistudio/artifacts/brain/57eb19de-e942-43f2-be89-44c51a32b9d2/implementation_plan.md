# خطة بناء خدمة الخلفية الدائمة (AthanForegroundService.java) لتطبيق «أَثَرُ»

توفير كود برمجي متكامل ومستقر بلغة Java لخدمة الخلفية `AthanForegroundService.java` مع تكامل شريط الإشعارات الثابت (Ongoing & Persistent Notification)، وإظهار اسم الصلاة القادمة والعد التنازلي التفاعلي الحي، مع شعار التطبيق وأيقونة «أَثَرُ» الرسمية، وربطها الكامل مع Capacitor والواجهة الأمامية عبر JavaScript/TypeScript مع ضبط صلاحيات `AndroidManifest.xml`.

---

## مراجعة المستخدم والقرارات المعتمدة (User Review & Confirmed Decisions)

> [!IMPORTANT]
> تم اعتماد تفضيلاتك من المرحلة السابقة لضمان أفضل توازن بين الدقة واستهلاك البطارية:
> 1. **معدل تحديث العد التنازلي الحي**: التحديث كل ثانية عند اقتراب وقت الصلاة بأقل من ساعة (وكل دقيقة عندما يكون الفارق الزمني أكثر من ساعة).
> 2. **إجراءات شريط الإشعار**: بدون أزرار إضافية مشتتة، والاكتفاء بالضغط على الإشعار لفتح التطبيق فوراً.
> 3. **محتوى الإشعار الثابت**: عرض اسم الصلاة القادمة مع العد التنازلي بشكل أنيق وموجز وواضح، مع أيقونة «أَثَرُ» الصغيرة وشعار التطبيق الرسمي.

- **القرار المؤكد 1**: كتابة كود Java كامل ونظيف ومستقر لملف `AthanForegroundService.java` بحزمة `com.athar.islamic`.
- **القرار المؤكد 2**: إشعار دائم غير قابل للإلغاء بالمسح (`FLAG_ONGOING_EVENT` + `ONGOING` + `ForegroundService`) يضمن بقاء نظام أندرويد محافظاً على استمرارية التطبيق في الخلفية وعدم إغلاقه بواسطة إدارة الطاقة.
- **القرار المؤكد 3**: تحديثات `AndroidManifest.xml` لتعريف الخدمة بنوع `dataSync` أو `specialUse` وصلاحيات `FOREGROUND_SERVICE` و `POST_NOTIFICATIONS` و `WAKE_LOCK`.
- **القرار المؤكد 4**: كود Capacitor Bridge TypeScript/JavaScript وواجهة تحكم أمامية لبدء وإيقاف وتحديث أوقات الصلاة والعد التنازلي بشكل تلقائي مستمر.

---

## 1. نظرة عامة والمفهوم الأساسي (Overview & Core Concept)

- **ما تقدمه الخدمة**: خدمة خلفية مستمرة (Android Foreground Service) تعمل في معمارية Native Android وتتصل بتطبيق Capacitor الهجين. تُظهر إشعاراً ثابتاً في لوحة تنبيهات النظام وقفل الشاشة يعرض اسم الصلاة القادمة مع عد تنازلي حي متجدد، وتحافظ على بقاء التطبيق حياً لتنبيهات الأذان والأذكار حتى في حالات الإغلاق الخلفي وتوفير الطاقة.
- **الفئة المستهدفة**: مستخدمو تطبيق «أَثَرُ» الذين يعتمدون عليه في متابعة أوقات الصلوات الخمس بدقة متناهية دون انقطاع، وبمظهر إسلامي راقٍ واحترافي.
- **القيمة المضافة**: الحماية القصوى من تقييد النظام (Doze Mode & Battery Saver Kill) مع إتاحة معرفة الوقت المتبقي لأي صلاة بنظرة سريعة على شريط الحالة دون الحاجة لفتح التطبيق.

---

## 2. تجربة المستخدم والتصميم البصري للإشعار (UX & Visual Hierarchy)

### مسار تفاعل المستخدم (User Flow)
1. **التشغيل**: عند تشغيل التطبيق أو تفعيل الإشعار الدائم من إعدادات التطبيق، تستدعي الواجهة الأمامية دالة Capacitor لبدء الخدمة ببيانات الصلوات الخمس والوقت الحالي.
2. **الظهور في شريط الحالة**: تظهر أيقونة «أَثَرُ» المصغرة (`ic_stat_athar`) في شريط الإشعارات العلوي.
3. **سحب لوحة الإشعارات**:
   - يرى المستخدم إشعاراً ثابتاً لا يمكن حذفه بالسحب (Non-Dismissible).
   - **العنوان**: اسم الصلاة القادمة (مثال: «صلاة العصر» أو «حان وقت صلاة المغرب»).
   - **النص**: العد التنازلي الحي (مثال: «متبقي 00:42:15» أو «متبقي 02:18»).
   - **الأيقونة الكبيرة (Large Icon)**: شعار تطبيق أثر الرسمي (`icon_logo.png`).
   - **الأيقونة الصغيرة (Small Icon)**: شعار «أَثَرُ» النصي بالخط العربي (`ic_stat_athar.png`).
4. **الضغط على الإشعار**: فتح التطبيق مباشرة ونقله للشاشة الرئيسية لمواقيت الصلاة مع تنشيط الشاشة.

---

## 3. القرارات الهندسية والمفاضلات الفنية (Technical Architecture & Trade-Offs)

### المعمارية الهندسية
```
┌─────────────────────────────────────────────────────────────┐
│                   Capacitor Frontend (React/TS)             │
│   • Prayer Times Engine & Settings Store                   │
│   • athanForegroundBridge.ts                                │
└──────────────────────────────┬──────────────────────────────┘
                               │ Capacitor Plugin Call
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          NativePermissionsPlugin.kt (or Bridge Plugin)       │
│   • startForegroundService(prayerData)                      │
│   • updatePrayerTimes(nextPrayer, targetTimeMs)             │
│   • stopForegroundService()                                 │
└──────────────────────────────┬──────────────────────────────┘
                               │ Intent (ACTION_START / ACTION_UPDATE)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│           AthanForegroundService.java (Android Native)       │
│   • startForeground(NOTIFICATION_ID, notification)          │
│   • ScheduledExecutorService / Handler ticker (1m or 1s)    │
│   • NotificationCompat.Builder (Ongoing, SmallIcon, Logo)   │
│   • Partial WakeLock (عند الحاجة للحفاظ على الدقة)          │
│   • PendingIntent -> MainActivity.class                     │
└─────────────────────────────────────────────────────────────┘
```

### المقارنة والمفاضلات:
1. **كتابة كود نظيف ومتوافق في Java**:
   - بناء الخدمة في ملف `AthanForegroundService.java` النظيف والمستقل مع استخدام معايير Android الحديثة (NotificationChannel مع `NotificationManager.IMPORTANCE_LOW` أو `DEFAULT` لعدم إصدار رنين مستمر عند كل ثانية تحديث، والتركيز على العرض المرئي الصامت للعد التنازلي).
2. **استراتيجية التحديث لتوفير البطارية**:
   - عندما يكون المتبقي أكثر من ساعة (60 دقيقة): التحديث يتم دورياً كل دقيقة (60,000 مللي ثانية).
   - عندما يقترب الوقت ويصبح المتبقي أقل من ساعة: يتحول التكرار تلقائياً كل ثانية (1000 مللي ثانية) لعرض الدقائق والثواني بدقة حية كما طلبتم.
3. **منع ازدواجية الفئات**:
   - نقل أي وظائف كان يقوم بها الملف المؤقت السابق أو توحيدها بسلاسة داخل `AthanForegroundService.java` لضمان نظافة الكود وعدم حدوث تضارب تجميع (Compilation conflict).

---

## 4. مكونات وخطة التنفيذ (Implementation Plan Steps)

### المرحلة 1: إنشاء ملف `AthanForegroundService.java` بالكامل
- الحزمة: `package com.athar.islamic;`
- الفئة: `public class AthanForegroundService extends Service`
- الخصائص:
  - إدارة `NotificationChannel` باسم "أَثَرُ | شريط الصلاة الدائم" وبمعرف ثابت.
  - إشعار `NotificationCompat.Builder` مع `setOngoing(true)`، `setOnlyAlertOnce(true)`، `setSmallIcon(R.drawable.ic_stat_athar)`، `setLargeIcon(BitmapFactory.decodeResource(..., R.drawable.icon_logo))`.
  - مؤقت `ScheduledExecutorService` ذكي لحساب الفارق بين التوقيت الحالي ووقت الصلاة القادمة وتنسيق النص: «متبقي 00:35:12» أو «متبقي 01:24».
  - تفعيل الانتقال التلقائي بين معدل الدقيقة ومعدل الثانية عند الاقتراب من الصلاة.
  - `PendingIntent` لفتح `MainActivity` مع أعلام `FLAG_ACTIVITY_SINGLE_TOP` و `FLAG_IMMUTABLE`.
  - معالجة أوامر `START_STICKY` لضمان إعادة تشغيل النظام للخدمة تلقائياً إذا أُغلقت لنقص الذاكرة.

### المرحلة 2: تعديل `AndroidManifest.xml`
- إضافة وتأكيد تصريح الصلاحيات:
  ```xml
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
  <uses-permission android:name="android.permission.WAKE_LOCK" />
  ```
- تعريف الخدمة في وسم `<application>`:
  ```xml
  <service
      android:name=".AthanForegroundService"
      android:exported="false"
      android:foregroundServiceType="dataSync" />
  ```

### المرحلة 3: ربط جسر الـ Plugin والـ JavaScript/TypeScript
- إضافة دوال التحكم بـ `AthanForegroundService` في جسر الكاباسيتور:
  - `startAthanForegroundService({ nextPrayer, targetEpochMs, allPrayers })`
  - `updateAthanForegroundService({ nextPrayer, targetEpochMs })`
  - `stopAthanForegroundService()`
- كتابة خدمة TypeScript/JavaScript متكاملة في الواجهة (`src/services/athanForegroundBridge.ts`) مع ربطها تلقائياً عند حساب مواقيت الصلاة لتحديث الخدمة بصورة دورية.

### المرحلة 4: التحقق والاختبار البرمجي
- فحص الأيقونات وموارد الـ Drawable للتأكد من وجود `ic_stat_athar` و `icon_logo`.
- التحقق من تجميع التطبيق (`compile_applet` و `tsc`) لضمان عدم وجود أي أخطاء ترجمة أو تضارب.
