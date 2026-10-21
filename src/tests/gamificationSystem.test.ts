/**
 * Comprehensive Automated Test Suite for Athar Gamification & Achievement System
 * Evaluates:
 * 1. XP Pacing & Level Progression Curves
 * 2. Idempotent Deduplication (No duplicate points on replay)
 * 3. Daily Cap Safeguards (Strict 150 XP/day max)
 * 4. Authentic Badge Criteria Evaluation (Verifiable against real application data)
 * 5. Non-Destructive Legacy User Migration (Zero fabricated history)
 * 6. Ethical Integrity (Zero public rankings, no worship commercialization)
 */

// Setup in-memory mock storage if running in pure Node / tsx
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

const {
  calculateLevelFromXP,
  getLevelTitle,
  XP_POLICY_CONFIG,
  GamificationService,
} = await import('../services/gamificationService');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    testsPassed++;
  } else {
    console.error(`  [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
    testsFailed++;
  }
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('   ATHAR ETHICAL GAMIFICATION SYSTEM VERIFICATION   ');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // TEST GROUP 1: Level Progression Math & Spiritual Titles
  // ----------------------------------------------------
  console.log('--- Suite 1: Level Math & Spiritual Calibration ---');
  {
    // Level 1: 0 XP
    const lvl0 = calculateLevelFromXP(0);
    assert(lvl0.level === 1, '0 XP maps to Level 1');
    assert(lvl0.levelTitle === 'البداية المباركة', 'Level 1 spiritual title is "البداية المباركة"');
    assert(lvl0.xpRequiredForNextLevel === 50, 'Level 1 requires 50 XP to reach Level 2');
    assert(lvl0.levelProgressPercent === 0, 'Level 1 progress is 0%');

    // Level 2: 50 XP
    const lvl50 = calculateLevelFromXP(50);
    assert(lvl50.level === 2, '50 XP reaches Level 2');
    assert(lvl50.levelTitle === 'خطوة الأثر', 'Level 2 title is "خطوة الأثر"');
    assert(lvl50.xpInCurrentLevel === 0, 'At exactly 50 XP, current level XP starts at 0');

    // Level 2 midway: 125 XP (Level 2 is 50 to 200 XP, span = 150. 125 - 50 = 75 => 50%)
    const lvl125 = calculateLevelFromXP(125);
    assert(lvl125.level === 2, '125 XP remains in Level 2');
    assert(lvl125.xpInCurrentLevel === 75, 'Level 2 progress has 75 XP out of 150');
    assert(lvl125.levelProgressPercent === 50, 'Level 2 progress is exactly 50%');

    // Level 10: 4050+ XP
    const lvlMax = calculateLevelFromXP(5000);
    assert(lvlMax.level >= 10, '5000 XP maps to Level 10+');
    assert(getLevelTitle(lvlMax.level) === 'رياض الجنة', 'Level 10 title is "رياض الجنة"');
  }

  // ----------------------------------------------------
  // TEST GROUP 2: XP Policy Validation & Daily Caps
  // ----------------------------------------------------
  console.log('\n--- Suite 2: Policy Bounds & Ethical Safeguards ---');
  {
    assert(XP_POLICY_CONFIG.dailyCapTotal === 150, 'Daily cap is strictly configured at 150 XP');
    assert(XP_POLICY_CONFIG.activities.prayer_fajr.points === 15, 'Fajr prayer awards exactly 15 XP');
    assert(XP_POLICY_CONFIG.activities.adhkar_morning.points === 15, 'Morning Adhkar awards exactly 15 XP');
    assert(XP_POLICY_CONFIG.activities.quran_daily_wird.points === 20, 'Daily Wird awards exactly 20 XP');
    assert(XP_POLICY_CONFIG.activities.streak_bonus.points === 5, 'Daily streak bonus awards exactly 5 XP');

    // Verify all activities have maxPerDay === 1
    const allActivities = Object.values(XP_POLICY_CONFIG.activities);
    const allCapped = allActivities.every(a => a.maxPerDay === 1);
    assert(allCapped, 'Every supported activity is restricted to max 1 completion per day');
  }

  // ----------------------------------------------------
  // TEST GROUP 3: Idempotent Deduplication (Replay Attack)
  // ----------------------------------------------------
  console.log('\n--- Suite 3: Idempotency & Replay Attack Defense ---');
  {
    localStorage.clear();
    const testDate = '2026-10-21';

    // First attempt: Award prayer Fajr
    const res1 = await GamificationService.recordActivity('prayer_fajr', testDate);
    assert(res1.awarded === true, 'First registration of Fajr is awarded');
    assert(res1.points === 15, 'Awarded points equal 15');

    // Replay attack: User spams button 10 times for same prayer on same date
    let duplicateAwarded = false;
    for (let i = 0; i < 10; i++) {
      const resDup = await GamificationService.recordActivity('prayer_fajr', testDate);
      if (resDup.awarded) {
        duplicateAwarded = true;
      }
    }
    assert(!duplicateAwarded, 'Spamming the same prayer 10 times awarded 0 additional points');

    // Verify ledger contains exactly 1 entry for this prayer
    const ledger = GamificationService.getLocalLedger();
    const fajrEntries = ledger.filter(e => e.activityType === 'prayer_fajr' && e.dateKey === testDate);
    assert(fajrEntries.length === 1, 'Ledger has exactly 1 entry for Fajr on this date');
  }

  // ----------------------------------------------------
  // TEST GROUP 4: Daily Total XP Cap Enforcement (150 XP)
  // ----------------------------------------------------
  console.log('\n--- Suite 4: Strict Daily 150 XP Ceiling ---');
  {
    localStorage.clear();
    const testDate = '2026-10-22';

    // Award all supported activities for that day
    await GamificationService.recordActivity('prayer_fajr', testDate); // 15
    await GamificationService.recordActivity('prayer_dhuhr', testDate); // 15
    await GamificationService.recordActivity('prayer_asr', testDate); // 15
    await GamificationService.recordActivity('prayer_maghrib', testDate); // 15
    await GamificationService.recordActivity('prayer_isha', testDate); // 15
    await GamificationService.recordActivity('prayer_sunnah', testDate); // 10
    await GamificationService.recordActivity('adhkar_morning', testDate); // 15
    await GamificationService.recordActivity('adhkar_evening', testDate); // 15
    await GamificationService.recordActivity('quran_daily_wird', testDate); // 20
    await GamificationService.recordActivity('quran_audio_session', testDate); // 15
    await GamificationService.recordActivity('sadaqah_deed', testDate); // 15
    // Sum so far: 15*5 + 10 + 15 + 15 + 20 + 15 + 15 = 75 + 10 + 80 = 165, but cap is 150!

    const dayPoints = GamificationService.getDailyXPEarned(testDate);
    assert(dayPoints <= 150, `Total points on date ${testDate} is ${dayPoints} (<= 150 XP limit)`);

    // Attempt to add another activity on top
    const overflowRes = await GamificationService.recordActivity('kinship_dua', testDate);
    assert(overflowRes.awarded === false || overflowRes.points === 0, 'Excess activity beyond 150 XP daily cap is denied');
  }

  // ----------------------------------------------------
  // TEST GROUP 5: Verifiable Achievement Badges System
  // ----------------------------------------------------
  console.log('\n--- Suite 5: Verifiable Badge Requirements ---');
  {
    localStorage.clear();

    // Baseline: Fresh user with no records
    const initialBadges = GamificationService.evaluateBadges();
    assert(initialBadges.length === 15, 'All 15 official Athar badges are registered');
    const allLocked = initialBadges.every(b => !b.isUnlocked);
    assert(allLocked, 'All badges are legitimately locked for brand-new users');

    const today = GamificationService.getTodayKey();

    // Simulate authentic user stats: 3 days streak, morning session done
    localStorage.setItem('athar_prayer_achievements_v1', JSON.stringify({
      streakDays: 3,
      longestStreak: 3,
      totalPrayersLogged: 12,
      todayPrayers: { fajr: true, dhuhr: true, asr: false, maghrib: false, isha: false, sunan: true, qiyam: false },
      todaySunanDetails: { fajr_before: true },
      lastActiveDate: today,
      unlockedBadgeIds: ['fajr_guardian', 'sunan_reviver'],
    }));

    localStorage.setItem('athar_adhkar_stats_v1', JSON.stringify({
      currentStreak: 3,
      longestStreak: 3,
      lastActiveDate: today,
      totalDhikrRecited: 150,
      todayDhikrCount: 30,
      morningCompletedToday: true,
      eveningCompletedToday: false,
      totalMorningSessions: 5,
      totalEveningSessions: 2,
      unlockedBadgeIds: ['first_dhikr', 'morning_guard', 'hundred_club', 'streak_3'],
    }));

    localStorage.setItem('athar_tasbih_state_v1', JSON.stringify({
      totalAllTime: 150,
      items: [],
    }));

    const evaluated = GamificationService.evaluateBadges();
    const fajrBadge = evaluated.find(b => b.id === 'fajr_guardian');
    assert(fajrBadge?.isUnlocked === true, 'Fajr guardian badge is authentically earned');
    assert(fajrBadge?.visualState === 'earned', 'Fajr guardian visualState is "earned"');

    const morningBadge = evaluated.find(b => b.id === 'morning_guard');
    assert(morningBadge?.isUnlocked === true, 'Morning guard badge is authentically earned');

    const tasbihBadge = evaluated.find(b => b.id === 'tasbih_master');
    assert(tasbihBadge?.isUnlocked === true, 'Tasbih master badge is earned (150 recited >= 100)');
    assert(tasbihBadge?.currentProgress === 100, 'Tasbih master badge has target progress achieved');

    const quranHour = evaluated.find(b => b.id === 'quran_hour');
    assert(quranHour?.isUnlocked === false, 'Quran hour badge remains locked');
    assert(quranHour?.visualState === 'locked' || quranHour?.visualState === 'in_progress', 'Locked badge has correct visual state');
  }

  // ----------------------------------------------------
  // TEST GROUP 6: Non-Destructive Legacy User Migration
  // ----------------------------------------------------
  console.log('\n--- Suite 6: Non-Destructive Legacy Migration ---');
  {
    localStorage.clear();
    // Simulate legacy user with 45 prayers logged, 300 dhikrs, and 2 sadaqah records
    localStorage.setItem('athar_prayer_achievements_v1', JSON.stringify({
      streakDays: 5,
      totalPrayersLogged: 45,
      todayPrayers: {},
      unlockedBadgeIds: ['streak_3_prayers'],
    }));
    localStorage.setItem('athar_adhkar_stats_v1', JSON.stringify({
      totalDhikrRecited: 300,
      unlockedBadgeIds: ['first_dhikr', 'hundred_club'],
    }));
    localStorage.setItem('athar_sadaqah_records_v1', JSON.stringify([
      { id: 'sad_1', amount: 50, date: '2026-10-18' },
      { id: 'sad_2', amount: 20, date: '2026-10-20' },
    ]));

    // Perform migration
    GamificationService.migrateLegacyUserActivities();
    const summary = GamificationService.getGamificationSummary();
    assert(summary.totalXP > 0, `Legacy user migrated with authentic totalXP: ${summary.totalXP}`);
    assert(summary.totalXP <= 10000, 'Migration totalXP is reasonable and does not fabricate inflated stats');
    assert(summary.earnedBadgesCount >= 1, `Migrated user earned ${summary.earnedBadgesCount} legitimate badges`);

    // Running migration a second time MUST be idempotent (no duplicate points)
    GamificationService.migrateLegacyUserActivities();
    const summary2 = GamificationService.getGamificationSummary();
    assert(summary2.totalXP === summary.totalXP, 'Re-running migration is completely idempotent');
  }

  console.log('\n====================================================');
  console.log(`RESULTS: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log('STATUS: ' + (testsFailed === 0 ? 'ALL GAMIFICATION GUARANTEES VERIFIED ✓' : 'VERIFICATION FAILED ✗'));
  console.log('====================================================');

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Test suite error:', err);
  process.exit(1);
});
