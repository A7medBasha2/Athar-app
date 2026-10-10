import React, { useState } from 'react';
import { LocationService } from '../services/locationService';
import { NotificationService } from '../services/notificationService';
import { AudioService } from '../services/audioService';
import { StorageService } from '../services/storageService';
import { Coordinates } from '../types';
import { 
  Clock, BookOpen, Heart, Compass, 
  Bell, Volume2, ShieldCheck, CheckCircle2, ChevronLeft, Play, Check 
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onFinish: (coords?: Coordinates) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onFinish
}) => {
  const [step, setStep] = useState<number>(1);
  const [isRequestingLocation, setIsRequestingLocation] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>(
    NotificationService.getPermissionStatus()
  );

  if (!isOpen) return null;

  const handleRequestLocation = async () => {
    setIsRequestingLocation(true);
    setLocationError(null);
    const res = await LocationService.getCurrentPosition();
    setIsRequestingLocation(false);
    if (res.error) {
      setLocationError(res.error);
    } else if (res.coords) {
      onFinish(res.coords);
    }
  };

  const handleRequestNotifications = async () => {
    const perm = await NotificationService.requestPermission();
    setNotificationStatus(perm);
    if (perm === 'granted') {
      NotificationService.notify({
        title: "مرحباً بك في تطبيق أثر ✓",
        body: "تم تفعيل إشعارات الهاتف بنجاح. ستصلك تنبيهات الأذان والقرآن الكريم في مواعيدها المحددة.",
        type: 'info'
      });
    }
  };

  const handleUnlockAudio = () => {
    AudioService.unlockAudio();
    setIsAudioUnlocked(true);
  };

  const handleComplete = () => {
    AudioService.unlockAudio();
    const s = StorageService.getSettings();
    s.hasCompletedOnboarding = true;
    StorageService.saveSettings(s);
    onFinish();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070A0D]/95 backdrop-blur-xl flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="w-full max-w-md bg-[#10161F] border border-[#D4AF37]/30 rounded-3xl p-6 shadow-2xl text-right flex flex-col justify-between max-h-[90vh] overflow-y-auto">
        {/* Step 1: Spiritual Welcome & Features Tour */}
        {step === 1 && (
          <div className="space-y-5 animate-slideDown">
            <div className="text-center py-2">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#997A15] to-[#E5C158] mx-auto flex items-center justify-center text-slate-950 font-bold text-3xl shadow-xl border border-white/20 mb-3">
                أَثَر
              </div>
              <h1 className="text-2xl font-bold text-slate-100 font-quran">
                مرحبًا بك في تطبيق أَثَر
              </h1>
              <p className="text-xs text-[#D4AF37] font-semibold mt-1">
                ATHAR · رفيقك اليومي للقرآن والصلاة والذكر
              </p>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed text-center">
              صُمّم «أثر» ليكون ملاذًا روحانيًا هادئًا يعينك على ذكر الله، بأعلى معايير الإتقان والتصميم الإسلامي الرفيع.
            </p>

            {/* Features Highlight */}
            <div className="space-y-2.5 pt-2">
              {[
                { icon: Clock, title: 'مواقيت الصلاة الدقيقة والأذان', desc: 'حساب فلكي معتمد وموثوق بحسب موقعك وطريقتك المختارة' },
                { icon: BookOpen, title: 'القرآن الكريم والتلاوة العطرة', desc: 'قراءة مريحة بدون تشتيت مع تلاوات مستمرة في الخلفية' },
                { icon: Heart, title: 'أذكار الصباح والمساء المعتمدة', desc: 'تكرار آلي منظم بصوت شجي يحفظ تقدمك اليومي' },
                { icon: Compass, title: 'بوصلة القبلة الذكية', desc: 'توجيه فوري ودقيق نحو الكعبة المشرفة بمستشعرات جهازك' },
              ].map((feat, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/30 border border-slate-800">
                  <div className="p-2 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37] shrink-0 mt-0.5">
                    <feat.icon size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">{feat.title}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full mt-4 py-3 bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <span>المتابعة إلى إعداد الصلاحيات</span>
              <ChevronLeft size={16} />
            </button>
          </div>
        )}

        {/* Step 2: All Required App Permissions with Clear Status & Explanations */}
        {step === 2 && (
          <div className="space-y-4 animate-slideDown">
            <div className="text-center py-1">
              <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/20 text-[#D4AF37] mx-auto flex items-center justify-center mb-2">
                <ShieldCheck size={28} />
              </div>
              <h2 className="text-lg font-bold text-slate-100">
                الصلاحيات والخصوصية الكاملة
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                نحترم خصوصيتك بالكامل، ولا يتم جمع أو إرسال أي بيانات شخصية لخوادم خارجية
              </p>
            </div>

            {/* 1. Notification Permission Block */}
            <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <Bell size={16} className={notificationStatus === 'granted' ? 'text-emerald-400' : 'text-[#D4AF37]'} />
                  <span>إذن إشعارات الهاتف والأذان</span>
                </div>
                {notificationStatus === 'granted' ? (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
                    ممنوحة بنجاح ✓
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
                    مطلوبة للتنبيهات ⚠️
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                ضروري لتنبيهك عند دخول وقت الصلاة، وسماع الأذان، واستلام تذكيرات القرآن والورد حتى لو الشاشة مقفلة أو خارج التطبيق.
              </p>
              {notificationStatus !== 'granted' ? (
                <button
                  onClick={handleRequestNotifications}
                  className="w-full py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow"
                >
                  <Bell size={14} />
                  <span>تفعيل إذن إشعارات الهاتف الآن</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    NotificationService.notify({
                      title: "تجربة إشعار الهاتف - أثر ✓",
                      body: "التنبيهات تعمل بنجاح وستصلك في مواعيد الصلوات والتذكيرات.",
                      type: 'info'
                    });
                  }}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center justify-center gap-1.5"
                >
                  <Play size={12} fill="currentColor" />
                  <span>تجربة إشعار فوري للتأكد</span>
                </button>
              )}
            </div>

            {/* 2. Location Permission Block */}
            <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <Compass size={16} className="text-[#D4AF37]" />
                  <span>إذن تحديد الموقع الجغرافي (GPS)</span>
                </div>
                <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md">
                  {StorageService.getSettings().location.city}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                يُستخدم حصريًا لحساب مواقيت الصلاة بدقة وتحديد اتجاه القبلة لموقعك الحالي.
              </p>
              <button
                onClick={handleRequestLocation}
                disabled={isRequestingLocation}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
              >
                <span>{isRequestingLocation ? 'جاري تحديد الموقع...' : 'تحديد الموقع تلقائيًا عبر GPS'}</span>
              </button>
              {locationError && (
                <p className="text-[10px] text-amber-400 mt-1">{locationError}</p>
              )}
            </div>

            {/* 3. Background Audio & Autoplay */}
            <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <Volume2 size={16} className="text-cyan-400" />
                  <span>إذن تشغيل الصوت التلقائي والوسائط</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  {isAudioUnlocked ? 'مفعل ومُهيأ ✓' : 'جاهز للتهيئة'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                ضروري لسماع الأذان وتلاوات القرآن في الخلفية والتحكم من شاشة القفل وسماعات البلوتوث.
              </p>
              {!isAudioUnlocked && (
                <button
                  onClick={handleUnlockAudio}
                  className="w-full py-1.5 bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Volume2 size={13} />
                  <span>تهيئة مشغل الصوت بالمتصفح الآن</span>
                </button>
              )}
            </div>

            {/* 4. Background Service Worker & Lock Screen */}
            <div className="p-2.5 bg-slate-800/30 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400" />
                <div>
                  <span className="text-slate-200 font-bold block text-xs">العمل خارج التطبيق وفي وضع السكون</span>
                  <span className="text-[10px] text-slate-400">Service Worker لدعم الهواتف وشاشة القفل</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md">
                نشط في النظام ✓
              </span>
            </div>

            {/* Complete / Enter App Button */}
            <div className="pt-2">
              <button
                onClick={handleComplete}
                className="w-full py-3 bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
              >
                <span>المتابعة وبدء استخدام تطبيق أَثَر</span>
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
