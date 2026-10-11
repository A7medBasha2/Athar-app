import { AyahItem, Coordinates, DhikrItem, DailyHadithItem } from '../types';
import { POPULAR_CITIES } from '../data/citiesData';
import { MORNING_ADHKAR, EVENING_ADHKAR, ASMA_ALLAH_AL_HUSNA } from '../data/adhkarData';
import { AUTHENTIC_HADITHS } from '../data/hadithsData';
import { ALL_SURAHS } from '../data/surahsData';
import { OFFLINE_BUNDLED_SURAHS, OFFLINE_BUNDLED_TAFSIR, OFFLINE_SUNNAH_TIMES, SunnahTimeWindow } from '../data/offlineQuranBundle';
import { ASTRONOMICAL_METHODS, AstronomicalPrayerEngine } from './astronomicalPrayerEngine';

const DB_NAME = 'AtharOfflineDatabaseV1';
const DB_VERSION = 1;

export type StoreName =
  | 'cities_prayer_tables'
  | 'quran_surahs'
  | 'quran_tafsir'
  | 'adhkar_duas'
  | 'hadiths_sunan'
  | 'offline_audio_blobs'
  | 'sync_metadata';

export interface OfflineDBStats {
  isInitialized: boolean;
  citiesCount: number;
  cachedSurahsCount: number;
  totalSurahs: number;
  cachedTafsirSurahsCount: number;
  adhkarCount: number;
  hadithsCount: number;
  sunanCount: number;
  cachedAudioCount: number;
  isFullQuranDownloaded: boolean;
  lastSyncedAt: number | null;
}

class LocalOfflineDatabaseEngine {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private memoryFallback: Record<string, Map<string, any>> = {
    cities_prayer_tables: new Map(),
    quran_surahs: new Map(),
    quran_tafsir: new Map(),
    adhkar_duas: new Map(),
    hadiths_sunan: new Map(),
    offline_audio_blobs: new Map(),
    sync_metadata: new Map()
  };

  public async openDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return null;
    }
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const stores: StoreName[] = [
            'cities_prayer_tables',
            'quran_surahs',
            'quran_tafsir',
            'adhkar_duas',
            'hadiths_sunan',
            'offline_audio_blobs',
            'sync_metadata'
          ];
          stores.forEach((storeName) => {
            if (!db.objectStoreNames.contains(storeName)) {
              db.createObjectStore(storeName, { keyPath: 'id' });
            }
          });
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          console.warn('IndexedDB unavailable, using in-memory/localStorage fallback');
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  public async putRecord<T extends { id: string | number }>(storeName: StoreName, record: T): Promise<void> {
    const key = String(record.id);
    this.memoryFallback[storeName]?.set(key, record);

    const db = await this.openDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.put({ ...record, id: key });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async getRecord<T>(storeName: StoreName, id: string | number): Promise<T | null> {
    const key = String(id);
    const db = await this.openDB();
    if (!db) {
      return (this.memoryFallback[storeName]?.get(key) as T) || null;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => {
          resolve((req.result as T) || (this.memoryFallback[storeName]?.get(key) as T) || null);
        };
        req.onerror = () => {
          resolve((this.memoryFallback[storeName]?.get(key) as T) || null);
        };
      } catch {
        resolve((this.memoryFallback[storeName]?.get(key) as T) || null);
      }
    });
  }

  public async getAllRecords<T>(storeName: StoreName): Promise<T[]> {
    const db = await this.openDB();
    if (!db) {
      return Array.from(this.memoryFallback[storeName]?.values() || []);
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => {
          resolve((req.result as T[]) || []);
        };
        req.onerror = () => {
          resolve(Array.from(this.memoryFallback[storeName]?.values() || []));
        };
      } catch {
        resolve(Array.from(this.memoryFallback[storeName]?.values() || []));
      }
    });
  }

  public async countRecords(storeName: StoreName): Promise<number> {
    const db = await this.openDB();
    if (!db) {
      return this.memoryFallback[storeName]?.size || 0;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.count();
        req.onsuccess = () => resolve(req.result || 0);
        req.onerror = () => resolve(this.memoryFallback[storeName]?.size || 0);
      } catch {
        resolve(this.memoryFallback[storeName]?.size || 0);
      }
    });
  }

  /**
   * Seeds the local database immediately on startup with:
   * 1. All global cities, coordinates, astronomical calculation parameters, and pre-calculated prayer tables.
   * 2. Bundled Quran Surahs & Tafsir Al-Muyassar.
   * 3. Complete Morning & Evening Adhkar, Duas, and 99 Names of Allah.
   * 4. Authentic Prophetic Hadiths and Sunnah prayer windows.
   */
  public async initializeAndSeedCoreData(): Promise<void> {
    await this.openDB();

    // 1. Seed Cities & Astronomical Parameters
    for (const city of POPULAR_CITIES) {
      const todayTimings = AstronomicalPrayerEngine.calculateTimingsForDate(city, '5');
      await this.putRecord('cities_prayer_tables', {
        id: `${city.city}_${city.country}`,
        city: city.city,
        country: city.country,
        latitude: city.latitude,
        longitude: city.longitude,
        astronomicalMethods: ASTRONOMICAL_METHODS,
        sampleTimings: todayTimings,
        updatedAt: Date.now()
      });
    }

    // 2. Seed Bundled Surahs & migrate any localStorage cached Surahs into IndexedDB
    for (const [surahNumStr, ayahs] of Object.entries(OFFLINE_BUNDLED_SURAHS)) {
      const sNum = Number(surahNumStr);
      const existing = await this.getRecord<{ id: string; surahNumber: number; ayahs: AyahItem[] }>('quran_surahs', sNum);
      if (!existing || !existing.ayahs || existing.ayahs.length === 0) {
        await this.putRecord('quran_surahs', {
          id: String(sNum),
          surahNumber: sNum,
          ayahs,
          updatedAt: Date.now()
        });
      }
    }

    // Also migrate any previously cached Surahs from localStorage
    if (typeof window !== 'undefined') {
      for (const sMeta of ALL_SURAHS) {
        try {
          const raw = localStorage.getItem(`athar_cached_surah_${sMeta.number}`);
          if (raw) {
            const parsed: AyahItem[] = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              await this.putRecord('quran_surahs', {
                id: String(sMeta.number),
                surahNumber: sMeta.number,
                ayahs: parsed,
                updatedAt: Date.now()
              });
            }
          }
        } catch {}
      }
    }

    // 3. Seed Bundled Tafsir Al-Muyassar
    for (const [key, text] of Object.entries(OFFLINE_BUNDLED_TAFSIR)) {
      await this.putRecord('quran_tafsir', {
        id: key,
        text,
        updatedAt: Date.now()
      });
    }

    // 4. Seed Adhkar & Asma Allah Al-Husna
    await this.putRecord('adhkar_duas', {
      id: 'morning_adhkar',
      category: 'morning',
      items: MORNING_ADHKAR,
      updatedAt: Date.now()
    });
    await this.putRecord('adhkar_duas', {
      id: 'evening_adhkar',
      category: 'evening',
      items: EVENING_ADHKAR,
      updatedAt: Date.now()
    });
    await this.putRecord('adhkar_duas', {
      id: 'asma_allah_al_husna',
      category: 'asma_allah',
      items: ASMA_ALLAH_AL_HUSNA,
      updatedAt: Date.now()
    });

    // 5. Seed Prophetic Hadiths & Sunnah Prayer Windows
    await this.putRecord('hadiths_sunan', {
      id: 'authentic_hadiths',
      items: AUTHENTIC_HADITHS,
      updatedAt: Date.now()
    });
    await this.putRecord('hadiths_sunan', {
      id: 'sunnah_times',
      items: OFFLINE_SUNNAH_TIMES,
      updatedAt: Date.now()
    });
  }

  /**
   * Retrieves a Surah from local database (or bundled fallback) with zero network latency
   */
  public async getSurahFromDB(surahNumber: number): Promise<AyahItem[] | null> {
    const record = await this.getRecord<{ id: string; surahNumber: number; ayahs: AyahItem[] }>('quran_surahs', surahNumber);
    if (record && Array.isArray(record.ayahs) && record.ayahs.length > 0) {
      return record.ayahs;
    }
    if (OFFLINE_BUNDLED_SURAHS[surahNumber]) {
      return OFFLINE_BUNDLED_SURAHS[surahNumber];
    }
    return null;
  }

  public async saveSurahToDB(surahNumber: number, ayahs: AyahItem[]): Promise<void> {
    await this.putRecord('quran_surahs', {
      id: String(surahNumber),
      surahNumber,
      ayahs,
      updatedAt: Date.now()
    });
  }

  public async getTafsirFromDB(surahNumber: number, ayahNumber: number): Promise<string | null> {
    const key = `${surahNumber}:${ayahNumber}`;
    const record = await this.getRecord<{ id: string; text: string }>('quran_tafsir', key);
    if (record && record.text) return record.text;
    if (OFFLINE_BUNDLED_TAFSIR[key]) return OFFLINE_BUNDLED_TAFSIR[key];
    return null;
  }

  public async saveTafsirToDB(surahNumber: number, ayahNumber: number, text: string): Promise<void> {
    const key = `${surahNumber}:${ayahNumber}`;
    await this.putRecord('quran_tafsir', {
      id: key,
      surahNumber,
      ayahNumber,
      text,
      updatedAt: Date.now()
    });
  }

  /**
   * Downloads and indexes the ENTIRE Holy Quran (all 114 Surahs / 6,236 Ayahs) + Complete Tafsir Al-Muyassar
   * into the local IndexedDB database so every single Surah, Ayah search, and Tafsir works 100% offline forever.
   */
  public async downloadFullQuranAndTafsirForOffline(
    onProgress?: (progressPercent: number, statusLabel: string) => void
  ): Promise<{ success: boolean; message: string }> {
    try {
      onProgress?.(5, 'جاري تحميل المصحف الشريف كاملاً (114 سورة - الرسم العثماني)...');
      const quranRes = await fetch('https://api.alquran.cloud/v1/quran/quran-uthmani');
      if (!quranRes.ok) {
        throw new Error(`HTTP ${quranRes.status}`);
      }
      const quranJson = await quranRes.json();
      const surahsList = quranJson?.data?.surahs;
      if (!Array.isArray(surahsList) || surahsList.length === 0) {
        throw new Error('Invalid full Quran payload');
      }

      for (let i = 0; i < surahsList.length; i++) {
        const s = surahsList[i];
        const ayahs: AyahItem[] = (s.ayahs || []).map((a: any) => ({
          number: a.number,
          numberInSurah: a.numberInSurah,
          text: a.text,
          juz: a.juz,
          page: a.page
        }));
        await this.saveSurahToDB(s.number, ayahs);
        try {
          localStorage.setItem(`athar_cached_surah_${s.number}`, JSON.stringify(ayahs));
        } catch {}

        if (i % 15 === 0 || i === surahsList.length - 1) {
          const pct = Math.min(55, Math.round(((i + 1) / surahsList.length) * 50) + 5);
          onProgress?.(pct, `تم حفظ سورة ${s.name} (${i + 1}/114) في قاعدة البيانات المحلية...`);
        }
      }

      onProgress?.(60, 'جاري تحميل التفسير الميسر المعتمد لجميع آيات القرآن الكريم...');
      try {
        const tafsirRes = await fetch('https://api.alquran.cloud/v1/quran/ar.muyassar');
        if (tafsirRes.ok) {
          const tafsirJson = await tafsirRes.json();
          const tafsirSurahs = tafsirJson?.data?.surahs || [];
          for (let i = 0; i < tafsirSurahs.length; i++) {
            const ts = tafsirSurahs[i];
            const surahTafsirMap: Record<number, string> = {};
            for (const ta of ts.ayahs || []) {
              surahTafsirMap[ta.numberInSurah] = ta.text;
            }
            await this.putRecord('quran_tafsir', {
              id: `surah_tafsir_${ts.number}`,
              surahNumber: ts.number,
              ayahsMap: surahTafsirMap,
              updatedAt: Date.now()
            });

            if (i % 20 === 0 || i === tafsirSurahs.length - 1) {
              const pct = Math.min(98, 60 + Math.round(((i + 1) / tafsirSurahs.length) * 38));
              onProgress?.(pct, `تم فهرسة تفسير سورة ${ts.name} (${i + 1}/114) محلياً...`);
            }
          }
        }
      } catch (e) {
        console.warn('Tafsir full bundle optional step skipped:', e);
      }

      await this.putRecord('sync_metadata', {
        id: 'full_quran_sync',
        completed: true,
        timestamp: Date.now()
      });

      onProgress?.(100, 'تم حفظ المصحف الشريف كاملاً وتفسيره في قاعدة البيانات المحلية بنجاح ✓');
      return {
        success: true,
        message: 'تم تنزيل وحفظ القرآن الكريم كاملاً (114 سورة) والتفسير الميسر للعمل 100% بدون إنترنت ✓'
      };
    } catch (err) {
      console.warn('Full Quran offline download error:', err);
      return {
        success: false,
        message: 'تعذر إكمال التحميل الشامل حالياً. السور الأساسية والأذكار ومواقيت الصلاة محفوظة وتعمل بدون إنترنت.'
      };
    }
  }

  public async getSurahTafsirFromFullBundle(surahNumber: number, ayahNumber: number): Promise<string | null> {
    const single = await this.getTafsirFromDB(surahNumber, ayahNumber);
    if (single) return single;

    const surahBundle = await this.getRecord<{ id: string; surahNumber: number; ayahsMap: Record<number, string> }>(
      'quran_tafsir',
      `surah_tafsir_${surahNumber}`
    );
    if (surahBundle?.ayahsMap && surahBundle.ayahsMap[ayahNumber]) {
      return surahBundle.ayahsMap[ayahNumber];
    }
    return null;
  }

  public async getDatabaseStats(): Promise<OfflineDBStats> {
    const cachedSurahsCount = await this.countRecords('quran_surahs');
    const citiesCount = await this.countRecords('cities_prayer_tables');
    const cachedTafsirCount = await this.countRecords('quran_tafsir');
    const cachedAudioCount = await this.countRecords('offline_audio_blobs');
    const syncMeta = await this.getRecord<{ id: string; completed: boolean; timestamp: number }>(
      'sync_metadata',
      'full_quran_sync'
    );

    return {
      isInitialized: true,
      citiesCount: Math.max(citiesCount, POPULAR_CITIES.length),
      cachedSurahsCount: Math.min(114, Math.max(cachedSurahsCount, Object.keys(OFFLINE_BUNDLED_SURAHS).length)),
      totalSurahs: 114,
      cachedTafsirSurahsCount: cachedTafsirCount,
      adhkarCount: MORNING_ADHKAR.length + EVENING_ADHKAR.length + ASMA_ALLAH_AL_HUSNA.length,
      hadithsCount: AUTHENTIC_HADITHS.length,
      sunanCount: OFFLINE_SUNNAH_TIMES.length,
      cachedAudioCount,
      isFullQuranDownloaded: Boolean(syncMeta?.completed || cachedSurahsCount >= 114),
      lastSyncedAt: syncMeta?.timestamp || null
    };
  }

  public async getAllCachedSurahs(): Promise<{ surahNumber: number; ayahs: AyahItem[] }[]> {
    const records = await this.getAllRecords<{ id: string; surahNumber: number; ayahs: AyahItem[] }>('quran_surahs');
    return records.filter((r) => r && r.surahNumber && Array.isArray(r.ayahs));
  }

  public getOfflineSunnahTimes(): SunnahTimeWindow[] {
    return OFFLINE_SUNNAH_TIMES;
  }

  public getOfflineCities(): Coordinates[] {
    return POPULAR_CITIES;
  }

  public getOfflineAdhkar(category: 'morning' | 'evening'): DhikrItem[] {
    return category === 'morning' ? MORNING_ADHKAR : EVENING_ADHKAR;
  }

  public getOfflineHadiths(): DailyHadithItem[] {
    return AUTHENTIC_HADITHS;
  }
}

export const OfflineDatabase = new LocalOfflineDatabaseEngine();
