import React, { useState, useEffect } from 'react';
import { 
  PrayerTimesData, NavigationTab, Coordinates, QuranKhatmahState, 
  AdhkarStats, DailyWirdConfig, PrayerAchievementsState 
} from '../types';
import { PrayerTimesService, formatPrayerTime12 } from '../services/prayerTimesService';
import { LocationService } from '../services/locationService';
import { StorageService } from '../services/storageService';
import { AudioService } from '../services/audioService';
import { getAyahAudioUrl, VERIFIED_RECITERS } from '../data/surahsData';
import { AUTHENTIC_HADITHS } from '../data/hadithsData';
import { DigitalTasbihModal } from '../components/DigitalTasbihModal';
import { DailyWirdModal } from '../components/DailyWirdModal';
import { AchievementsOverviewModal } from '../components/AchievementsOverviewModal';
import { 
  Clock, BookOpen, Heart, Compass, MapPin, RefreshCw, 
  ChevronLeft, ChevronDown, ChevronUp, Play, Pause, Award, 
  Trophy, Flame, BookMarked, CheckCircle2, Share2, Sparkles, Check
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

  // Achievements & Stats
  const [khatmah, setKhatmah] = useState<QuranKhatmahState>(StorageService.getQuranKhatmah());
  const [adhkarStats, setAdhkarStats] = useState<AdhkarStats>(StorageService.getAdhkarStats());
  const [wirdConfig, setWirdConfig] = useState<DailyWirdConfig>(StorageService.getDailyWirdConfig());
  const [prayerAchievements, setPrayerAchievements] = useState<PrayerAchievementsState>(StorageService.getPrayerAchievements());

  // Daily Verse & Tafsir
  const [verseIndex, setVerseIndex] = useState<number>(0);
  const [isTafsirOpen, setIsTafsirOpen] = useState<boolean>(false);
  const [isPlayingVerse, setIsPlayingVerse] = useState<boolean>(false);

  // Daily Prophetic Hadith
  const [hadithIndex, setHadithIndex] = useState<number>(0);
  const [isHadithExpOpen, setIsHadithExpOpen] = useState<boolean>(false);
  const [hadithToast, setHadithToast] = useState<string | null>(null);

  // Daily Ayah & Hadith Auto-Rotation based on user's configured rotation time
  useEffect(() => {
    const updateDailyContent = () => {
      const s = StorageService.getSettings();
      if (s.dailyContentSettings?.autoRotate) {
        const timeStr = s.dailyContentSettings.customHourTime || '00:00';
        const [targetH, targetM] = timeStr.split(':').map(Number);
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
        const passedToday = (now.getHours() > (targetH || 0)) || (now.getHours() === (targetH || 0) && now.getMinutes() >= (targetM || 0));
        const effectiveDay = dayOfYear + (passedToday ? 1 : 0);
        
        setVerseIndex(Math.abs(effectiveDay) % INSPIRATIONAL_VERSES.length);
        setHadithIndex(Math.abs(effectiveDay) % AUTHENTIC_HADITHS.length);
      }
    };
    updateDailyContent();
    const interval = setInterval(updateDailyContent, 30000);
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

  const handlePlayVerseAudio = () => {
    if (isPlayingVerse) {
      AudioService.stop();
      setIsPlayingVerse(false);
      return;
    }

    AudioService.stop();
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

  const khatmahPercent = Math.round(((khatmah.completedSurahs?.length || 0) / 114) * 100);

  const loggedPrayersCount = [
    prayerAchievements.todayPrayers.fajr,
    prayerAchievements.todayPrayers.dhuhr,
    prayerAchievements.todayPrayers.asr,
    prayerAchievements.todayPrayers.maghrib,
    prayerAchievements.todayPrayers.isha,
  ].filter(Boolean).length;
  const prayersPercent = Math.round((loggedPrayersCount / 5) * 100);

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-24 space-y-4 max-w-lg mx-auto w-full select-none">
      {/* Top Header: Athar Brand & Location Chip */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-100 font-quran">
              أَثَـــــر
            </h1>
            <span className="text-[10px] font-semibold bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded-full border border-[#D4AF37]/30">
              ATHAR
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            رفيقك اليومي للقرآن والصلاة والذكر
          </p>
        </div>

        {/* Location chip */}
        <button
          onClick={handleRefreshLocation}
          disabled={isRefreshingLocation}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141B24]/80 hover:bg-[#1A232E] border border-slate-800 rounded-full text-slate-300 text-xs transition-colors active:scale-95"
          title="تحديث الموقع الجغرافي"
          aria-label="تحديث الموقع"
        >
          <MapPin size={13} className="text-[#D4AF37]" />
          <span className="truncate max-w-[100px]">{coordinates.city || 'القاهرة'}</span>
          <RefreshCw size={11} className={`text-slate-400 ${isRefreshingLocation ? 'animate-spin' : ''}`} />
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

      {/* Next Prayer Countdown Hero Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#151D26] to-[#0D1217] border border-[#D4AF37]/30 rounded-3xl p-5 shadow-2xl">
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="text-slate-300 flex items-center gap-1.5 font-medium">
            <Clock size={14} className="text-[#D4AF37]" />
            الصلاة القادمة
          </span>
          <span className="text-[#D4AF37] font-semibold text-xs">
            {formatPrayerTime12(prayerData?.nextPrayer?.time)}
          </span>
        </div>

        <div className="flex items-baseline justify-between mt-1">
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
        <div className="mt-5 pt-3.5 border-t border-slate-800/80 grid grid-cols-5 gap-1 text-center">
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

      {/* Progress Bars for Achievements (Quran Khatmah, Prayers Streak, Adhkar Streak) */}
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* 1. Quran Khatmah Progress Bar Card */}
          <div
            onClick={() => setIsAchievementsOpen(true)}
            className="bg-gradient-to-r from-[#17212E] to-[#111721] border border-[#D4AF37]/35 hover:border-[#D4AF37]/60 rounded-2xl p-3 cursor-pointer transition-all shadow-md active:scale-[0.99]"
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-1.5 truncate">
                <BookOpen size={13} className="text-[#D4AF37] shrink-0" />
                <span className="font-bold text-slate-100 truncate">الختمة القرآنية</span>
              </div>
              <span className="text-xs font-bold text-[#D4AF37] font-mono tabular-nums">{khatmahPercent}%</span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#D4AF37] to-[#F3DB7B] h-full transition-all duration-300"
                style={{ width: `${khatmahPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
              <span>{khatmah.completedSurahs?.length || 0}/114 سورة</span>
              <span className="text-emerald-400 font-medium tabular-nums">{khatmah.todayMinutesListened} د استماع</span>
            </div>
          </div>

          {/* 2. Prayer Streak & Daily Check-in Card */}
          <div
            onClick={() => onNavigate('prayers')}
            className="bg-gradient-to-r from-[#14202B] to-[#0E161F] border border-cyan-500/35 hover:border-cyan-500/60 rounded-2xl p-3 cursor-pointer transition-all shadow-md active:scale-[0.99]"
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-1.5 truncate">
                <Clock size={13} className="text-cyan-400 shrink-0" />
                <span className="font-bold text-slate-100 truncate">صلوات اليوم</span>
              </div>
              <span className="flex items-center gap-1 text-xs font-bold text-cyan-400 tabular-nums">
                <Flame size={12} className="fill-cyan-400" />
                <span>{prayerAchievements.streakDays} أيام</span>
              </span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-300"
                style={{ width: `${prayersPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
              <span>مسجل: {loggedPrayersCount}/5 صلوات</span>
              <span className="text-cyan-300 font-semibold">{prayersPercent}%</span>
            </div>
          </div>

          {/* 3. Adhkar & Streak Progress Card */}
          <div
            onClick={() => setIsAchievementsOpen(true)}
            className="bg-gradient-to-r from-[#1C1622] to-[#130F17] border border-rose-500/35 hover:border-rose-500/60 rounded-2xl p-3 cursor-pointer transition-all shadow-md active:scale-[0.99]"
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-1.5 truncate">
                <Heart size={13} className="text-rose-400 shrink-0" />
                <span className="font-bold text-slate-100 truncate">الأذكار والتسبيح</span>
              </div>
              <span className="flex items-center gap-1 text-xs font-bold text-amber-400 tabular-nums">
                <Flame size={12} className="fill-amber-400" />
                <span>{adhkarStats.currentStreak} أيام</span>
              </span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-rose-500 to-amber-400 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(10, adhkarStats.currentStreak * 14))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
              <span>اليوم: {adhkarStats.todayDhikrCount} تسبيحة</span>
              <span className="text-rose-400 font-semibold">المواظبة</span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Feature Cards Grid (6 Balanced Cards) */}
      <div className="grid grid-cols-2 gap-3">
        {/* 1. Quran Card */}
        <button
          onClick={() => onNavigate('quran')}
          className="bg-[#121820]/90 hover:bg-[#18202A] border border-slate-800 hover:border-[#D4AF37]/40 rounded-2xl p-4 text-right transition-all duration-200 flex flex-col justify-between active:scale-[0.98] shadow"
        >
          <div className="flex items-center justify-between w-full">
            <div className="p-2.5 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37]">
              <BookOpen size={20} />
            </div>
            <ChevronLeft size={16} className="text-slate-500" />
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-bold text-slate-100">القرآن الكريم</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">تلاوة وقراءة متواصلة وتفسير</p>
          </div>
        </button>

        {/* 2. Adhkar Card */}
        <button
          onClick={() => onNavigate('adhkar')}
          className="bg-[#121820]/90 hover:bg-[#18202A] border border-slate-800 hover:border-rose-500/40 rounded-2xl p-4 text-right transition-all duration-200 flex flex-col justify-between active:scale-[0.98] shadow"
        >
          <div className="flex items-center justify-between w-full">
            <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400">
              <Heart size={20} />
            </div>
            <ChevronLeft size={16} className="text-slate-500" />
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-bold text-slate-100">الأذكار المعتمدة</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">الصباح والمساء بالصوت والعد</p>
          </div>
        </button>

        {/* 3. Digital Misbaha Card */}
        <button
          onClick={() => setIsTasbihOpen(true)}
          className="bg-[#121820]/90 hover:bg-[#18202A] border border-slate-800 hover:border-purple-500/40 rounded-2xl p-4 text-right transition-all duration-200 flex flex-col justify-between active:scale-[0.98] shadow"
        >
          <div className="flex items-center justify-between w-full">
            <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 text-lg flex items-center justify-center font-bold">
              📿
            </div>
            <ChevronLeft size={16} className="text-slate-500" />
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-bold text-slate-100">المسبحة الرقمية</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">تسبيح حر وأذكار مخصصة</p>
          </div>
        </button>

        {/* 4. Daily Wird Card */}
        <button
          onClick={() => setIsWirdOpen(true)}
          className="bg-[#121820]/90 hover:bg-[#18202A] border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-4 text-right transition-all duration-200 flex flex-col justify-between active:scale-[0.98] shadow"
        >
          <div className="flex items-center justify-between w-full">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400">
              <Award size={20} />
            </div>
            <ChevronLeft size={16} className="text-slate-500" />
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-bold text-slate-100">الورد اليومي</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              إنجاز اليوم: {wirdConfig.completedTodayCount}/{wirdConfig.targetCount}
            </p>
          </div>
        </button>

        {/* 5. Achievements Center Card */}
        <button
          onClick={() => setIsAchievementsOpen(true)}
          className="bg-[#121820]/90 hover:bg-[#18202A] border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 text-right transition-all duration-200 flex flex-col justify-between active:scale-[0.98] shadow"
        >
          <div className="flex items-center justify-between w-full">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400">
              <Trophy size={20} />
            </div>
            <ChevronLeft size={16} className="text-slate-500" />
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-bold text-slate-100">سجل الإنجازات</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">القرآن والصلوات والأوسمة والمشاركة</p>
          </div>
        </button>

        {/* 6. Qibla Card */}
        <button
          onClick={() => onNavigate('qibla')}
          className="bg-[#121820]/90 hover:bg-[#18202A] border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-4 text-right transition-all duration-200 flex flex-col justify-between active:scale-[0.98] shadow"
        >
          <div className="flex items-center justify-between w-full">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400">
              <Compass size={20} />
            </div>
            <ChevronLeft size={16} className="text-slate-500" />
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-bold text-slate-100">اتجاه القبلة</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">بوصلة دقيقة إلى الكعبة المشرفة</p>
          </div>
        </button>
      </div>

      {/* Daily Spiritual Touch: Verified Ayah with Interactive Tafsir & Audio */}
      <div className="bg-[#131A22]/90 border border-slate-800 hover:border-[#D4AF37]/30 rounded-3xl p-5 space-y-3.5 shadow-lg transition-colors">
        <div className="flex items-center justify-between text-xs text-[#D4AF37] font-semibold">
          <div className="flex items-center gap-1.5">
            <BookMarked size={15} />
            <span>نفحة قرآنية يومية مع التفسير</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-normal">
              سورة {currentVerse.surahName} ({currentVerse.ayahNumber})
            </span>
            <button
              onClick={() => {
                setVerseIndex((prev) => (prev + 1) % INSPIRATIONAL_VERSES.length);
                setIsPlayingVerse(false);
              }}
              className="text-[10px] text-slate-400 hover:text-[#D4AF37] transition-colors"
              title="آية أخرى"
            >
              آية أخرى ↻
            </button>
          </div>
        </div>

        {/* Ayah Sacred Arabic Text */}
        <p className="font-quran text-lg text-slate-100 leading-loose text-center py-1">
          ﴿{currentVerse.text}﴾
        </p>

        <p className="text-[11px] text-[#D4AF37] text-center font-medium">
          {currentVerse.theme}
        </p>

        {/* Action Row: Listen & View Tafsir */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
          {/* Audio Recite Button */}
          <button
            onClick={handlePlayVerseAudio}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all active:scale-95 ${
              isPlayingVerse
                ? 'bg-[#D4AF37] text-slate-950 font-bold shadow'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            {isPlayingVerse ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
            <span>{isPlayingVerse ? 'إيقاف التلاوة' : 'استماع للآية'}</span>
          </button>

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
          <div className="mt-3 p-3.5 bg-[#17212C] border border-[#D4AF37]/25 rounded-2xl text-xs space-y-2 animate-slideDown shadow-inner">
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
      <div className="bg-gradient-to-br from-[#151E28] to-[#101620] border border-cyan-500/35 hover:border-cyan-500/50 rounded-3xl p-5 space-y-3.5 shadow-xl transition-colors">
        <div className="flex items-center justify-between text-xs text-cyan-400 font-semibold">
          <div className="flex items-center gap-1.5">
            <Sparkles size={15} />
            <span>نفحة نبوية شريفة</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-normal">
              {currentHadith.source}
            </span>
            <button
              onClick={() => {
                setHadithIndex((prev) => (prev + 1) % AUTHENTIC_HADITHS.length);
              }}
              className="text-[10px] text-slate-400 hover:text-cyan-400 transition-colors"
              title="حديث آخر"
            >
              حديث آخر ↻
            </button>
          </div>
        </div>

        {/* Hadith Sacred Text */}
        <p className="font-quran text-base sm:text-lg text-slate-100 leading-loose text-center py-1">
          «{currentHadith.hadithText}»
        </p>

        <div className="flex items-center justify-between text-[11px] text-slate-400 px-2">
          <span>عن: <strong className="text-slate-300">{currentHadith.narrator}</strong></span>
          <span className="text-cyan-400 font-medium">{currentHadith.theme}</span>
        </div>

        {/* Hadith Toast */}
        {hadithToast && (
          <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-[11px] text-emerald-300 animate-slideDown">
            <Check size={13} className="text-emerald-400 shrink-0" />
            <span>{hadithToast}</span>
          </div>
        )}

        {/* Action Row: Explanation & Share */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
          {/* Share Button */}
          <button
            onClick={handleShareHadith}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 transition-all active:scale-95"
            title="مشاركة الحديث الشريف مع الأهل والأصدقاء"
          >
            <Share2 size={12} />
            <span>مشاركة الحديث</span>
          </button>

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
          <div className="mt-3 p-3.5 bg-[#182330] border border-cyan-500/25 rounded-2xl text-xs space-y-2 animate-slideDown shadow-inner">
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[11px]">
              <Sparkles size={13} />
              <span>البيان والمعنى النبوي المستفاد:</span>
            </div>
            <p className="text-slate-200 leading-relaxed text-justify text-[11px]">
              {currentHadith.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
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
    </div>
  );
};
