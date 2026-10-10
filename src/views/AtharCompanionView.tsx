import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Pause, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  Copy, 
  Check, 
  BookOpen, 
  ArrowRight,
  Heart,
  Share2,
  Compass,
  Search,
  Users,
  Image as ImageIcon,
  CheckCircle,
  FileText,
  Coins,
  Calculator,
  Scale,
  HandHeart,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Phone,
  Clock,
  Award,
  Zap,
  CloudRain,
  ShieldCheck,
  ShieldAlert,
  HeartHandshake
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  COMPANION_DATA, 
  COMPANION_MOODS, 
  CompanionMoodId, 
  CompanionMoodItem, 
  getCompanionMoodById,
  playOfflineTasbihClickSound,
  playOfflineCompletionChime
} from '../data/companionData';
import { 
  HEART_HEALING_PRESCIPTIONS, 
  TADABBUR_SESSIONS, 
  DAILY_INTENTIONS_CATALOG,
  HeartHealingItem, 
  TadabburSessionItem 
} from '../data/sakinaAndRightsData';
import { AudioService, ActiveAudioState } from '../services/audioService';
import { QuranService } from '../services/quranService';
import { StorageService } from '../services/storageService';
import { SadaqahRecord } from '../types';
import { RotatingCardBackground } from '../components/RotatingCardBackground';
import { SakinaAndRightsModal, SakinaTab } from '../components/SakinaAndRightsModal';
import { ShareCardModal, ShareCardPayload } from '../components/ShareCardModal';
import { ZakatAndCharityModal } from '../components/ZakatAndCharityModal';

interface AtharCompanionViewProps {
  initialMood?: CompanionMoodId;
  onNavigate?: (tab: any) => void;
  onSelectSurah?: (surahNum: number, ayahNum?: number) => void;
  onBack?: () => void;
}

type CompanionSection = 'heart_compass' | 'sakina_oasis' | 'khushu_cards' | 'zakat_charity';

export const AtharCompanionView: React.FC<AtharCompanionViewProps> = ({
  initialMood = 'anxious',
  onNavigate,
  onSelectSurah,
  onBack
}) => {
  const [activeSection, setActiveSection] = useState<CompanionSection>('heart_compass');
  const [selectedMoodId, setSelectedMoodId] = useState<CompanionMoodId>(initialMood);
  const currentMood: CompanionMoodItem = getCompanionMoodById(selectedMoodId);

  // Tasbih state (10 counts per mood)
  const [tasbihCounts, setTasbihCounts] = useState<Record<CompanionMoodId, number>>({
    anxious: 0,
    sad: 0,
    distracted: 0,
    grateful: 0
  });

  // Copy toast
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Audio Playback state
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);

  // Sakina Sub-Section State
  const [sakinaSubTab, setSakinaSubTab] = useState<'healing' | 'kinship' | 'intentions' | 'debts'>('healing');
  const [selectedHealingId, setSelectedHealingId] = useState<string>('tightness');
  const [isSakinaModalOpen, setIsSakinaModalOpen] = useState<boolean>(false);
  const [sakinaModalTab, setSakinaModalTab] = useState<SakinaTab>('heart_healing');
  
  // Khushu Sub-Section State
  const [khushuSubTab, setKhushuSubTab] = useState<'tadabbur' | 'search' | 'cards'>('tadabbur');
  const [selectedTadabburId, setSelectedTadabburId] = useState<string>('session_ihsan');
  const [tadabburStreak, setTadabburStreak] = useState<number>(() => 
    StorageService.getTadabburProgress().streakDays
  );

  // Search State for Khushu Tab
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<{ surahNumber: number; ayahNumber: number; text: string; surahName: string }[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Share Card Modal State
  const [shareCardPayload, setShareCardPayload] = useState<ShareCardPayload | null>(null);

  // Zakat Inline & Modal State
  const [zakatSubTab, setZakatSubTab] = useState<'calc' | 'sadaqah'>('calc');
  const [isZakatModalOpen, setIsZakatModalOpen] = useState<boolean>(false);
  const [zakatModalInitialTab, setZakatModalInitialTab] = useState<'zakat' | 'sadaqah'>('zakat');
  const [goldGramPrice24, setGoldGramPrice24] = useState<string>('4200');
  const [cashSavings, setCashSavings] = useState<string>('');
  const [goldGrams, setGoldGrams] = useState<string>('');
  const [investmentsTrade, setInvestmentsTrade] = useState<string>('');
  const [debtsToDeduct, setDebtsToDeduct] = useState<string>('');
  const [sadaqahRecords, setSadaqahRecords] = useState<SadaqahRecord[]>(() => StorageService.getSadaqahRecords());
  const [quickSadaqahAmount, setQuickSadaqahAmount] = useState<string>('');
  const [quickSadaqahIntention, setQuickSadaqahIntention] = useState<string>('صدقة جارية عن الوالدين');
  const [sadaqahSuccessToast, setSadaqahSuccessToast] = useState<string | null>(null);

  // Pending debts & intentions count
  const [pendingDebtsCount, setPendingDebtsCount] = useState<number>(() => 
    StorageService.getRightsAndWasayaState().records.filter(r => !r.isFulfilled).length
  );

  // Central Audio Sync
  useEffect(() => {
    const unsub = AudioService.subscribe((state: ActiveAudioState | null) => {
      if (!state) {
        if (localAudioRef.current?.paused) {
          setIsPlayingAudio(false);
        }
        return;
      }
      if (
        state.surahNumber === currentMood.verse.surahNumber &&
        state.ayahNumber === currentMood.verse.ayahNumber &&
        state.isPlaying
      ) {
        setIsPlayingAudio(true);
      } else if (!localAudioRef.current || localAudioRef.current.paused) {
        setIsPlayingAudio(false);
      }
    });
    return () => unsub();
  }, [currentMood]);

  // Clean up audio on mood change
  useEffect(() => {
    if (localAudioRef.current) {
      localAudioRef.current.pause();
      localAudioRef.current = null;
    }
    setIsPlayingAudio(false);
    setAudioProgress(0);
  }, [selectedMoodId]);

  const currentCount = tasbihCounts[selectedMoodId] || 0;
  const isTasbihCompleted = currentCount >= currentMood.tasbih.target;

  // Tasbih click handler
  const handleTasbihClick = () => {
    if (isTasbihCompleted) return;

    const nextCount = currentCount + 1;
    setTasbihCounts((prev) => ({
      ...prev,
      [selectedMoodId]: nextCount
    }));

    // Tactile sound & haptics
    playOfflineTasbihClickSound();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(30);
      } catch {}
    }

    // Check completion
    if (nextCount === currentMood.tasbih.target) {
      playOfflineCompletionChime();
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#D4AF37', '#F59E0B', '#10B981', '#38BDF8']
        });
      } catch {}
    }
  };

  const handleResetTasbih = () => {
    setTasbihCounts((prev) => ({
      ...prev,
      [selectedMoodId]: 0
    }));
  };

  // Audio Playback toggle
  const handleToggleAyahAudio = async () => {
    if (isPlayingAudio) {
      if (localAudioRef.current) {
        localAudioRef.current.pause();
      }
      AudioService.pause();
      setIsPlayingAudio(false);
      return;
    }

    try {
      setIsPlayingAudio(true);

      if (!localAudioRef.current) {
        const audio = new Audio(currentMood.verse.audioUrl);
        audio.preload = 'auto';

        audio.addEventListener('timeupdate', () => {
          if (audio.duration) {
            setAudioProgress((audio.currentTime / audio.duration) * 100);
          }
        });

        audio.addEventListener('ended', () => {
          setIsPlayingAudio(false);
          setAudioProgress(0);
        });

        audio.addEventListener('error', () => {
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(currentMood.verse.text);
            utterance.lang = 'ar-SA';
            utterance.rate = 0.85;
            utterance.onend = () => {
              setIsPlayingAudio(false);
              setAudioProgress(0);
            };
            window.speechSynthesis.speak(utterance);
          } else {
            setIsPlayingAudio(false);
          }
        });

        localAudioRef.current = audio;
      }

      await localAudioRef.current.play();
    } catch {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(currentMood.verse.text);
        utterance.lang = 'ar-SA';
        utterance.rate = 0.85;
        utterance.onend = () => {
          setIsPlayingAudio(false);
          setAudioProgress(0);
        };
        window.speechSynthesis.speak(utterance);
      } else {
        setIsPlayingAudio(false);
      }
    }
  };

  // Copy text to clipboard
  const handleCopyText = (text: string, sectionKey: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedSection(sectionKey);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch {}
  };

  // Run Ayah Search
  const handleSearchAyahs = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const res = await QuranService.searchQuranText(q);
    setSearchResults(res.results || []);
    setIsSearching(false);
  };

  const refreshStats = () => {
    setPendingDebtsCount(StorageService.getRightsAndWasayaState().records.filter(r => !r.isFulfilled).length);
    setTadabburStreak(StorageService.getTadabburProgress().streakDays);
    setSadaqahRecords(StorageService.getSadaqahRecords());
  };

  // Quick Inline Sadaqah Addition
  const handleAddQuickSadaqah = () => {
    const amt = parseFloat(quickSadaqahAmount);
    if (!amt || amt <= 0) return;
    const updated = StorageService.addSadaqahRecord(amt, 'ج.م', quickSadaqahIntention);
    setSadaqahRecords(updated);
    setQuickSadaqahAmount('');
    setSadaqahSuccessToast('تقبل الله صدقتك وأخلف عليك خيراً وبركة ✓');
    setTimeout(() => setSadaqahSuccessToast(null), 3000);
  };

  // Zakat Math
  const gramPrice = Math.max(0, parseFloat(goldGramPrice24) || 0);
  const nisabValue = Math.round(gramPrice * 85);
  const cashNum = Math.max(0, parseFloat(cashSavings) || 0);
  const goldNum = Math.max(0, parseFloat(goldGrams) || 0) * gramPrice;
  const tradeNum = Math.max(0, parseFloat(investmentsTrade) || 0);
  const debtsNum = Math.max(0, parseFloat(debtsToDeduct) || 0);
  const netWealth = Math.max(0, cashNum + goldNum + tradeNum - debtsNum);
  const hasReachedNisab = nisabValue > 0 && netWealth >= nisabValue;
  const zakatDueAmount = hasReachedNisab ? Math.round((netWealth * 0.025) * 100) / 100 : 0;
  const totalSadaqahSum = sadaqahRecords.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

  // Active Healing Prescription
  const activeHealingItem = HEART_HEALING_PRESCIPTIONS.find(p => p.id === selectedHealingId) || HEART_HEALING_PRESCIPTIONS[0];
  const activeTadabburSession = TADABBUR_SESSIONS.find(s => s.id === selectedTadabburId) || TADABBUR_SESSIONS[0];

  return (
    <div className="min-h-full pb-24 px-3 sm:px-4 pt-3 space-y-4 font-arabic select-none text-right">
      {/* Top Header: Dignified, Clean & Clutter-Free */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
              aria-label="الرجوع"
            >
              <ArrowRight size={18} />
            </button>
          )}
          <div className="p-2 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/35 shadow-inner">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
              <span className="text-[#D4AF37]">رفيق أثر</span>
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              واحتك الإيمانية لسكينة القلب والخشوع وحفظ الحقوق والنماء
            </p>
          </div>
        </div>
      </div>

      {/* 4 Main Segmented Sub-Tabs for Athar Companion (Dark Theme + Gold Accents) */}
      <div className="grid grid-cols-4 gap-1 bg-[#10161E] p-1 rounded-2xl border border-slate-800 text-[10px] sm:text-[11px] font-bold">
        <button
          onClick={() => setActiveSection('heart_compass')}
          className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1 ${
            activeSection === 'heart_compass'
              ? 'bg-[#1C2634] text-[#D4AF37] shadow border border-[#D4AF37]/40 ring-1 ring-[#D4AF37]/20 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Heart size={12} fill={activeSection === 'heart_compass' ? 'currentColor' : 'none'} />
          <span className="truncate">بوصلة القلب</span>
        </button>

        <button
          onClick={() => setActiveSection('sakina_oasis')}
          className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1 ${
            activeSection === 'sakina_oasis'
              ? 'bg-[#1C2634] text-[#D4AF37] shadow border border-[#D4AF37]/40 ring-1 ring-[#D4AF37]/20 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass size={12} />
          <span className="truncate">واحة السكينة</span>
        </button>

        <button
          onClick={() => setActiveSection('khushu_cards')}
          className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1 ${
            activeSection === 'khushu_cards'
              ? 'bg-[#1C2634] text-[#D4AF37] shadow border border-[#D4AF37]/40 ring-1 ring-[#D4AF37]/20 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen size={12} />
          <span className="truncate">الخشوع والتدبر</span>
        </button>

        <button
          onClick={() => setActiveSection('zakat_charity')}
          className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1 ${
            activeSection === 'zakat_charity'
              ? 'bg-[#1C2634] text-[#D4AF37] shadow border border-[#D4AF37]/40 ring-1 ring-[#D4AF37]/20 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Coins size={12} />
          <span className="truncate">الزكاة والصدقات</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: بوصلة القلب (كيف تجد قلبك الآن؟) */}
      {/* ========================================================================= */}
      {activeSection === 'heart_compass' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Main Question & Mood Selector (Chips) */}
          <div className="relative overflow-hidden bg-gradient-to-b from-[#131A22] to-[#0D1217] border border-[#D4AF37]/35 rounded-2xl p-4 shadow-lg space-y-3">
            <RotatingCardBackground slot="kaaba" cardOffset={1} intervalMs={28000} opacity={0.25} />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#D4AF37] tracking-wide flex items-center gap-1">
                  <Heart size={13} fill="currentColor" className="text-[#D4AF37]" />
                  <span>لحظة مصارحة مع نفسك</span>
                </span>
                <span className="text-[10px] text-slate-400">اختر حالتك الحالية</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-100 mt-1">
                {COMPANION_DATA.initialQuestion}
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {COMPANION_DATA.questionDescription}
              </p>
            </div>

            {/* The 4 Interactive Chips */}
            <div className="relative z-10 grid grid-cols-2 gap-2 pt-1">
              {COMPANION_MOODS.map((mood) => {
                const isSelected = mood.id === selectedMoodId;
                return (
                  <button
                    key={mood.id}
                    onClick={() => setSelectedMoodId(mood.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all text-right duration-200 active:scale-95 ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#D4AF37]/25 to-[#A88421]/15 border-[#D4AF37] text-white shadow-[0_0_15px_-3px_rgba(212,175,55,0.3)] ring-1 ring-[#D4AF37]/50'
                        : 'bg-slate-900/60 hover:bg-slate-800/70 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span className="text-xl shrink-0 p-1 rounded-lg bg-black/20">
                      {mood.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className={`block text-xs font-bold leading-tight ${isSelected ? 'text-[#D4AF37]' : 'text-slate-200'}`}>
                        {mood.label}
                      </span>
                      <span className="block text-[10px] text-slate-400 truncate mt-0.5">
                        {mood.badge}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-[#D4AF37] shrink-0 animate-ping" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Companion Card: Dark Theme + Gold Accents */}
          <div className={`relative overflow-hidden bg-gradient-to-b ${currentMood.bgGradient} border ${currentMood.borderColor} rounded-3xl p-4 sm:p-5 shadow-2xl space-y-5 transition-all`}>
            <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:16px_16px]" />

            {/* Mood Header Bar */}
            <div className="relative z-10 flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl p-2 rounded-2xl bg-black/30 border border-slate-700/50 shadow-inner">
                  {currentMood.emoji}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-slate-100">
                      {currentMood.label}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                      {currentMood.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {currentMood.shortDescription}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleCopyText(`${currentMood.verse.text}\n\n${currentMood.dua.text}`, 'all')}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-[#D4AF37] bg-slate-900/60 hover:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-700/60 transition-colors"
              >
                {copiedSection === 'all' ? (
                  <>
                    <Check size={12} className="text-emerald-400" />
                    <span className="text-emerald-400">تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Share2 size={12} />
                    <span>مشاركة</span>
                  </>
                )}
              </button>
            </div>

            {/* 1. الآية القرآنية المناسبة مع زر تشغيل صوتي */}
            <div className="relative z-10 bg-slate-950/70 border border-[#D4AF37]/30 rounded-2xl p-4 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="p-1 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37]">
                    <BookOpen size={14} />
                  </span>
                  <span className="text-xs font-bold text-[#D4AF37]">
                    سورة {currentMood.verse.surahName} · الآية {currentMood.verse.ayahNumber}
                  </span>
                </div>

                <button
                  onClick={handleToggleAyahAudio}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95 shadow ${
                    isPlayingAudio
                      ? 'bg-[#D4AF37] text-slate-950 hover:bg-[#E5C158]'
                      : 'bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#D4AF37] border border-[#D4AF37]/40'
                  }`}
                >
                  {isPlayingAudio ? (
                    <>
                      <Pause size={13} fill="currentColor" />
                      <span>إيقاف التلاوة</span>
                    </>
                  ) : (
                    <>
                      <Play size={13} fill="currentColor" />
                      <span>استماع للآية</span>
                    </>
                  )}
                </button>
              </div>

              {/* Ayah Sacred Arabic Script */}
              <div className="py-2 px-1 text-center">
                <p className="font-quran text-lg sm:text-xl text-amber-50 leading-[2.2] tracking-wide select-text">
                  « {currentMood.verse.text} »
                </p>
              </div>

              {/* Audio progress bar */}
              {isPlayingAudio && (
                <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                  <div 
                    className="bg-[#D4AF37] h-full transition-all duration-300"
                    style={{ width: `${Math.max(5, audioProgress)}%` }}
                  />
                </div>
              )}

              {/* Reflection / Tadabbur Note */}
              <div className="pt-2 border-t border-slate-800/80 flex items-start gap-2 text-[11px] text-slate-300">
                <span className="text-[#D4AF37] font-bold shrink-0">إضاءة:</span>
                <p className="leading-relaxed text-slate-300">
                  {currentMood.verse.reflection}
                </p>
              </div>

              {/* Quick Reader Link */}
              {onSelectSurah && (
                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => onSelectSurah(currentMood.verse.surahNumber, currentMood.verse.ayahNumber)}
                    className="text-[10px] text-[#D4AF37] hover:underline flex items-center gap-1"
                  >
                    <span>فتح سورة {currentMood.verse.surahName} في المصحف</span>
                    <ArrowRight size={10} className="rotate-180" />
                  </button>
                </div>
              )}
            </div>

            {/* 2. ذكر أو دعاء مخصص */}
            <div className="relative z-10 bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 shadow-md space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="p-1 rounded-lg bg-emerald-500/15 text-emerald-400">
                    <Heart size={14} />
                  </span>
                  <span className="text-xs font-bold text-slate-100">
                    {currentMood.dua.title}
                  </span>
                </div>

                <button
                  onClick={() => handleCopyText(currentMood.dua.text, 'dua')}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  title="نسخ الدعاء"
                >
                  {copiedSection === 'dua' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-center">
                <p className="text-xs sm:text-sm font-semibold text-slate-100 leading-relaxed select-text">
                  "{currentMood.dua.text}"
                </p>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                <span className="text-[#D4AF37] font-medium">{currentMood.dua.source}</span>
                <span className="text-slate-400 truncate max-w-[200px]">{currentMood.dua.fadl}</span>
              </div>
            </div>

            {/* 3. توجيه خفيف وعملي (السبحة التفاعلية لـ 10 مرات) */}
            <div className="relative z-10 bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="p-1.5 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37]">
                    📿
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">
                      {currentMood.practicalGuidance.title}
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      خطوة عملية وسكينة فورية
                    </span>
                  </div>
                </div>

                {currentCount > 0 && (
                  <button
                    onClick={handleResetTasbih}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-rose-400 p-1 transition-colors"
                    title="إعادة ضبط السبحة"
                  >
                    <RotateCcw size={11} />
                    <span>تصفير</span>
                  </button>
                )}
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                {currentMood.practicalGuidance.steps?.join(' · ') || 'خطوات عملية لتهدئة النفس واستحضار معية الله'}
              </p>

              {/* The Interactive Tasbih Button */}
              <div className="flex flex-col items-center justify-center pt-2">
                <button
                  onClick={handleTasbihClick}
                  disabled={isTasbihCompleted}
                  className={`relative w-full max-w-xs py-5 px-4 rounded-2xl border transition-all duration-150 flex flex-col items-center justify-center gap-2 shadow-lg active:scale-95 ${
                    isTasbihCompleted
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                      : 'bg-gradient-to-b from-[#1C2634] to-[#121A24] hover:from-[#222E3E] border-[#D4AF37]/40 hover:border-[#D4AF37] text-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
                  }`}
                >
                  <span className="text-xs text-slate-300 font-medium">
                    {currentMood.tasbih.dhikrText}
                  </span>

                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-black font-mono tracking-tight text-[#D4AF37]">
                      {currentCount}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      / {currentMood.tasbih.target}
                    </span>
                  </div>

                  {/* Progress Bar inside button */}
                  <div className="w-3/4 bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-200 ${isTasbihCompleted ? 'bg-emerald-400' : 'bg-[#D4AF37]'}`}
                      style={{ width: `${(currentCount / currentMood.tasbih.target) * 100}%` }}
                    />
                  </div>

                  {isTasbihCompleted && (
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 mt-1 animate-pulse">
                      <CheckCircle2 size={13} />
                      <span>تقبل الله ذكرك وطمأن فؤادك ✓ ({currentMood.tasbih.virtue})</span>
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Visual Image Card Studio Button */}
            <div className="relative z-10 pt-2 flex items-center justify-between">
              <button
                onClick={() =>
                  setShareCardPayload({
                    category: 'ayah',
                    title: `رفيق أثر · ${currentMood.label}`,
                    mainText: `﴿${currentMood.verse.text}﴾`,
                    sourceLabel: `سورة ${currentMood.verse.surahName} · الآية ${currentMood.verse.ayahNumber}`,
                    subtitleOrTafsir: currentMood.verse.reflection
                  })
                }
                className="w-full py-2.5 rounded-xl bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/35 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <ImageIcon size={15} />
                <span>تصميم ومشاركة هذه البطاقة كصورة أنيقة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: واحة السكينة والحقوق (دمج كامل بنمط بطاقات ذهبية) */}
      {/* ========================================================================= */}
      {activeSection === 'sakina_oasis' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Hero Banner for Sakina Oasis */}
          <div className="relative overflow-hidden bg-gradient-to-r from-[#17212E] via-[#121820] to-[#0D1217] border border-[#D4AF37]/45 rounded-3xl p-4 shadow-xl">
            <RotatingCardBackground slot="kaaba" cardOffset={1} intervalMs={28000} opacity={0.28} />
            <div className="relative z-10 flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 shadow-inner">
                  <Compass size={22} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-100">
                    واحة السكينة والحقوق الشرعية
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    علاج القلوب بالقرآن، الإحسان بالوالدين، وتوثيق حقوق العباد
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSakinaModalTab('heart_healing');
                  setIsSakinaModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1"
              >
                <span>الواحة الموسعة</span>
                <ChevronLeft size={14} />
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="relative z-10 grid grid-cols-2 gap-2 mt-3 text-center">
              <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">أيام مواظبة التدبر</span>
                <span className="text-sm font-mono font-bold text-[#D4AF37] mt-0.5 block">
                  {tadabburStreak} يوم متتالٍ
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">حقوق وديون معلقة</span>
                <span className="text-sm font-mono font-bold text-amber-400 mt-0.5 block">
                  {pendingDebtsCount} سجل
                </span>
              </div>
            </div>
          </div>

          {/* Sub-Tabs for Sakina Section */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'healing', label: 'علاج القلوب', icon: Heart },
              { id: 'kinship', label: 'بر الوالدين والأرحام', icon: Users },
              { id: 'intentions', label: 'عهد النوايا', icon: CheckCircle },
              { id: 'debts', label: 'الديون والوصية', icon: ShieldCheck }
            ].map(tab => {
              const isSel = sakinaSubTab === tab.id;
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSakinaSubTab(tab.id as any)}
                  className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                    isSel
                      ? 'bg-[#D4AF37] text-slate-950 shadow'
                      : 'bg-slate-900/70 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  <IconComp size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* 1. علاج القلوب بالقرآن */}
          {sakinaSubTab === 'healing' && (
            <div className="space-y-3">
              {/* Prescriptions Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {HEART_HEALING_PRESCIPTIONS.map(p => {
                  const isCur = p.id === selectedHealingId;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedHealingId(p.id)}
                      className={`p-2.5 rounded-xl border text-right transition-all ${
                        isCur
                          ? 'bg-[#1C2634] border-[#D4AF37] text-[#D4AF37] ring-1 ring-[#D4AF37]/40 shadow'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      <h5 className="text-xs font-bold leading-tight truncate">{p.emotionTitle}</h5>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{p.verse.surahName}</p>
                    </button>
                  );
                })}
              </div>

              {/* Active Healing Card in Dark Gold Theme */}
              <div className="bg-[#121922] border border-[#D4AF37]/35 rounded-2xl p-4 shadow space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37]">
                      <Heart size={16} />
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-100">{activeHealingItem.emotionTitle}</h4>
                      <p className="text-[10px] text-slate-400">{activeHealingItem.emotionSubtitle}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-[#D4AF37] bg-[#D4AF37]/15 px-2 py-0.5 rounded-md">
                    سورة {activeHealingItem.verse.surahName} ({activeHealingItem.verse.ayahNumber})
                  </span>
                </div>

                <div className="p-3 bg-black/40 rounded-xl border border-slate-800 text-center">
                  <p className="font-quran text-base text-amber-50 leading-loose">
                    «{activeHealingItem.verse.arabicText}»
                  </p>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed text-justify">
                  {activeHealingItem.reflection}
                </p>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setSakinaModalTab('heart_healing');
                      setIsSakinaModalOpen(true);
                    }}
                    className="text-[10px] text-[#D4AF37] font-bold hover:underline flex items-center gap-1"
                  >
                    <span>عرض الوصفة النبوية الكاملة والخطوات</span>
                    <ChevronLeft size={11} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. بر الوالدين والأرحام */}
          {sakinaSubTab === 'kinship' && (
            <div className="bg-[#121922] border border-[#D4AF37]/35 rounded-2xl p-4 shadow space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37]">
                    <Users size={16} />
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-100">سجل بر الوالدين وصلة الرحم</h4>
                    <p className="text-[10px] text-slate-400">الإحسان للأحياء والدعاء والصدقة للأموات</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSakinaModalTab('kinship');
                    setIsSakinaModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-[#D4AF37] text-slate-950 font-bold text-[10px] shadow"
                >
                  إدارة السجل
                </button>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                  <span>دعاء الوالدين القرآني:</span>
                  <button
                    onClick={() => handleCopyText('رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا', 'kin_dua')}
                    className="text-[10px] text-[#D4AF37] hover:underline"
                  >
                    {copiedSection === 'kin_dua' ? 'تم النسخ ✓' : 'نسخ'}
                  </button>
                </div>
                <p className="font-quran text-sm text-[#D4AF37] text-center">
                  ﴿رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا﴾
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <button
                  onClick={() => {
                    setSakinaModalTab('kinship');
                    setIsSakinaModalOpen(true);
                  }}
                  className="p-2.5 bg-slate-900/60 hover:bg-slate-800 rounded-xl border border-slate-800 text-slate-200 font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone size={13} className="text-emerald-400" />
                  <span>اتصال بوالديك / أرحامك</span>
                </button>
                <button
                  onClick={() => {
                    setSakinaModalTab('kinship');
                    setIsSakinaModalOpen(true);
                  }}
                  className="p-2.5 bg-slate-900/60 hover:bg-slate-800 rounded-xl border border-slate-800 text-slate-200 font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Heart size={13} className="text-rose-400" />
                  <span>إهداء صدقة أو دعاء</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. عهد النوايا اليومية */}
          {sakinaSubTab === 'intentions' && (
            <div className="bg-[#121922] border border-[#D4AF37]/35 rounded-2xl p-4 shadow space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37]">
                    <CheckCircle size={16} />
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-100">كتالوج النوايا اليومية المباركة</h4>
                    <p className="text-[10px] text-slate-400">تحويل العادات اليومية إلى عبادات عظيمة بالنية</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSakinaModalTab('intentions');
                    setIsSakinaModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-[#D4AF37] text-slate-950 font-bold text-[10px] shadow"
                >
                  مفكرة النوايا
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DAILY_INTENTIONS_CATALOG.slice(0, 4).map(intent => (
                  <div key={intent.id} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                      <span>{intent.title}</span>
                      <span className="text-[9px] text-[#D4AF37] bg-[#D4AF37]/15 px-1.5 py-0.5 rounded">{intent.categoryLabel}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-2">{intent.intentionText}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. الديون والوصية الشرعية */}
          {sakinaSubTab === 'debts' && (
            <div className="bg-[#121922] border border-[#D4AF37]/35 rounded-2xl p-4 shadow space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37]">
                    <ShieldCheck size={16} />
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-100">حقوق العباد والوصية الشرعية</h4>
                    <p className="text-[10px] text-slate-400">«ما حق امرئ مسلم له شيء يوصي فيه يبيت ليلتين إلا ووصيته مكتوبة عنده»</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSakinaModalTab('rights_wasiyyah');
                    setIsSakinaModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-[#D4AF37] text-slate-950 font-bold text-[10px] shadow"
                >
                  فتح الدفتر والوصية
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">ديون وأمانات مسجلة</span>
                  <span className="text-sm font-bold text-amber-400 mt-1 block">{pendingDebtsCount} معلق</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">الوصية الشرعية</span>
                  <span className="text-sm font-bold text-emerald-400 mt-1 block">جاهزة وموثقة</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: الخشوع والتدبر (دمج كامل بنمط بطاقات ذهبية) */}
      {/* ========================================================================= */}
      {activeSection === 'khushu_cards' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Sub-Tabs for Khushu */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'tadabbur', label: 'خلوة التدبر القرآني', icon: BookOpen },
              { id: 'search', label: 'البحث السريع في القرآن', icon: Search },
              { id: 'cards', label: 'استوديو البطاقات المصورة', icon: ImageIcon }
            ].map(tab => {
              const isSel = khushuSubTab === tab.id;
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setKhushuSubTab(tab.id as any)}
                  className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                    isSel
                      ? 'bg-[#D4AF37] text-slate-950 shadow'
                      : 'bg-slate-900/70 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  <IconComp size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* 1. خلوة التدبر القرآني */}
          {khushuSubTab === 'tadabbur' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {TADABBUR_SESSIONS.slice(0, 4).map(s => {
                  const isCur = s.id === selectedTadabburId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedTadabburId(s.id)}
                      className={`p-2.5 rounded-xl border text-right transition-all ${
                        isCur
                          ? 'bg-[#1C2634] border-[#D4AF37] text-[#D4AF37] ring-1 ring-[#D4AF37]/40 shadow'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      <h5 className="text-xs font-bold leading-tight truncate">{s.title}</h5>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">سورة {s.verse.surahName}</p>
                    </button>
                  );
                })}
              </div>

              {/* Active Tadabbur Card */}
              <div className="bg-[#121922] border border-[#D4AF37]/35 rounded-2xl p-4 shadow space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37]">
                      <BookOpen size={16} />
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-100">{activeTadabburSession.title}</h4>
                      <p className="text-[10px] text-slate-400">سورة {activeTadabburSession.verse.surahName} · الآية {activeTadabburSession.verse.ayahNumber}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-[#D4AF37] bg-[#D4AF37]/15 px-2 py-0.5 rounded-md">
                    {activeTadabburSession.theme}
                  </span>
                </div>

                <div className="p-3 bg-black/40 rounded-xl border border-slate-800 text-center">
                  <p className="font-quran text-base sm:text-lg text-amber-50 leading-loose">
                    «{activeTadabburSession.verse.arabicText}»
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                    <span className="text-[10px] font-bold text-[#D4AF37] block">رسالة الآية لقلبك:</span>
                    <p className="text-slate-200 mt-0.5 text-[11px] leading-relaxed">{activeTadabburSession.heartMessage}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                    <span className="text-[10px] font-bold text-emerald-400 block">أثر الآية العملي اليوم:</span>
                    <p className="text-slate-200 mt-0.5 text-[11px] leading-relaxed">{activeTadabburSession.dailyActionDeed}</p>
                  </div>
                </div>

                {onSelectSurah && (
                  <div className="pt-2 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={() => onSelectSurah(activeTadabburSession.verse.surahNumber, activeTadabburSession.verse.ayahNumber)}
                      className="text-[10px] text-[#D4AF37] hover:underline flex items-center gap-1 font-bold"
                    >
                      <span>تلاوة السورة كاملة في المصحف</span>
                      <ArrowRight size={10} className="rotate-180" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. Fast Quran Verse Search Engine */}
          {khushuSubTab === 'search' && (
            <div className="bg-[#121922] border border-[#D4AF37]/35 rounded-2xl p-4 shadow space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                  <Search size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-100">البحث السريع في القرآن الكريم</h3>
                  <p className="text-[10px] text-slate-400">ابحث عن أي كلمة أو معنى في كتاب الله عز وجل</p>
                </div>
              </div>

              <form onSubmit={handleSearchAyahs} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="اكتب كلمة للبحث (مثال: الصبر، الرحمة، الجنة)..."
                    className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-bold text-xs rounded-xl shadow transition-all active:scale-95"
                >
                  {isSearching ? 'جاري...' : 'بحث'}
                </button>
              </form>

              {/* Results count & items */}
              {searchResults.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800/80 max-h-64 overflow-y-auto pr-1">
                  <span className="text-[10px] text-[#D4AF37] font-bold block">
                    عُثر على {searchResults.length} موضع في القرآن الكريم:
                  </span>
                  {searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => onSelectSurah?.(item.surahNumber, item.ayahNumber)}
                      className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-850 border border-slate-800/80 hover:border-[#D4AF37]/40 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between text-[10px] text-[#D4AF37] mb-1 font-bold">
                        <span>سورة {item.surahName}</span>
                        <span>الآية {item.ayahNumber}</span>
                      </div>
                      <p className="font-quran text-xs text-slate-200 leading-relaxed">
                        «{item.text}»
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. Visual Share Card Studio */}
          {khushuSubTab === 'cards' && (
            <div className="bg-gradient-to-r from-[#17212E] to-[#111721] border border-[#D4AF37]/35 rounded-2xl p-4 shadow space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                    <ImageIcon size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-100">استوديو البطاقات الدعوية والمصورة</h3>
                    <p className="text-[10px] text-slate-300">أنشئ بطاقات إسلامية جاهزة للنشر والمشاركة</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShareCardPayload({
                      category: 'ayah',
                      title: 'نفحة قرآنية من رفيق أثر',
                      mainText: `﴿${currentMood.verse.text}﴾`,
                      sourceLabel: `سورة ${currentMood.verse.surahName} · الآية ${currentMood.verse.ayahNumber}`,
                      subtitleOrTafsir: currentMood.verse.reflection
                    });
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-bold text-xs shadow transition-all active:scale-95"
                >
                  إنشاء بطاقة الآن
                </button>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                اختر خلفيات من الحرم المكي أو النبوي أو الزخارف الإسلامية الذهبية، وخصص الخطوط، وشارك الخير مع أهلك وأصدقائك بضغطة زر.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: حاسبة الزكاة والمال والصدقات (المنقولة إلى رفيق أثر) */}
      {/* ========================================================================= */}
      {activeSection === 'zakat_charity' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Main Hero Card for Zakat & Charity with Gold Accents */}
          <div className="relative overflow-hidden bg-gradient-to-r from-[#182330] via-[#131B26] to-[#0E151E] border border-[#D4AF37]/45 rounded-3xl p-4 shadow-xl">
            <RotatingCardBackground slot="achievements" cardOffset={3} intervalMs={28000} opacity={0.28} />
            <div className="relative z-10 flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 shadow-inner">
                  <Coins size={22} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-100">
                    حاسبة الزكاة والمال وسجل الصدقات
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    احسب زكاة المال والذهب، ووثق صدقاتك الجارية ونواياها
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setZakatModalInitialTab('zakat');
                  setIsZakatModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-bold text-xs shadow transition-all active:scale-95 flex items-center gap-1"
              >
                <Calculator size={14} />
                <span>الحاسبة الموسعة</span>
              </button>
            </div>

            {/* Quick Summary Cards */}
            <div className="relative z-10 grid grid-cols-2 gap-2 mt-3 text-center">
              <div className="p-3 rounded-xl bg-slate-900/70 border border-[#D4AF37]/20">
                <span className="text-[10px] text-slate-400 block">نصاب زكاة المال (عيار 24)</span>
                <span className="text-xs font-mono font-bold text-[#D4AF37] mt-0.5 block">
                  {nisabValue > 0 ? `${nisabValue.toLocaleString('ar-EG')} ج.م` : '85 جرام ذهب'}
                </span>
              </div>
              <div 
                onClick={() => setZakatSubTab('sadaqah')}
                className="p-3 rounded-xl bg-slate-900/70 border border-[#D4AF37]/20 cursor-pointer hover:border-[#D4AF37]/50 transition-colors"
              >
                <span className="text-[10px] text-slate-400 block">الصدقات الموثقة</span>
                <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5 block">
                  {sadaqahRecords.length} عملية ({totalSadaqahSum.toLocaleString('ar-EG')} ج.م)
                </span>
              </div>
            </div>
          </div>

          {/* Sub-Tabs for Zakat & Charity */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setZakatSubTab('calc')}
              className={`px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                zakatSubTab === 'calc'
                  ? 'bg-[#D4AF37] text-slate-950 shadow'
                  : 'bg-slate-900/70 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Scale size={13} />
              <span>حاسبة زكاة المال والذهب</span>
            </button>

            <button
              onClick={() => setZakatSubTab('sadaqah')}
              className={`px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                zakatSubTab === 'sadaqah'
                  ? 'bg-[#D4AF37] text-slate-950 shadow'
                  : 'bg-slate-900/70 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <HandHeart size={13} />
              <span>سجل الصدقات والنوايا</span>
            </button>
          </div>

          {/* 1. حاسبة الزكاة الذكية التفاعلية المباشرة */}
          {zakatSubTab === 'calc' && (
            <div className="bg-[#121922] border border-[#D4AF37]/35 rounded-2xl p-4 shadow space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-200">البيانات المالية والنصاب:</span>
                <div className="flex items-center gap-1.5 text-[10px] text-[#D4AF37]">
                  <span>سعر جرام الذهب (24):</span>
                  <input
                    type="number"
                    value={goldGramPrice24}
                    onChange={(e) => setGoldGramPrice24(e.target.value)}
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-xs text-[#D4AF37] font-bold"
                  />
                  <span>ج.م</span>
                </div>
              </div>

              {/* Inputs */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">المدخرات والسيولة النقدية</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={cashSavings}
                    onChange={(e) => setCashSavings(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">ذهب الاستثمار (جرام)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={goldGrams}
                    onChange={(e) => setGoldGrams(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">عروض التجارة والأسهم</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={investmentsTrade}
                    onChange={(e) => setInvestmentsTrade(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">الديون المستحقة عليك</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={debtsToDeduct}
                    onChange={(e) => setDebtsToDeduct(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Real-time Calculation Result Box */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-[#D4AF37]/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">صافي الوعاء الزكوي الخاضع للزكاة:</span>
                  <span className="font-bold text-slate-200 font-mono">{netWealth.toLocaleString('ar-EG')} ج.م</span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-100">الزكاة الشرعية الواجبة (2.5%):</span>
                    {hasReachedNisab ? (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">بلغ النصاب ✓</span>
                    ) : (
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">دون النصاب</span>
                    )}
                  </div>
                  <span className="text-sm font-black text-[#D4AF37] font-mono">
                    {zakatDueAmount.toLocaleString('ar-EG')} ج.م
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 2. سجل الصدقات الذكي والمباشر */}
          {zakatSubTab === 'sadaqah' && (
            <div className="bg-[#121922] border border-[#D4AF37]/35 rounded-2xl p-4 shadow space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-200">توثيق صدقة مباركة جديدة:</span>
                <span className="text-[10px] text-emerald-400 font-bold">«ما نقص مال من صدقة»</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="المبلغ (ج.م)..."
                  value={quickSadaqahAmount}
                  onChange={(e) => setQuickSadaqahAmount(e.target.value)}
                  className="w-1/3 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#D4AF37]"
                />
                <select
                  value={quickSadaqahIntention}
                  onChange={(e) => setQuickSadaqahIntention(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="صدقة جارية عن الوالدين">صدقة جارية عن الوالدين</option>
                  <option value="تفريج كربة محتاج">تفريج كربة محتاج</option>
                  <option value="سقيا ماء وإطعام طعام">سقيا ماء وإطعام طعام</option>
                  <option value="شكر لله على نعمة العافية">شكر لله على نعمة العافية</option>
                  <option value="دفع بلاء وشفاء مريض">دفع بلاء وشفاء مريض</option>
                  <option value="كفالة يتيم أو طالب علم">كفالة يتيم أو طالب علم</option>
                </select>
                <button
                  onClick={handleAddQuickSadaqah}
                  className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-bold text-xs rounded-xl shadow active:scale-95 transition-all shrink-0"
                >
                  توثيق
                </button>
              </div>

              {sadaqahSuccessToast && (
                <div className="p-2 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-[11px] text-emerald-300 text-center animate-fadeIn">
                  {sadaqahSuccessToast}
                </div>
              )}

              {/* Records list */}
              <div className="space-y-1.5 pt-1 max-h-52 overflow-y-auto pr-1">
                {sadaqahRecords.length === 0 ? (
                  <p className="text-center text-slate-500 text-xs py-3">لا توجد صدقات مسجلة بعد، ابدأ بتوثيق صدقتك الأولى</p>
                ) : (
                  sadaqahRecords.slice(-5).reverse().map((rec) => (
                    <div key={rec.id} className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-200 block">{rec.intention}</span>
                        <span className="text-[10px] text-slate-400">{new Date(rec.date).toLocaleDateString('ar-EG')}</span>
                      </div>
                      <span className="font-bold font-mono text-emerald-400">{Number(rec.amount).toLocaleString('ar-EG')} {rec.currency}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* Integrated Modals for Detailed Records & Sharing */}
      {/* ========================================================================= */}
      <SakinaAndRightsModal
        isOpen={isSakinaModalOpen}
        onClose={() => {
          setIsSakinaModalOpen(false);
          refreshStats();
        }}
        initialTab={sakinaModalTab}
      />

      <ShareCardModal
        isOpen={Boolean(shareCardPayload)}
        onClose={() => setShareCardPayload(null)}
        initialPayload={shareCardPayload}
      />

      <ZakatAndCharityModal
        isOpen={isZakatModalOpen}
        onClose={() => {
          setIsZakatModalOpen(false);
          refreshStats();
        }}
        initialTab={zakatModalInitialTab}
      />
    </div>
  );
};

export default AtharCompanionView;
