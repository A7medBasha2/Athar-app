import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { ReminderEngine } from '../services/reminderService';
import { NativePermissions } from '../services/nativePermissionsBridge';
import { PrayersAdhanConfig, ObligatoryPrayerId, AppSettings, ReminderSetting, ReminderFrequency } from '../types';
import { RoyalReminderEngine, RoyalNotificationType } from '../services/royalReminderEngine';
import { NativeNotificationService } from '../services/nativeNotificationService';
import { 
  Bell, BellRing, BellOff, Volume2, VolumeX, Smartphone, 
  ShieldCheck, Sparkles, RefreshCw, Play, Timer, ExternalLink, 
  Check, CheckCircle2, ChevronRight, AlertCircle, BookOpen, Heart, Clock, Calendar, Save, Layers
} from 'lucide-react';

interface RemindersViewProps {
  onClose?: () => void;
}

export const RemindersView: React.FC<RemindersViewProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<AppSettings>(() => StorageService.getSettings());
  const [prayersConfig, setPrayersConfig] = useState<PrayersAdhanConfig>(() =>
    StorageService.getPrayersAdhanConfig()
  );
  const [countdown5s, setCountdown5s] = useState<number | null>(null);
  const [selectedPrayer, setSelectedPrayer] = useState<ObligatoryPrayerId>('maghrib');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Independent 5-second countdowns for the 4 Royal alerts
  const [royalCountdowns, setRoyalCountdowns] = useState<Record<RoyalNotificationType, number | null>>({
    ayah_daily: null,
    dhikr_salawat: null,
    daily_wird: null,
    parents_birr: null,
  });

  useEffect(() => {
    const handleUpdate = () => {
      setPrayersConfig(StorageService.getPrayersAdhanConfig());
      setSettings(StorageService.getSettings());
    };
    window.addEventListener('athar_adhan_config_changed', handleUpdate);
    window.addEventListener('athar_settings_changed', handleUpdate);
    return () => {
      window.removeEventListener('athar_adhan_config_changed', handleUpdate);
      window.removeEventListener('athar_settings_changed', handleUpdate);
    };
  }, []);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleUpdateSetting = (updatedSettings: AppSettings, msg?: string) => {
    StorageService.saveSettings(updatedSettings);
    setSettings(updatedSettings);
    NativeNotificationService.scheduleAllRoyalNativeAlarms().catch(() => {});
    if (msg) showToast(msg);
  };

  const handleTogglePrayer = (prayerId: ObligatoryPrayerId) => {
    const nextVal = StorageService.togglePrayerAdhan(prayerId);
    setPrayersConfig(StorageService.getPrayersAdhanConfig());
    const names: Record<ObligatoryPrayerId, string> = {
      fajr: 'الفجر',
      dhuhr: 'الظهر',
      asr: 'العصر',
      maghrib: 'المغرب',
      isha: 'العشاء',
    };
    showToast(`${nextVal ? 'تم تفعيل' : 'تم كتم/تعطيل'} أذان صلاة ${names[prayerId]}`);
  };

  const handleResetAllAlerts = () => {
    StorageService.resetPrayersAdhanConfig();
    setPrayersConfig(StorageService.getPrayersAdhanConfig());
    showToast('تم إعادة ضبط تنبيهات الصلوات الخمس بنجاح ✓');
  };

  const handleTrigger5SecondsAdhan = () => {
    showToast('بدأ العد التنازلي: اقفل شاشة الهاتف أو اخرج من التطبيق الآن!');
    setCountdown5s(5);
    ReminderEngine.trigger5SecondDelayedTest(selectedPrayer, (sec) => {
      if (sec > 0) {
        setCountdown5s(sec);
      } else {
        setCountdown5s(null);
      }
    });
  };

  const handleTestRoyalAlert = (type: RoyalNotificationType) => {
    if (royalCountdowns[type] !== null) {
      RoyalReminderEngine.clearAutoDismissTimer();
      setRoyalCountdowns((prev) => ({ ...prev, [type]: null }));
      showToast('تم إلغاء الاختبار التجريبي');
      return;
    }

    showToast('بدأ العد التنازلي (5 ثوانٍ).. اقفل الشاشة أو افتح واتساب/فيسبوك لمعاينة التنبيه الملكي العائم!');
    RoyalReminderEngine.trigger5SecondTest(type, (remaining) => {
      if (remaining > 0) {
        setRoyalCountdowns((prev) => ({ ...prev, [type]: remaining }));
      } else {
        setRoyalCountdowns((prev) => ({ ...prev, [type]: null }));
      }
    });
  };

  const prayersList: { id: ObligatoryPrayerId; name: string; desc: string }[] = [
    { id: 'fajr', name: 'صلاة الفجر', desc: 'نداء الفجر وبداية اليوم المبارك' },
    { id: 'dhuhr', name: 'صلاة الظهر', desc: 'نداء الهاجرة ومنتصف النهار' },
    { id: 'asr', name: 'صلاة العصر', desc: 'الصلاة الوسطى ومطلع الإشراق' },
    { id: 'maghrib', name: 'صلاة المغرب', desc: 'نداء الغروب والإفطار' },
    { id: 'isha', name: 'صلاة العشاء', desc: 'نداء السكينة وخاتمة اليوم' },
  ];

  const frequencyOptions: { id: ReminderFrequency; label: string }[] = [
    { id: '30m', label: 'كل ٣٠ دقيقة' },
    { id: '1h', label: 'كل ساعة' },
    { id: '2h', label: 'كل ساعتين' },
    { id: '3h', label: 'كل ٣ ساعات' },
    { id: '4h', label: 'كل ٤ ساعات' },
    { id: '6h', label: 'كل ٦ ساعات' },
    { id: '12h', label: 'كل ١٢ ساعة' },
    { id: 'daily', label: 'يومياً' },
  ];

  return (
    <div className="athar-page-container space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="sticky top-2 z-50 p-3 rounded-2xl bg-gradient-to-r from-[#211B0E] via-[#2F2613] to-[#211B0E] border border-[#E6C66E]/70 text-[#F5EFE0] text-xs font-bold flex items-center gap-2.5 shadow-[0_12px_30px_rgba(0,0,0,0.9)] animate-slideDown">
          <CheckCircle2 size={16} className="text-[#E6C66E] shrink-0" />
          <span className="leading-snug">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-[#C8A24A]/30 bg-gradient-to-b from-[#18140D] via-[#0E0C08] to-[#070605] shadow-[0_15px_45px_rgba(0,0,0,0.95)] pt-6 pb-5 px-5 text-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-[#E6C66E] text-black flex items-center justify-center shadow-[0_0_20px_rgba(230,198,110,0.45)] mb-2.5">
            <BellRing size={22} className="animate-pulse" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#F5EFE0] font-arabic">
            مركز التنبيهات وجدولة المواعيد الملكية
          </h1>
          <p className="text-xs text-[#C4B998] mt-1 max-w-sm leading-relaxed">
            التحكم الشامل في أذان الصلوات الخمس ومواقيت التذكيرات الإسلامية الدقيقة
          </p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: MASTER REMINDERS TIMINGS & FLEXIBLE SCHEDULES */}
      {/* ======================================================== */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-[#1C160E] via-[#120E09] to-[#0A0805] border-2 border-[#E6C66E]/60 shadow-[0_12px_36px_rgba(0,0,0,0.9)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E6C66E]/20 text-[#E6C66E] border border-[#E6C66E]/40 flex items-center justify-center shadow-[0_0_15px_rgba(230,198,110,0.3)] shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-[#FFFDF8] font-arabic">
                قسم مواقيت التنبيهات الإسلامية المخصصة
              </h2>
              <p className="text-[10px] text-[#A89E88] mt-0.5">
                اضبط موعد وتكرار كل تنبيه بحرية تامة: فترات دورية أو توقيت ثابت على مدار اليوم
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              NativeNotificationService.scheduleAllRoyalNativeAlarms().catch(() => {});
              showToast('تمت مزامنة كافة مواقيت التنبيهات مع منبه أندرويد الدقيق بنجاح ✓');
            }}
            className="px-3 py-1.5 rounded-xl bg-[#231A0F] border border-[#E6C66E]/50 text-[#E6C66E] hover:text-[#FFFDF8] text-[11px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
          >
            <Save size={13} />
            <span>حفظ ومزامنة</span>
          </button>
        </div>

        {/* 1. ALERT: اقرأ ولو آية في اليوم */}
        <div className="p-4 rounded-2xl bg-[#140F09] border border-[#C8A24A]/35 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#E6C66E]/15 border border-[#E6C66E]/30 text-[#E6C66E] flex items-center justify-center">
                <BookOpen size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-[#FFFDF8]">التنبيه الأول: اقرأ ولو آية في اليوم</div>
                <div className="text-[10px] text-[#A89E88]">تلاوة صوتية محققة للآية المختارة يومياً من المصحف</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.quranVerseReminder?.enabled ?? true}
              onChange={(e) => {
                const updated = {
                  ...settings,
                  quranVerseReminder: {
                    ...settings.quranVerseReminder,
                    enabled: e.target.checked,
                  },
                };
                handleUpdateSetting(updated, e.target.checked ? 'تم تفعيل تنبيه اقرأ ولو آية ✓' : 'تم تعطيل التنبيه');
              }}
              className="accent-[#E6C66E] w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Schedule Style Selector: Interval vs Fixed Time */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#0B0906] border border-[#C8A24A]/20">
            <button
              onClick={() => {
                const updated = {
                  ...settings,
                  quranVerseReminder: {
                    ...settings.quranVerseReminder,
                    scheduleType: 'interval' as const,
                    frequency: settings.quranVerseReminder?.frequency || '30m',
                  },
                };
                handleUpdateSetting(updated, 'تم اختيار نمط التكرار الدوري لتنبيه الآية');
              }}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                settings.quranVerseReminder?.scheduleType === 'interval' || (settings.quranVerseReminder?.scheduleType !== 'fixed_time' && settings.quranVerseReminder?.frequency !== 'daily')
                  ? 'bg-[#E6C66E] text-black font-black shadow-sm'
                  : 'text-[#A89E88] hover:text-[#F5EFE0]'
              }`}
            >
              <Clock size={12} />
              <span>تكرار دوري (مثلاً كل ٣٠ دقيقة)</span>
            </button>
            <button
              onClick={() => {
                const updated = {
                  ...settings,
                  quranVerseReminder: {
                    ...settings.quranVerseReminder,
                    scheduleType: 'fixed_time' as const,
                    frequency: 'daily' as const,
                    fixedTime: settings.quranVerseReminder?.fixedTime || settings.quranVerseReminder?.startTime || '08:30',
                  },
                };
                handleUpdateSetting(updated, 'تم اختيار نمط التوقيت الثابت لتنبيه الآية');
              }}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                settings.quranVerseReminder?.scheduleType === 'fixed_time' || settings.quranVerseReminder?.frequency === 'daily'
                  ? 'bg-[#E6C66E] text-black font-black shadow-sm'
                  : 'text-[#A89E88] hover:text-[#F5EFE0]'
              }`}
            >
              <Calendar size={12} />
              <span>وقت محدد خلال اليوم</span>
            </button>
          </div>

          {/* Timing details depending on mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {settings.quranVerseReminder?.scheduleType === 'interval' || (settings.quranVerseReminder?.scheduleType !== 'fixed_time' && settings.quranVerseReminder?.frequency !== 'daily') ? (
              <div>
                <label className="text-[10px] text-[#A89E88] block mb-1">فترة التكرار الدوري:</label>
                <select
                  value={settings.quranVerseReminder?.frequency || '30m'}
                  onChange={(e) => {
                    const updated = {
                      ...settings,
                      quranVerseReminder: {
                        ...settings.quranVerseReminder,
                        scheduleType: 'interval' as const,
                        frequency: e.target.value as ReminderFrequency,
                      },
                    };
                    handleUpdateSetting(updated, `تم ضبط تكرار الآية: ${frequencyOptions.find(f => f.id === e.target.value)?.label} ✓`);
                  }}
                  className="w-full py-1.5 px-2 rounded-xl bg-[#0E0B07] border border-[#C8A24A]/30 text-xs text-[#FFFDF8]"
                >
                  {frequencyOptions.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-[10px] text-[#A89E88] block mb-1">الساعة المحددة للتنبيه اليومي:</label>
                <input
                  type="time"
                  value={settings.quranVerseReminder?.fixedTime || settings.quranVerseReminder?.startTime || '08:30'}
                  onChange={(e) => {
                    const updated = {
                      ...settings,
                      quranVerseReminder: {
                        ...settings.quranVerseReminder,
                        scheduleType: 'fixed_time' as const,
                        fixedTime: e.target.value,
                        startTime: e.target.value,
                      },
                    };
                    handleUpdateSetting(updated, `تم ضبط موعد تنبيه الآية اليومي على ${e.target.value} ✓`);
                  }}
                  className="w-full py-1.5 px-2 rounded-xl bg-[#0E0B07] border border-[#C8A24A]/30 text-xs text-[#FFFDF8] font-mono"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] text-[#A89E88] block mb-1">نمط التنبيه الصوتي:</label>
              <select
                value={settings.quranVerseReminder?.mode || 'notification_and_sound'}
                onChange={(e) => {
                  const updated = {
                    ...settings,
                    quranVerseReminder: {
                      ...settings.quranVerseReminder,
                      mode: e.target.value as any,
                    },
                  };
                  handleUpdateSetting(updated, 'تم تحديث نمط الصوت ✓');
                }}
                className="w-full py-1.5 px-2 rounded-xl bg-[#0E0B07] border border-[#C8A24A]/30 text-xs text-[#FFFDF8]"
              >
                <option value="notification_and_sound">صوت تلقائي فوري عبر ExoPlayer 🔊</option>
                <option value="notification_with_play_action">إشعار مع زر تشغيل الصوت ⏯️</option>
                <option value="notification_only">إشعار مرئي صامت 🔕</option>
              </select>
            </div>
          </div>

          {/* Test 5s Button */}
          <button
            type="button"
            onClick={() => handleTestRoyalAlert('ayah_daily')}
            className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 ${
              royalCountdowns.ayah_daily !== null
                ? 'bg-[#E6C66E] text-black border-[#E6C66E] shadow-md animate-pulse'
                : 'bg-[#1A140C] text-[#E6C66E] border-[#E6C66E]/40 hover:bg-[#E6C66E]/15'
            }`}
          >
            <Timer size={14} />
            <span>
              {royalCountdowns.ayah_daily !== null
                ? `⏳ اختبار التنبيه بعد ${royalCountdowns.ayah_daily} ثوانٍ (انقر للإلغاء)`
                : 'اختبار تنبيه «اقرأ ولو آية» بعد ٥ ثوانٍ (لقفل الشاشة أو تجربة النافذة العائمة)'}
            </span>
          </button>
        </div>

        {/* 2. ALERT: ذكر الله والصلاة على النبي ﷺ */}
        <div className="p-4 rounded-2xl bg-[#140F09] border border-[#C8A24A]/35 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#E6C66E]/15 border border-[#E6C66E]/30 text-[#E6C66E] flex items-center justify-center">
                <Sparkles size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-[#FFFDF8]">التنبيه الثاني: ذكر الله والصلاة على النبي ﷺ</div>
                <div className="text-[10px] text-[#A89E88]">١٤ ذكراً وصلاة بصوتها المسجل المتطابق تماماً</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.salawatReminder?.enabled ?? true}
              onChange={(e) => {
                const updated = {
                  ...settings,
                  salawatReminder: {
                    ...settings.salawatReminder,
                    enabled: e.target.checked,
                  },
                };
                handleUpdateSetting(updated, e.target.checked ? 'تم تفعيل تنبيه الصلاة على النبي ﷺ ✓' : 'تم تعطيل التنبيه');
              }}
              className="accent-[#E6C66E] w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Schedule Style Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#0B0906] border border-[#C8A24A]/20">
            <button
              onClick={() => {
                const updated = {
                  ...settings,
                  salawatReminder: {
                    ...settings.salawatReminder,
                    scheduleType: 'interval' as const,
                    frequency: settings.salawatReminder?.frequency || '1h',
                  },
                };
                handleUpdateSetting(updated, 'تم اختيار نمط التكرار الدوري لتنبيه الأذكار');
              }}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                settings.salawatReminder?.scheduleType === 'interval' || (settings.salawatReminder?.scheduleType !== 'fixed_time' && settings.salawatReminder?.frequency !== 'daily')
                  ? 'bg-[#E6C66E] text-black font-black shadow-sm'
                  : 'text-[#A89E88] hover:text-[#F5EFE0]'
              }`}
            >
              <Clock size={12} />
              <span>تكرار دوري (مثلاً كل ساعة)</span>
            </button>
            <button
              onClick={() => {
                const updated = {
                  ...settings,
                  salawatReminder: {
                    ...settings.salawatReminder,
                    scheduleType: 'fixed_time' as const,
                    frequency: 'daily' as const,
                    fixedTime: settings.salawatReminder?.fixedTime || settings.salawatReminder?.startTime || '10:00',
                  },
                };
                handleUpdateSetting(updated, 'تم اختيار نمط التوقيت الثابت لتنبيه الأذكار');
              }}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                settings.salawatReminder?.scheduleType === 'fixed_time' || settings.salawatReminder?.frequency === 'daily'
                  ? 'bg-[#E6C66E] text-black font-black shadow-sm'
                  : 'text-[#A89E88] hover:text-[#F5EFE0]'
              }`}
            >
              <Calendar size={12} />
              <span>وقت محدد خلال اليوم</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {settings.salawatReminder?.scheduleType === 'interval' || (settings.salawatReminder?.scheduleType !== 'fixed_time' && settings.salawatReminder?.frequency !== 'daily') ? (
              <div>
                <label className="text-[10px] text-[#A89E88] block mb-1">فترة التكرار الدوري:</label>
                <select
                  value={settings.salawatReminder?.frequency || '1h'}
                  onChange={(e) => {
                    const updated = {
                      ...settings,
                      salawatReminder: {
                        ...settings.salawatReminder,
                        scheduleType: 'interval' as const,
                        frequency: e.target.value as ReminderFrequency,
                      },
                    };
                    handleUpdateSetting(updated, `تم ضبط تكرار الأذكار: ${frequencyOptions.find(f => f.id === e.target.value)?.label} ✓`);
                  }}
                  className="w-full py-1.5 px-2 rounded-xl bg-[#0E0B07] border border-[#C8A24A]/30 text-xs text-[#FFFDF8]"
                >
                  {frequencyOptions.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-[10px] text-[#A89E88] block mb-1">الساعة المحددة للتنبيه اليومي:</label>
                <input
                  type="time"
                  value={settings.salawatReminder?.fixedTime || settings.salawatReminder?.startTime || '10:00'}
                  onChange={(e) => {
                    const updated = {
                      ...settings,
                      salawatReminder: {
                        ...settings.salawatReminder,
                        scheduleType: 'fixed_time' as const,
                        fixedTime: e.target.value,
                        startTime: e.target.value,
                      },
                    };
                    handleUpdateSetting(updated, `تم ضبط موعد تنبيه الأذكار اليومي على ${e.target.value} ✓`);
                  }}
                  className="w-full py-1.5 px-2 rounded-xl bg-[#0E0B07] border border-[#C8A24A]/30 text-xs text-[#FFFDF8] font-mono"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] text-[#A89E88] block mb-1">نمط التنبيه الصوتي:</label>
              <select
                value={settings.salawatReminder?.mode || 'notification_and_sound'}
                onChange={(e) => {
                  const updated = {
                    ...settings,
                    salawatReminder: {
                      ...settings.salawatReminder,
                      mode: e.target.value as any,
                    },
                  };
                  handleUpdateSetting(updated, 'تم تحديث نمط الصوت ✓');
                }}
                className="w-full py-1.5 px-2 rounded-xl bg-[#0E0B07] border border-[#C8A24A]/30 text-xs text-[#FFFDF8]"
              >
                <option value="notification_and_sound">صوت تلقائي فوري عبر ExoPlayer 🔊</option>
                <option value="notification_with_play_action">إشعار مع زر تشغيل الصوت ⏯️</option>
                <option value="notification_only">إشعار مرئي صامت 🔕</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleTestRoyalAlert('dhikr_salawat')}
            className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 ${
              royalCountdowns.dhikr_salawat !== null
                ? 'bg-[#E6C66E] text-black border-[#E6C66E] shadow-md animate-pulse'
                : 'bg-[#1A140C] text-[#E6C66E] border-[#E6C66E]/40 hover:bg-[#E6C66E]/15'
            }`}
          >
            <Timer size={14} />
            <span>
              {royalCountdowns.dhikr_salawat !== null
                ? `⏳ اختبار التنبيه بعد ${royalCountdowns.dhikr_salawat} ثوانٍ (انقر للإلغاء)`
                : 'اختبار تنبيه «الصلاة على النبي ﷺ والأذكار» بعد ٥ ثوانٍ'}
            </span>
          </button>
        </div>

        {/* 3. ALERT: الورد القرآني اليومي */}
        <div className="p-4 rounded-2xl bg-[#140F09] border border-[#C8A24A]/35 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#E6C66E]/15 border border-[#E6C66E]/30 text-[#E6C66E] flex items-center justify-center">
                <Clock size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-[#FFFDF8]">التنبيه الثالث: الورد القرآني اليومي</div>
                <div className="text-[10px] text-[#A89E88]">تنبيه بصوت «وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا» وزر فتح موضع الورد مباشرة</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.dailyWirdReminder?.enabled ?? true}
              onChange={(e) => {
                const updated = {
                  ...settings,
                  dailyWirdReminder: {
                    ...settings.dailyWirdReminder,
                    enabled: e.target.checked,
                  },
                };
                handleUpdateSetting(updated, e.target.checked ? 'تم تفعيل تذكير الورد القرآني ✓' : 'تم تعطيل التنبيه');
              }}
              className="accent-[#E6C66E] w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Schedule Style Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#0B0906] border border-[#C8A24A]/20">
            <button
              onClick={() => {
                const updated = {
                  ...settings,
                  dailyWirdReminder: {
                    ...settings.dailyWirdReminder,
                    scheduleType: 'interval' as const,
                    frequency: settings.dailyWirdReminder?.frequency || '2h',
                  },
                };
                handleUpdateSetting(updated, 'تم اختيار نمط التكرار الدوري للورد القرآني');
              }}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                settings.dailyWirdReminder?.scheduleType === 'interval' || (settings.dailyWirdReminder?.scheduleType !== 'fixed_time' && settings.dailyWirdReminder?.frequency !== 'daily')
                  ? 'bg-[#E6C66E] text-black font-black shadow-sm'
                  : 'text-[#A89E88] hover:text-[#F5EFE0]'
              }`}
            >
              <Clock size={12} />
              <span>تكرار دوري (مثلاً كل ساعتين)</span>
            </button>
            <button
              onClick={() => {
                const updated = {
                  ...settings,
                  dailyWirdReminder: {
                    ...settings.dailyWirdReminder,
                    scheduleType: 'fixed_time' as const,
                    frequency: 'daily' as const,
                    fixedTime: settings.dailyWirdReminder?.fixedTime || settings.dailyWirdReminder?.startTime || '21:00',
                  },
                };
                handleUpdateSetting(updated, 'تم اختيار نمط موعد الورد الثابت (مثلاً 9 مساءً)');
              }}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                settings.dailyWirdReminder?.scheduleType === 'fixed_time' || settings.dailyWirdReminder?.frequency === 'daily'
                  ? 'bg-[#E6C66E] text-black font-black shadow-sm'
                  : 'text-[#A89E88] hover:text-[#F5EFE0]'
              }`}
            >
              <Calendar size={12} />
              <span>موعد ثابت (مثلاً ٩:٠٠ مساءً)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {settings.dailyWirdReminder?.scheduleType === 'interval' || (settings.dailyWirdReminder?.scheduleType !== 'fixed_time' && settings.dailyWirdReminder?.frequency !== 'daily') ? (
              <div>
                <label className="text-[10px] text-[#A89E88] block mb-1">فترة التكرار الدوري:</label>
                <select
                  value={settings.dailyWirdReminder?.frequency || '2h'}
                  onChange={(e) => {
                    const updated = {
                      ...settings,
                      dailyWirdReminder: {
                        ...settings.dailyWirdReminder,
                        scheduleType: 'interval' as const,
                        frequency: e.target.value as ReminderFrequency,
                      },
                    };
                    handleUpdateSetting(updated, `تم ضبط تكرار الورد: ${frequencyOptions.find(f => f.id === e.target.value)?.label} ✓`);
                  }}
                  className="w-full py-1.5 px-2 rounded-xl bg-[#0E0B07] border border-[#C8A24A]/30 text-xs text-[#FFFDF8]"
                >
                  {frequencyOptions.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-[10px] text-[#A89E88] block mb-1">الساعة المحددة للورد (مثلاً ٩:٠٠ م):</label>
                <input
                  type="time"
                  value={settings.dailyWirdReminder?.fixedTime || settings.dailyWirdReminder?.startTime || '21:00'}
                  onChange={(e) => {
                    const updated = {
                      ...settings,
                      dailyWirdReminder: {
                        ...settings.dailyWirdReminder,
                        scheduleType: 'fixed_time' as const,
                        fixedTime: e.target.value,
                        startTime: e.target.value,
                      },
                    };
                    handleUpdateSetting(updated, `تم ضبط ميعاد الورد اليومي على ${e.target.value} ✓`);
                  }}
                  className="w-full py-1.5 px-2 rounded-xl bg-[#0E0B07] border border-[#C8A24A]/30 text-xs text-[#FFFDF8] font-mono"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] text-[#A89E88] block mb-1">نمط التنبيه الصوتي:</label>
              <select
                value={settings.dailyWirdReminder?.mode || 'notification_and_sound'}
                onChange={(e) => {
                  const updated = {
                    ...settings,
                    dailyWirdReminder: {
                      ...settings.dailyWirdReminder,
                      mode: e.target.value as any,
                    },
                  };
                  handleUpdateSetting(updated, 'تم تحديث نمط الصوت ✓');
                }}
                className="w-full py-1.5 px-2 rounded-xl bg-[#0E0B07] border border-[#C8A24A]/30 text-xs text-[#FFFDF8]"
              >
                <option value="notification_and_sound">صوت تلقائي فوري عبر ExoPlayer 🔊</option>
                <option value="notification_with_play_action">إشعار مع زر تشغيل الصوت ⏯️</option>
                <option value="notification_only">إشعار مرئي صامت 🔕</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleTestRoyalAlert('daily_wird')}
            className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 ${
              royalCountdowns.daily_wird !== null
                ? 'bg-[#E6C66E] text-black border-[#E6C66E] shadow-md animate-pulse'
                : 'bg-[#1A140C] text-[#E6C66E] border-[#E6C66E]/40 hover:bg-[#E6C66E]/15'
            }`}
          >
            <Timer size={14} />
            <span>
              {royalCountdowns.daily_wird !== null
                ? `⏳ اختبار التنبيه بعد ${royalCountdowns.daily_wird} ثوانٍ (انقر للإلغاء)`
                : 'اختبار تنبيه «الورد اليومي» بعد ٥ ثوانٍ'}
            </span>
          </button>
        </div>

        {/* 4. ALERT: بر الوالدين والإحسان إليهما والدعاء */}
        <div className="p-4 rounded-2xl bg-[#140F09] border border-[#C8A24A]/35 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#E6C66E]/15 border border-[#E6C66E]/30 text-[#E6C66E] flex items-center justify-center">
                <Heart size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-[#FFFDF8]">التنبيه الرابع: بِرّ الوالدين والدعاء لهما</div>
                <div className="text-[10px] text-[#A89E88]">صوت «وَقُل رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا» وزر ميثاق البر والصلة</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.parentsReminder?.enabled ?? true}
              onChange={(e) => {
                const updated = {
                  ...settings,
                  parentsReminder: {
                    ...settings.parentsReminder,
                    enabled: e.target.checked,
                  },
                };
                handleUpdateSetting(updated, e.target.checked ? 'تم تفعيل تذكير بر الوالدين والدعاء ✓' : 'تم تعطيل التنبيه');
              }}
              className="accent-[#E6C66E] w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Schedule Style Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#0B0906] border border-[#C8A24A]/20">
            <button
              onClick={() => {
                const updated = {
                  ...settings,
                  parentsReminder: {
                    ...settings.parentsReminder,
                    scheduleType: 'interval' as const,
                    frequency: settings.parentsReminder?.frequency || '4h',
                  },
                };
                handleUpdateSetting(updated, 'تم اختيار نمط التكرار الدوري لتنبيه بر الوالدين');
              }}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                settings.parentsReminder?.scheduleType === 'interval' || (settings.parentsReminder?.scheduleType !== 'fixed_time' && settings.parentsReminder?.frequency !== 'daily')
                  ? 'bg-[#E6C66E] text-black font-black shadow-sm'
                  : 'text-[#A89E88] hover:text-[#F5EFE0]'
              }`}
            >
              <Clock size={12} />
              <span>تكرار دوري (مثلاً كل ٤ ساعات)</span>
            </button>
            <button
              onClick={() => {
                const updated = {
                  ...settings,
                  parentsReminder: {
                    ...settings.parentsReminder,
                    scheduleType: 'fixed_time' as const,
                    frequency: 'daily' as const,
                    fixedTime: settings.parentsReminder?.fixedTime || settings.parentsReminder?.startTime || '23:00',
                  },
                };
                handleUpdateSetting(updated, 'تم اختيار ميعاد الدعاء الثابت (مثلاً 11 مساءً)');
              }}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                settings.parentsReminder?.scheduleType === 'fixed_time' || settings.parentsReminder?.frequency === 'daily'
                  ? 'bg-[#E6C66E] text-black font-black shadow-sm'
                  : 'text-[#A89E88] hover:text-[#F5EFE0]'
              }`}
            >
              <Calendar size={12} />
              <span>موعد محدد (مثلاً ١١:٠٠ مساءً)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {settings.parentsReminder?.scheduleType === 'interval' || (settings.parentsReminder?.scheduleType !== 'fixed_time' && settings.parentsReminder?.frequency !== 'daily') ? (
              <div>
                <label className="text-[10px] text-[#A89E88] block mb-1">فترة التكرار الدوري:</label>
                <select
                  value={settings.parentsReminder?.frequency || '4h'}
                  onChange={(e) => {
                    const updated = {
                      ...settings,
                      parentsReminder: {
                        ...settings.parentsReminder,
                        scheduleType: 'interval' as const,
                        frequency: e.target.value as ReminderFrequency,
                      },
                    };
                    handleUpdateSetting(updated, `تم ضبط تكرار الدعاء: ${frequencyOptions.find(f => f.id === e.target.value)?.label} ✓`);
                  }}
                  className="w-full py-1.5 px-2 rounded-xl bg-[#0E0B07] border border-[#C8A24A]/30 text-xs text-[#FFFDF8]"
                >
                  {frequencyOptions.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-[10px] text-[#A89E88] block mb-1">الساعة المحددة لميعاد الدعاء (مثلاً ١١:٠٠ م):</label>
                <input
                  type="time"
                  value={settings.parentsReminder?.fixedTime || settings.parentsReminder?.startTime || '23:00'}
                  onChange={(e) => {
                    const updated = {
                      ...settings,
                      parentsReminder: {
                        ...settings.parentsReminder,
                        scheduleType: 'fixed_time' as const,
                        fixedTime: e.target.value,
                        startTime: e.target.value,
                      },
                    };
                    handleUpdateSetting(updated, `تم ضبط ميعاد دعاء الوالدين على ${e.target.value} ✓`);
                  }}
                  className="w-full py-1.5 px-2 rounded-xl bg-[#0E0B07] border border-[#C8A24A]/30 text-xs text-[#FFFDF8] font-mono"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] text-[#A89E88] block mb-1">نمط التنبيه الصوتي:</label>
              <select
                value={settings.parentsReminder?.mode || 'notification_and_sound'}
                onChange={(e) => {
                  const updated = {
                    ...settings,
                    parentsReminder: {
                      ...settings.parentsReminder,
                      mode: e.target.value as any,
                    },
                  };
                  handleUpdateSetting(updated, 'تم تحديث نمط الصوت ✓');
                }}
                className="w-full py-1.5 px-2 rounded-xl bg-[#0E0B07] border border-[#C8A24A]/30 text-xs text-[#FFFDF8]"
              >
                <option value="notification_and_sound">صوت تلقائي فوري عبر ExoPlayer 🔊</option>
                <option value="notification_with_play_action">إشعار مع زر تشغيل الصوت ⏯️</option>
                <option value="notification_only">إشعار مرئي صامت 🔕</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleTestRoyalAlert('parents_birr')}
            className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 ${
              royalCountdowns.parents_birr !== null
                ? 'bg-[#E6C66E] text-black border-[#E6C66E] shadow-md animate-pulse'
                : 'bg-[#1A140C] text-[#E6C66E] border-[#E6C66E]/40 hover:bg-[#E6C66E]/15'
            }`}
          >
            <Timer size={14} />
            <span>
              {royalCountdowns.parents_birr !== null
                ? `⏳ اختبار التنبيه بعد ${royalCountdowns.parents_birr} ثوانٍ (انقر للإلغاء)`
                : 'اختبار تنبيه «بر الوالدين والدعاء» بعد ٥ ثوانٍ'}
            </span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: 5 OBLIGATORY PRAYERS & INTERACTIVE ATHAN TEST */}
      {/* ======================================================== */}
      <div className="relative overflow-hidden p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-[#211A0E] via-[#141009] to-[#0A0805] border-2 border-[#E6C66E]/60 shadow-[0_12px_36px_rgba(0,0,0,0.9)] space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-[#C8A24A]/25">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#E6C66E]">
            <Sparkles size={15} />
            <span>معاينة وتجربة شاشة الأذان الملكية:</span>
          </div>

          {/* Prayer Picker for Testing */}
          <div className="flex items-center gap-1 bg-[#0D0B08] p-1 rounded-xl border border-[#C8A24A]/30 text-[11px] font-bold">
            <button
              onClick={() => setSelectedPrayer('fajr')}
              className={`px-2 py-0.5 rounded-lg transition-all ${
                selectedPrayer === 'fajr' ? 'bg-[#E6C66E] text-black font-black' : 'text-[#A89E88]'
              }`}
            >
              الفجر
            </button>
            <button
              onClick={() => setSelectedPrayer('maghrib')}
              className={`px-2 py-0.5 rounded-lg transition-all ${
                selectedPrayer === 'maghrib' ? 'bg-[#E6C66E] text-black font-black' : 'text-[#A89E88]'
              }`}
            >
              المغرب
            </button>
          </div>
        </div>

        {/* 5-Second Countdown Banner */}
        {countdown5s !== null && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#3D2C0C] via-[#2D2109] to-[#1F1706] border-2 border-[#E6C66E] text-center shadow-[0_0_25px_rgba(230,198,110,0.5)] animate-pulse">
            <div className="text-3xl font-black text-[#FFFDF8] font-mono">
              {countdown5s} ثوانٍ
            </div>
            <p className="text-xs font-bold text-[#F3E5AB] mt-1">
              اقفل شاشة الهاتف أو اخرج من التطبيق الآن لاختبار التنبيه الإجباري عالي الأولوية!
            </p>
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={handleTrigger5SecondsAdhan}
            disabled={countdown5s !== null}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-l from-[#E6C66E] via-[#C8A24A] to-[#A6802B] text-black font-black text-xs flex items-center justify-center gap-2 border border-[#FFF2C2] hover:brightness-105 active:scale-98 shadow-md cursor-pointer disabled:opacity-60"
          >
            <Timer size={16} className="text-black" />
            <span>
              {countdown5s !== null ? `جارٍ العد: ${countdown5s} ثوانٍ (اقفل الشاشة أو اخرج الآن)...` : 'إرسال تنبيه تجريبي بعد ٥ ثوانٍ (لقفل الشاشة والخروج)'}
            </span>
          </button>
        </div>

        <p className="text-[11px] text-[#A89E88] text-center leading-relaxed">
          💡 يتيح زر الـ ٥ ثوانٍ قفل شاشة الهاتف أو الخروج لأي تطبيق آخر لاختبار ظهور التنبيه كـ Overlay إجباري.
        </p>
      </div>

      {/* 5 Prayers Alert Settings */}
      <div className="p-4 rounded-2xl bg-[#0E0C08] border border-[#C8A24A]/30 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#C8A24A]/20">
          <div>
            <h3 className="text-xs font-extrabold text-[#F5EFE0]">
              تنبيهات الصلوات الخمس الحالية
            </h3>
            <p className="text-[10px] text-[#A89E88]">
              التحكم الكامل في تشغيل أو كتم أذان كل صلاة
            </p>
          </div>

          <button
            onClick={handleResetAllAlerts}
            className="px-2.5 py-1 rounded-xl bg-[#17130C] border border-[#C8A24A]/40 text-[#E6C66E] hover:text-[#FFF2C2] text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw size={12} />
            <span>حذف التخصيصات وإعادة الضبط</span>
          </button>
        </div>

        <div className="space-y-2">
          {prayersList.map((prayer) => {
            const isEnabled = prayersConfig[prayer.id]?.enabled ?? true;
            return (
              <div
                key={prayer.id}
                className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  isEnabled
                    ? 'bg-gradient-to-r from-[#1A150D] to-[#100D09] border-[#C8A24A]/40'
                    : 'bg-[#0B0907] border-[#C8A24A]/15 opacity-65'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                      isEnabled
                        ? 'bg-[#E6C66E] text-black shadow-sm'
                        : 'bg-[#18140D] text-[#8C8370] border border-[#C8A24A]/25'
                    }`}
                  >
                    {isEnabled ? <Bell size={15} /> : <VolumeX size={15} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#F5EFE0]">{prayer.name}</span>
                      <span
                        className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold ${
                          isEnabled
                            ? 'bg-[#E6C66E]/20 text-[#E6C66E] border border-[#E6C66E]/30'
                            : 'bg-[#1C160B] text-[#8C8370]'
                        }`}
                      >
                        {isEnabled ? 'أذان كامل مفعل' : 'تنبيه مكتوم'}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#A89E88] block mt-0.5">
                      {prayer.desc}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleTogglePrayer(prayer.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    isEnabled
                      ? 'bg-[#2A2111] border border-[#E6C66E]/60 text-[#E6C66E] hover:bg-[#342914]'
                      : 'bg-[#141009] border border-[#C8A24A]/30 text-[#A89E88] hover:text-[#F5EFE0]'
                  }`}
                >
                  {isEnabled ? 'مفعل ✓' : 'تعطيل'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Smart Flip-to-Mute Feature Box */}
      <div className="p-3.5 rounded-2xl bg-[#0E0C08] border border-[#C8A24A]/30 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#261E10] border border-[#E6C66E]/50 flex items-center justify-center text-[#E6C66E]">
              <Smartphone size={18} />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-[#F5EFE0]">
                خاصية الميوت الذكية (قلب شاشة الهاتف)
              </h4>
              <p className="text-[10px] text-[#A89E88]">
                اقلب الموبايل على وجهه لكتم الصوت فوراً مع استمرار عرض الكلمات
              </p>
            </div>
          </div>

          <input
            type="checkbox"
            checked={prayersConfig.smartFlipToMute ?? true}
            onChange={(e) => {
              const updated = {
                ...prayersConfig,
                smartFlipToMute: e.target.checked,
              };
              StorageService.savePrayersAdhanConfig(updated);
              setPrayersConfig(updated);
              showToast(e.target.checked ? 'تم تفعيل كتم الصوت بقلب الهاتف ✓' : 'تم تعطيل الخاصية');
            }}
            className="accent-[#E6C66E] w-4 h-4 cursor-pointer"
          />
        </div>

        <p className="text-[11px] text-[#C4B998] leading-relaxed">
          ✨ عند تشغيل الصوت مجدداً، يستمر الأذان والتنبيهات عبر مشغل ExoPlayer الموحد من الموضع اللحظي نفسه مباشرة بالمللي ثانية دون إعادة البدء من الصفر.
        </p>
      </div>

      {/* Android Permissions Hub */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#17130B] to-[#0E0C08] border border-[#C8A24A]/35 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[#C8A24A]/20">
          <ShieldCheck size={16} className="text-[#E6C66E]" />
          <h4 className="text-xs font-extrabold text-[#F5EFE0]">
            أذونات أندرويد لعمل التنبيهات فوق التطبيقات وشاشة القفل
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => {
              NativePermissions.openOverlaySettings().catch(() => {});
              showToast('تم فتح إعدادات الظهور فوق التطبيقات وشاشة القفل');
            }}
            className="p-2.5 rounded-xl bg-[#120F0A] border border-[#C8A24A]/30 hover:border-[#E6C66E] flex items-center justify-between text-right text-xs font-bold text-[#F5EFE0] transition-all cursor-pointer"
          >
            <div>
              <div className="text-[11px] text-[#E6C66E]">الظهور فوق التطبيقات (Overlay)</div>
              <div className="text-[9.5px] text-[#A89E88]">Draw over other apps (WhatsApp / Chrome)</div>
            </div>
            <ExternalLink size={13} className="text-[#E6C66E]" />
          </button>

          <button
            onClick={() => {
              NativePermissions.openExactAlarmSettings().catch(() => {});
              showToast('تم فتح إعدادات المنبهات الدقيقة (Exact Alarms)');
            }}
            className="p-2.5 rounded-xl bg-[#120F0A] border border-[#C8A24A]/30 hover:border-[#E6C66E] flex items-center justify-between text-right text-xs font-bold text-[#F5EFE0] transition-all cursor-pointer"
          >
            <div>
              <div className="text-[11px] text-[#E6C66E]">المنبهات الدقيقة (Exact Alarms)</div>
              <div className="text-[9.5px] text-[#A89E88]">Schedule Exact Alarms (Doze Mode)</div>
            </div>
            <ExternalLink size={13} className="text-[#E6C66E]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemindersView;
