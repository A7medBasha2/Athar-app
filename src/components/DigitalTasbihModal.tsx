import React, { useState, useEffect } from 'react';
import { TasbihState, TasbihDhikr } from '../types';
import { StorageService } from '../services/storageService';
import { X, RotateCcw, Volume2, VolumeX, Plus, Trash2, CheckCircle2, Award } from 'lucide-react';

interface DigitalTasbihModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToAdhkar?: () => void;
}

export const DigitalTasbihModal: React.FC<DigitalTasbihModalProps> = ({
  isOpen,
  onClose,
  onNavigateToAdhkar
}) => {
  const [tasbihState, setTasbihState] = useState<TasbihState>(StorageService.getTasbihState());
  const [isAddingCustom, setIsAddingCustom] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('');
  const [customTarget, setCustomTarget] = useState<number>(33);
  const [rippleActive, setRippleActive] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setTasbihState(StorageService.getTasbihState());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentDhikr = tasbihState.items.find(i => i.id === tasbihState.selectedDhikrId) || tasbihState.items[0];

  const handleSelectDhikr = (id: string) => {
    const nextState = { ...tasbihState, selectedDhikrId: id };
    setTasbihState(nextState);
    StorageService.saveTasbihState(nextState);
  };

  const handleTapCount = () => {
    setRippleActive(true);
    setTimeout(() => setRippleActive(false), 200);

    const { state, completedLap } = StorageService.incrementTasbih(currentDhikr.id);
    setTasbihState(state);

    if (state.vibrationEnabled && 'vibrate' in navigator) {
      if (completedLap) {
        navigator.vibrate([40, 60, 40]);
      } else {
        navigator.vibrate(20);
      }
    }

    if (state.soundEnabled) {
      playClickSound();
    }
  };

  const playClickSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch {
      // AudioContext fallback
    }
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = StorageService.resetTasbih(currentDhikr.id);
    setTasbihState(updated);
  };

  const handleToggleSound = () => {
    const updated = { ...tasbihState, soundEnabled: !tasbihState.soundEnabled };
    setTasbihState(updated);
    StorageService.saveTasbihState(updated);
  };

  const handleAddCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    const updated = StorageService.addCustomTasbih(customName.trim(), customTarget);
    setTasbihState(updated);
    setCustomName('');
    setIsAddingCustom(false);
  };

  const handleDeleteCustom = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = StorageService.deleteCustomTasbih(id);
    setTasbihState(updated);
  };

  const targetNum = typeof currentDhikr?.target === 'number' && !isNaN(currentDhikr.target) ? currentDhikr.target : 0;
  const countNum = typeof currentDhikr?.currentCount === 'number' && !isNaN(currentDhikr.currentCount) ? currentDhikr.currentCount : 0;
  const rawProgressPercent = targetNum > 0 
    ? Math.min(100, Math.max(0, Math.round((countNum / targetNum) * 100)))
    : 100;
  const progressPercent = Number.isFinite(rawProgressPercent) ? rawProgressPercent : 100;
  const tasbihCircumference = 282.74; // 2 * PI * 45
  const rawTasbihOffset = targetNum > 0
    ? tasbihCircumference - (tasbihCircumference * progressPercent) / 100
    : 0;
  const safeTasbihOffset = Number.isFinite(rawTasbihOffset) ? rawTasbihOffset : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-[#0E141B] border border-slate-800 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col text-slate-100">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">
              📿
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">المسبحة الرقمية المباركة</h2>
              <p className="text-[10px] text-slate-400">تسبيح وأذكار مخصصة مع حفظ تلقائي للدورات</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleToggleSound}
              className={`p-2 rounded-xl text-xs border transition-colors ${
                tasbihState.soundEnabled 
                  ? 'bg-slate-800 text-purple-400 border-purple-500/30' 
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
              title={tasbihState.soundEnabled ? 'صوت النقرة مفعّل' : 'صوت النقرة معطّل'}
            >
              {tasbihState.soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Dhikr Selector Horizontal Pills */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>اختر الذكر للتسبيح:</span>
            <button
              onClick={() => setIsAddingCustom(!isAddingCustom)}
              className="text-[#D4AF37] hover:underline flex items-center gap-1 text-[11px] font-bold"
            >
              <Plus size={13} />
              <span>إضافة ذكر مخصص</span>
            </button>
          </div>

          {/* Custom Dhikr Input Form */}
          {isAddingCustom && (
            <form onSubmit={handleAddCustomSubmit} className="mb-3 p-3 bg-[#141C25] border border-slate-700 rounded-2xl space-y-2.5 animate-slideDown">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">نص الذكر:</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="مثال: حسبي الله ونعم الوكيل"
                  className="w-full bg-[#0E141B] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[10px] text-slate-400">الهدف:</span>
                  {[33, 100, 0].map(t => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setCustomTarget(t)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                        customTarget === t ? 'bg-[#D4AF37] text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {t === 0 ? 'مفتوح' : t}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsAddingCustom(false)}
                    className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-white"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-[#D4AF37] text-slate-950 font-bold text-[11px] rounded-lg shadow"
                  >
                    إضافة
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Pills Carousel */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {tasbihState.items.map((item) => {
              const isSelected = item.id === currentDhikr.id;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectDhikr(item.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl border text-xs cursor-pointer flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-purple-600/25 border-purple-400 text-purple-200 font-bold shadow-md'
                      : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate max-w-[120px]">{item.name}</span>
                  {item.isCustom && (
                    <button
                      onClick={(e) => handleDeleteCustom(e, item.id)}
                      className="text-rose-400 hover:text-rose-300 p-0.5 ml-1"
                      title="حذف الذكر المخصص"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Central Counter Arena */}
        <div className="p-6 flex flex-col items-center justify-center space-y-4">
          {/* Selected Dhikr Name Title */}
          <div className="text-center px-4">
            <h3 className="font-quran text-xl font-bold text-purple-200 leading-relaxed">
              {currentDhikr.name}
            </h3>
            <div className="flex items-center justify-center gap-3 mt-1 text-[11px] text-slate-400">
              <span>الهدف: <strong className="text-slate-200">{currentDhikr.target > 0 ? `${currentDhikr.target} مرة` : 'مفتوح (غير محدد)'}</strong></span>
              <span>•</span>
              <span>الدورات المكتملة: <strong className="text-emerald-400 tabular-nums">{currentDhikr.totalCompleted}</strong></span>
            </div>
          </div>

          {/* Big Interactive Tap Circle */}
          <div className="relative flex items-center justify-center pt-2 pb-2">
            {/* Outer Progress Glow Ring */}
            <div
              onClick={handleTapCount}
              className={`w-56 h-56 rounded-full border-4 cursor-pointer transition-transform duration-100 active:scale-95 flex flex-col items-center justify-center relative shadow-2xl ${
                rippleActive ? 'scale-95 bg-purple-900/40' : 'bg-gradient-to-b from-[#161F2C] to-[#0E1520]'
              } ${
                progressPercent === 100 && currentDhikr.target > 0 
                  ? 'border-emerald-500 shadow-emerald-500/20' 
                  : 'border-purple-500/50 shadow-purple-500/10'
              }`}
            >
              {/* Circular SVG Progress */}
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  className="stroke-slate-800"
                  strokeWidth="4"
                  fill="none"
                />
                {currentDhikr.target > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    className="stroke-purple-400 transition-all duration-200"
                    strokeWidth="4"
                    strokeDasharray={tasbihCircumference}
                    strokeDashoffset={safeTasbihOffset}
                    strokeLinecap="round"
                    fill="none"
                  />
                )}
              </svg>

              {/* Counter Numbers */}
              <span className="text-5xl font-black text-slate-100 font-mono tabular-nums tracking-tight">
                {currentDhikr.currentCount}
              </span>
              <span className="text-[11px] text-slate-400 font-medium mt-1">
                {currentDhikr.target > 0 ? `من ${currentDhikr.target}` : 'تسبيحة'}
              </span>

              <span className="text-[10px] text-purple-400 mt-2 font-bold bg-purple-500/15 px-2.5 py-0.5 rounded-full">
                اضغط للتسبيح
              </span>
            </div>
          </div>

          {/* Reset & Stats Controls */}
          <div className="flex items-center justify-between w-full max-w-xs pt-1">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-colors active:scale-95"
              title="تصفير العداد الحالي"
            >
              <RotateCcw size={13} />
              <span>تصفير</span>
            </button>

            <div className="text-[11px] text-slate-400 text-center">
              إجمالي تسبيحاتك: <span className="text-purple-300 font-bold tabular-nums">{tasbihState.totalAllTime}</span>
            </div>

            {onNavigateToAdhkar && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToAdhkar();
                }}
                className="flex items-center gap-1 text-[11px] text-[#D4AF37] hover:underline"
              >
                <span>الأذكار</span>
                <span>←</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer Advice */}
        <div className="p-3 bg-[#111720] border-t border-slate-800/80 text-center text-[10px] text-slate-400">
          قال رسول الله ﷺ: «مُعَقِّبَاتٌ لاَ يَخِيبُ قَائِلُهُنَّ: ثَلاَثٌ وَثَلاَثُونَ تَسْبِيحَةً، وَثَلاَثٌ وَثَلاَثُونَ تَحْمِيدَةً، وَأَرْبَعٌ وَثَلاَثُونَ تَكْبِيرَةً»
        </div>
      </div>
    </div>
  );
};
