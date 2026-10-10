import React, { useState, useEffect } from 'react';
import { Coordinates, PrayerCalculationMethod, PrayerTimesData, PrayerAchievementsState, FastingTrackerState } from '../types';
import { PrayerTimesService, formatPrayerTime12 } from '../services/prayerTimesService';
import { StorageService } from '../services/storageService';
import { LUXURY_IMAGES } from '../data/storiesAndExploreData';
import { 
  Clock, Check, ChevronDown, 
  Trophy, Flame, Sparkles,
  Sun, Moon, Calendar
} from 'lucide-react';

interface PrayersViewProps {
  coordinates: Coordinates;
  onLocationChange: (coords: Coordinates) => void;
  onSelectSurah?: (surahNumber: number, ayahNumber?: number) => void;
}

export const PrayersView: React.FC<PrayersViewProps> = ({ coordinates }) => {
  const [prayerData, setPrayerData] = useState<PrayerTimesData | null>(null);
  const [method, setMethod] = useState<PrayerCalculationMethod>('5');
  const [isMethodDropdownOpen, setIsMethodDropdownOpen] = useState<boolean>(false);
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
      {/* Top Luxury Header (Matches Reference Showcase) */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#C8A24A]/25">
        <div className="flex items-center gap-2">
          <Clock size={20} className="text-[#E6C66E]" />
          <h1 className="text-lg font-extrabold text-white tracking-wide">
            مواقيت الصلاة
          </h1>
        </div>
        <span className="text-xs font-bold text-[#E6C66E]">
          {prayerData?.dateHijri || '٢٧ ربيع الأول ١٤٤٨ هـ'}
        </span>
      </div>

      {/* 1. Golden Mihrab Arch Dome with Crescent & Star (Matches Reference Showcase) */}
      <div className="relative mx-auto w-full max-w-sm pt-2">
        <div className="relative overflow-hidden athar-mihrab-arch border-2 border-[#C8A24A]/65 bg-gradient-to-b from-[#1A160E] via-[#0F0D09] to-[#080705] shadow-[0_15px_45px_rgba(0,0,0,0.95)] pt-10 pb-6 px-6 text-center">
          {/* Background Mosque Silhouette */}
          <img
            src={LUXURY_IMAGES.mosqueSplash}
            alt="محراب الصلاة"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-top opacity-35 pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080705] via-[#080705]/65 to-transparent pointer-events-none" />

          {/* Inner Golden Arch Hairline */}
          <div className="absolute inset-2.5 athar-mihrab-arch border border-[#E6C66E]/30 pointer-events-none" />

          {/* Golden Crescent & Star Emblem at Peak */}
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
          </div>
        </div>
      </div>

      {/* 2. Main Prayer Times List (Active/Next Prayer Highlighted in Burnished Gold Bar) */}
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

      {/* 4. Sunnah Times (Duha & Last Third of Night) & Fasting Tracker */}
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
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#1F1B12] border border-[#C8A24A]/40 text-[#E6C66E]">
                <Sparkles size={17} />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-white">مواقيت السنن النبوية والصيام</h3>
                <p className="text-[10px] text-[#C4B998]">صلاة الضحى · الثلث الأخير من الليل · صيام السنن</p>
              </div>
            </div>

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
                  صلاة الأوابين تجزئ عن 360 صدقة
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

      {/* 5. Calculation Method Selector */}
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
    </div>
  );
};
