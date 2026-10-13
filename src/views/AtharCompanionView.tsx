import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Pause, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  Copy, 
  Check, 
  BookOpen, 
  ArrowRight,
  Heart,
  Search,
  Users,
  Image as ImageIcon,
  CheckCircle,
  ShieldCheck,
  Phone,
  FileText,
  Plus,
  Trash2,
  HandHeart,
  Scale,
  Calendar,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  playOfflineTasbihClickSound,
  playOfflineCompletionChime
} from '../data/companionData';
import { 
  TADABBUR_SESSIONS, 
  DAILY_INTENTIONS_CATALOG,
  STANDARD_WASIYYAH_PREAMBLE
} from '../data/sakinaAndRightsData';
import { AudioService, ActiveAudioState } from '../services/audioService';
import { QuranService } from '../services/quranService';
import { StorageService } from '../services/storageService';
import { 
  KinshipParentsState, 
  RightsAndWasayaState, 
  DailyIntentionsState, 
  RightsRecordType 
} from '../types';
import { RotatingCardBackground } from '../components/RotatingCardBackground';
import { ShareCardModal, ShareCardPayload } from '../components/ShareCardModal';

interface AtharCompanionViewProps {
  initialMood?: string;
  onNavigate?: (tab: any) => void;
  onSelectSurah?: (surahNum: number, ayahNum?: number) => void;
  onBack?: () => void;
}

// 3 Unified Clear Pillars
type CompanionSection = 'heart_healing' | 'quran_tadabbur' | 'rights_and_kinship';

interface UnifiedHealingMood {
  id: string;
  label: string;
  badge: string;
  emoji: string;
  shortDescription: string;
  verse: {
    text: string;
    surahNumber: number;
    surahName: string;
    ayahNumber: number;
    audioUrl: string;
    reflection: string;
  };
  dua: {
    title: string;
    text: string;
    source: string;
    fadl: string;
  };
  practicalGuidance: {
    title: string;
    steps: string[];
  };
  tasbih: {
    dhikrText: string;
    target: number;
    virtue: string;
  };
}

const UNIFIED_HEALING_MOODS: UnifiedHealingMood[] = [
  {
    id: 'anxious',
    label: 'قلق أو خوف من المستقبل والرزق',
    badge: 'سكينة وطمأنينة ويقين',
    emoji: '🌊',
    shortDescription: 'تفكير متواصل وتوجس من الغد أو شواغل الرزق وضيق الحيلة',
    verse: {
      text: 'الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
      surahNumber: 13,
      surahName: 'الرعد',
      ayahNumber: 28,
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/013028.mp3',
      reflection: 'سكون القلب واستقراره لا يُنال بكثرة الحيل ولا بأسباب الدنيا وحدها، بل بمفتاح واحد جعل الله فيه سر الطمأنينة: ذكره والاعتماد عليه وتفويض الأمر إليه، فما قُدِّر لك سيكفيك الله مؤونته.'
    },
    dua: {
      title: 'دعاء كفاية الهمّ ودفع القلق والغم',
      text: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ، وَغَلَبَةِ الرِّجَالِ.',
      source: 'صحيح البخاري',
      fadl: 'كان النبي ﷺ يكثر من الاستعاذة بهذا الدعاء لدفع القلق والهم وتفريج الكرب.'
    },
    practicalGuidance: {
      title: 'خطوات عملية لتهدئة النفس واستحضار السكينة',
      steps: [
        'تنفس السكينة: خذ شهيقاً عميقاً لـ 4 ثوانٍ مع استحضار قدرة الله، ثم أخرج الزفير ببطء في 6 ثوانٍ.',
        'قاعدة اليقين: ما فاتك لم يُخلق لك، وما كُتب لك لن يمنعه أحد؛ فارمِ حمولك على الحي الذي لا يموت.',
        'التسبيح الحصين: ردّد (حسبنا الله ونعم الوكيل) مستشعراً كفاية الله لك.'
      ]
    },
    tasbih: {
      dhikrText: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
      target: 10,
      virtue: 'أمان الخائفين وملجأ الملهوفين؛ قالها إبراهيم عليه السلام حين أُلقي في النار فكانت برداً وسلاماً.'
    }
  },
  {
    id: 'sad',
    label: 'حزن أو ضيق في الصدر والمشاعر',
    badge: 'فرج وانشراح وبشارة',
    emoji: '🌧️',
    shortDescription: 'ثقل في الصدر أو حزن على فوات مرغوب أو نزول مكروه وتعب النفس',
    verse: {
      text: 'وَلَقَدْ نَعْلَمُ أَنَّكَ يَضِيقُ صَدْرُكَ بِمَا يَقُولُونَ ۝ فَسَبِّحْ بِحَمْدِ رَبِّكَ وَكُن مِّنَ السَّاجِدِينَ ۝ وَاعْبُدْ رَبَّكَ حَتَّىٰ يَأْتِيَكَ الْيَقِينُ',
      surahNumber: 15,
      surahName: 'الحجر',
      ayahNumber: 97,
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/015097.mp3',
      reflection: 'حين ضاق صدر النبي ﷺ أرشده الله إلى أعظم بلسمين لضيق الصدر: كثرة التسبيح بحمد الله، وإطالة السجود بين يديه؛ فالسجود يفرغ شحنات الحزن في الأرض، وتصعد بالدعاء إلى رب السماء.'
    },
    dua: {
      title: 'دعاء كشف الكرب وانشراح الصدر',
      text: 'اللَّهُمَّ رَحْمَتَكَ أَرْجُو، فَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ، وَأَصْلِحْ لِي شَأْنِي كُلَّهُ، لَا إِلَهَ إِلَّا أَنْتَ.',
      source: 'سنن أبي داود (صحيح)',
      fadl: 'دعوة المكروب التي علمنا إياها النبي ﷺ لإصلاح شأن العبد كله ورفع الغم.'
    },
    practicalGuidance: {
      title: 'بلسم نبوي لجبر الخاطر وطمأنينة الفؤاد',
      steps: [
        'توضأ بماء بارد وصلّ ركعتين خاشعتين: فإن الماء يطفئ حرارة الحزن، والسجود دواء الصدور.',
        'تذكر وعد الله الحق: (فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا) ولن يغلب عسر يسرين.',
        'استغث بنداء التوحيد والتنزيه: (لا إله إلا أنت سبحانك إني كنت من الظالمين) بالسبحة.'
      ]
    },
    tasbih: {
      dhikrText: 'لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ',
      target: 10,
      virtue: 'دعوة ذي النون في بطن الحوت ما دعا بها مسلم في كربة إلا فرّج الله عنه.'
    }
  },
  {
    id: 'distracted',
    label: 'تشتت وفتور وكسل عن الطاعة',
    badge: 'إقبال وتثبيت وعزيمة',
    emoji: '🍃',
    shortDescription: 'شرود ذهني وثقل عند الإقبال على الصلاة والقرآن وفتور الهمة',
    verse: {
      text: 'وَالَّذِينَ جَاهَدُوا فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا ۚ وَإِنَّ اللَّهَ لَمَعَ الْمُحْسِنِينَ',
      surahNumber: 29,
      surahName: 'العنكبوت',
      ayahNumber: 69,
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/029069.mp3',
      reflection: 'الفتور يعتري كل إنسان، لكن العبرة بالمجاهدة وعدم الاستسلام للكسل؛ فكل خطوة تخطوها نحو الله وأنت تستثقلها يضاعف الله أجرها ويعقبها لذة في الطاعة وهداية للسبيل.'
    },
    dua: {
      title: 'دعاء الاستعانة على حسن العبادة وثبات القلب',
      text: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ، وَشُكْرِكَ، وَحُسْنِ عِبَادَتِكَ، يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ.',
      source: 'سنن أبي داود والترمذي',
      fadl: 'وصية النبي ﷺ لمعاذ بن جبل ألا يدعها دبر كل صلاة لنيل الإعانة الإلهية.'
    },
    practicalGuidance: {
      title: 'خطوات لإيقاظ الهمة ودحر الفتور',
      steps: [
        'ابدأ بالقليل المحبوب: لا تثقل على نفسك بقفزة مفاجئة؛ ابدأ بصفحة قرآن واحدة وركعتي نافلة.',
        'استعذ بالله من العجز والكسل فوراً، فإن الشيطان يُثقّل العبد بالتسويف والتأجيل.',
        'حرّك لسانك بالاستغفار والتسبيح لإحياء القلب بالذكر.'
      ]
    },
    tasbih: {
      dhikrText: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
      target: 10,
      virtue: 'كلمتان خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن.'
    }
  },
  {
    id: 'gaflah',
    label: 'غفلة أو قسوة في القلب وثقل الذنب',
    badge: 'يقظة وتوبة ورقة قلب',
    emoji: '✨',
    shortDescription: 'شعور بالبعد عن الله وجفاف الدمعة والحاجة إلى تجديد التوبة وتليين القلب',
    verse: {
      text: 'أَلَمْ يَأْنِ لِلَّذِينَ آمَنُوا أَن تَخْشَعَ قُلُوبُهُمْ لِذِكْرِ اللَّهِ وَمَا نَزَلَ مِنَ الْحَقِّ وَلَا يَكُونُوا كَالَّذِينَ أُوتُوا الْكِتَابَ مِن قَبْلُ فَطَالَ عَلَيْهِمُ الْأَمَدُ فَقَسَتْ قُلُوبُهُمْ',
      surahNumber: 57,
      surahName: 'الحديد',
      ayahNumber: 16,
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/057016.mp3',
      reflection: 'عتاب إلهي رقيق يلامس شغاف القلوب؛ هل حان الوقت لكي نلين بين يدي الله ونرجع إليه تائبين منيبين؟ إن الله يبسط يده بالليل ليتوب مسيء النهار ويبسط يده بالنهار ليتوب مسيء الليل.'
    },
    dua: {
      title: 'دعاء التوبة وتطهير القلب من الغفلة',
      text: 'اللَّهُمَّ أَنْتَ رَبِّي لاَ إِلَهَ إِلاَّ أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لاَ يَغْفِرُ الذُّنُوبَ إِلاَّ أَنْتَ.',
      source: 'صحيح البخاري (سيد الاستغفار)',
      fadl: 'من قالها موقناً بها فمات من يومه أو ليلته كان من أهل الجنة.'
    },
    practicalGuidance: {
      title: 'أسباب تليين القلب ورقة الفؤاد',
      steps: [
        'امسح رأس يتيم وأطعم مسكيناً: فإن الصدقة والإحسان يذيبان قسوة القلب بنص التوجيه النبوي.',
        'تدبر آيات القيامة والوقوف بين يدي الله، واعلم أن رحمة الله وسعت كل شيء.',
        'أكثر من الاستغفار والتوبة الصادقة بالسبحة التفاعلية.'
      ]
    },
    tasbih: {
      dhikrText: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ وَأَتُوبُ إِلَيْهِ',
      target: 10,
      virtue: 'من لزم الاستغفار جعل الله له من كل هم فرجاً ومن كل ضيق مخرجاً ورزقه من حيث لا يحتسب.'
    }
  },
  {
    id: 'grateful',
    label: 'شكر ورضا واطمئنان واستبشار',
    badge: 'نماء وزيادة وبركة',
    emoji: '☀️',
    shortDescription: 'راحة بال وسكون نفس واستشعار نعم الله الظاهرة والباطنة',
    verse: {
      text: 'وَإِذْ تَأَذَّنَ رَبُّكُمْ لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ ۖ وَلَئِن كَفَرْتُمْ إِنَّ عَذَابِي لَشَدِيدٌ',
      surahNumber: 14,
      surahName: 'إبراهيم',
      ayahNumber: 7,
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/014007.mp3',
      reflection: 'الشكر قيد النعم الموجودة وصيد النعم المفقودة؛ فكلما أثنيت على الله بقلبك ولسانك وجوارحك، فتح الله لك من أبواب الزيادة والبركة ما لم يخطر على بالك.'
    },
    dua: {
      title: 'دعاء الشكر والاعتراف بنعم الله',
      text: 'اللَّهُمَّ مَا أَصْبَحَ بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ.',
      source: 'سنن أبي داود والنسائي (حسن)',
      fadl: 'من قالها حين يصبح أو يمسي فقد أدى شكر يومه وليلته.'
    },
    practicalGuidance: {
      title: 'كيف تحفظ نعمة الرضا والسكينة؟',
      steps: [
        'قيد النعمة بالاعتراف: اذكر 3 نعم أنعم الله بها عليك اليوم واحمده عليها بصدق.',
        'أنفق من فضل الله: تصدق بصدقة سر أو أطعم محتاجاً شكراً لله على ما أعطاك.',
        'ردّد أذكار الحمد والثناء بالسبحة التفاعلية.'
      ]
    },
    tasbih: {
      dhikrText: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ حَمْدًا كَثِيرًا طَيِّبًا مُبَارَكًا فِيهِ',
      target: 10,
      virtue: 'الحمد لله تملأ الميزان، وهي أحب الكلام إلى الله مع سبحان الله والله أكبر.'
    }
  },
  {
    id: 'anger',
    label: 'غضب أو انفعال وسرعة استثارة',
    badge: 'حلم وسكينة وإحسان',
    emoji: '⚡',
    shortDescription: 'فورة غضب في النفس أو توتر عصبي وخصومة تحتاج هدوءاً وتصالحاً',
    verse: {
      text: 'وَالْكَاظِمِينَ الْغَيْظَ وَالْعَافِينَ عَنِ النَّاسِ ۗ وَاللَّهُ يُحِبُّ الْمُحْسِنِينَ',
      surahNumber: 3,
      surahName: 'آل عمران',
      ayahNumber: 134,
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/003134.mp3',
      reflection: 'كظم الغيظ ليس ضعفاً بل هو قمة الشجاعة وضبط النفس؛ وقد امتدح الله الذين يكظمون غيظهم ويعفون لوجه الله، ووعدهم بمحبته ومعيته ورضوانه.'
    },
    dua: {
      title: 'دعاء دفع الغضب ووساوس الشيطان',
      text: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ، اللَّهُمَّ اغْفِرْ لِي ذَنْبِي وَأَذْهِبْ غَيْظَ قَلْبِي.',
      source: 'صحيح البخاري ومسند أحمد',
      fadl: 'أرشد النبي ﷺ رجلاً غضب فقال: «إني لأعلم كلمة لو قالها لذهب عنه ما يجد: أعوذ بالله من الشيطان الرجيم».'
    },
    practicalGuidance: {
      title: 'الهدي النبوي لإطفاء نار الغضب',
      steps: [
        'غيّر هيئتك فوراً: إن كنت قائماً فاجلس، وإن كنت جالساً فاضطجع.',
        'توضأ بماء بارد: فإن الغضب من الشيطان والشيطان خُلق من النار والماء يطفئ النار.',
        'الزم الصمت دقيقة كاملة ولا تتخذ أي قرار حتى يسكن روعك.'
      ]
    },
    tasbih: {
      dhikrText: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ',
      target: 10,
      virtue: 'كنز من كنوز الجنة وباب عظيم لدفع كل حول وقوة إلى حول الله وقوته.'
    }
  },
  {
    id: 'confusion',
    label: 'حيرة أو تردد في أمر وقرار',
    badge: 'بصيرة وتفويض واستخارة',
    emoji: '🧭',
    shortDescription: 'تشتت بين خيارات أو تردد في قرار حياتي والحاجة إلى الهداية والتسديد',
    verse: {
      text: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا ۝ وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ ۚ وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ',
      surahNumber: 65,
      surahName: 'الطلاق',
      ayahNumber: 2,
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/065002.mp3',
      reflection: 'حين تنغلق الأبواب أمام نظرك البشري، يفتح الله للمتقين مخارج لا تخطر على قلب بشر؛ فوّض أمرك لله وسلّم تسليماً واثقاً بأنه يختار لك الأصلح.'
    },
    dua: {
      title: 'دعاء الاستخارة والتسديد الإلهي',
      text: 'اللَّهُمَّ إِنِّي أَسْتَخِيرُكَ بِعِلْمِكَ، وَأَسْتَقْدِرُكَ بِقُدْرَتِكَ، وَأَسْأَلُكَ مِنْ فَضْلِكَ الْعَظِيمِ، فَإِنَّكَ تَقْدِرُ وَلاَ أَقْدِرُ، وَتَعْلَمُ وَلاَ أَعْلَمُ، وَأَنْتَ عَلاَّمُ الْغُيُوبِ.',
      source: 'صحيح البخاري (حديث الاستخارة)',
      fadl: 'كان النبي ﷺ يعلم أصحابه الاستخارة في الأمور كلها كما يعلمهم السورة من القرآن.'
    },
    practicalGuidance: {
      title: 'خطوات إيمانية لصفاء الذهن واتخاذ القرار',
      steps: [
        'صلّ ركعتي الاستخارة من غير الفريضة ثم ادع بدعاء الاستخارة بقلب حاضر.',
        'استشر أهل الحكمة والتقوى والتجربة: ما ندم من استخار الخالق واستشار المخلوقين.',
        'امضِ في الأمر بعد الاستخارة متوكلاً على الله مطمئناً أن الخير فيما اختاره الله.'
      ]
    },
    tasbih: {
      dhikrText: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ أَصْلِحْ لِي شَأْنِي كُلَّهُ',
      target: 10,
      virtue: 'دعاء النبي ﷺ المستمر لطلب الإعانة وتفويض الشأن كله للحي القيوم.'
    }
  }
];

export const AtharCompanionView: React.FC<AtharCompanionViewProps> = ({
  initialMood = 'anxious',
  onSelectSurah,
  onBack
}) => {
  // Main 3 Pillars
  const [activeSection, setActiveSection] = useState<CompanionSection>('heart_healing');

  // --- PILLAR 1: بوصلة وعلاج القلوب ---
  const [selectedMoodId, setSelectedMoodId] = useState<string>(() => {
    return UNIFIED_HEALING_MOODS.some(m => m.id === initialMood) ? initialMood : 'anxious';
  });
  const currentMood: UnifiedHealingMood = UNIFIED_HEALING_MOODS.find(m => m.id === selectedMoodId) || UNIFIED_HEALING_MOODS[0];

  const [tasbihCounts, setTasbihCounts] = useState<Record<string, number>>({
    anxious: 0,
    sad: 0,
    distracted: 0,
    gaflah: 0,
    grateful: 0,
    anger: 0,
    confusion: 0
  });

  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);

  // --- PILLAR 2: خلوة التدبر والبحث القرآني ---
  const [tadabburSubTab, setTadabburSubTab] = useState<'sessions' | 'search'>('sessions');
  const [selectedTadabburId, setSelectedTadabburId] = useState<string>('session_ihsan');
  const [tadabburStreak] = useState<number>(() => StorageService.getTadabburProgress().streakDays);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<{ surahNumber: number; ayahNumber: number; text: string; surahName: string }[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // --- PILLAR 3: دفتر الحقوق والبر والوصايا ---
  const [rightsSubTab, setRightsSubTab] = useState<'debts' | 'wasiyyah' | 'kinship' | 'intentions'>('debts');
  const [rightsState, setRightsState] = useState<RightsAndWasayaState>(() => StorageService.getRightsAndWasayaState());
  const [kinshipState, setKinshipState] = useState<KinshipParentsState>(() => StorageService.getKinshipParentsState());
  const [intentionsState] = useState<DailyIntentionsState>(() => StorageService.getDailyIntentionsState());

  // Debts & Rights Management Form (Prominently placed at the top)
  const [isAddRightFormOpen, setIsAddRightFormOpen] = useState<boolean>(false);
  const [newRightTitle, setNewRightTitle] = useState<string>('');
  const [newRightAmount, setNewRightAmount] = useState<string>('');
  const [newRightPerson, setNewRightPerson] = useState<string>('');
  const [newRightContact, setNewRightContact] = useState<string>('');
  const [newRightDueDate, setNewRightDueDate] = useState<string>('');
  const [newRightType, setNewRightType] = useState<RightsRecordType>('debt_on_me');
  const [debtFilter, setDebtFilter] = useState<'all' | 'debt_on_me' | 'debt_for_me' | 'fulfilled'>('all');

  // Wasiyyah Editing
  const [wasiyyahText, setWasiyyahText] = useState<string>(() => {
    const w = StorageService.getRightsAndWasayaState().wasiyyah;
    return w?.customDirectives || 'أوصي أهلي وأبنائي بتقوى الله وطاعته في السر والعلن، والمحافظة على الصلوات الخمس في أوقاتها، والاعتصام بحبل الله، وإخراج صدقة جارية في وجوه الخير والبر، وسداد ما قد يكون في ذمتي من ديون أو أمانات يعلمها أهل الصدق.';
  });
  const [wasiyyahSavedMsg, setWasiyyahSavedMsg] = useState<boolean>(false);

  // Kinship Add Contact Modal
  const [isAddKinOpen, setIsAddKinOpen] = useState<boolean>(false);
  const [newKinName, setNewKinName] = useState<string>('');
  const [newKinRelation, setNewKinRelation] = useState<string>('أقارب');

  // Share Card Modal
  const [shareCardPayload, setShareCardPayload] = useState<ShareCardPayload | null>(null);

  useEffect(() => {
    const unsub = AudioService.subscribe((state: ActiveAudioState | null) => {
      if (!state) {
        if (localAudioRef.current?.paused) {
          setIsPlayingAudio(false);
        }
        return;
      }
      if (
        state.surahNumber === currentMood.verse.surahNumber &&
        state.ayahNumber === currentMood.verse.ayahNumber &&
        state.isPlaying
      ) {
        setIsPlayingAudio(true);
      } else if (!localAudioRef.current || localAudioRef.current.paused) {
        setIsPlayingAudio(false);
      }
    });
    return () => unsub();
  }, [currentMood]);

  useEffect(() => {
    if (localAudioRef.current) {
      localAudioRef.current.pause();
      localAudioRef.current = null;
    }
    setIsPlayingAudio(false);
    setAudioProgress(0);
  }, [selectedMoodId]);

  const currentCount = tasbihCounts[selectedMoodId] || 0;
  const isTasbihCompleted = currentCount >= currentMood.tasbih.target;

  const handleTasbihClick = () => {
    if (isTasbihCompleted) return;

    const nextCount = currentCount + 1;
    setTasbihCounts((prev) => ({
      ...prev,
      [selectedMoodId]: nextCount
    }));

    playOfflineTasbihClickSound();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(28);
      } catch {}
    }

    if (nextCount === currentMood.tasbih.target) {
      playOfflineCompletionChime();
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#E6C66E', '#C8A24A', '#F3E5AB', '#A6802B']
        });
      } catch {}
    }
  };

  const handleResetTasbih = () => {
    setTasbihCounts((prev) => ({
      ...prev,
      [selectedMoodId]: 0
    }));
  };

  const handleToggleAyahAudio = async () => {
    if (isPlayingAudio) {
      if (localAudioRef.current) {
        localAudioRef.current.pause();
      }
      AudioService.pause();
      setIsPlayingAudio(false);
      return;
    }

    try {
      setIsPlayingAudio(true);

      if (!localAudioRef.current) {
        const audio = new Audio(currentMood.verse.audioUrl);
        audio.preload = 'auto';

        audio.addEventListener('timeupdate', () => {
          if (audio.duration) {
            setAudioProgress((audio.currentTime / audio.duration) * 100);
          }
        });

        audio.addEventListener('ended', () => {
          setIsPlayingAudio(false);
          setAudioProgress(0);
        });

        audio.addEventListener('error', () => {
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(currentMood.verse.text);
            utterance.lang = 'ar-SA';
            utterance.rate = 0.85;
            utterance.onend = () => {
              setIsPlayingAudio(false);
              setAudioProgress(0);
            };
            window.speechSynthesis.speak(utterance);
          } else {
            setIsPlayingAudio(false);
          }
        });

        localAudioRef.current = audio;
      }

      await localAudioRef.current.play();
    } catch {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(currentMood.verse.text);
        utterance.lang = 'ar-SA';
        utterance.rate = 0.85;
        utterance.onend = () => {
          setIsPlayingAudio(false);
          setAudioProgress(0);
        };
        window.speechSynthesis.speak(utterance);
      } else {
        setIsPlayingAudio(false);
      }
    }
  };

  const handleCopyText = (text: string, sectionKey: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedSection(sectionKey);
      setTimeout(() => setCopiedSection(null), 2200);
    } catch {}
  };

  const handleSearchAyahs = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const res = await QuranService.searchQuranText(q);
    setSearchResults(res.results || []);
    setIsSearching(false);
  };

  const handleSaveWasiyyah = () => {
    StorageService.updateWasiyyahDocument({
      customDirectives: wasiyyahText,
      lastUpdated: new Date().toLocaleDateString('ar-EG')
    });
    setWasiyyahSavedMsg(true);
    setTimeout(() => setWasiyyahSavedMsg(false), 2800);
  };

  const handleCreateRight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRightTitle.trim()) return;

    StorageService.addRightsRecord({
      type: newRightType,
      title: newRightTitle.trim(),
      amountOrDescription: newRightAmount.trim() || 'غير محدد',
      personName: newRightPerson.trim() || 'غير محدد',
      contactOrLocation: newRightContact.trim() || undefined,
      dueDate: newRightDueDate.trim() || undefined
    });

    setRightsState(StorageService.getRightsAndWasayaState());
    setNewRightTitle('');
    setNewRightAmount('');
    setNewRightPerson('');
    setNewRightContact('');
    setNewRightDueDate('');
    setIsAddRightFormOpen(false);
  };

  const handleToggleRightFulfilled = (id: string) => {
    StorageService.toggleRightsRecordFulfilled(id);
    setRightsState(StorageService.getRightsAndWasayaState());
  };

  const handleDeleteRight = (id: string) => {
    StorageService.deleteRightsRecord(id);
    setRightsState(StorageService.getRightsAndWasayaState());
  };

  const handleAddKinRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKinName.trim()) return;
    StorageService.addKinshipContact({
      name: newKinName.trim(),
      relationship: newKinRelation.trim() || 'أقارب',
      status: 'alive',
      preferredType: 'call'
    });
    setKinshipState(StorageService.getKinshipParentsState());
    setNewKinName('');
    setIsAddKinOpen(false);
  };

  const activeTadabburSession = TADABBUR_SESSIONS.find(s => s.id === selectedTadabburId) || TADABBUR_SESSIONS[0];
  
  // Debts statistics
  const debtsOwedByMeCount = rightsState.records.filter(r => r.type === 'debt_on_me' && !r.isFulfilled).length;
  const debtsOwedToMeCount = rightsState.records.filter(r => r.type === 'debt_for_me' && !r.isFulfilled).length;
  const trustsCount = rightsState.records.filter(r => r.type === 'trust' && !r.isFulfilled).length;

  const filteredRecords = rightsState.records.filter(r => {
    if (debtFilter === 'debt_on_me') return r.type === 'debt_on_me' && !r.isFulfilled;
    if (debtFilter === 'debt_for_me') return r.type === 'debt_for_me' && !r.isFulfilled;
    if (debtFilter === 'fulfilled') return r.isFulfilled;
    return true;
  });

  return (
    <div className="athar-page-container text-right font-arabic">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#C8A24A]/30">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-[#14120D] hover:bg-[#1E1A11] border border-[#C8A24A]/40 text-[#E6C66E] transition-colors"
              aria-label="الرجوع"
            >
              <ArrowRight size={18} />
            </button>
          )}
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#2D2313] to-[#14110A] text-[#E6C66E] border border-[#E6C66E]/55 flex items-center justify-center shadow-inner">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-[#F3E5AB]">
              رفيق أثر
            </h1>
            <p className="text-[11px] text-[#C4B998] font-medium mt-0.5 leading-normal">
              بوصلة وعلاج القلوب، خلوة التدبر القرآني، ودفتر الحقوق والبر
            </p>
          </div>
        </div>
      </div>

      {/* 3 Unified High-Level Pillars (Clear, Elegant, No Redundancy) */}
      <div className="grid grid-cols-3 gap-1 bg-[#14120D] p-1 rounded-2xl border border-[#C8A24A]/35 text-xs font-bold shadow-sm">
        <button
          onClick={() => setActiveSection('heart_healing')}
          className={`py-2.5 px-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeSection === 'heart_healing'
              ? 'bg-gradient-to-r from-[#E6C66E] to-[#B88A2D] text-[#080705] shadow font-extrabold'
              : 'text-[#C4B998] hover:text-white'
          }`}
        >
          <Heart size={14} fill={activeSection === 'heart_healing' ? 'currentColor' : 'none'} />
          <span>بوصلة وعلاج القلوب</span>
        </button>

        <button
          onClick={() => setActiveSection('quran_tadabbur')}
          className={`py-2.5 px-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeSection === 'quran_tadabbur'
              ? 'bg-gradient-to-r from-[#E6C66E] to-[#B88A2D] text-[#080705] shadow font-extrabold'
              : 'text-[#C4B998] hover:text-white'
          }`}
        >
          <BookOpen size={14} />
          <span>خلوة التدبر القرآني</span>
        </button>

        <button
          onClick={() => setActiveSection('rights_and_kinship')}
          className={`py-2.5 px-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeSection === 'rights_and_kinship'
              ? 'bg-gradient-to-r from-[#E6C66E] to-[#B88A2D] text-[#080705] shadow font-extrabold'
              : 'text-[#C4B998] hover:text-white'
          }`}
        >
          <ShieldCheck size={14} />
          <span>دفتر الحقوق والبر</span>
        </button>
      </div>

      {/* =========================================================================
          PILLAR 1: بوصلة وعلاج القلوب (UNIFIED HEART COMPASS & HEALING)
         ========================================================================= */}
      {activeSection === 'heart_healing' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Main Question & Mood Selector */}
          <div className="relative overflow-hidden bg-gradient-to-b from-[#18140D] to-[#0B0A07] border border-[#C8A24A]/45 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
            <RotatingCardBackground slot="kaaba" cardOffset={1} intervalMs={28000} opacity={0.22} />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#E6C66E] tracking-wide flex items-center gap-1">
                  <Heart size={13} fill="currentColor" className="text-[#E6C66E]" />
                  <span>لحظة مصارحة وبلسم للروح</span>
                </span>
                <span className="text-[10px] text-[#C4B998]">اختر ما يصف فؤادك الآن</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-[#F3E5AB] mt-1">
                كيف تجد قلبك الآن؟
              </h2>
              <p className="text-[11px] text-[#C4B998] mt-0.5 leading-relaxed">
                اختر حالتك النفسية والروحية لنستأنس بآيات السكينة، الدعاء النبوي الشافي، والخطوة العملية لتهدئة النفس:
              </p>
            </div>

            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {UNIFIED_HEALING_MOODS.map((mood) => {
                const isSelected = mood.id === selectedMoodId;
                return (
                  <button
                    key={mood.id}
                    onClick={() => setSelectedMoodId(mood.id)}
                    className={`flex items-start gap-2.5 p-3 rounded-2xl border transition-all text-right duration-200 active:scale-95 ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#C8A24A]/30 to-[#1F1B12] border-[#E6C66E] text-white shadow-[0_0_20px_rgba(200,162,74,0.28)]'
                        : 'bg-[#12100B]/90 hover:bg-[#19160F] border-[#C8A24A]/25 text-[#C4B998] hover:text-white'
                    }`}
                  >
                    <span className="text-2xl shrink-0 p-1.5 rounded-xl bg-[#0A0907] border border-[#C8A24A]/30">
                      {mood.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`block text-xs font-extrabold leading-snug ${isSelected ? 'text-[#E6C66E]' : 'text-[#F3E5AB]'}`}>
                          {mood.label}
                        </span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-[#E6C66E] shrink-0 animate-ping" />
                        )}
                      </div>
                      <span className="block text-[10px] text-[#D4CBB4] leading-relaxed mt-1">
                        {mood.shortDescription}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Unified Remedy Card */}
          <div className="relative overflow-hidden bg-gradient-to-b from-[#18140D] via-[#110F0A] to-[#080705] border border-[#C8A24A]/50 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4 transition-all">
            <div className="relative z-10 flex items-center justify-between pb-3 border-b border-[#C8A24A]/25">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl p-2 rounded-2xl bg-[#1F1B12] border border-[#C8A24A]/45 shadow-inner">
                  {currentMood.emoji}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-[#F3E5AB]">
                      {currentMood.label}
                    </h3>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-[#C8A24A]/20 text-[#E6C66E] border border-[#C8A24A]/40">
                      {currentMood.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#C4B998] mt-0.5 leading-normal">
                    بلسم الوحي الشافي وسكينة القلب
                  </p>
                </div>
              </div>
            </div>

            {/* 1. الآية الكريمة المهدئة مع الاستماع */}
            <div className="relative z-10 bg-[#0D0C08] border border-[#C8A24A]/35 rounded-2xl p-4 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="p-1.5 rounded-xl bg-[#C8A24A]/15 text-[#E6C66E] border border-[#C8A24A]/35">
                    <BookOpen size={14} />
                  </span>
                  <span className="text-xs font-extrabold text-[#F3E5AB]">
                    سورة {currentMood.verse.surahName} (الآية {currentMood.verse.ayahNumber})
                  </span>
                </div>

                <button
                  onClick={handleToggleAyahAudio}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm ${
                    isPlayingAudio
                      ? 'bg-rose-950 text-rose-200 border border-rose-500/40 animate-pulse'
                      : 'bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-[#070707] hover:scale-105'
                  }`}
                >
                  {isPlayingAudio ? (
                    <>
                      <Pause size={13} />
                      <span>إيقاف التلاوة</span>
                    </>
                  ) : (
                    <>
                      <Play size={13} fill="currentColor" />
                      <span>استماع للآية</span>
                    </>
                  )}
                </button>
              </div>

              <div className="py-2 px-1 text-center">
                <p className="font-quran text-xl sm:text-2xl text-[#F3E5AB] leading-[2.2] tracking-wide select-text">
                  ﴿{currentMood.verse.text}﴾
                </p>
              </div>

              {isPlayingAudio && (
                <div className="w-full bg-[#1C1810] rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-[#E6C66E] to-[#B88A2D] h-full transition-all duration-300"
                    style={{ width: `${Math.max(5, audioProgress)}%` }}
                  />
                </div>
              )}

              <div className="pt-2 border-t border-[#C8A24A]/20 flex items-start gap-2 text-xs text-[#C4B998]">
                <span className="text-[#E6C66E] font-extrabold shrink-0">إضاءة التدبر:</span>
                <p className="leading-relaxed text-[#E5DEC9]">
                  {currentMood.verse.reflection}
                </p>
              </div>

              {onSelectSurah && (
                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => onSelectSurah(currentMood.verse.surahNumber, currentMood.verse.ayahNumber)}
                    className="text-xs text-[#E6C66E] font-bold hover:underline flex items-center gap-1"
                  >
                    <span>فتح سورة {currentMood.verse.surahName} كاملة في المصحف</span>
                    <ArrowRight size={12} className="rotate-180" />
                  </button>
                </div>
              )}
            </div>

            {/* 2. الدعاء النبوي الشافي مع زر النسخ الكامل */}
            <div className="relative z-10 bg-[#0D0C08] border border-[#C8A24A]/35 rounded-2xl p-4 shadow-md space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="p-1.5 rounded-xl bg-[#C8A24A]/15 text-[#E6C66E] border border-[#C8A24A]/35">
                    <Heart size={14} />
                  </span>
                  <span className="text-xs font-extrabold text-[#F3E5AB]">
                    {currentMood.dua.title}
                  </span>
                </div>

                <button
                  onClick={() => handleCopyText(currentMood.dua.text, 'dua')}
                  className="p-1.5 px-2.5 rounded-xl bg-[#1A160E] hover:bg-[#241E13] text-[#E6C66E] border border-[#C8A24A]/35 transition-colors flex items-center gap-1 text-[11px] font-bold"
                  title="نسخ الدعاء كاملاً"
                >
                  {copiedSection === 'dua' ? (
                    <>
                      <Check size={12} />
                      <span>تم النسخ ✓</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>نسخ الدعاء</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-[#14120C] border border-[#C8A24A]/25 text-center">
                <p className="font-quran text-base sm:text-lg font-bold text-[#F3E5AB] leading-relaxed select-text">
                  «{currentMood.dua.text}»
                </p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#C4B998] pt-1">
                <span className="text-[#E6C66E] font-bold">المصدر: {currentMood.dua.source}</span>
                <span className="leading-normal">{currentMood.dua.fadl}</span>
              </div>
            </div>

            {/* 3. الخطوات العملية والسبحة التفاعلية (10 مرات) */}
            <div className="relative z-10 bg-[#0D0C08] border border-[#C8A24A]/35 rounded-2xl p-4 shadow-md space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-[#C8A24A]/15 text-[#E6C66E] border border-[#C8A24A]/35">
                    📿
                  </span>
                  <div>
                    <h4 className="text-xs font-extrabold text-[#F3E5AB]">
                      {currentMood.practicalGuidance.title}
                    </h4>
                    <span className="text-[10px] text-[#C4B998] leading-normal block">
                      خطوات علاجية وسكينة فورية
                    </span>
                  </div>
                </div>

                {currentCount > 0 && (
                  <button
                    onClick={handleResetTasbih}
                    className="flex items-center gap-1 text-[11px] text-[#C4B998] hover:text-rose-400 p-1 transition-colors font-bold"
                    title="إعادة ضبط السبحة"
                  >
                    <RotateCcw size={12} />
                    <span>تصفير</span>
                  </button>
                )}
              </div>

              {/* الخطوات مكتوبة بالكامل بدون أي تقطيع */}
              <div className="space-y-1.5 text-xs text-[#E5DEC9] leading-relaxed bg-[#14120C] p-3 rounded-xl border border-[#C8A24A]/25">
                {currentMood.practicalGuidance.steps.map((st, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[#E6C66E] font-bold">•</span>
                    <p className="leading-relaxed">{st}</p>
                  </div>
                ))}
              </div>

              {/* زر السبحة التفاعلية لـ 10 مرات */}
              <div className="flex flex-col items-center justify-center pt-1">
                <button
                  onClick={handleTasbihClick}
                  disabled={isTasbihCompleted}
                  className={`relative w-full max-w-sm py-4 px-4 rounded-2xl border transition-all duration-150 flex flex-col items-center justify-center gap-1.5 shadow-lg active:scale-95 ${
                    isTasbihCompleted
                      ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#F3E5AB]'
                      : 'bg-gradient-to-b from-[#1F1B12] to-[#12100B] hover:from-[#282216] border-[#C8A24A]/50 hover:border-[#E6C66E] text-[#F3E5AB] shadow-[0_4px_20px_rgba(0,0,0,0.6)]'
                  }`}
                >
                  <span className="text-xs sm:text-sm text-[#E5DEC9] font-bold leading-normal text-center">
                    {currentMood.tasbih.dhikrText}
                  </span>

                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-black font-mono tracking-tight text-[#E6C66E]">
                      {currentCount}
                    </span>
                    <span className="text-xs text-[#C4B998] font-mono">
                      / {currentMood.tasbih.target}
                    </span>
                  </div>

                  <div className="w-3/4 bg-[#0A0907] rounded-full h-1.5 mt-1 overflow-hidden border border-[#C8A24A]/25">
                    <div 
                      className="h-full transition-all duration-200 bg-gradient-to-r from-[#E6C66E] to-[#B88A2D]"
                      style={{ width: `${(currentCount / currentMood.tasbih.target) * 100}%` }}
                    />
                  </div>

                  {isTasbihCompleted ? (
                    <span className="text-xs font-extrabold text-[#E6C66E] flex items-center gap-1 mt-1 animate-pulse">
                      <CheckCircle2 size={14} />
                      <span>تقبل الله ذكرك وطمأن فؤادك ✓ ({currentMood.tasbih.virtue})</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#C4B998] mt-0.5">
                      انقر للتسبيح · {currentMood.tasbih.virtue}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* بطاقة التصميم والمشاركة كصورة ملكية */}
            <div className="relative z-10 pt-1">
              <button
                onClick={() =>
                  setShareCardPayload({
                    category: 'ayah',
                    title: `رفيق أثر · ${currentMood.label}`,
                    mainText: `﴿${currentMood.verse.text}﴾`,
                    sourceLabel: `سورة ${currentMood.verse.surahName} · الآية ${currentMood.verse.ayahNumber}`,
                    subtitleOrTafsir: currentMood.verse.reflection
                  })
                }
                className="w-full py-2.5 rounded-xl bg-[#1F1B12] hover:bg-[#2A2416] text-[#E6C66E] border border-[#C8A24A]/45 text-xs font-extrabold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
              >
                <ImageIcon size={15} />
                <span>تصميم ومشاركة هذه البطاقة كصورة ملكية</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PILLAR 2: خلوة التدبر والبحث القرآني (QURANIC TADABBUR & SEARCH)
         ========================================================================= */}
      {activeSection === 'quran_tadabbur' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Sub-Tabs: جلسات التدبر vs البحث السريع */}
          <div className="flex items-center gap-1.5 p-1 bg-[#12100B] rounded-2xl border border-[#C8A24A]/35 text-xs">
            <button
              onClick={() => setTadabburSubTab('sessions')}
              className={`flex-1 py-2 px-2 rounded-xl font-extrabold transition-all text-center flex items-center justify-center gap-1.5 ${
                tadabburSubTab === 'sessions'
                  ? 'bg-gradient-to-r from-[#E6C66E] to-[#B88A2D] text-[#070707] shadow'
                  : 'text-[#C4B998] hover:text-white'
              }`}
            >
              <BookOpen size={14} />
              <span>جلسات التدبر اليومية</span>
            </button>

            <button
              onClick={() => setTadabburSubTab('search')}
              className={`flex-1 py-2 px-2 rounded-xl font-extrabold transition-all text-center flex items-center justify-center gap-1.5 ${
                tadabburSubTab === 'search'
                  ? 'bg-gradient-to-r from-[#E6C66E] to-[#B88A2D] text-[#070707] shadow'
                  : 'text-[#C4B998] hover:text-white'
              }`}
            >
              <Search size={14} />
              <span>البحث في كتاب الله</span>
            </button>
          </div>

          {tadabburSubTab === 'sessions' && (
            <div className="space-y-3.5">
              {/* شريط المواظبة واليقين */}
              <div className="p-3.5 rounded-2xl bg-[#14110A] border border-[#C8A24A]/35 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#C4B998] block">مواظبة التدبر اليومي في أثر</span>
                  <span className="text-sm font-extrabold text-[#E6C66E] mt-0.5 block font-mono">
                    {tadabburStreak} يوم متتالٍ
                  </span>
                </div>
                <span className="text-xs text-[#F3E5AB] font-quran">﴿أَفَلَا يَتَدَبَّرُونَ الْقُرْآنَ أَمْ عَلَىٰ قُلُوبٍ أَقْفَالُهَا﴾</span>
              </div>

              {/* قائمة الجلسات بدون أي تقطيع نصوص */}
              <div className="grid grid-cols-2 gap-2">
                {TADABBUR_SESSIONS.slice(0, 4).map(s => {
                  const isCur = s.id === selectedTadabburId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedTadabburId(s.id)}
                      className={`p-3 rounded-2xl border text-right transition-all ${
                        isCur
                          ? 'bg-[#221C11] border-[#E6C66E] text-[#E6C66E] shadow'
                          : 'bg-[#12100B] border-[#C8A24A]/25 text-[#C4B998] hover:text-white'
                      }`}
                    >
                      <h5 className="text-xs font-extrabold leading-snug">{s.title}</h5>
                      <p className="text-[10px] text-[#C4B998] mt-1">سورة {s.verse.surahName}</p>
                    </button>
                  );
                })}
              </div>

              {/* بطاقة الجلسة النشطة */}
              <div className="athar-card space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#C8A24A]/25">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-[#1F1B12] text-[#E6C66E] border border-[#C8A24A]/40">
                      <BookOpen size={16} />
                    </span>
                    <div>
                      <h4 className="text-sm font-extrabold text-[#F3E5AB]">{activeTadabburSession.title}</h4>
                      <p className="text-[11px] text-[#C4B998]">سورة {activeTadabburSession.verse.surahName} · الآية {activeTadabburSession.verse.ayahNumber}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-[#E6C66E] bg-[#C8A24A]/20 border border-[#C8A24A]/40 px-2.5 py-0.5 rounded-full">
                    {activeTadabburSession.theme}
                  </span>
                </div>

                <div className="p-3.5 bg-[#0A0907] rounded-xl border border-[#C8A24A]/30 text-center">
                  <p className="font-quran text-lg sm:text-xl text-[#F3E5AB] leading-loose">
                    ﴿{activeTadabburSession.verse.arabicText}﴾
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-[#0D0C08] border border-[#C8A24A]/25 space-y-1">
                    <span className="text-[11px] font-extrabold text-[#E6C66E] block">رسالة الآية لقلبك:</span>
                    <p className="text-[#F3E5AB] leading-relaxed">{activeTadabburSession.heartMessage}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0D0C08] border border-[#C8A24A]/25 space-y-1">
                    <span className="text-[11px] font-extrabold text-[#E6C66E] block">أثر الآية العملي اليوم:</span>
                    <p className="text-[#F3E5AB] leading-relaxed">{activeTadabburSession.dailyActionDeed}</p>
                  </div>
                </div>

                {onSelectSurah && (
                  <div className="pt-2 border-t border-[#C8A24A]/25 flex justify-end">
                    <button
                      onClick={() => onSelectSurah(activeTadabburSession.verse.surahNumber, activeTadabburSession.verse.ayahNumber)}
                      className="text-xs text-[#E6C66E] hover:underline flex items-center gap-1 font-extrabold"
                    >
                      <span>تلاوة السورة كاملة في المصحف</span>
                      <ArrowRight size={12} className="rotate-180" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {tadabburSubTab === 'search' && (
            <div className="athar-card space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#1F1B12] text-[#E6C66E] border border-[#C8A24A]/40">
                  <Search size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#F3E5AB]">البحث الفوري في القرآن الكريم</h3>
                  <p className="text-[11px] text-[#C4B998]">ابحث عن أي لفظ أو معنى في كتاب الله عز وجل</p>
                </div>
              </div>

              <form onSubmit={handleSearchAyahs} className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="اكتب كلمة للبحث مثل: الصبر، الرحمة، الجنة"
                  className="w-full bg-[#0A0907] border border-[#C8A24A]/40 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-[#8E8268] focus:outline-none focus:border-[#E6C66E]"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="athar-btn-primary px-4 py-2 text-xs rounded-xl shrink-0"
                >
                  {isSearching ? 'جاري البحث' : 'بحث'}
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#C8A24A]/25 max-h-72 overflow-y-auto pr-1">
                  <span className="text-[11px] text-[#E6C66E] font-bold block">
                    عُثر على {searchResults.length} موضع في القرآن الكريم:
                  </span>
                  {searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => onSelectSurah?.(item.surahNumber, item.ayahNumber)}
                      className="p-3 rounded-xl bg-[#0A0907] hover:bg-[#16130D] border border-[#C8A24A]/30 hover:border-[#E6C66E] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between text-[11px] text-[#E6C66E] mb-1 font-bold">
                        <span>سورة {item.surahName}</span>
                        <span>الآية {item.ayahNumber}</span>
                      </div>
                      <p className="font-quran text-sm text-[#F3E5AB] leading-relaxed">
                        ﴿{item.text}﴾
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          PILLAR 3: دفتر الحقوق والبر والوصايا (RIGHTS, DEBTS, WILL & KINSHIP)
         ========================================================================= */}
      {activeSection === 'rights_and_kinship' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Sub-Tabs: الديون والأمانات vs الوصية الشرعية vs بر الوالدين vs بنك النوايا */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-[#12100B] rounded-2xl border border-[#C8A24A]/35 text-xs">
            <button
              onClick={() => setRightsSubTab('debts')}
              className={`py-2 px-1 rounded-xl font-bold transition-all text-center flex items-center justify-center gap-1 ${
                rightsSubTab === 'debts'
                  ? 'bg-gradient-to-r from-[#E6C66E] to-[#B88A2D] text-[#070707] shadow font-extrabold'
                  : 'text-[#C4B998] hover:text-white'
              }`}
            >
              <ShieldCheck size={13} />
              <span>الديون والأمانات</span>
            </button>

            <button
              onClick={() => setRightsSubTab('wasiyyah')}
              className={`py-2 px-1 rounded-xl font-bold transition-all text-center flex items-center justify-center gap-1 ${
                rightsSubTab === 'wasiyyah'
                  ? 'bg-gradient-to-r from-[#E6C66E] to-[#B88A2D] text-[#070707] shadow font-extrabold'
                  : 'text-[#C4B998] hover:text-white'
              }`}
            >
              <FileText size={13} />
              <span>الوصية الشرعية</span>
            </button>

            <button
              onClick={() => setRightsSubTab('kinship')}
              className={`py-2 px-1 rounded-xl font-bold transition-all text-center flex items-center justify-center gap-1 ${
                rightsSubTab === 'kinship'
                  ? 'bg-gradient-to-r from-[#E6C66E] to-[#B88A2D] text-[#070707] shadow font-extrabold'
                  : 'text-[#C4B998] hover:text-white'
              }`}
            >
              <Users size={13} />
              <span>بر الوالدين والأرحام</span>
            </button>

            <button
              onClick={() => setRightsSubTab('intentions')}
              className={`py-2 px-1 rounded-xl font-bold transition-all text-center flex items-center justify-center gap-1 ${
                rightsSubTab === 'intentions'
                  ? 'bg-gradient-to-r from-[#E6C66E] to-[#B88A2D] text-[#070707] shadow font-extrabold'
                  : 'text-[#C4B998] hover:text-white'
              }`}
            >
              <CheckCircle size={13} />
              <span>بنك النوايا</span>
            </button>
          </div>

          {/* 3A. دفتر الديون وحفظ الأمانات (زر الإضافة في الأعلى بشكل واضح جداً فوق الكلام) */}
          {rightsSubTab === 'debts' && (
            <div className="space-y-3.5">
              {/* زر إضافة حق أو دين في أعلى الصفحة فوق كل الكلام مباشرة */}
              <button
                type="button"
                onClick={() => setIsAddRightFormOpen(!isAddRightFormOpen)}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#E6C66E] via-[#D4AF37] to-[#B88A2D] text-[#070707] font-black text-sm flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(230,198,110,0.35)] hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
              >
                <Plus size={20} strokeWidth={2.5} />
                <span>{isAddRightFormOpen ? 'إغلاق نموذج التسجيل' : 'إضافة حق أو دين جديد في الدفتر +'}</span>
              </button>

              {/* نموذج الإضافة في الأعلى فوق قائمة الديون */}
              {isAddRightFormOpen && (
                <form 
                  onSubmit={handleCreateRight} 
                  className="p-4 rounded-2xl bg-[#12100B] border-2 border-[#E6C66E]/70 space-y-3 animate-slideDown shadow-2xl"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#C8A24A]/30">
                    <span className="text-xs font-extrabold text-[#F3E5AB] flex items-center gap-1.5">
                      <Scale size={14} className="text-[#E6C66E]" />
                      <span>بيانات الحق أو الدين الجديد</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddRightFormOpen(false)}
                      className="text-xs text-[#C4B998] hover:text-white"
                    >
                      إلغاء
                    </button>
                  </div>
                  
                  {/* نوع الحق */}
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setNewRightType('debt_on_me')}
                      className={`py-2 px-2 rounded-xl border text-xs font-extrabold transition-all ${
                        newRightType === 'debt_on_me'
                          ? 'bg-[#E6C66E] text-black border-[#FFF2C2] shadow'
                          : 'bg-[#18140D] text-[#C4B998] border-[#C8A24A]/30'
                      }`}
                    >
                      دين عليّ للغير
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewRightType('debt_for_me')}
                      className={`py-2 px-2 rounded-xl border text-xs font-extrabold transition-all ${
                        newRightType === 'debt_for_me'
                          ? 'bg-[#E6C66E] text-black border-[#FFF2C2] shadow'
                          : 'bg-[#18140D] text-[#C4B998] border-[#C8A24A]/30'
                      }`}
                    >
                      دين لي عند الغير
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewRightType('trust')}
                      className={`py-2 px-2 rounded-xl border text-xs font-extrabold transition-all ${
                        newRightType === 'trust'
                          ? 'bg-[#E6C66E] text-black border-[#FFF2C2] shadow'
                          : 'bg-[#18140D] text-[#C4B998] border-[#C8A24A]/30'
                      }`}
                    >
                      أمانة في عهدتي
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#E6C66E] block mb-1">
                      بيان الحق أو سبب المداينة:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: سداد قيمة شراء بضاعة، قرض حسن، أمانة أوراق"
                      value={newRightTitle}
                      onChange={(e) => setNewRightTitle(e.target.value)}
                      className="w-full bg-[#0A0907] border border-[#C8A24A]/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E6C66E]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-[#C4B998] block mb-1">
                        المبلغ أو الوصف:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="المبلغ (مثال: 500 ج.م أو ر.س)"
                        value={newRightAmount}
                        onChange={(e) => setNewRightAmount(e.target.value)}
                        className="w-full bg-[#0A0907] border border-[#C8A24A]/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E6C66E]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#C4B998] block mb-1">
                        اسم الطرف المعني:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="اسم الشخص أو الجهة المعنية"
                        value={newRightPerson}
                        onChange={(e) => setNewRightPerson(e.target.value)}
                        className="w-full bg-[#0A0907] border border-[#C8A24A]/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E6C66E]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-[#C4B998] block mb-1">
                        وسيلة الاتصال أو العنوان (اختياري):
                      </label>
                      <input
                        type="text"
                        placeholder="رقم الهاتف أو العنوان والبلدة"
                        value={newRightContact}
                        onChange={(e) => setNewRightContact(e.target.value)}
                        className="w-full bg-[#0A0907] border border-[#C8A24A]/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E6C66E]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#C4B998] block mb-1">
                        الموعد المحدد للسداد (اختياري):
                      </label>
                      <input
                        type="text"
                        placeholder="مثال: أول الشهر القادم، أو نهاية العام"
                        value={newRightDueDate}
                        onChange={(e) => setNewRightDueDate(e.target.value)}
                        className="w-full bg-[#0A0907] border border-[#C8A24A]/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E6C66E]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="athar-btn-primary w-full py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={16} />
                    <span>حفظ وتوثيق الحق في الدفتر</span>
                  </button>
                </form>
              )}

              {/* Header Guidance Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1F190F] to-[#100D08] border border-[#E6C66E]/40 space-y-1.5">
                <span className="text-xs font-extrabold text-[#E6C66E] flex items-center gap-1.5">
                  <ShieldCheck size={15} />
                  <span>دفتر توثيق الحقوق والديون الشرعي</span>
                </span>
                <p className="text-xs text-[#F3E5AB] font-quran leading-relaxed">
                  ﴿يَا أَيُّهَا الَّذِينَ آمَنُوا إِذَا تَدَايَنتُم بِدَيْنٍ إِلَىٰ أَجَلٍ مُّسَمًّى فَاكْتُبُوهُ﴾ [البقرة: ٢٨٢]
                </p>
                <p className="text-[11px] text-[#C4B998] leading-normal">
                  سجل خاص ومحفوظ على هاتفك فقط لتوثيق ما لك وما عليك من أمانات وديون إبراءً للذمة.
                </p>
              </div>

              {/* ملخص إحصائي */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-3 rounded-2xl bg-[#14110A] border border-rose-500/30">
                  <span className="text-[10px] text-rose-300 block font-bold">ديون عليّ للغير</span>
                  <span className="text-sm font-extrabold text-rose-200 mt-1 block font-mono">
                    {debtsOwedByMeCount} معلق
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[#14110A] border border-emerald-500/30">
                  <span className="text-[10px] text-emerald-300 block font-bold">ديون لي عند الغير</span>
                  <span className="text-sm font-extrabold text-emerald-200 mt-1 block font-mono">
                    {debtsOwedToMeCount} معلق
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[#14110A] border border-[#C8A24A]/30">
                  <span className="text-[10px] text-[#E6C66E] block font-bold">أمانات وودائع</span>
                  <span className="text-sm font-extrabold text-[#F3E5AB] mt-1 block font-mono">
                    {trustsCount} في عهدتي
                  </span>
                </div>
              </div>

              {/* فلتر السجلات */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { id: 'all', label: `الكل (${rightsState.records.length})` },
                  { id: 'debt_on_me', label: `عليّ للغير (${debtsOwedByMeCount})` },
                  { id: 'debt_for_me', label: `لي عند الغير (${debtsOwedToMeCount})` },
                  { id: 'fulfilled', label: 'تم سدادها' }
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setDebtFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all text-xs border ${
                      debtFilter === f.id
                        ? 'bg-[#C8A24A] text-black border-[#FFF2C2]'
                        : 'bg-[#14110A] text-[#C4B998] border-[#C8A24A]/30 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* قائمة السجلات المعروضة بالكامل بدون أي تقطيع أو نقاط */}
              <div className="space-y-2.5">
                {filteredRecords.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-[#0F0D09] border border-[#C8A24A]/25 text-center space-y-1">
                    <p className="text-xs text-[#E6C66E] font-bold">
                      لا توجد سجلات في هذا التصنيف حالياً.
                    </p>
                    <span className="text-[11px] text-[#C4B998] block">
                      استخدم زر «إضافة حق أو دين جديد» بالأعلى لتوثيق أي حق بيسر.
                    </span>
                  </div>
                ) : (
                  filteredRecords.map((r) => (
                    <div
                      key={r.id}
                      className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                        r.isFulfilled
                          ? 'bg-[#0B0A08] border-[#C8A24A]/20 opacity-70'
                          : 'bg-[#14110A] border-[#C8A24A]/40 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                              r.type === 'debt_on_me'
                                ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                                : r.type === 'debt_for_me'
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                                : 'bg-[#C8A24A]/20 text-[#E6C66E] border-[#C8A24A]/40'
                            }`}>
                              {r.type === 'debt_on_me' ? 'دين عليّ للغير' : r.type === 'debt_for_me' ? 'دين لي عند الغير' : 'أمانة في عهدتي'}
                            </span>
                            
                            {r.isFulfilled && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/40 text-emerald-300 border border-emerald-500/30">
                                تم السداد وقضاء الحق ✓
                              </span>
                            )}
                          </div>

                          <h5 className={`text-sm font-extrabold leading-relaxed ${r.isFulfilled ? 'line-through text-[#8E8268]' : 'text-white'}`}>
                            {r.title}
                          </h5>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                          <button
                            onClick={() => handleToggleRightFulfilled(r.id)}
                            className={`p-2 rounded-xl border text-xs transition-colors flex items-center gap-1 font-bold ${
                              r.isFulfilled
                                ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#E6C66E]'
                                : 'bg-[#1A160E] border-[#C8A24A]/30 text-[#C4B998] hover:text-white'
                            }`}
                            title={r.isFulfilled ? 'إلغاء السداد' : 'تأكيد السداد'}
                          >
                            <Check size={14} />
                            <span>{r.isFulfilled ? 'مسدد' : 'تم السداد'}</span>
                          </button>

                          <button
                            onClick={() => handleDeleteRight(r.id)}
                            className="p-2 rounded-xl bg-rose-950/40 border border-rose-500/20 text-rose-300 hover:text-rose-100"
                            title="حذف السجل"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* تفاصيل الحق كاملة */}
                      <div className="pt-1.5 border-t border-[#C8A24A]/15 grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs text-[#C4B998]">
                        <div>
                          <span className="block text-[10px] text-[#8E8268]">المبلغ / المقدار:</span>
                          <span className="text-[#E6C66E] font-bold">{r.amountOrDescription}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-[#8E8268]">صاحب الحق / الطرف:</span>
                          <span className="text-white font-semibold">{r.personName}</span>
                        </div>
                        {r.dueDate && (
                          <div>
                            <span className="block text-[10px] text-[#8E8268]">تاريخ السداد:</span>
                            <span className="text-[#F3E5AB]">{r.dueDate}</span>
                          </div>
                        )}
                        {r.contactOrLocation && (
                          <div className="col-span-2">
                            <span className="block text-[10px] text-[#8E8268]">العنوان / الهاتف:</span>
                            <span className="text-white">{r.contactOrLocation}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 3B. الوصية الشرعية النبوية */}
          {rightsSubTab === 'wasiyyah' && (
            <div className="athar-card space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#C8A24A]/25">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-[#1F1B12] text-[#E6C66E] border border-[#C8A24A]/40">
                    <FileText size={16} />
                  </span>
                  <div>
                    <h4 className="text-sm font-extrabold text-[#F3E5AB]">الوصية الشرعية النبوية</h4>
                    <p className="text-[11px] text-[#C4B998] leading-normal">
                      «مَا حَقُّ امْرِئٍ مُسْلِمٍ لَهُ شَيْءٌ يُوصِي فِيهِ يَبِيتُ لَيْلَتَيْنِ إِلَّا وَوَصِيَّتُهُ مَكْتُوبَةٌ عِنْدَهُ»
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleCopyText(wasiyyahText, 'wasiyyah')}
                  className="athar-btn-outline px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 font-bold shrink-0"
                >
                  <Copy size={13} />
                  <span>{copiedSection === 'wasiyyah' ? 'تم النسخ ✓' : 'نسخ الوصية'}</span>
                </button>
              </div>

              {wasiyyahSavedMsg && (
                <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs font-bold text-center animate-fadeIn">
                  تم حفظ وصيتك بنجاح محلياً على جهازك ✓
                </div>
              )}

              {/* ديباجة الوصية المأثورة */}
              <div className="p-3.5 rounded-2xl bg-[#0E0C09] border border-[#C8A24A]/30 space-y-1.5 text-xs text-[#E5DEC9] leading-relaxed">
                <span className="text-[#E6C66E] font-bold block text-xs">ديباجة الوصية الشرعية الثابتة:</span>
                <p className="font-quran leading-loose text-justify text-[#F3E5AB]">
                  {STANDARD_WASIYYAH_PREAMBLE}
                </p>
              </div>

              {/* مربع كتابة وتعديل الوصية والتوجيهات */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-[#E6C66E] block">
                  وصيتك وتوجيهاتك الخاصة لأهلك وأبنائك:
                </label>
                <textarea
                  rows={5}
                  value={wasiyyahText}
                  onChange={(e) => setWasiyyahText(e.target.value)}
                  className="w-full bg-[#0A0907] border border-[#C8A24A]/35 rounded-2xl p-3 text-xs text-white leading-relaxed focus:outline-none focus:border-[#E6C66E]"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={handleSaveWasiyyah}
                  className="athar-btn-primary px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-md"
                >
                  حفظ نص الوصية على جهازك
                </button>
              </div>
            </div>
          )}

          {/* 3C. بر الوالدين والإحسان (منظم ومطور بشكل راقٍ) */}
          {rightsSubTab === 'kinship' && (
            <div className="space-y-3.5">
              {/* زر إضافة قريب في أعلى الصفحة بشكل بارز ومريح */}
              <button
                type="button"
                onClick={() => setIsAddKinOpen(!isAddKinOpen)}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#E6C66E] via-[#D4AF37] to-[#B88A2D] text-[#070707] font-black text-sm flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(230,198,110,0.35)] hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
              >
                <Plus size={20} strokeWidth={2.5} />
                <span>{isAddKinOpen ? 'إغلاق نموذج التسجيل' : 'إضافة قريب أو صلة رحم للمتابعة +'}</span>
              </button>

              {/* إضافة قريب للتواصل الدوري (فوق القائمة فوراً) */}
              {isAddKinOpen && (
                <form onSubmit={handleAddKinRecord} className="p-4 rounded-2xl bg-[#12100B] border-2 border-[#E6C66E]/70 space-y-3 animate-slideDown shadow-2xl">
                  <div className="flex items-center justify-between pb-2 border-b border-[#C8A24A]/30">
                    <span className="text-xs font-extrabold text-[#F3E5AB] flex items-center gap-1.5">
                      <Users size={14} className="text-[#E6C66E]" />
                      <span>بيانات القريب في سجل الصلة والإحسان</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddKinOpen(false)}
                      className="text-xs text-[#C4B998] hover:text-white"
                    >
                      إلغاء
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-[#E6C66E] block mb-1">
                        اسم القريب:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: الوالدة، الوالد، الخال أحمد، عمتي مريم"
                        value={newKinName}
                        onChange={(e) => setNewKinName(e.target.value)}
                        className="w-full bg-[#0A0907] border border-[#C8A24A]/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E6C66E]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-[#E6C66E] block mb-1">
                        صلة القرابة:
                      </label>
                      <input
                        type="text"
                        placeholder="مثال: والدين، أخت، أخ، أعمام، أخوال، أجداد"
                        value={newKinRelation}
                        onChange={(e) => setNewKinRelation(e.target.value)}
                        className="w-full bg-[#0A0907] border border-[#C8A24A]/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E6C66E]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="athar-btn-primary w-full py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={16} />
                    <span>إضافة القريب إلى سجل الأرحام</span>
                  </button>
                </form>
              )}

              {/* بطاقة بر الوالدين الكبرى */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1C160C] via-[#120F08] to-[#0A0906] border border-[#E6C66E]/40 space-y-3 shadow-lg">
                <div className="flex items-center justify-between pb-2 border-b border-[#C8A24A]/25">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-[#241E12] text-[#E6C66E] border border-[#C8A24A]/45">
                      <Heart size={16} fill="currentColor" />
                    </span>
                    <div>
                      <h4 className="text-sm font-extrabold text-[#F3E5AB]">بر الوالدين وأعظم الطاعات</h4>
                      <p className="text-[11px] text-[#C4B998] leading-normal">
                        ﴿وَقَضَىٰ رَبُّكَ أَلَّا تَعْبُدُوا إِلَّا إِيَّاهُ وَبِالْوَالِدَيْنِ إِحْسَانًا﴾
                      </p>
                    </div>
                  </div>
                </div>

                {/* دعاء الوالدين القرآني مع زر النسخ الكامل */}
                <div className="p-3.5 bg-[#0A0907] rounded-xl border border-[#C8A24A]/30 space-y-2 text-center">
                  <div className="flex items-center justify-between text-xs font-bold text-[#E6C66E]">
                    <span>دعاء الوالدين من القرآن الكريم:</span>
                    <button
                      onClick={() => handleCopyText('رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا', 'kin_dua')}
                      className="text-[11px] text-[#C4B998] hover:text-white flex items-center gap-1 font-bold"
                    >
                      <Copy size={11} />
                      <span>{copiedSection === 'kin_dua' ? 'تم النسخ ✓' : 'نسخ الدعاء'}</span>
                    </button>
                  </div>
                  <p className="font-quran text-lg sm:text-xl text-[#F3E5AB] leading-relaxed select-text">
                    ﴿رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا﴾
                  </p>
                  <p className="font-quran text-sm text-[#D8CEB4]">
                    ﴿رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ﴾
                  </p>
                </div>

                {/* زر تفاعلي يومي: دعوت لوالدي اليوم */}
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#16120B] border border-[#C8A24A]/30">
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-[#F3E5AB] block">
                      متابعة بر ودعاء اليوم:
                    </span>
                    <span className="text-[11px] text-[#C4B998]">
                      {kinshipState.fatherLastDuaDate
                        ? `آخر تسجيل دعاء: ${kinshipState.fatherLastDuaDate}`
                        : 'لم تسجل دعاء اليوم بعد'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      StorageService.recordParentDua('father');
                      StorageService.recordParentDua('mother');
                      setKinshipState(StorageService.getKinshipParentsState());
                      try {
                        confetti({
                          particleCount: 40,
                          spread: 60,
                          origin: { y: 0.7 },
                          colors: ['#E6C66E', '#C8A24A', '#F3E5AB']
                        });
                      } catch {}
                    }}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#E6C66E] to-[#B88A2D] text-[#070707] text-xs font-black flex items-center gap-1.5 shadow active:scale-95 transition-all"
                  >
                    <CheckCircle2 size={14} />
                    <span>دعوت لوالدي اليوم ✓</span>
                  </button>
                </div>
              </div>

              {/* أزرار الإحسان والصلة التفاعلية الفورية */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <a
                  href="tel:"
                  className="p-3 bg-[#16130D] hover:bg-[#221D14] rounded-2xl border border-[#C8A24A]/35 text-[#F3E5AB] font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Phone size={15} className="text-[#E6C66E]" />
                  <span>اتصال هاتفي سريع</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleCopyText('اللهم اغفر لوالدي وارحمهما وعافهما واعف عنهما واجزهما عنا خير الجزاء في الدنيا والآخرة وارزقنا برهما ورضاهما', 'kin_dua_share')}
                  className="p-3 bg-[#16130D] hover:bg-[#221D14] rounded-2xl border border-[#C8A24A]/35 text-[#F3E5AB] font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <HandHeart size={15} className="text-[#E6C66E]" />
                  <span>{copiedSection === 'kin_dua_share' ? 'تم نسخ الدعاء ✓' : 'إهداء دعاء للأهل'}</span>
                </button>
              </div>

              {/* قائمة الأرحام المسجلة */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#E6C66E] flex items-center gap-1.5">
                    <Users size={14} />
                    <span>قائمة الأرحام والأقارب المسجلة لديك ({kinshipState.contacts.length}):</span>
                  </span>
                </div>

                {kinshipState.contacts.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-[#0F0D09] border border-[#C8A24A]/25 text-center space-y-1">
                    <p className="text-xs text-[#E6C66E] font-bold">لا توجد أسماء مسجلة حالياً.</p>
                    <span className="text-[11px] text-[#C4B998] block">
                      اضغط على زر «إضافة قريب أو صلة رحم للمتابعة +» أعلاه لتسجيل والديك وأقاربك ومتابعة صلتهم.
                    </span>
                  </div>
                ) : (
                  kinshipState.contacts.map((k) => (
                    <div
                      key={k.id}
                      className="p-3.5 rounded-2xl bg-[#14110A] border border-[#C8A24A]/35 flex items-center justify-between gap-2 shadow-sm"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="text-sm font-extrabold text-white">{k.name}</h5>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C8A24A]/20 text-[#E6C66E] border border-[#C8A24A]/35 font-bold">
                            {k.relationship}
                          </span>
                          <span className="text-[10px] text-[#C4B998]">
                            {k.status === 'alive' ? 'حي يرزق (صلة وبر)' : 'متوفى (دعاء وصدقة)'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#A6997A]">
                          تم التواصل {k.interactionCount || 0} مرات · آخر صلة: {k.lastInteractionDate || 'سجل جديد'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            StorageService.recordKinshipInteraction(k.id);
                            setKinshipState(StorageService.getKinshipParentsState());
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-[#241E12] hover:bg-[#322A19] border border-[#C8A24A]/40 text-xs text-[#F3E5AB] font-bold flex items-center gap-1 transition-colors"
                          title="تسجيل تواصل اليوم"
                        >
                          <CheckCircle2 size={13} className="text-[#E6C66E]" />
                          <span>سجلت تواصل ✓</span>
                        </button>

                        <a
                          href="tel:"
                          className="p-2 rounded-xl bg-[#1A160E] hover:bg-[#251F14] border border-[#C8A24A]/30 text-[#E6C66E]"
                          title="اتصال هاتفي"
                        >
                          <Phone size={13} />
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            StorageService.deleteKinshipContact(k.id);
                            setKinshipState(StorageService.getKinshipParentsState());
                          }}
                          className="p-2 rounded-xl bg-rose-950/40 border border-rose-500/20 text-rose-300 hover:text-rose-100"
                          title="حذف القريب من القائمة"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 3D. بنك النوايا اليومية (مكتوب بالكامل دون أي تقطيع) */}
          {rightsSubTab === 'intentions' && (
            <div className="athar-card space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#C8A24A]/25">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-[#1F1B12] text-[#E6C66E] border border-[#C8A24A]/40">
                    <CheckCircle size={16} />
                  </span>
                  <div>
                    <h4 className="text-sm font-extrabold text-[#F3E5AB]">بنك النوايا اليومية المباركة</h4>
                    <p className="text-[11px] text-[#C4B998] leading-normal">تجارة النوايا الصالحة: تحويل العادات اليومية إلى طاعات وعبادات عظيمة</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {DAILY_INTENTIONS_CATALOG.map(intent => (
                  <div key={intent.id} className="p-3.5 rounded-2xl bg-[#0D0C08] border border-[#C8A24A]/30 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-extrabold text-[#F3E5AB]">
                      <span>{intent.title}</span>
                      <span className="text-[10px] text-[#E6C66E] bg-[#C8A24A]/20 px-2 py-0.5 rounded-full border border-[#C8A24A]/30">
                        {intent.categoryLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#C4B998] leading-relaxed">{intent.intentionText}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Share Card Studio Modal */}
      {shareCardPayload && (
        <ShareCardModal
          isOpen={Boolean(shareCardPayload)}
          onClose={() => setShareCardPayload(null)}
          initialPayload={shareCardPayload}
        />
      )}
    </div>
  );
};
