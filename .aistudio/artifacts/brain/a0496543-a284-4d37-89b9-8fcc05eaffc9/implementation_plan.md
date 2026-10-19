# خطة المعمارية الهندسية الموحدة: النافذة العائمة الفردية الصارمة (Singleton Overlay) ومشغل Media3 ExoPlayer السريع

حل جذري ونهائي لمشكلة تراكم النوافذ العائمة فوق بعضها على شاشات أندرويد، والقضاء التام على تعليق الصوت وتكرار المشغلات من خلال مشغل Media3 ExoPlayer الأحادي والتحديث المباشر للواجهة دون إعادة بناء.

---

## User Review & Critical Decisions

> [!IMPORTANT] تم تأكيد القرارات التصميمية والوظيفية التالية وفق إجاباتك:
> - **تحديث الواجهة الحالية فورياً (In-Place Update)**: عند وصول تنبيه جديد أثناء ظهور نافذة عائمة بالفعل على الشاشة، سيتم تحديث النصوص والبيانات (العنوان، النص، الشارة، وزر الإجراء) وإعادة تعيين الصوت وشريط التقدم مباشرة داخل نفس الـ View دون استدعاء `windowManager.addView` إطلاقاً، مما يمنع التراكم أو الوميض بنسبة 100%.
> - **الإغلاق التلقائي الفوري عند انتهاء الصوت**: ربط شريط التقدم وحدث انتهاء الصوت في ExoPlayer (`Player.STATE_ENDED`) لإغلاق النافذة العائمة تلقائياً فور اكتمال المقطع الصوتي دون ترك أي خدمات عالقة بالخلفية.

---

## 1. Overview & Core Concept

- **الهدف الأساسي**: منع ظهور أكثر من نافذة عائمة واحدة على شاشة أندرويد في أي وقت كان، وضمان تحرير الصوت والذاكرة بالكامل فور الإغلاق أو التحديث.
- **الفئة المستهدفة**: مستخدمو تطبيق «أثر» على هواتف أندرويد (خصوصاً أجهزة شاومي وسامسونج وغيرها التي تعاني من تراكم النوافذ العائمة أو حجز الـ MediaPlayers).
- **القيمة المضافة**: تجربة استخدام ملكية سلسة وخفيفة، صوت ينطلق بمللي ثوانٍ فورية عبر ExoPlayer، واجهة فاخرة لا تتراكم ولا تتكرر ولا تُهنج النظام أبداً.

---

## 2. Technical Architecture & Component Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Android Native Alert Trigger                         │
│       (Push, AlarmReceiver, or NativePermissionsPlugin Bridge)         │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│              AtharFloatingWindowService (Strict Singleton)             │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Check: Is floatingRootView already attached to WindowManager?  │   │
│   └───────────────┬────────────────────────────────┬───────────────┘   │
│                   │ YES                            │ NO                │
│                   ▼                                ▼                   │
│      ┌─────────────────────────┐      ┌─────────────────────────┐      │
│      │ In-Place UI Update      │      │ Safely Clean Old Views  │      │
│      │ updateViewsWithData(...)│      │ & windowManager.addView │      │
│      └────────────┬────────────┘      └────────────┬────────────┘      │
│                   │                                │                   │
│                   └────────────────┬───────────────┘                   │
│                                    ▼                                   │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                      FastAudioPlayer                           │   │
│   │  (Singleton Media3 ExoPlayer Controller with Local/URL cache)  │   │
│   │                                                                │   │
│   │  - Instant stopPreviousAndPlayNew(audioUrl)                    │   │
│   │  - Player.Listener -> STATE_ENDED -> Auto Dismiss             │   │
│   │  - Progress Tracker synced with ExoPlayer currentPosition      │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Engineering Strategy

### 3.1 نمط الـ Singleton الصارم للنافذة العائمة (Single Overlay Instance)
1. **التحقق من حالة الـ View المعروض**:
   - وجود متغير مرجعي `@Volatile private var floatingRootView: View? = null` ومؤشرات العناصر التفاعلية (Title, Body, Badge, ActionButton, AudioBar, ProgressBar).
   - عند استلام أمر `ACTION_SHOW`:
     - إذا كان `floatingRootView` موجوداً بالفعل ومتصلاً بـ `windowManager` (`view.isAttachedToWindow == true`)، يتم استدعاء دالة `updateExistingView(alertData)` لتحديث النصوص والألوان وزر الإجراء في التو واللحظة دون أي تعديل في الـ `WindowManager`.
     - إذا لم يكن متصلاً، يتم تنظيف أي مرجع قديم والتأكد من إزالة أي Views سابقة عبر `windowManager.removeView` بأمان داخل `try/catch`، ثم إضافة الـ View الجديد لمرة واحدة فقط.
2. **تطهير آمن وشامل عند الإغلاق (`dismissAllAndStop`)**:
   - إيقاف مشغل الصوت فوراً.
   - إلغاء كافة الـ Handlers والـ Runnables والـ Timers لتجنب أي تسريب للذاكرة.
   - إزالة الـ View من الـ `WindowManager` مع التحقق من `isAttachedToWindow`.
   - استدعاء `stopForeground(true)` و `stopSelf()`.

### 3.2 هندسة مشغل الصوت السريع `FastAudioPlayer.kt` المعتمد على Google Media3
1. **كائن أحادي (Singleton Object)**:
   - إنشاء كلاس/كائن `FastAudioPlayer` لإدارة `ExoPlayer` واحد وحيد لتطبيق أثر بالكامل.
   - ضبط `AudioAttributes` بنوع `USAGE_MEDIA` و `CONTENT_TYPE_MUSIC`.
   - إدارة `AudioFocus` مع النظام بحيث يتوقف فوراً عند المكالمات الهاتفية أو عند تشغيل تنبيه آخر.
2. **معالجة المسارات الفورية (Local Assets & URLs)**:
   - قراءة الملفات الصوتية المدمجة في حزمة التطبيق (`assets/public/audio/...`) عبر `AssetDataSource` أو `AssetFileDescriptor` لتشغيل لحظي بزمن استجابة 0ms.
   - دعم المسارات البعيدة والروابط مع مهلة اتصال قصيرة لمنع التهنيج في حال ضعف الإنترنت.
3. **التحكم والإنهاء اللحظي**:
   - دالة `play(context, audioSource, onProgress, onEnded, onError)` تقوم بإيقاف أي تشغيل سابق فوراً `exoPlayer?.stop()`, `exoPlayer?.clearMediaItems()`.
   - دالة `release()` و `stop()` تفكك الموارد بنسبة 100%.

### 3.3 ربط شريط التقدم والتخلص من التهنيج (STATE_ENDED Synchronization)
1. **مزامنة شريط التقدم بدقة 100%**:
   - استخدام `Player.Listener` لمراقبة التغيرات في موضع التشغيل والمدة الفعلية.
   - عند الوصول إلى `Player.STATE_ENDED`، يتم إرسال رد نداء (Callback) فوري للنافذة العائمة لتنفيذ الإغلاق التلقائي دون أي تأخير أو بقاء شريط التقدم عالقاً.
2. **صمام أمان زمني (Fallback Watchdog Timer)**:
   - في حال كان التنبيه بدون صوت أو فشل تحميل الصوت عبر الشبكة، يعمل عداد أمان (15 ثانية افتراضياً أو حسب إعدادات التنبيه) ليغلق النافذة تلقائياً ويمنع بقاءها معلقة على الشاشة إطلاقاً.

### 3.4 مراجعة توافق Gradle و Android Manifest
- التأكد من سلامة مكتبات Media3 في `android/app/build.gradle.kts`:
  ```kotlin
  implementation("androidx.media3:media3-exoplayer:1.2.1")
  implementation("androidx.media3:media3-session:1.2.1")
  implementation("androidx.media3:media3-ui:1.2.1")
  ```
- التأكد من تسجيل `FastAudioPlayer` وتوافقه مع إصدارات أندرويد من SDK 26 إلى SDK 36.

---

## 4. Verification & Testing Steps

1. **التحقق من صحة الكود والتجميع**: تشغيل `compile_applet` و `lint_applet` لضمان خلو التعديلات من أية أخطاء.
2. **فحص الـ Singleton وتعدد الإشعارات**: التحقق من أن إرسال عدة تنبيهات متتالية لا يُنشئ سوى نافذة واحدة ويقوم بتحديث محتواها فوراً.
3. **فحص الصوت مع Media3**: التحقق من توقف الصوت القديم فور وصول صوت جديد أو فور الضغط على زر الإغلاق، وتفريغ ExoPlayer فور اكتمال المقطع.
4. **فحص شريط التقدم**: التأكد من أن شريط التقدم ينتهي بدقة مع نهاية الصوت ثم تختفي النافذة بسلاسة تامة.
