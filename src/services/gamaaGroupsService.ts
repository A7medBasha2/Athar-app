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
  increment,
  onSnapshot,
  Unsubscribe,
  where,
} from 'firebase/firestore';
import {
  CommunityGroup,
  CommunityGroupMember,
  CommunityGroupPost,
  GamaaComment,
  GamaaReactionType,
  GroupCategory,
  GroupMemberRole,
  GroupMemberStatus,
} from '../types';

export class GamaaGroupsService {
  /**
   * Create a new Islamic circle / group and automatically enroll creator as active admin
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
    const user = auth.currentUser;
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

    const groupRef = doc(collection(db, 'community_groups'));
    const groupId = groupRef.id;

    const groupPayload: Record<string, any> = {
      id: groupId,
      name: trimmedName,
      description: trimmedDesc,
      category: params.category,
      isPrivate: Boolean(params.isPrivate),
      creatorId: user.uid,
      creatorName: params.creatorProfile?.displayName || user.displayName || 'مؤسس الحلقة',
      membersCount: 1,
      postsCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(groupRef, groupPayload);

    // Enroll creator as first active admin member
    const memberRef = doc(db, 'community_groups', groupId, 'members', user.uid);
    const memberPayload: Record<string, any> = {
      userId: user.uid,
      userName: params.creatorProfile?.displayName || user.displayName || 'عضو أثر',
      userPhoto: params.creatorProfile?.photoURL || user.photoURL || '',
      userLevel: params.creatorProfile?.level || 1,
      role: 'admin',
      status: 'active',
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(memberRef, memberPayload);
    return groupId;
  }

  /**
   * Listen to groups directory with real-time updates
   */
  public static listenToGroups(
    categoryFilter?: string,
    callback?: (groups: CommunityGroup[]) => void
  ): Unsubscribe {
    if (!auth.currentUser) {
      if (callback) callback([]);
      return () => {};
    }

    let q = query(collection(db, 'community_groups'), orderBy('createdAt', 'desc'), limit(50));
    if (categoryFilter && categoryFilter !== 'all') {
      q = query(
        collection(db, 'community_groups'),
        where('category', '==', categoryFilter),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    }

    return onSnapshot(
      q,
      (snapshot) => {
        const groups: CommunityGroup[] = [];
        snapshot.docs.forEach((d) => {
          const data = d.data();
          groups.push({
            id: d.id,
            name: data.name,
            description: data.description,
            category: data.category,
            isPrivate: data.isPrivate === true,
            creatorId: data.creatorId,
            creatorName: data.creatorName,
            membersCount: typeof data.membersCount === 'number' ? data.membersCount : 1,
            postsCount: typeof data.postsCount === 'number' ? data.postsCount : 0,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });
        if (callback) callback(groups);
      },
      (err) => {
        console.warn('[GamaaGroups] listenToGroups error:', err);
      }
    );
  }

  /**
   * Check membership status of a user in a specific group
   */
  public static async getUserMembership(
    groupId: string,
    userId: string
  ): Promise<CommunityGroupMember | null> {
    if (!userId || !groupId) return null;
    try {
      const snap = await getDoc(doc(db, 'community_groups', groupId, 'members', userId));
      if (!snap.exists()) return null;
      const data = snap.data();
      return {
        userId: data.userId || snap.id,
        userName: data.userName,
        userPhoto: data.userPhoto,
        userLevel: data.userLevel,
        role: data.role || 'member',
        status: data.status || 'pending',
        joinedAt: data.joinedAt,
        updatedAt: data.updatedAt,
      };
    } catch {
      return null;
    }
  }

  /**
   * Join a public group immediately
   */
  public static async joinPublicGroup(
    groupId: string,
    userProfile?: { displayName?: string; photoURL?: string; level?: number }
  ): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('يجب تسجيل الدخول للانضمام للحلقة');
    }

    const memberRef = doc(db, 'community_groups', groupId, 'members', user.uid);
    await setDoc(memberRef, {
      userId: user.uid,
      userName: userProfile?.displayName || user.displayName || 'عضو أثر',
      userPhoto: userProfile?.photoURL || user.photoURL || '',
      userLevel: userProfile?.level || 1,
      role: 'member',
      status: 'active',
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await updateDoc(doc(db, 'community_groups', groupId), {
        membersCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('[GamaaGroups] increment count error:', e);
    }
  }

  /**
   * Request to join a private group (enters pending status awaiting creator approval)
   */
  public static async requestJoinPrivateGroup(
    groupId: string,
    userProfile?: { displayName?: string; photoURL?: string; level?: number }
  ): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('يجب تسجيل الدخول لطلب الانضمام');
    }

    const memberRef = doc(db, 'community_groups', groupId, 'members', user.uid);
    await setDoc(memberRef, {
      userId: user.uid,
      userName: userProfile?.displayName || user.displayName || 'عضو أثر',
      userPhoto: userProfile?.photoURL || user.photoURL || '',
      userLevel: userProfile?.level || 1,
      role: 'member',
      status: 'pending',
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Approve a pending member (creator or system owner only)
   */
  public static async approveMember(groupId: string, memberUid: string): Promise<void> {
    const memberRef = doc(db, 'community_groups', groupId, 'members', memberUid);
    await updateDoc(memberRef, {
      status: 'active',
      updatedAt: serverTimestamp(),
    });

    try {
      await updateDoc(doc(db, 'community_groups', groupId), {
        membersCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('[GamaaGroups] increment on approve error:', e);
    }
  }

  /**
   * Reject / remove a member or cancel request
   */
  public static async removeMember(
    groupId: string,
    memberUid: string,
    wasActive: boolean = true
  ): Promise<void> {
    const memberRef = doc(db, 'community_groups', groupId, 'members', memberUid);
    await deleteDoc(memberRef);

    if (wasActive) {
      try {
        await updateDoc(doc(db, 'community_groups', groupId), {
          membersCount: increment(-1),
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('[GamaaGroups] decrement on remove error:', e);
      }
    }
  }

  /**
   * Leave a group (self-removal)
   */
  public static async leaveGroup(groupId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    await this.removeMember(groupId, user.uid, true);
  }

  /**
   * Listen to all members in a group
   */
  public static listenToGroupMembers(
    groupId: string,
    callback: (members: CommunityGroupMember[]) => void
  ): Unsubscribe {
    const q = query(collection(db, 'community_groups', groupId, 'members'), limit(100));
    return onSnapshot(
      q,
      (snapshot) => {
        const members: CommunityGroupMember[] = [];
        snapshot.docs.forEach((d) => {
          const data = d.data();
          members.push({
            userId: data.userId || d.id,
            userName: data.userName,
            userPhoto: data.userPhoto,
            userLevel: data.userLevel,
            role: data.role || 'member',
            status: data.status || 'pending',
            joinedAt: data.joinedAt,
            updatedAt: data.updatedAt,
          });
        });
        callback(members);
      },
      (err) => {
        console.warn('[GamaaGroups] listenToGroupMembers error:', err);
      }
    );
  }

  /**
   * Delete an entire group (Admin or System Owner only)
   */
  public static async deleteGroup(groupId: string): Promise<void> {
    const groupRef = doc(db, 'community_groups', groupId);
    await deleteDoc(groupRef);
  }

  // ==========================================
  // Isolated Group Reflections (Posts & Feed)
  // ==========================================

  /**
   * Listen to isolated reflections inside a specific group
   */
  public static listenToGroupPosts(
    groupId: string,
    callback: (posts: CommunityGroupPost[]) => void
  ): Unsubscribe {
    if (!auth.currentUser) {
      callback([]);
      return () => {};
    }

    const q = query(
      collection(db, 'community_groups', groupId, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const posts: CommunityGroupPost[] = [];
        snapshot.docs.forEach((d) => {
          const data = d.data();
          posts.push({
            id: d.id,
            groupId: data.groupId || groupId,
            authorId: data.authorId,
            authorName: data.authorName,
            authorPhoto: data.authorPhoto,
            authorLevel: data.authorLevel,
            content: data.content,
            commentsCount: typeof data.commentsCount === 'number' ? data.commentsCount : 0,
            reactionsCount: {
              jazakallah: data.reactionsCount?.jazakallah || 0,
              barakallah: data.reactionsCount?.barakallah || 0,
              ameen: data.reactionsCount?.ameen || 0,
            },
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });
        callback(posts);
      },
      (err) => {
        console.warn('[GamaaGroups] listenToGroupPosts error:', err);
      }
    );
  }

  /**
   * Post a new reflection inside a group
   */
  public static async createGroupPost(
    groupId: string,
    content: string,
    authorProfile?: { displayName?: string; photoURL?: string; level?: number }
  ): Promise<string> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('يجب تسجيل الدخول للمشاركة في الحلقة');
    }

    const trimmed = (content || '').trim();
    if (trimmed.length < 3 || trimmed.length > 600) {
      throw new Error('يجب أن تكون المشاركة بين 3 و 600 حرف');
    }

    const postRef = doc(collection(db, 'community_groups', groupId, 'posts'));
    const payload: Record<string, any> = {
      id: postRef.id,
      groupId: groupId,
      authorId: user.uid,
      authorName: authorProfile?.displayName || user.displayName || 'عضو أثر',
      authorPhoto: authorProfile?.photoURL || user.photoURL || '',
      authorLevel: authorProfile?.level || 1,
      content: trimmed,
      commentsCount: 0,
      reactionsCount: {
        jazakallah: 0,
        barakallah: 0,
        ameen: 0,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(postRef, payload);

    try {
      await updateDoc(doc(db, 'community_groups', groupId), {
        postsCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    } catch {}

    return postRef.id;
  }

  /**
   * Delete a group post
   */
  public static async deleteGroupPost(groupId: string, postId: string): Promise<void> {
    const postRef = doc(db, 'community_groups', groupId, 'posts', postId);
    await deleteDoc(postRef);

    try {
      await updateDoc(doc(db, 'community_groups', groupId), {
        postsCount: increment(-1),
        updatedAt: serverTimestamp(),
      });
    } catch {}
  }

  /**
   * Toggle reaction on a group post
   */
  public static async toggleGroupPostReaction(
    groupId: string,
    postId: string,
    reactionType: GamaaReactionType,
    isActivating: boolean
  ): Promise<void> {
    const postRef = doc(db, 'community_groups', groupId, 'posts', postId);
    const delta = isActivating ? 1 : -1;
    await updateDoc(postRef, {
      [`reactionsCount.${reactionType}`]: increment(delta),
      updatedAt: serverTimestamp(),
    });
  }

  // ==========================================
  // Group Post Comments
  // ==========================================

  /**
   * Listen to comments on a group post
   */
  public static listenToGroupComments(
    groupId: string,
    postId: string,
    callback: (comments: GamaaComment[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, 'community_groups', groupId, 'posts', postId, 'comments'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const comments: GamaaComment[] = [];
        snapshot.docs.forEach((d) => {
          const data = d.data();
          comments.push({
            id: d.id,
            postId: postId,
            authorId: data.authorId,
            authorName: data.authorName,
            authorPhoto: data.authorPhoto,
            authorLevel: data.authorLevel,
            content: data.content,
            createdAt: data.createdAt,
          });
        });
        callback(comments);
      },
      (err) => {
        console.warn('[GamaaGroups] listenToGroupComments error:', err);
      }
    );
  }

  /**
   * Add a comment to a group post
   */
  public static async createGroupComment(
    groupId: string,
    postId: string,
    content: string,
    authorProfile?: { displayName?: string; photoURL?: string; level?: number }
  ): Promise<string> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('يجب تسجيل الدخول للتعليق');
    }

    const trimmed = (content || '').trim();
    if (trimmed.length < 1 || trimmed.length > 300) {
      throw new Error('يجب أن يكون التعليق بين 1 و 300 حرف');
    }

    const commentRef = doc(collection(db, 'community_groups', groupId, 'posts', postId, 'comments'));
    const payload: Record<string, any> = {
      id: commentRef.id,
      groupId: groupId,
      postId: postId,
      authorId: user.uid,
      authorName: authorProfile?.displayName || user.displayName || 'عضو أثر',
      authorPhoto: authorProfile?.photoURL || user.photoURL || '',
      authorLevel: authorProfile?.level || 1,
      content: trimmed,
      createdAt: serverTimestamp(),
    };

    await setDoc(commentRef, payload);

    try {
      await updateDoc(doc(db, 'community_groups', groupId, 'posts', postId), {
        commentsCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    } catch {}

    return commentRef.id;
  }

  /**
   * Delete a comment on a group post
   */
  public static async deleteGroupComment(
    groupId: string,
    postId: string,
    commentId: string
  ): Promise<void> {
    const commentRef = doc(db, 'community_groups', groupId, 'posts', postId, 'comments', commentId);
    await deleteDoc(commentRef);

    try {
      await updateDoc(doc(db, 'community_groups', groupId, 'posts', postId), {
        commentsCount: increment(-1),
        updatedAt: serverTimestamp(),
      });
    } catch {}
  }
}
