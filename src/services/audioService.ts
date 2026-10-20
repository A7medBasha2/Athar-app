import { ALL_SURAHS, VERIFIED_RECITERS, getAyahAudioUrl, getFullSurahAudioUrl } from '../data/surahsData';
import { MORNING_ADHKAR, EVENING_ADHKAR, MORNING_FULL_AUDIO_URL, EVENING_FULL_AUDIO_URL } from '../data/adhkarData';
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
  nestedInterruptedTrack?: InterruptedPlayback | null;
  timestamp?: number;
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
  private isTerminated: boolean = false;
  private isAppClosing: boolean = false;

  // Audio Focus & Phone Call / External Interruption tracking
  private isUserPaused: boolean = false;
  private isInternalTransition: boolean = false;
  private wasInterruptedByExternalCall: boolean = false;
  private externalInterruptedSnapshot: InterruptedPlayback | null = null;
  private callRecoveryIntervalId: number | null = null;
  private callInterruptionTimestamp: number = 0;

  // Smart Sleep Timer & Gradual Audio Fade-Out
  private sleepTimerRemainingSeconds: number | null = null;
  private sleepTimerTargetTimestamp: number | null = null;
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
  private activeRawCallbacks: any = null;

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
   * Handles OS-level interruptions such as incoming phone calls, phone ringtones, alarms,
   * or another app temporarily taking audio focus. Automatically saves whatever was playing
   * (Adhan, Quran, Adhkar, or audio notifications) and resumes playing from the exact second
   * as soon as the phone call or ringing ends!
   */
  private setupSystemAudioFocusListeners() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // Call Resume Bug Fix: After a phone call finishes, do NOT automatically resume audio!
    // The player must remain strictly paused until the user explicitly hits Play/Resume.
    const onAppOrAudioRegained = () => {
      // Intentionally do not auto-resume; keep player paused at exact timestamp
    };

    // 1. Document visibility change (when phone call ends and user returns to app)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        onAppOrAudioRegained();
      } else if (this.currentState?.isPlaying && !this.audioElement.paused && !this.isUserPaused) {
        // App backgrounded while playing (e.g. incoming call popup)
        this.callInterruptionTimestamp = Date.now();
      }
    });

    // 2. Window focus regained
    window.addEventListener('focus', onAppOrAudioRegained);

    // 3. Page show (returning from call screen or lockscreen)
    window.addEventListener('pageshow', onAppOrAudioRegained);

    // 4. Capacitor / Android / Cordova native resume event
    document.addEventListener('resume' as any, onAppOrAudioRegained);

    // 5. AudioContext hardware focus restoration
    if (this.audioContext) {
      try {
        this.audioContext.onstatechange = () => {
          if (this.audioContext?.state === 'running' && this.wasInterruptedByExternalCall && !this.isUserPaused) {
            onAppOrAudioRegained();
          }
        };
      } catch {}
    }

    // 6. User interaction on screen return
    const onUserInteraction = () => {
      // Do not auto-resume on touch/click after call
    };
    window.addEventListener('pointerdown', onUserInteraction, { passive: true });
    window.addEventListener('touchstart', onUserInteraction, { passive: true });
  }

  /**
   * Handles incoming call or external OS audio focus loss:
   * captures exact state and position of whatever was playing (Adhan, Quran, Adhkar, Dua, or Notification)
   */
  public handleExternalCallInterruption(): void {
    if (this.isUserPaused) return;

    const currentPos = this.audioElement.currentTime || this.currentState?.currentTime || 0;
    this.wasInterruptedByExternalCall = true;
    this.callInterruptionTimestamp = Date.now();

    // Preserve the complete state of WHATEVER was playing:
    // Adhan, Quran, Adhkar, Dua, Iqamah, or spiritual reminder audio!
    this.externalInterruptedSnapshot = {
      url: this.currentPlayingUrl || this.audioElement.src,
      category: this.currentCategory || this.currentState?.category || 'quran',
      metadata: this.currentState ? { ...this.currentState, isPlaying: true } : null,
      callbacks: this.activeRawCallbacks ? { ...this.activeRawCallbacks } : {
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
      currentTime: currentPos,
      continuousQuranRecitation: this.continuousQuranRecitation ? { ...this.continuousQuranRecitation } : null,
      nestedInterruptedTrack: this.interruptedTrack ? { ...this.interruptedTrack } : null,
      timestamp: Date.now()
    };

    this.isUserPaused = true;

    if (this.currentState) {
      this.currentState.isPlaying = false;
      this.notifyListeners();
      this.updateMediaSessionPlaybackState('paused');
    }
  }

  private startCallRecoveryWatcher(): void {
    this.stopCallRecoveryWatcher();
    if (typeof window === 'undefined') return;

    // Checks periodically if the phone call ended and audio can be resumed
    this.callRecoveryIntervalId = window.setInterval(() => {
      if (!this.wasInterruptedByExternalCall || this.isUserPaused) {
        this.stopCallRecoveryWatcher();
        return;
      }

      // Stop watcher after 20 minutes to save resources if call was long or user left
      if (Date.now() - this.callInterruptionTimestamp > 20 * 60 * 1000) {
        this.stopCallRecoveryWatcher();
        this.wasInterruptedByExternalCall = false;
        this.externalInterruptedSnapshot = null;
        return;
      }

      // If document returned to visible or app is focused, attempt auto-resume
      if (document.visibilityState === 'visible') {
        this.tryAutoResumeAfterCall();
      }
    }, 1200);
  }

  private stopCallRecoveryWatcher(): void {
    if (this.callRecoveryIntervalId !== null) {
      window.clearInterval(this.callRecoveryIntervalId);
      this.callRecoveryIntervalId = null;
    }
  }

  /**
   * Automatically resumes playback from the exact position where it was paused when the phone call ends!
   */
  public tryAutoResumeAfterCall(): void {
    if (this.isUserPaused) return;
    if (!this.wasInterruptedByExternalCall || !this.externalInterruptedSnapshot) return;

    const settings = StorageService.getSettings();
    if (settings.autoResumeOnInterruption === false) {
      this.wasInterruptedByExternalCall = false;
      this.externalInterruptedSnapshot = null;
      this.stopCallRecoveryWatcher();
      return;
    }

    const toResume = this.externalInterruptedSnapshot;
    this.wasInterruptedByExternalCall = false;
    this.externalInterruptedSnapshot = null;
    this.stopCallRecoveryWatcher();

    this.unlockAudio();

    // 1. Restore any nested primary track if a temporary notification had interrupted it
    if (toResume.nestedInterruptedTrack) {
      this.interruptedTrack = toResume.nestedInterruptedTrack;
    }

    // 2. Restore continuous Quran recitation engine
    if (toResume.continuousQuranRecitation) {
      this.continuousQuranRecitation = { ...toResume.continuousQuranRecitation };
    }

    const savedTime = toResume.currentTime || 0;

    // 3. Special handling for Adhan: guarantee live continuation without restarting from 0
    if (toResume.category === 'adhan') {
      this.resumeOrSeekAdhan(savedTime);
      this.showCallResumedNotification('adhan');
      return;
    }

    // 4. Resume Quran, Adhkar, or Notification sounds
    this.playUrl(
      toResume.url,
      toResume.category,
      toResume.metadata || { title: 'أثر', subtitle: 'استئناف التلاوة' },
      toResume.callbacks,
      {
        ...toResume.clipOptions,
        startTime: savedTime,
        endTime: toResume.clipOptions?.endTime
      }
    )
      .then(() => {
        this.showCallResumedNotification(toResume.category);
      })
      .catch((err) => {
        console.warn('Auto resume after call deferred until user interaction:', err);
        // Retain snapshot in case browser requires immediate user touch to resume
        this.wasInterruptedByExternalCall = true;
        this.externalInterruptedSnapshot = toResume;
      });
  }

  public isCallInterrupted(): boolean {
    return this.wasInterruptedByExternalCall;
  }

  public getCallInterruptedTrack(): ActiveAudioState | null {
    if (!this.externalInterruptedSnapshot || !this.externalInterruptedSnapshot.metadata) return null;
    return {
      ...this.externalInterruptedSnapshot.metadata,
      isPlaying: false,
      currentTime: this.externalInterruptedSnapshot.currentTime || 0
    };
  }

  private showCallResumedNotification(category: AudioCategory): void {
    const titles: Record<string, string> = {
      quran: 'تم استئناف تلاوة القرآن الكريم تلقائياً بعد انتهاء المكالمة',
      adhan: 'تم استئناف نداء الأذان المبارك تلقائياً بعد انتهاء المكالمة',
      adhkar: 'تم استئناف الأذكار المباركة تلقائياً بعد انتهاء المكالمة',
      dua_adhan: 'تم استئناف دعاء ما بعد الأذان تلقائياً بعد انتهاء المكالمة',
      iqamah: 'تم استئناف إقامة الصلاة تلقائياً بعد انتهاء المكالمة',
      reminder_verse: 'تم استئناف الآية الكريمة تلقائياً بعد انتهاء المكالمة',
      reminder_dhikr: 'تم استئناف الذكر والتسبيح تلقائياً بعد انتهاء المكالمة',
      reminder_salawat: 'تم استئناف الصلاة على النبي ﷺ تلقائياً بعد انتهاء المكالمة',
      reminder_wird: 'تم استئناف الورد اليومي تلقائياً بعد انتهاء المكالمة',
      reminder_parents: 'تم استئناف تذكير بر الوالدين تلقائياً بعد انتهاء المكالمة',
    };
    const bodyText = titles[category] || 'تم استئناف الصوت تلقائياً بعد انتهاء المكالمة';

    try {
      import('./notificationService').then(({ NotificationService }) => {
        NotificationService.notify({
          title: 'أثر | استئناف تلقائي مبارك',
          body: bodyText,
          type: 'info',
          priority: 1
        });
      }).catch(() => {});
    } catch {}
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
    const onMetadataOrDurationReady = () => {
      if (!this.currentState) return;
      const rawDur = this.audioElement.duration;
      if (rawDur && !isNaN(rawDur) && isFinite(rawDur) && rawDur > 0) {
        const clipDuration = this.currentEndTime ? this.currentEndTime - this.currentStartTime : 0;
        const finalDur = clipDuration > 0 ? clipDuration : rawDur;
        if (Math.abs((this.currentState.duration || 0) - finalDur) > 0.05 || !this.currentState.duration) {
          this.currentState.duration = finalDur;
          this.notifyListeners();
        }
      }
    };

    this.audioElement.addEventListener('loadedmetadata', onMetadataOrDurationReady);
    this.audioElement.addEventListener('durationchange', onMetadataOrDurationReady);
    this.audioElement.addEventListener('loadeddata', onMetadataOrDurationReady);
    this.audioElement.addEventListener('canplay', onMetadataOrDurationReady);

    this.audioElement.addEventListener('play', () => {
      this.wasInterruptedByExternalCall = false;
      if (this.currentState) {
        this.currentState.isPlaying = true;
        onMetadataOrDurationReady();
        this.notifyListeners();
        this.updateMediaSessionPlaybackState('playing');
      }
    });

    this.audioElement.addEventListener('playing', () => {
      this.wasInterruptedByExternalCall = false;
      if (this.currentState) {
        this.currentState.isPlaying = true;
        onMetadataOrDurationReady();
        this.notifyListeners();
        this.updateMediaSessionPlaybackState('playing');
      }
    });

    this.audioElement.addEventListener('pause', () => {
      // 1. If internal transition between ayahs or repetitions, ignore
      if (this.isInternalTransition) {
        return;
      }

      // If app is closing, terminating, or user explicitly paused, do not auto-resume audio
      if (this.isAppClosing || this.isTerminated || this.isUserPaused || !this.currentPlayingUrl) {
        if (this.currentState) {
          this.currentState.isPlaying = false;
          this.notifyListeners();
          this.updateMediaSessionPlaybackState('paused');
        }
        return;
      }

      // 2. Check if track reached or is near its natural end - if so, let ended listener handle it!
      const isNearEnd =
        this.audioElement.ended ||
        (this.audioElement.duration > 0 && this.audioElement.currentTime >= this.audioElement.duration - 0.45) ||
        (this.currentEndTime !== null && this.audioElement.currentTime >= this.currentEndTime - 0.45);

      if (isNearEnd) {
        return;
      }

      // 3. If audio was paused externally by the OS/system (incoming call, phone ringing, or external audio focus loss):
      if (!this.isUserPaused && !this.audioElement.ended && !this.isAppClosing && !this.isTerminated) {
        // If document was simply backgrounded (user switched app or locked screen) while audio was playing,
        // continue playing in background without cutting off!
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden' && this.currentState?.isPlaying && !this.isAppClosing) {
          this.audioElement.play().catch(() => {});
          return;
        }
        this.handleExternalCallInterruption();
        return;
      }

      if (this.currentState) {
        this.currentState.isPlaying = false;
        this.notifyListeners();
        this.updateMediaSessionPlaybackState('paused');
      }
    });

    this.audioElement.addEventListener('timeupdate', () => {
      // Background-safe sleep timer evaluation (runs continuously during audio playback even when phone screen is locked)
      if (this.sleepTimerTargetTimestamp !== null) {
        const now = Date.now();
        const remaining = Math.max(0, Math.round((this.sleepTimerTargetTimestamp - now) / 1000));
        this.sleepTimerRemainingSeconds = remaining;

        // Smooth 30-second gradual volume fade-out
        if (remaining <= 30 && remaining > 0) {
          const fadedVolume = Math.max(0.05, Number((remaining / 30).toFixed(2)));
          this.audioElement.volume = fadedVolume;
        } else if (remaining > 30 && this.audioElement.volume < 1.0) {
          this.audioElement.volume = 1.0;
        }

        if (now >= this.sleepTimerTargetTimestamp || remaining <= 0) {
          this.triggerSleepTimerStop();
          return;
        }
      }

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
        // Guard against premature trigger on first frames if currentTime was near start
        if (this.audioElement.currentTime < (this.currentStartTime || 0) + 0.3) {
          return;
        }
        const sessionBeforeCb = this.currentSessionId;
        this.isInternalTransition = true;
        this.audioElement.pause();
        try {
          this.audioElement.currentTime = this.currentStartTime || 0;
        } catch {}
        this.isInternalTransition = false;
        const endCb = this.onTrackEndedCallback;
        const isTemporary = this.isCategoryTemporary(this.currentCategory);
        this.currentEndTime = null;
        this.onTrackEndedCallback = null;
        if (this.currentState) {
          this.currentState.isPlaying = false;
          this.currentState.currentTime = this.currentStartTime || 0;
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
        const wasZeroDuration = !this.currentState.duration || this.currentState.duration <= 0;

        this.currentState.currentTime = this.audioElement.currentTime;
        const clipDuration = this.currentEndTime ? this.currentEndTime - this.currentStartTime : 0;
        const rawDur = this.audioElement.duration;
        const validDur = rawDur && !isNaN(rawDur) && isFinite(rawDur) && rawDur > 0 ? rawDur : 0;
        this.currentState.duration = clipDuration > 0 ? clipDuration : (this.currentState.duration || validDur);

        // Notify if:
        // 1. Integer second changes
        // 2. Duration just became known (was zero, now > 0)
        if (curSec !== lastSec || (wasZeroDuration && this.currentState.duration > 0)) {
          this.notifyListeners();
          if (this.currentState.category === 'quran' && this.currentState.surahNumber && curSec % 3 === 0 && curSec > 0) {
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
      // 1. Sleep timer: check if configured to stop at the end of the current Surah
      if (this.stopAtEndOfSurah) {
        if (this.continuousQuranRecitation) {
          const { surahNumber, ayahNumber } = this.continuousQuranRecitation;
          const surahMeta = ALL_SURAHS.find((s) => s.number === surahNumber);
          const maxAyahs = surahMeta?.numberOfAyahs || 7;
          if (ayahNumber >= maxAyahs) {
            this.triggerSleepTimerStop();
            return;
          }
        } else if (this.currentCategory === 'quran') {
          // Full surah playback finished! Stop cleanly.
          this.triggerSleepTimerStop();
          return;
        }
      }

      const sessionBeforeCb = this.currentSessionId;
      const isTemporary = this.isCategoryTemporary(this.currentCategory);
      const isContinuousQuran = Boolean(this.continuousQuranRecitation && this.currentCategory === 'quran');
      const isContinuousAdhkar = Boolean(this.currentCategory === 'adhkar' && !this.isUserPaused);

      // For continuous Quran or Adhkar playback between ayahs/repetitions, keep isPlaying true so the player never stutters or disappears
      if (!isContinuousQuran && !isContinuousAdhkar && this.currentState) {
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
      }
      if (this.currentSessionId === sessionBeforeCb) {
        this.handleTrackCompletion(isTemporary);
      }
    });

    this.audioElement.addEventListener('error', (e) => {
      // Ignore errors caused by resetting src or during internal transitions
      if (
        this.isInternalTransition ||
        !this.audioElement.src ||
        this.audioElement.src === window.location.href ||
        this.audioElement.src.endsWith('/')
      ) {
        return;
      }
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
      !this.isCategoryTemporary(this.currentState.category) &&
      (this.currentState.isPlaying || !this.audioElement.paused || this.wasInterruptedByExternalCall) &&
      !this.isUserPaused &&
      !this.interruptedTrack
    ) {
      this.interruptedTrack = {
        url: this.currentPlayingUrl || this.audioElement.src,
        category: this.currentState.category,
        metadata: { ...this.currentState, isPlaying: true },
        callbacks: this.activeRawCallbacks ? { ...this.activeRawCallbacks } : {
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
        continuousQuranRecitation: this.continuousQuranRecitation ? { ...this.continuousQuranRecitation } : null,
        timestamp: Date.now()
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
      this.isAppClosing = false;
      this.isTerminated = false;
      const isTemporary = this.isCategoryTemporary(category);

      // If a temporary alert/adhan/reminder is ALREADY playing, DO NOT CUT IT OFF!
      // Enqueue this sound into the turn queue so the currently active sound finishes completely first!
      if (isTemporary && this.isTemporaryAudioCurrentlyActive() && !this.isProcessingNotificationQueue) {
        // CRITICAL BUG FIX: If an Adhan is already ringing or requested, NEVER queue a duplicate Adhan!
        if (category === 'adhan' || this.currentCategory === 'adhan') {
          console.warn('[AudioService] Dropping duplicate Adhan request while audio/adhan is active');
          return;
        }

        this.enqueueNotificationAudio({
          id: Math.random().toString(36).substring(2, 9),
          name: metadata.title,
          priority: category === 'reminder_parents' ? 5 : 3,
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
        this.wasInterruptedByExternalCall = false;
      }

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      this.isUsingSpeechSynthesis = false;



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
      this.activeRawCallbacks = callbacks ? { ...callbacks } : null;
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

      const targetStart = this.currentStartTime || 0;
      const applyStartTime = () => {
        if (this.currentSessionId === thisSessionId) {
          try {
            if (Math.abs((this.audioElement.currentTime || 0) - targetStart) > 0.05) {
              this.audioElement.currentTime = targetStart;
            }
          } catch {
            // Ignore if media isn't seekable yet
          }
        }
      };

      // Resolve offline Blob URL from IndexedDB / CacheStorage if downloaded locally (instant when online or cached)
      const playableUrl = await OfflineAudioPackService.resolvePlayableAudioUrl(url);
      if (this.currentSessionId !== thisSessionId) return;

      // Smart check: avoid resetting audio element src if already pointing to this exact playable URL
      const currentSrc = this.audioElement.src || '';
      const isSameTrack = Boolean(
        currentSrc &&
        (currentSrc === playableUrl ||
         (playableUrl.startsWith('/') && currentSrc.endsWith(playableUrl)) ||
         (playableUrl.startsWith('http') && currentSrc === playableUrl))
      );

      if (!isSameTrack) {
        this.audioElement.src = playableUrl;
      } else {
        // Replaying or repeating the same audio: ALWAYS reset currentTime to targetStart!
        try {
          this.audioElement.currentTime = targetStart;
        } catch {}
      }

      // Guarantee currentTime is positioned at targetStart before playing
      try {
        if (Math.abs((this.audioElement.currentTime || 0) - targetStart) > 0.05) {
          this.audioElement.currentTime = targetStart;
        }
      } catch {}

      this.notifyListeners();
      if (isTemporary) {
        this.notifyTemporaryAudioStarted();
      }

      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (this.currentSessionId === thisSessionId) {
              applyStartTime();
              if (this.currentState) {
                this.currentState.isPlaying = true;
                this.notifyListeners();
              }
            }
          })
          .catch((err: any) => {
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
            if (this.currentState) {
              this.currentState.isPlaying = false;
              this.notifyListeners();
            }
            if (callbacks?.onError) {
              try {
                callbacks.onError(err);
              } catch {}
            }
          });
      }
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
    this.wasInterruptedByExternalCall = false;
    this.stopCallRecoveryWatcher();
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
    this.wasInterruptedByExternalCall = false;
    this.stopCallRecoveryWatcher();
    this.unlockAudio();
    if (this.isUsingSpeechSynthesis && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    } else {
      const hasValidSrc = Boolean(
        this.audioElement.src &&
        !this.audioElement.src.endsWith('/') &&
        this.audioElement.src !== window.location.href
      );
      if (!hasValidSrc && this.currentPlayingUrl && this.currentState) {
        this.playUrl(
          this.currentPlayingUrl,
          this.currentState.category || this.currentCategory || 'quran',
          this.currentState,
          this.activeRawCallbacks,
          { startTime: this.currentState.currentTime || 0 }
        );
        return;
      }
      if (this.audioElement.paused) {
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
   * Mutes or unmutes any currently playing audio IN-PLACE without pausing or resetting currentTime.
   * Keeps the track (dhikr, ayah, wird, dua) playing smoothly in real-time in the background!
   */
  public setMuted(muted: boolean): void {
    try {
      this.audioElement.muted = muted;
      this.audioElement.volume = muted ? 0 : 1.0;
      if (!muted) {
        this.unlockAudio();
        if (this.audioElement.paused && this.currentState && !this.audioElement.ended) {
          this.audioElement.play().catch(() => {});
        }
      }
      this.notifyListeners();
    } catch {}
  }

  public isMuted(): boolean {
    return Boolean(this.audioElement.muted || this.audioElement.volume === 0);
  }

  public toggleMute(): boolean {
    const next = !this.isMuted();
    this.setMuted(next);
    return next;
  }

  /**
   * Synchronizes active Adhan audio with real-world elapsed time upon un-muting or restarting.
   * Jumps directly to current live second without restarting from 0 or resuming from a stale pause.
   */
  public syncAdhanToElapsed(realWorldElapsedSeconds: number): void {
    if (this.currentCategory === 'adhan' && this.audioElement) {
      const dur = this.audioElement.duration || this.currentState?.duration || 0;
      if (dur > 0 && realWorldElapsedSeconds >= dur) {
        this.stopAdhan();
        return;
      }
      if (Math.abs((this.audioElement.currentTime || 0) - realWorldElapsedSeconds) > 0.5) {
        try {
          this.audioElement.currentTime = realWorldElapsedSeconds;
        } catch {}
      }
      this.audioElement.muted = false;
      this.audioElement.volume = 1.0;
      this.unlockAudio();
      if (this.audioElement.paused && !this.audioElement.ended) {
        this.audioElement.play().catch(() => {});
      }
      if (this.currentState) {
        this.currentState.isPlaying = true;
        this.currentState.currentTime = realWorldElapsedSeconds;
        this.notifyListeners();
      }
    }
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

  /**
   * Immediately and permanently terminates Adhan audio playback.
   * Clears any active Adhan state, resets position to 0, prevents auto-resuming
   * in the Global Mini Player or background queue, and guarantees silence.
   */
  /**
   * Called during beforeunload, pagehide, or app crash to immediately halt
   * and flush all audio output so sounds never linger after window closes.
   */
  public markAppClosing(): void {
    this.isAppClosing = true;
    this.isTerminated = true;
    this.isUserPaused = true;
    this.stop(true);
  }

  /**
   * Immediately and permanently terminates Adhan audio playback.
   * Clears any active Adhan state, resets position to 0, prevents auto-resuming
   * in the Global Mini Player or background queue, and guarantees silence.
   */
  public stopAdhan(): void {
    this.audioElement.muted = false;
    this.audioElement.volume = 1.0;
    this.currentSessionId++;
    this.clearAllActiveTimers();
    // Drop any queued adhan tasks
    this.notificationQueue = this.notificationQueue.filter(
      (t) => !t.id.includes('adhan') && !t.name.includes('أذان') && t.name !== 'adhan'
    );
    this.clearNotificationQueue();
    this.interruptedTrack = null;
    this.externalInterruptedSnapshot = null;
    this.stopCallRecoveryWatcher();
    this.isUserPaused = true;
    this.isInternalTransition = true;
    try {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.audioElement.removeAttribute('src');
      this.audioElement.load();
    } catch {}
    this.isInternalTransition = false;
    this.onTrackEndedCallback = null;
    this.onTrackErrorCallback = null;
    this.currentPlayingUrl = null;
    this.currentCategory = null;
    this.currentState = null;
    this.notifyTemporaryAudioFinished();
    this.notifyListeners();
    this.updateMediaSessionPlaybackState('none');

    // Also cancel and dismiss native Android overlay or full screen intent
    try {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
        (window as any).Capacitor?.Plugins?.NativePermissions?.stopFullScreenAthan?.();
      }
      if (typeof window !== 'undefined' && (window as any).AtharNative?.stopAthan) {
        (window as any).AtharNative.stopAthan();
      }
    } catch {}
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
    this.wasInterruptedByExternalCall = false;
    this.stopCallRecoveryWatcher();
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
        if (toResume.category === 'adhan') {
          this.resumeOrSeekAdhan(toResume.currentTime || 0);
          return;
        }
        this.playUrl(toResume.url, toResume.category, toResume.metadata, toResume.callbacks, {
          ...toResume.clipOptions,
          startTime: toResume.currentTime,
          endTime: toResume.clipOptions?.endTime || undefined
        });
      }
    }, 250);
  }

  /**
   * Pauses active audio respectfully for an external Islamic Alarm ringing
   */
  public pauseForExternalAlarm(): void {
    if (this.currentState?.isPlaying && !this.audioElement.paused) {
      this.isInternalTransition = true;
      try {
        this.audioElement.pause();
      } catch {}
      this.isInternalTransition = false;
      if (this.currentState) {
        this.currentState.isPlaying = false;
        this.notifyListeners();
        this.updateMediaSessionPlaybackState('paused');
      }
    }
  }

  /**
   * Automatically resumes interrupted audio from the exact second after the Islamic Alarm stops
   */
  public resumeAfterExternalAlarm(): void {
    if (this.interruptedTrack && !this.isUserPaused) {
      this.resumeInterruptedTrackNow();
    }
  }

  public hasInterruptedTrack(): boolean {
    return Boolean(this.interruptedTrack && !this.isUserPaused);
  }

  public stop(hardReset: boolean = false): void {
    this.currentSessionId++;
    this.isUserPaused = true;
    this.wasInterruptedByExternalCall = false;
    this.externalInterruptedSnapshot = null;
    this.stopCallRecoveryWatcher();
    this.clearAllActiveTimers();
    this.continuousQuranRecitation = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.isUsingSpeechSynthesis = false;
    this.currentStartTime = 0;
    this.currentEndTime = null;
    this.interruptedTrack = null;
    this.currentPlayingUrl = null;
    this.clearNotificationQueue();
    this.audioElement.onloadedmetadata = null;
    this.isInternalTransition = true;
    try {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.audioElement.src = '';
    } catch {}
    this.isInternalTransition = false;
    this.currentState = null;
    this.currentCategory = null;
    this.onTrackEndedCallback = null;
    this.onTrackErrorCallback = null;
    this.onPreviousTrackCallback = null;
    this.onNextTrackCallback = null;
    this.updateMediaSessionPlaybackState('none');
    this.notifyListeners();

    // Also cancel and dismiss native Android overlay or full screen intent
    try {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
        (window as any).Capacitor?.Plugins?.NativePermissions?.stopFullScreenAthan?.();
      }
      if (typeof window !== 'undefined' && (window as any).AtharNative?.stopAthan) {
        (window as any).AtharNative.stopAthan();
      }
    } catch {}
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
    const rawDur = this.audioElement?.duration;
    if (rawDur && !isNaN(rawDur) && isFinite(rawDur) && rawDur > 0) {
      if (this.currentEndTime && this.currentStartTime >= 0) {
        return Math.max(0, this.currentEndTime - this.currentStartTime);
      }
      return rawDur;
    }
    return this.currentState?.duration && !isNaN(this.currentState.duration) && isFinite(this.currentState.duration)
      ? this.currentState.duration
      : 0;
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
   * Returns relative audio URL for adhan based on voice selection and Fajr
   */
  public getAdhanAudioUrl(
    voiceId: 'makkah' | 'madinah' | 'alaqsa' | 'alafasy' = 'alafasy',
    isFajr: boolean = false
  ): string {
    const isFajrEffective = Boolean(isFajr);
    const audioMap: Record<string, string> = {
      alafasy: isFajrEffective ? '/audio/adhan_fajr_alafasy.mp3' : '/audio/adhan_alafasy.mp3',
      makkah: '/audio/adhan_makkah.mp3',
      madinah: '/audio/adhan_madinah.mp3',
      alaqsa: '/audio/adhan_alaqsa.mp3',
    };
    return audioMap[voiceId] || audioMap.alafasy;
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
      isFajr?: boolean;
    }
  ): Promise<void> {
    this.isAppClosing = false;
    this.isTerminated = false;
    if (this.currentCategory === 'adhan' && this.currentState?.isPlaying) {
      console.warn('[AudioService] Adhan is already playing, ignoring duplicate invocation');
      return;
    }

    const isFajr = Boolean(options?.isFajr);

    const adhanAudioMap: Record<
      string,
      { localUrl: string; cdnUrl: string; title: string; takbeerEndTime: number }
    > = {
      alafasy: {
        localUrl: isFajr ? '/audio/adhan_fajr_alafasy.mp3' : '/audio/adhan_alafasy.mp3',
        cdnUrl: isFajr
          ? 'https://cdn.jsdelivr.net/gh/Kiwifu/adhan-mp3@main/Mishary_Al_Afasy_-_HQ_(%D9%85%D8%B4%D8%A7%D8%B1%D9%8A_%D8%A7%D9%84%D8%B9%D9%81%D8%A7%D8%B3%D9%8A).mp3'
          : 'https://cdn.jsdelivr.net/gh/Kiwifu/adhan-mp3@main/Mishary_Al_Afasy_-_HQ_(%D9%85%D8%B4%D8%A7%D8%B1%D9%8A_%D8%A7%D9%84%D8%B9%D9%81%D8%A7%D8%B3%D9%8A).mp3',
        title: isFajr ? 'أذان الفجر بصوت الشيخ مشاري العفاسي' : 'أذان بصوت الشيخ مشاري راشد العفاسي',
        takbeerEndTime: isFajr ? 18.4 : 23.0
      },
      makkah: {
        localUrl: '/audio/adhan_makkah.mp3',
        cdnUrl:
          'https://cdn.jsdelivr.net/gh/Kiwifu/adhan-mp3@main/Ali_Ibn_Ahmad_Mala_1_-_Al_Haram_Al_Maki_(%D8%B9%D9%84%D9%8A_%D8%A8%D9%86_%D8%A3%D8%AD%D9%85%D8%AF_%D9%85%D9%84%D8%A7_-_%D8%A7%D9%84%D8%AD%D8%B1%D9%85_%D8%A7%D9%84%D9%85%D9%83%D9%8A).mp3',
        title: 'أذان الحرم المكي الشريف (الشيخ علي ملا)',
        takbeerEndTime: 21.3
      },
      madinah: {
        localUrl: '/audio/adhan_madinah.mp3',
        cdnUrl:
          'https://cdn.jsdelivr.net/gh/Kiwifu/adhan-mp3@main/Adhan_Al_Haram_Al_Madani_-_Al_Madinah_1_(%D8%A3%D8%B0%D8%A7%D9%86_%D8%A7%D9%84%D8%AD%D8%B1%D9%85_%D8%A7%D9%84%D9%85%D8%AF%D9%86%D9%8A_-_%D8%A7%D9%84%D9%85%D8%AF%D9%8A%D9%86%D8%A9_%D8%A7%D9%84%D9%85%D9%86%D9%88%D8%B1%D8%A9).mp3',
        title: 'أذان المسجد النبوي الشريف',
        takbeerEndTime: 37.3
      },
      alaqsa: {
        localUrl: '/audio/adhan_alaqsa.mp3',
        cdnUrl:
          'https://cdn.jsdelivr.net/gh/Kiwifu/adhan-mp3@main/Adhan_Al_Aqsa_-_Jerusalem_(%D8%A3%D8%B0%D8%A7%D9%86_%D8%A7%D9%84%D9%85%D8%B3%D8%AC%D8%AF_%D8%A7%D9%84%D8%A3%D9%82%D8%B5%D9%89_-_%D8%A7%D9%84%D9%82%D8%AF%D8%B3).mp3',
        title: 'أذان المسجد الأقصى المبارك',
        takbeerEndTime: 24.1
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
        title: target.title + (isFirstTwo ? ' (تكبيرتان فقط)' : ' (الأذان كاملاً)'),
        subtitle: isFirstTwo ? 'تكبيرتا دخول وقت الصلاة' : 'نداء الصلاة المبارك بجودة عالية'
      },
      {
        onEnded: () => {
          options?.onFinished?.();
        },
        onError: (err: any) => {
          if (err?.name === 'NotAllowedError') {
            console.warn('[AudioService] Adhan audio autoplay requires user gesture, maintaining visual display');
            return;
          }
          this.playUrl(
            target.cdnUrl,
            'adhan',
            {
              title: target.title + (isFirstTwo ? ' (تكبيرتان فقط)' : ' (الأذان كاملاً)'),
              subtitle: 'نداء الصلاة المبارك'
            },
            {
              onEnded: () => options?.onFinished?.()
            },
            clipOptions
          ).catch((e) => console.warn('[AudioService] Adhan CDN fallback error:', e));
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

      // Resume interrupted track (Quran, Adhkar, or previous audio) from exact second only if NOT stopped by user
      if (this.interruptedTrack && !this.isUserPaused) {
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
   * - `minutes > 0`: Countdown timer (e.g., 15, 30, 45, 60 min) with absolute timestamp tracking that works even when screen is locked, gently fading volume over the final 30s.
   * - `minutes === -1`: Stop automatically at the end of the current Surah.
   * - `minutes === null` or `0`: Cancel sleep timer and restore volume to 100%.
   */
  public setSleepTimer(minutes: number | null): void {
    if (this.sleepTimerIntervalId !== null) {
      window.clearInterval(this.sleepTimerIntervalId);
      this.sleepTimerIntervalId = null;
    }

    if (minutes === null || minutes === 0) {
      this.sleepTimerTargetTimestamp = null;
      this.sleepTimerRemainingSeconds = null;
      this.stopAtEndOfSurah = false;
      this.audioElement.volume = 1.0;
      this.notifyListeners();
      return;
    }

    if (minutes === -1) {
      this.sleepTimerTargetTimestamp = null;
      this.sleepTimerRemainingSeconds = null;
      this.stopAtEndOfSurah = true;
      this.audioElement.volume = 1.0;
      this.notifyListeners();
      return;
    }

    this.stopAtEndOfSurah = false;
    this.sleepTimerRemainingSeconds = Math.max(1, Math.round(minutes * 60));
    this.sleepTimerTargetTimestamp = Date.now() + this.sleepTimerRemainingSeconds * 1000;
    this.audioElement.volume = 1.0;
    this.notifyListeners();

    this.sleepTimerIntervalId = window.setInterval(() => {
      if (this.sleepTimerTargetTimestamp === null) {
        if (this.sleepTimerIntervalId !== null) {
          window.clearInterval(this.sleepTimerIntervalId);
          this.sleepTimerIntervalId = null;
        }
        return;
      }

      const now = Date.now();
      const remaining = Math.max(0, Math.round((this.sleepTimerTargetTimestamp - now) / 1000));
      this.sleepTimerRemainingSeconds = remaining;

      if (now >= this.sleepTimerTargetTimestamp || remaining <= 0) {
        this.triggerSleepTimerStop();
        return;
      }

      // Smooth 30-second gradual volume fade-out before sleep timer stops
      if (remaining <= 30 && remaining > 0) {
        const fadedVolume = Math.max(0.05, Number((remaining / 30).toFixed(2)));
        this.audioElement.volume = fadedVolume;
      } else if (remaining > 30 && this.audioElement.volume < 1.0) {
        this.audioElement.volume = 1.0;
      }

      this.notifyListeners();
    }, 1000);
  }

  /**
   * Stops audio and resets all sleep timer and playback state cleanly
   */
  public triggerSleepTimerStop(): void {
    if (this.sleepTimerIntervalId !== null) {
      window.clearInterval(this.sleepTimerIntervalId);
      this.sleepTimerIntervalId = null;
    }
    this.sleepTimerTargetTimestamp = null;
    this.sleepTimerRemainingSeconds = null;
    this.stopAtEndOfSurah = false;
    this.continuousQuranRecitation = null;
    this.onTrackEndedCallback = null;
    this.isUserPaused = true;

    try {
      this.audioElement.pause();
    } catch {}
    this.audioElement.volume = 1.0;

    if (this.currentState) {
      this.currentState.isPlaying = false;
    }
    this.notifyListeners();
    this.updateMediaSessionPlaybackState('paused');
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
      this.triggerSleepTimerStop();
      return;
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
            this.isInternalTransition = true;
            this.scheduleSafeTimeout(() => {
              this.isInternalTransition = false;
              this.playAdhkarContinuous(category, startIndex, nextRep, 'repeated');
            }, 350);
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
              this.isInternalTransition = true;
              this.scheduleSafeTimeout(() => {
                this.isInternalTransition = false;
                this.playAdhkarContinuous(category, startIndex + 1, 1, 'repeated');
              }, 450);
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

