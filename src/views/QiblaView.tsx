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
      const fullLabel =
        updatedCoords.formattedLocation ||
        (updatedCoords.district ? `${updatedCoords.city} - ${updatedCoords.district}` : updatedCoords.city);
      setLocationUpdateNotice(`التتبع التلقائي نشط · تم ضبط القبلة على منطقتك (${fullLabel}) ✓`);
      setTimeout(() => setLocationUpdateNotice(null), 3500);
    }
  };

  const handleSelectCity = (city: (typeof POPULAR_CITIES)[number], specificDistrict?: { name: string; latitude: number; longitude: number }) => {
    LocationService.setAutoTrackingEnabled(false);
    const chosenDistrict = specificDistrict?.name || city.district || 'وسط المدينة';
    const manualCoords: Coordinates = {
      ...city,
      latitude: specificDistrict ? specificDistrict.latitude : city.latitude,
      longitude: specificDistrict ? specificDistrict.longitude : city.longitude,
      district: chosenDistrict,
      formattedLocation: `${city.city} - ${chosenDistrict}`,
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
    setLocationUpdateNotice(`تم اختيار المنطقة: ${manualCoords.formattedLocation} بنجاح ✓`);
    setTimeout(() => setLocationUpdateNotice(null), 3500);
  };

  const handleAlign100Percent = () => {
    wasAlignedRef.current = false;
    setDeviceHeading(Math.round(qiblaData.bearing));
  };

  const filteredCities = POPULAR_CITIES.filter((c) => {
    const q = citySearchQuery.trim();
    if (!q) return true;
    const matchCityOrCountry =
      c.city.includes(q) ||
      c.country.includes(q) ||
      (c.district && c.district.includes(q));
    const matchDistrictList = c.districts?.some((d) => d.name.includes(q));
    return Boolean(matchCityOrCountry || matchDistrictList);
  });

  return (
    <div className="athar-page-container items-center text-center">
      {/* 1. Royal Black & Gold Header */}
      <div className="w-full flex items-center justify-between text-right pb-2.5 border-b border-[#C8A24A]/25">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#2B2314] to-[#13100A] border border-[#E6C66E]/55 flex items-center justify-center text-[#E6C66E] shadow-[0_0_15px_rgba(200,162,74,0.25)] shrink-0">
            <Compass size={20} />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-[#F3E5AB] tracking-wide">
              بوصلة القبلة الملكية
            </h1>
            <p className="text-xs text-[#C4B998] font-medium mt-0.5">
              مؤشر الكعبة الذهبي المضيء مع الاهتزاز والنغمة الفورية
            </p>
          </div>
        </div>
      </div>

      {/* 2. Royal Obsidian & Gold Alignment Status Card */}
      <div
        className={`w-full p-4 rounded-3xl border transition-all duration-300 flex items-center justify-between gap-3 ${
          qiblaData.isAligned
            ? 'bg-gradient-to-r from-[#261F10] via-[#17130A] to-[#261F10] border-[#E6C66E] shadow-[0_0_28px_rgba(230,198,110,0.38)]'
            : 'bg-gradient-to-b from-[#17140D] to-[#0E0D0A] border-[#C8A24A]/45 shadow-[0_10px_28px_rgba(0,0,0,0.85)]'
        }`}
      >
        <div className="flex items-center gap-3 text-right">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
              qiblaData.isAligned
                ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#070707] shadow-[0_0_18px_rgba(245,215,110,0.85)]'
                : 'bg-[#1F1A10] text-[#E6C66E] border border-[#C8A24A]/45'
            }`}
          >
            {qiblaData.isAligned ? <CheckCircle2 size={22} /> : <Sparkles size={20} />}
          </div>
          <div>
            <span className="text-sm font-extrabold text-[#F3E5AB] block">
              {qiblaData.isAligned
                ? 'اتجاه القبلة الصحيح ١٠٠٪'
                : 'وجّه الهاتف نحو مؤشر الكعبة الذهبي'}
            </span>
            <span className="text-xs text-[#E6C66E] font-semibold block mt-0.5 leading-relaxed">
              {qiblaData.isAligned
                ? 'أنت تواجه الكعبة المشرفة الآن · تم التثبيت بالاهتزاز'
                : 'حرّك هاتفك حتى تضيء الكعبة باللون الذهبي الكامل'}
            </span>
          </div>
        </div>

        <div className="px-3.5 py-2 rounded-2xl bg-[#110F0A] border border-[#C8A24A]/60 text-[#E6C66E] font-extrabold text-sm font-mono tabular-nums shrink-0 shadow-inner">
          {alignmentAccuracy}٪
        </div>
      </div>

      {/* 3. Live Moving Royal Golden Illuminated Kaaba Compass (Preserving Glow, Sound & Haptic Effects) */}
      <div className="relative w-72 h-72 my-3 flex items-center justify-center">
        {/* Ambient Golden Glow Aura */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-500 pointer-events-none ${
            qiblaData.isAligned
              ? 'bg-[#E6C66E]/35 blur-3xl scale-105'
              : 'bg-[#C8A24A]/12 blur-2xl scale-95'
          }`}
        />

        {/* Royal Obsidian Sanctuary Dial with Double Gold Filigree Rings */}
        <div
          className={`relative w-full h-full rounded-full bg-gradient-to-b from-[#1B170E] via-[#0F0D09] to-[#070604] flex items-center justify-center transition-all duration-300 ${
            qiblaData.isAligned
              ? 'border-[3px] border-[#E6C66E] shadow-[0_0_50px_rgba(230,198,110,0.55),inset_0_0_38px_rgba(230,198,110,0.25)]'
              : 'border-2 border-[#C8A24A]/55 shadow-[0_18px_45px_rgba(0,0,0,0.92),inset_0_0_24px_rgba(200,162,74,0.1)]'
          }`}
        >
          {/* Decorative Inner Royal Gold Ring & Cardinal Ticks */}
          <div className="absolute inset-3 rounded-full border border-[#C8A24A]/25 pointer-events-none" />
          <div className="absolute inset-6 rounded-full border border-dashed border-[#C8A24A]/20 pointer-events-none" />

          {/* Top Alignment Target Crown Notch */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
            <div
              className={`w-6 h-6 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                qiblaData.isAligned
                  ? 'bg-[#E6C66E] border-[#FFF6D6] shadow-[0_0_22px_#E6C66E] scale-110'
                  : 'bg-[#14120D] border-[#C8A24A]'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${qiblaData.isAligned ? 'bg-[#070707]' : 'bg-[#E6C66E]'}`} />
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

            {/* Illuminated Royal Golden Kaaba Sanctuary Medallion */}
            <div
              className={`relative w-32 h-32 rounded-[28px] flex flex-col items-center justify-center transition-all duration-300 ${
                qiblaData.isAligned
                  ? 'bg-gradient-to-b from-[#2A200C] via-[#151006] to-[#080602] border-2 border-[#FFF3B0] shadow-[0_0_46px_rgba(230,198,110,0.92),inset_0_0_22px_rgba(230,198,110,0.3)] scale-105'
                  : 'bg-gradient-to-b from-[#1A150C] via-[#100D08] to-[#080704] border-2 border-[#C8A24A]/80 shadow-[0_10px_28px_rgba(0,0,0,0.9),0_0_24px_rgba(200,162,74,0.38)]'
              }`}
            >
              {/* Subtle Corner Royal Filigree Accents */}
              <div className="absolute inset-1.5 rounded-[22px] border border-[#E6C66E]/25 pointer-events-none" />

              {/* High-Detail Royal Architectural Kaaba Vector Emblem */}
              <svg viewBox="0 0 88 82" className="w-[74px] h-[68px] overflow-visible">
                <defs>
                  <linearGradient id="kaabaRoyalGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFF8DC" />
                    <stop offset="35%" stopColor="#E6C66E" />
                    <stop offset="70%" stopColor="#C8A24A" />
                    <stop offset="100%" stopColor="#8F6B1E" />
                  </linearGradient>
                  <linearGradient id="kaabaObsidianFront" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1A1712" />
                    <stop offset="50%" stopColor="#0C0A07" />
                    <stop offset="100%" stopColor="#050403" />
                  </linearGradient>
                  <linearGradient id="kaabaObsidianSide" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#120F0A" />
                    <stop offset="100%" stopColor="#040302" />
                  </linearGradient>
                </defs>

                {/* Marble Mataf Base Plinth (الشاذروان المطاف) */}
                <ellipse
                  cx="44"
                  cy="68"
                  rx="34"
                  ry="6.5"
                  fill="#0B0906"
                  stroke="url(#kaabaRoyalGold)"
                  strokeWidth="1.6"
                />
                <ellipse
                  cx="44"
                  cy="68"
                  rx="27"
                  ry="4"
                  fill="none"
                  stroke="#E6C66E"
                  strokeOpacity="0.45"
                  strokeWidth="0.9"
                  strokeDasharray="3 2"
                />

                {/* Hijr Ismail Golden Crescent Wall (حجر إسماعيل) */}
                <path
                  d="M 13 64 A 16 7 0 0 1 28 57"
                  fill="none"
                  stroke="url(#kaabaRoyalGold)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.85"
                />

                {/* Isometric Top Roof Terrace of the Kaaba */}
                <polygon
                  points="44,10 70,18 44,26 18,18"
                  fill="#18140C"
                  stroke="url(#kaabaRoyalGold)"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />

                {/* Left Side Wall of the Kaaba (3D Perspective) */}
                <polygon
                  points="18,18 44,26 44,67 18,59"
                  fill="url(#kaabaObsidianSide)"
                  stroke="url(#kaabaRoyalGold)"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />

                {/* Right Front Wall of the Kaaba (Multazam & Door Side) */}
                <polygon
                  points="44,26 70,18 70,59 44,67"
                  fill="url(#kaabaObsidianFront)"
                  stroke="url(#kaabaRoyalGold)"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />

                {/* Golden Mizab al-Rahmah (ميزاب الرحمة المذهب) on Left Roof Edge */}
                <path
                  d="M 28 21 L 22 24.5 L 24 26 L 30 22.5 Z"
                  fill="url(#kaabaRoyalGold)"
                />

                {/* Embroidered Hizam Kiswah Belt (حزام الكسوة المذهب) - Left Face */}
                <polygon
                  points="18,26 44,34 44,41 18,33"
                  fill="url(#kaabaRoyalGold)"
                />
                <line
                  x1="20"
                  y1="29.5"
                  x2="42"
                  y2="36.3"
                  stroke="#090704"
                  strokeWidth="1.2"
                  strokeDasharray="2.5 2"
                />

                {/* Embroidered Hizam Kiswah Belt (حزام الكسوة المذهب) - Right Face */}
                <polygon
                  points="44,34 70,26 70,33 44,41"
                  fill="url(#kaabaRoyalGold)"
                />
                <line
                  x1="46"
                  y1="36.3"
                  x2="68"
                  y2="29.5"
                  stroke="#090704"
                  strokeWidth="1.2"
                  strokeDasharray="2.5 2"
                />

                {/* Golden Qanadil Medallions on Left Face (قناديل الكسوة) */}
                <rect
                  x="23"
                  y="40"
                  width="5.5"
                  height="7.5"
                  rx="2.5"
                  transform="skewY(17)"
                  fill="none"
                  stroke="url(#kaabaRoyalGold)"
                  strokeWidth="1.4"
                />
                <rect
                  x="33"
                  y="40"
                  width="5.5"
                  height="7.5"
                  rx="2.5"
                  transform="skewY(17)"
                  fill="none"
                  stroke="url(#kaabaRoyalGold)"
                  strokeWidth="1.4"
                />

                {/* Royal Multazam Door of the Kaaba (باب الكعبة المشرفة المذهب) on Right Face */}
                <polygon
                  points="54,41 64,38 64,56 54,59"
                  fill="url(#kaabaRoyalGold)"
                />
                <polygon
                  points="55.6,42.5 62.4,40.4 62.4,54.5 55.6,56.6"
                  fill="none"
                  stroke="#0B0905"
                  strokeWidth="1"
                />
                {/* Door Rings */}
                <circle cx="58.2" cy="48.5" r="0.9" fill="#0B0905" />
                <circle cx="60.2" cy="47.9" r="0.9" fill="#0B0905" />

                {/* Qandil Medallion Beside Door */}
                <circle
                  cx="49"
                  cy="47.5"
                  r="2.6"
                  fill="none"
                  stroke="url(#kaabaRoyalGold)"
                  strokeWidth="1.4"
                />

                {/* Al-Hajar Al-Aswad Silver-Gold Frame (الحجر الأسود في الركن) */}
                <ellipse
                  cx="44"
                  cy="53"
                  rx="2.8"
                  ry="3.6"
                  fill="#060503"
                  stroke="#FFF8DC"
                  strokeWidth="1.6"
                />
                <circle cx="44" cy="53" r="1.1" fill="#E6C66E" />
              </svg>

              <span
                className={`text-[11px] font-extrabold mt-0.5 tracking-wide ${
                  qiblaData.isAligned ? 'text-[#FFF6D6]' : 'text-[#F3E5AB]'
                }`}
              >
                الكعبة المشرفة
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Haptic Feedback & Distance Summary Row */}
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
          <span className="text-xs text-[#C4B998] font-bold block">الاهتزاز والتنبيه الصوتي</span>
          <span className="text-sm font-extrabold text-[#E6C66E] mt-1 block">
            {qiblaData.isAligned ? 'نشط · تم الضبط ١٠٠٪ ✓' : 'يهتز عند الضبط ١٠٠٪'}
          </span>
        </div>
      </div>

      {/* 5. Interactive Alignment Control & Simulator for Quick Verification */}
      <div className="w-full athar-card text-right space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-extrabold text-[#F3E5AB] flex items-center gap-1.5">
            <Compass size={15} className="text-[#E6C66E]" />
            <span>ضبط وتجربة اتجاه البوصلة</span>
          </span>
          <button
            onClick={handleAlign100Percent}
            className="athar-btn-primary px-3 py-1.5 rounded-xl text-xs shrink-0"
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

      {/* 6. Spacious, Full-Clarity Location & Automatic Region Tracking Card (No Truncated Text) */}
      <div className="w-full rounded-3xl bg-gradient-to-b from-[#1B170F] via-[#12100B] to-[#0B0A08] border border-[#C8A24A]/55 p-4 sm:p-5 text-right space-y-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.9)]">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#C8A24A]/25">
          <div className="flex items-start gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#241E12] border border-[#C8A24A]/50 flex items-center justify-center text-[#E6C66E] shrink-0 mt-0.5">
              <MapPin size={18} />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm sm:text-base font-extrabold text-[#F3E5AB] leading-snug">
                المنطقة والتتبع التلقائي للقبلة
              </h2>
              <p className="text-xs text-[#C4B998] leading-relaxed">
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
          <div className="p-3 rounded-2xl bg-[#1E1910] border border-[#E6C66E]/60 text-[#F3E5AB] text-xs font-bold flex items-center gap-2 leading-relaxed">
            <CheckCircle2 size={15} className="text-[#E6C66E] shrink-0" />
            <span>{locationUpdateNotice}</span>
          </div>
        )}

        {/* Full-Width Clear Region Display + Action Buttons */}
        <div className="p-3.5 rounded-2xl bg-[#14120D] border border-[#C8A24A]/40 space-y-3">
          <div className="space-y-1">
            <span className="text-xs text-[#E6C66E] font-bold block">
              المدينة والمنطقة المضبوطة عليها القبلة الآن:
            </span>
            <p className="text-base font-extrabold text-white leading-relaxed break-words">
              {coordinates.formattedLocation ||
                (coordinates.district && coordinates.city && !coordinates.city.includes(coordinates.district)
                  ? `${coordinates.city} - ${coordinates.district}`
                  : coordinates.city || 'القاهرة - وسط البلد')}{' '}
              <span className="text-xs font-bold text-[#C4B998]">
                ({coordinates.country || 'موقعي الحالي'})
              </span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={handleRefreshGPS}
              disabled={isRefreshingLocation}
              className="athar-btn-primary py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={14} className={isRefreshingLocation ? 'animate-spin' : ''} />
              <span>{isRefreshingLocation ? 'جاري تحديد المنطقة...' : 'تحديث المنطقة GPS'}</span>
            </button>
            <button
              onClick={() => setIsCityPickerOpen(true)}
              className="py-2.5 px-3 rounded-xl bg-[#1E1A11] hover:bg-[#2A2417] text-[#F3E5AB] border border-[#C8A24A]/50 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5"
            >
              <MapPin size={14} className="text-[#E6C66E]" />
              <span>تغيير المدينة والمنطقة</span>
            </button>
          </div>
        </div>
      </div>

      {/* City & District Picker Modal */}
      {isCityPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-gradient-to-b from-[#17140D] via-[#0E0D0A] to-[#080705] border border-[#C8A24A]/55 rounded-3xl p-5 space-y-4 text-right shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-[#E6C66E]" />
                <h3 className="text-base font-extrabold text-[#F3E5AB]">تحديد المدينة والمنطقة (الحي)</h3>
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
              className="w-full athar-btn-primary py-2.5 flex items-center justify-center gap-2 text-xs rounded-xl"
            >
              <Navigation size={15} />
              <span>تحديد مدينتي ومنطقتي تلقائياً عبر GPS</span>
            </button>

            <div className="relative">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#E6C66E]" />
              <input
                type="text"
                value={citySearchQuery}
                onChange={(e) => setCitySearchQuery(e.target.value)}
                placeholder="ابحث عن المدينة أو المنطقة أو الحي (مثل: المعادي، العليا، قباء)..."
                className="w-full pr-9 pl-3 py-2.5 bg-[#14120D] border border-[#C8A24A]/40 rounded-xl text-xs text-white placeholder-[#8E8268] focus:outline-none focus:border-[#E6C66E]"
              />
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pt-1 pl-1">
              {filteredCities.map((city) => {
                const isSelectedCity = coordinates.city === city.city;
                return (
                  <div
                    key={city.city}
                    className={`p-3 rounded-2xl border transition-all space-y-2 ${
                      isSelectedCity
                        ? 'bg-[#C8A24A]/15 border-[#E6C66E]'
                        : 'bg-[#14120D] border-[#C8A24A]/25 hover:border-[#E6C66E]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleSelectCity(city)}
                        className="flex-1 text-right flex items-center justify-between"
                      >
                        <div>
                          <span className="text-xs font-extrabold text-[#F3E5AB] block">
                            {city.city}
                          </span>
                          <span className="text-[10px] text-[#C4B998] block">
                            {city.district ? `${city.district} · ` : ''}{city.country}
                          </span>
                        </div>
                        {isSelectedCity && <Check size={14} className="shrink-0 text-[#E6C66E]" />}
                      </button>
                    </div>

                    {city.districts && city.districts.length > 0 && (
                      <div className="flex items-center flex-wrap gap-1.5 pt-1 border-t border-[#C8A24A]/20">
                        {city.districts.map((dist) => {
                          const isDistSelected =
                            isSelectedCity && coordinates.district === dist.name;
                          return (
                            <button
                              key={dist.name}
                              onClick={() => handleSelectCity(city, dist)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                                isDistSelected
                                  ? 'bg-[#E6C66E] text-[#070707] border-[#FFF3C4]'
                                  : 'bg-[#0C0A07] text-[#C4B998] border-[#C8A24A]/25 hover:border-[#E6C66E]/60 hover:text-white'
                              }`}
                            >
                              {dist.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
