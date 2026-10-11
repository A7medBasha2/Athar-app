import { PrayerTimesData, PrayerTimeItem, Coordinates, PrayerCalculationMethod } from '../types';
import { StorageService } from './storageService';
import { AstronomicalPrayerEngine } from './astronomicalPrayerEngine';
import { OfflineDatabase } from './offlineDatabase';
import { i18n } from './i18n';

/**
 * تحويل صيغة الوقت من نظام 24 ساعة إلى نظام 12 ساعة مع الرمزين (ص / م) أو (AM / PM)
 */
export function formatPrayerTime12(time24?: string, isEnParam?: boolean): string {
  if (!time24) return '--:--';
  const clean = time24.split(' ')[0].trim();
  const [hStr, mStr] = clean.split(':');
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return time24;
  const isPM = h >= 12;
  const isEn = isEnParam !== undefined ? isEnParam : (typeof i18n !== 'undefined' ? i18n.isEn() : false);
  const suffix = isEn ? (isPM ? 'PM' : 'AM') : (isPM ? 'م' : 'ص');
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${suffix}`;
}

// In-memory memoization cache to prevent redundant astronomical computations on tab switches
interface MemoizedPrayerCacheEntry {
  cacheKey: string;
  computedAtMs: number;
  baseData: PrayerTimesData;
}

let inMemoryPrayerCache: MemoizedPrayerCacheEntry | null = null;

function buildPrayerCacheKey(coords: Coordinates, method: PrayerCalculationMethod, now: Date): string {
  const latKey = Number(coords.latitude || 0).toFixed(3);
  const lngKey = Number(coords.longitude || 0).toFixed(3);
  const locLabel = coords.formattedLocation || coords.district || coords.city || '';
  const dayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  return `${latKey}_${lngKey}_${method}_${dayKey}_${locLabel}`;
}

function refreshDynamicCountdown(base: PrayerTimesData, now: Date = new Date()): PrayerTimesData {
  const nowMs = now.getTime();
  const prayerOrder: { id: PrayerTimeItem['id']; nameArabic: string; rawTime: string }[] = [
    { id: 'fajr', nameArabic: 'الفجر', rawTime: base.timings.fajr },
    { id: 'sunrise', nameArabic: 'الشروق', rawTime: base.timings.sunrise },
    { id: 'dhuhr', nameArabic: 'الظهر', rawTime: base.timings.dhuhr },
    { id: 'asr', nameArabic: 'العصر', rawTime: base.timings.asr },
    { id: 'maghrib', nameArabic: 'المغرب', rawTime: base.timings.maghrib },
    { id: 'isha', nameArabic: 'العشاء', rawTime: base.timings.isha },
  ];

  const items: PrayerTimeItem[] = prayerOrder.map((def) => {
    const clean = (def.rawTime || '00:00').split(' ')[0];
    const [h, m] = clean.split(':').map(Number);
    const timestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h || 0, m || 0, 0).getTime();
    const formatted12 = formatPrayerTime12(clean);
    return {
      id: def.id,
      nameArabic: def.nameArabic,
      time: formatted12,
      time12: formatted12,
      time24: clean,
      timestamp,
      isPassed: timestamp < nowMs,
      isCurrent: false,
      isNext: false,
    };
  });

  let currentPrayer: PrayerTimeItem | null = null;
  let nextPrayer: PrayerTimeItem | null = null;
  let timeRemainingSeconds = 0;

  for (let i = 0; i < items.length; i++) {
    if (items[i].timestamp > nowMs) {
      nextPrayer = { ...items[i], isNext: true };
      currentPrayer = i > 0 ? { ...items[i - 1], isCurrent: true } : { ...items[items.length - 1], isCurrent: true };
      timeRemainingSeconds = Math.max(0, Math.floor((items[i].timestamp - nowMs) / 1000));
      break;
    }
  }

  if (!nextPrayer) {
    currentPrayer = { ...items[items.length - 1], isCurrent: true };
    const cleanFajr = (base.timings.fajr || '04:30').split(' ')[0];
    const [fh, fm] = cleanFajr.split(':').map(Number);
    const tomorrowFajrMs = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, fh || 0, fm || 0, 0).getTime();
    timeRemainingSeconds = Math.max(0, Math.floor((tomorrowFajrMs - nowMs) / 1000));
    nextPrayer = {
      ...items[0],
      timestamp: tomorrowFajrMs,
      isNext: true,
    };
  }

  return {
    ...base,
    currentPrayer,
    nextPrayer,
    timeRemainingSeconds,
  };
}

export const PrayerTimesService = {
  /**
   * Returns instantaneous prayer times synchronously using in-memory memoization,
   * localStorage cache, or the pure local Astronomical Prayer Engine.
   */
  getInitialPrayerTimes(coords: Coordinates, explicitMethod?: PrayerCalculationMethod): PrayerTimesData {
    const now = new Date();
    const method = explicitMethod || StorageService.getSettings().calculationMethod || '5';
    const cacheKey = buildPrayerCacheKey(coords, method, now);

    // 1. Fast path: In-memory memoized result for same coordinates, method, and day
    if (inMemoryPrayerCache && inMemoryPrayerCache.cacheKey === cacheKey) {
      return refreshDynamicCountdown(inMemoryPrayerCache.baseData, now);
    }

    // 2. Check persistent localStorage cached prayers if matching today & location
    const storedCache = StorageService.getCachedPrayers();
    const todayDateStr = now.toISOString().split('T')[0];
    if (
      storedCache &&
      storedCache.dateGregorian === todayDateStr &&
      storedCache.locationName &&
      (storedCache.locationName.includes(coords.city) ||
        (coords.formattedLocation && storedCache.locationName === coords.formattedLocation))
    ) {
      const refreshed = refreshDynamicCountdown(storedCache, now);
      inMemoryPrayerCache = {
        cacheKey,
        computedAtMs: now.getTime(),
        baseData: refreshed,
      };
      return refreshed;
    }

    // 3. Compute via local AstronomicalPrayerEngine and memoize
    const data = AstronomicalPrayerEngine.calculateFullPrayerTimesData(coords, method, now);
    inMemoryPrayerCache = {
      cacheKey,
      computedAtMs: now.getTime(),
      baseData: data,
    };
    StorageService.setCachedPrayers(data);
    return data;
  },

  /**
   * Computes or retrieves memoized exact prayer timings and Hijri date 100% locally
   * without causing redundant recalculations or visual flicker on screen transitions.
   */
  async getPrayerTimes(
    coords: Coordinates,
    method: PrayerCalculationMethod = '5'
  ): Promise<PrayerTimesData> {
    const now = new Date();
    const cacheKey = buildPrayerCacheKey(coords, method, now);

    if (inMemoryPrayerCache && inMemoryPrayerCache.cacheKey === cacheKey) {
      return refreshDynamicCountdown(inMemoryPrayerCache.baseData, now);
    }

    const prayerData = AstronomicalPrayerEngine.calculateFullPrayerTimesData(coords, method, now);
    inMemoryPrayerCache = {
      cacheKey,
      computedAtMs: now.getTime(),
      baseData: prayerData,
    };

    // Persist in local cache & IndexedDB database asynchronously
    StorageService.setCachedPrayers(prayerData);
    OfflineDatabase.putRecord('cities_prayer_tables', {
      id: `${coords.city || 'current'}_${method}`,
      city: coords.city || 'الموقع الحالي',
      country: coords.country || '',
      latitude: coords.latitude,
      longitude: coords.longitude,
      method,
      timings: prayerData.timings,
      dateHijri: prayerData.dateHijri,
      updatedAt: Date.now()
    }).catch(() => {});

    return prayerData;
  },

  /**
   * Formats raw timings into active prayer states, countdowns, and Arabic labels
   */
  processTimingsResponse(
    rawTimings: Record<string, string>,
    hijriData: any,
    gregorianData: any,
    locationName: string
  ): PrayerTimesData {
    const now = new Date();

    const cleanTime = (t: string) => t.split(' ')[0];

    const rawFajr = cleanTime(rawTimings.Fajr);
    const rawSunrise = cleanTime(rawTimings.Sunrise);
    const rawDhuhr = cleanTime(rawTimings.Dhuhr);
    const rawAsr = cleanTime(rawTimings.Asr);
    const rawMaghrib = cleanTime(rawTimings.Maghrib);
    const rawIsha = cleanTime(rawTimings.Isha);

    const prayerDefs: { id: PrayerTimeItem['id']; nameArabic: string; time: string }[] = [
      { id: 'fajr', nameArabic: 'الفجر', time: rawFajr },
      { id: 'sunrise', nameArabic: 'الشروق', time: rawSunrise },
      { id: 'dhuhr', nameArabic: 'الظهر', time: rawDhuhr },
      { id: 'asr', nameArabic: 'العصر', time: rawAsr },
      { id: 'maghrib', nameArabic: 'المغرب', time: rawMaghrib },
      { id: 'isha', nameArabic: 'العشاء', time: rawIsha },
    ];

    const todayDateStr = now.toISOString().split('T')[0];

    const items: PrayerTimeItem[] = prayerDefs.map(def => {
      const [h, m] = def.time.split(':').map(Number);
      const pDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
      const timestamp = pDate.getTime();
      const formatted12 = formatPrayerTime12(def.time);
      return {
        id: def.id,
        nameArabic: def.nameArabic,
        time: formatted12,
        time12: formatted12,
        time24: def.time,
        timestamp,
        isPassed: timestamp < now.getTime(),
        isCurrent: false,
        isNext: false
      };
    });

    let currentPrayer: PrayerTimeItem | null = null;
    let nextPrayer: PrayerTimeItem | null = null;
    let timeRemainingSeconds = 0;

    for (let i = 0; i < items.length; i++) {
      if (items[i].timestamp > now.getTime()) {
        nextPrayer = items[i];
        items[i].isNext = true;
        currentPrayer = i > 0 ? items[i - 1] : items[items.length - 1];
        if (i > 0) items[i - 1].isCurrent = true;
        timeRemainingSeconds = Math.max(0, Math.floor((items[i].timestamp - now.getTime()) / 1000));
        break;
      }
    }

    if (!nextPrayer) {
      currentPrayer = items[items.length - 1];
      items[items.length - 1].isCurrent = true;
      const [fh, fm] = rawFajr.split(':').map(Number);
      const tomorrowFajrDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, fh, fm, 0);
      timeRemainingSeconds = Math.max(0, Math.floor((tomorrowFajrDate.getTime() - now.getTime()) / 1000));
      nextPrayer = {
        ...items[0],
        timestamp: tomorrowFajrDate.getTime(),
        isNext: true
      };
    }

    const hijriArabicMonths = [
      'مُحَرَّم', 'صَفَر', 'رَبِيع الأَوَّل', 'رَبِيع الآخِر', 'جُمَادَى الأُولَى', 'جُمَادَى الآخِرَة',
      'رَجَب', 'شَعْبَان', 'رَمَضَان', 'شَوَّال', 'ذُو القَعْدَة', 'ذُو الحِجَّة'
    ];

    const hijriMonthIndex = hijriData?.month?.number ? Number(hijriData.month.number) - 1 : 0;
    const hijriMonthName = hijriArabicMonths[hijriMonthIndex] || hijriData?.month?.ar || 'رمضان';
    const hijriDay = hijriData?.day || '1';
    const hijriYear = hijriData?.year || '1448';

    return {
      dateGregorian: gregorianData?.date || todayDateStr,
      dateHijri: `${hijriDay} ${hijriMonthName} ${hijriYear} هـ`,
      hijriDay,
      hijriMonth: hijriMonthName,
      hijriYear,
      locationName,
      timings: {
        fajr: rawFajr,
        sunrise: rawSunrise,
        dhuhr: rawDhuhr,
        asr: rawAsr,
        maghrib: rawMaghrib,
        isha: rawIsha,
      },
      timings12: {
        fajr: formatPrayerTime12(rawFajr),
        sunrise: formatPrayerTime12(rawSunrise),
        dhuhr: formatPrayerTime12(rawDhuhr),
        asr: formatPrayerTime12(rawAsr),
        maghrib: formatPrayerTime12(rawMaghrib),
        isha: formatPrayerTime12(rawIsha),
      },
      currentPrayer,
      nextPrayer,
      timeRemainingSeconds
    };
  },

  recalculateNextPrayerWithCache(cached: PrayerTimesData): PrayerTimesData {
    const rawTimings = {
      Fajr: cached.timings.fajr,
      Sunrise: cached.timings.sunrise,
      Dhuhr: cached.timings.dhuhr,
      Asr: cached.timings.asr,
      Maghrib: cached.timings.maghrib,
      Isha: cached.timings.isha,
    };
    return this.processTimingsResponse(
      rawTimings,
      { day: cached.hijriDay, month: { ar: cached.hijriMonth }, year: cached.hijriYear },
      { date: cached.dateGregorian },
      cached.locationName
    );
  },

  generateOfflineFallback(coords: Coordinates): PrayerTimesData {
    const method = StorageService.getSettings().calculationMethod || '5';
    return AstronomicalPrayerEngine.calculateFullPrayerTimesData(coords, method, new Date());
  }
};
