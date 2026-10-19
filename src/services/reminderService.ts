import { ObligatoryPrayerId } from '../types';
import { StorageService } from './storageService';
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
  private intervalTimer: any = null;

  public start(): void {
    if (this.intervalTimer) return;
    // Check every 60 seconds if any of the 4 royal floating reminders are due
    this.intervalTimer = setInterval(() => {
      this.evaluatePeriodicReminders();
    }, 60000);
  }

  public stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  public restart(): void {
    this.stop();
    this.start();
  }

  private parseFrequencyMinutes(freq?: string): number {
    switch (freq) {
      case '1m': return 1;
      case '30m': return 30;
      case '1h': return 60;
      case '2h': return 120;
      case '3h': return 180;
      case '4h': return 240;
      case '6h': return 360;
      case '12h': return 720;
      case 'daily': return 1440;
      default: return 120;
    }
  }

  private evaluatePeriodicReminders(): void {
    try {
      const settings = StorageService.getSettings();
      const now = Date.now();

      // 1. اقرأ ولو آية (آية واحدة عشوائية)
      if (settings.quranVerseReminder?.enabled) {
        const intervalMs = this.parseFrequencyMinutes(settings.quranVerseReminder.frequency) * 60 * 1000;
        const lastAyah = Number(localStorage.getItem('athar_last_ayah_reminder_ts') || '0');
        if (now - lastAyah >= intervalMs) {
          localStorage.setItem('athar_last_ayah_reminder_ts', String(now));
          this.triggerQuranVerseReminder(true, true);
        }
      }

      // 2. ذكر الله والصلاة على النبي ﷺ
      if (settings.salawatReminder?.enabled) {
        const intervalMs = this.parseFrequencyMinutes(settings.salawatReminder.frequency) * 60 * 1000;
        const lastSalawat = Number(localStorage.getItem('athar_last_salawat_reminder_ts') || '0');
        if (now - lastSalawat >= intervalMs) {
          localStorage.setItem('athar_last_salawat_reminder_ts', String(now));
          this.testSalawatReminder();
        }
      }

      // 3. الورد اليومي
      if (settings.dailyWirdReminder?.enabled) {
        const intervalMs = this.parseFrequencyMinutes(settings.dailyWirdReminder.frequency) * 60 * 1000;
        const lastWird = Number(localStorage.getItem('athar_last_wird_reminder_ts') || '0');
        if (now - lastWird >= intervalMs) {
          localStorage.setItem('athar_last_wird_reminder_ts', String(now));
          this.testDailyWirdReminder();
        }
      }

      // 4. بر الوالدين
      if (settings.parentsReminder?.enabled) {
        const intervalMs = this.parseFrequencyMinutes(settings.parentsReminder.frequency) * 60 * 1000;
        const lastParents = Number(localStorage.getItem('athar_last_parents_reminder_ts') || '0');
        if (now - lastParents >= intervalMs) {
          localStorage.setItem('athar_last_parents_reminder_ts', String(now));
          this.testParentsReminder();
        }
      }
    } catch (e) {
      console.warn('[ReminderEngine] Error evaluating periodic reminders:', e);
    }
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

  /**
   * Triggers the Royal Floating Alert for "اقرأ ولو آية"
   * Brings genuinely ONE random Ayah from the Holy Quran with its recitation and Tafsir
   */
  public async triggerQuranVerseReminder(showFloating = true, playSound = true): Promise<void> {
    try {
      const verse = await QuranService.getRandomVerseForReminder();
      if (!verse) return;
      const settings = StorageService.getSettings();
      const reciterId = settings.quranVerseReminder?.reciterId || settings.selectedReciterId || 'alafasy';
      const reciter = VERIFIED_RECITERS.find((r) => r.id === reciterId) || VERIFIED_RECITERS[0];
      const audioUrl = getAyahAudioUrl(reciter.audioServer, verse.surahNumber, verse.ayahNumber);

      if (showFloating) {
        window.dispatchEvent(
          new CustomEvent('athar_show_floating_alert', {
            detail: {
              type: 'ayah_daily',
              category: 'quran_ayah',
              badge: '📖 اقرأ ولو آية (آية واحدة عشوائية)',
              title: `سورة ${verse.surahName} • الآية ${verse.ayahNumber}`,
              body: `«${verse.text}»\n\nتلاوة مباركة بصوت ${reciter.nameArabic}`,
              verseText: verse.text,
              tafsir: verse.tafsir,
              reciterName: reciter.nameArabic,
              audioUrl,
              surahNumber: verse.surahNumber,
              ayahNumber: verse.ayahNumber,
              surahName: verse.surahName,
              playSound,
              actionText: 'فتح الآية في المصحف 📖',
            },
          })
        );
      }
    } catch (e) {
      console.warn('[ReminderEngine] Error triggering quran verse reminder:', e);
    }
  }

  public async testQuranVerseReminder(): Promise<void> {
    await this.triggerQuranVerseReminder(true, true);
  }

  public testSalawatReminder(): void {
    try {
      const settings = StorageService.getSettings();
      const enabledIds = settings.salawatReminder?.enabledDhikrIds || StorageService.getEnabledDhikrAlertIds();
      let pool = VERIFIED_DHIKR_REMINDERS.filter((d) => enabledIds.includes(d.id));
      if (pool.length === 0) pool = VERIFIED_DHIKR_REMINDERS;
      const pick = pool[Math.floor(Math.random() * pool.length)];

      window.dispatchEvent(
        new CustomEvent('athar_show_floating_alert', {
          detail: {
            type: 'dhikr_salawat',
            category: 'salawat',
            badge: '📿 ذكر الله والصلاة على النبي ﷺ',
            title: pick.title,
            body: `${pick.arabicText}\n\n${pick.fadl || pick.categoryLabel}`,
            audioUrl: pick.audioUrl || '/audio/salawat.mp3',
            playSound: true,
            actionText: 'المسبحة والاستغفار 📿',
          },
        })
      );
    } catch (e) {
      console.warn('[ReminderEngine] Error testing salawat reminder:', e);
    }
  }

  public testParentsReminder(): void {
    window.dispatchEvent(
      new CustomEvent('athar_show_floating_alert', {
        detail: {
          type: 'parents_birr',
          category: 'parents_duty',
          badge: '🤍 بر الوالدين والإحسان',
          title: 'وقل رب ارحمهما كما ربياني صغيرا',
          body: 'تذكير نبوي ببر الوالدين والدعاء لهما وصلة رحمهما، أحب الأعمال إلى الله تعالى بعد الصلاة على وقتها.',
          audioUrl: '/audio/parents.mp3',
          playSound: true,
          actionText: 'دعاء وبر الوالدين 🤍',
        },
      })
    );
  }

  public testDhikrReminder(_id?: string): void {
    this.testSalawatReminder();
  }

  public testDailyWirdReminder(): void {
    window.dispatchEvent(
      new CustomEvent('athar_show_floating_alert', {
        detail: {
          type: 'daily_wird',
          category: 'quran_wird',
          badge: '📜 الورد القرآني اليومي',
          title: 'حان موعد وردك القرآني المبارك',
          body: '«إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ»\nجدد عهدك مع كتاب الله واقرأ حزبك اليومي لتنال السكينة والبركة.',
          audioUrl: '/audio/wird.mp3',
          playSound: true,
          actionText: 'بدء قراءة الورد 📖',
        },
      })
    );
  }

  public getState() {
    return {
      activeAdhan: null,
      activeOverlay: null,
    };
  }
}

export const ReminderEngine = new ReminderEngineClass();
