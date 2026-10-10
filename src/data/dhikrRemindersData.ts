export interface DhikrAudioReminderItem {
  id: string;
  title: string;
  arabicText: string;
  fadl: string;
  audioUrl: string;
  fallbackAudioUrl?: string;
  durationSeconds: number;
  startTime?: number;
  endTime?: number;
  categoryLabel: string;
}

const BASE_ADHKAR_AUDIO = 'https://raw.githubusercontent.com/rn0x/Adhkar-json/main/audio/';

/**
 * مجموعة تنبيهات ذكر الله والصلاة على النبي ﷺ الموثقة بصوت نقي ومحترف 100%
 * لا يُضاف أي تنبيه إلا بعد التأكد من توفر ملفه الصوتي النقي المسجّل باستوديو احترافي.
 */
export const VERIFIED_DHIKR_REMINDERS: DhikrAudioReminderItem[] = [
  {
    id: 'subhanallah_adad_khalqih',
    title: 'تذكير بالتسبيح المضاعف بعظمة السماوات والأرض',
    arabicText: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ: عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ.',
    fadl: 'ذكرٌ مضاعف يعدل التسبيح ساعات طويلة بعدد ما في السماوات والأرض وما خلق الله (رواه مسلم).',
    audioUrl: `${BASE_ADHKAR_AUDIO}94.mp3`,
    durationSeconds: 13,
    endTime: 12.5,
    categoryLabel: 'تسبيح مضاعف'
  },
  {
    id: 'salawat_short_alafasy',
    title: 'صلّوا على النبي ﷺ',
    arabicText: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ.',
    fadl: 'من صلى عليَّ صلاةً صلى الله عليه بها عشراً، وأدركته شفاعتي يوم القيامة.',
    audioUrl: `${BASE_ADHKAR_AUDIO}98.mp3`,
    fallbackAudioUrl: '/audio/salawat.mp3',
    durationSeconds: 5,
    endTime: 4.8,
    categoryLabel: 'الصلاة على النبي ﷺ'
  },
  {
    id: 'salawat_ibrahimiyyah',
    title: 'الصلاة الإبراهيمية الكاملة على النبي ﷺ',
    arabicText:
      'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ، وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ، وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ.',
    fadl: 'أفضل صيغ الصلاة على النبي ﷺ وأكملها أجراً في السماوات والأرض (متفق عليه).',
    audioUrl: `${BASE_ADHKAR_AUDIO}53.mp3`,
    fallbackAudioUrl: '/audio/salawat.mp3',
    durationSeconds: 22,
    categoryLabel: 'الصلاة على النبي ﷺ'
  },
  {
    id: 'kalimatan_habibatan',
    title: 'كلمتان حبيبتان إلى الرحمن ثقيلتان في الميزان',
    arabicText:
      'قَالَ ﷺ: «كَلِمَتَانِ خَفِيفَتَانِ عَلَى اللِّسَانِ، ثَقِيلَتَانِ فِي الْمِيزَانِ، حَبِيبَتَانِ إِلَى الرَّحْمَنِ: سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ».',
    fadl: 'تملآن الميزان يوم القيامة وتحبّهما السماوات والأرض (متفق عليه).',
    audioUrl: `${BASE_ADHKAR_AUDIO}256.mp3`,
    durationSeconds: 14,
    categoryLabel: 'تسبيح وتعظيم'
  },
  {
    id: 'mil_assamawati_wal_ard',
    title: 'حمد الله ملء السماوات وملء الأرض',
    arabicText:
      'رَبَّنَا وَلَكَ الْحَمْدُ، مِلْءَ السَّمَاوَاتِ وَمِلْءَ الْأَرْضِ، وَمَا بَيْنَهُمَا، وَمِلْءَ مَا شِئْتَ مِنْ شَيْءٍ بَعْدُ.',
    fadl: 'حمدٌ عظيم يملأ ما بين السماوات والأرض ويثني على الله بما هو أهله (رواه مسلم).',
    audioUrl: `${BASE_ADHKAR_AUDIO}40.mp3`,
    durationSeconds: 18,
    categoryLabel: 'حمد وثناء'
  },
  {
    id: 'baqiyat_salihat',
    title: 'الباقيات الصالحات (أحب الكلام إلى الله)',
    arabicText:
      'سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ.',
    fadl: 'أحب إلى النبي ﷺ مما طلعت عليه الشمس، وهنّ الباقيات الصالحات وغراس الجنة (رواه مسلم).',
    audioUrl: `${BASE_ADHKAR_AUDIO}265.mp3`,
    durationSeconds: 12,
    categoryLabel: 'الباقيات الصالحات'
  },
  {
    id: 'subhanallah_100_sea_foam',
    title: 'سبحان الله وبحمده',
    arabicText: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ.',
    fadl: 'من قالها مائة مرة حُطَّت خطاياه وإن كانت مثل زبد البحر (متفق عليه).',
    audioUrl: `${BASE_ADHKAR_AUDIO}91.mp3`,
    durationSeconds: 3,
    endTime: 2.7,
    categoryLabel: 'تسبيح ومغفرة'
  },
  {
    id: 'subhan_dhi_almalakut',
    title: 'تعظيم ذي الجبروت والملكوت والكبرياء',
    arabicText: 'سُبْحَانَ ذِي الْجَبَرُوتِ، وَالْمَلَكُوتِ، وَالْكِبْرِيَاءِ، وَالْعَظَمَةِ.',
    fadl: 'تسبيح النبي ﷺ في قيام الليل تعظيماً لرب السماوات والأرض (رواه أبو داود والنسائي).',
    audioUrl: `${BASE_ADHKAR_AUDIO}45.mp3`,
    durationSeconds: 8,
    categoryLabel: 'تسبيح وتعظيم'
  },
  {
    id: 'la_ilaha_illallah_wahdahu',
    title: 'تهليل وتوحيد رب العالمين',
    arabicText:
      'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ.',
    fadl: 'أفضل الذكر لا إله إلا الله، وحرزٌ عظيم وعتق رقاب ومحو للسيئات (متفق عليه).',
    audioUrl: `${BASE_ADHKAR_AUDIO}93.mp3`,
    durationSeconds: 11,
    endTime: 10.5,
    categoryLabel: 'توحيد وتهليل'
  },
  {
    id: 'bismillah_alladhi_la_yadurr',
    title: 'ذكر الحفظ في الأرض وفي السماء',
    arabicText:
      'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ.',
    fadl: 'من قالها ثلاثاً لم يضره شيء في الأرض ولا في السماء (رواه أبو داود والترمذي).',
    audioUrl: `${BASE_ADHKAR_AUDIO}86.mp3`,
    durationSeconds: 10,
    endTime: 9.2,
    categoryLabel: 'تحصين وحفظ'
  },
  {
    id: 'astaghfirullah_wa_atubu',
    title: 'الاستغفار والتوبة إلى الله',
    arabicText: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ.',
    fadl: 'طوبى لمن وجد في صحيفته استغفاراً كثيراً، وبه تُفتح أبواب الرزق والفرج (رواه مسلم).',
    audioUrl: `${BASE_ADHKAR_AUDIO}96.mp3`,
    durationSeconds: 5,
    endTime: 4.5,
    categoryLabel: 'استغفار وتوبة'
  },
  {
    id: 'hasbiyallahu_rabb_alarsh',
    title: 'تفويض الأمر لرب العرش العظيم',
    arabicText: 'حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ.',
    fadl: 'من قالها كفاه الله ما أهمه من أمر الدنيا والآخرة (رواه أبو داود).',
    audioUrl: `${BASE_ADHKAR_AUDIO}83.mp3`,
    durationSeconds: 8,
    endTime: 7.7,
    categoryLabel: 'توكل وكفاية'
  },
  {
    id: 'sayyid_alistighfar',
    title: 'سيد الاستغفار',
    arabicText:
      'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ.',
    fadl: 'من قالها موقناً بها فمات من يومه أو ليلته دخل الجنة (رواه البخاري).',
    audioUrl: `${BASE_ADHKAR_AUDIO}79.mp3`,
    durationSeconds: 26,
    categoryLabel: 'استغفار وتوبة'
  },
  {
    id: 'ya_hayyu_ya_qayyum',
    title: 'الاستغاثة بالحي القيوم',
    arabicText:
      'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ.',
    fadl: 'وصية النبي ﷺ لفاطمة رضي الله عنها في صلاح الشأن كله (رواه الحاكم وصححه).',
    audioUrl: `${BASE_ADHKAR_AUDIO}88.mp3`,
    durationSeconds: 15,
    categoryLabel: 'دعاء واستغاثة'
  }
];
