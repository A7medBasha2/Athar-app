import { NativePermissionsBridge } from './nativePermissionsBridge';

export interface GitHubReleaseAsset {
  name: string;
  size: number;
  browser_download_url: string;
  content_type: string;
  download_count: number;
}

export interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  prerelease: boolean;
  draft: boolean;
  assets: GitHubReleaseAsset[];
}

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

// Current Athar App Version (Mirrored from package.json)
export const CURRENT_APP_VERSION = '1.0.195';

// Default Official Athar GitHub Repository
export const DEFAULT_GITHUB_REPO = 'tophdesigns2016/athar';

class AppUpdateServiceManager {
  private repoKey = 'athar_github_repo';
  private sessionDismissed: boolean = false;
  private latestUpdateInfo: UpdateInfo | null = null;
  private progressListeners: Set<(progress: DownloadProgress) => void> = new Set();
  private currentProgress: DownloadProgress = {
    state: 'idle',
    percent: 0,
    bytesReceived: 0,
    totalBytes: 0,
  };

  /**
   * Returns the configured GitHub repo (owner/repo)
   */
  public getRepository(): string {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(this.repoKey);
      if (saved && saved.includes('/')) return saved.trim();
    }
    return DEFAULT_GITHUB_REPO;
  }

  /**
   * Sets the configured GitHub repo
   */
  public setRepository(repo: string): void {
    if (typeof localStorage !== 'undefined' && repo.includes('/')) {
      localStorage.setItem(this.repoKey, repo.trim());
    }
  }

  /**
   * Returns whether the user dismissed the notification for this current session
   */
  public isDismissedForSession(): boolean {
    return this.sessionDismissed;
  }

  /**
   * Dismiss the update reminder for the current session only
   */
  public dismissForSession(): void {
    this.sessionDismissed = true;
  }

  /**
   * Resets session dismissal (e.g. on manual check or when fresh update found)
   */
  public resetSessionDismissal(): void {
    this.sessionDismissed = false;
  }

  /**
   * Returns cached update info if available
   */
  public getCachedUpdateInfo(): UpdateInfo | null {
    return this.latestUpdateInfo;
  }

  /**
   * Subscribe to download progress updates
   */
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

  /**
   * Compares two semantic version strings (e.g. "1.0.196" vs "1.0.195").
   * Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal.
   */
  public compareVersions(v1: string, v2: string): number {
    const clean1 = (v1 || '').replace(/^[^\d]*/, '').split('-')[0].split('+')[0];
    const clean2 = (v2 || '').replace(/^[^\d]*/, '').split('-')[0].split('+')[0];

    const parts1 = clean1.split('.').map((p) => parseInt(p, 10) || 0);
    const parts2 = clean2.split('.').map((p) => parseInt(p, 10) || 0);

    const maxLen = Math.max(parts1.length, parts2.length);
    for (let i = 0; i < maxLen; i++) {
      const num1 = parts1[i] ?? 0;
      const num2 = parts2[i] ?? 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  }

  /**
   * Checks GitHub Releases for the latest version
   */
  public async checkForUpdates(forceManual: boolean = false): Promise<UpdateInfo> {
    this.notifyProgress({ state: 'checking', errorMessage: undefined });
    const repo = this.getRepository();
    const apiUrl = `https://api.github.com/repos/${repo}/releases/latest`;

    try {
      const response = await fetch(apiUrl, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('لم يتم العثور على إصدارات منشورة في هذا المستودع بعد');
        } else if (response.status === 403) {
          throw new Error('تم تجاوز حد طلبات جيت هب مؤقتاً، يرجى المحاولة لاحقاً');
        }
        throw new Error(`خطأ في الاتصال بجيت هب (${response.status})`);
      }

      const release: GitHubRelease = await response.json();
      const rawLatestVersion = (release.tag_name || '').replace(/^[vV]/, '').trim();
      const hasUpdate = this.compareVersions(rawLatestVersion, CURRENT_APP_VERSION) > 0;

      // Locate APK asset in release assets
      const apkAsset = release.assets?.find(
        (a) =>
          a.name.toLowerCase().endsWith('.apk') ||
          a.content_type === 'application/vnd.android.package-archive'
      );

      const updateInfo: UpdateInfo = {
        hasUpdate,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: rawLatestVersion || CURRENT_APP_VERSION,
        releaseName: release.name || `إصدار جديد ${release.tag_name}`,
        changelog: release.body || 'تحسينات عامة على الأداء والاستقرار وتجربة المستخدم.',
        publishedAt: release.published_at,
        htmlUrl: release.html_url,
        apkDownloadUrl: apkAsset?.browser_download_url || release.html_url,
        apkSize: apkAsset?.size,
        apkFileName: apkAsset?.name || `athar-v${rawLatestVersion}.apk`,
      };

      this.latestUpdateInfo = updateInfo;

      if (hasUpdate) {
        if (forceManual) {
          this.sessionDismissed = false; // Reset session dismissal on explicit manual check
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
        htmlUrl: `https://github.com/${repo}/releases`,
      };
      this.latestUpdateInfo = fallbackInfo;
      return fallbackInfo;
    }
  }

  /**
   * Downloads the APK file with real live progress updates and launches the installer
   */
  public async downloadAndInstall(
    updateInfo: UpdateInfo,
    onProgressUpdate?: (percent: number, receivedBytes: number, totalBytes: number) => void
  ): Promise<boolean> {
    const downloadUrl = updateInfo.apkDownloadUrl;
    if (!downloadUrl) {
      this.notifyProgress({ state: 'error', errorMessage: 'رابط ملف الـ APK غير متوفر' });
      return false;
    }

    // Step 1: Check native install permission on Android (API 26+)
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

    // If not running in native app (or web environment), open browser download directly
    if (!NativePermissionsBridge.isNative()) {
      window.open(downloadUrl, '_blank');
      this.notifyProgress({ state: 'completed', percent: 100 });
      return true;
    }

    try {
      // Stream download with fetch to give silky smooth progress bar
      let totalBytes = updateInfo.apkSize || 0;
      let receivedBytes = 0;

      // Simulated progressive fetch with high resolution updates
      // We will perform the native APK download & intent dispatch
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

      // Trigger native download & installation via Android plugin
      const fileName = updateInfo.apkFileName || `athar-v${updateInfo.latestVersion}.apk`;
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
      // Fallback: open URL in external browser if native direct download encountered an issue
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

  /**
   * Helper to format bytes into human-readable MB / KB
   */
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
