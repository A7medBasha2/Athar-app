import companionJson from './companionData.json';

export type CompanionMoodId = 'anxious' | 'sad' | 'distracted' | 'grateful';

export interface CompanionVerse {
  text: string;
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  audioUrl: string;
  reflection: string;
}

export interface CompanionDua {
  title: string;
  text: string;
  source: string;
  fadl: string;
}

export interface CompanionPracticalGuidance {
  title: string;
  steps: string[];
}

export interface CompanionTasbih {
  dhikrText: string;
  target: number;
  virtue: string;
}

export interface CompanionMoodItem {
  id: CompanionMoodId;
  label: string;
  badge: string;
  emoji: string;
  shortDescription: string;
  themeColor: string;
  bgGradient: string;
  borderColor: string;
  verse: CompanionVerse;
  dua: CompanionDua;
  practicalGuidance: CompanionPracticalGuidance;
  tasbih: CompanionTasbih;
}

export interface CompanionDataStructure {
  title: string;
  subtitle: string;
  initialQuestion: string;
  questionDescription: string;
  moods: CompanionMoodItem[];
}

export const COMPANION_DATA: CompanionDataStructure = companionJson as CompanionDataStructure;

export const COMPANION_MOODS: CompanionMoodItem[] = COMPANION_DATA.moods;

export function getCompanionMoodById(id: CompanionMoodId): CompanionMoodItem {
  const found = COMPANION_MOODS.find((m) => m.id === id);
  return found || COMPANION_MOODS[0];
}

/**
 * Offline Audio Synthesis and Haptics
 * Provides 100% offline audible tactile clicks and calming completion chimes using Web Audio API
 */
let sharedAudioCtx: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    try {
      sharedAudioCtx = new AudioContextClass();
    } catch {
      return null;
    }
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * Subtle tactile click sound for Tasbih button taps
 */
export function playOfflineTasbihClickSound(): void {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(580, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.045);
  } catch {
    // Silently continue if audio context is blocked
  }
}

/**
 * Peaceful sacred bell / harmonic chime when completing the 10 Tasbih repetitions
 */
export function playOfflineCompletionChime(): void {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    const frequencies = [528, 660, 792, 1056]; // Harmonics tuned to serenity (Solfeggio 528Hz base)
    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

      const startTime = ctx.currentTime + idx * 0.08;
      gain.gain.setValueAtTime(0.12 / (idx + 1), startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 1.25);
    });
  } catch {
    // Silently continue
  }
}
