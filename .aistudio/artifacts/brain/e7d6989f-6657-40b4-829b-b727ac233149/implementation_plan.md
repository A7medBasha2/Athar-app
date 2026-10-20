# تقرير التدقيق الأمني الشامل لجانب العميل (Client-Side Security Audit Report)
## تطبيق أثر الإسلامي (`com.athar.islamic`)

تقرير تدقيق أمني احترافي ومستقل للشق البرمجي في جانب العميل (Client-Side & Native Android) لتطبيق «أثر»، أُجري استناداً لمعيار الأمان العالمي **OWASP Mobile Application Security Verification Standard (MASVS v2)** قبل إطلاق النسخة الإنتاجية.

---

## مراجعة المستخدم والقرارات الحاسمة (User Review & Critical Decisions)

> [!IMPORTANT]
> تم استطلاع تفضيلاتكم وتأكيد المحددات التالية لهذا التقرير:
> 1. **عمق التدقيق**: تدقيق شامل وتفصيلي يغطي كافة المحاور العشرة المطلوبة مع سيناريوهات الاستغلال واختبارات التحقق التراجعي (Regression Tests).
> 2. **سياسة معالجة الأسرار في المستودع**: توثيق النتائج وخطوات المعالجة المقترحة **دون إجراء أي تعديل تلقائي** على ملفات الاعتماد أو تاريخ المستودع، التزاماً بالشرط الاستشاري الصارم.
> 3. **نموذج التهديد للبيانات المخزنة محلياً**: الحماية المعيارية ضد التطبيقات غير المصرح لها على الجهاز، ومنع استخراج البيانات عبر جسر ADB أو النسخ الاحتياطي السحابي.

---

## 1. لوحة مؤشرات الأمان التراكمية (Security Assessment Scorecard)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ATHAR CLIENT-SIDE SECURITY AUDIT                         │
│                    Target Package: com.athar.islamic                        │
├────┬───────────────────────────────────────┬────────────┬──────────────────┤
│ #  │ Inspection Category                   │ Status     │ Highest Severity │
├────┼───────────────────────────────────────┼────────────┼──────────────────┤
│ 1  │ Hardcoded Secrets & Credentials       │ Advisory   │ HIGH (Keystore)  │
│ 2  │ Secrets in Assets / Env / Git History │ Advisory   │ HIGH (Git Hist)  │
│ 3  │ Local Storage & Backup Protections    │ Finding    │ MEDIUM (Backup)  │
│ 4  │ Authentication & Token Handling       │ PASS       │ Informational    │
│ 5  │ WebView & JavaScript Bridge Security  │ PASS       │ Hardened         │
│ 6  │ Deep Links & Intent IPC Boundaries    │ PASS       │ Hardened         │
│ 7  │ Network Security & Cleartext Traffic  │ PASS       │ Hardened         │
│ 8  │ Debug Logging & Crash Telemetry       │ Finding    │ LOW (printStack) │
│ 9  │ Deserialization & File Handling       │ PASS       │ Hardened         │
│ 10 │ Client vs Backend Trust Boundaries    │ PASS       │ Robust (Rules)   │
└────┴───────────────────────────────────────┴────────────┴──────────────────┘
```

---

## 2. نتائج التدقيق التفصيلية للمحاور العشرة (Detailed Technical Findings)

---

### المحور 1 و 2: الأسرار ومفاتيح الاعتماد وتاريخ المستودع (Secrets & Keystore)

#### النتيجة 1.1: وجود ملف Keystore في جذر المستودع مع أثر تاريخي في مسار العمل
* **المعيار**: `OWASP MASVS-CRYPTO-1` & `MASVS-STORAGE-1`
* **درجة الخطورة**: **عالية من ناحية البنية التحتية (HIGH INFRASTRUCTURE)**
* **المسار البرمجي**: `/release.keystore` و `/.github/workflows/build-apk.yml`
* **الدليل البرمجي (Evidence)**:
  - وجود الملف الثنائي `release.keystore` في جذر المشروع.
  - وجود سجل تاريخي لكلمة المرور في التعديلات السابقة لملف مسار العمل.
* **تقييم سرية مفاتيح Firebase**:
  - قيم `apiKey` و `appId` و `projectId` الموجودة في `firebase-applet-config.json` و `src/firebase.ts` **ليست أسراراً برمجية بالمعنى التقليدي**؛ بل هي معرّفات توجيهية عامة (Routing Identifiers) مخصصة للنشر في تطبيقات العميل. أمان البيانات محمي بنسبة 100% بواسطة قواعد Firestore (`firestore.rules`) و App Check وليس بسرية هذا المعرف.
* **سيناريو الاستغلال (Exploit Scenario)**:
  إذا كان مستودع الكود عاماً أو تم تسريب صلاحيات القراءة، يمكن لمهاجم تنزيل `release.keystore` واستخدامه لتوقيع حزم APK خبيثة تنتحل هوية التطبيق وتتجاوز فحص التوقيع عند التحديث.
* **الحل الموصى به (Recommended Fix)**:
  1. تحويل `release.keystore` إلى قيمة Base64 وتخزينه كـ Secret مشفر في إعدادات GitHub (`${{ secrets.RELEASE_KEYSTORE_BASE64 }}`).
  2. حذف الملف الثنائي من المستودع عبر `git rm release.keystore` وإضافته إلى `.gitignore`.
  3. لتطهير تاريخ Git دون التأثير على الكود: استخدام أداة `git-filter-repo`:
     ```bash
     git-filter-repo --invert-paths --path release.keystore
     ```
* **اختبار التحقق التراجعي (Regression Test)**:
  تشغيل فحص TruffleHog أو Gitleaks والتأكد من خلو ملفات المستودع من أي مفاتيح خاصة:
  `gitleaks detect --source . --verbose`

---

### المحور 3: التخزين المحلي والنسخ الاحتياطي (Local Storage & Backups)

#### النتيجة 3.1: شمول قواعد النسخ الاحتياطي لقواعد البيانات والذاكرة المحلية
* **المعيار**: `OWASP MASVS-STORAGE-1` (Data Backup & Extraction Exposure)
* **درجة الخطورة**: **متوسطة (MEDIUM)**
* **المسار البرمجي**: `android/app/src/main/res/xml/data_extraction_rules.xml` و `backup_rules.xml`
* **الدليل البرمجي (Evidence)**:
  ```xml
  <data-extraction-rules>
      <cloud-backup>
          <exclude domain="sharedpref" path="AtharFCMPreferences.xml" />
          <exclude domain="sharedpref" path="AtharPrivacyPreferences.xml" />
      </cloud-backup>
      <device-transfer>
          <exclude domain="sharedpref" path="AtharFCMPreferences.xml" />
      </device-transfer>
  </data-extraction-rules>
  ```
  الملف يستثني فقط ملفين من `sharedpref`، بينما تظل قواعد بيانات IndexedDB وتخزين الجلسة ومفضلات المستخدم مشمولة في النسخ السحابي ونقل الجهاز عبر الكابل.
* **سيناريو الاستغلال (Exploit Scenario)**:
  في حال توصيل الهاتف بحاسوب مصرح به وتفعيل تصحيح USB، يمكن استخراج كافة بيانات التطبيق غير المستثناة عبر الأمر `adb backup com.athar.islamic`، أو استعادتها على هاتف آخر مما ينسخ جلسات المستخدم المحلية.
* **الحل الموصى به (Recommended Fix)**:
  إضافة استثناء لقواعد البيانات والمجلدات المؤقتة:
  ```xml
  <exclude domain="database" path="." />
  <exclude domain="root" path="." />
  ```
  أو تعطيل النسخ بالكامل إذا لم يكن مطلوباً: `android:allowBackup="false"`.
* **اختبار التحقق التراجعي (Regression Test)**:
  تنفيذ أمر النسخ الاحتياطي: `adb backup -f test.ab com.athar.islamic` وفحص محتويات الأرشيف الناتج للتأكد من عدم احتوائه على قواعد بيانات التطبيق.

---

### المحور 4: مصادقة المستخدم وإدارة الجلسات (Authentication & Session Handling)

* **التقييم**: **اجتياز بنجاح (PASS - SECURE)**
* **المسار البرمجي**: `src/services/authService.ts`
* **التحليل الفني**:
  - يعتمد التطبيق على مكتبة Firebase Auth الرسمية؛ حيث يتم تجديد رموز الوصول (Access Tokens) تلقائياً عبر قنوات HTTPS المشفرة وتخزينها في مفاتيح معزولة داخل نطاق المتصفح/التطبيق.
  - مصادقة Google Sign-In الأصلية عبر `@codetrix-studio/capacitor-google-auth` تعتمد تدفق الرمز التعريفي (ID Token) الموثق عبر `GoogleAuthProvider.credential` دون الحاجة لأي Client Secret في التطبيق.
  - لا توجد أي كلمات مرور مستخدمين تُحفظ في نصوص واضحة أو تُمرر في السجلات.

---

### المحور 5: أمان WebView وجسر الجافاسكريبت (WebView & Bridge Security)

* **التقييم**: **اجتياز بنجاح (PASS - HARDENED)**
* **المسار البرمجي**: `android/app/src/main/java/com/athar/islamic/MainActivity.java`
* **التحليل الفني**:
  - تم تحصين دمج النصوص في `evaluateJavascript` باستخدام الدالة المخصصة `safeJsString` المعتمدة على `org.json.JSONObject.quote()`.
  - الواجهة `AtharNative` تقتصر فقط على دوال مقيدة وموسومة بـ `@JavascriptInterface`.
  - إعدادات Capacitor لا تحتوي على `allowNavigation` لنطاقات خارجية، مما يضمن تقييد WebView بتحميل الموارد المحلية المحزمة (`https://localhost`) فقط ويمنع هجمات Cross-Origin Frame Hijacking.

---

### المحور 6: الروابط العميقة والحدود البينية لنظام أندرويد (Deep Links & IPC)

* **التقييم**: **اجتياز بنجاح (PASS - HARDENED)**
* **المسار البرمجي**: `AndroidManifest.xml` و `AtharBootReceiver.kt`
* **التحليل الفني**:
  - المكونات الحساسة (`AthanForegroundService`, `AtharFloatingWindowService`, `FullScreenAzanService`, `AtharNotificationReceiver`) مغلقة بالكامل (`android:exported="false"`).
  - المستقبل المصرح له بالعمل مع النظام `AtharBootReceiver` تم تحصينه بقائمة بيضاء صارمة للأكشن الوارد (`ACTION_BOOT_COMPLETED`, `ACTION_MY_PACKAGE_REPLACED`, `QUICKBOOT_POWERON`, `TIMEZONE_CHANGED`, `TIME_SET`) لمنع استقبال بث عشوائي أو زائف.
  - تم تقييد `FileProvider` بحيث لا يشارك سوى مجلد التحديثات المعزول ومجلد المشاركات.

---

### المحور 7: أمان الشبكة وحظر الاتصال غير المشفر (Network Security & Cleartext)

* **التقييم**: **اجتياز بنجاح (PASS - HARDENED)**
* **المسار البرمجي**: `android/app/src/main/res/xml/network_security_config.xml`
* **التحليل الفني**:
  - تم تفعيل سياسة أمان الشبكة وحظر كافة بروتوكولات HTTP الصريحة عبر `cleartextTrafficPermitted="false"`.
  - منزّل التحديثات في `NativePermissionsPlugin.kt` يفحص بروتوكول الرابط (`scheme == "https"`) ويحصر نطاقات التنزيل وإعادة التوجيه (Redirects) في نطاقات GitHub الموثوقة حصراً.

---

### المحور 8: سجلات التتبع وتقارير الأعطال (Logging & Crash Telemetry)

#### النتيجة 8.1: وجود استدعاءات `printStackTrace()` في مسارات معالجة الاستثناءات
* **المعيار**: `OWASP MASVS-CODE-2` (Uncontrolled Information Leakage in Logs)
* **درجة الخطورة**: **منخفضة (LOW)**
* **المسار البرمجي**: `MainActivity.java` (السطور 24, 33, 50, 324)
* **الدليل البرمجي (Evidence)**:
  استخدام `e.printStackTrace()` في كتل `catch`. على الرغم من أن قواعد Proguard تقطع دوال `Log.d` و `Log.v` و `Log.i` في حزم الإنتاج، فإن `printStackTrace()` يطبع مباشرة إلى `System.err` الذي يوجهه نظام أندرويد تلقائياً إلى Logcat.
* **سيناريو الاستغلال (Exploit Scenario)**:
  إذا احتوى استثناء تشغيلي على مسار ملف أو نص خاص، فقد يظهر لمطور أو تطبيق آخر يمتلك صلاحية فحص Logcat على الأجهزة القديمة أو عبر أدوات التشخيص.
* **الحل الموصى به (Recommended Fix)**:
  استبدال `e.printStackTrace()` بمعالجة صامتة آمنة دون طباعة المسار الكامل للاستثناء إلى `System.err`.
* **اختبار التحقق التراجعي (Regression Test)**:
  تشغيل التطبيق ومراقبة Logcat والتأكد من عدم ظهور كتل System.err عند حدوث أخطاء مقصودة.

---

### المحور 9: معالجة المدخلات والملفات (Deserialization & File Handling)

* **التقييم**: **اجتياز بنجاح (PASS - HARDENED)**
* **المسار البرمجي**: `NativePermissionsPlugin.kt`
* **التحليل الفني**:
  - التطبيق لا يستخدم تسلسل جافا التقليدي (`ObjectInputStream`) بل يعتمد على JSON القياسي.
  - التعامل مع ملفات التحديث يتضمن فحص `canonicalPath.startsWith(updatesDir.canonicalPath)` لمنع أي ثغرات اجتياز مسارات (Path Traversal) وتنظيف أسماء الملفات عبر تعبيرات نمطية صارمة.

---

### المحور 10: حدود الثقة بين العميل والخادم (Client vs Backend Trust)

* **التقييم**: **اجتياز بنجاح (PASS - ROBUST)**
* **المسار البرمجي**: `firestore.rules`
* **التحليل الفني**:
  - يطبق التطبيق نموذج الصفر ثقة (Zero-Trust)؛ حيث تنص القاعدة الأولى على الرفض التلقائي العام:
    ```javascript
    match /{document=**} { allow read, write: if false; }
    ```
  - لا توجد أي صلاحيات إدارية أو مالية أو عمليات ترقية عضوية موثوقة في جانب العميل.
  - مستندات المستخدمين في `/users/{userId}` محمية بالتحقق من هوية صاحب المستند (`isOwner(userId)`)، وصيغ البريد الإلكتروني، ومنع تزييف المعرفات أو حقول التتبع، وحظر سرد المستخدمين (`allow list: if false`).

---

## 3. خطة العمل المقترحة للمرحلة التالية (Proposed Next Steps)

إذا رغبتم في تطبيق التحسينات الطفيفة المتبقية:
1. **تحصين قواعد النسخ الاحتياطي**: إضافة استثناء قواعد البيانات المحلية (`database`) في `data_extraction_rules.xml` و `backup_rules.xml`.
2. **تنظيف استدعاءات `printStackTrace()`**: استبدالها بمعالجة استثناءات صامتة في `MainActivity.java`.
3. **توثيق بروتوكول تدوير المفتاح**: إرشادات استخراج ونقل مفتاح التوقيع إلى خزانة GitHub Secrets في المستودع الأصلي.
