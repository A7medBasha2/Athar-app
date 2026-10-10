import React, { useState, useEffect } from 'react';
import { AudioService, ActiveAudioState } from '../services/audioService';
import { QuranService } from '../services/quranService';
import { StorageService } from '../services/storageService';
import { VERIFIED_RECITERS } from '../data/surahsData';
import { ShareCardModal, ShareCardPayload } from './ShareCardModal';
import {
  X, Moon, Search, Image as ImageIcon, Play, Pause, BookOpen,
  Repeat, Sparkles
} from 'lucide-react';

export type ToolkitTabType =
  | 'sleep_timer'
  | 'ayah_search'
  | 'share_card'
  | 'sleep_repeat'
  | 'search'
  | 'share_studio';

interface SpiritualToolkitModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: ToolkitTabType;
  onOpenSurahAyah?: (surahNumber: number, ayahNumber: number) => void;
  onSelectSurah?: (surahNumber: number, ayahNumber?: number) => void;
  initialSharePayload?: ShareCardPayload | null;
  dailyVersePayload?: ShareCardPayload;
  dailyHadithPayload?: ShareCardPayload;
}

const normalizeTab = (t?: ToolkitTabType): 'sleep_timer' | 'ayah_search' | 'share_card' => {
  if (t === 'ayah_search' || t === 'search') return 'ayah_search';
  if (t === 'share_card' || t === 'share_studio') return 'share_card';
  return 'sleep_timer';
};

export const SpiritualToolkitModal: React.FC<SpiritualToolkitModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'sleep_timer',
  onOpenSurahAyah,
  onSelectSurah,
  initialSharePayload = null,
  dailyVersePayload,
  dailyHadithPayload
}) => {
  const [activeTab, setActiveTab] = useState<'sleep_timer' | 'ayah_search' | 'share_card'>(normalizeTab(initialTab));
  const [audioState, setAudioState] = useState<ActiveAudioState | null>(null);
  const [sleepTimerState, setSleepTimerState] = useState(AudioService.getSleepTimerState());
  const [repeatState, setRepeatState] = useState(AudioService.getAyahRepeatState());

  // Ayah Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<{ surahNumber: number; ayahNumber: number; text: string; surahName: string }[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [playingResultKey, setPlayingResultKey] = useState<string | null>(null);

  // Share Card Sub-modal
  const [isShareCardModalOpen, setIsShareCardModalOpen] = useState<boolean>(false);
  const [sharePayload, setSharePayload] = useState<ShareCardPayload | null>(initialSharePayload);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(normalizeTab(initialTab));
      setSleepTimerState(AudioService.getSleepTimerState());
      setRepeatState(AudioService.getAyahRepeatState());
      if (initialSharePayload) {
        setSharePayload(initialSharePayload);
      }
    }
  }, [isOpen, initialTab, initialSharePayload]);

  useEffect(() => {
    const unsub = AudioService.subscribe((state) => {
      setAudioState(state);
      setSleepTimerState(AudioService.getSleepTimerState());
      setRepeatState(AudioService.getAyahRepeatState());
      if (!state?.isPlaying) {
        setPlayingResultKey(null);
      }
    });
    const timer = setInterval(() => {
      setSleepTimerState(AudioService.getSleepTimerState());
      setRepeatState(AudioService.getAyahRepeatState());
    }, 1000);
    return () => {
      unsub();
      clearInterval(timer);
    };
  }, []);

  if (!isOpen) return null;

  const formatCountdown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleRunSearch = async (queryText: string) => {
    setSearchQuery(queryText);
    if (queryText.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const res = await QuranService.searchQuranText(queryText);
    setSearchResults(res.results);
    setIsSearching(false);
  };

  const handlePlaySearchedAyah = (surahNumber: number, ayahNumber: number) => {
    const key = `${surahNumber}:${ayahNumber}`;
    if (playingResultKey === key && audioState?.isPlaying) {
      AudioService.pause();
      setPlayingResultKey(null);
      return;
    }
    setPlayingResultKey(key);
    const reciterId = StorageService.getSettings().selectedReciterId || VERIFIED_RECITERS[0].id;
    AudioService.playQuranContinuous(surahNumber, ayahNumber, reciterId);
  };

  const quickSearchKeywords = ['الصبر', 'الرحمن', 'طمأنينة', 'الفرج', 'الرزق', 'المغفرة', 'الجنة'];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-xl animate-fadeIn select-none">
        <div className="bg-gradient-to-b from-[#17140D] via-[#0E0D0A] to-[#080705] border-t sm:border border-[#C8A24A]/55 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex flex-col text-right">
          {/* Header */}
          <div className="p-4 border-b border-[#C8A24A]/25 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#1F1A10] border border-[#C8A24A]/50 text-[#E6C66E]">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-[#F3E5AB]">واحة التدبر والاستماع الذكي</h2>
                <p className="text-[10px] text-[#C4B998]">مؤقت النوم التدريجي · تكرار الحفظ · بحث الآيات · البطاقات الدعوية</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#18150E] hover:bg-[#241F14] text-[#C4B998] hover:text-white border border-[#C8A24A]/35"
              aria-label="إغلاق"
            >
              <X size={16} />
            </button>
          </div>

          {/* Segmented Mode Tabs */}
          <div className="px-4 pt-3">
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#14120D] rounded-2xl border border-[#C8A24A]/30 text-xs">
              <button
                onClick={() => setActiveTab('sleep_timer')}
                className={`py-2 px-2 rounded-xl font-extrabold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                  activeTab === 'sleep_timer'
                    ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] shadow'
                    : 'text-[#C4B998] hover:text-white'
                }`}
              >
                <Moon size={13} />
                <span>مؤقت النوم والحفظ</span>
              </button>

              <button
                onClick={() => setActiveTab('ayah_search')}
                className={`py-2 px-2 rounded-xl font-extrabold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                  activeTab === 'ayah_search'
                    ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] shadow'
                    : 'text-[#C4B998] hover:text-white'
                }`}
              >
                <Search size={13} />
                <span>بحث الآيات</span>
              </button>

              <button
                onClick={() => setActiveTab('share_card')}
                className={`py-2 px-2 rounded-xl font-extrabold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                  activeTab === 'share_card'
                    ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] shadow'
                    : 'text-[#C4B998] hover:text-white'
                }`}
              >
                <ImageIcon size={13} />
                <span>بطاقة مصورة</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Smart Sleep Timer with Smooth Volume Fade-Out & Ayah Repeat */}
          {activeTab === 'sleep_timer' && (
            <div className="p-4 space-y-4 text-xs">
              {/* Sleep Timer Section */}
              <div className="bg-[#14120D] border border-[#C8A24A]/35 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-[#C8A24A]/20 border border-[#C8A24A]/45 text-[#E6C66E]">
                      <Moon size={16} />
                    </div>
                    <div>
                      <h3 className="text-xs font-extrabold text-[#F3E5AB]">مؤقت النوم الذكي (مع خفض تدريجي للصوت)</h3>
                      <p className="text-[10px] text-[#C4B998]">يخفض الصوت بهدوء خلال آخر ٣٠ ثانية قبل الإيقاف التلقائي</p>
                    </div>
                  </div>
                  {(sleepTimerState.remainingSeconds !== null || sleepTimerState.stopAtEndOfSurah) && (
                    <span className="text-xs font-extrabold text-[#E6C66E] font-mono tabular-nums">
                      {sleepTimerState.stopAtEndOfSurah
                        ? 'نهاية السورة'
                        : formatCountdown(sleepTimerState.remainingSeconds || 0)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { min: 15, label: '١٥ دقيقة' },
                    { min: 30, label: '٣٠ دقيقة' },
                    { min: 45, label: '٤٥ دقيقة' },
                    { min: 60, label: '٦٠ دقيقة' },
                    { min: -1, label: 'نهاية السورة' },
                    { min: 0, label: 'إيقاف المؤقت' },
                  ].map((opt) => {
                    const isActive =
                      (opt.min === -1 && sleepTimerState.stopAtEndOfSurah) ||
                      (opt.min === 0 && !sleepTimerState.stopAtEndOfSurah && sleepTimerState.remainingSeconds === null) ||
                      (opt.min > 0 &&
                        sleepTimerState.remainingSeconds !== null &&
                        Math.ceil(sleepTimerState.remainingSeconds / 60) === opt.min);

                    return (
                      <button
                        key={opt.min}
                        onClick={() => AudioService.setSleepTimer(opt.min === 0 ? null : opt.min)}
                        className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                          isActive
                            ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#F3E5AB]'
                            : 'bg-[#0E0D0A] border-[#C8A24A]/25 text-[#C4B998] hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ayah Repeat for Memorization Section */}
              <div className="bg-[#14120D] border border-[#C8A24A]/35 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-[#C8A24A]/20 border border-[#C8A24A]/45 text-[#E6C66E]">
                      <Repeat size={16} />
                    </div>
                    <div>
                      <h3 className="text-xs font-extrabold text-[#F3E5AB]">تكرار الآية لتثبيت الحفظ والتدبر</h3>
                      <p className="text-[10px] text-[#C4B998]">ترديد كل آية تلقائياً بالعدد المختار قبل الانتقال للآية التالية</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { count: 1, label: 'بدون (1×)' },
                    { count: 3, label: '٣ مرات' },
                    { count: 5, label: '٥ مرات' },
                    { count: 10, label: '١٠ مرات' },
                    { count: 0, label: 'مفتوح (∞)' },
                  ].map((item) => {
                    const isSelected = repeatState.target === item.count;
                    return (
                      <button
                        key={item.count}
                        onClick={() => AudioService.setAyahRepeatTarget(item.count)}
                        className={`p-2 rounded-xl border text-center font-bold transition-all ${
                          isSelected
                            ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#F3E5AB]'
                            : 'bg-[#0E0D0A] border-[#C8A24A]/25 text-[#C4B998] hover:text-white'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Full-Text Ayah Search across the Holy Quran */}
          {activeTab === 'ayah_search' && (
            <div className="p-4 space-y-3 text-xs">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleRunSearch(e.target.value)}
                  placeholder="ابحث بأي كلمة في آيات القرآن الكريم (مثال: الصبر، تطمئن، الفرج)..."
                  className="w-full bg-[#14120D] border border-[#C8A24A]/45 rounded-2xl py-3 pr-10 pl-4 text-xs text-white placeholder-[#8E8268] focus:outline-none focus:border-[#E6C66E]"
                />
                <Search size={16} className="absolute right-3.5 top-3.5 text-[#E6C66E]" />
              </div>

              {/* Quick Topic Suggestions */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[10px] text-[#C4B998] shrink-0">كلمات سريعة:</span>
                {quickSearchKeywords.map((kw) => (
                  <button
                    key={kw}
                    onClick={() => handleRunSearch(kw)}
                    className="px-2.5 py-1 rounded-lg bg-[#14120D] hover:bg-[#221D14] text-[#F3E5AB] border border-[#C8A24A]/30 text-[11px] shrink-0 transition-colors font-bold"
                  >
                    {kw}
                  </button>
                ))}
              </div>

              {/* Search Results */}
              <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-0.5">
                {isSearching ? (
                  <div className="py-10 text-center text-[#C4B998] flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-[#E6C66E] border-t-transparent rounded-full animate-spin" />
                    <span>جاري البحث في آيات المصحف الشريف...</span>
                  </div>
                ) : searchQuery.trim().length >= 2 && searchResults.length === 0 ? (
                  <div className="py-10 text-center text-[#8E8268]">
                    لا توجد آيات مطابقة لهذا البحث. جرب كلمة أخرى.
                  </div>
                ) : (
                  searchResults.map((item) => {
                    const key = `${item.surahNumber}:${item.ayahNumber}`;
                    const isPlayingThis =
                      audioState?.category === 'quran' &&
                      audioState.surahNumber === item.surahNumber &&
                      audioState.ayahNumber === item.ayahNumber &&
                      audioState.isPlaying;

                    return (
                      <div
                        key={key}
                        className="p-3.5 rounded-2xl bg-[#14120D] border border-[#C8A24A]/35 hover:border-[#E6C66E]/60 space-y-2 transition-colors"
                      >
                        <div className="flex items-center justify-between text-[11px] text-[#E6C66E] font-bold">
                          <span>سورة {item.surahName} · الآية {item.ayahNumber}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handlePlaySearchedAyah(item.surahNumber, item.ayahNumber)}
                              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold transition-colors ${
                                isPlayingThis
                                  ? 'bg-[#E6C66E] text-[#080705]'
                                  : 'bg-[#1D1911] hover:bg-[#282217] text-[#F3E5AB] border border-[#C8A24A]/35'
                              }`}
                            >
                              {isPlayingThis ? <Pause size={11} fill="currentColor" /> : <Play size={11} fill="currentColor" />}
                              <span>{isPlayingThis ? 'إيقاف' : 'استماع'}</span>
                            </button>

                            {(onOpenSurahAyah || onSelectSurah) && (
                              <button
                                onClick={() => {
                                  onClose();
                                  if (onOpenSurahAyah) onOpenSurahAyah(item.surahNumber, item.ayahNumber);
                                  else if (onSelectSurah) onSelectSurah(item.surahNumber, item.ayahNumber);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#C8A24A]/20 hover:bg-[#C8A24A]/30 text-[#E6C66E] border border-[#C8A24A]/45 flex items-center gap-1 font-bold"
                              >
                                <BookOpen size={11} />
                                <span>فتح بالمصحف</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="font-quran text-base text-[#F3E5AB] leading-loose text-right">
                          ﴿{item.text}﴾
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Share Card Studio Launcher */}
          {activeTab === 'share_card' && (
            <div className="p-4 space-y-3.5 text-xs">
              <div className="p-4 rounded-2xl bg-[#14120D] border border-[#C8A24A]/40 space-y-2.5">
                <h3 className="font-extrabold text-[#F3E5AB] text-xs flex items-center gap-1.5">
                  <ImageIcon size={15} className="text-[#E6C66E]" />
                  <span>استوديو البطاقات الدعوية الفاخرة</span>
                </h3>
                <p className="text-[11px] text-[#C4B998] leading-relaxed">
                  صمّم وشارك بطاقات مصورة عالية الدقة لآيات القرآن الكريم والأحاديث الشريفة والأذكار بخلفيات إسلامية ذهبية.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {dailyVersePayload && (
                    <button
                      onClick={() => {
                        setSharePayload(dailyVersePayload);
                        setIsShareCardModalOpen(true);
                      }}
                      className="p-3 rounded-xl bg-[#1B170F] hover:bg-[#241E14] border border-[#C8A24A]/40 text-right space-y-1 transition-all"
                    >
                      <span className="text-[10px] font-bold text-[#E6C66E] block">آية اليوم المختارة</span>
                      <span className="text-xs font-bold text-[#F3E5AB] block truncate">{dailyVersePayload.sourceLabel}</span>
                    </button>
                  )}

                  {dailyHadithPayload && (
                    <button
                      onClick={() => {
                        setSharePayload(dailyHadithPayload);
                        setIsShareCardModalOpen(true);
                      }}
                      className="p-3 rounded-xl bg-[#1B170F] hover:bg-[#241E14] border border-[#C8A24A]/40 text-right space-y-1 transition-all"
                    >
                      <span className="text-[10px] font-bold text-[#E6C66E] block">حديث اليوم النبوي</span>
                      <span className="text-xs font-bold text-[#F3E5AB] block truncate">{dailyHadithPayload.sourceLabel}</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setIsShareCardModalOpen(true)}
                  className="athar-btn-primary w-full py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 mt-2"
                >
                  <ImageIcon size={15} />
                  <span>فتح مصمم البطاقات الدعوية</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ShareCardModal
        isOpen={isShareCardModalOpen}
        onClose={() => setIsShareCardModalOpen(false)}
        initialPayload={sharePayload}
      />
    </>
  );
};
