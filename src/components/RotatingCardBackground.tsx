import React, { useState, useEffect } from 'react';
import { IslamicImageSlot, getRotatingSlotImage } from '../data/islamicImagesData';

interface RotatingCardBackgroundProps {
  slot: IslamicImageSlot;
  cardOffset?: number;
  intervalMs?: number;
  opacity?: number;
  overlayClassName?: string;
}

/**
 * Renders a smooth, periodically rotating Kaaba / Islamic architectural photograph
 * inside any card or section container with a measured dark contrast scrim so
 * Arabic typography and controls remain crystal-clear.
 */
export const RotatingCardBackground: React.FC<RotatingCardBackgroundProps> = ({
  slot,
  cardOffset = 0,
  intervalMs = 25000,
  opacity = 0.28,
  overlayClassName = 'bg-gradient-to-t from-[#0B0F14]/95 via-[#0F161E]/80 to-[#111923]/65'
}) => {
  const [tick, setTick] = useState<number>(() => Math.floor(Date.now() / intervalMs));

  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((prev) => prev + 1);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  const currentImg = getRotatingSlotImage(slot, tick, cardOffset);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] z-0 select-none"
    >
      <img
        key={currentImg.id}
        src={currentImg.src}
        alt={currentImg.titleArabic}
        referrerPolicy="no-referrer"
        style={{
          opacity,
          objectPosition: currentImg.objectPosition
        }}
        className="w-full h-full object-cover transition-all duration-1000 ease-out scale-[1.02]"
      />
      <div className={`absolute inset-0 ${overlayClassName}`} />
    </div>
  );
};
