/**
 * ATHAR High-Speed Image Preloading & Memory Warmup Service
 * Ensures all sacred mosque scenes, royal emblems, and tab banners
 * are pre-decoded in browser memory cache for zero-latency, instant display.
 */

import { LUXURY_IMAGES } from '../data/storiesAndExploreData';
import atharInnerMihrabLogoTransparent from '../assets/images/athar_inner_mihrab_logo_transparent.png';
import enhancedImpactTree from '../assets/images/enhanced_impact_tree_luminous.png';

const PRELOADED_URLS = new Set<string>();

const CORE_PRIORITY_IMAGES = [
  // 5 Sacred Mosque Adhan Scenes (public folder)
  '/adhan-scenes/fajr.jpg',
  '/adhan-scenes/dhuhr.jpg',
  '/adhan-scenes/asr.jpg',
  '/adhan-scenes/maghrib.jpg',
  '/adhan-scenes/isha.jpg',
  '/athar-royal-icon.jpg',
  // Key assets
  atharInnerMihrabLogoTransparent,
  enhancedImpactTree,
  LUXURY_IMAGES.sunsetMosqueBanner,
  LUXURY_IMAGES.mosqueSplash,
  LUXURY_IMAGES.goldenMushafCover,
  LUXURY_IMAGES.exploreSanctuary,
  LUXURY_IMAGES.kaabaGoldenNight,
  LUXURY_IMAGES.kaabaDawn,
  LUXURY_IMAGES.madinahGreenDome,
  LUXURY_IMAGES.mihrabArches,
];

export const ImagePreloadService = {
  /**
   * Preloads a single image and decodes it immediately into browser cache
   */
  preload(src: string): Promise<void> {
    if (!src || PRELOADED_URLS.has(src)) return Promise.resolve();

    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        PRELOADED_URLS.add(src);
        resolve();
      };
      img.onerror = () => {
        // Resolve anyway so it never blocks
        resolve();
      };
      img.src = src;
    });
  },

  /**
   * Warms up all core images asynchronously during browser idle time
   */
  warmupCoreImages(): void {
    if (typeof window === 'undefined') return;

    const startPreloading = () => {
      // First batch: above-the-fold Adhan scenes & brand logo
      const firstBatch = CORE_PRIORITY_IMAGES.slice(0, 6);
      firstBatch.forEach((url) => {
        ImagePreloadService.preload(url);
      });

      // Second batch: remainder of sanctuary and banner scenes after small delay
      setTimeout(() => {
        const remainingBatch = CORE_PRIORITY_IMAGES.slice(6);
        remainingBatch.forEach((url) => {
          ImagePreloadService.preload(url);
        });
      }, 400);
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(startPreloading, { timeout: 1500 });
    } else {
      setTimeout(startPreloading, 100);
    }
  },

  /**
   * Preload images for a specific tab before or upon hover/tap
   */
  preloadTabImages(tab: string): void {
    if (tab === 'home') {
      ImagePreloadService.preload(LUXURY_IMAGES.sunsetMosqueBanner);
    } else if (tab === 'quran') {
      ImagePreloadService.preload(LUXURY_IMAGES.goldenMushafCover);
    } else if (tab === 'prayers') {
      ImagePreloadService.preload(LUXURY_IMAGES.mosqueSplash);
    } else if (tab === 'explore') {
      ImagePreloadService.preload(LUXURY_IMAGES.exploreSanctuary);
    } else if (tab === 'stories') {
      ImagePreloadService.preload(LUXURY_IMAGES.mihrabArches);
    }
  },

  isPreloaded(src: string): boolean {
    return PRELOADED_URLS.has(src);
  }
};
