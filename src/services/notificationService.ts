/**
 * NotificationService - تم حذف وإيقاف نظام الإشعارات بالكامل
 * جاهز لإعادة البناء من الصفر
 */

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  timestamp: number;
}

export interface NotifyPayload {
  title: string;
  body: string;
  type?: string;
  actionText?: string;
  onAction?: () => void;
  audioUrl?: string;
  priority?: number;
  surahNumber?: number;
  ayahNumber?: number;
}

class NotificationManager {
  public notify(_payload: NotifyPayload): void {}

  public dismiss(): void {}

  public dismissInAppBanner(_resumeBackground?: boolean): void {}

  public clearQueue(): void {}

  public subscribe(_subscriber: (item: InAppNotification | null) => void): () => void {
    return () => {};
  }

  public subscribePermission(_subscriber: (permission: NotificationPermission) => void): () => void {
    return () => {};
  }

  public async requestPermission(): Promise<NotificationPermission> {
    return 'default';
  }

  public getPermission(): NotificationPermission {
    return 'default';
  }

  public getPermissionStatus(): NotificationPermission {
    return 'default';
  }

  public getActiveNotification(): InAppNotification | null {
    return null;
  }

  public isAudioPlayingForActiveNotification(): boolean {
    return false;
  }
}

export const NotificationService = new NotificationManager();
