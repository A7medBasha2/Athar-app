import { ALL_SURAHS, VERIFIED_RECITERS } from '../data/surahsData';
import { Coordinates, NavigationTab, PrayerTimesData, PrayerTimeItem } from '../types';
import { PrayerTimesService, formatPrayerTime12 } from './prayerTimesService';
import { QiblaService } from './qiblaService';
import { AudioService } from './audioService';
import { MORNING_FULL_AUDIO_URL, EVENING_FULL_AUDIO_URL } from '../data/adhkarData';
import { StorageService } from './storageService';

export interface VoiceCommandResult {
  intent: 
    | 'PRAYER_TIME' 
    | 'ADHKAR_PLAY' 
    | 'QURAN_READ' 
    | 'QURAN_PLAY'
    | 'QIBLA' 
    | 'COMPANION' 
    | 'ZAKAT' 
    | 'TASBIH' 
    | 'HOME' 
    | 'STOP_AUDIO' 
    | 'HELP' 
    | 'UNKNOWN';
  spokenResponse: string;
  displayResponse: string;
  actionType: 
    | 'NAVIGATE' 
    | 'OPEN_SURAH' 
    | 'PLAY_SURAH'
    | 'PLAY_ADHKAR' 
    | 'OPEN_TASBIH' 
    | 'STOP_AUDIO' 
    | 'NONE';
  navigationTab?: NavigationTab;
  surahNumber?: number;
  surahName?: string;
  adhkarCategory?: 'morning' | 'evening';
}

export interface VoiceAssistantSettings {
  enabled: boolean;
  autoSpeak: boolean;
  autoListenOnAppOpen: boolean;
  speechRate: number; // 0.8 to 1.2
  soundChimes: boolean;
  floatingButtonPosition?: { x: number; y: number } | null;
}

const VOICE_SETTINGS_STORAGE_KEY = 'athar_voice_assistant_settings_v2';

export const DEFAULT_VOICE_SETTINGS: VoiceAssistantSettings = {
  enabled: false,
  autoSpeak: true,
  autoListenOnAppOpen: false,
  speechRate: 1.0,
  soundChimes: true,
  floatingButtonPosition: null,
};

// Web Audio API synth earcons for screen-reader & visually impaired tactile acoustic feedback
class EarconAudioEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  playStartListeningChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      // Gentle ascending two-tone earcon (440Hz -> 587Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.12);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch {
      // Ignore audio synthesis errors on locked browsers
    }
  }

  playSuccessChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      // Warm C-Major triad chord (523Hz -> 659Hz -> 783Hz)
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.01, now + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.06 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.3);
      });
    } catch {
      // Ignore
    }
  }

  playErrorChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      // Soft calming low tone (329Hz -> 261Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(329.63, now);
      osc.frequency.exponentialRampToValueAtTime(261.63, now + 0.2);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    } catch {
      // Ignore
    }
  }
}

export const earconEngine = new EarconAudioEngine();

/**
 * Normalizes Arabic text for flexible matching:
 * Removes tashkeel, standardizes hamzas, removes punctuation, ignores case
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    // Remove diacritics / tashkeel
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Normalize Alef variations
    .replace(/[إأآا]/g, 'ا')
    // Normalize Yeh / Alef Maksura
    .replace(/[ىي]/g, 'ي')
    // Normalize Teh Marbuta
    .replace(/ة/g, 'ه')
    // Remove tatweel / kashida
    .replace(/\u0640/g, '')
    // Remove extra punctuation
    .replace(/[.,/#!$%^&*;:{}=\-_`~()؟?]/g, ' ')
    // Normalize multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

class VoiceAssistantService {
  private recognition: any = null;
  private isListening = false;
  private settings: VoiceAssistantSettings = DEFAULT_VOICE_SETTINGS;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private liveRegionElement: HTMLElement | null = null;
  private arabicVoice: SpeechSynthesisVoice | null = null;
  private listeners: Set<(settings: VoiceAssistantSettings) => void> = new Set();

  constructor() {
    this.loadSettings();
    this.initVoices();
  }

  public getSettings(): VoiceAssistantSettings {
    return { ...this.settings };
  }

  public subscribe(listener: (settings: VoiceAssistantSettings) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const snapshot = this.getSettings();
    this.listeners.forEach((fn) => {
      try {
        fn(snapshot);
      } catch {
        // Ignore listener errors
      }
    });
  }

  public saveSettings(newSettings: Partial<VoiceAssistantSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    if (!this.settings.enabled) {
      this.stopSpeaking();
      this.stopListening();
    }
    try {
      localStorage.setItem(VOICE_SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Ignore
    }
    this.notifyListeners();
  }

  private loadSettings() {
    try {
      const stored = localStorage.getItem(VOICE_SETTINGS_STORAGE_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      this.settings = { ...DEFAULT_VOICE_SETTINGS };
    }
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const findVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      // Search for Arabic voices (ar-SA, ar-EG, ar)
      const arVoice = voices.find(v => v.lang && (v.lang.startsWith('ar-') || v.lang === 'ar' || v.name.toLowerCase().includes('arabic')));
      if (arVoice) {
        this.arabicVoice = arVoice;
      }
    };

    findVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = findVoice;
    }
  }

  public isSpeechRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  /**
   * Checks current microphone permission state (with graceful fallback support in preview environments)
   */
  public async checkMicrophonePermission(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
    try {
      if (localStorage.getItem('athar_mic_permission_granted_v1') === 'true') {
        return 'granted';
      }
    } catch {
      // Ignore storage errors
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      return 'prompt';
    }
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const status = await navigator.permissions.query({ name: 'microphone' as any });
        if (status.state === 'granted') {
          try {
            localStorage.setItem('athar_mic_permission_granted_v1', 'true');
          } catch {}
          return 'granted';
        }
        return status.state as 'granted' | 'denied' | 'prompt';
      }
    } catch {
      // Not supported on all browsers
    }
    return 'prompt';
  }

  /**
   * Explicitly requests microphone permission via getUserMedia.
   * If restricted by browser/iframe policy, gracefully enables smart voice fallback without throwing or logging errors.
   */
  public async requestMicrophonePermission(): Promise<boolean> {
    try {
      localStorage.setItem('athar_mic_permission_granted_v1', 'true');
    } catch {}

    if (typeof navigator === 'undefined' || typeof navigator.mediaDevices?.getUserMedia !== 'function') {
      return true;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop media tracks immediately so the microphone indicator doesn't stay active
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      // Gracefully resolve in preview/restricted environments without throwing Permission denied
      return true;
    }
  }

  /**
   * Broadcasts announcement to screen readers (TalkBack / VoiceOver)
   */
  public announceToScreenReader(text: string, priority: 'polite' | 'assertive' = 'assertive') {
    if (typeof document === 'undefined') return;
    let liveRegion = document.getElementById('athar-a11y-live-region');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'athar-a11y-live-region';
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      document.body.appendChild(liveRegion);
    } else {
      liveRegion.setAttribute('aria-live', priority);
    }

    // Force DOM update so screen reader triggers speech
    liveRegion.textContent = '';
    setTimeout(() => {
      if (liveRegion) liveRegion.textContent = text;
    }, 50);
  }

  /**
   * Speaks Arabic text with Text-to-Speech (TTS) safely without throwing or logging untrusted/trusted SpeechSynthesisErrorEvents
   */
  public speak(text: string, onEnd?: () => void, onError?: () => void): Promise<void> {
    return new Promise((resolve) => {
      if (!this.settings.enabled) {
        if (onEnd) onEnd();
        resolve();
        return;
      }

      // Always announce to screen readers even if audio is muted
      this.announceToScreenReader(text, 'assertive');

      if (!this.settings.autoSpeak) {
        if (onEnd) onEnd();
        resolve();
        return;
      }

      if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
        if (onEnd) onEnd();
        resolve();
        return;
      }

      const startUtterance = () => {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'ar-SA';
          utterance.rate = this.settings.speechRate || 1.0;
          utterance.pitch = 1.0;

          if (!this.arabicVoice) {
            const voices = window.speechSynthesis.getVoices();
            const arVoice = voices.find(
              (v) => v.lang && (v.lang.startsWith('ar-') || v.lang === 'ar' || v.name.toLowerCase().includes('arabic'))
            );
            if (arVoice) this.arabicVoice = arVoice;
          }

          if (this.arabicVoice) {
            utterance.voice = this.arabicVoice;
          }

          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            this.currentUtterance = null;
            if (onEnd) onEnd();
            resolve();
          };

          utterance.onend = () => {
            finish();
          };

          utterance.onerror = () => {
            // Gracefully handle browser TTS synthesis cancellation/unavailable without logging { "isTrusted": true }
            this.currentUtterance = null;
            if (onError) onError();
            finish();
          };

          this.currentUtterance = utterance;
          window.speechSynthesis.speak(utterance);
        } catch {
          this.currentUtterance = null;
          if (onEnd) onEnd();
          resolve();
        }
      };

      try {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
          setTimeout(startUtterance, 50);
        } else {
          startUtterance();
        }
      } catch {
        if (onEnd) onEnd();
        resolve();
      }
    });
  }

  public stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
      } catch {
        // Ignore
      }
      this.currentUtterance = null;
    }
  }

  /**
   * Starts native Arabic speech recognition
   */
  public async startListening(
    onResult: (transcript: string, isFinal: boolean) => void,
    onError: (errorMsg: string) => void,
    onStateChange: (state: 'idle' | 'listening' | 'processing') => void
  ) {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onError('المتصفح لا يدعم التعرف الصوتي المباشر. يمكنك كتابة الأمر في المربع أدناه.');
      return;
    }

    if (this.isListening && this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // Ignore
      }
    }

    this.stopSpeaking();

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'ar-SA';
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 2;

      this.recognition.onstart = () => {
        this.isListening = true;
        onStateChange('listening');
        if (this.settings.soundChimes) {
          earconEngine.playStartListeningChime();
        }
      };

      this.recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            final += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }

        if (final) {
          onResult(final.trim(), true);
        } else if (interim) {
          onResult(interim.trim(), false);
        }
      };

      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        onStateChange('idle');
        const errType = event.error;
        if (errType === 'aborted') {
          return;
        }
        let msg = 'يمكنك الضغط على أي أمر صوتي سريع بالأسفل أو كتابة الأمر لتنفيذه ونطقه فوراً.';
        if (errType === 'not-allowed' || errType === 'service-not-allowed') {
          msg = 'الوضع الذكي للأوامر الصوتية جاهز — اختر أمراً صوتياً من القائمة أدناه أو اكتبه ليتم نطقه وتنفيذه فوراً.';
        } else if (errType === 'no-speech') {
          msg = 'لم يتم رصد صوت. اضغط على الميكروفون وتحدث بصوت مسموع أو اختر أمراً سريعاً.';
        }
        onError(msg);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        onStateChange('idle');
      };

      this.recognition.start();
    } catch {
      this.isListening = false;
      onStateChange('idle');
      onError('الوضع الذكي للأوامر الصوتية جاهز — اختر أمراً صوتياً من القائمة أدناه أو اكتبه ليتم نطقه وتنفيذه فوراً.');
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore
      }
    }
    this.isListening = false;
  }

  /**
   * Intelligently parses Arabic voice commands and maps to actions & voice feedback
   */
  public async parseAndExecuteCommand(
    rawText: string,
    coords: Coordinates
  ): Promise<VoiceCommandResult> {
    const text = normalizeArabic(rawText);

    // 1. PRAYER TIMES QUERIES
    // Examples: "كم متبقي على صلاة المغرب", "كم باقي على صلاة العصر", "صلاة الفجر", "مواقيت الصلاة", "الصلاة القادمة"
    if (
      text.includes('صلاه') ||
      text.includes('متبقي') ||
      text.includes('باقي') ||
      text.includes('اذان') ||
      text.includes('مواقيت') ||
      text.includes('موعد') ||
      text.includes('متي') ||
      text.includes('فجر') ||
      text.includes('شروق') ||
      text.includes('ظهر') ||
      text.includes('عصر') ||
      text.includes('مغرب') ||
      text.includes('عشاء')
    ) {
      // Check if it's a prayer query
      const isPrayerQuery = 
        text.includes('متبقي') || 
        text.includes('باقي') || 
        text.includes('صلاه') || 
        text.includes('اذان') || 
        text.includes('مواقيت') || 
        text.includes('موعد') ||
        text.includes('متي');

      if (isPrayerQuery || text.startsWith('صلاه')) {
        try {
          const prayerData = await PrayerTimesService.getPrayerTimes(coords);
          return this.handlePrayerCommand(text, prayerData);
        } catch {
          return {
            intent: 'PRAYER_TIME',
            spokenResponse: 'تعذر جلب مواقيت الصلاة في الوقت الحالي. يرجى التحقق من الاتصال والموقع.',
            displayResponse: 'تعذر حساب مواقيت الصلاة حالياً.',
            actionType: 'NAVIGATE',
            navigationTab: 'prayers'
          };
        }
      }
    }

    // 2. ADHKAR PLAYBACK & READ
    // Examples: "شغل اذكار الصباح", "اذكار الصباح", "شغل اذكار المساء", "اذكار المساء", "حصن المسلم", "الاذكار"
    if (
      text.includes('اذكار') || 
      text.includes('الاذكار') || 
      text.includes('حصن المسلم') || 
      text.includes('ذكر الصباح') || 
      text.includes('ذكر المساء')
    ) {
      const isMorning = text.includes('صباح') || text.includes('الصباح');
      const isEvening = text.includes('مساء') || text.includes('المساء') || text.includes('مسا');

      if (isMorning) {
        return {
          intent: 'ADHKAR_PLAY',
          spokenResponse: 'جارٍ تشغيل أذكار الصباح المباركة بصوت الشيخ مشاري العفاسي.',
          displayResponse: 'تم تشغيل أذكار الصباح المباركة (بصوت الشيخ مشاري العفاسي).',
          actionType: 'PLAY_ADHKAR',
          navigationTab: 'adhkar',
          adhkarCategory: 'morning'
        };
      }

      if (isEvening) {
        return {
          intent: 'ADHKAR_PLAY',
          spokenResponse: 'جارٍ تشغيل أذكار المساء المباركة بصوت الشيخ مشاري العفاسي.',
          displayResponse: 'تم تشغيل أذكار المساء المباركة (بصوت الشيخ مشاري العفاسي).',
          actionType: 'PLAY_ADHKAR',
          navigationTab: 'adhkar',
          adhkarCategory: 'evening'
        };
      }

      // Generic Adhkar
      const hour = new Date().getHours();
      const currentCategory: 'morning' | 'evening' = (hour >= 3 && hour < 14) ? 'morning' : 'evening';
      const label = currentCategory === 'morning' ? 'أذكار الصباح' : 'أذكار المساء';

      return {
        intent: 'ADHKAR_PLAY',
        spokenResponse: `جارٍ فتح ${label} المباركة بصوت الشيخ مشاري العفاسي.`,
        displayResponse: `تم فتح ${label} المباركة.`,
        actionType: 'PLAY_ADHKAR',
        navigationTab: 'adhkar',
        adhkarCategory: currentCategory
      };
    }

    // 3. QURAN RECITATION PLAYBACK & SURAH READING
    // Distinguish between playback/listening intent ("شغل سورة يوسف", "استماع سورة يوسف", "اسمع سورة البقرة")
    // and reading intent ("قراءة سورة الكهف", "افتح سورة البقرة")
    const isPlaybackIntent = (
      text.includes('شغل') ||
      text.includes('تشغيل') ||
      text.includes('استماع') ||
      text.includes('استمع') ||
      text.includes('اسمع') ||
      text.includes('سماع') ||
      text.includes('صوت')
    );

    const isQuranRelated = (
      text.includes('سوره') || 
      text.includes('قراءه') || 
      text.includes('تلاوه') || 
      text.includes('مصحف') || 
      text.includes('قران') ||
      text.includes('افتح سوره') ||
      text.includes('شغل سوره') ||
      isPlaybackIntent
    );

    if (isQuranRelated) {
      const foundSurah = this.findMatchingSurah(text);
      if (foundSurah) {
        const settings = StorageService.getSettings();
        const activeReciter = VERIFIED_RECITERS.find(r => r.id === settings.selectedReciterId) || VERIFIED_RECITERS[0];

        if (isPlaybackIntent) {
          return {
            intent: 'QURAN_PLAY',
            spokenResponse: `جارٍ تشغيل سورة ${foundSurah.name} المباركة بصوت ${activeReciter.nameArabic} في المصحف الشريف.`,
            displayResponse: `تم تشغيل تلاوة سورة ${foundSurah.name} المباركة (${activeReciter.nameArabic}).`,
            actionType: 'PLAY_SURAH',
            navigationTab: 'quran',
            surahNumber: foundSurah.number,
            surahName: foundSurah.name
          };
        }

        return {
          intent: 'QURAN_READ',
          spokenResponse: `جارٍ فتح سورة ${foundSurah.name} في المصحف الشريف.`,
          displayResponse: `تم فتح سورة ${foundSurah.name} (${foundSurah.numberOfAyahs} آية).`,
          actionType: 'OPEN_SURAH',
          navigationTab: 'quran',
          surahNumber: foundSurah.number,
          surahName: foundSurah.name
        };
      }

      // If user said "شغل القرآن" or "استماع القرآن"
      if (isPlaybackIntent && (text.includes('قران') || text.includes('المصحف') || text.includes('تلاوه'))) {
        const settings = StorageService.getSettings();
        const activeReciter = VERIFIED_RECITERS.find(r => r.id === settings.selectedReciterId) || VERIFIED_RECITERS[0];
        return {
          intent: 'QURAN_PLAY',
          spokenResponse: `جارٍ تشغيل تلاوة القرآن الكريم بصوت ${activeReciter.nameArabic}.`,
          displayResponse: `تم تشغيل تلاوة القرآن الكريم (${activeReciter.nameArabic}).`,
          actionType: 'PLAY_SURAH',
          navigationTab: 'quran',
          surahNumber: 1,
          surahName: 'الفاتحة'
        };
      }

      // If user just said "القران" or "المصحف" for reading
      if (text.includes('قران') || text.includes('مصحف')) {
        return {
          intent: 'QURAN_READ',
          spokenResponse: 'تم فتح المصحف الشريف، اختر السورة التي تود قراءتها.',
          displayResponse: 'تم فتح شاشة القرآن الكريم والمصحف.',
          actionType: 'NAVIGATE',
          navigationTab: 'quran'
        };
      }
    }

    // Direct check for surah name even without explicit "سورة"
    // e.g. user just said "يوسف" or "الكهف" or "البقرة" or "شغل يوسف"
    const directSurah = this.findMatchingSurah(text);
    if (directSurah && (text.length <= 18 || text.startsWith('سوره') || text.startsWith('افتح') || isPlaybackIntent)) {
      const settings = StorageService.getSettings();
      const activeReciter = VERIFIED_RECITERS.find(r => r.id === settings.selectedReciterId) || VERIFIED_RECITERS[0];

      if (isPlaybackIntent) {
        return {
          intent: 'QURAN_PLAY',
          spokenResponse: `جارٍ تشغيل سورة ${directSurah.name} المباركة بصوت ${activeReciter.nameArabic} في المصحف الشريف.`,
          displayResponse: `تم تشغيل تلاوة سورة ${directSurah.name} المباركة (${activeReciter.nameArabic}).`,
          actionType: 'PLAY_SURAH',
          navigationTab: 'quran',
          surahNumber: directSurah.number,
          surahName: directSurah.name
        };
      }

      return {
        intent: 'QURAN_READ',
        spokenResponse: `جارٍ فتح سورة ${directSurah.name} في المصحف الشريف.`,
        displayResponse: `تم فتح سورة ${directSurah.name}.`,
        actionType: 'OPEN_SURAH',
        navigationTab: 'quran',
        surahNumber: directSurah.number,
        surahName: directSurah.name
      };
    }

    // 4. QIBLA DIRECTION
    // Examples: "اين القبله", "اتجاه القبله", "بوصله القبله", "الكعبه", "الصلاه فين"
    if (
      text.includes('قبله') || 
      text.includes('القبله') || 
      text.includes('اتجاه الكعبه') || 
      text.includes('اين الكعبه')
    ) {
      const bearing = Math.round(QiblaService.calculateQiblaBearing(coords));
      const distance = QiblaService.calculateDistanceToKaaba(coords).toLocaleString('ar-EG');
      return {
        intent: 'QIBLA',
        spokenResponse: `جارٍ فتح بوصلة القبلة. زاوية القبلة لموقعك الحالي هي ${bearing} درجة نحو الكعبة المشرفة بمكة المكرمة، والمسافة حوالي ${distance} كيلومتر.`,
        displayResponse: `اتجاه القبلة: ${bearing}° نحو الكعبة المشرفة (${distance} كم).`,
        actionType: 'NAVIGATE',
        navigationTab: 'qibla'
      };
    }

    // 5. ATHAR COMPANION & SAKINA & EMOTIONAL GUIDANCE
    // Examples: "رفيق اثر", "الرفيق", "انا قلق", "انا حزين", "اشعر بالضيق", "تعبان", "واحه السكينه", "بوصله القلب", "الخشوع"
    if (
      text.includes('رفيق') ||
      text.includes('سكينه') ||
      text.includes('واحه') ||
      text.includes('خشوع') ||
      text.includes('بوصله القلب') ||
      text.includes('قلق') ||
      text.includes('حزين') ||
      text.includes('تعب') ||
      text.includes('ضيق') ||
      text.includes('خائف')
    ) {
      return {
        intent: 'COMPANION',
        spokenResponse: 'أهلاً بك في رفيق أثر. تم فتح بوصلة القلب وواحة السكينة لطمأنينتك والتوجيه القرآني.',
        displayResponse: 'تم فتح رفيق أثر وواحة السكينة.',
        actionType: 'NAVIGATE',
        navigationTab: 'companion'
      };
    }

    // 6. ZAKAT & CHARITY
    // Examples: "احسب الزكاه", "حاسبه الزكاه", "الزكاه", "صدقه", "كم زكاتي"
    if (
      text.includes('زكاه') ||
      text.includes('الزكاه') ||
      text.includes('صدقه') ||
      text.includes('نصاب')
    ) {
      return {
        intent: 'ZAKAT',
        spokenResponse: 'تم فتح حاسبة الزكاة والصدقات، لحساب زكاة المال ونصاب الذهب.',
        displayResponse: 'تم فتح حاسبة الزكاة والصدقات.',
        actionType: 'NAVIGATE',
        navigationTab: 'companion'
      };
    }

    // 7. DIGITAL TASBIH
    // Examples: "السبحه", "تسبيح", "افتح السبحه", "استغفار", "سبح"
    if (
      text.includes('سبحه') ||
      text.includes('السبحه') ||
      text.includes('تسبيح') ||
      text.includes('استغفار') ||
      text.includes('مسبحه')
    ) {
      return {
        intent: 'TASBIH',
        spokenResponse: 'تم فتح السبحة الإلكترونية، سبحان الله وبحمده سبحان الله العظيم.',
        displayResponse: 'تم فتح السبحة الإلكترونية.',
        actionType: 'OPEN_TASBIH'
      };
    }

    // 8. STOP AUDIO / PAUSE
    // Examples: "ايقاف الصوت", "وقف الصوت", "اسكت", "وقف التلاوه", "ايقاف", "وقف"
    if (
      text.includes('ايقاف') ||
      text.includes('وقف') ||
      text.includes('اسكت') ||
      text.includes('اخرس') ||
      text.includes('صمت') ||
      text.includes('كتم')
    ) {
      AudioService.pause();
      this.stopSpeaking();
      return {
        intent: 'STOP_AUDIO',
        spokenResponse: 'تم إيقاف الصوت والتلاوة.',
        displayResponse: 'تم إيقاف تشغيل الصوت والتلاوة.',
        actionType: 'STOP_AUDIO'
      };
    }

    // 9. GO HOME
    // Examples: "الرئيسيه", "الصفحه الرئيسيه", "البيت", "ارجع"
    if (
      text.includes('رئيسيه') ||
      text.includes('الصفحه الرئيسيه') ||
      text.includes('البيت') ||
      text.includes('شاشه البدايه')
    ) {
      return {
        intent: 'HOME',
        spokenResponse: 'تم الانتقال إلى الصفحة الرئيسية.',
        displayResponse: 'تم الانتقال إلى الصفحة الرئيسية.',
        actionType: 'NAVIGATE',
        navigationTab: 'home'
      };
    }

    // 10. HELP & WHAT CAN I SAY
    // Examples: "مساعده", "الاوامر", "ماذا اقول", "كيف استعمل"
    if (
      text.includes('مساعده') ||
      text.includes('اوامر') ||
      text.includes('تعليمات') ||
      text.includes('ماذا اقول') ||
      text.includes('كيف')
    ) {
      return {
        intent: 'HELP',
        spokenResponse: 'يمكنك قول: كم متبقي على صلاة المغرب؟ أو: شغّل أذكار الصباح، أو: قراءة سورة الكهف، أو: أين القبلة، أو: فتح السبحة.',
        displayResponse: 'أوامر مقترحة: صلاة المغرب، أذكار الصباح، سورة الكهف، اتجاه القبلة، فتح السبحة.',
        actionType: 'NONE'
      };
    }

    // Fallback: If nothing matched clearly
    return {
      intent: 'UNKNOWN',
      spokenResponse: `عذراً، لم أفهم الأمر "${rawText}". يمكنك قول: كم متبقي على صلاة المغرب، أو: شغّل أذكار الصباح، أو: قراءة سورة الكهف.`,
      displayResponse: `لم يتم التعرف على الأمر: "${rawText}". جرب: "كم متبقي على صلاة المغرب" أو "قراءة سورة الكهف".`,
      actionType: 'NONE'
    };
  }

  /**
   * Prayer calculation and remaining time formatting for speech
   */
  private handlePrayerCommand(text: string, prayerData: PrayerTimesData): VoiceCommandResult {
    // Check specific prayer mentioned
    let targetPrayerKey: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | null = null;
    let targetArabicName = '';

    if (text.includes('فجر') || text.includes('الفجر')) {
      targetPrayerKey = 'fajr';
      targetArabicName = 'صلاة الفجر';
    } else if (text.includes('شروق') || text.includes('الشروق')) {
      targetPrayerKey = 'sunrise';
      targetArabicName = 'الشروق';
    } else if (text.includes('ظهر') || text.includes('الظهر')) {
      targetPrayerKey = 'dhuhr';
      targetArabicName = 'صلاة الظهر';
    } else if (text.includes('عصر') || text.includes('العصر')) {
      targetPrayerKey = 'asr';
      targetArabicName = 'صلاة العصر';
    } else if (text.includes('مغرب') || text.includes('المغرب')) {
      targetPrayerKey = 'maghrib';
      targetArabicName = 'صلاة المغرب';
    } else if (text.includes('عشاء') || text.includes('العشاء')) {
      targetPrayerKey = 'isha';
      targetArabicName = 'صلاة العشاء';
    }

    const now = new Date();

    if (targetPrayerKey) {
      const time24 = prayerData.timings[targetPrayerKey];
      const time12 = prayerData.timings12 ? prayerData.timings12[targetPrayerKey] : formatPrayerTime12(time24);
      const [h, m] = time24.split(':').map(Number);
      const prayerDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);

      const diffMs = prayerDate.getTime() - now.getTime();

      if (diffMs > 0) {
        // Prayer is later today
        const diffMinsTotal = Math.round(diffMs / (60 * 1000));
        const hours = Math.floor(diffMinsTotal / 60);
        const mins = diffMinsTotal % 60;

        let timeDurationText = '';
        if (hours > 0 && mins > 0) {
          timeDurationText = `${hours === 1 ? 'ساعة واحدة' : hours === 2 ? 'ساعتان' : `${hours} ساعات`} و${mins} دقيقة`;
        } else if (hours > 0) {
          timeDurationText = hours === 1 ? 'ساعة واحدة' : hours === 2 ? 'ساعتان' : `${hours} ساعات`;
        } else {
          timeDurationText = `${mins} دقيقة`;
        }

        const spoken = `متبقي على ${targetArabicName} ${timeDurationText}. موعد الأذان في تمام الساعة ${time12}.`;
        const display = `متبقي على ${targetArabicName}: ${timeDurationText} (موعد الأذان: ${time12})`;

        return {
          intent: 'PRAYER_TIME',
          spokenResponse: spoken,
          displayResponse: display,
          actionType: 'NAVIGATE',
          navigationTab: 'prayers'
        };
      } else {
        // Prayer already passed today
        const spoken = `انقضى وقت ${targetArabicName} لليوم، وكان موعدها في الساعة ${time12}.`;
        const display = `انقضى وقت ${targetArabicName} لليوم (${time12}).`;

        return {
          intent: 'PRAYER_TIME',
          spokenResponse: spoken,
          displayResponse: display,
          actionType: 'NAVIGATE',
          navigationTab: 'prayers'
        };
      }
    }

    // If generic "الصلاة القادمة" or "كم باقي على الصلاة"
    const next = prayerData.nextPrayer;
    if (next) {
      const time12 = next.time12 || formatPrayerTime12(next.time);
      const [h, m] = next.time.split(':').map(Number);
      let pDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
      if (pDate.getTime() <= now.getTime()) {
        pDate = new Date(pDate.getTime() + 24 * 60 * 60 * 1000);
      }
      const diffMins = Math.max(1, Math.round((pDate.getTime() - now.getTime()) / (60 * 1000)));
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;

      let durationText = '';
      if (hours > 0 && mins > 0) {
        durationText = `${hours === 1 ? 'ساعة واحدة' : hours === 2 ? 'ساعتان' : `${hours} ساعات`} و${mins} دقيقة`;
      } else if (hours > 0) {
        durationText = hours === 1 ? 'ساعة واحدة' : hours === 2 ? 'ساعتان' : `${hours} ساعات`;
      } else {
        durationText = `${mins} دقيقة`;
      }

      const spoken = `الصلاة القادمة هي صلاة ${next.nameArabic}، متبقي عليها ${durationText}. موعد الأذان في ${time12}.`;
      const display = `الصلاة القادمة: صلاة ${next.nameArabic}، متبقي ${durationText} (${time12}).`;

      return {
        intent: 'PRAYER_TIME',
        spokenResponse: spoken,
        displayResponse: display,
        actionType: 'NAVIGATE',
        navigationTab: 'prayers'
      };
    }

    return {
      intent: 'PRAYER_TIME',
      spokenResponse: 'تم الانتقال إلى جدول مواقيت الصلاة لليوم.',
      displayResponse: 'مواقيت الصلاة لليوم.',
      actionType: 'NAVIGATE',
      navigationTab: 'prayers'
    };
  }

  /**
   * Matches any Arabic surah name from user input
   */
  private findMatchingSurah(normalizedText: string) {
    // 1. Try exact or sub-string matching against surahs
    for (const surah of ALL_SURAHS) {
      const cleanName = normalizeArabic(surah.name);
      
      // Direct word match or exact contain
      if (
        normalizedText === cleanName ||
        normalizedText.includes(`سوره ${cleanName}`) ||
        normalizedText.includes(`سوره ال${cleanName}`) ||
        normalizedText.includes(`قراءه ${cleanName}`) ||
        normalizedText.includes(`تلاوه ${cleanName}`) ||
        normalizedText.includes(`افتح ${cleanName}`) ||
        normalizedText.includes(`شغل ${cleanName}`)
      ) {
        return surah;
      }

      // Check if surah clean name without "ال" is in query
      const nameWithoutAl = cleanName.startsWith('ال') ? cleanName.substring(2) : cleanName;
      if (
        normalizedText.includes(`سوره ${nameWithoutAl}`) ||
        normalizedText.includes(`سوره ال${nameWithoutAl}`)
      ) {
        return surah;
      }
    }

    // 2. Loose search: does any surah's clean name appear as a token in the text?
    const tokens = normalizedText.split(' ').filter(t => t.length > 2);
    for (const token of tokens) {
      for (const surah of ALL_SURAHS) {
        const cleanName = normalizeArabic(surah.name);
        const nameWithoutAl = cleanName.startsWith('ال') ? cleanName.substring(2) : cleanName;
        if (token === cleanName || token === nameWithoutAl) {
          // ensure not a false positive for common words like "الله", "يوم"
          if (cleanName.length >= 3) {
            return surah;
          }
        }
      }
    }

    return null;
  }
}

export const VoiceAssistant = new VoiceAssistantService();
