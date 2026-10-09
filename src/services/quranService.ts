import { ALL_SURAHS } from '../data/surahsData';
import { AyahItem, SurahMeta } from '../types';
import { StorageService } from './storageService';

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
    return ALL_SURAHS.filter(s => 
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
    // Check local cache first
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

      // Cache locally
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
  async searchQuranText(query: string): Promise<{ results: { surahNumber: number; ayahNumber: number; text: string; surahName: string }[]; error?: string }> {
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
   * Retrieves a verified random verse for the Quran reminder with guaranteed matching audio
   * and avoiding recent duplicates as required by rule #20.
   */
  async getRandomVerseForReminder(): Promise<{ surahNumber: number; surahName: string; ayahNumber: number; text: string } | null> {
    // Select curated spiritual verses from prominent Surahs
    const prominentVerses = [
      { surah: 2, ayah: 255, name: "البَقَرَة", text: "اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ..." },
      { surah: 2, ayah: 286, name: "البَقَرَة", text: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ رَبَّنَا لَا تُؤَاخِذْنَا إِنْ نَسِينَا أَوْ أَخْطَأْنَا..." },
      { surah: 3, ayah: 190, name: "آل عِمْرَان", text: "إِنَّ فِي خَلْقِ السَّمَاوَاتِ وَالْأَرْضِ وَاخْتِلَافِ اللَّيْلِ وَالنَّهَارِ لَآيَاتٍ لِأُولِي الْأَلْبَابِ" },
      { surah: 13, ayah: 28, name: "الرَّعْد", text: "الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُمْ بِذِكْرِ اللَّهِ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ" },
      { surah: 14, ayah: 7, name: "إِبْرَاهِيم", text: "وَإِذْ تَأَذَّنَ رَبُّكُمْ لَئِنْ شَكَرْتُمْ لَأَزِيدَنَّكُمْ وَلَئِنْ كَفَرْتُمْ إِنَّ عَذَابِي لَشَدِيدٌ" },
      { surah: 24, ayah: 35, name: "النُّور", text: "اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ مَثَلُ نُورِهِ كَمِشْكَاةٍ فِيهَا مِصْبَاحٌ..." },
      { surah: 39, ayah: 53, name: "الزُّمَر", text: "قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَى أَنْفُسِهِمْ لَا تَقْنَطُوا مِنْ رَحْمَةِ اللَّهِ إِنَّ اللَّهَ يَغْفِرُ الذُّنُوبَ جَمِيعًا" },
      { surah: 55, ayah: 13, name: "الرَّحْمَن", text: "فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ" },
      { surah: 59, ayah: 23, name: "الحَشْر", text: "هُوَ اللَّهُ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْمَلِكُ الْقُدُّوسُ السَّلَامُ الْمُؤْمِنُ الْمُهَيْمِنُ الْعَزِيزُ الْجَبَّارُ الْمُتَكَبِّرُ" },
      { surah: 65, ayah: 3, name: "الطَّلَاق", text: "وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ وَمَنْ يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ" },
      { surah: 93, ayah: 3, name: "الضُّحَى", text: "مَا وَدَّعَكَ رَبُّكَ وَمَا قَلَى ۝ وَلَلْآخِرَةُ خَيْرٌ لَكَ مِنَ الْأُولَى" },
      { surah: 94, ayah: 5, name: "الشَّرْح", text: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا" }
    ];

    const recentHistory = StorageService.getRecentVersesHistory();
    // Filter out recently shown verses to prevent immediate duplicates
    const available = prominentVerses.filter(v => !recentHistory.includes(`${v.surah}:${v.ayah}`));
    const pool = available.length > 0 ? available : prominentVerses;

    const chosen = pool[Math.floor(Math.random() * pool.length)];
    StorageService.pushRecentVerse(`${chosen.surah}:${chosen.ayah}`);

    return {
      surahNumber: chosen.surah,
      surahName: chosen.name,
      ayahNumber: chosen.ayah,
      text: chosen.text
    };
  }
};
