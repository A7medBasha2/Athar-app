import React, { useState, useEffect } from 'react';
import { ActiveAudioState, AudioService } from '../services/audioService';
import { PrayerTimesService, formatPrayerTime12 } from '../services/prayerTimesService';
import { ImpactTreeService, ImpactBreakdown } from '../services/impactTreeService';
import { StorageService } from '../services/storageService';
import { AtharBrandLogo } from './AtharBrandLogo';
import { RoyalMiniImpactTreeSvg } from './RoyalWidgetsSuiteModal';
import { Play, Pause, SkipBack, SkipForward, Lock, Unlock, Moon, Sparkles, Flame } from 'lucide-react';

interface LockScreenOverlayProps {
  isOpen: boolean;
  onUnlock: () => void;
  hijriDate: string;
}

export const LockScreenOverlay: React.FC<LockScreenOverlayProps> = ({
  isOpen,
  onUnlock,
  hijriDate
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [audioState, setAudioState] = useState<ActiveAudioState | null>(null);
  const [impactData, setImpactData] = useState<ImpactBreakdown>(() => ImpactTreeService.calculateImpact());
  const [prayerData, setPrayerData] = useState(() =>
    PrayerTimesService.getInitialPrayerTimes(StorageService.getSettings().location)
  );
  const [livePhase, setLivePhase] = useState<'pre_adhan' | 'iqamah'>('pre_adhan');
  const [secondsTick, setSecondsTick] = useState<number>(48);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }));
      setSecondsTick(prev => (prev > 0 ? prev - 1 : 59));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setImpactData(ImpactTreeService.calculateImpact());
    const s = StorageService.getSettings();
    PrayerTimesService.getPrayerTimes(s.location, s.calculationMethod)
      .then(setPrayerData)
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    const unsub = AudioService.subscribe(setAudioState);
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const nextPrayerName = prayerData?.nextPrayer?.nameArabic || 'المغرب';
  const nextPrayerTime = formatPrayerTime12(prayerData?.nextPrayer?.time);
  const realMinutesRemaining = Math.floor((prayerData?.timeRemainingSeconds || 900) / 60);
  const isNaturallyNearAdhan = realMinutesRemaining <= 20;
  const displayMinutes = isNaturallyNearAdhan ? Math.max(1, realMinutesRemaining) : (livePhase === 'pre_adhan' ? 14 : 7);
  const totalWindow = livePhase === 'pre_adhan' ? 20 : 15;
  const progressPercent = Math.min(100, Math.max(15, Math.round(((totalWindow - displayMinutes) / totalWindow) * 100)));

  return (
    <div className="fixed inset-0 z-50 bg-[#060606]/96 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-6 select-none animate-fadeIn overflow-y-auto text-right">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-between space-y-4">
        {/* 1. Dynamic Island Capsule at Top of Lock Screen */}
        <div className="flex flex-col items-center gap-2 pt-1">
          <button
            onClick={() => setLivePhase(prev => (prev === 'pre_adhan' ? 'iqamah' : 'pre_adhan'))}
            className="inline-flex items-center justify-between gap-6 px-4 py-2 rounded-full bg-[#040404] border border-[#E6C66E]/70 shadow-[0_8px_28px_rgba(0,0,0,0.95),0_0_20px_rgba(200,162,74,0.35)] min-w-[255px] transition-transform active:scale-95"
            title="اضغط للتبديل بين اقتراب الأذان وعدّاد الإقامة في Dynamic Island"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#241E11] border border-[#E6C66E]/70 flex items-center justify-center text-[#E6C66E]">
                <Moon size={13} className="fill-[#E6C66E]" />
              </div>
              <span className="text-xs font-extrabold text-[#F3E5AB]">
                {livePhase === 'pre_adhan' ? `أذان ${nextPrayerName}` : `إقامة ${nextPrayerName}`}
              </span>
            </div>
            <div className="w-4 h-4 rounded-full bg-[#111] border border-white/10" />
            <span className="text-xs font-black font-mono tabular-nums text-[#E6C66E]">
              -{String(displayMinutes).padStart(2, '0')}:{String(secondsTick).padStart(2, '0')}
            </span>
          </button>

          <div className="w-full flex items-center justify-between text-[11px] text-[#C4B998] px-2">
            <div className="flex items-center gap-1.5 text-[#E6C66E] font-bold">
              <Lock size={13} />
              <span>شاشة القفل الملكية · Live Activities</span>
            </div>
            <span className="text-[#F3E5AB] font-bold">{prayerData?.dateHijri || hijriDate}</span>
          </div>
        </div>

        {/* 2. Royal Lock Screen Clock & Lock Screen Compact Widgets */}
        <div className="text-center space-y-3">
          <div>
            <h1 className="text-5xl sm:text-6xl font-light text-[#F3E5AB] tabular-nums tracking-tight drop-shadow-[0_4px_20px_rgba(200,162,74,0.25)]">
              {currentTime}
            </h1>
            <p className="text-xs font-bold text-[#C4B998] mt-1">{currentDate}</p>
          </div>

          {/* Lock Screen Compact Widgets Row (Small Prayer Widget + Athar Tree Widget) */}
          <div className="grid grid-cols-2 gap-2.5 text-right pt-1">
            {/* Small Lock Screen Prayer Widget */}
            <div className="rounded-3xl bg-gradient-to-b from-[#17140D]/95 to-[#0B0A07]/95 border border-[#C8A24A]/50 p-3.5 shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-[#241E11] border border-[#E6C66E]/60 flex items-center justify-center text-[#E6C66E]">
                  <Moon size={16} className="fill-[#E6C66E]" />
                </div>
                <span className="text-[10px] font-extrabold text-[#E6C66E]">الصلاة القادمة</span>
              </div>
              <div className="my-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-extrabold text-white font-quran">{nextPrayerName}</span>
                  <span className="text-[11px] font-mono font-bold text-[#F3E5AB]">{nextPrayerTime}</span>
                </div>
              </div>
              <div className="text-[10px] text-[#C4B998] flex items-center justify-between pt-1.5 border-t border-[#C8A24A]/25">
                <span>متبقي:</span>
                <span className="font-mono font-black text-[#E6C66E]">
                  {String(displayMinutes).padStart(2, '0')}:{String(secondsTick).padStart(2, '0')} د
                </span>
              </div>
            </div>

            {/* Small Lock Screen Athar Tree & Daily Wird Widget */}
            <div className="rounded-3xl bg-gradient-to-b from-[#17140D]/95 to-[#0B0A07]/95 border border-[#C8A24A]/50 p-3 shadow-xl flex items-center gap-2.5">
              <RoyalMiniImpactTreeSvg score={impactData.score} size={64} />
              <div className="flex-1 min-w-0 space-y-1">
                <span className="text-[10px] font-extrabold text-[#F3E5AB] block">شجرة الأثر</span>
                <span className="text-base font-black text-[#E6C66E] font-mono block">
                  {impactData.score}٪
                </span>
                <span className="text-[9px] text-[#C4B998] block truncate">
                  ﴿أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ﴾
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Live Activity Lock Screen Card (Pre-Adhan 15-20m & Golden Progress Bar to Iqamah) */}
        <div className="relative w-full rounded-[28px] p-[1.5px] bg-gradient-to-r from-[#F5E1A4] via-[#C8A24A] to-[#6E5015] shadow-[0_16px_40px_rgba(0,0,0,0.95),0_0_25px_rgba(200,162,74,0.25)]">
          <div className="rounded-[26.5px] bg-gradient-to-b from-[#15120C] via-[#0C0A07] to-[#070605] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AtharBrandLogo size="xs" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#E6C66E] animate-ping" />
                    <span className="text-[10px] font-extrabold text-[#E6C66E]">
                      {livePhase === 'pre_adhan'
                        ? 'تنبيه حي · اقتراب موعد الصلاة'
                        : 'تنبيه حي · العد التنازلي للإقامة'}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                    {livePhase === 'pre_adhan'
                      ? `يتبقى ${displayMinutes} دقيقة على أذان ${nextPrayerName}`
                      : `يتبقى ${displayMinutes} دقائق على إقامة ${nextPrayerName}`}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setLivePhase(prev => (prev === 'pre_adhan' ? 'iqamah' : 'pre_adhan'))}
                className="px-2.5 py-1 rounded-xl bg-[#1C1810] border border-[#E6C66E]/50 text-[10px] font-extrabold text-[#F3E5AB] hover:bg-[#262015]"
              >
                {livePhase === 'pre_adhan' ? 'معاينة الإقامة' : 'معاينة قبل الأذان'}
              </button>
            </div>

            {/* Golden Progress Bar up to Iqamah */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-[#C4B998]">
                  {livePhase === 'pre_adhan' ? 'قبل الأذان (٢٠ د)' : `أذان ${nextPrayerName}`}
                </span>
                <span className="text-[#E6C66E]">
                  {livePhase === 'pre_adhan' ? `الأذان (${nextPrayerTime}) ← الإقامة` : 'إقامة الصلاة 🕌'}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[#1C1811] border border-[#C8A24A]/45 p-0.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-[#FFF5D6] via-[#E6C66E] to-[#9E7622] transition-all duration-500 shadow-[0_0_12px_rgba(230,198,110,0.85)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4. Optional MediaSession / Audio Player Card if Audio is Active */}
        {audioState && (
          <div className="w-full bg-[#12100B]/95 border border-[#C8A24A]/45 rounded-3xl p-3.5 shadow-2xl text-right">
            <div className="flex items-center gap-3">
              <AtharBrandLogo size="xs" />
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-extrabold text-white truncate">{audioState.title}</h3>
                <p className="text-[10px] text-[#C4B998] truncate">{audioState.subtitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => AudioService.seekTo(Math.max(0, audioState.currentTime - 10))}
                  className="text-[#C4B998] hover:text-white p-1.5"
                  aria-label="السابق"
                >
                  <SkipForward size={16} />
                </button>
                <button
                  onClick={() => AudioService.togglePlayPause()}
                  className="w-9 h-9 rounded-full bg-[#C8A24A] text-[#070707] flex items-center justify-center shadow"
                  aria-label={audioState.isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                >
                  {audioState.isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                </button>
                <button
                  onClick={() => AudioService.seekTo(audioState.currentTime + 10)}
                  className="text-[#C4B998] hover:text-white p-1.5"
                  aria-label="التالي"
                >
                  <SkipBack size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. Unlock Action */}
        <div className="flex flex-col items-center pt-1 pb-2">
          <button
            onClick={onUnlock}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#211C11] to-[#14110B] hover:from-[#2B2416] hover:to-[#1B170F] text-[#F3E5AB] text-xs font-extrabold border border-[#C8A24A]/55 shadow-[0_6px_20px_rgba(0,0,0,0.85)] transition-all active:scale-95"
          >
            <Unlock size={14} className="text-[#E6C66E]" />
            <span>العودة إلى تطبيق أثر</span>
          </button>
        </div>
      </div>
    </div>
  );
};

