import { supabase } from '../lib/supabaseClient';
import { GamaaPost, GamaaComment, GamaaReactionType } from '../types';

export interface SupabaseProfile {
  id: string;
  userId?: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  username?: string;
  role: 'member' | 'admin' | 'moderator';
  xp: number;
  streak: number;
  level: number;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupabaseCampaign {
  id: string;
  $id?: string;
  title: string;
  targetCount: number;
  currentCount: number;
  dhikrType: string;
  creatorId: string;
  creatorName?: string;
  status: 'active' | 'completed' | 'paused' | 'archived';
  description?: string;
  createdAt?: string;
}

/**
 * Service handling all Gamaa Community operations via Supabase
 * Replaces Appwrite completely with direct PostgreSQL queries & Supabase Auth.
 */
export class SupabaseGamaaService {
  // ==========================================
  // 1. PROFILES & ADMIN ROLE (الملف الشخصي وصلاحيات المشرف)
  // ==========================================

  /**
   * Retrieve a user's profile from the `profiles` table in Supabase
   */
  public static async getProfile(userId: string): Promise<SupabaseProfile | null> {
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('[SupabaseGamaaService] getProfile notice:', error.message);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        userId: data.id,
        displayName: data.display_name || 'مستخدم أثر',
        avatarUrl: data.avatar_url || '',
        username: data.username,
        role: (data.role as 'member' | 'admin' | 'moderator') || 'member',
        xp: data.xp || 0,
        streak: data.streak || 0,
        level: data.level || 1,
        bio: data.bio || '',
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (err) {
      console.warn('[SupabaseGamaaService] getProfile exception:', err);
      return null;
    }
  }

  /**
   * Verify if a user is an admin by checking `role === 'admin'` in `profiles` table
   */
  public static async checkIsAdmin(userId: string): Promise<boolean> {
    if (!userId) return false;
    try {
      const profile = await this.getProfile(userId);
      return profile?.role === 'admin';
    } catch {
      return false;
    }
  }

  /**
   * Create or update profile in Supabase
   */
  public static async upsertProfile(
    userId: string,
    data: Partial<SupabaseProfile>
  ): Promise<SupabaseProfile | null> {
    try {
      const payload: Record<string, any> = {
        id: userId,
        updated_at: new Date().toISOString(),
      };

      if (data.displayName !== undefined) payload.display_name = data.displayName;
      if (data.avatarUrl !== undefined) payload.avatar_url = data.avatarUrl;
      if (data.username !== undefined) payload.username = data.username;
      if (data.bio !== undefined) payload.bio = data.bio;
      if (data.role !== undefined) payload.role = data.role;
      if (data.xp !== undefined) payload.xp = data.xp;
      if (data.streak !== undefined) payload.streak = data.streak;
      if (data.level !== undefined) payload.level = data.level;

      const { data: updated, error } = await supabase
        .from('profiles')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.error('[SupabaseGamaaService] upsertProfile error:', error.message);
        throw error;
      }

      return {
        id: updated.id,
        userId: updated.id,
        displayName: updated.display_name,
        avatarUrl: updated.avatar_url,
        username: updated.username,
        role: updated.role,
        xp: updated.xp,
        streak: updated.streak,
        level: updated.level,
        bio: updated.bio,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      };
    } catch (err) {
      console.error('[SupabaseGamaaService] upsertProfile exception:', err);
      return null;
    }
  }

  /**
   * Synchronize gamification stats (XP, Streak, Level) to Supabase profile
   */
  public static async syncGamification(
    userId: string,
    stats: { xp?: number; streak?: number; streakDays?: number; level?: number }
  ): Promise<void> {
    if (!userId) return;
    try {
      const payload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (stats.xp !== undefined) payload.xp = stats.xp;
      if (stats.streak !== undefined) payload.streak = stats.streak;
      if (stats.streakDays !== undefined) payload.streak = stats.streakDays;
      if (stats.level !== undefined) payload.level = stats.level;

      await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userId);
    } catch (err) {
      console.warn('[SupabaseGamaaService] syncGamification notice:', err);
    }
  }

  // ==========================================
  // 2. POSTS (المنشورات)
  // ==========================================

  /**
   * Fetch latest posts from Supabase ordered descending by created_at (and pinned first)
   */
  public static async getPosts(limit = 30, offset = 0): Promise<GamaaPost[]> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.warn('[SupabaseGamaaService] getPosts error:', error.message);
        throw error;
      }

      return (data || []).map((p: any) => ({
        id: p.id,
        authorId: p.user_id,
        authorName: p.author_name || 'فاعل خير',
        authorPhoto: p.author_photo || '',
        authorLevel: p.author_level || 1,
        content: p.content,
        commentsCount: p.comments_count || 0,
        reactionsCount: {
          jazakallah: p.jazakallah_count || 0,
          barakallah: p.barakallah_count || 0,
          ameen: p.ameen_count || 0,
        },
        mediaUrl: p.media_url || '',
        isPinned: Boolean(p.is_pinned),
        createdAt: p.created_at,
        updatedAt: p.updated_at || p.created_at,
      }));
    } catch (err) {
      console.warn('[SupabaseGamaaService] getPosts fallback:', err);
      return [];
    }
  }

  /**
   * Create a new post in Supabase
   */
  public static async createPost(params: {
    authorId: string;
    authorName: string;
    authorPhoto?: string;
    authorLevel?: number;
    content: string;
    mediaUrl?: string;
  }): Promise<GamaaPost> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: params.authorId,
          author_name: params.authorName,
          author_photo: params.authorPhoto || '',
          author_level: params.authorLevel || 1,
          content: params.content,
          media_url: params.mediaUrl || '',
          likes_count: 0,
          jazakallah_count: 0,
          barakallah_count: 0,
          ameen_count: 0,
          comments_count: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('[SupabaseGamaaService] createPost error:', error.message);
        throw error;
      }

      return {
        id: data.id,
        authorId: data.user_id,
        authorName: data.author_name,
        authorPhoto: data.author_photo,
        authorLevel: data.author_level,
        content: data.content,
        commentsCount: data.comments_count || 0,
        reactionsCount: {
          jazakallah: data.jazakallah_count || 0,
          barakallah: data.barakallah_count || 0,
          ameen: data.ameen_count || 0,
        },
        mediaUrl: data.media_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (err) {
      console.error('[SupabaseGamaaService] createPost exception:', err);
      throw err;
    }
  }

  /**
   * Delete a post (Allowed for Author or Admin via RLS)
   */
  public static async deletePost(postId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) {
        console.error('[SupabaseGamaaService] deletePost error:', error.message);
        throw error;
      }
      return true;
    } catch (err) {
      console.error('[SupabaseGamaaService] deletePost exception:', err);
      throw err;
    }
  }

  // ==========================================
  // 3. COMMENTS (التعليقات)
  // ==========================================

  /**
   * Fetch comments for a specific post
   */
  public static async getComments(postId: string): Promise<GamaaComment[]> {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.warn('[SupabaseGamaaService] getComments error:', error.message);
        return [];
      }

      return (data || []).map((c: any) => ({
        id: c.id,
        postId: c.post_id,
        authorId: c.user_id,
        authorName: c.author_name || 'فاعل خير',
        authorPhoto: c.author_photo || '',
        authorLevel: c.author_level || 1,
        content: c.content,
        createdAt: c.created_at,
      }));
    } catch (err) {
      console.warn('[SupabaseGamaaService] getComments exception:', err);
      return [];
    }
  }

  /**
   * Add a new comment to a post and increment comments_count
   */
  public static async addComment(params: {
    postId: string;
    authorId: string;
    authorName: string;
    authorPhoto?: string;
    authorLevel?: number;
    content: string;
  }): Promise<GamaaComment> {
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: params.postId,
          user_id: params.authorId,
          author_name: params.authorName,
          author_photo: params.authorPhoto || '',
          author_level: params.authorLevel || 1,
          content: params.content,
        })
        .select()
        .single();

      if (error) {
        console.error('[SupabaseGamaaService] addComment error:', error.message);
        throw error;
      }

      // Increment comments_count on post
      try {
        const { data: post } = await supabase
          .from('posts')
          .select('comments_count')
          .eq('id', params.postId)
          .single();
        if (post) {
          await supabase
            .from('posts')
            .update({ comments_count: (post.comments_count || 0) + 1 })
            .eq('id', params.postId);
        }
      } catch (countErr) {
        console.warn('[SupabaseGamaaService] Increment count notice:', countErr);
      }

      return {
        id: data.id,
        postId: data.post_id,
        authorId: data.user_id,
        authorName: data.author_name,
        authorPhoto: data.author_photo,
        authorLevel: data.author_level,
        content: data.content,
        createdAt: data.created_at,
      };
    } catch (err) {
      console.error('[SupabaseGamaaService] addComment exception:', err);
      throw err;
    }
  }

  /**
   * Delete a comment (Allowed for Author or Admin)
   */
  public static async deleteComment(postId: string, commentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        console.error('[SupabaseGamaaService] deleteComment error:', error.message);
        throw error;
      }

      // Decrement comments_count
      try {
        const { data: post } = await supabase
          .from('posts')
          .select('comments_count')
          .eq('id', postId)
          .single();
        if (post) {
          await supabase
            .from('posts')
            .update({ comments_count: Math.max(0, (post.comments_count || 1) - 1) })
            .eq('id', postId);
        }
      } catch {}

      return true;
    } catch (err) {
      console.error('[SupabaseGamaaService] deleteComment exception:', err);
      throw err;
    }
  }

  // ==========================================
  // 4. LIKES & REACTIONS (التفاعلات والإعجابات)
  // ==========================================

  /**
   * Toggle reaction / like on a post in Supabase
   */
  public static async toggleLike(params: {
    targetId: string;
    userId: string;
    reactionType?: GamaaReactionType | 'like';
  }): Promise<{ action: 'added' | 'removed' | 'switched'; activeReaction?: string }> {
    const { targetId, userId, reactionType = 'like' } = params;

    try {
      // Check existing reaction
      const { data: existing } = await supabase
        .from('likes')
        .select('*')
        .eq('post_id', targetId)
        .eq('user_id', userId)
        .maybeSingle();

      const { data: post } = await supabase
        .from('posts')
        .select('likes_count, jazakallah_count, barakallah_count, ameen_count')
        .eq('id', targetId)
        .single();

      const currentLikes = post?.likes_count || 0;
      const currentJazakallah = post?.jazakallah_count || 0;
      const currentBarakallah = post?.barakallah_count || 0;
      const currentAmeen = post?.ameen_count || 0;

      if (existing) {
        const currentType = existing.reaction_type;

        if (currentType === reactionType) {
          // Remove reaction
          await supabase.from('likes').delete().eq('id', existing.id);

          const postUpdates: Record<string, number> = {
            likes_count: Math.max(0, currentLikes - 1),
          };
          if (reactionType === 'jazakallah') postUpdates.jazakallah_count = Math.max(0, currentJazakallah - 1);
          if (reactionType === 'barakallah') postUpdates.barakallah_count = Math.max(0, currentBarakallah - 1);
          if (reactionType === 'ameen') postUpdates.ameen_count = Math.max(0, currentAmeen - 1);

          await supabase.from('posts').update(postUpdates).eq('id', targetId);
          return { action: 'removed' };
        } else {
          // Switch reaction
          await supabase
            .from('likes')
            .update({ reaction_type: reactionType })
            .eq('id', existing.id);

          const postUpdates: Record<string, number> = {};
          if (currentType === 'jazakallah') postUpdates.jazakallah_count = Math.max(0, currentJazakallah - 1);
          if (currentType === 'barakallah') postUpdates.barakallah_count = Math.max(0, currentBarakallah - 1);
          if (currentType === 'ameen') postUpdates.ameen_count = Math.max(0, currentAmeen - 1);

          if (reactionType === 'jazakallah') postUpdates.jazakallah_count = (postUpdates.jazakallah_count ?? currentJazakallah) + 1;
          if (reactionType === 'barakallah') postUpdates.barakallah_count = (postUpdates.barakallah_count ?? currentBarakallah) + 1;
          if (reactionType === 'ameen') postUpdates.ameen_count = (postUpdates.ameen_count ?? currentAmeen) + 1;

          await supabase.from('posts').update(postUpdates).eq('id', targetId);
          return { action: 'switched', activeReaction: reactionType };
        }
      } else {
        // Add new reaction
        await supabase.from('likes').insert({
          post_id: targetId,
          user_id: userId,
          reaction_type: reactionType,
        });

        const postUpdates: Record<string, number> = {
          likes_count: currentLikes + 1,
        };
        if (reactionType === 'jazakallah') postUpdates.jazakallah_count = currentJazakallah + 1;
        if (reactionType === 'barakallah') postUpdates.barakallah_count = currentBarakallah + 1;
        if (reactionType === 'ameen') postUpdates.ameen_count = currentAmeen + 1;

        await supabase.from('posts').update(postUpdates).eq('id', targetId);
        return { action: 'added', activeReaction: reactionType };
      }
    } catch (err) {
      console.error('[SupabaseGamaaService] toggleLike error:', err);
      throw err;
    }
  }

  /**
   * Get current user's reaction for a given post
   */
  public static async getUserReaction(targetId: string, userId: string): Promise<string | null> {
    if (!userId) return null;
    try {
      const { data } = await supabase
        .from('likes')
        .select('reaction_type')
        .eq('post_id', targetId)
        .eq('user_id', userId)
        .maybeSingle();

      return data?.reaction_type || null;
    } catch {
      return null;
    }
  }

  // ==========================================
  // 5. CAMPAIGNS (حملات التسبيح والأهداف المشتركة)
  // ==========================================

  /**
   * Fetch campaigns from Supabase
   */
  public static async getCampaigns(
    status: 'active' | 'completed' | 'all' = 'active'
  ): Promise<SupabaseCampaign[]> {
    try {
      let query = supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[SupabaseGamaaService] getCampaigns error:', error.message);
        return [];
      }

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
    } catch (err) {
      console.warn('[SupabaseGamaaService] getCampaigns exception:', err);
      return [];
    }
  }

  /**
   * Create a new campaign in Supabase
   */
  public static async createCampaign(campaign: {
    title: string;
    targetCount: number;
    dhikrType: string;
    creatorId: string;
    creatorName?: string;
    description?: string;
  }): Promise<SupabaseCampaign> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          title: campaign.title,
          target_count: campaign.targetCount,
          current_count: 0,
          dhikr_type: campaign.dhikrType,
          creator_id: campaign.creatorId,
          creator_name: campaign.creatorName || '',
          description: campaign.description || '',
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        console.error('[SupabaseGamaaService] createCampaign error:', error.message);
        throw error;
      }

      return {
        id: data.id,
        $id: data.id,
        title: data.title,
        targetCount: Number(data.target_count),
        currentCount: Number(data.current_count),
        dhikrType: data.dhikr_type,
        creatorId: data.creator_id,
        creatorName: data.creator_name,
        status: data.status,
        description: data.description,
        createdAt: data.created_at,
      };
    } catch (err) {
      console.error('[SupabaseGamaaService] createCampaign exception:', err);
      throw err;
    }
  }

  /**
   * Participate in a Dhikr campaign (increments current_count)
   */
  public static async participateInCampaign(
    campaignId: string,
    count: number,
    _userId?: string
  ): Promise<number> {
    try {
      // First try RPC function if exists
      const { data: rpcData, error: rpcError } = await supabase.rpc('participate_in_campaign', {
        p_campaign_id: campaignId,
        p_count: count,
      });

      if (!rpcError && rpcData && rpcData[0]) {
        return Number(rpcData[0].new_count);
      }

      // Fallback: direct update
      const { data: camp } = await supabase
        .from('campaigns')
        .select('current_count, target_count')
        .eq('id', campaignId)
        .single();

      const newTotal = Number(camp?.current_count || 0) + count;
      const isCompleted = newTotal >= Number(camp?.target_count || 1000);

      await supabase
        .from('campaigns')
        .update({
          current_count: newTotal,
          status: isCompleted ? 'completed' : 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      return newTotal;
    } catch (err) {
      console.error('[SupabaseGamaaService] participateInCampaign error:', err);
      throw err;
    }
  }

  /**
   * Delete a campaign (Admin or Creator)
   */
  public static async deleteCampaign(campaignId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[SupabaseGamaaService] deleteCampaign error:', err);
      throw err;
    }
  }

  // ==========================================
  // 6. STORAGE (رفع الصور)
  // ==========================================

  /**
   * Upload an avatar to Supabase Storage bucket ('avatars')
   */
  public static async uploadAvatar(file: File, userId: string): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.warn('[SupabaseGamaaService] uploadAvatar bucket notice:', uploadError.message);
        // Fallback: create base64 data url
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return publicData.publicUrl;
    } catch (err) {
      console.error('[SupabaseGamaaService] uploadAvatar error:', err);
      // Safe base64 fallback
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }
  }

  // ==========================================
  // 7. REALTIME LISTENERS & COMPATIBILITY
  // ==========================================

  /**
   * Subscribe to real-time posts feed
   */
  public static subscribeToFeed(callback: (posts: GamaaPost[]) => void): () => void {
    this.getPosts().then(callback);

    const channel = supabase
      .channel('public:posts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        async () => {
          const updated = await SupabaseGamaaService.getPosts();
          callback(updated);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Toggle reaction compatibility wrapper
   */
  public static async toggleReaction(
    postId: string,
    userId: string,
    reactionType: GamaaReactionType
  ): Promise<{ added: boolean; previousReaction?: GamaaReactionType }> {
    const res = await this.toggleLike({ targetId: postId, userId, reactionType });
    return {
      added: res.action === 'added' || res.action === 'switched',
      previousReaction: undefined,
    };
  }

  /**
   * Pin or unpin a post in Supabase
   */
  public static async pinPost(postId: string, isPinned: boolean): Promise<void> {
    const { error } = await supabase
      .from('posts')
      .update({ is_pinned: isPinned })
      .eq('id', postId);
    if (error) {
      console.warn('[SupabaseGamaaService] pinPost error:', error.message);
    }
  }

  /**
   * Listen to comments on a post in real-time
   */
  public static listenToComments(
    postId: string,
    callback: (comments: GamaaComment[]) => void
  ): () => void {
    this.getComments(postId).then(callback);

    const channel = supabase
      .channel(`comments:${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        async () => {
          const updated = await SupabaseGamaaService.getComments(postId);
          callback(updated);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Listen to user's reaction for a specific post
   */
  public static listenToUserReaction(
    postId: string,
    userId: string,
    callback: (reaction: GamaaReactionType | null) => void
  ): () => void {
    if (!userId) {
      callback(null);
      return () => {};
    }

    this.getUserReaction(postId, userId).then((r) =>
      callback((r as GamaaReactionType) || null)
    );

    const channel = supabase
      .channel(`likes:${postId}:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes', filter: `post_id=eq.${postId}` },
        async () => {
          const r = await SupabaseGamaaService.getUserReaction(postId, userId);
          callback((r as GamaaReactionType) || null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

