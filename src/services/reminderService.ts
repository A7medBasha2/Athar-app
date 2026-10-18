import { ObligatoryPrayerId } from '../types';
import { StorageService } from './storageService';
import { AudioService } from './audioService';
import { QuranService } from './quranService';
import { VERIFIED_RECITERS, getAyahAudioUrl } from '../data/surahsData';
import { VERIFIED_DHIKR_REMINDERS } from '../data/dhikrRemindersData';

export interface ActiveAdhanState {
  prayerId: ObligatoryPrayerId;
  prayerName: string;
  prayerTime12: string;
  voice: 'alafasy' | 'makkah' | 'madinah' | 'alaqsa';
  mode: 'full' | 'first_two_takbeers';
  startTimeMs: number;
  durationSeconds: number;
  isMuted: boolean;
  isPlaying: boolean;
  isFajr: boolean;
  sceneImage: string;
}

type AdhanListener = (state: ActiveAdhanState | null) => void;

class ReminderEngineClass {
  private adhanListeners: Set<AdhanListener> = new Set();

  public start(): void {
    // Automatic recurring adhan and alerts have been disabled per user specifications
  }

  public stop(): void {
    // Clean up
  }

  public restart(): void {
    this.stop();
    this.start();
  }

  public hasActiveAdhanScreen(): boolean {
    return false;
  }

  public getActiveAdhanState(): ActiveAdhanState | null {
    return null;
  }

  public subscribeAdhanScreen(callback: (state: ActiveAdhanState | null) => void): () => void {
    this.adhanListeners.add(callback);
    try {
      callback(null);
    } catch {}
    return () => {
      this.adhanListeners.delete(callback);
    };
  }

  public subscribe(callback: (state: ActiveAdhanState | null) => void): () => void {
    return this.subscribeAdhanScreen(callback);
  }

  public subscribeAdhan(callback: (state: ActiveAdhanState | null) => void): () => void {
    return this.subscribeAdhanScreen(callback);
  }

  public launchFullScreenAdhan(_options?: any): void {
    // Full screen adhan modal has been removed
  }

  public dismissFullScreenAdhan(): void {
    // No-op
  }

  public updateActiveAdhanVoice(_voice: string): void {
    // No-op
  }

  public muteAdhanAndKeepScreenOpen(): void {
    // No-op
  }

  public toggleAdhanAudioLive(): boolean {
    return false;
  }

  public toggleAdhanPlayPause(): void {
    // No-op
  }

  public getPrayerArabicName(pId: ObligatoryPrayerId): string {
    switch (pId) {
      case 'fajr': return 'صلاة الفجر';
      case 'dhuhr': return 'صلاة الظهر';
      case 'asr': return 'صلاة العصر';
      case 'maghrib': return 'صلاة المغرب';
      case 'isha': return 'صلاة العشاء';
      default: return 'الصلاة';
    }
  }

  public async testQuranVerseReminder(): Promise<void> {
    try {
      const verse = await QuranService.getRandomVerseForReminder();
      const settings = StorageService.getSettings();
      const reciterId = settings.quranVerseReminder?.reciterId || settings.selectedReciterId || 'alafasy';
      const reciter = VERIFIED_RECITERS.find((r) => r.id === reciterId) || VERIFIED_RECITERS[0];
      const surahNum = verse?.surahNumber || 1;
      const ayahNum = verse?.ayahNumber || 2;
      const audioUrl = getAyahAudioUrl(reciter.audioServer, surahNum, ayahNum);

      AudioService.playUrl(audioUrl, 'reminder_verse', {
        title: `سورة ${verse?.surahName || 'الفاتحة'} • الآية ${ayahNum}`,
        subtitle: `تلاوة ${reciter.nameArabic}`,
      }).catch(() => {
        const fallbackUrl = getAyahAudioUrl('https://everyayah.com/data/Alafasy_128kbps', surahNum, ayahNum);
        AudioService.playUrl(fallbackUrl, 'reminder_verse', {
          title: `سورة ${verse?.surahName || 'الفاتحة'} • الآية ${ayahNum}`,
          subtitle: 'تلاوة الشيخ مشاري العفاسي',
        }).catch(() => {});
      });
    } catch {}
  }

  public testSalawatReminder(): void {
    try {
      const settings = StorageService.getSettings();
      const enabledIds = settings.salawatReminder?.enabledDhikrIds || StorageService.getEnabledDhikrAlertIds();
      let pool = VERIFIED_DHIKR_REMINDERS.filter((d) => enabledIds.includes(d.id));
      if (pool.length === 0) pool = VERIFIED_DHIKR_REMINDERS;
      const pick = pool[Math.floor(Math.random() * pool.length)];

      AudioService.playUrl(pick.audioUrl, 'reminder_salawat', {
        title: pick.title,
        subtitle: pick.categoryLabel,
      }).catch(() => {
        AudioService.playUrl('/audio/salawat.mp3', 'reminder_salawat', {
          title: 'الصلاة على النبي ﷺ',
          subtitle: 'اللهم صل وسلم على نبينا محمد',
        }).catch(() => {});
      });
    } catch {}
  }

  public testParentsReminder(): void {
    AudioService.playUrl('/audio/parents.mp3', 'reminder_parents', {
      title: 'بر الوالدين',
      subtitle: 'وقل رب ارحمهما كما ربياني صغيرا',
    }).catch(() => {});
  }

  public testDhikrReminder(_id?: string): void {
    AudioService.playUrl('/audio/dhikr_sample.mp3', 'reminder_dhikr', {
      title: 'تذكير بالذكر',
      subtitle: 'سبحان الله وبحمده',
    }).catch(() => {});
  }

  public testDailyWirdReminder(): void {
    AudioService.playUrl('/audio/wird.mp3', 'reminder_wird', {
      title: 'ورد اليوم',
      subtitle: 'تذكير الورد اليومي',
    }).catch(() => {});
  }

  public getState() {
    return {
      activeAdhan: null,
      activeOverlay: null,
    };
  }
}

export const ReminderEngine = new ReminderEngineClass();
