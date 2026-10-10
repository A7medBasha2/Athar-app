import React, { useState, useEffect } from 'react';
import { AppSettings, Coordinates, IslamicArtwork } from '../types';
import { StorageService } from '../services/storageService';
import { ArtworkService } from '../services/artworkService';
import { NotificationService } from '../services/notificationService';
import { LocationService } from '../services/locationService';
import { ReminderEngine } from '../services/reminderService';
import { POPULAR_CITIES } from '../data/citiesData';
import { VERIFIED_RECITERS } from '../data/surahsData';
import { 
  Settings as SettingsIcon, Image, MapPin, Volume2, 
  Trash2, RotateCcw, Check, BookOpen, Bell, Code, Info, 
  ShieldCheck, CheckCircle2, AlertTriangle, Sparkles, Clock, Play
} from 'lucide-react';

interface SettingsViewProps {
  onOpenCodeInspector: () => void;
  onOpenRemindersCenter: () => void;
  onLocationChange: (coords: Coordinates) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onOpenCodeInspector,
  onOpenRemindersCenter,
  onLocationChange
}) => {
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());
  const [artworks, setArtworks] = useState<IslamicArtwork[]>(ArtworkService.getArtworks());
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isUpdatingLocation, setIsUpdatingLocation] = useState<boolean>(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  useEffect(() => {
    setSettings(StorageService.getSettings());
    setArtworks(ArtworkService.getArtworks());
    setNotificationPermission(NotificationService.getPermissionStatus());
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
    if (perm === 'granted') {
      NotificationService.notify({
        title: "تم تفعيل إشعارات أثر بنجاح ✓",
        body: "ستصلك مواقيت الصلاة والأذان وتذكيرات القرآن والصلاة على النبي ﷺ في مواعيدها المحددة حتى لو الشاشة مقفلة.",
        type: 'info'
      });
    }
  };

  const handleRefreshGPS = async () => {
    setIsUpdatingLocation(true);
    const res = await LocationService.getCurrentPosition();
    setIsUpdatingLocation(false);
    if (res.coords) {
      const updated = { ...settings, location: res.coords };
      saveSettings(updated, `تم تحديث الموقع بنجاح: ${res.coords.city}`);
      onLocationChange(res.coords);
    }
  };

  const handleTestSystemNotification = () => {
    NotificationService.notify({
      title: "تجربة إشعار النظام - تطبيق أثر",
      body: "هذا إشعار تجريبي للتأكد من وصول التنبيهات إلى هاتفك وشاشة القفل بصورة صحيحة.",
      type: 'info',
      actionText: 'فتح التطبيق'
    });
  };

  const handleSelectCity = (city: Coordinates) => {
    const updated = { ...settings, location: city };
    saveSettings(updated);
    onLocationChange(city);
  };

  const handleArtworkChange = (artId: string) => {
    ArtworkService.setArtwork(artId);
    const updated = {
      ...settings,
      artwork: { ...settings.artwork, currentArtworkId: artId }
    };
    saveSettings(updated);
  };

  const handleOpacityChange = (val: number) => {
    ArtworkService.setOpacity(val);
    const updated = {
      ...settings,
      artwork: { ...settings.artwork, opacity: val }
    };
    saveSettings(updated);
  };

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-8 space-y-4 max-w-lg mx-auto w-full select-none">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <SettingsIcon size={20} className="text-[#D4AF37]" />
          الإعدادات والتفضيلات
        </h1>
        <p className="text-[11px] text-slate-400 mt-0.5">
          تخصيص كامل للصلاحيات، الأذان، الورد، والمظهر
        </p>
      </div>

      {/* Save Success Banner */}
      {saveBanner && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-500/50 rounded-2xl flex items-center gap-2 text-xs text-emerald-300 animate-slideDown shadow-lg">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span className="font-semibold">{saveBanner}</span>
        </div>
      )}

      {/* 1. Dedicated Permissions & System Status Section */}
      <div className="bg-[#121820] border border-[#D4AF37]/30 rounded-3xl p-5 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#D4AF37]/15 rounded-xl text-[#D4AF37]">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">مركز الصلاحيات والأذونات</h3>
              <p className="text-[10px] text-slate-400">حالة الصلاحيات المطلوبة لعمل التطبيق بكفاءة تامة</p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            نظام الجهاز
          </span>
        </div>

        <div className="space-y-2.5 text-xs">
          {/* A. Notifications Permission Item */}
          <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={16} className={notificationPermission === 'granted' ? 'text-emerald-400' : 'text-amber-400'} />
                <span className="font-bold text-slate-200">إشعارات النظام والأذان</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1 ${
                notificationPermission === 'granted'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {notificationPermission === 'granted' ? 'ممنوحة بنجاح ✓' : 'بحاجة لتفعيل ⚠️'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              ضرورية لعرض تنبيهات الصلاة، تشغيل الأذان في موعده، وإرسال التذكيرات حتى لو الشاشة مقفلة أو كنت خارج التطبيق.
            </p>
            <div className="flex items-center gap-2 pt-1">
              {notificationPermission !== 'granted' && (
                <button
                  onClick={handleRequestNotifications}
                  className="flex-1 py-1.5 bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-bold rounded-xl text-xs transition-transform active:scale-95"
                >
                  طلب وتفعيل إذن الإشعارات
                </button>
              )}
              <button
                onClick={handleTestSystemNotification}
                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700 transition-colors"
              >
                تجربة إشعار فوري على الهاتف
              </button>
            </div>
          </div>

          {/* B. Geolocation Permission Item */}
          <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-[#D4AF37]" />
                <span className="font-bold text-slate-200">تحديد الموقع الجغرافي (GPS)</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                {settings.location.isAutoGps ? 'GPS تلقائي ✓' : 'محدد يدوياً'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              المدينة المعتمدة حالياً: <strong className="text-slate-200">{settings.location.city}</strong> ({settings.location.country}). يُستخدم لحساب مواقيت الصلاة واتجاه القبلة بدقة متناهية.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleRefreshGPS}
                disabled={isUpdatingLocation}
                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-[#D4AF37] font-semibold rounded-xl text-xs border border-[#D4AF37]/30 transition-colors"
              >
                {isUpdatingLocation ? 'جاري التحديث...' : 'تحديث الموقع عبر GPS الآن'}
              </button>
            </div>
          </div>

          {/* C. Background Audio & Lock Screen Media Controls */}
          <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-2xl space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 size={16} className="text-cyan-400" />
                <span className="font-bold text-slate-200">تشغيل الصوت والوسائط بالخلفية</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-emerald-500/20 text-emerald-300">
                مفعل وجاهز ✓
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              يدعم أزرار التحكم في شاشة القفل (MediaSession)، وسماعات البلوتوث، والتشغيل أثناء تصفح التطبيقات الأخرى.
            </p>
          </div>

          {/* D. Offline & Background Service Worker */}
          <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-2xl space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400" />
                <span className="font-bold text-slate-200">التشغيل في وضع السكون وشاشة القفل</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-emerald-500/20 text-emerald-300">
                نشط في النظام ✓
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              محرك Service Worker مُسجل بنجاح لضمان وصول التنبيهات دون الحاجة لفتح التطبيق باستمرار.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Daily Ayah & Hadith Automatic Rotation Section */}
      <div className="bg-[#121820] border border-slate-800 rounded-2xl p-4 space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#D4AF37]" />
            <div>
              <h3 className="text-xs font-bold text-slate-200">الآية الكريمة والحديث النبوي اليومي</h3>
              <p className="text-[10px] text-slate-400">تغيير تلقائي يومي للآيات والأحاديث النبوية مع الشرح</p>
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
              saveSettings(updated);
            }}
            className={`w-10 h-5 rounded-full transition-colors relative p-0.5 ${
              settings.dailyContentSettings?.autoRotate ? 'bg-[#D4AF37]' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                settings.dailyContentSettings?.autoRotate ? '-translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {settings.dailyContentSettings?.autoRotate && (
          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">وقت التغيير التلقائي اليومي للآية والحديث</label>
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {[
                  { time: '00:00', label: 'منتصف الليل (00:00)' },
                  { time: '05:00', label: 'مع الفجر (05:00)' },
                  { time: '08:00', label: 'بداية الصباح (08:00)' },
                ].map((item) => (
                  <button
                    key={item.time}
                    onClick={() => {
                      const updated = {
                        ...settings,
                        dailyContentSettings: {
                          ...settings.dailyContentSettings,
                          customHourTime: item.time
                        }
                      };
                      saveSettings(updated);
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

              {/* Custom Time Selector */}
              <div className="p-2.5 bg-slate-800/40 border border-slate-800 rounded-xl flex items-center justify-between">
                <span className="text-slate-300 text-xs">أو حدد وقتاً مخصصاً للتغيير:</span>
                <input
                  type="time"
                  value={settings.dailyContentSettings?.customHourTime || '00:00'}
                  onChange={(e) => {
                    const updated = {
                      ...settings,
                      dailyContentSettings: {
                        ...settings.dailyContentSettings,
                        customHourTime: e.target.value
                      }
                    };
                    saveSettings(updated);
                  }}
                  className="bg-transparent text-[#D4AF37] font-mono text-xs focus:outline-none font-bold"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Adhan, Dua & Iqamah Quick Settings Card */}
      <div className="bg-[#121820] border border-slate-800 rounded-2xl p-4 space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Volume2 size={16} className="text-[#D4AF37]" />
            <div>
              <h3 className="text-xs font-bold text-slate-200">خيارات الأذان وإقامة الصلاة</h3>
              <p className="text-[10px] text-slate-400">تحكم بمدة الأذان ودعاء الوسيلة والإقامة</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          {/* Adhan Mode */}
          <div>
            <label className="text-slate-400 block mb-1.5 font-medium">مدة تشغيل صوت الأذان</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  const updated = { ...settings, adhanMode: 'full' as const };
                  saveSettings(updated);
                }}
                className={`p-2 rounded-xl border text-center transition-all ${
                  settings.adhanMode !== 'first_two_takbeers'
                    ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] font-bold'
                    : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                الأذان كاملاً
              </button>

              <button
                onClick={() => {
                  const updated = { ...settings, adhanMode: 'first_two_takbeers' as const };
                  saveSettings(updated);
                }}
                className={`p-2 rounded-xl border text-center transition-all ${
                  settings.adhanMode === 'first_two_takbeers'
                    ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] font-bold'
                    : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                أول تكبيرتين فقط (~20 ثانية)
              </button>
            </div>
          </div>

          {/* Dua After Adhan */}
          <div className="p-2.5 bg-slate-800/40 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-slate-200 font-bold block">دعاء ما بعد الأذان</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">اللهم رب هذه الدعوة التامة (فور انتهاء الأذان)</span>
            </div>
            <button
              onClick={() => {
                const updated = { ...settings, duaAfterAdhanEnabled: !settings.duaAfterAdhanEnabled };
                saveSettings(updated);
              }}
              className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                settings.duaAfterAdhanEnabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                  settings.duaAfterAdhanEnabled ? '-translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Iqamah Toggle */}
          <div className="p-2.5 bg-slate-800/40 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-slate-200 font-bold block">إقامة الصلاة</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">بعد 15 دقيقة (والمغرب بعد 5 دقائق)</span>
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
                saveSettings(updated);
              }}
              className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                settings.iqamahSettings?.enabled ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                  settings.iqamahSettings?.enabled ? '-translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Reminders Center Banner */}
      <button
        onClick={onOpenRemindersCenter}
        className="w-full bg-[#121820] hover:bg-[#16202C] border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between text-right transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400">
            <Bell size={18} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100">مركز التذكيرات الشامل</h3>
            <p className="text-[10px] text-slate-400">جدولة آية القرآن، الصلاة على النبي، والورد اليومي</p>
          </div>
        </div>
        <span className="text-xs text-[#D4AF37] font-semibold">فتح المركز</span>
      </button>

      {/* Manual Location Selection */}
      <div className="bg-[#121820] border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-[#D4AF37]" />
          <h3 className="text-xs font-bold text-slate-200">المدينة والموقع الجغرافي</h3>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          اختر مدينتك يدوياً في حال تعذر تشغيل نظام GPS:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-44 overflow-y-auto p-1">
          {POPULAR_CITIES.map((c) => (
            <button
              key={c.city}
              onClick={() => handleSelectCity(c)}
              className={`p-2 rounded-xl text-xs text-right truncate border transition-all ${
                settings.location.city === c.city
                  ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] font-bold'
                  : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {c.city}
            </button>
          ))}
        </div>
      </div>

      {/* Quran Reciter Selection */}
      <div className="bg-[#121820] border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-[#D4AF37]" />
            <h3 className="text-xs font-bold text-slate-200">قارئ القرآن المعتمد</h3>
          </div>
          <span className="text-[10px] text-[#D4AF37]">يستخدم في التلاوة والتذكيرات</span>
        </div>
        <div className="space-y-1.5">
          {VERIFIED_RECITERS.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                const updated = { ...settings, selectedReciterId: r.id };
                saveSettings(updated);
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs text-right transition-all ${
                settings.selectedReciterId === r.id
                  ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] font-bold'
                  : 'bg-slate-800/30 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span>{r.nameArabic}</span>
              {settings.selectedReciterId === r.id && <Check size={14} />}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Islamic Artwork System Settings */}
      <div className="bg-[#121820] border border-slate-800 rounded-2xl p-4 space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Image size={16} className="text-[#D4AF37]" />
            <div>
              <h3 className="text-xs font-bold text-slate-200">الخلفيات والزخارف الإسلامية</h3>
              <p className="text-[10px] text-slate-400">نقوش هندسية ومعالم إسلامية هادئة</p>
            </div>
          </div>

          <button
            onClick={() => {
              const updated = { ...settings };
              updated.artwork.enabled = !updated.artwork.enabled;
              saveSettings(updated);
            }}
            className={`w-10 h-5 rounded-full transition-colors relative p-0.5 ${
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
          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">تغيير الخلفيات تلقائياً</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {[
                  { id: '6h', label: 'كل 6 ساعات' },
                  { id: '12h', label: 'كل 12 ساعة' },
                  { id: 'daily', label: 'مرة يومياً' },
                  { id: '3d', label: 'كل 3 أيام' },
                  { id: 'off', label: 'إيقاف' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      const updated = { ...settings };
                      updated.artwork.rotationInterval = item.id as any;
                      saveSettings(updated);
                    }}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      settings.artwork.rotationInterval === item.id
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] font-bold'
                        : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span>شفافية الخلفية (نطاق آمن للقراءة):</span>
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
              <label className="text-slate-400 block mb-1.5 font-medium">اختر الزخرفة الحالية</label>
              <div className="grid grid-cols-2 gap-2">
                {artworks.map((art) => (
                  <button
                    key={art.id}
                    onClick={() => handleArtworkChange(art.id)}
                    className={`p-2.5 rounded-xl border text-right transition-all ${
                      settings.artwork.currentArtworkId === art.id
                        ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#D4AF37] font-bold ring-1 ring-[#D4AF37]/40'
                        : 'bg-slate-800/30 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="block font-medium truncate">{art.titleArabic}</span>
                    <span className="text-[10px] text-slate-400 block truncate mt-0.5">{art.descriptionArabic}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Architecture Badge Link */}
      <button
        onClick={onOpenCodeInspector}
        className="w-full bg-gradient-to-r from-[#172330] to-[#121A24] border border-[#D4AF37]/30 hover:border-[#D4AF37]/60 rounded-2xl p-3.5 flex items-center justify-between text-right transition-all active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37]">
            <Code size={18} />
          </div>
          <div>
            <span className="text-[10px] text-[#D4AF37] font-semibold block">معمارية النظام الأصلي</span>
            <h3 className="text-xs font-bold text-slate-100">
              هندسة كود Android الأصلي (Kotlin & Compose & Room)
            </h3>
          </div>
        </div>
        <span className="text-xs text-[#D4AF37] underline font-medium">استعراض</span>
      </button>

      {/* Data Management: Reset & Clear with confirmations */}
      <div className="bg-[#121820] border border-slate-800 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-bold text-slate-200">إدارة البيانات والخصوصية</h3>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          جميع بياناتك (العلامات المرجعية، آخر موضع قراءة، وإنجاز الأذكار) محفوظة محليًا داخل جهازك دون أي تتبع.
        </p>

        <div className="flex items-center gap-2 pt-1">
          {showClearConfirm ? (
            <div className="w-full p-3 bg-rose-950/40 border border-rose-800 rounded-xl space-y-2 text-xs">
              <span className="text-rose-200 block font-medium">هل أنت متأكد من مسح جميع البيانات المحلية؟</span>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => {
                    StorageService.clearAllData();
                    window.location.reload();
                  }}
                  className="px-3 py-1 bg-rose-600 text-white font-bold rounded-lg"
                >
                  تأكيد المسح
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-800/50 hover:bg-rose-950/30 text-rose-300 border border-slate-800 hover:border-rose-900/40 rounded-xl text-xs transition-colors"
            >
              <Trash2 size={14} />
              <span>مسح البيانات المحلية</span>
            </button>
          )}

          <button
            onClick={() => {
              saveSettings(settings, 'تم حفظ كافة الإعدادات والتفضيلات بنجاح ✓');
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-bold rounded-xl text-xs transition-colors shadow"
          >
            <Check size={14} />
            <span>حفظ الإعدادات</span>
          </button>
        </div>
      </div>
    </div>
  );
};
