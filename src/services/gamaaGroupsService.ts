import { supabase } from '../lib/supabaseClient';
import { AuthService } from './authService';
import {
  CommunityGroup,
  CommunityGroupMember,
  CommunityGroupPost,
  GroupCategory,
  GroupMemberRole,
  GroupMemberStatus,
} from '../types';

export class GamaaGroupsService {
  /**
   * Create a new Islamic circle / group in Supabase
   */
  public static async createGroup(params: {
    name: string;
    description: string;
    category: GroupCategory;
    isPrivate: boolean;
    creatorProfile?: {
      displayName?: string;
      photoURL?: string;
      level?: number;
    };
  }): Promise<string> {
    const user = AuthService.getCurrentUser();
    if (!user) {
      throw new Error('يجب تسجيل الدخول لإنشاء حلقة جديدة');
    }

    const trimmedName = (params.name || '').trim();
    if (trimmedName.length < 3 || trimmedName.length > 60) {
      throw new Error('اسم الحلقة يجب أن يكون بين 3 و 60 حرفاً');
    }

    const trimmedDesc = (params.description || '').trim();
    if (trimmedDesc.length < 5 || trimmedDesc.length > 300) {
      throw new Error('وصف الحلقة يجب أن يكون بين 5 و 300 حرف');
    }

    const creatorName = params.creatorProfile?.displayName || user.displayName || 'عضو في أثر';
    const creatorPhoto = params.creatorProfile?.photoURL || user.photoURL || '';

    const { data: groupData, error: groupErr } = await supabase
      .from('groups')
      .insert({
        name: trimmedName,
        description: trimmedDesc,
        category: params.category,
        is_private: params.isPrivate,
        creator_id: user.uid,
        creator_name: creatorName,
        creator_photo: creatorPhoto,
        members_count: 1,
        posts_count: 0,
      })
      .select('id')
      .single();

    if (groupErr || !groupData) {
      throw new Error(groupErr?.message || 'فشل إنشاء الحلقة، يرجى المحاولة لاحقاً');
    }

    const groupId = groupData.id;

    // Enroll creator as active admin in group_members
    await supabase.from('group_members').insert({
      group_id: groupId,
      user_id: user.uid,
      role: 'admin',
      status: 'active',
    });

    return groupId;
  }

  /**
   * Get groups matching filters from Supabase
   */
  public static async getGroups(
    category?: GroupCategory | 'all',
    searchQuery?: string
  ): Promise<CommunityGroup[]> {
    try {
      let query = supabase.from('groups').select('*').order('created_at', { ascending: false });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error || !data) return [];

      let list: CommunityGroup[] = data.map((d: any) => ({
        id: d.id,
        name: d.name,
        description: d.description || '',
        category: d.category as GroupCategory,
        isPrivate: d.is_private || false,
        creatorId: d.creator_id,
        creatorName: d.creator_name || 'عضو في أثر',
        creatorPhoto: d.creator_photo || '',
        membersCount: d.members_count || 1,
        postsCount: d.posts_count || 0,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));

      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        list = list.filter(
          (g) => g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)
        );
      }

      return list;
    } catch (err) {
      console.warn('GamaaGroupsService getGroups error:', err);
      return [];
    }
  }

  /**
   * Get user's membership status for a specific group
   */
  public static async getUserMembership(
    groupId: string,
    userId: string
  ): Promise<CommunityGroupMember | null> {
    if (!groupId || !userId) return null;
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        groupId: data.group_id,
        userId: data.user_id,
        role: data.role as GroupMemberRole,
        status: data.status as GroupMemberStatus,
        joinedAt: data.joined_at,
      };
    } catch {
      return null;
    }
  }

  /**
   * Join a public group directly
   */
  public static async joinGroup(
    groupId: string,
    _userProfile?: { displayName?: string; photoURL?: string; level?: number }
  ): Promise<void> {
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('يجب تسجيل الدخول للانضمام');

    const { error } = await supabase.from('group_members').upsert({
      group_id: groupId,
      user_id: user.uid,
      role: 'member',
      status: 'active',
      joined_at: new Date().toISOString(),
    }, { onConflict: 'group_id,user_id' });

    if (error) throw error;

    // Increment member count
    const { data: g } = await supabase.from('groups').select('members_count').eq('id', groupId).single();
    if (g) {
      await supabase.from('groups').update({ members_count: (g.members_count || 0) + 1 }).eq('id', groupId);
    }
  }

  /**
   * Leave a group
   */
  public static async leaveGroup(groupId: string): Promise<void> {
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('يجب تسجيل الدخول');

    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.uid);

    const { data: g } = await supabase.from('groups').select('members_count').eq('id', groupId).single();
    if (g && g.members_count > 0) {
      await supabase.from('groups').update({ members_count: g.members_count - 1 }).eq('id', groupId);
    }
  }

  /**
   * Request to join a private group (pending status)
   */
  public static async requestToJoinPrivateGroup(
    groupId: string,
    _userProfile?: { displayName?: string; photoURL?: string; level?: number }
  ): Promise<void> {
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('يجب تسجيل الدخول');

    const { error } = await supabase.from('group_members').upsert({
      group_id: groupId,
      user_id: user.uid,
      role: 'member',
      status: 'pending',
      joined_at: new Date().toISOString(),
    }, { onConflict: 'group_id,user_id' });

    if (error) throw error;
  }

  /**
   * Update member status (approve pending or block)
   */
  public static async updateMembershipStatus(
    groupId: string,
    memberId: string,
    status: GroupMemberStatus
  ): Promise<void> {
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('يجب تسجيل الدخول');

    await supabase
      .from('group_members')
      .update({ status })
      .eq('group_id', groupId)
      .eq('user_id', memberId);
  }

  /**
   * Get posts inside a specific group
   */
  public static async getGroupPosts(groupId: string): Promise<CommunityGroupPost[]> {
    try {
      let postsData: any[] | null = null;
      const { data, error } = await supabase
        .from('group_posts')
        .select('*, group_comments(count)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error || !data) {
        const fallbackRes = await supabase
          .from('group_posts')
          .select('*')
          .eq('group_id', groupId)
          .order('created_at', { ascending: false })
          .limit(50);
        if (fallbackRes.error || !fallbackRes.data) return [];
        postsData = fallbackRes.data;
      } else {
        postsData = data;
      }

      return postsData.map((d: any) => {
        let computedCommentsCount = 0;
        if (Array.isArray(d.group_comments) && d.group_comments.length > 0 && typeof d.group_comments[0]?.count === 'number') {
          computedCommentsCount = d.group_comments[0].count;
        } else if (typeof d.comments_count === 'number') {
          computedCommentsCount = d.comments_count;
        }

        return {
          id: d.id,
          groupId: d.group_id,
          authorId: d.user_id,
          authorName: d.author_name || 'عضو في أثر',
          authorPhoto: d.author_photo || '',
          authorLevel: d.author_level || 1,
          content: d.content,
          mediaUrl: d.media_url,
          reactionsCount: {
            jazakallah: d.reactions_count?.jazakallah || 0,
            barakallah: d.reactions_count?.barakallah || 0,
            ameen: d.reactions_count?.ameen || 0,
          },
          userReactions: d.user_reactions || {},
          commentsCount: computedCommentsCount,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Create a post inside a group
   */
  public static async createGroupPost(
    groupId: string,
    content: string,
    mediaUrlOrProfile?: string | { displayName?: string; photoURL?: string; level?: number },
    authorProfile?: { displayName?: string; photoURL?: string; level?: number }
  ): Promise<string> {
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('يجب تسجيل الدخول لنشر مشاركة');

    const trimmed = (content || '').trim();
    if (trimmed.length < 3) throw new Error('المحتوى قصير جداً');

    let mediaUrl = '';
    let profile = authorProfile;
    if (typeof mediaUrlOrProfile === 'string') {
      mediaUrl = mediaUrlOrProfile;
    } else if (mediaUrlOrProfile && typeof mediaUrlOrProfile === 'object') {
      profile = mediaUrlOrProfile;
    }

    const authorName = profile?.displayName || user.displayName || 'عضو في أثر';
    const authorPhoto = profile?.photoURL || user.photoURL || '';
    const authorLevel = profile?.level || 1;

    const { data, error } = await supabase
      .from('group_posts')
      .insert({
        group_id: groupId,
        user_id: user.uid,
        author_name: authorName,
        author_photo: authorPhoto,
        author_level: authorLevel,
        content: trimmed,
        media_url: mediaUrl || '',
      })
      .select('id')
      .single();

    if (error || !data) throw new Error(error?.message || 'فشل نشر المشاركة');

    // Increment group posts count
    const { data: g } = await supabase.from('groups').select('posts_count').eq('id', groupId).single();
    if (g) {
      await supabase.from('groups').update({ posts_count: (g.posts_count || 0) + 1 }).eq('id', groupId);
    }

    return data.id;
  }

  /**
   * Delete a post from a group
   */
  public static async deleteGroupPost(groupId: string, postId: string): Promise<void> {
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('يجب تسجيل الدخول لحذف المشاركة');

    await supabase.from('group_posts').delete().eq('id', postId).eq('group_id', groupId);

    const { data: g } = await supabase.from('groups').select('posts_count').eq('id', groupId).single();
    if (g && g.posts_count > 0) {
      await supabase.from('groups').update({ posts_count: g.posts_count - 1 }).eq('id', groupId);
    }
  }

  /**
   * Listen to groups with real-time updates
   */
  public static listenToGroups(
    categoryOrQuery?: any,
    callbackOrSearchQuery?: any,
    maybeCallback?: any
  ): () => void {
    let category: GroupCategory | 'all' = 'all';
    let searchQuery = '';
    let callback: (groups: CommunityGroup[]) => void = () => {};

    if (typeof callbackOrSearchQuery === 'function') {
      category = categoryOrQuery || 'all';
      callback = callbackOrSearchQuery;
    } else if (typeof maybeCallback === 'function') {
      category = categoryOrQuery || 'all';
      searchQuery = callbackOrSearchQuery || '';
      callback = maybeCallback;
    } else if (typeof categoryOrQuery === 'function') {
      callback = categoryOrQuery;
    }

    let isCancelled = false;
    const refresh = async () => {
      const list = await this.getGroups(category, searchQuery);
      if (!isCancelled) callback(list);
    };

    refresh();

    let channel: any = null;
    try {
      const channelId = `groups_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      channel = supabase
        .channel(channelId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () => refresh())
        .subscribe();
    } catch (e) {
      console.warn('[GamaaGroupsService] subscribeToGroups fallback:', e);
    }

    return () => {
      isCancelled = true;
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }

  /**
   * Subscribe to group posts in real-time
   */
  public static subscribeToGroupPosts(
    groupId: string,
    callback: (posts: CommunityGroupPost[]) => void
  ): () => void {
    let isCancelled = false;

    const refresh = async () => {
      const posts = await this.getGroupPosts(groupId);
      if (!isCancelled) callback(posts);
    };

    refresh();

    let channel: any = null;
    try {
      const channelId = `group_posts_${groupId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'group_posts', filter: `group_id=eq.${groupId}` },
          () => refresh()
        )
        .subscribe();
    } catch (e) {
      console.warn('[GamaaGroupsService] subscribeToGroupPosts fallback:', e);
    }

    return () => {
      isCancelled = true;
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }

  /**
   * Alias for subscribeToGroupPosts
   */
  public static listenToGroupPosts(
    groupId: string,
    callback: (posts: CommunityGroupPost[]) => void
  ): () => void {
    return this.subscribeToGroupPosts(groupId, callback);
  }

  /**
   * Subscribe to group members in real-time
   */
  public static subscribeToGroupMembers(
    groupId: string,
    callback: (members: CommunityGroupMember[]) => void
  ): () => void {
    let isCancelled = false;

    const refresh = async () => {
      try {
        const { data } = await supabase
          .from('group_members')
          .select('*')
          .eq('group_id', groupId);

        if (!isCancelled && Array.isArray(data)) {
          callback(
            data.map((d: any) => ({
              id: d.id,
              groupId: d.group_id,
              userId: d.user_id,
              role: d.role as GroupMemberRole,
              status: d.status as GroupMemberStatus,
              joinedAt: d.joined_at,
            }))
          );
        }
      } catch {}
    };

    refresh();

    let channel: any = null;
    try {
      const channelId = `group_members_${groupId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${groupId}` },
          () => refresh()
        )
        .subscribe();
    } catch (e) {
      console.warn('[GamaaGroupsService] subscribeToGroupMembers fallback:', e);
    }

    return () => {
      isCancelled = true;
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }

  /**
   * Alias for subscribeToGroupMembers
   */
  public static listenToGroupMembers(
    groupId: string,
    callback: (members: CommunityGroupMember[]) => void
  ): () => void {
    return this.subscribeToGroupMembers(groupId, callback);
  }

  /**
   * Realtime comments for a post
   */
  public static listenToGroupComments(
    groupId: string,
    postId: string,
    callback: (comments: any[]) => void
  ): () => void {
    let isCancelled = false;
    const refresh = async () => {
      const { data } = await supabase
        .from('group_comments')
        .select('*')
        .eq('group_id', groupId)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (!isCancelled) {
        callback(
          (data || []).map((c: any) => ({
            id: c.id,
            postId: c.post_id,
            authorId: c.user_id,
            authorName: c.author_name || 'عضو في أثر',
            authorPhoto: c.author_photo || '',
            authorLevel: c.author_level || 1,
            content: c.content,
            createdAt: c.created_at,
          }))
        );
      }
    };
    refresh();

    let channel: any = null;
    try {
      const channelId = `group_comments_${postId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'group_comments', filter: `post_id=eq.${postId}` },
          () => refresh()
        )
        .subscribe();
    } catch (e) {
      console.warn('[GamaaGroupsService] listenToGroupComments fallback:', e);
    }

    return () => {
      isCancelled = true;
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }

  public static async joinPublicGroup(
    groupId: string,
    profile?: { displayName?: string; photoURL?: string; level?: number }
  ): Promise<void> {
    return this.joinGroup(groupId, profile);
  }

  public static async requestJoinPrivateGroup(
    groupId: string,
    profile?: { displayName?: string; photoURL?: string; level?: number }
  ): Promise<void> {
    return this.requestToJoinPrivateGroup(groupId, profile);
  }

  public static async approveMember(groupId: string, memberUid: string): Promise<void> {
    return this.updateMembershipStatus(groupId, memberUid, 'active');
  }

  public static async removeMember(groupId: string, memberUid: string, _isBlock: boolean = false): Promise<void> {
    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', memberUid);
  }

  public static async createGroupComment(
    groupId: string,
    postId: string,
    content: string,
    authorProfile?: { displayName?: string; photoURL?: string; level?: number }
  ): Promise<string> {
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('يجب تسجيل الدخول للتعليق');
    const trimmed = (content || '').trim();
    if (!trimmed) throw new Error('التعليق فارغ');

    const { data, error } = await supabase
      .from('group_comments')
      .insert({
        group_id: groupId,
        post_id: postId,
        user_id: user.uid,
        author_name: authorProfile?.displayName || user.displayName || 'عضو في أثر',
        author_photo: authorProfile?.photoURL || user.photoURL || '',
        author_level: authorProfile?.level || 1,
        content: trimmed,
      })
      .select('id')
      .single();

    if (error || !data) throw new Error(error?.message || 'فشل إرسال التعليق');

    const { data: p } = await supabase.from('group_posts').select('comments_count').eq('id', postId).single();
    if (p) {
      await supabase.from('group_posts').update({ comments_count: (p.comments_count || 0) + 1 }).eq('id', postId);
    }

    return data.id;
  }

  public static async toggleGroupPostReaction(
    _groupId: string,
    postId: string,
    type: any,
    isActivating: boolean
  ): Promise<void> {
    const { data: p } = await supabase.from('group_posts').select('reactions_count, user_reactions').eq('id', postId).single();
    if (p) {
      const counts = p.reactions_count || { jazakallah: 0, barakallah: 0, ameen: 0 };
      const currentVal = counts[type] || 0;
      const newVal = isActivating ? currentVal + 1 : Math.max(0, currentVal - 1);
      counts[type] = newVal;
      const uReactions = p.user_reactions || {};
      uReactions[type] = isActivating;
      await supabase.from('group_posts').update({ reactions_count: counts, user_reactions: uReactions }).eq('id', postId);
    }
  }
}
