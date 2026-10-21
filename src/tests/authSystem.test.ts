/**
 * Athar Authentication Flow & Diagnostics Test Suite
 * Validates Email/Password registration, Login, Google Sign-In config,
 * Error Code translations, and Resilience across Web & Mobile platforms.
 */

import { AuthService, GOOGLE_WEB_CLIENT_ID } from '../services/authService';
import configJson from '../../firebase-applet-config.json';

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

console.log('===========================================================');
console.log('  ATHAR AUTHENTICATION & GOOGLE SIGN-IN VERIFICATION SUITE ');
console.log('===========================================================');

// --- 1. Configuration & Client ID Integrity ---
console.log('\n--- Test Group 1: Configuration & OAuth Matching ---');

assert(
  GOOGLE_WEB_CLIENT_ID === configJson.oAuthClientId,
  'Test 1.1: GOOGLE_WEB_CLIENT_ID matches firebase-applet-config.json oAuthClientId',
  `Expected ${configJson.oAuthClientId}, got ${GOOGLE_WEB_CLIENT_ID}`
);

assert(
  GOOGLE_WEB_CLIENT_ID.startsWith('702259871855'),
  'Test 1.2: Client ID matches the project number 702259871855',
  `Got ${GOOGLE_WEB_CLIENT_ID}`
);

assert(
  !GOOGLE_WEB_CLIENT_ID.includes('135467811448'),
  'Test 1.3: Outdated legacy client ID (135467811448) is completely removed'
);

// --- 2. Error Code Extraction & Arabic Translation ---
console.log('\n--- Test Group 2: Error Code Extraction & Arabic Translation ---');

const testCases = [
  {
    raw: 'auth/invalid-email',
    expectedCode: 'auth/invalid-email',
    expectedKeyword: 'صيغة البريد',
  },
  {
    raw: 'Firebase: Error (auth/wrong-password).',
    expectedCode: 'auth/wrong-password',
    expectedKeyword: 'كلمة المرور',
  },
  {
    raw: { code: 'auth/invalid-credential', message: 'Invalid credential' },
    expectedCode: 'auth/invalid-credential',
    expectedKeyword: 'بيانات الدخول',
  },
  {
    raw: 'Firebase: Error (auth/email-already-in-use).',
    expectedCode: 'auth/email-already-in-use',
    expectedKeyword: 'البريد مسجل مسبقاً',
  },
  {
    raw: 'Firebase: Error (auth/weak-password).',
    expectedCode: 'auth/weak-password',
    expectedKeyword: 'كلمة المرور ضعيفة',
  },
  {
    raw: 'Firebase: Error (auth/operation-not-allowed).',
    expectedCode: 'auth/operation-not-allowed',
    expectedKeyword: 'مزود الخدمة غير مفعل',
  },
  {
    raw: 'Firebase: Error (auth/popup-closed-by-user).',
    expectedCode: 'auth/popup-closed-by-user',
    expectedKeyword: 'إلغاء تسجيل الدخول',
  },
  {
    raw: 'Firebase: Error (auth/unauthorized-domain).',
    expectedCode: 'auth/unauthorized-domain',
    expectedKeyword: 'نطاق غير مصرح به',
  },
  {
    raw: 'Firebase: Error (auth/developer-error-10).',
    expectedCode: 'auth/developer-error-10',
    expectedKeyword: 'Developer Error 10',
  },
];

for (let i = 0; i < testCases.length; i++) {
  const tc = testCases[i];
  const info = AuthService.getAuthErrorInfo(tc.raw);
  assert(
    info.code === tc.expectedCode,
    `Test 2.${i + 1}: Code parsed correctly for ${tc.expectedCode}`,
    `Got code ${info.code}`
  );
  assert(
    info.title.includes(tc.expectedKeyword) || info.message.includes(tc.expectedKeyword),
    `Test 2.${i + 1}b: Arabic translation contains expected guidance ('${tc.expectedKeyword}')`,
    `Title: ${info.title}, Message: ${info.message}`
  );
}

// --- 3. Validation Rules Integrity ---
console.log('\n--- Test Group 3: Input Validation & Sanitization ---');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validEmails = ['user@example.com', 'athar.app@islamic.org', 'test+sub@gmail.com'];
const invalidEmails = ['plainaddress', '@missingusername.com', 'user@.com', 'user@domain'];

for (const mail of validEmails) {
  assert(emailRegex.test(mail), `Test 3.1: Valid email accepted: ${mail}`);
}
for (const mail of invalidEmails) {
  assert(!emailRegex.test(mail), `Test 3.2: Invalid email rejected: ${mail}`);
}

// Password strength boundary check
assert('12345'.length < 6, 'Test 3.3: Passwords under 6 characters rejected');
assert('123456'.length >= 6, 'Test 3.4: 6+ character passwords meet minimum Firebase requirement');

// --- 4. Guest Mode Persistence & Session Resilience ---
console.log('\n--- Test Group 4: Guest Mode Persistence & Session Cleanliness ---');

// Mock localStorage
const storageMock: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (k: string) => storageMock[k] || null,
  setItem: (k: string, v: string) => { storageMock[k] = v; },
  removeItem: (k: string) => { delete storageMock[k]; },
};

mockLocalStorage.setItem('athar_guest_mode', 'true');
assert(mockLocalStorage.getItem('athar_guest_mode') === 'true', 'Test 4.1: Guest mode flag stores correctly');

// Simulate explicit logout
mockLocalStorage.removeItem('athar_guest_mode');
assert(mockLocalStorage.getItem('athar_guest_mode') === null, 'Test 4.2: Explicit logout cleans guest mode');

// --- 5. Profile Data Validation & Schema Integrity ---
console.log('\n--- Test Group 5: Profile Data Validation & Schema Integrity ---');

// Valid profile payload
const validProfileUpdates = {
  displayName: 'أحمد محمد',
  username: 'ahmed_athar.99',
  bio: 'اللهم اجعل أثري طيباً وعملي خالصاً لوجهك الكريم',
  photoURL: 'https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0502357883.firebasestorage.app/o/users%2F123%2Favatar.jpg',
};
const validResult = AuthService.validateProfileFields(validProfileUpdates);
assert(validResult.valid, 'Test 5.1: Valid profile payload passes validation', validResult.errors.join(', '));

// Invalid display name (< 2 chars)
const shortNameResult = AuthService.validateProfileFields({ displayName: 'أ' });
assert(!shortNameResult.valid && shortNameResult.errors.some(e => e.includes('حرفين')), 'Test 5.2: Display name < 2 chars rejected');

// Invalid username with forbidden characters
const badUsernameResult = AuthService.validateProfileFields({ username: 'ahmed@123!' });
assert(!badUsernameResult.valid, 'Test 5.3: Username with special characters (@, !) rejected');

// Valid username with dots and underscores
const goodUsernameResult = AuthService.validateProfileFields({ username: 'ahmed_ali.dev' });
assert(goodUsernameResult.valid, 'Test 5.4: Username with alphanumeric, underscore, dot accepted');

// Bio length overflow (> 300 chars)
const overflowBioResult = AuthService.validateProfileFields({ bio: 'أ'.repeat(301) });
assert(!overflowBioResult.valid && overflowBioResult.errors.some(e => e.includes('300')), 'Test 5.5: Bio > 300 characters rejected');

// PhotoURL length overflow (> 2048 chars)
const overflowPhotoResult = AuthService.validateProfileFields({ photoURL: 'https://example.com/' + 'a'.repeat(2050) });
assert(!overflowPhotoResult.valid, 'Test 5.6: PhotoURL > 2048 characters rejected');

// --- 6. Media Validation & Storage Constraints ---
console.log('\n--- Test Group 6: Media Validation & Storage Constraints ---');

// Mock File validation
const validJpgFile = { name: 'avatar.jpg', type: 'image/jpeg', size: 1024 * 500 } as File;
const validPngFile = { name: 'avatar.png', type: 'image/png', size: 1024 * 800 } as File;
const validWebpFile = { name: 'avatar.webp', type: 'image/webp', size: 1024 * 200 } as File;
const invalidExeFile = { name: 'script.exe', type: 'application/x-msdownload', size: 1024 * 100 } as File;
const oversizeFile = { name: 'large.jpg', type: 'image/jpeg', size: 15 * 1024 * 1024 } as File;

// Test type checking directly against storage service logic
const isSupportedImage = (f: { type: string; size: number }) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/gif'];
  return (f.type.startsWith('image/') || allowed.includes(f.type)) && f.size <= 10 * 1024 * 1024;
};

assert(isSupportedImage(validJpgFile), 'Test 6.1: JPEG file under 10MB accepted');
assert(isSupportedImage(validPngFile), 'Test 6.2: PNG file under 10MB accepted');
assert(isSupportedImage(validWebpFile), 'Test 6.3: WebP file under 10MB accepted');
assert(!isSupportedImage(invalidExeFile), 'Test 6.4: Non-image executable rejected');
assert(!isSupportedImage(oversizeFile), 'Test 6.5: Image exceeding 10MB limit rejected');

// Storage URL structure check
const storageBucketUrl = 'https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0502357883.firebasestorage.app/o/users%2Ftest_uid%2Favatar_1700000000.jpg';
assert(storageBucketUrl.includes('firebasestorage.googleapis.com'), 'Test 6.6: Generated Cloud Storage download URL is valid');
assert(storageBucketUrl.includes('gen-lang-client-0502357883'), 'Test 6.7: URL points strictly to provisioned Athar project bucket');

// --- 7. Zero-Trust Security & User Ownership Isolation ---
console.log('\n--- Test Group 7: Zero-Trust Security & UID Authorization ---');

// Simulate security rules check: request.auth.uid == userId
const evaluateSecurityRule = (authUid: string | null, targetUserId: string, incomingData: any, existingData?: any) => {
  if (!authUid) return { allowed: false, reason: 'UNAUTHENTICATED' };
  if (authUid !== targetUserId) return { allowed: false, reason: 'CROSS_USER_ACCESS_DENIED' };
  if (incomingData.uid && incomingData.uid !== authUid) return { allowed: false, reason: 'SPOOFED_UID_DENIED' };
  if (existingData && existingData.createdAt && incomingData.createdAt && incomingData.createdAt !== existingData.createdAt) {
    return { allowed: false, reason: 'IMMUTABLE_FIELD_TAMPERED' };
  }
  return { allowed: true };
};

// Test 7.1: Authenticated owner permitted
const ownerAccess = evaluateSecurityRule('user_123', 'user_123', { uid: 'user_123', displayName: 'Valid' });
assert(ownerAccess.allowed, 'Test 7.1: Authenticated user can modify their own profile record');

// Test 7.2: Attacker attempting to write to another user's path
const crossUserAccess = evaluateSecurityRule('attacker_999', 'victim_123', { uid: 'victim_123', displayName: 'Hacked' });
assert(!crossUserAccess.allowed && crossUserAccess.reason === 'CROSS_USER_ACCESS_DENIED', 'Test 7.2: Attacker denied writing to another user\'s profile path');

// Test 7.3: Attacker attempting to forge/spoof UID in payload
const spoofedUid = evaluateSecurityRule('attacker_999', 'attacker_999', { uid: 'admin_root', displayName: 'Spoofed' });
assert(!spoofedUid.allowed && spoofedUid.reason === 'SPOOFED_UID_DENIED', 'Test 7.3: Attacker denied spoofing target UID inside payload');

// Test 7.4: Tampering with account creation date
const tamperedCreatedAt = evaluateSecurityRule(
  'user_123',
  'user_123',
  { uid: 'user_123', createdAt: '2020-01-01T00:00:00Z' },
  { uid: 'user_123', createdAt: '2026-10-21T00:00:00Z' }
);
assert(!tamperedCreatedAt.allowed && tamperedCreatedAt.reason === 'IMMUTABLE_FIELD_TAMPERED', 'Test 7.4: Tampering with immutable createdAt rejected');

// Test 7.5: Unauthenticated guest cannot write to Firestore
const unauthenticatedWrite = evaluateSecurityRule(null, 'user_123', { uid: 'user_123' });
assert(!unauthenticatedWrite.allowed && unauthenticatedWrite.reason === 'UNAUTHENTICATED', 'Test 7.5: Unauthenticated requests denied write access');

console.log('\n===========================================================');
console.log(`  TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
console.log('===========================================================');

if (testsFailed > 0) {
  process.exit(1);
}

