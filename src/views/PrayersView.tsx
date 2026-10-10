import React, { useState, useEffect } from 'react';
import { Coordinates, PrayerCalculationMethod, PrayerTimesData, PrayerAchievementsState, FastingTrackerState } from '../types';
import { PrayerTimesService, formatPrayerTime12 } from '../services/prayerTimesService';
import { StorageService } from '../services/storageService';
import { LocationService } from '../services/locationService';
import { RotatingCardBackground } from '../components/RotatingCardBackground';
import { 
  Clock, Check, MapPin, ChevronDown, 
  RefreshCw, Trophy, Flame, Sparkles,
  Sun, Moon, Calendar
} from 'lucide-react';

interface PrayersViewProps {
  coordinates: Coordinates;
  onLocationChange: (coords: Coordinates) => void;
  onSelectSurah?: (surahNumber: number, ayahNumber?: number) => void;
}

export const PrayersView: React.FC<PrayersViewProps> = ({ coordinates, onLocationChange }) => {
  const [prayerData, setPrayerData] = useState<PrayerTimesData | null>(null);
  const [method, setMethod] = useState<PrayerCalculationMethod>('5');
  const [isMethodDropdownOpen, setIsMethodDropdownOpen] = useState<boolean>(false);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState<boolean>(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);
  const [prayerAchievements, setPrayerAchievements] = useState<PrayerAchievementsState>(StorageService.getPrayerAchievements());
  const [fastingTracker, setFastingTracker] = useState<FastingTrackerState>(StorageService.getFastingTracker());

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

  const handleRefreshLocation = async () => {
    setIsRefreshingLocation(true);
    const result = await LocationService.getCurrentPosition();
    if (result.coords) {
      onLocationChange(result.coords);
    }
    setIsRefreshingLocation(false);
  };

  const handleTogglePrayerCheck = (key: keyof PrayerAchievementsState['todayPrayers']) => {
    const updated = StorageService.toggleTodayPrayer(key);
    setPrayerAchievements({ ...updated });
  };

  // Calculate percentage of elapsed time between previous prayer and next prayer
  const calculatePrayerProgress = () => {
    if (!prayerData || !prayerData.nextPrayer) return { percentElapsed: 0, totalHours: 0 };
    
    // Robust parsing of any time format (24h or 12h or with Arabic suffix "ص" / "م")
    const extractMinutesFromStr = (str?: string): number | null => {
      if (!str) return null;
      const match = str.match(/(\d{1,2})\s*:\s*(\d{1,2})/);
      if (!match) return null;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      if (isNaN(h) || isNaN(m)) return null;

      // Handle 12-hour format with Arabic or English AM/PM markers
      const isPm = /م|pm/i.test(str);
      const isAm = /ص|am/i.test(str);
      if (isPm && h < 12) h += 12;
      if (isAm && h === 12) h = 0;

      return h * 60 + m;
    };

    // Prefer time24 if present, fallback to time
    const nextStr = prayerData.nextPrayer.time24 || prayerData.nextPrayer.time;
    const curStr = prayerData.currentPrayer?.time24 || prayerData.currentPrayer?.time;

    const nextM = extractMinutesFromStr(nextStr);
    const curM = extractMinutesFromStr(curStr);

    if (nextM === null || curM === null) {
      return { percentElapsed: 0, totalHours: 0 };
    }

    let windowMinutes = nextM - curM;
    if (windowMinutes <= 0) {
      windowMinutes += 1440; // overnight wrap (e.g. Isha to Fajr)
    }

    if (windowMinutes <= 0) {
      return { percentElapsed: 0, totalHours: 0 };
    }

    const currentCountdown = Number.isFinite(countdownSeconds) ? Math.max(0, countdownSeconds) : 0;
    const remainingMinutes = Math.floor(currentCountdown / 60);
    const elapsedMinutes = Math.max(0, windowMinutes - remainingMinutes);
    const rawPercent = Math.round((elapsedMinutes / windowMinutes) * 100);
    const percentElapsed = Number.isFinite(rawPercent) ? Math.min(100, Math.max(0, rawPercent)) : 0;
    const totalHours = Number.isFinite(windowMinutes) ? Math.round((windowMinutes / 60) * 10) / 10 : 0;

    return { percentElapsed, totalHours };
  };

  const { percentElapsed } = calculatePrayerProgress();
  const safePercentElapsed = Number.isFinite(percentElapsed) ? Math.min(100, Math.max(0, percentElapsed)) : 0;
  const prayerGaugeCircumference = 2 * Math.PI * 40; // ~251.327
  const prayerGaugeOffset = prayerGaugeCircumference * (1 - safePercentElapsed / 100);
  const safeGaugeOffset = Number.isFinite(prayerGaugeOffset) ? prayerGaugeOffset : prayerGaugeCircumference;

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
    <div className="athar-page-container">
      {/* Header (Location chip removed — exclusively in Qibla section) */}
      <div className="flex items-center justify-between pb-2 border-b border-[#D4AF37]/25">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Clock size={22} className="text-[#D4AF37]" />
            <span>مواقيت الصلاة وإنجازاتها</span>
          </h1>
          <p className="text-xs text-white/85 font-medium mt-0.5">
            حساب فلكي دقيق بنظام ١٢ ساعة ومتابعة الصلوات الخمس
          </p>
        </div>
      </div>

      {/* Visual Progress Indicator Hero Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#182330] via-[#121A24] to-[#0A0E13] border border-[#D4AF37]/40 rounded-3xl p-5 shadow-2xl">
        <RotatingCardBackground slot="kaaba" cardOffset={0} intervalMs={24000} opacity={0.34} />
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none z-0" />

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 mb-3">
          <span className="text-slate-300 flex items-center gap-1.5 font-medium">
            <Sparkles size={14} className="text-[#D4AF37]" />
            الوقت المتبقي حتى الصلاة القادمة
          </span>
          <span className="text-[#D4AF37] font-semibold text-xs bg-[#D4AF37]/15 px-2.5 py-0.5 rounded-full border border-[#D4AF37]/30">
            {formatPrayerTime12(prayerData?.nextPrayer?.time)}
          </span>
        </div>

        {/* Circular / Linear Visual Gauge Grid */}
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex-1">
            <span className="text-xs text-slate-400 block">الصلاة القادمة</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-quran mt-0.5">
              صلاة {prayerData?.nextPrayer?.nameArabic || 'جاري التحميل...'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              الصلاة الحالية: <span className="text-slate-200 font-medium">{prayerData?.currentPrayer?.nameArabic || '---'}</span>
            </p>

            {/* Time remaining countdown */}
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#D4AF37] font-mono tabular-nums tracking-tight">
                {formatCountdown(countdownSeconds)}
              </span>
              <span className="text-[11px] text-slate-400">متبقي للأذان</span>
            </div>
          </div>

          {/* Circular Visual Gauge SVG */}
          <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
              {/* Background ring */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="8"
              />
              {/* Progress ring */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="url(#prayerGoldGradient)"
                strokeWidth="8"
                strokeDasharray={prayerGaugeCircumference}
                strokeDashoffset={safeGaugeOffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
              <defs>
                <linearGradient id="prayerGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFF0CA" />
                  <stop offset="50%" stopColor="#D4AF37" />
                  <stop offset="100%" stopColor="#997A15" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-base font-extrabold text-[#D4AF37] tabular-nums font-mono">
                {safePercentElapsed}%
              </span>
              <span className="text-[9px] text-slate-400 font-medium">مضى</span>
            </div>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="relative z-10 mt-4 pt-3 border-t border-slate-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>انقضى من وقت صلاة {prayerData?.currentPrayer?.nameArabic || 'الحالية'}:</span>
            <span className="text-[#D4AF37] font-semibold">{percentElapsed}%</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-[#D4AF37] via-[#F3DB7B] to-[#D4AF37] h-full transition-all duration-500 rounded-full shadow-sm"
              style={{ width: `${percentElapsed}%` }}
            />
          </div>
        </div>
      </div>

      {/* Prayer Achievement & Daily Tracker Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#151D28] to-[#10161F] border border-[#D4AF37]/35 rounded-3xl p-4 space-y-3.5 shadow-xl">
        <RotatingCardBackground slot="prayers" cardOffset={1} intervalMs={27000} opacity={0.26} />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/15 rounded-xl text-amber-400">
              <Trophy size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-100">سجل إنجازات الصلاة اليومي</h3>
              <p className="text-[10px] text-slate-400">سجّل أداء الصلوات في وقتها وحافظ على استمرارك</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Streak Counter */}
            <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 text-amber-400 rounded-xl text-xs font-bold border border-amber-500/30">
              <Flame size={13} className="fill-amber-400" />
              <span>{prayerAchievements.streakDays} أيام</span>
            </div>
          </div>
        </div>

        {/* Progress summary */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-300 bg-[#0E141D]/90 p-2.5 rounded-xl border border-slate-800">
          <span>الصلوات المكتوبة اليوم:</span>
          <span className="font-bold text-[#D4AF37] tabular-nums">
            {loggedPrayersCount} من 5 صلوات
          </span>
        </div>

        {/* Interactive Check-in Grid for 5 Obligatory Prayers */}
        <div className="relative z-10 grid grid-cols-5 gap-1.5 text-center">
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
                    ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 shadow-md ring-1 ring-emerald-500/30'
                    : 'bg-[#121922]/90 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
                title={`تسجيل أداء صلاة ${item.label}`}
              >
                <span className="text-[11px] font-bold">{item.label}</span>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs transition-colors ${
                  isDone ? 'bg-emerald-500 text-slate-950 font-bold' : 'border border-slate-700 bg-slate-800/40'
                }`}>
                  {isDone && <Check size={12} strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Extra Sunan & Qiyam Check-ins */}
        <div className="relative z-10 grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
          <button
            onClick={() => handleTogglePrayerCheck('sunan')}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-between px-3 transition-all active:scale-95 ${
              prayerAchievements.todayPrayers.sunan
                ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]'
                : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <span>السنن الرواتب (12 ركعة)</span>
            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
              prayerAchievements.todayPrayers.sunan ? 'bg-[#D4AF37] text-slate-950 font-bold' : 'border border-slate-700'
            }`}>
              {prayerAchievements.todayPrayers.sunan && <Check size={10} strokeWidth={3} />}
            </div>
          </button>

          <button
            onClick={() => handleTogglePrayerCheck('qiyam')}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-between px-3 transition-all active:scale-95 ${
              prayerAchievements.todayPrayers.qiyam
                ? 'bg-purple-950/60 border-purple-500 text-purple-300'
                : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <span>قيام الليل والوتر</span>
            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
              prayerAchievements.todayPrayers.qiyam ? 'bg-purple-500 text-slate-950 font-bold' : 'border border-slate-700'
            }`}>
              {prayerAchievements.todayPrayers.qiyam && <Check size={10} strokeWidth={3} />}
            </div>
          </button>
        </div>
      </div>

      {/* Integrated Sunnah Times (Duha & Last Third of Night) & Voluntary Fasting Tracker Card */}
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

        // Duha starts 15m after Sunrise until 10m before Dhuhr
        const duhaStart = sunriseMin + 15;
        const duhaEnd = dhuhrMin - 10;

        // Night duration from Maghrib to Fajr
        const nightDuration = (fajrMin + 1440 - maghribMin) % 1440 || 600;
        const lastThirdStart = (maghribMin + Math.floor((nightDuration * 2) / 3)) % 1440;
        const islamicMidnight = (maghribMin + Math.floor(nightDuration / 2)) % 1440;

        const todayIso = new Date().toISOString().split('T')[0];
        const isFastedToday = fastingTracker.fastedDates.includes(todayIso);
        const dayOfWeek = new Date().getDay(); // 1 = Monday, 4 = Thursday
        const hijriDayNum = parseInt(prayerData?.hijriDay || '0', 10);
        const isWhiteDay = hijriDayNum === 13 || hijriDayNum === 14 || hijriDayNum === 15;
        const isSunnahFastDay = dayOfWeek === 1 || dayOfWeek === 4 || isWhiteDay;

        let fastingBadgeText = 'صيام التطوع والسنن';
        if (isWhiteDay) fastingBadgeText = `اليوم من الأيام البيض (${hijriDayNum} ${prayerData?.hijriMonth || ''})`;
        else if (dayOfWeek === 1) fastingBadgeText = 'اليوم الإثنين · سنة صيام الإثنين';
        else if (dayOfWeek === 4) fastingBadgeText = 'اليوم الخميس · سنة صيام الخميس';
        else if (dayOfWeek === 0 || dayOfWeek === 3) fastingBadgeText = 'غداً يوم سنة صيام (الإثنين/الخميس)';

        return (
          <div className="relative overflow-hidden bg-gradient-to-br from-[#141E2B] to-[#0E151E] border border-[#D4AF37]/40 rounded-3xl p-4 space-y-3.5 shadow-xl text-xs">
            <RotatingCardBackground slot="prayers" cardOffset={2} intervalMs={28000} opacity={0.25} />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37]">
                  <Sparkles size={17} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-100">مواقيت السنن النبوية والصيام</h3>
                  <p className="text-[10px] text-slate-400">صلاة الضحى · الثلث الأخير من الليل · صيام السنن</p>
                </div>
              </div>
            </div>

            {/* Duha & Last Third of Night Grid */}
            <div className="relative z-10 grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-[#111923]/90 border border-amber-500/30 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                  <Sun size={13} />
                  <span>وقت صلاة الضحى</span>
                </div>
                <div className="font-mono font-bold text-slate-100 text-xs">
                  {minTo12h(duhaStart)} — {minTo12h(duhaEnd)}
                </div>
                <span className="text-[10px] text-slate-400 block">
                  صلاة الأوابين تجزئ عن 360 صدقة
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#111923]/90 border border-indigo-500/30 space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-300 font-bold text-[11px]">
                  <Moon size={13} />
                  <span>الثلث الأخير من الليل</span>
                </div>
                <div className="font-mono font-bold text-slate-100 text-xs">
                  يبدأ {minTo12h(lastThirdStart)}
                </div>
                <span className="text-[10px] text-slate-400 block">
                  منتصف الليل الشرعي: {minTo12h(islamicMidnight)}
                </span>
              </div>
            </div>

            {/* Voluntary Fasting Banner & Tracker */}
            <div className="relative z-10 p-3 rounded-2xl bg-[#0F1720]/95 border border-slate-800 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className={isSunnahFastDay ? 'text-emerald-400' : 'text-[#D4AF37]'} />
                  <span className={`font-bold text-[11px] ${isSunnahFastDay ? 'text-emerald-300' : 'text-slate-200'}`}>
                    {fastingBadgeText}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  الأيام البيض (13 و14 و15 هجرياً) والإثنين والخميس · إجمالي صيامك: <strong className="text-[#D4AF37]">{fastingTracker.totalFastedDays} يوم</strong>
                </p>
              </div>

              <button
                onClick={() => {
                  const updated = StorageService.toggleFastingDate(todayIso);
                  setFastingTracker(updated);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-[11px] shrink-0 flex items-center gap-1 border transition-all active:scale-95 ${
                  isFastedToday
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow'
                    : 'bg-[#182330] hover:bg-slate-800 text-slate-200 border-slate-700'
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

      {/* Calculation Method Selector */}
      <div className="relative">
        <label className="text-[11px] text-slate-400 block mb-1">طريقة الحساب الفلكي المعتمدة</label>
        <button
          onClick={() => setIsMethodDropdownOpen(!isMethodDropdownOpen)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#121820] border border-slate-800 hover:border-[#D4AF37]/40 rounded-xl text-right text-xs text-slate-200 transition-colors"
        >
          <span className="truncate">{calculationMethods.find(m => m.id === method)?.name}</span>
          <ChevronDown size={14} className="text-slate-400 shrink-0" />
        </button>

        {isMethodDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 z-40 bg-[#151D26] border border-slate-700 rounded-xl shadow-2xl overflow-hidden text-xs">
            {calculationMethods.map((m) => (
              <button
                key={m.id}
                onClick={() => handleMethodChange(m.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-right transition-colors ${
                  method === m.id
                    ? 'bg-[#D4AF37]/20 text-[#D4AF37] font-bold'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <span>{m.name}</span>
                {method === m.id && <Check size={14} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Prayer Times List */}
      <div className="space-y-2">
        {prayerRows.map((row, idx) => {
          const isNext = prayerData?.nextPrayer?.id === row.id;
          const isCurrent = prayerData?.currentPrayer?.id === row.id;
          const isCompleted = row.key ? prayerAchievements.todayPrayers[row.key] : false;

          return (
            <div
              key={row.id}
              className={`relative overflow-hidden flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 ${
                isNext
                  ? 'bg-gradient-to-r from-[#17202C] to-[#121820] border-[#D4AF37]/50 shadow-lg ring-1 ring-[#D4AF37]/20'
                  : isCurrent
                  ? 'bg-[#121820]/90 border-slate-700/60'
                  : 'bg-[#0E1318]/70 border-slate-800/70 text-slate-400'
              }`}
            >
              <RotatingCardBackground slot="prayers" cardOffset={idx} intervalMs={26000 + idx * 1500} opacity={isNext ? 0.3 : 0.22} />
              <div className="relative z-10 flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    isNext
                      ? 'bg-[#D4AF37] text-slate-950 shadow-md'
                      : isCompleted
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40'
                      : isCurrent
                      ? 'bg-[#D4AF37]/15 text-[#D4AF37]'
                      : 'bg-slate-800/40 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check size={16} /> : row.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${isNext ? 'text-[#D4AF37]' : 'text-slate-100'}`}>
                      {row.name}
                    </span>
                    {isNext && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#D4AF37]/20 text-[#D4AF37] font-semibold">
                        الصلاة القادمة
                      </span>
                    )}
                    {isCurrent && !isNext && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                        الصلاة الحالية
                      </span>
                    )}
                    {isCompleted && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-semibold">
                        تمت الصلاة ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">{row.desc}</p>
                </div>
              </div>

              <div className="relative z-10 text-left font-mono tabular-nums">
                <span className={`text-base font-extrabold ${isNext ? 'text-[#D4AF37]' : 'text-slate-100'}`}>
                  {formatPrayerTime12(row.time)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

