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
      const { data, error } = await supabase
        .from('group_posts')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error || !data) return [];

      return data.map((d: any) => ({
        id: d.id,
        groupId: d.group_id,
        authorId: d.user_id,
        authorName: d.author_name || 'عضو في أثر',
        authorPhoto: d.author_photo || '',
        authorLevel: d.author_level || 1,
        content: d.content,
        mediaUrl: d.media_url,
        likesCount: d.likes_count || 0,
        commentsCount: d.comments_count || 0,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
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
    mediaUrl?: string,
    authorProfile?: { displayName?: string; photoURL?: string; level?: number }
  ): Promise<string> {
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('يجب تسجيل الدخول لنشر مشاركة');

    const trimmed = (content || '').trim();
    if (trimmed.length < 3) throw new Error('المحتوى قصير جداً');

    const authorName = authorProfile?.displayName || user.displayName || 'عضو في أثر';
    const authorPhoto = authorProfile?.photoURL || user.photoURL || '';
    const authorLevel = authorProfile?.level || 1;

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

    const channel = supabase
      .channel(`group_posts_${groupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_posts', filter: `group_id=eq.${groupId}` },
        () => refresh()
      )
      .subscribe();

    return () => {
      isCancelled = true;
      supabase.removeChannel(channel);
    };
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

    const channel = supabase
      .channel(`group_members_${groupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${groupId}` },
        () => refresh()
      )
      .subscribe();

    return () => {
      isCancelled = true;
      supabase.removeChannel(channel);
    };
  }
}
