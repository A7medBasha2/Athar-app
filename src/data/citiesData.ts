import { Coordinates } from '../types';

export const POPULAR_CITIES: Coordinates[] = [
  { city: "مكة المكرمة", country: "المملكة العربية السعودية", latitude: 21.4225, longitude: 39.8262, isAutoGps: false },
  { city: "المدينة المنورة", country: "المملكة العربية السعودية", latitude: 24.5247, longitude: 39.5692, isAutoGps: false },
  { city: "الرياض", country: "المملكة العربية السعودية", latitude: 24.7136, longitude: 46.6753, isAutoGps: false },
  { city: "القاهرة", country: "جمهورية مصر العربية", latitude: 30.0444, longitude: 31.2357, isAutoGps: false },
  { city: "القدس الشريف", country: "فلسطين", latitude: 31.7683, longitude: 35.2137, isAutoGps: false },
  { city: "دبي", country: "الإمارات العربية المتحدة", latitude: 25.2048, longitude: 55.2708, isAutoGps: false },
  { city: "أبوظبي", country: "الإمارات العربية المتحدة", latitude: 24.4539, longitude: 54.3773, isAutoGps: false },
  { city: "الدوحة", country: "قطر", latitude: 25.2854, longitude: 51.5310, isAutoGps: false },
  { city: "الكويت", country: "الكويت", latitude: 29.3759, longitude: 47.9774, isAutoGps: false },
  { city: "عَمّان", country: "الأردن", latitude: 31.9454, longitude: 35.9284, isAutoGps: false },
  { city: "دمشق", country: "سوريا", latitude: 33.5138, longitude: 36.2765, isAutoGps: false },
  { city: "بيروت", country: "لبنان", latitude: 33.8938, longitude: 35.5018, isAutoGps: false },
  { city: "بغداد", country: "العراق", latitude: 33.3152, longitude: 44.3661, isAutoGps: false },
  { city: "الرباط", country: "المغرب", latitude: 34.0209, longitude: -6.8416, isAutoGps: false },
  { city: "تونس", country: "تونس", latitude: 36.8065, longitude: 10.1815, isAutoGps: false },
  { city: "الجزائر", country: "الجزائر", latitude: 36.7538, longitude: 3.0588, isAutoGps: false },
  { city: "مسقط", country: "عُمان", latitude: 23.5880, longitude: 58.3829, isAutoGps: false },
  { city: "المنامة", country: "البحرين", latitude: 26.2285, longitude: 50.5860, isAutoGps: false },
  { city: "إسطنبول", country: "تركيا", latitude: 41.0082, longitude: 28.9784, isAutoGps: false },
  { city: "جاكرتا", country: "إندونيسيا", latitude: -6.2088, longitude: 106.8456, isAutoGps: false },
  { city: "كوالالمبور", country: "ماليزيا", latitude: 3.1390, longitude: 101.6869, isAutoGps: false },
  { city: "لندن", country: "المملكة المتحدة", latitude: 51.5074, longitude: -0.1278, isAutoGps: false },
  { city: "باريس", country: "فرنسا", latitude: 48.8566, longitude: 2.3522, isAutoGps: false }
];

export const DEFAULT_COORDINATES: Coordinates = {
  ...POPULAR_CITIES[3],
  isAutoGps: true
};
