import { supabase } from '../lib/supabaseClient';
import { StorageService } from './storageService';
import { GamificationService } from './gamificationService';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

export const GOOGLE_WEB_CLIENT_ID = '135467811448-gjhns9dorgp398v16pvrumseoa3nadgr.apps.googleusercontent.com';

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
  isPrivate: false,
  hideStats: false,
  hideStreak: false,
  hideAchievements: false,
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
  role?: string;
  isAdmin?: boolean;
  isModerator?: boolean;
}

export interface AuthErrorInfo {
  code: string;
  title: string;
  message: string;
  suggestedAction?: 'register' | 'forgot_password' | 'login' | 'retry';
  actionLabel?: string;
}

/**
 * Standard unified User interface compatible with both Supabase and Athar UI components
 */
export interface User {
  uid: string;
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
  metadata?: {
    creationTime?: string;
    lastSignInTime?: string;
  };
  providerData?: Array<{ providerId: string }>;
}

export interface UserCredential {
  user: User;
}

// In-memory cache for synchronous getCurrentUser access
let currentAuthUser: User | null = null;
let nativeOAuthBridgeInitialized = false;
let nativePlayServicesFailedInSession = false;
let lastOAuthPayloadKey = '';
let lastOAuthProcessPromise: Promise<UserCredential | null> | null = null;

export interface ParsedOAuthCallback {
  accessToken: string | null;
  refreshToken: string | null;
  code: string | null;
  error: string | null;
  errorDescription: string | null;
}

export function parseOAuthCallbackParams(rawUrl: string): ParsedOAuthCallback {
  const empty: ParsedOAuthCallback = {
    accessToken: null,
    refreshToken: null,
    code: null,
    error: null,
    errorDescription: null,
  };
  if (!rawUrl || typeof rawUrl !== 'string') return empty;

  const merged = new URLSearchParams();
  const collect = (segment: string) => {
    if (!segment) return;
    const clean = segment.replace(/^[?#]+/, '');
    const sp = new URLSearchParams(clean);
    sp.forEach((val, key) => {
      if (val && !merged.has(key)) {
        merged.set(key, val);
      }
    });
  };

  const hashIdx = rawUrl.indexOf('#');
  const queryIdx = rawUrl.indexOf('?');

  if (queryIdx !== -1) {
    const qEnd = hashIdx !== -1 && hashIdx > queryIdx ? hashIdx : rawUrl.length;
    collect(rawUrl.slice(queryIdx + 1, qEnd));
  }
  if (hashIdx !== -1) {
    let hashPart = rawUrl.slice(hashIdx + 1);
    const intentMarker = hashPart.indexOf('#Intent;');
    if (intentMarker !== -1) {
      hashPart = hashPart.slice(0, intentMarker);
    }
    collect(hashPart);
  }

  return {
    accessToken: merged.get('access_token'),
    refreshToken: merged.get('refresh_token'),
    code: merged.get('code'),
    error: merged.get('error'),
    errorDescription: merged.get('error_description'),
  };
}

function mapSupabaseUserToAuthUser(sbUser: any): User | null {
  if (!sbUser) return null;
  const uid = sbUser.id;
  const meta = sbUser.user_metadata || {};
  const email = sbUser.email || meta.email || null;
  const displayName = meta.display_name || meta.full_name || meta.name || (email ? email.split('@')[0] : 'مستخدم أثر');
  const photoURL = meta.avatar_url || meta.picture || null;
  const provider = sbUser.app_metadata?.provider || 'email';

  return {
    uid,
    id: uid,
    email,
    displayName,
    photoURL,
    isAnonymous: false,
    metadata: {
      creationTime: sbUser.created_at,
      lastSignInTime: sbUser.last_sign_in_at,
    },
    providerData: [
      {
        providerId: provider === 'google' ? 'google.com' : 'password',
      },
    ],
  };
}

export function isNetworkFailureError(err: unknown): boolean {
  if (!err) return false;
  const anyErr = err as any;
  if (anyErr?.name === 'AuthRetryableFetchError' || anyErr?.status === 0) return true;
  const msg = String(anyErr?.message || anyErr?.code || anyErr || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('fetch failed') ||
    msg.includes('authretryablefetcherror') ||
    msg.includes('network') ||
    msg.includes('networkerror') ||
    msg.includes('load failed') ||
    msg.includes('connection') ||
    msg.includes('enotfound') ||
    msg.includes('econnrefused') ||
    msg.includes('eai_again') ||
    msg.includes('abort')
  );
}

export function logAuthDetail(err: unknown): void {
  if (isNetworkFailureError(err)) {
    console.warn('[AtharAuth] Network unreachable (seamless offline mode active):', (err as any)?.message || err);
  } else {
    console.error('Supabase Auth Error Detail:', err);
  }
}

export class AuthService {
  /**
   * Get active local user if session is running in safe offline/local mode
   */
  static getActiveLocalUser(): User | null {
    try {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem('athar_active_local_user_v1');
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {}
    return null;
  }

  /**
   * Deterministically create a local user in offline mode so users are never blocked
   */
  static createLocalUser(email: string, displayName: string, pass?: string): User {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = displayName.trim() || cleanEmail.split('@')[0] || 'مستخدم أثر';

    // Safe deterministic UID from email
    const safeHash = Math.abs(
      cleanEmail.split('').reduce((acc, c) => (acc << 5) - acc + c.charCodeAt(0), 0)
    ).toString(16);
    const uid = `athar_u_${safeHash}`;

    const localUser: User = {
      uid,
      id: uid,
      email: cleanEmail,
      displayName: cleanName,
      photoURL: null,
      isAnonymous: false,
      metadata: {
        creationTime: new Date().toISOString(),
        lastSignInTime: new Date().toISOString(),
      },
      providerData: [{ providerId: 'password' }],
    };

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('athar_active_local_user_v1', JSON.stringify(localUser));

        const existingUsersRaw = localStorage.getItem('athar_local_users_v1');
        const usersList: any[] = existingUsersRaw ? JSON.parse(existingUsersRaw) : [];
        const filtered = usersList.filter((u: any) => u.email !== cleanEmail && u.uid !== uid);
        filtered.push({
          ...localUser,
          password: pass || '',
          updatedAt: new Date().toISOString(),
        });
        localStorage.setItem('athar_local_users_v1', JSON.stringify(filtered));

        const summary = GamificationService.getGamificationSummary('guest');
        const localProfile = {
          id: uid,
          displayName: cleanName,
          email: cleanEmail,
          role: 'member',
          xp: summary?.totalXP || 0,
          streak: 0,
          level: summary?.currentLevel || 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(`athar_local_profile_${uid}`, JSON.stringify(localProfile));
      }
    } catch (e) {
      console.warn('[AuthService] Local storage user save notice:', e);
    }

    currentAuthUser = localUser;
    StorageService.migrateGuestDataToUser(uid);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('athar_auth_switched', {
          detail: { uid, isGuest: false, email: cleanEmail },
        })
      );
    }

    return localUser;
  }

  /**
   * Log into a local offline account
   */
  static loginLocalUser(email: string, pass?: string): User {
    const cleanEmail = email.trim().toLowerCase();
    try {
      if (typeof window !== 'undefined') {
        const existingUsersRaw = localStorage.getItem('athar_local_users_v1');
        if (existingUsersRaw) {
          const usersList: any[] = JSON.parse(existingUsersRaw);
          const found = usersList.find((u: any) => u.email === cleanEmail);
          if (found) {
            const user: User = {
              uid: found.uid,
              id: found.id || found.uid,
              email: found.email,
              displayName: found.displayName,
              photoURL: found.photoURL || null,
              isAnonymous: false,
              metadata: {
                creationTime: found.createdAt || new Date().toISOString(),
                lastSignInTime: new Date().toISOString(),
              },
              providerData: [{ providerId: 'password' }],
            };
            localStorage.setItem('athar_active_local_user_v1', JSON.stringify(user));
            currentAuthUser = user;
            StorageService.migrateGuestDataToUser(user.uid);
            window.dispatchEvent(
              new CustomEvent('athar_auth_switched', {
                detail: { uid: user.uid, isGuest: false, email: cleanEmail },
              })
            );
            return user;
          }
        }
      }
    } catch (e) {
      console.warn('[AuthService] Error reading local users:', e);
    }

    return this.createLocalUser(cleanEmail, cleanEmail.split('@')[0], pass);
  }

  /**
   * Subscribe to auth state changes and notify listeners with mapped User object
   */
  static subscribeToAuthState(callback: (user: User | null) => void): () => void {
    AuthService.initNativeOAuthBridge();
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        const user = mapSupabaseUserToAuthUser(session?.user);
        if (user) {
          currentAuthUser = user;
          callback(user);
        } else {
          const localUser = AuthService.getActiveLocalUser();
          currentAuthUser = localUser;
          callback(localUser);
        }
      })
      .catch(() => {
        const localUser = AuthService.getActiveLocalUser();
        currentAuthUser = localUser;
        callback(localUser);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = mapSupabaseUserToAuthUser(session?.user);
      if (user) {
        currentAuthUser = user;
        StorageService.migrateGuestDataToUser(user.uid);
        GamificationService.syncUserActivitiesToCloud(user.uid).catch(() => {});
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('athar_auth_switched', { detail: { uid: user.uid, isGuest: false } })
          );
        }
        callback(user);
      } else {
        const localUser = AuthService.getActiveLocalUser();
        currentAuthUser = localUser;
        if (localUser) {
          callback(localUser);
        } else {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('athar_auth_switched', { detail: { uid: 'guest', isGuest: true } })
            );
          }
          callback(null);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }

  static getCurrentUser(): User | null {
    if (currentAuthUser) return currentAuthUser;
    const localUser = this.getActiveLocalUser();
    if (localUser) {
      currentAuthUser = localUser;
      return localUser;
    }
    return null;
  }

  /**
   * Register a new user with Supabase Auth or seamless local safe mode if server unreachable
   */
  static async register(
    email: string,
    pass: string,
    displayName: string
  ): Promise<UserCredential> {
    const cleanEmail = email.trim().toLowerCase();
    const trimmedName = displayName.trim() || cleanEmail.split('@')[0] || 'مستخدم أثر';

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: pass,
        options: {
          data: {
            display_name: trimmedName,
            full_name: trimmedName,
          },
        },
      });

      if (error) {
        if (isNetworkFailureError(error)) {
          console.warn('[AuthService] Supabase server unreachable; activating local user fallback for:', cleanEmail);
          const localUser = AuthService.createLocalUser(cleanEmail, trimmedName, pass);
          return { user: localUser };
        }
        logAuthDetail(error);
        throw error;
      }

      if (!data.user) {
        throw new Error('فشل إنشاء الحساب، يرجى المحاولة مرة أخرى.');
      }

      try {
        await fetch('/api/auth/confirm-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        });
      } catch {}

      let authUser = mapSupabaseUserToAuthUser(data.user)!;
      currentAuthUser = authUser;

      if (!data.session) {
        try {
          const directLogin = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: pass,
          });
          if (directLogin.data?.user) {
            authUser = mapSupabaseUserToAuthUser(directLogin.data.user)!;
            currentAuthUser = authUser;
          }
        } catch (loginErr) {
          console.warn('[AuthService] Direct sign-in fallback check:', loginErr);
        }
      }

      try {
        const summary = GamificationService.getGamificationSummary('guest');
        await supabase.from('profiles').upsert({
          id: authUser.uid,
          display_name: trimmedName,
          username: cleanEmail.split('@')[0] + '_' + authUser.uid.substring(0, 4),
          avatar_url: '',
          role: 'member',
          xp: summary?.totalXP || 0,
          streak: 0,
          level: summary?.currentLevel || 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } catch (profileErr) {
        console.warn('[AuthService] Profile table upsert notice:', profileErr);
      }

      return { user: authUser };
    } catch (err: any) {
      if (isNetworkFailureError(err)) {
        console.warn('[AuthService] Supabase server unreachable; activating local user fallback for:', cleanEmail);
        const localUser = AuthService.createLocalUser(cleanEmail, trimmedName, pass);
        return { user: localUser };
      }
      logAuthDetail(err);
      throw err;
    }
  }

  /**
   * Login with email and password via Supabase Auth or seamless local safe mode
   */
  static async login(email: string, pass: string): Promise<UserCredential> {
    const cleanEmail = email.trim().toLowerCase();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass,
      });

      if (error) {
        if (isNetworkFailureError(error)) {
          console.warn('[AuthService] Supabase server unreachable; activating local user login for:', cleanEmail);
          const localUser = AuthService.loginLocalUser(cleanEmail, pass);
          return { user: localUser };
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
              if (retryLogin.data?.user) {
                const retryAuthUser = mapSupabaseUserToAuthUser(retryLogin.data.user)!;
                currentAuthUser = retryAuthUser;
                return { user: retryAuthUser };
              }
            }
          } catch (autoConfirmErr) {
            console.warn('[AuthService] Auto-confirm error:', autoConfirmErr);
          }
        }

        logAuthDetail(error);
        throw error;
      }

      if (!data.user) {
        throw new Error('فشل تسجيل الدخول، يرجى المحاولة لاحقاً');
      }

      const authUser = mapSupabaseUserToAuthUser(data.user)!;
      currentAuthUser = authUser;

      return { user: authUser };
    } catch (err: any) {
      if (isNetworkFailureError(err)) {
        console.warn('[AuthService] Supabase server unreachable; activating local user login for:', cleanEmail);
        const localUser = AuthService.loginLocalUser(cleanEmail, pass);
        return { user: localUser };
      }
      logAuthDetail(err);
      throw err;
    }
  }

  /**
   * Process an incoming OAuth callback URL (#access_token / ?code) from Native Loopback, Deep Link, or Web Redirect
   */
  static async processOAuthCallbackUrl(rawUrl: string): Promise<UserCredential | null> {
    const parsed = parseOAuthCallbackParams(rawUrl);
    if (!parsed.accessToken && !parsed.code && !parsed.error) {
      return null;
    }

    const payloadKey = `${parsed.accessToken || ''}|${parsed.code || ''}|${parsed.error || ''}`;
    if (payloadKey === lastOAuthPayloadKey && lastOAuthProcessPromise) {
      return lastOAuthProcessPromise;
    }

    lastOAuthPayloadKey = payloadKey;
    lastOAuthProcessPromise = (async (): Promise<UserCredential | null> => {
      if (parsed.error) {
        if (parsed.error === 'access_denied') {
          return null;
        }
        throw new Error(parsed.errorDescription || parsed.error);
      }

      let sessionUser: any = null;
      if (parsed.accessToken && parsed.refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: parsed.accessToken,
          refresh_token: parsed.refreshToken,
        });
        if (error) throw error;
        sessionUser = data?.user;
      } else if (parsed.code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(parsed.code);
        if (error) throw error;
        sessionUser = data?.user;
      }

      if (!sessionUser) return null;

      const authUser = mapSupabaseUserToAuthUser(sessionUser)!;
      currentAuthUser = authUser;

      try {
        StorageService.migrateGuestDataToUser(authUser.uid);
        const summary = GamificationService.getGamificationSummary(authUser.uid);
        const resolvedName =
          sessionUser.user_metadata?.full_name ||
          sessionUser.user_metadata?.name ||
          authUser.displayName ||
          'مستخدم أثر';
        const resolvedAvatar =
          sessionUser.user_metadata?.avatar_url ||
          sessionUser.user_metadata?.picture ||
          authUser.photoURL ||
          null;

        await supabase.from('profiles').upsert(
          {
            id: authUser.uid,
            display_name: resolvedName,
            email: authUser.email,
            avatar_url: resolvedAvatar,
            xp: summary?.totalXP || 0,
            level: summary?.currentLevel || 1,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id', ignoreDuplicates: false }
        );
      } catch (profileErr) {
        console.warn('[AuthService] OAuth profile upsert notice:', profileErr);
      }

      try {
        localStorage.setItem('athar_last_auth_provider', 'google');
        localStorage.removeItem('athar_guest_mode');
      } catch {}

      if (typeof window !== 'undefined') {
        try {
          if (window.location.protocol.startsWith('http') && (window.location.hash.includes('access_token=') || window.location.search.includes('code='))) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch {}
        window.dispatchEvent(
          new CustomEvent('athar_auth_switched', {
            detail: { uid: authUser.uid, isGuest: false, email: authUser.email },
          })
        );
        window.dispatchEvent(new CustomEvent('athar_navigate_tab', { detail: { tab: 'home' } }));
      }

      return { user: authUser };
    })();

    return lastOAuthProcessPromise;
  }

  /**
   * Initialize global listener for Native Android OAuth callbacks (localhost:3000 loopback & athar://auth-callback)
   */
  static initNativeOAuthBridge(): void {
    if (nativeOAuthBridgeInitialized || typeof window === 'undefined') return;
    nativeOAuthBridgeInitialized = true;

    const consumeIfPending = () => {
      try {
        const winAny = window as any;
        const fromWin = winAny.__athar_pending_oauth_url;
        if (fromWin) {
          winAny.__athar_pending_oauth_url = null;
          AuthService.processOAuthCallbackUrl(String(fromWin)).catch((e) =>
            console.warn('[AuthService] Pending window OAuth callback error:', e)
          );
        }
        const fromBridge = winAny.AtharNative?.consumePendingOAuthUrl?.();
        if (fromBridge && String(fromBridge).trim().length > 0) {
          AuthService.processOAuthCallbackUrl(String(fromBridge)).catch((e) =>
            console.warn('[AuthService] Pending native OAuth callback error:', e)
          );
        }
      } catch {}
    };

    window.addEventListener('athar_oauth_callback', (ev: any) => {
      const url = ev?.detail?.url;
      if (url) {
        (window as any).__athar_pending_oauth_url = null;
        try {
          (window as any).AtharNative?.consumePendingOAuthUrl?.();
        } catch {}
        AuthService.processOAuthCallbackUrl(String(url)).catch((e) =>
          console.warn('[AuthService] OAuth event callback error:', e)
        );
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        consumeIfPending();
      }
    });

    consumeIfPending();
  }

  /**
   * Seamless RFC 8252 Loopback + Deep-Link Google OAuth for Android devices where Play Services fails (12500 / 10)
   */
  static async signInWithGoogleLoopback(): Promise<UserCredential | null> {
    this.initNativeOAuthBridge();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'athar://auth-callback',
        skipBrowserRedirect: true,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      throw error;
    }

    const authorizeUrl = data?.url;
    if (!authorizeUrl) {
      throw new Error('تعذر تجهيز رابط مصادقة Google السحابي.');
    }

    if (typeof window === 'undefined') return null;

    const nativeBridge = (window as any).AtharNative;
    if (typeof nativeBridge?.startGoogleOAuthLoopback === 'function') {
      return new Promise<UserCredential | null>((resolve, reject) => {
        let settled = false;
        let wentBackground = false;
        const launchedAt = Date.now();
        const timers: ReturnType<typeof setTimeout>[] = [];

        const cleanup = () => {
          window.removeEventListener('athar_oauth_callback', onCallbackEvent as EventListener);
          document.removeEventListener('visibilitychange', onVisibilityChange);
          window.removeEventListener('focus', onWindowFocus);
          timers.forEach((t) => clearTimeout(t));
        };

        const finishResolve = (val: UserCredential | null) => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve(val);
        };

        const finishReject = (err: unknown) => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(err);
        };

        const handleRawUrl = async (rawUrl: string) => {
          if (!rawUrl || settled) return;
          try {
            const cred = await AuthService.processOAuthCallbackUrl(rawUrl);
            finishResolve(cred);
          } catch (err) {
            finishReject(err);
          }
        };

        const onCallbackEvent = (ev: any) => {
          const url = ev?.detail?.url;
          if (url) {
            handleRawUrl(String(url));
          }
        };

        const checkOnForegroundReturn = () => {
          if (settled) return;
          const tryCheck = async (isFinalAttempt: boolean) => {
            if (settled) return;
            try {
              const pendingUrl =
                (window as any).__athar_pending_oauth_url ||
                nativeBridge?.consumePendingOAuthUrl?.() ||
                '';
              if (pendingUrl && String(pendingUrl).trim().length > 0) {
                (window as any).__athar_pending_oauth_url = null;
                await handleRawUrl(String(pendingUrl));
                return;
              }
              const { data: sessionData } = await supabase.auth.getSession();
              if (sessionData?.session?.user) {
                const mapped = mapSupabaseUserToAuthUser(sessionData.session.user);
                if (mapped) {
                  currentAuthUser = mapped;
                  finishResolve({ user: mapped });
                  return;
                }
              }
              if (isFinalAttempt) {
                try {
                  nativeBridge?.stopGoogleOAuthLoopback?.();
                } catch {}
                finishResolve(null);
              }
            } catch {}
          };

          timers.push(setTimeout(() => tryCheck(false), 180));
          timers.push(setTimeout(() => tryCheck(false), 750));
          timers.push(setTimeout(() => tryCheck(false), 1500));
          timers.push(setTimeout(() => tryCheck(true), 2600));
        };

        const onVisibilityChange = () => {
          if (document.visibilityState === 'hidden') {
            wentBackground = true;
          } else if (document.visibilityState === 'visible' && (wentBackground || Date.now() - launchedAt > 2000)) {
            checkOnForegroundReturn();
          }
        };

        const onWindowFocus = () => {
          if (wentBackground || Date.now() - launchedAt > 2000) {
            checkOnForegroundReturn();
          }
        };

        window.addEventListener('athar_oauth_callback', onCallbackEvent as EventListener);
        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('focus', onWindowFocus);

        timers.push(
          setTimeout(() => {
            try {
              nativeBridge?.stopGoogleOAuthLoopback?.();
            } catch {}
            finishResolve(null);
          }, 180000)
        );

        const started = nativeBridge.startGoogleOAuthLoopback(authorizeUrl);
        if (!started) {
          cleanup();
          window.location.assign(authorizeUrl);
          resolve(null);
        }
      });
    }

    window.location.assign(authorizeUrl);
    return null;
  }

  /**
   * Google Sign-In via Native Capacitor Plugin with automatic Supabase OAuth Loopback Fallback
   */
  static async signInWithGoogle(): Promise<UserCredential | null> {
    try {
      this.initNativeOAuthBridge();

      if (Capacitor.isNativePlatform()) {
        if (nativePlayServicesFailedInSession) {
          return await this.signInWithGoogleLoopback();
        }

        const cleanClientId = GOOGLE_WEB_CLIENT_ID.replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();

        try {
          await GoogleAuth.initialize({
            clientId: cleanClientId,
            scopes: ['profile', 'email'],
            grantOfflineAccess: false,
          });
        } catch (initErr) {
          console.warn('GoogleAuth initialize warning:', initErr);
        }

        let googleUser: any;
        try {
          googleUser = await GoogleAuth.signIn();
        } catch (gErr: any) {
          const rawCode = String(gErr?.code || '');
          const rawMsg = String(gErr?.message || gErr?.error || JSON.stringify(gErr || ''));
          if (
            rawCode === '12501' ||
            rawCode === '12502' ||
            rawMsg.toLowerCase().includes('canceled') ||
            rawMsg.toLowerCase().includes('cancelled')
          ) {
            return null;
          }
          if (rawCode === '7' || isNetworkFailureError(gErr)) {
            throw new Error('تعذر الاتصال بخدمات Google، يرجى التحقق من اتصال الهاتف بالإنترنت.');
          }
          console.warn(
            '[AuthService] Native GoogleSignIn failed (' + rawCode + '); seamlessly switching to OAuth Loopback:',
            rawMsg
          );
          nativePlayServicesFailedInSession = true;
          return await this.signInWithGoogleLoopback();
        }

        const idToken = googleUser?.authentication?.idToken || googleUser?.idToken;
        if (!idToken) {
          console.warn('[AuthService] Missing native idToken; seamlessly switching to OAuth Loopback.');
          nativePlayServicesFailedInSession = true;
          return await this.signInWithGoogleLoopback();
        }

        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
        });

        if (error) {
          console.error('Supabase Auth Error Detail:', error);
          throw error;
        }

        if (data?.session) {
          await supabase.auth.setSession(data.session);
        }

        if (!data.user) throw new Error('فشل تسجيل الدخول بحساب Google');

        const authUser = mapSupabaseUserToAuthUser(data.user)!;
        currentAuthUser = authUser;

        try {
          StorageService.migrateGuestDataToUser(authUser.uid);
          const summary = GamificationService.getGamificationSummary(authUser.uid);
          const resolvedName =
            data.user.user_metadata?.full_name ||
            data.user.user_metadata?.name ||
            googleUser?.name ||
            googleUser?.displayName ||
            authUser.displayName ||
            'مستخدم أثر';
          const resolvedAvatar =
            data.user.user_metadata?.avatar_url ||
            data.user.user_metadata?.picture ||
            googleUser?.imageUrl ||
            authUser.photoURL ||
            null;

          await supabase.from('profiles').upsert(
            {
              id: authUser.uid,
              display_name: resolvedName,
              email: authUser.email,
              avatar_url: resolvedAvatar,
              xp: summary?.totalXP || 0,
              level: summary?.currentLevel || 1,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id', ignoreDuplicates: false }
          );
        } catch (profileSyncErr) {
          console.warn('[AuthService] Google profile upsert notice:', profileSyncErr);
        }

        try {
          localStorage.setItem('athar_last_auth_provider', 'google');
        } catch {}
        return { user: authUser };
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
        });
        if (error) {
          console.error('Supabase Auth Error Detail:', error);
          throw error;
        }
        return null;
      }
    } catch (err: any) {
      console.error('Supabase Auth Error Detail:', err);
      throw err;
    }
  }

  static async checkRedirectResult(): Promise<UserCredential | null> {
    this.initNativeOAuthBridge();

    if (typeof window !== 'undefined') {
      const pendingNativeUrl =
        (window as any).__athar_pending_oauth_url ||
        (window as any).AtharNative?.consumePendingOAuthUrl?.() ||
        '';
      if (pendingNativeUrl && String(pendingNativeUrl).trim().length > 0) {
        (window as any).__athar_pending_oauth_url = null;
        const nativeCred = await this.processOAuthCallbackUrl(String(pendingNativeUrl));
        if (nativeCred) return nativeCred;
      }

      if (
        window.location.hash.includes('access_token=') ||
        window.location.search.includes('code=') ||
        window.location.hash.includes('error=')
      ) {
        const webCred = await this.processOAuthCallbackUrl(window.location.href);
        if (webCred) return webCred;
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const user = mapSupabaseUserToAuthUser(session.user)!;
      currentAuthUser = user;
      return { user };
    }
    return null;
  }

  /**
   * Send Password Reset Email via Supabase Auth
   */
  static async resetPassword(email: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}?tab=profile` : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo,
    });

    if (error) {
      throw error;
    }
  }

  /**
   * Sign out current user safely without native crashes
   */
  static async logout(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        const isGoogle =
          currentAuthUser?.providerData?.some(
            (p) => p.providerId === 'google.com' || p.providerId === 'google'
          ) || localStorage.getItem('athar_last_auth_provider') === 'google';

        if (isGoogle) {
          try {
            await GoogleAuth.initialize({
              clientId: GOOGLE_WEB_CLIENT_ID,
              scopes: ['profile', 'email'],
              grantOfflineAccess: false,
            });
            await GoogleAuth.signOut();
          } catch (gErr) {
            console.warn('[AuthService] Google signOut safe bypass:', gErr);
          }
        }
      }
    } catch (e) {
      console.warn('[AuthService] Native logout exception handled:', e);
    }

    try {
      localStorage.removeItem('athar_last_auth_provider');
      localStorage.removeItem('athar_active_local_user_v1');
      localStorage.removeItem('athar_guest_mode');
    } catch {}

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[AuthService] Supabase signOut notice:', err);
    }
    currentAuthUser = null;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('athar_auth_switched', { detail: { uid: 'guest', isGuest: true } })
      );
    }
  }

  /**
   * Delete current user data and profile
   */
  static async deleteUserAccountAndData(): Promise<void> {
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('لا يوجد حساب مسجل حالياً لحذفه.');
    }

    try {
      await supabase.from('profiles').delete().eq('id', user.uid);
    } catch (err) {
      console.warn('Notice: profile row deletion notice:', err);
    }

    try {
      localStorage.removeItem('athar_saved_email');
      localStorage.removeItem('athar_remember_me');
      localStorage.removeItem('athar_guest_mode');
      localStorage.removeItem('athar_active_local_user_v1');
    } catch {}

    await this.logout();
  }

  /**
   * Retrieve a user's full profile from Supabase profiles table or local cache fallback
   */
  static async getUserProfile(uid: string): Promise<UserProfileData | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();

      if (!error && data) {
        return {
          uid: data.id,
          displayName: data.display_name || 'مستخدم أثر',
          email: data.email || (currentAuthUser?.email ?? `${data.id}@athar.app`),
          photoURL: data.avatar_url || '',
          username: data.username || '',
          bio: data.bio || '',
          createdAt: data.created_at || new Date().toISOString(),
          updatedAt: data.updated_at,
          streakDays: data.streak || 0,
          level: data.level || 1,
          xp: data.xp || 0,
          role: data.role || 'member',
          isAdmin: data.role === 'admin',
          isModerator: data.role === 'moderator' || data.role === 'admin',
        };
      }
    } catch (err) {
      console.warn('[AuthService] Supabase profile fetch error, checking local profile:', err);
    }

    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(`athar_local_profile_${uid}`);
        if (raw) {
          const lp = JSON.parse(raw);
          return {
            uid: lp.id || uid,
            displayName: lp.displayName || currentAuthUser?.displayName || 'مستخدم أثر',
            email: lp.email || currentAuthUser?.email || '',
            photoURL: lp.photoURL || currentAuthUser?.photoURL || '',
            username: lp.username || '',
            bio: lp.bio || '',
            createdAt: lp.createdAt || new Date().toISOString(),
            updatedAt: lp.updatedAt,
            streakDays: lp.streak || 0,
            level: GamificationService.getGamificationSummary(uid)?.currentLevel || lp.level || 1,
            xp: GamificationService.getTotalXP(uid) || lp.xp || 0,
            role: lp.role || 'member',
            isAdmin: lp.role === 'admin',
            isModerator: lp.role === 'moderator' || lp.role === 'admin',
          };
        }
      }
    } catch {}

    if (currentAuthUser && currentAuthUser.uid === uid) {
      const summary = GamificationService.getGamificationSummary(uid);
      return {
        uid,
        displayName: currentAuthUser.displayName || 'مستخدم أثر',
        email: currentAuthUser.email || '',
        photoURL: currentAuthUser.photoURL || '',
        createdAt: new Date().toISOString(),
        streakDays: 0,
        level: summary?.currentLevel || 1,
        xp: summary?.totalXP || 0,
        role: 'member',
        isAdmin: false,
        isModerator: false,
      };
    }

    return null;
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

    try {
      const payload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.displayName !== undefined) payload.display_name = updates.displayName.trim();
      if (updates.username !== undefined) payload.username = updates.username.trim().replace(/^@+/, '');
      if (updates.bio !== undefined) payload.bio = updates.bio.trim();
      if (updates.photoURL !== undefined) payload.avatar_url = updates.photoURL;
      if (updates.xp !== undefined) payload.xp = updates.xp;
      if (updates.level !== undefined) payload.level = updates.level;
      if (updates.streakDays !== undefined) payload.streak = updates.streakDays;

      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', uid);

      if (error) {
        console.warn('[AuthService] Profile update warning:', error.message);
      }

      if (updates.displayName || updates.photoURL !== undefined) {
        await supabase.auth.updateUser({
          data: {
            display_name: updates.displayName || undefined,
            avatar_url: updates.photoURL || undefined,
          },
        }).catch(() => {});
      }

      try {
        const cachedRaw = localStorage.getItem('athar_cached_profile');
        const cached = cachedRaw ? JSON.parse(cachedRaw) : {};
        const merged = { ...cached, ...updates, uid };
        localStorage.setItem('athar_cached_profile', JSON.stringify(merged));
      } catch {}
    } catch (err) {
      if (isNetworkFailureError(err)) {
        console.warn('[AuthService] Profile update offline warning:', (err as any)?.message || err);
      } else {
        console.warn('[AuthService] Error updating user profile in Supabase:', err);
      }
    }
  }

  static getAuthErrorInfo(err: unknown): AuthErrorInfo {
    const defaultInfo: AuthErrorInfo = {
      code: 'auth/unknown',
      title: 'حدث خطأ غير متوقع',
      message: 'تعذر إتمام العملية، يرجى التأكد من اتصالك بالإنترنت والمحاولة مجدداً.',
      suggestedAction: 'retry',
      actionLabel: 'إعادة المحاولة',
    };

    if (!err) return defaultInfo;

    const anyErr = err as any;
    const msg = String(anyErr.message || anyErr.code || anyErr).toLowerCase();
    const status = anyErr.status;

    if (
      msg.includes('failed to fetch') ||
      msg.includes('network') ||
      msg.includes('networkerror') ||
      msg.includes('fetch failed') ||
      msg.includes('load failed') ||
      msg.includes('connection refused') ||
      anyErr?.code === 'auth/network-error'
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

    if (msg.includes('invalid login credentials') || msg.includes('invalid_grant') || msg.includes('wrong-password') || msg.includes('user-not-found')) {
      return {
        code: 'auth/invalid-credential',
        title: 'بيانات الدخول غير صحيحة',
        message: 'كلمة المرور أو البريد الإلكتروني غير متطابق. يرجى التحقق من صحة المدخلات.',
        suggestedAction: 'retry',
        actionLabel: 'إعادة المحاولة',
      };
    }

    if (msg.includes('user already registered') || msg.includes('email already in use') || msg.includes('email-already-in-use')) {
      return {
        code: 'auth/email-already-in-use',
        title: 'البريد مسجل مسبقاً',
        message: 'يوجد حساب مسجل بالفعل بهذا البريد الإلكتروني. يمكنك تسجيل الدخول مباشرة.',
        suggestedAction: 'login',
        actionLabel: 'تسجيل الدخول',
      };
    }

    if (msg.includes('password should be at least') || msg.includes('weak_password') || msg.includes('weak-password')) {
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
      code: anyErr.code || 'auth/generic-error',
      title: 'تنبيه المصادقة',
      message: anyErr.message || 'حدث خطأ أثناء الاتصال بالخادم، يرجى المحاولة لاحقاً.',
      suggestedAction: 'retry',
    };
  }

  static translateAuthError(err: unknown): string {
    return this.getAuthErrorInfo(err).message;
  }
}
