export interface AdhanPhraseCue {
  time: number; // Time in seconds when the phrase begins
  phrase: string; // The phrase uttered by the Muadhin
  response: string; // The recommended Sunnah response to recite
}

/**
 * Acoustically calibrated phrase timestamps for each adhan audio recording.
 * Extracted and aligned with high-precision audio pause detection.
 */
export const ADHAN_TIMELINES: Record<string, AdhanPhraseCue[]> = {
  // 1. Mishary Alafasy (Regular) - 224 seconds total
  alafasy: [
    { time: 0.0, phrase: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ', response: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ' },
    { time: 6.0, phrase: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ', response: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ' },
    { time: 23.5, phrase: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ', response: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ' },
    { time: 39.5, phrase: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ', response: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ' },
    { time: 58.5, phrase: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللهِ', response: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللهِ (رَضِيتُ بِاللهِ رَبّاً)' },
    { time: 70.0, phrase: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللهِ', response: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللهِ' },
    { time: 93.0, phrase: 'حَيَّ عَلَى الصَّلَاةِ', response: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ' },
    { time: 104.0, phrase: 'حَيَّ عَلَى الصَّلَاةِ', response: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ' },
    { time: 129.0, phrase: 'حَيَّ عَلَى الْفَلَاحِ', response: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ' },
    { time: 141.0, phrase: 'حَيَّ عَلَى الْفَلَاحِ', response: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ' },
    { time: 164.5, phrase: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ', response: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ' },
    { time: 180.5, phrase: 'لَا إِلَهَ إِلَّا اللهُ', response: 'لَا إِلَهَ إِلَّا اللهُ، وَحْدَهُ لَا شَرِيكَ لَهُ' },
  ],

  // 2. Mishary Alafasy (Fajr) - 187 seconds total
  alafasy_fajr: [
    { time: 0.0, phrase: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ', response: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ' },
    { time: 4.5, phrase: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ', response: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ' },
    { time: 18.5, phrase: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ', response: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ' },
    { time: 33.5, phrase: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ', response: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ' },
    { time: 49.0, phrase: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللهِ', response: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللهِ (رَضِيتُ بِاللهِ رَبّاً)' },
    { time: 65.0, phrase: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللهِ', response: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللهِ' },
    { time: 78.5, phrase: 'حَيَّ عَلَى الصَّلَاةِ', response: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ' },
    { time: 92.0, phrase: 'حَيَّ عَلَى الصَّلَاةِ', response: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ' },
    { time: 103.5, phrase: 'حَيَّ عَلَى الْفَلَاحِ', response: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ' },
    { time: 114.5, phrase: 'حَيَّ عَلَى الْفَلَاحِ', response: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ' },
    { time: 127.0, phrase: 'الصَّلَاةُ خَيْرٌ مِنَ النَّوْمِ', response: 'الصَّلَاةُ خَيْرٌ مِنَ النَّوْمِ (صَدَقْتَ وَبَرِرْتَ)' },
    { time: 139.0, phrase: 'الصَّلَاةُ خَيْرٌ مِنَ النَّوْمِ', response: 'الصَّلَاةُ خَيْرٌ مِنَ النَّوْمِ (صَدَقْتَ وَبَرِرْتَ)' },
    { time: 155.0, phrase: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ', response: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ' },
    { time: 179.5, phrase: 'لَا إِلَهَ إِلَّا اللهُ', response: 'لَا إِلَهَ إِلَّا اللهُ، وَحْدَهُ لَا شَرِيكَ لَهُ' },
  ],

  // 3. Makkah Sanctuary (Sheikh Ali Mulla) - 199 seconds total
  makkah: [
    { time: 0.0, phrase: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ', response: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ' },
    { time: 6.5, phrase: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ', response: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ' },
    { time: 21.5, phrase: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ', response: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ' },
    { time: 34.0, phrase: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ', response: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ' },
    { time: 54.5, phrase: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللهِ', response: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللهِ (رَضِيتُ بِاللهِ رَبّاً)' },
    { time: 74.5, phrase: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللهِ', response: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللهِ' },
    { time: 94.0, phrase: 'حَيَّ عَلَى الصَّلَاةِ', response: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ' },
    { time: 111.5, phrase: 'حَيَّ عَلَى الصَّلَاةِ', response: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ' },
    { time: 131.0, phrase: 'حَيَّ عَلَى الْفَلَاحِ', response: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ' },
    { time: 149.5, phrase: 'حَيَّ عَلَى الْفَلَاحِ', response: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ' },
    { time: 169.0, phrase: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ', response: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ' },
    { time: 180.0, phrase: 'لَا إِلَهَ إِلَّا اللهُ', response: 'لَا إِلَهَ إِلَّا اللهُ، وَحْدَهُ لَا شَرِيكَ لَهُ' },
  ],

  // 4. Madinah Sanctuary (Al-Masjid An-Nabawi) - 209 seconds total
  madinah: [
    { time: 0.0, phrase: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ', response: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ' },
    { time: 15.0, phrase: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ', response: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ' },
    { time: 37.5, phrase: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ', response: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ' },
    { time: 59.5, phrase: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ', response: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ' },
    { time: 82.0, phrase: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللهِ', response: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللهِ (رَضِيتُ بِاللهِ رَبّاً)' },
    { time: 103.0, phrase: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللهِ', response: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللهِ' },
    { time: 121.5, phrase: 'حَيَّ عَلَى الصَّلَاةِ', response: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ' },
    { time: 139.0, phrase: 'حَيَّ عَلَى الصَّلَاةِ', response: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ' },
    { time: 158.5, phrase: 'حَيَّ عَلَى الْفَلَاحِ', response: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ' },
    { time: 169.0, phrase: 'حَيَّ عَلَى الْفَلَاحِ', response: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ' },
    { time: 182.0, phrase: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ', response: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ' },
    { time: 189.5, phrase: 'لَا إِلَهَ إِلَّا اللهُ', response: 'لَا إِلَهَ إِلَّا اللهُ، وَحْدَهُ لَا شَرِيكَ لَهُ' },
  ],

  // 5. Al-Aqsa Sanctuary (Al-Quds) - 151 seconds total
  alaqsa: [
    { time: 0.0, phrase: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ', response: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ' },
    { time: 10.5, phrase: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ', response: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ' },
    { time: 24.0, phrase: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ', response: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ' },
    { time: 35.5, phrase: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ', response: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ' },
    { time: 50.5, phrase: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللهِ', response: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللهِ (رَضِيتُ بِاللهِ رَبّاً)' },
    { time: 66.0, phrase: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللهِ', response: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللهِ' },
    { time: 82.5, phrase: 'حَيَّ عَلَى الصَّلَاةِ', response: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ' },
    { time: 92.0, phrase: 'حَيَّ عَلَى الصَّلَاةِ', response: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ' },
    { time: 103.0, phrase: 'حَيَّ عَلَى الْفَلَاحِ', response: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ' },
    { time: 111.0, phrase: 'حَيَّ عَلَى الْفَلَاحِ', response: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ' },
    { time: 123.0, phrase: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ', response: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ' },
    { time: 135.5, phrase: 'لَا إِلَهَ إِلَّا اللهُ', response: 'لَا إِلَهَ إِلَّا اللهُ، وَحْدَهُ لَا شَرِيكَ لَهُ' },
  ],
};

/**
 * Resolves the currently active phrase and its sunnah response based on the actual audio seconds.
 */
export function getActiveAdhanCue(
  voice: string,
  isFajr: boolean,
  currentSeconds: number
): {
  phrase: string;
  response: string;
  index: number;
  total: number;
} {
  const timelineKey = isFajr && voice === 'alafasy' ? 'alafasy_fajr' : (ADHAN_TIMELINES[voice] ? voice : 'alafasy');
  const cues = ADHAN_TIMELINES[timelineKey] || ADHAN_TIMELINES.alafasy;

  if (currentSeconds <= 0) {
    return {
      phrase: cues[0].phrase,
      response: cues[0].response,
      index: 0,
      total: cues.length,
    };
  }

  // Find the latest cue whose time is <= currentSeconds
  let activeIndex = 0;
  for (let i = 0; i < cues.length; i++) {
    if (currentSeconds >= cues[i].time) {
      activeIndex = i;
    } else {
      break;
    }
  }

  const active = cues[activeIndex];
  return {
    phrase: active.phrase,
    response: active.response,
    index: activeIndex,
    total: cues.length,
  };
}
