import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User,
  UserCredential,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface UserProfileData {
  uid: string;
  displayName: string;
  email: string;
  createdAt: string;
  updatedAt?: string;
}

export class AuthService {
  /**
   * Subscribe to Firebase Auth state changes
   */
  static subscribeToAuthState(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, (user) => {
      callback(user);
    });
  }

  /**
   * Get current authenticated user
   */
  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * Register a new user with Email, Password, and Display Name,
   * then store user record in Cloud Firestore under 'users/{uid}'
   */
  static async register(
    email: string,
    pass: string,
    displayName: string
  ): Promise<UserCredential> {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const user = cred.user;

    // Update Firebase Auth profile
    if (displayName.trim()) {
      try {
        await updateProfile(user, { displayName: displayName.trim() });
      } catch (e) {
        console.warn('Failed to update auth display name:', e);
      }
    }

    // Save record to Cloud Firestore in collection 'users'
    const userDocPath = `users/${user.uid}`;
    try {
      const profileData: UserProfileData = {
        uid: user.uid,
        displayName: displayName.trim() || user.email?.split('@')[0] || 'مستخدم أثر',
        email: user.email || email.trim(),
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', user.uid), profileData);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, userDocPath);
    }

    return cred;
  }

  /**
   * Sign in with Email and Password
   */
  static async login(email: string, pass: string): Promise<UserCredential> {
    return await signInWithEmailAndPassword(auth, email.trim(), pass);
  }

  /**
   * Sign out current user
   */
  static async logout(): Promise<void> {
    await signOut(auth);
  }

  /**
   * Fetch user profile from Firestore
   */
  static async getUserProfile(uid: string): Promise<UserProfileData | null> {
    const path = `users/${uid}`;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        return snap.data() as UserProfileData;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  }

  /**
   * Human-friendly Arabic error message translator for Firebase Auth codes
   */
  static translateAuthError(codeOrMessage: string): string {
    if (codeOrMessage.includes('auth/email-already-in-use')) {
      return 'البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.';
    }
    if (codeOrMessage.includes('auth/invalid-email')) {
      return 'صيغة البريد الإلكتروني غير صحيحة، يرجى التحقق.';
    }
    if (codeOrMessage.includes('auth/weak-password')) {
      return 'كلمة المرور ضعيفة جداً. يرجى اختيار 6 أحرف أو أكثر.';
    }
    if (
      codeOrMessage.includes('auth/invalid-credential') ||
      codeOrMessage.includes('auth/user-not-found') ||
      codeOrMessage.includes('auth/wrong-password')
    ) {
      return 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد وكلمة المرور.';
    }
    if (codeOrMessage.includes('auth/too-many-requests')) {
      return 'محاولات دخول كثيرة متتالية، يرجى الانتظار قليلاً والمحاولة مجدداً.';
    }
    if (codeOrMessage.includes('auth/network-request-failed')) {
      return 'تعذر الاتصال بالشبكة، يرجى التحقق من اتصال الإنترنت.';
    }
    return 'حدث خطأ أثناء المعالجة، يرجى المحاولة مرة أخرى.';
  }
}
