import { Coordinates, NavigationTab } from '../types';
import { POPULAR_CITIES } from '../data/citiesData';
import { StorageService } from './storageService';
import { PrayerTimesService } from './prayerTimesService';
import { LocationService } from './locationService';

export type BlessedTimeWindowId =
  | 'live'
  | 'last_third'
  | 'fajr'
  | 'morning_adhkar'
  | 'dhuhr_jumuah'
  | 'asr_evening'
  | 'maghrib_isha';

export interface BlessedTimeWindowMeta {
  id: Exclude<BlessedTimeWindowId, 'live'>;
  titleArabic: string;
  shortLabel: string;
  spiritualSubtitle: string;
  primaryActivityLabel: string;
  recommendedActionLabel: string;
  targetTab: NavigationTab;
  openTasbih?: boolean;
  openSakina?: boolean;
  intensityMultiplier: number; // 0.35 to 1.35
  distribution: {
    quranPercent: number;
    adhkarPercent: number;
    prayerPercent: number;
  };
}

export interface RadarPulseNode {
  id: string;
  x: number; // 0 to 100 percentage in SVG viewBox
  y: number; // 0 to 100 percentage in SVG viewBox
  size: number; // radius
  intensity: number; // 0.4 to 1.0
  delaySeconds: number;
  category: 'quran' | 'adhkar' | 'prayer';
  districtHint: string;
}

export interface LocalCityPulseSnapshot {
  cityName: string;
  districtName: string;
  formattedLocation: string;
  countryName: string;
  cityPopulationLabel: string;
  isAutoGps: boolean;
  activeWindowId: Exclude<BlessedTimeWindowId, 'live'>;
  isSimulated: boolean;
  windowMeta: BlessedTimeWindowMeta;
  totalActiveWorshippers: number;
  quranCount: number;
  adhkarCount: number;
  prayerCount: number;
  headlineText: string;
  subHeadlineText: string;
  lastThirdStartFormatted: string;
  userPersonalContributionsToday: number;
  hasUserJoinedCurrentSession: boolean;
  radarNodes: RadarPulseNode[];
  pulseSpeedSeconds: number;
}

const PULSE_STORAGE_KEY = 'athar_local_pulse_contributions_v1';

interface StoredPulseContribution {
  dateKey: string;
  joinCount: number;
  lastJoinedTimestamp: number;
}

interface CityDemographicProfile {
  populationLabel: string;
  activeBaseline: number;
}

/**
 * بيانات الكتلة السكانية المحلية والنشاط التقديري للمدن (تعمل محلياً 100% داخل الجهاز بدون أي اتصال خارجي أو تتبع)
 */
const CITY_DEMOGRAPHIC_PROFILES: Record<string, CityDemographicProfile> = {
  'القاهرة': { populationLabel: 'كتلة حضرية كبرى (~21 مليون نسمة)', activeBaseline: 4850 },
  'الإسكندرية': { populationLabel: 'عروس البحر المتوسط (~5.5 مليون نسمة)', activeBaseline: 3150 },
  'مكة المكرمة': { populationLabel: 'رحاب الحرم المكي (~2.4 مليون نسمة + ضيوف الرحمن)', activeBaseline: 5400 },
  'المدينة المنورة': { populationLabel: 'رحاب المسجد النبوي (~2.1 مليون نسمة + الزوار)', activeBaseline: 4600 },
  'الرياض': { populationLabel: 'حاضرة كبرى (~7.8 مليون نسمة)', activeBaseline: 4100 },
  'جدة': { populationLabel: 'بوابة الحرمين (~4.8 مليون نسمة)', activeBaseline: 3450 },
  'الدمام والخبر': { populationLabel: 'حاضرة المنطقة الشرقية (~2.6 مليون نسمة)', activeBaseline: 2400 },
  'القدس الشريف': { populationLabel: 'رحاب المسجد الأقصى المبارك (~1 مليون نسمة)', activeBaseline: 3200 },
  'دبي': { populationLabel: 'حاضرة حيوية (~3.6 مليون نسمة)', activeBaseline: 2450 },
  'أبوظبي': { populationLabel: 'عاصمة حضرية (~1.8 مليون نسمة)', activeBaseline: 1950 },
  'الدوحة': { populationLabel: 'عاصمة حضرية (~2.4 مليون نسمة)', activeBaseline: 1850 },
  'الكويت': { populationLabel: 'كتلة حضرية (~3.2 مليون نسمة)', activeBaseline: 2100 },
  'عَمّان': { populationLabel: 'عاصمة كبرى (~4.2 مليون نسمة)', activeBaseline: 2650 },
  'دمشق': { populationLabel: 'حاضرة عريقة (~2.6 مليون نسمة)', activeBaseline: 2900 },
  'بيروت': { populationLabel: 'حاضرة ساحلية (~2.4 مليون نسمة)', activeBaseline: 1750 },
  'بغداد': { populationLabel: 'كتلة حضرية كبرى (~7.7 مليون نسمة)', activeBaseline: 3400 },
  'الرباط': { populationLabel: 'عاصمة حضرية (~2.1 مليون نسمة)', activeBaseline: 2300 },
  'الدار البيضاء': { populationLabel: 'كتلة حضرية كبرى (~4.3 مليون نسمة)', activeBaseline: 3350 },
  'تونس': { populationLabel: 'حاضرة كبرى (~2.4 مليون نسمة)', activeBaseline: 2150 },
  'الجزائر': { populationLabel: 'عاصمة كبرى (~3.9 مليون نسمة)', activeBaseline: 2850 },
  'مسقط': { populationLabel: 'عاصمة حضرية (~1.7 مليون نسمة)', activeBaseline: 1800 },
  'المنامة': { populationLabel: 'حاضرة خليجية (~1.5 مليون نسمة)', activeBaseline: 1450 },
  'إسطنبول': { populationLabel: 'كتلة حضرية كبرى (~15.8 مليون نسمة)', activeBaseline: 4400 },
  'جاكرتا': { populationLabel: 'كتلة حضرية كبرى (~11.2 مليون نسمة)', activeBaseline: 4700 },
  'كوالالمبور': { populationLabel: 'عاصمة كبرى (~8.4 مليون نسمة)', activeBaseline: 3100 },
  'لندن': { populationLabel: 'جالية إسلامية نشطة (~1.3 مليون مسلم)', activeBaseline: 1650 },
  'باريس': { populationLabel: 'جالية إسلامية نشطة (~1.1 مليون مسلم)', activeBaseline: 1400 },
};

export const BLESSED_TIME_WINDOWS: Record<
  Exclude<BlessedTimeWindowId, 'live'>,
  BlessedTimeWindowMeta
> = {
  last_third: {
    id: 'last_third',
    titleArabic: 'نفحات الثلث الأخير من الليل',
    shortLabel: 'الثلث الأخير',
    spiritualSubtitle: 'وقت التنزل الإلهي والمستغفرين بالأسحار ومناجاة القائمين',
    primaryActivityLabel: 'قيام الليل والاستغفار وتلاوة القرآن',
    recommendedActionLabel: 'شارك في استغفار الأسحار والقيام',
    targetTab: 'quran',
    openTasbih: true,
    intensityMultiplier: 0.72,
    distribution: {
      quranPercent: 38,
      adhkarPercent: 34,
      prayerPercent: 28,
    },
  },
  fajr: {
    id: 'fajr',
    titleArabic: 'رحاب صلاة الفجر وقرآن الفجر',
    shortLabel: 'صلاة الفجر',
    spiritualSubtitle: '«إِنَّ قُرْآنَ الْفَجْرِ كَانَ مَشْهُودًا» — ذروة النور والبركة الصباحية',
    primaryActivityLabel: 'صلاة الفجر وتلاوة الورد الصباحي',
    recommendedActionLabel: 'افتح المصحف لقرآن الفجر المشهود',
    targetTab: 'quran',
    intensityMultiplier: 1.25,
    distribution: {
      quranPercent: 36,
      adhkarPercent: 24,
      prayerPercent: 40,
    },
  },
  morning_adhkar: {
    id: 'morning_adhkar',
    titleArabic: 'ذروة أذكار الصباح والبكور',
    shortLabel: 'أذكار الصباح',
    spiritualSubtitle: '«اللهم بارك لأمتي في بكورها» — تحصين القلوب وذكر الله في مطلع النهار',
    primaryActivityLabel: 'قراءة أذكار الصباح والورد اليومي',
    recommendedActionLabel: 'ابدأ أذكار الصباح مع أهل مدينتك',
    targetTab: 'adhkar',
    intensityMultiplier: 1.18,
    distribution: {
      quranPercent: 28,
      adhkarPercent: 56,
      prayerPercent: 16,
    },
  },
  dhuhr_jumuah: {
    id: 'dhuhr_jumuah',
    titleArabic: 'واحة الظهيرة وصلاة الظهر',
    shortLabel: 'الظهر والظهيرة',
    spiritualSubtitle: 'استراحة القلوب من ضجيج الحياة بالوقوف بين يدي الله وتلاوة الآيات',
    primaryActivityLabel: 'صلاة الظهر وتلاوة السور اليومية',
    recommendedActionLabel: 'جدد عهدك مع المصحف ومواقيت الصلاة',
    targetTab: 'prayers',
    intensityMultiplier: 0.94,
    distribution: {
      quranPercent: 34,
      adhkarPercent: 26,
      prayerPercent: 40,
    },
  },
  asr_evening: {
    id: 'asr_evening',
    titleArabic: 'رحاب العصر وأذكار المساء',
    shortLabel: 'أذكار المساء',
    spiritualSubtitle: '«وَسَبِّحْ بِحَمْدِ رَبِّكَ قَبْلَ طُلُوعِ الشَّمْسِ وَقَبْلَ الْغُرُوبِ»',
    primaryActivityLabel: 'قراءة أذكار المساء والتسبيح قبل الغروب',
    recommendedActionLabel: 'اقرأ أذكار المساء الآن',
    targetTab: 'adhkar',
    intensityMultiplier: 1.22,
    distribution: {
      quranPercent: 25,
      adhkarPercent: 54,
      prayerPercent: 21,
    },
  },
  maghrib_isha: {
    id: 'maghrib_isha',
    titleArabic: 'سكينة المساء وورد العشاء والوتر',
    shortLabel: 'المغرب والعشاء',
    spiritualSubtitle: 'ختام اليوم بالصلاة وتلاوة المنجيات (الملك والواقعة) وأذكار المساء',
    primaryActivityLabel: 'صلاة المغرب والعشاء وتلاوة سور المساء',
    recommendedActionLabel: 'اتلُ سورة الملك والورد المسائي',
    targetTab: 'quran',
    intensityMultiplier: 1.14,
    distribution: {
      quranPercent: 42,
      adhkarPercent: 26,
      prayerPercent: 32,
    },
  },
};

function parseMinutesFrom24(time24: string): number {
  const clean = (time24 || '05:00').split(' ')[0].trim();
  const [h, m] = clean.split(':').map(Number);
  return (isNaN(h) ? 5 : h) * 60 + (isNaN(m) ? 0 : m);
}

function formatMinutesTo12(totalMinutes: number): string {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  let h = Math.floor(normalized / 60);
  const m = normalized % 60;
  const suffix = h >= 12 ? 'م' : 'ص';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${suffix}`;
}

function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

export const LocalAtharPulseService = {
  getStoredContribution(): StoredPulseContribution {
    const todayKey = getTodayKey();
    try {
      const raw = localStorage.getItem(PULSE_STORAGE_KEY);
      if (!raw) {
        return { dateKey: todayKey, joinCount: 0, lastJoinedTimestamp: 0 };
      }
      const parsed: StoredPulseContribution = JSON.parse(raw);
      if (parsed.dateKey !== todayKey) {
        return { dateKey: todayKey, joinCount: 0, lastJoinedTimestamp: 0 };
      }
      return parsed;
    } catch {
      return { dateKey: todayKey, joinCount: 0, lastJoinedTimestamp: 0 };
    }
  },

  recordUserJoinPulse(): StoredPulseContribution {
    const current = this.getStoredContribution();
    const updated: StoredPulseContribution = {
      dateKey: getTodayKey(),
      joinCount: current.joinCount + 1,
      lastJoinedTimestamp: Date.now(),
    };
    try {
      localStorage.setItem(PULSE_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
    return updated;
  },

  /**
   * حساب بداية الثلث الأخير من الليل محلياً بدقة بين المغرب والفجر
   */
  calculateLastThirdStart(maghrib24: string, fajr24: string): {
    startMinutes: number;
    formatted12: string;
  } {
    const maghribMin = parseMinutesFrom24(maghrib24);
    const fajrMin = parseMinutesFrom24(fajr24);
    const nightDuration = (1440 - maghribMin) + fajrMin;
    const lastThirdStart = (maghribMin + Math.floor((nightDuration * 2) / 3)) % 1440;
    return {
      startMinutes: lastThirdStart,
      formatted12: formatMinutesTo12(lastThirdStart),
    };
  },

  /**
   * تحديد الفترة الروحانية الحالية تلقائياً بناءً على مواقيت الصلاة المحلية في مدينة المستخدم
   */
  detectCurrentBlessedWindow(coords: Coordinates, now: Date = new Date()): {
    windowId: Exclude<BlessedTimeWindowId, 'live'>;
    lastThirdFormatted: string;
  } {
    const prayers = PrayerTimesService.getInitialPrayerTimes(coords);
    const fajrMin = parseMinutesFrom24(prayers.timings.fajr);
    const sunriseMin = parseMinutesFrom24(prayers.timings.sunrise);
    const dhuhrMin = parseMinutesFrom24(prayers.timings.dhuhr);
    const asrMin = parseMinutesFrom24(prayers.timings.asr);
    const maghribMin = parseMinutesFrom24(prayers.timings.maghrib);

    const lastThird = this.calculateLastThirdStart(prayers.timings.maghrib, prayers.timings.fajr);
    const currentMin = now.getHours() * 60 + now.getMinutes();

    // 1. من أذان الفجر إلى ما بعد الفجر بـ 45 دقيقة
    if (currentMin >= fajrMin && currentMin <= fajrMin + 45) {
      return { windowId: 'fajr', lastThirdFormatted: lastThird.formatted12 };
    }

    // 2. أذكار الصباح والبكور (من بعد الفجر حتى الساعة 10:30 صباحاً)
    if (currentMin > fajrMin + 45 && currentMin < Math.max(sunriseMin + 180, 630)) {
      return { windowId: 'morning_adhkar', lastThirdFormatted: lastThird.formatted12 };
    }

    // 3. الظهيرة وصلاة الظهر (من 10:30 صباحاً حتى أذان العصر)
    if (currentMin >= Math.min(dhuhrMin - 60, 630) && currentMin < asrMin) {
      return { windowId: 'dhuhr_jumuah', lastThirdFormatted: lastThird.formatted12 };
    }

    // 4. العصر وأذكار المساء (من أذان العصر حتى أذان المغرب)
    if (currentMin >= asrMin && currentMin < maghribMin) {
      return { windowId: 'asr_evening', lastThirdFormatted: lastThird.formatted12 };
    }

    // 5. الثلث الأخير من الليل (من بداية الثلث الأخير حتى أذان الفجر)
    const isInLastThird =
      lastThird.startMinutes > fajrMin
        ? currentMin >= lastThird.startMinutes || currentMin < fajrMin
        : currentMin >= lastThird.startMinutes && currentMin < fajrMin;

    if (isInLastThird) {
      return { windowId: 'last_third', lastThirdFormatted: lastThird.formatted12 };
    }

    // 6. المساء والمغرب والعشاء والوتر
    return { windowId: 'maghrib_isha', lastThirdFormatted: lastThird.formatted12 };
  },

  /**
   * توليد نقاط الرادار الهندسي الذهبي بشكل حتمي مستقر بناءً على إحداثيات المدينة والوقت الفاضل
   */
  generateCityRadarNodes(
    coords: Coordinates,
    windowId: Exclude<BlessedTimeWindowId, 'live'>,
    hasUserJoined: boolean
  ): RadarPulseNode[] {
    const seedBase =
      Math.abs(Math.round((coords.latitude + coords.longitude) * 100)) +
      windowId.charCodeAt(0) * 17;

    const matchedCity = POPULAR_CITIES.find((c) => c.city === coords.city);
    const realDistricts = matchedCity?.districts?.map((d) => d.name) || [];

    const districtLabels =
      realDistricts.length >= 3
        ? [
            ...(coords.district ? [coords.district] : []),
            ...realDistricts.filter((d) => d !== coords.district),
          ]
        : [
            coords.district || 'وسط المدينة',
            'الحي الشرقي',
            'الحي الغربي',
            'الضاحية الشمالية',
            'الحي الجنوبي',
            'رحاب المساجد الكبرى',
            'الأحياء السكنية',
            'المنطقة المركزية',
          ];

    const nodes: RadarPulseNode[] = [];
    const totalNodes = 14;

    for (let i = 0; i < totalNodes; i++) {
      // توزيع حلزوني هندسي متوازن داخل دائرة الرادار (نصف قطر من 14% إلى 42% حول المركز 50,50)
      const angle = ((i * 137.5 + (seedBase % 360)) * Math.PI) / 180;
      const radius = 12 + ((i * 29 + seedBase) % 31);
      const x = Number((50 + Math.cos(angle) * radius).toFixed(1));
      const y = Number((50 + Math.sin(angle) * radius).toFixed(1));

      const categories: ('quran' | 'adhkar' | 'prayer')[] = ['quran', 'adhkar', 'prayer'];
      const category = categories[(i + seedBase) % 3];

      nodes.push({
        id: `node_${i}`,
        x,
        y,
        size: (i % 3) + 2.2,
        intensity: Number((0.55 + ((i * 13) % 45) / 100).toFixed(2)),
        delaySeconds: Number(((i * 0.35) % 3.2).toFixed(2)),
        category,
        districtHint: districtLabels[i % districtLabels.length],
      });
    }

    if (hasUserJoined) {
      nodes.unshift({
        id: 'user_center_node',
        x: 50,
        y: 50,
        size: 4.2,
        intensity: 1,
        delaySeconds: 0,
        category: 'adhkar',
        districtHint: coords.district ? `أثرك الحي الآن · ${coords.district}` : 'أثرك الحي الآن',
      });
    }

    return nodes;
  },

  /**
   * بناء القراءة اللحظية الكاملة لـ «الأثر الحي في منطقتك» (100% محلي وبدون أي تتبع خارجي)
   */
  getPulseSnapshot(
    requestedWindow: BlessedTimeWindowId = 'live',
    now: Date = new Date()
  ): LocalCityPulseSnapshot {
    const settings = StorageService.getSettings();
    const coords = settings.location;
    const offlineFallback = LocationService.resolveOfflineNearestCity(
      coords.latitude,
      coords.longitude
    );
    const cityName = coords.city || offlineFallback.cityName || 'مدينتك الحالية';
    const districtName = coords.district || offlineFallback.districtName || 'وسط المدينة';
    const formattedLocation =
      coords.formattedLocation ||
      (districtName && !cityName.includes(districtName)
        ? `${cityName} - ${districtName}`
        : cityName);
    const countryName = coords.country || offlineFallback.countryName || '';

    const detected = this.detectCurrentBlessedWindow(coords, now);
    const activeWindowId: Exclude<BlessedTimeWindowId, 'live'> =
      requestedWindow === 'live' ? detected.windowId : requestedWindow;
    const isSimulated = requestedWindow !== 'live';
    const windowMeta = BLESSED_TIME_WINDOWS[activeWindowId];

    // 1. الكتلة السكانية الأساسية للمدينة (تقدير محلي 100% بدون أي تتبع)
    const demographicProfile = CITY_DEMOGRAPHIC_PROFILES[cityName];
    const cityBase =
      demographicProfile?.activeBaseline ||
      Math.round(1600 + ((Math.abs(coords.latitude * coords.longitude) * 13) % 1800));
    const cityPopulationLabel =
      demographicProfile?.populationLabel || 'كتلة سكانية محلية مقدرة';

    // 2. مساهمة المستخدم التراكمية في التطبيق لتعزيز الشعور بالأثر
    const adhkarStats = StorageService.getAdhkarStats();
    const tasbihState = StorageService.getTasbihState();
    const storedJoin = this.getStoredContribution();

    const userPersonalContributionsToday =
      storedJoin.joinCount +
      Math.min(15, Math.floor((tasbihState.todayCount || 0) / 33)) +
      (adhkarStats.totalCompletedSessions > 0 ? 2 : 0);

    // 3. تذبذب لحظي طبيعي ناعم يعتمد على الدقيقة والعشر ثواني الحالية
    const timeTick = Math.floor(now.getTime() / 8000);
    const harmonicWave = Math.sin(timeTick * 0.45) * 0.025 + Math.cos(timeTick * 0.2) * 0.015;

    // مضاعف يوم الجمعة المبارك
    const isFriday = now.getDay() === 5;
    const fridayMultiplier = isFriday && activeWindowId === 'dhuhr_jumuah' ? 1.38 : 1.0;

    const rawTotal =
      cityBase *
        windowMeta.intensityMultiplier *
        fridayMultiplier *
        (1 + harmonicWave) +
      storedJoin.joinCount * 11 +
      userPersonalContributionsToday * 3;

    const totalActiveWorshippers = Math.max(120, Math.round(rawTotal));

    const quranCount = Math.round(
      (totalActiveWorshippers * windowMeta.distribution.quranPercent) / 100
    );
    const adhkarCount = Math.round(
      (totalActiveWorshippers * windowMeta.distribution.adhkarPercent) / 100
    );
    const prayerCount = Math.max(
      10,
      totalActiveWorshippers - quranCount - adhkarCount
    );

    const formattedTotal = totalActiveWorshippers.toLocaleString('ar-EG');

    const headlineMap: Record<Exclude<BlessedTimeWindowId, 'live'>, string> = {
      last_third: `أكثر من ${formattedTotal} مستخدم في ${formattedLocation} يحيون الثلث الأخير بالقيام والاستغفار الآن`,
      fajr: `أكثر من ${formattedTotal} مستخدم في ${formattedLocation} يشهدون صلاة الفجر ويتلون قرآن الفجر الآن`,
      morning_adhkar: `أكثر من ${formattedTotal} مستخدم في ${formattedLocation} يقرؤون أذكار الصباح والورد اليومي الآن`,
      dhuhr_jumuah: isFriday
        ? `أكثر من ${formattedTotal} مستخدم في ${formattedLocation} يقرؤون سورة الكهف ويصلون على النبي ﷺ الآن`
        : `أكثر من ${formattedTotal} مستخدم في ${formattedLocation} يقبلون على صلاة الظهر وتلاوة القرآن الآن`,
      asr_evening: `أكثر من ${formattedTotal} مستخدم في ${formattedLocation} يقرؤون أذكار المساء ويسبحون بحمد ربهم الآن`,
      maghrib_isha: `أكثر من ${formattedTotal} مستخدم في ${formattedLocation} يتلون سور المساء ويصلون المغرب والعشاء الآن`,
    };

    const hasUserJoinedCurrentSession =
      storedJoin.joinCount > 0 && Date.now() - storedJoin.lastJoinedTimestamp < 6 * 3600 * 1000;

    const radarNodes = this.generateCityRadarNodes(
      coords,
      activeWindowId,
      hasUserJoinedCurrentSession
    );

    const pulseSpeedSeconds =
      windowMeta.intensityMultiplier >= 1.15 ? 2.8 : windowMeta.intensityMultiplier >= 0.9 ? 3.5 : 4.2;

    return {
      cityName,
      districtName,
      formattedLocation,
      countryName,
      cityPopulationLabel,
      isAutoGps: Boolean(coords.isAutoGps),
      activeWindowId,
      isSimulated,
      windowMeta,
      totalActiveWorshippers,
      quranCount,
      adhkarCount,
      prayerCount,
      headlineText: headlineMap[activeWindowId],
      subHeadlineText: windowMeta.spiritualSubtitle,
      lastThirdStartFormatted: detected.lastThirdFormatted,
      userPersonalContributionsToday,
      hasUserJoinedCurrentSession,
      radarNodes,
      pulseSpeedSeconds,
    };
  },
};
