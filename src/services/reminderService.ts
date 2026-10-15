import { StorageService } from './storageService';
import { QuranService } from './quranService';
import { AudioService } from './audioService';
import { NotificationService } from './notificationService';
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

import { NativePermissionsBridge } from './nativePermissionsBridge';

export type ObligatoryPrayerId = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type RoyalReminderCategory = 'quran' | 'dhikr' | 'wird' | 'parents';

export interface RoyalAtharOverlayPayload {
  category: RoyalReminderCategory;
  title: string;
  badge: string;
  primaryText: string;
  subtitle?: string;
  sourceLabel?: string;
  actionText: string;
  audioUrl?: string;
  initialElapsedSeconds?: number;
  initialDurationSeconds?: number;
  onAction?: () => void;
  playAudio?: () => Promise<void>;
  channelId?: string;
}

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

  private activeRoyalOverlay: RoyalAtharOverlayPayload | null = null;
  private royalOverlaySubscribers: Set<(payload: RoyalAtharOverlayPayload | null) => void> = new Set();

  constructor() {}

  public subscribeRoyalOverlay(cb: (payload: RoyalAtharOverlayPayload | null) => void): () => void {
    this.royalOverlaySubscribers.add(cb);
    cb(this.activeRoyalOverlay ? { ...this.activeRoyalOverlay } : null);
    return () => this.royalOverlaySubscribers.delete(cb);
  }

  private notifyRoyalOverlaySubscribers() {
    const snap = this.activeRoyalOverlay ? { ...this.activeRoyalOverlay } : null;
    this.royalOverlaySubscribers.forEach((cb) => {
      try {
        cb(snap);
      } catch {}
    });
  }

  public launchRoyalAtharOverlay(payload: RoyalAtharOverlayPayload): void {
    this.activeRoyalOverlay = { ...payload };
    this.notifyRoyalOverlaySubscribers();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('athar_open_royal_overlay', { detail: payload }));
    }
  }

  public dismissRoyalOverlay(): void {
    this.activeRoyalOverlay = null;
    this.notifyRoyalOverlaySubscribers();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('athar_dismiss_royal_overlay'));
    }
  }

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

  private isAdhanStoppedByUser = false;

  /**
   * Immediately stops Adhan audio AND closes the Full-Screen Adhan overlay.
   * Guarantees total silence and prevents any auto-resumption in the Global Mini Player.
   */
  public stopAndDismissAdhanScreen(): void {
    this.isAdhanStoppedByUser = true;
    AudioService.stopAdhan();
    NativePermissionsBridge.stopFullScreenAthan().catch(() => {});
    NativePermissionsBridge.dismissNotification('prayer_athan').catch(() => {});
    this.activeAdhanScreen = null;
    this.notifyAdhanScreenSubscribers();
  }

  /**
   * Mutes the Adhan audio in-place without closing the screen
   */
  public muteAdhanAndKeepScreenOpen(): void {
    if (!this.activeAdhanScreen || this.activeAdhanScreen.isAudioFinished) return;
    AudioService.setAdhanMuted(true);
    NativePermissionsBridge.muteNotificationAudio().catch(() => {});
    this.activeAdhanScreen = {
      ...this.activeAdhanScreen,
      isMutedKeepScreen: true,
    };
    this.notifyAdhanScreenSubscribers();
  }

  /**
   * Unmutes the Adhan audio in-place continuing from current timeline point without reset
   */
  public unmuteAdhanOnScreen(): void {
    if (!this.activeAdhanScreen || this.activeAdhanScreen.isAudioFinished) return;
    AudioService.setAdhanMuted(false);
    NativePermissionsBridge.unmuteNotificationAudio().catch(() => {});
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
    elapsedSeconds?: number;
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
    const elapsed = Math.max(0, options?.elapsedSeconds || 0);

    this.isAdhanStoppedByUser = false;
    this.adhanSceneCounter += 1;

    this.activeAdhanScreen = {
      id: `adhan_${Date.now()}`,
      prayerKey: effectiveKey,
      prayerNameArabic: nameArabic,
      prayerTime12: time12,
      locationName: liveState.locationName || settings.location.city || 'القاهرة',
      voiceId,
      adhanMode,
      startedAt: Date.now() - Math.floor(elapsed * 1000),
      iqamahOffsetMinutes,
      isMutedKeepScreen: false,
      isAudioFinished: false,
      isDuaPlaying: false,
      isPreview: options?.isPreview ?? false,
      sceneCounter: this.adhanSceneCounter,
    };
    this.notifyAdhanScreenSubscribers();

    const onAdhanFinished = () => {
      if (this.isAdhanStoppedByUser || !this.activeAdhanScreen) {
        return;
      }
      AudioService.setAdhanMuted(false);
      this.activeAdhanScreen = {
        ...this.activeAdhanScreen,
        isAudioFinished: true,
      };
      this.notifyAdhanScreenSubscribers();
      if (settings.duaAfterAdhanEnabled && !this.activeAdhanScreen?.isMutedKeepScreen) {
        this.playPostAdhanDuaFromScreen();
      }
    };

    AudioService.setAdhanMuted(false);
    if (!NativePermissionsBridge.isNative()) {
      await AudioService.playAdhan(voiceId, {
        mode: adhanMode,
        willChainDuaAfterAdhan: Boolean(settings.duaAfterAdhanEnabled),
        onFinished: onAdhanFinished,
        startTime: elapsed,
      });
    }
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

    // Schedule upcoming notifications safely into native Android AlarmManager
    NativeNotificationService.scheduleAllNativeNotifications(2).catch(() => {});
  }

  public stop(): void {
    // Legacy timers completely removed
  }

  public resetAllTimersToNow(): void {
    // Native scheduling does not rely on local JS timers
  }

  /**
   * Restarts the native notification engine when settings or location change.
   * Forces re-scheduling of the Android native notification matrix.
   */
  public restart(): void {
    NativeNotificationService.scheduleAllNativeNotifications(2, true).catch(() => {});
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

    // Synchronous Royal In-App Notification and simultaneous audio playback
    NotificationService.notify({
      title: `اقرأ لو آية ﴿سورة ${verse.surahName} - ${verse.ayahNumber}﴾`,
      body: verse.text,
      type: 'quran',
      audioUrl: mode === 'notification_and_sound' ? audioUrl : undefined,
      autoPlayAudio: mode === 'notification_and_sound' ? async () => {
        await AudioService.playUrl(audioUrl, 'reminder_verse', {
          title: `سورة ${verse.surahName} - آية ${verse.ayahNumber}`,
          subtitle: `تلاوة ${reciter.nameArabic}`,
          surahNumber: verse.surahNumber,
          ayahNumber: verse.ayahNumber,
          reciterName: reciter.nameArabic,
        });
      } : undefined,
    });
  }

  public async triggerSalawatReminder(
    mode: 'notification_only' | 'notification_and_sound' | 'notification_with_play_action' = 'notification_and_sound'
  ): Promise<void> {
    NotificationService.notify({
      title: 'الصلاة على النبي ﷺ',
      body: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ · من صلى عليَّ صلاةً صلى الله عليه بها عشراً.',
      type: 'salawat',
      autoPlayAudio: mode === 'notification_and_sound' ? async () => {
        await AudioService.playSalawatReminder();
      } : undefined,
    });
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

    NotificationService.notify({
      title: `${item.categoryLabel}: ${item.title}`,
      body: item.arabicText,
      type: 'dhikr',
      audioUrl: mode === 'notification_and_sound' ? item.audioUrl : undefined,
      autoPlayAudio: mode === 'notification_and_sound' ? async () => {
        await AudioService.playDhikrReminder(item);
      } : undefined,
    });
  }

  public async triggerDailyWirdReminder(
    mode: 'notification_only' | 'notification_and_sound' | 'notification_with_play_action' = 'notification_and_sound'
  ): Promise<void> {
    NotificationService.notify({
      title: 'تذكير الورد القرآني اليومي',
      body: '﴿وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا﴾ حان موعد وردك المبارك من القرآن الكريم - نوّر قلبك ويومك بتلاوة آيات الله.',
      type: 'wird',
      autoPlayAudio: mode === 'notification_and_sound' ? async () => {
        await AudioService.playWirdReminder();
      } : undefined,
    });
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

    NotificationService.notify({
      title: 'تذكير بر الوالدين والإحسان إليهما',
      body: `${chosen.verse} · ${chosen.action}`,
      type: 'parents',
      autoPlayAudio: mode === 'notification_and_sound' ? async () => {
        await AudioService.playParentsReminder();
      } : undefined,
    });
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

  /**
   * الزر الأول: (تجربة التذكير الداخلي)
   * يقوم بإظهار معاينة التنبيه داخل التطبيق فقط (In-App Overlay) بالستايل والصوت الخاص بالقسم
   */
  public async testInAppReminder(category: RoyalReminderCategory): Promise<void> {
    switch (category) {
      case 'quran':
        await this.triggerQuranVerseReminder('notification_and_sound');
        break;
      case 'dhikr':
        await this.triggerDhikrReminder('notification_and_sound');
        break;
      case 'wird':
        await this.triggerDailyWirdReminder('notification_and_sound');
        break;
      case 'parents':
        await this.triggerParentsReminder('notification_and_sound');
        break;
    }
  }

  /**
   * الزر الثاني: (تجربة تنبيه الأثر الملكي)
   * يقوم بإطلاق تشغيل إشعار "الأثر الملكي" كاملاً خارج التطبيق عبر (Full-Screen Intent / System Overlay)
   * ليظهر إجبارياً على الشاشة بالكامل وبكافة تفاصيله الملكية والتحكم السريع حتى لو كان الموبايل مقفلاً أو التطبيق مغلقاً.
   */
  public async testRoyalAtharReminder(category: RoyalReminderCategory): Promise<void> {
    let payload: RoyalAtharOverlayPayload;

    if (category === 'quran') {
      const verse = await QuranService.getRandomVerseForReminder();
      const settings = StorageService.getSettings();
      const reciterId = settings.selectedReciterId || 'alafasy';
      const reciter = VERIFIED_RECITERS.find((r) => r.id === reciterId) || VERIFIED_RECITERS[0];
      const ayahNum = verse?.ayahNumber || 9;
      const surahNum = verse?.surahNumber || 17;
      const surahName = verse?.surahName || 'الإسراء';
      const text = verse?.text || '﴿إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ وَيُبَشِّرُ الْمُؤْمِنِينَ الَّذِينَ يَعْمَلُونَ الصَّالِحَاتِ أَنَّ لَهُمْ أَجْرًا كَبِيرًا﴾ [الإسراء: 9]';
      const audioUrl = getAyahAudioUrl(reciter.audioServer, surahNum, ayahNum);

      payload = {
        category: 'quran',
        title: 'تنبيه آيات القرآن الكريم',
        badge: '📖 تنبيه آيات القرآن الملكي',
        primaryText: text,
        subtitle: `سورة ${surahName} · آية ${ayahNum} · تلاوة الشيخ ${reciter.nameArabic}`,
        sourceLabel: `سورة ${surahName}`,
        actionText: 'فتح المصحف والتدبر',
        audioUrl,
        channelId: QURAN_CHANNEL_ID,
        playAudio: async () => {
          await AudioService.playUrl(audioUrl, 'reminder_verse', {
            title: `سورة ${surahName} - آية ${ayahNum}`,
            subtitle: `تلاوة ${reciter.nameArabic}`,
            surahNumber: surahNum,
            ayahNumber: ayahNum,
            reciterName: reciter.nameArabic,
          });
        },
      };
    } else if (category === 'dhikr') {
      const item = this.getNextVerifiedDhikrItem();
      const primaryText = item?.arabicText || '«سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ»';
      const subtitle = item ? item.fadl : 'كلمتان خفيفتان على اللسان ثقيلتان في الميزان حبيبتان إلى الرحمن';

      payload = {
        category: 'dhikr',
        title: 'تنبيه ذكر الله والتسبيح',
        badge: '📿 تنبيه ذكر الله والتسبيح الملكي',
        primaryText,
        subtitle,
        sourceLabel: item?.categoryLabel || 'أذكار وطمأنينة',
        actionText: 'فتح المسبحة والذكر',
        audioUrl: item?.audioUrl || '/audio/dhikr_sample.mp3',
        channelId: SALAWAT_DHIKR_CHANNEL_ID,
        playAudio: async () => {
          if (item) {
            await AudioService.playDhikrReminder(item);
          } else {
            await AudioService.playUrl('/audio/dhikr_sample.mp3', 'reminder_dhikr', {
              title: 'تنبيه ذكر الله والتسبيح',
              subtitle: primaryText,
            });
          }
        },
      };
    } else if (category === 'wird') {
      const wirdAudioUrl = '/audio/wird.mp3';
      payload = {
        category: 'wird',
        title: 'تنبيه الورد القرآني اليومي',
        badge: '📜 تنبيه الورد القرآني الملكي',
        primaryText: '﴿وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا﴾',
        subtitle: 'حان موعد وردك المبارك من القرآن الكريم.. نوّر قلبك ويومك بتلاوة آيات الله ولا تجعل يومك يمر دون أثر.',
        sourceLabel: 'الورد اليومي',
        actionText: 'متابعة الورد القرآني',
        audioUrl: wirdAudioUrl,
        channelId: QURAN_CHANNEL_ID,
        playAudio: async () => {
          await AudioService.playWirdReminder();
        },
      };
    } else {
      // parents
      const parentsAudioUrl = '/audio/parents.mp3';
      payload = {
        category: 'parents',
        title: 'تنبيه بر الوالدين والإحسان',
        badge: '🤍 تنبيه بر الوالدين الملكي',
        primaryText: '﴿وَقَضَىٰ رَبُّكَ أَلَّا تَعْبُدُوا إِلَّا إِيَّاهُ وَبِالْوَالِدَيْنِ إِحْسَانًا﴾',
        subtitle: '﴿رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا﴾ · اتصل بهما الآن، قبّل أيديهما، أو ادعُ لهما بالرحمة والمغفرة.',
        sourceLabel: 'بر الوالدين',
        actionText: 'دعاء وبرّ الوالدين',
        audioUrl: parentsAudioUrl,
        channelId: PARENTS_CHANNEL_ID,
        playAudio: async () => {
          await AudioService.playParentsReminder();
        },
      };
    }

    // 1. Dispatch single unified royal notification outside the app
    try {
      await NativePermissionsBridge.showRoyalNotification({
        title: payload.title,
        body: `${payload.primaryText}\n${payload.subtitle || ''}`,
        badge: payload.badge,
        channelId: payload.channelId,
        category: payload.category,
        audioUrl: payload.audioUrl,
      });
    } catch (err) {
      console.warn('[ReminderEngine] Native royal overlay dispatch error:', err);
    }

    // 2. Launch interactive Royal Athar Full-Screen Overlay inside the application
    this.launchRoyalAtharOverlay(payload);

    // 3. Trigger synchronous web audio only when NOT running in native Android mode
    if (!NativePermissionsBridge.isNative() && payload.playAudio) {
      payload.playAudio().catch(() => {});
    }
  }

  public async testAdhan(
    voiceId?: 'makkah' | 'madinah' | 'alaqsa' | 'alafasy',
    mode?: 'full' | 'first_two_takbeers',
    prayerKey?: ObligatoryPrayerId
  ): Promise<void> {
    const v = voiceId || 'alafasy';
    const m = mode || 'full';

    // Single source of truth: One and only one notification/overlay output
    if (NativePermissionsBridge.isNative()) {
      await NativePermissionsBridge.triggerSingleTestNotification(true, 0);
    } else {
      await this.launchFullScreenAdhan({
        prayerKey,
        voiceId: v,
        mode: m,
        isPreview: true,
      });
    }
  }

  /**
   * Dedicated 30-Second Testing Mode: Dispatches ONE clean test notification through AtharNotificationManager
   */
  public async testSingleNotificationEvery30s(delaySeconds: number = 0): Promise<void> {
    if (NativePermissionsBridge.isNative()) {
      await NativePermissionsBridge.triggerSingleTestNotification(false, delaySeconds);
    } else {
      NotificationService.notify({
        title: '✨ تنبيه أثر الموحد (تجربة النظام الفورية)',
        body: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ\nتم اختبار وصول التنبيه الفردي بنجاح تام ✓',
        type: 'dhikr',
        skipNativeNotification: true, // Prevents duplicate double dispatch
        autoPlayAudio: async () => {
          await AudioService.playUrl('/audio/dhikr_sample.mp3', 'adhkar', {
            title: 'تنبيه أثر',
            subtitle: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
          });
        },
      });
    }
  }

  public async testIqamah(): Promise<void> {
    NotificationService.notify({
      title: 'إقامة الصلاة',
      body: 'قد قامت الصلاة، قد قامت الصلاة · استووا واعتدلوا يرحمكم الله.',
      type: 'prayer',
      autoPlayAudio: async () => {
        await AudioService.playIqamah();
      },
    });
  }

  public async testDuaAfterAdhan(): Promise<void> {
    NotificationService.notify({
      title: 'دعاء ما بعد الأذان',
      body: 'اللهم رب هذه الدعوة التامة والصلاة القائمة آت محمداً الوسيلة والفضيلة وابعثه مقاماً محموداً الذي وعدته.',
      type: 'prayer',
      autoPlayAudio: async () => {
        await AudioService.playDuaAfterAdhan();
      },
    });
  }
}

export const ReminderEngine = new ScheduledReminderEngine();
