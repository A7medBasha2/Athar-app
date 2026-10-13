import React, { useState, useEffect } from 'react';
import { LocationService } from '../services/locationService';
import { NotificationService } from '../services/notificationService';
import { AudioService } from '../services/audioService';
import { StorageService } from '../services/storageService';
import { ReminderEngine } from '../services/reminderService';
import { VoiceAssistant } from '../services/voiceAssistantService';
import { Coordinates } from '../types';
import { AtharBrandLogo } from '../components/AtharBrandLogo';
import kaabaGoldenNightImg from '../assets/images/adhan_isha_night_sanctuary_1791728317277.jpg';
import sunsetMosqueImg from '../assets/images/adhan_maghrib_sunset_minarets_1791728305890.jpg';
import {
  Clock,
  BookOpen,
  Heart,
  Compass,
  Bell,
  Volume2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Play,
  Check,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { MobilePermissionsKit } from '../components/MobilePermissionsKit';

interface OnboardingModalProps {
  isOpen: boolean;
  onFinish: (coords?: Coordinates) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onFinish,
}) => {
  const [step, setStep] = useState<number>(1);
  const [isRequestingLocation, setIsRequestingLocation] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [detectedCoords, setDetectedCoords] = useState<Coordinates | null>(
    StorageService.getSettings().location.isAutoGps
      ? StorageService.getSettings().location
      : null
  );
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>(
    NotificationService.getPermissionStatus()
  );
  const [, setMicStatus] = useState<'granted' | 'prompt' | 'denied'>('prompt');

  useEffect(() => {
    VoiceAssistant.checkMicrophonePermission().then((status) => {
      if (status === 'granted') setMicStatus('granted');
      else if (status === 'denied') setMicStatus('denied');
      else setMicStatus('prompt');
    });
  }, []);

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
        type: 'info',
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

  const grantedCount =
    (notificationStatus === 'granted' ? 1 : 0) +
    (detectedCoords ? 1 : 0) +
    (isAudioUnlocked ? 1 : 0) +
    1; // Service worker active

  return (
    <div className="fixed inset-0 z-50 bg-[#050403]/95 backdrop-blur-2xl flex items-center justify-center p-0 sm:p-4 select-none font-arabic animate-fadeIn">
      <div className="relative w-full max-w-lg h-full sm:h-auto sm:max-h-[92vh] bg-gradient-to-b from-[#13100A] via-[#0B0906] to-[#060504] sm:border sm:border-[#C8A24A]/50 sm:rounded-[32px] shadow-[0_24px_80px_rgba(0,0,0,0.96),0_0_40px_rgba(200,162,74,0.16)] text-right flex flex-col justify-between overflow-hidden">
        {/* =====================================================================
            TOP CINEMATIC SANCTUARY HEADER BANNER
           ===================================================================== */}
        <div className="relative h-44 sm:h-48 w-full shrink-0 overflow-hidden">
          <img
            src={step === 1 ? sunsetMosqueImg : kaabaGoldenNightImg}
            alt="رحاب الإيمان والسكينة"
            referrerPolicy="no-referrer"
            style={{ objectPosition: step === 1 ? 'center 35%' : 'center 42%' }}
            className="w-full h-full object-cover brightness-100 contrast-[1.04] transition-all duration-700"
          />

          {/* Smooth Royal Vignette blending seamlessly into #0B0906 body */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(6,5,4,0.55) 0%, rgba(11,9,6,0.28) 45%, rgba(11,9,6,0.92) 85%, #0B0906 100%)',
            }}
          />

          {/* Ambient Golden Halo */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 25%, rgba(230,198,110,0.24), transparent 65%)',
            }}
          />

          {/* Top Navigation Bar: Brand Emblem + Step Progress Indicator */}
          <div className="relative z-10 px-6 pt-5 flex items-center justify-between">
            <AtharBrandLogo size="sm" showSubtitle={false} showWordmark={true} />

            {/* Clean Step Progress Dots */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#E6C66E]">
                الخطوة {step} من 2
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  aria-label="الخطوة الأولى: الترحيب"
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step === 1
                      ? 'w-6 bg-gradient-to-r from-[#FFF2C2] to-[#C8A24A] shadow-[0_0_8px_#E6C66E]'
                      : 'w-2 bg-[#C8A24A]/35 hover:bg-[#C8A24A]/60'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  aria-label="الخطوة الثانية: الصلاحيات"
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step === 2
                      ? 'w-6 bg-gradient-to-r from-[#FFF2C2] to-[#C8A24A] shadow-[0_0_8px_#E6C66E]'
                      : 'w-2 bg-[#C8A24A]/35 hover:bg-[#C8A24A]/60'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Hero Title Overlaid at Bottom of Sanctuary Banner */}
          <div className="absolute inset-x-0 bottom-2 px-6 text-center z-10">
            <div className="flex items-center justify-center gap-2.5 mb-1">
              <span className="h-[1px] w-10 bg-gradient-to-r from-transparent to-[#E6C66E]/70" />
              <span className="w-1.5 h-1.5 rotate-45 bg-[#E6C66E] shadow-[0_0_8px_#E6C66E]" />
              <span className="h-[1px] w-10 bg-gradient-to-l from-transparent to-[#E6C66E]/70" />
            </div>

            {step === 1 ? (
              <>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#FFF9E6] font-quran tracking-wide drop-shadow-[0_2px_14px_rgba(0,0,0,0.95)]">
                  مرحباً بك في رحاب <span className="text-[#E6C66E]">«أَثَر»</span>
                </h1>
                <p className="text-xs text-[#D8CCA8] font-medium mt-0.5">
                  ملاذك اليومي الهادئ للقرآن الكريم والصلاة والسكينة
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#FFF9E6] font-quran tracking-wide drop-shadow-[0_2px_14px_rgba(0,0,0,0.95)]">
                  إعداد <span className="text-[#E6C66E]">الأذونات والخصوصية</span>
                </h1>
                <p className="text-xs text-[#D8CCA8] font-medium mt-0.5">
                  تجهيز المواقيت الفلكية وتنبيهات الأذان بدقة تامة وهدوء
                </p>
              </>
            )}
          </div>
        </div>

        {/* =====================================================================
            SCROLLABLE CONTENT BODY
           ===================================================================== */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* -------------------------------------------------------------------
              STEP 1: ROYAL SPIRITUAL WELCOME & PILLARS OF ATHAR
             ------------------------------------------------------------------- */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              {/* Calm Introductory Quote */}
              <p className="text-xs sm:text-[13px] text-[#CFC4A4] leading-relaxed text-center max-w-md mx-auto">
                صُمّم تطبيق <span className="text-[#F3E5AB] font-bold">أثر</span> بهوية ملكية هادئة ومريحة للعين، ليجمع لك دقة المواقيت الفلكية وجمال المصحف الشريف والأذكار اليومية دون أي تشتيت.
              </p>

              {/* 4 Refined Royal Feature Rows */}
              <div className="space-y-2.5">
                {[
                  {
                    icon: Clock,
                    title: 'مواقيت الصلاة الفلكية وشاشة الأذان الملكية',
                    desc: 'حساب دقيق حسب موقعك مع شاشة أذان سينمائية ودعاء الوسيلة والـ Live Activity.',
                  },
                  {
                    icon: BookOpen,
                    title: 'المصحف الشريف والتلاوات الخاشعة',
                    desc: 'قراءة مريحة للعين بخط قرآني واضح مع استماع متصل لكبار القراء وتفسير ميسر.',
                  },
                  {
                    icon: Heart,
                    title: 'شجرة الأثر والأذكار اليومية المعتمدة',
                    desc: 'تتبع هادئ لصلواتك وأذكار الصباح والمساء ينعكس أوراقاً ذهبية مثمرة في شجرتك.',
                  },
                  {
                    icon: Compass,
                    title: 'بوصلة القبلة الذكية والعمل بدون إنترنت',
                    desc: 'توجيه فوري نحو الكعبة المشرفة مع قاعدة بيانات محلية تعمل في كل مكان.',
                  },
                ].map((feat, i) => (
                  <div
                    key={i}
                    className="group flex items-start gap-3.5 p-3.5 rounded-2xl bg-gradient-to-l from-[#18140C]/90 via-[#120F09]/90 to-[#0E0B07]/90 border border-[#C8A24A]/25 hover:border-[#E6C66E]/55 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2B2211] to-[#171209] border border-[#E6C66E]/45 text-[#E6C66E] flex items-center justify-center shrink-0 shadow-[0_4px_14px_rgba(0,0,0,0.5)]">
                      <feat.icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs sm:text-[13px] font-extrabold text-[#F5ECD2] leading-snug">
                        {feat.title}
                      </h3>
                      <p className="text-[11px] text-[#B8AC8A] leading-relaxed mt-0.5">
                        {feat.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reassurance Note */}
              <div className="pt-1 flex items-center justify-center gap-2 text-[11px] text-[#B8AC8A]">
                <ShieldCheck size={14} className="text-[#E6C66E] shrink-0" />
                <span>خصوصية تامة ١٠٠٪ · جميع بياناتك وأورادك محفوظة على جهازك فقط</span>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------------
              STEP 2: SERENE ROYAL PERMISSIONS SETUP
             ------------------------------------------------------------------- */}
          {step === 2 && (
            <div className="space-y-3 animate-fadeIn">
              {/* One-Click Royal Master Enable Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#241D0F] via-[#1A150B] to-[#141008] border border-[#E6C66E]/55 shadow-[0_8px_24px_rgba(0,0,0,0.65)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#FFF2C2]">
                    <Sparkles size={14} className="text-[#E6C66E]" />
                    <span>تجهيز ذكي سريع بكافة الصلاحيات</span>
                  </div>
                  <p className="text-[11px] text-[#C4B998]">
                    فعّل الموقع والإشعارات والصوت بضغطة واحدة ({grantedCount} من 4 مفعّلة)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGrantAllPermissions}
                  className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] hover:brightness-110 text-[#070707] font-extrabold text-xs shadow-[0_4px_16px_rgba(230,198,110,0.35)] active:scale-95 transition-all shrink-0 flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck size={15} />
                  <span>تفعيل الكل بضغطة واحدة</span>
                </button>
              </div>

              {/* 1. Location Permission (GPS) */}
              <div className="p-3.5 rounded-2xl bg-[#13100A]/90 border border-[#C8A24A]/30 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                        detectedCoords
                          ? 'bg-[#251E10] border-[#E6C66E] text-[#FFF2C2]'
                          : 'bg-[#1A150C] border-[#C8A24A]/40 text-[#E6C66E]'
                      }`}
                    >
                      <MapPin size={17} />
                    </div>
                    <div>
                      <h3 className="text-xs font-extrabold text-[#F5ECD2]">
                        ١. الموقع الجغرافي لحساب المواقيت والقبلة
                      </h3>
                      <p className="text-[11px] text-[#B8AC8A] mt-0.5">
                        يضبط مواعيد الأذان الخمسة وزاوية القبلة حسب مدينتك بدقة فلكية
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-bold shrink-0 ${
                      detectedCoords ? 'text-[#E6C66E]' : 'text-[#9E9275]'
                    }`}
                  >
                    {detectedCoords ? 'مفعّل ✓' : 'اختياري'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleRequestLocation}
                  disabled={isRequestingLocation}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 border ${
                    detectedCoords
                      ? 'bg-[#1D170C] border-[#E6C66E]/50 text-[#FFF2C2] hover:bg-[#261E10]'
                      : 'bg-[#1F190D] hover:bg-[#2B2313] border-[#E6C66E]/60 text-[#E6C66E]'
                  }`}
                >
                  <Compass size={14} className={isRequestingLocation ? 'animate-spin' : ''} />
                  <span>
                    {isRequestingLocation
                      ? 'جاري تحديد المدينه والمنطقة'
                      : detectedCoords
                      ? `تم التحديد: ${detectedCoords.formattedLocation || detectedCoords.city} (تحديث)`
                      : 'تحديد موقعي تلقائياً عبر GPS'}
                  </span>
                </button>

                {locationError && (
                  <p className="text-[11px] text-[#E6C66E] pt-0.5">{locationError}</p>
                )}
              </div>

              {/* 2. Comprehensive Mobile Permissions Kit */}
              <div className="pt-2">
                <MobilePermissionsKit compact={true} onAllConfigured={() => {}} />
              </div>
            </div>
          )}
        </div>

        {/* =====================================================================
            BOTTOM STICKY ROYAL ACTION BAR
           ===================================================================== */}
        <div className="px-6 pb-6 pt-3 border-t border-[#C8A24A]/20 bg-[#090705]/95 shrink-0">
          {step === 1 ? (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] hover:brightness-110 text-[#070707] font-extrabold text-xs sm:text-sm shadow-[0_8px_28px_rgba(230,198,110,0.35)] border border-[#FFF9E2] active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <span>المتابعة إلى إعداد الأذونات</span>
                <ChevronLeft size={17} />
              </button>

              <button
                type="button"
                onClick={handleComplete}
                className="py-3.5 px-4 rounded-2xl bg-[#16120B] hover:bg-[#221C11] border border-[#C8A24A]/35 text-[#C4B998] hover:text-[#FFF2C2] font-bold text-xs transition-all"
              >
                تخطي
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3.5 px-4 rounded-2xl bg-[#16120B] hover:bg-[#221C11] border border-[#C8A24A]/35 text-[#E6C66E] font-bold text-xs transition-all flex items-center justify-center gap-1"
              >
                <ChevronRight size={15} />
                <span>السابق</span>
              </button>

              <button
                type="button"
                onClick={handleComplete}
                className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] hover:brightness-110 text-[#070707] font-extrabold text-xs sm:text-sm shadow-[0_8px_28px_rgba(230,198,110,0.38)] border border-[#FFF9E2] active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <span>حفظ الإعدادات وبدء رحلة أَثَر</span>
                <ChevronLeft size={17} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

