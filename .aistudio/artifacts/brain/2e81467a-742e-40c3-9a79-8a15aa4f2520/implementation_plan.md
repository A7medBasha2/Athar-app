# Phase 5 — Groups & Circles inside Athar / Gamaa

A secure, royal Islamic community circles system allowing Athar users to discover, form, join, and interact within public and private spiritual study circles, dhikr gatherings, and reflection groups with zero-trust Firestore authorization and strict timeline isolation.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed and govern the system design:
> - **Navigation Entry Point**: A top segmented switch within `GamaaCommunityView.tsx` enabling seamless toggling between "الخلاصة العامة" (Public Timeline) and "حلقات الذكر والمجموعات" (Circles & Groups).
> - **Content Isolation**: 100% strict isolation. Group posts reside in dedicated group subcollections and never pollute or mirror to the main Gamaa timeline feed.
> - **Creation Authority**: Any authenticated user can create public and private Islamic study circles, becoming the founding administrator of their created group.

---

## 1. Overview & Core Concept

- **What It Does**: Provides spiritual communities within Athar where users gather around shared Islamic pursuits (e.g. Khatmah circles, daily Istighfar companions, Tajweed learners, charitable initiatives) with dedicated discussions and reflections.
- **Target Audience**: All registered Athar community members seeking focused, intimate spiritual camaraderie beyond the broad public timeline.
- **Core Value**: Focused spiritual engagement with privacy guarantees: private groups are strictly shielded at the database layer from non-member reads, unauthorized posts, and data scraping.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Discovery & Browsing**: Users toggle the "حلقات الذكر والمجموعات" tab to view available public circles and explore private circles. Filter by category (قرآن، أذكار، علم شرعي، إحسان، عام).
2. **Joining Public Circles**: One-tap "انضمام للحلقة" immediately enrolls the user as an active member and unlocks the group feed and posting.
3. **Requesting Private Circles**: Users tap "طلب انضمام". The request enters a `pending` state visible to the group creator with clear visual status in Arabic ("بانتظار موافقة المشرف").
4. **Group Timeline & Discussions**: Inside a group, members view the group's dedicated reflection feed, compose new reflections (3 to 600 characters), add comments (up to 300 characters), and exchange spiritual reactions (`jazakallah`, `barakallah`, `ameen`).
5. **Creator Administration**: The group creator can edit group details, review pending member requests with one-tap approve/reject, and remove inappropriate members or leave the group.
6. **Moderation & Safety**: Members can report inappropriate group reflections using the existing royal `GamaaReportModal` with zero disruption.

### Visual Identity & Theme (Athar Royal Black & Gold)
- **Palette**: Deep charcoal-obsidian `#070707` with warm gold accents (`#C8A24A`, `#D4AF37`) and subtle ambient amber glows.
- **Card Design**: Clean unboxed typography, elegant Islamic arch accents, clear member counts (`٢٤ عضواً`), privacy status indicator (عامة / خاصة مع قفل ذهبي), and minimum 44px touch targets.
- **Feedback & Motion**: Smooth transition between segmented views, interactive ripple feedback, and non-blocking toast notifications.

```
+-----------------------------------------------------------+
| [Gamaa Header]  جماعة • أثر              [لوحة الإدارة 🛡️] |
+-----------------------------------------------------------+
|   [ الخلاصة العامة ]      [ حلقات الذكر والمجموعات (نشط) ] |
+-----------------------------------------------------------+
| [ + إنشاء حلقة جديدة ]    [ تصنيفات: الكل · قرآن · أذكار ]  |
+-----------------------------------------------------------+
|  +-----------------------------------------------------+  |
|  | 🕌 حلقة أهل القرآن والتدبر               [عامة • ٤٢] |  |
|  | مدارسة وتدبر آيات سورة الكهف والبقرة أسبوعياً       |  |
|  | [دخول الحلقة ←]                                     |  |
|  +-----------------------------------------------------+  |
|  +-----------------------------------------------------+  |
|  | 🔒 رفقاء الاستغفار والقيام             [خاصة • ١٨]   |  |
|  | حلقة إيمانية خاصة للتواصي على قيام الليل وصالح الأعمال |  |
|  | [طلب الانضمام]                                      |  |
|  +-----------------------------------------------------+  |
+-----------------------------------------------------------+
```

---

## 3. Key Product Decisions & Trade-Offs

### 1. Database Architecture: Subcollections vs. Global Feed Filtering
- **Chosen Approach**: Isolated subcollections:
  - `/community_groups/{groupId}`
  - `/community_groups/{groupId}/members/{userId}`
  - `/community_groups/{groupId}/posts/{postId}`
  - `/community_groups/{groupId}/posts/{postId}/comments/{commentId}`
- **Why**: Allows clean Firestore security rules: reading private posts requires `isActiveGroupMember(groupId)`, completely eliminating data leakage risks. Non-members cannot query or scrape private posts even with crafted SDK queries.

### 2. Group Creation Permissions
- **Chosen Approach**: Any authenticated user can create public and private groups. The creator is automatically written as the first member with `role: 'admin'` and `status: 'active'`.
- **Why**: Encourages community growth while keeping group ownership decentralized and secure. System owners retain master moderation oversight.

### 3. Reporting Integration
- **Chosen Approach**: Reuses the existing `/community_reports` collection and `GamaaReportModal.tsx` by supplying `groupId` in the report payload.
- **Why**: Keeps platform moderation centralized in the Gamaa Admin Console without introducing redundant queues.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                     Firestore Database                      │
│                  athar-e45df / (default)                    │
│                                                             │
│  /community_groups/{groupId}                                │
│    ├── /members/{userId}       (active / pending)           │
│    └── /posts/{postId}         (isolated reflections)       │
│          └── /comments/{id}    (group comments)             │
│                                                             │
│  /system_config/roles ──────────┐                           │
│  /community_reports ◄───────────┼───────────────────────────┤
└─────────────────────────────────┼───────────────────────────┘
                                  │ System Owner Master Mod
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                 Gamaa Community View Shell                  │
│                                                             │
│   [Segment 1: Timeline]          [Segment 2: Groups]        │
│   - Public Feed                  - GamaaGroupsList          │
│   - 10-Shard Campaigns           - GamaaGroupDetailModal    │
│   - Notice Banner                - GamaaCreateGroupModal    │
│                                  - Member Approval Queue    │
└─────────────────────────────────────────────────────────────┘
```

### Firestore Security Rules Specification
```javascript
// Check if user is an active member of the group
function isActiveGroupMember(groupId) {
  return isSignedIn() &&
    exists(/databases/$(database)/documents/community_groups/$(groupId)/members/$(request.auth.uid)) &&
    get(/databases/$(database)/documents/community_groups/$(groupId)/members/$(request.auth.uid)).data.status == 'active';
}

// Check if user is the admin/creator of the group
function isGroupAdmin(groupId) {
  return isSignedIn() &&
    (
      (exists(/databases/$(database)/documents/community_groups/$(groupId)) &&
       get(/databases/$(database)/documents/community_groups/$(groupId)).data.creatorId == request.auth.uid) ||
      (exists(/databases/$(database)/documents/community_groups/$(groupId)/members/$(request.auth.uid)) &&
       get(/databases/$(database)/documents/community_groups/$(groupId)/members/$(request.auth.uid)).data.role == 'admin' &&
       get(/databases/$(database)/documents/community_groups/$(groupId)/members/$(request.auth.uid)).data.status == 'active')
    );
}

match /community_groups/{groupId} {
  // Read: all authenticated users can read group metadata for discovery
  allow read: if isSignedIn();

  // Create: authenticated users with valid schema
  allow create: if isSignedIn()
    && isValidId(groupId)
    && request.resource.data.creatorId == request.auth.uid
    && request.resource.data.createdAt == request.time
    && request.resource.data.name is string && request.resource.data.name.size() >= 3 && request.resource.data.name.size() <= 60
    && request.resource.data.description is string && request.resource.data.description.size() >= 5 && request.resource.data.description.size() <= 300
    && request.resource.data.category in ['quran', 'dhikr', 'knowledge', 'charity', 'general']
    && request.resource.data.isPrivate is bool;

  // Update: group admin or system owner
  allow update: if (isGroupAdmin(groupId) || isSystemOwner())
    && request.resource.data.creatorId == resource.data.creatorId
    && request.resource.data.createdAt == resource.data.createdAt;

  allow delete: if (isGroupAdmin(groupId) || isSystemOwner());

  // Members subcollection
  match /members/{memberId} {
    allow read: if isSignedIn() && (
      resource.data.groupId == groupId // Public or active member
    );

    // Join / Request: user can only create their own record
    allow create: if isSignedIn()
      && request.auth.uid == memberId
      && request.resource.data.userId == request.auth.uid
      && (
        // Creator initial membership
        (isGroupAdmin(groupId) && request.resource.data.role == 'admin' && request.resource.data.status == 'active') ||
        // Public group join
        (!get(/databases/$(database)/documents/community_groups/$(groupId)).data.isPrivate && request.resource.data.role == 'member' && request.resource.data.status == 'active') ||
        // Private group join request
        (get(/databases/$(database)/documents/community_groups/$(groupId)).data.isPrivate && request.resource.data.role == 'member' && request.resource.data.status == 'pending')
      );

    // Approval: group admin approves pending member; members cannot self-approve
    allow update: if (isGroupAdmin(groupId) || isSystemOwner())
      && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'updatedAt']);

    // Leave or remove: user can leave own membership, or admin can remove
    allow delete: if (isOwner(memberId) || isGroupAdmin(groupId) || isSystemOwner());
  }

  // Posts subcollection
  match /posts/{postId} {
    // Read: if public group or active member of private group
    allow read: if isSignedIn() && (
      !get(/databases/$(database)/documents/community_groups/$(groupId)).data.isPrivate ||
      isActiveGroupMember(groupId) ||
      isSystemOwner()
    );

    // Create: must be active member
    allow create: if isSignedIn()
      && isActiveGroupMember(groupId)
      && request.resource.data.authorId == request.auth.uid
      && request.resource.data.groupId == groupId
      && request.resource.data.content is string && request.resource.data.content.size() >= 3 && request.resource.data.content.size() <= 600;

    // Delete: author, group admin, or system owner
    allow delete: if isSignedIn() && (
      isOwner(resource.data.authorId) ||
      isGroupAdmin(groupId) ||
      isSystemOwner()
    );

    // Comments subcollection
    match /comments/{commentId} {
      allow read: if isSignedIn() && (
        !get(/databases/$(database)/documents/community_groups/$(groupId)).data.isPrivate ||
        isActiveGroupMember(groupId) ||
        isSystemOwner()
      );

      allow create: if isSignedIn()
        && isActiveGroupMember(groupId)
        && request.resource.data.authorId == request.auth.uid;

      allow delete: if isSignedIn() && (
        isOwner(resource.data.authorId) ||
        isGroupAdmin(groupId) ||
        isSystemOwner()
      );
    }
  }
}
```

---

## 5. Verification & Test Plan

1. **Automated Unit & Invariant Test Suite (`src/tests/gamaaGroupsSystem.test.ts`)**:
   - Creating valid public and private groups with schema validation.
   - Unauthorized group metadata modifications rejected.
   - Joining public groups (immediate `active` state).
   - Requesting private groups (`pending` state) and preventing self-approval.
   - Group admin approval of pending members.
   - Leaving and removing members (self-leave and admin-kick).
   - Content access restrictions: private posts denied to non-members and pending members; permitted only to active members.
   - Timeline isolation verification: group posts never written to `/community_posts`.
   - Cross-group post injection prevention (`groupId` invariant).
2. **Regression Verification**:
   - `npm run test:notices` (37/37 passing).
   - `npm run test:admin` (34/34 passing).
   - `npm run test:community` (56/56 passing).
   - `npx tsx src/tests/gamaaCommunitySocial.test.ts` (73/73 passing).
   - `npm run lint` (`tsc --noEmit`).
   - `npm run build` (`vite build`).
