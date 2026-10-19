import React, { useState } from 'react';
import { 
  Bell, BookOpen, Sparkles, Heart, FileText, ChevronDown, ChevronUp, 
  Play, Check, Clock, Volume2, VolumeX, PlayCircle, ShieldCheck, Zap, 
  Sliders, CheckSquare, Square
} from 'lucide-react';
import { AppSettings, ReminderFrequency, ReminderPlaybackMode } from '../types';
import { VERIFIED_DHIKR_REMINDERS } from '../data/dhikrRemindersData';
import { VERIFIED_RECITERS, getAyahAudioUrl } from '../data/surahsData';
import { QuranService } from '../services/quranService';
import { StorageService } from '../services/storageService';

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
  const [isDhikrListExpanded, setIsDhikrListExpanded] = useState<boolean>(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const toggleExpand = (section: 'ayah' | 'salawat' | 'wird' | 'parents') => {
    setExpandedSection((prev) => (prev === section ? 'none' : section));
  };

  // Helper to persist immediately to storage
  const persistDirectly = (updated: AppSettings, message?: string) => {
    StorageService.saveSettings(updated);
    onUpdateSettings(updated, message);
  };

  // 1. Ayah Reminder Helpers
  const ayahEnabled = settings.quranVerseReminder?.enabled ?? true;
  const ayahFreq = settings.quranVerseReminder?.frequency || '2h';
  const ayahReciter = settings.quranVerseReminder?.reciterId || 'alafasy';
  const ayahMode: ReminderPlaybackMode = settings.quranVerseReminder?.mode || 'notification_and_sound';

  const handleToggleAyah = () => {
    const updated: AppSettings = {
      ...settings,
      quranVerseReminder: {
        ...settings.quranVerseReminder,
        enabled: !ayahEnabled,
      },
    };
    persistDirectly(updated, !ayahEnabled ? 'تم تفعيل تنبيه «اقرأ ولو آية» الملكي ✓' : 'تم تعطيل تنبيه الآية');
  };

  const handleChangeAyahFreq = (freq: ReminderFrequency) => {
    const updated: AppSettings = {
      ...settings,
      quranVerseReminder: {
        ...settings.quranVerseReminder,
        frequency: freq,
      },
    };
    persistDirectly(updated, `تم ضبط تكرار الآية: ${getFreqLabel(freq)}`);
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
    persistDirectly(updated, `تم اختيار القارئ: ${reciterName}`);
  };

  const handleChangeAyahMode = (mode: ReminderPlaybackMode) => {
    const updated: AppSettings = {
      ...settings,
      quranVerseReminder: {
        ...settings.quranVerseReminder,
        mode,
      },
    };
    persistDirectly(updated, `تم ضبط نمط الآية: ${getModeLabel(mode)} ✓`);
  };

  // 2. Salawat & Dhikr Helpers
  const salawatEnabled = settings.salawatReminder?.enabled ?? true;
  const salawatFreq = settings.salawatReminder?.frequency || '1h';
  const salawatMode: ReminderPlaybackMode = settings.salawatReminder?.mode || 'notification_and_sound';
  const enabledDhikrIds = settings.salawatReminder?.enabledDhikrIds || StorageService.getEnabledDhikrAlertIds();
  const enabledDhikrsCount = enabledDhikrIds.length;

  const handleToggleSalawat = () => {
    const updated: AppSettings = {
      ...settings,
      salawatReminder: {
        ...settings.salawatReminder,
        enabled: !salawatEnabled,
      },
    };
    persistDirectly(updated, !salawatEnabled ? 'تم تفعيل تنبيه ذكر الله والصلاة على النبي ﷺ ✓' : 'تم تعطيل تنبيه الذكر');
  };

  const handleChangeSalawatFreq = (freq: ReminderFrequency) => {
    const updated: AppSettings = {
      ...settings,
      salawatReminder: {
        ...settings.salawatReminder,
        frequency: freq,
      },
    };
    persistDirectly(updated, `تم ضبط تكرار الذكر: ${getFreqLabel(freq)}`);
  };

  const handleChangeSalawatMode = (mode: ReminderPlaybackMode) => {
    const updated: AppSettings = {
      ...settings,
      salawatReminder: {
        ...settings.salawatReminder,
        mode,
      },
    };
    persistDirectly(updated, `تم ضبط نمط الذكر: ${getModeLabel(mode)} ✓`);
  };

  const handleToggleSingleDhikr = (dhikrId: string) => {
    const isCurrentlyEnabled = enabledDhikrIds.includes(dhikrId);
    let next: string[];
    if (isCurrentlyEnabled) {
      if (enabledDhikrIds.length <= 1) {
        onUpdateSettings(settings, 'يجب إبقاء ذكر واحد على الأقل مفعلاً');
        return;
      }
      next = enabledDhikrIds.filter((id) => id !== dhikrId);
    } else {
      next = [...enabledDhikrIds, dhikrId];
    }

    const updated: AppSettings = {
      ...settings,
      salawatReminder: {
        ...settings.salawatReminder,
        enabledDhikrIds: next,
      },
    };
    StorageService.setEnabledDhikrAlertIds(next);
    persistDirectly(updated);
  };

  const handleToggleAllDhikrs = (enableAll: boolean) => {
    const next = enableAll ? VERIFIED_DHIKR_REMINDERS.map((d) => d.id) : [VERIFIED_DHIKR_REMINDERS[0].id];
    const updated: AppSettings = {
      ...settings,
      salawatReminder: {
        ...settings.salawatReminder,
        enabledDhikrIds: next,
      },
    };
    StorageService.setEnabledDhikrAlertIds(next);
    persistDirectly(updated, enableAll ? 'تم تفعيل جميع الأذكار الـ 14 ✓' : 'تم تفعيل ذكر واحد كحد أدنى');
  };

  // 3. Wird Helpers
  const wirdEnabled = settings.dailyWirdReminder?.enabled ?? true;
  const wirdFreq = settings.dailyWirdReminder?.frequency || '4h';
  const wirdMode: ReminderPlaybackMode = settings.dailyWirdReminder?.mode || 'notification_and_sound';

  const handleToggleWird = () => {
    const updated: AppSettings = {
      ...settings,
      dailyWirdReminder: {
        ...settings.dailyWirdReminder,
        enabled: !wirdEnabled,
      },
    };
    persistDirectly(updated, !wirdEnabled ? 'تم تفعيل تذكير الورد القرآني اليومي ✓' : 'تم تعطيل تذكير الورد');
  };

  const handleChangeWirdFreq = (freq: ReminderFrequency) => {
    const updated: AppSettings = {
      ...settings,
      dailyWirdReminder: {
        ...settings.dailyWirdReminder,
        frequency: freq,
      },
    };
    persistDirectly(updated, `تم ضبط تكرار الورد: ${getFreqLabel(freq)}`);
  };

  const handleChangeWirdMode = (mode: ReminderPlaybackMode) => {
    const updated: AppSettings = {
      ...settings,
      dailyWirdReminder: {
        ...settings.dailyWirdReminder,
        mode,
      },
    };
    persistDirectly(updated, `تم ضبط نمط الورد: ${getModeLabel(mode)} ✓`);
  };

  // 4. Parents Helpers
  const parentsEnabled = settings.parentsReminder?.enabled ?? true;
  const parentsFreq = settings.parentsReminder?.frequency || 'daily';
  const parentsMode: ReminderPlaybackMode = settings.parentsReminder?.mode || 'notification_and_sound';

  const handleToggleParents = () => {
    const updated: AppSettings = {
      ...settings,
      parentsReminder: {
        ...settings.parentsReminder,
        enabled: !parentsEnabled,
      },
    };
    persistDirectly(updated, !parentsEnabled ? 'تم تفعيل تذكير بر الوالدين والإحسان ✓' : 'تم تعطيل تذكير بر الوالدين');
  };

  const handleChangeParentsFreq = (freq: ReminderFrequency) => {
    const updated: AppSettings = {
      ...settings,
      parentsReminder: {
        ...settings.parentsReminder,
        frequency: freq,
      },
    };
    persistDirectly(updated, `تم ضبط تكرار بر الوالدين: ${getFreqLabel(freq)}`);
  };

  const handleChangeParentsMode = (mode: ReminderPlaybackMode) => {
    const updated: AppSettings = {
      ...settings,
      parentsReminder: {
        ...settings.parentsReminder,
        mode,
      },
    };
    persistDirectly(updated, `تم ضبط نمط بر الوالدين: ${getModeLabel(mode)} ✓`);
  };

  // Helper labels
  const getFreqLabel = (freq: string) => {
    switch (freq) {
      case '5s': return 'كل ٥ ثوانٍ (تجربة سريعة)';
      case '1m': return 'كل دقيقة (تجربة)';
      case '30m': return 'كل 30 دقيقة';
      case '1h': return 'كل ساعة';
      case '2h': return 'كل ساعتين';
      case '3h': return 'كل 3 ساعات';
      case '4h': return 'كل 4 ساعات';
      case '6h': return 'كل 6 ساعات';
      case '12h': return 'كل 12 ساعة';
      case 'twice_daily': return 'مرتان يومياً';
      case 'daily': return 'مرة يومياً';
      default: return freq;
    }
  };

  const getModeLabel = (mode?: ReminderPlaybackMode) => {
    switch (mode) {
      case 'notification_only': return 'إشعار صامت (بدون صوت)';
      case 'notification_with_play_action': return 'إشعار + زر تشغيل يدوي';
      case 'notification_and_sound': return 'إشعار + صوت تلقائي';
      default: return 'إشعار + صوت تلقائي';
    }
  };

  // Trigger Instant Safe Floating Alert Test honoring active mode
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
              badge: '📖 اقرأ ولو آية (آية واحدة مباركة)',
              title: `سورة ${sName} • الآية ${aNum}`,
              body: `«${vText}»`,
              verseText: vText,
              surahNumber: sNum,
              ayahNumber: aNum,
              surahName: sName,
              reciterName: reciter.nameArabic,
              audioUrl: ayahMode === 'notification_only' ? undefined : audioUrl,
              playSound: ayahMode === 'notification_and_sound',
              playbackMode: ayahMode,
              actionText: 'فتح الآية في المصحف 📖',
            },
          })
        );
      } else if (type === 'salawat') {
        let pool = VERIFIED_DHIKR_REMINDERS.filter((d) => enabledDhikrIds.includes(d.id));
        if (pool.length === 0) pool = VERIFIED_DHIKR_REMINDERS;
        const pick = pool[Math.floor(Math.random() * pool.length)];

        window.dispatchEvent(
          new CustomEvent('athar_show_floating_alert', {
            detail: {
              type: 'dhikr_salawat',
              category: 'salawat',
              badge: '📿 ذكر الله والصلاة على النبي ﷺ',
              title: pick.title,
              body: `${pick.arabicText}\n\n${pick.fadl || pick.categoryLabel}`,
              audioUrl: salawatMode === 'notification_only' ? undefined : (pick.audioUrl || '/audio/salawat.mp3'),
              playSound: salawatMode === 'notification_and_sound',
              playbackMode: salawatMode,
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
              audioUrl: wirdMode === 'notification_only' ? undefined : '/audio/wird.mp3',
              playSound: wirdMode === 'notification_and_sound',
              playbackMode: wirdMode,
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
              audioUrl: parentsMode === 'notification_only' ? undefined : '/audio/parents.mp3',
              playSound: parentsMode === 'notification_and_sound',
              playbackMode: parentsMode,
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

  // Reusable Mode Selector Segmented Control
  const renderModeSelector = (
    currentMode: ReminderPlaybackMode,
    onChange: (mode: ReminderPlaybackMode) => void,
    label: string
  ) => {
    return (
      <div className="mt-2.5">
        <label className="text-[11px] text-[#A89E88] block mb-1.5 font-bold">
          نمط تنبيه {label}:
        </label>
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#080704] border border-[#C8A24A]/25">
          <button
            type="button"
            onClick={() => onChange('notification_only')}
            className={`py-1.5 px-2 rounded-lg text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              currentMode === 'notification_only'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#C8A24A] text-[#0A0805] shadow-sm'
                : 'text-[#A89E88] hover:text-[#E6C66E] hover:bg-[#15120B]'
            }`}
          >
            <VolumeX size={13} />
            <span>إشعار صامت</span>
          </button>

          <button
            type="button"
            onClick={() => onChange('notification_and_sound')}
            className={`py-1.5 px-2 rounded-lg text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              currentMode === 'notification_and_sound'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#C8A24A] text-[#0A0805] shadow-sm'
                : 'text-[#A89E88] hover:text-[#E6C66E] hover:bg-[#15120B]'
            }`}
          >
            <Volume2 size={13} />
            <span>إشعار + صوت</span>
          </button>

          <button
            type="button"
            onClick={() => onChange('notification_with_play_action')}
            className={`py-1.5 px-2 rounded-lg text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              currentMode === 'notification_with_play_action'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#C8A24A] text-[#0A0805] shadow-sm'
                : 'text-[#A89E88] hover:text-[#E6C66E] hover:bg-[#15120B]'
            }`}
          >
            <PlayCircle size={13} />
            <span>زر تشغيل</span>
          </button>
        </div>
      </div>
    );
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
                النافذة العائمة الموحدة ✓
              </span>
            </div>
            <p className="text-xs text-[#C4B998] font-arabic mt-0.5">
              تنبيهات عائمة مدمجة مع تحكم صوتي مستقل وطابور انتظار تسلسلي احترافي
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
                  ١. اقرأ ولو آية (آية واحدة مباركة)
                </h3>
                <span className="text-[11px] text-[#A89E88] block truncate">
                  {ayahEnabled ? `مفعل · ${getFreqLabel(ayahFreq)} · ${getModeLabel(ayahMode)}` : 'معطل'}
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
                💡 <strong className="text-[#E6C66E]">فكرة «اقرأ ولو آية»:</strong> تنبيه ملكي عائم يأتيك بـ <strong className="text-white">آية واحدة فقط</strong> من القرآن الكريم بشكل عشوائي دون إطالة.
              </div>

              {/* Mode Selector */}
              {renderModeSelector(ayahMode, handleChangeAyahMode, 'الآية')}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-[11px] text-[#A89E88] block mb-1 font-bold">تكرار التنبيه:</label>
                  <select
                    value={ayahFreq}
                    onChange={(e) => handleChangeAyahFreq(e.target.value as ReminderFrequency)}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-[#0A0805] border border-[#C8A24A]/30 text-[#E6C66E] font-bold text-xs"
                  >
                    <option value="5s">كل ٥ ثوانٍ (تجربة سريعة ⚡)</option>
                    <option value="1m">كل دقيقة (تجربة ⚡)</option>
                    <option value="30m">كل 30 دقيقة</option>
                    <option value="1h">كل ساعة</option>
                    <option value="2h">كل ساعتين</option>
                    <option value="3h">كل 3 ساعات</option>
                    <option value="4h">كل 4 ساعات</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#A89E88] block mb-1 font-bold">القارئ المعتمد للتلاوة:</label>
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
                className="w-full mt-2 py-2 px-3 rounded-lg bg-gradient-to-r from-[#2A2010] to-[#17120A] border border-[#E6C66E]/40 hover:border-[#E6C66E] text-[#E6C66E] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <BookOpen size={13} />
                <span>عرض آية عشوائية الآن وفق النمط المختار 📖</span>
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
                  {salawatEnabled ? `مفعل · ${getFreqLabel(salawatFreq)} · ${getModeLabel(salawatMode)}` : 'معطل'}
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
            <div className="mt-3 pt-3 border-t border-[#C8A24A]/20 space-y-3 text-xs">
              {/* Mode Selector */}
              {renderModeSelector(salawatMode, handleChangeSalawatMode, 'الذكر والصلاة')}

              <div>
                <label className="text-[11px] text-[#A89E88] block mb-1 font-bold">تكرار التنبيه:</label>
                <select
                  value={salawatFreq}
                  onChange={(e) => handleChangeSalawatFreq(e.target.value as ReminderFrequency)}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-[#0A0805] border border-[#C8A24A]/30 text-[#E6C66E] font-bold text-xs"
                >
                  <option value="5s">كل ٥ ثوانٍ (تجربة سريعة ⚡)</option>
                  <option value="1m">كل دقيقة (تجربة ⚡)</option>
                  <option value="30m">كل 30 دقيقة</option>
                  <option value="1h">كل ساعة</option>
                  <option value="2h">كل ساعتين</option>
                  <option value="3h">كل 3 ساعات</option>
                </select>
              </div>

              {/* Collapsible 14 Dhikr Selection Accordion */}
              <div className="rounded-xl border border-[#C8A24A]/25 bg-[#0C0A06] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsDhikrListExpanded(!isDhikrListExpanded)}
                  className="w-full p-2.5 flex items-center justify-between text-left hover:bg-[#15110A] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Sliders size={14} className="text-[#E6C66E]" />
                    <span className="font-bold text-[#F5EFE0] text-xs">
                      تخصيص أذكار الصلاة على النبي والذكر (١٤ ذكراً)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] py-0.5 px-2 rounded-full bg-[#1C160B] border border-[#C8A24A]/30 text-[#E6C66E] font-bold">
                      {enabledDhikrsCount} من ١٤ مفعّل
                    </span>
                    {isDhikrListExpanded ? <ChevronUp size={15} className="text-[#C4B998]" /> : <ChevronDown size={15} className="text-[#C4B998]" />}
                  </div>
                </button>

                {isDhikrListExpanded && (
                  <div className="p-2.5 border-t border-[#C8A24A]/20 space-y-2 animate-slideDown">
                    {/* Quick Bulk Actions */}
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#C8A24A]/15 text-[11px]">
                      <span className="text-[#A89E88]">اختر ما يعمل وما لا يعمل بالتناوب:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleAllDhikrs(true)}
                          className="text-[#E6C66E] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <CheckSquare size={12} />
                          <span>تفعيل الكل</span>
                        </button>
                        <span className="text-[#554E3C]">|</span>
                        <button
                          type="button"
                          onClick={() => handleToggleAllDhikrs(false)}
                          className="text-[#A89E88] hover:text-white hover:underline cursor-pointer"
                        >
                          إلغاء التحديد
                        </button>
                      </div>
                    </div>

                    {/* 14 Dhikr Items List */}
                    <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                      {VERIFIED_DHIKR_REMINDERS.map((dhikr, idx) => {
                        const isChecked = enabledDhikrIds.includes(dhikr.id);
                        return (
                          <div 
                            key={dhikr.id}
                            onClick={() => handleToggleSingleDhikr(dhikr.id)}
                            className={`p-2 rounded-lg border transition-all cursor-pointer flex items-start justify-between gap-2.5 ${
                              isChecked 
                                ? 'bg-[#18130B] border-[#C8A24A]/40 text-[#FFFDF8]' 
                                : 'bg-[#0E0C08]/50 border-white/5 text-[#887F6E] opacity-65 hover:opacity-90'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono text-[#D4AF37]/80">{idx + 1}.</span>
                                <h4 className="text-xs font-bold truncate">
                                  {dhikr.title}
                                </h4>
                              </div>
                              <p className="font-arabic text-[11px] text-[#E6C66E] mt-0.5 line-clamp-1">
                                {dhikr.arabicText}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-[9px] text-[#A89E88]">
                                <span>{dhikr.categoryLabel}</span>
                                <span>•</span>
                                <span>{dhikr.durationSeconds} ثانية</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleSingleDhikr(dhikr.id);
                              }}
                              className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors cursor-pointer ${
                                isChecked 
                                  ? 'bg-[#E6C66E] border-[#F3E5AB] text-[#0A0805]' 
                                  : 'bg-[#15120B] border-[#443822] text-transparent'
                              }`}
                            >
                              <Check size={14} className={isChecked ? 'opacity-100' : 'opacity-0'} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-2 rounded-lg bg-[#0A0805] border border-[#C8A24A]/20 flex items-center justify-between text-[11px]">
                <span className="text-[#C4B998]">الأذكار المحددة تدور تلقائياً في كل دورة تذكير</span>
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
                  {wirdEnabled ? `مفعل · ${getFreqLabel(wirdFreq)} · ${getModeLabel(wirdMode)}` : 'معطل'}
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
            <div className="mt-3 pt-3 border-t border-[#C8A24A]/20 space-y-2.5 text-xs">
              {/* Mode Selector */}
              {renderModeSelector(wirdMode, handleChangeWirdMode, 'الورد القرآني')}

              <div>
                <label className="text-[11px] text-[#A89E88] block mb-1 font-bold">تكرار تذكير الورد:</label>
                <select
                  value={wirdFreq}
                  onChange={(e) => handleChangeWirdFreq(e.target.value as ReminderFrequency)}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-[#0A0805] border border-[#C8A24A]/30 text-[#E6C66E] font-bold text-xs"
                >
                  <option value="5s">كل ٥ ثوانٍ (تجربة سريعة ⚡)</option>
                  <option value="1m">كل دقيقة (تجربة ⚡)</option>
                  <option value="30m">كل 30 دقيقة</option>
                  <option value="2h">كل ساعتين</option>
                  <option value="4h">كل 4 ساعات</option>
                  <option value="daily">مرة يومياً</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[#C4B998]">تذكير يحث على القراءة والتدبر اليومي</span>
                <button
                  onClick={() => onOpenWird && onOpenWird()}
                  className="text-[#E6C66E] font-bold underline cursor-pointer"
                >
                  تخصيص الورد 📖
                </button>
              </div>
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
                  {parentsEnabled ? `مفعل · ${getFreqLabel(parentsFreq)} · ${getModeLabel(parentsMode)}` : 'معطل'}
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
            <div className="mt-3 pt-3 border-t border-[#C8A24A]/20 space-y-2.5 text-xs">
              {/* Mode Selector */}
              {renderModeSelector(parentsMode, handleChangeParentsMode, 'بر الوالدين')}

              <div>
                <label className="text-[11px] text-[#A89E88] block mb-1 font-bold">تكرار تذكير البر:</label>
                <select
                  value={parentsFreq}
                  onChange={(e) => handleChangeParentsFreq(e.target.value as ReminderFrequency)}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-[#0A0805] border border-[#C8A24A]/30 text-[#E6C66E] font-bold text-xs"
                >
                  <option value="5s">كل ٥ ثوانٍ (تجربة سريعة ⚡)</option>
                  <option value="1m">كل دقيقة (تجربة ⚡)</option>
                  <option value="30m">كل 30 دقيقة</option>
                  <option value="daily">مرة يومياً</option>
                  <option value="twice_daily">مرتان يومياً</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[#C4B998]">تذكير بالاتصال بالوالدين أو الدعاء لهما</span>
                <button
                  onClick={() => onOpenParents && onOpenParents()}
                  className="text-[#E6C66E] font-bold underline cursor-pointer"
                >
                  سجل البر والأرحام 🤍
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Global Bottom Banner for the Floating Notification System */}
      <div className="mt-3.5 pt-3 border-t border-[#C8A24A]/25 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-[#A89E88] text-[11px]">
          <ShieldCheck size={15} className="text-[#E6C66E] shrink-0" />
          <span>النافذة العائمة تحفظ النمط فوراً وتعمل بطابور تسلسلي لمنع تداخل الأصوات</span>
        </div>

        <button
          onClick={() => handleTestAlert('ayah')}
          className="w-full sm:w-auto py-1.5 px-3.5 rounded-xl bg-gradient-to-r from-[#E6C66E] via-[#D4AF37] to-[#A6802B] text-[#0A0805] font-black text-xs shadow-md hover:brightness-105 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Zap size={13} />
          <span>فحص التنبيه العائم الآن ⚡</span>
        </button>
      </div>
    </section>
  );
};
