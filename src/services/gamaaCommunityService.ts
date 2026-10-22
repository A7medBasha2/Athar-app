import { db, auth } from '../firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  increment,
  onSnapshot,
  runTransaction,
  writeBatch,
  DocumentSnapshot,
  Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { GamaaPost, GamaaComment, GamaaReactionType } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const POSTS_COLLECTION = 'community_posts';
const RATE_LIMITS_COLLECTION = 'user_rate_limits';
const RATE_LIMIT_SECONDS = 120; // 2 minutes cooldown

export class GamaaCommunityService {
  /**
   * Listen to the latest community posts with real-time updates
   */
  public static listenToPosts(
    callback: (posts: GamaaPost[]) => void,
    onError?: (error: Error) => void,
    postsLimit = 30
  ): Unsubscribe {
    const q = query(
      collection(db, POSTS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(postsLimit)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const posts: GamaaPost[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            authorId: data.authorId || '',
            authorName: data.authorName || 'فاعل خير',
            authorPhoto: data.authorPhoto || '',
            authorLevel: data.authorLevel || 1,
            content: data.content || '',
            commentsCount: data.commentsCount || 0,
            reactionsCount: {
              jazakallah: data.reactionsCount?.jazakallah || 0,
              barakallah: data.reactionsCount?.barakallah || 0,
              ameen: data.reactionsCount?.ameen || 0,
            },
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });
        callback(posts);
      },
      (error) => {
        console.warn('[Gamaa] Snapshot error:', error);
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.GET, POSTS_COLLECTION);
      }
    );
  }

  /**
   * Fetch the latest community posts once (useful for explicit pull-to-refresh)
   */
  public static async fetchLatestPosts(postsLimit = 30): Promise<GamaaPost[]> {
    try {
      const q = query(
        collection(db, POSTS_COLLECTION),
        orderBy('createdAt', 'desc'),
        limit(postsLimit)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          authorId: data.authorId || '',
          authorName: data.authorName || 'فاعل خير',
          authorPhoto: data.authorPhoto || '',
          authorLevel: data.authorLevel || 1,
          content: data.content || '',
          commentsCount: data.commentsCount || 0,
          reactionsCount: {
            jazakallah: data.reactionsCount?.jazakallah || 0,
            barakallah: data.reactionsCount?.barakallah || 0,
            ameen: data.reactionsCount?.ameen || 0,
          },
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, POSTS_COLLECTION);
    }
  }

  /**
   * Paginated fetch for older posts
   */
  public static async fetchMorePosts(
    lastVisible: DocumentSnapshot,
    pageSize = 20
  ): Promise<{ posts: GamaaPost[]; lastDoc: DocumentSnapshot | null }> {
    try {
      const q = query(
        collection(db, POSTS_COLLECTION),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        limit(pageSize)
      );
      const snapshot = await getDocs(q);
      const posts: GamaaPost[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          authorId: data.authorId || '',
          authorName: data.authorName || 'فاعل خير',
          authorPhoto: data.authorPhoto || '',
          authorLevel: data.authorLevel || 1,
          content: data.content || '',
          commentsCount: data.commentsCount || 0,
          reactionsCount: {
            jazakallah: data.reactionsCount?.jazakallah || 0,
            barakallah: data.reactionsCount?.barakallah || 0,
            ameen: data.reactionsCount?.ameen || 0,
          },
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });

      const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
      return { posts, lastDoc: newLastDoc };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, POSTS_COLLECTION);
    }
  }

  /**
   * Check rate-limit cooldown remaining seconds for the user
   */
  public static async checkRateLimitRemaining(userId: string): Promise<number> {
    try {
      const docRef = doc(db, RATE_LIMITS_COLLECTION, userId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return 0;

      const data = snap.data();
      const lastPostAt = data?.lastPostAt;
      if (!lastPostAt) return 0;

      const lastPostTime = lastPostAt instanceof Timestamp ? lastPostAt.toMillis() : new Date(lastPostAt).getTime();
      const elapsedSeconds = Math.floor((Date.now() - lastPostTime) / 1000);

      const remaining = RATE_LIMIT_SECONDS - elapsedSeconds;
      return remaining > 0 ? remaining : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Create a new text post in the community
   */
  public static async createPost(
    content: string,
    author: { uid: string; displayName: string; photoURL?: string; level?: number }
  ): Promise<string> {
    const trimmed = content.trim();
    if (trimmed.length < 3) {
      throw new Error('محتوى المنشور قصير جداً (٣ أحرف على الأقل)');
    }
    if (trimmed.length > 600) {
      throw new Error('محتوى المنشور تجاوز الحد المسموح (٦٠٠ حرف كحد أقصى)');
    }

    const remainingSec = await this.checkRateLimitRemaining(author.uid);
    if (remainingSec > 0) {
      throw new Error(`يرجى الانتظار ${remainingSec} ثانية قبل نشر مشاركة جديدة حفظاً لهدوء الجماعة`);
    }

    const postDocRef = doc(collection(db, POSTS_COLLECTION));
    const rateLimitDocRef = doc(db, RATE_LIMITS_COLLECTION, author.uid);

    try {
      const batch = writeBatch(db);

      // 1. Post document
      batch.set(postDocRef, {
        id: postDocRef.id,
        authorId: author.uid,
        authorName: (author.displayName || 'فاعل خير').substring(0, 120),
        authorPhoto: author.photoURL || '',
        authorLevel: author.level || 1,
        content: trimmed,
        commentsCount: 0,
        reactionsCount: {
          jazakallah: 0,
          barakallah: 0,
          ameen: 0,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. Rate limit update
      batch.set(
        rateLimitDocRef,
        {
          userId: author.uid,
          lastPostAt: serverTimestamp(),
          totalPosts: increment(1),
        },
        { merge: true }
      );

      await batch.commit();
      return postDocRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, POSTS_COLLECTION);
    }
  }

  /**
   * Delete post (owner or moderator)
   */
  public static async deletePost(postId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, POSTS_COLLECTION, postId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${POSTS_COLLECTION}/${postId}`);
    }
  }

  /**
   * Listen to comments on a post
   */
  public static listenToComments(
    postId: string,
    callback: (comments: GamaaComment[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const q = query(
      collection(db, POSTS_COLLECTION, postId, 'comments'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const comments: GamaaComment[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            postId,
            authorId: data.authorId || '',
            authorName: data.authorName || 'فاعل خير',
            authorPhoto: data.authorPhoto || '',
            authorLevel: data.authorLevel || 1,
            content: data.content || '',
            createdAt: data.createdAt,
          };
        });
        callback(comments);
      },
      (error) => {
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.GET, `${POSTS_COLLECTION}/${postId}/comments`);
      }
    );
  }

  /**
   * Add comment to post and increment commentsCount
   */
  public static async addComment(
    postId: string,
    content: string,
    author: { uid: string; displayName: string; photoURL?: string; level?: number }
  ): Promise<string> {
    const trimmed = content.trim();
    if (!trimmed) {
      throw new Error('التعليق لا يمكن أن يكون فارغاً');
    }
    if (trimmed.length > 300) {
      throw new Error('تجاوزت الحد المسموح للتعليق (٣٠٠ حرف كحد أقصى)');
    }

    const commentsColRef = collection(db, POSTS_COLLECTION, postId, 'comments');
    const commentDocRef = doc(commentsColRef);
    const postDocRef = doc(db, POSTS_COLLECTION, postId);

    try {
      const batch = writeBatch(db);

      batch.set(commentDocRef, {
        id: commentDocRef.id,
        postId,
        authorId: author.uid,
        authorName: (author.displayName || 'فاعل خير').substring(0, 120),
        authorPhoto: author.photoURL || '',
        authorLevel: author.level || 1,
        content: trimmed,
        createdAt: serverTimestamp(),
      });

      batch.update(postDocRef, {
        commentsCount: increment(1),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      return commentDocRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${POSTS_COLLECTION}/${postId}/comments`);
    }
  }

  /**
   * Delete comment and decrement commentsCount
   */
  public static async deleteComment(postId: string, commentId: string): Promise<void> {
    const commentRef = doc(db, POSTS_COLLECTION, postId, 'comments', commentId);
    const postRef = doc(db, POSTS_COLLECTION, postId);

    try {
      const batch = writeBatch(db);
      batch.delete(commentRef);
      batch.update(postRef, {
        commentsCount: increment(-1),
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${POSTS_COLLECTION}/${postId}/comments/${commentId}`);
    }
  }

  /**
   * Toggle a blessed spiritual reaction
   */
  public static async toggleReaction(
    postId: string,
    userId: string,
    reactionType: GamaaReactionType
  ): Promise<{ added: boolean; type: GamaaReactionType }> {
    const reactionRef = doc(db, POSTS_COLLECTION, postId, 'reactions', userId);
    const postRef = doc(db, POSTS_COLLECTION, postId);

    try {
      return await runTransaction(db, async (tx) => {
        const reactionSnap = await tx.get(reactionRef);
        const postSnap = await tx.get(postRef);

        if (!postSnap.exists()) {
          throw new Error('المنشور لم يعد متاحاً');
        }

        if (reactionSnap.exists()) {
          const currentType = reactionSnap.data()?.type as GamaaReactionType;

          if (currentType === reactionType) {
            // Remove reaction
            tx.delete(reactionRef);
            tx.update(postRef, {
              [`reactionsCount.${reactionType}`]: increment(-1),
            });
            return { added: false, type: reactionType };
          } else {
            // Switch reaction type
            tx.set(reactionRef, {
              userId,
              type: reactionType,
              createdAt: serverTimestamp(),
            });
            tx.update(postRef, {
              [`reactionsCount.${currentType}`]: increment(-1),
              [`reactionsCount.${reactionType}`]: increment(1),
            });
            return { added: true, type: reactionType };
          }
        } else {
          // New reaction
          tx.set(reactionRef, {
            userId,
            type: reactionType,
            createdAt: serverTimestamp(),
          });
          tx.update(postRef, {
            [`reactionsCount.${reactionType}`]: increment(1),
          });
          return { added: true, type: reactionType };
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${POSTS_COLLECTION}/${postId}/reactions/${userId}`);
    }
  }

  /**
   * Listen to current user's reaction for a given post
   */
  public static listenToUserReaction(
    postId: string,
    userId: string,
    callback: (reactionType: GamaaReactionType | null) => void
  ): Unsubscribe {
    const reactionRef = doc(db, POSTS_COLLECTION, postId, 'reactions', userId);
    return onSnapshot(
      reactionRef,
      (snap) => {
        if (snap.exists()) {
          callback(snap.data()?.type as GamaaReactionType);
        } else {
          callback(null);
        }
      },
      () => {
        callback(null);
      }
    );
  }

  /**
   * Check if current user is owner or has active moderator permissions
   */
  public static async checkUserPermissions(userId: string): Promise<{
    isOwner: boolean;
    isModerator: boolean;
    canDeletePosts: boolean;
  }> {
    try {
      let isOwner = false;
      let isModerator = false;
      let canDeletePosts = false;

      // 1. Roles document
      try {
        const rolesSnap = await getDoc(doc(db, 'system_config', 'roles'));
        if (rolesSnap.exists() && rolesSnap.data()?.ownerUids?.includes(userId)) {
          isOwner = true;
          canDeletePosts = true;
        }
      } catch {
        // Ignore
      }

      // 2. Moderators collection
      try {
        const modSnap = await getDoc(doc(db, 'moderators', userId));
        if (modSnap.exists()) {
          const modData = modSnap.data();
          if (modData?.active === true) {
            isModerator = true;
            if (modData.permissions?.includes('delete_post')) {
              canDeletePosts = true;
            }
          }
        }
      } catch {
        // Ignore
      }

      return { isOwner, isModerator, canDeletePosts };
    } catch {
      return { isOwner: false, isModerator: false, canDeletePosts: false };
    }
  }
}
