import { Coordinates, QiblaData } from '../types';

export const KAABA_COORDINATES = {
  latitude: 21.422487,
  longitude: 39.826206
};

export const QiblaService = {
  /**
   * Calculates the exact Great-Circle forward azimuth (bearing from True North)
   * from user coordinates to the Holy Kaaba in Makkah with high precision.
   */
  calculateQiblaBearing(userCoords: Coordinates): number {
    const lat1 = (userCoords.latitude * Math.PI) / 180;
    const lng1 = (userCoords.longitude * Math.PI) / 180;
    const lat2 = (KAABA_COORDINATES.latitude * Math.PI) / 180;
    const lng2 = (KAABA_COORDINATES.longitude * Math.PI) / 180;

    const deltaLng = lng2 - lng1;

    const y = Math.sin(deltaLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

    let bearing = (Math.atan2(y, x) * 180) / Math.PI;
    bearing = (bearing + 360) % 360;

    return Math.round(bearing * 100) / 100;
  },

  /**
   * Returns clear Arabic cardinal/intercardinal direction name for a given bearing
   */
  getCardinalDirectionArabic(bearing: number): string {
    const normalized = ((bearing % 360) + 360) % 360;
    if (normalized >= 337.5 || normalized < 22.5) return 'الشمال تماماً (N)';
    if (normalized >= 22.5 && normalized < 67.5) return 'الشمال الشرقي (NE)';
    if (normalized >= 67.5 && normalized < 112.5) return 'الشرق تماماً (E)';
    if (normalized >= 112.5 && normalized < 157.5) return 'الجنوب الشرقي (SE)';
    if (normalized >= 157.5 && normalized < 202.5) return 'الجنوب تماماً (S)';
    if (normalized >= 202.5 && normalized < 247.5) return 'الجنوب الغربي (SW)';
    if (normalized >= 247.5 && normalized < 292.5) return 'الغرب تماماً (W)';
    return 'الشمال الغربي (NW)';
  },

  /**
   * Estimates local magnetic declination (difference between Magnetic North and True North)
   * for accurate True-North Qibla alignment on magnetic sensors.
   */
  estimateMagneticDeclination(coords: Coordinates): number {
    const { latitude, longitude } = coords;
    if (latitude >= 10 && latitude <= 42 && longitude >= 24 && longitude <= 60) {
      return 3.8 + (latitude - 25) * 0.06 + (longitude - 35) * 0.03;
    }
    if (latitude >= 20 && latitude <= 38 && longitude >= -18 && longitude < 24) {
      return 1.5 + (longitude + 5) * 0.08;
    }
    return 0;
  },

  /**
   * Circular Low-Pass Filter (EMA on unit circle sin/cos) with deadband stabilization.
   * Prevents compass jitter, sudden jumps, and 0°/360° wrap-around glitches.
   */
  smoothHeading(prevHeading: number | null, rawHeading: number, smoothingFactor = 0.16): number {
    const normalizedRaw = ((rawHeading % 360) + 360) % 360;
    if (prevHeading === null || isNaN(prevHeading)) {
      return normalizedRaw;
    }

    let diff = normalizedRaw - prevHeading;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;

    // Ignore micro-jitter (< 0.8 degrees) to keep Qibla rock-steady when phone is still
    if (Math.abs(diff) < 0.8) {
      return prevHeading;
    }

    const nextRad = ((prevHeading + diff * smoothingFactor) * Math.PI) / 180;
    const sinVal = Math.sin(nextRad);
    const cosVal = Math.cos(nextRad);
    const smoothed = ((Math.atan2(sinVal, cosVal) * 180) / Math.PI + 360) % 360;

    return Math.round(smoothed * 10) / 10;
  },

  /**
   * Unwraps a target angle (-180..180 or 0..360) relative to the previous continuous CSS rotation angle
   * so CSS transforms always take the shortest path and never spin 360° backwards.
   */
  unwrapAngle(prevContinuousAngle: number, targetAngle: number): number {
    let delta = targetAngle - prevContinuousAngle;
    delta = ((delta + 180) % 360 + 360) % 360 - 180;
    return prevContinuousAngle + delta;
  },

  /**
   * Calculates distance to Kaaba in kilometers using Haversine formula
   */
  calculateDistanceToKaaba(userCoords: Coordinates): number {
    const R = 6371; // Earth's mean radius in km
    const lat1 = (userCoords.latitude * Math.PI) / 180;
    const lat2 = (KAABA_COORDINATES.latitude * Math.PI) / 180;
    const deltaLat = ((KAABA_COORDINATES.latitude - userCoords.latitude) * Math.PI) / 180;
    const deltaLng = ((KAABA_COORDINATES.longitude - userCoords.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  },

  /**
   * Evaluates compass heading and Qibla alignment
   */
  getQiblaData(userCoords: Coordinates, deviceHeading: number): QiblaData {
    const bearing = this.calculateQiblaBearing(userCoords);
    const distanceKm = this.calculateDistanceToKaaba(userCoords);

    let offset = bearing - deviceHeading;
    while (offset > 180) offset -= 360;
    while (offset < -180) offset += 360;

    const isAligned = Math.abs(offset) <= 4;

    return {
      bearing: Math.round(bearing * 10) / 10,
      distanceKm,
      compassHeading: Math.round(((deviceHeading % 360) + 360) % 360),
      offset: Math.round(offset * 10) / 10,
      isAligned
    };
  }
};
