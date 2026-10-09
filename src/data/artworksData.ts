import { IslamicArtwork } from '../types';

export const ISLAMIC_ARTWORKS: IslamicArtwork[] = [
  {
    id: "girih_islamic_tessellation",
    titleArabic: "الزخرفة الهندسية الإسلامية المتناغمة",
    descriptionArabic: "نقش هندسي إسلامي كلاسيكي متناغم يرمز إلى التوحيد والنظام الكوني الراقي",
    type: "geometric",
    svgPattern: `
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="pattern_girih" width="120" height="120" patternUnits="userSpaceOnUse">
            <path d="M60 0 L78 42 L120 60 L78 78 L60 120 L42 78 L0 60 L42 42 Z" fill="none" stroke="#D4AF37" stroke-width="1.2" opacity="0.8" />
            <circle cx="60" cy="60" r="16" fill="none" stroke="#E5C158" stroke-width="1" opacity="0.6" />
            <circle cx="60" cy="60" r="48" fill="none" stroke="#D4AF37" stroke-width="0.8" stroke-dasharray="4 4" opacity="0.4" />
            <path d="M0 0 L30 30 M120 0 L90 30 M0 120 L30 90 M120 120 L90 90" stroke="#D4AF37" stroke-width="0.9" opacity="0.5" />
            <path d="M60 20 L100 60 L60 100 L20 60 Z" fill="none" stroke="#997A15" stroke-width="0.8" opacity="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pattern_girih)" />
      </svg>
    `
  },
  {
    id: "mosque_nocturnal_dome",
    titleArabic: "سكينة مآذن الحرم والقباب",
    descriptionArabic: "أفق معالم المساجد الإسلامية مع القباب والمآذن الشامخة تحت سماء الليل الهادئة",
    type: "mosque",
    svgPattern: `
      <svg width="100%" height="100%" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="sky_glow" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stop-color="#D4AF37" stop-opacity="0.25" />
            <stop offset="60%" stop-color="#1E293B" stop-opacity="0.05" />
            <stop offset="100%" stop-color="#0B0F12" stop-opacity="0" />
          </radialGradient>
        </defs>
        <circle cx="400" cy="300" r="280" fill="url(#sky_glow)" />
        <!-- Pure Crescent Moon without stars -->
        <path d="M400 180 A 45 45 0 1 0 435 250 A 35 35 0 1 1 400 180 Z" fill="#E5C158" opacity="0.75" />
        <!-- Dome Silhouette & Minarets -->
        <g stroke="#D4AF37" stroke-width="1.5" fill="none" opacity="0.75">
          <!-- Central Dome Arch -->
          <path d="M260 700 C260 480 540 480 540 700" />
          <path d="M400 440 L400 480 M390 450 L410 450" />
          <!-- Left Minaret -->
          <line x1="160" y1="700" x2="160" y2="340" />
          <line x1="190" y1="700" x2="190" y2="340" />
          <path d="M150 340 L200 340 L175 290 Z" />
          <circle cx="175" cy="285" r="4" fill="#D4AF37" />
          <!-- Right Minaret -->
          <line x1="610" y1="700" x2="610" y2="340" />
          <line x1="640" y1="700" x2="640" y2="340" />
          <path d="M600 340 L650 340 L625 290 Z" />
          <circle cx="625" cy="285" r="4" fill="#D4AF37" />
          <!-- Islamic Arches Row -->
          <path d="M290 690 C290 640 330 640 330 690 M350 690 C350 640 390 640 390 690 M410 690 C410 640 450 640 450 690 M470 690 C470 640 510 640 510 690" stroke-width="1" />
        </g>
      </svg>
    `
  },
  {
    id: "andalusian_arabesque_arch",
    titleArabic: "القوس الأندلسي والأرابيسك",
    descriptionArabic: "محراب أندلسي بنقوش الأرابيسك المورقة المستوحاة من قصر الحمراء وجامع قرطبة",
    type: "arabesque",
    svgPattern: `
      <svg width="100%" height="100%" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="arch_leaves" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M40 0 C55 20 65 35 40 60 C15 35 25 20 40 0 Z" fill="none" stroke="#D4AF37" stroke-width="0.9" opacity="0.6" />
            <circle cx="40" cy="65" r="3" fill="#D4AF37" opacity="0.5" />
          </pattern>
        </defs>
        <!-- Horseshoe Arch Outline -->
        <g stroke="#D4AF37" stroke-width="2" fill="none" opacity="0.8" transform="translate(100, 50)">
          <path d="M50 480 L50 250 C50 120 140 60 200 60 C260 60 350 120 350 250 L350 480" />
          <path d="M70 480 L70 250 C70 140 150 90 200 90 C250 90 330 140 330 250 L330 480" stroke-dasharray="6 4" stroke-width="1.2" />
          <path d="M90 480 L90 250 C90 160 160 120 200 120 C240 120 310 160 310 250 L310 480" stroke-width="0.8" opacity="0.6" />
          <!-- Arabesque Medallion -->
          <circle cx="200" cy="240" r="32" stroke-width="1" opacity="0.7" />
          <circle cx="200" cy="240" r="16" fill="#D4AF37" opacity="0.35" />
        </g>
      </svg>
    `
  },
  {
    id: "twelve_pointed_islamic_geometry",
    titleArabic: "الزخرفة الاثناعشرية والقبّة الهندسية",
    descriptionArabic: "هندسة إسلامية متقدمة من 12 ضلعاً تشع إشراقاً وروحانية هادئة",
    type: "geometric",
    svgPattern: `
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="pattern_12geo" width="160" height="160" patternUnits="userSpaceOnUse">
            <g transform="translate(80, 80)" stroke="#D4AF37" fill="none" opacity="0.75" stroke-width="1">
              <!-- Nested rotating squares -->
              <rect x="-45" y="-45" width="90" height="90" rx="3" stroke-width="0.9" />
              <rect x="-45" y="-45" width="90" height="90" rx="3" transform="rotate(30)" stroke-width="0.9" />
              <rect x="-45" y="-45" width="90" height="90" rx="3" transform="rotate(60)" stroke-width="0.9" />
              <circle cx="0" cy="0" r="54" stroke-width="0.7" stroke-dasharray="3 3" opacity="0.5" />
              <circle cx="0" cy="0" r="22" stroke-width="1.2" opacity="0.7" />
              <circle cx="0" cy="0" r="5" fill="#D4AF37" opacity="0.5" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pattern_12geo)" />
      </svg>
    `
  },
  {
    id: "night_celestial_crescent",
    titleArabic: "الهلال والسماء الروحية الهادئة",
    descriptionArabic: "مشهد ليلي هادئ مستوحى من سماء الصحراء وسكينة الليل الروحانية",
    type: "nocturnal",
    svgPattern: `
      <svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="moon_glow" cx="70%" cy="25%" r="40%">
            <stop offset="0%" stop-color="#FFF0CA" stop-opacity="0.3" />
            <stop offset="40%" stop-color="#D4AF37" stop-opacity="0.1" />
            <stop offset="100%" stop-color="#0B0F12" stop-opacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="none" />
        <circle cx="700" cy="250" r="240" fill="url(#moon_glow)" />
        <!-- Elegant Slim Crescent without any stars -->
        <path d="M720 180 A 70 70 0 1 0 760 290 A 60 60 0 1 1 720 180 Z" fill="#E5C158" opacity="0.85" />
      </svg>
    `
  }
];
