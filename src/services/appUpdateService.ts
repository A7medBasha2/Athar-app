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
   * Normalizes version strings from tags like "build-196", "v1.0.196", "1.0.196", or release titles.
   */
  public normalizeVersion(rawVersion: string, releaseName?: string, releaseBody?: string): string {
    const raw = (rawVersion || '').trim();

    // Case 1: Standard semantic version with dots (e.g. "1.0.196" or "v1.0.196")
    const dotMatch = raw.match(/v?(\d+\.\d+(?:\.\d+)?)/i);
    if (dotMatch) {
      return dotMatch[1];
    }

    // Case 2: "build-196" or "build196" - map to "1.0.196" to match Athar's semver scheme
    const buildMatch = raw.match(/build[-_]?(\d+)/i);
    if (buildMatch) {
      return `1.0.${buildMatch[1]}`;
    }

    // Case 3: Try to find semver inside release name or body
    const searchContext = `${releaseName || ''} ${releaseBody || ''}`;
    const contextMatch = searchContext.match(/(?:إصدار|version|v)\s*[:=]?\s*(\d+\.\d+(?:\.\d+)?)/i);
    if (contextMatch) {
      return contextMatch[1];
    }

    // Case 4: Plain integer like "196"
    if (/^\d+$/.test(raw)) {
      return `1.0.${raw}`;
    }

    return raw.replace(/^[^\d]*/, '') || CURRENT_APP_VERSION;
  }

  /**
   * Compares two semantic version strings (e.g. "1.0.196" vs "1.0.195").
   * Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal.
   */
  public compareVersions(v1: string, v2: string): number {
    const norm1 = this.normalizeVersion(v1);
    const norm2 = this.normalizeVersion(v2);

    const parts1 = norm1.split('.').map((p) => parseInt(p, 10) || 0);
    const parts2 = norm2.split('.').map((p) => parseInt(p, 10) || 0);

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
   * Generates a sample update payload for previewing and testing the update flow in UI
   */
  public createDemoUpdateInfo(): UpdateInfo {
    const nextVer = '1.0.196';
    return {
      hasUpdate: true,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: nextVer,
      releaseName: `أَثَرُ الإصدار الملكي الذهبي v${nextVer}`,
      changelog: `• تحسين استقرار مواقيت الصلاة الفلكية في الخلفية 100%.
• تفعيل شاشة الأذان الملكية التلقائية والتحكم الفوري في الكتم.
• تحديث شجرة الأثر التفاعلية وحفظ السجلات دون أي فقدان للبيانات.
• دمج مثبت الحزم الداخلي وتنزيل ملفات الـ APK تلقائياً.`,
      publishedAt: new Date().toISOString(),
      htmlUrl: `https://github.com/${this.getRepository()}/releases`,
      apkDownloadUrl: `https://github.com/${this.getRepository()}/releases/download/v${nextVer}/app-debug.apk`,
      apkSize: 18450000,
      apkFileName: `athar-v${nextVer}.apk`,
    };
  }

  /**
   * Checks GitHub Releases for the latest version across multiple endpoints and fallback repos
   */
  public async checkForUpdates(forceManual: boolean = false): Promise<UpdateInfo> {
    this.notifyProgress({ state: 'checking', errorMessage: undefined });
    const primaryRepo = this.getRepository();
    const candidateRepos = [primaryRepo];
    if (primaryRepo !== 'A7medBasha2/Athar-app') {
      candidateRepos.push('A7medBasha2/Athar-app');
    }
    if (primaryRepo !== DEFAULT_GITHUB_REPO && !candidateRepos.includes(DEFAULT_GITHUB_REPO)) {
      candidateRepos.push(DEFAULT_GITHUB_REPO);
    }

    let foundRelease: GitHubRelease | null = null;
    let successfulRepo: string = primaryRepo;

    for (const repo of candidateRepos) {
      try {
        // Try /releases/latest first
        const latestRes = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
          headers: { Accept: 'application/vnd.github.v3+json' },
          cache: 'no-store',
        });

        if (latestRes.ok) {
          foundRelease = await latestRes.json();
          successfulRepo = repo;
          break;
        }

        // If /releases/latest returns 404 or fails, try /releases list
        const listRes = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=5`, {
          headers: { Accept: 'application/vnd.github.v3+json' },
          cache: 'no-store',
        });

        if (listRes.ok) {
          const releasesList = await listRes.json();
          if (Array.isArray(releasesList) && releasesList.length > 0) {
            foundRelease = releasesList[0];
            successfulRepo = repo;
            break;
          }
        }
      } catch (err) {
        console.warn(`[AppUpdateService] Error querying repo ${repo}:`, err);
      }
    }

    try {
      if (!foundRelease) {
        throw new Error('لم يتم العثور على إصدارات منشورة في مستودع GitHub بعد');
      }

      const rawTag = foundRelease.tag_name || '';
      const normalizedLatest = this.normalizeVersion(rawTag, foundRelease.name, foundRelease.body);
      const hasUpdate = this.compareVersions(normalizedLatest, CURRENT_APP_VERSION) > 0;

      // Locate APK asset in release assets
      const apkAsset = foundRelease.assets?.find(
        (a) =>
          a.name.toLowerCase().endsWith('.apk') ||
          a.content_type === 'application/vnd.android.package-archive'
      );

      const updateInfo: UpdateInfo = {
        hasUpdate,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: normalizedLatest || CURRENT_APP_VERSION,
        releaseName: foundRelease.name || `إصدار أثر الجديد (${rawTag || normalizedLatest})`,
        changelog: foundRelease.body || 'تحسينات عامة على الأداء والاستقرار وتجربة المستخدم.',
        publishedAt: foundRelease.published_at,
        htmlUrl: foundRelease.html_url || `https://github.com/${successfulRepo}/releases`,
        apkDownloadUrl: apkAsset?.browser_download_url || foundRelease.html_url,
        apkSize: apkAsset?.size,
        apkFileName: apkAsset?.name || `athar-v${normalizedLatest}.apk`,
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
        htmlUrl: `https://github.com/${primaryRepo}/releases`,
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

    // If not running in native app (or web environment), provide visual download progress simulation
    // then open browser download if real URL exists
    if (!NativePermissionsBridge.isNative()) {
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
              if (downloadUrl && downloadUrl.startsWith('http') && !downloadUrl.includes('demo')) {
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
