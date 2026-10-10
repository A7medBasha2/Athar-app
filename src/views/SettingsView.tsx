import React, { useState, useEffect } from 'react';
import { AppSettings, Coordinates, IslamicArtwork } from '../types';
import { StorageService } from '../services/storageService';
import { ArtworkService } from '../services/artworkService';
import { NotificationService } from '../services/notificationService';
import { LocationService } from '../services/locationService';
import { ReminderEngine } from '../services/reminderService';
import { POPULAR_CITIES } from '../data/citiesData';
import { VERIFIED_RECITERS } from '../data/surahsData';
import { RotatingCardBackground } from '../components/RotatingCardBackground';
import { 
  Settings as SettingsIcon, Image, MapPin, Volume2, 
  Trash2, Check, BookOpen, Bell, ShieldCheck, CheckCircle2, 
  ExternalLink, Download, Upload, ChevronLeft, Navigation, Play,
  Mic, Sparkles, VolumeX, HeartHandshake
} from 'lucide-react';
import { VoiceAssistant, VoiceAssistantSettings } from '../services/voiceAssistantService';

interface SettingsViewProps {
  onOpenCodeInspector?: () => void;
  onOpenRemindersCenter: () => void;
  onOpenVoiceAssistant?: () => void;
  onLocationChange: (coords: Coordinates) => void;
}

type SettingsTabId = 'all' | 'voice_a11y' | 'adhan_notifications' | 'quran' | 'location' | 'appearance' | 'system';

export const SettingsView: React.FC<SettingsViewProps> = ({
  onOpenRemindersCenter,
  onOpenVoiceAssistant,
  onLocationChange
}) => {
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());
  const [artworks, setArtworks] = useState<IslamicArtwork[]>(ArtworkService.getArtworks());
  const [voiceSettings, setVoiceSettings] = useState<VoiceAssistantSettings>(VoiceAssistant.getSettings());
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    NotificationService.getPermissionStatus()
  );
  const [isUpdatingLocation, setIsUpdatingLocation] = useState<boolean>(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [delayedTestCountdown, setDelayedTestCountdown] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<SettingsTabId>('all');
  const [citySearch, setCitySearch] = useState<string>('');
  const [micStatus, setMicStatus] = useState<'granted' | 'prompt' | 'denied'>('prompt');

  useEffect(() => {
    setSettings(StorageService.getSettings());
    setArtworks(ArtworkService.getArtworks());
    setNotificationPermission(NotificationService.getPermissionStatus());
    VoiceAssistant.checkMicrophonePermission().then((s) => {
      if (s === 'granted') setMicStatus('granted');
      else if (s === 'denied') setMicStatus('denied');
    });
    const unsubPerm = NotificationService.subscribePermission((perm) => {
      setNotificationPermission(perm);
    });
    return () => unsubPerm();
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
      title: "تم تفعيل إشعارات أثر بنجاح ✓",
      body: "ستصلك مواقيت الصلاة والأذان وتذكيرات القرآن وذكر الله داخل وخارج البرنامج وحتى لو الشاشة مقفلة.",
      type: 'info'
    });
  };

  const handleRefreshGPS = async () => {
    setIsUpdatingLocation(true);
    const res = await LocationService.getCurrentPosition();
    setIsUpdatingLocation(false);
    if (res.coords) {
      const updated = { ...settings, location: res.coords };
      saveSettings(updated, `تم تحديث الموقع الجغرافي بنجاح: ${res.coords.city}`);
      onLocationChange(res.coords);
    }
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

  const handleSelectCity = (city: Coordinates) => {
    const updated = { ...settings, location: city };
    saveSettings(updated, `تم اختيار المدينة: ${city.city}`);
    onLocationChange(city);
  };

  const handleArtworkChange = (artId: string) => {
    ArtworkService.setArtwork(artId);
    const updated = {
      ...settings,
      artwork: { ...settings.artwork, currentArtworkId: artId }
    };
    saveSettings(updated, 'تم تغيير الزخرفة الإسلامية');
  };

  const handleOpacityChange = (val: number) => {
    ArtworkService.setOpacity(val);
    const updated = {
      ...settings,
      artwork: { ...settings.artwork, opacity: val }
    };
    saveSettings(updated);
  };

  const filteredCities = POPULAR_CITIES.filter((c) =>
    !citySearch.trim() ||
    c.city.includes(citySearch.trim()) ||
    c.country.includes(citySearch.trim())
  );

  const selectedReciter = VERIFIED_RECITERS.find(r => r.id === settings.selectedReciterId) || VERIFIED_RECITERS[0];

  const showSection = (sectionTab: SettingsTabId) =>
    activeTab === 'all' || activeTab === sectionTab;

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-10 space-y-4 max-w-lg mx-auto w-full select-none">
      {/* Header & Quick Summary */}
      <div className="bg-gradient-to-br from-[#151E29] to-[#10161F] border border-slate-800/90 rounded-3xl p-4 space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <SettingsIcon size={20} className="text-[#D4AF37]" />
              الإعدادات والتفضيلات
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              إدارة منظمة وسريعة للأذان، التلاوة، الموقع، المظهر، والصلاحيات
            </p>
          </div>
          <button
            onClick={() => saveSettings(settings, 'تم حفظ جميع الإعدادات بنجاح ✓')}
            className="px-3 py-1.5 bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-transform active:scale-95 shadow"
          >
            <Check size={14} />
            <span>حفظ</span>
          </button>
        </div>

        {/* Clean Summary Row */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-2 text-right">
            <span className="text-slate-400 block text-[10px]">المدينة الحالية</span>
            <span className="text-slate-100 font-bold truncate block mt-0.5">{settings.location.city}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-2 text-right">
            <span className="text-slate-400 block text-[10px]">القارئ المعتمد</span>
            <span className="text-[#D4AF37] font-bold truncate block mt-0.5">{selectedReciter?.nameArabic}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-2 text-right">
            <span className="text-slate-400 block text-[10px]">حالة الإشعارات</span>
            <span className={`font-bold truncate block mt-0.5 ${
              notificationPermission === 'granted' ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {notificationPermission === 'granted' ? 'مفعّلة ونشطة ✓' : 'تحتاج تفعيل'}
            </span>
          </div>
        </div>
      </div>

      {/* Save Success Banner */}
      {saveBanner && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl flex items-center gap-2 text-xs text-emerald-300 animate-slideDown shadow-lg">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span className="font-semibold">{saveBanner}</span>
        </div>
      )}

      {/* Organized Category Navigation Tabs */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 p-1 bg-[#121820] border border-slate-800 rounded-2xl text-[10px] sm:text-[11px]">
        {[
          { id: 'all', label: 'الكل' },
          { id: 'voice_a11y', label: 'الصوت والهمم' },
          { id: 'adhan_notifications', label: 'التنبيهات' },
          { id: 'quran', label: 'المصحف' },
          { id: 'location', label: 'الموقع' },
          { id: 'appearance', label: 'المظهر' },
          { id: 'system', label: 'النسخ' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as SettingsTabId)}
            className={`py-2 px-1 rounded-xl font-bold text-center transition-all truncate ${
              activeTab === tab.id
                ? 'bg-[#D4AF37] text-slate-950 shadow'
                : 'text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SECTION 0: Voice Commands */}
      {showSection('voice_a11y') && (
        <div className="space-y-3.5">
          <div className="relative overflow-hidden bg-[#121820] border border-[#D4AF37]/30 rounded-2xl p-4 space-y-3.5 shadow-md">
            <RotatingCardBackground slot="kaaba" cardOffset={1} intervalMs={26000} opacity={0.25} />
            <div className="relative z-10 flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Mic size={18} className="text-[#D4AF37]" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    <span>المساعد الصوتي وسهولة الوصول</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37]">مفعّل</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    أوامر صوتية ذكية ونطق تفاعلي لدعم ذوي الهمم ومكفوفي البصر
                  </p>
                </div>
              </div>
              {onOpenVoiceAssistant && (
                <button
                  onClick={onOpenVoiceAssistant}
                  className="px-3 py-1.5 rounded-xl bg-[#D4AF37] text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:bg-[#edd068] transition-colors shadow"
                  aria-label="تجربة المساعد الصوتي الآن"
                >
                  <Mic size={14} />
                  <span>تحدث الآن</span>
                </button>
              )}
            </div>

            <div className="relative z-10 space-y-2.5 text-xs">
              {/* Option 1: Auto Speak Responses */}
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-slate-200 font-bold block">نطق الردود صوتياً (Text-to-Speech)</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    يقوم التطبيق بنطق نتائج الصلاة، الأذكار، والسور بصوت عربي واضح ومسموع
                  </span>
                </div>
                <button
                  onClick={() => {
                    const updated = { ...voiceSettings, autoSpeak: !voiceSettings.autoSpeak };
                    setVoiceSettings(updated);
                    VoiceAssistant.saveSettings(updated);
                  }}
                  className={`w-10 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${
                    voiceSettings.autoSpeak ? 'bg-[#D4AF37]' : 'bg-slate-700'
                  }`}
                  aria-label="تبديل نطق الردود صوتياً"
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                      voiceSettings.autoSpeak ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Option 2: Auto-Listen on App Open */}
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-slate-200 font-bold block">الاستماع التلقائي عند فتح التطبيق</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    يبدأ المساعد الصوتي بالاستماع تلقائياً بمجرد فتح التطبيق (خاص بمكفوفي البصر)
                  </span>
                </div>
                <button
                  onClick={() => {
                    const updated = { ...voiceSettings, autoListenOnAppOpen: !voiceSettings.autoListenOnAppOpen };
                    setVoiceSettings(updated);
                    VoiceAssistant.saveSettings(updated);
                  }}
                  className={`w-10 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${
                    voiceSettings.autoListenOnAppOpen ? 'bg-[#D4AF37]' : 'bg-slate-700'
                  }`}
                  aria-label="تبديل الاستماع التلقائي عند فتح التطبيق"
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                      voiceSettings.autoListenOnAppOpen ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Option 3: Sound Chimes (Earcons) */}
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-slate-200 font-bold block">الإشارات الصوتية النغمية (Earcons)</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    نغمات مسموعة تؤكد لحظة بدء وانتهاء الاستماع وتنفيذ الأمر بنجاح
                  </span>
                </div>
                <button
                  onClick={() => {
                    const updated = { ...voiceSettings, soundChimes: !voiceSettings.soundChimes };
                    setVoiceSettings(updated);
                    VoiceAssistant.saveSettings(updated);
                  }}
                  className={`w-10 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${
                    voiceSettings.soundChimes ? 'bg-[#D4AF37]' : 'bg-slate-700'
                  }`}
                  aria-label="تبديل الإشارات الصوتية النغمية"
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                      voiceSettings.soundChimes ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Option 4: Speech Rate Selector */}
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-slate-200 font-bold block">سرعة النطق التفاعلي</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
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
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                        voiceSettings.speechRate === rate
                          ? 'bg-[#D4AF37] text-slate-950 shadow'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {rate === 0.85 ? 'هادئ' : rate === 1.0 ? 'طبيعي' : 'سريع'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: Daily Reminders Center */}
      {showSection('adhan_notifications') && (
        <div className="space-y-3.5">
          {/* Structured Card: Daily Reminders Schedule */}
          <div className="relative overflow-hidden bg-[#121820] border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-md">
            <RotatingCardBackground slot="reminders" cardOffset={2} intervalMs={25000} opacity={0.22} />
            <div className="relative z-10 flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-[#D4AF37]" />
                <div>
                  <h3 className="text-xs font-bold text-slate-100">تنبيهات ونفحات اليوم المبارك</h3>
                  <p className="text-[10px] text-slate-400">جدولة مواعيد الأذكار وتلاوة الآيات والورد اليومي</p>
                </div>
              </div>

              <button
                onClick={onOpenRemindersCenter}
                className="px-2.5 py-1.5 bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/35 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all"
                title="فتح مركز التذكيرات لتعديل الساعات والدقائق"
              >
                <span>ضبط المواعيد</span>
                <ChevronLeft size={13} />
              </button>
            </div>

            <div className="relative z-10 space-y-2 text-xs">
              {/* Reminder 1: Quran Verse */}
              <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-slate-200 font-bold block">تذكير آية القرآن اليومية</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {settings.quranVerseReminder.enabled ? `مفعّل (${settings.quranVerseReminder.startTime} - ${settings.quranVerseReminder.endTime})` : 'متوقف'}
                  </span>
                </div>
                <button
                  onClick={() =>
                    saveSettings({
                      ...settings,
                      quranVerseReminder: {
                        ...settings.quranVerseReminder,
                        enabled: !settings.quranVerseReminder.enabled
                      }
                    }, !settings.quranVerseReminder.enabled ? 'تم تفعيل تذكير آية القرآن' : 'تم إيقاف تذكير آية القرآن')
                  }
                  className={`w-10 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${
                    settings.quranVerseReminder.enabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                  aria-label="تبديل تفعيل تذكير آية القرآن"
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                      settings.quranVerseReminder.enabled ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Reminder 2: Morning & Evening Adhkar */}
              <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-slate-200 font-bold block">تذكيرات أذكار الصباح والمساء</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {settings.dhikrReminder.enabled ? `مفعّل (${settings.dhikrReminder.frequency === '1h' ? 'كل ساعة' : 'فترات دورية'})` : 'متوقف'}
                  </span>
                </div>
                <button
                  onClick={() =>
                    saveSettings({
                      ...settings,
                      dhikrReminder: {
                        ...settings.dhikrReminder,
                        enabled: !settings.dhikrReminder.enabled
                      }
                    }, !settings.dhikrReminder.enabled ? 'تم تفعيل تذكيرات الأذكار' : 'تم إيقاف تذكيرات الأذكار')
                  }
                  className={`w-10 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${
                    settings.dhikrReminder.enabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                  aria-label="تبديل تفعيل تذكيرات الأذكار"
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                      settings.dhikrReminder.enabled ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Reminder 3: Daily Wird */}
              <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-slate-200 font-bold block">تذكير الورد القرآني اليومي</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {settings.dailyWirdReminder.enabled ? `مفعّل (يبدأ ${settings.dailyWirdReminder.startTime})` : 'متوقف'}
                  </span>
                </div>
                <button
                  onClick={() =>
                    saveSettings({
                      ...settings,
                      dailyWirdReminder: {
                        ...settings.dailyWirdReminder,
                        enabled: !settings.dailyWirdReminder.enabled
                      }
                    }, !settings.dailyWirdReminder.enabled ? 'تم تفعيل تذكير الورد اليومي' : 'تم إيقاف تذكير الورد اليومي')
                  }
                  className={`w-10 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${
                    settings.dailyWirdReminder.enabled ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                  aria-label="تبديل تفعيل تذكير الورد اليومي"
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                      settings.dailyWirdReminder.enabled ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Reminder: Dua After Adhan */}
              <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-slate-200 font-bold block">دعاء ما بعد الأذان والسنن</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {settings.duaAfterAdhanEnabled ? 'التذكير بصوت الدعاء بعد الأذان مفعّل' : 'متوقف'}
                  </span>
                </div>
                <button
                  onClick={() =>
                    saveSettings({
                      ...settings,
                      duaAfterAdhanEnabled: !settings.duaAfterAdhanEnabled
                    }, !settings.duaAfterAdhanEnabled ? 'تم تفعيل دعاء ما بعد الأذان' : 'تم إيقاف دعاء ما بعد الأذان')
                  }
                  className={`w-10 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${
                    settings.duaAfterAdhanEnabled ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                  aria-label="تبديل تفعيل دعاء ما بعد الأذان"
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                      settings.duaAfterAdhanEnabled ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Reminder 6: Quiet Hours */}
              <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-slate-200 font-bold block">ساعات الهدوء (عدم الإزعاج)</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {settings.quietHours?.enabled ? `مفعّل كتم الصوت (${settings.quietHours.startTime} - ${settings.quietHours.endTime})` : 'متوقف'}
                  </span>
                </div>
                <button
                  onClick={() =>
                    saveSettings({
                      ...settings,
                      quietHours: {
                        ...settings.quietHours,
                        enabled: !settings.quietHours?.enabled
                      }
                    }, !settings.quietHours?.enabled ? 'تم تفعيل ساعات الهدوء' : 'تم إيقاف ساعات الهدوء')
                  }
                  className={`w-10 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${
                    settings.quietHours?.enabled ? 'bg-indigo-500' : 'bg-slate-700'
                  }`}
                  aria-label="تبديل تفعيل ساعات الهدوء"
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                      settings.quietHours?.enabled ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Reminder 7: Daily Ayah & Hadith Auto Rotation */}
              <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-slate-200 font-bold block">تجدد الآية اليومية والحديث الشريف</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {settings.dailyContentSettings?.autoRotate ? 'التحديث التلقائي في الرئيسية مفعّل' : 'التحديث التلقائي متوقف'}
                  </span>
                </div>
                <button
                  onClick={() =>
                    saveSettings({
                      ...settings,
                      dailyContentSettings: {
                        ...settings.dailyContentSettings,
                        autoRotate: !settings.dailyContentSettings?.autoRotate
                      }
                    }, !settings.dailyContentSettings?.autoRotate ? 'تم تفعيل التحديث التلقائي للآية والحديث' : 'تم إيقاف التحديث التلقائي للآية والحديث')
                  }
                  className={`w-10 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${
                    settings.dailyContentSettings?.autoRotate ? 'bg-[#D4AF37]' : 'bg-slate-700'
                  }`}
                  aria-label="تبديل تفعيل تجدد الآية والحديث"
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
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
          {/* Quran Reciter Selection */}
          <div className="bg-[#121820] border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <BookOpen size={17} className="text-[#D4AF37]" />
                <div>
                  <h3 className="text-xs font-bold text-slate-100">قارئ القرآن المعتمد</h3>
                  <p className="text-[10px] text-slate-400">يُعتمد صوته في المصحف الصوتي وتذكيرات الآيات</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {VERIFIED_RECITERS.map((r) => {
                const isSelected = settings.selectedReciterId === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => saveSettings({ ...settings, selectedReciterId: r.id }, `تم اختيار القارئ: ${r.nameArabic}`)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs text-right transition-all ${
                      isSelected
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] font-bold'
                        : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{r.nameArabic}</span>
                    {isSelected && <Check size={14} className="shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Location & City Selection */}
      {showSection('location') && (
        <div className="bg-[#121820] border border-slate-800 rounded-2xl p-4 space-y-3.5">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <MapPin size={17} className="text-[#D4AF37]" />
              <div>
                <h3 className="text-xs font-bold text-slate-100">الموقع الجغرافي والمدينة</h3>
                <p className="text-[10px] text-slate-400">
                  المدينة الحالية: <strong className="text-[#D4AF37]">{settings.location.city}</strong> ({settings.location.country})
                </p>
              </div>
            </div>
            <button
              onClick={handleRefreshGPS}
              disabled={isUpdatingLocation}
              className="px-3 py-1.5 bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/40 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-colors"
            >
              <Navigation size={12} />
              <span>{isUpdatingLocation ? 'جاري التحديد...' : 'تحديث GPS تلقائي'}</span>
            </button>
          </div>

          {/* Search Input for Cities */}
          <div>
            <input
              type="text"
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              placeholder="ابحث عن مدينتك أو دولتك..."
              className="w-full px-3 py-2 bg-slate-900/70 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-0.5">
            {filteredCities.map((c) => (
              <button
                key={c.city}
                onClick={() => handleSelectCity(c)}
                className={`p-2.5 rounded-xl text-xs text-right truncate border transition-all flex items-center justify-between ${
                  settings.location.city === c.city
                    ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] font-bold'
                    : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="truncate">{c.city}</span>
                {settings.location.city === c.city && <Check size={12} className="shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: Appearance & Islamic Artwork */}
      {showSection('appearance') && (
        <div className="bg-[#121820] border border-slate-800 rounded-2xl p-4 space-y-3.5">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Image size={17} className="text-[#D4AF37]" />
              <div>
                <h3 className="text-xs font-bold text-slate-100">الخلفيات والزخارف الإسلامية</h3>
                <p className="text-[10px] text-slate-400">نقوش هندسية ومعالم إسلامية هادئة ومريحة للعين</p>
              </div>
            </div>

            <button
              onClick={() => {
                const updated = {
                  ...settings,
                  artwork: { ...settings.artwork, enabled: !settings.artwork.enabled }
                };
                saveSettings(updated, updated.artwork.enabled ? 'تم تفعيل الزخارف الإسلامية' : 'تم إيقاف الزخارف الإسلامية');
              }}
              className={`w-10 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${
                settings.artwork.enabled ? 'bg-[#D4AF37]' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                  settings.artwork.enabled ? '-translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {settings.artwork.enabled && (
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-400 block mb-1.5 font-medium">معدل تبديل الخلفيات تلقائياً</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {[
                    { id: '6h', label: 'كل 6 ساعات' },
                    { id: '12h', label: 'كل 12 ساعة' },
                    { id: 'daily', label: 'يومياً' },
                    { id: '3d', label: 'كل 3 أيام' },
                    { id: 'off', label: 'ثابت' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        const updated = {
                          ...settings,
                          artwork: { ...settings.artwork, rotationInterval: item.id as any }
                        };
                        saveSettings(updated);
                      }}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        settings.artwork.rotationInterval === item.id
                          ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] font-bold'
                          : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span>درجة وضوح وشفافية الخلفية:</span>
                  <span className="font-mono text-[#D4AF37] font-bold">
                    {Math.round(settings.artwork.opacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.15"
                  step="0.01"
                  value={settings.artwork.opacity}
                  onChange={(e) => handleOpacityChange(Number(e.target.value))}
                  className="w-full accent-[#D4AF37] cursor-pointer"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1.5 font-medium">اختيار الزخرفة الإسلامية الحالية</label>
                <div className="grid grid-cols-2 gap-2">
                  {artworks.map((art) => (
                    <button
                      key={art.id}
                      onClick={() => handleArtworkChange(art.id)}
                      className={`p-2.5 rounded-xl border text-right transition-all ${
                        settings.artwork.currentArtworkId === art.id
                          ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#D4AF37] font-bold'
                          : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="block font-bold truncate">{art.titleArabic}</span>
                      <span className="text-[10px] text-slate-400 block truncate mt-0.5">{art.descriptionArabic}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: System Permissions (Moved Down Here) & Backup / Data Management */}
      {showSection('system') && (
        <div className="space-y-3.5">
          {/* Backup & Data Management Card */}
          <div className="bg-[#121820] border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-xs font-bold text-slate-100">النسخ الاحتياطي وإدارة البيانات</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  حفظ واستعادة سجل صلواتك، أذكارك، الصيام، الصدقات، ومواضع الاستماع والقراءة
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
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
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#182330] hover:bg-[#1F2E40] text-[#D4AF37] border border-[#D4AF37]/40 rounded-xl text-xs font-bold transition-all active:scale-95"
              >
                <Download size={14} />
                <span>تصدير نسخة احتياطية</span>
              </button>

              <label className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95">
                <Upload size={14} />
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
                <div className="w-full p-3 bg-rose-950/40 border border-rose-800 rounded-xl space-y-2 text-xs">
                  <span className="text-rose-200 block font-medium">هل أنت متأكد من مسح جميع البيانات والإعدادات المحلية؟</span>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={() => {
                        StorageService.clearAllData();
                        window.location.reload();
                      }}
                      className="px-3 py-1.5 bg-rose-600 text-white font-bold rounded-lg"
                    >
                      تأكيد المسح النهائي
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-900/60 hover:bg-rose-950/30 text-rose-300/90 border border-slate-800 hover:border-rose-900/40 rounded-xl text-xs transition-colors"
                >
                  <Trash2 size={14} />
                  <span>مسح جميع البيانات المحلية وإعادة الضبط</span>
                </button>
              )}
            </div>
          </div>

          {/* Dedicated Permissions & System Status Section (Moved to Bottom in place of Native Architecture) */}
          <div className="relative overflow-hidden bg-[#121820] border border-[#D4AF37]/30 rounded-2xl p-4 space-y-3 shadow-lg">
            <RotatingCardBackground slot="kaaba" cardOffset={0} intervalMs={24000} opacity={0.22} />
            <div className="relative z-10 flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#D4AF37]/15 rounded-xl text-[#D4AF37]">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-100">قسم الأذونات والصلاحيات</h3>
                  <p className="text-[10px] text-slate-400">جدول حالة أذونات النظام والتشغيل بالخلفية</p>
                </div>
              </div>
            </div>

            {/* Clean Structured Table of Permissions */}
            <div className="relative z-10 divide-y divide-slate-800/80 border border-slate-800 rounded-xl bg-slate-900/50 overflow-hidden text-xs">
              {/* Row 1: Notifications Permission */}
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell size={15} className={notificationPermission === 'granted' ? 'text-emerald-400' : 'text-amber-400'} />
                    <div>
                      <span className="font-bold text-slate-200 block">إشعارات النظام وشاشة القفل والأذان</span>
                      <span className="text-[10px] text-slate-400">لإظهار التنبيهات خارج التطبيق وعلى شاشة القفل</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold shrink-0 ${
                    notificationPermission === 'granted' ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {notificationPermission === 'granted' ? 'مفعّلة ✓' : 'تحتاج صلاحية'}
                  </span>
                </div>

                {NotificationService.isRunningInIframe() && NotificationService.getNativeBrowserPermission() !== 'granted' && (
                  <div className="p-2.5 bg-amber-950/40 border border-[#D4AF37]/40 rounded-xl text-[11px] text-amber-200 space-y-1.5">
                    <p className="leading-relaxed">
                      لتشغيل إشعارات شريط النظام والهاتف خارج المتصفح، افتح التطبيق في نافذة مستقلة:
                    </p>
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37] text-slate-950 font-bold rounded-lg text-[11px] hover:bg-[#E5C158] transition-colors"
                    >
                      <ExternalLink size={12} />
                      <span>فتح في نافذة مستقلة</span>
                    </a>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {notificationPermission !== 'granted' && (
                    <button
                      onClick={handleRequestNotifications}
                      className="flex-1 py-1.5 px-2.5 bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-bold rounded-lg text-[11px] transition-transform active:scale-95"
                    >
                      منح الصلاحية الآن
                    </button>
                  )}
                  <button
                    onClick={handleTestSystemNotification}
                    className="flex-1 py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-[11px] border border-slate-700 transition-colors"
                  >
                    تجربة إشعار فوري
                  </button>
                  <button
                    onClick={handleTestBackgroundOutsideApp}
                    disabled={delayedTestCountdown > 0}
                    className="flex-1 py-1.5 px-2.5 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 font-semibold rounded-lg text-[11px] border border-emerald-700/60 transition-colors"
                  >
                    {delayedTestCountdown > 0
                      ? `سيصل بعد (${delayedTestCountdown} ث)...`
                      : 'تجربة خارج البرنامج (5 ث)'}
                  </button>
                </div>
              </div>

              {/* Row 2: Geolocation Permission */}
              <div className="p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin size={15} className={settings.location.isAutoGps ? 'text-emerald-400' : 'text-amber-400'} />
                  <div className="min-w-0">
                    <span className="font-bold text-slate-200 block">الموقع الجغرافي الدقيق (GPS)</span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      المنطقة: {settings.location.city} ({settings.location.country})
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleRefreshGPS}
                  disabled={isUpdatingLocation}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-[#D4AF37] font-semibold rounded-lg text-[11px] border border-[#D4AF37]/30 shrink-0 transition-colors"
                >
                  {isUpdatingLocation ? 'جاري التحديث...' : settings.location.isAutoGps ? 'تحديث GPS ✓' : 'تفعيل GPS'}
                </button>
              </div>

              {/* Row 3: Microphone Permission for Voice Assistant */}
              <div className="p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Mic size={15} className={micStatus === 'granted' ? 'text-emerald-400' : 'text-amber-400'} />
                  <div className="min-w-0">
                    <span className="font-bold text-slate-200 block">إذن الميكروفون والأوامر الصوتية</span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      للمساعد الصوتي والتفاعل بدون لمس الشاشة
                    </span>
                  </div>
                </div>
                {micStatus === 'granted' ? (
                  <span className="text-[10px] font-bold text-emerald-400 shrink-0">مفعّل ✓</span>
                ) : (
                  <button
                    onClick={async () => {
                      const ok = await VoiceAssistant.requestMicrophonePermission();
                      setMicStatus(ok ? 'granted' : 'denied');
                    }}
                    className="px-2.5 py-1.5 bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-bold rounded-lg text-[11px] shrink-0 transition-transform active:scale-95 shadow"
                  >
                    منح الصلاحية
                  </button>
                )}
              </div>

              {/* Row 4: Background Audio & Media Controls */}
              <div className="p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Volume2 size={15} className="text-emerald-400" />
                  <div>
                    <span className="font-bold text-slate-200 block">تشغيل الصوتيات والوسائط بالخلفية</span>
                    <span className="text-[10px] text-slate-400 block">الأذان والتلاوات على شاشة القفل (MediaSession)</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 shrink-0">نشطة ✓</span>
              </div>

              {/* Row 5: Service Worker & Offline */}
              <div className="p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={15} className="text-emerald-400" />
                  <div>
                    <span className="font-bold text-slate-200 block">العمل خارج التطبيق ووضع عدم الاتصال</span>
                    <span className="text-[10px] text-slate-400 block">محرك الخلفية وتخزين الصوتيات الفوري</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 shrink-0">نشطة ✓</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
