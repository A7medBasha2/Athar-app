import React, { useState, useEffect } from 'react';
import { 
  X, Heart, BookOpen, Users, Compass, ShieldCheck, Play, Pause, 
  Sparkles, CheckCircle2, Copy, Check, Plus, Trash2, 
  Printer, FileText, HelpCircle, Award
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  HEART_HEALING_PRESCIPTIONS, TADABBUR_SESSIONS, 
  DAILY_INTENTIONS_CATALOG, STANDARD_WASIYYAH_PREAMBLE 
} from '../data/sakinaAndRightsData';
import { StorageService } from '../services/storageService';
import { AudioService, ActiveAudioState } from '../services/audioService';
import { ReminderEngine } from '../services/reminderService';
import { 
  TadabburProgressState, KinshipParentsState, 
  DailyIntentionsState, RightsAndWasayaState, RightsRecordType 
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
  const [parentsReminderEnabled, setParentsReminderEnabled] = useState<boolean>(() => {
    return Boolean(StorageService.getSettings().parentsReminder?.enabled);
  });

  // 4. Daily Intentions State
  const [intentionsState, setIntentionsState] = useState<DailyIntentionsState>(StorageService.getDailyIntentionsState());

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

  // Wasiyyah Document Editing State
  const [wasiyyahAuthor, setWasiyyahAuthor] = useState<string>('');
  const [wasiyyahPreamble, setWasiyyahPreamble] = useState<string>('');
  const [wasiyyahDirectives, setWasiyyahDirectives] = useState<string>('');
  const [wasiyyahOneThird, setWasiyyahOneThird] = useState<string>('');
  const [wasiyyahWitnesses, setWasiyyahWitnesses] = useState<string>('');
  const [isPreviewWasiyyahOpen, setIsPreviewWasiyyahOpen] = useState<boolean>(false);
  const [copiedWasiyyah, setCopiedWasiyyah] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const unsub = AudioService.subscribe((state) => {
      setActiveAudio(state);
    });
    return () => unsub();
  }, []);

  const reloadAllData = () => {
    const k = StorageService.getKinshipParentsState();
    const t = StorageService.getTadabburProgress();
    const i = StorageService.getDailyIntentionsState();
    const r = StorageService.getRightsAndWasayaState();

    setKinshipState(k);
    setTadabburProgress(t);
    setIntentionsState(i);
    setRightsState(r);
    setParentsReminderEnabled(Boolean(StorageService.getSettings().parentsReminder?.enabled));

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

  useEffect(() => {
    const handleUpdate = () => {
      setCompletedSteps({});
      reloadAllData();
    };
    window.addEventListener('athar_sakina_updated', handleUpdate);
    window.addEventListener('athar_midnight_reset', handleUpdate);
    return () => {
      window.removeEventListener('athar_sakina_updated', handleUpdate);
      window.removeEventListener('athar_midnight_reset', handleUpdate);
    };
  }, []);

  if (!isOpen) return null;

  const selectedPrescription = HEART_HEALING_PRESCIPTIONS.find(
    (h) => h.id === selectedEmotionId
  ) || HEART_HEALING_PRESCIPTIONS[0];

  const selectedSession = TADABBUR_SESSIONS.find(
    (s) => s.id === selectedTadabburId
  ) || TADABBUR_SESSIONS[0];

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#E6C66E', '#C8A24A', '#F3E5AB', '#A6802B']
      });
    } catch {}
  };

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

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedDuaId(id);
    setTimeout(() => setCopiedDuaId(null), 2500);
  };

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

  const generateFullWasiyyahText = (): string => {
    const authorLine = wasiyyahAuthor.trim() ? `الموصي: ${wasiyyahAuthor}` : '';
    const dateLine = `تاريخ التوثيق: ${new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}`;
    
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#0D0C08] border border-[#C8A24A]/50 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[92vh] h-full text-right font-arabic">
        
        {/* Top Royal Header Bar */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-[#C8A24A]/30 bg-gradient-to-r from-[#1A160E] via-[#12100B] to-[#1A160E] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#1F1B12] border border-[#C8A24A]/50 flex items-center justify-center text-[#E6C66E] shrink-0 shadow-md">
              <Sparkles size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-[#F3E5AB] flex items-center gap-2 truncate">
                <span>واحة السكينة والحقوق</span>
                <span className="text-[10px] font-bold bg-[#C8A24A]/20 text-[#E6C66E] px-2.5 py-0.5 rounded-full border border-[#C8A24A]/40 hidden sm:inline-block">
                  رفيق أثر
                </span>
              </h2>
              <p className="text-[11px] text-[#C4B998] truncate mt-0.5">
                تلاوة وتدبر · بر وأرحام · تجديد النوايا · سجل الديون والوصية
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#16130D] border border-[#C8A24A]/35 text-[#E6C66E] hover:text-white transition-colors shrink-0"
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="shrink-0 bg-[#12100B] px-2 py-1.5 border-b border-[#C8A24A]/25 flex items-center gap-1 overflow-x-auto no-scrollbar">
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
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] shadow-md'
                    : 'text-[#C4B998] hover:text-white hover:bg-[#1A160E]'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-[#080705]/20 text-[#080705]' : 'bg-[#1F1B12] text-[#E6C66E]'
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
          
          {/* TAB 1: علاج القلوب */}
          {activeTab === 'heart_healing' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-[#1E1910] to-[#12100B] p-3.5 rounded-2xl border border-[#C8A24A]/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#C8A24A]/20 text-[#E6C66E] border border-[#C8A24A]/40">
                    <Heart size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-[#F3E5AB]">كيف تجد قلبك اليوم؟</h3>
                    <p className="text-[11px] text-[#C4B998] mt-0.5">اختر شعورك لتحصل على روشتة القرآن والسنة المباشرة</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {HEART_HEALING_PRESCIPTIONS.map((item) => {
                  const isSelected = selectedEmotionId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedEmotionId(item.id)}
                      className={`p-2.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? 'bg-[#1F1B12] border-[#E6C66E] shadow-md ring-1 ring-[#E6C66E]/40'
                          : 'bg-[#12100B] border-[#C8A24A]/25 hover:border-[#C8A24A]/60 text-[#C4B998]'
                      }`}
                    >
                      <span className="text-xs font-extrabold text-[#F3E5AB] block">
                        {item.emotionTitle}
                      </span>
                      <span className="text-[10px] text-[#C4B998] truncate block">
                        {item.emotionSubtitle}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="relative overflow-hidden bg-gradient-to-b from-[#17140D] to-[#0B0A07] border border-[#C8A24A]/45 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-[#C8A24A]/25 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-[#E6C66E] block">
                      روشتة السكينة القرآنية لـ:
                    </span>
                    <h3 className="text-sm sm:text-base font-extrabold text-[#F3E5AB] mt-0.5">
                      {selectedPrescription.emotionTitle}
                    </h3>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-xl border border-[#C8A24A]/45 bg-[#C8A24A]/15 text-[#E6C66E] font-bold">
                    {selectedPrescription.emotionSubtitle}
                  </span>
                </div>

                {/* Quran Verse Audio Box */}
                <div className="bg-[#0A0907] border border-[#C8A24A]/35 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#E6C66E] font-bold">
                    <span className="flex items-center gap-1.5">
                      <BookOpen size={14} />
                      <span>آية الشفاء والسكينة القلبيّة</span>
                    </span>
                    <span className="text-[11px] text-[#C4B998]">
                      سورة {selectedPrescription.verse.surahName} · الآية {selectedPrescription.verse.ayahNumber}
                    </span>
                  </div>

                  <p className="font-quran text-xl sm:text-2xl text-[#F3E5AB] leading-loose text-center py-1">
                    ﴿{selectedPrescription.verse.arabicText}﴾
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-[#C8A24A]/20">
                    <button
                      onClick={() => handlePlayAyah(selectedPrescription.verse.surahNumber, selectedPrescription.verse.ayahNumber)}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all active:scale-95 ${
                        activeAudio?.category === 'quran' &&
                        activeAudio?.surahNumber === selectedPrescription.verse.surahNumber &&
                        activeAudio?.ayahNumber === selectedPrescription.verse.ayahNumber &&
                        activeAudio?.isPlaying
                          ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] shadow'
                          : 'bg-[#1F1B12] hover:bg-[#2A2416] text-[#E6C66E] border border-[#C8A24A]/45'
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
                      className="p-1.5 text-[#C4B998] hover:text-[#E6C66E] transition-colors"
                      title="نسخ الآية"
                    >
                      {copiedDuaId === `verse_${selectedPrescription.id}` ? <Check size={15} className="text-[#E6C66E]" /> : <Copy size={15} />}
                    </button>
                  </div>
                </div>

                {/* Heart Reflection Summary */}
                <div className="bg-[#12100B] border border-[#C8A24A]/30 rounded-2xl p-3.5 space-y-1.5">
                  <h4 className="text-xs font-extrabold text-[#E6C66E] flex items-center gap-1.5">
                    <Sparkles size={13} />
                    <span>خلاصة التدبر القلبي</span>
                  </h4>
                  <p className="text-xs text-[#E5DEC9] leading-relaxed">
                    {selectedPrescription.reflection}
                  </p>
                </div>

                {/* Prophetic Dua */}
                <div className="bg-[#12100B] border border-[#C8A24A]/30 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-[#E6C66E] flex items-center gap-1.5">
                      <Heart size={13} />
                      <span>الدعاء النبوي المأثور</span>
                    </h4>
                    <button
                      onClick={() => handleCopyText(`${selectedPrescription.propheticDua.arabicText}\n(${selectedPrescription.propheticDua.source})`, `dua_${selectedPrescription.id}`)}
                      className="text-[11px] text-[#C4B998] hover:text-[#E6C66E] flex items-center gap-1 transition-colors"
                    >
                      {copiedDuaId === `dua_${selectedPrescription.id}` ? (
                        <>
                          <Check size={12} className="text-[#E6C66E]" />
                          <span className="text-[#E6C66E]">تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>نسخ الدعاء</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="font-quran text-base sm:text-lg text-[#F3E5AB] leading-loose">
                    «{selectedPrescription.propheticDua.arabicText}»
                  </p>
                  <p className="text-[10px] text-[#C4B998]">
                    المصدر: {selectedPrescription.propheticDua.source}
                  </p>
                </div>

                {/* Practical Action Deed */}
                <div className="bg-gradient-to-r from-[#221C11] to-[#12100B] border border-[#C8A24A]/45 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <span className="text-[10px] font-bold text-[#E6C66E] bg-[#C8A24A]/20 px-2 py-0.5 rounded-full border border-[#C8A24A]/40 inline-block">
                      خطوة عملية الآن لتفريج الكرب
                    </span>
                    <h4 className="text-xs font-extrabold text-[#F3E5AB]">
                      {selectedPrescription.practicalStep.title}
                    </h4>
                    <p className="text-[11px] text-[#C4B998]">
                      {selectedPrescription.practicalStep.description}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const next = !completedSteps[selectedPrescription.id];
                      setCompletedSteps({ ...completedSteps, [selectedPrescription.id]: next });
                      if (next) triggerCelebration();
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold shrink-0 transition-all flex items-center gap-1.5 active:scale-95 ${
                      completedSteps[selectedPrescription.id]
                        ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705]'
                        : 'bg-[#1F1B12] hover:bg-[#2A2416] text-[#E6C66E] border border-[#C8A24A]/50'
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

          {/* TAB 2: خلوة التدبر والعمل */}
          {activeTab === 'tadabbur' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-[#1E1910] to-[#12100B] border border-[#C8A24A]/40 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#C8A24A]/20 border border-[#C8A24A]/45 flex items-center justify-center text-[#E6C66E]">
                    <Award size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-[#F3E5AB]">
                      خلوات السكينة والتدبر الصوتي (٣–٥ دقائق)
                    </h3>
                    <p className="text-[11px] text-[#C4B998] mt-0.5">
                      استماع خاشع · رسالة الآية لقلبك · أثر الآية العملي في يومك
                    </p>
                  </div>
                </div>

                <div className="text-center bg-[#0A0907] px-3 py-1.5 rounded-xl border border-[#C8A24A]/35">
                  <span className="text-[10px] text-[#C4B998] block">المواظبة</span>
                  <span className="text-xs font-extrabold text-[#E6C66E] font-mono">
                    {tadabburProgress.streakDays} أيام
                  </span>
                </div>
              </div>

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
                          ? 'bg-[#1F1B12] border-[#E6C66E] shadow ring-1 ring-[#E6C66E]/40'
                          : 'bg-[#12100B] border-[#C8A24A]/25 hover:border-[#C8A24A]/60 text-[#C4B998]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] font-mono text-[#C4B998]">
                          {session.estimatedMinutes} د
                        </span>
                        {isDone && <CheckCircle2 size={13} className="text-[#E6C66E]" />}
                      </div>
                      <span className="text-xs font-extrabold text-[#F3E5AB] block">
                        {session.title}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="bg-gradient-to-b from-[#17140D] to-[#0B0A07] border border-[#C8A24A]/45 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#C8A24A]/25 pb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-[#F3E5AB]">
                      {selectedSession.title}
                    </h3>
                    <p className="text-[11px] text-[#E6C66E] mt-0.5">
                      {selectedSession.theme}
                    </p>
                  </div>
                  <span className="text-[10px] text-[#E6C66E] bg-[#1F1B12] px-2.5 py-1 rounded-full border border-[#C8A24A]/40 font-bold">
                    جلسة {selectedSession.estimatedMinutes} دقائق
                  </span>
                </div>

                <div className="bg-[#0A0907] border border-[#C8A24A]/35 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#E6C66E] font-bold">
                    <span className="flex items-center gap-1.5">
                      <BookOpen size={14} />
                      <span>الآية محور الخلوة</span>
                    </span>
                    <span className="text-[11px] text-[#C4B998]">
                      سورة {selectedSession.verse.surahName} · الآية {selectedSession.verse.ayahNumber}
                    </span>
                  </div>

                  <p className="font-quran text-xl sm:text-2xl text-[#F3E5AB] leading-loose text-center py-1">
                    ﴿{selectedSession.verse.arabicText}﴾
                  </p>

                  <div className="flex items-center justify-center pt-2 border-t border-[#C8A24A]/20">
                    <button
                      onClick={() => handlePlayAyah(selectedSession.verse.surahNumber, selectedSession.verse.ayahNumber)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all active:scale-95 ${
                        activeAudio?.category === 'quran' &&
                        activeAudio?.surahNumber === selectedSession.verse.surahNumber &&
                        activeAudio?.ayahNumber === selectedSession.verse.ayahNumber &&
                        activeAudio?.isPlaying
                          ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] shadow'
                          : 'bg-[#1F1B12] hover:bg-[#2A2416] text-[#E6C66E] border border-[#C8A24A]/45'
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

                <div className="bg-[#12100B] border border-[#C8A24A]/30 rounded-2xl p-3.5 space-y-1.5">
                  <h4 className="text-xs font-extrabold text-[#E6C66E] flex items-center gap-1.5">
                    <Heart size={13} />
                    <span>رسالة الآية لقلبك</span>
                  </h4>
                  <p className="text-xs text-[#E5DEC9] leading-relaxed">
                    {selectedSession.heartMessage}
                  </p>
                </div>

                <div className="bg-[#12100B] border border-[#C8A24A]/30 rounded-2xl p-3.5 space-y-1.5">
                  <h4 className="text-xs font-extrabold text-[#E6C66E] flex items-center gap-1.5">
                    <HelpCircle size={13} />
                    <span>وقفة محاسبة وتأمل</span>
                  </h4>
                  <p className="text-xs text-[#E5DEC9] leading-relaxed">
                    {selectedSession.selfReflectionQuestion}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-[#221C11] to-[#12100B] border border-[#C8A24A]/45 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#E6C66E] bg-[#C8A24A]/20 px-2 py-0.5 rounded-full border border-[#C8A24A]/40">
                      أثر الآية العملي اليوم
                    </span>
                    <span className="text-[11px] text-[#C4B998]">
                      العمل بالقرآن
                    </span>
                  </div>

                  <p className="text-xs text-[#F3E5AB] leading-relaxed font-medium">
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
                    className={`w-full py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 active:scale-98 ${
                      tadabburProgress.completedSessionIds.includes(selectedSession.id)
                        ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] shadow'
                        : 'bg-[#1F1B12] hover:bg-[#2A2416] text-[#E6C66E] border border-[#C8A24A]/50'
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

          {/* TAB 3: بر الوالدين وصلة الرحم */}
          {activeTab === 'kinship' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-[#221C11] via-[#16130D] to-[#110F0A] border border-[#C8A24A]/45 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#C8A24A]/20 border border-[#C8A24A]/40 text-[#E6C66E] shrink-0">
                    <Heart size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-extrabold text-[#F3E5AB]">
                        تنبيه بر الوالدين التلقائي في «أثر»
                      </h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        parentsReminderEnabled
                          ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#E6C66E]'
                          : 'bg-[#14120D] border-[#C8A24A]/25 text-[#C4B998]'
                      }`}>
                        {parentsReminderEnabled ? 'نشط بالصوت والإشعار ✓' : 'معطّل'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#C4B998] mt-0.5">
                      تذكير دوري بالدعاء لهما وتفقدهما بصوت الشيخ مشاري العفاسي
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    onClick={() => ReminderEngine.testParentsReminder()}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#1F1B12] hover:bg-[#2A2416] text-[#E6C66E] border border-[#C8A24A]/45 text-[11px] font-bold active:scale-95 transition-all"
                  >
                    <Play size={11} fill="currentColor" />
                    <span>سماع التنبيه</span>
                  </button>
                  <button
                    onClick={() => {
                      const s = StorageService.getSettings();
                      const next = !s.parentsReminder?.enabled;
                      s.parentsReminder = { ...s.parentsReminder, enabled: next };
                      StorageService.saveSettings(s);
                      setParentsReminderEnabled(next);
                      ReminderEngine.restart();
                      triggerCelebration();
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all active:scale-95 ${
                      parentsReminderEnabled
                        ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] shadow'
                        : 'bg-[#14120D] text-[#C4B998] border border-[#C8A24A]/35'
                    }`}
                  >
                    {parentsReminderEnabled ? 'مفعّل' : 'تفعيل الآن'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Father Card */}
                <div className="bg-gradient-to-b from-[#17140D] to-[#0E0D09] border border-[#C8A24A]/40 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-[#E6C66E]">الوالد الكريم</h4>
                    <select
                      value={kinshipState.fatherStatus}
                      onChange={(e) => {
                        const next = { ...kinshipState, fatherStatus: e.target.value as 'alive' | 'deceased' };
                        setKinshipState(next);
                        StorageService.saveKinshipParentsState(next);
                      }}
                      className="bg-[#0A0907] text-[#F3E5AB] border border-[#C8A24A]/35 rounded-xl px-2 py-1 text-[11px] font-bold"
                    >
                      <option value="alive">على قيد الحياة حفظه الله</option>
                      <option value="deceased">رحمه الله وغفر له</option>
                    </select>
                  </div>

                  <p className="font-quran text-base text-[#F3E5AB] leading-relaxed text-center py-1">
                    {kinshipState.fatherStatus === 'alive'
                      ? '﴿رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا﴾'
                      : '﴿رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ﴾'}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-[#C8A24A]/25">
                    <span className="text-[10px] text-[#C4B998]">
                      {kinshipState.fatherLastDuaDate ? `آخر دعاء: ${kinshipState.fatherLastDuaDate}` : 'لم يسجل اليوم'}
                    </span>
                    <button
                      onClick={() => {
                        StorageService.recordParentDua('father');
                        setKinshipState(StorageService.getKinshipParentsState());
                        triggerCelebration();
                      }}
                      className="px-2.5 py-1 rounded-xl bg-[#C8A24A]/20 hover:bg-[#C8A24A]/30 text-[#E6C66E] border border-[#C8A24A]/45 text-[11px] font-extrabold"
                    >
                      دعوت لوالدي الآن ✓
                    </button>
                  </div>
                </div>

                {/* Mother Card */}
                <div className="bg-gradient-to-b from-[#17140D] to-[#0E0D09] border border-[#C8A24A]/40 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-[#E6C66E]">الوالدة الحبيبة</h4>
                    <select
                      value={kinshipState.motherStatus}
                      onChange={(e) => {
                        const next = { ...kinshipState, motherStatus: e.target.value as 'alive' | 'deceased' };
                        setKinshipState(next);
                        StorageService.saveKinshipParentsState(next);
                      }}
                      className="bg-[#0A0907] text-[#F3E5AB] border border-[#C8A24A]/35 rounded-xl px-2 py-1 text-[11px] font-bold"
                    >
                      <option value="alive">على قيد الحياة حفظها الله</option>
                      <option value="deceased">رحمها الله وأسكنها الفردوس</option>
                    </select>
                  </div>

                  <p className="font-quran text-base text-[#F3E5AB] leading-relaxed text-center py-1">
                    {kinshipState.motherStatus === 'alive'
                      ? '﴿وَوَصَّيْنَا الْإِنسَانَ بِوَالِدَيْهِ حَمَلَتْهُ أُمُّهُ وَهْنًا عَلَىٰ وَهْنٍ﴾'
                      : '«اللَّهُمَّ اغْفِرْ لِأُمِّي وَارْفَعْ دَرَجَتَهَا فِي الْمَهْدِيِّينَ»'}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-[#C8A24A]/25">
                    <span className="text-[10px] text-[#C4B998]">
                      {kinshipState.motherLastDuaDate ? `آخر دعاء: ${kinshipState.motherLastDuaDate}` : 'لم يسجل اليوم'}
                    </span>
                    <button
                      onClick={() => {
                        StorageService.recordParentDua('mother');
                        setKinshipState(StorageService.getKinshipParentsState());
                        triggerCelebration();
                      }}
                      className="px-2.5 py-1 rounded-xl bg-[#C8A24A]/20 hover:bg-[#C8A24A]/30 text-[#E6C66E] border border-[#C8A24A]/45 text-[11px] font-extrabold"
                    >
                      دعوت لوالدتي الآن ✓
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <h3 className="text-xs font-extrabold text-[#F3E5AB] flex items-center gap-1.5">
                  <Users size={14} className="text-[#E6C66E]" />
                  <span>سجل صلة الرحم والدعاء لمن تحب ({kinshipState.contacts.length})</span>
                </h3>

                <button
                  onClick={() => setIsAddKinModalOpen(true)}
                  className="athar-btn-primary flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px]"
                >
                  <Plus size={13} />
                  <span>إضافة قريب أو حبيب</span>
                </button>
              </div>

              <div className="space-y-2">
                {kinshipState.contacts.length === 0 ? (
                  <div className="text-center py-8 bg-[#12100B] rounded-2xl border border-[#C8A24A]/25 p-4">
                    <Users size={28} className="mx-auto text-[#E6C66E]/50 mb-2" />
                    <p className="text-xs text-[#C4B998]">لا يوجد أرحام مضافون في السجل بعد.</p>
                    <button
                      onClick={() => setIsAddKinModalOpen(true)}
                      className="mt-3 px-3 py-1.5 bg-[#C8A24A]/20 text-[#E6C66E] border border-[#C8A24A]/40 rounded-xl text-xs font-bold"
                    >
                      إضافة الأرحام والأصدقاء للدعاء والصلة
                    </button>
                  </div>
                ) : (
                  kinshipState.contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="bg-[#12100B] border border-[#C8A24A]/30 hover:border-[#E6C66E] rounded-2xl p-3 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-extrabold text-[#F3E5AB] truncate">
                            {contact.name}
                          </h4>
                          <span className="text-[10px] bg-[#1F1B12] text-[#E6C66E] border border-[#C8A24A]/35 px-2 py-0.5 rounded-full">
                            {contact.relationship}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#C8A24A]/15 text-[#C4B998]">
                            {contact.status === 'alive' ? 'حي' : 'رحمه الله'}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#C4B998] mt-0.5">
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
                          className="px-2.5 py-1.5 rounded-xl bg-[#C8A24A]/20 hover:bg-[#C8A24A]/30 text-[#E6C66E] border border-[#C8A24A]/45 text-[11px] font-extrabold flex items-center gap-1"
                        >
                          <Check size={12} />
                          <span>وصلت اليوم</span>
                        </button>
                        <button
                          onClick={() => {
                            StorageService.deleteKinshipContact(contact.id);
                            setKinshipState(StorageService.getKinshipParentsState());
                          }}
                          className="p-1.5 text-[#C4B998] hover:text-rose-400 transition-colors"
                          title="حذف"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {isAddKinModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
                  <div className="bg-[#12100B] border border-[#C8A24A]/50 rounded-3xl p-5 w-full max-w-sm space-y-3.5 text-right font-arabic shadow-2xl">
                    <div className="flex items-center justify-between border-b border-[#C8A24A]/25 pb-2.5">
                      <h3 className="text-sm font-extrabold text-[#F3E5AB]">إضافة شخص لصلة الرحم والدعاء</h3>
                      <button onClick={() => setIsAddKinModalOpen(false)} className="text-[#C4B998] hover:text-white">
                        <X size={18} />
                      </button>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <label className="block text-[11px] text-[#C4B998] mb-1">الاسم الكريم</label>
                        <input
                          type="text"
                          value={newKinName}
                          onChange={(e) => setNewKinName(e.target.value)}
                          placeholder="مثلاً: خالي محمد، أختي فاطمة"
                          className="w-full bg-[#0A0907] border border-[#C8A24A]/35 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#E6C66E]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-[#C4B998] mb-1">صلة القرابة</label>
                          <input
                            type="text"
                            value={newKinRelation}
                            onChange={(e) => setNewKinRelation(e.target.value)}
                            placeholder="أخ، عم، خال، صديق"
                            className="w-full bg-[#0A0907] border border-[#C8A24A]/35 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#E6C66E]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-[#C4B998] mb-1">الحالة</label>
                          <select
                            value={newKinStatus}
                            onChange={(e) => setNewKinStatus(e.target.value as 'alive' | 'deceased')}
                            className="w-full bg-[#0A0907] border border-[#C8A24A]/35 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#E6C66E]"
                          >
                            <option value="alive">على قيد الحياة</option>
                            <option value="deceased">متوفى رحمه الله</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#C4B998] mb-1">نوع الصلة المفضل</label>
                        <select
                          value={newKinType}
                          onChange={(e) => setNewKinType(e.target.value as any)}
                          className="w-full bg-[#0A0907] border border-[#C8A24A]/35 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#E6C66E]"
                        >
                          <option value="call">اتصال هاتفي</option>
                          <option value="visit">زيارة شخصية</option>
                          <option value="dua">دعاء بظهر الغيب</option>
                          <option value="sadaqah">صدقة جارية</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#C4B998] mb-1">ملاحظة أو تذكير (اختياري)</label>
                        <input
                          type="text"
                          value={newKinNotes}
                          onChange={(e) => setNewKinNotes(e.target.value)}
                          placeholder="مثلاً: الاتصال مساء كل جمعة"
                          className="w-full bg-[#0A0907] border border-[#C8A24A]/35 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#E6C66E]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-[#C8A24A]/25">
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
                        className="flex-1 py-2 rounded-xl athar-btn-primary text-xs disabled:opacity-50"
                      >
                        حفظ القريب
                      </button>
                      <button
                        onClick={() => setIsAddKinModalOpen(false)}
                        className="px-4 py-2 rounded-xl bg-[#1A160E] text-[#C4B998] border border-[#C8A24A]/35 text-xs font-bold"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: مفكرة النوايا اليومية */}
          {activeTab === 'intentions' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-[#221C11] to-[#12100B] border border-[#C8A24A]/45 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#C8A24A]/20 border border-[#C8A24A]/45 flex items-center justify-center text-[#E6C66E]">
                    <Compass size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-[#F3E5AB]">
                      مفكرة النوايا: حوّل عاداتك وسعيك إلى عبادات
                    </h3>
                    <p className="text-[11px] text-[#C4B998] mt-0.5">
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
                  className="px-3 py-1.5 rounded-xl bg-[#1F1B12] hover:bg-[#2A2416] text-[#E6C66E] border border-[#C8A24A]/45 text-xs font-extrabold shrink-0"
                >
                  عقد كافة النوايا ↻
                </button>
              </div>

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
                          ? 'bg-gradient-to-r from-[#231D11] to-[#12100B] border-[#E6C66E] shadow-sm'
                          : 'bg-[#12100B] border-[#C8A24A]/25 hover:border-[#C8A24A]/60 text-[#C4B998]'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#C8A24A]/20 text-[#E6C66E] border border-[#C8A24A]/40">
                            {item.categoryLabel}
                          </span>
                          <h4 className="text-xs font-extrabold text-[#F3E5AB] truncate">
                            {item.title}
                          </h4>
                        </div>
                        <p className="text-[11px] text-[#E5DEC9] leading-relaxed">
                          {item.intentionText}
                        </p>
                        <p className="font-quran text-xs text-[#E6C66E] pt-1">
                          {item.proofText}
                        </p>
                        <p className="text-[10px] text-[#C4B998]">
                          المصدر: {item.source}
                        </p>
                      </div>

                      <div className={`w-6 h-6 rounded-xl border flex items-center justify-center shrink-0 mt-1 transition-colors ${
                        isChecked
                          ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] border-[#F3E5AB] text-[#080705] shadow'
                          : 'bg-[#0A0907] border-[#C8A24A]/35 text-transparent'
                      }`}>
                        <Check size={14} strokeWidth={3} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: دفتر الحقوق والوصية الشرعية */}
          {activeTab === 'rights_wasiyyah' && (
            <div className="space-y-4">
              <div className="bg-[#12100B] p-1 rounded-2xl border border-[#C8A24A]/35 flex items-center gap-1">
                <button
                  onClick={() => setRightsSubTab('debts')}
                  className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all ${
                    rightsSubTab === 'debts'
                      ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] shadow'
                      : 'text-[#C4B998] hover:text-white'
                  }`}
                >
                  سجل الديون والأمانات والحقوق ({rightsState.records.filter(r => !r.isFulfilled).length})
                </button>
                <button
                  onClick={() => setRightsSubTab('wasiyyah')}
                  className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all ${
                    rightsSubTab === 'wasiyyah'
                      ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#080705] shadow'
                      : 'text-[#C4B998] hover:text-white'
                  }`}
                >
                  وثيقة الوصية الشرعية وبراءة الذمة
                </button>
              </div>

              {rightsSubTab === 'debts' && (
                <div className="space-y-3.5">
                  <div className="bg-[#1A160E] border border-[#C8A24A]/40 rounded-2xl p-3 flex items-center justify-between gap-3">
                    <p className="font-quran text-xs text-[#F3E5AB] leading-relaxed">
                      «مَا حَقُّ امْرِئٍ مُسْلِمٍ لَهُ شَيْءٌ يُوصِي فِيهِ يَبِيتُ لَيْلَتَيْنِ إِلَّا وَوَصِيَّتُهُ مَكْتُوبَةٌ عِنْدَهُ»
                    </p>
                    <span className="text-[10px] text-[#E6C66E] shrink-0 font-bold">صحيح البخاري</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="bg-[#12100B] border border-[#C8A24A]/35 rounded-2xl p-3">
                      <span className="text-[10px] font-bold text-[#E6C66E] block">ديون عليّ للغير</span>
                      <span className="text-base font-extrabold text-[#F3E5AB] font-mono block mt-0.5">
                        {rightsState.records.filter(r => r.type === 'debt_on_me' && !r.isFulfilled).length} ديون معلقة
                      </span>
                    </div>

                    <div className="bg-[#12100B] border border-[#C8A24A]/35 rounded-2xl p-3">
                      <span className="text-[10px] font-bold text-[#E6C66E] block">ديون لي عند الغير</span>
                      <span className="text-base font-extrabold text-[#F3E5AB] font-mono block mt-0.5">
                        {rightsState.records.filter(r => r.type === 'debt_for_me' && !r.isFulfilled).length} ديون لي
                      </span>
                    </div>

                    <div className="bg-[#12100B] border border-[#C8A24A]/35 rounded-2xl p-3 col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-bold text-[#E6C66E] block">أمانات وودائع</span>
                      <span className="text-base font-extrabold text-[#F3E5AB] font-mono block mt-0.5">
                        {rightsState.records.filter(r => r.type === 'trust' && !r.isFulfilled).length} أمانة
                      </span>
                    </div>
                  </div>

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
                              ? 'bg-[#1F1B12] text-[#E6C66E] border border-[#C8A24A]/50'
                              : 'text-[#C4B998] hover:text-white'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setIsAddRightModalOpen(true)}
                      className="athar-btn-primary flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs shrink-0"
                    >
                      <Plus size={13} />
                      <span>إضافة حق / دين</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {rightsState.records
                      .filter((r) => rightsFilter === 'all' || r.type === rightsFilter)
                      .map((record) => (
                        <div
                          key={record.id}
                          className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                            record.isFulfilled
                              ? 'bg-[#0A0907]/70 border-[#C8A24A]/15 opacity-70'
                              : 'bg-[#12100B] border-[#C8A24A]/35'
                          }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#C8A24A]/20 text-[#E6C66E] border border-[#C8A24A]/40">
                                {record.type === 'debt_on_me' ? 'دين عليّ' : record.type === 'debt_for_me' ? 'دين لي' : 'أمانة/وديعة'}
                              </span>
                              <h4 className={`text-xs font-extrabold truncate ${record.isFulfilled ? 'line-through text-[#8E8268]' : 'text-[#F3E5AB]'}`}>
                                {record.title}
                              </h4>
                            </div>

                            <p className="text-xs font-mono font-bold text-[#E6C66E]">
                              {record.amountOrDescription} · لصالح/عند: {record.personName}
                            </p>

                            {record.contactOrLocation && (
                              <p className="text-[10px] text-[#C4B998]">
                                التواصل / المكان: {record.contactOrLocation}
                              </p>
                            )}

                            {record.dueDate && (
                              <p className="text-[10px] text-[#C4B998]">
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
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold transition-all ${
                                record.isFulfilled
                                  ? 'bg-[#C8A24A]/25 text-[#E6C66E] border border-[#E6C66E]/50'
                                  : 'bg-[#1F1B12] text-[#F3E5AB] border border-[#C8A24A]/35'
                              }`}
                            >
                              {record.isFulfilled ? 'تم الوفاء ✓' : 'إبراء الذمة'}
                            </button>
                            <button
                              onClick={() => {
                                StorageService.deleteRightsRecord(record.id);
                                setRightsState(StorageService.getRightsAndWasayaState());
                              }}
                              className="p-1.5 text-[#C4B998] hover:text-rose-400"
                              title="حذف"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>

                  <div className="bg-[#0A0907] p-3 rounded-2xl border border-[#C8A24A]/25 text-center text-[11px] text-[#C4B998]">
                    🔒 جميع السجلات والديون والوصايا محفوظة محلياً على جهازك بخصوصية تامة 100% ولا ترفع لأي خادم.
                  </div>
                </div>
              )}

              {rightsSubTab === 'wasiyyah' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-b from-[#17140D] to-[#0E0D09] border border-[#C8A24A]/45 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#C8A24A]/25 pb-2">
                      <h3 className="text-xs font-extrabold text-[#E6C66E] flex items-center gap-1.5">
                        <FileText size={15} />
                        <span>تحرير وثيقة الوصية الشرعية وبراءة الذمة</span>
                      </h3>
                      <span className="text-[10px] text-[#C4B998]">
                        آخر تحديث: {rightsState.wasiyyah.lastUpdated}
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block text-[11px] text-[#F3E5AB] font-bold mb-1">اسم الموصي كاملاً</label>
                        <input
                          type="text"
                          value={wasiyyahAuthor}
                          onChange={(e) => setWasiyyahAuthor(e.target.value)}
                          placeholder="اكتب اسمك الثلاثي أو الرباعي..."
                          className="w-full bg-[#0A0907] border border-[#C8A24A]/35 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#E6C66E]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#F3E5AB] font-bold mb-1">مقدمة الوصية الشرعية والمأثور</label>
                        <textarea
                          rows={4}
                          value={wasiyyahPreamble}
                          onChange={(e) => setWasiyyahPreamble(e.target.value)}
                          className="w-full bg-[#0A0907] border border-[#C8A24A]/35 rounded-xl p-2.5 text-xs text-[#F3E5AB] font-quran leading-relaxed focus:outline-none focus:border-[#E6C66E]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#F3E5AB] font-bold mb-1">توجيهات ووصايا خاصة للأهل والأولاد</label>
                        <textarea
                          rows={3}
                          value={wasiyyahDirectives}
                          onChange={(e) => setWasiyyahDirectives(e.target.value)}
                          placeholder="مثلاً: الوصية بصلة الرحم، توزيع الصدقات، وأي توجيه للأولاد..."
                          className="w-full bg-[#0A0907] border border-[#C8A24A]/35 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#E6C66E]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#F3E5AB] font-bold mb-1">الوصية بالثلث للصدقة الجارية (اختياري)</label>
                        <input
                          type="text"
                          value={wasiyyahOneThird}
                          onChange={(e) => setWasiyyahOneThird(e.target.value)}
                          placeholder="مثلاً: ثلث التركة في كفالة أيتام أو حفر بئر..."
                          className="w-full bg-[#0A0907] border border-[#C8A24A]/35 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#E6C66E]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#F3E5AB] font-bold mb-1">الشهود أو الموصى إليهم (اختياري)</label>
                        <input
                          type="text"
                          value={wasiyyahWitnesses}
                          onChange={(e) => setWasiyyahWitnesses(e.target.value)}
                          placeholder="أسماء الشهود وتوقيعهم أو أرقام هواتفهم..."
                          className="w-full bg-[#0A0907] border border-[#C8A24A]/35 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#E6C66E]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-[#C8A24A]/25">
                      <button
                        onClick={handleSaveWasiyyah}
                        className="athar-btn-primary px-4 py-2 rounded-xl text-xs"
                      >
                        حفظ التعديلات ✓
                      </button>

                      <button
                        onClick={() => setIsPreviewWasiyyahOpen(true)}
                        className="px-3.5 py-2 rounded-xl bg-[#1F1B12] hover:bg-[#2A2416] text-[#E6C66E] border border-[#C8A24A]/45 text-xs font-bold flex items-center gap-1.5"
                      >
                        <Printer size={13} />
                        <span>معاينة وتصدير الوثيقة</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isAddRightModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
                  <div className="bg-[#12100B] border border-[#C8A24A]/50 rounded-3xl p-5 w-full max-w-sm space-y-3.5 text-right font-arabic shadow-2xl">
                    <div className="flex items-center justify-between border-b border-[#C8A24A]/25 pb-2.5">
                      <h3 className="text-sm font-extrabold text-[#F3E5AB]">توثيق دين أو أمانة أو حق</h3>
                      <button onClick={() => setIsAddRightModalOpen(false)} className="text-[#C4B998] hover:text-white">
                        <X size={18} />
                      </button>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <label className="block text-[11px] text-[#C4B998] mb-1">نوع الحق</label>
                        <select
                          value={newRightType}
                          onChange={(e) => setNewRightType(e.target.value as any)}
                          className="w-full bg-[#0A0907] border border-[#C8A24A]/35 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#E6C66E]"
                        >
                          <option value="debt_on_me">دين عليّ للغير (واجب السداد)</option>
                          <option value="debt_for_me">دين لي عند الغير</option>
                          <option value="trust">أمانة أو وديعة في عهدتي</option>
                          <option value="moral_right">حق معنوي أو اعتذار واجب</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#C4B998] mb-1">وصف الحق أو البيان</label>
                        <input
                          type="text"
                          value={newRightTitle}
                          onChange={(e) => setNewRightTitle(e.target.value)}
                          placeholder="مثلاً: قرض شخصي، قسط متأخر، مغلف أمانة"
                          className="w-full bg-[#0A0907] border border-[#C8A24A]/35 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#E6C66E]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-[#C4B998] mb-1">المبلغ أو الشيء</label>
                          <input
                            type="text"
                            value={newRightAmount}
                            onChange={(e) => setNewRightAmount(e.target.value)}
                            placeholder="مثلاً: ١٠٠٠ ج.م"
                            className="w-full bg-[#0A0907] border border-[#C8A24A]/35 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#E6C66E]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-[#C4B998] mb-1">صاحب الحق</label>
                          <input
                            type="text"
                            value={newRightPerson}
                            onChange={(e) => setNewRightPerson(e.target.value)}
                            placeholder="اسم الشخص أو الجهة"
                            className="w-full bg-[#0A0907] border border-[#C8A24A]/35 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#E6C66E]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-[#C4B998] mb-1">رقم هاتف أو عنوان</label>
                          <input
                            type="text"
                            value={newRightContact}
                            onChange={(e) => setNewRightContact(e.target.value)}
                            placeholder="للوصول لصاحبه"
                            className="w-full bg-[#0A0907] border border-[#C8A24A]/35 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#E6C66E]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-[#C4B998] mb-1">موعد الاستحقاق</label>
                          <input
                            type="text"
                            value={newRightDueDate}
                            onChange={(e) => setNewRightDueDate(e.target.value)}
                            placeholder="مثلاً: أول رمضان"
                            className="w-full bg-[#0A0907] border border-[#C8A24A]/35 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#E6C66E]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-[#C8A24A]/25">
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
                        className="flex-1 py-2 rounded-xl athar-btn-primary text-xs disabled:opacity-50"
                      >
                        توثيق الحق
                      </button>
                      <button
                        onClick={() => setIsAddRightModalOpen(false)}
                        className="px-4 py-2 rounded-xl bg-[#1A160E] text-[#C4B998] border border-[#C8A24A]/35 text-xs font-bold"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isPreviewWasiyyahOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-fadeIn">
                  <div className="bg-[#12100B] border border-[#C8A24A]/50 rounded-3xl p-5 w-full max-w-xl space-y-4 max-h-[90vh] flex flex-col text-right font-arabic shadow-2xl">
                    <div className="flex items-center justify-between border-b border-[#C8A24A]/25 pb-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-[#F3E5AB] flex items-center gap-2">
                          <FileText size={16} className="text-[#E6C66E]" />
                          <span>وثيقة الوصية الشرعية وبراءة الذمة</span>
                        </h3>
                        <p className="text-[10px] text-[#C4B998] mt-0.5">جاهزة للنسخ أو الحفظ</p>
                      </div>
                      <button onClick={() => setIsPreviewWasiyyahOpen(false)} className="text-[#C4B998] hover:text-white">
                        <X size={18} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-[#0A0907] p-4 rounded-2xl border border-[#C8A24A]/30 text-xs text-[#F3E5AB] whitespace-pre-wrap leading-relaxed font-arabic">
                      {generateFullWasiyyahText()}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#C8A24A]/25">
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(generateFullWasiyyahText());
                          setCopiedWasiyyah(true);
                          setTimeout(() => setCopiedWasiyyah(false), 2500);
                        }}
                        className="flex-1 py-2 rounded-xl athar-btn-primary text-xs flex items-center justify-center gap-1.5"
                      >
                        {copiedWasiyyah ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedWasiyyah ? 'تم نسخ الوصية بنجاح ✓' : 'نسخ الوصية كاملة'}</span>
                      </button>

                      <button
                        onClick={() => {
                          window.print();
                        }}
                        className="px-4 py-2 rounded-xl bg-[#1F1B12] hover:bg-[#2A2416] text-[#E6C66E] border border-[#C8A24A]/45 text-xs font-bold flex items-center gap-1.5"
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
