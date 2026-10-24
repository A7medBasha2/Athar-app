import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  X,
  RefreshCw,
  Flag,
  Flame,
  Users,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Play,
  Pause,
  Archive,
  CheckSquare,
  MessageSquare,
  ExternalLink,
  Shield,
  Layers,
  Bell,
  Plus,
  Calendar,
  Pin,
  Sparkles,
} from 'lucide-react';
import {
  GamaaAdminService,
  CommunityReport,
  AdminRoleStatus,
  ModeratorRecord,
  GlobalNotice,
  NoticeScope,
  NoticePriority,
  NoticeStatus,
} from '../../services/gamaaAdminService';
import {
  CommunityCampaign,
  CommunityCampaignService,
  DHIKR_PRESET_DETAILS,
  VALID_DHIKR_PRESETS,
} from '../../services/communityCampaignService';
import { GamaaCommunityService } from '../../services/gamaaCommunityService';
import { GamaaPost } from '../../types';
import { formatArabicTimeAgo } from './GamaaPostCard';

interface GamaaAdminConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserUid: string;
}

type AdminTab = 'moderation' | 'campaigns' | 'notices' | 'team';

export const GamaaAdminConsoleModal: React.FC<GamaaAdminConsoleModalProps> = ({
  isOpen,
  onClose,
  currentUserUid,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('moderation');
  const [roleStatus, setRoleStatus] = useState<AdminRoleStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Tab 1: Moderation state
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [recentPosts, setRecentPosts] = useState<GamaaPost[]>([]);
  const [moderationSubTab, setModerationSubTab] = useState<'reports' | 'posts'>('reports');

  // Tab 2: Campaigns state
  const [campaigns, setCampaigns] = useState<CommunityCampaign[]>([]);
  const [pendingCampaigns, setPendingCampaigns] = useState<any[]>([]);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Tab 3: Team state
  const [teamData, setTeamData] = useState<{ owners: string[]; moderators: ModeratorRecord[] }>({
    owners: [],
    moderators: [],
  });

  // Tab 4: Notices state
  const [notices, setNotices] = useState<GlobalNotice[]>([]);
  const [isNoticeFormOpen, setIsNoticeFormOpen] = useState<boolean>(false);
  const [noticeFormData, setNoticeFormData] = useState<{
    id?: string;
    title: string;
    message: string;
    scope: NoticeScope;
    targetSection: string;
    targetCampaignId: string;
    priority: NoticePriority;
    isPinned: boolean;
    status: NoticeStatus;
    startsAt: string;
    expiresAt: string;
  }>({
    title: '',
    message: '',
    scope: 'app_wide',
    targetSection: 'home',
    targetCampaignId: '',
    priority: 'normal',
    isPinned: false,
    status: 'active',
    startsAt: new Date().toISOString().slice(0, 16),
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
  });
  const [isSubmittingNotice, setIsSubmittingNotice] = useState<boolean>(false);

  // Tab 2: New Campaign Form State
  const [isCreatingCampaign, setIsCreatingCampaign] = useState<boolean>(false);
  const [newCampaignTitle, setNewCampaignTitle] = useState<string>('');
  const [newCampaignDescription, setNewCampaignDescription] = useState<string>('');
  const [newCampaignTarget, setNewCampaignTarget] = useState<number>(10000);
  const [newCampaignDhikr, setNewCampaignDhikr] = useState<string>('subhanallah_wabihamdih');
  const [isSubmittingCampaign, setIsSubmittingCampaign] = useState<boolean>(false);

  // Destructive Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: async () => {},
  });

  useEffect(() => {
    if (!isOpen) return;
    initAdminData();
  }, [isOpen, currentUserUid]);

  const initAdminData = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const status = await GamaaAdminService.getAdminStatus(currentUserUid);
      setRoleStatus(status);

      if (status.isOwner || status.isModerator || status.isAdmin) {
        await Promise.allSettled([
          loadReports(),
          loadRecentPosts(),
          loadCampaignsData(Boolean(status.isOwner || status.isAdmin)),
          loadTeamData(),
          loadNoticesData(),
        ]);
      }
    } catch (err: any) {
      console.warn('[AdminConsole] Non-fatal init error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = newCampaignTitle.trim();
    const trimmedDesc = newCampaignDescription.trim();

    if (!trimmedTitle || trimmedTitle.length < 3) {
      setFeedback({
        message: 'يرجى إدخال عنوان حملة صالح (3 أحرف على الأقل)',
        type: 'error',
      });
      return;
    }

    if (!trimmedDesc || trimmedDesc.length < 5) {
      setFeedback({
        message: 'يرجى إدخال وصف للحملة لا يقل عن 5 أحرف',
        type: 'error',
      });
      return;
    }

    if (newCampaignTarget < 100) {
      setFeedback({
        message: 'الحد الأدنى لهدف الحملة هو 100 ذكر',
        type: 'error',
      });
      return;
    }

    setIsSubmittingCampaign(true);
    setFeedback(null);

    try {
      const campId = await CommunityCampaignService.createCampaign({
        title: trimmedTitle,
        description: trimmedDesc,
        targetDhikrPreset: newCampaignDhikr,
        totalTarget: newCampaignTarget,
        isOfficial: true,
        creatorId: currentUserUid,
        status: 'active',
      });

      const newCampObj: CommunityCampaign = {
        id: campId,
        title: trimmedTitle,
        description: trimmedDesc,
        totalTarget: newCampaignTarget,
        currentCount: 0,
        targetDhikrPreset: newCampaignDhikr,
        isOfficial: true,
        status: 'active',
        creatorId: currentUserUid,
        createdAt: new Date().toISOString(),
        expiresAt: null,
      };

      setCampaigns((prev) => [newCampObj, ...prev]);
      setIsCreatingCampaign(false);
      setNewCampaignTitle('');
      setNewCampaignDescription('');
      setNewCampaignTarget(10000);
      setNewCampaignDhikr('subhanallah_wabihamdih');
      setFeedback({
        message: 'تم إطلاق حملة التسبيح المباركة بنجاح!',
        type: 'success',
      });
    } catch (err: any) {
      console.error('[AdminConsole] Create campaign error:', err);
      setFeedback({
        message: err?.message || 'تعذر إنشاء الحملة حالياً. تحقق من الاتصال.',
        type: 'error',
      });
    } finally {
      setIsSubmittingCampaign(false);
    }
  };

  const loadReports = async () => {
    // Single fetch or listener can be used. We'll use subscription for live updates
    const unsub = GamaaAdminService.listenToReports(
      (list) => {
        setReports(list);
      },
      (err) => console.warn('[AdminConsole] Reports error:', err)
    );
    return unsub;
  };

  const loadRecentPosts = async () => {
    try {
      const posts = await GamaaCommunityService.fetchLatestPosts(30);
      setRecentPosts(posts);
    } catch (err) {
      console.warn('[AdminConsole] Recent posts error:', err);
    }
  };

  const loadCampaignsData = async (isOwner: boolean) => {
    try {
      const [allCamps, unactivated] = await Promise.all([
        GamaaAdminService.fetchAllCampaigns(),
        CommunityCampaignService.getUnactivatedCampaigns(currentUserUid, isOwner),
      ]);
      setCampaigns(allCamps);
      setPendingCampaigns(unactivated);
    } catch (err) {
      console.warn('[AdminConsole] Campaigns error:', err);
    }
  };

  const loadTeamData = async () => {
    try {
      const data = await GamaaAdminService.fetchTeamMembers();
      setTeamData(data);
    } catch (err) {
      console.warn('[AdminConsole] Team error:', err);
    }
  };

  const loadNoticesData = () => {
    const unsub = GamaaAdminService.listenToAllNotices((noticesList) => {
      setNotices(noticesList);
    });
    return unsub;
  };

  const resetNoticeForm = () => {
    setNoticeFormData({
      title: '',
      message: '',
      scope: 'app_wide',
      targetSection: 'home',
      targetCampaignId: '',
      priority: 'normal',
      isPinned: false,
      status: 'active',
      startsAt: new Date().toISOString().slice(0, 16),
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
    });
  };

  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleStatus?.isOwner && !roleStatus?.isAdmin && !roleStatus?.isModerator) {
      setFeedback({
        message: 'إنشاء وتعديل التنبيهات العامة محصور بالمشرفين وإدارة النظام فقط',
        type: 'error',
      });
      return;
    }

    const trimmedMsg = noticeFormData.message.trim();
    if (trimmedMsg.length < 3 || trimmedMsg.length > 300) {
      setFeedback({
        message: 'يجب أن يكون نص التنبيه بين 3 و 300 حرف',
        type: 'error',
      });
      return;
    }

    const startDate = new Date(noticeFormData.startsAt);
    const expireDate = new Date(noticeFormData.expiresAt);
    if (isNaN(startDate.getTime()) || isNaN(expireDate.getTime())) {
      setFeedback({
        message: 'التواريخ المدخلة غير صحيحة',
        type: 'error',
      });
      return;
    }

    if (expireDate.getTime() <= startDate.getTime()) {
      setFeedback({
        message: 'تاريخ الانتهاء يجب أن يكون لاحقاً لتاريخ البدء',
        type: 'error',
      });
      return;
    }

    setIsSubmittingNotice(true);
    setFeedback(null);
    try {
      if (noticeFormData.id) {
        await GamaaAdminService.updateNotice(noticeFormData.id, {
          title: noticeFormData.title.trim() || undefined,
          message: trimmedMsg,
          scope: noticeFormData.scope,
          targetSection: noticeFormData.scope === 'section' ? noticeFormData.targetSection : undefined,
          targetCampaignId: noticeFormData.targetCampaignId.trim() || undefined,
          priority: noticeFormData.priority,
          isPinned: noticeFormData.isPinned,
          status: noticeFormData.status,
          startsAt: startDate,
          expiresAt: expireDate,
        });
        setFeedback({ message: 'تم تحديث التنبيه بنجاح', type: 'success' });
      } else {
        await GamaaAdminService.createNotice({
          title: noticeFormData.title.trim() || undefined,
          message: trimmedMsg,
          scope: noticeFormData.scope,
          targetSection: noticeFormData.scope === 'section' ? noticeFormData.targetSection : undefined,
          targetCampaignId: noticeFormData.targetCampaignId.trim() || undefined,
          priority: noticeFormData.priority,
          isPinned: noticeFormData.isPinned,
          status: noticeFormData.status,
          startsAt: startDate,
          expiresAt: expireDate,
        });
        setFeedback({ message: 'تم إنشاء ونشر التنبيه بنجاح', type: 'success' });
      }

      setIsNoticeFormOpen(false);
      resetNoticeForm();
    } catch (err: any) {
      console.error('[AdminConsole] Notice save failed:', err);
      setFeedback({
        message: `تعذر حفظ التنبيه: ${err.message || 'خطأ غير متوقع'}`,
        type: 'error',
      });
    } finally {
      setIsSubmittingNotice(false);
    }
  };

  const handleToggleNoticeStatus = async (notice: GlobalNotice) => {
    if (!roleStatus?.isOwner) return;
    const nextStatus: NoticeStatus = notice.status === 'active' ? 'draft' : 'active';
    try {
      await GamaaAdminService.updateNotice(notice.id, { status: nextStatus });
      setFeedback({
        message: `تم تحويل حالة التنبيه إلى (${nextStatus === 'active' ? 'نشط' : 'مسودة'})`,
        type: 'success',
      });
    } catch (err: any) {
      setFeedback({ message: `فشل تغيير حالة التنبيه: ${err.message}`, type: 'error' });
    }
  };

  const handleArchiveNotice = async (noticeId: string) => {
    if (!roleStatus?.isOwner) return;
    try {
      await GamaaAdminService.updateNotice(noticeId, { status: 'archived' });
      setFeedback({ message: 'تمت أرشفة التنبيه بنجاح', type: 'success' });
    } catch (err: any) {
      setFeedback({ message: `فشل أرشفة التنبيه: ${err.message}`, type: 'error' });
    }
  };

  const handleDeleteNotice = (notice: GlobalNotice) => {
    if (!roleStatus?.isOwner) return;
    setConfirmDialog({
      isOpen: true,
      title: 'تأكيد حذف التنبيه نهائياً',
      description: `هل أنت متأكد من حذف هذا التنبيه؟ لن يظهر لأي مستخدم بعد الآن.\n\n"${notice.message.substring(0, 100)}..."`,
      onConfirm: async () => {
        try {
          await GamaaAdminService.deleteNotice(notice.id);
          setFeedback({ message: 'تم حذف التنبيه نهائياً بنجاح', type: 'success' });
        } catch (err: any) {
          setFeedback({ message: `فشل حذف التنبيه: ${err.message}`, type: 'error' });
        }
      },
    });
  };

  // Safe delete post handler with 2-step verification
  const triggerDeletePost = (postId: string, contentSnippet?: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'تأكيد حذف المنشور',
      description: `هل أنت متأكد من حذف هذه المشاركة بشكل نهائي؟ لن يمكن التراجع عن هذا الإجراء.\n${
        contentSnippet ? `«${contentSnippet.substring(0, 80)}...»` : ''
      }`,
      onConfirm: async () => {
        setActionInProgressId(postId);
        try {
          await GamaaCommunityService.deletePost(postId);
          setRecentPosts((prev) => prev.filter((p) => p.id !== postId));
          setFeedback({
            message: 'تم حذف المشاركة المخالفة بنجاح',
            type: 'success',
          });
        } catch (err: any) {
          console.error('[AdminConsole] Post delete failed:', err);
          setFeedback({
            message: `فشل حذف المشاركة: ${err.message || 'خطأ في الصلاحيات'}`,
            type: 'error',
          });
        } finally {
          setActionInProgressId(null);
        }
      },
    });
  };

  // Safe delete comment handler
  const triggerDeleteComment = (postId: string, commentId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'تأكيد حذف التعليق',
      description: 'هل أنت متأكد من حذف هذا التعليق نهائياً؟',
      onConfirm: async () => {
        setActionInProgressId(commentId);
        try {
          await GamaaCommunityService.deleteComment(postId, commentId);
          setFeedback({
            message: 'تم حذف التعليق بنجاح',
            type: 'success',
          });
        } catch (err: any) {
          console.error('[AdminConsole] Comment delete failed:', err);
          setFeedback({
            message: `فشل حذف التعليق: ${err.message || 'خطأ في الصلاحيات'}`,
            type: 'error',
          });
        } finally {
          setActionInProgressId(null);
        }
      },
    });
  };

  // Handle report resolution
  const handleResolveReport = async (report: CommunityReport, action: 'resolve_and_delete' | 'dismiss') => {
    setActionInProgressId(report.id);
    setFeedback(null);

    try {
      if (action === 'resolve_and_delete') {
        if (report.targetType === 'post') {
          await GamaaCommunityService.deletePost(report.targetId);
        } else {
          await GamaaCommunityService.deleteComment(report.postId, report.targetId);
        }
        await GamaaAdminService.updateReportStatus(report.id, 'resolved');
        setFeedback({
          message: 'تم حذف المحتوى المخالف وتعيين البلاغ كمكتمل',
          type: 'success',
        });
      } else {
        await GamaaAdminService.updateReportStatus(report.id, 'dismissed');
        setFeedback({
          message: 'تم حفظ البلاغ كغير مخالف (مرفوض)',
          type: 'success',
        });
      }
    } catch (err: any) {
      console.error('[AdminConsole] Report resolution error:', err);
      setFeedback({
        message: `تعذر إكمال الإجراء: ${err.message || 'تحقق من الصلاحيات'}`,
        type: 'error',
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  // Handle campaign status change
  const handleCampaignStatusChange = async (
    campaignId: string,
    newStatus: 'active' | 'paused' | 'completed' | 'archived'
  ) => {
    setActionInProgressId(campaignId);
    setFeedback(null);
    try {
      await GamaaAdminService.updateCampaignStatus(campaignId, newStatus);
      setFeedback({
        message: `تم تحديث حالة الحملة إلى (${getStatusLabel(newStatus)}) بنجاح`,
        type: 'success',
      });
      await loadCampaignsData(roleStatus?.isOwner || false);
    } catch (err: any) {
      console.error('[AdminConsole] Campaign status change failed:', err);
      setFeedback({
        message: `فشل تحديث الحملة: ${err.message || 'غير مسموح بهذا الانتقال في قواعد الأمان'}`,
        type: 'error',
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  // Handle retry activation for unactivated campaigns
  const handleRetryActivation = async (campaignId: string) => {
    setActionInProgressId(campaignId);
    setFeedback(null);
    try {
      await CommunityCampaignService.retryActivation(campaignId);
      setFeedback({
        message: 'تم تفعيل الحملة بنجاح والتحقق من الشظايا العشر',
        type: 'success',
      });
      await loadCampaignsData(roleStatus?.isOwner || false);
    } catch (err: any) {
      console.error('[AdminConsole] Retry activation failed:', err);
      setFeedback({
        message: `فشل تفعيل الحملة: ${err.message || 'خطأ في التحقق من الشظايا'}`,
        type: 'error',
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'نشطة';
      case 'paused':
        return 'موقوفة مؤقتاً';
      case 'completed':
        return 'مكتملة';
      case 'archived':
        return 'مؤرشفة';
      case 'initializing':
        return 'قيد التهيئة';
      case 'shards_verified':
        return 'تم فحص الشظايا';
      default:
        return status;
    }
  };

  if (!isOpen) return null;

  const pendingReportsCount = reports.filter((r) => r.status === 'pending').length;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex flex-col justify-between overflow-hidden animate-fadeIn"
      dir="rtl"
    >
      {/* 1. Modal Top Bar */}
      <header className="px-4 py-3.5 border-b border-[#C8A24A]/30 bg-[#0E0C09]/95 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 shadow-md shadow-amber-900/30 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-[#141009] rounded-[14px] flex items-center justify-center text-amber-400">
              <ShieldCheck size={20} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white">لوحة إدارة جَمَاعَة</h2>
              {roleStatus?.isOwner ? (
                <span className="text-[10px] font-extrabold text-[#FFE294] bg-[#2A1E0E] px-2 py-0.5 rounded-full border border-[#D4AF37]/40">
                  مالك النظام (Owner)
                </span>
              ) : roleStatus?.isModerator ? (
                <span className="text-[10px] font-bold text-amber-300 bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-500/40">
                  مشرف معتمد (Moderator)
                </span>
              ) : (
                <span className="text-[10px] text-red-400 bg-red-950/40 px-2 py-0.5 rounded-full">
                  غير مصرح
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#A69E89]">صون المحتوى وضمان الاستمرارية الإيمانية</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={initAdminData}
            disabled={loading}
            aria-label="تحديث البيانات"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#17140D] border border-[#C8A24A]/30 text-[#C4B998] hover:text-[#E6C66E] transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-[#E6C66E]' : ''} />
          </button>
          <button
            onClick={onClose}
            aria-label="إغلاق اللوحة"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#17140D] border border-[#C8A24A]/30 text-[#C4B998] hover:text-[#E6C66E] transition-all cursor-pointer active:scale-95"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* 2. Feedback Notification Toast */}
      {feedback && (
        <div
          className={`px-4 py-2.5 mx-4 mt-2 rounded-2xl border text-xs flex items-center gap-2.5 shadow-lg ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle size={15} className="shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle size={15} className="shrink-0 text-rose-400" />
          )}
          <span className="flex-1 font-medium leading-relaxed">{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-[10px] text-white/60 hover:text-white"
          >
            إخفاء
          </button>
        </div>
      )}

      {/* 3. Navigation Tab Bar */}
      <div className="px-4 pt-2 border-b border-[#C8A24A]/20 bg-[#0E0C09] flex items-center gap-2 shrink-0 overflow-x-auto">
        <button
          onClick={() => setActiveTab('moderation')}
          className={`min-h-[44px] px-4 py-2 border-b-2 font-bold text-xs flex items-center gap-2 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
            activeTab === 'moderation'
              ? 'border-[#E6C66E] text-[#FFE294]'
              : 'border-transparent text-[#9E9478] hover:text-white'
          }`}
        >
          <Flag size={15} />
          <span>إشراف المحتوى</span>
          {pendingReportsCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-black font-extrabold">
              {pendingReportsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('campaigns')}
          className={`min-h-[44px] px-4 py-2 border-b-2 font-bold text-xs flex items-center gap-2 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
            activeTab === 'campaigns'
              ? 'border-[#E6C66E] text-[#FFE294]'
              : 'border-transparent text-[#9E9478] hover:text-white'
          }`}
        >
          <Flame size={15} />
          <span>إدارة الحملات</span>
          {pendingCampaigns.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40">
              {pendingCampaigns.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('notices')}
          className={`min-h-[44px] px-4 py-2 border-b-2 font-bold text-xs flex items-center gap-2 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
            activeTab === 'notices'
              ? 'border-[#E6C66E] text-[#FFE294]'
              : 'border-transparent text-[#9E9478] hover:text-white'
          }`}
        >
          <Bell size={15} />
          <span>التنبيهات العامة</span>
          {notices.filter((n) => n.status === 'active').length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#C8A24A] text-black font-extrabold">
              {notices.filter((n) => n.status === 'active').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`min-h-[44px] px-4 py-2 border-b-2 font-bold text-xs flex items-center gap-2 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
            activeTab === 'team'
              ? 'border-[#E6C66E] text-[#FFE294]'
              : 'border-transparent text-[#9E9478] hover:text-white'
          }`}
        >
          <Users size={15} />
          <span>الصلاحيات وفريق العمل</span>
        </button>
      </div>

      {/* 4. Tab Content Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 max-w-3xl mx-auto w-full">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-[#C4B998]">
            <RefreshCw className="animate-spin text-[#E6C66E]" size={28} />
            <span className="text-xs">جارٍ التحقق من الصلاحيات وجلب البيانات...</span>
          </div>
        ) : !roleStatus?.isOwner && !roleStatus?.isModerator ? (
          <div className="athar-card text-center py-12 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-red-950/50 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto">
              <Shield size={24} />
            </div>
            <h3 className="text-base font-extrabold text-white">الوصول مقيّد</h3>
            <p className="text-xs text-[#A69E89] max-w-sm mx-auto leading-relaxed">
              هذه اللوحة مخصصة فقط لمالك النظام والمشرفين المعتمدين في وثيقة الصلاحيات السحابية. حسابك الحالي لا يمتلك إذن المشرف.
            </p>
          </div>
        ) : activeTab === 'moderation' ? (
          /* TAB 1: MODERATION & REPORTS */
          <div className="space-y-3">
            {/* Sub-tab pills */}
            <div className="flex items-center gap-2 p-1 rounded-2xl bg-[#14120D] border border-[#C8A24A]/20">
              <button
                onClick={() => setModerationSubTab('reports')}
                className={`flex-1 min-h-[40px] py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  moderationSubTab === 'reports'
                    ? 'bg-[#E6C66E] text-black shadow-md'
                    : 'text-[#A69E89] hover:text-white'
                }`}
              >
                طابور البلاغات ({reports.length})
              </button>
              <button
                onClick={() => setModerationSubTab('posts')}
                className={`flex-1 min-h-[40px] py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  moderationSubTab === 'posts'
                    ? 'bg-[#E6C66E] text-black shadow-md'
                    : 'text-[#A69E89] hover:text-white'
                }`}
              >
                المشاركات الحديثة ({recentPosts.length})
              </button>
            </div>

            {/* Reports List */}
            {moderationSubTab === 'reports' ? (
              reports.length === 0 ? (
                <div className="athar-card text-center py-12 space-y-2">
                  <CheckCircle size={32} className="text-emerald-400 mx-auto" />
                  <h4 className="text-sm font-bold text-white">طابور البلاغات فارغ تماماً</h4>
                  <p className="text-xs text-[#8E8672]">
                    الحمد لله، لم يتم تسجيل أي بلاغات جديدة ضد محتوى جماعة
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className="athar-card text-right space-y-3 bg-[#120F0A] border border-[#C8A24A]/25 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              report.targetType === 'post'
                                ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                                : 'bg-blue-950/60 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {report.targetType === 'post' ? 'بلاغ مشاركة' : 'بلاغ تعليق'}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              report.status === 'pending'
                                ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30 animate-pulse'
                                : report.status === 'resolved'
                                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                                : 'bg-gray-800 text-gray-300'
                            }`}
                          >
                            {report.status === 'pending'
                              ? 'قيد الانتظار'
                              : report.status === 'resolved'
                              ? 'تم الحذف والإغلاق'
                              : 'مرفوض'}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#8E8672]">
                          {formatArabicTimeAgo(report.createdAt)}
                        </span>
                      </div>

                      {/* Snippet / Content Preview */}
                      {report.snippet && (
                        <div className="p-2.5 rounded-xl bg-[#191610] border border-[#C8A24A]/15 text-xs text-[#EAE2C8] leading-relaxed italic">
                          «{report.snippet}»
                        </div>
                      )}

                      {/* Reason & Details */}
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-2 text-[#E6C66E]">
                          <span className="font-bold">السبب:</span>
                          <span>
                            {report.reason === 'inappropriate'
                              ? 'محتوى غير لائق أو مخالف'
                              : report.reason === 'offensive'
                              ? 'إساءة أو تنمر'
                              : report.reason === 'spam'
                              ? 'إعلانات متكررة'
                              : 'سبب آخر'}
                          </span>
                        </div>
                        {report.details && (
                          <p className="text-[11px] text-[#A69E89]">
                            توضيح المبلغ: {report.details}
                          </p>
                        )}
                      </div>

                      {/* Actions for Pending Reports */}
                      {report.status === 'pending' && (
                        <div className="flex items-center gap-2 pt-2 border-t border-[#C8A24A]/15 flex-wrap">
                          <button
                            disabled={actionInProgressId === report.id}
                            onClick={() => handleResolveReport(report, 'resolve_and_delete')}
                            className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs font-bold hover:bg-red-900 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Trash2 size={13} />
                            <span>حذف المحتوى المخالف</span>
                          </button>

                          <button
                            disabled={actionInProgressId === report.id}
                            onClick={() => handleResolveReport(report, 'dismiss')}
                            className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-[#1C1810] border border-[#C8A24A]/30 text-xs text-[#C4B998] hover:text-white transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <CheckSquare size={13} />
                            <span>تجاهل البلاغ (المحتوى سليم)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Recent Posts Stream with direct delete */
              <div className="space-y-3">
                {recentPosts.map((post) => (
                  <div
                    key={post.id}
                    className="athar-card text-right p-4 bg-[#120F0A] border border-[#C8A24A]/25 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#1D1912] border border-[#C8A24A]/40 flex items-center justify-center text-xs text-[#E6C66E] font-bold overflow-hidden">
                          {post.authorPhoto ? (
                            <img src={post.authorPhoto} alt="" className="w-full h-full object-cover" />
                          ) : (
                            post.authorName.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{post.authorName}</div>
                          <div className="text-[10px] text-[#8E8672]">
                            {formatArabicTimeAgo(post.createdAt)}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => triggerDeletePost(post.id, post.content)}
                        disabled={actionInProgressId === post.id}
                        className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-red-400 hover:bg-red-950/40 border border-transparent hover:border-red-500/30 transition-all cursor-pointer"
                        title="حذف هذا المنشور كإجراء إشرافي"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <p className="text-xs text-[#EAE2C8] leading-relaxed line-clamp-3">
                      {post.content}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-[#8E8672] pt-1 border-t border-[#C8A24A]/10">
                      <span>التعليقات: {post.commentsCount || 0}</span>
                      <span>
                        التفاعلات:{' '}
                        {(post.reactionsCount?.jazakallah || 0) +
                          (post.reactionsCount?.barakallah || 0) +
                          (post.reactionsCount?.ameen || 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'campaigns' ? (
          /* TAB 2: CAMPAIGN OVERSIGHT & RECOVERY */
          <div className="space-y-4">
            {/* Create Campaign Header & Form Button */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#14120D] border border-[#C8A24A]/25">
              <div className="space-y-0.5 text-right">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Flame size={14} className="text-[#E6C66E]" />
                  <span>إطلاق حملة تسبيح جديدة</span>
                </h4>
                <p className="text-[11px] text-[#A69E89]">
                  أنشئ حملة تسبيح مجتمعية رسمية يتشارك فيها جميع مستخدمي التطبيق
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCreatingCampaign((prev) => !prev)}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isCreatingCampaign
                    ? 'bg-white/10 text-white hover:bg-white/15'
                    : 'bg-gradient-to-l from-[#E6B76B] via-[#D4AF37] to-[#C69C2E] text-black shadow-md hover:brightness-105'
                }`}
              >
                {isCreatingCampaign ? (
                  <>
                    <X size={14} />
                    <span>إلغاء</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    <span>حملة جديدة</span>
                  </>
                )}
              </button>
            </div>

            {/* Collapsible New Campaign Form */}
            {isCreatingCampaign && (
              <form
                onSubmit={handleCreateCampaign}
                className="athar-card p-4 bg-[#14100A] border border-[#E6C66E]/40 space-y-3.5 text-right animate-fadeIn"
              >
                <div className="flex items-center justify-between border-b border-[#C8A24A]/20 pb-2">
                  <h4 className="text-xs font-bold text-[#FFE294] flex items-center gap-1.5">
                    <Sparkles size={14} />
                    <span>بيانات حملة التسبيح المباركة</span>
                  </h4>
                  <span className="text-[10px] text-[#C4B998]">تضاف للمجتمع فوراً</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#E6C66E]">
                    عنوان الحملة <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newCampaignTitle}
                    onChange={(e) => setNewCampaignTitle(e.target.value)}
                    placeholder="مثال: حملة المليون صلاة على الحبيب ﷺ"
                    className="w-full min-h-[42px] px-3 rounded-xl bg-[#0C0B08] border border-[#C8A24A]/30 text-white text-xs placeholder-[#736B58] focus:outline-none focus:border-[#E6C66E]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#E6C66E]">
                    وصف الحملة ونواياها <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={newCampaignDescription}
                    onChange={(e) => setNewCampaignDescription(e.target.value)}
                    placeholder="مثال: معاً في رحاب الأجر لنيل شفاعة النبي وتفريج الكروب عبر تكاتف جماعة المسلمين..."
                    className="w-full p-2.5 rounded-xl bg-[#0C0B08] border border-[#C8A24A]/30 text-white text-xs placeholder-[#736B58] focus:outline-none focus:border-[#E6C66E]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#E6C66E]">نوع الذكر المبارك</label>
                    <select
                      value={newCampaignDhikr}
                      onChange={(e) => setNewCampaignDhikr(e.target.value)}
                      className="w-full min-h-[42px] px-3 rounded-xl bg-[#0C0B08] border border-[#C8A24A]/30 text-white text-xs focus:outline-none focus:border-[#E6C66E] cursor-pointer"
                    >
                      {VALID_DHIKR_PRESETS.map((presetKey) => (
                        <option key={presetKey} value={presetKey} className="bg-[#14120D] text-white">
                          {DHIKR_PRESET_DETAILS[presetKey]?.label || presetKey}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#E6C66E]">
                      العدد المستهدف <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      min={100}
                      step={100}
                      required
                      value={newCampaignTarget}
                      onChange={(e) => setNewCampaignTarget(Math.max(100, Number(e.target.value) || 100))}
                      className="w-full min-h-[42px] px-3 rounded-xl bg-[#0C0B08] border border-[#C8A24A]/30 text-white text-xs focus:outline-none focus:border-[#E6C66E]"
                    />
                  </div>
                </div>

                {/* Quick Target Pills */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-[#8E8672]">أهداف سريعة:</span>
                  {[5000, 10000, 50000, 100000, 1000000].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewCampaignTarget(t)}
                      className={`text-[10.5px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                        newCampaignTarget === t
                          ? 'bg-[#E6C66E] text-black border-[#E6C66E] font-bold'
                          : 'bg-[#1C1811] text-[#C4B998] border-[#C8A24A]/25 hover:border-[#E6C66E]'
                      }`}
                    >
                      {t.toLocaleString('ar-EG')}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#C8A24A]/15">
                  <button
                    type="button"
                    onClick={() => setIsCreatingCampaign(false)}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs text-[#A69E89] hover:text-white cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCampaign}
                    className="min-h-[42px] px-5 py-2 rounded-xl bg-gradient-to-l from-[#E6B76B] via-[#D4AF37] to-[#C69C2E] text-black font-extrabold text-xs shadow-md hover:brightness-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingCampaign ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>جارٍ إطلاق الحملة...</span>
                      </>
                    ) : (
                      <>
                        <Flame size={14} />
                        <span>إطلاق الحملة المباركة</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Pending Unactivated Campaigns (if any) */}
            {pendingCampaigns.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <AlertTriangle size={15} />
                  <span>حملات معلقة قيد التهيئة (تتطلب استئناف التفعيل):</span>
                </div>
                <div className="space-y-2">
                  {pendingCampaigns.map((camp) => (
                    <div
                      key={camp.id}
                      className="p-3.5 rounded-2xl bg-[#1B140B] border border-amber-500/40 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-200">{camp.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/30">
                          {camp.status === 'shards_verified' ? 'تم فحص الشظايا' : 'قيد التهيئة'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#C4B998]">{camp.description}</p>
                      <div className="flex items-center justify-between pt-2 border-t border-amber-500/20">
                        <span className="text-[10px] text-[#A69E89]">
                          الهدف: {Number(camp.totalTarget || 0).toLocaleString()} ذكر
                        </span>
                        <button
                          disabled={actionInProgressId === camp.id}
                          onClick={() => handleRetryActivation(camp.id)}
                          className="min-h-[44px] px-4 py-1.5 rounded-xl bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw
                            size={13}
                            className={actionInProgressId === camp.id ? 'animate-spin' : ''}
                          />
                          <span>استئناف وتفعيل</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Campaigns List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#E6C66E]">
                  جميع حملات التسبيح المسجلة ({campaigns.length})
                </h3>
                <span className="text-[11px] text-[#8E8672]">
                  تخضع لمنظومة الشظايا العشر المتزامنة
                </span>
              </div>

              {campaigns.length === 0 ? (
                <div className="athar-card text-center py-10 text-xs text-[#8E8672]">
                  لا توجد حملات مسجلة حالياً
                </div>
              ) : (
                campaigns.map((camp) => (
                  <div
                    key={camp.id}
                    className="athar-card p-4 bg-[#120F0A] border border-[#C8A24A]/25 space-y-3 text-right"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              camp.isOfficial
                                ? 'bg-[#C8A24A]/20 text-[#FFE294] border border-[#D4AF37]/40'
                                : 'bg-white/10 text-white/80'
                            }`}
                          >
                            {camp.isOfficial ? 'حملة رسمية' : 'حملة مجتمعية'}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              camp.status === 'active'
                                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                                : camp.status === 'paused'
                                ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                                : 'bg-gray-800 text-gray-300'
                            }`}
                          >
                            {getStatusLabel(camp.status)}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white">{camp.title}</h4>
                      </div>

                      <span className="text-[11px] font-mono text-[#D6B36A]">
                        {Number(camp.totalTarget || 0).toLocaleString()} ذكر
                      </span>
                    </div>

                    <p className="text-xs text-[#A69E89] line-clamp-2">{camp.description}</p>

                    {/* Admin Status Transitions (Safe and guarded) */}
                    {roleStatus?.isOwner && (
                      <div className="flex items-center gap-2 pt-2 border-t border-[#C8A24A]/15 flex-wrap">
                        {camp.status === 'active' && (
                          <button
                            disabled={actionInProgressId === camp.id}
                            onClick={() => handleCampaignStatusChange(camp.id, 'paused')}
                            className="min-h-[44px] px-3 py-1.5 rounded-xl bg-[#20180B] border border-amber-500/30 text-amber-300 text-xs font-bold hover:bg-amber-900/40 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Pause size={13} />
                            <span>إيقاف مؤقت</span>
                          </button>
                        )}

                        {camp.status === 'paused' && (
                          <button
                            disabled={actionInProgressId === camp.id}
                            onClick={() => handleCampaignStatusChange(camp.id, 'active')}
                            className="min-h-[44px] px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-emerald-900/40 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Play size={13} />
                            <span>استئناف الحملة</span>
                          </button>
                        )}

                        {(camp.status === 'active' || camp.status === 'paused') && (
                          <>
                            <button
                              disabled={actionInProgressId === camp.id}
                              onClick={() => handleCampaignStatusChange(camp.id, 'completed')}
                              className="min-h-[44px] px-3 py-1.5 rounded-xl bg-[#1A1610] border border-[#C8A24A]/30 text-xs text-[#C4B998] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle size={13} />
                              <span>إنهاء الحملة</span>
                            </button>

                            <button
                              disabled={actionInProgressId === camp.id}
                              onClick={() => handleCampaignStatusChange(camp.id, 'archived')}
                              className="min-h-[44px] px-3 py-1.5 rounded-xl bg-[#17140D] border border-gray-700 text-xs text-gray-400 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <Archive size={13} />
                              <span>أرشفة</span>
                            </button>
                          </>
                        )}

                        {camp.status === 'archived' && (
                          <button
                            disabled={actionInProgressId === camp.id}
                            onClick={() => {
                              setConfirmDialog({
                                isOpen: true,
                                title: 'تأكيد حذف الحملة المؤرشفة',
                                description: 'هل أنت متأكد من حذف هذه الحملة المؤرشفة تماماً من قاعدة البيانات؟',
                                onConfirm: async () => {
                                  await GamaaAdminService.deleteArchivedCampaign(camp.id);
                                  await loadCampaignsData(true);
                                },
                              });
                            }}
                            className="min-h-[44px] px-3 py-1.5 rounded-xl bg-red-950/60 border border-red-500/30 text-red-300 text-xs font-bold hover:bg-red-900/50 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 size={13} />
                            <span>حذف من الأرشيف</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : activeTab === 'notices' ? (
          /* TAB 4: GLOBAL IN-APP NOTICES & BANNERS */
          <div className="space-y-4">
            {/* Header / Actions */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Bell size={16} className="text-[#E6C66E]" />
                  <span>التنبيهات العامة والرسائل الموجهة</span>
                </h3>
                <p className="text-[11px] text-[#A69E89] mt-0.5">
                  بث الإعلانات والتنبيهات الموجهة للمستخدمين عبر شاشات التطبيق
                </p>
              </div>

              {roleStatus?.isOwner ? (
                <button
                  type="button"
                  onClick={() => {
                    resetNoticeForm();
                    setIsNoticeFormOpen(true);
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#AA820A] text-black text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-amber-950/40 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus size={16} />
                  <span>إنشاء تنبيه جديد</span>
                </button>
              ) : (
                <span className="text-[10px] text-amber-400 bg-amber-950/40 px-2.5 py-1.5 rounded-xl border border-amber-500/30">
                  عرض للقراءة فقط (الصلاحية للمالك)
                </span>
              )}
            </div>

            {/* Creation / Edit Form Modal */}
            {isNoticeFormOpen && (
              <div className="p-4 rounded-2xl bg-[#15120B] border border-[#C8A24A]/40 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-[#C8A24A]/20">
                  <h4 className="text-xs font-extrabold text-[#FFE294] flex items-center gap-1.5">
                    <Plus size={14} />
                    <span>{noticeFormData.id ? 'تعديل التنبيه' : 'إنشاء تنبيه جديد'}</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNoticeFormOpen(false);
                      resetNoticeForm();
                    }}
                    className="text-[#9E9478] hover:text-white p-1"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleSaveNotice} className="space-y-3">
                  {/* Title (optional) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#C4B998] block">
                      عنوان التنبيه (اختياري، حتى 60 حرفاً)
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      value={noticeFormData.title}
                      onChange={(e) => setNoticeFormData({ ...noticeFormData, title: e.target.value })}
                      placeholder="مثال: تنبيه هام • حملة إيمانية"
                      className="w-full px-3 py-2 rounded-xl bg-[#0E0C08] border border-[#C8A24A]/30 text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-[#E6C66E]"
                    />
                  </div>

                  {/* Message (required, 3-300 chars) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <label className="font-bold text-[#C4B998]">
                        نص الرسالة <span className="text-amber-400">*</span>
                      </label>
                      <span className="text-[10px] text-gray-500">
                        {noticeFormData.message.length}/300 حرف
                      </span>
                    </div>
                    <textarea
                      required
                      minLength={3}
                      maxLength={300}
                      rows={3}
                      value={noticeFormData.message}
                      onChange={(e) => setNoticeFormData({ ...noticeFormData, message: e.target.value })}
                      placeholder="اكتب نص الإعلان التوجيهي بدقة ووضوح..."
                      className="w-full px-3 py-2 rounded-xl bg-[#0E0C08] border border-[#C8A24A]/30 text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-[#E6C66E] resize-none"
                    />
                  </div>

                  {/* Scope & Target Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#C4B998] block">
                        نطاق الظهور
                      </label>
                      <select
                        value={noticeFormData.scope}
                        onChange={(e) => setNoticeFormData({ ...noticeFormData, scope: e.target.value as NoticeScope })}
                        className="w-full px-3 py-2 rounded-xl bg-[#0E0C08] border border-[#C8A24A]/30 text-white text-xs focus:outline-none focus:border-[#E6C66E]"
                      >
                        <option value="app_wide">كامل التطبيق (عام)</option>
                        <option value="gamaa">قسم جماعة فقط</option>
                        <option value="section">قسم محدد من التطبيق</option>
                      </select>
                    </div>

                    {noticeFormData.scope === 'section' && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-[#C4B998] block">
                          القسم المستهدف
                        </label>
                        <select
                          value={noticeFormData.targetSection}
                          onChange={(e) => setNoticeFormData({ ...noticeFormData, targetSection: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-[#0E0C08] border border-[#C8A24A]/30 text-white text-xs focus:outline-none focus:border-[#E6C66E]"
                        >
                          <option value="home">الرئيسية</option>
                          <option value="prayers">مواقيت الصلاة</option>
                          <option value="quran">المصحف والتلاوة</option>
                          <option value="adhkar">الأذكار والتحصين</option>
                          <option value="stories">قصص القرآن</option>
                          <option value="companion">الرفيق الإيماني</option>
                          <option value="explore">الاستكشاف</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Optional Target Campaign ID & Priority */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#C4B998] block">
                        ربط بحملة تسبيح (اختياري)
                      </label>
                      <select
                        value={noticeFormData.targetCampaignId}
                        onChange={(e) => setNoticeFormData({ ...noticeFormData, targetCampaignId: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#0E0C08] border border-[#C8A24A]/30 text-white text-xs focus:outline-none focus:border-[#E6C66E]"
                      >
                        <option value="">بدون ربط بحملة</option>
                        {campaigns.map((camp) => (
                          <option key={camp.id} value={camp.id}>
                            {camp.title} ({getStatusLabel(camp.status)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#C4B998] block">
                        الأولوية
                      </label>
                      <select
                        value={noticeFormData.priority}
                        onChange={(e) => setNoticeFormData({ ...noticeFormData, priority: e.target.value as NoticePriority })}
                        className="w-full px-3 py-2 rounded-xl bg-[#0E0C08] border border-[#C8A24A]/30 text-white text-xs focus:outline-none focus:border-[#E6C66E]"
                      >
                        <option value="normal">عادي (Normal)</option>
                        <option value="high">مهم (High)</option>
                        <option value="urgent">هام وعاجل (Urgent)</option>
                      </select>
                    </div>
                  </div>

                  {/* Pin & Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="isPinnedCheck"
                        checked={noticeFormData.isPinned}
                        onChange={(e) => setNoticeFormData({ ...noticeFormData, isPinned: e.target.checked })}
                        className="w-4 h-4 rounded border-[#C8A24A]/40 accent-[#D4AF37]"
                      />
                      <label htmlFor="isPinnedCheck" className="text-xs font-bold text-[#C4B998] cursor-pointer">
                        تثبيت التنبيه في أعلى القائمة
                      </label>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#C4B998] block">
                        حالة التنبيه
                      </label>
                      <select
                        value={noticeFormData.status}
                        onChange={(e) => setNoticeFormData({ ...noticeFormData, status: e.target.value as NoticeStatus })}
                        className="w-full px-3 py-2 rounded-xl bg-[#0E0C08] border border-[#C8A24A]/30 text-white text-xs focus:outline-none focus:border-[#E6C66E]"
                      >
                        <option value="active">نشط ومباشر (Active)</option>
                        <option value="draft">مسودة مؤقتة (Draft)</option>
                        <option value="scheduled">مجدول بوقت لاحق (Scheduled)</option>
                      </select>
                    </div>
                  </div>

                  {/* Start & End Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#C4B998] block">
                        وقت بدء الظهور
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={noticeFormData.startsAt}
                        onChange={(e) => setNoticeFormData({ ...noticeFormData, startsAt: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#0E0C08] border border-[#C8A24A]/30 text-white text-xs focus:outline-none focus:border-[#E6C66E]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#C4B998] block">
                        وقت انتهاء الصلاحية
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={noticeFormData.expiresAt}
                        onChange={(e) => setNoticeFormData({ ...noticeFormData, expiresAt: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#0E0C08] border border-[#C8A24A]/30 text-white text-xs focus:outline-none focus:border-[#E6C66E]"
                      />
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#C8A24A]/20">
                    <button
                      type="button"
                      onClick={() => {
                        setIsNoticeFormOpen(false);
                        resetNoticeForm();
                      }}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1C1810] border border-[#C8A24A]/30 text-xs font-bold text-[#C4B998] hover:text-white"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingNotice}
                      className="min-h-[44px] px-5 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#AA820A] text-black text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-amber-950/40 hover:brightness-110 active:scale-95 transition-all"
                    >
                      {isSubmittingNotice ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>جاري الحفظ...</span>
                        </>
                      ) : (
                        <span>{noticeFormData.id ? 'حفظ التعديلات' : 'نشر التنبيه'}</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Notices List */}
            <div className="space-y-2.5">
              {notices.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#15120B] border border-[#C8A24A]/20 text-center space-y-2">
                  <Bell size={28} className="mx-auto text-[#C8A24A]/40" />
                  <p className="text-xs text-[#A69E89]">لا توجد تنبيهات عامة مسجلة في النظام حالياً</p>
                </div>
              ) : (
                notices.map((notice) => {
                  const isLive = GamaaAdminService.isNoticeActiveNow(notice);
                  return (
                    <div
                      key={notice.id}
                      className={`p-3.5 rounded-2xl bg-[#17130A] border transition-all space-y-2.5 ${
                        notice.status === 'active' && isLive
                          ? 'border-[#C8A24A]/50 shadow-[0_4px_20px_rgba(200,162,74,0.12)]'
                          : notice.status === 'archived'
                          ? 'border-gray-800 opacity-60'
                          : 'border-[#C8A24A]/20'
                      }`}
                    >
                      {/* Notice Top Meta */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              notice.status === 'active' && isLive
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                                : notice.status === 'active' && !isLive
                                ? 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                                : notice.status === 'archived'
                                ? 'bg-gray-900 text-gray-400'
                                : 'bg-blue-950/80 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {notice.status === 'active' && isLive
                              ? 'نشط حالياً'
                              : notice.status === 'active' && !isLive
                              ? 'نشط (خارج الجدول)'
                              : notice.status === 'archived'
                              ? 'مؤرشف'
                              : 'مسودة'}
                          </span>

                          <span className="text-[10px] text-[#C4B998] font-bold">
                            {notice.scope === 'app_wide'
                              ? 'عام (كامل التطبيق)'
                              : notice.scope === 'gamaa'
                              ? 'جماعة فقط'
                              : `قسم: ${notice.targetSection || 'مخصص'}`}
                          </span>

                          {notice.priority !== 'normal' && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                notice.priority === 'urgent'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                                  : 'bg-amber-950 text-amber-300'
                              }`}
                            >
                              {notice.priority === 'urgent' ? 'عاجل' : 'مهم'}
                            </span>
                          )}

                          {notice.isPinned && (
                            <span className="flex items-center text-[10px] text-[#E6C66E] gap-0.5">
                              <Pin size={10} />
                              <span>مثبت</span>
                            </span>
                          )}
                        </div>

                        {/* Owner Actions */}
                        {roleStatus?.isOwner && (
                          <div className="flex items-center gap-1.5">
                            {notice.status !== 'archived' && (
                              <button
                                type="button"
                                onClick={() => handleToggleNoticeStatus(notice)}
                                className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold transition-all ${
                                  notice.status === 'active'
                                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-950/70'
                                    : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/70'
                                }`}
                              >
                                {notice.status === 'active' ? 'إيقاف' : 'تفعيل'}
                              </button>
                            )}

                            {notice.status !== 'archived' && (
                              <button
                                type="button"
                                onClick={() => handleArchiveNotice(notice.id)}
                                className="text-[11px] px-2.5 py-1 rounded-lg bg-[#241E12] border border-[#C8A24A]/30 text-[#C4B998] hover:text-white"
                                title="أرشفة"
                              >
                                <Archive size={12} />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteNotice(notice)}
                              className="text-[11px] p-1.5 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 hover:bg-red-900/60 transition-all"
                              title="حذف نهائي"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div>
                        {notice.title && (
                          <h4 className="text-xs font-bold text-[#FFE294] mb-0.5">
                            {notice.title}
                          </h4>
                        )}
                        <p className="text-xs text-[#EAE2D0] leading-relaxed break-words">
                          {notice.message}
                        </p>
                      </div>

                      {/* Linked Campaign Info */}
                      {notice.targetCampaignId && (
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-400/90 bg-amber-950/20 px-2 py-1 rounded-lg border border-amber-500/20 w-fit">
                          <Flame size={12} />
                          <span>مرتبط بحملة تسبيح: {notice.targetCampaignId}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* TAB 3: TEAM & SYSTEM ROLES */
          <div className="space-y-4">
            {/* System Owners */}
            <div className="athar-card p-4 space-y-3 bg-[#120F0A] border border-[#C8A24A]/25">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#E6C66E]" />
                <h3 className="text-sm font-extrabold text-white">
                  مالكو النظام المعتمدون (System Owners)
                </h3>
              </div>
              <p className="text-xs text-[#A69E89] leading-relaxed">
                يتم التحقق من مالكي النظام حصرياً عبر الوثيقة السحابية المؤمنة{' '}
                <code className="text-[#FFE294] font-mono">/system_config/roles</code>. يملك المالك كامل صلاحيات الإشراف، إدارة الحملات، وتعيين المشرفين.
              </p>
              <div className="space-y-1.5 pt-1">
                {teamData.owners.length === 0 ? (
                  <div className="text-xs text-gray-400">لا يوجد مالكون مسجلون في الوثيقة حالياً</div>
                ) : (
                  teamData.owners.map((uid, idx) => (
                    <div
                      key={uid}
                      className="p-2.5 rounded-xl bg-[#1A1610] border border-[#C8A24A]/20 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#E6C66E] text-black font-extrabold text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-mono text-white text-[11px]">{uid}</span>
                      </div>
                      {uid === currentUserUid && (
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          حسابك الحالي
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Appointed Moderators */}
            <div className="athar-card p-4 space-y-3 bg-[#120F0A] border border-[#C8A24A]/25">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-[#E6C66E]" />
                <h3 className="text-sm font-extrabold text-white">
                  فريق المشرفين المعتمدين (Moderators)
                </h3>
              </div>
              <p className="text-xs text-[#A69E89] leading-relaxed">
                يتم إدارة المشرفين عبر مسار{' '}
                <code className="text-[#FFE294] font-mono">/moderators/{'{modUid}'}</code>. يُشترط أن تكون الحالة نشطة (<code className="text-emerald-400">active: true</code>) مع تحديد مصفوفة الصلاحيات الممنوحة.
              </p>

              <div className="space-y-2 pt-1">
                {teamData.moderators.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#17140D] text-center text-xs text-[#8E8672]">
                    لا يوجد مشرفون معينون في مجموعة المشرفين حالياً
                  </div>
                ) : (
                  teamData.moderators.map((mod) => (
                    <div
                      key={mod.uid}
                      className="p-3 rounded-xl bg-[#1A1610] border border-[#C8A24A]/20 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] text-white">{mod.uid}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            mod.active
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {mod.active ? 'نشط' : 'معطل'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-[#C4B998]">
                        <span className="font-bold text-[#E6C66E]">الصلاحيات:</span>
                        {mod.permissions.length === 0 ? (
                          <span className="text-gray-400">لا توجد صلاحيات ممنوحة</span>
                        ) : (
                          mod.permissions.map((p) => (
                            <span
                              key={p}
                              className="px-2 py-0.5 rounded-lg bg-[#241D12] border border-[#C8A24A]/30 text-amber-200 font-mono"
                            >
                              {p}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Architecture note */}
            <div className="p-3.5 rounded-2xl bg-[#16120B] border border-[#C8A24A]/20 text-[11px] text-[#A69E89] leading-relaxed">
              <span className="font-bold text-[#E6C66E]">ملاحظة أمنية معمارية:</span> تماشياً مع سياسة الأمان الصفرية (Zero-Trust Security)، لا يتم منح أو تعديل صلاحيات المالك عبر واجهة العميل لتفادي أي ثغرات تصعيد، وإنما يتم تعيينها حصرياً بواسطة مالك النظام من خلال قواعد Firestore الموثوقة.
            </div>
          </div>
        )}
      </main>

      {/* 5. Safe Destructive Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-[#120F0A] border border-red-500/40 rounded-3xl p-5 space-y-4 text-right text-white shadow-2xl">
            <div className="flex items-center gap-2.5 text-red-400">
              <AlertTriangle size={20} />
              <h4 className="text-sm font-extrabold">{confirmDialog.title}</h4>
            </div>
            <p className="text-xs text-[#C4B998] whitespace-pre-line leading-relaxed">
              {confirmDialog.description}
            </p>
            <div className="flex items-center gap-2 pt-2 border-t border-red-500/20">
              <button
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="flex-1 min-h-[44px] py-2 rounded-xl bg-[#1C1810] border border-[#C8A24A]/30 text-xs font-bold text-[#C4B998] hover:text-white"
              >
                إلغاء
              </button>
              <button
                onClick={async () => {
                  setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
                  await confirmDialog.onConfirm();
                }}
                className="flex-1 min-h-[44px] py-2 rounded-xl bg-red-600 text-white text-xs font-extrabold hover:bg-red-500 transition-all flex items-center justify-center gap-1 shadow-lg shadow-red-900/40"
              >
                <Trash2 size={14} />
                <span>نعم، حذف نهائي</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
