import React, { useState, useEffect } from 'react';
import { AppSettings, ReminderFrequency, ReminderPlaybackMode } from '../types';
import { StorageService } from '../services/storageService';
import { ReminderEngine } from '../services/reminderService';
import { VERIFIED_RECITERS } from '../data/surahsData';
import { Bell, Moon, BookOpen, Clock, Volume2, Check, Play, Heart, X, Award, CheckCircle2 } from 'lucide-react';

interface RemindersViewProps {
  onClose?: () => void;
}

export const RemindersView: React.FC<RemindersViewProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());
  const [saveToast, setSaveToast] = useState<string | null>(null);

  useEffect(() => {
    setSettings(StorageService.getSettings());
  }, []);

  const updateSettings = (newSettings: AppSettings, msg: string = 'تم حفظ الإعدادات وتحديث الجدولة بنجاح ✓') => {
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
    ReminderEngine.restart();
    setSaveToast(msg);
    setTimeout(() => {
      setSaveToast(null);
    }, 3500);
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
            تحكم مستقل وشامل في إشعارات القرآن والصلوات والورد اليومي
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

      {/* Save Toast Indicator */}
      {saveToast && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-2xl flex items-center gap-2 text-xs text-emerald-300 animate-slideDown shadow-lg">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span className="font-semibold">{saveToast}</span>
        </div>
      )}

      {/* 1. Quran Verse Reminder Card */}
      <div className="bg-[#121820] border border-slate-800 rounded-3xl p-5 space-y-4 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
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
          <div className="space-y-3.5 text-xs text-right">
            {/* Same Reciter Notice */}
            <div className="p-2.5 bg-amber-950/20 border border-[#D4AF37]/20 rounded-xl text-[11px] text-[#D4AF37]">
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
                      updateSettings(updated, `تم تفعيل تكرار آية القرآن: ${f.label}`);
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
                onClick={() => ReminderEngine.triggerQuranVerseReminder(settings.quranVerseReminder.mode)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-[#D4AF37] border border-[#D4AF37]/30 rounded-xl text-xs font-semibold transition-colors active:scale-95 shadow"
              >
                <Play size={12} fill="currentColor" />
                <span>اختبار تذكير الآية الآن (مع الإشعار والصوت)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Salawat Reminder Card */}
      <div className="bg-[#121820] border border-slate-800 rounded-3xl p-5 space-y-4 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/15 rounded-xl text-emerald-400">
              <Heart size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">الصلاة على النبي ﷺ</h3>
              <p className="text-[11px] text-slate-400">
                تذكير دوري لتعطير لسانك بالصلاة والسلام على رسول الله مع صوت مبارك
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const updated = { ...settings };
              updated.salawatReminder.enabled = !updated.salawatReminder.enabled;
              updateSettings(updated);
            }}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
              settings.salawatReminder.enabled ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
            aria-label="تفعيل تذكير الصلاة على النبي ﷺ"
          >
            <div
              className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                settings.salawatReminder.enabled ? '-translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {settings.salawatReminder.enabled && (
          <div className="space-y-3.5 text-xs text-right">
            {/* 1m test badge notice */}
            {settings.salawatReminder.frequency === '1m' && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-[11px] text-emerald-300">
                ⚡ <strong>وضع التجربة السريع (كل دقيقة) نشط:</strong> سيعمل تنبيه الصلاة على النبي خلال ثوانٍ ويتكرر كل دقيقة متجاوزاً ساعات الهدوء لتجربة الإشعار فوراً.
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
                      updated.salawatReminder.frequency = f.id;
                      updateSettings(updated, `تم تفعيل تكرار الصلاة على النبي: ${f.label}`);
                    }}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      settings.salawatReminder.frequency === f.id
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
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
                    value={settings.salawatReminder.startTime}
                    onChange={(e) => {
                      const updated = { ...settings };
                      updated.salawatReminder.startTime = e.target.value;
                      updateSettings(updated);
                    }}
                    className="bg-transparent text-slate-100 font-mono focus:outline-none"
                  />
                </div>
                <div className="p-2.5 bg-slate-800/40 border border-slate-800 rounded-xl flex items-center justify-between">
                  <span className="text-slate-400">إلى:</span>
                  <input
                    type="time"
                    value={settings.salawatReminder.endTime}
                    onChange={(e) => {
                      const updated = { ...settings };
                      updated.salawatReminder.endTime = e.target.value;
                      updateSettings(updated);
                    }}
                    className="bg-transparent text-slate-100 font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Playback Modes for Salawat */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">سلوك التنبيه</label>
              <div className="grid grid-cols-3 gap-1.5">
                {modes.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      const updated = { ...settings };
                      updated.salawatReminder.mode = m.id;
                      updateSettings(updated);
                    }}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      settings.salawatReminder.mode === m.id
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
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
                onClick={() => ReminderEngine.triggerSalawatReminder(settings.salawatReminder.mode)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 rounded-xl text-xs font-semibold transition-colors active:scale-95 shadow"
              >
                <Play size={12} fill="currentColor" />
                <span>اختبار تذكير الصلاة على النبي الآن (بالصوت والإشعار)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Daily Wird Reminder Card */}
      <div className="bg-[#121820] border border-slate-800 rounded-3xl p-5 space-y-4 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
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
          <div className="space-y-3.5 text-xs text-right">
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
                      updateSettings(updated, `تم تعيين تكرار تذكير الورد: ${f.label}`);
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
                    value={settings.dailyWirdReminder?.startTime || '19:00'}
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
                    value={settings.dailyWirdReminder?.endTime || '22:00'}
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

            {/* Test Button */}
            <div className="pt-1 flex justify-end">
              <button
                onClick={() => ReminderEngine.triggerDailyWirdReminder(settings.dailyWirdReminder?.mode)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 rounded-xl text-xs font-semibold transition-colors active:scale-95 shadow"
              >
                <Play size={12} fill="currentColor" />
                <span>اختبار تذكير الورد اليومي الآن</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Quiet Hours Card */}
      <div className="bg-[#121820] border border-slate-800 rounded-3xl p-5 space-y-3 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
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
          <div className="grid grid-cols-2 gap-2 text-xs">
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
