import React, { useState, useEffect } from 'react';
import { Coordinates, PrayerCalculationMethod, PrayerTimesData } from '../types';
import { PrayerTimesService, formatPrayerTime12 } from '../services/prayerTimesService';
import { StorageService } from '../services/storageService';
import { AudioService, ActiveAudioState } from '../services/audioService';
import { LocationService } from '../services/locationService';
import { Clock, Volume2, Bell, Check, MapPin, ChevronDown, RefreshCw } from 'lucide-react';

interface PrayersViewProps {
  coordinates: Coordinates;
  onLocationChange: (coords: Coordinates) => void;
}

export const PrayersView: React.FC<PrayersViewProps> = ({ coordinates, onLocationChange }) => {
  const [prayerData, setPrayerData] = useState<PrayerTimesData | null>(null);
  const [method, setMethod] = useState<PrayerCalculationMethod>('5');
  const [adhanVoice, setAdhanVoice] = useState<'alafasy' | 'makkah' | 'madinah' | 'alaqsa'>('alafasy');
  const [activeAudio, setActiveAudio] = useState<ActiveAudioState | null>(null);
  const [isMethodDropdownOpen, setIsMethodDropdownOpen] = useState<boolean>(false);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState<boolean>(false);

  const calculationMethods: { id: PrayerCalculationMethod; name: string }[] = [
    { id: '5', name: 'الهيئة المصرية العامة للمساحة (الافتراضي)' },
    { id: '4', name: 'جامعة أم القرى - مكة المكرمة' },
    { id: '3', name: 'رابطة العالم الإسلامي' },
    { id: '1', name: 'جامعة العلوم الإسلامية بكراتشي' },
    { id: '16', name: 'الهيئة العامة للشؤون الإسلامية والأوقاف (الإمارات)' },
    { id: '2', name: 'الجمعية الإسلامية لأمريكا الشمالية (ISNA)' },
  ];

  useEffect(() => {
    const settings = StorageService.getSettings();
    setMethod(settings.calculationMethod);
    setAdhanVoice(settings.adhanVoice);
    loadData(settings.calculationMethod);

    const unsub = AudioService.subscribe(setActiveAudio);
    return () => unsub();
  }, [coordinates]);

  const loadData = async (m: PrayerCalculationMethod) => {
    try {
      const data = await PrayerTimesService.getPrayerTimes(coordinates, m);
      setPrayerData(data);
    } catch {
      // Handled
    }
  };

  const handleMethodChange = (newMethod: PrayerCalculationMethod) => {
    setMethod(newMethod);
    setIsMethodDropdownOpen(false);
    const settings = StorageService.getSettings();
    settings.calculationMethod = newMethod;
    StorageService.saveSettings(settings);
    loadData(newMethod);
  };

  const handleRefreshLocation = async () => {
    setIsRefreshingLocation(true);
    const result = await LocationService.getCurrentPosition();
    if (result.coords) {
      onLocationChange(result.coords);
    }
    setIsRefreshingLocation(false);
  };

  const isTestingAdhan = activeAudio?.category === 'adhan' && activeAudio.isPlaying;

  const handleTestAdhan = async () => {
    if (isTestingAdhan) {
      AudioService.stop();
    } else {
      await AudioService.playAdhan(adhanVoice);
    }
  };

  const prayerRows = [
    { id: 'fajr', name: 'الفجر', time: prayerData?.timings.fajr, desc: 'من طلوع الفجر الصادق حتى طلوع الشمس' },
    { id: 'sunrise', name: 'الشروق', time: prayerData?.timings.sunrise, desc: 'وقت انتهاء صلاة الفجر وبداية وقت الإشراق' },
    { id: 'dhuhr', name: 'الظهر', time: prayerData?.timings.dhuhr, desc: 'من زوال الشمس عن كبد السماء حتى مصير ظل الشيء مثله' },
    { id: 'asr', name: 'العصر', time: prayerData?.timings.asr, desc: 'من مصير ظل الشيء مثله حتى اصفرار الشمس' },
    { id: 'maghrib', name: 'المغرب', time: prayerData?.timings.maghrib, desc: 'من غروب قرص الشمس حتى مغيب الشفق الأحمر' },
    { id: 'isha', name: 'العشاء', time: prayerData?.timings.isha, desc: 'من مغيب الشفق الأحمر حتى منتصف الليل' },
  ];

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-8 space-y-4 max-w-lg mx-auto w-full select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Clock size={20} className="text-[#D4AF37]" />
            مواقيت الصلاة
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5">
            حساب فلكي دقيق بنظام ١٢ ساعة وفق المنهج المعتمد
          </p>
        </div>

        {/* Location chip / GPS update button */}
        <button
          onClick={handleRefreshLocation}
          disabled={isRefreshingLocation}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141B24] hover:bg-[#1A232E] border border-slate-800 rounded-full text-xs text-slate-300 transition-colors active:scale-95"
          title="تحديث الموقع الجغرافي وحساب المواقيت بدقة"
          aria-label="تحديث الموقع"
        >
          <MapPin size={12} className="text-[#D4AF37]" />
          <span className="truncate max-w-[120px]">{coordinates.city || 'القاهرة'}</span>
          <RefreshCw size={11} className={`text-slate-400 ${isRefreshingLocation ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Calculation Method Selector */}
      <div className="relative">
        <label className="text-[11px] text-slate-400 block mb-1">طريقة الحساب الفلكي المعتمدة</label>
        <button
          onClick={() => setIsMethodDropdownOpen(!isMethodDropdownOpen)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#121820] border border-slate-800 hover:border-[#D4AF37]/40 rounded-xl text-right text-xs text-slate-200 transition-colors"
        >
          <span className="truncate">{calculationMethods.find(m => m.id === method)?.name}</span>
          <ChevronDown size={14} className="text-slate-400 shrink-0" />
        </button>

        {isMethodDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 z-40 bg-[#151D26] border border-slate-700 rounded-xl shadow-2xl overflow-hidden text-xs">
            {calculationMethods.map((m) => (
              <button
                key={m.id}
                onClick={() => handleMethodChange(m.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-right transition-colors ${
                  method === m.id
                    ? 'bg-[#D4AF37]/20 text-[#D4AF37] font-bold'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <span>{m.name}</span>
                {method === m.id && <Check size={14} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Prayer Times List */}
      <div className="space-y-2">
        {prayerRows.map((row) => {
          const isNext = prayerData?.nextPrayer?.id === row.id;
          const isCurrent = prayerData?.currentPrayer?.id === row.id;
          return (
            <div
              key={row.id}
              className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 ${
                isNext
                  ? 'bg-gradient-to-r from-[#17202C] to-[#121820] border-[#D4AF37]/50 shadow-lg ring-1 ring-[#D4AF37]/20'
                  : isCurrent
                  ? 'bg-[#121820]/90 border-slate-700/60'
                  : 'bg-[#0E1318]/70 border-slate-800/70 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    isNext
                      ? 'bg-[#D4AF37] text-slate-950 shadow-md'
                      : isCurrent
                      ? 'bg-[#D4AF37]/15 text-[#D4AF37]'
                      : 'bg-slate-800/40 text-slate-400'
                  }`}
                >
                  {row.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${isNext ? 'text-[#D4AF37]' : 'text-slate-100'}`}>
                      {row.name}
                    </span>
                    {isNext && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#D4AF37]/20 text-[#D4AF37] font-semibold">
                        الصلاة القادمة
                      </span>
                    )}
                    {isCurrent && !isNext && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                        الصلاة الحالية
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 hidden sm:block">{row.desc}</p>
                </div>
              </div>

              <div className="text-left font-mono tabular-nums">
                <span className={`text-base font-extrabold ${isNext ? 'text-[#D4AF37]' : 'text-slate-100'}`}>
                  {formatPrayerTime12(row.time)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Adhan Audio Settings & Test Button Card */}
      <div className="bg-[#121820] border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 size={16} className="text-[#D4AF37]" />
            <h3 className="text-xs font-bold text-slate-200">صوت الأذان والتنبيهات</h3>
          </div>
          <span className="text-[10px] text-slate-400">إشعار صوتي عند دخول الوقت</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { id: 'alafasy', label: 'الشيخ مشاري العفاسي' },
            { id: 'makkah', label: 'الحرم المكي الشريف' },
            { id: 'madinah', label: 'المسجد النبوي الشريف' },
            { id: 'alaqsa', label: 'المسجد الأقصى المبارك' },
          ].map((voice) => (
            <button
              key={voice.id}
              onClick={() => {
                setAdhanVoice(voice.id as any);
                const s = StorageService.getSettings();
                s.adhanVoice = voice.id as any;
                StorageService.saveSettings(s);
              }}
              className={`p-2.5 rounded-xl border text-right transition-all ${
                adhanVoice === voice.id
                  ? 'bg-[#D4AF37]/15 border-[#D4AF37]/50 text-[#D4AF37] font-bold'
                  : 'bg-slate-800/30 border-slate-800 text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              {voice.label}
            </button>
          ))}
        </div>

        {/* Test Adhan Button */}
        <div className="pt-2 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            تأكد من عمل الصوت والأذان في الخلفية
          </p>
          <button
            onClick={handleTestAdhan}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 ${
              isTestingAdhan
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-[#D4AF37] text-slate-950 hover:bg-[#E5C158]'
            }`}
          >
            <Volume2 size={14} />
            <span>{isTestingAdhan ? 'إيقاف الاختبار' : 'اختبار الأذان'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
