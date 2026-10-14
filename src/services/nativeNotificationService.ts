import { LocalNotifications, Channel, LocalNotificationSchema } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Coordinates, PrayerCalculationMethod } from '../types';
import { StorageService } from './storageService';
import { AstronomicalPrayerEngine } from './astronomicalPrayerEngine';
import { formatPrayerTime12 } from './prayerTimesService';
import { VERIFIED_DHIKR_REMINDERS } from '../data/dhikrRemindersData';
import { MORNING_ADHKAR, EVENING_ADHKAR } from '../data/adhkarData';

// System Android Notification Channels (Importance 5 = MAX for Heads-Up System Tray Alerts)
export const PRAYER_CHANNEL_ID = 'athar_prayer_channel';
export const IQAMAH_CHANNEL_ID = 'athar_iqamah_channel';
export const ADHKAR_CHANNEL_ID = 'athar_adhkar_channel';
export const SALAWAT_DHIKR_CHANNEL_ID = 'athar_salawat_dhikr_channel';
export const QURAN_CHANNEL_ID = 'athar_quran_channel';
export const PARENTS_CHANNEL_ID = 'athar_parents_channel';
export const MAIN_CHANNEL_ID = 'athar_main_channel';

// Backward compatibility alias
export const REMINDERS_CHANNEL_ID = SALAWAT_DHIKR_CHANNEL_ID;

// Deterministic 32-bit Integer ID Ranges (well within 2^31 - 1 limit):
// 100,000 - 199,999: Exact Scheduled Prayers (7 days x 5 prayers)
// 200,000 - 299,999: Exact Scheduled Iqamah (7 days x 5 prayers)
// 300,000 - 399,999: Scheduled Morning & Evening Adhkar
// 400,000 - 499,999: Scheduled Quran Verses ('اقرأ لو آية') & Wird
// 500,000 - 599,999: Scheduled Salawat & Dhikr Reminders (الصلاة على النبي ﷺ والتسبيح المضاعف)
// 600,000 - 699,999: Scheduled Parents Reminders (بر الوالدين والإحسان)
// 700,000+: Immediate / Manual Test Dispatched Notifications
const BASE_PRAYER_ID = 100000;
const BASE_IQAMAH_ID = 200000;
const BASE_ADHKAR_ID = 300000;
const BASE_QURAN_ID = 400000;
const BASE_DHIKR_ID = 500000;
const BASE_PARENTS_ID = 600000;
const MAX_SCHEDULED_ID = 699999;

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

class NativeNotificationManager {
  private isInitialized = false;
  private actionListenerBound = false;
  private isSchedulingInProgress = false;

  /**
   * Checks if running inside native Capacitor environment (Android)
   */
  public isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Requests real system notification permissions from Android OS.
   */
  public async requestSystemPermissions(): Promise<boolean> {
    try {
      const checkStatus = await LocalNotifications.checkPermissions();
      if (checkStatus.display !== 'granted') {
        const reqResult = await LocalNotifications.requestPermissions();
        if (reqResult.display !== 'granted') {
          console.warn('[NativeNotificationService] Permission not granted:', reqResult.display);
          return false;
        }
      }

      // Check Android exact alarm capability if available (Android 12+ / API 31+)
      if (typeof (LocalNotifications as any).checkExactNotificationSetting === 'function') {
        try {
          const exactSetting = await (LocalNotifications as any).checkExactNotificationSetting();
          if (exactSetting.exact_alarm !== 'granted' && typeof (LocalNotifications as any).changeExactNotificationSetting === 'function') {
            console.info('[NativeNotificationService] Exact alarm setting recommended for exact notifications');
          }
        } catch {}
      }

      return true;
    } catch (err) {
      console.warn('[NativeNotificationService] requestPermissions error:', err);
      return false;
    }
  }

  /**
   * Checks whether the user has granted system notification permission.
   */
  public async checkSystemPermissions(): Promise<boolean> {
    try {
      const checkStatus = await LocalNotifications.checkPermissions();
      return checkStatus.display === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Creates Android Notification Channels with MAX importance (5),
   * public lockscreen visibility (1), vibration, sound, and gold LED light.
   * This guarantees notifications pop up as heads-up banners on Android even when app is killed!
   */
  public async createNotificationChannels(): Promise<void> {
    try {
      const channels: Channel[] = [
        {
          id: PRAYER_CHANNEL_ID,
          name: 'مواقيت الصلاة والأذان (أهمية قصوى)',
          description: 'إشعارات دخول أوقات الصلاة الخمس والأذان ذات الأولوية القصوى المنبثقة خارج التطبيق',
          importance: 5, // MAX importance -> Heads-up banner over all apps
          visibility: 1, // VISIBILITY_PUBLIC -> Visible on lock screen
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#D4AF37',
        },
        {
          id: IQAMAH_CHANNEL_ID,
          name: 'إقامة الصلاة',
          description: 'تنبيهات إقامة الصلاة والاستعداد للوقوف بين يدي الله',
          importance: 5,
          visibility: 1,
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#D4AF37',
        },
        {
          id: ADHKAR_CHANNEL_ID,
          name: 'أذكار الصباح والمساء واليوم والليلة',
          description: 'أذكار الصباح والمساء وحفظ المسلم مأخوذة من حِصن المسلم',
          importance: 5,
          visibility: 1,
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#D4AF37',
        },
        {
          id: SALAWAT_DHIKR_CHANNEL_ID,
          name: 'الصلاة على النبي ﷺ وذكر الله والتسبيح',
          description: 'تنبيهات الصلاة على النبي ﷺ، التسبيح المضاعف، والباقيات الصالحات',
          importance: 5,
          visibility: 1,
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#D4AF37',
        },
        {
          id: QURAN_CHANNEL_ID,
          name: 'اقرأ لو آية والورد القرآني',
          description: 'تنبيهات اقرأ لو آية وتذكير ورد القرآن الكريم اليومي',
          importance: 5,
          visibility: 1,
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#D4AF37',
        },
        {
          id: PARENTS_CHANNEL_ID,
          name: 'بر الوالدين والإحسان',
          description: 'تنبيهات الوصية بالوالدين والإحسان إليهما والاطمئنان عليهما',
          importance: 5,
          visibility: 1,
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#D4AF37',
        },
        {
          id: MAIN_CHANNEL_ID,
          name: 'تنبيهات أثر العامة',
          description: 'التنبيهات الإرشادية والتذكيرات العامة',
          importance: 5,
          visibility: 1,
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#D4AF37',
        },
      ];

      for (const channel of channels) {
        await LocalNotifications.createChannel(channel);
      }
      console.log('[NativeNotificationService] All 7 high-priority Android Notification Channels initialized (importance: 5).');
    } catch (err) {
      console.warn('[NativeNotificationService] createNotificationChannels error:', err);
    }
  }

  /**
   * Completely cancels all existing scheduled Athar notifications from Android's AlarmManager queue.
   */
  public async cancelAllScheduledNotifications(): Promise<void> {
    try {
      const pending = await LocalNotifications.getPending();
      if (pending && pending.notifications && pending.notifications.length > 0) {
        const toCancel = pending.notifications
          .filter((n) => n.id >= BASE_PRAYER_ID && n.id <= MAX_SCHEDULED_ID)
          .map((n) => ({ id: n.id }));

        if (toCancel.length > 0) {
          await LocalNotifications.cancel({ notifications: toCancel });
          console.log(`[NativeNotificationService] Cleaned up ${toCancel.length} old pending notifications.`);
        }
      }
    } catch (err) {
      console.warn('[NativeNotificationService] cancelAllScheduledNotifications error:', err);
    }
  }

  /**
   * MAIN REFACTORING ENGINE:
   * Converts all reminder features and existing data arrays directly into native
   * `@capacitor/local-notifications` schedule calls for the next 7 days in advance.
   *
   * Features scheduled natively:
   * 1. الصلوات والاذان (Fajr, Dhuhr, Asr, Maghrib, Isha)
   * 2. إقامة الصلاة (Iqamah offset after each prayer)
   * 3. أذكار الصباح والمساء (Authentic Morning and Evening Adhkar from MORNING_ADHKAR and EVENING_ADHKAR)
   * 4. الصلاة على النبي ﷺ وذكر الله والتسبيح المضاعف (Authentic items from VERIFIED_DHIKR_REMINDERS)
   * 5. 'اقرأ لو آية' والورد القرآني (Noble Quran Verses and Daily Wird)
   * 6. بر الوالدين والإحسان
   */
  public async scheduleAllNativeNotifications(daysAhead: number = 7): Promise<number> {
    if (this.isSchedulingInProgress) {
      return 0;
    }
    this.isSchedulingInProgress = true;

    try {
      // 1. Ensure channels are created
      await this.createNotificationChannels();

      // 2. Clear old scheduled notifications
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

      const now = new Date();
      const nowMs = now.getTime();
      const notificationsToSchedule: LocalNotificationSchema[] = [];

      const prayerDefinitions: Array<{
        key: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
        name: string;
        index: number;
        callPhrase: string;
      }> = [
        { key: 'fajr', name: 'الفجر', index: 1, callPhrase: 'الصلاة خيرٌ من النوم · حي على الصلاة، حي على الفلاح' },
        { key: 'dhuhr', name: 'الظهر', index: 2, callPhrase: 'حي على الصلاة، حي على الفلاح · أقبل على صلاتك تنل فلاحك' },
        { key: 'asr', name: 'العصر', index: 3, callPhrase: 'حافظوا على الصلوات والصلاة الوسطى · حي على الصلاة' },
        { key: 'maghrib', name: 'المغرب', index: 4, callPhrase: 'أقبلت نفحات الغروب المباركة · حي على الصلاة، حي على الفلاح' },
        { key: 'isha', name: 'العشاء', index: 5, callPhrase: 'أرحنا بها يا بلال · صلاة العشاء وقراءة ما تيسر من القرآن' },
      ];

      // Loop across the next N days
      for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
        const targetDate = new Date();
        targetDate.setDate(now.getDate() + dayOffset);

        const timings = AstronomicalPrayerEngine.calculateTimingsForDate(coords, method, targetDate);

        // --- 1. الصلوات والاذان (Exact Prayer Times) ---
        if (settings.adhanEnabled !== false) {
          for (const prayer of prayerDefinitions) {
            const timeKey = prayer.key.charAt(0).toUpperCase() + prayer.key.slice(1);
            const rawTime = (timings as any)[timeKey];
            if (!rawTime) continue;

            const cleanTime = rawTime.split(' ')[0].trim();
            const [hStr, mStr] = cleanTime.split(':');
            const h = parseInt(hStr, 10);
            const m = parseInt(mStr, 10);
            if (isNaN(h) || isNaN(m)) continue;

            const exactPrayerTime = new Date(
              targetDate.getFullYear(),
              targetDate.getMonth(),
              targetDate.getDate(),
              h,
              m,
              0,
              0
            );

            if (exactPrayerTime.getTime() > nowMs + 10000) {
              const prayerNotifId = BASE_PRAYER_ID + (dayOffset * 10) + prayer.index;
              const time12 = formatPrayerTime12(cleanTime);

              notificationsToSchedule.push({
                id: prayerNotifId,
                title: `حان الآن موعد أذان صلاة ${prayer.name}`,
                body: `${time12} · ${prayer.callPhrase} (${cityName})`,
                largeBody: `حان الآن موعد صلاة ${prayer.name} بتوقيت ${time12} في ${cityName}.\n«الصَّلَاةُ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا»`,
                summaryText: `أذان ${prayer.name} · ${time12}`,
                channelId: PRAYER_CHANNEL_ID,
                smallIcon: 'ic_stat_athar',
                iconColor: '#D4AF37',
                schedule: {
                  at: exactPrayerTime,
                  allowWhileIdle: true, // Native Android AlarmManager exact alarm
                },
                autoCancel: true,
                ongoing: false,
                foreground: true,
                isExactNotification: true,
                extra: {
                  type: 'prayer',
                  prayerKey: prayer.key,
                  prayerName: prayer.name,
                  time12,
                  cityName,
                  timestamp: exactPrayerTime.getTime(),
                },
              });

              // --- 2. إقامة الصلاة (Iqamah Reminder) ---
              if (settings.iqamahSettings?.enabled) {
                const iqamahOffset =
                  prayer.key === 'maghrib'
                    ? (settings.iqamahSettings.maghribMinutes || 10)
                    : (settings.iqamahSettings.defaultMinutes || 15);

                const iqamahTime = new Date(exactPrayerTime.getTime() + iqamahOffset * 60 * 1000);
                if (iqamahTime.getTime() > nowMs + 10000) {
                  const iqamahNotifId = BASE_IQAMAH_ID + (dayOffset * 10) + prayer.index;
                  notificationsToSchedule.push({
                    id: iqamahNotifId,
                    title: `حان الآن موعد إقامة صلاة ${prayer.name}`,
                    body: `قد قامت الصلاة، قد قامت الصلاة · استووا واعتدلوا يرحمكم الله (${cityName})`,
                    channelId: IQAMAH_CHANNEL_ID,
                    smallIcon: 'ic_stat_athar',
                    iconColor: '#D4AF37',
                    schedule: {
                      at: iqamahTime,
                      allowWhileIdle: true,
                    },
                    autoCancel: true,
                    ongoing: false,
                    foreground: true,
                    isExactNotification: true,
                    extra: {
                      type: 'iqamah',
                      prayerKey: prayer.key,
                      prayerName: prayer.name,
                    },
                  });
                }
              }
            }
          }
        }

        // --- 3. أذكار الصباح والمساء (Adhkar Morning & Evening) ---
        // Morning Adhkar: 07:00 AM
        const morningAdhkarTime = new Date(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          targetDate.getDate(),
          7,
          0,
          0,
          0
        );
        if (morningAdhkarTime.getTime() > nowMs + 10000) {
          const morningItem = MORNING_ADHKAR[dayOffset % MORNING_ADHKAR.length] || MORNING_ADHKAR[0];
          const cleanDhikrText = morningItem.arabicText.split('\n')[0].replace(/﴿|﴾/g, '').trim().slice(0, 120);

          notificationsToSchedule.push({
            id: BASE_ADHKAR_ID + (dayOffset * 10) + 1,
            title: 'أذكار الصباح · حِصن المسلم',
            body: `${cleanDhikrText}... ابدأ يومك بذكر الله وحفظه وبركته.`,
            largeBody: `${morningItem.arabicText}\n\n${morningItem.fadl}`,
            channelId: ADHKAR_CHANNEL_ID,
            smallIcon: 'ic_stat_athar',
            iconColor: '#D4AF37',
            schedule: {
              at: morningAdhkarTime,
              allowWhileIdle: true,
            },
            autoCancel: true,
            ongoing: false,
            foreground: true,
            isExactNotification: true,
            extra: {
              type: 'adhkar',
              category: 'morning',
              dhikrId: morningItem.id,
            },
          });
        }

        // Evening Adhkar: 17:00 (5:00 PM)
        const eveningAdhkarTime = new Date(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          targetDate.getDate(),
          17,
          0,
          0,
          0
        );
        if (eveningAdhkarTime.getTime() > nowMs + 10000) {
          const eveningItem = EVENING_ADHKAR[dayOffset % EVENING_ADHKAR.length] || EVENING_ADHKAR[0];
          const cleanDhikrText = eveningItem.arabicText.split('\n')[0].replace(/﴿|﴾/g, '').trim().slice(0, 120);

          notificationsToSchedule.push({
            id: BASE_ADHKAR_ID + (dayOffset * 10) + 2,
            title: 'أذكار المساء · حِصن المسلم',
            body: `${cleanDhikrText}... حصّن نفسك وأهلك بنفحات المساء المباركة.`,
            largeBody: `${eveningItem.arabicText}\n\n${eveningItem.fadl}`,
            channelId: ADHKAR_CHANNEL_ID,
            smallIcon: 'ic_stat_athar',
            iconColor: '#D4AF37',
            schedule: {
              at: eveningAdhkarTime,
              allowWhileIdle: true,
            },
            autoCancel: true,
            ongoing: false,
            foreground: true,
            isExactNotification: true,
            extra: {
              type: 'adhkar',
              category: 'evening',
              dhikrId: eveningItem.id,
            },
          });
        }

        // --- 4. الصلاة على النبي ﷺ وذكر الله والتسبيح المضاعف ---
        // Distributed times throughout the day: 09:30, 11:30, 14:30, 16:30, 19:30, 21:00
        const isSalawatEnabled = settings.salawatReminder?.enabled ?? true;
        const isDhikrEnabled = settings.dhikrReminder?.enabled ?? true;

        if (isSalawatEnabled || isDhikrEnabled) {
          const dhikrSlots = [
            { h: 9, m: 30, slotIdx: 1 },
            { h: 11, m: 30, slotIdx: 2 },
            { h: 14, m: 30, slotIdx: 3 },
            { h: 16, m: 30, slotIdx: 4 },
            { h: 19, m: 30, slotIdx: 5 },
            { h: 21, m: 0, slotIdx: 6 },
          ];

          dhikrSlots.forEach((slot, sIdx) => {
            const slotTime = new Date(
              targetDate.getFullYear(),
              targetDate.getMonth(),
              targetDate.getDate(),
              slot.h,
              slot.m,
              0,
              0
            );

            if (slotTime.getTime() > nowMs + 10000) {
              const itemIdx = (dayOffset * 6 + sIdx) % VERIFIED_DHIKR_REMINDERS.length;
              const dhikrItem = VERIFIED_DHIKR_REMINDERS[itemIdx];

              const notifId = BASE_DHIKR_ID + (dayOffset * 20) + slot.slotIdx;
              notificationsToSchedule.push({
                id: notifId,
                title: `${dhikrItem.categoryLabel}: ${dhikrItem.title}`,
                body: dhikrItem.arabicText,
                largeBody: `${dhikrItem.arabicText}\n\nفضل الذكر: ${dhikrItem.fadl}`,
                channelId: SALAWAT_DHIKR_CHANNEL_ID,
                smallIcon: 'ic_stat_athar',
                iconColor: '#D4AF37',
                schedule: {
                  at: slotTime,
                  allowWhileIdle: true,
                },
                autoCancel: true,
                ongoing: false,
                foreground: true,
                isExactNotification: true,
                extra: {
                  type: 'dhikr',
                  dhikrId: dhikrItem.id,
                  category: dhikrItem.categoryLabel,
                },
              });
            }
          });
        }

        // --- 5. "اقرأ لو آية" والورد القرآني (Noble Quran Verses & Daily Wird) ---
        const isQuranEnabled = settings.quranVerseReminder?.enabled ?? true;
        const isWirdEnabled = settings.dailyWirdReminder?.enabled ?? true;

        if (isQuranEnabled) {
          // Scheduled at 10:15 and 20:15
          const quranTimes = [
            { h: 10, m: 15, subIdx: 1 },
            { h: 20, m: 15, subIdx: 2 },
          ];

          quranTimes.forEach((qTime, qIdx) => {
            const verseScheduleTime = new Date(
              targetDate.getFullYear(),
              targetDate.getMonth(),
              targetDate.getDate(),
              qTime.h,
              qTime.m,
              0,
              0
            );

            if (verseScheduleTime.getTime() > nowMs + 10000) {
              const verseIdx = (dayOffset * 2 + qIdx) % CURATED_QURAN_VERSES.length;
              const verseItem = CURATED_QURAN_VERSES[verseIdx];

              notificationsToSchedule.push({
                id: BASE_QURAN_ID + (dayOffset * 10) + qTime.subIdx,
                title: `اقرأ لو آية ﴿سورة ${verseItem.surah} - آية ${verseItem.ayah}﴾`,
                body: verseItem.text,
                largeBody: `${verseItem.text}\n\n«خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ» - نوّر قلبك بتلاوة آيات الله`,
                channelId: QURAN_CHANNEL_ID,
                smallIcon: 'ic_stat_athar',
                iconColor: '#D4AF37',
                schedule: {
                  at: verseScheduleTime,
                  allowWhileIdle: true,
                },
                autoCancel: true,
                ongoing: false,
                foreground: true,
                isExactNotification: true,
                extra: {
                  type: 'quran',
                  surah: verseItem.surah,
                  ayah: verseItem.ayah,
                },
              });
            }
          });
        }

        if (isWirdEnabled) {
          // Daily Wird at 13:30 (1:30 PM)
          const wirdScheduleTime = new Date(
            targetDate.getFullYear(),
            targetDate.getMonth(),
            targetDate.getDate(),
            13,
            30,
            0,
            0
          );

          if (wirdScheduleTime.getTime() > nowMs + 10000) {
            notificationsToSchedule.push({
              id: BASE_QURAN_ID + (dayOffset * 10) + 5,
              title: 'تذكير الورد القرآني اليومي',
              body: '﴿وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا﴾ حان موعد وردك المبارك من القرآن الكريم - رتّل آيات الله ونوّر قلبك ويومك.',
              channelId: QURAN_CHANNEL_ID,
              smallIcon: 'ic_stat_athar',
              iconColor: '#D4AF37',
              schedule: {
                at: wirdScheduleTime,
                allowWhileIdle: true,
              },
              autoCancel: true,
              ongoing: false,
              foreground: true,
              isExactNotification: true,
              extra: {
                type: 'wird',
              },
            });
          }
        }

        // --- 6. بر الوالدين والإحسان (Parents Reminder) ---
        const isParentsEnabled = settings.parentsReminder?.enabled ?? true;
        if (isParentsEnabled) {
          // Daily Parents reminder at 18:30 (6:30 PM)
          const parentsTime = new Date(
            targetDate.getFullYear(),
            targetDate.getMonth(),
            targetDate.getDate(),
            18,
            30,
            0,
            0
          );

          if (parentsTime.getTime() > nowMs + 10000) {
            const pIdx = dayOffset % CURATED_PARENTS_REMINDERS.length;
            const pItem = CURATED_PARENTS_REMINDERS[pIdx];

            notificationsToSchedule.push({
              id: BASE_PARENTS_ID + (dayOffset * 10) + 1,
              title: 'تذكير بر الوالدين والإحسان إليهما',
              body: `${pItem.verse} · ${pItem.action}`,
              channelId: PARENTS_CHANNEL_ID,
              smallIcon: 'ic_stat_athar',
              iconColor: '#D4AF37',
              schedule: {
                at: parentsTime,
                allowWhileIdle: true,
              },
              autoCancel: true,
              ongoing: false,
              foreground: true,
              isExactNotification: true,
              extra: {
                type: 'parents',
              },
            });
          }
        }
      }

      // Schedule batch directly into Native Android AlarmManager via Capacitor LocalNotifications
      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({
          notifications: notificationsToSchedule,
        });

        console.log(
          `[NativeNotificationService] Successfully scheduled ${notificationsToSchedule.length} native notifications (Prayers, Adhkar, Salawat, Quran, Parents) across ${daysAhead} days in Android AlarmManager.`
        );

        try {
          localStorage.setItem('athar_scheduled_notification_count', String(notificationsToSchedule.length));
          localStorage.setItem('athar_last_schedule_time', String(Date.now()));
        } catch {}
      }

      return notificationsToSchedule.length;
    } catch (err) {
      console.warn('[NativeNotificationService] scheduleAllNativeNotifications error:', err);
      return 0;
    } finally {
      this.isSchedulingInProgress = false;
    }
  }

  /**
   * Helper alias for prayer time updates
   */
  public async scheduleExactPrayerNotifications(daysAhead: number = 7): Promise<number> {
    return this.scheduleAllNativeNotifications(daysAhead);
  }

  /**
   * Immediately fires a native notification directly into the Android system tray and heads-up banner
   * outside the app window (with importance: 5, sound, vibration, and gold icon).
   */
  public async dispatchImmediateNativeNotification(payload: {
    title: string;
    body: string;
    channelId?: string;
    id?: number;
    extra?: any;
  }): Promise<void> {
    try {
      await this.createNotificationChannels();

      const notifId = payload.id || Math.floor(Math.random() * 80000) + 700000;
      const channelId = payload.channelId || SALAWAT_DHIKR_CHANNEL_ID;

      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title: payload.title,
            body: payload.body,
            largeBody: payload.body,
            channelId,
            smallIcon: 'ic_stat_athar',
            iconColor: '#D4AF37',
            schedule: {
              at: new Date(Date.now() + 100),
              allowWhileIdle: true,
            },
            autoCancel: true,
            ongoing: false,
            foreground: true,
            isExactNotification: true,
            extra: payload.extra || {},
          },
        ],
      });

      console.log(`[NativeNotificationService] Dispatched immediate native system notification #${notifId}`);
    } catch (err) {
      console.warn('[NativeNotificationService] dispatchImmediateNativeNotification error:', err);
    }
  }

  /**
   * One-stop initialization called on app start:
   * 1. Requests permissions from Android OS
   * 2. Creates the 7 high-priority Android channels (importance: 5)
   * 3. Pre-schedules all 7 days of prayers, Adhkar, Salawat, Quran, and Parents notifications
   * 4. Binds OS action listeners
   */
  public async initAndScheduleAll(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      await this.requestSystemPermissions();
      await this.createNotificationChannels();
      await this.scheduleAllNativeNotifications(7);
      this.setupActionListener();
    } catch (err) {
      console.warn('[NativeNotificationService] initAndScheduleAll error:', err);
    }
  }

  /**
   * Listens for user interactions when tapping a native notification banner in the Android system tray.
   */
  private setupActionListener(): void {
    if (this.actionListenerBound) return;
    this.actionListenerBound = true;

    try {
      LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        const extra = action.notification.extra;
        console.info('[NativeNotificationService] User opened notification from Android system tray:', extra);
        if (extra?.type === 'prayer') {
          window.location.hash = '#prayers';
        } else if (extra?.type === 'adhkar') {
          window.location.hash = '#adhkar';
        } else if (extra?.type === 'quran') {
          window.location.hash = '#quran';
        }
      }).catch(() => {});
    } catch {}
  }
}

export const NativeNotificationService = new NativeNotificationManager();
