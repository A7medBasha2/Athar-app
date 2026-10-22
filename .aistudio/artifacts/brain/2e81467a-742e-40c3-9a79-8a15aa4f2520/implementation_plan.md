# Phase 4 — Global In-App Notice System for Athar / Gamaa

A secure, royal black-and-gold in-app announcement banner integrated seamlessly across Athar and the Gamaa admin console, connecting community members to live updates and dhikr campaigns with zero disruption to core prayer or adhan services.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following requirements have been clarified and will be strictly enforced:
> - **Banner Position**: Top floating banner situated immediately beneath the system status bar, respecting safe area insets.
> - **Dismissal Scope**: Dismissing a notice applies strictly to the current app session (in-memory / `sessionStorage`) without muting it permanently across future sessions or affecting other devices.
> - **Publishing Authorization**: Exclusively restricted to System Owners (`isSystemOwner()` verified via `/system_config/roles`) in both the UI and Firestore rules layer. Appointed moderators have read-only visibility into notice history.

---

## 1. Overview & Core Concept

- **What It Does**: Allows system administrators to schedule and broadcast critical announcements, campaign milestones, spiritual reminders, and section-specific tips without disturbing Quran recitation, adhan audio, or prayer alerts.
- **Target Audience**: All authenticated and guest Athar users navigating through the app, with precision targeting by section (Entire App, Gamaa Community only, or specific sections like Quran, Adhkar, Prayers).
- **Core Value**: Real-time awareness of collective campaigns and app notices with one-tap deep navigation to linked community campaigns.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Notice Discovery**: When an eligible notice is active for the current screen, a subtle floating card glides down from beneath the status bar with smooth entrance animation (`animate-slideDown`).
2. **Campaign Interaction**: If a notice links to a live campaign (e.g., "شاركونا في حملة المليون تسبيحة"), tapping the banner smoothly switches the view to `gamaa` and opens the campaign details sheet.
3. **Session Dismissal**: Tapping the close (`X`) icon fades out the banner and silences that specific notice for the remainder of the session without deleting or mutating backend records.
4. **Admin Management**: System owners access the "التنبيهات العامة" (Notices) tab in the Gamaa Admin Console to create, edit, schedule, activate, archive, and delete notices with instant preview and strict validation.

### Visual Identity & Theme (Athar Royal Black & Gold)
- **Palette**: Deep obsidian `#070707`/95 with subtle backdrop blur (`backdrop-blur-md`), bordered by royal warm gold (`#C8A24A`/60) and radiant amber accents (`#D4AF37`).
- **Typography & Layout**: Arabic RTL layout with clean unboxed metadata (title kicker, start date, relative duration), eliminating clunky pills and badges.
- **Touch Ergonomics**: All interactive hitboxes (dismiss button, action link) satisfy $\ge 44 \times 44\text{px}$ touch targets.
- **Viewport Respect**: Total height capped at $\le 56\text{px}$ to strictly adhere to the $<15\%$ sticky surface budget, ensuring 85%+ of the screen remains dedicated to spiritual content.

```
+-----------------------------------------------------------+
| [Status Bar / Safe Area Inset]                            |
+-----------------------------------------------------------+
|  +-----------------------------------------------------+  |
|  | [📢] عنوان التنبيه • نص الرسالة التوجيهية المختصرة    |  |
|  |      [عرض الحملة ←]                          [✕]    |  |
|  +-----------------------------------------------------+  |
+-----------------------------------------------------------+
|                                                           |
|                 [ Athar Main Content Area ]               |
|                                                           |
+-----------------------------------------------------------+
| [ Global Mini Player (if playing) ]                       |
| [ Bottom Navigation Bar ]                                 |
+-----------------------------------------------------------+
```

---

## 3. Key Product Decisions & Trade-Offs

### 1. Client-Side Time & Schedule Resolution
- **Approach**: Firestore query fetches active and scheduled candidates (`where('status', 'in', ['active', 'scheduled'])`). The client performs conservative local timestamp verification: `now >= startsAt && now <= expiresAt`.
- **Why**: Handles network latency, timezone nuances, and clock skew gracefully without running expensive backend cron triggers or paid Cloud Functions.

### 2. Multi-Notice Arbitration & Anti-Stacking
- **Approach**: Deterministic priority ranking:
  1. `priority` ('urgent' > 'high' > 'normal')
  2. `isPinned` (true > false)
  3. `startsAt` (newest first)
  Only the single highest-priority eligible notice is displayed at any given moment. A subtle counter indicator `(1 من 2)` appears when multiple notices are active, allowing quick cycling.
- **Why**: Prevents visual clutter and respects the 15% sticky surface constraint.

### 3. Graceful Campaign Fallback
- **Approach**: When a user taps a notice linked to `targetCampaignId`, the app verifies campaign existence and active status. If nonexistent or archived, an elegant toast informs the user ("هذه الحملة لم تعد نشطة حالياً") without blank screen or navigation crash.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                     Firestore Database                      │
│                  athar-e45df / (default)                    │
│                                                             │
│  /system_config/roles ──────────────┐                       │
│  /global_notices/{noticeId} ◄───────┼──────────────────┐    │
└─────────────────────────────────────┼──────────────────┼────┘
                                      │                  │
                               Owner  │                  │ Read
                               Writes │                  │ Stream
                                      ▼                  │
┌───────────────────────────┐   ┌────────────────────────┴───┐
│ Gamaa Admin Console Modal │   │    GlobalNoticeBanner      │
│  - Tab 4: التنبيهات العامة  │   │  - Mounted in App.tsx      │
│  - Form & Validation      │   │  - Scope & Time Filtering  │
│  - Activation & Archiving │   │  - Session Dismissal State │
└───────────────────────────┘   └──────────────┬─────────────┘
                                               │ Tap Link
                                               ▼
                                ┌────────────────────────────┐
                                │   Gamaa Community View     │
                                │   - Active Campaign Modal  │
                                └────────────────────────────┘
```

### Data Schema (`global_notices/{noticeId}`)
```typescript
export type NoticeScope = 'app_wide' | 'gamaa' | 'section';
export type NoticePriority = 'normal' | 'high' | 'urgent';
export type NoticeStatus = 'draft' | 'scheduled' | 'active' | 'archived';

export interface GlobalNotice {
  id: string;
  title?: string;               // Optional Arabic title (<= 60 chars)
  message: string;             // Required Arabic message (3 to 300 chars)
  scope: NoticeScope;          // 'app_wide' | 'gamaa' | 'section'
  targetSection?: string;      // If scope === 'section': 'prayers' | 'quran' | 'adhkar' | 'stories' | 'explore' | 'companion'
  targetCampaignId?: string;   // Optional reference to a valid community campaign
  priority: NoticePriority;    // 'normal' | 'high' | 'urgent'
  isPinned: boolean;           // Always prioritize ahead of unpinned
  status: NoticeStatus;        // 'draft' | 'scheduled' | 'active' | 'archived'
  startsAt: any;               // Firestore Timestamp
  expiresAt: any;              // Firestore Timestamp (must be > startsAt)
  creatorId: string;           // request.auth.uid of system owner
  createdAt: any;              // serverTimestamp()
  updatedAt: any;              // serverTimestamp()
}
```

### Firestore Security Rules Enforcement
```javascript
match /global_notices/{noticeId} {
  // Read: all signed-in users can read active/scheduled notices for presentation
  allow read: if isSignedIn();

  // Write: strictly system owners (isSystemOwner()) with schema & timeline bounds
  allow create: if isSystemOwner()
    && isValidId(noticeId)
    && request.resource.data.creatorId == request.auth.uid
    && request.resource.data.createdAt == request.time
    && request.resource.data.updatedAt == request.time
    && request.resource.data.message is string
    && request.resource.data.message.size() >= 3
    && request.resource.data.message.size() <= 300
    && request.resource.data.scope in ['app_wide', 'gamaa', 'section']
    && request.resource.data.priority in ['normal', 'high', 'urgent']
    && request.resource.data.status in ['draft', 'scheduled', 'active', 'archived']
    && request.resource.data.isPinned is bool
    && request.resource.data.startsAt is timestamp
    && request.resource.data.expiresAt is timestamp
    && request.resource.data.expiresAt > request.resource.data.startsAt;

  allow update: if isSystemOwner()
    && isValidId(noticeId)
    && request.resource.data.creatorId == resource.data.creatorId
    && request.resource.data.createdAt == resource.data.createdAt
    && request.resource.data.updatedAt == request.time
    && request.resource.data.message is string
    && request.resource.data.message.size() >= 3
    && request.resource.data.message.size() <= 300
    && request.resource.data.expiresAt > request.resource.data.startsAt;

  allow delete: if isSystemOwner() && isValidId(noticeId);
}
```

---

## 5. Verification & Test Plan

1. **Automated Unit & Invariant Test Suite (`src/tests/globalNoticeSystem.test.ts`)**:
   - Unauthorized user / moderator creation rejected.
   - System owner permitted to create/update.
   - Start/expiration time range validation (`expiresAt > startsAt`).
   - Early scheduled notices hidden before `startsAt`.
   - Expired notices hidden after `expiresAt`.
   - Scope resolution: App-wide matches any tab; Gamaa-only matches only `gamaa`; Section matches only target section.
   - Priority arbitration math: Urgent > High > Normal; Pinned > Unpinned.
   - Session dismissal isolation: Dismissing notice A does not affect notice B and clears on new session.
   - Campaign navigation fallback on non-existent campaign ID.
2. **Regression & Stability Verification**:
   - `npm run test:community` (56/56 passing).
   - `npm run test:admin` (34/34 passing).
   - `npx tsx src/tests/gamaaCommunitySocial.test.ts` (73/73 passing).
   - `npm run lint` (`tsc --noEmit`).
   - `npm run build` (`vite build`).
