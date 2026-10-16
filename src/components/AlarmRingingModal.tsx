import React, { useState, useEffect } from 'react';
import {
  AlarmService,
  ActiveRingingAlarmState,
  FAITH_WAKEUP_CHALLENGES,
  FaithWakeUpChallenge,
} from '../services/alarmService';
import { ReminderEngine } from '../services/reminderService';
import {
  BellRing,
  Volume2,
  CheckCircle2,
  Sparkles,
  Moon,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export const AlarmRingingModal: React.FC = () => {
  const [ringingState, setRingingState] = useState<ActiveRingingAlarmState | null>(null);
  const [dhikrTapCount, setDhikrTapCount] = useState<number>(0);
  const [challenge, setChallenge] = useState<FaithWakeUpChallenge>(FAITH_WAKEUP_CHALLENGES[0]);
  const [wrongOption, setWrongOption] = useState<string | null>(null);
  const [snoozeToast, setSnoozeToast] = useState<string | null>(null);
  const [nowTimeStr, setNowTimeStr] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      setNowTimeStr(AlarmService.formatTime12Arabic(`${hh}:${mm}`));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);

    const unsub = AlarmService.subscribeRinging((state) => {
      setRingingState(state);
      if (state) {
        setDhikrTapCount(0);
        setWrongOption(null);
        const randomIdx = Math.floor(Math.random() * FAITH_WAKEUP_CHALLENGES.length);
        setChallenge(FAITH_WAKEUP_CHALLENGES[randomIdx]);
      }
    });

    const unsubAdhan = ReminderEngine.subscribeAdhanScreen((adhan) => {
      if (adhan) {
        AlarmService.dismissActiveAlarm();
        setRingingState(null);
      }
    });

    return () => {
      clearInterval(timer);
      unsub();
      unsubAdhan();
    };
  }, []);

  if (ReminderEngine.hasActiveAdhanScreen()) return null;
  if (!ringingState && !snoozeToast) return null;

  if (!ringingState && snoozeToast) {
    return (
      <div className="fixed top-14 inset-x-4 z-[120] flex justify-center pointer-events-none animate-fadeIn">
        <div className="px-4 py-3 rounded-2xl bg-[#1A160D] border border-[#E6C66E] text-[#F3E5AB] text-xs font-extrabold shadow-2xl flex items-center gap-2">
          <Clock size={16} className="text-[#E6C66E]" />
          <span>{snoozeToast}</span>
        </div>
      </div>
    );
  }

  if (!ringingState) return null;

  const { alarm, currentVolumePercent, loopCount, isPreview } = ringingState;
  const soundObj = AlarmService.getSoundById(alarm.soundId);
  const sysSettings = AlarmService.getSystemSettings();

  const handleSnooze = () => {
    const mins = AlarmService.snoozeActiveAlarm();
    setSnoozeToast(`تم تفعيل الغفوة — سيرن المنبه مجدداً بعد ${mins} دقائق`);
    setTimeout(() => setSnoozeToast(null), 4000);
  };

  const handleDhikrTap = () => {
    const next = dhikrTapCount + 1;
    setDhikrTapCount(next);
    if (next >= 3) {
      setTimeout(() => {
        AlarmService.dismissActiveAlarm();
      }, 250);
    }
  };

  const handleSelectAnswer = (option: string) => {
    if (option === challenge.correctAnswer) {
      AlarmService.dismissActiveAlarm();
    } else {
      setWrongOption(option);
      setTimeout(() => setWrongOption(null), 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-[#070707]/96 backdrop-blur-xl flex flex-col items-center justify-between p-5 text-right font-arabic animate-fadeIn overflow-y-auto">
      {/* Ambient Radial Golden Dawn Glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(230,198,110,0.22),transparent_65%)]" />

      {/* Top Status Pill */}
      <div className="relative z-10 w-full max-w-md flex items-center justify-between pt-2">
        <div className="px-3 py-1.5 rounded-full bg-[#1C170D] border border-[#C8A24A]/50 flex items-center gap-2 text-[11px] font-extrabold text-[#E6C66E]">
          <Volume2 size={14} className="animate-pulse" />
          <span>تكرار متصل (#{loopCount})</span>
          <span className="text-[#C4B998]">•</span>
          <span className="tabular-nums">الصوت {currentVolumePercent}%</span>
        </div>

        {isPreview && (
          <button
            onClick={() => AlarmService.dismissActiveAlarm()}
            className="px-3 py-1.5 rounded-full bg-[#241E12] border border-[#E6C66E]/60 text-xs font-extrabold text-[#F3E5AB]"
          >
            إنهاء المعاينة ✕
          </button>
        )}
      </div>

      {/* Center Clock & Spiritual Call */}
      <div className="relative z-10 w-full max-w-md my-auto py-4 space-y-5 text-center">
        {/* Pulsing Golden Alarm Emblem */}
        <div className="relative mx-auto w-24 h-24 rounded-full bg-gradient-to-b from-[#2A2212] to-[#120F09] border-2 border-[#E6C66E] flex items-center justify-center shadow-[0_0_45px_rgba(230,198,110,0.4)]">
          <div className="absolute inset-0 rounded-full border border-[#E6C66E]/50 animate-ping opacity-35" />
          <BellRing size={40} className="text-[#E6C66E] animate-bounce" />
        </div>

        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C8A24A]/15 border border-[#C8A24A]/40 text-xs font-extrabold text-[#E6C66E]">
            <Moon size={13} />
            <span>{alarm.title}</span>
          </span>
          <div className="text-4xl sm:text-5xl font-extrabold text-white tracking-wider tabular-nums pt-1">
            {nowTimeStr || AlarmService.formatTime12Arabic(alarm.time)}
          </div>
          <p className="text-xs font-bold text-[#C4B998]">{soundObj.title}</p>
        </div>

        {/* Spiritual Wake-Up Banner */}
        <div className="p-4 rounded-3xl bg-gradient-to-b from-[#1A160D] to-[#0E0C08] border border-[#C8A24A]/50 shadow-xl space-y-2">
          <p className="font-quran text-xl sm:text-2xl text-[#F3E5AB] leading-relaxed">
            «الصَّلَاةُ خَيْرٌ مِّنَ النَّوْمِ»
          </p>
          <p className="text-xs text-[#C4B998] leading-relaxed">
            «الحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَمَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ»
          </p>
        </div>

        {/* DISMISS METHOD 1: Direct Stop Button */}
        {alarm.dismissMethod === 'direct' && (
          <div className="space-y-3 pt-2">
            <button
              onClick={() => AlarmService.dismissActiveAlarm()}
              className="w-full min-h-[54px] py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#E6C66E] via-[#C8A24A] to-[#B88A2D] text-[#070707] font-extrabold text-base shadow-[0_8px_28px_rgba(200,162,74,0.45)] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <CheckCircle2 size={20} />
              <span>استيقظتُ الحمد لله — إيقاف المنبه</span>
            </button>
          </div>
        )}

        {/* DISMISS METHOD 2: Tap Wake-Up Dhikr 3 Times */}
        {alarm.dismissMethod === 'dhikr_tap' && (
          <div className="p-4 rounded-3xl bg-[#12100B] border border-[#E6C66E]/55 space-y-3 text-center">
            <div className="flex items-center justify-between text-xs font-extrabold text-[#E6C66E]">
              <span className="flex items-center gap-1.5">
                <Sparkles size={14} />
                <span>تأكيد الاستيقاظ بذكر الله</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#C8A24A]/20 border border-[#C8A24A]/45 tabular-nums">
                {dhikrTapCount} / 3
              </span>
            </div>

            <p className="text-xs text-[#C4B998]">
              اضغط 3 مرات على ذكر الاستيقاظ لإيقاف المنبه:
            </p>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-[#1E1A11] overflow-hidden border border-[#C8A24A]/25">
              <div
                className="h-full bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] transition-all duration-300"
                style={{ width: `${Math.min(100, (dhikrTapCount / 3) * 100)}%` }}
              />
            </div>

            <button
              onClick={handleDhikrTap}
              className="w-full min-h-[56px] py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-[#070707] font-extrabold text-sm shadow-[0_6px_24px_rgba(200,162,74,0.4)] active:scale-95 transition-transform"
            >
              «الحمد لله الذي أحيانا بعدما أماتنا وإليه النشور» ({3 - dhikrTapCount} متبقية)
            </button>
          </div>
        )}

        {/* DISMISS METHOD 3: Faith Question / Complete Short Ayah */}
        {alarm.dismissMethod === 'faith_question' && (
          <div className="p-4 rounded-3xl bg-[#12100B] border border-[#E6C66E]/55 space-y-3 text-right">
            <div className="flex items-center justify-between text-xs font-extrabold text-[#E6C66E]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={15} />
                <span>تنشيط الذهن لإيقاف المنبه</span>
              </span>
              <span className="text-[11px] text-[#C4B998]">اختر التكملة الصحيحة</span>
            </div>

            <p className="text-xs font-bold text-white">{challenge.question}</p>
            <div className="p-3 rounded-2xl bg-[#090806] border border-[#C8A24A]/35 text-center font-quran text-lg text-[#F3E5AB] leading-relaxed">
              {challenge.verseOrPrompt}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {challenge.options.map((opt) => {
                const isWrong = wrongOption === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => handleSelectAnswer(opt)}
                    className={`min-h-[48px] py-2.5 px-2 rounded-xl font-extrabold text-sm border transition-all ${
                      isWrong
                        ? 'bg-red-950/80 border-red-500 text-red-200'
                        : 'bg-[#1C1810] hover:bg-[#C8A24A] text-[#F3E5AB] hover:text-[#070707] border-[#C8A24A]/50'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {wrongOption && (
              <p className="text-[11px] text-red-300 text-center font-bold">
                حاول مرة أخرى لإيقاف المنبه
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bottom Snooze Action Bar */}
      <div className="relative z-10 w-full max-w-md pb-2 space-y-2">
        <button
          onClick={handleSnooze}
          className="w-full min-h-[46px] py-2.5 px-4 rounded-2xl bg-[#16130D] hover:bg-[#221D13] border border-[#C8A24A]/40 text-[#E6C66E] text-xs font-extrabold flex items-center justify-center gap-2 transition-colors"
        >
          <Clock size={15} />
          <span>غفوة لمدة {sysSettings.snoozeMinutes} دقائق</span>
        </button>
      </div>
    </div>
  );
};
