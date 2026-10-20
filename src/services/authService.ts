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
  signInWithCredential,
  getRedirectResult,
  deleteUser,
  User,
  UserCredential,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
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
    isAuthenticated: boolean;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errMessage = error instanceof Error ? error.message : String(error);
  // Log strictly sanitized operational diagnostics without PII, emails, or credentials
  console.error(`Firestore [${operationType}] error at ${path || 'unknown'}:`, errMessage);
  throw new Error(`Firestore operation failed: [${operationType}] at ${path || 'unknown'}`);
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

export const GOOGLE_WEB_CLIENT_ID =
  '135467811448-5hq4b4jfhod5vk5gm5shssv9tfdhidf5.apps.googleusercontent.com';

let isGoogleAuthInitialized = false;
async function ensureGoogleAuthInitialized(): Promise<void> {
  if (isGoogleAuthInitialized) return;
  try {
    await GoogleAuth.initialize({
      clientId: GOOGLE_WEB_CLIENT_ID,
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    });
    isGoogleAuthInitialized = true;
  } catch (e) {
    console.warn('GoogleAuth.initialize notice:', e);
  }
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

    // Automatically send verification email
    try {
      await sendEmailVerification(user);
    } catch (verErr) {
      console.warn('Notice: Failed to dispatch email verification link:', verErr);
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
   * Sign in with Google:
   * Uses Native Google Auth on mobile/Capacitor to present the native account chooser
   * sheet (One-Tap / Google Play Services) without opening any external browser window
   * or causing WebView redirect errors ("The requested action is invalid").
   * In Web environments, uses Firebase signInWithPopup directly without redirect fallback.
   */
  static async signInWithGoogle(): Promise<UserCredential> {
    const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();

    if (isNative) {
      await ensureGoogleAuthInitialized();

      let googleUser: any;
      try {
        googleUser = await GoogleAuth.signIn();
      } catch (nativeErr: any) {
        console.warn('Native GoogleAuth.signIn error/cancelled:', nativeErr);
        const errMsg = nativeErr?.message || String(nativeErr || '');
        if (
          errMsg.includes('cancel') ||
          errMsg.includes('12501') ||
          errMsg.includes('canceled') ||
          errMsg.includes('The user canceled')
        ) {
          const err: any = new Error('تم إلغاء تسجيل الدخول من قبل المستخدم.');
          err.code = 'auth/popup-closed-by-user';
          throw err;
        }
        throw nativeErr;
      }

      const idToken =
        googleUser?.authentication?.idToken ||
        googleUser?.idToken ||
        (googleUser as any)?.authentication?.accessToken;

      if (!idToken) {
        throw new Error('لم يتم استلام رمز المصادقة (ID Token) من Google.');
      }

      const credential = GoogleAuthProvider.credential(idToken);
      const userCred = await signInWithCredential(auth, credential);

      if (userCred.user) {
        await this.syncGoogleUserRecord(userCred.user);
      }

      return userCred;
    }

    // Web/Desktop fallback using standard Popup (NEVER signInWithRedirect)
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
    });

    let cred: UserCredential;
    try {
      cred = await signInWithPopup(auth, provider);
    } catch (popupErr: any) {
      // Do NOT fall back to signInWithRedirect as it causes "The requested action is invalid" and white screens
      console.warn('signInWithPopup error:', popupErr);
      throw popupErr;
    }

    if (cred.user) {
      await this.syncGoogleUserRecord(cred.user);
    }

    return cred;
  }

  /**
   * Sync Google user data into Firestore 'users' collection:
   * Creates document for new users with (uid, displayName, email, photoURL, createdAt).
   * For existing users, preserves current document without overwriting.
   */
  static async syncGoogleUserRecord(user: User): Promise<void> {
    if (!user || !user.uid) return;
    const userDocRef = doc(db, 'users', user.uid);
    try {
      const snap = await getDoc(userDocRef);
      if (!snap.exists()) {
        const newProfile: UserProfileData = {
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'مستخدم أثر',
          email: user.email || `${user.uid}@athar.app`,
          photoURL: user.photoURL || '',
          createdAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, newProfile);
      }
    } catch (err) {
      console.warn('Error syncing Google user record in Firestore:', err);
    }
  }

  /**
   * Check for any pending redirect result from Google Sign-In redirect flow (Web only)
   */
  static async checkRedirectResult(): Promise<UserCredential | null> {
    if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
      return null;
    }
    try {
      const res = await getRedirectResult(auth);
      if (res && res.user) {
        await this.syncGoogleUserRecord(res.user);
      }
      return res;
    } catch (err) {
      console.warn('Error checking redirect result:', err);
      return null;
    }
  }

  /**
   * Send password reset email
   */
  static async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email.trim());
  }

  /**
   * Sign out current user from Firebase and Native Google session
   */
  static async logout(): Promise<void> {
    if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
      try {
        await GoogleAuth.signOut();
      } catch (e) {
        console.warn('Native GoogleAuth.signOut notice:', e);
      }
    }
    await signOut(auth);
  }

  /**
   * Permanently delete user account and associated cloud data:
   * 1. Deletes the user profile document in Firestore: `users/{uid}`
   * 2. Clears native Google Auth session if on mobile
   * 3. Clears local credentials, saved emails, and cached auth flags
   * 4. Deletes the Firebase Auth account
   */
  static async deleteUserAccountAndData(): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('لا يوجد حساب مسجل حالياً لحذفه.');
    }
    const uid = user.uid;
    const userDocRef = doc(db, 'users', uid);

    // 1. Delete Firestore user document
    try {
      await deleteDoc(userDocRef);
    } catch (err) {
      console.warn('Notice: Firestore user record deletion notice:', err);
    }

    // 2. Disconnect native Google Auth session if on native platform
    if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
      try {
        await GoogleAuth.signOut();
      } catch (e) {
        console.warn('Native GoogleAuth.signOut notice:', e);
      }
    }

    // 3. Clear local storage personal data & saved email
    try {
      localStorage.removeItem('athar_saved_email');
      localStorage.removeItem('athar_remember_me');
      localStorage.removeItem('athar_guest_mode');
    } catch {}

    // 4. Delete the Firebase Auth user record
    await deleteUser(user);
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

    if (
      rawCode.includes('auth/popup-closed-by-user') ||
      rawCode.includes('12501') ||
      rawCode.includes('cancel')
    ) {
      return {
        code: 'auth/popup-closed-by-user',
        title: 'إلغاء تسجيل الدخول',
        message: 'تم إغلاق نافذة اختيار حساب Google قبل إتمام العملية. يمكنك المحاولة مرة أخرى في أي وقت.',
        suggestedAction: 'retry',
      };
    }

    if (rawCode.includes('auth/popup-blocked')) {
      return {
        code: 'auth/popup-blocked',
        title: 'المتصفح حظر النافذة',
        message: 'قام المتصفح بحظر نافذة تسجيل الدخول المنبثقة. يرجى السماح بالنوافذ المنبثقة (Popups) وإعادة المحاولة.',
        suggestedAction: 'retry',
      };
    }

    if (rawCode.includes('auth/cancelled-popup-request')) {
      return {
        code: 'auth/cancelled-popup-request',
        title: 'إلغاء الطلب السابق',
        message: 'تم إلغاء طلب تسجيل الدخول نظراً لبدء طلب جديد.',
        suggestedAction: 'retry',
      };
    }

    if (rawCode.includes('auth/account-exists-with-different-credential')) {
      return {
        code: 'auth/account-exists-with-different-credential',
        title: 'البريد مسجل بوسيلة أخرى',
        message: 'هذا البريد الإلكتروني مسجل مسبقاً بكلمة مرور. يرجى تسجيل الدخول بالبريد وكلمة المرور.',
        suggestedAction: 'login',
        actionLabel: 'تسجيل الدخول بكلمة المرور',
      };
    }

    if (rawCode.includes('auth/credential-already-in-use')) {
      return {
        code: 'auth/credential-already-in-use',
        title: 'البيانات مستخدمة',
        message: 'بيانات حساب Google هذا مرتبطة بالفعل بحساب آخر مسجل في أثر.',
        suggestedAction: 'login',
      };
    }

    if (rawCode.includes('auth/unauthorized-domain')) {
      return {
        code: 'auth/unauthorized-domain',
        title: 'نطاق غير مصرح به',
        message: 'يتطلب نطاق هذا الموقع إضافته إلى النطاقات المصرح بها (Authorized Domains) في إعدادات Firebase Authentication.',
        suggestedAction: 'retry',
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
