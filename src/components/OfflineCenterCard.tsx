import React, { useState, useEffect } from 'react';
import { OfflineDatabase, OfflineDBStats } from '../services/offlineDatabase';
import { OfflineAudioPackService, OFFLINE_AUDIO_PACKS } from '../services/offlineAudioPackService';
import { VERIFIED_RECITERS } from '../data/surahsData';
import { StorageService } from '../services/storageService';
import {
  Database,
  Download,
  CheckCircle2,
  HardDrive,
  Volume2,
  BookOpen,
  Compass,
  Clock,
  RefreshCw,
  ShieldCheck,
  WifiOff
} from 'lucide-react';

interface OfflineCenterCardProps {
  compact?: boolean;
}

export const OfflineCenterCard: React.FC<OfflineCenterCardProps> = ({ compact = false }) => {
  const [dbStats, setDbStats] = useState<OfflineDBStats | null>(null);
  const [selectedReciterId, setSelectedReciterId] = useState<string>(
    () => StorageService.getSettings().selectedReciterId || 'alafasy'
  );
  const [isDownloadingQuran, setIsDownloadingQuran] = useState<boolean>(false);
  const [quranProgressPct, setQuranProgressPct] = useState<number>(0);
  const [quranStatusLabel, setQuranStatusLabel] = useState<string>('');
  const [packStatusMap, setPackStatusMap] = useState<Record<string, boolean>>({});
  const [downloadingPackId, setDownloadingPackId] = useState<string | null>(null);
  const [packProgressMap, setPackProgressMap] = useState<Record<string, { pct: number; cur: number; total: number }>>({});
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const loadStatsAndPacks = async (reciterId: string = selectedReciterId) => {
    await OfflineDatabase.initializeAndSeedCoreData();
    const stats = await OfflineDatabase.getDatabaseStats();
    setDbStats(stats);

    const statusObj: Record<string, boolean> = {};
    for (const pack of OFFLINE_AUDIO_PACKS) {
      statusObj[pack.id] = await OfflineAudioPackService.isPackDownloaded(pack.id, reciterId);
    }
    setPackStatusMap(statusObj);
  };

  useEffect(() => {
    loadStatsAndPacks(selectedReciterId);
  }, [selectedReciterId]);

  const handleDownloadFullQuranAndTafsir = async () => {
    if (isDownloadingQuran) return;
    setIsDownloadingQuran(true);
    setQuranProgressPct(2);
    setQuranStatusLabel('بدء الاتصال لتحميل المصحف الشريف كاملاً وتفسيره الميسر...');

    const res = await OfflineDatabase.downloadFullQuranAndTafsirForOffline((pct, label) => {
      setQuranProgressPct(pct);
      setQuranStatusLabel(label);
    });

    setIsDownloadingQuran(false);
    setFeedbackBanner(res.message);
    setTimeout(() => setFeedbackBanner(null), 5000);
    await loadStatsAndPacks(selectedReciterId);
  };

  const handleDownloadAudioPack = async (packId: string) => {
    if (downloadingPackId) return;
    setDownloadingPackId(packId);
    setPackProgressMap((prev) => ({
      ...prev,
      [packId]: { pct: 1, cur: 0, total: 1 }
    }));

    const res = await OfflineAudioPackService.downloadAudioPack(
      packId,
      selectedReciterId,
      (pct, cur, total) => {
        setPackProgressMap((prev) => ({
          ...prev,
          [packId]: { pct, cur, total }
        }));
      }
    );

    setDownloadingPackId(null);
    if (res.success) {
      setFeedbackBanner(`تم تنزيل وحفظ الحزمة الصوتية بنجاح (${res.downloadedCount} ملف صوتي) للعمل بدون إنترنت ✓`);
    } else {
      setFeedbackBanner('تعذر استكمال تنزيل بعض الملفات حالياً. يرجى التحقق من الاتصال والمحاولة مرة أخرى.');
    }
    setTimeout(() => setFeedbackBanner(null), 4500);
    await loadStatsAndPacks(selectedReciterId);
  };

  const selectedReciter = VERIFIED_RECITERS.find((r) => r.id === selectedReciterId) || VERIFIED_RECITERS[0];

  return (
    <div className="athar-card relative overflow-hidden space-y-4 border border-[#C8A24A]/50">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#C8A24A]/25">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-[#262012] border border-[#E6C66E]/60 text-[#E6C66E] shrink-0">
            <Database size={18} />
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-extrabold text-white">
                قاعدة البيانات المحلية والعمل ١٠٠٪ بدون إنترنت
              </h3>
              <span className="text-[10px] font-extrabold text-[#E6C66E] bg-[#C8A24A]/20 border border-[#E6C66E]/45 px-2 py-0.5 rounded-md">
                Offline-First نشط ✓
              </span>
            </div>
            <p className="text-[11px] text-[#C4B998] mt-0.5 leading-relaxed">
              تخزين محلي فوري للمواقيت الفلكية، المصحف والتفسير، الأذكار، الأحاديث، وحزم صوتيات الأذان والتلاوات
            </p>
          </div>
        </div>
      </div>

      {/* 1. Core Offline Engine Status Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-right">
        <div className="p-3 rounded-2xl bg-[#0D0C09] border border-[#C8A24A]/30 space-y-1">
          <div className="flex items-center justify-between text-[#E6C66E]">
            <Clock size={14} />
            <span className="text-[10px] font-extrabold">محرك فلكي محلي</span>
          </div>
          <p className="text-xs font-extrabold text-white">مواقيت الصلاة والقبلة</p>
          <span className="text-[10px] text-[#C4B998] block">
            حساب فوري بـ GPS بدون API ({dbStats?.citiesCount || 23} مدينة)
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[#0D0C09] border border-[#C8A24A]/30 space-y-1">
          <div className="flex items-center justify-between text-[#E6C66E]">
            <BookOpen size={14} />
            <span className="text-[10px] font-extrabold tabular-nums">
              {dbStats?.isFullQuranDownloaded ? '114/114 سورة' : `${dbStats?.cachedSurahsCount || 11}/114 سورة`}
            </span>
          </div>
          <p className="text-xs font-extrabold text-white">المصحف والتفسير</p>
          <span className="text-[10px] text-[#C4B998] block">
            {dbStats?.isFullQuranDownloaded ? 'محفوظ بالكامل محلياً ✓' : 'السور الأساسية محفوظة'}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[#0D0C09] border border-[#C8A24A]/30 space-y-1">
          <div className="flex items-center justify-between text-[#E6C66E]">
            <ShieldCheck size={14} />
            <span className="text-[10px] font-extrabold">١٠٠٪ محلي</span>
          </div>
          <p className="text-xs font-extrabold text-white">الأذكار والأحاديث والسنن</p>
          <span className="text-[10px] text-[#C4B998] block">
            {dbStats?.adhkarCount || 159} ذكراً واسماً · {dbStats?.sunanCount || 6} أوقات سنن
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[#0D0C09] border border-[#C8A24A]/30 space-y-1">
          <div className="flex items-center justify-between text-[#E6C66E]">
            <Compass size={14} />
            <span className="text-[10px] font-extrabold">بدون إنترنت</span>
          </div>
          <p className="text-xs font-extrabold text-white">حزم الصوتيات المحلية</p>
          <span className="text-[10px] text-[#C4B998] block tabular-nums">
            {dbStats?.cachedAudioCount || 8} ملفات صوتية محفوظة
          </span>
        </div>
      </div>

      {/* 2. One-Click Full Quran (114 Surahs) + Tafsir Al-Muyassar Local Database Download */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-l from-[#1C170E] via-[#13100A] to-[#0D0C09] border border-[#C8A24A]/45 space-y-2.5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="space-y-0.5 text-right flex-1 min-w-[200px]">
            <div className="flex items-center gap-2">
              <HardDrive size={15} className="text-[#E6C66E] shrink-0" />
              <h4 className="text-xs font-extrabold text-white">
                قاعدة بيانات المصحف الشريف كاملاً (114 سورة) والتفسير الميسر
              </h4>
            </div>
            <p className="text-[11px] text-[#C4B998] leading-relaxed">
              {dbStats?.isFullQuranDownloaded
                ? 'تم تنزيل وحفظ جميع سور القرآن الكريم (6,236 آية) مع التفسير الميسر على جهازك للعمل بدون إنترنت نهائياً.'
                : 'حمّل نص القرآن الكريم كاملاً بالرسم العثماني مع التفسير الميسر ليُحفظ دائماً في قاعدة البيانات المحلية.'}
            </p>
          </div>

          <button
            onClick={handleDownloadFullQuranAndTafsir}
            disabled={isDownloadingQuran}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all ${
              dbStats?.isFullQuranDownloaded
                ? 'bg-[#1A1710] text-[#E6C66E] border border-[#E6C66E]/50 hover:bg-[#242015]'
                : 'athar-btn-primary shadow-[0_4px_16px_rgba(200,162,74,0.35)]'
            }`}
          >
            {isDownloadingQuran ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span className="tabular-nums">جاري الحفظ ({quranProgressPct}%)</span>
              </>
            ) : dbStats?.isFullQuranDownloaded ? (
              <>
                <CheckCircle2 size={14} />
                <span>محفوظ بالكامل (تحديث)</span>
              </>
            ) : (
              <>
                <Download size={14} />
                <span>تنزيل المصحف والتفسير كاملاً</span>
              </>
            )}
          </button>
        </div>

        {isDownloadingQuran && (
          <div className="space-y-1 pt-1">
            <div className="w-full h-2 rounded-full bg-[#090806] border border-[#C8A24A]/30 overflow-hidden">
              <div
                className="h-full bg-gradient-to-l from-[#F3E5AB] via-[#E6C66E] to-[#C8A24A] transition-all duration-300"
                style={{ width: `${quranProgressPct}%` }}
              />
            </div>
            <p className="text-[10px] text-[#E6C66E] font-bold">{quranStatusLabel}</p>
          </div>
        )}
      </div>

      {/* 3. Offline Audio Packs Download Manager (Adhan, Adhkar, & Reciters) */}
      {!compact && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Volume2 size={15} className="text-[#E6C66E]" />
              <h4 className="text-xs font-extrabold text-white">
                تنزيل حزم الأصوات المحلية (الأذان وتلاوات القراء بدون إنترنت)
              </h4>
            </div>
            <select
              value={selectedReciterId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSelectedReciterId(nextId);
                const s = StorageService.getSettings();
                s.selectedReciterId = nextId;
                StorageService.saveSettings(s);
              }}
              aria-label="اختيار القارئ لتنزيل حزمة الصوتيات"
              className="bg-[#12100C] border border-[#C8A24A]/45 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-[#F3E5AB] focus:outline-none focus:border-[#E6C66E]"
            >
              {VERIFIED_RECITERS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nameArabic}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            {OFFLINE_AUDIO_PACKS.map((pack) => {
              const isDownloaded = Boolean(packStatusMap[pack.id]);
              const isThisDownloading = downloadingPackId === pack.id;
              const prog = packProgressMap[pack.id];

              return (
                <div
                  key={pack.id}
                  className="p-3 rounded-2xl bg-[#0D0C09] border border-[#C8A24A]/30 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-right flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-extrabold text-white">{pack.titleArabic}</span>
                        <span className="text-[10px] text-[#E6C66E] font-bold">
                          · {pack.estimatedSizeLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#C4B998] mt-0.5 leading-relaxed">
                        {pack.id.startsWith('pack_quran')
                          ? `${pack.subtitleArabic} (${selectedReciter.nameArabic})`
                          : pack.subtitleArabic}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDownloadAudioPack(pack.id)}
                      disabled={Boolean(downloadingPackId)}
                      className={`px-3 py-2 rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 shrink-0 transition-all ${
                        isDownloaded
                          ? 'bg-[#19160E] text-[#E6C66E] border border-[#E6C66E]/45 hover:bg-[#231F14]'
                          : 'bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-[#070707] shadow'
                      }`}
                    >
                      {isThisDownloading ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span className="tabular-nums">{prog?.pct || 0}%</span>
                        </>
                      ) : isDownloaded ? (
                        <>
                          <CheckCircle2 size={13} />
                          <span>تم التنزيل ✓</span>
                        </>
                      ) : (
                        <>
                          <Download size={13} />
                          <span>تنزيل للجهاز</span>
                        </>
                      )}
                    </button>
                  </div>

                  {isThisDownloading && prog && (
                    <div className="space-y-1">
                      <div className="w-full h-1.5 rounded-full bg-[#18150E] overflow-hidden">
                        <div
                          className="h-full bg-[#E6C66E] transition-all duration-200"
                          style={{ width: `${prog.pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[#C4B998] block tabular-nums">
                        جاري حفظ الملفات الصوتية محلياً ({prog.cur} من {prog.total})...
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {feedbackBanner && (
        <div className="p-3 rounded-xl bg-[#1F1A0F] border border-[#E6C66E]/60 flex items-center gap-2 text-xs text-[#F3E5AB]">
          <WifiOff size={15} className="text-[#E6C66E] shrink-0" />
          <span className="font-bold">{feedbackBanner}</span>
        </div>
      )}
    </div>
  );
};
