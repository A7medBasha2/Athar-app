import React, { useState, useMemo, useEffect } from 'react';
import {
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  Cloud,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  X,
  UserPlus,
  LogIn,
  Check,
} from 'lucide-react';
import { AuthService, AuthErrorInfo } from '../services/authService';
import { SupabaseAuthService } from '../services/supabaseAuthService';
import { AtharBrandLogo } from '../components/AtharBrandLogo';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { HapticSerenityService } from '../services/hapticSerenityService';

interface AuthViewProps {
  onSuccess?: () => void;
  onContinueAsGuest?: () => void;
  onClose?: () => void;
}

interface PasswordStrength {
  score: number; // 0 to 4
  label: string;
  hasMinLength: boolean;
  hasNumber: boolean;
  hasMixedOrSpecial: boolean;
  hasGoodLength: boolean;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess, onContinueAsGuest, onClose }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password'>('login');
  const [displayName, setDisplayName] = useState('');
  
  // Remember Me state loaded from localStorage
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('athar_remember_me');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [email, setEmail] = useState<string>(() => {
    try {
      return localStorage.getItem('athar_saved_email') || '';
    } catch {
      return '';
    }
  });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<AuthErrorInfo | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isResetSent, setIsResetSent] = useState(false);

  // Email format validation
  const isEmailValid = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }, [email]);

  // Capacitor Haptics feedback for successful authentication (login / account creation)
  const triggerAuthSuccessHaptics = async () => {
    try {
      // Short, satisfying vibration pattern via Capacitor Haptics plugin
      await Haptics.impact({ style: ImpactStyle.Medium });
      await new Promise((resolve) => setTimeout(resolve, 85));
      await Haptics.notification({ type: NotificationType.Success });
    } catch {
      // Graceful web vibration fallback
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([25, 65, 45]);
        }
      } catch {}
    }

    try {
      HapticSerenityService.triggerStepPulse({ isMilestone: true });
    } catch {}
  };

  // Check for any pending redirect result when returning from Google redirect
  useEffect(() => {
    AuthService.checkRedirectResult()
      .then((res) => {
        if (res?.user) {
          triggerAuthSuccessHaptics();
          if (onSuccess) onSuccess();
        }
      })
      .catch((err) => {
        setErrorInfo(AuthService.getAuthErrorInfo(err));
      });
  }, [onSuccess]);

  // Lock document body scroll while AuthView is mounted to eliminate background double-scrolling and duplicate scrollbars
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    if (isLoading || isGoogleLoading) return;
    setErrorInfo(null);
    setSuccessMessage(null);
    setIsGoogleLoading(true);

    try {
      const cred = await AuthService.signInWithGoogle();
      if (!cred || !cred.user) return;
      const user = cred.user;

      if (rememberMe && user?.email) {
        try {
          localStorage.setItem('athar_remember_me', 'true');
          localStorage.setItem('athar_saved_email', user.email);
        } catch {}
      }

      setSuccessMessage('تم تسجيل الدخول بنجاح عبر حساب Google، مرحباً بك في أثر!');
      await triggerAuthSuccessHaptics();

      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 650);
    } catch (err: unknown) {
      setErrorInfo(AuthService.getAuthErrorInfo(err));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Real-time password strength calculation
  const passwordStrength = useMemo<PasswordStrength>(() => {
    if (!password) {
      return {
        score: 0,
        label: 'أدخل كلمة المرور',
        hasMinLength: false,
        hasNumber: false,
        hasMixedOrSpecial: false,
        hasGoodLength: false,
      };
    }

    const hasMinLength = password.length >= 6;
    const hasGoodLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasMixedOrSpecial = /[A-Z]/.test(password) || /[^a-zA-Z0-9]/.test(password);

    let score = 0;
    if (hasMinLength) score += 1;
    if (hasNumber) score += 1;
    if (hasMixedOrSpecial) score += 1;
    if (hasGoodLength && hasNumber && hasMixedOrSpecial) score += 1;

    let label = 'ضعيفة';
    if (score === 2) {
      label = 'متوسطة';
    } else if (score === 3) {
      label = 'جيدة';
    } else if (score >= 4) {
      label = 'قوية وممتازة';
    }

    return {
      score,
      label,
      hasMinLength,
      hasNumber,
      hasMixedOrSpecial,
      hasGoodLength,
    };
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isGoogleLoading) return;
    setErrorInfo(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (mode === 'forgot_password') {
      if (!trimmedEmail) {
        setErrorInfo({
          code: 'validation/missing-email',
          title: 'البريد الإلكتروني مطلوب',
          message: 'يرجى كتابة عنوان بريدك الإلكتروني لإرسال رابط استعادة كلمة المرور.',
          suggestedAction: 'retry',
        });
        return;
      }

      if (!emailRegex.test(trimmedEmail)) {
        setErrorInfo({
          code: 'validation/invalid-email',
          title: 'صيغة البريد الإلكتروني غير صحيحة',
          message: 'يرجى إدخال عنوان بريد إلكتروني صحيح (مثال: name@example.com).',
          suggestedAction: 'retry',
        });
        return;
      }

      setIsLoading(true);
      try {
        try {
          await SupabaseAuthService.resetPassword(trimmedEmail);
        } catch {
          await AuthService.resetPassword(trimmedEmail);
        }
        setIsResetSent(true);
        setSuccessMessage(
          'تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني بنجاح. يرجى مراجعة صندوق الوارد أو مجلد الرسائل غير المرغوب فيها.'
        );
        try {
          await Haptics.notification({ type: NotificationType.Success });
        } catch {
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate([25, 45, 25]);
          }
        }
      } catch (err: unknown) {
        setIsResetSent(false);
        setErrorInfo(AuthService.getAuthErrorInfo(err));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!trimmedEmail || !password) {
      setErrorInfo({
        code: 'validation/required-fields',
        title: 'بيانات ناقصة',
        message: 'يرجى ملء جميع الحقول المطلوبة للمتابعة.',
        suggestedAction: 'retry',
      });
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      setErrorInfo({
        code: 'validation/invalid-email',
        title: 'صيغة البريد غير صحيحة',
        message: 'يرجى كتابة عنوان بريد إلكتروني صالح ومكتمل (مثال: name@example.com).',
        suggestedAction: 'retry',
      });
      return;
    }

    if (mode === 'register') {
      if (!displayName.trim()) {
        setErrorInfo({
          code: 'validation/missing-name',
          title: 'الاسم مطلوب',
          message: 'يرجى إدخال اسمك الكريم أو لقبك لاستكمال إنشاء حسابك.',
          suggestedAction: 'retry',
        });
        return;
      }
      if (password.length < 6) {
        setErrorInfo({
          code: 'validation/weak-password',
          title: 'كلمة المرور قصيرة',
          message: 'يجب ألا تقل كلمة المرور عن 6 خانات لضمان أمان حسابك.',
          suggestedAction: 'retry',
        });
        return;
      }
      if (password !== confirmPassword) {
        setErrorInfo({
          code: 'validation/password-mismatch',
          title: 'تأكيد كلمة المرور',
          message: 'كلمتا المرور غير متطابقتين، يرجى إعادة كتابتهما بدقة.',
          suggestedAction: 'retry',
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      // Remember Me: save or remove email in localStorage
      try {
        if (rememberMe) {
          localStorage.setItem('athar_remember_me', 'true');
          localStorage.setItem('athar_saved_email', trimmedEmail);
        } else {
          localStorage.setItem('athar_remember_me', 'false');
          localStorage.removeItem('athar_saved_email');
        }
      } catch {}

      if (mode === 'register') {
        // Register in Supabase Auth & create profiles record
        try {
          await SupabaseAuthService.signUp(trimmedEmail, password, displayName);
        } catch (supabaseErr: any) {
          console.warn('[SupabaseAuth] Register notice:', supabaseErr?.message);
        }
        await AuthService.register(trimmedEmail, password, displayName);
        setSuccessMessage('تم إنشاء حسابك السحابي بنجاح، مرحباً بك في أثر!');
        await triggerAuthSuccessHaptics();
      } else {
        // Sign in via Supabase Auth
        try {
          await SupabaseAuthService.signIn(trimmedEmail, password);
        } catch (supabaseErr: any) {
          console.warn('[SupabaseAuth] Signin notice:', supabaseErr?.message);
        }
        await AuthService.login(trimmedEmail, password);
        setSuccessMessage('تم تسجيل الدخول بنجاح، جاري نقلك...');
        await triggerAuthSuccessHaptics();
      }

      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 700);
    } catch (err: unknown) {
      setErrorInfo(AuthService.getAuthErrorInfo(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-full w-full bg-[#060503] text-[#F3E5AB] flex flex-col justify-between relative overflow-hidden selection:bg-[#D4AF37]/30 selection:text-[#FBF7EE]"
    >
      {/* Background Decorative Auras - strictly contained to avoid leaking outside or causing scroll lag */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[350px] bg-gradient-to-b from-[#D4AF37]/10 via-[#B8860B]/5 to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-[#D4AF37]/5 blur-3xl" />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-md mx-auto px-5 py-6 my-auto flex-1 flex flex-col">
        {onClose && (
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#14120D] border border-[#D4AF37]/25 text-[#D4AF37] hover:text-white transition active:scale-95"
              aria-label="إغلاق"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <AtharBrandLogo size="md" centered />
          </div>
          <p className="text-xs text-[#D4AF37]/80 max-w-xs mx-auto leading-relaxed mt-2 font-medium">
            احفظ ختماتك القرآنية، سجلات صلواتك، وأذكارك اليومية بأمان وسهولة
          </p>
        </div>

        {/* Tab Switcher or Back to Login Bar */}
        {mode === 'forgot_password' ? (
          <div className="flex items-center justify-between p-2 px-3.5 bg-[#14120D] border border-[#D4AF37]/30 rounded-2xl mb-6 shadow-inner animate-fadeIn">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                <KeyRound className="w-4 h-4" />
              </div>
              <span>استعادة كلمة المرور</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setIsResetSent(false);
                setErrorInfo(null);
                setSuccessMessage(null);
              }}
              className="text-xs text-[#D4AF37] hover:text-white font-semibold transition px-2.5 py-1.5 rounded-xl hover:bg-[#1D1912] flex items-center gap-1.5 cursor-pointer"
            >
              <span>العودة للدخول</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex p-1 bg-[#14120D] border border-[#D4AF37]/20 rounded-2xl mb-6 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setIsResetSent(false);
                setErrorInfo(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-[#060503] shadow-md shadow-[#D4AF37]/20 font-bold'
                  : 'text-[#D4AF37]/70 hover:text-white'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setIsResetSent(false);
                setErrorInfo(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-[#060503] shadow-md shadow-[#D4AF37]/20 font-bold'
                  : 'text-[#D4AF37]/70 hover:text-white'
              }`}
            >
              إنشاء حساب جديد
            </button>
          </div>
        )}

        {/* Auth Card */}
        <div className="bg-[#0E0C09] border border-[#D4AF37]/25 rounded-3xl p-6 shadow-2xl shadow-black/90">
          {/* Enhanced Royal Gold & Obsidian Error Card */}
          {errorInfo && (
            <div className="mb-5 p-4 rounded-2xl bg-gradient-to-b from-[#1C140D] via-[#150F09] to-[#0E0A05] border border-[#D4AF37]/50 shadow-[0_10px_30px_rgba(0,0,0,0.85)] relative overflow-hidden animate-fadeIn">
              {/* Subtle Ambient Gold Radiance */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-start gap-3 relative z-10">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D4AF37]/25 to-[#B8860B]/10 border border-[#D4AF37]/45 flex items-center justify-center text-[#D4AF37] shrink-0 mt-0.5 shadow-sm">
                  <AlertCircle className="w-4 h-4 text-[#D4AF37]" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="text-xs font-bold text-[#F5EFE0] tracking-wide flex items-center gap-1.5">
                      <span>{errorInfo.title}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setErrorInfo(null)}
                      className="text-stone-400 hover:text-[#D4AF37] p-1 rounded-lg transition cursor-pointer"
                      aria-label="إغلاق التنبيه"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-[#F3E5AB]/90 leading-relaxed font-arabic">
                    {errorInfo.message}
                  </p>

                  {/* Contextual Smart Action Buttons */}
                  {errorInfo.suggestedAction === 'register' && mode !== 'register' && (
                    <div className="mt-3 pt-2.5 border-t border-[#D4AF37]/20 flex items-center justify-start">
                      <button
                        type="button"
                        onClick={() => {
                          setMode('register');
                          setErrorInfo(null);
                        }}
                        className="py-1.5 px-3 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-[#060503] text-[11px] font-bold flex items-center gap-1.5 shadow-sm hover:brightness-110 active:scale-95 transition cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{errorInfo.actionLabel || 'إنشاء حساب جديد الآن'}</span>
                      </button>
                    </div>
                  )}

                  {errorInfo.suggestedAction === 'forgot_password' && mode !== 'forgot_password' && (
                    <div className="mt-3 pt-2.5 border-t border-[#D4AF37]/20 flex items-center justify-start">
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot_password');
                          setErrorInfo(null);
                        }}
                        className="py-1.5 px-3 rounded-lg bg-[#241C10] border border-[#D4AF37]/45 text-[#D4AF37] hover:text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm hover:bg-[#2F2415] active:scale-95 transition cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>{errorInfo.actionLabel || 'استعادة كلمة المرور'}</span>
                      </button>
                    </div>
                  )}

                  {errorInfo.suggestedAction === 'login' && mode !== 'login' && (
                    <div className="mt-3 pt-2.5 border-t border-[#D4AF37]/20 flex items-center justify-start">
                      <button
                        type="button"
                        onClick={() => {
                          setMode('login');
                          setErrorInfo(null);
                        }}
                        className="py-1.5 px-3 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-[#060503] text-[11px] font-bold flex items-center gap-1.5 shadow-sm hover:brightness-110 active:scale-95 transition cursor-pointer"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>{errorInfo.actionLabel || 'تسجيل الدخول'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Success Alert */}
          {successMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/35 text-emerald-200 text-xs flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{successMessage}</div>
            </div>
          )}

          {/* Forgot Password Explanatory Guidance */}
          {mode === 'forgot_password' && !successMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-[#16120B] border border-[#D4AF37]/20 text-xs text-[#F3E5AB]/85 flex items-start gap-2.5 leading-relaxed">
              <KeyRound className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
              <div>
                أدخل عنوان بريدك الإلكتروني المسجل وسنرسل إليك رابطاً فورياً لإعادة تعيين كلمة المرور واستعادة حسابك.
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Name (Only in Register mode) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-[#F3E5AB]/90 mb-1.5">
                  الاسم الكريم
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="مثال: عبد الله بن أحمد"
                    disabled={isLoading}
                    className="w-full bg-[#181510] border border-[#D4AF37]/25 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-stone-500 outline-none transition"
                  />
                  <UserIcon className="w-4 h-4 text-[#D4AF37]/60 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-medium text-[#F3E5AB]/90 mb-1.5">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (isResetSent) setIsResetSent(false);
                  }}
                  placeholder="name@example.com"
                  disabled={isLoading}
                  className="w-full bg-[#181510] border border-[#D4AF37]/25 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-stone-500 outline-none transition text-left"
                />
                <Mail className="w-4 h-4 text-[#D4AF37]/60 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Password Field (Only in login and register modes) */}
            {mode !== 'forgot_password' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-[#F3E5AB]/90">
                    كلمة المرور
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot_password');
                        setErrorInfo(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[11px] text-[#D4AF37]/90 hover:text-[#FFF2C2] hover:underline transition font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <KeyRound className="w-3 h-3 text-[#D4AF37]" />
                      <span>نسيت كلمة المرور؟</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="w-full bg-[#181510] border border-[#D4AF37]/25 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] rounded-xl px-10 py-3 pr-10 text-sm text-white placeholder-stone-500 outline-none transition text-left font-mono"
                  />
                  <Lock className="w-4 h-4 text-[#D4AF37]/60 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#D4AF37] focus:text-[#D4AF37] transition p-1.5 rounded-lg hover:bg-stone-800/40 active:scale-90 cursor-pointer"
                    title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 text-[#D4AF37]" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Real-time Password Strength Indicator & Visual Progress Bar */}
                {password.length > 0 && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-[#140F08] border border-[#D4AF37]/25 space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#F3E5AB]/75 flex items-center gap-1.5 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>مستوى أمان كلمة المرور:</span>
                      </span>
                      <span
                        className={`font-bold transition-colors ${
                          passwordStrength.score >= 3
                            ? 'text-emerald-400'
                            : passwordStrength.score === 2
                            ? 'text-[#E6C66E]'
                            : 'text-[#D4AF37]'
                        }`}
                      >
                        {passwordStrength.label}
                      </span>
                    </div>

                    {/* 4-Segment Visual Progress Bar (Gold & Black Theme) */}
                    <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                      {[1, 2, 3, 4].map((step) => {
                        const isActive = passwordStrength.score >= step;
                        return (
                          <div
                            key={step}
                            className={`h-full rounded-full transition-all duration-300 ${
                              isActive
                                ? step === 4
                                  ? 'bg-gradient-to-r from-[#D4AF37] to-emerald-400 shadow-[0_0_8px_rgba(212,175,55,0.6)]'
                                  : 'bg-gradient-to-r from-[#B8860B] to-[#D4AF37] shadow-[0_0_6px_rgba(212,175,55,0.4)]'
                                : 'bg-[#2A2318]/70 border border-[#D4AF37]/10'
                            }`}
                          />
                        );
                      })}
                    </div>

                    {/* Requirement Checklist (Visible in Register Mode) */}
                    {mode === 'register' && (
                      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] text-[#F3E5AB]/70">
                        <div
                          className={`flex items-center gap-1.5 transition-colors ${
                            passwordStrength.hasMinLength ? 'text-emerald-400 font-semibold' : 'text-stone-400'
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                              passwordStrength.hasMinLength
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-stone-800 text-stone-500'
                            }`}
                          >
                            ✓
                          </div>
                          <span>٦ خانات كحد أدنى</span>
                        </div>

                        <div
                          className={`flex items-center gap-1.5 transition-colors ${
                            passwordStrength.hasNumber ? 'text-emerald-400 font-semibold' : 'text-stone-400'
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                              passwordStrength.hasNumber
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-stone-800 text-stone-500'
                            }`}
                          >
                            ✓
                          </div>
                          <span>تحتوي على أرقام (٠-٩)</span>
                        </div>

                        <div
                          className={`flex items-center gap-1.5 transition-colors ${
                            passwordStrength.hasMixedOrSpecial ? 'text-emerald-400 font-semibold' : 'text-stone-400'
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                              passwordStrength.hasMixedOrSpecial
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-stone-800 text-stone-500'
                            }`}
                          >
                            ✓
                          </div>
                          <span>رموز أو حروف متنوعة</span>
                        </div>

                        <div
                          className={`flex items-center gap-1.5 transition-colors ${
                            passwordStrength.hasGoodLength ? 'text-emerald-400 font-semibold' : 'text-stone-400'
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                              passwordStrength.hasGoodLength
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-stone-800 text-stone-500'
                            }`}
                          >
                            ✓
                          </div>
                          <span>٨ خانات لأمان مثالي</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Confirm Password (Only in Register mode) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-[#F3E5AB]/90 mb-1.5">
                  تأكيد كلمة المرور
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    dir="ltr"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="w-full bg-[#181510] border border-[#D4AF37]/25 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] rounded-xl px-10 py-3 pr-10 text-sm text-white placeholder-stone-500 outline-none transition text-left font-mono"
                  />
                  <Lock className="w-4 h-4 text-[#D4AF37]/60 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#D4AF37] focus:text-[#D4AF37] transition p-1.5 rounded-lg hover:bg-stone-800/40 active:scale-90 cursor-pointer"
                    title={showConfirmPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    aria-label={showConfirmPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4 text-[#D4AF37]" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Remember Me Checkbox (For Login & Register) */}
            {mode !== 'forgot_password' && (
              <div className="flex items-center justify-between pt-1 select-none">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-4 h-4 rounded-md border border-[#D4AF37]/45 bg-[#16120B] peer-checked:bg-gradient-to-br peer-checked:from-[#D4AF37] peer-checked:to-[#B8860B] peer-checked:border-[#F3E5AB] transition flex items-center justify-center shadow-inner group-hover:border-[#D4AF37]">
                      {rememberMe && <Check className="w-3 h-3 text-[#060503] stroke-[3]" />}
                    </div>
                  </div>
                  <span className="text-xs text-[#F3E5AB]/85 group-hover:text-white transition font-medium">
                    تذكر بريدي الإلكتروني في هذه الجلسة
                  </span>
                </label>
              </div>
            )}

            {/* Submit / Reset Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full relative overflow-hidden group py-3.5 px-4 rounded-xl font-bold text-sm shadow-lg active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                  mode === 'forgot_password' && isResetSent
                    ? 'bg-gradient-to-r from-[#D4AF37] via-[#FFF0B3] to-[#B8860B] text-[#060503] shadow-[0_0_25px_rgba(212,175,55,0.5)] ring-1 ring-[#FFF8E7]/75'
                    : mode === 'forgot_password' && isEmailValid
                    ? 'bg-gradient-to-r from-[#D4AF37] via-[#ECD27C] to-[#B8860B] text-[#060503] shadow-lg shadow-[#D4AF37]/35 hover:shadow-xl hover:shadow-[#D4AF37]/45'
                    : 'bg-gradient-to-r from-[#D4AF37] via-[#E6CA65] to-[#B8860B] text-[#060503] shadow-lg shadow-[#D4AF37]/25 hover:shadow-xl hover:shadow-[#D4AF37]/35'
                }`}
              >
                {/* Subtle, elegant gold-shimmer animation effect that plays on the reset confirmation button once a valid email is submitted */}
                {mode === 'forgot_password' && isResetSent && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                    <div className="w-[60%] h-full bg-gradient-to-r from-transparent via-[#FFFDF5]/75 to-transparent -skew-x-12 animate-gold-shimmer" />
                  </div>
                )}

                {/* Subtle gold-shimmer gleam when a valid email is typed and ready for submission */}
                {mode === 'forgot_password' && !isResetSent && isEmailValid && !isLoading && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl opacity-60">
                    <div className="w-[40%] h-full bg-gradient-to-r from-transparent via-[#FFF8E7]/40 to-transparent -skew-x-12 animate-gold-shimmer" />
                  </div>
                )}

                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#060503]" />
                    <span>جاري المعالجة...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {mode === 'register'
                        ? 'إنشاء حساب سحابي جديد'
                        : mode === 'forgot_password'
                        ? isResetSent
                          ? 'تم إرسال رابط الاستعادة بنجاح ✓'
                          : 'إرسال رابط استعادة كلمة المرور'
                        : 'تسجيل الدخول'}
                    </span>
                    {mode === 'forgot_password' && isResetSent ? (
                      <CheckCircle2 className="w-4 h-4 text-[#060503] shrink-0 animate-pulse" />
                    ) : (
                      <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 transition" />
                    )}
                  </>
                )}
              </button>
            </div>

            {/* Google Sign-In Section (Login & Register modes) */}
            {mode !== 'forgot_password' && (
              <div className="space-y-3 pt-1">
                {/* Elegant Royal Divider */}
                <div className="relative flex items-center justify-center my-3 select-none">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#D4AF37]/20" />
                  </div>
                  <div className="relative px-3 bg-[#0D0B08] text-[11px] text-[#D4AF37]/75 font-semibold">
                    <span>أو المتابعة السريعة عبر</span>
                  </div>
                </div>

                {/* Google Sign-In Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading || isGoogleLoading}
                  className="w-full relative overflow-hidden group py-3 px-4 rounded-xl bg-gradient-to-r from-[#15110A] via-[#1C170E] to-[#15110A] hover:from-[#1E190F] hover:to-[#1E190F] border border-[#D4AF37]/35 hover:border-[#D4AF37] text-[#F3E5AB] hover:text-white font-bold text-xs shadow-md shadow-black/60 hover:shadow-[#D4AF37]/20 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                  aria-label="تسجيل الدخول بواسطة Google"
                >
                  {/* Subtle inner hover glow */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                  {isGoogleLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                      <span>جاري الاتصال بحساب Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>تسجيل الدخول بواسطة Google</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Secondary Back to Login Button for Forgot Password mode */}
            {mode === 'forgot_password' && (
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorInfo(null);
                    setSuccessMessage(null);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 text-xs font-semibold text-[#D4AF37]/90 hover:text-white transition hover:bg-[#16130C] active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>العودة إلى شاشة تسجيل الدخول</span>
                </button>
              </div>
            )}
          </form>

          {/* Features Highlights */}
          <div className="mt-6 pt-5 border-t border-[#D4AF37]/15 grid grid-cols-3 gap-2 text-center text-[10px] text-[#F3E5AB]/70">
            <div className="flex flex-col items-center gap-1">
              <Cloud className="w-4 h-4 text-[#D4AF37]" />
              <span>مزامنة سحابية</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
              <span>حماية وتشفير</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              <span>استعادة الورد</span>
            </div>
          </div>
        </div>

        {/* Continue as Guest Button */}
        {onContinueAsGuest && (
          <div className="text-center mt-5">
            <button
              type="button"
              onClick={onContinueAsGuest}
              className="inline-flex items-center gap-1.5 text-xs text-[#D4AF37]/80 hover:text-[#F3E5AB] py-2 px-4 rounded-xl hover:bg-[#181510] transition"
            >
              <span>المتابعة كزائر بدون حساب</span>
              <span className="text-[10px] text-stone-500">(الاستخدام المحلي)</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="relative z-10 py-4 text-center text-[10px] text-stone-500 border-t border-[#D4AF37]/10">
        تطبيق أثر · منظومة إسلامية ملكية متكاملة
      </div>
    </div>
  );
};
