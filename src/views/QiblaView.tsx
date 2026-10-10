import React, { useState, useEffect, useRef } from 'react';
import { Coordinates } from '../types';
import { QiblaService } from '../services/qiblaService';
import { LocationService } from '../services/locationService';
import { StorageService } from '../services/storageService';
import { POPULAR_CITIES } from '../data/citiesData';
import { earconEngine } from '../services/voiceAssistantService';
import {
  Compass,
  MapPin,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Navigation,
  Check,
  X,
  Search
} from 'lucide-react';

interface QiblaViewProps {
  coordinates: Coordinates;
  onLocationChange?: (coords: Coordinates) => void;
}

export const QiblaView: React.FC<QiblaViewProps> = ({ coordinates, onLocationChange }) => {
  const qiblaBearing = QiblaService.calculateQiblaBearing(coordinates);
  const [deviceHeading, setDeviceHeading] = useState<number>(() => Math.round(qiblaBearing));
  const [hasCompassSensor, setHasCompassSensor] = useState<boolean>(false);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState<boolean>(false);
  const [locationUpdateNotice, setLocationUpdateNotice] = useState<string | null>(null);
  const [isCityPickerOpen, setIsCityPickerOpen] = useState<boolean>(false);
  const [citySearchQuery, setCitySearchQuery] = useState<string>('');
  const [hapticTriggeredPulse, setHapticTriggeredPulse] = useState<boolean>(false);
  const wasAlignedRef = useRef<boolean>(false);
  const hasAbsoluteSensorRef = useRef<boolean>(false);

  // Live dynamic orientation listener that moves freely with phone rotation
  useEffect(() => {
    const handleAbsoluteOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null && !isNaN(e.alpha)) {
        hasAbsoluteSensorRef.current = true;
        setHasCompassSensor(true);
        setDeviceHeading((360 - e.alpha + 360) % 360);
      }
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (hasAbsoluteSensorRef.current) return;

      let heading: number | null = null;

      if ('webkitCompassHeading' in e && typeof (e as any).webkitCompassHeading === 'number') {
        heading = (e as any).webkitCompassHeading;
      } else if (e.alpha !== null && !isNaN(e.alpha)) {
        heading = (360 - e.alpha + 360) % 360;
      }

      if (heading !== null) {
        setHasCompassSensor(true);
        setDeviceHeading(heading);
      }
    };

    window.addEventListener('deviceorientationabsolute', handleAbsoluteOrientation as any, true);
    window.addEventListener('deviceorientation', handleOrientation, true);

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleAbsoluteOrientation as any, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, []);

  // Automatic high-accuracy GPS & region verification upon entering QiblaView and when moving
  useEffect(() => {
    let active = true;
    const autoVerifyLocationOnMount = async () => {
      if (!LocationService.isAutoTrackingEnabled()) return;

      const res = await LocationService.getCurrentPosition();
      if (active && res.coords && !res.error) {
        const latDiff = Math.abs(res.coords.latitude - coordinates.latitude);
        const lngDiff = Math.abs(res.coords.longitude - coordinates.longitude);
        if (latDiff > 0.0005 || lngDiff > 0.0005 || res.coords.city !== coordinates.city || !coordinates.isAutoGps) {
          const s = StorageService.getSettings();
          s.location = res.coords;
          StorageService.saveSettings(s);
          onLocationChange?.(res.coords);
          if (!hasCompassSensor) {
            setDeviceHeading(Math.round(QiblaService.calculateQiblaBearing(res.coords)));
          }
        }
      }
    };

    autoVerifyLocationOnMount();
    return () => {
      active = false;
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
    LocationService.setAutoTrackingEnabled(true);
    setIsRefreshingLocation(true);
    setLocationUpdateNotice(null);
    const result = await LocationService.getCurrentPosition();
    setIsRefreshingLocation(false);
    if (result.coords) {
      const updatedCoords: Coordinates = {
        ...result.coords,
        isAutoGps: true,
      };
      const s = StorageService.getSettings();
      s.location = updatedCoords;
      StorageService.saveSettings(s);
      onLocationChange?.(updatedCoords);
      if (!hasCompassSensor) {
        setDeviceHeading(Math.round(QiblaService.calculateQiblaBearing(updatedCoords)));
      }
      setLocationUpdateNotice(`التتبع التلقائي نشط · تم ضبط القبلة على منطقتك (${updatedCoords.city}) ✓`);
      setTimeout(() => setLocationUpdateNotice(null), 3500);
    }
  };

  const handleSelectCity = (city: Coordinates) => {
    LocationService.setAutoTrackingEnabled(false);
    const manualCoords: Coordinates = {
      ...city,
      isAutoGps: false,
    };
    const s = StorageService.getSettings();
    s.location = manualCoords;
    StorageService.saveSettings(s);
    onLocationChange?.(manualCoords);
    if (!hasCompassSensor) {
      setDeviceHeading(Math.round(QiblaService.calculateQiblaBearing(manualCoords)));
    }
    setIsCityPickerOpen(false);
    setLocationUpdateNotice(`تم اختيار مدينة ${manualCoords.city} بنجاح ✓`);
    setTimeout(() => setLocationUpdateNotice(null), 3500);
  };

  const handleAlign100Percent = () => {
    wasAlignedRef.current = false;
    setDeviceHeading(Math.round(qiblaData.bearing));
  };

  const filteredCities = POPULAR_CITIES.filter(
    (c) =>
      !citySearchQuery.trim() ||
      c.city.includes(citySearchQuery.trim()) ||
      c.country.includes(citySearchQuery.trim())
  );

  return (
    <div className="athar-page-container items-center text-center">
      {/* Clean Header (Without location clutter in the top bar) */}
      <div className="w-full flex items-center justify-between text-right pb-2 border-b border-[#D4AF37]/25">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Compass size={22} className="text-[#D4AF37]" />
            <span>بوصلة القبلة</span>
          </h1>
          <p className="text-xs text-white/85 font-medium mt-0.5">
            مؤشر الكعبة الذهبي المضيء المتحرك مع اهتزاز التوجيه الفوري
          </p>
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
                : 'حرّك هاتفك حتى تضيء الكعبة باللون الذهبي الكامل'}
            </span>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-[#0A0907] border border-[#C8A24A]/50 text-[#F3E5AB] font-extrabold text-sm font-mono tabular-nums shrink-0">
          {alignmentAccuracy}٪
        </div>
      </div>

      {/* Live Moving Golden Illuminated Kaaba Compass (Zero complex lines or angles) */}
      <div className="relative w-72 h-72 my-3 flex items-center justify-center">
        {/* Ambient Golden Glow Aura */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-500 pointer-events-none ${
            qiblaData.isAligned
              ? 'bg-[#C8A24A]/35 blur-3xl scale-105'
              : 'bg-[#C8A24A]/10 blur-2xl scale-95'
          }`}
        />

        {/* Clean Dark Obsidian Sanctuary Dial */}
        <div
          className={`relative w-full h-full rounded-full bg-gradient-to-b from-[#17140D] to-[#080705] flex items-center justify-center transition-all duration-300 ${
            qiblaData.isAligned
              ? 'border-[3px] border-[#E6C66E] shadow-[0_0_45px_rgba(200,162,74,0.5),inset_0_0_35px_rgba(200,162,74,0.22)]'
              : 'border-2 border-[#C8A24A]/45 shadow-[0_15px_40px_rgba(0,0,0,0.85)]'
          }`}
        >
          {/* Top Alignment Target Notch */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
            <div
              className={`w-5 h-5 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                qiblaData.isAligned
                  ? 'bg-[#E6C66E] border-white shadow-[0_0_20px_#E6C66E] scale-110'
                  : 'bg-[#12100B] border-[#C8A24A]'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-[#E6C66E]" />
            </div>
          </div>

          {/* Live Rotating Golden Kaaba Indicator Assembly */}
          <div
            className="w-full h-full flex flex-col items-center justify-start pt-7 transition-transform duration-150 ease-out pointer-events-none"
            style={{ transform: `rotate(${qiblaData.offset}deg)` }}
          >
            {/* Golden Illuminated Pointer Beam leading to Kaaba */}
            <div
              className={`w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-b-[26px] mb-2 transition-all duration-300 ${
                qiblaData.isAligned
                  ? 'border-b-[#FFF3B0] drop-shadow-[0_0_16px_rgba(230,198,110,1)]'
                  : 'border-b-[#C8A24A] drop-shadow-[0_0_8px_rgba(200,162,74,0.65)]'
              }`}
            />

            {/* Illuminated Golden Kaaba Emblem */}
            <div
              className={`relative w-28 h-28 rounded-3xl flex flex-col items-center justify-center transition-all duration-300 ${
                qiblaData.isAligned
                  ? 'bg-gradient-to-b from-[#2A200B] to-[#120E04] border-2 border-[#FFF3B0] shadow-[0_0_40px_rgba(230,198,110,0.85)] scale-105'
                  : 'bg-[#14120D] border-2 border-[#C8A24A]/70 shadow-[0_0_22px_rgba(200,162,74,0.35)]'
              }`}
            >
              {/* High-Contrast Golden Kaaba Vector Icon */}
              <svg viewBox="0 0 64 64" className="w-16 h-16 overflow-visible">
                <defs>
                  <linearGradient id="kaabaGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFF6D6" />
                    <stop offset="50%" stopColor="#E6C66E" />
                    <stop offset="100%" stopColor="#C8A24A" />
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
                {/* Golden Kiswah Band */}
                <rect
                  x="12"
                  y="22"
                  width="40"
                  height="7"
                  fill="url(#kaabaGold)"
                />
                {/* Golden Kaaba Door */}
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
                  qiblaData.isAligned ? 'text-[#FFF6D6]' : 'text-[#F3E5AB]'
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
          <span className="text-xs text-[#C4B998] font-bold block">المسافة إلى الكعبة</span>
          <span className="text-lg font-extrabold text-[#F3E5AB] font-mono tabular-nums mt-1 block">
            {qiblaData.distanceKm.toLocaleString('ar-EG')} كم
          </span>
        </div>

        <div
          className={`athar-card flex flex-col justify-between transition-all ${
            hapticTriggeredPulse || qiblaData.isAligned
              ? 'border-[#E6C66E] bg-[#1E1910]'
              : ''
          }`}
        >
          <span className="text-xs text-[#C4B998] font-bold block">الاهتزاز الفيزيائي</span>
          <span className="text-sm font-extrabold text-[#E6C66E] mt-1 block">
            {qiblaData.isAligned ? 'نشط · تم الضبط ١٠٠٪ ✓' : 'يهتز عند الضبط ١٠٠٪'}
          </span>
        </div>
      </div>

      {/* Interactive Alignment Control & Simulator for Quick Verification */}
      <div className="w-full athar-card text-right space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-[#F3E5AB] flex items-center gap-1.5">
            <Compass size={15} className="text-[#E6C66E]" />
            <span>ضبط وتجربة اتجاه البوصلة</span>
          </span>
          <button
            onClick={handleAlign100Percent}
            className="athar-btn-primary px-3 py-1.5 rounded-xl text-xs"
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
          className="w-full accent-[#E6C66E] cursor-pointer h-2 bg-[#1A160E] rounded-lg"
          aria-label="تدوير البوصلة"
        />
      </div>

      {/* Dedicated Location & Automatic Region Tracking Section inside QiblaView */}
      <div className="w-full athar-card text-right space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#C8A24A]/25">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-[#E6C66E]" />
            <div>
              <h2 className="text-sm font-extrabold text-[#F3E5AB] flex items-center gap-2">
                <span>التتبع التلقائي للمنطقة والقبلة</span>
              </h2>
              <p className="text-[11px] text-[#C4B998] mt-0.5">
                يضبط موقع الهاتف واتجاه القبلة تلقائياً فور تغيير منطقتك أو السفر
              </p>
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border flex items-center gap-1.5 shrink-0 ${
              LocationService.isAutoTrackingEnabled()
                ? 'bg-[#C8A24A]/25 text-[#F3E5AB] border-[#E6C66E]/60'
                : 'bg-[#14120D] text-[#E6C66E] border-[#C8A24A]/40'
            }`}
          >
            {LocationService.isAutoTrackingEnabled() && (
              <span className="w-2 h-2 rounded-full bg-[#E6C66E] animate-pulse" />
            )}
            <span>{LocationService.isAutoTrackingEnabled() ? 'تتبع تلقائي نشط ✓' : 'تحديد يدوي'}</span>
          </span>
        </div>

        {locationUpdateNotice && (
          <div className="p-2.5 rounded-xl bg-[#1E1910] border border-[#E6C66E]/55 text-[#F3E5AB] text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={14} className="text-[#E6C66E] shrink-0" />
            <span>{locationUpdateNotice}</span>
          </div>
        )}

        <div className="p-3 rounded-xl bg-[#14120D] border border-[#C8A24A]/35 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[11px] text-[#C4B998] block">المنطقة المضبوطة عليها القبلة الآن:</span>
            <span className="text-sm font-extrabold text-[#F3E5AB] truncate block mt-0.5">
              {coordinates.city || 'القاهرة'} ({coordinates.country || 'موقعي الحالي'})
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleRefreshGPS}
              disabled={isRefreshingLocation}
              className="athar-btn-primary px-3 py-2 rounded-xl text-xs flex items-center gap-1.5"
            >
              <RefreshCw size={13} className={isRefreshingLocation ? 'animate-spin' : ''} />
              <span>{isRefreshingLocation ? 'جاري الضبط...' : 'ضبط تلقائي GPS'}</span>
            </button>
            <button
              onClick={() => setIsCityPickerOpen(true)}
              className="px-3 py-2 rounded-xl bg-[#1A160E] hover:bg-[#241E14] text-[#F3E5AB] border border-[#C8A24A]/45 text-xs font-bold transition-all"
            >
              تغيير المدينة
            </button>
          </div>
        </div>
      </div>

      {/* City Picker Modal */}
      {isCityPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-gradient-to-b from-[#17140D] via-[#0E0D0A] to-[#080705] border border-[#C8A24A]/55 rounded-3xl p-5 space-y-4 text-right shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-[#E6C66E]" />
                <h3 className="text-base font-extrabold text-[#F3E5AB]">تحديد موقع القبلة</h3>
              </div>
              <button
                onClick={() => setIsCityPickerOpen(false)}
                className="p-1.5 rounded-xl bg-[#18150E] text-[#C4B998] hover:text-white border border-[#C8A24A]/35"
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

            <div className="relative">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#E6C66E]" />
              <input
                type="text"
                value={citySearchQuery}
                onChange={(e) => setCitySearchQuery(e.target.value)}
                placeholder="ابحث عن مدينتك أو دولتك..."
                className="w-full pr-9 pl-3 py-2.5 bg-[#14120D] border border-[#C8A24A]/40 rounded-xl text-xs text-white placeholder-[#8E8268] focus:outline-none focus:border-[#E6C66E]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pt-1">
              {filteredCities.map((city) => {
                const isSelected = coordinates.city === city.city;
                return (
                  <button
                    key={city.city}
                    onClick={() => handleSelectCity(city)}
                    className={`p-3 rounded-xl border text-xs font-bold text-right flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#F3E5AB]'
                        : 'bg-[#14120D] border-[#C8A24A]/25 text-[#C4B998] hover:border-[#E6C66E]/60 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{city.city}</span>
                    {isSelected && <Check size={14} className="shrink-0 text-[#E6C66E]" />}
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
