import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { AudioService } from '../services/audioService';
import {
  HapticSerenityService,
  HapticSerenitySettings,
  HAPTIC_SERENITY_PATTERNS,
  HAPTIC_SERENITY_INTENSITIES,
} from '../services/hapticSerenityService';
import confetti from 'canvas-confetti';
import {
  X,
  RotateCcw,
  Sparkles,
  Check,
  Volume2,
  VolumeX,
  Award,
  Sliders,
  Heart,
  ChevronUp,
} from 'lucide-react';

interface DigitalTasbihModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToAdhkar?: () => void;
}

interface TasbihPreset {
  id: string;
  arabic: string;
  target: number;
  virtue: string;
}

const TASBIH_PRESETS: TasbihPreset[] = [
  {
    id: 'subhanallah_wabihamdih',
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    target: 100,
    virtue: 'من قالها مائة مرة حُطَّت خطاياه وإن كانت مثل زبد البحر',
  },
  {
    id: 'tasbih_tahmid_takbir',
    arabic: 'سُبْحَانَ اللَّهِ · الْحَمْدُ لِلَّهِ · اللَّهُ أَكْبَرُ',
    target: 33,
    virtue: 'معقبات دبر كل صلاة مكتوبة لا يخيب قائلهن',
  },
  {
    id: 'istighfar',
    arabic: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
    target: 100,
    virtue: 'تجلو الصدأ عن القلب وتفتح أبواب الرزق والفرج والسكينة',
  },
  {
    id: 'salawat',
    arabic: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
    target: 100,
    virtue: 'من صلى عليَّ صلاة صلى الله عليه بها عشراً ورُفعت له درجات',
  },
  {
    id: 'la_ilaha_illallah',
    arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
    target: 100,
    virtue: 'أفضل ما قلت أنا والنبيون من قبلي وأعظم عتق من النار',
  },
  {
    id: 'hawqala',
    arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    target: 33,
    virtue: 'كنز من كنوز الجنة ودواء من تسعة وتسعين داءً أيسرها الهم',
  },
];

export const DigitalTasbihModal: React.FC<DigitalTasbihModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<TasbihPreset>(TASBIH_PRESETS[0]);
  const [count, setCount] = useState<number>(0);
  const [customTarget, setCustomTarget] = useState<number>(TASBIH_PRESETS[0].target);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [todayTotal, setTodayTotal] = useState<number>(0);
  const [allTimeTotal, setAllTimeTotal] = useState<number>(0);
  const [isCompletedAnimation, setIsCompletedAnimation] = useState<boolean>(false);
  const [isHeartbeatHalo, setIsHeartbeatHalo] = useState<boolean>(false);

  // Unified Customization Drawer state
  const [isCustomizing, setIsCustomizing] = useState<boolean>(false);
  const [hapticSettings, setHapticSettings] = useState<HapticSerenitySettings>(() =>
    HapticSerenityService.getSettings()
  );
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      const stats = StorageService.getAdhkarStats();
      const tasbihState = StorageService.getTasbihState();
      setTodayTotal(stats.todayDhikrCount || 0);
      setAllTimeTotal((stats.totalDhikrRecited || 0) + (tasbihState.totalAllTime || 0));
    };
    if (isOpen) {
      refresh();
      setHapticSettings(HapticSerenityService.getSettings());
    }
    const onMidnight = () => {
      setCount(0);
      refresh();
    };
    const unsubHaptic = HapticSerenityService.subscribe((updated) => {
      setHapticSettings(updated);
    });
    window.addEventListener('athar_midnight_reset', onMidnight);
    return () => {
      window.removeEventListener('athar_midnight_reset', onMidnight);
      unsubHaptic();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setFeedbackBanner(msg);
    window.setTimeout(() => setFeedbackBanner(null), 2500);
  };

  const playSoftBeadClick = (isMilestone: boolean) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isMilestone ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(isMilestone ? 740 : 480, ctx.currentTime);
      gain.gain.setValueAtTime(isMilestone ? 0.14 : 0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isMilestone ? 0.25 : 0.06));

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (isMilestone ? 0.25 : 0.06));
    } catch {
      // ignore audio context restrictions
    }
  };

  const handleTapBead = () => {
    AudioService.unlockAudio();
    const next = count + 1;
    setCount(next);

    // Save to persistent stats
    const { state } = StorageService.incrementTasbih(selectedPreset.id);
    const updatedStats = StorageService.getAdhkarStats();
    setTodayTotal(updatedStats.todayDhikrCount || 0);
    setAllTimeTotal((updatedStats.totalDhikrRecited || 0) + (state.totalAllTime || 0));

    const reachedTarget = next === customTarget || (customTarget > 0 && next % customTarget === 0);
    const ratio = customTarget > 0 ? ((next % customTarget) || customTarget) / customTarget : 0.5;

    // Trigger Haptic Serenity Engine
    HapticSerenityService.triggerStepPulse({
      isMilestone: reachedTarget,
      progressRatio: ratio,
    });

    setIsHeartbeatHalo(true);
    window.setTimeout(() => setIsHeartbeatHalo(false), 220);

    playSoftBeadClick(reachedTarget);

    if (reachedTarget) {
      setIsCompletedAnimation(true);
      setTimeout(() => setIsCompletedAnimation(false), 1200);
      try {
        confetti({
          particleCount: 55,
          spread: 60,
          origin: { y: 0.65 },
        });
      } catch {
        // ignore
      }
    }
  };

  const handleSelectPreset = (preset: TasbihPreset) => {
    setSelectedPreset(preset);
    setCount(0);
    setCustomTarget(preset.target);
  };

  const handleReset = () => {
    setCount(0);
  };

  const progressPercentage =
    customTarget > 0
      ? Math.min(
          100,
          ((count % customTarget || (count > 0 ? customTarget : 0)) / customTarget) * 100
        )
      : 0;
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-fadeIn">
      <div className="w-full max-w-lg bg-gradient-to-b from-[#17140D] via-[#0E0D0A] to-[#080705] border-t sm:border border-[#C8A24A]/55 rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex flex-col max-h-[94vh] overflow-y-auto text-right">
        
        {/* Header with Title and Unified Controls */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1F1A10] border border-[#C8A24A]/50 text-[#E6C66E] flex items-center justify-center shadow-[0_0_15px_rgba(200,162,74,0.2)]">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#F3E5AB]">المسبحة الإلكترونية</h2>
              <p className="text-[11px] text-[#C4B998]">اذكر الله بقلبك ولسانك مع حفظ رصيدك اليومي</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Customization Toggle Button */}
            <button
              onClick={() => setIsCustomizing(!isCustomizing)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                isCustomizing
                  ? 'bg-gradient-to-r from-[#E6C66E] to-[#B88A2D] text-[#070707] border-[#F3E5AB] font-black shadow'
                  : 'bg-[#18150E] text-[#E6C66E] border-[#C8A24A]/40 hover:bg-[#241F14]'
              }`}
              title="تخصيص المسبحة والسكينة"
            >
              <Sliders size={14} />
              <span>{isCustomizing ? 'إغلاق التخصيص' : 'تخصيص'}</span>
              {hapticSettings.enabled && !isCustomizing && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#E6C66E] animate-pulse" />
              )}
            </button>

            {/* Click Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-[#18150E] hover:bg-[#241F14] text-[#E6C66E] border border-[#C8A24A]/35 transition-colors"
              title={soundEnabled ? 'كتم صوت السبحة' : 'تفعيل صوت السبحة'}
              aria-label="تبديل صوت نقرة السبحة"
            >
              {soundEnabled ? (
                <Volume2 size={16} />
              ) : (
                <VolumeX size={16} className="text-[#8E8268]" />
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#18150E] hover:bg-[#241F14] text-[#C4B998] hover:text-white border border-[#C8A24A]/35 transition-colors"
              title="إغلاق"
              aria-label="إغلاق السبحة"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Temporary Feedback Banner */}
        {feedbackBanner && (
          <div className="mt-2.5 py-1.5 px-3 rounded-xl bg-[#262012] border border-[#E6C66E]/50 text-center text-xs font-bold text-[#F3E5AB] animate-fadeIn">
            {feedbackBanner}
          </div>
        )}

        {/* =========================================================================
            UNIFIED CUSTOMIZATION DRAWER (تخصيص المسبحة ومحرك السكينة الفورية)
           ========================================================================= */}
        {isCustomizing && (
          <div className="mt-3 p-3.5 bg-gradient-to-b from-[#18140D] to-[#100E0A] border-2 border-[#C8A24A]/55 rounded-2xl space-y-3.5 animate-fadeIn shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#C8A24A]/25">
              <span className="text-xs font-black text-[#F3E5AB] flex items-center gap-1.5">
                <Sliders size={14} className="text-[#E6C66E]" />
                <span>تخصيص المسبحة ونبض السكينة</span>
              </span>
              <button
                type="button"
                onClick={() => setIsCustomizing(false)}
                className="text-[11px] text-[#C4B998] hover:text-white flex items-center gap-1"
              >
                <span>إخفاء التخصيص</span>
                <ChevronUp size={13} />
              </button>
            </div>

            {/* 1. Target Count Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E6C66E]">هدف الدورة والتسبيح:</span>
                <span className="text-[11px] text-[#C4B998]">الهدف الحالي: {customTarget}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[33, 100, 1000].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setCustomTarget(t);
                      showNotification(`تم تحديد الهدف: ${t} تسبيحة ✓`);
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                      customTarget === t
                        ? 'bg-[#E6C66E] text-[#080705] border-[#F3E5AB] font-black shadow'
                        : 'bg-[#12100B] text-[#C4B998] border-[#C8A24A]/25 hover:text-white'
                    }`}
                  >
                    {t} مرة
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const customVal = prompt('أدخل عدد التسبيحات المستهدف:', String(customTarget));
                    if (customVal && !isNaN(Number(customVal)) && Number(customVal) > 0) {
                      setCustomTarget(Number(customVal));
                      showNotification(`تم تحديد الهدف المخصص: ${customVal} ✓`);
                    }
                  }}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                    ![33, 100, 1000].includes(customTarget)
                      ? 'bg-[#E6C66E] text-[#080705] border-[#F3E5AB] font-black'
                      : 'bg-[#12100B] text-[#C4B998] border-[#C8A24A]/25 hover:text-white'
                  }`}
                >
                  مخصص
                </button>
              </div>
            </div>

            {/* 2. Haptic Serenity Engine: Instant Toggle & Status */}
            <div className="p-3 rounded-xl bg-[#0C0B08] border border-[#C8A24A]/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#221C11] border border-[#C8A24A]/40 text-[#E6C66E]">
                    <Heart size={16} fill={hapticSettings.enabled ? 'currentColor' : 'none'} />
                  </div>
                  <div>
                    <span className="text-xs font-black text-white block">
                      محرك السكينة الفورية
                    </span>
                    <span className="text-[10px] text-[#C4B998]">
                      نبضات لمسية هادئة كنبض القلب لتعميق الخشوع والتركيز
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = !hapticSettings.enabled;
                    const updated = HapticSerenityService.saveSettings({ enabled: next });
                    setHapticSettings(updated);
                    if (next) {
                      HapticSerenityService.triggerStepPulse({
                        forcePreview: true,
                        overrideSettings: updated,
                      });
                      showNotification('تم تفعيل نبض السكينة الفورية ✓');
                    } else {
                      showNotification('تم إيقاف نبض السكينة');
                    }
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border ${
                    hapticSettings.enabled
                      ? 'bg-[#C8A24A] border-[#F3E5AB]'
                      : 'bg-[#1B1812] border-[#C8A24A]/35'
                  }`}
                  aria-label="تبديل نبض السكينة الفورية"
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                      hapticSettings.enabled ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {hapticSettings.enabled && (
                <div className="pt-2 border-t border-[#C8A24A]/20 space-y-2.5 animate-fadeIn">
                  {/* Pattern Selection (Arabic Only) */}
                  <div>
                    <span className="text-[11px] font-bold text-[#E6C66E] block mb-1.5">
                      نمط النبضة اللمسية:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                      {HAPTIC_SERENITY_PATTERNS.map((pat) => {
                        const active = hapticSettings.pattern === pat.id;
                        return (
                          <button
                            key={pat.id}
                            type="button"
                            onClick={() => {
                              const updated = HapticSerenityService.saveSettings({
                                enabled: true,
                                pattern: pat.id,
                              });
                              setHapticSettings(updated);
                              HapticSerenityService.triggerStepPulse({
                                forcePreview: true,
                                overrideSettings: updated,
                              });
                              showNotification(`تم اعتماد: ${pat.title} ✓`);
                            }}
                            className={`p-2 rounded-xl border text-right transition-all flex flex-col justify-between ${
                              active
                                ? 'bg-gradient-to-r from-[#2B2313] to-[#1A150B] border-[#E6C66E] text-white shadow'
                                : 'bg-[#14120D] border-[#C8A24A]/20 text-[#C4B998]'
                            }`}
                          >
                            <span className="text-xs font-extrabold text-[#F3E5AB]">
                              {pat.title}
                            </span>
                            <span className="text-[10px] text-[#C4B998] mt-0.5 leading-snug">
                              {pat.badge}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Intensity Selection */}
                  <div>
                    <span className="text-[11px] font-bold text-[#E6C66E] block mb-1.5">
                      قوة وشدة النبض:
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {HAPTIC_SERENITY_INTENSITIES.map((inten) => {
                        const active = hapticSettings.intensity === inten.id;
                        return (
                          <button
                            key={inten.id}
                            type="button"
                            onClick={() => {
                              const updated = HapticSerenityService.saveSettings({
                                enabled: true,
                                intensity: inten.id,
                              });
                              setHapticSettings(updated);
                              HapticSerenityService.triggerStepPulse({
                                forcePreview: true,
                                overrideSettings: updated,
                              });
                            }}
                            className={`p-2 rounded-xl border text-center transition-all ${
                              active
                                ? 'bg-[#221C11] border-[#E6C66E] text-[#F3E5AB] font-black'
                                : 'bg-[#14120D] border-[#C8A24A]/20 text-[#C4B998]'
                            }`}
                          >
                            <span className="text-xs block font-bold">{inten.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Milestone Pulse & Preview Actions */}
                  <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = HapticSerenityService.saveSettings({
                          milestoneCelebration: !hapticSettings.milestoneCelebration,
                        });
                        setHapticSettings(updated);
                      }}
                      className="text-[11px] text-[#C4B998] hover:text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          hapticSettings.milestoneCelebration
                            ? 'bg-[#C8A24A] border-[#F3E5AB] text-black'
                            : 'border-[#C8A24A]/40'
                        }`}
                      >
                        {hapticSettings.milestoneCelebration && <Check size={12} />}
                      </div>
                      <span>اهتزاز ختامي عند إتمام الدورة</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        HapticSerenityService.triggerStepPulse({
                          forcePreview: true,
                        })
                      }
                      className="py-1 px-3 rounded-lg bg-[#221C11] hover:bg-[#2F2617] border border-[#C8A24A]/40 text-[#E6C66E] text-[11px] font-bold flex items-center gap-1 transition-all"
                    >
                      <Heart size={12} />
                      <span>تجربة النبضة الآن</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            DHIKR SELECTION (اختر الذكر المراد تسبيحه: متناسقة الحواف بدون اقتطاع)
           ========================================================================= */}
        <div className="mt-3.5 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-[#E6C66E] flex items-center gap-1">
              <span>اختر الذكر المراد تسبيحه:</span>
            </span>
            <span className="text-[10px] text-[#C4B998]">٦ أذكار مأثورة ومباركة</span>
          </div>

          {/* Symmetrical Grid: Full visibility, no horizontal clipping */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TASBIH_PRESETS.map((preset) => {
              const isSelected = selectedPreset.id === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-2.5 rounded-2xl text-xs font-bold transition-all border text-center flex flex-col items-center justify-between min-h-[64px] active:scale-95 ${
                    isSelected
                      ? 'bg-gradient-to-b from-[#E6C66E] via-[#D4AF37] to-[#B88A2D] text-[#080705] border-[#F3E5AB] shadow-[0_4px_18px_rgba(200,162,74,0.38)] font-black scale-[1.02]'
                      : 'bg-[#14120D] text-[#C4B998] border-[#C8A24A]/25 hover:border-[#C8A24A]/55 hover:text-white'
                  }`}
                >
                  <span className="leading-relaxed line-clamp-2">{preset.arabic}</span>
                  <span
                    className={`text-[10px] mt-1.5 px-2 py-0.5 rounded-full font-mono font-bold ${
                      isSelected
                        ? 'bg-black/25 text-[#14110A]'
                        : 'bg-[#201B11] text-[#E6C66E] border border-[#C8A24A]/30'
                    }`}
                  >
                    {preset.target} مرة
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Dhikr Card & Full Virtue (No Truncation) */}
        <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-b from-[#14120D] to-[#0D0B08] border border-[#C8A24A]/40 text-center space-y-1.5 shadow-inner">
          <h3 className="text-lg sm:text-xl font-bold font-quran text-[#F3E5AB] leading-relaxed">
            {selectedPreset.arabic}
          </h3>
          <p className="text-[11px] text-[#C4B998] leading-relaxed whitespace-normal break-words">
            {selectedPreset.virtue}
          </p>
        </div>

        {/* Interactive Giant Circular Tasbih Ring */}
        <div className="my-4 flex flex-col items-center justify-center relative">
          <button
            onClick={handleTapBead}
            className={`relative w-56 h-56 rounded-full flex flex-col items-center justify-center transition-transform duration-150 active:scale-95 focus:outline-none group cursor-pointer ${
              isCompletedAnimation
                ? 'ring-4 ring-[#E6C66E]/60 scale-105'
                : isHeartbeatHalo
                ? 'ring-2 ring-[#E6C66E]/50 scale-[1.02]'
                : ''
            }`}
            aria-label="اضغط للتسبيح"
          >
            {/* Outer Ambient Glow */}
            <div
              className={`absolute inset-3 rounded-full blur-xl transition-all duration-200 pointer-events-none ${
                isHeartbeatHalo
                  ? 'bg-[#E6C66E]/30 scale-105'
                  : 'bg-[#C8A24A]/10 group-hover:bg-[#C8A24A]/20'
              }`}
            />

            {/* SVG Ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r={radius}
                stroke="#221D14"
                strokeWidth="10"
                fill="#0D0B08"
              />
              <circle
                cx="100"
                cy="100"
                r={radius}
                stroke="url(#tasbihGoldGrad)"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-200 ease-out"
              />
              <defs>
                <linearGradient id="tasbihGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F5E3A1" />
                  <stop offset="50%" stopColor="#E6C66E" />
                  <stop offset="100%" stopColor="#A67C1E" />
                </linearGradient>
              </defs>
            </svg>

            {/* Center Counter Display */}
            <div className="relative z-10 flex flex-col items-center">
              <span className="text-[11px] text-[#E6C66E] font-bold mb-1">اضغط هنا للتسبيح</span>
              <span className="text-5xl font-black font-mono text-white tabular-nums tracking-tight drop-shadow-[0_2px_10px_rgba(200,162,74,0.3)]">
                {count}
              </span>
              <span className="text-xs text-[#C4B998] font-mono mt-1">الهدف: {customTarget}</span>
              {count > 0 && count % customTarget === 0 && (
                <span className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#C8A24A]/25 border border-[#E6C66E]/50 text-[#F3E5AB] text-[10px] font-bold animate-bounce">
                  <Check size={11} />
                  <span>أتممت دورة مباركة!</span>
                </span>
              )}
            </div>
          </button>

          {/* Reset Counter Button */}
          <button
            onClick={handleReset}
            className="mt-2 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#16130D] hover:bg-[#221D14] text-[#C4B998] hover:text-white border border-[#C8A24A]/30 text-xs font-bold transition-colors cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>تصفير العداد الحالي</span>
          </button>
        </div>

        {/* Bottom Stats Bar (Today & All-Time) */}
        <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-[#C8A24A]/25 text-xs">
          <div className="bg-[#14120D] border border-[#C8A24A]/30 rounded-2xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#C4B998] block font-bold">تسبيحاتك اليوم</span>
              <span className="text-base font-extrabold text-[#E6C66E] font-mono tabular-nums">
                {todayTotal}
              </span>
            </div>
            <Award size={18} className="text-[#E6C66E]/70" />
          </div>

          <div className="bg-[#14120D] border border-[#C8A24A]/30 rounded-2xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#C4B998] block font-bold">إجمالي رصيدك</span>
              <span className="text-base font-extrabold text-[#F3E5AB] font-mono tabular-nums">
                {allTimeTotal}
              </span>
            </div>
            <Sparkles size={18} className="text-[#E6C66E]/70" />
          </div>
        </div>

      </div>
    </div>
  );
};
