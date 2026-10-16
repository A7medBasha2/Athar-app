/**
 * AlarmService - تم تفريغ وحذف منبهات الفجر والاستيقاظ بالكامل
 * جاهز لإعادة البناء من الصفر
 */

export interface IslamicAlarm {
  id: string;
  name: string;
  time: string;
  enabled: boolean;
  type: 'fajr_linked' | 'fixed_time';
  offsetMinutes?: number;
}

export type AlarmSoundId = string;

export interface AlarmSystemSettings {
  volume: number;
  vibrate: boolean;
  soundId: string;
}

export const ISLAMIC_ALARM_SOUNDS = [];

export const AlarmService = {
  start() {},
  stop() {},
  syncFajrLinkedAlarmsTimes() {},
  dismissAlarm() {},
  dismissActiveAlarm() {},
  snoozeAlarm(_minutes?: number) {},
  getAlarms(): IslamicAlarm[] {
    return [];
  },
  subscribe(_callback: any) {
    return () => {};
  },
  subscribeAlarmsChange(_callback: any) {
    return () => {};
  },
  getActiveRingingAlarm() {
    return null;
  },
  getActiveRingingState() {
    return null;
  },
  getNextUpcomingAlarmInfo() {
    return null;
  },
  getSystemSettings(): AlarmSystemSettings {
    return {
      volume: 1,
      vibrate: true,
      soundId: 'default',
    };
  },
  stopPreviewSound() {},
};
