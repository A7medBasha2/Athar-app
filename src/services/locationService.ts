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
export function calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
   * Resolves closest city and country 100% locally using Haversine spherical distance
   * against the local database of cities, without requiring any external geocoding API.
   */
  resolveOfflineNearestCity(lat: number, lng: number): { areaName: string; countryName: string; distanceKm: number } {
    let closestCity = POPULAR_CITIES[0].city;
    let closestCountry = POPULAR_CITIES[0].country;
    let minDistanceKm = Infinity;

    for (const c of POPULAR_CITIES) {
      const distKm = calculateDistanceKm(lat, lng, c.latitude, c.longitude);
      if (distKm < minDistanceKm) {
        minDistanceKm = distKm;
        closestCity = c.city;
        closestCountry = c.country;
      }
    }

    if (minDistanceKm <= 85) {
      return { areaName: closestCity, countryName: closestCountry, distanceKm: minDistanceKm };
    }
    return {
      areaName: `قرب ${closestCity}`,
      countryName: closestCountry,
      distanceKm: minDistanceKm
    };
  },

  /**
   * Requests real device GPS location with 6-decimal high precision and pure offline city matching
   */
  async getCurrentPosition(): Promise<{ coords: Coordinates; error?: string }> {
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
                maximumAge: 15000
              }
            );
          });
        };

        let pos = await getGpsCoords(true, 5000);
        if (!pos) {
          pos = await getGpsCoords(false, 3500);
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
              country: countryName || 'موقعي الحالي (GPS محلي)',
              isAutoGps: true
            }
          };
        }
      } catch {
        // Fall through to saved local coordinates
      }
    }

    const stored = StorageService.getSettings().location;
    return {
      coords: { ...(stored || DEFAULT_COORDINATES), isAutoGps: true }
    };
  },

  /**
   * Starts continuous automatic GPS tracking so whenever the user travels
   * or changes area/region, the phone's location, prayer times, and Qibla direction stay 100% calibrated offline.
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

    syncLocationNow();

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
                country: countryName || 'تتبع GPS محلي نشط',
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
            maximumAge: 15000,
            timeout: 12000,
          }
        );
      } catch {
        // Ignore if watchPosition is blocked
      }
    }

    periodicTimerId = setInterval(() => {
      if (isMounted && LocationService.isAutoTrackingEnabled()) {
        syncLocationNow();
      }
    }, 60000);

    return () => {
      isMounted = false;
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
   * Resolves locality, city, and country names in Arabic using 100% local city database first
   */
  async resolveLocationNames(lat: number, lng: number): Promise<{ areaName: string; countryName: string }> {
    const offlineMatch = this.resolveOfflineNearestCity(lat, lng);
    return {
      areaName: offlineMatch.areaName,
      countryName: offlineMatch.countryName
    };
  }
};
