import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential,
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
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import firebaseAppletConfig from '../../firebase-applet-config.json';
import { StorageService } from './storageService';
import { GamificationService } from './gamificationService';

export const GOOGLE_WEB_CLIENT_ID = '135467811448-5hq4b4jfhod5vk5gm5shssv9tfdhidf5.apps.googleusercontent.com';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface ProfilePrivacySettings {
  isPrivate: boolean;
  hideStats: boolean;
  hideStreak: boolean;
  hideAchievements: boolean;
  hideJoinDate: boolean;
}

export const DEFAULT_PRIVACY_SETTINGS: ProfilePrivacySettings = {
  isPrivate: true,
  hideStats: true,
  hideStreak: true,
  hideAchievements: true,
  hideJoinDate: false,
};

export interface UserProfileData {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  username?: string;
  bio?: string;
  createdAt: string;
  updatedAt?: string;
  streakDays?: number;
  level?: number;
  xp?: number;
  isPublicProfile?: boolean;
  privacy?: ProfilePrivacySettings;
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
    return onAuthStateChanged(auth, async (user) => {
      if (user && !user.isAnonymous) {
        StorageService.migrateGuestDataToUser(user.uid);
        GamificationService.syncUserActivitiesToCloud(user.uid).catch(() => {});
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('athar_auth_switched', { detail: { uid: user.uid, isGuest: false } })
          );
        }
      } else {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('athar_auth_switched', { detail: { uid: 'guest', isGuest: true } })
          );
        }
      }
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
   * Google Sign-In via Native Capacitor Plugin
   */
  static async signInWithGoogle(): Promise<UserCredential | null> {
    try {
      if (Capacitor.isNativePlatform()) {
        try {
          await GoogleAuth.initialize({
            clientId: GOOGLE_WEB_CLIENT_ID,
            scopes: ['profile', 'email'],
            grantOfflineAccess: true,
          });
        } catch (initErr) {
          console.warn('GoogleAuth already initialized or notice:', initErr);
        }

        const googleUser = await GoogleAuth.signIn();
        const idToken = googleUser.authentication.idToken;

        if (!idToken) {
          throw new Error('لم يتم استرداد رمز المصادقة (idToken) من جوجل.');
        }

        const credential = GoogleAuthProvider.credential(idToken);
        const cred = await signInWithCredential(auth, credential);

        if (cred && cred.user) {
          await this.syncGoogleUserRecord(cred.user);
        }

        return cred;
      } else {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
          prompt: 'select_account',
        });
        throw new Error('تسجيل الدخول عبر Google مخصص للأجهزة الذكية حالياً.');
      }
    } catch (err: any) {
      console.warn('Google Sign-In native error:', err);
      
      // طباعة التنبيه بالتفصيل المباشر على شاشة الموبايل
      const errDetail = err?.message || err?.code || JSON.stringify(err);
      if (typeof window !== 'undefined') {
        alert(`تشخيص خطأ Google:\n${errDetail}`);
      }

      throw err;
    }
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
      if (Capacitor.isNativePlatform()) {
        await GoogleAuth.signOut();
      }
    } catch {}

    try {
      localStorage.removeItem('athar_guest_mode');
    } catch {}

    await signOut(auth);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('athar_auth_switched', { detail: { uid: 'guest', isGuest: true } })
      );
    }
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

  static getPrivacySettings(uid?: string): ProfilePrivacySettings {
    const targetUid = uid || this.getCurrentUser()?.uid || 'guest';
    try {
      const stored = localStorage.getItem(`athar_privacy_settings_${targetUid}`);
      if (stored) {
        return { ...DEFAULT_PRIVACY_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {}
    return { ...DEFAULT_PRIVACY_SETTINGS };
  }

  static setPrivacySettings(settings: Partial<ProfilePrivacySettings>, uid?: string): ProfilePrivacySettings {
    const targetUid = uid || this.getCurrentUser()?.uid || 'guest';
    const current = this.getPrivacySettings(targetUid);
    const updated: ProfilePrivacySettings = { ...current, ...settings };
    try {
      localStorage.setItem(`athar_privacy_settings_${targetUid}`, JSON.stringify(updated));
    } catch {}
    return updated;
  }

  static validateProfileFields(data: Partial<UserProfileData>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.displayName !== undefined) {
      const name = data.displayName.trim();
      if (name.length < 2) errors.push('الاسم يجب ألا يقل عن حرفين.');
      if (name.length > 120) errors.push('الاسم لا يمكن أن يتجاوز 120 حرفاً.');
    }

    if (data.username !== undefined && data.username.trim() !== '') {
      const userHandle = data.username.trim().replace(/^@+/, '');
      if (userHandle.length > 50) errors.push('اسم المستخدم لا يمكن أن يتجاوز 50 حرفاً.');
      if (!/^[a-zA-Z0-9_.]+$/.test(userHandle)) {
        errors.push('اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام ونقاط فقط.');
      }
    }

    if (data.bio !== undefined && data.bio.length > 300) {
      errors.push('النية أو النبذة التعريفية لا تتجاوز 300 حرف.');
    }

    if (data.photoURL !== undefined && data.photoURL.length > 2048) {
      errors.push('رابط الصورة الشخصية طويل جداً.');
    }

    return { valid: errors.length === 0, errors };
  }

  static async updateUserProfile(uid: string, updates: Partial<UserProfileData>): Promise<void> {
    const validation = this.validateProfileFields(updates);
    if (!validation.valid) {
      throw new Error(validation.errors.join(' '));
    }

    const userDocRef = doc(db, 'users', uid);

    try {
      const sanitizedUpdates: Record<string, any> = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      if (updates.username) {
        sanitizedUpdates.username = updates.username.trim().replace(/^@+/, '');
      }

      if (updates.displayName) {
        sanitizedUpdates.displayName = updates.displayName.trim();
      }

      Object.keys(sanitizedUpdates).forEach(
        (key) => sanitizedUpdates[key] === undefined && delete sanitizedUpdates[key]
      );

      await setDoc(userDocRef, sanitizedUpdates, { merge: true });

      if (auth.currentUser && auth.currentUser.uid === uid) {
        const authUpdates: { displayName?: string; photoURL?: string } = {};
        if (updates.displayName) authUpdates.displayName = updates.displayName.trim();
        if (updates.photoURL !== undefined) authUpdates.photoURL = updates.photoURL;

        if (Object.keys(authUpdates).length > 0) {
          try {
            await updateProfile(auth.currentUser, authUpdates);
          } catch (e) {
            console.warn('Notice: auth profile update deferred:', e);
          }
        }
      }

      try {
        const cachedRaw = localStorage.getItem('athar_cached_profile');
        const cached = cachedRaw ? JSON.parse(cachedRaw) : {};
        const merged = { ...cached, ...sanitizedUpdates, uid };
        localStorage.setItem('athar_cached_profile', JSON.stringify(merged));
      } catch {}
    } catch (err) {
      console.error('Error updating user profile in Firestore:', err);
      throw err;
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

    if (rawCode.includes('auth/popup-closed-by-user') || rawCode.includes('cancel') || rawCode.includes('12501')) {
      return {
        code: 'auth/popup-closed-by-user',
        title: 'إلغاء تسجيل الدخول',
        message: 'تم إغلاق نافذة المصادقة قبل إتمام العملية. يمكنك المحاولة مرة أخرى.',
        suggestedAction: 'retry',
      };
    }

    if (rawCode.includes('auth/weak-password')) {
      return {
        code: 'auth/weak-password',
        title: 'كلمة المرور ضعيفة',
        message: 'كلمة المرور المدخلة ضعيفة، يرجى كتابة كلمة مرور لا تقل عن 6 أحرف.',
        suggestedAction: 'retry',
      };
    }

    if (rawCode.includes('auth/operation-not-allowed')) {
      return {
        code: 'auth/operation-not-allowed',
        title: 'مزود الخدمة غير مفعل',
        message: 'طريقة تسجيل الدخول هذه غير مفعلة حالياً في خادم المصادقة.',
        suggestedAction: 'retry',
      };
    }

    if (rawCode.includes('auth/unauthorized-domain')) {
      return {
        code: 'auth/unauthorized-domain',
        title: 'نطاق غير مصرح به',
        message: 'هذا النطاق غير مصرح به في قائمة نطاقات Firebase المصرحة.',
        suggestedAction: 'retry',
      };
    }

    if (rawCode.includes('auth/developer-error-10') || rawCode.includes('developer-error')) {
      return {
        code: 'auth/developer-error-10',
        title: 'تنبيه في إعدادات التطبيق (Developer Error 10)',
        message: 'خطأ Developer Error 10: يرجى التحقق من مطابقة بصمة SHA-1 في Firebase Console.',
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
