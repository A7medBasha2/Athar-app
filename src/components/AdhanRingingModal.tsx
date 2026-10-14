import React, { useState, useEffect } from 'react';
import {
  ReminderEngine,
  ActiveAdhanScreenState,
  ObligatoryPrayerId,
} from '../services/reminderService';
import { AudioService } from '../services/audioService';
import { LiveActivityService } from '../services/liveActivityService';
import { StorageService } from '../services/storageService';
import fajrDawnKaabaImg from '../assets/images/adhan_fajr_dawn_kaaba_1791728275991.jpg';
import dhuhrMadinahImg from '../assets/images/adhan_dhuhr_madinah_sunlight_1791728285777.jpg';
import asrAqsaGoldenImg from '../assets/images/adhan_asr_aqsa_golden_hour_1791728295736.jpg';
import maghribSunsetMosqueImg from '../assets/images/adhan_maghrib_sunset_minarets_1791728305890.jpg';
import ishaNightKaabaImg from '../assets/images/adhan_isha_night_sanctuary_1791728317277.jpg';
import {
  Volume2,
  VolumeX,
  Clock,
  Square,
} from 'lucide-react';

interface DedicatedPrayerScene {
  prayerId: ObligatoryPrayerId;
  primarySrc: string;
  publicFallbackSrc: string;
  titleArabic: string;
  objectPosition: string;
  ambientGlowColor: string;
  topVignetteOverlay: string;
  skyFallbackGradient: string;
}

/**
 * Dedicated ultra-high-resolution vertical (9:16) sanctuary scenes
 * specifically crafted for each prayer's exact time of day:
 * - Fajr: Peaceful dawn rose-indigo sky over the Holy Kaaba
 * - Dhuhr: Luminous clear midday sunlight over the Prophet's Mosque Green Dome
 * - Asr: Warm golden-hour afternoon light over the Dome of the Rock (Al-Aqsa)
 * - Maghrib: Royal amber & twilight sunset sky with crescent moon and glowing minarets
 * - Isha: Deep starry night sky over the golden-illuminated Holy Kaaba
 */
const DEDICATED_PRAYER_SCENES: Record<ObligatoryPrayerId, DedicatedPrayerScene> = {
  fajr: {
    prayerId: 'fajr',
    primarySrc: '/adhan-scenes/fajr.jpg',
    publicFallbackSrc: fajrDawnKaabaImg,
    titleArabic: 'الكعبة المشرفة عند نسائم الفجر',
    objectPosition: 'center 42%',
    ambientGlowColor: 'rgba(235, 195, 145, 0.28)',
    topVignetteOverlay:
      'linear-gradient(180deg, rgba(8,12,24,0.46) 0%, rgba(8,12,24,0.04) 24%, rgba(8,12,24,0.06) 56%, rgba(5,4,3,0.78) 77%, rgba(4,3,2,0.95) 100%)',
    skyFallbackGradient:
      'linear-gradient(180deg, #162238 0%, #3A3D5C 35%, #8C6568 62%, #070605 100%)',
  },
  dhuhr: {
    prayerId: 'dhuhr',
    primarySrc: '/adhan-scenes/dhuhr.jpg',
    publicFallbackSrc: dhuhrMadinahImg,
    titleArabic: 'المسجد النبوي الشريف في ضياء الظهيرة',
    objectPosition: 'center 38%',
    ambientGlowColor: 'rgba(243, 229, 171, 0.26)',
    topVignetteOverlay:
      'linear-gradient(180deg, rgba(6,14,24,0.48) 0%, rgba(6,14,24,0.05) 26%, rgba(6,14,24,0.06) 56%, rgba(5,4,3,0.80) 77%, rgba(4,3,2,0.95) 100%)',
    skyFallbackGradient:
      'linear-gradient(180deg, #1E4E79 0%, #4A89B8 42%, #8C734B 72%, #070605 100%)',
  },
  asr: {
    prayerId: 'asr',
    primarySrc: '/adhan-scenes/asr.jpg',
    publicFallbackSrc: asrAqsaGoldenImg,
    titleArabic: 'قبة الصخرة المشرفة في أصيل العصر الذهبي',
    objectPosition: 'center 42%',
    ambientGlowColor: 'rgba(230, 198, 110, 0.32)',
    topVignetteOverlay:
      'linear-gradient(180deg, rgba(8,14,22,0.46) 0%, rgba(8,14,22,0.04) 25%, rgba(8,14,22,0.06) 55%, rgba(5,4,3,0.80) 77%, rgba(4,3,2,0.95) 100%)',
    skyFallbackGradient:
      'linear-gradient(180deg, #1A4369 0%, #567D9E 42%, #9E7B42 72%, #070605 100%)',
  },
  maghrib: {
    prayerId: 'maghrib',
    primarySrc: '/adhan-scenes/maghrib.jpg',
    publicFallbackSrc: maghribSunsetMosqueImg,
    titleArabic: 'المآذن السلطانية وهلال شفق المغرب',
    objectPosition: 'center 38%',
    ambientGlowColor: 'rgba(235, 168, 72, 0.34)',
    topVignetteOverlay:
      'linear-gradient(180deg, rgba(10,6,12,0.46) 0%, rgba(10,6,12,0.04) 25%, rgba(10,6,12,0.06) 55%, rgba(5,4,3,0.78) 77%, rgba(4,3,2,0.95) 100%)',
    skyFallbackGradient:
      'linear-gradient(180deg, #271E36 0%, #6E4134 38%, #B56E33 65%, #070605 100%)',
  },
  isha: {
    prayerId: 'isha',
    primarySrc: '/adhan-scenes/isha.jpg',
    publicFallbackSrc: ishaNightKaabaImg,
    titleArabic: 'الكعبة المشرفة تحت سماء العشاء المرصعة بالنجوم',
    objectPosition: 'center 45%',
    ambientGlowColor: 'rgba(230, 198, 110, 0.34)',
    topVignetteOverlay:
      'linear-gradient(180deg, rgba(3,4,8,0.44) 0%, rgba(3,4,8,0.04) 24%, rgba(3,4,8,0.06) 56%, rgba(5,4,3,0.78) 77%, rgba(4,3,2,0.95) 100%)',
    skyFallbackGradient:
      'linear-gradient(180deg, #040711 0%, #0D1424 45%, #2B2110 75%, #050403 100%)',
  },
};

const ADHAN_PHRASES: Array<{
  arabic: string;
  response: string;
  fajrOnly?: boolean;
}> = [
  {
    arabic: 'اللَّهُ أَكْبَرُ ، اللَّهُ أَكْبَرُ',
    response: 'الترديد: «اللَّهُ أَكْبَرُ ، اللَّهُ أَكْبَرُ»',
  },
  {
    arabic: 'أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ',
    response: 'الترديد: «أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ»',
  },
  {
    arabic: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللَّهِ ﷺ',
    response: 'الترديد: «أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللَّهِ»',
  },
  {
    arabic: 'حَيَّ عَلَى الصَّلَاةِ · حَيَّ عَلَى الْفَلَاحِ',
    response: 'الترديد: «لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ»',
  },
  {
    arabic: 'الصَّلَاةُ خَيْرٌ مِنَ النَّوْمِ',
    response: 'الترديد: «صَدَقْتَ وَبَرِرْتَ» أو مثل قول المؤذن',
    fajrOnly: true,
  },
  {
    arabic: 'اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ · لَا إِلَٰهَ إِلَّا اللَّهُ',
    response: 'ثم الصلاة على النبي ﷺ وسؤال الوسيلة له',
  },
];

const VOICE_NAMES: Record<string, string> = {
  alafasy: 'الشيخ مشاري راشد العفاسي',
  makkah: 'أذان الحرم المكي الشريف',
  madinah: 'أذان المسجد النبوي الشريف',
  alaqsa: 'أذان المسجد الأقصى المبارك',
};

const GOLDEN_PARTICLES = [
  { left: '12%', bottom: '20%', size: 4, delay: '0s', duration: '7s' },
  { left: '26%', bottom: '30%', size: 3, delay: '1.2s', duration: '8.5s' },
  { left: '42%', bottom: '24%', size: 4.5, delay: '2.4s', duration: '6.8s' },
  { left: '58%', bottom: '34%', size: 3.5, delay: '0.7s', duration: '9s' },
  { left: '74%', bottom: '26%', size: 4, delay: '1.8s', duration: '7.4s' },
  { left: '88%', bottom: '32%', size: 3, delay: '2.9s', duration: '8.2s' },
];

/**
 * Ornate Royal Hanging Mosque Lantern SVG (Animated Sway)
 */
const RoyalHangingLantern: React.FC<{
  className?: string;
  size?: number;
}> = ({ className = '', size = 40 }) => (
  <div className={`pointer-events-none flex flex-col items-center ${className}`}>
    <div className="w-[1.5px] h-8 sm:h-11 bg-gradient-to-b from-[#F3E5AB] via-[#E6C66E] to-[#A67C22] shadow-[0_0_8px_#E6C66E]" />
    <svg
      width={size}
      height={Math.round(size * 1.45)}
      viewBox="0 0 60 88"
      fill="none"
      className="drop-shadow-[0_0_20px_rgba(230,198,110,0.85)]"
    >
      <defs>
        <radialGradient id="lanternInnerGlow" cx="50%" cy="52%" r="50%">
          <stop offset="0%" stopColor="#FFF9E2" stopOpacity="1" />
          <stop offset="55%" stopColor="#E6C66E" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#A67C22" stopOpacity="0.15" />
        </radialGradient>
        <linearGradient id="lanternGoldMetal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF2C2" />
          <stop offset="50%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#8A6418" />
        </linearGradient>
      </defs>
      <circle cx="30" cy="6" r="4" stroke="url(#lanternGoldMetal)" strokeWidth="2" />
      <path d="M20 18 C22 11, 38 11, 40 18 Z" fill="url(#lanternGoldMetal)" />
      <rect x="16" y="18" width="28" height="3.5" rx="1.5" fill="url(#lanternGoldMetal)" />
      <path
        d="M18 22 L12 44 L19 66 L41 66 L48 44 L42 22 Z"
        fill="url(#lanternInnerGlow)"
        stroke="url(#lanternGoldMetal)"
        strokeWidth="2.2"
      />
      <path
        d="M23 22 L20 44 L24 66 M37 22 L40 44 L36 66 M13 44 L47 44"
        stroke="#735110"
        strokeWidth="1.2"
        strokeOpacity="0.65"
      />
      <circle cx="30" cy="44" r="7" fill="#FFFDF5" className="animate-pulse" />
      <path d="M20 66 L40 66 L35 73 L25 73 Z" fill="url(#lanternGoldMetal)" />
      <path d="M30 73 L30 84" stroke="url(#lanternGoldMetal)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="30" cy="84" r="2.5" fill="#FFF2C2" />
    </svg>
  </div>
);

export const AdhanRingingModal: React.FC = () => {
  const [adhanState, setAdhanState] = useState<ActiveAdhanScreenState | null>(() =>
    ReminderEngine.getActiveAdhanScreen()
  );
  const [activePhraseIdx, setActivePhraseIdx] = useState<number>(0);
  const [isPrayerLogged, setIsPrayerLogged] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [useFallbackSrc, setUseFallbackSrc] = useState<boolean>(false);
  const [imageFailedCompletely, setImageFailedCompletely] = useState<boolean>(false);
  const [isCallInterrupted, setIsCallInterrupted] = useState<boolean>(() => AudioService.isCallInterrupted());

  useEffect(() => {
    const unsubAudio = AudioService.subscribe(() => {
      setIsCallInterrupted(AudioService.isCallInterrupted());
    });
    const unsub = ReminderEngine.subscribeAdhanScreen((state) => {
      setAdhanState(state);
      if (state) {
        const ach = StorageService.getPrayerAchievements();
        setIsPrayerLogged(Boolean(ach.todayPrayers[state.prayerKey]));
        setActivePhraseIdx(0);
        const initSec = state.startedAt ? Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000)) : 0;
        setElapsedSeconds(initSec);
        setUseFallbackSrc(false);
        setImageFailedCompletely(false);
      }
    });
    return () => {
      unsubAudio();
      unsub();
    };
  }, []);

  // Keep phone screen illuminated with WakeLock & run phrase animation
  useEffect(() => {
    if (!adhanState) return;
    let wakeLockSentinel: any = null;

    const acquireWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && (navigator as any).wakeLock?.request) {
          wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        }
      } catch {}
    };
    acquireWakeLock();

    const phrasesForPrayer = ADHAN_PHRASES.filter(
      (p) => !p.fajrOnly || adhanState.prayerKey === 'fajr'
    );

    const secTimer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    const phraseTimer = setInterval(() => {
      setActivePhraseIdx((prev) => (prev + 1) % phrasesForPrayer.length);
    }, 6000);

    return () => {
      clearInterval(secTimer);
      clearInterval(phraseTimer);
      if (wakeLockSentinel && typeof wakeLockSentinel.release === 'function') {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, [adhanState?.id, adhanState?.prayerKey]);

  if (!adhanState) return null;

  const currentScene: DedicatedPrayerScene =
    DEDICATED_PRAYER_SCENES[adhanState.prayerKey] || DEDICATED_PRAYER_SCENES.maghrib;

  const resolvedImgSrc = useFallbackSrc
    ? currentScene.publicFallbackSrc
    : currentScene.primarySrc;

  const filteredPhrases = ADHAN_PHRASES.filter(
    (p) => !p.fajrOnly || adhanState.prayerKey === 'fajr'
  );
  const currentPhrase =
    filteredPhrases[activePhraseIdx % filteredPhrases.length] || filteredPhrases[0];

  const isAudioActivelyPlaying =
    !adhanState.isMutedKeepScreen && !adhanState.isAudioFinished;

  // Check if this prayer's time has actually arrived today (never allow premature prayer logging!)
  const isPrayerTimeArrived = (() => {
    if (!adhanState?.prayerKey) return false;
    const nowMs = Date.now();

    // 1. Check live calculated segment timestamp (exact millisecond timestamp from Astronomical engine)
    const liveState = LiveActivityService.getState();
    const liveSeg = liveState.segments?.find((s: { id: string; timestamp: number }) => s.id === adhanState.prayerKey);
    if (liveSeg && liveSeg.timestamp > 0) {
      return nowMs >= liveSeg.timestamp;
    }

    // 2. Secondary check against cached prayer times data
    const cached = StorageService.getCachedPrayers();
    if (cached?.timings?.[adhanState.prayerKey]) {
      const rawTime = String(cached.timings[adhanState.prayerKey]).trim();
      const match = rawTime.match(/(\d{1,2}):(\d{1,2})/);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        // Correct PM/12h formatting if present
        if (rawTime.includes('م') || rawTime.toUpperCase().includes('PM')) {
          if (h < 12) h += 12;
        } else if ((adhanState.prayerKey === 'asr' || adhanState.prayerKey === 'maghrib' || adhanState.prayerKey === 'isha') && h < 12) {
          h += 12;
        } else if (adhanState.prayerKey === 'dhuhr' && h < 11) {
          h += 12;
        }
        const now = new Date();
        const pDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
        return nowMs >= pDate.getTime();
      }
    }

    // If prayer timings cannot be verified yet, assume not arrived to prevent false logging
    return false;
  })();

  const handleLogPrayerInImpactTree = () => {
    if (isPrayerLogged || !isPrayerTimeArrived) return;
    const ach = StorageService.getPrayerAchievements();
    if (!ach.todayPrayers[adhanState.prayerKey]) {
      StorageService.toggleTodayPrayer(adhanState.prayerKey);
    }
    setIsPrayerLogged(true);
  };

  const iqamahRemainingSeconds = Math.max(
    0,
    adhanState.iqamahOffsetMinutes * 60 - elapsedSeconds
  );
  const iqamahMin = Math.floor(iqamahRemainingSeconds / 60);
  const iqamahSec = iqamahRemainingSeconds % 60;
  const iqamahFormatted = `${String(iqamahMin).padStart(2, '0')}:${String(iqamahSec).padStart(2, '0')}`;

  return (
    <div
      className="fixed inset-0 z-[99999] bg-[#040302] text-white flex flex-col justify-between overflow-hidden select-none font-arabic animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={`شاشة أذان صلاة ${adhanState.prayerNameArabic}`}
    >
      {/* =====================================================================
          1. DEDICATED PER-PRAYER 9:16 FULL-SCREEN SANCTUARY SCENE
          Matched to the exact time of day (Fajr Dawn, Dhuhr Sunlight, Asr Golden Hour,
          Maghrib Sunset, Isha Starry Night) with dual-source fallback so broken image icons NEVER appear.
         ===================================================================== */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{ background: currentScene.skyFallbackGradient }}
      >
        {!imageFailedCompletely && (
          <img
            key={`${currentScene.prayerId}-${useFallbackSrc ? 'fallback' : 'primary'}`}
            src={resolvedImgSrc}
            alt={currentScene.titleArabic}
            referrerPolicy="no-referrer"
            loading="eager"
            decoding="async"
            fetchPriority="high"
            onError={() => {
              if (!useFallbackSrc) {
                setUseFallbackSrc(true);
              } else {
                setImageFailedCompletely(true);
              }
            }}
            style={{ objectPosition: currentScene.objectPosition }}
            className="w-full h-full object-cover opacity-100 brightness-105 contrast-[1.05] saturate-[1.1] animate-adhan-kenburns transition-all duration-1000"
          />
        )}

        {/* Ultra-clean cinematic gradient: keeps the sanctuary & sky crystal clear */}
        <div
          className="absolute inset-0"
          style={{
            background: currentScene.topVignetteOverlay,
          }}
        />

        {/* Ambient Golden Rays */}
        <div
          className="absolute inset-0 transition-all duration-1000"
          style={{
            background: `radial-gradient(circle at 50% 24%, ${currentScene.ambientGlowColor}, transparent 62%)`,
          }}
        />

        {/* Animated Rising Golden Light Dust Particles */}
        {GOLDEN_PARTICLES.map((p, i) => (
          <span
            key={i}
            style={{
              left: p.left,
              bottom: p.bottom,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animation: `adhanFloatParticle ${p.duration} ease-in-out ${p.delay} infinite`,
            }}
            className="absolute rounded-full bg-[#FFF2C2] shadow-[0_0_12px_#E6C66E,0_0_22px_#D4AF37]"
          />
        ))}
      </div>

      {/* =====================================================================
          2. TOP FLOATING ROYAL LANTERNS & CELESTIAL CALLIGRAPHY
         ===================================================================== */}
      <div className="relative z-10 w-full max-w-lg mx-auto px-6 pt-2 flex flex-col items-center text-center pointer-events-none">
        {/* Swaying Golden Lanterns on Both Sides */}
        <div className="w-full flex items-start justify-between px-2">
          <RoyalHangingLantern className="animate-lantern-sway -mt-2" size={34} />

          {/* Pulsating Golden Radar Halo & Crescent Crest */}
          <div className="relative w-16 h-16 flex items-center justify-center mt-2">
            {isAudioActivelyPlaying && (
              <>
                <span className="absolute inset-0 rounded-full border border-[#E6C66E]/65 animate-adhan-ring-1" />
                <span className="absolute inset-0 rounded-full border border-[#E6C66E]/45 animate-adhan-ring-2" />
                <span className="absolute inset-0 rounded-full border border-[#FFF2C2]/35 animate-adhan-ring-3" />
              </>
            )}
            <div className="relative w-12 h-12 rounded-full bg-gradient-to-b from-[#28200F]/80 to-[#0D0A05]/85 border border-[#FFF2C2] flex items-center justify-center shadow-[0_0_30px_rgba(230,198,110,0.85)] backdrop-blur-sm">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <path
                  d="M21.5 19.8A9 9 0 0 1 12.2 10.5a9.1 9.1 0 0 1 1.8-5.4A9.5 9.5 0 1 0 25.9 20a9 9 0 0 1-4.4-.2Z"
                  fill="#FFF2C2"
                />
                <polygon
                  points="22,6 23.1,8.5 25.8,8.8 23.8,10.6 24.3,13.2 22,11.9 19.7,13.2 20.2,10.6 18.2,8.8 20.9,8.5"
                  fill="#E6C66E"
                />
              </svg>
            </div>
          </div>

          <RoyalHangingLantern className="animate-lantern-sway-delayed -mt-2" size={34} />
        </div>

        {/* Floating Prayer Title & Time */}
        <span className="mt-1 text-xs font-extrabold text-[#FFF2C2] tracking-wide drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
          حان الآن موعد الأذان · {adhanState.prayerTime12}
        </span>

        <h1 className="mt-0.5 text-4xl sm:text-5xl font-black text-white font-quran tracking-wide drop-shadow-[0_4px_24px_rgba(0,0,0,0.98)]">
          أذان صلاة <span className="text-[#FFF2C2]">{adhanState.prayerNameArabic}</span>
        </h1>

        <p className="mt-0.5 text-[11px] font-bold text-[#E6C66E] drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
          {VOICE_NAMES[adhanState.voiceId] || 'الشيخ مشاري راشد العفاسي'}
        </p>
      </div>

      {/* =====================================================================
          3. LOWER-THIRD FRAMELESS CALLIGRAPHY, WASILAH DUA & 3 EQUAL BUTTONS
         ===================================================================== */}
      <div className="relative z-20 w-full max-w-lg mx-auto px-5 pb-6 pt-2 space-y-3 text-center">
        {/* Live Muezzin Phrase Floating Directly with Acoustic Equalizer */}
        <div className="space-y-1 pointer-events-none">
          {isAudioActivelyPlaying && (
            <div className="flex items-end justify-center gap-[3px] h-3.5 mb-1">
              {[0.1, 0.35, 0.2, 0.5, 0.15, 0.4, 0.25].map((delay, i) => (
                <span
                  key={i}
                  style={{
                    animation: `adhanSoundBar 0.85s ease-in-out ${delay}s infinite`,
                  }}
                  className="w-[3px] h-full rounded-full bg-gradient-to-t from-[#B88A2D] via-[#E6C66E] to-[#FFF2C2] origin-bottom shadow-[0_0_8px_#E6C66E]"
                />
              ))}
            </div>
          )}

          <p className="font-quran text-2xl sm:text-3xl font-bold text-[#FFF7D6] leading-snug drop-shadow-[0_3px_16px_rgba(0,0,0,0.98)]">
            « {currentPhrase.arabic} »
          </p>
          <p className="text-[11px] font-extrabold text-[#E6C66E] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
            {currentPhrase.response}
          </p>
        </div>

        {/* Frameless Post-Adhan Wasilah Supplication (Written directly without any frame/box) */}
        <div className="pt-1 space-y-1 pointer-events-none">
          <div className="flex items-center justify-center gap-2">
            <span className="h-[1px] w-8 bg-gradient-to-r from-transparent to-[#E6C66E]/60" />
            <span className="text-[10px] font-extrabold text-[#E6C66E] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
              دعاء الوسيلة بعد الأذان
            </span>
            <span className="h-[1px] w-8 bg-gradient-to-l from-transparent to-[#E6C66E]/60" />
          </div>
          <p className="font-quran text-sm sm:text-base text-[#FFF7D6]/95 leading-relaxed max-w-md mx-auto drop-shadow-[0_2px_12px_rgba(0,0,0,0.98)]">
            «اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ»
          </p>
        </div>

        {/* Sleek Golden Iqamah Countdown Strip */}
        <div className="pt-1 max-w-sm mx-auto space-y-1 pointer-events-none">
          <div className="flex items-center justify-between text-[10px] font-extrabold px-1 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
            <span className="text-[#E5DEC9] flex items-center gap-1">
              <Clock size={11} className="text-[#E6C66E]" />
              <span>إقامة الصلاة</span>
            </span>
            <span className="font-mono font-black text-[#FFF2C2] tabular-nums">
              -{iqamahFormatted}
            </span>
          </div>
          <div className="w-full h-1 rounded-full bg-black/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-l from-[#FFF7D6] via-[#E6C66E] to-[#A67C22] shadow-[0_0_10px_#E6C66E] transition-all duration-700"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(
                    6,
                    (elapsedSeconds / Math.max(60, adhanState.iqamahOffsetMinutes * 60)) * 100
                  )
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Incoming Call Interruption Status Banner */}
        {isCallInterrupted && (
          <div className="mb-2 px-3 py-1.5 rounded-xl bg-[#261E0E]/95 border border-[#E6C66E] flex items-center justify-center gap-2 text-xs font-bold text-[#FFF2C2] animate-pulse shadow-lg backdrop-blur-md">
            <span className="text-sm">📞</span>
            <span>مكالمة هاتفية جارية · الأذان متوقف مؤقتاً وسيُستأنف تلقائياً فور انتهائها</span>
          </div>
        )}

        {/* =====================================================================
            4. THREE COMPACT EQUAL-WIDTH BUTTONS SIDE BY SIDE (grid-cols-3)
           ===================================================================== */}
        <div className="pt-1.5 grid grid-cols-3 gap-2 max-w-md mx-auto">
          {/* Button 1: Stop Adhan & Dismiss */}
          <button
            type="button"
            onClick={() => ReminderEngine.stopAndDismissAdhanScreen()}
            className="h-10 px-2 rounded-xl bg-gradient-to-r from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] hover:brightness-110 text-[#070707] border border-[#FFF9E2] font-extrabold text-xs shadow-[0_6px_20px_rgba(230,198,110,0.4)] flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <Square size={12} fill="currentColor" className="shrink-0" />
            <span className="truncate">إيقاف الأذان</span>
          </button>

          {/* Button 2: Mute / Unmute Audio in-place (Disabled when Adhan audio finishes) */}
          {adhanState.isAudioFinished ? (
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="h-10 px-2 rounded-xl bg-[#110E09]/55 border border-[#C8A24A]/25 text-[#9E9478]/65 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed opacity-55 select-none backdrop-blur-md"
            >
              <VolumeX size={13} className="shrink-0" />
              <span className="truncate">انتهى الأذان</span>
            </button>
          ) : adhanState.isMutedKeepScreen ? (
            <button
              type="button"
              onClick={() => ReminderEngine.unmuteAdhanOnScreen()}
              className="h-10 px-2 rounded-xl bg-[#16120B]/85 hover:bg-[#221C11] border border-[#E6C66E]/70 text-[#FFF2C2] font-extrabold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all backdrop-blur-md shadow-md"
            >
              <Volume2 size={13} className="text-[#E6C66E] shrink-0" />
              <span className="truncate">تشغيل الصوت</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => ReminderEngine.muteAdhanAndKeepScreenOpen()}
              className="h-10 px-2 rounded-xl bg-[#16120B]/85 hover:bg-[#221C11] border border-[#E6C66E]/70 text-[#FFF2C2] font-extrabold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all backdrop-blur-md shadow-md"
            >
              <VolumeX size={13} className="text-[#E6C66E] shrink-0" />
              <span className="truncate">كتم الصوت</span>
            </button>
          )}

          {/* Button 3: One-way Log Prayer in Impact Tree (Strictly disabled if prayer time hasn't arrived yet!) */}
          {!isPrayerTimeArrived ? (
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="h-10 px-1.5 rounded-xl border border-[#C8A24A]/25 bg-[#14110B]/60 text-[#9E9478]/70 font-extrabold text-[10px] leading-tight flex items-center justify-center text-center cursor-not-allowed select-none backdrop-blur-md opacity-65"
              title={`لا يمكن تسجيل صلاة ${adhanState.prayerNameArabic} قبل دخول وقتها الشرعي`}
            >
              <span className="line-clamp-1">لم يحن وقت صلاة {adhanState.prayerNameArabic} بعد</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isPrayerLogged}
              aria-disabled={isPrayerLogged}
              onClick={handleLogPrayerInImpactTree}
              className={`h-10 px-1.5 rounded-xl border font-extrabold text-[11px] leading-tight flex items-center justify-center text-center transition-all backdrop-blur-md shadow-md ${
                isPrayerLogged
                  ? 'bg-[#1F190D]/80 border-[#FFF2C2]/70 text-[#FFF2C2] cursor-default select-none shadow-[0_0_14px_rgba(230,198,110,0.28)]'
                  : 'bg-[#16120B]/85 hover:bg-[#221C11] border-[#E6C66E]/70 text-[#E6C66E] active:scale-95'
              }`}
            >
              <span className="line-clamp-1">
                {isPrayerLogged ? `تم تسجيل ${adhanState.prayerNameArabic} ✓` : `تسجيل صلاة ${adhanState.prayerNameArabic}`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


