import React, { useState, useEffect } from 'react';
import { 
  Bell, BookOpen, Sparkles, Heart, FileText, ChevronDown, ChevronUp, 
  Play, Check, Clock, Volume2, VolumeX, PlayCircle, ShieldCheck, Zap, 
  Sliders, CheckSquare, Square, AlertTriangle, ShieldAlert, ChevronLeft
} from 'lucide-react';
import { AppSettings, ReminderFrequency, ReminderPlaybackMode } from '../types';
import { VERIFIED_DHIKR_REMINDERS } from '../data/dhikrRemindersData';
import { VERIFIED_RECITERS, getAyahAudioUrl } from '../data/surahsData';
import { QuranService } from '../services/quranService';
import { StorageService } from '../services/storageService';
import { NativePermissionsBridge } from '../services/nativePermissionsBridge';

interface RoyalRemindersMasterCardProps {
  settings: AppSettings;
  onUpdateSettings: (updated: AppSettings, message?: string) => void;
  onNavigateTab?: (tab: string) => void;
  onOpenTasbih?: () => void;
  onOpenWird?: () => void;
  onOpenParents?: () => void;
  onOpenWizard?: () => void;
}

export const RoyalRemindersMasterCard: React.FC<RoyalRemindersMasterCardProps> = ({
  settings,
  onUpdateSettings,
  onNavigateTab,
  onOpenTasbih,
  onOpenWird,
  onOpenParents,
  onOpenWizard,
}) => {
  const [expandedSection, setExpandedSection] = useState<'none' | 'ayah' | 'salawat' | 'wird' | 'parents'>('none');
  const [isDhikrListExpanded, setIsDhikrListExpanded] = useState<boolean>(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [missingPermissions, setMissingPermissions] = useState<{
    overlay: boolean;
    notifications: boolean;
  }>({ overlay: false, notifications: false });

  useEffect(() => {
    let isMounted = true;
    const checkPerms = async () => {
      if (NativePermissionsBridge.isNative()) {
        const [hasOverlay, hasNotifs] = await Promise.all([
          NativePermissionsBridge.canDrawOverlays(),
          NativePermissionsBridge.hasNotificationPermission(),
        ]);
        if (isMounted) {
          setMissingPermissions({
            overlay: !hasOverlay,
            notifications: !hasNotifs,
          });
        }
      }
    };
    checkPerms();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleExpand = (section: 'ayah' | 'salawat' | 'wird' | 'parents') => {
    setExpandedSection((prev) => (prev === section ? 'none' : section));
  };

  // Helper to persist immediately to storage
  const persistDirectly = (updated: AppSettings, message?: string) => {
    StorageService.saveSettings(updated);
    onUpdateSettings(updated, message);
  };

  const formatTime12h = (timeStr?: string) => {
    if (!timeStr) return '09:00 ص';
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    if (isNaN(h)) return timeStr;
    const period = h >= 12 ? 'م' : 'ص';
    h = h % 12;
    if (h === 0) h = 12;
    const formattedH = h < 10 ? `0${h}` : `${h}`;
    return `${formattedH}:${m} ${period}`;
  };

  const getFreqOrTimeLabel = (
    freq: string,
    scheduleType?: 'interval' | 'fixed_time',
    fixedTime?: string
  ) => {
    if (scheduleType === 'fixed_time') {
      return `الساعة ${formatTime12h(fixedTime || '09:00')}`;
    }
    return getFreqLabel(freq);
  };

  // 1. Ayah Reminder Helpers
  const ayahEnabled = settings.quranVerseReminder?.enabled ?? true;
  const ayahFreq = settings.quranVerseReminder?.frequency || '2h';
  const ayahScheduleType = settings.quranVerseReminder?.scheduleType || 'interval';
  const ayahFixedTime = settings.quranVerseReminder?.fixedTime || '09:00';
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

  const handleChangeAyahScheduleType = (scheduleType: 'interval' | 'fixed_time') => {
    const updated: AppSettings = {
      ...settings,
      quranVerseReminder: {
        ...settings.quranVerseReminder,
        scheduleType,
        fixedTime: ayahFixedTime,
      },
    };
    persistDirectly(updated, scheduleType === 'fixed_time' ? `تم ضبط موعد الآية اليومي: ${formatTime12h(ayahFixedTime)}` : 'تم ضبط الآية لتكرار دوري');
  };

  const handleChangeAyahFixedTime = (fixedTime: string) => {
    const updated: AppSettings = {
      ...settings,
      quranVerseReminder: {
        ...settings.quranVerseReminder,
        scheduleType: 'fixed_time',
        fixedTime,
      },
    };
    persistDirectly(updated, `تم ضبط موعد الآية اليومي: ${formatTime12h(fixedTime)}`);
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
  const salawatScheduleType = settings.salawatReminder?.scheduleType || 'interval';
  const salawatFixedTime = settings.salawatReminder?.fixedTime || '14:00';
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

  const handleChangeSalawatScheduleType = (scheduleType: 'interval' | 'fixed_time') => {
    const updated: AppSettings = {
      ...settings,
      salawatReminder: {
        ...settings.salawatReminder,
        scheduleType,
        fixedTime: salawatFixedTime,
      },
    };
    persistDirectly(updated, scheduleType === 'fixed_time' ? `تم ضبط موعد الذكر اليومي: ${formatTime12h(salawatFixedTime)}` : 'تم ضبط الذكر لتكرار دوري');
  };

  const handleChangeSalawatFixedTime = (fixedTime: string) => {
    const updated: AppSettings = {
      ...settings,
      salawatReminder: {
        ...settings.salawatReminder,
        scheduleType: 'fixed_time',
        fixedTime,
      },
    };
    persistDirectly(updated, `تم ضبط موعد الذكر اليومي: ${formatTime12h(fixedTime)}`);
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
  const wirdScheduleType = settings.dailyWirdReminder?.scheduleType || 'interval';
  const wirdFixedTime = settings.dailyWirdReminder?.fixedTime || '20:00';
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

  const handleChangeWirdScheduleType = (scheduleType: 'interval' | 'fixed_time') => {
    const updated: AppSettings = {
      ...settings,
      dailyWirdReminder: {
        ...settings.dailyWirdReminder,
        scheduleType,
        fixedTime: wirdFixedTime,
      },
    };
    persistDirectly(updated, scheduleType === 'fixed_time' ? `تم ضبط موعد الورد اليومي: ${formatTime12h(wirdFixedTime)}` : 'تم ضبط الورد لتكرار دوري');
  };

  const handleChangeWirdFixedTime = (fixedTime: string) => {
    const updated: AppSettings = {
      ...settings,
      dailyWirdReminder: {
        ...settings.dailyWirdReminder,
        scheduleType: 'fixed_time',
        fixedTime,
      },
    };
    persistDirectly(updated, `تم ضبط موعد الورد اليومي: ${formatTime12h(fixedTime)}`);
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
  const parentsScheduleType = settings.parentsReminder?.scheduleType || 'interval';
  const parentsFixedTime = settings.parentsReminder?.fixedTime || '18:00';
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

  const handleChangeParentsScheduleType = (scheduleType: 'interval' | 'fixed_time') => {
    const updated: AppSettings = {
      ...settings,
      parentsReminder: {
        ...settings.parentsReminder,
        scheduleType,
        fixedTime: parentsFixedTime,
      },
    };
    persistDirectly(updated, scheduleType === 'fixed_time' ? `تم ضبط موعد بر الوالدين اليومي: ${formatTime12h(parentsFixedTime)}` : 'تم ضبط بر الوالدين لتكرار دوري');
  };

  const handleChangeParentsFixedTime = (fixedTime: string) => {
    const updated: AppSettings = {
      ...settings,
      parentsReminder: {
        ...settings.parentsReminder,
        scheduleType: 'fixed_time',
        fixedTime,
      },
    };
    persistDirectly(updated, `تم ضبط موعد بر الوالدين اليومي: ${formatTime12h(fixedTime)}`);
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
      case '5s': return 'كل ٥ ثوانٍ (تجربة)';
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
      case 'notification_only': return 'إشعار صامت';
      case 'notification_with_play_action': return 'إشعار + زر تشغيل';
      case 'notification_and_sound': return 'إشعار + صوت تلقائي';
      default: return 'إشعار + صوت تلقائي';
    }
  };

  // Trigger Instant Safe Floating Alert Test honoring active mode via Native Android Floating Window
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

        const res = await NativePermissionsBridge.showSystemOverlayNotification({
          title: `سورة ${sName} • الآية ${aNum}`,
          body: `«${vText}»`,
          badge: '📖 اقرأ ولو آية (آية واحدة مباركة)',
          category: 'quran_ayah',
          audioUrl: ayahMode === 'notification_only' ? undefined : audioUrl,
          playSound: ayahMode === 'notification_and_sound',
          playbackMode: ayahMode,
          surahNumber: sNum,
          ayahNumber: aNum,
          actionText: 'فتح الآية في المصحف 📖',
          autoDismissSeconds: 15,
        });
        if (res?.requiresPermission) {
          NativePermissionsBridge.openOverlaySettings();
        }
      } else if (type === 'salawat') {
        let pool = VERIFIED_DHIKR_REMINDERS.filter((d) => enabledDhikrIds.includes(d.id));
        if (pool.length === 0) pool = VERIFIED_DHIKR_REMINDERS;
        const pick = pool[Math.floor(Math.random() * pool.length)];

        const res = await NativePermissionsBridge.showSystemOverlayNotification({
          title: pick.title,
          body: `${pick.arabicText}\n\n${pick.fadl || pick.categoryLabel}`,
          badge: '📿 ذكر الله والصلاة على النبي ﷺ',
          category: 'salawat',
          audioUrl: salawatMode === 'notification_only' ? undefined : (pick.audioUrl || '/audio/salawat.mp3'),
          playSound: salawatMode === 'notification_and_sound',
          playbackMode: salawatMode,
          actionText: 'فتح المسبحة والأذكار 📿',
          autoDismissSeconds: 15,
        });
        if (res?.requiresPermission) {
          NativePermissionsBridge.openOverlaySettings();
        }
      } else if (type === 'wird') {
        const res = await NativePermissionsBridge.showSystemOverlayNotification({
          title: 'حان موعد وردك القرآني المبارك',
          body: '«إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ»\nجدد عهدك مع كتاب الله واقرأ حزبك اليومي لتنال السكينة والبركة.',
          badge: '📜 الورد القرآني اليومي',
          category: 'quran_wird',
          audioUrl: wirdMode === 'notification_only' ? undefined : '/audio/wird.mp3',
          playSound: wirdMode === 'notification_and_sound',
          playbackMode: wirdMode,
          actionText: 'متابعة الورد في المصحف 📖',
          autoDismissSeconds: 15,
        });
        if (res?.requiresPermission) {
          NativePermissionsBridge.openOverlaySettings();
        }
      } else if (type === 'parents') {
        const res = await NativePermissionsBridge.showSystemOverlayNotification({
          title: 'وقل رب ارحمهما كما ربياني صغيرا',
          body: 'تذكير نبوي ببر الوالدين والدعاء لهما وصلة رحمهما، أحب الأعمال إلى الله تعالى بعد الصلاة على وقتها.',
          badge: '🤍 بر الوالدين والإحسان',
          category: 'parents_duty',
          audioUrl: parentsMode === 'notification_only' ? undefined : '/audio/parents.mp3',
          playSound: parentsMode === 'notification_and_sound',
          playbackMode: parentsMode,
          actionText: 'دعاء وبر الوالدين 🤲',
          autoDismissSeconds: 15,
        });
        if (res?.requiresPermission) {
          NativePermissionsBridge.openOverlaySettings();
        }
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

  // Reusable Schedule Selector: Interval vs Fixed Time Picker
  const renderScheduleSelector = (
    scheduleType: 'interval' | 'fixed_time',
    fixedTime: string,
    freq: ReminderFrequency,
    onScheduleTypeChange: (type: 'interval' | 'fixed_time') => void,
    onTimeChange: (time: string) => void,
    onFreqChange: (freq: ReminderFrequency) => void,
    freqOptions: { value: ReminderFrequency; label: string }[],
    label: string
  ) => {
    return (
      <div className="mt-2.5 p-2.5 rounded-xl bg-[#080704] border border-[#C8A24A]/25 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] text-[#A89E88] font-bold">
            جدولة مواعيد تنبيه {label}:
          </label>
          <span className="text-[10px] text-[#E6C66E] font-bold">
            {scheduleType === 'fixed_time' ? `وقت مخصص (${formatTime12h(fixedTime)})` : `تكرار دوري (${getFreqLabel(freq)})`}
          </span>
        </div>

        {/* Schedule Mode Switcher */}
        <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-[#141009] border border-[#C8A24A]/20">
          <button
            type="button"
            onClick={() => onScheduleTypeChange('interval')}
            className={`py-1.5 px-2 rounded-md text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              scheduleType === 'interval'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#C8A24A] text-[#0A0805] shadow-sm'
                : 'text-[#A89E88] hover:text-[#E6C66E]'
            }`}
          >
            <Clock size={12} />
            <span>تكرار دوري (كل فترة)</span>
          </button>

          <button
            type="button"
            onClick={() => onScheduleTypeChange('fixed_time')}
            className={`py-1.5 px-2 rounded-md text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              scheduleType === 'fixed_time'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#C8A24A] text-[#0A0805] shadow-sm'
                : 'text-[#A89E88] hover:text-[#E6C66E]'
            }`}
          >
            <Sparkles size={12} />
            <span>ساعة محددة في اليوم</span>
          </button>
        </div>

        {scheduleType === 'interval' ? (
          <div>
            <label className="text-[10px] text-[#A89E88] block mb-1">اختر الفترة الزمنية بين كل تنبيه والآخر:</label>
            <select
              value={freq}
              onChange={(e) => onFreqChange(e.target.value as ReminderFrequency)}
              className="w-full py-1.5 px-2.5 rounded-lg bg-[#141009] border border-[#C8A24A]/30 text-[#E6C66E] font-bold text-xs"
            >
              {freqOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[10px] text-[#A89E88]">اختر وقت التنبيه اليومي الدقيق:</label>
              <span className="text-xs font-mono font-bold text-[#E6C66E] px-2 py-0.5 rounded bg-[#1A140B] border border-[#C8A24A]/30">
                {formatTime12h(fixedTime)}
              </span>
            </div>
            <input
              type="time"
              value={fixedTime || '09:00'}
              onChange={(e) => onTimeChange(e.target.value)}
              className="w-full py-2 px-3 rounded-xl bg-[#141009] border border-[#C8A24A]/40 text-[#FFFDF8] font-mono text-sm focus:border-[#E6C66E] focus:outline-none"
            />
            {/* Quick Time Presets */}
            <div className="flex flex-wrap gap-1 pt-1">
              {[
                { label: 'الضحى 09:00 ص', time: '09:00' },
                { label: 'الظهر 01:00 م', time: '13:00' },
                { label: 'العصر 04:30 م', time: '16:30' },
                { label: 'المساء 08:30 م', time: '20:30' },
                { label: 'الوتر 10:30 م', time: '22:30' },
              ].map((p) => (
                <button
                  key={p.time}
                  type="button"
                  onClick={() => onTimeChange(p.time)}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                    fixedTime === p.time
                      ? 'bg-[#E6C66E]/20 text-[#E6C66E] border-[#E6C66E]'
                      : 'bg-[#120F0A] text-[#A89E88] border-[#C8A24A]/20 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
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

      {/* Smart Inline Permissions Warning Banner (Replaces standalone readiness section) */}
      {(missingPermissions.overlay || missingPermissions.notifications) && (
        <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-amber-950/60 via-[#1C1408] to-amber-950/60 border border-amber-500/50 text-amber-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md relative z-10 animate-slideDown">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <span className="font-extrabold text-white block">
                {missingPermissions.overlay && missingPermissions.notifications
                  ? 'يلزم تفعيل إذن الظهور فوق التطبيقات والإشعارات'
                  : missingPermissions.overlay
                  ? 'يلزم تفعيل إذن الظهور فوق التطبيقات للنافذة العائمة'
                  : 'يلزم تفعيل إذن الإشعارات لاستقبال التنبيهات'}
              </span>
              <span className="text-[11px] text-amber-300/80 block mt-0.5">
                اضغط هنا لفتح معالج التثبيت وتفعيل الأذونات لضمان عمل التنبيهات بدقة
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenWizard}
            className="w-full sm:w-auto py-1.5 px-3.5 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#C8A24A] text-black font-extrabold text-xs shadow hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>إكمال وضبط الأذونات (Wizard) ←</span>
          </button>
        </div>
      )}

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
                  {ayahEnabled ? `مفعل · ${getFreqOrTimeLabel(ayahFreq, ayahScheduleType, ayahFixedTime)} · ${getModeLabel(ayahMode)}` : 'معطل'}
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
                💡 <strong className="text-[#E6C66E]">فكرة «اقرأ ولو آية»:</strong> تنبيه ملكي عائم يأتيك بـ <strong className="text-white">آية واحدة فقط</strong> من القرآن الكريم مع زر فتح الآية مباشرة في المصحف لتلاوتها وتدبرها.
              </div>

              {/* Mode Selector */}
              {renderModeSelector(ayahMode, handleChangeAyahMode, 'الآية')}

              {/* Schedule Selector: Interval vs Fixed Time */}
              {renderScheduleSelector(
                ayahScheduleType,
                ayahFixedTime,
                ayahFreq,
                handleChangeAyahScheduleType,
                handleChangeAyahFixedTime,
                handleChangeAyahFreq,
                [
                  { value: '30m', label: 'كل 30 دقيقة' },
                  { value: '1h', label: 'كل ساعة' },
                  { value: '2h', label: 'كل ساعتين' },
                  { value: '3h', label: 'كل 3 ساعات' },
                  { value: '4h', label: 'كل 4 ساعات' },
                  { value: '6h', label: 'كل 6 ساعات' },
                ],
                'الآية'
              )}

              <div className="mt-2">
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
                  {salawatEnabled ? `مفعل · ${getFreqOrTimeLabel(salawatFreq, salawatScheduleType, salawatFixedTime)} · ${getModeLabel(salawatMode)}` : 'معطل'}
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

              {/* Schedule Selector */}
              {renderScheduleSelector(
                salawatScheduleType,
                salawatFixedTime,
                salawatFreq,
                handleChangeSalawatScheduleType,
                handleChangeSalawatFixedTime,
                handleChangeSalawatFreq,
                [
                  { value: '30m', label: 'كل 30 دقيقة' },
                  { value: '1h', label: 'كل ساعة' },
                  { value: '2h', label: 'كل ساعتين' },
                  { value: '3h', label: 'كل 3 ساعات' },
                ],
                'الذكر والصلاة'
              )}

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
                  {wirdEnabled ? `مفعل · ${getFreqOrTimeLabel(wirdFreq, wirdScheduleType, wirdFixedTime)} · ${getModeLabel(wirdMode)}` : 'معطل'}
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

              {/* Schedule Selector */}
              {renderScheduleSelector(
                wirdScheduleType,
                wirdFixedTime,
                wirdFreq,
                handleChangeWirdScheduleType,
                handleChangeWirdFixedTime,
                handleChangeWirdFreq,
                [
                  { value: '2h', label: 'كل ساعتين' },
                  { value: '4h', label: 'كل 4 ساعات' },
                  { value: '6h', label: 'كل 6 ساعات' },
                  { value: 'daily', label: 'مرة يومياً' },
                ],
                'الورد القرآني'
              )}

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
                  {parentsEnabled ? `مفعل · ${getFreqOrTimeLabel(parentsFreq, parentsScheduleType, parentsFixedTime)} · ${getModeLabel(parentsMode)}` : 'معطل'}
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

              {/* Schedule Selector */}
              {renderScheduleSelector(
                parentsScheduleType,
                parentsFixedTime,
                parentsFreq,
                handleChangeParentsScheduleType,
                handleChangeParentsFixedTime,
                handleChangeParentsFreq,
                [
                  { value: '30m', label: 'كل 30 دقيقة' },
                  { value: '4h', label: 'كل 4 ساعات' },
                  { value: 'daily', label: 'مرة يومياً' },
                  { value: 'twice_daily', label: 'مرتان يومياً' },
                ],
                'بر الوالدين'
              )}

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

      {/* Global Bottom Note for the Floating Notification System */}
      <div className="mt-3.5 pt-3 border-t border-[#C8A24A]/25 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-[#A89E88] text-[11px]">
          <ShieldCheck size={15} className="text-[#E6C66E] shrink-0" />
          <span>النافذة العائمة الملكية تعمل بطابور تسلسلي ذكي لمنع التراكم وتغلق تلقائياً بعد ١٥ ثانية</span>
        </div>
      </div>
    </section>
  );
};
