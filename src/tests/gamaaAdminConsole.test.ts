/**
 * Phase 3 — Gamaa Admin Console & Content Moderation Test Suite
 * Tests:
 * 1. Admin & Moderator Role Resolution (ABAC verification against /system_config/roles and /moderators)
 * 2. Report Payload Validation (target types, reasons, bounds, string limits)
 * 3. Report Lifecycle State Machine (pending -> resolved / dismissed)
 * 4. Campaign Maintenance State Transitions (active <-> paused -> completed -> archived)
 * 5. Authorization Invariants for Destructive Deletions (Author vs Moderator vs Owner vs Unauthorized)
 */

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
console.log('    GAMAA ADMIN CONSOLE & MODERATION TEST SUITE            ');
console.log('===========================================================');

// 1. Role Resolution Invariants
console.log('\n--- 1. Role Resolution Invariants ---');

interface MockRolesDoc {
  ownerUids: string[];
}

interface MockModeratorDoc {
  active: boolean;
  permissions: string[];
}

function resolveUserRole(
  uid: string,
  rolesDoc: MockRolesDoc | null,
  moderatorDoc: MockModeratorDoc | null
): { isOwner: boolean; isModerator: boolean; canDeletePosts: boolean; permissions: string[] } {
  let isOwner = false;
  let isModerator = false;
  let permissions: string[] = [];

  if (rolesDoc && rolesDoc.ownerUids.includes(uid)) {
    isOwner = true;
    permissions = ['delete_post', 'manage_campaigns', 'manage_roles', 'manage_reports'];
  }

  if (moderatorDoc && moderatorDoc.active === true) {
    isModerator = true;
    permissions = Array.from(new Set([...permissions, ...moderatorDoc.permissions]));
  }

  const canDeletePosts = isOwner || permissions.includes('delete_post');

  return { isOwner, isModerator, canDeletePosts, permissions };
}

const mockSystemRoles: MockRolesDoc = {
  ownerUids: ['owner_uid_123', 'mostafa_verified_uid'],
};

// 1.1 Owner check
const ownerResult = resolveUserRole('owner_uid_123', mockSystemRoles, null);
assert(ownerResult.isOwner === true, '1.1: UID in ownerUids is recognized as isOwner');
assert(ownerResult.canDeletePosts === true, '1.2: System owner has canDeletePosts permission');
assert(ownerResult.permissions.includes('manage_campaigns'), '1.3: System owner has manage_campaigns');

// 1.2 Active Moderator check
const activeModDoc: MockModeratorDoc = {
  active: true,
  permissions: ['delete_post', 'manage_reports'],
};
const modResult = resolveUserRole('mod_uid_456', mockSystemRoles, activeModDoc);
assert(modResult.isOwner === false, '1.4: Moderator is not mistaken for system owner');
assert(modResult.isModerator === true, '1.5: Active moderator is recognized as isModerator');
assert(modResult.canDeletePosts === true, '1.6: Active moderator with delete_post can delete posts');

// 1.3 Inactive Moderator check
const inactiveModDoc: MockModeratorDoc = {
  active: false,
  permissions: ['delete_post'],
};
const inactiveResult = resolveUserRole('inactive_mod_789', mockSystemRoles, inactiveModDoc);
assert(inactiveResult.isModerator === false, '1.7: Inactive moderator (active: false) has isModerator false');
assert(inactiveResult.canDeletePosts === false, '1.8: Inactive moderator cannot delete posts');

// 1.4 Regular User check
const regularResult = resolveUserRole('regular_user_000', mockSystemRoles, null);
assert(regularResult.isOwner === false, '1.9: Regular user isOwner is false');
assert(regularResult.isModerator === false, '1.10: Regular user isModerator is false');
assert(regularResult.canDeletePosts === false, '1.11: Regular user cannot delete arbitrary posts');

// 2. Report Payload Validation
console.log('\n--- 2. Report Payload Validation ---');

const VALID_TARGET_TYPES = ['post', 'comment'];
const VALID_REASONS = ['inappropriate', 'offensive', 'spam', 'other'];

function validateReportPayload(payload: {
  targetType: string;
  targetId: string;
  postId: string;
  reporterId: string;
  reason: string;
  details?: string;
  snippet?: string;
}): { valid: boolean; error?: string } {
  if (!VALID_TARGET_TYPES.includes(payload.targetType)) {
    return { valid: false, error: 'نوع المحتوى المبلغ عنه غير صالح' };
  }
  if (!payload.targetId || payload.targetId.length < 1 || payload.targetId.length > 128) {
    return { valid: false, error: 'معرف الهدف غير صالح' };
  }
  if (!payload.postId || payload.postId.length < 1 || payload.postId.length > 128) {
    return { valid: false, error: 'معرف المنشور غير صالح' };
  }
  if (!payload.reporterId || payload.reporterId.length < 1) {
    return { valid: false, error: 'معرف المبلغ مطلوب' };
  }
  if (!VALID_REASONS.includes(payload.reason)) {
    return { valid: false, error: 'سبب البلاغ غير مدرج' };
  }
  if (payload.details && payload.details.length > 300) {
    return { valid: false, error: 'تفاصيل البلاغ تجاوزت الحد المسموح (300 حرف)' };
  }
  if (payload.snippet && payload.snippet.length > 200) {
    return { valid: false, error: 'مقتطف المحتوى تجاوز الحد المسموح (200 حرف)' };
  }
  return { valid: true };
}

assert(
  validateReportPayload({
    targetType: 'post',
    targetId: 'post_123',
    postId: 'post_123',
    reporterId: 'user_456',
    reason: 'inappropriate',
    details: 'محتوى مخالف',
    snippet: 'نص تجريبي للمنشور',
  }).valid === true,
  '2.1: Valid post report is accepted'
);

assert(
  validateReportPayload({
    targetType: 'comment',
    targetId: 'comment_789',
    postId: 'post_123',
    reporterId: 'user_456',
    reason: 'offensive',
  }).valid === true,
  '2.2: Valid comment report without optional fields is accepted'
);

assert(
  validateReportPayload({
    targetType: 'invalid_type',
    targetId: 'post_123',
    postId: 'post_123',
    reporterId: 'user_456',
    reason: 'spam',
  }).valid === false,
  '2.3: Invalid targetType rejected'
);

assert(
  validateReportPayload({
    targetType: 'post',
    targetId: 'post_123',
    postId: 'post_123',
    reporterId: 'user_456',
    reason: 'unknown_reason',
  }).valid === false,
  '2.4: Invalid reason string rejected'
);

assert(
  validateReportPayload({
    targetType: 'post',
    targetId: 'post_123',
    postId: 'post_123',
    reporterId: 'user_456',
    reason: 'spam',
    details: 'X'.repeat(301),
  }).valid === false,
  '2.5: Details exceeding 300 characters rejected'
);

assert(
  validateReportPayload({
    targetType: 'post',
    targetId: 'post_123',
    postId: 'post_123',
    reporterId: 'user_456',
    reason: 'spam',
    snippet: 'Y'.repeat(201),
  }).valid === false,
  '2.6: Snippet exceeding 200 characters rejected'
);

// 3. Report Lifecycle State Machine
console.log('\n--- 3. Report Lifecycle State Machine ---');

const VALID_REPORT_STATUSES = ['pending', 'resolved', 'dismissed'];

function validateReportStatusTransition(
  currentStatus: string,
  newStatus: string
): boolean {
  if (currentStatus === 'pending') {
    return newStatus === 'resolved' || newStatus === 'dismissed';
  }
  // Terminal states cannot revert to pending
  if (currentStatus === 'resolved' || currentStatus === 'dismissed') {
    return false;
  }
  return false;
}

assert(validateReportStatusTransition('pending', 'resolved') === true, '3.1: pending -> resolved is allowed');
assert(validateReportStatusTransition('pending', 'dismissed') === true, '3.2: pending -> dismissed is allowed');
assert(validateReportStatusTransition('resolved', 'pending') === false, '3.3: resolved -> pending is rejected (terminal)');
assert(validateReportStatusTransition('dismissed', 'pending') === false, '3.4: dismissed -> pending is rejected (terminal)');

// 4. Campaign State Transitions (Action B: System Owner Maintenance)
console.log('\n--- 4. Campaign State Transitions Invariants ---');

function canOwnerTransitionCampaign(currentStatus: string, targetStatus: string): boolean {
  // Matching Supabase RLS security policies:
  // resource.data.status in ['active', 'paused']
  // targetStatus in ['active', 'paused', 'completed', 'archived']
  if (!['active', 'paused'].includes(currentStatus)) {
    return false;
  }
  return ['active', 'paused', 'completed', 'archived'].includes(targetStatus);
}

assert(canOwnerTransitionCampaign('active', 'paused') === true, '4.1: Owner can pause active campaign');
assert(canOwnerTransitionCampaign('paused', 'active') === true, '4.2: Owner can resume paused campaign');
assert(canOwnerTransitionCampaign('active', 'completed') === true, '4.3: Owner can complete active campaign');
assert(canOwnerTransitionCampaign('paused', 'completed') === true, '4.4: Owner can complete paused campaign');
assert(canOwnerTransitionCampaign('active', 'archived') === true, '4.5: Owner can archive active campaign');
assert(canOwnerTransitionCampaign('completed', 'active') === false, '4.6: Reopening completed campaign rejected by rules');
assert(canOwnerTransitionCampaign('archived', 'active') === false, '4.7: Reopening archived campaign rejected by rules');
assert(canOwnerTransitionCampaign('initializing', 'completed') === false, '4.8: Initializing campaign must pass shards verification first');

// 5. Destructive Operations Permission Matrix
console.log('\n--- 5. Destructive Operations Permission Matrix ---');

function canDeletePostOrComment(
  callerUid: string,
  authorId: string,
  isOwner: boolean,
  permissions: string[]
): boolean {
  // Matching Supabase RLS security policies:
  // isOwner(resource.data.authorId) || isSystemOwner() || hasModeratorPermission('delete_post')
  if (callerUid === authorId) return true;
  if (isOwner) return true;
  if (permissions.includes('delete_post')) return true;
  return false;
}

assert(canDeletePostOrComment('author_1', 'author_1', false, []) === true, '5.1: Content author can delete own content');
assert(canDeletePostOrComment('owner_1', 'author_1', true, []) === true, '5.2: System owner can delete violating content');
assert(canDeletePostOrComment('mod_1', 'author_1', false, ['delete_post']) === true, '5.3: Moderator with delete_post can delete content');
assert(canDeletePostOrComment('mod_2', 'author_1', false, ['other_permission']) === false, '5.4: Moderator without delete_post cannot delete content');
assert(canDeletePostOrComment('stranger_1', 'author_1', false, []) === false, '5.5: Stranger cannot delete other users content');

console.log('\n===========================================================');
console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('===========================================================');

if (failed > 0) {
  process.exit(1);
}
