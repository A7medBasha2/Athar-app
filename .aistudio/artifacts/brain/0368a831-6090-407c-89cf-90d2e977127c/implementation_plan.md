# خطة إعادة الهيكلة الآمنة لتطبيق «أَثَر» (Safe Architecture Refactoring)

خطة معمارية دقيقة لتنفيذ إعادة هيكلة آمنة ومنهجية ترفع كفاءة الأداء وتقلل استهلاك الذاكرة والبطارية وتخفف حجم حزمة التطبيق (APK) مع الحفاظ التام على تصميم التطبيق وسلوكه وميزاته الإسلامية القائمة.

---

## القرارات المعتمدة مع المستخدم

> [!IMPORTANT]
> بناءً على إجابات الاستيضاح، تم اعتماد القرارات التالية كأولوية في التنفيذ:
> 1. **حذف المكتبات الزائدة**: إزالة كافة الحزم غير المستخدمة في `build.gradle.kts` (Compose، Room، Retrofit، DataStore) لتخفيف حجم التطبيق وتسريع البناء.
> 2. **تحسين بطارية الإشعار المستمر**: إلغاء مؤقت النبض اليدوي الذي يعمل كل ثانية بالخلفية في `AthanForegroundService`، والاعتماد الحصري على عداد `Chronometer` الأصلي المدمج في نظام أندرويد.
> 3. **توحيد معرّف الحزمة**: مطابقة وتوحيد المعرّف المعتمد `com.athar.islamic` بنسبة 100% في كافة ملفات Capacitor وجسر TypeScript و AndroidManifest وسير عمل GitHub Actions.

---

## 1. محاور إعادة الهيكلة (Refactoring Pillars)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ATHAR SAFE REFACTORING                          │
└──────┬──────────────────────┬──────────────────────────┬───────────────┘
       │                      │                          │
       ▼                      ▼                          ▼
 ┌─────────────┐      ┌───────────────┐          ┌───────────────┐
 │ Dependency  │      │ Battery & CPU │          │ App ID Sync   │
 │   Pruning   │      │ Optimization  │          │  & Proguard   │
 └──────┬──────┘      └───────┬───────┘          └───────┬───────┘
        │                     │                          │
        ▼                     ▼                          ▼
  - Remove Compose      - Remove 1s tick loop      - Unify to
  - Remove Room         - Native Chronometer       com.athar.islamic
  - Remove Retrofit     - Safe PartialWakeLock     - Add Firebase/Exo
  - Remove DataStore    - Event-based updates        Proguard keeps
```

---

## 2. تفاصيل الخطوات الهندسية

### المحور الأول: تنظيف مكتبات أندرويد الزائدة وتقليص الحجم (Dependency Pruning)
- **الملف:** `android/app/build.gradle.kts`
- **الإجراءات:**
  1. إزالة حزم Jetpack Compose الكاملة (`androidx.compose.ui`, `material3`, `material-icons-extended`, `navigation-compose`) وتعطيل `buildFeatures { compose = false }`.
  2. إزالة تبعيات Room Database (`room-runtime`, `room-ktx`, `room-compiler`).
  3. إزالة تبعيات Retrofit و OkHttp (`retrofit`, `converter-gson`, `logging-interceptor`).
  4. إزالة `datastore-preferences`.
  5. حذف ملف الكلاس الفارغ غير المستخدم `AtharBackgroundSyncWorker.kt`.
- **المردود:** تقليص حجم حزمة APK بأكثر من 15-20 ميجابايت، وتسريع تجميع التطبيق بنسبة تفوق 40%.

---

### المحور الثاني: ترشيد الطاقة وإيقاف استنزاف البطارية (Battery & WakeLock Optimization)
- **الملف:** `android/app/src/main/java/com/athar/islamic/AthanForegroundService.java`
- **الإجراءات:**
  1. إلغاء النبض البرمجي المتكرر كل ثانية (`scheduleNextCountdownTick` و `mainHandler.postDelayed(..., 1000L)`).
  2. ضبط شريط الإشعار المستمر ليعتمد كلياً على المكون الأصلي لنظام أندرويد:
     ```java
     builder.setWhen(nextPrayerEpochMs)
            .setShowWhen(true)
            .setUsesChronometer(true)
            .setChronometerCountDown(true);
     ```
     حيث يقوم نظام أندرويد نفسه بتحديث الثواني والدقائق على الشاشة وقفل الشاشة تلقائياً على مستوى الـ Render دون إيقاظ المعالج المركزي (Zero CPU wakeups).
  3. جدولة تحديث الإشعار فقط عند حلول وقت الصلاة التالي عبر منبه دقيق لمرة واحدة، بدلاً من التكرار المستمر.
  4. استبدال `PowerManager.FULL_WAKE_LOCK` المهمل بـ `PARTIAL_WAKE_LOCK` مضبوط بحد زمني آمن، مع الاعتماد على `setShowWhenLocked(true)` و `setTurnScreenOn(true)` في الواجهة.

---

### المحور الثالث: توحيد وتصحيح معرّف الحزمة (Package ID Unification)
- **الملفات:**
  1. `capacitor.config.ts`: تعديل `appId` إلى `com.athar.islamic`.
  2. `android/app/src/main/assets/capacitor.config.json`: تعديل `appId` إلى `com.athar.islamic`.
  3. `src/services/nativePermissionsBridge.ts`: تعديل `ATHAR_PACKAGE_NAME` إلى `com.athar.islamic`.
  4. `android/app/src/main/java/com/athar/islamic/NativePermissionsPlugin.kt`: استبدال القيم الصلبة الاحتياطية بـ `context.packageName ?: "com.athar.islamic"`.
  5. `.github/workflows/build-apk.yml`: تعديل سطر بناء الـ config ليستخدم `com.athar.islamic` دائماً.
  6. `android/app/src/main/AndroidManifest.xml`: ضبط اسم الـ `activity-alias` ليتوافق بسلاسة مع التحديثات.

---

### المحور الرابع: تعزيز قواعد الحماية وتشويش الأكواد (ProGuard / R8 Rules)
- **الملف:** `android/app/proguard-rules.pro`
- **الإجراءات:**
  إضافة قواعد الحفظ الضرورية لنسخ الـ Release:
  - قواعد Firebase (FCM و Crashlytics و Analytics).
  - قواعد مشغل الصوت Media3 ExoPlayer لمنع تشويش الـ Codecs ومشغلات الصوت.
  - قواعد فك الترميز ونماذج JSON المستندة لـ Gson في كاباسيتور.

---

### المحور الخامس: تدقيق تسريبات الذاكرة والمستمعين في الواجهة (Memory & Listeners Audit)
- **الملفات:** `src/App.tsx` والخدمات المشتركة.
- **الإجراءات:**
  - التحقق من تنظيف كافة مؤقتات `setInterval` و `addEventListener` (مثل `athar_navigate_tab` و `downloadComplete`) والتأكد من إزالتها في دوال الـ cleanup للـ `useEffect`.
  - التأكد من عدم تراكم الـ Wakelocks عند إغلاق النوافذ المنبثقة.

---

## 3. خطة الفحص والتحقق (Verification & Testing Plan)

1. **فحص الترجمة والبناء:**
   - تشغيل `compile_applet` بعد كل تعديل منطقي لضمان عدم حدوث أي كسر في تجميع تطبيق الويب أو الأندرويد.
2. **فحص التدقيق النمطي (TypeScript Linting):**
   - تشغيل `lint_applet` للتأكد من خلو المشروع من أخطاء الـ Syntax أو الاستيراد المفقود.
3. **فحص وظائف التطبيق الحيوية:**
   - التحقق من عمل مواقيت الصلاة والأذان.
   - التحقق من تشغيل التلاوات القرآنية والأذكار دون انقطاع.
   - التحقق من استجابة زر الرجوع والنوافذ المنبثقة.
