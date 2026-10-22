import { db, auth } from '../firebase';
import {
  doc,
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
  Unsubscribe,
} from 'firebase/firestore';

export interface CommunityCampaign {
  id: string;
  title: string;
  description: string;
  targetDhikrPreset: string;
  totalTarget: number;
  status: 'active' | 'paused' | 'completed' | 'archived';
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

    // 1. Campaign parent document
    batch.set(campaignRef, {
      ...campaignData,
      status: 'active',
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
    return { success: true, campaignId: targetId };
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
        console.error('Campaign live counter listener error:', error);
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
}
