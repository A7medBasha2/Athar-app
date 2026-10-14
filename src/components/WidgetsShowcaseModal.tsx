import React, { useState, useEffect } from 'react';
import {
  LiveActivityService,
  LiveActivityState,
  LockScreenWidgetStyle,
  PerPrayerIqamahOffsets,
  PreAdhanIqamahPhase,
} from '../services/liveActivityService';
import { StorageService } from '../services/storageService';
import { ImpactTreeService, ImpactBreakdown } from '../services/impactTreeService';
import { ReminderEngine } from '../services/reminderService';
import {
  SmallPrayerWidgetCard,
  ImpactTreeWirdWidgetCard,
  WideImpactTreeWirdWidgetCard,
  MediumPrayerWidgetCard,
  PreAdhanIqamahLiveCard,
} from './PrayerWidgetsKit';
import {
  X,
  Lock,
  Sparkles,
  Check,
  LayoutGrid,
  Smartphone,
  WifiOff,
  BellRing,
  Clock,
  Pin,
  ExternalLink,
  Volume2,
  RefreshCw,
} from 'lucide-react';
import { OngoingPrayerService } from '../services/ongoingPrayerService';
import { NativePermissionsBridge } from '../services/nativePermissionsBridge';

interface WidgetsShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullLockScreen?: () => void;
}

export const WidgetsShowcaseModal: React.FC<WidgetsShowcaseModalProps> = ({
  isOpen,
  onClose,
  onOpenFullLockScreen,
}) => {
  const [liveState, setLiveState] = useState<LiveActivityState>(() =>
    LiveActivityService.getState()
  );
  const [impactBreakdown, setImpactBreakdown] = useState<ImpactBreakdown>(() =>
    ImpactTreeService.calculateImpact()
  );
  const [simPhase, setSimPhase] = useState<PreAdhanIqamahPhase | null>(() =>
    LiveActivityService.getSimulatedLivePhase()
  );
  const [isOngoingEnabled, setIsOngoingEnabled] = useState<boolean>(() =>
    OngoingPrayerService.isOngoingEnabled()
  );
  const [testAthanRunning, setTestAthanRunning] = useState<boolean>(false);
  const [widgetSyncStatus, setWidgetSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setImpactBreakdown(ImpactTreeService.calculateImpact());
    setIsOngoingEnabled(OngoingPrayerService.isOngoingEnabled());

    const unsub = LiveActivityService.subscribe((newState) => {
      setLiveState(newState);
    });
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference -
    (Math.min(100, Math.max(0, liveState.progressPercent)) / 100) * circumference;

  const activeStyle: LockScreenWidgetStyle =
    liveState.settings.lockScreenWidgetStyle || 'all';

  const handleSelectStyle = (style: LockScreenWidgetStyle) => {
    LiveActivityService.saveSettings({
      enabled: true,
      showLockScreenWidget: true,
      lockScreenWidgetStyle: style,
    });
  };

  const handleSetSimPhase = (phase: PreAdhanIqamahPhase | null) => {
    setSimPhase(phase);
    LiveActivityService.setSimulatedLivePhase(phase);
  };

  const handleChangeIqamahOffset = (
    prayerId: keyof PerPrayerIqamahOffsets,
    delta: number
  ) => {
    const currentVal = liveState.settings.iqamahOffsets?.[prayerId] ?? 15;
    LiveActivityService.setPrayerIqamahOffset(prayerId, currentVal + delta);
  };

  const handleToggleOngoing = async () => {
    const nextVal = !isOngoingEnabled;
    setIsOngoingEnabled(nextVal);
    await OngoingPrayerService.setOngoingEnabled(nextVal);
  };

  const handleSyncWidget = async () => {
    setWidgetSyncStatus('جارٍ التحديث...');
    const cached = StorageService.getCachedPrayers();
    if (cached) {
      await OngoingPrayerService.syncWithPrayerData(cached);
      setWidgetSyncStatus('تم التحديث ✓');
    } else {
      setWidgetSyncStatus('تم إرسال أمر التحديث ✓');
    }
    setTimeout(() => {
      setWidgetSyncStatus(null);
    }, 2500);
  };

  const handleTestNativeFullScreenAthan = async () => {
    setTestAthanRunning(true);
    await NativePermissionsBridge.triggerFullScreenAthan('صلاة الفجر', '05:15');
    setTimeout(() => {
      setTestAthanRunning(false);
    }, 3000);
  };

  const prayersForIqamah: Array<{
    id: keyof PerPrayerIqamahOffsets;
    label: string;
  }> = [
    { id: 'fajr', label: 'الفجر' },
    { id: 'dhuhr', label: 'الظهر' },
    { id: 'asr', label: 'العصر' },
    { id: 'maghrib', label: 'المغرب' },
    { id: 'isha', label: 'العشاء' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-fadeIn">
      <div className="w-full max-w-lg bg-gradient-to-b from-[#17130C] via-[#0D0B08] to-[#070707] border-t sm:border border-[#C8A24A]/65 rounded-t-[32px] sm:rounded-[32px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_30px_rgba(200,162,74,0.2)] flex flex-col max-h-[92vh] overflow-y-auto text-right space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#C8A24A]/25 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-[#221C10] border border-[#C8A24A]/50 text-[#E6C66E]">
              <LayoutGrid size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-[#F3E5AB]">
                مجموعة ودجات «أثر» والتنبيهات الحية المتكاملة
              </h2>
              <p className="text-[11px] text-[#C4B998] flex items-center gap-1.5 mt-0.5">
                <WifiOff size={11} className="text-[#E6C66E]" />
                <span>تعمل على الشاشة الرئيسية وشاشة القفل بالهوية الملكية الذهبية</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#18140D] hover:bg-[#241E13] text-[#C4B998] hover:text-white border border-[#C8A24A]/35 transition-colors"
            title="إغلاق"
          >
            <X size={16} />
          </button>
        </div>

        {/* Section 1: Small Widgets Grid (Small Prayer Widget + Impact Tree & Daily Verse Widget) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold text-[#E6C66E] flex items-center gap-1.5">
              <Sparkles size={13} />
              <span>١. الودجات الصغيرة (الصلاة القادمة + شجرة الأثر والآية)</span>
            </span>
            <span className="text-[10px] text-[#C4B998]">Small Widgets</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <SmallPrayerWidgetCard state={liveState} />
            <ImpactTreeWirdWidgetCard
              state={liveState}
              impactBreakdown={impactBreakdown}
            />
          </div>
        </div>

        {/* Section 2: Medium Prayer Widget (Next Prayer + Full Daily Schedule) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold text-[#E6C66E] flex items-center gap-1.5">
              <Sparkles size={13} />
              <span>٢. ودجت مواقيت الصلاة المتوسط (Medium Widget)</span>
            </span>
            <span className="text-[10px] text-[#C4B998]">
              الصلاة القادمة + جدول صلوات اليوم
            </span>
          </div>

          <MediumPrayerWidgetCard state={liveState} />
        </div>

        {/* Section 3: Wide Impact Tree & Daily Wird/Verse Widget */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold text-[#E6C66E] flex items-center gap-1.5">
              <Sparkles size={13} />
              <span>٣. ودجت شجرة الأثر والورد اليومي الموسّع</span>
            </span>
            <span className="text-[10px] text-[#C4B998]">
              تكتمل أوراقها بحسب طاعاتك + الآية اليومية
            </span>
          </div>

          <WideImpactTreeWirdWidgetCard
            state={liveState}
            impactBreakdown={impactBreakdown}
          />
        </div>

        {/* Section 4: Live Activities (15-20m Pre-Adhan to Iqamah) & Dynamic Island */}
        <div className="rounded-2xl bg-[#120F0A] border border-[#C8A24A]/45 p-3.5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-extrabold text-[#E6C66E] flex items-center gap-1.5">
              <Smartphone size={14} />
              <span>٤. التنبيهات الحية (Live Activities) حتى موعد الإقامة</span>
            </span>
            <button
              onClick={() =>
                LiveActivityService.saveSettings({
                  showDynamicIsland: !liveState.settings.showDynamicIsland,
                })
              }
              className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold border transition-all whitespace-nowrap ${
                liveState.settings.showDynamicIsland
                  ? 'bg-[#262011] border-[#E6C66E] text-[#F3E5AB]'
                  : 'bg-[#16130D] border-[#C8A24A]/25 text-[#C4B998]'
              }`}
            >
              {liveState.settings.showDynamicIsland
                ? 'Dynamic Island مفعّلة ✓'
                : 'تفعيل Dynamic Island'}
            </button>
          </div>

          <p className="text-[11px] text-[#C4B998] leading-relaxed">
            تظهر تلقائياً على شاشة القفل والـ Dynamic Island قبل الأذان بـ{' '}
            <strong className="text-[#F3E5AB]">15–20 دقيقة</strong> مع عد تنازلي بالدقائق وشريط تقدم ذهبي يستمر حتى موعد الإقامة:
          </p>

          {/* Interactive Phase Preview Switcher */}
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { id: null, label: 'الوضع التلقائي الحي' },
                { id: 'pre_adhan', label: 'معاينة: قبل الأذان (15 د)' },
                { id: 'awaiting_iqamah', label: 'معاينة: انتظار الإقامة' },
              ] as const
            ).map((tab) => {
              const active = simPhase === tab.id;
              return (
                <button
                  key={String(tab.id)}
                  onClick={() => handleSetSimPhase(tab.id)}
                  className={`py-2 px-2 rounded-xl border text-[10px] font-extrabold transition-all whitespace-nowrap ${
                    active
                      ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#070707] border-[#F3E5AB]'
                      : 'bg-[#17130C] text-[#C4B998] border-[#C8A24A]/30 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Live Activity Pre-Adhan -> Iqamah Card Preview */}
          <PreAdhanIqamahLiveCard
            state={liveState}
            forcePreview={true}
            onTriggerAdhanPreview={() => {
              onClose();
              ReminderEngine.launchFullScreenAdhan({ isPreview: true });
            }}
          />

          {/* Compact Dynamic Island Capsule Preview */}
          <div className="mx-auto max-w-[345px] px-3.5 py-2 rounded-full bg-[#090806] border border-[#C8A24A]/65 shadow-[0_8px_25px_rgba(0,0,0,0.95),0_0_16px_rgba(200,162,74,0.2)] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="relative w-6 h-6 flex items-center justify-center">
                <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
                  <circle
                    cx="12"
                    cy="12"
                    r={radius}
                    fill="none"
                    stroke="rgba(200, 162, 74, 0.2)"
                    strokeWidth="2.4"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r={radius}
                    fill="none"
                    stroke="#E6C66E"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                <BellRing size={10} className="text-[#E6C66E]" />
              </div>
              <div className="text-right">
                <span className="text-[11px] font-extrabold text-[#F3E5AB] block leading-none">
                  {liveState.liveCardPhase === 'awaiting_iqamah'
                    ? `إقامة ${liveState.liveCardActivePrayerName}`
                    : `صلاة ${liveState.nextPrayerName}`}
                </span>
                <span className="text-[9px] text-[#C4B998] font-mono tabular-nums">
                  {liveState.liveCardPhase === 'awaiting_iqamah'
                    ? liveState.liveCardIqamahTime12
                    : liveState.nextPrayerTime12}
                </span>
              </div>
            </div>

            {/* Center Gold Bar */}
            <div className="w-14 h-1.5 rounded-full bg-[#1C1810] border border-[#C8A24A]/35 overflow-hidden">
              <div
                className="h-full bg-gradient-to-l from-[#FFF2C2] via-[#E6C66E] to-[#A67C22] rounded-full transition-all duration-700"
                style={{ width: `${liveState.liveCardGoldenProgressPercent}%` }}
              />
            </div>

            <span className="px-2 py-0.5 rounded-full bg-[#19150D] border border-[#C8A24A]/45 text-[11px] font-mono font-black text-[#E6C66E] tabular-nums">
              -{liveState.liveCardCountdownMMSS}
            </span>
          </div>
        </div>

        {/* Section 5: Customizable Per-Prayer Iqamah Offsets (default 15m, customizable per prayer) */}
        <div className="rounded-2xl bg-[#120F0A] border border-[#C8A24A]/40 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#F3E5AB] flex items-center gap-1.5">
              <Clock size={14} className="text-[#E6C66E]" />
              <span>تخصيص وقت الإقامة لكل صلاة (لشريط التقدم الذهبي):</span>
            </span>
            <button
              onClick={() =>
                LiveActivityService.saveSettings({
                  iqamahOffsets: {
                    fajr: 15,
                    dhuhr: 15,
                    asr: 15,
                    maghrib: 15,
                    isha: 15,
                  },
                })
              }
              className="text-[10px] font-bold text-[#E6C66E] hover:underline whitespace-nowrap"
            >
              ضبط الكل 15 د
            </button>
          </div>

          <div className="grid grid-cols-5 gap-1.5 text-center">
            {prayersForIqamah.map((p) => {
              const mins = liveState.settings.iqamahOffsets?.[p.id] ?? 15;
              return (
                <div
                  key={p.id}
                  className="p-2 rounded-xl bg-[#18140D] border border-[#C8A24A]/35 space-y-1.5"
                >
                  <span className="text-[11px] font-extrabold text-[#F3E5AB] block">
                    {p.label}
                  </span>
                  <span className="text-xs font-mono font-black text-[#E6C66E] block tabular-nums">
                    {mins} د
                  </span>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleChangeIqamahOffset(p.id, -5)}
                      className="w-6 h-6 rounded-lg bg-[#251F14] hover:bg-[#332A1A] text-[#C4B998] hover:text-white text-xs font-black flex items-center justify-center border border-[#C8A24A]/30"
                      title="إنقاص 5 دقائق"
                    >
                      -
                    </button>
                    <button
                      onClick={() => handleChangeIqamahOffset(p.id, 5)}
                      className="w-6 h-6 rounded-lg bg-[#251F14] hover:bg-[#332A1A] text-[#E6C66E] hover:text-white text-xs font-black flex items-center justify-center border border-[#C8A24A]/30"
                      title="زيادة 5 دقائق"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 6: Lock Screen Widget Display Selector */}
        <div className="rounded-2xl bg-[#120F0A] border border-[#C8A24A]/40 p-3.5 space-y-2.5">
          <span className="text-xs font-extrabold text-[#F3E5AB] block">
            تخصيص عرض الودجات على شاشة القفل:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              [
                { id: 'all', label: 'المجموعة المتكاملة' },
                { id: 'small', label: 'الصغيرة + الشجرة' },
                { id: 'medium', label: 'المتوسطة (الجدول)' },
                { id: 'tree_wird', label: 'شجرة الأثر والآية' },
              ] as const
            ).map((item) => {
              const isSelected = activeStyle === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectStyle(item.id)}
                  className={`py-2 px-2 rounded-xl border text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] border-[#F3E5AB] shadow'
                      : 'bg-[#18140D] text-[#C4B998] border-[#C8A24A]/30 hover:text-white'
                  }`}
                >
                  {isSelected && <Check size={12} />}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 7: Android Ongoing Notification Bar Entry (شريط مواقيت الصلاة الدائم في شريط إشعارات الهاتف) */}
        <div className="rounded-2xl bg-gradient-to-r from-[#1C170E] via-[#14100A] to-[#0D0B08] border border-[#E6C66E]/55 p-3.5 space-y-3 shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#292013] border border-[#E6C66E]/50 text-[#E6C66E] shrink-0">
                <Pin size={16} />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-[#F3E5AB]">
                  شريط الصلاة الدائم بإشعارات الهاتف (Ongoing Notification)
                </h4>
                <p className="text-[10px] text-[#C4B998] mt-0.5 leading-relaxed">
                  يبقى مثبتاً في شريط الإشعارات العلوي لهاتفك ومسحوباً للأسفل دون أن يختفي لعرض الصلاة القادمة والمتبقي.
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleOngoing}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 active:scale-95 border ${
                isOngoingEnabled
                  ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] border-[#FFF2C2] shadow'
                  : 'bg-[#18140D] text-[#8E8268] border-[#C8A24A]/30'
              }`}
            >
              {isOngoingEnabled ? 'مفعّل بنجاح ✓' : 'تفعيل الآن'}
            </button>
          </div>

          {/* Ongoing Notification Live Mockup */}
          <div className="p-2.5 rounded-xl bg-[#0A0907] border border-[#C8A24A]/30 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[#E6C66E] font-bold shrink-0">🕌 أثر</span>
              <span className="text-[#F3E5AB] font-extrabold truncate">
                القادمة: {liveState.nextPrayerName} ({liveState.nextPrayerTime12})
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#E6C66E] shrink-0">
              متبقي {liveState.countdownCompact || liveState.countdownFormatted}
            </span>
          </div>
        </div>

        {/* Section 8: Android Home Screen App Widget (AppWidgetProvider) */}
        <div className="rounded-2xl bg-[#120F0A] border border-[#C8A24A]/40 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone size={15} className="text-[#E6C66E]" />
              <h4 className="text-xs font-extrabold text-[#F3E5AB]">
                ودجت الشاشة الرئيسية لنظام أندرويد (Native App Widget)
              </h4>
            </div>

            <button
              onClick={handleSyncWidget}
              className="text-[11px] font-extrabold text-[#E6C66E] hover:underline flex items-center gap-1"
            >
              <span>{widgetSyncStatus || 'مزامنة الودجت الآن'}</span>
              <RefreshCw size={11} className={widgetSyncStatus ? 'animate-spin' : ''} />
            </button>
          </div>

          <p className="text-[11px] text-[#C4B998] leading-relaxed">
            لإضافة ودجت «أثر» إلى شاشة هاتفك الرئيسية: اضغط مطولاً على أي مساحة فارغة في الشاشة الرئيسية للهاتف &gt; اختر «التطبيقات المصغرة / Widgets» &gt; اختر «أثر» وحدد ودجت مواقيت الصلاة (4×2).
          </p>
        </div>

        {/* Section 9: Forceful Full-Screen Athan Test Button (USE_FULL_SCREEN_INTENT) */}
        <div className="rounded-2xl bg-gradient-to-r from-[#20180F] via-[#15110A] to-[#0A0907] border border-[#E6C66E]/70 p-3.5 space-y-2.5 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#2F2415] border border-[#E6C66E] text-[#FFF2C2] shrink-0">
                <Volume2 size={16} />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-[#FFF2C2]">
                  شاشة الأذان الشاملة مع قفل الشاشة (Full-Screen Intent)
                </h4>
                <p className="text-[10px] text-[#E6C66E] mt-0.5">
                  تنبثق كالمكالمة الهاتفية الواردة فوراً فوق أي تطبيق مفتوح وعلى شاشة القفل عبر خدمة Foreground Service
                </p>
              </div>
            </div>

            <button
              onClick={handleTestNativeFullScreenAthan}
              disabled={testAthanRunning}
              className="py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-[#FFF2C2] via-[#E6C66E] to-[#B88A2D] text-[#070707] text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all shrink-0 hover:brightness-110 disabled:opacity-50"
            >
              <ExternalLink size={12} />
              <span>{testAthanRunning ? 'جارٍ الإطلاق...' : 'تجربة فورية ↗'}</span>
            </button>
          </div>
        </div>

        {/* Bottom Actions: Preview Full-Screen Royal Adhan OR Live Lock Screen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => {
              onClose();
              ReminderEngine.launchFullScreenAdhan({ isPreview: true });
            }}
            className="min-h-[46px] py-2.5 px-4 rounded-2xl bg-gradient-to-r from-[#F3E5AB] via-[#E6C66E] to-[#B88A2D] text-[#070707] text-xs font-extrabold flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(200,162,74,0.38)] hover:brightness-110 transition-all whitespace-nowrap"
          >
            <BellRing size={15} />
            <span>تجربة شاشة الأذان الملكية الكاملة</span>
          </button>

          {onOpenFullLockScreen && (
            <button
              onClick={() => {
                onClose();
                onOpenFullLockScreen();
              }}
              className="min-h-[46px] py-2.5 px-4 rounded-2xl bg-[#1D180F] hover:bg-[#292215] text-[#F3E5AB] border border-[#E6C66E]/60 text-xs font-extrabold flex items-center justify-center gap-2 transition-all whitespace-nowrap"
            >
              <Lock size={14} className="text-[#E6C66E]" />
              <span>معاينة حية على شاشة القفل</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

