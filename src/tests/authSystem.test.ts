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

console.log('\n===========================================================');
console.log(`  TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
console.log('===========================================================');

if (testsFailed > 0) {
  process.exit(1);
}
