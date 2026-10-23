import { supabase } from '../lib/supabaseClient';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { SupabaseGamaaService, SupabaseProfile } from './supabaseGamaaService';
import { StorageService } from './storageService';

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
        SupabaseGamaaService.syncGamification(user.id, {
          xp: StorageService.getXp(user.id),
          streakDays: StorageService.getCurrentStreak(user.id),
          level: StorageService.getLevel(user.id),
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
          profile = await SupabaseGamaaService.upsertProfile(data.user.id, {
            displayName: cleanName,
            email: cleanEmail,
            role: 'member',
            xp: StorageService.getXp('guest'),
            streak: StorageService.getCurrentStreak('guest'),
            level: StorageService.getLevel('guest'),
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
      const msg = String(err?.message || err || '').toLowerCase();
      if (
        msg.includes('failed to fetch') ||
        msg.includes('network') ||
        msg.includes('load failed') ||
        msg.includes('connection')
      ) {
        const netErr = new Error(
          'تعذر الاتصال بخادم المصادقة السحابي (Failed to fetch). يرجى التحقق من اتصال الهاتف بالإنترنت، أو التأكد من إعدادات الشبكة ومحاولة التسجيل مجدداً.'
        );
        (netErr as any).code = 'auth/network-error';
        throw netErr;
      }
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: pass,
    });

    if (error) {
      throw error;
    }

    if (!data.user || !data.session) {
      throw new Error('فشل تسجيل الدخول، يرجى المحاولة لاحقاً');
    }

    // Refresh profile in local cache
    try {
      await SupabaseGamaaService.getProfile(data.user.id);
    } catch {}

    return {
      user: data.user,
      session: data.session,
    };
  }

  /**
   * Sign out current user
   */
  public static async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn('[SupabaseAuth] Sign out notice:', error.message);
    }
  }

  /**
   * Send Password Reset Email via Supabase Auth
   */
  public static async resetPassword(email: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}?tab=profile` : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo,
    });

    if (error) {
      throw error;
    }
  }

  /**
   * Parse Supabase Auth errors into Arabic user-friendly titles and guidance
   */
  public static getAuthErrorInfo(err: unknown): SupabaseAuthErrorInfo {
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
