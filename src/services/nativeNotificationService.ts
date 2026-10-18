import { StorageService, DEFAULT_PRAYERS_ADHAN_CONFIG } from './storageService';
import { PrayerTimesService } from './prayerTimesService';
import { NativePermissionsBridge } from './nativePermissionsBridge';
import { ObligatoryPrayerId } from '../types';
import { VERIFIED_DHIKR_REMINDERS } from '../data/dhikrRemindersData';

export const CAT_PRAYER_ATHAN = 'prayer_athan';
export const CAT_IQAMAH = 'iqamah';
export const CAT_POST_ADHAN_DUA = 'post_adhan_dua';
export const CAT_QURAN_AYAH = 'quran_ayah';
export const CAT_QURAN_WIRD = 'quran_wird';
export const CAT_SALAWAT = 'salawat';
export const CAT_DHIKR_TASBEEH = 'dhikr_tasbeeh';
export const CAT_MORNING_EVENING = 'morning_evening';
export const CAT_PARENTS_DUTY = 'parents_duty';
export const CAT_ONGOING_PRAYER = 'ongoing_prayer';
export const CAT_SYSTEM_OVERLAY_ATHAN = 'system_overlay_athan';
export const CAT_SMART_ALARM = 'smart_alarm';
export const CAT_CALL_INTERRUPTION = 'call_interruption';
export const CAT_SMART_SILENCE = 'smart_silence';

export type AtharNotificationCategory = string;

class UnifiedNotificationManager {
  private isScheduling: boolean = false;

  public async initAndScheduleAll(_autoRequest?: boolean): Promise<void> {
    await this.scheduleAllNativeNotifications();
    await this.scheduleAllRoyalNativeAlarms();
  }

  public async cancelAllScheduledNotifications(): Promise<void> {
    try {
      await NativePermissionsBridge.purgeSystemNotifications();
    } catch (e) {
      console.warn('[NativeNotificationService] Cancel alarms error:', e);
    }
  }

  public async dispatchImmediate(payload: any): Promise<void> {
    try {
      await NativePermissionsBridge.showRoyalNotification({
        title: payload?.title || 'أَثَرُ | تنبيه فوري',
        body: payload?.body || '',
        badge: payload?.badge || '🕌 تنبيه إسلامي',
        category: payload?.category || CAT_PRAYER_ATHAN,
        audioUrl: payload?.audioUrl,
        playSound: payload?.playSound ?? true,
      });
    } catch (e) {
      console.warn('[NativeNotificationService] dispatchImmediate error:', e);
    }
  }

  public async dispatchImmediateNativeNotification(payload: any): Promise<void> {
    await this.dispatchImmediate(payload);
  }

  public async scheduleAllNativeNotifications(): Promise<number> {
    if (this.isScheduling) return 0;
    this.isScheduling = true;

    try {
      const settings = StorageService.getSettings();
      if (!settings.adhanEnabled) return 0;

      const prayerTimes = PrayerTimesService.getInitialPrayerTimes(
        settings.location,
        settings.calculationMethod || '5'
      );
      if (!prayerTimes?.timings) return 0;

      const adhanConfig = settings.prayersAdhanConfig || DEFAULT_PRAYERS_ADHAN_CONFIG;
      const prayers: ObligatoryPrayerId[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
      const now = Date.now();
      const nativeAlarms: Array<{ id: string; name: string; time: string; timestamp: number; audioUrl?: string }> = [];

      // Schedule for today and tomorrow (48 hours window)
      for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + dayOffset);

        for (const pId of prayers) {
          const prayerSetting = adhanConfig[pId];
          if (!prayerSetting || !prayerSetting.enabled) continue;

          const rawTime = prayerTimes.timings[pId];
          if (!rawTime) continue;

          const [hStr, mStr] = rawTime.trim().slice(0, 5).split(':');
          const hours = parseInt(hStr, 10);
          const minutes = parseInt(mStr, 10);
          if (isNaN(hours) || isNaN(minutes)) continue;

          const alarmDate = new Date(targetDate);
          alarmDate.setHours(hours, minutes, 0, 0);
          const triggerAtMs = alarmDate.getTime();

          // Only schedule upcoming alarms
          if (triggerAtMs > now + 1500) {
            const prayerName = this.getPrayerArabicName(pId);
            nativeAlarms.push({
              id: `prayer_${pId}_${alarmDate.getDate()}`,
              name: prayerName,
              time: rawTime,
              timestamp: triggerAtMs,
              audioUrl: prayerSetting.voice ? `/audio/adhan_${prayerSetting.voice}.mp3` : undefined,
            });
          }
        }
      }

      if (nativeAlarms.length > 0) {
        await NativePermissionsBridge.scheduleNativePrayerAlarms(nativeAlarms);
      }

      return nativeAlarms.length;
    } catch (e) {
      console.warn('[NativeNotificationService] scheduleAllNativeNotifications error:', e);
      return 0;
    } finally {
      this.isScheduling = false;
    }
  }

  public async scheduleAllRoyalNativeAlarms(): Promise<number> {
    try {
      const settings = StorageService.getSettings();
      const now = Date.now();
      const royalAlarms: Array<{
        id: string;
        type: string;
        title: string;
        body: string;
        badge: string;
        category: string;
        audioUrl?: string;
        timestamp: number;
        surahNumber?: number;
        ayahNumber?: number;
        adhkarCategory?: string;
        playSound?: boolean;
      }> = [];

      const enabledIds = settings.salawatReminder?.enabledDhikrIds || StorageService.getEnabledDhikrAlertIds();
      let pool = VERIFIED_DHIKR_REMINDERS.filter((d) => enabledIds.includes(d.id));
      if (pool.length === 0) pool = VERIFIED_DHIKR_REMINDERS;

      // Helper to schedule either recurring intervals or fixed time of day for any royal reminder
      const scheduleReminderItems = (
        type: 'ayah_daily' | 'dhikr_salawat' | 'daily_wird' | 'parents_birr',
        setting: any,
        defaultTime: string,
        category: string,
        title: string,
        bodyTemplate: string,
        badge: string,
        audioUrl: string,
        surahNumber: number = 0,
        ayahNumber: number = 0
      ) => {
        if (!setting?.enabled) return;
        const isInterval = setting.scheduleType === 'interval' || (setting.frequency && setting.frequency !== 'daily' && setting.frequency !== 'fixed_time');
        const playSound = setting.mode !== 'notification_only';

        if (isInterval) {
          const freq = setting.frequency || '1h';
          const intervalMs = this.parseFrequencyMs(freq);
          const startStr = setting.startTime || defaultTime;
          const [startH, startM] = startStr.split(':').map(Number);

          let rollingTime = new Date();
          rollingTime.setHours(startH || 8, startM || 0, 0, 0);
          while (rollingTime.getTime() < now + 1500) {
            rollingTime = new Date(rollingTime.getTime() + intervalMs);
          }

          // Schedule up to 16 upcoming intervals within next 24 hours
          for (let i = 0; i < 16; i++) {
            const triggerAtMs = rollingTime.getTime();
            if (triggerAtMs > now + 24 * 60 * 60 * 1000) break;

            let finalBody = bodyTemplate;
            let finalAudio = audioUrl;
            let finalTitle = title;

            if (type === 'dhikr_salawat') {
              const pick = pool[i % pool.length];
              finalTitle = pick.title;
              finalBody = pick.arabicText;
              finalAudio = pick.audioUrl;
            }

            royalAlarms.push({
              id: `${type}_${triggerAtMs}`,
              type,
              title: finalTitle,
              body: finalBody,
              badge,
              category,
              audioUrl: finalAudio,
              timestamp: triggerAtMs,
              surahNumber,
              ayahNumber,
              playSound,
            });

            rollingTime = new Date(rollingTime.getTime() + intervalMs);
          }
        } else {
          // Fixed time of day (e.g. 09:00 PM or 11:00 PM)
          const timeStr = setting.fixedTime || setting.startTime || defaultTime;
          const [h, m] = timeStr.split(':').map(Number);

          for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + dayOffset);
            targetDate.setHours(h || 8, m || 0, 0, 0);
            const triggerAtMs = targetDate.getTime();

            if (triggerAtMs > now + 1500) {
              let finalBody = bodyTemplate;
              let finalAudio = audioUrl;
              let finalTitle = title;

              if (type === 'dhikr_salawat') {
                const pick = pool[dayOffset % pool.length];
                finalTitle = pick.title;
                finalBody = pick.arabicText;
                finalAudio = pick.audioUrl;
              }

              royalAlarms.push({
                id: `${type}_${targetDate.getDate()}_${h}_${m}`,
                type,
                title: finalTitle,
                body: finalBody,
                badge,
                category,
                audioUrl: finalAudio,
                timestamp: triggerAtMs,
                surahNumber,
                ayahNumber,
                playSound,
              });
            }
          }
        }
      };

      // 1. Ayah Daily (اقرأ ولو آية)
      scheduleReminderItems(
        'ayah_daily',
        settings.quranVerseReminder,
        '08:00',
        CAT_QURAN_AYAH,
        'اقرأ ولو آية في اليوم',
        'تأمل في كلام الله العظيم واجعل لقلبك نصيباً من النور والبركة اليوم.',
        'اقرأ ولو آية في اليوم',
        '/audio/quran_sample.mp3',
        1,
        2
      );

      // 2. Dhikr & Salawat (ذكر الله والصلاة على النبي ﷺ)
      scheduleReminderItems(
        'dhikr_salawat',
        settings.salawatReminder,
        '10:00',
        CAT_DHIKR_TASBEEH,
        'ذكر الله والصلاة على النبي ﷺ',
        'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
        'ذكر الله والصلاة على النبي ﷺ',
        '/audio/salawat.mp3'
      );

      // 3. Daily Quran Wird (الورد القرآني اليومي)
      scheduleReminderItems(
        'daily_wird',
        settings.dailyWirdReminder,
        '21:00',
        CAT_QURAN_WIRD,
        'الورد القرآني اليومي',
        'حان موعد وردك القرآني المبارك.. لا تهجر المصحف واجعل لقلبك نصيباً من النور.',
        'الورد القرآني اليومي',
        '/audio/wird.mp3',
        1,
        1
      );

      // 4. Filial Piety & Dua (بر الوالدين والإحسان إليهما)
      scheduleReminderItems(
        'parents_birr',
        settings.parentsReminder,
        '23:00',
        CAT_PARENTS_DUTY,
        'بِرّ الوالدين والإحسان إليهما',
        '«رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا» · تذكير بالدعاء الصادق والبر لوالديك.',
        'بِرّ الوالدين والإحسان إليهما',
        '/audio/parents.mp3'
      );

      if (royalAlarms.length > 0) {
        await NativePermissionsBridge.scheduleNativeRoyalAlarms(royalAlarms);
      }

      return royalAlarms.length;
    } catch (e) {
      console.warn('[NativeNotificationService] scheduleAllRoyalNativeAlarms error:', e);
      return 0;
    }
  }

  private parseFrequencyMs(freq: string): number {
    switch (freq) {
      case '30m': return 30 * 60 * 1000;
      case '1h': return 60 * 60 * 1000;
      case '2h': return 2 * 60 * 60 * 1000;
      case '3h': return 3 * 60 * 60 * 1000;
      case '4h': return 4 * 60 * 60 * 1000;
      case '6h': return 6 * 60 * 60 * 1000;
      case '12h': return 12 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }

  private getPrayerArabicName(prayerId: ObligatoryPrayerId): string {
    switch (prayerId) {
      case 'fajr': return 'صلاة الفجر';
      case 'dhuhr': return 'صلاة الظهر';
      case 'asr': return 'صلاة العصر';
      case 'maghrib': return 'صلاة المغرب';
      case 'isha': return 'صلاة العشاء';
      default: return 'الصلاة المفروضة';
    }
  }
}

export const NativeNotificationService = new UnifiedNotificationManager();
