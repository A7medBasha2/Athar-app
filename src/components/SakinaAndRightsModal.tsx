import React, { useState, useEffect } from 'react';
import { 
  X, Heart, BookOpen, Users, Compass, ShieldCheck, Play, Pause, 
  Sparkles, CheckCircle2, Copy, Check, Plus, Trash2, Phone, 
  Send, ExternalLink, Printer, Share2, AlertCircle, FileText, 
  HelpCircle, ChevronLeft, ArrowRight, Clock, Award, ShieldAlert,
  Calendar, Info, RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  HEART_HEALING_PRESCIPTIONS, TADABBUR_SESSIONS, 
  DAILY_INTENTIONS_CATALOG, HeartHealingItem, 
  TadabburSessionItem, STANDARD_WASIYYAH_PREAMBLE 
} from '../data/sakinaAndRightsData';
import { StorageService } from '../services/storageService';
import { AudioService, ActiveAudioState } from '../services/audioService';
import { 
  TadabburProgressState, KinshipParentsState, KinshipContact, 
  DailyIntentionsState, RightsAndWasayaState, RightsRecord, 
  RightsRecordType, IslamicWillDocument 
} from '../types';

export type SakinaTab = 'heart_healing' | 'tadabbur' | 'kinship' | 'intentions' | 'rights_wasiyyah';

interface SakinaAndRightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SakinaTab;
}

export const SakinaAndRightsModal: React.FC<SakinaAndRightsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'heart_healing'
}) => {
  const [activeTab, setActiveTab] = useState<SakinaTab>(initialTab);
  
  // Audio state
  const [activeAudio, setActiveAudio] = useState<ActiveAudioState | null>(null);

  // 1. Heart Healing State
  const [selectedEmotionId, setSelectedEmotionId] = useState<string>('tightness');
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [copiedDuaId, setCopiedDuaId] = useState<string | null>(null);

  // 2. Tadabbur Sessions State
  const [tadabburProgress, setTadabburProgress] = useState<TadabburProgressState>(StorageService.getTadabburProgress());
  const [selectedTadabburId, setSelectedTadabburId] = useState<string>('session_ihsan');

  // 3. Kinship & Parents State
  const [kinshipState, setKinshipState] = useState<KinshipParentsState>(StorageService.getKinshipParentsState());
  const [isAddKinModalOpen, setIsAddKinModalOpen] = useState<boolean>(false);
  const [newKinName, setNewKinName] = useState<string>('');
  const [newKinRelation, setNewKinRelation] = useState<string>('أقارب');
  const [newKinStatus, setNewKinStatus] = useState<'alive' | 'deceased'>('alive');
  const [newKinType, setNewKinType] = useState<'dua' | 'call' | 'visit' | 'sadaqah'>('call');
  const [newKinNotes, setNewKinNotes] = useState<string>('');
  const [kinshipFilter, setKinshipFilter] = useState<'all' | 'alive' | 'deceased'>('all');

  // 4. Daily Intentions State
  const [intentionsState, setIntentionsState] = useState<DailyIntentionsState>(StorageService.getDailyIntentionsState());
  const [intentionCategoryFilter, setIntentionCategoryFilter] = useState<string>('all');

  // 5. Rights & Islamic Will State
  const [rightsState, setRightsState] = useState<RightsAndWasayaState>(StorageService.getRightsAndWasayaState());
  const [rightsSubTab, setRightsSubTab] = useState<'debts' | 'wasiyyah'>('debts');
  const [rightsFilter, setRightsFilter] = useState<'all' | 'debt_on_me' | 'debt_for_me' | 'trust'>('all');
  const [isAddRightModalOpen, setIsAddRightModalOpen] = useState<boolean>(false);
  const [newRightType, setNewRightType] = useState<RightsRecordType>('debt_on_me');
  const [newRightTitle, setNewRightTitle] = useState<string>('');
  const [newRightAmount, setNewRightAmount] = useState<string>('');
  const [newRightPerson, setNewRightPerson] = useState<string>('');
  const [newRightContact, setNewRightContact] = useState<string>('');
  const [newRightDueDate, setNewRightDueDate] = useState<string>('');
  const [newRightNotes, setNewRightNotes] = useState<string>('');
  
  // Wasiyyah Document Editing State
  const [wasiyyahAuthor, setWasiyyahAuthor] = useState<string>('');
  const [wasiyyahPreamble, setWasiyyahPreamble] = useState<string>('');
  const [wasiyyahDirectives, setWasiyyahDirectives] = useState<string>('');
  const [wasiyyahOneThird, setWasiyyahOneThird] = useState<string>('');
  const [wasiyyahWitnesses, setWasiyyahWitnesses] = useState<string>('');
  const [isPreviewWasiyyahOpen, setIsPreviewWasiyyahOpen] = useState<boolean>(false);
  const [copiedWasiyyah, setCopiedWasiyyah] = useState<boolean>(false);

  // Sync initial tab when changed from props
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Audio Subscription
  useEffect(() => {
    const unsub = AudioService.subscribe((state) => {
      setActiveAudio(state);
    });
    return () => unsub();
  }, []);

  // Initialize and reload data from storage
  const reloadAllData = () => {
    const k = StorageService.getKinshipParentsState();
    const t = StorageService.getTadabburProgress();
    const i = StorageService.getDailyIntentionsState();
    const r = StorageService.getRightsAndWasayaState();

    setKinshipState(k);
    setTadabburProgress(t);
    setIntentionsState(i);
    setRightsState(r);

    setWasiyyahAuthor(r.wasiyyah.authorName || '');
    setWasiyyahPreamble(r.wasiyyah.preamble || STANDARD_WASIYYAH_PREAMBLE);
    setWasiyyahDirectives(r.wasiyyah.customDirectives || '');
    setWasiyyahOneThird(r.wasiyyah.bequestOneThirdNotes || '');
    setWasiyyahWitnesses(r.wasiyyah.witnesses || '');
  };

  useEffect(() => {
    if (isOpen) {
      reloadAllData();
    }
  }, [isOpen]);

  // Listen for cross-system backup/import events
  useEffect(() => {
    const handleUpdate = () => reloadAllData();
    window.addEventListener('athar_sakina_updated', handleUpdate);
    return () => window.removeEventListener('athar_sakina_updated', handleUpdate);
  }, []);

  if (!isOpen) return null;

  // Selected heart prescription
  const selectedPrescription = HEART_HEALING_PRESCIPTIONS.find(
    (h) => h.id === selectedEmotionId
  ) || HEART_HEALING_PRESCIPTIONS[0];

  // Selected tadabbur session
  const selectedSession = TADABBUR_SESSIONS.find(
    (s) => s.id === selectedTadabburId
  ) || TADABBUR_SESSIONS[0];

  // Confetti helper
  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch {}
  };

  // Play Ayah Audio Handler
  const handlePlayAyah = (surahNumber: number, ayahNumber: number) => {
    const isThisPlaying =
      activeAudio?.category === 'quran' &&
      activeAudio?.surahNumber === surahNumber &&
      activeAudio?.ayahNumber === ayahNumber &&
      activeAudio?.isPlaying;

    if (isThisPlaying) {
      AudioService.pause();
    } else {
      AudioService.playQuranContinuous(surahNumber, ayahNumber);
    }
  };

  // Copy helper
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedDuaId(id);
    setTimeout(() => setCopiedDuaId(null), 2500);
  };

  // Save Wasiyyah Document
  const handleSaveWasiyyah = () => {
    const updated = StorageService.updateWasiyyahDocument({
      authorName: wasiyyahAuthor,
      preamble: wasiyyahPreamble,
      customDirectives: wasiyyahDirectives,
      bequestOneThirdNotes: wasiyyahOneThird,
      witnesses: wasiyyahWitnesses
    });
    setRightsState((prev) => ({ ...prev, wasiyyah: updated }));
    triggerCelebration();
  };

  // Generate full text document for Islamic Will
  const generateFullWasiyyahText = (): string => {
    const w = rightsState.wasiyyah;
    const authorLine = wasiyyahAuthor.trim() ? `الموصي: ${wasiyyahAuthor}` : '';
    const dateLine = `تاريخ التوثيق: ${new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}`;
    
    // Active debts section
    const activeDebtsOnMe = rightsState.records.filter((r) => r.type === 'debt_on_me' && !r.isFulfilled);
    const activeTrusts = rightsState.records.filter((r) => r.type === 'trust' && !r.isFulfilled);
    
    let debtsSection = '\n\n【 كشف الديون الواجب سدادها قبل قسمة التركة 】\n';
    if (activeDebtsOnMe.length === 0) {
      debtsSection += '• لا توجد ديون معلقة مسجلة بفضل الله.\n';
    } else {
      activeDebtsOnMe.forEach((d, idx) => {
        debtsSection += `${idx + 1}. لصالح: ${d.personName} | المبلغ: ${d.amountOrDescription} | البيان: ${d.title} ${d.contactOrLocation ? `(${d.contactOrLocation})` : ''}\n`;
      });
    }

    let trustsSection = '\n【 الأمانات والودائع الواجب ردها لأصحابها 】\n';
    if (activeTrusts.length === 0) {
      trustsSection += '• لا توجد أمانات مودعة مسجلة بفضل الله.\n';
    } else {
      activeTrusts.forEach((t, idx) => {
        trustsSection += `${idx + 1}. لصالح: ${t.personName} | الأمانة: ${t.amountOrDescription} | ${t.title}\n`;
      });
    }

    let directivesSection = '\n【 الوصايا الخاصة والتوجيهات للأهل والذرية 】\n';
    directivesSection += wasiyyahDirectives.trim() ? wasiyyahDirectives : 'الوصية بتقوى الله في السر والعلن وإصلاح ذات البين والمحافظة على الصلوات.\n';

    let thirdSection = '';
    if (wasiyyahOneThird.trim()) {
      thirdSection = `\n【 الوصية بالثلث في أوجه البر والصدقة الجارية 】\n${wasiyyahOneThird}\n`;
    }

    let witnessSection = '';
    if (wasiyyahWitnesses.trim()) {
      witnessSection = `\n【 الشهود والمصادقة 】\n${wasiyyahWitnesses}\n`;
    }

    return `${wasiyyahPreamble}\n\n${authorLine}\n${dateLine}${debtsSection}${trustsSection}${directivesSection}${thirdSection}${witnessSection}\n\nحرر بنقاء قلب ورجاء رحمة الله وعفوه.`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0C1015] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] h-full text-right font-arabic">
        
        {/* Top Header Bar */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-800/80 bg-gradient-to-r from-[#121820] via-[#0E141B] to-[#121820] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#D4AF37]/25 to-emerald-500/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shrink-0 shadow-md">
              <Sparkles size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2 truncate">
                <span>واحة السكينة والحقوق</span>
                <span className="text-[10px] font-normal bg-[#D4AF37]/15 text-[#D4AF37] px-2 py-0.5 rounded-full border border-[#D4AF37]/30 hidden sm:inline-block">
                  رفيق الحياة الإيمانية
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                تلاوة وتدبر · بر وأرحام · تجديد النوايا · سجل الديون والوصية
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors shrink-0"
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="shrink-0 bg-[#0B0F13] px-2 py-1.5 border-b border-slate-800 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'heart_healing' as SakinaTab, label: 'علاج القلوب', icon: Heart, count: undefined },
            { id: 'tadabbur' as SakinaTab, label: 'خلوة التدبر والعمل', icon: BookOpen, count: tadabburProgress.streakDays > 0 ? `${tadabburProgress.streakDays}ي` : undefined },
            { id: 'kinship' as SakinaTab, label: 'بر الوالدين والأرحام', icon: Users, count: kinshipState.contacts.length },
            { id: 'intentions' as SakinaTab, label: 'مفكرة النوايا', icon: Compass, count: intentionsState.selectedIds.length },
            { id: 'rights_wasiyyah' as SakinaTab, label: 'دفتر الحقوق والوصية', icon: ShieldCheck, count: rightsState.records.filter(r => !r.isFulfilled).length || undefined },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#D4AF37] text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-slate-900/30 text-slate-950' : 'bg-slate-800 text-[#D4AF37]'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Scrollable Tab Content Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
          
          {/* ========================================================================= */}
          {/* TAB 1: علاج القلوب بحسب حالتك النفسية */}
          {/* ========================================================================= */}
          {activeTab === 'heart_healing' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-amber-950/25 via-slate-900/50 to-slate-900/40 p-3.5 rounded-2xl border border-amber-500/25 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                    <Heart size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-100">كيف تجد قلبك اليوم؟</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">اختر شعورك لتحصل على روشتة القرآن والسنة المباشرة</p>
                  </div>
                </div>
              </div>

              {/* Emotions Selector Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {HEART_HEALING_PRESCIPTIONS.map((item) => {
                  const isSelected = selectedEmotionId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedEmotionId(item.id)}
                      className={`p-2.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? 'bg-[#18212C] border-[#D4AF37] shadow-md ring-1 ring-[#D4AF37]/50'
                          : 'bg-[#10151C] border-slate-800/80 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-100 block">
                        {item.emotionTitle}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate block">
                        {item.emotionSubtitle}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Prescription Card */}
              <div className="relative overflow-hidden bg-gradient-to-b from-[#131B24] to-[#0E141B] border border-[#D4AF37]/35 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-[#D4AF37] block">
                      روشتة السكينة القرآنية لـ:
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-100 mt-0.5">
                      {selectedPrescription.emotionTitle}
                    </h3>
                  </div>
                  <span className={`text-[11px] px-2.5 py-1 rounded-xl border font-semibold ${selectedPrescription.colorTheme.badge}`}>
                    {selectedPrescription.emotionSubtitle}
                  </span>
                </div>

                {/* Quran Verse Audio Box */}
                <div className="bg-[#090D11] border border-slate-800/90 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#D4AF37] font-semibold">
                    <span className="flex items-center gap-1.5">
                      <BookOpen size={14} />
                      <span>آية الشفاء والسكينة القلبيّة</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      سورة {selectedPrescription.verse.surahName} · الآية {selectedPrescription.verse.ayahNumber}
                    </span>
                  </div>

                  <p className="font-quran text-lg sm:text-xl text-slate-100 leading-loose text-center py-1">
                    ﴿{selectedPrescription.verse.arabicText}﴾
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                    <button
                      onClick={() => handlePlayAyah(selectedPrescription.verse.surahNumber, selectedPrescription.verse.ayahNumber)}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                        activeAudio?.category === 'quran' &&
                        activeAudio?.surahNumber === selectedPrescription.verse.surahNumber &&
                        activeAudio?.ayahNumber === selectedPrescription.verse.ayahNumber &&
                        activeAudio?.isPlaying
                          ? 'bg-[#D4AF37] text-slate-950 shadow'
                          : 'bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#D4AF37] border border-[#D4AF37]/40'
                      }`}
                    >
                      {activeAudio?.category === 'quran' &&
                      activeAudio?.surahNumber === selectedPrescription.verse.surahNumber &&
                      activeAudio?.ayahNumber === selectedPrescription.verse.ayahNumber &&
                      activeAudio?.isPlaying ? (
                        <>
                          <Pause size={13} fill="currentColor" />
                          <span>إيقاف التلاوة</span>
                        </>
                      ) : (
                        <>
                          <Play size={13} fill="currentColor" />
                          <span>استماع للتلاوة العذبة</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleCopyText(`﴿${selectedPrescription.verse.arabicText}﴾ [سورة ${selectedPrescription.verse.surahName}: ${selectedPrescription.verse.ayahNumber}]`, `verse_${selectedPrescription.id}`)}
                      className="p-1.5 text-slate-400 hover:text-[#D4AF37] transition-colors"
                      title="نسخ الآية"
                    >
                      {copiedDuaId === `verse_${selectedPrescription.id}` ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                    </button>
                  </div>
                </div>

                {/* Heart Reflection Summary */}
                <div className="bg-[#10161E]/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-1.5">
                  <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Sparkles size={13} />
                    <span>خلاصة التدبر القلبي</span>
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedPrescription.reflection}
                  </p>
                </div>

                {/* Prophetic Dua */}
                <div className="bg-[#10161E]/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Heart size={13} />
                      <span>الدعاء النبوي المأثور</span>
                    </h4>
                    <button
                      onClick={() => handleCopyText(`${selectedPrescription.propheticDua.arabicText}\n(${selectedPrescription.propheticDua.source})`, `dua_${selectedPrescription.id}`)}
                      className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
                    >
                      {copiedDuaId === `dua_${selectedPrescription.id}` ? (
                        <>
                          <Check size={12} className="text-emerald-400" />
                          <span className="text-emerald-400">تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>نسخ الدعاء</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="font-quran text-sm sm:text-base text-slate-200 leading-loose">
                    «{selectedPrescription.propheticDua.arabicText}»
                  </p>
                  <p className="text-[10px] text-slate-400">
                    المصدر: {selectedPrescription.propheticDua.source}
                  </p>
                </div>

                {/* Practical Action Deed */}
                <div className="bg-gradient-to-r from-emerald-950/30 to-slate-900/60 border border-emerald-500/35 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        خطوة عملية الآن لتفريج الكرب
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-100">
                      {selectedPrescription.practicalStep.title}
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      {selectedPrescription.practicalStep.description}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const next = !completedSteps[selectedPrescription.id];
                      setCompletedSteps({ ...completedSteps, [selectedPrescription.id]: next });
                      if (next) triggerCelebration();
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 active:scale-95 ${
                      completedSteps[selectedPrescription.id]
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    <CheckCircle2 size={14} />
                    <span>
                      {completedSteps[selectedPrescription.id] ? 'تم إنجاز الخطوة بنجاح ✓' : selectedPrescription.practicalStep.actionLabel}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: خلوة التدبر والعمل بالآية */}
          {/* ========================================================================= */}
          {activeTab === 'tadabbur' && (
            <div className="space-y-4">
              {/* Streak Banner */}
              <div className="bg-gradient-to-r from-[#17222F] to-[#101720] border border-[#D4AF37]/30 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                    <Award size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-100">
                      خلوات السكينة والتدبر الصوتي (٣–٥ دقائق)
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      استماع خاشع · رسالة الآية لقلبك · أثر الآية العملي في يومك
                    </p>
                  </div>
                </div>

                <div className="text-center bg-[#0B0F13] px-3 py-1.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">المواظبة</span>
                  <span className="text-xs font-bold text-[#D4AF37] font-mono">
                    {tadabburProgress.streakDays} أيام
                  </span>
                </div>
              </div>

              {/* Sessions Selector Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TADABBUR_SESSIONS.map((session) => {
                  const isSelected = selectedTadabburId === session.id;
                  const isDone = tadabburProgress.completedSessionIds.includes(session.id);
                  return (
                    <button
                      key={session.id}
                      onClick={() => setSelectedTadabburId(session.id)}
                      className={`p-2.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? 'bg-[#18212C] border-[#D4AF37] shadow ring-1 ring-[#D4AF37]/50'
                          : 'bg-[#10151C] border-slate-800/80 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] font-mono text-slate-400">
                          {session.estimatedMinutes} د
                        </span>
                        {isDone && <CheckCircle2 size={13} className="text-emerald-400" />}
                      </div>
                      <span className="text-xs font-bold text-slate-100 block">
                        {session.title}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Session Content */}
              <div className="bg-gradient-to-b from-[#131B24] to-[#0E141B] border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-100">
                      {selectedSession.title}
                    </h3>
                    <p className="text-[11px] text-[#D4AF37] mt-0.5">
                      {selectedSession.theme}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                    جلسة {selectedSession.estimatedMinutes} دقائق
                  </span>
                </div>

                {/* Verse Recitation */}
                <div className="bg-[#090D11] border border-slate-800/90 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#D4AF37] font-semibold">
                    <span className="flex items-center gap-1.5">
                      <BookOpen size={14} />
                      <span>الآية محور الخلوة</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      سورة {selectedSession.verse.surahName} · الآية {selectedSession.verse.ayahNumber}
                    </span>
                  </div>

                  <p className="font-quran text-lg sm:text-xl text-slate-100 leading-loose text-center py-1">
                    ﴿{selectedSession.verse.arabicText}﴾
                  </p>

                  <div className="flex items-center justify-center pt-2 border-t border-slate-800/60">
                    <button
                      onClick={() => handlePlayAyah(selectedSession.verse.surahNumber, selectedSession.verse.ayahNumber)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                        activeAudio?.category === 'quran' &&
                        activeAudio?.surahNumber === selectedSession.verse.surahNumber &&
                        activeAudio?.ayahNumber === selectedSession.verse.ayahNumber &&
                        activeAudio?.isPlaying
                          ? 'bg-[#D4AF37] text-slate-950 shadow'
                          : 'bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#D4AF37] border border-[#D4AF37]/40'
                      }`}
                    >
                      {activeAudio?.category === 'quran' &&
                      activeAudio?.surahNumber === selectedSession.verse.surahNumber &&
                      activeAudio?.ayahNumber === selectedSession.verse.ayahNumber &&
                      activeAudio?.isPlaying ? (
                        <>
                          <Pause size={14} fill="currentColor" />
                          <span>إيقاف الاستماع</span>
                        </>
                      ) : (
                        <>
                          <Play size={14} fill="currentColor" />
                          <span>استماع خاشع للآية</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Heart Message */}
                <div className="bg-[#10161E]/90 border border-slate-800/80 rounded-2xl p-3.5 space-y-1.5">
                  <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Heart size={13} />
                    <span>رسالة الآية لقلبك</span>
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedSession.heartMessage}
                  </p>
                </div>

                {/* Self Reflection */}
                <div className="bg-[#10161E]/90 border border-slate-800/80 rounded-2xl p-3.5 space-y-1.5">
                  <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                    <HelpCircle size={13} />
                    <span>وقفة محاسبة وتأمل</span>
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedSession.selfReflectionQuestion}
                  </p>
                </div>

                {/* Practical Deed & Commitment */}
                <div className="bg-gradient-to-r from-emerald-950/35 to-slate-900/60 border border-emerald-500/40 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      أثر الآية العملي اليوم
                    </span>
                    <span className="text-[11px] text-slate-400">
                      العمل بالقرآن
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {selectedSession.dailyActionDeed}
                  </p>

                  <button
                    onClick={() => {
                      const updated = StorageService.toggleTadabburSession(selectedSession.id);
                      setTadabburProgress(updated);
                      if (updated.completedSessionIds.includes(selectedSession.id)) {
                        triggerCelebration();
                      }
                    }}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-98 ${
                      tadabburProgress.completedSessionIds.includes(selectedSession.id)
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                        : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    <CheckCircle2 size={15} />
                    <span>
                      {tadabburProgress.completedSessionIds.includes(selectedSession.id)
                        ? 'التزمت بأثر الآية اليوم ✓ (تم التسجيل)'
                        : 'عقدت العزم والتزمت بأثر الآية اليوم'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: ميثاق بر الوالدين وصلة الرحم والدعاء لمن تحب */}
          {/* ========================================================================= */}
          {activeTab === 'kinship' && (
            <div className="space-y-4">
              {/* Parents Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Father Card */}
                <div className="bg-gradient-to-b from-[#141C25] to-[#0E141B] border border-amber-500/30 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-400">الوالد الكريم</h4>
                    <select
                      value={kinshipState.fatherStatus}
                      onChange={(e) => {
                        const next = { ...kinshipState, fatherStatus: e.target.value as 'alive' | 'deceased' };
                        setKinshipState(next);
                        StorageService.saveKinshipParentsState(next);
                      }}
                      className="bg-[#0B0F13] text-slate-300 border border-slate-800 rounded-xl px-2 py-1 text-[11px] font-semibold"
                    >
                      <option value="alive">على قيد الحياة حفظه الله</option>
                      <option value="deceased">رحمه الله وغفر له</option>
                    </select>
                  </div>

                  <p className="font-quran text-sm text-slate-200 leading-relaxed text-center py-1">
                    {kinshipState.fatherStatus === 'alive'
                      ? '﴿رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا﴾'
                      : '﴿رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ﴾'}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-400">
                      {kinshipState.fatherLastDuaDate ? `آخر دعاء: ${kinshipState.fatherLastDuaDate}` : 'لم يسجل اليوم'}
                    </span>
                    <button
                      onClick={() => {
                        StorageService.recordParentDua('father');
                        setKinshipState(StorageService.getKinshipParentsState());
                        triggerCelebration();
                      }}
                      className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/35 text-[11px] font-bold"
                    >
                      دعوت لوالدي الآن ✓
                    </button>
                  </div>
                </div>

                {/* Mother Card */}
                <div className="bg-gradient-to-b from-[#141C25] to-[#0E141B] border border-rose-500/30 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-rose-400">الوالدة الحبيبة</h4>
                    <select
                      value={kinshipState.motherStatus}
                      onChange={(e) => {
                        const next = { ...kinshipState, motherStatus: e.target.value as 'alive' | 'deceased' };
                        setKinshipState(next);
                        StorageService.saveKinshipParentsState(next);
                      }}
                      className="bg-[#0B0F13] text-slate-300 border border-slate-800 rounded-xl px-2 py-1 text-[11px] font-semibold"
                    >
                      <option value="alive">على قيد الحياة حفظها الله</option>
                      <option value="deceased">رحمها الله وأسكنها الفردوس</option>
                    </select>
                  </div>

                  <p className="font-quran text-sm text-slate-200 leading-relaxed text-center py-1">
                    {kinshipState.motherStatus === 'alive'
                      ? '﴿وَوَصَّيْنَا الْإِنسَانَ بِوَالِدَيْهِ حَمَلَتْهُ أُمُّهُ وَهْنًا عَلَىٰ وَهْنٍ﴾'
                      : '«اللَّهُمَّ اغْفِرْ لِأُمِّي وَارْفَعْ دَرَجَتَهَا فِي الْمَهْدِيِّينَ وَأَخْلِفْهَا فِي عَقِبِهَا فِي الْغَابِرِينَ»'}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-400">
                      {kinshipState.motherLastDuaDate ? `آخر دعاء: ${kinshipState.motherLastDuaDate}` : 'لم يسجل اليوم'}
                    </span>
                    <button
                      onClick={() => {
                        StorageService.recordParentDua('mother');
                        setKinshipState(StorageService.getKinshipParentsState());
                        triggerCelebration();
                      }}
                      className="px-2.5 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/35 text-[11px] font-bold"
                    >
                      دعوت لوالدتي الآن ✓
                    </button>
                  </div>
                </div>
              </div>

              {/* Kinship & Loved Ones List Header */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <Users size={14} className="text-[#D4AF37]" />
                    <span>سجل صلة الرحم والدعاء لمن تحب ({kinshipState.contacts.length})</span>
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsAddKinModalOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-bold text-[11px] shadow"
                  >
                    <Plus size={13} />
                    <span>إضافة قريب أو حبيب</span>
                  </button>
                </div>
              </div>

              {/* Kinship Contacts List */}
              <div className="space-y-2">
                {kinshipState.contacts.length === 0 ? (
                  <div className="text-center py-8 bg-[#10151C] rounded-2xl border border-slate-800/80 p-4">
                    <Users size={28} className="mx-auto text-slate-600 mb-2" />
                    <p className="text-xs text-slate-400">لا يوجد أرحام مضافون في السجل بعد.</p>
                    <button
                      onClick={() => setIsAddKinModalOpen(true)}
                      className="mt-3 px-3 py-1.5 bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 rounded-xl text-xs font-bold"
                    >
                      إضافة الأرحام والأصدقاء للدعاء والصلة
                    </button>
                  </div>
                ) : (
                  kinshipState.contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="bg-[#121820]/90 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-3 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-100 truncate">
                            {contact.name}
                          </h4>
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                            {contact.relationship}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            contact.status === 'alive' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700/50 text-slate-400'
                          }`}>
                            {contact.status === 'alive' ? 'حي' : 'رحمه الله'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          آخر تواصل/دعاء: {contact.lastInteractionDate} · مرات الصلة: {contact.interactionCount}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            StorageService.recordKinshipInteraction(contact.id);
                            setKinshipState(StorageService.getKinshipParentsState());
                            triggerCelebration();
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/35 text-[11px] font-bold flex items-center gap-1"
                        >
                          <Check size={12} />
                          <span>وصلت اليوم</span>
                        </button>
                        <button
                          onClick={() => {
                            StorageService.deleteKinshipContact(contact.id);
                            setKinshipState(StorageService.getKinshipParentsState());
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                          title="حذف"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Kinship Modal */}
              {isAddKinModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-[#121820] border border-slate-700 rounded-3xl p-5 w-full max-w-sm space-y-3.5 text-right font-arabic shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <h3 className="text-sm font-bold text-slate-100">إضافة شخص لصلة الرحم والدعاء</h3>
                      <button onClick={() => setIsAddKinModalOpen(false)} className="text-slate-400 hover:text-slate-100">
                        <X size={18} />
                      </button>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">الاسم الكريم</label>
                        <input
                          type="text"
                          value={newKinName}
                          onChange={(e) => setNewKinName(e.target.value)}
                          placeholder="مثلاً: خالي محمد، أختي فاطمة، عمي أحمد"
                          className="w-full bg-[#0B0F13] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">صلة القرابة</label>
                          <input
                            type="text"
                            value={newKinRelation}
                            onChange={(e) => setNewKinRelation(e.target.value)}
                            placeholder="أخ، عم، خال، صديق"
                            className="w-full bg-[#0B0F13] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-[#D4AF37]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">الحالة</label>
                          <select
                            value={newKinStatus}
                            onChange={(e) => setNewKinStatus(e.target.value as 'alive' | 'deceased')}
                            className="w-full bg-[#0B0F13] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-[#D4AF37]"
                          >
                            <option value="alive">على قيد الحياة</option>
                            <option value="deceased">متوفى رحمه الله</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">نوع الصلة المفضل</label>
                        <select
                          value={newKinType}
                          onChange={(e) => setNewKinType(e.target.value as any)}
                          className="w-full bg-[#0B0F13] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-[#D4AF37]"
                        >
                          <option value="call">اتصال هاتفي</option>
                          <option value="visit">زيارة شخصية</option>
                          <option value="dua">دعاء بظهر الغيب</option>
                          <option value="sadaqah">صدقة جارية</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">ملاحظة أو تذكير (اختياري)</label>
                        <input
                          type="text"
                          value={newKinNotes}
                          onChange={(e) => setNewKinNotes(e.target.value)}
                          placeholder="مثلاً: الاتصال مساء كل جمعة"
                          className="w-full bg-[#0B0F13] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => {
                          if (!newKinName.trim()) return;
                          StorageService.addKinshipContact({
                            name: newKinName.trim(),
                            relationship: newKinRelation.trim() || 'قريب',
                            status: newKinStatus,
                            preferredType: newKinType,
                            notes: newKinNotes.trim() || undefined
                          });
                          setKinshipState(StorageService.getKinshipParentsState());
                          setNewKinName('');
                          setIsAddKinModalOpen(false);
                          triggerCelebration();
                        }}
                        disabled={!newKinName.trim()}
                        className="flex-1 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-bold text-xs shadow disabled:opacity-50"
                      >
                        حفظ القريب
                      </button>
                      <button
                        onClick={() => setIsAddKinModalOpen(false)}
                        className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: مفكرة النوايا اليومية (تجدد النية) */}
          {/* ========================================================================= */}
          {activeTab === 'intentions' && (
            <div className="space-y-4">
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-emerald-950/30 via-slate-900/60 to-slate-900/40 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <Compass size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-100">
                      مفكرة النوايا: حوّل عاداتك وسعيك إلى عبادات
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      عقدت {intentionsState.selectedIds.length} نوايا صالحة اليوم · العمل بالنية يضاعف الأجر
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const allIds = DAILY_INTENTIONS_CATALOG.map(c => c.id);
                    const next = {
                      selectedIds: allIds,
                      lastPledgedDate: new Date().toISOString().split('T')[0],
                      totalPledgesCount: intentionsState.totalPledgesCount + allIds.length
                    };
                    StorageService.saveDailyIntentionsState(next);
                    setIntentionsState(next);
                    triggerCelebration();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold shrink-0"
                >
                  عقد كافة النوايا ↻
                </button>
              </div>

              {/* Intentions List */}
              <div className="space-y-2.5">
                {DAILY_INTENTIONS_CATALOG.map((item) => {
                  const isChecked = intentionsState.selectedIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        const updated = StorageService.toggleDailyIntention(item.id);
                        setIntentionsState(updated);
                        if (updated.selectedIds.includes(item.id)) triggerCelebration();
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 select-none ${
                        isChecked
                          ? 'bg-gradient-to-r from-emerald-950/20 to-[#121A22] border-emerald-500/45 shadow-sm'
                          : 'bg-[#10151C] border-slate-800/80 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            isChecked ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {item.categoryLabel}
                          </span>
                          <h4 className={`text-xs font-bold truncate ${isChecked ? 'text-slate-100' : 'text-slate-300'}`}>
                            {item.title}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {item.intentionText}
                        </p>
                        <p className="font-quran text-xs text-[#D4AF37] pt-1">
                          {item.proofText}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          المصدر: {item.source}
                        </p>
                      </div>

                      <div className={`w-6 h-6 rounded-xl border flex items-center justify-center shrink-0 mt-1 transition-colors ${
                        isChecked
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow'
                          : 'bg-[#0B0F13] border-slate-700 text-transparent'
                      }`}>
                        <Check size={14} strokeWidth={3} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: دفتر الحقوق والوصية الشرعية وسجل الديون والأمانات */}
          {/* ========================================================================= */}
          {activeTab === 'rights_wasiyyah' && (
            <div className="space-y-4">
              {/* Sub-Tabs: Debts & Trusts vs Islamic Will Document */}
              <div className="bg-[#0B0F13] p-1 rounded-2xl border border-slate-800 flex items-center gap-1">
                <button
                  onClick={() => setRightsSubTab('debts')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    rightsSubTab === 'debts'
                      ? 'bg-[#D4AF37] text-slate-950 shadow font-extrabold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  سجل الديون والأمانات والحقوق ({rightsState.records.filter(r => !r.isFulfilled).length})
                </button>
                <button
                  onClick={() => setRightsSubTab('wasiyyah')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    rightsSubTab === 'wasiyyah'
                      ? 'bg-[#D4AF37] text-slate-950 shadow font-extrabold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  وثيقة الوصية الشرعية وبراءة الذمة
                </button>
              </div>

              {/* Sub-tab 1: Debts and Trusts */}
              {rightsSubTab === 'debts' && (
                <div className="space-y-3.5">
                  {/* Hadith Reminder Banner */}
                  <div className="bg-gradient-to-r from-amber-950/25 to-slate-900/40 border border-amber-500/25 rounded-2xl p-3 flex items-center justify-between gap-3">
                    <p className="font-quran text-xs text-amber-300 leading-relaxed">
                      «مَا حَقُّ امْرِئٍ مُسْلِمٍ لَهُ شَيْءٌ يُوصِي فِيهِ يَبِيتُ لَيْلَتَيْنِ إِلَّا وَوَصِيَّتُهُ مَكْتُوبَةٌ عِنْدَهُ»
                    </p>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">صحيح البخاري</span>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="bg-[#121820] border border-rose-500/30 rounded-2xl p-3">
                      <span className="text-[10px] font-bold text-rose-400 block">ديون عليّ للغير</span>
                      <span className="text-base font-bold text-slate-100 font-mono block mt-0.5">
                        {rightsState.records.filter(r => r.type === 'debt_on_me' && !r.isFulfilled).length} ديون معلقة
                      </span>
                    </div>

                    <div className="bg-[#121820] border border-emerald-500/30 rounded-2xl p-3">
                      <span className="text-[10px] font-bold text-emerald-400 block">ديون لي عند الغير</span>
                      <span className="text-base font-bold text-slate-100 font-mono block mt-0.5">
                        {rightsState.records.filter(r => r.type === 'debt_for_me' && !r.isFulfilled).length} ديون لي
                      </span>
                    </div>

                    <div className="bg-[#121820] border border-indigo-500/30 rounded-2xl p-3 col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-bold text-indigo-400 block">أمانات وودائع</span>
                      <span className="text-base font-bold text-slate-100 font-mono block mt-0.5">
                        {rightsState.records.filter(r => r.type === 'trust' && !r.isFulfilled).length} أمانة
                      </span>
                    </div>
                  </div>

                  {/* Actions Header */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 text-[11px] overflow-x-auto no-scrollbar">
                      {[
                        { id: 'all', label: 'الكل' },
                        { id: 'debt_on_me', label: 'ديون عليّ' },
                        { id: 'debt_for_me', label: 'ديون لي' },
                        { id: 'trust', label: 'أمانات' }
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setRightsFilter(f.id as any)}
                          className={`px-2.5 py-1 rounded-xl font-bold transition-all shrink-0 ${
                            rightsFilter === f.id
                              ? 'bg-slate-800 text-[#D4AF37] border border-[#D4AF37]/30'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setIsAddRightModalOpen(true)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-bold text-xs shadow shrink-0"
                    >
                      <Plus size={13} />
                      <span>إضافة حق / دين</span>
                    </button>
                  </div>

                  {/* Rights List */}
                  <div className="space-y-2">
                    {rightsState.records
                      .filter((r) => rightsFilter === 'all' || r.type === rightsFilter)
                      .map((record) => (
                        <div
                          key={record.id}
                          className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                            record.isFulfilled
                              ? 'bg-[#0E1318]/60 border-slate-800/60 opacity-70'
                              : 'bg-[#121820] border-slate-800'
                          }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                record.type === 'debt_on_me'
                                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                  : record.type === 'debt_for_me'
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                              }`}>
                                {record.type === 'debt_on_me' ? 'دين عليّ' : record.type === 'debt_for_me' ? 'دين لي' : 'أمانة/وديعة'}
                              </span>
                              <h4 className={`text-xs font-bold truncate ${record.isFulfilled ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                                {record.title}
                              </h4>
                            </div>

                            <p className="text-xs font-mono font-bold text-[#D4AF37]">
                              {record.amountOrDescription} · لصالح/عند: {record.personName}
                            </p>

                            {record.contactOrLocation && (
                              <p className="text-[10px] text-slate-400">
                                التواصل / المكان: {record.contactOrLocation}
                              </p>
                            )}

                            {record.dueDate && (
                              <p className="text-[10px] text-slate-400">
                                موعد الاستحقاق: {record.dueDate}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 mt-1">
                            <button
                              onClick={() => {
                                StorageService.toggleRightsRecordFulfilled(record.id);
                                setRightsState(StorageService.getRightsAndWasayaState());
                                triggerCelebration();
                              }}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                                record.isFulfilled
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              {record.isFulfilled ? 'تم الوفاء ✓' : 'إبراء الذمة'}
                            </button>
                            <button
                              onClick={() => {
                                StorageService.deleteRightsRecord(record.id);
                                setRightsState(StorageService.getRightsAndWasayaState());
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-400"
                              title="حذف"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Privacy Badge */}
                  <div className="bg-[#0B0F13] p-3 rounded-2xl border border-slate-800 text-center text-[11px] text-slate-400">
                    🔒 جميع السجلات والديون والوصايا محفوظة محلياً على جهازك بخصوصية تامة 100% ولا ترفع لأي خادم.
                  </div>
                </div>
              )}

              {/* Sub-tab 2: Islamic Will Document */}
              {rightsSubTab === 'wasiyyah' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-[#151F2A] to-[#0E151E] border border-[#D4AF37]/35 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <h3 className="text-xs font-bold text-[#D4AF37] flex items-center gap-1.5">
                        <FileText size={15} />
                        <span>تحرير وثيقة الوصية الشرعية وبراءة الذمة</span>
                      </h3>
                      <span className="text-[10px] text-slate-400">
                        آخر تحديث: {rightsState.wasiyyah.lastUpdated}
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block text-[11px] text-slate-300 font-bold mb-1">اسم الموصي كاملاً</label>
                        <input
                          type="text"
                          value={wasiyyahAuthor}
                          onChange={(e) => setWasiyyahAuthor(e.target.value)}
                          placeholder="اكتب اسمك الثلاثي أو الرباعي..."
                          className="w-full bg-[#0B0F13] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-300 font-bold mb-1">مقدمة الوصية الشرعية والمأثور</label>
                        <textarea
                          rows={4}
                          value={wasiyyahPreamble}
                          onChange={(e) => setWasiyyahPreamble(e.target.value)}
                          className="w-full bg-[#0B0F13] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 font-quran leading-relaxed focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-300 font-bold mb-1">توجيهات ووصايا خاصة للأهل والأولاد</label>
                        <textarea
                          rows={3}
                          value={wasiyyahDirectives}
                          onChange={(e) => setWasiyyahDirectives(e.target.value)}
                          placeholder="مثلاً: الوصية بصلة الرحم، عدم النياحة، توزيع الصدقات، وأي توجيه للأولاد..."
                          className="w-full bg-[#0B0F13] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-300 font-bold mb-1">الوصية بالثلث للصدقة الجارية (اختياري)</label>
                        <input
                          type="text"
                          value={wasiyyahOneThird}
                          onChange={(e) => setWasiyyahOneThird(e.target.value)}
                          placeholder="مثلاً: ثلث التركة في كفالة أيتام أو حفر بئر أو وقف تعليمي..."
                          className="w-full bg-[#0B0F13] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-300 font-bold mb-1">الشهود أو الموصى إليهم (اختياري)</label>
                        <input
                          type="text"
                          value={wasiyyahWitnesses}
                          onChange={(e) => setWasiyyahWitnesses(e.target.value)}
                          placeholder="أسماء الشهود وتوقيعهم أو أرقام هواتفهم..."
                          className="w-full bg-[#0B0F13] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={handleSaveWasiyyah}
                        className="px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-bold text-xs shadow"
                      >
                        حفظ التعديلات ✓
                      </button>

                      <button
                        onClick={() => setIsPreviewWasiyyahOpen(true)}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Printer size={13} />
                        <span>معاينة وتصدير الوثيقة</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Add Right Modal */}
              {isAddRightModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-[#121820] border border-slate-700 rounded-3xl p-5 w-full max-w-sm space-y-3.5 text-right font-arabic shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <h3 className="text-sm font-bold text-slate-100">توثيق دين أو أمانة أو حق</h3>
                      <button onClick={() => setIsAddRightModalOpen(false)} className="text-slate-400 hover:text-slate-100">
                        <X size={18} />
                      </button>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">نوع الحق</label>
                        <select
                          value={newRightType}
                          onChange={(e) => setNewRightType(e.target.value as any)}
                          className="w-full bg-[#0B0F13] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-[#D4AF37]"
                        >
                          <option value="debt_on_me">دين عليّ للغير (واجب السداد)</option>
                          <option value="debt_for_me">دين لي عند الغير</option>
                          <option value="trust">أمانة أو وديعة في عهدتي</option>
                          <option value="moral_right">حق معنوي أو اعتذار واجب</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">وصف الحق أو البيان</label>
                        <input
                          type="text"
                          value={newRightTitle}
                          onChange={(e) => setNewRightTitle(e.target.value)}
                          placeholder="مثلاً: قرض شخصي، قسط متأخر، مغلف أمانة"
                          className="w-full bg-[#0B0F13] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">المبلغ أو الشيء</label>
                          <input
                            type="text"
                            value={newRightAmount}
                            onChange={(e) => setNewRightAmount(e.target.value)}
                            placeholder="مثلاً: ١٠٠٠ ج.م"
                            className="w-full bg-[#0B0F13] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-[#D4AF37]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">صاحب الحق</label>
                          <input
                            type="text"
                            value={newRightPerson}
                            onChange={(e) => setNewRightPerson(e.target.value)}
                            placeholder="اسم الشخص أو الجهة"
                            className="w-full bg-[#0B0F13] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-[#D4AF37]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">رقم هاتف أو عنوان</label>
                          <input
                            type="text"
                            value={newRightContact}
                            onChange={(e) => setNewRightContact(e.target.value)}
                            placeholder="للوصول لصاحبه"
                            className="w-full bg-[#0B0F13] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-[#D4AF37]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">موعد الاستحقاق</label>
                          <input
                            type="text"
                            value={newRightDueDate}
                            onChange={(e) => setNewRightDueDate(e.target.value)}
                            placeholder="مثلاً: أول رمضان"
                            className="w-full bg-[#0B0F13] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-[#D4AF37]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => {
                          if (!newRightTitle.trim() || !newRightPerson.trim()) return;
                          StorageService.addRightsRecord({
                            type: newRightType,
                            title: newRightTitle.trim(),
                            amountOrDescription: newRightAmount.trim() || 'مبلغ محدد',
                            personName: newRightPerson.trim(),
                            contactOrLocation: newRightContact.trim() || undefined,
                            dueDate: newRightDueDate.trim() || undefined
                          });
                          setRightsState(StorageService.getRightsAndWasayaState());
                          setNewRightTitle('');
                          setNewRightAmount('');
                          setNewRightPerson('');
                          setIsAddRightModalOpen(false);
                          triggerCelebration();
                        }}
                        disabled={!newRightTitle.trim() || !newRightPerson.trim()}
                        className="flex-1 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-bold text-xs shadow disabled:opacity-50"
                      >
                        توثيق الحق
                      </button>
                      <button
                        onClick={() => setIsAddRightModalOpen(false)}
                        className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview & Print Will Modal */}
              {isPreviewWasiyyahOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
                  <div className="bg-[#121820] border border-slate-700 rounded-3xl p-5 w-full max-w-xl space-y-4 max-h-[90vh] flex flex-col text-right font-arabic shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                          <FileText size={16} className="text-[#D4AF37]" />
                          <span>وثيقة الوصية الشرعية وبراءة الذمة</span>
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">جاهزة للنسخ أو الحفظ</p>
                      </div>
                      <button onClick={() => setIsPreviewWasiyyahOpen(false)} className="text-slate-400 hover:text-slate-100">
                        <X size={18} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-[#0A0E13] p-4 rounded-2xl border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-arabic">
                      {generateFullWasiyyahText()}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(generateFullWasiyyahText());
                          setCopiedWasiyyah(true);
                          setTimeout(() => setCopiedWasiyyah(false), 2500);
                        }}
                        className="flex-1 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                      >
                        {copiedWasiyyah ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedWasiyyah ? 'تم نسخ الوصية بنجاح ✓' : 'نسخ الوصية كاملة'}</span>
                      </button>

                      <button
                        onClick={() => {
                          window.print();
                        }}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Printer size={13} />
                        <span>طباعة الوثيقة</span>
                      </button>
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
