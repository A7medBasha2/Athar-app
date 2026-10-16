/**
 * NativeNotificationService - تم تفريغ وحذف التنبيهات والأذان بالكامل
 * جاهز لإعادة البناء من الصفر
 */

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
  public async initAndScheduleAll(_autoRequest?: boolean): Promise<void> {
    // تم حذف التنبيهات السابقة وإيقاف الجدولة
  }

  public async cancelAllScheduledNotifications(): Promise<void> {
    // تم إلغاء كافة التنبيهات
  }

  public async dispatchImmediate(_payload: any): Promise<void> {
    // تم تفريغ الإرسال الفوري
  }

  public async dispatchImmediateNativeNotification(_payload: any): Promise<void> {
    // تم تفريغ الإرسال الفوري
  }

  public async scheduleAllNativeNotifications(): Promise<number> {
    return 0;
  }
}

export const NativeNotificationService = new UnifiedNotificationManager();
