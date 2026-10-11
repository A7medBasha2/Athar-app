import React, { useState, useEffect } from 'react';
import {
  AlarmService,
  IslamicAlarmItem,
  AlarmSoundId,
  AlarmDismissMethod,
  ISLAMIC_ALARM_SOUNDS,
} from '../services/alarmService';
import {
  AlarmClock,
  Plus,
  Trash2,
  Volume2,
  Square,
  Moon,
  Sparkles,
  Check,
  X,
  Clock,
  BellRing,
  ShieldCheck,
} from 'lucide-react';

interface IslamicAlarmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ARABIC_DAYS = [
  { id: 0, short: 'أحد', full: 'الأحد' },
  { id: 1, short: 'إثنين', full: 'الإثنين' },
  { id: 2, short: 'ثلاثاء', full: 'الثلاثاء' },
  { id: 3, short: 'أربعاء', full: 'الأربعاء' },
  { id: 4, short: 'خميس', full: 'الخميس' },
  { id: 5, short: 'جمعة', full: 'الجمعة' },
  { id: 6, short: 'سبت', full: 'السبت' },
];

export const IslamicAlarmModal: React.FC<IslamicAlarmModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [alarms, setAlarms] = useState<IslamicAlarmItem[]>([]);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [previewingSoundId, setPreviewingSoundId] = useState<AlarmSoundId | null>(null);
  const [fajrTime24, setFajrTime24] = useState<string>('04:45');

  // New alarm form state
  const [newTitle, setNewTitle] = useState<string>('منبه الفجر والاستيقاظ');
  const [newTime, setNewTime] = useState<string>('05:00');
  const [newIsFajrLinked, setNewIsFajrLinked] = useState<boolean>(false);
  const [newFajrOffset, setNewFajrOffset] = useState<number>(0);
  const [newDays, setNewDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [newSoundId, setNewSoundId] = useState<AlarmSoundId>('salat_khayr_min_nawm');
  const [newDismissMethod, setNewDismissMethod] = useState<AlarmDismissMethod>('dhikr_tap');

  const refreshData = () => {
    setAlarms(AlarmService.getAlarms());
    setFajrTime24(AlarmService.getCurrentFajrTime24());
    const sys = AlarmService.getSystemSettings();
    setNewSoundId(sys.defaultSoundId);
    setNewDismissMethod(sys.defaultDismissMethod);
  };

  useEffect(() => {
    if (!isOpen) {
      AlarmService.stopPreviewSound();
      setPreviewingSoundId(null);
      return;
    }
    refreshData();
    const unsub = AlarmService.subscribeAlarmsChange(() => {
      setAlarms(AlarmService.getAlarms());
    });
    return () => {
      unsub();
      AlarmService.stopPreviewSound();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const upcomingInfo = AlarmService.getNextUpcomingAlarmInfo();

  const handleToggleAlarm = (alarm: IslamicAlarmItem) => {
    AlarmService.updateAlarm(alarm.id, { enabled: !alarm.enabled });
  };

  const handleDeleteAlarm = (id: string) => {
    AlarmService.deleteAlarm(id);
  };

  const handlePreviewSound = (soundId: AlarmSoundId) => {
    if (previewingSoundId === soundId) {
      AlarmService.stopPreviewSound();
      setPreviewingSoundId(null);
    } else {
      setPreviewingSoundId(soundId);
      AlarmService.previewSoundOption(soundId, () => {
        setPreviewingSoundId(null);
      });
    }
  };

  const handleCreateAlarm = () => {
    const computedTime = newIsFajrLinked
      ? AlarmService.calculateTimeWithOffset(fajrTime24, newFajrOffset)
      : newTime;

    AlarmService.addAlarm({
      title: newTitle.trim() || 'منبه إسلامي',
      time: computedTime,
      enabled: true,
      isFajrLinked: newIsFajrLinked,
      fajrOffsetMinutes: newIsFajrLinked ? newFajrOffset : 0,
      daysOfWeek: newDays.length > 0 ? newDays : [0, 1, 2, 3, 4, 5, 6],
      soundId: newSoundId,
      dismissMethod: newDismissMethod,
    });

    setIsCreating(false);
    AlarmService.stopPreviewSound();
    setPreviewingSoundId(null);
  };

  const toggleDayInForm = (dayId: number) => {
    if (newDays.includes(dayId)) {
      if (newDays.length > 1) {
        setNewDays(newDays.filter((d) => d !== dayId));
      }
    } else {
      setNewDays([...newDays, dayId].sort());
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn font-arabic text-right">
      <div className="w-full max-w-md max-h-[90dvh] bg-[#0B0A08] border border-[#C8A24A]/55 rounded-3xl flex flex-col overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.95)]">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#C8A24A]/25 flex items-center justify-between bg-gradient-to-l from-[#18140C] to-[#0D0C09] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#241E11] border border-[#E6C66E]/55 flex items-center justify-center text-[#E6C66E]">
              <AlarmClock size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                المنبه الإسلامي ومنبه الفجر
              </h2>
              <p className="text-[11px] text-[#C4B998]">
                استيقظ على نداء «الصلاة خير من النوم» وآيات القيام
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[#171510] border border-[#C8A24A]/35 flex items-center justify-center text-[#C4B998] hover:text-white"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Next Upcoming Alarm Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#211B0F] via-[#14110A] to-[#0D0B07] border border-[#E6C66E]/50 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#E6C66E]">
                <Clock size={14} />
                <span>المنبه القادم</span>
              </span>
              <span className="text-[11px] font-bold text-[#C4B998]">
                فجر اليوم: {AlarmService.formatTime12Arabic(fajrTime24)}
              </span>
            </div>

            {upcomingInfo ? (
              <div className="flex items-center justify-between gap-2 pt-1">
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    {upcomingInfo.alarm.title}
                  </h3>
                  <p className="text-xs text-[#E6C66E] font-bold mt-0.5">
                    يرن بعد {upcomingInfo.remainingHours > 0 ? `${upcomingInfo.remainingHours} ساعة و ` : ''}
                    {upcomingInfo.remainingMinutes} دقيقة
                  </p>
                </div>
                <div className="text-2xl font-extrabold text-[#F3E5AB] tabular-nums bg-[#0A0907] px-3.5 py-1.5 rounded-xl border border-[#C8A24A]/40">
                  {upcomingInfo.formattedTime12}
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#C4B998]">
                لا يوجد منبه مفعّل حالياً — فعّل منبه الفجر أو أضف منبهاً جديداً بالأسفل.
              </p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  onClose();
                  AlarmService.triggerQuickTestAlarm(isCreating ? newSoundId : upcomingInfo?.alarm.soundId);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-[#262011] hover:bg-[#332A16] border border-[#E6C66E]/50 text-[#F3E5AB] text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors"
              >
                <BellRing size={14} className="text-[#E6C66E]" />
                <span>تجربة رنين المنبه الآن</span>
              </button>

              <button
                onClick={() => setIsCreating(!isCreating)}
                className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-[#070707] text-xs font-extrabold flex items-center gap-1 shadow"
              >
                <Plus size={15} />
                <span>{isCreating ? 'إلغاء' : 'منبه جديد'}</span>
              </button>
            </div>
          </div>

          {/* Add New Alarm Form */}
          {isCreating && (
            <div className="p-4 rounded-2xl bg-[#12100B] border border-[#E6C66E]/60 space-y-3.5 animate-fadeIn">
              <h3 className="text-xs font-extrabold text-[#E6C66E] flex items-center gap-1.5">
                <Sparkles size={14} />
                <span>إعداد منبه إسلامي جديد</span>
              </h3>

              {/* Alarm Title */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#C4B998] block">
                  عنوان المنبه
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: صلاة الفجر، قيام الليل، العمل..."
                  className="w-full px-3 py-2 rounded-xl bg-[#090806] border border-[#C8A24A]/35 text-xs font-bold text-white focus:outline-none focus:border-[#E6C66E]"
                />
              </div>

              {/* Mode: Free Time vs Fajr-Linked */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewIsFajrLinked(false)}
                  className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition-all ${
                    !newIsFajrLinked
                      ? 'bg-[#C8A24A] text-[#070707] border-[#F3E5AB]'
                      : 'bg-[#090806] text-[#C4B998] border-[#C8A24A]/25'
                  }`}
                >
                  وقت حر يحدده المستخدم
                </button>
                <button
                  type="button"
                  onClick={() => setNewIsFajrLinked(true)}
                  className={`py-2 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1 transition-all ${
                    newIsFajrLinked
                      ? 'bg-[#C8A24A] text-[#070707] border-[#F3E5AB]'
                      : 'bg-[#090806] text-[#C4B998] border-[#C8A24A]/25'
                  }`}
                >
                  <Moon size={13} />
                  <span>مرتبط بصلاة الفجر</span>
                </button>
              </div>

              {/* Time Input or Fajr Offset Selector */}
              {!newIsFajrLinked ? (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#C4B998] block">
                    حدد وقت المنبه
                  </label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#090806] border border-[#C8A24A]/45 text-lg font-extrabold text-[#F3E5AB] text-center tabular-nums focus:outline-none focus:border-[#E6C66E]"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#C4B998] block">
                    اختر التوقيت بالنسبة لأذان الفجر ({AlarmService.formatTime12Arabic(fajrTime24)})
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { offset: 0, label: 'مع أذان الفجر مباشرة' },
                      { offset: -15, label: 'قبل الفجر بـ 15 دقيقة' },
                      { offset: -30, label: 'قبل الفجر بـ 30 دقيقة (القيام)' },
                      { offset: -45, label: 'قبل الفجر بـ 45 دقيقة (السحور)' },
                    ].map((opt) => (
                      <button
                        key={opt.offset}
                        type="button"
                        onClick={() => setNewFajrOffset(opt.offset)}
                        className={`p-2 rounded-xl border text-[11px] font-extrabold text-right transition-all ${
                          newFajrOffset === opt.offset
                            ? 'bg-[#262011] border-[#E6C66E] text-[#F3E5AB]'
                            : 'bg-[#090806] border-[#C8A24A]/25 text-[#C4B998]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Weekly Days Selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#C4B998] block">
                  أيام التكرار الأسبوعية
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {ARABIC_DAYS.map((d) => {
                    const active = newDays.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleDayInForm(d.id)}
                        className={`py-1.5 rounded-lg text-[10px] font-extrabold border transition-all ${
                          active
                            ? 'bg-[#C8A24A] text-[#070707] border-[#F3E5AB]'
                            : 'bg-[#090806] text-[#9E9478] border-[#C8A24A]/20'
                        }`}
                      >
                        {d.short}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sound Selection with Preview */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#C4B998] block">
                  اختر صوت المنبه الإسلامي المتكرر
                </label>
                <div className="space-y-1.5">
                  {ISLAMIC_ALARM_SOUNDS.map((snd) => {
                    const selected = newSoundId === snd.id;
                    const isPrev = previewingSoundId === snd.id;
                    return (
                      <div
                        key={snd.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                          selected
                            ? 'bg-[#221C10] border-[#E6C66E] text-white'
                            : 'bg-[#090806] border-[#C8A24A]/25 text-[#C4B998]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setNewSoundId(snd.id)}
                          className="flex-1 text-right"
                        >
                          <div className="text-xs font-extrabold text-[#F3E5AB]">
                            {snd.title}
                          </div>
                          <div className="text-[10px] text-[#C4B998] mt-0.5">
                            {snd.subtitle}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePreviewSound(snd.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold flex items-center gap-1 shrink-0 border ${
                            isPrev
                              ? 'bg-[#E6C66E] text-[#070707] border-[#F3E5AB]'
                              : 'bg-[#17140D] text-[#E6C66E] border-[#C8A24A]/40'
                          }`}
                        >
                          {isPrev ? <Square size={11} fill="currentColor" /> : <Volume2 size={12} />}
                          <span>{isPrev ? 'إيقاف' : 'استماع'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dismiss Method Selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#C4B998] flex items-center gap-1">
                  <ShieldCheck size={13} className="text-[#E6C66E]" />
                  <span>طريقة إيقاف المنبه عند الاستيقاظ</span>
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    {
                      id: 'direct' as AlarmDismissMethod,
                      label: '١. زر إيقاف مباشر مع زر غفوة',
                    },
                    {
                      id: 'dhikr_tap' as AlarmDismissMethod,
                      label: '٢. ترديد ذكر الاستيقاظ 3 مرات للتأكد من اليقظة',
                    },
                    {
                      id: 'faith_question' as AlarmDismissMethod,
                      label: '٣. إكمال آية قصيرة أو سؤال إيماني لتنشيط الذهن',
                    },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setNewDismissMethod(m.id)}
                      className={`p-2.5 rounded-xl border text-xs font-extrabold text-right flex items-center justify-between ${
                        newDismissMethod === m.id
                          ? 'bg-[#221C10] border-[#E6C66E] text-[#F3E5AB]'
                          : 'bg-[#090806] border-[#C8A24A]/25 text-[#C4B998]'
                      }`}
                    >
                      <span>{m.label}</span>
                      {newDismissMethod === m.id && <Check size={14} className="text-[#E6C66E]" />}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCreateAlarm}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-[#070707] font-extrabold text-xs shadow-lg flex items-center justify-center gap-1.5"
              >
                <Check size={15} />
                <span>حفظ وتفعيل المنبه</span>
              </button>
            </div>
          )}

          {/* Saved Alarms List */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-extrabold text-[#C4B998] px-1">
              قائمة المنبهات المضبوطة ({alarms.length})
            </h3>

            {alarms.map((alarm) => {
              const sound = AlarmService.getSoundById(alarm.soundId);
              const dismissLabel =
                alarm.dismissMethod === 'dhikr_tap'
                  ? 'إيقاف بذكر الاستيقاظ (3x)'
                  : alarm.dismissMethod === 'faith_question'
                  ? 'إيقاف بإكمال آية'
                  : 'إيقاف مباشر';

              return (
                <div
                  key={alarm.id}
                  className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                    alarm.enabled
                      ? 'bg-[#13110C] border-[#C8A24A]/50 shadow-md'
                      : 'bg-[#0C0B08] border-[#C8A24A]/20 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-extrabold text-white">
                          {alarm.title}
                        </span>
                        {alarm.isFajrLinked && (
                          <span className="px-2 py-0.5 rounded-full bg-[#C8A24A]/15 border border-[#C8A24A]/40 text-[10px] font-extrabold text-[#E6C66E]">
                            {alarm.fajrOffsetMinutes === 0
                              ? 'مع أذان الفجر تلقائياً'
                              : `قبل الفجر بـ ${Math.abs(alarm.fajrOffsetMinutes)} د`}
                          </span>
                        )}
                      </div>
                      <div className="pt-1">
                        <select
                          value={alarm.soundId}
                          onChange={(e) =>
                            AlarmService.updateAlarm(alarm.id, {
                              soundId: e.target.value as AlarmSoundId,
                            })
                          }
                          className="w-full max-w-[260px] px-2.5 py-1.5 rounded-xl bg-[#090806] border border-[#C8A24A]/35 text-[11px] font-extrabold text-[#F3E5AB] focus:outline-none focus:border-[#E6C66E]"
                        >
                          {ISLAMIC_ALARM_SOUNDS.map((s) => (
                            <option key={s.id} value={s.id} className="bg-[#0B0A08] text-[#F3E5AB]">
                              {s.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="text-xl font-extrabold text-[#F3E5AB] tabular-nums">
                        {AlarmService.formatTime12Arabic(alarm.time)}
                      </span>

                      <button
                        onClick={() => handleToggleAlarm(alarm)}
                        className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border ${
                          alarm.enabled
                            ? 'bg-[#C8A24A] border-[#F3E5AB]'
                            : 'bg-[#1B1812] border-[#C8A24A]/35'
                        }`}
                        aria-label="تفعيل أو إيقاف المنبه"
                      >
                        <div
                          className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                            alarm.enabled ? '-translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#C8A24A]/15 text-[10px] text-[#C4B998]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[#E6C66E] font-bold">{dismissLabel}</span>
                      <span>•</span>
                      <span>
                        {alarm.daysOfWeek.length === 7
                          ? 'يومياً'
                          : `${alarm.daysOfWeek.length} أيام بالأسبوع`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          onClose();
                          AlarmService.triggerAlarmRinging(alarm, true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#1C1810] hover:bg-[#282216] text-[#E6C66E] border border-[#C8A24A]/35 font-bold"
                      >
                        معاينة الرنين
                      </button>
                      {alarm.id !== 'fajr_smart_alarm' && (
                        <button
                          onClick={() => handleDeleteAlarm(alarm.id)}
                          className="p-1.5 rounded-lg bg-[#1A1212] hover:bg-red-950 text-red-300 border border-red-500/30"
                          title="حذف المنبه"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
