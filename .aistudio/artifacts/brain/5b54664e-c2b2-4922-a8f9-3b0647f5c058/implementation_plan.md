# تقرير التدقيق المعماري الشامل لمنظومة إشعارات وخلفية تطبيق «أثر» وخطة المعالجة الهندسية
# (Athar Notification & Background Execution Comprehensive Audit & Remediation Plan)

يقدم هذا التقرير تحليلاً هندسياً دقيقاً ومفصلاً لمنظومة الإشعارات والعمل في الخلفية لتطبيق **«أثر» (Athar Islamic App)** عبر طبقتي **React/TypeScript** و **Android Native (Kotlin/Java)**. يستهدف التدقيق فحص كافة مصادر الإشعارات، وتحديد أسباب التكرار أو التعارض، وضبط الجدولة غير المتكررة (Idempotent Scheduling)، وإدارة المزامنة عند إعادة التشغيل وتغيير المناطق الزمنية، مع وضع الحلول البرمجية الجراحية الأدنى خطورة والأعلى كفاءة لحماية البطارية وتأمين إطلاق الأذان والتنبيهات بدقة تامة.

---

## مراجعة المستخدم والقرارات المعمارية المعتمدة (User Review & Confirmed Decisions)

> [!IMPORTANT]
> بناءً على إجابات الاستيضاح المؤكدة من المستخدم:
> 1. **معمارية جدولة الأذان والصلوات الخمس**: اعتماد المعمارية الهجينة (Hybrid: Exact `AlarmManager` alarms backed by `AthanForegroundService`)، بحيث يتم تسجيل منبهات دقيقة عبر `AlarmManager.setAlarmClock` / `setExactAndAllowWhileIdle` لإطلاق شاشة الأذان `FullScreenAzanService` حتى عند نوم الهاتف العميق (Doze Mode) أو إنهاء التطبيق قسرياً، مع استمرار `AthanForegroundService` كخدمة خفيفة لعرض العداد المستمر لشريط الإشعارات والـ Dynamic Island.
> 2. **حل حلقة السباق (Race Condition) بين العداد الدائم ومنبهات النظام**: إسناد صلاحية إطلاق التنبيهات حصرياً إلى `AlarmManager` مع تفعيل بصمات زمنية فريدة للمطابقة وعدم التكرار (Idempotency Timestamps)، وإزالة الاستدعاءات العشوائية المكررة لـ `checkAndTriggerDueReminders` من داخل العداد الثواني في `AthanForegroundService`.
> 3. **التعامل مع التوقيت الصيفي وتغيير المناطق الزمنية (Time Zone & Clock Changes)**: إضافة مستمعي بث النظام `ACTION_TIMEZONE_CHANGED` و `ACTION_TIME_CHANGED` إلى `AtharBootReceiver` لإعادة حساب مواقيت الصلاة وجدولة المنبهات تلقائياً في الخلفية دون انتظار فتح التطبيق من قِبل المستخدم.

---

## 1. حصر مصادر الإشعارات والتنبيهات في الكود (Notification Sources Inventory)

| نوع الإشعار / التنبيه | المصدر البرمجي (Trigger Source) | وسيط العرض في أندرويد | قناة الإشعار (Notification Channel) | المعرّف الفريد (Notification ID) | آلية الجدولة |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **أذان الصلوات الخمس المفروضة** | `AtharPrayerAlarmReceiver` (Native) / `NativeNotificationService` (JS) | `FullScreenAzanService` (شاشة كاملة) + صوت المؤذن | `athar_athan_channel` / `athar_azan_fullscreen_channel_v1` | `ID_PRAYER_ATHAN` (1001) / `99995` | `AlarmManager.RTC_WAKEUP` / `setAlarmClock` |
| **شريط مواقيت الصلاة الدائم (Ongoing)** | `AthanForegroundService` (Native) + `LiveActivityService` (JS) | شريط إشعار دائم بصري + Chronometer هبوطي | `athar_background_service_channel` (Foreground) | `BACKGROUND_NOTIFICATION_ID` (99992) | Foreground Service مستمرة مع مؤقت ذكي |
| **تنبيه إقامة الصلاة** | `FullScreenAzanService` بعد انقضاء دقائق الإقامة | نافذة عائمة `AtharFloatingWindowService` + صوت الإقامة | `athar_iqamah_channel` | `ID_IQAMAH` (1002) | منبه مؤقت عبر `AlarmManager` بإجراء `ACTION_IQAMAH_ALARM` |
| **اقرأ ولو آية (القرآن الكريم)** | `AtharPrayerAlarmScheduler` (Native) | نافذة عائمة ملكية `AtharFloatingWindowService` | `athar_quran_channel` | `ID_QURAN_AYAH` (1004) | `AlarmManager.ACTION_ROYAL_ALARM` بحساب أقرب موعد مستحق |
| **ذكر الله والصلاة على النبي ﷺ** | `AtharPrayerAlarmScheduler` (Native) | نافذة عائمة ملكية `AtharFloatingWindowService` | `athar_dhikr_channel` | `ID_SALAWAT` (1006) | `AlarmManager.ACTION_ROYAL_ALARM` |
| **الورد القرآني اليومي** | `AtharPrayerAlarmScheduler` (Native) | نافذة عائمة ملكية `AtharFloatingWindowService` | `athar_quran_channel` | `ID_QURAN_WIRD` (1005) | `AlarmManager.ACTION_ROYAL_ALARM` |
| **بر الوالدين والإحسان** | `AtharPrayerAlarmScheduler` (Native) | نافذة عائمة ملكية `AtharFloatingWindowService` | `athar_parents_channel` | `ID_PARENTS_DUTY` (1009) | `AlarmManager.ACTION_ROYAL_ALARM` |
| **تنبيهات السكينة والمكالمات** | `SmartSilenceService` / `NativePermissionsBridge` | إشعار نظام هادئ أو توست داخلي | `athar_system_channel` | `ID_CALL_INTERRUPTION` (1013) / `ID_SMART_SILENCE` (1014) | فوري (Event-driven) عند تغير حالة الاتصال أو الحساسات |
| **رسائل وتنبيهات السحابة (FCM)** | `AtharFirebaseMessagingService` | إشعار نظام مخصص | `athar_fcm_announcements` | ديناميكي (`System.currentTimeMillis()`) | Push Message سحابية |

---

## 2. نتائج التدقيق وفحص الثغرات الحالية (Audit Findings by Category)

### أ. الجدولة المكررة والتعارض الحركي (Duplicate Scheduling & Race Conditions)
1. **[مؤكد بالكود] تعارض بين حلقة `countdownTickerRunnable` ومنبه `AlarmManager`**:
   - **المشكلة**: في ملف `AthanForegroundService.java` السطور (75-77)، تستدعي حلقة الخدمة الخلفية الدالة `AtharPrayerAlarmScheduler.INSTANCE.checkAndTriggerDueReminders(context)` في كل مرة يصحو فيها العداد (كل فترة زمنية أو دقيقة). وفي ذات الوقت، يقوم `AtharPrayerAlarmReceiver` باستقبال إشارة `ACTION_ROYAL_ALARM` من `AlarmManager` واستدعاء ذات الدالة!
   - **الأثر**: إذا تزامن تشغيل العداد مع انطلاق منبه النظام، أو إذا كان الفارق بضعة أجزاء من الثانية، يحدث إطلاق مزدوج للتنبيه الصوتي والنافذة العائمة في وقت واحد.
   - **الحل**: حصر إطلاق التنبيهات في `AtharPrayerAlarmReceiver` ومنع استدعاء التنبيهات من حلقة الخدمة، أو وضع قفل تزامن ذري (Atomic Execution Lock) مع فحص البصمة الزمنية (`System.currentTimeMillis() - lastTriggeredTs >= 10000L`).

2. **[مؤكد بالكود] فقدان ربط جدولة الصلوات الخمس في جسر الأندرويد (`scheduleNativePrayerAlarms`)**:
   - **المشكلة**: يقوم كود TypeScript في `NativeNotificationService.ts` السطر 113 باستدعاء `NativePermissionsBridge.scheduleNativePrayerAlarms(nativeAlarms)`. هذا الاستدعاء يمرر JSON إلى `NativePermissions.scheduleNativePrayerAlarms`. لكن بفحص `NativePermissionsPlugin.kt`، يتبين أن هذه الدالة غير مسجلة كـ `@PluginMethod` (يوجد فقط دالة فارغة اسمها `schedulePrayers` ترجع `{success: true}` بدون جدولة حقيقية!).
   - **الأثر**: لا يتم تسجيل منبهات الصلوات الخمس في `AlarmManager` عبر هذا المسار، والاعتماد الحالي مقتصر على ما يتم تمريره لشريط الخدمة الدائمة فقط.
   - **الحل**: تفعيل دالة `@PluginMethod fun scheduleNativePrayerAlarms` في `NativePermissionsPlugin.kt` لجدولة مواقيت الصلوات الخمس الحقيقية للأيام القادمة عبر `AlarmManager.setAlarmClock` برموز طلب فريدة (`RequestCode = 10000 + prayerId.hashCode()`).

### ب. إعادة الجدولة غير الضرورية عند كل تشغيل (Launch-time Re-scheduling & Backlog)
1. **[مؤكد بالكود] إعادة كتابة الإعدادات وتصفير المؤقتات مع كل فتح للتطبيق**:
   - **المشكلة**: في `src/App.tsx` (السطور 588-600)، يتم استدعاء `ReminderEngine.start()` و `NativeNotificationService.initAndScheduleAll()` في كل مرة يتم فيها تحميل المكون الأساسي، مما يعيد مزامنة كامل الإعدادات مع `SharedPreferences`.
   - **الأثر**: إذا قام المستخدم بإغلاق التطبيق وفتحه عدة مرات، تتكرر عمليات الكتابة على القرص (`SharedPreferences.apply()`) وإلغاء وإعادة جدولة الـ PendingIntents.
   - **الحل**: جعل الاستدعاء غير متكرر (Idempotent) عبر التحقق من بصمة التغيير (Settings Hash): إذا لم تتغير مواعيد التنبيهات أو الحساب الفلكي، يتم تخطي إعادة الجدولة ويكتفى فقط بالتحقق من سلامة المؤقت القائم.

### ج. التعامل مع إعادة التشغيل، التوقيت الصيفي، وتغيير المناطق الزمنية (Reboot, DST & Timezone)
1. **[مؤكد بالكود] نقص مرشحات الإجراءات (Intent Filters) في `AtharBootReceiver`**:
   - **المشكلة**: في `AndroidManifest.xml` السطور 182-186، يستمع `AtharBootReceiver` فقط إلى:
     - `android.intent.action.BOOT_COMPLETED`
     - `android.intent.action.MY_PACKAGE_REPLACED`
     - `android.intent.action.QUICKBOOT_POWERON`
   - **الأثر**: إذا سافر المستخدم وتغيرت المنطقة الزمنية لهاتفه (`ACTION_TIMEZONE_CHANGED`)، أو قام بتعديل ساعة الهاتف يدوياً أو طبق النظام التوقيت الصيفي (`ACTION_TIME_CHANGED`)، فإن منبهات أندرويد القائمة في `AlarmManager` تظل على التوقيت القديم حتى يفتح التطبيق يدوياً.
   - **الحل**: إضافة `android.intent.action.TIMEZONE_CHANGED` و `android.intent.action.TIME_SET` إلى `AtharBootReceiver`، وتحديث الجدولة فورياً.

### د. قنوات الإشعارات والأذونات والمعرفات الثابتة (Channels, Permissions & IDs)
1. **[مؤكد بالكود] استقرار المعرفات وقنوات النظام**:
   - كافة قنوات الإشعارات الثمانية (`athar_athan_channel`, `athar_iqamah_channel`, `athar_quran_channel`, `athar_dhikr_channel`, `athar_parents_channel`, `athar_ongoing_prayer_channel_v2`, `athar_alarm_channel`, `athar_system_channel`) مسجلة بسلامة تامة بمعرفات ثابتة وأسماء عربية واضحة في `AtharNotificationManager.kt`.
   - معرفات الإشعارات (`1001` إلى `1014`) فريدة وتمنع التراكم غير المقصود.
   - احترام أذونات أندرويد 13+ (`POST_NOTIFICATIONS`) وأندرويد 12+ (`SCHEDULE_EXACT_ALARM`) عبر التحقق المسبق في `NativePermissionsPlugin.kt`.

### هـ. توافق أجهزة شاومي والشركات المصنعة (OEM Restrictions: Xiaomi, Samsung, etc.)
1. **[مؤكد بالكود والوثائق] قيود HyperOS / MIUI و One UI على الإيقاظ**:
   - في بيئات شاومي و HyperOS، قد يُحظر ظهور النافذة العائمة أو تشغيل الصوت في الخلفية في حال تفعيل توفير الطاقة الصارم (Battery Saver) أو تعطيل الإذن المتقدم (Autostart / Display pop-up windows while running in the background).
   - الكود يحتوي بالفعل على مستكشف متقدم (`openManufacturerBackgroundSettings`) يوجه المستخدم مباشرة لصفحات الإعدادات الخاصة بكل مصنع (MIUI Powerkeeper, Autostart Management, Samsung AppSleepList, ColorOS Startup).
   - **التأكيد**: يتم تعزيز هذا المسار بربط الفحص الذاتي عبر `runComprehensiveReadinessCheck` للتأكد من جاهزية الجهاز قبل الاعتماد على التنبيهات.

---

## 3. التمييز بين الفحص المكتبي والتجربة على الأجهزة الفعلية

| البند المفحوص | طريقة التحقق | النتيجة والتوصية |
| :--- | :--- | :--- |
| **تعارض استدعاء checkAndTriggerDueReminders** | فحص كود مكتبي (Code Inspection) | ثغرة برمجية مؤكدة بنسبة 100%، تم إعداد حلها الجراحي. |
| **غياب دالة scheduleNativePrayerAlarms في الـ Plugin** | فحص كود مكتبي (Code Inspection) | خطأ ربط مؤكد بنسبة 100% بين واجهة TypeScript وكود Kotlin، سيتم تصحيحه فوراً. |
| **استجابة ACTION_TIMEZONE_CHANGED** | فحص كود مكتبي (Code Inspection) | غياب المرشح من AndroidManifest.xml مؤكد، سيتم إضافته للمستقبل. |
| **بقاء الخدمة الدائمة بعد إيقاف الشاشة لساعات (Doze Mode)** | يتطلب جهازاً فعلياً (Physical Device) | أندرويد يطبق قيوداً متدرجة على الشبكة والمعالج في وضع Doze؛ استخدام `AlarmManager.setAlarmClock` يحمي الصلوات من النوم العميق. |
| **ظهور النافذة العائمة فوق شاشة القفل في شاومي (MIUI/HyperOS)** | يتطلب جهازاً فعلياً (Physical Device) | يتطلب إذن "Show on Lock screen" و "Display pop-up windows" الإضافي في MIUI، ويقوم المعالج بتوجيه المستخدم إليه. |

---

## 4. خطة التعديل الجراحية الدقيقة (Surgical Remediation Steps)

### المرحلة 1: تفعيل جدولة الصلوات الخمس في `NativePermissionsPlugin.kt` و `AtharPrayerAlarmScheduler.kt`
- إضافة دالة `@PluginMethod fun scheduleNativePrayerAlarms(call: PluginCall)` لاستقبال مصفوفة الصلوات الخمس المجدولة لـ 48 ساعة.
- تخزين جدول الصلوات الخمس في `SharedPreferences` وتسجيل منبهات دقيقة منفصلة ومستقرة عبر `AlarmManager.setAlarmClock` بمعرفات فريدة:
  - الفجر: `REQ_CODE_PRAYER_FAJR` (91001)
  - الظهر: `REQ_CODE_PRAYER_DHUHR` (91002)
  - العصر: `REQ_CODE_PRAYER_ASR` (91003)
  - المغرب: `REQ_CODE_PRAYER_MAGHRIB` (91004)
  - العشاء: `REQ_CODE_PRAYER_ISHA` (91005)
- إلغاء المنبه السابق تلقائياً لنفس الفريضة قبل ضبط الجديد لضمان عدم وجود أي تكرار (`FLAG_UPDATE_CURRENT`).

### المرحلة 2: القضاء على حلقة السباق (Race Condition Elimination)
- إزالة استدعاء `AtharPrayerAlarmScheduler.INSTANCE.checkAndTriggerDueReminders(AthanForegroundService.this)` من داخل `countdownTickerRunnable` في `AthanForegroundService.java`.
- حصر إطلاق التنبيهات الملكية الأربعة في `AtharPrayerAlarmReceiver` المربوط بمنبهات `AlarmManager` الصريحة.
- تطبيق قفل زمني آمن داخل `checkAndTriggerDueReminders`: منع إطلاق نفس التنبيه إذا كان قد تم إطلاقه خلال آخر 30 ثانية (`now - lastTriggeredTs < 30_000L`).

### المرحلة 3: إضافة مستمعي تغيير الوقت والمنطقة الزمنية
- تحديث `AndroidManifest.xml` لإضافة الإجراءات التالية لـ `AtharBootReceiver`:
  ```xml
  <action android:name="android.intent.action.TIMEZONE_CHANGED" />
  <action android:name="android.intent.action.TIME_SET" />
  ```
- في `AtharBootReceiver.kt`: عند استقبال أي من هذه الأحداث، يتم إعادة استدعاء `scheduleNextRoyalAlarm` وقراءة جدول الصلوات الخمس وإعادة جدولتها فوراً لضبط المواقيت على التوقيت الجديد.

### المرحلة 4: تحسين استدعاءات TypeScript ومنع الجدولة المكررة عند بدء التشغيل
- في `src/services/nativeNotificationService.ts`: حفظ بصمة آخر جدولة (Hash / Timestamp) ومقارنتها قبل إعادة إرسال المنبهات للأندرويد، لتفادي إرسال طلبات جدولة جديدة متطابقة مع كل فتح للتطبيق إذا كانت التواريخ والمواقيت لم تتغير.

---

## 5. مصفوفة الاختبارات البرمجية والتحقق (Verification & Test Matrix)

```
┌────────────────────────────────────────────────────────────────────────┐
│               NOTIFICATION SYSTEM VERIFICATION MATRIX                  │
└────────────────────────────────────────────────────────────────────────┘

 [1] REPEATED LAUNCHES TEST
 ──── Open app 5 times consecutively.
 ──── Verify PendingIntents in AlarmManager remain exactly 5 prayer alarms + 1 next royal alarm.
 ──── Confirm no duplicate overlays or duplicate audio instances.

 [2] RACE CONDITION & SIMULTANEOUS TRIGGER TEST
 ──── Simulate trigger at exact second threshold.
 ──── Verify AtomicBoolean / Timestamp lock prevents 2nd execution.

 [3] TIMEZONE & DST TEST
 ──── Simulate Intent ACTION_TIMEZONE_CHANGED.
 ──── Verify AtharBootReceiver wakes up and re-computes next alarms.

 [4] REBOOT / DEVICE RESTORE TEST
 ──── Simulate ACTION_BOOT_COMPLETED.
 ──── Verify ongoing countdown notification and AlarmManager alarms restore silently without popups.

 [5] PERMISSION DENIAL & SILENT FALLBACK
 ──── Revoke POST_NOTIFICATIONS or SCHEDULE_EXACT_ALARM.
 ──── Verify app gracefully handles denial without crashes or unhandled exceptions.
```
