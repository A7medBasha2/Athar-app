import { ISLAMIC_ARTWORKS } from '../data/artworksData';
import { IslamicArtwork, ArtworkSetting } from '../types';
import { StorageService } from './storageService';

export const ArtworkService = {
  getArtworks(): IslamicArtwork[] {
    return ISLAMIC_ARTWORKS;
  },

  getCurrentArtwork(): IslamicArtwork {
    const settings = StorageService.getSettings();
    const found = ISLAMIC_ARTWORKS.find(a => a.id === settings.artwork.currentArtworkId);
    return found || ISLAMIC_ARTWORKS[0];
  },

  /**
   * Evaluates if artwork should be rotated based on rotationInterval
   */
  rotateArtworkIfNeeded(): IslamicArtwork {
    const settings = StorageService.getSettings();
    if (!settings.artwork.enabled || settings.artwork.rotationInterval === 'off') {
      return this.getCurrentArtwork();
    }

    const lastRotationKey = 'athar_last_artwork_rotation';
    const lastRotationTime = Number(localStorage.getItem(lastRotationKey) || '0');
    const now = Date.now();

    const intervalMap: Record<ArtworkSetting['rotationInterval'], number> = {
      '6h': 6 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      'daily': 24 * 60 * 60 * 1000,
      '3d': 3 * 24 * 60 * 60 * 1000,
      'off': Infinity
    };

    const targetInterval = intervalMap[settings.artwork.rotationInterval] || 24 * 60 * 60 * 1000;

    if (now - lastRotationTime >= targetInterval) {
      const currentIndex = ISLAMIC_ARTWORKS.findIndex(a => a.id === settings.artwork.currentArtworkId);
      const nextIndex = (currentIndex + 1) % ISLAMIC_ARTWORKS.length;
      const nextArtwork = ISLAMIC_ARTWORKS[nextIndex];

      settings.artwork.currentArtworkId = nextArtwork.id;
      StorageService.saveSettings(settings);
      localStorage.setItem(lastRotationKey, String(now));
      return nextArtwork;
    }

    return this.getCurrentArtwork();
  },

  setArtwork(artworkId: string): void {
    const settings = StorageService.getSettings();
    settings.artwork.currentArtworkId = artworkId;
    StorageService.saveSettings(settings);
  },

  setOpacity(opacity: number): void {
    const clamped = Math.min(0.20, Math.max(0.04, opacity));
    const settings = StorageService.getSettings();
    settings.artwork.opacity = clamped;
    StorageService.saveSettings(settings);
  }
};
