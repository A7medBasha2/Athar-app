import React from 'react';
import { Camera } from 'lucide-react';
import avatarGoldFrameImg from '../../assets/images/avatar_gold_frame_1792549638579.jpg';

interface ProfileAvatarProps {
  photoURL?: string | null;
  displayName?: string;
  onEditPhoto?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showCameraButton?: boolean;
  className?: string;
}

/**
 * Validates whether a photo URL is a genuine user photo and NOT an app screenshot,
 * test preview, or dummy canvas capture.
 */
export function isValidUserPhoto(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length < 10) return false;
  if (trimmed.startsWith('preset:')) return false;

  const lower = trimmed.toLowerCase();
  if (
    lower.includes('screenshot') ||
    lower.includes('preview') ||
    lower.includes('com.athar') ||
    lower.includes('screen_') ||
    lower.includes('applet')
  ) {
    return false;
  }

  return (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:')
  );
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  photoURL,
  displayName = 'المستخدم',
  onEditPhoto,
  size = 'md',
  showCameraButton = true,
  className = '',
}) => {
  const hasValidPhoto = isValidUserPhoto(photoURL);

  const dimensions = {
    sm: { outer: 'w-16 h-16', inner: 'w-[58px] h-[58px]', camera: 'w-5 h-5', icon: 10, offset: 'bottom-0 right-0' },
    md: { outer: 'w-[78px] h-[78px]', inner: 'w-[72px] h-[72px]', camera: 'w-[22px] h-[22px]', icon: 11, offset: '-bottom-0.5 -right-0.5' },
    lg: { outer: 'w-24 h-24', inner: 'w-[88px] h-[88px]', camera: 'w-6 h-6', icon: 12, offset: 'bottom-0 right-0' },
  }[size];

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Soft Ambient Golden Radial Aura */}
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,_rgba(217,174,72,0.45)_0%,_transparent_72%)] blur-xl scale-125 pointer-events-none" />

      {/* Dimensional Metallic Gold Circular Frame Container */}
      <div
        className={`relative ${dimensions.outer} rounded-full p-[2.5px] bg-gradient-to-tr from-[#916E25] via-[#FFE6A0] to-[#D9AE48] shadow-[0_0_24px_rgba(217,174,72,0.35)] mx-auto flex items-center justify-center select-none`}
      >
        {/* Real Metallic Gold Texture Overlay with Screen Blend */}
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none mix-blend-screen opacity-50">
          <img
            src={avatarGoldFrameImg}
            alt=""
            className="w-full h-full object-cover scale-110"
          />
        </div>

        {/* User Avatar Circle */}
        <div
          className={`${dimensions.inner} rounded-full overflow-hidden bg-[#12100C] relative z-1 flex items-center justify-center shadow-inner`}
        >
          {hasValidPhoto ? (
            <img
              src={photoURL || ''}
              alt={displayName}
              className="w-full h-full object-cover object-center aspect-square"
            />
          ) : (
            /* Refined Human Silhouette on Dark Surface with Subtle Golden Edge Rim */
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full"
              aria-hidden="true"
            >
              <rect width="100" height="100" fill="#14110B" />
              <defs>
                <radialGradient id="avatarSilhouetteGradient" cx="50%" cy="35%" r="60%">
                  <stop offset="0%" stopColor="#2E2618" />
                  <stop offset="100%" stopColor="#12100C" />
                </radialGradient>
              </defs>
              {/* Head */}
              <circle
                cx="50"
                cy="36"
                r="15"
                fill="url(#avatarSilhouetteGradient)"
                stroke="#D9AE48"
                strokeWidth="0.8"
                strokeOpacity="0.45"
              />
              {/* Shoulders & Torso */}
              <path
                d="M 23 88 C 23 63, 34 54, 50 54 C 66 54, 77 63, 77 88 Z"
                fill="url(#avatarSilhouetteGradient)"
                stroke="#D9AE48"
                strokeWidth="0.8"
                strokeOpacity="0.45"
              />
            </svg>
          )}
        </div>

        {/* Floating Metallic Camera Button at 4:30 */}
        {showCameraButton && onEditPhoto && (
          <button
            onClick={onEditPhoto}
            className={`absolute ${dimensions.offset} ${dimensions.camera} rounded-full bg-gradient-to-tr from-[#916E25] via-[#FFE6A0] to-[#D9AE48] text-[#080807] flex items-center justify-center border-2 border-[#080807] shadow-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer z-10`}
            aria-label="تغيير الصورة الشخصية"
            title="تعديل الصورة"
          >
            <Camera size={dimensions.icon} strokeWidth={2.5} className="text-[#080807]" />
          </button>
        )}
      </div>
    </div>
  );
};
