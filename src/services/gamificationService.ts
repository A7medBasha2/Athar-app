import { StorageService } from './storageService';
import { AuthService } from './authService';
import { db } from '../firebase';
import { doc, setDoc, getDocs, getDoc, collection, query, limit } from 'firebase/firestore';
import {
  GamificationBadgeCategory,
  MedalGraphicType,
  XPActivityType,
  XPLedgerEntry,
  UserGamificationSummary,
  AchievementBadgeItem,
} from '../types/gamification';

const LEDGER_STORAGE_KEY = 'athar_gamification_ledger_v1';
const UNLOCKED_BADGES_KEY = 'athar_unlocked_badges_v1';

export const XP_POLICY_CONFIG = {
  dailyCapTotal: 150,
  activities: {
    prayer_fajr: { points: 15, maxPerDay: 1, label: 'صلاة الفجر في وقتها', category: 'prayers' as const },
    prayer_dhuhr: { points: 15, maxPerDay: 1, label: 'صلاة الظهر', category: 'prayers' as const },
    prayer_asr: { points: 15, maxPerDay: 1, label: 'صلاة العصر', category: 'prayers' as const },
    prayer_maghrib: { points: 15, maxPerDay: 1, label: 'صلاة المغرب', category: 'prayers' as const },
    prayer_isha: { points: 15, maxPerDay: 1, label: 'صلاة العشاء', category: 'prayers' as const },
    prayer_sunnah: { points: 10, maxPerDay: 1, label: 'السنن الرواتب وصلاة الضحى', category: 'prayers' as const },
    adhkar_morning: { points: 15, maxPerDay: 1, label: 'إتمام أذكار الصباح كاملة', category: 'adhkar' as const },
    adhkar_evening: { points: 15, maxPerDay: 1, label: 'إتمام أذكار المساء كاملة', category: 'adhkar' as const },
    quran_daily_wird: { points: 20, maxPerDay: 1, label: 'إتمام الورد القرآني اليومي', category: 'quran' as const },
    quran_audio_session: { points: 15, maxPerDay: 1, label: 'استماع وتدبر القرآن (١٠+ دقائق)', category: 'quran' as const },
    sadaqah_deed: { points: 15, maxPerDay: 1, label: 'تسجيل صدقة أو عمل إحسان', category: 'charity' as const },
    kinship_dua: { points: 10, maxPerDay: 1, label: 'بر الوالدين وصلة الأرحام', category: 'charity' as const },
    streak_bonus: { points: 5, maxPerDay: 1, label: 'مكافأة الاستمرارية اليومية', category: 'consistency' as const },
  },
};

export const LEVEL_TITLES: { [level: number]: string } = {
  1: 'البداية المباركة',
  2: 'خطوة الأثر',
  3: 'غرس الإيمان',
  4: 'طريق السكينة',
  5: 'مقام الاستقامة',
  6: 'نور الطاعة',
  7: 'ظلال الأثر',
  8: 'دوام الذكر',
  9: 'حصن المتقين',
  10: 'رياض الجنة',
};

export function getLevelTitle(level: number): string {
  if (level >= 10) return LEVEL_TITLES[10];
  return LEVEL_TITLES[level] || 'طالب الأثر';
}

export function calculateLevelFromXP(totalXP: number): {
  level: number;
  levelTitle: string;
  xpInCurrentLevel: number;
  xpRequiredForNextLevel: number;
  levelProgressPercent: number;
} {
  const safeXP = Math.max(0, Math.floor(totalXP || 0));
  // Formula: level = floor(sqrt(safeXP / 50)) + 1
  const level = Math.max(1, Math.floor(Math.sqrt(safeXP / 50)) + 1);
  const currentLevelBaseXP = Math.round(Math.pow(level - 1, 2) * 50);
  const nextLevelBaseXP = Math.round(Math.pow(level, 2) * 50);
  const xpRequiredForNextLevel = Math.max(1, nextLevelBaseXP - currentLevelBaseXP);
  const xpInCurrentLevel = Math.max(0, safeXP - currentLevelBaseXP);
  const levelProgressPercent = Math.min(100, Math.round((xpInCurrentLevel / xpRequiredForNextLevel) * 100));

  return {
    level,
    levelTitle: getLevelTitle(level),
    xpInCurrentLevel,
    xpRequiredForNextLevel,
    levelProgressPercent,
  };
}

export const SYSTEM_BADGE_DEFINITIONS: {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: GamificationBadgeCategory;
  medalType: MedalGraphicType;
  xpReward: number;
  targetProgress: number;
  unitArabic: string;
  actionLabel?: string;
  actionDestination?: 'quran' | 'adhkar' | 'prayers' | 'sadaqah' | 'tasbih';
}[] = [
  // 1. Prayers Badges
  {
    id: 'fajr_guardian',
    title: 'حارس الفجر',
    subtitle: 'أداء صلاة الفجر في وقتها',
    description: 'المحافظة على أداء صلاة الفجر المباركة في أول وقتها جماعة أو في وقتها المشروع.',
    category: 'prayers',
    medalType: 'mosque',
    xpReward: 30,
    targetProgress: 1,
    unitArabic: 'صلاة',
    actionLabel: 'تسجيل الصلاة',
    actionDestination: 'prayers',
  },
  {
    id: 'five_daily',
    title: 'الصلوات الخمس',
    subtitle: 'إتمام فرائض اليوم كاملاً',
    description: 'تسجيل الصلوات الخمس المفروضة في اليوم كاملاً (الفجر، الظهر، العصر، المغرب، العشاء).',
    category: 'prayers',
    medalType: 'mosque',
    xpReward: 50,
    targetProgress: 5,
    unitArabic: 'صلوات',
    actionLabel: 'مواقيت اليوم',
    actionDestination: 'prayers',
  },
  {
    id: 'sunan_reviver',
    title: 'محيي السنن',
    subtitle: 'السنن الرواتب وصلاة الضحى',
    description: 'المحافظة على السنن الرواتب التابعة للفرائض أو ركعتي الضحى المباركة.',
    category: 'prayers',
    medalType: 'star',
    xpReward: 30,
    targetProgress: 1,
    unitArabic: 'سنة',
    actionLabel: 'تسجيل السنن',
    actionDestination: 'prayers',
  },
  {
    id: 'qiyam_light',
    title: 'نور القيام',
    subtitle: 'قيام الليل والوتر',
    description: 'الوقوف بين يدي الله عز وجل في الثلث الأخير من الليل أو أداء صلاة الوتر قبل النوم.',
    category: 'prayers',
    medalType: 'flame',
    xpReward: 40,
    targetProgress: 1,
    unitArabic: 'ركعة',
    actionLabel: 'مواقيت الصلاة',
    actionDestination: 'prayers',
  },

  // 2. Quran Badges
  {
    id: 'first_recitation',
    title: 'أول تلاوة',
    subtitle: 'بداية الرحلة مع كتاب الله',
    description: 'قراءة أول آية كريمة في المصحف الشريف وتسجيلها في أثر.',
    category: 'quran',
    medalType: 'quran',
    xpReward: 25,
    targetProgress: 1,
    unitArabic: 'آية',
    actionLabel: 'فتح المصحف',
    actionDestination: 'quran',
  },
  {
    id: 'quran_wird_keeper',
    title: 'حافظ الورد',
    subtitle: 'إتمام الورد القرآني اليومي',
    description: 'إنجاز وردك القرآني المحدد لليوم كاملاً دون تفريط.',
    category: 'quran',
    medalType: 'quran',
    xpReward: 40,
    targetProgress: 1,
    unitArabic: 'ورد',
    actionLabel: 'قراءة الورد',
    actionDestination: 'quran',
  },
  {
    id: 'quran_hour',
    title: 'ساعة مع القرآن',
    subtitle: '٦٠ دقيقة استماع وتدبر',
    description: 'قضاء ٦٠ دقيقة في الاستماع لتلاوات القرآن الكريم العذبة أو قراءته المتأنية.',
    category: 'quran',
    medalType: 'quran',
    xpReward: 50,
    targetProgress: 60,
    unitArabic: 'دقيقة',
    actionLabel: 'الاستماع للمصحف',
    actionDestination: 'quran',
  },
  {
    id: 'surah_completed',
    title: 'إتمام سورة',
    subtitle: 'ختم سورة كاملة من كتاب الله',
    description: 'إتمام قراءة سورة كريمة كاملة ووضع علامتها في سجل الختمة.',
    category: 'quran',
    medalType: 'quran',
    xpReward: 35,
    targetProgress: 1,
    unitArabic: 'سورة',
    actionLabel: 'سجل الختمة',
    actionDestination: 'quran',
  },

  // 3. Adhkar Badges
  {
    id: 'first_dhikr',
    title: 'بداية الأثر',
    subtitle: 'أول تسبيحة مباركة',
    description: 'البدء بذكر الله عز وجل وتسجيل أول تسبيحة عبر المسبحة الذكية أو الحصن.',
    category: 'adhkar',
    medalType: 'tasbih',
    xpReward: 20,
    targetProgress: 1,
    unitArabic: 'تسبيحة',
    actionLabel: 'فتح المسبحة',
    actionDestination: 'tasbih',
  },
  {
    id: 'morning_guard',
    title: 'حارس الصباح',
    subtitle: 'إتمام أذكار الصباح كاملة',
    description: 'إتمام جلسة أذكار الصباح المأثورة كاملة والاستفتاح بذكر الله.',
    category: 'adhkar',
    medalType: 'flame',
    xpReward: 35,
    targetProgress: 1,
    unitArabic: 'جلسة',
    actionLabel: 'أذكار الصباح',
    actionDestination: 'adhkar',
  },
  {
    id: 'evening_guard',
    title: 'حارس المساء',
    subtitle: 'إتمام أذكار المساء كاملة',
    description: 'إتمام أذكار المساء والتحصين الشريف كاملة لحفظ النفس وأهل البيت.',
    category: 'adhkar',
    medalType: 'flame',
    xpReward: 35,
    targetProgress: 1,
    unitArabic: 'جلسة',
    actionLabel: 'أذكار المساء',
    actionDestination: 'adhkar',
  },
  {
    id: 'tasbih_master',
    title: 'مسبحة الذاكرين',
    subtitle: '١٠٠ ذكر وتسبيح',
    description: 'تسجيل ١٠٠ تسبيحة وذكر في رصيد المسبحة الرقمية بالأثر.',
    category: 'adhkar',
    medalType: 'tasbih',
    xpReward: 40,
    targetProgress: 100,
    unitArabic: 'ذكر',
    actionLabel: 'المسبحة الإلكترونية',
    actionDestination: 'tasbih',
  },

  // 4. Charity & Kinship Badges
  {
    id: 'sadaqah_giver',
    title: 'باذل المعروف',
    subtitle: 'تسجيل صدقة أو عمل بر',
    description: 'تسجيل أول صدقة أو عمل إحسان في سجل صدقات أثر ابتغاء وجه الله.',
    category: 'charity',
    medalType: 'charity',
    xpReward: 35,
    targetProgress: 1,
    unitArabic: 'صدقة',
    actionLabel: 'سجل الصدقات',
    actionDestination: 'sadaqah',
  },
  {
    id: 'parents_dutiful',
    title: 'بار الوالدين',
    subtitle: 'الدعاء والإحسان للوالدين',
    description: 'تسجيل دعاء أو صلة للوالدين الكريمين أو تفقد الأرحام.',
    category: 'charity',
    medalType: 'charity',
    xpReward: 35,
    targetProgress: 1,
    unitArabic: 'صلة',
    actionLabel: 'بر الوالدين',
    actionDestination: 'sadaqah',
  },

  // 5. Steadiness Badges
  {
    id: 'streak_7_days',
    title: 'ثبات أسبوع',
    subtitle: '٧ أيام متتالية من الطاعة',
    description: 'المحافظة على سلسلة الطاعة اليومية لسبعة أيام متتالية دون انقطاع.',
    category: 'consistency',
    medalType: 'flame',
    xpReward: 70,
    targetProgress: 7,
    unitArabic: 'أيام',
    actionLabel: 'شجرة الأثر',
    actionDestination: 'prayers',
  },
];

export class GamificationService {
  /**
   * Helper to format current date in YYYY-MM-DD
   */
  static getTodayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /**
   * Retrieve all local ledger entries for current or explicit UID
   */
  static getLocalLedger(explicitUid?: string): XPLedgerEntry[] {
    try {
      const key = StorageService.getScopedKey(LEDGER_STORAGE_KEY, explicitUid);
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Save ledger locally for current or explicit UID and dispatch update event
   */
  private static saveLocalLedger(entries: XPLedgerEntry[], explicitUid?: string): void {
    try {
      const key = StorageService.getScopedKey(LEDGER_STORAGE_KEY, explicitUid);
      localStorage.setItem(key, JSON.stringify(entries));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('athar_xp_updated'));
      }
    } catch (e) {
      console.warn('Failed to save XP ledger:', e);
    }
  }

  /**
   * Retrieve map of unlocked badges { [badgeId]: earnedTimestamp }
   */
  static getUnlockedBadgesMap(explicitUid?: string): Record<string, string> {
    try {
      const key = StorageService.getScopedKey(UNLOCKED_BADGES_KEY, explicitUid);
      const raw = localStorage.getItem(key);
      if (!raw) return {};
      return JSON.parse(raw) || {};
    } catch {
      return {};
    }
  }

  /**
   * Save unlocked badges map
   */
  private static saveUnlockedBadgesMap(map: Record<string, string>, explicitUid?: string): void {
    try {
      const key = StorageService.getScopedKey(UNLOCKED_BADGES_KEY, explicitUid);
      localStorage.setItem(key, JSON.stringify(map));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('athar_badges_updated'));
      }
    } catch (e) {
      console.warn('Failed to save unlocked badges:', e);
    }
  }

  /**
   * Compute total daily XP earned on a given dateKey for current or explicit UID
   */
  static getDailyXPEarned(dateKey = this.getTodayKey(), explicitUid?: string): number {
    const ledger = this.getLocalLedger(explicitUid);
    return ledger
      .filter((entry) => entry.dateKey === dateKey)
      .reduce((sum, entry) => sum + entry.points, 0);
  }

  /**
   * Idempotently record an activity event and award XP if eligible
   */
  static async recordActivity(
    activityType: XPActivityType,
    customDateKey?: string,
    explicitUid?: string
  ): Promise<{ awarded: boolean; points: number; totalXP: number; reason?: string }> {
    const config = XP_POLICY_CONFIG.activities[activityType];
    const targetUid = explicitUid || StorageService.getCurrentStorageUid();

    if (!config) {
      return { awarded: false, points: 0, totalXP: this.getTotalXP(targetUid), reason: 'Unknown activity' };
    }

    const dateKey = customDateKey || this.getTodayKey();
    const eventId = `xp_${activityType}_${dateKey}`;
    const ledger = this.getLocalLedger(targetUid);

    // 1. Idempotency Check: Event already recorded for this specific date slot
    const exists = ledger.some((entry) => entry.id === eventId);
    if (exists) {
      return { awarded: false, points: 0, totalXP: this.getTotalXP(targetUid), reason: 'Already awarded for this slot' };
    }

    // 2. Daily Cap Check
    const currentDailyXP = this.getDailyXPEarned(dateKey, targetUid);
    const availableQuota = Math.max(0, XP_POLICY_CONFIG.dailyCapTotal - currentDailyXP);
    if (availableQuota <= 0) {
      return { awarded: false, points: 0, totalXP: this.getTotalXP(targetUid), reason: 'Daily cap reached' };
    }

    const pointsToAward = Math.min(config.points, availableQuota);
    const newEntry: XPLedgerEntry = {
      id: eventId,
      userId: targetUid,
      activityType,
      titleArabic: config.label,
      category: config.category,
      points: pointsToAward,
      timestamp: new Date().toISOString(),
      dateKey,
    };

    // Append to local ledger (capped to last 150 entries to preserve space)
    const updatedLedger = [newEntry, ...ledger].slice(0, 150);
    this.saveLocalLedger(updatedLedger, targetUid);

    const newTotalXP = updatedLedger.reduce((sum, e) => sum + e.points, 0);

    // 3. Sync to Firestore in background if authenticated as this user
    const currentAuthUser = AuthService.getCurrentUser();
    if (currentAuthUser && !currentAuthUser.isAnonymous && currentAuthUser.uid === targetUid) {
      this.syncLedgerEntryToFirestore(targetUid, newEntry).catch((err) => {
        console.warn('Background XP sync deferred:', err);
      });
    }

    // 4. Re-evaluate badges after XP mutation
    this.evaluateBadges(targetUid);

    return { awarded: true, points: pointsToAward, totalXP: newTotalXP };
  }

  /**
   * Sync a ledger entry to Firestore subcollection users/{uid}/xp_ledger/{eventId}
   * Formatted strictly to comply with firestore.rules keys and schema constraints.
   */
  private static async syncLedgerEntryToFirestore(uid: string, entry: XPLedgerEntry): Promise<void> {
    try {
      const entryRef = doc(db, 'users', uid, 'xp_ledger', entry.id);
      // Strictly formatted for firestore.rules
      const firestorePayload = {
        id: entry.id,
        activityType: entry.activityType,
        points: entry.points,
        label: entry.titleArabic,
        dateKey: entry.dateKey,
        timestamp: Math.floor(new Date(entry.timestamp).getTime() / 1000) || Math.floor(Date.now() / 1000),
        details: entry.category,
      };
      await setDoc(entryRef, firestorePayload, { merge: true });

      // Update user document summary
      const summary = this.getGamificationSummary(uid);
      const userRef = doc(db, 'users', uid);
      await setDoc(
        userRef,
        {
          xp: summary.totalXP,
          level: summary.currentLevel,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Firestore ledger write error:', e);
    }
  }

  /**
   * Full bidirectional cloud synchronization for authenticated user
   */
  static async syncUserActivitiesToCloud(uid: string): Promise<void> {
    if (!uid || uid === 'guest' || uid === 'guest_user') return;
    try {
      // 1. Fetch remote ledger from Firestore
      const ledgerColl = collection(db, 'users', uid, 'xp_ledger');
      const q = query(ledgerColl, limit(150));
      const snap = await getDocs(q);
      const remoteEntries: XPLedgerEntry[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        remoteEntries.push({
          id: d.id,
          userId: uid,
          activityType: d.activityType,
          titleArabic: d.label || 'نشاط روحي',
          category: (d.details as any) || 'prayers',
          points: d.points,
          timestamp: typeof d.timestamp === 'number' ? new Date(d.timestamp * 1000).toISOString() : new Date().toISOString(),
          dateKey: d.dateKey,
        });
      });

      // 2. Fetch local ledger
      const localEntries = this.getLocalLedger(uid);
      const localMap = new Map<string, XPLedgerEntry>(localEntries.map((e) => [e.id, e]));

      let localChanged = false;
      for (const r of remoteEntries) {
        if (!localMap.has(r.id)) {
          localMap.set(r.id, r);
          localChanged = true;
        }
      }

      const mergedLedger = Array.from(localMap.values())
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 150);

      if (localChanged) {
        this.saveLocalLedger(mergedLedger, uid);
      }

      // 3. Push un-synced local entries to Firestore
      const remoteIdSet = new Set(remoteEntries.map((r) => r.id));
      for (const localEntry of mergedLedger) {
        if (!remoteIdSet.has(localEntry.id)) {
          await this.syncLedgerEntryToFirestore(uid, localEntry);
        }
      }

      // 4. Sync achievements subcollection
      const achievementsColl = collection(db, 'users', uid, 'achievements');
      const achSnap = await getDocs(achievementsColl);
      const localBadgesMap = this.getUnlockedBadgesMap(uid);
      let badgesChanged = false;

      achSnap.forEach((docSnap) => {
        const b = docSnap.data();
        if (b.badgeId && !localBadgesMap[b.badgeId]) {
          localBadgesMap[b.badgeId] = b.unlockedAt || new Date().toISOString();
          badgesChanged = true;
        }
      });

      if (badgesChanged) {
        this.saveUnlockedBadgesMap(localBadgesMap, uid);
      }

      for (const [badgeId, unlockedAt] of Object.entries(localBadgesMap)) {
        const achDocRef = doc(db, 'users', uid, 'achievements', badgeId);
        await setDoc(achDocRef, { badgeId, unlockedAt }, { merge: true });
      }

      // 5. Update user profile totals in parent doc
      const summary = this.getGamificationSummary(uid);
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await setDoc(
          userRef,
          {
            xp: summary.totalXP,
            level: summary.currentLevel,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    } catch (e) {
      console.warn('syncUserActivitiesToCloud notice (offline/deferred):', e);
    }
  }

  /**
   * Total calculated XP from all legitimate ledger entries
   */
  static getTotalXP(explicitUid?: string): number {
    const ledger = this.getLocalLedger(explicitUid);
    return ledger.reduce((sum, entry) => sum + entry.points, 0);
  }

  /**
   * Evaluate all 15 system badges against real data stores in Athar for current or explicit UID
   */
  static evaluateBadges(explicitUid?: string): AchievementBadgeItem[] {
    const prayerAchievements = StorageService.getPrayerAchievements(explicitUid);
    const adhkarStats = StorageService.getAdhkarStats(explicitUid);
    const khatmah = StorageService.getQuranKhatmah(explicitUid);
    const sadaqahList = StorageService.getSadaqahRecords(explicitUid);
    const tasbihState = StorageService.getTasbihState(explicitUid);
    const kinshipState = StorageService.getKinshipParentsState(explicitUid);
    const unlockedMap = this.getUnlockedBadgesMap(explicitUid);
    let mapChanged = false;

    const evaluatedBadges: AchievementBadgeItem[] = SYSTEM_BADGE_DEFINITIONS.map((def) => {
      let currentProgress = 0;
      let isUnlocked = Boolean(unlockedMap[def.id]);

      // Measure authentic progress from storage
      switch (def.id) {
        case 'fajr_guardian':
          currentProgress = prayerAchievements.todayPrayers?.fajr ? 1 : 0;
          if (prayerAchievements.unlockedBadgeIds?.includes('fajr_guardian')) currentProgress = 1;
          break;

        case 'five_daily': {
          const tp = prayerAchievements.todayPrayers || {};
          let count = 0;
          if (tp.fajr) count++;
          if (tp.dhuhr) count++;
          if (tp.asr) count++;
          if (tp.maghrib) count++;
          if (tp.isha) count++;
          currentProgress = count;
          if (prayerAchievements.unlockedBadgeIds?.includes('five_daily')) currentProgress = 5;
          break;
        }

        case 'sunan_reviver':
          currentProgress = prayerAchievements.todayPrayers?.sunan ? 1 : 0;
          if (prayerAchievements.unlockedBadgeIds?.includes('sunan_reviver')) currentProgress = 1;
          break;

        case 'qiyam_light':
          currentProgress = prayerAchievements.todayPrayers?.qiyam ? 1 : 0;
          if (prayerAchievements.unlockedBadgeIds?.includes('qiyam_light')) currentProgress = 1;
          break;

        case 'first_recitation':
          currentProgress = (khatmah.totalAyahsReadOverall || khatmah.totalAyahsReadToday || 0) > 0 ? 1 : 0;
          break;

        case 'quran_wird_keeper': {
          const wird = StorageService.getDailyWirdConfig(explicitUid);
          currentProgress = (wird.completedTodayCount || 0) >= (wird.targetCount || 1) ? 1 : 0;
          break;
        }

        case 'quran_hour':
          currentProgress = Math.min(
            60,
            (khatmah.totalMinutesListenedOverall || 0) + Math.round((khatmah.totalAyahsReadOverall || 0) * 1.5)
          );
          break;

        case 'surah_completed':
          currentProgress = Math.min(1, (khatmah.completedSurahs || []).length);
          break;

        case 'first_dhikr':
          currentProgress = (adhkarStats.totalDhikrRecited || 0) > 0 ? 1 : 0;
          if (adhkarStats.unlockedBadgeIds?.includes('first_dhikr')) currentProgress = 1;
          break;

        case 'morning_guard':
          currentProgress = adhkarStats.morningCompletedToday || (adhkarStats.totalMorningSessions || 0) > 0 ? 1 : 0;
          if (adhkarStats.unlockedBadgeIds?.includes('morning_guard')) currentProgress = 1;
          break;

        case 'evening_guard':
          currentProgress = adhkarStats.eveningCompletedToday || (adhkarStats.totalEveningSessions || 0) > 0 ? 1 : 0;
          if (adhkarStats.unlockedBadgeIds?.includes('evening_guard')) currentProgress = 1;
          break;

        case 'tasbih_master':
          currentProgress = Math.min(100, tasbihState.totalAllTime || 0);
          break;

        case 'sadaqah_giver':
          currentProgress = sadaqahList.length > 0 ? 1 : 0;
          break;

        case 'parents_dutiful':
          currentProgress =
            kinshipState.contacts?.some((c: any) => !c.id?.startsWith('sample_') && (c.interactionCount || 0) > 0) ||
            kinshipState.fatherLastDuaDate ||
            kinshipState.motherLastDuaDate
              ? 1
              : 0;
          break;

        case 'streak_7_days': {
          const s = Math.max(prayerAchievements.streakDays || 0, adhkarStats.currentStreak || 0);
          currentProgress = Math.min(7, s);
          break;
        }
      }

      // Check unlock threshold
      if (currentProgress >= def.targetProgress && !isUnlocked) {
        isUnlocked = true;
        unlockedMap[def.id] = new Date().toISOString();
        mapChanged = true;
      }

      const progressPercent = Math.min(100, Math.round((currentProgress / def.targetProgress) * 100));
      const visualState: 'locked' | 'in_progress' | 'earned' = isUnlocked
        ? 'earned'
        : currentProgress > 0
        ? 'in_progress'
        : 'locked';

      const progressText = isUnlocked
        ? 'مكتمل'
        : `${currentProgress} / ${def.targetProgress} ${def.unitArabic}`;

      return {
        id: def.id,
        title: def.title,
        subtitle: def.subtitle,
        description: def.description,
        category: def.category,
        medalType: def.medalType,
        isUnlocked,
        unlockedDate: unlockedMap[def.id],
        currentProgress,
        targetProgress: def.targetProgress,
        progressPercent,
        progressText,
        xpReward: def.xpReward,
        visualState,
        actionLabel: def.actionLabel,
        actionDestination: def.actionDestination,
      };
    });

    if (mapChanged) {
      this.saveUnlockedBadgesMap(unlockedMap, explicitUid);
    }

    return evaluatedBadges;
  }

  /**
   * Get high-level gamification state summary
   */
  static getGamificationSummary(explicitUid?: string): UserGamificationSummary {
    const totalXP = this.getTotalXP(explicitUid);
    const levelInfo = calculateLevelFromXP(totalXP);
    const badges = this.evaluateBadges(explicitUid);
    const earnedBadgesCount = badges.filter((b) => b.isUnlocked).length;
    const dailyXPEarnedToday = this.getDailyXPEarned(this.getTodayKey(), explicitUid);

    return {
      totalXP,
      currentLevel: levelInfo.level,
      levelTitle: levelInfo.levelTitle,
      xpInCurrentLevel: levelInfo.xpInCurrentLevel,
      xpRequiredForNextLevel: levelInfo.xpRequiredForNextLevel,
      levelProgressPercent: levelInfo.levelProgressPercent,
      dailyXPEarnedToday,
      dailyXPCap: XP_POLICY_CONFIG.dailyCapTotal,
      earnedBadgesCount,
      totalBadgesCount: badges.length,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Migrate existing user deeds into baseline XP ledger without fabricating past events
   */
  static migrateLegacyUserActivities(explicitUid?: string): void {
    const targetUid = explicitUid || StorageService.getCurrentStorageUid();
    const existingLedger = this.getLocalLedger(targetUid);
    if (existingLedger.length > 0) return; // Already initialized or has entries

    const prayers = StorageService.getPrayerAchievements(targetUid);
    const adhkar = StorageService.getAdhkarStats(targetUid);
    const khatmah = StorageService.getQuranKhatmah(targetUid);
    const sadaqah = StorageService.getSadaqahRecords(targetUid);

    const initialEntries: XPLedgerEntry[] = [];
    const dateKey = this.getTodayKey();

    // Only seed baseline if user actually has authentic recorded deeds
    if (prayers.totalPrayersLogged && prayers.totalPrayersLogged > 0) {
      initialEntries.push({
        id: `xp_legacy_prayers_baseline`,
        userId: targetUid,
        activityType: 'prayer_dhuhr',
        titleArabic: 'سجل الصلوات المكتملة السابقة',
        category: 'prayers',
        points: Math.min(100, prayers.totalPrayersLogged * 10),
        timestamp: new Date().toISOString(),
        dateKey,
      });
    }

    if (adhkar.totalDhikrRecited && adhkar.totalDhikrRecited > 0) {
      initialEntries.push({
        id: `xp_legacy_adhkar_baseline`,
        userId: targetUid,
        activityType: 'adhkar_morning',
        titleArabic: 'جلسات الذكر وحصن المسلم السابقة',
        category: 'adhkar',
        points: Math.min(60, Math.floor(adhkar.totalDhikrRecited / 10) * 5),
        timestamp: new Date().toISOString(),
        dateKey,
      });
    }

    if (khatmah.totalAyahsReadOverall && khatmah.totalAyahsReadOverall > 0) {
      initialEntries.push({
        id: `xp_legacy_quran_baseline`,
        userId: targetUid,
        activityType: 'quran_daily_wird',
        titleArabic: 'تلاوات الورد القرآني السابقة',
        category: 'quran',
        points: Math.min(80, Math.floor(khatmah.totalAyahsReadOverall / 5) * 5),
        timestamp: new Date().toISOString(),
        dateKey,
      });
    }

    if (sadaqah && sadaqah.length > 0) {
      initialEntries.push({
        id: `xp_legacy_sadaqah_baseline`,
        userId: targetUid,
        activityType: 'sadaqah_deed',
        titleArabic: 'سجلات الإحسان والصدقة السابقة',
        category: 'charity',
        points: Math.min(45, sadaqah.length * 15),
        timestamp: new Date().toISOString(),
        dateKey,
      });
    }

    if (initialEntries.length > 0) {
      this.saveLocalLedger(initialEntries, targetUid);
    }

    // Evaluate badges on baseline
    this.evaluateBadges(targetUid);
  }
}
