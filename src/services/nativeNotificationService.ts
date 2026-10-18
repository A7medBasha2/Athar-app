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
    await this.cancelAllScheduledNotifications();
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
    return 0;
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
