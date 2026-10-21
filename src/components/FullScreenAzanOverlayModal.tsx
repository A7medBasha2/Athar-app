import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, X, Check } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { AudioService } from '../services/audioService';
import { NativePermissionsBridge } from '../services/nativePermissionsBridge';

interface AzanOverlayData {
  prayerId: string;
  prayerName: string;
  prayerTime: string;
  muadhinName: string;
  audioUrl: string;
  iqamahMinutes: number;
  autoDua: boolean;
  autoEcho: boolean;
  scheduledEpochMs?: number;
}

interface EchoPhase {
  status: string;
  text: string;
  durationSec: number;
}

const STANDARD_ECHO_PHASES: EchoPhase[] = [
  { status: '✨ رَدِّدْ مَعَ المُؤَذِّنِ الآنَ لِتَنَالَ الشَّفَاعَة ✨', text: '« اللهُ أَكْبَرُ ، اللهُ أَكْبَرُ »', durationSec: 32 },
  { status: '✨ رَدِّدْ مَعَ المُؤَذِّنِ الآنَ لِتَنَالَ الشَّفَاعَة ✨', text: '« أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ »', durationSec: 32 },
  { status: '✨ رَدِّدْ مَعَ المُؤَذِّنِ الآنَ لِتَنَالَ الشَّفَاعَة ✨', text: '« أَشْهَدُ أَنَّ مُحَمَّداً رَسُولُ اللهِ »', durationSec: 32 },
  { status: '🕌 حَيَّ عَلَى الصَّلَاةِ', text: '« لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ العَلِيِّ العَظِيمِ »', durationSec: 38 },
  { status: '🕌 حَيَّ عَلَى الفَلَاحِ', text: '« لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ العَلِيِّ العَظِيمِ »', durationSec: 38 },
  { status: '✨ رَدِّدْ مَعَ المُؤَذِّنِ الآنَ لِتَنَالَ الشَّفَاعَة ✨', text: '« اللهُ أَكْبَرُ ، اللهُ أَكْبَرُ »', durationSec: 22 },
  { status: '🌟 خِتَامُ الأَذَانِ المُبَارَك', text: '« لَا إِلَهَ إِلَّا اللهُ »', durationSec: 25 },
];

const FAJR_ECHO_PHASES: EchoPhase[] = [
  { status: '✨ رَدِّدْ مَعَ المُؤَذِّنِ الآنَ لِتَنَالَ الشَّفَاعَة ✨', text: '« اللهُ أَكْبَرُ ، اللهُ أَكْبَرُ »', durationSec: 14 },
  { status: '✨ رَدِّدْ مَعَ المُؤَذِّنِ الآنَ لِتَنَالَ الشَّفَاعَة ✨', text: '« أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ »', durationSec: 13 },
  { status: '✨ رَدِّدْ مَعَ المُؤَذِّنِ الآنَ لِتَنَالَ الشَّفَاعَة ✨', text: '« أَشْهَدُ أَنَّ مُحَمَّداً رَسُولُ اللهِ »', durationSec: 13 },
  { status: '🕌 حَيَّ عَلَى الصَّلَاةِ', text: '« لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ العَلِيِّ العَظِيمِ »', durationSec: 13 },
  { status: '🕌 حَيَّ عَلَى الفَلَاحِ', text: '« لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ العَلِيِّ العَظِيمِ »', durationSec: 13 },
  { status: '🌙 الصَّلَاةُ خَيْرٌ مِنَ النَّوْمِ', text: '« صَدَقْتَ وَبَرِرْتَ وَبِالحَقِّ نَطَقْتَ »', durationSec: 12 },
  { status: '✨ رَدِّدْ مَعَ المُؤَذِّنِ الآنَ لِتَنَالَ الشَّفَاعَة ✨', text: '« اللهُ أَكْبَرُ ، اللهُ أَكْبَرُ »', durationSec: 7 },
  { status: '🌟 خِتَامُ الأَذَانِ المُبَارَك', text: '« لَا إِلَهَ إِلَّا اللهُ »', durationSec: 7 },
];

let globalLastDismissedAzanTimestamp = 0;

export const FullScreenAzanOverlayModal: React.FC = () => {
  const [data, setData] = useState<AzanOverlayData | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [echoIndex, setEchoIndex] = useState<number>(0);
  const [isPlayingDua, setIsPlayingDua] = useState<boolean>(false);
  const [isPrayerLogged, setIsPrayerLogged] = useState<boolean>(false);
  const [isPrayerTimeValid, setIsPrayerTimeValid] = useState<boolean>(true);
  const [logToast, setLogToast] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const getPrayerKey = (pId: string): 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | null => {
    const clean = pId.toLowerCase().trim();
    if (clean.includes('fajr')) return 'fajr';
    if (clean.includes('dhuhr')) return 'dhuhr';
    if (clean.includes('asr')) return 'asr';
    if (clean.includes('maghrib')) return 'maghrib';
    if (clean.includes('isha')) return 'isha';
    return null;
  };

  const mapPrayerNameToId = (pName: string): { id: string; name: string } => {
    const clean = (pName || '').toLowerCase().replace('صلاة ', '').trim();
    if (clean.includes('فجر') || clean.includes('fajr')) return { id: 'fajr', name: 'صلاة الفجر' };
    if (clean.includes('ظهر') || clean.includes('dhuhr')) return { id: 'dhuhr', name: 'صلاة الظهر' };
    if (clean.includes('عصر') || clean.includes('asr')) return { id: 'asr', name: 'صلاة العصر' };
    if (clean.includes('مغرب') || clean.includes('maghrib')) return { id: 'maghrib', name: 'صلاة المغرب' };
    if (clean.includes('عشاء') || clean.includes('isha')) return { id: 'isha', name: 'صلاة العشاء' };
    return { id: 'asr', name: pName || 'صلاة العصر' };
  };

  const handleClose = () => {
    globalLastDismissedAzanTimestamp = Date.now();
    AudioService.stop();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setData(null);
    if (typeof window !== 'undefined') {
      (window as any).__athar_pending_athan = null;
    }
    NativePermissionsBridge.dismissFullScreenAzan().catch(() => {});
  };

  useEffect(() => {
    const handleShow = (e: any) => {
      // Guard against duplicate popups immediately after dismissal
      if (Date.now() - globalLastDismissedAzanTimestamp < 12000) {
        console.log('[FullScreenAzanModal] Recently dismissed within 12s, ignoring show request');
        return;
      }

      const detail = e?.detail as AzanOverlayData;
      if (detail) {
        setData(detail);
        setIsMuted(false);
        setEchoIndex(0);
        setIsPlayingDua(false);
        setLogToast(null);

        // Check if prayer is already recorded today in Tree of Athar
        const pKey = getPrayerKey(detail.prayerId);
        if (pKey) {
          try {
            const achievements = StorageService.getPrayerAchievements();
            setIsPrayerLogged(Boolean(achievements.todayPrayers?.[pKey]));

            // Validate whether current prayer time has actually arrived
            const arrivalCheck = StorageService.isPrayerTimeArrived(pKey);
            const nowMs = Date.now();
            const prematureByEpoch = Boolean(
              detail.scheduledEpochMs && detail.scheduledEpochMs > 0 && nowMs < (detail.scheduledEpochMs - 60000)
            );
            setIsPrayerTimeValid(arrivalCheck.arrived && !prematureByEpoch);
          } catch {
            setIsPrayerLogged(false);
            setIsPrayerTimeValid(false);
          }
        } else {
          setIsPrayerLogged(false);
          setIsPrayerTimeValid(false);
        }
      }
    };

    const handleIncomingAthan = (e: any) => {
      if (Date.now() - globalLastDismissedAzanTimestamp < 12000) {
        console.log('[FullScreenAzanModal] Recently dismissed within 12s, ignoring incoming athan');
        return;
      }

      // In native Android, if the native FullScreenAzanService is active, do not display duplicate overlay inside WebView
      if (NativePermissionsBridge.isNative()) {
        NativePermissionsBridge.isFullScreenAzanRunning().then((res) => {
          if (res) {
            console.log('[FullScreenAzanModal] Native overlay already active, skipping duplicate web modal');
            return;
          }
          proceedIncomingAthan(e);
        }).catch(() => proceedIncomingAthan(e));
      } else {
        proceedIncomingAthan(e);
      }
    };

    const proceedIncomingAthan = (e: any) => {
      if (Date.now() - globalLastDismissedAzanTimestamp < 12000) {
        return;
      }
      const pName = e?.detail?.prayer || 'صلاة العصر';
      const mapping = mapPrayerNameToId(pName);
      const currentSettings = StorageService.getSettings();
      const muadhinName = mapping.id === 'fajr'
        ? currentSettings.adhanSoundFajr || 'الشيخ مشاري راشد العفاسي'
        : currentSettings.adhanSound || 'الشيخ مشاري راشد العفاسي';
      const audioUrl = mapping.id === 'fajr' ? '/audio/adhan_fajr_alafasy.mp3' : '/audio/adhan_alafasy.mp3';

      handleShow({
        detail: {
          prayerId: mapping.id,
          prayerName: mapping.name,
          prayerTime: 'الآن',
          muadhinName,
          audioUrl,
          iqamahMinutes: 15,
          autoDua: true,
          autoEcho: true,
          scheduledEpochMs: Date.now(),
        }
      });
    };

    const handleDismiss = () => {
      globalLastDismissedAzanTimestamp = Date.now();
      AudioService.stop();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      setData(null);
      if (typeof window !== 'undefined') {
        (window as any).__athar_pending_athan = null;
      }
    };

    window.addEventListener('athar_show_web_azan_overlay', handleShow);
    window.addEventListener('athar_dismiss_web_azan_overlay', handleDismiss);
    window.addEventListener('athar_incoming_athan', handleIncomingAthan);

    // Check for pending incoming athan from deep links or native intent
    if (typeof window !== 'undefined' && (window as any).__athar_pending_athan) {
      const pending = (window as any).__athar_pending_athan;
      (window as any).__athar_pending_athan = null;
      if (Date.now() - globalLastDismissedAzanTimestamp >= 12000) {
        handleIncomingAthan({ detail: pending });
      }
    }

    return () => {
      window.removeEventListener('athar_show_web_azan_overlay', handleShow);
      window.removeEventListener('athar_dismiss_web_azan_overlay', handleDismiss);
      window.removeEventListener('athar_incoming_athan', handleIncomingAthan);
    };
  }, []);

  useEffect(() => {
    if (!data) return;

    const resolvedUrl = data.audioUrl || (data.prayerId.includes('fajr') ? '/audio/adhan_fajr_alafasy.mp3' : '/audio/adhan_alafasy.mp3');
    const phases = data.prayerId.includes('fajr') ? FAJR_ECHO_PHASES : STANDARD_ECHO_PHASES;

    // Single calm timeline advancement for echo phrases
    // Advances calmly and steadily per phrase duration without sudden flashing or rapid disappearing
    let currentIdx = 0;
    let timerId: any = null;
    let closeTimer: any = null;

    const advanceEcho = () => {
      if (currentIdx < phases.length - 1) {
        currentIdx += 1;
        setEchoIndex(currentIdx);
        const nextDuration = phases[currentIdx]?.durationSec || 25;
        timerId = setTimeout(advanceEcho, nextDuration * 1000);
      }
    };

    const initialDuration = phases[0]?.durationSec || 25;
    timerId = setTimeout(advanceEcho, initialDuration * 1000);

    // Synchronize echo with actual audio progress when playing via AudioService
    const unsubAudio = AudioService.subscribe((state) => {
      if (state && state.category === 'adhan' && state.duration > 0 && !isPlayingDua) {
        if (timerId) {
          clearTimeout(timerId);
          timerId = null;
        }
        const ct = state.currentTime;
        let cumulative = 0;
        for (let i = 0; i < phases.length; i++) {
          cumulative += phases[i].durationSec;
          if (ct < cumulative || i === phases.length - 1) {
            setEchoIndex(i);
            break;
          }
        }
      }
    });

    // If running in native Android, FastAudioPlayer in FullScreenAzanService manages native audio playback
    if (!NativePermissionsBridge.isNative()) {
      AudioService.playUrl(
        resolvedUrl,
        'adhan',
        {
          title: data.prayerName,
          subtitle: data.muadhinName || 'الأذان المبارك',
        },
        {
          onEnded: () => {
            if (data.autoDua) {
              setIsPlayingDua(true);
              AudioService.playUrl(
                '/audio/dua_after_adhan.mp3',
                'dua_adhan',
                {
                  title: 'دعاء ما بعد الأذان',
                  subtitle: '« اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ »',
                },
                {
                  onEnded: () => {
                    closeTimer = setTimeout(() => handleClose(), 5000);
                  },
                  onError: () => {
                    closeTimer = setTimeout(() => handleClose(), 5000);
                  },
                }
              ).catch(() => {
                closeTimer = setTimeout(() => handleClose(), 5000);
              });
            } else {
              closeTimer = setTimeout(() => handleClose(), 5000);
            }
          },
          onError: (err) => {
            console.warn('[FullScreenAzanOverlay] AudioService error, falling back:', err);
            try {
              const fallbackAudio = new Audio(resolvedUrl);
              audioRef.current = fallbackAudio;
              fallbackAudio.volume = isMuted ? 0 : 1;
              fallbackAudio.play().catch(() => {});
              fallbackAudio.onended = () => {
                closeTimer = setTimeout(() => handleClose(), 5000);
              };
            } catch (e) {
              console.error('Fallback audio error:', e);
            }
          },
        }
      ).catch((err) => {
        console.warn('Audio auto-play unblocking attempted:', err);
      });
    }

    return () => {
      if (timerId) clearTimeout(timerId);
      if (closeTimer) clearTimeout(closeTimer);
      unsubAudio();
      AudioService.stop();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [data]);

  if (!data) return null;

  const phases = data.prayerId.includes('fajr') ? FAJR_ECHO_PHASES : STANDARD_ECHO_PHASES;
  const currentPhase = phases[echoIndex] || phases[0];

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    AudioService.setAdhanMuted(nextMuted);
    if (audioRef.current) {
      audioRef.current.volume = nextMuted ? 0 : 1;
    }
    if (NativePermissionsBridge.isNative()) {
      NativePermissionsBridge.muteNotificationAudio().catch(() => {});
    }
  };


  // Prayer Logging in Tree of Athar
  const handleLogPrayer = () => {
    if (isPrayerLogged || !isPrayerTimeValid || !data) return;

    const pKey = getPrayerKey(data.prayerId);
    if (!pKey) {
      setLogToast('صلاة غير محددة');
      setTimeout(() => setLogToast(null), 2000);
      return;
    }

    // Double check prayer arrival time
    const check = StorageService.isPrayerTimeArrived(pKey);
    const nowMs = Date.now();
    const prematureByEpoch = Boolean(
      data.scheduledEpochMs && data.scheduledEpochMs > 0 && nowMs < (data.scheduledEpochMs - 60000)
    );

    if (!check.arrived || prematureByEpoch) {
      setIsPrayerTimeValid(false);
      setLogToast('لم يحن موعدها ⏳');
      setTimeout(() => setLogToast(null), 2500);
      return;
    }

    try {
      StorageService.toggleTodayPrayer(pKey);
      setIsPrayerLogged(true);
      setLogToast('تم التسجيل بنجاح ✨');
      setTimeout(() => setLogToast(null), 2500);
    } catch (err) {
      console.error('Failed to log prayer:', err);
    }
  };

  // Resolve dynamic background photo
  const getBackgroundImage = (pId: string): string => {
    const clean = pId.toLowerCase();
    if (clean.includes('fajr')) return '/adhan-scenes/fajr.webp';
    if (clean.includes('dhuhr')) return '/adhan-scenes/dhuhr.webp';
    if (clean.includes('asr')) return '/adhan-scenes/asr.webp';
    if (clean.includes('maghrib')) return '/adhan-scenes/maghrib.webp';
    if (clean.includes('isha')) return '/adhan-scenes/isha.webp';
    return '/adhan-scenes/asr.webp';
  };

  const bgUrl = getBackgroundImage(data.prayerId);

  return (
    <div className="fixed inset-0 z-[99999] bg-[#050709] select-none overflow-hidden flex flex-col justify-between animate-fadeIn">
      {/* 1. Dynamic Sacred Mosque Photography with continuous Ken Burns motion */}
      <div 
        className="absolute inset-0 bg-cover bg-center animate-adhan-kenburns pointer-events-none"
        style={{ backgroundImage: `url(${bgUrl})` }}
      />

      {/* 2. Multi-Stop Royal Dark Scrim */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050709]/90 via-[#050709]/40 via-50% to-[#050709]/95 pointer-events-none" />

      {/* 3. Top Royal Prayer Header */}
      <div className="relative z-10 pt-10 px-4 max-w-md mx-auto w-full flex flex-col items-center text-center">
        <div className="rounded-2xl px-5 py-3 bg-[#090D11]/90 backdrop-blur-md border border-[#D4AF37]/40 shadow-2xl space-y-1 w-full max-w-sm">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#E6C66E]">
            <span className="text-sm">🕌</span>
            <span>حَانَ الآنَ مَوْعِدُ الأَذَانِ المُبَارَك</span>
          </div>

          <h2 className="text-2xl font-black text-white tracking-wide drop-shadow-[0_2px_8px_rgba(212,175,55,0.4)]">
            {data.prayerName}
          </h2>

          <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#C8A24A]">
            <span>{data.prayerTime}</span>
            {data.muadhinName && (
              <>
                <span className="text-[#D4AF37]/50">•</span>
                <span className="text-slate-300 truncate max-w-[170px]">{data.muadhinName}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4. Center-Bottom Main Area: Mihrab Echo Card + Action Buttons */}
      <div className="relative z-10 pb-8 px-4 max-w-md mx-auto w-full flex flex-col gap-3.5">
        
        {/* Royal Golden Mihrab Echo Card (محراب الترديد الذهبي) */}
        <div className="rounded-3xl p-5 bg-[#0B0F14]/92 backdrop-blur-xl border border-[#D4AF37]/50 shadow-2xl text-center space-y-3">
          {/* Status Badge */}
          <p className="text-xs font-bold text-[#E6C66E] flex items-center justify-center gap-1.5">
            {isPlayingDua ? '🤲 دُعَاءُ مَا بَعْدَ الأَذَانِ المُبَارَك' : currentPhase.status}
          </p>

          {/* Mihrab Arch Calligraphy Frame */}
          <div className="py-3 px-4 rounded-2xl bg-[#030507]/80 border border-[#D4AF37]/30 min-h-[56px] flex items-center justify-center shadow-inner">
            <p className="text-lg md:text-xl font-black text-white transition-all duration-300">
              {isPlayingDua
                ? '« اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ القَائِمَةِ، آتِ مُحَمَّداً الوَسِيلَةَ وَالفَضِيلَةَ، وَابْعَثْهُ مَقَاماً مَحْمُوداً الَّذِي وَعَدْتَهُ »'
                : currentPhase.text}
            </p>
          </div>
        </div>

        {/* 5. Royal 3-Button Action Dock (Height: 48px) */}
        <div className="grid grid-cols-3 gap-2.5 w-full">
          {/* Button 1: Log Prayer in Tree of Athar */}
          <button
            onClick={handleLogPrayer}
            disabled={isPrayerLogged || !isPrayerTimeValid}
            className={`h-12 rounded-2xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all shadow-lg ${
              isPrayerLogged
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#E6C66E] border-[#FFF2C2] text-[#080B0E] font-black shadow-[0_0_14px_rgba(212,175,55,0.4)] cursor-default'
                : !isPrayerTimeValid
                ? 'bg-[#14171A]/95 border-slate-700/80 text-slate-400 cursor-not-allowed opacity-85'
                : logToast
                ? 'bg-[#181F26] border-amber-500/80 text-amber-300 font-bold active:scale-95'
                : 'bg-[#181F26]/95 hover:bg-[#202933] border-[#D4AF37]/60 text-[#F3E5AB] active:scale-95'
            }`}
          >
            {isPrayerLogged ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>سُجِّلت في شجرة الأثر ✓</span>
              </>
            ) : !isPrayerTimeValid ? (
              <>
                <span className="text-sm">⏳</span>
                <span>لم يدخل وقت الصلاة بعد ⏳</span>
              </>
            ) : logToast ? (
              <span>{logToast}</span>
            ) : (
              <>
                <span className="text-sm">✨</span>
                <span>تسجيل في شجرة الأثر ✨</span>
              </>
            )}
          </button>

          {/* Button 2: Mute / Unmute */}
          <button
            onClick={toggleMute}
            className={`h-12 rounded-2xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-95 shadow-lg ${
              isMuted
                ? 'bg-[#14181D]/95 border-slate-600 text-slate-400'
                : 'bg-[#14181D]/95 border-[#D4AF37]/50 text-[#E6C66E]'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#E6C66E]" />}
            <span>{isMuted ? 'إلغاء الكتم' : 'كتم الصوت'}</span>
          </button>

          {/* Button 3: Dismiss Button */}
          <button
            onClick={handleClose}
            className="h-12 rounded-2xl bg-[#211A12]/95 hover:bg-[#2E2419] border border-[#D4AF37]/70 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-lg"
          >
            <X className="w-4 h-4 text-[#D4AF37]" />
            <span>إغلاق الأذان</span>
          </button>
        </div>

      </div>
    </div>
  );
};

