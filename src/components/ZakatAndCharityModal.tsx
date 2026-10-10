import React, { useState, useEffect } from 'react';
import { SadaqahRecord } from '../types';
import { StorageService } from '../services/storageService';
import confetti from 'canvas-confetti';
import {
  X, Coins, HeartHandshake, Calculator, Plus, CheckCircle2,
  Sparkles, ShieldCheck, ArrowUpLeft, Award
} from 'lucide-react';

interface ZakatAndCharityModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'zakat' | 'charity' | 'sadaqah';
}

const SADAQAH_INTENTIONS = [
  'صدقة جارية لوجه الله',
  'بنية الشفاء والعافية',
  'عن الوالدين والأهل',
  'لتفريج الكرب وسعة الرزق',
  'إطعام مسكين وكفالة يتيم',
  'سقيا ماء وعمارة مساجد'
];

export const ZakatAndCharityModal: React.FC<ZakatAndCharityModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'zakat'
}) => {
  const [activeTab, setActiveTab] = useState<'zakat' | 'charity'>(initialTab === 'sadaqah' ? 'charity' : initialTab);

  // Zakat Calculator State
  const [cashSavings, setCashSavings] = useState<string>('');
  const [goldGrams24, setGoldGrams24] = useState<string>('');
  const [goldGrams21, setGoldGrams21] = useState<string>('');
  const [goldGramPrice24, setGoldGramPrice24] = useState<string>('3800');
  const [investmentsAndTrade, setInvestmentsAndTrade] = useState<string>('');
  const [debtsOwedByUser, setDebtsOwedByUser] = useState<string>('');
  const [currencyLabel, setCurrencyLabel] = useState<string>('ج.م / ر.س');

  // Charity Tracker State
  const [sadaqahList, setSadaqahList] = useState<SadaqahRecord[]>([]);
  const [newAmount, setNewAmount] = useState<string>('');
  const [selectedIntention, setSelectedIntention] = useState<string>(SADAQAH_INTENTIONS[0]);
  const [addedSuccessMsg, setAddedSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab === 'sadaqah' ? 'charity' : initialTab);
      setSadaqahList(StorageService.getSadaqahRecords());
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  // Zakat Calculation Logic (85g of 24K Gold Nisab, 2.5% rate)
  const numCash = parseFloat(cashSavings) || 0;
  const numGold24 = parseFloat(goldGrams24) || 0;
  const numGold21 = parseFloat(goldGrams21) || 0;
  const numGoldPrice24 = parseFloat(goldGramPrice24) || 0;
  const numTrade = parseFloat(investmentsAndTrade) || 0;
  const numDebts = parseFloat(debtsOwedByUser) || 0;

  // Convert 21K gold to 24K equivalent: grams * (21 / 24)
  const totalEquivalentGold24Grams = numGold24 + (numGold21 * 21) / 24;
  const goldValueInCurrency = totalEquivalentGold24Grams * numGoldPrice24;

  const totalGrossWealth = numCash + goldValueInCurrency + numTrade;
  const netZakatableWealth = Math.max(0, totalGrossWealth - numDebts);

  // Nisab threshold = 85 grams of 24K gold
  const nisabThresholdValue = 85 * numGoldPrice24;
  const isNisabReached = nisabThresholdValue > 0 && netZakatableWealth >= nisabThresholdValue;
  const zakatDue = isNisabReached ? netZakatableWealth * 0.025 : 0;

  const handleAddSadaqah = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newAmount);
    if (!val || val <= 0) return;

    const updated = StorageService.addSadaqahRecord(val, currencyLabel, selectedIntention);
    setSadaqahList(updated);
    setNewAmount('');
    setAddedSuccessMsg('تقبّل الله صدقتك وضاعف أجرك وأخلف عليك خيراً ✓');
    setTimeout(() => setAddedSuccessMsg(null), 3500);

    try {
      confetti({
        particleCount: 55,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch {
      // ignore
    }
  };

  const totalSadaqahAmount = sadaqahList.reduce((acc, item) => acc + item.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-xl animate-fadeIn select-none">
      <div className="bg-gradient-to-b from-[#17140D] via-[#0E0D0A] to-[#080705] border-t sm:border border-[#C8A24A]/55 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex flex-col text-right">
        {/* Header */}
        <div className="p-4 border-b border-[#C8A24A]/25 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#1F1A10] border border-[#C8A24A]/50 text-[#E6C66E]">
              <Coins size={18} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[#F3E5AB]">حاسبة الزكاة وسجل الصدقات</h2>
              <p className="text-[10px] text-[#C4B998]">﴿خُذْ مِنْ أَمْوَالِهِمْ صَدَقَةً تُطَهِّرُهُمْ وَتُزَكِّيهِمْ بِهَا﴾</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#18150E] hover:bg-[#241F14] text-[#C4B998] hover:text-white border border-[#C8A24A]/35 transition-colors"
            aria-label="إغلاق"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="px-4 pt-3">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#14120D] rounded-2xl border border-[#C8A24A]/30 text-xs">
            <button
              onClick={() => setActiveTab('zakat')}
              className={`py-2.5 px-3 rounded-xl font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'zakat'
                  ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] shadow'
                  : 'text-[#C4B998] hover:text-white'
              }`}
            >
              <Calculator size={14} />
              <span>حاسبة زكاة المال والذهب</span>
            </button>

            <button
              onClick={() => setActiveTab('charity')}
              className={`py-2.5 px-3 rounded-xl font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'charity'
                  ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] shadow'
                  : 'text-[#C4B998] hover:text-white'
              }`}
            >
              <HeartHandshake size={14} />
              <span>سجل الصدقات والأثر ({sadaqahList.length})</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 space-y-4 text-xs">
          {activeTab === 'zakat' ? (
            <div className="space-y-3.5">
              {/* Summary Result Card */}
              <div className={`p-4 rounded-2xl border space-y-2 transition-all ${
                isNisabReached
                  ? 'bg-gradient-to-br from-[#231D11] to-[#13100A] border-[#E6C66E]/60 shadow-[0_0_25px_rgba(200,162,74,0.2)]'
                  : 'bg-[#14120D] border-[#C8A24A]/35'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#E6C66E] flex items-center gap-1">
                    <Sparkles size={13} />
                    <span>مقدار الزكاة الواجبة (ربع العشر 2.5%):</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    isNisabReached
                      ? 'bg-[#C8A24A]/25 text-[#F3E5AB] border-[#E6C66E]/50'
                      : 'bg-[#1C1811] text-[#C4B998] border-[#C8A24A]/30'
                  }`}>
                    {isNisabReached ? 'بلغ النصاب الشرعي ✓' : 'دون النصاب الشرعي'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div className="text-2xl font-black text-[#F3E5AB] font-mono tabular-nums">
                    {zakatDue.toLocaleString('ar-EG', { maximumFractionDigits: 2 })}
                    <span className="text-xs text-[#C4B998] font-sans mr-1.5">{currencyLabel}</span>
                  </div>
                  <div className="text-[11px] text-[#C4B998]">
                    صافي الوعاء الزكوي: <strong className="text-white font-mono">{netZakatableWealth.toLocaleString('ar-EG', { maximumFractionDigits: 0 })}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#C8A24A]/25 flex items-center justify-between text-[10px] text-[#C4B998]">
                  <span>قيمة النصاب (٨٥ جرام ذهب عيار ٢٤):</span>
                  <span className="font-mono text-[#E6C66E] font-bold">
                    {nisabThresholdValue.toLocaleString('ar-EG', { maximumFractionDigits: 0 })} {currencyLabel}
                  </span>
                </div>
              </div>

              {/* Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="bg-[#14120D] border border-[#C8A24A]/30 rounded-xl p-3 space-y-1">
                  <label className="text-[11px] font-bold text-[#F3E5AB] block">
                    ١. النقد والمدخرات البنكية
                  </label>
                  <span className="text-[10px] text-[#C4B998] block">المبالغ النقدية التي حال عليها الحول</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={cashSavings}
                    onChange={(e) => setCashSavings(e.target.value)}
                    className="w-full mt-1 bg-[#0A0907] border border-[#C8A24A]/40 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#E6C66E]"
                  />
                </div>

                <div className="bg-[#14120D] border border-[#C8A24A]/30 rounded-xl p-3 space-y-1">
                  <label className="text-[11px] font-bold text-[#F3E5AB] block">
                    ٢. عروض التجارة والأسهم الاستثمارية
                  </label>
                  <span className="text-[10px] text-[#C4B998] block">القيمة السوقية الحالية للبضائع أو الأسهم</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={investmentsAndTrade}
                    onChange={(e) => setInvestmentsAndTrade(e.target.value)}
                    className="w-full mt-1 bg-[#0A0907] border border-[#C8A24A]/40 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#E6C66E]"
                  />
                </div>

                <div className="bg-[#14120D] border border-[#C8A24A]/30 rounded-xl p-3 space-y-1">
                  <label className="text-[11px] font-bold text-[#E6C66E] block">
                    ٣. وزن الذهب المدخر عيار ٢٤ (بالجرام)
                  </label>
                  <span className="text-[10px] text-[#C4B998] block">السبائك والذهب الخالص عيار ٢٤</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 جرام"
                    value={goldGrams24}
                    onChange={(e) => setGoldGrams24(e.target.value)}
                    className="w-full mt-1 bg-[#0A0907] border border-[#C8A24A]/40 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#E6C66E]"
                  />
                </div>

                <div className="bg-[#14120D] border border-[#C8A24A]/30 rounded-xl p-3 space-y-1">
                  <label className="text-[11px] font-bold text-[#E6C66E] block">
                    ٤. وزن الذهب عيار ٢١ (بالجرام)
                  </label>
                  <span className="text-[10px] text-[#C4B998] block">يُعادل تلقائياً بنسبة نقاء (٢١/٢٤)</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 جرام"
                    value={goldGrams21}
                    onChange={(e) => setGoldGrams21(e.target.value)}
                    className="w-full mt-1 bg-[#0A0907] border border-[#C8A24A]/40 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#E6C66E]"
                  />
                </div>

                <div className="bg-[#14120D] border border-[#C8A24A]/30 rounded-xl p-3 space-y-1">
                  <label className="text-[11px] font-bold text-[#F3E5AB] block">
                    ٥. سعر جرام الذهب عيار ٢٤ اليوم
                  </label>
                  <span className="text-[10px] text-[#C4B998] block">لحساب قيمة النصاب الشرعي بدقة بعملتك</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="3800"
                    value={goldGramPrice24}
                    onChange={(e) => setGoldGramPrice24(e.target.value)}
                    className="w-full mt-1 bg-[#0A0907] border border-[#C8A24A]/40 rounded-lg px-3 py-2 text-sm font-mono text-[#E6C66E] focus:outline-none focus:border-[#E6C66E]"
                  />
                </div>

                <div className="bg-[#14120D] border border-[#C8A24A]/30 rounded-xl p-3 space-y-1">
                  <label className="text-[11px] font-bold text-rose-300 block">
                    ٦. الديون الحالّة الواجب سدادها
                  </label>
                  <span className="text-[10px] text-[#C4B998] block">تُخصم من إجمالي المال قبل حساب الزكاة</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={debtsOwedByUser}
                    onChange={(e) => setDebtsOwedByUser(e.target.value)}
                    className="w-full mt-1 bg-[#0A0907] border border-[#C8A24A]/40 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>

              {zakatDue > 0 && (
                <button
                  onClick={() => {
                    StorageService.addSadaqahRecord(Math.round(zakatDue), currencyLabel, 'إخراج زكاة المال المفروضة');
                    setSadaqahList(StorageService.getSadaqahRecords());
                    setActiveTab('charity');
                    setAddedSuccessMsg('تم تدوين إخراج زكاة مالك في سجل الصدقات والأثر المبارك ✓');
                    setTimeout(() => setAddedSuccessMsg(null), 4000);
                  }}
                  className="athar-btn-primary w-full py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={15} />
                  <span>تدوين الزكاة المخرجة في سجل أثرك</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Total Sadaqah Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#231D11] to-[#12100A] border border-[#C8A24A]/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#E6C66E] font-bold block">رصيد الصدقات المدوّن (سِرّاً بينك وبين الله)</span>
                  <div className="text-xl font-black text-[#F3E5AB] mt-0.5 font-mono tabular-nums">
                    {totalSadaqahAmount.toLocaleString('ar-EG')} <span className="text-xs font-sans text-[#C4B998]">{currencyLabel}</span>
                  </div>
                  <span className="text-[10px] text-[#C4B998] block mt-0.5">
                    عدد الصدقات المسجلة: {sadaqahList.length} صدقة مباركة
                  </span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-[#C8A24A]/20 border border-[#C8A24A]/45 flex items-center justify-center text-[#E6C66E]">
                  <Award size={22} />
                </div>
              </div>

              {addedSuccessMsg && (
                <div className="p-3 rounded-xl bg-[#221D12] border border-[#E6C66E]/60 text-[#F3E5AB] text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#E6C66E] shrink-0" />
                  <span>{addedSuccessMsg}</span>
                </div>
              )}

              {/* Add New Sadaqah Form */}
              <form onSubmit={handleAddSadaqah} className="bg-[#14120D] border border-[#C8A24A]/35 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[#F3E5AB] text-xs">تسجيل صدقة جديدة في دفتر أثرك</span>
                  <span className="text-[10px] text-[#E6C66E] flex items-center gap-1">
                    <ShieldCheck size={12} />
                    <span>محفوظ على جهازك فقط</span>
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="المبلغ (مثال: 50 أو 100)..."
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="flex-1 bg-[#0A0907] border border-[#C8A24A]/45 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#E6C66E]"
                  />
                  <button
                    type="submit"
                    className="athar-btn-primary px-4 py-2 rounded-xl font-extrabold text-xs flex items-center gap-1 shrink-0"
                  >
                    <Plus size={14} />
                    <span>تدوين الصدقة</span>
                  </button>
                </div>

                {/* Intention Chips */}
                <div>
                  <span className="text-[10px] text-[#C4B998] block mb-1.5 font-bold">اختر نية الصدقة لمضاعفة الأجر:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {SADAQAH_INTENTIONS.map((intent) => (
                      <button
                        type="button"
                        key={intent}
                        onClick={() => setSelectedIntention(intent)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                          selectedIntention === intent
                            ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#F3E5AB]'
                            : 'bg-[#0E0D0A] border-[#C8A24A]/25 text-[#C4B998] hover:text-white'
                        }`}
                      >
                        {intent}
                      </button>
                    ))}
                  </div>
                </div>
              </form>

              {/* Recent Sadaqah Log */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
                {sadaqahList.length === 0 ? (
                  <div className="py-8 text-center text-[#8E8268] text-xs">
                    «مَا نَقَصَتْ صَدَقَةٌ مِنْ مَالٍ» — ابدأ بتدوين أول صدقة لك اليوم.
                  </div>
                ) : (
                  sadaqahList.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-[#14120D] border border-[#C8A24A]/30 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#C8A24A]/15 text-[#E6C66E] border border-[#C8A24A]/35 flex items-center justify-center font-bold">
                          <ArrowUpLeft size={15} />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-[#F3E5AB] block">{item.intention}</span>
                          <span className="text-[10px] text-[#8E8268] font-mono">{item.date}</span>
                        </div>
                      </div>
                      <div className="text-sm font-extrabold text-[#E6C66E] font-mono">
                        +{item.amount.toLocaleString('ar-EG')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
