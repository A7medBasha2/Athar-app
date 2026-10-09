import { Coordinates } from '../types';
import { POPULAR_CITIES, DEFAULT_COORDINATES } from '../data/citiesData';

export type LocationPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export const LocationService = {
  /**
   * Checks current geolocation permission
   */
  async checkPermission(): Promise<LocationPermissionState> {
    if (!navigator.geolocation) {
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
   * Requests real device GPS location with high precision and IP fallback
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
                maximumAge: 60000
              }
            );
          });
        };

        // Try high accuracy (satellite / wifi triangulation)
        let pos = await getGpsCoords(true, 6000);
        // If high accuracy times out, try standard accuracy
        if (!pos) {
          pos = await getGpsCoords(false, 5000);
        }

        if (pos) {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const { areaName, countryName } = await LocationService.resolveLocationNames(lat, lng);

          return {
            coords: {
              latitude: Number(lat.toFixed(4)),
              longitude: Number(lng.toFixed(4)),
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

    // 2. High-precision IP fallback via ipwho.is (Free, fast HTTPS client resolution)
    try {
      const ipRes = await fetch('https://ipwho.is/');
      if (ipRes.ok) {
        const data = await ipRes.json();
        if (data.success && !isNaN(Number(data.latitude)) && !isNaN(Number(data.longitude))) {
          const lat = Number(data.latitude);
          const lng = Number(data.longitude);
          const { areaName, countryName } = await LocationService.resolveLocationNames(lat, lng);

          return {
            coords: {
              latitude: Number(lat.toFixed(4)),
              longitude: Number(lng.toFixed(4)),
              city: areaName || data.city || data.region || 'موقعي التقريبي',
              country: countryName || data.country || 'موقعي التقريبي',
              isAutoGps: true
            }
          };
        }
      }
    } catch {
      // Fallback
    }

    return {
      coords: DEFAULT_COORDINATES,
      error: 'تعذر تحديد الموقع الجغرافي تلقائيًا. يمكنك اختيار مدينتك يدويًا من القائمة.'
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
