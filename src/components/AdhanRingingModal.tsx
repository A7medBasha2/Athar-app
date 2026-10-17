import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ReminderEngine, ActiveAdhanState } from '../services/reminderService';
import { StorageService } from '../services/storageService';
import { AudioService } from '../services/audioService';
import { AtharBrandLogo } from './AtharBrandLogo';
import { getActiveAdhanCue } from '../data/adhanSynchronizationData';
import { 
  Volume2, VolumeX, Square, Check, Sparkles, Clock
} from 'lucide-react';

const MOAZZEN_NAMES: Record<string, string> = {
  alafasy: 'الشيخ مشاري راشد العفاسي',
  makkah: 'أذان الحرم المكي الشريف (الشيخ علي ملا)',
  madinah: 'أذان المسجد النبوي الشريف',
  alaqsa: 'أذان المسجد الأقصى المبارك',
};

export const AdhanRingingModal: React.FC = () => {
  const [adhanState, setAdhanState] = useState<ActiveAdhanState | null>(() =>
    ReminderEngine.getActiveAdhanState()
  );
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [liveAudioSeconds, setLiveAudioSeconds] = useState<number>(0);
  const [isPrayerLogged, setIsPrayerLogged] = useState<boolean>(false);
  const [chamberMode, setChamberMode] = useState<'cues' | 'dua'>('cues');
  const [isDuaPlaying, setIsDuaPlaying] = useState<boolean>(false);

  // Subscribe to ReminderEngine state
  useEffect(() => {
    const unsub = ReminderEngine.subscribeAdhanScreen((state) => {
      setAdhanState(state);
      if (state) {
        setIsMuted(state.isMuted);
        const achievements = StorageService.getPrayerAchievements();
        setIsPrayerLogged(Boolean(achievements.todayPrayers[state.prayerId]));
        if (!state.isPlaying) {
          setChamberMode('dua');
        }
      }
    });
    return () => unsub();
  }, []);

  // Listen for direct adhan voice changes from settings
  useEffect(() => {
    const handleVoiceChange = (e: any) => {
      const newVoice = e?.detail?.voice;
      if (newVoice && adhanState) {
        setAdhanState((prev) => (prev ? { ...prev, voice: newVoice } : null));
      }
    };
    window.addEventListener('athar_adhan_voice_changed', handleVoiceChange);
    return () => window.removeEventListener('athar_adhan_voice_changed', handleVoiceChange);
  }, [adhanState]);

  // Track live audio current time with high precision for seamless phrase synchronization
  useEffect(() => {
    if (!adhanState) {
      setLiveAudioSeconds(0);
      return;
    }

    const updateLiveTime = () => {
      if (adhanState.isPlaying) {
        const liveSec = AudioService.getLiveCurrentTime();
        if (liveSec > 0) {
          setLiveAudioSeconds(liveSec);
          return;
        }
      }
      if (adhanState.startTimeMs) {
        const elapsed = Math.max(0, (Date.now() - adhanState.startTimeMs) / 1000);
        setLiveAudioSeconds(elapsed);
      }
    };

    updateLiveTime();
    const interval = setInterval(updateLiveTime, 250);
    return () => clearInterval(interval);
  }, [adhanState?.startTimeMs, adhanState?.isPlaying, adhanState?.voice]);

  // Listen to centralized Smart Silence events silently without showing muted toast banners
  useEffect(() => {
    if (!adhanState) return;

    const onSmartSilence = () => {
      setIsMuted(true);
    };

    window.addEventListener('athar_smart_silence_triggered', onSmartSilence);
    return () => {
      window.removeEventListener('athar_smart_silence_triggered', onSmartSilence);
    };
  }, [adhanState?.prayerId]);

  const rawCue = adhanState
    ? getActiveAdhanCue(adhanState.voice, adhanState.isFajr, liveAudioSeconds)
    : null;

  const currentCue = rawCue || {
    phrase: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ',
    response: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ',
    index: 0,
    total: 12,
  };

  // Auto-switch to Post-Adhan Dua when Adhan concludes (Called unconditionally before early return)
  useEffect(() => {
    if (
      adhanState &&
      (!adhanState.isPlaying ||
        (currentCue && currentCue.index === currentCue.total - 1 && liveAudioSeconds > 175))
    ) {
      setChamberMode('dua');
    }
  }, [adhanState?.isPlaying, currentCue?.index, currentCue?.total, liveAudioSeconds]);

  if (!adhanState) return null;

  const arrivalCheck = StorageService.isPrayerTimeArrived(adhanState.prayerId);
  const canLogPrayer = arrivalCheck.arrived && !isPrayerLogged;

  // Audio Playback for Dua
  const handlePlayDua = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDuaPlaying) return;
    setIsDuaPlaying(true);
    try {
      await AudioService.playDuaAfterAdhan();
    } catch {
    } finally {
      setIsDuaPlaying(false);
    }
  };

  // Toggle Live Audio Mute/Unmute without restarting from 0!
  const handleToggleMute = () => {
    const nextState = ReminderEngine.toggleAdhanAudioLive();
    setIsMuted(!nextState);
  };

  // Stop Adhan Completely
  const handleStopAdhan = () => {
    ReminderEngine.dismissFullScreenAdhan();
  };

  // Log Prayer into Impact Tree & Daily Achievements
  const handleLogPrayer = () => {
    if (!adhanState || isPrayerLogged || !arrivalCheck.arrived) return;
    const updated = StorageService.toggleTodayPrayer(adhanState.prayerId);
    setIsPrayerLogged(true);

    try {
      confetti({
        particleCount: 55,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#D4AF37', '#E6C66E', '#F5EFE0', '#10B981'],
      });
    } catch {}

    // Dispatch update event for UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('athar_prayers_updated', { detail: updated }));
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex flex-col justify-between overflow-hidden bg-[#050505] text-[#F5EFE0] select-none animate-fadeIn">
      {/* 1. Full-Bleed Sacred Mosque Photography with Smooth CSS Rendering */}
      <img
        src={adhanState.sceneImage}
        alt={adhanState.prayerName}
        referrerPolicy="no-referrer"
        loading="eager"
        decoding="async"
        onError={(e) => {
          (e.currentTarget as HTMLElement).style.display = 'none';
        }}
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none opacity-80 transition-transform duration-1000 ease-out"
        style={{
          transform: 'scale(1.02)',
        }}
      />

      {/* Subtle Soft Contrast Scrim allowing scenic sanctuary background to shine */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(5,4,3,0.7) 0%, rgba(8,6,4,0.18) 25%, rgba(5,4,3,0.25) 60%, rgba(5,4,3,0.88) 100%)',
        }}
      />

      {/* Ambient Golden Pulsing Aura Glow (Hardware Accelerated) */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full pointer-events-none opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(230, 198, 110, 0.35) 0%, rgba(200, 162, 74, 0.08) 50%, transparent 75%)',
          transform: 'translateZ(0)',
        }}
      />

      {/* 2. Top Bar: Pure Athar Royal Crest */}
      <header className="relative z-20 pt-8 sm:pt-10 px-6 flex flex-col items-center text-center">
        <div className="mb-2 flex items-center justify-center">
          <AtharBrandLogo size="md" showWordmark={false} showSubtitle={false} centered={true} />
        </div>

        <span className="text-xs font-extrabold tracking-widest text-[#E6C66E] uppercase drop-shadow-md">
          {adhanState.isFajr ? 'نداء صلاة الفجر المباركة' : 'نداء الصلاة المفروضة'}
        </span>

        <h1 className="text-3xl sm:text-4xl font-black text-white font-quran mt-1 drop-shadow-[0_4px_12px_rgba(0,0,0,0.95)]">
          {adhanState.prayerName}
        </h1>
      </header>

      {/* 3. Center Chamber: Serene Glassy Card with Synchronized Adhan Calligraphy & Seamless Post-Adhan Dua */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-5 sm:px-6 py-3 max-w-md mx-auto w-full text-center">
        <div className="w-full">
          {/* Frosted Translucent Card letting the sacred mosque background shine through */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#090806]/60 backdrop-blur-md border border-[#E6C66E]/25 shadow-[0_12px_36px_rgba(0,0,0,0.65)] transition-all duration-300">
            {/* Top Switcher: Tab between Adhan Phrases and Post-Adhan Dua */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#C8A24A]/20">
              <div className="flex items-center gap-1 bg-[#141009]/70 p-0.5 rounded-xl border border-[#C8A24A]/20 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setChamberMode('cues')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chamberMode === 'cues'
                      ? 'bg-[#E6C66E]/20 text-[#E6C66E] border border-[#E6C66E]/40 shadow-xs'
                      : 'text-[#A89E88] hover:text-[#F5EFE0]'
                  }`}
                >
                  ردد مع المؤذن
                </button>
                <button
                  type="button"
                  onClick={() => setChamberMode('dua')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    chamberMode === 'dua'
                      ? 'bg-[#E6C66E]/20 text-[#E6C66E] border border-[#E6C66E]/40 shadow-xs'
                      : 'text-[#A89E88] hover:text-[#F5EFE0]'
                  }`}
                >
                  <Sparkles size={11} className="text-[#E6C66E]" />
                  <span>دعاء ما بعد الأذان</span>
                </button>
              </div>

              <span className="text-[#E6C66E] text-[10px] font-bold truncate max-w-[120px]">
                {chamberMode === 'cues'
                  ? MOAZZEN_NAMES[adhanState.voice] || MOAZZEN_NAMES.alafasy
                  : 'حديث صحيح · البخاري'}
              </span>
            </div>

            {/* Chamber Content: Animated switch between Adhan Phrases and Post-Adhan Dua */}
            {chamberMode === 'cues' ? (
              <div className="py-2 space-y-2 animate-fadeIn">
                <p className="text-2xl sm:text-3xl font-extrabold text-[#FFFDF8] font-quran leading-relaxed tracking-wide drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
                  {currentCue.phrase}
                </p>
                <div className="pt-2 text-[11px] text-[#A89E88] flex items-center justify-center gap-1">
                  <span>النداء الحالي</span>
                  <span className="text-[#E6C66E] font-bold">({currentCue.index + 1}/{currentCue.total})</span>
                </div>
              </div>
            ) : (
              <div className="py-1 text-right space-y-2.5 animate-fadeIn">
                <p className="text-sm sm:text-base font-bold text-[#F5EFE0] font-quran leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] text-center sm:text-right">
                  «اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ»
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-[#C8A24A]/20">
                  <span className="text-[10px] text-[#A89E88]">
                    حلت له شفاعة النبي ﷺ يوم القيامة
                  </span>
                  <button
                    type="button"
                    onClick={handlePlayDua}
                    className="px-2.5 py-1 rounded-lg bg-[#241C0F]/90 border border-[#E6C66E]/40 text-[10px] font-bold text-[#E6C66E] hover:border-[#E6C66E] flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
                  >
                    <Volume2 size={12} className={isDuaPlaying ? 'animate-pulse text-[#E6C66E]' : ''} />
                    <span>{isDuaPlaying ? 'جارٍ الاستماع...' : 'استماع للدعاء'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 4. Bottom Controls: Thumb-Friendly Luxury Action Buttons */}
      <footer className="relative z-20 pb-7 sm:pb-9 px-5 sm:px-6 max-w-md mx-auto w-full space-y-2.5">
        {/* Log Prayer in Impact Tree Button */}
        <button
          onClick={handleLogPrayer}
          disabled={!canLogPrayer}
          className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg ${
            isPrayerLogged
              ? 'bg-[#152317]/90 border border-[#10B981]/50 text-[#10B981] cursor-not-allowed opacity-90'
              : !arrivalCheck.arrived
              ? 'bg-[#100D09]/85 border border-[#C8A24A]/20 text-[#8E8268] cursor-not-allowed opacity-60'
              : 'bg-gradient-to-l from-[#E6C66E] via-[#C8A24A] to-[#A6802B] text-black border border-[#FFF2C2] hover:brightness-105 active:scale-98 shadow-[0_6px_25px_rgba(200,162,74,0.4)] cursor-pointer'
          }`}
        >
          {isPrayerLogged ? (
            <>
              <Check size={18} strokeWidth={2.5} />
              <span>تم تسجيل {adhanState.prayerName} في شجرة الأثر (مكتملة ✓)</span>
            </>
          ) : !arrivalCheck.arrived ? (
            <>
              <Clock size={18} className="text-[#8E8268]" />
              <span>لم يحن وقت {adhanState.prayerName} بعد (يتاح عند الأذان الشرعي)</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              <span>سجّل {adhanState.prayerName} في شجرة الأثر (أنجزتها)</span>
            </>
          )}
        </button>

        {/* Action Row: Audio Control & Stop Adhan */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Audio Control */}
          <button
            onClick={handleToggleMute}
            className={`py-3 px-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isMuted
                ? 'bg-[#211B0E]/90 border-[#E6C66E] text-[#E6C66E] shadow-md'
                : 'bg-[#120F0A]/85 backdrop-blur-md border-[#C8A24A]/30 text-[#F5EFE0] hover:border-[#E6C66E]/70'
            }`}
          >
            {isMuted ? (
              <>
                <VolumeX size={16} className="text-[#E6C66E]" />
                <span>تشغيل الصوت</span>
              </>
            ) : (
              <>
                <Volume2 size={16} className="text-[#E6C66E]" />
                <span>كتم الصوت (متابعة)</span>
              </>
            )}
          </button>

          {/* Stop Adhan Permanently */}
          <button
            onClick={handleStopAdhan}
            className="py-3 px-3 rounded-2xl bg-[#18140D]/85 backdrop-blur-md border border-[#C8A24A]/35 text-[#F5EFE0] hover:text-[#FFF2C2] hover:bg-[#221A0F] font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer shadow-md"
          >
            <Square size={14} className="text-red-400 fill-red-400" />
            <span>إيقاف الأذان وإغلاق</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default AdhanRingingModal;
