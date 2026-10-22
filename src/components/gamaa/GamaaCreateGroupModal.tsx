import React, { useState } from 'react';
import { X, Users, Lock, Globe, Sparkles, BookOpen, Heart, Flame, Shield } from 'lucide-react';
import { GamaaGroupsService } from '../../services/gamaaGroupsService';
import { GroupCategory } from '../../types';

interface GamaaCreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated?: (groupId: string) => void;
  userProfile?: { displayName?: string; photoURL?: string; level?: number };
}

const CATEGORIES: { id: GroupCategory; label: string; icon: any; desc: string }[] = [
  { id: 'quran', label: 'القرآن وتدبره', icon: BookOpen, desc: 'مدارسة، ختمات جماعية، وتدبر الآيات' },
  { id: 'dhikr', label: 'مجالس الذكر', icon: Flame, desc: 'التواصي على أذكار الصباح والمساء والاستغفار' },
  { id: 'knowledge', label: 'مدارسة العلم', icon: Sparkles, desc: 'أحاديث نبوية، سيرة، وفقه ميسر' },
  { id: 'charity', label: 'الإحسان والبر', icon: Heart, desc: 'أعمال البر، صلة الرحم، وسقيا الماء' },
  { id: 'general', label: 'أخوة إيمانية', icon: Users, desc: 'تواصل إيماني وتواصي بالحق والصبر' },
];

export const GamaaCreateGroupModal: React.FC<GamaaCreateGroupModalProps> = ({
  isOpen,
  onClose,
  onGroupCreated,
  userProfile,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GroupCategory>('quran');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedDesc = description.trim();

    if (trimmedName.length < 3 || trimmedName.length > 60) {
      setErrorMsg('اسم الحلقة يجب أن يكون بين 3 و 60 حرفاً');
      return;
    }

    if (trimmedDesc.length < 5 || trimmedDesc.length > 300) {
      setErrorMsg('وصف الحلقة يجب أن يكون بين 5 و 300 حرف');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const newGroupId = await GamaaGroupsService.createGroup({
        name: trimmedName,
        description: trimmedDesc,
        category,
        isPrivate,
        creatorProfile: userProfile,
      });

      setName('');
      setDescription('');
      setIsPrivate(false);
      onClose();
      if (onGroupCreated) onGroupCreated(newGroupId);
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء إنشاء الحلقة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="w-full max-w-md bg-[#120F0A] border border-[#C8A24A]/40 rounded-3xl p-5 space-y-4 text-white shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C8A24A]/20">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#C8A24A]/15 text-[#E6C66E]">
              <Users size={18} />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-[#FFE294]">إنشاء حلقة ذكر أو مجموعة</h3>
              <p className="text-[10px] text-[#A69E89]">اجتمع مع إخوانك في الله على طاعة ومدارسة</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#9E9478] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Group Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#C4B998] block">
              اسم الحلقة أو المجموعة <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: حلقة أهل القرآن والتدبر"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0906] border border-[#C8A24A]/30 text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-[#E6C66E]"
            />
          </div>

          {/* Group Description */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-[#C4B998]">
                وصف الحلقة وغايتها <span className="text-amber-400">*</span>
              </label>
              <span className="text-[10px] text-gray-500">{description.length}/300</span>
            </div>
            <textarea
              required
              minLength={5}
              maxLength={300}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب نبذة موجزة عن برنامج الحلقة ومقصدها..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0906] border border-[#C8A24A]/30 text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-[#E6C66E] resize-none"
            />
          </div>

          {/* Category Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#C4B998] block">تصنيف الحلقة</label>
            <div className="grid grid-cols-1 gap-1.5">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`min-h-[44px] p-2.5 rounded-xl border text-right flex items-center gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#221C11] border-[#E6C66E] text-white shadow-sm'
                        : 'bg-[#0B0906] border-[#C8A24A]/20 text-[#A69E89] hover:border-[#C8A24A]/40'
                    }`}
                  >
                    <span
                      className={`p-1.5 rounded-lg ${
                        isSelected ? 'bg-[#E6C66E] text-black' : 'bg-white/5 text-[#C8A24A]'
                      }`}
                    >
                      <Icon size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-[#F3E5AB]">{cat.label}</div>
                      <div className="text-[10px] text-[#8E8672] truncate">{cat.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Privacy Toggle */}
          <div className="p-3 rounded-2xl bg-[#0B0906] border border-[#C8A24A]/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isPrivate ? (
                  <Lock size={16} className="text-amber-400" />
                ) : (
                  <Globe size={16} className="text-[#C8A24A]" />
                )}
                <div>
                  <div className="text-xs font-bold text-[#F3E5AB]">
                    {isPrivate ? 'حلقة خاصة (مغلقة)' : 'حلقة عامة'}
                  </div>
                  <div className="text-[10px] text-[#8E8672]">
                    {isPrivate
                      ? 'لا يمكن الدخول أو رؤية المشاركات إلا بعد موافقة المشرف'
                      : 'متاحة لجميع أعضاء مجتمع أثر للانضمام المباشر'}
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                id="isPrivateToggle"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 rounded accent-[#D4AF37] cursor-pointer"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#C8A24A]/20">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1C1810] border border-[#C8A24A]/30 text-xs font-bold text-[#C4B998] hover:text-white"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] px-6 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#AA820A] text-black text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-amber-950/40 hover:brightness-110 active:scale-95 transition-all"
            >
              {loading ? 'جاري الإنشاء...' : 'تأسيس الحلقة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
