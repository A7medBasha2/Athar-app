import React, { useState, useEffect } from 'react';
import { AppSettings, ReminderFrequency, ReminderPlaybackMode } from '../types';
import { StorageService } from '../services/storageService';
import { ReminderEngine } from '../services/reminderService';
import { LiveActivityService } from '../services/liveActivityService';
import { VERIFIED_RECITERS } from '../data/surahsData';
import { VERIFIED_DHIKR_REMINDERS } from '../data/dhikrRemindersData';
import { RotatingCardBackground } from '../components/RotatingCardBackground';
import { Bell, Moon, BookOpen, Volume2, Check, Play, Heart, X, Award, Sparkles, ShieldCheck, Crown, Eye } from 'lucide-react';

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

  const renderToggle = (checked: boolean, onClick: () => void, label: string) => (
    <button
      onClick={onClick}
      className={`w-12 h-6 rounded-full transition-all relative p-0.5 border shrink-0 ${
        checked
          ? 'bg-gradient-to-r from-[#E6C66E] to-[#B88A2D] border-[#F3E5AB]'
          : 'bg-[#1D1912] border-[#C8A24A]/30'
      }`}
      aria-label={label}
    >
      <div
        className={`w-4.5 h-4.5 rounded-full transition-transform ${
          checked ? '-translate-x-6 bg-[#070707]' : 'translate-x-0 bg-[#C4B998]'
        }`}
      />
    </button>
  );

  return (
    <div className="athar-page-container select-none">
      {/* Header with Exit / Close button */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#C8A24A]/25">
        <div>
          <h1 className="text-lg font-extrabold text-white flex items-center gap-2 tracking-wide">
            <Bell size={20} className="text-[#E6C66E]" />
            <span>مركز التذكيرات والتنبيهات المتقدم</span>
          </h1>
          <p className="text-[11px] text-[#C4B998] mt-0.5">
            تحكم شامل في الأذان، بر الوالدين، الأذكار، الآية والحديث اليومي، والورد القرآني
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B170F] hover:bg-[#262015] text-[#F3E5AB] border border-[#C8A24A]/45 rounded-xl text-xs font-extrabold transition-all active:scale-95 shadow"
            title="خروج من مركز التذكيرات"
          >
            <X size={15} className="text-[#E6C66E]" />
            <span>خروج</span>
          </button>
        )}
      </div>

      {/* 1. Quran Verse Reminder Card */}
      <div className="relative overflow-hidden athar-card space-y-4">
        <RotatingCardBackground slot="quran" cardOffset={0} intervalMs={25000} opacity={0.18} />
        <div className="relative z-10 flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#1F1B12] border border-[#C8A24A]/45 rounded-xl text-[#E6C66E]">
              <BookOpen size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#F3E5AB]">آية من القرآن الكريم</h3>
              <p className="text-[11px] text-[#C4B998]">
                تذكير دوري بآيات مباركة مع تلاوة صوتية متطابقة
              </p>
            </div>
          </div>

          {renderToggle(
            settings.quranVerseReminder.enabled,
            () => {
              const updated = { ...settings };
              updated.quranVerseReminder.enabled = !updated.quranVerseReminder.enabled;
              updateSettings(updated);
            },
            'تفعيل تذكير آية من القرآن الكريم'
          )}
        </div>

        {settings.quranVerseReminder.enabled && (
          <div className="relative z-10 space-y-3.5 text-xs text-right">
            {/* Same Reciter Notice */}
            <div className="p-2.5 bg-[#1B170F] border border-[#C8A24A]/40 rounded-xl text-[11px] text-[#E6C66E]">
              <span>القارئ المعتمد للتذكير الصوتي: </span>
              <strong className="text-[#F3E5AB]">{currentReciter.nameArabic}</strong> (مستمد تلقائيًا من إعدادات القرآن)
            </div>

            {/* 1m test badge notice */}
            {settings.quranVerseReminder.frequency === '1m' && (
              <div className="p-2.5 bg-[#241E11] border border-[#E6C66E]/50 rounded-xl text-[11px] text-[#F3E5AB]">
                ⚡ <strong className="text-[#E6C66E]">وضع التجربة السريع (كل دقيقة) نشط:</strong> سيعمل التنبيه خلال ثوانٍ ويتكرر كل دقيقة متجاوزاً ساعات الهدوء لتتمكن من تجربته فوراً.
              </div>
            )}

            {/* Frequency Selector */}
            <div>
              <label className="text-[#C4B998] block mb-1.5 font-bold">تكرار التذكير</label>
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
                        ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] border-[#F3E5AB] text-[#070707] font-extrabold shadow-sm'
                        : 'bg-[#14120D] border-[#C8A24A]/30 text-[#C4B998] hover:border-[#E6C66E]/60 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Window (Start / End) */}
            <div>
              <label className="text-[#C4B998] block mb-1.5 font-bold">نافذة وقت الإرسال</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-[#14120D] border border-[#C8A24A]/30 rounded-xl flex items-center justify-between">
                  <span className="text-[#C4B998] font-bold">من:</span>
                  <input
                    type="time"
                    value={settings.quranVerseReminder.startTime}
                    onChange={(e) => {
                      const updated = { ...settings };
                      updated.quranVerseReminder.startTime = e.target.value;
                      updateSettings(updated);
                    }}
                    className="bg-transparent text-[#F3E5AB] font-mono font-bold focus:outline-none"
                  />
                </div>
                <div className="p-2.5 bg-[#14120D] border border-[#C8A24A]/30 rounded-xl flex items-center justify-between">
                  <span className="text-[#C4B998] font-bold">إلى:</span>
                  <input
                    type="time"
                    value={settings.quranVerseReminder.endTime}
                    onChange={(e) => {
                      const updated = { ...settings };
                      updated.quranVerseReminder.endTime = e.target.value;
                      updateSettings(updated);
                    }}
                    className="bg-transparent text-[#F3E5AB] font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Playback Modes */}
            <div>
              <label className="text-[#C4B998] block mb-1.5 font-bold">سلوك التنبيه</label>
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
                        ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] border-[#F3E5AB] text-[#070707] font-extrabold shadow-sm'
                        : 'bg-[#14120D] border-[#C8A24A]/30 text-[#C4B998] hover:border-[#E6C66E]/60 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dual Test Buttons */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-[#C8A24A]/20">
              <button
                onClick={() => ReminderEngine.testInAppReminder('quran')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0A261A]/80 hover:bg-[#0E3524] text-[#A7F3D0] border border-[#10B981]/50 rounded-xl text-xs font-extrabold transition-all active:scale-95 shadow"
                title="معاينة ظهور التنبيه والتلاوة داخل التطبيق فقط"
              >
                <Eye size={13} className="text-[#34D399]" />
                <span>تجربة التذكير الداخلي</span>
              </button>

              <button
                onClick={() => ReminderEngine.testRoyalAtharReminder('quran')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-[#E6C66E] via-[#F3E5AB] to-[#B88A2D] text-[#080705] rounded-xl text-xs font-extrabold shadow-[0_2px_12px_rgba(230,198,110,0.3)] hover:brightness-105 active:scale-95 transition-all"
                title="تشغيل إشعار الأثر الملكي كاملاً خارج التطبيق عبر Full-Screen Intent و System Overlay"
              >
                <Crown size={13} className="text-[#080705]" />
                <span>تجربة تنبيه الأثر الملكي</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Dhikr Allah & Multiplying Praise Reminders Card */}
      <div className="relative overflow-hidden athar-card-gold space-y-4">
        <RotatingCardBackground slot="adhkar" cardOffset={2} intervalMs={26000} opacity={0.18} />
        <div className="relative z-10 flex items-center justify-between pb-3 border-b border-[#C8A24A]/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#1F1B12] border border-[#C8A24A]/50 rounded-xl text-[#E6C66E]">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm font-extrabold text-[#F3E5AB]">تنبيهات ذكر الله والتسبيح المضاعف</h3>
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#C8A24A]/20 text-[#E6C66E] border border-[#C8A24A]/45 font-extrabold flex items-center gap-0.5">
                  <ShieldCheck size={10} />
                  <span>صوت استوديو نقي 100%</span>
                </span>
              </div>
              <p className="text-[11px] text-[#C4B998] mt-0.5">
                تسبيح وصلوات على النبي ﷺ وحمدٌ يملأ ما بين السماوات والأرض وعدد خلقه بصوت نقي ومحترف
              </p>
            </div>
          </div>

          {renderToggle(
            Boolean(settings.dhikrReminder?.enabled),
            () => {
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
            },
            'تفعيل تنبيهات ذكر الله'
          )}
        </div>

        {settings.dhikrReminder?.enabled && (
          <div className="relative z-10 space-y-3.5 text-xs text-right">
            {/* Pure studio audio guarantee notice */}
            <div className="p-2.5 bg-[#1B170F] border border-[#C8A24A]/45 rounded-xl text-[11px] text-[#F3E5AB] flex items-center justify-between gap-2">
              <span>
                🎙️ <strong className="text-[#E6C66E]">ضمان نقاء الصوت:</strong> جميع الأذكار والصلوات في هذه المجموعة مسجّلة بصوت استوديو احترافي نقي (الشيخ مشاري العفاسي وحِصن المسلم)، ولا يُنشأ أي تنبيه بدون ملف صوتي نقي وموثق.
              </span>
            </div>

            {/* 1m test badge notice */}
            {settings.dhikrReminder?.frequency === '1m' && (
              <div className="p-2.5 bg-[#241E11] border border-[#E6C66E]/50 rounded-xl text-[11px] text-[#F3E5AB]">
                ⚡ <strong className="text-[#E6C66E]">وضع التجربة السريع (كل دقيقة) نشط:</strong> سيعمل تنبيه ذكر الله الصوتي خلال ثوانٍ ويتكرر كل دقيقة بالتناوب بين الأذكار المختارة.
              </div>
            )}

            {/* Frequency Selector */}
            <div>
              <label className="text-[#C4B998] block mb-1.5 font-bold">تكرار تنبيهات الذكر</label>
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
                        ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] border-[#F3E5AB] text-[#070707] font-extrabold shadow-sm'
                        : 'bg-[#14120D] border-[#C8A24A]/30 text-[#C4B998] hover:border-[#E6C66E]/60 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Window */}
            <div>
              <label className="text-[#C4B998] block mb-1.5 font-bold">نافذة وقت الإرسال</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-[#14120D] border border-[#C8A24A]/30 rounded-xl flex items-center justify-between">
                  <span className="text-[#C4B998] font-bold">من:</span>
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
                    className="bg-transparent text-[#F3E5AB] font-mono font-bold focus:outline-none"
                  />
                </div>
                <div className="p-2.5 bg-[#14120D] border border-[#C8A24A]/30 rounded-xl flex items-center justify-between">
                  <span className="text-[#C4B998] font-bold">إلى:</span>
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
                    className="bg-transparent text-[#F3E5AB] font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Playback Modes */}
            <div>
              <label className="text-[#C4B998] block mb-1.5 font-bold">سلوك التنبيه</label>
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
                        ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] border-[#F3E5AB] text-[#070707] font-extrabold shadow-sm'
                        : 'bg-[#14120D] border-[#C8A24A]/30 text-[#C4B998] hover:border-[#E6C66E]/60 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Verified Pure Audio Dhikr Collection Selector */}
            <div className="pt-2 border-t border-[#C8A24A]/25 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[#F3E5AB] font-extrabold block text-xs">
                    مكتبة تنبيهات الأذكار الصوتية النقية ({VERIFIED_DHIKR_REMINDERS.length} ذكر موثق)
                  </span>
                  <span className="text-[10px] text-[#C4B998] block mt-0.5">
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
                      className="px-2 py-1 rounded-lg bg-[#1F1A10] hover:bg-[#292215] text-[#E6C66E] text-[10px] font-bold border border-[#C8A24A]/45"
                    >
                      تفعيل الكل
                    </button>
                  )}
                  <button
                    onClick={() => setShowDhikrLibrary(!showDhikrLibrary)}
                    className="px-2.5 py-1 rounded-lg bg-[#14120D] hover:bg-[#1E1A12] text-[#F3E5AB] text-[10px] font-bold border border-[#C8A24A]/35"
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
                            ? 'bg-[#18150E] border-[#E6C66E]/60'
                            : 'bg-[#0E0D0A] border-[#C8A24A]/20 opacity-65'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            onClick={() => {
                              const updated = { ...settings };
                              const curIds = updated.dhikrReminder?.selectedDhikrIds || [];
                              let nextIds: string[];
                              if (curIds.length === 0) {
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
                                  ? 'bg-[#E6C66E] border-[#F3E5AB] text-[#070707]'
                                  : 'bg-[#14120D] border-[#C8A24A]/35 text-transparent'
                              }`}
                            >
                              <Check size={11} strokeWidth={3} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-extrabold text-white">{item.title}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#C8A24A]/20 text-[#E6C66E] border border-[#C8A24A]/40 font-bold">
                                  {item.categoryLabel}
                                </span>
                                <span className="text-[9px] text-[#C4B998] font-mono">
                                  {item.durationSeconds} ث
                                </span>
                              </div>
                              <p className="text-xs text-[#F3E5AB] font-quran leading-relaxed mt-1">
                                {item.arabicText}
                              </p>
                              <p className="text-[10px] text-[#C4B998] mt-1 leading-relaxed">
                                {item.fadl}
                              </p>
                            </div>
                          </button>

                          {/* Direct Preview / Test Button for this specific Dhikr */}
                          <button
                            onClick={() => ReminderEngine.testDhikrReminder(item.id)}
                            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#070707] text-[10px] font-extrabold transition-transform active:scale-95 shadow"
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

            {/* Dual Test Buttons */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-[#C8A24A]/20">
              <button
                onClick={() => ReminderEngine.testInAppReminder('dhikr')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#091D3E]/80 hover:bg-[#0E2C5E] text-[#BAE6FD] border border-[#38BDF8]/50 rounded-xl text-xs font-extrabold transition-all active:scale-95 shadow"
                title="معاينة ظهور تنبيه الذكر داخل التطبيق فقط"
              >
                <Eye size={13} className="text-[#38BDF8]" />
                <span>تجربة التذكير الداخلي</span>
              </button>

              <button
                onClick={() => ReminderEngine.testRoyalAtharReminder('dhikr')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-[#E6C66E] via-[#F3E5AB] to-[#B88A2D] text-[#080705] rounded-xl text-xs font-extrabold shadow-[0_2px_12px_rgba(230,198,110,0.3)] hover:brightness-105 active:scale-95 transition-all"
                title="تشغيل إشعار ذكر الله الملكي كاملاً خارج التطبيق عبر Full-Screen Intent و System Overlay"
              >
                <Crown size={13} className="text-[#080705]" />
                <span>تجربة تنبيه الأثر الملكي</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Daily Wird Reminder Card */}
      <div className="relative overflow-hidden athar-card space-y-4">
        <RotatingCardBackground slot="wird" cardOffset={1} intervalMs={26000} opacity={0.18} />
        <div className="relative z-10 flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#1F1B12] border border-[#C8A24A]/45 rounded-xl text-[#E6C66E]">
              <Award size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#F3E5AB]">تذكير الورد القرآني اليومي</h3>
              <p className="text-[11px] text-[#C4B998]">
                تنبيه يومي لمتابعة وردك المحدد من السور والآيات
              </p>
            </div>
          </div>

          {renderToggle(
            Boolean(settings.dailyWirdReminder?.enabled),
            () => {
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
            },
            'تفعيل تذكير الورد اليومي'
          )}
        </div>

        {settings.dailyWirdReminder?.enabled && (
          <div className="relative z-10 space-y-3.5 text-xs text-right">
            {settings.dailyWirdReminder?.frequency === '1m' && (
              <div className="p-2.5 bg-[#241E11] border border-[#E6C66E]/50 rounded-xl text-[11px] text-[#F3E5AB]">
                ⚡ <strong className="text-[#E6C66E]">وضع التجربة السريع (كل دقيقة) نشط:</strong> سيعمل تذكير الورد اليومي ﴿وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا﴾ خلال ثوانٍ ويتكرر كل دقيقة متجاوزاً ساعات الهدوء ونافذة الوقت لتجربته فوراً.
              </div>
            )}

            <div>
              <label className="text-[#C4B998] block mb-1.5 font-bold">تكرار التذكير</label>
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
                        ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] border-[#F3E5AB] text-[#070707] font-extrabold shadow-sm'
                        : 'bg-[#14120D] border-[#C8A24A]/30 text-[#C4B998] hover:border-[#E6C66E]/60 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[#C4B998] block mb-1.5 font-bold">وقت التنبيه بالورد</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-[#14120D] border border-[#C8A24A]/30 rounded-xl flex items-center justify-between">
                  <span className="text-[#C4B998] font-bold">من:</span>
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
                    className="bg-transparent text-[#F3E5AB] font-mono font-bold focus:outline-none"
                  />
                </div>
                <div className="p-2.5 bg-[#14120D] border border-[#C8A24A]/30 rounded-xl flex items-center justify-between">
                  <span className="text-[#C4B998] font-bold">إلى:</span>
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
                    className="bg-transparent text-[#F3E5AB] font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[#C4B998] block mb-1.5 font-bold">سلوك التنبيه</label>
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
                        ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] border-[#F3E5AB] text-[#070707] font-extrabold shadow-sm'
                        : 'bg-[#14120D] border-[#C8A24A]/30 text-[#C4B998] hover:border-[#E6C66E]/60 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dual Test Buttons */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-[#C8A24A]/20">
              <button
                onClick={() => ReminderEngine.testInAppReminder('wird')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#261506]/80 hover:bg-[#3D2109] text-[#FDE68A] border border-[#F59E0B]/50 rounded-xl text-xs font-extrabold transition-all active:scale-95 shadow"
                title="معاينة ظهور تنبيه الورد القرآني داخل التطبيق فقط"
              >
                <Eye size={13} className="text-[#F59E0B]" />
                <span>تجربة التذكير الداخلي</span>
              </button>

              <button
                onClick={() => ReminderEngine.testRoyalAtharReminder('wird')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-[#E6C66E] via-[#F3E5AB] to-[#B88A2D] text-[#080705] rounded-xl text-xs font-extrabold shadow-[0_2px_12px_rgba(230,198,110,0.3)] hover:brightness-105 active:scale-95 transition-all"
                title="تشغيل إشعار الورد الملكي كاملاً خارج التطبيق عبر Full-Screen Intent و System Overlay"
              >
                <Crown size={13} className="text-[#080705]" />
                <span>تجربة تنبيه الأثر الملكي</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3.5. Parents Care & Kinship Reminder Card */}
      <div className="relative overflow-hidden athar-card space-y-4">
        <RotatingCardBackground slot="reminders" cardOffset={2} intervalMs={27000} opacity={0.18} />
        <div className="relative z-10 flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#1F1B12] border border-[#C8A24A]/45 rounded-xl text-[#E6C66E]">
              <Heart size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#F3E5AB]">تذكير بر الوالدين والإحسان إليهما</h3>
              <p className="text-[11px] text-[#C4B998]">
                تنبيه مبارك بتفقد الوالدين والدعاء لهما بصوت الشيخ مشاري العفاسي
              </p>
            </div>
          </div>

          {renderToggle(
            Boolean(settings.parentsReminder?.enabled),
            () => {
              const updated = { ...settings };
              updated.parentsReminder = {
                ...updated.parentsReminder,
                enabled: !updated.parentsReminder?.enabled
              };
              updateSettings(updated);
            },
            'تفعيل تذكير بر الوالدين'
          )}
        </div>

        {settings.parentsReminder?.enabled && (
          <div className="relative z-10 space-y-3.5 text-xs text-right">
            <div className="p-3 bg-[#1B170F] border border-[#C8A24A]/40 rounded-2xl text-center space-y-1">
              <p className="font-quran text-sm text-[#F3E5AB]">
                ﴿وَقَضَىٰ رَبُّكَ أَلَّا تَعْبُدُوا إِلَّا إِيَّاهُ وَبِالْوَالِدَيْنِ إِحْسَانًا﴾
              </p>
              <p className="text-[11px] text-[#C4B998]">
                التلاوة المعتمدة للتنبيه الصوتي: <strong className="text-[#E6C66E]">﴿رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا﴾</strong> · بصوت الشيخ مشاري العفاسي
              </p>
            </div>

            {settings.parentsReminder.frequency === '1m' && (
              <div className="p-2.5 bg-[#241E11] border border-[#E6C66E]/50 rounded-xl text-[11px] text-[#F3E5AB]">
                ⚡ <strong className="text-[#E6C66E]">وضع التجربة السريع (كل دقيقة) نشط:</strong> يعمل التنبيه كل دقيقة متجاوزاً ساعات الهدوء لتجربة الصوت ودور التنبيهات فوراً.
              </div>
            )}

            <div>
              <label className="text-[#C4B998] block mb-1.5 font-bold">تكرار التذكير</label>
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
                        ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] border-[#F3E5AB] text-[#070707] font-extrabold shadow-sm'
                        : 'bg-[#14120D] border-[#C8A24A]/30 text-[#C4B998] hover:border-[#E6C66E]/60 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[#C4B998] block mb-1.5 font-bold">نافذة وقت التذكير</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-[#14120D] border border-[#C8A24A]/30 rounded-xl flex items-center justify-between">
                  <span className="text-[#C4B998] font-bold">من:</span>
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
                    className="bg-transparent text-[#F3E5AB] font-mono font-bold focus:outline-none"
                  />
                </div>
                <div className="p-2.5 bg-[#14120D] border border-[#C8A24A]/30 rounded-xl flex items-center justify-between">
                  <span className="text-[#C4B998] font-bold">إلى:</span>
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
                    className="bg-transparent text-[#F3E5AB] font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[#C4B998] block mb-1.5 font-bold">سلوك التنبيه</label>
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
                        ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] border-[#F3E5AB] text-[#070707] font-extrabold shadow-sm'
                        : 'bg-[#14120D] border-[#C8A24A]/30 text-[#C4B998] hover:border-[#E6C66E]/60 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dual Test Buttons */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-[#C8A24A]/20">
              <button
                onClick={() => ReminderEngine.testInAppReminder('parents')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#290812]/80 hover:bg-[#3D0C1B] text-[#FECDD3] border border-[#F43F5E]/50 rounded-xl text-xs font-extrabold transition-all active:scale-95 shadow"
                title="معاينة ظهور تنبيه بر الوالدين داخل التطبيق فقط"
              >
                <Eye size={13} className="text-[#F43F5E]" />
                <span>تجربة التذكير الداخلي</span>
              </button>

              <button
                onClick={() => ReminderEngine.testRoyalAtharReminder('parents')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-[#E6C66E] via-[#F3E5AB] to-[#B88A2D] text-[#080705] rounded-xl text-xs font-extrabold shadow-[0_2px_12px_rgba(230,198,110,0.3)] hover:brightness-105 active:scale-95 transition-all"
                title="تشغيل إشعار بر الوالدين الملكي كاملاً خارج التطبيق عبر Full-Screen Intent و System Overlay"
              >
                <Crown size={13} className="text-[#080705]" />
                <span>تجربة تنبيه الأثر الملكي</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Complete Adhan, Dua & Iqamah Settings Card */}
      <div className="relative overflow-hidden athar-card space-y-4">
        <RotatingCardBackground slot="kaaba" cardOffset={0} intervalMs={24000} opacity={0.18} />
        <div className="relative z-10 flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#1F1B12] border border-[#C8A24A]/45 rounded-xl text-[#E6C66E]">
              <Volume2 size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#F3E5AB]">الأذان وإقامة الصلاة ودعاء الأذان</h3>
              <p className="text-[11px] text-[#C4B998]">
                نداء الصلاة الدقيق بحسب موقعك مع دعاء الوسيلة والإقامة
              </p>
            </div>
          </div>

          {renderToggle(
            settings.adhanEnabled,
            () => {
              const updated = { ...settings };
              updated.adhanEnabled = !updated.adhanEnabled;
              updateSettings(updated);
            },
            'تفعيل الأذان'
          )}
        </div>

        {settings.adhanEnabled && (
          <div className="relative z-10 space-y-4 text-xs text-right">
            <div>
              <label className="text-[#C4B998] block mb-1.5 font-bold">صوت الأذان المفضل (جودة عالية HQ)</label>
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
                        ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] border-[#F3E5AB] text-[#070707] font-extrabold shadow-sm'
                        : 'bg-[#14120D] border-[#C8A24A]/30 text-[#C4B998] hover:border-[#E6C66E]/60 hover:text-white'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[#C4B998] block mb-1.5 font-bold">مدة تشغيل الأذان</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => {
                    const updated = { ...settings, adhanMode: 'full' as const };
                    updateSettings(updated);
                  }}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    settings.adhanMode !== 'first_two_takbeers'
                      ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] border-[#F3E5AB] text-[#070707] font-extrabold shadow-sm'
                      : 'bg-[#14120D] border-[#C8A24A]/30 text-[#C4B998] hover:border-[#E6C66E]/60 hover:text-white'
                  }`}
                >
                  <span className="block font-extrabold">الأذان كاملاً</span>
                  <span className={`text-[10px] block mt-0.5 ${settings.adhanMode !== 'first_two_takbeers' ? 'text-[#070707]/80 font-bold' : 'text-[#C4B998]'}`}>النداء بالكامل حتى نهايته</span>
                </button>

                <button
                  onClick={() => {
                    const updated = { ...settings, adhanMode: 'first_two_takbeers' as const };
                    updateSettings(updated);
                  }}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    settings.adhanMode === 'first_two_takbeers'
                      ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] border-[#F3E5AB] text-[#070707] font-extrabold shadow-sm'
                      : 'bg-[#14120D] border-[#C8A24A]/30 text-[#C4B998] hover:border-[#E6C66E]/60 hover:text-white'
                  }`}
                >
                  <span className="block font-extrabold">أول تكبيرتين فقط</span>
                  <span className={`text-[10px] block mt-0.5 ${settings.adhanMode === 'first_two_takbeers' ? 'text-[#070707]/80 font-bold' : 'text-[#C4B998]'}`}>تكبيرتان تنبيهاً لدخول الوقت (~20 ث)</span>
                </button>
              </div>
            </div>

            <div className="p-3 bg-[#14120D] border border-[#C8A24A]/30 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[#F3E5AB] font-extrabold block text-xs">دعاء ما بعد الأذان</span>
                <span className="text-[10px] text-[#C4B998] block mt-0.5 leading-relaxed">
                  اللهم رب هذه الدعوة التامة والصلاة القائمة (يشتغل تلقائياً فور انتهاء الأذان)
                </span>
              </div>
              {renderToggle(
                Boolean(settings.duaAfterAdhanEnabled),
                () => {
                  const updated = { ...settings, duaAfterAdhanEnabled: !settings.duaAfterAdhanEnabled };
                  updateSettings(updated);
                },
                'دعاء ما بعد الأذان'
              )}
            </div>

            <div className="p-3 bg-[#14120D] border border-[#C8A24A]/30 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[#F3E5AB] font-extrabold block text-xs">تنبيه وصوت إقامة الصلاة</span>
                <span className="text-[10px] text-[#C4B998] block mt-0.5 leading-relaxed">
                  قد قامت الصلاة (بعد الأذان بـ 15 دقيقة، والمغرب بعد 5 دقائق)
                </span>
              </div>
              {renderToggle(
                Boolean(settings.iqamahSettings?.enabled),
                () => {
                  const updated = {
                    ...settings,
                    iqamahSettings: {
                      ...settings.iqamahSettings,
                      enabled: !settings.iqamahSettings?.enabled
                    }
                  };
                  updateSettings(updated);
                },
                'تنبيه وصوت إقامة الصلاة'
              )}
            </div>

            <div className="pt-2 border-t border-[#C8A24A]/25 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#F3E5AB]">
                  معاينة شاشة الأذان الملكية الكاملة (فوق أي شاشة وبمشهد كل صلاة):
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { id: 'fajr', label: 'الفجر' },
                  { id: 'dhuhr', label: 'الظهر' },
                  { id: 'asr', label: 'العصر' },
                  { id: 'maghrib', label: 'المغرب' },
                  { id: 'isha', label: 'العشاء' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() =>
                      ReminderEngine.testAdhan(
                        settings.adhanVoice,
                        settings.adhanMode,
                        p.id as any
                      )
                    }
                    className="py-2 px-1.5 rounded-xl bg-gradient-to-b from-[#231D11] to-[#15120B] hover:from-[#E6C66E] hover:to-[#B88A2D] text-[#E6C66E] hover:text-[#070707] border border-[#C8A24A]/45 text-[11px] font-extrabold transition-all active:scale-95 text-center shadow-sm"
                  >
                    أذان {p.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 justify-end pt-1">
                <button
                  onClick={() => {
                    const live = LiveActivityService.getState();
                    const curKey = live.currentPrayerId !== 'sunrise' ? live.currentPrayerId : 'fajr';
                    ReminderEngine.testAdhan(settings.adhanVoice, settings.adhanMode, curKey as any);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-l from-[#E6C66E] to-[#B88A2D] text-[#070707] border border-[#FFF2C2] rounded-xl text-xs font-extrabold transition-all active:scale-95 shadow"
                >
                  <Play size={12} fill="currentColor" />
                  <span>تشغيل شاشة الأذان الملكية الآن</span>
                </button>

                <button
                  onClick={() => ReminderEngine.testDuaAfterAdhan()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1F1A10] hover:bg-[#292215] text-[#E6C66E] border border-[#C8A24A]/45 rounded-xl text-xs font-extrabold transition-all active:scale-95 shadow"
                >
                  <Play size={12} fill="currentColor" />
                  <span>اختبار دعاء الأذان</span>
                </button>

                <button
                  onClick={() => ReminderEngine.testIqamah()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1F1A10] hover:bg-[#292215] text-[#E6C66E] border border-[#C8A24A]/45 rounded-xl text-xs font-extrabold transition-all active:scale-95 shadow"
                >
                  <Play size={12} fill="currentColor" />
                  <span>اختبار الإقامة</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Daily Ayah & Hadith Auto Rotation Card */}
      <div className="relative overflow-hidden athar-card space-y-4">
        <RotatingCardBackground slot="hadith" cardOffset={1} intervalMs={27000} opacity={0.18} />
        <div className="relative z-10 flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#1F1B12] border border-[#C8A24A]/45 rounded-xl text-[#E6C66E]">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#F3E5AB]">تجدد الآية اليومية والحديث الشريف</h3>
              <p className="text-[11px] text-[#C4B998]">
                جدولة تحديث الآية والحديث النبوي في الصفحة الرئيسية تلقائياً
              </p>
            </div>
          </div>

          {renderToggle(
            Boolean(settings.dailyContentSettings?.autoRotate),
            () => {
              const updated = {
                ...settings,
                dailyContentSettings: {
                  ...settings.dailyContentSettings,
                  autoRotate: !settings.dailyContentSettings?.autoRotate
                }
              };
              updateSettings(updated);
            },
            'تفعيل تجدد الآية والحديث'
          )}
        </div>

        {settings.dailyContentSettings?.autoRotate && (
          <div className="relative z-10 space-y-3.5 text-xs text-right">
            <div>
              <label className="text-[#C4B998] block mb-1.5 font-bold">معدل التحديث التلقائي</label>
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
                        ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] border-[#F3E5AB] text-[#070707] font-extrabold shadow-sm'
                        : 'bg-[#14120D] border-[#C8A24A]/30 text-[#C4B998] hover:border-[#E6C66E]/60 hover:text-white'
                    }`}
                  >
                    {freq.label}
                  </button>
                ))}
              </div>
            </div>

            {(settings.dailyContentSettings?.rotationFrequency || 'daily') === 'daily' && (
              <div className="space-y-2">
                <label className="text-[#C4B998] block font-bold">وقت التجديد المفضل</label>
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
                          ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] border-[#F3E5AB] text-[#070707] font-extrabold shadow-sm'
                          : 'bg-[#14120D] border-[#C8A24A]/30 text-[#C4B998] hover:border-[#E6C66E]/60 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="p-2.5 bg-[#14120D] border border-[#C8A24A]/30 rounded-xl flex items-center justify-between">
                  <span className="text-[#C4B998] text-xs font-bold">أو حدد ساعة مخصصة للتجديد:</span>
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
                    className="bg-[#0B0A08] px-2.5 py-1 rounded-lg text-[#E6C66E] font-mono text-xs focus:outline-none font-bold border border-[#C8A24A]/40"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. Quiet Hours Card */}
      <div className="relative overflow-hidden athar-card space-y-3">
        <RotatingCardBackground slot="reminders" cardOffset={3} intervalMs={30000} opacity={0.18} />
        <div className="relative z-10 flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#1F1B12] border border-[#C8A24A]/45 rounded-xl text-[#E6C66E]">
              <Moon size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#F3E5AB]">ساعات الهدوء (عدم الإزعاج)</h3>
              <p className="text-[11px] text-[#C4B998]">
                إيقاف التذكيرات العامة تلقائياً أثناء ساعات نومك
              </p>
            </div>
          </div>

          {renderToggle(
            settings.quietHours.enabled,
            () => {
              const updated = { ...settings };
              updated.quietHours.enabled = !updated.quietHours.enabled;
              updateSettings(updated);
            },
            'تفعيل ساعات الهدوء'
          )}
        </div>

        {settings.quietHours.enabled && (
          <div className="relative z-10 grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-[#14120D] border border-[#C8A24A]/30 rounded-xl flex items-center justify-between">
              <span className="text-[#C4B998] font-bold">تبدأ من:</span>
              <input
                type="time"
                value={settings.quietHours.startTime}
                onChange={(e) => {
                  const updated = { ...settings };
                  updated.quietHours.startTime = e.target.value;
                  updateSettings(updated);
                }}
                className="bg-transparent text-[#F3E5AB] font-mono font-bold focus:outline-none"
              />
            </div>
            <div className="p-2.5 bg-[#14120D] border border-[#C8A24A]/30 rounded-xl flex items-center justify-between">
              <span className="text-[#C4B998] font-bold">تنتهي في:</span>
              <input
                type="time"
                value={settings.quietHours.endTime}
                onChange={(e) => {
                  const updated = { ...settings };
                  updated.quietHours.endTime = e.target.value;
                  updateSettings(updated);
                }}
                className="bg-transparent text-[#F3E5AB] font-mono font-bold focus:outline-none"
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
            className="w-full athar-btn-primary py-3 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg"
          >
            <Check size={16} />
            <span>حفظ الإعدادات والخروج</span>
          </button>
        </div>
      )}
    </div>
  );
};
