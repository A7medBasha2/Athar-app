import React, { useState } from 'react';
import { NavigationTab } from '../types';
import {
  ISLAMIC_FATWAS,
  ISLAMIC_ARTICLES,
  LUXURY_IMAGES,
  IslamicArticleItem,
} from '../data/storiesAndExploreData';
import { ALL_SURAHS, VERIFIED_RECITERS } from '../data/surahsData';
import { AudioService } from '../services/audioService';
import { StorageService } from '../services/storageService';
import {
  ChevronRight,
  ChevronLeft,
  BookOpen,
  HelpCircle,
  FileText,
  Compass,
  Play,
  Sparkles,
  HeartHandshake,
  Trophy,
  Landmark,
  ShieldCheck,
  X,
  Volume2,
  AlarmClock,
} from 'lucide-react';
import { AlarmService } from '../services/alarmService';
import { LocalAtharPulseCard } from '../components/LocalAtharPulseCard';

export type ExploreSubView = 'main' | 'quran_library' | 'fatwas' | 'articles' | 'tools' | 'area_radar';

interface ExploreViewProps {
  initialSubView?: ExploreSubView;
  onSubViewChange?: (subView: ExploreSubView) => void;
  onNavigate: (tab: NavigationTab) => void;
  onSelectSurah: (surahNumber: number, ayahNumber?: number) => void;
  onOpenTasbih: () => void;
  onOpenZakat: () => void;
  onOpenSakina: () => void;
  onOpenAchievements: () => void;
  onOpenSplashPreview: () => void;
  onOpenAlarm: () => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  initialSubView = 'main',
  onSubViewChange,
  onNavigate,
  onSelectSurah,
  onOpenTasbih,
  onOpenZakat,
  onOpenSakina,
  onOpenAchievements,
  onOpenSplashPreview,
  onOpenAlarm,
}) => {
  const [subView, setSubViewState] = useState<ExploreSubView>(initialSubView);

  const setSubView = (next: ExploreSubView) => {
    setSubViewState(next);
    if (onSubViewChange) onSubViewChange(next);
  };
  const [selectedReciterId, setSelectedReciterId] = useState<string>(
    () => StorageService.getSettings().selectedReciterId || 'alafasy'
  );
  const [selectedFatwaCat, setSelectedFatwaCat] = useState<string>('الكل');
  const [activeArticle, setActiveArticle] = useState<IslamicArticleItem | null>(null);
  const [playingSurahNum, setPlayingSurahNum] = useState<number | null>(null);
  const upcomingAlarm = AlarmService.getNextUpcomingAlarmInfo();

  const featuredSurahs = [1, 2, 18, 36, 55, 56, 67, 112, 113, 114].map(
    (num) => ALL_SURAHS.find((s) => s.number === num)!
  );

  const handlePlaySurahQuick = async (surahNumber: number) => {
    setPlayingSurahNum(surahNumber);
    const s = StorageService.getSettings();
    s.selectedReciterId = selectedReciterId;
    StorageService.saveSettings(s);
    await AudioService.playQuranContinuous(surahNumber, 1, selectedReciterId);
  };

  return (
    <div className="athar-page-container text-right">
      {/* Top Luxury Header (Matches Reference Showcase) */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#C8A24A]/25">
        <button
          onClick={() => {
            if (activeArticle) {
              setActiveArticle(null);
            } else if (subView !== 'main') {
              setSubView('main');
            } else {
              onNavigate('home');
            }
          }}
          className="w-9 h-9 rounded-xl bg-[#14120E] border border-[#C8A24A]/35 flex items-center justify-center text-[#E6C66E] hover:bg-[#1E1B14] transition-colors"
          aria-label="رجوع"
        >
          <ChevronRight size={18} />
        </button>

        <h1 className="text-base font-extrabold text-[#F3E5AB] tracking-wide">
          {subView === 'main'
            ? 'الاستكشاف'
            : subView === 'area_radar'
            ? 'رادار الأثر الحي في منطقتك'
            : subView === 'quran_library'
            ? 'مكتبة القرآن والتلاوات'
            : subView === 'fatwas'
            ? 'الفتاوى والأحكام الميسرة'
            : subView === 'articles'
            ? 'مقالات ونفحات إسلامية'
            : 'الأدوات الإسلامية المتكاملة'}
        </h1>

        <div className="w-9" />
      </div>

      {subView === 'main' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Royal Islamic Sanctuary Banner ("وما توفيقي إلا بالله") */}
          <div className="relative w-full h-52 rounded-3xl overflow-hidden border border-[#C8A24A]/55 shadow-[0_12px_35px_rgba(0,0,0,0.9)]">
            <img
              src={LUXURY_IMAGES.exploreSanctuary}
              alt="الصرح الإسلامي الملكي"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-[#070707]/45 to-transparent" />

            {/* Decorative Golden Arch Border Overlay */}
            <div className="absolute inset-2.5 rounded-2xl border border-[#E6C66E]/30 pointer-events-none" />

            <div className="absolute bottom-4 inset-x-4 text-center space-y-1">
              <p className="font-quran text-2xl sm:text-3xl font-bold text-[#F3E5AB] drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
                "وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ"
              </p>
              <span className="text-[11px] text-[#C4B998] block">
                واحة العلم والتلاوات والأدوات الروحانية اليومية
              </span>
            </div>
          </div>

          {/* Main Luxury Black & Gold Cards with Comfortable Spacing */}
          <div className="space-y-3.5">
            {/* Featured Quick Card: المنبه الإسلامي ومنبه الفجر */}
            <button
              onClick={onOpenAlarm}
              className="w-full group rounded-2xl bg-gradient-to-l from-[#221C10] via-[#15120B] to-[#0D0C09] border border-[#E6C66E]/55 hover:border-[#F3E5AB] p-3.5 flex items-center justify-between transition-all active:scale-[0.99] shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#282112] border border-[#E6C66E]/65 flex items-center justify-center text-[#E6C66E] group-hover:scale-105 transition-transform shadow-inner shrink-0">
                  <AlarmClock size={20} />
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-extrabold text-[#F3E5AB] group-hover:text-white transition-colors">
                      المنبه الإسلامي ومنبه الفجر
                    </h3>
                    {upcomingAlarm && (
                      <span className="px-2 py-0.5 rounded-full bg-[#C8A24A]/20 border border-[#E6C66E]/50 text-[10px] font-extrabold text-[#E6C66E] tabular-nums">
                        {upcomingAlarm.formattedTime12}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#C4B998] mt-1 leading-relaxed">
                    استيقظ على نداء «الصلاة خير من النوم» المتكرر وآيات القيام
                  </p>
                </div>
              </div>
              <ChevronLeft size={17} className="text-[#E6C66E] shrink-0" />
            </button>

            {/* 1. مكتبة القرآن */}
            <button
              onClick={() => setSubView('quran_library')}
              className="w-full group rounded-2xl bg-gradient-to-l from-[#171510] via-[#12100C] to-[#0D0C09] border border-[#C8A24A]/35 hover:border-[#E6C66E] p-3.5 flex items-center justify-between transition-all active:scale-[0.99] shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#1C1810] border border-[#C8A24A]/50 flex items-center justify-center text-[#E6C66E] group-hover:scale-105 transition-transform shadow-inner shrink-0">
                  <BookOpen size={20} />
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-extrabold text-white group-hover:text-[#E6C66E] transition-colors">
                    مكتبة القرآن
                  </h3>
                  <p className="text-[11px] text-[#C4B998] mt-1 leading-relaxed">
                    صوتيات وتلاوات مميزة لكبار القراء
                  </p>
                </div>
              </div>
              <ChevronLeft size={17} className="text-[#C8A24A] shrink-0" />
            </button>

            {/* 2. الفتاوى */}
            <button
              onClick={() => setSubView('fatwas')}
              className="w-full group rounded-2xl bg-gradient-to-l from-[#171510] via-[#12100C] to-[#0D0C09] border border-[#C8A24A]/35 hover:border-[#E6C66E] p-3.5 flex items-center justify-between transition-all active:scale-[0.99] shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#1C1810] border border-[#C8A24A]/50 flex items-center justify-center text-[#E6C66E] group-hover:scale-105 transition-transform shadow-inner shrink-0">
                  <HelpCircle size={20} />
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-extrabold text-white group-hover:text-[#E6C66E] transition-colors">
                    الفتاوى
                  </h3>
                  <p className="text-[11px] text-[#C4B998] mt-1 leading-relaxed">
                    أسئلتك .. وإجاباتها الموثقة الميسرة
                  </p>
                </div>
              </div>
              <ChevronLeft size={17} className="text-[#C8A24A] shrink-0" />
            </button>

            {/* 3. مقالات إسلامية */}
            <button
              onClick={() => setSubView('articles')}
              className="w-full group rounded-2xl bg-gradient-to-l from-[#171510] via-[#12100C] to-[#0D0C09] border border-[#C8A24A]/35 hover:border-[#E6C66E] p-3.5 flex items-center justify-between transition-all active:scale-[0.99] shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#1C1810] border border-[#C8A24A]/50 flex items-center justify-center text-[#E6C66E] group-hover:scale-105 transition-transform shadow-inner shrink-0">
                  <FileText size={20} />
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-extrabold text-white group-hover:text-[#E6C66E] transition-colors">
                    مقالات إسلامية
                  </h3>
                  <p className="text-[11px] text-[#C4B998] mt-1 leading-relaxed">
                    كل ما يهم المسلم في تزكية القلب والعمل
                  </p>
                </div>
              </div>
              <ChevronLeft size={17} className="text-[#C8A24A] shrink-0" />
            </button>

            {/* 4. أدوات إسلامية */}
            <button
              onClick={() => setSubView('tools')}
              className="w-full group rounded-2xl bg-gradient-to-l from-[#171510] via-[#12100C] to-[#0D0C09] border border-[#C8A24A]/35 hover:border-[#E6C66E] p-3.5 flex items-center justify-between transition-all active:scale-[0.99] shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#1C1810] border border-[#C8A24A]/50 flex items-center justify-center text-[#E6C66E] group-hover:scale-105 transition-transform shadow-inner shrink-0">
                  <Compass size={20} />
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-extrabold text-white group-hover:text-[#E6C66E] transition-colors">
                    أدوات إسلامية
                  </h3>
                  <p className="text-[11px] text-[#C4B998] mt-1 leading-relaxed">
                    المنبه الإسلامي - قبلة - زكاة - سبحة - واحة السكينة - إنجازات
                  </p>
                </div>
              </div>
              <ChevronLeft size={17} className="text-[#C8A24A] shrink-0" />
            </button>
          </div>

          {/* الأثر الحي في منطقتك (Local Athar Pulse) - في آخر صفحة استكشف */}
          <LocalAtharPulseCard
            onNavigate={onNavigate}
            onOpenTasbih={onOpenTasbih}
            onOpenSakina={onOpenSakina}
            isExpandedView={false}
            onToggleExpandedView={(open) => setSubView(open ? 'area_radar' : 'main')}
          />
        </div>
      )}

      {/* SUBVIEW: AREA RADAR (رادار الأثر الحي في منطقتك) */}
      {subView === 'area_radar' && (
        <div className="animate-fadeIn">
          <LocalAtharPulseCard
            onNavigate={onNavigate}
            onOpenTasbih={onOpenTasbih}
            onOpenSakina={onOpenSakina}
            isExpandedView={true}
            onToggleExpandedView={(open) => setSubView(open ? 'area_radar' : 'main')}
          />
        </div>
      )}

      {/* SUBVIEW 1: QURAN AUDIO LIBRARY */}
      {subView === 'quran_library' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="athar-card space-y-3">
            <h3 className="text-sm font-extrabold text-[#E6C66E] flex items-center gap-2">
              <Volume2 size={16} />
              <span>اختر القارئ المفضل للاستماع الفوري</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {VERIFIED_RECITERS.map((reciter) => {
                const isSelected = selectedReciterId === reciter.id;
                return (
                  <button
                    key={reciter.id}
                    onClick={() => setSelectedReciterId(reciter.id)}
                    className={`p-3 rounded-xl border text-xs font-bold text-right flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-[#C8A24A] text-[#070707] border-[#F3E5AB] shadow'
                        : 'bg-[#0E0D0A] text-white border-[#C8A24A]/25 hover:border-[#C8A24A]/60'
                    }`}
                  >
                    <span className="truncate">{reciter.nameArabic}</span>
                    {isSelected && <span className="text-[10px] font-extrabold">مختار ✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2.5">
            <h3 className="text-xs font-extrabold text-[#C4B998] px-1">
              السور الأكثر استماعاً وتدبراً
            </h3>
            {featuredSurahs.map((surah) => (
              <div
                key={surah.number}
                className="p-3.5 rounded-2xl bg-[#12110E] border border-[#C8A24A]/30 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1C1810] border border-[#C8A24A]/45 flex items-center justify-center text-xs font-extrabold text-[#E6C66E] font-mono">
                    {surah.number}
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white">سورة {surah.name}</h4>
                    <span className="text-[11px] text-[#C4B998]">
                      {surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} · {surah.numberOfAyahs} آية
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePlaySurahQuick(surah.number)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                      playingSurahNum === surah.number
                        ? 'bg-[#E6C66E] text-[#070707]'
                        : 'bg-[#C8A24A] hover:bg-[#E6C66E] text-[#070707]'
                    }`}
                  >
                    <Play size={13} fill="currentColor" />
                    <span>تلاوة</span>
                  </button>
                  <button
                    onClick={() => onSelectSurah(surah.number, 1)}
                    className="px-3 py-1.5 rounded-xl bg-[#1A1710] hover:bg-[#242016] text-[#E6C66E] border border-[#C8A24A]/35 text-xs font-bold"
                  >
                    المصحف
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBVIEW 2: FATWAS */}
      {subView === 'fatwas' && (
        <div className="space-y-3.5 animate-fadeIn">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {['الكل', 'الصلاة والطهارة', 'القرآن والأذكار', 'الصيام', 'الزكاة والصدقات'].map(
              (cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedFatwaCat(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap border transition-all ${
                    selectedFatwaCat === cat
                      ? 'bg-[#C8A24A] text-[#070707] border-[#F3E5AB]'
                      : 'bg-[#12110E] text-[#C4B998] border-[#C8A24A]/25'
                  }`}
                >
                  {cat}
                </button>
              )
            )}
          </div>

          <div className="space-y-3">
            {ISLAMIC_FATWAS.filter(
              (f) => selectedFatwaCat === 'الكل' || f.category === selectedFatwaCat
            ).map((fatwa) => (
              <div
                key={fatwa.id}
                className="athar-card space-y-2.5 border border-[#C8A24A]/30"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#C8A24A]/15 border border-[#C8A24A]/40 text-[#E6C66E] text-[10px] font-extrabold">
                    {fatwa.category}
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-white leading-relaxed">
                  س: {fatwa.question}
                </h3>
                <p className="text-xs text-[#E2E8F0] leading-relaxed bg-[#0B0A08] p-3 rounded-xl border border-[#C8A24A]/20">
                  <strong className="text-[#E6C66E]">الجواب: </strong>
                  {fatwa.answer}
                </p>
                <div className="text-[11px] text-[#C4B998] pt-1">
                  <strong className="text-[#C8A24A]">الدليل: </strong>
                  {fatwa.evidence}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBVIEW 3: ARTICLES */}
      {subView === 'articles' && (
        <div className="space-y-3 animate-fadeIn">
          {ISLAMIC_ARTICLES.map((art) => (
            <button
              key={art.id}
              onClick={() => setActiveArticle(art)}
              className="w-full athar-card text-right space-y-2 hover:border-[#E6C66E] transition-all"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="px-2.5 py-0.5 rounded-full bg-[#C8A24A]/15 border border-[#C8A24A]/40 text-[#E6C66E] font-bold">
                  {art.category}
                </span>
                <span className="text-[#C4B998] font-semibold">{art.readingTime}</span>
              </div>
              <h3 className="text-sm font-extrabold text-white">{art.title}</h3>
              <p className="text-xs text-[#C4B998]">{art.subtitle}</p>
            </button>
          ))}
        </div>
      )}

      {/* SUBVIEW 4: ISLAMIC TOOLS HUB */}
      {subView === 'tools' && (
        <div className="grid grid-cols-2 gap-3 animate-fadeIn">
          {/* Featured Tool: المنبه الإسلامي ومنبه الفجر */}
          <button
            onClick={onOpenAlarm}
            className="col-span-2 athar-card-gold text-right p-4 flex items-center justify-between gap-3 hover:border-[#F3E5AB] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#241E11] border border-[#E6C66E]/60 flex items-center justify-center text-[#E6C66E] shrink-0">
                <AlarmClock size={22} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#F3E5AB]">
                  المنبه الإسلامي ومنبه الفجر الذكي
                </h3>
                <p className="text-[11px] text-[#C4B998] mt-0.5">
                  تكرار «الصلاة خير من النوم» وآيات الاستيقاظ وتحديات اليقظة
                </p>
              </div>
            </div>
            <ChevronLeft size={18} className="text-[#E6C66E] shrink-0" />
          </button>

          <button
            onClick={() => onNavigate('qibla')}
            className="athar-card text-right space-y-2 hover:border-[#E6C66E] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1C1810] border border-[#C8A24A]/45 flex items-center justify-center text-[#E6C66E]">
              <Compass size={20} />
            </div>
            <h3 className="text-sm font-extrabold text-white">بوصلة القبلة</h3>
            <p className="text-[11px] text-[#C4B998]">تحديد دقيق للقبلة بالتتبع التلقائي</p>
          </button>

          <button
            onClick={onOpenZakat}
            className="athar-card text-right space-y-2 hover:border-[#E6C66E] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1C1810] border border-[#C8A24A]/45 flex items-center justify-center text-[#E6C66E]">
              <Landmark size={20} />
            </div>
            <h3 className="text-sm font-extrabold text-white">حاسبة الزكاة والصدقات</h3>
            <p className="text-[11px] text-[#C4B998]">حساب النصاب وسجل الصدقات</p>
          </button>

          <button
            onClick={onOpenTasbih}
            className="athar-card text-right space-y-2 hover:border-[#E6C66E] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1C1810] border border-[#C8A24A]/45 flex items-center justify-center text-[#E6C66E]">
              <Sparkles size={20} />
            </div>
            <h3 className="text-sm font-extrabold text-white">المسبحة الإلكترونية</h3>
            <p className="text-[11px] text-[#C4B998]">عداد تسبيح ذكي مع الاهتزاز</p>
          </button>

          <button
            onClick={onOpenSakina}
            className="athar-card text-right space-y-2 hover:border-[#E6C66E] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1C1810] border border-[#C8A24A]/45 flex items-center justify-center text-[#E6C66E]">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-sm font-extrabold text-white">واحة السكينة والحقوق</h3>
            <p className="text-[11px] text-[#C4B998]">تدبر وصلة رحم وحفظ الحقوق</p>
          </button>

          <button
            onClick={() => onNavigate('companion')}
            className="athar-card text-right space-y-2 hover:border-[#E6C66E] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1C1810] border border-[#C8A24A]/45 flex items-center justify-center text-[#E6C66E]">
              <HeartHandshake size={20} />
            </div>
            <h3 className="text-sm font-extrabold text-white">رفيق أثر</h3>
            <p className="text-[11px] text-[#C4B998]">رفيقك الإيماني حسب حالتك الشعورية</p>
          </button>

          <button
            onClick={onOpenAchievements}
            className="athar-card text-right space-y-2 hover:border-[#E6C66E] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1C1810] border border-[#C8A24A]/45 flex items-center justify-center text-[#E6C66E]">
              <Trophy size={20} />
            </div>
            <h3 className="text-sm font-extrabold text-white">سجل الإنجازات</h3>
            <p className="text-[11px] text-[#C4B998]">متابعة الختمة والصلوات والأوسمة</p>
          </button>

          <button
            onClick={onOpenSplashPreview}
            className="col-span-2 athar-card-gold text-right flex items-center justify-between"
          >
            <div>
              <h3 className="text-sm font-extrabold text-[#E6C66E]">
                عرض شاشة الترحيب الملكية (المسجد والهلال الذهبي)
              </h3>
              <p className="text-[11px] text-[#C4B998] mt-0.5">
                «قربك من الله بداية لحياة أجمل»
              </p>
            </div>
            <ChevronLeft size={18} className="text-[#E6C66E]" />
          </button>
        </div>
      )}

      {/* Article Reader Modal */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-[#0D0C09] border border-[#C8A24A]/50 rounded-3xl p-5 space-y-4 text-right shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
              <span className="text-xs font-extrabold text-[#E6C66E]">
                {activeArticle.category}
              </span>
              <button
                onClick={() => setActiveArticle(null)}
                className="p-1.5 rounded-xl bg-[#171510] text-white hover:text-[#E6C66E]"
              >
                <X size={16} />
              </button>
            </div>

            <h3 className="text-base font-extrabold text-white">
              {activeArticle.title}
            </h3>

            <div className="p-3 rounded-xl bg-[#16130C] border border-[#C8A24A]/35 text-center font-quran text-lg text-[#E6C66E]">
              {activeArticle.quote}
            </div>

            <div className="space-y-2.5 text-xs text-white/95 leading-relaxed">
              {activeArticle.content.map((p, i) => (
                <p key={i} className="p-3 rounded-xl bg-[#12110E] border border-[#C8A24A]/20">
                  {p}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
