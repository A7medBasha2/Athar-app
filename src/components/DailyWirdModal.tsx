import React, { useState, useEffect } from 'react';
import { DailyWirdConfig, QuranKhatmahState } from '../types';
import { StorageService } from '../services/storageService';
import { AudioService } from '../services/audioService';
import { ALL_SURAHS } from '../data/surahsData';
import { 
  X, Award, Check, BookOpen, Bell, ChevronLeft, Volume2, 
  Sparkles, CheckCircle2, Heart, Headphones, Flame, Play, Pause 
} from 'lucide-react';

interface DailyWirdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSurah: (surahNumber: number) => void;
  onOpenReminders?: () => void;
}

export const DailyWirdModal: React.FC<DailyWirdModalProps> = ({
  isOpen,
  onClose,
  onOpenSurah,
  onOpenReminders
}) => {
  const [config, setConfig] = useState<DailyWirdConfig>(StorageService.getDailyWirdConfig());
  const [khatmah, setKhatmah] = useState<QuranKhatmahState>(StorageService.getQuranKhatmah());
  const [targetInput, setTargetInput] = useState<number>(config.targetCount || 1);
  const [isPlayingWirdSound, setIsPlayingWirdSound] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = StorageService.getDailyWirdConfig();
      setConfig(cfg);
      setTargetInput(cfg.targetCount);
      setKhatmah(StorageService.getQuranKhatmah());
      setIsPlayingWirdSound(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdateTarget = (newTarget: number) => {
    const val = Math.max(1, newTarget);
    setTargetInput(val);
    const updated = { ...config, targetCount: val };
    setConfig(updated);
    StorageService.saveDailyWirdConfig(updated);
  };

  const handleUpdateType = (type: 'surahs' | 'ayahs' | 'listening' | 'adhkar') => {
    // Sensible default target for each type
    const defaultTargets: Record<string, number> = {
      surahs: 1,
      ayahs: 20,
      listening: 15,
      adhkar: 100
    };
    const defaultTarget = defaultTargets[type] || 1;
    const updated: DailyWirdConfig = {
      ...config,
      type,
      targetCount: defaultTarget,
      completedTodayCount: 0
    };
    setTargetInput(defaultTarget);
    setConfig(updated);
    StorageService.saveDailyWirdConfig(updated);
  };

  const handleToggleSurahInWird = (surahNumber: number) => {
    const currentCompleted = [...(config.completedSurahsToday || [])];
    let nextList: number[];
    if (currentCompleted.includes(surahNumber)) {
      nextList = currentCompleted.filter(id => id !== surahNumber);
    } else {
      nextList = [...currentCompleted, surahNumber];
      StorageService.toggleSurahCompletedInKhatmah(surahNumber);
    }
    const updated: DailyWirdConfig = {
      ...config,
      completedSurahsToday: nextList,
      completedTodayCount: nextList.length
    };
    setConfig(updated);
    StorageService.saveDailyWirdConfig(updated);
    setKhatmah(StorageService.getQuranKhatmah());
  };

  const handleIncrementGenericProgress = (delta: number) => {
    const current = config.completedTodayCount || 0;
    const nextCount = Math.max(0, current + delta);
    const updated: DailyWirdConfig = {
      ...config,
      completedTodayCount: nextCount
    };
    setConfig(updated);
    StorageService.saveDailyWirdConfig(updated);
  };

  const handlePlayWirdAudioSample = async () => {
    if (isPlayingWirdSound) {
      AudioService.stop();
      setIsPlayingWirdSound(false);
    } else {
      setIsPlayingWirdSound(true);
      await AudioService.playWirdReminder();
      setTimeout(() => setIsPlayingWirdSound(false), 8000);
    }
  };

  const percentToday = Math.min(100, Math.round(((config.completedTodayCount || 0) / (config.targetCount || 1)) * 100));

  const getTypeUnit = () => {
    switch (config.type) {
      case 'surahs': return 'سورة';
      case 'ayahs': return 'آية';
      case 'listening': return 'دقيقة استماع';
      case 'adhkar': return 'تسبيحة وذكر';
      default: return 'سورة';
    }
  };

  // Determine next surahs to read for the wird
  const nextSurahs = ALL_SURAHS.filter(s => !khatmah.completedSurahs.includes(s.number)).slice(0, 8);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-[#0E141B] border border-slate-800 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col text-slate-100">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm">
              <Award size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">نظام الورد اليومي المخصص</h2>
              <p className="text-[10px] text-slate-400">حدد نوع وردك وهدفك دون قيود وحافظ على استمرارك</p>
            </div>
          </div>

          <button
            onClick={() => {
              if (isPlayingWirdSound) AudioService.stop();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4">
          
          {/* Spiritual Reminder Callout (Consistency over quantity) */}
          <div className="bg-gradient-to-r from-[#17242E] to-[#121A22] border border-cyan-500/35 rounded-2xl p-3.5 space-y-1.5 shadow-md">
            <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-bold">
              <Sparkles size={14} className="shrink-0" />
              <span>العبرة في الاستمرارية والمواظبة:</span>
            </div>
            <p className="text-[11px] text-slate-200 leading-relaxed text-justify">
              «أَحَبُّ الأَعْمَالِ إِلَى اللَّهِ تَعَالَى أَدْوَمُهَا وَإِنْ قَلَّ» (صحيح مسلم). اجعل وردك اليومي مريحاً ومستداماً؛ فقليل دائم خير من كثير منقطع.
            </p>
          </div>

          {/* Wird Type Selector Tabs */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">اختر نوع الورد اليومي:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
              {[
                { id: 'surahs', label: 'قراءة سور', icon: BookOpen },
                { id: 'ayahs', label: 'قراءة آيات', icon: Award },
                { id: 'listening', label: 'استماع للقرآن', icon: Headphones },
                { id: 'adhkar', label: 'أذكار وتسبيح', icon: Heart },
              ].map((t) => {
                const Icon = t.icon;
                const isSelected = config.type === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleUpdateType(t.id as any)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow ring-1 ring-cyan-500/30'
                        : 'bg-[#121822] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="text-[11px]">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Goal Customizer Card (No upper limit) */}
          <div className="bg-[#131B24] border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">الهدف اليومي المطلوب:</span>
              <span className="text-xs text-cyan-400 font-bold tabular-nums">
                {config.targetCount} {getTypeUnit()}
              </span>
            </div>

            {/* Quick Presets depending on type */}
            <div className="grid grid-cols-4 gap-1.5 text-xs">
              {(config.type === 'surahs'
                ? [1, 2, 5, 30]
                : config.type === 'ayahs'
                ? [10, 20, 50, 100]
                : config.type === 'listening'
                ? [10, 15, 30, 60]
                : [33, 100, 300, 1000]
              ).map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleUpdateTarget(preset)}
                  className={`p-2 rounded-xl border text-center font-semibold transition-all ${
                    config.targetCount === preset
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow'
                      : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {preset} {getTypeUnit()}
                </button>
              ))}
            </div>

            {/* Custom Target Number Stepper with direct editable input and NO LIMIT */}
            <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
              <span>تحديد أي عدد بحرية:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUpdateTarget(Math.max(1, config.targetCount - (config.type === 'adhkar' ? 10 : 1)))}
                  disabled={config.targetCount <= 1}
                  className="w-8 h-8 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold disabled:opacity-40 text-base"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={targetInput}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setTargetInput(val);
                    handleUpdateTarget(val);
                  }}
                  className="w-16 bg-[#0E141D] border border-slate-700 rounded-lg text-center font-mono font-bold text-slate-100 text-sm py-1"
                />
                <button
                  onClick={() => handleUpdateTarget(config.targetCount + (config.type === 'adhkar' ? 10 : 1))}
                  className="w-8 h-8 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold text-base"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Today's Progress Card */}
          <div className="bg-gradient-to-br from-[#15232A] to-[#0F171D] border border-cyan-500/35 rounded-2xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold">إنجاز الورد اليوم:</span>
              <span className="text-cyan-400 font-bold tabular-nums text-sm">{percentToday}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full transition-all duration-300"
                style={{ width: `${percentToday}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
              <span>المنجز: <strong className="text-slate-100 tabular-nums">{config.completedTodayCount}</strong> من {config.targetCount} {getTypeUnit()}</span>
              {percentToday >= 100 && (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  <span>تم إنجاز ورد اليوم مبارك!</span>
                </span>
              )}
            </div>

            {/* Quick Increment buttons for Ayahs, Listening, or Adhkar */}
            {config.type !== 'surahs' && (
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-400 text-[11px]">تسجيل تقدم إضافي:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleIncrementGenericProgress(config.type === 'adhkar' ? 10 : 5)}
                    className="px-2.5 py-1 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-bold rounded-lg transition-all active:scale-95"
                  >
                    +{config.type === 'adhkar' ? '10' : '5'} {getTypeUnit()}
                  </button>
                  <button
                    onClick={() => handleIncrementGenericProgress(config.type === 'adhkar' ? 33 : 10)}
                    className="px-2.5 py-1 bg-cyan-500/25 hover:bg-cyan-500/35 border border-cyan-500/40 text-cyan-200 font-bold rounded-lg transition-all active:scale-95"
                  >
                    +{config.type === 'adhkar' ? '33' : '10'} {getTypeUnit()}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Upcoming Surahs for Surahs Wird mode */}
          {config.type === 'surahs' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">السور المقترحة لوردك التالي:</span>
                <span className="text-[10px] text-slate-500">اضغط للتأشير أو القراءة</span>
              </div>

              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
                {nextSurahs.map((surah) => {
                  const isDoneToday = (config.completedSurahsToday || []).includes(surah.number);
                  return (
                    <div
                      key={surah.number}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                        isDoneToday 
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                          : 'bg-[#121922] border-slate-800 text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleSurahInWird(surah.number)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold border transition-colors ${
                            isDoneToday
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                          }`}
                          title={isDoneToday ? 'إلغاء التأشير' : 'تأشير كمنجز في الورد'}
                        >
                          {isDoneToday ? <Check size={13} /> : surah.number}
                        </button>
                        <span className="font-quran font-bold text-xs">سورة {surah.name}</span>
                        <span className="text-[10px] text-slate-500">({surah.numberOfAyahs} آية)</span>
                      </div>

                      <button
                        onClick={() => {
                          onClose();
                          onOpenSurah(surah.number);
                        }}
                        className="flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:underline px-2 py-1 rounded-lg hover:bg-cyan-500/10"
                      >
                        <BookOpen size={12} />
                        <span>اقرأ الآن</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sound Preview: "ورتل القرآن ترتيلا" */}
          <div className="p-3 bg-[#131C26] border border-cyan-500/25 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-cyan-500/15 text-cyan-400 rounded-xl">
                <Volume2 size={16} />
              </div>
              <div>
                <span className="font-bold text-slate-100 block">نغمة تذكير الورد المخصصة</span>
                <span className="text-[10px] text-slate-400">﴿وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا﴾ · الشيخ مشاري العفاسي</span>
              </div>
            </div>

            <button
              onClick={handlePlayWirdAudioSample}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                isPlayingWirdSound
                  ? 'bg-cyan-400 text-slate-950 shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700'
              }`}
            >
              {isPlayingWirdSound ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
              <span>{isPlayingWirdSound ? 'إيقاف' : 'تجربة النغمة'}</span>
            </button>
          </div>

          {/* Reminder Center Link */}
          {onOpenReminders && (
            <button
              onClick={() => {
                if (isPlayingWirdSound) AudioService.stop();
                onClose();
                onOpenReminders();
              }}
              className="w-full p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-2xl flex items-center justify-between text-xs text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-cyan-400" />
                <span>ضبط أوقات وتنبيهات تذكير الورد اليومي</span>
              </div>
              <ChevronLeft size={15} className="text-slate-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
