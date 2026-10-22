/**
 * Focused Unit Test Suite for Gamaa Social Community
 * Tests:
 * 1. Post content validation (boundary limits, whitespace trimming, lengths 3-600)
 * 2. Comment content validation (boundary limits, lengths 1-300)
 * 3. Reaction types validation ('jazakallah' | 'barakallah' | 'ameen')
 * 4. Arabic relative time formatting (just now, minutes, hours, days)
 * 5. Rate limit math & cooldown enforcement
 */

import { formatArabicTimeAgo } from '../components/gamaa/GamaaPostCard';
import { GamaaReactionType } from '../types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName} ${detail ? `-> ${detail}` : ''}`);
    failed++;
  }
}

console.log('===========================================================');
console.log('    GAMAA SOCIAL COMMUNITY VERIFICATION TEST SUITE        ');
console.log('===========================================================');

// 1. Arabic Relative Time Formatting
console.log('\n--- 1. Arabic Relative Time Formatting ---');
const now = Date.now();
assert(formatArabicTimeAgo(now - 10 * 1000) === 'الآن', '1.1: 10s ago renders as الآن');
assert(formatArabicTimeAgo(now - 65 * 1000) === 'منذ دقيقة', '1.2: 65s ago renders as منذ دقيقة');
assert(formatArabicTimeAgo(now - 130 * 1000) === 'منذ دقيقتين', '1.3: 130s ago renders as منذ دقيقتين');
assert(formatArabicTimeAgo(now - 300 * 1000) === 'منذ 5 دقائق', '1.4: 5m ago renders as منذ 5 دقائق');
assert(formatArabicTimeAgo(now - 3700 * 1000) === 'منذ ساعة', '1.5: ~1h ago renders as منذ ساعة');
assert(formatArabicTimeAgo(now - 7300 * 1000) === 'منذ ساعتين', '1.6: ~2h ago renders as منذ ساعتين');
assert(formatArabicTimeAgo(now - 86400 * 1000) === 'أمس', '1.7: 1d ago renders as أمس');
assert(formatArabicTimeAgo(null) === 'الآن', '1.8: null timestamp safely returns الآن');

// 2. Post Content Boundary Limits
console.log('\n--- 2. Post Content Boundary Limits ---');
function validatePostContent(content: string): { valid: boolean; error?: string } {
  const trimmed = content.trim();
  if (trimmed.length < 3) return { valid: false, error: 'محتوى المنشور قصير جداً' };
  if (trimmed.length > 600) return { valid: false, error: 'محتوى المنشور تجاوز الحد المسموح' };
  return { valid: true };
}

assert(validatePostContent('سبحان الله وبحمده').valid === true, '2.1: Valid Islamic reflection accepted');
assert(validatePostContent('  لا  ').valid === false, '2.2: Too short text rejected');
assert(validatePostContent('   ').valid === false, '2.3: Whitespace only rejected');
assert(validatePostContent('A'.repeat(600)).valid === true, '2.4: 600 characters boundary accepted');
assert(validatePostContent('A'.repeat(601)).valid === false, '2.5: 601 characters boundary rejected');

// 3. Comment Content Boundary Limits
console.log('\n--- 3. Comment Content Boundary Limits ---');
function validateCommentContent(content: string): { valid: boolean; error?: string } {
  const trimmed = content.trim();
  if (trimmed.length < 1) return { valid: false, error: 'التعليق فارغ' };
  if (trimmed.length > 300) return { valid: false, error: 'تجاوزت الحد المسموح للتعليق' };
  return { valid: true };
}

assert(validateCommentContent('جزاك الله خيراً يا أخي').valid === true, '3.1: Valid comment accepted');
assert(validateCommentContent(' ').valid === false, '3.2: Empty whitespace comment rejected');
assert(validateCommentContent('B'.repeat(300)).valid === true, '3.3: 300 chars comment accepted');
assert(validateCommentContent('B'.repeat(301)).valid === false, '3.4: 301 chars comment rejected');

// 4. Spiritual Reaction Types
console.log('\n--- 4. Spiritual Reaction Types ---');
const ALLOWED_REACTIONS: GamaaReactionType[] = ['jazakallah', 'barakallah', 'ameen'];
function isValidReaction(type: string): type is GamaaReactionType {
  return ALLOWED_REACTIONS.includes(type as GamaaReactionType);
}

assert(isValidReaction('jazakallah') === true, '4.1: jazakallah is a valid reaction');
assert(isValidReaction('barakallah') === true, '4.2: barakallah is a valid reaction');
assert(isValidReaction('ameen') === true, '4.3: ameen is a valid reaction');
assert(isValidReaction('like') === false, '4.4: generic like is strictly disallowed');
assert(isValidReaction('dislike') === false, '4.5: dislike is strictly disallowed');

// 5. Rate Limit Calculation
console.log('\n--- 5. Rate Limit Math ---');
function calculateRemainingCooldown(lastPostTimestamp: number, currentTimestamp: number, cooldownSeconds = 120): number {
  const elapsed = Math.floor((currentTimestamp - lastPostTimestamp) / 1000);
  const remaining = cooldownSeconds - elapsed;
  return remaining > 0 ? remaining : 0;
}

assert(calculateRemainingCooldown(now, now) === 120, '5.1: 0s elapsed gives 120s cooldown');
assert(calculateRemainingCooldown(now - 60 * 1000, now) === 60, '5.2: 60s elapsed gives 60s cooldown');
assert(calculateRemainingCooldown(now - 120 * 1000, now) === 0, '5.3: 120s elapsed cooldown fully cleared');
assert(calculateRemainingCooldown(now - 200 * 1000, now) === 0, '5.4: 200s elapsed cooldown remains 0');

// 6. Pull-To-Refresh Physics & Dampening Math
console.log('\n--- 6. Pull-To-Refresh Gesture Math ---');
function calculatePullDampened(diffY: number, maxDistance = 96): number {
  if (diffY <= 0) return 0;
  return Math.min(Math.pow(diffY, 0.82) * 1.8, maxDistance);
}

const PULL_THRESHOLD = 68;
assert(calculatePullDampened(-20) === 0, '6.1: Upward swipe gives 0 pull distance');
assert(calculatePullDampened(0) === 0, '6.2: Neutral touch gives 0 pull distance');
assert(calculatePullDampened(30) > 0 && calculatePullDampened(30) < PULL_THRESHOLD, '6.3: Moderate 30px pull does not trigger threshold');
assert(calculatePullDampened(150) >= PULL_THRESHOLD, '6.4: 150px pull exceeds threshold for trigger');
assert(calculatePullDampened(400) <= 96, '6.5: Maximum pull distance capped at 96px');

// 7. Phase 2: 10-Shard Live Aggregation & Progress Clamping
console.log('\n--- 7. 10-Shard Live Counter & Progress Clamping ---');
function sum10Shards(shards: Record<string, number>): number {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += shards[String(i)] || 0;
  }
  return sum;
}

function calculateProgress(liveTotal: number, target: number): number {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((liveTotal / target) * 100)));
}

const emptyShards: Record<string, number> = {};
assert(sum10Shards(emptyShards) === 0, '7.1: Empty shards map yields 0 live total');

const activeShards: Record<string, number> = {
  '0': 150,
  '1': 300,
  '2': 0,
  '3': 500,
  '4': 100,
  '5': 250,
  '6': 700,
  '7': 0,
  '8': 1000,
  '9': 2000,
};
assert(sum10Shards(activeShards) === 5000, '7.2: 10 shards correctly sum to 5,000');

assert(calculateProgress(0, 100000) === 0, '7.3: 0 live count yields 0% progress');
assert(calculateProgress(25000, 100000) === 25, '7.4: 25k/100k yields 25% progress');
assert(calculateProgress(100000, 100000) === 100, '7.5: 100k/100k yields 100% progress');
assert(calculateProgress(150000, 100000) === 100, '7.6: Overachieved count clamps to 100%');
assert(calculateProgress(500, 0) === 0, '7.7: Zero target safely prevents division by zero (0%)');

// 8. Phase 2: Session ID & Contribution ID Bijection
console.log('\n--- 8. Session ID & Contribution ID Invariants ---');
import { isValidSessionId, buildContributionId, VALID_DHIKR_PRESETS, DHIKR_PRESET_DETAILS, MAX_SESSION_AMOUNT, MAX_24H_CAMPAIGN_CAP } from '../services/communityCampaignService';

assert(isValidSessionId('ses-12345678') === true, '8.1: Valid alphanumeric-hyphen session ID accepted');
assert(isValidSessionId('ses-abc-123-xyz') === true, '8.2: Valid hyphenated session ID accepted');
assert(isValidSessionId('short') === false, '8.3: Session ID shorter than 8 chars rejected');
assert(isValidSessionId('invalid:with:colons') === false, '8.4: Session ID with colons rejected');
assert(isValidSessionId('has spaces in it') === false, '8.5: Session ID with spaces rejected');
assert(isValidSessionId('special#chars$') === false, '8.6: Session ID with special chars rejected');

const uid = 'user_abc_789';
const sess = 'ses-99887766';
const contribDocId = buildContributionId(uid, sess);
assert(contribDocId === 'user_abc_789:ses-99887766', '8.7: buildContributionId creates exact bijection');

let colonUidThrew = false;
try {
  buildContributionId('user:with:colon', sess);
} catch {
  colonUidThrew = true;
}
assert(colonUidThrew === true, '8.8: UID with colon throws error');

// 9. Phase 2: Dhikr Presets & Session Bounds
console.log('\n--- 9. Dhikr Presets & Session Bounds ---');
assert(VALID_DHIKR_PRESETS.length === 6, '9.1: Exactly 6 valid dhikr presets exist');
for (const preset of VALID_DHIKR_PRESETS) {
  const detail = DHIKR_PRESET_DETAILS[preset];
  assert(detail !== undefined, `9.2: Preset ${preset} has detail mapping`);
  assert(detail.label.length > 0, `9.3: Preset ${preset} has Arabic label`);
  assert(detail.text.length > 0, `9.4: Preset ${preset} has Arabic dhikr text`);
  assert(detail.defaultIncrement > 0 && detail.defaultIncrement <= 100, `9.5: Preset ${preset} has valid defaultIncrement`);
}

assert(MAX_SESSION_AMOUNT === 1000, '9.6: Single session cap is 1000');
assert(MAX_24H_CAMPAIGN_CAP === 5000, '9.7: 24h campaign cap is 5000');

console.log('\n===========================================================');
console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('===========================================================');

if (failed > 0) {
  process.exit(1);
}

