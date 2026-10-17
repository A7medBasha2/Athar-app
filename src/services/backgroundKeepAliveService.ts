/**
 * BackgroundKeepAliveService
 * Maintains continuous background execution and timer precision for Athar Islamic App
 * using a silent audio loop, MediaSession API, and Screen WakeLock.
 */
class BackgroundKeepAliveServiceClass {
  private audioContext: AudioContext | null = null;
  private silentGainNode: GainNode | null = null;
  private oscillatorNode: OscillatorNode | null = null;
  private silentHtmlAudio: HTMLAudioElement | null = null;
  private wakeLockSentinel: any = null;
  private isRunning = false;

  public async start(): Promise<void> {
    if (this.isRunning || typeof window === 'undefined') return;
    this.isRunning = true;

    try {
      this.initSilentAudioLoop();
      await this.requestWakeLock();
      this.setupVisibilityListeners();
      this.setupMediaSession();
    } catch (e) {
      console.warn('[BackgroundKeepAlive] Error starting keep-alive:', e);
    }
  }

  private initSilentAudioLoop(): void {
    try {
      // 1. HTML5 Inaudible Audio Loop with base64 1-sec silent MP3
      if (!this.silentHtmlAudio) {
        const silentBase64 =
          'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
        this.silentHtmlAudio = new Audio(silentBase64);
        this.silentHtmlAudio.loop = true;
        this.silentHtmlAudio.volume = 0.01;
      }

      this.silentHtmlAudio.play().catch(() => {
        // Autoplay may need user gesture; fallback to Web Audio API on next user interaction
        this.setupUserGestureUnlock();
      });
    } catch {}

    try {
      // 2. Web Audio API oscillator buffer as redundant keep-alive
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx && !this.audioContext) {
        this.audioContext = new AudioCtx();
        this.silentGainNode = this.audioContext.createGain();
        this.silentGainNode.gain.value = 0.0001; // virtually inaudible
        this.oscillatorNode = this.audioContext.createOscillator();
        this.oscillatorNode.frequency.value = 20; // inaudible sub-bass
        this.oscillatorNode.connect(this.silentGainNode);
        this.silentGainNode.connect(this.audioContext.destination);
        this.oscillatorNode.start();
      }
    } catch {}
  }

  private setupUserGestureUnlock(): void {
    const unlock = () => {
      if (this.silentHtmlAudio && this.silentHtmlAudio.paused) {
        this.silentHtmlAudio.play().catch(() => {});
      }
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
  }

  private setupMediaSession(): void {
    try {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    } catch {}
  }

  public async requestWakeLock(): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
        if (!this.wakeLockSentinel) {
          this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
          this.wakeLockSentinel.addEventListener('release', () => {
            this.wakeLockSentinel = null;
          });
          return true;
        }
      }
    } catch {}
    return false;
  }

  private setupVisibilityListeners(): void {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') {
        await this.requestWakeLock();
      } else {
        // App went to background: ensure audio loop is playing to retain timer thread
        if (this.silentHtmlAudio && this.silentHtmlAudio.paused) {
          this.silentHtmlAudio.play().catch(() => {});
        }
        if (this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume().catch(() => {});
        }
      }
    });
  }

  public stop(): void {
    this.isRunning = false;
    try {
      if (this.silentHtmlAudio) {
        this.silentHtmlAudio.pause();
      }
      if (this.oscillatorNode) {
        this.oscillatorNode.stop();
        this.oscillatorNode.disconnect();
        this.oscillatorNode = null;
      }
      if (this.audioContext) {
        this.audioContext.close().catch(() => {});
        this.audioContext = null;
      }
      if (this.wakeLockSentinel) {
        this.wakeLockSentinel.release().catch(() => {});
        this.wakeLockSentinel = null;
      }
    } catch {}
  }
}

export const BackgroundKeepAliveService = new BackgroundKeepAliveServiceClass();
