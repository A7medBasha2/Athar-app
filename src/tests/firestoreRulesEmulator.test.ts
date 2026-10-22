/**
 * Firestore Security Rules Emulator Test Suite
 * 
 * Target: Real Firebase Firestore Emulator Verification (Phase 2)
 * Environment Requirements:
 * - Firebase CLI (firebase-tools)
 * - Java Runtime Environment (JRE/JDK 11+)
 * - @firebase/rules-unit-testing
 * 
 * If Java or the Firestore Emulator is unavailable in the environment,
 * this suite explicitly records and reports tests as NOT RUN (Emulator Unavailable)
 * and distinguishes real emulator results from in-memory service tests.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export interface TestResultEntry {
  category: string;
  testId: string;
  description: string;
  status: 'PASS' | 'FAIL' | 'NOT RUN';
  testType: 'EMULATOR' | 'IN_MEMORY_AUDIT';
  detail: string;
}

export interface EnvironmentPrerequisites {
  firebaseCliAvailable: boolean;
  firebaseCliVersion: string | null;
  javaAvailable: boolean;
  javaVersion: string | null;
  rulesTestingPackageAvailable: boolean;
  rulesTestingPackageVersion: string | null;
  emulatorExecutable: boolean;
  emulatorFailureReason: string | null;
}

export function checkEnvironmentPrerequisites(): EnvironmentPrerequisites {
  let firebaseCliAvailable = false;
  let firebaseCliVersion: string | null = null;
  let javaAvailable = false;
  let javaVersion: string | null = null;
  let rulesTestingPackageAvailable = false;
  let rulesTestingPackageVersion: string | null = null;
  let emulatorExecutable = false;
  let emulatorFailureReason: string | null = null;

  // 1. Firebase CLI Check
  try {
    const fbOut = execSync('firebase --version', { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
    if (fbOut) {
      firebaseCliAvailable = true;
      firebaseCliVersion = fbOut;
    }
  } catch {
    firebaseCliAvailable = false;
  }

  // 2. Java Runtime Check
  try {
    const javaOut = execSync('java -version 2>&1', { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
    if (javaOut && !javaOut.includes('not found')) {
      javaAvailable = true;
      javaVersion = javaOut.split('\n')[0];
    }
  } catch {
    javaAvailable = false;
  }

  // 3. @firebase/rules-unit-testing Package Check
  try {
    const pkgJson = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8'));
    const version = pkgJson.dependencies?.['@firebase/rules-unit-testing'] || pkgJson.devDependencies?.['@firebase/rules-unit-testing'];
    if (version) {
      rulesTestingPackageAvailable = true;
      rulesTestingPackageVersion = version;
    }
  } catch {}

  // 4. Overall Emulator Executable Check
  if (!javaAvailable) {
    emulatorExecutable = false;
    emulatorFailureReason = 'Missing Java Runtime Environment (JRE/JDK 11+). Firebase Firestore Emulator requires Java to spawn cloud-firestore-emulator.jar.';
  } else if (!firebaseCliAvailable) {
    emulatorExecutable = false;
    emulatorFailureReason = 'Firebase CLI is not installed or not in system PATH.';
  } else if (!rulesTestingPackageAvailable) {
    emulatorExecutable = false;
    emulatorFailureReason = '@firebase/rules-unit-testing package is not installed.';
  } else {
    emulatorExecutable = true;
  }

  return {
    firebaseCliAvailable,
    firebaseCliVersion,
    javaAvailable,
    javaVersion,
    rulesTestingPackageAvailable,
    rulesTestingPackageVersion,
    emulatorExecutable,
    emulatorFailureReason,
  };
}

export const TEST_CATALOG: {
  category: string;
  tests: { id: string; description: string; expectedVerdict: 'DENIED' | 'ALLOWED' }[];
}[] = [
  {
    category: '1. Unauthenticated Reads & Writes',
    tests: [
      { id: 'AUTH-01', description: 'Unauthenticated write to /users/{userId} is denied', expectedVerdict: 'DENIED' },
      { id: 'AUTH-02', description: 'Unauthenticated read of private /users/{userId} is denied', expectedVerdict: 'DENIED' },
      { id: 'AUTH-03', description: 'Unauthenticated write to /community_campaigns/{campaignId} is denied', expectedVerdict: 'DENIED' },
      { id: 'AUTH-04', description: 'Unauthenticated write to /community_campaigns/{campaignId}/contributions/{contribId} is denied', expectedVerdict: 'DENIED' },
      { id: 'AUTH-05', description: 'Unauthenticated read of /system_config/roles is denied', expectedVerdict: 'DENIED' },
    ],
  },
  {
    category: '2. Unauthorized Campaign Creation & Modification',
    tests: [
      { id: 'CAMP-01', description: 'Creating campaign with creatorId != request.auth.uid is denied', expectedVerdict: 'DENIED' },
      { id: 'CAMP-02', description: 'Non-creator attempting to update campaign title/status is denied', expectedVerdict: 'DENIED' },
      { id: 'CAMP-03', description: 'Attempting to reopen a completed/archived campaign (status: completed -> active) is denied', expectedVerdict: 'DENIED' },
      { id: 'CAMP-04', description: 'Attempting to mutate immutable targetDhikrPreset is denied', expectedVerdict: 'DENIED' },
      { id: 'CAMP-05', description: 'Attempting to mutate immutable totalTarget is denied', expectedVerdict: 'DENIED' },
      { id: 'CAMP-06', description: 'Attempting to mutate immutable createdAt is denied', expectedVerdict: 'DENIED' },
    ],
  },
  {
    category: '3. Unauthorized Official Campaign Creation or Promotion',
    tests: [
      { id: 'OFFICIAL-01', description: 'Regular non-owner attempting to create isOfficial: true campaign is denied', expectedVerdict: 'DENIED' },
      { id: 'OFFICIAL-02', description: 'Regular creator attempting to promote personal campaign (isOfficial: false -> true) is denied', expectedVerdict: 'DENIED' },
      { id: 'OFFICIAL-03', description: 'System owner creating isOfficial: true campaign is allowed', expectedVerdict: 'ALLOWED' },
    ],
  },
  {
    category: '4. Incomplete Shard Initialization & Direct Malicious Writes',
    tests: [
      { id: 'SHARD-01', description: 'Creating campaign with missing shards (less than 10 shards) is denied', expectedVerdict: 'DENIED' },
      { id: 'SHARD-02', description: 'Creating shard with non-zero initial count (count: 500) is denied', expectedVerdict: 'DENIED' },
      { id: 'SHARD-03', description: 'Creating shard when parent campaign already exists is denied (anti-orphan shard injection)', expectedVerdict: 'DENIED' },
      { id: 'SHARD-04', description: 'Direct shard update without matching atomic contribution write is denied', expectedVerdict: 'DENIED' },
    ],
  },
  {
    category: '5. Forged Contributions, Mismatched IDs, Replay & Duplicate Submissions',
    tests: [
      { id: 'CONTRIB-01', description: 'Contribution with userId != request.auth.uid is denied', expectedVerdict: 'DENIED' },
      { id: 'CONTRIB-02', description: 'Contribution document ID not matching userId:sessionId is denied', expectedVerdict: 'DENIED' },
      { id: 'CONTRIB-03', description: 'Replaying stale contribution with createdAt != request.time is denied', expectedVerdict: 'DENIED' },
      { id: 'CONTRIB-04', description: 'Contribution with sequence gap or sequence mismatch with user_progress is denied', expectedVerdict: 'DENIED' },
      { id: 'CONTRIB-05', description: 'Duplicate contribution submission with existing ID is denied', expectedVerdict: 'DENIED' },
    ],
  },
  {
    category: '6. Multiple-Shard Increments for a Single Contribution',
    tests: [
      { id: 'MULTI-SHARD-01', description: 'Single contribution attempting to increment multiple shards simultaneously is denied', expectedVerdict: 'DENIED' },
      { id: 'MULTI-SHARD-02', description: 'Shard update targeting a shard ID different from contribution.targetShardId is denied', expectedVerdict: 'DENIED' },
    ],
  },
  {
    category: '7. Contribution Amount Limits & 24-Hour User Cap',
    tests: [
      { id: 'LIMIT-01', description: 'Contribution amount == 0 is denied', expectedVerdict: 'DENIED' },
      { id: 'LIMIT-02', description: 'Contribution amount < 0 (negative amount) is denied', expectedVerdict: 'DENIED' },
      { id: 'LIMIT-03', description: 'Non-integer contribution amount is denied', expectedVerdict: 'DENIED' },
      { id: 'LIMIT-04', description: 'Contribution amount > 1000 in a single batch is denied', expectedVerdict: 'DENIED' },
      { id: 'LIMIT-05', description: 'Contribution exceeding 24-hour rolling cap (5,000 dhikr) is denied', expectedVerdict: 'DENIED' },
    ],
  },
  {
    category: '8. Unauthorized Reads of Private Contribution History',
    tests: [
      { id: 'PRIVACY-01', description: 'User B attempting to read User A contribution document is denied', expectedVerdict: 'DENIED' },
      { id: 'PRIVACY-02', description: 'User B attempting to read User A user_progress document is denied', expectedVerdict: 'DENIED' },
      { id: 'PRIVACY-03', description: 'Scraping or listing entire contributions subcollection across users is denied', expectedVerdict: 'DENIED' },
    ],
  },
  {
    category: '9. Attempts to Bypass Original Athar User, XP Ledger & Achievement Rules',
    tests: [
      { id: 'ATHAR-01', description: 'Modifying immutable uid or createdAt in /users/{userId} is denied', expectedVerdict: 'DENIED' },
      { id: 'ATHAR-02', description: 'Injecting unauthorized ghost/shadow fields into /users/{userId} is denied', expectedVerdict: 'DENIED' },
      { id: 'ATHAR-03', description: 'Updating or deleting records in /users/{userId}/xp_ledger/{eventId} is denied (append-only ledger)', expectedVerdict: 'DENIED' },
      { id: 'ATHAR-04', description: 'Single XP ledger entry exceeding 50 XP is denied', expectedVerdict: 'DENIED' },
      { id: 'ATHAR-05', description: 'User B attempting to read or write User A achievements is denied', expectedVerdict: 'DENIED' },
      { id: 'ATHAR-06', description: 'Blanket listing or scraping of /users collection is denied (allow list: if false)', expectedVerdict: 'DENIED' },
    ],
  },
];

export function runRulesVerificationAudit(): {
  prerequisites: EnvironmentPrerequisites;
  results: TestResultEntry[];
  summary: { total: number; pass: number; fail: number; notRun: number };
} {
  const prerequisites = checkEnvironmentPrerequisites();
  const results: TestResultEntry[] = [];

  for (const group of TEST_CATALOG) {
    for (const test of group.tests) {
      if (!prerequisites.emulatorExecutable) {
        // Honest reporting: Emulator could not be executed due to missing prerequisites
        results.push({
          category: group.category,
          testId: test.id,
          description: test.description,
          status: 'NOT RUN',
          testType: 'EMULATOR',
          detail: `Cannot run in real Firebase Emulator: ${prerequisites.emulatorFailureReason}`,
        });
      } else {
        // Placeholder for when real emulator is active
        results.push({
          category: group.category,
          testId: test.id,
          description: test.description,
          status: 'NOT RUN',
          testType: 'EMULATOR',
          detail: 'Emulator execution pending harness start',
        });
      }
    }
  }

  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  const notRun = results.filter((r) => r.status === 'NOT RUN').length;

  return {
    prerequisites,
    results,
    summary: { total: results.length, pass, fail, notRun },
  };
}

// Self-run script entry point
if (process.argv[1]?.endsWith('firestoreRulesEmulator.test.ts') || process.argv[1]?.endsWith('firestoreRulesEmulator.test.js')) {
  console.log('========================================================================');
  console.log('  ATHAR / GAMAA FIRESTORE SECURITY RULES REAL EMULATOR AUDIT HARNESS    ');
  console.log('========================================================================\n');

  const prerequisites = checkEnvironmentPrerequisites();
  console.log('--- Environment Prerequisites Status ---');
  console.log(`Firebase CLI:        ${prerequisites.firebaseCliAvailable ? `Available (${prerequisites.firebaseCliVersion})` : 'MISSING'}`);
  console.log(`Java Runtime (JRE):  ${prerequisites.javaAvailable ? `Available (${prerequisites.javaVersion})` : 'MISSING'}`);
  console.log(`@firebase/rules-unit-testing: ${prerequisites.rulesTestingPackageAvailable ? `Available (${prerequisites.rulesTestingPackageVersion})` : 'MISSING'}`);
  console.log(`Emulator Executable: ${prerequisites.emulatorExecutable ? 'YES' : 'NO'}`);
  if (!prerequisites.emulatorExecutable) {
    console.log(`Root Blocker:        ${prerequisites.emulatorFailureReason}\n`);
    const report = runRulesVerificationAudit();
    console.log('--- Test Execution Matrix ---');
    for (const res of report.results) {
      console.log(`[${res.status}] [${res.testType}] ${res.testId}: ${res.description}`);
      console.log(`       Reason: ${res.detail}`);
    }
    console.log('\n========================================================================');
    console.log(`TOTAL: ${report.summary.total} | PASS: ${report.summary.pass} | FAIL: ${report.summary.fail} | NOT RUN: ${report.summary.notRun}`);
    console.log('========================================================================');
  } else {
    console.log('\n--- Spawning Real Firestore Emulator & Executing Test Harness ---');
    try {
      execSync('firebase emulators:exec --only firestore --project demo-athar-test "npx tsx src/tests/realRulesEmulator.test.ts"', {
        stdio: 'inherit',
      });
    } catch (e: any) {
      console.error('Real emulator execution encountered an error:', e.message || e);
      process.exit(1);
    }
  }
}
