import React, { useState, useEffect } from 'react';
import { 
  PrayerTimesData, NavigationTab, Coordinates, QuranKhatmahState, 
  AdhkarStats, DailyWirdConfig, PrayerAchievementsState,
  LastAudioPosition, LastAdhkarAudio
} from '../types';
import { PrayerTimesService, formatPrayerTime12 } from '../services/prayerTimesService';
import { StorageService } from '../services/storageService';
import { AudioService, ActiveAudioState } from '../services/audioService';
import { getAyahAudioUrl, VERIFIED_RECITERS } from '../data/surahsData';
import { MORNING_ADHKAR, EVENING_ADHKAR } from '../data/adhkarData';
import { AUTHENTIC_HADITHS } from '../data/hadithsData';
import { LUXURY_IMAGES } from '../data/storiesAndExploreData';
import { DigitalTasbihModal } from '../components/DigitalTasbihModal';
import { DailyWirdModal } from '../components/DailyWirdModal';
import { AchievementsOverviewModal } from '../components/AchievementsOverviewModal';
import { ShareCardModal, ShareCardPayload } from '../components/ShareCardModal';
import { AdhkarPlayerSheet } from '../components/AdhkarPlayerSheet';
import { ImpactTree } from '../components/ImpactTree';
import { AtharBrandLogo } from '../components/AtharBrandLogo';
import { CompanionMoodId } from '../data/companionData';
import { 
  Clock, BookOpen, Heart, Compass, 
  ChevronLeft, ChevronDown, ChevronUp, Play, Pause, Award, 
  Trophy, BookMarked, Share2, Sparkles, Check,
  Image as ImageIcon, Headphones, Settings, ScrollText, LayoutGrid,
  Landmark, ShieldCheck
} from 'lucide-react';

interface HomeViewProps {
  onNavigate: (tab: NavigationTab) => void;
  onOpenCompanion?: (mood?: CompanionMoodId) => void;
  onOpenQuickAdhkar?: (category: 'morning' | 'evening') => void;
  onSelectSurah?: (surahNumber: number, ayahNumber?: number) => void;
  onOpenVoiceAssistant?: () => void;
  onOpenZakat?: () => void;
  onOpenSakina?: () => void;
  onOpenSplashPreview?: () => void;
  onOpenWidgetsSuite?: () => void;
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
  onOpenCompanion,
  onOpenQuickAdhkar,
  onSelectSurah,
  onOpenZakat,
  onOpenSakina,
  onOpenWidgetsSuite,
  coordinates,
}) => {
  const [prayerData, setPrayerData] = useState<PrayerTimesData>(() =>
    PrayerTimesService.getInitialPrayerTimes(coordinates)
  );
  const [countdownSeconds, setCountdownSeconds] = useState<number>(() =>
    PrayerTimesService.getInitialPrayerTimes(coordinates).timeRemainingSeconds
  );

  // Modals
  const [isTasbihOpen, setIsTasbihOpen] = useState<boolean>(false);
  const [isWirdOpen, setIsWirdOpen] = useState<boolean>(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState<boolean>(false);
  const [shareCardPayload, setShareCardPayload] = useState<ShareCardPayload | null>(null);

  // Achievements & Stats
  const [, setKhatmah] = useState<QuranKhatmahState>(StorageService.getQuranKhatmah());
  const [, setAdhkarStats] = useState<AdhkarStats>(StorageService.getAdhkarStats());
  const [wirdConfig, setWirdConfig] = useState<DailyWirdConfig>(StorageService.getDailyWirdConfig());
  const [, setPrayerAchievements] = useState<PrayerAchievementsState>(StorageService.getPrayerAchievements());
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

    const onKhatmahUpdate = (e: any) => {
      setKhatmah(e.detail || StorageService.getQuranKhatmah());
    };
    const onPrayersUpdate = (e: any) => {
      setPrayerAchievements(e.detail || StorageService.getPrayerAchievements());
    };

    window.addEventListener('athar_khatmah_updated', onKhatmahUpdate);
    window.addEventListener('athar_prayers_updated', onPrayersUpdate);

    return () => {
      window.removeEventListener('athar_khatmah_updated', onKhatmahUpdate);
      window.removeEventListener('athar_prayers_updated', onPrayersUpdate);
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
  };

  const loadPrayerData = async () => {
    const settings = StorageService.getSettings();
    try {
      const data = await PrayerTimesService.getPrayerTimes(coordinates, settings.calculationMethod);
      setPrayerData(data);
      setCountdownSeconds(data.timeRemainingSeconds);
    } catch {
      // Fallback handled inside service
    }
  };

  const formatCountdownShort = (totalSec: number) => {
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
    const targetRep = lastAdhkarAudio ? lastAdhkarAudio.currentRepetition : 1;
    const targetMode = lastAdhkarAudio?.playMode || 'repeated';

    AudioService.playAdhkarContinuous(targetCat, targetIndex, targetRep, targetMode);
    setLastAdhkarAudio(StorageService.getLastAdhkarAudio());
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
    <div className="athar-page-container">
      {/* 1. Clean, Box-Free Centered Royal Athar Emblem, Greeting with Left/Right Golden Lines, Tagline & Dual Dates */}
      <div className="pt-2 pb-3 text-center flex flex-col items-center justify-center">
        {/* Pure Royal Athar Emblem Only (No external wordmark or dashes) */}
        <AtharBrandLogo size="lg" centered />

        {/* Centered Title & Spiritual Greeting with Left & Right Golden Lines */}
        <div className="flex items-center justify-center gap-3 mt-2">
          <span className="h-[1.5px] w-12 sm:w-16 bg-gradient-to-l from-[#E6C66E] to-transparent rounded-full" />
          <h1 className="text-lg sm:text-xl font-extrabold text-[#F3E5AB] tracking-wide">
            السلام عليكم ورحمة الله
          </h1>
          <span className="h-[1.5px] w-12 sm:w-16 bg-gradient-to-r from-[#E6C66E] to-transparent rounded-full" />
        </div>

        {/* Inspirational Tagline */}
        <p className="text-xs font-bold text-[#E6C66E] mt-1.5">
          مستمر في طريقك إلى الله · خطوةٌ مباركة كل يوم
        </p>

        {/* Dual Hijri & Gregorian Dates (Clean Text without Box) */}
        <div className="mt-1.5 flex items-center justify-center gap-2 flex-wrap text-xs">
          <span className="font-extrabold text-[#F3E5AB]">
            {prayerData?.dateHijri || '٢٧ ربيع الأول ١٤٤٨ هـ'}
          </span>
          <span className="text-[#E6C66E] font-black">•</span>
          <span className="font-bold text-[#C4B998]">
            {prayerData?.dateGregorian ||
              new Intl.DateTimeFormat('ar-EG', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }).format(new Date())}
          </span>
        </div>
      </div>

      {/* 2. Hero Sunset Mosque Next Prayer Banner (Matches Reference Showcase) */}
      <div className="relative overflow-hidden rounded-3xl border border-[#C8A24A]/50 shadow-[0_14px_40px_rgba(0,0,0,0.95)] bg-[#0E0D0A]">
        {/* Sunset Mosque Panoramic Image */}
        <div className="relative h-44 w-full overflow-hidden">
          <img
            src={LUXURY_IMAGES.sunsetMosqueBanner}
            alt="بطاقة الصلاة القادمة"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090806] via-[#090806]/45 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-l from-[#090806]/85 via-[#090806]/30 to-transparent" />

          {/* Content Inside Hero Mosque Banner */}
          <div className="absolute inset-0 p-5 flex flex-col justify-between text-right">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-[#070707]/80 backdrop-blur-md border border-[#C8A24A]/45 text-[11px] font-bold text-[#E6C66E] flex items-center gap-1.5">
                <Clock size={12} />
                <span>الصلاة القادمة</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-[#070707]/80 backdrop-blur-md border border-[#C8A24A]/35 text-[11px] font-bold text-white tabular-nums">
                {formatPrayerTime12(prayerData?.nextPrayer?.time)}
              </span>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                  الصلاة القادمة: <span className="text-[#F3E5AB]">{prayerData?.nextPrayer?.nameArabic || 'الفجر'}</span>
                </h2>
                <p className="text-sm font-extrabold text-[#E6C66E] mt-1 font-mono tabular-nums">
                  بعد {formatCountdownShort(countdownSeconds)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Horizontal 5-Prayer Strip with Burnished Gold Highlight for Active/Next Prayer */}
        <div className="p-2.5 bg-[#0C0B09] border-t border-[#C8A24A]/30 grid grid-cols-5 gap-1.5 text-center">
          {[
            { label: 'الفجر', time: prayerData?.timings.fajr, id: 'fajr' },
            { label: 'الظهر', time: prayerData?.timings.dhuhr, id: 'dhuhr' },
            { label: 'العصر', time: prayerData?.timings.asr, id: 'asr' },
            { label: 'المغرب', time: prayerData?.timings.maghrib, id: 'maghrib' },
            { label: 'العشاء', time: prayerData?.timings.isha, id: 'isha' },
          ].map((item) => {
            const isNext = prayerData?.nextPrayer?.id === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate('prayers')}
                className={`py-2 px-1 rounded-2xl transition-all border ${
                  isNext
                    ? 'bg-gradient-to-b from-[#E6C66E] via-[#C8A24A] to-[#A6802B] text-[#070707] border-[#F3E5AB] shadow-[0_4px_15px_rgba(200,162,74,0.4)] scale-[1.02]'
                    : 'bg-[#14120E] text-[#C4B998] border-[#C8A24A]/20 hover:border-[#C8A24A]/50'
                }`}
              >
                <span className={`text-xs block ${isNext ? 'font-black text-[#070707]' : 'font-bold text-white'}`}>
                  {item.label}
                </span>
                <span className={`text-[10px] font-mono tabular-nums whitespace-nowrap block mt-0.5 ${isNext ? 'font-extrabold text-[#070707]' : 'text-[#C4B998]'}`}>
                  {formatPrayerTime12(item.time)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. شجرة الأثر (Impact Tree) - Placed directly underneath Next Prayer Banner */}
      <ImpactTree
        onNavigate={onNavigate}
        onOpenQuickAdhkar={onOpenQuickAdhkar}
        onOpenWirdModal={() => setIsWirdOpen(true)}
      />

      {/* 4.5. حزمة ودجات أثر والتنبيهات الحية (Widgets & Live Activities Suite) */}
      {onOpenWidgetsSuite && (
        <button
          onClick={onOpenWidgetsSuite}
          className="w-full group relative overflow-hidden rounded-3xl bg-gradient-to-l from-[#1D180F] via-[#13100A] to-[#0B0A08] border border-[#C8A24A]/55 hover:border-[#F3E5AB] p-4 flex items-center justify-between gap-3 shadow-[0_12px_32px_rgba(0,0,0,0.9)] transition-all active:scale-[0.99] text-right"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#2B2312] to-[#141008] border border-[#E6C66E]/65 flex items-center justify-center text-[#E6C66E] shrink-0 shadow-[0_0_16px_rgba(200,162,74,0.3)] group-hover:scale-105 transition-transform">
              <LayoutGrid size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-extrabold text-[#F3E5AB] group-hover:text-white transition-colors">
                  ودجات أثر والتنبيهات الحية (Live Activities)
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#C8A24A]/20 border border-[#E6C66E]/55 text-[#E6C66E] font-extrabold">
                  شاشة القفل والـ Dynamic Island
                </span>
              </div>
              <p className="text-[11px] text-[#C4B998] mt-0.5 truncate">
                ودجت الصلاة (صغير ومتوسط) · شجرة الأثر والآية · شريط العد التنازلي للإقامة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-extrabold text-[#E6C66E] shrink-0 bg-[#1B170F] px-3 py-1.5 rounded-xl border border-[#C8A24A]/40">
            <span>معاينة</span>
            <ChevronLeft size={14} />
          </div>
        </button>
      )}

      {/* 5. Resume Listening Cards (Quran & Adhkar) in Luxury Obsidian & Gold - Placed directly underneath ImpactTree */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-extrabold text-[#E6C66E] flex items-center gap-1.5">
            <Trophy size={14} className="text-[#C8A24A]" />
            <span>آخر موضع استماع للقرآن والأذكار:</span>
          </span>
          <button
            onClick={() => setIsAchievementsOpen(true)}
            className="text-[11px] font-bold text-[#E6C66E] hover:underline flex items-center gap-0.5"
          >
            <span>سجل الأوسمة</span>
            <ChevronLeft size={12} />
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {/* Last Listening Position for Quran */}
          <div
            onClick={() => {
              if (lastQuranAudio && onSelectSurah) {
                onSelectSurah(lastQuranAudio.surahNumber, lastQuranAudio.ayahNumber);
              } else {
                onNavigate('quran');
              }
            }}
            className="athar-card hover:border-[#E6C66E]/70 cursor-pointer transition-all active:scale-[0.99] flex items-center justify-between gap-2.5"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2.5 rounded-xl bg-[#1F1B12] text-[#E6C66E] border border-[#C8A24A]/40 shrink-0">
                <Headphones size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-[#E6C66E] block">
                  آخر موضع استماع للقرآن
                </span>
                {lastQuranAudio ? (
                  <>
                    <h3 className="text-xs font-extrabold text-white truncate mt-0.5">
                      سورة {lastQuranAudio.surahName} · الآية {lastQuranAudio.ayahNumber}
                    </h3>
                    <p className="text-[10px] text-[#C4B998] truncate mt-0.5">
                      {lastQuranAudio.reciterName || 'الشيخ مشاري العفاسي'}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-xs font-extrabold text-white truncate mt-0.5">
                      سورة الفاتحة · الآية ١
                    </h3>
                    <p className="text-[10px] text-[#C4B998] truncate mt-0.5">
                      اضغط للاستماع وحفظ موضع تلاوتك
                    </p>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={handlePlayOrResumeQuranAudio}
              className={`flex items-center gap-1 text-[11px] font-extrabold px-3 py-1.5 rounded-xl shrink-0 transition-all active:scale-95 ${
                activeAudio?.category === 'quran' && activeAudio.isPlaying
                  ? 'bg-[#E6C66E] text-[#070707] shadow'
                  : 'bg-[#C8A24A] text-[#070707] hover:bg-[#E6C66E]'
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
                  <span>{lastQuranAudio ? 'استئناف' : 'تشغيل'}</span>
                </>
              )}
            </button>
          </div>

          {/* Last Listening Position for Adhkar */}
          <div
            onClick={() => onNavigate('adhkar')}
            className="athar-card hover:border-[#E6C66E]/70 cursor-pointer transition-all active:scale-[0.99] flex items-center justify-between gap-2.5"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2.5 rounded-xl bg-[#1F1B12] text-[#E6C66E] border border-[#C8A24A]/40 shrink-0">
                <Heart size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-[#E6C66E] block">
                  آخر موضع استماع للأذكار
                </span>
                {lastAdhkarAudio ? (
                  <>
                    <h3 className="text-xs font-extrabold text-white truncate mt-0.5">
                      {lastAdhkarAudio.category === 'morning' ? 'أذكار الصباح' : 'أذكار المساء'} · الذكر {lastAdhkarAudio.dhikrIndex + 1}
                    </h3>
                    <p className="text-[10px] text-[#C4B998] truncate mt-0.5">
                      {lastAdhkarAudio.playMode === 'continuous'
                        ? 'تلاوة متواصلة مباركة'
                        : `تكرار ${lastAdhkarAudio.currentRepetition}/${lastAdhkarAudio.targetRepetition}`}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-xs font-extrabold text-white truncate mt-0.5">
                      {new Date().getHours() >= 3 && new Date().getHours() < 15 ? 'أذكار الصباح' : 'أذكار المساء'} · الذكر ١
                    </h3>
                    <p className="text-[10px] text-[#C4B998] truncate mt-0.5">
                      اضغط للاستماع وحفظ موضع ذكرك
                    </p>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={handlePlayOrResumeAdhkarAudio}
              className={`flex items-center gap-1 text-[11px] font-extrabold px-3 py-1.5 rounded-xl shrink-0 transition-all active:scale-95 ${
                activeAudio?.category === 'adhkar' && activeAudio.isPlaying
                  ? 'bg-[#E6C66E] text-[#070707] shadow'
                  : 'bg-[#C8A24A] text-[#070707] hover:bg-[#E6C66E]'
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
                  <span>{lastAdhkarAudio ? 'استئناف' : 'تشغيل'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 8. Daily Spiritual Touch: Verified Ayah with Interactive Tafsir & Audio */}
      <div className="athar-card space-y-3.5 border border-[#C8A24A]/40">
        <div className="flex items-center justify-between text-xs text-[#E6C66E] font-extrabold">
          <div className="flex items-center gap-1.5">
            <BookMarked size={15} />
            <span>نفحة قرآنية يومية مع التفسير</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#C4B998] font-bold">
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
              className="text-[10px] text-[#C4B998] hover:text-[#E6C66E] transition-colors"
              title="آية أخرى"
            >
              آية أخرى ↻
            </button>
          </div>
        </div>

        <p className="font-quran text-lg sm:text-xl text-[#F3E5AB] leading-loose text-center py-1">
          ﴿{currentVerse.text}﴾
        </p>

        <p className="text-[11px] text-[#C8A24A] text-center font-bold">
          {currentVerse.theme}
        </p>

        <div className="pt-2.5 border-t border-[#C8A24A]/25 flex items-center justify-between gap-2 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePlayVerseAudio}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold transition-all active:scale-95 ${
                isPlayingVerse
                  ? 'bg-[#E6C66E] text-[#070707] shadow'
                  : 'bg-[#1C1810] hover:bg-[#272217] text-[#E6C66E] border border-[#C8A24A]/40'
              }`}
            >
              {isPlayingVerse ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
              <span>{isPlayingVerse ? 'إيقاف التلاوة' : 'استماع للآية'}</span>
            </button>

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
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold bg-[#14120E] hover:bg-[#1E1B14] text-[#C4B998] hover:text-[#E6C66E] border border-[#C8A24A]/30 transition-all active:scale-95"
            >
              <ImageIcon size={13} />
              <span>بطاقة مصورة</span>
            </button>
          </div>

          <button
            onClick={() => setIsTafsirOpen(!isTafsirOpen)}
            className="flex items-center gap-1 text-[#C4B998] hover:text-[#E6C66E] text-xs font-bold px-2 py-1.5 rounded-xl hover:bg-[#171510] transition-colors"
          >
            <span>{isTafsirOpen ? 'إخفاء التفسير' : 'تفسير الآية'}</span>
            {isTafsirOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {isTafsirOpen && (
          <div className="mt-2 p-3.5 bg-[#0C0B09] border border-[#C8A24A]/35 rounded-2xl text-xs space-y-2 animate-slideDown">
            <div className="flex items-center gap-1.5 text-[#E6C66E] font-extrabold text-[11px]">
              <BookOpen size={13} />
              <span>التفسير الميسر المعتمد:</span>
            </div>
            <p className="text-white/95 leading-relaxed text-justify text-[11px]">
              {currentVerse.tafsir}
            </p>
          </div>
        )}
      </div>

      {/* 9. Daily Prophetic Touch: Authentic Hadith */}
      <div className="athar-card space-y-3.5 border border-[#C8A24A]/35">
        <div className="flex items-center justify-between text-xs text-[#E6C66E] font-extrabold">
          <div className="flex items-center gap-1.5">
            <BookOpen size={15} />
            <span>نفحة نبوية شريفة</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#C4B998] font-bold">
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
              className="text-[10px] text-[#C4B998] hover:text-[#E6C66E] transition-colors"
            >
              حديث آخر ↻
            </button>
          </div>
        </div>

        <p className="font-quran text-base sm:text-lg text-white leading-loose text-center py-1">
          «{currentHadith.hadithText}»
        </p>

        <div className="flex items-center justify-between text-[11px] text-[#C4B998] px-2">
          <span>عن: <strong className="text-white">{currentHadith.narrator}</strong></span>
          <span className="text-[#E6C66E] font-bold">{currentHadith.theme}</span>
        </div>

        {hadithToast && (
          <div className="p-2.5 bg-[#1B170F] border border-[#C8A24A]/50 rounded-xl flex items-center gap-2 text-[11px] text-[#E6C66E] animate-slideDown">
            <Check size={13} className="text-[#E6C66E] shrink-0" />
            <span>{hadithToast}</span>
          </div>
        )}

        <div className="pt-2.5 border-t border-[#C8A24A]/25 flex items-center justify-between gap-2 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold bg-[#1C1810] hover:bg-[#272217] text-[#E6C66E] border border-[#C8A24A]/40 transition-all active:scale-95"
            >
              <ImageIcon size={13} />
              <span>بطاقة مصورة</span>
            </button>

            <button
              onClick={handleShareHadith}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold bg-[#14120E] hover:bg-[#1E1B14] text-[#C4B998] border border-[#C8A24A]/25 transition-all active:scale-95"
            >
              <Share2 size={12} />
              <span>نسخ</span>
            </button>
          </div>

          <button
            onClick={() => setIsHadithExpOpen(!isHadithExpOpen)}
            className="flex items-center gap-1 text-[#C4B998] hover:text-[#E6C66E] text-xs font-bold px-2 py-1.5 rounded-xl hover:bg-[#171510] transition-colors"
          >
            <span>{isHadithExpOpen ? 'إخفاء الشرح' : 'شرح الحديث وبيانه'}</span>
            {isHadithExpOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {isHadithExpOpen && (
          <div className="mt-2 p-3.5 bg-[#0C0B09] border border-[#C8A24A]/35 rounded-2xl text-xs space-y-2 animate-slideDown">
            <div className="flex items-center gap-1.5 text-[#E6C66E] font-extrabold text-[11px]">
              <BookOpen size={13} />
              <span>البيان والمعنى النبوي المستفاد:</span>
            </div>
            <p className="text-white/95 leading-relaxed text-justify text-[11px]">
              {currentHadith.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <ShareCardModal
        isOpen={Boolean(shareCardPayload)}
        onClose={() => setShareCardPayload(null)}
        initialPayload={shareCardPayload}
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
    </div>
  );
};
