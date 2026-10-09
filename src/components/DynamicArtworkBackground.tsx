import React, { useEffect, useState } from 'react';
import { IslamicArtwork } from '../types';
import { ArtworkService } from '../services/artworkService';
import { StorageService } from '../services/storageService';

export const DynamicArtworkBackground: React.FC = () => {
  const [currentArtwork, setCurrentArtwork] = useState<IslamicArtwork>(ArtworkService.getCurrentArtwork());
  const [opacity, setOpacity] = useState<number>(0.08);
  const [fadeKey, setFadeKey] = useState<number>(0);

  useEffect(() => {
    // Check rotation on mount
    const updated = ArtworkService.rotateArtworkIfNeeded();
    setCurrentArtwork(updated);
    
    const settings = StorageService.getSettings();
    setOpacity(settings.artwork.enabled ? settings.artwork.opacity : 0);

    // Periodic check every 1 minute
    const interval = setInterval(() => {
      const art = ArtworkService.rotateArtworkIfNeeded();
      if (art.id !== currentArtwork.id) {
        setCurrentArtwork(art);
        setFadeKey(k => k + 1);
      }
      const st = StorageService.getSettings();
      setOpacity(st.artwork.enabled ? st.artwork.opacity : 0);
    }, 60000);

    return () => clearInterval(interval);
  }, [currentArtwork.id]);

  if (opacity <= 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none transition-opacity duration-1000 ease-in-out"
      style={{ opacity }}
    >
      <div
        key={fadeKey}
        className="w-full h-full animate-fadeIn"
        dangerouslySetInnerHTML={{ __html: currentArtwork.svgPattern }}
      />
      {/* Subtle radial dark vignette to ensure central text legibility */}
      <div className="absolute inset-0 bg-radial-vignette opacity-70" />
    </div>
  );
};
