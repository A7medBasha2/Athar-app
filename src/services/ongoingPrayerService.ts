/**
 * OngoingPrayerService - إدارة ومزامنة شريط الإشعار الدائم لمواقيت الصلاة في أندرويد
 */
export const OngoingPrayerService = {
  init() {
    import('./liveActivityService')
      .then(({ LiveActivityService }) => {
        LiveActivityService.syncWithNativeForegroundService();
      })
      .catch(() => {});
  },
  destroy() {},
  updateNow() {
    import('./liveActivityService')
      .then(({ LiveActivityService }) => {
        LiveActivityService.syncWithNativeForegroundService();
      })
      .catch(() => {});
  },
  async syncWithPrayerData(_data?: any): Promise<void> {
    import('./liveActivityService')
      .then(({ LiveActivityService }) => {
        LiveActivityService.syncWithNativeForegroundService();
      })
      .catch(() => {});
  },
  isOngoingEnabled() {
    return true;
  },
};
