import React, { useState, useEffect } from 'react';
import { DailyWirdConfig, QuranKhatmahState } from '../types';
import { StorageService } from '../services/storageService';
import { ALL_SURAHS } from '../data/surahsData';
import { X, Award, Check, BookOpen, Bell, ChevronLeft, ArrowRight, CheckCircle2 } from 'lucide-react';

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

  useEffect(() => {
    if (isOpen) {
      const cfg = StorageService.getDailyWirdConfig();
      setConfig(cfg);
      setTargetInput(cfg.targetCount);
      setKhatmah(StorageService.getQuranKhatmah());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdateTarget = (newTarget: number) => {
    const val = Math.max(1, Math.min(114, newTarget));
    setTargetInput(val);
    const updated = { ...config, targetCount: val };
    setConfig(updated);
    StorageService.saveDailyWirdConfig(updated);
  };

  const handleToggleSurahInWird = (surahNumber: number) => {
    const currentCompleted = [...config.completedSurahsToday];
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

  const percentToday = Math.min(100, Math.round(((config.completedTodayCount || 0) / (config.targetCount || 1)) * 100));

  // Determine next surahs to read for the wird
  const nextSurahs = ALL_SURAHS.filter(s => !khatmah.completedSurahs.includes(s.number)).slice(0, 10);

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
              <h2 className="text-sm font-bold text-slate-100">نظام الورد القرآني اليومي</h2>
              <p className="text-[10px] text-slate-400">حدد هدفك اليومي بمرونة وتابع إنجازك بيسر</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4">
          {/* Target Goal Customizer Card */}
          <div className="bg-[#131B24] border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">هدفك اليومي المفضل:</span>
              <span className="text-xs text-cyan-400 font-bold tabular-nums">
                {config.targetCount} {config.targetCount === 1 ? 'سورة يومياً' : config.targetCount <= 10 ? 'سور يومياً' : 'سورة يومياً'}
              </span>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-4 gap-1.5 text-xs">
              {[1, 2, 5, 30].map((t) => (
                <button
                  key={t}
                  onClick={() => handleUpdateTarget(t)}
                  className={`p-2 rounded-xl border text-center font-semibold transition-all ${
                    config.targetCount === t
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow'
                      : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {t} {t === 1 ? 'سورة' : t <= 10 ? 'سور' : 'سورة'}
                </button>
              ))}
            </div>

            {/* Custom Target Number Stepper */}
            <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
              <span>تحديد عدد مخصص:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUpdateTarget(config.targetCount - 1)}
                  disabled={config.targetCount <= 1}
                  className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold disabled:opacity-40"
                >
                  -
                </button>
                <span className="font-mono font-bold text-slate-100 text-sm tabular-nums w-8 text-center">
                  {config.targetCount}
                </span>
                <button
                  onClick={() => handleUpdateTarget(config.targetCount + 1)}
                  disabled={config.targetCount >= 114}
                  className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold disabled:opacity-40"
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
              <span>المنجز: <strong className="text-slate-100 tabular-nums">{config.completedTodayCount}</strong> من {config.targetCount} سورة</span>
              {percentToday === 100 && (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  <span>تم إنجاز ورد اليوم مبارك!</span>
                </span>
              )}
            </div>
          </div>

          {/* Upcoming Surahs for the Wird */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200">السور المقترحة لوردك التالي:</span>
              <span className="text-[10px] text-slate-500">اضغط للقراءة أو التأشير</span>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
              {nextSurahs.length === 0 ? (
                <div className="p-4 text-center text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-900 rounded-xl">
                  مبارك! لقد أتممت جميع سور القرآن الكريم في الختمة الحالية!
                </div>
              ) : (
                nextSurahs.map((surah) => {
                  const isDoneToday = config.completedSurahsToday.includes(surah.number);
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
                })
              )}
            </div>
          </div>

          {/* Reminder Center Link */}
          {onOpenReminders && (
            <button
              onClick={() => {
                onClose();
                onOpenReminders();
              }}
              className="w-full p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-2xl flex items-center justify-between text-xs text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-cyan-400" />
                <span>إعدادات وتوقيت تذكير الورد اليومي</span>
              </div>
              <ChevronLeft size={15} className="text-slate-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
