import { Coordinates, QiblaData } from '../types';

export const KAABA_COORDINATES = {
  latitude: 21.422487,
  longitude: 39.826206
};

export const QiblaService = {
  /**
   * Calculates the true great-circle bearing from user coordinates to Kaaba in Makkah
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

    return Math.round(bearing * 10) / 10;
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

    // Calculate relative needle angle on screen
    let offset = bearing - deviceHeading;
    while (offset > 180) offset -= 360;
    while (offset < -180) offset += 360;

    const isAligned = Math.abs(offset) <= 4;

    return {
      bearing,
      distanceKm,
      compassHeading: Math.round(deviceHeading),
      offset: Math.round(offset),
      isAligned
    };
  }
};
