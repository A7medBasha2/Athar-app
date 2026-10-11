import React, { useState, useEffect } from 'react';
import { Download, Share2, PlusSquare, X, CheckCircle, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallBanner: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(true);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isInstalledSuccessfully, setIsInstalledSuccessfully] = useState<boolean>(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed as PWA)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // Check if dismissed previously in session
    try {
      const dismissed = sessionStorage.getItem('athar_pwa_install_dismissed');
      if (dismissed === '1') setIsDismissed(true);
    } catch {}

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isAppleDevice);

    // Listen for Chrome / Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalledSuccessfully(true);
      setDeferredPrompt(null);
      setTimeout(() => setIsStandalone(true), 4000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('athar_pwa_install_dismissed', '1');
    } catch {}
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalledSuccessfully(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  // Do not show if already running inside installed standalone app
  if (isStandalone) return null;

  // Do not show if dismissed and not in compact mode
  if (isDismissed && !compact) return null;

  if (isInstalledSuccessfully) {
    return (
      <div className="p-3 bg-gradient-to-r from-[#1A2E1A] to-[#0E1A0E] border border-emerald-500/40 rounded-2xl flex items-center justify-between text-xs text-emerald-200 animate-fadeIn">
        <div className="flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-400" />
          <span className="font-bold">تم تثبيت تطبيق «أثر» بنجاح على جهازك!</span>
        </div>
      </div>
    );
  }

  // If in compact mode (e.g., inside SettingsView)
  if (compact) {
    return (
      <div className="athar-card space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#C8A24A]/25">
          <div className="flex items-center gap-2">
            <Smartphone size={16} className="text-[#E6C66E]" />
            <h3 className="text-xs font-extrabold text-white">تثبيت التطبيق على الشاشة الرئيسية (PWA)</h3>
          </div>
        </div>
        <p className="text-[11px] text-[#C4B998] leading-relaxed">
          ثبّت تطبيق أثر على هاتفك ليعمل كبرنامج أصلي بدون إنترنت، ويوفر تنبيهات الأذان بملء الشاشة واستجابة فائقة السرعة.
        </p>
        <button
          onClick={handleInstallClick}
          className="w-full athar-btn-primary flex items-center justify-center gap-2 py-2 px-3 text-xs"
        >
          <Download size={14} />
          <span>{isIos ? 'طريقة تثبيت التطبيق على الآيفون' : 'تثبيت تطبيق أثر على هاتفك الآن'}</span>
        </button>

        {showIosGuide && (
          <div className="p-3 bg-[#0D0C09] border border-[#C8A24A]/40 rounded-xl space-y-2 text-xs text-[#F2EBDD]">
            <p className="font-bold text-[#E6C66E]">خطوات التثبيت على الآيفون (Safari):</p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#C4B998]">
              <li>اضغط على أيقونة المشاركة <Share2 size={12} className="inline mx-1 text-[#E6C66E]" /> في أسفل شاشة سفاري</li>
              <li>مرر للأسفل واختر <span className="text-white font-bold">«إضافة إلى الشاشة الرئيسية»</span> <PlusSquare size={12} className="inline mx-1 text-[#E6C66E]" /></li>
              <li>اضغط <span className="text-white font-bold">«إضافة»</span> أعلى الزاوية، وسيعمل التطبيق كبرنامج مستقل</li>
            </ol>
            <button
              onClick={() => setShowIosGuide(false)}
              className="mt-2 text-[11px] text-[#E6C66E] font-bold underline block text-center w-full"
            >
              تم الفهم، إغلاق الإرشاد
            </button>
          </div>
        )}
      </div>
    );
  }

  // Floating or In-page Banner
  return (
    <>
      <div className="p-3.5 bg-gradient-to-r from-[#211B10] via-[#16130B] to-[#211B10] border border-[#E6C66E]/50 rounded-2xl shadow-xl relative animate-fadeIn select-none">
        <button
          onClick={handleDismiss}
          className="absolute top-2.5 left-2.5 text-[#C4B998] hover:text-white p-1 rounded-full"
          title="إغلاق التنبيه"
        >
          <X size={14} />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#070707] border border-[#E6C66E]/60 p-1 shrink-0 flex items-center justify-center">
            <img src="/athar-royal-icon.jpg" alt="أثر" className="w-full h-full object-cover rounded-lg" />
          </div>
          <div className="flex-1 pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-[#F3E5AB]">تطبيق «أثر» كبرنامج كامل</span>
              <span className="text-[9px] bg-[#C8A24A]/25 border border-[#E6C66E]/40 text-[#E6C66E] font-bold px-1.5 py-0.2 rounded-full">
                PWA
              </span>
            </div>
            <p className="text-[10.5px] text-[#C4B998] mt-0.5 leading-snug">
              أضف التطبيق لشاشة هاتفك الرئيسية لتشغيل الأذان والأذكار بدون إنترنت وبملء الشاشة.
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="athar-btn-primary py-1.5 px-3 text-[11px] flex items-center gap-1.5"
              >
                <Download size={13} />
                <span>{isIos ? 'عرض طريقة الإضافة للآيفون' : 'تثبيت التطبيق على الهاتف'}</span>
              </button>
              <button
                onClick={handleDismiss}
                className="text-[10px] text-[#A69B7B] hover:text-[#E6C66E] font-bold px-2 py-1"
              >
                لاحقاً
              </button>
            </div>
          </div>
        </div>
      </div>

      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#14120E] border border-[#C8A24A]/50 rounded-2xl max-w-sm w-full p-4.5 space-y-3.5 shadow-2xl text-right">
            <div className="flex items-center justify-between pb-2 border-b border-[#C8A24A]/25">
              <h3 className="text-sm font-extrabold text-[#F3E5AB]">تثبيت «أثر» على الآيفون (iOS)</h3>
              <button onClick={() => setShowIosGuide(false)} className="text-[#C4B998] hover:text-white">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-[#C4B998] leading-relaxed">
              لتجربة كاملة ومستقلة بدون أشرطة المتصفح، اتبع الآتي داخل متصفح Safari:
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#1C1811] border border-[#C8A24A]/20">
                <span className="w-5 h-5 rounded-full bg-[#C8A24A] text-black font-extrabold flex items-center justify-center text-[10px] shrink-0">1</span>
                <span>اضغط على أيقونة المشاركة <strong>(Share ⎋)</strong> أسفل الشاشة.</span>
              </div>
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#1C1811] border border-[#C8A24A]/20">
                <span className="w-5 h-5 rounded-full bg-[#C8A24A] text-black font-extrabold flex items-center justify-center text-[10px] shrink-0">2</span>
                <span>مرر للأسفل واختر <strong>«إضافة إلى الشاشة الرئيسية»</strong> ⊞.</span>
              </div>
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#1C1811] border border-[#C8A24A]/20">
                <span className="w-5 h-5 rounded-full bg-[#C8A24A] text-black font-extrabold flex items-center justify-center text-[10px] shrink-0">3</span>
                <span>اضغط <strong>«إضافة» (Add)</strong>، وسيفتح كتطبيق مستقل وسريع.</span>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full athar-btn-primary py-2 text-xs font-bold mt-2"
            >
              فهمت، شكراً لك
            </button>
          </div>
        </div>
      )}
    </>
  );
};
