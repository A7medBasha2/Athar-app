import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Lock,
  Globe,
  Plus,
  Send,
  MessageSquare,
  Trash2,
  Check,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  LogOut,
  Flame,
  Shield,
  Flag,
} from 'lucide-react';
import {
  CommunityGroup,
  CommunityGroupMember,
  CommunityGroupPost,
  GamaaReactionType,
  GamaaComment,
} from '../../types';
import { GamaaGroupsService } from '../../services/gamaaGroupsService';
import { formatArabicTimeAgo } from './GamaaPostCard';

interface GamaaGroupDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  currentUserUid: string;
  isSystemOwner?: boolean;
  userProfile?: { displayName?: string; photoURL?: string; level?: number };
  onReportPost?: (postId: string, snippet: string) => void;
}

export const GamaaGroupDetailModal: React.FC<GamaaGroupDetailModalProps> = ({
  isOpen,
  onClose,
  groupId,
  currentUserUid,
  isSystemOwner = false,
  userProfile,
  onReportPost,
}) => {
  const [group, setGroup] = useState<CommunityGroup | null>(null);
  const [membership, setMembership] = useState<CommunityGroupMember | null>(null);
  const [members, setMembers] = useState<CommunityGroupMember[]>([]);
  const [posts, setPosts] = useState<CommunityGroupPost[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'feed' | 'members' | 'requests'>('feed');

  // New post composer state
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  // Active post comments state
  const [selectedPostForComments, setSelectedPostForComments] = useState<CommunityGroupPost | null>(null);
  const [comments, setComments] = useState<GamaaComment[]>([]);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Feedback toast
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!isOpen || !groupId) return;
    loadGroupData();

    // Subscribe to group posts
    const unsubPosts = GamaaGroupsService.listenToGroupPosts(groupId, (p) => setPosts(p));

    // Subscribe to group members
    const unsubMembers = GamaaGroupsService.listenToGroupMembers(groupId, (m) => setMembers(m));

    return () => {
      unsubPosts();
      unsubMembers();
    };
  }, [isOpen, groupId, currentUserUid]);

  // Subscribe to comments when a post is opened
  useEffect(() => {
    if (!selectedPostForComments) {
      setComments([]);
      return;
    }
    const unsub = GamaaGroupsService.listenToGroupComments(
      groupId,
      selectedPostForComments.id,
      (c) => setComments(c)
    );
    return () => unsub();
  }, [selectedPostForComments?.id, groupId]);

  const loadGroupData = async () => {
    const mem = await GamaaGroupsService.getUserMembership(groupId, currentUserUid);
    setMembership(mem);
  };

  if (!isOpen) return null;

  const isCreator = membership?.role === 'admin' || isSystemOwner;
  const isActiveMember = membership?.status === 'active';
  const isPending = membership?.status === 'pending';
  const pendingMembers = members.filter((m) => m.status === 'pending');
  const activeMembers = members.filter((m) => m.status === 'active');

  const handleJoin = async () => {
    try {
      await GamaaGroupsService.joinPublicGroup(groupId, userProfile);
      setFeedback({ message: 'تم الانضمام للحلقة بنجاح ومرحباً بك!', type: 'success' });
      await loadGroupData();
    } catch (err: any) {
      setFeedback({ message: `تعذر الانضمام: ${err.message}`, type: 'error' });
    }
  };

  const handleRequestJoin = async () => {
    try {
      await GamaaGroupsService.requestJoinPrivateGroup(groupId, userProfile);
      setFeedback({ message: 'تم إرسال طلب الانضمام إلى مشرف الحلقة', type: 'success' });
      await loadGroupData();
    } catch (err: any) {
      setFeedback({ message: `تعذر إرسال الطلب: ${err.message}`, type: 'error' });
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('هل أنت متأكد من مغادرة هذه الحلقة؟')) return;
    try {
      await GamaaGroupsService.leaveGroup(groupId);
      setFeedback({ message: 'تمت مغادرة الحلقة بنجاح', type: 'success' });
      await loadGroupData();
    } catch (err: any) {
      setFeedback({ message: `تعذر المغادرة: ${err.message}`, type: 'error' });
    }
  };

  const handleApproveMember = async (memberUid: string) => {
    try {
      await GamaaGroupsService.approveMember(groupId, memberUid);
      setFeedback({ message: 'تم قبول العضو في الحلقة', type: 'success' });
    } catch (err: any) {
      setFeedback({ message: `تعذر القبول: ${err.message}`, type: 'error' });
    }
  };

  const handleRejectMember = async (memberUid: string) => {
    try {
      await GamaaGroupsService.removeMember(groupId, memberUid, false);
      setFeedback({ message: 'تم رفض طلب الانضمام', type: 'success' });
    } catch (err: any) {
      setFeedback({ message: `تعذر الرفض: ${err.message}`, type: 'error' });
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    setIsPosting(true);
    try {
      await GamaaGroupsService.createGroupPost(groupId, newPostContent, userProfile);
      setNewPostContent('');
      setFeedback({ message: 'تم نشر مشاركتك في الحلقة بنجاح', type: 'success' });
    } catch (err: any) {
      setFeedback({ message: `فشل النشر: ${err.message}`, type: 'error' });
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('هل تريد حذف هذه المشاركة؟')) return;
    try {
      await GamaaGroupsService.deleteGroupPost(groupId, postId);
      setFeedback({ message: 'تم حذف المشاركة بنجاح', type: 'success' });
    } catch (err: any) {
      setFeedback({ message: `تعذر الحذف: ${err.message}`, type: 'error' });
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPostForComments || !newCommentContent.trim()) return;

    setIsSubmittingComment(true);
    try {
      await GamaaGroupsService.createGroupComment(
        groupId,
        selectedPostForComments.id,
        newCommentContent,
        userProfile
      );
      setNewCommentContent('');
    } catch (err: any) {
      setFeedback({ message: `تعذر إرسال التعليق: ${err.message}`, type: 'error' });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleToggleReaction = async (post: CommunityGroupPost, type: GamaaReactionType) => {
    const isActivating = !post.userReactions?.[type];
    try {
      await GamaaGroupsService.toggleGroupPostReaction(groupId, post.id, type, isActivating);
    } catch (err: any) {
      console.warn('Reaction error:', err);
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex flex-col justify-between overflow-hidden animate-fadeIn"
    >
      {/* 1. Header */}
      <header className="px-4 py-3.5 border-b border-[#C8A24A]/30 bg-[#0E0C09]/95 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="p-2 rounded-xl bg-[#C8A24A]/15 text-[#E6C66E] shrink-0">
            <Users size={18} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-white truncate">
              {group?.name || 'تفاصيل الحلقة'}
            </h3>
            <div className="flex items-center gap-2 text-[10px] text-[#A69E89]">
              <span>{activeMembers.length} عضواً</span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                {group?.isPrivate ? (
                  <>
                    <Lock size={10} className="text-amber-400" />
                    <span className="text-amber-400">خاصة</span>
                  </>
                ) : (
                  <>
                    <Globe size={10} className="text-[#C8A24A]" />
                    <span>عامة</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isActiveMember && (
            <button
              type="button"
              onClick={handleLeaveGroup}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#17140D] border border-red-500/30 text-red-400 hover:bg-red-950/40"
              title="مغادرة الحلقة"
              aria-label="مغادرة الحلقة"
            >
              <LogOut size={16} />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#17140D] border border-[#C8A24A]/30 text-[#C4B998] hover:text-[#E6C66E]"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`px-4 py-2.5 mx-4 mt-2 rounded-2xl border text-xs flex items-center justify-between shadow-lg ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-[10px] text-white/60">
            إخفاء
          </button>
        </div>
      )}

      {/* 2. Sub Tabs (Feed, Members, Requests) */}
      {isActiveMember && (
        <div className="px-4 pt-2 border-b border-[#C8A24A]/20 bg-[#0E0C09] flex items-center gap-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('feed')}
            className={`min-h-[44px] px-4 py-2 border-b-2 font-bold text-xs flex items-center gap-2 ${
              activeSubTab === 'feed'
                ? 'border-[#E6C66E] text-[#FFE294]'
                : 'border-transparent text-[#9E9478] hover:text-white'
            }`}
          >
            <span>خلاصة الحلقة ({posts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('members')}
            className={`min-h-[44px] px-4 py-2 border-b-2 font-bold text-xs flex items-center gap-2 ${
              activeSubTab === 'members'
                ? 'border-[#E6C66E] text-[#FFE294]'
                : 'border-transparent text-[#9E9478] hover:text-white'
            }`}
          >
            <span>الأعضاء ({activeMembers.length})</span>
          </button>

          {isCreator && (
            <button
              type="button"
              onClick={() => setActiveSubTab('requests')}
              className={`min-h-[44px] px-4 py-2 border-b-2 font-bold text-xs flex items-center gap-2 ${
                activeSubTab === 'requests'
                  ? 'border-[#E6C66E] text-[#FFE294]'
                  : 'border-transparent text-[#9E9478] hover:text-white'
              }`}
            >
              <span>طلبات الانضمام</span>
              {pendingMembers.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-black font-extrabold">
                  {pendingMembers.length}
                </span>
              )}
            </button>
          )}
        </div>
      )}

      {/* 3. Main Content Container */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 max-w-xl mx-auto w-full">
        {/* State: Not a member */}
        {!isActiveMember ? (
          <div className="p-6 rounded-3xl bg-[#141009] border border-[#C8A24A]/30 text-center space-y-4 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-[#C8A24A]/10 border border-[#C8A24A]/30 flex items-center justify-center text-[#E6C66E] mx-auto">
              {group?.isPrivate ? <Lock size={26} /> : <Users size={26} />}
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-extrabold text-[#FFE294]">
                {group?.name || 'حلقة إيمانية'}
              </h4>
              <p className="text-xs text-[#C4B998] leading-relaxed">
                {group?.description || 'حلقة للمدارسة والتواصي على الطاعات والذكر'}
              </p>
            </div>

            {isPending ? (
              <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200">
                طلبك للانضمام قيد مراجعة مشرف الحلقة حالياً
              </div>
            ) : group?.isPrivate ? (
              <button
                type="button"
                onClick={handleRequestJoin}
                className="w-full min-h-[44px] py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#AA820A] text-black font-extrabold text-xs shadow-lg shadow-amber-950/40 hover:brightness-110 active:scale-95 transition-all"
              >
                طلب الانضمام للحلقة الخاصة
              </button>
            ) : (
              <button
                type="button"
                onClick={handleJoin}
                className="w-full min-h-[44px] py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#AA820A] text-black font-extrabold text-xs shadow-lg shadow-amber-950/40 hover:brightness-110 active:scale-95 transition-all"
              >
                انضمام للحلقة الآن
              </button>
            )}
          </div>
        ) : activeSubTab === 'feed' ? (
          /* TAB 1: GROUP FEED */
          <div className="space-y-4">
            {/* Post Composer */}
            <form
              onSubmit={handleCreatePost}
              className="p-3 rounded-2xl bg-[#141009] border border-[#C8A24A]/30 space-y-2.5 shadow-lg"
            >
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="شارك خاطرة أو فائدة مع إخوانك في الحلقة..."
                rows={2}
                maxLength={600}
                className="w-full px-3 py-2 rounded-xl bg-[#0B0906] border border-[#C8A24A]/20 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-[#E6C66E] resize-none"
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-gray-500">{newPostContent.length}/600</span>
                <button
                  type="submit"
                  disabled={isPosting || newPostContent.trim().length < 3}
                  className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#C8A24A] text-black font-extrabold text-xs flex items-center gap-1.5 hover:bg-[#D4AF37] disabled:opacity-40 transition-all"
                >
                  <Send size={13} />
                  <span>{isPosting ? 'جاري النشر...' : 'نشر بالمدارسة'}</span>
                </button>
              </div>
            </form>

            {/* Posts List */}
            {posts.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#120F0A] border border-[#C8A24A]/20 text-center space-y-2">
                <p className="text-xs text-[#A69E89]">لا توجد مشاركات في هذه الحلقة بعد. كن أول من يشارك بفائدة!</p>
              </div>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="p-3.5 rounded-2xl bg-[#141009] border border-[#C8A24A]/25 space-y-2.5 shadow-md"
                >
                  {/* Post Author Meta */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#241E12] border border-[#C8A24A]/40 flex items-center justify-center text-xs font-bold text-[#E6C66E]">
                        {post.authorName?.[0] || 'أ'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#F3E5AB]">{post.authorName}</div>
                        <div className="text-[10px] text-[#8E8672]">
                          {formatArabicTimeAgo(post.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {onReportPost && post.authorId !== currentUserUid && (
                        <button
                          type="button"
                          onClick={() => onReportPost(post.id, post.content)}
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center text-gray-500 hover:text-amber-400"
                          title="إبلاغ"
                        >
                          <Flag size={13} />
                        </button>
                      )}

                      {(post.authorId === currentUserUid || isCreator) && (
                        <button
                          type="button"
                          onClick={() => handleDeletePost(post.id)}
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center text-gray-500 hover:text-red-400"
                          title="حذف"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Post Content */}
                  <p className="text-xs text-[#EAE2D0] leading-relaxed whitespace-pre-line break-words">
                    {post.content}
                  </p>

                  {/* Actions (Reactions & Comments) */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#C8A24A]/15 text-xs text-[#C4B998]">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleReaction(post, 'jazakallah')}
                        className={`min-h-[36px] px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 ${
                          post.userReactions?.jazakallah
                            ? 'bg-[#E6C66E]/20 border-[#E6C66E] text-[#FFE294]'
                            : 'bg-[#1C1810] border-[#C8A24A]/20 hover:border-[#C8A24A]/40'
                        }`}
                      >
                        <span>جزاك الله خيراً</span>
                        {post.reactionsCount.jazakallah > 0 && (
                          <span className="text-[10px] text-[#E6C66E]">
                            ({post.reactionsCount.jazakallah})
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleReaction(post, 'barakallah')}
                        className={`min-h-[36px] px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 ${
                          post.userReactions?.barakallah
                            ? 'bg-[#E6C66E]/20 border-[#E6C66E] text-[#FFE294]'
                            : 'bg-[#1C1810] border-[#C8A24A]/20 hover:border-[#C8A24A]/40'
                        }`}
                      >
                        <span>بارك الله فيك</span>
                        {post.reactionsCount.barakallah > 0 && (
                          <span className="text-[10px] text-[#E6C66E]">
                            ({post.reactionsCount.barakallah})
                          </span>
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedPostForComments(post)}
                      className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[#1C1810] border border-[#C8A24A]/20 text-[11px] flex items-center gap-1 hover:text-white"
                    >
                      <MessageSquare size={13} />
                      <span>التعليقات ({post.commentsCount})</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : activeSubTab === 'members' ? (
          /* TAB 2: ACTIVE MEMBERS */
          <div className="space-y-2">
            {activeMembers.map((m) => (
              <div
                key={m.userId}
                className="p-3 rounded-2xl bg-[#141009] border border-[#C8A24A]/20 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#241E12] border border-[#C8A24A]/40 flex items-center justify-center text-xs font-bold text-[#E6C66E]">
                    {m.userName?.[0] || 'ع'}
                  </div>
                  <div>
                    <div className="font-bold text-white">{m.userName || 'عضو أثر'}</div>
                    <div className="text-[10px] text-[#8E8672]">
                      {m.role === 'admin' ? 'مؤسس / مشرف الحلقة' : 'عضو فعال'}
                    </div>
                  </div>
                </div>

                {isCreator && m.userId !== currentUserUid && (
                  <button
                    type="button"
                    onClick={() => handleRejectMember(m.userId)}
                    className="min-h-[36px] px-3 py-1 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-[10px]"
                  >
                    استبعاد
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* TAB 3: PENDING REQUESTS (CREATOR ONLY) */
          <div className="space-y-2">
            {pendingMembers.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#120F0A] border border-[#C8A24A]/20 text-center text-xs text-[#A69E89]">
                لا توجد طلبات انضمام معلقة حالياً
              </div>
            ) : (
              pendingMembers.map((m) => (
                <div
                  key={m.userId}
                  className="p-3 rounded-2xl bg-[#1B140B] border border-amber-500/30 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#241E12] border border-amber-500/40 flex items-center justify-center font-bold text-amber-200">
                      {m.userName?.[0] || 'ط'}
                    </div>
                    <div>
                      <div className="font-bold text-white">{m.userName || 'طالب انضمام'}</div>
                      <div className="text-[10px] text-amber-300">طلب انضمام جديد</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApproveMember(m.userId)}
                      className="min-h-[36px] px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-500"
                    >
                      قبول
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectMember(m.userId)}
                      className="min-h-[36px] px-3 py-1 rounded-lg bg-[#241E12] border border-red-500/30 text-red-400 text-[11px]"
                    >
                      رفض
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* 4. Group Post Comments Drawer/Modal */}
      {selectedPostForComments && (
        <div
          dir="rtl"
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex flex-col justify-end sm:justify-center p-0 sm:p-4 animate-fadeIn"
        >
          <div className="w-full max-w-lg mx-auto bg-[#120F0A] border-t sm:border border-[#C8A24A]/40 rounded-t-3xl sm:rounded-3xl p-4 space-y-3 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-[#C8A24A]/20 shrink-0">
              <h4 className="text-xs font-extrabold text-[#FFE294] flex items-center gap-1.5">
                <MessageSquare size={14} />
                <span>تعليقات المدارسة</span>
              </h4>
              <button
                type="button"
                onClick={() => setSelectedPostForComments(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#9E9478] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {comments.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#8E8672]">
                  لا توجد تعليقات بعد، كن أول من يعلق بكلمة طيبة!
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="p-2.5 rounded-xl bg-[#1A1610] text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-[#C4B998]">
                      <span className="font-bold text-[#F3E5AB]">{c.authorName}</span>
                      <span>{formatArabicTimeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-white leading-relaxed">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Input */}
            <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-2 border-t border-[#C8A24A]/20 shrink-0">
              <input
                type="text"
                required
                maxLength={300}
                value={newCommentContent}
                onChange={(e) => setNewCommentContent(e.target.value)}
                placeholder="اكتب تعليقك الطيب..."
                className="flex-1 min-h-[44px] px-3 rounded-xl bg-[#0B0906] border border-[#C8A24A]/30 text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-[#E6C66E]"
              />
              <button
                type="submit"
                disabled={isSubmittingComment || !newCommentContent.trim()}
                className="min-h-[44px] px-4 rounded-xl bg-[#C8A24A] text-black font-extrabold text-xs hover:bg-[#D4AF37] disabled:opacity-40"
              >
                إرسال
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
