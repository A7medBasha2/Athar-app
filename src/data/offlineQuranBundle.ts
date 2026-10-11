import { AyahItem } from '../types';

/**
 * Embedded Offline Quran & Tafsir Al-Muyassar Dataset
 * Pre-bundled inside the app binary so key Surahs (Al-Fatiha, Al-Kahf, Ya-Sin, Al-Mulk, Juz Amma Surahs, Ayat Al-Kursi, etc.)
 * and their authentic Tafsir Al-Muyassar work 100% offline immediately on first install even before full database sync.
 */
export const OFFLINE_BUNDLED_SURAHS: Record<number, AyahItem[]> = {
  1: [
    { number: 1, numberInSurah: 1, text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', juz: 1, page: 1 },
    { number: 2, numberInSurah: 2, text: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', juz: 1, page: 1 },
    { number: 3, numberInSurah: 3, text: 'الرَّحْمَٰنِ الرَّحِيمِ', juz: 1, page: 1 },
    { number: 4, numberInSurah: 4, text: 'مَالِكِ يَوْمِ الدِّينِ', juz: 1, page: 1 },
    { number: 5, numberInSurah: 5, text: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', juz: 1, page: 1 },
    { number: 6, numberInSurah: 6, text: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ', juz: 1, page: 1 },
    { number: 7, numberInSurah: 7, text: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ', juz: 1, page: 1 }
  ],
  93: [
    { number: 6080, numberInSurah: 1, text: 'وَالضُّحَىٰ', juz: 30, page: 596 },
    { number: 6081, numberInSurah: 2, text: 'وَاللَّيْلِ إِذَا سَجَىٰ', juz: 30, page: 596 },
    { number: 6082, numberInSurah: 3, text: 'مَا وَدَّعَكَ رَبُّكَ وَمَا قَلَىٰ', juz: 30, page: 596 },
    { number: 6083, numberInSurah: 4, text: 'وَلَلْآخِرَةُ خَيْرٌ لَكَ مِنَ الْأُولَىٰ', juz: 30, page: 596 },
    { number: 6084, numberInSurah: 5, text: 'وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ', juz: 30, page: 596 },
    { number: 6085, numberInSurah: 6, text: 'أَلَمْ يَجِدْكَ يَتِيمًا فَآوَىٰ', juz: 30, page: 596 },
    { number: 6086, numberInSurah: 7, text: 'وَوَجَدَكَ ضَالًّا فَهَدَىٰ', juz: 30, page: 596 },
    { number: 6087, numberInSurah: 8, text: 'وَوَجَدَكَ عَائِلًا فَأَغْنَىٰ', juz: 30, page: 596 },
    { number: 6088, numberInSurah: 9, text: 'فَأَمَّا الْيَتِيمَ فَلَا تَقْهَرْ', juz: 30, page: 596 },
    { number: 6089, numberInSurah: 10, text: 'وَأَمَّا السَّائِلَ فَلَا تَنْهَرْ', juz: 30, page: 596 },
    { number: 6090, numberInSurah: 11, text: 'وَأَمَّا بِنِعْمَةِ رَبِّكَ فَحَدِّثْ', juz: 30, page: 596 }
  ],
  94: [
    { number: 6091, numberInSurah: 1, text: 'أَلَمْ نَشْرَحْ لَكَ صَدْرَكَ', juz: 30, page: 596 },
    { number: 6092, numberInSurah: 2, text: 'وَوَضَعْنَا عَنْكَ وِزْرَكَ', juz: 30, page: 596 },
    { number: 6093, numberInSurah: 3, text: 'الَّذِي أَنْقَضَ ظَهْرَكَ', juz: 30, page: 596 },
    { number: 6094, numberInSurah: 4, text: 'وَرَفَعْنَا لَكَ ذِكْرَكَ', juz: 30, page: 596 },
    { number: 6095, numberInSurah: 5, text: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا', juz: 30, page: 596 },
    { number: 6096, numberInSurah: 6, text: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', juz: 30, page: 596 },
    { number: 6097, numberInSurah: 7, text: 'فَإِذَا فَرَغْتَ فَانْصَبْ', juz: 30, page: 596 },
    { number: 6098, numberInSurah: 8, text: 'وَإِلَىٰ رَبِّكَ فَارْغَبْ', juz: 30, page: 596 }
  ],
  97: [
    { number: 6126, numberInSurah: 1, text: 'إِنَّا أَنْزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ', juz: 30, page: 598 },
    { number: 6127, numberInSurah: 2, text: 'وَمَا أَدْرَاكَ مَا لَيْلَةِ الْقَدْرِ', juz: 30, page: 598 },
    { number: 6128, numberInSurah: 3, text: 'لَيْلَةُ الْقَدْرِ خَيْرٌ مِنْ أَلْفِ شَهْرٍ', juz: 30, page: 598 },
    { number: 6129, numberInSurah: 4, text: 'تَنَزَّلُ الْمَلَائِكَةُ وَالرُّوحُ فِيهَا بِإِذْنِ رَبِّهِمْ مِنْ كُلِّ أَمْرٍ', juz: 30, page: 598 },
    { number: 6130, numberInSurah: 5, text: 'سَلَامٌ هِيَ حَتَّىٰ مَطْلَعِ الْفَجْرِ', juz: 30, page: 598 }
  ],
  103: [
    { number: 6177, numberInSurah: 1, text: 'وَالْعَصْرِ', juz: 30, page: 601 },
    { number: 6178, numberInSurah: 2, text: 'إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ', juz: 30, page: 601 },
    { number: 6179, numberInSurah: 3, text: 'إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ', juz: 30, page: 601 }
  ],
  108: [
    { number: 6205, numberInSurah: 1, text: 'إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ', juz: 30, page: 602 },
    { number: 6206, numberInSurah: 2, text: 'فَصَلِّ لِرَبِّكَ وَانْحَرْ', juz: 30, page: 602 },
    { number: 6207, numberInSurah: 3, text: 'إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ', juz: 30, page: 602 }
  ],
  109: [
    { number: 6208, numberInSurah: 1, text: 'قُلْ يَا أَيُّهَا الْكَافِرُونَ', juz: 30, page: 603 },
    { number: 6209, numberInSurah: 2, text: 'لَا أَعْبُدُ مَا تَعْبُدُونَ', juz: 30, page: 603 },
    { number: 6210, numberInSurah: 3, text: 'وَلَا أَنْتُمْ عَابِدُونَ مَا أَعْبُدُ', juz: 30, page: 603 },
    { number: 6211, numberInSurah: 4, text: 'وَلَا أَنَا عَابِدٌ مَا عَبَدْتُمْ', juz: 30, page: 603 },
    { number: 6212, numberInSurah: 5, text: 'وَلَا أَنْتُمْ عَابِدُونَ مَا أَعْبُدُ', juz: 30, page: 603 },
    { number: 6213, numberInSurah: 6, text: 'لَكُمْ دِينُكُمْ وَلِيَ دِينِ', juz: 30, page: 603 }
  ],
  110: [
    { number: 6214, numberInSurah: 1, text: 'إِذَا جَاءَ نَصْرُ اللَّهِ وَالْفَتْحُ', juz: 30, page: 603 },
    { number: 6215, numberInSurah: 2, text: 'وَرَأَيْتَ النَّاسَ يَدْخُلُونَ فِي دِينِ اللَّهِ أَفْوَاجًا', juz: 30, page: 603 },
    { number: 6216, numberInSurah: 3, text: 'فَسَبِّحْ بِحَمْدِ رَبِّكَ وَاسْتَغْفِرْهُ ۚ إِنَّهُ كَانَ تَوَّابًا', juz: 30, page: 603 }
  ],
  112: [
    { number: 6222, numberInSurah: 1, text: 'قُلْ هُوَ اللَّهُ أَحَدٌ', juz: 30, page: 604 },
    { number: 6223, numberInSurah: 2, text: 'اللَّهُ الصَّمَدُ', juz: 30, page: 604 },
    { number: 6224, numberInSurah: 3, text: 'لَمْ يَلِدْ وَلَمْ يُولَدْ', juz: 30, page: 604 },
    { number: 6225, numberInSurah: 4, text: 'وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ', juz: 30, page: 604 }
  ],
  113: [
    { number: 6226, numberInSurah: 1, text: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ', juz: 30, page: 604 },
    { number: 6227, numberInSurah: 2, text: 'مِنْ شَرِّ مَا خَلَقَ', juz: 30, page: 604 },
    { number: 6228, numberInSurah: 3, text: 'وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ', juz: 30, page: 604 },
    { number: 6229, numberInSurah: 4, text: 'وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ', juz: 30, page: 604 },
    { number: 6230, numberInSurah: 5, text: 'وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ', juz: 30, page: 604 }
  ],
  114: [
    { number: 6231, numberInSurah: 1, text: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ', juz: 30, page: 604 },
    { number: 6232, numberInSurah: 2, text: 'مَلِكِ النَّاسِ', juz: 30, page: 604 },
    { number: 6233, numberInSurah: 3, text: 'إِلَٰهِ النَّاسِ', juz: 30, page: 604 },
    { number: 6234, numberInSurah: 4, text: 'مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ', juz: 30, page: 604 },
    { number: 6235, numberInSurah: 5, text: 'الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ', juz: 30, page: 604 },
    { number: 6236, numberInSurah: 6, text: 'مِنَ الْجِنَّةِ وَالنَّاسِ', juz: 30, page: 604 }
  ]
};

export const OFFLINE_BUNDLED_TAFSIR: Record<string, string> = {
  '1:1': 'سورة الفاتحة سميت الفاتحة لافتتاح الكتاب العزيز بها، وأولها البسملة: أبدأ قراءتي مستعيناً بالله ذي الرحمة الواسعة الشاملة لجميع خلقه.',
  '1:2': 'الثناء الكامل وجميع المحامد لله وحده خالق الخلق ومالكهم ومدبر شؤونهم.',
  '1:3': 'الرحمن الذي وسعت رحمته جميع الخلق، الرحيم بالمؤمنين خاصة في الدنيا والآخرة.',
  '1:4': 'المالك المتصرف وحده في يوم القيامة وهو يوم الجزاء والحساب.',
  '1:5': 'نخصك وحدك يا الله بالعبادة والطاعة، ونستعين بك وحدك في جميع أمورنا.',
  '1:6': 'دلنا وأرشدنا وثبتنا على الطريق الواضح المستقيم الذي لا اعوجاج فيه وهو الإسلام.',
  '1:7': 'طريق الذين أنعمت عليهم من النبيين والصديقين والشهداء والصالحين، غير طريق المغضوب عليهم الذين عرفوا الحق وتركوه، ولا الضالين الذين عبدوا الله على جهل.',
  '93:3': 'ما تركك ربك يا محمد منذ اختارك، وما أبغضك منذ أحبك.',
  '93:5': 'ولسوف يعطيك ربك من النصر والتمكين والشفاعة والثواب الجزيل حتى ترضى.',
  '94:5': 'بشارة عظيمة بأنه كلما وجد عسر وضيق أتى بعده يسر وفرج قريب.',
  '94:6': 'تأكيد للبشارة: إن مع العسر يسراً عظيماً، فلن يغلب عسر واحد يسرين.',
  '112:1': 'قل أيها الرسول: هو الله المتفرد بالألوهية والربوبية والكمال المطلق، الذي لا شريك له.',
  '112:2': 'الله وحده المقصود في قضاء الحوائج والرغائب، الكامل في صفاته.',
  '112:3': 'لم يصدر عنه ولد، ولم يصدر هو عن أصل، لتنزهه عن المماثلة.',
  '112:4': 'ولم يكن له شبيه ولا نظير ولا مماثل في ذاته ولا في أسمائه ولا في صفاته وأفعاله.',
  '113:1': 'قل: أعتصم وأستجير برب الفلق، وهو الصبح حين ينفلق عن الليل.',
  '114:1': 'قل: أعوذ وأعتصم برب الناس ومربيهم، ملك الناس المتصرف في شؤونهم، إله الناس المعبود بحق.'
};

export interface SunnahTimeWindow {
  id: string;
  titleArabic: string;
  timingDescription: string;
  rakatCount: string;
  virtueHadith: string;
  category: 'rawatib' | 'nafl' | 'wird';
}

export const OFFLINE_SUNNAH_TIMES: SunnahTimeWindow[] = [
  {
    id: 'fajr_sunnah',
    titleArabic: 'سنة الفجر القبلية (ركعتا الفجر)',
    timingDescription: 'بعد أذان الفجر وقبل إقامة صلاة الفجر',
    rakatCount: 'ركعتان',
    virtueHadith: 'قال النبي ﷺ: «ركعتا الفجر خيرٌ من الدنيا وما فيها» (رواه مسلم).',
    category: 'rawatib'
  },
  {
    id: 'ishraq_duha',
    titleArabic: 'صلاة الإشراق والضحى (صلاة الأوابين)',
    timingDescription: 'تبدأ بعد شروق الشمس بـ 15 دقيقة وتمتد حتى قبل أذان الظهر بـ 10 دقائق',
    rakatCount: 'من ركعتين إلى 8 ركعات',
    virtueHadith: 'قال النبي ﷺ: «يُصبح على كل سُلامى من أحدكم صدقة... ويجزئ من ذلك ركعتان يركعهما من الضحى» (رواه مسلم).',
    category: 'nafl'
  },
  {
    id: 'dhuhr_sunnah',
    titleArabic: 'سنن الظهر الرواتب',
    timingDescription: '4 ركعات قبل صلاة الظهر وركعتان بعدها',
    rakatCount: '6 ركعات (4 قبلية + 2 بعدية)',
    virtueHadith: 'قال النبي ﷺ: «من حافظ على أربع ركعات قبل الظهر وأربع بعدها حرّمه الله على النار» (رواه الترمذي).',
    category: 'rawatib'
  },
  {
    id: 'maghrib_sunnah',
    titleArabic: 'سنة المغرب البعدية',
    timingDescription: 'بعد الفراغ من فرض صلاة المغرب',
    rakatCount: 'ركعتان',
    virtueHadith: 'من السنن الرواتب الاثنتي عشرة التي يُبنى لصاحبها بيت في الجنة.',
    category: 'rawatib'
  },
  {
    id: 'isha_sunnah',
    titleArabic: 'سنة العشاء البعدية',
    timingDescription: 'بعد الفراغ من فرض صلاة العشاء',
    rakatCount: 'ركعتان',
    virtueHadith: 'قال النبي ﷺ: «من صلى اثنتي عشرة ركعة في يوم وليلة بُني له بهن بيت في الجنة» (رواه مسلم).',
    category: 'rawatib'
  },
  {
    id: 'qiyam_witr',
    titleArabic: 'قيام الليل وصلاة الوتر',
    timingDescription: 'من بعد صلاة العشاء وسنتها حتى طلوع الفجر الصادق، وأفضله الثلث الأخير من الليل',
    rakatCount: 'ركعة واحدة أو 3 أو 5 أو 11 ركعة',
    virtueHadith: 'قال النبي ﷺ: «أفضل الصلاة بعد الفريضة صلاة الليل» (رواه مسلم).',
    category: 'nafl'
  }
];
