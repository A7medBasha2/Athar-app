import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
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

export interface AuthErrorInfo {
  code: string;
  title: string;
  message: string;
  suggestedAction?: 'register' | 'forgot_password' | 'login' | 'retry';
  actionLabel?: string;
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
   * Send password reset email
   */
  static async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email.trim());
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
   * Extract Firebase error code from various error types
   */
  static extractErrorCode(error: unknown): string {
    if (!error) return '';
    if (typeof error === 'string') {
      const match = error.match(/auth\/[a-z0-9-]+/i);
      return match ? match[0].toLowerCase() : error;
    }
    const anyErr = error as any;
    if (anyErr.code && typeof anyErr.code === 'string') {
      return anyErr.code.toLowerCase();
    }
    if (anyErr.message && typeof anyErr.message === 'string') {
      const match = anyErr.message.match(/auth\/[a-z0-9-]+/i);
      if (match) return match[0].toLowerCase();
      return anyErr.message;
    }
    return '';
  }

  /**
   * Detailed Human-friendly Arabic error message translator for Firebase Auth codes
   */
  static getAuthErrorInfo(error: unknown): AuthErrorInfo {
    const rawCode = this.extractErrorCode(error);

    if (rawCode.includes('auth/invalid-email')) {
      return {
        code: 'auth/invalid-email',
        title: 'صيغة البريد غير صحيحة',
        message: 'عنوان البريد الإلكتروني الذي أدخلته غير صالح. يرجى كتابة عنوان صحيح (مثال: name@example.com).',
        suggestedAction: 'retry',
      };
    }

    if (rawCode.includes('auth/user-not-found')) {
      return {
        code: 'auth/user-not-found',
        title: 'الحساب غير موجود',
        message: 'لم نجد أي حساب مسجل بهذا البريد الإلكتروني. هل تود إنشاء حساب سحابي جديد الآن؟',
        suggestedAction: 'register',
        actionLabel: 'إنشاء حساب جديد الآن',
      };
    }

    if (rawCode.includes('auth/wrong-password')) {
      return {
        code: 'auth/wrong-password',
        title: 'كلمة المرور غير صحيحة',
        message: 'كلمة المرور المدخلة غير صحيحة. يرجى التأكد وإعادة المحاولة أو استعادة كلمة المرور.',
        suggestedAction: 'forgot_password',
        actionLabel: 'استعادة كلمة المرور',
      };
    }

    if (rawCode.includes('auth/invalid-credential')) {
      return {
        code: 'auth/invalid-credential',
        title: 'بيانات الدخول غير صحيحة',
        message: 'البريد الإلكتروني أو كلمة المرور غير متطابقين مع سجلاتنا. يرجى التأكد من صحة البيانات.',
        suggestedAction: 'forgot_password',
        actionLabel: 'نسيت كلمة المرور؟',
      };
    }

    if (rawCode.includes('auth/email-already-in-use')) {
      return {
        code: 'auth/email-already-in-use',
        title: 'البريد مسجل مسبقاً',
        message: 'هذا البريد الإلكتروني مرتبط بحساب قائم بالفعل في أثر. يمكنك تسجيل الدخول مباشرة.',
        suggestedAction: 'login',
        actionLabel: 'تسجيل الدخول إلى حسابك',
      };
    }

    if (rawCode.includes('auth/weak-password')) {
      return {
        code: 'auth/weak-password',
        title: 'كلمة المرور ضعيفة',
        message: 'كلمة المرور قصيرة جداً. يرجى اختيار كلمة مرور من 6 خانات أو أكثر لضمان حماية حسابك.',
        suggestedAction: 'retry',
      };
    }

    if (rawCode.includes('auth/missing-password')) {
      return {
        code: 'auth/missing-password',
        title: 'كلمة المرور مطلوبة',
        message: 'يرجى كتابة كلمة المرور لإتمام العملية.',
        suggestedAction: 'retry',
      };
    }

    if (rawCode.includes('auth/missing-email')) {
      return {
        code: 'auth/missing-email',
        title: 'البريد الإلكتروني مطلوب',
        message: 'يرجى إدخال عنوان بريدك الإلكتروني للمتابعة.',
        suggestedAction: 'retry',
      };
    }

    if (rawCode.includes('auth/too-many-requests')) {
      return {
        code: 'auth/too-many-requests',
        title: 'تجاوزت الحد المسموح',
        message: 'تم حظر المحاولات مؤقتاً لحماية حسابك بسبب تكرار المحاولات غير الصحيحة. يرجى الانتظار دقيقة ثم المحاولة ثانية.',
        suggestedAction: 'retry',
      };
    }

    if (rawCode.includes('auth/network-request-failed')) {
      return {
        code: 'auth/network-request-failed',
        title: 'تعذر الاتصال بالشبكة',
        message: 'تعذر الاتصال بخوادم أثر السحابية. يرجى التأكد من اتصال هاتفك بالإنترنت ثم إعادة المحاولة.',
        suggestedAction: 'retry',
      };
    }

    if (rawCode.includes('auth/user-disabled')) {
      return {
        code: 'auth/user-disabled',
        title: 'الحساب معطّل',
        message: 'تم إيقاف هذا الحساب مؤقتاً لدواعي الأمان. يرجى التواصل مع إدارة التطبيق.',
      };
    }

    if (rawCode.includes('auth/operation-not-allowed')) {
      return {
        code: 'auth/operation-not-allowed',
        title: 'الخدمة غير مفعلة',
        message: 'طريقة تسجيل الدخول هذه غير مفعلة حالياً في خادم المشروع.',
      };
    }

    if (rawCode.includes('auth/popup-closed-by-user')) {
      return {
        code: 'auth/popup-closed-by-user',
        title: 'إلغاء العملية',
        message: 'تم إغلاق نافذة المصادقة قبل استكمال العملية.',
      };
    }

    if (rawCode.includes('auth/requires-recent-login')) {
      return {
        code: 'auth/requires-recent-login',
        title: 'يلزم إعادة الدخول',
        message: 'تتطلب هذه العملية إعادة تسجيل الدخول لدواعي أمان حسابك.',
        suggestedAction: 'login',
        actionLabel: 'تسجيل الدخول من جديد',
      };
    }

    if (rawCode.includes('auth/quota-exceeded')) {
      return {
        code: 'auth/quota-exceeded',
        title: 'الحد السحابي مؤقت',
        message: 'تم تجاوز الحد الأقصى للمحاولات مؤقتاً. يرجى المحاولة في وقت لاحق.',
      };
    }

    return {
      code: rawCode || 'unknown',
      title: 'تنبيه في المصادقة',
      message: rawCode && !rawCode.startsWith('auth/')
        ? rawCode
        : 'حدث خطأ أثناء معالجة طلبك، يرجى التحقق من البيانات والمحاولة مرة أخرى.',
      suggestedAction: 'retry',
    };
  }

  /**
   * Human-friendly Arabic error message translator for Firebase Auth codes (Simple string output)
   */
  static translateAuthError(error: unknown): string {
    const info = this.getAuthErrorInfo(error);
    return info.message;
  }
}
