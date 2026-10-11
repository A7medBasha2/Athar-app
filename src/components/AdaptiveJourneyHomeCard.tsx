import React, { useState, useEffect } from 'react';
import {
  NavigationTab,
  JourneyActivityNode,
  JourneyRecommendationResult,
  JourneyPreferences,
} from '../types';
import {
  AdaptiveJourneyService,
  WeeklyJourneyRecap,
} from '../services/adaptiveJourneyService';
import {
  JOURNEY_PATHS_META,
  ADAPTIVE_JOURNEY_NODES,
} from '../data/adaptiveJourneyData';
import {
  Compass,
  BookOpen,
  Heart,
  Clock,
  ChevronLeft,
  RotateCcw,
  SlidersHorizontal,
  ShieldCheck,
  CheckCircle2,
  Bookmark,
} from 'lucide-react';

interface AdaptiveJourneyHomeCardProps {
  onOpenJourneyHub: (initialNodeId?: string, openOnboarding?: boolean) => void;
  onNavigate?: (tab: NavigationTab) => void;
}

export const AdaptiveJourneyHomeCard: React.FC<AdaptiveJourneyHomeCardProps> = ({
  onOpenJourneyHub,
}) => {
  const [prefs, setPrefs] = useState<JourneyPreferences>(() =>
    AdaptiveJourneyService.getPreferences()
  );
  const [recommendation, setRecommendation] =
    useState<JourneyRecommendationResult | null>(() =>
      AdaptiveJourneyService.getAdaptiveRecommendation()
    );
  const [recap, setRecap] = useState<WeeklyJourneyRecap>(() =>
    AdaptiveJourneyService.getWeeklyPersonalRecap()
  );

  const refreshJourneyState = () => {
    setPrefs(AdaptiveJourneyService.getPreferences());
    setRecommendation(AdaptiveJourneyService.getAdaptiveRecommendation());
    setRecap(AdaptiveJourneyService.getWeeklyPersonalRecap());
  };

  useEffect(() => {
    refreshJourneyState();
    const handler = () => refreshJourneyState();
    window.addEventListener('athar_journey_updated', handler);
    return () => window.removeEventListener('athar_journey_updated', handler);
  }, []);

  const handleReplaceRecommendation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!recommendation) return;
    AdaptiveJourneyService.dismissRecommendation(recommendation.node.id, true);
    refreshJourneyState();
  };

  const activeNode: JourneyActivityNode =
    recommendation?.node || ADAPTIVE_JOURNEY_NODES[0];
  const pathMeta = JOURNEY_PATHS_META[activeNode.path];

  return (
    <section
      aria-label="الرحلة الإيمانية التكيفية"
      className="rounded-3xl bg-[#151515] border border-[#D6B36A]/40 p-4 sm:p-5 shadow-[0_14px_38px_rgba(0,0,0,0.9)] space-y-4 text-right"
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#1C1A16] border border-[#D6B36A]/50 flex items-center justify-center text-[#D6B36A] shrink-0">
            <Compass size={21} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold text-[#F2EBDD]">
                أثر | الرحلة الإيمانية التكيفية
              </h2>
              <span className="px-2 py-0.5 rounded-lg bg-[#1C1A16] border border-[#D6B36A]/35 text-[10px] font-bold text-[#D6B36A]">
                {prefs.preferredDurationMinutes} دقائق
              </span>
            </div>
            <p className="text-[11px] text-[#B6B0A3] mt-0.5">
              مسارات مترابطة: المعرفة · العمل · السكينة — وفق وقتك واختيارك
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenJourneyHub(undefined, true)}
          className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-[#1C1A16] hover:bg-[#25221B] border border-[#D6B36A]/30 text-[#D6B36A] text-[11px] font-bold flex items-center gap-1.5 transition-colors shrink-0"
          title="تخصيص الأهداف والوقت المتاح"
        >
          <SlidersHorizontal size={13} />
          <span>تخصيص</span>
        </button>
      </div>

      {/* Three Paths Quick Strip (المعرفة · العمل · السكينة) */}
      <div className="grid grid-cols-3 gap-2">
        {(['knowledge', 'practice', 'serenity'] as const).map((pathKey) => {
          const meta = JOURNEY_PATHS_META[pathKey];
          const isCurrentRecPath = activeNode.path === pathKey;
          const countVisited = recap.visitedPathsCount[pathKey] || 0;
          return (
            <button
              key={pathKey}
              type="button"
              onClick={() => onOpenJourneyHub()}
              className={`p-2.5 rounded-2xl border text-right transition-all min-h-[64px] flex flex-col justify-between ${
                isCurrentRecPath
                  ? 'bg-[#1C1A16] border-[#D6B36A]/70 text-[#F2EBDD]'
                  : 'bg-[#0A0A0A] border-[#D6B36A]/20 text-[#B6B0A3] hover:border-[#D6B36A]/45'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-extrabold text-[#D6B36A]">
                  {meta.titleArabic}
                </span>
                <span className="text-[10px] font-mono text-[#B6B0A3]">
                  {countVisited > 0 ? `${countVisited} محطة` : 'متاح'}
                </span>
              </div>
              <p className="text-[10px] text-[#B6B0A3] line-clamp-1 mt-1">
                {pathKey === 'knowledge'
                  ? 'قرآن وتفسير وسيرة'
                  : pathKey === 'practice'
                  ? 'تطبيق عملي مرن'
                  : 'تلاوة وذكر هادئ'}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active Recommendation or Paused Session Card */}
      {recommendation ? (
        <div className="rounded-2xl bg-[#1C1A16] border border-[#D6B36A]/40 p-3.5 space-y-2.5">
          {/* Transparent Reason Banner */}
          <div className="flex items-center justify-between gap-2 text-[10px] text-[#D6B36A] bg-[#0A0A0A]/80 px-2.5 py-1.5 rounded-xl border border-[#D6B36A]/20">
            <div className="flex items-center gap-1.5 min-w-0">
              <ShieldCheck size={13} className="shrink-0 text-[#D6B36A]" />
              <span className="truncate font-semibold">
                {recommendation.matchType === 'resume_paused'
                  ? 'استئناف هادئ: '
                  : 'سبب الاقتراح: '}
                {recommendation.reasonsArabic[0]}
              </span>
            </div>
            <button
              type="button"
              onClick={handleReplaceRecommendation}
              className="text-[#B6B0A3] hover:text-[#F2EBDD] flex items-center gap-1 shrink-0 font-bold"
              title="استبدال المقترح بمحطة أخرى"
            >
              <RotateCcw size={11} />
              <span>استبدال</span>
            </button>
          </div>

          {/* Activity Details */}
          <div className="flex items-start justify-between gap-3 pt-0.5">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold text-[#D6B36A]">
                  مسار {pathMeta.titleArabic}
                </span>
                <span className="text-[#B6B0A3]">•</span>
                <span className="text-[10px] text-[#B6B0A3] flex items-center gap-1">
                  <Clock size={11} />
                  {activeNode.durationMinutes} دقائق
                </span>
              </div>
              <h3 className="text-sm font-extrabold text-[#F2EBDD] leading-snug">
                {activeNode.title}
              </h3>
              <p className="text-xs text-[#B6B0A3] leading-relaxed line-clamp-2">
                {activeNode.subtitle}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-1 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onOpenJourneyHub(activeNode.id)}
              className="flex-1 min-h-[44px] rounded-xl bg-[#D6B36A] hover:bg-[#e2c27e] text-[#0A0A0A] font-extrabold text-xs px-4 py-2.5 flex items-center justify-center gap-1.5 transition-all active:scale-[0.99]"
            >
              <BookOpen size={15} />
              <span>
                {recommendation.matchType === 'resume_paused'
                  ? 'استئناف المحطة من حيث توقفت'
                  : 'بدء المحطة الآن'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onOpenJourneyHub()}
              className="min-h-[44px] rounded-xl bg-[#0A0A0A] hover:bg-[#151515] text-[#F2EBDD] border border-[#D6B36A]/35 font-bold text-xs px-3.5 py-2.5 flex items-center gap-1 transition-all"
            >
              <span>خريطة المسارات</span>
              <ChevronLeft size={14} className="text-[#D6B36A]" />
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#1C1A16] border border-[#D6B36A]/30 p-3.5 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-extrabold text-[#F2EBDD]">
              التوصيات التلقائية متوقفة بناءً على اختيارك
            </h3>
            <p className="text-[11px] text-[#B6B0A3] mt-0.5">
              يمكنك تصفح خريطة المسارات الثلاثة بحرية تامة أو إعادة تفعيل المقترحات.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenJourneyHub()}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#D6B36A] text-[#0A0A0A] text-xs font-extrabold shrink-0"
          >
            فتح الخريطة
          </button>
        </div>
      )}

      {/* Footer Status Summary (Non-judgmental, Zero Guilt) */}
      <div className="flex items-center justify-between text-[11px] text-[#B6B0A3] pt-1 border-t border-[#D6B36A]/20">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <CheckCircle2 size={12} className="text-[#D6B36A]" />
            <span>{recap.completedNodesThisWeek.length} مكتملة</span>
          </span>
          {recap.inProgressNodes.length > 0 && (
            <span className="flex items-center gap-1 text-[#F2EBDD]">
              <Heart size={12} className="text-[#D6B36A]" />
              <span>{recap.inProgressNodes.length} قيد الاستئناف</span>
            </span>
          )}
          {recap.savedNodes.length > 0 && (
            <span className="flex items-center gap-1">
              <Bookmark size={12} className="text-[#D6B36A]" />
              <span>{recap.savedNodes.length} محفوظة</span>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onOpenJourneyHub()}
          className="text-[#D6B36A] font-bold hover:underline flex items-center gap-0.5"
        >
          <span>كل المحطات ({ADAPTIVE_JOURNEY_NODES.length})</span>
          <ChevronLeft size={12} />
        </button>
      </div>
    </section>
  );
};
