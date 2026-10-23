import { supabase } from '../lib/supabaseClient';
import { AuthService } from './authService';
import { SupabaseGamaaService } from './supabaseGamaaService';

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

export interface ModeratorRecord {
  id: string;
  userId: string;
  displayName: string;
  email?: string;
  role: 'admin' | 'moderator';
  assignedAt: any;
}

export interface AdminRoleStatus {
  state: 'idle' | 'checking' | 'loading' | 'success' | 'denied' | 'error';
  isAdmin?: boolean;
  isModerator: boolean;
  isOwner: boolean;
  canDeletePosts?: boolean;
  permissions?: string[];
  role?: 'member' | 'moderator' | 'admin';
  error?: string;
  errorDetail?: string | null;
  errorCode?: string | null;
}

export class GamaaAdminService {
  /**
   * Check if a UID is in ownerUids doc data (supporting array, map, and trimmed whitespace)
   */
  public static isUidInOwnerData(docData: any, uid: string): boolean {
    if (!docData || !uid || !uid.trim()) return false;
    const cleanUid = uid.trim();
    if (Array.isArray(docData.ownerUids)) {
      return docData.ownerUids.some((u: any) => String(u).trim() === cleanUid);
    }
    if (docData.ownerUids && typeof docData.ownerUids === 'object') {
      return Boolean(docData.ownerUids[cleanUid]);
    }
    return false;
  }

  /**
   * Evaluate if a notice is currently active within its scheduled window
   */
  public static isNoticeActiveNow(notice: any, nowMs: number = Date.now()): boolean {
    if (!notice || notice.status !== 'active') return false;
    const getMs = (t: any) => {
      if (!t) return null;
      if (typeof t === 'number') return t;
      if (typeof t.toMillis === 'function') return t.toMillis();
      if (typeof t.seconds === 'number') return t.seconds * 1000;
      const parsed = new Date(t).getTime();
      return isNaN(parsed) ? null : parsed;
    };
    const startMs = getMs(notice.startsAt);
    const expireMs = getMs(notice.expiresAt);
    if (startMs !== null && nowMs < startMs) return false;
    if (expireMs !== null && nowMs > expireMs) return false;
    return true;
  }

  /**
   * Filter notices by UI scope (home, gamaa, or specific section)
   */
  public static filterNoticesForScope(notices: GlobalNotice[], currentSection: string): GlobalNotice[] {
    if (!Array.isArray(notices)) return [];
    return notices.filter((n) => {
      if (n.scope === 'app_wide') return true;
      if (n.scope === 'gamaa' && (currentSection === 'gamaa' || currentSection === 'community')) return true;
      if (n.scope === 'section' && n.targetSection === currentSection) return true;
      return false;
    });
  }

  /**
   * Check the admin / moderator status for a given user from Supabase `profiles` table
   */
  public static async checkAdminStatus(uid: string): Promise<AdminRoleStatus> {
    if (!uid) {
      return {
        state: 'denied',
        isModerator: false,
        isOwner: false,
        role: 'member',
        permissions: [],
      };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', uid)
        .maybeSingle();

      if (error) {
        return {
          state: 'error',
          isModerator: false,
          isOwner: false,
          error: error.message,
          permissions: [],
        };
      }

      const role = data?.role || 'member';
      const isAdmin = role === 'admin';
      const isModerator = role === 'moderator' || isAdmin;
      const isOwner = isAdmin;

      return {
        state: 'success',
        isAdmin,
        isModerator,
        isOwner,
        role,
        canDeletePosts: isModerator,
        permissions: isOwner
          ? ['manage_roles', 'delete_any_post', 'moderate_content', 'publish_notices', 'manage_campaigns']
          : isModerator
          ? ['delete_any_post', 'moderate_content', 'publish_notices']
          : [],
      };
    } catch (err: any) {
      return {
        state: 'error',
        isModerator: false,
        isOwner: false,
        error: err.message,
        permissions: [],
      };
    }
  }

  /**
   * Real-time listener for user role / permissions
   */
  public static listenToAdminStatus(
    uid: string,
    callback: (status: AdminRoleStatus) => void
  ): () => void {
    let isCancelled = false;

    const check = async () => {
      const status = await this.checkAdminStatus(uid);
      if (!isCancelled) callback(status);
    };

    check();

    const channel = supabase
      .channel(`profile_role:${uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` },
        () => check()
      )
      .subscribe();

    return () => {
      isCancelled = true;
      supabase.removeChannel(channel);
    };
  }

  /**
   * Create a community report in Supabase
   */
  public static async createReport(params: {
    targetType: ReportTargetType;
    targetId: string;
    postId: string;
    reason: ReportReason;
    details?: string;
    snippet?: string;
  }): Promise<string> {
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('يجب تسجيل الدخول للإبلاغ');

    const { data, error } = await supabase
      .from('reports')
      .insert({
        target_type: params.targetType,
        target_id: params.targetId,
        post_id: params.postId,
        reporter_id: user.uid,
        reason: params.reason,
        details: params.details || '',
        snippet: params.snippet || '',
        status: 'pending',
      })
      .select('id')
      .single();

    if (error || !data) throw new Error(error?.message || 'فشل إرسال البلاغ');
    return data.id;
  }

  /**
   * Alias for createReport
   */
  public static async submitReport(params: {
    targetType: ReportTargetType;
    targetId: string;
    postId: string;
    reason: ReportReason;
    details?: string;
    snippet?: string;
  }): Promise<string> {
    return this.createReport(params);
  }

  /**
   * Fetch reports with status filter from Supabase
   */
  public static async getReports(status?: ReportStatus): Promise<CommunityReport[]> {
    try {
      let query = supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error || !data) return [];

      return data.map((r: any) => ({
        id: r.id,
        targetType: r.target_type as ReportTargetType,
        targetId: r.target_id,
        postId: r.post_id,
        reporterId: r.reporter_id,
        reason: r.reason as ReportReason,
        details: r.details,
        snippet: r.snippet,
        status: r.status as ReportStatus,
        createdAt: r.created_at,
        resolvedAt: r.resolved_at,
        resolvedBy: r.resolved_by,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Real-time listener for community reports
   */
  public static listenToReports(
    callback: (reports: CommunityReport[]) => void,
    _onError?: (err: any) => void
  ): () => void {
    const fetchReports = async () => {
      const list = await this.getReports();
      callback(list);
    };

    fetchReports();
    const channel = supabase
      .channel('public:reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        fetchReports();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Resolve or dismiss a report in Supabase
   */
  public static async updateReportStatus(
    reportId: string,
    status: ReportStatus,
    resolvedBy?: string
  ): Promise<void> {
    const user = AuthService.getCurrentUser();
    const resolver = resolvedBy || user?.uid || 'admin';

    await supabase
      .from('reports')
      .update({
        status,
        resolved_at: new Date().toISOString(),
        resolved_by: resolver,
      })
      .eq('id', reportId);
  }

  /**
   * Delete reported post or comment directly
   */
  public static async deleteReportedContent(
    targetType: ReportTargetType,
    targetId: string,
    postId?: string
  ): Promise<void> {
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('يجب تسجيل الدخول');

    if (targetType === 'post') {
      await SupabaseGamaaService.deletePost(targetId);
    } else if (targetType === 'comment' && postId) {
      await SupabaseGamaaService.deleteComment(postId, targetId);
    }
  }

  /**
   * Create a global or targeted system notice in Supabase
   */
  public static async createNotice(params: {
    title?: string;
    message: string;
    scope: NoticeScope;
    targetSection?: string;
    targetCampaignId?: string;
    priority?: NoticePriority;
    isPinned?: boolean;
    status?: NoticeStatus;
    expiresAt?: Date | null;
  }): Promise<string> {
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('يجب تسجيل الدخول');

    const { data, error } = await supabase
      .from('system_notices')
      .insert({
        title: params.title || '',
        message: params.message.trim(),
        scope: params.scope,
        target_section: params.targetSection || '',
        target_campaign_id: params.targetCampaignId || '',
        priority: params.priority || 'normal',
        is_pinned: params.isPinned || false,
        status: params.status || 'active',
        creator_id: user.uid,
        starts_at: new Date().toISOString(),
        expires_at: params.expiresAt ? params.expiresAt.toISOString() : null,
      })
      .select('id')
      .single();

    if (error || !data) throw new Error(error?.message || 'فشل إنشاء الإعلان');
    return data.id;
  }

  /**
   * Fetch active notices
   */
  public static async getActiveNotices(
    scope?: NoticeScope,
    targetSection?: string
  ): Promise<GlobalNotice[]> {
    try {
      let query = supabase
        .from('system_notices')
        .select('*')
        .eq('status', 'active')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (scope) {
        query = query.eq('scope', scope);
      }
      if (targetSection) {
        query = query.eq('target_section', targetSection);
      }

      const { data, error } = await query;
      if (error || !data) return [];

      return data.map((d: any) => ({
        id: d.id,
        title: d.title,
        message: d.message,
        scope: d.scope as NoticeScope,
        targetSection: d.target_section,
        targetCampaignId: d.target_campaign_id,
        priority: d.priority as NoticePriority,
        isPinned: d.is_pinned,
        status: d.status as NoticeStatus,
        startsAt: d.starts_at,
        expiresAt: d.expires_at,
        creatorId: d.creator_id,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Update a system notice
   */
  public static async updateNotice(
    noticeId: string,
    updates: Partial<GlobalNotice>
  ): Promise<void> {
    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.message !== undefined) payload.message = updates.message;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.isPinned !== undefined) payload.is_pinned = updates.isPinned;
    if (updates.priority !== undefined) payload.priority = updates.priority;

    await supabase.from('system_notices').update(payload).eq('id', noticeId);
  }

  /**
   * Delete a notice
   */
  public static async deleteNotice(noticeId: string): Promise<void> {
    await supabase.from('system_notices').delete().eq('id', noticeId);
  }

  /**
   * Subscribe to active notices in real-time
   */
  public static subscribeToActiveNotices(
    callback: (notices: GlobalNotice[]) => void,
    scope?: NoticeScope,
    targetSection?: string
  ): () => void {
    let isCancelled = false;

    const refresh = async () => {
      const notices = await this.getActiveNotices(scope, targetSection);
      if (!isCancelled) callback(notices);
    };

    refresh();

    const channel = supabase
      .channel('public:system_notices')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_notices' },
        () => refresh()
      )
      .subscribe();

    return () => {
      isCancelled = true;
      supabase.removeChannel(channel);
    };
  }

  /**
   * Listen to active notices (alias for GlobalNoticeBanner)
   */
  public static listenToActiveNotices(
    callback: (notices: GlobalNotice[]) => void,
    scope?: NoticeScope,
    targetSection?: string
  ): () => void {
    return this.subscribeToActiveNotices(callback, scope, targetSection);
  }

  /**
   * Listen to all notices in real-time
   */
  public static listenToAllNotices(callback: (notices: GlobalNotice[]) => void): () => void {
    const fetchNotices = async () => {
      const { data } = await supabase
        .from('system_notices')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) {
        callback(
          data.map((d: any) => ({
            id: d.id,
            title: d.title,
            message: d.message,
            scope: d.scope,
            targetSection: d.target_section,
            targetCampaignId: d.target_campaign_id,
            priority: d.priority,
            isPinned: d.is_pinned,
            status: d.status,
            startsAt: d.starts_at,
            expiresAt: d.expires_at,
            creatorId: d.creator_id,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }))
        );
      }
    };

    fetchNotices();
    const channel = supabase
      .channel('public:all_system_notices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_notices' }, () => {
        fetchNotices();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Fetch all campaigns for Admin console
   */
  public static async fetchAllCampaigns(): Promise<any[]> {
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    return (data || []).map((c: any) => ({
      id: c.id,
      $id: c.id,
      title: c.title,
      targetCount: Number(c.target_count) || 1000,
      currentCount: Number(c.current_count) || 0,
      dhikrType: c.dhikr_type || 'subhanallah',
      creatorId: c.creator_id || '',
      creatorName: c.creator_name || '',
      status: c.status || 'active',
      description: c.description || '',
      createdAt: c.created_at,
    }));
  }

  /**
   * Update campaign status
   */
  public static async updateCampaignStatus(
    campaignId: string,
    status: 'active' | 'paused' | 'completed' | 'archived'
  ): Promise<void> {
    await supabase
      .from('campaigns')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', campaignId);
  }

  /**
   * Delete an archived campaign
   */
  public static async deleteArchivedCampaign(campaignId: string): Promise<void> {
    await supabase.from('campaigns').delete().eq('id', campaignId);
  }

  /**
   * Fetch team members with admin/moderator roles
   */
  public static async fetchTeamMembers(): Promise<ModeratorRecord[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, email, role, created_at')
      .in('role', ['admin', 'moderator']);

    if (error || !data) return [];
    return data.map((d: any) => ({
      id: d.id,
      userId: d.id,
      displayName: d.display_name || 'مشرف',
      email: d.email || '',
      role: d.role as 'admin' | 'moderator',
      assignedAt: d.created_at,
    }));
  }
}
