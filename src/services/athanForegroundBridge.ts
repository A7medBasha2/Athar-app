/**
 * athanForegroundBridge.ts
 * 
 * TypeScript / JavaScript Bridge for Athar's Android Foreground Service (AthanForegroundService.java).
 * 
 * Provides complete, robust functions for:
 * 1. Starting the persistent background service with ongoing countdown notification.
 * 2. Updating the live countdown dynamically whenever prayer calculation updates or passes.
 * 3. Stopping the service cleanly when requested.
 * 4. Automatic synchronization from today's prayer times map.
 */

import { NativePermissionsBridge } from './nativePermissionsBridge';

export interface PrayerCountdownParams {
  nextPrayer: string;
  targetEpochMs: number;
  timeStr?: string;
}

export interface DailyPrayerTimes {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

/**
 * Starts the AthanForegroundService with persistent ongoing notification.
 * The notification cannot be swiped away and displays the upcoming prayer countdown.
 */
export async function startAthanForegroundService(params?: PrayerCountdownParams): Promise<boolean> {
  try {
    return await NativePermissionsBridge.startAthanForegroundService(params);
  } catch (err) {
    console.error('[athanForegroundBridge] Failed to start foreground service:', err);
    return false;
  }
}

/**
 * Dynamically updates the countdown in the ongoing notification bar.
 * Updates are handled automatically by the native service (every second in the final hour, every minute otherwise).
 */
export async function updateAthanCountdown(params: PrayerCountdownParams): Promise<boolean> {
  try {
    return await NativePermissionsBridge.updateAthanCountdown(params);
  } catch (err) {
    console.error('[athanForegroundBridge] Failed to update countdown:', err);
    return false;
  }
}

/**
 * Checks whether the AthanForegroundService is currently running.
 */
export async function isAthanForegroundServiceRunning(): Promise<boolean> {
  try {
    return await NativePermissionsBridge.isAthanForegroundServiceRunning();
  } catch (err) {
    console.error('[athanForegroundBridge] Failed to check service status:', err);
    return false;
  }
}

/**
 * Stops the AthanForegroundService and removes the persistent ongoing notification.
 */
export async function stopAthanForegroundService(): Promise<boolean> {
  try {
    return await NativePermissionsBridge.stopAthanForegroundService();
  } catch (err) {
    console.error('[athanForegroundBridge] Failed to stop foreground service:', err);
    return false;
  }
}

/**
 * Helper to calculate upcoming prayer and synchronize with AthanForegroundService
 * 
 * @param prayerTimes Object containing times in "HH:mm" (24h or 12h formatted)
 * @returns boolean indicating success
 */
export async function syncAthanCountdownWithNextPrayer(prayerTimes: DailyPrayerTimes): Promise<boolean> {
  try {
    const now = new Date();
    const parseTime = (timeStr: string, isTomorrow = false): number => {
      const cleaned = timeStr.trim().replace(/[^0-9:]/g, '');
      const parts = cleaned.split(':');
      const hours = parseInt(parts[0], 10) || 0;
      const minutes = parseInt(parts[1], 10) || 0;
      const d = new Date(now);
      if (isTomorrow) d.setDate(d.getDate() + 1);
      d.setHours(hours, minutes, 0, 0);
      return d.getTime();
    };

    const prayerList: Array<{ name: string; epoch: number; raw: string }> = [
      { name: 'صلاة الفجر', epoch: parseTime(prayerTimes.fajr), raw: prayerTimes.fajr },
      { name: 'صلاة الظهر', epoch: parseTime(prayerTimes.dhuhr), raw: prayerTimes.dhuhr },
      { name: 'صلاة العصر', epoch: parseTime(prayerTimes.asr), raw: prayerTimes.asr },
      { name: 'صلاة المغرب', epoch: parseTime(prayerTimes.maghrib), raw: prayerTimes.maghrib },
      { name: 'صلاة العشاء', epoch: parseTime(prayerTimes.isha), raw: prayerTimes.isha },
    ];

    const currentEpoch = now.getTime();
    let nextPrayerItem = prayerList.find((p) => p.epoch > currentEpoch);

    // If all prayers today passed, the next prayer is Fajr tomorrow
    if (!nextPrayerItem) {
      nextPrayerItem = {
        name: 'صلاة الفجر',
        epoch: parseTime(prayerTimes.fajr, true),
        raw: prayerTimes.fajr,
      };
    }

    return await updateAthanCountdown({
      nextPrayer: nextPrayerItem.name,
      targetEpochMs: nextPrayerItem.epoch,
      timeStr: nextPrayerItem.raw,
    });
  } catch (e) {
    console.warn('[athanForegroundBridge] syncAthanCountdownWithNextPrayer error:', e);
    return false;
  }
}

export default {
  startAthanForegroundService,
  updateAthanCountdown,
  isAthanForegroundServiceRunning,
  stopAthanForegroundService,
  syncAthanCountdownWithNextPrayer,
};
