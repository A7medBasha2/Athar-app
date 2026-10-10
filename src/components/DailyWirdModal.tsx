import React, { useState, useEffect } from 'react';
import { DailyWirdConfig, SurahMeta } from '../types';
import { ALL_SURAHS } from '../data/surahsData';
import { StorageService } from '../services/storageService';
import { AudioService } from '../services/audioService';
import confetti from 'canvas-confetti';
import { 
  X, BookOpen, CheckCircle2, Sparkles, 
  Award, Calendar, ChevronLeft, Volume2, Bell
} from 'lucide-react';

interface DailyWirdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenReader?: (surahNumber: number, ayahNumber?: number) => void;
  onOpenSurah?: (surahNumber: number, ayahNumber?: number) => void;
  onOpenReminders?: () => void;
}

export const DailyWirdModal: React.FC<DailyWirdModalProps> = ({
  isOpen,
  onClose,
  onOpenReader,
  onOpenSurah,
  onOpenReminders
}) => {
  const [wird, setWird] = useState<DailyWirdConfig>(() => StorageService.getDailyWirdConfig());
  const [selectedSurah, setSelectedSurah] = useState<SurahMeta>(ALL_SURAHS[17]); // Surah Al-Kahf (18)
  const [fromAyah, setFromAyah] = useState<number>(1);
  const [toAyah, setToAyah] = useState<number>(10);

  useEffect(() => {
    if (isOpen) {
      const current = StorageService.getDailyWirdConfig();
      setWird(current);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isCompletedToday = wird.completedTodayCount >= Math.max(1, wird.targetCount);

  const handleSurahChange = (surahNum: number) => {
    const s = ALL_SURAHS.find(item => item.number === surahNum) || ALL_SURAHS[0];
    setSelectedSurah(s);
    setFromAyah(1);
    setToAyah(Math.min(20, s.numberOfAyahs));
  };

  const handleRangeChange = (from: number, to: number) => {
    const safeFrom = Math.max(1, Math.min(from, selectedSurah.numberOfAyahs));
    const safeTo = Math.max(safeFrom, Math.min(to, selectedSurah.numberOfAyahs));
    setFromAyah(safeFrom);
    setToAyah(safeTo);
  };

  const handleTargetCountChange = (newTarget: number) => {
    const updated: DailyWirdConfig = {
      ...wird,
      targetCount: Math.max(1, newTarget)
    };
    setWird(updated);
    StorageService.saveDailyWirdConfig(updated);
  };

  const handleCompleteToday = () => {
    const updated = StorageService.markSurahCompletedInWird(selectedSurah.number);
    if (updated.completedTodayCount < updated.targetCount) {
      updated.completedTodayCount = updated.targetCount;
      StorageService.saveDailyWirdConfig(updated);
    }
    setWird({ ...updated });
    try {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }
  };

  const handlePlayWirdAudio = () => {
    const reciterId = StorageService.getSettings().selectedReciterId;
    AudioService.playQuranContinuous(selectedSurah.number, fromAyah, reciterId);
  };

  // Suggested quick presets
  const quickPresets = [
    { label: 'سورة الكهف (أول ١٠ آيات)', surah: 18, from: 1, to: 10 },
    { label: 'سورة الملك كاملة (المُنجية)', surah: 67, from: 1, to: 30 },
    { label: 'سورة يس (أول ٢٠ آية)', surah: 36, from: 1, to: 20 },
    { label: 'سورة الواقعة كاملة', surah: 56, from: 1, to: 96 },
    { label: 'أواخر سورة البقرة', surah: 2, from: 284, to: 286 }
  ];

  const handleOpenSelectedSurah = () => {
    onClose();
    const opener = onOpenSurah || onOpenReader;
    if (opener) {
      opener(selectedSurah.number, fromAyah);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-fadeIn">
      <div className="w-full max-w-lg bg-gradient-to-b from-[#17140D] via-[#0E0D0A] to-[#080705] border-t sm:border border-[#C8A24A]/55 rounded-t-3xl sm:rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex flex-col max-h-[92vh] overflow-y-auto text-right">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#1F1A10] border border-[#C8A24A]/50 text-[#E6C66E] flex items-center justify-center shadow-[0_0_15px_rgba(200,162,74,0.2)]">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#F3E5AB]">الورد القرآني اليومي المخصص</h2>
              <p className="text-[11px] text-[#C4B998]">حدد وردك اليومي من الآيات والسور للقراءة والاستماع المنتظم</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#18150E] hover:bg-[#241F14] text-[#C4B998] hover:text-white border border-[#C8A24A]/35 transition-colors"
            title="إغلاق"
            aria-label="إغلاق نافذة الورد"
          >
            <X size={16} />
          </button>
        </div>

        {/* Streak & Status Banner */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-[#1E1910] via-[#13100A] to-[#1A160E] border border-[#C8A24A]/45 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isCompletedToday
                ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#F3E5AB]'
                : 'bg-[#18150E] border-[#C8A24A]/40 text-[#E6C66E]'
            }`}>
              <Award size={22} />
            </div>
            <div>
              <span className="text-[11px] text-[#C4B998] block font-bold">إنجاز الورد اليومي</span>
              <h3 className="text-sm font-extrabold text-[#F3E5AB]">
                أنجزت {wird.completedTodayCount} من أصل {wird.targetCount} اليوم
              </h3>
            </div>
          </div>

          {isCompletedToday ? (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#C8A24A]/25 border border-[#E6C66E] text-[#F3E5AB] text-xs font-extrabold">
              <CheckCircle2 size={14} />
              <span>مكتمل اليوم ✓</span>
            </span>
          ) : (
            <span className="text-[11px] text-[#E6C66E] bg-[#C8A24A]/15 px-2.5 py-1 rounded-lg border border-[#C8A24A]/35 font-bold">
              بانتظار الإنجاز
            </span>
          )}
        </div>

        {/* Quick Suggested Presets */}
        <div className="mt-4">
          <span className="text-[11px] text-[#C4B998] font-bold block mb-2">أوراد مقترحة سريعة:</span>
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
            {quickPresets.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  const s = ALL_SURAHS.find(item => item.number === p.surah) || ALL_SURAHS[0];
                  setSelectedSurah(s);
                  setFromAyah(p.from);
                  setToAyah(p.to);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#14120D] hover:bg-[#1E1A12] border border-[#C8A24A]/30 hover:border-[#E6C66E]/60 text-xs text-[#F3E5AB] whitespace-nowrap transition-all shrink-0 font-bold"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Surah & Ayah Range Picker */}
        <div className="mt-4 p-4 rounded-2xl bg-[#13110C] border border-[#C8A24A]/35 space-y-3.5 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#E6C66E] font-extrabold">
              <Sparkles size={14} />
              <span>تخصيص السورة ونطاق الآيات</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#C4B998]">عدد الأوراد اليومية:</span>
              {[1, 2, 3, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => handleTargetCountChange(num)}
                  className={`w-6 h-6 rounded-lg font-mono font-bold text-[11px] border transition-all ${
                    wird.targetCount === num
                      ? 'bg-[#C8A24A]/30 border-[#E6C66E] text-[#F3E5AB]'
                      : 'bg-[#1B1811] border-[#C8A24A]/25 text-[#8E8268]'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[#C4B998] block mb-1.5 font-bold">اختر السورة:</label>
            <select
              value={selectedSurah.number}
              onChange={(e) => handleSurahChange(Number(e.target.value))}
              className="w-full bg-[#1B1811] border border-[#C8A24A]/45 rounded-xl p-2.5 text-[#F3E5AB] font-bold focus:outline-none focus:border-[#E6C66E]"
            >
              {ALL_SURAHS.map((s) => (
                <option key={s.number} value={s.number} className="bg-[#0E0D0A] text-white">
                  {s.number}. سورة {s.name} ({s.numberOfAyahs} آية)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#C4B998] block mb-1 font-bold">من الآية:</label>
              <input
                type="number"
                min={1}
                max={selectedSurah.numberOfAyahs}
                value={fromAyah}
                onChange={(e) => handleRangeChange(Number(e.target.value), toAyah)}
                className="w-full bg-[#1B1811] border border-[#C8A24A]/45 rounded-xl p-2.5 text-white font-mono text-center focus:outline-none focus:border-[#E6C66E]"
              />
            </div>

            <div>
              <label className="text-[#C4B998] block mb-1 font-bold">إلى الآية (من أصل {selectedSurah.numberOfAyahs}):</label>
              <input
                type="number"
                min={fromAyah}
                max={selectedSurah.numberOfAyahs}
                value={toAyah}
                onChange={(e) => handleRangeChange(fromAyah, Number(e.target.value))}
                className="w-full bg-[#1B1811] border border-[#C8A24A]/45 rounded-xl p-2.5 text-white font-mono text-center focus:outline-none focus:border-[#E6C66E]"
              />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#1A160E] border border-[#C8A24A]/30 flex items-center justify-between text-[11px]">
            <span className="text-[#C4B998]">مقدار الورد المحدد:</span>
            <span className="text-[#E6C66E] font-extrabold">
              سورة {selectedSurah.name} · ({toAyah - fromAyah + 1} آيات)
            </span>
          </div>
        </div>

        {/* Action Buttons: Read / Listen / Mark Completed */}
        <div className="mt-4 space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleOpenSelectedSurah}
              className="athar-btn-primary py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5"
            >
              <BookOpen size={15} />
              <span>قراءة الورد بالمصحف</span>
              <ChevronLeft size={14} />
            </button>

            <button
              onClick={handlePlayWirdAudio}
              className="py-3 px-4 rounded-xl bg-[#1A160E] hover:bg-[#241E14] text-[#E6C66E] border border-[#C8A24A]/50 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Volume2 size={15} />
              <span>استماع للورد الآن</span>
            </button>
          </div>

          {!isCompletedToday && (
            <button
              onClick={handleCompleteToday}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#262013] via-[#1E190F] to-[#262013] hover:brightness-110 text-[#F3E5AB] border border-[#E6C66E]/60 font-extrabold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 shadow-[0_0_20px_rgba(200,162,74,0.2)]"
            >
              <CheckCircle2 size={16} className="text-[#E6C66E]" />
              <span>أتممت قراءة أو سماع وردي اليوم بحمد الله</span>
            </button>
          )}
        </div>

        {/* Footer Stats */}
        <div className="mt-4 pt-3 border-t border-[#C8A24A]/25 flex items-center justify-between text-[11px] text-[#C4B998]">
          <span className="flex items-center gap-1">
            <Calendar size={12} className="text-[#E6C66E]" />
            <span>السور المنجزة اليوم: <strong className="text-[#F3E5AB]">{wird.completedSurahsToday.length}</strong></span>
          </span>
          {onOpenReminders ? (
            <button
              onClick={() => {
                onClose();
                onOpenReminders();
              }}
              className="text-[#E6C66E] hover:underline font-bold flex items-center gap-1"
            >
              <Bell size={12} />
              <span>ضبط وقت التذكير</span>
            </button>
          ) : (
            <span className="text-[#E6C66E] font-bold">﴿وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا﴾</span>
          )}
        </div>

      </div>
    </div>
  );
};
