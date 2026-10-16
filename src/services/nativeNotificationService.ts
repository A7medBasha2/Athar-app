import { LocalNotifications, Channel, LocalNotificationSchema } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Coordinates, PrayerCalculationMethod } from '../types';
import { StorageService } from './storageService';
import { AstronomicalPrayerEngine } from './astronomicalPrayerEngine';
import { formatPrayerTime12 } from './prayerTimesService';
import { VERIFIED_DHIKR_REMINDERS } from '../data/dhikrRemindersData';
import { MORNING_ADHKAR, EVENING_ADHKAR } from '../data/adhkarData';
import { NativePermissionsBridge } from './nativePermissionsBridge';

// ==========================================
// 14 DISTINCT CATEGORY IDENTIFIERS & STATIC IDS
// ==========================================
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

export type AtharNotificationCategory =
  | typeof CAT_PRAYER_ATHAN
  | typeof CAT_IQAMAH
  | typeof CAT_POST_ADHAN_DUA
  | typeof CAT_QURAN_AYAH
  | typeof CAT_QURAN_WIRD
  | typeof CAT_SALAWAT
  | typeof CAT_DHIKR_TASBEEH
  | typeof CAT_MORNING_EVENING
  | typeof CAT_PARENTS_DUTY
  | typeof CAT_ONGOING_PRAYER
  | typeof CAT_SYSTEM_OVERLAY_ATHAN
  | typeof CAT_SMART_ALARM
  | typeof CAT_CALL_INTERRUPTION
  | typeof CAT_SMART_SILENCE;

// Static Unique Notification IDs (guarantees NO duplicates or stacking)
export const NOTIFICATION_STATIC_IDS: Record<AtharNotificationCategory, number> = {
  [CAT_PRAYER_ATHAN]: 1001,
  [CAT_IQAMAH]: 1002,
  [CAT_POST_ADHAN_DUA]: 1003,
  [CAT_QURAN_AYAH]: 1004,
  [CAT_QURAN_WIRD]: 1005,
  [CAT_SALAWAT]: 1006,
  [CAT_DHIKR_TASBEEH]: 1007,
  [CAT_MORNING_EVENING]: 1008,
  [CAT_PARENTS_DUTY]: 1009,
  [CAT_ONGOING_PRAYER]: 1010,
  [CAT_SYSTEM_OVERLAY_ATHAN]: 1011,
  [CAT_SMART_ALARM]: 1012,
  [CAT_CALL_INTERRUPTION]: 1013,
  [CAT_SMART_SILENCE]: 1014,
};

// Android Notification Channels (Importance 5 = MAX for Heads-Up System Tray Alerts)
export const PRAYER_CHANNEL_ID = 'athar_athan_channel';
export const IQAMAH_CHANNEL_ID = 'athar_iqamah_channel';
export const ADHKAR_CHANNEL_ID = 'athar_dhikr_channel';
export const SALAWAT_DHIKR_CHANNEL_ID = 'athar_dhikr_channel';
export const QURAN_CHANNEL_ID = 'athar_quran_channel';
export const PARENTS_CHANNEL_ID = 'athar_parents_channel';
export const MAIN_CHANNEL_ID = 'athar_system_channel';
export const REMINDERS_CHANNEL_ID = SALAWAT_DHIKR_CHANNEL_ID;

// Curated Quran Verses for "اقرأ لو آية"
const CURATED_QURAN_VERSES = [
  { surah: 'الطور', ayah: 48, text: '﴿وَاصْبِرْ لِحُكْمِ رَبِّكَ فَإِنَّكَ بِأَعْيُنِنَا ۖ وَسَبِّحْ بِحَمْدِ رَبِّكَ حِينَ تَقُومُ﴾' },
  { surah: 'الرعد', ayah: 28, text: '﴿الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ﴾' },
  { surah: 'الطلاق', ayah: '2-3', text: '﴿وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا · وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ﴾' },
  { surah: 'غافر', ayah: 60, text: '﴿وَقَالَ رَبُّكُمُ ادْعُونِي أَسْتَجِبْ لَكُمْ﴾' },
  { surah: 'الشرح', ayah: '5-6', text: '﴿فَإِنَّ مَعَ الْعُسْرِ يُسْرًا · إِنَّ مَعَ الْعُسْرِ يُسْرًا﴾' },
  { surah: 'البقرة', ayah: 152, text: '﴿فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِي﴾' },
  { surah: 'الأعراف', ayah: 156, text: '﴿وَرَحْمَتِي وَسِعَتْ كُلَّ شَيْءٍ﴾' },
  { surah: 'البقرة', ayah: 186, text: '﴿وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ﴾' },
  { surah: 'الزمر', ayah: 53, text: '﴿قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ ۚ إِنَّ اللَّهَ يَغْفِرُ الذُّنُوبَ جَمِيعًا﴾' },
  { surah: 'البقرة', ayah: 286, text: '﴿لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا﴾' },
  { surah: 'آل عمران', ayah: 173, text: '﴿الَّذِينَ قَالَ لَهُمُ النَّاسُ إِنَّ النَّاسَ قَدْ جَمَعُوا لَكُمْ فَاخْشَوْهُمْ فَزَادَهُمْ إِيمَانًا وَقَالُوا حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ﴾' },
  { surah: 'الأنعام', ayah: 59, text: '﴿وَعِندَهُ مَفَاتِحُ الْغَيْبِ لَا يَعْلَمُهَا إِلَّا هُوَ ۚ وَيَعْلَمُ مَا فِي الْبَرِّ وَالْبَحْرِ ۚ وَمَا تَسْقُطُ مِن وَرَقَةٍ إِلَّا يَعْلَمُهَا﴾' },
];

// Curated Parents Reminders
const CURATED_PARENTS_REMINDERS = [
  {
    verse: '﴿وَقَضَىٰ رَبُّكَ أَلَّا تَعْبُدُوا إِلَّا إِيَّاهُ وَبِالْوَالِدَيْنِ إِحْسَانًا﴾',
    action: 'اتصل بهما الآن، قبّل أيديهما، أو ادعُ لهما بالرحمة والمغفرة.',
  },
  {
    verse: '﴿رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا﴾',
    action: 'رضا الله تعالى في رضا الوالدين.. بادر بالسؤال عنهما وإدخال السرور على قلوبهما.',
  },
  {
    verse: '﴿وَوَصَّيْنَا الْإِنسَانَ بِوَالِدَيْهِ حُسْنًا﴾',
    action: 'طاعة الوالدين وبرهما باب من أبواب الجنة المفتوحة لك اليوم.. لا تفوته.',
  },
  {
    verse: '﴿رَّبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِمَن دَخَلَ بَيْتِيَ مُؤْمِنًا﴾',
    action: 'بركة يومك ورزقك تبدأ بدعوة صادقة لوالديك والاطمئنان عليهما.',
  },
];

export interface ImmediateNotificationPayload {
  category: AtharNotificationCategory;
  title: string;
  body: string;
  badge?: string;
  audioUrl?: string;
  playSound?: boolean;
  targetTab?: string;
  extra?: Record<string, any>;
}

class UnifiedNotificationManager {
  private isInitialized = false;
  private actionListenerBound = false;
  private isSchedulingInProgress = false;
  private lastDispatchedTime = 0;
  private lastDispatchedKey = '';

  public isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  public async requestSystemPermissions(): Promise<boolean> {
    try {
      const checkStatus = await LocalNotifications.checkPermissions();
      if (checkStatus.display !== 'granted') {
        const reqResult = await LocalNotifications.requestPermissions();
        if (reqResult.display !== 'granted') {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  public async checkSystemPermissions(): Promise<boolean> {
    try {
      const checkStatus = await LocalNotifications.checkPermissions();
      return checkStatus.display === 'granted';
    } catch {
      return false;
    }
  }

  public async createNotificationChannels(): Promise<void> {
    try {
      const channels: Channel[] = [
        {
          id: PRAYER_CHANNEL_ID,
          name: 'أذان الصلوات والمنبه الملكي (أثر)',
          description: 'تنبيهات الأذان والصلوات الخمس ذات الأولوية الملكية مع الصوت الكامل',
          importance: 5,
          visibility: 1,
          vibration: true,
          lights: true,
          lightColor: '#E6C66E',
        },
        {
          id: IQAMAH_CHANNEL_ID,
          name: 'تنبيهات إقامة الصلاة',
          description: 'تنبيهات اقتراب إقامة الصلاة والاستعداد للوقوف في المحراب',
          importance: 5,
          visibility: 1,
          vibration: true,
          lights: true,
          lightColor: '#D4AF37',
        },
        {
          id: QURAN_CHANNEL_ID,
          name: 'المصحف والورد القرآني (اقرأ لو آية)',
          description: 'آيات قرآنية مختارة وتدبر يومي للورد',
          importance: 5,
          visibility: 1,
          lights: true,
          lightColor: '#E6C66E',
        },
        {
          id: SALAWAT_DHIKR_CHANNEL_ID,
          name: 'الأذكار والتسبيح والصلوات على النبي ﷺ',
          description: 'أذكار الصباح والمساء والصلوات والتسبيحات الـ 13 المعتمدة',
          importance: 4,
          visibility: 1,
          lights: true,
          lightColor: '#D4AF37',
        },
        {
          id: PARENTS_CHANNEL_ID,
          name: 'بر الوالدين وصلة الرحم',
          description: 'تنبيهات الوصية بالوالدين والإحسان إليهما',
          importance: 4,
          visibility: 1,
        },
        {
          id: MAIN_CHANNEL_ID,
          name: 'تنبيهات أثر الذكية والسكينة',
          description: 'وضع السكون الذكي أثناء الصلاة وتنبيهات استئناف الاستماع',
          importance: 4,
          visibility: 1,
        },
        {
          id: 'athar_ongoing_prayer_channel_v2',
          name: 'شريط مواقيت الصلاة الدائم (أثر)',
          description: 'عرض دائم لمواقيت الصلوات الخمس والعد التنازلي الحي في شريط الإشعارات',
          importance: 3,
          visibility: 1,
          vibration: false,
        },
      ];

      for (const channel of channels) {
        await LocalNotifications.createChannel(channel);
      }
    } catch (err) {
      console.warn('[UnifiedNotificationManager] createNotificationChannels error:', err);
    }
  }

  public async cancelAllScheduledNotifications(): Promise<void> {
    try {
      const pending = await LocalNotifications.getPending();
      if (pending?.notifications && pending.notifications.length > 0) {
        const toCancel = pending.notifications.map((n) => ({ id: n.id }));
        await LocalNotifications.cancel({ notifications: toCancel });
      }
      try {
        await LocalNotifications.removeAllDeliveredNotifications();
      } catch {}
    } catch (err) {
      console.warn('[UnifiedNotificationManager] cancelAll error:', err);
    }
  }

  /**
   * Dispatches an immediate notification across any of the 14 sections with static ID
   * and anti-overlap audio guard.
   */
  public async dispatchImmediate(payload: ImmediateNotificationPayload): Promise<void> {
    const now = Date.now();
    const key = `${payload.category}:${payload.title}`;

    if (key === this.lastDispatchedKey && now - this.lastDispatchedTime < 10000) {
      return; // Anti-spam duplicate suppress
    }
    this.lastDispatchedTime = now;
    this.lastDispatchedKey = key;

    const staticId = NOTIFICATION_STATIC_IDS[payload.category] || 1999;
    const badge = payload.badge || this.getDefaultBadge(payload.category);
    const targetTab = payload.targetTab || this.getDefaultTab(payload.category);

    try {
      if (this.isNative()) {
        await NativePermissionsBridge.showRoyalNotification({
          title: payload.title,
          body: payload.body,
          badge,
          category: payload.category,
          audioUrl: payload.audioUrl,
          playSound: payload.playSound ?? Boolean(payload.audioUrl),
          id: staticId,
        });
      } else {
        // Web / PWA fallback
        await LocalNotifications.schedule({
          notifications: [
            {
              id: staticId,
              title: payload.title,
              body: payload.body,
              channelId: this.getChannelId(payload.category),
              smallIcon: 'ic_stat_athar',
              iconColor: '#D4AF37',
              autoCancel: true,
              extra: {
                category: payload.category,
                target_tab: targetTab,
                ...(payload.extra || {}),
              },
            },
          ],
        });
      }
    } catch (err) {
      console.warn('[UnifiedNotificationManager] dispatchImmediate error:', err);
    }
  }

  /**
   * Backward-compatible alias for dispatching an immediate native notification
   */
  public async dispatchImmediateNativeNotification(payload: {
    title: string;
    body: string;
    channelId?: string;
    extra?: Record<string, any>;
    id?: number;
  }): Promise<void> {
    const rawType = payload.extra?.category || payload.extra?.type;
    let category: AtharNotificationCategory = CAT_PRAYER_ATHAN;
    if (rawType === 'prayer') category = CAT_PRAYER_ATHAN;
    else if (rawType === 'iqamah') category = CAT_IQAMAH;
    else if (rawType === 'quran') category = CAT_QURAN_AYAH;
    else if (rawType === 'wird') category = CAT_QURAN_WIRD;
    else if (rawType === 'salawat') category = CAT_SALAWAT;
    else if (rawType === 'dhikr') category = CAT_DHIKR_TASBEEH;
    else if (rawType === 'parents') category = CAT_PARENTS_DUTY;
    else if (rawType && rawType in NOTIFICATION_STATIC_IDS) category = rawType as AtharNotificationCategory;

    await this.dispatchImmediate({
      category,
      title: payload.title,
      body: payload.body,
      badge: payload.extra?.badge,
      audioUrl: payload.extra?.audioUrl,
      playSound: payload.extra?.playSound,
      targetTab: payload.extra?.target_tab,
      extra: payload.extra,
    });
  }

  public async muteAudio(): Promise<boolean> {
    return await NativePermissionsBridge.muteNotificationAudio();
  }

  public async unmuteAudio(): Promise<boolean> {
    return await NativePermissionsBridge.unmuteNotificationAudio();
  }

  public async toggleAudio(): Promise<boolean> {
    return await NativePermissionsBridge.toggleNotificationAudio();
  }

  public async pauseAudio(): Promise<boolean> {
    return await NativePermissionsBridge.pauseNotificationAudio();
  }

  public async resumeAudio(): Promise<boolean> {
    return await NativePermissionsBridge.resumeNotificationAudio();
  }

  public async getAudioTimeline(): Promise<{ isPlaying: boolean; isMuted: boolean; positionMs: number; durationMs: number }> {
    return await NativePermissionsBridge.getNotificationAudioTimeline();
  }

  /**
   * Helper dispatchers for all 14 categories:
   */
  public async dispatchPrayerAthan(prayerName: string, timeStr: string, audioUrl?: string) {
    await this.dispatchImmediate({
      category: CAT_PRAYER_ATHAN,
      title: `حان الآن موعد ${prayerName}`,
      body: `الله أكبر · الله أكبر\nحي على الصلاة · حي على الفلاح (${timeStr})`,
      badge: '🕌 أذان الصلاة',
      audioUrl: audioUrl || 'public/audio/adhan_makkah.mp3',
      playSound: true,
      targetTab: 'prayers',
    });
  }

  public async dispatchIqamahAlert(prayerName: string, remainingMins: number) {
    await this.dispatchImmediate({
      category: CAT_IQAMAH,
      title: `اقتربت إقامة ${prayerName}`,
      body: `متبقي ${remainingMins} دقيقة على إقامة الصلاة.. استعد للوقوف بين يدي الله بتطهر وسكينة.`,
      badge: '⏳ إقامة الصلاة',
      audioUrl: 'public/audio/iqamah.mp3',
      playSound: true,
      targetTab: 'prayers',
    });
  }

  public async dispatchPostAdhanDua() {
    await this.dispatchImmediate({
      category: CAT_POST_ADHAN_DUA,
      title: 'دعاء ما بعد الأذان والوسيلة',
      body: 'اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ.',
      badge: '🤲 دعاء ما بعد الأذان',
      audioUrl: 'public/audio/dua_after_adhan.mp3',
      playSound: true,
      targetTab: 'prayers',
    });
  }

  public async dispatchQuranAyah(surah: string, ayah: string | number, text: string) {
    await this.dispatchImmediate({
      category: CAT_QURAN_AYAH,
      title: `اقرأ لو آية · سورة ${surah} [${ayah}]`,
      body: text,
      badge: '📖 اقرأ لو آية',
      audioUrl: 'public/audio/quran_sample.mp3',
      targetTab: 'quran',
    });
  }

  public async dispatchQuranWird(wirdTitle: string = 'ورد القرآن اليومي') {
    await this.dispatchImmediate({
      category: CAT_QURAN_WIRD,
      title: 'تذكير الورد القرآني اليومي',
      body: `حان موعد ${wirdTitle}.. لا تهجر كتاب ربك واجعل لقلبك نصيباً من نور التلاوة والتدبر اليوم.`,
      badge: '📜 ورد القرآن اليومي',
      audioUrl: 'public/audio/wird.mp3',
      targetTab: 'quran',
    });
  }

  public async dispatchSalawat() {
    await this.dispatchImmediate({
      category: CAT_SALAWAT,
      title: 'الصلاة على الحبيب المصطفى ﷺ',
      body: 'اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّنَا مُحَمَّدٍ وَعَلَى آلِهِ وَصَحْبِهِ أَجْمَعِينَ · مَن صلّى عليّ صلاةً صلّى الله عليه بها عشراً.',
      badge: '💚 الصلاة على النبي ﷺ',
      audioUrl: 'public/audio/salawat.mp3',
      playSound: true,
      targetTab: 'reminders',
    });
  }

  public async dispatchDhikrTasbeeh(dhikrText: string, fadl?: string, audioUrl?: string) {
    await this.dispatchImmediate({
      category: CAT_DHIKR_TASBEEH,
      title: 'تسبيح وذكر الله المبارك',
      body: `${dhikrText}${fadl ? `\n· ${fadl}` : ''}`,
      badge: '📿 تسبيح وأذكار',
      audioUrl: audioUrl || 'public/audio/dhikr_sample.mp3',
      playSound: Boolean(audioUrl),
      targetTab: 'adhkar',
    });
  }

  public async dispatchMorningEveningAdhkar(isMorning: boolean) {
    const title = isMorning ? 'أذكار الصباح وحفظ اليوم' : 'أذكار المساء وسكينة الليل';
    const body = isMorning
      ? 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ · ابدأ يومك بحصن المسلم.'
      : 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ · استجلب الطمأنينة لأمسيتك.';
    await this.dispatchImmediate({
      category: CAT_MORNING_EVENING,
      title,
      body,
      badge: isMorning ? '🌅 أذكار الصباح' : '🌙 أذكار المساء',
      audioUrl: 'public/audio/dhikr_sample.mp3',
      targetTab: 'adhkar',
    });
  }

  public async dispatchParentsDuty() {
    const item = CURATED_PARENTS_REMINDERS[Math.floor(Math.random() * CURATED_PARENTS_REMINDERS.length)];
    await this.dispatchImmediate({
      category: CAT_PARENTS_DUTY,
      title: 'بر الوالدين وصلة الأرحام',
      body: `${item.verse}\n${item.action}`,
      badge: '🤍 بر الوالدين',
      audioUrl: 'public/audio/parents.mp3',
      playSound: true,
      targetTab: 'reminders',
    });
  }

  public async dispatchSmartAlarm(alarmTitle: string, prayerName: string, timeStr: string) {
    await this.dispatchImmediate({
      category: CAT_SMART_ALARM,
      title: `${alarmTitle}: ${prayerName} (${timeStr})`,
      body: 'الصلاة خير من النوم · قم وأقبل على ربك في خلوات الليل والأسحار واظفر بالسكينة.',
      badge: '⏰ منبه أثر الذكي',
      audioUrl: 'public/audio/salat_khayr_min_nawm.mp3',
      playSound: true,
      targetTab: 'reminders',
    });
  }

  public async dispatchCallInterruptionResumption(title: string = 'استئناف الاستماع للتلاوة') {
    await this.dispatchImmediate({
      category: CAT_CALL_INTERRUPTION,
      title: 'استئناف الاستماع بعد المكالمة',
      body: `تم إيقاف الصوت مؤقتاً أثناء المكالمة الهاتفية (${title}) · اضغط هنا للاستئناف فوراً.`,
      badge: '📞 استئناف الاستماع',
      targetTab: 'quran',
    });
  }

  public async dispatchSmartSilence(isActive: boolean, prayerName?: string) {
    await this.dispatchImmediate({
      category: CAT_SMART_SILENCE,
      title: isActive ? `وضع السكون مفعل: صلاة ${prayerName || 'المسجد'}` : 'تم انتهاء وقت الصلاة واستعادة الصوت',
      body: isActive
        ? 'تم كتم أصوات الهاتف والتنبيهات تلقائياً تقديراً لحرمة الصلاة والمسجد · تقبل الله طاعتكم.'
        : 'تمت استعادة الوضع الصوتي الطبيعي لجهازك بنجاح.',
      badge: '🔕 السكون أثناء الصلاة',
      targetTab: 'settings',
    });
  }

  // ==========================================
  // 7-DAY NATIVE SCHEDULING ENGINE
  // ==========================================
  public async scheduleAllNativeNotifications(daysAhead: number = 2, force: boolean = false): Promise<number> {
    if (this.isSchedulingInProgress) return 0;

    const now = new Date();
    const nowMs = now.getTime();
    const lastScheduleMs = Number(localStorage.getItem('athar_last_schedule_time') || 0);

    if (!force && lastScheduleMs > 0 && nowMs - lastScheduleMs < 12 * 60 * 60 * 1000) {
      return 0;
    }

    this.isSchedulingInProgress = true;
    localStorage.setItem('athar_last_schedule_time', String(nowMs));

    try {
      await this.createNotificationChannels();
      await this.cancelAllScheduledNotifications();

      const settings = StorageService.getSettings();
      const coords: Coordinates = settings.location || {
        latitude: 30.0444,
        longitude: 31.2357,
        city: 'القاهرة',
        country: 'مصر',
        isAutoGps: false,
      };
      const method: PrayerCalculationMethod = settings.calculationMethod || '5';
      const cityName = coords.city || 'موقعك';

      const MIN_BUFFER_MS = 2 * 60 * 1000;
      const notificationsToSchedule: LocalNotificationSchema[] = [];
      const nativeAlarmsToSchedule: Array<{
        id: string;
        name: string;
        time: string;
        timestamp: number;
        audioUrl?: string;
      }> = [];

      for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + dayOffset);

        const timings = AstronomicalPrayerEngine.calculateTimingsForDate(coords, method, targetDate);
        const parseTimingDate = (timeStr: string) => {
          const [h, m] = timeStr.split(':').map(Number);
          const d = new Date(targetDate);
          d.setHours(h, m, 0, 0);
          return d;
        };

        const prayersList = [
          { key: 'fajr', name: 'صلاة الفجر', date: parseTimingDate(timings.Fajr), raw: timings.Fajr },
          { key: 'dhuhr', name: 'صلاة الظهر', date: parseTimingDate(timings.Dhuhr), raw: timings.Dhuhr },
          { key: 'asr', name: 'صلاة العصر', date: parseTimingDate(timings.Asr), raw: timings.Asr },
          { key: 'maghrib', name: 'صلاة المغرب', date: parseTimingDate(timings.Maghrib), raw: timings.Maghrib },
          { key: 'isha', name: 'صلاة العشاء', date: parseTimingDate(timings.Isha), raw: timings.Isha },
        ];
        const sunriseDate = parseTimingDate(timings.Sunrise);
        const asrDate = parseTimingDate(timings.Asr);

        // 1. Five Obligatory Prayers Athan
        prayersList.forEach((prayer, prayerIdx) => {
          const prayerTimeMs = prayer.date.getTime();
          const timeStr12 = formatPrayerTime12(prayer.raw);

          // Add to Android native exact alarm list if upcoming
          if (prayerTimeMs > nowMs + 1000) {
            nativeAlarmsToSchedule.push({
              id: prayer.key,
              name: prayer.name,
              time: timeStr12,
              timestamp: prayerTimeMs,
            });
          }

          if (prayerTimeMs > nowMs + MIN_BUFFER_MS) {
            const prayerNotifId = 100000 + dayOffset * 100 + prayerIdx * 10 + 1;

            notificationsToSchedule.push({
              id: prayerNotifId,
              title: `حان الآن موعد ${prayer.name} بتوقيت ${cityName}`,
              body: `الله أكبر · الله أكبر\nحي على الصلاة · حي على الفلاح (${timeStr12})`,
              schedule: { at: prayer.date, allowWhileIdle: true },
              channelId: PRAYER_CHANNEL_ID,
              smallIcon: 'ic_stat_athar',
              iconColor: '#D4AF37',
              autoCancel: true,
              extra: {
                category: CAT_PRAYER_ATHAN,
                prayerKey: prayer.key,
                target_tab: 'prayers',
              },
            });

            // 2. Iqamah alert (15 mins offset)
            const iqamahTime = new Date(prayerTimeMs + 15 * 60 * 1000);
            const iqamahNotifId = 200000 + dayOffset * 100 + prayerIdx * 10 + 2;
            notificationsToSchedule.push({
              id: iqamahNotifId,
              title: `اقتربت إقامة ${prayer.name}`,
              body: `استعد للوقوف بين يدي الله بتطهر وخشوع وسكينة.`,
              schedule: { at: iqamahTime, allowWhileIdle: true },
              channelId: IQAMAH_CHANNEL_ID,
              smallIcon: 'ic_stat_athar',
              iconColor: '#D4AF37',
              autoCancel: true,
              extra: {
                category: CAT_IQAMAH,
                prayerKey: prayer.key,
                target_tab: 'prayers',
              },
            });
          }
        });

        // 3. Morning & Evening Adhkar
        const morningAdhkarTime = new Date(sunriseDate.getTime() + 10 * 60 * 1000);
        if (morningAdhkarTime.getTime() > nowMs + MIN_BUFFER_MS) {
          notificationsToSchedule.push({
            id: 300000 + dayOffset * 10 + 1,
            title: 'أذكار الصباح وحفظ اليوم',
            body: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ · ابدأ يومك بذكر الله وحصن المسلم.',
            schedule: { at: morningAdhkarTime, allowWhileIdle: true },
            channelId: SALAWAT_DHIKR_CHANNEL_ID,
            smallIcon: 'ic_stat_athar',
            iconColor: '#D4AF37',
            autoCancel: true,
            extra: { category: CAT_MORNING_EVENING, target_tab: 'adhkar' },
          });
        }

        const eveningAdhkarTime = new Date(asrDate.getTime() + 45 * 60 * 1000);
        if (eveningAdhkarTime.getTime() > nowMs + MIN_BUFFER_MS) {
          notificationsToSchedule.push({
            id: 300000 + dayOffset * 10 + 2,
            title: 'أذكار المساء والسكينة',
            body: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ · استجلب الطمأنينة لأمسيتك بذكر الله.',
            schedule: { at: eveningAdhkarTime, allowWhileIdle: true },
            channelId: SALAWAT_DHIKR_CHANNEL_ID,
            smallIcon: 'ic_stat_athar',
            iconColor: '#D4AF37',
            autoCancel: true,
            extra: { category: CAT_MORNING_EVENING, target_tab: 'adhkar' },
          });
        }

        // 4. Daily "Read an Ayah"
        const ayahTime = new Date(targetDate);
        ayahTime.setHours(14, 0, 0, 0);
        if (ayahTime.getTime() > nowMs + MIN_BUFFER_MS) {
          const ayah = CURATED_QURAN_VERSES[(dayOffset * 3) % CURATED_QURAN_VERSES.length];
          notificationsToSchedule.push({
            id: 400000 + dayOffset * 10 + 1,
            title: `اقرأ لو آية · سورة ${ayah.surah} [${ayah.ayah}]`,
            body: ayah.text,
            schedule: { at: ayahTime, allowWhileIdle: true },
            channelId: QURAN_CHANNEL_ID,
            smallIcon: 'ic_stat_athar',
            iconColor: '#D4AF37',
            autoCancel: true,
            extra: { category: CAT_QURAN_AYAH, target_tab: 'quran' },
          });
        }

        // 5. Daily Quran Wird
        const wirdTime = new Date(targetDate);
        wirdTime.setHours(21, 30, 0, 0);
        if (wirdTime.getTime() > nowMs + MIN_BUFFER_MS) {
          notificationsToSchedule.push({
            id: 400000 + dayOffset * 10 + 2,
            title: 'تذكير الورد القرآني اليومي',
            body: 'اجعل لقلبك نصيباً من نور التلاوة والتدبر قبل نومك.',
            schedule: { at: wirdTime, allowWhileIdle: true },
            channelId: QURAN_CHANNEL_ID,
            smallIcon: 'ic_stat_athar',
            iconColor: '#D4AF37',
            autoCancel: true,
            extra: { category: CAT_QURAN_WIRD, target_tab: 'quran' },
          });
        }

        // 6. Salawat upon the Prophet ﷺ
        const salawatTime = new Date(targetDate);
        salawatTime.setHours(16, 30, 0, 0);
        if (salawatTime.getTime() > nowMs + MIN_BUFFER_MS) {
          notificationsToSchedule.push({
            id: 500000 + dayOffset * 10 + 1,
            title: 'الصلاة على الحبيب المصطفى ﷺ',
            body: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ · مَن صلّى عليّ صلاةً صلّى الله عليه بها عشراً.',
            schedule: { at: salawatTime, allowWhileIdle: true },
            channelId: SALAWAT_DHIKR_CHANNEL_ID,
            smallIcon: 'ic_stat_athar',
            iconColor: '#D4AF37',
            autoCancel: true,
            extra: { category: CAT_SALAWAT, target_tab: 'reminders' },
          });
        }

        // 7. Parents Duty reminder
        const parentsTime = new Date(targetDate);
        parentsTime.setHours(19, 0, 0, 0);
        if (parentsTime.getTime() > nowMs + MIN_BUFFER_MS) {
          const item = CURATED_PARENTS_REMINDERS[dayOffset % CURATED_PARENTS_REMINDERS.length];
          notificationsToSchedule.push({
            id: 600000 + dayOffset * 10 + 1,
            title: 'بر الوالدين والإحسان',
            body: `${item.verse}\n${item.action}`,
            schedule: { at: parentsTime, allowWhileIdle: true },
            channelId: PARENTS_CHANNEL_ID,
            smallIcon: 'ic_stat_athar',
            iconColor: '#D4AF37',
            autoCancel: true,
            extra: { category: CAT_PARENTS_DUTY, target_tab: 'reminders' },
          });
        }
      }

      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({ notifications: notificationsToSchedule });
      }

      // Schedule exact Android AlarmManager alarms for full-screen Athan
      if (NativePermissionsBridge.isNative() && nativeAlarmsToSchedule.length > 0) {
        try {
          await NativePermissionsBridge.scheduleNativePrayerAlarms(nativeAlarmsToSchedule);
        } catch (alarmErr) {
          console.warn('[UnifiedNotificationManager] scheduleNativePrayerAlarms error:', alarmErr);
        }
      }

      return notificationsToSchedule.length;
    } catch (err) {
      console.warn('[UnifiedNotificationManager] scheduleAllNativeNotifications error:', err);
      return 0;
    } finally {
      this.isSchedulingInProgress = false;
    }
  }

  public async initAndScheduleAll(autoRequestPermissions: boolean = false): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      if (autoRequestPermissions) {
        await this.requestSystemPermissions();
      }
      await this.createNotificationChannels();
      const hasPerm = await this.checkSystemPermissions();
      if (hasPerm) {
        await this.scheduleAllNativeNotifications(2);
      }
      this.setupActionListener();
    } catch (err) {
      console.warn('[UnifiedNotificationManager] initAndScheduleAll error:', err);
    }
  }

  private setupActionListener(): void {
    if (this.actionListenerBound) return;
    this.actionListenerBound = true;

    try {
      LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        const extra = action.notification.extra;
        const targetTab = extra?.target_tab || this.getDefaultTab(extra?.category);

        if (targetTab && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('athar_navigate_tab', { detail: { tab: targetTab } }));
        }
      }).catch(() => {});
    } catch {}
  }

  private getDefaultBadge(category: AtharNotificationCategory): string {
    switch (category) {
      case CAT_PRAYER_ATHAN:
        return '🕌 أذان الصلاة';
      case CAT_IQAMAH:
        return '⏳ إقامة الصلاة';
      case CAT_POST_ADHAN_DUA:
        return '🤲 دعاء ما بعد الأذان';
      case CAT_QURAN_AYAH:
        return '📖 اقرأ لو آية';
      case CAT_QURAN_WIRD:
        return '📜 ورد القرآن اليومي';
      case CAT_SALAWAT:
        return '💚 الصلاة على النبي ﷺ';
      case CAT_DHIKR_TASBEEH:
        return '📿 تسبيح وأذكار';
      case CAT_MORNING_EVENING:
        return '🌅 أذكار اليوم';
      case CAT_PARENTS_DUTY:
        return '🤍 بر الوالدين';
      case CAT_ONGOING_PRAYER:
        return '🕋 مواقيت الصلاة';
      case CAT_SYSTEM_OVERLAY_ATHAN:
        return '✨ تنبيه أثر الملكي';
      case CAT_SMART_ALARM:
        return '⏰ منبه أثر الذكي';
      case CAT_CALL_INTERRUPTION:
        return '📞 استئناف الاستماع';
      case CAT_SMART_SILENCE:
        return '🔕 السكون أثناء الصلاة';
      default:
        return '🕌 تنبيه أثر الملكي';
    }
  }

  private getDefaultTab(category?: string): string {
    switch (category) {
      case CAT_PRAYER_ATHAN:
      case CAT_IQAMAH:
      case CAT_POST_ADHAN_DUA:
      case CAT_ONGOING_PRAYER:
      case CAT_SYSTEM_OVERLAY_ATHAN:
        return 'prayers';
      case CAT_QURAN_AYAH:
      case CAT_QURAN_WIRD:
      case CAT_CALL_INTERRUPTION:
        return 'quran';
      case CAT_SALAWAT:
      case CAT_PARENTS_DUTY:
      case CAT_SMART_ALARM:
        return 'reminders';
      case CAT_DHIKR_TASBEEH:
      case CAT_MORNING_EVENING:
        return 'adhkar';
      case CAT_SMART_SILENCE:
        return 'settings';
      default:
        return 'home';
    }
  }

  private getChannelId(category: AtharNotificationCategory): string {
    switch (category) {
      case CAT_PRAYER_ATHAN:
      case CAT_SYSTEM_OVERLAY_ATHAN:
        return PRAYER_CHANNEL_ID;
      case CAT_IQAMAH:
        return IQAMAH_CHANNEL_ID;
      case CAT_QURAN_AYAH:
      case CAT_QURAN_WIRD:
        return QURAN_CHANNEL_ID;
      case CAT_PARENTS_DUTY:
        return PARENTS_CHANNEL_ID;
      case CAT_SALAWAT:
      case CAT_DHIKR_TASBEEH:
      case CAT_MORNING_EVENING:
      case CAT_POST_ADHAN_DUA:
        return SALAWAT_DHIKR_CHANNEL_ID;
      default:
        return MAIN_CHANNEL_ID;
    }
  }
}

export const NativeNotificationService = new UnifiedNotificationManager();
