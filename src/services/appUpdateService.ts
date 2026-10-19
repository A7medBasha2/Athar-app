import { NativePermissionsBridge } from './nativePermissionsBridge';
import packageJson from '../../package.json';

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

// قراءة الإصدار الحالي ديناميكياً من package.json
export const CURRENT_APP_VERSION = packageJson.version || '1.0.196';

// الريبوزيتوري الرسمي لتطبيق أثر
export const DEFAULT_GITHUB_REPO = 'A7medBasha2/Athar-app';

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

  public getRepository(): string {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(this.repoKey);
      if (saved && saved.includes('/')) return saved.trim();
    }
    return DEFAULT_GITHUB_REPO;
  }

  public setRepository(repo: string): void {
    if (typeof localStorage !== 'undefined' && repo.includes('/')) {
      localStorage.setItem(this.repoKey, repo.trim());
    }
  }

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

  public createDemoUpdateInfo(): UpdateInfo {
    const nextBuild = this.extractBuildNumber(CURRENT_APP_VERSION) + 1;
    return {
      hasUpdate: true,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: `1.0.${nextBuild}`,
      releaseName: `إصدار أثر الجديد (v1.0.${nextBuild})`,
      changelog: 'تحسينات عامة على أداء التطبيق، تعزيز استقرار الأذان، ودعم تثبيت التحديثات تلقائياً.',
      publishedAt: new Date().toISOString(),
      htmlUrl: `https://github.com/${this.getRepository()}/releases`,
      apkDownloadUrl: `https://github.com/${this.getRepository()}/releases/download/build-${nextBuild}/Athar.apk`,
      apkSize: 18500000,
      apkFileName: `Athar-v1.0.${nextBuild}.apk`,
    };
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
   * 🔍 التحقق من التحديثات مباشرة من GitHub Releases
   */
  public async checkForUpdates(forceManual: boolean = false): Promise<UpdateInfo> {
    this.notifyProgress({ state: 'checking', errorMessage: undefined });
    const repo = this.getRepository();

    let foundRelease: GitHubRelease | null = null;

    try {
      const latestRes = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
        cache: 'no-store',
      });

      if (latestRes.ok) {
        foundRelease = await latestRes.json();
      } else {
        const listRes = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=5`, {
          headers: { Accept: 'application/vnd.github.v3+json' },
          cache: 'no-store',
        });
        if (listRes.ok) {
          const releasesList = await listRes.json();
          if (Array.isArray(releasesList) && releasesList.length > 0) {
            foundRelease = releasesList[0];
          }
        }
      }

      if (!foundRelease) {
        throw new Error('لم يتم العثور على تحديثات متوفرة حالياً');
      }

      const rawTag = foundRelease.tag_name || '';
      const normalizedLatest = this.normalizeVersion(rawTag);
      const hasUpdate = this.compareVersions(rawTag, CURRENT_APP_VERSION) > 0;

      // البحث عن ملف الـ APK المباشر المرفوع
      const apkAsset = foundRelease.assets?.find(
        (a) =>
          a.name.toLowerCase().endsWith('.apk') ||
          a.content_type === 'application/vnd.android.package-archive'
      );

      const updateInfo: UpdateInfo = {
        hasUpdate,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: normalizedLatest || CURRENT_APP_VERSION,
        releaseName: foundRelease.name || `تحديث أثر (${rawTag})`,
        changelog: foundRelease.body || '• تحسينات عامة على الأداء والاستقرار وتجربة المستخدم.',
        publishedAt: foundRelease.published_at,
        htmlUrl: foundRelease.html_url || `https://github.com/${repo}/releases`,
        apkDownloadUrl: apkAsset?.browser_download_url || foundRelease.html_url,
        apkSize: apkAsset?.size,
        apkFileName: apkAsset?.name || `Athar-${rawTag}.apk`,
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
        htmlUrl: `https://github.com/${repo}/releases`,
      };
      this.latestUpdateInfo = fallbackInfo;
      return fallbackInfo;
    }
  }

  /**
   * 📥 تنزيل وتثبيت ملف الـ APK تلقائياً عبر مثبت الحزم
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
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(`athar_downloaded_${updateInfo.latestVersion}`, 'true');
          localStorage.setItem('athar_cached_apk_downloaded', 'true');
        }
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

  /**
   * 🔍 فحص ما إذا كان ملف الـ APK الخاص بهذا التحديث تم تنزيله مسبقاً وموجوداً في التخزين
   */
  public async checkExistingDownloadedApk(updateInfo: UpdateInfo): Promise<{ exists: boolean; filePath?: string; fileSize?: number }> {
    const fileName = updateInfo.apkFileName || `Athar.apk`;
    const res = await NativePermissionsBridge.checkDownloadedApk(fileName);
    if (res.exists) {
      return res;
    }
    const genericRes = await NativePermissionsBridge.checkDownloadedApk('Athar.apk');
    if (genericRes.exists) {
      return genericRes;
    }
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(`athar_downloaded_${updateInfo.latestVersion}`) : null;
    if (stored === 'true') {
      return { exists: true, fileSize: updateInfo.apkSize || 18500000 };
    }
    return { exists: false };
  }

  /**
   * ⚡ تشغيل مثبت الحزم مباشرة لملف الـ APK المحفوظ مسبقاً دون إعادة تنزيل
   */
  public async installExistingApk(updateInfo: UpdateInfo): Promise<boolean> {
    const fileName = updateInfo.apkFileName || `Athar.apk`;
    if (NativePermissionsBridge.isNative()) {
      const canInstall = await NativePermissionsBridge.canRequestPackageInstalls();
      if (!canInstall) {
        await NativePermissionsBridge.openInstallUnknownAppsSettings();
      }
      let res = await NativePermissionsBridge.installExistingApk(fileName);
      if (!res.success) {
        res = await NativePermissionsBridge.installExistingApk('Athar.apk');
      }
      if (res.success) {
        this.notifyProgress({
          state: 'installing',
          percent: 100,
          bytesReceived: updateInfo.apkSize || 0,
          totalBytes: updateInfo.apkSize || 0,
        });
        return true;
      }
      return false;
    } else {
      if (updateInfo.apkDownloadUrl) {
        window.open(updateInfo.apkDownloadUrl, '_blank');
      }
      return true;
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
