import React, { useState } from 'react';
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
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { AuthService } from '../services/authService';
import { AtharBrandLogo } from '../components/AtharBrandLogo';

interface AuthViewProps {
  onSuccess?: () => void;
  onContinueAsGuest?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess, onContinueAsGuest }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (mode === 'register') {
      if (!displayName.trim()) {
        setErrorMessage('يرجى إدخال اسمك الكريم أو لقبك');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('يجب ألا تقل كلمة المرور عن 6 خانات');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('كلمتا المرور غير متطابقتين');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === 'register') {
        await AuthService.register(email, password, displayName);
        setSuccessMessage('تم إنشاء حسابك السحابي بنجاح، مرحباً بك في أثر!');
      } else {
        await AuthService.login(email, password);
        setSuccessMessage('تم تسجيل الدخول بنجاح، جاري نقلك...');
      }

      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(AuthService.translateAuthError(msg));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen w-full bg-[#060503] text-[#F3E5AB] flex flex-col justify-between relative overflow-x-hidden selection:bg-[#D4AF37]/30 selection:text-[#FBF7EE]"
    >
      {/* Background Decorative Auras */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[350px] bg-gradient-to-b from-[#D4AF37]/10 via-[#B8860B]/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 right-0 w-80 h-80 bg-[#D4AF37]/5 blur-3xl pointer-events-none" />

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-md mx-auto px-5 py-8 flex-1 flex flex-col justify-center">
        {/* Brand Header */}
        <div className="text-center mb-7">
          <div className="flex justify-center mb-2">
            <AtharBrandLogo size="md" centered />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1.5 flex items-center justify-center gap-2">
            <span>منظومة أثر السحابية</span>
            <Sparkles className="w-5 h-5 text-[#D4AF37]" />
          </h1>
          <p className="text-xs text-[#D4AF37]/75 max-w-xs mx-auto leading-relaxed">
            احفظ ختماتك القرآنية، سجلات صلواتك، وأذكارك اليومية بأمان وسهولة
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-[#14120D] border border-[#D4AF37]/20 rounded-2xl mb-6 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all duration-200 ${
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
              setErrorMessage(null);
            }}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all duration-200 ${
              mode === 'register'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-[#060503] shadow-md shadow-[#D4AF37]/20 font-bold'
                : 'text-[#D4AF37]/70 hover:text-white'
            }`}
          >
            إنشاء حساب جديد
          </button>
        </div>

        {/* Auth Card */}
        <div className="bg-[#0D0B08]/90 border border-[#D4AF37]/25 backdrop-blur-xl rounded-3xl p-6 shadow-2xl shadow-black/80">
          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Success Alert */}
          {successMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{successMessage}</div>
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
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  disabled={isLoading}
                  className="w-full bg-[#181510] border border-[#D4AF37]/25 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-stone-500 outline-none transition text-left"
                />
                <Mail className="w-4 h-4 text-[#D4AF37]/60 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-medium text-[#F3E5AB]/90 mb-1.5">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  className="w-full bg-[#181510] border border-[#D4AF37]/25 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] rounded-xl px-10 py-3 pr-10 text-sm text-white placeholder-stone-500 outline-none transition text-left"
                />
                <Lock className="w-4 h-4 text-[#D4AF37]/60 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#D4AF37] transition p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Only in Register mode) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-[#F3E5AB]/90 mb-1.5">
                  تأكيد كلمة المرور
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    dir="ltr"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="w-full bg-[#181510] border border-[#D4AF37]/25 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] rounded-xl px-10 py-3 pr-10 text-sm text-white placeholder-stone-500 outline-none transition text-left"
                  />
                  <Lock className="w-4 h-4 text-[#D4AF37]/60 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative overflow-hidden group py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#E6CA65] to-[#B8860B] text-[#060503] font-bold text-sm shadow-lg shadow-[#D4AF37]/25 hover:shadow-xl hover:shadow-[#D4AF37]/35 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#060503]" />
                    <span>جاري المعالجة...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'register' ? 'إنشاء حساب سحابي جديد' : 'تسجيل الدخول'}</span>
                    <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 transition" />
                  </>
                )}
              </button>
            </div>
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
