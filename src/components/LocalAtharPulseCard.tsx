import React, { useState, useEffect } from 'react';
import {
  LocalAtharPulseService,
  LocalCityPulseSnapshot,
  BlessedTimeWindowId,
  BLESSED_TIME_WINDOWS,
  RadarPulseNode,
} from '../services/localAtharPulseService';
import { NavigationTab } from '../types';
import {
  MapPin,
  ShieldCheck,
  Radio,
  BookOpen,
  Heart,
  Compass,
  Clock,
  ChevronLeft,
  CheckCircle2,
  Activity,
} from 'lucide-react';

interface GoldenCityRadarSvgProps {
  nodes: RadarPulseNode[];
  pulseSpeedSeconds: number;
  hasUserJoined: boolean;
  compact?: boolean;
  onSelectNode?: (node: RadarPulseNode) => void;
  selectedNodeId?: string | null;
}

/**
 * خريطة ورادار نبض المدينة — موجات دائرية حرارية هادئة (بدون أي نجوم أو نقاط متلألئة)
 */
const GoldenCityRadarSvg: React.FC<GoldenCityRadarSvgProps> = ({
  nodes,
  pulseSpeedSeconds,
  hasUserJoined,
  compact = false,
  onSelectNode,
  selectedNodeId,
}) => {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_center,#231C0F_0%,#110E08_62%,#080705_100%)] border border-[#C8A24A]/40 shadow-[inset_0_0_25px_rgba(200,162,74,0.12)] ${
        compact ? 'w-24 h-24 sm:w-28 sm:h-28 shrink-0' : 'w-full h-44 sm:h-48'
      }`}
    >
      {/* Pure Concentric Golden Radar Rings & Thermal Aura (Zero Stars) */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full select-none"
        aria-label="خريطة نبض الطاعة في المنطقة"
      >
        <defs>
          <radialGradient id="goldHeatGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E6C66E" stopOpacity="0.38" />
            <stop offset="55%" stopColor="#C8A24A" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#C8A24A" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="nodeHeatSpot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E6C66E" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#C8A24A" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#C8A24A" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="radarSweepGrad" x1="50%" y1="50%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E6C66E" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#C8A24A" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Ambient Center Heatmap Glow */}
        <circle cx="50" cy="50" r="42" fill="url(#goldHeatGlow)" />

        {/* Concentric Golden Circles Only (No stars, no polygons, no crosshairs) */}
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="#C8A24A"
          strokeWidth="0.4"
          strokeOpacity="0.3"
        />
        <circle
          cx="50"
          cy="50"
          r="30"
          fill="none"
          stroke="#C8A24A"
          strokeWidth="0.4"
          strokeOpacity="0.28"
        />
        <circle
          cx="50"
          cy="50"
          r="18"
          fill="none"
          stroke="#E6C66E"
          strokeWidth="0.4"
          strokeOpacity="0.32"
        />

        {/* Rotating Golden Radar Sweep Beam */}
        <g>
          <path
            d="M 50 50 L 50 8 A 42 42 0 0 1 86 28 Z"
            fill="url(#radarSweepGrad)"
          />
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 50 50"
            to="360 50 50"
            dur="8s"
            repeatCount="indefinite"
          />
        </g>

        {/* Expanding Golden Pulse Waves */}
        <circle
          cx="50"
          cy="50"
          r="10"
          fill="none"
          stroke="#E6C66E"
          strokeWidth="0.65"
          strokeOpacity="0.5"
        >
          <animate
            attributeName="r"
            values="8;42"
            dur={`${pulseSpeedSeconds}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-opacity"
            values="0.6;0"
            dur={`${pulseSpeedSeconds}s`}
            repeatCount="indefinite"
          />
        </circle>

        <circle
          cx="50"
          cy="50"
          r="22"
          fill="none"
          stroke="#C8A24A"
          strokeWidth="0.5"
          strokeOpacity="0.38"
        >
          <animate
            attributeName="r"
            values="8;42"
            dur={`${pulseSpeedSeconds}s`}
            begin={`${pulseSpeedSeconds / 2}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-opacity"
            values="0.45;0"
            dur={`${pulseSpeedSeconds}s`}
            begin={`${pulseSpeedSeconds / 2}s`}
            repeatCount="indefinite"
          />
        </circle>

        {/* Soft Thermal Heatmap Zones for Districts (Warm diffused circles, no bright stars) */}
        {nodes.slice(0, 6).map((node) => {
          const isSelected = selectedNodeId === node.id;
          return (
            <g
              key={node.id}
              onClick={() => {
                if (!compact && onSelectNode) {
                  onSelectNode(node);
                }
              }}
              className={!compact && onSelectNode ? 'cursor-pointer' : ''}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={isSelected ? 9 : 7}
                fill="url(#nodeHeatSpot)"
              />
              {!compact && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isSelected ? 2.4 : 1.8}
                  fill={isSelected ? '#F3E5AB' : '#C8A24A'}
                  fillOpacity="0.85"
                />
              )}
            </g>
          );
        })}

        {/* Central Circular Beacon */}
        <circle
          cx="50"
          cy="50"
          r={hasUserJoined ? '2.8' : '2.0'}
          fill="#E6C66E"
          fillOpacity="0.9"
        />
      </svg>

      {!compact && (
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 text-[10px] font-bold text-[#F3E5AB]/90 bg-[#0A0907]/85 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-[#C8A24A]/30 pointer-events-none">
          <Radio size={12} className="text-[#E6C66E]" />
          <span>الخريطة الحرارية للمنطقة</span>
        </div>
      )}

      {!compact && (
        <div className="absolute bottom-2 inset-x-3 flex items-center justify-end text-[10px] text-[#C4B998] pointer-events-none">
          <span className="text-[#E6C66E] font-bold">
            {hasUserJoined ? 'أثرك مضيء في منطقتك' : 'اضغط على الدوائر الحرارية لعرض الحي'}
          </span>
        </div>
      )}
    </div>
  );
};

interface LocalAtharPulseCardProps {
  onNavigate: (tab: NavigationTab) => void;
  onOpenTasbih: () => void;
  onOpenSakina: () => void;
  isExpandedView?: boolean;
  onToggleExpandedView?: (expanded: boolean) => void;
}

export const LocalAtharPulseCard: React.FC<LocalAtharPulseCardProps> = ({
  onNavigate,
  onOpenTasbih,
  onOpenSakina,
  isExpandedView = false,
  onToggleExpandedView,
}) => {
  const [selectedWindow, setSelectedWindow] = useState<BlessedTimeWindowId>('live');
  const [snapshot, setSnapshot] = useState<LocalCityPulseSnapshot>(() =>
    LocalAtharPulseService.getPulseSnapshot('live')
  );
  const [selectedNode, setSelectedNode] = useState<RadarPulseNode | null>(null);
  const [joinToastMessage, setJoinToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setSnapshot(LocalAtharPulseService.getPulseSnapshot(selectedWindow));
    const interval = setInterval(() => {
      setSnapshot(LocalAtharPulseService.getPulseSnapshot(selectedWindow));
    }, 8000);
    return () => clearInterval(interval);
  }, [selectedWindow]);

  const handleJoinPulseNow = (navigateImmediately: boolean = false) => {
    LocalAtharPulseService.recordUserJoinPulse();
    const updated = LocalAtharPulseService.getPulseSnapshot(selectedWindow);
    setSnapshot(updated);

    setJoinToastMessage(
      `تم تسجيل أثرك في نبض ${updated.formattedLocation}! تقبل الله طاعتك.`
    );
    setTimeout(() => {
      setJoinToastMessage(null);
    }, 3500);

    if (navigateImmediately) {
      if (onToggleExpandedView) onToggleExpandedView(false);
      if (updated.windowMeta.openTasbih) {
        onOpenTasbih();
      } else if (updated.windowMeta.openSakina) {
        onOpenSakina();
      } else {
        onNavigate(updated.windowMeta.targetTab);
      }
    }
  };

  const timeWindowOptions: { id: BlessedTimeWindowId; label: string }[] = [
    { id: 'live', label: 'النبض الآن' },
    { id: 'fajr', label: BLESSED_TIME_WINDOWS.fajr.shortLabel },
    { id: 'morning_adhkar', label: BLESSED_TIME_WINDOWS.morning_adhkar.shortLabel },
    { id: 'dhuhr_jumuah', label: BLESSED_TIME_WINDOWS.dhuhr_jumuah.shortLabel },
    { id: 'asr_evening', label: BLESSED_TIME_WINDOWS.asr_evening.shortLabel },
    { id: 'maghrib_isha', label: BLESSED_TIME_WINDOWS.maghrib_isha.shortLabel },
    { id: 'last_third', label: BLESSED_TIME_WINDOWS.last_third.shortLabel },
  ];

  // FULL INLINE SUBVIEW INSIDE EXPLORE (Fits cleanly, no stretched page, top header back button returns to Explore)
  if (isExpandedView) {
    return (
      <div className="rounded-3xl bg-gradient-to-b from-[#1D180E] via-[#120F0A] to-[#0B0907] border border-[#E6C66E]/55 p-4 shadow-xl space-y-3 text-right">
        {/* Location & Population Summary Strip */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#C8A24A]/25">
          <div className="flex items-center flex-wrap gap-1.5 text-xs font-bold text-[#E6C66E]">
            <MapPin size={14} className="text-[#E6C66E] shrink-0" />
            <span className="text-[#F3E5AB]">{snapshot.formattedLocation}</span>
            <span aria-hidden="true">·</span>
            <span className="text-[11px] text-[#C4B998] font-medium">
              {snapshot.cityPopulationLabel}
            </span>
          </div>

          <span className="text-xs font-extrabold text-[#E6C66E] tabular-nums shrink-0">
            +{snapshot.totalActiveWorshippers.toLocaleString('ar-EG')} ذاكر ومصلٍّ
          </span>
        </div>

        {/* Time Window Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {timeWindowOptions.map((item) => {
            const isActive = selectedWindow === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedWindow(item.id);
                  setSelectedNode(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap shrink-0 border transition-all ${
                  isActive
                    ? 'bg-[#C8A24A] text-[#070707] border-[#F3E5AB]'
                    : 'bg-[#15120C] text-[#C4B998] border-[#C8A24A]/25 hover:border-[#E6C66E]/60'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Compact Heatmap Radar (Zero Stars) */}
        <GoldenCityRadarSvg
          nodes={snapshot.radarNodes}
          pulseSpeedSeconds={snapshot.pulseSpeedSeconds}
          hasUserJoined={snapshot.hasUserJoinedCurrentSession}
          compact={false}
          selectedNodeId={selectedNode?.id || null}
          onSelectNode={(node) => setSelectedNode(node)}
        />

        {/* Selected District or Current Time Window Info */}
        <div className="rounded-2xl bg-[#14110B] border border-[#C8A24A]/35 p-3">
          {selectedNode ? (
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-extrabold text-[#F3E5AB]">
                  نطاق النشاط · {selectedNode.districtHint} ({snapshot.cityName})
                </h4>
                <p className="text-[11px] text-[#C4B998] mt-0.5">
                  الطاعة الغالبة الآن:{' '}
                  <span className="text-[#E6C66E] font-bold">
                    {selectedNode.category === 'quran'
                      ? 'تلاوة القرآن الكريم'
                      : selectedNode.category === 'adhkar'
                      ? 'الأذكار والتسبيح'
                      : 'الصلاة والقيام'}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-[11px] font-bold text-[#E6C66E] hover:underline shrink-0"
              >
                عرض الكل
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <h4 className="text-xs font-extrabold text-[#F3E5AB]">
                {snapshot.windowMeta.titleArabic}
              </h4>
              <p className="text-xs text-[#C4B998] leading-relaxed">
                {snapshot.headlineText}
              </p>
            </div>
          )}
        </div>

        {/* Compact 3-Column Worship Distribution (Side-by-side so page is never overly tall) */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-xl bg-[#15120C] border border-[#C8A24A]/30 text-center space-y-1">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#F3E5AB]">
              <BookOpen size={12} className="text-[#E6C66E]" />
              <span>قرآن</span>
            </div>
            <div className="text-xs font-extrabold text-[#E6C66E] tabular-nums">
              {snapshot.quranCount.toLocaleString('ar-EG')}
            </div>
            <div className="text-[10px] text-[#C4B998] tabular-nums">
              {snapshot.windowMeta.distribution.quranPercent}%
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#15120C] border border-[#C8A24A]/30 text-center space-y-1">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#F3E5AB]">
              <Heart size={12} className="text-[#E6C66E]" />
              <span>أذكار</span>
            </div>
            <div className="text-xs font-extrabold text-[#E6C66E] tabular-nums">
              {snapshot.adhkarCount.toLocaleString('ar-EG')}
            </div>
            <div className="text-[10px] text-[#C4B998] tabular-nums">
              {snapshot.windowMeta.distribution.adhkarPercent}%
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#15120C] border border-[#C8A24A]/30 text-center space-y-1">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#F3E5AB]">
              <Compass size={12} className="text-[#E6C66E]" />
              <span>صلاة</span>
            </div>
            <div className="text-xs font-extrabold text-[#E6C66E] tabular-nums">
              {snapshot.prayerCount.toLocaleString('ar-EG')}
            </div>
            <div className="text-[10px] text-[#C4B998] tabular-nums">
              {snapshot.windowMeta.distribution.prayerPercent}%
            </div>
          </div>
        </div>

        {joinToastMessage && (
          <div className="p-2.5 rounded-xl bg-[#241E11] border border-[#E6C66E]/60 text-xs font-bold text-[#F3E5AB] flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 size={15} className="text-[#E6C66E] shrink-0" />
            <span>{joinToastMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => handleJoinPulseNow(true)}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-l from-[#E6C66E] to-[#C8A24A] hover:from-[#F3E5AB] hover:to-[#E6C66E] text-[#070707] font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-[0.99] transition-all min-h-[42px]"
          >
            <Radio size={15} />
            <span>{snapshot.windowMeta.recommendedActionLabel}</span>
          </button>

          <button
            onClick={() => handleJoinPulseNow(false)}
            className="px-3.5 py-2.5 rounded-xl bg-[#18150E] hover:bg-[#241F15] border border-[#C8A24A]/40 text-xs font-bold text-[#F3E5AB] min-h-[42px]"
          >
            + سجل أثرك
          </button>
        </div>
      </div>
    );
  }

  // COMPACT CARD AT THE BOTTOM OF EXPLORE MAIN VIEW
  return (
    <div className="relative rounded-3xl bg-gradient-to-b from-[#1D180E] via-[#120F0A] to-[#0B0907] border border-[#E6C66E]/55 p-4 shadow-[0_14px_35px_rgba(0,0,0,0.85)] overflow-hidden text-right">
      {/* Top Header Row: Title + City & District */}
      <div className="flex items-start justify-between gap-2.5 mb-3">
        <div className="space-y-1">
          <div className="flex items-center flex-wrap gap-1.5 text-xs font-bold text-[#E6C66E]">
            <Activity size={14} className="text-[#E6C66E] shrink-0" />
            <span>الأثر الحي في منطقتك</span>
            <span aria-hidden="true" className="text-[#C8A24A]/60">
              ·
            </span>
            <span className="inline-flex items-center gap-1 text-[#F3E5AB]">
              <MapPin size={12} className="text-[#E6C66E]" />
              {snapshot.formattedLocation}
            </span>
          </div>

          <h2 className="text-sm sm:text-base font-extrabold text-white leading-snug">
            {snapshot.windowMeta.titleArabic}
          </h2>
        </div>

        <button
          onClick={() => onToggleExpandedView && onToggleExpandedView(true)}
          className="px-3 py-1.5 rounded-xl bg-[#251E11] hover:bg-[#302716] border border-[#E6C66E]/45 text-xs font-extrabold text-[#F3E5AB] flex items-center gap-1 shrink-0 transition-colors min-h-[36px]"
        >
          <span>رادار المنطقة</span>
          <ChevronLeft size={14} className="text-[#E6C66E]" />
        </button>
      </div>

      {/* Center Body: Compact Golden Radar + Live Estimated Worshippers */}
      <div className="flex items-center gap-3.5 bg-[#0D0B08]/90 border border-[#C8A24A]/30 rounded-2xl p-3">
        <div
          onClick={() => onToggleExpandedView && onToggleExpandedView(true)}
          className="cursor-pointer group relative shrink-0"
          title="اضغط لفتح رادار المنطقة"
        >
          <GoldenCityRadarSvg
            nodes={snapshot.radarNodes}
            pulseSpeedSeconds={snapshot.pulseSpeedSeconds}
            hasUserJoined={snapshot.hasUserJoinedCurrentSession}
            compact={true}
          />
        </div>

        <div className="flex-1 space-y-1.5 text-right min-w-0">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-extrabold text-[#F3E5AB] tabular-nums tracking-tight">
                +{snapshot.totalActiveWorshippers.toLocaleString('ar-EG')}
              </span>
              <span className="text-[11px] font-bold text-[#E6C66E]">
                ذاكر ومصلٍّ الآن
              </span>
            </div>
          </div>

          <p className="text-xs font-bold text-white/95 leading-relaxed whitespace-normal break-words">
            {snapshot.headlineText}
          </p>

          {/* Clean Breakdown Metadata */}
          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 pt-0.5 text-[11px] text-[#C4B998] tabular-nums">
            <span className="text-[#E6C66E] font-bold">
              قرآن: {snapshot.quranCount.toLocaleString('ar-EG')}
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-[#F3E5AB] font-bold">
              أذكار: {snapshot.adhkarCount.toLocaleString('ar-EG')}
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-[#C4B998] font-bold">
              صلاة: {snapshot.prayerCount.toLocaleString('ar-EG')}
            </span>
          </div>
        </div>
      </div>

      {joinToastMessage && (
        <div className="mt-2.5 p-2 rounded-xl bg-[#241E11] border border-[#E6C66E]/60 text-xs font-bold text-[#F3E5AB] flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={15} className="text-[#E6C66E] shrink-0" />
          <span>{joinToastMessage}</span>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="mt-3 pt-2.5 border-t border-[#C8A24A]/20 flex items-center justify-between gap-2">
        <button
          onClick={() => handleJoinPulseNow(true)}
          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-l from-[#E6C66E] to-[#C8A24A] hover:from-[#F3E5AB] hover:to-[#E6C66E] text-[#070707] font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all min-h-[40px]"
        >
          <Radio size={14} />
          <span>انضم للنبض الآن</span>
        </button>

        <button
          onClick={() => onToggleExpandedView && onToggleExpandedView(true)}
          className="px-3 py-2 rounded-xl bg-[#17140D] hover:bg-[#221D13] text-[#E6C66E] border border-[#C8A24A]/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors min-h-[40px]"
        >
          <Clock size={14} />
          <span>الأوقات الفاضلة</span>
        </button>
      </div>
    </div>
  );
};
