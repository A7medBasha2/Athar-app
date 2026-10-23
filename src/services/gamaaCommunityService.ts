import { GamaaPost, GamaaComment, GamaaReactionType } from '../types';
import { SupabaseGamaaService } from './supabaseGamaaService';
import { AuthService } from './authService';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface CommunityErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

export class GamaaCommunityService {
  /**
   * Subscribe to real-time posts feed via Supabase
   */
  public static subscribeToFeed(
    callback: (posts: GamaaPost[]) => void,
    _onError?: (err: any) => void
  ): () => void {
    return SupabaseGamaaService.subscribeToFeed(callback);
  }

  /**
   * Alias for listenToPosts
   */
  public static listenToPosts(
    callback: (posts: GamaaPost[]) => void,
    onError?: (err: any) => void
  ): () => void {
    return this.subscribeToFeed(callback, onError);
  }

  /**
   * Fetch initial or paginated posts from Supabase
   */
  public static async fetchPosts(limit = 30, offset = 0): Promise<GamaaPost[]> {
    return await SupabaseGamaaService.getPosts(limit, offset);
  }

  /**
   * Alias for fetchLatestPosts
   */
  public static async fetchLatestPosts(limit = 30): Promise<GamaaPost[]> {
    return await this.fetchPosts(limit);
  }

  /**
   * Check post submission rate limit (cooldown in seconds)
   */
  public static async checkRateLimitRemaining(_uid: string): Promise<number> {
    // In Supabase client, rate limiting can be enforced via RLS / timestamp or client cooldown
    return 0;
  }

  /**
   * Listen to comments on a post in real-time
   */
  public static listenToComments(
    postId: string,
    callback: (comments: GamaaComment[]) => void,
    _onError?: (err: any) => void
  ): () => void {
    return SupabaseGamaaService.listenToComments(postId, callback);
  }

  /**
   * Listen to a user's reaction for a specific post
   */
  public static listenToUserReaction(
    postId: string,
    userId: string,
    callback: (reaction: GamaaReactionType | null) => void
  ): () => void {
    return SupabaseGamaaService.listenToUserReaction(postId, userId, callback);
  }

  /**
   * Create a new post in Supabase
   */
  public static async createPost(
    contentOrParams:
      | string
      | {
          content: string;
          mediaUrl?: string;
          tags?: string[];
          authorProfile?: { displayName?: string; photoURL?: string; level?: number };
        },
    extraProfile?: {
      uid?: string;
      displayName?: string;
      photoURL?: string;
      level?: number;
    }
  ): Promise<string> {
    const user = AuthService.getCurrentUser();
    const uid = extraProfile?.uid || user?.uid;
    if (!uid) {
      throw new Error('يجب تسجيل الدخول لنشر مشاركة جديدة');
    }

    let content = '';
    let mediaUrl: string | undefined;
    let authorName = extraProfile?.displayName || user?.displayName || 'فاعل خير';
    let authorPhoto = extraProfile?.photoURL || user?.photoURL || '';
    let authorLevel = extraProfile?.level || 1;

    if (typeof contentOrParams === 'string') {
      content = contentOrParams;
    } else {
      content = contentOrParams.content;
      mediaUrl = contentOrParams.mediaUrl;
      if (contentOrParams.authorProfile) {
        authorName = contentOrParams.authorProfile.displayName || authorName;
        authorPhoto = contentOrParams.authorProfile.photoURL || authorPhoto;
        authorLevel = contentOrParams.authorProfile.level || authorLevel;
      }
    }

    const trimmedContent = (content || '').trim();
    if (trimmedContent.length < 3) {
      throw new Error('محتوى المنشور قصير جداً');
    }

    const post = await SupabaseGamaaService.createPost({
      authorId: uid,
      content: trimmedContent,
      authorName,
      authorPhoto,
      authorLevel,
      mediaUrl,
    });

    return post.id;
  }

  /**
   * Delete a post from Supabase
   */
  public static async deletePost(postId: string, _authorId?: string): Promise<void> {
    await SupabaseGamaaService.deletePost(postId);
  }

  /**
   * Toggle reaction on a post in Supabase
   */
  public static async toggleReaction(
    postId: string,
    uidOrType: string | GamaaReactionType,
    optionalType?: GamaaReactionType
  ): Promise<{ added: boolean; previousReaction?: GamaaReactionType }> {
    let uid: string;
    let type: GamaaReactionType;

    if (optionalType) {
      uid = uidOrType;
      type = optionalType;
    } else {
      const user = AuthService.getCurrentUser();
      if (!user) throw new Error('يجب تسجيل الدخول للتفاعل');
      uid = user.uid;
      type = uidOrType as GamaaReactionType;
    }

    return await SupabaseGamaaService.toggleReaction(postId, uid, type);
  }

  /**
   * Fetch comments for a post from Supabase
   */
  public static async getComments(postId: string): Promise<GamaaComment[]> {
    return await SupabaseGamaaService.getComments(postId);
  }

  /**
   * Add a comment to a post in Supabase
   */
  public static async addComment(
    postId: string,
    contentOrParams:
      | string
      | {
          content: string;
          authorProfile?: { displayName?: string; photoURL?: string; level?: number };
        },
    extraProfile?: {
      uid?: string;
      displayName?: string;
      photoURL?: string;
      level?: number;
    }
  ): Promise<GamaaComment> {
    const user = AuthService.getCurrentUser();
    const uid = extraProfile?.uid || user?.uid;
    if (!uid) {
      throw new Error('يجب تسجيل الدخول لإضافة تعليق');
    }

    let content = '';
    let authorName = extraProfile?.displayName || user?.displayName || 'فاعل خير';
    let authorPhoto = extraProfile?.photoURL || user?.photoURL || '';
    let authorLevel = extraProfile?.level || 1;

    if (typeof contentOrParams === 'string') {
      content = contentOrParams;
    } else {
      content = contentOrParams.content;
      if (contentOrParams.authorProfile) {
        authorName = contentOrParams.authorProfile.displayName || authorName;
        authorPhoto = contentOrParams.authorProfile.photoURL || authorPhoto;
        authorLevel = contentOrParams.authorProfile.level || authorLevel;
      }
    }

    return await SupabaseGamaaService.addComment({
      postId,
      authorId: uid,
      content,
      authorName,
      authorPhoto,
      authorLevel,
    });
  }

  /**
   * Delete a comment from Supabase
   */
  public static async deleteComment(
    postId: string,
    commentId: string,
    _authorId?: string
  ): Promise<void> {
    await SupabaseGamaaService.deleteComment(postId, commentId);
  }

  /**
   * Pin or unpin a post (Admin only)
   */
  public static async pinPost(postId: string, isPinned: boolean): Promise<void> {
    await SupabaseGamaaService.pinPost(postId, isPinned);
  }
}
