import { VERIFIED_RECITERS, ALL_SURAHS, getAyahAudioUrl, getFullSurahAudioUrl } from '../data/surahsData';
import { MORNING_ADHKAR, EVENING_ADHKAR, MORNING_FULL_AUDIO_URL, EVENING_FULL_AUDIO_URL } from '../data/adhkarData';
import { OfflineDatabase } from './offlineDatabase';

const OFFLINE_AUDIO_CACHE_NAME = 'athar-offline-audio-v1';

export interface AudioPackMeta {
  id: string;
  titleArabic: string;
  subtitleArabic: string;
  category: 'adhan' | 'adhkar' | 'quran_juz_amma' | 'quran_featured' | 'quran_custom';
  estimatedSizeLabel: string;
  urls: string[];
}

export const OFFLINE_AUDIO_PACKS: AudioPackMeta[] = [
  {
    id: 'pack_adhan_iqamah',
    titleArabic: 'حزمة أصوات الأذان والإقامة والتنبيهات',
    subtitleArabic: 'أذان مكة والمدينة والأقصى والعفاسي، دعاء الأذان، الإقامة، والصلاة على النبي ﷺ',
    category: 'adhan',
    estimatedSizeLabel: '١٤ ميجابايت',
    urls: [
      '/audio/adhan_alafasy.mp3',
      '/audio/adhan_makkah.mp3',
      '/audio/adhan_madinah.mp3',
      '/audio/adhan_alaqsa.mp3',
      '/audio/dua_after_adhan.mp3',
      '/audio/iqamah.mp3',
      '/audio/salawat.mp3',
      '/audio/wird.mp3'
    ]
  },
  {
    id: 'pack_adhkar_morning_evening',
    titleArabic: 'حزمة صوتيات أذكار الصباح والمساء كاملة',
    subtitleArabic: 'جميع أذكار الصباح والمساء بصوت الشيخ مشاري راشد العفاسي للتشغيل بدون إنترنت',
    category: 'adhkar',
    estimatedSizeLabel: '٢٢ ميجابايت',
    urls: Array.from(
      new Set([
        MORNING_FULL_AUDIO_URL,
        EVENING_FULL_AUDIO_URL,
        ...MORNING_ADHKAR.map((d) => d.audioUrl).filter(Boolean) as string[],
        ...EVENING_ADHKAR.map((d) => d.audioUrl).filter(Boolean) as string[]
      ])
    )
  },
  {
    id: 'pack_quran_featured',
    titleArabic: 'حزمة السور اليومية المباركة (الفاتحة، الكهف، يس، الملك، الواقعة، الرحمن)',
    subtitleArabic: 'تلاوة كاملة للسور الأكثر قراءة يومياً ويوم الجمعة وقبل النوم',
    category: 'quran_featured',
    estimatedSizeLabel: '٤٥ ميجابايت',
    urls: [] // Dynamically populated based on selected reciter
  },
  {
    id: 'pack_quran_juz_amma',
    titleArabic: 'حزمة جزء عمّ وقصار السور (من سورة النبأ إلى الناس)',
    subtitleArabic: 'تلاوات آيات وسور جزء عمّ كاملة للاستماع والحفظ بدون اتصال بالإنترنت',
    category: 'quran_juz_amma',
    estimatedSizeLabel: '٣٨ ميجابايت',
    urls: [] // Dynamically populated based on selected reciter
  }
];

class OfflineAudioPackServiceEngine {
  private memoryBlobUrls: Map<string, string> = new Map();

  public getPackUrlsForReciter(packId: string, reciterId: string = 'alafasy'): string[] {
    const reciter = VERIFIED_RECITERS.find((r) => r.id === reciterId) || VERIFIED_RECITERS[0];
    const surahServer = reciter.surahAudioServer || 'https://server8.mp3quran.net/afs';

    if (packId === 'pack_adhan_iqamah' || packId === 'pack_adhkar_morning_evening') {
      const pack = OFFLINE_AUDIO_PACKS.find((p) => p.id === packId);
      return pack ? pack.urls : [];
    }

    if (packId === 'pack_quran_featured') {
      const featuredSurahs = [1, 18, 36, 55, 56, 67, 112, 113, 114];
      const urls: string[] = [];
      for (const sNum of featuredSurahs) {
        urls.push(getFullSurahAudioUrl(surahServer, sNum));
        // Also include individual ayahs for short Surahs (Fatiha & Quls)
        if (sNum === 1 || sNum >= 112) {
          const meta = ALL_SURAHS.find((s) => s.number === sNum);
          const count = meta?.numberOfAyahs || 7;
          for (let a = 1; a <= count; a++) {
            urls.push(getAyahAudioUrl(reciter.audioServer, sNum, a));
          }
        }
      }
      return urls;
    }

    if (packId === 'pack_quran_juz_amma') {
      const urls: string[] = [];
      for (let sNum = 78; sNum <= 114; sNum++) {
        urls.push(getFullSurahAudioUrl(surahServer, sNum));
      }
      // Also include individual ayahs from Surah Ad-Duha (93) to An-Nas (114)
      for (let sNum = 93; sNum <= 114; sNum++) {
        const meta = ALL_SURAHS.find((s) => s.number === sNum);
        const count = meta?.numberOfAyahs || 5;
        for (let a = 1; a <= count; a++) {
          urls.push(getAyahAudioUrl(reciter.audioServer, sNum, a));
        }
      }
      return urls;
    }

    return [];
  }

  /**
   * Checks if a pack is already marked as downloaded in the local database
   */
  public async isPackDownloaded(packId: string, reciterId: string = 'alafasy'): Promise<boolean> {
    const key = packId.startsWith('pack_quran') ? `${packId}_${reciterId}` : packId;
    const record = await OfflineDatabase.getRecord<{ id: string; downloaded: boolean }>('sync_metadata', key);
    return Boolean(record?.downloaded);
  }

  /**
   * Downloads all audio files in a pack and stores them in both CacheStorage and IndexedDB
   * so they play 100% offline with zero network connection.
   */
  public async downloadAudioPack(
    packId: string,
    reciterId: string = 'alafasy',
    onProgress?: (percent: number, currentFileIndex: number, totalFiles: number) => void
  ): Promise<{ success: boolean; downloadedCount: number; totalCount: number }> {
    const urls = this.getPackUrlsForReciter(packId, reciterId);
    if (urls.length === 0) {
      return { success: false, downloadedCount: 0, totalCount: 0 };
    }

    let downloadedCount = 0;
    const hasCacheApi = typeof window !== 'undefined' && 'caches' in window;
    const cache = hasCacheApi ? await window.caches.open(OFFLINE_AUDIO_CACHE_NAME) : null;

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      try {
        // Check if already cached
        if (cache) {
          const existing = await cache.match(url);
          if (existing) {
            downloadedCount++;
            onProgress?.(Math.round(((i + 1) / urls.length) * 100), i + 1, urls.length);
            continue;
          }
        }

        const res = await fetch(url, { mode: 'cors' }).catch(() => fetch(url));
        if (res && res.ok) {
          if (cache) {
            await cache.put(url, res.clone());
          }
          const blob = await res.blob();
          await OfflineDatabase.putRecord('offline_audio_blobs', {
            id: url,
            packId,
            reciterId,
            size: blob.size,
            mimeType: blob.type || 'audio/mpeg',
            blob,
            updatedAt: Date.now()
          });
          downloadedCount++;
        }
      } catch (e) {
        console.warn('Skipped audio file during pack download:', url, e);
      }

      const pct = Math.round(((i + 1) / urls.length) * 100);
      onProgress?.(pct, i + 1, urls.length);
    }

    const key = packId.startsWith('pack_quran') ? `${packId}_${reciterId}` : packId;
    if (downloadedCount > 0) {
      await OfflineDatabase.putRecord('sync_metadata', {
        id: key,
        downloaded: true,
        downloadedCount,
        totalCount: urls.length,
        timestamp: Date.now()
      });
    }

    return {
      success: downloadedCount > 0,
      downloadedCount,
      totalCount: urls.length
    };
  }

  /**
   * Downloads a single specific Surah's audio (full Surah + all individual Ayahs) for offline playback
   */
  public async downloadSingleSurahAudio(
    surahNumber: number,
    reciterId: string = 'alafasy',
    onProgress?: (percent: number) => void
  ): Promise<boolean> {
    const reciter = VERIFIED_RECITERS.find((r) => r.id === reciterId) || VERIFIED_RECITERS[0];
    const surahMeta = ALL_SURAHS.find((s) => s.number === surahNumber);
    if (!surahMeta) return false;

    const urls: string[] = [];
    const surahServer = reciter.surahAudioServer || 'https://server8.mp3quran.net/afs';
    urls.push(getFullSurahAudioUrl(surahServer, surahNumber));

    for (let a = 1; a <= surahMeta.numberOfAyahs; a++) {
      urls.push(getAyahAudioUrl(reciter.audioServer, surahNumber, a));
    }

    const hasCacheApi = typeof window !== 'undefined' && 'caches' in window;
    const cache = hasCacheApi ? await window.caches.open(OFFLINE_AUDIO_CACHE_NAME) : null;
    let successCount = 0;

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      try {
        if (cache) {
          const existing = await cache.match(url);
          if (existing) {
            successCount++;
            onProgress?.(Math.round(((i + 1) / urls.length) * 100));
            continue;
          }
        }
        const res = await fetch(url);
        if (res && res.ok) {
          if (cache) await cache.put(url, res.clone());
          const blob = await res.blob();
          await OfflineDatabase.putRecord('offline_audio_blobs', {
            id: url,
            packId: `surah_${surahNumber}`,
            reciterId,
            size: blob.size,
            mimeType: blob.type || 'audio/mpeg',
            blob,
            updatedAt: Date.now()
          });
          successCount++;
        }
      } catch {}
      onProgress?.(Math.round(((i + 1) / urls.length) * 100));
    }

    if (successCount > 0) {
      await OfflineDatabase.putRecord('sync_metadata', {
        id: `offline_surah_audio_${surahNumber}_${reciterId}`,
        downloaded: true,
        timestamp: Date.now()
      });
    }
    return successCount > 0;
  }

  public async isSurahAudioDownloaded(surahNumber: number, reciterId: string = 'alafasy'): Promise<boolean> {
    const rec = await OfflineDatabase.getRecord<{ id: string; downloaded: boolean }>(
      'sync_metadata',
      `offline_surah_audio_${surahNumber}_${reciterId}`
    );
    return Boolean(rec?.downloaded);
  }

  /**
   * Resolves a remote or local audio URL to a local offline Blob ObjectURL if stored in CacheStorage or IndexedDB,
   * allowing HTMLAudioElement to play 100% offline without any network access.
   */
  public async resolvePlayableAudioUrl(originalUrl: string): Promise<string> {
    if (!originalUrl) return originalUrl;

    // Fast-path: local bundled static assets (e.g., /audio/adhan_alafasy.mp3, public/audio/...)
    if (originalUrl.startsWith('/audio/')) {
      return originalUrl;
    }
    if (originalUrl.startsWith('public/audio/')) {
      return '/' + originalUrl.substring(7);
    }
    if (originalUrl.startsWith('./audio/')) {
      return originalUrl.substring(1);
    }
    if (originalUrl.includes('adhan_alafasy.mp3')) return '/audio/adhan_alafasy.mp3';
    if (originalUrl.includes('adhan_fajr_alafasy.mp3')) return '/audio/adhan_fajr_alafasy.mp3';
    if (originalUrl.includes('adhan_makkah.mp3')) return '/audio/adhan_makkah.mp3';
    if (originalUrl.includes('adhan_madinah.mp3')) return '/audio/adhan_madinah.mp3';
    if (originalUrl.includes('adhan_alaqsa.mp3')) return '/audio/adhan_alaqsa.mp3';
    if (originalUrl.includes('dua_after_adhan.mp3')) return '/audio/dua_after_adhan.mp3';
    if (originalUrl.includes('iqamah.mp3')) return '/audio/iqamah.mp3';
    if (originalUrl.includes('salawat.mp3')) return '/audio/salawat.mp3';
    if (originalUrl.includes('parents.mp3')) return '/audio/parents.mp3';
    if (originalUrl.includes('wird.mp3')) return '/audio/wird.mp3';

    // 1. Check in-memory active object URL cache (0ms instant)
    const existingObjUrl = this.memoryBlobUrls.get(originalUrl);
    if (existingObjUrl) return existingObjUrl;

    // 2. When online, return remote URL immediately to start native streaming instantly without stalling on IndexedDB!
    // (The browser will use HTTP cache/ServiceWorker transparently)
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      return originalUrl;
    }

    // 3. When offline: query IndexedDB offline_audio_blobs store
    try {
      const dbRecord = await OfflineDatabase.getRecord<{ id: string; blob?: Blob }>('offline_audio_blobs', originalUrl);
      if (dbRecord?.blob instanceof Blob && dbRecord.blob.size > 0) {
        const objUrl = URL.createObjectURL(dbRecord.blob);
        this.memoryBlobUrls.set(originalUrl, objUrl);
        return objUrl;
      }
    } catch {}

    // 4. When offline: query CacheStorage
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await window.caches.open(OFFLINE_AUDIO_CACHE_NAME);
        const matched = await cache.match(originalUrl);
        if (matched) {
          const blob = await matched.blob();
          if (blob.size > 0) {
            const objUrl = URL.createObjectURL(blob);
            this.memoryBlobUrls.set(originalUrl, objUrl);
            return objUrl;
          }
        }
      } catch {}
    }

    return originalUrl;
  }
}

export const OfflineAudioPackService = new OfflineAudioPackServiceEngine();
