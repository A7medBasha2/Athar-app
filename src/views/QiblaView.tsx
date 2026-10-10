import React, { useState, useEffect, useRef } from 'react';
import { Coordinates } from '../types';
import { QiblaService } from '../services/qiblaService';
import { LocationService } from '../services/locationService';
import { StorageService } from '../services/storageService';
import { POPULAR_CITIES } from '../data/citiesData';
import { earconEngine } from '../services/voiceAssistantService';
import { Compass, MapPin, CheckCircle2, RefreshCw, Sparkles, Navigation, Check, X } from 'lucide-react';

interface QiblaViewProps {
  coordinates: Coordinates;
  onLocationChange?: (coords: Coordinates) => void;
}

export const QiblaView: React.FC<QiblaViewProps> = ({ coordinates, onLocationChange }) => {
  const qiblaBearing = QiblaService.calculateQiblaBearing(coordinates);
  const [deviceHeading, setDeviceHeading] = useState<number>(() => Math.round(qiblaBearing));
  const [hasCompassSensor, setHasCompassSensor] = useState<boolean>(false);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState<boolean>(false);
  const [isCityPickerOpen, setIsCityPickerOpen] = useState<boolean>(false);
  const [hapticTriggeredPulse, setHapticTriggeredPulse] = useState<boolean>(false);
  const wasAlignedRef = useRef<boolean>(false);

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      let heading: number | null = null;

      if ('webkitCompassHeading' in e && typeof (e as any).webkitCompassHeading === 'number') {
        heading = (e as any).webkitCompassHeading;
      } else if (e.alpha !== null) {
        heading = 360 - e.alpha;
      }

      if (heading !== null) {
        setHasCompassSensor(true);
        setDeviceHeading(heading);
      }
    };

    window.addEventListener('deviceorientationabsolute', handleOrientation as any);
    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as any);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  const qiblaData = QiblaService.getQiblaData(coordinates, deviceHeading);

  // Calculate simple alignment accuracy percentage (0% to 100%) without showing complex angles
  const absOffset = Math.abs(qiblaData.offset);
  const alignmentAccuracy = qiblaData.isAligned
    ? 100
    : Math.max(0, Math.min(99, Math.round((1 - absOffset / 180) * 100)));

  // Trigger physical Haptic Feedback immediately when 100% aligned
  useEffect(() => {
    if (qiblaData.isAligned && !wasAlignedRef.current) {
      wasAlignedRef.current = true;
      setHapticTriggeredPulse(true);

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([100, 50, 180]);
        } catch {}
      }
      earconEngine.playSuccessChime();

      const timer = setTimeout(() => setHapticTriggeredPulse(false), 1800);
      return () => clearTimeout(timer);
    } else if (!qiblaData.isAligned) {
      wasAlignedRef.current = false;
    }
  }, [qiblaData.isAligned]);

  const handleRefreshGPS = async () => {
    setIsRefreshingLocation(true);
    const result = await LocationService.getCurrentPosition();
    setIsRefreshingLocation(false);
    if (result.coords) {
      const s = StorageService.getSettings();
      s.location = result.coords;
      StorageService.saveSettings(s);
      onLocationChange?.(result.coords);
      setDeviceHeading(Math.round(QiblaService.calculateQiblaBearing(result.coords)));
    }
  };

  const handleSelectCity = (city: Coordinates) => {
    const s = StorageService.getSettings();
    s.location = city;
    StorageService.saveSettings(s);
    onLocationChange?.(city);
    setDeviceHeading(Math.round(QiblaService.calculateQiblaBearing(city)));
    setIsCityPickerOpen(false);
  };

  const handleAlign100Percent = () => {
    wasAlignedRef.current = false;
    setDeviceHeading(Math.round(qiblaData.bearing));
  };

  return (
    <div className="athar-page-container items-center text-center">
      {/* Unified Header — Location Badge is exclusively here in Qibla section */}
      <div className="w-full flex items-center justify-between text-right pb-2 border-b border-[#D4AF37]/25">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Compass size={22} className="text-[#D4AF37]" />
            <span>بوصلة القبلة</span>
          </h1>
          <p className="text-xs text-white/85 font-medium mt-0.5">
            مؤشر الكعبة الذهبي المضيء مع اهتزاز التوجيه الفوري
          </p>
        </div>

        {/* Exclusive Location Button in Qibla Section */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsCityPickerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0F151E] hover:bg-[#161F2C] border border-[#D4AF37]/50 rounded-xl text-xs text-white font-bold transition-all active:scale-95 shadow-md"
            title="تغيير أو تحديث الموقع الجغرافي"
            aria-label="الموقع الجغرافي"
          >
            <MapPin size={14} className="text-[#D4AF37] shrink-0" />
            <span className="truncate max-w-[110px]">{coordinates.city || 'القاهرة'}</span>
          </button>
          <button
            onClick={handleRefreshGPS}
            disabled={isRefreshingLocation}
            className="p-2 bg-[#0F151E] hover:bg-[#161F2C] border border-[#D4AF37]/50 rounded-xl text-[#D4AF37] transition-all active:scale-95 shadow-md"
            title="تحديث الموقع عبر GPS"
            aria-label="تحديث الموقع عبر GPS"
          >
            <RefreshCw size={14} className={isRefreshingLocation ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* High-Contrast Status Card */}
      <div
        className={`w-full p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
          qiblaData.isAligned
            ? 'bg-gradient-to-r from-[#1D1708] via-[#141006] to-[#1D1708] border-[#F5D76E] shadow-[0_0_25px_rgba(212,175,55,0.35)]'
            : 'bg-[#0A0E14] border-[#D4AF37]/35'
        }`}
      >
        <div className="flex items-center gap-3 text-right">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
              qiblaData.isAligned
                ? 'bg-[#D4AF37] text-[#040609] shadow-[0_0_15px_rgba(245,215,110,0.8)]'
                : 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40'
            }`}
          >
            {qiblaData.isAligned ? <CheckCircle2 size={22} /> : <Sparkles size={20} />}
          </div>
          <div>
            <span className="text-sm font-extrabold text-white block">
              {qiblaData.isAligned
                ? 'اتجاه القبلة الصحيح ١٠٠٪'
                : 'وجّه الهاتف نحو مؤشر الكعبة الذهبي'}
            </span>
            <span className="text-xs text-[#F5D76E] font-semibold block mt-0.5">
              {qiblaData.isAligned
                ? 'أنت تواجه الكعبة المشرفة الآن · تم التثبيت بالاهتزاز'
                : 'حرّك هاتفك بهدوء حتى تضيء الكعبة باللون الذهبي الكامل'}
            </span>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-[#05070A] border border-[#D4AF37]/50 text-[#F5D76E] font-extrabold text-sm font-mono tabular-nums shrink-0">
          {alignmentAccuracy}٪
        </div>
      </div>

      {/* Simplified Golden Illuminated Kaaba Compass (Zero complex lines or angles) */}
      <div className="relative w-72 h-72 my-3 flex items-center justify-center">
        {/* Ambient Golden Glow Aura */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-500 pointer-events-none ${
            qiblaData.isAligned
              ? 'bg-[#D4AF37]/35 blur-3xl scale-105'
              : 'bg-[#D4AF37]/10 blur-2xl scale-95'
          }`}
        />

        {/* Clean Dark Obsidian Sanctuary Dial */}
        <div
          className={`relative w-full h-full rounded-full bg-gradient-to-b from-[#0C1118] to-[#05070A] flex items-center justify-center transition-all duration-300 ${
            qiblaData.isAligned
              ? 'border-[3px] border-[#F5D76E] shadow-[0_0_45px_rgba(212,175,55,0.5),inset_0_0_35px_rgba(212,175,55,0.22)]'
              : 'border-2 border-[#D4AF37]/40 shadow-[0_15px_40px_rgba(0,0,0,0.85)]'
          }`}
        >
          {/* Top Alignment Target Notch */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
            <div
              className={`w-5 h-5 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                qiblaData.isAligned
                  ? 'bg-[#F5D76E] border-white shadow-[0_0_20px_#F5D76E] scale-110'
                  : 'bg-[#0A0E14] border-[#D4AF37]'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-[#D4AF37]" />
            </div>
          </div>

          {/* Rotating Golden Kaaba Indicator Assembly */}
          <div
            className="w-full h-full flex flex-col items-center justify-start pt-7 transition-transform duration-200 ease-out pointer-events-none"
            style={{ transform: `rotate(${qiblaData.offset}deg)` }}
          >
            {/* Golden Illuminated Pointer Beam leading to Kaaba */}
            <div
              className={`w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-b-[26px] mb-2 transition-all duration-300 ${
                qiblaData.isAligned
                  ? 'border-b-[#FFF3B0] drop-shadow-[0_0_16px_rgba(245,215,110,1)]'
                  : 'border-b-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.65)]'
              }`}
            />

            {/* Illuminated Golden Kaaba Emblem */}
            <div
              className={`relative w-28 h-28 rounded-3xl flex flex-col items-center justify-center transition-all duration-300 ${
                qiblaData.isAligned
                  ? 'bg-gradient-to-b from-[#2A200B] to-[#120E04] border-2 border-[#FFF3B0] shadow-[0_0_40px_rgba(245,215,110,0.85)] scale-105'
                  : 'bg-[#0D131C] border-2 border-[#D4AF37]/70 shadow-[0_0_22px_rgba(212,175,55,0.35)]'
              }`}
            >
              {/* High-Contrast Golden Kaaba Vector Icon */}
              <svg viewBox="0 0 64 64" className="w-16 h-16 overflow-visible">
                <defs>
                  <linearGradient id="kaabaGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFF6D6" />
                    <stop offset="50%" stopColor="#F5D76E" />
                    <stop offset="100%" stopColor="#D4AF37" />
                  </linearGradient>
                </defs>
                {/* Kaaba Cube Body */}
                <rect
                  x="12"
                  y="14"
                  width="40"
                  height="38"
                  rx="4"
                  fill="#05070A"
                  stroke="url(#kaabaGold)"
                  strokeWidth="2.5"
                />
                {/* Golden Kiswah Band (حزام الكعبة الذهبي المضيء) */}
                <rect
                  x="12"
                  y="22"
                  width="40"
                  height="7"
                  fill="url(#kaabaGold)"
                />
                {/* Golden Kaaba Door (باب الكعبة الملتزم) */}
                <rect
                  x="35"
                  y="33"
                  width="9"
                  height="15"
                  rx="1.5"
                  fill="url(#kaabaGold)"
                />
                {/* Golden Lanterns / Ornaments */}
                <circle cx="20" cy="36" r="2.2" fill="url(#kaabaGold)" />
                <circle cx="28" cy="36" r="2.2" fill="url(#kaabaGold)" />
              </svg>

              <span
                className={`text-[11px] font-extrabold mt-1 tracking-wide ${
                  qiblaData.isAligned ? 'text-[#FFF6D6]' : 'text-[#F5D76E]'
                }`}
              >
                الكعبة المشرفة
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Haptic Feedback & Distance Summary Row */}
      <div className="w-full grid grid-cols-2 gap-3 text-right">
        <div className="athar-card flex flex-col justify-between">
          <span className="text-xs text-white/85 font-semibold block">المسافة إلى الكعبة</span>
          <span className="text-lg font-extrabold text-white font-mono tabular-nums mt-1 block">
            {qiblaData.distanceKm.toLocaleString('ar-EG')} كم
          </span>
        </div>

        <div
          className={`athar-card flex flex-col justify-between transition-all ${
            hapticTriggeredPulse || qiblaData.isAligned
              ? 'border-[#F5D76E] bg-[#191407]'
              : ''
          }`}
        >
          <span className="text-xs text-white/85 font-semibold block">الاهتزاز الفيزيائي</span>
          <span className="text-sm font-extrabold text-[#F5D76E] mt-1 block">
            {qiblaData.isAligned ? 'نشط · تم الضبط ١٠٠٪ ✓' : 'يهتز عند الضبط ١٠٠٪'}
          </span>
        </div>
      </div>

      {/* Interactive Alignment Control & Simulator for Quick Verification */}
      <div className="w-full athar-card text-right space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
            <Compass size={15} className="text-[#D4AF37]" />
            <span>ضبط وتجربة اتجاه البوصلة</span>
          </span>
          <button
            onClick={handleAlign100Percent}
            className="px-3 py-1.5 rounded-xl bg-[#D4AF37] hover:bg-[#F5D76E] text-[#040609] font-extrabold text-xs transition-transform active:scale-95 shadow"
          >
            ضبط الاتجاه ١٠٠٪ الآن
          </button>
        </div>

        <input
          type="range"
          min="0"
          max="360"
          value={Math.round(deviceHeading)}
          onChange={(e) => setDeviceHeading(Number(e.target.value))}
          className="w-full accent-[#D4AF37] cursor-pointer h-2 bg-[#161F2C] rounded-lg"
          aria-label="تدوير البوصلة"
        />
      </div>

      {/* City Picker Modal (Exclusively in Qibla Section) */}
      {isCityPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0A0E14] border border-[#D4AF37]/50 rounded-3xl p-5 space-y-4 text-right shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-[#D4AF37]" />
                <h3 className="text-base font-extrabold text-white">تحديد موقع القبلة</h3>
              </div>
              <button
                onClick={() => setIsCityPickerOpen(false)}
                className="p-1.5 rounded-xl bg-[#141C27] text-white hover:text-[#D4AF37] border border-white/10"
              >
                <X size={16} />
              </button>
            </div>

            <button
              onClick={() => {
                setIsCityPickerOpen(false);
                handleRefreshGPS();
              }}
              className="w-full athar-btn-primary flex items-center justify-center gap-2 text-xs"
            >
              <Navigation size={15} />
              <span>تحديد موقعي الحالي تلقائياً عبر GPS</span>
            </button>

            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pt-1">
              {POPULAR_CITIES.map((city) => {
                const isSelected = coordinates.city === city.city;
                return (
                  <button
                    key={city.city}
                    onClick={() => handleSelectCity(city)}
                    className={`p-3 rounded-xl border text-xs font-bold text-right flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-[#D4AF37]/20 border-[#F5D76E] text-[#F5D76E]'
                        : 'bg-[#0F151E] border-white/10 text-white hover:border-[#D4AF37]/50'
                    }`}
                  >
                    <span className="truncate">{city.city}</span>
                    {isSelected && <Check size={14} className="shrink-0 text-[#F5D76E]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
