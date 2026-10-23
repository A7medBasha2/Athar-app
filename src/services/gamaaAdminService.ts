import { db, auth } from '../firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
  where,
} from 'firebase/firestore';
import { CommunityCampaign, CommunityCampaignService } from './communityCampaignService';

export type ReportTargetType = 'post' | 'comment';
export type ReportReason = 'inappropriate' | 'offensive' | 'spam' | 'other';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export type NoticeScope = 'app_wide' | 'gamaa' | 'section';
export type NoticePriority = 'normal' | 'high' | 'urgent';
export type NoticeStatus = 'draft' | 'scheduled' | 'active' | 'archived';

export interface GlobalNotice {
  id: string;
  title?: string;
  message: string;
  scope: NoticeScope;
  targetSection?: string;
  targetCampaignId?: string;
  priority: NoticePriority;
  isPinned: boolean;
  status: NoticeStatus;
  startsAt: any;
  expiresAt: any;
  creatorId: string;
  createdAt: any;
  updatedAt: any;
}

export interface CommunityReport {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  postId: string;
  reporterId: string;
  reason: ReportReason;
  details?: string;
  snippet?: string;
  status: ReportStatus;
  createdAt: any;
  resolvedAt?: any;
  resolvedBy?: string;
}

export type AdminCheckState = 'idle' | 'loading' | 'success' | 'denied' | 'error';

export interface AdminRoleStatus {
  state: AdminCheckState;
  isOwner: boolean;
  isModerator: boolean;
  canDeletePosts: boolean;
  permissions: string[];
  error?: string | null;
  errorCode?: string | null;
}

export interface ModeratorRecord {
  uid: string;
  active: boolean;
  permissions: string[];
  name?: string;
  email?: string;
}

export class GamaaAdminService {
  /**
   * Helper to evaluate owner list from document data with support for arrays and maps
   */
  public static isUidInOwnerData(data: any, userId: string): boolean {
    if (!data || !userId) return false;
    const targetUid = userId.trim();

    // 1. Check ownerUids as Array
    if (Array.isArray(data.ownerUids)) {
      const match = data.ownerUids.some((u: any) => typeof u === 'string' && u.trim() === targetUid);
      if (match) return true;
    }

    // 2. Check ownerUids as Map/Record
    if (data.ownerUids && typeof data.ownerUids === 'object' && !Array.isArray(data.ownerUids)) {
      if (Boolean(data.ownerUids[targetUid])) return true;
    }

    // 3. Check owners alias
    if (Array.isArray(data.owners)) {
      const match = data.owners.some((u: any) => typeof u === 'string' && u.trim() === targetUid);
      if (match) return true;
    }

    return false;
  }

  /**
   * Verified check of administrative permissions against Firestore rules source of truth
   * Distinguishes between 'success' (authorized/verified), 'denied' (clean non-admin), and 'error' (lookup failed)
   */
  public static async getAdminStatus(userId: string): Promise<AdminRoleStatus> {
    if (!userId) {
      return {
        state: 'denied',
        isOwner: false,
        isModerator: false,
        canDeletePosts: false,
        permissions: [],
      };
    }

    let isOwner = false;
    let isModerator = false;
    let permissions: string[] = [];
    let hasError = false;
    let errorDetail: string | null = null;
    let errorCode: string | null = null;

    // 1. Check system owner roles doc
    try {
      const rolesSnap = await getDoc(doc(db, 'system_config', 'roles'));
      if (rolesSnap.exists()) {
        const data = rolesSnap.data();
        if (this.isUidInOwnerData(data, userId)) {
          isOwner = true;
          permissions = ['delete_post', 'manage_campaigns', 'manage_roles', 'manage_reports'];
        }
      }
    } catch (e: any) {
      // Permission-denied is the expected, secure rejection for non-owners under protected rules
      const isPermissionDenied =
        e?.code === 'permission-denied' ||
        (typeof e?.message === 'string' &&
          (e.message.includes('insufficient permissions') || e.message.includes('PERMISSION_DENIED')));

      if (!isPermissionDenied) {
        console.warn('[GamaaAdmin] Owner check unexpected notice:', e);
        hasError = true;
        errorDetail = e?.message || String(e);
        errorCode = e?.code || 'permission-error';
      }
    }

    // 2. Check moderator document
    try {
      const modSnap = await getDoc(doc(db, 'moderators', userId));
      if (modSnap.exists()) {
        const modData = modSnap.data();
        if (modData?.active === true) {
          isModerator = true;
          const modPerms = Array.isArray(modData.permissions) ? modData.permissions : [];
          // Merge permissions
          permissions = Array.from(new Set([...permissions, ...modPerms]));
        }
      }
    } catch (e: any) {
      console.warn('[GamaaAdmin] Mod check notice:', e);
      if (!isOwner) {
        hasError = true;
        errorDetail = errorDetail || e?.message || String(e);
        errorCode = errorCode || e?.code || 'permission-error';
      }
    }

    const canDeletePosts = isOwner || permissions.includes('delete_post');

    // Determine safe, distinct state
    if (isOwner || isModerator) {
      return {
        state: 'success',
        isOwner,
        isModerator,
        canDeletePosts,
        permissions,
      };
    }

    if (hasError) {
      // Crucial: on error, never grant permissions, but clearly mark state as 'error'
      return {
        state: 'error',
        isOwner: false,
        isModerator: false,
        canDeletePosts: false,
        permissions: [],
        error: errorDetail,
        errorCode,
      };
    }

    return {
      state: 'denied',
      isOwner: false,
      isModerator: false,
      canDeletePosts: false,
      permissions: [],
    };
  }

  /**
   * Submit a user report for inappropriate content (posts or comments)
   */
  public static async submitReport(report: {
    targetType: ReportTargetType;
    targetId: string;
    postId: string;
    reason: ReportReason;
    details?: string;
    snippet?: string;
  }): Promise<string> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('يجب تسجيل الدخول لإرسال البلاغ');
    }

    const reportCol = collection(db, 'community_reports');
    const newReportRef = doc(reportCol);

    const payload: Record<string, any> = {
      id: newReportRef.id,
      targetType: report.targetType,
      targetId: report.targetId,
      postId: report.postId,
      reporterId: user.uid,
      reason: report.reason,
      status: 'pending',
      createdAt: serverTimestamp(),
    };

    if (report.details && report.details.trim()) {
      payload.details = report.details.trim().substring(0, 300);
    }
    if (report.snippet && report.snippet.trim()) {
      payload.snippet = report.snippet.trim().substring(0, 200);
    }

    await setDoc(newReportRef, payload);
    return newReportRef.id;
  }

  /**
   * Real-time subscription to community reports (Authorized owners/moderators only)
   */
  public static listenToReports(
    callback: (reports: CommunityReport[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const q = query(
      collection(db, 'community_reports'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const reports: CommunityReport[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            targetType: data.targetType || 'post',
            targetId: data.targetId || '',
            postId: data.postId || '',
            reporterId: data.reporterId || '',
            reason: data.reason || 'other',
            details: data.details,
            snippet: data.snippet,
            status: data.status || 'pending',
            createdAt: data.createdAt,
            resolvedAt: data.resolvedAt,
            resolvedBy: data.resolvedBy,
          };
        });
        callback(reports);
      },
      (err) => {
        console.error('[GamaaAdmin] Reports listener error:', err);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Update report status (resolve or dismiss)
   */
  public static async updateReportStatus(
    reportId: string,
    status: 'resolved' | 'dismissed'
  ): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('AUTH_REQUIRED');
    }

    const reportRef = doc(db, 'community_reports', reportId);
    await updateDoc(reportRef, {
      status,
      resolvedAt: serverTimestamp(),
      resolvedBy: user.uid,
    });
  }

  /**
   * Delete report document
   */
  public static async deleteReport(reportId: string): Promise<void> {
    const reportRef = doc(db, 'community_reports', reportId);
    await deleteDoc(reportRef);
  }

  /**
   * Fetch all campaigns regardless of state for administrative oversight
   */
  public static async fetchAllCampaigns(): Promise<CommunityCampaign[]> {
    const coll = collection(db, 'community_campaigns');
    const snapshot = await getDocs(coll);

    const list: CommunityCampaign[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<CommunityCampaign, 'id'>),
    }));

    // Sort by createdAt desc
    list.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
      const bTime = b.createdAt?.toMillis?.() || (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
      return bTime - aTime;
    });

    return list;
  }

  /**
   * Update campaign status following strict Firestore Rules transitions:
   * Action B: System Owner Maintenance allowed on ['active', 'paused'] campaigns to transition to ['active', 'paused', 'completed', 'archived']
   */
  public static async updateCampaignStatus(
    campaignId: string,
    newStatus: 'active' | 'paused' | 'completed' | 'archived'
  ): Promise<void> {
    const campRef = doc(db, 'community_campaigns', campaignId);
    await updateDoc(campRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Delete archived campaign (Owner only)
   */
  public static async deleteArchivedCampaign(campaignId: string): Promise<void> {
    const campRef = doc(db, 'community_campaigns', campaignId);
    await deleteDoc(campRef);
  }

  /**
   * Fetch system owners and moderators list for inspection
   */
  public static async fetchTeamMembers(): Promise<{
    owners: string[];
    moderators: ModeratorRecord[];
  }> {
    let owners: string[] = [];
    const moderators: ModeratorRecord[] = [];

    try {
      const rolesSnap = await getDoc(doc(db, 'system_config', 'roles'));
      if (rolesSnap.exists()) {
        owners = rolesSnap.data()?.ownerUids || [];
      }
    } catch (e) {
      console.warn('[GamaaAdmin] fetchTeamMembers roles error:', e);
    }

    try {
      const modsSnap = await getDocs(collection(db, 'moderators'));
      modsSnap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        moderators.push({
          uid: docSnap.id,
          active: data.active === true,
          permissions: Array.isArray(data.permissions) ? data.permissions : [],
          name: data.name,
          email: data.email,
        });
      });
    } catch (e) {
      console.warn('[GamaaAdmin] fetchTeamMembers moderators error:', e);
    }

    return { owners, moderators };
  }

  // ==========================================
  // Global Notice Management (Owner only)
  // ==========================================

  /**
   * Create a new global or scoped announcement notice
   */
  public static async createNotice(notice: {
    title?: string;
    message: string;
    scope: NoticeScope;
    targetSection?: string;
    targetCampaignId?: string;
    priority: NoticePriority;
    isPinned: boolean;
    status: NoticeStatus;
    startsAt: Date | any;
    expiresAt: Date | any;
  }): Promise<string> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('يجب تسجيل الدخول لإنشاء التنبيه');
    }

    const trimmedMsg = (notice.message || '').trim();
    if (trimmedMsg.length < 3 || trimmedMsg.length > 300) {
      throw new Error('يجب أن تكون رسالة التنبيه بين 3 و 300 حرف');
    }

    if (notice.title && notice.title.trim().length > 60) {
      throw new Error('عنوان التنبيه يجب ألا يتجاوز 60 حرفاً');
    }

    const startDate = notice.startsAt instanceof Date ? notice.startsAt : new Date(notice.startsAt);
    const expireDate = notice.expiresAt instanceof Date ? notice.expiresAt : new Date(notice.expiresAt);

    if (isNaN(startDate.getTime()) || isNaN(expireDate.getTime())) {
      throw new Error('تواريخ التنبيه غير صالحة');
    }

    if (expireDate.getTime() <= startDate.getTime()) {
      throw new Error('تاريخ انتهاء التنبيه يجب أن يكون لاحقاً لتاريخ البداية');
    }

    const noticesCol = collection(db, 'global_notices');
    const newNoticeRef = doc(noticesCol);

    const payload: Record<string, any> = {
      id: newNoticeRef.id,
      message: trimmedMsg,
      scope: notice.scope,
      priority: notice.priority,
      isPinned: Boolean(notice.isPinned),
      status: notice.status,
      startsAt: startDate,
      expiresAt: expireDate,
      creatorId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (notice.title && notice.title.trim()) {
      payload.title = notice.title.trim();
    }
    if (notice.scope === 'section' && notice.targetSection) {
      payload.targetSection = notice.targetSection;
    }
    if (notice.targetCampaignId && notice.targetCampaignId.trim()) {
      payload.targetCampaignId = notice.targetCampaignId.trim();
    }

    await setDoc(newNoticeRef, payload);
    return newNoticeRef.id;
  }

  /**
   * Update an existing notice
   */
  public static async updateNotice(
    noticeId: string,
    updates: Partial<{
      title?: string;
      message: string;
      scope: NoticeScope;
      targetSection?: string;
      targetCampaignId?: string;
      priority: NoticePriority;
      isPinned: boolean;
      status: NoticeStatus;
      startsAt: Date | any;
      expiresAt: Date | any;
    }>
  ): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('يجب تسجيل الدخول لتعديل التنبيه');
    }

    const noticeRef = doc(db, 'global_notices', noticeId);
    const payload: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };

    if (updates.message !== undefined) {
      const trimmed = updates.message.trim();
      if (trimmed.length < 3 || trimmed.length > 300) {
        throw new Error('نص التنبيه يجب أن يكون بين 3 و 300 حرف');
      }
      payload.message = trimmed;
    }

    if (updates.title !== undefined) {
      payload.title = updates.title.trim();
    }

    if (updates.scope !== undefined) {
      payload.scope = updates.scope;
      if (updates.scope !== 'section') {
        payload.targetSection = null;
      }
    }

    if (updates.targetSection !== undefined) {
      payload.targetSection = updates.targetSection;
    }

    if (updates.targetCampaignId !== undefined) {
      payload.targetCampaignId = updates.targetCampaignId ? updates.targetCampaignId.trim() : null;
    }

    if (updates.priority !== undefined) {
      payload.priority = updates.priority;
    }

    if (updates.isPinned !== undefined) {
      payload.isPinned = updates.isPinned;
    }

    if (updates.status !== undefined) {
      payload.status = updates.status;
    }

    if (updates.startsAt !== undefined) {
      const d = updates.startsAt instanceof Date ? updates.startsAt : new Date(updates.startsAt);
      if (!isNaN(d.getTime())) payload.startsAt = d;
    }

    if (updates.expiresAt !== undefined) {
      const d = updates.expiresAt instanceof Date ? updates.expiresAt : new Date(updates.expiresAt);
      if (!isNaN(d.getTime())) payload.expiresAt = d;
    }

    await updateDoc(noticeRef, payload);
  }

  /**
   * Delete an existing notice (Owner only)
   */
  public static async deleteNotice(noticeId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('يجب تسجيل الدخول لحذف التنبيه');
    }
    const noticeRef = doc(db, 'global_notices', noticeId);
    await deleteDoc(noticeRef);
  }

  /**
   * Listen to all notices for admin management
   */
  public static listenToAllNotices(callback: (notices: GlobalNotice[]) => void): Unsubscribe {
    if (!auth.currentUser) {
      callback([]);
      return () => {};
    }

    const q = query(collection(db, 'global_notices'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(
      q,
      (snapshot) => {
        const notices: GlobalNotice[] = [];
        snapshot.docs.forEach((d) => {
          const data = d.data();
          notices.push({
            id: d.id,
            title: data.title,
            message: data.message,
            scope: data.scope,
            targetSection: data.targetSection,
            targetCampaignId: data.targetCampaignId,
            priority: data.priority,
            isPinned: data.isPinned === true,
            status: data.status,
            startsAt: data.startsAt,
            expiresAt: data.expiresAt,
            creatorId: data.creatorId,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });
        callback(notices);
      },
      (err) => {
        console.warn('[GamaaAdmin] listenToAllNotices notice:', err);
      }
    );
  }

  /**
   * Listen to active/scheduled candidate notices for display banner
   */
  public static listenToActiveNotices(callback: (notices: GlobalNotice[]) => void): Unsubscribe {
    if (!auth.currentUser) {
      callback([]);
      return () => {};
    }

    const q = query(
      collection(db, 'global_notices'),
      where('status', '==', 'active'),
      limit(20)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const notices: GlobalNotice[] = [];
        snapshot.docs.forEach((d) => {
          const data = d.data();
          notices.push({
            id: d.id,
            title: data.title,
            message: data.message,
            scope: data.scope,
            targetSection: data.targetSection,
            targetCampaignId: data.targetCampaignId,
            priority: data.priority,
            isPinned: data.isPinned === true,
            status: data.status,
            startsAt: data.startsAt,
            expiresAt: data.expiresAt,
            creatorId: data.creatorId,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });
        callback(notices);
      },
      (err) => {
        console.warn('[GamaaAdmin] listenToActiveNotices error:', err);
      }
    );
  }

  /**
   * Safe time check: returns true if notice schedule is currently active
   */
  public static isNoticeActiveNow(notice: GlobalNotice, referenceTime: number = Date.now()): boolean {
    if (notice.status === 'archived' || notice.status === 'draft') return false;

    const startMs = notice.startsAt?.toMillis
      ? notice.startsAt.toMillis()
      : notice.startsAt?.seconds
      ? notice.startsAt.seconds * 1000
      : new Date(notice.startsAt).getTime();

    const expireMs = notice.expiresAt?.toMillis
      ? notice.expiresAt.toMillis()
      : notice.expiresAt?.seconds
      ? notice.expiresAt.seconds * 1000
      : new Date(notice.expiresAt).getTime();

    if (isNaN(startMs) || isNaN(expireMs)) return false;
    return referenceTime >= startMs && referenceTime <= expireMs;
  }

  /**
   * Filter notices matching current active section
   */
  public static filterNoticesForScope(notices: GlobalNotice[], currentSection: string): GlobalNotice[] {
    return notices.filter((n) => {
      if (n.scope === 'app_wide') return true;
      if (n.scope === 'gamaa') return currentSection === 'gamaa';
      if (n.scope === 'section') return n.targetSection === currentSection;
      return false;
    });
  }

  /**
   * Deterministic sorting: Urgent > High > Normal, Pinned > Unpinned, StartsAt desc
   */
  public static sortNoticesByPriority(notices: GlobalNotice[]): GlobalNotice[] {
    const priorityWeight: Record<NoticePriority, number> = {
      urgent: 3,
      high: 2,
      normal: 1,
    };

    return [...notices].sort((a, b) => {
      // 1. Priority rank
      const weightDiff = (priorityWeight[b.priority] || 1) - (priorityWeight[a.priority] || 1);
      if (weightDiff !== 0) return weightDiff;

      // 2. Pin status
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }

      // 3. Newest startsAt first
      const aStart = a.startsAt?.seconds || 0;
      const bStart = b.startsAt?.seconds || 0;
      return bStart - aStart;
    });
  }
}
