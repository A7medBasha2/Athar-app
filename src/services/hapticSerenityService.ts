export type HapticSerenityPattern = 'heartbeat' | 'gentle_pulse' | 'ascending';
export type HapticSerenityIntensity = 'feather' | 'balanced' | 'deep';

export interface HapticSerenitySettings {
  enabled: boolean;
  pattern: HapticSerenityPattern;
  intensity: HapticSerenityIntensity;
  milestoneCelebration: boolean;
  tactileAudioResonance: boolean;
}

export interface HapticPatternOption {
  id: HapticSerenityPattern;
  title: string;
  subtitle: string;
  badge: string;
}

export interface HapticIntensityOption {
  id: HapticSerenityIntensity;
  label: string;
  desc: string;
}

export const HAPTIC_SERENITY_PATTERNS: HapticPatternOption[] = [
  {
    id: 'heartbeat',
    title: 'نبضة القلب الهادئة',
    subtitle: 'نبضة مزدوجة خفيفة ومتناغمة تحاكي دقات القلب المطمئن عند كل تسبيحة',
    badge: 'الافتراضي الموصى به',
  },
  {
    id: 'gentle_pulse',
    title: 'لمسة الحرير الخفيفة',
    subtitle: 'نبضة مفردة فائقة النعومة تمنح إحساساً خفيفاً بالعد دون أي إزعاج',
    badge: 'ناعم جداً',
  },
  {
    id: 'ascending',
    title: 'إيقاع السكينة المتدرج',
    subtitle: 'نبضة هادئة تتناغم مع تقدمك في الورد وتزداد حضوراً عند الاقتراب من التمام',
    badge: 'تفاعلي',
  },
];

export const HAPTIC_SERENITY_INTENSITIES: HapticIntensityOption[] = [
  {
    id: 'feather',
    label: 'همسة خفيفة',
    desc: 'أخف درجة اهتزاز للجلسات الليلية الهادئة',
  },
  {
    id: 'balanced',
    label: 'نبض متوازن',
    desc: 'توازن مثالي بين الشعور اللمسي والهدوء',
  },
  {
    id: 'deep',
    label: 'حضور عميق',
    desc: 'نبضة واضحة تساعد على التركيز الكامل دون النظر للشاشة',
  },
];

const HAPTIC_SERENITY_STORAGE_KEY = 'athar_haptic_serenity_v1';

const DEFAULT_HAPTIC_SETTINGS: HapticSerenitySettings = {
  enabled: true,
  pattern: 'heartbeat',
  intensity: 'balanced',
  milestoneCelebration: true,
  tactileAudioResonance: true,
};

type HapticSettingsListener = (settings: HapticSerenitySettings) => void;
type HapticPulseVisualListener = (event: { isMilestone: boolean; intensity: HapticSerenityIntensity; timestamp: number }) => void;

class HapticSerenityEngine {
  private listeners: Set<HapticSettingsListener> = new Set();
  private pulseListeners: Set<HapticPulseVisualListener> = new Set();
  private audioCtx: AudioContext | null = null;

  public getSettings(): HapticSerenitySettings {
    try {
      const raw = localStorage.getItem(HAPTIC_SERENITY_STORAGE_KEY);
      if (!raw) return DEFAULT_HAPTIC_SETTINGS;
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_HAPTIC_SETTINGS,
        ...parsed,
      };
    } catch {
      return DEFAULT_HAPTIC_SETTINGS;
    }
  }

  public saveSettings(partial: Partial<HapticSerenitySettings>): HapticSerenitySettings {
    const updated: HapticSerenitySettings = {
      ...this.getSettings(),
      ...partial,
    };
    try {
      localStorage.setItem(HAPTIC_SERENITY_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
    this.listeners.forEach((cb) => cb(updated));
    return updated;
  }

  public subscribe(listener: HapticSettingsListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeVisualPulse(listener: HapticPulseVisualListener): () => void {
    this.pulseListeners.add(listener);
    return () => {
      this.pulseListeners.delete(listener);
    };
  }

  private getAudioContext(): AudioContext | null {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Builds the vibration pattern in milliseconds based on pattern & intensity
   */
  private buildVibrationArray(
    pattern: HapticSerenityPattern,
    intensity: HapticSerenityIntensity,
    isMilestone: boolean,
    progressRatio: number = 0.5
  ): number | number[] {
    const scale = intensity === 'feather' ? 0.65 : intensity === 'deep' ? 1.45 : 1.0;

    if (isMilestone) {
      // Celebratory completion heartbeat (33 or 100 or full dhikr completed)
      const p1 = Math.round(28 * scale);
      const g1 = 55;
      const p2 = Math.round(45 * scale);
      const g2 = 70;
      const p3 = Math.round(85 * scale);
      return [p1, g1, p2, g2, p3];
    }

    if (pattern === 'heartbeat') {
      // Calm double-beat Lub-Dub: [lub, pause, dub]
      const lub = Math.max(8, Math.round(14 * scale));
      const pause = 62;
      const dub = Math.max(12, Math.round(24 * scale));
      return [lub, pause, dub];
    }

    if (pattern === 'gentle_pulse') {
      // Single ultra-soft silk touch
      return Math.max(8, Math.round(15 * scale));
    }

    // 'ascending' pattern scales subtly as user gets closer to completion
    const dynamicBoost = 0.85 + Math.min(1, Math.max(0, progressRatio)) * 0.45;
    const lub = Math.max(9, Math.round(13 * scale * dynamicBoost));
    const pause = 58;
    const dub = Math.max(13, Math.round(22 * scale * dynamicBoost));
    return [lub, pause, dub];
  }

  /**
   * Plays a warm, low-frequency sub-bass tactile resonance pulse (68Hz - 92Hz)
   * so the user feels a physical heartbeat warmth even on devices where Web Vibration API is restricted
   */
  private playSubBassResonance(
    pattern: HapticSerenityPattern,
    intensity: HapticSerenityIntensity,
    isMilestone: boolean
  ): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const gainScale = intensity === 'feather' ? 0.045 : intensity === 'deep' ? 0.13 : 0.08;

      const scheduleThump = (startTime: number, freqStart: number, freqEnd: number, duration: number, peakGain: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freqStart, startTime);
        osc.frequency.exponentialRampToValueAtTime(freqEnd, startTime + duration);

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.01);
      };

      if (isMilestone) {
        // Warm harmonic completion chord + heartbeat thump
        scheduleThump(now, 88, 55, 0.09, gainScale * 1.1);
        scheduleThump(now + 0.11, 110, 68, 0.12, gainScale * 1.35);
        scheduleThump(now + 0.25, 146.8, 92, 0.22, gainScale * 1.5);
        return;
      }

      if (pattern === 'gentle_pulse') {
        scheduleThump(now, 82, 52, 0.075, gainScale);
      } else {
        // Lub-Dub double heartbeat thump
        scheduleThump(now, 78, 48, 0.065, gainScale * 0.85);
        scheduleThump(now + 0.085, 92, 54, 0.095, gainScale * 1.15);
      }
    } catch {
      // ignore if audio context is blocked
    }
  }

  /**
   * Triggers a serenity pulse for a single dhikr/tasbih step or milestone completion
   */
  public triggerStepPulse(options?: {
    isMilestone?: boolean;
    progressRatio?: number;
    forcePreview?: boolean;
    overrideSettings?: Partial<HapticSerenitySettings>;
  }): void {
    const current = {
      ...this.getSettings(),
      ...(options?.overrideSettings || {}),
    };

    if (!current.enabled && !options?.forcePreview) {
      return;
    }

    const isMilestone = Boolean(options?.isMilestone && current.milestoneCelebration);
    const progressRatio = options?.progressRatio ?? 0.5;

    // 1. Hardware Haptic Vibration (if supported by device/browser)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        const vibPattern = this.buildVibrationArray(
          current.pattern,
          current.intensity,
          isMilestone,
          progressRatio
        );
        navigator.vibrate(vibPattern);
      } catch {
        // ignore
      }
    }

    // 2. Tactile Low-Frequency Audio Resonance (Warm Heartbeat Sub-Pulse)
    if (current.tactileAudioResonance || options?.forcePreview) {
      this.playSubBassResonance(current.pattern, current.intensity, isMilestone);
    }

    // 3. Notify visual pulse subscribers for subtle golden heartbeat halo
    const payload = {
      isMilestone,
      intensity: current.intensity,
      timestamp: Date.now(),
    };
    this.pulseListeners.forEach((cb) => cb(payload));
  }
}

export const HapticSerenityService = new HapticSerenityEngine();
