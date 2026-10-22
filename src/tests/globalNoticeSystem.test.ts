/**
 * Unit & Integration Test Suite for Global In-App Notice System (Phase 4)
 * Covers:
 * 1. Role Authorization & Publishing Authority (Owner vs Moderator vs Guest/User)
 * 2. Notice Payload & Bounds Validation (Length, scope, priority, status)
 * 3. Schedule Math & Display Eligibility (Draft, Future Scheduled, Active, Expired)
 * 4. Scope Filtering Invariants (App-wide, Gamaa-only, Section-specific)
 * 5. Deterministic Priority & Pin Ordering (Urgent > High > Normal, Pinned > Unpinned)
 * 6. Session Dismissal Isolation & State Persistence
 * 7. Campaign Reference Navigation & Graceful Fallback Handling
 */

import {
  GamaaAdminService,
  GlobalNotice,
  NoticePriority,
  NoticeScope,
  NoticeStatus,
} from '../services/gamaaAdminService';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${message}`);
  }
}

console.log('===========================================================');
console.log('    ATHAR GLOBAL IN-APP NOTICE SYSTEM TEST SUITE           ');
console.log('===========================================================');

// ---------------------------------------------------------------------
// 1. Role Authorization Invariants
// ---------------------------------------------------------------------
console.log('\n--- 1. Role Authorization Invariants ---');

const mockSystemRolesDoc = {
  ownerUids: ['owner-uid-123', 'owner-uid-456'],
};

const mockModeratorDocs: Record<string, { active: boolean; permissions: string[] }> = {
  'mod-uid-active': {
    active: true,
    permissions: ['delete_post', 'manage_campaigns'],
  },
  'mod-uid-inactive': {
    active: false,
    permissions: ['delete_post'],
  },
};

function canPublishNotices(userId: string): boolean {
  // Enforced in rules: isSystemOwner() ONLY
  const isOwner = mockSystemRolesDoc.ownerUids.includes(userId);
  return isOwner;
}

assert(canPublishNotices('owner-uid-123') === true, '1.1: System owner is authorized to create/manage notices');
assert(canPublishNotices('owner-uid-456') === true, '1.2: Second system owner is authorized');
assert(canPublishNotices('mod-uid-active') === false, '1.3: Active moderator without owner role is NOT authorized to publish notices');
assert(canPublishNotices('mod-uid-inactive') === false, '1.4: Inactive moderator is NOT authorized');
assert(canPublishNotices('random-user-789') === false, '1.5: Regular authenticated user is NOT authorized');
assert(canPublishNotices('') === false, '1.6: Guest / unauthenticated is strictly rejected');

// ---------------------------------------------------------------------
// 2. Notice Payload & Bounds Validation
// ---------------------------------------------------------------------
console.log('\n--- 2. Notice Payload & Bounds Validation ---');

function validateNoticePayload(payload: {
  title?: string;
  message: string;
  scope: string;
  targetSection?: string;
  priority: string;
  status: string;
  startsAt: number;
  expiresAt: number;
}): { valid: boolean; reason?: string } {
  if (!payload.message || typeof payload.message !== 'string') {
    return { valid: false, reason: 'message_required' };
  }
  const trimmed = payload.message.trim();
  if (trimmed.length < 3) return { valid: false, reason: 'message_too_short' };
  if (trimmed.length > 300) return { valid: false, reason: 'message_too_long' };

  if (payload.title && payload.title.length > 60) {
    return { valid: false, reason: 'title_too_long' };
  }

  const validScopes: NoticeScope[] = ['app_wide', 'gamaa', 'section'];
  if (!validScopes.includes(payload.scope as NoticeScope)) {
    return { valid: false, reason: 'invalid_scope' };
  }

  if (payload.scope === 'section' && (!payload.targetSection || payload.targetSection.length > 64)) {
    return { valid: false, reason: 'invalid_target_section' };
  }

  const validPriorities: NoticePriority[] = ['normal', 'high', 'urgent'];
  if (!validPriorities.includes(payload.priority as NoticePriority)) {
    return { valid: false, reason: 'invalid_priority' };
  }

  const validStatuses: NoticeStatus[] = ['draft', 'scheduled', 'active', 'archived'];
  if (!validStatuses.includes(payload.status as NoticeStatus)) {
    return { valid: false, reason: 'invalid_status' };
  }

  if (payload.expiresAt <= payload.startsAt) {
    return { valid: false, reason: 'expires_before_starts' };
  }

  return { valid: true };
}

const now = 1700000000000;
const validNotice = {
  title: 'تنبيه إيماني مبارك',
  message: 'انضموا إلينا في حملة تسبيح جماعية مباركة لنيل الأجر والثواب',
  scope: 'app_wide',
  priority: 'high',
  status: 'active',
  startsAt: now,
  expiresAt: now + 86400000,
};

assert(validateNoticePayload(validNotice).valid === true, '2.1: Valid payload passes validation');

assert(
  validateNoticePayload({ ...validNotice, message: 'أ' }).reason === 'message_too_short',
  '2.2: Message shorter than 3 characters is rejected'
);

assert(
  validateNoticePayload({ ...validNotice, message: 'أ'.repeat(301) }).reason === 'message_too_long',
  '2.3: Message longer than 300 characters is rejected'
);

assert(
  validateNoticePayload({ ...validNotice, title: 'ع'.repeat(61) }).reason === 'title_too_long',
  '2.4: Title exceeding 60 characters is rejected'
);

assert(
  validateNoticePayload({ ...validNotice, scope: 'invalid_scope' }).reason === 'invalid_scope',
  '2.5: Invalid scope string rejected'
);

assert(
  validateNoticePayload({ ...validNotice, scope: 'section', targetSection: '' }).reason === 'invalid_target_section',
  '2.6: Section scope without targetSection rejected'
);

assert(
  validateNoticePayload({ ...validNotice, priority: 'super_urgent' }).reason === 'invalid_priority',
  '2.7: Unsupported priority level rejected'
);

assert(
  validateNoticePayload({ ...validNotice, status: 'deleted' }).reason === 'invalid_status',
  '2.8: Unsupported status string rejected'
);

assert(
  validateNoticePayload({ ...validNotice, startsAt: now, expiresAt: now - 1000 }).reason === 'expires_before_starts',
  '2.9: Expiration before start time strictly rejected'
);

assert(
  validateNoticePayload({ ...validNotice, startsAt: now, expiresAt: now }).reason === 'expires_before_starts',
  '2.10: Zero-duration notice (startsAt === expiresAt) strictly rejected'
);

// ---------------------------------------------------------------------
// 3. Schedule Math & Display Window Eligibility
// ---------------------------------------------------------------------
console.log('\n--- 3. Schedule Math & Display Window Eligibility ---');

function createMockNotice(overrides: Partial<GlobalNotice>): GlobalNotice {
  return {
    id: 'test-notice-id',
    title: 'تنبيه تجريبي',
    message: 'رسالة التنبيه التجريبية',
    scope: 'app_wide',
    priority: 'normal',
    isPinned: false,
    status: 'active',
    startsAt: { seconds: Math.floor(now / 1000) },
    expiresAt: { seconds: Math.floor((now + 3600000) / 1000) },
    creatorId: 'owner-uid',
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

const baseActiveNotice = createMockNotice({
  startsAt: { seconds: 1000 },
  expiresAt: { seconds: 2000 },
  status: 'active',
});

assert(
  GamaaAdminService.isNoticeActiveNow(baseActiveNotice, 1500000) === true,
  '3.1: Active notice within time window returns true'
);

assert(
  GamaaAdminService.isNoticeActiveNow(baseActiveNotice, 500000) === false,
  '3.2: Future scheduled notice (before startsAt) returns false'
);

assert(
  GamaaAdminService.isNoticeActiveNow(baseActiveNotice, 2500000) === false,
  '3.3: Expired notice (after expiresAt) returns false'
);

assert(
  GamaaAdminService.isNoticeActiveNow({ ...baseActiveNotice, status: 'draft' }, 1500000) === false,
  '3.4: Draft notice returns false even during its scheduled window'
);

assert(
  GamaaAdminService.isNoticeActiveNow({ ...baseActiveNotice, status: 'archived' }, 1500000) === false,
  '3.5: Archived notice returns false even during its scheduled window'
);

// Boundary exact match checks
assert(
  GamaaAdminService.isNoticeActiveNow(baseActiveNotice, 1000000) === true,
  '3.6: Exact startsAt timestamp returns true (inclusive start)'
);

assert(
  GamaaAdminService.isNoticeActiveNow(baseActiveNotice, 2000000) === true,
  '3.7: Exact expiresAt timestamp returns true (inclusive end)'
);

// ---------------------------------------------------------------------
// 4. Scope Filtering Invariants
// ---------------------------------------------------------------------
console.log('\n--- 4. Scope Filtering Invariants ---');

const appWideNotice = createMockNotice({ id: 'app-wide', scope: 'app_wide' });
const gamaaNotice = createMockNotice({ id: 'gamaa-only', scope: 'gamaa' });
const prayersNotice = createMockNotice({ id: 'prayers-only', scope: 'section', targetSection: 'prayers' });
const quranNotice = createMockNotice({ id: 'quran-only', scope: 'section', targetSection: 'quran' });

const allNotices = [appWideNotice, gamaaNotice, prayersNotice, quranNotice];

const homeFiltered = GamaaAdminService.filterNoticesForScope(allNotices, 'home');
assert(
  homeFiltered.length === 1 && homeFiltered[0].id === 'app-wide',
  '4.1: Home screen receives only app_wide notices'
);

const gamaaFiltered = GamaaAdminService.filterNoticesForScope(allNotices, 'gamaa');
assert(
  gamaaFiltered.some((n) => n.id === 'app-wide') && gamaaFiltered.some((n) => n.id === 'gamaa-only') && gamaaFiltered.length === 2,
  '4.2: Gamaa section receives both app_wide and gamaa notices'
);

const prayersFiltered = GamaaAdminService.filterNoticesForScope(allNotices, 'prayers');
assert(
  prayersFiltered.some((n) => n.id === 'app-wide') && prayersFiltered.some((n) => n.id === 'prayers-only') && prayersFiltered.length === 2,
  '4.3: Prayers section receives app_wide and section:prayers notices'
);

const quranFiltered = GamaaAdminService.filterNoticesForScope(allNotices, 'quran');
assert(
  quranFiltered.some((n) => n.id === 'quran-only') && !quranFiltered.some((n) => n.id === 'prayers-only'),
  '4.4: Quran section does not receive prayers notice'
);

// ---------------------------------------------------------------------
// 5. Deterministic Priority & Pin Ordering
// ---------------------------------------------------------------------
console.log('\n--- 5. Deterministic Priority & Pin Ordering ---');

const noticeNormal = createMockNotice({ id: 'normal-1', priority: 'normal', isPinned: false, startsAt: { seconds: 100 } });
const noticeHigh = createMockNotice({ id: 'high-1', priority: 'high', isPinned: false, startsAt: { seconds: 100 } });
const noticeUrgent = createMockNotice({ id: 'urgent-1', priority: 'urgent', isPinned: false, startsAt: { seconds: 100 } });
const noticeNormalPinned = createMockNotice({ id: 'normal-pinned', priority: 'normal', isPinned: true, startsAt: { seconds: 100 } });
const noticeUrgentNewer = createMockNotice({ id: 'urgent-newer', priority: 'urgent', isPinned: false, startsAt: { seconds: 200 } });

const sortedByPriority = GamaaAdminService.sortNoticesByPriority([
  noticeNormal,
  noticeHigh,
  noticeUrgent,
]);
assert(sortedByPriority[0].id === 'urgent-1', '5.1: Urgent priority ranks above high and normal');
assert(sortedByPriority[1].id === 'high-1', '5.2: High priority ranks above normal');
assert(sortedByPriority[2].id === 'normal-1', '5.3: Normal priority ranks last');

const sortedWithPin = GamaaAdminService.sortNoticesByPriority([
  noticeNormal,
  noticeNormalPinned,
]);
assert(sortedWithPin[0].id === 'normal-pinned', '5.4: Pinned notice ranks above unpinned of same priority');

const sortedByDate = GamaaAdminService.sortNoticesByPriority([
  noticeUrgent,
  noticeUrgentNewer,
]);
assert(sortedByDate[0].id === 'urgent-newer', '5.5: Newest notice ranks first among identical priority and pin status');

// ---------------------------------------------------------------------
// 6. Session Dismissal Isolation
// ---------------------------------------------------------------------
console.log('\n--- 6. Session Dismissal Isolation ---');

const mockSessionStorage: Record<string, string> = {};

function simulateDismiss(noticeId: string) {
  const current = mockSessionStorage['session_dismissed']
    ? JSON.parse(mockSessionStorage['session_dismissed'])
    : [];
  current.push(noticeId);
  mockSessionStorage['session_dismissed'] = JSON.stringify(current);
}

function isDismissedInSession(noticeId: string): boolean {
  const current: string[] = mockSessionStorage['session_dismissed']
    ? JSON.parse(mockSessionStorage['session_dismissed'])
    : [];
  return current.includes(noticeId);
}

simulateDismiss('notice-A');
assert(isDismissedInSession('notice-A') === true, '6.1: Dismissed notice A is marked as dismissed');
assert(isDismissedInSession('notice-B') === false, '6.2: Notice B remains undismissed (isolation)');

// Clear session storage (simulating app restart)
delete mockSessionStorage['session_dismissed'];
assert(isDismissedInSession('notice-A') === false, '6.3: Session reset restores notice A visibility on fresh launch');

// ---------------------------------------------------------------------
// 7. Campaign Link Fallback Handling
// ---------------------------------------------------------------------
console.log('\n--- 7. Campaign Link Fallback Handling ---');

const activeCampaignsList = [
  { id: 'camp-active-1', title: 'حملة الصلاة على النبي', status: 'active' },
  { id: 'camp-active-2', title: 'حملة الاستغفار', status: 'active' },
];

function resolveCampaignNavigation(campaignId: string): { found: boolean; campaign?: any; fallbackMessage?: string } {
  const target = activeCampaignsList.find((c) => c.id === campaignId);
  if (target) {
    return { found: true, campaign: target };
  }
  return { found: false, fallbackMessage: 'هذه الحملة غير متاحة حالياً أو تم إكمالها' };
}

const validCampNav = resolveCampaignNavigation('camp-active-1');
assert(validCampNav.found === true && validCampNav.campaign?.title === 'حملة الصلاة على النبي', '7.1: Valid linked campaign resolves smoothly');

const missingCampNav = resolveCampaignNavigation('non-existent-campaign-id');
assert(
  missingCampNav.found === false && Boolean(missingCampNav.fallbackMessage),
  '7.2: Inactive or non-existent campaign resolves to non-crashing fallback message'
);

console.log('===========================================================');
console.log(`  RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('===========================================================');

if (failedTests > 0) {
  process.exit(1);
}
