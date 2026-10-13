import { ALL_SURAHS, VERIFIED_RECITERS, getAyahAudioUrl, getFullSurahAudioUrl } from '../data/surahsData';
import { StorageService } from './storageService';
import { OfflineAudioPackService } from './offlineAudioPackService';

export type AudioCategory = 'quran' | 'adhkar' | 'adhan' | 'dua_adhan' | 'iqamah' | 'reminder_verse' | 'reminder_salawat' | 'reminder_wird' | 'reminder_dhikr' | 'reminder_parents';

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
  queuedCount?: number;
  // Adhkar specific
  dhikrId?: number;
  currentRepetition?: number;
  targetRepetition?: number;
  dhikrIndex?: number;
  totalAdhkar?: number;
  // Smart Sleep Timer & Ayah Repeat for Memorization
  sleepTimerRemainingSeconds?: number | null;
  stopAtEndOfSurah?: boolean;
  ayahRepeatTarget?: number; // 1 = normal, 3, 5, 10, 0 = infinite
  ayahRepeatCurrent?: number;
}

export interface QueuedAudioNotification {
  id: string;
  name: string;
  priority: number;
  action: () => Promise<void>;
  onComplete?: () => void;
}

type AudioListener = (state: ActiveAudioState | null) => void;

interface InterruptedPlayback {
  url: string;
  category: AudioCategory;
  metadata: any;
  callbacks?: any;
  clipOptions?: any;
  currentTime: number;
  continuousQuranRecitation?: {
    surahNumber: number;
    ayahNumber: number;
    reciterId: string;
    surahName: string;
  } | null;
}

class CentralAudioService {
  private audioElement: HTMLAudioElement;
  private audioContext: AudioContext | null = null;
  private currentCategory: AudioCategory | null = null;
  private currentPlayingUrl: string | null = null;
  private currentState: ActiveAudioState | null = null;
  private listeners: Set<AudioListener> = new Set();
  private isUsingSpeechSynthesis = false;
  private currentStartTime: number = 0;
  private currentEndTime: number | null = null;
  private interruptedTrack: InterruptedPlayback | null = null;
  private lastAudioTrackingTimestamp: number = 0;
  private currentSessionId: number = 0;
  private activeTimers: Set<number> = new Set();

  // Audio Focus & Phone Call / External Interruption tracking
  private isUserPaused: boolean = false;
  private isInternalTransition: boolean = false;
  private wasInterruptedByExternalSystem: boolean = false;
  private externalInterruptionSavedTime: number = 0;

  // Smart Sleep Timer & Gradual Audio Fade-Out
  private sleepTimerRemainingSeconds: number | null = null;
  private sleepTimerIntervalId: number | null = null;
  private stopAtEndOfSurah: boolean = false;

  // Ayah Repeat for Memorization (1 = normal, 3, 5, 10, 0 = infinite)
  private ayahRepeatTarget: number = 1;
  private ayahRepeatCurrent: number = 1;

  // Notification Priority Queue ("دور التنبيهات المنظم")
  private notificationQueue: QueuedAudioNotification[] = [];
  private isProcessingNotificationQueue = false;

  // Continuous Quran Recitation engine
  private continuousQuranRecitation: {
    surahNumber: number;
    ayahNumber: number;
    reciterId: string;
    surahName: string;
  } | null = null;

  // Handlers for continuous playback
  private onTrackEndedCallback: (() => void) | null = null;
  private onTrackErrorCallback: ((e: any) => void) | null = null;
  private onRepetitionUpdatedCallback: ((count: number) => void) | null = null;
  private onPreviousTrackCallback: (() => void) | null = null;
  private onNextTrackCallback: (() => void) | null = null;

  constructor() {
    this.audioElement = new Audio();
    this.audioElement.preload = 'auto';
    this.audioElement.volume = 1.0;
    this.setupAudioListeners();
    this.setupMediaSession();
    this.setupAudioUnlock();
    this.setupSystemAudioFocusListeners();
  }

  /**
   * Unlocks Web Audio API and HTMLAudioElement WITHOUT calling play() on an empty src
   * so that subsequent synchronous or asynchronous audio playback succeeds reliably.
   */
  public unlockAudio(): void {
    if (typeof window === 'undefined') return;
    try {
      this.audioElement.volume = 1.0;
      this.audioElement.muted = false;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!this.audioContext) {
          this.audioContext = new AudioCtx();
        }
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume().catch(() => {});
        }
      }
    } catch {}
    this.audioUnlockedFlag = true;
  }

  private audioUnlockedFlag: boolean = false;

  public isAudioUnlocked(): boolean {
    if (this.audioUnlockedFlag) return true;
    if (this.audioContext && this.audioContext.state === 'running') return true;
    return false;
  }

  private temporaryAudioFinishedListeners: Set<() => void> = new Set();
  private temporaryAudioStartedListeners: Set<() => void> = new Set();

  public addTemporaryAudioFinishedListener(cb: () => void): () => void {
    this.temporaryAudioFinishedListeners.add(cb);
    return () => this.temporaryAudioFinishedListeners.delete(cb);
  }

  public addTemporaryAudioStartedListener(cb: () => void): () => void {
    this.temporaryAudioStartedListeners.add(cb);
    return () => this.temporaryAudioStartedListeners.delete(cb);
  }

  private notifyTemporaryAudioFinished(): void {
    this.temporaryAudioFinishedListeners.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.warn('Temporary audio finished listener error:', e);
      }
    });
  }

  private notifyTemporaryAudioStarted(): void {
    this.temporaryAudioStartedListeners.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.warn('Temporary audio started listener error:', e);
      }
    });
  }

  public isAudioCurrentlyActive(): boolean {
    return Boolean(this.currentState?.isPlaying && !this.audioElement.paused);
  }

  public isTemporaryAudioCurrentlyActive(): boolean {
    return Boolean(
      this.currentState?.isPlaying &&
      !this.audioElement.paused &&
      this.isCategoryTemporary(this.currentCategory)
    );
  }

  public isPrimaryAudioPlaying(): boolean {
    return Boolean(
      this.currentState &&
      (this.currentState.category === 'quran' || this.currentState.category === 'adhkar') &&
      this.currentState.isPlaying
    );
  }

  /**
   * Returns any saved primary Quran/Adhkar playback state currently waiting for a temporary sound to finish
   */
  public getInterruptedTrackState(): ActiveAudioState | null {
    if (!this.interruptedTrack || !this.interruptedTrack.metadata) return null;
    return {
      ...this.interruptedTrack.metadata,
      isPlaying: false,
      currentTime: this.interruptedTrack.currentTime || this.interruptedTrack.metadata.currentTime || 0,
      sleepTimerRemainingSeconds: this.sleepTimerRemainingSeconds,
      stopAtEndOfSurah: this.stopAtEndOfSurah,
      ayahRepeatTarget: this.ayahRepeatTarget,
      ayahRepeatCurrent: this.ayahRepeatCurrent
    };
  }

  private clearAllActiveTimers() {
    this.activeTimers.forEach((id) => window.clearTimeout(id));
    this.activeTimers.clear();
  }

  private scheduleSafeTimeout(fn: () => void, ms: number): number {
    const id = window.setTimeout(() => {
      this.activeTimers.delete(id);
      fn();
    }, ms);
    this.activeTimers.add(id);
    return id;
  }

  private setupAudioUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.unlockAudio();
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('click', unlock, { once: true, passive: true });
    window.addEventListener('touchstart', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
  }

  /**
   * Handles OS-level interruptions such as incoming phone calls, alarms, voice assistants,
   * or other apps taking temporary audio focus. Automatically resumes Quran or Adhkar when
   * the phone call or external interruption ends!
   */
  private setupSystemAudioFocusListeners() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const tryAutoResumeAfterExternalInterrupt = () => {
      if (this.isUserPaused) return;

      // Case 1: Primary Quran or Adhkar was directly interrupted by a phone call or OS audio focus loss
      if (
        this.wasInterruptedByExternalSystem &&
        this.currentState &&
        (this.currentCategory === 'quran' || this.currentCategory === 'adhkar') &&
        this.audioElement.paused
      ) {
        this.wasInterruptedByExternalSystem = false;
        this.unlockAudio();
        if (this.externalInterruptionSavedTime > 0) {
          try {
            this.audioElement.currentTime = this.externalInterruptionSavedTime;
          } catch {}
        }
        this.audioElement.play().then(() => {
          if (this.currentState) {
            this.currentState.isPlaying = true;
            this.notifyListeners();
            this.updateMediaSessionPlaybackState('playing');
          }
        }).catch(() => {});
        return;
      }

      // Case 2: A temporary sound was interrupted by a phone call and stalled while a primary track was waiting
      if (
        this.interruptedTrack &&
        this.isCategoryTemporary(this.currentCategory) &&
        this.audioElement.paused
      ) {
        this.resumeInterruptedTrackNow();
      }
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.scheduleSafeTimeout(tryAutoResumeAfterExternalInterrupt, 350);
      }
    });

    window.addEventListener('focus', () => {
      this.scheduleSafeTimeout(tryAutoResumeAfterExternalInterrupt, 350);
    });

    window.addEventListener('pageshow', () => {
      this.scheduleSafeTimeout(tryAutoResumeAfterExternalInterrupt, 350);
    });
  }

  private isCategoryTemporary(cat: AudioCategory | null): boolean {
    return (
      cat === 'reminder_verse' ||
      cat === 'reminder_salawat' ||
      cat === 'reminder_wird' ||
      cat === 'reminder_dhikr' ||
      cat === 'reminder_parents' ||
      cat === 'adhan' ||
      cat === 'dua_adhan' ||
      cat === 'iqamah'
    );
  }

  private setupAudioListeners() {
    this.audioElement.addEventListener('play', () => {
      this.wasInterruptedByExternalSystem = false;
      if (this.currentState) {
        this.currentState.isPlaying = true;
        this.notifyListeners();
        this.updateMediaSessionPlaybackState('playing');
      }
    });

    this.audioElement.addEventListener('pause', () => {
      // If continuous recitation is advancing between ayahs, do not drop isPlaying or stutter the UI!
      if (
        this.isInternalTransition ||
        (this.continuousQuranRecitation && this.currentCategory === 'quran' && !this.isUserPaused && !this.wasInterruptedByExternalSystem)
      ) {
        return;
      }

      // Detect if the browser/OS paused the audio externally (e.g., incoming phone call or another media app)
      if (
        !this.isInternalTransition &&
        !this.isUserPaused &&
        !this.audioElement.ended &&
        (this.currentCategory === 'quran' || this.currentCategory === 'adhkar')
      ) {
        this.wasInterruptedByExternalSystem = true;
        this.externalInterruptionSavedTime = this.audioElement.currentTime || this.currentState?.currentTime || 0;
      }
      if (this.currentState) {
        this.currentState.isPlaying = false;
        this.notifyListeners();
        this.updateMediaSessionPlaybackState('paused');
      }
    });

    this.audioElement.addEventListener('timeupdate', () => {
      if (this.currentCategory === 'quran' && this.currentState?.isPlaying && !this.audioElement.paused) {
        const now = Date.now();
        if (this.lastAudioTrackingTimestamp > 0) {
          const delta = (now - this.lastAudioTrackingTimestamp) / 1000;
          if (delta >= 1) {
            StorageService.recordSecondsListened(Math.min(5, Math.floor(delta)));
            this.lastAudioTrackingTimestamp = now;
          }
        } else {
          this.lastAudioTrackingTimestamp = now;
        }
      } else {
        this.lastAudioTrackingTimestamp = 0;
      }

      // Precise trimming support: If endTime is set and reached, stop immediately
      if (this.currentEndTime !== null && this.audioElement.currentTime >= this.currentEndTime) {
        const sessionBeforeCb = this.currentSessionId;
        this.isInternalTransition = true;
        this.audioElement.pause();
        this.isInternalTransition = false;
        const endCb = this.onTrackEndedCallback;
        const isTemporary = this.isCategoryTemporary(this.currentCategory);
        this.currentEndTime = null;
        this.onTrackEndedCallback = null;
        if (this.currentState) {
          this.currentState.isPlaying = false;
          this.currentState.currentTime = this.audioElement.currentTime;
          this.notifyListeners();
        }
        if (endCb) {
          try {
            endCb();
          } catch (e) {
            console.warn(e);
          }
        }
        // Only handle track completion if endCb did NOT immediately start a chained track (like Dua after Adhan)
        if (this.currentSessionId === sessionBeforeCb) {
          this.handleTrackCompletion(isTemporary);
        }
        return;
      }

      if (this.currentState) {
        const lastSec = Math.floor(this.currentState.currentTime || 0);
        const curSec = Math.floor(this.audioElement.currentTime);
        this.currentState.currentTime = this.audioElement.currentTime;
        const clipDuration = this.currentEndTime ? this.currentEndTime - this.currentStartTime : 0;
        this.currentState.duration = clipDuration > 0 ? clipDuration : this.currentState.duration || this.audioElement.duration || 0;
        // Only trigger UI notification when the integer second changes, saving 75% of React re-renders
        if (curSec !== lastSec) {
          this.notifyListeners();
          if (this.currentState.category === 'quran' && this.currentState.surahNumber && curSec % 3 === 0) {
            StorageService.saveLastAudioPosition({
              surahNumber: this.currentState.surahNumber,
              surahName: (this.currentState.title || '').replace(/^سورة\s+/, ''),
              ayahNumber: this.currentState.ayahNumber || 1,
              reciterName: this.currentState.reciterName || 'الشيخ مشاري راشد العفاسي',
              currentTime: this.audioElement.currentTime,
              duration: this.audioElement.duration || this.currentState.duration || 0,
              timestamp: Date.now()
            });
          }
        }
      }
    });

    this.audioElement.addEventListener('ended', () => {
      const sessionBeforeCb = this.currentSessionId;
      const isTemporary = this.isCategoryTemporary(this.currentCategory);
      const isContinuousQuran = Boolean(this.continuousQuranRecitation && this.currentCategory === 'quran');

      // For continuous Quran playback between ayahs, keep isPlaying true so the player never stutters or disappears
      if (!isContinuousQuran && this.currentState) {
        this.currentState.isPlaying = false;
        this.notifyListeners();
      }
      if (this.onTrackEndedCallback) {
        const cb = this.onTrackEndedCallback;
        this.onTrackEndedCallback = null;
        try {
          cb();
        } catch (e) {
          console.warn(e);
        }
      } else if (this.currentSessionId === sessionBeforeCb) {
        this.handleTrackCompletion(isTemporary);
      }
    });

    this.audioElement.addEventListener('error', (e) => {
      console.warn('Audio playback error:', e);
      const sessionBeforeCb = this.currentSessionId;
      const isTemporary = this.isCategoryTemporary(this.currentCategory);
      if (this.currentState) {
        this.currentState.isPlaying = false;
        this.notifyListeners();
      }
      if (this.onTrackErrorCallback) {
        const errCb = this.onTrackErrorCallback;
        this.onTrackErrorCallback = null;
        try {
          errCb(e);
        } catch (err) {
          console.warn(err);
        }
      }
      // If `errCb` did NOT start a fallback URL (session unchanged) and this was a temporary track,
      // automatically resume the interrupted Quran or Adhkar track!
      if (isTemporary && this.currentSessionId === sessionBeforeCb) {
        this.handleTrackCompletion(true);
      }
      if (this.isProcessingNotificationQueue) {
        this.clearNotificationQueue();
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
          { src: '/athar-royal-icon.jpg', sizes: '512x512', type: 'image/jpeg' },
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
    listener(
      this.currentState
        ? {
            ...this.currentState,
            sleepTimerRemainingSeconds: this.sleepTimerRemainingSeconds,
            stopAtEndOfSurah: this.stopAtEndOfSurah,
            ayahRepeatTarget: this.ayahRepeatTarget,
            ayahRepeatCurrent: this.ayahRepeatCurrent
          }
        : null
    );
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const snapshot = this.currentState
      ? {
          ...this.currentState,
          queuedCount: this.notificationQueue.length,
          sleepTimerRemainingSeconds: this.sleepTimerRemainingSeconds,
          stopAtEndOfSurah: this.stopAtEndOfSurah,
          ayahRepeatTarget: this.ayahRepeatTarget,
          ayahRepeatCurrent: this.ayahRepeatCurrent
        }
      : null;
    this.listeners.forEach((l) => l(snapshot));
  }

  /**
   * Captures any active Quran or Adhkar playback before playing a temporary reminder/Adhan/Dua/Iqamah/DailyAyah,
   * so that when the temporary audio finishes, the Quran or Adhkar automatically resumes from the exact second!
   */
  public saveCurrentPrimaryTrackForInterruption(): void {
    // Only capture if we don't already have an interrupted primary track waiting in the stack,
    // AND the primary track was actively playing (or interrupted by OS) — not explicitly paused by the user!
    if (
      this.currentState &&
      (this.currentState.category === 'quran' || this.currentState.category === 'adhkar') &&
      (this.currentState.isPlaying || !this.audioElement.paused || this.wasInterruptedByExternalSystem) &&
      !this.isUserPaused &&
      !this.interruptedTrack
    ) {
      this.interruptedTrack = {
        url: this.currentPlayingUrl || this.audioElement.src,
        category: this.currentState.category,
        metadata: { ...this.currentState, isPlaying: true },
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
        currentTime: this.audioElement.currentTime || this.currentState.currentTime || 0,
        continuousQuranRecitation: this.continuousQuranRecitation ? { ...this.continuousQuranRecitation } : null
      };
    }
  }

  /**
   * Safe centralized playback: stops any current audio stream first
   * and preserves any active Quran or Adhkar track if `category` is temporary!
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
    const thisSessionId = ++this.currentSessionId;
    try {
      this.unlockAudio();
      this.clearAllActiveTimers();
      const isTemporary = this.isCategoryTemporary(category);

      // If a temporary alert/adhan/reminder is ALREADY playing, DO NOT CUT IT OFF!
      // Enqueue this sound into the turn queue so the currently active sound finishes completely first!
      if (isTemporary && this.isTemporaryAudioCurrentlyActive() && !this.isProcessingNotificationQueue) {
        this.enqueueNotificationAudio({
          id: Math.random().toString(36).substring(2, 9),
          name: metadata.title,
          priority: category === 'adhan' ? 10 : category === 'reminder_parents' ? 5 : 3,
          action: async () => {
            await this.playUrl(url, category, metadata, callbacks, clipOptions);
          }
        });
        return;
      }

      // If a temporary reminder/notification/Adhan/Iqamah/Dua/DailyVerse sound is triggered while Quran or Adhkar is active,
      // save the active track and current playback position so we can resume it automatically after the temporary sound finishes!
      if (isTemporary) {
        this.saveCurrentPrimaryTrackForInterruption();
      } else {
        this.interruptedTrack = null;
        this.isUserPaused = false;
        this.wasInterruptedByExternalSystem = false;
      }

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      this.isUsingSpeechSynthesis = false;

      // If the exact same audio track is already loaded or playing (e.g. user tapped notification banner to open sound),
      // keep playing from the current position instead of restarting from the beginning!
      const isSameTrack =
        Boolean(this.currentPlayingUrl && (this.currentPlayingUrl === url || this.audioElement.src.endsWith(url)));

      if (isSameTrack && this.audioElement.currentTime > 0) {
        this.unlockAudio();
        this.audioElement.volume = 1.0;
        this.audioElement.muted = false;
        if (this.audioElement.paused) {
          this.audioElement.play().catch(() => {});
        }
        if (this.currentState) {
          this.currentState.isPlaying = true;
          this.notifyListeners();
        }
        return;
      }

      // Only pause if not already paused to avoid interrupting a pending play request unnecessarily
      if (!this.audioElement.paused) {
        this.isInternalTransition = true;
        try {
          this.audioElement.pause();
        } catch {}
        this.isInternalTransition = false;
      }

      this.currentCategory = category;
      this.currentPlayingUrl = url;
      this.onTrackEndedCallback = callbacks?.onEnded
        ? () => {
            if (this.currentSessionId === thisSessionId) callbacks.onEnded!();
          }
        : null;
      this.onTrackErrorCallback = callbacks?.onError
        ? (err) => {
            if (this.currentSessionId === thisSessionId) callbacks.onError!(err);
          }
        : null;
      this.onPreviousTrackCallback = callbacks?.onPrevious || null;
      this.onNextTrackCallback = callbacks?.onNext || null;
      this.onRepetitionUpdatedCallback = callbacks?.onRepetitionUpdated || null;

      this.currentStartTime = clipOptions?.startTime || 0;
      this.currentEndTime = clipOptions?.endTime !== undefined && clipOptions.endTime > 0 ? clipOptions.endTime : null;

      const initialDuration = this.currentEndTime
        ? this.currentEndTime - this.currentStartTime
        : metadata?.durationSeconds || 0;

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
      this.audioElement.volume = 1.0;
      this.audioElement.muted = false;

      const targetStart = this.currentStartTime;
      const applyStartTime = () => {
        if (targetStart > 0 && this.currentSessionId === thisSessionId) {
          try {
            this.audioElement.currentTime = targetStart;
          } catch {
            // Ignore if media isn't seekable yet
          }
        }
      };

      this.audioElement.onloadedmetadata = () => {
        applyStartTime();
      };

      // Resolve offline Blob URL from IndexedDB / CacheStorage if downloaded locally
      const playableUrl = await OfflineAudioPackService.resolvePlayableAudioUrl(url);
      if (this.currentSessionId !== thisSessionId) return;

      // Setting src automatically triggers the browser's resource load algorithm;
      // avoid calling load() followed immediately by play() or pause() on the same URL
      if (this.audioElement.src !== playableUrl) {
        this.audioElement.src = playableUrl;
      } else {
        try {
          this.audioElement.currentTime = targetStart;
        } catch {
          this.audioElement.load();
        }
      }

      if (targetStart > 0) {
        try {
          this.audioElement.currentTime = targetStart;
        } catch {
          // Applied on onloadedmetadata
        }
      }

      this.notifyListeners();
      if (isTemporary) {
        this.notifyTemporaryAudioStarted();
      }

      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
      if (this.currentSessionId !== thisSessionId) return;
      applyStartTime();
      this.notifyListeners();
    } catch (err: any) {
      // If a newer audio session started or this play() was interrupted by an intentional pause/transition,
      // silently ignore AbortError without triggering false error callbacks or console noise.
      const isAbortOrInterrupted =
        err?.name === 'AbortError' ||
        (typeof err?.message === 'string' &&
          (err.message.includes('interrupted by a call to pause') ||
            err.message.includes('interrupted by a new load request') ||
            err.message.includes('The play() request was interrupted')));

      if (this.currentSessionId !== thisSessionId || isAbortOrInterrupted) {
        if (this.currentSessionId === thisSessionId && this.isUserPaused && this.currentState) {
          this.currentState.isPlaying = false;
          this.notifyListeners();
        }
        return;
      }

      console.warn('Audio playback error (playUrl):', err);
      if (this.isCategoryTemporary(category)) {
        this.notifyTemporaryAudioFinished();
      }
      const sessionBeforeErr = this.currentSessionId;
      if (this.currentState) {
        this.currentState.isPlaying = false;
        this.notifyListeners();
      }
      if (callbacks?.onError) {
        try {
          callbacks.onError(err);
        } catch {}
      }
      if (this.isCategoryTemporary(category) && this.currentSessionId === sessionBeforeErr) {
        this.handleTrackCompletion(true);
      }
    }
  }

  public pause(): void {
    this.isUserPaused = true;
    this.wasInterruptedByExternalSystem = false;
    this.clearAllActiveTimers();
    if (this.isUsingSpeechSynthesis && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
    if (!this.audioElement.paused) {
      this.isInternalTransition = true;
      try {
        this.audioElement.pause();
      } catch {}
      this.isInternalTransition = false;
    }
    if (this.currentState) {
      this.currentState.isPlaying = false;
      this.currentState.currentTime = this.audioElement.currentTime;
      if (this.currentState.category === 'quran' && this.currentState.surahNumber) {
        StorageService.saveLastAudioPosition({
          surahNumber: this.currentState.surahNumber,
          surahName: (this.currentState.title || '').replace(/^سورة\s+/, ''),
          ayahNumber: this.currentState.ayahNumber || 1,
          reciterName: this.currentState.reciterName || 'الشيخ مشاري راشد العفاسي',
          currentTime: this.audioElement.currentTime,
          duration: this.audioElement.duration || this.currentState.duration || 0,
          timestamp: Date.now()
        });
      }
      this.notifyListeners();
      this.updateMediaSessionPlaybackState('paused');
    }
  }

  public resume(): void {
    this.isUserPaused = false;
    this.wasInterruptedByExternalSystem = false;
    this.unlockAudio();
    if (this.isUsingSpeechSynthesis && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    } else if (this.audioElement.paused) {
      this.audioElement.play().catch((e: any) => {
        if (
          e?.name === 'AbortError' ||
          (typeof e?.message === 'string' && e.message.includes('interrupted'))
        ) {
          return;
        }
        console.warn('Resume error:', e);
      });
    }
    if (this.currentState) {
      this.currentState.isPlaying = true;
      this.notifyListeners();
      this.updateMediaSessionPlaybackState('playing');
    }
  }

  /**
   * Mutes or unmutes the currently playing Adhan audio element IN-PLACE without pausing or resetting currentTime,
   * so that unmuting continues from the exact point in the live Adhan progression.
   */
  public setAdhanMuted(muted: boolean): void {
    try {
      this.audioElement.muted = muted;
      this.audioElement.volume = muted ? 0 : 1.0;
      if (!muted) {
        this.unlockAudio();
        if (this.audioElement.paused && this.currentState && !this.audioElement.ended) {
          this.audioElement.play().catch(() => {});
        }
      }
    } catch {}
  }

  /**
   * Guarantees Adhan resumes playing aloud from the exact elapsed position, never restarting from 0.
   */
  public resumeOrSeekAdhan(
    elapsedSeconds: number,
    voiceId: 'makkah' | 'madinah' | 'alaqsa' | 'alafasy' = 'alafasy',
    mode: 'full' | 'first_two_takbeers' = 'full'
  ): void {
    this.unlockAudio();
    this.audioElement.muted = false;
    this.audioElement.volume = 1.0;

    if (this.currentCategory === 'adhan' && this.audioElement.src) {
      if (elapsedSeconds > 0 && Math.abs(this.audioElement.currentTime - elapsedSeconds) > 2) {
        try {
          this.audioElement.currentTime = elapsedSeconds;
        } catch {}
      }
      if (this.audioElement.paused && !this.audioElement.ended) {
        this.audioElement.play().catch(() => {});
      }
      if (this.currentState) {
        this.currentState.isPlaying = true;
        this.notifyListeners();
      }
      return;
    }

    // If audio element was somehow recycled or stopped, restart from the exact elapsed second
    this.playAdhan(voiceId, { mode, startTime: elapsedSeconds }).catch(() => {});
  }

  public isAdhanMuted(): boolean {
    return Boolean(this.audioElement.muted || this.audioElement.volume === 0);
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
   * Stops temporary reminder/Adhan/DailyVerse audio and advances to next queued notification (or resumes any interrupted Quran or Adhkar track)!
   */
  public stopTemporaryAndResume(skipAllQueue: boolean = false): void {
    if (skipAllQueue) {
      this.clearNotificationQueue();
    }
    const isTemporary = this.isCategoryTemporary(this.currentCategory);
    if (isTemporary) {
      this.notifyTemporaryAudioFinished();
      this.currentSessionId++;
      this.clearAllActiveTimers();
      this.isInternalTransition = true;
      this.audioElement.pause();
      this.isInternalTransition = false;

      // If user stopped the current sound and there's a queued sound waiting, start the next one in queue!
      if (!skipAllQueue && this.notificationQueue.length > 0) {
        this.processNextQueuedNotification();
        return;
      }

      if (this.interruptedTrack) {
        this.resumeInterruptedTrackNow();
      } else {
        this.currentState = null;
        this.currentCategory = null;
        this.notifyListeners();
      }
    } else {
      this.stop();
    }
  }

  private resumeInterruptedTrackNow(): void {
    if (!this.interruptedTrack) return;
    const toResume = this.interruptedTrack;
    this.interruptedTrack = null;
    this.isUserPaused = false;
    this.wasInterruptedByExternalSystem = false;
    if (toResume.continuousQuranRecitation) {
      this.continuousQuranRecitation = { ...toResume.continuousQuranRecitation };
    }
    this.isInternalTransition = true;
    this.audioElement.pause();
    this.isInternalTransition = false;

    // Immediately restore visual state in GlobalMiniPlayer / QuranReader / AdhkarPlayerSheet
    this.currentState = {
      ...toResume.metadata,
      category: toResume.category,
      isPlaying: true,
      currentTime: toResume.currentTime
    };
    this.currentCategory = toResume.category;
    this.notifyListeners();

    const expectedSession = this.currentSessionId;
    this.scheduleSafeTimeout(() => {
      if (this.currentSessionId === expectedSession) {
        this.playUrl(toResume.url, toResume.category, toResume.metadata, toResume.callbacks, {
          ...toResume.clipOptions,
          startTime: toResume.currentTime,
          endTime: toResume.clipOptions?.endTime || undefined
        });
      }
    }, 250);
  }

  public stop(): void {
    this.currentSessionId++;
    this.isUserPaused = true;
    this.wasInterruptedByExternalSystem = false;
    this.clearAllActiveTimers();
    this.continuousQuranRecitation = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isUsingSpeechSynthesis = false;
    this.currentStartTime = 0;
    this.currentEndTime = null;
    this.interruptedTrack = null;
    this.currentPlayingUrl = null;
    this.clearNotificationQueue();
    this.audioElement.onloadedmetadata = null;
    this.isInternalTransition = true;
    this.audioElement.pause();
    this.isInternalTransition = false;
    try {
      this.audioElement.currentTime = 0;
    } catch {}
    this.currentState = null;
    this.currentCategory = null;
    this.onTrackEndedCallback = null;
    this.onTrackErrorCallback = null;
    this.onPreviousTrackCallback = null;
    this.onNextTrackCallback = null;
    this.updateMediaSessionPlaybackState('none');
    this.notifyListeners();
  }

  public seekTo(seconds: number): void {
    const dur = this.audioElement.duration || (this.currentState?.duration ?? 0);
    const target = dur > 0 ? Math.min(Math.max(0, seconds), dur) : Math.max(0, seconds);
    try {
      this.audioElement.currentTime = target;
    } catch {}
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

  public hasNavigationControls(): boolean {
    if (!this.currentState) return false;
    if (this.onPreviousTrackCallback || this.onNextTrackCallback) return true;
    return this.currentState.category === 'quran' || this.currentState.category === 'adhkar';
  }

  public playPreviousTrack(): void {
    if (this.onPreviousTrackCallback) {
      this.onPreviousTrackCallback();
      return;
    }
    if (this.currentState?.category === 'quran' && this.currentState.surahNumber) {
      const sNum = this.currentState.surahNumber;
      const aNum = this.currentState.ayahNumber || 1;
      if (aNum > 1) {
        this.playQuranContinuous(sNum, aNum - 1);
      } else if (sNum > 1) {
        const prevMeta = ALL_SURAHS.find((s) => s.number === sNum - 1);
        if (prevMeta) {
          this.playQuranContinuous(sNum - 1, prevMeta.numberOfAyahs);
        }
      }
      return;
    }
    if (this.currentState?.category === 'adhkar') {
      const lastAdhkar = StorageService.getLastAdhkarAudio();
      const cat = lastAdhkar?.category || 'morning';
      const idx = (this.currentState.dhikrIndex ? this.currentState.dhikrIndex - 1 : lastAdhkar?.dhikrIndex) || 0;
      if (idx > 0) {
        this.playAdhkarContinuous(cat, idx - 1, 1, 'repeated');
      } else {
        this.playAdhkarContinuous(cat, 0, 1, 'repeated');
      }
    }
  }

  public playNextTrack(): void {
    if (this.onNextTrackCallback) {
      this.onNextTrackCallback();
      return;
    }
    if (this.currentState?.category === 'quran' && this.currentState.surahNumber) {
      const sNum = this.currentState.surahNumber;
      const aNum = this.currentState.ayahNumber || 1;
      const surahMeta = ALL_SURAHS.find((s) => s.number === sNum);
      const maxAyahs = surahMeta?.numberOfAyahs || 7;
      if (aNum < maxAyahs) {
        this.playQuranContinuous(sNum, aNum + 1);
      } else if (sNum < 114) {
        this.playQuranContinuous(sNum + 1, 1);
      }
      return;
    }
    if (this.currentState?.category === 'adhkar') {
      const lastAdhkar = StorageService.getLastAdhkarAudio();
      const cat = lastAdhkar?.category || 'morning';
      const idx = (this.currentState.dhikrIndex ? this.currentState.dhikrIndex - 1 : lastAdhkar?.dhikrIndex) || 0;
      const total = this.currentState.totalAdhkar || 20;
      if (idx + 1 < total) {
        this.playAdhkarContinuous(cat, idx + 1, 1, 'repeated');
      }
    }
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
    if (this.isTemporaryAudioCurrentlyActive() && !this.isProcessingNotificationQueue) {
      this.enqueueNotificationAudio({
        id: Math.random().toString(36).substring(2, 9),
        name: metadata.title,
        priority: 3,
        action: async () => {
          this.speakArabicDhikr(arabicText, metadata, callbacks);
        }
      });
      return;
    }

    this.clearAllActiveTimers();
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
      this.scheduleSafeTimeout(() => callbacks?.onEnded?.(), 4000);
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
      utterance.rate = 0.85;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const arabicVoice = voices.find((v) => v.lang.startsWith('ar') || v.lang.includes('AR'));
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
      this.scheduleSafeTimeout(() => callbacks?.onEnded?.(), 4000);
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
    const reciter = VERIFIED_RECITERS.find((r) => r.id === effectiveReciterId) || VERIFIED_RECITERS[0];
    const server = reciter.surahAudioServer || 'https://server8.mp3quran.net/afs';
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

  public getLiveCurrentTime(): number {
    return this.audioElement?.currentTime || this.currentState?.currentTime || 0;
  }

  public getLiveDuration(): number {
    return this.audioElement?.duration || this.currentState?.duration || 0;
  }

  /**
   * Helper: Plays single Quran Ayah using the selected reciter
   */
  public async playQuranAyah(
    surahNumber: number,
    ayahNumber: number,
    surahName: string,
    reciterId?: string,
    callbacks?: { onEnded?: () => void; onPrevious?: () => void; onNext?: () => void },
    startTime: number = 0
  ): Promise<void> {
    const settings = StorageService.getSettings();
    const effectiveReciterId = reciterId || settings.selectedReciterId || 'alafasy';
    const reciter = VERIFIED_RECITERS.find((r) => r.id === effectiveReciterId) || VERIFIED_RECITERS[0];

    const audioUrl = getAyahAudioUrl(reciter.audioServer, surahNumber, ayahNumber);

    // Pre-cache next ayah's audio in background into offline cache so transitions have zero latency and never hang/stall
    const surahMeta = ALL_SURAHS.find((s) => s.number === surahNumber);
    const maxAyahs = surahMeta?.numberOfAyahs || 7;
    if (ayahNumber < maxAyahs && typeof window !== 'undefined' && 'caches' in window) {
      const nextAudioUrl = getAyahAudioUrl(reciter.audioServer, surahNumber, ayahNumber + 1);
      window.caches.open('athar-offline-audio-v2').then((cache) => {
        cache.match(nextAudioUrl).then((cached) => {
          if (!cached) {
            fetch(nextAudioUrl, { mode: 'cors' })
              .then((res) => {
                if (res.ok) cache.put(nextAudioUrl, res);
              })
              .catch(() => {});
          }
        }).catch(() => {});
      }).catch(() => {});
    }

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
      callbacks,
      startTime > 0 ? { startTime } : undefined
    );
  }

  /**
   * Plays Adhan audio with verified high quality studio recordings
   * Supports 'full' Adhan or 'first_two_takbeers' (exact first 2 takbeers per muezzin)
   */
  public async playAdhan(
    voiceId: 'makkah' | 'madinah' | 'alaqsa' | 'alafasy' = 'alafasy',
    options?: {
      mode?: 'full' | 'first_two_takbeers';
      willChainDuaAfterAdhan?: boolean;
      onFinished?: () => void;
      startTime?: number;
    }
  ): Promise<void> {
    const adhanAudioMap: Record<
      string,
      { localUrl: string; cdnUrl: string; title: string; takbeerEndTime: number }
    > = {
      alafasy: {
        localUrl: '/audio/adhan_alafasy.mp3',
        cdnUrl:
          'https://cdn.jsdelivr.net/gh/Kiwifu/adhan-mp3@main/Mishary_Al_Afasy_-_HQ_(%D9%85%D8%B4%D8%A7%D8%B1%D9%8A_%D8%A7%D9%84%D8%B9%D9%81%D8%A7%D8%B3%D9%8A).mp3',
        title: 'أذان بصوت الشيخ مشاري راشد العفاسي',
        takbeerEndTime: 18
      },
      makkah: {
        localUrl: '/audio/adhan_makkah.mp3',
        cdnUrl:
          'https://cdn.jsdelivr.net/gh/Kiwifu/adhan-mp3@main/Ali_Ibn_Ahmad_Mala_1_-_Al_Haram_Al_Maki_(%D8%B9%D9%84%D9%8A_%D8%A8%D9%86_%D8%A3%D8%AD%D9%85%D8%AF_%D9%85%D9%84%D8%A7_-_%D8%A7%D9%84%D8%AD%D8%B1%D9%85_%D8%A7%D9%84%D9%85%D9%83%D9%8A).mp3',
        title: 'أذان الحرم المكي الشريف (الشيخ علي ملا)',
        takbeerEndTime: 21
      },
      madinah: {
        localUrl: '/audio/adhan_madinah.mp3',
        cdnUrl:
          'https://cdn.jsdelivr.net/gh/Kiwifu/adhan-mp3@main/Adhan_Al_Haram_Al_Madani_-_Al_Madinah_1_(%D8%A3%D8%B0%D8%A7%D9%86_%D8%A7%D9%84%D8%AD%D8%B1%D9%85_%D8%A7%D9%84%D9%85%D8%AF%D9%86%D9%8A_-_%D8%A7%D9%84%D9%85%D8%AF%D9%8A%D9%86%D8%A9_%D8%A7%D9%84%D9%85%D9%86%D9%88%D8%B1%D8%A9).mp3',
        title: 'أذان المسجد النبوي الشريف',
        takbeerEndTime: 19
      },
      alaqsa: {
        localUrl: '/audio/adhan_alaqsa.mp3',
        cdnUrl:
          'https://cdn.jsdelivr.net/gh/Kiwifu/adhan-mp3@main/Adhan_Al_Aqsa_-_Jerusalem_(%D8%A3%D8%B0%D8%A7%D9%86_%D8%A7%D9%84%D9%85%D8%B3%D8%AC%D8%AF_%D8%A7%D9%84%D8%A3%D9%82%D8%B5%D9%89_-_%D8%A7%D9%84%D9%82%D8%AF%D8%B3).mp3',
        title: 'أذان المسجد الأقصى المبارك',
        takbeerEndTime: 19
      }
    };

    const target = adhanAudioMap[voiceId] || adhanAudioMap.alafasy;
    const isFirstTwo = options?.mode === 'first_two_takbeers';
    const clipOptions = {
      startTime: options?.startTime !== undefined && options.startTime > 0 ? options.startTime : undefined,
      endTime: isFirstTwo ? target.takbeerEndTime : undefined
    };

    await this.playUrl(
      target.localUrl,
      'adhan',
      {
        title: target.title + (isFirstTwo ? ' (أول تكبيرتين)' : ' (الأذان كاملاً)'),
        subtitle: isFirstTwo ? 'تكبيرتا دخول وقت الصلاة' : 'نداء الصلاة المبارك بجودة عالية'
      },
      {
        onEnded: () => {
          options?.onFinished?.();
        },
        onError: () => {
          this.playUrl(
            target.cdnUrl,
            'adhan',
            {
              title: target.title + (isFirstTwo ? ' (أول تكبيرتين)' : ' (الأذان كاملاً)'),
              subtitle: 'نداء الصلاة المبارك'
            },
            {
              onEnded: () => options?.onFinished?.()
            },
            clipOptions
          );
        }
      },
      clipOptions
    );
  }

  /**
   * Plays Dua after Adhan:
   * "اللهم رب هذه الدعوة التامة والصلاة القائمة آت محمداً الوسيلة والفضيلة وابعثه مقاماً محموداً الذي وعدته"
   */
  public async playDuaAfterAdhan(): Promise<void> {
    await this.playUrl('/audio/dua_after_adhan.mp3', 'dua_adhan', {
      title: 'دعاء ما بعد الأذان',
      subtitle: 'اللهم رب هذه الدعوة التامة والصلاة القائمة · الشيخ مشاري العفاسي'
    });
  }

  /**
   * Plays Iqamah audio:
   * "الله أكبر الله أكبر... قد قامت الصلاة، قد قامت الصلاة"
   */
  public async playIqamah(): Promise<void> {
    await this.playUrl('/audio/iqamah.mp3', 'iqamah', {
      title: 'إقامة الصلاة',
      subtitle: 'قد قامت الصلاة، قد قامت الصلاة - استووا واعتدلوا يرحمكم الله'
    });
  }

  /**
   * Plays Prophet ﷺ reminder audio: Surah Al-Ahzab (33:56)
   */
  public async playSalawatReminder(): Promise<void> {
    await this.playUrl(
      '/audio/salawat.mp3',
      'reminder_salawat',
      {
        title: 'الصلاة على النبي ﷺ',
        subtitle: 'إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ · تلاوة الشيخ مشاري العفاسي'
      },
      {
        onError: () => {
          this.playUrl(
            'https://everyayah.com/data/Alafasy_128kbps/033056.mp3',
            'reminder_salawat',
            {
              title: 'الصلاة على النبي ﷺ',
              subtitle: 'إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ · تلاوة الشيخ مشاري العفاسي'
            }
          );
        }
      }
    );
  }

  /**
   * Plays Daily Wird reminder audio: Surah Al-Muzzammil (73:4)
   * "وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا"
   */
  public async playWirdReminder(): Promise<void> {
    await this.playUrl(
      '/audio/wird.mp3',
      'reminder_wird',
      {
        title: 'تذكير الورد القرآني اليومي',
        subtitle: '﴿وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا﴾ · الشيخ مشاري العفاسي'
      },
      {
        onError: () => {
          this.playUrl(
            'https://everyayah.com/data/Alafasy_128kbps/073004.mp3',
            'reminder_wird',
            {
              title: 'تذكير الورد القرآني اليومي',
              subtitle: '﴿وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا﴾ · الشيخ مشاري العفاسي'
            }
          );
        }
      }
    );
  }

  /**
   * Plays a studio-verified pure Dhikr or Salawat audio reminder with exact trimming
   */
  public async playDhikrReminder(item: {
    title: string;
    arabicText: string;
    audioUrl: string;
    fallbackAudioUrl?: string;
    startTime?: number;
    endTime?: number;
    durationSeconds?: number;
  }): Promise<void> {
    const clipOptions =
      item.startTime !== undefined || item.endTime !== undefined || item.durationSeconds !== undefined
        ? {
            startTime: item.startTime,
            endTime: item.endTime,
            durationHint: item.durationSeconds
          }
        : undefined;

    await this.playUrl(
      item.audioUrl,
      'reminder_dhikr',
      {
        title: item.title,
        subtitle: item.arabicText
      },
      {
        onError: () => {
          if (item.fallbackAudioUrl) {
            this.playUrl(item.fallbackAudioUrl, 'reminder_dhikr', {
              title: item.title,
              subtitle: item.arabicText
            });
          }
        }
      },
      clipOptions
    );
  }

  public getNotificationQueueLength(): number {
    return this.notificationQueue.length;
  }

  public getNotificationQueue(): QueuedAudioNotification[] {
    return [...this.notificationQueue];
  }

  public clearNotificationQueue(): void {
    this.notificationQueue = [];
    this.isProcessingNotificationQueue = false;
    this.notifyListeners();
  }

  public enqueuePriorityNotification(priority: number, name: string, action: () => Promise<void>): void {
    this.enqueueNotificationAudio({
      id: Math.random().toString(36).substring(2, 9),
      name,
      priority,
      action
    });
  }

  /**
   * Enqueues a notification audio in a sequential queue ("دور التنبيهات المنظم").
   * If another temporary audio (Adhan, Dhikr, Birr Al-Walidayn, Wird, etc.) is currently playing,
   * this notification waits its turn in the queue and starts smoothly as soon as the active one finishes!
   */
  public enqueueNotificationAudio(task: QueuedAudioNotification): void {
    // If not currently playing temporary audio and not currently processing queue, execute immediately!
    if (!this.isTemporaryAudioCurrentlyActive() && !this.isProcessingNotificationQueue) {
      task.action().catch((err) => {
        console.warn('Notification audio execution error:', err);
      });
      return;
    }

    // Avoid duplicate tasks in queue
    if (this.notificationQueue.some((t) => t.id === task.id)) {
      return;
    }

    // Insert sorted by priority (higher priority first), or FIFO for equal priority
    const insertIdx = this.notificationQueue.findIndex((t) => t.priority < task.priority);
    if (insertIdx === -1) {
      this.notificationQueue.push(task);
    } else {
      this.notificationQueue.splice(insertIdx, 0, task);
    }
    this.notifyListeners();
  }

  public async processNextQueuedNotification(): Promise<boolean> {
    if (this.isProcessingNotificationQueue) return false;
    if (this.notificationQueue.length === 0) return false;

    const nextTask = this.notificationQueue.shift()!;
    this.isProcessingNotificationQueue = true;
    this.notifyListeners();

    try {
      // 700ms respectful silence between queued sounds for calm acoustic transition
      await new Promise((resolve) => setTimeout(resolve, 700));
      await nextTask.action();
      if (nextTask.onComplete) {
        nextTask.onComplete();
      }
    } catch (err) {
      console.warn('Queued notification error:', err);
      this.isProcessingNotificationQueue = false;
      this.handleTrackCompletion(true);
      return true;
    } finally {
      this.isProcessingNotificationQueue = false;
    }
    return true;
  }

  private handleTrackCompletion(isTemporary: boolean): void {
    if (isTemporary) {
      this.notifyTemporaryAudioFinished();
      // Check if another reminder is waiting its turn ("في دور")!
      if (this.notificationQueue.length > 0) {
        this.processNextQueuedNotification();
        return;
      }

      // Resume interrupted Quran or Adhkar if any (unless a chained temporary track like Dua after Adhan just started!)
      if (
        this.interruptedTrack &&
        (this.interruptedTrack.category === 'quran' || this.interruptedTrack.category === 'adhkar')
      ) {
        this.resumeInterruptedTrackNow();
      } else {
        this.currentState = null;
        this.currentCategory = null;
        this.notifyListeners();
      }
    } else if (this.continuousQuranRecitation && this.currentCategory === 'quran') {
      this.advanceContinuousQuranRecitation();
    }
  }

  /**
   * Plays Birr Al-Walidayn audio reminder: Surah Al-Isra (17:24)
   * "وَاخْفِضْ لَهُمَا جَنَاحَ الذُّلِّ مِنَ الرَّحْمَةِ وَقُل رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا"
   */
  public async playParentsReminder(): Promise<void> {
    const audioUrl = getAyahAudioUrl('https://everyayah.com/data/Alafasy_128kbps', 17, 24);
    await this.playUrl(
      audioUrl,
      'reminder_parents',
      {
        title: 'تذكير بر الوالدين والإحسان إليهما',
        subtitle: '﴿رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا﴾ · تلاوة الشيخ مشاري العفاسي',
        surahNumber: 17,
        ayahNumber: 24,
        reciterName: 'الشيخ مشاري راشد العفاسي',
        durationSeconds: 15
      },
      {
        onError: () => {
          this.playUrl(
            'https://everyayah.com/data/Alafasy_128kbps/017023.mp3',
            'reminder_parents',
            {
              title: 'تذكير بر الوالدين والإحسان إليهما',
              subtitle: '﴿وَقَضَىٰ رَبُّكَ أَلَّا تَعْبُدُوا إِلَّا إِيَّاهُ وَبِالْوَالِدَيْنِ إِحْسَانًا﴾ · تلاوة الشيخ مشاري العفاسي',
              surahNumber: 17,
              ayahNumber: 23,
              reciterName: 'الشيخ مشاري راشد العفاسي'
            }
          );
        }
      }
    );
  }

  /**
   * Smart Sleep Timer with Smooth 30-Second Audio Volume Fade-Out:
   * - `minutes > 0`: Countdown timer (e.g., 15, 30, 45, 60 min) that gently fades volume over the final 30s before stopping.
   * - `minutes === -1`: Stop automatically at the end of the current Surah.
   * - `minutes === null` or `0`: Cancel sleep timer and restore volume to 100%.
   */
  public setSleepTimer(minutes: number | null): void {
    if (this.sleepTimerIntervalId !== null) {
      window.clearInterval(this.sleepTimerIntervalId);
      this.sleepTimerIntervalId = null;
    }

    if (minutes === null || minutes === 0) {
      this.sleepTimerRemainingSeconds = null;
      this.stopAtEndOfSurah = false;
      this.audioElement.volume = 1.0;
      this.notifyListeners();
      return;
    }

    if (minutes === -1) {
      this.sleepTimerRemainingSeconds = null;
      this.stopAtEndOfSurah = true;
      this.audioElement.volume = 1.0;
      this.notifyListeners();
      return;
    }

    this.stopAtEndOfSurah = false;
    this.sleepTimerRemainingSeconds = Math.max(1, Math.round(minutes * 60));
    this.audioElement.volume = 1.0;
    this.notifyListeners();

    this.sleepTimerIntervalId = window.setInterval(() => {
      if (this.sleepTimerRemainingSeconds === null) {
        if (this.sleepTimerIntervalId !== null) {
          window.clearInterval(this.sleepTimerIntervalId);
          this.sleepTimerIntervalId = null;
        }
        return;
      }

      if (this.sleepTimerRemainingSeconds <= 1) {
        if (this.sleepTimerIntervalId !== null) {
          window.clearInterval(this.sleepTimerIntervalId);
          this.sleepTimerIntervalId = null;
        }
        this.sleepTimerRemainingSeconds = null;
        this.stopAtEndOfSurah = false;
        this.pause();
        this.audioElement.volume = 1.0;
        this.notifyListeners();
        return;
      }

      this.sleepTimerRemainingSeconds -= 1;

      // Smooth 30-second gradual volume fade-out before sleep timer stops
      if (this.sleepTimerRemainingSeconds <= 30) {
        const fadedVolume = Math.max(0.05, Number((this.sleepTimerRemainingSeconds / 30).toFixed(2)));
        this.audioElement.volume = fadedVolume;
      } else if (this.audioElement.volume < 1.0) {
        this.audioElement.volume = 1.0;
      }

      this.notifyListeners();
    }, 1000);
  }

  public getSleepTimerState(): { remainingSeconds: number | null; stopAtEndOfSurah: boolean } {
    return {
      remainingSeconds: this.sleepTimerRemainingSeconds,
      stopAtEndOfSurah: this.stopAtEndOfSurah
    };
  }

  /**
   * Sets how many times each Ayah should repeat during continuous recitation for memorization (Hifz):
   * 1 = No repeat (default), 3 = 3 times, 5 = 5 times, 10 = 10 times, 0 = Infinite loop on current Ayah
   */
  public setAyahRepeatTarget(target: number): void {
    this.ayahRepeatTarget = target;
    this.ayahRepeatCurrent = 1;
    this.notifyListeners();
  }

  public cycleAyahRepeatTarget(): number {
    const order = [1, 3, 5, 10, 0];
    const idx = order.indexOf(this.ayahRepeatTarget);
    const next = order[(idx + 1) % order.length];
    this.setAyahRepeatTarget(next);
    return next;
  }

  public getAyahRepeatState(): { target: number; current: number } {
    return {
      target: this.ayahRepeatTarget,
      current: this.ayahRepeatCurrent
    };
  }

  /**
   * Continuous Quran Playback Engine:
   * Recites ayah by ayah smoothly across all views and background, supporting Ayah Repeat (Hifz) & End-of-Surah Sleep Timer
   */
  public async playQuranContinuous(
    surahNumber: number,
    ayahNumber: number,
    reciterId?: string,
    isRepeatingSameAyah: boolean = false,
    startTime: number = 0
  ): Promise<void> {
    const settings = StorageService.getSettings();
    const effectiveReciterId = reciterId || settings.selectedReciterId || 'alafasy';
    const surahMeta = ALL_SURAHS.find((s) => s.number === surahNumber) || ALL_SURAHS[0];

    if (!isRepeatingSameAyah) {
      this.ayahRepeatCurrent = 1;
    }

    this.continuousQuranRecitation = {
      surahNumber,
      ayahNumber,
      reciterId: effectiveReciterId,
      surahName: surahMeta.name
    };

    StorageService.saveLastAudioPosition({
      surahNumber,
      surahName: surahMeta.name,
      ayahNumber,
      reciterId: effectiveReciterId,
      reciterName: (VERIFIED_RECITERS.find((r) => r.id === effectiveReciterId) || VERIFIED_RECITERS[0]).nameArabic,
      currentTime: startTime || 0,
      timestamp: Date.now()
    });

    await this.playQuranAyah(
      surahNumber,
      ayahNumber,
      surahMeta.name,
      effectiveReciterId,
      {
        onEnded: () => this.advanceContinuousQuranRecitation(false),
        onPrevious: () => this.playPreviousContinuousAyah(),
        onNext: () => this.advanceContinuousQuranRecitation(true)
      },
      startTime
    );
  }

  private advanceContinuousQuranRecitation(forceNextAyah: boolean = false): void {
    if (!this.continuousQuranRecitation) return;
    const { surahNumber, ayahNumber, reciterId } = this.continuousQuranRecitation;
    StorageService.recordAyahRead(surahNumber, 1);

    // Check if Ayah Repeat for Memorization (Hifz) is active and user didn't manually press Next
    if (!forceNextAyah && (this.ayahRepeatTarget === 0 || this.ayahRepeatCurrent < this.ayahRepeatTarget)) {
      this.ayahRepeatCurrent += 1;
      this.playQuranContinuous(surahNumber, ayahNumber, reciterId, true).catch(() => {});
      return;
    }

    this.ayahRepeatCurrent = 1;
    const surahMeta = ALL_SURAHS.find((s) => s.number === surahNumber);
    const maxAyahs = surahMeta?.numberOfAyahs || 7;

    if (ayahNumber < maxAyahs) {
      this.playQuranContinuous(surahNumber, ayahNumber + 1, reciterId).catch(() => {
        this.scheduleSafeTimeout(() => {
          if (this.continuousQuranRecitation) {
            this.playQuranContinuous(surahNumber, Math.min(maxAyahs, ayahNumber + 2), reciterId);
          }
        }, 1000);
      });
    } else if (this.stopAtEndOfSurah) {
      // Sleep timer configured to stop at the end of the current Surah!
      this.stopAtEndOfSurah = false;
      this.pause();
      this.notifyListeners();
    } else if (surahNumber < 114) {
      this.playQuranContinuous(surahNumber + 1, 1, reciterId).catch(() => {
        this.scheduleSafeTimeout(() => {
          if (this.continuousQuranRecitation) {
            this.playQuranContinuous(surahNumber + 1, 1, reciterId);
          }
        }, 1000);
      });
    } else {
      this.continuousQuranRecitation = null;
    }
  }

  private playPreviousContinuousAyah(): void {
    if (!this.continuousQuranRecitation) return;
    const { surahNumber, ayahNumber, reciterId } = this.continuousQuranRecitation;

    if (ayahNumber > 1) {
      this.playQuranContinuous(surahNumber, ayahNumber - 1, reciterId);
    } else if (surahNumber > 1) {
      const prevMeta = ALL_SURAHS.find((s) => s.number === surahNumber - 1);
      if (prevMeta) {
        this.playQuranContinuous(surahNumber - 1, prevMeta.numberOfAyahs, reciterId);
      }
    }
  }

  public getContinuousQuranState() {
    return this.continuousQuranRecitation;
  }

  /**
   * Plays or resumes Morning/Evening Adhkar directly through the GlobalMiniPlayer
   * without opening the fullscreen AdhkarPlayerSheet modal.
   */
  public async playAdhkarContinuous(
    category: 'morning' | 'evening',
    startIndex: number = 0,
    startRepetition: number = 1,
    mode: 'repeated' | 'continuous' = 'repeated'
  ): Promise<void> {
    const { MORNING_ADHKAR, EVENING_ADHKAR, MORNING_FULL_AUDIO_URL, EVENING_FULL_AUDIO_URL } = await import('../data/adhkarData');
    const adhkarList = category === 'morning' ? MORNING_ADHKAR : EVENING_ADHKAR;
    const categoryTitle = category === 'morning' ? 'أذكار الصباح' : 'أذكار المساء';

    if (mode === 'continuous') {
      const fullUrl = category === 'morning' ? MORNING_FULL_AUDIO_URL : EVENING_FULL_AUDIO_URL;
      const firstItem = adhkarList[startIndex] || adhkarList[0];
      if (firstItem) {
        StorageService.saveLastAdhkarAudio({
          category,
          dhikrId: firstItem.id,
          dhikrIndex: startIndex,
          currentRepetition: 1,
          targetRepetition: firstItem.count,
          playMode: 'continuous',
          timestamp: Date.now()
        });
      }
      await this.playUrl(
        fullUrl,
        'adhkar',
        {
          title: `${categoryTitle} كاملة`,
          subtitle: 'تلاوة متواصلة مباركة · الشيخ مشاري راشد العفاسي',
          dhikrId: 9999,
          totalAdhkar: adhkarList.length
        },
        {
          onEnded: () => {
            StorageService.recordSessionCompleted(category);
            this.stop();
          }
        }
      );
      return;
    }

    if (startIndex >= adhkarList.length) {
      StorageService.recordSessionCompleted(category);
      this.stop();
      return;
    }

    const item = adhkarList[startIndex] || adhkarList[0];
    if (!item || !item.audioUrl) return;

    const safeRep = Math.min(Math.max(1, startRepetition), item.count);

    StorageService.saveLastAdhkarAudio({
      category,
      dhikrId: item.id,
      dhikrIndex: startIndex,
      currentRepetition: safeRep,
      targetRepetition: item.count,
      playMode: 'repeated',
      timestamp: Date.now()
    });

    StorageService.saveLastAdhkarRead({
      category,
      dhikrId: item.id,
      dhikrIndex: startIndex,
      currentCount: safeRep,
      targetCount: item.count,
      timestamp: Date.now()
    });

    let hasHandledTrackFinish = false;

    await this.playUrl(
      item.audioUrl,
      'adhkar',
      {
        title: categoryTitle,
        subtitle: `الذكر ${startIndex + 1} من ${adhkarList.length} (تكرار ${safeRep}/${item.count})`,
        dhikrId: item.id,
        currentRepetition: safeRep,
        targetRepetition: item.count,
        dhikrIndex: startIndex + 1,
        totalAdhkar: adhkarList.length
      },
      {
        onEnded: () => {
          if (hasHandledTrackFinish) return;
          hasHandledTrackFinish = true;

          StorageService.setDhikrCount(category, item.id, safeRep);
          StorageService.recordDhikrStep(category, item.id, item.count);

          if (safeRep < item.count) {
            const nextRep = safeRep + 1;
            StorageService.saveLastAdhkarAudio({
              category,
              dhikrId: item.id,
              dhikrIndex: startIndex,
              currentRepetition: nextRep,
              targetRepetition: item.count,
              playMode: 'repeated',
              timestamp: Date.now()
            });
            this.scheduleSafeTimeout(() => {
              this.playAdhkarContinuous(category, startIndex, nextRep, 'repeated');
            }, 650);
          } else {
            StorageService.setDhikrCount(category, item.id, item.count);
            if (startIndex + 1 < adhkarList.length) {
              const nextItem = adhkarList[startIndex + 1];
              if (nextItem) {
                StorageService.saveLastAdhkarAudio({
                  category,
                  dhikrId: nextItem.id,
                  dhikrIndex: startIndex + 1,
                  currentRepetition: 1,
                  targetRepetition: nextItem.count,
                  playMode: 'repeated',
                  timestamp: Date.now()
                });
              }
              this.scheduleSafeTimeout(() => {
                this.playAdhkarContinuous(category, startIndex + 1, 1, 'repeated');
              }, 750);
            } else {
              // Session completed: reset saved resume position to start of category
              const firstItem = adhkarList[0];
              if (firstItem) {
                StorageService.saveLastAdhkarAudio({
                  category,
                  dhikrId: firstItem.id,
                  dhikrIndex: 0,
                  currentRepetition: 1,
                  targetRepetition: firstItem.count,
                  playMode: 'repeated',
                  timestamp: Date.now()
                });
              }
              StorageService.recordSessionCompleted(category);
              this.stop();
            }
          }
        },
        onPrevious: () => {
          hasHandledTrackFinish = true;
          if (startIndex > 0) {
            this.playAdhkarContinuous(category, startIndex - 1, 1, 'repeated');
          } else {
            this.playAdhkarContinuous(category, 0, 1, 'repeated');
          }
        },
        onNext: () => {
          hasHandledTrackFinish = true;
          if (startIndex + 1 < adhkarList.length) {
            this.playAdhkarContinuous(category, startIndex + 1, 1, 'repeated');
          } else {
            this.stop();
          }
        }
      },
      {
        startTime: item.startTime,
        endTime: item.endTime
      }
    );
  }
}

export const AudioService = new CentralAudioService();

