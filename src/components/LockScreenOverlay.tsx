import React, { useState, useEffect } from 'react';
import { ActiveAudioState, AudioService } from '../services/audioService';
import { AtharBrandLogo } from './AtharBrandLogo';
import { Play, Pause, SkipBack, SkipForward, Lock, Unlock, Moon } from 'lucide-react';

interface LockScreenOverlayProps {
  isOpen: boolean;
  onUnlock: () => void;
  hijriDate: string;
}

export const LockScreenOverlay: React.FC<LockScreenOverlayProps> = ({
  isOpen,
  onUnlock,
  hijriDate
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [audioState, setAudioState] = useState<ActiveAudioState | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsub = AudioService.subscribe(setAudioState);
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#07090C]/95 backdrop-blur-xl flex flex-col justify-between p-6 select-none animate-fadeIn">
      {/* Top Lock Indicator */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5 text-[#D4AF37]">
          <Lock size={14} />
          <span>شاشة القفل المحمية</span>
        </div>
        <div className="flex items-center gap-2">
          <span>أَثَر · ATHAR</span>
          <Moon size={14} className="text-[#D4AF37]" />
        </div>
      </div>

      {/* Center Clock & Spiritual Date */}
      <div className="text-center my-auto">
        <h1 className="text-6xl font-light text-slate-100 tabular-nums tracking-tighter">
          {currentTime}
        </h1>
        <p className="text-sm font-medium text-slate-300 mt-2">{currentDate}</p>
        <p className="text-xs text-[#D4AF37] mt-1 font-semibold">{hijriDate}</p>

        {/* Media3 / ExoPlayer Lock Screen Card */}
        {audioState && (
          <div className="mt-8 mx-auto max-w-sm bg-[#121820]/90 border border-[#D4AF37]/30 rounded-3xl p-4 shadow-2xl text-right backdrop-blur-md">
            <div className="flex items-center justify-between text-[11px] text-[#D4AF37] mb-2 font-medium">
              <span>{audioState.category === 'adhkar' ? 'مشغّل الأذكار' : 'مشغّل القرآن الكريم'}</span>
              <span className="text-slate-400">MediaSession / ExoPlayer</span>
            </div>

            <div className="flex items-center gap-3">
              <AtharBrandLogo size="sm" showWordmark={false} />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-100 truncate">{audioState.title}</h3>
                <p className="text-xs text-slate-400 truncate mt-0.5">{audioState.subtitle}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3">
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#D4AF37] h-full transition-all duration-300"
                  style={{
                    width: audioState.duration > 0
                      ? `${(audioState.currentTime / audioState.duration) * 100}%`
                      : '0%'
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 tabular-nums">
                <span>{Math.floor(audioState.currentTime)}s</span>
                <span>{Math.floor(audioState.duration)}s</span>
              </div>
            </div>

            {/* Media Controls */}
            <div className="mt-3 flex items-center justify-center gap-6">
              <button
                onClick={() => AudioService.seekTo(Math.max(0, audioState.currentTime - 10))}
                className="text-slate-400 hover:text-white p-2"
                title="السابق"
                aria-label="السابق"
              >
                <SkipForward size={20} />
              </button>

              <button
                onClick={() => AudioService.togglePlayPause()}
                className="w-12 h-12 rounded-full bg-[#D4AF37] text-slate-950 flex items-center justify-center hover:bg-[#E5C158] transition-transform active:scale-95 shadow-lg"
                title={audioState.isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                aria-label={audioState.isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
              >
                {audioState.isPlaying ? (
                  <Pause size={20} fill="currentColor" />
                ) : (
                  <Play size={20} fill="currentColor" className="mr-0.5" />
                )}
              </button>

              <button
                onClick={() => AudioService.seekTo(audioState.currentTime + 10)}
                className="text-slate-400 hover:text-white p-2"
                title="التالي"
                aria-label="التالي"
              >
                <SkipBack size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Swipe up / Click to Unlock Bar */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onUnlock}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-medium border border-slate-700/60 transition-all active:scale-95"
        >
          <Unlock size={14} className="text-[#D4AF37]" />
          <span>اسحب للأعلى أو انقر لإلغاء القفل</span>
        </button>
      </div>
    </div>
  );
};
