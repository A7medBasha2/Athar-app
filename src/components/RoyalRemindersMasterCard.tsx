import React, { useState } from 'react';
import { 
  Bell, BookOpen, Sparkles, Heart, FileText, ChevronDown, ChevronUp, 
  Play, Check, Clock, Volume2, ShieldCheck, Zap
} from 'lucide-react';
import { AppSettings, ReminderFrequency } from '../types';
import { VERIFIED_DHIKR_REMINDERS } from '../data/dhikrRemindersData';
import { VERIFIED_RECITERS, getAyahAudioUrl } from '../data/surahsData';
import { QuranService } from '../services/quranService';

interface RoyalRemindersMasterCardProps {
  settings: AppSettings;
  onUpdateSettings: (updated: AppSettings, message?: string) => void;
  onNavigateTab?: (tab: string) => void;
  onOpenTasbih?: () => void;
  onOpenWird?: () => void;
  onOpenParents?: () => void;
}

export const RoyalRemindersMasterCard: React.FC<RoyalRemindersMasterCardProps> = ({
  settings,
  onUpdateSettings,
  onNavigateTab,
  onOpenTasbih,
  onOpenWird,
  onOpenParents,
}) => {
  const [expandedSection, setExpandedSection] = useState<'none' | 'ayah' | 'salawat' | 'wird' | 'parents'>('none');
  const [testingId, setTestingId] = useState<string | null>(null);

  const toggleExpand = (section: 'ayah' | 'salawat' | 'wird' | 'parents') => {
    setExpandedSection((prev) => (prev === section ? 'none' : section));
  };

  // 1. Ayah Reminder Helpers
  const ayahEnabled = settings.quranVerseReminder?.enabled ?? true;
  const ayahFreq = settings.quranVerseReminder?.frequency || '2h';
  const ayahReciter = settings.quranVerseReminder?.reciterId || 'alafasy';

  const handleToggleAyah = () => {
    const updated: AppSettings = {
      ...settings,
      quranVerseReminder: {
        ...settings.quranVerseReminder,
        enabled: !ayahEnabled,
      },
    };
    onUpdateSettings(updated, !ayahEnabled ? 'تم تفعيل تنبيه «اقرأ ولو آية» الملكي ✓' : 'تم تعطيل تنبيه الآية');
  };

  const handleChangeAyahFreq = (freq: ReminderFrequency) => {
    const updated: AppSettings = {
      ...settings,
      quranVerseReminder: {
        ...settings.quranVerseReminder,
        frequency: freq,
      },
    };
    onUpdateSettings(updated, `تم ضبط تكرار الآية: ${getFreqLabel(freq)}`);
  };

  const handleChangeAyahReciter = (reciterId: string) => {
    const updated: AppSettings = {
      ...settings,
      quranVerseReminder: {
        ...settings.quranVerseReminder,
        reciterId,
      },
    };
    const reciterName = VERIFIED_RECITERS.find((r) => r.id === reciterId)?.nameArabic || 'القارئ';
    onUpdateSettings(updated, `تم اختيار القارئ: ${reciterName}`);
  };

  // 2. Salawat & Dhikr Helpers
  const salawatEnabled = settings.salawatReminder?.enabled ?? true;
  const salawatFreq = settings.salawatReminder?.frequency || '1h';
  const enabledDhikrsCount = settings.salawatReminder?.enabledDhikrIds?.length ?? VERIFIED_DHIKR_REMINDERS.length;

  const handleToggleSalawat = () => {
    const updated: AppSettings = {
      ...settings,
      salawatReminder: {
        ...settings.salawatReminder,
        enabled: !salawatEnabled,
      },
    };
    onUpdateSettings(updated, !salawatEnabled ? 'تم تفعيل تنبيه ذكر الله والصلاة على النبي ﷺ ✓' : 'تم تعطيل تنبيه الذكر');
  };

  const handleChangeSalawatFreq = (freq: ReminderFrequency) => {
    const updated: AppSettings = {
      ...settings,
      salawatReminder: {
        ...settings.salawatReminder,
        frequency: freq,
      },
    };
    onUpdateSettings(updated, `تم ضبط تكرار الذكر: ${getFreqLabel(freq)}`);
  };

  // 3. Wird Helpers
  const wirdEnabled = settings.dailyWirdReminder?.enabled ?? true;
  const wirdFreq = settings.dailyWirdReminder?.frequency || '4h';

  const handleToggleWird = () => {
    const updated: AppSettings = {
      ...settings,
      dailyWirdReminder: {
        ...settings.dailyWirdReminder,
        enabled: !wirdEnabled,
      },
    };
    onUpdateSettings(updated, !wirdEnabled ? 'تم تفعيل تذكير الورد القرآني اليومي ✓' : 'تم تعطيل تذكير الورد');
  };

  // 4. Parents Helpers
  const parentsEnabled = settings.parentsReminder?.enabled ?? true;
  const parentsFreq = settings.parentsReminder?.frequency || 'daily';

  const handleToggleParents = () => {
    const updated: AppSettings = {
      ...settings,
      parentsReminder: {
        ...settings.parentsReminder,
        enabled: !parentsEnabled,
      },
    };
    onUpdateSettings(updated, !parentsEnabled ? 'تم تفعيل تذكير بر الوالدين والإحسان ✓' : 'تم تعطيل تذكير بر الوالدين');
  };

  // Helper labels
  const getFreqLabel = (freq: string) => {
    switch (freq) {
      case '30m': return 'كل 30 دقيقة';
      case '1h': return 'كل ساعة';
      case '2h': return 'كل ساعتين';
      case '3h': return 'كل 3 ساعات';
      case '4h': return 'كل 4 ساعات';
      case 'twice_daily': return 'مرتان يومياً';
      case 'daily': return 'مرة يومياً';
      default: return freq;
    }
  };

  // Trigger Instant Safe Floating Alert Test
  const handleTestAlert = async (type: 'ayah' | 'salawat' | 'wird' | 'parents') => {
    setTestingId(type);
    try {
      if (type === 'ayah') {
        const verse = await QuranService.getRandomVerseForReminder();
        const reciter = VERIFIED_RECITERS.find((r) => r.id === ayahReciter) || VERIFIED_RECITERS[0];
        const sNum = verse?.surahNumber || 1;
        const aNum = verse?.ayahNumber || 1;
        const sName = verse?.surahName || 'الفاتحة';
        const vText = verse?.text || 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
        const audioUrl = getAyahAudioUrl(reciter.audioServer, sNum, aNum);

        window.dispatchEvent(
          new CustomEvent('athar_show_floating_alert', {
            detail: {
              type: 'ayah_daily',
              category: 'quran_ayah',
              badge: '📖 اقرأ ولو آية (آية واحدة عشوائية)',
              title: `سورة ${sName} • الآية ${aNum}`,
              body: `«${vText}»`,
              verseText: vText,
              surahNumber: sNum,
              ayahNumber: aNum,
              surahName: sName,
              tafsir: verse?.tafsir,
              reciterName: reciter.nameArabic,
              audioUrl,
              playSound: true,
              actionText: 'فتح الآية في المصحف 📖',
            },
          })
        );
      } else if (type === 'salawat') {
        const pick = VERIFIED_DHIKR_REMINDERS[Math.floor(Math.random() * VERIFIED_DHIKR_REMINDERS.length)];
        window.dispatchEvent(
          new CustomEvent('athar_show_floating_alert', {
            detail: {
              type: 'dhikr_salawat',
              category: 'salawat',
              badge: '📿 ذكر الله والصلاة على النبي ﷺ',
              title: pick.title,
              body: `${pick.arabicText}\n\n${pick.fadl || pick.categoryLabel}`,
              audioUrl: pick.audioUrl || '/audio/salawat.mp3',
              playSound: true,
              actionText: 'المسبحة والاستغفار 📿',
            },
          })
        );
      } else if (type === 'wird') {
        window.dispatchEvent(
          new CustomEvent('athar_show_floating_alert', {
            detail: {
              type: 'daily_wird',
              category: 'quran_wird',
              badge: '📜 الورد القرآني اليومي',
              title: 'حان موعد وردك القرآني المبارك',
              body: '«إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ»\nجدد عهدك مع كتاب الله واقرأ حزبك اليومي لتنال السكينة والبركة.',
              audioUrl: '/audio/wird.mp3',
              playSound: true,
              actionText: 'بدء قراءة الورد 📖',
            },
          })
        );
      } else if (type === 'parents') {
        window.dispatchEvent(
          new CustomEvent('athar_show_floating_alert', {
            detail: {
              type: 'parents_birr',
              category: 'parents_duty',
              badge: '🤍 بر الوالدين والإحسان',
              title: 'وقل رب ارحمهما كما ربياني صغيرا',
              body: 'تذكير نبوي ببر الوالدين والدعاء لهما وصلة رحمهما، أحب الأعمال إلى الله تعالى بعد الصلاة على وقتها.',
              audioUrl: '/audio/parents.mp3',
              playSound: true,
              actionText: 'دعاء وبر الوالدين 🤍',
            },
          })
        );
      }
    } catch (e) {
      console.warn('Test alert error:', e);
    } finally {
      setTimeout(() => setTestingId(null), 600);
    }
  };

  return (
    <section 
      aria-label="التنبيهات الملكية الأربعة"
      className="relative rounded-2xl overflow-hidden border border-[#D4AF37]/45 bg-gradient-to-b from-[#18130B] via-[#100D08] to-[#0A0805] shadow-[0_12px_36px_rgba(0,0,0,0.85)] p-4 sm:p-5 animate-fadeIn"
    >
      {/* Decorative Golden Aura Glow */}
      <div 
        className="absolute -top-10 -right-10 w-44 h-44 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ background: 'radial-gradient(circle, #E6C66E 0%, transparent 70%)' }}
      />

      {/* Header Bar */}
      <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-[#C8A24A]/25 relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#2D2311] to-[#120E06] border border-[#E6C66E]/50 flex items-center justify-center text-[#E6C66E] shadow-md shrink-0">
            <Zap size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-[#FFFDF8] font-arabic">
                التنبيهات الملكية الأربعة
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#241B0C] border border-[#C8A24A]/40 text-[#E6C66E]">
                النظام العائم الأساسي ✓
              </span>
            </div>
            <p className="text-xs text-[#C4B998] font-arabic mt-0.5">
              تنبيهات عائمة مدمجة تنبض بالذكر والبر فورياً دون إشغال شريط الإشعارات
            </p>
          </div>
        </div>
      </div>

      {/* The 4 Reminders Interactive Cards Grid */}
      <div className="mt-3.5 space-y-2.5 relative z-10">
        
        {/* 1. اقرأ ولو آية */}
        <div className="rounded-xl border border-[#C8A24A]/30 bg-[#120F0A]/90 p-3 transition-colors">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#1F180D] border border-[#C8A24A]/30 flex items-center justify-center text-[#E6C66E] shrink-0">
                <BookOpen size={17} />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-[#F5EFE0] truncate">
                  ١. اقرأ ولو آية (آية واحدة عشوائية مباركة)
                </h3>
                <span className="text-[11px] text-[#A89E88] block truncate">
                  {ayahEnabled ? `مفعل · ${getFreqLabel(ayahFreq)} · بصوت ${VERIFIED_RECITERS.find((r) => r.id === ayahReciter)?.nameArabic || 'العفاسي'}` : 'معطل'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleTestAlert('ayah')}
                disabled={testingId === 'ayah'}
                className="py-1 px-2.5 rounded-lg bg-[#20190D] border border-[#C8A24A]/40 hover:border-[#E6C66E] text-[#E6C66E] text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                title="تجربة التنبيه العائم الفوري"
              >
                <Play size={11} />
                <span>تجربة ⚡</span>
              </button>

              <button
                onClick={handleToggleAyah}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  ayahEnabled ? 'bg-gradient-to-r from-[#D4AF37] to-[#C8A24A]' : 'bg-[#221C12]'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-[#0A0805] block absolute top-1 transition-transform ${
                    ayahEnabled ? 'left-6' : 'left-1'
                  }`}
                />
              </button>

              <button
                onClick={() => toggleExpand('ayah')}
                className="text-[#A89E88] hover:text-[#E6C66E] p-1 transition-colors cursor-pointer"
              >
                {expandedSection === 'ayah' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>

          {/* Expanded Settings for Ayah */}
          {expandedSection === 'ayah' && (
            <div className="mt-3 pt-3 border-t border-[#C8A24A]/20 space-y-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-[#0A0805] border border-[#C8A24A]/20 text-[11px] text-[#C4B998] leading-relaxed">
                💡 <strong className="text-[#E6C66E]">فكرة «اقرأ ولو آية»:</strong> تنبيه ملكي عائم يأتيك بـ <strong className="text-white">آية واحدة فقط</strong> من القرآن الكريم بشكل عشوائي دون إطالة، مصحوبة بتلاوتها العطرة وتفسيرها الميسر.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-[#A89E88] block mb-1">تكرار التنبيه:</label>
                  <select
                    value={ayahFreq}
                    onChange={(e) => handleChangeAyahFreq(e.target.value as ReminderFrequency)}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-[#0A0805] border border-[#C8A24A]/30 text-[#E6C66E] font-bold text-xs"
                  >
                    <option value="1h">كل ساعة</option>
                    <option value="2h">كل ساعتين</option>
                    <option value="3h">كل 3 ساعات</option>
                    <option value="4h">كل 4 ساعات</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#A89E88] block mb-1">القارئ المعتمد للتلاوة:</label>
                  <select
                    value={ayahReciter}
                    onChange={(e) => handleChangeAyahReciter(e.target.value)}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-[#0A0805] border border-[#C8A24A]/30 text-[#E6C66E] font-bold text-xs"
                  >
                    {VERIFIED_RECITERS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nameArabic}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={() => handleTestAlert('ayah')}
                disabled={testingId === 'ayah'}
                className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-[#2A2010] to-[#17120A] border border-[#E6C66E]/40 hover:border-[#E6C66E] text-[#E6C66E] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <BookOpen size={13} />
                <span>عرض وتلاوة آية عشوائية الآن 📖</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. ذكر الله والصلاة على النبي ﷺ */}
        <div className="rounded-xl border border-[#C8A24A]/30 bg-[#120F0A]/90 p-3 transition-colors">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#1F180D] border border-[#C8A24A]/30 flex items-center justify-center text-[#E6C66E] shrink-0">
                <Sparkles size={17} />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-[#F5EFE0] truncate">
                  ٢. ذكر الله والصلاة على النبي ﷺ
                </h3>
                <span className="text-[11px] text-[#A89E88] block truncate">
                  {salawatEnabled ? `مفعل · ${getFreqLabel(salawatFreq)} · ${enabledDhikrsCount} ذكراً مسجلاً` : 'معطل'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleTestAlert('salawat')}
                disabled={testingId === 'salawat'}
                className="py-1 px-2.5 rounded-lg bg-[#20190D] border border-[#C8A24A]/40 hover:border-[#E6C66E] text-[#E6C66E] text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                title="تجربة التنبيه العائم الفوري"
              >
                <Play size={11} />
                <span>تجربة ⚡</span>
              </button>

              <button
                onClick={handleToggleSalawat}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  salawatEnabled ? 'bg-gradient-to-r from-[#D4AF37] to-[#C8A24A]' : 'bg-[#221C12]'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-[#0A0805] block absolute top-1 transition-transform ${
                    salawatEnabled ? 'left-6' : 'left-1'
                  }`}
                />
              </button>

              <button
                onClick={() => toggleExpand('salawat')}
                className="text-[#A89E88] hover:text-[#E6C66E] p-1 transition-colors cursor-pointer"
              >
                {expandedSection === 'salawat' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>

          {/* Expanded Settings for Salawat */}
          {expandedSection === 'salawat' && (
            <div className="mt-3 pt-3 border-t border-[#C8A24A]/20 space-y-2.5 text-xs">
              <div>
                <label className="text-[11px] text-[#A89E88] block mb-1">تكرار التنبيه الصوتي:</label>
                <select
                  value={salawatFreq}
                  onChange={(e) => handleChangeSalawatFreq(e.target.value as ReminderFrequency)}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-[#0A0805] border border-[#C8A24A]/30 text-[#E6C66E] font-bold text-xs"
                >
                  <option value="30m">كل 30 دقيقة</option>
                  <option value="1h">كل ساعة</option>
                  <option value="2h">كل ساعتين</option>
                  <option value="3h">كل 3 ساعات</option>
                </select>
              </div>

              <div className="p-2 rounded-lg bg-[#0A0805] border border-[#C8A24A]/20 flex items-center justify-between text-[11px]">
                <span className="text-[#C4B998]">الأذكار الـ 14 المعتمدة مسجلة بأصوات شجية نقية تلقائية التناوب</span>
                <button
                  onClick={() => onOpenTasbih && onOpenTasbih()}
                  className="text-[#E6C66E] font-bold underline cursor-pointer"
                >
                  فتح المسبحة 📿
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3. الورد القرآني اليومي */}
        <div className="rounded-xl border border-[#C8A24A]/30 bg-[#120F0A]/90 p-3 transition-colors">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#1F180D] border border-[#C8A24A]/30 flex items-center justify-center text-[#E6C66E] shrink-0">
                <FileText size={17} />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-[#F5EFE0] truncate">
                  ٣. الورد القرآني اليومي
                </h3>
                <span className="text-[11px] text-[#A89E88] block truncate">
                  {wirdEnabled ? `مفعل · تذكير بالورد وحفظ العهد مع القرآن` : 'معطل'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleTestAlert('wird')}
                disabled={testingId === 'wird'}
                className="py-1 px-2.5 rounded-lg bg-[#20190D] border border-[#C8A24A]/40 hover:border-[#E6C66E] text-[#E6C66E] text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                title="تجربة التنبيه العائم الفوري"
              >
                <Play size={11} />
                <span>تجربة ⚡</span>
              </button>

              <button
                onClick={handleToggleWird}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  wirdEnabled ? 'bg-gradient-to-r from-[#D4AF37] to-[#C8A24A]' : 'bg-[#221C12]'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-[#0A0805] block absolute top-1 transition-transform ${
                    wirdEnabled ? 'left-6' : 'left-1'
                  }`}
                />
              </button>

              <button
                onClick={() => toggleExpand('wird')}
                className="text-[#A89E88] hover:text-[#E6C66E] p-1 transition-colors cursor-pointer"
              >
                {expandedSection === 'wird' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>

          {/* Expanded Settings for Wird */}
          {expandedSection === 'wird' && (
            <div className="mt-3 pt-3 border-t border-[#C8A24A]/20 flex items-center justify-between text-xs">
              <span className="text-[#C4B998]">تذكير قرآني صوتي يحث على القراءة والتدبر اليومي</span>
              <button
                onClick={() => onOpenWird && onOpenWird()}
                className="text-[#E6C66E] font-bold underline cursor-pointer"
              >
                تخصيص الورد 📖
              </button>
            </div>
          )}
        </div>

        {/* 4. بر الوالدين والإحسان */}
        <div className="rounded-xl border border-[#C8A24A]/30 bg-[#120F0A]/90 p-3 transition-colors">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#1F180D] border border-[#C8A24A]/30 flex items-center justify-center text-[#E6C66E] shrink-0">
                <Heart size={17} />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-[#F5EFE0] truncate">
                  ٤. بر الوالدين والإحسان
                </h3>
                <span className="text-[11px] text-[#A89E88] block truncate">
                  {parentsEnabled ? `مفعل · تذكير بالدعاء والصلة والإحسان` : 'معطل'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleTestAlert('parents')}
                disabled={testingId === 'parents'}
                className="py-1 px-2.5 rounded-lg bg-[#20190D] border border-[#C8A24A]/40 hover:border-[#E6C66E] text-[#E6C66E] text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                title="تجربة التنبيه العائم الفوري"
              >
                <Play size={11} />
                <span>تجربة ⚡</span>
              </button>

              <button
                onClick={handleToggleParents}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  parentsEnabled ? 'bg-gradient-to-r from-[#D4AF37] to-[#C8A24A]' : 'bg-[#221C12]'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-[#0A0805] block absolute top-1 transition-transform ${
                    parentsEnabled ? 'left-6' : 'left-1'
                  }`}
                />
              </button>

              <button
                onClick={() => toggleExpand('parents')}
                className="text-[#A89E88] hover:text-[#E6C66E] p-1 transition-colors cursor-pointer"
              >
                {expandedSection === 'parents' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>

          {/* Expanded Settings for Parents */}
          {expandedSection === 'parents' && (
            <div className="mt-3 pt-3 border-t border-[#C8A24A]/20 flex items-center justify-between text-xs">
              <span className="text-[#C4B998]">دعاء نديّ وتذكير بالاتصال بالوالدين أو الدعاء لهما</span>
              <button
                onClick={() => onOpenParents && onOpenParents()}
                className="text-[#E6C66E] font-bold underline cursor-pointer"
              >
                سجل البر والأرحام 🤍
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Global Bottom Banner for the Floating Notification System */}
      <div className="mt-3.5 pt-3 border-t border-[#C8A24A]/25 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-[#A89E88] text-[11px]">
          <ShieldCheck size={15} className="text-[#E6C66E] shrink-0" />
          <span>النافذة العائمة الملكية تعمل فورياً فوق التطبيق وشاشة الهاتف مع تحكم صوتي متكامل</span>
        </div>

        <button
          onClick={() => handleTestAlert('ayah')}
          className="w-full sm:w-auto py-1.5 px-3.5 rounded-xl bg-gradient-to-r from-[#E6C66E] via-[#D4AF37] to-[#A6802B] text-[#0A0805] font-black text-xs shadow-md hover:brightness-105 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Zap size={13} />
          <span>فحص النافذة العائمة الآن ⚡</span>
        </button>
      </div>
    </section>
  );
};
