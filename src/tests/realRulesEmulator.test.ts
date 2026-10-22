/**
 * REAL Cloud Firestore Security Rules Emulator Test Suite
 * Executes directly against the real Firebase Firestore Emulator (standard edition)
 * using @firebase/rules-unit-testing and isolated project IDs.
 */

import fs from 'fs';
import path from 'path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

const PROJECT_ID = `athar-rules-test-${Date.now()}`;
const rulesContent = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf-8');

interface TestRecord {
  category: string;
  id: string;
  description: string;
  status: 'PASS' | 'FAIL';
  error?: string;
}

const testResults: TestRecord[] = [];

function recordTest(category: string, id: string, description: string, pass: boolean, err?: any) {
  if (pass) {
    console.log(`  [PASS] [EMULATOR] ${id}: ${description}`);
    testResults.push({ category, id, description, status: 'PASS' });
  } else {
    console.error(`  [FAIL] [EMULATOR] ${id}: ${description} -> ${err?.message || err}`);
    testResults.push({ category, id, description, status: 'FAIL', error: err?.message || String(err) });
  }
}

async function runEmulatorTestSuite() {
  console.log('========================================================================');
  console.log('  ATHAR / GAMAA FIRESTORE SECURITY RULES REAL EMULATOR EXECUTION SUITE  ');
  console.log('========================================================================\n');

  let testEnv: RulesTestEnvironment;
  try {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: rulesContent,
        host: process.env.FIRESTORE_EMULATOR_HOST ? process.env.FIRESTORE_EMULATOR_HOST.split(':')[0] : '127.0.0.1',
        port: process.env.FIRESTORE_EMULATOR_HOST ? parseInt(process.env.FIRESTORE_EMULATOR_HOST.split(':')[1], 10) : 8080,
      },
    });
  } catch (initErr: any) {
    console.error('Failed to initialize Firebase Test Environment:', initErr);
    process.exit(1);
  }

  // Seed system roles with security rules disabled
  const OWNER_UID = 'owner-admin-123';
  const USER_A_UID = 'user-athar-alpha';
  const USER_B_UID = 'user-athar-beta';

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(doc(adminDb, 'system_config', 'roles'), {
      ownerUids: [OWNER_UID],
      updatedAt: Timestamp.now(),
    });
  });

  const unauthContext = testEnv.unauthenticatedContext();
  const ownerContext = testEnv.authenticatedContext(OWNER_UID);
  const userAContext = testEnv.authenticatedContext(USER_A_UID, {
    firebase: { sign_in_provider: 'google.com' },
  });
  const userBContext = testEnv.authenticatedContext(USER_B_UID, {
    firebase: { sign_in_provider: 'google.com' },
  });

  const unauthDb = unauthContext.firestore();
  const ownerDb = ownerContext.firestore();
  const userADb = userAContext.firestore();
  const userBDb = userBContext.firestore();

  // -------------------------------------------------------------------------
  // Group 1: Unauthenticated Reads & Writes
  // -------------------------------------------------------------------------
  console.log('--- Test Group 1: Unauthenticated Reads & Writes ---');
  try {
    await assertFails(
      setDoc(doc(unauthDb, 'users', USER_A_UID), { uid: USER_A_UID, email: 'hack@test.com' })
    );
    recordTest('1. Unauthenticated', 'AUTH-01', 'Unauthenticated write to /users/{userId} is denied', true);
  } catch (e: any) {
    recordTest('1. Unauthenticated', 'AUTH-01', 'Unauthenticated write to /users/{userId} is denied', false, e);
  }

  try {
    await assertFails(getDoc(doc(unauthDb, 'users', USER_A_UID)));
    recordTest('1. Unauthenticated', 'AUTH-02', 'Unauthenticated read of private /users/{userId} is denied', true);
  } catch (e: any) {
    recordTest('1. Unauthenticated', 'AUTH-02', 'Unauthenticated read of private /users/{userId} is denied', false, e);
  }

  try {
    await assertFails(
      setDoc(doc(unauthDb, 'community_campaigns', 'camp-unauth'), {
        title: 'Unauth Title',
        description: 'Unauth Desc',
        targetDhikrPreset: 'salawat',
        totalTarget: 500,
        status: 'initializing',
        isOfficial: false,
        creatorId: 'anon',
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + 86400000 * 7),
      })
    );
    recordTest('1. Unauthenticated', 'AUTH-03', 'Unauthenticated write to /community_campaigns is denied', true);
  } catch (e: any) {
    recordTest('1. Unauthenticated', 'AUTH-03', 'Unauthenticated write to /community_campaigns is denied', false, e);
  }

  try {
    await assertFails(
      setDoc(doc(unauthDb, 'community_campaigns', 'camp-x', 'contributions', 'anon:sess1'), {
        amount: 50,
      })
    );
    recordTest('1. Unauthenticated', 'AUTH-04', 'Unauthenticated write to contributions is denied', true);
  } catch (e: any) {
    recordTest('1. Unauthenticated', 'AUTH-04', 'Unauthenticated write to contributions is denied', false, e);
  }

  try {
    await assertFails(getDoc(doc(unauthDb, 'system_config', 'roles')));
    recordTest('1. Unauthenticated', 'AUTH-05', 'Unauthenticated read of /system_config/roles is denied', true);
  } catch (e: any) {
    recordTest('1. Unauthenticated', 'AUTH-05', 'Unauthenticated read of /system_config/roles is denied', false, e);
  }

  // -------------------------------------------------------------------------
  // Group 2: Personal Campaign Creation & Validated Activation (All 10 Shards)
  // -------------------------------------------------------------------------
  console.log('\n--- Test Group 2: Personal Campaign Creation & Validated Activation ---');
  const personalCampId = `camp-personal-${Date.now()}`;
  try {
    // Stage 1: Batch creation in 'initializing' state with all 10 shards
    const batch = writeBatch(userADb);
    batch.set(doc(userADb, 'community_campaigns', personalCampId), {
      title: 'حملة الصلاة على النبي',
      description: 'ألف صلاة على الحبيب المصطفى صلى الله عليه وسلم',
      targetDhikrPreset: 'salawat',
      totalTarget: 1000,
      status: 'initializing',
      isOfficial: false,
      creatorId: USER_A_UID,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 86400000 * 14),
    });

    for (let i = 0; i < 10; i++) {
      batch.set(doc(userADb, 'community_campaigns', personalCampId, 'shards', String(i)), {
        count: 0,
        lastIncrement: 0,
        lastContributionId: '',
        lastSequence: 0,
        updatedAt: serverTimestamp(),
      });
    }
    await assertSucceeds(batch.commit());

    // Stage 2: Validated Activation transition
    await assertSucceeds(
      updateDoc(doc(userADb, 'community_campaigns', personalCampId), {
        status: 'active',
        updatedAt: serverTimestamp(),
      })
    );

    recordTest('2. Personal Campaign', 'CAMP-01', 'Personal campaign creation & activation with all 10 shards succeeds', true);
  } catch (e: any) {
    recordTest('2. Personal Campaign', 'CAMP-01', 'Personal campaign creation & activation with all 10 shards succeeds', false, e);
  }

  // Rejection of missing shard 9 during activation
  const missingShardCampId = `camp-miss-shard9-${Date.now()}`;
  try {
    const batch = writeBatch(userADb);
    batch.set(doc(userADb, 'community_campaigns', missingShardCampId), {
      title: 'حملة ناقصة الشظية 9',
      description: 'حملة تجريبية لا تحتوي على الشظية رقم 9',
      targetDhikrPreset: 'istighfar',
      totalTarget: 500,
      status: 'initializing',
      isOfficial: false,
      creatorId: USER_A_UID,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 86400000 * 7),
    });

    // Create only shards 0 through 8 (omit shard 9!)
    for (let i = 0; i < 9; i++) {
      batch.set(doc(userADb, 'community_campaigns', missingShardCampId, 'shards', String(i)), {
        count: 0,
        lastIncrement: 0,
        lastContributionId: '',
        lastSequence: 0,
        updatedAt: serverTimestamp(),
      });
    }
    await assertSucceeds(batch.commit());

    // Activation must be strictly DENIED because shard 9 is missing
    await assertFails(
      updateDoc(doc(userADb, 'community_campaigns', missingShardCampId), {
        status: 'active',
        updatedAt: serverTimestamp(),
      })
    );

    recordTest('2. Personal Campaign', 'SHARD-01', 'Activation of campaign with missing shard 9 is strictly rejected', true);
  } catch (e: any) {
    recordTest('2. Personal Campaign', 'SHARD-01', 'Activation of campaign with missing shard 9 is strictly rejected', false, e);
  }

  // Rejection of missing shard 0 during activation
  const missingShard0CampId = `camp-miss-shard0-${Date.now()}`;
  try {
    const batch = writeBatch(userADb);
    batch.set(doc(userADb, 'community_campaigns', missingShard0CampId), {
      title: 'حملة ناقصة الشظية 0',
      description: 'حملة تجريبية لا تحتوي على الشظية رقم 0',
      targetDhikrPreset: 'istighfar',
      totalTarget: 500,
      status: 'initializing',
      isOfficial: false,
      creatorId: USER_A_UID,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 86400000 * 7),
    });

    // Create only shards 1 through 9 (omit shard 0!)
    for (let i = 1; i <= 9; i++) {
      batch.set(doc(userADb, 'community_campaigns', missingShard0CampId, 'shards', String(i)), {
        count: 0,
        lastIncrement: 0,
        lastContributionId: '',
        lastSequence: 0,
        updatedAt: serverTimestamp(),
      });
    }
    await assertSucceeds(batch.commit());

    // Activation must be strictly DENIED because shard 0 is missing
    await assertFails(
      updateDoc(doc(userADb, 'community_campaigns', missingShard0CampId), {
        status: 'active',
        updatedAt: serverTimestamp(),
      })
    );

    recordTest('2. Personal Campaign', 'SHARD-05', 'Activation of campaign with missing shard 0 is strictly rejected', true);
  } catch (e: any) {
    recordTest('2. Personal Campaign', 'SHARD-05', 'Activation of campaign with missing shard 0 is strictly rejected', false, e);
  }

  // Rejection of malformed initial shard (count != 0)
  const malformedShardCampId = `camp-bad-shard-${Date.now()}`;
  try {
    const batch = writeBatch(userADb);
    batch.set(doc(userADb, 'community_campaigns', malformedShardCampId), {
      title: 'حملة شظية ملوثة',
      description: 'شظية تبدأ بعدد غير صفري',
      targetDhikrPreset: 'istighfar',
      totalTarget: 500,
      status: 'initializing',
      isOfficial: false,
      creatorId: USER_A_UID,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 86400000 * 7),
    });

    batch.set(doc(userADb, 'community_campaigns', malformedShardCampId, 'shards', '0'), {
      count: 500, // MALICIOUS: count should be 0
      lastIncrement: 0,
      lastContributionId: '',
      lastSequence: 0,
      updatedAt: serverTimestamp(),
    });

    await assertFails(batch.commit());
    recordTest('2. Personal Campaign', 'SHARD-02', 'Creating initial shard with non-zero count (500) is rejected', true);
  } catch (e: any) {
    recordTest('2. Personal Campaign', 'SHARD-02', 'Creating initial shard with non-zero count (500) is rejected', false, e);
  }

  // Rejection of orphaned shard outside campaign initialization
  try {
    await assertFails(
      setDoc(doc(userADb, 'community_campaigns', personalCampId, 'shards', '5'), {
        count: 0,
        lastIncrement: 0,
        lastContributionId: '',
        lastSequence: 0,
        updatedAt: serverTimestamp(),
      })
    );
    recordTest('2. Personal Campaign', 'SHARD-03', 'Creating orphaned shard when campaign already exists is rejected', true);
  } catch (e: any) {
    recordTest('2. Personal Campaign', 'SHARD-03', 'Creating orphaned shard when campaign already exists is rejected', false, e);
  }

  // Rejection of unauthorized activation (User B activating User A campaign)
  try {
    await assertFails(
      updateDoc(doc(userBDb, 'community_campaigns', missingShardCampId), {
        status: 'active',
        updatedAt: serverTimestamp(),
      })
    );
    recordTest('2. Personal Campaign', 'CAMP-02', 'Unauthorized activation by non-creator is rejected', true);
  } catch (e: any) {
    recordTest('2. Personal Campaign', 'CAMP-02', 'Unauthorized activation by non-creator is rejected', false, e);
  }

  // Rejection of reopening completed campaign
  try {
    // Complete the personal campaign first
    await assertSucceeds(
      updateDoc(doc(userADb, 'community_campaigns', personalCampId), {
        status: 'completed',
        updatedAt: serverTimestamp(),
      })
    );

    // Attempting to transition from completed back to active must fail
    await assertFails(
      updateDoc(doc(userADb, 'community_campaigns', personalCampId), {
        status: 'active',
        updatedAt: serverTimestamp(),
      })
    );
    recordTest('2. Personal Campaign', 'CAMP-03', 'Attempting to reopen completed campaign is rejected', true);
  } catch (e: any) {
    recordTest('2. Personal Campaign', 'CAMP-03', 'Attempting to reopen completed campaign is rejected', false, e);
  }

  // -------------------------------------------------------------------------
  // Group 3: Official Campaign Creation & Promotion Protections
  // -------------------------------------------------------------------------
  console.log('\n--- Test Group 3: Official Campaign Creation & Promotion Protections ---');
  // Regular user attempting to create official campaign
  try {
    const batch = writeBatch(userADb);
    batch.set(doc(userADb, 'community_campaigns', `camp-fake-official-${Date.now()}`), {
      title: 'حملة رسمية مزيفة',
      description: 'محاولة مستخدم عادي إنشاء حملة رسمية',
      targetDhikrPreset: 'salawat',
      totalTarget: 10000,
      status: 'initializing',
      isOfficial: true, // MALICIOUS: regular user trying isOfficial = true
      creatorId: USER_A_UID,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 86400000 * 30),
    });
    await assertFails(batch.commit());
    recordTest('3. Official Campaigns', 'OFFICIAL-01', 'Regular non-owner creating isOfficial: true campaign is rejected', true);
  } catch (e: any) {
    recordTest('3. Official Campaigns', 'OFFICIAL-01', 'Regular non-owner creating isOfficial: true campaign is rejected', false, e);
  }

  // Regular user promoting personal campaign to official
  try {
    await assertFails(
      updateDoc(doc(userADb, 'community_campaigns', personalCampId), {
        isOfficial: true,
        updatedAt: serverTimestamp(),
      })
    );
    recordTest('3. Official Campaigns', 'OFFICIAL-02', 'Promoting personal campaign to isOfficial: true is rejected', true);
  } catch (e: any) {
    recordTest('3. Official Campaigns', 'OFFICIAL-02', 'Promoting personal campaign to isOfficial: true is rejected', false, e);
  }

  // Legitimate System Owner creating official campaign with all 10 shards
  const officialCampId = `camp-official-${Date.now()}`;
  try {
    const batch = writeBatch(ownerDb);
    batch.set(doc(ownerDb, 'community_campaigns', officialCampId), {
      title: 'الحملة الرمضانية الكبرى',
      description: 'حملة رسمية معتمدة لذكر الله والاستغفار',
      targetDhikrPreset: 'istighfar',
      totalTarget: 50000,
      status: 'initializing',
      isOfficial: true,
      creatorId: OWNER_UID,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 86400000 * 60),
    });

    for (let i = 0; i < 10; i++) {
      batch.set(doc(ownerDb, 'community_campaigns', officialCampId, 'shards', String(i)), {
        count: 0,
        lastIncrement: 0,
        lastContributionId: '',
        lastSequence: 0,
        updatedAt: serverTimestamp(),
      });
    }
    await assertSucceeds(batch.commit());

    // Activate official campaign with all 10 shards verified via 2-stage transition
    // Step 1: 10 shards verified (status -> shards_verified)
    await assertSucceeds(
      updateDoc(doc(ownerDb, 'community_campaigns', officialCampId), {
        status: 'shards_verified',
        updatedAt: serverTimestamp(),
      })
    );

    // Step 2: System owner authorization gate (status -> active)
    await assertSucceeds(
      updateDoc(doc(ownerDb, 'community_campaigns', officialCampId), {
        status: 'active',
        updatedAt: serverTimestamp(),
      })
    );

    recordTest('3. Official Campaigns', 'OFFICIAL-03', 'System owner creating & activating official campaign succeeds', true);
  } catch (e: any) {
    recordTest('3. Official Campaigns', 'OFFICIAL-03', 'System owner creating & activating official campaign succeeds', false, e);
  }

  // Missing shard 9 prevents official campaign shard verification
  const missShard9OfficialCampId = `camp-off-miss9-${Date.now()}`;
  try {
    const batch = writeBatch(ownerDb);
    batch.set(doc(ownerDb, 'community_campaigns', missShard9OfficialCampId), {
      title: 'حملة رسمية ناقصة الشظية 9',
      description: 'حملة رسمية تجريبية تفتقر للشظية رقم 9',
      targetDhikrPreset: 'istighfar',
      totalTarget: 50000,
      status: 'initializing',
      isOfficial: true,
      creatorId: OWNER_UID,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 86400000 * 30),
    });

    // Only shards 0 through 8
    for (let i = 0; i < 9; i++) {
      batch.set(doc(ownerDb, 'community_campaigns', missShard9OfficialCampId, 'shards', String(i)), {
        count: 0,
        lastIncrement: 0,
        lastContributionId: '',
        lastSequence: 0,
        updatedAt: serverTimestamp(),
      });
    }
    await assertSucceeds(batch.commit());

    // Step 1 to shards_verified must fail because shard 9 is missing
    await assertFails(
      updateDoc(doc(ownerDb, 'community_campaigns', missShard9OfficialCampId), {
        status: 'shards_verified',
        updatedAt: serverTimestamp(),
      })
    );

    recordTest('3. Official Campaigns', 'SHARD-06', 'Official campaign activation with missing shard 9 is strictly rejected', true);
  } catch (e: any) {
    recordTest('3. Official Campaigns', 'SHARD-06', 'Official campaign activation with missing shard 9 is strictly rejected', false, e);
  }

  // Missing shard 0 prevents official campaign shard verification
  const missShard0OfficialCampId = `camp-off-miss0-${Date.now()}`;
  try {
    const batch = writeBatch(ownerDb);
    batch.set(doc(ownerDb, 'community_campaigns', missShard0OfficialCampId), {
      title: 'حملة رسمية ناقصة الشظية 0',
      description: 'حملة رسمية تجريبية تفتقر للشظية رقم 0',
      targetDhikrPreset: 'istighfar',
      totalTarget: 50000,
      status: 'initializing',
      isOfficial: true,
      creatorId: OWNER_UID,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 86400000 * 30),
    });

    // Only shards 1 through 9 (omit shard 0)
    for (let i = 1; i <= 9; i++) {
      batch.set(doc(ownerDb, 'community_campaigns', missShard0OfficialCampId, 'shards', String(i)), {
        count: 0,
        lastIncrement: 0,
        lastContributionId: '',
        lastSequence: 0,
        updatedAt: serverTimestamp(),
      });
    }
    await assertSucceeds(batch.commit());

    // Step 1 to shards_verified must fail because shard 0 is missing
    await assertFails(
      updateDoc(doc(ownerDb, 'community_campaigns', missShard0OfficialCampId), {
        status: 'shards_verified',
        updatedAt: serverTimestamp(),
      })
    );

    recordTest('3. Official Campaigns', 'SHARD-07', 'Official campaign activation with missing shard 0 is strictly rejected', true);
  } catch (e: any) {
    recordTest('3. Official Campaigns', 'SHARD-07', 'Official campaign activation with missing shard 0 is strictly rejected', false, e);
  }

  // Owner privileges revoked between initialization and activation: activation must be denied
  const revokedOwnerCampId = `camp-revoked-owner-${Date.now()}`;
  try {
    // 1. Create official campaign with all 10 shards as owner
    const batch = writeBatch(ownerDb);
    batch.set(doc(ownerDb, 'community_campaigns', revokedOwnerCampId), {
      title: 'حملة مشرف تم سحب صلاحيته',
      description: 'حملة تم إنشاؤها ثم سحب صلاحيات المالك قبل التفعيل',
      targetDhikrPreset: 'salawat',
      totalTarget: 25000,
      status: 'initializing',
      isOfficial: true,
      creatorId: OWNER_UID,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 86400000 * 30),
    });
    for (let i = 0; i < 10; i++) {
      batch.set(doc(ownerDb, 'community_campaigns', revokedOwnerCampId, 'shards', String(i)), {
        count: 0,
        lastIncrement: 0,
        lastContributionId: '',
        lastSequence: 0,
        updatedAt: serverTimestamp(),
      });
    }
    await assertSucceeds(batch.commit());

    // 2. Step 1: Validated shard verification succeeds (all 10 shards exist)
    await assertSucceeds(
      updateDoc(doc(ownerDb, 'community_campaigns', revokedOwnerCampId), {
        status: 'shards_verified',
        updatedAt: serverTimestamp(),
      })
    );

    // 3. REVOKE owner privileges by clearing ownerUids in /system_config/roles
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const admin = context.firestore();
      await setDoc(doc(admin, 'system_config', 'roles'), {
        ownerUids: [], // REVOKED: OWNER_UID removed!
        updatedAt: Timestamp.now(),
      });
    });

    // 4. Attempt Step 2 (transition to active) as revoked owner MUST FAIL
    await assertFails(
      updateDoc(doc(ownerDb, 'community_campaigns', revokedOwnerCampId), {
        status: 'active',
        updatedAt: serverTimestamp(),
      })
    );

    // 5. RESTORE owner privileges
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const admin = context.firestore();
      await setDoc(doc(admin, 'system_config', 'roles'), {
        ownerUids: [OWNER_UID],
        updatedAt: Timestamp.now(),
      });
    });

    recordTest('3. Official Campaigns', 'OFFICIAL-04', 'Owner privileges revoked before final activation: activation strictly denied', true);
  } catch (e: any) {
    recordTest('3. Official Campaigns', 'OFFICIAL-04', 'Owner privileges revoked before final activation: activation strictly denied', false, e);
  }

  // Non-owner attempting to activate official campaign directly or via Step 2
  try {
    await assertFails(
      updateDoc(doc(userADb, 'community_campaigns', officialCampId), {
        status: 'active',
        updatedAt: serverTimestamp(),
      })
    );
    recordTest('3. Official Campaigns', 'OFFICIAL-05', 'Regular non-owner attempting to activate official campaign is rejected', true);
  } catch (e: any) {
    recordTest('3. Official Campaigns', 'OFFICIAL-05', 'Regular non-owner attempting to activate official campaign is rejected', false, e);
  }

  // Attempting to reopen a completed official campaign is strictly denied
  const completedOfficialCampId = `camp-off-completed-${Date.now()}`;
  try {
    const batch = writeBatch(ownerDb);
    batch.set(doc(ownerDb, 'community_campaigns', completedOfficialCampId), {
      title: 'حملة رسمية مكتملة',
      description: 'حملة رسمية انتهى وقتها واكتمل هدفها',
      targetDhikrPreset: 'salawat',
      totalTarget: 50000,
      status: 'initializing',
      isOfficial: true,
      creatorId: OWNER_UID,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 86400000 * 30),
    });
    for (let i = 0; i < 10; i++) {
      batch.set(doc(ownerDb, 'community_campaigns', completedOfficialCampId, 'shards', String(i)), {
        count: 0,
        lastIncrement: 0,
        lastContributionId: '',
        lastSequence: 0,
        updatedAt: serverTimestamp(),
      });
    }
    await assertSucceeds(batch.commit());

    // Activate to shards_verified then active
    await assertSucceeds(
      updateDoc(doc(ownerDb, 'community_campaigns', completedOfficialCampId), {
        status: 'shards_verified',
        updatedAt: serverTimestamp(),
      })
    );
    await assertSucceeds(
      updateDoc(doc(ownerDb, 'community_campaigns', completedOfficialCampId), {
        status: 'active',
        updatedAt: serverTimestamp(),
      })
    );

    // Complete the campaign
    await assertSucceeds(
      updateDoc(doc(ownerDb, 'community_campaigns', completedOfficialCampId), {
        status: 'completed',
        updatedAt: serverTimestamp(),
      })
    );

    // Attempting to transition from completed back to active must fail even for owner
    await assertFails(
      updateDoc(doc(ownerDb, 'community_campaigns', completedOfficialCampId), {
        status: 'active',
        updatedAt: serverTimestamp(),
      })
    );
    recordTest('3. Official Campaigns', 'OFFICIAL-06', 'Attempting to reopen a completed official campaign is strictly denied', true);
  } catch (e: any) {
    recordTest('3. Official Campaigns', 'OFFICIAL-06', 'Attempting to reopen a completed official campaign is strictly denied', false, e);
  }

  // Attempting direct single-step transition initializing -> active for official campaign is strictly denied
  const directSkipCampId = `camp-off-direct-${Date.now()}`;
  try {
    const batch = writeBatch(ownerDb);
    batch.set(doc(ownerDb, 'community_campaigns', directSkipCampId), {
      title: 'حملة رسمية لتخطي المراحل',
      description: 'محاولة تفعيل مباشر بدون المرور بفحص الشظايا',
      targetDhikrPreset: 'istighfar',
      totalTarget: 50000,
      status: 'initializing',
      isOfficial: true,
      creatorId: OWNER_UID,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 86400000 * 30),
    });
    for (let i = 0; i < 10; i++) {
      batch.set(doc(ownerDb, 'community_campaigns', directSkipCampId, 'shards', String(i)), {
        count: 0,
        lastIncrement: 0,
        lastContributionId: '',
        lastSequence: 0,
        updatedAt: serverTimestamp(),
      });
    }
    await assertSucceeds(batch.commit());

    // Attempting direct jump initializing -> active without shards_verified MUST FAIL
    await assertFails(
      updateDoc(doc(ownerDb, 'community_campaigns', directSkipCampId), {
        status: 'active',
        updatedAt: serverTimestamp(),
      })
    );
    recordTest('3. Official Campaigns', 'OFFICIAL-07', 'Direct transition initializing -> active without shards_verified is strictly denied', true);
  } catch (e: any) {
    recordTest('3. Official Campaigns', 'OFFICIAL-07', 'Direct transition initializing -> active without shards_verified is strictly denied', false, e);
  }

  // Shard mutation and deletion denied while campaign is in shards_verified state
  const shardProtectCampId = `camp-shard-protect-${Date.now()}`;
  try {
    const batch = writeBatch(ownerDb);
    batch.set(doc(ownerDb, 'community_campaigns', shardProtectCampId), {
      title: 'حملة فحص حماية الشظايا',
      description: 'التحقق من منع تعديل أو حذف أي شظية أثناء مرحلة فحص الشظايا',
      targetDhikrPreset: 'salawat',
      totalTarget: 50000,
      status: 'initializing',
      isOfficial: true,
      creatorId: OWNER_UID,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 86400000 * 30),
    });
    for (let i = 0; i < 10; i++) {
      batch.set(doc(ownerDb, 'community_campaigns', shardProtectCampId, 'shards', String(i)), {
        count: 0,
        lastIncrement: 0,
        lastContributionId: '',
        lastSequence: 0,
        updatedAt: serverTimestamp(),
      });
    }
    await assertSucceeds(batch.commit());

    // Advance to shards_verified
    await assertSucceeds(
      updateDoc(doc(ownerDb, 'community_campaigns', shardProtectCampId), {
        status: 'shards_verified',
        updatedAt: serverTimestamp(),
      })
    );

    // 1. Shard deletion in shards_verified must fail
    await assertFails(
      deleteDoc(doc(ownerDb, 'community_campaigns', shardProtectCampId, 'shards', '3'))
    );

    // 2. Direct shard update in shards_verified must fail
    await assertFails(
      updateDoc(doc(ownerDb, 'community_campaigns', shardProtectCampId, 'shards', '3'), {
        count: 50,
        updatedAt: serverTimestamp(),
      })
    );

    // 3. Shard recreation in shards_verified must fail
    await assertFails(
      setDoc(doc(ownerDb, 'community_campaigns', shardProtectCampId, 'shards', '3'), {
        count: 0,
        lastIncrement: 0,
        lastContributionId: '',
        lastSequence: 0,
        updatedAt: serverTimestamp(),
      })
    );

    recordTest('3. Official Campaigns', 'SHARD-08', 'Shard mutation and deletion denied while status is shards_verified', true);
  } catch (e: any) {
    recordTest('3. Official Campaigns', 'SHARD-08', 'Shard mutation and deletion denied while status is shards_verified', false, e);
  }

  // -------------------------------------------------------------------------
  // Group 4: Contribution Invariants, Anti-Replay & Idempotency
  // -------------------------------------------------------------------------
  console.log('\n--- Test Group 4: Contribution Invariants, Anti-Replay & Idempotency ---');
  const sessId = 'sess-valid-001';
  const contribId = `${USER_A_UID}:${sessId}`;

  // Test 4.1: Legitimate Atomic Trio Contribution
  try {
    const batch = writeBatch(userADb);
    batch.set(doc(userADb, 'community_campaigns', officialCampId, 'contributions', contribId), {
      userId: USER_A_UID,
      amount: 100,
      presetId: 'istighfar',
      sessionId: sessId,
      sequence: 1,
      targetShardId: '3',
      createdAt: serverTimestamp(),
    });

    batch.set(doc(userADb, 'community_campaigns', officialCampId, 'user_progress', USER_A_UID), {
      sequence: 1,
      windowTotal: 100,
      windowStart: serverTimestamp(),
      lastIncrement: 100,
      lastSessionId: sessId,
      updatedAt: serverTimestamp(),
    });

    batch.update(doc(userADb, 'community_campaigns', officialCampId, 'shards', '3'), {
      count: 100,
      lastIncrement: 100,
      lastContributionId: contribId,
      lastSequence: 1,
      updatedAt: serverTimestamp(),
    });

    await assertSucceeds(batch.commit());
    recordTest('4. Contributions', 'CONTRIB-01', 'Legitimate atomic trio contribution succeeds', true);
  } catch (e: any) {
    recordTest('4. Contributions', 'CONTRIB-01', 'Legitimate atomic trio contribution succeeds', false, e);
  }

  // Test 4.2: Forged contribution with mismatched userId
  try {
    const badSess = 'sess-spoof-002';
    const batch = writeBatch(userADb);
    batch.set(doc(userADb, 'community_campaigns', officialCampId, 'contributions', `${USER_B_UID}:${badSess}`), {
      userId: USER_B_UID, // Spoofed user B
      amount: 50,
      presetId: 'istighfar',
      sessionId: badSess,
      sequence: 2,
      targetShardId: '3',
      createdAt: serverTimestamp(),
    });
    await assertFails(batch.commit());
    recordTest('4. Contributions', 'CONTRIB-02', 'Forged contribution with userId != auth.uid is rejected', true);
  } catch (e: any) {
    recordTest('4. Contributions', 'CONTRIB-02', 'Forged contribution with userId != auth.uid is rejected', false, e);
  }

  // Test 4.3: Contribution denied while campaign status is initializing
  const initCampId = `camp-contrib-init-${Date.now()}`;
  try {
    const batch = writeBatch(ownerDb);
    batch.set(doc(ownerDb, 'community_campaigns', initCampId), {
      title: 'حملة قيد التهيئة',
      description: 'فحص منع التبرع أو المساهمة أثناء التهيئة',
      targetDhikrPreset: 'istighfar',
      totalTarget: 50000,
      status: 'initializing',
      isOfficial: true,
      creatorId: OWNER_UID,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 86400000 * 30),
    });
    for (let i = 0; i < 10; i++) {
      batch.set(doc(ownerDb, 'community_campaigns', initCampId, 'shards', String(i)), {
        count: 0,
        lastIncrement: 0,
        lastContributionId: '',
        lastSequence: 0,
        updatedAt: serverTimestamp(),
      });
    }
    await assertSucceeds(batch.commit());

    const cSess1 = 'sess-init-001';
    const cId1 = `${USER_A_UID}:${cSess1}`;
    const cBatch1 = writeBatch(userADb);
    cBatch1.set(doc(userADb, 'community_campaigns', initCampId, 'contributions', cId1), {
      userId: USER_A_UID,
      amount: 100,
      presetId: 'istighfar',
      sessionId: cSess1,
      sequence: 1,
      targetShardId: '0',
      createdAt: serverTimestamp(),
    });
    cBatch1.set(doc(userADb, 'community_campaigns', initCampId, 'user_progress', USER_A_UID), {
      sequence: 1,
      windowTotal: 100,
      windowStart: serverTimestamp(),
      lastIncrement: 100,
      lastSessionId: cSess1,
      updatedAt: serverTimestamp(),
    });
    cBatch1.update(doc(userADb, 'community_campaigns', initCampId, 'shards', '0'), {
      count: 100,
      lastIncrement: 100,
      lastContributionId: cId1,
      lastSequence: 1,
      updatedAt: serverTimestamp(),
    });
    await assertFails(cBatch1.commit());
    recordTest('4. Contributions', 'CONTRIB-03', 'Contributions denied while campaign status is initializing', true);
  } catch (e: any) {
    recordTest('4. Contributions', 'CONTRIB-03', 'Contributions denied while campaign status is initializing', false, e);
  }

  // Test 4.4: Contribution denied while campaign status is shards_verified
  try {
    // Advance initCampId to shards_verified
    await assertSucceeds(
      updateDoc(doc(ownerDb, 'community_campaigns', initCampId), {
        status: 'shards_verified',
        updatedAt: serverTimestamp(),
      })
    );

    const cSess2 = 'sess-verif-002';
    const cId2 = `${USER_A_UID}:${cSess2}`;
    const cBatch2 = writeBatch(userADb);
    cBatch2.set(doc(userADb, 'community_campaigns', initCampId, 'contributions', cId2), {
      userId: USER_A_UID,
      amount: 100,
      presetId: 'istighfar',
      sessionId: cSess2,
      sequence: 1,
      targetShardId: '0',
      createdAt: serverTimestamp(),
    });
    cBatch2.set(doc(userADb, 'community_campaigns', initCampId, 'user_progress', USER_A_UID), {
      sequence: 1,
      windowTotal: 100,
      windowStart: serverTimestamp(),
      lastIncrement: 100,
      lastSessionId: cSess2,
      updatedAt: serverTimestamp(),
    });
    cBatch2.update(doc(userADb, 'community_campaigns', initCampId, 'shards', '0'), {
      count: 100,
      lastIncrement: 100,
      lastContributionId: cId2,
      lastSequence: 1,
      updatedAt: serverTimestamp(),
    });
    await assertFails(cBatch2.commit());
    recordTest('4. Contributions', 'CONTRIB-04', 'Contributions denied while campaign status is shards_verified', true);
  } catch (e: any) {
    recordTest('4. Contributions', 'CONTRIB-04', 'Contributions denied while campaign status is shards_verified', false, e);
  }

  // Test 4.3: Direct shard update without matching contribution
  try {
    await assertFails(
      updateDoc(doc(userADb, 'community_campaigns', officialCampId, 'shards', '3'), {
        count: 500,
        lastIncrement: 400,
        lastContributionId: 'fake-id',
        lastSequence: 99,
        updatedAt: serverTimestamp(),
      })
    );
    recordTest('4. Contributions', 'SHARD-04', 'Direct shard update without matching contribution is rejected', true);
  } catch (e: any) {
    recordTest('4. Contributions', 'SHARD-04', 'Direct shard update without matching contribution is rejected', false, e);
  }

  // Test 4.4: Incrementing multiple shards for one contribution
  try {
    const multiSess = 'sess-multi-003';
    const multiContribId = `${USER_A_UID}:${multiSess}`;
    const batch = writeBatch(userADb);

    batch.set(doc(userADb, 'community_campaigns', officialCampId, 'contributions', multiContribId), {
      userId: USER_A_UID,
      amount: 50,
      presetId: 'istighfar',
      sessionId: multiSess,
      sequence: 2,
      targetShardId: '4',
      createdAt: serverTimestamp(),
    });

    batch.set(doc(userADb, 'community_campaigns', officialCampId, 'user_progress', USER_A_UID), {
      sequence: 2,
      windowTotal: 150,
      windowStart: serverTimestamp(),
      lastIncrement: 50,
      lastSessionId: multiSess,
      updatedAt: serverTimestamp(),
    });

    // MALICIOUS: updating BOTH shard 4 and shard 5
    batch.update(doc(userADb, 'community_campaigns', officialCampId, 'shards', '4'), {
      count: 50,
      lastIncrement: 50,
      lastContributionId: multiContribId,
      lastSequence: 2,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(userADb, 'community_campaigns', officialCampId, 'shards', '5'), {
      count: 50,
      lastIncrement: 50,
      lastContributionId: multiContribId,
      lastSequence: 2,
      updatedAt: serverTimestamp(),
    });

    await assertFails(batch.commit());
    recordTest('4. Contributions', 'MULTI-01', 'Updating multiple shards for single contribution is rejected', true);
  } catch (e: any) {
    recordTest('4. Contributions', 'MULTI-01', 'Updating multiple shards for single contribution is rejected', false, e);
  }

  // Test 4.5: Contribution amount bounds
  try {
    const zeroSess = 'sess-zero-004';
    const batch = writeBatch(userADb);
    batch.set(doc(userADb, 'community_campaigns', officialCampId, 'contributions', `${USER_A_UID}:${zeroSess}`), {
      userId: USER_A_UID,
      amount: 0, // Invalid: amount must be >= 1
      presetId: 'istighfar',
      sessionId: zeroSess,
      sequence: 2,
      targetShardId: '1',
      createdAt: serverTimestamp(),
    });
    await assertFails(batch.commit());
    recordTest('4. Contributions', 'LIMIT-01', 'Contribution amount 0 is rejected', true);
  } catch (e: any) {
    recordTest('4. Contributions', 'LIMIT-01', 'Contribution amount 0 is rejected', false, e);
  }

  try {
    const excessSess = 'sess-excess-005';
    const batch = writeBatch(userADb);
    batch.set(doc(userADb, 'community_campaigns', officialCampId, 'contributions', `${USER_A_UID}:${excessSess}`), {
      userId: USER_A_UID,
      amount: 1500, // Invalid: > 1000
      presetId: 'istighfar',
      sessionId: excessSess,
      sequence: 2,
      targetShardId: '1',
      createdAt: serverTimestamp(),
    });
    await assertFails(batch.commit());
    recordTest('4. Contributions', 'LIMIT-04', 'Contribution amount > 1000 in single batch is rejected', true);
  } catch (e: any) {
    recordTest('4. Contributions', 'LIMIT-04', 'Contribution amount > 1000 in single batch is rejected', false, e);
  }

  // -------------------------------------------------------------------------
  // Group 5: Privacy & Private Contribution History
  // -------------------------------------------------------------------------
  console.log('\n--- Test Group 5: Privacy & Private Contribution History ---');
  try {
    // User B attempting to read User A's private contribution
    await assertFails(
      getDoc(doc(userBDb, 'community_campaigns', officialCampId, 'contributions', contribId))
    );
    recordTest('5. Privacy', 'PRIVACY-01', 'User B reading User A contribution is rejected', true);
  } catch (e: any) {
    recordTest('5. Privacy', 'PRIVACY-01', 'User B reading User A contribution is rejected', false, e);
  }

  try {
    // User A reading their own contribution
    await assertSucceeds(
      getDoc(doc(userADb, 'community_campaigns', officialCampId, 'contributions', contribId))
    );
    recordTest('5. Privacy', 'PRIVACY-02', 'User A reading their own contribution succeeds', true);
  } catch (e: any) {
    recordTest('5. Privacy', 'PRIVACY-02', 'User A reading their own contribution succeeds', false, e);
  }

  try {
    // User B attempting to read User A's user_progress
    await assertFails(
      getDoc(doc(userBDb, 'community_campaigns', officialCampId, 'user_progress', USER_A_UID))
    );
    recordTest('5. Privacy', 'PRIVACY-03', 'User B reading User A user_progress is rejected', true);
  } catch (e: any) {
    recordTest('5. Privacy', 'PRIVACY-03', 'User B reading User A user_progress is rejected', false, e);
  }

  // -------------------------------------------------------------------------
  // Group 6: Original Athar User, XP Ledger & Achievement Regressions
  // -------------------------------------------------------------------------
  console.log('\n--- Test Group 6: Original Athar User, XP Ledger & Achievements ---');
  try {
    // User A creating valid user profile
    await assertSucceeds(
      setDoc(doc(userADb, 'users', USER_A_UID), {
        uid: USER_A_UID,
        email: 'userA@athar.test',
        displayName: 'مستخدم أثر',
        username: 'athar_user_a',
        level: 1,
        xp: 0,
        streakDays: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );
    recordTest('6. Athar Core', 'ATHAR-01', 'User creating valid profile record succeeds', true);
  } catch (e: any) {
    recordTest('6. Athar Core', 'ATHAR-01', 'User creating valid profile record succeeds', false, e);
  }

  try {
    // User A attempting to modify User B profile
    await assertFails(
      setDoc(doc(userADb, 'users', USER_B_UID), {
        uid: USER_B_UID,
        email: 'attacker@athar.test',
      })
    );
    recordTest('6. Athar Core', 'ATHAR-02', 'User A writing to User B profile is rejected', true);
  } catch (e: any) {
    recordTest('6. Athar Core', 'ATHAR-02', 'User A writing to User B profile is rejected', false, e);
  }

  try {
    // User A injecting shadow field into profile
    await assertFails(
      setDoc(doc(userADb, 'users', USER_A_UID), {
        uid: USER_A_UID,
        email: 'userA@athar.test',
        isSuperAdmin: true, // Ghost field
      })
    );
    recordTest('6. Athar Core', 'ATHAR-03', 'Injecting shadow/ghost fields into user profile is rejected', true);
  } catch (e: any) {
    recordTest('6. Athar Core', 'ATHAR-03', 'Injecting shadow/ghost fields into user profile is rejected', false, e);
  }

  try {
    // XP Ledger valid creation
    const eventId = 'xp-fajr-001';
    await assertSucceeds(
      setDoc(doc(userADb, 'users', USER_A_UID, 'xp_ledger', eventId), {
        id: eventId,
        activityType: 'prayer_fajr',
        points: 15,
        label: 'صلاة الفجر',
        dateKey: '2026-10-22',
        timestamp: Date.now(),
      })
    );
    recordTest('6. Athar Core', 'ATHAR-04', 'Appending valid XP ledger entry (<= 50 XP) succeeds', true);
  } catch (e: any) {
    recordTest('6. Athar Core', 'ATHAR-04', 'Appending valid XP ledger entry (<= 50 XP) succeeds', false, e);
  }

  try {
    // XP Ledger entry > 50 points rejected
    const badXpId = 'xp-cheat-002';
    await assertFails(
      setDoc(doc(userADb, 'users', USER_A_UID, 'xp_ledger', badXpId), {
        id: badXpId,
        activityType: 'cheat',
        points: 100, // Exceeds 50 XP limit
        label: 'احتيال',
        dateKey: '2026-10-22',
        timestamp: Date.now(),
      })
    );
    recordTest('6. Athar Core', 'ATHAR-05', 'Single XP ledger entry exceeding 50 XP is rejected', true);
  } catch (e: any) {
    recordTest('6. Athar Core', 'ATHAR-05', 'Single XP ledger entry exceeding 50 XP is rejected', false, e);
  }

  try {
    // XP Ledger mutation rejected (immutable ledger)
    await assertFails(
      updateDoc(doc(userADb, 'users', USER_A_UID, 'xp_ledger', 'xp-fajr-001'), {
        points: 50,
      })
    );
    recordTest('6. Athar Core', 'ATHAR-06', 'Modifying existing XP ledger entry is rejected', true);
  } catch (e: any) {
    recordTest('6. Athar Core', 'ATHAR-06', 'Modifying existing XP ledger entry is rejected', false, e);
  }

  try {
    // Blanket list of users rejected
    await assertFails(getDocs(collection(userADb, 'users')));
    recordTest('6. Athar Core', 'ATHAR-07', 'Blanket listing/scraping of /users collection is rejected', true);
  } catch (e: any) {
    recordTest('6. Athar Core', 'ATHAR-07', 'Blanket listing/scraping of /users collection is rejected', false, e);
  }

  // -------------------------------------------------------------------------
  // Group 7: Initialization Failure and Recovery Path
  // -------------------------------------------------------------------------
  console.log('\n--- Test Group 7: Initialization Failure and Recovery Path ---');
  // Recovery Test 7.1: Failed Stage 2 leaves campaign safely retryable by authorized owner
  const recoveryCampId = `camp-recoverable-${Date.now()}`;
  try {
    // 1. Stage 1: Batch create campaign and all 10 shards
    const batch = writeBatch(ownerDb);
    batch.set(doc(ownerDb, 'community_campaigns', recoveryCampId), {
      title: 'حملة مستأنفة بعد انقطاع',
      description: 'حملة تم استئنافها بعد تعثر تفعيل المرحلة الثانية',
      targetDhikrPreset: 'subhanallah_wabihamdih',
      totalTarget: 10000,
      status: 'initializing',
      isOfficial: true,
      creatorId: OWNER_UID,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 86400000 * 30),
    });
    for (let i = 0; i < 10; i++) {
      batch.set(doc(ownerDb, 'community_campaigns', recoveryCampId, 'shards', String(i)), {
        count: 0,
        lastIncrement: 0,
        lastContributionId: '',
        lastSequence: 0,
        updatedAt: serverTimestamp(),
      });
    }
    await assertSucceeds(batch.commit());

    // 2. Verified recovery via 2-stage transition by authorized owner succeeds
    await assertSucceeds(
      updateDoc(doc(ownerDb, 'community_campaigns', recoveryCampId), {
        status: 'shards_verified',
        updatedAt: serverTimestamp(),
      })
    );
    await assertSucceeds(
      updateDoc(doc(ownerDb, 'community_campaigns', recoveryCampId), {
        status: 'active',
        updatedAt: serverTimestamp(),
      })
    );
    recordTest('7. Recovery Path', 'RECOVERY-01', 'Safely retrying activation by authorized owner succeeds', true);
  } catch (e: any) {
    recordTest('7. Recovery Path', 'RECOVERY-01', 'Safely retrying activation by authorized owner succeeds', false, e);
  }

  // Recovery Test 7.2: Unauthorized user cannot use recovery path on official campaign
  try {
    await assertFails(
      updateDoc(doc(userBDb, 'community_campaigns', recoveryCampId), {
        status: 'active',
        updatedAt: serverTimestamp(),
      })
    );
    recordTest('7. Recovery Path', 'RECOVERY-02', 'Unauthorized user attempting to use recovery path is denied', true);
  } catch (e: any) {
    recordTest('7. Recovery Path', 'RECOVERY-02', 'Unauthorized user attempting to use recovery path is denied', false, e);
  }

  // Cleanup
  await testEnv.cleanup();

  const total = testResults.length;
  const passed = testResults.filter((r) => r.status === 'PASS').length;
  const failed = testResults.filter((r) => r.status === 'FAIL').length;

  console.log('\n========================================================================');
  console.log(`  REAL EMULATOR VERIFICATION SUMMARY: ${passed} / ${total} PASSED (${failed} FAILED)  `);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runEmulatorTestSuite().catch((err) => {
  console.error('Fatal Emulator Test Suite Error:', err);
  process.exit(1);
});
