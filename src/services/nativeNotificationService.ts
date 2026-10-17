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

      // 1. Ayah Daily (اقرأ ولو آية)
      if (settings.quranVerseReminder?.enabled) {
        const timeStr = settings.quranVerseReminder.startTime || '08:00';
        const [h, m] = timeStr.split(':').map(Number);
        for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() + dayOffset);
          targetDate.setHours(h || 8, m || 0, 0, 0);
          const triggerAtMs = targetDate.getTime();

          if (triggerAtMs > now + 1500) {
            royalAlarms.push({
              id: `ayah_daily_${targetDate.getDate()}`,
              type: 'ayah_daily',
              title: 'اقرأ ولو آية في اليوم',
              body: 'تأمل في كلام الله العظيم واجعل لقلبك نصيباً من النور والبركة اليوم.',
              badge: 'اقرأ ولو آية في اليوم',
              category: CAT_QURAN_AYAH,
              audioUrl: '/audio/quran_sample.mp3',
              timestamp: triggerAtMs,
              surahNumber: 1,
              ayahNumber: 2,
              playSound: settings.quranVerseReminder.mode !== 'notification_only',
            });
          }
        }
      }

      // 2. Dhikr & Salawat (ذكر الله والصلاة على النبي ﷺ)
      if (settings.salawatReminder?.enabled) {
        const freq = settings.salawatReminder.frequency || '1h';
        const intervalMs = this.parseFrequencyMs(freq);
        const startTimeStr = settings.salawatReminder.startTime || '10:00';
        const [startH, startM] = startTimeStr.split(':').map(Number);

        // Schedule next 12 occurrences over next 24 hours
        let rollingTime = new Date();
        rollingTime.setHours(startH || 10, startM || 0, 0, 0);
        while (rollingTime.getTime() < now + 1500) {
          rollingTime = new Date(rollingTime.getTime() + intervalMs);
        }

        for (let i = 0; i < 12; i++) {
          const triggerAtMs = rollingTime.getTime();
          if (triggerAtMs > now + 24 * 60 * 60 * 1000) break;

          const pick = pool[i % pool.length];
          royalAlarms.push({
            id: `dhikr_salawat_${triggerAtMs}`,
            type: 'dhikr_salawat',
            title: pick.title,
            body: pick.arabicText,
            badge: 'ذكر الله والصلاة على النبي ﷺ',
            category: CAT_DHIKR_TASBEEH,
            audioUrl: pick.audioUrl,
            timestamp: triggerAtMs,
            adhkarCategory: 'morning',
            playSound: settings.salawatReminder.mode !== 'notification_only',
          });

          rollingTime = new Date(rollingTime.getTime() + intervalMs);
        }
      }

      // 3. Daily Quran Wird (الورد القرآني اليومي)
      if (settings.dailyWirdReminder?.enabled) {
        const timeStr = settings.dailyWirdReminder.startTime || '17:00';
        const [h, m] = timeStr.split(':').map(Number);
        for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() + dayOffset);
          targetDate.setHours(h || 17, m || 0, 0, 0);
          const triggerAtMs = targetDate.getTime();

          if (triggerAtMs > now + 1500) {
            royalAlarms.push({
              id: `daily_wird_${targetDate.getDate()}`,
              type: 'daily_wird',
              title: 'الورد القرآني اليومي',
              body: 'حان موعد وردك القرآني المبارك.. لا تهجر المصحف واجعل لقلبك نصيباً من النور.',
              badge: 'الورد القرآني اليومي',
              category: CAT_QURAN_WIRD,
              audioUrl: '/audio/wird.mp3',
              timestamp: triggerAtMs,
              surahNumber: 1,
              ayahNumber: 1,
              playSound: settings.dailyWirdReminder.mode !== 'notification_only',
            });
          }
        }
      }

      // 4. Filial Piety (بر الوالدين)
      if (settings.parentsReminder?.enabled) {
        const timeStr = settings.parentsReminder.startTime || '09:00';
        const [h, m] = timeStr.split(':').map(Number);
        for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() + dayOffset);
          targetDate.setHours(h || 9, m || 0, 0, 0);
          const triggerAtMs = targetDate.getTime();

          if (triggerAtMs > now + 1500) {
            royalAlarms.push({
              id: `parents_birr_${targetDate.getDate()}`,
              type: 'parents_birr',
              title: 'بِرّ الوالدين والإحسان إليهما',
              body: '«رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا» · تذكير بالدعاء الصادق والبر لوالديك.',
              badge: 'بِرّ الوالدين والإحسان إليهما',
              category: CAT_PARENTS_DUTY,
              audioUrl: '/audio/parents.mp3',
              timestamp: triggerAtMs,
              playSound: settings.parentsReminder.mode !== 'notification_only',
            });
          }
        }
      }

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
