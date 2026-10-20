import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  deleteUser,
  User,
  UserCredential,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
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

export interface UserProfileData {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
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
  static subscribeToAuthState(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, (user) => {
      callback(user);
    });
  }

  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  static async register(
    email: string,
    pass: string,
    displayName: string
  ): Promise<UserCredential> {
    const cleanEmail = email.trim().toLowerCase();
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    const user = cred.user;

    const trimmedName = displayName.trim();
    if (trimmedName) {
      try {
        await updateProfile(user, { displayName: trimmedName });
      } catch (e) {
        console.warn('Failed to update auth display name:', e);
      }
    }

    try {
      const profileData: UserProfileData = {
        uid: user.uid,
        displayName: trimmedName || cleanEmail.split('@')[0] || 'مستخدم أثر',
        email: cleanEmail,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', user.uid), profileData);
    } catch (err) {
      console.warn('Firestore profile creation notice on register:', err);
    }

    try {
      await sendEmailVerification(user);
    } catch (verErr) {
      console.warn('Notice: Failed to dispatch email verification link:', verErr);
    }

    return cred;
  }

  static async login(email: string, pass: string): Promise<UserCredential> {
    const cleanEmail = email.trim().toLowerCase();
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    if (cred.user) {
      await this.syncGoogleUserRecord(cred.user);
    }
    return cred;
  }

  /**
   * Unified Google Sign-In via Firebase Web Auth SDK
   */
  static async signInWithGoogle(): Promise<UserCredential> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
    });

    let cred: UserCredential;
    try {
      cred = await signInWithPopup(auth, provider);
    } catch (popupErr: any) {
      console.warn('Google Sign-In error:', popupErr);
      throw popupErr;
    }

    if (cred.user) {
      await this.syncGoogleUserRecord(cred.user);
    }

    return cred;
  }

  static async syncGoogleUserRecord(user: User): Promise<void> {
    if (!user || !user.uid) return;
    const userDocRef = doc(db, 'users', user.uid);
    try {
      const snap = await getDoc(userDocRef);
      if (!snap.exists()) {
        const newProfile: UserProfileData = {
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'مستخدم أثر',
          email: user.email?.toLowerCase() || `${user.uid}@athar.app`,
          photoURL: user.photoURL || '',
          createdAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, newProfile);
      }
    } catch (err) {
      console.warn('Notice: user record sync in Firestore deferred:', err);
    }
  }

  static async checkRedirectResult(): Promise<UserCredential | null> {
    return null;
  }

  static async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email.trim());
  }

  static async logout(): Promise<void> {
    try {
      localStorage.removeItem('athar_guest_mode');
    } catch {}
    await signOut(auth);
  }

  static async deleteUserAccountAndData(): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('لا يوجد حساب مسجل حالياً لحذفه.');
    }
    const uid = user.uid;
    const userDocRef = doc(db, 'users', uid);

    try {
      await deleteDoc(userDocRef);
    } catch (err) {
      console.warn('Notice: Firestore user record deletion notice:', err);
    }

    try {
      localStorage.removeItem('athar_saved_email');
      localStorage.removeItem('athar_remember_me');
      localStorage.removeItem('athar_guest_mode');
    } catch {}

    await deleteUser(user);
  }

  static async getUserProfile(uid: string): Promise<UserProfileData | null> {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        return snap.data() as UserProfileData;
      }
      return null;
    } catch (err) {
      console.error('Firestore GET error:', err);
      return null;
    }
  }

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
        message: 'البريد الإلكتروني أو كلمة المرور غير متطابقين أو جاري التحقق من إعدادات Firebase. يرجى التأكد من كتابة البريد وكلمة المرور بدقة.',
        suggestedAction: 'retry',
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

    if (rawCode.includes('auth/popup-closed-by-user') || rawCode.includes('cancel')) {
      return {
        code: 'auth/popup-closed-by-user',
        title: 'إلغاء تسجيل الدخول',
        message: 'تم إغلاق نافذة المصادقة قبل إتمام العملية. يمكنك المحاولة مرة أخرى.',
        suggestedAction: 'retry',
      };
    }

    return {
      code: rawCode || 'unknown',
      title: 'تنبيه في المصادقة',
      message: 'حدث خطأ أثناء معالجة طلبك، يرجى التأكد من البيانات أو الاتصال بالإنترنت والمحاولة مرة أخرى.',
      suggestedAction: 'retry',
    };
  }

  static translateAuthError(error: unknown): string {
    const info = this.getAuthErrorInfo(error);
    return info.message;
  }
}
