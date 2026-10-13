import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  Coins,
  Calculator,
  CheckCircle2,
  Sparkles,
  Award,
  BookOpen,
  Wheat,
  Scale,
  Users,
  ChevronDown,
  ChevronUp,
  Heart,
} from 'lucide-react';

interface ZakatAndCharityModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'guide' | 'virtues' | 'calculator' | 'zakat' | 'sadaqah' | 'charity';
}

type MainTab = 'guide' | 'virtues' | 'calculator';
type CalcCategory = 'wealth_gold' | 'fitr' | 'crops';

const CURRENCIES = ['ج.م', 'ر.س', 'د.إ', 'د.ك', 'ر.ع', 'د.ب', '$'];

export const ZakatAndCharityModal: React.FC<ZakatAndCharityModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'guide',
}) => {
  const resolveInitialTab = (tab?: string): MainTab => {
    if (tab === 'calculator' || tab === 'zakat') return 'calculator';
    if (tab === 'virtues' || tab === 'sadaqah' || tab === 'charity') return 'virtues';
    return 'guide';
  };

  const [activeTab, setActiveTab] = useState<MainTab>(() => resolveInitialTab(initialTab));
  const [calcCategory, setCalcCategory] = useState<CalcCategory>('wealth_gold');

  // 1. Zakat on Wealth & Gold State
  const [cashSavings, setCashSavings] = useState<string>('');
  const [goldGrams24, setGoldGrams24] = useState<string>('');
  const [goldGrams21, setGoldGrams21] = useState<string>('');
  const [goldGramPrice24, setGoldGramPrice24] = useState<string>('3800');
  const [investmentsAndTrade, setInvestmentsAndTrade] = useState<string>('');
  const [debtsOwedByUser, setDebtsOwedByUser] = useState<string>('');
  const [currencyLabel, setCurrencyLabel] = useState<string>('ج.م');

  // 2. Zakat Al-Fitr State
  const [familyMembersCount, setFamilyMembersCount] = useState<string>('4');
  const [fitrCostPerPerson, setFitrCostPerPerson] = useState<string>('35');

  // 3. Zakat on Crops & Agriculture State
  const [cropValue, setCropValue] = useState<string>('');
  const [irrigationType, setIrrigationType] = useState<'rain' | 'artificial'>('rain'); // 10% vs 5%

  // 4. Guide Expanded Section States
  const [expandedGuideIndex, setExpandedGuideIndex] = useState<number | null>(0);
  const [celebratedMsg, setCelebratedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(resolveInitialTab(initialTab));
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  // Wealth & Gold Calculation:
  const numCash = parseFloat(cashSavings) || 0;
  const numGold24 = parseFloat(goldGrams24) || 0;
  const numGold21 = parseFloat(goldGrams21) || 0;
  const numGoldPrice24 = parseFloat(goldGramPrice24) || 0;
  const numTrade = parseFloat(investmentsAndTrade) || 0;
  const numDebts = parseFloat(debtsOwedByUser) || 0;

  const totalEquivalentGold24Grams = numGold24 + (numGold21 * 21) / 24;
  const goldValueInCurrency = totalEquivalentGold24Grams * numGoldPrice24;
  const totalGrossWealth = numCash + goldValueInCurrency + numTrade;
  const netZakatableWealth = Math.max(0, totalGrossWealth - numDebts);

  const nisabThresholdValue = 85 * numGoldPrice24; // 85 grams of 24K gold
  const isNisabReached = nisabThresholdValue > 0 && netZakatableWealth >= nisabThresholdValue;
  const zakatDueWealth = isNisabReached ? netZakatableWealth * 0.025 : 0;

  // Fitr Calculation:
  const numMembers = Math.max(1, parseInt(familyMembersCount, 10) || 1);
  const numFitrCost = parseFloat(fitrCostPerPerson) || 0;
  const zakatDueFitr = numMembers * numFitrCost;

  // Crops Calculation:
  const numCropValue = parseFloat(cropValue) || 0;
  const cropRate = irrigationType === 'rain' ? 0.1 : 0.05; // 10% for rain, 5% for artificial
  const zakatDueCrop = numCropValue * cropRate;

  const handleCelebrateZakat = (msg: string) => {
    setCelebratedMsg(msg);
    setTimeout(() => setCelebratedMsg(null), 4000);
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {}
  };

  // Guide Items (Clear, Authenticated, Concise)
  const ZAKAT_GUIDE_ITEMS = [
    {
      title: '١. زكاة النقدين والمدخرات والسيولة البنكية',
      badge: 'النسبة: ٢.٥٪ (ربع العُشر)',
      nisab: 'ما يعادل قيمة ٨٥ جراماً من الذهب الخالص عيار ٢٤',
      condition: 'بلوغ النصاب وحولان الحول (مرور عام هجري كامل والمال فائض عن الحاجة الأصلية)',
      summary:
        'تجب في جميع الأموال النقدية والودائع البنكية والشهادات الاستثمارية ذات العائد. تُحسب بإخراج ٢.٥٪ من أصل المال بعد خصم الديون العاجلة.',
      evidence: 'قال رسول الله ﷺ: «فِي الرِّقَةِ رُبْعُ العُشْرِ» (صحيح البخاري).',
    },
    {
      title: '٢. زكاة الذهب والفضة والسبائك والحُلي',
      badge: 'النسبة: ٢.٥٪',
      nisab: 'نصاب الذهب ٨٥ جرام عيار ٢٤ (أو ٩٧.١ جرام عيار ٢١) · نصاب الفضة ٥٩٥ جراماً',
      condition: 'يُزكى الذهب المدخر للتجارة أو الاكتناز. أما حُلي المرأة المعدّ للزينة والاستعمال المعتاد فجمهور الفقهاء على عدم وجوب الزكاة فيه والأحوط إخراجه.',
      summary:
        'يُقوّم الذهب والفضة بسعر السوق يوم تمام الحول، ويُخرج منه ربع العُشر (٢.٥٪) نقداً أو وزناً.',
      evidence: 'قال تعالى: ﴿وَالَّذِينَ يَكْنِزُونَ الذَّهَبَ وَالْفِضَّةَ وَلَا يُنفِقُونَهَا فِي سَبِيلِ اللَّهِ فَبَشِّرْهُم بِعَذَابٍ أَلِيمٍ﴾ [التوبة: ٣٤].',
    },
    {
      title: '٣. زكاة عروض التجارة والأسهم والاستثمار',
      badge: 'النسبة: ٢.٥٪',
      nisab: 'قيمة ٨٥ جرام ذهب عيار ٢٤ بسعر يوم الحول',
      condition: 'أن تكون السلع مشتراة بنية المتاجرة والربح وحال عليها الحول',
      summary:
        'يقوّم التاجر بضائعه المعدة للبيع بسعر الجملة الحالي يوم وجوب الزكاة، ويضم إليها السيولة النقدية والديون المرجوة السداد، ويخصم الديون التي عليه، ويخرج ٢.٥٪.',
      evidence: 'أجمع أهل العلم على وجوب الزكاة في عروض التجارة إذا بلغت النصاب وحال عليها الحول.',
    },
    {
      title: '٤. زكاة الفطر (واجبة في ختام رمضان)',
      badge: 'المقدار: صاع نبوي عن كل فرد',
      nisab: 'مَن ملك قوتاً زائداً عن حاجته وحاجة عياله ليلة العيد ويومه',
      condition: 'تجب بغروب شمس آخر يوم من رمضان، وأفضل وقت لإخراجها قبل صلاة العيد ويجوز إخراجها قبل العيد بيوم أو يومين',
      summary:
        'صاع من غالب قوت البلد (أرز، قمح، تمر.. نحو ٢.٥ إلى ٣ كجم)، ويجوز إخراج قيمتها نقداً تيسيراً على الفقراء بحسب ما تعتمده دور الإفتاء الرسمية.',
      evidence: '«فَرَضَ رَسُولُ اللَّهِ ﷺ زَكَاةَ الْفِطْرِ طُهْرَةً لِلصَّائِمِ مِنَ اللَّغْوِ وَالرَّفَثِ وَطُعْمَةً لِلْمَسَاكِينِ» (رواه أبو داود وصححه الألباني).',
    },
    {
      title: '٥. زكاة الزروع والثمار',
      badge: 'النسبة: ١٠٪ أو ٥٪',
      nisab: 'خمسة أوسق (نحو ٦٥٣ كيلوجراماً من الحبوب والثمار المدخرة)',
      condition: 'تخرج يوم الحصاد وجذاذ النخل، ولا يشترط فيها حولان الحول',
      summary:
        'يخرج العُشر (١٠٪) إذا سُقيت بمياه الأمطار والعيون بلا كلفة، ويخرج نصف العُشر (٥٪) إذا سُقيت بالآلات وتكلفة الري.',
      evidence: 'قال تعالى: ﴿وَآتُوا حَقَّهُ يَوْمَ حَصَادِهِ﴾ [الأنعام: ١٤١]. وقال ﷺ: «فِيمَا سَقَتِ السَّمَاءُ وَالعُيُونُ العُشْرُ، وَفِيمَا سُقِيَ بِالنَّضْحِ نِصْفُ العُشْرِ» (صحيح البخاري).',
    },
    {
      title: '٦. صدقة التطوع والصدقات الجارية',
      badge: 'باب الفضل والمضاعفة',
      nisab: 'لا نصاب ولا حول، في أي وقت وبأي قدر',
      condition: 'الإخلاص لله تعالى واجتناب المنّ والأذى، وتحري المحتاجين وأولي القربى',
      summary:
        'أبواب الخير مفتوحة: إطعام الطعام، سقي الماء، كفالة الأيتام، تفريج الكرب، والصدقة الخفية التي تطفئ غضب الرب.',
      evidence: 'قال رسول الله ﷺ: «إِذَا مَاتَ الإِنْسَانُ انْقَطَعَ عَنْهُ عَمَلُهُ إِلاَّ مِنْ ثَلاَثَةٍ: إِلاَّ مِنْ صَدَقَةٍ جَارِيَةٍ، أَوْ عِلْمٍ يُنْتَفَعُ بِهِ، أَوْ وَلَدٍ صَالِحٍ يَدْعُو لَهُ» (صحيح مسلم).',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-xl animate-fadeIn select-none font-arabic">
      <div className="bg-gradient-to-b from-[#18140D] via-[#0E0C09] to-[#070605] border-t sm:border border-[#C8A24A]/55 w-full max-w-lg max-h-[92vh] overflow-hidden rounded-t-3xl sm:rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.95)] flex flex-col text-right">
        {/* =====================================================================
            1. HEADER BANNER
           ===================================================================== */}
        <div className="p-4 border-b border-[#C8A24A]/25 flex items-center justify-between shrink-0 bg-[#120F0A]/90">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#2D2313] to-[#14110A] border border-[#E6C66E]/60 flex items-center justify-center text-[#E6C66E] shadow-[0_0_15px_rgba(200,162,74,0.25)] shrink-0">
              <Coins size={20} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-[#F3E5AB]">
                الزكاة والصدقات في رحاب الإيمان
              </h2>
              <p className="text-[10px] text-[#C4B998] mt-0.5">
                ﴿خُذْ مِنْ أَمْوَالِهِمْ صَدَقَةً تُطَهِّرُهُمْ وَتُزَكِّيهِمْ بِهَا﴾
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#18150E] hover:bg-[#241F14] text-[#C4B998] hover:text-white border border-[#C8A24A]/35 transition-colors flex items-center justify-center"
            aria-label="إغلاق"
          >
            <X size={16} />
          </button>
        </div>

        {/* =====================================================================
            2. MAIN NAVIGATION TABS (أنواع الزكاة -> فضلها وأجرها -> الحاسبة)
           ===================================================================== */}
        <div className="px-3 pt-3 pb-2 shrink-0 bg-[#0E0C09] border-b border-[#C8A24A]/20">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#15120C] rounded-2xl border border-[#C8A24A]/30 text-xs">
            <button
              onClick={() => setActiveTab('guide')}
              className={`py-2.5 px-2 rounded-xl font-extrabold transition-all text-center flex items-center justify-center gap-1.5 ${
                activeTab === 'guide'
                  ? 'bg-gradient-to-r from-[#E6C66E] to-[#B88A2D] text-[#070707] shadow'
                  : 'text-[#C4B998] hover:text-white'
              }`}
            >
              <BookOpen size={14} />
              <span>أنواع الزكاة</span>
            </button>

            <button
              onClick={() => setActiveTab('virtues')}
              className={`py-2.5 px-2 rounded-xl font-extrabold transition-all text-center flex items-center justify-center gap-1.5 ${
                activeTab === 'virtues'
                  ? 'bg-gradient-to-r from-[#E6C66E] to-[#B88A2D] text-[#070707] shadow'
                  : 'text-[#C4B998] hover:text-white'
              }`}
            >
              <Sparkles size={14} />
              <span>فضلها وأجرها</span>
            </button>

            <button
              onClick={() => setActiveTab('calculator')}
              className={`py-2.5 px-2 rounded-xl font-extrabold transition-all text-center flex items-center justify-center gap-1.5 ${
                activeTab === 'calculator'
                  ? 'bg-gradient-to-r from-[#E6C66E] to-[#B88A2D] text-[#070707] shadow'
                  : 'text-[#C4B998] hover:text-white'
              }`}
            >
              <Calculator size={14} />
              <span>الحاسبة الذكية</span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            3. SCROLLABLE TAB BODY
           ===================================================================== */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* =====================================================================
              TAB 1: GUIDE & TYPES (أنواع الزكاة وأحكامها)
             ===================================================================== */}
          {activeTab === 'guide' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#211B0F] to-[#120F0A] border border-[#E6C66E]/40 text-right space-y-1">
                <span className="text-xs font-extrabold text-[#E6C66E] flex items-center gap-1.5">
                  <BookOpen size={14} />
                  <span>دليل أحكام الزكاة والصدقات باختصار نافع</span>
                </span>
                <p className="text-[11px] text-[#C4B998] leading-relaxed">
                  الزكاة حق الله في المال متى بلغ النصاب وحال عليه الحول، تُصرف للأصناف الثمانية
                  المحددة في القرآن الكريم.
                </p>
              </div>

              {ZAKAT_GUIDE_ITEMS.map((item, idx) => {
                const isExpanded = expandedGuideIndex === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-[#C8A24A]/35 bg-[#12100B] overflow-hidden transition-all shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedGuideIndex(isExpanded ? null : idx)}
                      className="w-full p-3.5 text-right flex items-center justify-between gap-2 hover:bg-[#18140D] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-extrabold text-[#F3E5AB]">
                            {item.title}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full bg-[#C8A24A]/20 border border-[#C8A24A]/40 text-[10px] font-extrabold text-[#E6C66E]">
                            {item.badge}
                          </span>
                        </div>
                      </div>
                      <div className="text-[#E6C66E] shrink-0 p-1 rounded-lg bg-[#1B170E]">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-4 pt-1 space-y-2.5 border-t border-[#C8A24A]/20 bg-[#0A0907]/60 text-xs">
                        <div className="space-y-1">
                          <span className="text-[#E6C66E] font-extrabold block text-[11px]">
                            النصاب والشرط:
                          </span>
                          <p className="text-[#C4B998] text-[11px] leading-relaxed">
                            • {item.nisab}
                          </p>
                          <p className="text-[#C4B998] text-[11px] leading-relaxed">
                            • {item.condition}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[#F3E5AB] font-extrabold block text-[11px]">
                            طريقة الاحتساب:
                          </span>
                          <p className="text-[#D8CEB4] text-[11px] leading-relaxed">
                            {item.summary}
                          </p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-[#16130B] border border-[#C8A24A]/30 text-[11px] text-[#E6C66E] font-quran leading-relaxed">
                          {item.evidence}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* مصارف الزكاة الثمانية */}
              <div className="p-4 rounded-2xl bg-[#14110A] border border-[#C8A24A]/40 space-y-2 text-right">
                <span className="text-xs font-extrabold text-[#E6C66E] block">
                  مصارف الزكاة الثمانية بنص القرآن الكريم:
                </span>
                <p className="text-[11px] text-[#F3E5AB] font-quran leading-relaxed">
                  ﴿إِنَّمَا الصَّدَقَاتُ لِلْفُقَرَاءِ وَالْمَسَاكِينِ وَالْعَامِلِينَ عَلَيْهَا
                  وَالْمُؤَلَّفَةِ قُلُوبُهُمْ وَفِي الرِّقَابِ وَالْغَارِمِينَ وَفِي سَبِيلِ اللَّهِ
                  وَابْنِ السَّبِيلِ فَرِيضَةً مِّنَ اللَّهِ وَاللَّهُ عَلِيمٌ حَكِيمٌ﴾ [التوبة: ٦٠]
                </p>
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 2: VIRTUES IN QURAN & SUNNAH (فضلها وأجرها)
             ===================================================================== */}
          {activeTab === 'virtues' && (
            <div className="space-y-3.5 animate-fadeIn">
              {/* Spiritual Header */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#241E12] via-[#16130B] to-[#0D0B08] border border-[#E6C66E]/50 text-center space-y-1.5">
                <div className="w-10 h-10 mx-auto rounded-full bg-[#2C2314] border border-[#E6C66E]/60 flex items-center justify-center text-[#E6C66E] shadow">
                  <Heart size={20} />
                </div>
                <h3 className="text-sm font-extrabold text-[#F3E5AB]">
                  بركة الزكاة وعظيم ثواب الصدقة
                </h3>
                <p className="text-[11px] text-[#C4B998] leading-relaxed">
                  الزكاة نماء وبركة في المال، وتطهير للنفس، ووقاية من مصارع السوء، وحصن حصين للمؤمن
                  يوم القيامة.
                </p>
              </div>

              {/* Quranic Verses */}
              <div className="space-y-2.5">
                <span className="text-xs font-extrabold text-[#E6C66E] flex items-center gap-1.5">
                  <Sparkles size={13} />
                  <span>آيات بينات من كتاب الله العزيز:</span>
                </span>

                <div className="p-3.5 rounded-2xl bg-[#12100B] border border-[#C8A24A]/30 space-y-1.5 text-right">
                  <p className="font-quran text-xs sm:text-sm text-[#F3E5AB] leading-relaxed">
                    ﴿مَّثَلُ الَّذِينَ يُنفِقُونَ أَمْوَالَهُمْ فِي سَبِيلِ اللَّهِ كَمَثَلِ حَبَّةٍ
                    أَنبَتَتْ سَبْعَ سَنَابِلَ فِي كُلِّ سُنبُلَةٍ مِّائَةُ حَبَّةٍ وَاللَّهُ
                    يُضَاعِفُ لِمَن يَشَاءُ وَاللَّهُ وَاسِعٌ عَلِيمٌ﴾
                  </p>
                  <span className="text-[10px] text-[#C4B998] block">[سورة البقرة: ٢٦١]</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#12100B] border border-[#C8A24A]/30 space-y-1.5 text-right">
                  <p className="font-quran text-xs sm:text-sm text-[#F3E5AB] leading-relaxed">
                    ﴿وَمَا أَنفَقْتُم مِّن شَيْءٍ فَهُوَ يُخْلِفُهُ وَهُوَ خَيْرُ الرَّازِقِينَ﴾
                  </p>
                  <span className="text-[10px] text-[#C4B998] block">[سورة سبأ: ٣٩]</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#12100B] border border-[#C8A24A]/30 space-y-1.5 text-right">
                  <p className="font-quran text-xs sm:text-sm text-[#F3E5AB] leading-relaxed">
                    ﴿الَّذِينَ يُنفِقُونَ أَمْوَالَهُم بِاللَّيْلِ وَالنَّهَارِ سِرًّا وَعَلَانِيَةً
                    فَلَهُمْ أَجْرُهُمْ عِندَ رَبِّهِمْ وَلَا خَوْفٌ عَلَيْهِمْ وَلَا هُمْ
                    يَحْزَنُونَ﴾
                  </p>
                  <span className="text-[10px] text-[#C4B998] block">[سورة البقرة: ٢٧٤]</span>
                </div>
              </div>

              {/* Prophetic Hadiths */}
              <div className="space-y-2.5 pt-1">
                <span className="text-xs font-extrabold text-[#E6C66E] flex items-center gap-1.5">
                  <Award size={13} />
                  <span>من أنوار السنة النبوية الصحيحة:</span>
                </span>

                <div className="p-3.5 rounded-2xl bg-[#12100B] border border-[#C8A24A]/30 space-y-1 text-right">
                  <p className="text-xs text-white leading-relaxed">
                    قال رسول الله ﷺ: «مَا نَقَصَتْ صَدَقَةٌ مِنْ مَالٍ، وَمَا زَادَ اللَّهُ عَبْدًا
                    بِعَفْوٍ إِلَّا عِزًّا، وَمَا تَوَاضَعَ أَحَدٌ لِلَّهِ إِلَّا رَفَعَهُ اللَّهُ»
                  </p>
                  <span className="text-[10px] text-[#C4B998] block font-mono">
                    [صحيح مسلم: ٢٥٨٨]
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#12100B] border border-[#C8A24A]/30 space-y-1 text-right">
                  <p className="text-xs text-white leading-relaxed">
                    قال رسول الله ﷺ: «الصَّدَقَةُ تُطْفِئُ الْخَطِيئَةَ كَمَا يُطْفِئُ الْمَاءُ
                    النَّارَ»
                  </p>
                  <span className="text-[10px] text-[#C4B998] block font-mono">
                    [سنن الترمذي: ٦١٤ وصححه الألباني]
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#12100B] border border-[#C8A24A]/30 space-y-1 text-right">
                  <p className="text-xs text-white leading-relaxed">
                    قال رسول الله ﷺ: «كُلُّ امْرِئٍ فِي ظِلِّ صَدَقَتِهِ حَتَّى يُفْصَلَ بَيْنَ
                    النَّاسِ»
                  </p>
                  <span className="text-[10px] text-[#C4B998] block font-mono">
                    [مسند أحمد وصححه الحاكم ووافقه الذهبي]
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#12100B] border border-[#C8A24A]/30 space-y-1 text-right">
                  <p className="text-xs text-white leading-relaxed">
                    قال رسول الله ﷺ: «صَدَقَةُ السِّرِّ تُطْفِئُ غَضَبَ الرَّبِّ، وَصِلَةُ الرَّحِمِ
                    تَزِيدُ فِي الْعُمْرِ، وَفِعْلُ الْمَعْرُوفِ يَقِي مَصَارِعَ السَّوْءِ»
                  </p>
                  <span className="text-[10px] text-[#C4B998] block font-mono">
                    [رواه الطبراني وحسنه الألباني]
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 3: CALCULATOR (الحاسبة الذكية بعد فضلها وأجرها)
             ===================================================================== */}
          {activeTab === 'calculator' && (
            <div className="space-y-3.5 animate-fadeIn">
              {/* Calculator Subcategory Selector */}
              <div className="flex items-center gap-1.5 p-1 bg-[#12100B] rounded-2xl border border-[#C8A24A]/35 text-[11px]">
                <button
                  type="button"
                  onClick={() => setCalcCategory('wealth_gold')}
                  className={`flex-1 py-2 px-2 rounded-xl font-bold transition-all ${
                    calcCategory === 'wealth_gold'
                      ? 'bg-[#262012] border border-[#E6C66E]/60 text-[#F3E5AB]'
                      : 'text-[#C4B998] hover:text-white'
                  }`}
                >
                  المال والذهب والمدخرات
                </button>
                <button
                  type="button"
                  onClick={() => setCalcCategory('fitr')}
                  className={`flex-1 py-2 px-2 rounded-xl font-bold transition-all ${
                    calcCategory === 'fitr'
                      ? 'bg-[#262012] border border-[#E6C66E]/60 text-[#F3E5AB]'
                      : 'text-[#C4B998] hover:text-white'
                  }`}
                >
                  زكاة الفطر
                </button>
                <button
                  type="button"
                  onClick={() => setCalcCategory('crops')}
                  className={`flex-1 py-2 px-2 rounded-xl font-bold transition-all ${
                    calcCategory === 'crops'
                      ? 'bg-[#262012] border border-[#E6C66E]/60 text-[#F3E5AB]'
                      : 'text-[#C4B998] hover:text-white'
                  }`}
                >
                  الزروع والثمار
                </button>
              </div>

              {/* Currency Selector Bar */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#12100B] border border-[#C8A24A]/25 text-[11px]">
                <span className="text-[#C4B998] font-bold">عملة الحساب:</span>
                <div className="flex items-center gap-1">
                  {CURRENCIES.map((cur) => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => setCurrencyLabel(cur)}
                      className={`px-2 py-0.5 rounded-lg font-bold transition-all border ${
                        currencyLabel === cur
                          ? 'bg-[#E6C66E] text-[#070707] border-[#FFF2C2]'
                          : 'bg-[#18140D] text-[#C4B998] border-[#C8A24A]/25 hover:text-white'
                      }`}
                    >
                      {cur}
                    </button>
                  ))}
                </div>
              </div>

              {celebratedMsg && (
                <div className="p-3 rounded-xl bg-[#221D12] border border-[#E6C66E]/60 text-[#F3E5AB] text-xs font-bold flex items-center gap-2 animate-slideDown shadow">
                  <CheckCircle2 size={16} className="text-[#E6C66E] shrink-0" />
                  <span>{celebratedMsg}</span>
                </div>
              )}

              {/* 3A. WEALTH & GOLD CALCULATOR */}
              {calcCategory === 'wealth_gold' && (
                <div className="space-y-3">
                  {/* Summary Result Card */}
                  <div
                    className={`p-4 rounded-2xl border space-y-2.5 transition-all ${
                      isNisabReached
                        ? 'bg-gradient-to-br from-[#241E12] via-[#16130B] to-[#0D0B08] border-[#E6C66E]/70 shadow-[0_4px_25px_rgba(200,162,74,0.22)]'
                        : 'bg-[#12100B] border-[#C8A24A]/35'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#E6C66E] flex items-center gap-1.5">
                        <Scale size={14} />
                        <span>مقدار الزكاة الواجبة (٢.٥٪):</span>
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          isNisabReached
                            ? 'bg-[#C8A24A]/25 text-[#F3E5AB] border-[#E6C66E]/60'
                            : 'bg-[#18140D] text-[#C4B998] border-[#C8A24A]/30'
                        }`}
                      >
                        {isNisabReached ? 'بلغ النصاب الشرعي وجبت الزكاة ✓' : 'دون النصاب الشرعي'}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <div className="text-2xl sm:text-3xl font-black text-[#F3E5AB] font-mono tabular-nums">
                        {zakatDueWealth.toLocaleString('ar-EG', { maximumFractionDigits: 2 })}
                        <span className="text-xs text-[#E6C66E] font-sans mr-1.5">
                          {currencyLabel}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#C4B998] text-left">
                        صافي الوعاء:
                        <strong className="text-white font-mono mr-1">
                          {netZakatableWealth.toLocaleString('ar-EG', {
                            maximumFractionDigits: 0,
                          })}{' '}
                          {currencyLabel}
                        </strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#C8A24A]/20 flex items-center justify-between text-[10px] text-[#C4B998]">
                      <span>قيمة النصاب الشرعي (٨٥ جم ذهب عيار ٢٤):</span>
                      <span className="font-mono text-[#E6C66E] font-bold">
                        {nisabThresholdValue.toLocaleString('ar-EG', { maximumFractionDigits: 0 })}{' '}
                        {currencyLabel}
                      </span>
                    </div>
                  </div>

                  {/* Input Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="bg-[#12100B] border border-[#C8A24A]/30 rounded-2xl p-3 space-y-1">
                      <label className="text-[11px] font-extrabold text-[#F3E5AB] block">
                        ١. النقد والمدخرات البنكية
                      </label>
                      <span className="text-[10px] text-[#C4B998] block">
                        سيولة بحسابك أو بالمنزل حال عليها الحول
                      </span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={cashSavings}
                        onChange={(e) => setCashSavings(e.target.value)}
                        className="w-full mt-1 bg-[#080705] border border-[#C8A24A]/40 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#E6C66E]"
                      />
                    </div>

                    <div className="bg-[#12100B] border border-[#C8A24A]/30 rounded-2xl p-3 space-y-1">
                      <label className="text-[11px] font-extrabold text-[#F3E5AB] block">
                        ٢. عروض التجارة والأسهم الاستثمارية
                      </label>
                      <span className="text-[10px] text-[#C4B998] block">
                        القيمة السوقية للبضائع والأسهم للتجارة
                      </span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={investmentsAndTrade}
                        onChange={(e) => setInvestmentsAndTrade(e.target.value)}
                        className="w-full mt-1 bg-[#080705] border border-[#C8A24A]/40 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#E6C66E]"
                      />
                    </div>

                    <div className="bg-[#12100B] border border-[#C8A24A]/30 rounded-2xl p-3 space-y-1">
                      <label className="text-[11px] font-extrabold text-[#E6C66E] block">
                        ٣. وزن الذهب المدخر عيار ٢٤ (جرام)
                      </label>
                      <span className="text-[10px] text-[#C4B998] block">
                        السبائك والذهب الخالص عيار ٢٤
                      </span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={goldGrams24}
                        onChange={(e) => setGoldGrams24(e.target.value)}
                        className="w-full mt-1 bg-[#080705] border border-[#C8A24A]/40 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#E6C66E]"
                      />
                    </div>

                    <div className="bg-[#12100B] border border-[#C8A24A]/30 rounded-2xl p-3 space-y-1">
                      <label className="text-[11px] font-extrabold text-[#E6C66E] block">
                        ٤. وزن الذهب عيار ٢١ (جرام)
                      </label>
                      <span className="text-[10px] text-[#C4B998] block">
                        يُعادل تلقائياً بنسبة نقاء (٢١/٢٤)
                      </span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={goldGrams21}
                        onChange={(e) => setGoldGrams21(e.target.value)}
                        className="w-full mt-1 bg-[#080705] border border-[#C8A24A]/40 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#E6C66E]"
                      />
                    </div>

                    <div className="bg-[#12100B] border border-[#C8A24A]/30 rounded-2xl p-3 space-y-1">
                      <label className="text-[11px] font-extrabold text-[#F3E5AB] block">
                        ٥. سعر جرام الذهب عيار ٢٤ اليوم
                      </label>
                      <span className="text-[10px] text-[#C4B998] block">
                        لتحديد قيمة النصاب الشرعي بدقة
                      </span>
                      <input
                        type="number"
                        min="1"
                        placeholder="3800"
                        value={goldGramPrice24}
                        onChange={(e) => setGoldGramPrice24(e.target.value)}
                        className="w-full mt-1 bg-[#080705] border border-[#C8A24A]/40 rounded-xl px-3 py-2 text-xs font-mono text-[#E6C66E] focus:outline-none focus:border-[#E6C66E]"
                      />
                    </div>

                    <div className="bg-[#12100B] border border-[#C8A24A]/30 rounded-2xl p-3 space-y-1">
                      <label className="text-[11px] font-extrabold text-rose-300 block">
                        ٦. الديون الحالّة الواجبة السداد
                      </label>
                      <span className="text-[10px] text-[#C4B998] block">
                        تُخصم من إجمالي المال قبل الاحتساب
                      </span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={debtsOwedByUser}
                        onChange={(e) => setDebtsOwedByUser(e.target.value)}
                        className="w-full mt-1 bg-[#080705] border border-[#C8A24A]/40 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-rose-400"
                      />
                    </div>
                  </div>

                  {zakatDueWealth > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        handleCelebrateZakat(
                          'تقبّل الله زكاة مالك، وطهّر بها نفسك، وبارك في أهلك ورزقك وخلف عليك خيراً ✓'
                        )
                      }
                      className="athar-btn-primary w-full py-3 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow"
                    >
                      <CheckCircle2 size={15} />
                      <span>احتساب بنيّة أداء الفريضة</span>
                    </button>
                  )}
                </div>
              )}

              {/* 3B. ZAKAT AL-FITR CALCULATOR */}
              {calcCategory === 'fitr' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="p-4 rounded-2xl bg-[#14110A] border border-[#C8A24A]/45 space-y-2">
                    <span className="text-xs font-extrabold text-[#E6C66E] flex items-center gap-1.5">
                      <Users size={14} />
                      <span>حاسبة زكاة الفطر المباركة:</span>
                    </span>
                    <div className="flex items-baseline justify-between pt-1">
                      <div className="text-2xl sm:text-3xl font-black text-[#F3E5AB] font-mono tabular-nums">
                        {zakatDueFitr.toLocaleString('ar-EG')}
                        <span className="text-xs text-[#E6C66E] font-sans mr-1.5">
                          {currencyLabel}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#C4B998]">
                        عن عدد: <strong className="text-white">{numMembers} أفراد</strong>
                      </div>
                    </div>
                    <p className="text-[10px] text-[#C4B998] leading-relaxed pt-1 border-t border-[#C8A24A]/20">
                      تخرج عن الصائم ومَن تلزمه نفقته (الزوجة والأولاد) قبل صلاة العيد صاعاً من طعام
                      أو قيمته نقداً.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="bg-[#12100B] border border-[#C8A24A]/30 rounded-2xl p-3 space-y-1">
                      <label className="text-[11px] font-extrabold text-[#F3E5AB] block">
                        عدد أفراد الأسرة المكفولين
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={familyMembersCount}
                        onChange={(e) => setFamilyMembersCount(e.target.value)}
                        className="w-full mt-1 bg-[#080705] border border-[#C8A24A]/40 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#E6C66E]"
                      />
                    </div>

                    <div className="bg-[#12100B] border border-[#C8A24A]/30 rounded-2xl p-3 space-y-1">
                      <label className="text-[11px] font-extrabold text-[#F3E5AB] block">
                        قيمة الفطرة المعتمدة للفرد ({currencyLabel})
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={fitrCostPerPerson}
                        onChange={(e) => setFitrCostPerPerson(e.target.value)}
                        className="w-full mt-1 bg-[#080705] border border-[#C8A24A]/40 rounded-xl px-3 py-2 text-xs font-mono text-[#E6C66E] focus:outline-none focus:border-[#E6C66E]"
                      />
                    </div>
                  </div>

                  {zakatDueFitr > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        handleCelebrateZakat(
                          `تقبّل الله زكاة الفطر عنك وعن أسرتك (${numMembers} أفراد) وجعلها طهرة مقبولة ✓`
                        )
                      }
                      className="athar-btn-primary w-full py-3 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow"
                    >
                      <CheckCircle2 size={15} />
                      <span>احتساب بنيّة إخراج زكاة الفطر</span>
                    </button>
                  )}
                </div>
              )}

              {/* 3C. ZAKAT ON CROPS CALCULATOR */}
              {calcCategory === 'crops' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="p-4 rounded-2xl bg-[#14110A] border border-[#C8A24A]/45 space-y-2">
                    <span className="text-xs font-extrabold text-[#E6C66E] flex items-center gap-1.5">
                      <Wheat size={14} />
                      <span>
                        حاسبة زكاة الزروع والثمار ({irrigationType === 'rain' ? '١٠٪' : '٥٪'}):
                      </span>
                    </span>
                    <div className="flex items-baseline justify-between pt-1">
                      <div className="text-2xl sm:text-3xl font-black text-[#F3E5AB] font-mono tabular-nums">
                        {zakatDueCrop.toLocaleString('ar-EG', { maximumFractionDigits: 1 })}
                        <span className="text-xs text-[#E6C66E] font-sans mr-1.5">
                          {currencyLabel}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#C4B998]">
                        نسبة الواجب: {irrigationType === 'rain' ? 'العُشر (١٠٪)' : 'نصف العُشر (٥٪)'}
                      </div>
                    </div>
                    <p className="text-[10px] text-[#C4B998] leading-relaxed pt-1 border-t border-[#C8A24A]/20">
                      تخرج عند الحصاد إذا بلغ المحصول النصاب (٥ أوسق ≈ ٦٥٣ كجم من الحبوب والثمار
                      المدخرة).
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <div className="bg-[#12100B] border border-[#C8A24A]/30 rounded-2xl p-3 space-y-1">
                      <label className="text-[11px] font-extrabold text-[#F3E5AB] block">
                        إجمالي القيمة أو وزن المحصول ({currencyLabel} أو كجم)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={cropValue}
                        onChange={(e) => setCropValue(e.target.value)}
                        className="w-full mt-1 bg-[#080705] border border-[#C8A24A]/40 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#E6C66E]"
                      />
                    </div>

                    <div className="bg-[#12100B] border border-[#C8A24A]/30 rounded-2xl p-3 space-y-2">
                      <span className="text-[11px] font-extrabold text-[#F3E5AB] block">
                        طريقة الري المعتمدة:
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setIrrigationType('rain')}
                          className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                            irrigationType === 'rain'
                              ? 'bg-[#262012] border-[#E6C66E] text-[#F3E5AB]'
                              : 'bg-[#090806] border-[#C8A24A]/25 text-[#C4B998]'
                          }`}
                        >
                          بماء السماء والأنهار (١٠٪)
                        </button>
                        <button
                          type="button"
                          onClick={() => setIrrigationType('artificial')}
                          className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                            irrigationType === 'artificial'
                              ? 'bg-[#262012] border-[#E6C66E] text-[#F3E5AB]'
                              : 'bg-[#090806] border-[#C8A24A]/25 text-[#C4B998]'
                          }`}
                        >
                          بآلات ووسائل تكلفة (٥٪)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
