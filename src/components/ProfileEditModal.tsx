import React, { useState, useRef, useEffect } from 'react';
import { UserProfileData, AuthService } from '../services/authService';
import { ProfileMediaService, UploadProgressInfo } from '../services/profileMediaService';
import {
  X,
  Camera,
  Sparkles,
  User as UserIcon,
  AtSign,
  Heart,
  Trash2,
  AlertCircle,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserProfileData | null;
  onProfileUpdated: (updatedProfile: UserProfileData) => void;
}

export const ROYAL_AVATAR_PRESETS = [
  { id: 'avatar_crescent', label: 'هلال الذهب', emoji: '🌙', bg: 'from-[#2A200B] to-[#14120B]' },
  { id: 'avatar_minaret', label: 'منارة الفجر', emoji: '🕌', bg: 'from-[#241C0A] to-[#14120B]' },
  { id: 'avatar_dome', label: 'قبة النور', emoji: '🏛️', bg: 'from-[#2C240E] to-[#14120B]' },
  { id: 'avatar_flame', label: 'شعلة الأثر', emoji: '🔥', bg: 'from-[#331C08] to-[#14120B]' },
  { id: 'avatar_beads', label: 'مسبحة الذاكرين', emoji: '📿', bg: 'from-[#1F2618] to-[#14120B]' },
  { id: 'avatar_shield', label: 'درع السكينة', emoji: '🛡️', bg: 'from-[#1A222B] to-[#14120B]' },
];

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onProfileUpdated,
}) => {
  const [displayName, setDisplayName] = useState(currentProfile?.displayName || 'أحمد محمد');
  const [username, setUsername] = useState(currentProfile?.username || 'ahmed');
  const [bio, setBio] = useState(currentProfile?.bio || 'اللهم اجعل أثري طيباً وعملي خالصاً لوجهك الكريم');
  const [photoURL, setPhotoURL] = useState(currentProfile?.photoURL || '');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(() => {
    if (currentProfile?.photoURL?.startsWith('preset:')) {
      return currentProfile.photoURL.replace('preset:', '');
    }
    return '';
  });

  // Staged un-uploaded image blob and preview
  const [stagedBlob, setStagedBlob] = useState<Blob | null>(null);
  const [stagedMimeType, setStagedMimeType] = useState<string>('image/jpeg');

  // Async states
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelUploadRef = useRef<(() => void) | null>(null);

  // Sync state whenever modal opens with fresh profile
  useEffect(() => {
    if (isOpen) {
      setDisplayName(currentProfile?.displayName || 'أحمد محمد');
      setUsername(currentProfile?.username || 'ahmed');
      setBio(currentProfile?.bio || 'اللهم اجعل أثري طيباً وعملي خالصاً لوجهك الكريم');
      setPhotoURL(currentProfile?.photoURL || '');
      if (currentProfile?.photoURL?.startsWith('preset:')) {
        setSelectedPresetId(currentProfile.photoURL.replace('preset:', ''));
      } else {
        setSelectedPresetId('');
      }
      setStagedBlob(null);
      setUploadProgress(null);
      setErrorMsg(null);
      setCanRetry(false);
    }
  }, [isOpen, currentProfile]);

  if (!isOpen) return null;

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    setPhotoURL(`preset:${presetId}`);
    setStagedBlob(null);
    setErrorMsg(null);
    try {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    } catch {}
  };

  const handleSetDefaultSilhouette = () => {
    setSelectedPresetId('');
    setPhotoURL('');
    setStagedBlob(null);
    setErrorMsg(null);
    try {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    } catch {}
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setCanRetry(false);
    setIsProcessingImage(true);

    try {
      // Validate and compress client-side
      const result = await ProfileMediaService.compressAndResizeImage(file);
      setStagedBlob(result.blob);
      setStagedMimeType(result.mimeType);
      setPhotoURL(result.previewUrl);
      setSelectedPresetId('');

      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch {}
    } catch (err: any) {
      console.error('Image processing failure:', err);
      setErrorMsg(err.message || 'تعذر معالجة الصورة. يرجى اختيار ملف صورة آخر.');
    } finally {
      setIsProcessingImage(false);
      // Reset input value so re-selecting same file triggers onChange
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setCanRetry(false);

    const cleanName = displayName.trim();
    const cleanUsername = username.trim().replace(/^@+/, '').replace(/[^a-zA-Z0-9_.]/g, '');
    const cleanBio = bio.trim();

    // Client-side field validations
    if (cleanName.length < 2) {
      setErrorMsg('يرجى كتابة اسم صحيح لا يقل عن حرفين.');
      return;
    }
    if (cleanName.length > 120) {
      setErrorMsg('الاسم طويل جداً (الحد الأقصى 120 حرفاً).');
      return;
    }
    if (cleanBio.length > 300) {
      setErrorMsg('النية أو النبذة التعريفية يجب ألا تتجاوز 300 حرف.');
      return;
    }

    setIsSaving(true);
    let finalPhotoURL = photoURL;
    const previousPhotoURL = currentProfile?.photoURL || '';

    try {
      const currentUser = AuthService.getCurrentUser();
      const uid = currentProfile?.uid || currentUser?.uid || 'guest_user';
      const isAuthenticated = currentUser && currentUser.uid === uid && uid !== 'guest_user';

      // 1. Upload staged photo to Cloud Storage if a new photo was selected
      if (stagedBlob && isAuthenticated) {
        setUploadProgress(10);
        try {
          const uploadInstance = ProfileMediaService.uploadProfilePhoto(
            uid,
            stagedBlob,
            stagedMimeType,
            (info: UploadProgressInfo) => {
              setUploadProgress(info.progress);
            }
          );

          cancelUploadRef.current = uploadInstance.cancel;
          finalPhotoURL = await uploadInstance.promise;
          setUploadProgress(100);

          // If there was an old Cloud Storage photo, delete it safely now that replacement succeeded
          if (previousPhotoURL && previousPhotoURL !== finalPhotoURL && previousPhotoURL.includes('firebasestorage.googleapis.com')) {
            ProfileMediaService.deleteProfilePhotoByUrl(previousPhotoURL).catch(() => {});
          }
        } catch (uploadErr: any) {
          console.error('Photo upload failed:', uploadErr);
          setCanRetry(true);
          setErrorMsg(uploadErr.message || 'فشل رفع الصورة إلى السحابة. يمكنك إعادة المحاولة.');
          setIsSaving(false);
          setUploadProgress(null);
          return;
        } finally {
          cancelUploadRef.current = null;
        }
      } else if (finalPhotoURL === '' && previousPhotoURL && previousPhotoURL.includes('firebasestorage.googleapis.com') && isAuthenticated) {
        // User removed their photo back to default silhouette
        ProfileMediaService.deleteProfilePhotoByUrl(previousPhotoURL).catch(() => {});
      }

      // 2. Prepare user profile payload
      const creationDate = currentProfile?.createdAt || currentUser?.metadata?.creationTime || new Date().toISOString();
      const updatedData: UserProfileData = {
        uid,
        displayName: cleanName,
        username: cleanUsername || 'athar_user',
        email: currentProfile?.email || currentUser?.email || `${uid}@athar.app`,
        photoURL: finalPhotoURL.trim(),
        bio: cleanBio,
        isPublicProfile: currentProfile?.isPublicProfile ?? true,
        createdAt: creationDate,
        updatedAt: new Date().toISOString(),
        level: currentProfile?.level,
        xp: currentProfile?.xp,
        streakDays: currentProfile?.streakDays,
      };

      // 3. Save locally in localStorage for offline persistence
      try {
        localStorage.setItem('athar_cached_profile', JSON.stringify(updatedData));
      } catch {}

      // 4. Synchronize with Firestore and Firebase Auth if logged in
      if (isAuthenticated) {
        await AuthService.updateUserProfile(uid, updatedData);
      }

      onProfileUpdated(updatedData);

      try {
        await Haptics.notification({ type: NotificationType.Success });
      } catch {}

      onClose();
    } catch (saveErr: any) {
      console.error('Profile update failure:', saveErr);
      setErrorMsg(saveErr.message || 'حدث خطأ أثناء حفظ الملف الشخصي.');
      setCanRetry(true);
    } finally {
      setIsSaving(false);
      setUploadProgress(null);
    }
  };

  const handleClose = () => {
    if (cancelUploadRef.current) {
      try {
        cancelUploadRef.current();
      } catch {}
      cancelUploadRef.current = null;
    }
    onClose();
  };

  const activePreset = ROYAL_AVATAR_PRESETS.find((p) => p.id === selectedPresetId);
  const isCustomPhoto = photoURL && !photoURL.startsWith('preset:');
  const isPresetSelected = photoURL && photoURL.startsWith('preset:');
  const isSilhouetteSelected = !photoURL;

  // Format account creation date in Arabic
  const creationDateRaw = currentProfile?.createdAt || AuthService.getCurrentUser()?.metadata?.creationTime;
  const formattedCreationDate = creationDateRaw
    ? new Date(creationDateRaw).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      dir="rtl"
    >
      <div className="relative w-full max-w-md bg-[#0D0B08] border border-[#D9AE48]/35 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.85)] max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2A2210] bg-[#14120B]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#D9AE48]/20 flex items-center justify-center border border-[#D9AE48]/40">
              <Sparkles size={15} className="text-[#FFE6A0]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F7F2E7]">تعديل الملف الشخصي</h2>
              <p className="text-[10px] text-[#A69E8D]">تعديل الاسم والصورة والبيانات الشخصية</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-full text-[#A69E8D] hover:text-white hover:bg-white/10 transition-colors"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {errorMsg && (
            <div className="p-2.5 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center justify-between gap-2 text-xs text-red-300">
              <div className="flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
              {canRetry && (
                <button
                  type="button"
                  onClick={() => handleSave()}
                  className="px-2.5 py-1 rounded-lg bg-red-800/80 hover:bg-red-700 text-[11px] text-white shrink-0 font-medium flex items-center gap-1 transition-colors"
                >
                  <RefreshCw size={11} />
                  <span>إعادة المحاولة</span>
                </button>
              )}
            </div>
          )}

          {/* Upload Progress Bar */}
          {uploadProgress !== null && (
            <div className="w-full bg-[#14120B] border border-[#D9AE48]/30 rounded-xl p-2.5 space-y-1.5 animate-fadeIn">
              <div className="flex justify-between items-center text-[11px] text-[#FFE6A0]">
                <span>جاري رفع الصورة إلى التخزين السحابي...</span>
                <span className="font-mono font-bold">{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#2A2210] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#D9AE48] to-[#FFE6A0] transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Avatar Preview & Selection */}
          <div className="flex flex-col items-center">
            <div className="relative mb-2">
              <div className="w-20 h-20 rounded-full p-[1.5px] bg-gradient-to-b from-[#FFE6A0] via-[#D9AE48] to-[#8C6B23] shadow-[0_4px_16px_rgba(217,174,72,0.25)]">
                <div className="w-full h-full rounded-full overflow-hidden bg-[#12100C] flex items-center justify-center">
                  {isProcessingImage ? (
                    <div className="flex flex-col items-center justify-center text-[9px] text-[#FFE6A0] space-y-1">
                      <RefreshCw size={16} className="animate-spin text-[#D9AE48]" />
                      <span>معالجة...</span>
                    </div>
                  ) : isCustomPhoto ? (
                    <img src={photoURL} alt={displayName} className="w-full h-full object-cover aspect-square" />
                  ) : isPresetSelected && activePreset ? (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${activePreset.bg} flex items-center justify-center text-3xl select-none`}
                    >
                      {activePreset.emoji}
                    </div>
                  ) : (
                    /* Default Silhouette */
                    <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
                      <rect width="100" height="100" fill="#14110B" />
                      <circle cx="50" cy="35" r="15" fill="#2D2517" stroke="#D9AE48" strokeWidth="0.75" strokeOpacity="0.4" />
                      <path d="M 24 88 C 24 64, 35 55, 50 55 C 65 55, 76 64, 76 88 Z" fill="#2D2517" stroke="#D9AE48" strokeWidth="0.75" strokeOpacity="0.4" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Camera Trigger */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingImage || isSaving}
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#D9AE48] text-[#080807] flex items-center justify-center shadow border-2 border-[#080807] hover:bg-[#FFE6A0] active:scale-95 transition-all disabled:opacity-50"
                title="رفع صورة شخصية"
                aria-label="رفع صورة شخصية"
              >
                <Camera size={12} strokeWidth={2.5} />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />
            </div>

            {/* Avatar Actions */}
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingImage || isSaving}
                className="text-[11px] text-[#FFE6A0] hover:underline flex items-center gap-1 font-medium bg-[#1C170E] border border-[#D9AE48]/25 rounded-lg px-2.5 py-1 disabled:opacity-50"
              >
                <Camera size={12} className="text-[#D9AE48]" />
                <span>رفع صورة</span>
              </button>

              <button
                type="button"
                onClick={handleSetDefaultSilhouette}
                disabled={isProcessingImage || isSaving}
                className={`text-[11px] flex items-center gap-1 font-medium rounded-lg px-2.5 py-1 transition-all disabled:opacity-50 ${
                  isSilhouetteSelected
                    ? 'bg-[#D9AE48]/20 border border-[#D9AE48] text-[#FFE6A0]'
                    : 'bg-[#14120B] border border-[#2A2210] text-[#A69E8D] hover:text-[#F7F2E7]'
                }`}
              >
                <span>الصورة الافتراضية</span>
              </button>

              {isCustomPhoto && (
                <button
                  type="button"
                  onClick={handleSetDefaultSilhouette}
                  disabled={isProcessingImage || isSaving}
                  className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-950/20 border border-red-500/20 rounded-lg px-2 py-1 disabled:opacity-50"
                  title="حذف الصورة"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>

            {/* Optional Royal Presets */}
            <div className="grid grid-cols-6 gap-1.5 mt-3 w-full">
              {ROYAL_AVATAR_PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id && isPresetSelected;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    disabled={isProcessingImage || isSaving}
                    className={`flex flex-col items-center p-1 rounded-xl border transition-all disabled:opacity-50 ${
                      isSelected
                        ? 'border-[#FFE6A0] bg-[#D9AE48]/20 shadow-[0_0_10px_rgba(217,174,72,0.3)] scale-105'
                        : 'border-[#2A2210] bg-[#14120B]/80 hover:border-[#D9AE48]/40'
                    }`}
                  >
                    <span className="text-lg">{preset.emoji}</span>
                    <span className="text-[8.5px] text-[#A69E8D] mt-0.5 truncate max-w-full">
                      {preset.label.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-[#F7F2E7] mb-1 flex items-center gap-1.5">
                <UserIcon size={12} className="text-[#D9AE48]" />
                الاسم الظاهر
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="أحمد محمد"
                maxLength={120}
                required
                disabled={isSaving}
                className="w-full bg-[#14120B] border border-[#2A2210] rounded-xl px-3 py-2 text-xs text-[#F7F2E7] placeholder-[#555] focus:outline-none focus:border-[#D9AE48] transition-colors disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F7F2E7] mb-1 flex items-center gap-1.5">
                <AtSign size={12} className="text-[#D9AE48]" />
                اسم المستخدم
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ahmed"
                maxLength={50}
                dir="ltr"
                disabled={isSaving}
                className="w-full bg-[#14120B] border border-[#2A2210] rounded-xl px-3 py-2 text-xs text-[#F7F2E7] placeholder-[#555] focus:outline-none focus:border-[#D9AE48] transition-colors font-mono disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F7F2E7] mb-1 flex items-center gap-1.5">
                <Heart size={12} className="text-[#D9AE48]" />
                النية والهدف الإيماني
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                maxLength={300}
                disabled={isSaving}
                placeholder="اللهم اجعل أثري طيباً وعملي خالصاً لوجهك الكريم"
                className="w-full bg-[#14120B] border border-[#2A2210] rounded-xl px-3 py-2 text-xs text-[#F7F2E7] placeholder-[#555] focus:outline-none focus:border-[#D9AE48] transition-colors resize-none leading-relaxed disabled:opacity-50"
              />
            </div>

            {/* Account Creation Date when available */}
            {formattedCreationDate && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#14120B] border border-[#2A2210] text-[11px] text-[#A69E8D]">
                <Calendar size={13} className="text-[#D9AE48] shrink-0" />
                <span>
                  تاريخ الانضمام لأثر:{' '}
                  <span className="text-[#F7F2E7] font-medium">{formattedCreationDate}</span>
                </span>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#2A2210]">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#A69E8D] hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving || isProcessingImage}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#D9AE48] to-[#FFE6A0] text-[#080807] text-xs font-bold shadow hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  <span>{uploadProgress !== null ? `جاري الرفع (${uploadProgress}%)...` : 'جاري الحفظ...'}</span>
                </>
              ) : (
                'حفظ التعديلات'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
