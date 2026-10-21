import React from 'react';
import { Camera } from 'lucide-react';

/* =========================================================================
   1. ISLAMIC ARCH BACKGROUND COMPONENT
   Pushed completely to the top edge (top: 0), framing header, logo & avatar
   with zero black gap and seamless bottom fade into #080807
   ========================================================================= */
export const IslamicArchHeaderBackground: React.FC = () => {
  return (
    <div className="absolute top-0 inset-x-0 h-[440px] pointer-events-none overflow-hidden select-none z-0">
      <svg
        viewBox="0 0 500 440"
        preserveAspectRatio="none"
        className="w-full h-full"
        aria-hidden="true"
      >
        <defs>
          {/* Metallic Gold Gradients */}
          <linearGradient id="archGoldStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#916E25" stopOpacity="0.5" />
            <stop offset="25%" stopColor="#FFE6A0" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#D9AE48" stopOpacity="1" />
            <stop offset="75%" stopColor="#FFE6A0" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#916E25" stopOpacity="0.5" />
          </linearGradient>

          <linearGradient id="archOuterStroke" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#D9AE48" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#D9AE48" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#080807" stopOpacity="0" />
          </linearGradient>

          {/* Apex Radial Light Burst */}
          <radialGradient id="apexGlow" cx="50%" cy="3%" r="48%">
            <stop offset="0%" stopColor="#FFE6A0" stopOpacity="0.38" />
            <stop offset="35%" stopColor="#D9AE48" stopOpacity="0.16" />
            <stop offset="75%" stopColor="#080807" stopOpacity="0" />
          </radialGradient>

          {/* Avatar Center Halo Glow */}
          <radialGradient id="avatarAuraGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#D9AE48" stopOpacity="0.35" />
            <stop offset="45%" stopColor="#D9AE48" stopOpacity="0.1" />
            <stop offset="85%" stopColor="#080807" stopOpacity="0" />
          </radialGradient>

          {/* Delicate Islamic Geometric Arabesque Pattern for Arch Spandrels */}
          <pattern id="islamicArabesquePattern" width="36" height="36" patternUnits="userSpaceOnUse">
            <path
              d="M 18 0 L 23.5 12.5 L 36 18 L 23.5 23.5 L 18 36 L 12.5 23.5 L 0 18 L 12.5 12.5 Z"
              fill="none"
              stroke="#D9AE48"
              strokeWidth="0.65"
              strokeOpacity="0.14"
            />
            <circle cx="18" cy="18" r="3.5" fill="none" stroke="#D9AE48" strokeWidth="0.5" strokeOpacity="0.12" />
          </pattern>

          {/* Soft Filter Glow for Arch Apex */}
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="glow" />
            <feComposite in="SourceGraphic" in2="glow" operator="over" />
          </filter>
        </defs>

        {/* 1. Base Canvas #080807 */}
        <rect width="500" height="440" fill="#080807" />

        {/* 2. Delicate Arabesque Wallpaper in Spandrel Area - Top corners */}
        <rect width="500" height="360" fill="url(#islamicArabesquePattern)" opacity="0.95" />

        {/* 3. Golden Apex Ambient Illumination */}
        <rect width="500" height="320" fill="url(#apexGlow)" />

        {/* 4. Multi-Cusped Islamic Pointed Arch Cavity Fill */}
        <path
          d="M 36 440
             L 36 240
             C 36 185, 76 155, 106 135
             C 136 115, 152 95, 172 75
             C 192 55, 214 38, 250 14
             C 286 38, 308 55, 328 75
             C 348 95, 364 115, 394 135
             C 424 155, 464 185, 464 240
             L 464 440
             Z"
          fill="#080807"
          fillOpacity="0.8"
        />

        {/* Outer Fine Arch Contour Stroke */}
        <path
          d="M 28 440
             L 28 235
             C 28 178, 70 148, 100 128
             C 130 108, 148 88, 168 68
             C 188 48, 210 30, 250 8
             C 290 30, 312 48, 332 68
             C 352 88, 370 108, 400 128
             C 430 148, 472 178, 472 235
             L 472 440"
          fill="none"
          stroke="url(#archOuterStroke)"
          strokeWidth="1.2"
        />

        {/* Primary Multi-Cusped Gold Illuminated Arch Stroke */}
        <path
          d="M 36 440
             L 36 240
             C 36 185, 76 155, 106 135
             C 136 115, 152 95, 172 75
             C 192 55, 214 38, 250 14
             C 286 38, 308 55, 328 75
             C 348 95, 364 115, 394 135
             C 424 155, 464 185, 464 240
             L 464 440"
          fill="none"
          stroke="url(#archGoldStroke)"
          strokeWidth="2.2"
          filter="url(#softGlow)"
        />

        {/* Inner Accent Line */}
        <path
          d="M 44 440
             L 44 245
             C 44 192, 82 162, 112 142
             C 142 122, 158 102, 178 82
             C 198 62, 218 46, 250 20
             C 282 46, 302 62, 322 82
             C 342 102, 358 122, 388 142
             C 418 162, 456 192, 456 245
             L 456 440"
          fill="none"
          stroke="#D9AE48"
          strokeWidth="0.8"
          strokeOpacity="0.45"
        />

        {/* Apex Star Finial Accent */}
        <g transform="translate(250, 14)">
          <circle cx="0" cy="0" r="4.5" fill="#FFE6A0" filter="url(#softGlow)" />
          <circle cx="0" cy="0" r="2" fill="#FFFFFF" />
        </g>

        {/* Warm Golden Halo directly behind the avatar (avatar centered at x=250, y=180) */}
        <circle cx="250" cy="180" r="105" fill="url(#avatarAuraGlow)" />
      </svg>

      {/* Seamless bottom transition gradient into #080807 */}
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent via-[#080807]/80 to-[#080807]" />
    </div>
  );
};

/* =========================================================================
   2. UNIFIED METALLIC AVATAR COMPONENT
   Clean, centered, premium metallic gold glowing gradient matching the mockup,
   with no visual artifacts or disjointed layers.
   ========================================================================= */
export function isLegitUserPhoto(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length < 15) return false;
  if (trimmed.startsWith('preset:')) return false;

  // Filter out any accidentally captured full-screen dumps or applet screenshots
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('screenshot') ||
    lower.includes('preview') ||
    lower.includes('com.athar') ||
    lower.includes('screen_') ||
    lower.includes('applet') ||
    lower.includes('chrome')
  ) {
    return false;
  }

  // Reject oversized data URLs that are full desktop/mobile screen captures (> 50KB base64)
  if (trimmed.startsWith('data:image/') && trimmed.length > 60000) {
    return false;
  }

  return (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:')
  );
}

interface UnifiedAvatarProps {
  photoURL?: string | null;
  displayName: string;
  onEditPhoto?: () => void;
  size?: number; // default 106px
}

export const UnifiedAvatar: React.FC<UnifiedAvatarProps> = ({
  photoURL,
  displayName,
  onEditPhoto,
  size = 106,
}) => {
  const hasPhoto = isLegitUserPhoto(photoURL);

  return (
    <div
      className="relative inline-block select-none"
      style={{ width: size, height: size }}
    >
      {/* Outer Golden Ambient Glow */}
      <div
        className="absolute inset-0 rounded-full blur-xl scale-125 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(217, 174, 72, 0.45) 0%, rgba(217, 174, 72, 0.1) 50%, transparent 72%)',
        }}
      />

      {/* Dimensional Metallic Gold Circular Frame Container */}
      <div
        onClick={onEditPhoto}
        className="relative w-full h-full rounded-full p-[2.5px] bg-gradient-to-tr from-[#916E25] via-[#FFE6A0] to-[#D9AE48] shadow-[0_0_24px_rgba(217,174,72,0.4)] flex items-center justify-center cursor-pointer group transition-transform active:scale-95"
      >
        {/* Inner Dark Cavity */}
        <div className="w-full h-full rounded-full overflow-hidden bg-[#14120B] border border-[#2A2213] relative flex items-center justify-center shadow-inner">
          {hasPhoto ? (
            <img
              src={photoURL || ''}
              alt={displayName}
              className="w-full h-full object-cover object-center aspect-square"
            />
          ) : (
            /* Noble Dark Silhouette with Warm Golden Rim Lighting */
            <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
              <defs>
                <radialGradient id="avatarSilhouetteFill" cx="50%" cy="32%" r="65%">
                  <stop offset="0%" stopColor="#2A2215" />
                  <stop offset="60%" stopColor="#16130E" />
                  <stop offset="100%" stopColor="#0E0C08" />
                </radialGradient>
                <linearGradient id="avatarRimGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFE6A0" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#D9AE48" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#916E25" stopOpacity="0.2" />
                </linearGradient>
              </defs>

              <rect width="100" height="100" fill="#12100C" />

              {/* Head Silhouette */}
              <circle
                cx="50"
                cy="36"
                r="16.5"
                fill="url(#avatarSilhouetteFill)"
                stroke="url(#avatarRimGold)"
                strokeWidth="0.9"
              />

              {/* Shoulders & Torso Silhouette */}
              <path
                d="M 20 92 C 20 66, 32 56, 50 56 C 68 56, 80 66, 80 92 Z"
                fill="url(#avatarSilhouetteFill)"
                stroke="url(#avatarRimGold)"
                strokeWidth="0.9"
              />
            </svg>
          )}
        </div>

        {/* Floating Metallic Camera Action Button at 4:30 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onEditPhoto) onEditPhoto();
          }}
          className="absolute bottom-0.5 right-0.5 w-6 h-6 rounded-full bg-gradient-to-tr from-[#916E25] via-[#FFE6A0] to-[#D9AE48] text-[#080807] flex items-center justify-center border-2 border-[#080807] shadow-lg hover:scale-110 active:scale-90 transition-transform cursor-pointer z-10"
          aria-label="تغيير الصورة الشخصية"
          title="تعديل الصورة الشخصية"
        >
          <Camera size={12} strokeWidth={2.5} className="text-[#080807]" />
        </button>
      </div>
    </div>
  );
};

/* =========================================================================
   3. UNIFIED METALLIC MEDALLIONS ("ستمبة واحدة")
   Standardized 38px x 38px circular medallions for all activity cards & stats
   ========================================================================= */
interface UnifiedMedallionProps {
  iconType: 'quran' | 'sadaqah' | 'adhkar' | 'prayer' | 'streak_flame';
  size?: number; // default 38px
  className?: string;
}

export const UnifiedMedallion: React.FC<UnifiedMedallionProps> = ({
  iconType,
  size = 38,
  className = '',
}) => {
  return (
    <div
      className={`relative rounded-full p-[1.5px] bg-gradient-to-tr from-[#916E25] via-[#FFE6A0] to-[#D9AE48] shadow-[0_2px_10px_rgba(217,174,72,0.3)] shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <div className="w-full h-full rounded-full bg-gradient-to-b from-[#1C170E] to-[#120F09] flex items-center justify-center text-[#FFE6A0] shadow-inner">
        {iconType === 'quran' && (
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-[#FFE6A0] stroke-[1.8]">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        )}

        {iconType === 'sadaqah' && (
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#D9AE48]/45 stroke-[#FFE6A0] stroke-[1.8]">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        )}

        {iconType === 'prayer' && (
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#D9AE48]/35 stroke-[#FFE6A0] stroke-[1.6]">
            {/* Mosque Silhouette with Dome and Arch */}
            <path d="M12 3c-2.8 2.5-4 5.5-4 8.5v7.5h8V11.5c0-3-1.2-6-4-8.5z" />
            <path d="M10 19v-4.5h4V19" />
            <circle cx="12" cy="2" r="0.8" fill="#FFE6A0" />
            <path d="M4 11h2v8H4z" />
            <path d="M18 11h2v8h-2z" />
          </svg>
        )}

        {iconType === 'adhkar' && (
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-[#FFE6A0] stroke-[1.8]">
            <circle cx="12" cy="12" r="7" strokeDasharray="3 3" />
            <circle cx="12" cy="5" r="1.5" fill="#D9AE48" />
            <circle cx="12" cy="19" r="1.2" fill="#D9AE48" />
            <path d="M12 19v3" />
            <path d="M10 22h4" />
          </svg>
        )}

        {iconType === 'streak_flame' && (
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#D9AE48] stroke-[#FFE6A0] stroke-[1.5]">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </svg>
        )}
      </div>
    </div>
  );
};

/* =========================================================================
   4. METALLIC 3D LEVEL ROSETTE & XP STAR EMBLEMS ("ستمبة واحدة")
   For Level & XP Card and Level Progress
   ========================================================================= */
export const MetallicLevelRosette: React.FC<{ size?: number; level?: number }> = ({
  size = 38,
}) => {
  return (
    <div
      className="relative shrink-0 select-none"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 50 50" className="w-full h-full drop-shadow-[0_2px_8px_rgba(217,174,72,0.4)]">
        <defs>
          <linearGradient id="rosetteGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE6A0" />
            <stop offset="35%" stopColor="#D9AE48" />
            <stop offset="70%" stopColor="#916E25" />
            <stop offset="100%" stopColor="#D9AE48" />
          </linearGradient>
          <linearGradient id="starGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="40%" stopColor="#FFE6A0" />
            <stop offset="100%" stopColor="#D9AE48" />
          </linearGradient>
        </defs>

        {/* 12-Lobed Scalloped Medal Rosette */}
        <circle cx="25" cy="25" r="23" fill="url(#rosetteGoldGrad)" />
        <circle cx="25" cy="25" r="21" fill="#1C170E" stroke="#FFE6A0" strokeWidth="0.8" />
        <circle cx="25" cy="25" r="17" fill="url(#rosetteGoldGrad)" opacity="0.35" />
        <circle cx="25" cy="25" r="15" fill="#16130B" stroke="#D9AE48" strokeWidth="0.75" />

        {/* Embossed 5-pointed star */}
        <polygon
          points="25,12 28.5,19.5 36.5,20.5 30.5,26 32,34 25,30 18,34 19.5,26 13.5,20.5 21.5,19.5"
          fill="url(#starGoldGrad)"
          stroke="#916E25"
          strokeWidth="0.5"
        />
      </svg>
    </div>
  );
};

export const MetallicXpStarBadge: React.FC<{ size?: number }> = ({ size = 36 }) => {
  return (
    <div
      className="relative shrink-0 select-none"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 50 50" className="w-full h-full drop-shadow-[0_2px_8px_rgba(217,174,72,0.4)]">
        <defs>
          <linearGradient id="xpStarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE6A0" />
            <stop offset="45%" stopColor="#D9AE48" />
            <stop offset="100%" stopColor="#8A671F" />
          </linearGradient>
        </defs>

        {/* 5-pointed Dimensional Star */}
        <polygon
          points="25,3 31.5,17 46.5,18.5 35,28.5 38.5,43 25,35 11.5,43 15,28.5 3.5,18.5 18.5,17"
          fill="url(#xpStarGrad)"
          stroke="#FFE6A0"
          strokeWidth="0.8"
        />

        {/* Inner Facet Lines */}
        <polygon
          points="25,8 29.5,18.5 40.5,19.5 32,27 34.5,38 25,32 15.5,38 18,27 9.5,19.5 20.5,18.5"
          fill="#1C170E"
          opacity="0.25"
        />

        {/* XP Lettering in Center */}
        <text
          x="25"
          y="29"
          textAnchor="middle"
          fill="#1A150A"
          fontSize="11"
          fontWeight="900"
          fontFamily="ui-monospace, monospace"
        >
          XP
        </text>
        <text
          x="25"
          y="28"
          textAnchor="middle"
          fill="#FFF3CC"
          fontSize="11"
          fontWeight="900"
          fontFamily="ui-monospace, monospace"
        >
          XP
        </text>
      </svg>
    </div>
  );
};

/* =========================================================================
   5. UNIFIED REUSABLE MEDAL GRAPHIC COMPONENT
   Clean, centered, premium metallic gold glowing rosette medal
   Supports both unlocked and locked medals with zero raster artifacts.
   ========================================================================= */
export interface UnifiedMedalGraphicProps {
  isUnlocked: boolean;
  medalIcon?: 'star' | 'flame' | 'quran' | 'charity' | 'tasbih' | 'mosque' | 'general';
  size?: number; // default 56px
  className?: string;
}

export const UnifiedMedalGraphic: React.FC<UnifiedMedalGraphicProps> = ({
  isUnlocked,
  medalIcon = 'star',
  size = 56,
  className = '',
}) => {
  return (
    <div
      className={`relative shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {isUnlocked ? (
        <>
          {/* Ambient Gold Aura */}
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,_rgba(217,174,72,0.4)_0%,_transparent_72%)] blur-md scale-110 pointer-events-none" />

          {/* Dimensional Gold Rosette Medal */}
          <svg viewBox="0 0 60 60" className="w-full h-full drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)]">
            <defs>
              <linearGradient id={`achGoldGrad_${medalIcon}_${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFE6A0" />
                <stop offset="35%" stopColor="#D9AE48" />
                <stop offset="70%" stopColor="#916E25" />
                <stop offset="100%" stopColor="#E2BD5A" />
              </linearGradient>
            </defs>

            {/* Scalloped Ribbon Rim */}
            <circle cx="30" cy="30" r="28" fill={`url(#achGoldGrad_${medalIcon}_${size})`} />
            <circle cx="30" cy="30" r="25" fill="#1C170E" stroke="#FFE6A0" strokeWidth="1" />
            <circle cx="30" cy="30" r="21" fill={`url(#achGoldGrad_${medalIcon}_${size})`} opacity="0.3" />
            <circle cx="30" cy="30" r="18" fill="#15120B" stroke="#D9AE48" strokeWidth="0.8" />

            {/* Center Embossed Icon */}
            {(medalIcon === 'star' || medalIcon === 'general') && (
              <polygon
                points="30,16 34,24 43,25 36.5,31 38.5,40 30,35.5 21.5,40 23.5,31 17,25 26,24"
                fill="#FFE6A0"
                stroke="#916E25"
                strokeWidth="0.6"
              />
            )}

            {medalIcon === 'flame' && (
              <path
                d="M27 34 A3 3 0 0 0 30 31 c0-1.6-.6-2.4-1.2-3.6-1.3-2.6-.3-4.8 2.4-7.2.6 3 2.4 5.9 4.8 7.8 2.4 1.9 3.6 4.2 3.6 6.6 a8.4 8.4 0 1 1-16.8 0 c0-1.4.5-2.8 1.2-3.6 a3 3 0 0 0 3 3 z"
                fill="#FFE6A0"
                stroke="#916E25"
                strokeWidth="0.6"
              />
            )}

            {medalIcon === 'quran' && (
              <g transform="translate(18, 19)">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" fill="none" stroke="#FFE6A0" strokeWidth="1.8" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" fill="none" stroke="#FFE6A0" strokeWidth="1.8" />
              </g>
            )}

            {medalIcon === 'charity' && (
              <path
                d="M37 27c1.4-1.4 2.8-3 2.8-5.2 A5.2 5.2 0 0 0 34.6 16.5 c-1.6 0-2.8.5-4.2 1.9 -1.4-1.4-2.6-1.9-4.2-1.9 a5.2 5.2 0 0 0 -5.2 5.2 c0 2.2 1.4 3.8 2.8 5.2 l6.6 6.6 Z"
                fill="#FFE6A0"
                stroke="#916E25"
                strokeWidth="0.6"
              />
            )}

            {medalIcon === 'mosque' && (
              <g transform="translate(19, 18)">
                <path d="M11 2c-2.4 2-3.5 4.5-3.5 7v7h7V9c0-2.5-1.1-5-3.5-7z" fill="#FFE6A0" stroke="#916E25" strokeWidth="0.5" />
                <path d="M9.5 16v-3.5h3V16" fill="#15120B" />
                <circle cx="11" cy="1.2" r="0.7" fill="#FFE6A0" />
                <path d="M4 8h2v8H4z" fill="#FFE6A0" stroke="#916E25" strokeWidth="0.5" />
                <path d="M16 8h2v8h-2z" fill="#FFE6A0" stroke="#916E25" strokeWidth="0.5" />
              </g>
            )}

            {medalIcon === 'tasbih' && (
              <g transform="translate(20, 19)">
                <circle cx="10" cy="10" r="7" strokeDasharray="2.5 2.5" fill="none" stroke="#FFE6A0" strokeWidth="1.6" />
                <circle cx="10" cy="3" r="1.5" fill="#FFE6A0" />
                <circle cx="10" cy="17" r="1.2" fill="#FFE6A0" />
              </g>
            )}
          </svg>
        </>
      ) : (
        /* Locked Gunmetal/Silver Rosette Medal */
        <svg viewBox="0 0 60 60" className="w-full h-full drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)]">
          <defs>
            <linearGradient id={`lockedMedalGrad_${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4B5563" />
              <stop offset="50%" stopColor="#1F2937" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>
          </defs>

          {/* Dark Scalloped Rim */}
          <circle cx="30" cy="30" r="28" fill={`url(#lockedMedalGrad_${size})`} />
          <circle cx="30" cy="30" r="25" fill="#121316" stroke="#4B5563" strokeWidth="1" />
          <circle cx="30" cy="30" r="18" fill="#0C0D10" stroke="#374151" strokeWidth="0.8" />

          {/* Metallic Silver Padlock */}
          <g transform="translate(22, 21)">
            <rect x="2" y="7" width="12" height="9" rx="1.5" fill="#4B5563" stroke="#9CA3AF" strokeWidth="0.8" />
            <path d="M4.5 7V4.5a3.5 3.5 0 0 1 7 0V7" fill="none" stroke="#9CA3AF" strokeWidth="1.2" />
            <circle cx="8" cy="11.5" r="1" fill="#111827" />
          </g>
        </svg>
      )}
    </div>
  );
};

/* =========================================================================
   6. UNIFIED ACHIEVEMENT MEDAL COMPONENT (3-COLUMN GRID)
   For both Unlocked Gold Medals and Locked Silver/Gunmetal Medals
   ========================================================================= */
interface UnifiedAchievementMedalProps {
  title: string;
  subtitle: string;
  dateOrProgress: string;
  isUnlocked: boolean;
  medalIcon?: 'star' | 'flame' | 'quran' | 'charity' | 'tasbih' | 'mosque' | 'general';
  onClick?: () => void;
}

export const UnifiedAchievementMedalCard: React.FC<UnifiedAchievementMedalProps> = ({
  title,
  subtitle,
  dateOrProgress,
  isUnlocked,
  medalIcon = 'star',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border p-2.5 flex flex-col items-center text-center transition-all select-none cursor-pointer active:scale-95 group ${
        isUnlocked
          ? 'bg-[#14120B] border-[#D9AE48]/25 hover:border-[#D9AE48]/60 shadow-[0_4px_16px_rgba(0,0,0,0.55)]'
          : 'bg-[#12110D]/80 border-[#26231C] opacity-80 hover:opacity-100 hover:border-[#383327]'
      }`}
      dir="rtl"
    >
      {/* Medal Graphic */}
      <div className="mb-2 shrink-0">
        <UnifiedMedalGraphic
          isUnlocked={isUnlocked}
          medalIcon={medalIcon}
          size={56}
        />
      </div>

      {/* Title */}
      <h3
        className={`text-[11.5px] font-bold tracking-tight line-clamp-1 mb-0.5 ${
          isUnlocked ? 'text-[#FFFFFF]' : 'text-[#8E8A82]'
        }`}
      >
        {title}
      </h3>

      {/* Subtitle */}
      <p className="text-[9.5px] text-[#B5AD9B] line-clamp-1 mb-0.5">
        {subtitle}
      </p>

      {/* Date or Goal Progress */}
      <span
        className={`text-[8.5px] font-mono tracking-wide ${
          isUnlocked ? 'text-[#8E8675]' : 'text-[#D9AE48] font-bold'
        }`}
      >
        {dateOrProgress}
      </span>
    </div>
  );
};

/* =========================================================================
   7. VECTOR MOSQUE SKYLINE ART FOR JOURNEY BANNER
   High-contrast golden mosque silhouette with crescent moon and stars
   ========================================================================= */
export const JourneyMosqueVectorArt: React.FC = () => {
  return (
    <svg
      viewBox="0 0 240 100"
      preserveAspectRatio="none"
      className="w-full h-full opacity-90 group-hover:opacity-100 transition-opacity"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="mosqueGoldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFE6A0" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#D9AE48" stopOpacity="0.85" />
          <stop offset="85%" stopColor="#916E25" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#14120B" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Crescent Moon & Star in Sky */}
      <path
        d="M 85 24 A 12 12 0 1 0 95 38 A 9.5 9.5 0 1 1 85 24 Z"
        fill="#FFE6A0"
        opacity="0.85"
      />
      <circle cx="78" cy="30" r="1.5" fill="#FFE6A0" opacity="0.95" />

      {/* Left Tall Minaret */}
      <path
        d="M 18 15 L 20 22 L 20 85 L 14 85 L 14 22 Z"
        fill="url(#mosqueGoldGrad)"
      />
      {/* Minaret Dome & Finial */}
      <path
        d="M 17 6 L 18.5 15 L 15.5 15 Z"
        fill="#FFE6A0"
      />
      <circle cx="17" cy="5" r="1" fill="#FFE6A0" />

      {/* Central Majestic Mosque Dome */}
      <path
        d="M 32 85 C 32 45, 62 45, 62 85 Z"
        fill="url(#mosqueGoldGrad)"
      />
      {/* Central Dome Crescent Finial */}
      <path
        d="M 47 40 L 47 45 M 45 40 A 2.5 2.5 0 1 0 49 43"
        stroke="#FFE6A0"
        strokeWidth="1.2"
        fill="none"
      />

      {/* Secondary Soft Dome */}
      <path
        d="M 68 85 C 68 56, 92 56, 92 85 Z"
        fill="url(#mosqueGoldGrad)"
        opacity="0.75"
      />

      {/* Right Minaret */}
      <path
        d="M 108 24 L 110 30 L 110 85 L 105 85 L 105 30 Z"
        fill="url(#mosqueGoldGrad)"
        opacity="0.7"
      />

      {/* Distant Mosque Silhouettes in Background */}
      <path
        d="M 120 85 C 120 65, 145 65, 145 85 Z"
        fill="url(#mosqueGoldGrad)"
        opacity="0.4"
      />
      <path
        d="M 160 85 C 160 70, 180 70, 180 85 Z"
        fill="url(#mosqueGoldGrad)"
        opacity="0.2"
      />
    </svg>
  );
};
