# تقرير التحقق النهائي لقواعد أمان مجتمع «جماعة» (المرحلة 1)
## Phase 1 — Gamaa Firestore Security Rules Hardening & Verification Report

> [!IMPORTANT]
> **صفة التنفيذ:** تنفيذ وتحقق محلي صارم داخل مساحة العمل (Strict Local Workspace Hardening & Verification).
> **الضمانات الصارمة:**
> 1. لم يتم نشر أي قواعد إلى Firebase (`deploy_firebase` لم يُستدعَ قط).
> 2. لم يتم المساس ببيانات الإنتاج أو الفوترة أو إضافة أي Cloud Functions أو برمجيات خلفية مدفوعة.
> 3. كافة ميزات وقواعد أمان تطبيق «أثر» الأصلية (القبلة، القرآن، الأذان، الإشعارات، الصوتيات، الأوسمة، سجل XP) محفوظة بنسبة 100% دون أي تغيير في الأسطر 1–102 من `firestore.rules`.
> 4. الإقرار الصريح بعدم توفر بيئة Java ومحاكي Firestore محلياً، وعدم ادعاء تشغيل محاكي القواعد السحابي.

---

## 1. المعالجة الجذرية للتهيئة الذرية للشظايا وحدود استدعاءات المستندات (Defect A)

### أ. التحليل البرمجي وحدود استدعاءات Firestore (Document Access Limits):
- يفرض محرك قواعد أمان Cloud Firestore حداً أقصى لا يتجاوز **10 استدعاءات وصول للمستندات** (`get`, `getAfter`, `exists`, `existsAfter`) لكل تقييم قاعدة مستند.
- **الحملات الشخصية (`isOfficial == false`):**
  - لا تتطلب التحقق من أي مستند خارجي للأدوار (`system_config/roles`).
  - لذلك، تم فحص الشظايا العشر كاملة (`shards/0` حتى `shards/9`) مباشرة عبر `getAfter()` داخل قاعدة إنشاء الحملة:
    ```javascript
    && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/0).data.count == 0
    && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/1).data.count == 0
    && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/2).data.count == 0
    && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/3).data.count == 0
    && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/4).data.count == 0
    && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/5).data.count == 0
    && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/6).data.count == 0
    && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/7).data.count == 0
    && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/8).data.count == 0
    && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/9).data.count == 0
    ```
    يستهلك هذا التحقق **10 استدعاءات بالضبط من أصل 10** (100% تغطية ذرية لجميع الشظايا دون أي تجاوز للسقف).
- **الحملات الرسمية للمالك (`isOfficial == true`):**
  - في حال التحقق عبر وثيقة الأدوار `system_config/roles`، يستهلك استدعاء الوثيقة استدعاءً واحداً (1 Call)، مما يتبقى معه 9 استدعاءات متاحة. لذلك تم فحص الشظايا من `0` إلى `8` (9 استدعاءات) ليكون المجموع $1 + 9 = 10$ استدعاءات. كما أُتيح التحقق عبر الرموز المخصصة (Custom Claims: `request.auth.token.role == 'owner'`) والتي تستهلك 0 استدعاءات.
- **منع إنشاء الشظايا لاحقاً:**
  قاعدة `match /shards/{shardId}` تلزم بأن يكون `!exists(campaign)` صحيحاً أثناء إنشاء الشظية، مما يعني استحالة إنشاء شظايا بعد إنشاء الحملة.

---

## 2. التحقق من صلاحيات الحملات ونزاهة المخطط (Defect B)

- **منع التصعيد الأمني (Anti-Privilege Escalation):**
  - في التعديل: يُشترط للمستخدم العادي `request.resource.data.isOfficial == false` وأن `resource.data.isOfficial == false`. يستحيل تحويل الحملة الشخصية إلى رسمية.
  - تجميد الحقول الجوهرية: `creatorId`، `targetDhikrPreset`، `totalTarget`، `createdAt` متطابقة تماماً ولا يمكن تغييرها.
  - آلة الحالات أحادية الاتجاه (Monotonic Status):
    - الحملات المكتملة (`status == 'completed'`) أو المؤرشفة (`archived`) يستحيل إعادة فتحها أو تحويلها إلى `active` من قبل المستخدم العادي.
  - حماية المالك: عند تعديل المالك للحملات، تم تجميد `creatorId` و `createdAt` لمنع التلاعب بهوية المنشئ أو تاريخ الإنشاء.

---

## 3. نزاهة المساهمات والمثلث الذري ومنع إعادة التشغيل (Defect C)

تم سد أي ثغرة محتملة لإعادة تشغيل المساهمات (Replay Attacks) أو التحديث المنفرد عبر الاقتران الرباعي الصارم في القواعد:
1. **في `contributions/{contribId}`:**
   - معرف المستند مطابق لـ `userId:sessionId`.
   - `sequence == getAfter(user_progress).sequence`.
   - `getAfter(shards/targetShardId).lastContributionId == contribId`.
   - `getAfter(shards/targetShardId).lastSequence == sequence`.
2. **في `user_progress/{userId}`:**
   - `sequence == resource.data.sequence + 1` (أو 1 عند الإنشاء).
   - مطابقة القيمة: `getAfter(contributions).amount == lastIncrement`.
   - مطابقة التسلسل: `getAfter(contributions).sequence == sequence`.
   - **منع إعادة التشغيل (Anti-Replay):** `getAfter(contributions).createdAt == request.time`.
     (المساهمة القديمة تحمل وقتاً سابقاً، مما يستحيل معه استخدامها لتحديث التقدم في معاملة لاحقة).
3. **في `shards/{shardId}`:**
   - الزيادة الحسابية الدقيقة: `count == resource.data.count + lastIncrement`.
   - `lastContributionId == userId:getAfter(user_progress).lastSessionId`.
   - `lastSequence == getAfter(user_progress).sequence`.
   - مطابقة شظية الهدف: `getAfter(contributions).targetShardId == shardId`.
   - `getAfter(contributions).createdAt == request.time`.
   - `getAfter(contributions).sequence == lastSequence`.

---

## 4. الفروقات الحرفية لقواعد أمان Firestore (Diff vs Baseline)

```diff
--- Original Baseline Athar Rules (Lines 94-102)
+++ Gamaa Hardened Security Rules (Lines 94-323)
@@ -94,9 +94,228 @@
       match /achievements/{badgeId} {
         allow get, list: if isOwner(userId) && isValidId(badgeId);
         allow create, update: if isOwner(userId)
                               && isValidId(badgeId)
                               && request.resource.data.keys().hasAll(['badgeId', 'unlockedAt'])
                               && request.resource.data.badgeId == badgeId;
         allow delete: if false;
       }
     }
+
+    // ----------------------------------------------------
+    // 7. Gamaa Community & System Roles
+    // ----------------------------------------------------
+    function isSystemOwner() {
+      return isSignedIn() && (
+        (request.auth.token.role == 'owner' || request.auth.token.admin == true) ||
+        (exists(/databases/$(database)/documents/system_config/roles) &&
+         request.auth.uid in get(/databases/$(database)/documents/system_config/roles).data.ownerUids)
+      );
+    }
+
+    function hasModeratorPermission(perm) {
+      return isSignedIn() &&
+        exists(/databases/$(database)/documents/moderators/$(request.auth.uid)) &&
+        get(/databases/$(database)/documents/moderators/$(request.auth.uid)).data.active == true &&
+        perm in get(/databases/$(database)/documents/moderators/$(request.auth.uid)).data.permissions;
+    }
+
+    match /system_config/roles {
+      allow read: if isSignedIn();
+      allow write: if false;
+    }
+
+    match /moderators/{modUid} {
+      allow read: if isSignedIn();
+      allow create, update, delete: if isSystemOwner();
+    }
+
+    match /user_rate_limits/{userId} {
+      allow read: if isOwner(userId);
+      allow create: if isOwner(userId)
+        && request.resource.data.totalPosts == 1
+        && request.resource.data.lastPostAt == request.time;
+      allow update: if isOwner(userId)
+        && request.time > resource.data.lastPostAt + duration.value(2, 'm')
+        && request.resource.data.totalPosts == resource.data.totalPosts + 1
+        && request.resource.data.lastPostAt == request.time;
+      allow delete: if false;
+    }
+
+    // ----------------------------------------------------
+    // 8. Gamaa Campaigns, Atomic Trio & Live Shards
+    // ----------------------------------------------------
+    match /community_campaigns/{campaignId} {
+      allow read: if isSignedIn();
+
+      // Create: Enforce strict schema, bounds, active status, request.time, and atomic shard initialization
+      allow create: if isSignedIn() && (
+        (
+          request.resource.data.isOfficial == true && isSystemOwner()
+          && request.resource.data.keys().hasAll(['title', 'description', 'targetDhikrPreset', 'totalTarget', 'status', 'isOfficial', 'creatorId', 'createdAt', 'expiresAt'])
+          && request.resource.data.keys().hasOnly(['title', 'description', 'targetDhikrPreset', 'totalTarget', 'status', 'isOfficial', 'creatorId', 'createdAt', 'expiresAt'])
+          && request.resource.data.title is string && request.resource.data.title.size() >= 3 && request.resource.data.title.size() <= 100
+          && request.resource.data.description is string && request.resource.data.description.size() >= 5 && request.resource.data.description.size() <= 500
+          && request.resource.data.targetDhikrPreset in ['subhanallah_wabihamdih', 'tasbih_tahmid_takbir', 'istighfar', 'salawat', 'la_ilaha_illallah', 'hawqala']
+          && request.resource.data.totalTarget is int && request.resource.data.totalTarget >= 1000 && request.resource.data.totalTarget <= 10000000
+          && request.resource.data.status == 'active'
+          && request.resource.data.createdAt == request.time
+          && request.resource.data.expiresAt is timestamp
+          && request.resource.data.expiresAt > request.time
+          && request.resource.data.expiresAt <= request.time + duration.value(90, 'd')
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/0).data.count == 0
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/1).data.count == 0
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/2).data.count == 0
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/3).data.count == 0
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/4).data.count == 0
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/5).data.count == 0
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/6).data.count == 0
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/7).data.count == 0
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/8).data.count == 0
+        )
+        ||
+        (
+          request.resource.data.isOfficial == false && request.resource.data.creatorId == request.auth.uid
+          && request.resource.data.keys().hasAll(['title', 'description', 'targetDhikrPreset', 'totalTarget', 'status', 'isOfficial', 'creatorId', 'createdAt', 'expiresAt'])
+          && request.resource.data.keys().hasOnly(['title', 'description', 'targetDhikrPreset', 'totalTarget', 'status', 'isOfficial', 'creatorId', 'createdAt', 'expiresAt'])
+          && request.resource.data.title is string && request.resource.data.title.size() >= 3 && request.resource.data.title.size() <= 100
+          && request.resource.data.description is string && request.resource.data.description.size() >= 5 && request.resource.data.description.size() <= 500
+          && request.resource.data.targetDhikrPreset in ['subhanallah_wabihamdih', 'tasbih_tahmid_takbir', 'istighfar', 'salawat', 'la_ilaha_illallah', 'hawqala']
+          && request.resource.data.totalTarget is int && request.resource.data.totalTarget >= 100 && request.resource.data.totalTarget <= 100000
+          && request.resource.data.status == 'active'
+          && request.resource.data.createdAt == request.time
+          && request.resource.data.expiresAt is timestamp
+          && request.resource.data.expiresAt > request.time
+          && request.resource.data.expiresAt <= request.time + duration.value(90, 'd')
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/0).data.count == 0
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/1).data.count == 0
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/2).data.count == 0
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/3).data.count == 0
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/4).data.count == 0
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/5).data.count == 0
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/6).data.count == 0
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/7).data.count == 0
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/8).data.count == 0
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/9).data.count == 0
+        )
+      );
+
+      // Update: Immutable creatorId, createdAt, targetDhikrPreset, totalTarget. One-way state machine.
+      allow update: if isSignedIn() && (
+        (
+          isSystemOwner()
+          && request.resource.data.keys().hasOnly(['title', 'description', 'targetDhikrPreset', 'totalTarget', 'status', 'isOfficial', 'creatorId', 'createdAt', 'expiresAt', 'updatedAt'])
+          && request.resource.data.creatorId == resource.data.creatorId
+          && request.resource.data.createdAt == resource.data.createdAt
+          && (!('title' in request.resource.data) || (request.resource.data.title is string && request.resource.data.title.size() >= 3 && request.resource.data.title.size() <= 100))
+          && (!('description' in request.resource.data) || (request.resource.data.description is string && request.resource.data.description.size() >= 5 && request.resource.data.description.size() <= 500))
+          && (!('status' in request.resource.data) || request.resource.data.status in ['active', 'paused', 'completed', 'archived'])
+          && (!('totalTarget' in request.resource.data) || (request.resource.data.totalTarget is int && request.resource.data.totalTarget >= 100))
+          && (!('expiresAt' in request.resource.data) || (request.resource.data.expiresAt is timestamp && request.resource.data.expiresAt > resource.data.createdAt))
+          && (!('updatedAt' in request.resource.data) || request.resource.data.updatedAt == request.time)
+        )
+        ||
+        (
+          resource.data.creatorId == request.auth.uid
+          && resource.data.isOfficial == false
+          && request.resource.data.isOfficial == false
+          && request.resource.data.creatorId == resource.data.creatorId
+          && request.resource.data.targetDhikrPreset == resource.data.targetDhikrPreset
+          && request.resource.data.createdAt == resource.data.createdAt
+          && request.resource.data.totalTarget == resource.data.totalTarget
+          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['title', 'description', 'expiresAt', 'status', 'updatedAt'])
+          && request.resource.data.title is string && request.resource.data.title.size() >= 3 && request.resource.data.title.size() <= 100
+          && request.resource.data.description is string && request.resource.data.description.size() >= 5 && request.resource.data.description.size() <= 500
+          && (
+            (resource.data.status == 'active' && request.resource.data.status in ['active', 'paused', 'completed'])
+            || (resource.data.status == 'paused' && request.resource.data.status in ['active', 'paused', 'completed'])
+          )
+          && request.resource.data.expiresAt is timestamp
+          && request.resource.data.expiresAt > resource.data.createdAt
+          && request.resource.data.expiresAt <= resource.data.createdAt + duration.value(90, 'd')
+          && request.resource.data.updatedAt == request.time
+        )
+      );
+
+      allow delete: if isSystemOwner() || (resource.data.creatorId == request.auth.uid && resource.data.isOfficial == false && resource.data.status == 'archived');
+
+      // --------------------------------------------------
+      // Subcollection 8.1: Contributions (Immutable, strictly bound to user, session, and shard)
+      // --------------------------------------------------
+      match /contributions/{contribId} {
+        allow read: if isSignedIn() && resource.data.userId == request.auth.uid;
+        allow update, delete: if false;
+
+        allow create: if isSignedIn()
+          && contribId == request.auth.uid + ':' + request.resource.data.sessionId
+          && request.resource.data.userId == request.auth.uid
+          && request.resource.data.sessionId is string
+          && request.resource.data.sessionId.size() >= 8
+          && request.resource.data.sessionId.size() <= 64
+          && request.resource.data.sessionId.matches('^[a-zA-Z0-9\\-]+$')
+          && request.resource.data.keys().hasAll(['userId', 'amount', 'presetId', 'sessionId', 'sequence', 'targetShardId', 'createdAt'])
+          && request.resource.data.keys().hasOnly(['userId', 'amount', 'presetId', 'sessionId', 'sequence', 'targetShardId', 'createdAt'])
+          && request.resource.data.targetShardId in ['0','1','2','3','4','5','6','7','8','9']
+          && request.resource.data.sequence is int && request.resource.data.sequence >= 1
+          && request.resource.data.amount is int && request.resource.data.amount >= 1 && request.resource.data.amount <= 1000
+          && request.resource.data.createdAt == request.time
+          && request.resource.data.presetId == get(/databases/$(database)/documents/community_campaigns/$(campaignId)).data.targetDhikrPreset
+          && get(/databases/$(database)/documents/community_campaigns/$(campaignId)).data.status == 'active'
+          && request.time < get(/databases/$(database)/documents/community_campaigns/$(campaignId)).data.expiresAt
+          && request.resource.data.sequence == getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/user_progress/$(request.auth.uid)).data.sequence
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/$(request.resource.data.targetShardId)).data.lastContributionId == contribId
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/shards/$(request.resource.data.targetShardId)).data.lastSequence == request.resource.data.sequence;
+      }
+
+      // --------------------------------------------------
+      // Subcollection 8.2: User Progress (Monotonic sequence & 24h cap)
+      // --------------------------------------------------
+      match /user_progress/{userId} {
+        allow read: if isOwner(userId);
+        allow delete: if false;
+
+        allow create: if isOwner(userId)
+          && request.resource.data.keys().hasAll(['sequence', 'windowTotal', 'windowStart', 'lastIncrement', 'lastSessionId', 'updatedAt'])
+          && request.resource.data.keys().hasOnly(['sequence', 'windowTotal', 'windowStart', 'lastIncrement', 'lastSessionId', 'updatedAt'])
+          && request.resource.data.sequence == 1
+          && request.resource.data.lastIncrement is int && request.resource.data.lastIncrement >= 1 && request.resource.data.lastIncrement <= 1000
+          && request.resource.data.windowTotal == request.resource.data.lastIncrement
+          && request.resource.data.windowTotal <= 5000
+          && request.resource.data.windowStart == request.time
+          && request.resource.data.updatedAt == request.time
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/contributions/$(request.auth.uid + ':' + request.resource.data.lastSessionId)).data.amount == request.resource.data.lastIncrement
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/contributions/$(request.auth.uid + ':' + request.resource.data.lastSessionId)).data.sequence == 1
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/contributions/$(request.auth.uid + ':' + request.resource.data.lastSessionId)).data.createdAt == request.time;
+
+        allow update: if isOwner(userId)
+          && request.resource.data.keys().hasAll(['sequence', 'windowTotal', 'windowStart', 'lastIncrement', 'lastSessionId', 'updatedAt'])
+          && request.resource.data.keys().hasOnly(['sequence', 'windowTotal', 'windowStart', 'lastIncrement', 'lastSessionId', 'updatedAt'])
+          && request.resource.data.sequence == resource.data.sequence + 1
+          && request.resource.data.lastIncrement is int && request.resource.data.lastIncrement >= 1 && request.resource.data.lastIncrement <= 1000
+          && request.resource.data.updatedAt == request.time
+          && (
+            (request.time < resource.data.windowStart + duration.value(24, 'h')
+              && request.resource.data.windowTotal == resource.data.windowTotal + request.resource.data.lastIncrement
+              && request.resource.data.windowTotal <= 5000
+              && request.resource.data.windowStart == resource.data.windowStart)
+            ||
+            (request.time >= resource.data.windowStart + duration.value(24, 'h')
+              && request.resource.data.windowTotal == request.resource.data.lastIncrement
+              && request.resource.data.windowTotal <= 5000
+              && request.resource.data.windowStart == request.time)
+          )
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/contributions/$(request.auth.uid + ':' + request.resource.data.lastSessionId)).data.amount == request.resource.data.lastIncrement
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/contributions/$(request.auth.uid + ':' + request.resource.data.lastSessionId)).data.sequence == request.resource.data.sequence
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/contributions/$(request.auth.uid + ':' + request.resource.data.lastSessionId)).data.createdAt == request.time;
+      }
+
+      // --------------------------------------------------
+      // Subcollection 8.3: Shards (0 through 9, atomic increments)
+      // --------------------------------------------------
+      match /shards/{shardId} {
+        allow read: if isSignedIn();
+
+        allow create: if isSignedIn()
+          && shardId in ['0','1','2','3','4','5','6','7','8','9']
+          && request.resource.data.keys().hasAll(['count', 'lastIncrement', 'lastContributionId', 'lastSequence', 'updatedAt'])
+          && request.resource.data.keys().hasOnly(['count', 'lastIncrement', 'lastContributionId', 'lastSequence', 'updatedAt'])
+          && request.resource.data.count == 0
+          && request.resource.data.lastIncrement == 0
+          && request.resource.data.lastContributionId == ''
+          && request.resource.data.lastSequence == 0
+          && !exists(/databases/$(database)/documents/community_campaigns/$(campaignId))
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)).data.status == 'active'
+          && (
+            getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)).data.creatorId == request.auth.uid
+            || (getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)).data.isOfficial == true && isSystemOwner())
+          );
+        allow delete: if false;
+
+        allow update: if isSignedIn()
+          && shardId in ['0','1','2','3','4','5','6','7','8','9']
+          && request.resource.data.keys().hasAll(['count', 'lastIncrement', 'lastContributionId', 'lastSequence', 'updatedAt'])
+          && request.resource.data.keys().hasOnly(['count', 'lastIncrement', 'lastContributionId', 'lastSequence', 'updatedAt'])
+          && request.resource.data.count == resource.data.count + request.resource.data.lastIncrement
+          && request.resource.data.lastIncrement is int && request.resource.data.lastIncrement >= 1 && request.resource.data.lastIncrement <= 1000
+          && request.resource.data.updatedAt == request.time
+          && request.resource.data.lastContributionId == request.auth.uid + ':' + getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/user_progress/$(request.auth.uid)).data.lastSessionId
+          && request.resource.data.lastSequence == getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/user_progress/$(request.auth.uid)).data.sequence
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/contributions/$(request.resource.data.lastContributionId)).data.amount == request.resource.data.lastIncrement
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/contributions/$(request.resource.data.lastContributionId)).data.targetShardId == shardId
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/contributions/$(request.resource.data.lastContributionId)).data.sequence == request.resource.data.lastSequence
+          && getAfter(/databases/$(database)/documents/community_campaigns/$(campaignId)/contributions/$(request.resource.data.lastContributionId)).data.createdAt == request.time;
+      }
+    }
```

---

## 5. نتائج الاختبارات المنفذة فعلياً (Verifiable Test Results)

1. **اختبارات خدمة مجتمع «جماعة» (`npm run test:community`):**
   - **النتيجة:** **43 / 43 اختباراً ناجحاً بنسبة 100% (0 فشل)**:
     - فحص سلامة المعرفات ومنع التصادم (6 اختبارات).
     - إنشاء الحملة والتهيئة الذرية للشظايا العشر (اختباران).
     - تسجيل المساهمة والربط الثلاثي (4 اختبارات).
     - كشف تكرار الجلسة وإرجاع نجاح صامت دون تكرار العداد (اختباران).
     - منع إعادة تشغيل A/B/A والتسلسل التصاعدي (4 اختبارات).
     - تطبيق سقف الـ 5,000 للنافذة الثابتة (اختبار واحد).
     - كشف الشظايا المفقودة ورفض المعاملة (اختبار واحد).
     - سباق التزامن ومحاكاة التعارض OCC (اختباران).
     - خريطة الشظايا بالذاكرة وتجميع المستمع الحي (اختباران).
     - التحقق الشامل من المخطط، حدود النصوص، الأهداف، الأذكار، وسقف 1000 للدفعة (10 اختبارات).
     - **محاكاة هجمات وقواعد أمان Firestore الحصرية (Test Group 11):**
       - رفض التحديث الفردي للشظايا دون مساهمة (Test 11.2) [PASS].
       - رفض كتابة مساهمة دون شظية مطابقة (Test 11.3) [PASS].
       - رفض هجوم إعادة تشغيل مساهمة قديمة عبر فحص `request.time` (Test 11.4) [PASS].
       - رفض التناقض بين شظية الهدف والشظية المكتوبة (Test 11.5) [PASS].
       - رفض القفز في التسلسل وتخطي الأرقام (Test 11.6) [PASS].
       - رفض تصعيد الصلاحيات لمحاولة جعل الحملة رسمية (Test 11.7) [PASS].
       - رفض تعديل الأهداف المجمدة من قبل المنشئ (Test 11.8) [PASS].
       - رفض إعادة فتح الحملات المكتملة (Test 11.9) [PASS].
2. **اختبارات تطبيق «أثر» الأصلية (Regression Verification):**
   - `test:auth`: **50 اختباراً ناجحاً**.
   - `test:gamification`: **37 اختباراً ناجحاً**.
   - `test:isolation`: **41 اختباراً ناجحاً**.
   - `test:notifications`: **10 اختبارات ناجحة**.
   - **المجموع التراكمي الفعلي:** **181 / 181 اختباراً ناجحاً بنسبة 100%**.
3. **فحص الـ Lint والتجميع:**
   - `npm run lint` (`tsc --noEmit`): **0 أخطاء**.
   - `compile_applet`: **Build succeeded**.
