import { Coordinates, PrayerCalculationMethod, PrayerTimesData } from '../types';

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
  const isEn = isEnParam !== undefined ? isEnParam : false;
  const suffix = isEn ? (isPM ? 'PM' : 'AM') : (isPM ? 'م' : 'ص');
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${suffix}`;
}

export interface AstronomicalMethodParams {
  id: PrayerCalculationMethod;
  nameArabic: string;
  fajrAngle: number;
  ishaAngle: number;
  ishaMinutesAfterMaghrib?: number; // e.g. 90 min for Umm Al-Qura
  asrShadowFactor: 1 | 2; // 1 = Standard (Shafi'i, Maliki, Hanbali), 2 = Hanafi
  dhuhrOffsetMinutes: number;
  maghribOffsetMinutes: number;
}

export const ASTRONOMICAL_METHODS: Record<PrayerCalculationMethod, AstronomicalMethodParams> = {
  '5': {
    id: '5',
    nameArabic: 'الهيئة المصرية العامة للمساحة (الافتراضي)',
    fajrAngle: 19.5,
    ishaAngle: 17.5,
    asrShadowFactor: 1,
    dhuhrOffsetMinutes: 1,
    maghribOffsetMinutes: 1
  },
  '4': {
    id: '4',
    nameArabic: 'جامعة أم القرى - مكة المكرمة',
    fajrAngle: 18.5,
    ishaAngle: 0,
    ishaMinutesAfterMaghrib: 90,
    asrShadowFactor: 1,
    dhuhrOffsetMinutes: 1,
    maghribOffsetMinutes: 1
  },
  '3': {
    id: '3',
    nameArabic: 'رابطة العالم الإسلامي',
    fajrAngle: 18.0,
    ishaAngle: 17.0,
    asrShadowFactor: 1,
    dhuhrOffsetMinutes: 1,
    maghribOffsetMinutes: 1
  },
  '1': {
    id: '1',
    nameArabic: 'جامعة العلوم الإسلامية بكراتشي',
    fajrAngle: 18.0,
    ishaAngle: 18.0,
    asrShadowFactor: 1,
    dhuhrOffsetMinutes: 1,
    maghribOffsetMinutes: 1
  },
  '16': {
    id: '16',
    nameArabic: 'الهيئة العامة للشؤون الإسلامية والأوقاف (الإمارات)',
    fajrAngle: 18.2,
    ishaAngle: 18.2,
    asrShadowFactor: 1,
    dhuhrOffsetMinutes: 2,
    maghribOffsetMinutes: 2
  },
  '2': {
    id: '2',
    nameArabic: 'الجمعية الإسلامية لأمريكا الشمالية (ISNA)',
    fajrAngle: 15.0,
    ishaAngle: 15.0,
    asrShadowFactor: 1,
    dhuhrOffsetMinutes: 1,
    maghribOffsetMinutes: 1
  }
};

function degToRad(d: number): number {
  return (d * Math.PI) / 180.0;
}

function radToDeg(r: number): number {
  return (r * 180.0) / Math.PI;
}

function dsin(d: number): number {
  return Math.sin(degToRad(d));
}

function dcos(d: number): number {
  return Math.cos(degToRad(d));
}

function dtan(d: number): number {
  return Math.tan(degToRad(d));
}

function darccos(x: number): number {
  return radToDeg(Math.acos(Math.max(-1, Math.min(1, x))));
}

function darccot(x: number): number {
  return radToDeg(Math.atan(1.0 / x));
}

function fixAngle(a: number): number {
  return a - 360.0 * Math.floor(a / 360.0);
}

function fixHour(h: number): number {
  return h - 24.0 * Math.floor(h / 24.0);
}

/**
 * Computes Julian Date from Gregorian Year, Month, Day
 */
function getJulianDate(year: number, month: number, day: number): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;
}

/**
 * Computes Sun Declination (degrees) and Equation of Time (hours) for a given Julian Date
 */
function computeSunPosition(jd: number): { declination: number; equationOfTime: number } {
  const D = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * D);
  const q = fixAngle(280.459 + 0.98564736 * D);
  const L = fixAngle(q + 1.915 * dsin(g) + 0.020 * dsin(2 * g));

  const e = 23.439 - 0.00000036 * D;
  const RA = radToDeg(Math.atan2(dcos(e) * dsin(L), dcos(L))) / 15.0;
  const eqt = q / 15.0 - fixHour(RA);
  const decl = radToDeg(Math.asin(dsin(e) * dsin(L)));

  return {
    declination: decl,
    equationOfTime: eqt
  };
}

function formatFloatHoursTo24(hoursFloat: number): string {
  if (isNaN(hoursFloat)) return '05:00';
  let h = fixHour(hoursFloat + 0.5 / 60.0); // Round to nearest minute
  const hours = Math.floor(h);
  const minutes = Math.floor((h - hours) * 60.0);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Estimates local timezone offset in hours from longitude or system clock
 */
function resolveTimezoneOffsetHours(longitude: number, date: Date): number {
  const systemTzOffset = -date.getTimezoneOffset() / 60.0;
  const approxLngTz = Math.round(longitude / 15.0);
  // If user selected a city close to their own timezone (within 2 hours), use exact system timezone (handles DST).
  // Otherwise use regional timezone mapping for global Islamic capitals.
  if (Math.abs(systemTzOffset - approxLngTz) <= 1.5) {
    return systemTzOffset;
  }
  // Known timezone map for popular longitudinal bands
  if (longitude >= 34 && longitude <= 56) {
    if (longitude >= 51 && longitude <= 57) return 4; // UAE / Oman
    if (longitude >= 34.5 && longitude <= 50.9) return 3; // Makkah, Madinah, Riyadh, Doha, Kuwait, Baghdad, Amman, Damascus, Jerusalem
  }
  if (longitude >= 24 && longitude < 34.5) return 2; // Cairo, Alexandria
  if (longitude >= -10 && longitude <= 12) return 1; // Morocco, Algeria, Tunisia
  return approxLngTz;
}

/**
 * Pure Offline Hijri Calendar Calculator (Kuwaiti / Umm Al-Qura Astronomical Algorithm + Intl.DateTimeFormat)
 */
export function computeOfflineHijriDate(date: Date = new Date()): {
  day: string;
  monthNumber: number;
  monthNameArabic: string;
  year: string;
  formattedHijri: string;
  formattedGregorian: string;
} {
  const hijriArabicMonths = [
    'مُحَرَّم', 'صَفَر', 'رَبِيع الأَوَّل', 'رَبِيع الآخِر', 'جُمَادَى الأُولَى', 'جُمَادَى الآخِرَة',
    'رَجَب', 'شَعْبَان', 'رَمَضَان', 'شَوَّال', 'ذُو القَعْدَة', 'ذُو الحِجَّة'
  ];

  try {
    const parts = new Intl.DateTimeFormat('en-TN-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    }).formatToParts(date);

    const dayVal = parts.find((p) => p.type === 'day')?.value || '1';
    const monthVal = Number(parts.find((p) => p.type === 'month')?.value || '1');
    const yearVal = (parts.find((p) => p.type === 'year')?.value || '1447').replace(/[^\d]/g, '');

    const monthName = hijriArabicMonths[Math.max(0, Math.min(11, monthVal - 1))] || hijriArabicMonths[0];
    const gregorianStr = date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return {
      day: dayVal,
      monthNumber: monthVal,
      monthNameArabic: monthName,
      year: yearVal,
      formattedHijri: `${dayVal} ${monthName} ${yearVal} هـ`,
      formattedGregorian: gregorianStr
    };
  } catch {
    // Pure mathematical tabular Islamic calendar fallback if Intl islamic-umalqura is unavailable
    const jd = getJulianDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const l = Math.floor(jd - 1948440 + 10632);
    const n = Math.floor((l - 1) / 10631);
    const l2 = l - 10631 * n + 354;
    const j =
      Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
      Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
    const l3 =
      l2 -
      Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
      Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
      29;
    const monthNum = Math.floor((24 * l3) / 709);
    const dayNum = l3 - Math.floor((709 * monthNum) / 24);
    const yearNum = 30 * n + j - 30;
    const monthName = hijriArabicMonths[Math.max(0, Math.min(11, monthNum - 1))] || hijriArabicMonths[0];

    return {
      day: String(dayNum),
      monthNumber: monthNum,
      monthNameArabic: monthName,
      year: String(yearNum),
      formattedHijri: `${dayNum} ${monthName} ${yearNum} هـ`,
      formattedGregorian: date.toISOString().split('T')[0]
    };
  }
}

/**
 * Pure Offline Astronomical Prayer Times Engine
 * Calculates exact Fajr, Sunrise, Dhuhr, Asr, Maghrib, and Isha timings locally from GPS coordinates
 * without requiring any external internet API.
 */
export const AstronomicalPrayerEngine = {
  calculateTimingsForDate(
    coords: Coordinates,
    method: PrayerCalculationMethod = '5',
    date: Date = new Date()
  ): {
    Fajr: string;
    Sunrise: string;
    Dhuhr: string;
    Asr: string;
    Maghrib: string;
    Isha: string;
  } {
    const lat = coords.latitude;
    const lng = coords.longitude;
    const tz = resolveTimezoneOffsetHours(lng, date);
    const params = ASTRONOMICAL_METHODS[method] || ASTRONOMICAL_METHODS['5'];

    const jd = getJulianDate(date.getFullYear(), date.getMonth() + 1, date.getDate()) - lng / (15.0 * 24.0);
    const { declination: decl, equationOfTime: eqt } = computeSunPosition(jd + 0.5);

    // 1. Solar Noon (Dhuhr)
    const noon = fixHour(12.0 + tz - lng / 15.0 - eqt);
    const dhuhrHours = noon + params.dhuhrOffsetMinutes / 60.0;

    // Helper for horizon/depression angle hour offset
    const computeHourAngle = (angle: number): number => {
      const num = -dsin(angle) - dsin(lat) * dsin(decl);
      const den = dcos(lat) * dcos(decl);
      return darccos(num / den) / 15.0;
    };

    // 2. Sunrise & Sunset (Maghrib) — standard refraction + solar semi-diameter = 0.833°
    const sunriseOffset = computeHourAngle(0.833);
    const sunriseHours = noon - sunriseOffset;
    const sunsetHours = noon + sunriseOffset;
    const maghribHours = sunsetHours + params.maghribOffsetMinutes / 60.0;

    // 3. Fajr
    const fajrOffset = computeHourAngle(params.fajrAngle);
    const fajrHours = noon - fajrOffset;

    // 4. Asr (Shafi'i / Standard shadow factor = 1)
    const asrAltAngle = darccot(params.asrShadowFactor + dtan(Math.abs(lat - decl)));
    const asrNum = dsin(asrAltAngle) - dsin(lat) * dsin(decl);
    const asrDen = dcos(lat) * dcos(decl);
    const asrOffset = darccos(asrNum / asrDen) / 15.0;
    const asrHours = noon + asrOffset;

    // 5. Isha
    let ishaHours: number;
    if (params.ishaMinutesAfterMaghrib && params.ishaMinutesAfterMaghrib > 0) {
      ishaHours = maghribHours + params.ishaMinutesAfterMaghrib / 60.0;
    } else {
      const ishaOffset = computeHourAngle(params.ishaAngle);
      ishaHours = noon + ishaOffset;
    }

    return {
      Fajr: formatFloatHoursTo24(fajrHours),
      Sunrise: formatFloatHoursTo24(sunriseHours),
      Dhuhr: formatFloatHoursTo24(dhuhrHours),
      Asr: formatFloatHoursTo24(asrHours),
      Maghrib: formatFloatHoursTo24(maghribHours),
      Isha: formatFloatHoursTo24(ishaHours)
    };
  },

  calculateFullPrayerTimesData(
    coords: Coordinates,
    method: PrayerCalculationMethod = '5',
    date: Date = new Date()
  ): PrayerTimesData {
    const rawTimings = this.calculateTimingsForDate(coords, method, date);
    const hijriInfo = computeOfflineHijriDate(date);

    const prayerDefs: { id: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'; nameArabic: string; time: string }[] = [
      { id: 'fajr', nameArabic: 'الفجر', time: rawTimings.Fajr },
      { id: 'sunrise', nameArabic: 'الشروق', time: rawTimings.Sunrise },
      { id: 'dhuhr', nameArabic: 'الظهر', time: rawTimings.Dhuhr },
      { id: 'asr', nameArabic: 'العصر', time: rawTimings.Asr },
      { id: 'maghrib', nameArabic: 'المغرب', time: rawTimings.Maghrib },
      { id: 'isha', nameArabic: 'العشاء', time: rawTimings.Isha }
    ];

    const items = prayerDefs.map((def) => {
      const [h, m] = def.time.split(':').map(Number);
      const pDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0);
      const timestamp = pDate.getTime();
      const formatted12 = formatPrayerTime12(def.time);
      return {
        id: def.id,
        nameArabic: def.nameArabic,
        time: formatted12,
        time12: formatted12,
        time24: def.time,
        timestamp,
        isPassed: timestamp < date.getTime(),
        isCurrent: false,
        isNext: false
      };
    });

    let currentPrayer = null;
    let nextPrayer = null;
    let timeRemainingSeconds = 0;

    for (let i = 0; i < items.length; i++) {
      if (items[i].timestamp > date.getTime()) {
        nextPrayer = items[i];
        items[i].isNext = true;
        currentPrayer = i > 0 ? items[i - 1] : items[items.length - 1];
        if (i > 0) items[i - 1].isCurrent = true;
        timeRemainingSeconds = Math.max(0, Math.floor((items[i].timestamp - date.getTime()) / 1000));
        break;
      }
    }

    if (!nextPrayer) {
      currentPrayer = items[items.length - 1];
      items[items.length - 1].isCurrent = true;
      const [fh, fm] = rawTimings.Fajr.split(':').map(Number);
      const tomorrowFajrDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, fh, fm, 0);
      timeRemainingSeconds = Math.max(0, Math.floor((tomorrowFajrDate.getTime() - date.getTime()) / 1000));
      nextPrayer = {
        ...items[0],
        timestamp: tomorrowFajrDate.getTime(),
        isNext: true
      };
    }

    const resolvedLocationLabel =
      coords.formattedLocation ||
      (coords.district && coords.city && !coords.city.includes(coords.district)
        ? `${coords.city} - ${coords.district}`
        : coords.city) ||
      'الموقع الحالي (GPS محلي)';

    return {
      dateGregorian: hijriInfo.formattedGregorian,
      dateHijri: hijriInfo.formattedHijri,
      hijriDay: hijriInfo.day,
      hijriMonth: hijriInfo.monthNameArabic,
      hijriYear: hijriInfo.year,
      locationName: resolvedLocationLabel,
      timings: {
        fajr: rawTimings.Fajr,
        sunrise: rawTimings.Sunrise,
        dhuhr: rawTimings.Dhuhr,
        asr: rawTimings.Asr,
        maghrib: rawTimings.Maghrib,
        isha: rawTimings.Isha
      },
      timings12: {
        fajr: formatPrayerTime12(rawTimings.Fajr),
        sunrise: formatPrayerTime12(rawTimings.Sunrise),
        dhuhr: formatPrayerTime12(rawTimings.Dhuhr),
        asr: formatPrayerTime12(rawTimings.Asr),
        maghrib: formatPrayerTime12(rawTimings.Maghrib),
        isha: formatPrayerTime12(rawTimings.Isha)
      },
      currentPrayer,
      nextPrayer,
      timeRemainingSeconds
    };
  }
};
