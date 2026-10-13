import { Coordinates } from '../types';
import { POPULAR_CITIES, DEFAULT_COORDINATES, CityLocationEntry } from '../data/citiesData';
import { StorageService } from './storageService';

export type LocationPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

const MANUAL_LOCATION_LOCK_KEY = 'athar_manual_location_lock_v1';
const GEO_CACHE_KEY = 'athar_reverse_geocode_cache_v2';

let watchId: number | null = null;
let periodicTimerId: ReturnType<typeof setInterval> | null = null;
let lastResolvedCoords: { lat: number; lng: number; timestamp: number } | null = null;

export interface ResolvedLocationInfo {
  cityName: string;
  districtName: string;
  formattedLocation: string;
  countryName: string;
  distanceKm: number;
}

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

/**
 * Determines compass sector in Arabic between city center and user point
 */
function getDirectionalSectorArabic(centerLat: number, centerLng: number, userLat: number, userLng: number): string {
  const dLat = userLat - centerLat;
  const dLng = userLng - centerLng;
  const distKm = calculateDistanceKm(centerLat, centerLng, userLat, userLng);
  if (distKm <= 2.2) return 'وسط المدينة';

  const angle = (Math.atan2(dLng, dLat) * 180) / Math.PI; // -180 to 180 (0 = North, 90 = East)
  if (angle >= -22.5 && angle < 22.5) return 'المنطقة الشمالية';
  if (angle >= 22.5 && angle < 67.5) return 'المنطقة الشمالية الشرقية';
  if (angle >= 67.5 && angle < 112.5) return 'المنطقة الشرقية';
  if (angle >= 112.5 && angle < 157.5) return 'المنطقة الجنوبية الشرقية';
  if (angle >= 157.5 || angle < -157.5) return 'المنطقة الجنوبية';
  if (angle >= -157.5 && angle < -112.5) return 'المنطقة الجنوبية الغربية';
  if (angle >= -112.5 && angle < -67.5) return 'المنطقة الغربية';
  return 'المنطقة الشمالية الغربية';
}

/**
 * Formats a Coordinates object into a rich "City - District" display label
 */
export function formatFullLocationLabel(coords?: Coordinates | null): string {
  if (!coords) return 'القاهرة - وسط البلد';
  if (coords.formattedLocation && coords.formattedLocation.trim()) {
    return coords.formattedLocation;
  }
  const city = (coords.city || 'القاهرة').trim();
  const district = (coords.district || '').trim();
  if (district && !city.includes(district) && district !== city) {
    return `${city} - ${district}`;
  }
  return city;
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
   * Resolves closest city AND specific district/neighborhood 100% locally using Haversine spherical distance
   * against the local database of cities and districts, without requiring any external geocoding API.
   */
  resolveOfflineNearestCity(lat: number, lng: number): ResolvedLocationInfo {
    let closestEntry: CityLocationEntry = POPULAR_CITIES[0];
    let minDistanceKm = Infinity;

    for (const c of POPULAR_CITIES) {
      const distKm = calculateDistanceKm(lat, lng, c.latitude, c.longitude);
      if (distKm < minDistanceKm) {
        minDistanceKm = distKm;
        closestEntry = c;
      }
    }

    const cityName = closestEntry.city;
    const countryName = closestEntry.country;

    // Find closest landmark district within the matched city
    let bestDistrictName = closestEntry.district || 'وسط المدينة';
    let minDistrictDistKm = Infinity;

    if (closestEntry.districts && closestEntry.districts.length > 0) {
      for (const d of closestEntry.districts) {
        const dDist = calculateDistanceKm(lat, lng, d.latitude, d.longitude);
        if (dDist < minDistrictDistKm) {
          minDistrictDistKm = dDist;
          bestDistrictName = d.name;
        }
      }
    }

    if (minDistanceKm <= 85) {
      // If within 18 km of a known district, use that exact neighborhood name; otherwise use directional sector
      const districtName =
        minDistrictDistKm <= 18
          ? bestDistrictName
          : getDirectionalSectorArabic(closestEntry.latitude, closestEntry.longitude, lat, lng);

      const formattedLocation =
        districtName && !cityName.includes(districtName)
          ? `${cityName} - ${districtName}`
          : cityName;

      return {
        cityName,
        districtName,
        formattedLocation,
        countryName,
        distanceKm: minDistanceKm,
      };
    }

    const sector = getDirectionalSectorArabic(closestEntry.latitude, closestEntry.longitude, lat, lng);
    return {
      cityName: `قرب ${cityName}`,
      districtName: sector,
      formattedLocation: `قرب ${cityName} - ${sector}`,
      countryName,
      distanceKm: minDistanceKm,
    };
  },

  /**
   * Requests real device GPS location with 6-decimal high precision and resolves both City & District/Area
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
                maximumAge: 15000,
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
          const resolved = await LocationService.resolveLocationNames(lat, lng);

          lastResolvedCoords = { lat, lng, timestamp: Date.now() };
          LocationService.setAutoTrackingEnabled(true);

          return {
            coords: {
              latitude: Number(lat.toFixed(6)),
              longitude: Number(lng.toFixed(6)),
              city: resolved.cityName,
              district: resolved.districtName,
              formattedLocation: resolved.formattedLocation,
              country: resolved.countryName || 'موقعي الحالي (GPS محلي)',
              isAutoGps: true,
            },
          };
        }
      } catch {
        // Fall through to saved local coordinates
      }
    }

    const stored = StorageService.getSettings().location;
    const base = stored || DEFAULT_COORDINATES;
    const offlineResolved = this.resolveOfflineNearestCity(base.latitude, base.longitude);
    return {
      coords: {
        ...base,
        city: base.city || offlineResolved.cityName,
        district: base.district || offlineResolved.districtName,
        formattedLocation:
          base.formattedLocation ||
          (base.district ? `${base.city} - ${base.district}` : offlineResolved.formattedLocation),
        isAutoGps: true,
      },
    };
  },

  /**
   * Starts continuous automatic GPS tracking so whenever the user travels
   * or changes area/neighborhood, the phone's location, prayer times, and Qibla direction stay 100% calibrated.
   * Highly optimized to conserve mobile data: uses offline database first and only updates on significant movement (>= 1.5km).
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

    // Initial sync
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

            // Conserve battery and network: only refresh when user moved >= 1.5 km (not minor GPS jitter!)
            if (movedKm < 1.5 && currentSettings.location.city && currentSettings.location.isAutoGps) {
              return;
            }

            const needsNameRefresh =
              !lastResolvedCoords ||
              !currentSettings.location.city ||
              calculateDistanceKm(lastResolvedCoords.lat, lastResolvedCoords.lng, lat, lng) >= 3.0;

            let cityName = currentSettings.location.city;
            let districtName = currentSettings.location.district || '';
            let formattedLocation = currentSettings.location.formattedLocation || cityName;
            let countryName = currentSettings.location.country;

            if (needsNameRefresh) {
              const resolved = await LocationService.resolveLocationNames(lat, lng);
              cityName = resolved.cityName;
              districtName = resolved.districtName;
              formattedLocation = resolved.formattedLocation;
              countryName = resolved.countryName;
              lastResolvedCoords = { lat, lng, timestamp: Date.now() };
            }

            if (!isMounted) return;
            const updatedCoords: Coordinates = {
              latitude: Number(lat.toFixed(6)),
              longitude: Number(lng.toFixed(6)),
              city: cityName,
              district: districtName,
              formattedLocation,
              country: countryName || 'تتبع GPS محلي نشط',
              isAutoGps: true,
            };
            onLocationUpdated(updatedCoords);
          },
          () => {
            // Ignore transient GPS watch errors silently
          },
          {
            enableHighAccuracy: false, // Low power mode saves significant mobile battery and data
            maximumAge: 120000,        // 2 minutes cache
            timeout: 15000,
          }
        );
      } catch {
        // Ignore if watchPosition is blocked
      }
    }

    // Periodic check every 5 minutes (instead of every 60s) to conserve bandwidth and CPU
    periodicTimerId = setInterval(() => {
      if (isMounted && LocationService.isAutoTrackingEnabled()) {
        syncLocationNow();
      }
    }, 300000);

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
   * Resolves exact neighborhood/district, city, and country names in Arabic.
   * Zero-network offline matching against embedded database first.
   * Only calls reverse geocoding if offline matching is distant and result is cached for 7 days.
   */
  async resolveLocationNames(
    lat: number,
    lng: number
  ): Promise<{
    areaName: string;
    cityName: string;
    districtName: string;
    formattedLocation: string;
    countryName: string;
  }> {
    const offlineMatch = this.resolveOfflineNearestCity(lat, lng);

    // Rounded cache key (~3km grid)
    const gridLat = Number(lat.toFixed(2));
    const gridLng = Number(lng.toFixed(2));
    const cacheKey = `${gridLat}_${gridLng}`;

    try {
      const rawCache = localStorage.getItem(GEO_CACHE_KEY);
      if (rawCache) {
        const parsedCache = JSON.parse(rawCache);
        if (parsedCache[cacheKey] && parsedCache[cacheKey].cityName) {
          // If cached within 7 days, return directly with 0 network usage!
          const cachedItem = parsedCache[cacheKey];
          if (!cachedItem.savedAt || Date.now() - cachedItem.savedAt < 7 * 86400000) {
            return cachedItem;
          }
        }
      }
    } catch {}

    // If offline nearest city database has a close match within 25km, use it directly without network!
    if (offlineMatch.distanceKm <= 25 && offlineMatch.cityName) {
      const result = {
        areaName: offlineMatch.formattedLocation,
        cityName: offlineMatch.cityName,
        districtName: offlineMatch.districtName,
        formattedLocation: offlineMatch.formattedLocation,
        countryName: offlineMatch.countryName,
        savedAt: Date.now()
      };
      try {
        const raw = localStorage.getItem(GEO_CACHE_KEY);
        const map = raw ? JSON.parse(raw) : {};
        map[cacheKey] = result;
        localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(map));
      } catch {}
      return result;
    }

    // Only if distant from known cities and online, attempt Arabic reverse geocoding
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2400);

        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${gridLat}&lon=${gridLng}&zoom=14&accept-language=ar`;
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const addr = data?.address || {};

          const detectedCity =
            addr.city ||
            addr.town ||
            addr.municipality ||
            addr.state_district ||
            addr.county ||
            addr.state ||
            offlineMatch.cityName;

          const detectedDistrict =
            addr.suburb ||
            addr.neighbourhood ||
            addr.quarter ||
            addr.city_district ||
            addr.borough ||
            addr.village ||
            addr.residential ||
            offlineMatch.districtName;

          const detectedCountry = addr.country || offlineMatch.countryName;

          const cleanCity = String(detectedCity).trim();
          const cleanDistrict = String(detectedDistrict).trim();

          const formattedLocation =
            cleanDistrict && cleanDistrict !== cleanCity && !cleanCity.includes(cleanDistrict)
              ? `${cleanCity} - ${cleanDistrict}`
              : offlineMatch.formattedLocation;

          const result = {
            areaName: formattedLocation,
            cityName: cleanCity,
            districtName: cleanDistrict || offlineMatch.districtName,
            formattedLocation,
            countryName: detectedCountry,
            savedAt: Date.now()
          };

          try {
            const raw = localStorage.getItem(GEO_CACHE_KEY);
            const map = raw ? JSON.parse(raw) : {};
            map[cacheKey] = result;
            localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(map));
          } catch {}

          return result;
        }
      } catch {
        // Fallback to offline match on network failure
      }
    }

    return {
      areaName: offlineMatch.formattedLocation,
      cityName: offlineMatch.cityName,
      districtName: offlineMatch.districtName,
      formattedLocation: offlineMatch.formattedLocation,
      countryName: offlineMatch.countryName,
    };
  },
};
