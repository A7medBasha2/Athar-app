import { Coordinates } from '../types';
import { POPULAR_CITIES, DEFAULT_COORDINATES } from '../data/citiesData';
import { StorageService } from './storageService';

export type LocationPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

const MANUAL_LOCATION_LOCK_KEY = 'athar_manual_location_lock_v1';

let watchId: number | null = null;
let periodicTimerId: ReturnType<typeof setInterval> | null = null;
let lastResolvedCoords: { lat: number; lng: number; timestamp: number } | null = null;

/**
 * Calculates distance in kilometers between two lat/lng points using Haversine formula
 */
function calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const LocationService = {
  /**
   * Returns true if automatic region tracking is enabled (true by default)
   */
  isAutoTrackingEnabled(): boolean {
    try {
      return localStorage.getItem(MANUAL_LOCATION_LOCK_KEY) !== 'true';
    } catch {
      return true;
    }
  },

  /**
   * Enables or disables automatic region tracking
   */
  setAutoTrackingEnabled(enabled: boolean) {
    try {
      if (enabled) {
        localStorage.removeItem(MANUAL_LOCATION_LOCK_KEY);
      } else {
        localStorage.setItem(MANUAL_LOCATION_LOCK_KEY, 'true');
      }
    } catch {
      // Ignore storage errors
    }
  },

  /**
   * Checks current geolocation permission
   */
  async checkPermission(): Promise<LocationPermissionState> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return 'unsupported';
    }
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        return status.state as LocationPermissionState;
      } catch {
        return 'prompt';
      }
    }
    return 'prompt';
  },

  /**
   * Requests real device GPS location with 6-decimal high precision and IP fallback
   */
  async getCurrentPosition(): Promise<{ coords: Coordinates; error?: string }> {
    // 1. Try GPS with high accuracy first
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const getGpsCoords = (highAccuracy: boolean, timeoutMs: number) => {
          return new Promise<GeolocationPosition | null>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve(pos),
              () => resolve(null),
              {
                enableHighAccuracy: highAccuracy,
                timeout: timeoutMs,
                maximumAge: 10000
              }
            );
          });
        };

        // Try high accuracy (satellite / wifi triangulation)
        let pos = await getGpsCoords(true, 6000);
        // If high accuracy times out, try standard accuracy
        if (!pos) {
          pos = await getGpsCoords(false, 4500);
        }

        if (pos) {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const { areaName, countryName } = await LocationService.resolveLocationNames(lat, lng);

          lastResolvedCoords = { lat, lng, timestamp: Date.now() };
          LocationService.setAutoTrackingEnabled(true);

          return {
            coords: {
              latitude: Number(lat.toFixed(6)),
              longitude: Number(lng.toFixed(6)),
              city: areaName,
              country: countryName || 'موقعي الحالي (GPS دقيق)',
              isAutoGps: true
            }
          };
        }
      } catch {
        // Fallback to IP lookup
      }
    }

    // 2. High-precision IP fallback via ipwho.is
    try {
      const ipRes = await fetch('https://ipwho.is/');
      if (ipRes.ok) {
        const data = await ipRes.json();
        if (data.success && !isNaN(Number(data.latitude)) && !isNaN(Number(data.longitude))) {
          const lat = Number(data.latitude);
          const lng = Number(data.longitude);
          const { areaName, countryName } = await LocationService.resolveLocationNames(lat, lng);

          lastResolvedCoords = { lat, lng, timestamp: Date.now() };
          LocationService.setAutoTrackingEnabled(true);

          return {
            coords: {
              latitude: Number(lat.toFixed(6)),
              longitude: Number(lng.toFixed(6)),
              city: areaName || data.city || data.region || 'موقعي الحالي',
              country: countryName || data.country || 'تحديد تلقائي',
              isAutoGps: true
            }
          };
        }
      }
    } catch {
      // Fallback
    }

    const stored = StorageService.getSettings().location;
    return {
      coords: { ...(stored || DEFAULT_COORDINATES), isAutoGps: true },
      error: 'تعذر تحديث إشارة الأقمار الصناعية حالياً. تم اعتماد آخر موقع محفوظ.'
    };
  },

  /**
   * Starts continuous automatic GPS & network region tracking so whenever the user travels
   * or changes area/region, the phone's location and Qibla direction stay 100% calibrated automatically.
   */
  startAutoTracking(onLocationUpdated: (coords: Coordinates) => void): () => void {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return () => {};
    }

    let isMounted = true;

    const syncLocationNow = async () => {
      if (!LocationService.isAutoTrackingEnabled()) return;

      const res = await LocationService.getCurrentPosition();
      if (isMounted && res.coords && !res.error) {
        onLocationUpdated(res.coords);
      }
    };

    // 1. Perform immediate automatic sync on startup
    syncLocationNow();

    // 2. Watch live GPS position changes continuously (100m threshold)
    if (navigator.geolocation) {
      try {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
        }

        watchId = navigator.geolocation.watchPosition(
          async (pos) => {
            if (!isMounted || !LocationService.isAutoTrackingEnabled()) return;

            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            const currentSettings = StorageService.getSettings();
            const savedLat = currentSettings.location.latitude;
            const savedLng = currentSettings.location.longitude;
            const movedKm = calculateDistanceKm(savedLat, savedLng, lat, lng);

            const needsNameRefresh =
              !lastResolvedCoords ||
              calculateDistanceKm(lastResolvedCoords.lat, lastResolvedCoords.lng, lat, lng) >= 0.25;

            if (movedKm >= 0.1 || !currentSettings.location.isAutoGps) {
              let areaName = currentSettings.location.city;
              let countryName = currentSettings.location.country;

              if (needsNameRefresh) {
                const resolved = await LocationService.resolveLocationNames(lat, lng);
                areaName = resolved.areaName;
                countryName = resolved.countryName;
                lastResolvedCoords = { lat, lng, timestamp: Date.now() };
              }

              if (!isMounted) return;
              const updatedCoords: Coordinates = {
                latitude: Number(lat.toFixed(6)),
                longitude: Number(lng.toFixed(6)),
                city: areaName,
                country: countryName || 'تتبع تلقائي نشط',
                isAutoGps: true,
              };
              onLocationUpdated(updatedCoords);
            }
          },
          () => {
            // Ignore transient GPS watch errors silently
          },
          {
            enableHighAccuracy: true,
            maximumAge: 10000,
            timeout: 15000,
          }
        );
      } catch {
        // Ignore if watchPosition is blocked
      }
    }

    // 3. Periodic check every 45 seconds + on network reconnection + on app foregrounding
    periodicTimerId = setInterval(() => {
      if (isMounted && LocationService.isAutoTrackingEnabled()) {
        syncLocationNow();
      }
    }, 45000);

    const handleVisibilityOrNetwork = () => {
      if (document.visibilityState === 'visible' && LocationService.isAutoTrackingEnabled()) {
        syncLocationNow();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrNetwork);
    window.addEventListener('online', handleVisibilityOrNetwork);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityOrNetwork);
      window.removeEventListener('online', handleVisibilityOrNetwork);
      if (periodicTimerId) {
        clearInterval(periodicTimerId);
        periodicTimerId = null;
      }
      if (watchId !== null && navigator.geolocation) {
        try {
          navigator.geolocation.clearWatch(watchId);
        } catch {}
        watchId = null;
      }
    };
  },

  /**
   * Resolves exact locality, city, and country names in Arabic
   */
  async resolveLocationNames(lat: number, lng: number): Promise<{ areaName: string; countryName: string }> {
    // 1. Primary reverse geocoding via OpenStreetMap Nominatim with localized Arabic
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const district = addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || addr.borough || '';
        const city = addr.city || addr.town || addr.village || addr.municipality || addr.state || '';
        const country = addr.country || '';

        let areaName = '';
        if (district && city && district !== city) {
          areaName = `${city} - ${district}`;
        } else if (city) {
          areaName = city;
        } else if (district) {
          areaName = district;
        }

        if (areaName) {
          return { areaName, countryName: country || 'موقعي الحالي' };
        }
      }
    } catch {
      // Fallback
    }

    // 2. Secondary reverse geocoding via BigDataCloud with coordinates
    try {
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=ar`);
      if (res.ok) {
        const data = await res.json();
        const locality = data.locality || data.suburb || data.neighbourhood || '';
        const city = data.city || data.principalSubdivision || '';
        const country = data.countryName || '';

        let areaName = city;
        if (locality && city && locality !== city) {
          areaName = `${city} - ${locality}`;
        } else if (locality) {
          areaName = locality;
        }

        if (areaName) {
          return { areaName, countryName: country || 'موقعي الحالي' };
        }
      }
    } catch {
      // Fallback to preloaded cities
    }

    // 3. Fallback: match closest preloaded city by geographical distance
    let closestCity = POPULAR_CITIES[0].city;
    let closestCountry = POPULAR_CITIES[0].country;
    let minDistance = Infinity;

    for (const c of POPULAR_CITIES) {
      const d = Math.hypot(c.latitude - lat, c.longitude - lng);
      if (d < minDistance) {
        minDistance = d;
        closestCity = c.city;
        closestCountry = c.country;
      }
    }

    return { areaName: closestCity, countryName: closestCountry };
  }
};
