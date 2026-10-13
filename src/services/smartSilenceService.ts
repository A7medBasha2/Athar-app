import { AudioService } from './audioService';
import { ReminderEngine } from './reminderService';
import { AlarmService } from './alarmService';
import { NotificationService } from './notificationService';

export interface SmartSilenceEvent {
  triggerType: 'flip_face_down' | 'volume_key' | 'media_key' | 'lock_screen';
  timestamp: number;
}

type SilenceListener = (event: SmartSilenceEvent) => void;

class SmartSilenceEngine {
  private isListening: boolean = false;
  private lastTriggerTime: number = 0;
  private listeners: Set<SilenceListener> = new Set();
  private wasFaceUp: boolean = true;

  public init(): void {
    if (this.isListening || typeof window === 'undefined') return;
    this.isListening = true;

    // 1. Device Flip Detection (Device Orientation & Motion)
    this.initDeviceFlipListeners();

    // 2. Hardware Keys (Volume Up, Volume Down, Media Keys, Escape)
    this.initHardwareKeyListeners();

    // 3. Lock Screen / MediaSession Interceptors
    this.initMediaSessionInterceptors();
  }

  public subscribe(cb: SilenceListener): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify(triggerType: SmartSilenceEvent['triggerType']): void {
    const ev: SmartSilenceEvent = {
      triggerType,
      timestamp: Date.now(),
    };
    this.listeners.forEach((cb) => {
      try {
        cb(ev);
      } catch {}
    });
  }

  /**
   * Checks whether any high-priority sound (Adhan, Alarm, or Notification alert) is currently ringing
   */
  public isRingingAudioActive(): boolean {
    const isAdhan = ReminderEngine.hasActiveAdhanScreen() && !AudioService.isAdhanMuted();
    const isAlarm = AlarmService.getActiveRingingState() !== null;
    const isTempNotification = AudioService.isTemporaryAudioCurrentlyActive();
    const isNotificationAudio = NotificationService.isAudioPlayingForActiveNotification();
    return isAdhan || isAlarm || isTempNotification || isNotificationAudio;
  }

  /**
   * Silences or mutes all active ringing audio in place
   */
  public triggerSilence(triggerType: SmartSilenceEvent['triggerType']): boolean {
    const now = Date.now();
    if (now - this.lastTriggerTime < 1200) {
      return false;
    }

    if (!this.isRingingAudioActive()) {
      return false;
    }

    this.lastTriggerTime = now;
    let handled = false;

    // 1. Mute Adhan audio in place without closing the sacred prayer screen
    if (ReminderEngine.hasActiveAdhanScreen()) {
      ReminderEngine.muteAdhanAndKeepScreenOpen();
      handled = true;
    }

    // 2. Dismiss or Snooze active ringing alarm
    if (AlarmService.getActiveRingingState()) {
      AlarmService.dismissActiveAlarm();
      handled = true;
    }

    // 3. Stop temporary notification audio and restore background recitation cleanly
    if (AudioService.isTemporaryAudioCurrentlyActive() || NotificationService.isAudioPlayingForActiveNotification()) {
      AudioService.stopTemporaryAndResume(false);
      NotificationService.dismissInAppBanner(false);
      handled = true;
    }

    if (handled) {
      this.notify(triggerType);

      // Subtle haptic confirmation that the silence gesture succeeded
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([60, 40, 60]);
        } catch {}
      }
    }

    return handled;
  }

  private initDeviceFlipListeners(): void {
    // A. Device Orientation API (beta / gamma angles)
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta === null && e.gamma === null) return;

      const beta = e.beta ?? 0;
      const gamma = e.gamma ?? 0;

      // When phone is facing up (standard usage): beta is around 0° - 60°, gamma is between -45° and 45°
      // When phone is turned face down (on table or mattress): beta is > 135° or < -135°, or |gamma| > 135°
      const isCurrentlyFaceDown = Math.abs(beta) > 135 || Math.abs(gamma) > 135;

      if (!isCurrentlyFaceDown) {
        this.wasFaceUp = true;
      } else if (this.wasFaceUp && isCurrentlyFaceDown) {
        this.wasFaceUp = false;
        this.triggerSilence('flip_face_down');
      }
    };

    // B. Device Motion API (Gravity Z axis points negatively when face down)
    const handleMotion = (e: DeviceMotionEvent) => {
      const z = e.accelerationIncludingGravity?.z;
      if (typeof z === 'number') {
        // Normal face-up gravity is around +9.8 m/s². When upside down / face down, Z is around -8 to -10 m/s².
        const isFaceDownByGravity = z < -5.8;
        if (!isFaceDownByGravity) {
          this.wasFaceUp = true;
        } else if (this.wasFaceUp && isFaceDownByGravity) {
          this.wasFaceUp = false;
          this.triggerSilence('flip_face_down');
        }
      }
    };

    try {
      window.addEventListener('deviceorientation', handleOrientation, { passive: true });
      window.addEventListener('devicemotion', handleMotion, { passive: true });
    } catch {}
  }

  private initHardwareKeyListeners(): void {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      const code = e.code;

      const isVolumeKey =
        key === 'VolumeUp' ||
        key === 'VolumeDown' ||
        key === 'AudioVolumeUp' ||
        key === 'AudioVolumeDown' ||
        key === 'AudioVolumeMute' ||
        code === 'VolumeUp' ||
        code === 'VolumeDown' ||
        code === 'AudioVolumeUp' ||
        code === 'AudioVolumeDown';

      const isMediaKey =
        key === 'MediaTrackNext' ||
        key === 'MediaTrackPrevious' ||
        key === 'MediaPlayPause' ||
        key === 'MediaStop' ||
        code === 'MediaTrackNext' ||
        code === 'MediaTrackPrevious' ||
        code === 'MediaPlayPause';

      const isEscapeKey = key === 'Escape';

      if (isVolumeKey) {
        if (this.triggerSilence('volume_key')) {
          e.preventDefault();
        }
      } else if (isMediaKey) {
        if (this.triggerSilence('media_key')) {
          e.preventDefault();
        }
      } else if (isEscapeKey) {
        this.triggerSilence('volume_key');
      }
    };

    try {
      window.addEventListener('keydown', handleKeyDown, { passive: false });
    } catch {}
  }

  private initMediaSessionInterceptors(): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      const originalPauseHandler = () => {
        if (this.triggerSilence('lock_screen')) return;
        AudioService.pause();
      };

      const originalStopHandler = () => {
        if (this.triggerSilence('lock_screen')) return;
        AudioService.stop();
      };

      navigator.mediaSession.setActionHandler('pause', originalPauseHandler);
      navigator.mediaSession.setActionHandler('stop', originalStopHandler);
    } catch {}
  }
}

export const SmartSilenceService = new SmartSilenceEngine();
