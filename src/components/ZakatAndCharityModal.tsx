import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { SadaqahRecord } from '../types';
import {
  X, Coins, Heart, Plus, Trash2, Calculator, CheckCircle2,
  AlertCircle, Sparkles, Scale, HandHeart
} from 'lucide-react';

interface ZakatAndCharityModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'zakat' | 'sadaqah';
}

const INTENTION_PRESETS = [
  'صدقة جارية عن الوالدين',
  'تفريج كربة محتاج',
  'سقيا ماء وإطعام طعام',
  'شكر لله على نعمة العافية',
  'دفع بلاء وشفاء مريض',
  'كفالة يتيم أو طالب علم'
];

export const ZakatAndCharityModal: React.FC<ZakatAndCharityModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'zakat'
}) => {
  const [activeTab, setActiveTab] = useState<'zakat' | 'sadaqah'>(initialTab);
  const [currency, setCurrency] = useState<string>('ج.م');

  // Zakat Calculator Inputs
  const [goldGramPrice24, setGoldGramPrice24] = useState<string>('4200');
  const [cashSavings, setCashSavings] = useState<string>('');
  const [goldValueOrGrams, setGoldValueOrGrams] = useState<string>('');
  const [goldInputType, setGoldInputType] = useState<'value' | 'grams'>('grams');
  const [investmentsOrTrade, setInvestmentsOrTrade] = useState<string>('');
  const [debtsToDeduct, setDebtsToDeduct] = useState<string>('');
  const [familyMembersCount, setFamilyMembersCount] = useState<number>(4);

  // Sadaqah Tracker Inputs
  const [sadaqahRecords, setSadaqahRecords] = useState<SadaqahRecord[]>([]);
  const [newAmount, setNewAmount] = useState<string>('');
  const [newIntention, setNewIntention] = useState<string>(INTENTION_PRESETS[0]);
  const [addedBanner, setAddedBanner] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSadaqahRecords(StorageService.getSadaqahRecords());
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  // Zakat Math (85 grams of 24K gold is the canonical Nisab)
  const gramPrice = Math.max(0, parseFloat(goldGramPrice24) || 0);
  const nisabValue = Math.round(gramPrice * 85);

  const cashNum = Math.max(0, parseFloat(cashSavings) || 0);
  const goldRaw = Math.max(0, parseFloat(goldValueOrGrams) || 0);
  const goldTotalValue = goldInputType === 'grams' ? goldRaw * gramPrice : goldRaw;
  const tradeNum = Math.max(0, parseFloat(investmentsOrTrade) || 0);
  const debtsNum = Math.max(0, parseFloat(debtsToDeduct) || 0);

  const netZakatableWealth = Math.max(0, cashNum + goldTotalValue + tradeNum - debtsNum);
  const hasReachedNisab = nisabValue > 0 && netZakatableWealth >= nisabValue;
  const zakatDueAmount = hasReachedNisab ? Math.round((netZakatableWealth * 0.025) * 100) / 100 : 0;

  const handleAddSadaqah = () => {
    const amt = parseFloat(newAmount);
    if (!amt || amt <= 0) return;
    const updated = StorageService.addSadaqahRecord(amt, currency, newIntention);
    setSadaqahRecords(updated);
    setNewAmount('');
    setAddedBanner('تقبل الله صدقتك وأخلف عليك خيراً وبركة ✓');
    setTimeout(() => setAddedBanner(null), 3500);
  };

  const handleDeleteSadaqah = (id: string) => {
    const updated = StorageService.deleteSadaqahRecord(id);
    setSadaqahRecords(updated);
  };

  const totalSadaqahAmount = sadaqahRecords.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-[#0D131A] border border-[#D4AF37]/40 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between sticky top-0 bg-[#0D131A]/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center">
              <Coins size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                حاسبة الزكاة وسجل الصدقات
              </h3>
              <p className="text-[10px] text-slate-400">
                ﴿وَمَا أَنفَقْتُم مِّن شَيْءٍ فَهُوَ يُخْلِفُهُ ۖ وَهُوَ خَيْرُ الرَّازِقِينَ﴾
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700"
          >
            <X size={16} />
          </button>
        </div>

        {/* Currency Selector & Tabs */}
        <div className="p-3 border-b border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">العملة المستخدمة:</span>
            <div className="flex items-center gap-1">
              {['ج.م', 'ر.س', 'د.إ', 'د.ك', '$'].map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                    currency === c
                      ? 'bg-[#D4AF37] text-slate-950 border-[#D4AF37]'
                      : 'bg-[#141D28] text-slate-300 border-slate-800'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 bg-[#121820] p-1 rounded-2xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('zakat')}
              className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'zakat'
                  ? 'bg-[#1C2736] text-[#D4AF37] shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calculator size={14} />
              <span>حاسبة الزكاة الشرعية</span>
            </button>
            <button
              onClick={() => setActiveTab('sadaqah')}
              className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'sadaqah'
                  ? 'bg-[#1C2736] text-emerald-400 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <HandHeart size={14} />
              <span>سجل الصدقات ({sadaqahRecords.length})</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 text-xs">
          {activeTab === 'zakat' ? (
            <>
              {/* Nisab Reference Card */}
              <div className="p-3.5 rounded-2xl bg-[#131C26] border border-[#D4AF37]/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#D4AF37] flex items-center gap-1.5">
                    <Scale size={14} />
                    <span>معيار نصاب الزكاة (85 جرام ذهب عيار 24)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-[11px] text-slate-300 shrink-0">سعر جرام الذهب عيار 24 اليوم:</label>
                  <div className="relative w-36">
                    <input
                      type="number"
                      min="0"
                      value={goldGramPrice24}
                      onChange={(e) => setGoldGramPrice24(e.target.value)}
                      className="w-full bg-[#0E141C] border border-slate-700 rounded-xl py-1.5 px-3 text-left font-mono font-bold text-slate-100 focus:outline-none focus:border-[#D4AF37]"
                    />
                    <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-400">{currency}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                  <span className="text-slate-400">قيمة النصاب الشرعي الحالي:</span>
                  <span className="font-bold text-[#D4AF37] font-mono text-sm">
                    {nisabValue.toLocaleString()} {currency}
                  </span>
                </div>
              </div>

              {/* Wealth Inputs */}
              <div className="space-y-2.5 bg-[#121820] border border-slate-800 rounded-2xl p-3.5">
                <h4 className="font-bold text-slate-200 text-xs mb-1">أدخل أموالك ومدخراتك التي حال عليها الحول:</h4>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">١. النقد والمدخرات البنكية ({currency}):</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={cashSavings}
                    onChange={(e) => setCashSavings(e.target.value)}
                    className="w-full bg-[#161F2A] border border-slate-700/80 rounded-xl py-2 px-3 text-slate-100 font-mono focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-slate-400">٢. الذهب المدخر للادخار:</label>
                    <div className="flex items-center gap-1 text-[10px]">
                      <button
                        onClick={() => setGoldInputType('grams')}
                        className={`px-2 py-0.5 rounded-md ${goldInputType === 'grams' ? 'bg-[#D4AF37] text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}
                      >
                        بالجرام (عيار 24)
                      </button>
                      <button
                        onClick={() => setGoldInputType('value')}
                        className={`px-2 py-0.5 rounded-md ${goldInputType === 'value' ? 'bg-[#D4AF37] text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}
                      >
                        بالقيمة المالية
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    placeholder={goldInputType === 'grams' ? 'عدد الجرامات (مثال: 90)' : 'القيمة المالية'}
                    value={goldValueOrGrams}
                    onChange={(e) => setGoldValueOrGrams(e.target.value)}
                    className="w-full bg-[#161F2A] border border-slate-700/80 rounded-xl py-2 px-3 text-slate-100 font-mono focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">٣. قيمة عروض التجارة أو الأسهم ({currency}):</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={investmentsOrTrade}
                    onChange={(e) => setInvestmentsOrTrade(e.target.value)}
                    className="w-full bg-[#161F2A] border border-slate-700/80 rounded-xl py-2 px-3 text-slate-100 font-mono focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">٤. الديون الحالة الواجبة السداد (تُخصم):</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={debtsToDeduct}
                    onChange={(e) => setDebtsToDeduct(e.target.value)}
                    className="w-full bg-[#161F2A] border border-slate-700/80 rounded-xl py-2 px-3 text-slate-100 font-mono focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Zakat Final Result Card */}
              <div className={`p-4 rounded-2xl border space-y-2 ${
                hasReachedNisab
                  ? 'bg-gradient-to-br from-emerald-950/50 to-[#101A18] border-emerald-500/50'
                  : 'bg-[#141C25] border-slate-800'
              }`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">صافي الوعاء الزكوي:</span>
                  <span className="font-bold font-mono text-slate-100">
                    {Math.round(netZakatableWealth).toLocaleString()} {currency}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    {hasReachedNisab ? (
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    ) : (
                      <AlertCircle size={16} className="text-amber-400" />
                    )}
                    <span className="font-bold text-slate-100">
                      {hasReachedNisab ? 'مقدار الزكاة الواجبة (2.5%):' : 'لم يبلغ المال النصاب الشرعي بعد'}
                    </span>
                  </div>
                  {hasReachedNisab && (
                    <span className="text-lg font-extrabold text-emerald-400 font-mono">
                      {zakatDueAmount.toLocaleString()} {currency}
                    </span>
                  )}
                </div>

                {hasReachedNisab && (
                  <button
                    onClick={() => {
                      const updated = StorageService.addSadaqahRecord(
                        zakatDueAmount,
                        currency,
                        'إخراج زكاة المال السنوية المفروضة (2.5%)'
                      );
                      setSadaqahRecords(updated);
                      setActiveTab('sadaqah');
                    }}
                    className="w-full mt-2 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all"
                  >
                    تسجيل إخراج الزكاة في سجل الصدقات
                  </button>
                )}
              </div>

              {/* Quick Zakat Al-Fitr helper */}
              <div className="p-3.5 rounded-2xl bg-[#121923] border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[#D4AF37] font-bold block">حاسبة زكاة الفطر السريعة</span>
                  <span className="text-[10px] text-slate-400">صاع من طعام (حوالي 2.5 - 3 كجم من غالب قوت البلد عن كل فرد)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setFamilyMembersCount(c => Math.max(1, c - 1))}
                    className="w-6 h-6 rounded-lg bg-slate-800 text-slate-200 font-bold"
                  >
                    -
                  </button>
                  <span className="font-bold text-[#D4AF37] px-1 tabular-nums">{familyMembersCount} أفراد</span>
                  <button
                    onClick={() => setFamilyMembersCount(c => c + 1)}
                    className="w-6 h-6 rounded-lg bg-slate-800 text-slate-200 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Sadaqah Log Tab */
            <div className="space-y-4">
              {/* Summary Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#142420] to-[#101917] border border-emerald-500/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-emerald-400 font-bold block">إجمالي الصدقات المسجلة</span>
                  <h4 className="text-xl font-black text-slate-100 font-mono mt-0.5">
                    {totalSadaqahAmount.toLocaleString()} <span className="text-xs font-normal text-emerald-300">{currency}</span>
                  </h4>
                  <span className="text-[10px] text-slate-400">«ما نقص مال من صدقة» · {sadaqahRecords.length} عملية إنفاق</span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Heart size={22} />
                </div>
              </div>

              {addedBanner && (
                <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-center font-bold">
                  {addedBanner}
                </div>
              )}

              {/* Add New Sadaqah Form */}
              <div className="p-3.5 rounded-2xl bg-[#121820] border border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-200">تسجيل صدقة جديدة:</h4>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    placeholder={`المبلغ (${currency})`}
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-32 bg-[#161F2A] border border-slate-700 rounded-xl py-2 px-3 text-slate-100 font-mono focus:outline-none focus:border-emerald-400"
                  />
                  <input
                    type="text"
                    placeholder="النية أو جهة الصدقة..."
                    value={newIntention}
                    onChange={(e) => setNewIntention(e.target.value)}
                    className="flex-1 bg-[#161F2A] border border-slate-700 rounded-xl py-2 px-3 text-slate-100 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {INTENTION_PRESETS.map((intent) => (
                    <button
                      key={intent}
                      onClick={() => setNewIntention(intent)}
                      className={`px-2 py-1 rounded-lg text-[10px] border transition-colors ${
                        newIntention === intent
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                          : 'bg-[#17202B] text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {intent}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleAddSadaqah}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <Plus size={15} />
                  <span>حفظ الصدقة في سجل الأثر الطيب</span>
                </button>
              </div>

              {/* Records List */}
              <div className="space-y-2">
                {sadaqahRecords.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    لا توجد صدقات مسجلة بعد. ابدأ بتوثيق صدقاتك الخفية والبركة.
                  </div>
                ) : (
                  sadaqahRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3 rounded-2xl bg-[#121922] border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-slate-100 block">{rec.intention}</span>
                        <span className="text-[10px] text-slate-400">{rec.date}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-emerald-400 font-mono text-sm">
                          {rec.amount.toLocaleString()} {rec.currency}
                        </span>
                        <button
                          onClick={() => handleDeleteSadaqah(rec.id)}
                          className="p-1 text-slate-500 hover:text-rose-400"
                          title="حذف"
                        >
                          <Trash2 size={14} />
                        </button>
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
