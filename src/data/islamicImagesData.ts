import kaabaNightImg from '../assets/images/kaaba_golden_night_1791598384430.jpg';
import kaabaDawnImg from '../assets/images/kaaba_dawn_sanctuary_1791598394662.jpg';
import madinahDomeImg from '../assets/images/madinah_green_dome_1791598404771.jpg';
import quranLanternsImg from '../assets/images/quran_mushaf_lanterns_1791598415034.jpg';
import mihrabArchesImg from '../assets/images/islamic_mihrab_arches_1791598425505.jpg';

export type IslamicImageSlot =
  | 'kaaba'
  | 'prayers'
  | 'quran'
  | 'adhkar'
  | 'tasbih'
  | 'wird'
  | 'achievements'
  | 'hadith'
  | 'qibla'
  | 'reminders'
  | 'settings';

export interface CuratedIslamicImage {
  id: string;
  src: string;
  titleArabic: string;
  objectPosition: string;
}

export const CURATED_ISLAMIC_IMAGES: Record<string, CuratedIslamicImage> = {
  kaaba_night: {
    id: 'kaaba_night',
    src: kaabaNightImg,
    titleArabic: 'الكعبة المشرفة ليلاً',
    objectPosition: 'center 35%'
  },
  kaaba_dawn: {
    id: 'kaaba_dawn',
    src: kaabaDawnImg,
    titleArabic: 'رحاب المسجد الحرم المكي عند الفجر',
    objectPosition: 'center 55%'
  },
  madinah_dome: {
    id: 'madinah_dome',
    src: madinahDomeImg,
    titleArabic: 'المسجد النبوي الشريف والقبة الخضراء',
    objectPosition: 'center 42%'
  },
  quran_lanterns: {
    id: 'quran_lanterns',
    src: quranLanternsImg,
    titleArabic: 'المصحف الشريف والفوانيس الإسلامية',
    objectPosition: 'center 50%'
  },
  mihrab_arches: {
    id: 'mihrab_arches',
    src: mihrabArchesImg,
    titleArabic: 'المحراب الذهبي والعمارة الإسلامية',
    objectPosition: 'center 40%'
  }
};

/**
 * Context-matched image pools for each section/card slot so every card displays
 * harmonious photography (Kaaba, Madinah, Quran Mushaf, Mihrab) that rotates periodically!
 */
export const SLOT_IMAGE_POOLS: Record<IslamicImageSlot, CuratedIslamicImage[]> = {
  kaaba: [
    CURATED_ISLAMIC_IMAGES.kaaba_night,
    CURATED_ISLAMIC_IMAGES.kaaba_dawn
  ],
  qibla: [
    CURATED_ISLAMIC_IMAGES.kaaba_night,
    CURATED_ISLAMIC_IMAGES.kaaba_dawn,
    CURATED_ISLAMIC_IMAGES.mihrab_arches
  ],
  prayers: [
    CURATED_ISLAMIC_IMAGES.kaaba_dawn,
    CURATED_ISLAMIC_IMAGES.kaaba_night,
    CURATED_ISLAMIC_IMAGES.mihrab_arches,
    CURATED_ISLAMIC_IMAGES.madinah_dome
  ],
  quran: [
    CURATED_ISLAMIC_IMAGES.quran_lanterns,
    CURATED_ISLAMIC_IMAGES.kaaba_night,
    CURATED_ISLAMIC_IMAGES.mihrab_arches
  ],
  adhkar: [
    CURATED_ISLAMIC_IMAGES.madinah_dome,
    CURATED_ISLAMIC_IMAGES.kaaba_dawn,
    CURATED_ISLAMIC_IMAGES.mihrab_arches
  ],
  tasbih: [
    CURATED_ISLAMIC_IMAGES.mihrab_arches,
    CURATED_ISLAMIC_IMAGES.madinah_dome,
    CURATED_ISLAMIC_IMAGES.kaaba_night
  ],
  wird: [
    CURATED_ISLAMIC_IMAGES.quran_lanterns,
    CURATED_ISLAMIC_IMAGES.mihrab_arches,
    CURATED_ISLAMIC_IMAGES.kaaba_dawn
  ],
  achievements: [
    CURATED_ISLAMIC_IMAGES.kaaba_dawn,
    CURATED_ISLAMIC_IMAGES.madinah_dome,
    CURATED_ISLAMIC_IMAGES.kaaba_night
  ],
  hadith: [
    CURATED_ISLAMIC_IMAGES.madinah_dome,
    CURATED_ISLAMIC_IMAGES.mihrab_arches,
    CURATED_ISLAMIC_IMAGES.kaaba_dawn
  ],
  reminders: [
    CURATED_ISLAMIC_IMAGES.kaaba_night,
    CURATED_ISLAMIC_IMAGES.quran_lanterns,
    CURATED_ISLAMIC_IMAGES.madinah_dome,
    CURATED_ISLAMIC_IMAGES.kaaba_dawn
  ],
  settings: [
    CURATED_ISLAMIC_IMAGES.mihrab_arches,
    CURATED_ISLAMIC_IMAGES.kaaba_dawn,
    CURATED_ISLAMIC_IMAGES.madinah_dome
  ]
};

/**
 * Returns the active image for a given slot and rotation tick, offset by `cardOffset`
 * so adjacent cards on the same screen show distinct, harmonious Islamic & Kaaba scenes!
 */
export function getRotatingSlotImage(
  slot: IslamicImageSlot,
  rotationTick: number,
  cardOffset: number = 0
): CuratedIslamicImage {
  const pool = SLOT_IMAGE_POOLS[slot] || SLOT_IMAGE_POOLS.kaaba;
  const idx = Math.abs(rotationTick + cardOffset) % pool.length;
  return pool[idx];
}
