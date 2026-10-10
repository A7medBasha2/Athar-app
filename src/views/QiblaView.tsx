import React, { useState, useEffect } from 'react';
import { Coordinates } from '../types';
import { QiblaService } from '../services/qiblaService';
import { RotatingCardBackground } from '../components/RotatingCardBackground';
import { Compass, MapPin, AlertCircle, CheckCircle2, RotateCw } from 'lucide-react';

interface QiblaViewProps {
  coordinates: Coordinates;
}

export const QiblaView: React.FC<QiblaViewProps> = ({ coordinates }) => {
  const [deviceHeading, setDeviceHeading] = useState<number>(0);
  const [hasCompassSensor, setHasCompassSensor] = useState<boolean>(false);
  const [permissionRequested, setPermissionRequested] = useState<boolean>(false);
  const [calibrationNeeded, setCalibrationNeeded] = useState<boolean>(false);

  useEffect(() => {
    // Listen for real device orientation
    const handleOrientation = (e: DeviceOrientationEvent) => {
      let heading: number | null = null;

      // iOS Safari provides webkitCompassHeading
      if ('webkitCompassHeading' in e && typeof (e as any).webkitCompassHeading === 'number') {
        heading = (e as any).webkitCompassHeading;
      } else if (e.alpha !== null) {
        // Android standard
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

  const requestOrientationPermission = async () => {
    setPermissionRequested(true);
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const state = await (DeviceOrientationEvent as any).requestPermission();
        if (state === 'granted') {
          setHasCompassSensor(true);
        }
      } catch (err) {
        console.warn('Orientation permission denied:', err);
      }
    }
  };

  const qiblaData = QiblaService.getQiblaData(coordinates, deviceHeading);

  // Trigger subtle haptic pulse when perfectly aligned
  useEffect(() => {
    if (qiblaData.isAligned && 'vibrate' in navigator) {
      navigator.vibrate(30);
    }
  }, [qiblaData.isAligned]);

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-8 space-y-4 max-w-lg mx-auto w-full select-none items-center text-center">
      {/* Header */}
      <div className="w-full flex items-center justify-between text-right">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Compass size={20} className="text-[#D4AF37]" />
            اتجاه القبلة الشريفة
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5">
            تحديد زاوية الكعبة المشرفة وفق إحداثيات موقعك
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#141B24] border border-slate-800 rounded-full text-xs text-slate-300">
          <MapPin size={12} className="text-[#D4AF37]" />
          <span>{coordinates.city || 'القاهرة'}</span>
        </div>
      </div>

      {/* Alignment Banner */}
      <div
        className={`relative overflow-hidden w-full p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between text-xs ${
          qiblaData.isAligned
            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 shadow-lg ring-1 ring-emerald-500/30'
            : 'bg-[#121820] border-slate-800 text-slate-200'
        }`}
      >
        <RotatingCardBackground slot="kaaba" cardOffset={0} intervalMs={22000} opacity={0.34} />
        <div className="relative z-10 flex items-center gap-2">
          {qiblaData.isAligned ? (
            <CheckCircle2 size={18} className="text-emerald-400" />
          ) : (
            <RotateCw size={16} className="text-[#D4AF37] animate-spin-slow" />
          )}
          <span className="font-semibold">
            {qiblaData.isAligned
              ? 'أنت تواجه القبلة المشرفة الآن تمامًا!'
              : `در بجهازك حتى تستقر الإبرة في المركز (${Math.abs(qiblaData.offset)}°)`}
          </span>
        </div>

        <span className="relative z-10 font-mono tabular-nums text-[11px] text-[#D4AF37] font-bold">
          {qiblaData.bearing}°
        </span>
      </div>

      {/* Main Compass Visual */}
      <div className="relative w-72 h-72 my-4 flex items-center justify-center">
        {/* Outer Glow Ring */}
        <div
          className={`absolute inset-0 rounded-full blur-xl transition-all duration-500 ${
            qiblaData.isAligned ? 'bg-emerald-500/20' : 'bg-[#D4AF37]/10'
          }`}
        />

        {/* Outer Degree Dial (Rotates inverse of device heading) */}
        <div
          className="absolute inset-0 rounded-full border-2 border-slate-700/60 bg-[#0E1318]/90 shadow-2xl flex items-center justify-center transition-transform duration-200 ease-out"
          style={{ transform: `rotate(${-deviceHeading}deg)` }}
        >
          {/* Cardinal Directions */}
          <span className="absolute top-2 text-xs font-bold text-rose-400">ش</span>
          <span className="absolute bottom-2 text-xs font-bold text-slate-400">ج</span>
          <span className="absolute right-2 text-xs font-bold text-slate-400">ق</span>
          <span className="absolute left-2 text-xs font-bold text-slate-400">غ</span>

          {/* Dial Tick Marks */}
          <div className="w-60 h-60 rounded-full border border-dashed border-slate-700/80" />
          <div className="w-48 h-48 rounded-full border border-slate-800" />

          {/* Golden Kaaba Direction Marker on Dial */}
          <div
            className="absolute top-0 bottom-0 flex flex-col items-center justify-start pointer-events-none"
            style={{ transform: `rotate(${qiblaData.bearing}deg)` }}
          >
            <div className="w-7 h-7 -mt-3.5 rounded-lg bg-gradient-to-tr from-[#997A15] to-[#E5C158] flex items-center justify-center text-slate-950 font-bold text-[10px] shadow-lg border border-white/20">
              🕋
            </div>
          </div>
        </div>

        {/* Center Needle Indicator */}
        <div
          className="absolute w-12 h-44 flex flex-col items-center justify-between pointer-events-none transition-transform duration-200 ease-out z-20"
          style={{ transform: `rotate(${qiblaData.offset}deg)` }}
        >
          {/* North / Qibla pointer arrow */}
          <div
            className={`w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[40px] drop-shadow-md transition-colors ${
              qiblaData.isAligned ? 'border-b-emerald-400' : 'border-b-[#D4AF37]'
            }`}
          />
          {/* Needle pivot circle */}
          <div className="w-6 h-6 rounded-full bg-[#1A222C] border-2 border-[#D4AF37] flex items-center justify-center shadow-lg">
            <div className="w-2 h-2 rounded-full bg-[#D4AF37]" />
          </div>
          {/* South tail */}
          <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[30px] border-t-slate-600 opacity-60" />
        </div>
      </div>

      {/* Metrics Row: Kaaba Distance & Angle */}
      <div className="w-full grid grid-cols-2 gap-3 text-right">
        <div className="relative overflow-hidden p-3 bg-[#121820] border border-slate-800 rounded-2xl">
          <RotatingCardBackground slot="kaaba" cardOffset={1} intervalMs={24000} opacity={0.32} />
          <span className="relative z-10 text-[10px] text-slate-300 block">المسافة إلى مكة المكرمة</span>
          <span className="relative z-10 text-base font-bold text-slate-100 font-mono tabular-nums">
            {qiblaData.distanceKm.toLocaleString('ar-EG')} كم
          </span>
        </div>

        <div className="relative overflow-hidden p-3 bg-[#121820] border border-slate-800 rounded-2xl">
          <RotatingCardBackground slot="qibla" cardOffset={2} intervalMs={26000} opacity={0.32} />
          <span className="relative z-10 text-[10px] text-slate-300 block">زاوية القبلة الدقيقة</span>
          <span className="relative z-10 text-base font-bold text-[#D4AF37] font-mono tabular-nums">
            {qiblaData.bearing}°
          </span>
        </div>
      </div>

      {/* Manual Compass Heading Simulator Slider (For desktop or devices without compass sensor) */}
      {!hasCompassSensor && (
        <div className="relative overflow-hidden w-full bg-[#121820]/80 border border-slate-800/80 rounded-2xl p-4 text-right space-y-2">
          <RotatingCardBackground slot="qibla" cardOffset={0} intervalMs={28000} opacity={0.25} />
          <div className="relative z-10 flex items-center justify-between text-xs">
            <span className="text-slate-200 font-semibold flex items-center gap-1.5">
              <Compass size={14} className="text-[#D4AF37]" />
              محاكي اتجاه الهاتف اليدوي
            </span>
            <span className="text-slate-300 text-[11px] font-mono tabular-nums">
              {Math.round(deviceHeading)}°
            </span>
          </div>
          <p className="relative z-10 text-[10px] text-slate-300 leading-relaxed">
            جهازك المكتبي لا يحتوي على مستشعر مغناطيسي (Magnetometer). يمكنك تحريك المؤشر لاختبار دوران البوصلة والتوجيه نحو الكعبة المشرفة:
          </p>
          <input
            type="range"
            min="0"
            max="360"
            value={deviceHeading}
            onChange={(e) => setDeviceHeading(Number(e.target.value))}
            className="relative z-10 w-full accent-[#D4AF37] cursor-pointer"
          />
        </div>
      )}

      {/* Sensor Calibration Instructions */}
      <div className="w-full p-3 bg-amber-950/20 border border-[#D4AF37]/20 rounded-xl text-right text-[11px] text-[#D4AF37] leading-relaxed">
        <span className="font-semibold block mb-0.5">معايرة البوصلة:</span>
        للحصول على أعلى دقة، حرّك الهاتف في الهواء على شكل الرقم (8) باللغة الإنجليزية بعيداً عن المعادن والأجهزة الكهربائية.
      </div>
    </div>
  );
};
