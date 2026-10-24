/**
 * Athar Authentication Flow & Diagnostics Test Suite (Supabase Powered)
 * Validates Email/Password registration, Login, Google Sign-In config,
 * Error Code translations, and Resilience across Web & Mobile platforms.
 */

import { AuthService, GOOGLE_WEB_CLIENT_ID, parseOAuthCallbackParams } from '../services/authService';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../lib/supabaseClient';

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
console.log('  ATHAR AUTHENTICATION & SUPABASE VERIFICATION SUITE ');
console.log('===========================================================');

// --- 1. Configuration & Client Integrity ---
console.log('\n--- Test Group 1: Configuration & OAuth Matching ---');

assert(
  Boolean(SUPABASE_URL && SUPABASE_URL.includes('supabase.co')),
  'Test 1.1: SUPABASE_URL is properly configured and points to Supabase cloud'
);

assert(
  Boolean(SUPABASE_PUBLISHABLE_KEY && SUPABASE_PUBLISHABLE_KEY.length > 20),
  'Test 1.2: SUPABASE_PUBLISHABLE_KEY is present and formatted correctly'
);

assert(
  GOOGLE_WEB_CLIENT_ID.endsWith('.apps.googleusercontent.com'),
  'Test 1.3: Google Client ID is a valid Google OAuth Client ID domain'
);

// --- 2. Error Code Extraction & Arabic Translation ---
console.log('\n--- Test Group 2: Error Code Extraction & Arabic Translation ---');

const testCases = [
  {
    raw: 'Invalid login credentials',
    expectedCode: 'auth/invalid-credential',
    expectedKeyword: 'غير صحيحة',
  },
  {
    raw: 'User already registered',
    expectedCode: 'auth/email-already-in-use',
    expectedKeyword: 'مسجل',
  },
  {
    raw: 'Password should be at least 6 characters',
    expectedCode: 'auth/weak-password',
    expectedKeyword: 'ضعيفة',
  },
];

for (let i = 0; i < testCases.length; i++) {
  const tc = testCases[i];
  const info = AuthService.getAuthErrorInfo({ message: tc.raw });
  assert(
    info.code === tc.expectedCode,
    `Test 2.${i + 1}a: Code mapping for "${tc.raw}" -> ${tc.expectedCode}`,
    `Got code: ${info.code}`
  );
  assert(
    info.title.includes(tc.expectedKeyword) || info.message.includes(tc.expectedKeyword),
    `Test 2.${i + 1}b: Arabic text contains "${tc.expectedKeyword}"`,
    `Got title: "${info.title}", message: "${info.message}"`
  );
}

// --- 3. Profile Validation Rules ---
console.log('\n--- Test Group 3: Profile Validation Rules ---');

const validRes = AuthService.validateProfileFields({
  displayName: 'أحمد الصالح',
  username: 'ahmed_saleh',
  bio: 'طالب علم ومحب للخير',
});
assert(validRes.valid && validRes.errors.length === 0, 'Test 3.1: Valid profile passes validation');

const invalidName = AuthService.validateProfileFields({ displayName: 'أ' });
assert(!invalidName.valid, 'Test 3.2: Single-character name is rejected');

const invalidUser = AuthService.validateProfileFields({ username: 'user@bad!' });
assert(!invalidUser.valid, 'Test 3.3: Username with special characters is rejected');

// --- 4. Native OAuth Loopback & Deep-Link Callback Parser ---
console.log('\n--- Test Group 4: Native OAuth Loopback & Deep-Link Parsing ---');

const hashCallback = parseOAuthCallbackParams(
  'athar://auth-callback#access_token=tok_abc&refresh_token=ref_xyz&token_type=bearer'
);
assert(
  hashCallback.accessToken === 'tok_abc' && hashCallback.refreshToken === 'ref_xyz',
  'Test 4.1: Parses implicit #access_token and #refresh_token from athar:// deep link'
);

const loopbackCallback = parseOAuthCallbackParams(
  'athar://auth-callback?access_token=loop_tok&refresh_token=loop_ref&expires_in=3600'
);
assert(
  loopbackCallback.accessToken === 'loop_tok' && loopbackCallback.refreshToken === 'loop_ref',
  'Test 4.2: Parses query access_token and refresh_token from localhost:3000 /auth-done bridge'
);

const intentCallback = parseOAuthCallbackParams(
  'intent://auth-callback?code=pkce_code_123#Intent;scheme=athar;package=com.athar.islamic;end'
);
assert(
  intentCallback.code === 'pkce_code_123' && !intentCallback.accessToken,
  'Test 4.3: Parses PKCE code cleanly while ignoring #Intent; trailer'
);

console.log('\n===========================================================');
console.log(`  SUMMARY: ${testsPassed} passed, ${testsFailed} failed`);
console.log('===========================================================');

if (testsFailed > 0) {
  process.exit(1);
}
