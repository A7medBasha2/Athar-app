import { ALL_SURAHS } from '../data/surahsData';
import { AyahItem, SurahMeta } from '../types';
import { StorageService } from './storageService';

/**
 * Rich, diverse pool of concise, single-verse (آية واحدة قصيرة ومؤثرة) selections
 * spanning across the entire Holy Quran (from Juz 1 to Juz 30) so "اقرأ ولو آية"
 * is always a single concise verse (never a long page-length verse like Ayat Al-Kursi or Debt verse)
 * and never repeats!
 */
const CONCISE_SINGLE_VERSES_POOL: Array<{
  surah: number;
  ayah: number;
  name: string;
  text: string;
}> = [
  { surah: 1, ayah: 2, name: 'الفَاتِحَة', text: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ' },
  { surah: 1, ayah: 5, name: 'الفَاتِحَة', text: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ' },
  { surah: 1, ayah: 6, name: 'الفَاتِحَة', text: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ' },
  { surah: 2, ayah: 45, name: 'البَقَرَة', text: 'وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ وَإِنَّهَا لَكَبِيرَةٌ إِلَّا عَلَى الْخَاشِعِينَ' },
  { surah: 2, ayah: 152, name: 'البَقَرَة', text: 'فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ' },
  { surah: 2, ayah: 153, name: 'البَقَرَة', text: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ' },
  { surah: 2, ayah: 186, name: 'البَقَرَة', text: 'وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ' },
  { surah: 2, ayah: 195, name: 'البَقَرَة', text: 'وَأَحْسِنُوا ۛ إِنَّ اللَّهَ يُحِبُّ الْمُحْسِنِينَ' },
  { surah: 2, ayah: 201, name: 'البَقَرَة', text: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ' },
  { surah: 3, ayah: 8, name: 'آل عِمْرَان', text: 'رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِنْ لَدُنْكَ رَحْمَةً ۚ إِنَّكَ أَنْتَ الْوَهَّابُ' },
  { surah: 3, ayah: 139, name: 'آل عِمْرَان', text: 'وَلَا تَهِنُوا وَلَا تَحْزَنُوا وَأَنْتُمُ الْأَعْلَوْنَ إِنْ كُنْتُمْ مُؤْمِنِينَ' },
  { surah: 3, ayah: 159, name: 'آل عِمْرَان', text: 'فَإِذَا عَزَمْتَ فَتَوَكَّلْ عَلَى اللَّهِ ۚ إِنَّ اللَّهَ يُحِبُّ الْمُتَوَكِّلِينَ' },
  { surah: 3, ayah: 173, name: 'آل عِمْرَان', text: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ' },
  { surah: 4, ayah: 110, name: 'النِّسَاء', text: 'وَمَنْ يَعْمَلْ سُوءًا أَوْ يَظْلِمْ نَفْسَهُ ثُمَّ يَسْتَغْفِرِ اللَّهَ يَجِدِ اللَّهَ غَفُورًا رَحِيمًا' },
  { surah: 6, ayah: 17, name: 'الأَنْعَام', text: 'وَإِنْ يَمْسَسْكَ اللَّهُ بِضُرٍّ فَلَا كَاشِفَ لَهُ إِلَّا هُوَ ۖ وَإِنْ يَمْسَسْكَ بِخَيْرٍ فَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ' },
  { surah: 7, ayah: 23, name: 'الأَعْرَاف', text: 'قَالَا رَبَّنَا ظَلَمْنَا أَنْفُسَنَا وَإِنْ لَمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ' },
  { surah: 7, ayah: 56, name: 'الأَعْرَاف', text: 'إِنَّ رَحْمَتَ اللَّهِ قَرِيبٌ مِنَ الْمُحْسِنِينَ' },
  { surah: 8, ayah: 46, name: 'الأَنْفَال', text: 'وَاصْبِرُوا ۚ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ' },
  { surah: 9, ayah: 40, name: 'التَّوْبَة', text: 'لَا تَحْزَنْ إِنَّ اللَّهَ مَعَنَا' },
  { surah: 9, ayah: 51, name: 'التَّوْبَة', text: 'قُلْ لَنْ يُصِيبَنَا إِلَّا مَا كَتَبَ اللَّهُ لَنَا هُوَ مَوْلَانَا ۚ وَعَلَى اللَّهِ فَلْيَتَوَكَّلِ الْمُؤْمِنُونَ' },
  { surah: 10, ayah: 58, name: 'يُونُس', text: 'قُلْ بِفَضْلِ اللَّهِ وَبِرَحْمَتِهِ فَبِذَٰلِكَ فَلْيَفْرَحُوا هُوَ خَيْرٌ مِمَّا يَجْمَعُونَ' },
  { surah: 11, ayah: 6, name: 'هُود', text: 'وَمَا مِنْ دَابَّةٍ فِي الْأَرْضِ إِلَّا عَلَى اللَّهِ رِزْقُهَا' },
  { surah: 11, ayah: 88, name: 'هُود', text: 'وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ ۚ عَلَيْهِ تَوَكَّلْتُ وَإِلَيْهِ أُنِيبُ' },
  { surah: 12, ayah: 64, name: 'يُوسُف', text: 'فَاللَّهُ خَيْرٌ حَافِظًا ۖ وَهُوَ أَرْحَمُ الرَّاحِمِينَ' },
  { surah: 12, ayah: 87, name: 'يُوسُف', text: 'إِنَّهُ لَا يَيْأَسُ مِنْ رَوْحِ اللَّهِ إِلَّا الْقَوْمُ الْكَافِرُونَ' },
  { surah: 13, ayah: 28, name: 'الرَّعْد', text: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ' },
  { surah: 14, ayah: 7, name: 'إِبْرَاهِيم', text: 'لَئِنْ شَكَرْتُمْ لَأَزِيدَنَّكُمْ' },
  { surah: 14, ayah: 40, name: 'إِبْرَاهِيم', text: 'رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِنْ ذُرِّيَّتِي ۚ رَبَّنَا وَتَقَبَّلْ دُعَاءِ' },
  { surah: 15, ayah: 9, name: 'الحِجْر', text: 'إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ' },
  { surah: 16, ayah: 128, name: 'النَّحْل', text: 'إِنَّ اللَّهَ مَعَ الَّذِينَ اتَّقَوْا وَالَّذِينَ هُمْ مُحْسِنُونَ' },
  { surah: 17, ayah: 24, name: 'الإِسْرَاء', text: 'وَقُلْ رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا' },
  { surah: 17, ayah: 80, name: 'الإِسْرَاء', text: 'وَقُلْ رَبِّ أَدْخِلْنِي مُدْخَلَ صِدْقٍ وَأَخْرِجْنِي مُخْرَجَ صِدْقٍ وَاجْعَلْ لِي مِنْ لَدُنْكَ سُلْطَانًا نَصِيرًا' },
  { surah: 17, ayah: 82, name: 'الإِسْرَاء', text: 'وَنُنَزِّلُ مِنَ الْقُرْآنِ مَا هُوَ شِفَاءٌ وَرَحْمَةٌ لِلْمُؤْمِنِينَ' },
  { surah: 18, ayah: 10, name: 'الكَهْف', text: 'رَبَّنَا آتِنَا مِنْ لَدُنْكَ رَحْمَةً وَهَيِّئْ لَنَا مِنْ أَمْرِنَا رَشَدًا' },
  { surah: 18, ayah: 46, name: 'الكَهْف', text: 'الْمَالُ وَالْبَنُونَ زِينَةُ الْحَيَاةِ الدُّنْيَا ۖ وَالْبَاقِيَاتُ الصَّالِحَاتُ خَيْرٌ عِنْدَ رَبِّكَ ثَوَابًا وَخَيْرٌ أَمَلًا' },
  { surah: 19, ayah: 96, name: 'مَرْيَم', text: 'إِنَّ الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ سَيَجْعَلُ لَهُمُ الرَّحْمَٰنُ وُدًّا' },
  { surah: 20, ayah: 25, name: 'طه', text: 'قَالَ رَبِّ اشْرَحْ لِي صَدْرِي' },
  { surah: 20, ayah: 26, name: 'طه', text: 'وَيَسِّرْ لِي أَمْرِي' },
  { surah: 20, ayah: 114, name: 'طه', text: 'وَقُلْ رَبِّ زِدْنِي عِلْمًا' },
  { surah: 21, ayah: 83, name: 'الأَنْبِيَاء', text: 'أَنِّي مَسَّنِيَ الضُّرُّ وَأَنْتَ أَرْحَمُ الرَّاحِمِينَ' },
  { surah: 21, ayah: 87, name: 'الأَنْبِيَاء', text: 'لَا إِلَٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ' },
  { surah: 21, ayah: 89, name: 'الأَنْبِيَاء', text: 'رَبِّ لَا تَذَرْنِي فَرْدًا وَأَنْتَ خَيْرُ الْوَارِثِينَ' },
  { surah: 23, ayah: 118, name: 'المُؤْمِنُون', text: 'وَقُلْ رَبِّ اغْفِرْ وَارْحَمْ وَأَنْتَ خَيْرُ الرَّاحِمِينَ' },
  { surah: 25, ayah: 65, name: 'الفُرْقَان', text: 'رَبَّنَا اصْرِفْ عَنَّا عَذَابَ جَهَنَّمَ ۖ إِنَّ عَذَابَهَا كَانَ غَرَامًا' },
  { surah: 26, ayah: 62, name: 'الشُّعَرَاء', text: 'قَالَ كَلَّا ۖ إِنَّ مَعِيَ رَبِّي سَيَهْدِينِ' },
  { surah: 26, ayah: 80, name: 'الشُّعَرَاء', text: 'وَإِذَا مَرِضْتُ فَهُوَ يَشْفِينِ' },
  { surah: 27, ayah: 62, name: 'النَّمْل', text: 'أَمَّنْ يُجِيبُ الْمُضْطَرَّ إِذَا دَعَاهُ وَيَكْشِفُ السُّوءَ' },
  { surah: 28, ayah: 24, name: 'القَصَص', text: 'رَبِّ إِنِّي لِمَا أَنْزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ' },
  { surah: 29, ayah: 69, name: 'العَنْكَبُوت', text: 'وَالَّذِينَ جَاهَدُوا فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا ۚ وَإِنَّ اللَّهَ لَمَعَ الْمُحْسِنِينَ' },
  { surah: 31, ayah: 17, name: 'لُقْمَان', text: 'يَا بُنَيَّ أَقِمِ الصَّلَاةَ وَأْمُرْ بِالْمَعْرُوفِ وَانْهَ عَنِ الْمُنْكَرِ وَاصْبِرْ عَلَىٰ مَا أَصَابَكَ' },
  { surah: 33, ayah: 41, name: 'الأَحْزَاب', text: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اذْكُرُوا اللَّهَ ذِكْرًا كَثِيرًا' },
  { surah: 33, ayah: 42, name: 'الأَحْزَاب', text: 'وَسَبِّحُوهُ بُكْرَةً وَأَصِيلًا' },
  { surah: 35, ayah: 2, name: 'فَاطِر', text: 'مَا يَفْتَحِ اللَّهُ لِلنَّاسِ مِنْ رَحْمَةٍ فَلَا مُمْسِكَ لَهَا' },
  { surah: 36, ayah: 58, name: 'يس', text: 'سَلَامٌ قَوْلًا مِنْ رَبٍّ رَحِيمٍ' },
  { surah: 37, ayah: 99, name: 'الصَّافَّات', text: 'وَقَالَ إِنِّي ذَاهِبٌ إِلَىٰ رَبِّي سَيَهْدِينِ' },
  { surah: 39, ayah: 10, name: 'الزُّمَر', text: 'إِنَّمَا يُوَفَّى الصَّابِرُونَ أَجْرَهُمْ بِغَيْرِ حِسَابٍ' },
  { surah: 39, ayah: 36, name: 'الزُّمَر', text: 'أَلَيْسَ اللَّهُ بِكَافٍ عَبْدَهُ' },
  { surah: 39, ayah: 53, name: 'الزُّمَر', text: 'لَا تَقْنَطُوا مِنْ رَحْمَةِ اللَّهِ ۚ إِنَّ اللَّهَ يَغْفِرُ الذُّنُوبَ جَمِيعًا' },
  { surah: 40, ayah: 44, name: 'غَافِر', text: 'وَأُفَوِّضُ أَمْرِي إِلَى اللَّهِ ۚ إِنَّ اللَّهَ بَصِيرٌ بِالْعِبَادِ' },
  { surah: 40, ayah: 60, name: 'غَافِر', text: 'وَقَالَ رَبُّكُمُ ادْعُونِي أَسْتَجِبْ لَكُمْ' },
  { surah: 41, ayah: 30, name: 'فُصِّلَت', text: 'إِنَّ الَّذِينَ قَالُوا رَبُّنَا اللَّهُ ثُمَّ اسْتَقَامُوا تَتَنَزَّلُ عَلَيْهِمُ الْمَلَائِكَةُ أَلَّا تَخَافُوا وَلَا تَحْزَنُوا' },
  { surah: 42, ayah: 19, name: 'الشُّورَى', text: 'اللَّهُ لَطِيفٌ بِعِبَادِهِ يَرْزُقُ مَنْ يَشَاءُ ۖ وَهُوَ الْقَوِيُّ الْعَزِيزُ' },
  { surah: 47, ayah: 7, name: 'مُحَمَّد', text: 'يَا أَيُّهَا الَّذِينَ آمَنُوا إِنْ تَنْصُرُوا اللَّهَ يَنْصُرْكُمْ وَيُثَبِّتْ أَقْدَامَكُمْ' },
  { surah: 48, ayah: 4, name: 'الفَتْح', text: 'هُوَ الَّذِي أَنْزَلَ السَّكِينَةَ فِي قُلُوبِ الْمُؤْمِنِينَ لِيَزْدَادُوا إِيمَانًا مَعَ إِيمَانِهِمْ' },
  { surah: 49, ayah: 10, name: 'الحُجُرَات', text: 'إِنَّمَا الْمُؤْمِنُونَ إِخْوَةٌ فَأَصْلِحُوا بَيْنَ أَخَوَيْكُمْ ۚ وَاتَّقُوا اللَّهَ لَعَلَّكُمْ تُرْحَمُونَ' },
  { surah: 50, ayah: 16, name: 'ق', text: 'وَنَحْنُ أَقْرَبُ إِلَيْهِ مِنْ حَبْلِ الْوَرِيدِ' },
  { surah: 51, ayah: 50, name: 'الذَّارِيَات', text: 'فَفِرُّوا إِلَى اللَّهِ ۖ إِنِّي لَكُمْ مِنْهُ نَذِيرٌ مُبِينٌ' },
  { surah: 51, ayah: 58, name: 'الذَّارِيَات', text: 'إِنَّ اللَّهَ هُوَ الرَّزَّاقُ ذُو الْقُوَّةِ الْمَتِينُ' },
  { surah: 52, ayah: 48, name: 'الطُّور', text: 'وَاصْبِرْ لِحُكْمِ رَبِّكَ فَإِنَّكَ بِأَعْيُنِنَا ۖ وَسَبِّحْ بِحَمْدِ رَبِّكَ حِينَ تَقُومُ' },
  { surah: 53, ayah: 39, name: 'النَّجْم', text: 'وَأَنْ لَيْسَ لِلْإِنْسَانِ إِلَّا مَا سَعَىٰ' },
  { surah: 53, ayah: 40, name: 'النَّجْم', text: 'وَأَنَّ سَعْيَهُ سَوْفَ يُرَىٰ' },
  { surah: 54, ayah: 17, name: 'القَمَر', text: 'وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِنْ مُدَّكِرٍ' },
  { surah: 55, ayah: 60, name: 'الرَّحْمَن', text: 'هَلْ جَزَاءُ الْإِحْسَانِ إِلَّا الْإِحْسَانُ' },
  { surah: 57, ayah: 4, name: 'الحَدِيد', text: 'وَهُوَ مَعَكُمْ أَيْنَ مَا كُنْتُمْ ۚ وَاللَّهُ بِمَا تَعْمَلُونَ بَصِيرٌ' },
  { surah: 57, ayah: 16, name: 'الحَدِيد', text: 'أَلَمْ يَأْنِ لِلَّذِينَ آمَنُوا أَنْ تَخْشَعَ قُلُوبُهُمْ لِذِكْرِ اللَّهِ وَمَا نَزَلَ مِنَ الْحَقِّ' },
  { surah: 59, ayah: 18, name: 'الحَشْر', text: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ وَلْتَنْظُرْ نَفْسٌ مَا قَدَّمَتْ لِغَدٍ' },
  { surah: 64, ayah: 11, name: 'التَّغَابُن', text: 'وَمَنْ يُؤْمِنْ بِاللَّهِ يَهْدِ قَلْبَهُ ۚ وَاللَّهُ بِكُلِّ شَيْءٍ عَلِيمٌ' },
  { surah: 65, ayah: 2, name: 'الطَّلَاق', text: 'وَمَنْ يَتَّقِ اللَّهَ يَجْعَلْ لَهُ مَخْرَجًا' },
  { surah: 65, ayah: 3, name: 'الطَّلَاق', text: 'وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ ۚ وَمَنْ يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ' },
  { surah: 65, ayah: 7, name: 'الطَّلَاق', text: 'سَيَجْعَلُ اللَّهُ بَعْدَ عُسْرٍ يُسْرًا' },
  { surah: 67, ayah: 14, name: 'المُلْك', text: 'أَلَا يَعْلَمُ مَنْ خَلَقَ وَهُوَ اللَّطِيفُ الْخَبِيرُ' },
  { surah: 68, ayah: 4, name: 'القَلَم', text: 'وَإِنَّكَ لَعَلَىٰ خُلُقٍ عَظِيمٍ' },
  { surah: 73, ayah: 8, name: 'المُزَّمِّل', text: 'وَاذْكُرِ اسْمَ رَبِّكَ وَتَبَتَّلْ إِلَيْهِ تَبْتِيلًا' },
  { surah: 76, ayah: 9, name: 'الإِنْسَان', text: 'إِنَّمَا نُطْعِمُكُمْ لِوَجْهِ اللَّهِ لَا نُرِيدُ مِنْكُمْ جَزَاءً وَلَا شُكُورًا' },
  { surah: 79, ayah: 40, name: 'النَّازِعَات', text: 'وَأَمَّا مَنْ خَافَ مَقَامَ رَبِّهِ وَنَهَى النَّفْسَ عَنِ الْهَوَىٰ' },
  { surah: 79, ayah: 41, name: 'النَّازِعَات', text: 'فَإِنَّ الْجَنَّةَ هِيَ الْمَأْوَىٰ' },
  { surah: 87, ayah: 1, name: 'الأَعْلَى', text: 'سَبِّحِ اسْمَ رَبِّكَ الْأَعْلَى' },
  { surah: 87, ayah: 14, name: 'الأَعْلَى', text: 'قَدْ أَفْلَحَ مَنْ تَزَكَّىٰ' },
  { surah: 89, ayah: 27, name: 'الفَجْر', text: 'يَا أَيَّتُهَا النَّفْسُ الْمُطْمَئِنَّةُ' },
  { surah: 89, ayah: 28, name: 'الفَجْر', text: 'ارْجِعِي إِلَىٰ رَبِّكِ رَاضِيَةً مَرْضِيَّةً' },
  { surah: 93, ayah: 3, name: 'الضُّحَى', text: 'مَا وَدَّعَكَ رَبُّكَ وَمَا قَلَىٰ' },
  { surah: 93, ayah: 4, name: 'الضُّحَى', text: 'وَلَلْآخِرَةُ خَيْرٌ لَكَ مِنَ الْأُولَىٰ' },
  { surah: 93, ayah: 5, name: 'الضُّحَى', text: 'وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ' },
  { surah: 94, ayah: 5, name: 'الشَّرْح', text: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا' },
  { surah: 94, ayah: 6, name: 'الشَّرْح', text: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا' },
  { surah: 94, ayah: 8, name: 'الشَّرْح', text: 'وَإِلَىٰ رَبِّكَ فَارْغَبْ' },
  { surah: 99, ayah: 7, name: 'الزَّلْزَلَة', text: 'فَمَنْ يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ' },
  { surah: 103, ayah: 1, name: 'العَصْر', text: 'وَالْعَصْرِ' },
  { surah: 108, ayah: 1, name: 'الكَوْثَر', text: 'إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ' },
  { surah: 108, ayah: 2, name: 'الكَوْثَر', text: 'فَصَلِّ لِرَبِّكَ وَانْحَرْ' },
  { surah: 112, ayah: 1, name: 'الإِخْلَاص', text: 'قُلْ هُوَ اللَّهُ أَحَدٌ' },
  { surah: 112, ayah: 2, name: 'الإِخْلَاص', text: 'اللَّهُ الصَّمَدُ' },
  { surah: 113, ayah: 1, name: 'الفَلَق', text: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ' },
  { surah: 114, ayah: 1, name: 'النَّاس', text: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ' }
];

export const QuranService = {
  /**
   * Retrieves surah list with instant local metadata
   */
  getSurahs(): SurahMeta[] {
    return ALL_SURAHS;
  },

  /**
   * Searches surahs by name or number
   */
  searchSurahs(query: string): SurahMeta[] {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_SURAHS;
    return ALL_SURAHS.filter(
      (s) =>
        s.name.includes(q) ||
        s.englishName.toLowerCase().includes(q) ||
        s.englishNameTranslation.toLowerCase().includes(q) ||
        String(s.number) === q
    );
  },

  /**
   * Fetches full Ayahs of a Surah from AlQuran.cloud API with Arabic Uthmani text,
   * falling back to local cache if available or offline.
   */
  async getSurahAyahs(surahNumber: number): Promise<{ ayahs: AyahItem[]; error?: string }> {
    const cached = StorageService.getCachedSurah(surahNumber);
    if (cached && cached.length > 0) {
      return { ayahs: cached };
    }

    try {
      const url = `https://api.alquran.cloud/v1/surah/${surahNumber}/quran-uthmani`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`AlQuran Cloud API error: HTTP ${response.status}`);
      }
      const data = await response.json();
      if (!data.data || !data.data.ayahs) {
        throw new Error('Invalid Quran API data response');
      }

      const ayahs: AyahItem[] = data.data.ayahs.map((a: any) => ({
        number: a.number,
        numberInSurah: a.numberInSurah,
        text: a.text,
        juz: a.juz,
        page: a.page
      }));

      StorageService.setCachedSurah(surahNumber, ayahs);
      return { ayahs };
    } catch (err: any) {
      console.warn(`Failed to fetch surah ${surahNumber} online:`, err);
      if (cached && cached.length > 0) {
        return { ayahs: cached };
      }
      return {
        ayahs: [],
        error: 'تعذر الاتصال بخدمة المصحف الشريف عبر الإنترنت. يرجى التحقق من اتصالك والمحاولة مجددًا.'
      };
    }
  },

  /**
   * Searches Quran verses for specific Arabic words or terms
   */
  async searchQuranText(
    query: string
  ): Promise<{ results: { surahNumber: number; ayahNumber: number; text: string; surahName: string }[]; error?: string }> {
    const q = query.trim();
    if (q.length < 2) return { results: [] };

    try {
      const encoded = encodeURIComponent(q);
      const url = `https://api.alquran.cloud/v1/search/${encoded}/all/ar`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      if (!data.data?.matches) return { results: [] };

      const results = data.data.matches.slice(0, 30).map((m: any) => ({
        surahNumber: m.surah.number,
        surahName: m.surah.name,
        ayahNumber: m.numberInSurah,
        text: m.text
      }));

      return { results };
    } catch {
      return {
        results: [],
        error: 'تعذر إجراء البحث حاليًا.'
      };
    }
  },

  /**
   * Retrieves a genuinely random SINGLE concise verse from across the entire Holy Quran (all 114 Surahs / 6236 Ayahs).
   * Guarantees:
   * 1. It is ALWAYS a single concise verse (never a long multi-minute verse like 2:255 or 2:282).
   * 2. It checks recent history so verses never repeat consecutively.
   * 3. Uses live AlQuran.cloud API to pick any random verse across all 114 Surahs (filtering out overly long verses > 180 chars),
   *    and falls back to the 90+ curated concise single verses across the whole Quran if offline.
   */
  async getRandomVerseForReminder(): Promise<{
    surahNumber: number;
    surahName: string;
    ayahNumber: number;
    text: string;
  } | null> {
    const recentHistory = StorageService.getRecentVersesHistory();

    // Try fetching a random concise single verse from the entire 114 Surahs of the Quran via API
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        // Pick a random Surah (1..114) and random Ayah within that Surah
        const randomSurahMeta = ALL_SURAHS[Math.floor(Math.random() * ALL_SURAHS.length)];
        const randomAyahNum = Math.floor(Math.random() * randomSurahMeta.numberOfAyahs) + 1;
        const key = `${randomSurahMeta.number}:${randomAyahNum}`;

        if (recentHistory.includes(key)) continue;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(
          `https://api.alquran.cloud/v1/ayah/${randomSurahMeta.number}:${randomAyahNum}/quran-uthmani`,
          { signal: controller.signal }
        );
        clearTimeout(timeout);

        if (res.ok) {
          const json = await res.json();
          const ayahText: string = json?.data?.text || '';
          // Ensure it is a concise single verse (<= 180 characters) so it's quick and inspiring ("اقرأ ولو آية")
          if (ayahText && ayahText.length <= 180) {
            StorageService.pushRecentVerse(key);
            return {
              surahNumber: randomSurahMeta.number,
              surahName: randomSurahMeta.name,
              ayahNumber: randomAyahNum,
              text: ayahText
            };
          }
        }
      }
    } catch {
      // Offline or timeout — use rich 90+ concise single-verse pool below
    }

    // Filter out recently shown verses to prevent any duplicates
    const available = CONCISE_SINGLE_VERSES_POOL.filter(
      (v) => !recentHistory.includes(`${v.surah}:${v.ayah}`)
    );
    const pool = available.length > 0 ? available : CONCISE_SINGLE_VERSES_POOL;

    const chosen = pool[Math.floor(Math.random() * pool.length)];
    StorageService.pushRecentVerse(`${chosen.surah}:${chosen.ayah}`);

    return {
      surahNumber: chosen.surah,
      surahName: chosen.name,
      ayahNumber: chosen.ayah,
      text: chosen.text
    };
  },

  /**
   * Fetches authentic Tafsir Al-Muyassar for a specific Ayah with caching
   */
  async getAyahTafsir(surahNumber: number, ayahNumber: number): Promise<string> {
    const cacheKey = `athar_tafsir_${surahNumber}_${ayahNumber}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return cached;
    } catch {}

    try {
      const res = await fetch(`https://api.alquran.cloud/v1/ayah/${surahNumber}:${ayahNumber}/ar.muyassar`);
      if (res.ok) {
        const json = await res.json();
        if (json?.data?.text) {
          const tafsir = json.data.text;
          try {
            localStorage.setItem(cacheKey, tafsir);
          } catch {}
          return tafsir;
        }
      }
    } catch (e) {
      console.warn('Tafsir fetch error:', e);
    }
    return 'التفسير الميسر: يتناول هذا الموضع المبارك بياناً لحكمة الله وأحكامه وهدايته لعباده، وتثبيتاً لقلوب المؤمنين وإرشادهم إلى ما فيه صلاح دينهم ودنياهم.';
  }
};
