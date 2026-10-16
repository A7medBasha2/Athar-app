import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Coordinates, PrayerCalculationMethod, PrayerTimesData, PrayerAchievementsState, FastingTrackerState, DetailedSunanState } from '../types';
import { PrayerTimesService, formatPrayerTime12 } from '../services/prayerTimesService';
import { LiveActivityService, LiveActivityState } from '../services/liveActivityService';
import { ReminderEngine } from '../services/reminderService';
import { StorageService, DEFAULT_SUNAN_DETAILS } from '../services/storageService';
import { LUXURY_IMAGES } from '../data/storiesAndExploreData';
import { 
  Clock, Check, ChevronDown, ChevronUp,
  Trophy, Flame, Sparkles,
  Sun, Moon, Calendar, BookOpen, Heart, ShieldCheck, Droplets, Volume2,
  Users, Copy, CheckCheck, AlertCircle, Info
} from 'lucide-react';
import { useTranslation, i18n } from '../services/i18n';

interface PrayersViewProps {
  isActive?: boolean;
  coordinates: Coordinates;
  onLocationChange: (coords: Coordinates) => void;
  onSelectSurah?: (surahNumber: number, ayahNumber?: number) => void;
}

const parseMinHelper = (str?: string): number | null => {
  if (!str) return null;
  const m = str.match(/(\d{1,2})\s*:\s*(\d{1,2})/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
};

const minTo12hHelper = (totalMin: number): string => {
  const normalized = ((Math.round(totalMin) % 1440) + 1440) % 1440;
  const h24 = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const isEn = typeof i18n !== 'undefined' ? i18n.isEn() : false;
  const suffix = isEn ? (h24 >= 12 ? 'PM' : 'AM') : (h24 >= 12 ? 'م' : 'ص');
  const h12 = h24 % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${suffix}`;
};

export const PrayersView: React.FC<PrayersViewProps> = React.memo(({ coordinates, isActive = true }) => {
  const { t, tPrayer, isEn } = useTranslation();
  const initialMethod = useMemo<PrayerCalculationMethod>(
    () => StorageService.getSettings().calculationMethod || '5',
    []
  );

  const initialPrayerSnapshot = useMemo<PrayerTimesData>(
    () => PrayerTimesService.getInitialPrayerTimes(coordinates, initialMethod),
    [coordinates, initialMethod]
  );

  const [, setMethod] = useState<PrayerCalculationMethod>(initialMethod);
  const [prayerData, setPrayerData] = useState<PrayerTimesData>(initialPrayerSnapshot);
  const [prayerAchievements, setPrayerAchievements] = useState<PrayerAchievementsState>(() =>
    StorageService.getPrayerAchievements()
  );
  const [fastingTracker, setFastingTracker] = useState<FastingTrackerState>(() =>
    StorageService.getFastingTracker()
  );
  const [liveActivity, setLiveActivity] = useState<LiveActivityState>(() =>
    LiveActivityService.getState()
  );
  const countdownSeconds = liveActivity.remainingSeconds;

  // Unified Guide Sub-Tabs (New Muslim Guide + Prophetic Sunan + Tarawih + Eid + Qiyam + Istikhara + Janazah + Daily Adab)
  const [activeGuideTab, setActiveGuideTab] = useState<
    'wudu' | 'salah' | 'rawatib' | 'tarawih' | 'eid' | 'qiyam_witr' | 'istikhara' | 'janazah' | 'sunan'
  >('wudu');
  // Closed / Collapsed by default as requested
  const [isGuideExpanded, setIsGuideExpanded] = useState<boolean>(false);

  // Notice for when user attempts to log a prayer whose time hasn't arrived
  const [blockedPrayerNotice, setBlockedPrayerNotice] = useState<{
    prayerName: string;
    timeStr: string;
    message: string;
  } | null>(null);
  const noticeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copiedDuaId, setCopiedDuaId] = useState<string | null>(null);

  const loadData = useCallback(
    async (m: PrayerCalculationMethod) => {
      try {
        const data = await PrayerTimesService.getPrayerTimes(coordinates, m);
        setPrayerData(data);
      } catch {
        // Handled via local cache
      }
    },
    [coordinates]
  );

  useEffect(() => {
    if (!isActive) return;

    const currentMethod = StorageService.getSettings().calculationMethod || '5';
    setMethod(currentMethod);
    const cachedSync = PrayerTimesService.getInitialPrayerTimes(coordinates, currentMethod);
    setPrayerData(cachedSync);

    const unsubLive = LiveActivityService.subscribe(setLiveActivity);

    const onPrayersOrMidnightReset = () => {
      setPrayerAchievements(StorageService.getPrayerAchievements());
      setFastingTracker(StorageService.getFastingTracker());
      loadData(StorageService.getSettings().calculationMethod || '5');
    };
    window.addEventListener('athar_prayers_updated', onPrayersOrMidnightReset);
    window.addEventListener('athar_midnight_reset', onPrayersOrMidnightReset);

    return () => {
      unsubLive();
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      window.removeEventListener('athar_prayers_updated', onPrayersOrMidnightReset);
      window.removeEventListener('athar_midnight_reset', onPrayersOrMidnightReset);
    };
  }, [coordinates, loadData, isActive]);

  const checkPrayerTimeArrived = useCallback(
    (key: keyof PrayerAchievementsState['todayPrayers']): { arrived: boolean; prayerName: string; timeStr: string } => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      if (key === 'fajr') {
        const min = parseMinHelper(prayerData?.timings.fajr) ?? 300;
        const timeStr = formatPrayerTime12(prayerData?.timings.fajr);
        return { arrived: currentMinutes >= min, prayerName: 'الفجر', timeStr };
      }
      if (key === 'dhuhr') {
        const min = parseMinHelper(prayerData?.timings.dhuhr) ?? 720;
        const timeStr = formatPrayerTime12(prayerData?.timings.dhuhr);
        return { arrived: currentMinutes >= min, prayerName: 'الظهر', timeStr };
      }
      if (key === 'asr') {
        const min = parseMinHelper(prayerData?.timings.asr) ?? 930;
        const timeStr = formatPrayerTime12(prayerData?.timings.asr);
        return { arrived: currentMinutes >= min, prayerName: 'العصر', timeStr };
      }
      if (key === 'maghrib') {
        const min = parseMinHelper(prayerData?.timings.maghrib) ?? 1080;
        const timeStr = formatPrayerTime12(prayerData?.timings.maghrib);
        return { arrived: currentMinutes >= min, prayerName: 'المغرب', timeStr };
      }
      if (key === 'isha') {
        const min = parseMinHelper(prayerData?.timings.isha) ?? 1170;
        const timeStr = formatPrayerTime12(prayerData?.timings.isha);
        return { arrived: currentMinutes >= min, prayerName: 'العشاء', timeStr };
      }
      if (key === 'sunan') {
        const min = parseMinHelper(prayerData?.timings.fajr) ?? 300;
        const timeStr = formatPrayerTime12(prayerData?.timings.fajr);
        return { arrived: currentMinutes >= min, prayerName: 'السنن الرواتب', timeStr: `بعد الفجر (${timeStr})` };
      }
      if (key === 'qiyam') {
        const ishaMin = parseMinHelper(prayerData?.timings.isha) ?? 1170;
        const fajrMin = parseMinHelper(prayerData?.timings.fajr) ?? 300;
        const isNight = currentMinutes >= ishaMin || currentMinutes < fajrMin;
        const ishaTimeStr = formatPrayerTime12(prayerData?.timings.isha);
        return { arrived: isNight, prayerName: 'قيام الليل والوتر', timeStr: `بعد العشاء (${ishaTimeStr})` };
      }
      return { arrived: true, prayerName: '', timeStr: '' };
    },
    [prayerData?.timings]
  );

  const handleTogglePrayerCheck = useCallback(
    (key: keyof PrayerAchievementsState['todayPrayers']) => {
      const isCurrentlyDone = prayerAchievements.todayPrayers[key];
      // Untoggling an already logged prayer is allowed
      if (isCurrentlyDone) {
        const updated = StorageService.toggleTodayPrayer(key);
        setPrayerAchievements({ ...updated });
        return;
      }

      // Toggling ON: ensure the prayer's time has arrived
      const check = checkPrayerTimeArrived(key);
      if (!check.arrived) {
        if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
        setBlockedPrayerNotice({
          prayerName: check.prayerName,
          timeStr: check.timeStr,
          message: `لم يحن موعد صلاة ${check.prayerName} بعد، ويجب حلول وقت الصلاة لتسجيل أدائها (موعد الأذان: ${check.timeStr})`
        });
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate([70, 50, 70]);
          } catch {}
        }
        noticeTimerRef.current = setTimeout(() => {
          setBlockedPrayerNotice(null);
        }, 6000);
        return;
      }

      const updated = StorageService.toggleTodayPrayer(key);
      setPrayerAchievements({ ...updated });
    },
    [prayerAchievements.todayPrayers, checkPrayerTimeArrived]
  );

  const handleToggleSunanSlot = useCallback((slotKey: keyof DetailedSunanState) => {
    const updated = StorageService.toggleSunanSlot(slotKey);
    setPrayerAchievements({ ...updated });
  }, []);

  const completedSunanRakaat = useMemo(() => {
    const details = prayerAchievements.todaySunanDetails || DEFAULT_SUNAN_DETAILS;
    return Object.values(details).filter(Boolean).length * 2;
  }, [prayerAchievements.todaySunanDetails]);

  const handleCopyDuaText = useCallback((id: string, text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedDuaId(id);
        setTimeout(() => setCopiedDuaId(null), 2500);
      }).catch(() => {});
    }
  }, []);

  const formatCountdown = useCallback((totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, []);

  const prayerRows = useMemo(
    () => [
      { id: 'fajr', name: 'الفجر', key: 'fajr' as const, time: prayerData?.timings.fajr, desc: 'من طلوع الفجر الصادق حتى طلوع الشمس' },
      { id: 'sunrise', name: 'الشروق', key: null, time: prayerData?.timings.sunrise, desc: 'وقت انتهاء صلاة الفجر وبداية وقت الإشراق' },
      { id: 'dhuhr', name: 'الظهر', key: 'dhuhr' as const, time: prayerData?.timings.dhuhr, desc: 'من زوال الشمس عن كبد السماء حتى مصير ظل الشيء مثله' },
      { id: 'asr', name: 'العصر', key: 'asr' as const, time: prayerData?.timings.asr, desc: 'من مصير ظل الشيء مثله حتى اصفرار الشمس' },
      { id: 'maghrib', name: 'المغرب', key: 'maghrib' as const, time: prayerData?.timings.maghrib, desc: 'من غروب قرص الشمس حتى مغيب الشفق الأحمر' },
      { id: 'isha', name: 'العشاء', key: 'isha' as const, time: prayerData?.timings.isha, desc: 'من مغيب الشفق الأحمر حتى منتصف الليل' },
    ],
    [prayerData?.timings]
  );

  const loggedPrayersCount = useMemo(
    () =>
      [
        prayerAchievements.todayPrayers.fajr,
        prayerAchievements.todayPrayers.dhuhr,
        prayerAchievements.todayPrayers.asr,
        prayerAchievements.todayPrayers.maghrib,
        prayerAchievements.todayPrayers.isha,
      ].filter(Boolean).length,
    [prayerAchievements.todayPrayers]
  );

  const sunnahAndFastingDerived = useMemo(() => {
    const sunriseMin = parseMinHelper(prayerData?.timings.sunrise) ?? 360;
    const dhuhrMin = parseMinHelper(prayerData?.timings.dhuhr) ?? 720;
    const maghribMin = parseMinHelper(prayerData?.timings.maghrib) ?? 1080;
    const fajrMin = parseMinHelper(prayerData?.timings.fajr) ?? 290;

    const duhaStartFormatted = minTo12hHelper(sunriseMin + 15);
    const duhaEndFormatted = minTo12hHelper(dhuhrMin - 10);

    const nightDuration = (fajrMin + 1440 - maghribMin) % 1440 || 600;
    const lastThirdStartFormatted = minTo12hHelper((maghribMin + Math.floor((nightDuration * 2) / 3)) % 1440);
    const islamicMidnightFormatted = minTo12hHelper((maghribMin + Math.floor(nightDuration / 2)) % 1440);

    const todayIso = new Date().toISOString().split('T')[0];
    const isFastedToday = fastingTracker.fastedDates.includes(todayIso);
    const dayOfWeek = new Date().getDay();
    const hijriDayNum = parseInt(prayerData?.hijriDay || '0', 10);
    const isWhiteDay = hijriDayNum === 13 || hijriDayNum === 14 || hijriDayNum === 15;

    let fastingBadgeText = 'صيام التطوع والسنن';
    if (isWhiteDay) fastingBadgeText = `اليوم من الأيام البيض (${hijriDayNum} ${prayerData?.hijriMonth || ''})`;
    else if (dayOfWeek === 1) fastingBadgeText = 'اليوم الإثنين · سنة صيام الإثنين';
    else if (dayOfWeek === 4) fastingBadgeText = 'اليوم الخميس · سنة صيام الخميس';

    return {
      duhaStartFormatted,
      duhaEndFormatted,
      lastThirdStartFormatted,
      islamicMidnightFormatted,
      todayIso,
      isFastedToday,
      fastingBadgeText,
    };
  }, [prayerData?.timings, prayerData?.hijriDay, prayerData?.hijriMonth, fastingTracker.fastedDates]);

  return (
    <div className="athar-page-container text-right">
      {/* Top Luxury Header */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#C8A24A]/25">
        <div className="flex items-center gap-2 min-w-0">
          <Clock size={20} className="text-[#E6C66E] shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold text-white tracking-wide leading-tight">
              الصلاة
            </h1>
            <p className="text-[11px] font-bold text-[#C4B998] leading-normal whitespace-normal break-words">
              {prayerData?.locationName ||
                coordinates.formattedLocation ||
                (coordinates.district
                  ? `${coordinates.city} - ${coordinates.district}`
                  : coordinates.city)}
            </p>
          </div>
        </div>
      </div>

      {/* 1. Golden Mihrab Arch Dome with Crescent & Star */}
      <div className="relative mx-auto w-full max-w-sm pt-2">
        <div className="relative overflow-hidden athar-mihrab-arch border-2 border-[#C8A24A]/65 bg-gradient-to-b from-[#1A160E] via-[#0F0D09] to-[#080705] shadow-[0_15px_45px_rgba(0,0,0,0.95)] pt-10 pb-6 px-6 text-center">
          <img
            src={LUXURY_IMAGES.mosqueSplash}
            alt="محراب الصلاة"
            referrerPolicy="no-referrer"
            loading="eager"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover object-top opacity-35 pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080705] via-[#080705]/65 to-transparent pointer-events-none" />
          <div className="absolute inset-2.5 athar-mihrab-arch border border-[#E6C66E]/30 pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-[#1F1A10]/90 border border-[#E6C66E]/55 flex items-center justify-center text-[#E6C66E] shadow-[0_0_20px_rgba(230,198,110,0.3)] mb-3">
              <Moon size={22} className="fill-[#E6C66E]" />
            </div>

            <span className="text-xs font-bold text-[#C4B998] tracking-wide">
              الصلاة القادمة
            </span>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-quran mt-1">
              {prayerData?.nextPrayer?.nameArabic || 'المغرب'}
            </h2>

            <div className="mt-2 text-2xl sm:text-3xl font-black text-[#E6C66E] font-mono tabular-nums tracking-wider">
              {formatPrayerTime12(prayerData?.nextPrayer?.time)}
            </div>

            <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#15130D]/90 border border-[#C8A24A]/45 text-xs font-extrabold text-[#F3E5AB]">
              <span>متبقي للأذان:</span>
              <span className="font-mono tabular-nums text-[#E6C66E]">
                {formatCountdown(countdownSeconds)}
              </span>
            </div>

            {/* Live Activity Window Progress Bar */}
            <div className="w-full mt-4 pt-3 border-t border-[#C8A24A]/25 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-[#C4B998]">
                <span>{liveActivity.currentPrayerName} ({liveActivity.currentPrayerTime12})</span>
                <span className="text-[#E6C66E] font-mono tabular-nums">
                  {Math.round(liveActivity.progressPercent)}% من الوقت
                </span>
                <span>{liveActivity.nextPrayerName} ({liveActivity.nextPrayerTime12})</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#19150E] border border-[#C8A24A]/40 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-[#FFF2C2] via-[#E6C66E] to-[#A67C22] shadow-[0_0_10px_rgba(230,198,110,0.75)] transition-all duration-700"
                  style={{ width: `${liveActivity.progressPercent}%` }}
                />
              </div>

              {/* Quick Launch Button for Royal Full-Screen Adhan */}
              <div className="mt-2.5">
                <button
                  onClick={() => {
                    const s = StorageService.getSettings();
                    const currentTargetId =
                      prayerData?.currentPrayer && prayerData.currentPrayer.id !== 'sunrise'
                        ? prayerData.currentPrayer.id
                        : (prayerData?.nextPrayer?.id !== 'sunrise' ? prayerData?.nextPrayer?.id : 'fajr') || 'dhuhr';
                    ReminderEngine.launchFullScreenAdhan({
                      prayerKey: (currentTargetId as any) || 'dhuhr',
                      voiceId: s.adhanVoice || 'makkah',
                      mode: s.adhanMode || 'full',
                      isPreview: true,
                    });
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-l from-[#E6C66E] via-[#C8A24A] to-[#A6802B] text-[#070707] border border-[#FFF2C2] text-xs font-extrabold flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(230,198,110,0.3)] transition-all active:scale-98"
                >
                  <Volume2 size={14} className="text-[#070707] shrink-0" />
                  <span>شاشة الأذان الملكية الكاملة</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* 2. Main Prayer Times List */}
      <div className="space-y-2.5 pt-1">
        {prayerRows.map((row) => {
          const isNext = prayerData?.nextPrayer?.id === row.id;
          const isCompleted = row.key ? prayerAchievements.todayPrayers[row.key] : false;

          return (
            <div
              key={row.id}
              onClick={() => {
                if (row.key) handleTogglePrayerCheck(row.key);
              }}
              className={`relative overflow-hidden flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                isNext
                  ? 'bg-gradient-to-l from-[#E6C66E] via-[#C8A24A] to-[#A6802B] text-[#070707] border-[#F3E5AB] shadow-[0_6px_25px_rgba(200,162,74,0.38)] scale-[1.01]'
                  : 'bg-[#12100C] border-[#C8A24A]/28 hover:border-[#C8A24A]/60 text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-sm ${
                    isNext
                      ? 'bg-[#070707]/15 text-[#070707] border border-[#070707]/25'
                      : isCompleted
                      ? 'bg-[#C8A24A]/25 text-[#E6C66E] border border-[#C8A24A]/60'
                      : 'bg-[#1B1812] text-[#E6C66E] border border-[#C8A24A]/30'
                  }`}
                >
                  {isCompleted ? <Check size={16} strokeWidth={3} /> : row.name.charAt(0)}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-base font-extrabold ${isNext ? 'text-[#070707]' : 'text-white'}`}>
                      {row.name}
                    </span>
                    {isNext && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#070707]/15 text-[#070707] font-black">
                        الصلاة القادمة
                      </span>
                    )}
                    {isCompleted && !isNext && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C8A24A]/20 text-[#E6C66E] font-bold">
                        تمت الصلاة ✓
                      </span>
                    )}
                  </div>
                  <p className={`text-[10px] mt-0.5 hidden sm:block ${isNext ? 'text-[#070707]/80 font-semibold' : 'text-[#C4B998]'}`}>
                    {row.desc}
                  </p>
                </div>
              </div>

              <div className="text-left font-mono tabular-nums">
                <span className={`text-base font-black ${isNext ? 'text-[#070707]' : 'text-[#E6C66E]'}`}>
                  {formatPrayerTime12(row.time)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Prayer Achievement & Daily Tracker Card */}
      <div className="athar-card space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#1F1B12] border border-[#C8A24A]/40 rounded-xl text-[#E6C66E]">
              <Trophy size={18} />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-white">سجل إنجازات الصلاة اليومي</h3>
              <p className="text-[10px] text-[#C4B998]">تسجيل الصلوات المفروضة والسنن المؤكدة</p>
            </div>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 bg-[#1F1B12] text-[#E6C66E] rounded-xl text-xs font-extrabold border border-[#C8A24A]/45">
            <Flame size={13} className="fill-[#E6C66E]" />
            <span>{prayerAchievements.streakDays} أيام</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[#C4B998] bg-[#0B0A08] p-2.5 rounded-xl border border-[#C8A24A]/25">
          <span>الصلوات المكتوبة المنجزة اليوم:</span>
          <span className="font-extrabold text-[#E6C66E] tabular-nums">
            {loggedPrayersCount} من 5 صلوات
          </span>
        </div>

        {/* 5 Obligatory Prayers Buttons */}
        <div className="grid grid-cols-5 gap-1.5 text-center">
          {[
            { id: 'fajr' as const, label: 'الفجر' },
            { id: 'dhuhr' as const, label: 'الظهر' },
            { id: 'asr' as const, label: 'العصر' },
            { id: 'maghrib' as const, label: 'المغرب' },
            { id: 'isha' as const, label: 'العشاء' },
          ].map((item) => {
            const isDone = prayerAchievements.todayPrayers[item.id];
            return (
              <button
                key={item.id}
                onClick={() => handleTogglePrayerCheck(item.id)}
                className={`p-2 rounded-2xl border transition-all flex flex-col items-center gap-1 active:scale-95 ${
                  isDone
                    ? 'bg-[#C8A24A] text-[#070707] border-[#F3E5AB] shadow-md font-extrabold'
                    : 'bg-[#0C0B09] border-[#C8A24A]/25 text-[#C4B998] hover:border-[#C8A24A]/60'
                }`}
              >
                <span className="text-[11px] font-bold">{item.label}</span>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                  isDone ? 'bg-[#070707] text-[#E6C66E]' : 'border border-[#C8A24A]/35 bg-[#161410]'
                }`}>
                  {isDone && <Check size={12} strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Inline Notice When Tapping a Prayer Before Its Time */}
        {blockedPrayerNotice && (
          <div className="p-3 rounded-2xl bg-gradient-to-l from-[#2D1F0E] via-[#1C140A] to-[#120F08] border-2 border-[#E6C66E] text-right animate-fadeIn flex items-start justify-between gap-2.5 shadow-lg">
            <div className="flex items-start gap-2.5 min-w-0">
              <Clock size={16} className="text-[#E6C66E] shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span className="text-[11px] font-black text-[#FFF2C2] block">
                  ⚠️ تنبيه دخول وقت الصلاة:
                </span>
                <p className="text-xs font-bold text-[#F3E5AB] mt-0.5 leading-relaxed">
                  {blockedPrayerNotice.message}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBlockedPrayerNotice(null)}
              className="text-[11px] text-[#C4B998] hover:text-white px-2 py-0.5 rounded-lg bg-black/50 border border-[#C8A24A]/35 shrink-0"
              aria-label="إغلاق التنبيه"
            >
              ✕
            </button>
          </div>
        )}

        {/* Professional, Tranquil Breakdown of the 12 Sunan Rawatib (Sorted by Prayer Order) */}
        <div className="pt-3 border-t border-[#C8A24A]/25 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#F3E5AB]">
              <Sparkles size={14} className="text-[#E6C66E]" />
              <span>السنن الرواتب المؤكدة (١٢ ركعة):</span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${
                completedSunanRakaat === 12
                  ? 'bg-[#C8A24A]/25 text-[#FFF2C2] border-[#E6C66E] shadow-sm'
                  : 'bg-[#14120D] text-[#E6C66E] border-[#C8A24A]/35'
              }`}>
                {completedSunanRakaat} / ١٢ ركعة
              </span>
            </div>
          </div>

          <p className="text-[10px] text-[#C4B998] leading-relaxed">
            «مَنْ صَلَّى اثْنَتَيْ عَشْرَةَ رَكْعَةً فِي يَوْمٍ وَلَيْلَةٍ بُنِيَ لَهُ بِهِنَّ بَيْتٌ فِي الْجَنَّةِ» — يمكنك تسجيلها أو إزالتها بحريّة كاملة دون التأثير على الشجرة.
          </p>

          {/* Slots arranged by prayer in proper canonical order:
              - الفجر: ٢ قبل
              - الظهر: ٢ و ٢ قبل ثم ٢ بعد
              - المغرب: ٢ بعد
              - العشاء: ٢ بعد */}
          <div className="space-y-2 pt-1">
            {/* 1. سنة الفجر */}
            <div className="p-2.5 rounded-xl bg-[#0F0D09] border border-[#C8A24A]/25 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#E6C66E]">
                <span>صلاة الفجر (ركعتان قبل الفريضة):</span>
                <span className="text-[9.5px] text-[#C4B998]">خير من الدنيا وما فيها</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleSunanSlot('fajr_before')}
                className={`w-full p-2 rounded-lg border text-xs font-bold flex items-center justify-between px-3 transition-all active:scale-98 ${
                  prayerAchievements.todaySunanDetails?.fajr_before
                    ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#FFF2C2]'
                    : 'bg-[#16130D] border-[#C8A24A]/20 text-[#C4B998] hover:border-[#C8A24A]/50'
                }`}
              >
                <span>ركعتان قبل صلاة الفجر (٢ قبل)</span>
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  prayerAchievements.todaySunanDetails?.fajr_before ? 'bg-[#E6C66E] text-[#080705] font-black' : 'border border-[#C8A24A]/40'
                }`}>
                  {prayerAchievements.todaySunanDetails?.fajr_before && <Check size={10} strokeWidth={3} />}
                </div>
              </button>
            </div>

            {/* 2. سنة الظهر (٢ و ٢ قبل ثم ٢ بعد) */}
            <div className="p-2.5 rounded-xl bg-[#0F0D09] border border-[#C8A24A]/25 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#E6C66E]">
                <span>صلاة الظهر (٦ ركعات: ٤ قبل + ٢ بعد):</span>
                <span className="text-[9.5px] text-[#C4B998]">مثنى مثنى بتسليمتين قبل الظهر</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleSunanSlot('dhuhr_before_1')}
                  className={`p-2 rounded-lg border text-[11px] font-bold flex items-center justify-between px-2.5 transition-all active:scale-98 ${
                    prayerAchievements.todaySunanDetails?.dhuhr_before_1
                      ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#FFF2C2]'
                      : 'bg-[#16130D] border-[#C8A24A]/20 text-[#C4B998] hover:border-[#C8A24A]/50'
                  }`}
                >
                  <span>٢ قبل الظهر (١)</span>
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                    prayerAchievements.todaySunanDetails?.dhuhr_before_1 ? 'bg-[#E6C66E] text-[#080705] font-black' : 'border border-[#C8A24A]/40'
                  }`}>
                    {prayerAchievements.todaySunanDetails?.dhuhr_before_1 && <Check size={8} strokeWidth={3} />}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleSunanSlot('dhuhr_before_2')}
                  className={`p-2 rounded-lg border text-[11px] font-bold flex items-center justify-between px-2.5 transition-all active:scale-98 ${
                    prayerAchievements.todaySunanDetails?.dhuhr_before_2
                      ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#FFF2C2]'
                      : 'bg-[#16130D] border-[#C8A24A]/20 text-[#C4B998] hover:border-[#C8A24A]/50'
                  }`}
                >
                  <span>٢ قبل الظهر (٢)</span>
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                    prayerAchievements.todaySunanDetails?.dhuhr_before_2 ? 'bg-[#E6C66E] text-[#080705] font-black' : 'border border-[#C8A24A]/40'
                  }`}>
                    {prayerAchievements.todaySunanDetails?.dhuhr_before_2 && <Check size={8} strokeWidth={3} />}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleSunanSlot('dhuhr_after')}
                  className={`p-2 rounded-lg border text-[11px] font-bold flex items-center justify-between px-2.5 transition-all active:scale-98 ${
                    prayerAchievements.todaySunanDetails?.dhuhr_after
                      ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#FFF2C2]'
                      : 'bg-[#16130D] border-[#C8A24A]/20 text-[#C4B998] hover:border-[#C8A24A]/50'
                  }`}
                >
                  <span>٢ بعد الظهر</span>
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                    prayerAchievements.todaySunanDetails?.dhuhr_after ? 'bg-[#E6C66E] text-[#080705] font-black' : 'border border-[#C8A24A]/40'
                  }`}>
                    {prayerAchievements.todaySunanDetails?.dhuhr_after && <Check size={8} strokeWidth={3} />}
                  </div>
                </button>
              </div>
            </div>

            {/* 3. سنة المغرب وسنة العشاء */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <div className="p-2.5 rounded-xl bg-[#0F0D09] border border-[#C8A24A]/25 space-y-1">
                <span className="text-[10.5px] font-bold text-[#E6C66E] block">صلاة المغرب (ركعتان بعدها):</span>
                <button
                  type="button"
                  onClick={() => handleToggleSunanSlot('maghrib_after')}
                  className={`w-full p-2 rounded-lg border text-xs font-bold flex items-center justify-between px-3 transition-all active:scale-98 ${
                    prayerAchievements.todaySunanDetails?.maghrib_after
                      ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#FFF2C2]'
                      : 'bg-[#16130D] border-[#C8A24A]/20 text-[#C4B998] hover:border-[#C8A24A]/50'
                  }`}
                >
                  <span>ركعتان بعد المغرب (٢ بعد)</span>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    prayerAchievements.todaySunanDetails?.maghrib_after ? 'bg-[#E6C66E] text-[#080705] font-black' : 'border border-[#C8A24A]/40'
                  }`}>
                    {prayerAchievements.todaySunanDetails?.maghrib_after && <Check size={10} strokeWidth={3} />}
                  </div>
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-[#0F0D09] border border-[#C8A24A]/25 space-y-1">
                <span className="text-[10.5px] font-bold text-[#E6C66E] block">صلاة العشاء (ركعتان بعدها):</span>
                <button
                  type="button"
                  onClick={() => handleToggleSunanSlot('isha_after')}
                  className={`w-full p-2 rounded-lg border text-xs font-bold flex items-center justify-between px-3 transition-all active:scale-98 ${
                    prayerAchievements.todaySunanDetails?.isha_after
                      ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#FFF2C2]'
                      : 'bg-[#16130D] border-[#C8A24A]/20 text-[#C4B998] hover:border-[#C8A24A]/50'
                  }`}
                >
                  <span>ركعتان بعد العشاء (٢ بعد)</span>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    prayerAchievements.todaySunanDetails?.isha_after ? 'bg-[#E6C66E] text-[#080705] font-black' : 'border border-[#C8A24A]/40'
                  }`}>
                    {prayerAchievements.todaySunanDetails?.isha_after && <Check size={10} strokeWidth={3} />}
                  </div>
                </button>
              </div>
            </div>

            {/* 4. قيام الليل والوتر */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => handleTogglePrayerCheck('qiyam')}
                className={`w-full p-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-between px-3 transition-all active:scale-98 ${
                  prayerAchievements.todayPrayers.qiyam
                    ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#FFF2C2]'
                    : 'bg-[#0F0D09] border-[#C8A24A]/25 text-[#C4B998] hover:border-[#C8A24A]/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Moon size={14} className="text-[#E6C66E]" />
                  <span>قيام الليل وصلاة الوتر (تطوع مبارك)</span>
                </div>
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  prayerAchievements.todayPrayers.qiyam ? 'bg-[#E6C66E] text-[#080705] font-black' : 'border border-[#C8A24A]/40'
                }`}>
                  {prayerAchievements.todayPrayers.qiyam && <Check size={10} strokeWidth={3} />}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. أوقات السنن النبوية وصيام التطوع اليوم */}
      <div className="athar-card space-y-3 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-[#C8A24A]/25">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-[#1F1B12] border border-[#C8A24A]/40 text-[#E6C66E]">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-white">مواقيت السنن وصيام التطوع</h3>
              <p className="text-[10px] text-[#C4B998]">الضحى · الثلث الأخير من الليل · صيام التطوع</p>
            </div>
          </div>
        </div>

        {/* Sunnah Timings Summary Cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-2xl bg-[#0B0A08] border border-[#C8A24A]/30 space-y-1">
            <div className="flex items-center gap-1.5 text-[#E6C66E] font-extrabold text-[11px]">
              <Sun size={13} />
              <span>صلاة الضحى</span>
            </div>
            <div className="font-mono font-bold text-white text-xs">
              {sunnahAndFastingDerived.duhaStartFormatted} — {sunnahAndFastingDerived.duhaEndFormatted}
            </div>
            <span className="text-[9.5px] text-[#C4B998] block">
              ركعتان إلى ٨ ركعات · صدقة عن ٣٦٠ مفصلاً
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-[#0B0A08] border border-[#C8A24A]/30 space-y-1">
            <div className="flex items-center gap-1.5 text-[#E6C66E] font-extrabold text-[11px]">
              <Moon size={13} />
              <span>الثلث الأخير من الليل</span>
            </div>
            <div className="font-mono font-bold text-white text-xs">
              يبدأ {sunnahAndFastingDerived.lastThirdStartFormatted}
            </div>
            <span className="text-[9.5px] text-[#C4B998] block">
              منتصف الليل الشرعي: {sunnahAndFastingDerived.islamicMidnightFormatted}
            </span>
          </div>
        </div>

        {/* Fasting Tracker Bar - No checkmark icon on the right as explicitly requested */}
        <div className="p-2.5 rounded-2xl bg-[#0B0A08] border border-[#C8A24A]/25 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-[#E6C66E] shrink-0" />
              <span className="font-extrabold text-[11px] text-white truncate">
                {sunnahAndFastingDerived.fastingBadgeText}
              </span>
            </div>
            <p className="text-[10px] text-[#C4B998] mt-0.5">
              إجمالي أيام صيامك المسجلة: <strong className="text-[#E6C66E]">{fastingTracker.totalFastedDays} يوم</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              const updated = StorageService.toggleFastingDate(sunnahAndFastingDerived.todayIso);
              setFastingTracker(updated);
            }}
            className={`px-3.5 py-2 rounded-xl font-extrabold text-xs shrink-0 border transition-all active:scale-95 ${
              sunnahAndFastingDerived.isFastedToday
                ? 'bg-[#C8A24A] text-[#070707] border-[#F3E5AB] shadow'
                : 'bg-[#161410] text-[#E6C66E] border-[#C8A24A]/40 hover:border-[#E6C66E]'
            }`}
          >
            {sunnahAndFastingDerived.isFastedToday ? (
              <span>صائم اليوم تقبل الله</span>
            ) : (
              <span>تسجيل صيام اليوم</span>
            )}
          </button>
        </div>
      </div>

      {/* 5. دليل المسلم الجديد وفقه الصلاة والسنن النبوية الشامل (مدمج ومنظم ومغلق افتراضياً) */}
      <div className="athar-card-gold space-y-3.5 text-xs">
        {/* Clickable Header: Closed by default, Arrow points DOWN when closed, UP when open */}
        <div 
          onClick={() => setIsGuideExpanded(!isGuideExpanded)}
          className="flex items-center justify-between cursor-pointer pb-2 border-b border-[#C8A24A]/35 select-none"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2.5 rounded-2xl bg-[#1F1B12] border border-[#E6C66E]/55 text-[#E6C66E] shadow-inner shrink-0">
              <BookOpen size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm font-extrabold text-[#F3E5AB]">
                  دليل المسلم وفقه الصلاة والسنن النبوية
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#C8A24A]/25 border border-[#E6C66E]/60 text-[9.5px] font-extrabold text-[#E6C66E]">
                  ٩ أبواب فقهية موثقة
                </span>
              </div>
              <p className="text-[10px] text-[#C4B998] mt-0.5 leading-relaxed">
                الوضوء · الصلاة الصحيحة · السنن الرواتب · صلاة التراويح · صلاة العيدين · قيام الليل · الاستخارة · الجنازة · الآداب
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 pr-1">
            <span className="text-[10px] font-bold text-[#E6C66E] hidden sm:inline">
              {isGuideExpanded ? 'طيّ الدليل' : 'فتح الدليل'}
            </span>
            <button 
              type="button"
              className="p-1.5 rounded-xl bg-[#16130D] text-[#E6C66E] border border-[#C8A24A]/40 hover:bg-[#201A10] transition-colors"
              aria-label={isGuideExpanded ? 'إغلاق الدليل' : 'فتح الدليل'}
            >
              {isGuideExpanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
            </button>
          </div>
        </div>

        {/* Expandable Content Container */}
        {isGuideExpanded && (
          <div className="space-y-3.5 animate-fadeIn">
            {/* Enhanced Spacious Royal Navigation Bar (Unclipped, Generously Padded & Smooth Scrolling) */}
            <div className="relative rounded-2xl bg-[#0F0D0A] border border-[#C8A24A]/35 p-1.5 shadow-inner">
              <div className="flex items-center gap-2 overflow-x-auto py-1 px-1 no-scrollbar scroll-smooth">
                {[
                  { id: 'wudu' as const, label: 'صفة الوضوء', icon: <Droplets size={13} /> },
                  { id: 'salah' as const, label: 'الصلاة الصحيحة', icon: <ShieldCheck size={13} /> },
                  { id: 'rawatib' as const, label: 'السنن الرواتب (١٢)', icon: <Sparkles size={13} /> },
                  { id: 'tarawih' as const, label: 'صلاة التراويح', icon: <Flame size={13} /> },
                  { id: 'eid' as const, label: 'صلاة العيدين', icon: <Calendar size={13} /> },
                  { id: 'qiyam_witr' as const, label: 'قيام الليل والوتر', icon: <Moon size={13} /> },
                  { id: 'istikhara' as const, label: 'صلاة الاستخارة', icon: <Heart size={13} /> },
                  { id: 'janazah' as const, label: 'صلاة الجنازة', icon: <Users size={13} /> },
                  { id: 'sunan' as const, label: 'السنن والآداب', icon: <Sun size={13} /> },
                ].map((tab) => {
                  const isActiveTab = activeGuideTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveGuideTab(tab.id)}
                      className={`px-3.5 py-2.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 font-extrabold text-xs leading-normal select-none ${
                        isActiveTab
                          ? 'bg-gradient-to-l from-[#FFF4C8] via-[#E6C66E] to-[#B88A2D] text-[#080705] shadow-[0_3px_12px_rgba(230,198,110,0.4)] scale-[1.02]'
                          : 'bg-[#14120D] border border-[#C8A24A]/30 text-[#D8CEB6] hover:text-white hover:border-[#E6C66E]/70 hover:bg-[#1C1810]'
                      }`}
                    >
                      <span className="shrink-0">{tab.icon}</span>
                      <span className="leading-tight">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ==============================================================
                باب ١: صفة الوضوء النبوي الصحيح
               ============================================================== */}
            {activeGuideTab === 'wudu' && (
              <div className="bg-[#0B0A08] border border-[#C8A24A]/35 rounded-2xl p-3.5 space-y-3">
                <div className="p-2.5 rounded-xl bg-[#19150D] border border-[#C8A24A]/40 text-center">
                  <p className="font-quran text-sm text-[#F3E5AB] leading-relaxed">
                    «مَنْ تَوَضَّأَ نَحْوَ وُضُوئِي هَذَا ثُمَّ صَلَّى رَكْعَتَيْنِ لَا يُحَدِّثُ فِيهِمَا نَفْسَهُ غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ»
                  </p>
                  <span className="text-[10px] text-[#E6C66E] font-bold block mt-0.5">رواه البخاري ومسلم عن عثمان بن عفان رضي الله عنه</span>
                </div>

                <div className="space-y-2">
                  {[
                    { step: '١. النية والتسمية', detail: 'تنوي الوضوء بقلبك (النية محلها القلب ولا يُشرع التلفظ بها جهراً)، ثم تقول: «بِسْمِ اللَّهِ».' },
                    { step: '٢. غسل الكفين ثلاثاً', detail: 'تغسل كفيك ثلاث مرات في أول الوضوء وتخلل بين الأصابع.' },
                    { step: '٣. المضمضة والاستنشاق ثلاثاً', detail: 'تتمضمض وتستنشق الماء بكف واحدة بأنفك وتستنثر بيدك اليسرى ثلاث مرات، وتُبالغ إلا أن تكون صائماً.' },
                    { step: '٤. غسل الوجه كاملاً ثلاثاً', detail: 'تغسل وجهك من منابت شعر الرأس إلى أسفل الذقن طولاً، ومن شحمة الأذن إلى شحمة الأذن عرضاً مع تخليل اللحية الكثة.' },
                    { step: '٥. غسل اليدين إلى المرفقين ثلاثاً', detail: 'تبدأ باليد اليمنى من أطراف الأصابع متضمناً المرفق ثلاثاً، ثم اليد اليسرى كذلك ثلاثاً.' },
                    { step: '٦. مسح الرأس والأذنين مرة واحدة', detail: 'تبلّ يديك وتمسح رأسك كله من مقدمته إلى قفاه ثم ترجع بهما، وتمسح باطن الأذنين بالسبابتين وظاهرهما بالإبهامين.' },
                    { step: '٧. غسل الرجلين إلى الكعبين ثلاثاً', detail: 'تغسل رجلك اليمنى مع الكعبين ثلاث مرات مع تخليل ما بين أصابع القدم، ثم اليسرى ثلاثاً. قال ﷺ: «ويلٌ للأعقاب من النار».' },
                  ].map((w, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-[#14120D] border border-[#C8A24A]/25">
                      <span className="font-extrabold text-[#F3E5AB] block">{w.step}</span>
                      <p className="text-[11px] text-[#C4B998] mt-0.5 leading-relaxed">{w.detail}</p>
                    </div>
                  ))}

                  {/* الذكر المأثور بعد الوضوء */}
                  <div className="p-3 rounded-xl bg-[#19150D] border border-[#E6C66E]/45 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-[#E6C66E]">
                        ٨. الذكر المستحب بعد الفراغ من الوضوء (تُفتح له أبواب الجنة الثمانية):
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyDuaText(
                            'wudu_dua',
                            'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ، اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ، وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ'
                          )
                        }
                        className="px-2 py-0.5 rounded-lg bg-[#0B0A08] border border-[#C8A24A]/40 text-[#E6C66E] text-[10px] font-bold flex items-center gap-1 hover:border-[#E6C66E]"
                      >
                        {copiedDuaId === 'wudu_dua' ? <CheckCheck size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        <span>{copiedDuaId === 'wudu_dua' ? 'تم النسخ' : 'نسخ الذكر'}</span>
                      </button>
                    </div>
                    <p className="font-quran text-sm text-[#FFF2C2] leading-relaxed text-justify">
                      «أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ، اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ، وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ»
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ==============================================================
                باب ٢: صفة الصلاة الصحيحة كما صلاها النبي ﷺ
               ============================================================== */}
            {activeGuideTab === 'salah' && (
              <div className="bg-[#0B0A08] border border-[#C8A24A]/35 rounded-2xl p-3.5 space-y-3">
                <div className="p-2.5 rounded-xl bg-[#19150D] border border-[#C8A24A]/40 text-center">
                  <p className="font-quran text-sm text-[#F3E5AB]">
                    قال رسول الله ﷺ: «صَلُّوا كَمَا رَأَيْتُمُونِي أُصَلِّي» (رواه البخاري)
                  </p>
                </div>

                <div className="space-y-2">
                  {[
                    {
                      title: '١. استقبال القبلة وتكبيرة الإحرام',
                      text: 'تقف مستقبلاً الكعبة المشرفة بسكينة ووقار، تنوي الصلاة بقلبك دون تلفظ، وترفع يديك حذو منكبيك أو فروع أذنيك قائلاً: «اللَّهُ أَكْبَرُ»، ثم تضع كفك اليمنى على ظهر كفك اليسرى ورسغها وساعدها على الصدر.'
                    },
                    {
                      title: '٢. دعاء الاستفتاح وقراءة الفاتحة',
                      text: 'تستفتح الصلاة بقول: «سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، وَتَبَارَكَ اسْمُكَ، وَتَعَالَى جَدُّكَ، وَلَا إِلَهَ غَيْرُكَ»، ثم تستعيذ بالله من الشيطان الرجيم وتبسمل سراً، وتقرأ سورة الفاتحة بترتيل وهدوء (وهي ركن لا صلاة لمن لم يقرأ بها)، وتقول بعدها «آمين»، ثم تقرأ ما تيسر من القرآن في الركعتين الأوليين.'
                    },
                    {
                      title: '٣. الركوع والاعتدال بطمأنينة',
                      text: 'تكبّر رافعاً يديك وتركع باسطاً ظهرك وممسكاً ركبتيك بأصابع مفرجة، وتقول: «سُبْحَانَ رَبِّيَ الْعَظِيمِ» (ثلاثاً أو أكثر). ثم ترفع رأسك قائلاً: «سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ»، فإذا استويت قائماً تقول: «رَبَّنَا وَلَكَ الْحَمْدُ حَمْدًا كَثِيرًا طَيِّبًا مُبَارَكًا فِيهِ».'
                    },
                    {
                      title: '٤. السجود على الأعضاء السبعة والجلوس بين السجدتين',
                      text: 'تكبّر وتسجد مطمئناً على سبعة أعضاء: (الجبهة مع الأنف، وبطون الكفين، والركبتين، وأطراف أصابع القدمين مستقبلاً بها القبلة)، وتجافي عضديك عن جنبيك وبطنك عن فخذيك، وتقول: «سُبْحَانَ رَبِّيَ الْأَعْلَى» (ثلاثاً) وتجتهد في الدعاء. ثم ترفع مكبراً وتجلس مطمئناً وتقول: «رَبِّ اغْفِرْ لِي، رَبِّ اغْفِرْ لِي»، ثم تسجد السجدة الثانية مثل الأولى.'
                    },
                    {
                      title: '٥. التشهد الأوسط والتشهد الأخير والصلاة الإبراهيمية',
                      text: 'في نهاية الركعة الثانية تجلس مفترشاً وتقرأ التحيات: «التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ». وفي آخر ركعة تضيف الصلاة الإبراهيمية («اللهم صل على محمد وعلى آل محمد...») وتستعيذ بالله من عذاب القبر وعذاب جهنم وفتنة المحيا والممات وفتنة المسيح الدجال.'
                    },
                    {
                      title: '٦. التسليم خروجاً من الصلاة',
                      text: 'تلتفت عن يمينك قائلاً: «السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ»، وعن يسارك قائلاً: «السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ».'
                    }
                  ].map((s, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-[#14120D] border border-[#C8A24A]/25">
                      <span className="font-extrabold text-[#E6C66E] block">{s.title}</span>
                      <p className="text-[11px] text-[#E5DEC9] mt-0.5 leading-relaxed">{s.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ==============================================================
                باب ٣: تقسيمة السنن الرواتب النبوية (١٢ ركعة)
               ============================================================== */}
            {activeGuideTab === 'rawatib' && (
              <div className="bg-[#0B0A08] border border-[#C8A24A]/35 rounded-2xl p-3.5 space-y-3">
                <div className="p-2.5 rounded-xl bg-[#19150D] border border-[#C8A24A]/40 text-center">
                  <p className="font-quran text-sm text-[#F3E5AB] leading-relaxed">
                    قال رسول الله ﷺ: «مَنْ صَلَّى اثْنَتَيْ عَشْرَةَ رَكْعَةً فِي يَوْمٍ وَلَيْلَةٍ بُنِيَ لَهُ بِهِنَّ بَيْتٌ فِي الْجَنَّةِ»
                  </p>
                  <span className="text-[10px] text-[#E6C66E] font-bold block mt-0.5">رواه مسلم عن أم حبيبة رضي الله عنها</span>
                </div>

                <div className="space-y-2">
                  {[
                    {
                      prayer: 'سنة الفجر (ركعتان)',
                      rakaat: 'ركعتان قبل الفريضة',
                      desc: 'أوكد السنن الرواتب على الإطلاق؛ قال عنها النبي ﷺ: «ركعتا الفجر خيرٌ من الدنيا وما فيها». يُسن تخفيفهما وقراءة سورتي الكافرون والإخلاص فيهما.'
                    },
                    {
                      prayer: 'سنة الظهر (٦ ركعات)',
                      rakaat: '٤ ركعات قبلها + ركعتان بعدها',
                      desc: 'تُصلى ٤ ركعات قبل الفريضة (مثنى مثنى بتسليمتين)، وركعتان بعد الفريضة. ومن زاد فصلى أربعاً قبلها وأربعاً بعدها حرّمه الله على النار.'
                    },
                    {
                      prayer: 'صلاة العصر (سنة مستحبة غير راتبة)',
                      rakaat: '٤ ركعات قبل العصر مستحبة',
                      desc: 'ليس للعصر سنة راتبة ضمن الـ ١٢ ركعة، ولكن يُستحب صلاة ٤ ركعات قبل الفريضة لقوله ﷺ: «رحم الله امرأً صلى قبل العصر أربعاً».'
                    },
                    {
                      prayer: 'سنة المغرب (ركعتان)',
                      rakaat: 'ركعتان بعد الفريضة',
                      desc: 'تُصلى ركعتان بعد صلاة المغرب المكتوبة، ويُستحب قراءة الكافرون والإخلاص فيهما.'
                    },
                    {
                      prayer: 'سنة العشاء (ركعتان)',
                      rakaat: 'ركعتان بعد الفريضة',
                      desc: 'تُصلى ركعتان بعد صلاة العشاء المكتوبة. وتُصلى بعدها صلاة الليل والوتر.'
                    }
                  ].map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-[#14120D] border border-[#C8A24A]/25 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#F3E5AB] text-xs">{item.prayer}</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#C8A24A]/20 border border-[#C8A24A]/45 text-[#E6C66E] text-[10px] font-bold">
                          {item.rakaat}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#C4B998] leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="p-2.5 rounded-xl bg-[#14120D] border border-[#C8A24A]/25 text-[11px] text-[#E5DEC9] leading-relaxed">
                  💡 <strong className="text-[#E6C66E]">فائدة نبوية:</strong> الأفضل في السنن والنوافل أداؤها في البيت، لقوله ﷺ: «أفضل صلاة المرء في بيته إلا المكتوبة».
                </div>
              </div>
            )}

            {/* ==============================================================
                باب ٤: صلاة التراويح وقيام رمضان المبارك
               ============================================================== */}
            {activeGuideTab === 'tarawih' && (
              <div className="bg-[#0B0A08] border border-[#C8A24A]/35 rounded-2xl p-3.5 space-y-3">
                <div className="p-2.5 rounded-xl bg-[#19150D] border border-[#C8A24A]/40 text-center">
                  <p className="font-quran text-sm text-[#F3E5AB] leading-relaxed">
                    «مَنْ قَامَ رَمَضَانَ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ»
                  </p>
                  <span className="text-[10px] text-[#E6C66E] font-bold block mt-0.5">متفق عليه في الصحيحين عن أبي هريرة رضي الله عنه</span>
                </div>

                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-[#14120D] border border-[#C8A24A]/25 space-y-1">
                    <h4 className="font-extrabold text-[#E6C66E] text-xs">١. حكمها ووقتها المبارك</h4>
                    <p className="text-[11px] text-[#E5DEC9] leading-relaxed">
                      صلاة التراويح سنة مؤكدة سنّها رسول الله ﷺ في ليالي شهر رمضان المبارك. ويبدأ وقتها من بعد صلاة العشاء وسنتها الراتبة مباشرة ويمتد حتى طلوع الفجر الثاني، وأفضل أوقاتها الثلث الأخير من الليل لمن تيسر له.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#14120D] border border-[#C8A24A]/25 space-y-1">
                    <h4 className="font-extrabold text-[#E6C66E] text-xs">٢. كيفيتها وصفتها المسنونة</h4>
                    <p className="text-[11px] text-[#E5DEC9] leading-relaxed">
                      تُصلى مثنى مثنى (ركعتين ركعتين بتسليمة بعد كل ركعتين)، ينوي بها قيام الليل أو صلاة التراويح، ويُستحب فيها ترتيل القرآن والخشوع وإطالة الركوع والسجود. وسُميت تراويح لأن السلف الصالح كانوا يستريحون يسيراً بين كل أربع ركعات.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#14120D] border border-[#C8A24A]/25 space-y-1">
                    <h4 className="font-extrabold text-[#E6C66E] text-xs">٣. عدد ركعاتها وهدي النبي ﷺ والصحابة</h4>
                    <p className="text-[11px] text-[#E5DEC9] leading-relaxed">
                      السنة النبوية الأفضل إحدى عشرة ركعة أو ثلاث عشرة ركعة، لقول عائشة رضي الله عنها: «ما كان رسول الله ﷺ يزيد في رمضان ولا في غيره على إحدى عشرة ركعة». ويجوز الزيادة إلى عشرين ركعة أو أكثر بلا كراهة بإجماع الأئمة، كما صلى الصحابة في عهد عمر بن الخطاب وعثمان وعلي رضي الله عنهم.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#14120D] border border-[#C8A24A]/25 space-y-1">
                    <h4 className="font-extrabold text-[#E6C66E] text-xs">٤. فضل قيامها جماعة مع الإمام</h4>
                    <p className="text-[11px] text-[#E5DEC9] leading-relaxed">
                      قال رسول الله ﷺ: «مَنْ قَامَ مَعَ الإِمَامِ حَتَّى يَنْصَرِفَ كُتِبَ لَهُ قِيَامُ لَيْلَةٍ» (رواه الترمذي وأبو داود وصححه الألباني)، فالحرص على إتمامها مع الإمام يكتب للمصلي أجر قيام الليل كله.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#14120D] border border-[#C8A24A]/25 space-y-1">
                    <h4 className="font-extrabold text-[#E6C66E] text-xs">٥. الوتر بعد التراويح ودعاء القنوت</h4>
                    <p className="text-[11px] text-[#E5DEC9] leading-relaxed">
                      يُختم قيام التراويح بركعة وتر أو ثلاث ركعات، ويُسن فيها دعاء القنوت بعد الركوع ورفع اليدين تضرعاً بالدعاء للمسلمين بالمغفرة والعتق من النار.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ==============================================================
                باب ٥: صلاة العيدين (عيد الفطر وعيد الأضحى) وشرحها الفقهي
               ============================================================== */}
            {activeGuideTab === 'eid' && (
              <div className="bg-[#0B0A08] border border-[#C8A24A]/35 rounded-2xl p-3.5 space-y-3">
                <div className="p-2.5 rounded-xl bg-[#19150D] border border-[#C8A24A]/40 text-center">
                  <p className="font-quran text-sm text-[#F3E5AB] leading-relaxed">
                    قال تعالى: ﴿فَصَلِّ لِرَبِّكَ وَانْحَرْ﴾ · وكان رسول الله ﷺ يواظب على صلاة العيدين في المصلى
                  </p>
                  <span className="text-[10px] text-[#E6C66E] font-bold block mt-0.5">شريعة عظيمة وإظهار لشعائر الإسلام والفرح بنعمة الله</span>
                </div>

                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-[#14120D] border border-[#C8A24A]/25 space-y-1">
                    <h4 className="font-extrabold text-[#E6C66E] text-xs">١. حكمها ووقتها</h4>
                    <p className="text-[11px] text-[#E5DEC9] leading-relaxed">
                      صلاة العيد سنة مؤكدة عند الجمهور وفرض كفاية عند الحنابلة، ويُستحب خروج الرجال والنساء والصبيان إليها. ويبدأ وقتها بعد شروق الشمس وارتفاعها قيد رمح (نحو ١٥ إلى ٢٠ دقيقة بعد الشروق) ويمتد حتى زوال الشمس عند دخول وقت الظهر.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#14120D] border border-[#C8A24A]/25 space-y-1.5">
                    <h4 className="font-extrabold text-[#E6C66E] text-xs">٢. كيفيتها وصفتها بالتكبيرات الزوائد (ركعتان بلا أذان ولا إقامة):</h4>
                    <div className="space-y-2 text-[11px] text-[#E5DEC9] leading-relaxed">
                      <div className="p-2.5 rounded-lg bg-[#0F0D09] border border-[#C8A24A]/20">
                        <strong className="text-[#FFF2C2] block mb-0.5">الركعة الأولى (٧ تكبيرات زوائد):</strong>
                        يكبر تكبيرة الإحرام، ثم يستفتح سراً، ثم يكبر سبع تكبيرات زوائد رافعاً يديه مع كل تكبيرة، ويقول بين كل تكبيرتين: «سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ». ثم يتعوذ ويبسمل ويقرأ الفاتحة جهراً وسورة (الأعلى أو ق)، ثم يركع ويسجد سجدتين مطمئناً.
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#0F0D09] border border-[#C8A24A]/20">
                        <strong className="text-[#FFF2C2] block mb-0.5">الركعة الثانية (٥ تكبيرات زوائد):</strong>
                        يقوم مكبراً تكبيرة القيام، ثم يكبر خمس تكبيرات زوائد غير تكبيرة القيام، ويقول بينها الذكر ذاته، ثم يقرأ الفاتحة جهراً وسورة (الغاشية أو القمر)، ثم يركع ويسجد ويجلس للتشهد الأخير ويسلم تسليمتين.
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#14120D] border border-[#C8A24A]/25 space-y-1">
                    <h4 className="font-extrabold text-[#E6C66E] text-xs">٣. خطبة العيد</h4>
                    <p className="text-[11px] text-[#E5DEC9] leading-relaxed">
                      خطبة العيد تكون <strong className="text-white">بعد الصلاة</strong> لا قبلها (عكس خطبة الجمعة)، والاستماع إليها سنة ومستحب وليس بشرط لصحة الصلاة.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#14120D] border border-[#C8A24A]/25 space-y-1">
                    <h4 className="font-extrabold text-[#E6C66E] text-xs">٤. سنن وآداب يوم العيد النبوية</h4>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-[#E5DEC9] leading-relaxed">
                      <li>الاغتسال قبل الخروج للصلاة والتطيب ولبس أحسن الثياب.</li>
                      <li>في عيد الفطر: أكل تمرات وتراً قبل الخروج للصلاة اقتداءً بالنبي ﷺ. أما في الأضحى فيُستحب الإمساك حتى يصلي ليأكل من أضحيته.</li>
                      <li>التكبير في الطريق والمصلى: «اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ، لَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ وَلِلَّهِ الْحَمْدُ».</li>
                      <li>مخالفة الطريق (أن يذهب من طريق ويرجع من طريق آخر).</li>
                      <li>التهنئة المشروعة بين المسلمين: «تقبل الله منا ومنكم».</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* ==============================================================
                باب ٦: قيام الليل وصلاة الوتر
               ============================================================== */}
            {activeGuideTab === 'qiyam_witr' && (
              <div className="bg-[#0B0A08] border border-[#C8A24A]/35 rounded-2xl p-3.5 space-y-3">
                <div className="p-2.5 rounded-xl bg-[#19150D] border border-[#C8A24A]/40 text-center">
                  <p className="font-quran text-sm text-[#F3E5AB] leading-relaxed">
                    قال ﷺ: «أَفْضَلُ الصَّلَاةِ بَعْدَ الْفَرِيضَةِ صَلَاةُ اللَّيْلِ» · وقال ﷺ: «اجْعَلُوا آخِرَ صَلَاتِكُمْ بِاللَّيْلِ وِتْرًا»
                  </p>
                  <span className="text-[10px] text-[#E6C66E] font-bold block mt-0.5">متفق عليه</span>
                </div>

                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-[#14120D] border border-[#C8A24A]/25 space-y-1">
                    <h4 className="font-extrabold text-[#E6C66E] text-xs">١. وقت قيام الليل والوتر</h4>
                    <p className="text-[11px] text-[#E5DEC9] leading-relaxed">
                      يبدأ وقت قيام الليل والوتر من بعد صلاة العشاء وسنتها مباشرةً ويمتد حتى طلوع الفجر الصادق. وأفضل أوقاته الثلث الأخير من الليل وقت النزول الإلهي، ومن خاف ألا يستيقظ فليوتر قبل نومه.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#14120D] border border-[#C8A24A]/25 space-y-1">
                    <h4 className="font-extrabold text-[#E6C66E] text-xs">٢. عدد الركعات وهدي النبي ﷺ</h4>
                    <p className="text-[11px] text-[#E5DEC9] leading-relaxed">
                      صلاة الليل مثنى مثنى (ركعتين ركعتين يُسلّم بعد كل ركعتين). وكان الغالب من هديه ﷺ أنه يصلي إحدى عشرة ركعة (١١ ركعة) أو ثلاث عشرة ركعة يطيل فيها القراءة والركوع والسجود.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#14120D] border border-[#C8A24A]/25 space-y-1">
                    <h4 className="font-extrabold text-[#E6C66E] text-xs">٣. كيفية صلاة الوتر</h4>
                    <p className="text-[11px] text-[#E5DEC9] leading-relaxed">
                      الوتر سنة مؤكدة، أقله ركعة واحدة، وأدنى الكمال ثلاث ركعات (يصلي ركعتين ويسلم ثم ركعة، أو ثلاث ركعات متصلة بتشهد واحد في آخرها). ويُسن قراءة (الأعلى) في الأولى، و(الكافرون) في الثانية، و(الإخلاص) في الثالثة.
                    </p>
                  </div>

                  {/* دعاء القنوت في الوتر */}
                  <div className="p-3 rounded-xl bg-[#19150D] border border-[#E6C66E]/45 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-[#E6C66E]">
                        ٤. دعاء القنوت في ركعة الوتر (يُدعى به بعد الرفع من الركوع أو قبله):
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyDuaText(
                            'qunut_dua',
                            'اللَّهُمَّ اهْدِنِي فِيمَنْ هَدَيْتَ، وَعَافِنِي فِيمَنْ عَافَيْتَ، وَتَوَلَّنِي فِيمَنْ تَوَلَّيْتَ، وَبَارِكْ لِي فِيمَا أَعْطَيْتَ، وَقِنِي شَرَّ مَا قَضَيْتَ، فَإِنَّكَ تَقْضِي وَلَا يُقْضَى عَلَيْكَ، إِنَّهُ لَا يَذِلُّ مَنْ وَالَيْتَ، وَلَا يَعِزُّ مَنْ عَادَيْتَ، تَبَارَكْتَ رَبَّنَا وَتَعَالَيْتَ'
                          )
                        }
                        className="px-2 py-0.5 rounded-lg bg-[#0B0A08] border border-[#C8A24A]/40 text-[#E6C66E] text-[10px] font-bold flex items-center gap-1 hover:border-[#E6C66E]"
                      >
                        {copiedDuaId === 'qunut_dua' ? <CheckCheck size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        <span>{copiedDuaId === 'qunut_dua' ? 'تم النسخ' : 'نسخ دعاء القنوت'}</span>
                      </button>
                    </div>
                    <p className="font-quran text-sm text-[#FFF2C2] leading-relaxed text-justify">
                      «اللَّهُمَّ اهْدِنِي فِيمَنْ هَدَيْتَ، وَعَافِنِي فِيمَنْ عَافَيْتَ، وَتَوَلَّنِي فِيمَنْ تَوَلَّيْتَ، وَبَارِكْ لِي فِيمَا أَعْطَيْتَ، وَقِنِي شَرَّ مَا قَضَيْتَ، فَإِنَّكَ تَقْضِي وَلَا يُقْضَى عَلَيْكَ، إِنَّهُ لَا يَذِلُّ مَنْ وَالَيْتَ، وَلَا يَعِزُّ مَنْ عَادَيْتَ، تَبَارَكْتَ رَبَّنَا وَتَعَالَيْتَ»
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ==============================================================
                باب ٧: صلاة الاستخارة وكيفيتها ودعاؤها
               ============================================================== */}
            {activeGuideTab === 'istikhara' && (
              <div className="bg-[#0B0A08] border border-[#C8A24A]/35 rounded-2xl p-3.5 space-y-3">
                <div className="p-2.5 rounded-xl bg-[#19150D] border border-[#C8A24A]/40 text-center">
                  <p className="font-quran text-sm text-[#F3E5AB] leading-relaxed">
                    «كَانَ رَسُولُ اللَّهِ ﷺ يُعَلِّمُنَا الِاسْتِخَارَةَ فِي الْأُمُورِ كُلِّهَا كَمَا يُعَلِّمُنَا السُّورَةَ مِنَ الْقُرْآنِ»
                  </p>
                  <span className="text-[10px] text-[#E6C66E] font-bold block mt-0.5">رواه البخاري عن جابر بن عبد الله رضي الله عنهما</span>
                </div>

                <div className="p-3 rounded-xl bg-[#14120D] border border-[#C8A24A]/30 space-y-1.5">
                  <h4 className="text-xs font-extrabold text-[#E6C66E]">خطوات صلاة الاستخارة على السنة النبوية:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#E5DEC9] leading-relaxed">
                    <li>تتوضأ للصلاة وتنوي بقلبك ركعتين للاستخارة في الأمر المباح الذي تتردد فيه (سفر، عمل، زواج، تجارة...).</li>
                    <li>تصلي ركعتين من غير الفريضة بخشوع وحضور قلب.</li>
                    <li>بعد السلام من الركعتين (أو في السجود أو قبل السلام بعد التشهد)، تحمد الله وتثني عليه وتصلي على النبي ﷺ.</li>
                    <li>تدعو بدعاء الاستخارة النبوي الشريف وتسمي حاجتك عند الموضع المخصص.</li>
                    <li>تمضي في أمرك متوكلاً على الله؛ ولا يُشترط رؤية رؤيا أو منام، بل تيسير الأمر أو انصرافه هو أثر الاستخارة.</li>
                  </ol>
                </div>

                {/* نص دعاء الاستخارة كاملاً */}
                <div className="p-3 rounded-xl bg-[#19150D] border border-[#E6C66E]/45 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-[#E6C66E]">
                      دعاء الاستخارة الصحيح الثابت (البخاري):
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyDuaText(
                          'istikhara_dua',
                          'اللَّهُمَّ إِنِّي أَسْتَخِيرُكَ بِعِلْمِكَ، وَأَسْتَقْدِرُكَ بِقُدْرَتِكَ، وَأَسْأَلُكَ مِنْ فَضْلِكَ الْعَظِيمِ، فَإِنَّكَ تَقْدِرُ وَلَا أَقْدِرُ، وَتَعْلَمُ وَلَا أَعْلَمُ، وَأَنْتَ عَلَّامُ الْغُيُوبِ، اللَّهُمَّ إِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الْأَمْرَ (وتسمي حاجتك) خَيْرٌ لِي فِي دِينِي وَمَعَاشِي وَعَاقِبَةِ أَمْرِي فَقَدِّرْهُ لِي وَيَسِّرْهُ لِي ثُمَّ بَارِكْ لِي فِيهِ، وَإِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الْأَمْرَ شَرٌّ لِي فِي دِينِي وَمَعَاشِي وَعَاقِبَةِ أَمْرِي فَاصْرِفْهُ عَنِّي وَاصْرِفْنِي عَنْهُ، وَاقْدُرْ لِيَ الْخَيْرَ حَيْثُ كَانَ ثُمَّ أَرْضِنِي بِهِ'
                        )
                      }
                      className="px-2 py-0.5 rounded-lg bg-[#0B0A08] border border-[#C8A24A]/40 text-[#E6C66E] text-[10px] font-bold flex items-center gap-1 hover:border-[#E6C66E]"
                    >
                      {copiedDuaId === 'istikhara_dua' ? <CheckCheck size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      <span>{copiedDuaId === 'istikhara_dua' ? 'تم النسخ' : 'نسخ الدعاء'}</span>
                    </button>
                  </div>
                  <p className="font-quran text-sm sm:text-base text-[#FFF2C2] leading-loose text-justify">
                    «اللَّهُمَّ إِنِّي أَسْتَخِيرُكَ بِعِلْمِكَ، وَأَسْتَقْدِرُكَ بِقُدْرَتِكَ، وَأَسْأَلُكَ مِنْ فَضْلِكَ الْعَظِيمِ، فَإِنَّكَ تَقْدِرُ وَلَا أَقْدِرُ، وَتَعْلَمُ وَلَا أَعْلَمُ، وَأَنْتَ عَلَّامُ الْغُيُوبِ، اللَّهُمَّ إِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الْأَمْرَ — <span className="text-[#E6C66E] underline decoration-dotted font-bold">وتسمي حاجتك</span> — خَيْرٌ لِي فِي دِينِي وَمَعَاشِي وَعَاقِبَةِ أَمْرِي فَاقْدُرْهُ لِي وَيَسِّرْهُ لِي ثُمَّ بَارِكْ لِي فِيهِ، وَإِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الْأَمْرَ شَرٌّ لِي فِي دِينِي وَمَعَاشِي وَعَاقِبَةِ أَمْرِي فَاصْرِفْهُ عَنِّي وَاصْرِفْنِي عَنْهُ، وَاقْدُرْ لِيَ الْخَيْرَ حَيْثُ كَانَ ثُمَّ أَرْضِنِي بِهِ»
                  </p>
                </div>
              </div>
            )}

            {/* ==============================================================
                باب ٨: صفة صلاة الجنازة وشرحها الفقهي الكامل
               ============================================================== */}
            {activeGuideTab === 'janazah' && (
              <div className="bg-[#0B0A08] border border-[#C8A24A]/35 rounded-2xl p-3.5 space-y-3">
                {/* فضل صلاة الجنازة */}
                <div className="p-2.5 rounded-xl bg-[#19150D] border border-[#C8A24A]/40 text-center">
                  <p className="font-quran text-sm text-[#F3E5AB] leading-relaxed">
                    «مَنْ شَهِدَ الْجَنَازَةَ حَتَّى يُصَلَّى عَلَيْهَا فَلَهُ قِيرَاطٌ، وَمَنْ شَهِدَهَا حَتَّى تُدْفَنَ فَلَهُ قِيرَاطَانِ. قِيلَ: وَمَا الْقِيرَاطَانِ؟ قَالَ: مِثْلُ الْجَبَلَيْنِ الْعَظِيمَيْنِ»
                  </p>
                  <span className="text-[10px] text-[#E6C66E] font-bold block mt-0.5">متفق عليه في الصحيحين</span>
                </div>

                {/* أصل صفتها وموقف الإمام */}
                <div className="p-3 rounded-xl bg-[#14120D] border border-[#C8A24A]/25 space-y-1">
                  <div className="flex items-center gap-1.5 text-[#E6C66E] font-extrabold text-xs">
                    <Info size={14} />
                    <span>حكمها وصفتها العامة وموقف الإمام:</span>
                  </div>
                  <p className="text-[11px] text-[#E5DEC9] leading-relaxed">
                    صلاة الجنازة فرض كفاية، وتُصلى قياماً بالكامل <strong className="text-[#E6C66E]">بلا ركوع ولا سجود ولا أذان ولا إقامة</strong>. يقف الإمام والمصلون مستقبلي القبلة، ويكون موقف الإمام عند <strong className="text-white">رأس الرجل</strong>، وعند <strong className="text-white">وسط المرأة</strong>. وتتكون من ٤ تكبيرات يرفع يديه مع كل تكبيرة:
                  </p>
                </div>

                {/* التكبيرات الأربع بالتفصيل */}
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-[#14120D] border border-[#C8A24A]/25 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[#E6C66E] text-xs">١. التكبيرة الأولى (الفاتحة):</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#C8A24A]/15 text-[#E6C66E] text-[9.5px] font-bold">التكبيرة ١</span>
                    </div>
                    <p className="text-[11px] text-[#E5DEC9] leading-relaxed">
                      يكبر تكبيرة الإحرام رافعاً يديه، ويتعوذ بالله من الشيطان الرجيم ويبسمل سراً، ثم يقرأ <strong className="text-white">سورة الفاتحة</strong> سراً، ولا يستفتح بالدعاء لأن صلاة الجنازة مبنية على التخفيف.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#14120D] border border-[#C8A24A]/25 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[#E6C66E] text-xs">٢. التكبيرة الثانية (الصلاة الإبراهيمية):</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#C8A24A]/15 text-[#E6C66E] text-[9.5px] font-bold">التكبيرة ٢</span>
                    </div>
                    <p className="text-[11px] text-[#E5DEC9] leading-relaxed">
                      يكبر التكبيرة الثانية رافعاً يديه، ويصلي على النبي ﷺ بالصلاة الإبراهيمية كما في التشهد الأخير: «اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ».
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#14120D] border border-[#C8A24A]/25 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[#E6C66E] text-xs">٣. التكبيرة الثالثة (الدعاء للميت):</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#C8A24A]/15 text-[#E6C66E] text-[9.5px] font-bold">التكبيرة ٣</span>
                    </div>
                    <p className="text-[11px] text-[#E5DEC9] leading-relaxed">
                      يكبر التكبيرة الثالثة رافعاً يديه، ويخلص بالدعاء للميت بالأدعية النبوية الثابتة.
                    </p>

                    {/* بطاقة الدعاء للميت الكبير */}
                    <div className="p-3 rounded-xl bg-[#19150D] border border-[#E6C66E]/40 space-y-2 mt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-[#E6C66E]">الدعاء للميت البالغ (صحيح مسلم):</span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyDuaText(
                              'janazah_adult_dua',
                              'اللَّهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ، وَعَافِهِ وَاعْفُ عَنْهُ، وَأَكْرِمْ نُزُلَهُ، وَوَسِّعْ مُدْخَلَهُ، وَاغْسِلْهُ بِالْمَاءِ وَالثَّلْجِ وَالْبَرَدِ، وَنَقِّهِ مِنَ الْخَطَايَا كَمَا نَقَّيْتَ الثَّوْبَ الْأَبْيَضَ مِنَ الدَّنَسِ، وَأَبْدِلْهُ دَارًا خَيْرًا مِنْ دَارِهِ، وَأَهْلًا خَيْرًا مِنْ أَهْلِهِ، وَأَدْخِلْهُ الْجَنَّةَ، وَأَعِذْهُ مِنْ عَذَابِ الْقَبْرِ وَمِنْ عَذَابِ النَّارِ'
                            )
                          }
                          className="px-2 py-0.5 rounded-lg bg-[#0B0A08] border border-[#C8A24A]/40 text-[#E6C66E] text-[10px] font-bold flex items-center gap-1 hover:border-[#E6C66E]"
                        >
                          {copiedDuaId === 'janazah_adult_dua' ? <CheckCheck size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          <span>{copiedDuaId === 'janazah_adult_dua' ? 'تم النسخ' : 'نسخ الدعاء'}</span>
                        </button>
                      </div>
                      <p className="font-quran text-sm text-[#FFF2C2] leading-relaxed text-justify">
                        «اللَّهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ، وَعَافِهِ وَاعْفُ عَنْهُ، وَأَكْرِمْ نُزُلَهُ، وَوَسِّعْ مُدْخَلَهُ، وَاغْسِلْهُ بِالْمَاءِ وَالثَّلْجِ وَالْبَرَدِ، وَنَقِّهِ مِنَ الْخَطَايَا كَمَا نَقَّيْتَ الثَّوْبَ الْأَبْيَضَ مِنَ الدَّنَسِ، وَأَبْدِلْهُ دَارًا خَيْرًا مِنْ دَارِهِ، وَأَهْلًا خَيْرًا مِنْ أَهْلِهِ، وَأَدْخِلْهُ الْجَنَّةَ، وَأَعِذْهُ مِنْ عَذَابِ الْقَبْرِ وَمِنْ عَذَابِ النَّارِ» (وإن كانت أنثى يُؤنث الضمير: اغفر لها وارحمها...).
                      </p>
                    </div>

                    {/* الدعاء إن كان المتوفى صغيراً */}
                    <div className="p-3 rounded-xl bg-[#19150D] border border-[#E6C66E]/40 space-y-2 mt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-[#E6C66E]">إذا كان الميت طفلاً لم يبلغ:</span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyDuaText(
                              'janazah_child_dua',
                              'اللَّهُمَّ اجْعَلْهُ فَرَطًا وَذُخْرًا لِوَالِدَيْهِ، وَشَفِيعًا مُجَابًا، اللَّهُمَّ ثَقِّلْ بِهِ مَوَازِينَهُمَا، وَأَعْظِمْ بِهِ أُجُورَهُمَا، وَأَلْحِقْهُ بِصَالِحِ سَلَفِ الْمُؤْمِنِينَ، وَاجْعَلْهُ فِي كَفَالَةِ إِبْرَاهِيمَ، وَقِهِ بِرَحْمَتِكَ عَذَابَ الْجَحِيمِ'
                            )
                          }
                          className="px-2 py-0.5 rounded-lg bg-[#0B0A08] border border-[#C8A24A]/40 text-[#E6C66E] text-[10px] font-bold flex items-center gap-1 hover:border-[#E6C66E]"
                        >
                          {copiedDuaId === 'janazah_child_dua' ? <CheckCheck size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          <span>{copiedDuaId === 'janazah_child_dua' ? 'تم النسخ' : 'نسخ الدعاء'}</span>
                        </button>
                      </div>
                      <p className="font-quran text-sm text-[#FFF2C2] leading-relaxed text-justify">
                        «اللَّهُمَّ اجْعَلْهُ فَرَطًا وَذُخْرًا لِوَالِدَيْهِ، وَشَفِيعًا مُجَابًا، اللَّهُمَّ ثَقِّلْ بِهِ مَوَازِينَهُمَا، وَأَعْظِمْ بِهِ أُجُورَهُمَا، وَأَلْحِقْهُ بِصَالِحِ سَلَفِ الْمُؤْمِنِينَ، وَاجْعَلْهُ فِي كَفَالَةِ إِبْرَاهِيمَ، وَقِهِ بِرَحْمَتِكَ عَذَابَ الْجَحِيمِ».
                      </p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#14120D] border border-[#C8A24A]/25 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[#E6C66E] text-xs">٤. التكبيرة الرابعة والتسليم:</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#C8A24A]/15 text-[#E6C66E] text-[9.5px] font-bold">التكبيرة ٤</span>
                    </div>
                    <p className="text-[11px] text-[#E5DEC9] leading-relaxed">
                      يكبر التكبيرة الرابعة رافعاً يديه، ثم يقف ساكتاً هنيهة ويدعو: «اللَّهُمَّ لَا تَحْرِمْنَا أَجْرَهُ، وَلَا تَفْتِنَّا بَعْدَهُ، وَاغْفِرْ لَنَا وَلَهُ»، ثم يسلم <strong className="text-white">تسليمة واحدة عن يمينه</strong>: «السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ» (وهي السنة الأثبت عن أصحاب النبي ﷺ)، وإن سلّم تسليمتين جاز ذلك.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ==============================================================
                باب ٩: تعاليم السنن والآداب اليومية
               ============================================================== */}
            {activeGuideTab === 'sunan' && (
              <div className="bg-[#0B0A08] border border-[#C8A24A]/35 rounded-2xl p-3.5 space-y-2.5">
                <div className="p-2.5 rounded-xl bg-[#19150D] border border-[#C8A24A]/40 text-center">
                  <p className="font-quran text-sm text-[#F3E5AB]">
                    ﴿لَّقَدْ كَانَ لَكُمْ فِي رَسُولِ اللَّهِ أُسْوَةٌ حَسَنَةٌ لِّمَن كَانَ يَرْجُو اللَّهَ وَالْيَوْمَ الْآخِرَ﴾
                  </p>
                </div>

                <div className="space-y-2">
                  {[
                    {
                      title: '١. اتباع الدليل الصحيح من الكتاب والسنة',
                      text: 'الأصل في عبادة المسلم اتباع ما صح عن رسول الله ﷺ في القرآن الكريم والسنة النبوية المطهرة بفهم الصحابة الكرام، دون ابتداع في الدين.'
                    },
                    {
                      title: '٢. سنن الفطرة والسواك والطهارة الدائمة',
                      text: 'المحافظة على السواك عند الوضوء والصلاة، والتطيّب، والنوم على طهارة على الشق الأيمن مع قراءة آية الكرسي والمعوذتين وسورة الإخلاص.'
                    },
                    {
                      title: '٣. التيامن والأدب النبوي في الطعام والشراب',
                      text: 'البدء باليمين في الشؤون الكريمة كلها، والتسمية قبل الأكل، والأكل باليمين مما يلي الآكل، وحمد الله بعد الفراغ منه.'
                    },
                    {
                      title: '٤. الأذكار الموظفة بعد الصلوات المكتوبة',
                      text: 'الجلوس بعد التسليم من الفريضة للاستغفار ثلاثاً وقول: «اللهم أنت السلام ومنك السلام تباركت يا ذا الجلال والإكرام»، والتسبيح (٣٣) والتحميد (٣٣) والتكبير (٣٣) وتمام المائة، وقراءة آية الكرسي والمعوذات.'
                    },
                    {
                      title: '٥. حسن الخلق وإفشاء السلام وبشاشة الوجه',
                      text: 'قال ﷺ: «أكمل المؤمنين إيماناً أحسنهم خلقاً»، ومن سنته ﷺ إفشاء السلام، والتبسم في وجه أخيك المسلم، وكف الأذى، وصلة الأرحام وبر الوالدين.'
                    }
                  ].map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-[#14120D] border border-[#C8A24A]/25">
                      <span className="font-extrabold text-[#E6C66E] block">{item.title}</span>
                      <p className="text-[11px] text-[#E5DEC9] mt-0.5 leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

