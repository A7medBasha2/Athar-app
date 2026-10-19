import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, X, Check, Sparkles } from 'lucide-react';
import { StorageService } from '../services/storageService';

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

const STANDARD_ECHO_PHASES = [
  { status: '• جاري الأذان - رَدِّدْ مَعَ المُؤَذِّن •', text: '« اللهُ أَكْبَرُ ، اللهُ أَكْبَرُ »' },
  { status: '• جاري الأذان - رَدِّدْ مَعَ المُؤَذِّن •', text: '« أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ »' },
  { status: '• جاري الأذان - رَدِّدْ مَعَ المُؤَذِّن •', text: '« أَشْهَدُ أَنَّ مُحَمَّداً رَسُولُ اللهِ »' },
  { status: '• حَيَّ عَلَى الصَّلَاةِ •', text: '« لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ العَلِيِّ العَظِيمِ »' },
  { status: '• حَيَّ عَلَى الفَلَاحِ •', text: '« لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ العَلِيِّ العَظِيمِ »' },
  { status: '• جاري الأذان - رَدِّدْ مَعَ المُؤَذِّن •', text: '« اللهُ أَكْبَرُ ، اللهُ أَكْبَرُ »' },
  { status: '• خِتَامُ الأَذَانِ المُبَارَك •', text: '« لَا إِلَهَ إِلَّا اللهُ »' },
];

const FAJR_ECHO_PHASES = [
  { status: '• جاري الأذان - رَدِّدْ مَعَ المُؤَذِّن •', text: '« اللهُ أَكْبَرُ ، اللهُ أَكْبَرُ »' },
  { status: '• جاري الأذان - رَدِّدْ مَعَ المُؤَذِّن •', text: '« أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ »' },
  { status: '• جاري الأذان - رَدِّدْ مَعَ المُؤَذِّن •', text: '« أَشْهَدُ أَنَّ مُحَمَّداً رَسُولُ اللهِ »' },
  { status: '• حَيَّ عَلَى الصَّلَاةِ •', text: '« لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ العَلِيِّ العَظِيمِ »' },
  { status: '• حَيَّ عَلَى الفَلَاحِ •', text: '« لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ العَلِيِّ العَظِيمِ »' },
  { status: '• الصَّلَاةُ خَيْرٌ مِنَ النَّوْمِ •', text: '« صَدَقْتَ وَبَرِرْتَ وَبِالحَقِّ نَطَقْتَ »' },
  { status: '• جاري الأذان - رَدِّدْ مَعَ المُؤَذِّن •', text: '« اللهُ أَكْبَرُ ، اللهُ أَكْبَرُ »' },
  { status: '• خِتَامُ الأَذَانِ المُبَارَك •', text: '« لَا إِلَهَ إِلَّا اللهُ »' },
];

export const FullScreenAzanOverlayModal: React.FC = () => {
  const [data, setData] = useState<AzanOverlayData | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [echoIndex, setEchoIndex] = useState<number>(0);
  const [isPlayingDua, setIsPlayingDua] = useState<boolean>(false);
  const [isFading, setIsFading] = useState<boolean>(false);
  const [isPrayerLogged, setIsPrayerLogged] = useState<boolean>(false);
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

  useEffect(() => {
    const handleShow = (e: any) => {
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
            if (achievements.todayPrayers && achievements.todayPrayers[pKey]) {
              setIsPrayerLogged(true);
            } else {
              setIsPrayerLogged(false);
            }
          } catch (err) {
            setIsPrayerLogged(false);
          }
        } else {
          setIsPrayerLogged(false);
        }
      }
    };

    const handleDismiss = () => {
      handleClose();
    };

    window.addEventListener('athar_show_web_azan_overlay', handleShow);
    window.addEventListener('athar_dismiss_web_azan_overlay', handleDismiss);

    return () => {
      window.removeEventListener('athar_show_web_azan_overlay', handleShow);
      window.removeEventListener('athar_dismiss_web_azan_overlay', handleDismiss);
    };
  }, []);

  useEffect(() => {
    if (!data) return;

    // Start playing audio
    const audio = new Audio();
    audioRef.current = audio;

    const resolvedUrl = data.audioUrl || (data.prayerId.includes('fajr') ? '/audio/adhan_fajr_alafasy.mp3' : '/audio/adhan_alafasy.mp3');
    audio.src = resolvedUrl;
    audio.volume = 1;
    audio.play().catch((err) => console.warn('Audio auto-play blocked:', err));

    const phases = data.prayerId.includes('fajr') ? FAJR_ECHO_PHASES : STANDARD_ECHO_PHASES;

    const interval = setInterval(() => {
      setEchoIndex((prev) => {
        if (prev < phases.length - 1) {
          setIsFading(true);
          setTimeout(() => setIsFading(false), 200);
          return prev + 1;
        }
        return prev;
      });
    }, 18000);

    audio.onended = () => {
      if (data.autoDua) {
        setIsPlayingDua(true);
        audio.src = '/audio/dua_after_adhan.mp3';
        audio.volume = isMuted ? 0 : 1;
        audio.play().catch(() => {});
        audio.onended = () => {
          setTimeout(() => handleClose(), 5000);
        };
      } else {
        setTimeout(() => handleClose(), 5000);
      }
    };

    return () => {
      clearInterval(interval);
      audio.pause();
      audio.src = '';
    };
  }, [data]);

  if (!data) return null;

  const phases = data.prayerId.includes('fajr') ? FAJR_ECHO_PHASES : STANDARD_ECHO_PHASES;
  const currentPhase = phases[echoIndex] || phases[0];

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    // player.volume = 0f / 1f logic; never pause()
    audioRef.current.volume = nextMuted ? 0 : 1;
  };

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setData(null);
  };

  // Prayer Logging in Tree of Athar with strict astronomical arrival verification
  const handleLogPrayer = () => {
    if (isPrayerLogged || !data) return;

    const pKey = getPrayerKey(data.prayerId);
    if (!pKey) {
      setLogToast('صلاة غير محددة');
      setTimeout(() => setLogToast(null), 2000);
      return;
    }

    // Verify prayer arrival time
    const check = StorageService.isPrayerTimeArrived(pKey);
    const nowMs = Date.now();
    const prematureByEpoch = Boolean(
      data.scheduledEpochMs && data.scheduledEpochMs > 0 && nowMs < (data.scheduledEpochMs - 60000)
    );

    if (!check.arrived || prematureByEpoch) {
      setLogToast('لم يحن موعدها ⏳');
      setTimeout(() => setLogToast(null), 2200);
      return;
    }

    // Prayer time arrived: Record in Tree of Athar and persist
    try {
      StorageService.toggleTodayPrayer(pKey);
      setIsPrayerLogged(true);
      // Audio playback continues uninterrupted!
    } catch (err) {
      console.error('Failed to log prayer:', err);
    }
  };

  // Resolve dynamic background photo
  const getBackgroundImage = (pId: string): string => {
    const clean = pId.toLowerCase();
    if (clean.includes('fajr')) return '/adhan-scenes/fajr.jpg';
    if (clean.includes('dhuhr')) return '/adhan-scenes/dhuhr.jpg';
    if (clean.includes('asr')) return '/adhan-scenes/asr.jpg';
    if (clean.includes('maghrib')) return '/adhan-scenes/maghrib.jpg';
    if (clean.includes('isha')) return '/adhan-scenes/isha.jpg';
    return '/adhan-scenes/asr.jpg';
  };

  const bgUrl = getBackgroundImage(data.prayerId);

  return (
    <div className="fixed inset-0 z-[99999] bg-black select-none overflow-hidden flex flex-col justify-end animate-fadeIn">
      {/* Dynamic Mosque Photography Background - Full Viewport Presence */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-700 scale-100"
        style={{ backgroundImage: `url(${bgUrl})` }}
      />

      {/* Multi-Stop Scrim: Top is completely clear to let the mosque & sky shine (>75% screen), Bottom gently shaded for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#080B0E]/95 via-[#080B0E]/50 to-transparent pointer-events-none" />

      {/* Bottom Anchored Dock: Compact Glass Card anchored directly above 3 compact buttons */}
      <div className="relative z-10 pb-6 px-4 max-w-md mx-auto w-full flex flex-col gap-2.5">
        
        {/* Compact Glassmorphism Prayer & Echo Card */}
        <div className="rounded-2xl p-3.5 bg-[#0E1216]/85 backdrop-blur-xl border border-[#D4AF37]/35 shadow-2xl text-center space-y-2">
          {/* Header Row: Prayer Name + Time + Muadhin in a single compact line */}
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#E6C66E]">
            <span className="text-sm">🕌</span>
            <span className="text-[#F7F2E7] font-extrabold text-sm">{data.prayerName}</span>
            <span className="text-[#D4AF37]/60">•</span>
            <span>{data.prayerTime}</span>
            {data.muadhinName && (
              <>
                <span className="text-[#D4AF37]/60">•</span>
                <span className="text-slate-300 truncate max-w-[140px]">{data.muadhinName}</span>
              </>
            )}
          </div>

          {/* Status Badge */}
          <p className="text-[11px] font-bold text-[#C8A24A]">
            {isPlayingDua ? '• دُعَاءُ مَا بَعْدَ الأَذَانِ •' : currentPhase.status}
          </p>

          {/* Compact Echo Quote Box */}
          <div className="py-2 px-3 rounded-xl bg-black/50 border border-[#D4AF37]/20 min-h-[44px] flex items-center justify-center transition-opacity duration-200">
            <p className={`text-sm md:text-base font-bold text-white transition-opacity duration-200 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
              {isPlayingDua
                ? '« اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ القَائِمَةِ، آتِ مُحَمَّداً الوَسِيلَةَ وَالفَضِيلَةَ، وَابْعَثْهُ مَقَاماً مَحْمُوداً الَّذِي وَعَدْتَهُ »'
                : currentPhase.text}
            </p>
          </div>
        </div>

        {/* Compact 3-Button Action Bar (Height: 42px) */}
        <div className="grid grid-cols-3 gap-2 w-full">
          {/* Button 1: Log Prayer in Tree of Athar */}
          <button
            onClick={handleLogPrayer}
            disabled={isPrayerLogged}
            className={`h-[42px] rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all shadow-lg ${
              isPrayerLogged
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#E6C66E] border-[#FFF2C2] text-[#080B0E] font-black shadow-[0_0_12px_rgba(212,175,55,0.4)] cursor-default'
                : logToast
                ? 'bg-[#181F26] border-amber-500/80 text-amber-300 font-bold active:scale-95'
                : 'bg-[#181F26]/90 hover:bg-[#1E2730] border-[#D4AF37]/50 text-[#F3E5AB] active:scale-95'
            }`}
          >
            {isPrayerLogged ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>تم التسجيل</span>
              </>
            ) : logToast ? (
              <span>{logToast}</span>
            ) : (
              <>
                <span className="text-sm">📿</span>
                <span>سجّل الصلاة</span>
              </>
            )}
          </button>

          {/* Button 2: Mute / Unmute (volume = 0f / 1f, never pause) */}
          <button
            onClick={toggleMute}
            className={`h-[42px] rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-95 shadow-lg ${
              isMuted
                ? 'bg-[#141619]/90 border-slate-600 text-slate-400'
                : 'bg-[#141619]/90 border-[#D4AF37]/50 text-[#E6C66E]'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#E6C66E]" />}
            <span>{isMuted ? 'إلغاء الكتم' : 'كتم الصوت'}</span>
          </button>

          {/* Button 3: Dismiss Button */}
          <button
            onClick={handleClose}
            className="h-[42px] rounded-xl bg-[#221D15]/95 hover:bg-[#2C251A] border border-[#D4AF37]/70 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-lg"
          >
            <X className="w-4 h-4 text-[#D4AF37]" />
            <span>إغلاق</span>
          </button>
        </div>

      </div>
    </div>
  );
};
