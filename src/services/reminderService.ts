/**
 * ReminderEngine - تم تفريغ وحذف التنبيهات والأذان بالكامل
 * جاهز لإعادة البناء من الصفر
 */

export type RoyalReminderCategory =
  | 'adhan'
  | 'quran'
  | 'wird'
  | 'parents'
  | 'salawat'
  | 'dhikr'
  | 'morning_evening'
  | 'iqamah'
  | 'post_adhan_dua'
  | 'smart_silence'
  | 'call_interruption'
  | 'test_notification';

export type ObligatoryPrayerId = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export const ReminderEngine = {
  start() {},
  stop() {},
  restart() {},
  triggerTestReminder(_category?: string) {},
  testQuranVerseReminder() {},
  testSalawatReminder() {},
  testParentsReminder() {},
  testDhikrReminder(_id?: string) {},
  testMorningAdhkar() {},
  testEveningAdhkar() {},
  testDailyWirdReminder() {},
  testIqamah() {},
  testDuaAfterAdhan() {},
  testAdhan(_voice?: string, _mode?: string, _prayer?: string) {},
  testFajrAdhan() {},
  testAdhanDelayed(_seconds?: number, _prayer?: string) {},
  hasActiveAdhanScreen() {
    return false;
  },
  muteAdhanAndKeepScreenOpen() {},
  launchFullScreenAdhan(_options?: any) {},
  launchRoyalAtharOverlay(_options?: any) {},
  dismissFullScreenAdhan() {},
  dismissRoyalAtharOverlay() {},
  subscribe(_callback: any) {
    return () => {};
  },
  subscribeAdhan(_callback: any) {
    return () => {};
  },
  subscribeAdhanScreen(_callback: (state: any) => void) {
    return () => {};
  },
  getState() {
    return {
      activeAdhan: null,
      activeOverlay: null,
    };
  },
};
