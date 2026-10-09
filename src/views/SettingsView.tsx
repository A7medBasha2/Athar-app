import React, { useState, useEffect } from 'react';
import { AppSettings, Coordinates, IslamicArtwork } from '../types';
import { StorageService } from '../services/storageService';
import { ArtworkService } from '../services/artworkService';
import { POPULAR_CITIES } from '../data/citiesData';
import { VERIFIED_RECITERS } from '../data/surahsData';
import { 
  Settings as SettingsIcon, Image, MapPin, Volume2, 
  Trash2, RotateCcw, Check, BookOpen, Bell, Code, Info, ShieldCheck
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
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  useEffect(() => {
    setSettings(StorageService.getSettings());
    setArtworks(ArtworkService.getArtworks());
  }, []);

  const saveSettings = (updated: AppSettings) => {
    setSettings(updated);
    StorageService.saveSettings(updated);
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
          تخصيص كامل للمظهر والتلاوة والمواقيت
        </p>
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
            <h3 className="text-xs font-bold text-slate-100">مركز التذكيرات والصلوات</h3>
            <p className="text-[10px] text-slate-400">تحكم بآية اليوم والصلاة على النبي وساعات الهدوء</p>
          </div>
        </div>
        <span className="text-xs text-slate-400">فتح</span>
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

      {/* Dynamic Islamic Artwork System Settings (Rules #5, #6, #47) */}
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
            {/* Rotation Interval */}
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

            {/* Opacity Slider (between 5% and 15% as recommended) */}
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

            {/* Artwork Selection Grid */}
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

      {/* Data Management: Reset & Clear with confirmations */}
      <div className="bg-[#121820] border border-slate-800 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-bold text-slate-200">إدارة البيانات والخصوصية</h3>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          جميع بياناتك (العلامات المرجعية، آخر موضع قراءة، وإنجاز الأذكار) محفوظة محليًا داخل جهازك.
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
              StorageService.saveSettings(settings);
              alert('تم حفظ الإعدادات بنجاح.');
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-bold rounded-xl text-xs transition-colors"
          >
            <Check size={14} />
            <span>حفظ الإعدادات</span>
          </button>
        </div>
      </div>
    </div>
  );
};
