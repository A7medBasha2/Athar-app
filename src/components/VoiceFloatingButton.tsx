import React, { useState, useEffect, useRef } from 'react';
import { Mic, Sparkles, Move } from 'lucide-react';
import { VoiceAssistant } from '../services/voiceAssistantService';

interface VoiceFloatingButtonProps {
  onClick: () => void;
  className?: string;
}

const BUTTON_SIZE = 56;
const EDGE_MARGIN = 10;

function getDefaultPosition(): { x: number; y: number } {
  if (typeof window === 'undefined') {
    return { x: 16, y: 500 };
  }
  return {
    x: 16,
    y: Math.max(EDGE_MARGIN, window.innerHeight - 165),
  };
}

function clampPosition(pos: { x: number; y: number }): { x: number; y: number } {
  if (typeof window === 'undefined') return pos;
  const maxX = Math.max(EDGE_MARGIN, window.innerWidth - BUTTON_SIZE - EDGE_MARGIN);
  const maxY = Math.max(EDGE_MARGIN, window.innerHeight - BUTTON_SIZE - EDGE_MARGIN);
  return {
    x: Math.min(Math.max(EDGE_MARGIN, Math.round(pos.x)), maxX),
    y: Math.min(Math.max(EDGE_MARGIN, Math.round(pos.y)), maxY),
  };
}

export const VoiceFloatingButton: React.FC<VoiceFloatingButtonProps> = ({
  onClick,
  className = ''
}) => {
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    const saved = VoiceAssistant.getSettings().floatingButtonPosition;
    return saved ? clampPosition(saved) : getDefaultPosition();
  });
  const [isDragging, setIsDragging] = useState(false);

  const dragRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startClientX: number;
    startClientY: number;
    startPosX: number;
    startPosY: number;
    hasMoved: boolean;
    currentPos: { x: number; y: number };
  }>({
    active: false,
    pointerId: null,
    startClientX: 0,
    startClientY: 0,
    startPosX: 0,
    startPosY: 0,
    hasMoved: false,
    currentPos: position,
  });

  // Sync with VoiceAssistant settings (e.g., if user resets position in Settings)
  useEffect(() => {
    const unsub = VoiceAssistant.subscribe((settings) => {
      if (!dragRef.current.active) {
        if (settings.floatingButtonPosition) {
          setPosition(clampPosition(settings.floatingButtonPosition));
        } else {
          setPosition(getDefaultPosition());
        }
      }
    });
    return () => unsub();
  }, []);

  // Keep button inside screen bounds on window resize / orientation change
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => clampPosition(prev));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global keyboard shortcut: Pressing 'v' or 'V' toggles voice assistant when enabled
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === 'v' || e.key === 'V' || e.key === 'ر') {
        e.preventDefault();
        onClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClick]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Only primary mouse button or touch
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.stopPropagation();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture is unsupported
    }

    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
      hasMoved: false,
      currentPos: position,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.active || dragRef.current.pointerId !== e.pointerId) return;

    const dx = e.clientX - dragRef.current.startClientX;
    const dy = e.clientY - dragRef.current.startClientY;

    if (!dragRef.current.hasMoved && Math.hypot(dx, dy) > 6) {
      dragRef.current.hasMoved = true;
      setIsDragging(true);
    }

    if (dragRef.current.hasMoved) {
      const nextPos = clampPosition({
        x: dragRef.current.startPosX + dx,
        y: dragRef.current.startPosY + dy,
      });
      dragRef.current.currentPos = nextPos;
      setPosition(nextPos);
    }
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.active || dragRef.current.pointerId !== e.pointerId) return;

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }

    const wasDragged = dragRef.current.hasMoved;
    const finalPos = dragRef.current.currentPos;

    dragRef.current.active = false;
    dragRef.current.pointerId = null;
    setIsDragging(false);

    if (wasDragged) {
      // Persist the exact new position in localStorage so it stays here even after closing & reopening the app
      VoiceAssistant.saveSettings({ floatingButtonPosition: finalPos });
    } else {
      onClick();
    }
  };

  return (
    <div
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none',
      }}
      className={`fixed z-40 select-none ${
        isDragging ? 'scale-110 cursor-grabbing' : 'transition-transform duration-150 cursor-grab'
      } ${className}`}
    >
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
        style={{ touchAction: 'none' }}
        className={`group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-[#B38728] via-[#FBF5B7] to-[#DAA520] p-[2px] shadow-xl ${
          isDragging
            ? 'shadow-[#D4AF37]/60 ring-4 ring-[#D4AF37]/50'
            : 'shadow-[#D4AF37]/30 hover:shadow-[#D4AF37]/50'
        } focus:outline-none focus:ring-4 focus:ring-[#D4AF37]/50`}
        aria-label="المساعد الصوتي لأثر - اضغط للتحدث أو اسحب لتحريك الزر لأي مكان في الشاشة"
        title="المساعد الصوتي لأثر (اضغط للتحدث أو اسحب لتحريك الزر لأي مكان)"
      >
        {/* Pulsing golden aura ring */}
        {!isDragging && (
          <span className="absolute inset-0 rounded-full bg-[#D4AF37]/25 animate-ping opacity-60 pointer-events-none" />
        )}

        {/* Inner Dark Surface with Gold Icon */}
        <div className="w-full h-full rounded-full bg-[#06090E] flex items-center justify-center transition-colors group-hover:bg-[#0D131D] pointer-events-none">
          <Mic size={22} className="text-[#E5C158] group-hover:scale-110 transition-transform duration-200" />
        </div>

        {/* Floating status/drag badge */}
        <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-[#D4AF37] border-2 border-[#06090E] flex items-center justify-center shadow pointer-events-none">
          {isDragging ? (
            <Move size={9} className="text-[#05070A] font-bold" />
          ) : (
            <Sparkles size={9} className="text-[#05070A] font-bold" />
          )}
        </span>
      </button>

      {/* Screen Reader Label */}
      <span className="sr-only">
        المساعد الصوتي الذكي لأثر - قابل للتحريك لأي مكان في الشاشة مع حفظ موضعه تلقائياً
      </span>
    </div>
  );
};
