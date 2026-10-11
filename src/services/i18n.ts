import { useState, useEffect } from 'react';
import { StorageService } from './storageService';
import { ALL_SURAHS } from '../data/surahsData';

export type AppLanguage = 'ar' | 'en';

type Listener = (lang: AppLanguage) => void;
const listeners = new Set<Listener>();

export const TRANSLATIONS = {
  ar: {
    // Navigation Tabs
    nav_home: 'الرئيسية',
    nav_prayers: 'الصلاة',
    nav_quran: 'القرآن',
    nav_adhkar: 'الأذكار',
    nav_stories: 'القصص',
    nav_qibla: 'القبلة',
    nav_explore: 'استكشف',
    nav_settings: 'الإعدادات',
    nav_journey: 'مسار الهداية',
    nav_companion: 'رفيق أثر',
    nav_reminders: 'التذكيرات',

    // Prayers
    prayer_fajr: 'الفجر',
    prayer_sunrise: 'الشروق',
    prayer_dhuhr: 'الظهر',
    prayer_asr: 'العصر',
    prayer_maghrib: 'المغرب',
    prayer_isha: 'العشاء',
    prayer_duha: 'الضحى',
    prayer_qiyam: 'قيام الليل',
    prayer_sunan: 'السنن الرواتب',
    prayer_next: 'الصلاة القادمة',
    prayer_remaining: 'الوقت المتبقي',
    prayer_time_now: 'حان الآن موعد الأذان',
    prayer_countdown_after: 'بعد',
    prayer_passed: 'مضت',
    prayer_log_done: 'تمت الصلاة ✓',
    prayer_log_btn: 'تسجيل أداء الصلاة',
    prayer_streak: 'سلسلة الالتزام',
    prayer_calculation_title: 'طريقة الحساب الفلكي',
    prayer_iqamah: 'الإقامة',
    prayer_adhan: 'الأذان',

    // Home View Cards
    home_welcome_royal: 'أهلاً بك في رحاب أثر',
    home_quick_access: 'الوصول السريع',
    home_today_verse: 'آية اليوم والتدبر',
    home_today_hadith: 'حديث شريف',
    home_daily_wird: 'الورد اليومي',
    home_impact_tree: 'شجرة الأثر التفاعلية',
    home_impact_tree_desc: 'شجرتك الروحية تزهر وتنمو مع كل صلاة، ذكر، وقراءة للقرآن',
    home_audio_listen: 'استمع للتلاوة العطرة',
    home_fasting_tracker: 'صيام السنن والأيام البيض',
    home_local_pulse: 'نبض أثر المحلي والمساجد القريبة',
    home_sakina_oasis: 'واحة السكينة والحقوق الإسلامية',
    home_voice_assistant: 'المساعد الصوتي لأثر',
    home_share_card: 'مشاركة البطاقة',
    home_continue_reading: 'متابعة من حيث توقفت',
    home_surah: 'سورة',
    home_ayah: 'آية',

    // Quran View
    quran_title: 'المصحف الشريف',
    quran_subtitle: 'قراءة، استماع، تفسير ميسر وتدبر عميق',
    quran_search_placeholder: 'ابحث عن اسم السورة أو رقمها...',
    quran_surahs_count: '114 سورة كاملة',
    quran_meccan: 'مكية',
    quran_medinan: 'مدنية',
    quran_ayahs: 'آيات',
    quran_juz: 'الجزء',
    quran_page: 'الصفحة',
    quran_khatmah: 'متابعة الختمة',
    quran_bookmarks: 'الفواصل المحفوظة',
    quran_reciter: 'القارئ',
    quran_listen_continuous: 'تشغيل متواصل',
    quran_tafsir: 'التفسير الميسر',
    quran_theme_night: 'ليلي فاخر',
    quran_theme_sepia: 'ورقي دافئ',
    quran_theme_oled: 'أسود مطلق',

    // Adhkar View
    adhkar_title: 'أذكار المسلم وحصن المؤمن',
    adhkar_morning: 'أذكار الصباح',
    adhkar_evening: 'أذكار المساء',
    adhkar_after_prayer: 'أذكار بعد الصلاة',
    adhkar_sleep: 'أذكار النوم',
    adhkar_waking: 'أذكار الاستيقاظ',
    adhkar_names_of_allah: 'أسماء الله الحسنى',
    adhkar_tasbih: 'المسبحة الإلكترونية',
    adhkar_count_remaining: 'المتبقي',
    adhkar_completed: 'اكتمل الذكر بنجاح ✓',
    adhkar_listen_full: 'استماع كامل بصوت الشيخ العفاسي',
    adhkar_reset: 'إعادة ضبط',

    // Qibla View
    qibla_title: 'بوصلة اتجاه القبلة',
    qibla_subtitle: 'تحديد دقيق لاتجاه الكعبة المشرفة بمكة المكرمة',
    qibla_facing_now: 'أنت الآن باتجاه الكعبة المشرفة تماماً',
    qibla_bearing: 'زاوية الاتجاه',
    qibla_distance: 'المسافة إلى مكة المكرمة',
    qibla_calibrate_hint: 'حرّك الهاتف بحركة رقم 8 لمعايرة مستشعر البوصلة',
    qibla_degrees: 'درجة',
    qibla_km: 'كم',

    // Stories & Explore Views
    stories_title: 'قصص القرآن والأنبياء',
    stories_read_story: 'اقرأ القصة والعِبرة',
    stories_wisdom: 'الدروس المستفادة والتدبر',
    explore_title: 'استكشف أثر',
    explore_quran_library: 'المكتبة القرآنية والعلوم',
    explore_fatwas: 'الفتاوى والأحكام',
    explore_articles: 'مقالات إيمانية وتدبر',
    explore_tools: 'الأدوات والحاسبات',

    // Settings Header & Tabs
    settings_title: 'إعدادات أثر',
    settings_subtitle: 'تخصيص الإشعارات، القبلة، المصحف، واللغة',
    settings_edition: 'الإصدار الملكي',
    settings_tab_all: 'الكل',
    settings_tab_language: 'اللغة',
    settings_tab_voice: 'الصوت والهمم',
    settings_tab_notifications: 'التنبيهات',
    settings_tab_quran: 'المصحف',
    settings_tab_system: 'النسخ والأذونات',

    // Language Section
    lang_card_title: 'لغة التطبيق (Language)',
    lang_card_desc: 'اختر لغة الواجهة المفضلة لك من بين العربية والإنجليزية',
    lang_arabic: 'العربية (Arabic)',
    lang_english: 'English (الإنجليزية)',
    lang_arabic_sub: 'اللغة الأصلية المعتمدة لواجهة التطبيق',
    lang_english_sub: 'Full English interface across all pages & features',
    lang_switched_banner: 'تم تغيير لغة التطبيق بنجاح ✓',

    // Voice & Accessibility
    voice_title: 'المساعد الصوتي ونظام النطق التفاعلي',
    voice_desc: 'تفعيل المساعد الصوتي والتحكم بالأوامر الصوتية',
    voice_auto_speak: 'نطق الردود صوتياً (Text-to-Speech)',
    voice_auto_speak_desc: 'يقوم التطبيق بنطق نتائج الصلاة والأذكار بصوت واضح',

    // Notifications & Adhan
    adhan_title: 'الأذان والإشعارات الفلكية',
    adhan_desc: 'ضبط أصوات الأذان وتنبيهات الإقامة قبل كل صلاة',
    adhan_status_enabled: 'الأذان مفعل',
    adhan_status_disabled: 'الأذان متوقف',
    adhan_voice_makkah: 'أذان الحرم المكي الشريف',
    adhan_voice_madinah: 'أذان المسجد النبوي الشريف',
    adhan_voice_alaqsa: 'أذان المسجد الأقصى المبارك',
    adhan_voice_alafasy: 'أذان الشيخ مشاري العفاسي',

    // Reciters
    reciter_title: 'القارئ المعتمد للتلاوات العطرة',
    reciter_desc: 'اختر قارئك المفضل للاستماع أثناء قراءة المصحف والختمات',

    // System & Data
    backup_title: 'النسخ الاحتياطي وإدارة البيانات',
    backup_desc: 'حفظ واستعادة سجل صلواتك، أذكارك، ومواضع القراءة والاستماع',
    backup_export: 'تصدير نسخة احتياطية',
    backup_import: 'استعادة نسخة محفوظة',
    backup_clear_data: 'مسح جميع البيانات المحلية',
    backup_clear_confirm: 'هل أنت متأكد من مسح جميع البيانات والإعدادات؟',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    save: 'حفظ التغييرات',

    // General App Labels
    brand_name: 'أثر',
    brand_tagline: 'رفيقك اليومي للقرآن والصلاة والذكر',
    live_activity: 'النشاط المباشر والجزيرة التفاعلية',
    offline_ready: 'العمل بدون إنترنت',
    hours: 'ساعة',
    minutes: 'دقيقة',
    seconds: 'ثانية',
  },
  en: {
    // Navigation Tabs
    nav_home: 'Home',
    nav_prayers: 'Prayers',
    nav_quran: 'Quran',
    nav_adhkar: 'Adhkar',
    nav_stories: 'Stories',
    nav_qibla: 'Qibla',
    nav_explore: 'Explore',
    nav_settings: 'Settings',
    nav_journey: 'Journey',
    nav_companion: 'Companion',
    nav_reminders: 'Reminders',

    // Prayers
    prayer_fajr: 'Fajr',
    prayer_sunrise: 'Sunrise',
    prayer_dhuhr: 'Dhuhr',
    prayer_asr: 'Asr',
    prayer_maghrib: 'Maghrib',
    prayer_isha: 'Isha',
    prayer_duha: 'Duha',
    prayer_qiyam: 'Qiyam Al-Layl',
    prayer_sunan: 'Sunnah Prayers',
    prayer_next: 'Next Prayer',
    prayer_remaining: 'Remaining Time',
    prayer_time_now: 'It is time for Adhan',
    prayer_countdown_after: 'In',
    prayer_passed: 'Passed',
    prayer_log_done: 'Prayer Completed ✓',
    prayer_log_btn: 'Log Prayer Performance',
    prayer_streak: 'Prayer Streak',
    prayer_calculation_title: 'Calculation Method',
    prayer_iqamah: 'Iqamah',
    prayer_adhan: 'Adhan',

    // Home View Cards
    home_welcome_royal: 'Welcome to ATHAR Sanctuary',
    home_quick_access: 'Quick Access',
    home_today_verse: 'Daily Verse & Reflection',
    home_today_hadith: 'Prophetic Hadith',
    home_daily_wird: 'Daily Wird',
    home_impact_tree: 'Interactive Impact Tree',
    home_impact_tree_desc: 'Your spiritual tree flourishes with every prayer, dhikr, and Quran recitation',
    home_audio_listen: 'Listen to Recitation',
    home_fasting_tracker: 'Fasting Tracker & White Days',
    home_local_pulse: 'Local Athar Pulse & Nearby Mosques',
    home_sakina_oasis: 'Sakina Oasis & Islamic Rights',
    home_voice_assistant: 'Athar Voice Assistant',
    home_share_card: 'Share Card',
    home_continue_reading: 'Continue Reading',
    home_surah: 'Surah',
    home_ayah: 'Ayah',

    // Quran View
    quran_title: 'Holy Quran',
    quran_subtitle: 'Read, listen, easy tafsir and deep reflections',
    quran_search_placeholder: 'Search surah by name or number...',
    quran_surahs_count: '114 Complete Surahs',
    quran_meccan: 'Meccan',
    quran_medinan: 'Medinan',
    quran_ayahs: 'Verses',
    quran_juz: 'Juz',
    quran_page: 'Page',
    quran_khatmah: 'Khatmah Tracker',
    quran_bookmarks: 'Saved Bookmarks',
    quran_reciter: 'Reciter',
    quran_listen_continuous: 'Continuous Audio Recitation',
    quran_tafsir: 'Simplified Tafsir',
    quran_theme_night: 'Royal Night',
    quran_theme_sepia: 'Warm Paper',
    quran_theme_oled: 'Pure OLED',

    // Adhkar View
    adhkar_title: 'Islamic Adhkar & Fortress of the Muslim',
    adhkar_morning: 'Morning Adhkar',
    adhkar_evening: 'Evening Adhkar',
    adhkar_after_prayer: 'After Prayer Adhkar',
    adhkar_sleep: 'Sleep Adhkar',
    adhkar_waking: 'Waking Up Adhkar',
    adhkar_names_of_allah: '99 Names of Allah',
    adhkar_tasbih: 'Digital Tasbih Counter',
    adhkar_count_remaining: 'Remaining',
    adhkar_completed: 'Dhikr Completed ✓',
    adhkar_listen_full: 'Listen Full Recitation by Sheikh Alafasy',
    adhkar_reset: 'Reset Counter',

    // Qibla View
    qibla_title: 'Qibla Direction Compass',
    qibla_subtitle: 'Accurate direction to the Holy Kaaba in Makkah',
    qibla_facing_now: 'You are now directly facing the Kaaba',
    qibla_bearing: 'Direction Angle',
    qibla_distance: 'Distance to Makkah',
    qibla_calibrate_hint: 'Move phone in a figure-8 motion to calibrate sensor',
    qibla_degrees: 'degrees',
    qibla_km: 'km',

    // Stories & Explore Views
    stories_title: 'Stories of the Quran & Prophets',
    stories_read_story: 'Read Story & Wisdom',
    stories_wisdom: 'Lessons & Contemplation',
    explore_title: 'Explore Athar',
    explore_quran_library: 'Quranic Library & Sciences',
    explore_fatwas: 'Fatwas & Rulings',
    explore_articles: 'Faith Articles & Reflections',
    explore_tools: 'Islamic Utilities & Tools',

    // Settings Header & Tabs
    settings_title: 'Athar Settings',
    settings_subtitle: 'Customize notifications, Qibla, Quran, and language',
    settings_edition: 'Royal Edition',
    settings_tab_all: 'All',
    settings_tab_language: 'Language',
    settings_tab_voice: 'Voice & Accessibility',
    settings_tab_notifications: 'Notifications',
    settings_tab_quran: 'Holy Quran',
    settings_tab_system: 'Backup & Permissions',

    // Language Section
    lang_card_title: 'App Language',
    lang_card_desc: 'Choose your preferred interface language between Arabic and English',
    lang_arabic: 'العربية (Arabic)',
    lang_english: 'English',
    lang_arabic_sub: 'The original classical Arabic interface',
    lang_english_sub: 'Full English interface across all pages & features',
    lang_switched_banner: 'App language updated successfully ✓',

    // Voice & Accessibility
    voice_title: 'Voice Assistant & Interactive Speech',
    voice_desc: 'Enable voice assistant and hands-free voice commands',
    voice_auto_speak: 'Read responses aloud (Text-to-Speech)',
    voice_auto_speak_desc: 'The app speaks prayer times and adhkar clearly',

    // Notifications & Adhan
    adhan_title: 'Adhan & Prayer Alerts',
    adhan_desc: 'Configure sacred Adhan sounds and Iqamah reminders',
    adhan_status_enabled: 'Adhan Active',
    adhan_status_disabled: 'Adhan Muted',
    adhan_voice_makkah: 'Makkah Al-Mukarramah Adhan',
    adhan_voice_madinah: 'Madinah Al-Munawwarah Adhan',
    adhan_voice_alaqsa: 'Al-Aqsa Mosque Adhan',
    adhan_voice_alafasy: 'Sheikh Mishari Al-Afasy Adhan',

    // Reciters
    reciter_title: 'Selected Quran Reciter',
    reciter_desc: 'Choose your favorite reciter for Quran audio playback',

    // System & Data
    backup_title: 'Backup & Data Management',
    backup_desc: 'Save and restore your prayer logs, adhkar stats, and reading marks',
    backup_export: 'Export Backup',
    backup_import: 'Restore Backup',
    backup_clear_data: 'Clear All Local Data',
    backup_clear_confirm: 'Are you sure you want to clear all data and local settings?',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save Changes',

    // General App Labels
    brand_name: 'ATHAR',
    brand_tagline: 'Your Daily Companion for Quran, Prayer & Dhikr',
    live_activity: 'Live Activity & Dynamic Island',
    offline_ready: '100% Offline Capable',
    hours: 'hours',
    minutes: 'mins',
    seconds: 'secs',
  },
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS.ar;

/**
 * High-performance dictionary mapping Arabic strings to English across all features.
 * Ordered by decreasing phrase length to prioritize multi-word phrases over single words.
 */
export const ARABIC_TO_ENGLISH_PHRASES: [RegExp, string][] = [
  // Multi-word phrases
  [/الهيئة المصرية العامة للمساحة \(الافتراضي\)/g, 'Egyptian Survey Authority (Default)'],
  [/الهيئة المصرية العامة للمساحة/g, 'Egyptian Survey Authority'],
  [/جامعة أم القرى - مكة المكرمة/g, 'Umm Al-Qura University - Makkah'],
  [/جامعة أم القرى/g, 'Umm Al-Qura University'],
  [/رابطة العالم الإسلامي/g, 'Muslim World League'],
  [/جامعة العلوم الإسلامية بكراتشي/g, 'Karachi Islamic Sciences'],
  [/الهيئة العامة للشؤون الإسلامية والأوقاف \(الإمارات\)/g, 'UAE Islamic Affairs'],
  [/الهيئة العامة للشؤون الإسلامية والأوقاف/g, 'UAE Islamic Affairs'],
  [/الجمعية الإسلامية لأمريكا الشمالية \(ISNA\)/g, 'Islamic Society of North America (ISNA)'],
  [/الجمعية الإسلامية لأمريكا الشمالية/g, 'Islamic Society of North America'],

  // Reciters
  [/الشيخ مشاري راشد العفاسي/g, 'Sheikh Mishari Rashid Al-Afasy'],
  [/الشيخ مشاري العفاسي/g, 'Sheikh Mishari Al-Afasy'],
  [/مشاري راشد العفاسي/g, 'Mishari Rashid Al-Afasy'],
  [/الشيخ عبد الباسط عبد الصمد/g, 'Sheikh Abdul Basit'],
  [/عبد الباسط عبد الصمد/g, 'Abdul Basit Abdus Samad'],
  [/الشيخ محمود خليل الحصري/g, 'Sheikh Al-Husary'],
  [/محمود خليل الحصري/g, 'Mahmoud Khalil Al-Husary'],
  [/الشيخ محمد صديق المنشاوي/g, 'Sheikh Al-Minshawi'],
  [/محمد صديق المنشاوي/g, 'Mohamed Siddiq Al-Minshawi'],
  [/الشيخ سعد الغامدي/g, 'Sheikh Saad Al-Ghamdi'],
  [/سعد الغامدي/g, 'Saad Al-Ghamdi'],
  [/الشيخ ماهر المعيقلي/g, 'Sheikh Maher Al-Muaiqly'],
  [/ماهر المعيقلي/g, 'Maher Al-Muaiqly'],
  [/الشيخ ياسر الدوسري/g, 'Sheikh Yasser Al-Dosari'],
  [/ياسر الدوسري/g, 'Yasser Al-Dosari'],

  // Sacred Adhans
  [/أذان الحرم المكي الشريف/g, 'Makkah Al-Mukarramah Adhan'],
  [/أذان المسجد النبوي الشريف/g, 'Madinah Al-Munawwarah Adhan'],
  [/أذان المسجد الأقصى المبارك/g, 'Al-Aqsa Mosque Adhan'],
  [/أذان الشيخ مشاري العفاسي/g, 'Sheikh Mishari Al-Afasy Adhan'],

  // Prayers & Times
  [/الصلاة القادمة/g, 'Next Prayer'],
  [/الوقت المتبقي/g, 'Remaining Time'],
  [/مواقيت الصلاة/g, 'Prayer Times'],
  [/مواقيت اليوم/g, "Today's Timings"],
  [/السنن الرواتب/g, 'Sunnah Prayers'],
  [/قيام الليل والثلث الأخير/g, 'Qiyam & Last Third of Night'],
  [/قيام الليل/g, 'Qiyam Al-Layl'],
  [/صلاة الضحى/g, 'Duha Prayer'],
  [/تسجيل أداء الصلاة/g, 'Log Prayer'],
  [/سجل الصلوات/g, 'Prayer Log'],
  [/تمت الصلاة/g, 'Prayer Completed'],
  [/حان الآن موعد الأذان/g, 'It is time for Adhan'],
  [/حان موعد الصلاة/g, 'It is prayer time'],
  [/تنبيه الإقامة/g, 'Iqamah Alert'],
  [/تنبيه الأذان/g, 'Adhan Alert'],
  [/التقويم الشهري/g, 'Monthly Calendar'],

  // Specific Prayers
  [/\bالفجر\b/g, 'Fajr'],
  [/\bالشروق\b/g, 'Sunrise'],
  [/\bالظهر\b/g, 'Dhuhr'],
  [/\bالعصر\b/g, 'Asr'],
  [/\bالمغرب\b/g, 'Maghrib'],
  [/\bالعشاء\b/g, 'Isha'],
  [/\bالضحى\b/g, 'Duha'],
  [/\bالوتر\b/g, 'Witr'],

  // Quran
  [/المصحف الشريف/g, 'Holy Quran'],
  [/المصحف/g, 'Holy Quran'],
  [/القرآن الكريم/g, 'The Holy Quran'],
  [/القرآن/g, 'Quran'],
  [/الختمة القرآنية/g, 'Quran Khatmah'],
  [/متابعة الختمة/g, 'Continue Khatmah'],
  [/متابعة القراءة/g, 'Continue Reading'],
  [/الفواصل المحفوظة/g, 'Saved Bookmarks'],
  [/التفسير الميسر/g, 'Simplified Tafsir'],
  [/آية اليوم والتدبر/g, 'Daily Verse & Reflection'],
  [/نفحة قرآنية يومية مع التفسير/g, 'Daily Quranic Verse & Tafsir'],
  [/نفحة قرآنية/g, 'Quranic Reflection'],
  [/البحث في السور/g, 'Search Surahs'],
  [/بحث في الآيات/g, 'Search Verses'],
  [/سورة الفاتحة/g, 'Surah Al-Faatiha'],
  [/سورة البقرة/g, 'Surah Al-Baqara'],
  [/سورة آل عمران/g, 'Surah Aal-i-Imraan'],
  [/سورة الكهف/g, 'Surah Al-Kahf'],
  [/سورة يس/g, 'Surah Yaseen'],
  [/سورة الملك/g, 'Surah Al-Mulk'],
  [/سورة الرحمن/g, 'Surah Ar-Rahmaan'],
  [/سورة الإخلاص/g, 'Surah Al-Ikhlaas'],
  [/سورة الفلق/g, 'Surah Al-Falaq'],
  [/سورة الناس/g, 'Surah An-Naas'],

  // Adhkar & Fortress
  [/أذكار الصباح والمساء/g, 'Morning & Evening Adhkar'],
  [/أذكار الصباح/g, 'Morning Adhkar'],
  [/أذكار المساء/g, 'Evening Adhkar'],
  [/أذكار بعد الصلاة/g, 'After Prayer Adhkar'],
  [/أذكار النوم/g, 'Sleep Adhkar'],
  [/أذكار الاستيقاظ/g, 'Waking Up Adhkar'],
  [/أسماء الله الحسنى/g, '99 Names of Allah'],
  [/المسبحة الإلكترونية/g, 'Digital Tasbih'],
  [/المسبحة/g, 'Tasbih'],
  [/التكرار المتبقي/g, 'Remaining'],
  [/اكتمل الذكر/g, 'Dhikr Completed'],
  [/استمع للأذكار/g, 'Listen to Adhkar'],

  // Unique Athar Features
  [/شجرة الأثر التفاعلية/g, 'Interactive Impact Tree'],
  [/شجرة الأثر/g, 'Impact Tree'],
  [/حاسبة الزكاة والصدقات/g, 'Zakat & Charity Calculator'],
  [/حاسبة الزكاة/g, 'Zakat Calculator'],
  [/واحة السكينة والحقوق/g, 'Sakina Oasis & Rights'],
  [/واحة السكينة/g, 'Sakina Oasis'],
  [/نبض أثر المحلي/g, 'Local Athar Pulse'],
  [/الورد اليومي/g, 'Daily Wird'],
  [/تتبع الصيام/g, 'Fasting Tracker'],
  [/صيام الأيام البيض/g, 'White Days Fasting'],
  [/المساعد الصوتي/g, 'Voice Assistant'],
  [/سجل الأوسمة والإنجازات/g, 'Badges & Achievements'],
  [/سجل الأوسمة/g, 'Badges Log'],
  [/الإصدار الملكي/g, 'Royal Edition'],
  [/النشاط المباشر/g, 'Live Activity'],
  [/الجزيرة التفاعلية/g, 'Dynamic Island'],
  [/مركز التذكيرات/g, 'Reminders Center'],
  [/المكتبة الإسلامية/g, 'Islamic Library'],
  [/فتاوى وأحكام/g, 'Fatwas & Rulings'],
  [/مقالات وتدبر/g, 'Articles & Reflections'],
  [/قصص وعِبر/g, 'Stories & Wisdom'],
  [/قصص الأنبياء/g, 'Stories of the Prophets'],
  [/مواقف الصحابة/g, 'Companions of Prophet'],

  // UI Actions & Words
  [/آخر موضع استماع للقرآن والأذكار:/g, 'Last Recitation Audio Position:'],
  [/آخر موضع استماع للقرآن/g, 'Last Quran Audio Position'],
  [/آخر موضع استماع للأذكار/g, 'Last Adhkar Audio Position'],
  [/تصدير نسخة احتياطية/g, 'Export Backup'],
  [/استعادة نسخة محفوظة/g, 'Restore Backup'],
  [/مسح جميع البيانات/g, 'Clear All Data'],
  [/النسخ الاحتياطي وإدارة البيانات/g, 'Backup & Data Management'],
  [/النسخ والأذونات/g, 'Backup & Permissions'],
  [/الصوت والهمم/g, 'Voice & Accessibility'],
  [/لغة التطبيق \(Language\)/g, 'App Language'],
  [/لغة التطبيق/g, 'App Language'],
  [/مشاركة البطاقة/g, 'Share Card'],
  [/مشاركة الحديث/g, 'Share Hadith'],
  [/حديث شريف/g, 'Prophetic Hadith'],
  [/سلسلة الالتزام/g, 'Prayer Streak'],
  [/يوم متواصل/g, 'Days Streak'],
  [/أيام متواصلة/g, 'Consecutive Days'],
  [/الوصول السريع/g, 'Quick Access'],
  [/إعادة ضبط/g, 'Reset'],
  [/استئناف/g, 'Resume'],
  [/تشغيل/g, 'Play'],
  [/إيقاف/g, 'Pause'],
  [/استماع/g, 'Listen'],
  [/تلاوة/g, 'Recitation'],
  [/تفسير/g, 'Tafsir'],
  [/مكية/g, 'Meccan'],
  [/مدنية/g, 'Medinan'],
  [/آياتها/g, 'Verses'],
  [/آيات/g, 'Verses'],
  [/آية/g, 'Ayah'],
  [/الآية/g, 'Ayah'],
  [/سورة/g, 'Surah'],
  [/الجزء/g, 'Juz'],
  [/الحزب/g, 'Hizb'],
  [/الصفحة/g, 'Page'],
  [/القارئ:/g, 'Reciter:'],
  [/القارئ/g, 'Reciter'],
  [/إلغاء/g, 'Cancel'],
  [/تأكيد/g, 'Confirm'],
  [/حفظ التغييرات/g, 'Save Changes'],
  [/حفظ/g, 'Save'],
  [/إغلاق/g, 'Close'],
  [/تم بنجاح/g, 'Successful ✓'],
  [/تمت الإضافة/g, 'Added ✓'],
  [/نعم/g, 'Yes'],
  [/لا/g, 'No'],
  [/درجة/g, 'degrees'],
  [/كم/g, 'km'],
  [/ساعة/g, 'hour'],
  [/ساعات/g, 'hours'],
  [/دقيقة/g, 'min'],
  [/دقائق/g, 'mins'],
  [/ثانية/g, 'sec'],
  [/ثواني/g, 'secs'],
  [/بعد /g, 'In '],
  [/متبقي /g, 'Remaining '],
  [/مضت /g, 'Passed '],
  [/الكل/g, 'All'],
  [/الرئيسية/g, 'Home'],
  [/الصلاة/g, 'Prayers'],
  [/الصلوات/g, 'Prayers'],
  [/القبلة/g, 'Qibla'],
  [/الأذكار/g, 'Adhkar'],
  [/القصص/g, 'Stories'],
  [/استكشف/g, 'Explore'],
  [/الإعدادات/g, 'Settings'],
  [/التذكيرات/g, 'Reminders'],
  [/مسار الهداية/g, 'Guidance Journey'],
  [/رفيق أثر/g, 'Athar Companion'],
  [/أثر/g, 'Athar'],
];

class I18nManager {
  private currentLanguage: AppLanguage = 'ar';
  private observer: MutationObserver | null = null;
  private isTranslatingDom: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    this.currentLanguage = 'ar';
    this.applyDomAttributes('ar');
  }

  public getLanguage(): AppLanguage {
    return 'ar';
  }

  public isEn(): boolean {
    return false;
  }

  public setLanguage(_lang: AppLanguage) {
    this.currentLanguage = 'ar';
    this.applyDomAttributes('ar');

    try {
      const s = StorageService.getSettings();
      s.language = 'ar';
      StorageService.saveSettings(s);
    } catch {}

    listeners.forEach((cb) => {
      try {
        cb('ar');
      } catch {}
    });
  }

  public applyDomAttributes(_lang: AppLanguage = 'ar') {
    if (typeof document === 'undefined') return;

    const html = document.documentElement;
    html.setAttribute('lang', 'ar');
    html.setAttribute('dir', 'rtl');
    document.title = 'أثر | ATHAR - رفيقك اليومي للقرآن والصلاة والذكر';
    this.restoreDomSubtree(document.body);
    this.stopDomObserver();
  }

  private startDomObserver() {
    if (this.observer || typeof MutationObserver === 'undefined') return;

    this.observer = new MutationObserver((mutations) => {
      if (this.currentLanguage !== 'en' || this.isTranslatingDom) return;

      for (const mut of mutations) {
        if (mut.type === 'childList') {
          mut.addedNodes.forEach((node) => {
            this.translateSubtree(node);
          });
        } else if (mut.type === 'characterData') {
          const target = mut.target;
          if (target.nodeType === Node.TEXT_NODE) {
            this.translateSingleTextNode(target as Text);
          }
        }
      }
    });

    try {
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    } catch {}
  }

  private stopDomObserver() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  public translateSubtree(root: Node | null) {
    if (!root || this.currentLanguage !== 'en') return;

    this.isTranslatingDom = true;
    try {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_ACCEPT;
          const tag = parent.tagName.toLowerCase();
          // Never translate scripts, styles, raw code, or sacred Arabic Quran text elements
          if (
            tag === 'script' ||
            tag === 'style' ||
            tag === 'code' ||
            tag === 'pre' ||
            parent.classList.contains('font-quran') ||
            parent.classList.contains('quran-text')
          ) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      });

      let current = walker.nextNode();
      while (current) {
        this.translateSingleTextNode(current as Text);
        current = walker.nextNode();
      }
    } finally {
      this.isTranslatingDom = false;
    }
  }

  private translateSingleTextNode(node: Text) {
    const raw = node.nodeValue;
    if (!raw || !raw.trim()) return;

    // Save original Arabic if not yet stored
    if (!(node as any).__origArText) {
      (node as any).__origArText = raw;
    }

    // Only translate if contains Arabic characters
    if (/[\u0600-\u06FF]/.test(raw)) {
      let replaced = raw;
      for (const [regex, replacement] of ARABIC_TO_ENGLISH_PHRASES) {
        regex.lastIndex = 0;
        if (regex.test(replaced)) {
          replaced = replaced.replace(regex, replacement);
        }
      }
      if (replaced !== raw) {
        node.nodeValue = replaced;
      }
    }
  }

  public restoreDomSubtree(root: Node | null) {
    if (!root) return;

    this.isTranslatingDom = true;
    try {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let current = walker.nextNode();
      while (current) {
        const orig = (current as any).__origArText;
        if (orig !== undefined && current.nodeValue !== orig) {
          current.nodeValue = orig;
        }
        current = walker.nextNode();
      }
    } finally {
      this.isTranslatingDom = false;
    }
  }

  public t(key: TranslationKey): string {
    const dict = TRANSLATIONS[this.currentLanguage] || TRANSLATIONS.ar;
    return (dict as any)[key] || (TRANSLATIONS.ar as any)[key] || key;
  }

  public tPrayer(idOrArabic: string): string {
    const isEn = this.isEn();
    const map: Record<string, { ar: string; en: string }> = {
      fajr: { ar: 'الفجر', en: 'Fajr' },
      sunrise: { ar: 'الشروق', en: 'Sunrise' },
      dhuhr: { ar: 'الظهر', en: 'Dhuhr' },
      asr: { ar: 'العصر', en: 'Asr' },
      maghrib: { ar: 'المغرب', en: 'Maghrib' },
      isha: { ar: 'العشاء', en: 'Isha' },
      'الفجر': { ar: 'الفجر', en: 'Fajr' },
      'الشروق': { ar: 'الشروق', en: 'Sunrise' },
      'الظهر': { ar: 'الظهر', en: 'Dhuhr' },
      'العصر': { ar: 'العصر', en: 'Asr' },
      'المغرب': { ar: 'المغرب', en: 'Maghrib' },
      'العشاء': { ar: 'العشاء', en: 'Isha' },
      duha: { ar: 'الضحى', en: 'Duha' },
      'الضحى': { ar: 'الضحى', en: 'Duha' },
      qiyam: { ar: 'قيام الليل', en: 'Qiyam Al-Layl' },
      'قيام الليل': { ar: 'قيام الليل', en: 'Qiyam Al-Layl' },
    };

    const match = map[idOrArabic.toLowerCase()] || map[idOrArabic];
    if (match) {
      return isEn ? match.en : match.ar;
    }
    return idOrArabic;
  }

  public tSurahName(surahNumber: number, fallbackArabic?: string): string {
    const meta = ALL_SURAHS.find((s) => s.number === surahNumber);
    if (!meta) return fallbackArabic || String(surahNumber);
    return this.isEn() ? meta.englishName : meta.name;
  }

  public subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }
}

export const i18n = new I18nManager();

/**
 * Custom React Hook for reactive translations
 */
export function useTranslation() {
  const [lang, setLang] = useState<AppLanguage>(() => i18n.getLanguage());

  useEffect(() => {
    const unsubscribe = i18n.subscribe((newLang) => {
      setLang(newLang);
    });
    return unsubscribe;
  }, []);

  return {
    lang: 'ar' as AppLanguage,
    isEn: false,
    isRTL: true,
    setLanguage: (l: AppLanguage) => i18n.setLanguage(l),
    t: (key: TranslationKey) => i18n.t(key),
    tPrayer: (idOrArabic: string) => i18n.tPrayer(idOrArabic),
    tSurahName: (surahNumber: number, fallbackArabic?: string) =>
      i18n.tSurahName(surahNumber, fallbackArabic),
  };
}
