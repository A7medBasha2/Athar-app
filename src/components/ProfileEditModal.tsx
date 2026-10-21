import React, { useState, useRef, useEffect } from 'react';
import { UserProfileData, AuthService, ProfilePrivacySettings, DEFAULT_PRIVACY_SETTINGS } from '../services/authService';
import { ProfileMediaService, UploadProgressInfo } from '../services/profileMediaService';
import { CircularPhotoCropModal } from './profile/CircularPhotoCropModal';
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
  Crop,
  Shield,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  SlidersHorizontal,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import innerAvatarSilhouetteImg from '../assets/images/inner_avatar_silhouette.png';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserProfileData | null;
  onProfileUpdated: (updatedProfile: UserProfileData) => void;
  onLogoutRequested?: () => void;
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
  onLogoutRequested,
}) => {
  type EditTab = 'info' | 'privacy' | 'account';
  const [activeTab, setActiveTab] = useState<EditTab>('info');

  const [displayName, setDisplayName] = useState(currentProfile?.displayName || 'زائر كريم');
  const [username, setUsername] = useState(currentProfile?.username || 'guest');
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
  const [stagedMimeType, setStagedMimeType] = useState<string>('image/webp');

  // Interactive Photo Cropping Modal state
  const [rawSelectedFile, setRawSelectedFile] = useState<File | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  // Privacy & Visibility Settings (Strictly Private by Default)
  const [privacySettings, setPrivacySettings] = useState<ProfilePrivacySettings>(() => {
    const uid = currentProfile?.uid || AuthService.getCurrentUser()?.uid;
    return AuthService.getPrivacySettings(uid);
  });

  // Async & UI states
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelUploadRef = useRef<(() => void) | null>(null);

  // Sync state whenever modal opens with fresh profile
  useEffect(() => {
    if (isOpen) {
      const user = AuthService.getCurrentUser();
      const defaultName = currentProfile?.displayName || user?.displayName || (user ? 'مستخدم أثر' : 'زائر كريم');
      const defaultUsername = currentProfile?.username || user?.email?.split('@')[0] || (user ? 'user' : 'guest');
      
      setDisplayName(defaultName);
      setUsername(defaultUsername);
      setBio(currentProfile?.bio || 'اللهم اجعل أثري طيباً وعملي خالصاً لوجهك الكريم');
      setPhotoURL(currentProfile?.photoURL || '');
      if (currentProfile?.photoURL?.startsWith('preset:')) {
        setSelectedPresetId(currentProfile.photoURL.replace('preset:', ''));
      } else {
        setSelectedPresetId('');
      }

      const uid = currentProfile?.uid || user?.uid;
      setPrivacySettings(AuthService.getPrivacySettings(uid));

      setStagedBlob(null);
      setRawSelectedFile(null);
      setIsCropModalOpen(false);
      setUploadProgress(null);
      setErrorMsg(null);
      setSuccessToast(null);
      setCanRetry(false);
      setShowLogoutConfirm(false);
    }
  }, [isOpen, currentProfile]);

  if (!isOpen) return null;

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    setPhotoURL(`preset:${presetId}`);
    setStagedBlob(null);
    setRawSelectedFile(null);
    setErrorMsg(null);
    try {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    } catch {}
  };

  const handleSetDefaultSilhouette = () => {
    setSelectedPresetId('');
    setPhotoURL('');
    setStagedBlob(null);
    setRawSelectedFile(null);
    setErrorMsg(null);
    try {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    } catch {}
  };

  // Called when file is selected from disk
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate mime type
    if (!file.type.startsWith('image/')) {
      setErrorMsg('يرجى اختيار ملف صورة صالح (JPEG, PNG, WebP).');
      return;
    }

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('حجم الصورة كبير جداً (الحد الأقصى 10 ميغابايت).');
      return;
    }

    setErrorMsg(null);
    setRawSelectedFile(file);
    setIsCropModalOpen(true);

    try {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    } catch {}

    // Reset input so selecting same file triggers event again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Called when user applies crop in CircularPhotoCropModal
  const handleApplyCrop = (croppedBlob: Blob, previewUrl: string) => {
    setStagedBlob(croppedBlob);
    setStagedMimeType('image/webp');
    setPhotoURL(previewUrl);
    setSelectedPresetId('');
    setErrorMsg(null);

    setSuccessToast('تم ضبط واقتصاص الصورة بنجاح!');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleTogglePrivacyField = (field: keyof ProfilePrivacySettings) => {
    try {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    } catch {}
    setPrivacySettings((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
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
      setActiveTab('info');
      return;
    }
    if (cleanName.length > 120) {
      setErrorMsg('الاسم طويل جداً (الحد الأقصى 120 حرفاً).');
      setActiveTab('info');
      return;
    }
    if (cleanBio.length > 300) {
      setErrorMsg('النية أو النبذة التعريفية يجب ألا تتجاوز 300 حرف.');
      setActiveTab('info');
      return;
    }

    setIsSaving(true);
    let finalPhotoURL = photoURL;
    const previousPhotoURL = currentProfile?.photoURL || '';

    try {
      const currentUser = AuthService.getCurrentUser();
      const uid = currentProfile?.uid || currentUser?.uid || 'guest_user';
      const isAuthenticated = currentUser && currentUser.uid === uid && uid !== 'guest_user';

      // 1. Upload staged photo to Cloud Storage if a new cropped photo was staged
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

          // If there was an old Cloud Storage photo, delete it safely
          if (
            previousPhotoURL &&
            previousPhotoURL !== finalPhotoURL &&
            previousPhotoURL.includes('firebasestorage.googleapis.com')
          ) {
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
      } else if (
        finalPhotoURL === '' &&
        previousPhotoURL &&
        previousPhotoURL.includes('firebasestorage.googleapis.com') &&
        isAuthenticated
      ) {
        // User removed their photo back to default silhouette
        ProfileMediaService.deleteProfilePhotoByUrl(previousPhotoURL).catch(() => {});
      }

      // 2. Persist privacy settings scoped to UID
      AuthService.setPrivacySettings(privacySettings, uid);

      // 3. Prepare user profile payload
      const creationDate =
        currentProfile?.createdAt || currentUser?.metadata?.creationTime || new Date().toISOString();
      const updatedData: UserProfileData = {
        uid,
        displayName: cleanName,
        username: cleanUsername || 'athar_user',
        email: currentProfile?.email || currentUser?.email || `${uid}@athar.app`,
        photoURL: finalPhotoURL.trim(),
        bio: cleanBio,
        isPublicProfile: !privacySettings.isPrivate, // Private by default
        createdAt: creationDate,
        updatedAt: new Date().toISOString(),
        level: currentProfile?.level,
        xp: currentProfile?.xp,
        streakDays: currentProfile?.streakDays,
        privacy: privacySettings,
      };

      // 4. Save locally in localStorage for offline persistence
      const cacheKey = isAuthenticated ? `athar_cached_profile_${uid}` : 'athar_cached_profile_guest';
      try {
        localStorage.setItem(cacheKey, JSON.stringify(updatedData));
        localStorage.setItem('athar_cached_profile', JSON.stringify(updatedData));
      } catch {}

      // 5. Synchronize with Firestore and Firebase Auth if logged in
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

  const handleLogout = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {}

    try {
      await AuthService.logout();
      setShowLogoutConfirm(false);
      if (onLogoutRequested) {
        onLogoutRequested();
      }
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message || 'تعذر تسجيل الخروج.');
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

  const currentUser = AuthService.getCurrentUser();
  const creationDateRaw = currentProfile?.createdAt || currentUser?.metadata?.creationTime;
  const formattedCreationDate = creationDateRaw
    ? new Date(creationDateRaw).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  // Mask email for privacy display
  const maskedEmail = (() => {
    const email = currentProfile?.email || currentUser?.email;
    if (!email || !email.includes('@')) return null;
    const [name, domain] = email.split('@');
    if (name.length <= 2) return `${name}***@${domain}`;
    return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
  })();

  return (
    <>
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
                <h2 className="text-sm font-bold text-[#F7F2E7]">إعدادات الملف الشخصي</h2>
                <p className="text-[10px] text-[#A69E8D]">البيانات الشخصية، الخصوصية، وإدارة الحساب</p>
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

          {/* Segmented Tabs Navigation */}
          <div className="px-5 pt-3 pb-1 border-b border-[#2A2210]/60 bg-[#100E0A] flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'info'
                  ? 'bg-gradient-to-r from-[#D9AE48] to-[#FFE6A0] text-[#080807] font-bold shadow-sm'
                  : 'text-[#B5AD9B] hover:text-white hover:bg-white/5'
              }`}
            >
              <UserIcon size={12} />
              <span>البيانات الشخصية</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'privacy'
                  ? 'bg-gradient-to-r from-[#D9AE48] to-[#FFE6A0] text-[#080807] font-bold shadow-sm'
                  : 'text-[#B5AD9B] hover:text-white hover:bg-white/5'
              }`}
            >
              <Shield size={12} />
              <span>الخصوصية والظهور</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('account')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'account'
                  ? 'bg-gradient-to-r from-[#D9AE48] to-[#FFE6A0] text-[#080807] font-bold shadow-sm'
                  : 'text-[#B5AD9B] hover:text-white hover:bg-white/5'
              }`}
            >
              <Lock size={12} />
              <span>الحساب والأمان</span>
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {errorMsg && (
              <div className="p-2.5 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center justify-between gap-2 text-xs text-red-300 animate-fadeIn">
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

            {successToast && (
              <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300 animate-fadeIn">
                <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
                <span>{successToast}</span>
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

            {/* TAB 1: PERSONAL INFO */}
            {activeTab === 'info' && (
              <div className="space-y-4 animate-fadeIn">
                {/* Avatar Preview & Selection */}
                <div className="flex flex-col items-center">
                  <div className="relative mb-2">
                    {/* Subtle soft golden aura radiating gently behind the completed frame */}
                    <div className="absolute -inset-2 rounded-full bg-[radial-gradient(circle,_rgba(217,174,72,0.30)_0%,_rgba(217,174,72,0.10)_55%,_transparent_72%)] blur-md pointer-events-none" />

                    {/* Complete unbroken metallic gold circular frame */}
                    <div className="relative w-[86px] h-[86px] rounded-full p-[2.5px] bg-gradient-to-tr from-[#9D7620] via-[#FFE6A0] to-[#D9AE48] shadow-[0_0_18px_rgba(217,174,72,0.30)] flex items-center justify-center">
                      <div className="w-full h-full rounded-full overflow-hidden bg-[#14120B] flex items-center justify-center">
                        {isProcessingImage ? (
                          <div className="flex flex-col items-center justify-center text-[9px] text-[#FFE6A0] space-y-1">
                            <RefreshCw size={16} className="animate-spin text-[#D9AE48]" />
                            <span>معالجة...</span>
                          </div>
                        ) : isCustomPhoto ? (
                          <img src={photoURL} alt={displayName} referrerPolicy="no-referrer" className="w-full h-full object-cover aspect-square" />
                        ) : isPresetSelected && activePreset ? (
                          <div
                            className={`w-full h-full bg-gradient-to-br ${activePreset.bg} flex items-center justify-center text-3xl select-none`}
                          >
                            {activePreset.emoji}
                          </div>
                        ) : (
                          /* Default authentic silhouette with original lighting and frame */
                          <img
                            src={innerAvatarSilhouetteImg}
                            alt={displayName}
                            className="w-full h-full object-cover object-center"
                          />
                        )}
                      </div>

                      {/* Camera Trigger */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessingImage || isSaving}
                        className="absolute -bottom-0.5 -right-0.5 w-[24px] h-[24px] rounded-full bg-gradient-to-br from-[#FFE6A0] to-[#D9AE48] text-[#080807] flex items-center justify-center shadow-md border-2 border-[#080807] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 z-10 cursor-pointer"
                        title="اختيار وقص صورة جديدة"
                        aria-label="اختيار وقص صورة جديدة"
                      >
                        <Camera size={12} strokeWidth={2.4} />
                      </button>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </div>

                  {/* Avatar Actions */}
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingImage || isSaving}
                      className="text-[11px] text-[#FFE6A0] hover:underline flex items-center gap-1 font-medium bg-[#1C170E] border border-[#D9AE48]/25 rounded-lg px-2.5 py-1 disabled:opacity-50 cursor-pointer"
                    >
                      <Camera size={12} className="text-[#D9AE48]" />
                      <span>اختيار صورة جديدة</span>
                    </button>

                    {rawSelectedFile && (
                      <button
                        type="button"
                        onClick={() => setIsCropModalOpen(true)}
                        disabled={isProcessingImage || isSaving}
                        className="text-[11px] text-[#FFE6A0] hover:underline flex items-center gap-1 font-medium bg-[#1C170E] border border-[#D9AE48]/25 rounded-lg px-2.5 py-1 disabled:opacity-50 cursor-pointer"
                        title="إعادة ضبط موضع وتكبير الصورة"
                      >
                        <Crop size={12} className="text-[#D9AE48]" />
                        <span>إعادة القص</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleSetDefaultSilhouette}
                      disabled={isProcessingImage || isSaving}
                      className={`text-[11px] flex items-center gap-1.5 font-medium rounded-lg px-2.5 py-1 transition-all disabled:opacity-50 cursor-pointer ${
                        isSilhouetteSelected
                          ? 'bg-[#D9AE48]/25 border border-[#FFE6A0] text-[#FFE6A0] font-bold shadow-sm'
                          : 'bg-[#14120B] border border-[#2A2210] text-[#A69E8D] hover:text-[#F7F2E7]'
                      }`}
                      title="استعادة الصورة والفريم الأساسيين"
                    >
                      <img
                        src={innerAvatarSilhouetteImg}
                        alt=""
                        className="w-3.5 h-3.5 rounded-full object-cover border border-[#D9AE48]/40"
                      />
                      <span>الصورة الافتراضية</span>
                    </button>

                    {(isCustomPhoto || isPresetSelected) && (
                      <button
                        type="button"
                        onClick={handleSetDefaultSilhouette}
                        disabled={isProcessingImage || isSaving}
                        className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-950/20 border border-red-500/20 rounded-lg px-2 py-1 disabled:opacity-50 cursor-pointer"
                        title="إزالة الصورة والعودة للوضع الأساسي"
                      >
                        <Trash2 size={11} />
                        <span>إزالة</span>
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
                </div>
              </div>
            )}

            {/* TAB 2: PRIVACY & VISIBILITY */}
            {activeTab === 'privacy' && (
              <div className="space-y-3.5 animate-fadeIn">
                {/* Privacy by Default Master Banner */}
                <div className="bg-[#14120B] border border-[#D9AE48]/30 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#D9AE48]/20 flex items-center justify-center border border-[#D9AE48]/40">
                        <ShieldCheck size={15} className="text-[#FFE6A0]" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#F7F2E7]">الخصوصية أولاً (Private by Default)</span>
                        <p className="text-[10px] text-[#A69E8D]">ملفك محفوظ بأمان ولا يظهر لأي مستخدم آخر</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[#FFE6A0] bg-[#D9AE48]/15 border border-[#D9AE48]/30 px-2 py-0.5 rounded-md">
                      مفعل تلقائياً
                    </span>
                  </div>
                  <p className="text-[11px] text-[#B5AD9B] leading-relaxed">
                    تطبيق «أثر» لا يحتوي على أي لوحات صدارة عامة أو مشاركة إجبارية. عبادتك وطاعتك خالصة بينك وبين الله،
                    ولا يتم إتاحة أي سجل أو بريد إلكتروني للعموم.
                  </p>
                </div>

                {/* Granular Visibility Switches */}
                <div className="bg-[#14120B] border border-[#2A2210] rounded-2xl divide-y divide-[#2A2210]">
                  {/* Switch 1: Hide Stats */}
                  <div
                    onClick={() => handleTogglePrivacyField('hideStats')}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors select-none"
                  >
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-[#F7F2E7] flex items-center gap-1.5">
                        {privacySettings.hideStats ? <EyeOff size={13} className="text-[#D9AE48]" /> : <Eye size={13} className="text-[#A69E8D]" />}
                        إخفاء إحصائيات العبادات
                      </span>
                      <p className="text-[10px] text-[#A69E8D]">
                        إخفاء أعداد الصلوات والأذكار وساعات التلاوة في بطاقات الحساب
                      </p>
                    </div>
                    <div
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                        privacySettings.hideStats ? 'bg-[#D9AE48]' : 'bg-[#2A2210]'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-[#080807] transition-transform ${
                          privacySettings.hideStats ? 'translate-x-0' : '-translate-x-4'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Switch 2: Hide Streak */}
                  <div
                    onClick={() => handleTogglePrivacyField('hideStreak')}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors select-none"
                  >
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-[#F7F2E7] flex items-center gap-1.5">
                        {privacySettings.hideStreak ? <EyeOff size={13} className="text-[#D9AE48]" /> : <Eye size={13} className="text-[#A69E8D]" />}
                        إخفاء سلسلة الاستمرارية (Streak)
                      </span>
                      <p className="text-[10px] text-[#A69E8D]">
                        إخفاء عدد أيام الاستمرارية لمنع المقارنة والتفاخر
                      </p>
                    </div>
                    <div
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                        privacySettings.hideStreak ? 'bg-[#D9AE48]' : 'bg-[#2A2210]'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-[#080807] transition-transform ${
                          privacySettings.hideStreak ? 'translate-x-0' : '-translate-x-4'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Switch 3: Hide Achievements */}
                  <div
                    onClick={() => handleTogglePrivacyField('hideAchievements')}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors select-none"
                  >
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-[#F7F2E7] flex items-center gap-1.5">
                        {privacySettings.hideAchievements ? <EyeOff size={13} className="text-[#D9AE48]" /> : <Eye size={13} className="text-[#A69E8D]" />}
                        إخفاء الأوسمة والإنجازات المكتسبة
                      </span>
                      <p className="text-[10px] text-[#A69E8D]">
                        إبقاء أوسمتك ونقاطك محجوبة بالكامل في أي واجهة خارجية مستقبلاً
                      </p>
                    </div>
                    <div
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                        privacySettings.hideAchievements ? 'bg-[#D9AE48]' : 'bg-[#2A2210]'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-[#080807] transition-transform ${
                          privacySettings.hideAchievements ? 'translate-x-0' : '-translate-x-4'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Switch 4: Hide Join Date */}
                  <div
                    onClick={() => handleTogglePrivacyField('hideJoinDate')}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors select-none"
                  >
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-[#F7F2E7] flex items-center gap-1.5">
                        {privacySettings.hideJoinDate ? <EyeOff size={13} className="text-[#D9AE48]" /> : <Eye size={13} className="text-[#A69E8D]" />}
                        إخفاء تاريخ الانضمام
                      </span>
                      <p className="text-[10px] text-[#A69E8D]">
                        عدم إظهار تاريخ تسجيل حسابك تحت الاسم
                      </p>
                    </div>
                    <div
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                        privacySettings.hideJoinDate ? 'bg-[#D9AE48]' : 'bg-[#2A2210]'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-[#080807] transition-transform ${
                          privacySettings.hideJoinDate ? 'translate-x-0' : '-translate-x-4'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 bg-[#14120B] rounded-xl border border-[#D9AE48]/15 text-[11px] text-[#A69E8D]">
                  <Lock size={13} className="text-[#D9AE48] shrink-0" />
                  <span>تُحفظ تفضيلات الخصوصية محلياً وسحابياً وتطبق فورياً عند حفظ التعديلات.</span>
                </div>
              </div>
            )}

            {/* TAB 3: ACCOUNT & SECURITY */}
            {activeTab === 'account' && (
              <div className="space-y-3.5 animate-fadeIn">
                {/* Account Details Card */}
                <div className="bg-[#14120B] border border-[#2A2210] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#2A2210]">
                    <span className="text-xs font-bold text-[#F7F2E7] flex items-center gap-1.5">
                      <KeyRound size={13} className="text-[#D9AE48]" />
                      نوع الحساب
                    </span>
                    <span className="text-xs font-semibold text-[#FFE6A0]">
                      {currentUser ? (currentUser.providerData[0]?.providerId === 'google.com' ? 'حساب Google متزامن' : 'حساب بريد إلكتروني') : 'وضع الزائر (حفظ محلي)'}
                    </span>
                  </div>

                  {maskedEmail && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#A69E8D]">البريد الإلكتروني المشفر:</span>
                      <span className="text-[#F7F2E7] font-mono" dir="ltr">
                        {maskedEmail}
                      </span>
                    </div>
                  )}

                  {formattedCreationDate && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#A69E8D]">تاريخ إنشاء الحساب:</span>
                      <span className="text-[#F7F2E7]">{formattedCreationDate}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[#A69E8D]">حالة التشفير والحماية:</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      تشفير كامل TLS & AES-256
                    </span>
                  </div>
                </div>

                {/* Privacy & Zero-Tracking Assurance */}
                <div className="bg-[#14120B] border border-[#D9AE48]/20 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-[#D9AE48]" />
                    <span className="text-xs font-bold text-[#F7F2E7]">ضمانة أثر للأمان والخصوصية</span>
                  </div>
                  <ul className="text-[11px] text-[#B5AD9B] space-y-1 list-disc list-inside leading-relaxed">
                    <li>لا نقوم ببيع أو مشاركة بياناتك مع أي طرف ثالث إطلاقاً.</li>
                    <li>صفر تحليلات تجارية أو تتبع إعلاني (Zero-Tracking Policy).</li>
                    <li>البيانات التعبدية معزولة تماماً برقم معرّف UID فريد غير قابل للاختراق.</li>
                  </ul>
                </div>

                {/* Safe Logout Button */}
                {currentUser && (
                  <div className="pt-2">
                    {!showLogoutConfirm ? (
                      <button
                        type="button"
                        onClick={() => setShowLogoutConfirm(true)}
                        className="w-full py-2.5 px-4 rounded-xl border border-red-500/30 bg-red-950/20 hover:bg-red-950/40 text-red-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
                      >
                        <LogOut size={14} />
                        <span>تسجيل الخروج من الحساب</span>
                      </button>
                    ) : (
                      <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl space-y-2.5 animate-fadeIn">
                        <p className="text-xs text-red-200 text-center font-medium leading-relaxed">
                          هل أنت متأكد من رغبتك في تسجيل الخروج؟
                          <br />
                          <span className="text-[10.5px] text-red-300/80">
                            بياناتك وإنجازاتك ستبقى محفوظة بأمان في حسابك وستتم مزامنتها عند عودتك.
                          </span>
                        </p>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowLogoutConfirm(false)}
                            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white transition-colors"
                          >
                            إلغاء
                          </button>
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-md transition-colors"
                          >
                            نعم، تسجيل الخروج
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Footer Action Buttons */}
            <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#2A2210]">
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
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#D9AE48] to-[#FFE6A0] text-[#080807] text-xs font-bold shadow hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
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

      {/* Interactive Circular Photo Cropper Modal */}
      <CircularPhotoCropModal
        isOpen={isCropModalOpen}
        imageFile={rawSelectedFile}
        onClose={() => setIsCropModalOpen(false)}
        onApplyCrop={handleApplyCrop}
      />
    </>
  );
};
