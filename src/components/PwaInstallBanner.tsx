import React, { useState, useEffect } from 'react';
import { Download, Share2, PlusSquare, X, CheckCircle, Smartphone, Info, ExternalLink, HelpCircle } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallBanner: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState<boolean>(false);
  const [showApkGuide, setShowApkGuide] = useState<boolean>(false);
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
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalledSuccessfully(true);
        }
        setDeferredPrompt(null);
      } catch {
        setShowAndroidGuide(true);
      }
    } else if (isIos) {
      setShowIosGuide(true);
    } else {
      // Browser didn't trigger automated prompt (common inside iframes, in-app webviews, or desktop)
      setShowAndroidGuide(true);
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

  return (
    <>
      {/* If in compact mode (e.g., inside SettingsView) */}
      {compact ? (
        <div className="athar-card space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#C8A24A]/25">
            <div className="flex items-center gap-2">
              <Smartphone size={16} className="text-[#E6C66E]" />
              <h3 className="text-xs font-extrabold text-white">تثبيت التطبيق على هاتفك (PWA / APK)</h3>
            </div>
            <button
              onClick={() => setShowApkGuide(true)}
              className="text-[10px] text-[#E6C66E] font-bold flex items-center gap-1 hover:underline"
            >
              <HelpCircle size={12} />
              <span>تحميل كـ APK؟</span>
            </button>
          </div>
          <p className="text-[11px] text-[#C4B998] leading-relaxed">
            ثبّت تطبيق أثر على هاتفك ليعمل كبرنامج أصلي بدون إنترنت، ويوفر تنبيهات الأذان بملء الشاشة واستجابة فائقة السرعة.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleInstallClick}
              className="athar-btn-primary flex items-center justify-center gap-2 py-2 px-3 text-xs"
            >
              <Download size={14} />
              <span>تثبيت التطبيق على الشاشة الرئيسية</span>
            </button>
            <button
              onClick={() => setShowApkGuide(true)}
              className="athar-btn-outline flex items-center justify-center gap-2 py-2 px-3 text-xs"
            >
              <Info size={14} className="text-[#E6C66E]" />
              <span>تفاصيل صيغة الـ APK</span>
            </button>
          </div>
        </div>
      ) : (
        /* Floating or In-page Banner in HomeView */
        <div className="p-3.5 bg-gradient-to-r from-[#211B10] via-[#16130B] to-[#211B10] border border-[#E6C66E]/50 rounded-2xl shadow-xl relative animate-fadeIn select-none">
          <button
            onClick={handleDismiss}
            className="absolute top-2.5 left-2.5 text-[#C4B998] hover:text-white p-1 rounded-full cursor-pointer"
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
                <span className="text-xs font-black text-[#F3E5AB]">تثبيت تطبيق «أثر» على هاتفك</span>
                <span className="text-[9px] bg-[#C8A24A]/25 border border-[#E6C66E]/40 text-[#E6C66E] font-bold px-1.5 py-0.2 rounded-full">
                  تطبيق مستقل
                </span>
              </div>
              <p className="text-[10.5px] text-[#C4B998] mt-0.5 leading-snug">
                ثبّت التطبيق على شاشة هاتفك ليعمل كبرنامج أصلي بدون إنترنت وتصلك مواقيت الصلاة والأذان.
              </p>
              <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleInstallClick}
                  className="athar-btn-primary py-1.5 px-3 text-[11px] flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={13} />
                  <span>تثبيت التطبيق على الهاتف الآن</span>
                </button>
                <button
                  onClick={() => setShowApkGuide(true)}
                  className="text-[10px] text-[#E6C66E] hover:underline font-bold px-1.5 py-1 cursor-pointer"
                >
                  عن صيغة APK
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-[10px] text-[#A69B7B] hover:text-[#E6C66E] font-bold px-1 py-1 cursor-pointer"
                >
                  لاحقاً
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guide 1: Android & Chrome Step-by-Step Modal */}
      {showAndroidGuide && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#14120E] border border-[#C8A24A]/60 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-right">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#C8A24A]/25">
              <div className="flex items-center gap-2">
                <Smartphone size={18} className="text-[#E6C66E]" />
                <h3 className="text-sm font-extrabold text-[#F3E5AB]">تثبيت «أثر» على هواتف أندرويد</h3>
              </div>
              <button onClick={() => setShowAndroidGuide(false)} className="text-[#C4B998] hover:text-white p-1">
                <X size={16} />
              </button>
            </div>

            <div className="p-3 bg-[#1C1811] border border-[#C8A24A]/25 rounded-2xl text-[11.5px] text-[#C4B998] leading-relaxed">
              <p className="font-bold text-[#E6C66E] mb-1">لماذا لم يبدأ تنزيل ملف تلقائياً؟</p>
              تطبيق «أثر» يعمل بتقنية <strong className="text-white">PWA الحديثة</strong>، وهي البديل العصري لملفات الـ APK؛ حيث يتم تثبيته مباشرة كبرنامج كامل على شاشة هاتفك <strong className="text-white">دون تنزيل ملفات ثقيلة وبأمان تام</strong>.
            </div>

            <p className="text-xs font-bold text-white">خطوات التثبيت في ثوانٍ داخل Google Chrome:</p>

            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#1C1811] border border-[#C8A24A]/20">
                <span className="w-5 h-5 rounded-full bg-[#C8A24A] text-black font-extrabold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                <div>
                  <span className="text-[#F2EBDD] font-bold block">اضغط على زر القائمة (⋮)</span>
                  <span className="text-[11px] text-[#A69B7B]">الثلاث نقاط الموجودة في أعلى زاوية المتصفح.</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#1C1811] border border-[#C8A24A]/20">
                <span className="w-5 h-5 rounded-full bg-[#C8A24A] text-black font-extrabold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                <div>
                  <span className="text-[#F2EBDD] font-bold block">اختر «تثبيت التطبيق» أو «إضافة للشاشة الرئيسية»</span>
                  <span className="text-[11px] text-[#A69B7B]">ستظهر لك أيقونة أثر الذهبية للتأكيد.</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#1C1811] border border-[#C8A24A]/20">
                <span className="w-5 h-5 rounded-full bg-[#C8A24A] text-black font-extrabold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                <div>
                  <span className="text-[#F2EBDD] font-bold block">مبروك! التطبيق مثبت على هاتفك</span>
                  <span className="text-[11px] text-[#A69B7B]">يعمل بملء الشاشة، بدون إنترنت وبسرعة فائقة.</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowAndroidGuide(false);
                  setShowApkGuide(true);
                }}
                className="text-[11px] text-[#E6C66E] font-bold hover:underline text-center"
              >
                هل ما زلت ترغب بملف APK مخصص للتنزيل؟ اضغط هنا
              </button>
              <button
                onClick={() => setShowAndroidGuide(false)}
                className="w-full athar-btn-primary py-2 text-xs font-bold"
              >
                فهمت الطريقة، إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guide 2: iOS Safari Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#14120E] border border-[#C8A24A]/60 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-right">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#C8A24A]/25">
              <h3 className="text-sm font-extrabold text-[#F3E5AB]">تثبيت «أثر» على الآيفون (iOS)</h3>
              <button onClick={() => setShowIosGuide(false)} className="text-[#C4B998] hover:text-white p-1">
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

      {/* Guide 3: APK Explanation & How to build/download APK */}
      {showApkGuide && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#14120E] border border-[#C8A24A]/60 rounded-3xl max-w-sm w-full p-5 space-y-3.5 shadow-2xl text-right">
            <div className="flex items-center justify-between pb-2 border-b border-[#C8A24A]/25">
              <div className="flex items-center gap-2">
                <Download size={16} className="text-[#E6C66E]" />
                <h3 className="text-sm font-extrabold text-[#F3E5AB]">حول ملف الـ APK وتطبيقات أندرويد</h3>
              </div>
              <button onClick={() => setShowApkGuide(false)} className="text-[#C4B998] hover:text-white p-1">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-[#C4B998] leading-relaxed">
              إذا كنت تبحث عن ملف <strong>APK</strong> لتثبيته أو رفعه إلى Google Play:
            </p>

            <div className="space-y-2.5 text-xs text-[#F2EBDD]">
              <div className="p-3 bg-[#1C1811] border border-[#C8A24A]/20 rounded-xl space-y-1">
                <span className="font-extrabold text-[#E6C66E] block">1. الطريقة الأسهل (تحويل فوري إلى APK):</span>
                <p className="text-[11px] text-[#C4B998] leading-relaxed">
                  يمكنك استخدام أداة <strong className="text-white">PWABuilder.com</strong> التابعة لـ Microsoft و Google: ضع رابط موقعك وسيقوم بتوليد ملف <code>.apk</code> و <code>.aab</code> جاهز بنقرة واحدة لمتجر Google Play!
                </p>
              </div>

              <div className="p-3 bg-[#1C1811] border border-[#C8A24A]/20 rounded-xl space-y-1">
                <span className="font-extrabold text-[#E6C66E] block">2. كود أندرويد الأصلي (Android Studio):</span>
                <p className="text-[11px] text-[#C4B998] leading-relaxed">
                  المشروع يحتوي بالفعل على مجلد <code>/android</code> المكتوب بلغة Kotlin ومكتبات Compose؛ يمكنك فتحه في Android Studio وبناء APK عبر: <code>Build &gt; Build APK(s)</code>.
                </p>
              </div>

              <div className="p-3 bg-[#1C1811] border border-[#C8A24A]/20 rounded-xl space-y-1">
                <span className="font-extrabold text-[#E6C66E] block">3. التثبيت بدون APK (PWA):</span>
                <p className="text-[11px] text-[#C4B998] leading-relaxed">
                  لا تحتاج لملف APK لاستخدام التطبيق على هاتفك؛ مجرد الضغط على خيار <strong className="text-white">«تثبيت التطبيق»</strong> من قائمة المتصفح يثبته على هاتفك فوراً وبحجم خفيف جداً ويعمل أوفلاين.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowApkGuide(false)}
              className="w-full athar-btn-primary py-2 text-xs font-bold mt-2"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </>
  );
};
