# Athar User Activity & Isolated Multi-Account Data Architecture

A comprehensive, production-grade engineering plan to integrate Athar's Profile Dashboard with authentic recorded activity data, strictly partitioned and isolated by the authenticated Firebase UID (`request.auth.uid`), guaranteeing zero data leakage or state collision between user accounts.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed through interactive clarification and form the foundation of this system:

- **Confirmed Decision 1 (Guest-to-Account Migration)**: Local guest activities and stats accumulated before signing in will be cleanly and idempotently merged into the newly authenticated Firebase account upon first login, ensuring users never lose their initial worship progress.
- **Confirmed Decision 2 (Firestore Data Modeling)**: User activities and ledger entries will reside in dedicated, owner-restricted subcollections (`/users/{userId}/xp_ledger/{eventId}` and `/users/{userId}/daily_stats/{dateKey}`) alongside summary rollups on the parent `/users/{userId}` document.
- **Confirmed Decision 3 (Offline Conflict & Idempotency)**: Events utilize stable deterministic IDs (`xp_{activityType}_{dateKey}`) with client timestamping reconciled against server `request.time`. Re-syncs, duplicate submissions, and network retries are strictly idempotent.
- **Strict Data Isolation**: When a user logs out or switches accounts, local storage caches and active React states are immediately purged and re-initialized strictly for the target UID (or empty guest state). Data belonging to User A will never be displayed on User B's device.

---

## 1. Overview & Core Concept

### What It Delivers
A unified, zero-trust data pipeline connecting verified user actions (reading Quran, marking prayers, completing morning/evening Adhkar, recording Sadaqah) to the Profile Dashboard. The dashboard reflects authentic, verifiable totals with honest empty states when no activity exists—eliminating fabricated numbers, hardcoded mock values, and inter-account data leaks.

### Key Value
- **Spiritual Integrity**: Transparent and truthful representation of worship habits without synthetic numbers or competitive vanity metrics.
- **Absolute Privacy**: Strict Firestore Security Rules ensuring users can only read and write their own data, backed by UID-partitioned local persistence.
- **Seamless Offline-First Experience**: Works completely offline, automatically reconciling and syncing to the cloud whenever connectivity is established.

---

## 2. Activity Metrics & Verifiable Actions

| Metric Name | Recorded Action Event | Storage Location | Idempotency / Anti-Duplicate Key | Verification Level |
| :--- | :--- | :--- | :--- | :--- |
| **صلوات اليوم الموثقة** *(Prayers Logged)* | Tapping prayer completion toggle after astronomical prayer time has entered | Local: `athar_prayers_{uid}`<br>Cloud: `/users/{uid}/xp_ledger/xp_prayer_{prayer}_{date}` | `xp_prayer_{name}_{YYYY-MM-DD}` (Max 1 per prayer per day) | **Time-Gated Self-Reported** (Restricted to post-Adhan) |
| **جلسات القرآن وتدبره** *(Quran Reading & Audio)* | Reading verses in Mushaf or listening to verified reciters $\ge 10$ mins | Local: `athar_khatmah_{uid}`<br>Cloud: `/users/{uid}/xp_ledger/xp_quran_audio_{date}` | `xp_quran_audio_session_{YYYY-MM-DD}` (Max 1 session award per day) | **Application-Tracked** (Timed audio playback & Ayah counter) |
| **أذكار اليوم المكتملة** *(Adhkar Completed)* | Completing all items in Morning or Evening Adhkar or 100+ Tasbih | Local: `athar_adhkar_{uid}`<br>Cloud: `/users/{uid}/xp_ledger/xp_adhkar_{type}_{date}` | `xp_adhkar_morning_{YYYY-MM-DD}`, `xp_adhkar_evening_{YYYY-MM-DD}` | **Interaction-Verified** (Every dhikr count reached) |
| **سجل الصدقات والبر** *(Charity & Kinship)* | Logging a charitable contribution or recording kinship dua/contact | Local: `athar_sadaqah_{uid}`, `athar_kinship_{uid}`<br>Cloud: `/users/{uid}/xp_ledger/xp_sadaqah_{date}` | `xp_sadaqah_deed_{YYYY-MM-DD}` (Max 1 XP award per day) | **Self-Reported Spiritual Ledger** |
| **سلسلة الاستمرارية** *(Consecutive Streak)* | At least 1 verified spiritual action performed on consecutive calendar days | Local: Computed from ledger dates<br>Cloud: `/users/{uid}` (`streakDays`) | Evaluated daily by checking consecutive date keys | **Date-Bound System Metric** |

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: UID-Scoped Local Storage Architecture
- **Problem**: Currently, `StorageService` and `GamificationService` read from static keys (e.g. `athar_gamification_ledger_v1`, `athar_prayer_achievements_v1`). Logging into Account B retains Account A's records in the local browser/device cache.
- **Chosen Approach**: Dynamically scope all local storage keys by active UID:
  - Guest: `athar_guest_prayers_v1`, `athar_guest_ledger_v1`, etc.
  - Authenticated: `athar_{uid}_prayers_v1`, `athar_{uid}_ledger_v1`, etc.
  - On auth state change (`onAuthStateChanged`), the storage context dynamically switches active keys, triggering a state reset.
- **Why**: Guarantees zero bleed-over between accounts on shared devices while maintaining full offline capability.

### Decision 2: Guest-to-Account Idempotent Merge
- **Problem**: New users often build streaks and read Quran in guest mode before creating an account.
- **Chosen Approach**: When transitioning from Guest $\to$ Authenticated User for the first time:
  1. Inspect guest records.
  2. If the newly authenticated cloud account has no prior history, migrate guest records directly to `athar_{uid}_*`.
  3. Batch-write existing ledger entries to `/users/{uid}/xp_ledger/{eventId}` using idempotent `setDoc` with `{ merge: true }`.
  4. Purge the guest storage namespace to prevent duplicate future migrations.

### Decision 3: Honest Empty States & Cap Policy
- **Policy**: If an account has 0 logged prayers, 0 Quran hours, and 0 Adhkar sessions:
  - Display exact zeroes: `0 صلاة`, `0 ساعة`, `0 مرة`.
  - Badges show locked visual state with actual progress (e.g., `0 / 1`).
  - No synthetic placeholder numbers or inflated default stats will ever be shown.

---

## 4. Technical Architecture & Data Strategy

### System Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ATHAR USER INTERFACE                            │
│   ProfileDashboardView   •   AchievementsModal   •   ImpactTreeView    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                        Observes UID & Auth State
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         AUTH DATA ISOLATOR                             │
│   • On login: Switch active storage prefix to `athar_{uid}_*`          │
│   • On logout: Purge cache in memory, switch to `athar_guest_*`        │
│   • On guest login: Idempotently sync guest entries into cloud         │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
         Local Read/Write (Offline)          Cloud Sync (Online)
                    ▼                                ▼
┌────────────────────────────────────────┐   ┌───────────────────────────┐
│          SCOPED LOCAL STORAGE          │   │      FIRESTORE CLOUD      │
│  athar_{uid}_prayers_v1                │   │  /users/{userId}          │
│  athar_{uid}_khatmah_v1                │   │    ├── xp_ledger/{evId}   │
│  athar_{uid}_adhkar_v1                 │   │    ├── achievements/{id}  │
│  athar_{uid}_ledger_v1                 │   │    └── daily_stats/{date} │
│  athar_{uid}_sadaqah_v1                │   │  (Strict ABAC isOwner)    │
└────────────────────────────────────────┘   └───────────────────────────┘
```

### Firestore Security Hardening
The rules in `firestore.rules` already enforce zero-trust ownership checks. We will verify and maintain:
- `allow get, create, update, delete: if isOwner(userId);` on `/users/{userId}`.
- `allow get, list, create: if isOwner(userId);` on `/users/{userId}/xp_ledger/{eventId}` with strict schema validation.
- `allow get, list, create, update: if isOwner(userId);` on `/users/{userId}/achievements/{badgeId}`.
- Immutable `eventId`, `userId`, `points` ($1 \le \text{points} \le 50$), and strict timestamps.

---

## 5. Step-by-Step Implementation Sequence

1. **Step 1: UID Scoping Engine in `StorageService` & `GamificationService`**
   - Refactor `StorageService` and `GamificationService` to support dynamic user-specific storage keys (`getScopedKey(baseKey)`).
   - Add account switch listener (`athar_auth_switched`) that immediately refreshes cached instances and triggers UI re-renders.

2. **Step 2: Guest Data Migration & Cloud Synchronization**
   - Implement `syncUserActivitiesToCloud(uid)` in `GamificationService` / `ProfileStatsService`.
   - On sign-in, merge uncommitted guest entries into the cloud ledger without duplication.
   - Fetch remote cloud ledger on sign-in and reconcile with local scoped cache.

3. **Step 3: Profile Dashboard Binding with Honest Empty States**
   - Update `ProfileDashboardView.tsx` and `ProfileStatsService.ts` to compute metrics exclusively from the current active user's scoped storage and cloud profile.
   - Ensure 0-state renders beautifully with encouraging spiritual copy (e.g. "ابدأ خطوتك الأولى في رحاب الأثر").

4. **Step 4: Comprehensive Multi-Account & Isolation Test Suite**
   - Write and execute automated verification suite (`src/tests/multiAccountIsolation.test.ts`):
     - Test 1: User A logs 3 prayers $\to$ switches to User B $\to$ User B has 0 prayers.
     - Test 2: User B records Fajr $\to$ switches back to User A $\to$ User A retains 3 prayers.
     - Test 3: Guest accumulates 30 XP $\to$ signs into fresh Account C $\to$ Account C receives 30 XP.
     - Test 4: Idempotent replay of existing event IDs yields 0 duplicate points.
     - Test 5: Offline queue re-syncs accurately upon network restoration.

5. **Step 5: Compilation & Verification**
   - Run `npm run test:notifications`, `npm run test:auth`, `npm run test:gamification`, and the new isolation test suite.
   - Run `lint_applet` and `compile_applet`.
