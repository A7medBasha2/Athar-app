# Athar Respectful Spiritual Habit & Achievement System

A mindful, dignity-preserving progression and achievement architecture for Athar (`com.athar.islamic`). It helps Muslims track personal consistency and cultivate lasting spiritual habits without turning worship into a gamified competition, vanity leaderboard, or source of religious pressure.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following core design decisions were confirmed during Phase 1 interactive clarification:
> - **XP & Level Progression Pacing**: **Gentle habit building with steady daily caps** — progressive level thresholds that prioritize lifelong daily regularity over binge activity or racing.
> - **Data Persistence & Ledger Architecture**: **Hybrid local-first with Firestore idempotent synchronization** — instant offline responsiveness with deterministic cloud deduplication preventing double-claims.
> - **Locked Badge Discovery**: **Transparent requirements with real-time progress counters** — clear, honest habit goals without manipulative mystery mechanics or hidden traps.

---

## 1. Ethical Gamification & Reward Policy

### Core Ethical Principles
1. **No Worship Commercialization or Competition**: There are **zero public leaderboards**, no social comparisons, and no rankings by religious worth. Progress is exclusively an intimate, private mirror between the believer and their daily discipline.
2. **Anti-Rushing & Verified Measurement**: Points are never awarded for hastily skipping through pages or tapping buttons repeatedly. Rewards are only granted when measurable milestones occur (e.g. prayer time has arrived, full morning/evening session completed, actual Quran reading/listening recorded, genuine charity logged).
3. **Strict Daily Caps (Ceilings)**: Prevents compulsive app engagement and guarantees that daily consistency outweighs artificial spikes.
4. **Idempotent Transaction Hashing**: Every rewardable event generates a deterministic event ID (`xp_{category}_{action}_{dateKey}_{slot}`). Triggering the same action multiple times within the same cycle generates a zero-delta result.

### Defined XP Policy & Daily Allocation Matrix

| Activity Category | Action / Milestone | Base XP | Daily Limit / Frequency | Max Daily XP | Verification Mechanism |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Daily Prayers (الصلوات المفروضة)** | Logging an obligatory prayer after its astronomical time enters | +15 XP per prayer | 5 prayers per day | **75 XP** | Astronomical time check via `isPrayerTimeArrived()` |
| **Prophetic Sunnahs (السنن الرواتب)** | Completing registered Sunan (Rawatib, Duha, Qiyam) | +10 XP | Once daily | **10 XP** | At least one valid Sunnah slot checked |
| **Morning Adhkar (أذكار الصباح)** | Completing the verified Morning Adhkar session | +15 XP | Once daily | **15 XP** | Session completion triggered in `adhkarStats` |
| **Evening Adhkar (أذكار المساء)** | Completing the verified Evening Adhkar session | +15 XP | Once daily | **15 XP** | Session completion triggered in `adhkarStats` |
| **Quran Reading & Listening (ورد القرآن)** | Reading daily target or listening $\ge 10$ mins | +20 XP | Once daily | **20 XP** | Actual audio progress or Ayah milestone in `khatmah` |
| **Charity & Good Deeds (الصدقة والإحسان)** | Logging a genuine charity deed or kinship interaction | +15 XP | Max 1 rewarded deed/day | **15 XP** | Sadaqah record or Kinship interaction saved |
| **Habit Streak Bonus (الاستمرارية)** | Maintaining a continuous consecutive streak of $\ge 3$ days | +5 XP bonus | Once daily on active day | **5 XP** | Verified consecutive `streakDays` check |

- **Maximum Possible Daily XP**: **150 XP** (hard cap per 24 hours).
- **Opening the App**: **0 XP** (strictly zero points for launches, browsing, or idle time).

### Level Progression Formula
- Progression uses an organic square-root curve that offers satisfying early orientation and steady long-term stability:
  $$\text{Level}(XP) = \left\lfloor \sqrt{\frac{XP}{50}} \right\rfloor + 1$$
- **Level Thresholds**:
  - **Level 1 (البداية المباركة)**: 0 – 49 XP
  - **Level 2 (خطوة الأثر)**: 50 – 199 XP (~1–2 days of steady habit)
  - **Level 3 (غرس الإيمان)**: 200 – 449 XP (~3–4 days)
  - **Level 4 (طريق السكينة)**: 450 – 799 XP (~6–8 days)
  - **Level 5 (مقام الاستقامة)**: 800 – 1,249 XP (~10–12 days)
  - **Level 6 (نور الطاعة)**: 1,250 – 1,799 XP (~2 weeks)
  - **Level 7 (ظلال الأثر)**: 1,800 – 2,449 XP (~3 weeks)
  - **Level 8 (دوام الذكر)**: 2,450 – 3,199 XP (~1 month)
  - **Level 9 (حصن المتقين)**: 3,200 – 4,049 XP (~1.5 months)
  - **Level 10 (رياض الجنة)**: 4,050+ XP (~1.5–2 months of continuous discipline)

---

## 2. Reusable Badge System (15 Verifiable Badges)

Every badge is measured **strictly** against concrete data structures already maintained in Athar.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          15 VERIFIABLE ATHAR BADGES                              │
├───────────────────┬───────────────────────────────────┬─────────────────────────┤
│ Category          │ Badge ID & Arabic Title           │ Verifiable Criteria     │
├───────────────────┼───────────────────────────────────┼─────────────────────────┤
│ 1. Prayers        │ • `fajr_guardian` (حارس الفجر)     │ Fajr logged on time     │
│   (الصلوات)        │ • `five_daily` (الصلوات الخمس)    │ 5 daily prayers in 1 day│
│                   │ • `sunan_reviver` (محيي السنن)    │ Any Sunnah logged       │
│                   │ • `qiyam_light` (نور القيام)      │ Qiyam / Witr logged     │
├───────────────────┼───────────────────────────────────┼─────────────────────────┤
│ 2. Quran          │ • `first_recitation` (أول تلاوة)  │ $\ge 1$ Ayah recorded   │
│   (القرآن الكريم)  │ • `quran_wird_keeper` (حافظ الورد)│ Daily wird completed    │
│                   │ • `quran_hour` (ساعة مع القرآن)   │ $\ge 60$ mins listened  │
│                   │ • `surah_completed` (إتمام سورة)  │ 1 full Surah completed  │
├───────────────────┼───────────────────────────────────┼─────────────────────────┤
│ 3. Adhkar         │ • `first_dhikr` (بداية الأثر)     │ First dhikr step taken  │
│   (الذكر والتسبيح)│ • `morning_guard` (حارس الصباح)   │ Morning session 100%    │
│                   │ • `evening_guard` (حارس المساء)   │ Evening session 100%    │
│                   │ • `tasbih_master` (مسبحة الذاكرين)│ $\ge 100$ total tasbih  │
├───────────────────┼───────────────────────────────────┼─────────────────────────┤
│ 4. Charity & Kin  │ • `sadaqah_giver` (باذل المعروف)  │ $\ge 1$ Sadaqah logged  │
│   (الصدقة والبر)   │ • `parents_dutiful` (بار الوالدين) │ $\ge 1$ Kinship act done│
├───────────────────┼───────────────────────────────────┼─────────────────────────┤
│ 5. Steadiness     │ • `streak_7_days` (ثبات أسبوع)    │ Continuous 7-day streak │
│   (الاستمرارية)   │                                   │                         │
└───────────────────┴───────────────────────────────────┴─────────────────────────┘
```

### Badge Data Model Interface
```typescript
export type BadgeCategory = 'prayers' | 'quran' | 'adhkar' | 'charity' | 'streak';
export type BadgeVisualState = 'locked' | 'in_progress' | 'earned';

export interface AchievementBadgeDef {
  id: string;
  title: string;
  description: string;
  category: BadgeCategory;
  medalType: 'quran' | 'flame' | 'tasbih' | 'charity' | 'mosque';
  xpReward: number;
  maxProgress: number;
  unit: string;
  calculateProgress: (snapshot: ActivitySnapshot) => { current: number; isEarned: boolean };
}

export interface UserBadgeRecord {
  badgeId: string;
  isEarned: boolean;
  earnedAt?: string; // ISO 8601 string when earned
  currentProgress: number;
  maxProgress: number;
  state: BadgeVisualState;
}
```

---

## 3. Visual Design & User Experience (Black & Gold System)

- **Medal System Aesthetics**:
  - **Earned Badges**: High-contrast 24K gold metallic medallion (`#FFE6A0`, `#D9AE48`, `#916E25`) with deep dimensional drop shadow, subtle warm golden ambient glow, and verified completion checkmark.
  - **In-Progress Badges**: Dark bronze rim (`#2A2418`) with crisp gold hairline indicator and a dedicated progress pill displaying `3 / 7 أيام` (`42%`).
  - **Locked Badges**: Muted titanium bronze silhouette (`#14120B`) with transparent requirements and zero unearned glory.
- **Achievements Overview Screen & Modal**:
  - **Header**: Total XP counter with 24K gold star, current level medallion rosette, and progress bar to next level.
  - **Category Tabs**: Horizontal segmented touch-friendly selector (`الكل`, `الصلوات`, `القرآن`, `الأذكار`, `الصدقة`, `الاستمرارية`).
  - **Badges Grid**: 3-column responsive touch layout adhering to the $\ge 44\text{px}$ touch target minimum.
  - **Points History Ledger Drawer**: Accessible toggle showing recent earned XP entries with timestamp, activity label, and points delta (`+15 XP`).
  - **Badge Detail Modal**: Shows badge medallion in large detail, historical earned timestamp, exact criteria, and a direct action shortcut (e.g. "فتح المصحف", "الذهاب للمسبحة", "تسجيل صلاة").
  - **Empty / Loading / Error States**: Elegant dark textured placeholders with clear Arabic guidance.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Athar Application Layer                           │
│                                                                             │
│   ┌───────────────────────────┐         ┌───────────────────────────────┐   │
│   │   ProfileDashboardView    │         │  AchievementsOverviewModal    │   │
│   │   - LevelProgressCard     │ ◄─────► │  - Category Filters (6 Tabs)  │   │
│   │   - ActivityStreakCard    │         │  - 15 Medal Badges Grid       │   │
│   │   - ActivityStatCard (2x2)│         │  - Points History Ledger      │   │
│   └─────────────┬─────────────┘         └───────────────┬───────────────┘   │
└─────────────────┼───────────────────────────────────────┼───────────────────┘
                  │                                       │
                  ▼                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GamificationEngineService                          │
│                                                                             │
│   • `evaluateAndAwardXP(userId, action, metadata)` -> Idempotent Tx        │
│   • `syncGamificationState(userId)` -> Evaluates all 15 Badges             │
│   • `getXPHistory(userId)` -> Returns ordered ledger entries                │
│   • `calculateLevel(totalXP)` -> Deterministic Level & Next Level Gap       │
└─────────────────┬───────────────────────────────────────┬───────────────────┘
                  │                                       │
                  ▼                                       ▼
┌────────────────────────────────────────┐ ┌──────────────────────────────────┐
│      Client Cache (LocalStorage)       │ │      Cloud Firestore Database    │
│      • `athar_gamification_state_v1`   │ │      `users/{userId}/`           │
│      • `athar_xp_ledger_v1`            │ │        ├── `gamification/summary`│
│      (Instant offline rendering)       │ │        └── `xp_ledger/{eventId}` │
│                                        │ │      (Zero-trust access rules)   │
└────────────────────────────────────────┘ └──────────────────────────────────┘
```

### Firestore Security Rules & Access Control
- Subcollection `/users/{userId}/gamification/summary`:
  - Read/Write strictly constrained to `isOwner(userId)`.
  - Schema validation verifies that `totalXP` and `level` are positive integers within realistic bounds ($\le 10,000,000$).
- Subcollection `/users/{userId}/xp_ledger/{eventId}`:
  - Document ID `{eventId}` must follow strict regex `^[a-zA-Z0-9_\\-]+$`.
  - Immutable once written (`allow update: if false`).
  - `points` must be $\le 50$ per event to prevent client-side XP inflation.

---

## 5. Migration Strategy & Non-Destructive Integrity

1. **Existing User Protection**:
   - Migration calculates the starting XP strictly from verified activities already saved in local storage (e.g. completed prayers count, minutes of Quran, completed morning/evening sessions, recorded sadaqat).
   - Historical achievements are not fabricated; badges are unlocked only if the user's authentic history satisfies the criteria.
2. **New User Clean State**:
   - New users start gracefully at Level 1 (0 XP) with empty badges marked "in progress" or "locked" and helpful Arabic guidance.
3. **Double-Reward Prevention**:
   - Local and remote caches use unique idempotent IDs such that re-opening the app or re-evaluating prayers never re-awards points for past dates.

---

## 6. Verification & Automated Test Plan

1. **XP & Policy Suite (`src/tests/gamificationSystem.test.ts`)**:
   - **Test 1**: Verify prayer logging awards exactly 15 XP once per prayer slot.
   - **Test 2**: Test idempotent deduplication: re-recording the same prayer on the same day yields 0 additional XP.
   - **Test 3**: Verify daily caps: exceeding 150 XP in a single simulated day is strictly rejected.
   - **Test 4**: Test level progression math: 0 XP = Level 1, 1250 XP = Level 6, calculating correct percentage to Level 7.
   - **Test 5**: Test badge evaluation: satisfying Fajr condition unlocks `fajr_guardian` with timestamp.
   - **Test 6**: Test locked badges: unfulfilled criteria remain locked with transparent progress ratio.
   - **Test 7**: Zero-history user handling: zero errors, level 1, clean empty history ledger.
2. **UI & Build Verification**:
   - Verify `compile_applet` and `lint_applet` with zero TypeScript errors.
   - Confirm adherence to Athar's black-and-gold visual system.
