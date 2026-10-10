import React, { useState } from 'react';
import { LocationService } from '../services/locationService';
import { NotificationService } from '../services/notificationService';
import { AudioService } from '../services/audioService';
import { StorageService } from '../services/storageService';
import { ReminderEngine } from '../services/reminderService';
import { Coordinates } from '../types';
import { AtharBrandLogo } from '../components/AtharBrandLogo';
import { 
  Clock, BookOpen, Heart, Compass, 
  Bell, Volume2, ShieldCheck, ChevronLeft, Play 
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
  const [detectedCoords, setDetectedCoords] = useState<Coordinates | null>(
    StorageService.getSettings().location.isAutoGps ? StorageService.getSettings().location : null
  );
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
      setDetectedCoords(res.coords);
      const s = StorageService.getSettings();
      s.location = res.coords;
      StorageService.saveSettings(s);
    }
  };

  const handleRequestNotifications = async () => {
    const perm = await NotificationService.requestPermission();
    setNotificationStatus(perm);
    if (perm === 'granted') {
      NotificationService.notify({
        title: 'مرحباً بك في تطبيق أثر ✓',
        body: 'تم تفعيل إشعارات الهاتف بنجاح. ستصلك تنبيهات الأذان والقرآن الكريم في مواعيدها المحددة حتى لو الشاشة مقفلة.',
        type: 'info'
      });
    }
  };

  const handleUnlockAudio = () => {
    AudioService.unlockAudio();
    setIsAudioUnlocked(true);
    ReminderEngine.testSalawatReminder();
  };

  const handleGrantAllPermissions = async () => {
    AudioService.unlockAudio();
    setIsAudioUnlocked(true);
    if (notificationStatus !== 'granted') {
      const perm = await NotificationService.requestPermission();
      setNotificationStatus(perm);
    }
    await handleRequestLocation();
  };

  const handleComplete = () => {
    AudioService.unlockAudio();
    const s = StorageService.getSettings();
    s.hasCompletedOnboarding = true;
    if (detectedCoords) {
      s.location = detectedCoords;
    }
    StorageService.saveSettings(s);
    onFinish(detectedCoords || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070A0D]/95 backdrop-blur-xl flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="w-full max-w-md bg-[#10161F] border border-[#D4AF37]/30 rounded-3xl p-6 shadow-2xl text-right flex flex-col justify-between max-h-[90vh] overflow-y-auto">
        {/* Step 1: Spiritual Welcome & Features Tour */}
        {step === 1 && (
          <div className="space-y-5 animate-slideDown">
            <div className="flex flex-col items-center justify-center py-2 text-center">
              <AtharBrandLogo size="lg" showSubtitle={false} className="justify-center mb-3" />
              <h1 className="text-2xl font-bold text-slate-100 font-quran">
                مرحبًا بك في تطبيق أَثَر
              </h1>
              <p className="text-xs text-[#D4AF37] font-semibold mt-1">
                ATHAR · رفيقك اليومي للقرآن والصلاة والسكينة
              </p>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed text-center">
              صُمّم «أثر» ليكون ملاذًا روحانيًا هادئًا يعينك على ذكر الله، بأعلى معايير الإتقان والتصميم الإسلامي الرفيع.
            </p>

            {/* Features Highlight */}
            <div className="space-y-2.5 pt-2">
              {[
                { icon: Clock, title: 'مواقيت الصلاة الدقيقة والأذان', desc: 'حساب فلكي معتمد بحسب موقعك مع دعاء الأذان والإقامة' },
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
              <span>المتابعة إلى إعداد الصلاحيات والأذونات</span>
              <ChevronLeft size={16} />
            </button>
          </div>
        )}

        {/* Step 2: All Required App Permissions with Clear Status & Explanations */}
        {step === 2 && (
          <div className="space-y-3.5 animate-slideDown">
            <div className="text-center py-1">
              <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/20 text-[#D4AF37] mx-auto flex items-center justify-center mb-2">
                <ShieldCheck size={28} />
              </div>
              <h2 className="text-lg font-bold text-slate-100">
                الصلاحيات والخصوصية الكاملة
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                فعّل الأذونات التالية ليعمل الأذان والتنبيهات في مواعيدها بدقة حتى لو الشاشة مقفلة
              </p>
            </div>

            {/* Quick Grant All Button */}
            <button
              onClick={handleGrantAllPermissions}
              className="w-full py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#B38F24] hover:brightness-110 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <ShieldCheck size={16} />
              <span>تفعيل كافة أذونات التطبيق بضغطة واحدة</span>
            </button>

            {/* 1. Notification Permission Block */}
            <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <Bell size={16} className={notificationStatus === 'granted' ? 'text-emerald-400' : 'text-[#D4AF37]'} />
                  <span>1. إذن إشعارات الهاتف وشاشة القفل</span>
                </div>
                {notificationStatus === 'granted' ? (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
                    ممنوحة بنجاح ✓
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
                    تحتاج صلاحية ⚠️
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                لإظهار التنبيهات والأذان على شاشة الهاتف سواء كنت داخل البرنامج أو خارجه أو الشاشة مقفلة.
              </p>
              {notificationStatus !== 'granted' ? (
                <button
                  onClick={handleRequestNotifications}
                  className="w-full py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow"
                >
                  <Bell size={14} />
                  <span>منح صلاحية الإشعارات الآن</span>
                </button>
              ) : (
                <button
                  onClick={() => ReminderEngine.testSalawatReminder()}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center justify-center gap-1.5"
                >
                  <Play size={12} fill="currentColor" />
                  <span>تجربة إشعار وصوت فوري للتأكد</span>
                </button>
              )}
            </div>

            {/* 2. Location Permission Block */}
            <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <Compass size={16} className={detectedCoords ? 'text-emerald-400' : 'text-[#D4AF37]'} />
                  <span>2. إذن الموقع الجغرافي الدقيق (GPS)</span>
                </div>
                {detectedCoords ? (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
                    ممنوحة ({detectedCoords.city}) ✓
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
                    تحتاج صلاحية ⚠️
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                لضبط مواقيت الصلاة والأذان في موعد منطقتك بالضبط وتحديد زاوية القبلة.
              </p>
              <button
                onClick={handleRequestLocation}
                disabled={isRequestingLocation}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
              >
                <span>
                  {isRequestingLocation
                    ? 'جاري تحديد موقع منطقتك...'
                    : detectedCoords
                    ? `تم التحديد: ${detectedCoords.city} (تحديث)`
                    : 'تحديد موقعي تلقائيًا عبر GPS الآن'}
                </span>
              </button>
              {locationError && (
                <p className="text-[10px] text-amber-400 mt-1">{locationError}</p>
              )}
            </div>

            {/* 3. Background Audio & Autoplay */}
            <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <Volume2 size={16} className={isAudioUnlocked ? 'text-emerald-400' : 'text-cyan-400'} />
                  <span>3. إذن تشغيل الصوت التلقائي والأذان</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                  isAudioUnlocked
                    ? 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30'
                    : 'text-amber-400 bg-amber-500/20 border-amber-500/30'
                }`}>
                  {isAudioUnlocked ? 'ممنوحة ومُهيأة ✓' : 'جاهز للتفعيل'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                لسماع الأذان ودعاء الوسيلة والإقامة وتذكيرات الآيات بالصوت فور حلول وقتها.
              </p>
              <button
                onClick={handleUnlockAudio}
                className="w-full py-1.5 bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Volume2 size={13} />
                <span>{isAudioUnlocked ? 'إعادة تجربة الصوت المهيأ' : 'تفعيل وتجربة مشغل الصوت الآن'}</span>
              </button>
            </div>

            {/* 4. Background Service Worker & Lock Screen */}
            <div className="p-2.5 bg-slate-800/30 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400" />
                <div>
                  <span className="text-slate-200 font-bold block text-xs">4. العمل في الخلفية وشاشة القفل</span>
                  <span className="text-[10px] text-slate-400">Service Worker محمل مسبقاً بملفات الأذان والتذكيرات</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md">
                نشط ✓
              </span>
            </div>

            {/* Complete / Enter App Button */}
            <div className="pt-2">
              <button
                onClick={handleComplete}
                className="w-full py-3 bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
              >
                <span>حفظ الصلاحيات وبدء استخدام تطبيق أَثَر</span>
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
