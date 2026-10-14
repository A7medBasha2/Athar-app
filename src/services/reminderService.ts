import { StorageService } from './storageService';
import { QuranService } from './quranService';
import { AudioService } from './audioService';
import { VERIFIED_RECITERS, getAyahAudioUrl } from '../data/surahsData';
import { VERIFIED_DHIKR_REMINDERS, DhikrAudioReminderItem } from '../data/dhikrRemindersData';
import { PrayerTimesService, formatPrayerTime12 } from './prayerTimesService';
import { LiveActivityService } from './liveActivityService';
import {
  NativeNotificationService,
  PRAYER_CHANNEL_ID,
  IQAMAH_CHANNEL_ID,
  SALAWAT_DHIKR_CHANNEL_ID,
  QURAN_CHANNEL_ID,
  PARENTS_CHANNEL_ID,
} from './nativeNotificationService';

export type ObligatoryPrayerId = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface ActiveAdhanScreenState {
  id: string;
  prayerKey: ObligatoryPrayerId;
  prayerNameArabic: string;
  prayerTime12: string;
  locationName: string;
  voiceId: 'makkah' | 'madinah' | 'alaqsa' | 'alafasy';
  adhanMode: 'full' | 'first_two_takbeers';
  startedAt: number;
  iqamahOffsetMinutes: number;
  isMutedKeepScreen: boolean;
  isAudioFinished: boolean;
  isDuaPlaying: boolean;
  isPreview?: boolean;
  sceneCounter: number;
}

type AdhanScreenSubscriber = (state: ActiveAdhanScreenState | null) => void;

class ScheduledReminderEngine {
  private activeAdhanScreen: ActiveAdhanScreenState | null = null;
  private adhanScreenSubscribers: Set<AdhanScreenSubscriber> = new Set();
  private adhanSceneCounter: number = 0;

  constructor() {}

  public subscribeAdhanScreen(cb: AdhanScreenSubscriber): () => void {
    this.adhanScreenSubscribers.add(cb);
    cb(this.activeAdhanScreen ? { ...this.activeAdhanScreen } : null);
    return () => this.adhanScreenSubscribers.delete(cb);
  }

  private notifyAdhanScreenSubscribers() {
    const snap = this.activeAdhanScreen ? { ...this.activeAdhanScreen } : null;
    this.adhanScreenSubscribers.forEach((cb) => {
      try {
        cb(snap);
      } catch {}
    });
  }

  public getActiveAdhanScreen(): ActiveAdhanScreenState | null {
    return this.activeAdhanScreen;
  }

  public hasActiveAdhanScreen(): boolean {
    return this.activeAdhanScreen !== null;
  }

  /**
   * Immediately stops Adhan audio AND closes the Full-Screen Adhan overlay.
   */
  public stopAndDismissAdhanScreen(): void {
    AudioService.setAdhanMuted(false);
    AudioService.stopTemporaryAndResume(false);
    this.activeAdhanScreen = null;
    this.notifyAdhanScreenSubscribers();
  }

  /**
   * Mutes the Adhan audio in-place without closing the screen
   */
  public muteAdhanAndKeepScreenOpen(): void {
    if (!this.activeAdhanScreen || this.activeAdhanScreen.isAudioFinished) return;
    AudioService.setAdhanMuted(true);
    this.activeAdhanScreen = {
      ...this.activeAdhanScreen,
      isMutedKeepScreen: true,
    };
    this.notifyAdhanScreenSubscribers();
  }

  /**
   * Unmutes the Adhan audio in-place
   */
  public unmuteAdhanOnScreen(): void {
    if (!this.activeAdhanScreen || this.activeAdhanScreen.isAudioFinished) return;
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - this.activeAdhanScreen.startedAt) / 1000));
    AudioService.setAdhanMuted(false);
    AudioService.resumeOrSeekAdhan(
      elapsedSeconds,
      this.activeAdhanScreen.voiceId,
      this.activeAdhanScreen.adhanMode
    );
    this.activeAdhanScreen = {
      ...this.activeAdhanScreen,
      isMutedKeepScreen: false,
    };
    this.notifyAdhanScreenSubscribers();
  }

  /**
   * Toggles mute/unmute
   */
  public toggleAdhanMuteOnScreen(): void {
    if (!this.activeAdhanScreen || this.activeAdhanScreen.isAudioFinished) return;
    if (this.activeAdhanScreen.isMutedKeepScreen) {
      this.unmuteAdhanOnScreen();
    } else {
      this.muteAdhanAndKeepScreenOpen();
    }
  }

  /**
   * Plays or replays the Post-Adhan Dua inside the Full-Screen Adhan overlay.
   */
  public async playPostAdhanDuaFromScreen(): Promise<void> {
    if (this.activeAdhanScreen) {
      this.activeAdhanScreen = {
        ...this.activeAdhanScreen,
        isDuaPlaying: true,
      };
      this.notifyAdhanScreenSubscribers();
    }
    await AudioService.playDuaAfterAdhan();
  }

  /**
   * Rotates mosque scene
   */
  public cycleAdhanScreenScene(): void {
    this.adhanSceneCounter += 1;
    if (this.activeAdhanScreen) {
      this.activeAdhanScreen = {
        ...this.activeAdhanScreen,
        sceneCounter: this.adhanSceneCounter,
      };
      this.notifyAdhanScreenSubscribers();
    }
  }

  /**
   * Launches the Full-Screen Priority Royal Adhan Screen and starts the Adhan audio.
   */
  public async launchFullScreenAdhan(options?: {
    prayerKey?: ObligatoryPrayerId;
    prayerNameArabic?: string;
    prayerTime12?: string;
    voiceId?: 'makkah' | 'madinah' | 'alaqsa' | 'alafasy';
    mode?: 'full' | 'first_two_takbeers';
    isPreview?: boolean;
  }): Promise<void> {
    const settings = StorageService.getSettings();
    const liveState = LiveActivityService.getState();

    const defaultCurrentKey: ObligatoryPrayerId =
      liveState.currentPrayerId !== 'sunrise'
        ? (liveState.currentPrayerId as ObligatoryPrayerId)
        : 'fajr';

    const effectiveKey: ObligatoryPrayerId =
      options?.prayerKey || defaultCurrentKey || 'dhuhr';

    const prayerNames: Record<ObligatoryPrayerId, string> = {
      fajr: 'الفجر',
      dhuhr: 'الظهر',
      asr: 'العصر',
      maghrib: 'المغرب',
      isha: 'العشاء',
    };

    const nameArabic = options?.prayerNameArabic || prayerNames[effectiveKey] || 'الظهر';
    const time12 = options?.prayerTime12 || liveState.currentPrayerTime12 || liveState.nextPrayerTime12 || '١٢:٠٠ م';
    const voiceId = options?.voiceId || settings.adhanVoice || 'alafasy';
    const adhanMode = options?.mode || settings.adhanMode || 'full';
    const iqamahOffsetMinutes =
      liveState.settings.iqamahOffsets?.[effectiveKey] ??
      (effectiveKey === 'maghrib' ? 10 : 15);

    this.adhanSceneCounter += 1;

    this.activeAdhanScreen = {
      id: `adhan_${Date.now()}`,
      prayerKey: effectiveKey,
      prayerNameArabic: nameArabic,
      prayerTime12: time12,
      locationName: liveState.locationName || settings.location.city || 'القاهرة',
      voiceId,
      adhanMode,
      startedAt: Date.now(),
      iqamahOffsetMinutes,
      isMutedKeepScreen: false,
      isAudioFinished: false,
      isDuaPlaying: false,
      isPreview: options?.isPreview ?? false,
      sceneCounter: this.adhanSceneCounter,
    };
    this.notifyAdhanScreenSubscribers();

    const onAdhanFinished = () => {
      AudioService.setAdhanMuted(false);
      if (this.activeAdhanScreen) {
        this.activeAdhanScreen = {
          ...this.activeAdhanScreen,
          isAudioFinished: true,
        };
        this.notifyAdhanScreenSubscribers();
      }
      if (settings.duaAfterAdhanEnabled && !this.activeAdhanScreen?.isMutedKeepScreen) {
        this.playPostAdhanDuaFromScreen();
      }
    };

    AudioService.setAdhanMuted(false);
    await AudioService.playAdhan(voiceId, {
      mode: adhanMode,
      willChainDuaAfterAdhan: Boolean(settings.duaAfterAdhanEnabled),
      onFinished: onAdhanFinished,
    });
  }

  /**
   * Starts the Native Notification Engine:
   * Requests OS permissions, registers high-priority Android channels (importance: 5),
   * and schedules all upcoming 7 days of prayers, Adhkar, Salawat, Quran, and Parents notifications.
   * NO setInterval, NO setTimeout, NO Web Worker polling!
   */
  public start(): void {
    const cached = StorageService.getCachedPrayers();
    const today = new Date().toISOString().split('T')[0];
    const s = StorageService.getSettings();
    if (!cached || cached.dateGregorian !== today || cached.locationName !== s.location.city) {
      PrayerTimesService.getPrayerTimes(s.location, s.calculationMethod).catch(() => {});
    }

    // Schedule all 7 days of notifications directly into native Android AlarmManager
    NativeNotificationService.scheduleAllNativeNotifications(7).catch(() => {});
  }

  public stop(): void {
    // Legacy timers completely removed
  }

  public resetAllTimersToNow(): void {
    // Native scheduling does not rely on local JS timers
  }

  /**
   * Restarts the native notification engine when settings or location change.
   * Re-schedules the full 7-day Android native notification matrix.
   */
  public restart(): void {
    NativeNotificationService.scheduleAllNativeNotifications(7).catch(() => {});
  }

  // --- Direct Immediate Native Notification Methods for Testing and Action Triggers ---

  public async triggerQuranVerseReminder(
    mode: 'notification_only' | 'notification_and_sound' | 'notification_with_play_action' = 'notification_and_sound'
  ): Promise<void> {
    const verse = await QuranService.getRandomVerseForReminder();
    if (!verse) return;

    const settings = StorageService.getSettings();
    const reciterId = settings.selectedReciterId || 'alafasy';
    const reciter = VERIFIED_RECITERS.find((r) => r.id === reciterId) || VERIFIED_RECITERS[0];
    const audioUrl = getAyahAudioUrl(reciter.audioServer, verse.surahNumber, verse.ayahNumber);

    // Dispatch directly to Android system notification tray & heads-up banner
    await NativeNotificationService.dispatchImmediateNativeNotification({
      title: `اقرأ لو آية ﴿سورة ${verse.surahName} - ${verse.ayahNumber}﴾`,
      body: verse.text,
      channelId: QURAN_CHANNEL_ID,
      extra: {
        type: 'quran',
        surahNumber: verse.surahNumber,
        ayahNumber: verse.ayahNumber,
        audioUrl,
      },
    });

    if (mode === 'notification_and_sound') {
      AudioService.playUrl(audioUrl, 'reminder_verse', {
        title: `سورة ${verse.surahName} - آية ${verse.ayahNumber}`,
        subtitle: `تلاوة ${reciter.nameArabic}`,
        surahNumber: verse.surahNumber,
        ayahNumber: verse.ayahNumber,
        reciterName: reciter.nameArabic,
      }).catch(() => {});
    }
  }

  public async triggerSalawatReminder(
    mode: 'notification_only' | 'notification_and_sound' | 'notification_with_play_action' = 'notification_and_sound'
  ): Promise<void> {
    await NativeNotificationService.dispatchImmediateNativeNotification({
      title: 'الصلاة على النبي ﷺ',
      body: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ · من صلى عليَّ صلاةً صلى الله عليه بها عشراً.',
      channelId: SALAWAT_DHIKR_CHANNEL_ID,
      extra: {
        type: 'salawat',
      },
    });

    if (mode === 'notification_and_sound') {
      AudioService.playSalawatReminder().catch(() => {});
    }
  }

  private getNextVerifiedDhikrItem(specificId?: string): DhikrAudioReminderItem | null {
    const validAll = VERIFIED_DHIKR_REMINDERS.filter((item) => Boolean(item.audioUrl && item.audioUrl.trim().length > 0));
    if (validAll.length === 0) return null;

    if (specificId) {
      const found = validAll.find((item) => item.id === specificId);
      if (found) return found;
    }

    const settings = StorageService.getSettings();
    const dhikrSetting = settings.dhikrReminder;
    const selectedIds = dhikrSetting?.selectedDhikrIds || [];

    const pool =
      selectedIds.length > 0
        ? validAll.filter((item) => selectedIds.includes(item.id))
        : validAll;

    const effectivePool = pool.length > 0 ? pool : validAll;
    const currentIndex = dhikrSetting?.currentIndex || 0;
    const chosen = effectivePool[currentIndex % effectivePool.length];

    if (dhikrSetting) {
      settings.dhikrReminder = {
        ...dhikrSetting,
        currentIndex: (currentIndex + 1) % effectivePool.length,
      };
      StorageService.saveSettings(settings);
    }

    return chosen;
  }

  public async triggerDhikrReminder(
    mode: 'notification_only' | 'notification_and_sound' | 'notification_with_play_action' = 'notification_and_sound',
    specificId?: string
  ): Promise<void> {
    const item = this.getNextVerifiedDhikrItem(specificId);
    if (!item) return;

    await NativeNotificationService.dispatchImmediateNativeNotification({
      title: `${item.categoryLabel}: ${item.title}`,
      body: item.arabicText,
      channelId: SALAWAT_DHIKR_CHANNEL_ID,
      extra: {
        type: 'dhikr',
        dhikrId: item.id,
        audioUrl: item.audioUrl,
      },
    });

    if (mode === 'notification_and_sound') {
      AudioService.playDhikrReminder(item).catch(() => {});
    }
  }

  public async triggerDailyWirdReminder(
    mode: 'notification_only' | 'notification_and_sound' | 'notification_with_play_action' = 'notification_and_sound'
  ): Promise<void> {
    await NativeNotificationService.dispatchImmediateNativeNotification({
      title: 'تذكير الورد القرآني اليومي',
      body: '﴿وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا﴾ حان موعد وردك المبارك من القرآن الكريم - نوّر قلبك ويومك بتلاوة آيات الله.',
      channelId: QURAN_CHANNEL_ID,
      extra: {
        type: 'wird',
      },
    });

    if (mode === 'notification_and_sound') {
      AudioService.playWirdReminder().catch(() => {});
    }
  }

  public async triggerParentsReminder(
    mode: 'notification_only' | 'notification_and_sound' | 'notification_with_play_action' = 'notification_and_sound'
  ): Promise<void> {
    const quotes = [
      {
        verse: '﴿وَقَضَىٰ رَبُّكَ أَلَّا تَعْبُدُوا إِلَّا إِيَّاهُ وَبِالْوَالِدَيْنِ إِحْسَانًا﴾',
        action: 'اتصل بهما الآن، قبّل أيديهما، أو ادعُ لهما بالرحمة والمغفرة.',
      },
      {
        verse: '﴿رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا﴾',
        action: 'رضا الله تعالى في رضا الوالدين.. بادر بالسؤال عنهما وإدخال السرور على قلوبهما.',
      },
      {
        verse: '﴿رَّبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِمَن دَخَلَ بَيْتِيَ مُؤْمِنًا﴾',
        action: 'بركة يومك ورزقك تبدأ بدعوة صادقة لوالديك والاطمئنان عليهما.',
      },
      {
        verse: '﴿وَوَصَّيْنَا الْإِنسَانَ بِوَالِدَيْهِ حُسْنًا﴾',
        action: 'طاعة الوالدين وبرهما باب من أبواب الجنة المفتوحة لك اليوم.. لا تفوته.',
      },
    ];

    const chosen = quotes[Math.floor(Math.random() * quotes.length)];

    await NativeNotificationService.dispatchImmediateNativeNotification({
      title: 'تذكير بر الوالدين والإحسان إليهما',
      body: `${chosen.verse} · ${chosen.action}`,
      channelId: PARENTS_CHANNEL_ID,
      extra: {
        type: 'parents',
      },
    });

    if (mode === 'notification_and_sound') {
      AudioService.playParentsReminder().catch(() => {});
    }
  }

  // --- Direct Test Methods (used in Settings and diagnostic UI) ---

  public async testDhikrReminder(specificId?: string): Promise<void> {
    const settings = StorageService.getSettings();
    const mode = settings.dhikrReminder?.mode || 'notification_and_sound';
    await this.triggerDhikrReminder(mode, specificId);
  }

  public async testQuranVerseReminder(): Promise<void> {
    const settings = StorageService.getSettings();
    const mode = settings.quranVerseReminder?.mode || 'notification_and_sound';
    await this.triggerQuranVerseReminder(mode);
  }

  public async testSalawatReminder(): Promise<void> {
    const settings = StorageService.getSettings();
    const mode = settings.salawatReminder?.mode || 'notification_and_sound';
    await this.triggerSalawatReminder(mode);
  }

  public async testDailyWirdReminder(): Promise<void> {
    const settings = StorageService.getSettings();
    const mode = settings.dailyWirdReminder?.mode || 'notification_and_sound';
    await this.triggerDailyWirdReminder(mode);
  }

  public async testParentsReminder(): Promise<void> {
    await this.triggerParentsReminder('notification_and_sound');
  }

  public async testAdhan(
    voiceId?: 'makkah' | 'madinah' | 'alaqsa' | 'alafasy',
    mode?: 'full' | 'first_two_takbeers',
    prayerKey?: ObligatoryPrayerId
  ): Promise<void> {
    const settings = StorageService.getSettings();
    const v = voiceId || settings.adhanVoice || 'alafasy';
    const m = mode || settings.adhanMode || 'full';

    // Dispatch real system notification
    await NativeNotificationService.dispatchImmediateNativeNotification({
      title: 'تجربة أذان أثر (إشعار نظام حقيقي)',
      body: 'حي على الصلاة، حي على الفلاح · الله أكبر، الله أكبر',
      channelId: PRAYER_CHANNEL_ID,
      extra: {
        type: 'prayer',
        voiceId: v,
        mode: m,
      },
    });

    await this.launchFullScreenAdhan({
      prayerKey,
      voiceId: v,
      mode: m,
      isPreview: true,
    });
  }

  public async testIqamah(): Promise<void> {
    await NativeNotificationService.dispatchImmediateNativeNotification({
      title: 'تجربة إقامة الصلاة (إشعار نظام حقيقي)',
      body: 'قد قامت الصلاة، قد قامت الصلاة · استووا واعتدلوا يرحمكم الله.',
      channelId: IQAMAH_CHANNEL_ID,
      extra: {
        type: 'iqamah',
      },
    });

    await AudioService.playIqamah().catch(() => {});
  }

  public async testDuaAfterAdhan(): Promise<void> {
    await NativeNotificationService.dispatchImmediateNativeNotification({
      title: 'دعاء ما بعد الأذان',
      body: 'اللهم رب هذه الدعوة التامة والصلاة القائمة آت محمداً الوسيلة والفضيلة وابعثه مقاماً محموداً الذي وعدته.',
      channelId: PRAYER_CHANNEL_ID,
      extra: {
        type: 'prayer',
      },
    });

    await AudioService.playDuaAfterAdhan().catch(() => {});
  }
}

export const ReminderEngine = new ScheduledReminderEngine();
