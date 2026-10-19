import { NativePermissionsBridge } from './nativePermissionsBridge';
import packageJson from '../../package.json';

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  changelog: string;
  publishedAt: string;
  htmlUrl: string;
  apkDownloadUrl?: string;
  apkSize?: number;
  apkFileName?: string;
}

export type UpdateDownloadState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'up_to_date'
  | 'downloading'
  | 'installing'
  | 'completed'
  | 'error';

export interface DownloadProgress {
  state: UpdateDownloadState;
  percent: number; // 0 - 100
  bytesReceived: number;
  totalBytes: number;
  errorMessage?: string;
}

// قراءة الإصدار الحالي ديناميكياً من package.json
export const CURRENT_APP_VERSION = packageJson.version || '1.0.196';

// رابط Firebase Hosting الخاص بتطبيقك
export const FIREBASE_HOSTING_URL = 'https://athar-e45df.web.app';

class AppUpdateServiceManager {
  private sessionDismissed: boolean = false;
  private latestUpdateInfo: UpdateInfo | null = null;
  private progressListeners: Set<(progress: DownloadProgress) => void> = new Set();
  private currentProgress: DownloadProgress = {
    state: 'idle',
    percent: 0,
    bytesReceived: 0,
    totalBytes: 0,
  };

  public isDismissedForSession(): boolean {
    return this.sessionDismissed;
  }

  public dismissForSession(): void {
    this.sessionDismissed = true;
  }

  public resetSessionDismissal(): void {
    this.sessionDismissed = false;
  }

  public getCachedUpdateInfo(): UpdateInfo | null {
    return this.latestUpdateInfo;
  }

  public onProgress(callback: (progress: DownloadProgress) => void): () => void {
    this.progressListeners.add(callback);
    callback(this.currentProgress);
    return () => {
      this.progressListeners.delete(callback);
    };
  }

  private notifyProgress(progress: Partial<DownloadProgress>): void {
    this.currentProgress = { ...this.currentProgress, ...progress };
    this.progressListeners.forEach((listener) => {
      try {
        listener(this.currentProgress);
      } catch (err) {
        console.warn('[AppUpdateService] progress listener error:', err);
      }
    });
  }

  public extractBuildNumber(rawVersion: string): number {
    const raw = (rawVersion || '').trim();
    if (!raw) return 0;
    const match = raw.match(/\d+/g);
    if (!match || match.length === 0) return 0;
    return parseInt(match[match.length - 1], 10);
  }

  public normalizeVersion(rawVersion: string): string {
    const raw = (rawVersion || '').trim();
    const buildNum = this.extractBuildNumber(raw);
    if (buildNum > 0) {
      return `1.0.${buildNum}`;
    }
    return raw.replace(/^[^\d]*/, '') || CURRENT_APP_VERSION;
  }

  public compareVersions(v1: string, v2: string): number {
    const build1 = this.extractBuildNumber(v1);
    const build2 = this.extractBuildNumber(v2);
    if (build1 > build2) return 1;
    if (build1 < build2) return -1;
    return 0;
  }

  /**
   * 🔍 التحقق من التحديثات عبر قراءة ملف version.json من Firebase Hosting
   */
  public async checkForUpdates(forceManual: boolean = false): Promise<UpdateInfo> {
    this.notifyProgress({ state: 'checking', errorMessage: undefined });

    try {
      const response = await fetch(`${FIREBASE_HOSTING_URL}/version.json?t=${Date.now()}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('تعذر الوصول إلى خادم التحديثات');
      }

      const remoteData = await response.json();
      const remoteVersion = remoteData.version || '1.0.0';
      const normalizedLatest = this.normalizeVersion(remoteVersion);

      // مقارنة رقم البناء الحالي بالجديد
      const hasUpdate = this.compareVersions(normalizedLatest, CURRENT_APP_VERSION) > 0;

      const updateInfo: UpdateInfo = {
        hasUpdate,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: normalizedLatest,
        releaseName: remoteData.title || `تحديث أثر v${remoteVersion}`,
        changelog: remoteData.notes || '• تحسينات عامة على الأداء والاستقرار وتجربة المستخدم.',
        publishedAt: new Date().toISOString(),
        htmlUrl: FIREBASE_HOSTING_URL,
        apkDownloadUrl: remoteData.downloadUrl || `${FIREBASE_HOSTING_URL}/Ath.bin`, // رابط الـ Bin أو Zip المرفوع
        apkSize: remoteData.apkSize,
        apkFileName: 'Athar.apk',
      };

      this.latestUpdateInfo = updateInfo;

      if (hasUpdate) {
        if (forceManual) {
          this.sessionDismissed = false;
        }
        this.notifyProgress({ state: 'available' });
      } else {
        this.notifyProgress({ state: 'up_to_date' });
      }

      return updateInfo;
    } catch (error: any) {
      console.warn('[AppUpdateService] Check update error:', error);
      const errMsg = error?.message || 'تعذر التحقق من التحديثات';
      this.notifyProgress({ state: 'error', errorMessage: errMsg });

      const fallbackInfo: UpdateInfo = {
        hasUpdate: false,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: CURRENT_APP_VERSION,
        releaseName: '',
        changelog: '',
        publishedAt: '',
        htmlUrl: FIREBASE_HOSTING_URL,
      };
      this.latestUpdateInfo = fallbackInfo;
      return fallbackInfo;
    }
  }

  /**
   * 📥 تنزيل وتثبيت التحديث مباشرة
   */
  public async downloadAndInstall(
    updateInfo: UpdateInfo,
    onProgressUpdate?: (percent: number, receivedBytes: number, totalBytes: number) => void
  ): Promise<boolean> {
    const downloadUrl = updateInfo.apkDownloadUrl;
    if (!downloadUrl) {
      this.notifyProgress({ state: 'error', errorMessage: 'رابط ملف التحديث غير متوفر' });
      return false;
    }

    if (NativePermissionsBridge.isNative()) {
      const canInstall = await NativePermissionsBridge.canRequestPackageInstalls();
      if (!canInstall) {
        await NativePermissionsBridge.openInstallUnknownAppsSettings();
      }
    }

    this.notifyProgress({
      state: 'downloading',
      percent: 0,
      bytesReceived: 0,
      totalBytes: updateInfo.apkSize || 0,
      errorMessage: undefined,
    });

    if (!NativePermissionsBridge.isNative()) {
      // محاكاة التنزيل على متصفح الويب
      const totalBytes = updateInfo.apkSize || 18500000;
      let p = 0;
      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          p += 20;
          const currentP = Math.min(100, p);
          const currentBytes = Math.floor((currentP / 100) * totalBytes);
          this.notifyProgress({
            state: currentP < 100 ? 'downloading' : 'installing',
            percent: currentP,
            bytesReceived: currentBytes,
            totalBytes,
          });
          onProgressUpdate?.(currentP, currentBytes, totalBytes);
          if (p >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              this.notifyProgress({ state: 'completed', percent: 100 });
              if (downloadUrl && downloadUrl.startsWith('http')) {
                window.open(downloadUrl, '_blank');
              }
              resolve();
            }, 500);
          }
        }, 250);
      });
      return true;
    }

    try {
      let totalBytes = updateInfo.apkSize || 0;

      const progressTimer = setInterval(() => {
        if (this.currentProgress.state === 'downloading' && this.currentProgress.percent < 90) {
          const nextPercent = Math.min(90, this.currentProgress.percent + Math.floor(Math.random() * 8) + 4);
          const nextReceived = totalBytes > 0 ? Math.floor((nextPercent / 100) * totalBytes) : nextPercent * 1024 * 300;
          this.notifyProgress({
            percent: nextPercent,
            bytesReceived: nextReceived,
            totalBytes: totalBytes > 0 ? totalBytes : nextReceived * 1.2,
          });
          onProgressUpdate?.(nextPercent, nextReceived, totalBytes);
        }
      }, 400);

      const fileName = updateInfo.apkFileName || `Athar.apk`;
      const result = await NativePermissionsBridge.downloadAndInstallApk(downloadUrl, fileName);

      clearInterval(progressTimer);

      if (result.success) {
        this.notifyProgress({
          state: 'installing',
          percent: 100,
          bytesReceived: totalBytes,
          totalBytes,
        });
        onProgressUpdate?.(100, totalBytes, totalBytes);
        return true;
      } else {
        throw new Error('فشل تثبيت ملف الحزمة');
      }
    } catch (err: any) {
      console.warn('[AppUpdateService] downloadAndInstall error:', err);
      try {
        window.open(downloadUrl, '_blank');
      } catch {}

      this.notifyProgress({
        state: 'error',
        errorMessage: err?.message || 'تعذر استكمال تنزيل التحديث',
      });
      return false;
    }
  }

  public formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 ميجابايت';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) {
      return `${mb.toFixed(1)} ميجابايت`;
    }
    const kb = bytes / 1024;
    return `${kb.toFixed(0)} كيلوبايت`;
  }
}

export const AppUpdateService = new AppUpdateServiceManager();
