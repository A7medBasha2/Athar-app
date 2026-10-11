import { Coordinates } from '../types';

export interface CityLandmarkDistrict {
  name: string;
  latitude: number;
  longitude: number;
}

export interface CityLocationEntry extends Coordinates {
  districts?: CityLandmarkDistrict[];
}

export const POPULAR_CITIES: CityLocationEntry[] = [
  {
    city: "مكة المكرمة",
    district: "المنطقة المركزية - المسجد الحرام",
    formattedLocation: "مكة المكرمة - المنطقة المركزية",
    country: "المملكة العربية السعودية",
    latitude: 21.4225,
    longitude: 39.8262,
    isAutoGps: false,
    districts: [
      { name: "المنطقة المركزية - المسجد الحرام", latitude: 21.4225, longitude: 39.8262 },
      { name: "العزيزية", latitude: 21.4041, longitude: 39.8732 },
      { name: "الشوقية", latitude: 21.3772, longitude: 39.8054 },
      { name: "العوالي", latitude: 21.3489, longitude: 39.9214 },
      { name: "النزهة", latitude: 21.4412, longitude: 39.7955 },
      { name: "الزاهر", latitude: 21.4495, longitude: 39.8147 },
      { name: "بطحاء قريش", latitude: 21.3738, longitude: 39.8391 },
      { name: "الشرائع", latitude: 21.4664, longitude: 39.9502 },
    ]
  },
  {
    city: "المدينة المنورة",
    district: "المنطقة المركزية - الحرم النبوي",
    formattedLocation: "المدينة المنورة - المنطقة المركزية",
    country: "المملكة العربية السعودية",
    latitude: 24.4672,
    longitude: 39.6111,
    isAutoGps: false,
    districts: [
      { name: "المنطقة المركزية - الحرم النبوي", latitude: 24.4672, longitude: 39.6111 },
      { name: "قباء", latitude: 24.4393, longitude: 39.6173 },
      { name: "العوالي", latitude: 24.4521, longitude: 39.6382 },
      { name: "سلطانة", latitude: 24.4894, longitude: 39.5912 },
      { name: "العزيزية", latitude: 24.4352, longitude: 39.5321 },
      { name: "سيد الشهداء", latitude: 24.5022, longitude: 39.6145 },
      { name: "الخالدية", latitude: 24.4648, longitude: 39.6542 },
    ]
  },
  {
    city: "الرياض",
    district: "العليا",
    formattedLocation: "الرياض - العليا",
    country: "المملكة العربية السعودية",
    latitude: 24.7136,
    longitude: 46.6753,
    isAutoGps: false,
    districts: [
      { name: "العليا", latitude: 24.6961, longitude: 46.6841 },
      { name: "الملقا", latitude: 24.8055, longitude: 46.6095 },
      { name: "النرجس", latitude: 24.8462, longitude: 46.6475 },
      { name: "الياسمين", latitude: 24.8235, longitude: 46.6412 },
      { name: "الصحافة", latitude: 24.7962, longitude: 46.6321 },
      { name: "حطين", latitude: 24.7641, longitude: 46.6012 },
      { name: "الملز", latitude: 24.6664, longitude: 46.7325 },
      { name: "الروضة", latitude: 24.7422, longitude: 46.7745 },
      { name: "النسيم", latitude: 24.7254, longitude: 46.8285 },
      { name: "البديعة", latitude: 24.5824, longitude: 46.6425 },
      { name: "الدرعية", latitude: 24.7332, longitude: 46.5754 },
    ]
  },
  {
    city: "القاهرة",
    district: "وسط البلد",
    formattedLocation: "القاهرة - وسط البلد",
    country: "جمهورية مصر العربية",
    latitude: 30.0444,
    longitude: 31.2357,
    isAutoGps: false,
    districts: [
      { name: "وسط البلد", latitude: 30.0444, longitude: 31.2357 },
      { name: "الأزهر والحسين", latitude: 30.0459, longitude: 31.2627 },
      { name: "مدينة نصر", latitude: 30.0561, longitude: 31.3301 },
      { name: "مصر الجديدة", latitude: 30.0909, longitude: 31.3227 },
      { name: "المعادي", latitude: 29.9602, longitude: 31.2569 },
      { name: "التجمع الخامس - القاهرة الجديدة", latitude: 30.0074, longitude: 31.4913 },
      { name: "الزمالك", latitude: 30.0609, longitude: 31.2197 },
      { name: "شبرا", latitude: 30.0778, longitude: 31.2452 },
      { name: "المقطم", latitude: 30.0131, longitude: 31.2981 },
      { name: "الدقي والمهندسين", latitude: 30.0488, longitude: 31.2012 },
      { name: "الجيزة والهرم", latitude: 29.9942, longitude: 31.1687 },
      { name: "الشيخ زايد و6 أكتوبر", latitude: 30.0171, longitude: 30.9718 },
      { name: "حلوان", latitude: 29.8414, longitude: 31.3008 },
      { name: "الشروق ومدينتي", latitude: 30.1189, longitude: 31.6089 },
    ]
  },
  {
    city: "الإسكندرية",
    district: "سموحة",
    formattedLocation: "الإسكندرية - سموحة",
    country: "جمهورية مصر العربية",
    latitude: 31.2001,
    longitude: 29.9187,
    isAutoGps: false,
    districts: [
      { name: "سموحة", latitude: 31.2156, longitude: 29.9553 },
      { name: "محطة الرمل والمنشية", latitude: 31.2001, longitude: 29.9007 },
      { name: "سيدي جابر", latitude: 31.2241, longitude: 29.9412 },
      { name: "ميامي وسيدي بشر", latitude: 31.2589, longitude: 29.9922 },
      { name: "المنتزه والمندرة", latitude: 31.2815, longitude: 30.0154 },
      { name: "العجمي", latitude: 31.1045, longitude: 29.7691 },
      { name: "برج العرب", latitude: 30.8889, longitude: 29.5758 },
    ]
  },
  {
    city: "جدة",
    district: "الروضة",
    formattedLocation: "جدة - الروضة",
    country: "المملكة العربية السعودية",
    latitude: 21.5433,
    longitude: 39.1728,
    isAutoGps: false,
    districts: [
      { name: "الروضة", latitude: 21.5612, longitude: 39.1524 },
      { name: "الحمراء والكورنيش", latitude: 21.5221, longitude: 39.1578 },
      { name: "السلامة", latitude: 21.5945, longitude: 39.1492 },
      { name: "أبحر", latitude: 21.7245, longitude: 39.1095 },
      { name: "النسيم والفيحاء", latitude: 21.5092, longitude: 39.2285 },
      { name: "جدة التاريخية (البلد)", latitude: 21.4858, longitude: 39.1862 },
    ]
  },
  {
    city: "الدمام والخبر",
    district: "الشاطئ",
    formattedLocation: "الدمام والخبر - الشاطئ",
    country: "المملكة العربية السعودية",
    latitude: 26.4207,
    longitude: 50.0888,
    isAutoGps: false,
    districts: [
      { name: "الشاطئ - الدمام", latitude: 26.4581, longitude: 50.1165 },
      { name: "الفيصلية - الدمام", latitude: 26.3951, longitude: 50.0485 },
      { name: "العقربية - الخبر", latitude: 26.2985, longitude: 50.1942 },
      { name: "الظهران", latitude: 26.3042, longitude: 50.1412 },
    ]
  },
  {
    city: "القدس الشريف",
    district: "البلدة القديمة - رحاب المسجد الأقصى",
    formattedLocation: "القدس الشريف - البلدة القديمة",
    country: "فلسطين",
    latitude: 31.7767,
    longitude: 35.2345,
    isAutoGps: false,
    districts: [
      { name: "البلدة القديمة - رحاب المسجد الأقصى", latitude: 31.7767, longitude: 35.2345 },
      { name: "الشيخ جراح", latitude: 31.7945, longitude: 35.2312 },
      { name: "سلوان", latitude: 31.7698, longitude: 35.2375 },
      { name: "الطور وجبل الزيتون", latitude: 31.7789, longitude: 35.2462 },
      { name: "بيت حنينا وشعفاط", latitude: 31.8251, longitude: 35.2241 },
    ]
  },
  {
    city: "دبي",
    district: "وسط مدينة دبي",
    formattedLocation: "دبي - وسط مدينة دبي",
    country: "الإمارات العربية المتحدة",
    latitude: 25.2048,
    longitude: 55.2708,
    isAutoGps: false,
    districts: [
      { name: "وسط مدينة دبي (داون تاون)", latitude: 25.1972, longitude: 55.2744 },
      { name: "جميرا", latitude: 25.2048, longitude: 55.2521 },
      { name: "البرشاء", latitude: 25.1112, longitude: 55.2005 },
      { name: "ديرة والممزر", latitude: 25.2711, longitude: 55.3285 },
      { name: "مرسى دبي (المارينا)", latitude: 25.0805, longitude: 55.1403 },
      { name: "مردف والورقاء", latitude: 25.2185, longitude: 55.4152 },
    ]
  },
  {
    city: "أبوظبي",
    district: "الكورنيش والخالدية",
    formattedLocation: "أبوظبي - الكورنيش والخالدية",
    country: "الإمارات العربية المتحدة",
    latitude: 24.4539,
    longitude: 54.3773,
    isAutoGps: false,
    districts: [
      { name: "الكورنيش والخالدية", latitude: 24.4692, longitude: 54.3452 },
      { name: "جامع الشيخ زايد والروضة", latitude: 24.4128, longitude: 54.4750 },
      { name: "جزيرة الريم", latitude: 24.4962, longitude: 54.4052 },
      { name: "مدينة محمد بن زايد", latitude: 24.3442, longitude: 54.5362 },
      { name: "مدينة خليفة", latitude: 24.4215, longitude: 54.5785 },
    ]
  },
  {
    city: "الدوحة",
    district: "مشيرب والخليج الغربي",
    formattedLocation: "الدوحة - مشيرب والخليج الغربي",
    country: "قطر",
    latitude: 25.2854,
    longitude: 51.5310,
    isAutoGps: false,
    districts: [
      { name: "مشيرب وسوق واقف", latitude: 25.2854, longitude: 51.5310 },
      { name: "الدفنة والخليج الغربي", latitude: 25.3225, longitude: 51.5285 },
      { name: "اللؤلؤة ولوسيل", latitude: 25.3712, longitude: 51.5485 },
      { name: "السد والوعب", latitude: 25.2712, longitude: 51.4825 },
      { name: "الريان", latitude: 25.2919, longitude: 51.4244 },
    ]
  },
  {
    city: "الكويت",
    district: "العاصمة والسالمية",
    formattedLocation: "الكويت - العاصمة والسالمية",
    country: "الكويت",
    latitude: 29.3759,
    longitude: 47.9774,
    isAutoGps: false,
    districts: [
      { name: "شرق والعاصمة", latitude: 29.3759, longitude: 47.9774 },
      { name: "السالمية وحولي", latitude: 29.3339, longitude: 48.0761 },
      { name: "الفروانية وخيطان", latitude: 29.2775, longitude: 47.9586 },
      { name: "الجهراء", latitude: 29.3375, longitude: 47.6581 },
      { name: "الأحمدي والفحيحيل", latitude: 29.0825, longitude: 48.1303 },
    ]
  },
  {
    city: "عَمّان",
    district: "عبدون والشميساني",
    formattedLocation: "عَمّان - عبدون والشميساني",
    country: "الأردن",
    latitude: 31.9454,
    longitude: 35.9284,
    isAutoGps: false,
    districts: [
      { name: "وسط البلد وجبل اللويبدة", latitude: 31.9539, longitude: 35.9306 },
      { name: "عبدون والشميساني", latitude: 31.9612, longitude: 35.8912 },
      { name: "خلدا وتلاع العلي", latitude: 31.9965, longitude: 35.8542 },
      { name: "الجبيهة وصويلح", latitude: 32.0235, longitude: 35.8645 },
      { name: "مرج الحمام", latitude: 31.8942, longitude: 35.8512 },
    ]
  },
  {
    city: "دمشق",
    district: "الجامع الأموي والمزة",
    formattedLocation: "دمشق - الجامع الأموي والمزة",
    country: "سوريا",
    latitude: 33.5138,
    longitude: 36.2765,
    isAutoGps: false,
    districts: [
      { name: "دمشق القديمة والجامع الأموي", latitude: 33.5116, longitude: 36.3065 },
      { name: "المزة والمالكي", latitude: 33.5042, longitude: 36.2562 },
      { name: "كفرسوسة والميدان", latitude: 33.4925, longitude: 36.2812 },
      { name: "ركن الدين والمهاجرين", latitude: 33.5352, longitude: 36.2885 },
    ]
  },
  {
    city: "بيروت",
    district: "الحمرا والروشة",
    formattedLocation: "بيروت - الحمرا والروشة",
    country: "لبنان",
    latitude: 33.8938,
    longitude: 35.5018,
    isAutoGps: false,
    districts: [
      { name: "وسط بيروت والحمرا", latitude: 33.8965, longitude: 35.4825 },
      { name: "الروشة وعين المريسة", latitude: 33.8902, longitude: 35.4721 },
      { name: "الطريق الجديدة والمزرعة", latitude: 33.8752, longitude: 35.4985 },
      { name: "الأشرفية وفردان", latitude: 33.8862, longitude: 35.5152 },
    ]
  },
  {
    city: "بغداد",
    district: "الأعظمية والمنصور",
    formattedLocation: "بغداد - الأعظمية والمنصور",
    country: "العراق",
    latitude: 33.3152,
    longitude: 44.3661,
    isAutoGps: false,
    districts: [
      { name: "الأعظمية", latitude: 33.3712, longitude: 44.3585 },
      { name: "المنصور واليرموك", latitude: 33.3152, longitude: 44.3425 },
      { name: "الكرادة والجادرية", latitude: 33.2925, longitude: 44.4052 },
      { name: "الكاظمية", latitude: 33.3789, longitude: 44.3395 },
      { name: "زيونة وفلسطين", latitude: 33.3325, longitude: 44.4425 },
    ]
  },
  {
    city: "الرباط",
    district: "أكدال وحسان",
    formattedLocation: "الرباط - أكدال وحسان",
    country: "المغرب",
    latitude: 34.0209,
    longitude: -6.8416,
    isAutoGps: false,
    districts: [
      { name: "حسان والمدينة العتيقة", latitude: 34.0242, longitude: -6.8225 },
      { name: "أكدال والرياض", latitude: 33.9925, longitude: -6.8485 },
      { name: "السويسي", latitude: 33.9725, longitude: -6.8325 },
      { name: "سلا", latitude: 34.0531, longitude: -6.7985 },
    ]
  },
  {
    city: "الدار البيضاء",
    district: "المعاريف ومسجد الحسن الثاني",
    formattedLocation: "الدار البيضاء - المعاريف",
    country: "المغرب",
    latitude: 33.5731,
    longitude: -7.5898,
    isAutoGps: false,
    districts: [
      { name: "المعاريف وأنفا", latitude: 33.5882, longitude: -7.6385 },
      { name: "الحبوس وعين الذئاب", latitude: 33.5782, longitude: -7.6052 },
      { name: "سيدي معروف", latitude: 33.5285, longitude: -7.6485 },
    ]
  },
  {
    city: "تونس",
    district: "القصبة والبحيرة",
    formattedLocation: "تونس - القصبة والبحيرة",
    country: "تونس",
    latitude: 36.8065,
    longitude: 10.1815,
    isAutoGps: false,
    districts: [
      { name: "القصبة وجامع الزيتونة", latitude: 36.7972, longitude: 10.1712 },
      { name: "ضفاف البحيرة والمنزه", latitude: 36.8352, longitude: 10.2312 },
      { name: "قرطاج والمرسى", latitude: 36.8782, longitude: 10.3245 },
    ]
  },
  {
    city: "الجزائر",
    district: "القصبة وباب الزوار",
    formattedLocation: "الجزائر - القصبة وباب الزوار",
    country: "الجزائر",
    latitude: 36.7538,
    longitude: 3.0588,
    isAutoGps: false,
    districts: [
      { name: "القصبة ووسط الجزائر", latitude: 36.7845, longitude: 3.0602 },
      { name: "المحمدية وجامع الجزائر", latitude: 36.7352, longitude: 3.1412 },
      { name: "حيدرة والأبيار", latitude: 36.7525, longitude: 3.0325 },
      { name: "باب الزوار والدار البيضاء", latitude: 36.7185, longitude: 3.1825 },
    ]
  },
  {
    city: "مسقط",
    district: "بوشر والخوير",
    formattedLocation: "مسقط - بوشر والخوير",
    country: "عُمان",
    latitude: 23.5880,
    longitude: 58.3829,
    isAutoGps: false,
    districts: [
      { name: "بوشر وجامع السلطان قابوس", latitude: 23.5839, longitude: 58.3886 },
      { name: "الخوير والقرم", latitude: 23.5985, longitude: 58.4325 },
      { name: "السيب والموالح", latitude: 23.6212, longitude: 58.2425 },
      { name: "مطرح ومسقط القديمة", latitude: 23.6145, longitude: 58.5625 },
    ]
  },
  {
    city: "المنامة",
    district: "الجفير والسيف",
    formattedLocation: "المنامة - الجفير والسيف",
    country: "البحرين",
    latitude: 26.2285,
    longitude: 50.5860,
    isAutoGps: false,
    districts: [
      { name: "الجفير وجامع الفاتح", latitude: 26.2189, longitude: 50.5982 },
      { name: "ضاحية السيف", latitude: 26.2361, longitude: 50.5352 },
      { name: "المحرق", latitude: 26.2572, longitude: 50.6119 },
      { name: "الرفاع", latitude: 26.1299, longitude: 50.5550 },
    ]
  },
  {
    city: "إسطنبول",
    district: "الفاتح والسلطان أحمد",
    formattedLocation: "إسطنبول - الفاتح والسلطان أحمد",
    country: "تركيا",
    latitude: 41.0082,
    longitude: 28.9784,
    isAutoGps: false,
    districts: [
      { name: "الفاتح والسلطان أحمد", latitude: 41.0082, longitude: 28.9784 },
      { name: "أسكودار", latitude: 41.0255, longitude: 29.0152 },
      { name: "بشكتاش وشيشلي", latitude: 41.0522, longitude: 28.9925 },
      { name: "باشاك شهير", latitude: 41.0975, longitude: 28.8025 },
    ]
  },
  {
    city: "جاكرتا",
    district: "وسط جاكرتا ومسجد الاستقلال",
    formattedLocation: "جاكرتا - وسط جاكرتا",
    country: "إندونيسيا",
    latitude: -6.2088,
    longitude: 106.8456,
    isAutoGps: false
  },
  {
    city: "كوالالمبور",
    district: "وسط كوالالمبور",
    formattedLocation: "كوالالمبور - وسط المدينة",
    country: "ماليزيا",
    latitude: 3.1390,
    longitude: 101.6869,
    isAutoGps: false
  },
  {
    city: "لندن",
    district: "ويستمنستر وريجنت بارك",
    formattedLocation: "لندن - ويستمنستر",
    country: "المملكة المتحدة",
    latitude: 51.5074,
    longitude: -0.1278,
    isAutoGps: false
  },
  {
    city: "باريس",
    district: "الدائرة الخامسة - المسجد الكبير",
    formattedLocation: "باريس - الدائرة الخامسة",
    country: "فرنسا",
    latitude: 48.8566,
    longitude: 2.3522,
    isAutoGps: false
  }
];

export const DEFAULT_COORDINATES: Coordinates = {
  ...POPULAR_CITIES[3],
  isAutoGps: true
};
