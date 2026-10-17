import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Home, Copy, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { AudioService } from '../services/audioService';
import { ReminderEngine } from '../services/reminderService';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Athar App Uncaught Exception:', error, errorInfo);
    try {
      AudioService.stop(true);
      ReminderEngine.dismissFullScreenAdhan();
      if (typeof window !== 'undefined' && (window as any).AtharNative?.stopAthan) {
        (window as any).AtharNative.stopAthan();
      }
    } catch {}
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      sessionStorage.removeItem('athar_active_tab');
    } catch {}
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleCopyError = () => {
    const errorDetails = `[أثر - تقرير خطأ]
التاريخ: ${new Date().toISOString()}
الخطأ: ${this.state.error?.message || 'غير معروف'}
المسار: ${this.state.errorInfo?.componentStack || 'غير متوفر'}`;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(errorDetails).then(() => {
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2500);
      });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          lang="ar"
          className="min-h-screen min-h-[100dvh] w-full bg-[#070707] text-[#F3E5AB] flex items-center justify-center p-4 selection:bg-[#C8A24A]/30 font-arabic"
        >
          <div className="w-full max-w-md bg-gradient-to-b from-[#13110E] to-[#0A0907] border border-[#C8A24A]/40 rounded-3xl p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.9)] text-center relative overflow-hidden">
            {/* Top decorative arch glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-[#C8A24A]/15 blur-2xl pointer-events-none rounded-full" />

            {/* Icon */}
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[#C8A24A]/10 border border-[#C8A24A]/30 flex items-center justify-center text-[#E6C66E] shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-white mb-2 font-scheherazade">
              حدث تنبيه غير متوقع
            </h1>
            <p className="text-sm text-[#D6B36A]/80 leading-relaxed mb-6">
              نعتذر عن هذا التوقف المؤقت. جميع أذكارك ومصاحفك المحفوظة في أمان تام ومحفوظة على جهازك.
            </p>

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#D6B36A] via-[#C8A24A] to-[#B28B38] text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#C8A24A]/20 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Home className="w-4 h-4 text-black" />
                <span>العودة للشاشة الرئيسية</span>
              </button>

              <button
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-xl bg-white/5 border border-[#C8A24A]/25 text-[#E6C66E] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/10 active:scale-[0.98] transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-[#E6C66E]" />
                <span>إعادة تحديث الصفحة</span>
              </button>

              <button
                onClick={this.handleCopyError}
                className="w-full py-2.5 px-4 rounded-xl bg-transparent text-xs text-white/50 hover:text-white/80 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {this.state.copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">تم نسخ تفاصيل الخطأ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ تقرير الفحص الفني</span>
                  </>
                )}
              </button>
            </div>

            {/* Offline guarantee note */}
            <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-center gap-2 text-[11px] text-[#C8A24A]/60">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>تطبيق أثر يعمل محلياً بالكامل ودون انقطاع</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
