/**
 * ATHAR Lightweight Image Preloading & Data-Saver Service
 * Respects user bandwidth and mobile data saver preferences.
 * Preloads assets on-demand rather than bulk-downloading tens of megabytes on app launch.
 */

import { LUXURY_IMAGES } from '../data/storiesAndExploreData';

const PRELOADED_URLS = new Set<string>();

export const ImagePreloadService = {
  /**
   * Preloads a single image on-demand
   */
  preload(src: string): Promise<void> {
    if (!src || PRELOADED_URLS.has(src)) return Promise.resolve();

    // Respect user's Data Saver setting if enabled in mobile browser
    if (typeof navigator !== 'undefined' && (navigator as any).connection?.saveData) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        PRELOADED_URLS.add(src);
        resolve();
      };
      img.onerror = () => {
        resolve();
      };
      img.src = src;
    });
  },

  /**
   * Minimal lightweight warmup: only brand icon and primary home banner
   * Prevents downloading tens of megabytes of background imagery on startup!
   */
  warmupCoreImages(): void {
    if (typeof window === 'undefined') return;
    if ((navigator as any)?.connection?.saveData) return;

    const startPreloading = () => {
      // Only preload the brand icon and home banner
      ImagePreloadService.preload('/athar-royal-icon.jpg');
      ImagePreloadService.preload(LUXURY_IMAGES.sunsetMosqueBanner);
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(startPreloading, { timeout: 3000 });
    } else {
      setTimeout(startPreloading, 1500);
    }
  },

  /**
   * Preload images for a specific tab only when user navigates to it
   */
  preloadTabImages(tab: string): void {
    if ((navigator as any)?.connection?.saveData) return;

    if (tab === 'home') {
      ImagePreloadService.preload(LUXURY_IMAGES.sunsetMosqueBanner);
    } else if (tab === 'quran') {
      ImagePreloadService.preload(LUXURY_IMAGES.goldenMushafCover);
    } else if (tab === 'explore') {
      ImagePreloadService.preload(LUXURY_IMAGES.exploreSanctuary);
    }
  },

  isPreloaded(src: string): boolean {
    return PRELOADED_URLS.has(src);
  }
};
