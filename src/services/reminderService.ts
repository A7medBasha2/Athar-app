import { StorageService } from './storageService';
import { QuranService } from './quranService';
import { AudioService } from './audioService';
import { NotificationService } from './notificationService';
import { VERIFIED_RECITERS, getAyahAudioUrl } from '../data/surahsData';
import { formatPrayerTime12 } from './prayerTimesService';

class ScheduledReminderEngine {
  private timerId: number | null = null;
  private lastSalawatTime = 0; // Set to 0 so initial or 1m check can trigger promptly
  private lastQuranTime = 0;
  private lastWirdTime = 0;
  private lastCheckedPrayerTime: string | null = null;

  public start() {
    if (this.timerId) return;
    // Responsive 3-second check loop
    this.timerId = window.setInterval(() => {
      this.checkAndTriggerReminders();
    }, 3000);
  }

  public stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public restart() {
    this.stop();
    // Reset test timestamps if in 1m test mode so it fires promptly
    const settings = StorageService.getSettings();
    if (settings.quranVerseReminder.frequency === '1m') this.lastQuranTime = 0;
    if (settings.salawatReminder.frequency === '1m') this.lastSalawatTime = 0;
    if (settings.dailyWirdReminder?.frequency === '1m') this.lastWirdTime = 0;
    this.start();
  }

  private isWithinQuietHours(now: Date): boolean {
    const settings = StorageService.getSettings();
    if (!settings.quietHours.enabled) return false;

    const [startH, startM] = settings.quietHours.startTime.split(':').map(Number);
    const [endH, endM] = settings.quietHours.endTime.split(':').map(Number);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes > endMinutes) {
      // Quiet hours cross midnight (e.g., 23:00 to 07:00)
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    } else {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
  }

  private isWithinTimeWindow(now: Date, startTime: string, endTime: string): boolean {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes > endMinutes) {
      // Crosses midnight, e.g. 20:00 to 04:00
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  private getIntervalMs(frequency: string, customMinutes?: number): number {
    switch (frequency) {
      case '1m': return 60 * 1000;
      case '30m': return 30 * 60 * 1000;
      case '1h': return 60 * 60 * 1000;
      case '2h': return 2 * 60 * 60 * 1000;
      case '3h': return 3 * 60 * 60 * 1000;
      case '4h': return 4 * 60 * 60 * 1000;
      case '6h': return 6 * 60 * 60 * 1000;
      case 'daily': return 24 * 60 * 60 * 1000;
      case 'custom': return (customMinutes || 60) * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }

  private async checkAndTriggerReminders() {
    const now = new Date();
    const settings = StorageService.getSettings();
    const isQuiet = this.isWithinQuietHours(now);

    // 1. Check Prayer Times (Adhan & Notification) - independent of quiet hours per setting
    const cachedPrayers = StorageService.getCachedPrayers();
    if (cachedPrayers && settings.adhanEnabled) {
      const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const prayerEntries = Object.entries(cachedPrayers.timings);

      for (const [key, time] of prayerEntries) {
        if (key === 'sunrise') continue; // Sunrise is not a prayer time for Adhan
        if (time === currentTimeStr && this.lastCheckedPrayerTime !== `${key}_${currentTimeStr}`) {
          this.lastCheckedPrayerTime = `${key}_${currentTimeStr}`;
          
          const prayerNames: Record<string, string> = {
            fajr: 'الفجر',
            dhuhr: 'الظهر',
            asr: 'العصر',
            maghrib: 'المغرب',
            isha: 'العشاء'
          };
          const name = prayerNames[key] || key;

          NotificationService.notify({
            title: `حان الآن وقت صلاة ${name}`,
            body: `حي على الصلاة، حي على الفلاح - تقبل الله طاعتكم (${formatPrayerTime12(time)}).`,
            type: 'prayer',
            actionText: 'استماع للأذان',
            onAction: () => AudioService.playAdhan(settings.adhanVoice)
          });

          if (settings.adhanEnabled) {
            AudioService.playAdhan(settings.adhanVoice);
          }
          break;
        }
      }
    }

    // 2. Check Quran Verse Reminder
    const quranSetting = settings.quranVerseReminder;
    if (quranSetting?.enabled) {
      const isTest1m = quranSetting.frequency === '1m';
      // If '1m' is chosen for testing, always bypass quiet hours and window!
      const allowedTime = isTest1m || (!isQuiet && this.isWithinTimeWindow(now, quranSetting.startTime, quranSetting.endTime));
      if (allowedTime) {
        const intervalMs = this.getIntervalMs(quranSetting.frequency, quranSetting.customMinutes);
        if (Date.now() - this.lastQuranTime >= intervalMs) {
          this.lastQuranTime = Date.now();
          this.triggerQuranVerseReminder(quranSetting.mode);
        }
      }
    }

    // 3. Check Salawat Reminder
    const salawatSetting = settings.salawatReminder;
    if (salawatSetting?.enabled) {
      const isTest1m = salawatSetting.frequency === '1m';
      // If '1m' is chosen for testing, always bypass quiet hours and window!
      const allowedTime = isTest1m || (!isQuiet && this.isWithinTimeWindow(now, salawatSetting.startTime, salawatSetting.endTime));
      if (allowedTime) {
        const intervalMs = this.getIntervalMs(salawatSetting.frequency, salawatSetting.customMinutes);
        // Stagger slightly if both Quran and Salawat trigger at exact same moment
        const staggeredDelay = (this.lastQuranTime > 0 && Math.abs(Date.now() - this.lastQuranTime) < 8000) ? 10000 : 0;
        if (Date.now() - this.lastSalawatTime >= (intervalMs + staggeredDelay)) {
          this.lastSalawatTime = Date.now();
          this.triggerSalawatReminder(salawatSetting.mode);
        }
      }
    }

    // 4. Check Daily Wird Reminder
    const wirdSetting = settings.dailyWirdReminder;
    if (wirdSetting?.enabled) {
      const isTest1m = wirdSetting.frequency === '1m';
      const allowedTime = isTest1m || (!isQuiet && this.isWithinTimeWindow(now, wirdSetting.startTime, wirdSetting.endTime));
      if (allowedTime) {
        const intervalMs = this.getIntervalMs(wirdSetting.frequency, wirdSetting.customMinutes);
        if (Date.now() - this.lastWirdTime >= intervalMs) {
          this.lastWirdTime = Date.now();
          this.triggerDailyWirdReminder(wirdSetting.mode);
        }
      }
    }
  }

  public async triggerQuranVerseReminder(mode: 'notification_only' | 'notification_and_sound' | 'notification_with_play_action' = 'notification_and_sound') {
    const verse = await QuranService.getRandomVerseForReminder();
    if (!verse) return;

    const settings = StorageService.getSettings();
    const reciterId = settings.selectedReciterId || 'alafasy';
    const reciter = VERIFIED_RECITERS.find(r => r.id === reciterId) || VERIFIED_RECITERS[0];
    const audioUrl = getAyahAudioUrl(reciter.audioServer, verse.surahNumber, verse.ayahNumber);

    const playAction = () => {
      AudioService.playUrl(audioUrl, 'reminder_verse', {
        title: `سورة ${verse.surahName} - آية ${verse.ayahNumber}`,
        subtitle: `تلاوة ${reciter.nameArabic}`,
        surahNumber: verse.surahNumber,
        ayahNumber: verse.ayahNumber,
        reciterName: reciter.nameArabic
      });
    };

    NotificationService.notify({
      title: `آية من القرآن الكريم: سورة ${verse.surahName} (${verse.ayahNumber})`,
      body: verse.text,
      type: 'quran',
      actionText: 'استماع للآية',
      onAction: playAction,
      audioUrl
    });

    if (mode === 'notification_and_sound') {
      playAction();
    }
  }

  public async triggerSalawatReminder(mode: 'notification_only' | 'notification_and_sound' | 'notification_with_play_action' = 'notification_and_sound') {
    const playAction = () => {
      AudioService.playSalawatReminder();
    };

    NotificationService.notify({
      title: "الصلاة على النبي ﷺ",
      body: "إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ ۚ يَا أَيُّهَا الَّذِينَ آمَنُوا صَلُّوا عَلَيْهِ وَسَلِّمُوا تَسْلِيمًا",
      type: 'salawat',
      actionText: 'استماع للصوت',
      onAction: playAction,
      audioUrl: '/audio/salawat.mp3'
    });

    if (mode === 'notification_and_sound') {
      playAction();
    }
  }

  public async triggerDailyWirdReminder(mode: 'notification_only' | 'notification_and_sound' | 'notification_with_play_action' = 'notification_and_sound') {
    const playAction = () => {
      AudioService.playSalawatReminder();
    };

    NotificationService.notify({
      title: "تذكير الورد القرآني اليومي",
      body: "﴿وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا﴾ حان موعد وردك اليومي من القرآن الكريم - رتّل آيات الله ونوّر قلبك ويومك.",
      type: 'wird',
      actionText: 'بدء قراءة الورد',
      onAction: playAction,
      audioUrl: '/audio/salawat.mp3'
    });

    if (mode === 'notification_and_sound') {
      playAction();
    }
  }
}

export const ReminderEngine = new ScheduledReminderEngine();
