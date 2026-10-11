import React, { useState, useEffect } from 'react';
import { AppSettings, Coordinates } from '../types';
import { StorageService } from '../services/storageService';
import { NotificationService } from '../services/notificationService';
import { ReminderEngine } from '../services/reminderService';
import { VERIFIED_RECITERS } from '../data/surahsData';
import {
  Settings as SettingsIcon,
  Volume2,
  Trash2,
  Check,
  BookOpen,
  Bell,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Download,
  Upload,
  ChevronLeft,
  Mic,
  Sparkles
} from 'lucide-react';
import { VoiceAssistant, VoiceAssistantSettings } from '../services/voiceAssistantService';

interface SettingsViewProps {
  onOpenCodeInspector?: () => void;
  onOpenRemindersCenter: () => void;
  onOpenVoiceAssistant?: () => void;
  onLocationChange: (coords: Coordinates) => void;
}

type SettingsTabId = 'all' | 'voice_a11y' | 'adhan_notifications' | 'quran' | 'system';

export const SettingsView: React.FC<SettingsViewProps> = ({
  onOpenRemindersCenter,
  onOpenVoiceAssistant
}) => {
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());
  const [voiceSettings, setVoiceSettings] = useState<VoiceAssistantSettings>(VoiceAssistant.getSettings());
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    NotificationService.getPermissionStatus()
  );
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [delayedTestCountdown, setDelayedTestCountdown] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<SettingsTabId>('all');
  const [micStatus, setMicStatus] = useState<'granted' | 'prompt' | 'denied'>('prompt');

  useEffect(() => {
    setSettings(StorageService.getSettings());
    setNotificationPermission(NotificationService.getPermissionStatus());
    VoiceAssistant.checkMicrophonePermission().then((s) => {
      if (s === 'granted') setMicStatus('granted');
      else if (s === 'denied') setMicStatus('denied');
    });
    const unsubPerm = NotificationService.subscribePermission((perm) => {
      setNotificationPermission(perm);
    });
    const unsubVoice = VoiceAssistant.subscribe((vs) => {
      setVoiceSettings(vs);
    });
    return () => {
      unsubPerm();
      unsubVoice();
    };
  }, []);

  const saveSettings = (updated: AppSettings, msg?: string) => {
    setSettings(updated);
    StorageService.saveSettings(updated);
    ReminderEngine.restart();
    if (msg) {
      setSaveBanner(msg);
      setTimeout(() => setSaveBanner(null), 3000);
    }
  };

  const handleRequestNotifications = async () => {
    const perm = await NotificationService.requestPermission();
    setNotificationPermission(perm);
    setSaveBanner('تم تفعيل صلاحية إشعارات النظام وشاشة القفل بنجاح ✓');
    setTimeout(() => setSaveBanner(null), 4000);
    NotificationService.notify({
      title: 'تم تفعيل إشعارات أثر بنجاح ✓',
      body: 'ستصلك مواقيت الصلاة والأذان وتذكيرات القرآن وذكر الله داخل وخارج البرنامج وحتى لو الشاشة مقفلة.',
      type: 'info'
    });
  };

  const handleTestSystemNotification = () => {
    ReminderEngine.testDhikrReminder();
  };

  const handleTestBackgroundOutsideApp = () => {
    if (delayedTestCountdown > 0) return;
    setDelayedTestCountdown(5);
    const interval = window.setInterval(() => {
      setDelayedTestCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    window.setTimeout(() => {
      ReminderEngine.testQuranVerseReminder();
    }, 5000);
  };

  const selectedReciter = VERIFIED_RECITERS.find((r) => r.id === settings.selectedReciterId) || VERIFIED_RECITERS[0];

  const showSection = (sectionTab: SettingsTabId) => activeTab === 'all' || activeTab === sectionTab;

  return (
    <div className="athar-page-container animate-fadeIn">
      {/* Simple Top Page Title */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#C8A24A]/25">
        <div className="flex items-center gap-2">
          <SettingsIcon size={20} className="text-[#E6C66E]" />
          <h1 className="text-lg font-extrabold text-white tracking-wide">
            الإعدادات
          </h1>
        </div>
      </div>

      {/* Luxury Gold Category Filter Tabs (Without Islamic Backgrounds/Appearance Tab) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1.5 bg-[#0E0D0A] border border-[#C8A24A]/35 rounded-2xl text-[11px]">
        {[
          { id: 'all', label: 'الكل' },
          { id: 'voice_a11y', label: 'الصوت والهمم' },
          { id: 'adhan_notifications', label: 'التنبيهات' },
          { id: 'quran', label: 'المصحف' },
          { id: 'system', label: 'النسخ والأذونات' }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTabId)}
              className={`py-2 px-2 rounded-xl font-extrabold text-center transition-all border ${
                isActive
                  ? 'bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-[#070707] border-[#F3E5AB] shadow-[0_4px_14px_rgba(200,162,74,0.35)]'
                  : 'text-[#C4B998] border-transparent hover:bg-[#171510] hover:text-white hover:border-[#C8A24A]/30'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SECTION 0: Voice Assistant & Interactive Speech System */}
      {showSection('voice_a11y') && (
        <div className="space-y-3.5">
          <div className="athar-card relative overflow-hidden space-y-3.5">
            <div className="relative z-10 flex items-center justify-between gap-2 pb-3 border-b border-[#C8A24A]/25">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2.5 rounded-xl border ${
                    voiceSettings.enabled
                      ? 'bg-[#262012] border-[#E6C66E]/60 text-[#E6C66E]'
                      : 'bg-[#161410] border-[#C8A24A]/25 text-[#9E9478]'
                  }`}
                >
                  <Mic size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2 flex-wrap">
                    <span>المساعد الصوتي ونظام النطق التفاعلي</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold border ${
                        voiceSettings.enabled
                          ? 'bg-[#C8A24A]/20 text-[#E6C66E] border-[#E6C66E]/50'
                          : 'bg-[#15130F] text-[#9E9478] border-[#C8A24A]/20'
                      }`}
                    >
                      {voiceSettings.enabled ? 'مفعّل ونشط ✓' : 'متوقف'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#C4B998] mt-0.5 leading-relaxed">
                    لا يظهر زر الميكروفون ولا يعمل النظام الصوتي إلا عند تفعيله من هنا حسب رغبتك
                  </p>
                </div>
              </div>
              {voiceSettings.enabled && onOpenVoiceAssistant && (
                <button
                  onClick={onOpenVoiceAssistant}
                  className="athar-btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5 shrink-0"
                  aria-label="تجربة المساعد الصوتي الآن"
                >
                  <Mic size={14} />
                  <span>تحدث الآن</span>
                </button>
              )}
            </div>

            <div className="relative z-10 space-y-2.5 text-xs">
              {/* Master Toggle */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                  voiceSettings.enabled
                    ? 'bg-gradient-to-r from-[#211C11] to-[#13110B] border-[#E6C66E]/55'
                    : 'bg-[#0D0C09] border-[#C8A24A]/25'
                }`}
              >
                <div>
                  <span className="text-white font-extrabold block text-xs">
                    تفعيل نظام المساعد الصوتي وإظهار زر الميكروفون المتحرك
                  </span>
                  <span className="text-[11px] text-[#C4B998] block mt-0.5 leading-relaxed">
                    {voiceSettings.enabled
                      ? 'النظام الصوتي نشط الآن، ويمكنك تحريك علامة الميكروفون لأي مكان في الشاشة وسيتم حفظ مكانها تلقائياً.'
                      : 'النظام الصوتي متوقف حالياً وعلامة الميكروفون مخفية تماماً من الشاشة.'}
                  </span>
                </div>
                <button
                  onClick={async () => {
                    const nextEnabled = !voiceSettings.enabled;
                    if (nextEnabled) {
                      const ok = await VoiceAssistant.requestMicrophonePermission();
                      if (ok) setMicStatus('granted');
                    }
                    const updated = { ...voiceSettings, enabled: nextEnabled };
                    setVoiceSettings(updated);
                    VoiceAssistant.saveSettings(updated);
                    setSaveBanner(
                      nextEnabled
                        ? 'تم تفعيل المساعد الصوتي وإظهار زر الميكروفون المتحرك ✓'
                        : 'تم إيقاف المساعد الصوتي وإخفاء زر الميكروفون من الشاشة'
                    );
                    setTimeout(() => setSaveBanner(null), 3000);
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border ${
                    voiceSettings.enabled
                      ? 'bg-[#C8A24A] border-[#F3E5AB]'
                      : 'bg-[#1B1812] border-[#C8A24A]/35'
                  }`}
                  aria-label="تفعيل أو إيقاف نظام المساعد الصوتي وإظهار زر الميكروفون"
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                      voiceSettings.enabled ? '-translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {voiceSettings.enabled && (
                <div className="space-y-2.5 pt-1 animate-fadeIn">
                  {/* Option 1: Auto Speak Responses */}
                  <div className="p-3 bg-[#0D0C09] border border-[#C8A24A]/25 rounded-2xl flex items-center justify-between gap-2">
                    <div>
                      <span className="text-white font-bold block">نطق الردود صوتياً (Text-to-Speech)</span>
                      <span className="text-[10px] text-[#C4B998] block mt-0.5">
                        يقوم التطبيق بنطق نتائج الصلاة، الأذكار، والسور بصوت عربي واضح ومسموع
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const updated = { ...voiceSettings, autoSpeak: !voiceSettings.autoSpeak };
                        setVoiceSettings(updated);
                        VoiceAssistant.saveSettings(updated);
                      }}
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border ${
                        voiceSettings.autoSpeak
                          ? 'bg-[#C8A24A] border-[#F3E5AB]'
                          : 'bg-[#1B1812] border-[#C8A24A]/35'
                      }`}
                      aria-label="تبديل نطق الردود صوتياً"
                    >
                      <div
                        className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                          voiceSettings.autoSpeak ? '-translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Option 2: Auto-Listen on App Open */}
                  <div className="p-3 bg-[#0D0C09] border border-[#C8A24A]/25 rounded-2xl flex items-center justify-between gap-2">
                    <div>
                      <span className="text-white font-bold block">الاستماع التلقائي عند فتح التطبيق</span>
                      <span className="text-[10px] text-[#C4B998] block mt-0.5">
                        يفتح المساعد الصوتي تلقائياً بمجرد فتح التطبيق (مفيد لمكفوفي البصر وذوي الهمم)
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const updated = {
                          ...voiceSettings,
                          autoListenOnAppOpen: !voiceSettings.autoListenOnAppOpen
                        };
                        setVoiceSettings(updated);
                        VoiceAssistant.saveSettings(updated);
                      }}
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border ${
                        voiceSettings.autoListenOnAppOpen
                          ? 'bg-[#C8A24A] border-[#F3E5AB]'
                          : 'bg-[#1B1812] border-[#C8A24A]/35'
                      }`}
                      aria-label="تبديل الاستماع التلقائي عند فتح التطبيق"
                    >
                      <div
                        className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                          voiceSettings.autoListenOnAppOpen ? '-translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Option 3: Sound Chimes (Earcons) */}
                  <div className="p-3 bg-[#0D0C09] border border-[#C8A24A]/25 rounded-2xl flex items-center justify-between gap-2">
                    <div>
                      <span className="text-white font-bold block">الإشارات الصوتية النغمية (Earcons)</span>
                      <span className="text-[10px] text-[#C4B998] block mt-0.5">
                        نغمات مسموعة تؤكد لحظة بدء وانتهاء الاستماع وتنفيذ الأمر بنجاح
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const updated = { ...voiceSettings, soundChimes: !voiceSettings.soundChimes };
                        setVoiceSettings(updated);
                        VoiceAssistant.saveSettings(updated);
                      }}
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border ${
                        voiceSettings.soundChimes
                          ? 'bg-[#C8A24A] border-[#F3E5AB]'
                          : 'bg-[#1B1812] border-[#C8A24A]/35'
                      }`}
                      aria-label="تبديل الإشارات الصوتية النغمية"
                    >
                      <div
                        className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                          voiceSettings.soundChimes ? '-translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Option 4: Speech Rate Selector */}
                  <div className="p-3 bg-[#0D0C09] border border-[#C8A24A]/25 rounded-2xl flex items-center justify-between gap-2">
                    <div>
                      <span className="text-white font-bold block">سرعة النطق التفاعلي</span>
                      <span className="text-[10px] text-[#C4B998] block mt-0.5">
                        السرعة الحالية: {voiceSettings.speechRate}x
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {[0.85, 1.0, 1.15].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => {
                            const updated = { ...voiceSettings, speechRate: rate };
                            setVoiceSettings(updated);
                            VoiceAssistant.saveSettings(updated);
                          }}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold transition-all border ${
                            voiceSettings.speechRate === rate
                              ? 'bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-[#070707] border-[#F3E5AB] shadow'
                              : 'bg-[#171510] text-[#C4B998] border-[#C8A24A]/30 hover:text-white'
                          }`}
                        >
                          {rate === 0.85 ? 'هادئ' : rate === 1.0 ? 'طبيعي' : 'سريع'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Option 5: Floating Microphone Button Position & Reset */}
                  <div className="p-3 bg-[#0D0C09] border border-[#C8A24A]/25 rounded-2xl flex items-center justify-between gap-2">
                    <div>
                      <span className="text-white font-bold block">موضع علامة الميكروفون العائمة</span>
                      <span className="text-[10px] text-[#C4B998] block mt-0.5">
                        اسحب زر الميكروفون لأي مكان تريده على الشاشة وسيبقى محفوظاً تلقائياً
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const updated = { ...voiceSettings, floatingButtonPosition: null };
                        setVoiceSettings(updated);
                        VoiceAssistant.saveSettings(updated);
                        setSaveBanner('تمت استعادة الموضع الافتراضي لزر الميكروفون ✓');
                        setTimeout(() => setSaveBanner(null), 2500);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#18150E] hover:bg-[#241F14] text-[#E6C66E] border border-[#C8A24A]/45 text-[10px] font-extrabold shrink-0 transition-colors"
                    >
                      إعادة للموضع الافتراضي
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: Daily Reminders Center */}
      {showSection('adhan_notifications') && (
        <div className="space-y-3.5">
          <div className="athar-card relative overflow-hidden space-y-3.5">
            <div className="relative z-10 flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#262012] border border-[#C8A24A]/50 text-[#E6C66E]">
                  <Bell size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">تنبيهات ونفحات اليوم المبارك</h3>
                  <p className="text-[11px] text-[#C4B998] mt-0.5">
                    جدولة مواعيد الأذكار وتلاوة الآيات والورد اليومي
                  </p>
                </div>
              </div>

              <button
                onClick={onOpenRemindersCenter}
                className="px-3 py-1.5 bg-[#241E11] hover:bg-[#302716] text-[#E6C66E] border border-[#C8A24A]/50 rounded-xl text-[11px] font-extrabold flex items-center gap-1 transition-all shrink-0"
                title="فتح مركز التذكيرات لتعديل الساعات والدقائق"
              >
                <span>ضبط المواعيد</span>
                <ChevronLeft size={13} />
              </button>
            </div>

            <div className="relative z-10 space-y-2.5 text-xs">
              {/* Reminder 1: Quran Verse */}
              <div className="p-3 bg-[#0D0C09] border border-[#C8A24A]/25 rounded-2xl flex items-center justify-between gap-2">
                <div>
                  <span className="text-white font-bold block">تذكير آية القرآن اليومية</span>
                  <span className="text-[10px] text-[#C4B998] block mt-0.5">
                    {settings.quranVerseReminder.enabled
                      ? `مفعّل (${settings.quranVerseReminder.startTime} - ${settings.quranVerseReminder.endTime})`
                      : 'متوقف'}
                  </span>
                </div>
                <button
                  onClick={() =>
                    saveSettings(
                      {
                        ...settings,
                        quranVerseReminder: {
                          ...settings.quranVerseReminder,
                          enabled: !settings.quranVerseReminder.enabled
                        }
                      },
                      !settings.quranVerseReminder.enabled
                        ? 'تم تفعيل تذكير آية القرآن ✓'
                        : 'تم إيقاف تذكير آية القرآن'
                    )
                  }
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border ${
                    settings.quranVerseReminder.enabled
                      ? 'bg-[#C8A24A] border-[#F3E5AB]'
                      : 'bg-[#1B1812] border-[#C8A24A]/35'
                  }`}
                  aria-label="تبديل تفعيل تذكير آية القرآن"
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                      settings.quranVerseReminder.enabled ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Reminder 2: Morning & Evening Adhkar */}
              <div className="p-3 bg-[#0D0C09] border border-[#C8A24A]/25 rounded-2xl flex items-center justify-between gap-2">
                <div>
                  <span className="text-white font-bold block">تذكيرات أذكار الصباح والمساء</span>
                  <span className="text-[10px] text-[#C4B998] block mt-0.5">
                    {settings.dhikrReminder.enabled
                      ? `مفعّل (${settings.dhikrReminder.frequency === '1h' ? 'كل ساعة' : 'فترات دورية'})`
                      : 'متوقف'}
                  </span>
                </div>
                <button
                  onClick={() =>
                    saveSettings(
                      {
                        ...settings,
                        dhikrReminder: {
                          ...settings.dhikrReminder,
                          enabled: !settings.dhikrReminder.enabled
                        }
                      },
                      !settings.dhikrReminder.enabled
                        ? 'تم تفعيل تذكيرات الأذكار ✓'
                        : 'تم إيقاف تذكيرات الأذكار'
                    )
                  }
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border ${
                    settings.dhikrReminder.enabled
                      ? 'bg-[#C8A24A] border-[#F3E5AB]'
                      : 'bg-[#1B1812] border-[#C8A24A]/35'
                  }`}
                  aria-label="تبديل تفعيل تذكيرات الأذكار"
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                      settings.dhikrReminder.enabled ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Reminder 3: Daily Wird */}
              <div className="p-3 bg-[#0D0C09] border border-[#C8A24A]/25 rounded-2xl flex items-center justify-between gap-2">
                <div>
                  <span className="text-white font-bold block">تذكير الورد القرآني اليومي</span>
                  <span className="text-[10px] text-[#C4B998] block mt-0.5">
                    {settings.dailyWirdReminder.enabled
                      ? `مفعّل (يبدأ ${settings.dailyWirdReminder.startTime})`
                      : 'متوقف'}
                  </span>
                </div>
                <button
                  onClick={() =>
                    saveSettings(
                      {
                        ...settings,
                        dailyWirdReminder: {
                          ...settings.dailyWirdReminder,
                          enabled: !settings.dailyWirdReminder.enabled
                        }
                      },
                      !settings.dailyWirdReminder.enabled
                        ? 'تم تفعيل تذكير الورد اليومي ✓'
                        : 'تم إيقاف تذكير الورد اليومي'
                    )
                  }
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border ${
                    settings.dailyWirdReminder.enabled
                      ? 'bg-[#C8A24A] border-[#F3E5AB]'
                      : 'bg-[#1B1812] border-[#C8A24A]/35'
                  }`}
                  aria-label="تبديل تفعيل تذكير الورد اليومي"
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                      settings.dailyWirdReminder.enabled ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Reminder 4: Dua After Adhan */}
              <div className="p-3 bg-[#0D0C09] border border-[#C8A24A]/25 rounded-2xl flex items-center justify-between gap-2">
                <div>
                  <span className="text-white font-bold block">دعاء ما بعد الأذان والسنن</span>
                  <span className="text-[10px] text-[#C4B998] block mt-0.5">
                    {settings.duaAfterAdhanEnabled ? 'التذكير بصوت الدعاء بعد الأذان مفعّل' : 'متوقف'}
                  </span>
                </div>
                <button
                  onClick={() =>
                    saveSettings(
                      {
                        ...settings,
                        duaAfterAdhanEnabled: !settings.duaAfterAdhanEnabled
                      },
                      !settings.duaAfterAdhanEnabled
                        ? 'تم تفعيل دعاء ما بعد الأذان ✓'
                        : 'تم إيقاف دعاء ما بعد الأذان'
                    )
                  }
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border ${
                    settings.duaAfterAdhanEnabled
                      ? 'bg-[#C8A24A] border-[#F3E5AB]'
                      : 'bg-[#1B1812] border-[#C8A24A]/35'
                  }`}
                  aria-label="تبديل تفعيل دعاء ما بعد الأذان"
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                      settings.duaAfterAdhanEnabled ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Reminder 5: Quiet Hours */}
              <div className="p-3 bg-[#0D0C09] border border-[#C8A24A]/25 rounded-2xl flex items-center justify-between gap-2">
                <div>
                  <span className="text-white font-bold block">ساعات الهدوء (عدم الإزعاج)</span>
                  <span className="text-[10px] text-[#C4B998] block mt-0.5">
                    {settings.quietHours?.enabled
                      ? `مفعّل كتم الصوت (${settings.quietHours.startTime} - ${settings.quietHours.endTime})`
                      : 'متوقف'}
                  </span>
                </div>
                <button
                  onClick={() =>
                    saveSettings(
                      {
                        ...settings,
                        quietHours: {
                          ...settings.quietHours,
                          enabled: !settings.quietHours?.enabled
                        }
                      },
                      !settings.quietHours?.enabled
                        ? 'تم تفعيل ساعات الهدوء ✓'
                        : 'تم إيقاف ساعات الهدوء'
                    )
                  }
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border ${
                    settings.quietHours?.enabled
                      ? 'bg-[#C8A24A] border-[#F3E5AB]'
                      : 'bg-[#1B1812] border-[#C8A24A]/35'
                  }`}
                  aria-label="تبديل تفعيل ساعات الهدوء"
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                      settings.quietHours?.enabled ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Reminder 6: Daily Ayah & Hadith Auto Rotation */}
              <div className="p-3 bg-[#0D0C09] border border-[#C8A24A]/25 rounded-2xl flex items-center justify-between gap-2">
                <div>
                  <span className="text-white font-bold block">تجدد الآية اليومية والحديث الشريف</span>
                  <span className="text-[10px] text-[#C4B998] block mt-0.5">
                    {settings.dailyContentSettings?.autoRotate
                      ? 'التحديث التلقائي في الرئيسية مفعّل'
                      : 'التحديث التلقائي متوقف'}
                  </span>
                </div>
                <button
                  onClick={() =>
                    saveSettings(
                      {
                        ...settings,
                        dailyContentSettings: {
                          ...settings.dailyContentSettings,
                          autoRotate: !settings.dailyContentSettings?.autoRotate
                        }
                      },
                      !settings.dailyContentSettings?.autoRotate
                        ? 'تم تفعيل التحديث التلقائي للآية والحديث ✓'
                        : 'تم إيقاف التحديث التلقائي للآية والحديث'
                    )
                  }
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 border ${
                    settings.dailyContentSettings?.autoRotate
                      ? 'bg-[#C8A24A] border-[#F3E5AB]'
                      : 'bg-[#1B1812] border-[#C8A24A]/35'
                  }`}
                  aria-label="تبديل تفعيل تجدد الآية والحديث"
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-[#070707] transition-transform ${
                      settings.dailyContentSettings?.autoRotate ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Quran Reciter */}
      {showSection('quran') && (
        <div className="space-y-3.5">
          <div className="athar-card space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#262012] border border-[#C8A24A]/50 text-[#E6C66E]">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">قارئ القرآن المعتمد</h3>
                  <p className="text-[11px] text-[#C4B998] mt-0.5">
                    يُعتمد صوته في المصحف الصوتي وتذكيرات الآيات
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {VERIFIED_RECITERS.map((r) => {
                const isSelected = settings.selectedReciterId === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() =>
                      saveSettings(
                        { ...settings, selectedReciterId: r.id },
                        `تم اختيار القارئ: ${r.nameArabic} ✓`
                      )
                    }
                    className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs text-right transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#2A2212] to-[#16130B] border-[#E6C66E] text-[#F3E5AB] font-extrabold shadow-[0_4px_18px_rgba(200,162,74,0.2)]'
                        : 'bg-[#0D0C09] border-[#C8A24A]/25 text-[#C4B998] hover:border-[#C8A24A]/55 hover:text-white'
                    }`}
                  >
                    <span className="leading-snug">{r.nameArabic}</span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-[#C8A24A] text-[#070707] flex items-center justify-center shrink-0">
                        <Check size={12} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: System Permissions & Backup / Data Management */}
      {showSection('system') && (
        <div className="space-y-3.5">
          {/* Backup & Data Management Card */}
          <div className="athar-card space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
              <div>
                <h3 className="text-sm font-extrabold text-white">النسخ الاحتياطي وإدارة البيانات</h3>
                <p className="text-[11px] text-[#C4B998] mt-0.5 leading-relaxed">
                  حفظ واستعادة سجل صلواتك، أذكارك، الصيام، الصدقات، ومواضع الاستماع والقراءة
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={() => {
                  const json = StorageService.exportFullBackup();
                  const blob = new Blob([json], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  const dateTag = new Date().toISOString().split('T')[0];
                  a.href = url;
                  a.download = `athar-backup-${dateTag}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  setSaveBanner('تم تصدير وتحميل ملف النسخة الاحتياطية بنجاح ✓');
                  setTimeout(() => setSaveBanner(null), 3500);
                }}
                className="athar-btn-primary flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs"
              >
                <Download size={14} />
                <span>تصدير نسخة احتياطية</span>
              </button>

              <label className="athar-btn-outline flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs cursor-pointer">
                <Upload size={14} className="text-[#E6C66E]" />
                <span>استعادة نسخة محفوظة</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const res = StorageService.importFullBackup(String(reader.result || ''));
                      setSaveBanner(res.message);
                      if (res.success) {
                        setSettings(StorageService.getSettings());
                      }
                      setTimeout(() => setSaveBanner(null), 4000);
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>

            <div className="pt-1">
              {showClearConfirm ? (
                <div className="w-full p-3.5 bg-[#1E1111] border border-red-500/45 rounded-2xl space-y-2.5 text-xs">
                  <span className="text-red-200 block font-bold">
                    هل أنت متأكد من مسح جميع البيانات والإعدادات المحلية؟
                  </span>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-3.5 py-1.5 bg-[#171510] text-[#C4B998] border border-[#C8A24A]/30 rounded-xl font-bold"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={() => {
                        StorageService.clearAllData();
                        window.location.reload();
                      }}
                      className="px-3.5 py-1.5 bg-red-600 text-white font-extrabold rounded-xl"
                    >
                      تأكيد المسح النهائي
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-[#0D0C09] hover:bg-[#1E1111] text-[#C4B998] hover:text-red-300 border border-[#C8A24A]/25 hover:border-red-500/40 rounded-2xl text-xs font-bold transition-colors"
                >
                  <Trash2 size={14} />
                  <span>مسح جميع البيانات المحلية وإعادة الضبط</span>
                </button>
              )}
            </div>
          </div>

          {/* Dedicated Permissions & System Status Section */}
          <div className="athar-card relative overflow-hidden space-y-3.5">
            <div className="relative z-10 flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-[#262012] border border-[#C8A24A]/50 rounded-xl text-[#E6C66E]">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">قسم الأذونات والصلاحيات</h3>
                  <p className="text-[11px] text-[#C4B998] mt-0.5">
                    حالة أذونات النظام والتشغيل بالخلفية وشاشة القفل
                  </p>
                </div>
              </div>
            </div>

            <div className="relative z-10 divide-y divide-[#C8A24A]/20 border border-[#C8A24A]/30 rounded-2xl bg-[#0D0C09]/95 overflow-hidden text-xs">
              {/* Row 1: Notifications Permission */}
              <div className="p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Bell size={16} className="text-[#E6C66E]" />
                    <div>
                      <span className="font-extrabold text-white block">
                        إشعارات النظام وشاشة القفل والأذان
                      </span>
                      <span className="text-[10px] text-[#C4B998]">
                        لإظهار التنبيهات خارج التطبيق وعلى شاشة القفل
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shrink-0 ${
                      notificationPermission === 'granted'
                        ? 'bg-[#C8A24A]/20 text-[#E6C66E] border-[#E6C66E]/50'
                        : 'bg-[#1A160E] text-[#C4B998] border-[#C8A24A]/30'
                    }`}
                  >
                    {notificationPermission === 'granted' ? 'مفعّلة ✓' : 'تحتاج صلاحية'}
                  </span>
                </div>

                {NotificationService.isRunningInIframe() &&
                  NotificationService.getNativeBrowserPermission() !== 'granted' && (
                    <div className="p-3 bg-[#1A150B] border border-[#C8A24A]/45 rounded-xl text-[11px] text-[#F3E5AB] space-y-2">
                      <p className="leading-relaxed">
                        لتشغيل إشعارات شريط النظام والهاتف خارج المتصفح، افتح التطبيق في نافذة مستقلة:
                      </p>
                      <a
                        href={window.location.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C8A24A] text-[#070707] font-extrabold rounded-xl text-[11px] hover:bg-[#E6C66E] transition-colors"
                      >
                        <ExternalLink size={12} />
                        <span>فتح في نافذة مستقلة</span>
                      </a>
                    </div>
                  )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {notificationPermission !== 'granted' && (
                    <button
                      onClick={handleRequestNotifications}
                      className="flex-1 py-2 px-3 athar-btn-primary text-[11px]"
                    >
                      منح الصلاحية الآن
                    </button>
                  )}
                  <button
                    onClick={handleTestSystemNotification}
                    className="flex-1 py-2 px-3 bg-[#171510] hover:bg-[#231F15] text-[#F3E5AB] font-extrabold rounded-xl text-[11px] border border-[#C8A24A]/40 transition-colors"
                  >
                    تجربة إشعار فوري
                  </button>
                  <button
                    onClick={handleTestBackgroundOutsideApp}
                    disabled={delayedTestCountdown > 0}
                    className="flex-1 py-2 px-3 bg-[#241E11] hover:bg-[#302816] text-[#E6C66E] font-extrabold rounded-xl text-[11px] border border-[#E6C66E]/50 transition-colors"
                  >
                    {delayedTestCountdown > 0
                      ? `سيصل بعد (${delayedTestCountdown} ث)...`
                      : 'تجربة خارج البرنامج (5 ث)'}
                  </button>
                </div>
              </div>

              {/* Row 2: Microphone Permission */}
              <div className="p-3.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Mic size={16} className="text-[#E6C66E]" />
                  <div className="min-w-0">
                    <span className="font-extrabold text-white block">إذن الميكروفون والأوامر الصوتية</span>
                    <span className="text-[10px] text-[#C4B998] block leading-relaxed">
                      للمساعد الصوتي والتفاعل بدون لمس الشاشة
                    </span>
                  </div>
                </div>
                {micStatus === 'granted' ? (
                  <span className="text-[10px] font-extrabold text-[#E6C66E] bg-[#C8A24A]/20 border border-[#E6C66E]/50 px-2.5 py-0.5 rounded-full shrink-0">
                    مفعّل ✓
                  </span>
                ) : (
                  <button
                    onClick={async () => {
                      const ok = await VoiceAssistant.requestMicrophonePermission();
                      setMicStatus(ok ? 'granted' : 'denied');
                      if (ok) {
                        setSaveBanner('تم تفعيل صلاحية الميكروفون والمساعد الصوتي بنجاح ✓');
                        setTimeout(() => setSaveBanner(null), 3000);
                      }
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-[#070707] font-extrabold rounded-xl text-[11px] shrink-0 transition-transform active:scale-95 shadow"
                  >
                    منح الصلاحية
                  </button>
                )}
              </div>

              {/* Row 3: Background Audio & MediaSession */}
              <div className="p-3.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Volume2 size={16} className="text-[#E6C66E]" />
                  <div>
                    <span className="font-extrabold text-white block">تشغيل الصوتيات والوسائط بالخلفية</span>
                    <span className="text-[10px] text-[#C4B998] block">
                      الأذان والتلاوات على شاشة القفل (MediaSession)
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold text-[#E6C66E] bg-[#C8A24A]/20 border border-[#E6C66E]/50 px-2.5 py-0.5 rounded-full shrink-0">
                  نشطة ✓
                </span>
              </div>

              {/* Row 4: Service Worker & Offline */}
              <div className="p-3.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={16} className="text-[#E6C66E]" />
                  <div>
                    <span className="font-extrabold text-white block">العمل خارج التطبيق ووضع عدم الاتصال</span>
                    <span className="text-[10px] text-[#C4B998] block">
                      محرك الخلفية وتخزين الصوتيات الفوري
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold text-[#E6C66E] bg-[#C8A24A]/20 border border-[#E6C66E]/50 px-2.5 py-0.5 rounded-full shrink-0">
                  نشطة ✓
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM CARD: Spacious & Unclipped Save Settings & Summary Card (Moved from Top to Bottom) */}
      <div className="rounded-3xl bg-gradient-to-b from-[#1E1910] via-[#13100A] to-[#0B0A08] border border-[#C8A24A]/65 p-5 space-y-4 shadow-[0_14px_38px_rgba(0,0,0,0.92)]">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2B2313] to-[#14110A] border border-[#E6C66E]/60 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(200,162,74,0.28)]">
            <SettingsIcon size={22} className="text-[#E6C66E]" />
          </div>
          <div className="flex-1 text-right space-y-1">
            <div className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-[#E6C66E] shrink-0" />
              <span className="text-[11px] font-extrabold text-[#E6C66E] tracking-wide">
                ملخص وحفظ إعدادات أثر الملكية
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#F3E5AB] leading-snug">
              الإعدادات والتفضيلات المعتمدة
            </h2>
            <p className="text-xs text-[#C4B998] leading-relaxed">
              إدارة منظمة للأذان، التلاوة، التنبيهات اليومية، والصلاحيات مع الحفظ التلقائي والفوري.
            </p>
          </div>
        </div>

        {/* Full-Clarity Summary Status Cards (No Truncation) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[#C8A24A]/25 text-xs">
          <div className="bg-[#12100B] border border-[#C8A24A]/40 rounded-2xl p-3 text-right space-y-1">
            <span className="text-[#C4B998] block text-[11px] font-bold">القارئ المعتمد للتلاوة:</span>
            <span className="text-[#E6C66E] font-extrabold block leading-relaxed break-words">
              {selectedReciter?.nameArabic}
            </span>
          </div>
          <div className="bg-[#12100B] border border-[#C8A24A]/40 rounded-2xl p-3 text-right space-y-1">
            <span className="text-[#C4B998] block text-[11px] font-bold">حالة الإشعارات والتنبيهات:</span>
            <span
              className={`font-extrabold block leading-relaxed ${
                notificationPermission === 'granted' ? 'text-[#E6C66E]' : 'text-[#F3E5AB]'
              }`}
            >
              {notificationPermission === 'granted' ? 'مفعّلة ونشطة بالكامل ✓' : 'تحتاج تفعيل الصلاحية'}
            </span>
          </div>
        </div>

        {/* Prominent Full-Width Golden Save Button */}
        <button
          onClick={() => saveSettings(settings, 'تم حفظ جميع الإعدادات والتفضيلات بنجاح ✓')}
          className="w-full athar-btn-primary py-3 px-5 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-[0_6px_22px_rgba(200,162,74,0.4)]"
        >
          <Check size={17} />
          <span>حفظ جميع الإعدادات والتفضيلات</span>
        </button>
      </div>

      {/* Save Feedback Banner Directly Underneath the Save Card at the Bottom of the Page */}
      {saveBanner && (
        <div className="p-4 bg-gradient-to-r from-[#241E11] to-[#14110B] border border-[#E6C66E]/75 rounded-2xl flex items-center justify-center gap-2.5 text-xs sm:text-sm text-[#F3E5AB] animate-slideDown shadow-[0_10px_28px_rgba(0,0,0,0.9)]">
          <CheckCircle2 size={18} className="text-[#E6C66E] shrink-0" />
          <span className="font-extrabold">{saveBanner}</span>
        </div>
      )}
    </div>
  );
};
