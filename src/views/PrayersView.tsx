import React, { useState, useEffect } from 'react';
import { Coordinates, PrayerCalculationMethod, PrayerTimesData, PrayerAchievementsState, FastingTrackerState } from '../types';
import { PrayerTimesService, formatPrayerTime12 } from '../services/prayerTimesService';
import { LiveActivityService, LiveActivityState } from '../services/liveActivityService';
import { StorageService } from '../services/storageService';
import { LUXURY_IMAGES } from '../data/storiesAndExploreData';
import { WidgetsShowcaseModal } from '../components/WidgetsShowcaseModal';
import { 
  Clock, Check, ChevronDown, ChevronUp,
  Trophy, Flame, Sparkles, LayoutGrid,
  Sun, Moon, Calendar, BookOpen, Heart, ShieldCheck, Droplets
} from 'lucide-react';

interface PrayersViewProps {
  coordinates: Coordinates;
  onLocationChange: (coords: Coordinates) => void;
  onSelectSurah?: (surahNumber: number, ayahNumber?: number) => void;
}

export const PrayersView: React.FC<PrayersViewProps> = ({ coordinates }) => {
  const [prayerData, setPrayerData] = useState<PrayerTimesData>(() =>
    PrayerTimesService.getInitialPrayerTimes(coordinates)
  );
  const [method, setMethod] = useState<PrayerCalculationMethod>(() =>
    StorageService.getSettings().calculationMethod || '5'
  );
  const [isMethodDropdownOpen, setIsMethodDropdownOpen] = useState<boolean>(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(() =>
    PrayerTimesService.getInitialPrayerTimes(coordinates).timeRemainingSeconds
  );
  const [prayerAchievements, setPrayerAchievements] = useState<PrayerAchievementsState>(StorageService.getPrayerAchievements());
  const [fastingTracker, setFastingTracker] = useState<FastingTrackerState>(StorageService.getFastingTracker());
  const [liveActivity, setLiveActivity] = useState<LiveActivityState>(() => LiveActivityService.getState());

  // Interactive Tabs for Sunnah Prayers & New Muslim / Prophetic Guidance
  const [activeSunnahTab, setActiveSunnahTab] = useState<'rawatib' | 'qiyam_witr' | 'istikhara'>('rawatib');
  const [activeGuideTab, setActiveGuideTab] = useState<'wudu' | 'salah' | 'sunan'>('wudu');
  const [isSunnahExpanded, setIsSunnahExpanded] = useState<boolean>(true);
  const [isGuideExpanded, setIsGuideExpanded] = useState<boolean>(true);
  const [isWidgetsModalOpen, setIsWidgetsModalOpen] = useState<boolean>(false);

  const calculationMethods: { id: PrayerCalculationMethod; name: string }[] = [
    { id: '5', name: 'الهيئة المصرية العامة للمساحة (الافتراضي)' },
    { id: '4', name: 'جامعة أم القرى - مكة المكرمة' },
    { id: '3', name: 'رابطة العالم الإسلامي' },
    { id: '1', name: 'جامعة العلوم الإسلامية بكراتشي' },
    { id: '16', name: 'الهيئة العامة للشؤون الإسلامية والأوقاف (الإمارات)' },
    { id: '2', name: 'الجمعية الإسلامية لأمريكا الشمالية (ISNA)' },
  ];

  useEffect(() => {
    const settings = StorageService.getSettings();
    setMethod(settings.calculationMethod);
    loadData(settings.calculationMethod);
    setPrayerAchievements(StorageService.getPrayerAchievements());
    const unsubLive = LiveActivityService.subscribe(setLiveActivity);

    const onPrayersOrMidnightReset = () => {
      setPrayerAchievements(StorageService.getPrayerAchievements());
      loadData(StorageService.getSettings().calculationMethod);
    };
    window.addEventListener('athar_prayers_updated', onPrayersOrMidnightReset);
    window.addEventListener('athar_midnight_reset', onPrayersOrMidnightReset);

    return () => {
      unsubLive();
      window.removeEventListener('athar_prayers_updated', onPrayersOrMidnightReset);
      window.removeEventListener('athar_midnight_reset', onPrayersOrMidnightReset);
    };
  }, [coordinates]);

  useEffect(() => {
    if (countdownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCountdownSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdownSeconds]);

  const loadData = async (m: PrayerCalculationMethod) => {
    try {
      const data = await PrayerTimesService.getPrayerTimes(coordinates, m);
      setPrayerData(data);
      setCountdownSeconds(data.timeRemainingSeconds);
    } catch {
      // Handled
    }
  };

  const handleMethodChange = (newMethod: PrayerCalculationMethod) => {
    setMethod(newMethod);
    setIsMethodDropdownOpen(false);
    const settings = StorageService.getSettings();
    settings.calculationMethod = newMethod;
    StorageService.saveSettings(settings);
    loadData(newMethod);
  };

  const handleTogglePrayerCheck = (key: keyof PrayerAchievementsState['todayPrayers']) => {
    const updated = StorageService.toggleTodayPrayer(key);
    setPrayerAchievements({ ...updated });
  };

  const formatCountdown = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const prayerRows = [
    { id: 'fajr', name: 'الفجر', key: 'fajr' as const, time: prayerData?.timings.fajr, desc: 'من طلوع الفجر الصادق حتى طلوع الشمس' },
    { id: 'sunrise', name: 'الشروق', key: null, time: prayerData?.timings.sunrise, desc: 'وقت انتهاء صلاة الفجر وبداية وقت الإشراق' },
    { id: 'dhuhr', name: 'الظهر', key: 'dhuhr' as const, time: prayerData?.timings.dhuhr, desc: 'من زوال الشمس عن كبد السماء حتى مصير ظل الشيء مثله' },
    { id: 'asr', name: 'العصر', key: 'asr' as const, time: prayerData?.timings.asr, desc: 'من مصير ظل الشيء مثله حتى اصفرار الشمس' },
    { id: 'maghrib', name: 'المغرب', key: 'maghrib' as const, time: prayerData?.timings.maghrib, desc: 'من غروب قرص الشمس حتى مغيب الشفق الأحمر' },
    { id: 'isha', name: 'العشاء', key: 'isha' as const, time: prayerData?.timings.isha, desc: 'من مغيب الشفق الأحمر حتى منتصف الليل' },
  ];

  const loggedPrayersCount = [
    prayerAchievements.todayPrayers.fajr,
    prayerAchievements.todayPrayers.dhuhr,
    prayerAchievements.todayPrayers.asr,
    prayerAchievements.todayPrayers.maghrib,
    prayerAchievements.todayPrayers.isha,
  ].filter(Boolean).length;

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
            <p className="text-[11px] font-bold text-[#C4B998] truncate">
              {prayerData?.locationName ||
                coordinates.formattedLocation ||
                (coordinates.district
                  ? `${coordinates.city} - ${coordinates.district}`
                  : coordinates.city)}
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-[#E6C66E] shrink-0">
          {prayerData?.dateHijri || '٢٧ ربيع الأول ١٤٤٨ هـ'}
        </span>
      </div>

      {/* 1. Golden Mihrab Arch Dome with Crescent & Star */}
      <div className="relative mx-auto w-full max-w-sm pt-2">
        <div className="relative overflow-hidden athar-mihrab-arch border-2 border-[#C8A24A]/65 bg-gradient-to-b from-[#1A160E] via-[#0F0D09] to-[#080705] shadow-[0_15px_45px_rgba(0,0,0,0.95)] pt-10 pb-6 px-6 text-center">
          <img
            src={LUXURY_IMAGES.mosqueSplash}
            alt="محراب الصلاة"
            referrerPolicy="no-referrer"
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

              {/* Quick Launch Button for Athar Widgets Suite (Small, Medium & Dynamic Island) */}
              <button
                onClick={() => setIsWidgetsModalOpen(true)}
                className="mt-2.5 w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#262011] via-[#1B160C] to-[#262011] hover:from-[#322A16] hover:to-[#322A16] border border-[#E6C66E]/55 text-[#F3E5AB] text-[11px] font-extrabold flex items-center justify-center gap-1.5 shadow-[0_4px_14px_rgba(200,162,74,0.2)] transition-all active:scale-98"
              >
                <LayoutGrid size={13} className="text-[#E6C66E]" />
                <span>حزمة ودجات الصلاة (الصغيرة والمتوسطة والـ Dynamic Island)</span>
              </button>
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
              <p className="text-[10px] text-[#C4B998]">اضغط لتسجيل أداء الصلوات الخمس والسنن</p>
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

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#C8A24A]/20">
          <button
            onClick={() => handleTogglePrayerCheck('sunan')}
            className={`p-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-between px-3 transition-all active:scale-95 ${
              prayerAchievements.todayPrayers.sunan
                ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#E6C66E]'
                : 'bg-[#0C0B09] border-[#C8A24A]/25 text-[#C4B998]'
            }`}
          >
            <span>السنن الرواتب (12 ركعة)</span>
            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
              prayerAchievements.todayPrayers.sunan ? 'bg-[#E6C66E] text-[#070707]' : 'border border-[#C8A24A]/40'
            }`}>
              {prayerAchievements.todayPrayers.sunan && <Check size={10} strokeWidth={3} />}
            </div>
          </button>

          <button
            onClick={() => handleTogglePrayerCheck('qiyam')}
            className={`p-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-between px-3 transition-all active:scale-95 ${
              prayerAchievements.todayPrayers.qiyam
                ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#E6C66E]'
                : 'bg-[#0C0B09] border-[#C8A24A]/25 text-[#C4B998]'
            }`}
          >
            <span>قيام الليل والوتر</span>
            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
              prayerAchievements.todayPrayers.qiyam ? 'bg-[#E6C66E] text-[#070707]' : 'border border-[#C8A24A]/40'
            }`}>
              {prayerAchievements.todayPrayers.qiyam && <Check size={10} strokeWidth={3} />}
            </div>
          </button>
        </div>
      </div>

      {/* 4. تقسيمة صلوات السنن الرواتب، قيام الليل والوتر، وتعليم صلاة الاستخارة */}
      {(() => {
        const parseMin = (str?: string): number | null => {
          if (!str) return null;
          const m = str.match(/(\d{1,2})\s*:\s*(\d{1,2})/);
          if (!m) return null;
          return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
        };
        const minTo12h = (totalMin: number) => {
          const normalized = ((Math.round(totalMin) % 1440) + 1440) % 1440;
          const h24 = Math.floor(normalized / 60);
          const mins = normalized % 60;
          const suffix = h24 >= 12 ? 'م' : 'ص';
          const h12 = h24 % 12 || 12;
          return `${String(h12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${suffix}`;
        };

        const sunriseMin = parseMin(prayerData?.timings.sunrise) ?? 360;
        const dhuhrMin = parseMin(prayerData?.timings.dhuhr) ?? 720;
        const maghribMin = parseMin(prayerData?.timings.maghrib) ?? 1080;
        const fajrMin = parseMin(prayerData?.timings.fajr) ?? 290;

        const duhaStart = sunriseMin + 15;
        const duhaEnd = dhuhrMin - 10;

        const nightDuration = (fajrMin + 1440 - maghribMin) % 1440 || 600;
        const lastThirdStart = (maghribMin + Math.floor((nightDuration * 2) / 3)) % 1440;
        const islamicMidnight = (maghribMin + Math.floor(nightDuration / 2)) % 1440;

        const todayIso = new Date().toISOString().split('T')[0];
        const isFastedToday = fastingTracker.fastedDates.includes(todayIso);
        const dayOfWeek = new Date().getDay();
        const hijriDayNum = parseInt(prayerData?.hijriDay || '0', 10);
        const isWhiteDay = hijriDayNum === 13 || hijriDayNum === 14 || hijriDayNum === 15;

        let fastingBadgeText = 'صيام التطوع والسنن';
        if (isWhiteDay) fastingBadgeText = `اليوم من الأيام البيض (${hijriDayNum} ${prayerData?.hijriMonth || ''})`;
        else if (dayOfWeek === 1) fastingBadgeText = 'اليوم الإثنين · سنة صيام الإثنين';
        else if (dayOfWeek === 4) fastingBadgeText = 'اليوم الخميس · سنة صيام الخميس';

        return (
          <div className="athar-card space-y-3.5 text-xs">
            {/* Header */}
            <div 
              onClick={() => setIsSunnahExpanded(!isSunnahExpanded)}
              className="flex items-center justify-between cursor-pointer pb-2 border-b border-[#C8A24A]/25"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#1F1B12] border border-[#C8A24A]/40 text-[#E6C66E]">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#F3E5AB]">تقسيمة السنن النبوية وقيام الليل والاستخارة</h3>
                  <p className="text-[10px] text-[#C4B998]">شرح السنن الرواتب (١٢ ركعة) · قيام الليل والوتر · صلاة الاستخارة</p>
                </div>
              </div>
              <button className="p-1.5 rounded-lg bg-[#16130D] text-[#E6C66E] border border-[#C8A24A]/35">
                {isSunnahExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
            </div>

            {/* Sunnah Timings Summary */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-[#0B0A08] border border-[#C8A24A]/30 space-y-1">
                <div className="flex items-center gap-1.5 text-[#E6C66E] font-extrabold text-[11px]">
                  <Sun size={13} />
                  <span>وقت صلاة الضحى</span>
                </div>
                <div className="font-mono font-bold text-white text-xs">
                  {minTo12h(duhaStart)} — {minTo12h(duhaEnd)}
                </div>
                <span className="text-[10px] text-[#C4B998] block">
                  ركعتان إلى ٨ ركعات · صدقة عن ٣٦٠ مفصلاً
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#0B0A08] border border-[#C8A24A]/30 space-y-1">
                <div className="flex items-center gap-1.5 text-[#E6C66E] font-extrabold text-[11px]">
                  <Moon size={13} />
                  <span>الثلث الأخير من الليل</span>
                </div>
                <div className="font-mono font-bold text-white text-xs">
                  يبدأ {minTo12h(lastThirdStart)}
                </div>
                <span className="text-[10px] text-[#C4B998] block">
                  منتصف الليل: {minTo12h(islamicMidnight)}
                </span>
              </div>
            </div>

            {isSunnahExpanded && (
              <div className="space-y-3 pt-1 animate-fadeIn">
                {/* 3 Sub-Tabs for Sunnah Division */}
                <div className="grid grid-cols-3 gap-1 bg-[#14120D] p-1 rounded-2xl border border-[#C8A24A]/35 text-[11px] font-bold">
                  <button
                    onClick={() => setActiveSunnahTab('rawatib')}
                    className={`py-2 px-1.5 rounded-xl transition-all ${
                      activeSunnahTab === 'rawatib'
                        ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] font-extrabold shadow'
                        : 'text-[#C4B998] hover:text-white'
                    }`}
                  >
                    السنن الرواتب (١٢)
                  </button>
                  <button
                    onClick={() => setActiveSunnahTab('qiyam_witr')}
                    className={`py-2 px-1.5 rounded-xl transition-all ${
                      activeSunnahTab === 'qiyam_witr'
                        ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] font-extrabold shadow'
                        : 'text-[#C4B998] hover:text-white'
                    }`}
                  >
                    قيام الليل والوتر
                  </button>
                  <button
                    onClick={() => setActiveSunnahTab('istikhara')}
                    className={`py-2 px-1.5 rounded-xl transition-all ${
                      activeSunnahTab === 'istikhara'
                        ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] font-extrabold shadow'
                        : 'text-[#C4B998] hover:text-white'
                    }`}
                  >
                    صلاة الاستخارة
                  </button>
                </div>

                {/* Tab 1: تقسيمة السنن الرواتب وشرحها */}
                {activeSunnahTab === 'rawatib' && (
                  <div className="space-y-2.5 bg-[#0D0C09] p-3.5 rounded-2xl border border-[#C8A24A]/30">
                    <div className="p-2.5 rounded-xl bg-[#19150D] border border-[#C8A24A]/40 text-center">
                      <p className="font-quran text-sm text-[#F3E5AB] leading-relaxed">
                        قال رسول الله ﷺ: «مَنْ صَلَّى اثْنَتَيْ عَشْرَةَ رَكْعَةً فِي يَوْمٍ وَلَيْلَةٍ بُنِيَ لَهُ بِهِنَّ بَيْتٌ فِي الْجَنَّةِ»
                      </p>
                      <span className="text-[10px] text-[#E6C66E] font-bold block mt-0.5">رواه مسلم</span>
                    </div>

                    <div className="space-y-2">
                      {[
                        {
                          prayer: 'سنة الفجر',
                          rakaat: 'ركعتان قبل الفريضة',
                          desc: 'أوكد السنن الرواتب، قال عنها النبي ﷺ: «ركعتا الفجر خيرٌ من الدنيا وما فيها»، ويُسن تخفيفهما وقراءة سورتي الكافرون والإخلاص.'
                        },
                        {
                          prayer: 'سنة الظهر',
                          rakaat: '٤ ركعات قبلها + ركعتان بعدها',
                          desc: 'تُصلى ٤ ركعات قبل صلاة الظهر (مثنى مثنى بتسليمتين)، وركعتان بعد الفريضة. ومن زاد فصلى ٤ قبلها و٤ بعدها حرّمه الله على النار.'
                        },
                        {
                          prayer: 'سنة العصر',
                          rakaat: 'سنة غير راتبة (٤ ركعات مستحبة قبلها)',
                          desc: 'ليس للعصر سنة راتبة ضمن الـ ١٢ ركعة، ولكن يُستحب صلاة ٤ ركعات قبلها لقوله ﷺ: «رحم الله امرأً صلى قبل العصر أربعاً».'
                        },
                        {
                          prayer: 'سنة المغرب',
                          rakaat: 'ركعتان بعد الفريضة',
                          desc: 'تُصلى ركعتان بعد صلاة المغرب، ويُستحب قراءة سورتي الكافرون والإخلاص فيهما.'
                        },
                        {
                          prayer: 'سنة العشاء',
                          rakaat: 'ركعتان بعد الفريضة',
                          desc: 'تُصلى ركعتان بعد صلاة العشاء المكتوبة، والأفضل في جميع النوافل والرواتب أداؤها في البيت.'
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
                  </div>
                )}

                {/* Tab 2: قيام الليل والوتر */}
                {activeSunnahTab === 'qiyam_witr' && (
                  <div className="space-y-2.5 bg-[#0D0C09] p-3.5 rounded-2xl border border-[#C8A24A]/30">
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
                          يبدأ وقت قيام الليل والوتر من بعد صلاة العشاء وسنتها مباشرةً ويمتد حتى طلوع الفجر الصادق. من خاف ألا يقوم آخر الليل أوتر أوله بعد العشاء، ومن طمع أن يقوم آخر الليل فالأفضل تأخيره للثلث الأخير (وقت النزول الإلهي).
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-[#14120D] border border-[#C8A24A]/25 space-y-1">
                        <h4 className="font-extrabold text-[#E6C66E] text-xs">٢. عدد الركعات وهدي النبي ﷺ</h4>
                        <p className="text-[11px] text-[#E5DEC9] leading-relaxed">
                          صلاة الليل مثنى مثنى (ركعتين ركعتين يُسلّم بعد كل ركعتين). وكان الغالب من هديه ﷺ أنه يصلي إحدى عشرة ركعة (١١ ركعة) أو ثلاث عشرة ركعة، يطيل فيها القراءة والركوع والسجود.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-[#14120D] border border-[#C8A24A]/25 space-y-1">
                        <h4 className="font-extrabold text-[#E6C66E] text-xs">٣. كيفية صلاة الوتر</h4>
                        <p className="text-[11px] text-[#E5DEC9] leading-relaxed">
                          الوتر سنة مؤكدة، أقله ركعة واحدة، أو ٣ ركعات (إما بركعتين وتسليم ثم ركعة مفردة، أو ٣ ركعات متصلة بتشهد واحد في آخرها). ويُسن قراءة (سبح اسم ربك الأعلى) في الأولى، و(الكافرون) في الثانية، و(الإخلاص) في الثالثة، مع دعاء القنوت أحياناً: «اللهم اهدني فيمن هديت...».
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: تعليم صلاة الاستخارة وشرحها */}
                {activeSunnahTab === 'istikhara' && (
                  <div className="space-y-2.5 bg-[#0D0C09] p-3.5 rounded-2xl border border-[#C8A24A]/30">
                    <div className="p-2.5 rounded-xl bg-[#19150D] border border-[#C8A24A]/40">
                      <h4 className="text-xs font-extrabold text-[#E6C66E] mb-1">خطوات صلاة الاستخارة على السنة النبوية:</h4>
                      <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#E5DEC9] leading-relaxed">
                        <li>توضأ وضوءك للصلاة، وانوِ بقلبك صلاة ركعتين للاستخارة (في غير أوقات الكراهة).</li>
                        <li>صلِّ ركعتين من غير الفريضة بخشوع وحضور قلب.</li>
                        <li>بعد السلام من الركعتين (أو في آخر التشهد قبل السلام)، ارفع يديك واحمد الله وصلِّ على النبي ﷺ ثم ادعُ بدعاء الاستخارة الثابت.</li>
                        <li>سمِّ حاجتك عند قوله: «إن كنتَ تعلم أن هذا الأمر (وتسمي حاجتك)...».</li>
                        <li>امضِ في أمرك متوكلاً على الله، ولا يُشترط رؤية منام، بل التيسير أو الصرف هو علامة الاستخارة.</li>
                      </ol>
                    </div>

                    <div className="p-3 rounded-xl bg-[#14120D] border border-[#C8A24A]/35 space-y-1.5">
                      <span className="text-[11px] font-extrabold text-[#E6C66E] block">دعاء الاستخارة الصحيح (رواه البخاري عن جابر رضي الله عنه):</span>
                      <p className="font-quran text-sm sm:text-base text-[#F3E5AB] leading-loose text-justify">
                        «اللَّهُمَّ إِنِّي أَسْتَخِيرُكَ بِعِلْمِكَ، وَأَسْتَقْدِرُكَ بِقُدْرَتِكَ، وَأَسْأَلُكَ مِنْ فَضْلِكَ الْعَظِيمِ، فَإِنَّكَ تَقْدِرُ وَلَا أَقْدِرُ، وَتَعْلَمُ وَلَا أَعْلَمُ، وَأَنْتَ عَلَّامُ الْغُيُوبِ، اللَّهُمَّ إِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الْأَمْرَ — وَيُسَمِّي حَاجَتَهُ — خَيْرٌ لِي فِي دِينِي وَمَعَاشِي وَعَاقِبَةِ أَمْرِي فَقَدِّرْهُ لِي وَيَسِّرْهُ لِي ثُمَّ بَارِكْ لِي فِيهِ، وَإِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الْأَمْرَ شَرٌّ لِي فِي دِينِي وَمَعَاشِي وَعَاقِبَةِ أَمْرِي فَاصْرِفْهُ عَنِّي وَاصْرِفْنِي عَنْهُ، وَاقْدُرْ لِيَ الْخَيْرَ حَيْثُ كَانَ ثُمَّ أَرْضِنِي بِهِ»
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Fasting Tracker Bar */}
            <div className="p-3 rounded-2xl bg-[#0B0A08] border border-[#C8A24A]/25 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-[#E6C66E]" />
                  <span className="font-extrabold text-[11px] text-white">
                    {fastingBadgeText}
                  </span>
                </div>
                <p className="text-[10px] text-[#C4B998] mt-0.5">
                  إجمالي أيام صيامك المسجلة: <strong className="text-[#E6C66E]">{fastingTracker.totalFastedDays} يوم</strong>
                </p>
              </div>

              <button
                onClick={() => {
                  const updated = StorageService.toggleFastingDate(todayIso);
                  setFastingTracker(updated);
                }}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] shrink-0 flex items-center gap-1 border transition-all active:scale-95 ${
                  isFastedToday
                    ? 'bg-[#C8A24A] text-[#070707] border-[#F3E5AB]'
                    : 'bg-[#161410] text-[#E6C66E] border-[#C8A24A]/40'
                }`}
              >
                {isFastedToday ? (
                  <>
                    <Check size={12} strokeWidth={3} />
                    <span>صائم اليوم ✓</span>
                  </>
                ) : (
                  <span>تسجيل صيام اليوم</span>
                )}
              </button>
            </div>
          </div>
        );
      })()}

      {/* 5. مربع تعليمي شامل للمسلم الجديد ولكل مسلم: الوضوء والصلاة الصحيحة والسنن النبوية الثابتة فقط */}
      <div className="athar-card-gold space-y-3.5 text-xs">
        <div 
          onClick={() => setIsGuideExpanded(!isGuideExpanded)}
          className="flex items-center justify-between cursor-pointer pb-2 border-b border-[#C8A24A]/35"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-[#1F1B12] border border-[#E6C66E]/55 text-[#E6C66E] shadow-inner">
              <BookOpen size={19} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm font-extrabold text-[#F3E5AB]">
                  دليل المسلم الجديد وتعليم الطهارة والصلاة الصحيحة
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#C8A24A]/25 border border-[#E6C66E]/60 text-[9.5px] font-extrabold text-[#E6C66E]">
                  على السنة النبوية الصحيحة فقط
                </span>
              </div>
              <p className="text-[10px] text-[#C4B998] mt-0.5">
                شرح مبسط وموثق لصفة الوضوء والصلاة وسنن النبي ﷺ بلا تعصب لأي مذهب
              </p>
            </div>
          </div>

          <button className="p-1.5 rounded-lg bg-[#16130D] text-[#E6C66E] border border-[#C8A24A]/40 shrink-0">
            {isGuideExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>

        {isGuideExpanded && (
          <div className="space-y-3 animate-fadeIn">
            {/* Guide Sub-Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-[#14120D] p-1 rounded-2xl border border-[#C8A24A]/40 text-[11px] font-bold">
              <button
                onClick={() => setActiveGuideTab('wudu')}
                className={`py-2 px-1.5 rounded-xl transition-all flex items-center justify-center gap-1 ${
                  activeGuideTab === 'wudu'
                    ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] font-extrabold shadow'
                    : 'text-[#C4B998] hover:text-white'
                }`}
              >
                <Droplets size={12} />
                <span>صفة الوضوء</span>
              </button>

              <button
                onClick={() => setActiveGuideTab('salah')}
                className={`py-2 px-1.5 rounded-xl transition-all flex items-center justify-center gap-1 ${
                  activeGuideTab === 'salah'
                    ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] font-extrabold shadow'
                    : 'text-[#C4B998] hover:text-white'
                }`}
              >
                <ShieldCheck size={12} />
                <span>الصلاة الصحيحة</span>
              </button>

              <button
                onClick={() => setActiveGuideTab('sunan')}
                className={`py-2 px-1.5 rounded-xl transition-all flex items-center justify-center gap-1 ${
                  activeGuideTab === 'sunan'
                    ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] font-extrabold shadow'
                    : 'text-[#C4B998] hover:text-white'
                }`}
              >
                <Heart size={12} />
                <span>تعاليم السنن النبوية</span>
              </button>
            </div>

            {/* Sub-Tab 1: صفة الوضوء النبوي الصحيح */}
            {activeGuideTab === 'wudu' && (
              <div className="bg-[#0B0A08] border border-[#C8A24A]/35 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#C8A24A]/20 pb-2">
                  <span className="font-extrabold text-[#E6C66E] text-xs">خطوات الوضوء الصحيح كما ثبت عن النبي ﷺ (حديث عثمان وعبدالله بن زيد بالصحيحين):</span>
                </div>

                <div className="space-y-2">
                  {[
                    { step: '١. النية والتسمية', detail: 'تنوي الوضوء بقلبك (ولا يُشرع التلفظ بالنية)، ثم تقول: «بِسْمِ اللَّهِ».' },
                    { step: '٢. غسل الكفين', detail: 'تغسل كفيك ثلاث مرات في أول الوضوء مع تخليل الأصابع.' },
                    { step: '٣. المضمضة والاستنشاق', detail: 'تتمضمض وتستنشق الماء بأنفك وتستنثر بيدك اليسرى (ثلاث مرات).' },
                    { step: '٤. غسل الوجه كاملاً', detail: 'تغسل وجهك ثلاث مرات من منابت شعر الرأس إلى أسفل الذقن، ومن الأذن إلى الأذن، مع تخليل اللحية.' },
                    { step: '٥. غسل اليدين إلى المرفقين', detail: 'تغسل يدك اليمنى من أطراف الأصابع مع المرفق ثلاثاً، ثم اليد اليسرى كذلك ثلاثاً.' },
                    { step: '٦. مسح الرأس والأذنين', detail: 'تمسح رأسك كاملاً بالماء مرة واحدة (تبدأ بمقدم الرأس حتى قفاه ثم تعود)، وتمسح أذنيك ظاهرهما وباطنهما.' },
                    { step: '٧. غسل الرجلين إلى الكعبين', detail: 'تغسل رجلك اليمنى مع الكعبين ثلاثاً مع تخليل الأصابع، ثم اليسرى ثلاثاً. قال ﷺ: «ويلٌ للأعقاب من النار».' },
                    { step: '٨. الذكر بعد الفراغ من الوضوء', detail: 'تقول: «أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ، اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ» — فتُفتح لك أبواب الجنة الثمانية.' }
                  ].map((w, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-[#14120D] border border-[#C8A24A]/25">
                      <span className="font-extrabold text-[#F3E5AB] block">{w.step}</span>
                      <p className="text-[11px] text-[#C4B998] mt-0.5 leading-relaxed">{w.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-Tab 2: صفة الصلاة الصحيحة */}
            {activeGuideTab === 'salah' && (
              <div className="bg-[#0B0A08] border border-[#C8A24A]/35 rounded-2xl p-3.5 space-y-2.5">
                <div className="p-2.5 rounded-xl bg-[#19150D] border border-[#C8A24A]/40 text-center">
                  <p className="font-quran text-sm text-[#F3E5AB]">
                    قال رسول الله ﷺ: «صَلُّوا كَمَا رَأَيْتُمُونِي أُصَلِّي» (رواه البخاري)
                  </p>
                </div>

                <div className="space-y-2">
                  {[
                    {
                      title: '١. استقبال القبلة وتكبيرة الإحرام',
                      text: 'تقف خاشعاً مستقبلاً القبلة، تنوي الصلاة بقلبك، وترفع يديك حذو منكبيك أو أذنيك قائلاً: «اللَّهُ أَكْبَرُ»، وتضع يدك اليمنى على اليسرى على الصدر.'
                    },
                    {
                      title: '٢. دعاء الاستفتاح وقراءة الفاتحة',
                      text: 'تقول دعاء الاستفتاح الثابت: «سبحانك اللهم وبحمدك وتبارك اسمك وتعالى جدك ولا إله غيرك»، ثم تستعيذ وتبسمل، وتقرأ سورة الفاتحة (وهي ركن لا تصح الصلاة إلا بها)، وتقول بعدها «آمين»، ثم تقرأ ما تيسر من القرآن في الركعتين الأوليين.'
                    },
                    {
                      title: '٣. الركوع والاعتدال منه بطمأنينة',
                      text: 'تكبّر وترفع يديك وتركع حتى يطمئن ظهرك مستوياً وتضع يديك على ركبتيك، وتقول: «سُبْحَانَ رَبِّيَ الْعَظِيمِ» (ثلاثاً أو أكثر). ثم ترفع رأسك قائلاً: «سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ»، فإذا استويت قائماً تقول: «رَبَّنَا وَلَكَ الْحَمْدُ حَمْدًا كَثِيرًا طَيِّبًا مُبَارَكًا فِيهِ».'
                    },
                    {
                      title: '٤. السجود على الأعضاء السبعة والجلوس بين السجدتين',
                      text: 'تكبّر وتخرّ ساجداً على سبعة أعظم: (الجبهة مع الأنف، والكفين، والركبتين، وأطراف القدمين) مع إبعاد المرفقين عن الجنبين، وتقول: «سُبْحَانَ رَبِّيَ الْأَعْلَى» (ثلاثاً) وتكثر من الدعاء. ثم ترفع مكبراً وتجلس مطمئناً وتقول: «رَبِّ اغْفِرْ لِي، رَبِّ اغْفِرْ لِي»، ثم تسجد السجدة الثانية مثل الأولى.'
                    },
                    {
                      title: '٥. التشهد الأوسط والتشهد الأخير والصلاة الإبراهيمية',
                      text: 'في نهاية الركعة الثانية تجلس للتشهد وتقرأ التحيات: «التحيات لله والصلوات والطيبات، السلام عليك أيها النبي ورحمة الله وبركاته، السلام علينا وعلى عباد الله الصالحين، أشهد أن لا إله إلا الله وأشهد أن محمداً عبده ورسوله». وفي آخر الصلاة تضيف الصلاة الإبراهيمية وتستعيذ بالله من أربع (عذاب جهنم، وعذاب القبر، وفتنة المحيا والممات، وشر فتنة المسيح الدجال).'
                    },
                    {
                      title: '٦. التسليم',
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

            {/* Sub-Tab 3: تعاليم السنن النبوية اليومية الخالصة */}
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
                      text: 'الأصل في عبادة المسلم اتباع ما صح عن رسول الله ﷺ في القرآن الكريم والسنة النبوية المطهرة بفهم الصحابة الكرام، دون تعصب أو ابتداع في الدين.'
                    },
                    {
                      title: '٢. سنن الفطرة والطهارة الدائمة',
                      text: 'المحافظة على السواك عند الوضوء والصلاة، والتطيّب، والنوم على طهارة على الشق الأيمن مع قراءة آية الكرسي والمعوذات.'
                    },
                    {
                      title: '٣. التيامن والأدب النبوي في الطعام والشراب',
                      text: 'البدء باليمين في شؤونه كلها، والتسمية قبل الطعام، والأكل باليمين مما يلي الآكل، وحمد الله بعد الفراغ منه.'
                    },
                    {
                      title: '٤. الأذكار الموظفة بعد الصلوات والصباح والمساء',
                      text: 'الجلوس بعد السلام من الفريضة للاستغفار ثلاثاً وقول: «اللهم أنت السلام ومنك السلام تباركت يا ذا الجلال والإكرام»، والتسبيح (٣٣) والتحميد (٣٣) والتكبير (٣٣) وتمام المائة وقراءة آية الكرسي.'
                    },
                    {
                      title: '٥. حسن الخلق وإفشاء السلام وبشاشة الوجه',
                      text: 'قال ﷺ: «أكمل المؤمنين إيماناً أحسنهم خلقاً»، ومن سنته ﷺ إفشاء السلام على من عرفت ومن لم تعرف، وتبسمك في وجه أخيك صدقة، وكف الأذى، وصلة الأرحام.'
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

      {/* 6. Calculation Method Selector */}
      <div className="relative">
        <label className="text-[11px] text-[#C4B998] font-bold block mb-1">طريقة الحساب الفلكي المعتمدة</label>
        <button
          onClick={() => setIsMethodDropdownOpen(!isMethodDropdownOpen)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#12100C] border border-[#C8A24A]/35 hover:border-[#E6C66E] rounded-xl text-right text-xs text-white transition-colors"
        >
          <span className="truncate font-bold">{calculationMethods.find(m => m.id === method)?.name}</span>
          <ChevronDown size={14} className="text-[#E6C66E] shrink-0" />
        </button>

        {isMethodDropdownOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-1 z-40 bg-[#14120E] border border-[#C8A24A]/50 rounded-xl shadow-2xl overflow-hidden text-xs">
            {calculationMethods.map((m) => (
              <button
                key={m.id}
                onClick={() => handleMethodChange(m.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-right transition-colors ${
                  method === m.id
                    ? 'bg-[#C8A24A] text-[#070707] font-extrabold'
                    : 'text-white hover:bg-[#1E1B14]'
                }`}
              >
                <span>{m.name}</span>
                {method === m.id && <Check size={14} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Athar Lock Screen & Dynamic Island Widgets Suite Showcase Modal */}
      <WidgetsShowcaseModal
        isOpen={isWidgetsModalOpen}
        onClose={() => setIsWidgetsModalOpen(false)}
      />
    </div>
  );
};
