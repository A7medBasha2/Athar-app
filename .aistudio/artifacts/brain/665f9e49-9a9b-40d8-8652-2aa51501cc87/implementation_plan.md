# خطة تقليص حجم تطبيق «أثر» وتعزيز كفاءة الأداء (App Size Optimization & R8 Shrinking)

خطة معمارية تفصيلية لتقليص حجم تطبيق «أثر» بنسبة تتجاوز 60%، وضغط كافة الصور والملفات الصوتية إلى صيغ حديثة عالية الكفاءة (WebP & Compressed Audio)، وتفعيل أقصى درجات الضغط والتقليص (R8 Dead Code Elimination & Resource Shrinking) في نظام أندرويد لإنتاج حزمة APK سريعة وخفيفة جداً.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> تم تأكيد الخيارات الاستراتيجية التالية بناءً على إجاباتك في مرحلة الاستيضاح:

- **Confirmed Decision 1 (Audio Handling)**: ضغط كافة الملفات الصوتية المحلية (الأذان، التنبيهات، الأدعية) باستخدام محرك ضغط عالي الكفاءة مع الحفاظ على عملها دون اتصال بالإنترنت (100% Offline)، وتجنب الازدواجية بين مجلدات النظام ومجلدات الويب.
- **Confirmed Decision 2 (Images & Assets)**: تحويل جميع الصور والأيقونات النشطة في التطبيق إلى صيغة **WebP** الحديثة، وحذف النسخ والمسودات التجريبية القديمة غير المستخدمة في مجلد `src/assets/images` نهائياً لتوفير أكثر من 25 ميجابايت فوراً.
- **Confirmed Decision 3 (Android ProGuard & R8 Optimization)**: تفعيل منظومة التقليص الكاملة في أندرويد (`isShrinkResources = true` مع `isMinifyEnabled = true`)، وتنقيح قواعد `proguard-rules.pro` لإلغاء استبقاء الأكواد الكاملة والسماح لمحرك R8 بحذف الميثودات والموارد غير المستخدمة من Firebase و Media3 و Google Play Services.

---

### 1. Overview & Core Concept

- **What It Does**: يعيد هيكلة مجلدات الأصول، ويضغط الوسائط المرئية والصوتية، ويضبط محركات التحزيم في Vite و Gradle لإنتاج حزمة تطبيق خفيفة ورشيقة وسريعة الإقلاع على كافة أجهزة أندرويد ومتصفحات الويب دون أي فقدان في الجودة البصرية أو الصوتية أو الميزات الشرعية للتطبيق.
- **Target Audience / Persona**: كافة مستخدمي تطبيق «أثر» وخاصة أصحاب الأجهزة ذات السعات التخزينية المحدودة أو شبكات الاتصال البطيئة، لضمان تحميل وتحديث التطبيق في ثوانٍ معدودة.
- **Key Value**: تقليص حجم التثبيت بنسبة تفوق 60%، تقليل استهلاك ذاكرة الوصول العشوائي (RAM) بنسبة ملحوظة عبر استخدام صور WebP سريعة الفك، وتسريع إقلاع واجهات الأذان والمصحف والشجرة بنسبة 100%.

---

### 2. User Experience & Visual Design

- **Key User Flows**: 
  - تجربة المستخدم تظل **مطابقة تماماً للهوية الملكية الفاخرة** (الأسود والذهب عيار 24) مع تحسن فوري في سرعة فتح الشاشات وتلاشي أي تأخير عند تحميل خلفيات المساجد أو تشغيل الأذان.
  - شاشة الأذان بكامل الشاشة ومحراب الترديد يستمران في العمل بجودة 4K/HD وبخلفيات مساجد مذهلة ولكن بحجم ملفات أصغر بـ 5 أضعاف بفضل صيغة WebP.
  - جميع الأيقونات والرموز تظل نقية وحادة جداً على الشاشات فائقة الدقة (Retina / AMOLED).

- **Visual Identity & Theme**:
  - الحفاظ الصارم على ألوان وتدرجات نظام «أثر» الملكي: `--bg-canvas: #0A0A0A`، `--gold-primary: #D6B36A`، مع ضمان سلامة قنوات الشفافية (Alpha Channel) في شعارات المحراب وشجرة الأثر عند تحويلها إلى WebP Lossless.

- **Component Styling & Layout**:
  - تحديث استيرادات ملفات الصور في مكونات React (`App.tsx`, `DynamicArtworkBackground.tsx`, `AtharBrandLogo.tsx`, `FullScreenAzanOverlayModal.tsx`, `storiesAndExploreData.ts`, `artworksData.ts`) لتشير بسلاسة إلى امتدادات `.webp` المحسنة.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: إزالة النسخ المهجورة من الصور (Dead Assets Pruning)**
  - *Chosen Approach*: فحص مرجعي شامل لكافة ملفات `src/assets/images` ومقارنتها بكود التطبيق، وحذف ما يزيد عن 20 صورة غير مستخدمة (مسودات وتجارب سابقة للأشجار وشعارات قديمة).
  - *Why*: توفير أكثر من 20 ميجابايت من الحجم الميت الذي كان يُحزم عبثاً في التطبيق.
  - *Alternatives Considered*: إبقاء الصور القديمة كان سيهدر سعة المستخدم ويزيد زمن التحزيم دون أي فائدة للمستخدم.

- **Decision 2: تحويل الصور النشطة إلى WebP بنسبة جودة 80%–90%**
  - *Chosen Approach*: استخدام أداة تحويل احترافية لتوليد ملفات WebP بجودة متفوقة مع حفظ الشفافية للأيقونات وشعار الشجرة.
  - *Why*: صيغة WebP مدعومة في Android 4.0+ ومتصفحات الويب الحديثة كافة وتوفر ضغطاً أعلى بنسبة 35% إلى 70% مقارنة بـ JPEG و PNG دون أي فارق مرئي بالعين المجردة.

- **Decision 3: تنظيف الازدواجية الصوتية وضغط الملفات إلى 64kbps CBR/VBR**
  - *Chosen Approach*: تحويل وضغط ملفات الأذان والأدعية إلى 64kbps بمعدل عينات 44.1kHz متوافق مع كافة مشغلات الصوت، وإلغاء التكرار بين `public/audio` ومجلدات الأصول في أندرويد.
  - *Why*: يوفر حوالي 12–14 ميجابايت إضافية في حجم التثبيت مع بقاء صوت التلاوة والأذان ناصعاً وواضحاً وخالياً من التشويش.

- **Decision 4: تفعيل `isShrinkResources = true` وتنقيح قواعد ProGuard**
  - *Chosen Approach*: تمكين تقليص الموارد في `buildTypes.release`، واستبدال قواعد `-keep class com.google.firebase.** { *; }` الفضفاضة بالقواعد الدقيقة الموصى بها رسمياً من Google Firebase و Media3 و Play Services.
  - *Why*: السماح لمحرك R8 باستبعاد آلاف الدوال والكلاسات الميتة وتفريغ ملفات `classes.dex` من الكود غير المستدعى، مما يخفض حجم الكود البرمجي بمقدار 5 إلى 10 ميجابايت.

---

### 4. Technical Architecture & Data Strategy (Technical Reference)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     ATHAR ASSET & BUILD PIPELINE                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [ Raw Assets ]                                                         │
│     ├── Heavy PNG/JPGs (40MB)   ───>  [ WebP Converter ]  ───> (3.5MB)  │
│     ├── Unused Variations       ───>  [ Dead Asset Sweep ]───> (Purged) │
│     └── Raw MP3 Audio (18MB)    ───>  [ FFmpeg Audio Opt ]───> (4.5MB)  │
│                                                                         │
│  [ React & Vite Web Layer ]                                             │
│     ├── Updated Asset References (*.webp / optimized audio)             │
│     └── Tree-shaken JS Bundle (Vite Rollup output)                      │
│                                                                         │
│  [ Android Gradle & R8 Optimization Layer ]                             │
│     ├── isMinifyEnabled = true                                          │
│     ├── isShrinkResources = true                                        │
│     ├── Optimized proguard-rules.pro (Targeted keep rules)              │
│     └── Deduplicated Native Assets (:app/src/main/assets)               │
│                                                                         │
│                                  │                                      │
│                                  ▼                                      │
│               [ Ultra-Lightweight Athar Production Build ]               │
│               • Total APK size reduced by > 60%                         │
│               • Sub-second Cold Start                                   │
│               • 100% Offline Capability Preserved                       │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Execution Steps:

1. **Asset Pruning & Optimization:**
   - حذف الصور المعزولة غير المرتبطة بأي استيراد في `src/assets/images`.
   - تحويل الصور النشطة المتبقية إلى صيغة `.webp` فائقة الجودة.
   - تحويل شعارات المحراب والشجرة (`.png`) إلى WebP شفاف للحفاظ على دقة الحواف الذهبية.
   - ضغط ملفات الصوت في `public/audio` وتحديث النسخ المتطابقة في مجلد أندرويد لإنهاء الازدواجية.

2. **Source Code References Update:**
   - تحديث مسارات الاستيراد في `artworksData.ts`, `islamicImagesData.ts`, `DynamicArtworkBackground.tsx`, و `FullScreenAzanOverlayModal.tsx` و `App.tsx` لتشير إلى امتدادات `.webp`.
   - التأكد من عدم وجود أي استيراد مكسور أو مسار تالف.

3. **Android Gradle & ProGuard/R8 Hardening:**
   - إضافة `isShrinkResources = true` في `android/app/build.gradle.kts`.
   - تحديث `proguard-rules.pro` لاستبعاد قواعد الحفظ المفرطة (`{ *; }`) للسماح لـ R8 بحذف الميثودات غير المستخدمة، مع الحفاظ على الكلاسات الحيوية (Services, BroadcastReceivers, Models).
   - تنظيف مجلد `android/app/src/main/assets/public` المزدوج للتأكد من أن النسخ المتكررة لا تُحزم مرتين في الـ APK.

4. **Verification & Build Validation:**
   - تشغيل `compile_applet` للتأكد من سلامة بناء الويب ونجاح تحزيم Vite بالكامل.
   - تشغيل `lint_applet` للتحقق من عدم وجود أي خطأ في كتابة أسماء الملفات أو المسارات.
   - فحص الحجم الإجمالي لمجلد الأصول ومقارنته بالحجم الأصلي لإثبات مقدار الوفر المتحقق.
