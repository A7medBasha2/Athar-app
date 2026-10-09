import { VERIFIED_RECITERS, getAyahAudioUrl, getFullSurahAudioUrl } from '../data/surahsData';
import { StorageService } from './storageService';

export type AudioCategory = 'quran' | 'adhkar' | 'adhan' | 'reminder_verse' | 'reminder_salawat';

export interface ActiveAudioState {
  category: AudioCategory;
  title: string;
  subtitle: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  surahNumber?: number;
  ayahNumber?: number;
  reciterName?: string;
  // Adhkar specific
  dhikrId?: number;
  currentRepetition?: number;
  targetRepetition?: number;
  dhikrIndex?: number;
  totalAdhkar?: number;
}

type AudioListener = (state: ActiveAudioState | null) => void;

interface InterruptedPlayback {
  url: string;
  category: AudioCategory;
  metadata: any;
  callbacks?: any;
  clipOptions?: any;
  currentTime: number;
}

class CentralAudioService {
  private audioElement: HTMLAudioElement;
  private currentCategory: AudioCategory | null = null;
  private currentPlayingUrl: string | null = null;
  private currentState: ActiveAudioState | null = null;
  private listeners: Set<AudioListener> = new Set();
  private isUsingSpeechSynthesis = false;
  private currentStartTime: number = 0;
  private currentEndTime: number | null = null;
  private interruptedTrack: InterruptedPlayback | null = null;
  
  // Handlers for continuous playback
  private onTrackEndedCallback: (() => void) | null = null;
  private onTrackErrorCallback: ((e: any) => void) | null = null;
  private onRepetitionUpdatedCallback: ((count: number) => void) | null = null;
  private onPreviousTrackCallback: (() => void) | null = null;
  private onNextTrackCallback: (() => void) | null = null;

  constructor() {
    this.audioElement = new Audio();
    this.audioElement.preload = 'auto';
    this.setupAudioListeners();
    this.setupMediaSession();
  }

  private setupAudioListeners() {
    this.audioElement.addEventListener('play', () => {
      if (this.currentState) {
        this.currentState.isPlaying = true;
        this.notifyListeners();
        this.updateMediaSessionPlaybackState('playing');
      }
    });

    this.audioElement.addEventListener('pause', () => {
      if (this.currentState) {
        this.currentState.isPlaying = false;
        this.notifyListeners();
        this.updateMediaSessionPlaybackState('paused');
      }
    });

    this.audioElement.addEventListener('timeupdate', () => {
      // Precise trimming support: If endTime is set and reached, stop immediately
      if (this.currentEndTime !== null && this.audioElement.currentTime >= this.currentEndTime) {
        this.audioElement.pause();
        const endCb = this.onTrackEndedCallback;
        const isTemporary = this.currentCategory === 'reminder_verse' || this.currentCategory === 'reminder_salawat' || this.currentCategory === 'adhan';
        this.currentEndTime = null;
        if (this.currentState) {
          this.currentState.isPlaying = false;
          this.currentState.currentTime = this.audioElement.currentTime;
          this.notifyListeners();
        }
        if (endCb) {
          endCb();
        }
        // If a Quran or Adhkar recitation was interrupted by a notification/reminder, resume it!
        if (isTemporary && this.interruptedTrack) {
          const toResume = this.interruptedTrack;
          this.interruptedTrack = null;
          setTimeout(() => {
            this.playUrl(toResume.url, toResume.category, toResume.metadata, toResume.callbacks, {
              ...toResume.clipOptions,
              startTime: toResume.currentTime
            });
          }, 350);
        }
        return;
      }

      if (this.currentState) {
        this.currentState.currentTime = this.audioElement.currentTime;
        const clipDuration = this.currentEndTime ? (this.currentEndTime - this.currentStartTime) : 0;
        this.currentState.duration = clipDuration > 0 ? clipDuration : (this.currentState.duration || this.audioElement.duration || 0);
        this.notifyListeners();
      }
    });

    this.audioElement.addEventListener('ended', () => {
      const isTemporary = this.currentCategory === 'reminder_verse' || this.currentCategory === 'reminder_salawat' || this.currentCategory === 'adhan';
      if (this.currentState) {
        this.currentState.isPlaying = false;
        this.notifyListeners();
      }
      if (this.onTrackEndedCallback) {
        this.onTrackEndedCallback();
      }
      // If a Quran or Adhkar recitation was interrupted by a notification/reminder, resume it!
      if (isTemporary && this.interruptedTrack) {
        const toResume = this.interruptedTrack;
        this.interruptedTrack = null;
        setTimeout(() => {
          this.playUrl(toResume.url, toResume.category, toResume.metadata, toResume.callbacks, {
            ...toResume.clipOptions,
            startTime: toResume.currentTime
          });
        }, 350);
      }
    });

    this.audioElement.addEventListener('error', (e) => {
      console.warn('Audio playback error:', e);
      if (this.currentState) {
        this.currentState.isPlaying = false;
        this.notifyListeners();
      }
      if (this.onTrackErrorCallback) {
        this.onTrackErrorCallback(e);
      }
    });
  }

  private setupMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => this.resume());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('stop', () => this.stop());
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (this.onPreviousTrackCallback) this.onPreviousTrackCallback();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (this.onNextTrackCallback) this.onNextTrackCallback();
      });
      try {
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined && details.seekTime !== null) {
            this.seekTo(details.seekTime);
          }
        });
      } catch {
        // seekto not supported on some platforms
      }
    }
  }

  private updateMediaSessionMetadata(title: string, artist: string, album: string) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album,
        artwork: [
          { src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      });
    }
  }

  private updateMediaSessionPlaybackState(state: 'playing' | 'paused' | 'none') {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = state;
    }
  }

  public subscribe(listener: AudioListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(l => l(this.currentState ? { ...this.currentState } : null));
  }

  /**
   * Safe centralized playback: stops any current audio stream first
   * to guarantee no overlapping religious recitations
   */
  public async playUrl(
    url: string,
    category: AudioCategory,
    metadata: {
      title: string;
      subtitle: string;
      surahNumber?: number;
      ayahNumber?: number;
      reciterName?: string;
      dhikrId?: number;
      currentRepetition?: number;
      targetRepetition?: number;
      dhikrIndex?: number;
      totalAdhkar?: number;
      durationSeconds?: number;
    },
    callbacks?: {
      onEnded?: () => void;
      onError?: (err: any) => void;
      onPrevious?: () => void;
      onNext?: () => void;
      onRepetitionUpdated?: (count: number) => void;
    },
    clipOptions?: {
      startTime?: number;
      endTime?: number;
    }
  ): Promise<void> {
    try {
      const isTemporary = category === 'reminder_verse' || category === 'reminder_salawat' || category === 'adhan';

      // If a temporary reminder/notification sound is triggered while Quran or Adhkar is playing,
      // save the active track and current playback position so we can resume it after the reminder finishes!
      if (isTemporary && this.currentState && (this.currentState.category === 'quran' || this.currentState.category === 'adhkar')) {
        this.interruptedTrack = {
          url: this.currentPlayingUrl || this.audioElement.src,
          category: this.currentState.category,
          metadata: { ...this.currentState },
          callbacks: {
            onEnded: this.onTrackEndedCallback,
            onError: this.onTrackErrorCallback,
            onPrevious: this.onPreviousTrackCallback,
            onNext: this.onNextTrackCallback,
            onRepetitionUpdated: this.onRepetitionUpdatedCallback
          },
          clipOptions: {
            startTime: this.currentStartTime,
            endTime: this.currentEndTime
          },
          currentTime: this.audioElement.currentTime
        };
      } else if (!isTemporary) {
        // Normal user track switch cancels any previous interruption
        this.interruptedTrack = null;
      }

      this.audioElement.pause();
      this.currentCategory = category;
      this.currentPlayingUrl = url;
      this.onTrackEndedCallback = callbacks?.onEnded || null;
      this.onTrackErrorCallback = callbacks?.onError || null;
      this.onPreviousTrackCallback = callbacks?.onPrevious || null;
      this.onNextTrackCallback = callbacks?.onNext || null;
      this.onRepetitionUpdatedCallback = callbacks?.onRepetitionUpdated || null;

      this.currentStartTime = clipOptions?.startTime || 0;
      this.currentEndTime = (clipOptions?.endTime !== undefined && clipOptions.endTime > 0) ? clipOptions.endTime : null;

      const initialDuration = this.currentEndTime 
        ? (this.currentEndTime - this.currentStartTime) 
        : (metadata?.durationSeconds || 0);

      this.currentState = {
        category,
        isPlaying: true,
        currentTime: this.currentStartTime,
        duration: initialDuration,
        ...metadata
      };

      if (category === 'quran' && metadata.surahNumber) {
        StorageService.saveLastAudioPosition({
          surahNumber: metadata.surahNumber,
          surahName: (metadata.title || '').replace(/^سورة\s+/, ''),
          ayahNumber: metadata.ayahNumber || 1,
          reciterName: metadata.reciterName || 'الشيخ مشاري راشد العفاسي',
          currentTime: this.currentStartTime,
          duration: initialDuration,
          timestamp: Date.now()
        });
      }

      this.updateMediaSessionMetadata(metadata.title, metadata.subtitle, 'أثر | ATHAR');
      this.audioElement.src = url;

      // Ensure seeking happens accurately once metadata is loaded
      const targetStart = this.currentStartTime;
      const applyStartTime = () => {
        if (targetStart > 0) {
          try {
            this.audioElement.currentTime = targetStart;
          } catch {
            // Ignore
          }
        }
      };

      this.audioElement.onloadedmetadata = () => {
        applyStartTime();
      };

      if (targetStart > 0) {
        try {
          this.audioElement.currentTime = targetStart;
        } catch {
          // Will be applied on onloadedmetadata
        }
      } else {
        try {
          this.audioElement.currentTime = 0;
        } catch {
          // Ignore
        }
      }

      await this.audioElement.play();
      applyStartTime();
      this.notifyListeners();
    } catch (err) {
      console.warn('Audio playback error (playUrl):', err);
      // Fallback: update state to not playing
      if (this.currentState) {
        this.currentState.isPlaying = false;
        this.notifyListeners();
      }
    }
  }

  public pause(): void {
    if (this.isUsingSpeechSynthesis && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
    this.audioElement.pause();
    if (this.currentState) {
      this.currentState.isPlaying = false;
      this.notifyListeners();
      this.updateMediaSessionPlaybackState('paused');
    }
  }

  public resume(): void {
    if (this.isUsingSpeechSynthesis && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    } else {
      this.audioElement.play().catch(e => console.warn('Resume error:', e));
    }
    if (this.currentState) {
      this.currentState.isPlaying = true;
      this.notifyListeners();
      this.updateMediaSessionPlaybackState('playing');
    }
  }

  public togglePlayPause(): void {
    if (this.isUsingSpeechSynthesis) {
      if (this.currentState?.isPlaying) {
        this.pause();
      } else {
        this.resume();
      }
      return;
    }

    if (this.audioElement.paused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  /**
   * Stops audio and safely resumes any previous interrupted recitation (Adhkar or Quran)
   */
  public stopTemporaryAndResume(): void {
    const isTemporary = this.currentCategory === 'reminder_verse' || this.currentCategory === 'reminder_salawat' || this.currentCategory === 'adhan';
    if (isTemporary && this.interruptedTrack) {
      const toResume = this.interruptedTrack;
      this.interruptedTrack = null;
      this.audioElement.pause();
      setTimeout(() => {
        this.playUrl(toResume.url, toResume.category, toResume.metadata, toResume.callbacks, {
          ...toResume.clipOptions,
          startTime: toResume.currentTime
        });
      }, 250);
    } else {
      this.stop();
    }
  }

  public stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isUsingSpeechSynthesis = false;
    this.currentStartTime = 0;
    this.currentEndTime = null;
    this.interruptedTrack = null;
    this.currentPlayingUrl = null;
    this.audioElement.pause();
    this.audioElement.currentTime = 0;
    this.currentState = null;
    this.currentCategory = null;
    this.onTrackEndedCallback = null;
    this.onPreviousTrackCallback = null;
    this.onNextTrackCallback = null;
    this.updateMediaSessionPlaybackState('none');
    this.notifyListeners();
  }

  public seekTo(seconds: number): void {
    const dur = this.audioElement.duration || (this.currentState?.duration ?? 0);
    const target = dur > 0 ? Math.min(Math.max(0, seconds), dur) : Math.max(0, seconds);
    this.audioElement.currentTime = target;
    if (this.currentState) {
      this.currentState.currentTime = target;
      this.notifyListeners();
    }
  }

  public skipForward(seconds: number = 10): void {
    const cur = this.audioElement.currentTime || (this.currentState?.currentTime ?? 0);
    const dur = this.audioElement.duration || (this.currentState?.duration ?? 0);
    const target = dur > 0 ? Math.min(cur + seconds, dur) : cur + seconds;
    this.seekTo(target);
  }

  public skipBackward(seconds: number = 10): void {
    const cur = this.audioElement.currentTime || (this.currentState?.currentTime ?? 0);
    const target = Math.max(cur - seconds, 0);
    this.seekTo(target);
  }

  /**
   * Recites the exact Arabic words of a Dhikr with calm, clear pronunciation
   */
  public speakArabicDhikr(
    arabicText: string,
    metadata: {
      title: string;
      subtitle: string;
      dhikrId?: number;
      currentRepetition?: number;
      targetRepetition?: number;
      dhikrIndex?: number;
      totalAdhkar?: number;
    },
    callbacks?: {
      onEnded?: () => void;
      onPrevious?: () => void;
      onNext?: () => void;
    }
  ): void {
    this.audioElement.pause();
    this.isUsingSpeechSynthesis = true;
    this.currentCategory = 'adhkar';
    this.onTrackEndedCallback = callbacks?.onEnded || null;
    this.onPreviousTrackCallback = callbacks?.onPrevious || null;
    this.onNextTrackCallback = callbacks?.onNext || null;

    this.currentState = {
      category: 'adhkar',
      isPlaying: true,
      currentTime: 0,
      duration: Math.max(8, Math.round(arabicText.length / 10)),
      ...metadata
    };

    this.updateMediaSessionMetadata(metadata.title, metadata.subtitle, 'أثر | ATHAR');
    this.notifyListeners();

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setTimeout(() => callbacks?.onEnded?.(), 4000);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const clean = arabicText
        .replace(/[﴿﴾۝\(\)]/g, '')
        .replace(/[0-9٠-٩]+/g, '')
        .replace(/\n+/g, ' ')
        .trim();

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = 'ar-SA';
      utterance.rate = 0.85; // Calm, respectful recitation speed
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const arabicVoice = voices.find(v => v.lang.startsWith('ar') || v.lang.includes('AR'));
      if (arabicVoice) {
        utterance.voice = arabicVoice;
      }

      utterance.onend = () => {
        if (this.currentState) {
          this.currentState.isPlaying = false;
        }
        callbacks?.onEnded?.();
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis utterance error:', e);
        callbacks?.onEnded?.();
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis exception:', e);
      setTimeout(() => callbacks?.onEnded?.(), 4000);
    }
  }

  /**
   * Helper: Plays complete Surah recitation from outside the reader
   */
  public async playFullSurah(
    surahNumber: number,
    surahName: string,
    reciterId?: string,
    callbacks?: { onEnded?: () => void; onPrevious?: () => void; onNext?: () => void }
  ): Promise<void> {
    const settings = StorageService.getSettings();
    const effectiveReciterId = reciterId || settings.selectedReciterId || 'alafasy';
    const reciter = VERIFIED_RECITERS.find(r => r.id === effectiveReciterId) || VERIFIED_RECITERS[0];
    const server = reciter.surahAudioServer || "https://server8.mp3quran.net/afs";
    const audioUrl = getFullSurahAudioUrl(server, surahNumber);

    await this.playUrl(
      audioUrl,
      'quran',
      {
        title: `سورة ${surahName}`,
        subtitle: `تلاوة كاملة · ${reciter.nameArabic}`,
        surahNumber,
        reciterName: reciter.nameArabic
      },
      callbacks
    );
  }

  public getCurrentState(): ActiveAudioState | null {
    return this.currentState;
  }

  /**
   * Helper: Plays single Quran Ayah using the selected reciter
   */
  public async playQuranAyah(
    surahNumber: number,
    ayahNumber: number,
    surahName: string,
    reciterId?: string,
    callbacks?: { onEnded?: () => void; onPrevious?: () => void; onNext?: () => void }
  ): Promise<void> {
    const settings = StorageService.getSettings();
    const effectiveReciterId = reciterId || settings.selectedReciterId || 'alafasy';
    const reciter = VERIFIED_RECITERS.find(r => r.id === effectiveReciterId) || VERIFIED_RECITERS[0];

    const audioUrl = getAyahAudioUrl(reciter.audioServer, surahNumber, ayahNumber);

    await this.playUrl(
      audioUrl,
      'quran',
      {
        title: `سورة ${surahName} - آية ${ayahNumber}`,
        subtitle: reciter.nameArabic,
        surahNumber,
        ayahNumber,
        reciterName: reciter.nameArabic
      },
      callbacks
    );
  }

  /**
   * Plays Adhan test audio or prayer Adhan with verified high quality recordings
   */
  public async playAdhan(voiceId: 'makkah' | 'madinah' | 'alaqsa' | 'alafasy' = 'alafasy'): Promise<void> {
    const adhanAudioMap: Record<string, { localUrl: string; cdnUrl: string; title: string }> = {
      alafasy: {
        localUrl: "/audio/adhan_alafasy.mp3",
        cdnUrl: "https://cdn.jsdelivr.net/gh/Kiwifu/adhan-mp3@main/Mishary_Al_Afasy_-_HQ_(%D9%85%D8%B4%D8%A7%D8%B1%D9%8A_%D8%A7%D9%84%D8%B9%D9%81%D8%A7%D8%B3%D9%8A).mp3",
        title: "أذان بصوت الشيخ مشاري راشد العفاسي"
      },
      makkah: {
        localUrl: "/audio/adhan_makkah.mp3",
        cdnUrl: "https://cdn.jsdelivr.net/gh/Kiwifu/adhan-mp3@main/Ali_Ibn_Ahmad_Mala_1_-_Al_Haram_Al_Maki_(%D8%B9%D9%84%D9%8A_%D8%A8%D9%86_%D8%A3%D8%AD%D9%85%D8%AF_%D9%85%D9%84%D8%A7_-_%D8%A7%D9%84%D8%AD%D8%B1%D9%85_%D8%A7%D9%84%D9%85%D9%83%D9%8A).mp3",
        title: "أذان الحرم المكي الشريف (الشيخ علي ملا)"
      },
      madinah: {
        localUrl: "/audio/adhan_madinah.mp3",
        cdnUrl: "https://cdn.jsdelivr.net/gh/Kiwifu/adhan-mp3@main/Adhan_Al_Haram_Al_Madani_-_Al_Madinah_1_(%D8%A3%D8%B0%D8%A7%D9%86_%D8%A7%D9%84%D8%AD%D8%B1%D9%85_%D8%A7%D9%84%D9%85%D8%AF%D9%86%D9%8A_-_%D8%A7%D9%84%D9%85%D8%AF%D9%8A%D9%86%D8%A9_%D8%A7%D9%84%D9%85%D9%86%D9%88%D8%B1%D8%A9).mp3",
        title: "أذان المسجد النبوي الشريف"
      },
      alaqsa: {
        localUrl: "/audio/adhan_alaqsa.mp3",
        cdnUrl: "https://cdn.jsdelivr.net/gh/Kiwifu/adhan-mp3@main/Adhan_Al_Aqsa_-_Jerusalem_(%D8%A3%D8%B0%D8%A7%D9%86_%D8%A7%D9%84%D9%85%D8%B3%D8%AC%D8%AF_%D8%A7%D9%84%D8%A3%D9%82%D8%B5%D9%89_-_%D8%A7%D9%84%D9%82%D8%AF%D8%B3).mp3",
        title: "أذان المسجد الأقصى المبارك"
      }
    };

    const target = adhanAudioMap[voiceId] || adhanAudioMap.alafasy;

    await this.playUrl(
      target.localUrl,
      'adhan',
      {
        title: target.title,
        subtitle: 'حان الآن موعد الصلاة'
      },
      {
        onError: () => {
          // Robust fallback to CDN
          this.playUrl(target.cdnUrl, 'adhan', {
            title: target.title,
            subtitle: 'حان الآن موعد الصلاة'
          });
        }
      }
    );
  }

  /**
   * Plays Prophet ﷺ reminder audio: Surah Al-Ahzab (33:56)
   * "إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ ۚ يَا أَيُّهَا الَّذِينَ آمَنُوا صَلُّوا عَلَيْهِ وَسَلِّمُوا تَسْلِيمًا"
   * Recited by Sheikh Mishary Rashid Alafasy with instant local delivery and CDN fallback
   */
  public async playSalawatReminder(): Promise<void> {
    const localUrl = "/audio/salawat.mp3";
    const cdnUrl = "https://everyayah.com/data/Alafasy_128kbps/033056.mp3";

    await this.playUrl(
      localUrl,
      'reminder_salawat',
      {
        title: "الصلاة على النبي ﷺ",
        subtitle: "إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ · تلاوة الشيخ مشاري العفاسي"
      },
      {
        onError: () => {
          this.playUrl(cdnUrl, 'reminder_salawat', {
            title: "الصلاة على النبي ﷺ",
            subtitle: "إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ · تلاوة الشيخ مشاري العفاسي"
          });
        }
      }
    );
  }
}

export const AudioService = new CentralAudioService();
