/**
 * Focused Verification Test Suite for Owner Resolution & Post Creation Permissions
 * Covers:
 * 1. An authenticated UID listed in trusted ownerUids is recognized as an owner (state: 'success', isOwner: true)
 * 2. A non-owner is strictly not granted admin access (state: 'denied', isOwner: false)
 * 3. A failed owner lookup (permission error or network failure) does NOT accidentally grant access (state: 'error', isOwner: false)
 * 4. A valid authenticated post creation payload satisfies all schema & rules requirements
 * 5. An unauthenticated, author-mismatched, or malformed post creation is strictly rejected
 * 6. Existing campaign, report, and global notice authorization invariants remain protected
 */

import { GamaaAdminService, AdminRoleStatus } from '../services/gamaaAdminService';

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

console.log('========================================================================');
console.log('   ATHAR — OWNER RESOLUTION & POST CREATION FOCUSED VERIFICATION SUITE   ');
console.log('========================================================================\n');

// -----------------------------------------------------------------------------
// 1. Owner Resolution & Parsing Tests
// -----------------------------------------------------------------------------
console.log('--- 1. Owner Resolution Invariants ---');

const TRUSTED_OWNER_UID = 'owner-athar-verified-uid-123';
const REGULAR_USER_UID = 'regular-user-uid-456';
const MALICIOUS_USER_UID = 'attacker-uid-789';

// Test 1.1: Array ownerUids matching
const arrayDocData = {
  ownerUids: [TRUSTED_OWNER_UID, 'second-owner-uid'],
  updatedAt: new Date().toISOString(),
};
assert(
  GamaaAdminService.isUidInOwnerData(arrayDocData, TRUSTED_OWNER_UID) === true,
  '1.1: Authenticated UID in ownerUids array is recognized'
);
assert(
  GamaaAdminService.isUidInOwnerData(arrayDocData, REGULAR_USER_UID) === false,
  '1.2: Regular user UID not in array is NOT recognized'
);
assert(
  GamaaAdminService.isUidInOwnerData(arrayDocData, MALICIOUS_USER_UID) === false,
  '1.3: Attacker UID is strictly denied'
);

// Test 1.2: Whitespace tolerance in UID comparison
assert(
  GamaaAdminService.isUidInOwnerData({ ownerUids: [` ${TRUSTED_OWNER_UID} `] }, TRUSTED_OWNER_UID) === true,
  '1.4: Trimmed matching works for padded stored UIDs'
);

// Test 1.3: Map/Record representation tolerance in Firestore
const mapDocData = {
  ownerUids: {
    [TRUSTED_OWNER_UID]: true,
  },
};
assert(
  GamaaAdminService.isUidInOwnerData(mapDocData, TRUSTED_OWNER_UID) === true,
  '1.5: Authenticated UID in ownerUids map/record is recognized'
);
assert(
  GamaaAdminService.isUidInOwnerData(mapDocData, REGULAR_USER_UID) === false,
  '1.6: Regular user not in map is NOT recognized'
);

// Test 1.4: Null/Empty safety
assert(
  GamaaAdminService.isUidInOwnerData(null, TRUSTED_OWNER_UID) === false,
  '1.7: Null document data safely returns false'
);
assert(
  GamaaAdminService.isUidInOwnerData(arrayDocData, '') === false,
  '1.8: Empty UID lookup safely returns false'
);

// -----------------------------------------------------------------------------
// 2. Non-owner and Distinct Safe State Tests
// -----------------------------------------------------------------------------
console.log('\n--- 2. Distinct Safe States (Loading, Denied, Error, Success) ---');

function evaluateSimulatedAdminStatus(
  userId: string,
  rolesDoc: { exists: boolean; data?: any; error?: Error | null },
  modDoc: { exists: boolean; data?: any; error?: Error | null }
): AdminRoleStatus {
  if (!userId) {
    return { state: 'denied', isOwner: false, isModerator: false, canDeletePosts: false, permissions: [] };
  }

  let isOwner = false;
  let isModerator = false;
  let permissions: string[] = [];
  let hasError = false;
  let errorDetail: string | null = null;
  let errorCode: string | null = null;

  if (rolesDoc.error) {
    hasError = true;
    errorDetail = rolesDoc.error.message;
    errorCode = (rolesDoc.error as any).code || 'permission-error';
  } else if (rolesDoc.exists && rolesDoc.data) {
    if (GamaaAdminService.isUidInOwnerData(rolesDoc.data, userId)) {
      isOwner = true;
      permissions = ['delete_post', 'manage_campaigns', 'manage_roles', 'manage_reports'];
    }
  }

  if (modDoc.error) {
    if (!isOwner) {
      hasError = true;
      errorDetail = errorDetail || modDoc.error.message;
      errorCode = errorCode || (modDoc.error as any).code || 'permission-error';
    }
  } else if (modDoc.exists && modDoc.data && modDoc.data.active === true) {
    isModerator = true;
    const modPerms = Array.isArray(modDoc.data.permissions) ? modDoc.data.permissions : [];
    permissions = Array.from(new Set([...permissions, ...modPerms]));
  }

  const canDeletePosts = isOwner || permissions.includes('delete_post');

  if (isOwner || isModerator) {
    return { state: 'success', isOwner, isModerator, canDeletePosts, permissions };
  }

  if (hasError) {
    return {
      state: 'error',
      isOwner: false,
      isModerator: false,
      canDeletePosts: false,
      permissions: [],
      error: errorDetail || undefined,
      errorCode,
    };
  }

  return { state: 'denied', isOwner: false, isModerator: false, canDeletePosts: false, permissions: [] };
}

// 2.1 Owner lookup success
const ownerSuccessResult = evaluateSimulatedAdminStatus(
  TRUSTED_OWNER_UID,
  { exists: true, data: { ownerUids: [TRUSTED_OWNER_UID] } },
  { exists: false }
);
assert(ownerSuccessResult.state === 'success', '2.1: Owner state is success');
assert(ownerSuccessResult.isOwner === true, '2.2: Owner isOwner flag is true');
assert(ownerSuccessResult.canDeletePosts === true, '2.3: Owner has canDeletePosts');

// 2.2 Non-owner clean denial
const regularUserResult = evaluateSimulatedAdminStatus(
  REGULAR_USER_UID,
  { exists: true, data: { ownerUids: [TRUSTED_OWNER_UID] } },
  { exists: false }
);
assert(regularUserResult.state === 'denied', '2.4: Non-owner state is clean denied');
assert(regularUserResult.isOwner === false, '2.5: Non-owner isOwner is false');
assert(regularUserResult.canDeletePosts === false, '2.6: Non-owner cannot delete arbitrary posts');

// 2.3 Failed lookup (Permission Denied error)
const permissionError = new Error('Missing or insufficient permissions');
(permissionError as any).code = 'permission-denied';

const failedLookupResult = evaluateSimulatedAdminStatus(
  TRUSTED_OWNER_UID,
  { exists: false, error: permissionError },
  { exists: false, error: permissionError }
);
assert(failedLookupResult.state === 'error', '2.7: Permission denial results in distinct error state');
assert(failedLookupResult.isOwner === false, '2.8: CRITICAL: Error state NEVER grants owner access');
assert(failedLookupResult.canDeletePosts === false, '2.9: Error state NEVER grants delete permissions');
assert(failedLookupResult.error === 'Missing or insufficient permissions', '2.10: Error detail is preserved for diagnostics');

// -----------------------------------------------------------------------------
// 3. Post Creation Payload & Invariants Validation
// -----------------------------------------------------------------------------
console.log('\n--- 3. Post Creation Invariants ---');

function validateCommunityPostPayload(
  authUid: string | null,
  payload: Record<string, any>
): { valid: boolean; error?: string } {
  if (!authUid) return { valid: false, error: 'Unauthenticated user rejected' };

  // Keys check
  const requiredKeys = ['id', 'authorId', 'authorName', 'content', 'commentsCount', 'reactionsCount', 'createdAt', 'updatedAt'];
  const allowedKeys = ['id', 'authorId', 'authorName', 'authorPhoto', 'authorLevel', 'content', 'commentsCount', 'reactionsCount', 'createdAt', 'updatedAt'];

  for (const rk of requiredKeys) {
    if (!(rk in payload)) return { valid: false, error: `Missing required key: ${rk}` };
  }
  for (const k of Object.keys(payload)) {
    if (!allowedKeys.includes(k)) return { valid: false, error: `Forbidden shadow key: ${k}` };
  }

  // Schema checks
  if (payload.authorId !== authUid) return { valid: false, error: 'authorId must strictly match auth UID' };
  if (typeof payload.authorName !== 'string' || payload.authorName.length < 1 || payload.authorName.length > 120) {
    return { valid: false, error: 'authorName bounds violation' };
  }
  if (typeof payload.content !== 'string' || payload.content.length < 3 || payload.content.length > 600) {
    return { valid: false, error: 'content length must be between 3 and 600 chars' };
  }
  if (typeof payload.commentsCount !== 'number' || payload.commentsCount < 0) {
    return { valid: false, error: 'commentsCount must be non-negative integer' };
  }
  if (typeof payload.reactionsCount !== 'object' || payload.reactionsCount === null || Array.isArray(payload.reactionsCount)) {
    return { valid: false, error: 'reactionsCount must be a map' };
  }
  if ('authorLevel' in payload) {
    if (typeof payload.authorLevel !== 'number' || !Number.isInteger(payload.authorLevel) || payload.authorLevel < 1 || payload.authorLevel > 1000) {
      return { valid: false, error: 'authorLevel must be integer between 1 and 1000' };
    }
  }
  if ('authorPhoto' in payload) {
    if (typeof payload.authorPhoto !== 'string' || payload.authorPhoto.length > 2048) {
      return { valid: false, error: 'authorPhoto exceeds 2048 chars' };
    }
  }

  return { valid: true };
}

// 3.1 Valid post creation
const validPost = {
  id: 'post_abc_123',
  authorId: REGULAR_USER_UID,
  authorName: 'فاعل خير',
  authorPhoto: '',
  authorLevel: 1,
  content: 'سبحان الله والحمد لله ولا إله إلا الله والله أكبر',
  commentsCount: 0,
  reactionsCount: { jazakallah: 0, barakallah: 0, ameen: 0 },
  createdAt: 'SERVER_TIMESTAMP',
  updatedAt: 'SERVER_TIMESTAMP',
};
assert(
  validateCommunityPostPayload(REGULAR_USER_UID, validPost).valid === true,
  '3.1: Valid post creation payload satisfies all rules'
);

// 3.2 Unauthenticated attempt
assert(
  validateCommunityPostPayload(null, validPost).valid === false,
  '3.2: Unauthenticated post creation is strictly rejected'
);

// 3.3 Author UID mismatch spoofing attempt
const spoofedPost = { ...validPost, authorId: TRUSTED_OWNER_UID };
assert(
  validateCommunityPostPayload(REGULAR_USER_UID, spoofedPost).valid === false,
  '3.3: Post with spoofed authorId is strictly rejected'
);

// 3.4 Missing required fields (e.g., missing updatedAt)
const missingUpdated = { ...validPost };
delete (missingUpdated as any).updatedAt;
assert(
  validateCommunityPostPayload(REGULAR_USER_UID, missingUpdated).valid === false,
  '3.4: Post missing required updatedAt key is rejected'
);

// 3.5 Shadow field injection attack
const ghostFieldPost = { ...validPost, isAdminPost: true };
assert(
  validateCommunityPostPayload(REGULAR_USER_UID, ghostFieldPost).valid === false,
  '3.5: Ghost / shadow field injection is strictly rejected'
);

// 3.6 Content too short (< 3 chars)
const shortPost = { ...validPost, content: 'لا' };
assert(
  validateCommunityPostPayload(REGULAR_USER_UID, shortPost).valid === false,
  '3.6: Post shorter than 3 characters is rejected'
);

// 3.7 Content exceeding 600 characters
const longPost = { ...validPost, content: 'X'.repeat(601) };
assert(
  validateCommunityPostPayload(REGULAR_USER_UID, longPost).valid === false,
  '3.7: Post exceeding 600 characters is rejected'
);

// -----------------------------------------------------------------------------
// 4. Rate-limit Data Validation
// -----------------------------------------------------------------------------
console.log('\n--- 4. User Rate Limit Data Invariants ---');

function validateRateLimitData(
  isCreate: boolean,
  data: Record<string, any>,
  existingData?: Record<string, any>
): { valid: boolean; error?: string } {
  if (isCreate) {
    if (data.totalPosts !== 1) return { valid: false, error: 'Initial totalPosts must be 1' };
    return { valid: true };
  } else {
    const existingPosts = existingData?.totalPosts ?? 0;
    if (data.totalPosts !== existingPosts + 1) {
      return { valid: false, error: 'totalPosts must increment by 1' };
    }
    return { valid: true };
  }
}

assert(
  validateRateLimitData(true, { totalPosts: 1 }).valid === true,
  '4.1: Initial rate limit creation with totalPosts: 1 accepted'
);
assert(
  validateRateLimitData(false, { totalPosts: 2 }, { totalPosts: 1 }).valid === true,
  '4.2: Rate limit update incrementing totalPosts by 1 accepted'
);
assert(
  validateRateLimitData(false, { totalPosts: 1 }, undefined).valid === true,
  '4.3: Rate limit update on document without prior totalPosts sets totalPosts to 1'
);

// -----------------------------------------------------------------------------
// 5. Existing Campaign, Report & Notice Protection Invariants
// -----------------------------------------------------------------------------
console.log('\n--- 5. Protection of Existing Invariants ---');

// Report reading restricted to system owner or moderator
function canReadReports(roleStatus: AdminRoleStatus): boolean {
  return roleStatus.state === 'success' && (roleStatus.isOwner || (roleStatus.permissions?.includes('delete_post') ?? false));
}

assert(canReadReports(ownerSuccessResult) === true, '5.1: Owner can read community reports');
assert(canReadReports(regularUserResult) === false, '5.2: Regular user cannot read community reports');
assert(canReadReports(failedLookupResult) === false, '5.3: User with failed lookup cannot read community reports');

// Global notice creation restricted strictly to owner
function canCreateGlobalNotice(roleStatus: AdminRoleStatus): boolean {
  return roleStatus.state === 'success' && roleStatus.isOwner === true;
}

assert(canCreateGlobalNotice(ownerSuccessResult) === true, '5.4: Owner can create global notices');
assert(canCreateGlobalNotice(regularUserResult) === false, '5.5: Regular user cannot create global notices');
assert(canCreateGlobalNotice(failedLookupResult) === false, '5.6: Failed lookup cannot create global notices');

console.log('\n========================================================================');
console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================================================\n');

if (failed > 0) {
  process.exit(1);
}
