import { db, auth } from '../firebase';
import {
  doc,
  getDoc,
  collection,
  writeBatch,
  runTransaction,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  Unsubscribe,
} from 'firebase/firestore';

export interface CommunityCampaign {
  id: string;
  title: string;
  description: string;
  targetDhikrPreset: string;
  totalTarget: number;
  status: 'initializing' | 'shards_verified' | 'active' | 'paused' | 'completed' | 'archived';
  isOfficial: boolean;
  creatorId: string;
  createdAt: any;
  expiresAt: any;
}

export interface ContributionResult {
  success: boolean;
  alreadyRecorded: boolean;
  sequence?: number;
  shardId?: string;
  error?: string;
}

export const VALID_DHIKR_PRESETS = [
  'subhanallah_wabihamdih',
  'tasbih_tahmid_takbir',
  'istighfar',
  'salawat',
  'la_ilaha_illallah',
  'hawqala',
] as const;

export type ValidDhikrPreset = (typeof VALID_DHIKR_PRESETS)[number];

export const DHIKR_PRESET_DETAILS: Record<
  string,
  { label: string; text: string; virtue: string; defaultIncrement: number }
> = {
  subhanallah_wabihamdih: {
    label: 'سبحان الله وبحمده',
    text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
    virtue: 'حُطَّتْ خَطَايَاهُ وَإِنْ كَانَتْ مِثْلَ زَبَدِ الْبَحْرِ',
    defaultIncrement: 33,
  },
  tasbih_tahmid_takbir: {
    label: 'التسبيح والتحميد والتكبير',
    text: 'سُبْحَانَ اللَّهِ ، وَالْحَمْدُ لِلَّهِ ، وَلا إِلَهَ إِلا اللَّهُ ، وَاللَّهُ أَكْبَرُ',
    virtue: 'أَحَبُّ الْكَلامِ إِلَى اللَّهِ أَرْبَعٌ',
    defaultIncrement: 33,
  },
  istighfar: {
    label: 'الاستغفار المبارك',
    text: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ وَأَتُوبُ إِلَيْهِ',
    virtue: 'مَنْ لَزِمَ الاسْتِغْفَارَ جَعَلَ اللَّهُ لَهُ مِنْ كُلِّ ضِيقٍ مَخْرَجًا',
    defaultIncrement: 100,
  },
  salawat: {
    label: 'الصلاة على النبي ﷺ',
    text: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
    virtue: 'مَنْ صَلَّى عَلَيَّ صَلاةً صَلَّى اللَّهُ عَلَيْهِ بِهَا عَشْرًا',
    defaultIncrement: 10,
  },
  la_ilaha_illallah: {
    label: 'التهليل (لا إله إلا الله)',
    text: 'لا إِلَهَ إِلا اللَّهُ وَحْدَهُ لا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    virtue: 'أَفْضَلُ الذِّكْرِ لا إِلَهَ إِلا اللَّهُ',
    defaultIncrement: 100,
  },
  hawqala: {
    label: 'الحوقلة (لا حول ولا قوة إلا بالله)',
    text: 'لا حَوْلَ وَلا قُوَّةَ إِلا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ',
    virtue: 'كَنْزٌ مِنْ كُنُوزِ الْجَنَّةِ',
    defaultIncrement: 33,
  },
};

export const NUM_SHARDS = 10;
export const MAX_SESSION_AMOUNT = 1000;
export const MAX_24H_CAMPAIGN_CAP = 5000;

/**
 * Deterministic hash function for uniform shard distribution
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Validates session ID format: strictly alphanumeric + hyphens, no colons allowed.
 */
export function isValidSessionId(sessionId: string): boolean {
  return (
    typeof sessionId === 'string' &&
    sessionId.length >= 8 &&
    sessionId.length <= 64 &&
    /^[a-zA-Z0-9\-]+$/.test(sessionId)
  );
}

/**
 * Builds an unambiguous contribution document ID using the colon ':' delimiter.
 * Because Firebase Auth UIDs never contain colons, and session IDs forbid colons,
 * this mapping is a provable mathematical bijection with zero collision probability.
 */
export function buildContributionId(uid: string, sessionId: string): string {
  if (!isValidSessionId(sessionId)) {
    throw new Error('INVALID_SESSION_ID_FORMAT');
  }
  if (!uid || typeof uid !== 'string' || uid.includes(':')) {
    throw new Error('INVALID_UID_FORMAT');
  }
  return `${uid}:${sessionId}`;
}

export class CommunityCampaignService {
  /**
   * Creates a new campaign and atomically initializes all 10 shards in a single writeBatch.
   * This guarantees that a campaign cannot exist with missing shards.
   */
  static async createCampaign(
    campaignData: Omit<CommunityCampaign, 'id' | 'createdAt'>,
    campaignId?: string,
    firestoreInstance: any = db
  ): Promise<{ success: boolean; campaignId: string }> {
    const campaignCol = collection(firestoreInstance, 'community_campaigns');
    const campaignRef = campaignId ? doc(campaignCol, campaignId) : doc(campaignCol);
    const targetId = campaignRef.id;

    if (!campaignData.title || campaignData.title.trim().length < 3 || campaignData.title.trim().length > 100) {
      throw new Error('INVALID_CAMPAIGN_TITLE');
    }
    if (!campaignData.description || campaignData.description.trim().length < 5 || campaignData.description.trim().length > 500) {
      throw new Error('INVALID_CAMPAIGN_DESCRIPTION');
    }
    if (!campaignData.targetDhikrPreset || !VALID_DHIKR_PRESETS.includes(campaignData.targetDhikrPreset as any)) {
      throw new Error('INVALID_DHIKR_PRESET');
    }
    const minTarget = campaignData.isOfficial ? 1000 : 100;
    const maxTarget = campaignData.isOfficial ? 10000000 : 100000;
    if (!campaignData.totalTarget || campaignData.totalTarget < minTarget || campaignData.totalTarget > maxTarget) {
      throw new Error('INVALID_CAMPAIGN_TARGET');
    }
    if (!campaignData.expiresAt) {
      throw new Error('EXPIRES_AT_REQUIRED');
    }

    const batch = writeBatch(firestoreInstance);

    // 1. Stage 1: Campaign parent document initialized in 'initializing' state
    batch.set(campaignRef, {
      ...campaignData,
      status: 'initializing',
      createdAt: serverTimestamp(),
    });

    // 2. Atomically initialize all 10 shards (0 through 9)
    for (let i = 0; i < NUM_SHARDS; i++) {
      const shardRef = doc(firestoreInstance, 'community_campaigns', targetId, 'shards', String(i));
      batch.set(shardRef, {
        count: 0,
        lastIncrement: 0,
        lastContributionId: '',
        lastSequence: 0,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();

    // 3. Stage 2: Validated Activation Transition
    try {
      await CommunityCampaignService.activateCampaign(targetId, campaignData.isOfficial, firestoreInstance);
    } catch (activationErr) {
      console.warn('Campaign created in initializing state, activation failed:', activationErr);
      throw new Error(`CAMPAIGN_ACTIVATION_FAILED: ${activationErr instanceof Error ? activationErr.message : String(activationErr)}`);
    }

    return { success: true, campaignId: targetId };
  }

  /**
   * Activates a campaign previously initialized in 'initializing' or 'shards_verified' state.
   * - Personal campaigns: 1-step validated transition directly to 'active' verifying all 10 shards.
   * - Official campaigns: 2-step validated transition:
   *     Step 1: 'initializing' -> 'shards_verified' (validates all 10 shards)
   *     Step 2: 'shards_verified' -> 'active' (enforces caller is currently an authorized system owner)
   */
  static async activateCampaign(
    campaignId: string,
    isOfficial?: boolean,
    firestoreInstance: any = db
  ): Promise<{ success: boolean }> {
    const campaignRef = doc(firestoreInstance, 'community_campaigns', campaignId);

    let official = isOfficial;
    let currentStatus = '';

    if (official === undefined) {
      const snap = await getDoc(campaignRef);
      if (!snap.exists()) {
        throw new Error('CAMPAIGN_NOT_FOUND');
      }
      const data = snap.data();
      official = data.isOfficial === true;
      currentStatus = data.status || '';
    }

    if (official) {
      // Step 1: Validate all 10 shards exist and have count == 0 (consumes 10 calls on shards)
      if (currentStatus !== 'shards_verified') {
        await updateDoc(campaignRef, {
          status: 'shards_verified',
          updatedAt: serverTimestamp(),
        });
      }
      // Step 2: Enforce currently authorized system owner gate (consumes 1 call on /system_config/roles)
      await updateDoc(campaignRef, {
        status: 'active',
        updatedAt: serverTimestamp(),
      });
    } else {
      // Personal campaign: Direct 10-shard validated activation (consumes 10 calls on shards)
      await updateDoc(campaignRef, {
        status: 'active',
        updatedAt: serverTimestamp(),
      });
    }

    return { success: true };
  }

  /**
   * Retries activation for a campaign left in 'initializing' or 'shards_verified' state
   * after a network failure or interrupted creation.
   * - Personal campaigns can only be activated by the creator.
   * - Official campaigns can only be activated if caller is currently an authorized owner.
   */
  static async retryActivation(
    campaignId: string,
    firestoreInstance: any = db
  ): Promise<{ success: boolean }> {
    return await CommunityCampaignService.activateCampaign(campaignId, undefined, firestoreInstance);
  }

  /**
   * Fetches unactivated campaigns (status 'initializing' or 'shards_verified')
   * to display recovery options to authorized users.
   */
  static async getUnactivatedCampaigns(
    userId: string,
    isOwner: boolean = false,
    firestoreInstance: any = db
  ): Promise<any[]> {
    try {
      const coll = collection(firestoreInstance, 'community_campaigns');
      if (isOwner) {
        const q = query(coll, where('status', 'in', ['initializing', 'shards_verified']));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } else {
        const q = query(
          coll,
          where('creatorId', '==', userId),
          where('status', 'in', ['initializing', 'shards_verified'])
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    } catch (err) {
      console.warn('[CommunityCampaignService] Notice getting unactivated campaigns:', err);
      return [];
    }
  }

  /**
   * Submits a tasbih contribution to a campaign using an in-transaction idempotency check.
   * Enforces:
   * 1. Mutual consistency across contribution, user_progress, and shard.
   * 2. In-transaction detection of duplicate session IDs (returning alreadyRecorded: true).
   * 3. Fixed 24-hour window cap (5,000 dhikr max per campaign).
   * 4. Atomic shard increment.
   */
  static async contributeToCampaign(
    campaignId: string,
    amount: number,
    presetId: string,
    sessionId: string,
    explicitUid?: string,
    firestoreInstance: any = db,
    authInstance: any = auth
  ): Promise<ContributionResult> {
    const currentUid = explicitUid || authInstance?.currentUser?.uid;
    if (!currentUid) {
      throw new Error('AUTH_REQUIRED');
    }
    if (typeof amount !== 'number' || amount < 1 || amount > MAX_SESSION_AMOUNT || !Number.isInteger(amount)) {
      throw new Error('INVALID_AMOUNT_BOUNDS');
    }

    const contribId = buildContributionId(currentUid, sessionId);
    const contribRef = doc(firestoreInstance, 'community_campaigns', campaignId, 'contributions', contribId);
    const progressRef = doc(firestoreInstance, 'community_campaigns', campaignId, 'user_progress', currentUid);
    const campaignRef = doc(firestoreInstance, 'community_campaigns', campaignId);

    // Determine target shard deterministically
    const shardId = String(hashString(`${currentUid}:${sessionId}`) % NUM_SHARDS);
    const shardRef = doc(firestoreInstance, 'community_campaigns', campaignId, 'shards', shardId);

    return await runTransaction(firestoreInstance, async (transaction: any) => {
      // --- STEP 1: READS FIRST (Strict Firestore transaction contract) ---
      const contribSnap = await transaction.get(contribRef);
      if (contribSnap.exists()) {
        // Idempotent early return: session was already recorded!
        return { success: true, alreadyRecorded: true, shardId };
      }

      const campaignSnap = await transaction.get(campaignRef);
      if (!campaignSnap.exists()) {
        throw new Error('CAMPAIGN_NOT_FOUND');
      }
      const campaign = campaignSnap.data();
      if (campaign.status !== 'active') {
        throw new Error('CAMPAIGN_INACTIVE');
      }
      if (campaign.targetDhikrPreset && campaign.targetDhikrPreset !== presetId) {
        throw new Error('PRESET_MISMATCH');
      }

      const progressSnap = await transaction.get(progressRef);
      const shardSnap = await transaction.get(shardRef);
      if (!shardSnap.exists()) {
        throw new Error('SHARD_NOT_FOUND');
      }

      // --- STEP 2: VALIDATE CAP AND MONOTONIC SEQUENCE ---
      let nextSeq = 1;
      let windowTotal = amount;
      let windowStart: any = null;

      const nowMs = Date.now();
      const DAY_MS = 24 * 60 * 60 * 1000;

      if (progressSnap.exists()) {
        const progress = progressSnap.data();
        nextSeq = (progress.sequence || 0) + 1;

        let startMs = nowMs;
        if (progress.windowStart) {
          startMs = typeof progress.windowStart.toMillis === 'function'
            ? progress.windowStart.toMillis()
            : (progress.windowStart.seconds ? progress.windowStart.seconds * 1000 : nowMs);
        }

        const isStillInWindow = nowMs < startMs + DAY_MS;
        if (isStillInWindow) {
          const currentTotal = progress.windowTotal || 0;
          if (currentTotal + amount > MAX_24H_CAMPAIGN_CAP) {
            throw new Error('CAMPAIGN_DAILY_CAP_EXCEEDED');
          }
          windowTotal = currentTotal + amount;
          windowStart = progress.windowStart;
        } else {
          // Window has reset after 24h
          windowTotal = amount;
          windowStart = serverTimestamp();
        }
      } else {
        windowStart = serverTimestamp();
      }

      // --- STEP 3: WRITES (Atomic Trio) ---
      // 1. Contribution Doc
      transaction.set(contribRef, {
        userId: currentUid,
        amount,
        presetId,
        sessionId,
        sequence: nextSeq,
        targetShardId: shardId,
        createdAt: serverTimestamp(),
      });

      // 2. User Progress Doc
      transaction.set(
        progressRef,
        {
          sequence: nextSeq,
          windowTotal,
          windowStart,
          lastIncrement: amount,
          lastSessionId: sessionId,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // 3. Shard Doc
      const currentShardCount = shardSnap.data().count || 0;
      transaction.update(shardRef, {
        count: currentShardCount + amount,
        lastIncrement: amount,
        lastContributionId: contribId,
        lastSequence: nextSeq,
        updatedAt: serverTimestamp(),
      });

      return {
        success: true,
        alreadyRecorded: false,
        sequence: nextSeq,
        shardId,
      };
    });
  }

  /**
   * Attaches a real-time onSnapshot listener to the 10 shards.
   * Maintains a Map in memory to guarantee idempotent event handling on network reconnects.
   */
  static subscribeToCampaignLiveCounter(
    campaignId: string,
    onTotalUpdated: (total: number, shardsMap: Map<string, number>) => void,
    firestoreInstance: any = db
  ): Unsubscribe {
    if (!auth.currentUser) {
      onTotalUpdated(0, new Map());
      return () => {};
    }

    const shardsCol = collection(firestoreInstance, 'community_campaigns', campaignId, 'shards');
    const shardsMap = new Map<string, number>();

    return onSnapshot(
      shardsCol,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          shardsMap.set(change.doc.id, change.doc.data().count || 0);
        });
        const liveTotal = Array.from(shardsMap.values()).reduce((sum, count) => sum + count, 0);
        onTotalUpdated(liveTotal, shardsMap);
      },
      (error) => {
        console.warn('Campaign live counter listener notice:', error);
      }
    );
  }

  /**
   * Fetches only the signed-in user's private contribution history.
   * Matches firestore.rules: allow read: if resource.data.userId == request.auth.uid;
   */
  static async getUserContributions(
    campaignId: string,
    userId: string,
    firestoreInstance: any = db
  ): Promise<any[]> {
    const coll = collection(firestoreInstance, 'community_campaigns', campaignId, 'contributions');
    const q = query(coll, where('userId', '==', userId), orderBy('sequence', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  }

  /**
   * Subscribes in real-time to all currently active community campaigns.
   * Performs an anti-index-conflict client sort: official campaigns prioritized first,
   * then newest createdAt.
   */
  static subscribeToActiveCampaigns(
    onCampaignsUpdated: (campaigns: CommunityCampaign[]) => void,
    firestoreInstance: any = db
  ): Unsubscribe {
    if (!auth.currentUser) {
      onCampaignsUpdated([]);
      return () => {};
    }

    const coll = collection(firestoreInstance, 'community_campaigns');
    const q = query(coll, where('status', '==', 'active'));

    return onSnapshot(
      q,
      (snapshot) => {
        const campaigns: CommunityCampaign[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CommunityCampaign, 'id'>),
        }));

        // Sort: Official campaigns first, then newest creation timestamp
        campaigns.sort((a, b) => {
          if (a.isOfficial && !b.isOfficial) return -1;
          if (!a.isOfficial && b.isOfficial) return 1;
          const aTime =
            a.createdAt?.toMillis?.() ||
            (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
          const bTime =
            b.createdAt?.toMillis?.() ||
            (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
          return bTime - aTime;
        });

        onCampaignsUpdated(campaigns);
      },
      (error) => {
        console.warn('Active campaigns subscription notice:', error);
      }
    );
  }
}
