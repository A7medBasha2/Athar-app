import React, { useState, useEffect } from 'react';
import { AppSettings, ReminderFrequency, ReminderPlaybackMode } from '../types';
import { StorageService } from '../services/storageService';
import { ReminderEngine } from '../services/reminderService';
import { VERIFIED_RECITERS } from '../data/surahsData';
import { VERIFIED_DHIKR_REMINDERS } from '../data/dhikrRemindersData';
import { RotatingCardBackground } from '../components/RotatingCardBackground';
import { Bell, Moon, BookOpen, Clock, Volume2, Check, Play, Heart, X, Award, CheckCircle2, Sparkles, ShieldCheck } from 'lucide-react';

interface RemindersViewProps {
  onClose?: () => void;
}

export const RemindersView: React.FC<RemindersViewProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());
  const [showDhikrLibrary, setShowDhikrLibrary] = useState<boolean>(true);

  useEffect(() => {
    setSettings(StorageService.getSettings());
  }, []);

  const updateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
    ReminderEngine.restart();
  };

  const frequencies: { id: ReminderFrequency; label: string }[] = [
    { id: '1m', label: 'كل دقيقة (تجريبي)' },
    { id: '30m', label: 'كل 30 دقيقة' },
    { id: '1h', label: 'كل ساعة' },
    { id: '2h', label: 'كل ساعتين' },
    { id: '3h', label: 'كل 3 ساعات' },
    { id: '4h', label: 'كل 4 ساعات' },
    { id: '6h', label: 'كل 6 ساعات' },
    { id: 'daily', label: 'مرة يومياً' },
  ];

  const modes: { id: ReminderPlaybackMode; label: string }[] = [
    { id: 'notification_only', label: 'إشعار فقط' },
    { id: 'notification_and_sound', label: 'إشعار + صوت تلقائي' },
    { id: 'notification_with_play_action', label: 'إشعار + زر تشغيل' },
  ];

  const currentReciter = VERIFIED_RECITERS.find(r => r.id === settings.selectedReciterId) || VERIFIED_RECITERS[0];

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-24 space-y-4 max-w-lg mx-auto w-full select-none">
      {/* Header with Exit / Close button */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Bell size={20} className="text-[#D4AF37]" />
            مركز التذكيرات المتقدم
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5">
            تحكم شامل في الأذان، بر الوالدين، الأذكار، الآية والحديث اليومي، والورد القرآني
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-bold transition-all active:scale-95 shadow"
            title="خروج من مركز التذكيرات"
          >
            <X size={15} />
            <span>خروج</span>
          </button>
        )}
      </div>

      {/* 1. Quran Verse Reminder Card */}
      <div className="relative overflow-hidden bg-[#121820] border border-slate-800 rounded-3xl p-5 space-y-4 shadow-lg">
        <RotatingCardBackground slot="quran" cardOffset={0} intervalMs={25000} opacity={0.28} />
        <div className="relative z-10 flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#D4AF37]/15 rounded-xl text-[#D4AF37]">
              <BookOpen size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">آية من القرآن الكريم</h3>
              <p className="text-[11px] text-slate-400">
                تذكير دوري بآيات مباركة مع تلاوة صوتية متطابقة
              </p>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={() => {
              const updated = { ...settings };
              updated.quranVerseReminder.enabled = !updated.quranVerseReminder.enabled;
              updateSettings(updated);
            }}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
              settings.quranVerseReminder.enabled ? 'bg-[#D4AF37]' : 'bg-slate-700'
            }`}
            aria-label="تفعيل تذكير آية من القرآن الكريم"
          >
            <div
              className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                settings.quranVerseReminder.enabled ? '-translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {settings.quranVerseReminder.enabled && (
          <div className="relative z-10 space-y-3.5 text-xs text-right">
            {/* Same Reciter Notice */}
            <div className="p-2.5 bg-amber-950/30 border border-[#D4AF37]/20 rounded-xl text-[11px] text-[#D4AF37]">
              <span>القارئ المعتمد للتذكير الصوتي: </span>
              <strong>{currentReciter.nameArabic}</strong> (مستمد تلقائيًا من إعدادات القرآن)
            </div>

            {/* 1m test badge notice */}
            {settings.quranVerseReminder.frequency === '1m' && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300">
                ⚡ <strong>وضع التجربة السريع (كل دقيقة) نشط:</strong> سيعمل التنبيه خلال ثوانٍ ويتكرر كل دقيقة متجاوزاً ساعات الهدوء لتتمكن من تجربته فوراً.
              </div>
            )}

            {/* Frequency Selector */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">تكرار التذكير</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {frequencies.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      const updated = { ...settings };
                      updated.quranVerseReminder.frequency = f.id;
                      updateSettings(updated);
                    }}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      settings.quranVerseReminder.frequency === f.id
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] font-bold'
                        : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Window (Start / End) */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">نافذة وقت الإرسال</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-800/40 border border-slate-800 rounded-xl flex items-center justify-between">
                  <span className="text-slate-400">من:</span>
                  <input
                    type="time"
                    value={settings.quranVerseReminder.startTime}
                    onChange={(e) => {
                      const updated = { ...settings };
                      updated.quranVerseReminder.startTime = e.target.value;
                      updateSettings(updated);
                    }}
                    className="bg-transparent text-slate-100 font-mono focus:outline-none"
                  />
                </div>
                <div className="p-2.5 bg-slate-800/40 border border-slate-800 rounded-xl flex items-center justify-between">
                  <span className="text-slate-400">إلى:</span>
                  <input
                    type="time"
                    value={settings.quranVerseReminder.endTime}
                    onChange={(e) => {
                      const updated = { ...settings };
                      updated.quranVerseReminder.endTime = e.target.value;
                      updateSettings(updated);
                    }}
                    className="bg-transparent text-slate-100 font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Playback Modes */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">سلوك التنبيه</label>
              <div className="grid grid-cols-3 gap-1.5">
                {modes.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      const updated = { ...settings };
                      updated.quranVerseReminder.mode = m.id;
                      updateSettings(updated);
                    }}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      settings.quranVerseReminder.mode === m.id
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] font-bold'
                        : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Test Button */}
            <div className="pt-1 flex justify-end">
              <button
                onClick={() => ReminderEngine.testQuranVerseReminder()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-[#D4AF37] border border-[#D4AF37]/30 rounded-xl text-xs font-semibold transition-colors active:scale-95 shadow"
              >
                <Play size={12} fill="currentColor" />
                <span>اختبار تذكير الآية الآن (مع الإشعار والصوت)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Dhikr Allah & Multiplying Praise Reminders Card (تنبيهات ذكر الله والصلاة على النبي ﷺ والتسبيح المضاعف بصوت نقي ومحترف) */}
      <div className="relative overflow-hidden bg-[#121820] border border-[#D4AF37]/30 rounded-3xl p-5 space-y-4 shadow-lg">
        <RotatingCardBackground slot="adhkar" cardOffset={2} intervalMs={26000} opacity={0.28} />
        <div className="relative z-10 flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/15 rounded-xl text-[#D4AF37]">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm font-bold text-slate-100">تنبيهات ذكر الله والتسبيح المضاعف</h3>
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-0.5">
                  <ShieldCheck size={10} />
                  <span>صوت استوديو نقي 100%</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                تسبيح وصلوات على النبي ﷺ وحمدٌ يملأ ما بين السماوات والأرض وعدد خلقه بصوت نقي ومحترف
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const updated = { ...settings };
              const cur = updated.dhikrReminder || {
                enabled: true,
                frequency: '1h',
                startTime: '08:00',
                endTime: '23:00',
                mode: 'notification_and_sound',
                selectionMode: 'rotate',
                selectedDhikrIds: [],
                currentIndex: 0
              };
              updated.dhikrReminder = { ...cur, enabled: !cur.enabled };
              updateSettings(updated);
            }}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
              settings.dhikrReminder?.enabled ? 'bg-[#D4AF37]' : 'bg-slate-700'
            }`}
            aria-label="تفعيل تنبيهات ذكر الله"
          >
            <div
              className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                settings.dhikrReminder?.enabled ? '-translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {settings.dhikrReminder?.enabled && (
          <div className="relative z-10 space-y-3.5 text-xs text-right">
            {/* Pure studio audio guarantee notice */}
            <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-[11px] text-emerald-300 flex items-center justify-between gap-2">
              <span>
                🎙️ <strong>ضمان نقاء الصوت:</strong> جميع الأذكار والصلوات في هذه المجموعة مسجّلة بصوت استوديو احترافي نقي (الشيخ مشاري العفاسي وحِصن المسلم)، ولا يُنشأ أي تنبيه بدون ملف صوتي نقي وموثق.
              </span>
            </div>

            {/* 1m test badge notice */}
            {settings.dhikrReminder?.frequency === '1m' && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300">
                ⚡ <strong>وضع التجربة السريع (كل دقيقة) نشط:</strong> سيعمل تنبيه ذكر الله الصوتي خلال ثوانٍ ويتكرر كل دقيقة بالتناوب بين الأذكار المختارة.
              </div>
            )}

            {/* Frequency Selector */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">تكرار تنبيهات الذكر</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {frequencies.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      const updated = { ...settings };
                      updated.dhikrReminder = {
                        ...updated.dhikrReminder,
                        frequency: f.id
                      };
                      updateSettings(updated);
                    }}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      settings.dhikrReminder?.frequency === f.id
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] font-bold'
                        : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Window */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">نافذة وقت الإرسال</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-800/40 border border-slate-800 rounded-xl flex items-center justify-between">
                  <span className="text-slate-400">من:</span>
                  <input
                    type="time"
                    value={settings.dhikrReminder?.startTime || '08:00'}
                    onChange={(e) => {
                      const updated = { ...settings };
                      updated.dhikrReminder = {
                        ...updated.dhikrReminder,
                        startTime: e.target.value
                      };
                      updateSettings(updated);
                    }}
                    className="bg-transparent text-slate-100 font-mono focus:outline-none"
                  />
                </div>
                <div className="p-2.5 bg-slate-800/40 border border-slate-800 rounded-xl flex items-center justify-between">
                  <span className="text-slate-400">إلى:</span>
                  <input
                    type="time"
                    value={settings.dhikrReminder?.endTime || '23:00'}
                    onChange={(e) => {
                      const updated = { ...settings };
                      updated.dhikrReminder = {
                        ...updated.dhikrReminder,
                        endTime: e.target.value
                      };
                      updateSettings(updated);
                    }}
                    className="bg-transparent text-slate-100 font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Playback Modes */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">سلوك التنبيه</label>
              <div className="grid grid-cols-3 gap-1.5">
                {modes.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      const updated = { ...settings };
                      updated.dhikrReminder = {
                        ...updated.dhikrReminder,
                        mode: m.id
                      };
                      updateSettings(updated);
                    }}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      (settings.dhikrReminder?.mode || 'notification_and_sound') === m.id
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] font-bold'
                        : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Verified Pure Audio Dhikr Collection Selector */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-200 font-bold block text-xs">
                    مكتبة تنبيهات الأذكار الصوتية النقية ({VERIFIED_DHIKR_REMINDERS.length} ذكر موثق)
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {(!settings.dhikrReminder?.selectedDhikrIds || settings.dhikrReminder.selectedDhikrIds.length === 0)
                      ? 'التبديل التلقائي بين جميع الأذكار النقية مفعل (أو اختر أذكاراً محددة)'
                      : `تم تحديد (${settings.dhikrReminder.selectedDhikrIds.length}) من الأذكار للتناوب بينها`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {settings.dhikrReminder?.selectedDhikrIds && settings.dhikrReminder.selectedDhikrIds.length > 0 && (
                    <button
                      onClick={() => {
                        const updated = { ...settings };
                        updated.dhikrReminder = {
                          ...updated.dhikrReminder,
                          selectedDhikrIds: [],
                          currentIndex: 0
                        };
                        updateSettings(updated);
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[#D4AF37] text-[10px] font-bold border border-[#D4AF37]/30"
                    >
                      تفعيل الكل
                    </button>
                  )}
                  <button
                    onClick={() => setShowDhikrLibrary(!showDhikrLibrary)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold border border-slate-700"
                  >
                    {showDhikrLibrary ? 'إخفاء القائمة' : 'عرض الأذكار'}
                  </button>
                </div>
              </div>

              {showDhikrLibrary && (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-0.5">
                  {VERIFIED_DHIKR_REMINDERS.map((item) => {
                    const selectedIds = settings.dhikrReminder?.selectedDhikrIds || [];
                    const isSelected = selectedIds.length === 0 || selectedIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-2xl border transition-all flex flex-col gap-2 ${
                          isSelected
                            ? 'bg-[#17212D]/90 border-[#D4AF37]/40'
                            : 'bg-slate-900/40 border-slate-800/80 opacity-65'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            onClick={() => {
                              const updated = { ...settings };
                              const curIds = updated.dhikrReminder?.selectedDhikrIds || [];
                              let nextIds: string[];
                              if (curIds.length === 0) {
                                // Switching from "All" to toggling this specific one off -> select all except this one
                                nextIds = VERIFIED_DHIKR_REMINDERS.map((d) => d.id).filter((id) => id !== item.id);
                              } else if (curIds.includes(item.id)) {
                                nextIds = curIds.filter((id) => id !== item.id);
                              } else {
                                nextIds = [...curIds, item.id];
                              }
                              updated.dhikrReminder = {
                                ...updated.dhikrReminder,
                                selectedDhikrIds: nextIds,
                                currentIndex: 0
                              };
                              updateSettings(updated);
                            }}
                            className="flex items-start gap-2 text-right flex-1"
                          >
                            <div
                              className={`w-4 h-4 rounded-md mt-0.5 flex items-center justify-center shrink-0 border ${
                                isSelected
                                  ? 'bg-[#D4AF37] border-[#D4AF37] text-slate-950'
                                  : 'bg-slate-800 border-slate-600 text-transparent'
                              }`}
                            >
                              <Check size={11} strokeWidth={3} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-100">{item.title}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 font-semibold">
                                  {item.categoryLabel}
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {item.durationSeconds} ث
                                </span>
                              </div>
                              <p className="text-xs text-amber-100/95 font-quran leading-relaxed mt-1">
                                {item.arabicText}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                                {item.fadl}
                              </p>
                            </div>
                          </button>

                          {/* Direct Preview / Test Button for this specific Dhikr */}
                          <button
                            onClick={() => ReminderEngine.testDhikrReminder(item.id)}
                            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/40 text-[10px] font-bold transition-transform active:scale-95 shadow"
                            title="سماع وتجربة هذا الذكر الآن"
                          >
                            <Play size={10} fill="currentColor" />
                            <span>استماع</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Test Random / Next Verified Dhikr Button */}
            <div className="pt-1 flex justify-end">
              <button
                onClick={() => ReminderEngine.testDhikrReminder()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-950/60 hover:bg-amber-900 text-[#D4AF37] border border-[#D4AF37]/40 rounded-xl text-xs font-semibold transition-colors active:scale-95 shadow"
              >
                <Play size={12} fill="currentColor" />
                <span>اختبار تنبيه ذكر الله القادم الآن (بالصوت النقي والإشعار)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Daily Wird Reminder Card */}
      <div className="relative overflow-hidden bg-[#121820] border border-slate-800 rounded-3xl p-5 space-y-4 shadow-lg">
        <RotatingCardBackground slot="wird" cardOffset={1} intervalMs={26000} opacity={0.28} />
        <div className="relative z-10 flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-500/15 rounded-xl text-cyan-400">
              <Award size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">تذكير الورد القرآني اليومي</h3>
              <p className="text-[11px] text-slate-400">
                تنبيه يومي لمتابعة وردك المحدد من السور والآيات
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const updated = { ...settings };
              const cur = updated.dailyWirdReminder || {
                enabled: false,
                frequency: 'daily',
                startTime: '19:00',
                endTime: '22:00',
                mode: 'notification_and_sound'
              };
              updated.dailyWirdReminder = { ...cur, enabled: !cur.enabled };
              updateSettings(updated);
            }}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
              settings.dailyWirdReminder?.enabled ? 'bg-cyan-500' : 'bg-slate-700'
            }`}
            aria-label="تفعيل تذكير الورد اليومي"
          >
            <div
              className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                settings.dailyWirdReminder?.enabled ? '-translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {settings.dailyWirdReminder?.enabled && (
          <div className="relative z-10 space-y-3.5 text-xs text-right">
            {/* 1m test badge notice */}
            {settings.dailyWirdReminder?.frequency === '1m' && (
              <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-[11px] text-cyan-300">
                ⚡ <strong>وضع التجربة السريع (كل دقيقة) نشط:</strong> سيعمل تذكير الورد اليومي ﴿وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا﴾ خلال ثوانٍ ويتكرر كل دقيقة متجاوزاً ساعات الهدوء ونافذة الوقت لتجربته فوراً.
              </div>
            )}

            {/* Frequency Selector */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">تكرار التذكير</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {frequencies.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      const updated = { ...settings };
                      updated.dailyWirdReminder = {
                        ...updated.dailyWirdReminder,
                        frequency: f.id
                      };
                      updateSettings(updated);
                    }}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      settings.dailyWirdReminder?.frequency === f.id
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 font-bold'
                        : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Window */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">وقت التنبيه بالورد</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-800/40 border border-slate-800 rounded-xl flex items-center justify-between">
                  <span className="text-slate-400">من:</span>
                  <input
                    type="time"
                    value={settings.dailyWirdReminder?.startTime || '08:00'}
                    onChange={(e) => {
                      const updated = { ...settings };
                      updated.dailyWirdReminder = {
                        ...updated.dailyWirdReminder,
                        startTime: e.target.value
                      };
                      updateSettings(updated);
                    }}
                    className="bg-transparent text-slate-100 font-mono focus:outline-none"
                  />
                </div>
                <div className="p-2.5 bg-slate-800/40 border border-slate-800 rounded-xl flex items-center justify-between">
                  <span className="text-slate-400">إلى:</span>
                  <input
                    type="time"
                    value={settings.dailyWirdReminder?.endTime || '23:00'}
                    onChange={(e) => {
                      const updated = { ...settings };
                      updated.dailyWirdReminder = {
                        ...updated.dailyWirdReminder,
                        endTime: e.target.value
                      };
                      updateSettings(updated);
                    }}
                    className="bg-transparent text-slate-100 font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Playback Modes for Daily Wird */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">سلوك التنبيه</label>
              <div className="grid grid-cols-3 gap-1.5">
                {modes.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      const updated = { ...settings };
                      updated.dailyWirdReminder = {
                        ...updated.dailyWirdReminder,
                        mode: m.id
                      };
                      updateSettings(updated);
                    }}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      (settings.dailyWirdReminder?.mode || 'notification_and_sound') === m.id
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 font-bold'
                        : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Test Button */}
            <div className="pt-1 flex justify-end">
              <button
                onClick={() => ReminderEngine.testDailyWirdReminder()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 rounded-xl text-xs font-semibold transition-colors active:scale-95 shadow"
              >
                <Play size={12} fill="currentColor" />
                <span>اختبار تذكير الورد اليومي الآن (بالصوت والإشعار)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3.5. Parents Care & Kinship Reminder Card (تذكير بر الوالدين والإحسان إليهما) */}
      <div className="relative overflow-hidden bg-[#121820] border border-rose-500/35 rounded-3xl p-5 space-y-4 shadow-lg">
        <RotatingCardBackground slot="reminders" cardOffset={2} intervalMs={27000} opacity={0.24} />
        <div className="relative z-10 flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-500/15 rounded-xl text-rose-400">
              <Heart size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">تذكير بر الوالدين والإحسان إليهما</h3>
              <p className="text-[11px] text-slate-400">
                تنبيه مبارك بتفقد الوالدين والدعاء لهما بصوت الشيخ مشاري العفاسي
              </p>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={() => {
              const updated = { ...settings };
              updated.parentsReminder = {
                ...updated.parentsReminder,
                enabled: !updated.parentsReminder?.enabled
              };
              updateSettings(updated);
            }}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
              settings.parentsReminder?.enabled ? 'bg-rose-500' : 'bg-slate-700'
            }`}
            aria-label="تفعيل تذكير بر الوالدين"
          >
            <div
              className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                settings.parentsReminder?.enabled ? '-translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {settings.parentsReminder?.enabled && (
          <div className="relative z-10 space-y-3.5 text-xs text-right">
            {/* Ayat & Voice Notice */}
            <div className="p-3 bg-rose-950/25 border border-rose-500/30 rounded-2xl text-center space-y-1">
              <p className="font-quran text-xs text-rose-200">
                ﴿وَقَضَىٰ رَبُّكَ أَّلَا تَعْبُدُوا إِلَّا إِيَّاهُ وَبِالْوَالِدَيْنِ إِحْسَانًا﴾
              </p>
              <p className="text-[11px] text-slate-400">
                التلاوة المعتمدة للتنبيه الصوتي: <strong>﴿رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا﴾</strong> · بصوت الشيخ مشاري العفاسي
              </p>
            </div>

            {/* 1m test mode alert if active */}
            {settings.parentsReminder.frequency === '1m' && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300">
                ⚡ <strong>وضع التجربة السريع (كل دقيقة) نشط:</strong> يعمل التنبيه كل دقيقة متجاوزاً ساعات الهدوء لتجربة الصوت ودور التنبيهات فوراً.
              </div>
            )}

            {/* Frequency Selector */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">تكرار التذكير</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'daily', label: 'مرة يومياً (موصى به)' },
                  { id: '1m', label: 'كل دقيقة (تجريبي)' },
                  { id: '2h', label: 'كل ساعتين' },
                  { id: '4h', label: 'كل 4 ساعات' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      const updated = { ...settings };
                      updated.parentsReminder = {
                        ...updated.parentsReminder,
                        frequency: f.id as any
                      };
                      updateSettings(updated);
                    }}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      settings.parentsReminder?.frequency === f.id
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                        : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Window */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">نافذة وقت التذكير</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-800/40 border border-slate-800 rounded-xl flex items-center justify-between">
                  <span className="text-slate-400">من:</span>
                  <input
                    type="time"
                    value={settings.parentsReminder?.startTime || '09:00'}
                    onChange={(e) => {
                      const updated = { ...settings };
                      updated.parentsReminder = {
                        ...updated.parentsReminder,
                        startTime: e.target.value
                      };
                      updateSettings(updated);
                    }}
                    className="bg-transparent text-slate-100 font-mono focus:outline-none"
                  />
                </div>
                <div className="p-2.5 bg-slate-800/40 border border-slate-800 rounded-xl flex items-center justify-between">
                  <span className="text-slate-400">إلى:</span>
                  <input
                    type="time"
                    value={settings.parentsReminder?.endTime || '21:00'}
                    onChange={(e) => {
                      const updated = { ...settings };
                      updated.parentsReminder = {
                        ...updated.parentsReminder,
                        endTime: e.target.value
                      };
                      updateSettings(updated);
                    }}
                    className="bg-transparent text-slate-100 font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Playback Modes for Parents Reminder */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">سلوك التنبيه</label>
              <div className="grid grid-cols-3 gap-1.5">
                {modes.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      const updated = { ...settings };
                      updated.parentsReminder = {
                        ...updated.parentsReminder,
                        mode: m.id
                      };
                      updateSettings(updated);
                    }}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      (settings.parentsReminder?.mode || 'notification_and_sound') === m.id
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                        : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Test Button */}
            <div className="pt-1 flex justify-end">
              <button
                onClick={() => ReminderEngine.testParentsReminder()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-semibold transition-colors active:scale-95 shadow"
              >
                <Play size={12} fill="currentColor" />
                <span>اختبار تذكير بر الوالدين الآن (بالصوت والإشعار)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Complete Adhan, Dua & Iqamah Settings Card */}
      <div className="relative overflow-hidden bg-[#121820] border border-slate-800 rounded-3xl p-5 space-y-4 shadow-lg">
        <RotatingCardBackground slot="kaaba" cardOffset={0} intervalMs={24000} opacity={0.3} />
        <div className="relative z-10 flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/15 rounded-xl text-amber-400">
              <Volume2 size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">الأذان وإقامة الصلاة ودعاء الأذان</h3>
              <p className="text-[11px] text-slate-400">
                نداء الصلاة الدقيق بحسب موقعك مع دعاء الوسيلة والإقامة
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const updated = { ...settings };
              updated.adhanEnabled = !updated.adhanEnabled;
              updateSettings(updated);
            }}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
              settings.adhanEnabled ? 'bg-amber-500' : 'bg-slate-700'
            }`}
            aria-label="تفعيل الأذان"
          >
            <div
              className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                settings.adhanEnabled ? '-translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {settings.adhanEnabled && (
          <div className="relative z-10 space-y-4 text-xs text-right">
            {/* Adhan Voice Selector */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">صوت الأذان المفضل (جودة عالية HQ)</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'alafasy', label: 'الشيخ مشاري العفاسي' },
                  { id: 'makkah', label: 'الحرم المكي الشريف' },
                  { id: 'madinah', label: 'المسجد النبوي الشريف' },
                  { id: 'alaqsa', label: 'المسجد الأقصى المبارك' },
                ].map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      const updated = { ...settings, adhanVoice: v.id as any };
                      updateSettings(updated);
                    }}
                    className={`p-2.5 rounded-xl border text-right transition-all ${
                      settings.adhanVoice === v.id
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Adhan Playback Mode: Full vs First Two Takbeers */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">مدة تشغيل الأذان</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => {
                    const updated = { ...settings, adhanMode: 'full' as const };
                    updateSettings(updated);
                  }}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    settings.adhanMode !== 'first_two_takbeers'
                      ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] font-bold'
                      : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="block font-bold">الأذان كاملاً</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">النداء بالكامل حتى نهايته</span>
                </button>

                <button
                  onClick={() => {
                    const updated = { ...settings, adhanMode: 'first_two_takbeers' as const };
                    updateSettings(updated);
                  }}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    settings.adhanMode === 'first_two_takbeers'
                      ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] font-bold'
                      : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="block font-bold">أول تكبيرتين فقط</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">تكبيرتان تنبيهاً لدخول الوقت (~20 ث)</span>
                </button>
              </div>
            </div>

            {/* Dua After Adhan Toggle */}
            <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-slate-200 font-bold block text-xs">دعاء ما بعد الأذان</span>
                <span className="text-[10px] text-slate-400 block mt-0.5 leading-relaxed">
                  اللهم رب هذه الدعوة التامة والصلاة القائمة (يشتغل تلقائياً فور انتهاء الأذان)
                </span>
              </div>
              <button
                onClick={() => {
                  const updated = { ...settings, duaAfterAdhanEnabled: !settings.duaAfterAdhanEnabled };
                  updateSettings(updated);
                }}
                className={`w-10 h-5 rounded-full transition-colors relative p-0.5 shrink-0 mr-2 ${
                  settings.duaAfterAdhanEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                    settings.duaAfterAdhanEnabled ? '-translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Iqamah Settings Toggle */}
            <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-slate-200 font-bold block text-xs">تنبيه وصوت إقامة الصلاة</span>
                <span className="text-[10px] text-slate-400 block mt-0.5 leading-relaxed">
                  قد قامت الصلاة (بعد الأذان بـ 15 دقيقة، والمغرب بعد 5 دقائق)
                </span>
              </div>
              <button
                onClick={() => {
                  const updated = {
                    ...settings,
                    iqamahSettings: {
                      ...settings.iqamahSettings,
                      enabled: !settings.iqamahSettings?.enabled
                    }
                  };
                  updateSettings(updated);
                }}
                className={`w-10 h-5 rounded-full transition-colors relative p-0.5 shrink-0 mr-2 ${
                  settings.iqamahSettings?.enabled ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                    settings.iqamahSettings?.enabled ? '-translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Prayer Audio Test Buttons */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-2 justify-end">
              <button
                onClick={() => ReminderEngine.testAdhan(settings.adhanVoice, settings.adhanMode)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-800/60 rounded-xl text-xs font-semibold transition-all active:scale-95 shadow"
              >
                <Play size={12} fill="currentColor" />
                <span>اختبار الأذان</span>
              </button>

              <button
                onClick={() => ReminderEngine.testDuaAfterAdhan()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 rounded-xl text-xs font-semibold transition-all active:scale-95 shadow"
              >
                <Play size={12} fill="currentColor" />
                <span>اختبار دعاء الأذان</span>
              </button>

              <button
                onClick={() => ReminderEngine.testIqamah()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 rounded-xl text-xs font-semibold transition-all active:scale-95 shadow"
              >
                <Play size={12} fill="currentColor" />
                <span>اختبار الإقامة</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Daily Ayah & Hadith Auto Rotation Card (تجدد الآية اليومية والحديث الشريف) */}
      <div className="relative overflow-hidden bg-[#121820] border border-slate-800 rounded-3xl p-5 space-y-4 shadow-lg">
        <RotatingCardBackground slot="hadith" cardOffset={1} intervalMs={27000} opacity={0.24} />
        <div className="relative z-10 flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/15 rounded-xl text-[#D4AF37]">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">تجدد الآية اليومية والحديث الشريف</h3>
              <p className="text-[11px] text-slate-400">
                جدولة تحديث الآية والحديث النبوي في الصفحة الرئيسية تلقائياً
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const updated = {
                ...settings,
                dailyContentSettings: {
                  ...settings.dailyContentSettings,
                  autoRotate: !settings.dailyContentSettings?.autoRotate
                }
              };
              updateSettings(updated);
            }}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
              settings.dailyContentSettings?.autoRotate ? 'bg-[#D4AF37]' : 'bg-slate-700'
            }`}
            aria-label="تفعيل تجدد الآية والحديث"
          >
            <div
              className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                settings.dailyContentSettings?.autoRotate ? '-translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {settings.dailyContentSettings?.autoRotate && (
          <div className="relative z-10 space-y-3.5 text-xs text-right">
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">معدل التحديث التلقائي</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'daily', label: 'يومياً بوقت محدد' },
                  { id: '12h', label: 'كل 12 ساعة' },
                  { id: '6h', label: 'كل 6 ساعات' },
                ].map((freq) => (
                  <button
                    key={freq.id}
                    onClick={() => {
                      const updated = {
                        ...settings,
                        dailyContentSettings: {
                          ...settings.dailyContentSettings,
                          rotationFrequency: freq.id as 'daily' | '12h' | '6h',
                          lastRotatedKey: ''
                        }
                      };
                      updateSettings(updated);
                    }}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      (settings.dailyContentSettings?.rotationFrequency || 'daily') === freq.id
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] font-bold'
                        : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {freq.label}
                  </button>
                ))}
              </div>
            </div>

            {(settings.dailyContentSettings?.rotationFrequency || 'daily') === 'daily' && (
              <div className="space-y-2">
                <label className="text-slate-400 block font-medium">وقت التجديد المفضل</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { time: '00:00', label: 'منتصف الليل' },
                    { time: '05:00', label: 'مع الفجر (5 ص)' },
                    { time: '08:00', label: 'الصباح (8 ص)' },
                  ].map((item) => (
                    <button
                      key={item.time}
                      onClick={() => {
                        const updated = {
                          ...settings,
                          dailyContentSettings: {
                            ...settings.dailyContentSettings,
                            customHourTime: item.time,
                            lastRotatedKey: ''
                          }
                        };
                        updateSettings(updated);
                      }}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        settings.dailyContentSettings?.customHourTime === item.time
                          ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] font-bold'
                          : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="p-2.5 bg-slate-800/40 border border-slate-800 rounded-xl flex items-center justify-between">
                  <span className="text-slate-300 text-xs">أو حدد ساعة مخصصة للتجديد:</span>
                  <input
                    type="time"
                    value={settings.dailyContentSettings?.customHourTime || '00:00'}
                    onChange={(e) => {
                      const updated = {
                        ...settings,
                        dailyContentSettings: {
                          ...settings.dailyContentSettings,
                          customHourTime: e.target.value,
                          lastRotatedKey: ''
                        }
                      };
                      updateSettings(updated);
                    }}
                    className="bg-slate-900 px-2.5 py-1 rounded-lg text-[#D4AF37] font-mono text-xs focus:outline-none font-bold border border-slate-700"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. Quiet Hours Card */}
      <div className="relative overflow-hidden bg-[#121820] border border-slate-800 rounded-3xl p-5 space-y-3 shadow-lg">
        <RotatingCardBackground slot="reminders" cardOffset={3} intervalMs={30000} opacity={0.25} />
        <div className="relative z-10 flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/15 rounded-xl text-indigo-400">
              <Moon size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">ساعات الهدوء (عدم الإزعاج)</h3>
              <p className="text-[11px] text-slate-400">
                إيقاف التذكيرات العامة تلقائياً أثناء ساعات نومك
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const updated = { ...settings };
              updated.quietHours.enabled = !updated.quietHours.enabled;
              updateSettings(updated);
            }}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
              settings.quietHours.enabled ? 'bg-indigo-500' : 'bg-slate-700'
            }`}
            aria-label="تفعيل ساعات الهدوء"
          >
            <div
              className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                settings.quietHours.enabled ? '-translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {settings.quietHours.enabled && (
          <div className="relative z-10 grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-slate-800/40 border border-slate-800 rounded-xl flex items-center justify-between">
              <span className="text-slate-400">تبدأ من:</span>
              <input
                type="time"
                value={settings.quietHours.startTime}
                onChange={(e) => {
                  const updated = { ...settings };
                  updated.quietHours.startTime = e.target.value;
                  updateSettings(updated);
                }}
                className="bg-transparent text-slate-100 font-mono focus:outline-none"
              />
            </div>
            <div className="p-2.5 bg-slate-800/40 border border-slate-800 rounded-xl flex items-center justify-between">
              <span className="text-slate-400">تنتهي في:</span>
              <input
                type="time"
                value={settings.quietHours.endTime}
                onChange={(e) => {
                  const updated = { ...settings };
                  updated.quietHours.endTime = e.target.value;
                  updateSettings(updated);
                }}
                className="bg-transparent text-slate-100 font-mono focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Save & Exit Button */}
      {onClose && (
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-slate-100 font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow"
          >
            <Check size={16} className="text-[#D4AF37]" />
            <span>حفظ الإعدادات والخروج</span>
          </button>
        </div>
      )}
    </div>
  );
};
