import {
  NativePermissionsBridge,
  PrayerWidgetData,
  OngoingPrayerData,
} from './nativePermissionsBridge';
import { StorageService } from './storageService';
import { PrayerTimesData } from '../types';

class OngoingPrayerManager {
  private isInitialized = false;

  public init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Check cached prayer data on startup and sync widget + ongoing notification
    const cached = StorageService.getCachedPrayers();
    if (cached) {
      this.syncWithPrayerData(cached).catch(() => {});
    }
  }

  /**
   * Pushes latest prayer data to both the Native Android AppWidget and Ongoing Notification Bar Entry
   */
  public async syncWithPrayerData(prayerData: PrayerTimesData): Promise<void> {
    if (!prayerData || !prayerData.timings) return;

    const timings = prayerData.timings;
    const nextPrayer = prayerData.nextPrayer;
    const hijri = prayerData.dateHijri || 'أثر | مواقيت الصلاة';

    const widgetData: PrayerWidgetData = {
      nextPrayer: nextPrayer ? nextPrayer.nameArabic : 'صلاة الفجر',
      nextTime: nextPrayer ? (nextPrayer.time12 || nextPrayer.time) : timings.fajr,
      remaining: nextPrayer ? `الصلاة القادمة: ${nextPrayer.nameArabic}` : 'حان وقت الصلاة',
      fajr: timings.fajr,
      dhuhr: timings.dhuhr,
      asr: timings.asr,
      maghrib: timings.maghrib,
      isha: timings.isha,
      hijriDate: hijri,
    };

    // 1. Push to Android Home Screen App Widget (AtharPrayerWidgetProvider)
    await NativePermissionsBridge.updatePrayerWidget(widgetData);

    // 2. Push to Android Status Bar Ongoing Notification Entry
    const isOngoingEnabled = this.isOngoingEnabled();
    if (isOngoingEnabled) {
      const ongoingData: OngoingPrayerData = {
        title: `🕌 القادمة: ${widgetData.nextPrayer} (${widgetData.nextTime})`,
        body: `الفجر ${timings.fajr} · الظهر ${timings.dhuhr} · العصر ${timings.asr} · المغرب ${timings.maghrib} · العشاء ${timings.isha}`,
      };
      await NativePermissionsBridge.setOngoingPrayerNotification(ongoingData);
    }
  }

  public async setOngoingEnabled(enabled: boolean): Promise<void> {
    const settings = StorageService.getSettings();
    (settings as any).ongoingPrayerNotificationEnabled = enabled;
    StorageService.saveSettings(settings);

    if (!enabled) {
      await NativePermissionsBridge.removeOngoingPrayerNotification();
    } else {
      const cached = StorageService.getCachedPrayers();
      if (cached) {
        await this.syncWithPrayerData(cached);
      }
    }
  }

  public isOngoingEnabled(): boolean {
    const settings = StorageService.getSettings() as any;
    return settings.ongoingPrayerNotificationEnabled !== false;
  }
}

export const OngoingPrayerService = new OngoingPrayerManager();
