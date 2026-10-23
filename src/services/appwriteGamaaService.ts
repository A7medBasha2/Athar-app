import {
  databases,
  storage,
  account,
  ID,
  Query,
  APPWRITE_CONFIG,
} from '../lib/appwrite';
import { GamaaPost, GamaaComment, GamaaReactionType } from '../types';

export interface AppwriteProfile {
  $id?: string;
  userId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  role: 'admin' | 'moderator' | 'user';
  xp: number;
  streakDays: number;
  level: number;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppwriteCampaign {
  $id?: string;
  title: string;
  targetCount: number;
  currentCount: number;
  dhikrType: string;
  creatorId: string;
  creatorName?: string;
  status: 'active' | 'completed';
  description?: string;
  createdAt?: string;
}

export class AppwriteGamaaService {
  private static dbId = APPWRITE_CONFIG.databaseId;
  private static postsCol = APPWRITE_CONFIG.collections.posts;
  private static commentsCol = APPWRITE_CONFIG.collections.comments;
  private static likesCol = APPWRITE_CONFIG.collections.likes;
  private static campaignsCol = APPWRITE_CONFIG.collections.campaigns;
  private static profilesCol = APPWRITE_CONFIG.collections.profiles;

  // ==========================================
  // 1. POSTS (المنشورات)
  // ==========================================

  /**
   * Fetch latest posts from Appwrite
   */
  public static async getPosts(limit = 30, offset = 0): Promise<GamaaPost[]> {
    try {
      const response = await databases.listDocuments(
        this.dbId,
        this.postsCol,
        [
          Query.orderDesc('$createdAt'),
          Query.limit(limit),
          Query.offset(offset),
        ]
      );

      return response.documents.map((doc: any) => this.mapDocToPost(doc));
    } catch (error) {
      console.warn('[AppwriteGamaaService] getPosts error:', error);
      throw error;
    }
  }

  /**
   * Create a new post in Appwrite
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
      const docData = {
        authorId: params.authorId,
        authorName: params.authorName,
        authorPhoto: params.authorPhoto || '',
        authorLevel: params.authorLevel || 1,
        content: params.content,
        mediaUrl: params.mediaUrl || '',
        commentsCount: 0,
        jazakallahCount: 0,
        barakallahCount: 0,
        ameenCount: 0,
        likesCount: 0,
      };

      const doc = await databases.createDocument(
        this.dbId,
        this.postsCol,
        ID.unique(),
        docData
      );

      return this.mapDocToPost(doc);
    } catch (error) {
      console.error('[AppwriteGamaaService] createPost error:', error);
      throw error;
    }
  }

  /**
   * Delete a post (by author or admin)
   */
  public static async deletePost(postId: string): Promise<boolean> {
    try {
      await databases.deleteDocument(this.dbId, this.postsCol, postId);

      // Best effort: delete related comments
      this.deletePostComments(postId).catch(() => {});

      return true;
    } catch (error) {
      console.error('[AppwriteGamaaService] deletePost error:', error);
      throw error;
    }
  }

  // ==========================================
  // 2. COMMENTS (التعليقات)
  // ==========================================

  /**
   * Fetch comments for a specific post
   */
  public static async getComments(postId: string): Promise<GamaaComment[]> {
    try {
      const response = await databases.listDocuments(
        this.dbId,
        this.commentsCol,
        [
          Query.equal('postId', postId),
          Query.orderAsc('$createdAt'),
          Query.limit(100),
        ]
      );

      return response.documents.map((doc: any) => ({
        id: doc.$id,
        postId: doc.postId,
        authorId: doc.authorId,
        authorName: doc.authorName,
        authorPhoto: doc.authorPhoto || '',
        authorLevel: doc.authorLevel || 1,
        content: doc.content,
        createdAt: doc.$createdAt || new Date().toISOString(),
      }));
    } catch (error) {
      console.warn('[AppwriteGamaaService] getComments error:', error);
      return [];
    }
  }

  /**
   * Add a new comment to a post
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
      const doc = await databases.createDocument(
        this.dbId,
        this.commentsCol,
        ID.unique(),
        {
          postId: params.postId,
          authorId: params.authorId,
          authorName: params.authorName,
          authorPhoto: params.authorPhoto || '',
          authorLevel: params.authorLevel || 1,
          content: params.content,
        }
      );

      // Increment comments count on post
      try {
        const post = await databases.getDocument(this.dbId, this.postsCol, params.postId);
        await databases.updateDocument(this.dbId, this.postsCol, params.postId, {
          commentsCount: (post.commentsCount || 0) + 1,
        });
      } catch (err) {
        console.warn('[AppwriteGamaaService] Update commentsCount error:', err);
      }

      return {
        id: doc.$id,
        postId: doc.postId,
        authorId: doc.authorId,
        authorName: doc.authorName,
        authorPhoto: doc.authorPhoto || '',
        authorLevel: doc.authorLevel || 1,
        content: doc.content,
        createdAt: doc.$createdAt || new Date().toISOString(),
      };
    } catch (error) {
      console.error('[AppwriteGamaaService] addComment error:', error);
      throw error;
    }
  }

  /**
   * Delete a comment (by author or admin)
   */
  public static async deleteComment(postId: string, commentId: string): Promise<boolean> {
    try {
      await databases.deleteDocument(this.dbId, this.commentsCol, commentId);

      // Decrement comments count on post
      try {
        const post = await databases.getDocument(this.dbId, this.postsCol, postId);
        const count = Math.max(0, (post.commentsCount || 1) - 1);
        await databases.updateDocument(this.dbId, this.postsCol, postId, {
          commentsCount: count,
        });
      } catch (err) {
        console.warn('[AppwriteGamaaService] Decrement commentsCount error:', err);
      }

      return true;
    } catch (error) {
      console.error('[AppwriteGamaaService] deleteComment error:', error);
      throw error;
    }
  }

  private static async deletePostComments(postId: string): Promise<void> {
    try {
      const res = await databases.listDocuments(this.dbId, this.commentsCol, [
        Query.equal('postId', postId),
        Query.limit(100),
      ]);
      for (const c of res.documents) {
        await databases.deleteDocument(this.dbId, this.commentsCol, c.$id);
      }
    } catch {}
  }

  // ==========================================
  // 3. LIKES & REACTIONS (التفاعلات والإعجابات)
  // ==========================================

  /**
   * Toggle reaction / like on a post
   */
  public static async toggleLike(params: {
    targetId: string;
    userId: string;
    reactionType?: GamaaReactionType | 'like';
  }): Promise<{ action: 'added' | 'removed' | 'switched'; activeReaction?: string }> {
    const { targetId, userId, reactionType = 'like' } = params;
    try {
      // Find existing like
      const existing = await databases.listDocuments(this.dbId, this.likesCol, [
        Query.equal('targetId', targetId),
        Query.equal('userId', userId),
      ]);

      const postDoc = await databases.getDocument(this.dbId, this.postsCol, targetId);
      const jazakallah = postDoc.jazakallahCount || 0;
      const barakallah = postDoc.barakallahCount || 0;
      const ameen = postDoc.ameenCount || 0;
      const likesCount = postDoc.likesCount || 0;

      if (existing.total > 0) {
        const currentLikeDoc = existing.documents[0];
        const currentType = currentLikeDoc.reactionType || 'like';

        if (currentType === reactionType) {
          // Remove like
          await databases.deleteDocument(this.dbId, this.likesCol, currentLikeDoc.$id);
          
          const updates: Record<string, number> = {
            likesCount: Math.max(0, likesCount - 1),
          };
          if (reactionType === 'jazakallah') updates.jazakallahCount = Math.max(0, jazakallah - 1);
          if (reactionType === 'barakallah') updates.barakallahCount = Math.max(0, barakallah - 1);
          if (reactionType === 'ameen') updates.ameenCount = Math.max(0, ameen - 1);

          await databases.updateDocument(this.dbId, this.postsCol, targetId, updates);
          return { action: 'removed' };
        } else {
          // Switch reaction
          await databases.updateDocument(this.dbId, this.likesCol, currentLikeDoc.$id, {
            reactionType,
          });

          const updates: Record<string, number> = {};
          if (currentType === 'jazakallah') updates.jazakallahCount = Math.max(0, jazakallah - 1);
          if (currentType === 'barakallah') updates.barakallahCount = Math.max(0, barakallah - 1);
          if (currentType === 'ameen') updates.ameenCount = Math.max(0, ameen - 1);

          if (reactionType === 'jazakallah') updates.jazakallahCount = (updates.jazakallahCount ?? jazakallah) + 1;
          if (reactionType === 'barakallah') updates.barakallahCount = (updates.barakallahCount ?? barakallah) + 1;
          if (reactionType === 'ameen') updates.ameenCount = (updates.ameenCount ?? ameen) + 1;

          await databases.updateDocument(this.dbId, this.postsCol, targetId, updates);
          return { action: 'switched', activeReaction: reactionType };
        }
      } else {
        // Add new like
        await databases.createDocument(this.dbId, this.likesCol, ID.unique(), {
          targetId,
          targetType: 'post',
          userId,
          reactionType,
        });

        const updates: Record<string, number> = {
          likesCount: likesCount + 1,
        };
        if (reactionType === 'jazakallah') updates.jazakallahCount = jazakallah + 1;
        if (reactionType === 'barakallah') updates.barakallahCount = barakallah + 1;
        if (reactionType === 'ameen') updates.ameenCount = ameen + 1;

        await databases.updateDocument(this.dbId, this.postsCol, targetId, updates);
        return { action: 'added', activeReaction: reactionType };
      }
    } catch (error) {
      console.error('[AppwriteGamaaService] toggleLike error:', error);
      throw error;
    }
  }

  /**
   * Get user's active reaction on a post
   */
  public static async getUserReaction(targetId: string, userId: string): Promise<string | null> {
    try {
      const res = await databases.listDocuments(this.dbId, this.likesCol, [
        Query.equal('targetId', targetId),
        Query.equal('userId', userId),
      ]);
      if (res.total > 0) {
        return res.documents[0].reactionType || 'like';
      }
      return null;
    } catch {
      return null;
    }
  }

  // ==========================================
  // 4. CAMPAIGNS (حملات التسبيح والأهداف المشتركة)
  // ==========================================

  /**
   * Fetch Dhikr campaigns
   */
  public static async getCampaigns(status: 'active' | 'completed' | 'all' = 'active'): Promise<AppwriteCampaign[]> {
    try {
      const queries = [Query.orderDesc('$createdAt'), Query.limit(50)];
      if (status !== 'all') {
        queries.push(Query.equal('status', status));
      }

      const res = await databases.listDocuments(this.dbId, this.campaignsCol, queries);
      return res.documents.map((d: any) => ({
        $id: d.$id,
        title: d.title,
        targetCount: Number(d.targetCount) || 1000,
        currentCount: Number(d.currentCount) || 0,
        dhikrType: d.dhikrType || 'subhanallah',
        creatorId: d.creatorId || '',
        creatorName: d.creatorName || '',
        status: d.status || 'active',
        description: d.description || '',
        createdAt: d.$createdAt,
      }));
    } catch (error) {
      console.warn('[AppwriteGamaaService] getCampaigns error:', error);
      return [];
    }
  }

  /**
   * Create a new campaign
   */
  public static async createCampaign(campaign: {
    title: string;
    targetCount: number;
    dhikrType: string;
    creatorId: string;
    creatorName?: string;
    description?: string;
  }): Promise<AppwriteCampaign> {
    try {
      const doc = await databases.createDocument(
        this.dbId,
        this.campaignsCol,
        ID.unique(),
        {
          title: campaign.title,
          targetCount: campaign.targetCount,
          currentCount: 0,
          dhikrType: campaign.dhikrType,
          creatorId: campaign.creatorId,
          creatorName: campaign.creatorName || '',
          description: campaign.description || '',
          status: 'active',
        }
      );

      return {
        $id: doc.$id,
        title: doc.title,
        targetCount: doc.targetCount,
        currentCount: doc.currentCount,
        dhikrType: doc.dhikrType,
        creatorId: doc.creatorId,
        creatorName: doc.creatorName,
        status: doc.status,
        description: doc.description,
        createdAt: doc.$createdAt,
      };
    } catch (error) {
      console.error('[AppwriteGamaaService] createCampaign error:', error);
      throw error;
    }
  }

  /**
   * Participate in a Dhikr campaign
   */
  public static async participateInCampaign(
    campaignId: string,
    count: number,
    _userId?: string
  ): Promise<number> {
    try {
      const camp = await databases.getDocument(this.dbId, this.campaignsCol, campaignId);
      const newTotal = (camp.currentCount || 0) + count;
      const isCompleted = newTotal >= camp.targetCount;

      await databases.updateDocument(this.dbId, this.campaignsCol, campaignId, {
        currentCount: newTotal,
        status: isCompleted ? 'completed' : 'active',
      });

      return newTotal;
    } catch (error) {
      console.error('[AppwriteGamaaService] participateInCampaign error:', error);
      throw error;
    }
  }

  /**
   * Delete a campaign (Admin only)
   */
  public static async deleteCampaign(campaignId: string): Promise<boolean> {
    try {
      await databases.deleteDocument(this.dbId, this.campaignsCol, campaignId);
      return true;
    } catch (error) {
      console.error('[AppwriteGamaaService] deleteCampaign error:', error);
      throw error;
    }
  }

  // ==========================================
  // 5. PROFILES & ADMIN ROLE (الملف الشخصي وصلاحيات المشرف)
  // ==========================================

  /**
   * Retrieve user profile from Appwrite `profiles` collection
   */
  public static async getProfile(userId: string): Promise<AppwriteProfile | null> {
    if (!userId) return null;
    try {
      // 1. Try direct doc retrieval by userId as ID
      try {
        const doc = await databases.getDocument(this.dbId, this.profilesCol, userId);
        return this.mapDocToProfile(doc);
      } catch {
        // Fallback: Query by field `userId`
        const res = await databases.listDocuments(this.dbId, this.profilesCol, [
          Query.equal('userId', userId),
          Query.limit(1),
        ]);
        if (res.total > 0) {
          return this.mapDocToProfile(res.documents[0]);
        }
      }
      return null;
    } catch (error) {
      console.warn('[AppwriteGamaaService] getProfile notice:', error);
      return null;
    }
  }

  /**
   * Check if a user is an admin from Appwrite `profiles` table via `role` field
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
   * Create or update profile in Appwrite
   */
  public static async upsertProfile(
    userId: string,
    data: Partial<AppwriteProfile>
  ): Promise<AppwriteProfile> {
    try {
      const existing = await this.getProfile(userId);

      if (existing && existing.$id) {
        const updated = await databases.updateDocument(
          this.dbId,
          this.profilesCol,
          existing.$id,
          {
            ...data,
            updatedAt: new Date().toISOString(),
          }
        );
        return this.mapDocToProfile(updated);
      } else {
        const created = await databases.createDocument(
          this.dbId,
          this.profilesCol,
          userId, // Use userId as doc ID for instant lookup
          {
            userId,
            displayName: data.displayName || 'مستخدم أثر',
            email: data.email || '',
            avatarUrl: data.avatarUrl || '',
            role: data.role || 'user',
            xp: data.xp || 0,
            streakDays: data.streakDays || 0,
            level: data.level || 1,
            bio: data.bio || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        );
        return this.mapDocToProfile(created);
      }
    } catch (error) {
      console.error('[AppwriteGamaaService] upsertProfile error:', error);
      throw error;
    }
  }

  /**
   * Synchronize XP and Streak to Appwrite profile
   */
  public static async syncGamification(
    userId: string,
    gamification: { xp?: number; streakDays?: number; level?: number }
  ): Promise<void> {
    try {
      const existing = await this.getProfile(userId);
      if (existing && existing.$id) {
        await databases.updateDocument(this.dbId, this.profilesCol, existing.$id, {
          ...(gamification.xp !== undefined && { xp: gamification.xp }),
          ...(gamification.streakDays !== undefined && { streakDays: gamification.streakDays }),
          ...(gamification.level !== undefined && { level: gamification.level }),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.warn('[AppwriteGamaaService] syncGamification notice:', error);
    }
  }

  // ==========================================
  // 6. STORAGE (رفع الصور)
  // ==========================================

  /**
   * Upload an avatar or post image to Appwrite storage bucket
   */
  public static async uploadAvatar(file: File): Promise<string> {
    try {
      const response = await storage.createFile(
        APPWRITE_CONFIG.bucketAvatarsId,
        ID.unique(),
        file
      );

      // Return file view/preview URL
      const fileUrl = `${APPWRITE_CONFIG.endpoint}/storage/buckets/${APPWRITE_CONFIG.bucketAvatarsId}/files/${response.$id}/view?project=${APPWRITE_CONFIG.projectId}`;
      return fileUrl;
    } catch (error) {
      console.error('[AppwriteGamaaService] uploadAvatar error:', error);
      throw error;
    }
  }

  // ==========================================
  // Internal Helpers
  // ==========================================

  private static mapDocToPost(doc: any): GamaaPost {
    return {
      id: doc.$id,
      authorId: doc.authorId,
      authorName: doc.authorName || 'فاعل خير',
      authorPhoto: doc.authorPhoto || '',
      authorLevel: doc.authorLevel || 1,
      content: doc.content || '',
      commentsCount: doc.commentsCount || 0,
      reactionsCount: {
        jazakallah: doc.jazakallahCount || 0,
        barakallah: doc.barakallahCount || 0,
        ameen: doc.ameenCount || 0,
      },
      mediaUrl: doc.mediaUrl || '',
      createdAt: doc.$createdAt || new Date().toISOString(),
      updatedAt: doc.$updatedAt || doc.$createdAt,
    };
  }

  private static mapDocToProfile(doc: any): AppwriteProfile {
    return {
      $id: doc.$id,
      userId: doc.userId,
      displayName: doc.displayName,
      email: doc.email,
      avatarUrl: doc.avatarUrl,
      role: doc.role || 'user',
      xp: doc.xp || 0,
      streakDays: doc.streakDays || 0,
      level: doc.level || 1,
      bio: doc.bio,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
