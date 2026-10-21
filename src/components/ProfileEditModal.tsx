import React, { useState, useRef } from 'react';
import { UserProfileData, AuthService } from '../services/authService';
import { X, Camera, Check, ShieldCheck, Sparkles, User as UserIcon, AtSign, Heart, Upload, AlertCircle } from 'lucide-react';
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
    return 'avatar_crescent';
  });
  const [isPublicProfile, setIsPublicProfile] = useState(currentProfile?.isPublicProfile ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    setPhotoURL(`preset:${presetId}`);
    try {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    } catch {}
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 2 ميجابايت.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setPhotoURL(base64);
        setSelectedPresetId('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = displayName.trim();
    const cleanUsername = username.trim().replace(/^@+/, '').replace(/[^a-zA-Z0-9_.]/g, '');

    if (cleanName.length < 2) {
      setErrorMsg('يرجى كتابة اسم صحيح لا يقل عن حرفين.');
      return;
    }

    setIsSaving(true);
    try {
      const uid = currentProfile?.uid || AuthService.getCurrentUser()?.uid || 'guest_user';
      const updatedData: UserProfileData = {
        uid,
        displayName: cleanName,
        username: cleanUsername || 'athar_user',
        email: currentProfile?.email || AuthService.getCurrentUser()?.email || `${uid}@athar.app`,
        photoURL: photoURL || `preset:${selectedPresetId || 'avatar_crescent'}`,
        bio: bio.trim(),
        isPublicProfile,
        createdAt: currentProfile?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        level: currentProfile?.level,
        xp: currentProfile?.xp,
        streakDays: currentProfile?.streakDays,
      };

      // Save locally to localStorage so it works seamlessly offline and in guest mode
      try {
        localStorage.setItem('athar_cached_profile', JSON.stringify(updatedData));
      } catch {}

      // Update Firestore if user is logged in
      const currentUser = AuthService.getCurrentUser();
      if (currentUser && currentUser.uid === uid) {
        await AuthService.updateUserProfile(uid, updatedData);
      }

      onProfileUpdated(updatedData);

      try {
        await Haptics.notification({ type: NotificationType.Success });
      } catch {}

      onClose();
    } catch (err: any) {
      console.warn('Profile save warning:', err);
      // Even if Firestore has network lag, update local state
      const fallbackData: UserProfileData = {
        uid: currentProfile?.uid || 'user',
        displayName: cleanName,
        username: cleanUsername,
        email: currentProfile?.email || 'user@athar.app',
        photoURL: photoURL || `preset:${selectedPresetId}`,
        bio: bio.trim(),
        isPublicProfile,
        createdAt: currentProfile?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onProfileUpdated(fallbackData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const activePreset = ROYAL_AVATAR_PRESETS.find((p) => p.id === selectedPresetId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      dir="rtl"
    >
      <div className="relative w-full max-w-md bg-[#0D0B08] border border-[#D9AE48]/35 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.85)] max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2210] bg-[#14120B]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#D9AE48]/20 flex items-center justify-center border border-[#D9AE48]/40">
              <Sparkles size={16} className="text-[#FFE6A0]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F7F2E7]">تعديل الملف الشخصي</h2>
              <p className="text-[11px] text-[#B5AD9B]">خصص هويتك في أثر ونيتك الإيمانية</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#B5AD9B] hover:text-white hover:bg-white/10 transition-colors"
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-300">
              <AlertCircle size={16} className="shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Avatar Preview & Selection */}
          <div className="flex flex-col items-center">
            <div className="relative mb-3">
              <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-[#D9AE48] via-[#FFE6A0] to-[#916E25] shadow-[0_0_20px_rgba(217,174,72,0.3)]">
                <div className="w-full h-full rounded-full overflow-hidden bg-[#14120B] flex items-center justify-center">
                  {photoURL && !photoURL.startsWith('preset:') ? (
                    <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${
                        activePreset?.bg || 'from-[#2A200B] to-[#14120B]'
                      } flex items-center justify-center text-4xl select-none`}
                    >
                      {activePreset?.emoji || '🌙'}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 left-0 w-8 h-8 rounded-full bg-[#D9AE48] text-[#080807] flex items-center justify-center shadow-lg border-2 border-[#080807] active:scale-95 transition-transform"
                title="تغيير الصورة"
                aria-label="رفع صورة شخصية"
              >
                <Camera size={15} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />
            </div>
            <span className="text-xs text-[#B5AD9B]">اختر مظهراً ملكياً أو ارفع صورتك الخاصة</span>

            {/* Presets Grid */}
            <div className="grid grid-cols-6 gap-2 mt-3 w-full">
              {ROYAL_AVATAR_PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id && photoURL.startsWith('preset:');
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`flex flex-col items-center p-1.5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-[#FFE6A0] bg-[#D9AE48]/20 shadow-[0_0_12px_rgba(217,174,72,0.35)] scale-105'
                        : 'border-[#2A2210] bg-[#14120B]/80 hover:border-[#D9AE48]/40'
                    }`}
                  >
                    <span className="text-xl">{preset.emoji}</span>
                    <span className="text-[9px] text-[#B5AD9B] mt-1 truncate max-w-full">
                      {preset.label.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#F7F2E7] mb-1.5 flex items-center gap-1.5">
                <UserIcon size={13} className="text-[#D9AE48]" />
                الاسم الظاهر
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="أحمد محمد"
                maxLength={60}
                required
                className="w-full bg-[#14120B] border border-[#2A2210] rounded-xl px-3.5 py-2.5 text-sm text-[#F7F2E7] placeholder-[#555] focus:outline-none focus:border-[#D9AE48] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F7F2E7] mb-1.5 flex items-center gap-1.5">
                <AtSign size={13} className="text-[#D9AE48]" />
                معرّف الحساب (Username)
              </label>
              <div className="relative">
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-[#D9AE48] font-bold">
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, ''))}
                  placeholder="ahmed"
                  maxLength={30}
                  className="w-full bg-[#14120B] border border-[#2A2210] rounded-xl pr-8 pl-3.5 py-2.5 text-sm text-[#F7F2E7] placeholder-[#555] focus:outline-none focus:border-[#D9AE48] transition-colors font-mono"
                  dir="ltr"
                />
              </div>
              <p className="text-[10px] text-[#888] mt-1">يظهر في بطاقة الملف الشخصي وعلى بطاقات مشاركة الطاعات</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F7F2E7] mb-1.5 flex items-center gap-1.5">
                <Heart size={13} className="text-[#D9AE48]" />
                النية أو الهدف الإيماني
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="اكتب هدفك أو دعاءً تحبه..."
                rows={2}
                maxLength={200}
                className="w-full bg-[#14120B] border border-[#2A2210] rounded-xl p-3 text-sm text-[#F7F2E7] placeholder-[#555] focus:outline-none focus:border-[#D9AE48] transition-colors resize-none"
              />
            </div>

            {/* Privacy Controls */}
            <div className="p-3.5 bg-[#14120B] border border-[#2A2210] rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#F7F2E7] block">مشاركة إحصائيات الطاعات</span>
                  <span className="text-[10px] text-[#B5AD9B] block">تضمين عدد الصلوات والختمة في بطاقات الأثر</span>
                </div>
                <input
                  type="checkbox"
                  checked={isPublicProfile}
                  onChange={(e) => setIsPublicProfile(e.target.checked)}
                  className="w-5 h-5 accent-[#D9AE48] rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-[#D9AE48] via-[#FFE6A0] to-[#D9AE48] text-[#080807] shadow-[0_4px_20px_rgba(217,174,72,0.35)] hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <span>جارٍ الحفظ...</span>
              ) : (
                <>
                  <Check size={16} />
                  <span>حفظ التغييرات</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
