# Phase 2 — Real Campaign Participation in Gamaa Timeline

A production-grade implementation connecting the reserved campaign area in the Athar Gamaa timeline (`src/views/GamaaCommunityView.tsx`) to genuine Firestore community campaigns with real-time 10-shard counter aggregation, an interactive quick-dhikr participation modal, multi-campaign navigation, and strict anti-fabrication data guarantees.

---

## User Review & Confirmed Design Decisions

> [!IMPORTANT]
> The following decisions were confirmed by the user for Phase 2:
> 1. **Multiple Active Campaigns**: Display the primary active campaign in the top campaign card with sleek switch dots (`● ○ ○`) for quick carousel switching.
> 2. **Participation Action ("شارك الآن")**: Opens an interactive quick-dhikr modal (`GamaaCampaignParticipateModal.tsx`) featuring a dedicated tasbih counter, quick-add buttons (+33, +100), preset dhikr display, and idempotent submission.
> 3. **Zero Active Campaigns**: Display an elegant spiritual banner with Quranic guidance (*«يَدُ اللَّهِ مَعَ الْجَمَاعَةِ»*) and an entry point to browse/recover campaigns via `GamaaCampaignRecoveryModal`.

---

## 1. Architecture & Security Invariants

1. **Anti-Fabrication Policy**:
   - Zero mock counters, simulated progress percentages, or invented fields.
   - If a campaign has 0 contributions, it displays 0. If no campaign is active, the spiritual banner fallback is rendered.
2. **10-Shard Live Aggregation**:
   - Uses `CommunityCampaignService.subscribeToCampaignLiveCounter(campaignId, callback)` to listen directly to the `shards` subcollection.
   - Calculates the real live total dynamically by summing all 10 shard counts: $\sum_{i=0}^{9} \text{shard}_i.\text{count}$.
   - Progress bar calculation: $\min(100, \text{round}((\text{liveTotal} / \text{totalTarget}) \times 100))\%$.
3. **Idempotency & Session Protection**:
   - Contributions use `buildContributionId(uid, sessionId)` with format-validated UUID session IDs.
   - In-transaction duplicate detection: re-submitting the same session returns `alreadyRecorded: true` without incrementing shard counters.
   - 24-hour cap enforced by `CommunityCampaignService` (max 5,000 dhikr per user per campaign in 24 hours).
4. **Lifecycle & Status Integrity**:
   - Only campaigns with `status == 'active'` and unexpired `expiresAt` are shown for participation.
   - Incomplete campaigns (`initializing`, `shards_verified`) remain accessible via the recovery modal.

---

## 2. Component Design & Changes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       GamaaCommunityView.tsx                                │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Real Campaign Header Area:                                            │  │
│  │  - If campaigns.length > 0:                                           │  │
│  │    • Title, Target Dhikr Preset Arabic Name, Description              │  │
│  │    • Live 10-Shard Sum Total / Goal with Animated Progress Bar        │  │
│  │    • Switch Dots (● ○ ○) if multiple active campaigns exist           │  │
│  │    • "شارك الآن" (Participate Now) Button with Gold Pulsing Accent     │  │
│  │  - If campaigns.length === 0:                                         │  │
│  │    • Elegant spiritual banner («يَدُ اللَّهِ مَعَ الْجَمَاعَةِ»)              │  │
│  │    • Link to Browse & Recover Campaigns Modal                         │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     │                                       │
│  ┌──────────────────────────────────▼────────────────────────────────────┐  │
│  │ Continuous Post Stream (Phase 1 Dividers & Pull-to-Refresh)           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                   ┌──────────────────┴──────────────────┐
                   ▼                                     ▼
    ┌──────────────────────────────┐     ┌────────────────────────────────┐
    │ GamaaCampaignParticipateModal │     │ GamaaCampaignRecoveryModal     │
    │ - Interactive Tasbih Ring    │     │ - Existing recovery tool       │
    │ - Quick-add (+33, +100)      │     │ - Fixes interrupted campaigns  │
    │ - Real-time Target Counter   │     └────────────────────────────────┘
    │ - Idempotent Session Submit  │
    │ - Haptic Touch Vibration     │
    └──────────────────────────────┘
```

### Planned Files:
1. **`src/services/communityCampaignService.ts`**:
   - Add `subscribeToActiveCampaigns(callback: (campaigns: CommunityCampaign[]) => void)` with unsubscription cleanup and real-time Firestore synchronization.
   - Add Arabic label mapping helper for `VALID_DHIKR_PRESETS` (`subhanallah_wabihamdih`, `tasbih_tahmid_takbir`, `istighfar`, `salawat`, `la_ilaha_illallah`, `hawqala`).
2. **`src/components/gamaa/GamaaCampaignParticipateModal.tsx`** [NEW]:
   - Touch-optimized Arabic dialog styled with Athar gold gradients.
   - Interactive counter button with haptic feedback (`navigator.vibrate(15)`).
   - Fast presets: +33, +100, custom counter.
   - Max single session constraint ($\le 1,000$) and 24h cap warning display.
   - Submission state handling: pending spinner, success confirmation toast, error handling.
3. **`src/views/GamaaCommunityView.tsx`**:
   - Replace static text in the reserved campaign section with live campaign state.
   - Integrate `subscribeToActiveCampaigns` and `subscribeToCampaignLiveCounter`.
   - Multi-campaign dot indicators allowing horizontal browsing.
   - Modal trigger for `GamaaCampaignParticipateModal`.
4. **`src/tests/gamaaCommunitySocial.test.ts`**:
   - Expand test suite to cover:
     - 10-shard live counter calculation and zero-count edge cases.
     - Active campaign status filtering.
     - Idempotent contribution formatting and session validation.
     - Progress calculation and preset Arabic formatting.

---

## 3. Verification Plan

1. **Automated Unit Tests**:
   - Run `npx vitest run src/tests/gamaaCommunitySocial.test.ts` to ensure 100% test pass.
2. **TypeScript & Build Verification**:
   - Run `npx tsc --noEmit` to verify type safety.
   - Run `compile_applet` to confirm seamless Vite build.
3. **Manual Validation Scenarios**:
   - Zero active campaigns: verify spiritual placeholder displays cleanly without broken images or NaN percentages.
   - Active campaign: verify title, live counter from shards, progress percentage, and dot navigation.
   - Participation: verify tapping "شارك الآن" opens modal, counter increments, submission calls `contributeToCampaign`, and live counter updates.
