import React, { useState, useEffect, useMemo } from 'react';
import { Coordinates, PrayerTimesData } from '../types';
import { PrayerTimesService, formatPrayerTime12 } from '../services/prayerTimesService';
import { ImpactTreeService, ImpactBreakdown } from '../services/impactTreeService';
import { StorageService } from '../services/storageService';
import { AtharBrandLogo } from './AtharBrandLogo';
import {
  X,
  Clock,
  Sparkles,
  Sun,
  Moon,
  Bell,
  Lock,
  Smartphone,
  LayoutGrid,
  Check,
  Play,
  Sliders,
  Eye,
  Volume2,
  ShieldCheck,
  TreeDeciduous,
  Compass,
  Flame,
  Unlock,
  ChevronLeft,
} from 'lucide-react';

interface RoyalWidgetsSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates: Coordinates;
  onOpenLockScreenPreview?: () => void;
}

type WidgetSuiteTab = 'all' | 'home_widgets' | 'live_activities' | 'simulator';

const DAILY_QURAN_VERSES = [
  {
    text: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
    surah: 'سورة الرعد · ٢٨',
  },
  {
    text: 'فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ',
    surah: 'سورة البقرة · ١٥٢',
  },
  {
    text: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا',
    surah: 'سورة الشرح · ٥-٦',
  },
  {
    text: 'وَمَنْ يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ',
    surah: 'سورة الطلاق · ٣',
  },
  {
    text: 'وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ',
    surah: 'سورة البقرة · ١٨٦',
  },
];

/**
 * Royal SVG Miniature Tree of Athar for the Daily Wird / Impact Tree Widget
 * Dynamically illuminates leaves and blossoms based on the user's real achievement percentage (0% - 100%)
 */
export const RoyalMiniImpactTreeSvg: React.FC<{
  score: number;
  size?: number;
}> = ({ score, size = 112 }) => {
  const leafNodes = [
    { cx: 50, cy: 22, r: 5.5, threshold: 10 },
    { cx: 34, cy: 28, r: 5, threshold: 20 },
    { cx: 66, cy: 28, r: 5, threshold: 30 },
    { cx: 24, cy: 40, r: 4.5, threshold: 40 },
    { cx: 76, cy: 40, r: 4.5, threshold: 50 },
    { cx: 40, cy: 38, r: 5.5, threshold: 60 },
    { cx: 60, cy: 38, r: 5.5, threshold: 70 },
    { cx: 30, cy: 52, r: 4.5, threshold: 80 },
    { cx: 70, cy: 52, r: 4.5, threshold: 90 },
    { cx: 50, cy: 14, r: 6.5, threshold: 95 },
  ];

  const isFullBloom = score >= 100;

  return (
    <div
      className="relative flex items-center justify-center shrink-0 select-none"
      style={{ width: size, height: size }}
    >
      {/* Royal Ambient Golden Aura */}
      <div
        className={`absolute inset-1 rounded-full blur-xl pointer-events-none transition-opacity duration-700 ${
          isFullBloom
            ? 'bg-radial from-[#F3E5AB]/40 via-[#C8A24A]/20 to-transparent opacity-100'
            : 'bg-radial from-[#C8A24A]/25 via-[#C8A24A]/5 to-transparent opacity-80'
        }`}
      />

      <svg
        viewBox="0 0 100 100"
        className="w-full h-full overflow-visible drop-shadow-[0_4px_12px_rgba(200,162,74,0.35)]"
      >
        <defs>
          <linearGradient id="atharWidgetGoldTrunk" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5E1A4" />
            <stop offset="50%" stopColor="#C8A24A" />
            <stop offset="100%" stopColor="#7A591B" />
          </linearGradient>
          <radialGradient id="atharWidgetGoldLeafLit" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFF7D6" />
            <stop offset="45%" stopColor="#E6C66E" />
            <stop offset="100%" stopColor="#B68B2D" />
          </radialGradient>
          <linearGradient id="atharWidgetMihrab" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E6C66E" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#C8A24A" stopOpacity="0.12" />
          </linearGradient>
        </defs>

        {/* Outer Royal Mihrab Sanctuary Arch */}
        <path
          d="M 18 88 L 18 46 C 18 22 50 6 50 6 C 50 6 82 22 82 46 L 82 88 Z"
          fill="rgba(16, 14, 10, 0.75)"
          stroke="url(#atharWidgetMihrab)"
          strokeWidth="1.4"
        />

        {/* Subtle Inner Filigree Arch */}
        <path
          d="M 22 85 L 22 47 C 22 26 50 11 50 11 C 50 11 78 26 78 47 L 78 85"
          fill="none"
          stroke="#C8A24A"
          strokeOpacity="0.22"
          strokeWidth="0.8"
          strokeDasharray="2 2"
        />

        {/* Golden Horizon Pedestal */}
        <path
          d="M 26 85 Q 50 80 74 85"
          fill="none"
          stroke="url(#atharWidgetGoldTrunk)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Sculpted Trunk & Symmetrical Branches */}
        <path
          d="M 50 84 L 50 46 M 50 66 Q 36 58 30 50 M 50 66 Q 64 58 70 50 M 50 55 Q 34 45 25 38 M 50 55 Q 66 45 75 38 M 50 48 Q 38 35 34 27 M 50 48 Q 62 35 66 27 M 50 46 L 50 20"
          fill="none"
          stroke="url(#atharWidgetGoldTrunk)"
          strokeWidth="2.6"
          strokeLinecap="round"
        />

        {/* Leaves & Blossoms Connected to Daily Worship Achievements */}
        {leafNodes.map((leaf, idx) => {
          const isLit = score >= leaf.threshold;
          return (
            <g key={idx}>
              {isLit && (
                <circle
                  cx={leaf.cx}
                  cy={leaf.cy}
                  r={leaf.r + 2.8}
                  fill="#E6C66E"
                  opacity={isFullBloom ? 0.32 : 0.18}
                />
              )}
              <circle
                cx={leaf.cx}
                cy={leaf.cy}
                r={leaf.r}
                fill={isLit ? 'url(#atharWidgetGoldLeafLit)' : '#1C1912'}
                stroke={isLit ? '#FFF3C4' : '#C8A24A'}
                strokeOpacity={isLit ? 0.9 : 0.35}
                strokeWidth={isLit ? 1.1 : 0.8}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const RoyalWidgetsSuiteModal: React.FC<RoyalWidgetsSuiteModalProps> = ({
  isOpen,
  onClose,
  coordinates,
  onOpenLockScreenPreview,
}) => {
  const [activeTab, setActiveTab] = useState<WidgetSuiteTab>('all');
  const [prayerData, setPrayerData] = useState<PrayerTimesData>(() =>
    PrayerTimesService.getInitialPrayerTimes(coordinates)
  );
  const [countdownSeconds, setCountdownSeconds] = useState<number>(() =>
    PrayerTimesService.getInitialPrayerTimes(coordinates).timeRemainingSeconds
  );
  const [impactData, setImpactData] = useState<ImpactBreakdown>(() =>
    ImpactTreeService.calculateImpact()
  );

  // Interactive Live Activity Simulation Controls (Pre-Adhan 15-20 mins & Iqamah Progress)
  const [isSimulatingLiveActivity, setIsSimulatingLiveActivity] = useState<boolean>(true);
  const [simulatedPhase, setSimulatedPhase] = useState<'pre_adhan' | 'iqamah_countdown'>('pre_adhan');
  const [simulatedMinutesLeft, setSimulatedMinutesLeft] = useState<number>(14);
  const [simulatedSecondsPart, setSimulatedSecondsPart] = useState<number>(42);
  const [pinnedToast, setPinnedToast] = useState<string | null>(null);

  const verseIndex = useMemo(() => {
    const s = StorageService.getSettings();
    return (s.dailyContentSettings?.currentVerseIndex ?? 0) % DAILY_QURAN_VERSES.length;
  }, [isOpen]);

  const currentVerse = DAILY_QURAN_VERSES[verseIndex];

  useEffect(() => {
    if (!isOpen) return;
    const settings = StorageService.getSettings();
    PrayerTimesService.getPrayerTimes(coordinates, settings.calculationMethod)
      .then((data) => {
        setPrayerData(data);
        setCountdownSeconds(data.timeRemainingSeconds);
      })
      .catch(() => {});
    setImpactData(ImpactTreeService.calculateImpact());
  }, [isOpen, coordinates]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      setSimulatedSecondsPart((prev) => (prev > 0 ? prev - 1 : 59));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const formatCountdownHMS = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Calculate real or simulated Live Activity progress bar (from 20 min before Adhan up to Iqamah)
  const totalWindowMinutes = simulatedPhase === 'pre_adhan' ? 20 : 15;
  const liveProgressPercent = Math.min(
    100,
    Math.max(
      8,
      Math.round(((totalWindowMinutes - simulatedMinutesLeft) / totalWindowMinutes) * 100)
    )
  );

  const nextPrayerName = prayerData?.nextPrayer?.nameArabic || 'المغرب';
  const nextPrayerTime12 = formatPrayerTime12(prayerData?.nextPrayer?.time);

  const fivePrayersList = [
    { id: 'fajr', name: 'الفجر', time: formatPrayerTime12(prayerData?.timings.fajr) },
    { id: 'dhuhr', name: 'الظهر', time: formatPrayerTime12(prayerData?.timings.dhuhr) },
    { id: 'asr', name: 'العصر', time: formatPrayerTime12(prayerData?.timings.asr) },
    { id: 'maghrib', name: 'المغرب', time: formatPrayerTime12(prayerData?.timings.maghrib) },
    { id: 'isha', name: 'العشاء', time: formatPrayerTime12(prayerData?.timings.isha) },
  ];

  const handleActivateWidgetToast = (title: string) => {
    setPinnedToast(`تم تفعيل وتثبيت «${title}» بالهوية الملكية الداكنة والذهبية ✓`);
    setTimeout(() => setPinnedToast(null), 3500);
  };

  const handleToggleQuickPrayerForTree = () => {
    const p = impactData;
    if (!p.isFajrDone) StorageService.toggleTodayPrayer('fajr');
    else if (!p.isDhuhrDone) StorageService.toggleTodayPrayer('dhuhr');
    else if (!p.isAsrDone) StorageService.toggleTodayPrayer('asr');
    else if (!p.isMaghribDone) StorageService.toggleTodayPrayer('maghrib');
    else if (!p.isIshaDone) StorageService.toggleTodayPrayer('isha');
    else StorageService.toggleTodayPrayer('sunan');
    setImpactData(ImpactTreeService.calculateImpact());
  };

  const showHomeWidgets = activeTab === 'all' || activeTab === 'home_widgets';
  const showLiveActivities = activeTab === 'all' || activeTab === 'live_activities';
  const showSimulator = activeTab === 'all' || activeTab === 'simulator';

  return (
    <div className="fixed inset-0 z-50 bg-black/92 backdrop-blur-xl flex flex-col justify-between overflow-y-auto animate-fadeIn text-right select-none">
      <div className="w-full max-w-lg mx-auto min-h-screen flex flex-col bg-[#070707] sm:border-x sm:border-[#C8A24A]/35 shadow-2xl">
        {/* Royal Sticky Header */}
        <div className="sticky top-0 z-30 bg-[#0A0907]/95 backdrop-blur-md border-b border-[#C8A24A]/35 px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#282112] to-[#120F0A] border border-[#E6C66E]/60 flex items-center justify-center text-[#E6C66E] shadow-[0_0_18px_rgba(200,162,74,0.3)]">
              <LayoutGrid size={20} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-extrabold text-[#F3E5AB] tracking-wide">
                  حزمة ودجات أثر والتنبيهات الحية
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C8A24A]/20 border border-[#E6C66E]/50 text-[#E6C66E] font-extrabold">
                  ملكي
                </span>
              </div>
              <p className="text-[11px] text-[#C4B998]">
                ودجات الشاشة الرئيسية · شجرة الأثر · Live Activities والـ Dynamic Island
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[#16140F] border border-[#C8A24A]/35 flex items-center justify-center text-[#C4B998] hover:text-[#E6C66E] transition-colors"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Navigation Bar */}
        <div className="px-4 pt-3">
          <div className="grid grid-cols-4 gap-1.5 p-1.5 bg-[#0F0D0A] border border-[#C8A24A]/35 rounded-2xl text-[11px]">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'home_widgets', label: 'ودجات الشاشة' },
              { id: 'live_activities', label: 'Live Activity' },
              { id: 'simulator', label: 'معاينة الهاتف' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as WidgetSuiteTab)}
                  className={`py-2 px-2 rounded-xl font-extrabold transition-all border ${
                    isActive
                      ? 'bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-[#070707] border-[#F3E5AB] shadow-[0_4px_14px_rgba(200,162,74,0.35)]'
                      : 'text-[#C4B998] border-transparent hover:bg-[#171510] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Toast Feedback */}
        {pinnedToast && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-gradient-to-r from-[#241E11] to-[#14110B] border border-[#E6C66E]/75 flex items-center justify-between gap-2 text-xs text-[#F3E5AB] shadow-xl animate-slideDown">
            <div className="flex items-center gap-2">
              <Check size={15} className="text-[#E6C66E] shrink-0" />
              <span className="font-extrabold">{pinnedToast}</span>
            </div>
          </div>
        )}

        {/* Main Body Content */}
        <div className="p-4 space-y-6 flex-1">
          {/* ===================================================================== */}
          {/* SECTION 1: PRAYER TIMES WIDGETS (SMALL & MEDIUM)                      */}
          {/* ===================================================================== */}
          {showHomeWidgets && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[#E6C66E]" />
                  <h3 className="text-sm font-extrabold text-[#F3E5AB]">
                    ١. ودجات مواقيت الصلاة الملكية (Small & Medium)
                  </h3>
                </div>
                <span className="text-[10px] text-[#C4B998] font-bold">
                  تحديث حي بالثانية
                </span>
              </div>

              {/* A. SMALL PRAYER WIDGET (2x2 iOS/Android Royal Square) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-bold text-[#E6C66E]">
                    • ودجت صغير (Small 2×2): الصلاة القادمة والعد التنازلي مع أيقونة ذهبية
                  </span>
                  <button
                    onClick={() => handleActivateWidgetToast('ودجت الصلاة الصغير (Small)')}
                    className="text-[11px] font-extrabold text-[#070707] bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] px-3 py-1 rounded-xl shadow hover:opacity-95 active:scale-95 transition-all"
                  >
                    تثبيت الودجت
                  </button>
                </div>

                <div className="flex justify-center py-2">
                  {/* Exact 2x2 Royal Small Widget Hardware Card */}
                  <div className="relative w-52 h-52 rounded-[32px] p-[1.5px] bg-gradient-to-b from-[#F5E1A4] via-[#C8A24A]/70 to-[#5E4310] shadow-[0_18px_45px_rgba(0,0,0,0.95),0_0_25px_rgba(200,162,74,0.2)]">
                    <div className="relative w-full h-full rounded-[30.5px] bg-gradient-to-b from-[#15120C] via-[#0C0B08] to-[#070605] p-4 flex flex-col justify-between overflow-hidden">
                      {/* Subtle Geometric Star/Mihrab Glow */}
                      <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-[#E6C66E]/15 blur-2xl pointer-events-none" />
                      <div
                        className="absolute inset-0 opacity-[0.05] pointer-events-none"
                        style={{
                          backgroundImage:
                            'radial-gradient(circle at center, #E6C66E 1px, transparent 1px)',
                          backgroundSize: '16px 16px',
                        }}
                      />

                      {/* Top Row: Royal Golden Icon + Athar Crest */}
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#2B2312] to-[#141008] border border-[#E6C66E]/65 flex items-center justify-center text-[#E6C66E] shadow-[0_0_15px_rgba(230,198,110,0.35)]">
                          <Moon size={20} className="fill-[#E6C66E]" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#1C1810] border border-[#C8A24A]/45 text-[10px] font-extrabold text-[#F3E5AB]">
                          الصلاة القادمة
                        </span>
                      </div>

                      {/* Center Prayer Name & Exact Time */}
                      <div className="relative z-10 my-auto pt-1 text-right">
                        <div className="flex items-baseline justify-between">
                          <h4 className="text-2xl font-extrabold text-white font-quran tracking-wide drop-shadow">
                            {nextPrayerName}
                          </h4>
                          <span className="text-xs font-extrabold text-[#E6C66E] font-mono tabular-nums">
                            {nextPrayerTime12}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Countdown Pill */}
                      <div className="relative z-10 pt-2 border-t border-[#C8A24A]/25 flex items-center justify-between">
                        <span className="text-[10px] text-[#C4B998] font-bold">
                          متبقي للأذان
                        </span>
                        <span className="text-sm font-black text-[#F3E5AB] font-mono tabular-nums tracking-wider bg-[#1A160E] px-2.5 py-1 rounded-xl border border-[#C8A24A]/45 shadow-inner">
                          {formatCountdownHMS(countdownSeconds)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* B. MEDIUM PRAYER WIDGET (4x2 Royal Wide Card) */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-bold text-[#E6C66E]">
                    • ودجت متوسط (Medium 4×2): الصلاة القادمة + جدول باقي صلوات اليوم
                  </span>
                  <button
                    onClick={() => handleActivateWidgetToast('ودجت مواقيت الصلاة المتوسط (Medium)')}
                    className="text-[11px] font-extrabold text-[#070707] bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] px-3 py-1 rounded-xl shadow hover:opacity-95 active:scale-95 transition-all"
                  >
                    تثبيت الودجت
                  </button>
                </div>

                {/* Exact 4x2 Royal Medium Widget Hardware Card */}
                <div className="relative w-full rounded-[32px] p-[1.5px] bg-gradient-to-b from-[#F5E1A4] via-[#C8A24A]/70 to-[#5E4310] shadow-[0_18px_45px_rgba(0,0,0,0.95),0_0_28px_rgba(200,162,74,0.2)]">
                  <div className="relative w-full rounded-[30.5px] bg-gradient-to-b from-[#16130C] via-[#0D0B08] to-[#070605] p-4 sm:p-5 overflow-hidden space-y-3.5">
                    <div className="absolute -top-16 right-1/3 w-44 h-44 rounded-full bg-[#C8A24A]/12 blur-3xl pointer-events-none" />

                    {/* Upper Section: Next Prayer + Countdown + Hijri Date */}
                    <div className="relative z-10 flex items-center justify-between gap-3 pb-3 border-b border-[#C8A24A]/30">
                      <div className="flex items-center gap-3">
                        <AtharBrandLogo size="sm" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-extrabold text-[#E6C66E]">
                              الصلاة القادمة
                            </span>
                            <span className="text-[#C8A24A]">•</span>
                            <span className="text-[10px] font-bold text-[#C4B998]">
                              {prayerData?.dateHijri || '٢٧ ربيع الأول ١٤٤٨ هـ'}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-2 mt-0.5">
                            <h4 className="text-xl sm:text-2xl font-extrabold text-white font-quran">
                              صلاة {nextPrayerName}
                            </h4>
                            <span className="text-xs font-extrabold text-[#F3E5AB] font-mono tabular-nums">
                              ({nextPrayerTime12})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-left bg-[#17130C] border border-[#E6C66E]/50 px-3 py-1.5 rounded-2xl shadow-inner">
                        <span className="text-[9px] font-bold text-[#C4B998] block">
                          العد التنازلي
                        </span>
                        <span className="text-sm sm:text-base font-black text-[#E6C66E] font-mono tabular-nums tracking-wider">
                          {formatCountdownHMS(countdownSeconds)}
                        </span>
                      </div>
                    </div>

                    {/* Lower Section: Full 5-Prayer Schedule Strip */}
                    <div className="relative z-10 grid grid-cols-5 gap-1.5 text-center">
                      {fivePrayersList.map((item) => {
                        const isNext = prayerData?.nextPrayer?.id === item.id;
                        return (
                          <div
                            key={item.id}
                            className={`py-2 px-1 rounded-2xl border transition-all ${
                              isNext
                                ? 'bg-gradient-to-b from-[#E6C66E] via-[#C8A24A] to-[#9E7824] text-[#070707] border-[#FFF3C4] shadow-[0_4px_15px_rgba(200,162,74,0.45)] scale-[1.03]'
                                : 'bg-[#12100B]/90 text-[#C4B998] border-[#C8A24A]/25'
                            }`}
                          >
                            <span
                              className={`text-[11px] block ${
                                isNext ? 'font-black text-[#070707]' : 'font-bold text-white'
                              }`}
                            >
                              {item.name}
                            </span>
                            <span
                              className={`text-[10px] font-mono tabular-nums block mt-0.5 ${
                                isNext ? 'font-extrabold text-[#070707]' : 'text-[#E6C66E]'
                              }`}
                            >
                              {item.time}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* ===================================================================== */}
              {/* SECTION 2: ATHAR TREE & DAILY WIRD WIDGET                             */}
              {/* ===================================================================== */}
              <div className="space-y-2 pt-3">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-bold text-[#E6C66E]">
                    • ودجت شجرة الأثر والورد اليومي: نسبة الإنجاز والأوراق المضيئة + الآية اليومية
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleToggleQuickPrayerForTree}
                      className="text-[10px] font-bold text-[#E6C66E] bg-[#1A160E] border border-[#C8A24A]/45 px-2.5 py-1 rounded-xl hover:bg-[#251F13]"
                      title="جرّب زيادة نسبة الإنجاز لرؤية نمو أوراق الشجرة"
                    >
                      إضاءة ورقة +
                    </button>
                    <button
                      onClick={() => handleActivateWidgetToast('ودجت شجرة الأثر والورد اليومي')}
                      className="text-[11px] font-extrabold text-[#070707] bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] px-3 py-1 rounded-xl shadow hover:opacity-95 active:scale-95 transition-all"
                    >
                      تثبيت الودجت
                    </button>
                  </div>
                </div>

                {/* Royal Athar Tree & Daily Verse Widget Card */}
                <div className="relative w-full rounded-[32px] p-[1.5px] bg-gradient-to-b from-[#F5E1A4] via-[#C8A24A]/75 to-[#5E4310] shadow-[0_18px_45px_rgba(0,0,0,0.95),0_0_28px_rgba(200,162,74,0.24)]">
                  <div className="relative w-full rounded-[30.5px] bg-gradient-to-b from-[#17130C] via-[#0D0B08] to-[#070605] p-4 sm:p-5 overflow-hidden">
                    {/* Ambient Glow */}
                    <div className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full bg-[#E6C66E]/15 blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex items-center gap-4">
                      {/* Left/Right Miniature Illuminated Tree of Athar */}
                      <div className="flex flex-col items-center">
                        <RoyalMiniImpactTreeSvg score={impactData.score} size={108} />
                        <div className="mt-1.5 px-2.5 py-0.5 rounded-full bg-[#1B170F] border border-[#E6C66E]/55 text-[11px] font-black text-[#E6C66E] font-mono tabular-nums shadow">
                          {impactData.score}٪ إنجاز اليوم
                        </div>
                      </div>

                      {/* Right Content: Worship Pillars + Daily Verse */}
                      <div className="flex-1 min-w-0 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Sparkles size={14} className="text-[#E6C66E]" />
                            <h4 className="text-sm font-extrabold text-[#F3E5AB]">
                              شجرة الأثر والورد اليومي
                            </h4>
                          </div>
                          <span className="text-[10px] font-extrabold text-[#E6C66E] bg-[#C8A24A]/15 border border-[#C8A24A]/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Flame size={11} className="fill-[#E6C66E]" />
                            <span>{impactData.streakDays} يوم</span>
                          </span>
                        </div>

                        {/* Progress Bar of Leaf Completion */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-[#C4B998] font-bold">
                            <span>اكتمال أوراق العبادات اليومية</span>
                            <span className="text-[#E6C66E] font-mono">
                              {impactData.prayersCompletedCount}/5 صلوات ·{' '}
                              {impactData.isMorningAdhkarDone || impactData.isEveningAdhkarDone
                                ? 'الأذكار ✓'
                                : 'الأذكار'}{' '}
                              · {impactData.isWirdDone ? 'الورد ✓' : 'الورد'}
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[#1C1811] border border-[#C8A24A]/35 overflow-hidden p-[1px]">
                            <div
                              className="h-full rounded-full bg-gradient-to-l from-[#FFF3C4] via-[#E6C66E] to-[#B68B2D] transition-all duration-500 shadow-[0_0_10px_rgba(230,198,110,0.8)]"
                              style={{ width: `${Math.max(8, impactData.score)}%` }}
                            />
                          </div>
                        </div>

                        {/* Daily Quranic Verse Inside Widget */}
                        <div className="p-2.5 rounded-2xl bg-[#100E0A]/95 border border-[#C8A24A]/40 space-y-1">
                          <p className="font-quran text-sm sm:text-base text-[#F3E5AB] leading-relaxed text-center">
                            ﴿{currentVerse.text}﴾
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-[#C8A24A] font-bold pt-0.5">
                            <span>الآية اليومية</span>
                            <span>{currentVerse.surah}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* SECTION 3: LIVE ACTIVITIES (LOCK SCREEN & DYNAMIC ISLAND)             */}
          {/* ===================================================================== */}
          {showLiveActivities && (
            <div className="space-y-4 pt-2 border-t border-[#C8A24A]/25">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-[#E6C66E]" />
                  <h3 className="text-sm font-extrabold text-[#F3E5AB]">
                    ٢. التنبيهات الحية (Live Activities & Dynamic Island)
                  </h3>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#C8A24A]/20 border border-[#E6C66E]/50 text-[#E6C66E] font-extrabold">
                  قبل الأذان بـ ١٥-٢٠ دقيقة حتى الإقامة
                </span>
              </div>

              {/* Interactive Live Activity Simulator Controls */}
              <div className="p-3.5 rounded-2xl bg-[#12100C] border border-[#C8A24A]/35 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-white flex items-center gap-1.5">
                    <Sliders size={14} className="text-[#E6C66E]" />
                    <span>محاكاة المرحلة الزمنية للنشاط الحي (Live Activity):</span>
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#E6C66E]">
                    التقدم: {liveProgressPercent}٪
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => {
                      setSimulatedPhase('pre_adhan');
                      setSimulatedMinutesLeft(14);
                    }}
                    className={`py-2 px-3 rounded-xl font-extrabold border transition-all ${
                      simulatedPhase === 'pre_adhan'
                        ? 'bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-[#070707] border-[#FFF3C4]'
                        : 'bg-[#191610] text-[#C4B998] border-[#C8A24A]/30'
                    }`}
                  >
                    اقتراب الأذان (قبل ١٥-٢٠ د)
                  </button>
                  <button
                    onClick={() => {
                      setSimulatedPhase('iqamah_countdown');
                      setSimulatedMinutesLeft(6);
                    }}
                    className={`py-2 px-3 rounded-xl font-extrabold border transition-all ${
                      simulatedPhase === 'iqamah_countdown'
                        ? 'bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-[#070707] border-[#FFF3C4]'
                        : 'bg-[#191610] text-[#C4B998] border-[#C8A24A]/30'
                    }`}
                  >
                    انتظار الإقامة (بعد الأذان)
                  </button>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-[#C4B998] font-bold shrink-0">
                    الدقائق المتبقية ({simulatedMinutesLeft} د):
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={simulatedPhase === 'pre_adhan' ? 20 : 15}
                    value={simulatedMinutesLeft}
                    onChange={(e) => setSimulatedMinutesLeft(Number(e.target.value))}
                    className="w-full accent-[#E6C66E] cursor-pointer"
                  />
                </div>
              </div>

              {/* A. DYNAMIC ISLAND (COMPACT & EXPANDED CAPSULES) */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-[#E6C66E] block px-1">
                  • كبسولة الجزيرة التفاعلية (Dynamic Island — الوضع المختصر والممتد):
                </span>

                {/* Compact Dynamic Island Pill */}
                <div className="flex justify-center">
                  <div className="inline-flex items-center justify-between gap-6 px-4 py-2 rounded-full bg-[#050505] border border-[#E6C66E]/65 shadow-[0_8px_25px_rgba(0,0,0,0.95),0_0_18px_rgba(200,162,74,0.3)] min-w-[250px]">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#241E11] border border-[#E6C66E]/70 flex items-center justify-center text-[#E6C66E]">
                        <Moon size={13} className="fill-[#E6C66E]" />
                      </div>
                      <span className="text-xs font-extrabold text-[#F3E5AB]">
                        {simulatedPhase === 'pre_adhan'
                          ? `أذان ${nextPrayerName}`
                          : `إقامة ${nextPrayerName}`}
                      </span>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-[#0F0F0F] border border-white/10" />
                    <span className="text-xs font-black font-mono tabular-nums text-[#E6C66E]">
                      -{String(simulatedMinutesLeft).padStart(2, '0')}:
                      {String(simulatedSecondsPart).padStart(2, '0')}
                    </span>
                  </div>
                </div>

                {/* Expanded Lock Screen Live Activity Banner */}
                <div className="relative w-full rounded-[30px] p-[1.5px] bg-gradient-to-r from-[#F5E1A4] via-[#C8A24A] to-[#6E5015] shadow-[0_18px_45px_rgba(0,0,0,0.95),0_0_30px_rgba(200,162,74,0.28)]">
                  <div className="relative w-full rounded-[28.5px] bg-gradient-to-b from-[#14110B] via-[#0B0A07] to-[#060504] p-4 sm:p-5 space-y-3.5 overflow-hidden">
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-52 h-24 bg-[#E6C66E]/15 blur-2xl pointer-events-none" />

                    {/* Top Row: Live Badge + App Identity + Target Prayer Time */}
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <AtharBrandLogo size="xs" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#E6C66E] animate-ping" />
                            <span className="text-[10px] font-extrabold text-[#E6C66E] tracking-wide">
                              {simulatedPhase === 'pre_adhan'
                                ? 'نشاط حي · اقتراب موعد الأذان'
                                : 'نشاط حي · العد التنازلي للإقامة'}
                            </span>
                          </div>
                          <h4 className="text-base sm:text-lg font-extrabold text-white mt-0.5">
                            {simulatedPhase === 'pre_adhan'
                              ? `صلاة ${nextPrayerName} تقترب`
                              : `إقامة صلاة ${nextPrayerName}`}
                          </h4>
                        </div>
                      </div>

                      <div className="text-left bg-[#1A160E] border border-[#E6C66E]/60 px-3 py-1.5 rounded-2xl">
                        <span className="text-[9px] text-[#C4B998] font-bold block">
                          {simulatedPhase === 'pre_adhan' ? 'متبقي للأذان' : 'متبقي للإقامة'}
                        </span>
                        <span className="text-base sm:text-lg font-black font-mono tabular-nums text-[#F3E5AB]">
                          {String(simulatedMinutesLeft).padStart(2, '0')}:
                          {String(simulatedSecondsPart).padStart(2, '0')}{' '}
                          <span className="text-[10px] text-[#E6C66E]">دقيقة</span>
                        </span>
                      </div>
                    </div>

                    {/* Golden Progress Bar from Pre-Adhan -> Adhan -> Iqamah */}
                    <div className="relative z-10 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-extrabold">
                        <span className="text-[#C4B998]">
                          {simulatedPhase === 'pre_adhan'
                            ? 'بداية التنبيه (قبل ٢٠ د)'
                            : `تم رفع أذان ${nextPrayerName}`}
                        </span>
                        <span className="text-[#E6C66E]">
                          {simulatedPhase === 'pre_adhan'
                            ? `موعد الأذان (${nextPrayerTime12}) ثم الإقامة`
                            : 'موعد إقامة الصلاة 🕌'}
                        </span>
                      </div>

                      {/* Royal Burnished Gold Progress Track */}
                      <div className="relative w-full h-3 rounded-full bg-[#1B170F] border border-[#C8A24A]/45 p-0.5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-l from-[#FFF5D6] via-[#E6C66E] to-[#9E7622] transition-all duration-500 shadow-[0_0_14px_rgba(230,198,110,0.9)]"
                          style={{ width: `${liveProgressPercent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[#C4B998] pt-0.5">
                        <span>
                          «حَيَّ عَلَى الصَّلَاةِ · حَيَّ عَلَى الْفَلَاحِ»
                        </span>
                        <span className="text-[#F3E5AB] font-bold">
                          شريط التقدم الذهبي المباشر
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* SECTION 4: FULL INTERACTIVE LOCK SCREEN & HOME SCREEN SIMULATOR       */}
          {/* ===================================================================== */}
          {showSimulator && (
            <div className="space-y-3 pt-2 border-t border-[#C8A24A]/25">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone size={16} className="text-[#E6C66E]" />
                  <h3 className="text-sm font-extrabold text-[#F3E5AB]">
                    ٣. معاينة شاشة القفل الحية على الهاتف
                  </h3>
                </div>
                {onOpenLockScreenPreview && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenLockScreenPreview();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-[#070707] text-xs font-extrabold shadow hover:opacity-95 active:scale-95 transition-all"
                  >
                    <Lock size={13} />
                    <span>فتح شاشة القفل الكاملة</span>
                  </button>
                )}
              </div>

              <p className="text-xs text-[#C4B998] leading-relaxed">
                تم دمج بطاقة <strong className="text-[#F3E5AB]">Live Activities</strong> وودجت{' '}
                <strong className="text-[#F3E5AB]">شجرة الأثر ومواقيت الصلاة</strong> داخل شاشة القفل الخاصة بالتطبيق لتعمل بنفس الهوية البصرية الملكية الداكنة والذهبية.
              </p>
            </div>
          )}
        </div>

        {/* Sticky Footer Action */}
        <div className="sticky bottom-0 z-30 bg-[#0A0907]/95 backdrop-blur-md border-t border-[#C8A24A]/35 p-4 flex items-center gap-2.5">
          {onOpenLockScreenPreview && (
            <button
              onClick={() => {
                onClose();
                onOpenLockScreenPreview();
              }}
              className="flex-1 py-3 px-4 rounded-2xl bg-[#1A160E] hover:bg-[#241E12] text-[#E6C66E] border border-[#C8A24A]/50 text-xs font-extrabold flex items-center justify-center gap-2 transition-all"
            >
              <Lock size={15} />
              <span>معاينة شاشة القفل الحية</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 athar-btn-primary py-3 px-4 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2"
          >
            <Check size={16} />
            <span>اعتماد وحفظ الودجات</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoyalWidgetsSuiteModal;
