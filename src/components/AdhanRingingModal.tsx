import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { ReminderEngine, ActiveAdhanState } from '../services/reminderService';
import { StorageService } from '../services/storageService';
import { AudioService } from '../services/audioService';
import { AtharBrandLogo } from './AtharBrandLogo';
import { 
  Volume2, VolumeX, Square, Check, Heart, Sparkles, 
  Smartphone, ShieldCheck, ChevronDown, ChevronUp, Bell, Compass
} from 'lucide-react';

const ADHAN_PHRASES_REGULAR = [
  'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ',
  'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ',
  'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ',
  'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ',
  'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللهِ',
  'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللهِ',
  'حَيَّ عَلَى الصَّلَاةِ',
  'حَيَّ عَلَى الصَّلَاةِ',
  'حَيَّ عَلَى الْفَلَاحِ',
  'حَيَّ عَلَى الْفَلَاحِ',
  'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ',
  'لَا إِلَهَ إِلَّا اللهُ',
];

const ADHAN_PHRASES_FAJR = [
  'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ',
  'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ',
  'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ',
  'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ',
  'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللهِ',
  'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللهِ',
  'حَيَّ عَلَى الصَّلَاةِ',
  'حَيَّ عَلَى الصَّلَاةِ',
  'حَيَّ عَلَى الْفَلَاحِ',
  'حَيَّ عَلَى الْفَلَاحِ',
  'الصَّلَاةُ خَيْرٌ مِنَ النَّوْمِ',
  'الصَّلَاةُ خَيْرٌ مِنَ النَّوْمِ',
  'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ',
  'لَا إِلَهَ إِلَّا اللهُ',
];

const MOAZZEN_NAMES: Record<string, string> = {
  alafasy: 'الشيخ مشاري راشد العفاسي',
  makkah: 'أذان الحرم المكي الشريف',
  madinah: 'أذان المسجد النبوي الشريف',
  alaqsa: 'أذان المسجد الأقصى المبارك',
};

export const AdhanRingingModal: React.FC = () => {
  const [adhanState, setAdhanState] = useState<ActiveAdhanState | null>(() =>
    ReminderEngine.getActiveAdhanState()
  );
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isPrayerLogged, setIsPrayerLogged] = useState<boolean>(false);
  const [showDua, setShowDua] = useState<boolean>(false);

  // Subscribe to ReminderEngine state
  useEffect(() => {
    const unsub = ReminderEngine.subscribeAdhanScreen((state) => {
      setAdhanState(state);
      if (state) {
        setIsMuted(state.isMuted);
        const achievements = StorageService.getPrayerAchievements();
        setIsPrayerLogged(Boolean(achievements.todayPrayers[state.prayerId]));
        if (!state.isPlaying) {
          setShowDua(true);
        }
      }
    });
    return () => unsub();
  }, []);

  // Track elapsed seconds smoothly without redundant interval recreation
  useEffect(() => {
    if (!adhanState?.startTimeMs) {
      setElapsedSeconds(0);
      return;
    }

    const startMs = adhanState.startTimeMs;
    const updateElapsed = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setElapsedSeconds(elapsed);
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [adhanState?.startTimeMs]);

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

  if (!adhanState) return null;

  const phrases = adhanState.isFajr ? ADHAN_PHRASES_FAJR : ADHAN_PHRASES_REGULAR;
  // Calculate active phrase roughly by elapsed time (each phrase is ~8-12 seconds)
  const currentPhraseIndex = Math.min(
    phrases.length - 1,
    Math.floor(elapsedSeconds / 9)
  );

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
    if (!adhanState) return;
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
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none opacity-45 transition-transform duration-1000 ease-out"
        style={{
          transform: 'scale(1.03)',
        }}
      />

      {/* Multi-layered Vignette Scrim for High Contrast Typography */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(5,4,3,0.85) 0%, rgba(8,6,4,0.45) 30%, rgba(5,4,3,0.7) 65%, #050505 100%)',
        }}
      />

      {/* Ambient Golden Pulsing Aura Glow (Hardware Accelerated) */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(230, 198, 110, 0.4) 0%, rgba(200, 162, 74, 0.1) 50%, transparent 75%)',
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

      {/* 3. Center Chamber: Synchronized Adhan Calligraphy & Repeating Words */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-6 py-4 max-w-md mx-auto w-full text-center">
        <div className="w-full space-y-3">
          {/* Active Highlighted Adhan Phrase */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#0F0C08]/95 border-2 border-[#E6C66E]/60 shadow-[0_15px_40px_rgba(0,0,0,0.85)]">
            <span className="text-[11px] text-[#A89E88] font-bold block mb-1">
              ردد مع المؤذن:
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#FFFDF8] font-quran leading-relaxed tracking-wide drop-shadow-[0_2px_10px_rgba(230,198,110,0.5)]">
              {phrases[currentPhraseIndex]}
            </p>
          </div>
        </div>

        {/* Post-Adhan Dua Collapsible & Auto-Play */}
        <div className="w-full mt-4">
          <button
            onClick={() => setShowDua(!showDua)}
            className="w-full py-2.5 px-3.5 rounded-xl bg-[#141009]/80 border border-[#C8A24A]/30 text-xs font-bold text-[#E6C66E] flex items-center justify-between hover:bg-[#1A140B] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-[#E6C66E]" />
              <span>دعاء ما بعد الأذان (الوسيلة والفضيلة)</span>
            </div>
            {showDua ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          {showDua && (
            <div className="mt-2 p-3.5 rounded-2xl bg-[#0D0B08]/95 border border-[#C8A24A]/40 text-right space-y-2 animate-fadeIn shadow-lg">
              <p className="text-xs sm:text-sm font-bold text-[#F5EFE0] font-quran leading-relaxed">
                «اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ»
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-[#C8A24A]/20">
                <span className="text-[10px] text-[#A89E88]">
                  رواه البخاري · حلت له شفاعة النبي ﷺ
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    AudioService.playDuaAfterAdhan().catch(() => {});
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#241C0F] border border-[#E6C66E]/40 text-[10px] font-bold text-[#E6C66E] hover:border-[#E6C66E] flex items-center gap-1 cursor-pointer"
                >
                  <Volume2 size={12} />
                  <span>استماع للدعاء</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 4. Bottom Controls: Thumb-Friendly Luxury Action Buttons */}
      <footer className="relative z-20 pb-8 sm:pb-10 px-6 max-w-md mx-auto w-full space-y-3">
        {/* Log Prayer in Impact Tree Button */}
        <button
          onClick={handleLogPrayer}
          disabled={isPrayerLogged}
          className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg ${
            isPrayerLogged
              ? 'bg-[#152317] border border-[#10B981]/50 text-[#10B981] cursor-not-allowed opacity-90'
              : 'bg-gradient-to-l from-[#E6C66E] via-[#C8A24A] to-[#A6802B] text-black border border-[#FFF2C2] hover:brightness-105 active:scale-98 shadow-[0_6px_25px_rgba(200,162,74,0.4)] cursor-pointer'
          }`}
        >
          {isPrayerLogged ? (
            <>
              <Check size={18} strokeWidth={2.5} />
              <span>تم تسجيل {adhanState.prayerName} في شجرة الأثر</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              <span>سجّل {adhanState.prayerName} في شجرة الأثر (أنجزتها)</span>
            </>
          )}
        </button>

        {/* Action Row: Live Audio Toggle (Pause/Mute in place) & Stop Adhan Completely */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Live Audio Control (Never restarts from 0!) */}
          <button
            onClick={handleToggleMute}
            className={`py-3 px-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isMuted
                ? 'bg-[#211B0E] border-[#E6C66E] text-[#E6C66E] shadow-md'
                : 'bg-[#120F0A]/90 border-[#C8A24A]/30 text-[#F5EFE0] hover:border-[#E6C66E]/70'
            }`}
          >
            {isMuted ? (
              <>
                <VolumeX size={16} className="text-[#E6C66E]" />
                <span>تشغيل الصوت لايف</span>
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
            className="py-3 px-3 rounded-2xl bg-[#18140D]/90 border border-[#C8A24A]/35 text-[#F5EFE0] hover:text-[#FFF2C2] hover:bg-[#221A0F] font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer shadow-md"
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
