import React, { useState, useEffect } from 'react';
import { 
  PrayerTimesData, NavigationTab, Coordinates, QuranKhatmahState, 
  AdhkarStats, DailyWirdConfig, PrayerAchievementsState,
  LastAudioPosition, LastAdhkarAudio
} from '../types';
import { PrayerTimesService, formatPrayerTime12 } from '../services/prayerTimesService';
import { LocationService } from '../services/locationService';
import { StorageService } from '../services/storageService';
import { AudioService, ActiveAudioState } from '../services/audioService';
import { getAyahAudioUrl, VERIFIED_RECITERS } from '../data/surahsData';
import { MORNING_ADHKAR, EVENING_ADHKAR } from '../data/adhkarData';
import { AUTHENTIC_HADITHS } from '../data/hadithsData';
import { DigitalTasbihModal } from '../components/DigitalTasbihModal';
import { DailyWirdModal } from '../components/DailyWirdModal';
import { AchievementsOverviewModal } from '../components/AchievementsOverviewModal';
import { SpiritualToolkitModal } from '../components/SpiritualToolkitModal';
import { ShareCardModal, ShareCardPayload } from '../components/ShareCardModal';
import { ZakatAndCharityModal } from '../components/ZakatAndCharityModal';
import { AdhkarPlayerSheet } from '../components/AdhkarPlayerSheet';
import { RotatingCardBackground } from '../components/RotatingCardBackground';
import { AtharBrandLogo } from '../components/AtharBrandLogo';
import { SakinaOasisCard } from '../components/SakinaOasisCard';
import { SakinaAndRightsModal, SakinaTab } from '../components/SakinaAndRightsModal';
import { ImpactTree } from '../components/ImpactTree';
import { 
  Clock, BookOpen, Heart, Compass, MapPin, RefreshCw, 
  ChevronLeft, ChevronDown, ChevronUp, Play, Pause, Award, 
  Trophy, Flame, BookMarked, CheckCircle2, Share2, Sparkles, Check,
  Moon, Repeat, Search, Image as ImageIcon, Coins, Headphones
} from 'lucide-react';

interface HomeViewProps {
  onNavigate: (tab: NavigationTab) => void;
  onOpenQuickAdhkar?: (category: 'morning' | 'evening') => void;
  onSelectSurah?: (surahNumber: number, ayahNumber?: number) => void;
  coordinates: Coordinates;
  onLocationChange: (coords: Coordinates) => void;
}

interface DailyVerseItem {
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  text: string;
  tafsir: string;
  theme: string;
}

const INSPIRATIONAL_VERSES: DailyVerseItem[] = [
  {
    surahNumber: 13,
    ayahNumber: 28,
    surahName: "الرعد",
    text: "الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُمْ بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ",
    tafsir: "يخبر تعالى أن قلوب المؤمنين تستقر وتسكن وتسلو بذكر الله تعالى، وتطمئن إذا سمعت آياته، وحقيق بها ذلك؛ فليس شيء ألذ للقلوب ولا أحلى من محبة خالقها والاطمئنان بذكره والإنابة إليه.",
    theme: "طمأنينة النفس وراحة البال بذكر الرحمن"
  },
  {
    surahNumber: 2,
    ayahNumber: 152,
    surahName: "البقرة",
    text: "فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ",
    tafsir: "فاذكروني بطاعتي وشكري والصلاة والتسبيح أذكركم بالثناء والرحمة والمغفرة وحسن الجزاء، واشكروا لي على نعمي الجليلة بالاعتراف بها وصرفها في طاعتي ولا تجحدوا إحساني.",
    theme: "شرف ذكر العبد في الملأ الأعلى"
  },
  {
    surahNumber: 94,
    ayahNumber: 5,
    surahName: "الشرح",
    text: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا",
    tafsir: "بشارة عظيمة؛ فكلما وجد عسر وضيق إلا وتبعه يسر وفرج قريب، ولن يغلب عسر واحد يسرين، فأيقن برحمة الله وتيسيره عند كل كرب.",
    theme: "بشارة التيسير وانفراج الكروب"
  },
  {
    surahNumber: 39,
    ayahNumber: 53,
    surahName: "الزمر",
    text: "قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنْفُسِهِمْ لَا تَقْنَطُوا مِنْ رَحْمَةِ اللَّهِ ۚ إِنَّ اللَّهَ يَغْفِرُ الذُّنُوبَ جَمِيعًا",
    tafsir: "هذه الآية الكريمة دعوة لجميع العصاة والمقصرين إلى التوبة والإنابة؛ يخبر تعالى أنه يغفر الذنوب جميعها لمن تاب منها ورجع إليه، فرحمته وسعت كل شيء.",
    theme: "سعة مغفرة الله ورحمته الشاملة"
  },
  {
    surahNumber: 65,
    ayahNumber: 3,
    surahName: "الطلاق",
    text: "وَمَنْ يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ ۚ إِنَّ اللَّهَ بَالِغُ أَمْرِهِ",
    tafsir: "ومن يفوض أمره إلى الله ويعتمد عليه بصدق كفاه كل ما أهمه من أمور دنياه وآخرته، فإن الله ينفذ مشيئته ولا يعجزه شيء في الأرض ولا في السماء.",
    theme: "كفاية المتوكلين على الله وتيسير أمورهم"
  },
  {
    surahNumber: 2,
    ayahNumber: 186,
    surahName: "البقرة",
    text: "وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ",
    tafsir: "يخبر تعالى بقربه من عباده ولطفه بهم، وسماعه لدعائهم واستجابته لهم؛ فادعُ الله بيقين ولا تيأس، فإنه يسمع نجواك في كل حين.",
    theme: "قرب الله من عباده وإجابة الدعاء"
  },
  {
    surahNumber: 3,
    ayahNumber: 139,
    surahName: "آل عمران",
    text: "وَلَا تَهِنُوا وَلَا تَحْزَنُوا وَأَنْتُمُ الْأَعْلَوْنَ إِنْ كُنْتُمْ مُؤْمِنِينَ",
    tafsir: "تسلية عظيمة وتثبيت لقلوب المؤمنين؛ لا تضعفوا ولا تستكينوا ولا يدخل الحزن قلوبكم، فالعاقبة الحميدة والنصر لكم بإيمانكم وثباتكم على الحق.",
    theme: "رفع العزيمة وطرد الوهن والحزن"
  },
  {
    surahNumber: 14,
    ayahNumber: 7,
    surahName: "إبراهيم",
    text: "وَإِذْ تَأَذَّنَ رَبُّكُمْ لَئِنْ شَكَرْتُمْ لَأَزِيدَنَّكُمْ",
    tafsir: "وعد إلهي مؤكد لا يتخلف؛ من اعترف بنعم ربه وشكره بلسانه وعمله حفظ الله نعمته عليه وزاده من فضله وخيراته في الدنيا والآخرة.",
    theme: "بركة الشكر ونماء النعم"
  },
  {
    surahNumber: 20,
    ayahNumber: 130,
    surahName: "طه",
    text: "فَاصْبِرْ عَلَىٰ مَا يَقُولُونَ وَسَبِّحْ بِحَمْدِ رَبِّكَ قَبْلَ طُلُوعِ الشَّمْسِ وَقَبْلَ غُرُوبِهَا",
    tafsir: "أمر بالصبر والتسبيح في أطراف النهار عند صلاة الفجر والعصر والصلوات كلها؛ فالتسبيح والذكر سلوة للقلب وطرد للهموم والضيق.",
    theme: "الصبر وتسبيح الله في البكور والأصيل"
  }
];

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onOpenQuickAdhkar,
  onSelectSurah,
  coordinates,
  onLocationChange
}) => {
  const [prayerData, setPrayerData] = useState<PrayerTimesData | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState<boolean>(false);

  // Modals
  const [isTasbihOpen, setIsTasbihOpen] = useState<boolean>(false);
  const [isWirdOpen, setIsWirdOpen] = useState<boolean>(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState<boolean>(false);
  const [isToolkitOpen, setIsToolkitOpen] = useState<boolean>(false);
  const [toolkitInitialTab, setToolkitInitialTab] = useState<'sleep_repeat' | 'search' | 'share_studio'>('sleep_repeat');
  const [shareCardPayload, setShareCardPayload] = useState<ShareCardPayload | null>(null);
  const [isZakatOpen, setIsZakatOpen] = useState<boolean>(false);
  const [isSakinaOpen, setIsSakinaOpen] = useState<boolean>(false);
  const [sakinaInitialTab, setSakinaInitialTab] = useState<SakinaTab>('heart_healing');
  const [tadabburStreak, setTadabburStreak] = useState<number>(() => StorageService.getTadabburProgress().streakDays);
  const [pendingDebtsCount, setPendingDebtsCount] = useState<number>(() => StorageService.getRightsAndWasayaState().records.filter(r => !r.isFulfilled).length);

  // Achievements & Stats
  const [khatmah, setKhatmah] = useState<QuranKhatmahState>(StorageService.getQuranKhatmah());
  const [adhkarStats, setAdhkarStats] = useState<AdhkarStats>(StorageService.getAdhkarStats());
  const [wirdConfig, setWirdConfig] = useState<DailyWirdConfig>(StorageService.getDailyWirdConfig());
  const [prayerAchievements, setPrayerAchievements] = useState<PrayerAchievementsState>(StorageService.getPrayerAchievements());
  const [lastQuranAudio, setLastQuranAudio] = useState<LastAudioPosition | null>(StorageService.getLastAudioPosition());
  const [lastAdhkarAudio, setLastAdhkarAudio] = useState<LastAdhkarAudio | null>(StorageService.getLastAdhkarAudio());
  const [activeAudio, setActiveAudio] = useState<ActiveAudioState | null>(AudioService.getCurrentState());
  const [isAdhkarPlayerOpen, setIsAdhkarPlayerOpen] = useState<boolean>(false);
  const [adhkarPlayerCategory, setAdhkarPlayerCategory] = useState<'morning' | 'evening'>('morning');
  const [adhkarPlayerStartIndex, setAdhkarPlayerStartIndex] = useState<number>(0);

  // Daily Verse & Tafsir
  const [verseIndex, setVerseIndex] = useState<number>(() => {
    const s = StorageService.getSettings();
    return s.dailyContentSettings?.currentVerseIndex ?? 0;
  });
  const [isTafsirOpen, setIsTafsirOpen] = useState<boolean>(false);
  const [isPlayingVerse, setIsPlayingVerse] = useState<boolean>(false);

  // Daily Prophetic Hadith
  const [hadithIndex, setHadithIndex] = useState<number>(() => {
    const s = StorageService.getSettings();
    return s.dailyContentSettings?.currentHadithIndex ?? 0;
  });
  const [isHadithExpOpen, setIsHadithExpOpen] = useState<boolean>(false);
  const [hadithToast, setHadithToast] = useState<string | null>(null);

  // Daily Ayah & Hadith Auto-Rotation based on user's configured rotation time & frequency
  useEffect(() => {
    const checkAndRotateDailyContent = () => {
      const s = StorageService.getSettings();
      const cfg = s.dailyContentSettings || {
        autoRotate: true,
        rotationHour: 0,
        customHourTime: '00:00',
        rotationFrequency: 'daily',
        currentVerseIndex: 0,
        currentHadithIndex: 0,
        lastRotatedKey: ''
      };

      if (!cfg.autoRotate) return;

      const now = new Date();
      const freq = cfg.rotationFrequency || 'daily';
      let currentPeriodKey = '';

      if (freq === '6h') {
        const slot = Math.floor(now.getHours() / 6);
        currentPeriodKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_6h_${slot}`;
      } else if (freq === '12h') {
        const slot = Math.floor(now.getHours() / 12);
        currentPeriodKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_12h_${slot}`;
      } else {
        const timeStr = cfg.customHourTime || '00:00';
        const [targetH, targetM] = timeStr.split(':').map(Number);
        const passedToday =
          now.getHours() > (targetH || 0) ||
          (now.getHours() === (targetH || 0) && now.getMinutes() >= (targetM || 0));
        const effectiveDate = new Date(now);
        if (!passedToday) {
          effectiveDate.setDate(effectiveDate.getDate() - 1);
        }
        currentPeriodKey = `${effectiveDate.getFullYear()}-${effectiveDate.getMonth() + 1}-${effectiveDate.getDate()}_${timeStr}`;
      }

      if (cfg.lastRotatedKey !== currentPeriodKey) {
        // Compute a deterministic or advancing index for the new period
        const nextV = cfg.lastRotatedKey
          ? ((cfg.currentVerseIndex ?? 0) + 1) % INSPIRATIONAL_VERSES.length
          : (now.getDate() + now.getMonth() * 3) % INSPIRATIONAL_VERSES.length;
        const nextH = cfg.lastRotatedKey
          ? ((cfg.currentHadithIndex ?? 0) + 1) % AUTHENTIC_HADITHS.length
          : (now.getDate() + now.getMonth() * 5) % AUTHENTIC_HADITHS.length;

        setVerseIndex(nextV);
        setHadithIndex(nextH);

        s.dailyContentSettings = {
          ...cfg,
          currentVerseIndex: nextV,
          currentHadithIndex: nextH,
          lastRotatedKey: currentPeriodKey
        };
        StorageService.saveSettings(s);
      }
    };

    checkAndRotateDailyContent();
    const interval = setInterval(checkAndRotateDailyContent, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadPrayerData();
    refreshLocalStats();

    // Listen to custom event updates so stats refresh immediately across the application
    const onKhatmahUpdate = (e: any) => {
      setKhatmah(e.detail || StorageService.getQuranKhatmah());
    };
    const onPrayersUpdate = (e: any) => {
      setPrayerAchievements(e.detail || StorageService.getPrayerAchievements());
    };
    const onSakinaUpdate = () => {
      setTadabburStreak(StorageService.getTadabburProgress().streakDays);
      setPendingDebtsCount(StorageService.getRightsAndWasayaState().records.filter(r => !r.isFulfilled).length);
    };

    window.addEventListener('athar_khatmah_updated', onKhatmahUpdate);
    window.addEventListener('athar_prayers_updated', onPrayersUpdate);
    window.addEventListener('athar_sakina_updated', onSakinaUpdate);

    return () => {
      window.removeEventListener('athar_khatmah_updated', onKhatmahUpdate);
      window.removeEventListener('athar_prayers_updated', onPrayersUpdate);
      window.removeEventListener('athar_sakina_updated', onSakinaUpdate);
    };
  }, [coordinates]);

  useEffect(() => {
    if (countdownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCountdownSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdownSeconds]);

  const refreshLocalStats = () => {
    setKhatmah(StorageService.getQuranKhatmah());
    setAdhkarStats(StorageService.getAdhkarStats());
    setWirdConfig(StorageService.getDailyWirdConfig());
    setPrayerAchievements(StorageService.getPrayerAchievements());
    setLastQuranAudio(StorageService.getLastAudioPosition());
    setLastAdhkarAudio(StorageService.getLastAdhkarAudio());
    setTadabburStreak(StorageService.getTadabburProgress().streakDays);
    setPendingDebtsCount(StorageService.getRightsAndWasayaState().records.filter(r => !r.isFulfilled).length);
  };

  const loadPrayerData = async () => {
    setIsLoading(true);
    const settings = StorageService.getSettings();
    try {
      const data = await PrayerTimesService.getPrayerTimes(coordinates, settings.calculationMethod);
      setPrayerData(data);
      setCountdownSeconds(data.timeRemainingSeconds);
    } catch {
      // Fallback handled inside service
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshLocation = async () => {
    setIsRefreshingLocation(true);
    const result = await LocationService.getCurrentPosition();
    if (result.coords) {
      onLocationChange(result.coords);
    }
    setIsRefreshingLocation(false);
  };

  const formatCountdown = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const currentVerse = INSPIRATIONAL_VERSES[verseIndex];
  const currentHadith = AUTHENTIC_HADITHS[hadithIndex];

  useEffect(() => {
    const unsub = AudioService.subscribe((state) => {
      setActiveAudio(state);
      setLastQuranAudio(StorageService.getLastAudioPosition());
      setLastAdhkarAudio(StorageService.getLastAdhkarAudio());
      if (state?.category !== 'reminder_verse' || !state.isPlaying) {
        setIsPlayingVerse(false);
      }
    });
    return () => unsub();
  }, []);

  const handlePlayOrResumeQuranAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeAudio?.category === 'quran') {
      AudioService.togglePlayPause();
      return;
    }
    const settings = StorageService.getSettings();
    const defaultReciterId = settings.selectedReciterId || 'alafasy';
    if (lastQuranAudio) {
      AudioService.playQuranContinuous(
        lastQuranAudio.surahNumber,
        lastQuranAudio.ayahNumber,
        lastQuranAudio.reciterId || defaultReciterId
      );
    } else {
      // Start and immediately record Al-Fatihah Ayah 1 as the first listening position
      AudioService.playQuranContinuous(1, 1, defaultReciterId);
    }
    setLastQuranAudio(StorageService.getLastAudioPosition());
  };

  const handlePlayOrResumeAdhkarAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeAudio?.category === 'adhkar') {
      AudioService.togglePlayPause();
      return;
    }
    const nowHour = new Date().getHours();
    const defaultCat: 'morning' | 'evening' = nowHour >= 3 && nowHour < 15 ? 'morning' : 'evening';
    const targetCat = lastAdhkarAudio ? lastAdhkarAudio.category : defaultCat;
    const targetIndex = lastAdhkarAudio ? lastAdhkarAudio.dhikrIndex : 0;

    setAdhkarPlayerCategory(targetCat);
    setAdhkarPlayerStartIndex(targetIndex);
    setIsAdhkarPlayerOpen(true);
  };

  const handlePlayVerseAudio = () => {
    if (isPlayingVerse) {
      AudioService.stopTemporaryAndResume();
      setIsPlayingVerse(false);
      return;
    }

    const settings = StorageService.getSettings();
    const reciterId = settings.selectedReciterId || 'alafasy';
    const reciter = VERIFIED_RECITERS.find(r => r.id === reciterId) || VERIFIED_RECITERS[0];
    const url = getAyahAudioUrl(reciter.audioServer, currentVerse.surahNumber, currentVerse.ayahNumber);

    setIsPlayingVerse(true);
    AudioService.playUrl(
      url,
      'reminder_verse',
      {
        title: `سورة ${currentVerse.surahName} (${currentVerse.ayahNumber})`,
        subtitle: `تلاوة ${reciter.nameArabic}`,
        surahNumber: currentVerse.surahNumber,
        ayahNumber: currentVerse.ayahNumber,
        reciterName: reciter.nameArabic
      },
      {
        onEnded: () => setIsPlayingVerse(false),
        onError: () => setIsPlayingVerse(false)
      }
    );
  };

  const handleShareHadith = async () => {
    const text = `✨ حديث نبوي شريف من تطبيق "أثر" ✨\n\n` +
      `قال رسول الله ﷺ:\n«${currentHadith.hadithText}»\n\n` +
      `• رواه: ${currentHadith.narrator}\n` +
      `• المصدر: ${currentHadith.source}\n` +
      `• المعنى والبيان: ${currentHadith.explanation}\n\n` +
      `اللهم انفعنا بسنة نبيك ﷺ 🤲`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `حديث شريف: ${currentHadith.theme}`,
          text
        });
        setHadithToast('تمت مشاركة الحديث الشريف بنجاح ✓');
        setTimeout(() => setHadithToast(null), 3000);
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(text);
      setHadithToast('تم نسخ الحديث الشريف وشرحه بنجاح ✓');
      setTimeout(() => setHadithToast(null), 3500);
    } catch {
      setHadithToast('تعذر النسخ');
      setTimeout(() => setHadithToast(null), 2500);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-24 space-y-4 max-w-lg mx-auto w-full select-none">
      {/* Top Header: Athar Brand & Location Chip */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <AtharBrandLogo size="md" showSubtitle={true} />

        {/* Location chip */}
        <button
          onClick={handleRefreshLocation}
          disabled={isRefreshingLocation}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#141B24]/90 hover:bg-[#1A232E] border border-slate-800 hover:border-[#D4AF37]/40 rounded-2xl text-slate-300 text-xs transition-all active:scale-95 shrink-0 shadow-sm"
          title="تحديث الموقع الجغرافي"
          aria-label="تحديث الموقع"
        >
          <MapPin size={13} className="text-[#D4AF37] shrink-0" />
          <span className="truncate max-w-[85px] sm:max-w-[120px] font-medium">{coordinates.city || 'القاهرة'}</span>
          <RefreshCw size={11} className={`text-slate-400 shrink-0 ${isRefreshingLocation ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Date Card: Hijri & Gregorian */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#121820]/70 border border-slate-800/80 rounded-2xl text-xs">
        <div className="text-right">
          <span className="text-[10px] text-slate-400 block">التاريخ الهجري</span>
          <span className="font-semibold text-[#D4AF37]">
            {prayerData?.dateHijri || '٢٧ ربيع الأول ١٤٤٨ هـ'}
          </span>
        </div>
        <div className="text-left border-r border-slate-800 pr-3">
          <span className="text-[10px] text-slate-400 block">التاريخ الميلادي</span>
          <span className="font-medium text-slate-300 tabular-nums">
            {new Date().toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>
      </div>

      {/* شجرة الأثر (Impact Tree) - Interactive Islamic Tree at Top of Home Screen */}
      <ImpactTree
        onNavigate={onNavigate}
        onOpenQuickAdhkar={onOpenQuickAdhkar}
        onOpenWirdModal={() => setIsWirdOpen(true)}
      />

      {/* Next Prayer Countdown Hero Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#151D26] to-[#0D1217] border border-[#D4AF37]/30 rounded-3xl p-5 shadow-2xl">
        <RotatingCardBackground slot="kaaba" cardOffset={0} intervalMs={24000} opacity={0.34} />
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none z-0" />

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="text-slate-300 flex items-center gap-1.5 font-medium">
            <Clock size={14} className="text-[#D4AF37]" />
            الصلاة القادمة
          </span>
          <span className="text-[#D4AF37] font-semibold text-xs">
            {formatPrayerTime12(prayerData?.nextPrayer?.time)}
          </span>
        </div>

        <div className="relative z-10 flex items-baseline justify-between mt-1">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-100 font-quran">
              {prayerData?.nextPrayer?.nameArabic || 'جاري التحميل...'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              الصلاة الحالية: <span className="text-slate-200 font-medium">{prayerData?.currentPrayer?.nameArabic || '---'}</span>
            </p>
          </div>

          <div className="text-left">
            <span className="text-[10px] text-slate-400 block">متبقي على الأذان</span>
            <span className="text-2xl font-black text-[#D4AF37] font-mono tabular-nums tracking-tight">
              {formatCountdown(countdownSeconds)}
            </span>
          </div>
        </div>

        {/* Quick Prayer Times Strip */}
        <div className="relative z-10 mt-5 pt-3.5 border-t border-slate-800/80 grid grid-cols-5 gap-1 text-center">
          {[
            { label: 'الفجر', time: prayerData?.timings.fajr, id: 'fajr' },
            { label: 'الظهر', time: prayerData?.timings.dhuhr, id: 'dhuhr' },
            { label: 'العصر', time: prayerData?.timings.asr, id: 'asr' },
            { label: 'المغرب', time: prayerData?.timings.maghrib, id: 'maghrib' },
            { label: 'العشاء', time: prayerData?.timings.isha, id: 'isha' },
          ].map((item) => {
            const isNext = prayerData?.nextPrayer?.id === item.id;
            return (
              <div
                key={item.id}
                className={`p-1.5 rounded-xl transition-all ${
                  isNext ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/40 shadow-sm' : 'bg-transparent'
                }`}
              >
                <span className={`text-[11px] block font-medium ${isNext ? 'text-[#D4AF37] font-bold' : 'text-slate-400'}`}>
                  {item.label}
                </span>
                <span className={`text-[10px] sm:text-[11px] font-mono tabular-nums whitespace-nowrap block mt-0.5 ${isNext ? 'text-[#D4AF37] font-bold' : 'text-slate-300'}`}>
                  {formatPrayerTime12(item.time)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Achievements & Daily Consistency Section with Last Listening Positions for Quran & Adhkar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Trophy size={14} className="text-[#D4AF37]" />
            <span>مؤشرات الإنجاز والمواظبة اليومية:</span>
          </span>
          <button
            onClick={() => setIsAchievementsOpen(true)}
            className="text-[11px] font-bold text-[#D4AF37] hover:underline flex items-center gap-0.5"
          >
            <span>عرض سجل الأوسمة</span>
            <ChevronLeft size={12} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* 1. Last Listening Position for Quran (Always visible & ready to record/play) */}
          <div
            onClick={() => {
              if (lastQuranAudio && onSelectSurah) {
                onSelectSurah(lastQuranAudio.surahNumber, lastQuranAudio.ayahNumber);
              } else {
                onNavigate('quran');
              }
            }}
            className="relative overflow-hidden bg-gradient-to-r from-[#17212E] to-[#111721] border border-[#D4AF37]/35 hover:border-[#D4AF37]/60 rounded-2xl p-3.5 cursor-pointer transition-all shadow-md active:scale-[0.99] flex items-center justify-between gap-2.5"
          >
            <RotatingCardBackground slot="quran" cardOffset={0} intervalMs={26000} opacity={0.28} />
            <div className="relative z-10 flex items-center gap-2.5 min-w-0">
              <div className="p-2.5 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 shrink-0">
                <Headphones size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-[#D4AF37] block">
                    آخر موضع استماع للقرآن
                  </span>
                </div>
                {lastQuranAudio ? (
                  <>
                    <h3 className="text-xs font-bold text-slate-100 truncate mt-0.5">
                      سورة {lastQuranAudio.surahName} · الآية {lastQuranAudio.ayahNumber}
                    </h3>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {lastQuranAudio.reciterName || 'الشيخ مشاري العفاسي'}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-xs font-bold text-slate-100 truncate mt-0.5">
                      سورة الفاتحة · الآية ١ (جاهز للتسجيل)
                    </h3>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      اضغط للاستماع وحفظ موضع تلاوتك تلقائياً
                    </p>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={handlePlayOrResumeQuranAudio}
              className={`relative z-10 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl shrink-0 transition-all active:scale-95 ${
                activeAudio?.category === 'quran' && activeAudio.isPlaying
                  ? 'bg-[#D4AF37] text-slate-950 shadow'
                  : 'bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#D4AF37] border border-[#D4AF37]/35'
              }`}
            >
              {activeAudio?.category === 'quran' && activeAudio.isPlaying ? (
                <>
                  <Pause size={11} fill="currentColor" />
                  <span>إيقاف</span>
                </>
              ) : (
                <>
                  <Play size={11} fill="currentColor" />
                  <span>{lastQuranAudio ? 'استئناف' : 'ابدأ الآن'}</span>
                </>
              )}
            </button>
          </div>

          {/* 2. Last Listening Position for Adhkar (Always visible & ready to record/play) */}
          <div
            onClick={() => onNavigate('adhkar')}
            className="relative overflow-hidden bg-gradient-to-r from-[#12211C] to-[#0E1714] border border-emerald-500/35 hover:border-emerald-500/60 rounded-2xl p-3.5 cursor-pointer transition-all shadow-md active:scale-[0.99] flex items-center justify-between gap-2.5"
          >
            <RotatingCardBackground slot="adhkar" cardOffset={2} intervalMs={28000} opacity={0.28} />
            <div className="relative z-10 flex items-center gap-2.5 min-w-0">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                <Headphones size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-emerald-400 block">
                    آخر موضع استماع للأذكار
                  </span>
                </div>
                {lastAdhkarAudio ? (
                  <>
                    <h3 className="text-xs font-bold text-slate-100 truncate mt-0.5">
                      {lastAdhkarAudio.category === 'morning' ? 'أذكار الصباح' : 'أذكار المساء'} · الذكر {lastAdhkarAudio.dhikrIndex + 1}
                    </h3>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {lastAdhkarAudio.playMode === 'continuous'
                        ? 'تلاوة متواصلة مباركة'
                        : `تكرار ${lastAdhkarAudio.currentRepetition}/${lastAdhkarAudio.targetRepetition}`}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-xs font-bold text-slate-100 truncate mt-0.5">
                      {new Date().getHours() >= 3 && new Date().getHours() < 15 ? 'أذكار الصباح' : 'أذكار المساء'} · الذكر ١ (جاهز للتسجيل)
                    </h3>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      اضغط للاستماع وحفظ موضع ذكرك تلقائياً
                    </p>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={handlePlayOrResumeAdhkarAudio}
              className={`relative z-10 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl shrink-0 transition-all active:scale-95 ${
                activeAudio?.category === 'adhkar' && activeAudio.isPlaying
                  ? 'bg-emerald-400 text-slate-950 shadow'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/35'
              }`}
            >
              {activeAudio?.category === 'adhkar' && activeAudio.isPlaying ? (
                <>
                  <Pause size={11} fill="currentColor" />
                  <span>إيقاف</span>
                </>
              ) : (
                <>
                  <Play size={11} fill="currentColor" />
                  <span>{lastAdhkarAudio ? 'استئناف' : 'ابدأ الآن'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Primary Feature Cards Grid (6 Balanced Cards with Rotating Kaaba & Islamic Photography) */}
      <div className="grid grid-cols-2 gap-3">
        {/* 1. Quran Card */}
        <button
          onClick={() => onNavigate('quran')}
          className="relative overflow-hidden bg-[#121820]/90 hover:bg-[#18202A] border border-slate-800 hover:border-[#D4AF37]/40 rounded-2xl p-4 text-right transition-all duration-200 flex flex-col justify-between active:scale-[0.98] shadow"
        >
          <RotatingCardBackground slot="quran" cardOffset={0} intervalMs={25000} opacity={0.32} />
          <div className="relative z-10 flex items-center justify-between w-full">
            <div className="p-2.5 rounded-xl bg-[#D4AF37]/20 text-[#D4AF37] backdrop-blur-sm">
              <BookOpen size={20} />
            </div>
            <ChevronLeft size={16} className="text-slate-300" />
          </div>
          <div className="relative z-10 mt-4">
            <h3 className="text-sm font-bold text-slate-100">القرآن الكريم</h3>
            <p className="text-[11px] text-slate-300 mt-0.5">تلاوة وقراءة متواصلة وتفسير</p>
          </div>
        </button>

        {/* 2. Adhkar Card */}
        <button
          onClick={() => onNavigate('adhkar')}
          className="relative overflow-hidden bg-[#121820]/90 hover:bg-[#18202A] border border-slate-800 hover:border-rose-500/40 rounded-2xl p-4 text-right transition-all duration-200 flex flex-col justify-between active:scale-[0.98] shadow"
        >
          <RotatingCardBackground slot="adhkar" cardOffset={1} intervalMs={27000} opacity={0.32} />
          <div className="relative z-10 flex items-center justify-between w-full">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 backdrop-blur-sm">
              <Heart size={20} />
            </div>
            <ChevronLeft size={16} className="text-slate-300" />
          </div>
          <div className="relative z-10 mt-4">
            <h3 className="text-sm font-bold text-slate-100">الأذكار المعتمدة</h3>
            <p className="text-[11px] text-slate-300 mt-0.5">الصباح والمساء بالصوت والعد</p>
          </div>
        </button>

        {/* 3. Digital Misbaha Card */}
        <button
          onClick={() => setIsTasbihOpen(true)}
          className="relative overflow-hidden bg-[#121820]/90 hover:bg-[#18202A] border border-slate-800 hover:border-purple-500/40 rounded-2xl p-4 text-right transition-all duration-200 flex flex-col justify-between active:scale-[0.98] shadow"
        >
          <RotatingCardBackground slot="tasbih" cardOffset={2} intervalMs={29000} opacity={0.32} />
          <div className="relative z-10 flex items-center justify-between w-full">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 text-lg flex items-center justify-center font-bold backdrop-blur-sm">
              📿
            </div>
            <ChevronLeft size={16} className="text-slate-300" />
          </div>
          <div className="relative z-10 mt-4">
            <h3 className="text-sm font-bold text-slate-100">المسبحة الرقمية</h3>
            <p className="text-[11px] text-slate-300 mt-0.5">تسبيح حر وأذكار مخصصة</p>
          </div>
        </button>

        {/* 4. Daily Wird Card */}
        <button
          onClick={() => setIsWirdOpen(true)}
          className="relative overflow-hidden bg-[#121820]/90 hover:bg-[#18202A] border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-4 text-right transition-all duration-200 flex flex-col justify-between active:scale-[0.98] shadow"
        >
          <RotatingCardBackground slot="wird" cardOffset={3} intervalMs={26000} opacity={0.32} />
          <div className="relative z-10 flex items-center justify-between w-full">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 backdrop-blur-sm">
              <Award size={20} />
            </div>
            <ChevronLeft size={16} className="text-slate-300" />
          </div>
          <div className="relative z-10 mt-4">
            <h3 className="text-sm font-bold text-slate-100">الورد اليومي</h3>
            <p className="text-[11px] text-slate-300 mt-0.5">
              إنجاز اليوم: {wirdConfig.completedTodayCount}/{wirdConfig.targetCount}
            </p>
          </div>
        </button>

        {/* 5. Achievements Center Card */}
        <button
          onClick={() => setIsAchievementsOpen(true)}
          className="relative overflow-hidden bg-[#121820]/90 hover:bg-[#18202A] border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 text-right transition-all duration-200 flex flex-col justify-between active:scale-[0.98] shadow"
        >
          <RotatingCardBackground slot="achievements" cardOffset={4} intervalMs={30000} opacity={0.32} />
          <div className="relative z-10 flex items-center justify-between w-full">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 backdrop-blur-sm">
              <Trophy size={20} />
            </div>
            <ChevronLeft size={16} className="text-slate-300" />
          </div>
          <div className="relative z-10 mt-4">
            <h3 className="text-sm font-bold text-slate-100">سجل الإنجازات</h3>
            <p className="text-[11px] text-slate-300 mt-0.5">القرآن والصلوات والأوسمة والمشاركة</p>
          </div>
        </button>

        {/* 6. Qibla Card */}
        <button
          onClick={() => onNavigate('qibla')}
          className="relative overflow-hidden bg-[#121820]/90 hover:bg-[#18202A] border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-4 text-right transition-all duration-200 flex flex-col justify-between active:scale-[0.98] shadow"
        >
          <RotatingCardBackground slot="kaaba" cardOffset={1} intervalMs={24000} opacity={0.36} />
          <div className="relative z-10 flex items-center justify-between w-full">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 backdrop-blur-sm">
              <Compass size={20} />
            </div>
            <ChevronLeft size={16} className="text-slate-300" />
          </div>
          <div className="relative z-10 mt-4">
            <h3 className="text-sm font-bold text-slate-100">اتجاه القبلة</h3>
            <p className="text-[11px] text-slate-300 mt-0.5">بوصلة دقيقة إلى الكعبة المشرفة</p>
          </div>
        </button>
      </div>

      {/* الواحة الإيمانية والإنسانية الكبرى: واحة السكينة والحقوق (فوق رفيق التلاوة والتدبر مباشرة) */}
      <SakinaOasisCard
        onOpenOasis={(tab) => {
          setSakinaInitialTab(tab || 'heart_healing');
          setIsSakinaOpen(true);
        }}
        pendingDebtsCount={pendingDebtsCount}
        tadabburStreak={tadabburStreak}
      />

      {/* Unified Elegant Card: Spiritual Toolkit (Sleep Timer, Ayah Repeat, Quran Search, Visual Share Studio) */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#16212E] via-[#121A24] to-[#0E151D] border border-[#D4AF37]/45 hover:border-[#D4AF37]/80 rounded-3xl p-4 shadow-xl transition-all">
        <RotatingCardBackground slot="kaaba" cardOffset={2} intervalMs={25000} opacity={0.32} />
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div
            onClick={() => {
              setToolkitInitialTab('sleep_repeat');
              setIsToolkitOpen(true);
            }}
            className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
          >
            <div className="w-11 h-11 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center shrink-0 shadow-md">
              <Headphones size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-[#D4AF37] bg-[#D4AF37]/15 px-2 py-0.5 rounded-full border border-[#D4AF37]/30">
                  رفيق التلاوة والتدبر
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-100 mt-1 truncate">
                واحة الخشوع والبطاقات الدعوية
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5 truncate">
                مؤقت النوم الذكي · تكرار الحفظ · بحث الآيات · بطاقات مصورة
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setToolkitInitialTab('sleep_repeat');
              setIsToolkitOpen(true);
            }}
            className="px-3 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-bold text-xs shrink-0 shadow-md active:scale-95 transition-all"
          >
            فتح الواحة
          </button>
        </div>

        {/* Quick Sub-Pills inside the single unified card */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
          <button
            onClick={() => {
              setToolkitInitialTab('sleep_repeat');
              setIsToolkitOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-[#141D28]/90 hover:bg-[#1B2736] text-indigo-300 border border-indigo-500/30 font-semibold transition-all"
          >
            <Moon size={13} />
            <span>مؤقت النوم والحفظ</span>
          </button>
          <button
            onClick={() => {
              setToolkitInitialTab('search');
              setIsToolkitOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-[#141D28]/90 hover:bg-[#1B2736] text-[#D4AF37] border border-[#D4AF37]/30 font-semibold transition-all"
          >
            <Search size={13} />
            <span>بحث بالقرآن</span>
          </button>
          <button
            onClick={() => {
              setToolkitInitialTab('share_studio');
              setIsToolkitOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-[#141D28]/90 hover:bg-[#1B2736] text-emerald-300 border border-emerald-500/30 font-semibold transition-all"
          >
            <ImageIcon size={13} />
            <span>بطاقة مصورة</span>
          </button>
          <button
            onClick={() => setIsZakatOpen(true)}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-[#141D28]/90 hover:bg-[#1B2736] text-amber-300 border border-amber-500/30 font-semibold transition-all"
          >
            <Coins size={13} />
            <span>الزكاة والصدقات</span>
          </button>
        </div>
      </div>

      {/* Daily Spiritual Touch: Verified Ayah with Interactive Tafsir & Audio */}
      <div className="relative overflow-hidden bg-[#131A22]/90 border border-slate-800 hover:border-[#D4AF37]/30 rounded-3xl p-5 space-y-3.5 shadow-lg transition-colors">
        <RotatingCardBackground slot="quran" cardOffset={2} intervalMs={28000} opacity={0.28} />
        <div className="relative z-10 flex items-center justify-between text-xs text-[#D4AF37] font-semibold">
          <div className="flex items-center gap-1.5">
            <BookMarked size={15} />
            <span>نفحة قرآنية يومية مع التفسير</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-300 font-normal">
              سورة {currentVerse.surahName} ({currentVerse.ayahNumber})
            </span>
            <button
              onClick={() => {
                if (isPlayingVerse) {
                  AudioService.stopTemporaryAndResume();
                }
                const nextIdx = (verseIndex + 1) % INSPIRATIONAL_VERSES.length;
                setVerseIndex(nextIdx);
                setIsPlayingVerse(false);
                const s = StorageService.getSettings();
                s.dailyContentSettings = {
                  ...s.dailyContentSettings,
                  currentVerseIndex: nextIdx
                };
                StorageService.saveSettings(s);
              }}
              className="text-[10px] text-slate-300 hover:text-[#D4AF37] transition-colors"
              title="آية أخرى"
            >
              آية أخرى ↻
            </button>
          </div>
        </div>

        {/* Ayah Sacred Arabic Text */}
        <p className="relative z-10 font-quran text-lg text-slate-100 leading-loose text-center py-1">
          ﴿{currentVerse.text}﴾
        </p>

        <p className="relative z-10 text-[11px] text-[#D4AF37] text-center font-medium">
          {currentVerse.theme}
        </p>

        {/* Action Row: Listen, Share Visual Card & View Tafsir */}
        <div className="relative z-10 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            {/* Audio Recite Button */}
            <button
              onClick={handlePlayVerseAudio}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all active:scale-95 ${
                isPlayingVerse
                  ? 'bg-[#D4AF37] text-slate-950 font-bold shadow'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200'
              }`}
            >
              {isPlayingVerse ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
              <span>{isPlayingVerse ? 'إيقاف التلاوة' : 'استماع للآية'}</span>
            </button>

            {/* Share as Visual Image Card Button */}
            <button
              onClick={() =>
                setShareCardPayload({
                  category: 'ayah',
                  title: currentVerse.theme,
                  mainText: `﴿${currentVerse.text}﴾`,
                  sourceLabel: `سورة ${currentVerse.surahName} · الآية ${currentVerse.ayahNumber}`,
                  subtitleOrTafsir: currentVerse.tafsir
                })
              }
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-semibold bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/30 transition-all active:scale-95"
              title="مشاركة الآية كبطاقة مصورة أنيقة"
            >
              <ImageIcon size={13} />
              <span>بطاقة مصورة</span>
            </button>
          </div>

          {/* Tafsir Expand Button */}
          <button
            onClick={() => setIsTafsirOpen(!isTafsirOpen)}
            className="flex items-center gap-1 text-slate-300 hover:text-[#D4AF37] text-xs font-semibold px-2 py-1.5 rounded-xl hover:bg-slate-800/60 transition-colors"
          >
            <span>{isTafsirOpen ? 'إخفاء التفسير' : 'تفسير الآية'}</span>
            {isTafsirOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Expanded Verified Tafsir Body */}
        {isTafsirOpen && (
          <div className="relative z-10 mt-3 p-3.5 bg-[#17212C]/95 border border-[#D4AF37]/25 rounded-2xl text-xs space-y-2 animate-slideDown shadow-inner">
            <div className="flex items-center gap-1.5 text-[#D4AF37] font-bold text-[11px]">
              <BookOpen size={13} />
              <span>التفسير الميسر المعتمد:</span>
            </div>
            <p className="text-slate-200 leading-relaxed text-justify text-[11px]">
              {currentVerse.tafsir}
            </p>
          </div>
        )}
      </div>

      {/* Daily Prophetic Touch: Authentic Hadith with Explanation & Share */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#151E28] to-[#101620] border border-cyan-500/35 hover:border-cyan-500/50 rounded-3xl p-5 space-y-3.5 shadow-xl transition-colors">
        <RotatingCardBackground slot="hadith" cardOffset={1} intervalMs={30000} opacity={0.28} />
        <div className="relative z-10 flex items-center justify-between text-xs text-cyan-400 font-semibold">
          <div className="flex items-center gap-1.5">
            <BookOpen size={15} />
            <span>نفحة نبوية شريفة</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-300 font-normal">
              {currentHadith.source}
            </span>
            <button
              onClick={() => {
                const nextIdx = (hadithIndex + 1) % AUTHENTIC_HADITHS.length;
                setHadithIndex(nextIdx);
                const s = StorageService.getSettings();
                s.dailyContentSettings = {
                  ...s.dailyContentSettings,
                  currentHadithIndex: nextIdx
                };
                StorageService.saveSettings(s);
              }}
              className="text-[10px] text-slate-300 hover:text-cyan-400 transition-colors"
              title="حديث آخر"
            >
              حديث آخر ↻
            </button>
          </div>
        </div>

        {/* Hadith Sacred Text */}
        <p className="relative z-10 font-quran text-base sm:text-lg text-slate-100 leading-loose text-center py-1">
          «{currentHadith.hadithText}»
        </p>

        <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-300 px-2">
          <span>عن: <strong className="text-slate-200">{currentHadith.narrator}</strong></span>
          <span className="text-cyan-400 font-medium">{currentHadith.theme}</span>
        </div>

        {/* Hadith Toast */}
        {hadithToast && (
          <div className="relative z-10 p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-[11px] text-emerald-300 animate-slideDown">
            <Check size={13} className="text-emerald-400 shrink-0" />
            <span>{hadithToast}</span>
          </div>
        )}

        {/* Action Row: Explanation & Share */}
        <div className="relative z-10 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            {/* Share as Visual Image Card Button */}
            <button
              onClick={() =>
                setShareCardPayload({
                  category: 'hadith',
                  title: currentHadith.theme,
                  mainText: `«${currentHadith.hadithText}»`,
                  sourceLabel: `${currentHadith.narrator} · ${currentHadith.source}`,
                  subtitleOrTafsir: currentHadith.explanation
                })
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/35 transition-all active:scale-95"
              title="تصميم ومشاركة الحديث كبطاقة مصورة أنيقة"
            >
              <ImageIcon size={13} />
              <span>بطاقة مصورة</span>
            </button>

            {/* Text Share Button */}
            <button
              onClick={handleShareHadith}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-all active:scale-95"
              title="نسخ أو مشاركة نص الحديث"
            >
              <Share2 size={12} />
              <span>نص</span>
            </button>
          </div>

          {/* Explanation Toggle */}
          <button
            onClick={() => setIsHadithExpOpen(!isHadithExpOpen)}
            className="flex items-center gap-1 text-slate-300 hover:text-cyan-300 text-xs font-semibold px-2 py-1.5 rounded-xl hover:bg-slate-800/60 transition-colors"
          >
            <span>{isHadithExpOpen ? 'إخفاء الشرح' : 'شرح الحديث وبيانه'}</span>
            {isHadithExpOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Expanded Hadith Explanation Body */}
        {isHadithExpOpen && (
          <div className="relative z-10 mt-3 p-3.5 bg-[#182330]/95 border border-cyan-500/25 rounded-2xl text-xs space-y-2 animate-slideDown shadow-inner">
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[11px]">
              <BookOpen size={13} />
              <span>البيان والمعنى النبوي المستفاد:</span>
            </div>
            <p className="text-slate-200 leading-relaxed text-justify text-[11px]">
              {currentHadith.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <SpiritualToolkitModal
        isOpen={isToolkitOpen}
        onClose={() => setIsToolkitOpen(false)}
        initialTab={toolkitInitialTab}
        onSelectSurah={(surahNum, ayahNum) => {
          if (onSelectSurah) {
            onSelectSurah(surahNum, ayahNum || 1);
          } else {
            onNavigate('quran');
          }
        }}
        dailyVersePayload={{
          category: 'ayah',
          title: currentVerse.theme,
          mainText: `﴿${currentVerse.text}﴾`,
          sourceLabel: `سورة ${currentVerse.surahName} · الآية ${currentVerse.ayahNumber}`,
          subtitleOrTafsir: currentVerse.tafsir
        }}
        dailyHadithPayload={{
          category: 'hadith',
          title: currentHadith.theme,
          mainText: `«${currentHadith.hadithText}»`,
          sourceLabel: `${currentHadith.narrator} · ${currentHadith.source}`,
          subtitleOrTafsir: currentHadith.explanation
        }}
      />

      <ShareCardModal
        isOpen={Boolean(shareCardPayload)}
        onClose={() => setShareCardPayload(null)}
        initialPayload={shareCardPayload}
      />

      <ZakatAndCharityModal
        isOpen={isZakatOpen}
        onClose={() => setIsZakatOpen(false)}
      />

      <DigitalTasbihModal
        isOpen={isTasbihOpen}
        onClose={() => {
          setIsTasbihOpen(false);
          refreshLocalStats();
        }}
        onNavigateToAdhkar={() => onNavigate('adhkar')}
      />

      <DailyWirdModal
        isOpen={isWirdOpen}
        onClose={() => {
          setIsWirdOpen(false);
          refreshLocalStats();
        }}
        onOpenSurah={(surahNum) => {
          if (onSelectSurah) {
            onSelectSurah(surahNum, 1);
          } else {
            onNavigate('quran');
          }
        }}
        onOpenReminders={() => onNavigate('reminders')}
      />

      <AchievementsOverviewModal
        isOpen={isAchievementsOpen}
        onClose={() => {
          setIsAchievementsOpen(false);
          refreshLocalStats();
        }}
        onNavigateToQuran={() => onNavigate('quran')}
        onNavigateToAdhkar={() => onNavigate('adhkar')}
        onNavigateToPrayers={() => onNavigate('prayers')}
      />

      <AdhkarPlayerSheet
        category={adhkarPlayerCategory}
        adhkarList={adhkarPlayerCategory === 'morning' ? MORNING_ADHKAR : EVENING_ADHKAR}
        startIndex={adhkarPlayerStartIndex}
        isOpen={isAdhkarPlayerOpen}
        onClose={() => {
          setIsAdhkarPlayerOpen(false);
          refreshLocalStats();
        }}
      />

      <SakinaAndRightsModal
        isOpen={isSakinaOpen}
        onClose={() => {
          setIsSakinaOpen(false);
          refreshLocalStats();
        }}
        initialTab={sakinaInitialTab}
      />
    </div>
  );
};
