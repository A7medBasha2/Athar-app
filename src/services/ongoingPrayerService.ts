import {
  NativePermissionsBridge,
  PrayerWidgetData,
  OngoingPrayerData,
} from './nativePermissionsBridge';
import { StorageService } from './storageService';
import { PrayerTimesService } from './prayerTimesService';
import { AstronomicalPrayerEngine } from './astronomicalPrayerEngine';
import { PrayerTimesData } from '../types';

class OngoingPrayerManager {
  private isInitialized = false;

  public init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Immediately push cached or offline astronomical prayers so the ongoing notification displays with 0ms delay
    let cached = StorageService.getCachedPrayers();
    if (!cached || !cached.timings) {
      const s = StorageService.getSettings();
      try {
        cached = AstronomicalPrayerEngine.calculateFullPrayerTimesData(s.location, s.calculationMethod, new Date());
        StorageService.setCachedPrayers(cached);
      } catch (e) {
        console.warn('[OngoingPrayerService] astronomical fallback computation error:', e);
      }
    }

    if (cached) {
      this.syncWithPrayerData(cached).catch(() => {});
    }

    // Refresh from PrayerTimesService in background if online
    const s = StorageService.getSettings();
    PrayerTimesService.getPrayerTimes(s.location, s.calculationMethod)
      .then((data) => {
        if (data && data.timings) {
          this.syncWithPrayerData(data).catch(() => {});
        }
      })
      .catch(() => {});
  }

  /**
   * Pushes latest prayer data to both the Native Android AppWidget and Ongoing Notification Bar Entry
   */
  public async syncWithPrayerData(prayerData: PrayerTimesData): Promise<void> {
    if (!prayerData || !prayerData.timings) return;

    const timings = prayerData.timings;
    const nextPrayer = prayerData.nextPrayer;
    const hijri = prayerData.dateHijri || 'أثر | مواقيت الصلاة';

    const customization = StorageService.getWidgetCustomization();
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
      widgetStyle: customization.style,
      showDhikr: customization.showDhikr,
      showFajr: customization.showFajr,
      showDhuhr: customization.showDhuhr,
      showAsr: customization.showAsr,
      showMaghrib: customization.showMaghrib,
      showIsha: customization.showIsha,
      showCountdown: customization.showCountdown,
      bgOpacity: customization.bgOpacity,
      themeAccent: customization.themeAccent,
    };

    // 1. Push to Android Home Screen App Widget (AtharPrayerWidgetProvider)
    await NativePermissionsBridge.updatePrayerWidget(widgetData);

    // 2. Push to Android Status Bar Ongoing Notification Entry
    const isOngoingEnabled = this.isOngoingEnabled();
    if (isOngoingEnabled) {
      const ongoingData: OngoingPrayerData = {
        title: `🕌 القادمة: ${widgetData.nextPrayer} (${widgetData.nextTime})`,
        body: `الفجر ${timings.fajr} · الظهر ${timings.dhuhr} · العصر ${timings.asr} · المغرب ${timings.maghrib} · العشاء ${timings.isha}`,
        nextPrayer: widgetData.nextPrayer,
        nextTime: widgetData.nextTime,
        remaining: widgetData.remaining,
        fajr: timings.fajr,
        dhuhr: timings.dhuhr,
        asr: timings.asr,
        maghrib: timings.maghrib,
        isha: timings.isha,
        hijriDate: hijri,
      };
      await NativePermissionsBridge.setOngoingPrayerNotification(ongoingData);
    }
  }

  public async syncWidgetCustomization(): Promise<void> {
    const cached = StorageService.getCachedPrayers();
    if (cached) {
      await this.syncWithPrayerData(cached);
    } else {
      const customization = StorageService.getWidgetCustomization();
      await NativePermissionsBridge.updatePrayerWidget({
        nextPrayer: 'صلاة الفجر',
        nextTime: '05:15',
        remaining: 'الصلاة القادمة',
        fajr: '05:15',
        dhuhr: '12:00',
        asr: '15:15',
        maghrib: '17:50',
        isha: '19:20',
        hijriDate: 'أَثَرُ | مواقيت الصلاة',
        widgetStyle: customization.style,
        showDhikr: customization.showDhikr,
        showFajr: customization.showFajr,
        showDhuhr: customization.showDhuhr,
        showAsr: customization.showAsr,
        showMaghrib: customization.showMaghrib,
        showIsha: customization.showIsha,
        showCountdown: customization.showCountdown,
        bgOpacity: customization.bgOpacity,
        themeAccent: customization.themeAccent,
      });
    }
  }

  public async setOngoingEnabled(enabled: boolean): Promise<void> {
    const settings = StorageService.getSettings();
    (settings as any).ongoingPrayerNotificationEnabled = enabled;
    StorageService.saveSettings(settings);

    if (!enabled) {
      await NativePermissionsBridge.removeOngoingPrayerNotification();
    } else {
      let cached = StorageService.getCachedPrayers();
      if (!cached || !cached.timings) {
        try {
          cached = await PrayerTimesService.getPrayerTimes(settings.location, settings.calculationMethod);
        } catch (e) {
          console.warn('[OngoingPrayerService] failed to fetch prayer times:', e);
        }
      }
      if (cached && cached.timings) {
        await this.syncWithPrayerData(cached);
      }
    }
  }

  public isOngoingEnabled(): boolean {
    const settings = StorageService.getSettings() as any;
    return settings.ongoingPrayerNotificationEnabled !== false;
  }

  public async forceRefreshOngoingNotification(): Promise<boolean> {
    const settings = StorageService.getSettings();
    (settings as any).ongoingPrayerNotificationEnabled = true;
    StorageService.saveSettings(settings);

    let prayerData = StorageService.getCachedPrayers();
    if (!prayerData || !prayerData.timings) {
      try {
        prayerData = await PrayerTimesService.getPrayerTimes(settings.location, settings.calculationMethod);
      } catch (err) {
        console.warn('[OngoingPrayerService] failed to compute prayer times:', err);
      }
    }

    if (!prayerData || !prayerData.timings) {
      return false;
    }

    await this.syncWithPrayerData(prayerData);
    return true;
  }
}

export const OngoingPrayerService = new OngoingPrayerManager();
