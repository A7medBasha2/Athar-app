# خطة التدقيق والتحصين الأمني الشامل لمنظومة Firebase في تطبيق «أثر» (Athar Security Hardening Plan)

خطة هندسية معمارية وأمنية معدة من منظور Senior Firebase Security Engineer لتدقيق وتحصين تكامل Firebase في تطبيق أندرويد (`com.athar.islamic`) وتطبيق الويب، وسد كافة الثغرات في قواعد الحماية ومصادقة المستخدمين وتطبيق مبدأ الحد الأدنى من الصلاحيات (Least-Privilege & Zero-Trust).

---

### User Review & Critical Decisions

> [!IMPORTANT]
> تم اعتماد القرارات الأمنية والسياسات التالية بناءً على مراجعة المتطلبات وإجاباتك:

- **Confirmed Decision 1 (Email Verification Policy)**: التحقق الإلزامي من تأكيد البريد الإلكتروني (`request.auth.token.email_verified == true`) لحسابات البريد وكلمة المرور عند كتابة بيانات الملف الشخصي، مع إعفاء مستخدمي حساب Google تلقائياً نظراً للتحقق التلقائي من Google (`firebase.sign_in_provider == 'google.com'`).
- **Confirmed Decision 2 (Collection Scope & Default Deny)**: حصر قواعد قاعدة البيانات Firestore في مجموعة `users/{userId}` فقط، وتفعيل جدار الحماية الشامل والرفض التلقائي الافتراضي لكافة المسارات الأخرى (`match /{document=**} { allow read, write: if false; }`).
- **Confirmed Decision 3 (Firebase App Check & Play Integrity)**: توثيق متطلبات تفعيل Google Play Integrity في وحدة تحكم Firebase لاسم الحزمة `com.athar.islamic` وتوضيح خطوات الاختبار على الأجهزة الحقيقية، دون حظر بيئات التطوير والمحاكيات المحلية.
- **Confirmed Decision 4 (Production Deployment Gate)**: عدم نشر القواعد أو تغيير الإعدادات الإنتاجية آلياً، والالتزام بتقديم القواعد المحصنة وجناح الاختبارات الأمنية التفصيلية لمراجعتها أولاً.

---

### 1. Overview & Current Security Posture

#### 1.1 خدمات Firebase المؤكدة والمستخدمة فعلياً:
- **Firebase Authentication**: تسجيل الدخول بالبريد وكلمة المرور، وحسابات Google الأصلية على أندرويد عبر `@codetrix-studio/capacitor-google-auth` والنوافذ المنبثقة على الويب.
- **Cloud Firestore**: قاعدة بيانات `ai-studio-atharapp-32312ff3-cfb7-4fbd-9f3d-5b70f4ef5f09` لحفظ بيانات الحسابات تحت `users/{userId}`.
- **Firebase Cloud Messaging (FCM)**: استقبال تنبيهات الأذان والمزامنة في الخلفية عبر `AtharFirebaseMessagingService.kt`.
- **Firebase Crashlytics & Analytics**: رصد الأخطاء وتحسين الاستقرار في `AtharApp.kt`.
- **خدمات غير مستخدمة (Non-existent)**: لا وجود لـ Cloud Storage أو Realtime Database أو Cloud Functions.

#### 1.2 المخاطر والثغرات المكتشفة في القواعد الحالية (`firestore.rules`):
1. **غياب شبكة الأمان الافتراضية (No Global Default-Deny Catch-all)**: عدم وجود قاعدة صريحة في أعلى الملف ترفض كافة المسارات الأخرى، مما يخالف الركيزة الأولى لقواعد أمان Firebase.
2. **غياب دالة التحقق المستقلة (`isValidUser()`)**: منطق التحقق مكتوب بشكل مكرر وعشوائي داخل كتل `allow`، مما يفتح ثغرات تحديث غير مراقبة (Update Gaps).
3. **عدم حظر الحقول الشبحية (Ghost Fields / Shadow Updates)**: إمكانية حقن حقول جديدة غير معرفة أثناء التحديثات إذا لم يتم التحقق من المفاتيح المسموح بتعديلها بدقة متناهية.
4. **تاريخ الإنشاء غير المحمي (Mutable `createdAt`)**: إمكانية تزييف أو تعديل وقت إنشاء الحساب أثناء التحديثات.
5. **غياب فحص موثوقية البريد (Unverified Email Write Vulnerability)**: القواعد الحالية لا تفحص ما إذا كان البريد مؤكداً، مما يسمح لأي مستخدم منشأ حديثاً بحقن بيانات دون تحقق.

---

### 2. Proposed Exact Rule Changes (Zero-Trust Delta)

سيتم تحديث ملف `firestore.rules` و `firebase-blueprint.json` بالتحسينات الدقيقة التالية:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 1. Global Default-Deny Catch-all
    match /{document=**} {
      allow read, write: if false;
    }

    // 2. Core Security Primitives & Helpers
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function isValidId(id) {
      return id is string && id.size() > 0 && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$');
    }

    // Email verification check: Google sign-in is inherently verified, email/pass requires token verification
    function isVerifiedUser() {
      return isSignedIn() && (
        request.auth.token.firebase.sign_in_provider == 'google.com' ||
        request.auth.token.email_verified == true
      );
    }

    // 3. Standalone Validation Blueprint (Anti-Update-Gap)
    function isValidUser(data) {
      return data.uid is string
        && data.uid == request.auth.uid
        && data.email is string
        && data.email.size() > 0
        && data.email.size() <= 256
        && data.email.matches('^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$')
        && (!('displayName' in data) || (data.displayName is string && data.displayName.size() <= 120))
        && (!('photoURL' in data) || (data.photoURL is string && data.photoURL.size() <= 2048))
        && (!('createdAt' in data) || (data.createdAt is string && data.createdAt.size() <= 64))
        && (!('updatedAt' in data) || (data.updatedAt is string && data.updatedAt.size() <= 64));
    }

    // 4. Protected User Profile Collection
    match /users/{userId} {
      // Single doc read by owner only. Listing is completely forbidden.
      allow get: if isOwner(userId) && isValidId(userId);
      allow list: if false;

      // Creation: strict keys, verified identity, owner match
      allow create: if isOwner(userId)
                    && isValidId(userId)
                    && isVerifiedUser()
                    && request.resource.data.keys().hasAll(['uid', 'email'])
                    && request.resource.data.keys().hasOnly(['uid', 'email', 'displayName', 'photoURL', 'createdAt', 'updatedAt'])
                    && isValidUser(request.resource.data);

      // Update: strict affected keys, immutable fields (uid & createdAt), owner match
      allow update: if isOwner(userId)
                    && isValidId(userId)
                    && isVerifiedUser()
                    && request.resource.data.uid == resource.data.uid
                    && (!('createdAt' in resource.data) || request.resource.data.createdAt == resource.data.createdAt)
                    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['email', 'displayName', 'photoURL', 'updatedAt'])
                    && isValidUser(request.resource.data);

      // Deletion: owner only
      allow delete: if isOwner(userId) && isValidId(userId);
    }
  }
}
```

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: استقلالية دوال التحقق (`isValidUser`) وفصل الشروط**
  - *Chosen Approach*: نقل كافة قيود الأنواع، والأحجام، والتعبيرات النمطية (Regex) للبريد والاسم إلى دالة `isValidUser(data)` واستدعاؤها في عمليتي `create` و `update`.
  - *Why*: يمنع حدوث "Update-Gaps" ويضمن أن أي حقل يتم تعديله يخضع لنفس قيود الإنشاء الصارمة.

- **Decision 2: حماية الحقول الخالدة (Immortal Fields)**
  - *Chosen Approach*: منع تغيير `uid` نهائياً ومطابقته لـ `request.auth.uid`، وفرض ثبات `createdAt` بحيث لا يمكن لأي عملية تعديل التلاعب بوقت إنشاء الحساب.
  - *Why*: يحمي سلامة السجلات الزمنية ويمنع هجمات الاستيلاء على الحسابات أو استبدال هويات المستخدمين.

- **Decision 3: التحقق الذكي من موثوقية البريد**
  - *Chosen Approach*: فحص `request.auth.token.firebase.sign_in_provider`؛ فإذا كان مزود الدخول هو Google يتم السماح بالكتابة فوراً، وإذا كان مزود الدخول هو البريد وكلمة المرور يتم اشتراط `email_verified == true`.
  - *Why*: احترام تجربة مستخدمي Google Play Services ومنع الحسابات الوهمية من استهلاك قاعدة البيانات.

---

### 4. Technical Architecture & Verification Suite

```
┌────────────────────────────────────────────────────────────────────────┐
│                   FIREBASE ZERO-TRUST SECURITY ARCHITECTURE            │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  [ Client Request: Android (com.athar.islamic) / Web ]                 │
│         │                                                              │
│         ▼                                                              │
│  [ Top-Level Default Deny: match /{document=**} -> allow: false ]      │
│         │                                                              │
│         ▼                                                              │
│  [ Path Guard: isValidId(userId) ] ── (Reject long/malicious doc IDs)  │
│         │                                                              │
│         ▼                                                              │
│  [ Identity Gate: request.auth.uid == userId ]                         │
│         ├── Unauthenticated?  ───> [ 403 PERMISSION_DENIED ]           │
│         └── Other User's ID?  ───> [ 403 PERMISSION_DENIED ]           │
│         │                                                              │
│         ▼                                                              │
│  [ Verification Gate: isVerifiedUser() ]                               │
│         ├── Google Provider?  ───> [ ALLOW ]                           │
│         └── Unverified Email? ───> [ 403 PERMISSION_DENIED ]           │
│         │                                                              │
│         ▼                                                              │
│  [ Schema & Payload Guard: isValidUser(data) ]                         │
│         ├── Ghost / Injected Fields? ──> [ 403 PERMISSION_DENIED ]     │
│         ├── Malformed Email / Len?   ──> [ 403 PERMISSION_DENIED ]     │
│         └── Modified createdAt?      ──> [ 403 PERMISSION_DENIED ]     │
│         │                                                              │
│         ▼                                                              │
│  [ 200 SUCCESS - Operation Committed to Cloud Firestore ]              │
└────────────────────────────────────────────────────────────────────────┘
```

#### 4.1 خطة جناح الاختبارات الأمنية (Security Test Matrix):
سنقوم بإنشاء ملف اختبارات أمنية شامل (`firestore.rules.test.ts` أو سكربت فحص تفصيلي) يغطي الحالات التالية:
1. **Authenticated Owner Access**: اختبار نجاح المستخدم المصرح له في قراءة وكتابة وتحديث ملفه الشخصي.
2. **Unauthenticated Access**: اختبار حظر أي طلب قراءة أو كتابة صادر من زائر غير مسجل (Guest / Unauthenticated) على `users/{userId}` ومسارات النظام.
3. **Cross-User Access**: محاولة المستخدم (User A) قراءة أو تعديل أو حذف بيانات المستخدم (User B) والتأكد من رفضها بـ `PERMISSION_DENIED`.
4. **List Queries Blocking**: محاولة تنفيذ استعلام `collection('users')` وسحب كافة المستخدمين والتأكد من حظره بنسبة 100%.
5. **Ghost Field Injection**: محاولة إرسال حقل غير مصرح به مثل `role: 'admin'` أو `isVIP: true` والتأكد من الرفض التلقائي.
6. **Immutable Field Modification**: محاولة تغيير `createdAt` أو `uid` أثناء التحديث والتأكد من فشلها.
7. **Email Spoofing & Invalid Format**: محاولة إدخال بريد إلكتروني بصيغة غير صحيحة أو بدون علامة `@`.

#### 4.2 خطوات تجهيز Firebase App Check و Play Integrity (Manual Console Guide):
1. الدخول إلى وحدة تحكم Firebase (Firebase Console) لمشروع `gen-lang-client-0502357883`.
2. الانتقال إلى **App Check** -> **Apps** -> اختيار تطبيق أندرويد المعرف بـ `com.athar.islamic`.
3. ربط موفر **Play Integrity**:
   - إدخال شهادة SHA-256 الخاصة بحزمة التوزيع في Google Play Console.
   - تحديد مدة صلاحية رمز التحقق (TTL) بما يعادل 1 ساعة.
4. تفعيل وضع المراقبة أولاً (**Monitoring Mode**) لمدة أسبوع للتحقق من عدم تأثر أي مستخدم شرعي قبل النقل لوضع الإلزام (**Enforce**).
