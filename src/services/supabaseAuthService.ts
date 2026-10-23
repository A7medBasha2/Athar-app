import { supabase } from '../lib/supabaseClient';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { SupabaseGamaaService, SupabaseProfile } from './supabaseGamaaService';
import { StorageService } from './storageService';
import { GamificationService } from './gamificationService';
import { isNetworkFailureError, logAuthDetail } from './authService';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

export interface SupabaseAuthErrorInfo {
  code: string;
  title: string;
  message: string;
  suggestedAction?: 'register' | 'forgot_password' | 'login' | 'retry';
  actionLabel?: string;
}

export class SupabaseAuthService {
  /**
   * Listen to auth state changes from Supabase Auth
   */
  public static onAuthStateChange(
    callback: (user: User | null, session: Session | null) => void
  ): () => void {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      if (user) {
        // Migrate guest data and sync profile
        StorageService.migrateGuestDataToUser(user.id);
        const summary = GamificationService.getGamificationSummary(user.id);
        SupabaseGamaaService.syncGamification(user.id, {
          xp: summary?.totalXP || 0,
          streakDays: 0,
          level: summary?.currentLevel || 1,
        }).catch(() => {});

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('athar_auth_switched', {
              detail: { uid: user.id, isGuest: false, email: user.email },
            })
          );
        }
      } else {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('athar_auth_switched', { detail: { uid: 'guest', isGuest: true } })
          );
        }
      }
      callback(user, session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Get current Supabase user synchronously or from session
   */
  public static async getCurrentUser(): Promise<User | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  }

  /**
   * Get current active session
   */
  public static async getSession(): Promise<Session | null> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  }

  /**
   * Sign Up with Email and Password via Supabase Auth
   */
  public static async signUp(
    email: string,
    pass: string,
    displayName: string
  ): Promise<{ user: User | null; session: Session | null; profile: SupabaseProfile | null }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = displayName.trim() || cleanEmail.split('@')[0] || 'مستخدم أثر';

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: pass,
        options: {
          data: {
            display_name: cleanName,
            full_name: cleanName,
          },
        },
      });

      if (error) {
        if (isNetworkFailureError(error)) {
          console.warn('[SupabaseAuth] Network fetch notice:', error.message);
          const netErr = new Error(
            'تعذر الاتصال بخادم المصادقة السحابي (Failed to fetch). يرجى التحقق من اتصال الهاتف بالإنترنت، أو التأكد من إعدادات الشبكة ومحاولة التسجيل مجدداً.'
          );
          (netErr as any).code = 'auth/network-error';
          throw netErr;
        }
        logAuthDetail(error);
        throw error;
      }

      let activeSession = data.session;

      // Direct sign-in fallback if immediate session is omitted (e.g. email confirmation optional or disabled)
      if (!activeSession && data.user) {
        try {
          const directLogin = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: pass,
          });
          if (directLogin.data?.session) {
            activeSession = directLogin.data.session;
          }
        } catch (loginErr: any) {
          console.warn('[SupabaseAuth] Direct sign-in attempt notice:', loginErr?.message);
        }
      }

      let profile: SupabaseProfile | null = null;
      if (data.user) {
        try {
          const summary = GamificationService.getGamificationSummary('guest');
          profile = await SupabaseGamaaService.upsertProfile(data.user.id, {
            displayName: cleanName,
            email: cleanEmail,
            role: 'member',
            xp: summary?.totalXP || 0,
            streak: 0,
            level: summary?.currentLevel || 1,
          });
        } catch (profileErr) {
          console.warn('[SupabaseAuth] Auto profile creation fallback notice:', profileErr);
        }
      }

      return {
        user: data.user,
        session: activeSession,
        profile,
      };
    } catch (err: any) {
      if (isNetworkFailureError(err)) {
        console.warn('[SupabaseAuth] Network fetch exception caught:', err?.message || err);
        const netErr = new Error(
          'تعذر الاتصال بخادم المصادقة السحابي (Failed to fetch). يرجى التحقق من اتصال الهاتف بالإنترنت، أو التأكد من إعدادات الشبكة ومحاولة التسجيل مجدداً.'
        );
        (netErr as any).code = 'auth/network-error';
        throw netErr;
      }
      logAuthDetail(err);
      throw err;
    }
  }

  /**
   * Sign In with Email and Password via Supabase Auth
   */
  public static async signIn(
    email: string,
    pass: string
  ): Promise<{ user: User; session: Session }> {
    const cleanEmail = email.trim().toLowerCase();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass,
      });

      if (error) {
        if (isNetworkFailureError(error)) {
          console.warn('[SupabaseAuth] Network fetch notice in signIn:', error.message);
          const netErr = new Error('تعذر الاتصال بخادم المصادقة السحابي');
          (netErr as any).code = 'auth/network-error';
          throw netErr;
        }

        if (error.message?.toLowerCase().includes('email not confirmed')) {
          try {
            const confirmRes = await fetch('/api/auth/confirm-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: cleanEmail }),
            });
            if (confirmRes.ok) {
              const retryLogin = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password: pass,
              });
              if (retryLogin.data?.user && retryLogin.data?.session) {
                return {
                  user: retryLogin.data.user,
                  session: retryLogin.data.session,
                };
              }
            }
          } catch (healErr) {
            console.warn('[SupabaseAuth] Auto-confirm error:', healErr);
          }
        }

        logAuthDetail(error);
        throw error;
      }

      if (!data.user || !data.session) {
        const missingErr = new Error('فشل تسجيل الدخول، يرجى المحاولة لاحقاً');
        logAuthDetail(missingErr);
        throw missingErr;
      }

      // Refresh profile in local cache
      try {
        await SupabaseGamaaService.getProfile(data.user.id);
      } catch {}

      return {
        user: data.user,
        session: data.session,
      };
    } catch (err: any) {
      if (isNetworkFailureError(err)) {
        console.warn('[SupabaseAuth] Network fetch notice in signIn catch:', err?.message || err);
        throw err;
      }
      logAuthDetail(err);
      throw err;
    }
  }

  /**
   * Google Sign In via Capacitor GoogleAuth plugin and Supabase signInWithIdToken
   */
  public static async signInWithGoogle(): Promise<{ user: User | null; session: Session | null }> {
    try {
      if (Capacitor.isNativePlatform()) {
        const WEB_CLIENT_ID = '135467811448-9dnngh3ibbtkuu41s4s1eo8iaacf6kon.apps.googleusercontent.com';

        try {
          await GoogleAuth.initialize({
            clientId: WEB_CLIENT_ID,
            scopes: ['profile', 'email'],
            grantOfflineAccess: true,
          });
        } catch (initErr) {
          console.warn('GoogleAuth initialize warning:', initErr);
        }

        let googleUser: any;
        try {
          googleUser = await GoogleAuth.signIn();
        } catch (gErr: any) {
          console.error('Capacitor GoogleAuth Native Error:', gErr);
          const nativeErrorMsg = gErr?.message || gErr?.error || JSON.stringify(gErr);
          throw new Error(`خطأ من مكتبة Google الأندرويد: ${nativeErrorMsg}`);
        }

        const idToken = googleUser?.authentication?.idToken || googleUser?.serverAuthCode;
        if (!idToken) {
          throw new Error('لم يتم استلام idToken من جوجل، يرجى التأكد من اختيار الحساب بشكل صحيح');
        }

        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
        });

        if (error) {
          console.error('Supabase Auth Error Detail:', error);
          throw error;
        }

        // إجبار تحديث الجلسة والتوجيه للداخل
        if (data?.session) {
          await supabase.auth.setSession(data.session);
        }

        return data;
      } else {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
        });
        if (error) {
          console.error('Supabase Auth Error Detail:', error);
          throw error;
        }
        return { user: null, session: null };
      }
    } catch (err: any) {
      console.error('Supabase Auth Error Detail:', err);
      throw err;
    }
  }

  /**
   * Sign out current user
   */
  public static async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      if (isNetworkFailureError(error)) {
        console.warn('[SupabaseAuth] Sign out network notice:', error.message);
      } else {
        logAuthDetail(error);
      }
    }
  }

  /**
   * Send Password Reset Email via Supabase Auth
   */
  public static async resetPassword(email: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}?tab=profile` : undefined;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

      if (error) {
        if (isNetworkFailureError(error)) {
          console.warn('[SupabaseAuth] Reset password network notice:', error.message);
          const netErr = new Error('تعذر الاتصال بخادم المصادقة السحابي');
          (netErr as any).code = 'auth/network-error';
          throw netErr;
        }
        logAuthDetail(error);
        throw error;
      }
    } catch (err: any) {
      if (isNetworkFailureError(err)) {
        console.warn('[SupabaseAuth] Reset password catch notice:', err?.message || err);
        throw err;
      }
      logAuthDetail(err);
      throw err;
    }
  }

  /**
   * Parse Supabase Auth errors into Arabic user-friendly titles and guidance
   */
  public static getAuthErrorInfo(err: unknown): SupabaseAuthErrorInfo {
    if (err && !isNetworkFailureError(err)) {
      logAuthDetail(err);
    } else if (err) {
      console.warn('[SupabaseAuth] Network auth error detail:', (err as any)?.message || err);
    }
    const defaultInfo: SupabaseAuthErrorInfo = {
      code: 'auth/unknown',
      title: 'حدث خطأ غير متوقع',
      message: 'تعذر إتمام العملية، يرجى التأكد من اتصالك بالإنترنت والمحاولة مجدداً.',
      suggestedAction: 'retry',
      actionLabel: 'إعادة المحاولة',
    };

    if (!err) return defaultInfo;

    const authErr = err as AuthError;
    const msg = String(authErr.message || authErr).toLowerCase();
    const status = authErr.status;

    if (
      msg.includes('failed to fetch') ||
      msg.includes('network') ||
      msg.includes('networkerror') ||
      msg.includes('fetch failed') ||
      msg.includes('load failed') ||
      msg.includes('connection refused') ||
      (authErr as any).code === 'auth/network-error'
    ) {
      return {
        code: 'auth/network-error',
        title: 'تعذر الاتصال بخادم المصادقة',
        message:
          'تعذر الاتصال بخادم المصادقة السحابي (Failed to fetch). يرجى التحقق من اتصال الهاتف بالإنترنت، أو مراجعة إعدادات الشبكة ومحاولة المحاولة مجدداً.',
        suggestedAction: 'retry',
        actionLabel: 'إعادة المحاولة',
      };
    }

    if (msg.includes('invalid login credentials') || msg.includes('invalid_grant')) {
      return {
        code: 'auth/invalid-credential',
        title: 'بيانات الدخول غير صحيحة',
        message: 'كلمة المرور أو البريد الإلكتروني غير متطابق. يرجى التحقق من صحة المدخلات.',
        suggestedAction: 'retry',
        actionLabel: 'إعادة المحاولة',
      };
    }

    if (msg.includes('user already registered') || msg.includes('email already in use')) {
      return {
        code: 'auth/email-already-in-use',
        title: 'البريد مسجل مسبقاً',
        message: 'يوجد حساب مسجل بالفعل بهذا البريد الإلكتروني. يمكنك تسجيل الدخول مباشرة.',
        suggestedAction: 'login',
        actionLabel: 'تسجيل الدخول',
      };
    }

    if (msg.includes('password should be at least') || msg.includes('weak_password')) {
      return {
        code: 'auth/weak-password',
        title: 'كلمة المرور ضعيفة',
        message: 'يجب أن تتكون كلمة المرور من 6 خانات أو أكثر لضمان حماية حسابك.',
        suggestedAction: 'retry',
        actionLabel: 'تعديل كلمة المرور',
      };
    }

    if (msg.includes('rate limit') || status === 429) {
      return {
        code: 'auth/rate-limit',
        title: 'محاولات متكررة',
        message: 'لقد قمت بعدة محاولات متتالية. يرجى الانتظار دقيقة واحدة ثم المحاولة مجدداً.',
        suggestedAction: 'retry',
        actionLabel: 'انتظر لحظات',
      };
    }

    if (msg.includes('email not confirmed')) {
      return {
        code: 'auth/email-not-confirmed',
        title: 'تأكيد البريد الإلكتروني',
        message: 'يرجى مراجعة بريدك الإلكتروني والضغط على رابط التفعيل للمتابعة.',
        suggestedAction: 'login',
        actionLabel: 'حسناً',
      };
    }

    return {
      code: 'auth/generic-error',
      title: 'تنبيه المصادقة',
      message: authErr.message || 'حدث خطأ أثناء الاتصال بالخادم، يرجى المحاولة لاحقاً.',
      suggestedAction: 'retry',
    };
  }
}
