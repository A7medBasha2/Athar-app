import { StorageService } from './storageService';
import { QuranService } from './quranService';
import { AudioService } from './audioService';
import { NotificationService } from './notificationService';
import { VERIFIED_RECITERS, getAyahAudioUrl } from '../data/surahsData';
import { formatPrayerTime12 } from './prayerTimesService';

class ScheduledReminderEngine {
  private timerId: number | null = null;
  // Initialize to current time so background loop doesn't spam all reminders on launch
  private lastSalawatTime = Date.now();
  private lastQuranTime = Date.now();
  private lastWirdTime = Date.now();
  private lastCheckedPrayerTime: string | null = null;
  private scheduledIqamah: { prayerKey: string; nameArabic: string; triggerTime: number } | null = null;

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
    // Stagger initial timestamps if in 1m test mode so they don't fire on the exact same second
    const settings = StorageService.getSettings();
    const now = Date.now();
    if (settings.quranVerseReminder.frequency === '1m') this.lastQuranTime = 0;
    if (settings.salawatReminder.frequency === '1m') this.lastSalawatTime = now - 30000;
    if (settings.dailyWirdReminder?.frequency === '1m') this.lastWirdTime = now - 45000;
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
          const adhanMode = settings.adhanMode || 'full';

          const onAdhanFinished = () => {
            if (settings.duaAfterAdhanEnabled) {
              NotificationService.notify({
                title: "دعاء ما بعد الأذان",
                body: "اللهم رب هذه الدعوة التامة والصلاة القائمة آت محمداً الوسيلة والفضيلة وابعثه مقاماً محموداً الذي وعدته.",
                type: 'prayer',
                actionText: 'استماع للدعاء',
                onAction: () => AudioService.playDuaAfterAdhan()
              });
              AudioService.playDuaAfterAdhan();
            }
          };

          NotificationService.notify({
            title: `حان الآن وقت صلاة ${name}`,
            body: `حي على الصلاة، حي على الفلاح - تقبل الله طاعتكم (${formatPrayerTime12(time)}).`,
            type: 'prayer',
            actionText: 'استماع للأذان',
            onAction: () => AudioService.playAdhan(settings.adhanVoice, { mode: adhanMode, onFinished: onAdhanFinished })
          });

          if (settings.adhanEnabled) {
            AudioService.playAdhan(settings.adhanVoice, {
              mode: adhanMode,
              onFinished: onAdhanFinished
            });
          }

          // Schedule Iqamah: Maghrib is 5 mins, others 15 mins (or user configured)
          if (settings.iqamahSettings?.enabled) {
            const iqamahMinutes = key === 'maghrib'
              ? (settings.iqamahSettings.maghribMinutes || 5)
              : (settings.iqamahSettings.defaultMinutes || 15);
            this.scheduledIqamah = {
              prayerKey: key,
              nameArabic: name,
              triggerTime: Date.now() + iqamahMinutes * 60 * 1000
            };
          }

          break;
        }
      }
    }

    // 1.5 Check Scheduled Iqamah
    if (this.scheduledIqamah && Date.now() >= this.scheduledIqamah.triggerTime) {
      const iq = this.scheduledIqamah;
      this.scheduledIqamah = null;
      NotificationService.notify({
        title: `حان الآن موعد إقامة صلاة ${iq.nameArabic}`,
        body: "قد قامت الصلاة، قد قامت الصلاة · استووا واعتدلوا يرحمكم الله.",
        type: 'prayer',
        actionText: 'استماع للإقامة',
        onAction: () => AudioService.playIqamah()
      });
      if (settings.iqamahSettings?.soundEnabled) {
        AudioService.playIqamah();
      }
    }

    // 2. Check Quran Verse Reminder
    const quranSetting = settings.quranVerseReminder;
    if (quranSetting?.enabled) {
      const isTest1m = quranSetting.frequency === '1m';
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
      const allowedTime = isTest1m || (!isQuiet && this.isWithinTimeWindow(now, salawatSetting.startTime, salawatSetting.endTime));
      if (allowedTime) {
        const intervalMs = this.getIntervalMs(salawatSetting.frequency, salawatSetting.customMinutes);
        // Stagger slightly if both Quran and Salawat trigger near the same moment
        const staggeredDelay = (this.lastQuranTime > 0 && Math.abs(Date.now() - this.lastQuranTime) < 8000) ? 12000 : 0;
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
        const staggeredDelay = (this.lastSalawatTime > 0 && Math.abs(Date.now() - this.lastSalawatTime) < 8000) ? 12000 : 0;
        if (Date.now() - this.lastWirdTime >= (intervalMs + staggeredDelay)) {
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

    const playAction = async () => {
      await AudioService.playUrl(audioUrl, 'reminder_verse', {
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
      onAction: () => AudioService.enqueuePriorityNotification(1, 'quran_verse', playAction),
      audioUrl
    });

    if (mode === 'notification_and_sound') {
      AudioService.enqueuePriorityNotification(1, 'quran_verse', playAction);
    }
  }

  public async triggerSalawatReminder(mode: 'notification_only' | 'notification_and_sound' | 'notification_with_play_action' = 'notification_and_sound') {
    const playAction = async () => {
      await AudioService.playSalawatReminder();
    };

    NotificationService.notify({
      title: "الصلاة على النبي ﷺ",
      body: "إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ ۚ يَا أَيُّهَا الَّذِينَ آمَنُوا صَلُّوا عَلَيْهِ وَسَلِّمُوا تَسْلِيمًا",
      type: 'salawat',
      actionText: 'استماع للصوت',
      onAction: () => AudioService.enqueuePriorityNotification(2, 'salawat', playAction),
      audioUrl: '/audio/salawat.mp3'
    });

    if (mode === 'notification_and_sound') {
      AudioService.enqueuePriorityNotification(2, 'salawat', playAction);
    }
  }

  public async triggerDailyWirdReminder(mode: 'notification_only' | 'notification_and_sound' | 'notification_with_play_action' = 'notification_and_sound') {
    const playAction = async () => {
      await AudioService.playWirdReminder();
    };

    NotificationService.notify({
      title: "تذكير الورد القرآني اليومي",
      body: "﴿وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا﴾ حان موعد وردك المبارك من القرآن الكريم - رتّل آيات الله ونوّر قلبك ويومك.",
      type: 'wird',
      actionText: 'استماع للتنبيه',
      onAction: () => AudioService.enqueuePriorityNotification(3, 'wird', playAction),
      audioUrl: '/audio/wird.mp3'
    });

    if (mode === 'notification_and_sound') {
      AudioService.enqueuePriorityNotification(3, 'wird', playAction);
    }
  }

  // --- Direct Test Methods (Instantly plays audio and sends single notification) ---

  public async testQuranVerseReminder(): Promise<void> {
    AudioService.clearNotificationQueue();
    const verse = await QuranService.getRandomVerseForReminder();
    if (!verse) return;
    const settings = StorageService.getSettings();
    const reciterId = settings.selectedReciterId || 'alafasy';
    const reciter = VERIFIED_RECITERS.find(r => r.id === reciterId) || VERIFIED_RECITERS[0];
    const audioUrl = getAyahAudioUrl(reciter.audioServer, verse.surahNumber, verse.ayahNumber);

    NotificationService.notify({
      title: `آية من القرآن الكريم: سورة ${verse.surahName} (${verse.ayahNumber})`,
      body: verse.text,
      type: 'quran',
      actionText: 'استماع للآية',
      onAction: () => AudioService.playUrl(audioUrl, 'reminder_verse', {
        title: `سورة ${verse.surahName} (${verse.ayahNumber})`,
        subtitle: `تلاوة ${reciter.nameArabic}`
      }),
      audioUrl
    });

    await AudioService.playUrl(audioUrl, 'reminder_verse', {
      title: `سورة ${verse.surahName} (${verse.ayahNumber})`,
      subtitle: `تلاوة ${reciter.nameArabic}`,
      surahNumber: verse.surahNumber,
      ayahNumber: verse.ayahNumber,
      reciterName: reciter.nameArabic
    });
  }

  public async testSalawatReminder(): Promise<void> {
    AudioService.clearNotificationQueue();
    NotificationService.notify({
      title: "الصلاة على النبي ﷺ",
      body: "إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ ۚ يَا أَيُّهَا الَّذِينَ آمَنُوا صَلُّوا عَلَيْهِ وَسَلِّمُوا تَسْلِيمًا",
      type: 'salawat',
      actionText: 'استماع للصوت',
      onAction: () => AudioService.playSalawatReminder(),
      audioUrl: '/audio/salawat.mp3'
    });
    await AudioService.playSalawatReminder();
  }

  public async testDailyWirdReminder(): Promise<void> {
    AudioService.clearNotificationQueue();
    NotificationService.notify({
      title: "تذكير الورد القرآني اليومي",
      body: "﴿وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا﴾ حان موعد وردك المبارك من القرآن الكريم.",
      type: 'wird',
      actionText: 'استماع للتنبيه',
      onAction: () => AudioService.playWirdReminder(),
      audioUrl: '/audio/wird.mp3'
    });
    await AudioService.playWirdReminder();
  }

  public async testAdhan(voiceId?: 'makkah' | 'madinah' | 'alaqsa' | 'alafasy', mode?: 'full' | 'first_two_takbeers'): Promise<void> {
    AudioService.clearNotificationQueue();
    const settings = StorageService.getSettings();
    const v = voiceId || settings.adhanVoice || 'alafasy';
    const m = mode || settings.adhanMode || 'full';

    NotificationService.notify({
      title: "تجربة أذان الصلاة",
      body: `الله أكبر الله أكبر · حي على الصلاة حي على الفلاح (${m === 'first_two_takbeers' ? 'التكبيرتان' : 'الآذان كاملاً'}).`,
      type: 'prayer',
      actionText: 'استماع للأذان',
      onAction: () => AudioService.playAdhan(v, { mode: m })
    });

    await AudioService.playAdhan(v, {
      mode: m,
      onFinished: () => {
        if (settings.duaAfterAdhanEnabled) {
          AudioService.playDuaAfterAdhan();
        }
      }
    });
  }

  public async testIqamah(): Promise<void> {
    AudioService.clearNotificationQueue();
    NotificationService.notify({
      title: "تجربة إقامة الصلاة",
      body: "قد قامت الصلاة، قد قامت الصلاة · استووا واعتدلوا يرحمكم الله.",
      type: 'prayer',
      actionText: 'استماع للإقامة',
      onAction: () => AudioService.playIqamah()
    });
    await AudioService.playIqamah();
  }

  public async testDuaAfterAdhan(): Promise<void> {
    AudioService.clearNotificationQueue();
    NotificationService.notify({
      title: "دعاء ما بعد الأذان",
      body: "اللهم رب هذه الدعوة التامة والصلاة القائمة آت محمداً الوسيلة والفضيلة وابعثه مقاماً محموداً الذي وعدته.",
      type: 'prayer',
      actionText: 'استماع للدعاء',
      onAction: () => AudioService.playDuaAfterAdhan()
    });
    await AudioService.playDuaAfterAdhan();
  }
}

export const ReminderEngine = new ScheduledReminderEngine();

