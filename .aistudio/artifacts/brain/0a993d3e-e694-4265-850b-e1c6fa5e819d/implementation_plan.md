# خطة تطهير كود Kotlin وتأمين الأداء وحماية البطارية لتطبيق «أثر»

خطة معمارية دقيقة لتطهير وتعقيم الكود المصدري في أندرويد (`Kotlin` و `Java`) لتطبيق «أثر»، تشمل ضبط أقفال الاستيقاظ، التخلص التلقائي من السجلات في الإنتاج، والتحقق الأمني الشامل قبل ربط Firebase.

---

## مراجعة المستخدم والقرارات الحاسمة (User Review & Critical Decisions)

> [!IMPORTANT]
> بناءً على إجاباتك المؤكدة في مرحلة التوضيح:
> 1. **طريقة حظر سجلات التتبع والتصحيح**: حظر واقتطاع استدعاءات `Log.d` و `Log.v` و `Log.i` تلقائياً عبر قواعد `Proguard` و `R8` أثناء تجميع نسخة الإنتاج (Release APK / AAB) دون الحاجة للتشويش على أكواد التطوير.
> 2. **الحد الأقصى الآمن لقفل الاستيقاظ (WakeLock) لشاشة الأذان**: تقليص المدة من 7 دقائق إلى **4 دقائق كحد أقصى** (`4 * 60 * 1000L`) لضمان انطلاق واستكمال الأذان ودعاء ما بعد الأذان مع الحماية المطلقة من استنزاف بطارية الهاتف.

- **القرار المؤكد 1**: تصحيح قفل الاستيقاظ المفرط في `AthanForegroundService.java` (الذي كان يطلب 24 ساعة كاملة) واستبداله بآلية مستيقظة عند الحاجة فقط.
- **القرار المؤكد 2**: تقليص قفل الاستيقاظ في خدمة النافذة العائمة `AtharFloatingWindowService.kt` من 60 ثانية إلى 30 ثانية لتوفير الطاقة.
- **القرار المؤكد 3**: التحقق الأمني الكامل من عدم وجود أي مفاتيح API خاصة أو بيانات اعتماد سرية مكشوفة في كود العميل.

---

## 1. قائمة التحقق للجاهزية الإنتاجية (Production Sanitization Checklist)

| البند | الحالة الحالية | الإجراء المطلوب في الخطة |
| :--- | :--- | :--- |
| **سجلات التتبع (`Log.d`, `Log.v`)** | تعمل في التطوير | اقتطاعها تلقائياً في `proguard-rules.pro` عبر `-assumenosideeffects` |
| **المفاتيح والأسرار المكشوفة** | مفحوصة ونظيفة | تم التحقق من أن كافة السلاسل هي مفاتيح `SharedPreferences` فقط |
| **قفل استيقاظ شاشة الأذان** | 7 دقائق | تقليصه إلى 4 دقائق كحد أقصى (`4 * 60 * 1000L`) |
| **قفل استيقاظ النافذة العائمة** | 60 ثانية | تقليصه إلى 30 ثانية (`30 * 1000L`) |
| **قفل خدمة الخلفية الدائمة** | 24 ساعة | إزالة القفل المستمر الممتد لمنع استهلاك البطارية |
| **حماية الـ ANR في خدمات Foreground** | مستقرة | تشغيل العمليات الثقيلة (فك الصور، الصوت) في مسارات خلفية |

---

## 2. التعديلات البرمجية التنفيذية (Actionable Code Adjustments)

### أ. قواعد Proguard / R8 (`android/app/proguard-rules.pro`)
إضافة توجيهات R8 الرسمية لحذف مكالمات التسجيل غير الضرورية في نسخ Release:
```proguard
# Strip verbose and debug logs in production Release builds for maximum speed & security
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
}
```

### ب. خدمة شاشة الأذان (`FullScreenAzanService.kt`)
تعديل مهلة الـ WakeLock في `acquireFullWakeLock()`:
```kotlin
// تغيير المدة من 7 دقائق إلى 4 دقائق كحد أقصى آمن
wakeLock?.acquire(4 * 60 * 1000L)
```

### ج. خدمة النافذة العائمة (`AtharFloatingWindowService.kt`)
تعديل مهلة الـ WakeLock في `acquireWakeLock()`:
```kotlin
// تقليص المدة من 60 ثانية إلى 30 ثانية كحد أقصى كافٍ لعرض التنبيه
acquire(30 * 1000L)
```

### د. خدمة الخلفية الدائمة (`AthanForegroundService.java`)
إلغاء قفل `partialWakeLock.acquire(24 * 60 * 60 * 1000L)` المستمر على مدار الساعة، والاعتماد على `AlarmManager` و Foreground Service القياسية المعتمدة من جوجل لحماية طاقة الجهاز.

---

## 3. المعمارية التقنية ومسار التنفيذ (Execution Architecture)

```
┌────────────────────────────────────────────────────────┐
│               Build System & Production                │
│                                                        │
│  Release Build (R8 / Proguard)                         │
│    ├── Strips Log.v, Log.d, Log.i automatically       │
│    └── Preserves Log.w and Log.e for crash diagnostics │
│                                                        │
│  Native Services Safe WakeLock Budgets:                │
│    ├── FullScreenAzanService: max 4 minutes timeout    │
│    ├── AtharFloatingWindow: max 30 seconds timeout     │
│    └── AthanForegroundService: AlarmManager-driven     │
└────────────────────────────────────────────────────────┘
```
