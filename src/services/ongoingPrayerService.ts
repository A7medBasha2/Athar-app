import { LiveActivityService } from './liveActivityService';

/**
 * OngoingPrayerService - إدارة ومزامنة شريط الإشعار الدائم لمواقيت الصلاة في أندرويد
 */
export const OngoingPrayerService = {
  init(): void {
    LiveActivityService.syncWithNativeForegroundService();
  },
  destroy(): void {},
  updateNow(): void {
    LiveActivityService.syncWithNativeForegroundService();
  },
  async syncWithPrayerData(_data?: any): Promise<void> {
    LiveActivityService.syncWithNativeForegroundService();
  },
  isOngoingEnabled(): boolean {
    return true;
  },
};

