import React, { useState, useEffect } from 'react';
import {
  HapticSerenityService,
  HapticSerenitySettings,
  HAPTIC_SERENITY_PATTERNS,
  HAPTIC_SERENITY_INTENSITIES,
} from '../services/hapticSerenityService';
import { Heart, ChevronDown, ChevronUp, Sparkles, Check, Volume2 } from 'lucide-react';

interface HapticSerenityBarProps {
  compact?: boolean;
}

export const HapticSerenityBar: React.FC<HapticSerenityBarProps> = ({ compact = false }) => {
  const [settings, setSettings] = useState<HapticSerenitySettings>(() =>
    HapticSerenityService.getSettings()
  );
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isPulsing, setIsPulsing] = useState<boolean>(false);

  useEffect(() => {
    const unsub = HapticSerenityService.subscribe((updated) => {
      setSettings(updated);
    });
    const unsubPulse = HapticSerenityService.subscribeVisualPulse(() => {
      setIsPulsing(true);
      const t = window.setTimeout(() => setIsPulsing(false), 260);
      return () => window.clearTimeout(t);
    });
    return () => {
      unsub();
      unsubPulse();
    };
  }, []);

  const currentPatternObj =
    HAPTIC_SERENITY_PATTERNS.find((p) => p.id === settings.pattern) ||
    HAPTIC_SERENITY_PATTERNS[0];
  const currentIntensityObj =
    HAPTIC_SERENITY_INTENSITIES.find((i) => i.id === settings.intensity) ||
    HAPTIC_SERENITY_INTENSITIES[1];

  const handleToggleEnabled = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextEnabled = !settings.enabled;
    const updated = HapticSerenityService.saveSettings({ enabled: nextEnabled });
    setSettings(updated);
    if (nextEnabled) {
      HapticSerenityService.triggerStepPulse({
        forcePreview: true,
        overrideSettings: updated,
      });
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 text-right ${
        settings.enabled
          ? 'bg-gradient-to-b from-[#1A160E] to-[#110F0A] border-[#C8A24A]/50 shadow-[0_6px_20px_rgba(0,0,0,0.65)]'
          : 'bg-[#12100B] border-[#C8A24A]/20 opacity-85'
      } ${compact ? 'p-2.5' : 'p-3'}`}
    >
      {/* Top Row: Quick Status & Instant Controls */}
      <div className="flex items-center justify-between gap-2">
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
        >
          <div
            className={`relative w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-200 ${
              settings.enabled
                ? 'bg-[#262012] border-[#E6C66E]/60 text-[#E6C66E]'
                : 'bg-[#18150F] border-[#C8A24A]/25 text-[#8E8268]'
            } ${isPulsing ? 'scale-110 ring-2 ring-[#E6C66E]/60' : ''}`}
          >
            <Heart
              size={15}
              className={settings.enabled ? 'text-[#E6C66E]' : 'text-[#8E8268]'}
              fill={settings.enabled ? 'rgba(230, 198, 110, 0.25)' : 'none'}
            />
            {settings.enabled && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#E6C66E] animate-ping" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-extrabold text-[#F3E5AB]">
                محرك السكينة الفورية
              </span>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                  settings.enabled
                    ? 'bg-[#C8A24A]/20 border-[#E6C66E]/40 text-[#E6C66E]'
                    : 'bg-[#1A1813] border-[#C8A24A]/20 text-[#8E8268]'
                }`}
              >
                {settings.enabled
                  ? `${currentPatternObj.title} · ${currentIntensityObj.label}`
                  : 'النبض اللمسي متوقف'}
              </span>
            </div>
            <p className="text-[10px] text-[#C4B998] truncate mt-0.5">
              نبضات قلب هادئة عند كل تسبيحة وذكر لتعميق الخشوع والتركيز
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2 py-1 rounded-xl bg-[#1A1710] hover:bg-[#252015] border border-[#C8A24A]/35 text-[#E6C66E] text-[10px] font-extrabold flex items-center gap-1 transition-colors"
            title="تخصيص النمط والشدة"
          >
            <span>{isExpanded ? 'إخفاء' : 'تخصيص'}</span>
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          <button
            type="button"
            onClick={handleToggleEnabled}
            className={`w-10 h-5.5 rounded-full transition-colors relative p-0.5 shrink-0 border ${
              settings.enabled
                ? 'bg-[#C8A24A] border-[#F3E5AB]'
                : 'bg-[#1B1812] border-[#C8A24A]/35'
            }`}
            aria-label="تبديل محرك السكينة الفورية"
            title={settings.enabled ? 'إيقاف نبض السكينة' : 'تفعيل نبض السكينة'}
          >
            <div
              className={`w-4 h-4 rounded-full bg-[#070707] transition-transform ${
                settings.enabled ? '-translate-x-4.5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Expandable Quick Customization Drawer */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-[#C8A24A]/25 space-y-2.5 text-xs animate-fadeIn">
          {/* Pattern Selection */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-extrabold text-[#E6C66E] block">
              نمط النبض اللمسي:
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {HAPTIC_SERENITY_PATTERNS.map((pat) => {
                const active = settings.pattern === pat.id;
                return (
                  <button
                    key={pat.id}
                    type="button"
                    onClick={() => {
                      const updated = HapticSerenityService.saveSettings({
                        enabled: true,
                        pattern: pat.id,
                      });
                      HapticSerenityService.triggerStepPulse({
                        forcePreview: true,
                        overrideSettings: updated,
                      });
                    }}
                    className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                      active
                        ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] border-[#F3E5AB] font-extrabold shadow'
                        : 'bg-[#14120D] text-[#C4B998] border-[#C8A24A]/25 hover:text-white'
                    }`}
                  >
                    <span className="text-[10px] leading-tight">{pat.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Intensity Selection */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-extrabold text-[#E6C66E] block">
              قوة النبضة:
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {HAPTIC_SERENITY_INTENSITIES.map((inten) => {
                const active = settings.intensity === inten.id;
                return (
                  <button
                    key={inten.id}
                    type="button"
                    onClick={() => {
                      const updated = HapticSerenityService.saveSettings({
                        enabled: true,
                        intensity: inten.id,
                      });
                      HapticSerenityService.triggerStepPulse({
                        forcePreview: true,
                        overrideSettings: updated,
                      });
                    }}
                    className={`py-1.5 px-2 rounded-xl border text-[10px] font-extrabold transition-all ${
                      active
                        ? 'bg-[#262012] text-[#F3E5AB] border-[#E6C66E]'
                        : 'bg-[#14120D] text-[#C4B998] border-[#C8A24A]/25 hover:text-white'
                    }`}
                  >
                    {inten.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Extra Toggles & Live Test */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                HapticSerenityService.saveSettings({
                  tactileAudioResonance: !settings.tactileAudioResonance,
                });
              }}
              className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-bold flex items-center gap-1.5 transition-all ${
                settings.tactileAudioResonance
                  ? 'bg-[#211C10] border-[#E6C66E]/50 text-[#F3E5AB]'
                  : 'bg-[#14120D] border-[#C8A24A]/20 text-[#8E8268]'
              }`}
            >
              <Volume2 size={12} className="text-[#E6C66E]" />
              <span>طيف صوتي دافئ مساند للنبض</span>
              {settings.tactileAudioResonance && <Check size={11} className="text-[#E6C66E]" />}
            </button>

            <button
              type="button"
              onClick={() =>
                HapticSerenityService.triggerStepPulse({
                  isMilestone: false,
                  forcePreview: true,
                })
              }
              className="px-3 py-1.5 rounded-xl bg-[#262012] hover:bg-[#322A17] border border-[#E6C66E]/55 text-[#E6C66E] text-[10px] font-extrabold flex items-center gap-1 transition-all"
            >
              <Sparkles size={11} />
              <span>تجربة النبضة الآن</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
