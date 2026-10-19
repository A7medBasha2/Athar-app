import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowUpCircle,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
  FileCode2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import {
  AppUpdateService,
  UpdateInfo,
  DownloadProgress,
} from '../services/appUpdateService';

interface AppUpdateModalProps {
  updateInfo: UpdateInfo;
  isOpen: boolean;
  onClose: () => void;
  onPostpone: () => void;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  updateInfo,
  isOpen,
  onClose,
  onPostpone,
}) => {
  const [progress, setProgress] = useState<DownloadProgress>({
    state: 'available',
    percent: 0,
    bytesReceived: 0,
    totalBytes: updateInfo.apkSize || 0,
  });
  const [isInstalling, setIsInstalling] = useState(false);
  const [hasCachedApk, setHasCachedApk] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const checkFile = async () => {
      const res = await AppUpdateService.checkExistingDownloadedApk(updateInfo);
      if (isMounted && res.exists) {
        setHasCachedApk(true);
      }
    };
    checkFile();
    return () => {
      isMounted = false;
    };
  }, [updateInfo, isOpen]);

  useEffect(() => {
    const unsubscribe = AppUpdateService.onProgress((p) => {
      setProgress(p);
      if (p.state === 'installing' || p.state === 'completed') {
        setIsInstalling(false);
        setHasCachedApk(true);
      }
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const handleStartUpdate = async () => {
    setIsInstalling(true);
    const success = await AppUpdateService.downloadAndInstall(updateInfo);
    if (success) {
      setHasCachedApk(true);
    }
  };

  const handleInstallCached = async () => {
    setIsInstalling(true);
    await AppUpdateService.installExistingApk(updateInfo);
    setIsInstalling(false);
  };

  const formattedDate = updateInfo.publishedAt
    ? new Date(updateInfo.publishedAt).toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  const isBusy = progress.state === 'downloading' || progress.state === 'installing';
  const isError = progress.state === 'error';

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all animate-fadeIn"
      style={{ fontFamily: 'inherit' }}
    >
      <div
        className="relative w-full max-w-md bg-gradient-to-b from-[#1C170E] via-[#141009] to-[#0D0A06] border border-[#C8A24A]/40 rounded-3xl p-5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(200,162,74,0.15)] overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#C8A24A]/20 blur-3xl pointer-events-none rounded-full" />

        {/* Header Bar */}
        <div className="flex items-center justify-between gap-3 mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#C8A24A]/30 to-[#8A6A1C]/20 border border-[#C8A24A]/50 flex items-center justify-center shadow-[0_0_15px_rgba(200,162,74,0.3)]">
              <ArrowUpCircle className="w-5 h-5 text-[#E6C66E] animate-pulse" />
            </div>
            <div>
              <span className="inline-block text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-full bg-[#C8A24A]/15 border border-[#C8A24A]/30 text-[#E6C66E] mb-0.5">
                تحديث أندرويد جديد متاح
              </span>
              <h3 className="text-base font-bold text-[#F8F1DD] leading-tight">
                {updateInfo.releaseName || `الإصدار ${updateInfo.latestVersion}`}
              </h3>
            </div>
          </div>

          <button
            onClick={onPostpone}
            disabled={isBusy}
            aria-label="إغلاق التنبيه"
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 flex items-center justify-center text-[#E6C66E]/70 hover:text-[#E6C66E] transition-all disabled:opacity-30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Version Diff Strip */}
        <div className="p-3 rounded-2xl bg-[#231C11]/80 border border-[#C8A24A]/20 mb-3 flex items-center justify-between text-xs relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-stone-400">الإصدار الحالي:</span>
            <span className="font-mono text-stone-300 font-semibold bg-black/40 px-2 py-0.5 rounded-md border border-white/5">
              v{updateInfo.currentVersion}
            </span>
          </div>
          <span className="text-[#C8A24A] font-bold">←</span>
          <div className="flex items-center gap-2">
            <span className="text-[#E6C66E] font-medium">الجديد:</span>
            <span className="font-mono text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/30">
              v{updateInfo.latestVersion}
            </span>
          </div>
        </div>

        {/* Release Metadata Row */}
        <div className="flex items-center justify-between gap-2 px-1 mb-3 text-[11px] text-stone-400">
          {formattedDate && (
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#C8A24A]" />
              <span>{formattedDate}</span>
            </div>
          )}
          {updateInfo.apkSize && (
            <div className="flex items-center gap-1">
              <FileCode2 className="w-3.5 h-3.5 text-[#C8A24A]" />
              <span>الحجم: {AppUpdateService.formatBytes(updateInfo.apkSize)}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-emerald-400/90 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>حفظ الإعدادات 100%</span>
          </div>
        </div>

        {/* Changelog Card */}
        <div className="mb-4 rounded-2xl bg-black/40 border border-[#C8A24A]/20 p-3 max-h-40 overflow-y-auto text-right text-xs leading-relaxed text-stone-300 scrollbar-thin scrollbar-thumb-[#C8A24A]/40">
          <div className="text-[11px] font-bold text-[#C8A24A] mb-1.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>ما الجديد في هذا التحديث:</span>
          </div>
          <p className="whitespace-pre-line text-stone-300 text-[11px] leading-5">
            {updateInfo.changelog || 'تحسينات على الاستقرار والأداء وتجربة الاستخدام.'}
          </p>
        </div>

        {/* Download Progress Card (Active when downloading, installing, or error) */}
        {(progress.state === 'downloading' || progress.state === 'installing' || progress.state === 'completed') && (
          <div className="mb-4 p-3 rounded-2xl bg-[#1B150D] border border-[#C8A24A]/30">
            <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
              <span className="text-[#E6C66E] flex items-center gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 text-[#C8A24A] ${progress.state !== 'completed' ? 'animate-spin' : ''}`} />
                {progress.state === 'installing'
                  ? 'جاري إطلاق مثبت حزم النظام...'
                  : progress.state === 'completed'
                  ? 'اكتمل التنزيل بنجاح ✓'
                  : 'جاري تنزيل ملف التحديث...'}
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                {progress.percent}%
              </span>
            </div>

            {/* Glowing Royal Progress Bar */}
            <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden p-0.5 border border-[#C8A24A]/20">
              <div
                className="h-full bg-gradient-to-r from-[#947024] via-[#C8A24A] to-emerald-400 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(200,162,74,0.6)]"
                style={{ width: `${Math.max(4, progress.percent)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-stone-400 mt-2">
              <span>{AppUpdateService.formatBytes(progress.bytesReceived)}</span>
              <span>من أصل {AppUpdateService.formatBytes(progress.totalBytes || updateInfo.apkSize || 0)}</span>
            </div>
          </div>
        )}

        {/* Error message if download failed */}
        {isError && (
          <div className="mb-3 p-2.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-[11px]">
              {progress.errorMessage || 'تعذر استكمال التنزيل التلقائي. يمكنك التنزيل عبر المتصفح.'}
            </span>
          </div>
        )}

        {/* Cached APK Ready Banner */}
        {hasCachedApk && progress.state !== 'downloading' && (
          <div className="mb-3.5 p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <span className="font-bold text-emerald-200 block truncate">ملف التحديث محفوظ وجاهز على جهازك</span>
                <span className="text-[10px] text-emerald-400/80 block truncate">يمكنك تشغيل المثبت فوراً دون الحاجة لإعادة التنزيل</span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-200 border border-emerald-500/30 shrink-0">
              جاهز ✓
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1 relative z-10">
          {hasCachedApk && progress.state !== 'downloading' ? (
            <>
              <button
                onClick={handleInstallCached}
                disabled={isBusy}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#C8A24A] via-[#E2C374] to-[#B38D33] text-[#141009] font-black text-sm shadow-[0_4px_20px_rgba(200,162,74,0.35)] hover:shadow-[0_6px_25px_rgba(200,162,74,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                <ShieldCheck className="w-5 h-5 text-[#141009]" />
                <span>تثبيت التحديث الآن (الملف جاهز ✓)</span>
              </button>

              <button
                onClick={handleStartUpdate}
                disabled={isBusy}
                className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-[#E6C66E] text-xs font-semibold border border-[#C8A24A]/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>إعادة تنزيل التحديث من البداية</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleStartUpdate}
              disabled={isBusy}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#C8A24A] via-[#E2C374] to-[#B38D33] text-[#141009] font-bold text-sm shadow-[0_4px_20px_rgba(200,162,74,0.35)] hover:shadow-[0_6px_25px_rgba(200,162,74,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {progress.state === 'downloading' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري التنزيل ({progress.percent}%)...</span>
                </>
              ) : progress.state === 'installing' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#141009]" />
                  <span>جاري إطلاق مثبت الحزم...</span>
                </>
              ) : progress.state === 'completed' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-900" />
                  <span>تم التنزيل بنجاح ✓</span>
                </>
              ) : isError ? (
                <>
                  <Download className="w-4 h-4" />
                  <span>إعادة محاولة التنزيل والتثبيت</span>
                </>
              ) : (
                <>
                  <span>تحديث وتثبيت الآن</span>
                  <Download className="w-4 h-4 text-[#141009]" />
                </>
              )}
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onPostpone}
              disabled={isBusy}
              className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-stone-300 hover:text-white text-xs font-semibold border border-white/10 transition-all text-center disabled:opacity-40 cursor-pointer"
            >
              تذكيري في الجلسة القادمة
            </button>
          </div>
        </div>

        {/* Data Safety Note */}
        <p className="text-[10px] text-stone-500 text-center mt-3 flex items-center justify-center gap-1.5">
          <span>التحديث يحافظ على كل أذكارك وإعداداتك وتقدمك بالكامل دون مسح</span>
          <span className="text-emerald-400 font-bold">✓</span>
        </p>
      </div>
    </div>
  );
};
