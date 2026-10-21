/**
 * Athar Multi-Account Isolation & Profile Dashboard Verification Test Suite
 * Tests strict UID scoping, account switching isolation, guest merging,
 * zero-state truthfulness, and idempotent deduplication.
 */

// 1. Setup in-memory mock environment before module imports
if (typeof globalThis.localStorage === 'undefined') {
  const memoryStore = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => memoryStore.get(key) || null,
    setItem: (key: string, val: string) => { memoryStore.set(key, String(val)); },
    removeItem: (key: string) => { memoryStore.delete(key); },
    clear: () => { memoryStore.clear(); },
    key: (i: number) => Array.from(memoryStore.keys())[i] || null,
    length: 0,
  } as any;
}

if (typeof (globalThis as any).Audio === 'undefined') {
  (globalThis as any).Audio = class MockAudio {
    play = async () => {};
    pause = () => {};
    addEventListener = () => {};
    removeEventListener = () => {};
  };
}

if (typeof (globalThis as any).CustomEvent === 'undefined') {
  (globalThis as any).CustomEvent = class CustomEvent {
    type: string;
    detail: any;
    constructor(type: string, params: any = {}) {
      this.type = type;
      this.detail = params.detail;
    }
  };
}

if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

// 2. Dynamic imports after environment polyfills
const { StorageService } = await import('../services/storageService');
const { GamificationService, XP_POLICY_CONFIG } = await import('../services/gamificationService');
const { ProfileStatsService } = await import('../services/profileStatsService');

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  [PASS] ${msg}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${msg}`);
    failedTests++;
  }
}

async function runTestSuite() {
  console.log('=====================================================================');
  console.log('   ATHAR MULTI-ACCOUNT ISOLATION & DASHBOARD INTEGRATION SUITE       ');
  console.log('=====================================================================\n');

  localStorage.clear();

  const userA_uid = 'firebase_uid_user_alpha_123';
  const userB_uid = 'firebase_uid_user_beta_456';

  // -------------------------------------------------------------------
  // TEST SUITE 1: Honest Empty State for Brand New Account
  // -------------------------------------------------------------------
  console.log('--- Suite 1: Honest Empty State for Brand-New User (Zero Fabrication) ---');
  const emptyStatsUserB = ProfileStatsService.getSpiritualStats(null, userB_uid);
  assert(emptyStatsUserB.prayersCountThisMonth === 0, 'New account has exactly 0 prayers this month');
  assert(emptyStatsUserB.adhkarCountThisMonth === 0, 'New account has exactly 0 adhkar this month');
  assert(emptyStatsUserB.quranHoursThisMonth === 0, 'New account has exactly 0 quran hours this month');
  assert(emptyStatsUserB.sadaqahCountThisMonth === 0, 'New account has exactly 0 sadaqah this month');
  assert(emptyStatsUserB.streakDays === 0, 'New account has exactly 0 streak days (no false 1-day streak)');
  assert(emptyStatsUserB.totalXP === 0, 'New account has exactly 0 XP');
  assert(emptyStatsUserB.currentLevel === 1, 'New account starts at Level 1 (البداية المباركة)');
  assert(emptyStatsUserB.levelProgressPercent === 0, 'Level 1 progress starts at 0%');

  const badgesUserB = GamificationService.evaluateBadges(userB_uid);
  const earnedUserB = badgesUserB.filter((b) => b.isUnlocked);
  assert(earnedUserB.length === 0, 'New account has 0 earned badges (all 15 badges authentically locked)');

  // -------------------------------------------------------------------
  // TEST SUITE 2: User A Activity Logging & Dashboard Metrics
  // -------------------------------------------------------------------
  console.log('\n--- Suite 2: User A Activity & Progression ---');
  // Record prayer Fajr for User A
  StorageService.toggleTodayPrayer('fajr', userA_uid);
  // Record Morning Adhkar for User A
  StorageService.recordSessionCompleted('morning', userA_uid);
  // Record Ayah read for User A
  StorageService.recordAyahRead(1, 10, userA_uid);
  // Add Sadaqah for User A
  StorageService.addSadaqahRecord(50, 'ج.م', 'إطعام مسكين', userA_uid);

  const statsUserA = ProfileStatsService.getSpiritualStats(null, userA_uid);
  assert(statsUserA.prayersCountThisMonth >= 1, `User A recorded prayers: ${statsUserA.prayersCountThisMonth} >= 1`);
  assert(statsUserA.adhkarCountThisMonth >= 1, `User A recorded adhkar: ${statsUserA.adhkarCountThisMonth} >= 1`);
  assert(statsUserA.quranHoursThisMonth > 0, `User A quran hours: ${statsUserA.quranHoursThisMonth} > 0`);
  assert(statsUserA.sadaqahCountThisMonth === 1, `User A recorded sadaqah: ${statsUserA.sadaqahCountThisMonth} === 1`);
  assert(statsUserA.streakDays >= 1, `User A streak is active: ${statsUserA.streakDays} >= 1`);
  assert(statsUserA.totalXP > 0, `User A earned XP: ${statsUserA.totalXP} > 0`);

  const badgesUserA = GamificationService.evaluateBadges(userA_uid);
  const earnedUserA = badgesUserA.filter((b) => b.isUnlocked);
  assert(earnedUserA.length >= 3, `User A legitimately unlocked badges: ${earnedUserA.length} >= 3`);

  // -------------------------------------------------------------------
  // TEST SUITE 3: Strict Account Isolation (User A vs User B)
  // -------------------------------------------------------------------
  console.log('\n--- Suite 3: Cross-Account Data Leakage Prevention ---');
  // Query User B again: Must still have ZERO data despite User A being active
  const checkUserB = ProfileStatsService.getSpiritualStats(null, userB_uid);
  assert(checkUserB.prayersCountThisMonth === 0, 'User B prayers remain strictly 0 (no leak from User A)');
  assert(checkUserB.adhkarCountThisMonth === 0, 'User B adhkar remain strictly 0 (no leak from User A)');
  assert(checkUserB.quranHoursThisMonth === 0, 'User B quran hours remain strictly 0 (no leak from User A)');
  assert(checkUserB.sadaqahCountThisMonth === 0, 'User B sadaqah remain strictly 0 (no leak from User A)');
  assert(checkUserB.streakDays === 0, 'User B streak remains strictly 0 (no leak from User A)');
  assert(checkUserB.totalXP === 0, 'User B XP remains strictly 0 (no leak from User A)');

  const checkBadgesUserB = GamificationService.evaluateBadges(userB_uid);
  const earnedCheckUserB = checkBadgesUserB.filter((b) => b.isUnlocked);
  assert(earnedCheckUserB.length === 0, 'User B unlocked badges remain strictly 0');

  // -------------------------------------------------------------------
  // TEST SUITE 4: User B Activity Logging & Independent Progression
  // -------------------------------------------------------------------
  console.log('\n--- Suite 4: User B Independent Progression ---');
  // Record Tasbih for User B (105 counts to unlock tasbih_master)
  for (let i = 0; i < 105; i++) {
    StorageService.incrementTasbih('subhanallah', userB_uid);
  }
  const tasbihStateB = StorageService.getTasbihState(userB_uid);
  assert(tasbihStateB.totalAllTime === 105, `User B tasbih count: ${tasbihStateB.totalAllTime} === 105`);

  // Verify User A tasbih is untouched
  const tasbihStateA = StorageService.getTasbihState(userA_uid);
  assert(tasbihStateA.totalAllTime === 0, `User A tasbih remains 0 (isolated from User B)`);

  const badgesAfterUserB = GamificationService.evaluateBadges(userB_uid);
  const tasbihMasterBadgeB = badgesAfterUserB.find((b) => b.id === 'tasbih_master');
  assert(tasbihMasterBadgeB?.isUnlocked === true, 'User B unlocked tasbih_master badge');

  const tasbihMasterBadgeA = GamificationService.evaluateBadges(userA_uid).find((b) => b.id === 'tasbih_master');
  assert(tasbihMasterBadgeA?.isUnlocked === false, 'User A tasbih_master badge remains locked');

  // -------------------------------------------------------------------
  // TEST SUITE 5: Guest Mode to Authenticated Account Migration
  // -------------------------------------------------------------------
  console.log('\n--- Suite 5: Guest to Authenticated Account Migration ---');
  // 1. Simulate guest activity (in default guest keys)
  StorageService.addBookmark({ surahNumber: 2, ayahNumber: 255 }, 'guest');
  StorageService.addSadaqahRecord(20, 'ج.م', 'صدقة زائر', 'guest');
  StorageService.toggleSurahCompletedInKhatmah(1, 'guest'); // Al-Fatihah
  await GamificationService.recordActivity('prayer_fajr', '2026-10-21', 'guest');

  const newUserUid = 'firebase_uid_newly_registered_789';

  // 2. Perform Migration on Login
  StorageService.migrateGuestDataToUser(newUserUid);

  // 3. Verify target user has the migrated data
  const migratedBookmarks = StorageService.getBookmarks(newUserUid);
  assert(migratedBookmarks.length === 1 && migratedBookmarks[0].ayahNumber === 255, 'Guest bookmark migrated to new user');

  const migratedSadaqah = StorageService.getSadaqahRecords(newUserUid);
  assert(migratedSadaqah.length === 1 && migratedSadaqah[0].amount === 20, 'Guest sadaqah migrated to new user');

  const migratedKhatmah = StorageService.getQuranKhatmah(newUserUid);
  assert(migratedKhatmah.completedSurahs.includes(1), 'Guest completed surah migrated to new user');

  const migratedLedger = GamificationService.getLocalLedger(newUserUid);
  assert(
    migratedLedger.length === 2 &&
    migratedLedger.some((e: any) => e.activityType === 'prayer_fajr') &&
    migratedLedger.some((e: any) => e.activityType === 'sadaqah_deed'),
    'Guest XP ledger (both sadaqah and prayer) migrated to new user'
  );

  // 4. Verify guest mode keys were cleanly purged
  const guestBookmarks = StorageService.getBookmarks('guest');
  assert(guestBookmarks.length === 0, 'Guest bookmarks cleanly purged after migration');
  const guestSadaqah = StorageService.getSadaqahRecords('guest');
  assert(guestSadaqah.length === 0, 'Guest sadaqah cleanly purged after migration');

  // -------------------------------------------------------------------
  // TEST SUITE 6: Idempotent Event Replay Defense
  // -------------------------------------------------------------------
  console.log('\n--- Suite 6: Idempotency & Replay Defense Across Accounts ---');
  const fixedDate = '2026-10-21';
  // Attempt to record same event twice for User A
  const res1 = await GamificationService.recordActivity('prayer_dhuhr', fixedDate, userA_uid);
  const res2 = await GamificationService.recordActivity('prayer_dhuhr', fixedDate, userA_uid);

  assert(res1.awarded === true, 'First attempt for prayer_dhuhr awarded XP');
  assert(res2.awarded === false, 'Duplicate replay attempt rejected');
  assert(res2.reason === 'Already awarded for this slot', 'Reason indicates idempotency protection');

  // Recording same activity for User B on same date must succeed independently
  const resUserB = await GamificationService.recordActivity('prayer_dhuhr', fixedDate, userB_uid);
  assert(resUserB.awarded === true, 'User B awarded same activity independently on same date');

  // -------------------------------------------------------------------
  // TEST SUITE 7: Daily XP Cap Enforcement
  // -------------------------------------------------------------------
  console.log('\n--- Suite 7: Strict Daily XP Cap Enforcement (150 XP) ---');
  const capTestUid = 'cap_test_user_999';
  const capDate = '2026-10-22';
  
  // Fill quota with various activities:
  await GamificationService.recordActivity('prayer_fajr', capDate, capTestUid); // 15
  await GamificationService.recordActivity('prayer_dhuhr', capDate, capTestUid); // 15
  await GamificationService.recordActivity('prayer_asr', capDate, capTestUid); // 15
  await GamificationService.recordActivity('prayer_maghrib', capDate, capTestUid); // 15
  await GamificationService.recordActivity('prayer_isha', capDate, capTestUid); // 15
  await GamificationService.recordActivity('prayer_sunnah', capDate, capTestUid); // 10
  await GamificationService.recordActivity('adhkar_morning', capDate, capTestUid); // 15
  await GamificationService.recordActivity('adhkar_evening', capDate, capTestUid); // 15
  await GamificationService.recordActivity('quran_daily_wird', capDate, capTestUid); // 20
  // Total so far: 135 XP

  // 10th activity awards remaining 15 XP to reach exactly 150 XP
  const resReachingCap = await GamificationService.recordActivity('quran_audio_session', capDate, capTestUid); // 15 => Exactly 150 XP
  assert(resReachingCap.awarded === true, 'Activity reaching exactly 150 XP awarded');
  assert(GamificationService.getDailyXPEarned(capDate, capTestUid) === 150, 'Daily XP earned reached exactly 150 XP');

  // Excess activity attempt beyond 150 XP daily ceiling
  const resExcess = await GamificationService.recordActivity('sadaqah_deed', capDate, capTestUid);
  assert(resExcess.awarded === false, 'Activity exceeding 150 XP ceiling denied');
  assert(resExcess.reason === 'Daily cap reached', 'Denial reason matches daily cap policy');

  console.log('\n=====================================================================');
  console.log(`  MULTI-ACCOUNT VERIFICATION RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('=====================================================================');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal error running multi-account tests:', err);
  process.exit(1);
});
